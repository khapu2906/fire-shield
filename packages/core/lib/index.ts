import type { UserRole, PermissionMask } from './types/user.types';
import { BitPermissionManager } from './core/bit-permission-manager';
import { RoleHierarchy } from './core/role-hierarchy';
import type { RBACConfigSchema, PresetConfig, RBACSystemState } from './types/config.types';
import type { AuditLogger, AuditEvent } from './types/audit.types';
import { WildcardMatcher } from './utils/wildcard-matcher';

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

/**
 * Permission class for managing individual permissions
 */
export class PermissionManager {
  private permissions: Set<string> = new Set();

  constructor(permissions: string[] = []) {
    permissions.forEach(perm => this.permissions.add(perm));
  }

  /**
   * Add a permission
   */
  add(permission: string): void {
    this.permissions.add(permission);
  }

  /**
   * Remove a permission
   */
  remove(permission: string): void {
    this.permissions.delete(permission);
  }

  /**
   * Check if permission exists
   */
  has(permission: string): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Check if any of the permissions exist
   */
  hasAny(permissions: string[]): boolean {
    return permissions.some(perm => this.has(perm));
  }

  /**
   * Check if all permissions exist
   */
  hasAll(permissions: string[]): boolean {
    return permissions.every(perm => this.has(perm));
  }

  /**
   * Get all permissions
   */
  getAll(): string[] {
    return Array.from(this.permissions);
  }

  /**
   * Clear all permissions
   */
  clear(): void {
    this.permissions.clear();
  }
}

/**
 * Role class for managing roles and their permissions
 * Generic container with no hardcoded defaults
 */
export class RoleManager {
  private roles: Map<string, PermissionManager> = new Map();

  constructor(initialRoles?: Record<string, string[]>) {
    // Optionally initialize with roles from config
    if (initialRoles) {
      for (const [roleName, permissions] of Object.entries(initialRoles)) {
        this.roles.set(roleName, new PermissionManager(permissions));
      }
    }
  }

  /**
   * Create a new role with permissions
   */
  createRole(roleName: string, permissions: string[] = []): void {
    this.roles.set(roleName, new PermissionManager(permissions));
  }

  /**
   * Delete a role
   */
  deleteRole(roleName: string): void {
    this.roles.delete(roleName);
  }

  /**
   * Add permission to a role
   */
  addPermissionToRole(roleName: string, permission: string): void {
    const role = this.roles.get(roleName);
    if (role) {
      role.add(permission);
    }
  }

  /**
   * Remove permission from a role
   */
  removePermissionFromRole(roleName: string, permission: string): void {
    const role = this.roles.get(roleName);
    if (role) {
      role.remove(permission);
    }
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(roleName: string): string[] {
    const role = this.roles.get(roleName);
    return role ? role.getAll() : [];
  }

  /**
   * Check if role exists
   */
  hasRole(roleName: string): boolean {
    return this.roles.has(roleName);
  }

  /**
   * Get all roles
   */
  getAllRoles(): string[] {
    return Array.from(this.roles.keys());
  }
}

/**
 * Main RBAC class for managing authorization
 * Pure logic with no storage dependencies
 */
export class RBAC {
  private roleManager?: RoleManager;
  private customPermissions?: PermissionManager;
  private bitPermissionManager?: BitPermissionManager;
  private roleHierarchy: RoleHierarchy;
  private useBitSystem: boolean;
  private auditLogger?: AuditLogger;
  private enableWildcards: boolean;
  private denyList: Map<string, Set<string>>; // userId -> denied permissions

  constructor(options: {
    // Config-based initialization
    config?: RBACConfigSchema;
    preset?: PresetConfig;

    // System options
    useBitSystem?: boolean;
    strictMode?: boolean;

    // Advanced features
    auditLogger?: AuditLogger;
    enableWildcards?: boolean;
  } = {}) {
    this.useBitSystem = options.useBitSystem ?? true; // Default to bit system
    this.roleHierarchy = new RoleHierarchy();
    this.auditLogger = options.auditLogger;
    this.enableWildcards = options.enableWildcards ?? true; // Default to enabled
    this.denyList = new Map();

    // Initialize bit or legacy system
    if (this.useBitSystem) {
      const bitOptions = options.config?.options ?? options.preset?.options;
      this.bitPermissionManager = new BitPermissionManager({
        startBitValue: bitOptions?.startBitValue,
        strictMode: options.strictMode ?? bitOptions?.strictMode,
      });
    } else {
      this.roleManager = new RoleManager();
      this.customPermissions = new PermissionManager();
    }

    // Load config if provided
    if (options.config || options.preset) {
      const config = options.config || options.preset;
      if (config) {
        this.loadFromConfig(config);
      }
    }
  }

  /**
   * Load configuration (permissions, roles, hierarchy)
   */
  private loadFromConfig(config: RBACConfigSchema): void {
    // Register permissions
    for (const permConfig of config.permissions) {
      if (this.useBitSystem && this.bitPermissionManager) {
        // Register with manual bit if provided
        this.bitPermissionManager.registerPermission(permConfig.name, permConfig.bit);
      }
    }

    // Register roles
    for (const roleConfig of config.roles) {
      // Register role with permissions
      if (this.useBitSystem && this.bitPermissionManager) {
        this.bitPermissionManager.registerRole(roleConfig.name, roleConfig.permissions);
      } else if (this.roleManager) {
        this.roleManager.createRole(roleConfig.name, roleConfig.permissions);
      }

      // Set role level in hierarchy
      if (roleConfig.level !== undefined) {
        this.roleHierarchy.setRoleLevel(roleConfig.name, roleConfig.level);
      }
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: RBACUser, permission: string): boolean {
    let allowed = false;
    let reason: string | undefined;

    try {
      // Check deny list first (explicit deny takes precedence)
      if (this.isPermissionDenied(user.id, permission)) {
        reason = `Permission explicitly denied: ${permission}`;
        return false;
      }

      // Use bit-based system if enabled
      if (this.useBitSystem) {
        if (!this.bitPermissionManager) {
          reason = 'Bit permission manager not initialized';
          return false;
        }

        // Check direct permission mask first
        if (user.permissionMask !== undefined) {
          allowed = this.bitPermissionManager.hasPermission(user.permissionMask, permission);
          if (allowed) return true;
        }

        // Check direct permissions array (with wildcard support)
        if (user.permissions) {
          allowed = this.checkPermissionsWithWildcard(user.permissions, permission);
          if (allowed) return true;
        }

        // Check role-based permissions (with wildcard support)
        for (const role of user.roles) {
          const rolePermissions = this.bitPermissionManager.getRolePermissions(role);

          // Check exact match first
          const roleMask = this.bitPermissionManager.getRoleMask(role);
          if (roleMask !== undefined && this.bitPermissionManager.hasPermission(roleMask, permission)) {
            allowed = true;
            return true;
          }

          // Check wildcard permissions
          if (this.enableWildcards && this.checkPermissionsWithWildcard(rolePermissions, permission)) {
            allowed = true;
            return true;
          }
        }

        reason = `User lacks permission: ${permission}`;
        return false;
      }

      // Legacy system
      // Check direct permissions first (with wildcard support)
      if (user.permissions) {
        allowed = this.checkPermissionsWithWildcard(user.permissions, permission);
        if (allowed) return true;
      }

      // Check role-based permissions (with wildcard support)
      for (const role of user.roles) {
        const rolePermissions = this.roleManager?.getRolePermissions(role) ?? [];
        if (this.checkPermissionsWithWildcard(rolePermissions, permission)) {
          allowed = true;
          return true;
        }
      }

      reason = `User lacks permission: ${permission}`;
      return false;
    } finally {
      // Audit log
      this.logAudit({
        type: 'permission_check',
        userId: user.id,
        permission,
        allowed,
        reason: allowed ? undefined : reason,
        context: {
          roles: user.roles,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check if permissions array contains permission (with wildcard support)
   */
  private checkPermissionsWithWildcard(permissions: string[], permission: string): boolean {
    // Exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Wildcard match (if enabled)
    if (this.enableWildcards) {
      return WildcardMatcher.matchesAny(permission, permissions);
    }

    return false;
  }

  /**
   * Check if permission is explicitly denied for user
   */
  private isPermissionDenied(userId: string, permission: string): boolean {
    const deniedPermissions = this.denyList.get(userId);
    if (!deniedPermissions) return false;

    // Check exact match
    if (deniedPermissions.has(permission)) {
      return true;
    }

    // Check wildcard match
    if (this.enableWildcards) {
      const deniedPatterns = Array.from(deniedPermissions);
      return WildcardMatcher.matchesAny(permission, deniedPatterns);
    }

    return false;
  }

  /**
   * Log audit event
   */
  private logAudit(event: AuditEvent): void {
    if (this.auditLogger) {
      try {
        this.auditLogger.log(event);
      } catch (error) {
        // Don't throw - audit logging should not break main flow
        console.error('Audit logging error:', error);
      }
    }
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(user: RBACUser, permissions: string[]): boolean {
    return permissions.some(perm => this.hasPermission(user, perm));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(user: RBACUser, permissions: string[]): boolean {
    return permissions.every(perm => this.hasPermission(user, perm));
  }

  /**
   * Authorize a user for a specific action on a resource
   */
  authorize(user: RBACUser, permission: string): AuthorizationResult {
    const allowed = this.hasPermission(user, permission);

    return {
      allowed,
      reason: allowed ? undefined : `User lacks permission: ${permission}`,
      user
    };
  }

  /**
   * Authorize with context (resource and action)
   */
  authorizeWithContext(context: RBACContext, requiredPermission?: string): AuthorizationResult {
    if (!context.user) {
      return {
        allowed: false,
        reason: 'No user provided in context'
      };
    }

    if (!requiredPermission && (!context.resource || !context.action)) {
      return {
        allowed: false,
        reason: 'Either permission or resource+action must be provided'
      };
    }

    const permission = requiredPermission || `${context.resource}:${context.action}`;

    return this.authorize(context.user, permission);
  }

  /**
   * Create a new role
   */
  createRole(roleName: string, permissions: string[] = []): void {
    if (this.useBitSystem) {
      // Register any permissions that don't exist yet
      for (const permission of permissions) {
        if (!this.bitPermissionManager?.getPermissionBit(permission)) {
          this.bitPermissionManager?.registerPermission(permission);
        }
      }
      this.bitPermissionManager?.registerRole(roleName, permissions);
    } else {
      this.roleManager?.createRole(roleName, permissions);
    }
  }

  /**
   * Add permission to role
   */
  addPermissionToRole(roleName: string, permission: string): void {
    if (this.useBitSystem) {
      // Register permission if it doesn't exist yet
      if (!this.bitPermissionManager?.getPermissionBit(permission)) {
        this.bitPermissionManager?.registerPermission(permission);
      }

      const currentPermissions = this.bitPermissionManager?.getRolePermissions(roleName) ?? [];
      const newPermissions = [...currentPermissions, permission];
      this.bitPermissionManager?.registerRole(roleName, newPermissions);
    } else {
      this.roleManager?.addPermissionToRole(roleName, permission);
    }
  }

  /**
   * Register a new permission (bit-based system only)
   */
  registerPermission(permissionName: string, manualBit?: number): number {
    if (!this.useBitSystem || !this.bitPermissionManager) {
      throw new Error('registerPermission is only available in bit-based mode');
    }
    return this.bitPermissionManager.registerPermission(permissionName, manualBit);
  }

  /**
   * Get bit permission manager
   */
  getBitPermissionManager(): BitPermissionManager | undefined {
    return this.bitPermissionManager;
  }

  /**
   * Get role manager for advanced operations
   */
  getRoleManager(): RoleManager | undefined {
    return this.roleManager;
  }

  /**
   * Get permission manager for custom permissions
   */
  getPermissionManager(): PermissionManager | undefined {
    return this.customPermissions;
  }

  /**
   * Deny a permission for a specific user
   * Explicit denies take precedence over allows
   */
  denyPermission(userId: string, permission: string): void {
    if (!this.denyList.has(userId)) {
      this.denyList.set(userId, new Set());
    }
    this.denyList.get(userId)!.add(permission);
  }

  /**
   * Remove a denied permission for a user
   */
  allowPermission(userId: string, permission: string): void {
    const deniedPermissions = this.denyList.get(userId);
    if (deniedPermissions) {
      deniedPermissions.delete(permission);
      if (deniedPermissions.size === 0) {
        this.denyList.delete(userId);
      }
    }
  }

  /**
   * Get all denied permissions for a user
   */
  getDeniedPermissions(userId: string): string[] {
    const deniedPermissions = this.denyList.get(userId);
    return deniedPermissions ? Array.from(deniedPermissions) : [];
  }

  /**
   * Clear all denied permissions for a user
   */
  clearDeniedPermissions(userId: string): void {
    this.denyList.delete(userId);
  }

  /**
   * Check if role A can perform actions of role B (role hierarchy)
   * Uses dynamic hierarchy system based on levels
   */
  canActAsRole(currentRole: string, targetRole: string): boolean {
    // First check hierarchy levels
    if (this.roleHierarchy.hasRole(currentRole) && this.roleHierarchy.hasRole(targetRole)) {
      return this.roleHierarchy.canActAs(currentRole, targetRole);
    }

    // Fallback to permission comparison
    if (this.useBitSystem) {
      const currentMask = this.bitPermissionManager?.getRoleMask(currentRole);
      const targetMask = this.bitPermissionManager?.getRoleMask(targetRole);

      if (!currentMask || !targetMask) return false;

      // A role can act as another if it has all the permissions of the target role
      return this.bitPermissionManager?.includesPermissions(currentMask, targetMask) ?? false;
    }

    // Legacy system fallback
    const currentPerms = this.roleManager?.getRolePermissions(currentRole) ?? [];
    const targetPerms = this.roleManager?.getRolePermissions(targetRole) ?? [];
    return targetPerms.every(perm => currentPerms.includes(perm));
  }

  /**
   * Get role hierarchy manager
   */
  getRoleHierarchy(): RoleHierarchy {
    return this.roleHierarchy;
  }

  /**
   * Serialize complete RBAC state for persistence
   * User can save this to DB, file, localStorage, etc.
   */
  serialize(): RBACSystemState {
    return {
      bitPermissions: this.bitPermissionManager?.serialize() || {
        permissions: {},
        roles: {},
        nextBitValue: 1,
        timestamp: Date.now(),
        version: '1.0.0',
      },
      hierarchy: this.roleHierarchy.serialize(),
      config: { permissions: [], roles: [] }, // Config was already loaded
      timestamp: Date.now(),
    };
  }

  /**
   * Deserialize and restore RBAC state from persistence
   * User loads state from their storage and passes it here
   */
  deserialize(state: RBACSystemState): void {
    // Load bit permission state
    if (this.useBitSystem && this.bitPermissionManager && state.bitPermissions) {
      this.bitPermissionManager.deserialize(state.bitPermissions);
    }

    // Load hierarchy state
    if (state.hierarchy) {
      this.roleHierarchy.deserialize(state.hierarchy);
    }
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
    const state = JSON.parse(json) as RBACSystemState;
    this.deserialize(state);
  }
}

// Export core classes
export { BitPermissionManager } from './core/bit-permission-manager';
export { RoleHierarchy } from './core/role-hierarchy';
export { RBACBuilder } from './builders/rbac-builder';
export { WildcardMatcher } from './utils/wildcard-matcher';

// Export types
export type { UserRole, PermissionMask } from './types/user.types';
export type {
  RBACConfigSchema,
  RBACConfigOptions,
  PermissionConfig,
  PresetConfig,
  RBACSystemState,
} from './types/config.types';
export type { RoleConfig, RoleHierarchyState } from './types/role.types';
export type { BitPermissionState } from './types/permission.types';
export type {
  AuditEvent,
  AuditLogger,
} from './types/audit.types';
export {
  ConsoleAuditLogger,
  BufferedAuditLogger,
  MultiAuditLogger,
} from './utils/audit-log';

// Export optional presets
export { defaultPreset } from './presets/default.preset';
