/**
 * Fire Shield SvelteKit Adapter
 * Server-side hooks and page guards for SvelteKit
 */

import type { Handle, RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * RBAC context attached to SvelteKit event.locals
 */
export interface RBACLocals {
  rbac: RBAC;
  user?: RBACUser;
}

/**
 * Augment SvelteKit's Locals type to include RBAC properties
 */
declare global {
  namespace App {
    interface Locals extends RBACLocals {}
  }
}

/**
 * Extended SvelteKit event with RBAC
 */
export type RBACEvent = RequestEvent & {
  locals: RBACLocals;
};

/**
 * Options for RBAC hook
 */
export interface RBACHookOptions {
  /**
   * RBAC instance
   */
  rbac: RBAC;

  /**
   * Function to get user from request
   */
  getUser: (event: RequestEvent) => Promise<RBACUser | undefined> | RBACUser | undefined;

  /**
   * Attach user to locals (default: true)
   */
  attachUser?: boolean;
}

/**
 * Create RBAC handle hook for SvelteKit
 * Usage in hooks.server.ts
 */
export function createRBACHandle(options: RBACHookOptions): Handle {
  return async ({ event, resolve }) => {
    // Attach RBAC to locals
    event.locals.rbac = options.rbac;

    // Get and attach user if enabled
    if (options.attachUser !== false) {
      try {
        const user = await options.getUser(event);
        if (user) {
          event.locals.user = user;
        }
      } catch (err) {
        console.error('Failed to get user in RBAC hook:', err);
      }
    }

    return resolve(event);
  };
}

/**
 * Page guard options
 */
export interface PageGuardOptions {
  /**
   * Required permission
   */
  permission?: string;

  /**
   * Required role
   */
  role?: string;

  /**
   * Any of these permissions
   */
  anyPermissions?: string[];

  /**
   * All of these permissions
   */
  allPermissions?: string[];

  /**
   * Redirect to this path if unauthorized (default: '/login')
   */
  redirectTo?: string;

  /**
   * Custom error status code (default: 403)
   */
  errorStatus?: number;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Allow unauthenticated access (default: false)
   */
  allowUnauthenticated?: boolean;
}

/**
 * Guard page with permission check
 * Use in +page.server.ts load function
 */
export function guardPage(event: RBACEvent, options: PageGuardOptions): void {
  const { rbac, user } = event.locals;

  if (!rbac) {
    throw error(500, 'RBAC not configured');
  }

  // Check authentication
  if (!user && !options.allowUnauthenticated) {
    if (options.redirectTo) {
      throw redirect(302, options.redirectTo);
    }
    throw error(401, options.errorMessage || 'Authentication required');
  }

  if (!user) return; // Allow unauthenticated if enabled

  // Check permission
  if (options.permission) {
    const hasPermission = rbac.hasPermission(user, options.permission);
    if (!hasPermission) {
      if (options.redirectTo) {
        throw redirect(302, options.redirectTo);
      }
      throw error(
        options.errorStatus || 403,
        options.errorMessage || `Missing permission: ${options.permission}`
      );
    }
  }

  // Check role
  if (options.role) {
    const hasRole = user.roles.includes(options.role);
    if (!hasRole) {
      if (options.redirectTo) {
        throw redirect(302, options.redirectTo);
      }
      throw error(
        options.errorStatus || 403,
        options.errorMessage || `Missing role: ${options.role}`
      );
    }
  }

  // Check any permissions
  if (options.anyPermissions && options.anyPermissions.length > 0) {
    const hasAny = rbac.hasAnyPermission(user, options.anyPermissions);
    if (!hasAny) {
      if (options.redirectTo) {
        throw redirect(302, options.redirectTo);
      }
      throw error(
        options.errorStatus || 403,
        options.errorMessage || `Missing any of: ${options.anyPermissions.join(', ')}`
      );
    }
  }

  // Check all permissions
  if (options.allPermissions && options.allPermissions.length > 0) {
    const hasAll = rbac.hasAllPermissions(user, options.allPermissions);
    if (!hasAll) {
      if (options.redirectTo) {
        throw redirect(302, options.redirectTo);
      }
      throw error(
        options.errorStatus || 403,
        options.errorMessage || `Missing all of: ${options.allPermissions.join(', ')}`
      );
    }
  }
}

/**
 * Check permission in load function
 */
export function checkPermission(
  event: RBACEvent,
  permission: string
): boolean {
  const { rbac, user } = event.locals;
  if (!rbac || !user) return false;
  return rbac.hasPermission(user, permission);
}

/**
 * Check role in load function
 */
export function checkRole(event: RBACEvent, role: string): boolean {
  const { user } = event.locals;
  if (!user) return false;
  return user.roles.includes(role);
}

/**
 * Authorize user for permission
 */
export function authorize(
  event: RBACEvent,
  permission: string
): AuthorizationResult {
  const { rbac, user } = event.locals;

  if (!rbac) {
    return {
      allowed: false,
      reason: 'RBAC not configured',
    };
  }

  if (!user) {
    return {
      allowed: false,
      reason: 'User not authenticated',
    };
  }

  return rbac.authorize(user, permission);
}

/**
 * Deny permission for user
 */
export function denyPermission(
  event: RBACEvent,
  permission: string
): void {
  const { rbac, user } = event.locals;

  if (!rbac) {
    throw error(500, 'RBAC not configured');
  }

  if (!user) {
    throw error(401, 'User not authenticated');
  }

  rbac.denyPermission(user.id, permission);
}

/**
 * Allow permission for user (remove deny)
 */
export function allowPermission(
  event: RBACEvent,
  permission: string
): void {
  const { rbac, user } = event.locals;

  if (!rbac) {
    throw error(500, 'RBAC not configured');
  }

  if (!user) {
    throw error(401, 'User not authenticated');
  }

  rbac.allowPermission(user.id, permission);
}

/**
 * Get denied permissions for user
 */
export function getDeniedPermissions(event: RBACEvent): string[] {
  const { rbac, user } = event.locals;

  if (!rbac || !user) {
    return [];
  }

  return rbac.getDeniedPermissions(user.id);
}

/**
 * Check if permission is NOT denied - guard version
 */
export function guardNotDenied(
  event: RBACEvent,
  permission: string,
  options?: Pick<PageGuardOptions, 'redirectTo' | 'errorStatus' | 'errorMessage'>
): void {
  const { rbac, user } = event.locals;

  if (!rbac) {
    throw error(500, 'RBAC not configured');
  }

  if (!user) {
    throw error(401, 'User not authenticated');
  }

  const deniedPermissions = rbac.getDeniedPermissions(user.id);
  const isDenied = deniedPermissions.some((denied) => {
    if (denied === permission) return true;
    if (denied.includes('*')) {
      const pattern = denied.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(permission);
    }
    return false;
  });

  if (isDenied) {
    if (options?.redirectTo) {
      throw redirect(302, options.redirectTo);
    }
    throw error(
      options?.errorStatus || 403,
      options?.errorMessage || `Permission "${permission}" is explicitly denied`
    );
  }
}

/**
 * Helper to create protected load function
 */
export function protectedLoad<T>(
  loadFn: (event: RBACEvent) => Promise<T> | T,
  guardOptions: PageGuardOptions
) {
  return async (event: RBACEvent): Promise<T> => {
    guardPage(event, guardOptions);
    return loadFn(event);
  };
}

/**
 * Helper to create protected action
 */
export function protectedAction<T>(
  actionFn: (event: RBACEvent) => Promise<T> | T,
  guardOptions: PageGuardOptions
) {
  return async (event: RBACEvent): Promise<T> => {
    guardPage(event, guardOptions);
    return actionFn(event);
  };
}
