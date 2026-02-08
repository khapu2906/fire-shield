import { describe, it, expect } from 'vitest';
import { RBAC } from '../index';

describe('Lazy Role Evaluation', () => {
  const testConfig = {
    name: 'test-rbac',
    version: '1.0.0',
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
      { name: 'user:delete', bit: 4 },
      { name: 'post:read', bit: 8 },
      { name: 'post:write', bit: 16 },
      { name: 'post:delete', bit: 32 },
      { name: 'admin:full', bit: 64 }
    ],
    roles: [
      {
        name: 'viewer',
        permissions: ['user:read', 'post:read'],
        level: 1
      },
      {
        name: 'editor',
        permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
        level: 5
      },
      {
        name: 'moderator',
        permissions: ['user:read', 'user:write', 'post:read', 'post:write', 'post:delete'],
        level: 7
      },
      {
        name: 'admin',
        permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write', 'post:delete', 'admin:full'],
        level: 10
      }
    ]
  };

  describe('Basic Lazy Loading', () => {
    it('should not evaluate roles on initialization when lazyRoles is true', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const stats = rbac.getLazyRoleStats();
      expect(stats.enabled).toBe(true);
      expect(stats.pending).toBe(4); // All 4 roles pending
      expect(stats.evaluated).toBe(0); // None evaluated yet
      expect(stats.total).toBe(4);
    });

    it('should evaluate roles immediately when lazyRoles is false', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: false
      });

      const stats = rbac.getLazyRoleStats();
      expect(stats.enabled).toBe(false);
      expect(stats.pending).toBe(0);
      expect(stats.evaluated).toBe(0);
    });

    it('should default to eager loading when lazyRoles is not specified', () => {
      const rbac = new RBAC({
        preset: testConfig
      });

      const stats = rbac.getLazyRoleStats();
      expect(stats.enabled).toBe(false);
    });
  });

  describe('On-Demand Evaluation', () => {
    it('should evaluate role only when first accessed', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      // Initially all roles pending
      expect(rbac.getLazyRoleStats().pending).toBe(4);
      expect(rbac.getLazyRoleStats().evaluated).toBe(0);

      // Access viewer role
      const viewer = { id: '1', roles: ['viewer'] };
      const hasRead = rbac.hasPermission(viewer, 'user:read');

      expect(hasRead).toBe(true);

      // Only viewer should be evaluated
      const stats = rbac.getLazyRoleStats();
      expect(stats.pending).toBe(3);
      expect(stats.evaluated).toBe(1);
      expect(rbac.getEvaluatedRoles()).toContain('viewer');
      expect(rbac.getPendingRoles()).not.toContain('viewer');
    });

    it('should not re-evaluate already evaluated roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const viewer = { id: '1', roles: ['viewer'] };

      // First access
      rbac.hasPermission(viewer, 'user:read');
      expect(rbac.getLazyRoleStats().evaluated).toBe(1);

      // Second access
      rbac.hasPermission(viewer, 'post:read');
      expect(rbac.getLazyRoleStats().evaluated).toBe(1); // Still 1, not re-evaluated
    });

    it('should evaluate multiple roles for users with multiple roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const multiRoleUser = { id: '1', roles: ['viewer', 'editor'] };
      rbac.hasPermission(multiRoleUser, 'user:write');

      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(2); // Both viewer and editor evaluated
      expect(rbac.getEvaluatedRoles()).toContain('viewer');
      expect(rbac.getEvaluatedRoles()).toContain('editor');
    });

    it('should evaluate only user roles, not all roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const viewer = { id: '1', roles: ['viewer'] };
      rbac.hasPermission(viewer, 'user:read');

      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(1); // Only viewer
      expect(stats.pending).toBe(3); // admin, editor, moderator still pending
    });
  });

  describe('Permission Checks with Lazy Roles', () => {
    it('should correctly check permissions after lazy evaluation', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const editor = { id: '1', roles: ['editor'] };

      expect(rbac.hasPermission(editor, 'user:read')).toBe(true);
      expect(rbac.hasPermission(editor, 'user:write')).toBe(true);
      expect(rbac.hasPermission(editor, 'post:read')).toBe(true);
      expect(rbac.hasPermission(editor, 'post:write')).toBe(true);
      expect(rbac.hasPermission(editor, 'user:delete')).toBe(false);
      expect(rbac.hasPermission(editor, 'post:delete')).toBe(false);
    });

    it('should work correctly with role hierarchy after lazy evaluation', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const moderator = { id: '1', roles: ['moderator'] };

      expect(rbac.hasPermission(moderator, 'post:delete')).toBe(true);
      expect(rbac.hasPermission(moderator, 'user:delete')).toBe(false);

      // Check role level was set correctly
      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(1);
    });

    it('should handle non-existent roles gracefully', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const user = { id: '1', roles: ['nonexistent'] };
      expect(rbac.hasPermission(user, 'user:read')).toBe(false);

      // Non-existent role doesn't affect stats
      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(0);
      expect(stats.pending).toBe(4);
    });
  });

  describe('Manual Evaluation', () => {
    it('should allow forcing evaluation of all roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      expect(rbac.getLazyRoleStats().pending).toBe(4);

      rbac.evaluateAllRoles();

      const stats = rbac.getLazyRoleStats();
      expect(stats.pending).toBe(0);
      expect(stats.evaluated).toBe(4);
      expect(rbac.getEvaluatedRoles()).toEqual(['viewer', 'editor', 'moderator', 'admin']);
    });

    it('should handle evaluateAllRoles when lazyRoles is false', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: false
      });

      // Should not throw
      expect(() => rbac.evaluateAllRoles()).not.toThrow();
    });

    it('should check if specific role is pending', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      expect(rbac.isRolePending('viewer')).toBe(true);
      expect(rbac.isRolePending('editor')).toBe(true);

      // Evaluate viewer
      const viewer = { id: '1', roles: ['viewer'] };
      rbac.hasPermission(viewer, 'user:read');

      expect(rbac.isRolePending('viewer')).toBe(false);
      expect(rbac.isRolePending('editor')).toBe(true);
    });
  });

  describe('Integration with Caching', () => {
    it('should work correctly with permission caching', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true,
        enableCache: true,
        cacheOptions: { enableStats: true }
      });

      const editor = { id: '1', roles: ['editor'] };

      // First check - should evaluate role and cache result
      expect(rbac.hasPermission(editor, 'user:write')).toBe(true);

      // Second check - should use cache
      expect(rbac.hasPermission(editor, 'user:write')).toBe(true);

      const cacheStats = rbac.getCacheStats();
      expect(cacheStats?.hits).toBeGreaterThan(0);
    });

    it('should cache results from lazy-evaluated roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true,
        enableCache: true,
        cacheOptions: { enableStats: true }
      });

      const viewer = { id: '1', roles: ['viewer'] };

      // Lazy evaluate and cache
      rbac.hasPermission(viewer, 'user:read');
      rbac.hasPermission(viewer, 'user:read'); // Cache hit

      const stats = rbac.getCacheStats();
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
    });
  });

  describe('Memory Optimization', () => {
    it('should use less memory with lazy roles for unused roles', () => {
      const rbacLazy = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const rbacEager = new RBAC({
        preset: testConfig,
        lazyRoles: false
      });

      // With lazy loading, only access one role
      const viewer = { id: '1', roles: ['viewer'] };
      rbacLazy.hasPermission(viewer, 'user:read');

      // Lazy should have 1 evaluated, 3 pending
      const lazyStats = rbacLazy.getLazyRoleStats();
      expect(lazyStats.evaluated).toBe(1);
      expect(lazyStats.pending).toBe(3);

      // Eager loads all roles immediately
      const eagerStats = rbacEager.getLazyRoleStats();
      expect(eagerStats.enabled).toBe(false);
    });

    it('should handle large number of roles efficiently', () => {
      const largeConfig = {
        name: 'large-rbac',
        version: '1.0.0',
        permissions: Array.from({ length: 100 }, (_, i) => ({
          name: `perm${i}`,
          bit: Math.pow(2, i % 30)
        })),
        roles: Array.from({ length: 100 }, (_, i) => ({
          name: `role${i}`,
          permissions: [`perm${i}`, `perm${(i + 1) % 100}`],
          level: i
        }))
      };

      const rbac = new RBAC({
        preset: largeConfig,
        lazyRoles: true
      });

      const stats = rbac.getLazyRoleStats();
      expect(stats.pending).toBe(100);
      expect(stats.evaluated).toBe(0);

      // Access only one role
      const user = { id: '1', roles: ['role5'] };
      rbac.hasPermission(user, 'perm5');

      const newStats = rbac.getLazyRoleStats();
      expect(newStats.evaluated).toBe(1);
      expect(newStats.pending).toBe(99); // 99 roles still not loaded
    });
  });

  describe('Config Loading with Lazy Roles', () => {
    it('should support lazy roles with fromJSONConfig', () => {
      const json = JSON.stringify(testConfig);
      const rbac = RBAC.fromJSONConfig(json, { lazyRoles: true });

      const stats = rbac.getLazyRoleStats();
      expect(stats.enabled).toBe(true);
      expect(stats.pending).toBe(4);

      const viewer = { id: '1', roles: ['viewer'] };
      expect(rbac.hasPermission(viewer, 'user:read')).toBe(true);
      expect(rbac.getLazyRoleStats().evaluated).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty roles array', () => {
      const emptyConfig = {
        ...testConfig,
        roles: []
      };

      const rbac = new RBAC({
        preset: emptyConfig,
        lazyRoles: true
      });

      const stats = rbac.getLazyRoleStats();
      expect(stats.pending).toBe(0);
      expect(stats.evaluated).toBe(0);
      expect(stats.total).toBe(0);
    });

    it('should handle user with no roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      const noRoleUser = { id: '1', roles: [] };
      expect(rbac.hasPermission(noRoleUser, 'user:read')).toBe(false);

      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(0);
    });

    it('should handle mixed evaluated and pending roles for same user', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      // Evaluate viewer first
      const viewer = { id: '1', roles: ['viewer'] };
      rbac.hasPermission(viewer, 'user:read');

      // Now check user with both evaluated and pending roles
      const mixedUser = { id: '2', roles: ['viewer', 'editor'] };
      expect(rbac.hasPermission(mixedUser, 'user:write')).toBe(true);

      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(2); // Both viewer and editor now evaluated
      expect(stats.pending).toBe(2); // admin and moderator still pending
    });

    it('should return correct stats after partial evaluation', () => {
      const rbac = new RBAC({
        preset: testConfig,
        lazyRoles: true
      });

      // Evaluate 2 out of 4 roles
      const user1 = { id: '1', roles: ['viewer'] };
      const user2 = { id: '2', roles: ['editor'] };

      rbac.hasPermission(user1, 'user:read');
      rbac.hasPermission(user2, 'user:write');

      const stats = rbac.getLazyRoleStats();
      expect(stats.evaluated).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(4);

      expect(rbac.getPendingRoles()).toEqual(['moderator', 'admin']);
      expect(rbac.getEvaluatedRoles()).toEqual(['viewer', 'editor']);
    });
  });
});
