# Wildcard Permissions Examples

Practical examples of using wildcard permissions in real-world scenarios.

## Resource-Based Wildcards

Example of resource-based permission structure:

```typescript
import { RBAC, RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .useBitSystem()
  .enableWildcards()

  // User management permissions
  .addPermission('user:read')
  .addPermission('user:create')
  .addPermission('user:update')
  .addPermission('user:delete')

  // Post management permissions
  .addPermission('post:read')
  .addPermission('post:create')
  .addPermission('post:update')
  .addPermission('post:delete')

  // Comment management permissions
  .addPermission('comment:read')
  .addPermission('comment:create')
  .addPermission('comment:update')
  .addPermission('comment:delete')

  // Roles with wildcards
  .addRole('admin', ['*']) // Everything
  .addRole('moderator', ['post:*', 'comment:*', 'user:read']) // All post/comment actions
  .addRole('editor', ['post:*']) // All post actions
  .addRole('author', ['post:read', 'post:create', 'post:update']) // Limited post actions
  .addRole('viewer', ['post:read', 'comment:read']) // Read-only

  .build();

// Usage
const admin = { id: '1', roles: ['admin'] };
const moderator = { id: '2', roles: ['moderator'] };
const editor = { id: '3', roles: ['editor'] };
const author = { id: '4', roles: ['author'] };
const viewer = { id: '5', roles: ['viewer'] };

// Admin has everything
console.log(rbac.hasPermission(admin, 'user:delete')); // true
console.log(rbac.hasPermission(admin, 'system:reboot')); // true (wildcard matches all)

// Moderator can manage posts and comments
console.log(rbac.hasPermission(moderator, 'post:delete')); // true
console.log(rbac.hasPermission(moderator, 'comment:delete')); // true
console.log(rbac.hasPermission(moderator, 'user:delete')); // false

// Editor can only manage posts
console.log(rbac.hasPermission(editor, 'post:delete')); // true
console.log(rbac.hasPermission(editor, 'comment:delete')); // false

// Author has limited post permissions
console.log(rbac.hasPermission(author, 'post:create')); // true
console.log(rbac.hasPermission(author, 'post:delete')); // false

// Viewer can only read
console.log(rbac.hasPermission(viewer, 'post:read')); // true
console.log(rbac.hasPermission(viewer, 'post:write')); // false
```

## Multi-Level Wildcards

Example of hierarchical permission structure:

```typescript
const rbac = new RBACBuilder()
  .enableWildcards()

  // System administration
  .addPermission('system:server:start')
  .addPermission('system:server:stop')
  .addPermission('system:server:restart')
  .addPermission('system:database:backup')
  .addPermission('system:database:restore')
  .addPermission('system:logs:read')
  .addPermission('system:logs:delete')

  // Application management
  .addPermission('app:users:create')
  .addPermission('app:users:delete')
  .addPermission('app:settings:read')
  .addPermission('app:settings:write')

  // Roles with multi-level wildcards
  .addRole('sysadmin', ['system:*']) // All system operations
  .addRole('dba', ['system:database:*']) // Only database operations
  .addRole('devops', ['system:server:*', 'system:logs:read']) // Server ops + log reading
  .addRole('app-admin', ['app:*']) // All app operations
  .addRole('user-manager', ['app:users:*']) // Only user management

  .build();

// Usage
const sysadmin = { id: '1', roles: ['sysadmin'] };
const dba = { id: '2', roles: ['dba'] };
const devops = { id: '3', roles: ['devops'] };

console.log(rbac.hasPermission(sysadmin, 'system:server:start')); // true
console.log(rbac.hasPermission(sysadmin, 'system:database:backup')); // true

console.log(rbac.hasPermission(dba, 'system:database:backup')); // true
console.log(rbac.hasPermission(dba, 'system:server:start')); // false

console.log(rbac.hasPermission(devops, 'system:server:restart')); // true
console.log(rbac.hasPermission(devops, 'system:database:backup')); // false
```

## Multi-Tenant Wildcards

Example of tenant-based permission system:

```typescript
interface Tenant {
  id: string;
  name: string;
}

interface TenantUser extends RBACUser {
  tenantId: string;
}

class MultiTenantRBAC {
  private rbac: RBAC;

  constructor() {
    this.rbac = new RBACBuilder()
      .enableWildcards()

      // Per-tenant permissions
      .addPermission('tenant:*:user:read')
      .addPermission('tenant:*:user:write')
      .addPermission('tenant:*:data:read')
      .addPermission('tenant:*:data:write')
      .addPermission('tenant:*:settings:read')
      .addPermission('tenant:*:settings:write')

      // Platform-wide permissions
      .addPermission('platform:tenant:create')
      .addPermission('platform:tenant:delete')
      .addPermission('platform:analytics:read')

      // Roles
      .addRole('platform-admin', ['platform:*', 'tenant:*:*:*']) // Full access
      .addRole('tenant-admin', []) // Permissions added dynamically per tenant
      .addRole('tenant-user', []) // Permissions added dynamically per tenant

      .build();
  }

  // Grant tenant-specific permissions
  grantTenantAccess(user: TenantUser, role: string): void {
    const tenantId = user.tenantId;

    if (role === 'tenant-admin') {
      // Admin can do everything in their tenant
      if (!user.permissions) user.permissions = [];
      user.permissions.push(`tenant:${tenantId}:*:*`);
    } else if (role === 'tenant-user') {
      // Regular user has limited access
      if (!user.permissions) user.permissions = [];
      user.permissions.push(`tenant:${tenantId}:data:read`);
      user.permissions.push(`tenant:${tenantId}:user:read`);
    }
  }

  canAccessTenantResource(
    user: TenantUser,
    tenantId: string,
    resource: string,
    action: string
  ): boolean {
    const permission = `tenant:${tenantId}:${resource}:${action}`;
    return this.rbac.hasPermission(user, permission);
  }
}

// Usage
const multiTenant = new MultiTenantRBAC();

// Platform admin
const platformAdmin: TenantUser = {
  id: 'admin-1',
  roles: ['platform-admin'],
  tenantId: 'tenant-1'
};

// Tenant admins
const tenant1Admin: TenantUser = {
  id: 'user-1',
  roles: ['tenant-admin'],
  tenantId: 'tenant-1',
  permissions: []
};

const tenant2Admin: TenantUser = {
  id: 'user-2',
  roles: ['tenant-admin'],
  tenantId: 'tenant-2',
  permissions: []
};

// Grant tenant-specific access
multiTenant.grantTenantAccess(tenant1Admin, 'tenant-admin');
multiTenant.grantTenantAccess(tenant2Admin, 'tenant-admin');

// Platform admin can access any tenant
console.log(multiTenant.canAccessTenantResource(
  platformAdmin, 'tenant-1', 'data', 'write'
)); // true
console.log(multiTenant.canAccessTenantResource(
  platformAdmin, 'tenant-2', 'data', 'write'
)); // true

// Tenant admin can only access their own tenant
console.log(multiTenant.canAccessTenantResource(
  tenant1Admin, 'tenant-1', 'data', 'write'
)); // true
console.log(multiTenant.canAccessTenantResource(
  tenant1Admin, 'tenant-2', 'data', 'write'
)); // false
```

## Dynamic Wildcard Permissions

Example of building permissions dynamically:

```typescript
class DynamicPermissionBuilder {
  private rbac: RBAC;

  constructor() {
    this.rbac = new RBACBuilder()
      .enableWildcards()
      .build();
  }

  // Generate permissions for a new resource type
  registerResource(resourceType: string, actions: string[]): void {
    for (const action of actions) {
      const permission = `${resourceType}:${action}`;
      this.rbac.addPermission(permission);
    }
  }

  // Create role with wildcard for resource
  createResourceRole(roleName: string, resourceType: string): void {
    this.rbac.createRole(roleName, [`${resourceType}:*`]);
  }

  // Create role with specific actions across resources
  createActionRole(roleName: string, action: string, resources: string[]): void {
    const permissions = resources.map(r => `${r}:${action}`);
    this.rbac.createRole(roleName, permissions);
  }

  // Create custom role with mixed wildcards
  createCustomRole(
    roleName: string,
    wildcardPatterns: string[],
    specificPermissions: string[]
  ): void {
    this.rbac.createRole(roleName, [...wildcardPatterns, ...specificPermissions]);
  }
}

// Usage
const builder = new DynamicPermissionBuilder();

// Register different resource types
builder.registerResource('article', ['read', 'create', 'update', 'delete', 'publish']);
builder.registerResource('video', ['read', 'upload', 'edit', 'delete', 'monetize']);
builder.registerResource('podcast', ['read', 'upload', 'edit', 'delete']);

// Create resource-specific roles
builder.createResourceRole('article-manager', 'article'); // Can do anything with articles
builder.createResourceRole('video-manager', 'video'); // Can do anything with videos

// Create action-specific roles
builder.createActionRole('content-reader', 'read', ['article', 'video', 'podcast']);
builder.createActionRole('content-creator', 'create', ['article', 'video', 'podcast']);

// Create custom mixed role
builder.createCustomRole(
  'publisher',
  ['article:*', 'video:*'], // Full access to articles and videos
  ['podcast:read', 'podcast:upload'] // Limited podcast access
);

// Test permissions
const articleManager = { id: '1', roles: ['article-manager'] };
const contentReader = { id: '2', roles: ['content-reader'] };
const publisher = { id: '3', roles: ['publisher'] };

console.log(builder.rbac.hasPermission(articleManager, 'article:publish')); // true
console.log(builder.rbac.hasPermission(articleManager, 'video:upload')); // false

console.log(builder.rbac.hasPermission(contentReader, 'article:read')); // true
console.log(builder.rbac.hasPermission(contentReader, 'article:delete')); // false

console.log(builder.rbac.hasPermission(publisher, 'article:publish')); // true
console.log(builder.rbac.hasPermission(publisher, 'video:monetize')); // true
console.log(builder.rbac.hasPermission(publisher, 'podcast:delete')); // false
```

## API Endpoint Protection

Example of protecting REST API endpoints with wildcards:

```typescript
import express from 'express';
import { createExpressRBAC } from '@fire-shield/express';

const rbac = new RBACBuilder()
  .enableWildcards()

  // API endpoint permissions
  .addPermission('api:v1:users:get')
  .addPermission('api:v1:users:post')
  .addPermission('api:v1:users:put')
  .addPermission('api:v1:users:delete')

  .addPermission('api:v1:posts:get')
  .addPermission('api:v1:posts:post')
  .addPermission('api:v1:posts:put')
  .addPermission('api:v1:posts:delete')

  // Roles
  .addRole('api-admin', ['api:*']) // All API access
  .addRole('api-user', ['api:v1:*:get']) // Read-only all endpoints
  .addRole('user-manager', ['api:v1:users:*']) // Full user management
  .addRole('content-editor', ['api:v1:posts:*']) // Full post management

  .build();

const app = express();
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user
});

// Protect endpoints with wildcards
app.get('/api/v1/users',
  rbacMiddleware.requirePermission('api:v1:users:get'),
  (req, res) => res.json({ users: [] })
);

app.post('/api/v1/users',
  rbacMiddleware.requirePermission('api:v1:users:post'),
  (req, res) => res.json({ created: true })
);

app.delete('/api/v1/users/:id',
  rbacMiddleware.requirePermission('api:v1:users:delete'),
  (req, res) => res.json({ deleted: true })
);

// Dynamic permission checking
app.use('/api/v1/:resource/:id?', (req, res, next) => {
  const { resource } = req.params;
  const method = req.method.toLowerCase();
  const permission = `api:v1:${resource}:${method}`;

  if (!rbac.hasPermission(req.user, permission)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});
```

## Feature Flag System

Example of using wildcards for feature flags:

```typescript
class FeatureFlagSystem {
  private rbac: RBAC;

  constructor() {
    this.rbac = new RBACBuilder()
      .enableWildcards()

      // Feature permissions
      .addPermission('feature:beta:*')
      .addPermission('feature:premium:*')
      .addPermission('feature:experimental:*')

      // Specific features
      .addPermission('feature:beta:new-editor')
      .addPermission('feature:beta:advanced-search')
      .addPermission('feature:premium:analytics')
      .addPermission('feature:premium:api-access')
      .addPermission('feature:experimental:ai-assistant')

      // Roles
      .addRole('beta-tester', ['feature:beta:*'])
      .addRole('premium-user', ['feature:premium:*'])
      .addRole('internal-user', ['feature:*']) // All features

      .build();
  }

  hasFeature(user: RBACUser, featureName: string): boolean {
    return this.rbac.hasPermission(user, `feature:${featureName}`);
  }

  enableFeatureForUser(user: RBACUser, featureName: string): void {
    if (!user.permissions) user.permissions = [];
    user.permissions.push(`feature:${featureName}`);
  }

  getAvailableFeatures(user: RBACUser): string[] {
    const allFeatures = [
      'beta:new-editor',
      'beta:advanced-search',
      'premium:analytics',
      'premium:api-access',
      'experimental:ai-assistant'
    ];

    return allFeatures.filter(feature => this.hasFeature(user, feature));
  }
}

// Usage
const featureFlags = new FeatureFlagSystem();

const betaUser = { id: '1', roles: ['beta-tester'] };
const premiumUser = { id: '2', roles: ['premium-user'] };
const internalUser = { id: '3', roles: ['internal-user'] };

console.log(featureFlags.hasFeature(betaUser, 'beta:new-editor')); // true
console.log(featureFlags.hasFeature(betaUser, 'premium:analytics')); // false

console.log(featureFlags.hasFeature(premiumUser, 'premium:analytics')); // true
console.log(featureFlags.hasFeature(premiumUser, 'beta:new-editor')); // false

console.log(featureFlags.hasFeature(internalUser, 'experimental:ai-assistant')); // true

console.log(featureFlags.getAvailableFeatures(betaUser));
// ['beta:new-editor', 'beta:advanced-search']
```

## Next Steps

- Learn about [Role Hierarchy](/examples/role-hierarchy)
- Explore [Audit Logging](/examples/audit-logging)
- Check [API Reference](/api/core)
