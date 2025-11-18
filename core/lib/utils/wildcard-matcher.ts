/**
 * Wildcard Permission Matcher
 *
 * Supports patterns like:
 * - "admin:*" - matches all admin permissions
 * - "user:*:delete" - matches user:post:delete, user:comment:delete, etc.
 * - "*:read" - matches all read permissions
 */

export class WildcardMatcher {
  /**
   * Check if permission matches pattern (with wildcard support)
   */
  static matches(permission: string, pattern: string): boolean {
    // Exact match
    if (permission === pattern) {
      return true;
    }

    // No wildcard in pattern
    if (!pattern.includes('*')) {
      return false;
    }

    // Convert pattern to regex
    const regexPattern = this.patternToRegex(pattern);
    return regexPattern.test(permission);
  }

  /**
   * Convert wildcard pattern to regex
   */
  private static patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');

    return new RegExp(`^${escaped}$`);
  }

  /**
   * Check if permission matches any of the patterns
   */
  static matchesAny(permission: string, patterns: string[]): boolean {
    return patterns.some(pattern => this.matches(permission, pattern));
  }

  /**
   * Get all permissions that match a wildcard pattern
   */
  static filterByPattern(permissions: string[], pattern: string): string[] {
    return permissions.filter(perm => this.matches(perm, pattern));
  }

  /**
   * Expand wildcard patterns to actual permissions
   */
  static expandPatterns(patterns: string[], availablePermissions: string[]): string[] {
    const expanded = new Set<string>();

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Wildcard pattern - expand it
        const matching = this.filterByPattern(availablePermissions, pattern);
        matching.forEach(p => expanded.add(p));
      } else {
        // Exact permission
        expanded.add(pattern);
      }
    }

    return Array.from(expanded);
  }
}
