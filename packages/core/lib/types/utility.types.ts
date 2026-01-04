/**
 * Utility types for RBAC
 */

/**
 * Add metadata to any type
 */
export type WithMetadata<T> = T & {
	metadata?: Record<string, unknown>;
};

/**
 * Permission check types enum
 */
export const enum PermissionCheckType {
	PERMISSION_CHECK = 'permission_check',
	AUTHORIZATION = 'authorization',
	ROLE_CHECK = 'role_check'
}

/**
 * Permission mask type alias
 */
export type PermissionMask = number;

/**
 * Utility type for extracting permission resource and action
 */
export type PermissionParts = {
	resource: string;
	action: string;
};

/**
 * Utility type for audit logger options
 */
export type AuditLoggerOptions = {
	maxBufferSize?: number;
	flushIntervalMs?: number;
};