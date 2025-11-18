import { describe, it, expect } from 'vitest';
import { RBACBuilder, RBAC, defaultPreset } from '../index';
import type { RBACUser } from '../index';

describe('Integration Tests', () => {
	describe('End-to-End Scenarios', () => {
		it('should handle complete blog authorization flow', () => {
			// Setup
			const rbac = new RBACBuilder()
				.addPermission('post:read', 1)
				.addPermission('post:create', 2)
				.addPermission('post:edit', 4)
				.addPermission('post:delete', 8)
				.addPermission('comment:create', 16)
				.addPermission('comment:moderate', 32)
				.addRole('guest', ['post:read'], { level: 0 })
				.addRole('member', ['post:read', 'post:create', 'comment:create'], { level: 1 })
				.addRole('author', ['post:read', 'post:create', 'post:edit', 'comment:create'], { level: 5 })
				.addRole('moderator', ['post:read', 'comment:create', 'comment:moderate'], { level: 7 })
				.addRole('admin', ['post:read', 'post:create', 'post:edit', 'post:delete', 'comment:create', 'comment:moderate'], { level: 10 })
				.build();

			// Users
			const guest: RBACUser = { id: '1', roles: ['guest'] };
			const member: RBACUser = { id: '2', roles: ['member'] };
			const author: RBACUser = { id: '3', roles: ['author'] };
			const moderator: RBACUser = { id: '4', roles: ['moderator'] };
			const admin: RBACUser = { id: '5', roles: ['admin'] };

			// Guest can only read
			expect(rbac.hasPermission(guest, 'post:read')).toBe(true);
			expect(rbac.hasPermission(guest, 'post:create')).toBe(false);
			expect(rbac.hasPermission(guest, 'comment:create')).toBe(false);

			// Member can read, create posts, and comment
			expect(rbac.hasPermission(member, 'post:read')).toBe(true);
			expect(rbac.hasPermission(member, 'post:create')).toBe(true);
			expect(rbac.hasPermission(member, 'comment:create')).toBe(true);
			expect(rbac.hasPermission(member, 'post:edit')).toBe(false);

			// Author can edit but not delete
			expect(rbac.hasPermission(author, 'post:edit')).toBe(true);
			expect(rbac.hasPermission(author, 'post:delete')).toBe(false);

			// Moderator can moderate comments
			expect(rbac.hasPermission(moderator, 'comment:moderate')).toBe(true);
			expect(rbac.hasPermission(moderator, 'post:delete')).toBe(false);

			// Admin has all permissions
			expect(rbac.hasAllPermissions(admin, [
				'post:read',
				'post:create',
				'post:edit',
				'post:delete',
				'comment:create',
				'comment:moderate',
			])).toBe(true);

			// Hierarchy checks
			expect(rbac.canActAsRole('admin', 'author')).toBe(true);
			expect(rbac.canActAsRole('author', 'member')).toBe(true);
			expect(rbac.canActAsRole('member', 'admin')).toBe(false);
		});

		it('should handle multi-role users', () => {
			const rbac = new RBACBuilder()
				.addPermission('read', 1)
				.addPermission('write', 2)
				.addPermission('delete', 4)
				.addPermission('admin', 8)
				.addRole('reader', ['read'])
				.addRole('writer', ['write'])
				.addRole('admin', ['admin'])
				.build();

			// User with multiple roles
			const multiRole: RBACUser = {
				id: '1',
				roles: ['reader', 'writer'],
			};

			expect(rbac.hasPermission(multiRole, 'read')).toBe(true);
			expect(rbac.hasPermission(multiRole, 'write')).toBe(true);
			expect(rbac.hasPermission(multiRole, 'delete')).toBe(false);
		});

		it('should handle direct permissions override', () => {
			const rbac = new RBACBuilder()
				.addPermission('read', 1)
				.addPermission('write', 2)
				.addRole('reader', ['read'])
				.build();

			// User with role + direct permissions
			const user: RBACUser = {
				id: '1',
				roles: ['reader'],
				permissions: ['write'], // Direct permission override
			};

			expect(rbac.hasPermission(user, 'read')).toBe(true); // From role
			expect(rbac.hasPermission(user, 'write')).toBe(true); // Direct permission
		});
	});

	describe('State Persistence', () => {
		it('should persist and restore complete state', () => {
			// Create and configure RBAC
			const rbac1 = new RBACBuilder()
				.addPermission('test:read', 1)
				.addPermission('test:write', 2)
				.addRole('tester', ['test:read', 'test:write'], { level: 5 })
				.build();

			// Serialize state
			const state = rbac1.serialize();

			// Create new instance and restore
			const rbac2 = new RBAC();
			rbac2.deserialize(state);

			// Verify it works
			const user: RBACUser = { id: '1', roles: ['tester'] };
			expect(rbac2.hasPermission(user, 'test:read')).toBe(true);
			expect(rbac2.hasPermission(user, 'test:write')).toBe(true);
			expect(rbac2.getRoleHierarchy().getRoleLevel('tester')).toBe(5);
		});

		it('should handle JSON serialization', () => {
			const rbac1 = new RBACBuilder()
				.addPermission('perm1', 1)
				.addRole('role1', ['perm1'])
				.build();

			// Export to JSON string
			const json = rbac1.toJSON();
			expect(typeof json).toBe('string');

			// Import from JSON
			const rbac2 = new RBAC();
			rbac2.fromJSON(json);

			const user: RBACUser = { id: '1', roles: ['role1'] };
			expect(rbac2.hasPermission(user, 'perm1')).toBe(true);
		});
	});

	describe('Default Preset Usage', () => {
		it('should work with default preset', () => {
			const rbac = new RBAC({ preset: defaultPreset });

			const regularUser: RBACUser = { id: '1', roles: ['user'] };
			const editor: RBACUser = { id: '2', roles: ['editor'] };
			const admin: RBACUser = { id: '3', roles: ['admin'] };

			// User permissions
			expect(rbac.hasPermission(regularUser, 'user:read')).toBe(true);
			expect(rbac.hasPermission(regularUser, 'user:update')).toBe(true);
			expect(rbac.hasPermission(regularUser, 'user:delete')).toBe(false);

			// Editor permissions
			expect(rbac.hasPermission(editor, 'moderator:content:manage')).toBe(true);
			expect(rbac.hasPermission(editor, 'admin:system:config')).toBe(false);

			// Admin permissions
			expect(rbac.hasPermission(admin, 'admin:system:config')).toBe(true);
			expect(rbac.hasPermission(admin, 'user:delete')).toBe(true);

			// Hierarchy
			expect(rbac.canActAsRole('admin', 'editor')).toBe(true);
			expect(rbac.canActAsRole('editor', 'user')).toBe(true);
			expect(rbac.canActAsRole('user', 'admin')).toBe(false);
		});

		it('should extend default preset', () => {
			const rbac = new RBACBuilder()
				.withPreset(defaultPreset)
				.addPermission('custom:action', 256)
				.addRole('superadmin', ['admin:system:config', 'custom:action'], { level: 100 })
				.build();

			const superadmin: RBACUser = { id: '1', roles: ['superadmin'] };

			expect(rbac.hasPermission(superadmin, 'admin:system:config')).toBe(true);
			expect(rbac.hasPermission(superadmin, 'custom:action')).toBe(true);
			expect(rbac.canActAsRole('superadmin', 'admin')).toBe(true);
		});
	});

	describe('Real-World Scenarios', () => {
		it('should handle e-commerce permission model', () => {
			const rbac = new RBACBuilder()
				// Product permissions
				.addPermission('product:browse', 1)
				.addPermission('product:purchase', 2)
				.addPermission('product:list', 4)
				.addPermission('product:manage', 8)

				// Order permissions
				.addPermission('order:view', 16)
				.addPermission('order:create', 32)
				.addPermission('order:fulfill', 64)
				.addPermission('order:refund', 128)

				// Analytics
				.addPermission('analytics:view', 256)
				.addPermission('analytics:export', 512)

				// Roles
				.addRole('customer', ['product:browse', 'product:purchase', 'order:view', 'order:create'], { level: 1 })
				.addRole('vendor', ['product:browse', 'product:list', 'product:manage', 'order:view', 'order:fulfill'], { level: 5 })
				.addRole('manager', ['product:browse', 'product:purchase', 'product:list', 'product:manage', 'order:view', 'order:create', 'order:fulfill', 'order:refund', 'analytics:view'], { level: 10 })
				.addRole('admin', ['product:browse', 'product:purchase', 'product:list', 'product:manage', 'order:view', 'order:create', 'order:fulfill', 'order:refund', 'analytics:view', 'analytics:export'], { level: 100 })
				.build();

			const customer: RBACUser = { id: '1', roles: ['customer'] };
			const vendor: RBACUser = { id: '2', roles: ['vendor'] };
			const manager: RBACUser = { id: '3', roles: ['manager'] };

			// Customer can browse and buy
			expect(rbac.hasPermission(customer, 'product:browse')).toBe(true);
			expect(rbac.hasPermission(customer, 'product:purchase')).toBe(true);
			expect(rbac.hasPermission(customer, 'product:manage')).toBe(false);
			expect(rbac.hasPermission(customer, 'order:fulfill')).toBe(false);

			// Vendor can manage products and fulfill orders
			expect(rbac.hasPermission(vendor, 'product:list')).toBe(true);
			expect(rbac.hasPermission(vendor, 'order:fulfill')).toBe(true);
			expect(rbac.hasPermission(vendor, 'order:refund')).toBe(false);

			// Manager has refund rights
			expect(rbac.hasPermission(manager, 'order:refund')).toBe(true);
			expect(rbac.hasPermission(manager, 'analytics:view')).toBe(true);
			expect(rbac.hasPermission(manager, 'analytics:export')).toBe(false);
		});

		it('should handle complex authorization contexts', () => {
			const rbac = new RBACBuilder()
				.addPermission('document:read', 1)
				.addPermission('document:write', 2)
				.addRole('viewer', ['document:read'])
				.addRole('editor', ['document:read', 'document:write'])
				.build();

			const viewer: RBACUser = { id: '1', roles: ['viewer'] };

			// Context-based authorization
			const readResult = rbac.authorizeWithContext({
				user: viewer,
				resource: 'document',
				action: 'read',
			});
			expect(readResult.allowed).toBe(true);

			const writeResult = rbac.authorizeWithContext({
				user: viewer,
				resource: 'document',
				action: 'write',
			});
			expect(writeResult.allowed).toBe(false);
			expect(writeResult.reason).toContain('lacks permission');
		});
	});

	describe('Dynamic Configuration', () => {
		it('should add roles and permissions at runtime', () => {
			const rbac = new RBACBuilder()
				.addPermission('initial', 1)
				.build();

			// Add new permission
			rbac.registerPermission('dynamic:permission');

			// Create new role
			rbac.createRole('dynamic_role', ['dynamic:permission']);

			// Should work immediately
			const user: RBACUser = { id: '1', roles: ['dynamic_role'] };
			expect(rbac.hasPermission(user, 'dynamic:permission')).toBe(true);
		});

		it('should modify role permissions at runtime', () => {
			const rbac = new RBACBuilder()
				.addPermission('perm1', 1)
				.addPermission('perm2', 2)
				.addRole('role1', ['perm1'])
				.build();

			// Add permission to existing role
			rbac.addPermissionToRole('role1', 'perm2');

			const user: RBACUser = { id: '1', roles: ['role1'] };
			expect(rbac.hasPermission(user, 'perm2')).toBe(true);
		});
	});
});
