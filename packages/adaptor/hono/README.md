# 🛡️ Fire Shield - Hono Adapter

Hono middleware for Fire Shield RBAC authorization (Edge Runtime compatible).

## Installation

```bash
npm install @fire-shield/hono @fire-shield/core
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

// Create adapter
const rbacMiddleware = new HonoRBACAdapter(rbac);

// Add user to context
app.use('*', async (c, next) => {
  c.set('user', { id: 'user-1', roles: ['editor'] });
  await next();
});

// Protect routes with permission check
app.get('/admin/users',
  rbacMiddleware.permission('user:read'),
  (c) => {
    return c.json({ users: [] });
  }
);

// Protect with role check
app.post('/posts',
  rbacMiddleware.role('editor'),
  (c) => {
    return c.json({ success: true });
  }
);

export default app;
```

## Edge Runtime Compatible

Fire Shield Hono adapter works on:
- ✅ Cloudflare Workers
- ✅ Deno Deploy
- ✅ Vercel Edge Functions
- ✅ Netlify Edge Functions

```typescript
// Cloudflare Workers
export default {
  fetch: app.fetch
};

// Deno Deploy
Deno.serve(app.fetch);
```

## API

### `new HonoRBACAdapter(rbac, options?)`

Creates a new Hono adapter instance.

**Options:**
- `getUser?: (c) => RBACUser` - Extract user from context (default: `c.get('user')`)
- `getPermission?: (c) => string` - Extract permission from context (default: from `x-permission` header)
- `getResource?: (c) => string` - Extract resource from context (default: from request path)
- `getAction?: (c) => string` - Extract action from context (default: from HTTP method)
- `onUnauthorized?: (result, c) => Response` - Custom unauthorized handler
- `onError?: (error, c) => Response` - Custom error handler

### Methods

All methods return Hono middleware that can be used directly in routes.

#### `permission(permission: string)`

Middleware to check if user has specific permission.

```typescript
app.get('/admin', rbacMiddleware.permission('admin:access'), handler);
```

#### `role(role: string)`

Middleware to check if user has specific role.

```typescript
app.get('/admin', rbacMiddleware.role('admin'), handler);
```

#### `resourceAction(resource: string, action: string)`

Middleware to check resource:action permission.

```typescript
app.delete('/users/:id', rbacMiddleware.resourceAction('user', 'delete'), handler);
```

#### `all(...permissions: string[])`

Middleware to check if user has ALL specified permissions (AND logic).

```typescript
app.post('/admin/users', rbacMiddleware.all('user:create', 'user:write'), handler);
```

#### `any(...permissions: string[])`

Middleware to check if user has ANY of specified permissions (OR logic).

```typescript
app.get('/dashboard', rbacMiddleware.any('admin:access', 'moderator:access'), handler);
```

#### `middleware(customOptions: Partial<HonoRBACOptions>)`

Create custom middleware with custom options. Useful for route-specific behavior.

```typescript
// Custom permission extraction for specific route
app.get('/api/v1/*',
  rbacMiddleware.middleware({
    getPermission: (c) => c.req.header('x-required-permission'),
    onUnauthorized: (result, c) => c.json({ error: 'Custom error' }, 403)
  }),
  handler
);
```

## Examples

### Custom User Extraction

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  getUser: (c) => c.get('session')?.user || c.get('user')
});
```

### Custom Unauthorized Handler

```typescript
const rbacMiddleware = new HonoRBACAdapter(rbac, {
  onUnauthorized: (result, c) => {
    return c.json({
      error: 'Access Denied',
      required: result.reason,
      user: result.user?.id
    }, 403);
  }
});
```

### Cloudflare Workers Example

```typescript
import { Hono } from 'hono';
import { RBAC } from '@fire-shield/core';
import { HonoRBACAdapter } from '@fire-shield/hono';

const app = new Hono();
const rbac = new RBAC();
const rbacMiddleware = new HonoRBACAdapter(rbac);

rbac.createRole('admin', ['*']);

app.use('*', async (c, next) => {
  // Extract from Cloudflare request
  const apiKey = c.req.header('x-api-key');
  c.set('user', await getUserFromApiKey(apiKey));
  await next();
});

app.get('/admin/*',
  rbacMiddleware.role('admin'),
  (c) => c.json({ admin: true })
);

export default app;
```

### Multi-tenant with Wildcards

```typescript
rbac.createRole('tenant-owner', ['tenant:*']);

app.use('/tenant/:tenantId/*', async (c, next) => {
  const tenantId = c.req.param('tenantId');
  const user = c.get('user');

  // Check if user has access to this tenant
  if (!rbac.hasPermission(user, `tenant:${tenantId}:access`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});
```

### Multiple Permissions with AND/OR Logic

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
app.post('/api/data', rbacMiddleware.middleware({}), handler);
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/fire-shield/fire-shield/tree/main/packages/core)
- [Hono Documentation](https://hono.dev)
- [NPM](https://www.npmjs.com/package/@fire-shield/hono)
