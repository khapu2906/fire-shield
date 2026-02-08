# Wildcards

Wildcards provide flexible and powerful permission patterns.

## What are Wildcards?

Wildcards use the `*` symbol to match multiple permissions with a single pattern. Instead of granting each permission individually, you can use wildcards to grant groups of permissions.

```typescript
// Without wildcards - tedious
rbac.createRole('admin', [
  'posts:read',
  'posts:write',
  'posts:delete',
  'posts:publish',
  'posts:archive'
  // ... many more
])

// With wildcards - clean
rbac.createRole('admin', ['posts:*'])
```

## Wildcard Patterns

### Resource Wildcard

Grant all actions on a specific resource:

```typescript
rbac.createRole('post-admin', ['posts:*'])

const admin = { id: '1', roles: ['post-admin'] }

// All post actions are allowed
rbac.hasPermission(admin, 'posts:read')    // ✅ true
rbac.hasPermission(admin, 'posts:write')   // ✅ true
rbac.hasPermission(admin, 'posts:delete')  // ✅ true
rbac.hasPermission(admin, 'posts:anything') // ✅ true
```

### Action Wildcard

Grant specific action across all resources:

```typescript
rbac.createRole('reader', ['*:read'])

const reader = { id: '1', roles: ['reader'] }

// Can read all resources
rbac.hasPermission(reader, 'posts:read')    // ✅ true
rbac.hasPermission(reader, 'comments:read') // ✅ true
rbac.hasPermission(reader, 'users:read')    // ✅ true

// Cannot perform other actions
rbac.hasPermission(reader, 'posts:write')   // ❌ false
```

### Full Wildcard

Grant all permissions (superuser):

```typescript
rbac.createRole('superuser', ['*'])

const superuser = { id: '1', roles: ['superuser'] }

// Everything is allowed
rbac.hasPermission(superuser, 'posts:read')    // ✅ true
rbac.hasPermission(superuser, 'posts:delete')  // ✅ true
rbac.hasPermission(superuser, 'users:manage')  // ✅ true
rbac.hasPermission(superuser, 'anything:goes') // ✅ true
```

### Nested Wildcards

Use wildcards with hierarchical permissions:

```typescript
rbac.createRole('admin', ['admin:*'])

const admin = { id: '1', roles: ['admin'] }

// All admin actions are allowed
rbac.hasPermission(admin, 'admin:users:read')     // ✅ true
rbac.hasPermission(admin, 'admin:users:write')    // ✅ true
rbac.hasPermission(admin, 'admin:settings:write') // ✅ true
rbac.hasPermission(admin, 'admin:logs:view')      // ✅ true

// Non-admin actions are not allowed
rbac.hasPermission(admin, 'posts:read')           // ❌ false
```

## Wildcard Matching Rules

### Exact Match Priority

Explicit permissions take priority over wildcards:

```typescript
rbac.createRole('editor', [
  'posts:*',
  '!posts:delete'  // Explicitly deny delete
])

// Note: Explicit denials are handled at application level
// Fire Shield returns true for posts:delete due to posts:*
// You need to check denials separately
```

### Partial Wildcards

Wildcards only match the segment they're in:

```typescript
rbac.createRole('role', ['admin:users:*'])

const user = { id: '1', roles: ['role'] }

// Matches within admin:users namespace
rbac.hasPermission(user, 'admin:users:read')   // ✅ true
rbac.hasPermission(user, 'admin:users:write')  // ✅ true

// Doesn't match other namespaces
rbac.hasPermission(user, 'admin:settings:read') // ❌ false
rbac.hasPermission(user, 'users:read')          // ❌ false
```

## Common Patterns

### Admin Roles

```typescript
// Full system admin
rbac.createRole('system-admin', ['*'])

// Module-specific admins
rbac.createRole('user-admin', ['users:*'])
rbac.createRole('content-admin', ['posts:*', 'comments:*'])
rbac.createRole('billing-admin', ['billing:*', 'invoices:*'])
```

### Read-Only Access

```typescript
// Read everything
rbac.createRole('auditor', ['*:read'])

// Read specific modules
rbac.createRole('reporter', [
  'analytics:*:read',
  'reports:*:read',
  'logs:read'
])
```

### Tiered Access

```typescript
// Basic tier - limited access
rbac.createRole('basic', [
  'app:read',
  'profile:write:own'
])

// Pro tier - more features
rbac.createRole('pro', [
  'app:read',
  'app:advanced:*',
  'profile:*',
  'export:*'
])

// Enterprise tier - full access
rbac.createRole('enterprise', ['*'])
```

## Combining Wildcards and Specific Permissions

Mix wildcards with specific permissions:

```typescript
rbac.createRole('moderator', [
  'posts:read',
  'posts:write',
  'comments:*',      // All comment actions
  'users:read'
])

const moderator = { id: '1', roles: ['moderator'] }

// Specific post permissions
rbac.hasPermission(moderator, 'posts:read')    // ✅ true
rbac.hasPermission(moderator, 'posts:write')   // ✅ true
rbac.hasPermission(moderator, 'posts:delete')  // ❌ false

// All comment permissions
rbac.hasPermission(moderator, 'comments:read')     // ✅ true
rbac.hasPermission(moderator, 'comments:moderate') // ✅ true
rbac.hasPermission(moderator, 'comments:delete')   // ✅ true
```

## Performance Considerations

Wildcards are highly optimized:

```typescript
// ✅ Efficient - single wildcard
rbac.createRole('admin', ['posts:*'])

// ✅ Also efficient - few specific permissions
rbac.createRole('editor', [
  'posts:read',
  'posts:write',
  'posts:publish'
])

// ⚠️ Consider wildcard - many similar permissions
rbac.createRole('admin', [
  'posts:read',
  'posts:write',
  'posts:delete',
  'posts:publish',
  'posts:archive',
  'posts:restore',
  // ... 20 more post permissions
])
// Better: rbac.createRole('admin', ['posts:*'])
```

## Best Practices

### 1. Use Wildcards for Admin Roles

```typescript
// ✅ Good - clear admin intent
rbac.createRole('admin', ['posts:*'])

// ❌ Avoid - tedious and error-prone
rbac.createRole('admin', [
  'posts:read',
  'posts:write',
  // ... might miss some permissions
])
```

### 2. Be Specific When Needed

```typescript
// ✅ Good - specific access
rbac.createRole('editor', [
  'posts:read',
  'posts:write',
  'posts:publish'
  // Deliberately excludes posts:delete
])

// ❌ Avoid - too broad
rbac.createRole('editor', ['posts:*'])
// Includes delete, which editors shouldn't have
```

### 3. Document Wildcard Usage

```typescript
// ✅ Good - documented
rbac.createRole('content-moderator', [
  'posts:*',     // Full post management
  'comments:*'   // Full comment management
  // Note: Cannot manage users
])

// ❌ Avoid - unclear scope
rbac.createRole('moderator', ['*'])
// What does this role actually do?
```

### 4. Combine with Role Hierarchy

```typescript
// ✅ Good - clear progression
rbac.createRole('viewer', ['posts:read'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
rbac.createRole('admin', ['posts:*'])

rbac.setRoleHierarchy({
  admin: ['editor'],
  editor: ['viewer']
})
```

## Advanced Patterns

### Namespace-Based Access

```typescript
// Organize permissions by namespace
rbac.createRole('api-full', ['api:*'])
rbac.createRole('api-read', ['api:*:read'])

const apiUser = { id: '1', roles: ['api-full'] }
rbac.hasPermission(apiUser, 'api:v1:read')   // ✅ true
rbac.hasPermission(apiUser, 'api:v2:write')  // ✅ true
```

### Multi-Tenant Wildcards

```typescript
// Tenant-scoped permissions
rbac.createRole('tenant-admin', [
  'tenant:*',           // All tenant operations
  'tenant:users:*',     // All tenant user operations
  'tenant:billing:read' // Can only read billing
])
```

### Feature Flags

```typescript
// Feature-based permissions
rbac.createRole('beta-tester', [
  'app:*',
  'features:beta:*',    // All beta features
  'features:experimental:read' // Can view experimental features
])
```

## Testing Wildcards

Always test wildcard permissions thoroughly:

```typescript
describe('Admin permissions', () => {
  it('should allow all post actions', () => {
    rbac.createRole('admin', ['posts:*'])
    const admin = { id: '1', roles: ['admin'] }

    expect(rbac.hasPermission(admin, 'posts:read')).toBe(true)
    expect(rbac.hasPermission(admin, 'posts:write')).toBe(true)
    expect(rbac.hasPermission(admin, 'posts:delete')).toBe(true)
  })

  it('should not allow non-post actions', () => {
    rbac.createRole('admin', ['posts:*'])
    const admin = { id: '1', roles: ['admin'] }

    expect(rbac.hasPermission(admin, 'users:delete')).toBe(false)
  })
})
```

## Next Steps

- Learn about [Role Hierarchy](/guide/role-hierarchy)
- Understand [Permissions](/guide/permissions)
- Explore [API Reference](/api/core)
