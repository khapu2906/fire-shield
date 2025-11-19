/**
 * Custom Configuration Example
 * Shows how to create completely custom RBAC setup
 */

import { RBAC } from '../lib/index';
import type { RBACConfigSchema } from '../lib/types/config.types';

// Define custom config for a blog application
const blogConfig: RBACConfigSchema = {
	permissions: [
		// Post permissions with manual bit assignment
		{ name: 'post:read', bit: 1, resource: 'post', action: 'read' },
		{ name: 'post:create', bit: 2, resource: 'post', action: 'create' },
		{ name: 'post:update', bit: 4, resource: 'post', action: 'update' },
		{ name: 'post:delete', bit: 8, resource: 'post', action: 'delete' },

		// Comment permissions
		{ name: 'comment:read', bit: 16, resource: 'comment', action: 'read' },
		{ name: 'comment:create', bit: 32, resource: 'comment', action: 'create' },
		{ name: 'comment:moderate', bit: 64, resource: 'comment', action: 'moderate' },

		// Analytics permissions
		{ name: 'analytics:view', bit: 128, resource: 'analytics', action: 'view' },
		{ name: 'analytics:export', bit: 256, resource: 'analytics', action: 'export' },
	],

	roles: [
		{
			name: 'guest',
			permissions: ['post:read', 'comment:read'],
			level: 0,
			description: 'Anonymous guest user',
		},
		{
			name: 'member',
			permissions: ['post:read', 'post:create', 'comment:read', 'comment:create'],
			level: 1,
			description: 'Registered member',
		},
		{
			name: 'moderator',
			permissions: ['post:read', 'post:create', 'post:update', 'comment:read', 'comment:create', 'comment:moderate'],
			level: 5,
			description: 'Content moderator',
		},
		{
			name: 'admin',
			permissions: ['post:read', 'post:create', 'post:update', 'post:delete', 'comment:read', 'comment:create', 'comment:moderate', 'analytics:view', 'analytics:export'],
			level: 10,
			description: 'System administrator',
		},
	],

	options: {
		autoBitAssignment: false, // Using manual bits
		startBitValue: 512, // For any future auto-assigned permissions
		strictMode: true, // Throw errors on invalid operations
	},
};

// Create RBAC instance
const rbac = new RBAC({
	config: blogConfig,
	useBitSystem: true,
	strictMode: true,
});

// Test permissions
const guestUser = { id: '1', roles: ['guest'] };
const memberUser = { id: '2', roles: ['member'] };
const adminUser = { id: '3', roles: ['admin'] };

console.log('Guest can read posts:', rbac.hasPermission(guestUser, 'post:read')); // true
console.log('Guest can create posts:', rbac.hasPermission(guestUser, 'post:create')); // false

console.log('Member can create posts:', rbac.hasPermission(memberUser, 'post:create')); // true
console.log('Member can delete posts:', rbac.hasPermission(memberUser, 'post:delete')); // false

console.log('Admin can delete posts:', rbac.hasPermission(adminUser, 'post:delete')); // true
console.log('Admin can view analytics:', rbac.hasPermission(adminUser, 'analytics:view')); // true

// Check hierarchy
console.log('Admin can act as moderator:', rbac.canActAsRole('admin', 'moderator')); // true
console.log('Moderator can act as admin:', rbac.canActAsRole('moderator', 'admin')); // false

// Get role information
const hierarchy = rbac.getRoleHierarchy();
console.log('Role levels:', {
	guest: hierarchy.getRoleLevel('guest'),
	member: hierarchy.getRoleLevel('member'),
	moderator: hierarchy.getRoleLevel('moderator'),
	admin: hierarchy.getRoleLevel('admin'),
});

// Export configuration to save/share
console.log('Config:', JSON.stringify(blogConfig, null, 2));
