/**
 * Fire Shield React Native Adapter
 * React Native hooks and components for RBAC
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { RBAC, RBACUser } from '@fire-shield/core';

/**
 * RBAC Context for React Native
 */
export interface RBACContextValue {
  rbac: RBAC;
  user?: RBACUser;
}

const RBACContext = createContext<RBACContextValue | undefined>(undefined);

/**
 * RBAC Provider Props
 */
export interface RBACProviderProps {
  rbac: RBAC;
  user?: RBACUser;
  children: ReactNode;
}

/**
 * RBAC Provider Component
 * Wrap your app with this provider to use RBAC hooks
 */
export function RBACProvider({ rbac, user, children }: RBACProviderProps) {
  const value = useMemo(() => ({ rbac, user }), [rbac, user]);

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * Hook to access RBAC context
 * @throws Error if used outside RBACProvider
 */
export function useRBAC(): RBACContextValue {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific permission
 * @param permission Permission to check
 * @returns boolean indicating if user has permission
 */
export function usePermission(permission: string): boolean {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    if (!user) return false;
    return rbac.hasPermission(user, permission);
  }, [rbac, user, permission]);
}

/**
 * Hook to check if user has any of the specified permissions
 * @param permissions Array of permissions to check
 * @returns boolean indicating if user has any permission
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    if (!user) return false;
    return permissions.some((perm) => rbac.hasPermission(user, perm));
  }, [rbac, user, permissions]);
}

/**
 * Hook to check if user has all of the specified permissions
 * @param permissions Array of permissions to check
 * @returns boolean indicating if user has all permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    if (!user) return false;
    return permissions.every((perm) => rbac.hasPermission(user, perm));
  }, [rbac, user, permissions]);
}

/**
 * Hook to check if user has a specific role
 * @param role Role to check
 * @returns boolean indicating if user has role
 */
export function useRole(role: string): boolean {
  const { user } = useRBAC();

  return useMemo(() => {
    if (!user) return false;
    return user.roles.includes(role);
  }, [user, role]);
}

/**
 * Hook to check if user has any of the specified roles
 * @param roles Array of roles to check
 * @returns boolean indicating if user has any role
 */
export function useAnyRole(roles: string[]): boolean {
  const { user } = useRBAC();

  return useMemo(() => {
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  }, [user, roles]);
}

/**
 * Hook to check if user is authenticated
 * @returns boolean indicating if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user } = useRBAC();
  return !!user;
}

/**
 * Hook to deny permission for current user
 * @returns Function to deny a permission
 */
export function useDenyPermission(): (permission: string) => void {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    return (permission: string) => {
      if (!user) {
        throw new Error('Cannot deny permission: No user found');
      }
      rbac.denyPermission(user.id, permission);
    };
  }, [rbac, user]);
}

/**
 * Hook to allow (remove deny) permission for current user
 * @returns Function to allow a previously denied permission
 */
export function useAllowPermission(): (permission: string) => void {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    return (permission: string) => {
      if (!user) {
        throw new Error('Cannot allow permission: No user found');
      }
      rbac.allowPermission(user.id, permission);
    };
  }, [rbac, user]);
}

/**
 * Hook to get denied permissions for current user
 * @returns Array of denied permissions
 */
export function useDeniedPermissions(): string[] {
  const { rbac, user } = useRBAC();

  return useMemo(() => {
    if (!user) return [];
    return rbac.getDeniedPermissions(user.id);
  }, [rbac, user]);
}

/**
 * Hook to check if a permission is denied for current user
 * @param permission Permission to check
 * @returns boolean indicating if permission is denied
 */
export function useIsDenied(permission: string): boolean {
  const deniedPermissions = useDeniedPermissions();

  return useMemo(() => {
    return deniedPermissions.some((denied) => {
      if (denied === permission) return true;
      if (denied.includes('*')) {
        const pattern = denied.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(permission);
      }
      return false;
    });
  }, [deniedPermissions, permission]);
}

/**
 * Protected Component Props
 */
export interface ProtectedProps {
  /**
   * Required permission
   */
  permission?: string;

  /**
   * Required role
   */
  role?: string;

  /**
   * At least one of these permissions required
   */
  anyPermissions?: string[];

  /**
   * All of these permissions required
   */
  allPermissions?: string[];

  /**
   * At least one of these roles required
   */
  anyRoles?: string[];

  /**
   * Require authentication (default: true)
   */
  requireAuth?: boolean;

  /**
   * Content to render when authorized
   */
  children: ReactNode;

  /**
   * Content to render when not authorized (optional)
   */
  fallback?: ReactNode;
}

/**
 * Protected Component
 * Only renders children if user has required permissions/roles
 */
export function Protected({
  permission,
  role,
  anyPermissions,
  allPermissions,
  anyRoles,
  requireAuth = true,
  children,
  fallback = null,
}: ProtectedProps) {
  const { rbac, user } = useRBAC();

  const isAuthorized = useMemo(() => {
    // Check authentication requirement
    if (requireAuth && !user) {
      return false;
    }

    // If no user and auth not required, allow access
    if (!user) {
      return true;
    }

    // Check role requirement
    if (role && !user.roles.includes(role)) {
      return false;
    }

    // Check any roles requirement
    if (anyRoles && !anyRoles.some((r) => user.roles.includes(r))) {
      return false;
    }

    // Check permission requirement
    if (permission && !rbac.hasPermission(user, permission)) {
      return false;
    }

    // Check any permissions requirement
    if (anyPermissions && !anyPermissions.some((perm) => rbac.hasPermission(user, perm))) {
      return false;
    }

    // Check all permissions requirement
    if (allPermissions && !allPermissions.every((perm) => rbac.hasPermission(user, perm))) {
      return false;
    }

    return true;
  }, [rbac, user, permission, role, anyPermissions, allPermissions, anyRoles, requireAuth]);

  return <>{isAuthorized ? children : fallback}</>;
}

/**
 * Show Component - Opposite of Protected
 * Only renders when user does NOT have permission/role
 */
export interface ShowProps {
  when: 'unauthenticated' | 'unauthorized';
  permission?: string;
  role?: string;
  children: ReactNode;
}

/**
 * Show Component
 * Renders children based on authorization state
 */
export function Show({ when, permission, role, children }: ShowProps) {
  const { rbac, user } = useRBAC();

  const shouldShow = useMemo(() => {
    if (when === 'unauthenticated') {
      return !user;
    }

    if (!user) return false;

    if (when === 'unauthorized') {
      if (permission) {
        return !rbac.hasPermission(user, permission);
      }
      if (role) {
        return !user.roles.includes(role);
      }
    }

    return false;
  }, [when, user, rbac, permission, role]);

  return <>{shouldShow ? children : null}</>;
}

/**
 * Denied Component Props
 */
export interface DeniedProps {
  /**
   * Permission to check if denied
   */
  permission: string;

  /**
   * Content to render when permission is denied
   */
  children: ReactNode;

  /**
   * Content to render when permission is NOT denied (optional)
   */
  fallback?: ReactNode;
}

/**
 * Denied Component
 * Renders children only if the specified permission is explicitly denied
 */
export function Denied({ permission, children, fallback }: DeniedProps) {
  const isDenied = useIsDenied(permission);

  return <>{isDenied ? children : fallback || null}</>;
}

/**
 * NotDenied Component
 * Renders children only if the specified permission is NOT denied
 * Opposite of Denied component
 */
export function NotDenied({ permission, children, fallback }: DeniedProps) {
  const isDenied = useIsDenied(permission);

  return <>{!isDenied ? children : fallback || null}</>;
}
