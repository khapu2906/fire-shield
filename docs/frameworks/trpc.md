# tRPC Integration

Fire Shield provides type-safe tRPC middleware for end-to-end type-safe RBAC authorization.

## Features

- Type-safe permission checks
- Procedure-level authorization
- Context-based authorization
- Input validation with authorization
- Full TypeScript inference
- Works with all tRPC adapters (Next.js, Express, Fastify, etc.)

## Installation

```bash
npm install @fire-shield/trpc @fire-shield/core @trpc/server
```

## Quick Start

### 1. Setup RBAC

```typescript
// src/server/rbac.ts
import { RBAC } from '@fire-shield/core';

export const rbac = new RBAC();

rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);
```

### 2. Create RBAC Context

```typescript
// src/server/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { rbac } from './rbac';

export async function createContext({ req, res }: CreateNextContextOptions) {
  const user = await getUserFromRequest(req);

  return {
    req,
    res,
    rbac,
    user
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### 3. Create Protected Procedures

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { requirePermission, requireRole } from '@fire-shield/trpc';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedures
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Permission-based procedure
export const permissionProcedure = (permission: string) =>
  protectedProcedure.use(requirePermission(permission));

// Role-based procedure
export const roleProcedure = (role: string) =>
  protectedProcedure.use(requireRole(role));
```

### 4. Use in Routers

```typescript
// src/server/routers/posts.ts
import { z } from 'zod';
import { router, publicProcedure, permissionProcedure } from '../trpc';

export const postsRouter = router({
  // Public: Anyone can list posts
  list: publicProcedure.query(async () => {
    return await db.post.findMany();
  }),

  // Protected: Requires 'post:read' permission
  getById: permissionProcedure('post:read')
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.post.findUnique({ where: { id: input.id } });
    }),

  // Protected: Requires 'post:write' permission
  create: permissionProcedure('post:write')
    .input(
      z.object({
        title: z.string(),
        content: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.post.create({
        data: {
          ...input,
          authorId: ctx.user.id
        }
      });
    }),

  // Protected: Requires 'post:delete' permission
  delete: permissionProcedure('post:delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.post.delete({ where: { id: input.id } });
      return { success: true };
    })
});
```

## API

### requirePermission(permission)

tRPC middleware that checks for a specific permission.

**Example:**
```typescript
export const protectedQuery = publicProcedure.use(requirePermission('resource:read'));
```

### requireRole(role)

tRPC middleware that checks for a specific role.

**Example:**
```typescript
export const adminQuery = publicProcedure.use(requireRole('admin'));
```

### createRBACMiddleware(options)

Create custom RBAC middleware with options.

**Parameters:**
```typescript
interface RBACMiddlewareOptions {
  getUser?: (ctx: any) => RBACUser | undefined;
  getRBAC?: (ctx: any) => RBAC;
  onUnauthorized?: (result: AuthorizationResult, ctx: any) => void;
}
```

**Example:**
```typescript
import { createRBACMiddleware } from '@fire-shield/trpc';

const customAuth = createRBACMiddleware({
  getUser: (ctx) => ctx.session?.user,
  getRBAC: (ctx) => ctx.rbac,
  onUnauthorized: (result, ctx) => {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: result.reason
    });
  }
});

export const customProcedure = publicProcedure.use(customAuth('permission:check'));
```

## Usage with Next.js

```typescript
// pages/api/trpc/[trpc].ts
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext
});
```

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { postsRouter } from './posts';
import { usersRouter } from './users';

export const appRouter = router({
  posts: postsRouter,
  users: usersRouter
});

export type AppRouter = typeof appRouter;
```

## Client Usage

```typescript
// src/utils/trpc.ts
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      url: '/api/trpc'
    };
  }
});
```

```tsx
// pages/posts.tsx
import { trpc } from '@/utils/trpc';

export default function PostsPage() {
  // Type-safe queries with automatic auth
  const { data: posts } = trpc.posts.list.useQuery();
  const createPost = trpc.posts.create.useMutation();

  return (
    <div>
      <button
        onClick={() =>
          createPost.mutate({
            title: 'New Post',
            content: 'Content here'
          })
        }
      >
        Create Post
      </button>

      {posts?.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

## Dynamic Authorization

For complex authorization logic:

```typescript
export const postsRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const post = await db.post.findUnique({ where: { id: input.id } });

      // Check if user owns the post or is admin
      const canEdit =
        post.authorId === ctx.user.id ||
        ctx.rbac.hasRole(ctx.user, 'admin') ||
        ctx.rbac.hasPermission(ctx.user, 'post:edit-any');

      if (!canEdit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own posts'
        });
      }

      return await db.post.update({
        where: { id: input.id },
        data: input
      });
    })
});
```

## Role-Based Procedures

```typescript
// Admin-only procedures
export const adminRouter = router({
  stats: roleProcedure('admin').query(async () => {
    return await getAdminStatistics();
  }),

  deleteUser: roleProcedure('admin')
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await db.user.delete({ where: { id: input.userId } });
      return { success: true };
    })
});
```

## Multiple Permissions

Require multiple permissions:

```typescript
import { TRPCError } from '@trpc/server';

export const multiPermissionProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const requiredPermissions = ['post:write', 'post:publish'];

  const hasAll = ctx.rbac.hasAllPermissions(ctx.user, requiredPermissions);

  if (!hasAll) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Missing required permissions'
    });
  }

  return next({ ctx });
});
```

## Batch Operations with Authorization

```typescript
export const postsRouter = router({
  deleteMany: permissionProcedure('post:delete')
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await db.post.deleteMany({
        where: { id: { in: input.ids } }
      });
      return { deleted: input.ids.length };
    })
});
```

## Subscription Authorization

```typescript
export const postsRouter = router({
  onPostCreated: permissionProcedure('post:subscribe')
    .subscription(() => {
      return observable<Post>((emit) => {
        const onPost = (post: Post) => emit.next(post);
        eventEmitter.on('post:created', onPost);

        return () => {
          eventEmitter.off('post:created', onPost);
        };
      });
    })
});
```

## Error Handling

Custom error messages:

```typescript
import { TRPCError } from '@trpc/server';

export const permissionProcedureWithError = (permission: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.rbac.hasPermission(ctx.user, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing required permission: ${permission}`,
        cause: {
          permission,
          user: ctx.user.id,
          roles: ctx.user.roles
        }
      });
    }

    return next({ ctx });
  });
```

## Nested Routers with Authorization

```typescript
// Admin router - all procedures require admin role
const adminProcedure = roleProcedure('admin');

export const adminRouter = router({
  users: router({
    list: adminProcedure.query(() => db.user.findMany()),
    create: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(({ input }) => db.user.create({ data: input })),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => db.user.delete({ where: { id: input.id } }))
  }),

  settings: router({
    get: adminProcedure.query(() => getSettings()),
    update: adminProcedure
      .input(z.record(z.any()))
      .mutation(({ input }) => updateSettings(input))
  })
});
```

## Best Practices

1. **Use middleware for common checks** - DRY authorization logic
2. **Leverage TypeScript** - Get type-safe permission strings
3. **Cache permission results** - Enable v2.2.0 caching for performance
4. **Validate inputs with Zod** - Combine auth with validation
5. **Use nested routers** - Organize by permission requirements
6. **Provide clear errors** - Help clients understand access issues

## Complete Example

```typescript
// src/server/rbac.ts
import { RBAC } from '@fire-shield/core';

export const rbac = new RBAC({
  enableCache: true,
  cacheTTL: 60000
});

rbac.createRole('admin', ['*']);
rbac.createRole('editor', ['post:*', 'category:read']);
rbac.createRole('user', ['post:read', 'post:write-own']);

// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { requirePermission, requireRole } from '@fire-shield/trpc';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const permissionProcedure = (permission: string) =>
  protectedProcedure.use(requirePermission(permission));

export const roleProcedure = (role: string) =>
  protectedProcedure.use(requireRole(role));

// src/server/routers/posts.ts
import { z } from 'zod';
import { router, publicProcedure, permissionProcedure } from '../trpc';

export const postsRouter = router({
  list: publicProcedure.query(async () => {
    return await db.post.findMany({ where: { published: true } });
  }),

  getById: permissionProcedure('post:read')
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.post.findUnique({ where: { id: input.id } });
    }),

  create: permissionProcedure('post:write')
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.post.create({
        data: { ...input, authorId: ctx.user.id }
      });
    }),

  delete: permissionProcedure('post:delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.post.delete({ where: { id: input.id } });
      return { success: true };
    })
});

// src/server/routers/_app.ts
import { router } from '../trpc';
import { postsRouter } from './posts';

export const appRouter = router({
  posts: postsRouter
});

export type AppRouter = typeof appRouter;
```

## Next Steps

- [GraphQL Integration](/frameworks/graphql) - GraphQL with RBAC
- [Core Concepts](/guide/permissions) - Understanding permissions
- [API Reference](/api/core) - Complete API documentation
