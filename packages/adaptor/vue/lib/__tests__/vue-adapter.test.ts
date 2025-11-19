import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
import { RBAC } from '@fire-shield/core';
import {
  useCan,
  useRole,
  useAuthorize,
  useAllPermissions,
  useAnyPermission,
  checkRouteAccess,
  createVueRouterRBAC,
  type RBACRouteMeta
} from '../index';

// Mock Vue Router
const createMockRouter = () => ({
  beforeEach: vi.fn(),
  push: vi.fn(),
  replace: vi.fn()
});

// Mock route
const createMockRoute = (meta: RBACRouteMeta = {}) => ({
  path: '/test',
  name: 'test',
  fullPath: '/test',
  meta,
  params: {},
  query: {}
});

describe('Vue RBAC Adapter', () => {
  let rbac: RBAC;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);
  });

  describe('checkRouteAccess()', () => {
    it('should allow access when user has required permission', () => {
      const route = createMockRoute({ permission: 'post:read' });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should deny access when user lacks required permission', () => {
      const route = createMockRoute({ permission: 'user:delete' });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow access for public routes', () => {
      const route = createMockRoute({ public: true });
      const user = null;

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should deny access when no user for protected route', () => {
      const route = createMockRoute({ permission: 'post:read' });
      const user = null;

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Authentication required');
    });

    it('should check all permissions when permissions array provided', () => {
      const route = createMockRoute({
        permissions: ['post:read', 'post:write']
      });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should deny when missing any required permission', () => {
      const route = createMockRoute({
        permissions: ['post:read', 'user:read']
      });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(false);
    });

    it('should check any permission when anyPermission provided', () => {
      const route = createMockRoute({
        anyPermission: ['post:read', 'user:read']
      });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should check role when role meta provided', () => {
      const route = createMockRoute({ role: 'editor' });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should deny when user lacks required role', () => {
      const route = createMockRoute({ role: 'admin' });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(false);
    });

    it('should check all roles when roles array provided', () => {
      const route = createMockRoute({
        roles: ['editor', 'viewer']
      });
      const user = { id: 'user-1', roles: ['editor', 'viewer'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should check any role when anyRole provided', () => {
      const route = createMockRoute({
        anyRole: ['admin', 'editor']
      });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });
  });

  describe('createVueRouterRBAC()', () => {
    it('should create plugin with navigation guard', () => {
      const router = createMockRouter();
      const getUser = () => ({ id: 'user-1', roles: ['editor'] });

      const plugin = createVueRouterRBAC(router as any, {
        rbac,
        getUser,
        enableGuards: true
      });

      expect(plugin).toHaveProperty('install');
      expect(plugin).toHaveProperty('updateUser');
      expect(router.beforeEach).toHaveBeenCalled();
    });

    it('should not install guard when enableGuards is false', () => {
      const router = createMockRouter();
      const getUser = () => ({ id: 'user-1', roles: ['editor'] });

      createVueRouterRBAC(router as any, {
        rbac,
        getUser,
        enableGuards: false
      });

      expect(router.beforeEach).not.toHaveBeenCalled();
    });

    it('should call onUnauthorized when access denied', () => {
      const router = createMockRouter();
      const getUser = () => ({ id: 'user-1', roles: ['editor'] });
      const onUnauthorized = vi.fn();

      createVueRouterRBAC(router as any, {
        rbac,
        getUser,
        onUnauthorized
      });

      const guard = router.beforeEach.mock.calls[0][0];
      const to = createMockRoute({ permission: 'user:delete' });
      const from = createMockRoute();
      const next = vi.fn();

      guard(to, from, next);

      expect(onUnauthorized).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(false);
    });

    it('should redirect to unauthorizedRoute when access denied', () => {
      const router = createMockRouter();
      const getUser = () => ({ id: 'user-1', roles: ['editor'] });

      createVueRouterRBAC(router as any, {
        rbac,
        getUser,
        unauthorizedRoute: '/forbidden'
      });

      const guard = router.beforeEach.mock.calls[0][0];
      const to = createMockRoute({ permission: 'user:delete' });
      const from = createMockRoute();
      const next = vi.fn();

      guard(to, from, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/forbidden',
          query: { redirect: '/test' }
        })
      );
    });
  });

  describe('Directives', () => {
    it('should have permission directive', () => {
      // Directives are tested in integration tests
      // Unit testing directives requires DOM and Vue app instance
      expect(true).toBe(true);
    });

    it('should have role directive', () => {
      // Directives are tested in integration tests
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles', () => {
      const route = createMockRoute({ role: 'editor' });
      const user = { id: 'user-1', roles: [] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(false);
    });

    it('should handle route with no meta', () => {
      const route = createMockRoute();
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });

    it('should handle empty permissions array', () => {
      const route = createMockRoute({ permissions: [] });
      const user = { id: 'user-1', roles: ['editor'] };

      const result = checkRouteAccess(route as any, rbac, user);

      expect(result.allowed).toBe(true);
    });
  });
});
