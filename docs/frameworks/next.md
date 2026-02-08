# Next.js Integration

Fire Shield provides seamless integration with Next.js for both App Router (Next.js 13+) and Pages Router (Next.js 12).

## Installation

```bash
npm install @fire-shield/next @fire-shield/core
```

## Setup

### Initialize RBAC

```typescript
// lib/rbac.ts
import { RBAC } from '@fire-shield/core';

export const rbac = new RBAC();

// Define roles
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);

// Set role hierarchy
rbac.getRoleHierarchy().setRoleLevel('admin', 10);
rbac.getRoleHierarchy().setRoleLevel('editor', 5);
rbac.getRoleHierarchy().setRoleLevel('viewer', 1);
```

## App Router (Next.js 13+)

### Middleware Protection

Protect routes using Next.js middleware:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rbac } from './lib/rbac';
import { getUser } from './lib/auth';

export function middleware(request: NextRequest) {
  const user = getUser(request);

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!rbac.hasPermission(user, 'admin:access')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

### Route-Based Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rbac } from './lib/rbac';

const protectedRoutes = {
  '/admin': 'admin:access',
  '/posts/create': 'post:write',
  '/users': 'user:read',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const user = getUserFromRequest(request);

  for (const [route, permission] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!rbac.hasPermission(user, permission)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}
```

### Server Components

Check permissions in server components:

```typescript
// app/admin/page.tsx
import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const user = await getUser();

  if (!rbac.hasPermission(user, 'admin:access')) {
    redirect('/unauthorized');
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin content */}
    </div>
  );
}
```

### API Routes

Protect API routes with permission checks:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUser(request);

  // Check permission with detailed result
  const result = rbac.authorize(user, 'user:read');
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Forbidden', reason: result.reason },
      { status: 403 }
    );
  }

  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);

  if (!rbac.hasPermission(user, 'user:create')) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const newUser = await createUser(body);
  return NextResponse.json({ user: newUser });
}
```

### Server Actions

Use RBAC in server actions:

```typescript
// app/actions/users.ts
'use server';

import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function deleteUser(userId: string) {
  const user = await getUser();

  // Check permission
  if (!rbac.hasPermission(user, 'user:delete')) {
    throw new Error('Forbidden: Missing user:delete permission');
  }

  await db.users.delete(userId);
  revalidatePath('/admin/users');

  return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
  const user = await getUser();

  // Check multiple permissions
  if (!rbac.hasAllPermissions(user, ['user:update', 'user:role:change'])) {
    throw new Error('Insufficient permissions');
  }

  await db.users.update(userId, { role: newRole });
  revalidatePath('/admin/users');

  return { success: true };
}
```

### Client Component Protection

Hide/show UI elements based on permissions:

```typescript
// components/AdminButton.tsx
'use client';

import { useUser } from '@/hooks/useUser';
import { rbac } from '@/lib/rbac';

export function AdminButton() {
  const user = useUser();

  if (!rbac.hasPermission(user, 'admin:access')) {
    return null;
  }

  return (
    <button onClick={handleAdminAction}>
      Admin Panel
    </button>
  );
}
```

```typescript
// components/PostActions.tsx
'use client';

import { useUser } from '@/hooks/useUser';
import { rbac } from '@/lib/rbac';

export function PostActions({ postId }: { postId: string }) {
  const user = useUser();

  return (
    <div>
      {rbac.hasPermission(user, 'post:read') && (
        <button onClick={() => viewPost(postId)}>View</button>
      )}

      {rbac.hasPermission(user, 'post:write') && (
        <button onClick={() => editPost(postId)}>Edit</button>
      )}

      {rbac.hasPermission(user, 'post:delete') && (
        <button onClick={() => deletePost(postId)}>Delete</button>
      )}
    </div>
  );
}
```

## Pages Router (Next.js 12)

### API Routes

```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getUser(req);

  if (!rbac.hasPermission(user, 'user:read')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const users = await getUsers();
  res.json({ users });
}
```

### HOC for Route Protection

```typescript
// lib/withPermission.ts
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { rbac } from './rbac';
import { getUser } from './auth';

export function withPermission(
  permission: string,
  getServerSidePropsFunc?: GetServerSideProps
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const user = await getUser(context);

    if (!rbac.hasPermission(user, permission)) {
      return {
        redirect: {
          destination: '/unauthorized',
          permanent: false,
        },
      };
    }

    if (getServerSidePropsFunc) {
      return getServerSidePropsFunc(context);
    }

    return { props: {} };
  };
}
```

**Usage:**
```typescript
// pages/admin/users.tsx
import { withPermission } from '@/lib/withPermission';

export const getServerSideProps = withPermission('user:read', async () => {
  const users = await getUsers();
  return { props: { users } };
});

export default function UsersPage({ users }) {
  return (
    <div>
      <h1>Users</h1>
      {/* Render users */}
    </div>
  );
}
```

### API Route Wrapper

```typescript
// lib/withAPIPermission.ts
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { rbac } from './rbac';
import { getUser } from './auth';

export function withAPIPermission(
  permission: string,
  handler: NextApiHandler
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await getUser(req);

    if (!rbac.hasPermission(user, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return handler(req, res);
  };
}
```

**Usage:**
```typescript
// pages/api/admin/users.ts
import { withAPIPermission } from '@/lib/withAPIPermission';

export default withAPIPermission('user:read', async (req, res) => {
  const users = await getUsers();
  res.json({ users });
});
```

## Authentication Integration

### With NextAuth.js

```typescript
// lib/auth.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from './authOptions';
import type { RBACUser } from '@fire-shield/core';

export async function getUser(): Promise<RBACUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    roles: session.user.roles || [],
  };
}
```

```typescript
// middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rbac } from './lib/rbac';

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const user = token
    ? { id: token.sub as string, roles: token.roles as string[] }
    : null;

  if (!user || !rbac.hasPermission(user, 'admin:access')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

## Audit Logging

### Database Audit Logger

```typescript
// lib/auditLogger.ts
import { BufferedAuditLogger } from '@fire-shield/core';
import { db } from '@/lib/database';

export const auditLogger = new BufferedAuditLogger(
  async (events) => {
    await db.auditLogs.insertMany(
      events.map((event) => ({
        type: event.type,
        userId: event.userId,
        permission: event.permission,
        allowed: event.allowed,
        reason: event.reason,
        context: event.context,
        createdAt: new Date(event.timestamp),
      }))
    );
  },
  {
    maxBufferSize: 100,
    flushIntervalMs: 5000,
  }
);
```

```typescript
// lib/rbac.ts
import { RBAC } from '@fire-shield/core';
import { auditLogger } from './auditLogger';

export const rbac = new RBAC({ auditLogger });
```

### API Route for Audit Logs

```typescript
// app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  const user = await getUser(request);

  if (!rbac.hasPermission(user, 'audit:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const logs = await db.auditLogs.find().sort({ createdAt: -1 }).limit(100);
  return NextResponse.json({ logs });
}
```

## Dynamic Permissions

Check permissions based on resource ownership:

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rbac } from '@/lib/rbac';
import { getUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser(request);
  const post = await getPost(params.id);

  // Check if user owns the post
  const isOwner = post.authorId === user.id;

  // Check permission with ownership
  const canDelete =
    rbac.hasPermission(user, 'post:delete:any') ||
    (isOwner && rbac.hasPermission(user, 'post:delete:own'));

  if (!canDelete) {
    return NextResponse.json(
      { error: 'You do not have permission to delete this post' },
      { status: 403 }
    );
  }

  await deletePost(params.id);
  return NextResponse.json({ success: true });
}
```

## Best Practices

### 1. Centralize Permission Checks

```typescript
// lib/permissions.ts
import { rbac } from './rbac';
import type { RBACUser } from '@fire-shield/core';

export const permissions = {
  canManageUsers: (user: RBACUser) => rbac.hasPermission(user, 'user:manage'),
  canEditPost: (user: RBACUser, post: Post) =>
    rbac.hasPermission(user, 'post:edit:any') ||
    (post.authorId === user.id && rbac.hasPermission(user, 'post:edit:own')),
  canDeletePost: (user: RBACUser, post: Post) =>
    rbac.hasPermission(user, 'post:delete:any') ||
    (post.authorId === user.id && rbac.hasPermission(user, 'post:delete:own')),
};
```

### 2. Use TypeScript for Type Safety

```typescript
// types/permissions.ts
export type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'post:read'
  | 'post:write'
  | 'post:delete'
  | 'admin:access';

export type Role = 'admin' | 'editor' | 'viewer';
```

### 3. Create Reusable Middleware

```typescript
// lib/middleware/requirePermission.ts
import { NextRequest, NextResponse } from 'next/server';
import { rbac } from '../rbac';
import { getUser } from '../auth';

export function requirePermission(permission: string) {
  return async (request: NextRequest) => {
    const user = await getUser(request);

    if (!rbac.hasPermission(user, permission)) {
      return NextResponse.json(
        { error: 'Forbidden', required: permission },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/core';

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

rbac.hasPermission(user, 'post:write');
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
