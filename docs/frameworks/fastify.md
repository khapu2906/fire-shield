# Fastify Integration

Fire Shield provides plugins and hooks for Fastify applications to protect routes with RBAC.

## Installation

```bash
npm install @fire-shield/fastify @fire-shield/core fastify
```

## Setup

### Basic Setup

```typescript
import Fastify from 'fastify'
import { RBAC } from '@fire-shield/core'
import { createFastifyRBAC } from '@fire-shield/fastify'

const fastify = Fastify()
const rbac = new RBAC()

// Define roles
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
rbac.createRole('viewer', ['posts:read'])

// Create RBAC plugin
const { rbacPlugin, requirePermission, requireRole } = createFastifyRBAC(rbac, {
  getUser: (request) => request.user
})

// Register plugin
fastify.register(rbacPlugin)
```

## Route Protection

### requirePermission

Protect routes with permission requirements:

```typescript
// Single permission
fastify.post('/posts', {
  preHandler: requirePermission('posts:write')
}, async (request, reply) => {
  return { message: 'Post created' }
})

// Multiple permissions (all required)
fastify.delete('/posts/:id', {
  preHandler: requirePermission(['posts:delete', 'posts:own'])
}, async (request, reply) => {
  return { message: 'Post deleted' }
})
```

### requireAnyPermission

Require at least one of multiple permissions:

```typescript
fastify.get('/admin', {
  preHandler: requireAnyPermission(['admin:access', 'moderator:access'])
}, async (request, reply) => {
  return { message: 'Admin panel' }
})
```

### requireRole

Protect routes with role requirements:

```typescript
// Single role
fastify.get('/admin/users', {
  preHandler: requireRole('admin')
}, async (request, reply) => {
  return { users: [] }
})

// Multiple roles (all required)
fastify.post('/admin/critical', {
  preHandler: requireRole(['admin', 'verified'])
}, async (request, reply) => {
  return { message: 'Critical action performed' }
})
```

### requireAnyRole

Require at least one of multiple roles:

```typescript
fastify.get('/dashboard', {
  preHandler: requireAnyRole(['admin', 'editor', 'viewer'])
}, async (request, reply) => {
  return { dashboard: 'data' }
})
```

## Custom Error Handling

### Default Behavior

By default, Fire Shield throws a Fastify error with `403 Forbidden`:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### Custom Error Handler

Customize the error response:

```typescript
const { rbacPlugin, requirePermission } = createFastifyRBAC(rbac, {
  getUser: (request) => request.user,
  onUnauthorized: (request, reply, permission) => {
    reply.code(403).send({
      error: 'Access Denied',
      message: `You need ${permission} permission`,
      requiredPermission: permission
    })
  }
})
```

### Error Hook

Use Fastify error hooks:

```typescript
fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 403) {
    request.log.warn('RBAC access denied', {
      user: request.user?.id,
      path: request.url
    })
  }

  reply.send(error)
})
```

## Authentication Integration

### With JWT

```typescript
import fastifyJwt from '@fastify/jwt'

// Register JWT plugin
fastify.register(fastifyJwt, {
  secret: 'your-secret-key'
})

// Authentication decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Use authentication and RBAC together
fastify.post('/posts', {
  preHandler: [
    fastify.authenticate,
    requirePermission('posts:write')
  ]
}, async (request, reply) => {
  return { message: 'Post created' }
})
```

### With Session

```typescript
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'

fastify.register(fastifyCookie)
fastify.register(fastifySession, {
  secret: 'a-secret-with-minimum-length-of-32-characters',
  cookie: { secure: false }
})

// Attach user from session
fastify.addHook('preHandler', async (request, reply) => {
  if (request.session.userId) {
    request.user = await getUserById(request.session.userId)
  }
})

// Protected route
fastify.delete('/posts/:id', {
  preHandler: requirePermission('posts:delete')
}, async (request, reply) => {
  return { message: 'Post deleted' }
})
```

## Programmatic Permission Checks

Access RBAC in route handlers:

```typescript
fastify.get('/posts/:id', async (request, reply) => {
  const post = await getPost(request.params.id)

  // Check permissions programmatically
  const response = {
    ...post,
    canEdit: request.rbac.can('posts:edit'),
    canDelete: request.rbac.can('posts:delete'),
    canPublish: request.rbac.can('posts:publish')
  }

  return response
})
```

## Route Organization

### Grouped Routes

```typescript
// Admin routes plugin
async function adminRoutes(fastify, options) {
  // All admin routes require admin role
  fastify.addHook('preHandler', requireRole('admin'))

  fastify.get('/users', async (request, reply) => {
    return { users: [] }
  })

  fastify.post('/users', async (request, reply) => {
    return { message: 'User created' }
  })
}

fastify.register(adminRoutes, { prefix: '/admin' })
```

### Nested Permissions

```typescript
// Posts routes plugin
async function postsRoutes(fastify, options) {
  // All routes require read permission
  fastify.addHook('preHandler', requirePermission('posts:read'))

  fastify.get('/', async (request, reply) => {
    return { posts: [] }
  })

  // Additional permission for write
  fastify.post('/', {
    preHandler: requirePermission('posts:write')
  }, async (request, reply) => {
    return { message: 'Post created' }
  })

  // Additional permission for delete
  fastify.delete('/:id', {
    preHandler: requirePermission('posts:delete')
  }, async (request, reply) => {
    return { message: 'Post deleted' }
  })
}

fastify.register(postsRoutes, { prefix: '/posts' })
```

## Dynamic Permissions

Check permissions based on resource ownership:

```typescript
fastify.delete('/posts/:id', async (request, reply) => {
  const post = await getPost(request.params.id)

  // Check if user owns the post
  const isOwner = post.authorId === request.user.id

  // Check permission
  const canDelete = request.rbac.can('posts:delete') ||
    (isOwner && request.rbac.can('posts:delete:own'))

  if (!canDelete) {
    return reply.code(403).send({ error: 'Forbidden' })
  }

  await deletePost(request.params.id)
  return { message: 'Post deleted' }
})
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { RBACUser } from '@fire-shield/core'

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user?: RBACUser
    rbac?: {
      can: (permission: string) => boolean
      hasRole: (role: string) => boolean
    }
  }
}

// Type-safe route handler
fastify.get<{
  Params: { id: string }
}>('/posts/:id', async (request, reply) => {
  if (request.rbac?.can('posts:edit')) {
    // Type-safe access
  }
  return { id: request.params.id }
})
```

## Best Practices

### 1. Use Hooks for Route Groups

```typescript
// ✅ Good: Apply to all routes in plugin
async function adminRoutes(fastify) {
  fastify.addHook('preHandler', requireRole('admin'))

  fastify.get('/users', getUsers)
  fastify.post('/users', createUser)
  fastify.delete('/users/:id', deleteUser)
}

// ❌ Avoid: Repeat on every route
fastify.get('/admin/users', {
  preHandler: requireRole('admin')
}, getUsers)
fastify.post('/admin/users', {
  preHandler: requireRole('admin')
}, createUser)
```

### 2. Chain Handlers

```typescript
// ✅ Good: Multiple handlers in array
fastify.post('/posts', {
  preHandler: [
    fastify.authenticate,
    requirePermission('posts:write'),
    validatePostData
  ]
}, createPost)

// ✅ Also good: Single combined handler
fastify.post('/posts', {
  preHandler: requirePermission('posts:write')
}, createPost)
```

### 3. Handle Errors Properly

```typescript
// ✅ Good: Custom error handling
const { rbacPlugin } = createFastifyRBAC(rbac, {
  getUser: (request) => request.user,
  onUnauthorized: (request, reply, permission) => {
    request.log.warn({
      path: request.url,
      user: request.user?.id,
      permission
    }, 'RBAC access denied')

    reply.code(403).send({
      error: 'Forbidden',
      message: 'Insufficient permissions'
    })
  }
})
```

### 4. Document Routes

```typescript
fastify.post('/posts', {
  schema: {
    description: 'Create a new post',
    tags: ['posts'],
    summary: 'Create post',
    security: [{ bearerAuth: [] }]
  },
  preHandler: requirePermission('posts:write')
}, async (request, reply) => {
  return { message: 'Post created' }
})
```

## OpenAPI/Swagger Integration

Document permission requirements in OpenAPI:

```typescript
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'

fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API Documentation',
      version: '1.0.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
})

fastify.register(fastifySwaggerUI, {
  routePrefix: '/documentation'
})

// Document permission requirements
fastify.post('/posts', {
  schema: {
    description: 'Create a new post (requires posts:write permission)',
    tags: ['posts'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      403: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  preHandler: requirePermission('posts:write')
}, async (request, reply) => {
  return { message: 'Post created' }
})
```

## Complete Example

```typescript
import Fastify from 'fastify'
import { RBAC } from '@fire-shield/core'
import { createFastifyRBAC } from '@fire-shield/fastify'
import fastifyJwt from '@fastify/jwt'

const fastify = Fastify({
  logger: true
})

const rbac = new RBAC()

// Setup roles
rbac.createRole('admin', ['*'])
rbac.createRole('editor', ['posts:*', 'comments:*'])
rbac.createRole('viewer', ['posts:read', 'comments:read'])

// JWT plugin
fastify.register(fastifyJwt, {
  secret: 'your-secret-key'
})

// RBAC plugin
const { rbacPlugin, requirePermission, requireRole } = createFastifyRBAC(rbac, {
  getUser: (request) => request.user,
  onUnauthorized: (request, reply, permission) => {
    reply.code(403).send({
      error: 'Forbidden',
      message: `Permission ${permission} required`
    })
  }
})

fastify.register(rbacPlugin)

// Authentication decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Public route
fastify.get('/health', async () => {
  return { status: 'ok' }
})

// Protected routes
fastify.get('/posts', {
  preHandler: [
    fastify.authenticate,
    requirePermission('posts:read')
  ]
}, async () => {
  return { posts: [] }
})

fastify.post('/posts', {
  preHandler: [
    fastify.authenticate,
    requirePermission('posts:write')
  ]
}, async () => {
  return { message: 'Post created' }
})

fastify.delete('/posts/:id', {
  preHandler: [
    fastify.authenticate,
    requirePermission('posts:delete')
  ]
}, async () => {
  return { message: 'Post deleted' }
})

// Admin routes
async function adminRoutes(fastify) {
  fastify.addHook('preHandler', [
    fastify.authenticate,
    requireRole('admin')
  ])

  fastify.get('/users', async () => {
    return { users: [] }
  })

  fastify.post('/users', async () => {
    return { message: 'User created' }
  })
}

fastify.register(adminRoutes, { prefix: '/admin' })

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
  console.log('Server running on http://localhost:3000')
})
```

## Next Steps

- Explore [Express Integration](/frameworks/express)
- Learn about [Permissions](/guide/permissions)
- Check out [API Reference](/api/core)
