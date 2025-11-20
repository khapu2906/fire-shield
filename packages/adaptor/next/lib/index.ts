import type { NextRequest } from 'next/server';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Next.js RBAC options
 */
export interface NextRBACOptions {
  getUser?: (req: NextRequest | any) => RBACUser | undefined | Promise<RBACUser | undefined>;
  onUnauthorized?: (result: AuthorizationResult, req: NextRequest | any, res?: any) => Response | void;
  onError?: (error: Error, req: NextRequest | any, res?: any) => Response | void;
}

/**
 * Default user extractor
 */
function defaultGetUser(req: any): RBACUser | undefined {
  return req.user || req.auth?.user;
}

/**
 * Default unauthorized handler for App Router
 */
function defaultOnUnauthorizedAppRouter(result: AuthorizationResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message: result.reason || 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Default unauthorized handler for Pages Router
 */
function defaultOnUnauthorizedPagesRouter(result: AuthorizationResult, req: any, res: any): void {
  res.status(403).json({
    error: 'Forbidden',
    message: result.reason || 'Insufficient permissions',
    code: 'INSUFFICIENT_PERMISSIONS'
  });
}

/**
 * Default error handler for App Router
 */
function defaultOnErrorAppRouter(error: Error): Response {
  console.error('RBAC Error:', error);
  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      message: 'Authorization check failed',
      code: 'AUTHORIZATION_ERROR'
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Default error handler for Pages Router
 */
function defaultOnErrorPagesRouter(error: Error, req: any, res: any): void {
  console.error('RBAC Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Authorization check failed',
    code: 'AUTHORIZATION_ERROR'
  });
}

/**
 * Next.js RBAC adapter class
 */
export class NextRBACAdapter {
  private rbac: RBAC;
  private options: Required<NextRBACOptions>;

  constructor(rbac: RBAC, options: NextRBACOptions = {}) {
    this.rbac = rbac;
    this.options = {
      getUser: options.getUser || defaultGetUser,
      onUnauthorized: options.onUnauthorized || defaultOnUnauthorizedAppRouter,
      onError: options.onError || defaultOnErrorAppRouter,
    };
  }

  /**
   * Middleware for Next.js App Router
   * Use in middleware.ts
   */
  middleware(permission: string) {
    return async (request: NextRequest): Promise<Response | undefined> => {
      try {
        const user = await this.options.getUser(request);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in request'
          };
          return this.options.onUnauthorized(result, request) as Response;
        }

        const result = this.rbac.authorize(user, permission);

        if (!result.allowed) {
          return this.options.onUnauthorized(result, request) as Response;
        }

        // Allow request to continue
        return undefined;
      } catch (error) {
        return this.options.onError(error as Error, request) as Response;
      }
    };
  }

  /**
   * HOC for App Router route handlers
   * Use in app/api routes (route.ts files)
   */
  withPermission<T extends (...args: any[]) => any>(permission: string, handler: T): T {
    return (async (...args: any[]) => {
      const request = args[0] as NextRequest;

      try {
        const user = await this.options.getUser(request);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in request'
          };
          return this.options.onUnauthorized(result, request);
        }

        const result = this.rbac.authorize(user, permission);

        if (!result.allowed) {
          return this.options.onUnauthorized(result, request);
        }

        return handler(...args);
      } catch (error) {
        return this.options.onError(error as Error, request);
      }
    }) as T;
  }

  /**
   * HOC for App Router route handlers with role check
   */
  withRole<T extends (...args: any[]) => any>(role: string, handler: T): T {
    return (async (...args: any[]) => {
      const request = args[0] as NextRequest;

      try {
        const user = await this.options.getUser(request);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in request'
          };
          return this.options.onUnauthorized(result, request);
        }

        if (!user.roles || !user.roles.includes(role)) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `User lacks required role: ${role}`,
            user
          };
          return this.options.onUnauthorized(result, request);
        }

        return handler(...args);
      } catch (error) {
        return this.options.onError(error as Error, request);
      }
    }) as T;
  }

  /**
   * HOC for Pages Router API routes
   * Use in pages/api/*
   */
  withPermissionPagesRouter(permission: string, handler: any) {
    return async (req: any, res: any) => {
      try {
        const user = await this.options.getUser(req);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in request'
          };
          return defaultOnUnauthorizedPagesRouter(result, req, res);
        }

        const result = this.rbac.authorize(user, permission);

        if (!result.allowed) {
          return defaultOnUnauthorizedPagesRouter(result, req, res);
        }

        return handler(req, res);
      } catch (error) {
        return defaultOnErrorPagesRouter(error as Error, req, res);
      }
    };
  }

  /**
   * HOC for Pages Router with role check
   */
  withRolePagesRouter(role: string, handler: any) {
    return async (req: any, res: any) => {
      try {
        const user = await this.options.getUser(req);

        if (!user) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'No user found in request'
          };
          return defaultOnUnauthorizedPagesRouter(result, req, res);
        }

        if (!user.roles || !user.roles.includes(role)) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: `User lacks required role: ${role}`,
            user
          };
          return defaultOnUnauthorizedPagesRouter(result, req, res);
        }

        return handler(req, res);
      } catch (error) {
        return defaultOnErrorPagesRouter(error as Error, req, res);
      }
    };
  }

  /**
   * Check permission in Server Component or Server Action
   */
  async checkPermission(user: RBACUser, permission: string): Promise<AuthorizationResult> {
    return this.rbac.authorize(user, permission);
  }

  /**
   * Throw error if permission denied (for Server Actions)
   */
  async requirePermission(user: RBACUser, permission: string): Promise<void> {
    const result = this.rbac.authorize(user, permission);
    if (!result.allowed) {
      throw new Error(result.reason || 'Insufficient permissions');
    }
  }

  /**
   * Throw error if role is missing (for Server Actions)
   */
  async requireRole(user: RBACUser, role: string): Promise<void> {
    if (!user.roles?.includes(role)) {
      throw new Error(`User does not have required role: ${role}`);
    }
  }

  /**
   * Get RBAC instance
   */
  getRBAC(): RBAC {
    return this.rbac;
  }
}

// Export helper functions for common use cases

/**
 * Create permission checker for App Router
 */
export function createPermissionChecker(rbac: RBAC, getUser: (req: NextRequest) => RBACUser | Promise<RBACUser>) {
  return async (request: NextRequest, permission: string): Promise<boolean> => {
    try {
      const user = await getUser(request);
      return rbac.hasPermission(user, permission);
    } catch {
      return false;
    }
  };
}

/**
 * Create role checker for App Router
 */
export function createRoleChecker(getUser: (req: NextRequest) => RBACUser | Promise<RBACUser>) {
  return async (request: NextRequest, role: string): Promise<boolean> => {
    try {
      const user = await getUser(request);
      return user.roles?.includes(role) || false;
    } catch {
      return false;
    }
  };
}
