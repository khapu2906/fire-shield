# What is Fire Shield?

Fire Shield is a modern, type-safe RBAC (Role-Based Access Control) library for JavaScript and TypeScript applications.

## Overview

Fire Shield provides a flexible and performant way to manage permissions and roles in your applications. Whether you're building a web app, API, or full-stack application, Fire Shield has you covered with framework-specific adapters for Vue, React, Next.js, Express, and more.

## Key Features

### Type-Safe

Written in TypeScript with comprehensive type definitions. Catch permission errors at compile-time, not runtime.

```typescript
// Full type inference and safety
const rbac = new RBAC()
rbac.createRole('admin', ['posts:*'])
rbac.hasPermission(user, 'posts:write') // Type-checked
```

### Zero Dependencies

The core library has zero dependencies, keeping your bundle size small. Framework adapters only depend on their respective frameworks.

### Framework-Agnostic

Use Fire Shield anywhere JavaScript runs:

- **Frontend**: Vue, React, Next.js, Nuxt, Angular, Svelte
- **Backend**: Express, Fastify, Hono
- **Runtime**: Node.js, Deno, Bun, Edge Runtime

### Blazing Fast

Optimized with:
- Bit-level permission checking
- Efficient role hierarchy resolution
- Minimal memory footprint
- Tree-shakeable code

### Flexible Permission Patterns

Support for wildcard permissions:

```typescript
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.hasPermission(admin, 'posts:write')  // ✅
rbac.hasPermission(admin, 'posts:delete') // ✅
rbac.hasPermission(admin, 'users:create') // ✅
```

### Role Hierarchy

Define role inheritance chains:

```typescript
rbac.setRoleHierarchy({
  admin: ['editor', 'viewer'],
  editor: ['viewer']
})

// Admin automatically inherits editor and viewer permissions
```

### Audit Logging

Built-in audit logging for compliance:

```typescript
const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(async (logs) => {
    await saveToDatabase(logs)
  })
})
```

## Why Fire Shield?

### Compared to Other Libraries

| Feature | Fire Shield | accesscontrol | casl | casbin |
|---------|------------|---------------|------|--------|
| TypeScript | ✅ Full | ⚠️ Partial | ✅ Full | ⚠️ Partial |
| Zero Dependencies | ✅ | ❌ | ❌ | ❌ |
| Bundle Size | 🎯 3.2KB | 5.8KB | 12KB | 45KB |
| Framework Adapters | ✅ 9+ | ❌ | ⚠️ Limited | ⚠️ Limited |
| Role Hierarchy | ✅ | ❌ | ❌ | ✅ |
| Performance | ⚡ Fastest | Fast | Medium | Slow |

### Use Cases

Fire Shield is perfect for:

- 🏢 **Enterprise Applications** - Multi-tenant SaaS with complex permission requirements
- 📱 **Web Applications** - User dashboards with role-based features
- 🔐 **APIs** - Protecting endpoints with permission-based middleware
- 🎮 **Content Management** - Managing content creation, editing, and publishing workflows
- 👥 **User Management** - Admin panels with granular access control

## Architecture

Fire Shield is built with a modular architecture:

```
@fire-shield/core       # Core RBAC engine
├── @fire-shield/vue    # Vue.js adapter
├── @fire-shield/react  # React adapter
├── @fire-shield/next   # Next.js adapter
└── ...                 # Other framework adapters
```

Each adapter is:
- **Optional** - Only install what you need
- **Tree-shakeable** - Only import what you use
- **Type-safe** - Full TypeScript support
- **Well-tested** - 100% test coverage

## Getting Started

Ready to add Fire Shield to your project?

- [Installation Guide →](/guide/installation)
- [Quick Start →](/guide/getting-started)
- [Framework Integrations →](/frameworks/vue)

## Community & Support

- 📖 [Documentation](/)
- 🐛 [Issue Tracker](https://github.com/khapu2906/fire-shield/issues)
- 💬 [Discussions](https://github.com/khapu2906/fire-shield/discussions)
- 📦 [NPM](https://www.npmjs.com/package/@fire-shield/core)
