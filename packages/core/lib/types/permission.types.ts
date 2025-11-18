/**
 * Permission related types
 */

/**
 * Permission string type
 */
export type PermissionString = string;

/**
 * Permission bit value type
 */
export type PermissionBit = number;

/**
 * Resource type for domain-specific permissions
 */
export type Resource = string;

/**
 * Action type for operations on resources
 */
export type Action = string;

/**
 * Permission pattern: resource:action
 */
export type PermissionPattern = `${Resource}:${Action}`;

/**
 * Bit permission state for persistence
 */
export interface BitPermissionState {
	/** Permission name to bit value mapping */
	permissions: Record<string, number>;

	/** Role name to permission mask mapping */
	roles: Record<string, number>;

	/** Next available bit value */
	nextBitValue: number;

	/** Timestamp of last update */
	timestamp: number;

	/** Version for schema migrations */
	version: string;
}
