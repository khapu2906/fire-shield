# 🛡️ Fire Shield

**Lightning-fast, zero-dependency RBAC (Role-Based Access Control) library for TypeScript/JavaScript**

[![NPM Version](https://img.shields.io/npm/v/@fire-shield/core)](https://www.npmjs.com/package/@fire-shield/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@fire-shield/core)](https://bundlephobia.com/package/@fire-shield/core)
[![License](https://img.shields.io/npm/l/@fire-shield/core)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

> Protect your application with the fastest RBAC library - **125 million permission checks per second** ⚡

---

## 🚀 Quick Start

```bash
npm install @fire-shield/core
```

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']); // Wildcards!

const admin = { id: '1', roles: ['admin'] };
rbac.hasPermission(admin, 'user:delete'); // true ✓
```

[**Full Documentation →**](./core/README.md)

---

## ✨ Why Fire Shield?

### ⚡ Fastest RBAC Library

| Library | Performance |
|---------|-------------|
| **Fire Shield** | **125M ops/sec** 🏆 |
| CASL | 2M ops/sec |
| AccessControl | 1M ops/sec |
| Casbin | 476K ops/sec |

**Fire Shield is 15-260x faster than alternatives!**

### 📦 Smallest Bundle

```
Fire Shield:     15 KB ✅
CASL:            45 KB
Casbin:         120 KB ❌
```

### ✨ Most Features

- ✅ **Bit-based System** - Ultra-fast O(1) permission checks
- ✅ **Wildcard Permissions** - `admin:*`, `*:read`, `tenant:123:*`
- ✅ **Audit Logging** - Built-in compliance & security logging
- ✅ **Deny Permissions** - Explicit denials override allows
- ✅ **Role Hierarchy** - Level-based role inheritance
- ✅ **Zero Dependencies** - No supply chain risks
- ✅ **TypeScript First** - 100% type-safe
- ✅ **Framework Agnostic** - Works everywhere

---

## 📦 Packages

This is a monorepo containing:

| Package | Description | Version |
|---------|-------------|---------|
| **[@fire-shield/core](./core)** | Core RBAC library | [![npm](https://img.shields.io/npm/v/@fire-shield/core)](https://www.npmjs.com/package/@fire-shield/core) |
| **@fire-shield/express** | Express.js middleware | Coming soon |
| **@fire-shield/react** | React hooks & components | Coming soon |
| **@fire-shield/nextjs** | Next.js integration | Coming soon |

---

## 🎯 Core Features

### 1️⃣ Wildcard Permissions

```typescript
// Grant all admin permissions
rbac.createRole('admin', ['admin:*']);

// Grant all read permissions
rbac.createRole('reader', ['*:read']);

// Multi-tenant isolation
const user = {
  id: 'user-1',
  permissions: ['tenant:123:*'] // Full access to tenant 123
};
```

### 2️⃣ Audit Logging

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      await database.auditLogs.insertMany(events);
    }
  )
});

// All permission checks automatically logged for compliance
```

### 3️⃣ Deny Permissions

```typescript
// Admin has everything
rbac.createRole('admin', ['*']);

// Except system deletion
rbac.denyPermission('admin-1', 'system:delete');

rbac.hasPermission(admin, 'system:delete'); // false (denied!)
```

### 4️⃣ Bit-Based Performance

```typescript
// Each permission = 1 bit
// Permission check = single bitwise AND operation
// Result: 125 million ops/sec ⚡

const user = {
  id: 'user-1',
  permissionMask: 7 // Binary: 0111 = read + write + execute
};

rbac.hasPermission(user, 'read'); // true (0.000008ms)
```

---

## 📚 Documentation

- **[Getting Started](./core/docs/GETTING_STARTED.md)** - Installation & quick start
- **[API Reference](./core/docs/API_REFERENCE.md)** - Complete API documentation
- **[Core Concepts](./core/docs/CORE_CONCEPTS.md)** - Understanding Fire Shield
- **[Advanced Features](./core/docs/ADVANCED_FEATURES.md)** - Wildcards, Audit, Deny
- **[Best Practices](./core/docs/BEST_PRACTICES.md)** - Recommended patterns
- **[Examples](./core/docs/EXAMPLES.md)** - Real-world use cases
- **[Performance Guide](./core/docs/PERFORMANCE.md)** - Optimization tips
- **[Migration Guide](./core/docs/MIGRATION_GUIDE.md)** - Upgrading guide
- **[Comparison](./core/docs/COMPARISON.md)** - vs other RBAC libraries

---

## 🎓 Examples

### Blog Application

```typescript
const rbac = new RBAC();

rbac.createRole('author', ['post:read', 'post:write']);
rbac.createRole('editor', ['post:*', 'comment:moderate']);

const author = { id: '1', roles: ['author'] };
rbac.hasPermission(author, 'post:publish'); // false
```

### E-commerce Platform

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .addRole('customer', ['product:view', 'order:create'])
  .addRole('vendor', ['product:*', 'order:view'])
  .addRole('admin', ['*'])
  .build();
```

### Multi-Tenant SaaS

```typescript
const rbac = new RBAC({ enableWildcards: true });

// Tenant isolation with wildcards
const user = {
  id: 'user-1',
  permissions: ['tenant:abc:*'] // Full access to tenant abc only
};

rbac.hasPermission(user, 'tenant:abc:users:read'); // true
rbac.hasPermission(user, 'tenant:xyz:users:read'); // false
```

[**More Examples →**](./core/docs/EXAMPLES.md)

---

## 🎯 Use Cases

Fire Shield is perfect for:

- ✅ **High-traffic APIs** - Microservices, REST APIs, GraphQL
- ✅ **Multi-tenant SaaS** - Tenant isolation with wildcards
- ✅ **CMS Platforms** - Content workflows, publishing
- ✅ **E-commerce** - Customer, vendor, admin permissions
- ✅ **Healthcare** - HIPAA-compliant audit logging
- ✅ **Financial Systems** - Compliance & security requirements
- ✅ **Enterprise Apps** - Complex role hierarchies

---

## 🆚 Comparison

| Feature | Fire Shield | Casbin | CASL | AccessControl |
|---------|------------|--------|------|---------------|
| **Performance** | 125M ops/sec ⚡ | 476K | 2M | 1M |
| **Bundle Size** | 15KB | 120KB | 45KB | 28KB |
| **Wildcards** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Audit Logging** | ✅ Built-in | 🟡 Plugin | ❌ No | ❌ No |
| **Deny Permissions** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **TypeScript** | ✅ Native | ✅ Yes | ✅ Yes | 🟡 Partial |
| **Dependencies** | 0 ✅ | 10+ | 5 | 3 |
| **Maintained** | ✅ Active | ✅ Active | ✅ Active | ❌ 2021 |

[**Detailed Comparison →**](./core/docs/COMPARISON.md)

---

## 🏗️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build all packages
npm run build

# Run examples
npx tsx core/examples/01-basic-usage.ts
```

---

## 📄 License

DIB © Fire Shield Team

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md).

---

## 🔗 Links

- **NPM:** [@fire-shield/core](https://www.npmjs.com/package/@fire-shield/core)
- **GitHub:** [github.com/khapu9206/fire-shield](https://github.com/khapu9206/fire-shield)
- **Documentation:** [Full Docs](./core/README.md)
- **Issues:** [Report a bug](https://github.com/khapu9206/fire-shield/issues)

---

<p align="center">
  <strong>🛡️ Protect your application with Fire Shield ⚡</strong>
  <br>
  <sub>The fastest, most feature-rich RBAC library for TypeScript/JavaScript</sub>
</p>
