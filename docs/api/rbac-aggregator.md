# RBACAggregator API Reference

**v3.0.0** - Multi-domain RBAC aggregation utility for managing multiple RBAC instances with unified interface.

## Overview

`RBACAggregator` is a utility class that allows you to aggregate multiple `RBAC` instances into a single unified interface. It implements the `IRBAC` interface, enabling polymorphic usage across framework adaptors.

### Use Cases

- **Multi-tenant SaaS**: Manage RBAC for multiple tenants/domains separately
- **Microservices**: Combine RBAC from different services
- **Hierarchical permissions**: Aggregate domain-specific RBAC instances
- **A/B testing**: Test different permission configurations
- **Feature flags**: Enable/disable feature-specific RBAC

## Constructor

```typescript
new RBACAggregator()
```

Creates a new empty RBACAggregator instance.

**Example:**
```typescript
import { RBACAggregator } from '@fire-shield/core';

const aggregator = new RBACAggregator();
```

## Instance Methods

### addInstance

Add an RBAC instance with a domain identifier.

```typescript
addInstance(domain: string, instance: RBAC): void
```

**Parameters:**
- `domain` - Unique domain identifier (e.g., 'tenant-1', 'service-a')
- `instance` - RBAC instance to add

**Throws:** `Error` if domain already exists or instance is invalid

**Example:**
```typescript
import { RBAC, RBACAggregator } from '@fire-shield/core';

const aggregator = new RBACAggregator();

// Add tenant-specific RBAC instances
const tenant1Rbac = new RBAC();
const tenant2Rbac = new RBAC();

aggregator.addInstance('tenant-1', tenant1Rbac);
aggregator.addInstance('tenant-2', tenant2Rbac);
```

### removeInstance

Remove an RBAC instance by domain identifier.

```typescript
removeInstance(domain: string): void
```

**Parameters:**
- `domain` - Domain identifier to remove

**Throws:** `Error` if domain doesn't exist

**Example:**
```typescript
aggregator.removeInstance('tenant-1');
```

### hasInstance

Check if an instance exists for a domain.

```typescript
hasInstance(domain: string): boolean
```

**Parameters:**
- `domain` - Domain identifier to check

**Returns:** `true` if instance exists, `false` otherwise

**Example:**
```typescript
if (aggregator.hasInstance('tenant-1')) {
  console.log('Tenant 1 is active');
}
```

### getInstance

Get an RBAC instance by domain identifier.

```typescript
getInstance(domain: string): RBAC | undefined
```

**Parameters:**
- `domain` - Domain identifier

**Returns:** RBAC instance or `undefined` if not found

**Example:**
```typescript
const rbac = aggregator.getInstance('tenant-1');
if (rbac) {
  rbac.createRole('admin', ['*']);
}
```

### getDomains

Get all domain identifiers.

```typescript
getDomains(): string[]
```

**Returns:** Array of domain identifiers

**Example:**
```typescript
const domains = aggregator.getDomains();
// ['tenant-1', 'tenant-2', 'tenant-3']
```

## IRBAC Interface Implementation

`RBACAggregator` implements all methods from the `IRBAC` interface, making it compatible with framework adaptors.

### registerPermission

Register a permission in all aggregated instances.

```typescript
registerPermission(permissionName: string): void
```

**Example:**
```typescript
aggregator.registerPermission('posts:read');
// Registers 'posts:read' in all RBAC instances
```

### createRole

Create a role in all aggregated instances.

```typescript
createRole(roleName: string, permissions: string[]): void
```

**Example:**
```typescript
aggregator.createRole('admin', ['posts:*', 'users:*']);
// Creates admin role with permissions in all instances
```

### hasPermission

Check if user has permission in any instance.

```typescript
hasPermission(user: RBACUser, permission: string): boolean
```

**Parameters:**
- `user` - User object with roles
- `permission` - Permission string to check

**Returns:** `true` if user has permission in any instance, `false` otherwise

**Example:**
```typescript
const user = { id: 'user-1', roles: ['admin'] };
const canDelete = aggregator.hasPermission(user, 'posts:delete');
// Returns true if any instance grants permission
```

### hasAllPermissions

Check if user has all permissions across all instances.

```typescript
hasAllPermissions(user: RBACUser, permissions: string[]): boolean
```

**Example:**
```typescript
const user = { id: 'user-1', roles: ['admin'] };
const hasFullAccess = aggregator.hasAllPermissions(user, [
  'posts:read',
  'posts:write',
  'posts:delete'
]);
```

### hasAnyPermission

Check if user has any of the specified permissions.

```typescript
hasAnyPermission(user: RBACUser, permissions: string[]): boolean
```

**Example:**
```typescript
const user = { id: 'user-1', roles: ['editor'] };
const canEdit = aggregator.hasAnyPermission(user, [
  'posts:write',
  'posts:delete'
]);
```

### authorize

Authorize user for permission with detailed result.

```typescript
authorize(user: RBACUser, permission: string): AuthorizationResult
```

**Returns:** Authorization result with details

**Example:**
```typescript
const result = aggregator.authorize(user, 'posts:delete');

if (!result.allowed) {
  console.log('Authorization failed:', result.reason);
  console.log('Checked domains:', result.domains);
}
```

### grantPermission

Grant permission to role in all instances.

```typescript
grantPermission(roleName: string, permission: string): void
```

**Example:**
```typescript
aggregator.grantPermission('editor', 'posts:publish');
// Grants permission to editor role in all instances
```

### revokePermission

Revoke permission from role in all instances.

```typescript
revokePermission(roleName: string, permission: string): void
```

**Example:**
```typescript
aggregator.revokePermission('editor', 'posts:publish');
```

### getPermissions

Get all permissions in all instances.

```typescript
getPermissions(): string[]
```

**Returns:** Array of unique permissions from all instances

**Example:**
```typescript
const permissions = aggregator.getPermissions();
// ['posts:read', 'posts:write', 'users:read', 'users:delete', ...]
```

### getRoles

Get all roles from all instances.

```typescript
getRoles(): string[]
```

**Returns:** Array of unique roles from all instances

**Example:**
```typescript
const roles = aggregator.getRoles();
// ['admin', 'editor', 'viewer', 'moderator', ...]
```

### getUserPermissions

Get all permissions for a user across all instances.

```typescript
getUserPermissions(user: RBACUser): string[]
```

**Returns:** Array of unique permissions for the user

**Example:**
```typescript
const user = { id: 'user-1', roles: ['admin', 'editor'] };
const permissions = aggregator.getUserPermissions(user);
```

### denyPermission

Deny permission for user in all instances.

```typescript
denyPermission(userId: string, permission: string): void
```

**Example:**
```typescript
aggregator.denyPermission('user-123', 'system:delete');
// Denies permission across all RBAC instances
```

### allowPermission

Remove denied permission for user in all instances.

```typescript
allowPermission(userId: string, permission: string): void
```

**Example:**
```typescript
aggregator.allowPermission('user-123', 'system:delete');
```

### getDeniedPermissions

Get denied permissions for user across all instances.

```typescript
getDeniedPermissions(userId: string): string[]
```

**Returns:** Array of unique denied permissions

**Example:**
```typescript
const denied = aggregator.getDeniedPermissions('user-123');
```

## Advanced Usage

### Multi-Tenant SaaS

```typescript
import { RBAC, RBACAggregator } from '@fire-shield/core';

// Create aggregator for multi-tenant SaaS
const tenantAggregator = new RBACAggregator();

// Onboard new tenant
function onboardTenant(tenantId: string, config: any) {
  const rbac = RBAC.fromJSONConfig(config);
  tenantAggregator.addInstance(tenantId, rbac);
}

// Check permission across tenant
function checkPermission(userId: string, permission: string) {
  const user = getUserFromDB(userId);
  return tenantAggregator.hasPermission(user, permission);
}

// Offboard tenant
function offboardTenant(tenantId: string) {
  tenantAggregator.removeInstance(tenantId);
}
```

### Domain-Specific Authorization

```typescript
import { RBAC, RBACAggregator, type AuthorizationContext } from '@fire-shield/core';

const aggregator = new RBACAggregator();

// Add domain-specific RBAC
const blogRbac = new RBAC();
const forumRbac = new RBAC();

aggregator.addInstance('blog', blogRbac);
aggregator.addInstance('forum', forumRbac);

// Authorize with domain context
const context: AuthorizationContext = {
  user: { id: 'user-1', roles: ['moderator'] },
  resource: 'post:123',
  action: 'delete',
  domain: 'blog'  // Check against blog RBAC
};

const result = aggregator.authorizeWithContext(context);
```

### Combining with Framework Adaptors

```typescript
import { RBAC, RBACAggregator } from '@fire-shield/core';
import { RBACProvider } from '@fire-shield/react';

// Create aggregator
const aggregator = new RBACAggregator();

// Add multiple RBAC instances
aggregator.addInstance('default', new RBAC());
aggregator.addInstance('admin-panel', new RBAC());

// Use with React adapter
<RBACProvider rbac={aggregator}>
  <App />
</RBACProvider>

// Now usePermission works across all instances
function MyComponent() {
  const canEdit = usePermission('posts:write');
  return canEdit ? <EditButton /> : null;
}
```

## Polymorphic Usage

Because `RBACAggregator` implements `IRBAC`, you can use it interchangeably with `RBAC`:

```typescript
import { RBAC, RBACAggregator, type IRBAC } from '@fire-shield/core';

function setupRBAC(instance: IRBAC) {
  instance.createRole('admin', ['*']);
  instance.registerPermission('posts:read');
}

// Works with RBAC
const rbac = new RBAC();
setupRBAC(rbac);

// Also works with RBACAggregator
const aggregator = new RBACAggregator();
aggregator.addInstance('default', new RBAC());
setupRBAC(aggregator); // ✅ Polymorphic!
```

## Performance Considerations

### Permission Checks

- **Single instance**: O(1) - Direct check
- **Multiple instances**: O(n) - Checks all instances where n = number of instances

### Best Practices

1. **Use domain context** when possible to avoid checking all instances
2. **Limit instance count** for critical paths (< 10 recommended)
3. **Cache frequently used results** for multi-instance checks
4. **Consider lazy loading** for rarely used domains

### Example with Optimization

```typescript
import { RBACAggregator } from '@fire-shield/core';

const aggregator = new RBACAggregator();

// Cache user permissions
const permissionCache = new Map<string, Set<string>>();

function getCachedPermissions(userId: string, domain: string): Set<string> {
  const cacheKey = `${userId}:${domain}`;

  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }

  const instance = aggregator.getInstance(domain);
  const user = getUser(userId);
  const permissions = new Set(instance.getUserPermissions(user));

  permissionCache.set(cacheKey, permissions);
  return permissions;
}
```

## Error Handling

```typescript
import { RBAC, RBACAggregator } from '@fire-shield/core';

const aggregator = new RBACAggregator();

// Add instance
try {
  aggregator.addInstance('tenant-1', new RBAC());
} catch (error) {
  console.error('Failed to add instance:', error);
}

// Remove instance
try {
  aggregator.removeInstance('tenant-1');
} catch (error) {
  console.error('Failed to remove instance:', error);
}

// Get non-existent instance
const rbac = aggregator.getInstance('non-existent');
if (!rbac) {
  console.log('Instance not found');
}
```

## See Also

- [IRBAC Interface](./types.md) - Interface that RBACAggregator implements
- [Core RBAC API](./core.md) - Standard RBAC API
- [Multi-Tenant Examples](/examples/multi-tenancy) - Real-world examples
- [Framework Integration](/frameworks/react) - Using with frameworks
