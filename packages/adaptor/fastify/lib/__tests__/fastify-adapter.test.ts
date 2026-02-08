/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { RBAC } from '@fire-shield/core';
import { FastifyRBACAdapter, createRBACHook, requirePermission, requireRole } from '../index';

describe('FastifyRBACAdapter', () => {
  let rbac: RBAC;
  let adapter: FastifyRBACAdapter;
  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  let done: HookHandlerDoneFunction;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    adapter = new FastifyRBACAdapter(rbac);

    request = {
      user: { id: 'user-1', roles: ['editor'] },
      headers: {},
      method: 'GET',
      url: '/posts',
      routeOptions: { url: '/posts' }
    } as Partial<FastifyRequest>;

    reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as Partial<FastifyReply>;

    done = vi.fn() as unknown as HookHandlerDoneFunction;
  });

  describe('permission()', () => {
    it('should create a hook that allows access when user has permission', async () => {
      const hook = adapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should create a hook that denies access when user lacks permission', async () => {
      const hook = adapter.permission('user:delete');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden'
        })
      );
      expect(done).not.toHaveBeenCalled();
    });

    it('should deny access when no user is present', async () => {
      request.user = undefined;
      const hook = adapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(done).not.toHaveBeenCalled();
    });

    it('should work with wildcard permissions', async () => {
      request.user = { id: 'admin-1', roles: ['admin'] };
      const hook = adapter.permission('user:create');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });
  });

  describe('role()', () => {
    it('should create a hook that allows access when user has role', async () => {
      const hook = adapter.role('editor');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });

    it('should deny access when user lacks role', async () => {
      const hook = adapter.role('admin');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(done).not.toHaveBeenCalled();
    });
  });

  describe('resourceAction()', () => {
    it('should allow access for resource:action permission', async () => {
      const hook = adapter.resourceAction('post', 'read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });

    it('should deny access when lacking resource:action permission', async () => {
      const hook = adapter.resourceAction('user', 'delete');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(done).not.toHaveBeenCalled();
    });
  });

  describe('all()', () => {
    it('should allow access when user has all permissions', async () => {
      const hook = adapter.all('post:read', 'post:write');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });

    it('should deny access when user lacks any permission', async () => {
      const hook = adapter.all('post:read', 'user:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(done).not.toHaveBeenCalled();
    });
  });

  describe('any()', () => {
    it('should allow access when user has any permission', async () => {
      const hook = adapter.any('post:read', 'user:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });

    it('should deny access when user has none of the permissions', async () => {
      const hook = adapter.any('user:read', 'user:write');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(done).not.toHaveBeenCalled();
    });
  });

  describe('Custom Options', () => {
    it('should use custom getUser function', async () => {
      const customAdapter = new FastifyRBACAdapter(rbac, {
        getUser: (req) => (req as FastifyRequest & { customUser?: any }).customUser || req.user
      });

      request.user = undefined;
      (request as FastifyRequest & { customUser?: any }).customUser = { id: 'user-2', roles: ['viewer'] };

      const hook = customAdapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });

    it('should use custom onUnauthorized handler', async () => {
      const customHandler = vi.fn((_result, _req, reply) => {
        reply.code(403).send({ custom: 'error' });
      });

      const customAdapter = new FastifyRBACAdapter(rbac, {
        onUnauthorized: customHandler
      });

      const hook = customAdapter.permission('user:delete');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(customHandler).toHaveBeenCalled();
    });

    it('should use custom onError handler', async () => {
      const customError = vi.fn((_error, _req, reply) => {
        reply.code(500).send({ error: 'custom error' });
      });

      const customAdapter = new FastifyRBACAdapter(rbac, {
        getUser: () => {
          throw new Error('User fetch failed');
        },
        onError: customError
      });

      const hook = customAdapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(customError).toHaveBeenCalled();
    });
  });

  describe('createRBACHook', () => {
    it('should create a working hook', async () => {
      const hook = createRBACHook({
        rbac,
        getPermission: () => 'post:read'
      });

      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should create a permission-checking hook', async () => {
      const hook = requirePermission('post:write', { rbac });

      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should create a role-checking hook', async () => {
      const hook = requireRole('editor', { rbac });

      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(done).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with empty roles array', async () => {
      request.user = { id: 'user-1', roles: [] };
      const hook = adapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect(reply.code).toHaveBeenCalledWith(403);
    });

    it('should attach authorization result to request', async () => {
      const hook = adapter.permission('post:read');
      await hook.call(undefined as any, request as FastifyRequest, reply as FastifyReply, done);

      expect((request as FastifyRequest & { authorization?: any }).authorization).toBeDefined();
      expect((request as FastifyRequest & { authorization?: any }).authorization.allowed).toBe(true);
    });
  });
});
