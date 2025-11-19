# 🛡️ Fire Shield - Express Adapter

Express.js middleware for Fire Shield RBAC authorization.

## Installation

```bash
npm install @fire-shield/express @fire-shield/core
```

## Quick Start

```typescript
import express from 'express';
import { RBAC } from '@fire-shield/core';
import { ExpressRBACAdapter } from '@fire-shield/express';

const app = express();
const rbac = new RBAC();

// Setup roles
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

// Create adapter
const rbacMiddleware = new ExpressRBACAdapter(rbac);

// Add user to request
app.use((req, res, next) => {
  req.user = { id: 'user-1', roles: ['editor'] };
  next();
});

// Protect routes with permission check
app.get('/admin/users',
  rbacMiddleware.permission('user:read'),
  (req, res) => {
    res.json({ users: [] });
  }
);

// Protect with role check
app.post('/posts',
  rbacMiddleware.role('editor'),
  (req, res) => {
    res.json({ success: true });
  }
);

app.listen(3000);
```

## API

### `new ExpressRBACAdapter(rbac, options?)`

Creates a new Express adapter instance.

**Options:**
- `getUser?: (req) => RBACUser` - Extract user from request
- `onUnauthorized?: (result, req, res, next) => void` - Custom unauthorized handler
- `onError?: (error, req, res, next) => void` - Custom error handler

### Methods

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

## Examples

### Custom User Extraction

```typescript
const rbacMiddleware = new ExpressRBACAdapter(rbac, {
  getUser: (req) => req.session?.user || req.user
});
```

### Custom Unauthorized Handler

```typescript
const rbacMiddleware = new ExpressRBACAdapter(rbac, {
  onUnauthorized: (result, req, res, next) => {
    res.status(403).json({
      error: 'Access Denied',
      required: result.reason,
      user: result.user?.id
    });
  }
});
```

### Wildcard Permissions

```typescript
rbac.createRole('admin', ['*']); // All permissions

app.use('/admin/*',
  rbacMiddleware.role('admin'),
  adminRouter
);
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [Documentation](https://github.com/khapu2906/fire-shield#readme)
- [NPM](https://www.npmjs.com/package/@fire-shield/express)
