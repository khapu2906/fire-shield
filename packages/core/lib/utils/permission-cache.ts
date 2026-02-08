/**
 * Permission Cache for optimizing repeated permission checks
 * Uses LRU (Least Recently Used) eviction policy
 */

export interface PermissionCacheOptions {
  /**
   * Maximum number of entries in the cache
   * @default 1000
   */
  maxSize?: number;

  /**
   * Time to live for cache entries in milliseconds
   * @default 60000 (1 minute)
   */
  ttl?: number;

  /**
   * Enable cache statistics tracking
   * @default false
   */
  enableStats?: boolean;
}

export interface CacheEntry {
  result: boolean;
  timestamp: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class PermissionCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private enableStats: boolean;

  // Statistics
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: PermissionCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.ttl = options.ttl ?? 60000; // 1 minute default
    this.enableStats = options.enableStats ?? false;
  }

  /**
   * Generate cache key from user ID and permission
   */
  private generateKey(userId: string, permission: string): string {
    return `${userId}:${permission}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Get cached permission check result
   */
  get(userId: string, permission: string): boolean | undefined {
    const key = this.generateKey(userId, permission);
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.enableStats) this.misses++;
      return undefined;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    if (this.enableStats) this.hits++;
    return entry.result;
  }

  /**
   * Set permission check result in cache
   */
  set(userId: string, permission: string, result: boolean): void {
    const key = this.generateKey(userId, permission);

    // If cache is full, remove oldest entry (first entry in Map)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Invalidate cache entry for specific user and permission
   */
  invalidate(userId: string, permission?: string): void {
    if (permission) {
      const key = this.generateKey(userId, permission);
      this.cache.delete(key);
    } else {
      // Invalidate all entries for user
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Invalidate all cache entries for a specific permission
   */
  invalidatePermission(permission: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${permission}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    if (this.enableStats) {
      this.hits = 0;
      this.misses = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Get current cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      removed++;
    });

    return removed;
  }

  /**
   * Start automatic cleanup interval
   */
  startAutoCleanup(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Get all cache entries (for debugging)
   */
  getEntries(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }
}
