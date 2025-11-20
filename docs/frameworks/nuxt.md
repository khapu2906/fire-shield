# Nuxt Integration

Fire Shield provides a Nuxt module for seamless RBAC integration with composables, server utilities, and middleware.

## Installation

```bash
npm install @fire-shield/nuxt @fire-shield/core
```

## Setup

### 1. Add Module

Add Fire Shield to your Nuxt configuration:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fire-shield/nuxt'],

  fireShield: {
    // Define roles
    roles: {
      admin: ['user:*', 'post:*'],
      editor: ['post:read', 'post:write'],
      viewer: ['post:read']
    },

    // Enable features
    auditLogging: true,
    enableWildcards: true
  }
});
```

### 2. Initialize User State

```typescript
// plugins/auth.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  const user = await $fetch('/api/auth/me');

  if (user) {
    const { setUser } = useFireShield();
    setUser(user);
  }
});
```

## Composables

### useFireShield()

Main composable for accessing RBAC functionality:

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
const { can, hasRole, authorize, rbac } = useFireShield();

function createPost() {
  // Create post logic
}

function openAdmin() {
  navigateTo('/admin');
}
</script>
```

**API:**
```typescript
interface UseFireShieldReturn {
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  authorize: (permission: string) => AuthorizationResult;
  rbac: RBAC;
  setUser: (user: RBACUser | null) => void;
}
```

### useRBAC()

Access RBAC instance directly:

```typescript
const rbac = useRBAC();

// Create dynamic roles
rbac.createRole('moderator', ['comment:moderate', 'post:flag']);

// Check permissions
rbac.hasPermission(user, 'comment:moderate');

// Deny permissions
rbac.denyPermission(user.id, 'system:delete');
```

## Server Routes

### Basic Protection

```typescript
// server/api/users.get.ts
import { defineEventHandler } from 'h3';
import { useRBAC } from '#fire-shield';

export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;

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

### Using defineRBACEventHandler

```typescript
// server/api/admin/users.get.ts
export default defineRBACEventHandler('user:read', async (event) => {
  const users = await getUsers();
  return { users };
});
```

### Using defineRBACRoleHandler

```typescript
// server/api/admin/stats.get.ts
export default defineRBACRoleHandler('admin', async (event) => {
  const stats = await getAdminStats();
  return { stats };
});
```

### Dynamic Permission Checks

```typescript
// server/api/posts/[id].delete.ts
import { defineEventHandler, createError } from 'h3';
import { useRBAC } from '#fire-shield';

export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;
  const postId = event.context.params.id;

  const post = await getPost(postId);

  // Check ownership
  const isOwner = post.authorId === user.id;
  const canDelete =
    rbac.hasPermission(user, 'post:delete:any') ||
    (isOwner && rbac.hasPermission(user, 'post:delete:own'));

  if (!canDelete) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to delete this post'
    });
  }

  await deletePost(postId);
  return { success: true };
});
```

## Middleware

### Route Protection

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { can } = useFireShield();

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

### Role-Based Middleware

```typescript
// middleware/admin.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { hasRole } = useFireShield();

  if (!hasRole('admin')) {
    return navigateTo('/unauthorized');
  }
});
```

**Usage:**
```vue
<script setup>
definePageMeta({
  middleware: 'admin'
});
</script>

<template>
  <div>
    <h1>Admin Panel</h1>
  </div>
</template>
```

## Components

### Conditional Rendering

```vue
<template>
  <div>
    <!-- Show/hide based on permissions -->
    <section v-if="can('user:manage')">
      <h2>User Management</h2>
      <UserList />
    </section>

    <section v-if="can('post:manage')">
      <h2>Post Management</h2>
      <PostList />
    </section>

    <!-- Show/hide based on roles -->
    <div v-if="hasRole('admin')">
      <AdminControls />
    </div>
  </div>
</template>

<script setup>
const { can, hasRole } = useFireShield();
</script>
```

### Dynamic Actions

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

function editPost() {
  // Edit logic
}

function deletePost() {
  // Delete logic
}

function publishPost() {
  // Publish logic
}
</script>
```

### Form Protection

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" placeholder="Name" />

    <input
      v-if="can('user:edit:email')"
      v-model="form.email"
      type="email"
      placeholder="Email"
    />

    <select
      v-if="can('user:edit:role')"
      v-model="form.role"
    >
      <option value="user">User</option>
      <option value="editor">Editor</option>
      <option v-if="hasRole('admin')" value="admin">Admin</option>
    </select>

    <button type="submit">Save</button>
  </form>
</template>

<script setup>
const { can, hasRole } = useFireShield();

const form = reactive({
  name: '',
  email: '',
  role: 'user'
});

async function handleSubmit() {
  await $fetch('/api/users', {
    method: 'POST',
    body: form
  });
}
</script>
```

## Layouts

### Protected Layout

```vue
<!-- layouts/admin.vue -->
<template>
  <div v-if="can('admin:access')">
    <AdminSidebar />
    <main>
      <slot />
    </main>
  </div>
  <div v-else>
    <h1>Access Denied</h1>
    <p>You do not have permission to access the admin panel</p>
  </div>
</template>

<script setup>
const { can } = useFireShield();
</script>
```

**Usage:**
```vue
<script setup>
definePageMeta({
  layout: 'admin'
});
</script>

<template>
  <div>
    <h1>Admin Dashboard</h1>
  </div>
</template>
```

## Server Middleware

### Authentication Middleware

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token');

  if (token) {
    const user = await validateToken(token);
    event.context.user = user;
  }
});
```

### RBAC Middleware

```typescript
// server/middleware/rbac.ts
export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;

  // Add RBAC helper to context
  event.context.can = (permission: string) =>
    user ? rbac.hasPermission(user, permission) : false;

  event.context.hasRole = (role: string) =>
    user ? user.roles.includes(role) : false;
});
```

**Usage:**
```typescript
// server/api/posts.get.ts
export default defineEventHandler(async (event) => {
  if (!event.context.can('post:read')) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    });
  }

  const posts = await getPosts();
  return { posts };
});
```

## Audit Logging

### Enable in Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  fireShield: {
    auditLogging: true
  }
});
```

### Custom Audit Logger

```typescript
// server/plugins/audit.ts
import { defineNitroPlugin } from '#imports';
import { BufferedAuditLogger } from '@fire-shield/core';

export default defineNitroPlugin((nitroApp) => {
  const logger = new BufferedAuditLogger(
    async (events) => {
      await $fetch('/api/audit-logs', {
        method: 'POST',
        body: { events }
      });
    },
    { maxBufferSize: 50, flushIntervalMs: 3000 }
  );

  const rbac = useRBAC();
  rbac.setAuditLogger(logger);
});
```

### Audit Log API

```typescript
// server/api/audit-logs.post.ts
export default defineRBACEventHandler('audit:write', async (event) => {
  const { events } = await readBody(event);

  await db.auditLogs.insertMany(events);

  return { success: true };
});
```

## Authentication Integration

### With Nuxt Auth

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth', '@fire-shield/nuxt'],

  auth: {
    // Auth configuration
  }
});
```

```typescript
// middleware/auth.global.ts
import { useAuth } from '#auth';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { status, data } = useAuth();

  if (status.value === 'authenticated' && data.value) {
    const { setUser } = useFireShield();
    setUser({
      id: data.value.user.id,
      roles: data.value.user.roles
    });
  }
});
```

## Multi-Tenant Support

```typescript
// server/api/tenant/[tenantId]/data.get.ts
export default defineEventHandler(async (event) => {
  const rbac = useRBAC();
  const user = event.context.user;
  const tenantId = event.context.params.tenantId;

  // Check tenant-specific permission
  const permission = `tenant:${tenantId}:read`;

  if (!rbac.hasPermission(user, permission)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have access to this tenant'
    });
  }

  const data = await getTenantData(tenantId);
  return { data };
});
```

## Best Practices

### 1. Centralize Permission Checks

```typescript
// composables/usePermissions.ts
export const usePermissions = () => {
  const { can, hasRole } = useFireShield();

  return {
    canManageUsers: () => can('user:manage'),
    canEditPost: (post: Post, user: User) =>
      can('post:edit:any') ||
      (post.authorId === user.id && can('post:edit:own')),
    canDeletePost: (post: Post, user: User) =>
      can('post:delete:any') ||
      (post.authorId === user.id && can('post:delete:own')),
    isAdmin: () => hasRole('admin'),
  };
};
```

### 2. Use Module Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  fireShield: {
    roles: {
      admin: ['*'],
      editor: ['post:*', 'comment:moderate'],
      user: ['post:read', 'comment:create']
    },
    auditLogging: true,
    enableWildcards: true
  }
});
```

### 3. Error Handling

```typescript
// server/api/protected.get.ts
export default defineEventHandler(async (event) => {
  try {
    const rbac = useRBAC();
    const user = event.context.user;

    const result = rbac.authorize(user, 'protected:access');

    if (!result.allowed) {
      throw createError({
        statusCode: 403,
        message: result.reason || 'Forbidden'
      });
    }

    return { data: 'protected data' };
  } catch (error) {
    console.error('RBAC error:', error);
    throw error;
  }
});
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/nuxt';

interface User extends RBACUser {
  email: string;
  name: string;
}

const user: User = {
  id: 'user-123',
  roles: ['editor'],
  email: 'user@example.com',
  name: 'John Doe',
};

const { setUser } = useFireShield();
setUser(user);
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
