# SvelteKit Integration

Fire Shield provides SvelteKit hooks and server-side middleware for full-stack RBAC authorization.

## Features

- Server-side hooks for request protection
- Client-side permission checks
- TypeScript support with `App.Locals` augmentation
- SSR-compatible
- Works with all SvelteKit adapters
- Seamless integration with SvelteKit's load functions

## Installation

```bash
npm install @fire-shield/sveltekit @fire-shield/core
```

## Quick Start

### 1. Initialize RBAC

```typescript
// src/lib/rbac.ts
import { RBAC } from '@fire-shield/core';

export const rbac = new RBAC();

rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);
```

### 2. Setup Hooks

```typescript
// src/hooks.server.ts
import { createRBACHandle } from '@fire-shield/sveltekit';
import { rbac } from '$lib/rbac';

export const handle = createRBACHandle(rbac, {
  getUser: async (event) => {
    // Get user from session/cookie
    const session = await event.locals.getSession();
    return session?.user;
  }
});
```

### 3. Use in Pages

```svelte
<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  const { user, rbac } = $page.data;
  const canManageUsers = rbac.hasPermission(user, 'user:write');
</script>

{#if canManageUsers}
  <button>Create User</button>
{/if}
```

## API

### createRBACHandle(rbac, options)

Creates a SvelteKit hook for RBAC authorization.

**Parameters:**
```typescript
interface RBACHandleOptions {
  getUser?: (event: RequestEvent) => Promise<RBACUser | undefined> | RBACUser | undefined;
  onUnauthorized?: (event: RequestEvent, result: AuthorizationResult) => Response;
}
```

**Example:**
```typescript
// src/hooks.server.ts
import { createRBACHandle } from '@fire-shield/sveltekit';
import { redirect } from '@sveltejs/kit';

export const handle = createRBACHandle(rbac, {
  getUser: async (event) => {
    const sessionId = event.cookies.get('session');
    if (!sessionId) return undefined;

    return await getUserFromSession(sessionId);
  },
  onUnauthorized: (event, result) => {
    throw redirect(303, '/login');
  }
});
```

### requirePermission(permission)

Server-side guard for protecting routes.

**Example:**
```typescript
// src/routes/admin/+page.server.ts
import { requirePermission } from '@fire-shield/sveltekit';

export const load = requirePermission('admin:access', async (event) => {
  // This only runs if user has 'admin:access' permission
  const users = await getUsers();

  return { users };
});
```

### requireRole(role)

Server-side guard for role-based protection.

**Example:**
```typescript
// src/routes/admin/+page.server.ts
import { requireRole } from '@fire-shield/sveltekit';

export const load = requireRole('admin', async (event) => {
  // This only runs if user has 'admin' role
  const settings = await getAdminSettings();

  return { settings };
});
```

## Server-Side Protection

### Protecting Load Functions

```typescript
// src/routes/posts/+page.server.ts
import { requirePermission } from '@fire-shield/sveltekit';

export const load = requirePermission('post:read', async ({ locals }) => {
  const posts = await db.post.findMany();

  return { posts };
});
```

### Protecting Actions

```typescript
// src/routes/posts/+page.server.ts
import { requirePermission } from '@fire-shield/sveltekit';
import { fail } from '@sveltejs/kit';

export const actions = {
  create: requirePermission('post:write', async ({ request, locals }) => {
    const data = await request.formData();
    const title = data.get('title');

    await db.post.create({
      data: { title, authorId: locals.user.id }
    });

    return { success: true };
  }),

  delete: requirePermission('post:delete', async ({ request }) => {
    const data = await request.formData();
    const postId = data.get('postId');

    await db.post.delete({ where: { id: postId } });

    return { success: true };
  })
};
```

### Custom Authorization Logic

```typescript
// src/routes/posts/[id]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const post = await db.post.findUnique({ where: { id: params.id } });

  // Custom authorization: Check if user owns the post or is admin
  const canEdit =
    locals.rbac.hasPermission(locals.user, 'post:edit') &&
    (post.authorId === locals.user.id || locals.rbac.hasRole(locals.user, 'admin'));

  return {
    post,
    canEdit
  };
};
```

## Client-Side Usage

### In Svelte Components

```svelte
<!-- src/routes/posts/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  const { user, rbac } = data;
</script>

<div>
  {#if rbac.hasPermission(user, 'post:write')}
    <button>Create Post</button>
  {/if}

  {#if rbac.hasPermission(user, 'post:delete')}
    <button>Delete All Posts</button>
  {/if}
</div>
```

### Reactive Permission Checks

```svelte
<script lang="ts">
  import { page } from '$app/stores';

  $: user = $page.data.user;
  $: rbac = $page.data.rbac;
  $: canWrite = rbac.hasPermission(user, 'post:write');
  $: isAdmin = rbac.hasRole(user, 'admin');
</script>

{#if canWrite}
  <CreatePostForm />
{/if}

{#if isAdmin}
  <AdminPanel />
{/if}
```

## TypeScript Setup

Augment `App.Locals` for type safety:

```typescript
// src/app.d.ts
import type { RBAC, RBACUser } from '@fire-shield/core';

declare global {
  namespace App {
    interface Locals {
      user?: RBACUser;
      rbac: RBAC;
    }
  }
}

export {};
```

## Layout Load Functions

Share RBAC data across all pages:

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
    rbac: locals.rbac
  };
};
```

Now all pages have access to `user` and `rbac`:

```svelte
<!-- Any page -->
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
  const { user, rbac } = data;
</script>
```

## Form Actions with Authorization

```svelte
<!-- src/routes/posts/create/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if data.rbac.hasPermission(data.user, 'post:write')}
  <form method="POST" use:enhance>
    <input type="text" name="title" required />
    <textarea name="content" required></textarea>
    <button type="submit">Create Post</button>
  </form>
{:else}
  <p>You don't have permission to create posts.</p>
{/if}
```

```typescript
// src/routes/posts/create/+page.server.ts
import { requirePermission } from '@fire-shield/sveltekit';
import { redirect } from '@sveltejs/kit';

export const actions = {
  default: requirePermission('post:write', async ({ request, locals }) => {
    const data = await request.formData();

    await db.post.create({
      data: {
        title: data.get('title'),
        content: data.get('content'),
        authorId: locals.user.id
      }
    });

    throw redirect(303, '/posts');
  })
};
```

## API Routes Protection

```typescript
// src/routes/api/users/+server.ts
import { json } from '@sveltejs/kit';
import { requirePermission } from '@fire-shield/sveltekit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = requirePermission('user:read', async () => {
  const users = await db.user.findMany();
  return json(users);
});

export const POST: RequestHandler = requirePermission('user:write', async ({ request }) => {
  const data = await request.json();
  const user = await db.user.create({ data });
  return json(user, { status: 201 });
});

export const DELETE: RequestHandler = requirePermission('user:delete', async ({ request }) => {
  const { id } = await request.json();
  await db.user.delete({ where: { id } });
  return json({ success: true });
});
```

## Error Handling

```typescript
// src/hooks.server.ts
import { createRBACHandle } from '@fire-shield/sveltekit';
import { error } from '@sveltejs/kit';

export const handle = createRBACHandle(rbac, {
  getUser: async (event) => {
    return await getUserFromSession(event);
  },
  onUnauthorized: (event, result) => {
    throw error(403, {
      message: 'Access Denied',
      reason: result.reason
    });
  }
});
```

## Best Practices

1. **Use server-side protection** - Always protect sensitive operations on the server
2. **Share RBAC in layouts** - Make user and rbac available to all pages via layout load
3. **Type-safe with App.Locals** - Augment App.Locals for TypeScript support
4. **Cache permission checks** - Enable v2.2.0 caching for better performance
5. **Handle unauthorized gracefully** - Provide good error messages and redirects

## Advanced Example

Complete authentication flow with protected routes:

```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createRBACHandle } from '@fire-shield/sveltekit';
import { redirect } from '@sveltejs/kit';

const authHandle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');

  if (sessionId) {
    const user = await getUserFromSession(sessionId);
    event.locals.user = user;
  }

  return resolve(event);
};

const rbacHandle = createRBACHandle(rbac, {
  getUser: (event) => event.locals.user,
  onUnauthorized: () => {
    throw redirect(303, '/login');
  }
});

export const handle = sequence(authHandle, rbacHandle);
```

## Next Steps

- [Svelte Integration](/frameworks/svelte) - Client-side Svelte features
- [Core Concepts](/guide/permissions) - Understanding permissions
- [API Reference](/api/core) - Complete API documentation
