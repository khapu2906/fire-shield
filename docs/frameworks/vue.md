# Vue.js Integration

Fire Shield provides first-class support for Vue.js 3 with composables, directives, and router guards.

## Installation

```bash
npm install @fire-shield/vue @fire-shield/core
```

## Setup

### Basic Setup

```typescript
// main.ts
import { createApp } from 'vue'
import { createVueRouterRBAC } from '@fire-shield/vue'
import { RBAC } from '@fire-shield/core'
import router from './router'
import App from './App.vue'

// Initialize RBAC
const rbac = new RBAC()
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
rbac.createRole('viewer', ['posts:read'])

// Create user ref
const currentUser = ref({ id: '1', roles: ['editor'] })

// Create Vue RBAC plugin
const { install: installRBAC } = createVueRouterRBAC(router, {
  rbac,
  getUser: () => currentUser.value,
  onUnauthorized: (to) => {
    router.push('/unauthorized')
  }
})

// Create and setup app
const app = createApp(App)
app.use(router)
app.use(installRBAC)
app.mount('#app')
```

## Directives

### v-can

Show elements only if user has permission:

```vue
<template>
  <!-- Button visible only if user can write posts -->
  <button v-can="'posts:write'">Create Post</button>

  <!-- Section visible only if user can manage users -->
  <section v-can="'users:manage'">
    <h2>User Management</h2>
    <!-- ... -->
  </section>
</template>
```

### v-cannot

Hide elements if user has permission (inverse of v-can):

```vue
<template>
  <!-- Show upgrade prompt if user cannot access premium features -->
  <div v-cannot="'premium:access'">
    <p>Upgrade to access premium features</p>
    <button>Upgrade Now</button>
  </div>
</template>
```

### v-permission

Alias for v-can directive:

```vue
<template>
  <button v-permission="'posts:delete'">Delete Post</button>
</template>
```

### v-role

Show elements only if user has specific role:

```vue
<template>
  <!-- Admin-only panel -->
  <div v-role="'admin'">
    <h2>Admin Panel</h2>
    <!-- ... -->
  </div>

  <!-- Editor-only tools -->
  <div v-role="'editor'">
    <h3>Editor Tools</h3>
    <!-- ... -->
  </div>
</template>
```

## Composables

### useRBAC

Access RBAC functionality in your components:

```vue
<script setup lang="ts">
import { useRBAC } from '@fire-shield/vue'

const { can, cannot, hasRole, user } = useRBAC()

const handleAction = () => {
  if (can('posts:delete')) {
    // Perform delete action
  } else {
    // Show error message
  }
}
</script>

<template>
  <div>
    <p>Current user: {{ user?.id }}</p>

    <!-- Conditional rendering -->
    <button v-if="can('posts:write')" @click="createPost">
      Create Post
    </button>

    <button v-if="hasRole('admin')" @click="openAdminPanel">
      Admin Panel
    </button>

    <div v-if="cannot('premium:access')">
      <p>Upgrade for premium features</p>
    </div>
  </div>
</template>
```

### API

```typescript
interface UseRBACReturn {
  // Check if user has permission
  can: (permission: string) => boolean

  // Check if user doesn't have permission
  cannot: (permission: string) => boolean

  // Check if user has role
  hasRole: (role: string) => boolean

  // Current user (reactive)
  user: Ref<RBACUser | null>

  // Update current user
  updateUser: (user: RBACUser | null) => void

  // RBAC instance
  rbac: RBAC
}
```

## Components

### Can Component

Conditionally render content based on permissions:

```vue
<script setup>
import { Can } from '@fire-shield/vue'
</script>

<template>
  <Can permission="posts:write">
    <button>Create Post</button>
  </Can>

  <Can permission="posts:delete">
    <template #fallback>
      <p>You don't have permission to delete posts</p>
    </template>
    <button>Delete Post</button>
  </Can>
</template>
```

### Cannot Component

Inverse of Can component:

```vue
<script setup>
import { Cannot } from '@fire-shield/vue'
</script>

<template>
  <Cannot permission="premium:access">
    <div class="upgrade-banner">
      <p>Upgrade to unlock premium features</p>
      <button>Upgrade Now</button>
    </div>
  </Cannot>
</template>
```

### ProtectedRoute Component

Protect entire routes:

```vue
<script setup>
import { ProtectedRoute } from '@fire-shield/vue'
import AdminDashboard from './AdminDashboard.vue'
</script>

<template>
  <ProtectedRoute permission="admin:access">
    <template #fallback>
      <div>Access Denied</div>
    </template>
    <AdminDashboard />
  </ProtectedRoute>
</template>
```

### RequirePermission Component

Require specific permission to render:

```vue
<script setup>
import { RequirePermission } from '@fire-shield/vue'
</script>

<template>
  <RequirePermission permission="settings:write">
    <form @submit="saveSettings">
      <!-- Settings form -->
    </form>
  </RequirePermission>
</template>
```

## Router Guards

### Route Meta Configuration

Protect routes using meta fields:

```typescript
// router/index.ts
import { createRouter } from 'vue-router'

const router = createRouter({
  routes: [
    {
      path: '/posts',
      component: PostsPage,
      meta: { permission: 'posts:read' }
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { role: 'admin' }
    },
    {
      path: '/settings',
      component: SettingsPage,
      meta: { permission: 'settings:write' }
    }
  ]
})
```

### Enable Global Guards

```typescript
const { install } = createVueRouterRBAC(router, {
  rbac,
  getUser: () => currentUser.value,
  enableGuards: true, // Enable automatic route guards
  onUnauthorized: (to, from) => {
    // Redirect to login or show error
    return '/unauthorized'
  }
})
```

### Manual Guard Usage

For more control, use guards manually:

```typescript
import { createNavigationGuard } from '@fire-shield/vue'

const guard = createNavigationGuard(rbac, {
  getUser: () => currentUser.value
})

router.beforeEach((to, from, next) => {
  // Your custom logic
  if (to.path === '/special') {
    // Special handling
  }

  // Apply RBAC guard
  return guard(to, from, next)
})
```

## Reactive Permission Updates

User permissions update automatically when user changes:

```vue
<script setup>
import { ref } from 'vue'
import { useRBAC } from '@fire-shield/vue'

const { user, updateUser, can } = useRBAC()

const switchUser = (newUser) => {
  // Update user - all directives and components react automatically
  updateUser(newUser)
}
</script>

<template>
  <div>
    <p>Current user: {{ user?.id }}</p>

    <!-- This updates automatically when user changes -->
    <button v-can="'posts:write'">Create Post</button>

    <button @click="switchUser({ id: '2', roles: ['admin'] })">
      Switch to Admin
    </button>
  </div>
</template>
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { useRBAC } from '@fire-shield/vue'
import type { RBACUser } from '@fire-shield/core'

// Type-safe user
const user: RBACUser = {
  id: 'user-123',
  roles: ['editor']
}

// Type-safe composable
const { can, hasRole } = useRBAC()

can('posts:write')   // Type-checked permission string
hasRole('editor')    // Type-checked role string
```

## Best Practices

### 1. Use Directives for Simple Cases

```vue
<!-- ✅ Good: Simple, declarative -->
<button v-can="'posts:delete'">Delete</button>

<!-- ❌ Avoid: Unnecessarily complex -->
<button v-if="can('posts:delete')">Delete</button>
```

### 2. Use Composables for Logic

```vue
<script setup>
const { can } = useRBAC()

const handleDelete = () => {
  if (!can('posts:delete')) {
    showError('No permission')
    return
  }
  deletePost()
}
</script>
```

### 3. Use Components for Complex Conditions

```vue
<Can permission="posts:write">
  <template #fallback>
    <UpgradePrompt />
  </template>
  <PostEditor />
</Can>
```

### 4. Protect Routes at Router Level

```typescript
// ✅ Good: Centralized route protection
{
  path: '/admin',
  meta: { permission: 'admin:access' },
  component: AdminPage
}

// ❌ Avoid: Component-level protection for routes
<template>
  <ProtectedRoute permission="admin:access">
    <AdminPage />
  </ProtectedRoute>
</template>
```

## Examples

Check out the [Vue example app](https://github.com/khapu2906/fire-shield/tree/main/examples/vue) for a complete working example.

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Role Hierarchy](/guide/role-hierarchy)
- Check out [Examples](/examples/basic-usage)
