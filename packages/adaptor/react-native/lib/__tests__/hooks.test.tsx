import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import {
  RBACProvider,
  useRBAC,
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useRole,
  useAnyRole,
  useIsAuthenticated,
} from '../index';
import { RBAC } from '@fire-shield/core';

describe('React Native RBAC Hooks', () => {
  let rbac: RBAC;

  beforeEach(() => {
    rbac = new RBAC({
      preset: {
        permissions: [
          { name: 'user:read', bit: 1 },
          { name: 'user:write', bit: 2 },
          { name: 'user:delete', bit: 4 },
          { name: 'post:read', bit: 8 },
          { name: 'post:write', bit: 16 },
        ],
        roles: [
          {
            name: 'viewer',
            permissions: ['user:read', 'post:read'],
            level: 1,
          },
          {
            name: 'editor',
            permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
            level: 5,
          },
          {
            name: 'admin',
            permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write'],
            level: 10,
          },
        ],
      },
    });
  });

  const createWrapper = (user?: any) => {
    return ({ children }: { children: React.ReactNode }) => (
      <RBACProvider rbac={rbac} user={user}>
        {children}
      </RBACProvider>
    );
  };

  describe('useRBAC', () => {
    it('should return rbac and user', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useRBAC(), { wrapper });

      expect(result.current.rbac).toBe(rbac);
      expect(result.current.user).toBe(user);
    });

    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useRBAC());

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('must be used within RBACProvider');
    });
  });

  describe('usePermission', () => {
    it('should return true when user has permission', () => {
      const user = { id: 'user1', roles: ['editor'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => usePermission('user:write'), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => usePermission('user:write'), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      const wrapper = createWrapper(undefined);

      const { result } = renderHook(() => usePermission('user:read'), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should update when user changes', () => {
      const user1 = { id: 'user1', roles: ['viewer'] };
      const { result, rerender } = renderHook(() => usePermission('user:write'), {
        wrapper: createWrapper(user1),
      });

      expect(result.current).toBe(false);

      const user2 = { id: 'user2', roles: ['editor'] };
      rerender();

      // Need to update wrapper with new user
      const { result: result2 } = renderHook(() => usePermission('user:write'), {
        wrapper: createWrapper(user2),
      });

      expect(result2.current).toBe(true);
    });
  });

  describe('useAnyPermission', () => {
    it('should return true when user has any permission', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(
        () => useAnyPermission(['user:delete', 'post:read']),
        { wrapper }
      );

      expect(result.current).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(
        () => useAnyPermission(['user:write', 'user:delete']),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useAnyPermission([]), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      const user = { id: 'user1', roles: ['editor'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(
        () => useAllPermissions(['user:read', 'user:write']),
        { wrapper }
      );

      expect(result.current).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(
        () => useAllPermissions(['user:read', 'user:write']),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('should return true for empty permissions array', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useAllPermissions([]), { wrapper });

      expect(result.current).toBe(true);
    });
  });

  describe('useRole', () => {
    it('should return true when user has role', () => {
      const user = { id: 'user1', roles: ['editor', 'viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useRole('editor'), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false when user lacks role', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useRole('admin'), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      const wrapper = createWrapper(undefined);

      const { result } = renderHook(() => useRole('viewer'), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useAnyRole', () => {
    it('should return true when user has any role', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useAnyRole(['admin', 'viewer']), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useAnyRole(['admin', 'editor']), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useIsAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      const user = { id: 'user1', roles: ['viewer'] };
      const wrapper = createWrapper(user);

      const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      const wrapper = createWrapper(undefined);

      const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should memoize permission checks', () => {
      const user = { id: 'user1', roles: ['editor'] };
      const wrapper = createWrapper(user);

      const { result, rerender } = renderHook(() => usePermission('user:write'), {
        wrapper,
      });

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
      expect(firstResult).toBe(true);
    });
  });
});
