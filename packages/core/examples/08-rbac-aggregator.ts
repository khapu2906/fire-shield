/**
 * Example 8: RBACAggregator - Multi-Domain RBAC Management
 * 
 * This example demonstrates how to use RBACAggregator to manage multiple
 * RBAC instances across different domains (tenants, services, etc.)
 * with a unified interface using the IRBAC pattern.
 */

import {
  RBAC,
  RBACAggregator,
  type IRBAC,
  type RBACUser
} from '@fire-shield/core';

console.log('🚀 Example 8: RBACAggregator - Multi-Domain RBAC Management');
console.log('='.repeat(70));

// ============================================================================
// 1. Polymorphic Usage with IRBAC
// ============================================================================

/**
 * Function that accepts any IRBAC implementation
 * This demonstrates polymorphism - works with both RBAC and RBACAggregator
 */
function setupPermissions(instance: IRBAC) {
  console.log('\n📦 Setting up permissions...');
  instance.registerPermission('posts:read');
  instance.registerPermission('posts:write');
  instance.registerPermission('posts:delete');
  instance.registerPermission('users:manage');
  
  instance.createRole('viewer', ['posts:read']);
  instance.createRole('editor', ['posts:read', 'posts:write']);
  instance.createRole('admin', ['posts:*', 'users:*']);
  
  console.log('✅ Permissions and roles created');
}

// Works with standard RBAC
const singleRbac = new RBAC();
setupPermissions(singleRbac);
console.log('✅ Single RBAC setup complete');

// ============================================================================
// 2. Creating Multi-Tenant RBACAggregator
// ============================================================================

console.log('\n🏢 Creating multi-tenant RBACAggregator...');

const tenantAggregator = new RBACAggregator();

// Create RBAC instances for different tenants
const tenant1Rbac = new RBAC();
const tenant2Rbac = new RBAC();
const tenant3Rbac = new RBAC();

// Add tenant-specific RBAC instances
tenantAggregator.addInstance('tenant-1', tenant1Rbac);
tenantAggregator.addInstance('tenant-2', tenant2Rbac);
tenantAggregator.addInstance('tenant-3', tenant3Rbac);

console.log('✅ Added 3 tenant RBAC instances');

// Setup permissions for each tenant (same structure, different data)
setupPermissions(tenant1Rbac);
setupPermissions(tenant2Rbac);
setupPermissions(tenant3Rbac);

console.log('✅ All tenants configured');

// ============================================================================
// 3. Aggregator Methods
// ============================================================================

console.log('\n📊 Aggregator Statistics:');

console.log('  Domains:', tenantAggregator.getDomains());
console.log('  Total permissions:', tenantAggregator.getPermissions().length);
console.log('  Total roles:', tenantAggregator.getRoles().length);

// ============================================================================
// 4. Multi-Service Architecture
// ============================================================================

console.log('\n🔧 Creating multi-service RBACAggregator...');

const serviceAggregator = new RBACAggregator();

// Blog service RBAC
const blogRbac = new RBAC();
blogRbac.registerPermission('blog:read');
blogRbac.registerPermission('blog:write');
blogRbac.registerPermission('blog:moderate');
blogRbac.createRole('author', ['blog:read', 'blog:write']);
blogRbac.createRole('moderator', ['blog:*']);

// Forum service RBAC
const forumRbac = new RBAC();
forumRbac.registerPermission('forum:read');
forumRbac.registerPermission('forum:write');
forumRbac.registerPermission('forum:delete');
forumRbac.createRole('member', ['forum:read']);
forumRbac.createRole('admin', ['forum:*']);

// E-commerce service RBAC
const ecommerceRbac = new RBAC();
ecommerceRbac.registerPermission('product:view');
ecommerceRbac.registerPermission('product:create');
ecommerceRbac.registerPermission('order:process');
ecommerceRbac.createRole('customer', ['product:view', 'order:create']);
ecommerceRbac.createRole('vendor', ['product:*', 'order:view']);

// Add all services to aggregator
serviceAggregator.addInstance('blog', blogRbac);
serviceAggregator.addInstance('forum', forumRbac);
serviceAggregator.addInstance('ecommerce', ecommerceRbac);

console.log('✅ Added 3 service RBAC instances');
console.log('  Services:', serviceAggregator.getDomains());

// ============================================================================
// 5. Permission Checking Across Services
// ============================================================================

console.log('\n🔍 Checking permissions across services...');

// User with roles across services
const multiServiceUser: RBACUser = {
  id: 'user-123',
  roles: ['author', 'member', 'vendor']
};

// Check permissions
console.log('\n  Blog permissions:');
console.log('    - Can read blog?', serviceAggregator.hasPermission(multiServiceUser, 'blog:read'));
console.log('    - Can write blog?', serviceAggregator.hasPermission(multiServiceUser, 'blog:write'));
console.log('    - Can moderate blog?', serviceAggregator.hasPermission(multiServiceUser, 'blog:moderate'));

console.log('\n  Forum permissions:');
console.log('    - Can read forum?', serviceAggregator.hasPermission(multiServiceUser, 'forum:read'));
console.log('    - Can write forum?', serviceAggregator.hasPermission(multiServiceUser, 'forum:write'));
console.log('    - Can delete forum posts?', serviceAggregator.hasPermission(multiServiceUser, 'forum:delete'));

console.log('\n  E-commerce permissions:');
console.log('    - Can view products?', serviceAggregator.hasPermission(multiServiceUser, 'product:view'));
console.log('    - Can create products?', serviceAggregator.hasPermission(multiServiceUser, 'product:create'));
console.log('    - Can process orders?', serviceAggregator.hasPermission(multiServiceUser, 'order:process'));

// ============================================================================
// 6. Deny Permissions Across Instances
// ============================================================================

console.log('\n🚫 Testing deny permissions across instances...');

const adminUser: RBACUser = {
  id: 'admin-1',
  roles: ['admin', 'moderator', 'vendor']
};

// Check before deny
console.log('\n  Before deny:');
console.log('    - Can delete forum posts?', serviceAggregator.hasPermission(adminUser, 'forum:delete'));

// Deny permission across all instances
serviceAggregator.denyPermission(adminUser.id, 'forum:delete');

// Check after deny
console.log('\n  After deny:');
console.log('    - Can delete forum posts?', serviceAggregator.hasPermission(adminUser, 'forum:delete'));

// Get denied permissions
const denied = serviceAggregator.getDeniedPermissions(adminUser.id);
console.log('\n  Denied permissions:', denied);

// Re-allow permission
serviceAggregator.allowPermission(adminUser.id, 'forum:delete');

console.log('\n  After re-allow:');
console.log('    - Can delete forum posts?', serviceAggregator.hasPermission(adminUser, 'forum:delete'));

// ============================================================================
// 7. Managing Dynamic Tenants (Onboard/Offboard)
// ============================================================================

console.log('\n🏗️  Dynamic tenant management...');

// Create aggregator for SaaS platform
const saasAggregator = new RBACAggregator();

// Onboard new tenant
function onboardTenant(tenantId: string) {
  console.log(`\n  📥 Onboarding tenant: ${tenantId}`);
  
  const tenantRbac = new RBAC();
  setupPermissions(tenantRbac);
  
  saasAggregator.addInstance(tenantId, tenantRbac);
  console.log(`  ✅ Tenant ${tenantId} onboarded`);
  
  return tenantRbac;
}

// Onboard multiple tenants
onboardTenant('acme-corp');
onboardTenant('tech-startup');
onboardTenant('enterprise-inc');

console.log('\n  Active tenants:', saasAggregator.getDomains());

// Offboard tenant
console.log('\n  📤 Offboarding tenant: tech-startup');
saasAggregator.removeInstance('tech-startup');
console.log('  ✅ Tenant tech-startup removed');

console.log('\n  Active tenants:', saasAggregator.getDomains());

// ============================================================================
// 8. Instance Management
// ============================================================================

console.log('\n🔧 Instance management...');

console.log('\n  Has tenant-1?', saasAggregator.hasInstance('tenant-1'));
console.log('  Has acme-corp?', saasAggregator.hasInstance('acme-corp'));

const acmeRbac = saasAggregator.getInstance('acme-corp');
console.log('\n  Acme Corp RBAC instance:', acmeRbac ? '✅ Found' : '❌ Not found');

// Get specific instance and use it directly
if (acmeRbac) {
  const user: RBACUser = { id: 'user-1', roles: ['admin'] };
  const canManage = acmeRbac.hasPermission(user, 'users:manage');
  console.log('\n  User-1 can manage users in Acme Corp?', canManage);
}

// ============================================================================
// 9. Performance: hasAllPermissions vs hasAnyPermission
// ============================================================================

console.log('\n⚡ Performance comparison...');

const testUser: RBACUser = {
  id: 'test-user',
  roles: ['editor', 'member']
};

// Check all permissions
const allPerms = ['blog:read', 'blog:write', 'forum:read'];
const hasAll = serviceAggregator.hasAllPermissions(testUser, allPerms);
console.log(`\n  hasAllPermissions (need all 3):`, hasAll);

// Check any permission
const anyPerms = ['blog:moderate', 'forum:delete', 'order:process'];
const hasAny = serviceAggregator.hasAnyPermission(testUser, anyPerms);
console.log(`  hasAnyPermission (need any of 3):`, hasAny);

// ============================================================================
// 10. Real-World Use Case: Multi-Brand Platform
// ============================================================================

console.log('\n🌐 Multi-brand platform example...');

const brandAggregator = new RBACAggregator();

// Brand A - Strict permissions
const brandA = new RBAC();
brandA.registerPermission('content:view');
brandA.registerPermission('content:edit');
brandA.registerPermission('content:publish');
brandA.createRole('writer', ['content:view', 'content:edit']);
brandA.createRole('editor', ['content:view', 'content:edit', 'content:publish']);

// Brand B - Relaxed permissions
const brandB = new RBAC();
brandB.registerPermission('content:read');
brandB.registerPermission('content:write');
brandB.createRole('contributor', ['content:*']); // Can do everything

// Brand C - Admin-only
const brandC = new RBAC();
brandC.registerPermission('admin:full');
brandC.createRole('admin', ['admin:full']);

brandAggregator.addInstance('brand-a', brandA);
brandAggregator.addInstance('brand-b', brandB);
brandAggregator.addInstance('brand-c', brandC);

console.log('\n  Active brands:', brandAggregator.getDomains());

// Check permissions across brands
const brandUser: RBACUser = {
  id: 'brand-user',
  roles: ['writer', 'contributor', 'admin']
};

console.log('\n  Brand A (strict):');
console.log('    - Can view content?', brandAggregator.hasPermission(brandUser, 'content:view'));
console.log('    - Can publish content?', brandAggregator.hasPermission(brandUser, 'content:publish'));

console.log('\n  Brand B (relaxed):');
console.log('    - Can read content?', brandAggregator.hasPermission(brandUser, 'content:read'));
console.log('    - Can write content?', brandAggregator.hasPermission(brandUser, 'content:write'));

console.log('\n  Brand C (admin-only):');
console.log('    - Has full admin access?', brandAggregator.hasPermission(brandUser, 'admin:full'));

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('✅ Example 8 Complete!');
console.log('\n📚 Key Takeaways:');
console.log('  1. RBACAggregator manages multiple RBAC instances');
console.log('  2. Implements IRBAC for polymorphic usage');
console.log('  3. Perfect for multi-tenant, multi-service architectures');
console.log('  4. Deny permissions work across all instances');
console.log('  5. Dynamic instance management (add/remove)');
console.log('  6. Type-safe with full TypeScript support');
console.log('\n🔗 Learn more:');
console.log('  - docs/api/rbac-aggregator.md - Full API reference');
console.log('  - docs/api/types.md - IRBAC interface');
console.log('='.repeat(70));
