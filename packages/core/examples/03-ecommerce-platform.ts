/**
 * E-commerce Platform Example
 *
 * This example demonstrates a multi-vendor e-commerce platform with:
 * - Customer, vendor, and admin roles
 * - Product and order management
 * - Inventory and pricing controls
 * - Advanced permission combinations
 */

import { RBACBuilder } from '../lib/index';

console.log('=== E-commerce Platform Example ===\n');

// Build RBAC with fluent API
const rbac = new RBACBuilder()
  // Product permissions
  .addPermission('product:view', 1, {
    resource: 'product',
    action: 'view',
    description: 'View products in catalog'
  })
  .addPermission('product:create', 2, {
    resource: 'product',
    action: 'create',
    description: 'Create new products'
  })
  .addPermission('product:edit', 4, {
    resource: 'product',
    action: 'edit',
    description: 'Edit existing products'
  })
  .addPermission('product:delete', 8, {
    resource: 'product',
    action: 'delete',
    description: 'Delete products'
  })
  .addPermission('product:price:edit', 16, {
    resource: 'product',
    action: 'price:edit',
    description: 'Change product prices'
  })

  // Order permissions
  .addPermission('order:view', 32, {
    resource: 'order',
    action: 'view',
    description: 'View orders'
  })
  .addPermission('order:create', 64, {
    resource: 'order',
    action: 'create',
    description: 'Place new orders'
  })
  .addPermission('order:cancel', 128, {
    resource: 'order',
    action: 'cancel',
    description: 'Cancel orders'
  })
  .addPermission('order:fulfill', 256, {
    resource: 'order',
    action: 'fulfill',
    description: 'Mark orders as fulfilled'
  })
  .addPermission('order:refund', 512, {
    resource: 'order',
    action: 'refund',
    description: 'Process refunds'
  })

  // Inventory permissions
  .addPermission('inventory:view', 1024, {
    resource: 'inventory',
    action: 'view',
    description: 'View inventory levels'
  })
  .addPermission('inventory:manage', 2048, {
    resource: 'inventory',
    action: 'manage',
    description: 'Manage inventory levels'
  })

  // Payment permissions
  .addPermission('payment:process', 4096, {
    resource: 'payment',
    action: 'process',
    description: 'Process payments'
  })

  // Analytics permissions
  .addPermission('analytics:view', 8192, {
    resource: 'analytics',
    action: 'view',
    description: 'View sales analytics'
  })

  // User management
  .addPermission('user:manage', 16384, {
    resource: 'user',
    action: 'manage',
    description: 'Manage platform users'
  })

  // Create roles with hierarchy levels
  .addRole('customer', [
    'product:view',
    'order:view',
    'order:create',
    'order:cancel'
  ], {
    level: 1,
    description: 'Regular customer with shopping capabilities'
  })

  .addRole('vendor', [
    'product:view',
    'product:create',
    'product:edit',
    'product:price:edit',
    'order:view',
    'order:fulfill',
    'inventory:view',
    'inventory:manage',
    'analytics:view'
  ], {
    level: 5,
    description: 'Vendor who can manage their own products'
  })

  .addRole('customer-service', [
    'product:view',
    'order:view',
    'order:cancel',
    'order:refund'
  ], {
    level: 7,
    description: 'Customer service representative'
  })

  .addRole('operations', [
    'product:view',
    'order:view',
    'order:fulfill',
    'inventory:view',
    'inventory:manage'
  ], {
    level: 8,
    description: 'Operations team managing fulfillment'
  })

  .addRole('admin', [
    'product:view',
    'product:create',
    'product:edit',
    'product:delete',
    'product:price:edit',
    'order:view',
    'order:create',
    'order:cancel',
    'order:fulfill',
    'order:refund',
    'inventory:view',
    'inventory:manage',
    'payment:process',
    'analytics:view',
    'user:manage'
  ], {
    level: 100,
    description: 'Platform administrator with full access'
  })

  .build();

console.log('✓ E-commerce RBAC configured with 15 permissions and 5 roles\n');

// Create sample users
const customer = {
  id: 'cust-001',
  roles: ['customer'],
  email: 'customer@example.com'
};

const vendor = {
  id: 'vend-001',
  roles: ['vendor'],
  email: 'vendor@example.com',
  shopId: 'shop-123'
};

const csAgent = {
  id: 'cs-001',
  roles: ['customer-service'],
  email: 'support@example.com'
};

const opsManager = {
  id: 'ops-001',
  roles: ['operations'],
  email: 'ops@example.com'
};

const platformAdmin = {
  id: 'admin-001',
  roles: ['admin'],
  email: 'admin@example.com'
};

// Simulate e-commerce workflows
console.log('=== E-commerce Workflows ===\n');

// Workflow 1: Customer shopping
console.log('1. Customer Shopping Journey:');
console.log(`   View products: ${rbac.hasPermission(customer, 'product:view') ? '✓' : '✗'}`);
console.log(`   Create order: ${rbac.hasPermission(customer, 'order:create') ? '✓' : '✗'}`);
console.log(`   Cancel order: ${rbac.hasPermission(customer, 'order:cancel') ? '✓' : '✗'}`);
console.log(`   Process refund: ${rbac.hasPermission(customer, 'order:refund') ? '✗ (Expected)' : '✗'}\n`);

// Workflow 2: Vendor managing products
console.log('2. Vendor Product Management:');
console.log(`   Create product: ${rbac.hasPermission(vendor, 'product:create') ? '✓' : '✗'}`);
console.log(`   Edit product: ${rbac.hasPermission(vendor, 'product:edit') ? '✓' : '✗'}`);
console.log(`   Edit price: ${rbac.hasPermission(vendor, 'product:price:edit') ? '✓' : '✗'}`);
console.log(`   Delete product: ${rbac.hasPermission(vendor, 'product:delete') ? '✗ (Expected)' : '✗'}`);
console.log(`   View analytics: ${rbac.hasPermission(vendor, 'analytics:view') ? '✓' : '✗'}\n`);

// Workflow 3: Customer service handling refund
console.log('3. Customer Service Refund:');
const refundCheck = rbac.authorize(csAgent, 'order:refund');
console.log(`   Process refund: ${refundCheck.allowed ? '✓ Allowed' : '✗ Denied'}`);
if (refundCheck.allowed) {
  console.log('   Refund processed successfully\n');
} else {
  console.log(`   Reason: ${refundCheck.reason}\n`);
}

// Workflow 4: Operations fulfilling order
console.log('4. Operations Order Fulfillment:');
const requiredForFulfillment = ['order:view', 'order:fulfill', 'inventory:manage'];
const canFulfill = rbac.hasAllPermissions(opsManager, requiredForFulfillment);
console.log(`   Has all required permissions: ${canFulfill ? '✓' : '✗'}`);
if (canFulfill) {
  console.log('   Order marked as fulfilled ✓\n');
}

// Workflow 5: Admin operations
console.log('5. Admin System Management:');
console.log(`   Delete product: ${rbac.hasPermission(platformAdmin, 'product:delete') ? '✓' : '✗'}`);
console.log(`   Manage users: ${rbac.hasPermission(platformAdmin, 'user:manage') ? '✓' : '✗'}`);
console.log(`   Process payment: ${rbac.hasPermission(platformAdmin, 'payment:process') ? '✓' : '✗'}`);
console.log(`   View analytics: ${rbac.hasPermission(platformAdmin, 'analytics:view') ? '✓' : '✗'}\n`);

// Role hierarchy checks
console.log('=== Role Hierarchy Checks ===\n');
console.log('Can admin act as vendor?', rbac.canActAsRole('admin', 'vendor') ? '✓ Yes' : '✗ No');
console.log('Can vendor act as customer?', rbac.canActAsRole('vendor', 'customer') ? '✓ Yes' : '✗ No');
console.log('Can operations act as customer-service?', rbac.canActAsRole('operations', 'customer-service') ? '✓ Yes' : '✗ No');
console.log('Can customer act as vendor?', rbac.canActAsRole('customer', 'vendor') ? '✗ No' : '✗ No');

// Permission combinations
console.log('\n=== Permission Combinations ===\n');

// Vendor trying to do customer + vendor actions
console.log('Vendor performing multiple actions:');
const vendorActions = ['product:create', 'order:create', 'inventory:manage'];
console.log(`  Has ANY of [product:create, order:create, inventory:manage]: ${rbac.hasAnyPermission(vendor, vendorActions)}`);
console.log(`  Has ALL of [product:create, order:create, inventory:manage]: ${rbac.hasAllPermissions(vendor, vendorActions)}`);

// Specialized vendor with extra permissions
console.log('\n=== Premium Vendor (Direct Permissions) ===\n');
const premiumVendor = {
  id: 'vend-002',
  roles: ['vendor'],
  permissions: ['product:delete'], // Extra permission
  email: 'premium@example.com',
  shopId: 'shop-456',
  isPremium: true
};

console.log('Premium vendor capabilities:');
console.log(`  Regular permissions (from role): ${rbac.hasPermission(premiumVendor, 'product:create') ? '✓' : '✗'}`);
console.log(`  Special permission (direct): ${rbac.hasPermission(premiumVendor, 'product:delete') ? '✓' : '✗'}`);
console.log('\nComparison:');
console.log(`  Regular vendor can delete: ${rbac.hasPermission(vendor, 'product:delete') ? '✓' : '✗'}`);
console.log(`  Premium vendor can delete: ${rbac.hasPermission(premiumVendor, 'product:delete') ? '✓' : '✗'}`);

// Context-based authorization
console.log('\n=== Context-Based Authorization ===\n');

const orderContext = {
  user: customer,
  resource: 'order',
  action: 'create'
};

const orderResult = rbac.authorizeWithContext(orderContext);
console.log('Customer creating order:');
console.log(`  Allowed: ${orderResult.allowed}`);
console.log(`  User: ${orderResult.user?.email}`);

const deleteContext = {
  user: vendor,
  resource: 'product',
  action: 'delete'
};

const deleteResult = rbac.authorizeWithContext(deleteContext);
console.log('\nVendor deleting product:');
console.log(`  Allowed: ${deleteResult.allowed}`);
console.log(`  Reason: ${deleteResult.reason}`);

// Permission matrix
console.log('\n=== Permission Matrix ===\n');

const roles = ['customer', 'vendor', 'customer-service', 'operations', 'admin'];
const permissions = [
  'product:create',
  'product:delete',
  'order:refund',
  'inventory:manage',
  'user:manage'
];

console.log('Permission'.padEnd(20), '|', roles.map(r => r.substring(0, 8).padEnd(8)).join(' | '));
console.log('-'.repeat(90));

const users = { customer, vendor, 'customer-service': csAgent, operations: opsManager, admin: platformAdmin };

permissions.forEach(permission => {
  const checks = roles.map(role => {
    const hasPermission = rbac.hasPermission(users[role], permission);
    return (hasPermission ? '✓' : '✗').padEnd(8);
  });
  console.log(permission.padEnd(20), '|', checks.join(' | '));
});

console.log('\n=== Summary ===');
console.log('E-commerce RBAC system successfully configured!');
console.log('- 5 roles with clear hierarchy');
console.log('- 15 granular permissions');
console.log('- Support for direct permission overrides');
console.log('- Context-based authorization');
