/**
 * Configuration related types
 */

import type { RoleConfig } from './role.types';
import type { BitPermissionState } from './permission.types';
import type { RoleHierarchyState } from './role.types';

/**
 * Generic permission configuration
 */
export interface PermissionConfig {
	/** Unique permission name (e.g., "user:read", "admin:manage") */
	name: string;

	/** Optional manual bit assignment for persistence (1, 2, 4, 8, etc.) */
	bit?: number;

	/** Resource this permission operates on (e.g., "user", "post") */
	resource?: string;

	/** Action performed on resource (e.g., "read", "write", "delete") */
	action?: string;

	/** Human-readable description */
	description?: string;

	/** Additional metadata */
	metadata?: Record<string, any>;
}

/**
 * RBAC system configuration options
 */
export interface RBACConfigOptions {
	/** Enable automatic bit assignment for permissions (default: true) */
	autoBitAssignment?: boolean;

	/** Starting bit value for auto assignment (default: 1) */
	startBitValue?: number;

	/** Strict mode: throw errors on invalid operations (default: false) */
	strictMode?: boolean;
}

/**
 * Complete RBAC configuration schema
 */
export interface RBACConfigSchema {
	/** Permission definitions */
	permissions: PermissionConfig[];

	/** Role definitions */
	roles: RoleConfig[];

	/** Configuration options */
	options?: RBACConfigOptions;
}

/**
 * Complete RBAC system state for persistence
 */
export interface RBACSystemState {
	/** Bit permission state */
	bitPermissions: BitPermissionState;

	/** Role hierarchy state */
	hierarchy: RoleHierarchyState;

	/** Configuration that generated this state */
	config: RBACConfigSchema;

	/** Timestamp */
	timestamp: number;
}

/**
 * Preset configuration (optional pre-configured RBAC setup)
 */
export interface PresetConfig extends RBACConfigSchema {
	/** Preset name */
	name: string;

	/** Preset version */
	version: string;

	/** Description */
	description?: string;
}
