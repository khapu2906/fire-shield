# 🛡️ Fire Shield

A powerful, flexible, and type-safe Role-Based Access Control (RBAC) library for TypeScript/JavaScript applications. Features a high-performance bit-based permission system with dynamic role hierarchies and zero storage dependencies.

> **Fire Shield** - Protect your application with lightning-fast permission checks ⚡

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
- **✅ Comprehensive Testing** - 176+ tests with 100% pass rate

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
console.log(rbac.hasPermission(editor, 'post:delete')); // false
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

### Getting Started
- **[Installation & Quick Start](./docs/GETTING_STARTED.md)** - Setup guide and basic usage

### Core Documentation
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- **[Core Concepts](./docs/CORE_CONCEPTS.md)** - Understanding bit-based permissions, hierarchies, etc.
- **[Advanced Features](./docs/ADVANCED_FEATURES.md)** - Wildcards, Audit Logging, Deny Permissions

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

## ⚡ Performance

The bit-based permission system is highly optimized:

- **Permission Check**: O(1) - Single bitwise AND operation
- **Throughput**: 125M ops/sec for exact matches
- **Memory**: ~1 MB for 10,000 users with bit-based system

**See:** [Performance Guide](./docs/PERFORMANCE.md) for detailed benchmarks and optimization tips.

## 🔧 API Overview

### Main Classes

- **`RBAC`** - Main class for managing permissions and roles
- **`RBACBuilder`** - Fluent API for building RBAC configurations
- **`BitPermissionManager`** - Low-level bit-based permission management
- **`RoleHierarchy`** - Role hierarchy management
- **`WildcardMatcher`** - Wildcard pattern matching utility

### Audit Loggers

- **`ConsoleAuditLogger`** - Logs to console (development)
- **`BufferedAuditLogger`** - Batches logs for performance (production)
- **`MultiAuditLogger`** - Logs to multiple destinations

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

## 🔄 Migration

Upgrading to v2.0? Check out our [Migration Guide](./docs/MIGRATION_GUIDE.md).

**Zero breaking changes!** All existing code continues to work.

## 🤝 Contributing

Contributions are welcome! Please:

1. Read our contributing guidelines
2. Submit pull requests with tests
3. Follow existing code style

## 📄 License

DIB

## 🔗 Links

- **Documentation:** [`docs/`](./docs/)
- **Examples:** [`examples/`](./examples/)
- **GitHub:** [github.com/khapu9206/fire-shield](https://github.com/khapu9206/fire-shield)
- **Issues:** [github.com/khapu9206/fire-shield/issues](https://github.com/khapu9206/fire-shield/issues)
- **NPM:** [npmjs.com/package/@fire-shield/core](https://npmjs.com/package/@fire-shield/core)

---

**Ready to get started?** → [Quick Start Guide](./docs/GETTING_STARTED.md)
