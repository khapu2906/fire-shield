import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBAC } from '@fire-shield/core';
import { NextRBACAdapter } from '../index';

// Mock NextRequest
const createMockRequest = () => ({
  url: 'http://localhost:3000/api/test',
  method: 'GET',
  headers: new Map(),
  cookies: new Map(),
  user: { id: 'user-1', roles: ['editor'] }
});

// Mock NextResponse

describe('NextRBACAdapter', () => {
  let rbac: RBAC;
  let adapter: NextRBACAdapter;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    adapter = new NextRBACAdapter(rbac);
  });

  describe('middleware()', () => {
    it('should allow access when user has permission', async () => {
      const request = createMockRequest();
      const middleware = adapter.middleware('post:read');

      const result = await middleware(request as any);

      expect(result).toBeUndefined();
    });

    it('should deny access when user lacks permission', async () => {
      const request = createMockRequest();
      const middleware = adapter.middleware('user:delete');

      const result = await middleware(request as any);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('status', 403);
    });

    it('should deny access when no user is present', async () => {
      const request = createMockRequest();
      request.user = undefined as any;

      const middleware = adapter.middleware('post:read');

      const result = await middleware(request as any);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('status', 403);
    });
  });

  describe('withPermission()', () => {
    it('should allow handler execution when user has permission', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      const wrapped = adapter.withPermission('post:read', handler as any);

      const request = createMockRequest();
      const result = await wrapped(request as any);

      expect(handler).toHaveBeenCalledWith(request);
      expect(result).toEqual({ success: true });
    });

    it('should deny handler execution when user lacks permission', async () => {
      const handler = vi.fn();
      const wrapped = adapter.withPermission('user:delete', handler as any);

      const request = createMockRequest();
      const result = await wrapped(request as any);

      expect(handler).not.toHaveBeenCalled();
      expect(result).toHaveProperty('status', 403);
    });
  });

  describe('withRole()', () => {
    it('should allow handler execution when user has role', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      const wrapped = adapter.withRole('editor', handler as any);

      const request = createMockRequest();
      const result = await wrapped(request as any);

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should deny handler execution when user lacks role', async () => {
      const handler = vi.fn();
      const wrapped = adapter.withRole('admin', handler as any);

      const request = createMockRequest();
      const result = await wrapped(request as any);

      expect(handler).not.toHaveBeenCalled();
      expect(result).toHaveProperty('status', 403);
    });
  });

  describe('requirePermission()', () => {
    it('should not throw when user has permission', async () => {
      const user = { id: 'user-1', roles: ['editor'] };
      await expect(
        adapter.requirePermission(user, 'post:read')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks permission', async () => {
      const user = { id: 'user-1', roles: ['editor'] };
      await expect(
        adapter.requirePermission(user, 'user:delete')
      ).rejects.toThrow();
    });
  });

  describe('requireRole()', () => {
    it('should not throw when user has role', async () => {
      const user = { id: 'user-1', roles: ['editor'] };
      await expect(
        adapter.requireRole(user, 'editor')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks role', async () => {
      const user = { id: 'user-1', roles: ['editor'] };
      await expect(
        adapter.requireRole(user, 'admin')
      ).rejects.toThrow();
    });
  });

  describe('Custom Options', () => {
    it('should use custom getUser function', async () => {
      const customAdapter = new NextRBACAdapter(rbac, {
        getUser: async (_req) => ({ id: 'custom-user', roles: ['viewer'] })
      });

      const request = createMockRequest();
      request.user = undefined as any;

      const middleware = customAdapter.middleware('post:read');
      const result = await middleware(request as any);

      expect(result).toBeUndefined();
    });

    it('should use custom onUnauthorized handler', async () => {
      const customHandler = vi.fn().mockReturnValue({ custom: 'error' });
      const customAdapter = new NextRBACAdapter(rbac, {
        onUnauthorized: customHandler
      });

      const request = createMockRequest();
      const middleware = customAdapter.middleware('user:delete');

      await middleware(request as any);

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
        request
      );
    });
  });

  describe('App Router vs Pages Router', () => {
    it('should work with App Router middleware', async () => {
      const request = createMockRequest();
      const middleware = adapter.middleware('post:read');

      const result = await middleware(request as any);
      expect(result).toBeUndefined();
    });

    it('should work with Pages Router API routes', async () => {
      const handler = vi.fn().mockResolvedValue({ data: 'test' });
      const wrapped = adapter.withPermission('post:read', handler as any);

      const request = createMockRequest();
      const result = await wrapped(request as any);

      expect(result).toEqual({ data: 'test' });
    });
  });
});
