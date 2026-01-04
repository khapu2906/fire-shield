import { RBAC } from "..";

/**
 * Plugin interface for Fire Shield RBAC system
 * Plugins can extend RBAC functionality without modifying core code
 */
export interface RBACPlugin {
  /**
   * Unique plugin name
   */
  name: string;

  /**
   * Plugin version (optional)
   */
  version?: string;

  /**
   * Initialize plugin with RBAC instance
   * Called when plugin is registered
   */
  initialize?(rbac: RBAC): void | Promise<void>;

  /**
   * Hook called after each permission check
   * Useful for logging, caching, analytics, etc.
   */
  onPermissionCheck?(event: any): void | Promise<void>;

  /**
   * Hook called when a role is added
   */
  onRoleAdded?(roleName: string, permissions: string[]): void | Promise<void>;

  /**
   * Hook called when a permission is registered
   */
  onPermissionRegistered?(permissionName: string, bit: number): void | Promise<void>;

  /**
   * Cleanup plugin resources
   * Called when plugin is unregistered
   */
  cleanup?(): void | Promise<void>;
}

/**
 * Plugin manager for managing RBAC plugins
 */
export class PluginManager {
  private plugins: Map<string, RBACPlugin> = new Map();
  private rbacInstance: RBAC;

  constructor(rbacInstance: RBAC) {
    this.rbacInstance = rbacInstance;
  }

  /**
   * Register a plugin
   */
  async register(plugin: RBACPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, plugin);

    // Initialize plugin
    if (plugin.initialize) {
      await plugin.initialize(this.rbacInstance);
    }

    console.log(`[Plugin] Registered: ${plugin.name}${plugin.version ? ` v${plugin.version}` : ''}`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    // Cleanup plugin
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    this.plugins.delete(pluginName);
    console.log(`[Plugin] Unregistered: ${pluginName}`);
  }

  /**
   * Get a registered plugin
   */
  getPlugin(pluginName: string): RBACPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): RBACPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Trigger onPermissionCheck hook for all plugins
   */
  async triggerPermissionCheck(event: any): Promise<void> {
    const promises = Array.from(this.plugins.values())
      .filter(plugin => plugin.onPermissionCheck)
      .map(plugin => plugin.onPermissionCheck!(event));

    await Promise.all(promises);
  }

  /**
   * Trigger onRoleAdded hook for all plugins
   */
  async triggerRoleAdded(roleName: string, permissions: string[]): Promise<void> {
    const promises = Array.from(this.plugins.values())
      .filter(plugin => plugin.onRoleAdded)
      .map(plugin => plugin.onRoleAdded!(roleName, permissions));

    await Promise.all(promises);
  }

  /**
   * Trigger onPermissionRegistered hook for all plugins
   */
  async triggerPermissionRegistered(permissionName: string, bit: number): Promise<void> {
    const promises = Array.from(this.plugins.values())
      .filter(plugin => plugin.onPermissionRegistered)
      .map(plugin => plugin.onPermissionRegistered!(permissionName, bit));

    await Promise.all(promises);
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.plugins.values())
      .filter(plugin => plugin.cleanup)
      .map(plugin => plugin.cleanup!());

    await Promise.all(promises);
    this.plugins.clear();
    console.log('[Plugin] All plugins cleaned up');
  }
}
