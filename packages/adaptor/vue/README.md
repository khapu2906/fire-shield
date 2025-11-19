# 🛡️ Fire Shield - Vue Adapter

Vue integration for Fire Shield RBAC authorization with composables, directives, and navigation guards.

## Features

- ✅ **Vue Composables** - `useCan`, `useRole`, `useAuthorize`, `useAllPermissions`, `useAnyPermission`
- ✅ **Vue Directives** - `v-can`, `v-role`
- ✅ **Navigation Guards** - Route protection (requires Vue Router)
- ✅ **TypeScript Support** - Full type safety
- ✅ **Framework Agnostic** - Works with any Vue 3 app

## Installation

```bash
pnpm add @fire-shield/vue @fire-shield/core

# If using navigation guards, also install:
pnpm add vue-router
```

## Quick Start

### 1. Setup Plugin

```typescript
// main.ts
import { createApp } from 'vue';
import { createRouter } from 'vue-router';
import { RBAC } from '@fire-shield/core';
import { createFireShield } from '@fire-shield/vue';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

const app = createApp(App);
const router = createRouter({ /* ... */ });

// Install Fire Shield plugin
app.use(createFireShield({
  rbac,
  router,
  getUser: () => getCurrentUser() // Your user getter
}));

app.use(router);
app.mount('#app');
```

### 2. Protect Routes

```typescript
// router/index.ts
const routes = [
  {
    path: '/',
    component: Home
  },
  {
    path: '/admin',
    component: AdminDashboard,
    meta: {
      permission: 'admin:access'
    }
  },
  {
    path: '/editor',
    component: EditorPanel,
    meta: {
      role: 'editor'
    }
  },
  {
    path: '/users',
    component: UserList,
    meta: {
      permission: 'user:read',
      unauthorizedRedirect: '/forbidden'
    }
  }
];
```

### 3. Use in Components

```vue
<template>
  <div>
    <button v-if="$can('post:write')" @click="createPost">
      Create Post
    </button>

    <button v-if="$hasRole('admin')" @click="openAdmin">
      Admin Panel
    </button>

    <!-- Using directive -->
    <div v-permission="'user:manage'">
      <UserManagement />
    </div>

    <!-- Using component -->
    <Can permission="post:delete">
      <DeleteButton />
    </Can>
  </div>
</template>

<script setup>
import { useCan, useRole } from '@fire-shield/vue';

const canWrite = useCan('post:write');
const isEditor = useRole('editor');

function createPost() {
  if (canWrite.value) {
    // Create post
  }
}
</script>
```

## API

### Plugin Options

```typescript
createFireShield({
  rbac: RBAC,
  router: Router,
  getUser: () => RBACUser | Promise<RBACUser>,
  unauthorizedRedirect?: string,
  onUnauthorized?: (to, from, permission) => void
})
```

### Composables

#### `useRBAC()`

Returns RBAC instance.

```typescript
const rbac = useRBAC();
const canDelete = rbac.hasPermission(user, 'post:delete');
```

#### `useCan(permission)`

Reactive permission check.

```typescript
const canWrite = useCan('post:write');

watchEffect(() => {
  if (canWrite.value) {
    // User has permission
  }
});
```

#### `useRole(role)`

Reactive role check.

```typescript
const isAdmin = useRole('admin');
```

#### `useAuthorize(permission)`

Reactive authorization result.

```typescript
const result = useAuthorize('admin:delete');

watchEffect(() => {
  if (!result.value.allowed) {
    console.log('Denied:', result.value.reason);
  }
});
```

#### `useUser()`

Get current user.

```typescript
const user = useUser();
console.log(user.value?.id, user.value?.roles);
```

### Global Properties

#### `$can(permission)`

Check permission in template.

```vue
<button v-if="$can('post:write')">Create</button>
```

#### `$hasRole(role)`

Check role in template.

```vue
<div v-if="$hasRole('admin')">Admin Panel</div>
```

### Components

#### `<Can>`

Conditionally render based on permission.

```vue
<Can permission="post:write">
  <CreateButton />
</Can>

<Can role="admin">
  <AdminPanel />
</Can>

<Can permission="post:write" v-slot="{ allowed }">
  <button :disabled="!allowed">Create</button>
</Can>
```

#### `<Cannot>`

Render when user lacks permission.

```vue
<Cannot permission="post:write">
  <UpgradePrompt />
</Cannot>
```

### Directives

#### `v-permission`

Show element only if user has permission.

```vue
<div v-permission="'admin:access'">
  Admin content
</div>

<!-- With fallback -->
<div v-permission:user:manage="{ fallback: 'No access' }">
  User management
</div>
```

#### `v-role`

Show element only if user has role.

```vue
<div v-role="'admin'">
  Admin content
</div>
```

## Examples

### Navigation Guards

```typescript
// router/index.ts
import { createRouter } from 'vue-router';
import { useRBAC } from '@fire-shield/vue';

const router = createRouter({ /* ... */ });

router.beforeEach((to, from, next) => {
  const rbac = useRBAC();
  const user = getCurrentUser();

  // Check route permission
  if (to.meta.permission) {
    if (!rbac.hasPermission(user, to.meta.permission as string)) {
      return next('/unauthorized');
    }
  }

  // Check route role
  if (to.meta.role) {
    if (!user.roles.includes(to.meta.role as string)) {
      return next('/unauthorized');
    }
  }

  next();
});
```

### Dynamic Menu

```vue
<template>
  <nav>
    <router-link to="/">Home</router-link>

    <router-link v-if="$can('post:manage')" to="/posts">
      Posts
    </router-link>

    <router-link v-if="$can('user:manage')" to="/users">
      Users
    </router-link>

    <router-link v-if="$hasRole('admin')" to="/admin">
      Admin
    </router-link>
  </nav>
</template>
```

### Conditional Buttons

```vue
<template>
  <div class="actions">
    <button
      v-for="action in availableActions"
      :key="action.permission"
      @click="action.handler"
    >
      {{ action.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCan } from '@fire-shield/vue';

const actions = [
  { label: 'Edit', permission: 'post:edit', handler: editPost },
  { label: 'Delete', permission: 'post:delete', handler: deletePost },
  { label: 'Publish', permission: 'post:publish', handler: publishPost },
];

const availableActions = computed(() => {
  return actions.filter(action => useCan(action.permission).value);
});
</script>
```

### Form Fields

```vue
<template>
  <form>
    <input v-model="form.name" />

    <input
      v-if="canEditEmail"
      v-model="form.email"
      type="email"
    />

    <select
      v-if="canEditRole"
      v-model="form.role"
    >
      <option value="user">User</option>
      <option value="editor">Editor</option>
      <option v-if="isAdmin" value="admin">Admin</option>
    </select>
  </form>
</template>

<script setup>
import { useCan, useRole } from '@fire-shield/vue';

const canEditEmail = useCan('user:edit:email');
const canEditRole = useCan('user:edit:role');
const isAdmin = useRole('admin');

const form = reactive({
  name: '',
  email: '',
  role: 'user'
});
</script>
```

### Protected Component

```vue
<template>
  <Can permission="admin:access">
    <div class="admin-panel">
      <h1>Admin Panel</h1>

      <section v-permission="'user:manage'">
        <h2>User Management</h2>
        <UserList />
      </section>

      <section v-permission="'post:manage'">
        <h2>Post Management</h2>
        <PostList />
      </section>
    </div>
  </Can>
</template>
```

### Audit Logging

```typescript
// main.ts
import { BufferedAuditLogger } from '@fire-shield/core';

const auditLogger = new BufferedAuditLogger(
  async (events) => {
    await fetch('/api/audit-logs', {
      method: 'POST',
      body: JSON.stringify({ events })
    });
  },
  { maxBufferSize: 50, flushIntervalMs: 3000 }
);

const rbac = new RBAC({ auditLogger });
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/core';

interface User extends RBACUser {
  email: string;
  name: string;
}

// Typed composables
const user = useUser<User>();
const canWrite = useCan('post:write');
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [Vue Router Documentation](https://router.vuejs.org)
- [NPM](https://www.npmjs.com/package/@fire-shield/vue)
