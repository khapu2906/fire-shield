# API Reference

Complete API documentation for RBAC library.

## Table of Contents

- [RBAC Class](#rbac-class)
  - [Constructor](#constructor)
  - [Permission Methods](#permission-methods)
  - [Role Methods](#role-methods)
  - [Deny Permissions](#deny-permissions)
  - [Hierarchy Methods](#hierarchy-methods)
  - [State Management](#state-management)
- [RBACBuilder](#rbacbuilder)
- [BitPermissionManager](#bitpermissionmanager)
- [RoleHierarchy](#rolehierarchy)
- [WildcardMatcher](#wildcardmatcher)
- [Audit Loggers](#audit-loggers)

---

It's important to note the distinction between internal and public-facing classes for managing permissions and roles. While the codebase contains `PermissionManager` and `RoleManager` as internal components, the primary public interfaces for these functionalities are `BitPermissionManager` (for low-level bit-based permission management) and `RoleHierarchy` (for role hierarchy management). The main `RBAC` class provides methods to access these public-facing managers.

## RBAC Class

Main class for managing role-based access control.

### Constructor

```typescript
constructor(options?: {
  config?: RBACConfigSchema;
  preset?: PresetConfig;
  useBitSystem?: boolean;
  strictMode?: boolean;
  enableWildcards?: boolean;
  auditLogger?: AuditLogger;
  // v2.2.0 options
  lazyRoles?: boolean;
  enableCache?: boolean;
  cacheTTL?: number;
  cacheCleanupInterval?: number;
  optimizeMemory?: boolean;
})
```

**Parameters:**
- `config` - Configuration schema with permissions and roles
- `preset` - Preset configuration (e.g., `defaultPreset`)
- `useBitSystem` - Use bit-based permission system (default: `true`)
- `strictMode` - Enable strict mode (throws errors on invalid operations)
- `enableWildcards` - Enable wildcard permission matching (default: `true`)
- `auditLogger` - Optional audit logger for tracking permission checks
- `lazyRoles` - Enable lazy role evaluation for memory efficiency (v2.2.0)
- `enableCache` - Enable permission caching (v2.2.0)
- `cacheTTL` - Cache time-to-live in milliseconds (default: 60000) (v2.2.0)
- `cacheCleanupInterval` - Cache cleanup interval in milliseconds (default: 300000) (v2.2.0)
- `optimizeMemory` - Enable memory optimization and profiling (v2.2.0)

**Example:**
```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  useBitSystem: true,
  enableWildcards: true,
  auditLogger: new ConsoleAuditLogger()
});
```

---

### Permission Methods

#### `hasPermission(user, permission): boolean`

Check if user has a specific permission.

**Parameters:**
- `user: RBACUser` - User object with `id`, `roles`, optional `permissions` and `permissionMask`
- `permission: string` - Permission to check

**Returns:** `boolean`

**Example:**
```typescript
const user = { id: 'user-1', roles: ['editor'] };
rbac.hasPermission(user, 'post:write'); // true or false
```

---

#### `hasAnyPermission(user, permissions): boolean`

Check if user has ANY of the specified permissions (OR operation).

**Parameters:**
- `user: RBACUser`
- `permissions: string[]` - Array of permissions

**Returns:** `boolean`

**Example:**
```typescript
rbac.hasAnyPermission(user, ['post:write', 'post:delete']); // true if has either
```

---

#### `hasAllPermissions(user, permissions): boolean`

Check if user has ALL of the specified permissions (AND operation).

**Parameters:**
- `user: RBACUser`
- `permissions: string[]` - Array of permissions

**Returns:** `boolean`

**Example:**
```typescript
rbac.hasAllPermissions(user, ['post:read', 'post:write']); // true only if has both
```

---

#### `authorize(user, permission): AuthorizationResult`

Authorize user with detailed result including reason for denial.

**Parameters:**
- `user: RBACUser`
- `permission: string`

**Returns:** `AuthorizationResult`
```typescript
interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  user?: RBACUser;
}
```

**Example:**
```typescript
const result = rbac.authorize(user, 'admin:delete');
if (!result.allowed) {
  console.log(result.reason); // "User lacks permission: admin:delete"
}
```

---

#### `authorizeWithContext(context): AuthorizationResult`

Authorize with additional context (resource, action, etc.).

**Parameters:**
```typescript
{
  user: RBACUser;
  resource: string;
  action: string;
}
```

**Returns:** `AuthorizationResult`

**Example:**
```typescript
rbac.authorizeWithContext({
  user,
  resource: 'document',
  action: 'edit'
});
```

---

#### `registerPermission(name, manualBit?): number`

Register a new permission (bit-based system only).

**Parameters:**
- `name: string` - Permission name
- `manualBit?: number` - Optional manual bit value (must be power of 2)

**Returns:** `number` - Bit value assigned

**Example:**
```typescript
rbac.registerPermission('user:read');        // Auto-assign bit
rbac.registerPermission('admin:delete', 128); // Manual bit
```

---

### Role Methods

#### `createRole(name, permissions): void`

Create a new role with permissions.

**Parameters:**
- `name: string` - Role name
- `permissions: string[]` - Array of permission names

**Example:**
```typescript
rbac.createRole('editor', ['post:read', 'post:write']);
```

---

#### `addPermissionToRole(roleName, permission): void`

Add a permission to an existing role.

**Parameters:**
- `roleName: string`
- `permission: string`

**Example:**
```typescript
rbac.addPermissionToRole('editor', 'post:publish');
```

---

#### `canActAsRole(currentRole, targetRole): boolean`

Check if a role can act as another role (based on hierarchy).

**Parameters:**
- `currentRole: string`
- `targetRole: string`

**Returns:** `boolean`

**Example:**
```typescript
rbac.canActAsRole('admin', 'editor'); // true if admin level >= editor level
```

---

### Deny Permissions

#### `denyPermission(userId, permission): void`

Explicitly deny a permission for a user. Denies take precedence over allows.

**Parameters:**
- `userId: string` - User ID
- `permission: string` - Permission to deny (supports wildcards)

**Example:**
```typescript
rbac.denyPermission('user-123', 'admin:delete');
rbac.denyPermission('user-456', 'admin:*'); // Deny all admin permissions
```

---

#### `allowPermission(userId, permission): void`

Remove a denied permission (re-allow it).

**Parameters:**
- `userId: string`
- `permission: string`

**Example:**
```typescript
rbac.allowPermission('user-123', 'admin:delete');
```

---

#### `getDeniedPermissions(userId): string[]`

Get all denied permissions for a user.

**Parameters:**
- `userId: string`

**Returns:** `string[]`

**Example:**
```typescript
const denied = rbac.getDeniedPermissions('user-123');
console.log(denied); // ['admin:delete', 'user:*']
```

---

#### `clearDeniedPermissions(userId): void`

Clear all denied permissions for a user.

**Parameters:**
- `userId: string`

**Example:**
```typescript
rbac.clearDeniedPermissions('user-123');
```

---

### Hierarchy Methods

#### `getRoleHierarchy(): RoleHierarchy`

Get the role hierarchy manager.

**Returns:** `RoleHierarchy`

**Example:**
```typescript
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('admin', 10);
```

---

### State Management

#### `serialize(): RBACSystemState`

Serialize RBAC state to an object.

**Returns:** `RBACSystemState`

**Example:**
```typescript
const state = rbac.serialize();
```

---

#### `deserialize(state): void`

Restore RBAC state from a serialized object.

**Parameters:**
- `state: RBACSystemState`

**Example:**
```typescript
rbac.deserialize(savedState);
```

---

#### `toJSON(): string`

Serialize to JSON string.

**Returns:** `string`

**Example:**
```typescript
const json = rbac.toJSON();
localStorage.setItem('rbac', json);
```

---

#### `fromJSON(json): void`

Restore from JSON string.

**Parameters:**
- `json: string`

**Example:**
```typescript
const json = localStorage.getItem('rbac');
rbac.fromJSON(json);
```

---

### Lazy Role Evaluation Methods (v2.2.0)

#### `getLazyRoleStats(): object`

Get lazy role evaluation statistics.

**Returns:** `{ enabled: boolean, pending: number, evaluated: number, total: number }`

**Example:**
```typescript
const rbac = new RBAC({ lazyRoles: true, preset: config });
const stats = rbac.getLazyRoleStats();
console.log(stats);
// { enabled: true, pending: 950, evaluated: 50, total: 1000 }
```

---

#### `getPendingRoles(): string[]`

Get list of pending (not yet evaluated) role names.

**Returns:** `string[]`

**Example:**
```typescript
const pendingRoles = rbac.getPendingRoles();
console.log(pendingRoles); // ['role1', 'role2', ...]
```

---

#### `isRolePending(roleName): boolean`

Check if a specific role is pending evaluation.

**Parameters:**
- `roleName: string` - Role name to check

**Returns:** `boolean`

**Example:**
```typescript
if (rbac.isRolePending('admin')) {
  console.log('Admin role not yet evaluated');
}
```

---

#### `evaluateAllRoles(): void`

Force evaluation of all pending roles immediately.

**Example:**
```typescript
// Evaluate all roles at once
rbac.evaluateAllRoles();

const stats = rbac.getLazyRoleStats();
console.log(stats.pending); // 0 - all roles evaluated
```

---

#### `getEvaluatedRoles(): string[]`

Get list of already evaluated role names.

**Returns:** `string[]`

**Example:**
```typescript
const evaluated = rbac.getEvaluatedRoles();
console.log(evaluated); // ['admin', 'editor', ...]
```

---

### Permission Caching Methods (v2.2.0)

#### `getCacheStats(): object`

Get permission cache statistics.

**Returns:** `{ hits: number, misses: number, size: number, hitRate: number }`

**Example:**
```typescript
const rbac = new RBAC({ enableCache: true });
const stats = rbac.getCacheStats();
console.log(stats);
// { hits: 1250, misses: 50, size: 100, hitRate: 96.15 }
```

---

#### `clearPermissionCache(): void`

Clear the permission cache.

**Example:**
```typescript
// Clear cache after role/permission changes
rbac.createRole('new-role', ['permission:*']);
rbac.clearPermissionCache();
```

---

### Memory Optimization Methods (v2.2.0)

#### `getMemoryStats(): object`

Get memory usage statistics.

**Returns:** Memory statistics object with role count, permission count, and estimated bytes

**Example:**
```typescript
const rbac = new RBAC({ optimizeMemory: true });
const stats = rbac.getMemoryStats();
console.log(stats);
// {
//   roles: 100,
//   permissions: 500,
//   estimatedBytes: 102400
// }
```

---

#### `getAllRoles(): string[]`

Get all registered role names.

**Returns:** `string[]`

**Example:**
```typescript
const roles = rbac.getAllRoles();
console.log(roles); // ['admin', 'editor', 'viewer']
```

---

#### `getRolePermissions(roleName): string[]`

Get all permissions for a specific role.

**Parameters:**
- `roleName: string` - Role name

**Returns:** `string[]`

**Example:**
```typescript
const permissions = rbac.getRolePermissions('editor');
console.log(permissions); // ['post:read', 'post:write']
```

---

## RBACBuilder

Fluent API for building RBAC configurations.

### Methods

#### `useBitSystem(): this`

Enable bit-based permission system.

#### `useLegacySystem(): this`

Use string-based permission system.

#### `withPreset(preset): this`

Load from a preset configuration.

#### `addPermission(name, bit?, options?): this`

Add a permission.

**Parameters:**
```typescript
name: string
bit?: number
options?: {
  resource?: string;
  action?: string;
  description?: string;
  metadata?: Record<string, any>;
}
```

#### `addRole(name, permissions, options?): this`

Add a role.

**Parameters:**
```typescript
name: string
permissions: string[]
options?: {
  level?: number;
  description?: string;
  metadata?: Record<string, any>;
}
```

#### `build(): RBAC`

Build and return RBAC instance.

### Example

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .useBitSystem()
  .addPermission('user:read', 1)
  .addPermission('user:write', 2)
  .addRole('user', ['user:read'], { level: 1 })
  .addRole('admin', ['user:read', 'user:write'], { level: 10 })
  .build();
```

---

## BitPermissionManager

Low-level bit-based permission management.

### Methods

#### `registerPermission(name, manualBit?): number`

Register a permission with optional manual bit.

#### `registerRole(name, permissions): void`

Register a role with permissions.

#### `hasPermission(mask, permission): boolean`

Check if permission mask has permission.

#### `createPermissionMask(permissions): number`

Create permission mask from permissions array.

#### `combineMasks(...masks): number`

Combine multiple permission masks.

#### `getAllPermissions(): string[]`

Get all registered permissions.

#### `getAllRoles(): string[]`

Get all registered roles.

---

## RoleHierarchy

Role hierarchy management based on levels.

### Methods

#### `setRoleLevel(role, level): void`

Set level for a role.

**Parameters:**
- `role: string`
- `level: number`

#### `getRoleLevel(role): number`

Get level for a role.

#### `canActAs(currentRole, targetRole): boolean`

Check if current role can act as target role.

#### `hasHigherLevel(role1, role2): boolean`

Check if role1 has higher level than role2.

#### `getRolesAtLevel(level): string[]`

Get all roles at specific level.

#### `getAllRoles(): string[]`

Get all roles.

---

## WildcardMatcher

Wildcard pattern matching utility.

### Methods

#### `matches(permission, pattern): boolean`

Check if permission matches pattern.

**Example:**
```typescript
WildcardMatcher.matches('admin:users', 'admin:*'); // true
WildcardMatcher.matches('user:read', '*:read');    // true
```

#### `matchesAny(permission, patterns): boolean`

Check if permission matches any pattern.

#### `filterByPattern(permissions, pattern): string[]`

Filter permissions by pattern.

#### `expandPatterns(patterns, availablePermissions): string[]`

Expand wildcard patterns to actual permissions.

---

## Audit Loggers

### ConsoleAuditLogger

Logs audit events to console.

```typescript
import { ConsoleAuditLogger } from '@fire-shield/core';

const logger = new ConsoleAuditLogger();
```

### BufferedAuditLogger

Buffers events and flushes in batches.

```typescript
import { BufferedAuditLogger } from '@fire-shield/core';

const logger = new BufferedAuditLogger(
  async (events) => {
    await database.insertMany(events);
  },
  {
    maxBufferSize: 100,
    flushIntervalMs: 5000
  }
);
```

### MultiAuditLogger

Logs to multiple destinations.

```typescript
import { MultiAuditLogger, ConsoleAuditLogger, BufferedAuditLogger } from '@fire-shield/core';

const logger = new MultiAuditLogger([
  new ConsoleAuditLogger(),
  new BufferedAuditLogger(...)
]);
```

---

## Types

### RBACUser

```typescript
interface RBACUser {
  id: string;
  roles: string[];
  permissions?: string[];
  permissionMask?: number;
}
```

### AuthorizationResult

```typescript
interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  user?: RBACUser;
}
```

### AuditEvent

```typescript
interface AuditEvent {
  type: 'permission_check' | 'authorization' | 'role_check';
  userId: string;
  permission: string;
  allowed: boolean;
  reason?: string;
  context?: {
    roles?: string[];
    ip?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  timestamp: number;
}
```

### AuditLogger

```typescript
interface AuditLogger {
  log(event: AuditEvent): void | Promise<void>;
  flush?(): void | Promise<void>;
}
```

---

See also:
- [Advanced Features](./ADVANCED_FEATURES.md) - Detailed guide for advanced features
- [Examples](./EXAMPLES.md) - Real-world usage examples
- [Best Practices](./BEST_PRACTICES.md) - Recommended patterns
