import { describe, it, expect, beforeEach } from 'vitest';
import { RBAC, MemoryOptimizer } from '../index';

describe('Memory Optimization', () => {
  const testConfig = {
    name: 'memory-test',
    version: '1.0.0',
    permissions: [
      { name: 'read', bit: 1 },
      { name: 'write', bit: 2 },
      { name: 'delete', bit: 4 },
      { name: 'admin', bit: 8 }
    ],
    roles: [
      {
        name: 'viewer',
        permissions: ['read'],
        level: 1
      },
      {
        name: 'editor',
        permissions: ['read', 'write'],
        level: 5
      },
      {
        name: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        level: 10
      }
    ]
  };

  describe('String Interning', () => {
    it('should intern permission and role strings when enabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true
      });

      const stats = rbac.getMemoryStats();
      expect(stats.enabled).toBe(true);
      expect(stats.stringPoolSize).toBeGreaterThan(0);
    });

    it('should not intern strings when optimization is disabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: false
      });

      const stats = rbac.getMemoryStats();
      expect(stats.enabled).toBe(false);
      expect(stats.stringPoolSize).toBe(0);
    });

    it('should default to no optimization', () => {
      const rbac = new RBAC({
        preset: testConfig
      });

      const stats = rbac.getMemoryStats();
      expect(stats.enabled).toBe(false);
    });

    it('should intern duplicate permission strings', () => {
      // Create config with duplicate permission references
      const configWithDuplicates = {
        ...testConfig,
        roles: [
          { name: 'role1', permissions: ['read', 'write'] },
          { name: 'role2', permissions: ['read', 'write'] }, // Same permissions
          { name: 'role3', permissions: ['read', 'delete'] }
        ]
      };

      const rbac = new RBAC({
        preset: configWithDuplicates,
        optimizeMemory: true
      });

      const stats = rbac.getMemoryStats();
      expect(stats.stringsInterned).toBeGreaterThan(stats.stringPoolSize);
    });
  });

  describe('Memory Statistics', () => {
    it('should track interned strings count', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true
      });

      const stats = rbac.getMemoryStats();
      expect(stats.stringsInterned).toBeGreaterThan(0);
      expect(stats.stringPoolSize).toBeGreaterThan(0);
    });

    it('should provide memory stats interface', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true
      });

      const stats = rbac.getMemoryStats();
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('stringPoolSize');
      expect(stats).toHaveProperty('stringsInterned');
      expect(stats).toHaveProperty('estimatedMemorySaved');
    });

    it('should return zero stats when optimization is disabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: false
      });

      const stats = rbac.getMemoryStats();
      expect(stats.stringPoolSize).toBe(0);
      expect(stats.estimatedMemorySaved).toBe(0);
    });
  });

  describe('Memory Compaction', () => {
    it('should compact memory and remove unused entries', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true,
        enableCache: true
      });

      // Create some cache entries
      const user = { id: '1', roles: ['editor'] };
      rbac.hasPermission(user, 'read');
      rbac.hasPermission(user, 'write');

      // Compact memory
      const result = rbac.compactMemory();
      expect(result).toHaveProperty('stringsRemoved');
      expect(result).toHaveProperty('cacheEntriesRemoved');
    });

    it('should work when optimization is disabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: false
      });

      expect(() => rbac.compactMemory()).not.toThrow();
    });

    it('should remove expired cache entries during compaction', async () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true,
        enableCache: true,
        cacheOptions: { ttl: 100 } // 100ms TTL
      });

      const user = { id: '1', roles: ['editor'] };
      rbac.hasPermission(user, 'read');

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = rbac.compactMemory();
      expect(result.cacheEntriesRemoved).toBeGreaterThan(0);
    });
  });

  describe('Integration with Other Features', () => {
    it('should work with caching enabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true,
        enableCache: true,
        cacheOptions: { enableStats: true }
      });

      const user = { id: '1', roles: ['editor'] };
      rbac.hasPermission(user, 'read');
      rbac.hasPermission(user, 'read'); // Cache hit

      const memStats = rbac.getMemoryStats();
      const cacheStats = rbac.getCacheStats();

      expect(memStats.enabled).toBe(true);
      expect(cacheStats?.hits).toBe(1);
    });

    it('should work with lazy roles', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true,
        lazyRoles: true
      });

      const lazyStats = rbac.getLazyRoleStats();
      const memStats = rbac.getMemoryStats();

      expect(lazyStats.enabled).toBe(true);
      expect(memStats.enabled).toBe(true);
      expect(lazyStats.pending).toBe(3);

      // Access a role
      const user = { id: '1', roles: ['editor'] };
      rbac.hasPermission(user, 'read');

      expect(rbac.getLazyRoleStats().evaluated).toBe(1);
    });

    it('should work with all performance features combined', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true,
        enableCache: true,
        lazyRoles: true,
        cacheOptions: { enableStats: true }
      });

      const user = { id: '1', roles: ['editor'] };

      // Lazy load + cache + memory optimization
      expect(rbac.hasPermission(user, 'read')).toBe(true);
      expect(rbac.hasPermission(user, 'read')).toBe(true); // Cache hit

      const memStats = rbac.getMemoryStats();
      const cacheStats = rbac.getCacheStats();
      const lazyStats = rbac.getLazyRoleStats();

      expect(memStats.enabled).toBe(true);
      expect(cacheStats?.hits).toBe(1);
      expect(lazyStats.evaluated).toBe(1);
    });
  });

  describe('Memory Optimizer Class', () => {
    let optimizer: MemoryOptimizer;

    beforeEach(() => {
      optimizer = new MemoryOptimizer();
    });

    it('should intern strings correctly', () => {
      const str1 = optimizer.internString('test');
      const str2 = optimizer.internString('test');
      const str3 = optimizer.internString('other');

      expect(str1).toBe(str2);
      expect(str1).not.toBe(str3);

      const stats = optimizer.getStats();
      expect(stats.stringPoolSize).toBe(2); // 'test' and 'other'
      expect(stats.stringsInterned).toBe(3); // 3 calls
    });

    it('should intern array of strings', () => {
      const strings = ['perm1', 'perm2', 'perm1']; // Duplicate 'perm1'
      const interned = optimizer.internStrings(strings);

      expect(interned).toHaveLength(3);
      expect(interned[0]).toBe(interned[2]);

      const stats = optimizer.getStats();
      expect(stats.stringPoolSize).toBe(2); // Only 2 unique strings
    });

    it('should cache and retrieve role masks', () => {
      optimizer.cacheRoleMask('admin', 15);
      optimizer.cacheRoleMask('editor', 7);

      expect(optimizer.getRoleMask('admin')).toBe(15);
      expect(optimizer.getRoleMask('editor')).toBe(7);
      expect(optimizer.getRoleMask('viewer')).toBeUndefined();
    });

    it('should track cache efficiency', () => {
      optimizer.cacheRoleMask('admin', 15);

      optimizer.getRoleMask('admin'); // Hit
      optimizer.getRoleMask('admin'); // Hit
      optimizer.getRoleMask('editor'); // Miss

      const efficiency = optimizer.getCacheEfficiency();
      expect(efficiency).toBeCloseTo(2 / 3);
    });

    it('should invalidate role masks', () => {
      optimizer.cacheRoleMask('admin', 15);
      expect(optimizer.getRoleMask('admin')).toBe(15);

      optimizer.invalidateRoleMask('admin');
      expect(optimizer.getRoleMask('admin')).toBeUndefined();
    });

    it('should cache wildcard patterns', () => {
      const pattern1 = /test.*/;
      const pattern2 = /admin.*/;

      optimizer.cacheWildcardPattern('test:*', pattern1);
      optimizer.cacheWildcardPattern('admin:*', pattern2);

      expect(optimizer.getWildcardPattern('test:*')).toBe(pattern1);
      expect(optimizer.getWildcardPattern('admin:*')).toBe(pattern2);

      const stats = optimizer.getStats();
      expect(stats.wildcardPatternsCached).toBe(2);
    });

    it('should compact string pool correctly', () => {
      optimizer.internString('active1');
      optimizer.internString('active2');
      optimizer.internString('unused1');
      optimizer.internString('unused2');

      const activeStrings = new Set(['active1', 'active2']);
      const removed = optimizer.compactStringPool(activeStrings);

      expect(removed).toBe(2); // 'unused1' and 'unused2' removed
      expect(optimizer.getStats().stringPoolSize).toBe(2);
    });

    it('should clear all data', () => {
      optimizer.internString('test');
      optimizer.cacheRoleMask('admin', 15);
      optimizer.cacheWildcardPattern('test:*', /test.*/);

      optimizer.clear();

      const stats = optimizer.getStats();
      expect(stats.stringPoolSize).toBe(0);
      expect(stats.roleMaskCacheSize).toBe(0);
      expect(stats.wildcardPatternCacheSize).toBe(0);
      expect(stats.stringsInterned).toBe(0);
    });

    it('should estimate memory savings', () => {
      // Add many duplicate strings
      for (let i = 0; i < 100; i++) {
        optimizer.internString('duplicate');
        optimizer.internString('another');
      }

      const stats = optimizer.getStats();
      expect(stats.estimatedMemorySaved).toBeGreaterThan(0);
    });
  });

  describe('Large Scale Performance', () => {
    it('should handle large permission sets efficiently', () => {
      const largeConfig = {
        name: 'large',
        version: '1.0.0',
        // Use 30 permissions to stay within 31-bit limit
        permissions: Array.from({ length: 30 }, (_, i) => ({
          name: `perm${i}`,
          bit: Math.pow(2, i)
        })),
        roles: Array.from({ length: 100 }, (_, i) => ({
          name: `role${i}`,
          permissions: [`perm${i % 30}`, `perm${(i + 1) % 30}`],
          level: i
        }))
      };

      const rbac = new RBAC({
        preset: largeConfig,
        optimizeMemory: true,
        enableCache: true,
        lazyRoles: true
      });

      const memStats = rbac.getMemoryStats();
      expect(memStats.stringPoolSize).toBeGreaterThan(0);

      // Test permission check still works
      const user = { id: '1', roles: ['role5'] };
      expect(rbac.hasPermission(user, 'perm5')).toBe(true);
    });

    it('should reduce memory for duplicate permission names', () => {
      // Without optimization
      const rbacNormal = new RBAC({
        preset: testConfig,
        optimizeMemory: false
      });

      // With optimization
      const rbacOptimized = new RBAC({
        preset: testConfig,
        optimizeMemory: true
      });

      const normalStats = rbacNormal.getMemoryStats();
      const optimizedStats = rbacOptimized.getMemoryStats();

      expect(normalStats.enabled).toBe(false);
      expect(optimizedStats.enabled).toBe(true);
      expect(optimizedStats.stringPoolSize).toBeGreaterThan(0);
    });
  });

  describe('Config Loading with Memory Optimization', () => {
    it('should support memory optimization with fromJSONConfig', () => {
      const json = JSON.stringify(testConfig);
      const rbac = RBAC.fromJSONConfig(json, { optimizeMemory: true });

      const stats = rbac.getMemoryStats();
      expect(stats.enabled).toBe(true);
      expect(stats.stringPoolSize).toBeGreaterThan(0);
    });

    it('should work correctly after optimization', () => {
      const json = JSON.stringify(testConfig);
      const rbac = RBAC.fromJSONConfig(json, {
        optimizeMemory: true,
        enableCache: true,
        lazyRoles: true
      });

      const user = { id: '1', roles: ['editor'] };
      expect(rbac.hasPermission(user, 'read')).toBe(true);
      expect(rbac.hasPermission(user, 'write')).toBe(true);
      expect(rbac.hasPermission(user, 'delete')).toBe(false);
    });
  });

  describe('Memory Optimizer Accessor', () => {
    it('should provide access to memory optimizer instance', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: true
      });

      const optimizer = rbac.getMemoryOptimizer();
      expect(optimizer).toBeInstanceOf(MemoryOptimizer);
    });

    it('should return undefined when optimization is disabled', () => {
      const rbac = new RBAC({
        preset: testConfig,
        optimizeMemory: false
      });

      const optimizer = rbac.getMemoryOptimizer();
      expect(optimizer).toBeUndefined();
    });
  });
});
