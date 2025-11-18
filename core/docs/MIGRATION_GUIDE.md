# Migration Guide

Guide for upgrading to the latest version of RBAC library.

## Table of Contents

- [Upgrading to v2.0 (Advanced Features)](#upgrading-to-v20-advanced-features)
- [Breaking Changes](#breaking-changes)
- [New Features](#new-features)
- [Deprecations](#deprecations)
- [Migration Steps](#migration-steps)

---

## Upgrading to v2.0 (Advanced Features)

Version 2.0 introduces three major features:
- **Wildcard Permissions** - Pattern matching for permissions
- **Audit Logging** - Comprehensive logging system
- **Deny Permissions** - Explicit permission denials

**Good news: Zero breaking changes!** All existing code will continue to work.

---

## Breaking Changes

### None!

Version 2.0 maintains 100% backward compatibility. All existing code will work without modifications.

```typescript
// v1.x code
const rbac = new RBAC();
rbac.createRole('admin', ['user:read', 'user:write']);

// Still works in v2.0! ✓
```

---

## New Features

### 1. Wildcard Permissions (Enabled by Default)

**What's New:**
Pattern matching in permissions using `*` wildcard.

**Migration:**

```typescript
// v1.x - Had to list all permissions explicitly
rbac.createRole('admin', [
  'user:read',
  'user:write',
  'user:delete',
  'post:read',
  'post:write',
  'post:delete',
  // ... many more
]);

// v2.0 - Use wildcards (enabled by default)
rbac.createRole('admin', ['user:*', 'post:*']);
```

**If you don't want wildcards:**
```typescript
const rbac = new RBAC({ enableWildcards: false });
```

### 2. Audit Logging

**What's New:**
Automatic logging of all permission checks.

**Migration:**

```typescript
// v1.x - No audit logging
const rbac = new RBAC();

// v2.0 - Add audit logger (optional)
import { ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});

// All permission checks are now automatically logged
```

**Production setup:**
```typescript
import { BufferedAuditLogger } from '@fire-shield/core';

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

### 3. Deny Permissions

**What's New:**
Explicitly deny permissions that override allows.

**Migration:**

```typescript
// v1.x - Had to remove role or use custom logic
const admin = { id: 'admin-1', roles: ['admin'] };
// No way to deny specific permission

// v2.0 - Use deny permissions
rbac.denyPermission('admin-1', 'user:delete');

// Permission is now denied
rbac.hasPermission(admin, 'user:delete'); // false
```

---

## Deprecations

### None

No features or APIs have been deprecated in v2.0.

---

## Migration Steps

### Step 1: Update Package

```bash
npm install @fire-shield/core@latest
# or
yarn upgrade @fire-shield/core
# or
pnpm update @fire-shield/core
```

### Step 2: Review Wildcard Behavior

Wildcards are **enabled by default**. Review your permission checks to ensure wildcard matching doesn't create unintended access.

**Example of potential issue:**

```typescript
// If you had a permission literally named 'admin:*'
rbac.createRole('test', ['admin:*']);

// v1.x: Only matches exact string 'admin:*'
// v2.0: Matches ALL permissions starting with 'admin:'
```

**Fix if needed:**

```typescript
// Option 1: Disable wildcards globally
const rbac = new RBAC({ enableWildcards: false });

// Option 2: Rename permissions that contain '*'
rbac.registerPermission('admin:all'); // Instead of 'admin:*'
```

### Step 3: Add Audit Logging (Optional)

```typescript
// Before
const rbac = new RBAC();

// After
import { BufferedAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      await yourDatabase.auditLogs.insertMany(events);
    }
  )
});
```

### Step 4: Use Deny Permissions (Optional)

Replace custom denial logic with built-in deny permissions:

```typescript
// Before - Custom logic
function hasPermission(user, permission) {
  if (suspendedUsers.includes(user.id)) return false;
  return rbac.hasPermission(user, permission);
}

// After - Use deny permissions
function suspendUser(userId) {
  rbac.denyPermission(userId, '*');
}

function unsuspendUser(userId) {
  rbac.clearDeniedPermissions(userId);
}

// Now use rbac.hasPermission directly
rbac.hasPermission(user, permission);
```

### Step 5: Test Your Application

Run your test suite to ensure everything works:

```bash
npm test
```

**All existing tests should pass without modification.**

---

## Migration Examples

### Example 1: Basic Migration

**Before (v1.x):**
```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC({ useBitSystem: true });

rbac.registerPermission('user:read');
rbac.registerPermission('user:write');
rbac.registerPermission('user:delete');

rbac.createRole('admin', ['user:read', 'user:write', 'user:delete']);

const admin = { id: '1', roles: ['admin'] };
console.log(rbac.hasPermission(admin, 'user:read')); // true
```

**After (v2.0) - No changes required:**
```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC({ useBitSystem: true });

rbac.registerPermission('user:read');
rbac.registerPermission('user:write');
rbac.registerPermission('user:delete');

rbac.createRole('admin', ['user:read', 'user:write', 'user:delete']);

const admin = { id: '1', roles: ['admin'] };
console.log(rbac.hasPermission(admin, 'user:read')); // true ✓ Still works!
```

**After (v2.0) - With new features:**
```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  useBitSystem: true,
  enableWildcards: true,        // NEW
  auditLogger: new ConsoleAuditLogger()  // NEW
});

rbac.registerPermission('user:read');
rbac.registerPermission('user:write');
rbac.registerPermission('user:delete');

// Use wildcard instead of listing all permissions
rbac.createRole('admin', ['user:*']);  // NEW

const admin = { id: '1', roles: ['admin'] };

// Works the same, but now logged
console.log(rbac.hasPermission(admin, 'user:read')); // true ✓

// Deny specific permission if needed
rbac.denyPermission('1', 'user:delete');  // NEW
console.log(rbac.hasPermission(admin, 'user:delete')); // false
```

### Example 2: Migrating Custom Audit Logic

**Before (v1.x) - Custom audit:**
```typescript
const rbac = new RBAC();

function checkPermission(user, permission) {
  const result = rbac.hasPermission(user, permission);

  // Custom audit logging
  auditLog.insert({
    userId: user.id,
    permission,
    allowed: result,
    timestamp: Date.now()
  });

  return result;
}

// Used throughout codebase
if (checkPermission(user, 'post:write')) {
  // ...
}
```

**After (v2.0) - Built-in audit:**
```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      await auditLog.insertMany(events);
    }
  )
});

// Replace custom checkPermission with built-in
// Audit logging happens automatically
if (rbac.hasPermission(user, 'post:write')) {
  // ...
}
```

### Example 3: Migrating Suspension Logic

**Before (v1.x) - Custom suspension:**
```typescript
const suspendedUsers = new Set();

function suspendUser(userId) {
  suspendedUsers.add(userId);
}

function unsuspendUser(userId) {
  suspendedUsers.delete(userId);
}

function hasPermission(user, permission) {
  if (suspendedUsers.has(user.id)) return false;
  return rbac.hasPermission(user, permission);
}
```

**After (v2.0) - Built-in deny:**
```typescript
function suspendUser(userId) {
  rbac.denyPermission(userId, '*');
}

function unsuspendUser(userId) {
  rbac.clearDeniedPermissions(userId);
}

// Use rbac.hasPermission directly - deny list is checked automatically
const canAccess = rbac.hasPermission(user, permission);
```

---

## Rollback Plan

If you need to rollback to v1.x:

### Step 1: Revert Package

```bash
npm install @fire-shield/core@1.x
```

### Step 2: Remove New Features

```typescript
// Remove these if added:
import { ConsoleAuditLogger, BufferedAuditLogger } from '@fire-shield/core';  // Remove
const rbac = new RBAC({
  auditLogger: ...,        // Remove
  enableWildcards: ...     // Remove
});

rbac.denyPermission(...);  // Remove
```

### Step 3: Restore Wildcard Literals

If you were using wildcards, expand them:

```typescript
// v2.0 with wildcards
rbac.createRole('admin', ['user:*']);

// Revert to v1.x
rbac.createRole('admin', ['user:read', 'user:write', 'user:delete']);
```

---

## Common Migration Issues

### Issue 1: Wildcard Matching Unintended Permissions

**Problem:**
```typescript
rbac.createRole('test', ['admin:*']);

// Unintentionally matches more than expected
rbac.hasPermission(user, 'admin:secret:key'); // true (unexpected)
```

**Solution:**
```typescript
// Option 1: Disable wildcards
const rbac = new RBAC({ enableWildcards: false });

// Option 2: Be more specific
rbac.createRole('test', ['admin:users:*', 'admin:settings:*']);

// Option 3: Use exact permissions
rbac.createRole('test', ['admin:users', 'admin:settings']);
```

### Issue 2: Audit Logging Performance

**Problem:**
Synchronous audit logger slowing down permission checks.

**Solution:**
```typescript
// Bad - synchronous database writes
const rbac = new RBAC({
  auditLogger: {
    log: (event) => {
      database.auditLog.insert(event);  // Blocks!
    }
  }
});

// Good - buffered async writes
import { BufferedAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(
    async (events) => {
      await database.auditLog.insertMany(events);
    },
    { maxBufferSize: 100, flushIntervalMs: 5000 }
  )
});
```

### Issue 3: Deny Permissions Not Persisting

**Problem:**
Deny permissions lost on restart.

**Solution:**
```typescript
// Serialize deny list
const state = rbac.serialize();
await database.rbacState.save(state);

// Restore on restart
const state = await database.rbacState.load();
rbac.deserialize(state);
```

---

## Testing After Migration

### Run Full Test Suite

```bash
npm test
```

### Test Wildcard Behavior

```typescript
describe('Wildcard migration tests', () => {
  it('should match wildcard patterns', () => {
    rbac.createRole('admin', ['user:*']);
    const admin = { id: '1', roles: ['admin'] };

    expect(rbac.hasPermission(admin, 'user:read')).toBe(true);
    expect(rbac.hasPermission(admin, 'user:write')).toBe(true);
    expect(rbac.hasPermission(admin, 'user:delete')).toBe(true);
  });

  it('should not match outside wildcard scope', () => {
    rbac.createRole('admin', ['user:*']);
    const admin = { id: '1', roles: ['admin'] };

    expect(rbac.hasPermission(admin, 'post:read')).toBe(false);
  });
});
```

### Test Audit Logging

```typescript
describe('Audit logging tests', () => {
  it('should log permission checks', () => {
    const events = [];
    const logger = { log: (e) => events.push(e) };

    const rbac = new RBAC({ auditLogger: logger });
    rbac.createRole('admin', ['user:read']);
    const admin = { id: '1', roles: ['admin'] };

    rbac.hasPermission(admin, 'user:read');

    expect(events).toHaveLength(1);
    expect(events[0].permission).toBe('user:read');
    expect(events[0].allowed).toBe(true);
  });
});
```

### Test Deny Permissions

```typescript
describe('Deny permission tests', () => {
  it('should deny permission', () => {
    rbac.createRole('admin', ['user:*']);
    const admin = { id: '1', roles: ['admin'] };

    rbac.denyPermission('1', 'user:delete');

    expect(rbac.hasPermission(admin, 'user:read')).toBe(true);
    expect(rbac.hasPermission(admin, 'user:delete')).toBe(false);
  });
});
```

---

## Support

If you encounter any issues during migration:

1. Check the [API Reference](./API_REFERENCE.md) for detailed documentation
2. Review [Examples](./EXAMPLES.md) for usage patterns
3. Open an issue on GitHub with your migration question

---

See also:
- [Getting Started](./GETTING_STARTED.md) - Quick start guide
- [Advanced Features](./ADVANCED_FEATURES.md) - Detailed guide for new features
- [API Reference](./API_REFERENCE.md) - Complete API documentation
