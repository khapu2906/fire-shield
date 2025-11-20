# Core API Reference

Complete API reference for `@fire-shield/core`.

## RBAC Class

The main class for managing roles, permissions, and access control.

### Constructor

```typescript
new RBAC(options?: RBACOptions)
```

#### Parameters

- `options` (optional): Configuration options
  - `auditLogger?: AuditLogger` - Custom audit logger
  - `bitPermissions?: boolean` - Enable bit-level permission checking (default: false)

#### Example

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core'

const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(async (logs) => {
    console.log('Audit logs:', logs)
  }),
  bitPermissions: true
})
```

### Methods

#### createRole

Create a new role with permissions.

```typescript
createRole(roleName: string, permissions: string[]): void
```

**Parameters:**
- `roleName` - Name of the role
- `permissions` - Array of permission strings

**Example:**
```typescript
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
```

#### deleteRole

Delete a role.

```typescript
deleteRole(roleName: string): void
```

**Example:**
```typescript
rbac.deleteRole('editor')
```

#### grant

Grant additional permissions to an existing role.

```typescript
grant(roleName: string, permissions: string[]): void
```

**Example:**
```typescript
rbac.grant('editor', ['posts:delete'])
```

#### revoke

Revoke permissions from a role.

```typescript
revoke(roleName: string, permissions: string[]): void
```

**Example:**
```typescript
rbac.revoke('editor', ['posts:delete'])
```

#### hasPermission

Check if a user has a specific permission.

```typescript
hasPermission(user: RBACUser, permission: string): boolean
```

**Parameters:**
- `user` - User object with roles
- `permission` - Permission string to check

**Returns:** `true` if user has permission, `false` otherwise

**Example:**
```typescript
const user = { id: '1', roles: ['editor'] }
const canWrite = rbac.hasPermission(user, 'posts:write') // true
const canDelete = rbac.hasPermission(user, 'posts:delete') // false
```

#### setRoleHierarchy

Define role inheritance chains.

```typescript
setRoleHierarchy(hierarchy: Record<string, string[]>): void
```

**Parameters:**
- `hierarchy` - Object mapping roles to their parent roles

**Example:**
```typescript
rbac.setRoleHierarchy({
  admin: ['editor', 'moderator'],
  editor: ['viewer'],
  moderator: ['viewer']
})
```

#### getRolePermissions

Get all permissions for a role (including inherited).

```typescript
getRolePermissions(roleName: string): string[]
```

**Returns:** Array of permission strings

**Example:**
```typescript
const permissions = rbac.getRolePermissions('editor')
// ['posts:read', 'posts:write']
```

#### getUserPermissions

Get all permissions for a user (across all roles).

```typescript
getUserPermissions(user: RBACUser): string[]
```

**Returns:** Array of permission strings

**Example:**
```typescript
const user = { id: '1', roles: ['editor', 'moderator'] }
const permissions = rbac.getUserPermissions(user)
```

## Types

### RBACUser

User object with role assignments.

```typescript
interface RBACUser {
  id: string
  roles: string[]
  [key: string]: any // Additional user properties
}
```

**Example:**
```typescript
const user: RBACUser = {
  id: 'user-123',
  roles: ['editor', 'moderator'],
  email: 'user@example.com',
  name: 'John Doe'
}
```

### RBACOptions

Configuration options for RBAC instance.

```typescript
interface RBACOptions {
  auditLogger?: AuditLogger
  bitPermissions?: boolean
}
```

### AuditLogger

Interface for custom audit loggers.

```typescript
interface AuditLogger {
  log(event: AuditEvent): void | Promise<void>
}
```

### AuditEvent

Audit log event structure.

```typescript
interface AuditEvent {
  timestamp: Date
  userId: string
  action: 'permission_check' | 'role_grant' | 'role_revoke'
  resource: string
  permission?: string
  result: boolean
  metadata?: Record<string, any>
}
```

## Audit Logging

### BufferedAuditLogger

Built-in audit logger with buffering.

```typescript
new BufferedAuditLogger(
  handler: (logs: AuditEvent[]) => Promise<void>,
  options?: BufferedAuditLoggerOptions
)
```

#### Parameters

- `handler` - Function to process buffered logs
- `options` (optional):
  - `maxBufferSize?: number` - Max buffer size (default: 100)
  - `flushIntervalMs?: number` - Flush interval (default: 5000)

#### Example

```typescript
import { BufferedAuditLogger } from '@fire-shield/core'

const auditLogger = new BufferedAuditLogger(
  async (logs) => {
    await saveLogsToDatabase(logs)
  },
  {
    maxBufferSize: 50,
    flushIntervalMs: 3000
  }
)

const rbac = new RBAC({ auditLogger })
```

#### Methods

##### flush

Manually flush buffered logs.

```typescript
flush(): Promise<void>
```

**Example:**
```typescript
await auditLogger.flush()
```

### Custom Audit Logger

Implement custom audit logger:

```typescript
class CustomAuditLogger implements AuditLogger {
  async log(event: AuditEvent) {
    console.log('Audit event:', event)
    // Send to logging service
    await fetch('/api/audit', {
      method: 'POST',
      body: JSON.stringify(event)
    })
  }
}

const rbac = new RBAC({
  auditLogger: new CustomAuditLogger()
})
```

## RBAC Builder

Fluent API for building RBAC configurations.

```typescript
import { RBACBuilder } from '@fire-shield/core'

const rbac = new RBACBuilder()
  .role('admin')
    .grant(['posts:*', 'users:*'])
  .role('editor')
    .grant(['posts:read', 'posts:write'])
  .role('viewer')
    .grant(['posts:read'])
  .hierarchy({
    admin: ['editor'],
    editor: ['viewer']
  })
  .build()
```

### Methods

#### role

Start defining a role.

```typescript
role(name: string): RBACBuilder
```

#### grant

Grant permissions to current role.

```typescript
grant(permissions: string[]): RBACBuilder
```

#### hierarchy

Set role hierarchy.

```typescript
hierarchy(hierarchy: Record<string, string[]>): RBACBuilder
```

#### build

Build and return RBAC instance.

```typescript
build(): RBAC
```

## Utilities

### matchPermission

Check if permission matches pattern (including wildcards).

```typescript
import { matchPermission } from '@fire-shield/core'

matchPermission('posts:write', 'posts:*') // true
matchPermission('posts:write', 'posts:read') // false
matchPermission('admin:users:delete', 'admin:*') // true
```

### parsePermission

Parse permission string into parts.

```typescript
import { parsePermission } from '@fire-shield/core'

const parts = parsePermission('posts:write')
// { resource: 'posts', action: 'write' }

const nested = parsePermission('admin:users:delete')
// { resource: 'admin:users', action: 'delete' }
```

## Error Handling

### RBACError

Base error class for RBAC errors.

```typescript
class RBACError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'RBACError'
  }
}
```

### Common Errors

```typescript
// Permission denied
throw new RBACError('Insufficient permissions', 'PERMISSION_DENIED')

// Role not found
throw new RBACError('Role does not exist', 'ROLE_NOT_FOUND')

// Invalid permission format
throw new RBACError('Invalid permission format', 'INVALID_PERMISSION')
```

## Performance

### Bit-Level Permissions

Enable bit-level permission checking for better performance:

```typescript
const rbac = new RBAC({ bitPermissions: true })

// Permissions are stored as bits
// Much faster for large permission sets
rbac.createRole('admin', ['posts:*'])

const user = { id: '1', roles: ['admin'] }
rbac.hasPermission(user, 'posts:write') // Optimized bit check
```

### Caching

RBAC automatically caches:
- Role permissions
- Role hierarchy resolution
- User permission sets

```typescript
// First call - computes and caches
rbac.hasPermission(user, 'posts:write')

// Subsequent calls - uses cache
rbac.hasPermission(user, 'posts:write') // Fast
rbac.hasPermission(user, 'posts:delete') // Fast
```

## Next Steps

- Learn about [Permissions](/guide/permissions)
- Explore [Framework Integrations](/frameworks/vue)
- Check out [Examples](/examples/basic-usage)
