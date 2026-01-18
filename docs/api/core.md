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
  - `config?: RBACConfigSchema` - Config-based initialization
  - `preset?: PresetConfig` - Preset configuration
  - `useBitSystem?: boolean` - Enable bit-level permission checking (default: true)
  - `strictMode?: boolean` - Enable strict mode for bit permissions
  - `auditLogger?: AuditLogger` - Custom audit logger
  - `enableWildcards?: boolean` - Enable wildcard permission matching (default: true)
  - `enableCache?: boolean` - Enable permission caching (default: false)
  - `cacheOptions?: PermissionCacheOptions` - Cache configuration
  - `lazyRoles?: boolean` - Enable lazy role evaluation (default: false)
  - `optimizeMemory?: boolean` - Enable memory optimization (default: false)

#### Example

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core'

// Basic usage
const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(async (logs) => {
    console.log('Audit logs:', logs)
  }),
  useBitSystem: true
})

// With performance features
const rbacOptimized = new RBAC({
  enableCache: true,
  cacheOptions: {
    ttl: 60000, // 1 minute
    maxSize: 10000
  },
  lazyRoles: true,
  optimizeMemory: true
})
```

### Static Methods

#### fromJSONConfig

Create RBAC instance from JSON configuration.

```typescript
static fromJSONConfig(json: string, options?: RBACOptions): RBAC
```

**Parameters:**
- `json` - JSON string containing PresetConfig
- `options` - Additional RBAC options

**Returns:** New RBAC instance

**Example:**
```typescript
const configJson = JSON.stringify({
  permissions: [
    { name: 'posts:read' },
    { name: 'posts:write' }
  ],
  roles: [
    { name: 'editor', permissions: ['posts:read', 'posts:write'] }
  ]
})

const rbac = RBAC.fromJSONConfig(configJson, {
  enableCache: true
})
```

#### validateConfig

Validate PresetConfig structure.

```typescript
static validateConfig(config: PresetConfig): void
```

**Throws:** Error if config is invalid

**Example:**
```typescript
try {
  RBAC.validateConfig(myConfig)
  console.log('Config is valid')
} catch (error) {
  console.error('Invalid config:', error.message)
}
```

### Instance Methods

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

#### hasAnyPermission

Check if user has any of the specified permissions.

```typescript
hasAnyPermission(user: RBACUser, permissions: string[]): boolean
```

**Example:**
```typescript
const user = { id: '1', roles: ['editor'] }
const canEdit = rbac.hasAnyPermission(user, ['posts:write', 'posts:delete'])
```

#### hasAllPermissions

Check if user has all of the specified permissions.

```typescript
hasAllPermissions(user: RBACUser, permissions: string[]): boolean
```

**Example:**
```typescript
const user = { id: '1', roles: ['admin'] }
const hasFullAccess = rbac.hasAllPermissions(user, ['posts:read', 'posts:write', 'posts:delete'])
```

### Deny Permissions

Deny permissions allow you to explicitly revoke specific permissions for individual users, even if their roles grant them. Denies always take precedence over allows.

#### denyPermission

Deny a specific permission for a user.

```typescript
denyPermission(userId: string, permission: string): void
```

**Parameters:**
- `userId` - User ID to deny permission for
- `permission` - Permission to deny (supports wildcards)

**Example:**
```typescript
// Deny specific permission
rbac.denyPermission('user-123', 'posts:delete')

// Deny with wildcard
rbac.denyPermission('user-456', 'admin:*')

// User will now be denied even if their role grants the permission
const user = { id: 'user-123', roles: ['admin'] }
rbac.hasPermission(user, 'posts:delete') // false
```

#### allowPermission

Remove a denied permission for a user.

```typescript
allowPermission(userId: string, permission: string): void
```

**Example:**
```typescript
// Remove the deny
rbac.allowPermission('user-123', 'posts:delete')

// User can now use the permission again
rbac.hasPermission(user, 'posts:delete') // true (if role grants it)
```

#### getDeniedPermissions

Get all denied permissions for a user.

```typescript
getDeniedPermissions(userId: string): string[]
```

**Returns:** Array of denied permission strings

**Example:**
```typescript
const deniedPerms = rbac.getDeniedPermissions('user-123')
console.log(deniedPerms) // ['posts:delete', 'users:ban']
```

#### clearDeniedPermissions

Clear all denied permissions for a user.

```typescript
clearDeniedPermissions(userId: string): void
```

**Example:**
```typescript
rbac.clearDeniedPermissions('user-123')
// All denies removed, user permissions back to role-based
```

### Cache Management

When `enableCache: true` is set, permission checks are cached for better performance.

#### invalidateUserCache

Invalidate all cached permission checks for a specific user.

```typescript
invalidateUserCache(userId: string): void
```

**Example:**
```typescript
// User's roles changed, clear their cache
rbac.invalidateUserCache('user-123')
```

#### invalidatePermissionCache

Invalidate cached checks for a specific permission across all users.

```typescript
invalidatePermissionCache(permission: string): void
```

**Example:**
```typescript
// Permission definition changed, clear all caches for it
rbac.invalidatePermissionCache('posts:delete')
```

#### getCacheStats

Get cache statistics.

```typescript
getCacheStats(): CacheStats | undefined
```

**Returns:** Cache statistics or undefined if cache is disabled

**Example:**
```typescript
const stats = rbac.getCacheStats()
console.log(stats)
// {
//   hits: 1250,
//   misses: 50,
//   hitRate: 0.96,
//   size: 450,
//   maxSize: 10000
// }
```

### Lazy Role Evaluation

When `lazyRoles: true` is set, roles are only evaluated when first accessed, reducing initial load time and memory usage.

#### getEvaluatedRoles

Get list of roles that have been evaluated.

```typescript
getEvaluatedRoles(): string[]
```

**Example:**
```typescript
const evaluated = rbac.getEvaluatedRoles()
console.log(evaluated) // ['admin', 'editor']
```

#### getPendingRoles

Get list of roles not yet evaluated.

```typescript
getPendingRoles(): string[]
```

**Example:**
```typescript
const pending = rbac.getPendingRoles()
console.log(pending) // ['viewer', 'guest', 'moderator']
```

#### getLazyRoleStats

Get lazy role evaluation statistics.

```typescript
getLazyRoleStats(): LazyRoleStats
```

**Returns:** Object with lazy role statistics

**Example:**
```typescript
const stats = rbac.getLazyRoleStats()
console.log(stats)
// {
//   enabled: true,
//   pending: 5,
//   evaluated: 2,
//   total: 7
// }
```

#### isRolePending

Check if a role is pending evaluation.

```typescript
isRolePending(roleName: string): boolean
```

**Example:**
```typescript
if (rbac.isRolePending('viewer')) {
  console.log('Viewer role not yet loaded')
}
```

#### evaluateAllRoles

Force evaluation of all pending roles.

```typescript
evaluateAllRoles(): void
```

**Example:**
```typescript
// Load all roles immediately
rbac.evaluateAllRoles()
```

### Memory Optimization

When `optimizeMemory: true` is set, Fire Shield uses string interning and other techniques to reduce memory usage.

#### getMemoryStats

Get memory optimization statistics.

```typescript
getMemoryStats(): MemoryStats
```

**Returns:** Object with memory statistics

**Example:**
```typescript
const stats = rbac.getMemoryStats()
console.log(stats)
// {
//   enabled: true,
//   stringPoolSize: 150,
//   roleMaskCacheSize: 25,
//   wildcardPatternCacheSize: 10,
//   estimatedMemorySaved: 45000 // bytes
// }
```

#### compactMemory

Compact memory by cleaning up unused resources.

```typescript
compactMemory(): { stringsRemoved: number; cacheEntriesRemoved: number }
```

**Returns:** Object with cleanup statistics

**Example:**
```typescript
const result = rbac.compactMemory()
console.log(`Removed ${result.stringsRemoved} strings and ${result.cacheEntriesRemoved} cache entries`)
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

Fire Shield includes several performance optimizations for large-scale applications.

### Bit-Level Permissions

Enable bit-level permission checking for better performance:

```typescript
const rbac = new RBAC({ useBitSystem: true }) // Default: true

// Permissions are stored as bits
// Much faster for large permission sets
rbac.createRole('admin', ['posts:*'])

const user = { id: '1', roles: ['admin'] }
rbac.hasPermission(user, 'posts:write') // Optimized bit check
```

### Permission Caching

Fire Shield includes explicit permission caching with TTL and size limits:

```typescript
const rbac = new RBAC({
  enableCache: true,
  cacheOptions: {
    ttl: 60000,        // Cache for 1 minute
    maxSize: 10000,    // Max 10k entries
    cleanupInterval: 30000  // Cleanup every 30 seconds
  }
})

// First call - computes and caches
rbac.hasPermission(user, 'posts:write')

// Subsequent calls - served from cache (very fast)
rbac.hasPermission(user, 'posts:write') // < 1ms

// Monitor cache performance
const stats = rbac.getCacheStats()
console.log(`Hit rate: ${stats.hitRate * 100}%`)
```

### Lazy Role Evaluation

Fire Shield supports lazy role evaluation for faster startup:

```typescript
const rbac = new RBAC({
  lazyRoles: true,
  config: largeConfig // Config with 1000+ roles
})

// Only loads roles when first accessed
const stats = rbac.getLazyRoleStats()
console.log(`Loaded: ${stats.evaluated}/${stats.total} roles`)

// Force load all roles when needed
rbac.evaluateAllRoles()
```

### Memory Optimization

Fire Shield includes memory optimization through string interning:

```typescript
const rbac = new RBAC({
  optimizeMemory: true,
  config: largeConfig
})

// Monitor memory savings
const stats = rbac.getMemoryStats()
console.log(`Memory saved: ${stats.estimatedMemorySaved} bytes`)
console.log(`String pool: ${stats.stringPoolSize} unique strings`)

// Cleanup unused resources
const result = rbac.compactMemory()
console.log(`Cleaned up ${result.stringsRemoved} strings`)
```

### Performance Best Practices

For optimal performance in production:

```typescript
const rbac = new RBAC({
  useBitSystem: true,        // Fast bit-based checks
  enableCache: true,          // Cache permission checks
  cacheOptions: {
    ttl: 300000,              // 5 minute cache
    maxSize: 50000            // Large cache for many users
  },
  lazyRoles: true,            // Load roles on demand
  optimizeMemory: true,       // Reduce memory footprint
  enableWildcards: true       // Support flexible permissions
})

// Clear cache when roles change
rbac.createRole('newRole', ['posts:*'])
rbac.invalidatePermissionCache('posts:write')

// Monitor performance
setInterval(() => {
  const cacheStats = rbac.getCacheStats()
  const memoryStats = rbac.getMemoryStats()
  console.log('Cache hit rate:', cacheStats.hitRate)
  console.log('Memory saved:', memoryStats.estimatedMemorySaved)
}, 60000)
```

## Next Steps

- Learn about [Permissions](/guide/permissions)
- Understand [Deny Permissions](/guide/deny-permissions)
- Explore [Framework Integrations](/frameworks/vue)
- Use [CLI Tool](/frameworks/cli) for config validation
- Integrate with [AI Agents via MCP](/frameworks/mcp)
- Check out [Examples](/examples/basic-usage)
