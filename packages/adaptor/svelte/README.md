# 🛡️ Fire Shield - Svelte Adapter

Svelte integration for Fire Shield RBAC authorization with stores, actions, and reactive state.

## Features

- ✅ **Svelte Stores** - Reactive RBAC state with writable and derived stores
- ✅ **Svelte Actions** - `use:can`, `use:role`, `use:cannot` directives
- ✅ **Reactive Permissions** - Automatically update when user changes
- ✅ **TypeScript Support** - Full type safety
- ✅ **Svelte 4 & 5** - Compatible with both versions

## Installation

```bash
pnpm add @fire-shield/svelte @fire-shield/core
```

## Quick Start

### 1. Create RBAC Store

```typescript
// stores/rbac.ts
import { RBAC } from '@fire-shield/core';
import { createRBACStore } from '@fire-shield/svelte';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

export const rbacStore = createRBACStore(rbac, null);
```

### 2. Update User

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  function login() {
    const user = { id: 'user-1', roles: ['editor'] };
    rbacStore.user.set(user);
  }
</script>
```

### 3. Use in Components

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canWrite = rbacStore.can('post:write');
  const isAdmin = rbacStore.hasRole('admin');
</script>

<!-- Reactive display -->
{#if $canWrite}
  <button>Create Post</button>
{/if}

<!-- Using actions -->
<div use:can={{ permission: 'post:write', store: rbacStore }}>
  Create Post Button
</div>
```

## API

### `createRBACStore(rbac, initialUser?)`

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

### Store Methods

#### `can(permission)`

Returns a derived store that checks if user has permission.

```svelte
<script>
  const canWrite = rbacStore.can('post:write');
</script>

{#if $canWrite}
  <button>Create Post</button>
{/if}
```

#### `hasRole(role)`

Returns a derived store that checks if user has role.

```svelte
<script>
  const isAdmin = rbacStore.hasRole('admin');
</script>

{#if $isAdmin}
  <a href="/admin">Admin Panel</a>
{/if}
```

#### `authorize(permission)`

Returns a derived store with full authorization result.

```svelte
<script>
  const result = rbacStore.authorize('post:delete');
</script>

{#if !$result.allowed}
  <p>Access denied: {$result.reason}</p>
{/if}
```

#### `canAll(permissions)`

Returns a derived store that checks if user has all permissions.

```svelte
<script>
  const hasAllPerms = rbacStore.canAll(['post:read', 'post:write', 'post:publish']);
</script>

{#if $hasAllPerms}
  <button>Full Access</button>
{/if}
```

#### `canAny(permissions)`

Returns a derived store that checks if user has any permission.

```svelte
<script>
  const hasAnyPerm = rbacStore.canAny(['post:read', 'post:write']);
</script>

{#if $hasAnyPerm}
  <a href="/posts">View Posts</a>
{/if}
```

### Svelte Actions

#### `use:can`

Conditionally render element based on permission.

```svelte
<!-- Remove element if no permission -->
<div use:can={{ permission: 'post:write', store: rbacStore }}>
  Create Post
</div>

<!-- Hide element if no permission (keeps in DOM) -->
<div use:can={{ permission: 'post:write', hide: true, store: rbacStore }}>
  Create Post
</div>
```

#### `use:role`

Conditionally render element based on role.

```svelte
<!-- Remove element if no role -->
<div use:role={{ role: 'admin', store: rbacStore }}>
  Admin Panel
</div>

<!-- Hide element if no role -->
<div use:role={{ role: 'admin', hide: true, store: rbacStore }}>
  Admin Panel
</div>
```

#### `use:cannot`

Inverse conditional rendering (show when permission is NOT present).

```svelte
<div use:cannot={{ permission: 'post:write', store: rbacStore }}>
  You need editor access to create posts
</div>
```

## Examples

### User Login/Logout

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  let isLoggedIn = false;

  function login(role) {
    const user = { id: `user-${Date.now()}`, roles: [role] };
    rbacStore.user.set(user);
    isLoggedIn = true;
  }

  function logout() {
    rbacStore.user.set(null);
    isLoggedIn = false;
  }
</script>

{#if isLoggedIn}
  <button on:click={logout}>Logout</button>
{:else}
  <button on:click={() => login('editor')}>Login as Editor</button>
  <button on:click={() => login('admin')}>Login as Admin</button>
{/if}
```

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
```

### Post Actions

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canEdit = rbacStore.can('post:write');
  const canDelete = rbacStore.can('post:delete');
  const canPublish = rbacStore.can('post:publish');
</script>

<div class="actions">
  {#if $canEdit}
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
  <!-- Admin content -->
</section>

<!-- Only visible to users WITHOUT premium access -->
<div use:cannot={{ permission: 'premium:access', store: rbacStore }}>
  <p>Upgrade to Premium for more features!</p>
  <button>Upgrade Now</button>
</div>
```

### Form Fields

```svelte
<script>
  import { rbacStore } from './stores/rbac';

  const canEditEmail = rbacStore.can('user:edit:email');
  const canEditRole = rbacStore.can('user:edit:role');
  const canSetAdmin = rbacStore.hasRole('admin');
</script>

<form>
  <input name="name" placeholder="Name" />

  {#if $canEditEmail}
    <input name="email" type="email" placeholder="Email" />
  {/if}

  {#if $canEditRole}
    <select name="role">
      <option value="user">User</option>
      <option value="editor">Editor</option>
      {#if $canSetAdmin}
        <option value="admin">Admin</option>
      {/if}
    </select>
  {/if}

  <button type="submit">Save</button>
</form>
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

## Learn More

- [@fire-shield/core Documentation](https://npmjs.com/package/@fire-shield/core)
- [Svelte Stores Documentation](https://svelte.dev/docs/svelte-store)
- [Svelte Actions Documentation](https://svelte.dev/docs/svelte-action)

## License

DIB © Fire Shield Team
