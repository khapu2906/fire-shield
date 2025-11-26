/**
 * Memory Optimizer for RBAC
 * Reduces memory footprint for large permission sets through string interning and caching
 */

export class MemoryOptimizer {
  // String interning pool for permissions
  private stringPool: Map<string, string> = new Map();

  // Cached permission masks for roles (role name -> bit mask)
  private roleMaskCache: Map<string, number> = new Map();

  // Wildcard pattern cache (pattern -> RegExp)
  private wildcardPatternCache: Map<string, RegExp> = new Map();

  // Statistics
  private stats = {
    stringsInterned: 0,
    cacheHits: 0,
    cacheMisses: 0,
    wildcardPatternsCached: 0
  };

  /**
   * Intern a string to reduce memory duplication
   * Returns the canonical version of the string from the pool
   */
  internString(str: string): string {
    this.stats.stringsInterned++; // Track all intern calls

    const existing = this.stringPool.get(str);
    if (existing) {
      return existing;
    }

    this.stringPool.set(str, str);
    return str;
  }

  /**
   * Intern an array of strings
   */
  internStrings(strings: string[]): string[] {
    return strings.map(s => this.internString(s));
  }

  /**
   * Cache a role's computed permission mask
   */
  cacheRoleMask(roleName: string, mask: number): void {
    this.roleMaskCache.set(roleName, mask);
  }

  /**
   * Get cached role mask
   */
  getRoleMask(roleName: string): number | undefined {
    const mask = this.roleMaskCache.get(roleName);
    if (mask !== undefined) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
    return mask;
  }

  /**
   * Invalidate cached role mask
   */
  invalidateRoleMask(roleName: string): void {
    this.roleMaskCache.delete(roleName);
  }

  /**
   * Cache a compiled wildcard pattern
   */
  cacheWildcardPattern(pattern: string, regex: RegExp): void {
    this.wildcardPatternCache.set(pattern, regex);
    this.stats.wildcardPatternsCached++;
  }

  /**
   * Get cached wildcard pattern
   */
  getWildcardPattern(pattern: string): RegExp | undefined {
    return this.wildcardPatternCache.get(pattern);
  }

  /**
   * Get memory optimization statistics
   */
  getStats() {
    return {
      ...this.stats,
      stringPoolSize: this.stringPool.size,
      roleMaskCacheSize: this.roleMaskCache.size,
      wildcardPatternCacheSize: this.wildcardPatternCache.size,
      estimatedMemorySaved: this.estimateMemorySaved()
    };
  }

  /**
   * Estimate memory saved by string interning
   * Rough estimate: each duplicate string reference saves ~8 bytes (pointer) + string data
   */
  private estimateMemorySaved(): number {
    // Number of duplicate string creations avoided
    const duplications = Math.max(0, this.stats.stringsInterned - this.stringPool.size);

    if (duplications === 0) {
      return 0;
    }

    // Calculate average string length in pool
    let totalLength = 0;
    for (const str of this.stringPool.keys()) {
      totalLength += str.length * 2; // UTF-16 encoding
    }

    const avgLength = this.stringPool.size > 0 ? totalLength / this.stringPool.size : 0;

    // Each avoided duplication saves: 8 bytes (pointer) + average string data
    return Math.floor(duplications * (8 + avgLength));
  }

  /**
   * Clear all caches to free memory
   */
  clear(): void {
    this.stringPool.clear();
    this.roleMaskCache.clear();
    this.wildcardPatternCache.clear();
    this.stats = {
      stringsInterned: 0,
      cacheHits: 0,
      cacheMisses: 0,
      wildcardPatternsCached: 0
    };
  }

  /**
   * Compact string pool by removing unused entries
   * This should be called periodically in long-running applications
   */
  compactStringPool(activeStrings: Set<string>): number {
    let removed = 0;
    for (const str of this.stringPool.keys()) {
      if (!activeStrings.has(str)) {
        this.stringPool.delete(str);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get cache efficiency ratio
   */
  getCacheEfficiency(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return total > 0 ? this.stats.cacheHits / total : 0;
  }
}
