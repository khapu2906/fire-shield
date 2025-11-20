import type { App, Directive, ComputedRef } from 'vue';
import { computed, inject, ref, type Ref, getCurrentInstance, watchEffect } from 'vue';
import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Vue Router RBAC options
 */
export interface VueRouterRBACOptions {
  /**
   * RBAC instance
   */
  rbac: RBAC;

  /**
   * Get current user (reactive)
   */
  getUser: () => RBACUser | null;

  /**
   * Route to redirect when unauthorized
   */
  unauthorizedRoute?: string;

  /**
   * Callback when unauthorized
   */
  onUnauthorized?: (to: RouteLocationNormalized, result: AuthorizationResult) => void;

  /**
   * Enable navigation guards
   */
  enableGuards?: boolean;
}

/**
 * Route meta for RBAC
 */
export interface RBACRouteMeta {
  /**
   * Required permission
   */
  permission?: string;

  /**
   * Required permissions (all must match)
   */
  permissions?: string[];

  /**
   * Any of these permissions
   */
  anyPermission?: string[];

  /**
   * Required role
   */
  role?: string;

  /**
   * Required roles (all must match)
   */
  roles?: string[];

  /**
   * Any of these roles
   */
  anyRole?: string[];

  /**
   * Public route (skip RBAC check)
   */
  public?: boolean;
}

/**
 * RBAC Symbol for injection
 */
const RBACSymbol = Symbol('RBAC');
const UserSymbol = Symbol('User');

/**
 * Use RBAC instance
 */
export function useRBAC(): RBAC {
  const rbac = inject<RBAC>(RBACSymbol);
  if (!rbac) {
    throw new Error('RBAC not provided. Did you install the plugin?');
  }
  return rbac;
}

/**
 * Use current user
 */
export function useUser(): Ref<RBACUser | null> {
  const user = inject<Ref<RBACUser | null>>(UserSymbol);
  if (!user) {
    throw new Error('User not provided. Did you install the plugin?');
  }
  return user;
}

/**
 * Check if user has permission (reactive)
 */
export function useCan(permission: string): ComputedRef<boolean> {
  const rbac = useRBAC();
  const user = useUser();

  return computed(() => {
    if (!user.value) return false;
    return rbac.hasPermission(user.value, permission);
  });
}

/**
 * Check if user has role (reactive)
 */
export function useRole(role: string): ComputedRef<boolean> {
  const user = useUser();

  return computed(() => {
    if (!user.value) return false;
    return user.value.roles?.includes(role) || false;
  });
}

/**
 * Get authorization result (reactive)
 */
export function useAuthorize(permission: string): ComputedRef<AuthorizationResult> {
  const rbac = useRBAC();
  const user = useUser();

  return computed(() => {
    if (!user.value) {
      return {
        allowed: false,
        reason: 'No user found'
      };
    }
    return rbac.authorize(user.value, permission);
  });
}

/**
 * Check if user has all permissions (reactive)
 */
export function useAllPermissions(...permissions: string[]): ComputedRef<boolean> {
  const rbac = useRBAC();
  const user = useUser();

  return computed(() => {
    if (!user.value) return false;
    return rbac.hasAllPermissions(user.value, permissions);
  });
}

/**
 * Check if user has any permission (reactive)
 */
export function useAnyPermission(...permissions: string[]): ComputedRef<boolean> {
  const rbac = useRBAC();
  const user = useUser();

  return computed(() => {
    if (!user.value) return false;
    return rbac.hasAnyPermission(user.value, permissions);
  });
}

/**
 * v-permission directive
 * Usage: v-permission="'posts:read'"
 */
const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding, vnode) {
    const instance = vnode.appContext;
    if (!instance) {
      el.style.display = 'none';
      return;
    }

    const rbac = instance.config.globalProperties.$rbac as RBAC;
    const user = instance.config.globalProperties.$user as Ref<RBACUser | null>;

    if (!rbac || !user) {
      el.style.display = 'none';
      return;
    }

    const checkPermission = () => {
      const hasPermission = user.value && rbac.hasPermission(user.value, binding.value);
      el.style.display = hasPermission ? '' : 'none';
    };

    // Initial check
    checkPermission();

    // Watch for user changes using watchEffect
    const stopWatch = watchEffect(checkPermission);

    // Store cleanup function
    (el as any)._permissionCleanup = stopWatch;
  },
  unmounted(el) {
    // Cleanup watcher
    if ((el as any)._permissionCleanup) {
      (el as any)._permissionCleanup();
      delete (el as any)._permissionCleanup;
    }
  }
};

/**
 * v-role directive
 * Usage: v-role="'admin'"
 */
const roleDirective: Directive<HTMLElement, string> = {
  mounted(el, binding, vnode) {
    const instance = vnode.appContext;
    if (!instance) {
      el.style.display = 'none';
      return;
    }

    const user = instance.config.globalProperties.$user as Ref<RBACUser | null>;

    if (!user) {
      el.style.display = 'none';
      return;
    }

    const checkRole = () => {
      const hasRole = user.value?.roles?.includes(binding.value) || false;
      el.style.display = hasRole ? '' : 'none';
    };

    // Initial check
    checkRole();

    // Watch for user changes using watchEffect
    const stopWatch = watchEffect(checkRole);

    // Store cleanup function
    (el as any)._roleCleanup = stopWatch;
  },
  unmounted(el) {
    // Cleanup watcher
    if ((el as any)._roleCleanup) {
      (el as any)._roleCleanup();
      delete (el as any)._roleCleanup;
    }
  }
};

/**
 * v-can directive (alias for v-permission)
 * Usage: v-can="'posts:read'"
 */
const canDirective: Directive<HTMLElement, string> = {
  mounted(el, binding, vnode) {
    const instance = vnode.appContext;
    if (!instance) {
      el.style.display = 'none';
      return;
    }

    const rbac = instance.config.globalProperties.$rbac as RBAC;
    const user = instance.config.globalProperties.$user as Ref<RBACUser | null>;

    if (!rbac || !user) {
      el.style.display = 'none';
      return;
    }

    const checkPermission = () => {
      const hasPermission = user.value && rbac.hasPermission(user.value, binding.value);
      el.style.display = hasPermission ? '' : 'none';
    };

    // Initial check
    checkPermission();

    // Watch for user changes using watchEffect
    const stopWatch = watchEffect(checkPermission);

    // Store cleanup function
    (el as any)._canCleanup = stopWatch;
  },
  unmounted(el) {
    // Cleanup watcher
    if ((el as any)._canCleanup) {
      (el as any)._canCleanup();
      delete (el as any)._canCleanup;
    }
  }
};

/**
 * v-cannot directive (inverse of v-can)
 * Usage: v-cannot="'posts:delete'"
 */
const cannotDirective: Directive<HTMLElement, string> = {
  mounted(el, binding, vnode) {
    const instance = vnode.appContext;
    if (!instance) {
      el.style.display = '';
      return;
    }

    const rbac = instance.config.globalProperties.$rbac as RBAC;
    const user = instance.config.globalProperties.$user as Ref<RBACUser | null>;

    if (!rbac || !user) {
      el.style.display = '';
      return;
    }

    const checkPermission = () => {
      const hasPermission = user.value && rbac.hasPermission(user.value, binding.value);
      el.style.display = hasPermission ? 'none' : '';
    };

    // Initial check
    checkPermission();

    // Watch for user changes using watchEffect
    const stopWatch = watchEffect(checkPermission);

    // Store cleanup function
    (el as any)._cannotCleanup = stopWatch;
  },
  unmounted(el) {
    // Cleanup watcher
    if ((el as any)._cannotCleanup) {
      (el as any)._cannotCleanup();
      delete (el as any)._cannotCleanup;
    }
  }
};

/**
 * Check route RBAC requirements
 */
function checkRouteAccess(
  to: RouteLocationNormalized,
  rbac: RBAC,
  user: RBACUser | null
): AuthorizationResult {
  const meta = to.meta as RBACRouteMeta;

  // Public route - allow access
  if (meta.public) {
    return { allowed: true };
  }

  // No user
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required'
    };
  }

  // Check single permission
  if (meta.permission) {
    const result = rbac.authorize(user, meta.permission);
    if (!result.allowed) return result;
  }

  // Check all permissions
  if (meta.permissions && meta.permissions.length > 0) {
    if (!rbac.hasAllPermissions(user, meta.permissions)) {
      return {
        allowed: false,
        reason: `Missing required permissions: ${meta.permissions.join(', ')}`,
        user
      };
    }
  }

  // Check any permission
  if (meta.anyPermission && meta.anyPermission.length > 0) {
    if (!rbac.hasAnyPermission(user, meta.anyPermission)) {
      return {
        allowed: false,
        reason: `Missing any of required permissions: ${meta.anyPermission.join(', ')}`,
        user
      };
    }
  }

  // Check single role
  if (meta.role) {
    if (!user.roles?.includes(meta.role)) {
      return {
        allowed: false,
        reason: `Missing required role: ${meta.role}`,
        user
      };
    }
  }

  // Check all roles
  if (meta.roles && meta.roles.length > 0) {
    const hasAllRoles = meta.roles.every(role => user.roles?.includes(role));
    if (!hasAllRoles) {
      return {
        allowed: false,
        reason: `Missing required roles: ${meta.roles.join(', ')}`,
        user
      };
    }
  }

  // Check any role
  if (meta.anyRole && meta.anyRole.length > 0) {
    const hasAnyRole = meta.anyRole.some(role => user.roles?.includes(role));
    if (!hasAnyRole) {
      return {
        allowed: false,
        reason: `Missing any of required roles: ${meta.anyRole.join(', ')}`,
        user
      };
    }
  }

  return { allowed: true };
}

/**
 * Create navigation guard
 */
function createNavigationGuard(options: VueRouterRBACOptions) {
  return (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const user = options.getUser();
    const result = checkRouteAccess(to, options.rbac, user);

    if (result.allowed) {
      next();
    } else {
      // Call unauthorized callback
      if (options.onUnauthorized) {
        options.onUnauthorized(to, result);
      }

      // Redirect to unauthorized route
      if (options.unauthorizedRoute) {
        next({
          path: options.unauthorizedRoute,
          query: { redirect: to.fullPath }
        });
      } else {
        next(false);
      }
    }
  };
}

/**
 * Vue Router RBAC Plugin
 */
export function createVueRouterRBAC(router: Router, options: VueRouterRBACOptions) {
  const userRef = ref<RBACUser | null>(options.getUser());

  // Watch for user changes (if getUser returns reactive value)
  // In production, you might want to make this more sophisticated
  const updateUser = () => {
    userRef.value = options.getUser();
  };

  // Install navigation guard if enabled
  if (options.enableGuards !== false) {
    router.beforeEach(createNavigationGuard({
      ...options,
      getUser: () => userRef.value
    }));
  }

  return {
    install(app: App) {
      // Provide RBAC and user
      app.provide(RBACSymbol, options.rbac);
      app.provide(UserSymbol, userRef);

      // Register directives
      app.directive('permission', permissionDirective);
      app.directive('role', roleDirective);
      app.directive('can', canDirective);
      app.directive('cannot', cannotDirective);

      // Expose global properties (optional)
      app.config.globalProperties.$rbac = options.rbac;
      app.config.globalProperties.$user = userRef;
      app.config.globalProperties.$updateUser = updateUser;
    },
    updateUser
  };
}

/**
 * Can component props
 */
export interface CanProps {
  permission?: string;
  role?: string;
}

// Export components
export { Can, Cannot, RequirePermission, ProtectedRoute } from './components';

// Export route helper
export { checkRouteAccess };
