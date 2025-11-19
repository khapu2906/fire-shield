/**
 * Basic Usage Example
 * Shows how to use RBAC with builder pattern
 */

import { RBACBuilder } from '../lib/index';

// Create RBAC system using builder
const rbac = new RBACBuilder()
	// Use bit-based system for efficiency
	.useBitSystem()

	// Add permissions (auto bit assignment)
	.addPermission('user:read')
	.addPermission('user:update')
	.addPermission('user:delete')
	.addPermission('admin:manage')

	// Add roles with hierarchy levels
	.addRole('user', ['user:read', 'user:update'], { level: 1 })
	.addRole('moderator', ['user:read', 'user:update', 'user:delete'], { level: 5 })
	.addRole('admin', ['user:read', 'user:update', 'user:delete', 'admin:manage'], { level: 10 })

	.build();

// Create users
const regularUser = {
	id: '1',
	roles: ['user'],
};

const adminUser = {
	id: '2',
	roles: ['admin'],
};

// Check permissions
console.log('Regular user can read:', rbac.hasPermission(regularUser, 'user:read')); // true
console.log('Regular user can delete:', rbac.hasPermission(regularUser, 'user:delete')); // false
console.log('Admin can delete:', rbac.hasPermission(adminUser, 'user:delete')); // true

// Check role hierarchy
console.log('Admin can act as user:', rbac.canActAsRole('admin', 'user')); // true (level 10 >= 1)
console.log('User can act as admin:', rbac.canActAsRole('user', 'admin')); // false (level 1 < 10)

// Authorize with result
const result = rbac.authorize(regularUser, 'user:delete');
console.log('Authorization result:', result);
// { allowed: false, reason: "User lacks permission: user:delete", user: {...} }
