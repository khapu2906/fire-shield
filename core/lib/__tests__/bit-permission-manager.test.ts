import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BitPermissionManager } from '../core/bit-permission-manager';

describe('BitPermissionManager', () => {
	let manager: BitPermissionManager;

	beforeEach(() => {
		manager = new BitPermissionManager();
	});

	describe('Permission Registration', () => {
		it('should register permission with auto bit assignment', () => {
			const bit1 = manager.registerPermission('user:read');
			const bit2 = manager.registerPermission('user:write');
			const bit3 = manager.registerPermission('user:delete');

			expect(bit1).toBe(1); // 2^0
			expect(bit2).toBe(2); // 2^1
			expect(bit3).toBe(4); // 2^2
		});

		it('should register permission with manual bit assignment', () => {
			const bit = manager.registerPermission('admin:manage', 16); // 2^4
			expect(bit).toBe(16);
		});

		it('should return existing bit if permission already registered', () => {
			const bit1 = manager.registerPermission('user:read');
			const bit2 = manager.registerPermission('user:read');
			expect(bit1).toBe(bit2);
		});

		it('should throw error for invalid manual bit (not power of 2)', () => {
			expect(() => {
				manager.registerPermission('invalid', 3); // Not power of 2
			}).toThrow('Must be power of 2');
		});

		it('should throw error for duplicate manual bit', () => {
			manager.registerPermission('perm1', 4);
			expect(() => {
				manager.registerPermission('perm2', 4); // Same bit
			}).toThrow('already assigned');
		});

		it('should update nextBitValue when manual bit is higher', () => {
			manager.registerPermission('perm1', 128); // Manual high bit
			const nextBit = manager.registerPermission('perm2'); // Auto assignment
			expect(nextBit).toBe(256); // Should be next after 128
		});

		it('should throw error when exceeding 31-bit limit', () => {
			const manager2 = new BitPermissionManager({ startBitValue: 2 ** 30 });
			manager2.registerPermission('perm1'); // Uses 2^30
			expect(() => {
				manager2.registerPermission('perm2'); // Would exceed limit
			}).toThrow('Maximum number of permissions exceeded');
		});
	});

	describe('Permission Checking', () => {
		beforeEach(() => {
			manager.registerPermission('user:read', 1);
			manager.registerPermission('user:write', 2);
			manager.registerPermission('user:delete', 4);
			manager.registerPermission('admin:manage', 8);
		});

		it('should check if mask has permission', () => {
			const mask = 3; // 1 + 2 = read + write
			expect(manager.hasPermission(mask, 'user:read')).toBe(true);
			expect(manager.hasPermission(mask, 'user:write')).toBe(true);
			expect(manager.hasPermission(mask, 'user:delete')).toBe(false);
		});

		it('should check if mask has any permissions', () => {
			const mask = 1; // Only read
			expect(manager.hasAnyPermission(mask, ['user:read', 'user:write'])).toBe(true);
			expect(manager.hasAnyPermission(mask, ['user:delete', 'admin:manage'])).toBe(false);
		});

		it('should check if mask has all permissions', () => {
			const mask = 3; // read + write
			expect(manager.hasAllPermissions(mask, ['user:read', 'user:write'])).toBe(true);
			expect(manager.hasAllPermissions(mask, ['user:read', 'user:delete'])).toBe(false);
		});

		it('should return false for unknown permission', () => {
			const mask = 15;
			expect(manager.hasPermission(mask, 'unknown:permission')).toBe(false);
		});
	});

	describe('Permission Mask Creation', () => {
		beforeEach(() => {
			manager.registerPermission('read', 1);
			manager.registerPermission('write', 2);
			manager.registerPermission('delete', 4);
		});

		it('should create mask from permission names', () => {
			const mask = manager.createPermissionMask(['read', 'write']);
			expect(mask).toBe(3); // 1 + 2
		});

		it('should ignore unknown permissions when creating mask', () => {
			const mask = manager.createPermissionMask(['read', 'unknown', 'write']);
			expect(mask).toBe(3); // Only read + write
		});

		it('should create empty mask for no permissions', () => {
			const mask = manager.createPermissionMask([]);
			expect(mask).toBe(0);
		});
	});

	describe('Role Management', () => {
		beforeEach(() => {
			manager.registerPermission('user:read', 1);
			manager.registerPermission('user:write', 2);
			manager.registerPermission('admin:manage', 4);
		});

		it('should register role with permissions', () => {
			manager.registerRole('user', ['user:read', 'user:write']);
			const mask = manager.getRoleMask('user');
			expect(mask).toBe(3); // 1 + 2
		});

		it('should check if role has permission', () => {
			manager.registerRole('user', ['user:read']);
			expect(manager.roleHasPermission('user', 'user:read')).toBe(true);
			expect(manager.roleHasPermission('user', 'user:write')).toBe(false);
		});

		it('should return undefined for unknown role', () => {
			const mask = manager.getRoleMask('unknown');
			expect(mask).toBeUndefined();
		});

		it('should get all permissions for a role', () => {
			manager.registerRole('admin', ['user:read', 'admin:manage']);
			const perms = manager.getRolePermissions('admin');
			expect(perms).toEqual(['user:read', 'admin:manage']);
		});

		it('should return empty array for unknown role permissions', () => {
			const perms = manager.getRolePermissions('unknown');
			expect(perms).toEqual([]);
		});
	});

	describe('Mask Operations', () => {
		it('should combine multiple masks with OR', () => {
			const mask1 = 1; // 0001
			const mask2 = 2; // 0010
			const mask3 = 4; // 0100
			const combined = manager.combineMasks(mask1, mask2, mask3);
			expect(combined).toBe(7); // 0111
		});

		it('should check if one mask includes another', () => {
			const containerMask = 7; // 0111 (has 1, 2, 4)
			const containedMask1 = 3; // 0011 (has 1, 2)
			const containedMask2 = 8; // 1000 (has 8)

			expect(manager.includesPermissions(containerMask, containedMask1)).toBe(true);
			expect(manager.includesPermissions(containerMask, containedMask2)).toBe(false);
		});
	});

	describe('Getters', () => {
		beforeEach(() => {
			manager.registerPermission('perm1');
			manager.registerPermission('perm2');
			manager.registerRole('role1', ['perm1']);
		});

		it('should get all registered permissions', () => {
			const perms = manager.getAllPermissions();
			expect(perms).toEqual(['perm1', 'perm2']);
		});

		it('should get all registered roles', () => {
			const roles = manager.getAllRoles();
			expect(roles).toEqual(['role1']);
		});

		it('should get permission bit value', () => {
			const bit = manager.getPermissionBit('perm1');
			expect(bit).toBe(1);
		});

		it('should return undefined for unknown permission bit', () => {
			const bit = manager.getPermissionBit('unknown');
			expect(bit).toBeUndefined();
		});
	});

	describe('Serialization', () => {
		beforeEach(() => {
			manager.registerPermission('user:read', 1);
			manager.registerPermission('user:write', 2);
			manager.registerRole('user', ['user:read', 'user:write']);
		});

		it('should serialize state', () => {
			const state = manager.serialize();
			expect(state.permissions).toEqual({
				'user:read': 1,
				'user:write': 2,
			});
			expect(state.roles).toEqual({
				user: 3,
			});
			expect(state.nextBitValue).toBe(4);
			expect(state.version).toBe('1.0.0');
			expect(state.timestamp).toBeGreaterThan(0);
		});

		it('should deserialize state', () => {
			const state = manager.serialize();
			const manager2 = new BitPermissionManager();
			manager2.deserialize(state);

			expect(manager2.getPermissionBit('user:read')).toBe(1);
			expect(manager2.getRoleMask('user')).toBe(3);
			expect(manager2.getAllPermissions()).toEqual(['user:read', 'user:write']);
		});

		it('should export and import JSON', () => {
			const json = manager.toJSON();
			const manager2 = new BitPermissionManager();
			manager2.fromJSON(json);

			expect(manager2.getAllPermissions()).toEqual(manager.getAllPermissions());
			expect(manager2.getAllRoles()).toEqual(manager.getAllRoles());
		});

		it('should warn on version mismatch', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const state = manager.serialize();
			state.version = '2.0.0';

			manager.deserialize(state);

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('State version mismatch')
			);

			consoleWarnSpy.mockRestore();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty permission list', () => {
			expect(manager.getAllPermissions()).toEqual([]);
		});

		it('should handle mask of 0 (no permissions)', () => {
			manager.registerPermission('test', 1);
			expect(manager.hasPermission(0, 'test')).toBe(false);
		});

		it('should handle very large permission masks', () => {
			manager.registerPermission('perm1', 1);
			manager.registerPermission('perm2', 2 ** 30); // Very large bit
			const mask = manager.createPermissionMask(['perm1', 'perm2']);
			expect(manager.hasPermission(mask, 'perm1')).toBe(true);
			expect(manager.hasPermission(mask, 'perm2')).toBe(true);
		});
	});
});
