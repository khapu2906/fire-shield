# Basic Usage Examples

Common patterns and examples for using Fire Shield.

## Simple Blog Application

A basic blog with different user roles.

```typescript
import { RBAC } from '@fire-shield/core'

const rbac = new RBAC()

// Define roles
rbac.createRole('admin', [
  'posts:*',
  'users:*',
  'comments:*',
  'settings:*'
])

rbac.createRole('author', [
  'posts:create',
  'posts:read',
  'posts:update:own',
  'posts:delete:own',
  'comments:read'
])

rbac.createRole('viewer', [
  'posts:read',
  'comments:read'
])

// Set hierarchy
rbac.setRoleHierarchy({
  admin: ['author', 'viewer'],
  author: ['viewer']
})

// Check permissions
const admin = { id: '1', roles: ['admin'] }
const author = { id: '2', roles: ['author'] }
const viewer = { id: '3', roles: ['viewer'] }

// Admin can do everything
console.log(rbac.hasPermission(admin, 'posts:delete'))  // true
console.log(rbac.hasPermission(admin, 'users:manage'))  // true

// Author can create and edit
console.log(rbac.hasPermission(author, 'posts:create'))  // true
console.log(rbac.hasPermission(author, 'posts:delete'))  // false

// Viewer can only read
console.log(rbac.hasPermission(viewer, 'posts:read'))    // true
console.log(rbac.hasPermission(viewer, 'posts:create'))  // false
```

## E-Commerce Application

Product and order management with different roles.

```typescript
const rbac = new RBAC()

// Customer role
rbac.createRole('customer', [
  'products:read',
  'cart:*',
  'orders:create',
  'orders:read:own',
  'profile:update:own'
])

// Store manager
rbac.createRole('manager', [
  'products:*',
  'orders:read',
  'orders:update',
  'inventory:manage',
  'reports:read'
])

// Admin
rbac.createRole('admin', [
  '*' // All permissions
])

// Set hierarchy
rbac.setRoleHierarchy({
  admin: ['manager'],
  manager: ['customer']
})

// Usage
const customer = { id: 'cust-1', roles: ['customer'] }
const manager = { id: 'mgr-1', roles: ['manager'] }

// Customer can manage cart
console.log(rbac.hasPermission(customer, 'cart:add'))      // true
console.log(rbac.hasPermission(customer, 'cart:checkout')) // true

// Manager can manage products
console.log(rbac.hasPermission(manager, 'products:create')) // true
console.log(rbac.hasPermission(manager, 'inventory:manage')) // true

// Manager inherits customer permissions
console.log(rbac.hasPermission(manager, 'cart:add'))       // true
```

## Multi-Tenant SaaS

Tenant-based permissions with workspace isolation.

```typescript
const rbac = new RBAC()

// Workspace owner
rbac.createRole('workspace-owner', [
  'workspace:*',
  'members:*',
  'billing:*',
  'data:*'
])

// Workspace admin
rbac.createRole('workspace-admin', [
  'workspace:read',
  'workspace:update',
  'members:invite',
  'members:remove',
  'data:*'
])

// Workspace member
rbac.createRole('workspace-member', [
  'workspace:read',
  'data:read',
  'data:create',
  'data:update:own'
])

// Guest
rbac.createRole('workspace-guest', [
  'workspace:read',
  'data:read'
])

rbac.setRoleHierarchy({
  'workspace-owner': ['workspace-admin'],
  'workspace-admin': ['workspace-member'],
  'workspace-member': ['workspace-guest']
})

// Check tenant-specific permissions
const owner = { id: '1', roles: ['workspace-owner'] }
const member = { id: '2', roles: ['workspace-member'] }

console.log(rbac.hasPermission(owner, 'billing:update'))   // true
console.log(rbac.hasPermission(member, 'billing:update'))  // false
console.log(rbac.hasPermission(member, 'data:create'))     // true
```

## Content Management System

Hierarchical content permissions.

```typescript
const rbac = new RBAC()

// Super admin
rbac.createRole('super-admin', ['*'])

// Content admin
rbac.createRole('content-admin', [
  'content:*',
  'media:*',
  'categories:*'
])

// Editor
rbac.createRole('editor', [
  'content:read',
  'content:create',
  'content:update',
  'content:publish',
  'media:read',
  'media:upload'
])

// Contributor
rbac.createRole('contributor', [
  'content:read',
  'content:create',
  'content:update:own',
  'media:read'
])

// Reviewer
rbac.createRole('reviewer', [
  'content:read',
  'content:review',
  'content:comment'
])

rbac.setRoleHierarchy({
  'super-admin': ['content-admin'],
  'content-admin': ['editor'],
  'editor': ['contributor']
})

const editor = { id: '1', roles: ['editor'] }
const contributor = { id: '2', roles: ['contributor'] }

// Editor can publish
console.log(rbac.hasPermission(editor, 'content:publish'))      // true

// Contributor cannot publish
console.log(rbac.hasPermission(contributor, 'content:publish')) // false

// Both can create
console.log(rbac.hasPermission(editor, 'content:create'))       // true
console.log(rbac.hasPermission(contributor, 'content:create'))  // true
```

## API Gateway

API access control with rate limiting.

```typescript
const rbac = new RBAC()

// Free tier
rbac.createRole('api-free', [
  'api:v1:read',
  'api:ratelimit:basic' // 100 req/hour
])

// Pro tier
rbac.createRole('api-pro', [
  'api:v1:*',
  'api:v2:read',
  'api:ratelimit:pro', // 1000 req/hour
  'api:analytics:basic'
])

// Enterprise tier
rbac.createRole('api-enterprise', [
  'api:*',
  'api:ratelimit:unlimited',
  'api:analytics:*',
  'api:priority:support'
])

rbac.setRoleHierarchy({
  'api-enterprise': ['api-pro'],
  'api-pro': ['api-free']
})

const freeUser = { id: '1', roles: ['api-free'] }
const proUser = { id: '2', roles: ['api-pro'] }
const enterpriseUser = { id: '3', roles: ['api-enterprise'] }

// Check API access
console.log(rbac.hasPermission(freeUser, 'api:v1:read'))        // true
console.log(rbac.hasPermission(freeUser, 'api:v2:read'))        // false

console.log(rbac.hasPermission(proUser, 'api:v1:write'))        // true
console.log(rbac.hasPermission(proUser, 'api:v2:read'))         // true

console.log(rbac.hasPermission(enterpriseUser, 'api:v2:write')) // true
```

## Resource Ownership

Permission checks based on resource ownership.

```typescript
const rbac = new RBAC()

rbac.createRole('user', [
  'posts:read',
  'posts:create',
  'posts:update:own',
  'posts:delete:own',
  'comments:create',
  'comments:update:own'
])

rbac.createRole('moderator', [
  'posts:read',
  'posts:update',
  'comments:*'
])

// Check ownership in application logic
function canEditPost(user, post) {
  // User owns the post
  if (post.authorId === user.id) {
    return rbac.hasPermission(user, 'posts:update:own')
  }

  // User is moderator
  return rbac.hasPermission(user, 'posts:update')
}

// Example usage
const user = { id: 'user-1', roles: ['user'] }
const moderator = { id: 'mod-1', roles: ['moderator'] }

const myPost = { id: 'post-1', authorId: 'user-1' }
const otherPost = { id: 'post-2', authorId: 'user-2' }

console.log(canEditPost(user, myPost))      // true (owns post)
console.log(canEditPost(user, otherPost))   // false (doesn't own)
console.log(canEditPost(moderator, otherPost)) // true (moderator)
```

## Dynamic Role Assignment

Assign roles based on user attributes or context.

```typescript
const rbac = new RBAC()

rbac.createRole('free', ['app:basic'])
rbac.createRole('pro', ['app:basic', 'app:pro'])
rbac.createRole('enterprise', ['app:*'])

// Assign role based on subscription
function getUserWithRoles(user, subscription) {
  const roles = ['free'] // Default role

  if (subscription.plan === 'pro') {
    roles.push('pro')
  } else if (subscription.plan === 'enterprise') {
    roles.push('enterprise')
  }

  // Add time-based roles
  if (subscription.trial && subscription.trialEndsAt > new Date()) {
    roles.push('trial')
  }

  return {
    ...user,
    roles
  }
}

// Usage
const subscription = { plan: 'pro', trial: false }
const userWithRoles = getUserWithRoles(
  { id: '1', email: 'user@example.com' },
  subscription
)

console.log(rbac.hasPermission(userWithRoles, 'app:pro')) // true
```

## Audit Logging

Track permission checks for compliance.

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core'

const auditLogger = new BufferedAuditLogger(
  async (logs) => {
    // Save to database
    await db.auditLogs.insertMany(logs)

    // Send to logging service
    await analyticsService.track('audit_logs', {
      count: logs.length,
      events: logs
    })
  },
  {
    maxBufferSize: 50,
    flushIntervalMs: 3000
  }
)

const rbac = new RBAC({ auditLogger })

// All permission checks are automatically logged
rbac.hasPermission(user, 'posts:delete')
// Logs: {
//   timestamp: Date,
//   userId: 'user-1',
//   action: 'permission_check',
//   permission: 'posts:delete',
//   result: true/false
// }

// Manually flush logs
await auditLogger.flush()
```

## Testing RBAC

Test your RBAC configuration.

```typescript
import { describe, it, expect } from 'vitest'
import { RBAC } from '@fire-shield/core'

describe('RBAC Configuration', () => {
  const rbac = new RBAC()

  beforeEach(() => {
    rbac.createRole('admin', ['*'])
    rbac.createRole('editor', ['posts:*'])
    rbac.createRole('viewer', ['posts:read'])

    rbac.setRoleHierarchy({
      admin: ['editor'],
      editor: ['viewer']
    })
  })

  it('admin should have all permissions', () => {
    const admin = { id: '1', roles: ['admin'] }

    expect(rbac.hasPermission(admin, 'posts:write')).toBe(true)
    expect(rbac.hasPermission(admin, 'users:delete')).toBe(true)
    expect(rbac.hasPermission(admin, 'anything')).toBe(true)
  })

  it('editor should inherit viewer permissions', () => {
    const editor = { id: '2', roles: ['editor'] }

    expect(rbac.hasPermission(editor, 'posts:read')).toBe(true)
    expect(rbac.hasPermission(editor, 'posts:write')).toBe(true)
  })

  it('viewer should only read', () => {
    const viewer = { id: '3', roles: ['viewer'] }

    expect(rbac.hasPermission(viewer, 'posts:read')).toBe(true)
    expect(rbac.hasPermission(viewer, 'posts:write')).toBe(false)
  })
})
```

## Next Steps

- Learn about [Role Hierarchy](/guide/role-hierarchy)
- Learn about [Wildcards](/guide/wildcards)
- Check [API Reference](/api/core)
