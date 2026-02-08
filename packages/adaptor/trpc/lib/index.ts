/**
 * Fire Shield tRPC Adapter
 * Type-safe RPC middleware for RBAC permission checking
 */

import { TRPCError } from '@trpc/server';
import type { RBAC, RBACUser } from '@fire-shield/core';

export interface TRPCRBACContext {
  rbac: RBAC;
  user?: RBACUser;
}

export interface ProtectedMiddlewareOptions {
  /**
   * Required permission for this procedure
   */
  permission?: string;

  /**
   * Required role for this procedure
   */
  role?: string;

  /**
   * At least one of these permissions is required
   */
  anyPermissions?: string[];

  /**
   * All of these permissions are required
   */
  allPermissions?: string[];

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Require authenticated user (default: true)
   */
  requireAuth?: boolean;
}

/**
 * Create a protected tRPC middleware with RBAC permission checking
 */
export function createProtectedMiddleware<T extends TRPCRBACContext>(
  options: ProtectedMiddlewareOptions
) {
  return async ({ ctx, next }: { ctx: T; next: any }) => {
    // Check if RBAC is available
    if (!ctx.rbac) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'RBAC not configured in context',
      });
    }

    // Check authentication requirement
    if (options.requireAuth !== false && !ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    // If no user and auth not required, skip permission checks
    if (!ctx.user) {
      return next();
    }

    // Check role requirement
    if (options.role) {
      const hasRole = ctx.user.roles.includes(options.role);
      if (!hasRole) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: options.errorMessage || `Missing required role: ${options.role}`,
        });
      }
    }

    // Check single permission requirement
    if (options.permission) {
      const hasPermission = ctx.rbac.hasPermission(ctx.user, options.permission);
      if (!hasPermission) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: options.errorMessage || `Missing required permission: ${options.permission}`,
        });
      }
    }

    // Check any permissions requirement
    if (options.anyPermissions && options.anyPermissions.length > 0) {
      const hasAnyPermission = options.anyPermissions.some((perm) =>
        ctx.rbac.hasPermission(ctx.user!, perm)
      );

      if (!hasAnyPermission) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            options.errorMessage ||
            `Missing any of required permissions: ${options.anyPermissions.join(', ')}`,
        });
      }
    }

    // Check all permissions requirement
    if (options.allPermissions && options.allPermissions.length > 0) {
      const hasAllPermissions = options.allPermissions.every((perm) =>
        ctx.rbac.hasPermission(ctx.user!, perm)
      );

      if (!hasAllPermissions) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            options.errorMessage ||
            `Missing all required permissions: ${options.allPermissions.join(', ')}`,
        });
      }
    }

    return next();
  };
}

/**
 * Helper to check permission in tRPC procedure
 */
export function checkPermission<T extends TRPCRBACContext>(
  ctx: T,
  permission: string,
  errorMessage?: string
): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  const hasPermission = ctx.rbac.hasPermission(ctx.user, permission);

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: errorMessage || `Missing required permission: ${permission}`,
    });
  }
}

/**
 * Helper to check role in tRPC procedure
 */
export function checkRole<T extends TRPCRBACContext>(
  ctx: T,
  role: string,
  errorMessage?: string
): void {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  const hasRole = ctx.user.roles.includes(role);

  if (!hasRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: errorMessage || `Missing required role: ${role}`,
    });
  }
}

/**
 * Helper to check if user has any of the specified permissions
 */
export function checkAnyPermissions<T extends TRPCRBACContext>(
  ctx: T,
  permissions: string[],
  errorMessage?: string
): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  const hasAnyPermission = permissions.some((perm) =>
    ctx.rbac.hasPermission(ctx.user!, perm)
  );

  if (!hasAnyPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: errorMessage || `Missing any of required permissions: ${permissions.join(', ')}`,
    });
  }
}

/**
 * Helper to check if user has all of the specified permissions
 */
export function checkAllPermissions<T extends TRPCRBACContext>(
  ctx: T,
  permissions: string[],
  errorMessage?: string
): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  const hasAllPermissions = permissions.every((perm) =>
    ctx.rbac.hasPermission(ctx.user!, perm)
  );

  if (!hasAllPermissions) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: errorMessage || `Missing all required permissions: ${permissions.join(', ')}`,
    });
  }
}

/**
 * Check if permission is NOT denied - throws if denied
 * @param ctx tRPC context with RBAC
 * @param permission Permission to check
 * @param errorMessage Custom error message
 */
export function checkNotDenied(
  ctx: TRPCRBACContext,
  permission: string,
  errorMessage?: string
): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  const deniedPermissions = ctx.rbac.getDeniedPermissions(ctx.user.id);
  const isDenied = deniedPermissions.some((denied) => {
    if (denied === permission) return true;
    if (denied.includes('*')) {
      const pattern = denied.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(permission);
    }
    return false;
  });

  if (isDenied) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: errorMessage || `Permission "${permission}" is explicitly denied`,
    });
  }
}

/**
 * Deny permission for user in tRPC context
 * @param ctx tRPC context with RBAC
 * @param permission Permission to deny
 */
export function denyPermission(ctx: TRPCRBACContext, permission: string): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  ctx.rbac.denyPermission(ctx.user.id, permission);
}

/**
 * Allow (remove deny) permission for user in tRPC context
 * @param ctx tRPC context with RBAC
 * @param permission Permission to allow
 */
export function allowPermission(ctx: TRPCRBACContext, permission: string): void {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  ctx.rbac.allowPermission(ctx.user.id, permission);
}

/**
 * Get denied permissions for current user
 * @param ctx tRPC context with RBAC
 * @returns Array of denied permissions
 */
export function getDeniedPermissions(ctx: TRPCRBACContext): string[] {
  if (!ctx.rbac) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RBAC not configured in context',
    });
  }

  if (!ctx.user) {
    return [];
  }

  return ctx.rbac.getDeniedPermissions(ctx.user.id);
}
