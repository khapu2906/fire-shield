import type { Request, Response, NextFunction } from 'express';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Extended Express Request interface with user
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RBACUser;
      authorization?: AuthorizationResult; // Add authorization property
    }
  }
}

/**
 * Middleware context for authorization checks
 */
export interface MiddlewareContext {
  user: RBACUser;
  resource?: string;
  action?: string;
  permission?: string;
  request: Request;
  response: Response;
  next: NextFunction;
}

/**
 * Express RBAC middleware options
 */
export interface ExpressRBACOptions {
  rbac: RBAC;
  getUser?: (req: Request) => RBACUser | undefined | Promise<RBACUser | undefined>;
  getPermission?: (req: Request) => string | undefined | Promise<string | undefined>;
  getResource?: (req: Request) => string | undefined | Promise<string | undefined>;
  getAction?: (req: Request) => string | undefined | Promise<string | undefined>;
  onUnauthorized?: (result: AuthorizationResult, req: Request, res: Response, next: NextFunction) => void;
  onError?: (error: Error, req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Default user extractor from request
 */
function defaultGetUser(req: Request): RBACUser | undefined {
  return req.user;
}

/**
 * Default permission extractor from request
 */
function defaultGetPermission(req: Request): string | undefined {
  // Extract from route metadata or headers
  return req.headers?.['x-permission'] as string | undefined;
}

/**
 * Default resource extractor from request
 */
function defaultGetResource(req: Request): string | undefined {
  // Extract from route path or metadata
  const path = req.route?.path || req.path;
  return path ? path.replace(/^\/+|\/+$/g, '') : undefined;
}

/**
 * Default action extractor from request
 */
function defaultGetAction(req: Request): string | undefined {
  // Extract from HTTP method
  return req.method?.toLowerCase();
}

/**
 * Default unauthorized handler
 */
function defaultOnUnauthorized(result: AuthorizationResult, _req: Request, res: Response, _next: NextFunction): void {
  res.status(403).json({
    error: 'Forbidden',
    message: result.reason || 'Insufficient permissions',
    code: 'INSUFFICIENT_PERMISSIONS'
  });
}

/**
 * Default error handler
 */
function defaultOnError(error: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('RBAC Middleware Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Authorization check failed',
    code: 'AUTHORIZATION_ERROR'
  });
}

/**
 * Create RBAC middleware for Express
 */
export function createRBACMiddleware(options: ExpressRBACOptions) {
  const {
    rbac,
    getUser = defaultGetUser,
    getPermission = defaultGetPermission,
    getResource = defaultGetResource,
    getAction = defaultGetAction,
    onUnauthorized = defaultOnUnauthorized,
    onError = defaultOnError,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get user from request
      const user = await getUser(req);

      if (!user) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: 'No user found in request'
        };
        onUnauthorized(result, req, res, next);
        return;
      }

      // Get permission details
      const permission = await getPermission(req);
      const resource = await getResource(req);
      const action = await getAction(req);

      // Create middleware context

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
        req.authorization = result; // No longer needs 'any' cast
        next();
      } else {
        onUnauthorized(result, req, res, next);
      }
    } catch (error) {
      onError(error as Error, req, res, next);
    }
  };
}

/**
 * Create permission-based route guard
 */
export function requirePermission(permission: string, options: Omit<ExpressRBACOptions, 'getPermission'>) {
  return createRBACMiddleware({
    ...options,
    getPermission: () => permission,
  });
}

/**
 * Create resource-action based route guard
 */
export function requireResourceAction(resource: string, action: string, options: Omit<ExpressRBACOptions, 'getResource' | 'getAction'>) {
  return createRBACMiddleware({
    ...options,
    getResource: () => resource,
    getAction: () => action,
  });
}

/**
 * Create role-based route guard
 */
export function requireRole(role: string, options: ExpressRBACOptions) {
  return createRBACMiddleware({
    ...options,
    getPermission: async (req) => {
      const user = await (options.getUser?.(req) || req.user);
      if (!user) return undefined;

      // Directly check if the user has the role
      const hasRole = user.roles.includes(role);
      // If the user has the role, we return a synthetic permission string
      // that will then be authorized by the RBAC system.
      // This allows the middleware to proceed with the authorization flow.
      return hasRole ? `role:${role}` : undefined;
    },
  });
}

/**
 * Express RBAC adapter class
 */
export class ExpressRBACAdapter {
  private rbac: RBAC;
  private options: ExpressRBACOptions;

  constructor(rbac: RBAC, options: Partial<ExpressRBACOptions> = {}) {
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
   * Create middleware for specific permission
   */
  permission(permission: string) {
    return requirePermission(permission, this.options);
  }

  /**
   * Create middleware for resource:action pattern
   */
  resourceAction(resource: string, action: string) {
    return requireResourceAction(resource, action, this.options);
  }

  /**
   * Create middleware for role requirement
   */
  role(role: string) {
    return requireRole(role, this.options);
  }

  /**
   * Create custom middleware
   */
  middleware(customOptions: Partial<ExpressRBACOptions>) {
    return createRBACMiddleware({
      ...this.options,
      ...customOptions,
    });
  }

  /**
   * Create middleware that requires ALL specified permissions
   */
  all(...permissions: string[]) {
    return createRBACMiddleware({
      ...this.options,
      getPermission: async (req) => {
        const user = await (this.options.getUser?.(req) || req.user);
        if (!user) return undefined;

        const hasAll = this.rbac.hasAllPermissions(user, permissions);
        return hasAll ? permissions[0] : undefined;
      },
      onUnauthorized: (result, req, res, next) => {
        if (result.reason === 'No user found in request') {
          this.options.onUnauthorized?.(result, req, res, next);
        } else {
          this.options.onUnauthorized?.({
            allowed: false,
            reason: `User requires all of the following permissions: ${permissions.join(', ')}`,
          }, req, res, next);
        }
      }
    });
  }

  /**
   * Create middleware that requires ANY of the specified permissions
   */
  any(...permissions: string[]) {
    return createRBACMiddleware({
      ...this.options,
      getPermission: async (req) => {
        const user = await (this.options.getUser?.(req) || req.user);
        if (!user) return undefined;

        const hasAny = this.rbac.hasAnyPermission(user, permissions);
        return hasAny ? permissions[0] : undefined;
      },
      onUnauthorized: (result, req, res, next) => {
        if (result.reason === 'No user found in request') {
          this.options.onUnauthorized?.(result, req, res, next);
        } else {
          this.options.onUnauthorized?.({
            allowed: false,
            reason: `User requires any of the following permissions: ${permissions.join(', ')}`,
          }, req, res, next);
        }
      }
    });
  }
}
