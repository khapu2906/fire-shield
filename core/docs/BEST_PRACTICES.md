# Best Practices

Recommended patterns and anti-patterns for using RBAC effectively.

## Table of Contents

- [Permission Design](#permission-design)
- [Role Design](#role-design)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Testing Strategies](#testing-strategies)
- [Common Patterns](#common-patterns)
- [Anti-Patterns](#anti-patterns)

---

## Permission Design

### ✅ DO: Use Consistent Naming Convention

**Good:**
```typescript
// Resource:action pattern
'user:read'
'user:write'
'user:delete'
'post:read'
'post:write'
'post:delete'
```

**Bad:**
```typescript
// Inconsistent patterns
'readUser'
'user_write'
'deletePost'
'post.read'
```

### ✅ DO: Keep Permissions Granular

**Good:**
```typescript
'post:read'
'post:write'
'post:delete'
'post:publish'
```

**Bad:**
```typescript
'post:manage'  // Too broad, unclear what it includes
```

### ✅ DO: Use Hierarchical Naming

**Good:**
```typescript
'admin:users:read'
'admin:users:write'
'admin:users:delete'
'admin:settings:read'
'admin:settings:write'
```

**Bad:**
```typescript
'admin_users_read'
'usersRead'
```

### ❌ DON'T: Create Too Many Permissions

**Bad:**
```typescript
// 100+ individual permissions
'post:read'
'post:read:own'
'post:read:others'
'post:read:published'
'post:read:draft'
// ... 95 more
```

**Good:**
```typescript
// Use context-based checks instead
'post:read'  // Check ownership in business logic

function canReadPost(user: User, post: Post): boolean {
  if (rbac.hasPermission(user, 'post:read:all')) return true;
  if (rbac.hasPermission(user, 'post:read:own') && post.authorId === user.id) return true;
  return false;
}
```

### ✅ DO: Document Permissions

```typescript
// Good - with documentation
const PERMISSIONS = {
  // User management
  USER_READ: 'user:read',          // View user profiles and lists
  USER_WRITE: 'user:write',        // Create and update users
  USER_DELETE: 'user:delete',      // Permanently delete users

  // Post management
  POST_READ: 'post:read',          // View published posts
  POST_WRITE: 'post:write',        // Create and edit own posts
  POST_PUBLISH: 'post:publish',    // Publish posts (make public)
  POST_DELETE: 'post:delete',      // Delete any post
} as const;
```

---

## Role Design

### ✅ DO: Create Roles Based on Job Functions

**Good:**
```typescript
rbac.createRole('content-editor', [
  'post:read',
  'post:write',
  'post:publish'
]);

rbac.createRole('content-moderator', [
  'post:read',
  'post:flag',
  'comment:moderate'
]);
```

**Bad:**
```typescript
// Roles based on individuals
rbac.createRole('johns-role', [...]);
rbac.createRole('marys-role', [...]);
```

### ✅ DO: Use Role Composition

**Good:**
```typescript
// Base roles
rbac.createRole('reader', ['post:read', 'comment:read']);
rbac.createRole('writer', ['post:read', 'post:write']);
rbac.createRole('publisher', ['post:read', 'post:write', 'post:publish']);

// User can have multiple roles
const user = {
  id: '1',
  roles: ['writer', 'moderator']  // Combines permissions from both
};
```

**Bad:**
```typescript
// Monolithic roles with duplicated permissions
rbac.createRole('writer', ['post:read', 'post:write']);
rbac.createRole('writer-moderator', ['post:read', 'post:write', 'comment:moderate']);
rbac.createRole('writer-publisher', ['post:read', 'post:write', 'post:publish']);
```

### ✅ DO: Set Appropriate Role Levels

**Good:**
```typescript
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('moderator', 5);
hierarchy.setRoleLevel('admin', 10);
hierarchy.setRoleLevel('super-admin', 100);

// Clear hierarchy with gaps for future roles
```

**Bad:**
```typescript
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('moderator', 2);
hierarchy.setRoleLevel('admin', 3);

// No room to add intermediate roles
```

### ❌ DON'T: Create Too Many Roles

**Bad:**
```typescript
// 50+ hyper-specific roles
'junior-content-editor'
'senior-content-editor'
'junior-content-editor-with-publish'
'senior-content-editor-without-delete'
// ...
```

**Good:**
```typescript
// Fewer roles + direct permissions for exceptions
rbac.createRole('content-editor', [...]);
rbac.createRole('senior-editor', [...]);

// Use direct permissions for exceptions
seniorEditor.permissions = ['post:publish'];
```

---

## Performance Optimization

### ✅ DO: Use Bit-Based System for Production

**Good:**
```typescript
const rbac = new RBAC({ useBitSystem: true });

// O(1) permission checks
rbac.hasPermission(user, 'post:read');
```

**Only use string-based if**:
- You have > 31 permissions
- You're in development/prototyping

### ✅ DO: Use Permission Masks for Bulk Operations

**Good:**
```typescript
// Calculate mask once
const editorMask = rbac.getRoleMask('editor');

// Reuse for many users
users.forEach(user => {
  user.permissionMask = editorMask;
});
```

**Bad:**
```typescript
// Recalculating for each user
users.forEach(user => {
  user.roles = ['editor'];
  // Forces recalculation on every check
});
```

### ✅ DO: Use Buffered Audit Logger in Production

**Good:**
```typescript
const logger = new BufferedAuditLogger(
  async (events) => {
    await database.auditLogs.insertMany(events);
  },
  {
    maxBufferSize: 100,
    flushIntervalMs: 5000
  }
);

const rbac = new RBAC({ auditLogger: logger });
```

**Bad:**
```typescript
// Synchronous logger that blocks on every check
const logger = {
  log: (event) => {
    database.auditLogs.insertOne(event);  // Blocks permission check!
  }
};
```

### ✅ DO: Cache Permission Checks When Appropriate

**Good:**
```typescript
// For expensive context-based checks
const permissionCache = new Map<string, boolean>();

function canEditPost(user: User, post: Post): boolean {
  const cacheKey = `${user.id}:${post.id}:edit`;

  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }

  const canEdit = rbac.hasPermission(user, 'post:edit') &&
                  (post.authorId === user.id || rbac.hasPermission(user, 'post:edit:all'));

  permissionCache.set(cacheKey, canEdit);
  return canEdit;
}
```

---

## Security Considerations

### ✅ DO: Validate User Input

**Good:**
```typescript
function checkPermission(userId: string, permission: string): boolean {
  // Validate inputs
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  if (!permission || typeof permission !== 'string') {
    throw new Error('Invalid permission');
  }

  // Sanitize permission string
  if (!/^[a-z0-9:*]+$/i.test(permission)) {
    throw new Error('Invalid permission format');
  }

  return rbac.hasPermission(user, permission);
}
```

### ✅ DO: Use Deny Permissions for Security

**Good:**
```typescript
// Suspend suspicious user immediately
rbac.denyPermission(suspiciousUserId, '*');

// Block specific dangerous operations
rbac.denyPermission(userId, 'admin:delete:*');
```

### ✅ DO: Log All Permission Checks

**Good:**
```typescript
const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      // Log all permission checks for security audit
      await securityLog.insertMany(events);

      // Alert on suspicious patterns
      const failedAttempts = events.filter(e => !e.allowed);
      if (failedAttempts.length > 10) {
        await alertSecurity(failedAttempts);
      }
    }
  )
});
```

### ❌ DON'T: Trust Client-Side Permission Checks

**Bad:**
```typescript
// Client-side (React)
if (rbac.hasPermission(user, 'post:delete')) {
  // Show delete button
  deletePost(postId);  // DANGER: Client can bypass this!
}
```

**Good:**
```typescript
// Client-side (React)
if (rbac.hasPermission(user, 'post:delete')) {
  // Show delete button (UI only)
}

// Server-side (required!)
app.delete('/posts/:id', (req, res) => {
  if (!rbac.hasPermission(req.user, 'post:delete')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  deletePost(req.params.id);
});
```

### ✅ DO: Use Strict Mode in Production

**Good:**
```typescript
const rbac = new RBAC({ strictMode: true });

// Throws error on invalid operations
rbac.hasPermission(null, 'post:read');  // Throws!
```

### ❌ DON'T: Expose RBAC State to Client

**Bad:**
```typescript
// API endpoint
app.get('/rbac/state', (req, res) => {
  res.json(rbac.serialize());  // DANGER: Exposes all permissions!
});
```

**Good:**
```typescript
// Only send user's own permissions
app.get('/me/permissions', (req, res) => {
  const user = req.user;
  const permissions = rbac.getUserPermissions(user);
  res.json({ permissions });
});
```

---

## Testing Strategies

### ✅ DO: Test All Permission Scenarios

**Good:**
```typescript
describe('Post permissions', () => {
  it('should allow editors to write posts', () => {
    const editor = { id: '1', roles: ['editor'] };
    expect(rbac.hasPermission(editor, 'post:write')).toBe(true);
  });

  it('should deny readers from writing posts', () => {
    const reader = { id: '2', roles: ['reader'] };
    expect(rbac.hasPermission(reader, 'post:write')).toBe(false);
  });

  it('should respect deny permissions', () => {
    const editor = { id: '1', roles: ['editor'] };
    rbac.denyPermission('1', 'post:write');
    expect(rbac.hasPermission(editor, 'post:write')).toBe(false);
  });
});
```

### ✅ DO: Test Role Hierarchy

**Good:**
```typescript
describe('Role hierarchy', () => {
  it('should allow admin to act as editor', () => {
    expect(rbac.canActAsRole('admin', 'editor')).toBe(true);
  });

  it('should prevent editor from acting as admin', () => {
    expect(rbac.canActAsRole('editor', 'admin')).toBe(false);
  });
});
```

### ✅ DO: Test Wildcard Patterns

**Good:**
```typescript
describe('Wildcard permissions', () => {
  it('should match admin:* pattern', () => {
    const admin = { id: '1', roles: ['admin'] };
    expect(rbac.hasPermission(admin, 'admin:users')).toBe(true);
    expect(rbac.hasPermission(admin, 'admin:settings')).toBe(true);
  });

  it('should not match non-admin permissions', () => {
    const admin = { id: '1', roles: ['admin'] };
    expect(rbac.hasPermission(admin, 'user:read')).toBe(false);
  });
});
```

### ✅ DO: Test Audit Logging

**Good:**
```typescript
describe('Audit logging', () => {
  it('should log permission checks', () => {
    const events: AuditEvent[] = [];
    const logger = { log: (event: AuditEvent) => events.push(event) };

    const rbac = new RBAC({ auditLogger: logger });
    rbac.hasPermission(user, 'post:read');

    expect(events).toHaveLength(1);
    expect(events[0].permission).toBe('post:read');
  });
});
```

---

## Common Patterns

### Pattern 1: Multi-Tenant SaaS

```typescript
// Tenant isolation with wildcards
rbac.createRole('tenant-owner', ['tenant:*']);
rbac.createRole('tenant-admin', ['tenant:users:*', 'tenant:data:*']);
rbac.createRole('tenant-user', ['tenant:data:read']);

// Check with tenant context
function hasPermissionInTenant(user: User, permission: string, tenantId: string): boolean {
  const tenantPermission = `tenant:${tenantId}:${permission}`;
  return rbac.hasPermission(user, tenantPermission);
}
```

### Pattern 2: Resource Ownership

```typescript
// Combine RBAC with resource ownership
function canEditPost(user: User, post: Post): boolean {
  // Can edit if has global permission
  if (rbac.hasPermission(user, 'post:edit:all')) return true;

  // Can edit own posts if has permission
  if (rbac.hasPermission(user, 'post:edit:own') && post.authorId === user.id) {
    return true;
  }

  return false;
}
```

### Pattern 3: Time-Based Permissions

```typescript
// Grant temporary access
function grantTemporaryAccess(userId: string, permission: string, durationMs: number) {
  const user = getUser(userId);

  // Add direct permission
  if (!user.permissions) user.permissions = [];
  user.permissions.push(permission);

  // Remove after duration
  setTimeout(() => {
    user.permissions = user.permissions.filter(p => p !== permission);
  }, durationMs);
}

// Usage
grantTemporaryAccess('user-1', 'admin:view', 3600000); // 1 hour
```

### Pattern 4: Feature Flags

```typescript
// Use permissions as feature flags
const FEATURES = {
  NEW_EDITOR: 'feature:new-editor',
  BETA_API: 'feature:beta-api',
  DARK_MODE: 'feature:dark-mode',
};

// Grant to specific users
rbac.denyPermission('user-1', FEATURES.NEW_EDITOR); // Opt out
user.permissions = [FEATURES.BETA_API]; // Opt in

// Check in code
if (rbac.hasPermission(user, FEATURES.NEW_EDITOR)) {
  return <NewEditor />;
}
```

### Pattern 5: API Rate Limiting

```typescript
// Use audit logs for rate limiting
class RateLimitLogger implements AuditLogger {
  private attempts = new Map<string, number[]>();

  log(event: AuditEvent): void {
    const key = event.userId;
    const now = Date.now();

    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const userAttempts = this.attempts.get(key)!;
    userAttempts.push(now);

    // Keep only last minute
    this.attempts.set(key, userAttempts.filter(t => now - t < 60000));

    // Block if too many attempts
    if (userAttempts.length > 100) {
      rbac.denyPermission(key, '*');
    }
  }
}
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Permission in Permission Name

**Bad:**
```typescript
'user:read:if:admin'
'post:write:only:owner'
```

**Why:** Permissions should be simple identifiers. Use business logic for complex rules.

**Good:**
```typescript
'user:read'
'post:write'

// Complex logic in code
function canWritePost(user: User, post: Post): boolean {
  if (rbac.hasPermission(user, 'post:write:all')) return true;
  if (rbac.hasPermission(user, 'post:write') && post.authorId === user.id) return true;
  return false;
}
```

### ❌ Anti-Pattern 2: Using Permissions as Status

**Bad:**
```typescript
'user:status:active'
'user:status:suspended'
'user:status:deleted'
```

**Why:** Status is data, not permission. Use user properties.

**Good:**
```typescript
user.status = 'active' | 'suspended' | 'deleted';

if (user.status === 'suspended') {
  rbac.denyPermission(user.id, '*');
}
```

### ❌ Anti-Pattern 3: Embedding User Data in Permissions

**Bad:**
```typescript
`user:${userId}:read`
`post:${postId}:write`
```

**Why:** Creates infinite permissions. Use context instead.

**Good:**
```typescript
'user:read'
'post:write'

function canAccessResource(user: User, resourceId: string): boolean {
  const resource = getResource(resourceId);
  return rbac.hasPermission(user, 'resource:read') &&
         (resource.ownerId === user.id || rbac.hasPermission(user, 'resource:read:all'));
}
```

### ❌ Anti-Pattern 4: Overusing Direct Permissions

**Bad:**
```typescript
// Every user has 20+ direct permissions
user.permissions = [
  'post:read',
  'post:write',
  'comment:read',
  'comment:write',
  // ... 15 more
];
```

**Why:** Hard to manage, defeats purpose of roles.

**Good:**
```typescript
// Use roles for common permission sets
rbac.createRole('content-creator', [
  'post:read',
  'post:write',
  'comment:read',
  'comment:write'
]);

user.roles = ['content-creator'];

// Use direct permissions only for exceptions
user.permissions = ['beta:new-feature'];
```

### ❌ Anti-Pattern 5: Not Using Hierarchy

**Bad:**
```typescript
// Admins need to be assigned every permission
rbac.createRole('admin', [
  'user:read',
  'user:write',
  'user:delete',
  'post:read',
  'post:write',
  'post:delete',
  // ... 100 more permissions
]);
```

**Good:**
```typescript
// Use wildcards and hierarchy
rbac.createRole('admin', ['*']);
hierarchy.setRoleLevel('admin', 10);
```

---

## Summary Checklist

### Before Going to Production

- [ ] All permissions follow consistent naming convention
- [ ] Roles are based on job functions, not individuals
- [ ] Using bit-based system (if ≤ 31 permissions)
- [ ] Audit logging enabled with buffered logger
- [ ] Server-side permission checks on all protected endpoints
- [ ] Strict mode enabled
- [ ] Comprehensive tests for all permission scenarios
- [ ] Role hierarchy configured appropriately
- [ ] Permission documentation created
- [ ] Security audit completed

---

See also:
- [Core Concepts](./CORE_CONCEPTS.md) - Understanding RBAC fundamentals
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Performance Guide](./PERFORMANCE.md) - Optimization tips
