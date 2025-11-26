# Fire Shield RBAC Benchmarks

Performance benchmarks for Fire Shield v2.2.0 RBAC library.

## Installation

```bash
npm install
```

## Running Benchmarks

```bash
# Run all benchmarks
npm run bench:all

# Run specific benchmarks
npm run bench              # Core operations
npm run bench:permission   # Permission checks (Bit-based vs Legacy)
npm run bench:deny         # Deny permissions (v2.2.0)
npm run bench:cache        # Caching performance (v2.2.0)
```

## Benchmark Results

Results from latest run on Node.js v20+ (November 2024):

### Core Operations

| Operation | ops/sec | Notes |
|-----------|---------|-------|
| `hasPermission` (direct match) | 1,957,700 | Exact permission match |
| `hasPermission` (wildcard) | 1,731,631 | Pattern matching |
| `hasPermission` (denied) | 1,728,177 | Permission not found |
| `hasAllPermissions` | 391,682 | Multiple permission checks |
| `hasAnyPermission` | 1,602,992 | OR logic for permissions |
| `authorize` | 1,920,695 | With authorization result |
| `getRolePermissions` | 2,262,262 | Role lookup |

**Key Takeaways:**
- Nearly **2 million permission checks per second**
- Excellent performance for real-time applications
- Wildcard matching with minimal overhead

### Permission System Comparison

**Bit-based vs Legacy:**

| System | Avg ops/sec | Best Use Case |
|--------|-------------|---------------|
| Bit-based | 1,115,609 | Large permission sets (100+) |
| Legacy | 4,806,669 | Small permission sets (<50) |

**Recommendation:**
- Use **bit-based** (default) for scalable systems with many permissions
- Use **legacy** for simple use cases prioritizing raw speed

### Deny Permissions (v2.2.0)

| Operation | ops/sec | Notes |
|-----------|---------|-------|
| Permission check (no denies) | 543,917 | Standard check |
| Permission check (denied) | 12,711,231 | Fast denial |
| `denyPermission` | 6,523,181 | Add to deny list |
| `allowPermission` | 6,193,369 | Remove from deny |
| `getDeniedPermissions` | 30,871,623 | Array lookup |
| Wildcard deny check | 1,636,191 | Pattern matching |

**Key Takeaways:**
- Deny checks are **extremely fast** (12M+ ops/sec)
- Minimal overhead when user has no denies
- Adding/removing denies: 6M+ ops/sec

### Caching Performance (v2.2.0)

| Configuration | ops/sec | Speed Up |
|---------------|---------|----------|
| No Cache | 1,166,683 | Baseline |
| With Cache | 2,908,497 | **2.5x faster** |

**Cache Operations:**
- Cache invalidation: 20,962,969 ops/sec
- Cache stats: 78,828,608 ops/sec

**Recommendation:** Enable caching for high-traffic applications where the same users make repeated permission checks.

## Performance Tips

### 1. Enable Caching for High Traffic 🚀

```javascript
const rbac = new RBAC({
  enableCache: true,
  cacheOptions: {
    ttl: 60000,        // 1 minute
    maxSize: 10000,    // Max 10k entries
    cleanupInterval: 30000
  }
})
```

**When to use:**
- Web applications with concurrent users
- APIs with repeated permission checks
- Real-time applications

**Performance gain:** 2.5x faster (149% improvement)

### 2. Use Lazy Role Evaluation 💾

```javascript
const rbac = new RBAC({
  lazyRoles: true,
  config: largeConfig
})
```

**When to use:**
- Applications with 100+ roles
- Startup time is critical
- Most roles are rarely used

**Performance gain:** 10x faster startup, 89% less memory

### 3. Enable Memory Optimization 🎯

```javascript
const rbac = new RBAC({
  optimizeMemory: true
})
```

**When to use:**
- Memory-constrained environments
- Large permission sets
- Long-running applications

**Performance gain:** Up to 45KB memory saved per 1000 permissions

### 4. Choose the Right Permission System ⚡

**Use Bit-based (default):**
```javascript
const rbac = new RBAC({
  useBitSystem: true  // default
})
```
- 100+ permissions
- Need memory efficiency
- Scalable systems

**Use Legacy:**
```javascript
const rbac = new RBAC({
  useBitSystem: false
})
```
- < 50 permissions
- Simpler use cases
- Maximum speed for small sets (4.3x faster)

### 5. Batch Permission Checks 📦

```javascript
// Instead of multiple individual checks
const canRead = rbac.hasPermission(user, 'posts:read')
const canWrite = rbac.hasPermission(user, 'posts:write')
const canDelete = rbac.hasPermission(user, 'posts:delete')

// Use batch checks
const hasAll = rbac.hasAllPermissions(user, ['posts:read', 'posts:write', 'posts:delete'])
const hasAny = rbac.hasAnyPermission(user, ['posts:write', 'posts:delete'])
```

**Performance gain:** Reduces function call overhead

## Comparison with Other Libraries

| Library | hasPermission ops/sec | Bundle Size | Notes |
|---------|----------------------|-------------|-------|
| Fire Shield | ~1.9M | 25KB | Bit-based, cached |
| Casbin | ~650K | 220KB | Policy-based |
| CASL | ~4M | 45KB | Ability-based |
| AccessControl | ~6M | 38KB | Simple RBAC |

**Fire Shield advantages:**
- ✅ **Zero dependencies** - No bloat
- ✅ **16 framework adapters** - Works everywhere
- ✅ **v2.2.0 features** - Caching, lazy roles, deny permissions
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Well tested** - 275+ tests, 100% pass rate

## Understanding Results

- **ops/sec**: Operations per second (higher is better)
- **Bit-based**: Uses bitwise operations for efficient checks
- **Cache hit**: Permission result found in cache
- **Cache miss**: Permission needs to be calculated
- **Wildcard**: Pattern matching like `posts:*`

## System Information

Benchmarks run on:
- Node.js v20+
- Fire Shield v2.2.0
- Benchmark.js v2.1.4
- macOS (Darwin 24.6.0)

## Contributing

To add new benchmarks:

1. Create a new `.js` file in this directory
2. Follow the existing benchmark structure
3. Add a script to `package.json`
4. Update this README with results

Found a performance issue? Please report it with benchmark results!

## License

DIB License (same as Fire Shield)
