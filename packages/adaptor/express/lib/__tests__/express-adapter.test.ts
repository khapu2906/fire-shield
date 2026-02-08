import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { RBAC } from '@fire-shield/core';
import { ExpressRBACAdapter } from '../index';

describe('ExpressRBACAdapter', () => {
  let rbac: RBAC;
  let adapter: ExpressRBACAdapter;
  let req: Partial<Request>;
  let res: Partial<Response>;
    let next: Mock<any, any>;

  beforeEach(() => {
    rbac = new RBAC();
    // Register permissions first
    rbac.registerPermission('user:read');
    rbac.registerPermission('user:create');
    rbac.registerPermission('user:update');
    rbac.registerPermission('user:delete');
    rbac.registerPermission('post:read');
    rbac.registerPermission('post:write');
    rbac.registerPermission('post:delete');
    // Register synthetic role permissions for testing requireRole
    rbac.registerPermission('role:admin');
    rbac.registerPermission('role:editor');
    rbac.registerPermission('role:viewer');

    // Then create roles with registered permissions
    rbac.createRole('admin', ['user:*', 'post:*', 'role:admin']);
    rbac.createRole('editor', ['post:read', 'post:write', 'role:editor']);
    rbac.createRole('viewer', ['post:read', 'role:viewer']);

    adapter = new ExpressRBACAdapter(rbac);

    req = {
      user: { id: 'user-1', roles: ['editor'] },
      path: '/test-path', // Default path for resource extraction
      method: 'GET',     // Default method for action extraction
      headers: {},       // Ensure headers object exists
      route: {},         // Ensure route object exists for path extraction
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    next = vi.fn<any, any>();
  });

  describe('permission()', () => {
    it('should allow access when user has permission', async () => {
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks permission', async () => {
      const middleware = adapter.permission('user:delete');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user is present', async () => {
      req.user = undefined;
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with wildcard permissions', async () => {
      req.user = { id: 'admin-1', roles: ['admin'] };
      const middleware = adapter.permission('user:create');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('role()', () => {
    it('should allow access when user has role', async () => {
      const middleware = adapter.role('editor');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks role', async () => {
      const middleware = adapter.role('admin');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user is present', async () => {
      req.user = undefined;
      const middleware = adapter.role('editor');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('resourceAction()', () => {
    it('should allow access for resource:action permission', async () => {
      const middleware = adapter.resourceAction('post', 'read');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when lacking resource:action permission', async () => {
      const middleware = adapter.resourceAction('user', 'delete');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('all()', () => {
    it('should allow access when user has all permissions', async () => {
      const middleware = adapter.all('post:read', 'post:write');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks any permission', async () => {
      const middleware = adapter.all('post:read', 'user:read');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('any()', () => {
    it('should allow access when user has any permission', async () => {
      const middleware = adapter.any('post:read', 'user:read');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when user has none of the permissions', async () => {
      const middleware = adapter.any('user:read', 'user:write');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Custom Options', () => {
    it('should use custom getUser function', async () => {
      const customAdapter = new ExpressRBACAdapter(rbac, {
        getUser: (req: Request) => req.body?.user || req.user
      });

      req.user = undefined;
      req.body = { user: { id: 'user-2', roles: ['viewer'] } };

      const middleware = customAdapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should use custom onUnauthorized handler', async () => {
      const customHandler = vi.fn();
      const customAdapter = new ExpressRBACAdapter(rbac, {
        onUnauthorized: customHandler
      });

      const middleware = customAdapter.permission('user:delete');
      await middleware(req as Request, res as Response, next);

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
        req,
        res,
        next
      );
    });

    it('should use custom onError handler', async () => {
      const customError = vi.fn();
      const customAdapter = new ExpressRBACAdapter(rbac, {
        getUser: () => {
          throw new Error('User fetch failed');
        },
        onError: customError
      });

      const middleware = customAdapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(customError).toHaveBeenCalledWith(
        expect.any(Error),
        req,
        res,
        next
      );
    });
  });

  describe('Authorization Result', () => {
    it('should attach authorization result to request', async () => {
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect((req as any).authorization).toBeDefined();
      expect((req as any).authorization.allowed).toBe(true);
    });

    it('should include denial reason in result', async () => {
      req.user = { id: 'user-1', roles: [] };
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with empty roles array', async () => {
      req.user = { id: 'user-1', roles: [] };
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle missing user object', async () => {
      req.user = undefined;
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle null user', async () => {
      req.user = null as any;
      const middleware = adapter.permission('post:read');
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Multiple Middleware Chaining', () => {
    it('should work with multiple permission checks', async () => {
      const middleware1 = adapter.permission('post:read');
      const middleware2 = adapter.permission('post:write');

      await middleware1(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      await middleware2(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should stop chain on first failed check', async () => {
      const middleware1 = adapter.permission('post:read');
      const middleware2 = adapter.permission('user:delete');

      await middleware1(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      next.mockClear();
      await middleware2(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
