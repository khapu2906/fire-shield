import type { PresetConfig } from '../types/config.types';

/**
 * Default RBAC preset with common user/admin roles
 *
 * This is a reference implementation showing common patterns.
 * Users can use this preset, modify it, or create their own from scratch.
 *
 * @example
 * ```typescript
 * // Use as-is
 * const rbac = new RBAC({ preset: defaultPreset });
 *
 * // Or customize
 * const customConfig = {
 *   ...defaultPreset,
 *   roles: [...defaultPreset.roles, { name: 'moderator', ... }]
 * };
 * ```
 */
export const defaultPreset: PresetConfig = {
	name: 'default',
	version: '1.0.0',
	description: 'Basic user/admin role hierarchy',

	permissions: [
		// User permissions
		{
			name: 'user:read',
			bit: 1, // 2^0
			resource: 'user',
			action: 'read',
			description: 'Read user information',
		},
		{
			name: 'user:update',
			bit: 2, // 2^1
			resource: 'user',
			action: 'update',
			description: 'Update user information',
		},
		{
			name: 'user:create',
			bit: 4, // 2^2
			resource: 'user',
			action: 'create',
			description: 'Create new users',
		},
		{
			name: 'user:delete',
			bit: 8, // 2^3
			resource: 'user',
			action: 'delete',
			description: 'Delete users',
		},

		// Admin permissions
		{
			name: 'admin:user:manage',
			bit: 16, // 2^4
			resource: 'admin',
			action: 'user:manage',
			description: 'Manage all users',
		},
		{
			name: 'admin:system:config',
			bit: 32, // 2^5
			resource: 'admin',
			action: 'system:config',
			description: 'Configure system settings',
		},

		// Moderator permissions
		{
			name: 'moderator:content:manage',
			bit: 64, // 2^6
			resource: 'moderator',
			action: 'content:manage',
			description: 'Manage content',
		},
		{
			name: 'moderator:user:moderate',
			bit: 128, // 2^7
			resource: 'moderator',
			action: 'user:moderate',
			description: 'Moderate users',
		},
	],

	roles: [
		{
			name: 'user',
			permissions: ['user:read', 'user:update'],
			level: 1,
			description: 'Basic user with read/update own data',
		},
		{
			name: 'editor',
			permissions: [
				'user:read',
				'user:update',
				'moderator:content:manage',
				'moderator:user:moderate',
			],
			level: 5,
			description: 'Editor with content management capabilities',
		},
		{
			name: 'admin',
			permissions: [
				'user:read',
				'user:update',
				'user:create',
				'user:delete',
				'admin:user:manage',
				'admin:system:config',
				'moderator:content:manage',
				'moderator:user:moderate',
			],
			level: 10,
			description: 'Administrator with full system access',
		},
	],

	options: {
		autoBitAssignment: false, // Use manual bits defined above
		startBitValue: 256, // Start from 2^8 for any additional permissions
		strictMode: false,
	},
};
