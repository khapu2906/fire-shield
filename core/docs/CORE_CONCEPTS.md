# Core Concepts

Understanding the fundamental concepts behind the RBAC library.

## Table of Contents

- [Bit-Based Permissions](#bit-based-permissions)
- [Permission Masks](#permission-masks)
- [Role Hierarchy](#role-hierarchy)
- [Direct Permissions](#direct-permissions)
- [Wildcard Permissions](#wildcard-permissions)
- [Deny Permissions](#deny-permissions)

---

## Bit-Based Permissions

### What are Bit-Based Permissions?

Instead of storing permissions as strings in arrays, RBAC uses **bitwise operations** for ultra-fast permission checks.

### How It Works

Each permission is assigned a unique bit value (power of 2):

```typescript
// Traditional approach (slow)
permissions = ['user:read', 'user:write', 'post:read']
hasPermission = permissions.includes('user:read') // O(n) lookup

// Bit-based approach (fast)
user:read  = 1  (binary: 0001)
user:write = 2  (binary: 0010)
post:read  = 4  (binary: 0100)
post:write = 8  (binary: 1000)

permissionMask = 7 (binary: 0111) // Has user:read + user:write + post:read
hasPermission = (permissionMask & 1) !== 0 // O(1) lookup!
```

### Example

```typescript
const rbac = new RBAC({ useBitSystem: true });

// Register permissions (auto-assigns bits)
rbac.registerPermission('user:read');   // Gets bit 1
rbac.registerPermission('user:write');  // Gets bit 2
rbac.registerPermission('post:read');   // Gets bit 4

// Create role with permissions
rbac.createRole('editor', ['user:read', 'user:write']);

// User has permission mask of 3 (binary: 0011)
const user = { id: '1', roles: ['editor'] };

// Fast O(1) check
rbac.hasPermission(user, 'user:read');  // true (3 & 1 = 1)
rbac.hasPermission(user, 'post:read');  // false (3 & 4 = 0)
```

### Manual Bit Assignment

You can manually assign specific bit values for consistency:

```typescript
rbac.registerPermission('user:read', 1);
rbac.registerPermission('user:write', 2);
rbac.registerPermission('user:delete', 4);
rbac.registerPermission('admin:all', 128);
```

### Limitations

JavaScript uses 32-bit integers for bitwise operations, but uses **31 bits** for positive values (one bit for sign).

**Maximum permissions with bit system: 31**

If you need more than 31 permissions, you have two options:

1. **Use string-based system**:
```typescript
const rbac = new RBAC({ useBitSystem: false });
```

2. **Use multiple permission masks** (future feature)

---

## Permission Masks

### What is a Permission Mask?

A permission mask is a single number that represents multiple permissions using bitwise OR.

### Creating Masks

```typescript
const rbac = new RBAC();

rbac.registerPermission('user:read', 1);
rbac.registerPermission('user:write', 2);
rbac.registerPermission('user:delete', 4);

// Create mask for user:read + user:write
const mask = 1 | 2; // = 3 (binary: 0011)

// Or use the manager
const manager = new BitPermissionManager();
manager.registerPermission('user:read', 1);
manager.registerPermission('user:write', 2);
const mask2 = manager.createPermissionMask(['user:read', 'user:write']); // = 3
```

### Combining Masks

```typescript
const readMask = 1;   // user:read
const writeMask = 2;  // user:write
const deleteMask = 4; // user:delete

// Combine masks
const editorMask = readMask | writeMask; // = 3
const adminMask = readMask | writeMask | deleteMask; // = 7

// Or use combineMasks
const combined = manager.combineMasks(readMask, writeMask, deleteMask); // = 7
```

### Using Masks Directly

```typescript
const user = {
  id: 'user-1',
  roles: [],
  permissionMask: 7 // Has user:read + user:write + user:delete
};

rbac.hasPermission(user, 'user:read');   // true (7 & 1 = 1)
rbac.hasPermission(user, 'user:write');  // true (7 & 2 = 2)
rbac.hasPermission(user, 'user:delete'); // true (7 & 4 = 4)
```

---

## Role Hierarchy

### What is Role Hierarchy?

A level-based system where higher-level roles can perform actions on behalf of lower-level roles.

### Setting Role Levels

```typescript
const rbac = new RBAC();

// Create roles
rbac.createRole('user', ['post:read']);
rbac.createRole('moderator', ['post:read', 'post:edit']);
rbac.createRole('admin', ['post:read', 'post:edit', 'post:delete']);

// Set hierarchy levels (higher = more privileged)
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('moderator', 5);
hierarchy.setRoleLevel('admin', 10);
```

### Checking Hierarchy

```typescript
// Can admin act as moderator?
rbac.canActAsRole('admin', 'moderator'); // true (10 >= 5)

// Can moderator act as admin?
rbac.canActAsRole('moderator', 'admin'); // false (5 < 10)

// Check directly
hierarchy.canActAs('admin', 'user'); // true
hierarchy.hasHigherLevel('admin', 'user'); // true
```

### Use Cases

**1. Delegation**
```typescript
// Admin can perform actions on behalf of any lower role
if (rbac.canActAsRole('admin', 'moderator')) {
  // Admin can moderate content
}
```

**2. Resource Access**
```typescript
// Only users at same or higher level can access resource
function canAccessResource(userRole: string, resourceOwnerRole: string): boolean {
  return rbac.canActAsRole(userRole, resourceOwnerRole);
}

canAccessResource('admin', 'user'); // true - admin can access user resources
canAccessResource('user', 'admin'); // false - user cannot access admin resources
```

**3. Approval Workflows**
```typescript
// Only higher-level roles can approve
function canApprove(approverRole: string, requesterRole: string): boolean {
  const hierarchy = rbac.getRoleHierarchy();
  return hierarchy.hasHigherLevel(approverRole, requesterRole);
}
```

### Getting Roles by Level

```typescript
// Get all roles at specific level
hierarchy.getRolesAtLevel(5); // ['moderator']

// Get all roles
hierarchy.getAllRoles(); // ['user', 'moderator', 'admin']
```

---

## Direct Permissions

### What are Direct Permissions?

Permissions assigned directly to a user, independent of their roles.

### Use Cases

**1. Temporary Access**
```typescript
// User normally only has 'user' role
const user = {
  id: 'user-1',
  roles: ['user'],
  permissions: ['post:publish'] // Temporary direct permission
};

rbac.hasPermission(user, 'post:publish'); // true
```

**2. Special Exceptions**
```typescript
// Grant specific user additional permission
const specialUser = {
  id: 'user-special',
  roles: ['user'],
  permissions: ['admin:view-analytics'] // Exception
};
```

**3. Per-User Customization**
```typescript
// User has role + custom permissions
const customUser = {
  id: 'user-custom',
  roles: ['editor'],
  permissions: ['post:featured'] // Only this user can feature posts
};
```

### Combining with Roles

Direct permissions are **additive** - user has permissions from both roles and direct permissions:

```typescript
rbac.createRole('editor', ['post:read', 'post:write']);

const user = {
  id: 'user-1',
  roles: ['editor'],
  permissions: ['post:delete'] // Additional permission
};

// Has permission from role
rbac.hasPermission(user, 'post:read'); // true (from editor role)
rbac.hasPermission(user, 'post:write'); // true (from editor role)

// Has permission from direct permission
rbac.hasPermission(user, 'post:delete'); // true (from direct permissions)
```

### Direct Permission Masks

For performance, you can also use permission masks directly:

```typescript
const user = {
  id: 'user-1',
  roles: [],
  permissionMask: 7 // Directly assign mask instead of string permissions
};
```

---

## Wildcard Permissions

### What are Wildcard Permissions?

Pattern-based permissions using `*` to match multiple specific permissions.

### Basic Patterns

```typescript
// Grant all admin permissions
rbac.createRole('admin', ['admin:*']);

// Matches any permission starting with 'admin:'
rbac.hasPermission(admin, 'admin:users');    // true
rbac.hasPermission(admin, 'admin:settings'); // true
rbac.hasPermission(admin, 'admin:logs');     // true
```

### Pattern Types

**1. Suffix wildcard** - `prefix:*`
```typescript
'admin:*'    // Matches: admin:users, admin:settings, admin:delete, etc.
'post:*'     // Matches: post:read, post:write, post:delete, etc.
```

**2. Prefix wildcard** - `*:suffix`
```typescript
'*:read'     // Matches: user:read, post:read, comment:read, etc.
'*:delete'   // Matches: user:delete, post:delete, etc.
```

**3. Middle wildcard** - `prefix:*:suffix`
```typescript
'user:*:delete'  // Matches: user:own:delete, user:all:delete, etc.
```

**4. Multiple wildcards** - `*:*:suffix`
```typescript
'*:*:delete'  // Matches any delete permission with 3 parts
```

**5. Universal wildcard** - `*`
```typescript
'*'  // Matches ALL permissions (super admin)
```

### Examples

```typescript
const rbac = new RBAC({ enableWildcards: true });

// Super admin - has everything
rbac.createRole('super-admin', ['*']);

// Admin - has all admin permissions
rbac.createRole('admin', ['admin:*', 'user:read']);

// Reader - can read anything
rbac.createRole('reader', ['*:read']);

// Moderator - can manage content
rbac.createRole('moderator', ['post:*', 'comment:*']);

const admin = { id: '1', roles: ['admin'] };
rbac.hasPermission(admin, 'admin:users');     // true (admin:*)
rbac.hasPermission(admin, 'admin:settings');  // true (admin:*)
rbac.hasPermission(admin, 'user:read');       // true (exact match)
rbac.hasPermission(admin, 'user:write');      // false
```

### Disabling Wildcards

```typescript
// Disable wildcards for exact-only matching
const rbac = new RBAC({ enableWildcards: false });

rbac.createRole('admin', ['admin:*']);
const admin = { id: '1', roles: ['admin'] };

// Now treats 'admin:*' as literal string, not pattern
rbac.hasPermission(admin, 'admin:users'); // false
rbac.hasPermission(admin, 'admin:*');     // true (exact match only)
```

---

## Deny Permissions

### What are Deny Permissions?

Explicit permission denials that **override** any allows. Deny always wins.

### Deny Takes Precedence

```typescript
const rbac = new RBAC();
rbac.createRole('admin', ['user:*']); // Has all user permissions

const admin = { id: 'admin-1', roles: ['admin'] };

// Admin has all user permissions
rbac.hasPermission(admin, 'user:read');   // true
rbac.hasPermission(admin, 'user:delete'); // true

// Deny specific permission
rbac.denyPermission('admin-1', 'user:delete');

// Now denied
rbac.hasPermission(admin, 'user:read');   // true (still allowed)
rbac.hasPermission(admin, 'user:delete'); // false (DENIED)
```

### Deny with Wildcards

```typescript
// Deny all admin permissions
rbac.denyPermission('user-1', 'admin:*');

// All admin:* permissions denied
rbac.hasPermission(user, 'admin:users');    // false
rbac.hasPermission(user, 'admin:settings'); // false
```

### Use Cases

**1. Temporary Suspension**
```typescript
// Suspend user by denying all permissions
rbac.denyPermission('user-suspended', '*');

// All permission checks fail
rbac.hasPermission(suspendedUser, 'anything'); // false

// Un-suspend
rbac.allowPermission('user-suspended', '*');
```

**2. Exception Rules**
```typescript
// Admin has most permissions, except delete
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.denyPermission('admin-1', 'user:delete');
rbac.denyPermission('admin-1', 'post:delete');

// Can read/write but not delete
rbac.hasPermission(admin, 'user:read');   // true
rbac.hasPermission(admin, 'user:write');  // true
rbac.hasPermission(admin, 'user:delete'); // false (denied)
```

**3. Compliance Restrictions**
```typescript
// Temporarily restrict sensitive operations
function maintenanceMode(enable: boolean) {
  if (enable) {
    rbac.denyPermission('*', 'system:delete');
    rbac.denyPermission('*', 'system:modify');
  } else {
    rbac.allowPermission('*', 'system:delete');
    rbac.allowPermission('*', 'system:modify');
  }
}
```

### Managing Denies

```typescript
// Get all denied permissions for user
const denied = rbac.getDeniedPermissions('user-1');
console.log(denied); // ['admin:delete', 'user:*']

// Remove specific deny
rbac.allowPermission('user-1', 'admin:delete');

// Clear all denies
rbac.clearDeniedPermissions('user-1');
```

### Authorization Result

When using `authorize()`, denied permissions include reason:

```typescript
const result = rbac.authorize(user, 'admin:delete');
if (!result.allowed) {
  console.log(result.reason);
  // "Permission explicitly denied: admin:delete"
}
```

---

## Permission Check Order

RBAC checks permissions in this order:

1. **Deny list** - Check if permission explicitly denied (with wildcard matching)
   - If denied, return `false` immediately
2. **Direct permissions** - Check `user.permissions` array (with wildcard matching if enabled)
   - If found, return `true`
3. **Direct permission mask** - Check `user.permissionMask` (bit-based)
   - If found, return `true`
4. **Role permissions** - Check permissions from all user roles (with wildcard matching if enabled)
   - If found, return `true`
5. **Default** - Return `false` if no match found

```typescript
// Pseudo-code for permission check
hasPermission(user, permission) {
  // 1. Check deny list first (deny wins!)
  if (isDenied(user.id, permission)) return false;

  // 2. Check direct permissions
  if (user.permissions?.includes(permission)) return true;
  if (wildcards && matchesWildcard(user.permissions, permission)) return true;

  // 3. Check permission mask
  if (user.permissionMask & getPermissionBit(permission)) return true;

  // 4. Check role permissions
  for (role of user.roles) {
    if (roleHasPermission(role, permission)) return true;
  }

  // 5. Default deny
  return false;
}
```

---

## Best Practices

### When to Use Bit-Based vs String-Based

**Use Bit-Based (default)**:
- ✅ Need maximum performance
- ✅ Have ≤ 31 permissions
- ✅ Permissions are relatively stable
- ✅ Working with large user bases

**Use String-Based**:
- ✅ Need > 31 permissions
- ✅ Permissions change frequently
- ✅ Need human-readable debugging
- ✅ Prototyping/development

### When to Use Direct Permissions

**Use Direct Permissions**:
- ✅ Temporary access grants
- ✅ User-specific exceptions
- ✅ Beta features for specific users
- ✅ Quick permission testing

**Avoid Direct Permissions**:
- ❌ As primary permission mechanism (use roles instead)
- ❌ For permissions that many users need (create a role)
- ❌ For permanent access (assign proper role)

### When to Use Wildcards

**Use Wildcards**:
- ✅ Broad role-based access (admin:*)
- ✅ Simplifying permission sets
- ✅ Resource-based permissions (post:*)
- ✅ Multi-tenant systems (tenant:123:*)

**Avoid Wildcards**:
- ❌ When you need exact permission tracking
- ❌ For audit/compliance requiring explicit permissions
- ❌ When permissions need individual revocation

### When to Use Deny Permissions

**Use Deny Permissions**:
- ✅ Temporary suspensions
- ✅ Emergency access revocation
- ✅ Exception rules (admin except delete)
- ✅ Compliance restrictions

**Avoid Deny Permissions**:
- ❌ As primary permission mechanism
- ❌ For permanent restrictions (remove from role instead)
- ❌ Complex deny rules (hard to maintain)

---

See also:
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Advanced Features](./ADVANCED_FEATURES.md) - Wildcards, Audit Logging, Deny Permissions
- [Best Practices](./BEST_PRACTICES.md) - Recommended patterns
