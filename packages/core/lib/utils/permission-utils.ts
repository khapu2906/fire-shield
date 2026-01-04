/**
 * Utility functions for permission operations
 */

import { WildcardMatcher } from './wildcard-matcher';
import type { RBAC } from '../index';

/**
 * Check if permission matches pattern (including wildcards)
 */
export function matchPermission(permission: string, pattern: string): boolean {
	return WildcardMatcher.matches(permission, pattern);
}

/**
 * Parse permission string into resource and action parts
 */
export function parsePermission(permission: string): { resource: string; action: string } {
	const lastColonIndex = permission.lastIndexOf(':');

	if (lastColonIndex === -1) {
		return { resource: permission, action: '*' };
	}

	const resource = permission.slice(0, lastColonIndex);
	const action = permission.slice(lastColonIndex + 1);

	return { resource, action };
}

/**
 * Check if a user has a specific permission (convenience function)
 */
export function hasPermission(user: { id: string; roles: string[] }, permission: string, rbac: RBAC): boolean {
	return rbac.hasPermission(user, permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: { id: string; roles: string[] }, permissions: string[], rbac: RBAC): boolean {
	return rbac.hasAnyPermission(user, permissions);
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: { id: string; roles: string[] }, permissions: string[], rbac: RBAC): boolean {
	return rbac.hasAllPermissions(user, permissions);
}

/**
 * RBAC Error class for consistent error handling
 */
export class RBACError extends Error {
	public readonly name = 'RBACError';

	constructor(message: string, public readonly code: string) {
		super(message);
	}
}