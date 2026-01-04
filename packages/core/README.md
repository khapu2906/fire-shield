# 🛡️ Fire Shield v3.0.0

A powerful, flexible, and type-safe Role-Based Access Control (RBAC) library for TypeScript/JavaScript applications. Features a high-performance bit-based permission system with dynamic role hierarchies, plugin architecture, and zero storage dependencies.

> **Fire Shield v3.0.0** - Protect your application with lightning-fast permission checks and extensible plugin system ⚡

## ✨ What's New in v3.0.0

### 🧪 Plugin System (NEW!)
- **Extensible Architecture** - Create custom plugins to extend RBAC functionality
- **Built-in Hooks** - React to permission checks, role additions, permission registration
- **Plugin Examples** - Database loader, audit logger plugins, custom validators
- **Async Plugin Lifecycle** - Safe plugin management without breaking core operations

### 🚫 Breaking Changes from v2.x
- **`RBAC.fromFile()`** - **REMOVED** (Use loader packages instead)
- **`RBAC.fromFileSync()`** - **REMOVED** (Use loader packages instead)
- **`RBAC.validateConfig()`** - Still works, API unchanged

### 📦 Migration from v2.x to v3.0.0
**Node.js:**
```typescript
// Before (v2.x)
import { RBAC } from '@fire-shield/core';
const rbac = await RBAC.fromFile('./rbac.config.json');

// After (v3.0.0)
import { NodeLoader } from '@fire-shield/node-loader';
const rbac = await NodeLoader.load('./rbac.config.json');
```

**Browser/SSR:**
```typescript
// Both versions work the same
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(JSON.stringify(json));
```

## ✨ Features

- **⚡ Bit-based Permission System** - Lightning-fast permission checks using bitwise operations
- **🎯 Wildcard Permissions** - Pattern matching for flexible permission management (`admin:*`, `*:read`)
- **📊 Audit Logging** - Comprehensive logging for security, compliance, and debugging
- **🚫 Deny Permissions** - Explicit permission denials that override allows
- **🏗️ Dynamic Roles & Permissions** - No hardcoded roles, fully configurable
- **📊 Role Hierarchy** - Level-based hierarchy system for role inheritance
- **💾 State Persistence** - Built-in serialization/deserialization (storage-agnostic)
- **📘 Type-Safe** - Full TypeScript support with comprehensive type definitions
- **⚙️ Zero Dependencies** - Pure logic with no storage coupling
- **🚀 Lazy Role Evaluation** - On-demand role loading for memory efficiency (v2.2.0)
- **💾 Permission Caching** - Smart caching with TTL and automatic cleanup (v2.2.0)
- **🔧 Memory Optimization** - Advanced memory profiling and optimization tools (v2.2.0)
- **🧪 Plugin System** - Extensible architecture for custom logic (v3.0.0)
- **📦 Tree-Shakeable** - Modern ESM build with tree-shaking support. Only import what you need.
- **✅ Well Tested** - 310+ tests with 100% pass rate. Production-ready and reliable.

## 📦 Installation

```bash
npm install @fire-shield/core
# or
yarn add @fire-shield/core
# or
pnpm add @fire-shield/core
```

## 🚀 Quick Start

```typescript
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC();

// Register permissions
rbac.registerPermission('post:read');
rbac.registerPermission('post:write');
rbac.registerPermission('post:delete');

// Create roles with permissions
rbac.createRole('viewer', ['post:read']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('admin', ['post:*']);  // Wildcard - all post permissions

// Check permissions
const editor = { id: 'user-1', roles: ['editor'] };

console.log(rbac.hasPermission(editor, 'post:read'));   // true
console.log(rbac.hasPermission(editor, 'post:write'));  // true
console.log(rbac.hasPermission(editor, 'post:delete'));  // false
```

### Using Plugin System (v3.0.0)

```typescript
import { RBAC, RBACPlugin } from '@fire-shield/core';

// Create custom plugin
class DatabaseLoaderPlugin implements RBACPlugin {
  name = 'database-loader';
  
  onPermissionCheck(event) {
    // Log to database for audit
    console.log(`[AUDIT] User ${event.userId} checked ${event.permission}: ${event.allowed}`);
  }
}

// Register plugin
const rbac = new RBAC();
await rbac.registerPlugin(new DatabaseLoaderPlugin());

// All permission checks now trigger the plugin
rbac.hasPermission(user, 'post:write');
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

### Getting Started
- **[Installation & Quick Start](./docs/GETTING_STARTED.md)** - Setup guide and basic usage
- **[v3.0.0 Migration Guide](./docs/GETTING_STARTED.md)** - How to upgrade from v2.x to v3.0.0

### Core Documentation
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- **[Core Concepts](./docs/CORE_CONCEPTS.md)** - Understanding bit-based permissions, hierarchies, etc.
- **[Advanced Features](./docs/ADVANCED_FEATURES.md)** - Wildcards, Audit Logging, Deny Permissions
- **[Plugin System](./docs/ADVANCED_FEATURES.md)** - How to create and use plugins

### Guides
- **[Best Practices](./docs/BEST_PRACTICES.md)** - Recommended patterns and anti-patterns
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Upgrading from older versions
- **[Examples Guide](./docs/EXAMPLES.md)** - Real-world use cases and patterns

### Reference
- **[TypeScript Types](./docs/TYPES.md)** - Type definitions and interfaces
- **[Performance Guide](./docs/PERFORMANCE.md)** - Optimization tips and benchmarks

## 💡 Key Features

### Wildcard Permissions

```typescript
// Grant all admin permissions
rbac.createRole('admin', ['admin:*']);

// Grant all read permissions
rbac.createRole('reader', ['*:read']);

// Super admin
rbac.createRole('super-admin', ['*']);
```

### Audit Logging

```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});

// All permission checks are automatically logged
rbac.hasPermission(user, 'admin:delete');
// [AUDIT] ✗ DENIED: User user-123 - admin:delete
//   Reason: User lacks permission: admin:delete
```

### Deny Permissions

```typescript
// Admin has all permissions
rbac.createRole('admin', ['*']);
const admin = { id: 'admin-1', roles: ['admin'] };

// Deny specific permission
rbac.denyPermission('admin-1', 'system:delete');

rbac.hasPermission(admin, 'user:read');     // true
rbac.hasPermission(admin, 'system:delete'); // false (denied!)
```

### Role Hierarchy

```typescript
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('moderator', 5);
hierarchy.setRoleLevel('admin', 10);

// Check if admin can act as moderator
rbac.canActAsRole('admin', 'moderator'); // true
rbac.canActAsRole('moderator', 'admin'); // false
```

### 🆕 Lazy Role Evaluation (v2.2.0)

```typescript
// Enable lazy role loading for large applications
const rbac = new RBAC({
  lazyRoles: true,
  preset: largeConfigWithThousandsOfRoles
});

// Roles are loaded on-demand only when needed
const stats = rbac.getLazyRoleStats();
console.log(stats);
// { enabled: true, pending: 1000, evaluated: 5, total: 1005 }

// Force evaluation of all pending roles if needed
rbac.evaluateAllRoles();

// Check if a role is still pending
rbac.isRolePending('rarely-used-role'); // true/false

// Get list of pending roles
const pendingRoles = rbac.getPendingRoles();
```

### 🆕 Permission Caching (v2.2.0)

```typescript
// Enable smart caching with TTL
const rbac = new RBAC({
  enableCache: true,
  cacheTTL: 60000,  // 60 seconds
  cacheCleanupInterval: 300000 // 5 minutes
});

// Permission checks are automatically cached
rbac.hasPermission(user, 'post:read'); // Cache miss - computed
rbac.hasPermission(user, 'post:read'); // Cache hit - instant!

// Get cache statistics
const cacheStats = rbac.getCacheStats();
console.log(cacheStats);
// { hits: 1250, misses: 50, size: 100, hitRate: 96.15 }

// Clear cache when roles/permissions change
rbac.clearPermissionCache();
```

### 🆕 Memory Optimization (v2.2.0)

```typescript
// Enable memory profiling
const rbac = new RBAC({
  optimizeMemory: true
});

// Get memory usage statistics
const memoryStats = rbac.getMemoryStats();
console.log(memoryStats);
// {
//   totalMemory: 1024000,
//   usedMemory: 512000,
//   roles: 100,
//   permissions: 500,
//   estimatedBytes: 102400
// }

// Memory optimizer automatically:
// - Deduplicates permission strings
// - Optimizes role storage
// - Manages cache size
```

### 🧪 Plugin System (v3.0.0)

```typescript
import { RBAC, RBACPlugin } from '@fire-shield/core';

// Create a custom plugin
class AuditDatabasePlugin implements RBACPlugin {
  name = 'audit-database';
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  onPermissionCheck(event) {
    // Log all permission checks to database
    this.db.insert({
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      timestamp: event.timestamp,
      reason: event.reason
    });
  }

  onRoleAdded(roleName: string, permissions: string[]) {
    // Track role changes
    this.db.insert({
      type: 'role_added',
      roleName,
      permissions,
      timestamp: Date.now()
    });
  }

  onPermissionRegistered(permissionName: string, bit: number) {
    // Track permission registrations
    this.db.insert({
      type: 'permission_registered',
      permissionName,
      bit,
      timestamp: Date.now()
    });
  }
}

// Register the plugin
const rbac = new RBAC();
await rbac.registerPlugin(new AuditDatabasePlugin(myDatabase));

// Now all RBAC operations are automatically logged to database
```

## 📖 Examples

### Blog Application

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();

rbac.registerPermission('post:read');
rbac.registerPermission('post:write');
rbac.registerPermission('post:publish');

rbac.createRole('author', ['post:read', 'post:write']);
rbac.createRole('editor', ['post:read', 'post:write', 'post:publish']);

const author = { id: 'user-1', roles: ['author'] };
rbac.hasPermission(author, 'post:write');   // true
rbac.hasPermission(author, 'post:publish'); // false
```

### E-commerce Platform

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .addPermission('product:view', 1)
  .addPermission('product:create', 2)
  .addPermission('order:process', 4)
  .addRole('customer', ['product:view'], { level: 1 })
  .addRole('vendor', ['product:view', 'product:create'], { level: 5 })
  .addRole('admin', ['*'], { level: 100 })
  .build();
```

### Multi-Tenant SaaS

```typescript
const rbac = new RBAC({ enableWildcards: true });

// Tenant-specific permissions
rbac.createRole('tenant-owner', ['tenant:*']);
rbac.createRole('tenant-admin', ['tenant:users:*', 'tenant:data:*']);

const user = {
  id: 'user-1',
  roles: [],
  permissions: ['tenant:123:*'] // Full access to tenant 123
};

rbac.hasPermission(user, 'tenant:123:users:read'); // true
rbac.hasPermission(user, 'tenant:456:users:read'); // false
```

**More examples:** See [`examples/`](./examples/) folder and [Examples Guide](./docs/EXAMPLES.md)

## 📖 Plugin Examples

### Database Loader Plugin

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class DatabaseLoaderPlugin implements RBACPlugin {
  name = 'database-loader';
  private pool: any;

  constructor(pool: any) {
    this.pool = pool;
  }

  async onPermissionCheck(event) {
    // Check if user is active in database
    const user = await this.pool.query(
      'SELECT active FROM users WHERE id = ?',
      [event.userId]
    );
    
    if (!user?.active) {
      throw new Error('User account is inactive');
    }
  }

  async onRoleAdded(roleName: string, permissions: string[]) {
    // Sync role to database
    await this.pool.query(
      'INSERT INTO roles (name, permissions) VALUES (?, ?)',
      [roleName, JSON.stringify(permissions)]
    );
  }
}
```

### Analytics Plugin

```typescript
export class AnalyticsPlugin implements RBACPlugin {
  name = 'analytics';
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  onPermissionCheck(event) {
    // Track permission check events
    this.client.track('permission_check', {
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      timestamp: Date.now()
    });
  }
}
```

### Rate Limiting Plugin

```typescript
export class RateLimitPlugin implements RBACPlugin {
  name = 'rate-limiter';
  private limits: Map<string, { count: number; window: number }> = new Map();

  onPermissionCheck(event) {
    const userId = event.userId;
    const key = `${userId}:${event.permission}`;
    const limit = this.limits.get(key) || { count: 0, window: 1000 };
    const now = Date.now();

    // Reset if window expired
    if (now > limit.window) {
      limit.count = 0;
      limit.window = now + 60000; // 1 minute window
    }

    limit.count++;
    
    if (limit.count > 100) {
      throw new Error('Rate limit exceeded for permission check');
    }

    this.limits.set(key, limit);
  }
}
```

## ⚡ Performance

The bit-based permission system is highly optimized:

- **Permission Check**: O(1) - Single bitwise AND operation
- **Throughput**: up to 10 million ops/sec for exact matches
- **Memory**: ~1 MB for 10,000 users with bit-based system

**See:** [Performance Guide](./docs/PERFORMANCE.md) for detailed benchmarks and optimization tips.

## 🔧 API Overview

### Main Classes

- **`RBAC`** - Main class for managing permissions and roles
- **`RBACBuilder`** - Fluent API for building RBAC configurations
- **`BitPermissionManager`** - Low-level bit-based permission management
- **`RoleHierarchy`** - Role hierarchy management
- **`PluginManager`** - Plugin lifecycle management (v3.0.0)
- **`WildcardMatcher`** - Wildcard pattern matching utility

### Audit Loggers

- **`ConsoleAuditLogger`** - Logs to console (development)
- **`BufferedAuditLogger`** - Batches logs for performance (production)
- **`MultiAuditLogger`** - Logs to multiple destinations

### Plugin System (v3.0.0)

- **`RBACPlugin`** - Plugin interface
- **`PluginManager`** - Plugin lifecycle manager
- **Plugin Hooks**:
  - `onPermissionCheck(event)` - Triggered on every permission check
  - `onRoleAdded(roleName, permissions)` - Triggered when role is created
  - `onPermissionRegistered(permissionName, bit)` - Triggered when permission is registered

**Complete API:** [API Reference](./docs/API_REFERENCE.md)

## 📝 TypeScript Types

```typescript
interface RBACUser {
  id: string;
  roles: string[];
  permissions?: string[];
  permissionMask?: number;
}

interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  user?: RBACUser;
}

interface AuditEvent {
  type: 'permission_check' | 'authorization' | 'role_check';
  userId: string;
  permission: string;
  allowed: boolean;
  reason?: string;
  context?: Record<string, any>;
  timestamp: number;
}

// Plugin System (v3.0.0)
interface RBACPlugin {
  name: string;
  
  onPermissionCheck?(event: AuditEvent): Promise<void> | void;
  onRoleAdded?(roleName: string, permissions: string[]): Promise<void> | void;
  onPermissionRegistered?(permissionName: string, bit: number): Promise<void> | void;
}
```

**Complete types:** [TypeScript Types](./docs/TYPES.md)

## 🎯 Use Cases

- **Blog/CMS** - Content management with author, editor, admin roles
- **E-commerce** - Customer, vendor, admin permissions
- **SaaS** - Multi-tenant permission isolation
- **API Gateway** - Endpoint-level access control
- **Healthcare** - HIPAA-compliant audit logging
- **Enterprise** - Complex role hierarchies and workflows

**Real-world examples:** [Examples Guide](./docs/EXAMPLES.md)

## 🔄 Migration Guide

### From v2.x to v3.0.0

#### 1. Node.js Backend
```typescript
// Before (v2.x)
import { RBAC } from '@fire-shield/core';
const rbac = await RBAC.fromFile('./rbac.config.json');

// After (v3.0.0)
import { NodeLoader } from '@fire-shield/node-loader';
const rbac = await NodeLoader.load('./rbac.config.json');
// OR
const rbac = RBAC.fromJSONConfig(fs.readFileSync('./rbac.config.json', 'utf-8'));
```

#### 2. Browser/SSR
```typescript
// Both versions work the same!
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(JSON.stringify(json));
```

#### 3. Breaking Changes

| Change | v2.x | v3.0.0 | Migration Path |
|--------|------|--------|--------------|
| `fromFile()` | Available | **REMOVED** | Use `NodeLoader.load()` or `fromJSONConfig()` |
| `fromFileSync()` | Available | **REMOVED** | Use `NodeLoader.loadSync()` or `fromJSONConfig()` |
| Plugin System | Not available | **NEW** | N/A |
| `onPermissionCheck` | N/A | **NEW** | Implement in plugins |

**Complete migration guide:** [Migration Guide](./docs/MIGRATION_GUIDE.md)

## 🤝 Contributing

Contributions are welcome! Please:

1. Read our contributing guidelines
2. Submit pull requests with tests
3. Follow existing code style

## 📄 License

MIT

## 🔗 Links

- **Documentation:** [`docs/`](./docs/)
- **Examples:** [`examples/`](./examples/)
- **GitHub:** [github.com/khapu2906/fire-shield](https://github.com/khapu2906/fire-shield)
- **Issues:** [github.com/khapu2906/fire-shield/issues](https://github.com/khapu2906/fire-shield/issues)
- **NPM:** [npmjs.com/package/@fire-shield/core](https://npmjs.com/package/@fire-shield/core)

---

**Ready to get started?** → [Quick Start Guide](./docs/GETTING_STARTED.md)
