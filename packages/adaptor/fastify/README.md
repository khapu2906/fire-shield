# 🛡️ Fire Shield - Fastify Adapter

Fastify plugin for Fire Shield RBAC authorization.

## Installation

```bash
npm install @fire-shield/fastify @fire-shield/core
```

## Quick Start

```typescript
import Fastify from 'fastify';
import { RBAC } from '@fire-shield/core';
import { FastifyRBACAdapter } from '@fire-shield/fastify';

const fastify = Fastify();
const rbac = new RBAC();

// Setup roles
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

// Create adapter and register plugin
const rbacPlugin = new FastifyRBACAdapter(rbac);
fastify.register(rbacPlugin.register(rbac));

// Add user to request
fastify.addHook('preHandler', (request, reply, done) => {
  request.user = { id: 'user-1', roles: ['editor'] };
  done();
});

// Protect routes with permission check
fastify.get('/admin/users', {
  preHandler: rbacPlugin.permission('user:read')
}, async (request, reply) => {
  return { users: [] };
});

// Protect with role check
fastify.post('/posts', {
  preHandler: rbacPlugin.role('editor')
}, async (request, reply) => {
  return { success: true };
});

fastify.listen({ port: 3000 });
```

## API

### `new FastifyRBACAdapter(rbac, options?)`

Creates a new Fastify adapter instance.

**Options:**
- `getUser?: (request) => RBACUser` - Extract user from request
- `onUnauthorized?: (result, request, reply) => void` - Custom unauthorized handler
- `onError?: (error, request, reply) => void` - Custom error handler

### Methods

#### `register(rbac)`

Returns Fastify plugin registration function.

```typescript
fastify.register(rbacPlugin.register(rbac));
```

#### `permission(permission: string)`

Hook to check if user has specific permission.

```typescript
fastify.get('/admin', {
  preHandler: rbacPlugin.permission('admin:access')
}, handler);
```

#### `role(role: string)`

Hook to check if user has specific role.

```typescript
fastify.get('/admin', {
  preHandler: rbacPlugin.role('admin')
}, handler);
```

#### `resourceAction(resource: string, action: string)`

Hook to check resource:action permission.

```typescript
fastify.delete('/users/:id', {
  preHandler: rbacPlugin.resourceAction('user', 'delete')
}, handler);
```

## Examples

### Custom User Extraction

```typescript
const rbacPlugin = new FastifyRBACAdapter(rbac, {
  getUser: (request) => request.session?.user || request.user
});
```

### Custom Unauthorized Handler

```typescript
const rbacPlugin = new FastifyRBACAdapter(rbac, {
  onUnauthorized: (result, request, reply) => {
    reply.status(403).send({
      error: 'Access Denied',
      required: result.reason,
      user: result.user?.id
    });
  }
});
```

### Route-Specific Permissions

```typescript
fastify.register(async (fastify) => {
  // All routes in this context require admin role
  fastify.addHook('preHandler', rbacPlugin.role('admin'));

  fastify.get('/users', handler);
  fastify.post('/users', handler);
  fastify.delete('/users/:id', handler);
});
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [Documentation](https://github.com/khapu2906/fire-shield#readme)
- [NPM](https://www.npmjs.com/package/@fire-shield/fastify)
