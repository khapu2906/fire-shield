import { describe, it, expect, beforeEach } from 'vitest';
import { RBAC } from '../index';
import type { RBACUser, RBACConfigSchema } from '../index';

describe('RBAC', () => {
	let rbac: RBAC;

	const createUser = (id: string, roles: string[], permissions?: string[]): RBACUser => ({
		id,
		roles,
		permissions,
	});

	describe('Initialization', () => {
		it('should create empty RBAC instance', () => {
			rbac = new RBAC();
			expect(rbac).toBeInstanceOf(RBAC);
		});

		it('should load from config', () => {
			const config: RBACConfigSchema = {
				permissions: [
					{ name: 'user:read', bit: 1 },
					{ name: 'user:write', bit: 2 },
				],
				roles: [
					{ name: 'user', permissions: ['user:read'], level: 1 },
					{ name: 'admin', permissions: ['user:read', 'user:write'], level: 10 },
				],
			};

			rbac = new RBAC({ config });
			const user = createUser('1', ['user']);

			expect(rbac.hasPermission(user, 'user:read')).toBe(true);
			expect(rbac.hasPermission(user, 'user:write')).toBe(false);
		});

		it('should load from preset', () => {
			const preset = {
				name: 'test',
				version: '1.0.0',
				permissions: [{ name: 'test:read', bit: 1 }],
				roles: [{ name: 'tester', permissions: ['test:read'], level: 1 }],
			};

			rbac = new RBAC({ preset });
			const user = createUser('1', ['tester']);

			expect(rbac.hasPermission(user, 'test:read')).toBe(true);
		});

		it('should use bit system by default', () => {
			rbac = new RBAC();
			expect(rbac.getBitPermissionManager()).toBeDefined();
		});

		it('should use legacy system when disabled', () => {
			rbac = new RBAC({ useBitSystem: false });
			expect(rbac.getRoleManager()).toBeDefined();
		});
	});

	describe('Permission Checking', () => {
		beforeEach(() => {
			const config: RBACConfigSchema = {
				permissions: [
					{ name: 'post:read', bit: 1 },
					{ name: 'post:write', bit: 2 },
					{ name: 'post:delete', bit: 4 },
					{ name: 'admin:manage', bit: 8 },
				],
				roles: [
					{ name: 'reader', permissions: ['post:read'], level: 1 },
					{ name: 'writer', permissions: ['post:read', 'post:write'], level: 5 },
					{ name: 'editor', permissions: ['post:read', 'post:write', 'post:delete'], level: 8 },
					{ name: 'admin', permissions: ['post:read', 'post:write', 'post:delete', 'admin:manage'], level: 10 },
				],
			};
			rbac = new RBAC({ config });
		});

		it('should check permission via role', () => {
			const reader = createUser('1', ['reader']);
			expect(rbac.hasPermission(reader, 'post:read')).toBe(true);
			expect(rbac.hasPermission(reader, 'post:write')).toBe(false);
		});

		it('should check permission with multiple roles', () => {
			const user = createUser('1', ['reader', 'writer']);
			expect(rbac.hasPermission(user, 'post:read')).toBe(true);
			expect(rbac.hasPermission(user, 'post:write')).toBe(true);
			expect(rbac.hasPermission(user, 'post:delete')).toBe(false);
		});

		it('should check direct user permissions', () => {
			const user = createUser('1', [], ['post:read']);
			expect(rbac.hasPermission(user, 'post:read')).toBe(true);
		});

		it('should check any permission', () => {
			const writer = createUser('1', ['writer']);
			expect(rbac.hasAnyPermission(writer, ['post:write', 'post:delete'])).toBe(true);
			expect(rbac.hasAnyPermission(writer, ['post:delete', 'admin:manage'])).toBe(false);
		});

		it('should check all permissions', () => {
			const editor = createUser('1', ['editor']);
			expect(rbac.hasAllPermissions(editor, ['post:read', 'post:write'])).toBe(true);
			expect(rbac.hasAllPermissions(editor, ['post:read', 'admin:manage'])).toBe(false);
		});

		it('should return false for unknown role', () => {
			const unknown = createUser('1', ['unknown']);
			expect(rbac.hasPermission(unknown, 'post:read')).toBe(false);
		});

		it('should return false for unknown permission', () => {
			const admin = createUser('1', ['admin']);
			expect(rbac.hasPermission(admin, 'unknown:permission')).toBe(false);
		});
	});

	describe('Permission Mask Support', () => {
		beforeEach(() => {
			const config: RBACConfigSchema = {
				permissions: [
					{ name: 'read', bit: 1 },
					{ name: 'write', bit: 2 },
					{ name: 'delete', bit: 4 },
				],
				roles: [],
			};
			rbac = new RBAC({ config });
		});

		it('should check permission via permission mask', () => {
			const user: RBACUser = {
				id: '1',
				roles: [],
				permissionMask: 3, // 1 + 2 = read + write
			};

			expect(rbac.hasPermission(user, 'read')).toBe(true);
			expect(rbac.hasPermission(user, 'write')).toBe(true);
			expect(rbac.hasPermission(user, 'delete')).toBe(false);
		});
	});

	describe('Authorization', () => {
		beforeEach(() => {
			const config: RBACConfigSchema = {
				permissions: [{ name: 'api:access', bit: 1 }],
				roles: [{ name: 'user', permissions: ['api:access'] }],
			};
			rbac = new RBAC({ config });
		});

		it('should authorize user with permission', () => {
			const user = createUser('1', ['user']);
			const result = rbac.authorize(user, 'api:access');

			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
			expect(result.user).toBe(user);
		});

		it('should deny user without permission', () => {
			const user = createUser('1', []);
			const result = rbac.authorize(user, 'api:access');

			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('lacks permission');
		});

		it('should authorize with context', () => {
			const user = createUser('1', ['user']);
			const result = rbac.authorizeWithContext({
				user,
				resource: 'api',
				action: 'access',
			});

			expect(result.allowed).toBe(true);
		});

		it('should deny when no user in context', () => {
			const result = rbac.authorizeWithContext({});
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('No user');
		});

		it('should deny when missing resource/action and permission', () => {
			const user = createUser('1', ['user']);
			const result = rbac.authorizeWithContext({ user });

			expect(result.allowed).toBe(false);
			expect(result.reason).toContain('resource+action must be provided');
		});
	});

	describe('Role Hierarchy', () => {
		beforeEach(() => {
			const config: RBACConfigSchema = {
				permissions: [
					{ name: 'read', bit: 1 },
					{ name: 'write', bit: 2 },
				],
				roles: [
					{ name: 'user', permissions: ['read'], level: 1 },
					{ name: 'moderator', permissions: ['read', 'write'], level: 5 },
					{ name: 'admin', permissions: ['read', 'write'], level: 10 },
				],
			};
			rbac = new RBAC({ config });
		});

		it('should check role hierarchy by level', () => {
			expect(rbac.canActAsRole('admin', 'user')).toBe(true); // 10 >= 1
			expect(rbac.canActAsRole('moderator', 'user')).toBe(true); // 5 >= 1
			expect(rbac.canActAsRole('user', 'admin')).toBe(false); // 1 < 10
		});

		it('should allow role to act as itself', () => {
			expect(rbac.canActAsRole('user', 'user')).toBe(true);
		});

		it('should get hierarchy manager', () => {
			const hierarchy = rbac.getRoleHierarchy();
			expect(hierarchy.getRoleLevel('admin')).toBe(10);
		});
	});

	describe('Dynamic Role/Permission Management', () => {
		beforeEach(() => {
			rbac = new RBAC();
		});

		it('should create new role dynamically', () => {
			rbac.createRole('custom', ['perm1', 'perm2']);
			expect(rbac.getBitPermissionManager()?.getAllRoles()).toContain('custom');
		});

		it('should add permission to role', () => {
			rbac.createRole('user', ['perm1']);
			rbac.addPermissionToRole('user', 'perm2');

			const perms = rbac.getBitPermissionManager()?.getRolePermissions('user');
			expect(perms).toContain('perm2');
		});

		it('should register new permission in bit system', () => {
			const bit = rbac.registerPermission('custom:action');
			expect(bit).toBeGreaterThan(0);
		});

		it('should throw when registering permission in legacy mode', () => {
			rbac = new RBAC({ useBitSystem: false });
			expect(() => {
				rbac.registerPermission('test');
			}).toThrow('only available in bit-based mode');
		});
	});

	describe('Serialization', () => {
		beforeEach(() => {
			const config: RBACConfigSchema = {
				permissions: [{ name: 'test', bit: 1 }],
				roles: [{ name: 'tester', permissions: ['test'], level: 1 }],
			};
			rbac = new RBAC({ config });
		});

		it('should serialize complete state', () => {
			const state = rbac.serialize();

			expect(state.bitPermissions).toBeDefined();
			expect(state.hierarchy).toBeDefined();
			expect(state.timestamp).toBeGreaterThan(0);
		});

		it('should deserialize and restore state', () => {
			const state = rbac.serialize();
			const rbac2 = new RBAC();
			rbac2.deserialize(state);

			const user = createUser('1', ['tester']);
			expect(rbac2.hasPermission(user, 'test')).toBe(true);
		});

		it('should export and import JSON', () => {
			const json = rbac.toJSON();
			const rbac2 = new RBAC();
			rbac2.fromJSON(json);

			const user = createUser('1', ['tester']);
			expect(rbac2.hasPermission(user, 'test')).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty roles array', () => {
			rbac = new RBAC();
			const user = createUser('1', []);
			expect(rbac.hasPermission(user, 'anything')).toBe(false);
		});

		it('should handle user with no roles or permissions', () => {
			rbac = new RBAC();
			const user = createUser('1', []);
			expect(rbac.hasAnyPermission(user, ['perm1', 'perm2'])).toBe(false);
			expect(rbac.hasAllPermissions(user, ['perm1'])).toBe(false);
		});

		it('should handle missing bit permission manager gracefully', () => {
			rbac = new RBAC({ useBitSystem: false });
			const user = createUser('1', []);
			expect(rbac.hasPermission(user, 'test')).toBe(false);
		});
	});
});
