# 🛡️ Fire Shield - Nuxt.js Adapter

Nuxt.js module for Fire Shield RBAC authorization.

## Installation

```bash
pnpm add @fire-shield/nuxt @fire-shield/core
```

## Quick Start

### 1. Add Module

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fire-shield/nuxt'],

  fireShield: {
    roles: {
      admin: ['user:*', 'post:*'],
      editor: ['post:read', 'post:write'],
      user: ['post:read']to
    }
  }
});
```

### 2. Use in Server Routes

```typescript
// server/api/admin/users.get.ts
import { defineEventHandler } from 'h3';
import { useRBAC } from '#fire-shield';

export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;

  // Check permission
  if (!rbac.hasPermission(user, 'user:read')) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    });
  }

  const users = await getUsers();
  return { users };
});
```

### 3. Use in Components

```vue
<template>
  <div>
    <button v-if="can('post:write')" @click="createPost">
      Create Post
    </button>

    <button v-if="hasRole('admin')" @click="openAdmin">
      Admin Panel
    </button>
  </div>
</template>

<script setup>
const { can, hasRole } = useFireShield();

function createPost() {
  // Create post logic
}

function openAdmin() {
  navigateTo('/admin');
}
</script>
```

## API

### Module Options

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  fireShield: {
    // Define roles
    roles: {
      admin: ['*'],
      editor: ['post:*'],
      user: ['post:read']
    },

    // Enable audit logging
    auditLogging: true,

    // Enable wildcards (default: true)
    enableWildcards: true
  }
});
```

### Composables

#### `useFireShield()`

Returns Fire Shield utilities.

```typescript
const { can, hasRole, authorize, rbac } = useFireShield();

// Check permission
if (can('post:write')) {
  // User has permission
}

// Check role
if (hasRole('admin')) {
  // User is admin
}

// Get authorization result
const result = authorize('user:delete');
if (!result.allowed) {
  console.log(result.reason);
}

// Access RBAC instance
rbac.denyPermission(user.id, 'system:delete');
```

#### `useRBAC()`

Returns RBAC instance directly.

```typescript
const rbac = useRBAC();

rbac.createRole('moderator', ['comment:moderate']);
```

### Server Utils

#### `defineRBACEventHandler(permission, handler)`

Protect server routes with permission check.

```typescript
// server/api/admin/users.get.ts
export default defineRBACEventHandler('user:read', async (event) => {
  const users = await getUsers();
  return { users };
});
```

#### `defineRBACRoleHandler(role, handler)`

Protect server routes with role check.

```typescript
// server/api/admin/stats.get.ts
export default defineRBACRoleHandler('admin', async (event) => {
  const stats = await getStats();
  return { stats };
});
```

## Examples

### Middleware Protection

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { can } = useFireShield();
  const user = useUser();

  // Protect admin routes
  if (to.path.startsWith('/admin')) {
    if (!can('admin:access')) {
      return navigateTo('/unauthorized');
    }
  }

  // Protect specific routes
  const protectedRoutes = {
    '/posts/create': 'post:write',
    '/users/manage': 'user:manage'
  };

  const permission = protectedRoutes[to.path];
  if (permission && !can(permission)) {
    return navigateTo('/unauthorized');
  }
});
```

### Component Protection

```vue
<!-- components/AdminPanel.vue -->
<template>
  <div v-if="can('admin:access')">
    <h1>Admin Panel</h1>

    <section v-if="can('user:manage')">
      <h2>User Management</h2>
      <UserList />
    </section>

    <section v-if="can('post:manage')">
      <h2>Post Management</h2>
      <PostList />
    </section>
  </div>
</template>

<script setup>
const { can } = useFireShield();
</script>
```

### Server API Protection

```typescript
// server/api/posts/[id].delete.ts
import { defineEventHandler, createError } from 'h3';
import { useRBAC } from '#fire-shield';

export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;
  const postId = event.context.params.id;

  // Get post
  const post = await getPost(postId);

  // Check if user can delete
  const canDeleteOwn = rbac.hasPermission(user, 'post:delete:own') && post.authorId === user.id;
  const canDeleteAny = rbac.hasPermission(user, 'post:delete:any');

  if (!canDeleteOwn && !canDeleteAny) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to delete this post'
    });
  }

  await deletePost(postId);
  return { success: true };
});
```

### Audit Logging

```typescript
// server/plugins/audit.ts
import { defineNuxtPlugin } from '#app';
import { BufferedAuditLogger } from '@fire-shield/core';

export default defineNuxtPlugin((nuxtApp) => {
  const logger = new BufferedAuditLogger(
    async (events) => {
      await $fetch('/api/audit-logs', {
        method: 'POST',
        body: { events }
      });
    },
    { maxBufferSize: 50, flushIntervalMs: 3000 }
  );

  // Add logger to RBAC
  const rbac = useRBAC();
  rbac.setAuditLogger(logger);
});
```

### Dynamic Permissions

```vue
<template>
  <div>
    <button
      v-for="action in availableActions"
      :key="action.permission"
      v-if="can(action.permission)"
      @click="action.handler"
    >
      {{ action.label }}
    </button>
  </div>
</template>

<script setup>
const { can } = useFireShield();

const availableActions = [
  { label: 'Edit', permission: 'post:write', handler: editPost },
  { label: 'Delete', permission: 'post:delete', handler: deletePost },
  { label: 'Publish', permission: 'post:publish', handler: publishPost },
];
</script>
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [Nuxt Documentation](https://nuxt.com)
- [NPM](https://www.npmjs.com/package/@fire-shield/nuxt)
