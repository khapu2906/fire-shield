import type { H3Event } from 'h3';
import { createError, defineEventHandler } from 'h3';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Nuxt RBAC options
 */
export interface NuxtRBACOptions {
  getUser?: (event: H3Event) => RBACUser | undefined | Promise<RBACUser | undefined>;
  onUnauthorized?: (result: AuthorizationResult, event: H3Event) => void;
  onError?: (error: Error, event: H3Event) => void;
}

/**
 * Default user extractor from event
 */
function defaultGetUser(event: H3Event): RBACUser | undefined {
  return event.context.user;
}

/**
 * Default unauthorized handler
 */
function defaultOnUnauthorized(result: AuthorizationResult, _event: H3Event): void {
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: 'Forbidden',
    data: {
      code: 'INSUFFICIENT_PERMISSIONS',
      reason: result.reason || 'Insufficient permissions'
    }
  });
}

/**
 * Default error handler
 */
function defaultOnError(error: Error, _event: H3Event): void {
  console.error('RBAC Error:', error);
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'Authorization check failed',
    data: {
      code: 'AUTHORIZATION_ERROR'
    }
  });
}

/**
 * Nuxt RBAC adapter class
 */
export class NuxtRBACAdapter {
  private rbac: RBAC;
  private options: Required<NuxtRBACOptions>;

  constructor(rbac: RBAC, options: NuxtRBACOptions = {}) {
    this.rbac = rbac;
    this.options = {
      getUser: options.getUser || defaultGetUser,
      onUnauthorized: options.onUnauthorized || defaultOnUnauthorized,
      onError: options.onError || defaultOnError,
    };
  }

  /**
   * Check permission in event handler
   */
  async checkPermission(event: H3Event, permission: string): Promise<boolean> {
    try {
      const user = await this.options.getUser(event);
      if (!user) return false;
      return this.rbac.hasPermission(user, permission);
    } catch {
      return false;
    }
  }

  /**
   * Require permission or throw error
   */
  async requirePermission(event: H3Event, permission: string): Promise<void> {
    let user: RBACUser | undefined;

    try {
      user = await this.options.getUser(event);
    } catch (error) {
      return this.options.onError(error as Error, event);
    }

    if (!user) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: 'No user found in context'
      };
      this.options.onUnauthorized(result, event);
      return;
    }

    const result = this.rbac.authorize(user, permission);

    if (!result.allowed) {
      this.options.onUnauthorized(result, event);
      return;
    }
  }

  /**
   * Require role or throw error
   */
  async requireRole(event: H3Event, role: string): Promise<void> {
    let user: RBACUser | undefined;

    try {
      user = await this.options.getUser(event);
    } catch (error) {
      return this.options.onError(error as Error, event);
    }

    if (!user) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: 'No user found in context'
      };
      this.options.onUnauthorized(result, event);
      return;
    }

    if (!user.roles || !user.roles.includes(role)) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `User lacks required role: ${role}`,
        user
      };
      this.options.onUnauthorized(result, event);
      return;
    }
  }

  /**
   * Require resource:action permission or throw error
   */
  async requireResourceAction(event: H3Event, resource: string, action: string): Promise<void> {
    const permission = `${resource}:${action}`;
    return this.requirePermission(event, permission);
  }

  /**
   * Require all permissions or throw error
   */
  async requireAll(event: H3Event, ...permissions: string[]): Promise<void> {
    let user: RBACUser | undefined;

    try {
      user = await this.options.getUser(event);
    } catch (error) {
      return this.options.onError(error as Error, event);
    }

    if (!user) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: 'No user found in context'
      };
      this.options.onUnauthorized(result, event);
      return;
    }

    if (!this.rbac.hasAllPermissions(user, permissions)) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `User lacks all required permissions: ${permissions.join(', ')}`,
        user
      };
      this.options.onUnauthorized(result, event);
      return;
    }
  }

  /**
   * Require any permission or throw error
   */
  async requireAny(event: H3Event, ...permissions: string[]): Promise<void> {
    let user: RBACUser | undefined;

    try {
      user = await this.options.getUser(event);
    } catch (error) {
      return this.options.onError(error as Error, event);
    }

    if (!user) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: 'No user found in context'
      };
      this.options.onUnauthorized(result, event);
      return;
    }

    if (!this.rbac.hasAnyPermission(user, permissions)) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `User lacks any of the required permissions: ${permissions.join(', ')}`,
        user
      };
      this.options.onUnauthorized(result, event);
      return;
    }
  }

  /**
   * Get RBAC instance
   */
  getRBAC(): RBAC {
    return this.rbac;
  }
}

/**
 * Create event handler with permission check
 */
export function defineRBACEventHandler<T = unknown>(
  permission: string,
  handler: (event: H3Event) => T | Promise<T>,
  rbac?: RBAC
) {
  return defineEventHandler(async (event) => {
    const rbacInstance = rbac || event.context.rbac;

    if (!rbacInstance) {
      throw createError({
        statusCode: 500,
        message: 'RBAC not initialized'
      });
    }

    const adapter = new NuxtRBACAdapter(rbacInstance);
    await adapter.requirePermission(event, permission);

    return handler(event);
  });
}

/**
 * Create event handler with role check
 */
export function defineRBACRoleHandler<T = unknown>(
  role: string,
  handler: (event: H3Event) => T | Promise<T>,
  rbac?: RBAC
) {
  return defineEventHandler(async (event) => {
    const rbacInstance = rbac || event.context.rbac;

    if (!rbacInstance) {
      throw createError({
        statusCode: 500,
        message: 'RBAC not initialized'
      });
    }

    const adapter = new NuxtRBACAdapter(rbacInstance);
    await adapter.requireRole(event, role);

    return handler(event);
  });
}

// Re-export Nuxt module
export { default as FireShieldModule } from './module';
