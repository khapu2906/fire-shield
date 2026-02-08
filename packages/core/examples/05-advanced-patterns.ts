/**
 * Advanced Patterns Example
 *
 * This example demonstrates advanced RBAC patterns:
 * - Permission masks for high-performance checks
 * - Multi-tenant authorization
 * - Dynamic permission computation
 * - Permission inheritance and composition
 * - Custom authorization logic
 */

import { RBAC, BitPermissionManager } from '../lib/index';

console.log('=== Advanced RBAC Patterns ===\n');

// === PATTERN 1: High-Performance Permission Masks ===
console.log('PATTERN 1: Permission Masks for High Performance\n');

const rbac = new RBAC({ useBitSystem: true });

// Register permissions
rbac.registerPermission('file:read', 1);
rbac.registerPermission('file:write', 2);
rbac.registerPermission('file:execute', 4);
rbac.registerPermission('file:delete', 8);

const bitManager = rbac.getBitPermissionManager()!;

// Create pre-computed permission masks
const readOnlyMask = bitManager.createPermissionMask(['file:read']);
const readWriteMask = bitManager.createPermissionMask(['file:read', 'file:write']);
const fullAccessMask = bitManager.createPermissionMask(['file:read', 'file:write', 'file:execute', 'file:delete']);

console.log('Permission masks created:');
console.log(`  Read-only: ${readOnlyMask} (binary: ${readOnlyMask.toString(2).padStart(4, '0')})`);
console.log(`  Read-Write: ${readWriteMask} (binary: ${readWriteMask.toString(2).padStart(4, '0')})`);
console.log(`  Full access: ${fullAccessMask} (binary: ${fullAccessMask.toString(2).padStart(4, '0')})`);

// Use masks for ultra-fast permission checks
const users = [
  { id: '1', name: 'Viewer', roles: [], permissionMask: readOnlyMask },
  { id: '2', name: 'Editor', roles: [], permissionMask: readWriteMask },
  { id: '3', name: 'Admin', roles: [], permissionMask: fullAccessMask }
];

console.log('\nPermission checks using masks:');
const startTime = performance.now();
users.forEach(user => {
  const canRead = rbac.hasPermission(user, 'file:read');
  const canWrite = rbac.hasPermission(user, 'file:write');
  const canDelete = rbac.hasPermission(user, 'file:delete');
  console.log(`  ${user.name}: read=${canRead}, write=${canWrite}, delete=${canDelete}`);
});
const endTime = performance.now();
console.log(`  Performance: ${((endTime - startTime) * 1000).toFixed(2)}µs\n`);

// === PATTERN 2: Multi-Tenant Authorization ===
console.log('\nPATTERN 2: Multi-Tenant Authorization\n');

interface TenantUser {
  id: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
}

class MultiTenantRBAC {
  private rbacInstances: Map<string, RBAC> = new Map();

  getOrCreateRBAC(tenantId: string): RBAC {
    if (!this.rbacInstances.has(tenantId)) {
      const rbac = new RBAC({ useBitSystem: true });
      this.rbacInstances.set(tenantId, rbac);
    }
    return this.rbacInstances.get(tenantId)!;
  }

  hasPermission(user: TenantUser, permission: string): boolean {
    const rbac = this.getOrCreateRBAC(user.tenantId);
    return rbac.hasPermission(user, permission);
  }

  setupTenant(tenantId: string, config: { permissions: string[], roles: Array<{ name: string, permissions: string[] }> }) {
    const rbac = this.getOrCreateRBAC(tenantId);

    // Register permissions
    config.permissions.forEach(perm => rbac.registerPermission(perm));

    // Create roles
    config.roles.forEach(role => rbac.createRole(role.name, role.permissions));
  }
}

const multiTenantRBAC = new MultiTenantRBAC();

// Setup Tenant A (Startup)
multiTenantRBAC.setupTenant('tenant-a', {
  permissions: ['project:read', 'project:write'],
  roles: [
    { name: 'member', permissions: ['project:read'] },
    { name: 'owner', permissions: ['project:read', 'project:write'] }
  ]
});

// Setup Tenant B (Enterprise)
multiTenantRBAC.setupTenant('tenant-b', {
  permissions: ['project:read', 'project:write', 'project:admin'],
  roles: [
    { name: 'member', permissions: ['project:read'] },
    { name: 'manager', permissions: ['project:read', 'project:write'] },
    { name: 'owner', permissions: ['project:read', 'project:write', 'project:admin'] }
  ]
});

const tenantAUser: TenantUser = { id: 'user-1', tenantId: 'tenant-a', roles: ['member'] };
const tenantBUser: TenantUser = { id: 'user-2', tenantId: 'tenant-b', roles: ['manager'] };

console.log('Multi-tenant permission checks:');
console.log(`  Tenant A user (member) can write: ${multiTenantRBAC.hasPermission(tenantAUser, 'project:write')}`);
console.log(`  Tenant B user (manager) can write: ${multiTenantRBAC.hasPermission(tenantBUser, 'project:write')}`);
console.log('  (Same permission name, different tenant configurations)\n');

// === PATTERN 3: Dynamic Permission Computation ===
console.log('\nPATTERN 3: Dynamic Permission Computation\n');

class DynamicRBAC {
  constructor(private rbac: RBAC) {}

  /**
   * Check resource ownership and grant dynamic permissions
   */
  hasPermissionWithOwnership(
    user: { id: string, roles: string[] },
    permission: string,
    resource?: { ownerId: string }
  ): boolean {
    // Check standard RBAC permission
    if (this.rbac.hasPermission(user, permission)) {
      return true;
    }

    // If user owns the resource, grant edit permission
    if (resource && resource.ownerId === user.id && permission.includes(':edit')) {
      return true;
    }

    return false;
  }

  /**
   * Compute permissions based on time
   */
  hasPermissionWithTime(
    user: { id: string, roles: string[] },
    permission: string,
    timeConstraint?: { validFrom?: Date, validUntil?: Date }
  ): boolean {
    // Check standard permission
    if (!this.rbac.hasPermission(user, permission)) {
      return false;
    }

    // Check time constraints
    if (timeConstraint) {
      const now = new Date();
      if (timeConstraint.validFrom && now < timeConstraint.validFrom) {
        return false;
      }
      if (timeConstraint.validUntil && now > timeConstraint.validUntil) {
        return false;
      }
    }

    return true;
  }
}

const dynamicRBAC = new DynamicRBAC(rbac);

// Test ownership-based permissions
const author = { id: 'author-1', roles: ['user'] };
const otherUser = { id: 'user-2', roles: ['user'] };
const document = { ownerId: 'author-1', title: 'My Document' };

console.log('Ownership-based permissions:');
console.log(`  Author can edit own document: ${dynamicRBAC.hasPermissionWithOwnership(author, 'document:edit', document)}`);
console.log(`  Other user can edit document: ${dynamicRBAC.hasPermissionWithOwnership(otherUser, 'document:edit', document)}`);

// Test time-based permissions
rbac.createRole('beta-tester', ['feature:beta']);
const betaUser = { id: 'beta-1', roles: ['beta-tester'] };

const betaTimeConstraint = {
  validFrom: new Date('2025-01-01'),
  validUntil: new Date('2025-12-31')
};

console.log('\nTime-based permissions:');
console.log(`  Beta user has access (within time): ${dynamicRBAC.hasPermissionWithTime(betaUser, 'feature:beta', betaTimeConstraint)}`);

const expiredConstraint = {
  validFrom: new Date('2023-01-01'),
  validUntil: new Date('2023-12-31')
};
console.log(`  Beta user has access (expired): ${dynamicRBAC.hasPermissionWithTime(betaUser, 'feature:beta', expiredConstraint)}\n`);

// === PATTERN 4: Permission Inheritance and Composition ===
console.log('\nPATTERN 4: Permission Inheritance and Composition\n');

// Create a hierarchical permission system
const appRBAC = new RBAC({ useBitSystem: true });

// Base permissions
appRBAC.registerPermission('content:read', 1);
appRBAC.registerPermission('content:create', 2);
appRBAC.registerPermission('content:edit', 4);
appRBAC.registerPermission('content:delete', 8);
appRBAC.registerPermission('content:publish', 16);

// Create composable roles
appRBAC.createRole('reader', ['content:read']);
appRBAC.createRole('writer', ['content:read', 'content:create', 'content:edit']);
appRBAC.createRole('publisher', ['content:read', 'content:create', 'content:edit', 'content:publish']);
appRBAC.createRole('admin', ['content:read', 'content:create', 'content:edit', 'content:delete', 'content:publish']);

// User with multiple inherited roles
const contentManager = {
  id: 'manager-1',
  roles: ['writer', 'publisher'] // Inherits permissions from both
};

console.log('Permission inheritance:');
console.log(`  Content manager roles: [${contentManager.roles.join(', ')}]`);
console.log(`  Can read: ${appRBAC.hasPermission(contentManager, 'content:read')}`);
console.log(`  Can create: ${appRBAC.hasPermission(contentManager, 'content:create')}`);
console.log(`  Can publish: ${appRBAC.hasPermission(contentManager, 'content:publish')}`);
console.log(`  Can delete: ${appRBAC.hasPermission(contentManager, 'content:delete')}`);

// Combine permission masks
const appBitManager = appRBAC.getBitPermissionManager()!;
const writerMask = appBitManager.getRoleMask('writer')!;
const publisherMask = appBitManager.getRoleMask('publisher')!;
const combinedMask = appBitManager.combineMasks(writerMask, publisherMask);

console.log('\nMask composition:');
console.log(`  Writer mask: ${writerMask} (${writerMask.toString(2).padStart(8, '0')})`);
console.log(`  Publisher mask: ${publisherMask} (${publisherMask.toString(2).padStart(8, '0')})`);
console.log(`  Combined mask: ${combinedMask} (${combinedMask.toString(2).padStart(8, '0')})\n`);

// === PATTERN 5: Custom Authorization Logic ===
console.log('\nPATTERN 5: Custom Authorization Logic\n');

interface AuthContext {
  user: { id: string, roles: string[] };
  resource: { id: string, type: string, metadata?: any };
  action: string;
  environment?: {
    ip?: string;
    time?: Date;
    location?: string;
  };
}

class CustomAuthorizationEngine {
  constructor(private rbac: RBAC) {}

  authorize(context: AuthContext): { allowed: boolean, reason?: string } {
    // 1. Check basic RBAC permission
    const permission = `${context.resource.type}:${context.action}`;
    if (!this.rbac.hasPermission(context.user, permission)) {
      return { allowed: false, reason: `Missing permission: ${permission}` };
    }

    // 2. Check IP whitelist (if metadata present)
    if (context.resource.metadata?.ipWhitelist && context.environment?.ip) {
      const whitelist: string[] = context.resource.metadata.ipWhitelist;
      if (!whitelist.includes(context.environment.ip)) {
        return { allowed: false, reason: 'IP not whitelisted' };
      }
    }

    // 3. Check time-based access
    if (context.resource.metadata?.accessHours && context.environment?.time) {
      const hours = context.environment.time.getHours();
      const allowedHours: { start: number, end: number } = context.resource.metadata.accessHours;
      if (hours < allowedHours.start || hours >= allowedHours.end) {
        return { allowed: false, reason: 'Outside allowed access hours' };
      }
    }

    // 4. Check resource state
    if (context.resource.metadata?.locked && context.action !== 'read') {
      return { allowed: false, reason: 'Resource is locked' };
    }

    return { allowed: true };
  }
}

const customEngine = new CustomAuthorizationEngine(appRBAC);

// Test custom authorization
const adminUser = { id: 'admin-1', roles: ['admin'] };

// Scenario 1: Normal access
const normalContext: AuthContext = {
  user: adminUser,
  resource: { id: 'doc-1', type: 'content' },
  action: 'edit'
};
console.log('Normal access:', customEngine.authorize(normalContext).allowed);

// Scenario 2: IP restricted
const ipRestrictedContext: AuthContext = {
  user: adminUser,
  resource: {
    id: 'secure-doc',
    type: 'content',
    metadata: { ipWhitelist: ['192.168.1.1'] }
  },
  action: 'edit',
  environment: { ip: '10.0.0.1' }
};
const ipResult = customEngine.authorize(ipRestrictedContext);
console.log(`IP restricted access: ${ipResult.allowed} (${ipResult.reason})`);

// Scenario 3: Time restricted
const timeRestrictedContext: AuthContext = {
  user: adminUser,
  resource: {
    id: 'time-doc',
    type: 'content',
    metadata: { accessHours: { start: 9, end: 17 } }
  },
  action: 'edit',
  environment: { time: new Date('2025-01-01T22:00:00') } // 10 PM
};
const timeResult = customEngine.authorize(timeRestrictedContext);
console.log(`Time restricted access: ${timeResult.allowed} (${timeResult.reason})`);

// Scenario 4: Locked resource
const lockedContext: AuthContext = {
  user: adminUser,
  resource: {
    id: 'locked-doc',
    type: 'content',
    metadata: { locked: true }
  },
  action: 'edit'
};
const lockedResult = customEngine.authorize(lockedContext);
console.log(`Locked resource edit: ${lockedResult.allowed} (${lockedResult.reason})`);

// Scenario 5: Locked resource but read-only
const readLockedContext: AuthContext = {
  user: adminUser,
  resource: {
    id: 'locked-doc',
    type: 'content',
    metadata: { locked: true }
  },
  action: 'read'
};
console.log(`Locked resource read: ${customEngine.authorize(readLockedContext).allowed}\n`);

// === PATTERN 6: Performance Benchmarking ===
console.log('\nPATTERN 6: Performance Benchmarking\n');

const benchmarkUser = { id: 'bench-1', roles: ['admin'], permissionMask: fullAccessMask };

// Benchmark 1: Single permission check
const iterations = 100000;
const start1 = performance.now();
for (let i = 0; i < iterations; i++) {
  rbac.hasPermission(benchmarkUser, 'file:read');
}
const end1 = performance.now();
console.log(`Single permission check: ${iterations.toLocaleString()} iterations in ${(end1 - start1).toFixed(2)}ms`);
console.log(`  Average: ${((end1 - start1) / iterations * 1000).toFixed(3)}µs per check`);

// Benchmark 2: Multiple permission check (ANY)
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  rbac.hasAnyPermission(benchmarkUser, ['file:read', 'file:write', 'file:delete']);
}
const end2 = performance.now();
console.log(`\nMultiple permission check (ANY): ${iterations.toLocaleString()} iterations in ${(end2 - start2).toFixed(2)}ms`);
console.log(`  Average: ${((end2 - start2) / iterations * 1000).toFixed(3)}µs per check`);

// Benchmark 3: Authorization with result
const start3 = performance.now();
for (let i = 0; i < iterations; i++) {
  rbac.authorize(benchmarkUser, 'file:read');
}
const end3 = performance.now();
console.log(`\nAuthorization with result: ${iterations.toLocaleString()} iterations in ${(end3 - start3).toFixed(2)}ms`);
console.log(`  Average: ${((end3 - start3) / iterations * 1000).toFixed(3)}µs per check`);

console.log('\n=== Summary ===');
console.log('Advanced patterns demonstrated:');
console.log('  ✓ High-performance permission masks');
console.log('  ✓ Multi-tenant authorization');
console.log('  ✓ Dynamic permission computation (ownership, time)');
console.log('  ✓ Permission inheritance and composition');
console.log('  ✓ Custom authorization logic (IP, time, state)');
console.log('  ✓ Performance benchmarking (< 0.01ms per check)');
