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

[**Full Documentation →**](./packages/core/README.md)

---

## ✨ Why Fire Shield?

### ⚡ Fastest RBAC Library

| Library | Performance | Downloads/month | Stars |
|---------|-------------|----------------|-------|
| **Fire Shield** | **125M ops/sec** 🏆 | - | - |


**Fire Shield is 15-260x faster than alternatives!**  
*Performance benchmarks conducted on Node.js 20, Intel i7-9750H, 2025. [Source: Internal testing](https://github.com/khapu2906/fire-shield/tree/main/packages/core#performance)*

### 📦 Smallest Bundle

```
Fire Shield:    ~15 KB ✅
acl:            ~35 KB
AccessControl: ~180 KB
CASL:          ~350 KB
Casbin:        ~600 KB+ ❌
```

### ✨ Most Features

- ✅ **Wildcard Permissions** - `admin:*`, `*:read`, `tenant:123:*`
- ✅ **Audit Logging** - Built-in compliance & security logging
- ✅ **Deny Permissions** - Explicit denials override allows
- ✅ **Role Hierarchy** - Level-based role inheritance
- ✅ **Strict Mode** - Configurable error handling for invalid operations
- ✅ **Zero Dependencies** - No supply chain risks
- ✅ **TypeScript First** - 100% type-safe
- ✅ **Framework Agnostic** - Works everywhere

---

## 📦 Packages

This is a monorepo containing:

| Package | Description | Version |
|---------|-------------|---------|
| **[@fire-shield/core](./packages/core)** | Core RBAC library | [![npm](https://img.shields.io/npm/v/@fire-shield/core)](https://www.npmjs.com/package/@fire-shield/core) |
| **[@fire-shield/express](./packages/adaptor/express)** | Express.js middleware | [![npm](https://img.shields.io/npm/v/@fire-shield/express)](https://www.npmjs.com/package/@fire-shield/express) |
| **[@fire-shield/react](./packages/adaptor/react)** | React hooks & components | [![npm](https://img.shields.io/npm/v/@fire-shield/react)](https://www.npmjs.com/package/@fire-shield/react) |
| **[@fire-shield/vue](./packages/adaptor/vue)** | Vue.js composables & components | [![npm](https://img.shields.io/npm/v/@fire-shield/vue)](https://www.npmjs.com/package/@fire-shield/vue) |
| **[@fire-shield/angular](./packages/adaptor/angular)** | Angular guards & directives | [![npm](https://img.shields.io/npm/v/@fire-shield/angular)](https://www.npmjs.com/package/@fire-shield/angular) |
| **[@fire-shield/next](./packages/adaptor/next)** | Next.js middleware | [![npm](https://img.shields.io/npm/v/@fire-shield/next)](https://www.npmjs.com/package/@fire-shield/next) |
| **[@fire-shield/nuxt](./packages/adaptor/nuxt)** | Nuxt.js module | [![npm](https://img.shields.io/npm/v/@fire-shield/nuxt)](https://www.npmjs.com/package/@fire-shield/nuxt) |
| **[@fire-shield/svelte](./packages/adaptor/svelte)** | Svelte stores & actions | [![npm](https://img.shields.io/npm/v/@fire-shield/svelte)](https://www.npmjs.com/package/@fire-shield/svelte) |
| **[@fire-shield/fastify](./packages/adaptor/fastify)** | Fastify plugin | [![npm](https://img.shields.io/npm/v/@fire-shield/fastify)](https://www.npmjs.com/package/@fire-shield/fastify) |
| **[@fire-shield/hono](./packages/adaptor/hono)** | Hono middleware | [![npm](https://img.shields.io/npm/v/@fire-shield/hono)](https://www.npmjs.com/package/@fire-shield/hono) |

---

## 🔧 Framework Adaptors

Fire Shield provides ready-to-use adaptors for popular frameworks:

### Express.js
```typescript
import { RBAC } from '@fire-shield/core';
import { rbacMiddleware } from '@fire-shield/express';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*']);

app.use(rbacMiddleware(rbac));
```

### React
```typescript
import { RBACProvider, usePermission } from '@fire-shield/react';

function MyComponent() {
  const canEdit = usePermission('user:edit');

  return canEdit ? <EditButton /> : null;
}
```

### Vue.js
```typescript
import { createRBAC } from '@fire-shield/vue';

const { rbac, usePermission } = createRBAC();
```

### Angular
```typescript
import { CanActivate } from '@fire-shield/angular';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private rbac: RBACService) {}

  canActivate(): boolean {
    return this.rbac.hasPermission('admin:access');
  }
}
```

### Next.js
```typescript
import { withRBAC } from '@fire-shield/next';

export default withRBAC(MyPage, { requiredPermission: 'page:view' });
```

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

- **[Getting Started](./packages/core/docs/GETTING_STARTED.md)** - Installation & quick start
- **[API Reference](./packages/core/docs/API_REFERENCE.md)** - Complete API documentation
- **[Core Concepts](./packages/core/docs/CORE_CONCEPTS.md)** - Understanding Fire Shield
- **[Advanced Features](./packages/core/docs/ADVANCED_FEATURES.md)** - Wildcards, Audit, Deny
- **[Best Practices](./packages/core/docs/BEST_PRACTICES.md)** - Recommended patterns
- **[Examples](./packages/core/docs/EXAMPLES.md)** - Real-world use cases
- **[Performance Guide](./packages/core/docs/PERFORMANCE.md)** - Optimization tips
- **[Migration Guide](./packages/core/docs/MIGRATION_GUIDE.md)** - Upgrading guide
- **[Comparison](./packages/core/docs/COMPARISON.md)** - vs other RBAC libraries

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

[**More Examples →**](./packages/core/docs/EXAMPLES.md)

---

### 🚀 Live Demos

Try Fire Shield in action:

- **[React Demo](https://fire-shield-example-react.vercel.app/)** - Interactive RBAC demo with React
- **[Vue Demo](https://fire-shield-example-vue.vercel.app/)** - Interactive RBAC demo with Vue.js

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

| Feature | Fire Shield | Casbin | CASL | AccessControl | acl |
|---------|------------|--------|------|---------------|-----|
| **Performance** | 125M ops/sec ⚡ | 476K | 2M | 1M | 769K |
| **Bundle Size** | ~25KB | ~600KB+ | ~350KB | ~180KB | ~35KB |
| **Downloads/month** | - | 264K | 2.5M | 266K | 16.5K |
| **Stars** | - | 2.8K | 6.7K | 2.3K | 2.6K |
| **Wildcards** | ✅ Yes | ✅ Yes (regex) | 🟡 Partial | ✅ Yes | ❌ No |
| **Audit Logging** | ✅ Built-in | 🟡 Plugin | ❌ No | ❌ No | ❌ No |
| **Deny Permissions** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **TypeScript** | ✅ Native | ✅ Full | ✅ Full | 🟡 Partial | 🟡 Partial |
| **Dependencies** | 0 ✅ | ~5 | 1 | 0 | Few |
| **Maintained** | ✅ Active | ✅ Active | ✅ Active | 🟡 Low Activity | 🟡 Old/Little Maintenance |

[**Detailed Comparison →**](./packages/core/docs/COMPARISON.md)

---

## ❓ FAQ

### What makes Fire Shield different from other RBAC libraries?

Fire Shield stands out with its **BitMark**, delivering about one hundred million permission checks per second - up to 260x faster than competitors. Unlike traditional RBAC systems that use string matching or regex, Fire Shield uses bitwise operations for O(1) performance, making it ideal for high-traffic applications.

### How does Fire Shield handle multi-tenant permissions?

Fire Shield's wildcard system enables seamless multi-tenancy: `tenant:123:*` grants full access to tenant 123, while `*:read` allows reading across all tenants. This pattern is used by leading SaaS companies for tenant isolation.

### Is Fire Shield production-ready?

Yes, Fire Shield powers production applications with millions of users. It includes built-in audit logging for compliance, deny permissions for security overrides, and comprehensive TypeScript support for type safety.

### Can I migrate from CASL or AccessControl to Fire Shield?

Absolutely. Fire Shield provides migration guides and maintains API compatibility where possible. The performance gains often justify the migration effort.

### What about bundle size and dependencies?

Fire Shield has zero dependencies and a ~25KB bundle - the smallest among feature-rich RBAC libraries. This minimizes supply chain risks and improves load times.

---

## 💬 What Developers Say

> "Fire Shield's about one hundred million ops/sec performance transformed our API response times. The wildcard system made multi-tenancy implementation trivial."  
> — *Denis Dang, Lecture at Swinburne university of technology*

> "As a security-focused developer, I love the built-in audit logging and deny permissions. Fire Shield gives us enterprise-grade RBAC without the complexity."  
> — *Cam Nguyen, Lecture at Posts and Telecommunications Institute of Technology, Techniacal Leader at VCCorp*

> "Migrating from CASL saved us 200ms per request. The TypeScript integration is flawless."  
> — *Matthew Pham, Techniacal Leader at CMC Global*

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

## ☕ Support the Project

If you find Fire Shield useful, consider supporting its development:

[Support for us](https://buymeacoffee.com/kentphung92)

Your support helps maintain and improve Fire Shield! 🙏

---

## 🔗 Links

- **NPM:** [@fire-shield/core](https://www.npmjs.com/package/@fire-shield/core)
- **GitHub:** [github.com/khapu2906/fire-shield](https://github.com/khapu2906/fire-shield)
- **Documentation:** [Full Docs](./packages/core/README.md)
- **Issues:** [Report a bug](https://github.com/khapu2906/fire-shield/issues)

---

<p align="center">
  <strong>🛡️ Protect your application with Fire Shield ⚡</strong>
  <br>
  <sub>The fastest, most feature-rich RBAC library for TypeScript/JavaScript</sub>
</p>
