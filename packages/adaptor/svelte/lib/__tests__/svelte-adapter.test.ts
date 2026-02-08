import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { RBAC } from '@fire-shield/core';
import { createRBACStore } from '../index';

describe('Svelte RBAC Adapter', () => {
  let rbac: RBAC;
  const user = { id: 'user-1', roles: ['editor'] };

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);
  });

  describe('createRBACStore', () => {
    it('should create store with initial user', () => {
      const store = createRBACStore(rbac, user);

      expect(store.rbac).toBe(rbac);
      expect(get(store.user)).toEqual(user);
    });

    it('should create store with null user', () => {
      const store = createRBACStore(rbac, null);

      expect(get(store.user)).toBeNull();
    });
  });

  describe('can()', () => {
    it('should return true when user has permission', () => {
      const store = createRBACStore(rbac, user);
      const canWrite = store.can('post:write');

      expect(get(canWrite)).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      const store = createRBACStore(rbac, user);
      const canDelete = store.can('user:delete');

      expect(get(canDelete)).toBe(false);
    });

    it('should return false when user is null', () => {
      const store = createRBACStore(rbac, null);
      const canWrite = store.can('post:write');

      expect(get(canWrite)).toBe(false);
    });

    it('should update when user changes', () => {
      const store = createRBACStore(rbac, null);
      const canWrite = store.can('post:write');

      expect(get(canWrite)).toBe(false);

      store.user.set(user);
      expect(get(canWrite)).toBe(true);

      store.user.set(null);
      expect(get(canWrite)).toBe(false);
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has role', () => {
      const store = createRBACStore(rbac, user);
      const isEditor = store.hasRole('editor');

      expect(get(isEditor)).toBe(true);
    });

    it('should return false when user lacks role', () => {
      const store = createRBACStore(rbac, user);
      const isAdmin = store.hasRole('admin');

      expect(get(isAdmin)).toBe(false);
    });

    it('should return false when user is null', () => {
      const store = createRBACStore(rbac, null);
      const isEditor = store.hasRole('editor');

      expect(get(isEditor)).toBe(false);
    });

    it('should update when user changes', () => {
      const store = createRBACStore(rbac, null);
      const isEditor = store.hasRole('editor');

      expect(get(isEditor)).toBe(false);

      store.user.set(user);
      expect(get(isEditor)).toBe(true);

      store.user.set({ id: 'admin-1', roles: ['admin'] });
      expect(get(isEditor)).toBe(false);
    });
  });

  describe('authorize()', () => {
    it('should return authorization result with allowed true', () => {
      const store = createRBACStore(rbac, user);
      const result = store.authorize('post:write');

      expect(get(result).allowed).toBe(true);
    });

    it('should return authorization result with allowed false', () => {
      const store = createRBACStore(rbac, user);
      const result = store.authorize('user:delete');

      expect(get(result).allowed).toBe(false);
      expect(get(result).reason).toBeDefined();
    });

    it('should return not allowed when user is null', () => {
      const store = createRBACStore(rbac, null);
      const result = store.authorize('post:write');

      expect(get(result).allowed).toBe(false);
      expect(get(result).reason).toBe('No user found');
    });
  });

  describe('canAll()', () => {
    it('should return true when user has all permissions', () => {
      const store = createRBACStore(rbac, user);
      const hasAll = store.canAll(['post:read', 'post:write']);

      expect(get(hasAll)).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      const store = createRBACStore(rbac, user);
      const hasAll = store.canAll(['post:read', 'post:delete']);

      expect(get(hasAll)).toBe(false);
    });

    it('should return false when user is null', () => {
      const store = createRBACStore(rbac, null);
      const hasAll = store.canAll(['post:read', 'post:write']);

      expect(get(hasAll)).toBe(false);
    });
  });

  describe('canAny()', () => {
    it('should return true when user has any permission', () => {
      const store = createRBACStore(rbac, user);
      const hasAny = store.canAny(['post:read', 'post:delete']);

      expect(get(hasAny)).toBe(true);
    });

    it('should return false when user has no permissions', () => {
      const store = createRBACStore(rbac, user);
      const hasAny = store.canAny(['user:read', 'user:delete']);

      expect(get(hasAny)).toBe(false);
    });

    it('should return false when user is null', () => {
      const store = createRBACStore(rbac, null);
      const hasAny = store.canAny(['post:read', 'post:write']);

      expect(get(hasAny)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles', () => {
      const store = createRBACStore(rbac, { id: 'user-2', roles: [] });
      const canWrite = store.can('post:write');

      expect(get(canWrite)).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const adminUser = { id: 'admin-1', roles: ['admin'] };
      const store = createRBACStore(rbac, adminUser);
      const canDelete = store.can('user:delete');

      expect(get(canDelete)).toBe(true);
    });

    it('should handle multiple role changes', () => {
      const store = createRBACStore(rbac, user);
      const canDeleteUser = store.can('user:delete');

      expect(get(canDeleteUser)).toBe(false);

      store.user.set({ id: 'admin-1', roles: ['admin'] });
      expect(get(canDeleteUser)).toBe(true);

      store.user.set({ id: 'viewer-1', roles: ['viewer'] });
      expect(get(canDeleteUser)).toBe(false);
    });
  });
});
