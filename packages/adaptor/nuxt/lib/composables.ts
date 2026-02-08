import { computed, type ComputedRef } from 'vue';
// @ts-expect-error - Nuxt-specific import alias
import { useNuxtApp, useState } from '#app';
import type { RBAC, RBACUser, AuthorizationResult } from '@fire-shield/core';

/**
 * Use Fire Shield RBAC
 */
export function useFireShield() {
  const nuxtApp = useNuxtApp();
  const rbac = nuxtApp.$rbac as RBAC;

  // Get current user from state
  const user = useState<RBACUser | null>('fireShield:user', () => null);

  /**
   * Check if user has permission
   */
  const can = (permission: string): ComputedRef<boolean> => {
    return computed(() => {
      if (!user.value || !rbac) return false;
      return rbac.hasPermission(user.value, permission);
    });
  };

  /**
   * Check if user has role
   */
  const hasRole = (role: string): ComputedRef<boolean> => {
    return computed(() => {
      if (!user.value) return false;
      return user.value.roles?.includes(role) || false;
    });
  };

  /**
   * Get authorization result
   */
  const authorize = (permission: string): ComputedRef<AuthorizationResult> => {
    return computed(() => {
      if (!user.value || !rbac) {
        return {
          allowed: false,
          reason: 'No user or RBAC instance'
        };
      }
      return rbac.authorize(user.value, permission);
    });
  };

  /**
   * Check if user has all permissions
   */
  const hasAll = (...permissions: string[]): ComputedRef<boolean> => {
    return computed(() => {
      if (!user.value || !rbac) return false;
      return rbac.hasAllPermissions(user.value, permissions);
    });
  };

  /**
   * Check if user has any permission
   */
  const hasAny = (...permissions: string[]): ComputedRef<boolean> => {
    return computed(() => {
      if (!user.value || !rbac) return false;
      return rbac.hasAnyPermission(user.value, permissions);
    });
  };

  return {
    can,
    hasRole,
    authorize,
    hasAll,
    hasAny,
    rbac,
    user
  };
}

/**
 * Use RBAC instance directly
 */
export function useRBAC(): RBAC {
  const nuxtApp = useNuxtApp();
  return nuxtApp.$rbac as RBAC;
}
