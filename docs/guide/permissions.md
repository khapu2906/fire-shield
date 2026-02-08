# Permissions

Permissions are the foundation of Fire Shield's access control system.

## What are Permissions?

A permission is a string that represents an action a user can perform on a resource. Permissions typically follow a `resource:action` pattern:

```typescript
'posts:read'    // Read posts
'posts:write'   // Write/create posts
'posts:delete'  // Delete posts
'users:manage'  // Manage users
```

## Permission Format

### Basic Format

```
resource:action
```

Examples:
- `posts:read`
- `comments:write`
- `settings:update`

### Nested Resources

Use colons to create hierarchical permissions:

```
admin:users:read
admin:users:write
admin:users:delete
admin:settings:write
```

### Wildcard Permissions

Use `*` to grant all actions on a resource:

```typescript
'posts:*'      // All post actions
'admin:*'      // All admin actions
'*:read'       // Read all resources
'*'            // All permissions (superuser)
```

[Learn more about wildcards →](/guide/wildcards)

## Checking Permissions

### Basic Check

```typescript
import { RBAC } from '@fire-shield/core'

const rbac = new RBAC()
rbac.createRole('editor', ['posts:read', 'posts:write'])

const user = { id: '1', roles: ['editor'] }

// Check single permission
if (rbac.hasPermission(user, 'posts:write')) {
  console.log('User can write posts')
}

// Returns boolean
const canDelete = rbac.hasPermission(user, 'posts:delete') // false
const canRead = rbac.hasPermission(user, 'posts:read')     // true
```

### Multiple Permissions

Check if user has all required permissions:

```typescript
const permissions = ['posts:read', 'posts:write', 'posts:publish']

const hasAll = permissions.every(permission =>
  rbac.hasPermission(user, permission)
)
```

Check if user has any of the permissions:

```typescript
const hasAny = permissions.some(permission =>
  rbac.hasPermission(user, permission)
)
```

## Permission Naming Conventions

### Recommended Patterns

**CRUD Operations:**
```typescript
'posts:create'
'posts:read'
'posts:update'
'posts:delete'
```

**Domain-Specific Actions:**
```typescript
'posts:publish'
'posts:archive'
'posts:restore'
'comments:approve'
'comments:moderate'
```

**Administrative Actions:**
```typescript
'users:manage'
'roles:assign'
'settings:configure'
'system:admin'
```

### Best Practices

1. **Be Specific**
   ```typescript
   // ✅ Good
   'posts:publish'
   'posts:archive'

   // ❌ Avoid
   'posts:action1'
   'posts:action2'
   ```

2. **Use Consistent Naming**
   ```typescript
   // ✅ Good - consistent pattern
   'posts:read'
   'posts:write'
   'posts:delete'

   // ❌ Avoid - inconsistent
   'posts:read'
   'posts:create'
   'posts:remove'
   ```

3. **Keep Hierarchy Logical**
   ```typescript
   // ✅ Good - clear hierarchy
   'admin:users:read'
   'admin:users:write'
   'admin:settings:read'

   // ❌ Avoid - confusing hierarchy
   'users:admin:read'
   'settings:read:admin'
   ```

## Permission Matching

Fire Shield uses exact matching for permissions:

```typescript
rbac.createRole('editor', ['posts:write'])

const user = { id: '1', roles: ['editor'] }

// Exact match - works
rbac.hasPermission(user, 'posts:write')  // ✅ true

// Different action - doesn't match
rbac.hasPermission(user, 'posts:read')   // ❌ false

// Different resource - doesn't match
rbac.hasPermission(user, 'comments:write') // ❌ false
```

### Wildcard Matching

Wildcards provide flexible matching:

```typescript
rbac.createRole('admin', ['posts:*'])

const admin = { id: '1', roles: ['admin'] }

// All of these match
rbac.hasPermission(admin, 'posts:read')    // ✅ true
rbac.hasPermission(admin, 'posts:write')   // ✅ true
rbac.hasPermission(admin, 'posts:delete')  // ✅ true
rbac.hasPermission(admin, 'posts:anything') // ✅ true
```

## Dynamic Permissions

Permissions can be granted dynamically at runtime:

```typescript
const rbac = new RBAC()

// Start with basic role
rbac.createRole('user', ['posts:read'])

// Add more permissions later
rbac.grant('user', ['comments:read', 'comments:write'])

// Remove permissions
rbac.revoke('user', ['comments:write'])
```

## Permission Objects

For advanced use cases, you can use permission objects:

```typescript
interface Permission {
  resource: string
  action: string
  conditions?: {
    ownerId?: string
    status?: string
    // Custom conditions
  }
}
```

## Common Patterns

### Content Management

```typescript
rbac.createRole('author', [
  'posts:create',
  'posts:read',
  'posts:update:own',  // Can only update own posts
])

rbac.createRole('editor', [
  'posts:create',
  'posts:read',
  'posts:update',
  'posts:publish',
])

rbac.createRole('admin', [
  'posts:*',
  'users:*',
  'settings:*',
])
```

### Multi-tenant Applications

```typescript
rbac.createRole('tenant-admin', [
  'tenant:settings:write',
  'tenant:users:manage',
  'tenant:billing:view',
])

rbac.createRole('tenant-member', [
  'tenant:data:read',
  'tenant:data:write',
])
```

### API Access

```typescript
rbac.createRole('api-consumer', [
  'api:read',
  'api:ratelimit:standard',
])

rbac.createRole('api-premium', [
  'api:read',
  'api:write',
  'api:ratelimit:premium',
])
```

## Next Steps

- Learn about [Roles](/guide/roles)
- Master [Wildcards](/guide/wildcards)
- Explore [Role Hierarchy](/guide/role-hierarchy)
