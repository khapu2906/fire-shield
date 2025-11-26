import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction, preHandlerHookHandler } from 'fastify';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';
import type { MiddlewareContext } from '@fire-shield/core/lib/types/user.types';

/**
 * Extended Fastify Request interface with user
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: RBACUser;
  }
}

/**
 * Fastify RBAC hook options
 */
export interface FastifyRBACOptions {
  rbac: RBAC;
  getUser?: (request: FastifyRequest) => RBACUser | undefined | Promise<RBACUser | undefined>;
  getPermission?: (request: FastifyRequest) => string | undefined | Promise<string | undefined>;
  getResource?: (request: FastifyRequest) => string | undefined | Promise<string | undefined>;
  getAction?: (request: FastifyRequest) => string | undefined | Promise<string | undefined>;
  onUnauthorized?: (result: AuthorizationResult, request: FastifyRequest, reply: FastifyReply) => void;
  onError?: (error: Error, request: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Default user extractor from request
 */
function defaultGetUser(request: FastifyRequest): RBACUser | undefined {
  return request.user;
}

/**
 * Default permission extractor from request
 */
function defaultGetPermission(request: FastifyRequest): string | undefined {
  // Extract from headers or route config
  return request.headers?.['x-permission'] as string | undefined;
}

/**
 * Default resource extractor from request
 */
function defaultGetResource(request: FastifyRequest): string | undefined {
  // Extract from route path or config
  const path = request.routeOptions?.url || request.url;
  return path ? path.replace(/^\/+|\/+$/g, '') : undefined;
}

/**
 * Default action extractor from request
 */
function defaultGetAction(request: FastifyRequest): string | undefined {
  // Extract from HTTP method
  return request.method?.toLowerCase();
}

/**
 * Default unauthorized handler
 */
function defaultOnUnauthorized(result: AuthorizationResult, request: FastifyRequest, reply: FastifyReply): void {
  reply.code(403).send({
    error: 'Forbidden',
    message: result.reason || 'Insufficient permissions',
    code: 'INSUFFICIENT_PERMISSIONS'
  });
}

/**
 * Default error handler
 */
function defaultOnError(error: Error, request: FastifyRequest, reply: FastifyReply): void {
  request.log?.error({ err: error }, 'RBAC Hook Error:'); // Use object for error logging
  reply.code(500).send({
    error: 'Internal Server Error',
    message: 'Authorization check failed',
    code: 'AUTHORIZATION_ERROR'
  });
}

/**
 * Create RBAC preHandler hook for Fastify
 */
export function createRBACHook(options: FastifyRBACOptions): preHandlerHookHandler {
  const {
    rbac,
    getUser = defaultGetUser,
    getPermission = defaultGetPermission,
    getResource = defaultGetResource,
    getAction = defaultGetAction,
    onUnauthorized = defaultOnUnauthorized,
    onError = defaultOnError,
  } = options;

  return async function rbacHook(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): Promise<void> {
    try {
      // Get user from request
      const user = await getUser(request);

      if (!user) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: 'No user found in request'
        };
        onUnauthorized(result, request, reply);
        return;
      }

      // Get permission details
      const permission = await Promise.resolve(getPermission(request));
      const resource = await Promise.resolve(getResource(request));
      const action = await Promise.resolve(getAction(request));

      // Create middleware context
      const context: MiddlewareContext = {
        user,
        resource,
        action,
        permission,
        request,
        response: reply,
      };

      let result: AuthorizationResult;

      if (permission) {
        // Direct permission check
        result = rbac.authorize(user, permission);
      } else if (resource && action) {
        // Resource:action pattern check
        result = rbac.authorizeWithContext({
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
        // Attach authorization result to request for later use
        (request as any).authorization = result;
        done();
      } else {
        onUnauthorized(result, request, reply);
      }
    } catch (error) {
      onError(error as Error, request, reply);
    }
  };
}

/**
 * Create permission-based route guard
 */
export function requirePermission(permission: string, options: Omit<FastifyRBACOptions, 'getPermission'>): preHandlerHookHandler {
  return createRBACHook({
    ...options,
    getPermission: () => permission,
  });
}

/**
 * Create resource-action based route guard
 */
export function requireResourceAction(resource: string, action: string, options: Omit<FastifyRBACOptions, 'getResource' | 'getAction'>): preHandlerHookHandler {
  return createRBACHook({
    ...options,
    getResource: () => resource,
    getAction: () => action,
  });
}

/**
 * Create role-based route guard
 */
export function requireRole(role: string, options: FastifyRBACOptions): preHandlerHookHandler {
  const {
    getUser = defaultGetUser,
    onUnauthorized = defaultOnUnauthorized,
    onError = defaultOnError,
  } = options;

  return async function roleCheck(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): Promise<void> {
    try {
      const user = await Promise.resolve(getUser(request));

      if (!user) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: 'No user found in request'
        };
        onUnauthorized(result, request, reply);
        return;
      }

      if (!user.roles?.includes(role)) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: `User does not have required role: ${role}`,
          user
        };
        onUnauthorized(result, request, reply);
        return;
      }

      // Attach role check result to request
      (request as any).authorization = { allowed: true, user };
      done();
    } catch (error) {
      onError(error as Error, request, reply);
    }
  };
}

/**
 * Fastify RBAC adapter class
 */
export class FastifyRBACAdapter {
  private rbac: RBAC;
  private options: FastifyRBACOptions;

  constructor(rbac: RBAC, options: Partial<FastifyRBACOptions> = {}) {
    this.rbac = rbac;
    this.options = {
      rbac,
      getUser: defaultGetUser,
      getPermission: defaultGetPermission,
      getResource: defaultGetResource,
      getAction: defaultGetAction,
      onUnauthorized: defaultOnUnauthorized,
      onError: defaultOnError,
      ...options,
    };
  }

  /**
   * Create hook for specific permission
   */
  permission(permission: string): preHandlerHookHandler {
    return requirePermission(permission, this.options);
  }

  /**
   * Create hook for resource:action pattern
   */
  resourceAction(resource: string, action: string): preHandlerHookHandler {
    return requireResourceAction(resource, action, this.options);
  }

  /**
   * Create hook for role requirement
   */
  role(role: string): preHandlerHookHandler {
    return requireRole(role, this.options);
  }

  /**
   * Create custom hook
   */
  hook(customOptions: Partial<FastifyRBACOptions>): preHandlerHookHandler {
    return createRBACHook({
      ...this.options,
      ...customOptions,
    });
  }

  /**
   * Register RBAC with Fastify instance
   */
  /**
   * Create hook that requires ALL specified permissions
   */
  all(...permissions: string[]): preHandlerHookHandler {
    return createRBACHook({
      ...this.options,
      getPermission: async (request) => {
        const user = await (this.options.getUser?.(request) || request.user);
        if (!user) return undefined;

        const hasAll = this.rbac.hasAllPermissions(user, permissions);
        return hasAll ? permissions[0] : undefined;
      },
      onUnauthorized: (result, request, reply) => {
        if (result.reason === 'No user found in request') {
          this.options.onUnauthorized?.(result, request, reply);
        } else {
          this.options.onUnauthorized?.({
            allowed: false,
            reason: `User requires all of the following permissions: ${permissions.join(', ')}`,
          }, request, reply);
        }
      }
    });
  }

  /**
   * Create hook that requires ANY of the specified permissions
   */
  any(...permissions: string[]): preHandlerHookHandler {
    return createRBACHook({
      ...this.options,
      getPermission: async (request) => {
        const user = await (this.options.getUser?.(request) || request.user);
        if (!user) return undefined;

        const hasAny = this.rbac.hasAnyPermission(user, permissions);
        return hasAny ? permissions[0] : undefined;
      },
      onUnauthorized: (result, request, reply) => {
        if (result.reason === 'No user found in request') {
          this.options.onUnauthorized?.(result, request, reply);
        } else {
          this.options.onUnauthorized?.({
            allowed: false,
            reason: `User requires any of the following permissions: ${permissions.join(', ')}`,
          }, request, reply);
        }
      }
    });
  }

  /**
   * Create hook to deny a permission
   */
  denyPermission(permission: string): preHandlerHookHandler {
    return denyPermission(permission, this.options);
  }

  /**
   * Create hook to allow (remove deny) a permission
   */
  allowPermission(permission: string): preHandlerHookHandler {
    return allowPermission(permission, this.options);
  }

  /**
   * Create hook to block if permission is denied
   */
  notDenied(permission: string): preHandlerHookHandler {
    return requireNotDenied(permission, this.options);
  }

  /**
   * Get denied permissions for a user from request
   */
  getDeniedPermissions(request: FastifyRequest): string[] {
    const user = request.user;
    if (!user) return [];
    return this.rbac.getDeniedPermissions(user.id);
  }

  /**
   * Check if a permission is denied for user from request
   */
  isDenied(request: FastifyRequest, permission: string): boolean {
    const deniedPermissions = this.getDeniedPermissions(request);
    return deniedPermissions.some((denied) => {
      if (denied === permission) return true;
      if (denied.includes('*')) {
        const pattern = denied.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(permission);
      }
      return false;
    });
  }

  /**
   * Register RBAC with Fastify instance
   */
  register(fastify: any, opts: Partial<FastifyRBACOptions> = {}, done: () => void) {
    const mergedOptions = { ...this.options, ...opts };

    // Add RBAC instance to fastify
    fastify.decorate('rbac', this.rbac);
    fastify.decorate('authorize', (permission: string) => {
      return requirePermission(permission, mergedOptions);
    });

    done();
  }
}

/**
 * Fastify plugin for RBAC
 */
export function fastifyRBACPlugin(rbac: RBAC, options: Partial<FastifyRBACOptions> = {}) {
  const adapter = new FastifyRBACAdapter(rbac, options);

  return function (fastify: any, opts: any, done: () => void) {
    adapter.register(fastify, opts, done);
  };
}

/**
 * Hook to deny permission for a user
 * Usage: fastify.addHook('preHandler', denyPermission('admin:delete', options))
 */
export function denyPermission(permission: string, options: FastifyRBACOptions): preHandlerHookHandler {
  const {
    getUser = defaultGetUser,
    onError = defaultOnError,
  } = options;

  return async function denyPermissionHook(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): Promise<void> {
    try {
      const user = await Promise.resolve(getUser(request));

      if (!user) {
        onError(new Error('No user found in request'), request, reply);
        return;
      }

      options.rbac.denyPermission(user.id, permission);
      done();
    } catch (error) {
      onError(error as Error, request, reply);
    }
  };
}

/**
 * Hook to allow (remove deny) permission for a user
 */
export function allowPermission(permission: string, options: FastifyRBACOptions): preHandlerHookHandler {
  const {
    getUser = defaultGetUser,
    onError = defaultOnError,
  } = options;

  return async function allowPermissionHook(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): Promise<void> {
    try {
      const user = await Promise.resolve(getUser(request));

      if (!user) {
        onError(new Error('No user found in request'), request, reply);
        return;
      }

      options.rbac.allowPermission(user.id, permission);
      done();
    } catch (error) {
      onError(error as Error, request, reply);
    }
  };
}

/**
 * Hook to check if permission is NOT denied
 * Blocks request if permission is denied
 */
export function requireNotDenied(permission: string, options: FastifyRBACOptions): preHandlerHookHandler {
  const {
    getUser = defaultGetUser,
    onUnauthorized = defaultOnUnauthorized,
    onError = defaultOnError,
  } = options;

  return async function requireNotDeniedHook(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): Promise<void> {
    try {
      const user = await Promise.resolve(getUser(request));

      if (!user) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: 'No user found in request'
        };
        onUnauthorized(result, request, reply);
        return;
      }

      const deniedPermissions = options.rbac.getDeniedPermissions(user.id);
      const isDenied = deniedPermissions.some((denied) => {
        if (denied === permission) return true;
        if (denied.includes('*')) {
          const pattern = denied.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(permission);
        }
        return false;
      });

      if (isDenied) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: `Permission "${permission}" is explicitly denied`,
          user
        };
        onUnauthorized(result, request, reply);
        return;
      }

      done();
    } catch (error) {
      onError(error as Error, request, reply);
    }
  };
}

// Export types
