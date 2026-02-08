# Performance Optimization

Guide to optimizing Fire Shield RBAC for maximum performance.

## Performance Overview

Fire Shield is designed for high performance:
- **O(1)** bit-based permission checks
- **O(n)** string-based permission checks
- Built-in caching
- Minimal memory footprint
- Zero dependencies

## Bit-Based vs String-Based

### Bit-Based (Recommended)

Ultra-fast permission checks using bitwise operations:

```typescript
const rbac = new RBAC({ useBitSystem: true }); // Default

// O(1) permission check
rbac.hasPermission(user, 'post:read'); // ~0.001ms
```

**Pros:**
- Extremely fast (bitwise AND operation)
- Low memory usage
- Built-in caching

**Cons:**
- Maximum 31 permissions
- Requires bit assignment

### String-Based

Flexible but slower permission checks:

```typescript
const rbac = new RBAC({ useBitSystem: false });

// O(n) permission check
rbac.hasPermission(user, 'post:read'); // ~0.1ms
```

**Pros:**
- Unlimited permissions
- No bit management
- More flexible

**Cons:**
- Slower than bit-based
- Higher memory usage

## Benchmarks

### Permission Check Performance

```typescript
// Bit-based system
// 1,000,000 checks: ~100ms (0.0001ms per check)

// String-based system
// 1,000,000 checks: ~1000ms (0.001ms per check)

// 10x faster with bit-based
```

### Memory Usage

```typescript
// 10 roles, 20 permissions
// Bit-based: ~2KB
// String-based: ~5KB

// 100 roles, 200 permissions
// Bit-based: ~20KB
// String-based: ~150KB
```

## Optimization Techniques

### 1. Use Bit-Based System

```typescript
// ✅ Good: Fast bit-based checks
const rbac = new RBAC({ useBitSystem: true });

rbac.registerPermission('user:read', 1);
rbac.registerPermission('user:write', 2);
rbac.registerPermission('user:delete', 4);

// Lightning fast
rbac.hasPermission(user, 'user:read');
```

### 2. Pre-compute Permission Masks

```typescript
// ✅ Good: Pre-compute and store mask
const user = {
  id: 'user-1',
  roles: ['editor'],
  permissionMask: rbac.createPermissionMask(['post:read', 'post:write'])
};

// Fast permission check using mask
rbac.hasPermission(user, 'post:read');

// ❌ Avoid: Computing on every request
const user = {
  id: 'user-1',
  roles: ['editor']
  // No mask - computed every time
};
```

### 3. Cache User Permissions

```typescript
// ✅ Good: Cache permissions per session
class UserCache {
  private cache = new Map<string, RBACUser>();

  getUser(userId: string): RBACUser | undefined {
    return this.cache.get(userId);
  }

  setUser(userId: string, user: RBACUser) {
    this.cache.set(userId, {
      ...user,
      permissionMask: rbac.getUserPermissionMask(user)
    });
  }

  clearUser(userId: string) {
    this.cache.delete(userId);
  }
}

const cache = new UserCache();

// Cache on login
cache.setUser(user.id, user);

// Fast lookups
const cachedUser = cache.getUser(user.id);
rbac.hasPermission(cachedUser, 'post:read');
```

### 4. Batch Permission Checks

```typescript
// ✅ Good: Single check for multiple permissions
const permissions = ['post:read', 'post:write', 'post:delete'];
const hasAll = rbac.hasAllPermissions(user, permissions);

// ❌ Avoid: Multiple individual checks
const canRead = rbac.hasPermission(user, 'post:read');
const canWrite = rbac.hasPermission(user, 'post:write');
const canDelete = rbac.hasPermission(user, 'post:delete');
```

### 5. Minimize Wildcard Usage

```typescript
// ✅ Good: Specific permissions for frequent checks
rbac.createRole('editor', ['post:read', 'post:write', 'post:publish']);

// ❌ Avoid: Wildcards for frequently checked permissions
rbac.createRole('editor', ['post:*']); // Slower pattern matching
```

### 6. Optimize Role Hierarchy

```typescript
// ✅ Good: Shallow hierarchy (2-3 levels)
rbac.getRoleHierarchy().setRoleLevel('admin', 10);
rbac.getRoleHierarchy().setRoleLevel('editor', 5);
rbac.getRoleHierarchy().setRoleLevel('user', 1);

// ❌ Avoid: Deep hierarchy (many levels)
// Each level adds overhead
```

## Caching Strategies

### Session-Based Caching

```typescript
class SessionCache {
  private sessions = new Map<string, {
    user: RBACUser;
    permissions: Set<string>;
    expires: number;
  }>();

  set(sessionId: string, user: RBACUser, ttl: number = 3600000) {
    this.sessions.set(sessionId, {
      user,
      permissions: new Set(rbac.getUserPermissions(user)),
      expires: Date.now() + ttl
    });
  }

  get(sessionId: string): RBACUser | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (Date.now() > session.expires) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.user;
  }

  hasPermission(sessionId: string, permission: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.permissions.has(permission) || false;
  }
}
```

### LRU Cache

```typescript
class LRUPermissionCache {
  private cache: Map<string, boolean>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  check(userId: string, permission: string): boolean | undefined {
    const key = `${userId}:${permission}`;
    const cached = this.cache.get(key);

    if (cached !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, cached);
    }

    return cached;
  }

  set(userId: string, permission: string, allowed: boolean) {
    const key = `${userId}:${permission}`;

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, allowed);
  }
}

const cache = new LRUPermissionCache(1000);

// Check cache first
const userId = 'user-1';
const permission = 'post:read';
let allowed = cache.check(userId, permission);

if (allowed === undefined) {
  // Not in cache, check RBAC
  allowed = rbac.hasPermission(user, permission);
  cache.set(userId, permission, allowed);
}
```

## Database Optimization

### Store Permission Masks

```typescript
// Store pre-computed permission mask in database
interface UserDocument {
  id: string;
  email: string;
  roles: string[];
  permissionMask: number; // Store computed mask
  updatedAt: Date;
}

// On user update, recompute mask
async function updateUserRoles(userId: string, roles: string[]) {
  const mask = rbac.createPermissionMask(
    roles.flatMap(role => rbac.getRolePermissions(role))
  );

  await db.users.updateOne(
    { id: userId },
    {
      $set: {
        roles,
        permissionMask: mask,
        updatedAt: new Date()
      }
    }
  );
}

// Fast permission checks
const user = await db.users.findOne({ id: userId });
rbac.hasPermission(user, 'post:read'); // Uses cached mask
```

### Index Audit Logs

```typescript
// Create indexes for fast queries
await db.auditLogs.createIndex({ userId: 1, timestamp: -1 });
await db.auditLogs.createIndex({ permission: 1, allowed: 1 });
await db.auditLogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
```

## Load Testing

### Basic Load Test

```typescript
import { performance } from 'perf_hooks';

function loadTest(iterations: number = 1000000) {
  const rbac = new RBAC({ useBitSystem: true });

  rbac.registerPermission('test:read', 1);
  rbac.createRole('tester', ['test:read']);

  const user = { id: 'test-1', roles: ['tester'] };

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    rbac.hasPermission(user, 'test:read');
  }

  const end = performance.now();
  const duration = end - start;

  console.log(`${iterations} checks in ${duration.toFixed(2)}ms`);
  console.log(`Average: ${(duration / iterations).toFixed(6)}ms per check`);
}

loadTest(); // 1,000,000 checks in ~100ms
```

### Concurrent Load Test

```typescript
async function concurrentLoadTest(
  users: number = 100,
  checksPerUser: number = 10000
) {
  const rbac = new RBAC({ useBitSystem: true });

  rbac.registerPermission('test:read', 1);
  rbac.createRole('tester', ['test:read']);

  const start = performance.now();

  const promises = Array.from({ length: users }, (_, i) => {
    const user = { id: `user-${i}`, roles: ['tester'] };

    return Promise.resolve().then(() => {
      for (let j = 0; j < checksPerUser; j++) {
        rbac.hasPermission(user, 'test:read');
      }
    });
  });

  await Promise.all(promises);

  const end = performance.now();
  const total = users * checksPerUser;

  console.log(`${total} checks with ${users} users in ${(end - start).toFixed(2)}ms`);
}

concurrentLoadTest(); // 1,000,000 checks in ~150ms
```

## Production Recommendations

### 1. Always Use Bit-Based System

```typescript
// ✅ Production
const rbac = new RBAC({ useBitSystem: true });
```

### 2. Buffer Audit Logging

```typescript
// ✅ Production: Buffered logging
const logger = new BufferedAuditLogger(
  async (events) => await db.insert(events),
  { maxBufferSize: 100, flushIntervalMs: 5000 }
);
```

### 3. Cache User Sessions

```typescript
// ✅ Production: Session cache
const cache = new SessionCache();
cache.set(sessionId, user, 3600000); // 1 hour
```

### 4. Monitor Performance

```typescript
// ✅ Production: Performance monitoring
const start = performance.now();
const result = rbac.hasPermission(user, permission);
const duration = performance.now() - start;

if (duration > 1) {
  console.warn(`Slow permission check: ${duration}ms`);
}
```

### 5. Optimize Database Queries

```typescript
// ✅ Production: Indexed queries
await db.users.createIndex({ id: 1 });
await db.users.createIndex({ 'roles': 1 });
await db.auditLogs.createIndex({ userId: 1, timestamp: -1 });
```

## Common Bottlenecks

### 1. Database Round-Trips

```typescript
// ❌ Slow: Multiple queries
const user = await db.users.findOne({ id: userId });
const roles = await db.roles.find({ name: { $in: user.roles } });

// ✅ Fast: Single query with join
const user = await db.users.findOne({ id: userId })
  .populate('roles');
```

### 2. Synchronous Audit Logging

```typescript
// ❌ Slow: Synchronous logging
const logger = {
  log: (event) => fs.appendFileSync('audit.log', JSON.stringify(event))
};

// ✅ Fast: Async buffered logging
const logger = new BufferedAuditLogger(async (events) => {
  await fs.appendFile('audit.log', events.map(e => JSON.stringify(e)).join('\n'));
});
```

### 3. Wildcard Overuse

```typescript
// ❌ Slow: Many wildcard checks
rbac.createRole('user', ['resource:*']);
rbac.hasPermission(user, 'resource:specific:action'); // Pattern matching

// ✅ Fast: Specific permissions
rbac.createRole('user', ['resource:read', 'resource:write']);
rbac.hasPermission(user, 'resource:read'); // Direct lookup
```

## Next Steps

- Learn about [TypeScript](/guide/typescript)
- Explore [Core API](/api/core)
- Check out [Audit Logging](/guide/audit-logging)
