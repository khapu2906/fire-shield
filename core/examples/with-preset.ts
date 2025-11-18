/**
 * Using Preset Configuration
 * Shows how to use pre-defined presets
 */

import { RBAC, defaultPreset } from '../lib/index';

// Option 1: Use default preset directly
const rbac1 = new RBAC({ preset: defaultPreset });

// Option 2: Use builder with preset
import { RBACBuilder } from '../lib/builder';

const rbac2 = new RBACBuilder()
	.withPreset(defaultPreset)
	// Add custom roles/permissions on top of preset
	.addPermission('custom:action')
	.addRole('custom_role', ['custom:action', 'user:read'], { level: 3 })
	.build();

// Test with preset
const user = {
	id: '1',
	roles: ['user'],
};

console.log('Has user:read permission:', rbac1.hasPermission(user, 'user:read')); // true
console.log('Has admin:system:config:', rbac1.hasPermission(user, 'admin:system:config')); // false

// Check hierarchy from preset
console.log('Admin level:', rbac1.getRoleHierarchy().getRoleLevel('admin')); // 10
console.log('User level:', rbac1.getRoleHierarchy().getRoleLevel('user')); // 1
