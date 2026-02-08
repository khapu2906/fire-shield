import type { RBACUser, RBACContext, AuthorizationResult } from '../index';

/**
 * Common RBAC Interface
 * 
 * This interface defines contract that both RBAC and RBACAggregator must implement.
 * This allows using RBACAggregator anywhere RBAC is expected (polymorphism).
 * 
 * Example usage:
 * ```typescript
 * function checkAccess(rbac: IRBAC, user: RBACUser, permission: string): boolean {
 *   return rbac.hasPermission(user, permission);
 * }
 * 
 * // Works with both RBAC and RBACAggregator
 * checkAccess(new RBAC(), user, 'posts:create');
 * checkAccess(RBACAggregator.create(), user, 'posts:create');
 * ```
 */
export interface IRBAC {
  /**
   * Check if user has permission
   */
  hasPermission(user: RBACUser, permission: string, context?: RBACContext): boolean;

  /**
   * Check if user has any of the permissions (OR logic)
   */
  hasAnyPermission(user: RBACUser, permissions: string[], context?: RBACContext): boolean;

  /**
   * Check if user has all permissions (AND logic)
   */
  hasAllPermissions(user: RBACUser, permissions: string[], context?: RBACContext): boolean;

  /**
   * Authorize a user for a specific permission
   */
  authorize(user: RBACUser, permission: string, context?: RBACContext): AuthorizationResult;

  /**
   * Get all registered permissions
   */
  getPermissions(): string[];

  /**
   * Get all registered roles
   */
  getAllRoles(): string[];

  /**
   * Get all registered roles (alias for IRBAC compatibility)
   */
  getRoles(): string[];

  /**
   * Get permissions for a specific role
   */
  getRolePermissions(roleName: string): string[];

  /**
   * Create a new role
   */
  createRole(roleName: string, permissions: string[]): void;

  /**
   * Add permission to a role
   */
  addPermissionToRole(roleName: string, permission: string): void;

  /**
   * Grant permission to a role
   */
  grantPermission(roleName: string, permission: string): void;

  /**
   * Revoke permission from a role
   */
  revokePermission(roleName: string, permission: string): void;

  /**
   * Get permissions for a user
   */
  getUserPermissions(user: RBACUser): string[];

  /**
   * Deny permission for a user
   */
  denyPermission(userId: string, permission: string): void;

  /**
   * Remove denied permission for a user
   */
  allowPermission(userId: string, permission: string): void;

  /**
   * Get denied permissions for a user
   */
  getDeniedPermissions(userId: string): string[];

  /**
   * Register a new permission
   * Note: Returns bit value for RBAC, void for RBACAggregator
   */
  registerPermission?(permissionName: string, manualBit?: number): number | void;

  /**
   * Serialize RBAC state
   * Note: Not available in all implementations
   */
  serialize?(): unknown;

  /**
   * Deserialize RBAC state
   * Note: Not available in all implementations
   */
  deserialize?(state: unknown): void;
}
