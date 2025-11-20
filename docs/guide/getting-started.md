# Getting Started

Get up and running with Fire Shield in minutes.

## Installation

Install the core package:

::: code-group

```bash [npm]
npm install @fire-shield/core
```

```bash [yarn]
yarn add @fire-shield/core
```

```bash [pnpm]
pnpm add @fire-shield/core
```

:::

## Your First RBAC Setup

### 1. Create an RBAC Instance

```typescript
import { RBAC } from '@fire-shield/core'

const rbac = new RBAC()
```

### 2. Define Roles and Permissions

```typescript
// Create roles with permissions
rbac.createRole('admin', [
  'posts:*',      // All post operations
  'users:*',      // All user operations
  'settings:*'    // All settings operations
])

rbac.createRole('editor', [
  'posts:read',
  'posts:write',
  'posts:publish'
])

rbac.createRole('viewer', [
  'posts:read'
])
```

### 3. Check Permissions

```typescript
const user = {
  id: 'user-123',
  roles: ['editor']
}

// Check if user has permission
if (rbac.hasPermission(user, 'posts:write')) {
  // Allow user to write posts
  console.log('✅ User can write posts')
} else {
  console.log('❌ Access denied')
}

// Check multiple permissions
const canEdit = rbac.hasPermission(user, 'posts:write')   // ✅ true
const canDelete = rbac.hasPermission(user, 'posts:delete') // ❌ false
const canRead = rbac.hasPermission(user, 'posts:read')    // ✅ true
```

## Role Hierarchy

Set up role inheritance for cleaner permission management:

```typescript
// Admin inherits all editor and viewer permissions
rbac.setRoleHierarchy({
  admin: ['editor', 'viewer'],
  editor: ['viewer']
})

// Now admins automatically have editor and viewer permissions
const admin = { id: 'admin-1', roles: ['admin'] }
rbac.hasPermission(admin, 'posts:read')  // ✅ true (inherited from viewer)
rbac.hasPermission(admin, 'posts:write') // ✅ true (inherited from editor)
rbac.hasPermission(admin, 'users:delete') // ✅ true (admin's own permission)
```

## Wildcard Permissions

Use wildcards for flexible permission patterns:

```typescript
rbac.createRole('admin', [
  'posts:*',        // All post operations
  'users:*',        // All user operations
  'admin:*'         // All admin operations
])

const admin = { id: 'admin-1', roles: ['admin'] }

// All these checks return true
rbac.hasPermission(admin, 'posts:read')
rbac.hasPermission(admin, 'posts:write')
rbac.hasPermission(admin, 'posts:delete')
rbac.hasPermission(admin, 'users:create')
rbac.hasPermission(admin, 'admin:settings:write')
```

## Framework Integration

Fire Shield provides adapters for popular frameworks. Choose your framework to continue:

- [Vue.js](/frameworks/vue) - Directives, composables, and router guards
- [React](/frameworks/react) - Hooks and components
- [Next.js](/frameworks/next) - Server and client components
- [Nuxt](/frameworks/nuxt) - Auto-imports and middleware
- [Angular](/frameworks/angular) - Services and guards
- [Svelte](/frameworks/svelte) - Stores and actions
- [Express](/frameworks/express) - Middleware
- [Fastify](/frameworks/fastify) - Plugins and hooks
- [Hono](/frameworks/hono) - Middleware

## Next Steps

- Learn about [Permissions](/guide/permissions)
- Understand [Roles](/guide/roles)
- Explore [Role Hierarchy](/guide/role-hierarchy)
- Master [Wildcards](/guide/wildcards)
- Set up [Audit Logging](/guide/audit-logging)
