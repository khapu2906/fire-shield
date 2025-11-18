import { describe, it, expect, beforeEach } from 'vitest';
import { RoleHierarchy } from '../core/role-hierarchy';

describe('RoleHierarchy', () => {
	let hierarchy: RoleHierarchy;

	beforeEach(() => {
		hierarchy = new RoleHierarchy();
	});

	describe('Level Management', () => {
		it('should set role level', () => {
			hierarchy.setRoleLevel('admin', 10);
			expect(hierarchy.getRoleLevel('admin')).toBe(10);
		});

		it('should get default level for unknown role', () => {
			expect(hierarchy.getRoleLevel('unknown')).toBe(0);
		});

		it('should use custom default level', () => {
			const h = new RoleHierarchy({ defaultLevel: 5 });
			expect(h.getRoleLevel('unknown')).toBe(5);
		});

		it('should throw error for negative level', () => {
			expect(() => {
				hierarchy.setRoleLevel('test', -1);
			}).toThrow('Level must be non-negative');
		});

		it('should check if role exists', () => {
			hierarchy.setRoleLevel('user', 1);
			expect(hierarchy.hasRole('user')).toBe(true);
			expect(hierarchy.hasRole('admin')).toBe(false);
		});
	});

	describe('Hierarchy Comparisons', () => {
		beforeEach(() => {
			hierarchy.setRoleLevel('guest', 0);
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('moderator', 5);
			hierarchy.setRoleLevel('admin', 10);
		});

		it('should check if role can act as another (higher can act as lower)', () => {
			expect(hierarchy.canActAs('admin', 'user')).toBe(true); // 10 >= 1
			expect(hierarchy.canActAs('moderator', 'user')).toBe(true); // 5 >= 1
			expect(hierarchy.canActAs('user', 'admin')).toBe(false); // 1 < 10
		});

		it('should allow role to act as itself', () => {
			expect(hierarchy.canActAs('user', 'user')).toBe(true);
		});

		it('should check if role has higher level', () => {
			expect(hierarchy.hasHigherLevel('admin', 'user')).toBe(true);
			expect(hierarchy.hasHigherLevel('user', 'admin')).toBe(false);
			expect(hierarchy.hasHigherLevel('user', 'user')).toBe(false);
		});

		it('should check if roles have same level', () => {
			hierarchy.setRoleLevel('editor', 5); // Same as moderator
			expect(hierarchy.hasSameLevel('editor', 'moderator')).toBe(true);
			expect(hierarchy.hasSameLevel('user', 'admin')).toBe(false);
		});
	});

	describe('Role Queries', () => {
		beforeEach(() => {
			hierarchy.setRoleLevel('guest', 0);
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('moderator', 5);
			hierarchy.setRoleLevel('editor', 5); // Same level as moderator
			hierarchy.setRoleLevel('admin', 10);
		});

		it('should get roles at specific level', () => {
			const level5Roles = hierarchy.getRolesAtLevel(5);
			expect(level5Roles).toEqual(expect.arrayContaining(['moderator', 'editor']));
			expect(level5Roles).toHaveLength(2);
		});

		it('should get empty array for level with no roles', () => {
			const roles = hierarchy.getRolesAtLevel(99);
			expect(roles).toEqual([]);
		});

		it('should get roles grouped by level', () => {
			const byLevel = hierarchy.getRolesByLevel();
			expect(byLevel.get(0)).toEqual(['guest']);
			expect(byLevel.get(1)).toEqual(['user']);
			expect(byLevel.get(5)).toEqual(expect.arrayContaining(['moderator', 'editor']));
			expect(byLevel.get(10)).toEqual(['admin']);
		});

		it('should get roles sorted by level descending', () => {
			const sorted = hierarchy.getRolesSortedByLevel();
			expect(sorted[0].level).toBe(10); // admin first
			expect(sorted[sorted.length - 1].level).toBe(0); // guest last
		});

		it('should get all roles', () => {
			const roles = hierarchy.getAllRoles();
			expect(roles).toHaveLength(5);
			expect(roles).toEqual(expect.arrayContaining(['guest', 'user', 'moderator', 'editor', 'admin']));
		});

		it('should get hierarchy size', () => {
			expect(hierarchy.size()).toBe(5);
		});
	});

	describe('Min/Max Levels', () => {
		it('should get max level', () => {
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('admin', 10);
			expect(hierarchy.getMaxLevel()).toBe(10);
		});

		it('should get min level', () => {
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('admin', 10);
			expect(hierarchy.getMinLevel()).toBe(1);
		});

		it('should return default level when empty', () => {
			expect(hierarchy.getMaxLevel()).toBe(0);
			expect(hierarchy.getMinLevel()).toBe(0);
		});
	});

	describe('Modifications', () => {
		beforeEach(() => {
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('admin', 10);
		});

		it('should remove role', () => {
			const removed = hierarchy.removeRole('user');
			expect(removed).toBe(true);
			expect(hierarchy.hasRole('user')).toBe(false);
		});

		it('should return false when removing non-existent role', () => {
			const removed = hierarchy.removeRole('unknown');
			expect(removed).toBe(false);
		});

		it('should clear all roles', () => {
			hierarchy.clear();
			expect(hierarchy.size()).toBe(0);
			expect(hierarchy.getAllRoles()).toEqual([]);
		});

		it('should update existing role level', () => {
			hierarchy.setRoleLevel('user', 5);
			expect(hierarchy.getRoleLevel('user')).toBe(5);
		});
	});

	describe('Serialization', () => {
		beforeEach(() => {
			hierarchy.setRoleLevel('user', 1);
			hierarchy.setRoleLevel('admin', 10);
		});

		it('should serialize state', () => {
			const state = hierarchy.serialize();
			expect(state.levels).toEqual({
				user: 1,
				admin: 10,
			});
			expect(state.defaultLevel).toBe(0);
		});

		it('should deserialize state', () => {
			const state = hierarchy.serialize();
			const h2 = new RoleHierarchy();
			h2.deserialize(state);

			expect(h2.getRoleLevel('user')).toBe(1);
			expect(h2.getRoleLevel('admin')).toBe(10);
		});

		it('should export and import JSON', () => {
			const json = hierarchy.toJSON();
			const h2 = new RoleHierarchy();
			h2.fromJSON(json);

			expect(h2.getAllRoles()).toEqual(hierarchy.getAllRoles());
			expect(h2.getRoleLevel('user')).toBe(hierarchy.getRoleLevel('user'));
		});

		it('should preserve default level in serialization', () => {
			const h = new RoleHierarchy({ defaultLevel: 5 });
			h.setRoleLevel('user', 1);

			const state = h.serialize();
			expect(state.defaultLevel).toBe(5);

			const h2 = new RoleHierarchy();
			h2.deserialize(state);
			expect(h2.getRoleLevel('unknown')).toBe(5);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty hierarchy', () => {
			expect(hierarchy.getAllRoles()).toEqual([]);
			expect(hierarchy.size()).toBe(0);
		});

		it('should handle role with level 0', () => {
			hierarchy.setRoleLevel('guest', 0);
			expect(hierarchy.getRoleLevel('guest')).toBe(0);
			expect(hierarchy.canActAs('guest', 'guest')).toBe(true);
		});

		it('should handle very large level numbers', () => {
			hierarchy.setRoleLevel('super', 999999);
			expect(hierarchy.getRoleLevel('super')).toBe(999999);
			expect(hierarchy.canActAs('super', 'admin')).toBe(true);
		});

		it('should handle comparison with unknown roles (default level)', () => {
			hierarchy.setRoleLevel('user', 1);
			// Unknown role gets default level 0
			expect(hierarchy.canActAs('user', 'unknown')).toBe(true); // 1 >= 0
			expect(hierarchy.canActAs('unknown', 'user')).toBe(false); // 0 < 1
		});
	});
});
