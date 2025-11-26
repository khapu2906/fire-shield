# @fire-shield/trpc

tRPC adapter for Fire Shield RBAC with type-safe middleware and permission helpers.

## Installation

```bash
npm install @fire-shield/trpc @fire-shield/core @trpc/server
```

## Features

- 🔒 **Protected Middleware** - Type-safe permission checking middleware
- 🎯 **Helper Functions** - `checkPermission`, `checkRole`, `checkAnyPermissions`, `checkAllPermissions`
- ⚡ **Zero Config** - Works out of the box with tRPC v10+
- 🎨 **Type-safe** - Full TypeScript support with autocomplete
- 🔄 **Flexible** - Use middleware or manual checks

## Quick Start

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { createProtectedMiddleware } from '@fire-shield/trpc';
import { RBAC } from '@fire-shield/core';
import type { TRPCRBACContext } from '@fire-shield/trpc';

// Create RBAC instance
const rbac = new RBAC({
  preset: {
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
      { name: 'post:write', bit: 4 },
    ],
    roles: [
      { name: 'viewer', permissions: ['user:read'] },
      { name: 'editor', permissions: ['user:read', 'user:write', 'post:write'] },
    ],
  },
});

// Define context type
interface Context extends TRPCRBACContext {
  rbac: RBAC;
  user?: {
    id: string;
    roles: string[];
  };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Create protected procedure with middleware
const protectedProcedure = t.procedure.use(
  createProtectedMiddleware({ permission: 'user:read' })
);

// Use in router
const appRouter = t.router({
  user: {
    list: protectedProcedure.query(() => {
      return getUsers();
    }),
  },
});
```

## Usage

### Protected Middleware

Create middleware with permission requirements:

```typescript
// Single permission
const readUsersProcedure = t.procedure.use(
  createProtectedMiddleware({ permission: 'user:read' })
);

// Role requirement
const adminProcedure = t.procedure.use(
  createProtectedMiddleware({ role: 'admin' })
);

// Any of multiple permissions
const moderatorProcedure = t.procedure.use(
  createProtectedMiddleware({
    anyPermissions: ['post:moderate', 'user:moderate'],
  })
);

// All of multiple permissions
const superAdminProcedure = t.procedure.use(
  createProtectedMiddleware({
    allPermissions: ['user:delete', 'post:delete', 'admin:full'],
  })
);

// Custom error message
const customProcedure = t.procedure.use(
  createProtectedMiddleware({
    permission: 'user:write',
    errorMessage: 'You need write access to perform this action',
  })
);

// Optional authentication
const publicProcedure = t.procedure.use(
  createProtectedMiddleware({
    permission: 'public:read',
    requireAuth: false, // Don't require authentication
  })
);
```

### Helper Functions

Use helpers inside procedures for manual checks:

```typescript
import {
  checkPermission,
  checkRole,
  checkAnyPermissions,
  checkAllPermissions,
} from '@fire-shield/trpc';

const appRouter = t.router({
  user: {
    // Check single permission
    create: t.procedure
      .input(z.object({ name: z.string() }))
      .mutation(({ ctx, input }) => {
        checkPermission(ctx, 'user:write');
        return createUser(input.name);
      }),

    // Check role
    delete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => {
        checkRole(ctx, 'admin');
        return deleteUser(input.id);
      }),

    // Check any permissions
    moderate: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => {
        checkAnyPermissions(ctx, ['user:moderate', 'admin:full']);
        return moderateUser(input.id);
      }),

    // Check all permissions
    permanentDelete: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => {
        checkAllPermissions(ctx, ['user:delete', 'admin:full']);
        return permanentDeleteUser(input.id);
      }),
  },
});
```

### Context Setup

Provide RBAC and user in context:

```typescript
import { createHTTPServer } from '@trpc/server/adapters/standalone';

const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => {
    // Extract user from request (JWT, session, etc.)
    const user = getUserFromRequest(req);

    return {
      rbac,
      user: user
        ? {
            id: user.id,
            roles: user.roles,
          }
        : undefined,
    };
  },
});

server.listen(3000);
```

### Full Example

```typescript
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createProtectedMiddleware, checkPermission } from '@fire-shield/trpc';
import { RBAC } from '@fire-shield/core';
import { z } from 'zod';

// Create RBAC
const rbac = new RBAC({
  preset: {
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
      { name: 'user:delete', bit: 4 },
    ],
    roles: [
      { name: 'viewer', permissions: ['user:read'] },
      { name: 'editor', permissions: ['user:read', 'user:write'] },
      { name: 'admin', permissions: ['user:read', 'user:write', 'user:delete'] },
    ],
  },
});

// Context type
interface Context {
  rbac: RBAC;
  user?: { id: string; roles: string[] };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Create procedures
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(
  createProtectedMiddleware({ requireAuth: true })
);
const adminProcedure = t.procedure.use(createProtectedMiddleware({ role: 'admin' }));

// Define router
const appRouter = t.router({
  // Public
  health: publicProcedure.query(() => ({ status: 'ok' })),

  // Protected
  user: {
    list: protectedProcedure
      .use(createProtectedMiddleware({ permission: 'user:read' }))
      .query(() => {
        return [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ];
      }),

    create: protectedProcedure
      .input(z.object({ name: z.string() }))
      .mutation(({ ctx, input }) => {
        checkPermission(ctx, 'user:write');
        return { id: '3', name: input.name };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        return { success: true };
      }),
  },
});

// Create server
const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => ({
    rbac,
    user: {
      id: 'user1',
      roles: ['editor'],
    },
  }),
});

server.listen(3000);

export type AppRouter = typeof appRouter;
```

## Error Handling

The adapter throws `TRPCError` with specific error codes:

```typescript
{
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_SERVER_ERROR',
  message: string
}
```

Example error handler:

```typescript
import { TRPCError } from '@trpc/server';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add custom error data
        isPermissionError: error.code === 'FORBIDDEN',
      },
    };
  },
});
```

## Advanced Usage

### Combining Multiple Checks

```typescript
const superAdminProcedure = t.procedure
  .use(createProtectedMiddleware({ role: 'admin' }))
  .use(
    createProtectedMiddleware({
      allPermissions: ['user:delete', 'post:delete'],
    })
  );
```

### Conditional Permission Checks

```typescript
const updatePost = t.procedure
  .input(z.object({ id: z.string(), content: z.string() }))
  .mutation(({ ctx, input }) => {
    const post = getPost(input.id);

    // Check if user owns the post
    if (post.authorId === ctx.user?.id) {
      // Owner can edit
      return updatePost(input);
    }

    // Otherwise, check for moderator permission
    checkPermission(ctx, 'post:moderate');
    return updatePost(input);
  });
```

### Dynamic Permission Checks

```typescript
const updateResource = t.procedure
  .input(
    z.object({
      type: z.enum(['user', 'post']),
      id: z.string(),
      data: z.any(),
    })
  )
  .mutation(({ ctx, input }) => {
    // Dynamic permission based on resource type
    const permission = `${input.type}:write`;
    checkPermission(ctx, permission);

    return updateResource(input.type, input.id, input.data);
  });
```

## TypeScript Support

Full type safety with autocomplete:

```typescript
import type { TRPCRBACContext } from '@fire-shield/trpc';

interface MyContext extends TRPCRBACContext {
  db: Database;
  logger: Logger;
}

const t = initTRPC.context<MyContext>().create();

const myProcedure = t.procedure.use(
  createProtectedMiddleware({ permission: 'user:read' })
);

// TypeScript knows about rbac, user, db, logger in ctx
```

## Integration Examples

### With Next.js

```typescript
// src/server/trpc.ts
import { initTRPC } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

export const createContext = (opts: CreateNextContextOptions) => ({
  rbac: myRBACInstance,
  user: getUserFromRequest(opts.req),
});

const t = initTRPC.context<typeof createContext>().create();
```

### With Express

```typescript
import * as trpcExpress from '@trpc/server/adapters/express';
import express from 'express';

const app = express();

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({
      rbac,
      user: req.user,
    }),
  })
);
```

## License

DIB © khapu2906
