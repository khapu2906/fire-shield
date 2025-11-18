import type { RoleHierarchyState } from '../types/role.types';

/**
 * Dynamic role hierarchy system based on levels
 * Higher level = more privileged
 */
export class RoleHierarchy {
	private levels: Map<string, number> = new Map();
	private defaultLevel: number = 0;

	constructor(options: { defaultLevel?: number } = {}) {
		this.defaultLevel = options.defaultLevel ?? 0;
	}

	/**
	 * Set level for a role
	 * @param roleName Role name
	 * @param level Hierarchy level (higher = more privileged)
	 */
	setRoleLevel(roleName: string, level: number): void {
		if (level < 0) {
			throw new Error(`Level must be non-negative, got ${level} for role '${roleName}'`);
		}
		this.levels.set(roleName, level);
	}

	/**
	 * Get level for a role
	 * @param roleName Role name
	 * @returns Level or default level if not set
	 */
	getRoleLevel(roleName: string): number {
		return this.levels.get(roleName) ?? this.defaultLevel;
	}

	/**
	 * Check if a role exists in hierarchy
	 */
	hasRole(roleName: string): boolean {
		return this.levels.has(roleName);
	}

	/**
	 * Check if current role can act as target role (has same or higher level)
	 * @param currentRole Current role
	 * @param targetRole Target role to check against
	 * @returns true if current role level >= target role level
	 */
	canActAs(currentRole: string, targetRole: string): boolean {
		const currentLevel = this.getRoleLevel(currentRole);
		const targetLevel = this.getRoleLevel(targetRole);
		return currentLevel >= targetLevel;
	}

	/**
	 * Check if role1 has higher level than role2
	 */
	hasHigherLevel(role1: string, role2: string): boolean {
		return this.getRoleLevel(role1) > this.getRoleLevel(role2);
	}

	/**
	 * Check if role1 has same level as role2
	 */
	hasSameLevel(role1: string, role2: string): boolean {
		return this.getRoleLevel(role1) === this.getRoleLevel(role2);
	}

	/**
	 * Get all roles at a specific level
	 */
	getRolesAtLevel(level: number): string[] {
		return Array.from(this.levels.entries())
			.filter(([, roleLevel]) => roleLevel === level)
			.map(([roleName]) => roleName);
	}

	/**
	 * Get all roles grouped by level
	 * @returns Map of level -> role names
	 */
	getRolesByLevel(): Map<number, string[]> {
		const result = new Map<number, string[]>();

		for (const [roleName, level] of this.levels.entries()) {
			if (!result.has(level)) {
				result.set(level, []);
			}
			result.get(level)!.push(roleName);
		}

		return result;
	}

	/**
	 * Get all roles sorted by level (descending)
	 */
	getRolesSortedByLevel(): Array<{ role: string; level: number }> {
		return Array.from(this.levels.entries())
			.map(([role, level]) => ({ role, level }))
			.sort((a, b) => b.level - a.level);
	}

	/**
	 * Get highest level in hierarchy
	 */
	getMaxLevel(): number {
		if (this.levels.size === 0) return this.defaultLevel;
		return Math.max(...Array.from(this.levels.values()));
	}

	/**
	 * Get lowest level in hierarchy
	 */
	getMinLevel(): number {
		if (this.levels.size === 0) return this.defaultLevel;
		return Math.min(...Array.from(this.levels.values()));
	}

	/**
	 * Remove a role from hierarchy
	 */
	removeRole(roleName: string): boolean {
		return this.levels.delete(roleName);
	}

	/**
	 * Clear all roles
	 */
	clear(): void {
		this.levels.clear();
	}

	/**
	 * Get all roles in hierarchy
	 */
	getAllRoles(): string[] {
		return Array.from(this.levels.keys());
	}

	/**
	 * Get number of roles in hierarchy
	 */
	size(): number {
		return this.levels.size;
	}

	/**
	 * Serialize hierarchy state
	 */
	serialize(): RoleHierarchyState {
		const levelsObj: Record<string, number> = {};
		this.levels.forEach((level, role) => {
			levelsObj[role] = level;
		});

		return {
			levels: levelsObj,
			defaultLevel: this.defaultLevel,
		};
	}

	/**
	 * Deserialize and load hierarchy state
	 */
	deserialize(state: RoleHierarchyState): void {
		this.levels.clear();

		for (const [role, level] of Object.entries(state.levels)) {
			this.levels.set(role, level);
		}

		this.defaultLevel = state.defaultLevel;
	}

	/**
	 * Get current state
	 */
	getState(): RoleHierarchyState {
		return this.serialize();
	}

	/**
	 * Load state
	 */
	loadState(state: RoleHierarchyState): void {
		this.deserialize(state);
	}

	/**
	 * Export as JSON string
	 */
	toJSON(): string {
		return JSON.stringify(this.serialize(), null, 2);
	}

	/**
	 * Import from JSON string
	 */
	fromJSON(json: string): void {
		const state = JSON.parse(json) as RoleHierarchyState;
		this.deserialize(state);
	}
}
