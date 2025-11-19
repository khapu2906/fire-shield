import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '../index';

// Mock Hono Context
const createMockContext = () => {
  const store = new Map();
  return {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => store.set(key, value)),
    json: vi.fn((data: unknown, status?: number) => ({
      data,
      status: status || 200
    })),
    text: vi.fn((text: string, status?: number) => ({
      text,
      status: status || 200
    })),
    req: {
      header: vi.fn()
    }
  };
};

describe('HonoRBACAdapter', () => {
  let rbac: RBAC;
  let adapter: HonoRBACAdapter;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    adapter = new HonoRBACAdapter(rbac);
  });

  describe('permission()', () => {
    it('should allow access when user has permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.permission('post:read');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.permission('user:delete');

      const result = await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect((result as any).status).toBe(403);
    });

    it('should deny access when no user is present', async () => {
      const c = createMockContext();
      c.set('user', null);

      const next = vi.fn();
      const middleware = adapter.permission('post:read');

      const result = await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
      expect((result as any).status).toBe(403);
    });

    it('should work with wildcard permissions', async () => {
      const c = createMockContext();
      c.set('user', { id: 'admin-1', roles: ['admin'] });

      const next = vi.fn();
      const middleware = adapter.permission('user:create');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('role()', () => {
    it('should allow access when user has role', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.role('editor');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user lacks role', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.role('admin');

      const result = await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
      expect((result as any).status).toBe(403);
    });
  });

  describe('resourceAction()', () => {
    it('should allow access for resource:action permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.resourceAction('post', 'read');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when lacking resource:action permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.resourceAction('user', 'delete');

      const result = await middleware(c as any, next);

      expect((result as any).status).toBe(403);
    });
  });

  describe('all()', () => {
    it('should allow access when user has all permissions', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.all('post:read', 'post:write');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user lacks any permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.all('post:read', 'user:read');

      const result = await middleware(c as any, next);

      expect((result as any).status).toBe(403);
    });
  });

  describe('any()', () => {
    it('should allow access when user has any permission', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.any('post:read', 'user:read');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user has none of the permissions', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.any('user:read', 'user:write');

      const result = await middleware(c as any, next);

      expect((result as any).status).toBe(403);
    });
  });

  describe('Custom Options', () => {
    it('should use custom getUser function', async () => {
      const customAdapter = new HonoRBACAdapter(rbac, {
        getUser: (c) => c.req.header('user') ? JSON.parse(c.req.header('user')!) : null
      });

      const c = createMockContext();
      c.req.header.mockReturnValue(JSON.stringify({ id: 'user-2', roles: ['viewer'] }));

      const next = vi.fn();
      const middleware = customAdapter.permission('post:read');

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use custom onUnauthorized handler', async () => {
      const customHandler = vi.fn().mockReturnValue({ custom: 'error' });
      const customAdapter = new HonoRBACAdapter(rbac, {
        onUnauthorized: customHandler
      });

      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = customAdapter.permission('user:delete');

      await middleware(c as any, next);

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
        c
      );
    });
  });

  describe('Edge Runtime Compatibility', () => {
    it('should work with serializable responses', async () => {
      const c = createMockContext();
      c.set('user', { id: 'user-1', roles: ['editor'] });

      const next = vi.fn();
      const middleware = adapter.permission('user:delete');

      const result = await middleware(c as any, next);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect((result as any).status).toBe(403);
    });
  });
});
