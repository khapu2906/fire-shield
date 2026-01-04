import type { UserRole, PermissionMask } from './types/user.types';
import { BitPermissionManager } from './core/bit-permission-manager';
import { RoleHierarchy } from './core/role-hierarchy';
import type { RBACConfigSchema, PresetConfig, RBACSystemState } from './types/config.types';
import type { AuditLogger, AuditEvent } from './types/audit.types';
import { WildcardMatcher } from './utils/wildcard-matcher';
import { PermissionCache, type PermissionCacheOptions } from './utils/permission-cache';
import { MemoryOptimizer } from './utils/memory-optimizer';
import { PluginManager, type RBACPlugin } from './plugins/rbac-plugin';

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
  private cache?: PermissionCache; // Permission caching layer
  private cacheEnabled: boolean;

  // Lazy role evaluation
  private lazyRoles: boolean;
  private pendingRoles: Map<string, { permissions: string[]; level?: number }>; // Roles not yet evaluated
  private evaluatedRoles: Set<string>; // Roles that have been loaded

  // Memory optimization
  private memoryOptimizer?: MemoryOptimizer;
  private optimizeMemory: boolean;

  // Plugin system (v3.0)
  private pluginManager: PluginManager;

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

    // Performance features (v2.2)
    enableCache?: boolean;
    cacheOptions?: PermissionCacheOptions;
    lazyRoles?: boolean;
    optimizeMemory?: boolean;
  } = {}) {
    this.useBitSystem = options.useBitSystem ?? true; // Default to bit system
    this.roleHierarchy = new RoleHierarchy();
    this.auditLogger = options.auditLogger;
    this.enableWildcards = options.enableWildcards ?? true; // Default to enabled
    this.denyList = new Map();

    // Initialize cache if enabled 
    this.cacheEnabled = options.enableCache ?? false;
    if (this.cacheEnabled) {
      this.cache = new PermissionCache(options.cacheOptions);
    }

    // Initialize lazy role evaluation
    this.lazyRoles = options.lazyRoles ?? false;
    this.pendingRoles = new Map();
    this.evaluatedRoles = new Set();

    // Initialize memory optimizer
    this.optimizeMemory = options.optimizeMemory ?? false;
    if (this.optimizeMemory) {
      this.memoryOptimizer = new MemoryOptimizer();
    }

    // Initialize plugin system
    this.pluginManager = new PluginManager(this);

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
      // Intern permission strings to reduce memory
      const permName = this.optimizeMemory && this.memoryOptimizer
        ? this.memoryOptimizer.internString(permConfig.name)
        : permConfig.name;

      if (this.useBitSystem && this.bitPermissionManager) {
        // Register with manual bit if provided
        this.bitPermissionManager.registerPermission(permName, permConfig.bit);
      }
    }

    // Register roles
    for (const roleConfig of config.roles) {
      //Intern role name and permissions
      const roleName = this.optimizeMemory && this.memoryOptimizer
        ? this.memoryOptimizer.internString(roleConfig.name)
        : roleConfig.name;

      const permissions = this.optimizeMemory && this.memoryOptimizer
        ? this.memoryOptimizer.internStrings(roleConfig.permissions)
        : roleConfig.permissions;

      if (this.lazyRoles) {
        // Store role config for lazy evaluation
        this.pendingRoles.set(roleName, {
          permissions,
          level: roleConfig.level
        });
      } else {
        // Eager loading: Register role immediately
        if (this.useBitSystem && this.bitPermissionManager) {
          this.bitPermissionManager.registerRole(roleName, permissions);
        } else if (this.roleManager) {
          this.roleManager.createRole(roleName, permissions);
        }

        // Set role level in hierarchy
        if (roleConfig.level !== undefined) {
          this.roleHierarchy.setRoleLevel(roleName, roleConfig.level);
        }
      }
    }
  }

  /**
   * Evaluate a lazy role on first access
   */
  private evaluateLazyRole(roleName: string): void {
    // Check if role is already evaluated
    if (this.evaluatedRoles.has(roleName)) {
      return;
    }

    // Get pending role config
    const roleConfig = this.pendingRoles.get(roleName);
    if (!roleConfig) {
      // Role doesn't exist in pending or already registered
      return;
    }

    // Register the role
    if (this.useBitSystem && this.bitPermissionManager) {
      this.bitPermissionManager.registerRole(roleName, roleConfig.permissions);
    } else if (this.roleManager) {
      this.roleManager.createRole(roleName, roleConfig.permissions);
    }

    // Set role level in hierarchy
    if (roleConfig.level !== undefined) {
      this.roleHierarchy.setRoleLevel(roleName, roleConfig.level);
    }

    // Mark as evaluated and remove from pending
    this.evaluatedRoles.add(roleName);
    this.pendingRoles.delete(roleName);
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: RBACUser, permission: string): boolean {
    // Evaluate lazy roles on first access
    if (this.lazyRoles) {
      for (const role of user.roles) {
        if (this.pendingRoles.has(role)) {
          this.evaluateLazyRole(role);
        }
      }
    }

    // Check cache first
    if (this.cacheEnabled && this.cache) {
      const cached = this.cache.get(user.id, permission);
      if (cached !== undefined) {
        return cached;
      }
    }

    let allowed = false;
    let reason: string | undefined;

    try {
      // Check deny list first (explicit deny takes precedence)
      if (this.isPermissionDenied(user.id, permission)) {
        reason = `Permission explicitly denied: ${permission}`;
        // Cache the deny result
        if (this.cacheEnabled && this.cache) {
          this.cache.set(user.id, permission, false);
        }
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
          if (allowed) {
            if (this.cacheEnabled && this.cache) {
              this.cache.set(user.id, permission, true);
            }
            return true;
          }
        }

        // Check direct permissions array (with wildcard support)
        if (user.permissions) {
          allowed = this.checkPermissionsWithWildcard(user.permissions, permission);
          if (allowed) {
            if (this.cacheEnabled && this.cache) {
              this.cache.set(user.id, permission, true);
            }
            return true;
          }
        }

        // Check role-based permissions (with wildcard support)
        for (const role of user.roles) {
          const rolePermissions = this.bitPermissionManager.getRolePermissions(role);

          // Check exact match first
          const roleMask = this.bitPermissionManager.getRoleMask(role);
          if (roleMask !== undefined && this.bitPermissionManager.hasPermission(roleMask, permission)) {
            allowed = true;
            if (this.cacheEnabled && this.cache) {
              this.cache.set(user.id, permission, true);
            }
            return true;
          }

          // Check wildcard permissions
          if (this.enableWildcards && this.checkPermissionsWithWildcard(rolePermissions, permission)) {
            allowed = true;
            if (this.cacheEnabled && this.cache) {
              this.cache.set(user.id, permission, true);
            }
            return true;
          }
        }

        reason = `User lacks permission: ${permission}`;
        if (this.cacheEnabled && this.cache) {
          this.cache.set(user.id, permission, false);
        }
        return false;
      }

      // Legacy system
      // Check direct permissions first (with wildcard support)
      if (user.permissions) {
        allowed = this.checkPermissionsWithWildcard(user.permissions, permission);
        if (allowed) {
          if (this.cacheEnabled && this.cache) {
            this.cache.set(user.id, permission, true);
          }
          return true;
        }
      }

      // Check role-based permissions (with wildcard support)
      for (const role of user.roles) {
        const rolePermissions = this.roleManager?.getRolePermissions(role) ?? [];
        if (this.checkPermissionsWithWildcard(rolePermissions, permission)) {
          allowed = true;
          if (this.cacheEnabled && this.cache) {
            this.cache.set(user.id, permission, true);
          }
          return true;
        }
      }

      reason = `User lacks permission: ${permission}`;
      if (this.cacheEnabled && this.cache) {
        this.cache.set(user.id, permission, false);
      }
      return false;
    } finally {
      // Trigger plugin hooks (v3.0) - fire and forget
      this.pluginManager.triggerPermissionCheck({
        type: 'permission_check',
        userId: user.id,
        permission,
        allowed,
        reason: allowed ? undefined : reason,
        context: {
          roles: user.roles,
        },
        timestamp: Date.now(),
      }).catch(err => {
        // Don't let plugin errors break permission checks
        console.error('Plugin error:', err);
      });

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

    // Trigger plugin hooks (v3.0)
    this.pluginManager.triggerRoleAdded(roleName, permissions).catch(err => {
      // Don't let plugin errors break role creation
      console.error('Plugin error in createRole:', err);
    });
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
    const bit = this.bitPermissionManager.registerPermission(permissionName, manualBit);

    // Trigger plugin hooks (v3.0)
    this.pluginManager.triggerPermissionRegistered(permissionName, bit).catch(err => {
      // Don't let plugin errors break permission registration
      console.error('Plugin error in registerPermission:', err);
    });

    return bit;
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
   * Get all registered roles
   */
  getAllRoles(): string[] {
    if (this.useBitSystem && this.bitPermissionManager) {
      return this.bitPermissionManager.getAllRoles();
    } else if (this.roleManager) {
      return Array.from(this.roleManager['roles'].keys()); // Access private roles map
    }
    return [];
  }

  /**
   * Get permissions for a specific role
   */
  getRolePermissions(roleName: string): string[] {
    if (this.useBitSystem && this.bitPermissionManager) {
      return this.bitPermissionManager.getRolePermissions(roleName);
    } else if (this.roleManager) {
      return this.roleManager.getRolePermissions(roleName);
    }
    return [];
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
        version: '2.2.2',
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

  /**
   * Static method: Create RBAC instance from JSON string
   * @param json JSON string containing PresetConfig
   * @param options Additional RBAC options
   * @returns New RBAC instance
   */
  static fromJSONConfig(json: string, options: {
    useBitSystem?: boolean;
    strictMode?: boolean;
    auditLogger?: AuditLogger;
    enableWildcards?: boolean;
    enableCache?: boolean;
    cacheOptions?: PermissionCacheOptions;
    lazyRoles?: boolean;
    optimizeMemory?: boolean;
  } = {}): RBAC {
    try {
      const config = JSON.parse(json) as PresetConfig;

      // Validate config
      RBAC.validateConfig(config);

      return new RBAC({
        preset: config,
        ...options
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      throw error;
    }
  }


  /**
   * Get list of evaluated role names
   */
  getEvaluatedRoles(): string[] {
    return Array.from(this.evaluatedRoles);
  }

  /**
   * Get list of pending (not yet evaluated) role names
   */
  getPendingRoles(): string[] {
    return Array.from(this.pendingRoles.keys());
  }

  /**
   * Get lazy role evaluation statistics
   */
  getLazyRoleStats() {
    return {
      enabled: this.lazyRoles,
      pending: this.pendingRoles.size,
      evaluated: this.evaluatedRoles.size,
      total: this.pendingRoles.size + this.evaluatedRoles.size
    };
  }

  /**
   * Check if a specific role is pending (not yet evaluated)
   */
  isRolePending(roleName: string): boolean {
    return this.pendingRoles.has(roleName);
  }

  /**
   * Force evaluation of all pending roles
   */
  evaluateAllRoles(): void {
    if (!this.lazyRoles) {
      // If lazy roles is disabled, all roles are already evaluated
      return;
    }

    // Evaluate all pending roles
    const pendingRoleNames = Array.from(this.pendingRoles.keys());
    for (const roleName of pendingRoleNames) {
      this.evaluateLazyRole(roleName);
    }
  }

  /**
   * Get memory optimization statistics
   */
  getMemoryStats() {
    if (!this.memoryOptimizer) {
      return {
        enabled: false,
        stringPoolSize: 0,
        roleMaskCacheSize: 0,
        wildcardPatternCacheSize: 0,
        estimatedMemorySaved: 0
      };
    }

    return {
      enabled: true,
      ...this.memoryOptimizer.getStats()
    };
  }

  /**
   * Get memory optimizer instance (for advanced usage)
   */
  getMemoryOptimizer(): MemoryOptimizer | undefined {
    return this.memoryOptimizer;
  }

  /**
   * Compact memory by cleaning up unused resources
   * Returns number of items removed
   */
  compactMemory(): {
    stringsRemoved: number;
    cacheEntriesRemoved: number;
  } {
    let stringsRemoved = 0;
    let cacheEntriesRemoved = 0;

    // Compact permission cache
    if (this.cache) {
      cacheEntriesRemoved = this.cache.cleanup();
    }

    // Compact string pool if memory optimizer is enabled
    if (this.memoryOptimizer && this.bitPermissionManager) {
      // Collect all active permission and role strings
      const activeStrings = new Set<string>();

      // Add all registered permissions
      const allPermissions = this.bitPermissionManager.getAllPermissions();
      allPermissions.forEach(perm => activeStrings.add(perm));

      // Add all registered roles
      const allRoles = this.bitPermissionManager.getAllRoles();
      for (const role of allRoles) {
        activeStrings.add(role);
        const rolePerms = this.bitPermissionManager.getRolePermissions(role);
        rolePerms.forEach(perm => activeStrings.add(perm));
      }

      stringsRemoved = this.memoryOptimizer.compactStringPool(activeStrings);
    }

    return { stringsRemoved, cacheEntriesRemoved };
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUserCache(userId: string): void {
    if (this.cache) {
      this.cache.invalidate(userId);
    }
  }

  /**
   * Invalidate cache for specific permission across all users
   */
  invalidatePermissionCache(permission: string): void {
    if (this.cache) {
      this.cache.invalidatePermission(permission);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache?.getStats();
  }

  /**
   * Register a plugin
   * @param plugin Plugin instance to register
   */
  async registerPlugin(plugin: RBACPlugin): Promise<void> {
    return this.pluginManager.register(plugin);
  }

  /**
   * Unregister a plugin
   * @param pluginName Name of plugin to unregister
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    return this.pluginManager.unregister(pluginName);
  }

  /**
   * Get a registered plugin
   * @param pluginName Name of plugin
   */
  getPlugin(pluginName: string): RBACPlugin | undefined {
    return this.pluginManager.getPlugin(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): RBACPlugin[] {
    return this.pluginManager.getAllPlugins();
  }

  /**
   * Validate PresetConfig structure
   * @param config Config to validate
   * @throws Error if config is invalid
   */
  static validateConfig(config: PresetConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    // Validate permissions array
    if (!Array.isArray(config.permissions)) {
      throw new Error('Config.permissions must be an array');
    }

    for (const [index, perm] of config.permissions.entries()) {
      if (!perm.name || typeof perm.name !== 'string') {
        throw new Error(`Permission at index ${index} must have a valid 'name' string`);
      }
      if (perm.bit !== undefined && (typeof perm.bit !== 'number' || perm.bit < 0)) {
        throw new Error(`Permission '${perm.name}' has invalid bit value: ${perm.bit}`);
      }
    }

    // Check for duplicate permission names
    const permNames = new Set<string>();
    for (const perm of config.permissions) {
      if (permNames.has(perm.name)) {
        throw new Error(`Duplicate permission name: ${perm.name}`);
      }
      permNames.add(perm.name);
    }

    // Check for duplicate bit values
    const bitValues = new Set<number>();
    for (const perm of config.permissions) {
      if (perm.bit !== undefined) {
        if (bitValues.has(perm.bit)) {
          throw new Error(`Duplicate bit value ${perm.bit} in permission: ${perm.name}`);
        }
        bitValues.add(perm.bit);
      }
    }

    // Validate roles array
    if (!Array.isArray(config.roles)) {
      throw new Error('Config.roles must be an array');
    }

    for (const [index, role] of config.roles.entries()) {
      if (!role.name || typeof role.name !== 'string') {
        throw new Error(`Role at index ${index} must have a valid 'name' string`);
      }
      if (!Array.isArray(role.permissions)) {
        throw new Error(`Role '${role.name}' must have a 'permissions' array`);
      }
      if (role.level !== undefined && (typeof role.level !== 'number' || role.level < 0)) {
        throw new Error(`Role '${role.name}' has invalid level: ${role.level}`);
      }
    }

    // Check for duplicate role names
    const roleNames = new Set<string>();
    for (const role of config.roles) {
      if (roleNames.has(role.name)) {
        throw new Error(`Duplicate role name: ${role.name}`);
      }
      roleNames.add(role.name);
    }

    // Validate that role permissions reference existing permissions
    const validPermissions = new Set(config.permissions.map(p => p.name));
    for (const role of config.roles) {
      for (const permName of role.permissions) {
        // Skip wildcard permissions in validation
        if (permName.includes('*')) continue;

        if (!validPermissions.has(permName)) {
          throw new Error(`Role '${role.name}' references undefined permission: ${permName}`);
        }
      }
    }
  }
}

// Export core classes
export { BitPermissionManager } from './core/bit-permission-manager';
export { RoleHierarchy } from './core/role-hierarchy';
export { RBACBuilder } from './builders/rbac-builder';
export { WildcardMatcher } from './utils/wildcard-matcher';
export { PermissionCache } from './utils/permission-cache';
export { MemoryOptimizer } from './utils/memory-optimizer';

// Export plugin system (v3.0)
export { PluginManager, RBACPlugin } from './plugins/rbac-plugin';

// Export types
export type { UserRole } from './types/user.types';
export type { PermissionMask } from './types/utility.types';
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

// Export utility functions
export {
	matchPermission,
	parsePermission,
	hasPermission,
	hasAnyPermission,
	hasAllPermissions,
	RBACError
} from './utils/permission-utils';

// Export type guards
export { isRBACUser, isAuditEvent } from './utils/type-guards';

// Export utility types
export type { WithMetadata } from './types/utility.types';
export { PermissionCheckType } from './types/utility.types';

// Export audit logger examples
export {
	SecurityMonitorLogger,
	ComplianceLogger,
	AnalyticsLogger,
	RotatingDatabaseLogger,
	AsyncLogger,
	SamplingLogger
} from './utils/audit-log-examples';
