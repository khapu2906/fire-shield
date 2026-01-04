import { RBAC } from '../index';
import type { PermissionConfig, RBACConfigSchema, PresetConfig } from '../types/config.types';
import type { RoleConfig } from '../types/role.types';

/**
 * Fluent API builder for RBAC system
 * Provides a convenient way to configure RBAC with method chaining
 *
 * @example
 * ```typescript
 * const rbac = new RBACBuilder()
 *   .useBitSystem()
 *   .addPermission('user:read', 1)
 *   .addPermission('user:write', 2)
 *   .addRole('user', ['user:read'], { level: 1 })
 *   .addRole('admin', ['user:read', 'user:write'], { level: 10 })
 *   .build();
 * ```
 */
export class RBACBuilder {
	private permissions: PermissionConfig[] = [];
	private roles: RoleConfig[] = [];
	private roleHierarchy: Record<string, string[]> = {};
	private useBit: boolean = true;
	private startBitValue: number = 1;
	private strictMode: boolean = false;
	private autoBitAssignment: boolean = true;
	private wildcardsEnabled: boolean = true;
	private auditLogger?: import('../types/audit.types').AuditLogger;
	private currentRole?: string;

	// Fluent API state
	private buildingRole = false;

	/**
	 * Enable bit-based permission system (default)
	 */
	useBitSystem(): this {
		this.useBit = true;
		return this;
	}

	/**
	 * Use legacy string-based permission system
	 */
	useLegacySystem(): this {
		this.useBit = false;
		return this;
	}

	/**
	 * Load from a preset configuration
	 */
	withPreset(preset: PresetConfig): this {
		this.permissions = [...preset.permissions];
		this.roles = [...preset.roles];

		if (preset.options) {
			this.autoBitAssignment = preset.options.autoBitAssignment ?? true;
			this.startBitValue = preset.options.startBitValue ?? 1;
			this.strictMode = preset.options.strictMode ?? false;
		}

		return this;
	}

	/**
	 * Enable strict mode (throw errors on invalid operations)
	 */
	enableStrictMode(): this {
		this.strictMode = true;
		return this;
	}

	/**
	 * Enable or disable wildcard permission matching
	 */
	enableWildcards(enabled: boolean = true): this {
		this.wildcardsEnabled = enabled;
		return this;
	}

	/**
	 * Add an audit logger to the RBAC instance
	 */
	withAuditLogger(logger: import('../types/audit.types').AuditLogger): this {
		this.auditLogger = logger;
		return this;
	}

	/**
	 * Set starting bit value for auto-assignment
	 */
	withStartBitValue(value: number): this {
		this.startBitValue = value;
		return this;
	}

	/**
	 * Add a permission
	 * @param name Permission name (e.g., 'user:read')
	 * @param bit Optional manual bit assignment (must be power of 2)
	 * @param options Additional options (resource, action, description, metadata)
	 */
	addPermission(
		name: string,
		bit?: number,
		options?: {
			resource?: string;
			action?: string;
			description?: string;
			metadata?: Record<string, any>;
		}
	): this {
		this.permissions.push({
			name,
			bit,
			...options,
		});
		return this;
	}

	/**
	 * Add multiple permissions at once
	 */
	addPermissions(...permissions: Array<{ name: string; bit?: number }>): this {
		for (const perm of permissions) {
			this.addPermission(perm.name, perm.bit);
		}
		return this;
	}

	/**
	 * Add a role
	 * @param name Role name (e.g., 'admin')
	 * @param permissions List of permission names
	 * @param options Additional options (level, description, metadata)
	 */
	addRole(
		name: string,
		permissions: string[],
		options?: {
			level?: number;
			description?: string;
			metadata?: Record<string, any>;
		}
	): this {
		this.roles.push({
			name,
			permissions,
			...options,
		});
		return this;
	}

	/**
	 * Add multiple roles at once
	 */
	addRoles(...roles: Array<{ name: string; permissions: string[]; level?: number }>): this {
		for (const role of roles) {
			this.addRole(role.name, role.permissions, { level: role.level });
		}
		return this;
	}

	/**
	 * Fluent API: Start defining a role
	 */
	role(name: string): this {
		if (this.buildingRole) {
			throw new Error('Cannot start a new role while another role is being defined. Call grant() first.');
		}

		this.currentRole = name;
		this.buildingRole = true;
		return this;
	}

	/**
	 * Fluent API: Grant permissions to current role
	 */
	grant(permissions: string[]): this {
		if (!this.currentRole || !this.buildingRole) {
			throw new Error('Must call role() before grant()');
		}

		// Auto-register permissions if not already in the permissions array
		for (const perm of permissions) {
			if (!this.permissions.some(p => p.name === perm)) {
				this.addPermission(perm);
			}
		}

		this.addRole(this.currentRole, permissions);
		this.currentRole = undefined;
		this.buildingRole = false;
		return this;
	}

	/**
	 * Fluent API: Set role hierarchy
	 */
	hierarchy(hierarchy: Record<string, string[]>): this {
		this.roleHierarchy = { ...this.roleHierarchy, ...hierarchy };
		return this;
	}

	/**
	 * Build and return RBAC instance
	 */
	build(): RBAC {
		// Validate state before building
		if (this.buildingRole) {
			throw new Error('Cannot build while a role is being defined. Call grant() to complete the role.');
		}

		const config: RBACConfigSchema = {
			permissions: this.permissions,
			roles: this.roles,
			options: {
				autoBitAssignment: this.autoBitAssignment,
				startBitValue: this.startBitValue,
				strictMode: this.strictMode,
			},
		};

		const rbac = new RBAC({
			config,
			useBitSystem: this.useBit,
			strictMode: this.strictMode,
			enableWildcards: this.wildcardsEnabled,
			auditLogger: this.auditLogger,
		});

		// Apply hierarchy if defined
		this.applyHierarchy(rbac);

		return rbac;
	}

	/**
	 * Apply role hierarchy to the RBAC instance
	 */
	private applyHierarchy(rbac: RBAC): void {
		if (Object.keys(this.roleHierarchy).length === 0) return;

		for (const [parent, children] of Object.entries(this.roleHierarchy)) {
			const parentLevel = rbac.getRoleHierarchy().getRoleLevel(parent) || 1;
			children.forEach(child => {
				rbac.getRoleHierarchy().setRoleLevel(child, parentLevel + 1);
			});
		}
	}

	/**
	 * Reset builder to initial state
	 */
	reset(): this {
		this.permissions = [];
		this.roles = [];
		this.useBit = true;
		this.startBitValue = 1;
		this.strictMode = false;
		this.autoBitAssignment = true;
		return this;
	}

	/**
	 * Get current configuration (without building)
	 */
	getConfig(): RBACConfigSchema {
		return {
			permissions: this.permissions,
			roles: this.roles,
			options: {
				autoBitAssignment: this.autoBitAssignment,
				startBitValue: this.startBitValue,
				strictMode: this.strictMode,
			},
		};
	}
}
