/**
 * User and role related types
 */

/**
 * User role type - completely generic (any string)
 * No hardcoded roles for maximum flexibility
 */
export type UserRole = string;

/**
 * Role type (alias for clarity)
 */
export type Role = string;

/**
 * Permission mask type (combination of permission bits)
 */
export type PermissionMask = number;

/**
 * User interface for RBAC context
 */
export interface RBACUser {
	id: string;
	roles: UserRole[];
	permissions?: string[];
	permissionMask?: PermissionMask; // Bit-based permission mask
}

/**
 * RBAC Context for authorization checks
 */
export interface RBACContext {
	user?: RBACUser;
	resource?: string;
	action?: string;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
	allowed: boolean;
	reason?: string;
	user?: RBACUser;
}
