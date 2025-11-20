# Svelte Integration

Fire Shield provides Svelte integration with reactive stores, actions, and full TypeScript support for both Svelte 4 and 5.

## Features

- Reactive RBAC stores with writable and derived stores
- Svelte actions (`use:can`, `use:role`, `use:cannot`)
- Automatically updates when user changes
- Full TypeScript support
- Compatible with Svelte 4 & 5

## Installation

```bash
npm install @fire-shield/svelte @fire-shield/core
```

## Setup

### Create RBAC Store

```typescript
// stores/rbac.ts
import { RBAC } from '@fire-shield/core';
import { createRBACStore } from '@fire-shield/svelte';

const rbac = new RBAC();

// Define roles
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);

// Set hierarchy
rbac.getRoleHierarchy().setRoleLevel('admin', 10);
rbac.getRoleHierarchy().setRoleLevel('editor', 5);
rbac.getRoleHierarchy().setRoleLevel('viewer', 1);

export const rbacStore = createRBACStore(rbac, null);
```

## Store API

### createRBACStore(rbac, initialUser?)

Creates a reactive RBAC store.

```typescript
import { RBAC } from '@fire-shield/core';
import { createRBACStore } from '@fire-shield/svelte';

const rbac = new RBAC();
const store = createRBACStore(rbac, null);
```

**Returns:**
```typescript
{
  rbac: RBAC;
  user: Writable<RBACUser | null>;
  can: (permission: string) => Readable<boolean>;
  hasRole: (role: string) => Readable<boolean>;
  authorize: (permission: string) => Readable<AuthorizationResult>;
  canAll: (permissions: string[]) => Readable<boolean>;
  canAny: (permissions: string[]) => Readable<boolean>;
}
```

## Basic Usage

### Update User

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  function login() {
    const user = { id: 'user-1', roles: ['editor'] };
    rbacStore.user.set(user);
  }

  function logout() {
    rbacStore.user.set(null);
  }
</script>

<button on:click={login}>Login</button>
<button on:click={logout}>Logout</button>
```

### Check Permissions

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canWrite = rbacStore.can('post:write');
  const isAdmin = rbacStore.hasRole('admin');
</script>

{#if $canWrite}
  <button>Create Post</button>
{/if}

{#if $isAdmin}
  <a href="/admin">Admin Panel</a>
{/if}
```

## Reactive Stores

### can(permission)

Returns a derived store that checks if user has permission:

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canWrite = rbacStore.can('post:write');
  const canDelete = rbacStore.can('post:delete');
  const canPublish = rbacStore.can('post:publish');
</script>

<div class="actions">
  {#if $canWrite}
    <button>Edit</button>
  {/if}

  {#if $canPublish}
    <button>Publish</button>
  {/if}

  {#if $canDelete}
    <button class="danger">Delete</button>
  {/if}
</div>
```

### hasRole(role)

Returns a derived store that checks if user has role:

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const isAdmin = rbacStore.hasRole('admin');
  const isEditor = rbacStore.hasRole('editor');
</script>

<nav>
  <a href="/">Home</a>

  {#if $isEditor}
    <a href="/posts">Posts</a>
  {/if}

  {#if $isAdmin}
    <a href="/admin">Admin</a>
  {/if}
</nav>
```

### authorize(permission)

Returns a derived store with full authorization result:

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const result = rbacStore.authorize('post:delete');
</script>

{#if !$result.allowed}
  <p class="error">
    Access denied: {$result.reason}
  </p>
{:else}
  <button>Delete Post</button>
{/if}
```

### canAll(permissions)

Check if user has all permissions:

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const hasFullAccess = rbacStore.canAll([
    'post:read',
    'post:write',
    'post:publish'
  ]);
</script>

{#if $hasFullAccess}
  <button>Full Access Mode</button>
{/if}
```

### canAny(permissions)

Check if user has any permission:

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canAccessPosts = rbacStore.canAny(['post:read', 'post:write']);
</script>

{#if $canAccessPosts}
  <a href="/posts">View Posts</a>
{/if}
```

## Svelte Actions

### use:can

Conditionally render element based on permission:

```svelte
<script>
  import { rbacStore } from './stores/rbac';
  import { can } from '@fire-shield/svelte';
</script>

<!-- Remove element if no permission -->
<div use:can={{ permission: 'post:write', store: rbacStore }}>
  <button>Create Post</button>
</div>

<!-- Hide element if no permission (keeps in DOM) -->
<div use:can={{ permission: 'post:write', hide: true, store: rbacStore }}>
  <button>Create Post</button>
</div>
```

### use:role

Conditionally render element based on role:

```svelte
<script>
  import { rbacStore } from './stores/rbac';
  import { role } from '@fire-shield/svelte';
</script>

<!-- Remove element if no role -->
<section use:role={{ role: 'admin', store: rbacStore }}>
  <h2>Admin Controls</h2>
</section>

<!-- Hide element if no role -->
<section use:role={{ role: 'admin', hide: true, store: rbacStore }}>
  <h2>Admin Controls</h2>
</section>
```

### use:cannot

Inverse conditional rendering (show when permission is NOT present):

```svelte
<script>
  import { rbacStore } from './stores/rbac';
  import { cannot } from '@fire-shield/svelte';
</script>

<div use:cannot={{ permission: 'premium:access', store: rbacStore }}>
  <div class="upgrade-banner">
    <p>Upgrade to Premium for more features!</p>
    <button>Upgrade Now</button>
  </div>
</div>
```

## Component Examples

### Navigation Menu

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canManagePosts = rbacStore.can('post:write');
  const canManageUsers = rbacStore.can('user:write');
  const isAdmin = rbacStore.hasRole('admin');
</script>

<nav>
  <a href="/">Home</a>

  {#if $canManagePosts}
    <a href="/posts">Posts</a>
  {/if}

  {#if $canManageUsers}
    <a href="/users">Users</a>
  {/if}

  {#if $isAdmin}
    <a href="/admin">Admin</a>
  {/if}
</nav>

<style>
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #f5f5f5;
  }

  a {
    text-decoration: none;
    color: #333;
  }

  a:hover {
    color: #007bff;
  }
</style>
```

### Post Actions

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  export let postId;

  const canEdit = rbacStore.can('post:write');
  const canDelete = rbacStore.can('post:delete');
  const canPublish = rbacStore.can('post:publish');

  function editPost() {
    console.log('Editing post:', postId);
  }

  function deletePost() {
    console.log('Deleting post:', postId);
  }

  function publishPost() {
    console.log('Publishing post:', postId);
  }
</script>

<div class="actions">
  {#if $canEdit}
    <button on:click={editPost}>Edit</button>
  {/if}

  {#if $canPublish}
    <button on:click={publishPost}>Publish</button>
  {/if}

  {#if $canDelete}
    <button class="danger" on:click={deletePost}>Delete</button>
  {/if}
</div>

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .danger {
    background: #dc3545;
    color: white;
  }
</style>
```

### User Login/Logout

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  let isLoggedIn = false;

  function loginAsAdmin() {
    const user = { id: 'admin-1', roles: ['admin'] };
    rbacStore.user.set(user);
    isLoggedIn = true;
  }

  function loginAsEditor() {
    const user = { id: 'editor-1', roles: ['editor'] };
    rbacStore.user.set(user);
    isLoggedIn = true;
  }

  function loginAsViewer() {
    const user = { id: 'viewer-1', roles: ['viewer'] };
    rbacStore.user.set(user);
    isLoggedIn = true;
  }

  function logout() {
    rbacStore.user.set(null);
    isLoggedIn = false;
  }
</script>

{#if isLoggedIn}
  <div>
    <p>Logged in as: {$rbacStore.user?.id}</p>
    <button on:click={logout}>Logout</button>
  </div>
{:else}
  <div class="login-options">
    <button on:click={loginAsAdmin}>Login as Admin</button>
    <button on:click={loginAsEditor}>Login as Editor</button>
    <button on:click={loginAsViewer}>Login as Viewer</button>
  </div>
{/if}

<style>
  .login-options {
    display: flex;
    gap: 1rem;
  }
</style>
```

### Form with Conditional Fields

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canEditEmail = rbacStore.can('user:edit:email');
  const canEditRole = rbacStore.can('user:edit:role');
  const canSetAdmin = rbacStore.hasRole('admin');

  let form = {
    name: '',
    email: '',
    role: 'user'
  };

  function handleSubmit() {
    console.log('Submitting:', form);
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input bind:value={form.name} placeholder="Name" />

  {#if $canEditEmail}
    <input bind:value={form.email} type="email" placeholder="Email" />
  {/if}

  {#if $canEditRole}
    <select bind:value={form.role}>
      <option value="user">User</option>
      <option value="editor">Editor</option>
      {#if $canSetAdmin}
        <option value="admin">Admin</option>
      {/if}
    </select>
  {/if}

  <button type="submit">Save</button>
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 400px;
  }

  input, select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
</style>
```

### Using Actions

```svelte
<script>
  import { rbacStore } from './stores/rbac';
  import { can, role, cannot } from '@fire-shield/svelte';
</script>

<!-- Only visible to users with post:write permission -->
<button use:can={{ permission: 'post:write', store: rbacStore }}>
  Create Post
</button>

<!-- Only visible to admins -->
<section use:role={{ role: 'admin', store: rbacStore }}>
  <h2>Admin Controls</h2>
  <p>This section is only visible to administrators</p>
</section>

<!-- Only visible to users WITHOUT premium access -->
<div use:cannot={{ permission: 'premium:access', store: rbacStore }}>
  <div class="upgrade-prompt">
    <p>Upgrade to Premium for more features!</p>
    <button>Upgrade Now</button>
  </div>
</div>

<style>
  .upgrade-prompt {
    padding: 1rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
  }
</style>
```

## SvelteKit Integration

### Layout with RBAC

```svelte
<!-- routes/+layout.svelte -->
<script>
  import { rbacStore } from '$lib/stores/rbac';
  import { onMount } from 'svelte';

  const isAdmin = rbacStore.hasRole('admin');

  onMount(async () => {
    // Fetch user on mount
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      rbacStore.user.set(user);
    }
  });
</script>

<nav>
  <a href="/">Home</a>
  {#if $isAdmin}
    <a href="/admin">Admin</a>
  {/if}
</nav>

<slot />
```

### Protected Route

```svelte
<!-- routes/admin/+page.svelte -->
<script>
  import { rbacStore } from '$lib/stores/rbac';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const isAdmin = rbacStore.hasRole('admin');

  onMount(() => {
    if (!$isAdmin) {
      goto('/unauthorized');
    }
  });
</script>

{#if $isAdmin}
  <h1>Admin Dashboard</h1>
  <!-- Admin content -->
{/if}
```

### Server Load Function

```typescript
// routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user || !user.roles.includes('admin')) {
    throw redirect(303, '/unauthorized');
  }

  return {
    user
  };
};
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/svelte';

interface User extends RBACUser {
  email: string;
  name: string;
}

const user: User = {
  id: 'user-1',
  roles: ['editor'],
  email: 'user@example.com',
  name: 'John Doe',
};

rbacStore.user.set(user);
```

## Best Practices

### 1. Use Derived Stores

```typescript
// Create derived stores for commonly used checks
const canEdit = rbacStore.can('post:edit');
const canDelete = rbacStore.can('post:delete');
const isAdmin = rbacStore.hasRole('admin');
```

### 2. Centralize Permission Logic

```typescript
// lib/permissions.ts
import { rbacStore } from './stores/rbac';
import { derived } from 'svelte/store';

export const permissions = {
  canManageUsers: derived(rbacStore.user, ($user) =>
    rbacStore.rbac.hasPermission($user, 'user:manage')
  ),
  canEditPost: (post: Post) =>
    derived(rbacStore.user, ($user) => {
      if (!$user) return false;
      return (
        rbacStore.rbac.hasPermission($user, 'post:edit:any') ||
        (post.authorId === $user.id &&
          rbacStore.rbac.hasPermission($user, 'post:edit:own'))
      );
    }),
};
```

### 3. Use Actions for Declarative UI

```svelte
<!-- Declarative and clean -->
<div use:can={{ permission: 'post:write', store: rbacStore }}>
  <button>Create Post</button>
</div>
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
