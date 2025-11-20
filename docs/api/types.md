# TypeScript Types

Complete TypeScript type definitions for Fire Shield RBAC library.

## Core Types

### RBACUser

Represents a user in the RBAC system.

```typescript
interface RBACUser {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * Array of role names assigned to the user
   */
  roles: string[];

  /**
   * Optional direct permissions (additive to role permissions)
   */
  permissions?: string[];

  /**
   * Optional permission bitmask (for bit-based system)
   */
  permissionMask?: number;
}
```

**Example:**
```typescript
const user: RBACUser = {
  id: 'user-123',
  roles: ['editor', 'moderator'],
  permissions: ['beta:feature'],
  permissionMask: 127
};
```

### AuthorizationResult

Result of an authorization check with detailed information.

```typescript
interface AuthorizationResult {
  /**
   * Whether the permission is allowed
   */
  allowed: boolean;

  /**
   * Reason for denial (only present when allowed = false)
   */
  reason?: string;

  /**
   * The user object that was checked
   */
  user?: RBACUser;
}
```

**Example:**
```typescript
const result: AuthorizationResult = rbac.authorize(user, 'admin:delete');

if (!result.allowed) {
  console.log(result.reason); // "User lacks permission: admin:delete"
}
```

### AuthorizationContext

Context for authorization with additional metadata.

```typescript
interface AuthorizationContext {
  /**
   * User to check authorization for
   */
  user: RBACUser;

  /**
   * Resource being accessed
   */
  resource: string;

  /**
   * Action being performed
   */
  action: string;

  /**
   * Optional additional context
   */
  metadata?: Record&lt;string, any&gt;;
}
```

**Example:**
```typescript
const context: AuthorizationContext = {
  user: currentUser,
  resource: 'document',
  action: 'edit',
  metadata: {
    documentId: 'doc-123',
    ownerId: 'user-456'
  }
};

const result = rbac.authorizeWithContext(context);
```

## Configuration Types

### RBACConfig

Main configuration object for RBAC instance.

```typescript
interface RBACConfig {
  /**
   * Use bit-based permission system
   * @default true
   */
  useBitSystem?: boolean;

  /**
   * Enable strict mode (throws errors on invalid operations)
   * @default false
   */
  strictMode?: boolean;

  /**
   * Enable wildcard permission matching
   * @default true
   */
  enableWildcards?: boolean;

  /**
   * Preset configuration to load
   */
  preset?: PresetConfig;

  /**
   * Configuration schema
   */
  config?: RBACConfigSchema;

  /**
   * Optional audit logger
   */
  auditLogger?: AuditLogger;
}
```

**Example:**
```typescript
const config: RBACConfig = {
  useBitSystem: true,
  strictMode: true,
  enableWildcards: true,
  auditLogger: new ConsoleAuditLogger()
};

const rbac = new RBAC(config);
```

### RBACConfigSchema

Schema for defining permissions and roles.

```typescript
interface RBACConfigSchema {
  /**
   * Permission definitions
   */
  permissions: Array&lt;{
    name: string;
    bit?: number;
    resource?: string;
    action?: string;
    description?: string;
    metadata?: Record&lt;string, any&gt;;
  }&gt;;

  /**
   * Role definitions
   */
  roles: Array&lt;{
    name: string;
    permissions: string[];
    level?: number;
    description?: string;
    metadata?: Record&lt;string, any&gt;;
  }&gt;;

  /**
   * Optional configuration options
   */
  options?: {
    autoBitAssignment?: boolean;
    validatePermissions?: boolean;
  };
}
```

**Example:**
```typescript
const schema: RBACConfigSchema = {
  permissions: [
    { name: 'user:read', bit: 1, resource: 'user', action: 'read' },
    { name: 'user:write', bit: 2, resource: 'user', action: 'write' }
  ],
  roles: [
    {
      name: 'admin',
      permissions: ['user:read', 'user:write'],
      level: 10,
      description: 'Administrator role'
    }
  ]
};
```

### PresetConfig

Preset configuration with permissions and roles.

```typescript
interface PresetConfig {
  /**
   * Preset name
   */
  name: string;

  /**
   * Preset description
   */
  description?: string;

  /**
   * Permission definitions
   */
  permissions: Array&lt;{
    name: string;
    bit?: number;
    resource?: string;
    action?: string;
  }&gt;;

  /**
   * Role definitions
   */
  roles: Array&lt;{
    name: string;
    permissions: string[];
    level?: number;
  }&gt;;

  /**
   * Configuration options
   */
  options?: {
    autoBitAssignment?: boolean;
  };
}
```

## Audit Types

### AuditEvent

Event logged during permission checks.

```typescript
interface AuditEvent {
  /**
   * Type of event
   */
  type: 'permission_check' | 'authorization' | 'role_check';

  /**
   * User ID that triggered the event
   */
  userId: string;

  /**
   * Permission being checked
   */
  permission: string;

  /**
   * Whether permission was allowed
   */
  allowed: boolean;

  /**
   * Reason for denial (if denied)
   */
  reason?: string;

  /**
   * Additional context
   */
  context?: AuditEventContext;

  /**
   * Timestamp (milliseconds since epoch)
   */
  timestamp: number;
}
```

### AuditEventContext

Additional context for audit events.

```typescript
interface AuditEventContext {
  /**
   * User roles at time of check
   */
  roles?: string[];

  /**
   * IP address of request
   */
  ip?: string;

  /**
   * User agent string
   */
  userAgent?: string;

  /**
   * Resource being accessed
   */
  resource?: string;

  /**
   * Action being performed
   */
  action?: string;

  /**
   * Additional metadata
   */
  metadata?: Record&lt;string, any&gt;;
}
```

### AuditLogger

Interface for audit logging implementations.

```typescript
interface AuditLogger {
  /**
   * Log an audit event
   * Can be sync or async
   */
  log(event: AuditEvent): void | Promise&lt;void&gt;;

  /**
   * Optional flush method for buffered loggers
   */
  flush?(): void | Promise&lt;void&gt;;
}
```

**Example:**
```typescript
class CustomAuditLogger implements AuditLogger {
  log(event: AuditEvent): void {
    console.log(`[AUDIT] ${event.userId} - ${event.permission}: ${event.allowed}`);
  }

  flush(): void {
    // Flush buffered events
  }
}
```

## Role Types

### UserRole

Represents a role with permissions and metadata.

```typescript
interface UserRole {
  /**
   * Role name
   */
  name: string;

  /**
   * Permission names assigned to this role
   */
  permissions: string[];

  /**
   * Permission bitmask (bit-based system only)
   */
  permissionMask?: number;

  /**
   * Optional role description
   */
  description?: string;

  /**
   * Optional metadata
   */
  metadata?: Record&lt;string, any&gt;;
}
```

### PermissionMask

Type alias for permission bitmask.

```typescript
type PermissionMask = number;
```

**Usage:**
```typescript
const readMask: PermissionMask = 1;  // 2^0
const writeMask: PermissionMask = 2; // 2^1
const combinedMask: PermissionMask = readMask | writeMask; // 3
```

## Permission Types

### PermissionDefinition

Definition for a permission.

```typescript
interface PermissionDefinition {
  /**
   * Permission name
   */
  name: string;

  /**
   * Optional manual bit value (must be power of 2)
   */
  bit?: number;

  /**
   * Optional resource name
   */
  resource?: string;

  /**
   * Optional action name
   */
  action?: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Optional metadata
   */
  metadata?: Record&lt;string, any&gt;;
}
```

### RoleDefinition

Definition for a role.

```typescript
interface RoleDefinition {
  /**
   * Role name
   */
  name: string;

  /**
   * Permission names
   */
  permissions: string[];

  /**
   * Optional hierarchy level
   */
  level?: number;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Optional metadata
   */
  metadata?: Record&lt;string, any&gt;;
}
```

## State Types

### RBACSystemState

Serialized state of RBAC system.

```typescript
interface RBACSystemState {
  /**
   * Bit-based system enabled
   */
  useBitSystem: boolean;

  /**
   * Wildcards enabled
   */
  enableWildcards: boolean;

  /**
   * All registered permissions
   */
  permissions: Array&lt;{
    name: string;
    bit?: number;
  }&gt;;

  /**
   * All registered roles
   */
  roles: Array&lt;{
    name: string;
    permissions: string[];
    permissionMask?: number;
  }&gt;;

  /**
   * Role hierarchy levels
   */
  hierarchy: Record&lt;string, number&gt;;

  /**
   * Denied permissions by user ID
   */
  denyList: Record&lt;string, string[]&gt;;
}
```

**Example:**
```typescript
// Serialize
const state: RBACSystemState = rbac.serialize();

// Save to storage
localStorage.setItem('rbac-state', JSON.stringify(state));

// Restore
const savedState = JSON.parse(localStorage.getItem('rbac-state')!);
rbac.deserialize(savedState);
```

## Type Guards

Utility functions for type checking.

### isRBACUser

```typescript
function isRBACUser(obj: any): obj is RBACUser {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    Array.isArray(obj.roles)
  );
}
```

**Usage:**
```typescript
if (isRBACUser(maybeUser)) {
  // TypeScript knows this is an RBACUser
  rbac.hasPermission(maybeUser, 'post:read');
}
```

### isAuditEvent

```typescript
function isAuditEvent(obj: any): obj is AuditEvent {
  return (
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.permission === 'string' &&
    typeof obj.allowed === 'boolean' &&
    typeof obj.timestamp === 'number'
  );
}
```

## Generic Types

### WithMetadata&lt;T&gt;

Add metadata to any type.

```typescript
type WithMetadata&lt;T&gt; = T & {
  metadata?: Record&lt;string, any&gt;;
};
```

**Example:**
```typescript
type UserWithMetadata = WithMetadata&lt;RBACUser&gt;;

const user: UserWithMetadata = {
  id: 'user-1',
  roles: ['admin'],
  metadata: {
    department: 'Engineering',
    hireDate: '2025-01-01'
  }
};
```

## Const Enums

### PermissionCheckType

```typescript
const enum PermissionCheckType {
  PERMISSION_CHECK = 'permission_check',
  AUTHORIZATION = 'authorization',
  ROLE_CHECK = 'role_check'
}
```

**Usage:**
```typescript
const event: AuditEvent = {
  type: PermissionCheckType.PERMISSION_CHECK,
  userId: 'user-1',
  permission: 'post:read',
  allowed: true,
  timestamp: Date.now()
};
```

## Import Paths

```typescript
// Core types
import type {
  RBACUser,
  AuthorizationResult,
  AuthorizationContext
} from '@fire-shield/core';

// Configuration types
import type {
  RBACConfig,
  RBACConfigSchema,
  PresetConfig
} from '@fire-shield/core';

// Audit types
import type {
  AuditEvent,
  AuditEventContext,
  AuditLogger
} from '@fire-shield/core';

// Role types
import type {
  UserRole,
  PermissionMask,
  PermissionDefinition,
  RoleDefinition
} from '@fire-shield/core';

// State types
import type {
  RBACSystemState
} from '@fire-shield/core';
```

## Type Utilities

### Extending Types

```typescript
// Extend RBACUser with custom fields
interface AppUser extends RBACUser {
  email: string;
  name: string;
  department: string;
}

const user: AppUser = {
  id: 'user-1',
  roles: ['editor'],
  email: 'user@example.com',
  name: 'John Doe',
  department: 'Engineering'
};
```

### Type-Safe Permissions

```typescript
// Define allowed permissions as const
const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  POST_READ: 'post:read',
  POST_WRITE: 'post:write',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Type-safe permission checks
function checkPermission(user: RBACUser, permission: Permission): boolean {
  return rbac.hasPermission(user, permission);
}

// ✅ Valid
checkPermission(user, PERMISSIONS.USER_READ);

// ❌ Type error
checkPermission(user, 'invalid:permission');
```

### Type-Safe Roles

```typescript
// Define allowed roles
type Role = 'admin' | 'editor' | 'viewer';

function hasRole(user: RBACUser, role: Role): boolean {
  return user.roles.includes(role);
}

// ✅ Valid
hasRole(user, 'admin');

// ❌ Type error
hasRole(user, 'invalid-role');
```

## Best Practices

### 1. Always Use TypeScript

```typescript
// ✅ Good: Full type safety
import type { RBACUser } from '@fire-shield/core';

const user: RBACUser = {
  id: 'user-1',
  roles: ['editor']
};
```

### 2. Define Custom Types

```typescript
// ✅ Good: Define app-specific types
interface AppUser extends RBACUser {
  email: string;
  name: string;
}
```

### 3. Use Type Guards

```typescript
// ✅ Good: Validate at runtime
if (isRBACUser(userData)) {
  rbac.hasPermission(userData, 'post:read');
}
```

### 4. Const Assertions

```typescript
// ✅ Good: Type-safe constants
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = typeof ROLES[number];
```

## Next Steps

- Learn about [Core API](/api/core)
- Explore [RBAC Builder](/api/builder)
- Check out [TypeScript Guide](/guide/typescript)
