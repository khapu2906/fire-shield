# Hono Integration

Fire Shield provides Hono middleware for RBAC authorization, compatible with edge runtimes like Cloudflare Workers, Deno Deploy, Vercel Edge, and more.

## Features

- Edge runtime compatible (Cloudflare Workers, Deno Deploy, Vercel Edge)
- Lightweight and fast middleware
- Support for permission and role checks
- Flexible configuration options
- TypeScript support

## Installation

```bash
npm install @fire-shield/hono @fire-shield/core hono
```

## Quick Start

```typescript
import { Hono } from 'hono';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

const app = new Hono();
const rbac = new RBAC();

// Setup roles
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);

// Create adapter
const rbacMiddleware = new HonoRBACAdapter(rbac);

// Add user to context
app.use('*', async (c, next) => {
  c.set('user', { id: 'user-1', roles: ['editor'] });
  await next();
});

// Protect routes
app.get('/admin/users',
  rbacMiddleware.permission('user:read'),
  (c) => {
    return c.json({ users: [] });
  }
);

export default app;
```

## API

### new HonoRBACAdapter(rbac, options?)

Creates a new Hono adapter instance.

**Options:**
```typescript
interface HonoRBACOptions {
  getUser?: (c: Context) => RBACUser;
  getPermission?: (c: Context) => string;
  getResource?: (c: Context) => string;
  getAction?: (c: Context) => string;
  onUnauthorized?: (result: AuthorizationResult, c: Context) => Response;
  onError?: (error: Error, c: Context) => Response;
}
```

**Example:**
```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  getUser: (c) => c.get('user'),
  onUnauthorized: (result, c) => {
    return c.json({
      error: 'Access Denied',
      reason: result.reason
    }, 403);
  }
});
```

## Middleware Methods

### permission(permission: string)

Check if user has specific permission:

```typescript
app.get('/admin',
  rbacMiddleware.permission('admin:access'),
  (c) => c.json({ admin: true })
);
```

### role(role: string)

Check if user has specific role:

```typescript
app.get('/admin',
  rbacMiddleware.role('admin'),
  (c) => c.json({ admin: true })
);
```

### resourceAction(resource: string, action: string)

Check resource:action permission:

```typescript
app.delete('/users/:id',
  rbacMiddleware.resourceAction('user', 'delete'),
  (c) => c.json({ deleted: true })
);
```

### all(...permissions: string[])

Check if user has ALL specified permissions (AND logic):

```typescript
app.post('/admin/users',
  rbacMiddleware.all('user:create', 'user:write'),
  (c) => c.json({ created: true })
);
```

### any(...permissions: string[])

Check if user has ANY of specified permissions (OR logic):

```typescript
app.get('/dashboard',
  rbacMiddleware.any('admin:access', 'moderator:access'),
  (c) => c.json({ dashboard: 'data' })
);
```

### middleware(customOptions: Partial&lt;HonoRBACOptions&gt;)

Create custom middleware with route-specific options:

```typescript
app.get('/api/v1/*',
  rbacMiddleware.middleware({
    getPermission: (c) => c.req.header('x-required-permission'),
    onUnauthorized: (result, c) => c.json({ error: 'Custom error' }, 403)
  }),
  handler
);
```

## Edge Runtime Examples

### Cloudflare Workers

```typescript
import { Hono } from 'hono';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

const app = new Hono();
const rbac = new RBAC();
const rbacMiddleware = new HonoRBACAdapter(rbac);

rbac.createRole('admin', ['*']);

// Extract user from Cloudflare request
app.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key');
  const user = await getUserFromApiKey(apiKey);
  c.set('user', user);
  await next();
});

// Protected routes
app.get('/admin/*',
  rbacMiddleware.role('admin'),
  (c) => c.json({ admin: true })
);

export default app;
```

### Deno Deploy

```typescript
import { Hono } from 'hono';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

const app = new Hono();
const rbac = new RBAC();
const rbacMiddleware = new HonoRBACAdapter(rbac);

rbac.createRole('admin', ['*']);

app.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  c.set('user', user);
  await next();
});

app.get('/admin',
  rbacMiddleware.role('admin'),
  (c) => c.json({ data: 'admin data' })
);

Deno.serve(app.fetch);
```

### Vercel Edge Functions

```typescript
import { Hono } from 'hono';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

const app = new Hono();
const rbac = new RBAC();
const rbacMiddleware = new HonoRBACAdapter(rbac);

rbac.createRole('admin', ['*']);

app.get('/admin',
  rbacMiddleware.role('admin'),
  (c) => c.json({ admin: true })
);

export default app;
export const config = {
  runtime: 'edge',
};
```

## Custom Configuration

### Custom User Extraction

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  getUser: (c) => {
    // Try multiple sources
    return c.get('session')?.user || c.get('user') || null;
  }
});
```

### Custom Unauthorized Handler

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  onUnauthorized: (result, c) => {
    return c.json({
      error: 'Access Denied',
      required: result.reason,
      userId: result.user?.id,
      timestamp: Date.now()
    }, 403);
  }
});
```

### Custom Error Handler

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  onError: (error, c) => {
    console.error('RBAC Error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: error.message
    }, 500);
  }
});
```

## Advanced Usage

### Multi-Tenant with Wildcards

```typescript
rbac.createRole('tenant-owner', ['tenant:*']);

app.use('/tenant/:tenantId/*', async (c, next) => {
  const tenantId = c.req.param('tenantId');
  const user = c.get('user');

  // Check tenant-specific permission
  if (!rbac.hasPermission(user, `tenant:${tenantId}:access`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});

// Protected tenant routes
app.get('/tenant/:tenantId/data',
  rbacMiddleware.permission('tenant:data:read'),
  (c) => {
    const tenantId = c.req.param('tenantId');
    return c.json({ tenantId, data: [] });
  }
);
```

### Multiple Permissions (AND/OR)

```typescript
// User must have BOTH permissions (AND)
app.post('/admin/critical',
  rbacMiddleware.all('admin:access', 'critical:write'),
  (c) => c.json({ success: true })
);

// User must have AT LEAST ONE permission (OR)
app.get('/dashboard',
  rbacMiddleware.any('admin:view', 'moderator:view', 'analyst:view'),
  (c) => c.json({ dashboard: 'data' })
);
```

### Dynamic Permission Checking

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  getPermission: (c) => {
    // Extract permission from route metadata
    const route = c.req.path;
    const method = c.req.method.toLowerCase();

    if (route.startsWith('/api/')) {
      return `api:${method}`;
    }

    return undefined;
  }
});

// Will check for 'api:post' permission
app.post('/api/data',
  rbacMiddleware.middleware({}),
  (c) => c.json({ created: true })
);
```

### Resource Ownership

```typescript
app.delete('/posts/:id', async (c) => {
  const user = c.get('user');
  const postId = c.req.param('id');
  const post = await getPost(postId);

  // Check ownership
  const isOwner = post.authorId === user.id;
  const canDelete =
    rbac.hasPermission(user, 'post:delete:any') ||
    (isOwner && rbac.hasPermission(user, 'post:delete:own'));

  if (!canDelete) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await deletePost(postId);
  return c.json({ success: true });
});
```

## Grouping Routes

### Protected Route Group

```typescript
const adminRoutes = new Hono();

// All admin routes require admin role
adminRoutes.use('*', rbacMiddleware.role('admin'));

adminRoutes.get('/users', (c) => c.json({ users: [] }));
adminRoutes.post('/users', (c) => c.json({ created: true }));
adminRoutes.delete('/users/:id', (c) => c.json({ deleted: true }));

// Mount admin routes
app.route('/admin', adminRoutes);
```

### Nested Permissions

```typescript
const apiRoutes = new Hono();

// All API routes require base permission
apiRoutes.use('*', rbacMiddleware.permission('api:access'));

// Additional permissions for specific routes
apiRoutes.get('/data',
  rbacMiddleware.permission('api:read'),
  (c) => c.json({ data: [] })
);

apiRoutes.post('/data',
  rbacMiddleware.permission('api:write'),
  (c) => c.json({ created: true })
);

app.route('/api', apiRoutes);
```

## Audit Logging

```typescript
import { BufferedAuditLogger } from '@fire-shield/core';

const auditLogger = new BufferedAuditLogger(
  async (events) => {
    // Save to KV storage (Cloudflare Workers)
    await KV.put('audit-logs', JSON.stringify(events));

    // Or send to external service
    await fetch('https://api.example.com/audit', {
      method: 'POST',
      body: JSON.stringify(events)
    });
  },
  { maxBufferSize: 50, flushIntervalMs: 3000 }
);

const rbac = new RBAC({ auditLogger });
```

## Authentication Integration

### With JWT

```typescript
import { verify } from '@tsndr/cloudflare-worker-jwt';

app.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const payload = await verify(token, 'secret');
      c.set('user', {
        id: payload.sub,
        roles: payload.roles
      });
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }

  await next();
});
```

### With API Key

```typescript
app.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key');

  if (apiKey) {
    const user = await validateApiKey(apiKey);
    c.set('user', user);
  }

  await next();
});
```

## Error Handling

```typescript
app.onError((err, c) => {
  console.error('Error:', err);

  if (err.message.includes('Forbidden')) {
    return c.json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource'
    }, 403);
  }

  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});
```

## TypeScript Support

```typescript
import type { Context } from 'hono';
import type { RBACUser } from '@fire-shield/core';

interface CustomContext extends Context {
  Variables: {
    user: RBACUser;
  };
}

app.get('/admin', (c: CustomContext) => {
  const user = c.get('user');
  return c.json({ user });
});
```

## Best Practices

### 1. Centralize RBAC Setup

```typescript
// lib/rbac.ts
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

export const rbac = new RBAC();
export const rbacMiddleware = new HonoRBACAdapter(rbac);

// Setup roles
rbac.createRole('admin', ['*']);
rbac.createRole('editor', ['post:*']);
```

### 2. Use Route Groups

```typescript
// Good: Group protected routes
const adminRoutes = new Hono();
adminRoutes.use('*', rbacMiddleware.role('admin'));

// Avoid: Repeat middleware on every route
app.get('/admin/users', rbacMiddleware.role('admin'), handler);
app.post('/admin/users', rbacMiddleware.role('admin'), handler);
```

### 3. Handle Errors Gracefully

```typescript
app.onError((err, c) => {
  console.error('RBAC Error:', err);
  return c.json({ error: 'Forbidden' }, 403);
});
```

### 4. Use TypeScript

```typescript
interface User extends RBACUser {
  email: string;
  name: string;
}

app.use('*', async (c, next) => {
  const user: User = await getUser(c);
  c.set('user', user);
  await next();
});
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
