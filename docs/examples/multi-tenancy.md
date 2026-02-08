# Multi-Tenancy Examples

Practical examples of implementing multi-tenant RBAC systems.

## Basic Multi-Tenant Setup

Simple tenant isolation with RBAC:

```typescript
import { RBAC, RBACBuilder } from '@fire-shield/core';

interface TenantUser extends RBACUser {
  tenantId: string;
}

class MultiTenantRBAC {
  private rbac: RBAC;

  constructor() {
    this.rbac = new RBACBuilder()
      .enableWildcards()

      // Platform-level permissions
      .addPermission('platform:tenant:create')
      .addPermission('platform:tenant:delete')
      .addPermission('platform:tenant:list')
      .addPermission('platform:analytics:view')

      // Tenant-level permissions (use with tenant ID)
      .addPermission('tenant:user:create')
      .addPermission('tenant:user:delete')
      .addPermission('tenant:data:read')
      .addPermission('tenant:data:write')
      .addPermission('tenant:settings:manage')

      // Platform roles
      .addRole('platform-admin', ['platform:*'])

      // Tenant roles (permissions granted dynamically)
      .addRole('tenant-owner', [])
      .addRole('tenant-admin', [])
      .addRole('tenant-member', [])

      .build();
  }

  // Check if user can access tenant
  canAccessTenant(user: TenantUser, tenantId: string): boolean {
    // Platform admins can access any tenant
    if (user.roles.includes('platform-admin')) {
      return true;
    }

    // User must belong to the tenant
    return user.tenantId === tenantId;
  }

  // Check tenant-scoped permission
  hasPermissionInTenant(
    user: TenantUser,
    tenantId: string,
    permission: string
  ): boolean {
    // Check tenant access first
    if (!this.canAccessTenant(user, tenantId)) {
      return false;
    }

    // For platform admins, grant all tenant permissions
    if (user.roles.includes('platform-admin')) {
      return true;
    }

    // Check user's permissions
    return this.rbac.hasPermission(user, permission);
  }

  // Grant tenant-specific role permissions
  grantTenantRole(user: TenantUser, role: 'owner' | 'admin' | 'member'): void {
    if (!user.permissions) user.permissions = [];

    if (role === 'owner') {
      user.permissions.push('tenant:*');
    } else if (role === 'admin') {
      user.permissions.push('tenant:user:*');
      user.permissions.push('tenant:data:*');
      user.permissions.push('tenant:settings:*');
    } else if (role === 'member') {
      user.permissions.push('tenant:data:read');
      user.permissions.push('tenant:data:write');
    }
  }
}

// Usage
const multiTenant = new MultiTenantRBAC();

// Platform admin
const platformAdmin: TenantUser = {
  id: 'admin-1',
  roles: ['platform-admin'],
  tenantId: 'platform'
};

// Tenant users
const tenantOwner: TenantUser = {
  id: 'owner-1',
  roles: ['tenant-owner'],
  tenantId: 'tenant-abc',
  permissions: []
};

const tenantMember: TenantUser = {
  id: 'member-1',
  roles: ['tenant-member'],
  tenantId: 'tenant-abc',
  permissions: []
};

// Grant permissions based on roles
multiTenant.grantTenantRole(tenantOwner, 'owner');
multiTenant.grantTenantRole(tenantMember, 'member');

// Platform admin can access any tenant
console.log(multiTenant.canAccessTenant(platformAdmin, 'tenant-abc')); // true
console.log(multiTenant.canAccessTenant(platformAdmin, 'tenant-xyz')); // true

// Tenant users can only access their tenant
console.log(multiTenant.canAccessTenant(tenantOwner, 'tenant-abc')); // true
console.log(multiTenant.canAccessTenant(tenantOwner, 'tenant-xyz')); // false

// Permission checks
console.log(multiTenant.hasPermissionInTenant(
  tenantOwner, 'tenant-abc', 'tenant:user:delete'
)); // true

console.log(multiTenant.hasPermissionInTenant(
  tenantMember, 'tenant-abc', 'tenant:user:delete'
)); // false
```

## Hierarchical Multi-Tenancy

Example of parent-child tenant relationships:

```typescript
interface Tenant {
  id: string;
  name: string;
  parentId?: string;
  level: number; // 0 = root, 1 = organization, 2 = department, etc.
}

class HierarchicalMultiTenancy {
  private rbac: RBAC;
  private tenants = new Map&lt;string, Tenant&gt;();

  constructor() {
    this.rbac = new RBACBuilder()
      .enableWildcards()
      .build();
  }

  // Register tenant
  registerTenant(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
  }

  // Get all ancestor tenants
  getAncestorTenants(tenantId: string): Tenant[] {
    const ancestors: Tenant[] = [];
    let current = this.tenants.get(tenantId);

    while (current?.parentId) {
      current = this.tenants.get(current.parentId);
      if (current) ancestors.push(current);
    }

    return ancestors;
  }

  // Get all descendant tenants
  getDescendantTenants(tenantId: string): Tenant[] {
    const descendants: Tenant[] = [];

    for (const tenant of this.tenants.values()) {
      if (this.isDescendant(tenant.id, tenantId)) {
        descendants.push(tenant);
      }
    }

    return descendants;
  }

  private isDescendant(tenantId: string, ancestorId: string): boolean {
    const ancestors = this.getAncestorTenants(tenantId);
    return ancestors.some(t => t.id === ancestorId);
  }

  // Check if user can access tenant (including parent access)
  canAccessTenant(user: TenantUser, targetTenantId: string): boolean {
    // User's own tenant
    if (user.tenantId === targetTenantId) {
      return true;
    }

    // Check if user's tenant is an ancestor (parent access)
    const isAncestor = this.isDescendant(targetTenantId, user.tenantId);
    if (isAncestor && this.rbac.hasPermission(user, 'tenant:inherit:access')) {
      return true;
    }

    return false;
  }

  // Get all accessible tenants for user
  getAccessibleTenants(user: TenantUser): Tenant[] {
    const accessible: Tenant[] = [];

    for (const tenant of this.tenants.values()) {
      if (this.canAccessTenant(user, tenant.id)) {
        accessible.push(tenant);
      }
    }

    return accessible;
  }
}

// Usage
const hierarchy = new HierarchicalMultiTenancy();

// Register tenant hierarchy
// Root: ACME Corp
// - Sales Dept
//   - North Region
//   - South Region
// - Engineering Dept

hierarchy.registerTenant({
  id: 'acme',
  name: 'ACME Corp',
  level: 0
});

hierarchy.registerTenant({
  id: 'sales',
  name: 'Sales Department',
  parentId: 'acme',
  level: 1
});

hierarchy.registerTenant({
  id: 'north-sales',
  name: 'North Region Sales',
  parentId: 'sales',
  level: 2
});

hierarchy.registerTenant({
  id: 'engineering',
  name: 'Engineering Department',
  parentId: 'acme',
  level: 1
});

// User at Sales level with inherit permission
const salesManager: TenantUser = {
  id: 'mgr-1',
  roles: ['tenant-admin'],
  tenantId: 'sales',
  permissions: ['tenant:inherit:access']
};

// Can access own tenant
console.log(hierarchy.canAccessTenant(salesManager, 'sales')); // true

// Can access child tenant (North Region)
console.log(hierarchy.canAccessTenant(salesManager, 'north-sales')); // true

// Cannot access sibling tenant
console.log(hierarchy.canAccessTenant(salesManager, 'engineering')); // false

// Get all accessible tenants
const accessible = hierarchy.getAccessibleTenants(salesManager);
console.log(accessible.map(t => t.name));
// ['Sales Department', 'North Region Sales']
```

## Resource Isolation

Example of strict resource isolation between tenants:

```typescript
interface TenantResource {
  id: string;
  tenantId: string;
  type: string;
  data: any;
}

class TenantResourceManager {
  private rbac: RBAC;
  private resources = new Map&lt;string, TenantResource&gt;();

  constructor(rbac: RBAC) {
    this.rbac = rbac;
  }

  // Create resource (must belong to user's tenant)
  createResource(
    user: TenantUser,
    type: string,
    data: any
  ): TenantResource | null {
    if (!this.rbac.hasPermission(user, `${type}:create`)) {
      return null;
    }

    const resource: TenantResource = {
      id: `${type}-${Date.now()}`,
      tenantId: user.tenantId,
      type,
      data
    };

    this.resources.set(resource.id, resource);
    return resource;
  }

  // Read resource (with tenant check)
  readResource(
    user: TenantUser,
    resourceId: string
  ): TenantResource | null {
    const resource = this.resources.get(resourceId);

    if (!resource) {
      return null;
    }

    // Verify tenant isolation
    if (resource.tenantId !== user.tenantId) {
      console.error('Tenant isolation violation attempted');
      return null;
    }

    if (!this.rbac.hasPermission(user, `${resource.type}:read`)) {
      return null;
    }

    return resource;
  }

  // Update resource
  updateResource(
    user: TenantUser,
    resourceId: string,
    data: any
  ): boolean {
    const resource = this.resources.get(resourceId);

    if (!resource || resource.tenantId !== user.tenantId) {
      return false;
    }

    if (!this.rbac.hasPermission(user, `${resource.type}:update`)) {
      return false;
    }

    resource.data = data;
    return true;
  }

  // List resources (only from user's tenant)
  listResources(user: TenantUser, type?: string): TenantResource[] {
    const userResources: TenantResource[] = [];

    for (const resource of this.resources.values()) {
      // Tenant isolation
      if (resource.tenantId !== user.tenantId) {
        continue;
      }

      // Type filter
      if (type && resource.type !== type) {
        continue;
      }

      // Permission check
      if (this.rbac.hasPermission(user, `${resource.type}:read`)) {
        userResources.push(resource);
      }
    }

    return userResources;
  }

  // Delete resource
  deleteResource(user: TenantUser, resourceId: string): boolean {
    const resource = this.resources.get(resourceId);

    if (!resource || resource.tenantId !== user.tenantId) {
      return false;
    }

    if (!this.rbac.hasPermission(user, `${resource.type}:delete`)) {
      return false;
    }

    this.resources.delete(resourceId);
    return true;
  }
}

// Usage
const rbac = new RBAC();
rbac.createRole('member', ['document:read', 'document:create', 'document:update']);
rbac.createRole('admin', ['document:*']);

const resourceManager = new TenantResourceManager(rbac);

const tenant1User: TenantUser = {
  id: 'user-1',
  roles: ['member'],
  tenantId: 'tenant-1'
};

const tenant2User: TenantUser = {
  id: 'user-2',
  roles: ['member'],
  tenantId: 'tenant-2'
};

// Create resources
const doc1 = resourceManager.createResource(tenant1User, 'document', {
  title: 'Tenant 1 Document'
});

const doc2 = resourceManager.createResource(tenant2User, 'document', {
  title: 'Tenant 2 Document'
});

// Tenant isolation enforced
console.log(resourceManager.readResource(tenant1User, doc1!.id)); // ✅ Success
console.log(resourceManager.readResource(tenant1User, doc2!.id)); // ❌ null (different tenant)

// List only shows user's tenant resources
console.log(resourceManager.listResources(tenant1User).length); // 1
console.log(resourceManager.listResources(tenant2User).length); // 1
```

## Cross-Tenant Data Sharing

Example of controlled cross-tenant data access:

```typescript
interface SharedResource {
  resourceId: string;
  ownerTenantId: string;
  sharedWith: Array&lt;{
    tenantId: string;
    permissions: string[];
    expiresAt?: number;
  }&gt;;
}

class CrossTenantSharing {
  private rbac: RBAC;
  private sharedResources = new Map&lt;string, SharedResource&gt;();

  constructor(rbac: RBAC) {
    this.rbac = rbac;
  }

  // Share resource with another tenant
  shareResource(
    owner: TenantUser,
    resourceId: string,
    targetTenantId: string,
    permissions: string[],
    expiresInMs?: number
  ): boolean {
    // Owner must have sharing permission
    if (!this.rbac.hasPermission(owner, 'resource:share')) {
      return false;
    }

    const shared: SharedResource = {
      resourceId,
      ownerTenantId: owner.tenantId,
      sharedWith: [{
        tenantId: targetTenantId,
        permissions,
        expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined
      }]
    };

    this.sharedResources.set(resourceId, shared);
    return true;
  }

  // Check if user can access shared resource
  canAccessSharedResource(
    user: TenantUser,
    resourceId: string,
    permission: string
  ): boolean {
    const shared = this.sharedResources.get(resourceId);

    if (!shared) {
      return false;
    }

    // Owner always has access
    if (user.tenantId === shared.ownerTenantId) {
      return this.rbac.hasPermission(user, permission);
    }

    // Check if resource is shared with user's tenant
    const share = shared.sharedWith.find(s => s.tenantId === user.tenantId);

    if (!share) {
      return false;
    }

    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      return false;
    }

    // Check if permission is granted
    return share.permissions.includes(permission) ||
           share.permissions.includes('*');
  }

  // Revoke sharing
  revokeSharing(
    owner: TenantUser,
    resourceId: string,
    targetTenantId: string
  ): boolean {
    const shared = this.sharedResources.get(resourceId);

    if (!shared || shared.ownerTenantId !== owner.tenantId) {
      return false;
    }

    shared.sharedWith = shared.sharedWith.filter(
      s => s.tenantId !== targetTenantId
    );

    return true;
  }
}

// Usage
const sharing = new CrossTenantSharing(rbac);

const tenant1Owner: TenantUser = {
  id: 'owner-1',
  roles: ['tenant-owner'],
  tenantId: 'tenant-1',
  permissions: ['resource:share']
};

const tenant2User: TenantUser = {
  id: 'user-2',
  roles: ['tenant-member'],
  tenantId: 'tenant-2'
};

// Share resource with another tenant for 1 hour
sharing.shareResource(
  tenant1Owner,
  'doc-123',
  'tenant-2',
  ['read', 'comment'],
  3600000 // 1 hour
);

// Tenant 2 user can now access the shared resource
console.log(sharing.canAccessSharedResource(
  tenant2User,
  'doc-123',
  'read'
)); // true

console.log(sharing.canAccessSharedResource(
  tenant2User,
  'doc-123',
  'delete'
)); // false (not granted)

// Owner can revoke sharing
sharing.revokeSharing(tenant1Owner, 'doc-123', 'tenant-2');

console.log(sharing.canAccessSharedResource(
  tenant2User,
  'doc-123',
  'read'
)); // false (revoked)
```

## Tenant-Specific Feature Flags

Example of per-tenant feature enablement:

```typescript
interface TenantFeatures {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  enabledFeatures: string[];
  limits: {
    maxUsers: number;
    maxStorage: number;
    maxApiCalls: number;
  };
}

class TenantFeatureManager {
  private tenantFeatures = new Map&lt;string, TenantFeatures&gt;();

  // Feature matrix by plan
  private planFeatures = {
    free: ['basic:*', 'export:csv'],
    pro: ['basic:*', 'advanced:*', 'export:*', 'api:basic'],
    enterprise: ['*'] // All features
  };

  private planLimits = {
    free: { maxUsers: 5, maxStorage: 1024, maxApiCalls: 100 },
    pro: { maxUsers: 50, maxStorage: 10240, maxApiCalls: 10000 },
    enterprise: { maxUsers: -1, maxStorage: -1, maxApiCalls: -1 } // Unlimited
  };

  registerTenant(tenantId: string, plan: 'free' | 'pro' | 'enterprise'): void {
    this.tenantFeatures.set(tenantId, {
      tenantId,
      plan,
      enabledFeatures: this.planFeatures[plan],
      limits: this.planLimits[plan]
    });
  }

  hasFeature(tenantId: string, feature: string): boolean {
    const tenant = this.tenantFeatures.get(tenantId);

    if (!tenant) {
      return false;
    }

    return tenant.enabledFeatures.some(f =>
      f === feature || (f.endsWith('*') && feature.startsWith(f.slice(0, -1)))
    );
  }

  checkLimit(tenantId: string, limitType: keyof TenantFeatures['limits'], current: number): boolean {
    const tenant = this.tenantFeatures.get(tenantId);

    if (!tenant) {
      return false;
    }

    const limit = tenant.limits[limitType];

    // -1 means unlimited
    if (limit === -1) {
      return true;
    }

    return current < limit;
  }

  upgradeTenant(tenantId: string, newPlan: 'free' | 'pro' | 'enterprise'): void {
    const tenant = this.tenantFeatures.get(tenantId);

    if (tenant) {
      tenant.plan = newPlan;
      tenant.enabledFeatures = this.planFeatures[newPlan];
      tenant.limits = this.planLimits[newPlan];
    }
  }
}

// Usage
const featureManager = new TenantFeatureManager();

featureManager.registerTenant('tenant-free', 'free');
featureManager.registerTenant('tenant-pro', 'pro');
featureManager.registerTenant('tenant-ent', 'enterprise');

// Feature checks
console.log(featureManager.hasFeature('tenant-free', 'basic:reports')); // true
console.log(featureManager.hasFeature('tenant-free', 'advanced:analytics')); // false

console.log(featureManager.hasFeature('tenant-pro', 'advanced:analytics')); // true
console.log(featureManager.hasFeature('tenant-pro', 'api:basic')); // true

console.log(featureManager.hasFeature('tenant-ent', 'any:feature')); // true (has *)

// Limit checks
console.log(featureManager.checkLimit('tenant-free', 'maxUsers', 3)); // true (3 < 5)
console.log(featureManager.checkLimit('tenant-free', 'maxUsers', 10)); // false (10 >= 5)

console.log(featureManager.checkLimit('tenant-ent', 'maxUsers', 1000000)); // true (unlimited)
```

## Next Steps

- Learn about [Best Practices](/examples/best-practices)
- Explore [Performance Guide](/guide/performance)
- Check [API Reference](/api/core)
