import { describe, it, expect, beforeEach } from 'vitest';
import { RBAC, RBACAggregator, type IRBAC, type RBACUser, type PresetConfig } from '../index';

/**
 * Test suite for RBAC polymorphism
 * 
 * This suite verifies that both RBAC and RBACAggregator can be used
 * interchangeably through the IRBAC interface, demonstrating polymorphism.
 */

describe('RBAC Polymorphism Tests', () => {
  // Test users
  let adminUser: RBACUser;
  let editorUser: RBACUser;
  let viewerUser: RBACUser;

  // Test config for RBAC
  let rbacConfig: PresetConfig;

  // RBAC and RBACAggregator instances
  let rbac: RBAC;
  let aggregator: RBACAggregator;

  beforeEach(() => {
    // Create test users
    adminUser = {
      id: 'user-1',
      roles: ['admin']
    };

    editorUser = {
      id: 'user-2',
      roles: ['editor']
    };

    viewerUser = {
      id: 'user-3',
      roles: ['viewer']
    };

    // Create RBAC config
    rbacConfig = {
      name: 'test-preset',
      version: '1.0.0',
      permissions: [
        { name: 'posts:create', bit: 1 },
        { name: 'posts:read', bit: 2 },
        { name: 'posts:update', bit: 4 },
        { name: 'posts:delete', bit: 8 },
        { name: 'users:create', bit: 16 },
        { name: 'users:read', bit: 32 },
        { name: 'users:update', bit: 64 },
        { name: 'users:delete', bit: 128 }
      ],
      roles: [
        {
          name: 'admin',
          permissions: ['posts:create', 'posts:read', 'posts:update', 'posts:delete', 'users:create', 'users:read', 'users:update', 'users:delete']
        },
        {
          name: 'editor',
          permissions: ['posts:create', 'posts:read', 'posts:update', 'users:read']
        },
        {
          name: 'viewer',
          permissions: ['posts:read', 'users:read']
        }
      ]
    };

    // Initialize RBAC
    rbac = new RBAC({ preset: rbacConfig });

    // Initialize RBACAggregator with multiple domains
    const postsRBAC = new RBAC({ preset: rbacConfig });
    const usersRBAC = new RBAC({ preset: rbacConfig });

    const instances = new Map<string, RBAC>();
    instances.set('posts', postsRBAC);
    instances.set('users', usersRBAC);

    aggregator = RBACAggregator.create({
      instances
    });
  });

  describe('hasPermission - Polymorphism', () => {
    it('RBAC: Admin has all permissions', () => {
      expect(rbac.hasPermission(adminUser, 'posts:create')).toBe(true);
      expect(rbac.hasPermission(adminUser, 'posts:delete')).toBe(true);
      expect(rbac.hasPermission(adminUser, 'users:delete')).toBe(true);
    });

    it('RBACAggregator: Admin has all permissions', () => {
      expect(aggregator.hasPermission(adminUser, 'posts:create')).toBe(true);
      expect(aggregator.hasPermission(adminUser, 'posts:delete')).toBe(true);
      expect(aggregator.hasPermission(adminUser, 'users:delete')).toBe(true);
    });

    it('RBAC: Editor has only editor permissions', () => {
      expect(rbac.hasPermission(editorUser, 'posts:create')).toBe(true);
      expect(rbac.hasPermission(editorUser, 'posts:delete')).toBe(false);
      expect(rbac.hasPermission(editorUser, 'users:create')).toBe(false);
    });

    it('RBACAggregator: Editor has only editor permissions', () => {
      expect(aggregator.hasPermission(editorUser, 'posts:create')).toBe(true);
      expect(aggregator.hasPermission(editorUser, 'posts:delete')).toBe(false);
      expect(aggregator.hasPermission(editorUser, 'users:create')).toBe(false);
    });

    it('RBAC: Viewer has only read permissions', () => {
      expect(rbac.hasPermission(viewerUser, 'posts:read')).toBe(true);
      expect(rbac.hasPermission(viewerUser, 'posts:create')).toBe(false);
      expect(rbac.hasPermission(viewerUser, 'users:update')).toBe(false);
    });

    it('RBACAggregator: Viewer has only read permissions', () => {
      expect(aggregator.hasPermission(viewerUser, 'posts:read')).toBe(true);
      expect(aggregator.hasPermission(viewerUser, 'posts:create')).toBe(false);
      expect(aggregator.hasPermission(viewerUser, 'users:update')).toBe(false);
    });
  });

  describe('hasAnyPermission - Polymorphism', () => {
    it('RBAC: Admin has any of the specified permissions', () => {
      const result = rbac.hasAnyPermission(adminUser, ['posts:delete', 'users:update']);
      expect(result).toBe(true);
    });

    it('RBACAggregator: Admin has any of the specified permissions', () => {
      const result = aggregator.hasAnyPermission(adminUser, ['posts:delete', 'users:update']);
      expect(result).toBe(true);
    });

    it('RBAC: Editor has some but not all permissions', () => {
      expect(rbac.hasAnyPermission(editorUser, ['posts:delete', 'posts:create'])).toBe(true);
      expect(rbac.hasAnyPermission(editorUser, ['users:delete', 'users:create'])).toBe(false);
    });

    it('RBACAggregator: Editor has some but not all permissions', () => {
      expect(aggregator.hasAnyPermission(editorUser, ['posts:delete', 'posts:create'])).toBe(true);
      expect(aggregator.hasAnyPermission(editorUser, ['users:delete', 'users:create'])).toBe(false);
    });

    it('RBAC: Viewer has only read permissions', () => {
      expect(rbac.hasAnyPermission(viewerUser, ['posts:read', 'users:read'])).toBe(true);
      expect(rbac.hasAnyPermission(viewerUser, ['posts:create', 'users:create'])).toBe(false);
    });

    it('RBACAggregator: Viewer has only read permissions', () => {
      expect(aggregator.hasAnyPermission(viewerUser, ['posts:read', 'users:read'])).toBe(true);
      expect(aggregator.hasAnyPermission(viewerUser, ['posts:create', 'users:create'])).toBe(false);
    });
  });

  describe('hasAllPermissions - Polymorphism', () => {
    it('RBAC: Admin has all specified permissions', () => {
      const result = rbac.hasAllPermissions(adminUser, ['posts:create', 'posts:update', 'users:delete']);
      expect(result).toBe(true);
    });

    it('RBACAggregator: Admin has all specified permissions', () => {
      const result = aggregator.hasAllPermissions(adminUser, ['posts:create', 'posts:update', 'users:delete']);
      expect(result).toBe(true);
    });

    it('RBAC: Editor does not have all permissions', () => {
      expect(rbac.hasAllPermissions(editorUser, ['posts:create', 'posts:delete'])).toBe(false);
      expect(rbac.hasAllPermissions(editorUser, ['posts:create', 'posts:update', 'users:read'])).toBe(true);
    });

    it('RBACAggregator: Editor does not have all permissions', () => {
      expect(aggregator.hasAllPermissions(editorUser, ['posts:create', 'posts:delete'])).toBe(false);
      expect(aggregator.hasAllPermissions(editorUser, ['posts:create', 'posts:update', 'users:read'])).toBe(true);
    });

    it('RBAC: Viewer only has read permissions', () => {
      expect(rbac.hasAllPermissions(viewerUser, ['posts:read', 'users:read'])).toBe(true);
      expect(rbac.hasAllPermissions(viewerUser, ['posts:read', 'posts:create'])).toBe(false);
    });

    it('RBACAggregator: Viewer only has read permissions', () => {
      expect(aggregator.hasAllPermissions(viewerUser, ['posts:read', 'users:read'])).toBe(true);
      expect(aggregator.hasAllPermissions(viewerUser, ['posts:read', 'posts:create'])).toBe(false);
    });
  });

  describe('authorize - Polymorphism', () => {
    it('RBAC: Admin authorization succeeds', () => {
      const result = rbac.authorize(adminUser, 'posts:delete');
      expect(result.allowed).toBe(true);
      expect(result.user).toEqual(adminUser);
    });

    it('RBACAggregator: Admin authorization succeeds', () => {
      const result = aggregator.authorize(adminUser, 'posts:delete');
      expect(result.allowed).toBe(true);
      expect(result.user).toEqual(adminUser);
    });

    it('RBAC: Editor authorization fails for delete', () => {
      const result = rbac.authorize(editorUser, 'posts:delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('posts:delete');
    });

    it('RBACAggregator: Editor authorization fails for delete', () => {
      const result = aggregator.authorize(editorUser, 'posts:delete');
      expect(result.allowed).toBe(false);
      if (result.reason) {
        expect(result.reason).toContain('posts:delete');
      }
    });

    it('RBAC: Editor authorization succeeds for create', () => {
      const result = rbac.authorize(editorUser, 'posts:create');
      expect(result.allowed).toBe(true);
    });

    it('RBACAggregator: Editor authorization succeeds for create', () => {
      const result = aggregator.authorize(editorUser, 'posts:create');
      expect(result.allowed).toBe(true);
    });
  });

  describe('getAllRoles - Polymorphism', () => {
    it('RBAC: Returns all registered roles', () => {
      const roles = rbac.getAllRoles();
      expect(roles).toContain('admin');
      expect(roles).toContain('editor');
      expect(roles).toContain('viewer');
      expect(roles.length).toBe(3);
    });

    it('RBACAggregator: Returns all roles from all domains', () => {
      const roles = aggregator.getAllRoles();
      expect(roles).toContain('admin');
      expect(roles).toContain('editor');
      expect(roles).toContain('viewer');
      // Aggregator may have duplicates from multiple domains
      expect(roles.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getRolePermissions - Polymorphism', () => {
    it('RBAC: Returns permissions for admin role', () => {
      const permissions = rbac.getRolePermissions('admin');
      expect(permissions).toContain('posts:create');
      expect(permissions).toContain('posts:delete');
      expect(permissions).toContain('users:delete');
      expect(permissions.length).toBe(8);
    });

    it('RBACAggregator: Returns permissions for admin role', () => {
      const permissions = aggregator.getRolePermissions('admin');
      expect(permissions).toContain('posts:create');
      expect(permissions).toContain('posts:delete');
      expect(permissions).toContain('users:delete');
      // Aggregator returns union from all domains
      expect(permissions.length).toBeGreaterThanOrEqual(8);
    });

    it('RBAC: Returns permissions for editor role', () => {
      const permissions = rbac.getRolePermissions('editor');
      expect(permissions).toContain('posts:create');
      expect(permissions).toContain('posts:update');
      expect(permissions).toContain('users:read');
      expect(permissions.includes('posts:delete')).toBe(false);
      expect(permissions.length).toBe(4);
    });

    it('RBACAggregator: Returns permissions for editor role', () => {
      const permissions = aggregator.getRolePermissions('editor');
      expect(permissions).toContain('posts:create');
      expect(permissions).toContain('posts:update');
      expect(permissions).toContain('users:read');
      expect(permissions.includes('posts:delete')).toBe(false);
      expect(permissions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('createRole - Polymorphism', () => {
    it('RBAC: Creates a new role', () => {
      rbac.createRole('moderator', ['posts:read', 'posts:update', 'users:read']);
      
      const permissions = rbac.getRolePermissions('moderator');
      expect(permissions).toContain('posts:read');
      expect(permissions).toContain('posts:update');
      expect(permissions).toContain('users:read');
    });

    it('RBACAggregator: Creates a new role in all domains', () => {
      aggregator.createRole('moderator', ['posts:read', 'posts:update', 'users:read']);
      
      const permissions = aggregator.getRolePermissions('moderator');
      expect(permissions).toContain('posts:read');
      expect(permissions).toContain('posts:update');
      expect(permissions).toContain('users:read');
    });
  });

  describe('addPermissionToRole - Polymorphism', () => {
    it('RBAC: Adds permission to existing role', () => {
      rbac.addPermissionToRole('viewer', 'posts:like');
      
      const permissions = rbac.getRolePermissions('viewer');
      expect(permissions).toContain('posts:like');
      expect(permissions).toContain('posts:read');
    });

    it('RBACAggregator: Adds permission to role in all domains', () => {
      aggregator.addPermissionToRole('viewer', 'posts:like');
      
      const permissions = aggregator.getRolePermissions('viewer');
      expect(permissions).toContain('posts:like');
      expect(permissions).toContain('posts:read');
    });
  });

  describe('Function accepting IRBAC interface', () => {
    /**
     * Example function that works with any IRBAC implementation
     * This demonstrates polymorphism in action
     */
    function checkPermissions(rbacSystem: IRBAC, user: RBACUser, permissions: string[]): boolean {
      // Can use any IRBAC method
      return rbacSystem.hasAllPermissions(user, permissions);
    }

    function createAuthorizedUser(rbacSystem: IRBAC, userId: string, role: string): RBACUser {
      // Can access role management methods
      return {
        id: userId,
        roles: [role]
      };
    }

    it('Works with RBAC instance', () => {
      const result = checkPermissions(rbac, adminUser, ['posts:create', 'posts:read']);
      expect(result).toBe(true);

      const result2 = checkPermissions(rbac, viewerUser, ['posts:create', 'posts:read']);
      expect(result2).toBe(false);
    });

    it('Works with RBACAggregator instance', () => {
      const result = checkPermissions(aggregator, adminUser, ['posts:create', 'posts:read']);
      expect(result).toBe(true);

      const result2 = checkPermissions(aggregator, viewerUser, ['posts:create', 'posts:read']);
      expect(result2).toBe(false);
    });

    it('Can use both interchangeably', () => {
      const rbac1: IRBAC = rbac;
      const rbac2: IRBAC = aggregator;

      // Both work exactly the same
      expect(rbac1.hasPermission(adminUser, 'posts:delete')).toBe(true);
      expect(rbac2.hasPermission(adminUser, 'posts:delete')).toBe(true);

      expect(rbac1.hasPermission(viewerUser, 'posts:delete')).toBe(false);
      expect(rbac2.hasPermission(viewerUser, 'posts:delete')).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('RBAC: Returns false for non-existent permission', () => {
      expect(rbac.hasPermission(adminUser, 'unknown:permission')).toBe(false);
    });

    it('RBACAggregator: Returns false for non-existent permission', () => {
      expect(aggregator.hasPermission(adminUser, 'unknown:permission')).toBe(false);
    });

    it('RBAC: Returns empty array for non-existent role', () => {
      expect(rbac.getRolePermissions('nonexistent')).toEqual([]);
    });

    it('RBACAggregator: Returns empty array for non-existent role', () => {
      expect(aggregator.getRolePermissions('nonexistent')).toEqual([]);
    });

    it('RBAC: Handles empty permissions array', () => {
      expect(rbac.hasAnyPermission(adminUser, [])).toBe(false);
      expect(rbac.hasAllPermissions(adminUser, [])).toBe(true);
    });

    it('RBACAggregator: Handles empty permissions array', () => {
      expect(aggregator.hasAnyPermission(adminUser, [])).toBe(false);
      expect(aggregator.hasAllPermissions(adminUser, [])).toBe(true);
    });
  });
});
