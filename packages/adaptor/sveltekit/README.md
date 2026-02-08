# @fire-shield/sveltekit

SvelteKit adapter for Fire Shield RBAC - Server-side hooks and page guards.

## Features

- 🔐 **Server Hooks** - RBAC integration in `hooks.server.ts`
- 🛡️ **Page Guards** - Protect routes with permissions/roles
- 🚀 **Load Functions** - Server-side permission checks
- ⚡ **Form Actions** - Protect server actions
- 🔧 **Deny Support** - Full deny permissions support
- 📝 **TypeScript** - Full type safety

## Installation

```bash
npm install @fire-shield/sveltekit
# or
yarn add @fire-shield/sveltekit
# or
pnpm add @fire-shield/sveltekit
```

## Setup

### 1. Configure hooks.server.ts

```typescript
// src/hooks.server.ts
import { RBAC } from '@fire-shield/core';
import { createRBACHandle } from '@fire-shield/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Create RBAC instance
const rbac = new RBAC({
  roles: {
    viewer: { permissions: ['content:read'] },
    editor: {
      permissions: ['content:read', 'content:write'],
      extends: ['viewer']
    },
    admin: {
      permissions: ['*'],
      extends: ['editor']
    },
  },
});

// Create RBAC handle
const rbacHandle = createRBACHandle({
  rbac,
  getUser: async (event) => {
    // Get user from session/cookie/JWT
    const session = await event.locals.getSession();
    if (!session?.user) return undefined;

    return {
      id: session.user.id,
      roles: session.user.roles,
    };
  },
});

// Combine with other handles
export const handle: Handle = sequence(rbacHandle, /* other handles */);
```

### 2. Extend app.d.ts

```typescript
// src/app.d.ts
import type { RBACLocals } from '@fire-shield/sveltekit';

declare global {
  namespace App {
    interface Locals extends RBACLocals {}
  }
}

export {};
```

## Page Protection

### Basic Page Guard

```typescript
// src/routes/admin/+page.server.ts
import { guardPage } from '@fire-shield/sveltekit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // Guard with permission
  guardPage(event, {
    permission: 'admin:access',
    redirectTo: '/login', // Redirect if unauthorized
  });

  return {
    // Your page data
  };
};
```

### Multiple Permissions

```typescript
// src/routes/editor/+page.server.ts
import { guardPage } from '@fire-shield/sveltekit';

export const load: PageServerLoad = async (event) => {
  guardPage(event, {
    allPermissions: ['content:read', 'content:write'],
    errorStatus: 403,
    errorMessage: 'You need both read and write permissions',
  });

  return { /* data */ };
};
```

### Role-Based Guard

```typescript
guardPage(event, {
  role: 'admin',
  redirectTo: '/unauthorized',
});
```

## Protected Load Functions

### Using protectedLoad Helper

```typescript
import { protectedLoad } from '@fire-shield/sveltekit';

export const load = protectedLoad(
  async (event) => {
    // Your load logic here
    return {
      posts: await fetchPosts(),
    };
  },
  {
    permission: 'posts:read',
    redirectTo: '/login',
  }
);
```

### Manual Permission Check

```typescript
import { checkPermission, authorize } from '@fire-shield/sveltekit';

export const load: PageServerLoad = async (event) => {
  const canWrite = checkPermission(event, 'content:write');
  const authResult = authorize(event, 'content:delete');

  return {
    canWrite,
    canDelete: authResult.allowed,
    deleteReason: authResult.reason,
  };
};
```

## Form Actions

### Protected Actions

```typescript
// src/routes/posts/+page.server.ts
import { protectedAction, guardPage } from '@fire-shield/sveltekit';
import type { Actions } from './$types';

export const actions: Actions = {
  create: protectedAction(
    async (event) => {
      const formData = await event.request.formData();
      // Create post logic
      return { success: true };
    },
    {
      permission: 'posts:create',
      redirectTo: '/login',
    }
  ),

  delete: protectedAction(
    async (event) => {
      const formData = await event.request.formData();
      // Delete post logic
      return { success: true };
    },
    {
      permission: 'posts:delete',
      errorStatus: 403,
    }
  ),
};
```

## Deny Permissions

### Deny in Actions

```typescript
import { denyPermission, allowPermission } from '@fire-shield/sveltekit';

export const actions: Actions = {
  banUser: async (event) => {
    guardPage(event, { permission: 'users:ban' });

    const formData = await event.request.formData();
    const userId = formData.get('userId') as string;

    // Deny posts:create for the banned user
    denyPermission(event, 'posts:create');

    return { success: true };
  },

  unbanUser: async (event) => {
    guardPage(event, { permission: 'users:unban' });

    const formData = await event.request.formData();
    const userId = formData.get('userId') as string;

    // Remove deny
    allowPermission(event, 'posts:create');

    return { success: true };
  },
};
```

### Check Denied Permissions

```typescript
import { getDeniedPermissions, guardNotDenied } from '@fire-shield/sveltekit';

export const load: PageServerLoad = async (event) => {
  // Guard: throw if denied
  guardNotDenied(event, 'posts:create', {
    redirectTo: '/banned',
  });

  // Get all denied permissions for display
  const deniedPermissions = getDeniedPermissions(event);

  return {
    deniedPermissions,
  };
};
```

## Complete Example

```typescript
// src/routes/dashboard/+page.server.ts
import {
  guardPage,
  checkPermission,
  authorize,
  getDeniedPermissions,
} from '@fire-shield/sveltekit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  // Guard page - must be authenticated
  guardPage(event, {
    permission: 'dashboard:access',
    redirectTo: '/login',
  });

  // Check various permissions
  const canEditSettings = checkPermission(event, 'settings:edit');
  const canViewAnalytics = checkPermission(event, 'analytics:view');
  const deleteResult = authorize(event, 'content:delete');

  // Get denied permissions
  const deniedPermissions = getDeniedPermissions(event);

  return {
    permissions: {
      canEditSettings,
      canViewAnalytics,
      canDelete: deleteResult.allowed,
    },
    deniedPermissions,
  };
};

export const actions: Actions = {
  updateSettings: async (event) => {
    guardPage(event, {
      permission: 'settings:edit',
      errorStatus: 403,
    });

    // Update settings logic
    return { success: true };
  },
};
```

## API Reference

### createRBACHandle(options)

Create RBAC handle hook for SvelteKit.

```typescript
const rbacHandle = createRBACHandle({
  rbac: RBAC,
  getUser: (event) => Promise<RBACUser | undefined>,
  attachUser?: boolean, // default: true
});
```

### guardPage(event, options)

Guard page with permission/role checks. Throws error or redirects if unauthorized.

```typescript
guardPage(event, {
  permission?: string,
  role?: string,
  anyPermissions?: string[],
  allPermissions?: string[],
  redirectTo?: string,
  errorStatus?: number,
  errorMessage?: string,
  allowUnauthenticated?: boolean,
});
```

### checkPermission(event, permission)

Check if user has permission. Returns boolean.

### checkRole(event, role)

Check if user has role. Returns boolean.

### authorize(event, permission)

Get detailed authorization result.

### protectedLoad(loadFn, guardOptions)

Wrap load function with guard.

### protectedAction(actionFn, guardOptions)

Wrap action with guard.

### Deny Functions

- `denyPermission(event, permission)` - Deny permission for current user
- `allowPermission(event, permission)` - Remove denied permission
- `getDeniedPermissions(event)` - Get all denied permissions
- `guardNotDenied(event, permission, options?)` - Guard: throw if denied

## TypeScript

Full TypeScript support:

```typescript
import type {
  RBACEvent,
  RBACLocals,
  RBACHookOptions,
  PageGuardOptions,
} from '@fire-shield/sveltekit';

export const load: PageServerLoad = async (event: RBACEvent) => {
  // event.locals.rbac and event.locals.user are typed
};
```

## Best Practices

1. **Use guardPage Early** - Guard at the top of load functions
2. **Centralize RBAC Config** - Create RBAC instance once in hooks
3. **Handle Redirects** - Use `redirectTo` for better UX
4. **Check Permissions in Load** - Pass permission states to page
5. **Protect Actions** - Always guard form actions
6. **Use TypeScript** - Get full type safety with RBACEvent

## Performance

- **Server-Side Only** - No client-side overhead
- **Single Instance** - RBAC instance shared across requests
- **Fast Guards** - Minimal overhead in guards
- **Efficient Checks** - O(1) permission checks with bit-based system

## License

DIB

## Repository

[Fire Shield RBAC Monorepo](https://github.com/khapu2906/RBAC)
