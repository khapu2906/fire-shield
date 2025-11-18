import { describe, it, expect } from 'vitest';
import { WildcardMatcher } from '../utils/wildcard-matcher';

describe('WildcardMatcher', () => {
  describe('Pattern Matching', () => {
    it('should match exact permission', () => {
      expect(WildcardMatcher.matches('user:read', 'user:read')).toBe(true);
      expect(WildcardMatcher.matches('user:read', 'user:write')).toBe(false);
    });

    it('should match wildcard at end (admin:*)', () => {
      expect(WildcardMatcher.matches('admin:read', 'admin:*')).toBe(true);
      expect(WildcardMatcher.matches('admin:write', 'admin:*')).toBe(true);
      expect(WildcardMatcher.matches('admin:delete', 'admin:*')).toBe(true);
      expect(WildcardMatcher.matches('user:read', 'admin:*')).toBe(false);
    });

    it('should match wildcard at start (*:read)', () => {
      expect(WildcardMatcher.matches('user:read', '*:read')).toBe(true);
      expect(WildcardMatcher.matches('admin:read', '*:read')).toBe(true);
      expect(WildcardMatcher.matches('post:read', '*:read')).toBe(true);
      expect(WildcardMatcher.matches('user:write', '*:read')).toBe(false);
    });

    it('should match wildcard in middle (user:*:delete)', () => {
      expect(WildcardMatcher.matches('user:post:delete', 'user:*:delete')).toBe(true);
      expect(WildcardMatcher.matches('user:comment:delete', 'user:*:delete')).toBe(true);
      expect(WildcardMatcher.matches('user:file:delete', 'user:*:delete')).toBe(true);
      expect(WildcardMatcher.matches('admin:post:delete', 'user:*:delete')).toBe(false);
      expect(WildcardMatcher.matches('user:post:read', 'user:*:delete')).toBe(false);
    });

    it('should match multiple wildcards (*:*:delete)', () => {
      expect(WildcardMatcher.matches('user:post:delete', '*:*:delete')).toBe(true);
      expect(WildcardMatcher.matches('admin:comment:delete', '*:*:delete')).toBe(true);
      expect(WildcardMatcher.matches('editor:file:delete', '*:*:delete')).toBe(true);
    });

    it('should match single wildcard (*)', () => {
      expect(WildcardMatcher.matches('user:read', '*')).toBe(true);
      expect(WildcardMatcher.matches('admin:write:post', '*')).toBe(true);
      expect(WildcardMatcher.matches('anything', '*')).toBe(true);
    });

    it('should handle complex patterns', () => {
      expect(WildcardMatcher.matches('api:v1:users:read', 'api:*:users:*')).toBe(true);
      expect(WildcardMatcher.matches('api:v2:users:write', 'api:*:users:*')).toBe(true);
      expect(WildcardMatcher.matches('api:v1:posts:read', 'api:*:users:*')).toBe(false);
    });
  });

  describe('matchesAny', () => {
    it('should match if any pattern matches', () => {
      const patterns = ['user:read', 'admin:*', 'editor:write'];

      expect(WildcardMatcher.matchesAny('user:read', patterns)).toBe(true);
      expect(WildcardMatcher.matchesAny('admin:anything', patterns)).toBe(true);
      expect(WildcardMatcher.matchesAny('editor:write', patterns)).toBe(true);
      expect(WildcardMatcher.matchesAny('guest:read', patterns)).toBe(false);
    });
  });

  describe('filterByPattern', () => {
    it('should filter permissions by pattern', () => {
      const permissions = [
        'user:read',
        'user:write',
        'admin:read',
        'admin:write',
        'admin:delete',
      ];

      const adminPerms = WildcardMatcher.filterByPattern(permissions, 'admin:*');
      expect(adminPerms).toEqual(['admin:read', 'admin:write', 'admin:delete']);

      const readPerms = WildcardMatcher.filterByPattern(permissions, '*:read');
      expect(readPerms).toEqual(['user:read', 'admin:read']);
    });
  });

  describe('expandPatterns', () => {
    it('should expand wildcard patterns to actual permissions', () => {
      const availablePermissions = [
        'user:read',
        'user:write',
        'admin:read',
        'admin:write',
        'admin:delete',
      ];

      const patterns = ['user:read', 'admin:*'];
      const expanded = WildcardMatcher.expandPatterns(patterns, availablePermissions);

      expect(expanded).toContain('user:read');
      expect(expanded).toContain('admin:read');
      expect(expanded).toContain('admin:write');
      expect(expanded).toContain('admin:delete');
      expect(expanded).not.toContain('user:write');
    });

    it('should handle exact permissions without expansion', () => {
      const availablePermissions = ['user:read', 'user:write'];
      const patterns = ['user:read', 'user:write'];
      const expanded = WildcardMatcher.expandPatterns(patterns, availablePermissions);

      expect(expanded).toEqual(['user:read', 'user:write']);
    });

    it('should deduplicate expanded permissions', () => {
      const availablePermissions = ['user:read', 'admin:read'];
      const patterns = ['*:read', 'user:*'];
      const expanded = WildcardMatcher.expandPatterns(patterns, availablePermissions);

      expect(expanded.filter(p => p === 'user:read')).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patterns', () => {
      expect(WildcardMatcher.matches('user:read', '')).toBe(false);
    });

    it('should handle empty permission', () => {
      expect(WildcardMatcher.matches('', 'user:*')).toBe(false);
    });

    it('should escape regex special characters', () => {
      expect(WildcardMatcher.matches('user.read', 'user.read')).toBe(true);
      expect(WildcardMatcher.matches('user+read', 'user+read')).toBe(true);
      expect(WildcardMatcher.matches('user[read]', 'user[read]')).toBe(true);
    });
  });
});
