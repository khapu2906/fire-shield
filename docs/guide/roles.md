# Roles

Roles group permissions together and can be assigned to users.

## What are Roles?

A role is a collection of permissions that can be assigned to users. Instead of granting permissions individually, you assign roles to users.

```typescript
// Without roles - tedious
user.permissions = ['posts:read', 'posts:write', 'comments:read', 'comments:write']

// With roles - clean
user.roles = ['editor']
rbac.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write'])
```

## Creating Roles

### Basic Role Creation

```typescript
import { RBAC } from '@fire-shield/core'

const rbac = new RBAC()

// Create role with permissions
rbac.createRole('viewer', [
  'posts:read',
  'comments:read'
])

rbac.createRole('editor', [
  'posts:read',
  'posts:write',
  'posts:publish',
  'comments:read',
  'comments:write'
])

rbac.createRole('admin', [
  'posts:*',
  'comments:*',
  'users:*',
  'settings:*'
])
```

### Role with Wildcards

```typescript
// All post permissions
rbac.createRole('post-admin', ['posts:*'])

// All permissions (superuser)
rbac.createRole('superuser', ['*'])
```

## Assigning Roles to Users

```typescript
const user = {
  id: 'user-123',
  roles: ['editor']
}

// Check permissions
rbac.hasPermission(user, 'posts:write')  // ✅ true
rbac.hasPermission(user, 'users:delete') // ❌ false
```

### Multiple Roles

Users can have multiple roles:

```typescript
const user = {
  id: 'user-123',
  roles: ['editor', 'moderator']
}

// Has permissions from both roles
rbac.createRole('editor', ['posts:write'])
rbac.createRole('moderator', ['comments:moderate'])

rbac.hasPermission(user, 'posts:write')       // ✅ true
rbac.hasPermission(user, 'comments:moderate') // ✅ true
```

## Modifying Roles

### Adding Permissions

```typescript
// Grant additional permissions to a role
rbac.grant('editor', ['posts:delete'])

// Now editors can delete posts
rbac.hasPermission({ roles: ['editor'] }, 'posts:delete') // ✅ true
```

### Removing Permissions

```typescript
// Revoke permissions from a role
rbac.revoke('editor', ['posts:delete'])

// Editors can no longer delete posts
rbac.hasPermission({ roles: ['editor'] }, 'posts:delete') // ❌ false
```

### Deleting Roles

```typescript
// Remove a role completely
rbac.deleteRole('editor')
```

## Role Hierarchy

Create inheritance chains between roles:

```typescript
rbac.setRoleHierarchy({
  admin: ['editor', 'moderator'],
  editor: ['viewer'],
  moderator: ['viewer']
})

// Admin inherits all permissions from editor, moderator, and viewer
const admin = { id: '1', roles: ['admin'] }
rbac.hasPermission(admin, 'posts:read')  // ✅ true (from viewer)
rbac.hasPermission(admin, 'posts:write') // ✅ true (from editor)
```

[Learn more about Role Hierarchy →](/guide/role-hierarchy)

## Common Role Patterns

### Content Management System

```typescript
// Viewer - can only read
rbac.createRole('viewer', [
  'posts:read',
  'comments:read'
])

// Author - can create and edit own content
rbac.createRole('author', [
  'posts:read',
  'posts:create',
  'posts:update:own',
  'comments:read',
  'comments:create'
])

// Editor - can edit all content
rbac.createRole('editor', [
  'posts:read',
  'posts:create',
  'posts:update',
  'posts:publish',
  'comments:read',
  'comments:write',
  'comments:moderate'
])

// Admin - full control
rbac.createRole('admin', [
  'posts:*',
  'comments:*',
  'users:*',
  'settings:*'
])
```

### SaaS Application

```typescript
// Free tier
rbac.createRole('free', [
  'projects:read',
  'projects:create:limited',
  'api:read:ratelimited'
])

// Pro tier
rbac.createRole('pro', [
  'projects:*',
  'teams:read',
  'api:read',
  'api:write:limited'
])

// Enterprise tier
rbac.createRole('enterprise', [
  'projects:*',
  'teams:*',
  'api:*',
  'billing:manage',
  'support:priority'
])
```

### Organization Structure

```typescript
// Team member
rbac.createRole('member', [
  'team:read',
  'projects:read',
  'tasks:read',
  'tasks:write:assigned'
])

// Team lead
rbac.createRole('lead', [
  'team:read',
  'projects:*',
  'tasks:*',
  'reports:read'
])

// Department manager
rbac.createRole('manager', [
  'department:read',
  'teams:*',
  'projects:*',
  'budgets:read',
  'reports:*'
])
```

## Dynamic Role Assignment

Roles can be assigned/removed at runtime:

```typescript
const user = {
  id: 'user-123',
  roles: ['viewer']
}

// Promote user
function promoteUser(user, newRole) {
  if (!user.roles.includes(newRole)) {
    user.roles.push(newRole)
  }
}

promoteUser(user, 'editor')
// user.roles = ['viewer', 'editor']

// Demote user
function demoteUser(user, role) {
  user.roles = user.roles.filter(r => r !== role)
}

demoteUser(user, 'viewer')
// user.roles = ['editor']
```

## Role Checking

Check if user has a specific role:

```typescript
const user = { id: '1', roles: ['editor', 'moderator'] }

// Check single role
function hasRole(user, role) {
  return user.roles.includes(role)
}

hasRole(user, 'editor')    // ✅ true
hasRole(user, 'admin')     // ❌ false

// Check any of multiple roles
function hasAnyRole(user, roles) {
  return roles.some(role => user.roles.includes(role))
}

hasAnyRole(user, ['admin', 'editor'])  // ✅ true

// Check all roles
function hasAllRoles(user, roles) {
  return roles.every(role => user.roles.includes(role))
}

hasAllRoles(user, ['editor', 'moderator'])  // ✅ true
hasAllRoles(user, ['editor', 'admin'])      // ❌ false
```

## Best Practices

### 1. Use Descriptive Names

```typescript
// ✅ Good - clear purpose
rbac.createRole('content-editor', [...])
rbac.createRole('billing-admin', [...])

// ❌ Avoid - unclear
rbac.createRole('role1', [...])
rbac.createRole('special-user', [...])
```

### 2. Keep Roles Focused

```typescript
// ✅ Good - focused roles
rbac.createRole('post-editor', ['posts:*'])
rbac.createRole('user-manager', ['users:*'])

// ❌ Avoid - too broad
rbac.createRole('everything', ['*'])
```

### 3. Use Role Hierarchy

```typescript
// ✅ Good - clear hierarchy
rbac.createRole('viewer', ['read:*'])
rbac.createRole('editor', ['read:*', 'write:*'])
rbac.createRole('admin', ['*'])
rbac.setRoleHierarchy({
  admin: ['editor'],
  editor: ['viewer']
})

// ❌ Avoid - duplicate permissions
rbac.createRole('viewer', ['read:*'])
rbac.createRole('editor', ['read:*', 'write:*']) // Duplicates viewer permissions
```

### 4. Plan for Growth

```typescript
// ✅ Good - extensible
rbac.createRole('basic-user', ['app:read'])
rbac.createRole('power-user', ['app:read', 'app:advanced'])
rbac.createRole('admin', ['app:*'])

// Easy to add new tiers later
rbac.createRole('premium-user', ['app:read', 'app:advanced', 'app:premium'])
```

## TypeScript Support

Full type safety for roles:

```typescript
// Define role types
type Role = 'admin' | 'editor' | 'viewer'

interface User {
  id: string
  roles: Role[]
}

const user: User = {
  id: '123',
  roles: ['editor'] // ✅ Type-safe
  // roles: ['invalid'] // ❌ Type error
}
```

## Next Steps

- Learn about [Role Hierarchy](/guide/role-hierarchy)
- Master [Permissions](/guide/permissions)
- Explore [Wildcards](/guide/wildcards)
