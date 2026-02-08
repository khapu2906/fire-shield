# Deny Permissions

Learn how to explicitly deny permissions to override role-based grants.

## Overview

Deny Permissions is a powerful feature in Fire Shield v2.2.0 that allows you to explicitly revoke specific permissions from users, overriding their role-based permissions.

**Key Concepts:**
- **Deny > Allow**: Denied permissions ALWAYS take precedence over granted permissions
- **User-Specific**: Denies are applied per user, not per role
- **Temporary Revocation**: Great for temporary access restrictions without changing roles
- **Wildcard Support**: Can deny entire permission groups with wildcards

## Why Use Deny Permissions?

### Use Cases

1. **Temporary Restrictions**
   - Suspend user's write access during investigation
   - Revoke specific permissions temporarily without role change

2. **Fine-Grained Control**
   - Remove one permission from a role without creating a new role
   - Override role permissions for specific users

3. **Security Incidents**
   - Quickly revoke access when user account is compromised
   - Disable dangerous permissions immediately

4. **Feature Flags**
   - Disable beta features for specific users
   - Roll out features gradually

5. **Compliance**
   - Enforce regulatory restrictions on specific users
   - Implement separation of duties

## Basic Usage

### Deny a Permission

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();
rbac.createRole('editor', ['post:read', 'post:write', 'post:delete']);

const user = { id: 'user-123', roles: ['editor'] };

// User has all editor permissions initially
rbac.hasPermission(user, 'post:delete'); // ✅ true

// Deny delete permission for this specific user
rbac.denyPermission('user-123', 'post:delete');

// Now they can't delete, even though their role allows it
rbac.hasPermission(user, 'post:delete'); // ❌ false
rbac.hasPermission(user, 'post:write'); // ✅ true (still works)
```

### Allow Permission (Remove Deny)

```typescript
// Restore the denied permission
rbac.allowPermission('user-123', 'post:delete');

// Permission restored to role default
rbac.hasPermission(user, 'post:delete'); // ✅ true
```

### Check If Permission Is Denied

```typescript
// Check if a specific permission is denied for a user
const isDenied = rbac.isDenied('user-123', 'post:delete');

if (isDenied) {
  console.log('This permission is explicitly denied');
}
```

### Get All Denied Permissions

```typescript
// Get list of all denied permissions for a user
const deniedPermissions = rbac.getDeniedPermissions('user-123');

console.log('Denied permissions:', deniedPermissions);
// ['post:delete', 'user:write']
```

## Wildcard Denies

You can use wildcards to deny entire groups of permissions.

### Deny All Permissions in a Resource

```typescript
const rbac = new RBAC({ enableWildcards: true });

rbac.createRole('admin', ['user:*', 'post:*']);
const user = { id: 'admin-123', roles: ['admin'] };

// Deny all user-related permissions
rbac.denyPermission('admin-123', 'user:*');

// Admin can no longer access user operations
rbac.hasPermission(user, 'user:read');   // ❌ false
rbac.hasPermission(user, 'user:write');  // ❌ false
rbac.hasPermission(user, 'user:delete'); // ❌ false

// But can still access posts
rbac.hasPermission(user, 'post:read');  // ✅ true
rbac.hasPermission(user, 'post:write'); // ✅ true
```

### Deny Specific Action Across Resources

```typescript
// Deny all delete operations
rbac.denyPermission('user-123', '*:delete');

rbac.hasPermission(user, 'post:delete');    // ❌ false
rbac.hasPermission(user, 'user:delete');    // ❌ false
rbac.hasPermission(user, 'comment:delete'); // ❌ false

// Other actions still work
rbac.hasPermission(user, 'post:write');   // ✅ true
rbac.hasPermission(user, 'user:read');    // ✅ true
```

## Priority Rules

### Deny Always Wins

Denied permissions ALWAYS take precedence, regardless of how permissions are granted.

```typescript
const rbac = new RBAC();
rbac.createRole('admin', ['*']); // Admin has ALL permissions

const user = {
  id: 'admin-123',
  roles: ['admin'],
  permissions: ['super:admin'] // Even with direct permission
};

// Deny one permission
rbac.denyPermission('admin-123', 'delete:database');

// Deny overrides role AND direct permissions
rbac.hasPermission(user, 'delete:database'); // ❌ false
rbac.hasPermission(user, 'create:user');     // ✅ true
```

**Priority Order:**
1. 🔴 **Deny** (highest priority)
2. 🟡 **Direct User Permissions**
3. 🟢 **Role Permissions** (lowest priority)

### Multiple Denies

You can deny multiple permissions for the same user:

```typescript
// Deny multiple permissions
rbac.denyPermission('user-123', 'post:delete');
rbac.denyPermission('user-123', 'user:delete');
rbac.denyPermission('user-123', 'comment:delete');

// Check all denies
const denied = rbac.getDeniedPermissions('user-123');
// ['post:delete', 'user:delete', 'comment:delete']
```

## Advanced Patterns

### Temporary Suspension

```typescript
function suspendUserWrites(userId: string) {
  // Deny all write operations
  rbac.denyPermission(userId, '*:write');
  rbac.denyPermission(userId, '*:delete');
  rbac.denyPermission(userId, '*:create');

  console.log(`User ${userId} suspended from write operations`);
}

function restoreUserAccess(userId: string) {
  // Remove all denies
  const denied = rbac.getDeniedPermissions(userId);

  for (const permission of denied) {
    rbac.allowPermission(userId, permission);
  }

  console.log(`User ${userId} access restored`);
}

// Use it
suspendUserWrites('suspicious-user-123');

// Later, after investigation
restoreUserAccess('suspicious-user-123');
```

### Feature Flags

```typescript
class FeatureFlags {
  constructor(private rbac: RBAC) {}

  disableFeature(userId: string, feature: string) {
    this.rbac.denyPermission(userId, `feature:${feature}`);
  }

  enableFeature(userId: string, feature: string) {
    this.rbac.allowPermission(userId, `feature:${feature}`);
  }

  isFeatureEnabled(user: RBACUser, feature: string): boolean {
    return this.rbac.hasPermission(user, `feature:${feature}`);
  }
}

// Usage
const flags = new FeatureFlags(rbac);

// Beta features are denied by default for some users
flags.disableFeature('user-123', 'ai-assistant');
flags.disableFeature('user-123', 'advanced-analytics');

// Enable for specific users
flags.enableFeature('beta-tester-456', 'ai-assistant');
```

### Compliance Enforcement

```typescript
class ComplianceManager {
  private rbac: RBAC;

  enforceSODPolicy(userId: string) {
    // Separation of Duties: Users can't approve their own requests

    if (this.userCreatesRequests(userId)) {
      // Deny approval permission
      this.rbac.denyPermission(userId, 'request:approve');
    }
  }

  enforceDataResidency(userId: string, region: string) {
    // GDPR: EU users can only access EU data

    if (region === 'EU') {
      this.rbac.denyPermission(userId, 'data:us:*');
      this.rbac.denyPermission(userId, 'data:asia:*');
    }
  }
}
```

### Emergency Lockdown

```typescript
function emergencyLockdown(userId: string, reason: string) {
  // Deny ALL permissions
  rbac.denyPermission(userId, '*');

  // Log the event
  console.log(`EMERGENCY: User ${userId} locked down. Reason: ${reason}`);

  // Send alert
  sendSecurityAlert({
    type: 'LOCKDOWN',
    userId,
    reason,
    timestamp: new Date()
  });
}

// Usage
emergencyLockdown('compromised-user-789', 'Suspected account breach');
```

## Framework Integration

### React

```tsx
import { useRBAC, useDenyPermission, useIsDenied } from '@fire-shield/react';

function UserManagement() {
  const { can } = useRBAC();
  const denyPermission = useDenyPermission();
  const isDeniedDelete = useIsDenied('user:delete');

  const handleSuspendUser = (userId: string) => {
    // Deny critical permissions
    denyPermission('user:delete');
    denyPermission('user:write');

    toast.success('User suspended');
  };

  return (
    <div>
      {isDeniedDelete && (
        <Alert>Delete permission is currently denied</Alert>
      )}

      {can('user:suspend') && (
        <Button onClick={() => handleSuspendUser('user-123')}>
          Suspend User
        </Button>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <!-- Show warning if permission is denied -->
    <Alert v-if="isDeniedDelete">
      Delete permission is currently denied
    </Alert>

    <!-- Suspend user button -->
    <button
      v-can="'user:suspend'"
      @click="suspendUser('user-123')"
    >
      Suspend User
    </button>
  </div>
</template>

<script setup>
import { useDenyPermission, useIsDenied } from '@fire-shield/vue';

const deny Permission = useDenyPermission();
const isDeniedDelete = useIsDenied('user:delete');

function suspendUser(userId) {
  denyPermission('user:delete');
  denyPermission('user:write');
}
</script>
```

### Express

```typescript
import { createExpressRBAC } from '@fire-shield/express';

const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user
});

// Endpoint to deny permission
app.post('/admin/deny-permission', async (req, res) => {
  const { userId, permission } = req.body;

  // Verify admin
  if (!rbac.hasPermission(req.user, 'admin:permissions')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Deny permission
  rbac.denyPermission(userId, permission);

  res.json({ success: true });
});

// Check denied permissions
app.get('/users/:id/denied-permissions', async (req, res) => {
  const denied = rbac.getDeniedPermissions(req.params.id);
  res.json({ deniedPermissions: denied });
});
```

## API Reference

### `denyPermission(userId, permission)`

Deny a specific permission for a user.

```typescript
rbac.denyPermission(
  userId: string,        // User ID
  permission: string     // Permission to deny (supports wildcards)
): void
```

**Example:**
```typescript
rbac.denyPermission('user-123', 'post:delete');
rbac.denyPermission('admin-456', 'user:*');
```

### `allowPermission(userId, permission)`

Remove a denied permission (restore to role default).

```typescript
rbac.allowPermission(
  userId: string,        // User ID
  permission: string     // Permission to allow back
): void
```

**Example:**
```typescript
rbac.allowPermission('user-123', 'post:delete');
```

### `isDenied(userId, permission)`

Check if a specific permission is denied for a user.

```typescript
rbac.isDenied(
  userId: string,        // User ID
  permission: string     // Permission to check
): boolean
```

**Returns:** `true` if permission is explicitly denied, `false` otherwise

**Example:**
```typescript
if (rbac.isDenied('user-123', 'post:delete')) {
  console.log('This permission is denied');
}
```

### `getDeniedPermissions(userId)`

Get all denied permissions for a user.

```typescript
rbac.getDeniedPermissions(
  userId: string         // User ID
): string[]
```

**Returns:** Array of denied permission strings

**Example:**
```typescript
const denied = rbac.getDeniedPermissions('user-123');
// ['post:delete', 'user:write']
```

## Best Practices

### 1. Document Denies

Always document why a permission was denied:

```typescript
interface PermissionDeny {
  userId: string;
  permission: string;
  reason: string;
  deniedAt: Date;
  deniedBy: string;
}

class AuditedRBAC {
  private denies: PermissionDeny[] = [];

  denyWithReason(
    userId: string,
    permission: string,
    reason: string,
    deniedBy: string
  ) {
    this.rbac.denyPermission(userId, permission);

    this.denies.push({
      userId,
      permission,
      reason,
      deniedAt: new Date(),
      deniedBy
    });
  }

  getDenyReason(userId: string, permission: string): string | null {
    const deny = this.denies.find(d =>
      d.userId === userId && d.permission === permission
    );
    return deny?.reason || null;
  }
}
```

### 2. Time-Limited Denies

Implement automatic expiration:

```typescript
class TemporaryDenies {
  private rbac: RBAC;
  private expirations = new Map<string, Date>();

  denyUntil(userId: string, permission: string, until: Date) {
    this.rbac.denyPermission(userId, permission);

    const key = `${userId}:${permission}`;
    this.expirations.set(key, until);

    // Schedule removal
    const timeout = until.getTime() - Date.now();
    setTimeout(() => {
      this.rbac.allowPermission(userId, permission);
      this.expirations.delete(key);
    }, timeout);
  }
}

// Usage
const temp = new TemporaryDenies(rbac);

// Deny for 24 hours
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

temp.denyUntil('user-123', 'post:delete', tomorrow);
```

### 3. Notify Users

Inform users when permissions are denied:

```typescript
function denyWithNotification(
  userId: string,
  permission: string,
  reason: string
) {
  rbac.denyPermission(userId, permission);

  // Send notification
  sendEmail({
    to: getUserEmail(userId),
    subject: 'Permission Revoked',
    body: `Your ${permission} permission has been revoked. Reason: ${reason}`
  });
}
```

### 4. Bulk Operations

Provide helpers for common deny scenarios:

```typescript
function suspendAllWrites(userId: string) {
  const writePermissions = ['*:write', '*:delete', '*:create', '*:update'];

  for (const permission of writePermissions) {
    rbac.denyPermission(userId, permission);
  }
}

function removeAllDenies(userId: string) {
  const denied = rbac.getDeniedPermissions(userId);

  for (const permission of denied) {
    rbac.allowPermission(userId, permission);
  }
}
```

### 5. Integration with Audit Logs

Track all deny operations:

```typescript
const rbac = new RBAC({
  auditLogger: {
    log: (event) => {
      if (event.action === 'deny_permission') {
        console.log('Permission denied:', event);
        database.logSecurityEvent(event);
      }
    }
  }
});
```

## Common Patterns

### Role Downgrade Without Role Change

```typescript
// Temporarily reduce admin to read-only without changing their role
function downgradeToReadOnly(userId: string) {
  rbac.denyPermission(userId, '*:write');
  rbac.denyPermission(userId, '*:delete');
  rbac.denyPermission(userId, '*:create');
  rbac.denyPermission(userId, '*:update');

  // They keep their role but can only read
}
```

### Progressive Access

```typescript
// Start with minimal access, gradually enable features
function onboardNewUser(userId: string) {
  // Deny advanced features initially
  rbac.denyPermission(userId, 'feature:analytics');
  rbac.denyPermission(userId, 'feature:export');
  rbac.denyPermission(userId, 'feature:api');

  // After 30 days, enable analytics
  setTimeout(() => {
    rbac.allowPermission(userId, 'feature:analytics');
  }, 30 * 24 * 60 * 60 * 1000);
}
```

### Context-Based Restrictions

```typescript
// Deny permissions based on context
function enforceWorkHours(userId: string) {
  const hour = new Date().getHours();

  // Deny sensitive operations outside work hours (9 AM - 5 PM)
  if (hour < 9 || hour >= 17) {
    rbac.denyPermission(userId, 'financial:*');
    rbac.denyPermission(userId, 'user:delete');
  } else {
    rbac.allowPermission(userId, 'financial:*');
    rbac.allowPermission(userId, 'user:delete');
  }
}
```

## Comparison with Other Approaches

### vs. Removing from Role

**Deny Permission:**
- ✅ Temporary and reversible
- ✅ Doesn't affect role definition
- ✅ User-specific
- ✅ Faster to implement

**Remove from Role:**
- ❌ Changes role structure
- ❌ Affects all users with that role
- ❌ Requires role management
- ✅ More permanent solution

### vs. Creating New Role

**Deny Permission:**
- ✅ No role proliferation
- ✅ Easy to manage
- ✅ Quick to apply/remove

**New Role:**
- ❌ Role explosion
- ❌ Hard to maintain
- ✅ Better for permanent changes

## Next Steps

- [Wildcards](/guide/wildcards) - Pattern matching in permissions
- [Audit Logging](/guide/audit-logging) - Track permission changes
- [Role Hierarchy](/guide/role-hierarchy) - Organize roles effectively
- [API Reference](/api/core) - Complete API documentation
