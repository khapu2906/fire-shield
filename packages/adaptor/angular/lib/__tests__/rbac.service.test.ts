import { describe, it, expect, beforeEach } from 'vitest';
import { RBAC } from '@fire-shield/core';
import { RBACService } from '../rbac.service';

describe('Angular RBAC Service', () => {
  let rbac: RBAC;
  let service: RBACService;
  const user = { id: 'user-1', roles: ['editor'] };

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    service = new RBACService();
    service.initialize(rbac, null);
  });

  describe('initialize()', () => {
    it('should initialize with RBAC instance', () => {
      expect(service.getRBAC()).toBe(rbac);
    });

    it('should initialize with initial user', () => {
      const newService = new RBACService();
      newService.initialize(rbac, user);

      expect(newService.getUser()).toEqual(user);
    });

    it('should throw error if getRBAC called before initialize', () => {
      const newService = new RBACService();
      expect(() => newService.getRBAC()).toThrow();
    });
  });

  describe('setUser() and getUser()', () => {
    it('should set and get user', () => {
      service.setUser(user);
      expect(service.getUser()).toEqual(user);
    });

    it('should set user to null', () => {
      service.setUser(user);
      service.setUser(null);
      expect(service.getUser()).toBeNull();
    });
  });

  describe('can()', () => {
    it('should return true when user has permission', () => {
      service.setUser(user);
      expect(service.can('post:write')).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      service.setUser(user);
      expect(service.can('user:delete')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(service.can('post:write')).toBe(false);
    });
  });

  describe('can$()', () => {
    it('should emit true when user has permission', async () => {
      service.setUser(user);
      const allowed = await new Promise<boolean>(resolve => {
        service.can$('post:write').subscribe(value => resolve(value));
      });
      expect(allowed).toBe(true);
    });

    it('should emit false when user lacks permission', async () => {
      service.setUser(user);
      const allowed = await new Promise<boolean>(resolve => {
        service.can$('user:delete').subscribe(value => resolve(value));
      });
      expect(allowed).toBe(false);
    });

    it('should update when user changes', async () => {
      const results: boolean[] = [];

      const promise = new Promise<void>(resolve => {
        service.can$('post:write').subscribe(allowed => {
          results.push(allowed);
          if (results.length === 3) {
            resolve();
          }
        });
      });

      service.setUser(user);
      service.setUser(null);

      await promise;
      expect(results).toEqual([false, true, false]);
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has role', () => {
      service.setUser(user);
      expect(service.hasRole('editor')).toBe(true);
    });

    it('should return false when user lacks role', () => {
      service.setUser(user);
      expect(service.hasRole('admin')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(service.hasRole('editor')).toBe(false);
    });
  });

  describe('hasRole$()', () => {
    it('should emit true when user has role', async () => {
      service.setUser(user);
      const hasRole = await new Promise<boolean>(resolve => {
        service.hasRole$('editor').subscribe(value => resolve(value));
      });
      expect(hasRole).toBe(true);
    });

    it('should emit false when user lacks role', async () => {
      service.setUser(user);
      const hasRole = await new Promise<boolean>(resolve => {
        service.hasRole$('admin').subscribe(value => resolve(value));
      });
      expect(hasRole).toBe(false);
    });
  });

  describe('authorize()', () => {
    it('should return authorization result with allowed true', () => {
      service.setUser(user);
      const result = service.authorize('post:write');

      expect(result.allowed).toBe(true);
    });

    it('should return authorization result with allowed false', () => {
      service.setUser(user);
      const result = service.authorize('user:delete');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return not allowed when user is null', () => {
      const result = service.authorize('post:write');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No user found');
    });
  });

  describe('canAll()', () => {
    it('should return true when user has all permissions', () => {
      service.setUser(user);
      expect(service.canAll(['post:read', 'post:write'])).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      service.setUser(user);
      expect(service.canAll(['post:read', 'post:delete'])).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(service.canAll(['post:read', 'post:write'])).toBe(false);
    });
  });

  describe('canAny()', () => {
    it('should return true when user has any permission', () => {
      service.setUser(user);
      expect(service.canAny(['post:read', 'post:delete'])).toBe(true);
    });

    it('should return false when user has no permissions', () => {
      service.setUser(user);
      expect(service.canAny(['user:read', 'user:delete'])).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(service.canAny(['post:read', 'post:write'])).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles', () => {
      service.setUser({ id: 'user-2', roles: [] });
      expect(service.can('post:write')).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const adminUser = { id: 'admin-1', roles: ['admin'] };
      service.setUser(adminUser);
      expect(service.can('user:delete')).toBe(true);
    });

    it('should handle multiple user changes', () => {
      service.setUser(user);
      expect(service.can('user:delete')).toBe(false);

      service.setUser({ id: 'admin-1', roles: ['admin'] });
      expect(service.can('user:delete')).toBe(true);

      service.setUser({ id: 'viewer-1', roles: ['viewer'] });
      expect(service.can('user:delete')).toBe(false);
    });
  });
});
