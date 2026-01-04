/**
 * Type guard utilities for RBAC types
 */

import type { RBACUser } from '../types/user.types';
import type { AuditEvent } from '../types/audit.types';

/**
 * Type guard for RBACUser
 */
export function isRBACUser(obj: unknown): obj is RBACUser {
	if (typeof obj !== 'object' || obj === null) return false;

	const user = obj as Record<string, unknown>;

	return (
		typeof user.id === 'string' &&
		Array.isArray(user.roles) &&
		user.roles.every((role): role is string => typeof role === 'string')
	);
}

/**
 * Type guard for AuditEvent
 */
export function isAuditEvent(obj: unknown): obj is AuditEvent {
	if (typeof obj !== 'object' || obj === null) return false;

	const event = obj as Record<string, unknown>;

	return (
		typeof event.type === 'string' &&
		typeof event.userId === 'string' &&
		typeof event.permission === 'string' &&
		typeof event.allowed === 'boolean' &&
		typeof event.timestamp === 'number'
	);
}