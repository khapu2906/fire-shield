import type { Context, MiddlewareHandler } from 'hono';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Hono RBAC middleware options
 */
export interface HonoRBACOptions {
  getUser?: (c: Context) => RBACUser | undefined | Promise<RBACUser | undefined>;
  getPermission?: (c: Context) => string | undefined | Promise<string | undefined>;
  getResource?: (c: Context) => string | undefined | Promise<string | undefined>;
  getAction?: (c: Context) => string | undefined | Promise<string | undefined>;
  onUnauthorized?: (result: AuthorizationResult, c: Context) => Response | Promise<Response>;
  onError?: (error: Error, c: Context) => Response | Promise<Response>;
}

/**
 * Default user extractor from context
 */
function defaultGetUser(c: Context): RBACUser | undefined {
  return c.get('user');
}

/**
 * Default permission extractor from context
 */
function defaultGetPermission(c: Context): string | undefined {
  // Extract from headers
  return c.req.header('x-permission');
}

/**
 * Default resource extractor from context
 */
function defaultGetResource(c: Context): string | undefined {
  // Extract from route path
  const path = c.req.path;
  return path ? path.replace(/^\/+|\/+$/g, '') : undefined;
}

/**
 * Default action extractor from context
 */
function defaultGetAction(c: Context): string | undefined {
  // Extract from HTTP method
  return c.req.method?.toLowerCase();
}

/**
 * Default unauthorized handler
 */
function defaultOnUnauthorized(result: AuthorizationResult, c: Context): Response {
  return c.json({
    error: 'Forbidden',
    message: result.reason || 'Insufficient permissions',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, 403);
}

/**
 * Default error handler
 */
function defaultOnError(error: Error, c: Context): Response {
  console.error('RBAC Middleware Error:', error);
  return c.json({
    error: 'Internal Server Error',
    message: 'Authorization check failed',
    code: 'AUTHORIZATION_ERROR'
  }, 500);
}

/**
 * Hono RBAC adapter class
 */
export class HonoRBACAdapter {
  private rbac: RBAC;
  private options: Required<HonoRBACOptions>;

  constructor(rbac: RBAC, options: HonoRBACOptions = {}) {
    this.rbac = rbac;
    this.options = {
      getUser: options.getUser || defaultGetUser,
      getPermission: options.getPermission || defaultGetPermission,
      getResource: options.getResource || defaultGetResource,
      getAction: options.getAction || defaultGetAction,
      onUnauthorized: options.onUnauthorized || defaultOnUnauthorized,
      onError: options.onError || defaultOnError,
    };
  }

  /**
   * Create middleware for specific permission
   */
  permission(permission: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        const result = this.rbac.authorize(user, permission);

        if (result.allowed) {
          // Store authorization result in context
          c.set('authorization', result);
          await next();
        } else {
          return this.options.onUnauthorized(result, c);
        }
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create middleware for role requirement
   */
  role(role: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        if (!user.roles || !user.roles.includes(role)) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `User lacks required role: ${role}`,
            user
          };
          return this.options.onUnauthorized(result, c);
        }

        await next();
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create middleware for resource:action pattern
   */
  resourceAction(resource: string, action: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        const result = this.rbac.authorizeWithContext({
          user,
          resource,
          action,
        });

        if (result.allowed) {
          c.set('authorization', result);
          await next();
        } else {
          return this.options.onUnauthorized(result, c);
        }
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create custom middleware with multiple permissions (AND logic)
   */
  all(...permissions: string[]): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        const hasAll = this.rbac.hasAllPermissions(user, permissions);

        if (hasAll) {
          await next();
        } else {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `User lacks required permissions: ${permissions.join(', ')}`,
            user
          };
          return this.options.onUnauthorized(result, c);
        }
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create custom middleware with multiple permissions (OR logic)
   */
  any(...permissions: string[]): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        const hasAny = this.rbac.hasAnyPermission(user, permissions);

        if (hasAny) {
          await next();
        } else {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `User lacks any of required permissions: ${permissions.join(', ')}`,
            user
          };
          return this.options.onUnauthorized(result, c);
        }
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create custom middleware with custom options
   */
  middleware(customOptions: Partial<HonoRBACOptions>): MiddlewareHandler {
    const mergedOptions = { ...this.options, ...customOptions };

    return async (c, next) => {
      try {
        const user = await mergedOptions.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return mergedOptions.onUnauthorized(result, c);
        }

        // Get permission details
        const permission = await Promise.resolve(mergedOptions.getPermission?.(c));
        const resource = await Promise.resolve(mergedOptions.getResource?.(c));
        const action = await Promise.resolve(mergedOptions.getAction?.(c));

        let result: AuthorizationResult;

        if (permission) {
          // Direct permission check
          result = this.rbac.authorize(user, permission);
        } else if (resource && action) {
          // Resource:action pattern check
          result = this.rbac.authorizeWithContext({
            user,
            resource,
            action,
          });
        } else {
          result = {
            allowed: false,
            reason: 'No permission, resource, or action specified'
          };
        }

        if (result.allowed) {
          c.set('authorization', result);
          await next();
        } else {
          return mergedOptions.onUnauthorized(result, c);
        }
      } catch (error) {
        return mergedOptions.onError(error as Error, c);
      }
    };
  }

  /**
   * Create middleware to deny a permission
   */
  denyPermission(permission: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          return this.options.onError(new Error('No user found in context'), c);
        }

        this.rbac.denyPermission(user.id, permission);
        await next();
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create middleware to allow (remove deny) a permission
   */
  allowPermission(permission: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          return this.options.onError(new Error('No user found in context'), c);
        }

        this.rbac.allowPermission(user.id, permission);
        await next();
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Create middleware to block if permission is denied
   */
  notDenied(permission: string): MiddlewareHandler {
    return async (c, next) => {
      try {
        const user = await this.options.getUser(c);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in context'
          };
          return this.options.onUnauthorized(result, c);
        }

        const isDenied = this.isDenied(c, permission);

        if (isDenied) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `Permission "${permission}" is explicitly denied`,
            user
          };
          return this.options.onUnauthorized(result, c);
        }

        await next();
      } catch (error) {
        return this.options.onError(error as Error, c);
      }
    };
  }

  /**
   * Get denied permissions for user from context
   */
  getDeniedPermissions(c: Context): string[] {
    const user = c.get('user') as RBACUser | undefined;
    if (!user) return [];
    return this.rbac.getDeniedPermissions(user.id);
  }

  /**
   * Check if a permission is denied for user from context
   */
  isDenied(c: Context, permission: string): boolean {
    const deniedPermissions = this.getDeniedPermissions(c);
    return deniedPermissions.some((denied) => {
      if (denied === permission) return true;
      if (denied.includes('*')) {
        const pattern = denied.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(permission);
      }
      return false;
    });
  }
}
