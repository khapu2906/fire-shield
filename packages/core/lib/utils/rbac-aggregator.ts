import { RBAC, type RBACUser, type RBACContext, type AuthorizationResult } from '../index';
import type { IRBAC } from '../types/rbac.interface';

/**
 * Domain identifier for RBAC aggregation
 * Built-in domains: 'users', 'posts', 'admin', 'content', 'settings', etc.
 */
export type RBACDomain = string;

/**
 * RBAC instance factory function
 * Returns a new RBAC instance configured for a specific domain
 */
export type RBACInstanceFactory = () => RBAC;

/**
 * Internal type for factory wrapper that lazily creates RBAC instances
 */
interface FactoryWrapper {
  rbac: () => RBAC;
}

/**
 * Options for creating RBACAggregator
 */
export interface RBACAggregatorOptions {
  /**
   * Map of domain names to RBAC instance factories
   * Example: { users: () => userRBAC, posts: () => postRBAC }
   */
  instances?: Map<RBACDomain, RBAC>;

  /**
   * Default domain to use if not specified in permission checks
   */
  defaultDomain?: RBACDomain;

  /**
   * Cache RBAC instances after creation (lazy loading)
   */
  cache?: boolean;
}

/**
 * Result of aggregated permission check
 * Contains which domain approved to permission and result
 */
export interface AggregatedPermissionResult {
  /**
   * Domain that approved to permission
   * null if no domain approved
   */
  domain: RBACDomain | null;

  /**
   * Whether permission is approved
   */
  allowed: boolean;

  /**
   * Authorization result from: approving domain
   * null if no domain approved
   */
  result: AuthorizationResult | null;

  /**
   * All domains that were checked (for debugging)
   */
  checked: RBACDomain[];
}

/**
 * RBACAggregator - Manage multiple RBAC instances
 * 
 * This utility helps handle: 31 permission limit by allowing you to:
 * - Create multiple RBAC instances for different domains (users, posts, admin, etc.)
 * - Check permissions across all instances with a single unified API
 * - Lazy load RBAC instances (created only when needed)
 * - Type-safe permission checking with context
 * 
 * Example usage:
 * ```typescript
 * const aggregator = RBACAggregator.create({
 *   instances: {
 *     users: () => new RBAC({ permissions: userPermissions }),
 *     posts: () => new RBAC({ permissions: postPermissions }),
 *     admin: () => new RBAC({ permissions: adminPermissions })
 *   }
 * });
 * 
 * // Check permission across all domains
 * const hasPermission = aggregator.hasPermission(user, 'posts:create');
 * 
 * // Check permission in specific domain
 * const hasPostPermission = aggregator.hasPermission(user, 'posts:create', 'posts');
 * ```
 */
export class RBACAggregator implements IRBAC {
  private instances: Map<RBACDomain, RBAC | FactoryWrapper> = new Map();
  private defaultDomain: RBACDomain;
  private cache: boolean;

  private constructor(options: RBACAggregatorOptions = {}) {
    this.instances = new Map(options.instances || []);
    this.defaultDomain = options.defaultDomain || 'default';
    this.cache = options.cache !== false;
  }

  /**
   * Create RBACAggregator with options
   */
  static create(options: RBACAggregatorOptions = {}): RBACAggregator {
    return new RBACAggregator(options);
  }

  /**
   * Add or register: pre-created RBAC instance
   */
  addInstance(domain: RBACDomain, rbac: RBAC): void {
    this.instances.set(domain, rbac);
  }

  /**
   * Add or register: RBAC instance factory
   * The factory is called lazily when needed
   */
  addFactory(domain: RBACDomain, factory: RBACInstanceFactory): void {
    if (!this.cache) {
      // No caching - always create new instance
      const wrapper: FactoryWrapper = {
        get rbac() {
          return () => factory();
        }
      };
      this.instances.set(domain, wrapper);
    } else {
      // With caching - store created instance directly
      const rbac = factory();
      this.instances.set(domain, rbac);
    }
  }

  /**
   * Get RBAC instance for a specific domain
   * Creates instance lazily if factory is registered
   */
  getRBAC(domain: RBACDomain): RBAC | undefined {
    const value = this.instances.get(domain);
    if (!value) {
      return undefined;
    }
    
    if ('rbac' in value) {
      // It's a factory wrapper
      return value.rbac();
    }
    
    return value;
  }

  /**
   * Get all registered RBAC instances
   */
  getAllRBACs(): Map<RBACDomain, RBAC> {
    // Ensure all instances are materialized
    const allRBACs: Map<RBACDomain, RBAC> = new Map();
    
    for (const [domain, value] of this.instances.entries()) {
      if (!value) continue;
      
      if ('rbac' in value) {
        // It's a factory wrapper - materialize it
        try {
          const rbac = value.rbac();
          allRBACs.set(domain, rbac);
        } catch (error) {
          console.error(`[RBACAggregator] Error materializing domain '${domain}':`, error);
        }
      } else {
        // Already an RBAC instance
        allRBACs.set(domain, value);
      }
    }
    
    return allRBACs;
  }

  /**
   * Get all registered domains
   */
  getDomains(): RBACDomain[] {
    const domains: Set<RBACDomain> = new Set();
    
    for (const [domain] of this.instances.entries()) {
      domains.add(domain);
    }
    
    return Array.from(domains);
  }

  /**
   * Check if user has permission in any domain (IRBAC interface)
   * Returns boolean for compatibility with IRBAC interface
   * 
   * For detailed domain information, use authorize() instead
   * 
   * @param user User to check
   * @param permission Permission to check
   * @param context Optional RBAC context (ignored, for IRBAC compatibility)
   * @returns Whether user has permission in any domain
   */
  hasPermission(user: RBACUser, permission: string, _context?: RBACContext): boolean {
    const result = this.hasPermissionWithDetails(user, permission);
    return result.allowed;
  }

  /**
   * Check if user has permission in any domain
   * Returns detailed information about which domain approved
   * 
   * @param user User to check
   * @param permission Permission to check
   * @param domains Optional list of domains to check (checks all if not provided)
   * @param context Optional RBAC context
   * @returns Aggregated permission result
   */
  hasPermissionWithDetails(
    user: RBACUser,
    permission: string,
    domains?: RBACDomain[],
    _context?: RBACContext
  ): AggregatedPermissionResult {
    const domainsToCheck = domains || this.getDomains();
    const checked: RBACDomain[] = [];

    // Try to find: domain that approves to permission
    for (const domain of domainsToCheck) {
      const rbac = this.getRBAC(domain);
      if (!rbac) continue;

      try {
        const allowed = rbac.hasPermission(user, permission);
        checked.push(domain);

        if (allowed) {
          return {
            domain,
            allowed: true,
            result: null,
            checked
          };
        }
      } catch (error) {
        console.error(`[RBACAggregator] Error checking permission '${permission}' in domain '${domain}':`, error);
        checked.push(domain);
      }
    }

    // No domain approved
    const deniedResult: AuthorizationResult = {
      allowed: false,
      reason: `Permission '${permission}' not granted in any checked domain`,
      user
    };
    return {
      domain: this.defaultDomain,
      allowed: false,
      result: deniedResult,
      checked
    };
  }

  /**
   * Authorize user for permission in any domain (IRBAC interface)
   * Returns AuthorizationResult for compatibility with IRBAC interface
   * 
   * For detailed domain information, use authorizeWithDetails() instead
   * 
   * @param user User to authorize
   * @param permission Permission to check
   * @param context Optional RBAC context (ignored, for IRBAC compatibility)
   * @returns Authorization result
   */
  authorize(user: RBACUser, permission: string, _context?: RBACContext): AuthorizationResult {
    const result = this.authorizeWithDetails(user, permission);
    
    if (result.result) {
      return result.result;
    }
    
    return {
      allowed: result.allowed,
      reason: `Permission '${permission} check result: ${result.allowed}`,
      user
    };
  }

  /**
   * Authorize user for permission in any domain
   * Returns first domain that approves to permission with authorization result
   * 
   * @param user User to authorize
   * @param permission Permission to check
   * @param domains Optional list of domains to check (checks all if not provided)
   * @param context Optional RBAC context
   * @returns Aggregated permission result
   */
  authorizeWithDetails(
    user: RBACUser,
    permission: string,
    domains?: RBACDomain[],
    _context?: RBACContext
  ): AggregatedPermissionResult {
    const domainsToCheck = domains || this.getDomains();
    const checked: RBACDomain[] = [];

    // Try to find: domain that approves to permission
    for (const domain of domainsToCheck) {
      const rbac = this.getRBAC(domain);
      if (!rbac) continue;

      try {
        const result = rbac.authorize(user, permission);
        checked.push(domain);

        if (result.allowed) {
          return {
            domain,
            allowed: true,
            result,
            checked
          };
        }
      } catch (error) {
        console.error(`[RBACAggregator] Error authorizing permission '${permission}' in domain '${domain}':`, error);
        checked.push(domain);
      }
    }

    // No domain approved
    const deniedResult: AuthorizationResult = {
      allowed: false,
      reason: `Permission '${permission}' not granted in any checked domain`,
      user
    };
    return {
      domain: this.defaultDomain,
      allowed: false,
      result: deniedResult,
      checked
    };
  }

  /**
   * Check if user has permission in specific domain
   * 
   * @param user User to check
   * @param permission Permission to check
   * @param domain Domain to check (uses default if not provided)
   * @param context Optional RBAC context
   * @returns Whether user has permission in the domain
   */
  hasPermissionInDomain(
    user: RBACUser,
    permission: string,
    domain?: RBACDomain,
    _context?: RBACContext
  ): boolean {
    const targetDomain = domain || this.defaultDomain;
    const rbac = this.getRBAC(targetDomain);

    if (!rbac) {
      return false;
    }

    return rbac.hasPermission(user, permission);
  }

  /**
   * Authorize user for permission in specific domain
   * 
   * @param user User to authorize
   * @param permission Permission to check
   * @param domain Domain to check (uses default if not provided)
   * @param context Optional RBAC context
   * @returns Authorization result from the domain
   */
  authorizeInDomain(
    user: RBACUser,
    permission: string,
    domain?: RBACDomain,
    _context?: RBACContext
  ): AuthorizationResult | null {
    const targetDomain = domain || this.defaultDomain;
    const rbac = this.getRBAC(targetDomain);

    if (!rbac) {
      return null;
    }

    try {
      return rbac.authorize(user, permission);
    } catch (error) {
      console.error(`[RBACAggregator] Error authorizing permission '${permission}' in domain '${targetDomain}':`, error);
      return null;
    }
  }

  /**
   * Check if user has all of the specified permissions in any domain (IRBAC interface)
   * 
   * @param user User to check
   * @param permissions Permissions to check (AND logic - must have all)
   * @param context Optional RBAC context
   * @returns Whether user has all permissions
   */
  hasAllPermissions(user: RBACUser, permissions: string[], _context?: RBACContext): boolean {
    const domainsToCheck = this.getDomains();
    for (const permission of permissions) {
      const result = this.hasPermissionWithDetails(user, permission, domainsToCheck, _context);
      if (!result.allowed) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has all of the specified permissions in specific domains
   * 
   * @param user User to check
   * @param permissions Permissions to check (AND logic - must have all)
   * @param domains Optional list of domains to check (checks all if not provided)
   * @param context Optional RBAC context
   * @returns Whether user has all permissions
   */
  hasAllPermissionsInDomains(
    user: RBACUser,
    permissions: string[],
    domains?: RBACDomain[],
    _context?: RBACContext
  ): boolean {
    const domainsToCheck = domains || this.getDomains();

    for (const permission of permissions) {
      const result = this.hasPermissionWithDetails(user, permission, domainsToCheck, _context);
      if (!result.allowed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has all of the specified permissions in specific domain
   * 
   * @param user User to check
   * @param permissions Permissions to check (AND logic - must have all)
   * @param domain Domain to check (uses default if not provided)
   * @param context Optional RBAC context
   * @returns Whether user has all permissions in the domain
   */
  hasAllPermissionsInDomain(
    user: RBACUser,
    permissions: string[],
    domain?: RBACDomain,
    _context?: RBACContext
  ): boolean {
    const targetDomain = domain || this.defaultDomain;
    const rbac = this.getRBAC(targetDomain);

    if (!rbac) {
      return false;
    }

    for (const permission of permissions) {
      if (!rbac.hasPermission(user, permission)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has any of the specified permissions in any domain (IRBAC interface)
   * 
   * @param user User to check
   * @param permissions Permissions to check (OR logic - at least one)
   * @param context Optional RBAC context
   * @returns Whether user has at least one permission
   */
  hasAnyPermission(user: RBACUser, permissions: string[], _context?: RBACContext): boolean {
    const domainsToCheck = this.getDomains();
    for (const permission of permissions) {
      const result = this.hasPermissionWithDetails(user, permission, domainsToCheck, _context);
      if (result.allowed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has any of the specified permissions in specific domains (OR logic)
   * 
   * @param user User to check
   * @param permissions Permissions to check (OR logic - at least one)
   * @param domains Optional list of domains to check (checks all if not provided)
   * @param context Optional RBAC context
   * @returns Whether user has at least one permission
   */
  hasAnyPermissionInDomains(
    user: RBACUser,
    permissions: string[],
    domains?: RBACDomain[],
    _context?: RBACContext
  ): boolean {
    const domainsToCheck = domains || this.getDomains();

    for (const permission of permissions) {
      const result = this.hasPermissionWithDetails(user, permission, domainsToCheck, _context);
      if (result.allowed) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions in specific domain (OR logic)
   * 
   * @param user User to check
   * @param permissions Permissions to check (OR logic - at least one)
   * @param domain Domain to check (uses default if not provided)
   * @param context Optional RBAC context
   * @returns Whether user has at least one permission in the domain
   */
  hasAnyPermissionInDomain(
    user: RBACUser,
    permissions: string[],
    domain?: RBACDomain,
    _context?: RBACContext
  ): boolean {
    const targetDomain = domain || this.defaultDomain;
    const rbac = this.getRBAC(targetDomain);

    if (!rbac) {
      return false;
    }

    for (const permission of permissions) {
      if (rbac.hasPermission(user, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all registered permissions (union of all domains)
   * 
   * @returns Array of all permissions from all domains
   */
  getPermissions(): string[] {
    const allRBACs = this.getAllRBACs();
    const permissions = new Set<string>();
    
    for (const rbac of allRBACs.values()) {
      const rbacPermissions = rbac.getPermissions();
      rbacPermissions.forEach(perm => permissions.add(perm));
    }
    
    return Array.from(permissions);
  }

  /**
   * Get all registered roles (union of all domains)
   * 
   * @returns Array of all role names from all domains
   */
  getAllRoles(): string[] {
    const allRBACs = this.getAllRBACs();
    const roles = new Set<string>();
    
    for (const rbac of allRBACs.values()) {
      const rbacRoles = rbac.getAllRoles();
      rbacRoles.forEach(role => roles.add(role));
    }
    
    return Array.from(roles);
  }

  /**
   * Get all registered roles (IRBAC interface compatibility)
   * 
   * @returns Array of all role names from all domains
   */
  getRoles(): string[] {
    return this.getAllRoles();
  }

  /**
   * Get permissions for a specific role (union from all domains)
   * 
   * @param roleName Role name to get permissions for
   * @returns Array of permissions from all domains
   */
  getRolePermissions(roleName: string): string[] {
    const allRBACs = this.getAllRBACs();
    const permissions = new Set<string>();
    
    for (const rbac of allRBACs.values()) {
      const rolePerms = rbac.getRolePermissions(roleName);
      rolePerms.forEach(perm => permissions.add(perm));
    }
    
    return Array.from(permissions);
  }

  /**
   * Create a new role in all domains
   * 
   * @param roleName Name of role to create
   * @param permissions Permissions for the role
   */
  createRole(roleName: string, permissions: string[]): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      rbac.createRole(roleName, permissions);
    }
  }

  /**
   * Add permission to a role in all domains (IRBAC interface: grantPermission)
   * 
   * @param roleName Role name
   * @param permission Permission to add
   */
  grantPermission(roleName: string, permission: string): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      rbac.addPermissionToRole(roleName, permission);
    }
  }

  /**
   * Revoke permission from a role in all domains (IRBAC interface: revokePermission)
   * 
   * @param roleName Role name
   * @param permission Permission to revoke
   */
  revokePermission(roleName: string, permission: string): void {
    const allRBACs = this.getAllRBACs();
    
    // For each RBAC, we need to manually revoke by getting current permissions and recreating
    for (const rbac of allRBACs.values()) {
      const currentPerms = rbac.getRolePermissions(roleName);
      const newPerms = currentPerms.filter(perm => perm !== permission);
      rbac.createRole(roleName, newPerms);
    }
  }

  /**
   * Register a permission in all domains (IRBAC interface)
   * 
   * @param permissionName Permission name to register
   */
  registerPermission(permissionName: string): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      try {
        rbac.registerPermission(permissionName);
      } catch (error) {
        // Permission might already exist - ignore
        if (!(error as Error).message.includes('already exists')) {
          console.error(`[RBACAggregator] Error registering permission '${permissionName}':`, error);
        }
      }
    }
  }

  /**
   * Get user's permissions (union of all domains) (IRBAC interface)
   * 
   * @param user User to get permissions for
   * @returns Array of all permissions user has
   */
  getUserPermissions(user: RBACUser): string[] {
    return Array.from(this.getEffectivePermissions(user));
  }

  /**
   * Deny permission for user in all domains (IRBAC interface)
   * 
   * @param userId User ID
   * @param permission Permission to deny
   */
  denyPermission(userId: string, permission: string): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      rbac.denyPermission(userId, permission);
    }
  }

  /**
   * Remove denied permission for user in all domains (IRBAC interface)
   * 
   * @param userId User ID
   * @param permission Permission to allow
   */
  allowPermission(userId: string, permission: string): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      rbac.allowPermission(userId, permission);
    }
  }

  /**
   * Get denied permissions for user (union of all domains) (IRBAC interface)
   * 
   * @param userId User ID
   * @returns Array of denied permissions
   */
  getDeniedPermissions(userId: string): string[] {
    const allRBACs = this.getAllRBACs();
    const deniedPerms = new Set<string>();
    
    for (const rbac of allRBACs.values()) {
      const perms = rbac.getDeniedPermissions(userId);
      perms.forEach(perm => deniedPerms.add(perm));
    }
    
    return Array.from(deniedPerms);
  }

  /**
   * Add permission to a role in all domains
   * 
   * @param roleName Role name
   * @param permission Permission to add
   */
  addPermissionToRole(roleName: string, permission: string): void {
    const allRBACs = this.getAllRBACs();
    
    for (const rbac of allRBACs.values()) {
      rbac.addPermissionToRole(roleName, permission);
    }
  }

  /**
   * Get user's effective permissions (union of all domains)
   * 
   * @param user User to check
   * @param domains Optional list of domains to check (all if not provided)
   * @param context Optional RBAC context
   * @returns Set of all permissions user has in all domains
   */
  getEffectivePermissions(
    user: RBACUser,
    domains?: RBACDomain[],
    _context?: RBACContext
  ): Set<string> {
    const domainsToCheck = domains || this.getDomains();
    const permissions = new Set<string>();

      for (const domain of domainsToCheck) {
        const rbac = this.getRBAC(domain);
        if (!rbac) continue;

        // Get permissions for each role the user has
        for (const role of user.roles || []) {
          const rolePermissions = rbac.getRolePermissions(role);
          rolePermissions.forEach(perm => permissions.add(perm));
        }
      }

    return permissions;
  }

  /**
   * Clear cache for specific domain (force reload)
   */
  clearDomainCache(domain: RBACDomain): void {
    this.instances.delete(domain);
  }

  /**
   * Initialize all RBAC instances (create all at once)
   */
  initialize(): void {
    for (const domain of this.getDomains()) {
      this.getRBAC(domain);
    }
  }

  /**
   * Serialize aggregator state (for debugging/persistence)
   */
  toJSON(): string {
    const state = {
      defaultDomain: this.defaultDomain,
      cache: this.cache,
      domains: Array.from(this.instances.keys()),
      version: '1.0.0'
    };
    return JSON.stringify(state, null, 2);
  }
}
