# RBAC Builder

Fluent API for building RBAC configurations with a chainable interface.

## Overview

RBACBuilder provides a convenient way to construct RBAC instances with a fluent, chainable API that makes configuration more readable and maintainable.

## Basic Usage

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .useBitSystem()
  .addPermission('user:read', 1)
  .addPermission('user:write', 2)
  .addPermission('user:delete', 4)
  .addRole('user', ['user:read'], { level: 1 })
  .addRole('admin', ['user:read', 'user:write', 'user:delete'], { level: 10 })
  .build();
```

## API Reference

### Constructor

```typescript
new RBACBuilder()
```

Creates a new RBAC builder instance.

**Example:**
```typescript
const builder = new RBACBuilder();
```

### useBitSystem()

Enable bit-based permission system (default).

```typescript
useBitSystem(): RBACBuilder
```

**Returns:** The builder instance for chaining

**Example:**
```typescript
const rbac = new RBACBuilder()
  .useBitSystem()
  .build();
```

### useLegacySystem()

Use string-based permission system instead of bit-based.

```typescript
useLegacySystem(): RBACBuilder
```

**Returns:** The builder instance for chaining

**Example:**
```typescript
const rbac = new RBACBuilder()
  .useLegacySystem()
  .build();
```

**When to use:**
- Need more than 31 permissions
- Permissions change frequently
- Debugging/development

### withPreset(preset)

Load from a preset configuration.

```typescript
withPreset(preset: PresetConfig): RBACBuilder
```

**Parameters:**
- `preset` - Preset configuration object

**Returns:** The builder instance for chaining

**Example 1: Using Built-in Preset**
```typescript
import { defaultPreset } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .withPreset(defaultPreset)
  .build();
```

**Example 2: Loading from JSON Config File**
```typescript
import fs from 'fs';
import { RBACBuilder } from '@fire-shield/core';

// Read config file
const configFile = fs.readFileSync('./rbac.config.json', 'utf-8');
const config = JSON.parse(configFile);

// Build RBAC from config
const rbac = new RBACBuilder()
  .withPreset(config)
  .build();
```

**Example 3: Async File Loading**
```typescript
import { promises as fs } from 'fs';
import { RBACBuilder } from '@fire-shield/core';

async function loadRBAC() {
  const configFile = await fs.readFile('./rbac.config.json', 'utf-8');
  const config = JSON.parse(configFile);

  return new RBACBuilder()
    .withPreset(config)
    .build();
}

const rbac = await loadRBAC();
```

**Example Config File (rbac.config.json):**
```json
{
  "name": "my-app-rbac",
  "version": "1.0.0",
  "permissions": [
    {
      "name": "user:read",
      "bit": 1,
      "resource": "user",
      "action": "read",
      "description": "Read user data"
    },
    {
      "name": "user:write",
      "bit": 2,
      "resource": "user",
      "action": "write",
      "description": "Create/update users"
    },
    {
      "name": "post:read",
      "bit": 4,
      "resource": "post",
      "action": "read"
    },
    {
      "name": "post:write",
      "bit": 8,
      "resource": "post",
      "action": "write"
    }
  ],
  "roles": [
    {
      "name": "admin",
      "permissions": ["user:read", "user:write", "post:read", "post:write"],
      "level": 10,
      "description": "Administrator with full access"
    },
    {
      "name": "editor",
      "permissions": ["post:read", "post:write"],
      "level": 5,
      "description": "Content editor"
    },
    {
      "name": "viewer",
      "permissions": ["user:read", "post:read"],
      "level": 1,
      "description": "Read-only access"
    }
  ],
  "options": {
    "autoBitAssignment": true,
    "startBitValue": 1
  }
}
```

**Benefits of Config Files:**
- ✅ Separate configuration from code
- ✅ Easy to version control
- ✅ Share configs across team
- ✅ Hot reload in development
- ✅ Validate before loading

### addPermission(name, bit?, options?)

Add a permission to the system.

```typescript
addPermission(
  name: string,
  bit?: number,
  options?: {
    resource?: string;
    action?: string;
    description?: string;
    metadata?: Record<string, any>;
  }
): RBACBuilder
```

**Parameters:**
- `name` - Permission name (e.g., 'user:read')
- `bit` - Optional manual bit value (must be power of 2)
- `options` - Optional metadata

**Returns:** The builder instance for chaining

**Example:**
```typescript
const rbac = new RBACBuilder()
  .addPermission('user:read', 1, {
    resource: 'user',
    action: 'read',
    description: 'Read user information'
  })
  .addPermission('user:write', 2, {
    resource: 'user',
    action: 'write',
    description: 'Write user information'
  })
  .build();
```

### addRole(name, permissions, options?)

Add a role with permissions.

```typescript
addRole(
  name: string,
  permissions: string[],
  options?: {
    level?: number;
    description?: string;
    metadata?: Record<string, any>;
  }
): RBACBuilder
```

**Parameters:**
- `name` - Role name
- `permissions` - Array of permission names
- `options` - Optional metadata

**Returns:** The builder instance for chaining

**Example:**
```typescript
const rbac = new RBACBuilder()
  .addRole('admin', ['user:*', 'post:*'], {
    level: 10,
    description: 'System administrator'
  })
  .addRole('editor', ['post:read', 'post:write'], {
    level: 5,
    description: 'Content editor'
  })
  .build();
```

### enableWildcards(enabled?)

Enable or disable wildcard permission matching.

```typescript
enableWildcards(enabled: boolean = true): RBACBuilder
```

**Parameters:**
- `enabled` - Whether to enable wildcards (default: true)

**Returns:** The builder instance for chaining

**Example:**
```typescript
const rbac = new RBACBuilder()
  .enableWildcards(true)
  .addRole('admin', ['*'])
  .build();
```

### withAuditLogger(logger)

Add an audit logger to the RBAC instance.

```typescript
withAuditLogger(logger: AuditLogger): RBACBuilder
```

**Parameters:**
- `logger` - Audit logger instance

**Returns:** The builder instance for chaining

**Example:**
```typescript
import { ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .withAuditLogger(new ConsoleAuditLogger())
  .build();
```

### build()

Build and return the RBAC instance.

```typescript
build(): RBAC
```

**Returns:** Configured RBAC instance

**Example:**
```typescript
const rbac = new RBACBuilder()
  .addRole('user', ['post:read'])
  .build();
```

## Complete Examples

### Blog System

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .useBitSystem()

  // Add permissions
  .addPermission('post:read', 1)
  .addPermission('post:write', 2)
  .addPermission('post:delete', 4)
  .addPermission('post:publish', 8)
  .addPermission('comment:read', 16)
  .addPermission('comment:write', 32)
  .addPermission('comment:moderate', 64)

  // Add roles
  .addRole('viewer', ['post:read', 'comment:read'], {
    level: 1,
    description: 'Can only view content'
  })
  .addRole('author', ['post:read', 'post:write', 'comment:read', 'comment:write'], {
    level: 5,
    description: 'Can create and edit own posts'
  })
  .addRole('editor', ['post:*', 'comment:*'], {
    level: 8,
    description: 'Can manage all posts and comments'
  })
  .addRole('admin', ['*'], {
    level: 10,
    description: 'Full system access'
  })

  .build();
```

### E-Commerce System

```typescript
import { RBACBuilder, BufferedAuditLogger } from '@fire-shield/core';

const auditLogger = new BufferedAuditLogger(async (logs) => {
  await database.auditLogs.insertMany(logs);
});

const rbac = new RBACBuilder()
  .useBitSystem()
  .withAuditLogger(auditLogger)

  // Customer permissions
  .addPermission('product:view', 1)
  .addPermission('cart:manage', 2)
  .addPermission('order:create', 4)
  .addPermission('order:view:own', 8)

  // Admin permissions
  .addPermission('product:manage', 16)
  .addPermission('order:view:all', 32)
  .addPermission('order:update', 64)
  .addPermission('inventory:manage', 128)

  // Roles
  .addRole('customer', ['product:view', 'cart:manage', 'order:create', 'order:view:own'], {
    level: 1
  })
  .addRole('manager', ['product:manage', 'order:view:all', 'order:update', 'inventory:manage'], {
    level: 5
  })
  .addRole('admin', ['*'], {
    level: 10
  })

  .build();
```

### Multi-Tenant SaaS

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .useBitSystem()
  .enableWildcards(true)

  // Workspace permissions
  .addPermission('workspace:read')
  .addPermission('workspace:update')
  .addPermission('workspace:delete')
  .addPermission('workspace:invite')
  .addPermission('data:read')
  .addPermission('data:write')
  .addPermission('billing:view')
  .addPermission('billing:update')

  // Roles
  .addRole('workspace-guest', ['workspace:read', 'data:read'], {
    level: 1,
    description: 'Read-only guest access'
  })
  .addRole('workspace-member', ['workspace:read', 'data:*'], {
    level: 3,
    description: 'Regular team member'
  })
  .addRole('workspace-admin', ['workspace:*', 'data:*', 'workspace:invite'], {
    level: 7,
    description: 'Workspace administrator'
  })
  .addRole('workspace-owner', ['*'], {
    level: 10,
    description: 'Workspace owner with full access'
  })

  .build();
```

## Method Chaining

All builder methods return the builder instance, allowing you to chain calls:

```typescript
const rbac = new RBACBuilder()
  .useBitSystem()                    // 1. Choose system
  .enableWildcards(true)             // 2. Enable wildcards
  .withAuditLogger(logger)           // 3. Add audit logging
  .addPermission('user:read', 1)     // 4. Add permissions
  .addPermission('user:write', 2)
  .addRole('user', ['user:read'])    // 5. Add roles
  .addRole('admin', ['*'])
  .build();                          // 6. Build RBAC instance
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { RBACBuilder, type RBACUser } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .addRole('admin', ['user:*'])
  .build();

const user: RBACUser = {
  id: 'user-1',
  roles: ['admin']
};

rbac.hasPermission(user, 'user:read'); // Type-safe
```

## Best Practices

### 1. Group Related Configuration

```typescript
// ✅ Good: Logical grouping
const rbac = new RBACBuilder()
  // System configuration
  .useBitSystem()
  .enableWildcards(true)

  // Permissions
  .addPermission('user:read', 1)
  .addPermission('user:write', 2)

  // Roles
  .addRole('user', ['user:read'])
  .addRole('admin', ['*'])

  .build();
```

### 2. Use Descriptive Options

```typescript
// ✅ Good: Include descriptions
const rbac = new RBACBuilder()
  .addRole('moderator', ['comment:moderate', 'post:flag'], {
    level: 6,
    description: 'Community moderator with content moderation powers',
    metadata: {
      department: 'Community',
      maxActions: 100
    }
  })
  .build();
```

### 3. Separate Configuration

```typescript
// config/rbac.ts
import { RBACBuilder } from '@fire-shield/core';
import { auditLogger } from './audit';

export function createRBAC() {
  return new RBACBuilder()
    .withAuditLogger(auditLogger)
    .addPermission('user:read', 1)
    .addPermission('user:write', 2)
    .addRole('user', ['user:read'])
    .addRole('admin', ['*'])
    .build();
}
```

## Next Steps

- Learn about [Audit Logging](/api/audit)
- Explore [TypeScript Types](/api/types)
- Check out [Core API](/api/core)
