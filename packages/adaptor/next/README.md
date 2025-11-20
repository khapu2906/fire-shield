# 🛡️ Fire Shield - Next.js Adapter

Next.js integration for Fire Shield RBAC authorization.

## Installation

```bash
pnpm add @fire-shield/next @fire-shield/core
```

## Quick Start

### App Router (Next.js 13+)

```typescript
// app/api/auth/rbac.ts
import { RBAC } from '@fire-shield/core';

export const rbac = new RBAC();

rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
```

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rbac } from './app/api/auth/rbac';

export function middleware(request: NextRequest) {
  const user = getUserFromRequest(request); // Your auth logic

  // Check permission
  if (!rbac.hasPermission(user, 'admin:access')) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

### API Routes

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rbac } from '@/app/api/auth/rbac';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUser(request);

  // Check permission
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
```

### Server Components

```typescript
// app/admin/page.tsx
import { rbac } from '@/app/api/auth/rbac';
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
    </div>
  );
}
```

### Pages Router (Next.js 12)

```typescript
// pages/api/admin/users.ts
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

## API

### `new NextRBACAdapter(rbac, options?)`

Creates a new Next.js adapter instance.

**Options:**
- `getUser?: (req) => RBACUser | Promise<RBACUser>` - Extract user from request
- `onUnauthorized?: (result, req, res) => void` - Custom unauthorized handler
- `onError?: (error, req, res) => void` - Custom error handler

### Methods

#### `withPermission(permission, handler)`

HOC to protect API routes with permission check.

```typescript
import { withPermission } from '@fire-shield/next';

export default withPermission('user:read', async (req, res) => {
  const users = await getUsers();
  res.json({ users });
});
```

#### `withRole(role, handler)`

HOC to protect API routes with role check.

```typescript
import { withRole } from '@fire-shield/next';

export default withRole('admin', async (req, res) => {
  const stats = await getAdminStats();
  res.json({ stats });
});
```

## Examples

### Middleware Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rbac } from './lib/rbac';

const protectedRoutes = {
  '/admin': 'admin:access',
  '/api/users': 'user:read',
  '/api/posts': 'post:read',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const user = getUserFromRequest(request);

  // Find matching protected route
  for (const [route, permission] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!rbac.hasPermission(user, permission)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}
```

### Server Actions (Next.js 13+)

```typescript
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
```

### Client Component Protection

```typescript
// components/AdminButton.tsx
'use client';

import { useUser } from '@/hooks/useUser';
import { rbac } from '@/lib/rbac';

export function AdminButton() {
  const user = useUser();

  if (!rbac.hasPermission(user, 'admin:access')) {
    return null; // Hide button
  }

  return (
    <button onClick={handleAdminAction}>
      Admin Action
    </button>
  );
}
```

### Audit Logging with Next.js

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core';
import { db } from '@/lib/database';

const auditLogger = new BufferedAuditLogger(
  async (events) => {
    await db.auditLogs.insertMany(events.map(e => ({
      ...e,
      createdAt: new Date(e.timestamp)
    })));
  },
  { maxBufferSize: 100, flushIntervalMs: 5000 }
);

export const rbac = new RBAC({ auditLogger });
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [Next.js Documentation](https://nextjs.org/docs)
- [NPM](https://www.npmjs.com/package/@fire-shield/next)
