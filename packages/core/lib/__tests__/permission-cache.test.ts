import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionCache } from '../utils/permission-cache';

describe('Permission Cache', () => {
  let cache: PermissionCache;

  beforeEach(() => {
    cache = new PermissionCache({
      maxSize: 5,
      ttl: 1000, // 1 second for testing
      enableStats: true
    });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve permission results', () => {
      cache.set('user1', 'read:posts', true);
      expect(cache.get('user1', 'read:posts')).toBe(true);

      cache.set('user2', 'write:posts', false);
      expect(cache.get('user2', 'write:posts')).toBe(false);
    });

    it('should return undefined for non-existent entries', () => {
      expect(cache.get('user1', 'nonexistent')).toBeUndefined();
    });

    it('should handle multiple permissions for same user', () => {
      cache.set('user1', 'read:posts', true);
      cache.set('user1', 'write:posts', false);
      cache.set('user1', 'delete:posts', true);

      expect(cache.get('user1', 'read:posts')).toBe(true);
      expect(cache.get('user1', 'write:posts')).toBe(false);
      expect(cache.get('user1', 'delete:posts')).toBe(true);
    });

    it('should handle same permission for multiple users', () => {
      cache.set('user1', 'read:posts', true);
      cache.set('user2', 'read:posts', false);
      cache.set('user3', 'read:posts', true);

      expect(cache.get('user1', 'read:posts')).toBe(true);
      expect(cache.get('user2', 'read:posts')).toBe(false);
      expect(cache.get('user3', 'read:posts')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      cache.set('user1', 'perm1', true);
      cache.set('user2', 'perm2', true);
      cache.set('user3', 'perm3', true);
      cache.set('user4', 'perm4', true);
      cache.set('user5', 'perm5', true);

      // Cache is full (maxSize: 5)
      expect(cache.getSize()).toBe(5);

      // Add one more - should evict user1:perm1
      cache.set('user6', 'perm6', true);

      expect(cache.get('user1', 'perm1')).toBeUndefined();
      expect(cache.get('user6', 'perm6')).toBe(true);
      expect(cache.getSize()).toBe(5);
    });

    it('should move accessed entries to end (LRU)', () => {
      cache.set('user1', 'perm1', true);
      cache.set('user2', 'perm2', true);
      cache.set('user3', 'perm3', true);
      cache.set('user4', 'perm4', true);
      cache.set('user5', 'perm5', true);

      // Access user1:perm1 - moves it to end
      cache.get('user1', 'perm1');

      // Add new entry - should evict user2:perm2 (now oldest)
      cache.set('user6', 'perm6', true);

      expect(cache.get('user1', 'perm1')).toBe(true);
      expect(cache.get('user2', 'perm2')).toBeUndefined();
      expect(cache.get('user6', 'perm6')).toBe(true);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('user1', 'read:posts', true);
      expect(cache.get('user1', 'read:posts')).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('user1', 'read:posts')).toBeUndefined();
    });

    it('should not return expired entries', async () => {
      cache.set('user1', 'perm1', true);
      cache.set('user2', 'perm2', false);

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('user1', 'perm1')).toBeUndefined();
      expect(cache.get('user2', 'perm2')).toBeUndefined();
    });

    it('should cleanup expired entries', async () => {
      cache.set('user1', 'perm1', true);
      cache.set('user2', 'perm2', true);
      cache.set('user3', 'perm3', true);

      expect(cache.getSize()).toBe(3);

      await new Promise(resolve => setTimeout(resolve, 1100));

      const removed = cache.cleanup();
      expect(removed).toBe(3);
      expect(cache.getSize()).toBe(0);
    });
  });

  describe('Invalidation', () => {
    beforeEach(() => {
      cache.set('user1', 'read:posts', true);
      cache.set('user1', 'write:posts', false);
      cache.set('user2', 'read:posts', true);
      cache.set('user2', 'delete:posts', false);
    });

    it('should invalidate specific user permission', () => {
      cache.invalidate('user1', 'read:posts');

      expect(cache.get('user1', 'read:posts')).toBeUndefined();
      expect(cache.get('user1', 'write:posts')).toBe(false);
      expect(cache.get('user2', 'read:posts')).toBe(true);
    });

    it('should invalidate all permissions for user', () => {
      cache.invalidate('user1');

      expect(cache.get('user1', 'read:posts')).toBeUndefined();
      expect(cache.get('user1', 'write:posts')).toBeUndefined();
      expect(cache.get('user2', 'read:posts')).toBe(true);
      expect(cache.get('user2', 'delete:posts')).toBe(false);
    });

    it('should invalidate permission across all users', () => {
      cache.invalidatePermission('read:posts');

      expect(cache.get('user1', 'read:posts')).toBeUndefined();
      expect(cache.get('user2', 'read:posts')).toBeUndefined();
      expect(cache.get('user1', 'write:posts')).toBe(false);
      expect(cache.get('user2', 'delete:posts')).toBe(false);
    });

    it('should clear all cache entries', () => {
      cache.clear();

      expect(cache.get('user1', 'read:posts')).toBeUndefined();
      expect(cache.get('user1', 'write:posts')).toBeUndefined();
      expect(cache.get('user2', 'read:posts')).toBeUndefined();
      expect(cache.get('user2', 'delete:posts')).toBeUndefined();
      expect(cache.getSize()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('user1', 'read:posts', true);

      // Hit
      cache.get('user1', 'read:posts');
      cache.get('user1', 'read:posts');

      // Miss
      cache.get('user2', 'write:posts');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
      expect(stats.size).toBe(1);
    });

    it('should track expired entries as misses', async () => {
      cache.set('user1', 'read:posts', true);

      await new Promise(resolve => setTimeout(resolve, 1100));

      cache.get('user1', 'read:posts'); // Should be expired

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should reset stats on clear', () => {
      cache.set('user1', 'read:posts', true);
      cache.get('user1', 'read:posts'); // Hit
      cache.get('user2', 'write:posts'); // Miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should not track stats when disabled', () => {
      const noStatsCache = new PermissionCache({ enableStats: false });

      noStatsCache.set('user1', 'read:posts', true);
      noStatsCache.get('user1', 'read:posts');
      noStatsCache.get('user2', 'write:posts');

      const stats = noStatsCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Auto Cleanup', () => {
    it('should start automatic cleanup', async () => {
      cache.set('user1', 'perm1', true);
      cache.set('user2', 'perm2', true);

      const interval = cache.startAutoCleanup(500);

      await new Promise(resolve => setTimeout(resolve, 1600));

      expect(cache.getSize()).toBe(0);

      clearInterval(interval);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache', () => {
      expect(cache.getSize()).toBe(0);
      expect(cache.get('user1', 'perm1')).toBeUndefined();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should update existing entry without changing size', () => {
      cache.set('user1', 'read:posts', true);
      expect(cache.getSize()).toBe(1);

      cache.set('user1', 'read:posts', false);
      expect(cache.getSize()).toBe(1);
      expect(cache.get('user1', 'read:posts')).toBe(false);
    });

    it('should handle special characters in keys', () => {
      cache.set('user:123', 'tenant:456:read', true);
      expect(cache.get('user:123', 'tenant:456:read')).toBe(true);
    });

    it('should handle default options', () => {
      const defaultCache = new PermissionCache();

      defaultCache.set('user1', 'perm1', true);
      expect(defaultCache.get('user1', 'perm1')).toBe(true);

      const stats = defaultCache.getStats();
      expect(stats.hits).toBe(0); // Stats disabled by default
    });

    it('should cleanup return 0 when no expired entries', () => {
      cache.set('user1', 'perm1', true);
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });

    it('should track hit count per entry', () => {
      cache.set('user1', 'read:posts', true);

      cache.get('user1', 'read:posts');
      cache.get('user1', 'read:posts');
      cache.get('user1', 'read:posts');

      const entries = cache.getEntries();
      const entry = entries.get('user1:read:posts');
      expect(entry?.hits).toBe(3);
    });
  });

  describe('Integration with Large Datasets', () => {
    it('should handle 1000+ entries efficiently', () => {
      const largeCache = new PermissionCache({
        maxSize: 10000,
        ttl: 60000,
        enableStats: true
      });

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`user${i}`, 'read:posts', i % 2 === 0);
      }

      expect(largeCache.getSize()).toBe(1000);

      // Access random entries
      for (let i = 0; i < 100; i++) {
        const userId = `user${Math.floor(Math.random() * 1000)}`;
        largeCache.get(userId, 'read:posts');
      }

      const stats = largeCache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.size).toBe(1000);
    });

    it('should handle mass invalidation', () => {
      const largeCache = new PermissionCache({ maxSize: 10000 });

      for (let i = 0; i < 500; i++) {
        largeCache.set(`user${i}`, 'read:posts', true);
        largeCache.set(`user${i}`, 'write:posts', false);
      }

      expect(largeCache.getSize()).toBe(1000);

      // Invalidate all read:posts permissions
      largeCache.invalidatePermission('read:posts');

      expect(largeCache.getSize()).toBe(500);
    });
  });
});
