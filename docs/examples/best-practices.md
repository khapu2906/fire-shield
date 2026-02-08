# Best Practices

Comprehensive guide to using Fire Shield RBAC effectively and securely.

## Permission Design

### Use Consistent Naming Conventions

```typescript
// ✅ Good: Clear, consistent pattern
const permissions = [
  'user:read',
  'user:create',
  'user:update',
  'user:delete',
  'post:read',
  'post:create',
  'post:update',
  'post:delete'
];

// ❌ Bad: Inconsistent naming
const permissions = [
  'readUser',
  'user-create',
  'update_user',
  'DeleteUser'
];
```

### Follow Resource:Action Pattern

```typescript
// ✅ Good: Resource:Action format
.addPermission('document:read')
.addPermission('document:write')
.addPermission('invoice:approve')
.addPermission('report:generate')

// ❌ Bad: Unclear structure
.addPermission('read')
.addPermission('write_document')
.addPermission('approveInvoice')
```

### Use Hierarchical Permissions

```typescript
// ✅ Good: Hierarchical structure
const rbac = new RBACBuilder()
  .addPermission('api:users:read')
  .addPermission('api:users:write')
  .addPermission('api:posts:read')
  .addPermission('api:posts:write')
  .addPermission('api:admin:users:delete')
  .build();

// Allows wildcard patterns
// 'api:*' → All API access
// 'api:users:*' → All user operations
// 'api:*:read' → All read operations
```

### Design for Least Privilege

```typescript
// ✅ Good: Specific permissions
.addRole('viewer', ['posts:read', 'comments:read'])
.addRole('editor', ['posts:read', 'posts:write', 'comments:read'])
.addRole('admin', ['posts:*', 'comments:*', 'users:read'])

// ❌ Bad: Overly broad permissions
.addRole('viewer', ['*']) // Too much access for a viewer
.addRole('editor', ['posts:*', 'users:*', 'system:*']) // Unnecessary permissions
```

## Role Design

### Keep Roles Simple and Focused

```typescript
// ✅ Good: Clear, single-purpose roles
.addRole('content-viewer', ['posts:read', 'comments:read'])
.addRole('content-editor', ['posts:read', 'posts:write'])
.addRole('content-publisher', ['posts:read', 'posts:write', 'posts:publish'])
.addRole('user-manager', ['users:read', 'users:create', 'users:update'])

// ❌ Bad: Kitchen sink roles
.addRole('super-user', [
  'posts:*', 'comments:*', 'users:*', 'settings:*',
  'billing:*', 'analytics:*', 'reports:*'
]) // Too many responsibilities
```

### Use Role Composition

```typescript
// ✅ Good: Compose multiple roles
const user = {
  id: 'user-1',
  roles: ['content-editor', 'comment-moderator']
};

// User gets combined permissions from both roles

// ❌ Bad: Creating duplicate mega-roles
.addRole('editor-and-moderator', [
  'posts:read', 'posts:write',
  'comments:read', 'comments:delete', 'comments:moderate'
]) // Harder to maintain
```

### Leverage Role Hierarchy

```typescript
// ✅ Good: Use hierarchy levels
const rbac = new RBACBuilder()
  .addRole('intern', ['docs:read'], { level: 1 })
  .addRole('junior', ['docs:read', 'docs:write'], { level: 5 })
  .addRole('senior', ['docs:*', 'review:*'], { level: 10 })
  .addRole('lead', ['docs:*', 'review:*', 'approve:*'], { level: 15 })
  .addRole('manager', ['*'], { level: 20 })
  .build();

// Allows automatic inheritance and delegation checks
console.log(rbac.canActAsRole('manager', 'senior')); // true
```

## Performance Optimization

### Use Bit-Based System for High Performance

```typescript
// ✅ Good: Bit-based for production
const rbac = new RBACBuilder()
  .useBitSystem() // O(1) permission checks
  .addPermission('user:read', 1)
  .addPermission('user:write', 2)
  .addPermission('post:read', 4)
  .addPermission('post:write', 8)
  .build();

// Ultra-fast checks using bitwise operations
rbac.hasPermission(user, 'user:read'); // ~0.0001ms

// ❌ Avoid: String-based in high-traffic apps
const rbac = new RBAC(); // 10x slower for permission checks
```

### Cache User Permissions

```typescript
// ✅ Good: Cache computed permissions
class PermissionCache {
  private cache = new Map&lt;string, Set&lt;string&gt;&gt;();
  private ttl = 300000; // 5 minutes

  getUserPermissions(rbac: RBAC, user: RBACUser): Set&lt;string&gt; {
    const cacheKey = `${user.id}:${user.roles.join(',')}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Compute all permissions for user
    const permissions = new Set&lt;string&gt;();
    for (const role of user.roles) {
      const rolePerms = rbac.getRole(role)?.permissions || [];
      rolePerms.forEach(p => permissions.add(p));
    }

    // Cache with TTL
    this.cache.set(cacheKey, permissions);
    setTimeout(() => this.cache.delete(cacheKey), this.ttl);

    return permissions;
  }
}

const cache = new PermissionCache();
const userPerms = cache.getUserPermissions(rbac, user);
```

### Minimize Permission Checks

```typescript
// ✅ Good: Check once, reuse result
function processUserActions(user: RBACUser, actions: Action[]) {
  const canWrite = rbac.hasPermission(user, 'post:write');
  const canDelete = rbac.hasPermission(user, 'post:delete');

  return actions.map(action => {
    if (action.type === 'write' && !canWrite) return null;
    if (action.type === 'delete' && !canDelete) return null;
    return performAction(action);
  });
}

// ❌ Bad: Repeated checks
function processUserActions(user: RBACUser, actions: Action[]) {
  return actions.map(action => {
    // Checks permission on every iteration
    if (action.type === 'write' && !rbac.hasPermission(user, 'post:write')) {
      return null;
    }
    // ... more repeated checks
  });
}
```

## Security Best Practices

### Always Validate on Server Side

```typescript
// ✅ Good: Server-side validation
// Frontend (React)
function DeleteButton({ post }) {
  const { can } = useRBAC();

  // UI check for better UX
  if (!can('post:delete')) {
    return null;
  }

  return <button onClick={handleDelete}>Delete</button>;
}

// Backend (Express)
app.delete('/posts/:id',
  rbacMiddleware.requirePermission('post:delete'), // ✅ Server check
  async (req, res) => {
    await deletePost(req.params.id);
    res.json({ success: true });
  }
);

// ❌ Bad: Only client-side check
// Backend without validation
app.delete('/posts/:id', async (req, res) => {
  // No permission check - SECURITY VULNERABILITY!
  await deletePost(req.params.id);
  res.json({ success: true });
});
```

### Deny by Default

```typescript
// ✅ Good: Explicit allow, implicit deny
function canPerformAction(user: RBACUser, action: string): boolean {
  // Returns false if permission not found
  return rbac.hasPermission(user, action);
}

// ❌ Bad: Allow by default
function canPerformAction(user: RBACUser, action: string): boolean {
  try {
    return rbac.hasPermission(user, action);
  } catch (error) {
    return true; // DANGEROUS! Allows on error
  }
}
```

### Validate User Input

```typescript
// ✅ Good: Validate and sanitize
function createRole(name: string, permissions: string[]) {
  // Validate role name
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Invalid role name');
  }

  // Validate permissions exist
  const validPermissions = permissions.filter(p =>
    rbac.hasPermission({ id: 'system', roles: [] }, p)
  );

  return rbac.createRole(name, validPermissions);
}

// ❌ Bad: No validation
function createRole(name: string, permissions: string[]) {
  return rbac.createRole(name, permissions); // Could inject malicious data
}
```

### Use Audit Logging

```typescript
// ✅ Good: Comprehensive audit logging
const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      await db.auditLogs.insertMany(events);

      // Alert on security events
      const criticalEvents = events.filter(e =>
        !e.allowed && e.permission.includes('admin')
      );

      if (criticalEvents.length > 0) {
        await alertSecurityTeam(criticalEvents);
      }
    },
    { maxBufferSize: 100, flushIntervalMs: 5000 }
  )
});

// ❌ Bad: No audit trail
const rbac = new RBAC(); // No visibility into access patterns
```

## Code Organization

### Centralize RBAC Configuration

```typescript
// ✅ Good: Single source of truth
// lib/rbac.ts
import { RBACBuilder } from '@fire-shield/core';

export const rbac = new RBACBuilder()
  .useBitSystem()
  .enableWildcards()

  // Define all permissions
  .addPermission('user:read')
  .addPermission('user:write')
  .addPermission('post:read')
  .addPermission('post:write')

  // Define all roles
  .addRole('admin', ['*'])
  .addRole('editor', ['post:*'])
  .addRole('viewer', ['post:read'])

  .build();

// Import and use everywhere
import { rbac } from '@/lib/rbac';

// ❌ Bad: Scattered configuration
// Different files creating roles differently
// file1.ts
rbac.createRole('admin', ['*']);

// file2.ts
rbac.createRole('admin', ['users:*', 'posts:*']); // Inconsistent!
```

### Use TypeScript for Type Safety

```typescript
// ✅ Good: Type-safe permissions
const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  POST_READ: 'post:read',
  POST_WRITE: 'post:write'
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

function checkPermission(user: RBACUser, permission: Permission): boolean {
  return rbac.hasPermission(user, permission);
}

// ✅ Type-safe usage
checkPermission(user, PERMISSIONS.USER_READ);

// ❌ Compiler error
checkPermission(user, 'invalid:permission');

// ❌ Bad: String literals everywhere
function checkPermission(user: RBACUser, permission: string): boolean {
  return rbac.hasPermission(user, permission); // No type safety
}

checkPermission(user, 'usr:raed'); // Typo not caught
```

### Document Permissions

```typescript
// ✅ Good: Well-documented permissions
const rbac = new RBACBuilder()
  /**
   * User Management Permissions
   * Used by: Admin panel, User settings
   */
  .addPermission('user:read', 1, {
    description: 'View user profiles and list users',
    resource: 'user',
    action: 'read'
  })
  .addPermission('user:write', 2, {
    description: 'Create and update user accounts',
    resource: 'user',
    action: 'write'
  })
  .addPermission('user:delete', 4, {
    description: 'Delete user accounts (irreversible)',
    resource: 'user',
    action: 'delete'
  })

  /**
   * Content Management Permissions
   * Used by: CMS, Blog platform
   */
  .addPermission('post:publish', 8, {
    description: 'Publish posts to public site',
    resource: 'post',
    action: 'publish'
  })

  .build();

// Generate documentation
function generatePermissionDocs(rbac: RBAC) {
  const permissions = rbac.getAllPermissions();
  console.log('# Permission Documentation\n');

  for (const perm of permissions) {
    console.log(`## ${perm.name}`);
    console.log(`- **Description**: ${perm.description}`);
    console.log(`- **Resource**: ${perm.resource}`);
    console.log(`- **Action**: ${perm.action}\n`);
  }
}
```

## Testing

### Test Permission Checks

```typescript
// ✅ Good: Comprehensive permission tests
import { describe, it, expect } from 'vitest';
import { rbac } from '@/lib/rbac';

describe('RBAC Permissions', () => {
  it('admin should have all permissions', () => {
    const admin = { id: '1', roles: ['admin'] };

    expect(rbac.hasPermission(admin, 'user:read')).toBe(true);
    expect(rbac.hasPermission(admin, 'user:write')).toBe(true);
    expect(rbac.hasPermission(admin, 'user:delete')).toBe(true);
  });

  it('viewer should only have read permissions', () => {
    const viewer = { id: '2', roles: ['viewer'] };

    expect(rbac.hasPermission(viewer, 'post:read')).toBe(true);
    expect(rbac.hasPermission(viewer, 'post:write')).toBe(false);
    expect(rbac.hasPermission(viewer, 'post:delete')).toBe(false);
  });

  it('should deny access when no roles assigned', () => {
    const noRole = { id: '3', roles: [] };

    expect(rbac.hasPermission(noRole, 'post:read')).toBe(false);
  });

  it('should handle wildcard permissions', () => {
    const editor = { id: '4', roles: ['editor'] };

    expect(rbac.hasPermission(editor, 'post:read')).toBe(true);
    expect(rbac.hasPermission(editor, 'post:write')).toBe(true);
    expect(rbac.hasPermission(editor, 'post:publish')).toBe(true);
  });
});
```

### Test Role Hierarchy

```typescript
describe('Role Hierarchy', () => {
  it('manager can act as engineer', () => {
    expect(rbac.canActAsRole('manager', 'engineer')).toBe(true);
  });

  it('engineer cannot act as manager', () => {
    expect(rbac.canActAsRole('engineer', 'manager')).toBe(false);
  });

  it('roles at same level cannot delegate', () => {
    expect(rbac.canActAsRole('engineer', 'designer')).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('API Permission Integration', () => {
  it('should protect admin endpoints', async () => {
    const viewer = { id: '1', roles: ['viewer'] };

    const response = await request(app)
      .delete('/api/users/123')
      .set('Authorization', createToken(viewer));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  it('should allow admin access', async () => {
    const admin = { id: '2', roles: ['admin'] };

    const response = await request(app)
      .delete('/api/users/123')
      .set('Authorization', createToken(admin));

    expect(response.status).toBe(200);
  });
});
```

## Error Handling

### Handle Missing Permissions Gracefully

```typescript
// ✅ Good: User-friendly error messages
function performAction(user: RBACUser, action: string) {
  const result = rbac.authorize(user, action);

  if (!result.allowed) {
    throw new PermissionError(
      `Access denied: ${result.reason}`,
      {
        userId: user.id,
        requiredPermission: action,
        userRoles: user.roles
      }
    );
  }

  // Perform action
}

class PermissionError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'PermissionError';
  }
}

// ❌ Bad: Generic errors
function performAction(user: RBACUser, action: string) {
  if (!rbac.hasPermission(user, action)) {
    throw new Error('Forbidden'); // Not helpful
  }
}
```

### Log Security Events

```typescript
// ✅ Good: Detailed security logging
function requirePermission(permission: string) {
  return (req, res, next) => {
    const result = rbac.authorize(req.user, permission);

    if (!result.allowed) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        permission,
        reason: result.reason,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}
```

## Deployment

### Environment-Specific Configuration

```typescript
// ✅ Good: Environment-aware setup
const rbac = new RBACBuilder()
  .useBitSystem()
  .enableWildcards()

  // Production: Strict mode with audit logging
  .configure({
    strictMode: process.env.NODE_ENV === 'production',
    auditLogger: process.env.NODE_ENV === 'production'
      ? new DatabaseAuditLogger()
      : new ConsoleAuditLogger()
  })

  .build();

// Development: Additional debug permissions
if (process.env.NODE_ENV === 'development') {
  rbac.createRole('developer', ['*']);
}
```

### Graceful Degradation

```typescript
// ✅ Good: Fallback when RBAC unavailable
function canPerform(user: RBACUser, permission: string): boolean {
  try {
    return rbac.hasPermission(user, permission);
  } catch (error) {
    logger.error('RBAC check failed', error);

    // Fail secure: deny by default
    return false;
  }
}
```

## Migration and Updates

### Version Your Permission Schema

```typescript
// ✅ Good: Versioned schema
interface PermissionSchemaV1 {
  version: 1;
  permissions: string[];
  roles: Record&lt;string, string[]&gt;;
}

interface PermissionSchemaV2 {
  version: 2;
  permissions: Array&lt;{
    name: string;
    bit: number;
    description: string;
  }&gt;;
  roles: Array&lt;{
    name: string;
    permissions: string[];
    level: number;
  }&gt;;
}

function migrateSchema(old: PermissionSchemaV1): PermissionSchemaV2 {
  // Migration logic
  return {
    version: 2,
    permissions: old.permissions.map((name, i) => ({
      name,
      bit: Math.pow(2, i),
      description: ''
    })),
    roles: Object.entries(old.roles).map(([name, permissions], i) => ({
      name,
      permissions,
      level: i * 10
    }))
  };
}
```

## Next Steps

- Review [Examples](/examples/basic-usage)
- Explore [API Reference](/api/core)
- Check [Audit Logging](/guide/audit-logging)
