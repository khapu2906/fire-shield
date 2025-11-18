import type { BitPermissionState } from '../types/permission.types';

/**
 * Bit-based permission system for efficient permission checking
 * Supports both automatic and manual bit assignment for persistence
 */
export class BitPermissionManager {
	private permissions: Map<string, number> = new Map();
	private nextBitValue: number = 1; // Start with 2^0 = 1
	private roles: Map<string, number> = new Map(); // Role name -> permission mask
	private readonly version: string = '1.0.0';

	constructor(options: { startBitValue?: number; strictMode?: boolean } = {}) {
		this.nextBitValue = options.startBitValue ?? 1;
	}

	/**
	 * Register a new permission with optional manual bit assignment
	 * @param name Permission name (e.g., 'user:read')
	 * @param manualBit Optional manual bit value (must be power of 2)
	 * @returns The assigned bit value
	 */
	registerPermission(name: string, manualBit?: number): number {
		// Return existing if already registered
		if (this.permissions.has(name)) {
			return this.permissions.get(name)!;
		}

		let bitValue: number;

		if (manualBit !== undefined) {
			// Manual bit assignment
			if (!this.isPowerOfTwo(manualBit)) {
				throw new Error(`Invalid bit value ${manualBit} for permission '${name}'. Must be power of 2 (1, 2, 4, 8, ...)`);
			}

			// Check for conflicts
			if (this.isBitUsed(manualBit)) {
				const conflictingPerm = this.getPermissionByBit(manualBit);
				throw new Error(`Bit ${manualBit} already assigned to permission '${conflictingPerm}'`);
			}

			bitValue = manualBit;

			// Update nextBitValue if manual bit is higher
			if (manualBit >= this.nextBitValue) {
				this.nextBitValue = manualBit * 2; // Multiply by 2 (avoid bitwise overflow)
			}
		} else {
			// Automatic bit assignment
			if (this.nextBitValue >= 2 ** 31) {
				throw new Error('Maximum number of permissions exceeded (31 bits)');
			}

			bitValue = this.nextBitValue;
			this.nextBitValue *= 2; // Multiply by 2 (avoid bitwise overflow at 2^31)
		}

		this.permissions.set(name, bitValue);
		return bitValue;
	}

	/**
	 * Get permission bit value
	 */
	getPermissionBit(name: string): number | undefined {
		return this.permissions.get(name);
	}

	/**
	 * Check if a permission mask has a specific permission
	 */
	hasPermission(permissionMask: number, permissionName: string): boolean {
		const bitValue = this.permissions.get(permissionName);
		if (!bitValue) return false;
		return (permissionMask & bitValue) !== 0;
	}

	/**
	 * Check if a permission mask has any of the specified permissions
	 */
	hasAnyPermission(permissionMask: number, permissionNames: string[]): boolean {
		return permissionNames.some(name => this.hasPermission(permissionMask, name));
	}

	/**
	 * Check if a permission mask has all of the specified permissions
	 */
	hasAllPermissions(permissionMask: number, permissionNames: string[]): boolean {
		return permissionNames.every(name => this.hasPermission(permissionMask, name));
	}

	/**
	 * Create a permission mask from permission names
	 */
	createPermissionMask(permissionNames: string[]): number {
		return permissionNames.reduce((mask, name) => {
			const bitValue = this.permissions.get(name);
			return bitValue ? mask | bitValue : mask;
		}, 0);
	}

	/**
	 * Register a role with its permissions
	 */
	registerRole(roleName: string, permissionNames: string[]): void {
		const permissionMask = this.createPermissionMask(permissionNames);
		this.roles.set(roleName, permissionMask);
	}

	/**
	 * Get role permission mask
	 */
	getRoleMask(roleName: string): number | undefined {
		return this.roles.get(roleName);
	}

	/**
	 * Check if a role has a specific permission
	 */
	roleHasPermission(roleName: string, permissionName: string): boolean {
		const roleMask = this.roles.get(roleName);
		if (!roleMask) return false;
		return this.hasPermission(roleMask, permissionName);
	}

	/**
	 * Get all registered permissions
	 */
	getAllPermissions(): string[] {
		return Array.from(this.permissions.keys());
	}

	/**
	 * Get all registered roles
	 */
	getAllRoles(): string[] {
		return Array.from(this.roles.keys());
	}

	/**
	 * Get permissions for a role
	 */
	getRolePermissions(roleName: string): string[] {
		const roleMask = this.roles.get(roleName);
		if (!roleMask) return [];

		return Array.from(this.permissions.entries())
			.filter(([, bitValue]) => (roleMask & bitValue) !== 0)
			.map(([name]) => name);
	}

	/**
	 * Combine permission masks (bitwise OR)
	 */
	combineMasks(...masks: number[]): number {
		return masks.reduce((result, mask) => result | mask, 0);
	}

	/**
	 * Check if one permission mask includes another (bitwise subset check)
	 */
	includesPermissions(containerMask: number, containedMask: number): boolean {
		return (containerMask & containedMask) === containedMask;
	}

	/**
	 * Helper: Check if a number is a power of 2
	 */
	private isPowerOfTwo(n: number): boolean {
		return n > 0 && (n & (n - 1)) === 0;
	}

	/**
	 * Helper: Check if a bit is already used
	 */
	private isBitUsed(bit: number): boolean {
		return Array.from(this.permissions.values()).includes(bit);
	}

	/**
	 * Helper: Get permission name by bit value
	 */
	private getPermissionByBit(bit: number): string | undefined {
		for (const [name, value] of this.permissions.entries()) {
			if (value === bit) return name;
		}
		return undefined;
	}

	/**
	 * Serialize current state for persistence
	 * @returns Serialized state object
	 */
	serialize(): BitPermissionState {
		const permissionsObj: Record<string, number> = {};
		this.permissions.forEach((bit, name) => {
			permissionsObj[name] = bit;
		});

		const rolesObj: Record<string, number> = {};
		this.roles.forEach((mask, name) => {
			rolesObj[name] = mask;
		});

		return {
			permissions: permissionsObj,
			roles: rolesObj,
			nextBitValue: this.nextBitValue,
			timestamp: Date.now(),
			version: this.version,
		};
	}

	/**
	 * Deserialize and load state from persistence
	 * @param state Saved state object
	 */
	deserialize(state: BitPermissionState): void {
		// Validate version compatibility
		if (state.version !== this.version) {
			console.warn(`State version mismatch: expected ${this.version}, got ${state.version}`);
		}

		// Clear existing state
		this.permissions.clear();
		this.roles.clear();

		// Load permissions
		for (const [name, bit] of Object.entries(state.permissions)) {
			this.permissions.set(name, bit);
		}

		// Load roles
		for (const [name, mask] of Object.entries(state.roles)) {
			this.roles.set(name, mask);
		}

		// Restore nextBitValue
		this.nextBitValue = state.nextBitValue;
	}

	/**
	 * Get current state snapshot
	 */
	getState(): BitPermissionState {
		return this.serialize();
	}

	/**
	 * Load state from snapshot
	 */
	loadState(state: BitPermissionState): void {
		this.deserialize(state);
	}

	/**
	 * Export state as JSON string
	 */
	toJSON(): string {
		return JSON.stringify(this.serialize(), null, 2);
	}

	/**
	 * Import state from JSON string
	 */
	fromJSON(json: string): void {
		const state = JSON.parse(json) as BitPermissionState;
		this.deserialize(state);
	}
}
