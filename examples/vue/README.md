# 🛡️ Fire Shield Vue Example

This is a complete example application demonstrating how to use `@fire-shield/vue` for role-based access control in a Vue 3 application with Vue Router.

## Features Demonstrated

- ✅ **createVueRouterRBAC()** - Plugin setup with automatic navigation guards
- ✅ **useCan()** - Checking user permissions with composables
- ✅ **useRole()** - Checking user roles with composables
- ✅ **v-can** - Conditional rendering directive
- ✅ **Route Meta Protection** - Protecting routes via meta fields
- ✅ **Navigation Guards** - Automatic route protection

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### 3. Build for Production

```bash
pnpm build
```

### 4. Preview Production Build

```bash
pnpm preview
```

## How It Works

### Roles & Permissions

The example includes three predefined roles:

- **Admin** - Full access (`user:*`, `post:*`, `settings:*`)
- **Editor** - Can read, write, and publish posts (`post:read`, `post:write`, `post:publish`)
- **Viewer** - Can only read posts (`post:read`)

### Try It Out

1. Use the role switcher at the top to switch between different user roles
2. Notice how the navigation, UI elements, and available pages change based on permissions
3. Try accessing protected routes as different roles - you'll be redirected to unauthorized page

### Pages

- **Home** - Public page showing permission-based content
- **Posts** - Protected page requiring `post:read` permission (via route meta)
- **Admin** - Protected page requiring `admin` role (via route meta)
- **Unauthorized** - Page shown when access is denied

## Code Structure

```
src/
├── main.ts                # App entry point with RBAC setup
├── App.vue                # Main app component with navigation
├── style.css              # Global styles
└── pages/
    ├── HomePage.vue       # Home page
    ├── PostsPage.vue      # Posts page (protected)
    ├── AdminPage.vue      # Admin page (protected)
    └── UnauthorizedPage.vue # Unauthorized page
```

## Key Concepts

### 1. Setup Vue Router RBAC Plugin

```ts
import { createVueRouterRBAC } from '@fire-shield/vue';
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);

const { install } = createVueRouterRBAC(router, {
  rbac,
  getUser: () => currentUser,
  onUnauthorized: () => router.push('/unauthorized'),
  enableGuards: true
});

app.use(install);
```

### 2. Protect Routes with Meta

```ts
const routes = [
  {
    path: '/admin',
    component: AdminPage,
    meta: { role: 'admin' }  // Requires admin role
  },
  {
    path: '/posts',
    component: PostsPage,
    meta: { permission: 'post:read' }  // Requires permission
  }
];
```

### 3. Use Composables

```vue
<script setup>
import { useCan, useRole } from '@fire-shield/vue';

const canWrite = useCan('post:write');
const isAdmin = useRole('admin');
</script>
```

### 4. Use Directives

```vue
<template>
  <!-- Show if has permission -->
  <button v-can="'post:write'">Create Post</button>

  <!-- Hide if has permission (inverse) -->
  <div v-can:not="'post:write'">You cannot create posts</div>

  <!-- With role -->
  <div v-role="'admin'">Admin only content</div>
</template>
```

## Learn More

- [@fire-shield/vue Documentation](https://npmjs.com/package/@fire-shield/vue)
- [@fire-shield/core Documentation](https://npmjs.com/package/@fire-shield/core)
- [Vue 3 Documentation](https://vuejs.org)
- [Vue Router Documentation](https://router.vuejs.org)

## License

DIB © Fire Shield Team
