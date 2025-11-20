# Express Integration

Fire Shield provides middleware for Express applications to protect routes with RBAC.

## Installation

```bash
npm install @fire-shield/express @fire-shield/core express
```

## Setup

### Basic Setup

```typescript
import express from 'express'
import { RBAC } from '@fire-shield/core'
import { createExpressRBAC } from '@fire-shield/express'

const app = express()
const rbac = new RBAC()

// Define roles
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
rbac.createRole('viewer', ['posts:read'])

// Create RBAC middleware
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user // Get user from request
})

// Use middleware
app.use(rbacMiddleware.attachRBAC())
```

## Middleware

### requirePermission

Protect routes with permission requirements:

```typescript
// Require single permission
app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  (req, res) => {
    res.json({ message: 'Post created' })
  }
)

// Require multiple permissions (all required)
app.delete('/posts/:id',
  rbacMiddleware.requirePermission(['posts:delete', 'posts:own']),
  (req, res) => {
    res.json({ message: 'Post deleted' })
  }
)
```

### requireAnyPermission

Require at least one of multiple permissions:

```typescript
app.get('/admin',
  rbacMiddleware.requireAnyPermission(['admin:access', 'moderator:access']),
  (req, res) => {
    res.json({ message: 'Admin panel' })
  }
)
```

### requireRole

Protect routes with role requirements:

```typescript
// Require single role
app.get('/admin/users',
  rbacMiddleware.requireRole('admin'),
  (req, res) => {
    res.json({ users: [] })
  }
)

// Require multiple roles (all required)
app.post('/admin/critical',
  rbacMiddleware.requireRole(['admin', 'verified']),
  (req, res) => {
    res.json({ message: 'Critical action performed' })
  }
)
```

### requireAnyRole

Require at least one of multiple roles:

```typescript
app.get('/dashboard',
  rbacMiddleware.requireAnyRole(['admin', 'editor', 'viewer']),
  (req, res) => {
    res.json({ dashboard: 'data' })
  }
)
```

## Custom Error Handling

### Default Behavior

By default, Fire Shield returns `403 Forbidden` when permission is denied:

```typescript
// Default response for denied access
{
  error: 'Forbidden',
  message: 'Insufficient permissions'
}
```

### Custom Error Handler

Customize the error response:

```typescript
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user,
  onUnauthorized: (req, res, permission) => {
    res.status(403).json({
      error: 'Access Denied',
      message: `You need ${permission} permission to access this resource`,
      requiredPermission: permission
    })
  }
})
```

### Error Middleware

Use Express error middleware:

```typescript
app.use((err, req, res, next) => {
  if (err.name === 'RBACError') {
    return res.status(403).json({
      error: 'RBAC Error',
      message: err.message,
      permission: err.permission
    })
  }
  next(err)
})
```

## Authentication Integration

### With Passport.js

```typescript
import passport from 'passport'

app.use(passport.initialize())

app.post('/posts',
  passport.authenticate('jwt', { session: false }),
  rbacMiddleware.requirePermission('posts:write'),
  (req, res) => {
    // req.user is set by passport
    res.json({ message: 'Post created' })
  }
)
```

### With Express Session

```typescript
import session from 'express-session'

app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: true
}))

// Attach user to request from session
app.use((req, res, next) => {
  if (req.session.userId) {
    req.user = getUserById(req.session.userId)
  }
  next()
})

// Use RBAC middleware
app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  (req, res) => {
    res.json({ message: 'Post created' })
  }
)
```

### With JWT

```typescript
import jwt from 'jsonwebtoken'

// JWT middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      req.user = jwt.verify(token, 'secret')
    } catch (err) {
      // Invalid token
    }
  }
  next()
})

// RBAC middleware
app.delete('/posts/:id',
  rbacMiddleware.requirePermission('posts:delete'),
  (req, res) => {
    res.json({ message: 'Post deleted' })
  }
)
```

## Programmatic Permission Checks

Access RBAC in route handlers:

```typescript
app.get('/posts/:id', (req, res) => {
  const post = getPost(req.params.id)

  // Check permission programmatically
  if (req.rbac.can('posts:delete')) {
    post.canDelete = true
  }

  if (req.rbac.can('posts:edit')) {
    post.canEdit = true
  }

  res.json(post)
})
```

## Dynamic Permissions

Check permissions based on resource ownership:

```typescript
app.delete('/posts/:id', async (req, res) => {
  const post = await getPost(req.params.id)

  // Check if user owns the post
  const isOwner = post.authorId === req.user.id

  // Check permission
  const canDelete = req.rbac.can('posts:delete') ||
    (isOwner && req.rbac.can('posts:delete:own'))

  if (!canDelete) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await deletePost(req.params.id)
  res.json({ message: 'Post deleted' })
})
```

## Route Organization

### Grouped Routes

```typescript
const adminRouter = express.Router()

// All admin routes require admin role
adminRouter.use(rbacMiddleware.requireRole('admin'))

adminRouter.get('/users', (req, res) => {
  res.json({ users: [] })
})

adminRouter.post('/users', (req, res) => {
  res.json({ message: 'User created' })
})

app.use('/admin', adminRouter)
```

### Nested Permissions

```typescript
const postsRouter = express.Router()

// All routes require read permission
postsRouter.use(rbacMiddleware.requirePermission('posts:read'))

postsRouter.get('/', (req, res) => {
  res.json({ posts: [] })
})

// Additional permission for write
postsRouter.post('/',
  rbacMiddleware.requirePermission('posts:write'),
  (req, res) => {
    res.json({ message: 'Post created' })
  }
)

// Additional permission for delete
postsRouter.delete('/:id',
  rbacMiddleware.requirePermission('posts:delete'),
  (req, res) => {
    res.json({ message: 'Post deleted' })
  }
)

app.use('/posts', postsRouter)
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { Request, Response, NextFunction } from 'express'
import { RBACUser } from '@fire-shield/core'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: RBACUser
      rbac?: {
        can: (permission: string) => boolean
        hasRole: (role: string) => boolean
      }
    }
  }
}

// Type-safe route handler
app.get('/posts', (req: Request, res: Response) => {
  if (req.rbac?.can('posts:write')) {
    // Type-safe access
  }
})
```

## Best Practices

### 1. Protect All Sensitive Routes

```typescript
// ✅ Good: Protected routes
app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  createPost
)

app.delete('/posts/:id',
  rbacMiddleware.requirePermission('posts:delete'),
  deletePost
)

// ❌ Avoid: Unprotected sensitive routes
app.delete('/posts/:id', deletePost)
```

### 2. Use Router-Level Middleware

```typescript
// ✅ Good: Protect entire router
const adminRouter = express.Router()
adminRouter.use(rbacMiddleware.requireRole('admin'))
adminRouter.get('/users', getUsers)
adminRouter.post('/users', createUser)

// ❌ Avoid: Repeat on every route
app.get('/admin/users',
  rbacMiddleware.requireRole('admin'),
  getUsers
)
app.post('/admin/users',
  rbacMiddleware.requireRole('admin'),
  createUser
)
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good: Custom error handling
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user,
  onUnauthorized: (req, res, permission) => {
    logger.warn(`Access denied to ${req.path}`, {
      user: req.user?.id,
      permission
    })
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions'
    })
  }
})
```

### 4. Document Permission Requirements

```typescript
/**
 * Create a new post
 * @route POST /posts
 * @permission posts:write
 * @returns {Post} Created post
 */
app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  createPost
)
```

## Complete Example

```typescript
import express from 'express'
import { RBAC } from '@fire-shield/core'
import { createExpressRBAC } from '@fire-shield/express'

const app = express()
const rbac = new RBAC()

// Setup roles
rbac.createRole('admin', ['*'])
rbac.createRole('editor', ['posts:*', 'comments:*'])
rbac.createRole('viewer', ['posts:read', 'comments:read'])

// RBAC middleware
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user,
  onUnauthorized: (req, res, permission) => {
    res.status(403).json({
      error: 'Forbidden',
      message: `Permission ${permission} required`
    })
  }
})

app.use(express.json())
app.use(rbacMiddleware.attachRBAC())

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Protected routes
app.get('/posts',
  rbacMiddleware.requirePermission('posts:read'),
  (req, res) => {
    res.json({ posts: [] })
  }
)

app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  (req, res) => {
    res.json({ message: 'Post created' })
  }
)

app.delete('/posts/:id',
  rbacMiddleware.requirePermission('posts:delete'),
  (req, res) => {
    res.json({ message: 'Post deleted' })
  }
)

// Admin routes
const adminRouter = express.Router()
adminRouter.use(rbacMiddleware.requireRole('admin'))

adminRouter.get('/users', (req, res) => {
  res.json({ users: [] })
})

adminRouter.post('/users', (req, res) => {
  res.json({ message: 'User created' })
})

app.use('/admin', adminRouter)

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Next Steps

- Explore [Fastify Integration](/frameworks/fastify)
- Learn about [Permissions](/guide/permissions)
- Check out [API Reference](/api/core)
