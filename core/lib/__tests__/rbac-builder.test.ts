import { describe, it, expect } from 'vitest';
import { RBACBuilder } from '../builders/rbac-builder';
import { defaultPreset } from '../presets/default.preset';

describe('RBACBuilder', () => {
	describe('Fluent API', () => {
		it('should chain methods', () => {
			const builder = new RBACBuilder()
				.useBitSystem()
				.addPermission('read', 1)
				.addPermission('write', 2)
				.addRole('user', ['read'], { level: 1 });

			expect(builder).toBeInstanceOf(RBACBuilder);
		});

		it('should build RBAC instance', () => {
			const rbac = new RBACBuilder()
				.addPermission('test', 1)
				.addRole('tester', ['test'])
				.build();

			const user = { id: '1', roles: ['tester'] };
			expect(rbac.hasPermission(user, 'test')).toBe(true);
		});
	});

	describe('System Mode Selection', () => {
		it('should use bit system by default', () => {
			const rbac = new RBACBuilder().build();
			expect(rbac.getBitPermissionManager()).toBeDefined();
		});

		it('should switch to legacy system', () => {
			const rbac = new RBACBuilder()
				.useLegacySystem()
				.build();

			expect(rbac.getRoleManager()).toBeDefined();
		});

		it('should allow switching back to bit system', () => {
			const rbac = new RBACBuilder()
				.useLegacySystem()
				.useBitSystem()
				.build();

			expect(rbac.getBitPermissionManager()).toBeDefined();
		});
	});

	describe('Permission Building', () => {
		it('should add permission with auto bit', () => {
			const rbac = new RBACBuilder()
				.addPermission('read')
				.addPermission('write')
				.build();

			const perms = rbac.getBitPermissionManager()?.getAllPermissions();
			expect(perms).toContain('read');
			expect(perms).toContain('write');
		});

		it('should add permission with manual bit', () => {
			const rbac = new RBACBuilder()
				.addPermission('read', 1)
				.addPermission('write', 2)
				.build();

			const bitManager = rbac.getBitPermissionManager();
			expect(bitManager?.getPermissionBit('read')).toBe(1);
			expect(bitManager?.getPermissionBit('write')).toBe(2);
		});

		it('should add permission with metadata', () => {
			const config = new RBACBuilder()
				.addPermission('read', 1, {
					resource: 'post',
					action: 'read',
					description: 'Read posts',
				})
				.getConfig();

			expect(config.permissions[0].resource).toBe('post');
			expect(config.permissions[0].action).toBe('read');
			expect(config.permissions[0].description).toBe('Read posts');
		});

		it('should add multiple permissions at once', () => {
			const rbac = new RBACBuilder()
				.addPermissions(
					{ name: 'read', bit: 1 },
					{ name: 'write', bit: 2 },
					{ name: 'delete', bit: 4 }
				)
				.build();

			const perms = rbac.getBitPermissionManager()?.getAllPermissions();
			expect(perms).toHaveLength(3);
		});
	});

	describe('Role Building', () => {
		it('should add role with permissions', () => {
			const rbac = new RBACBuilder()
				.addPermission('read', 1)
				.addRole('reader', ['read'])
				.build();

			const user = { id: '1', roles: ['reader'] };
			expect(rbac.hasPermission(user, 'read')).toBe(true);
		});

		it('should add role with level', () => {
			const rbac = new RBACBuilder()
				.addRole('admin', [], { level: 10 })
				.build();

			expect(rbac.getRoleHierarchy().getRoleLevel('admin')).toBe(10);
		});

		it('should add role with metadata', () => {
			const config = new RBACBuilder()
				.addRole('admin', [], {
					level: 10,
					description: 'Administrator',
					metadata: { color: 'red' },
				})
				.getConfig();

			expect(config.roles[0].description).toBe('Administrator');
			expect(config.roles[0].metadata).toEqual({ color: 'red' });
		});

		it('should add multiple roles at once', () => {
			const rbac = new RBACBuilder()
				.addPermission('read', 1)
				.addRoles(
					{ name: 'user', permissions: ['read'], level: 1 },
					{ name: 'admin', permissions: ['read'], level: 10 }
				)
				.build();

			expect(rbac.getBitPermissionManager()?.getAllRoles()).toHaveLength(2);
		});
	});

	describe('Preset Support', () => {
		it('should load from preset', () => {
			const rbac = new RBACBuilder()
				.withPreset(defaultPreset)
				.build();

			const user = { id: '1', roles: ['user'] };
			expect(rbac.hasPermission(user, 'user:read')).toBe(true);
		});

		it('should extend preset with custom permissions/roles', () => {
			const rbac = new RBACBuilder()
				.withPreset(defaultPreset)
				.addPermission('custom:action', 256)
				.addRole('custom', ['custom:action'], { level: 3 })
				.build();

			const user = { id: '1', roles: ['custom'] };
			expect(rbac.hasPermission(user, 'custom:action')).toBe(true);
		});

		it('should preserve preset options', () => {
			const config = new RBACBuilder()
				.withPreset(defaultPreset)
				.getConfig();

			expect(config.options?.autoBitAssignment).toBe(false);
			expect(config.options?.startBitValue).toBe(256);
		});
	});

	describe('Configuration Options', () => {
		it('should enable strict mode', () => {
			const config = new RBACBuilder()
				.enableStrictMode()
				.getConfig();

			expect(config.options?.strictMode).toBe(true);
		});

		it('should set start bit value', () => {
			const config = new RBACBuilder()
				.withStartBitValue(128)
				.getConfig();

			expect(config.options?.startBitValue).toBe(128);
		});
	});

	describe('Builder State Management', () => {
		it('should reset builder', () => {
			const builder = new RBACBuilder()
				.addPermission('test')
				.addRole('tester', ['test'])
				.reset();

			const config = builder.getConfig();
			expect(config.permissions).toHaveLength(0);
			expect(config.roles).toHaveLength(0);
		});

		it('should get current config without building', () => {
			const config = new RBACBuilder()
				.addPermission('test', 1)
				.addRole('tester', ['test'], { level: 1 })
				.getConfig();

			expect(config.permissions).toHaveLength(1);
			expect(config.roles).toHaveLength(1);
			expect(config.options).toBeDefined();
		});

		it('should reuse builder after reset', () => {
			const builder = new RBACBuilder()
				.addPermission('old')
				.reset()
				.addPermission('new');

			const config = builder.getConfig();
			expect(config.permissions).toHaveLength(1);
			expect(config.permissions[0].name).toBe('new');
		});
	});

	describe('Complete Workflows', () => {
		it('should build simple blog RBAC', () => {
			const rbac = new RBACBuilder()
				.addPermission('post:read', 1)
				.addPermission('post:write', 2)
				.addPermission('post:delete', 4)
				.addRole('reader', ['post:read'], { level: 1 })
				.addRole('author', ['post:read', 'post:write'], { level: 5 })
				.addRole('admin', ['post:read', 'post:write', 'post:delete'], { level: 10 })
				.build();

			const reader = { id: '1', roles: ['reader'] };
			const author = { id: '2', roles: ['author'] };
			const admin = { id: '3', roles: ['admin'] };

			expect(rbac.hasPermission(reader, 'post:read')).toBe(true);
			expect(rbac.hasPermission(reader, 'post:write')).toBe(false);

			expect(rbac.hasPermission(author, 'post:write')).toBe(true);
			expect(rbac.hasPermission(author, 'post:delete')).toBe(false);

			expect(rbac.hasPermission(admin, 'post:delete')).toBe(true);
			expect(rbac.canActAsRole('admin', 'author')).toBe(true);
		});

		it('should build e-commerce RBAC', () => {
			const rbac = new RBACBuilder()
				.addPermissions(
					{ name: 'product:view', bit: 1 },
					{ name: 'product:buy', bit: 2 },
					{ name: 'product:manage', bit: 4 },
					{ name: 'order:view', bit: 8 },
					{ name: 'order:manage', bit: 16 }
				)
				.addRoles(
					{ name: 'customer', permissions: ['product:view', 'product:buy', 'order:view'], level: 1 },
					{ name: 'seller', permissions: ['product:view', 'product:manage', 'order:manage'], level: 5 },
					{ name: 'admin', permissions: ['product:view', 'product:buy', 'product:manage', 'order:view', 'order:manage'], level: 10 }
				)
				.build();

			const customer = { id: '1', roles: ['customer'] };
			const seller = { id: '2', roles: ['seller'] };

			expect(rbac.hasPermission(customer, 'product:buy')).toBe(true);
			expect(rbac.hasPermission(customer, 'product:manage')).toBe(false);

			expect(rbac.hasPermission(seller, 'product:manage')).toBe(true);
			expect(rbac.hasPermission(seller, 'product:buy')).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty builder', () => {
			const rbac = new RBACBuilder().build();
			const user = { id: '1', roles: [] };
			expect(rbac.hasPermission(user, 'anything')).toBe(false);
		});

		it('should handle role without permissions', () => {
			const rbac = new RBACBuilder()
				.addRole('empty', [])
				.build();

			const user = { id: '1', roles: ['empty'] };
			expect(rbac.hasAnyPermission(user, ['test'])).toBe(false);
		});

		it('should handle permission without bit (auto-assigned)', () => {
			const rbac = new RBACBuilder()
				.addPermission('auto1')
				.addPermission('auto2')
				.build();

			const manager = rbac.getBitPermissionManager();
			expect(manager?.getPermissionBit('auto1')).toBe(1);
			expect(manager?.getPermissionBit('auto2')).toBe(2);
		});
	});
});
