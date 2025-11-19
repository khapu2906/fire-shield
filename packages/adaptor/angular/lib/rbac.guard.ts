import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RBACService } from './rbac.service';

/**
 * Route data interface for RBAC guards
 */
export interface RBACRouteData {
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

/**
 * Functional guard to protect routes based on permissions
 *
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [canActivatePermission],
 *   data: { permission: 'admin:access' }
 * }
 */
export const canActivatePermission: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const rbacService = inject(RBACService);
  const router = inject(Router);
  const data = route.data as RBACRouteData;

  // Single permission check
  if (data.permission) {
    const allowed = rbacService.can(data.permission);
    if (!allowed) {
      if (data.redirectTo) {
        router.navigate([data.redirectTo]);
      }
      return false;
    }
    return true;
  }

  // Multiple permissions check
  if (data.permissions && data.permissions.length > 0) {
    const allowed = data.requireAll
      ? rbacService.canAll(data.permissions)
      : rbacService.canAny(data.permissions);

    if (!allowed) {
      if (data.redirectTo) {
        router.navigate([data.redirectTo]);
      }
      return false;
    }
    return true;
  }

  // No permission specified, allow access
  return true;
};

/**
 * Functional guard to protect routes based on roles
 *
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [canActivateRole],
 *   data: { role: 'admin' }
 * }
 */
export const canActivateRole: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const rbacService = inject(RBACService);
  const router = inject(Router);
  const data = route.data as RBACRouteData;

  // Single role check
  if (data.role) {
    const allowed = rbacService.hasRole(data.role);
    if (!allowed) {
      if (data.redirectTo) {
        router.navigate([data.redirectTo]);
      }
      return false;
    }
    return true;
  }

  // Multiple roles check
  if (data.roles && data.roles.length > 0) {
    const user = rbacService.getUser();
    if (!user) {
      if (data.redirectTo) {
        router.navigate([data.redirectTo]);
      }
      return false;
    }

    const allowed = data.requireAll
      ? data.roles.every(role => user.roles?.includes(role))
      : data.roles.some(role => user.roles?.includes(role));

    if (!allowed) {
      if (data.redirectTo) {
        router.navigate([data.redirectTo]);
      }
      return false;
    }
    return true;
  }

  // No role specified, allow access
  return true;
};

/**
 * Combined guard for both permissions and roles
 *
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [canActivateRBAC],
 *   data: {
 *     permission: 'admin:access',
 *     role: 'admin',
 *     redirectTo: '/unauthorized'
 *   }
 * }
 */
export const canActivateRBAC: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  // Check permissions first
  const permissionAllowed = canActivatePermission(route, state);
  if (!permissionAllowed) return false;

  // Then check roles
  const roleAllowed = canActivateRole(route, state);
  if (!roleAllowed) return false;

  return true;
};
