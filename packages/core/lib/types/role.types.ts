/**
 * Role related types
 */

import type { Role } from './user.types';

/**
 * Role hierarchy level
 */
export type RoleLevel = number;

/**
 * Role hierarchy state
 */
export interface RoleHierarchyState {
	/** Role name to level mapping */
	levels: Record<string, number>;

	/** Default level for roles without explicit level */
	defaultLevel: number;
}

/**
 * Role configuration interface
 */
export interface RoleConfig {
	name: Role;
	permissions: string[];
	level?: RoleLevel;
	description?: string;
	metadata?: Record<string, any>;
}
