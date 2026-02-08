# TypeScript Types

Complete type reference for RBAC library.

## Table of Contents

- [Core Types](#core-types)
- [User Types](#user-types)
- [Configuration Types](#configuration-types)
- [Audit Types](#audit-types)
- [Utility Types](#utility-types)

---

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
   * Calculated from roles and direct permissions
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

---

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

---

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
  metadata?: Record<string, any>;
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

---

## User Types

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
  metadata?: Record<string, any>;
}
```

**Example:**
```typescript
const editorRole: UserRole = {
  name: 'editor',
  permissions: ['post:read', 'post:write'],
  permissionMask: 3,
  description: 'Content editor with read/write access',
  metadata: {
    department: 'Content',
    createdAt: '2025-01-01'
  }
};
```

---

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

---

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

---

### RBACConfigSchema

Schema for defining permissions and roles.

```typescript
interface RBACConfigSchema {
  /**
   * Permission definitions
   */
  permissions: Array<{
    name: string;
    bit?: number;
    resource?: string;
    action?: string;
    description?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Role definitions
   */
  roles: Array<{
    name: string;
    permissions: string[];
    level?: number;
    description?: string;
    metadata?: Record<string, any>;
  }>;

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
  ],
  options: {
    autoBitAssignment: true,
    validatePermissions: true
  }
};
```

---

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
  permissions: Array<{
    name: string;
    bit?: number;
    resource?: string;
    action?: string;
  }>;

  /**
   * Role definitions
   */
  roles: Array<{
    name: string;
    permissions: string[];
    level?: number;
  }>;

  /**
   * Configuration options
   */
  options?: {
    autoBitAssignment?: boolean;
  };
}
```

**Example:**
```typescript
const blogPreset: PresetConfig = {
  name: 'blog-system',
  description: 'Blog application permissions',
  permissions: [
    { name: 'post:read', bit: 1 },
    { name: 'post:write', bit: 2 }
  ],
  roles: [
    { name: 'author', permissions: ['post:read', 'post:write'], level: 5 }
  ],
  options: {
    autoBitAssignment: true
  }
};
```

---

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

**Example:**
```typescript
const event: AuditEvent = {
  type: 'permission_check',
  userId: 'user-123',
  permission: 'post:write',
  allowed: true,
  context: {
    roles: ['editor'],
    ip: '192.168.1.1'
  },
  timestamp: Date.now()
};
```

---

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
  metadata?: Record<string, any>;
}
```

---

### AuditLogger

Interface for audit logging implementations.

```typescript
interface AuditLogger {
  /**
   * Log an audit event
   * Can be sync or async
   */
  log(event: AuditEvent): void | Promise<void>;

  /**
   * Optional flush method for buffered loggers
   */
  flush?(): void | Promise<void>;
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

---

## Utility Types

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
  permissions: Array<{
    name: string;
    bit?: number;
  }>;

  /**
   * All registered roles
   */
  roles: Array<{
    name: string;
    permissions: string[];
    permissionMask?: number;
  }>;

  /**
   * Role hierarchy levels
   */
  hierarchy: Record<string, number>;

  /**
   * Denied permissions by user ID
   */
  denyList: Record<string, string[]>;
}
```

**Example:**
```typescript
// Serialize
const state: RBACSystemState = rbac.serialize();

// Save to database
await database.save('rbac-state', state);

// Restore
const loadedState: RBACSystemState = await database.load('rbac-state');
rbac.deserialize(loadedState);
```

---

### BuilderOptions

Options for RBACBuilder.

```typescript
interface BuilderOptions {
  /**
   * Use bit-based system
   */
  useBitSystem?: boolean;

  /**
   * Enable strict mode
   */
  strictMode?: boolean;

  /**
   * Enable wildcards
   */
  enableWildcards?: boolean;

  /**
   * Audit logger
   */
  auditLogger?: AuditLogger;
}
```

---

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
  metadata?: Record<string, any>;
}
```

**Example:**
```typescript
const permission: PermissionDefinition = {
  name: 'user:delete',
  bit: 8,
  resource: 'user',
  action: 'delete',
  description: 'Delete user accounts',
  metadata: {
    dangerous: true,
    requiresApproval: true
  }
};
```

---

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
  metadata?: Record<string, any>;
}
```

**Example:**
```typescript
const role: RoleDefinition = {
  name: 'admin',
  permissions: ['user:*', 'post:*'],
  level: 100,
  description: 'System administrator',
  metadata: {
    department: 'IT',
    maxUsers: 5
  }
};
```

---

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

---

## Generic Types

### WithMetadata<T>

Add metadata to any type.

```typescript
type WithMetadata<T> = T & {
  metadata?: Record<string, any>;
};
```

**Example:**
```typescript
type UserWithMetadata = WithMetadata<RBACUser>;

const user: UserWithMetadata = {
  id: 'user-1',
  roles: ['admin'],
  metadata: {
    department: 'Engineering',
    hireDate: '2025-01-01'
  }
};
```

---

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
  // ...
};
```

---

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

// Utility types
import type {
  RBACSystemState,
  PermissionDefinition,
  RoleDefinition
} from '@fire-shield/core';
```

---

See also:
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Core Concepts](./CORE_CONCEPTS.md) - Understanding RBAC fundamentals
- [Examples](./EXAMPLES.md) - Real-world usage examples
