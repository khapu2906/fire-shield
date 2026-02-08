import React, { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * RBAC Context
 */
interface RBACContextValue {
  rbac: RBAC;
  user: RBACUser | null;
  deniedTrigger: number;
  triggerDeniedUpdate: () => void;
}

const RBACContext = createContext<RBACContextValue | null>(null);

/**
 * RBAC Provider Props
 */
export interface RBACProviderProps {
  rbac: RBAC;
  user: RBACUser | null;
  children: ReactNode;
}

/**
 * RBAC Provider Component
 */
export function RBACProvider({ rbac, user, children }: RBACProviderProps) {
  const [deniedTrigger, setDeniedTrigger] = useState(0);

  const triggerDeniedUpdate = useCallback(() => {
    setDeniedTrigger(prev => prev + 1);
  }, []);

  const contextValue = useMemo(() => ({
    rbac,
    user,
    deniedTrigger,
    triggerDeniedUpdate
  }), [rbac, user, deniedTrigger, triggerDeniedUpdate]);

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

/**
 * Use RBAC hook
 */
export function useRBAC(): RBAC {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context.rbac;
}

/**
 * Use current user hook
 */
export function useUser(): RBACUser | null {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useUser must be used within RBACProvider');
  }
  return context.user;
}

/**
 * Use permission hook
 */
export function usePermission(permission: string): boolean {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('usePermission must be used within RBACProvider');
  }

  const { rbac, user, deniedTrigger } = context;

  return useMemo(() => {
    if (!user) return false;

    // Check if permission is denied
    const deniedPermissions = rbac.getDeniedPermissions(user.id);
    const isDenied = deniedPermissions.some(denied => {
      if (denied === permission) return true;
      if (denied.includes('*')) {
        const pattern = denied.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(permission);
      }
      return false;
    });

    // If denied, return false regardless of whether user has the permission
    if (isDenied) return false;

    return rbac.hasPermission(user, permission);
  }, [rbac, user, permission, deniedTrigger]);
}

/**
 * Use role hook
 */
export function useRole(role: string): boolean {
  const user = useUser();
  if (!user) return false;
  return user.roles?.includes(role) || false;
}

/**
 * Use authorize hook
 */
export function useAuthorize(permission: string): AuthorizationResult {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useAuthorize must be used within RBACProvider');
  }

  const { rbac, user } = context;
  if (!user) {
    return {
      allowed: false,
      reason: 'No user found'
    };
  }

  return rbac.authorize(user, permission);
}

/**
 * Use multiple permissions (AND logic)
 */
export function useAllPermissions(...permissions: string[]): boolean {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useAllPermissions must be used within RBACProvider');
  }

  const { rbac, user } = context;
  if (!user) return false;

  return rbac.hasAllPermissions(user, permissions);
}

/**
 * Use multiple permissions (OR logic)
 */
export function useAnyPermission(...permissions: string[]): boolean {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useAnyPermission must be used within RBACProvider');
  }

  const { rbac, user } = context;
  if (!user) return false;

  return rbac.hasAnyPermission(user, permissions);
}

/**
 * Use deny permission hook
 * Returns a function to deny a permission for the current user
 */
export function useDenyPermission(): (permission: string) => void {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useDenyPermission must be used within RBACProvider');
  }

  const { rbac, user, triggerDeniedUpdate } = context;

  return useCallback((permission: string) => {
    if (!user) {
      throw new Error('Cannot deny permission: No user found');
    }
    rbac.denyPermission(user.id, permission);
    triggerDeniedUpdate(); // Trigger re-render
  }, [rbac, user, triggerDeniedUpdate]);
}

/**
 * Use allow permission hook (remove deny)
 * Returns a function to remove a denied permission for the current user
 */
export function useAllowPermission(): (permission: string) => void {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useAllowPermission must be used within RBACProvider');
  }

  const { rbac, user, triggerDeniedUpdate } = context;

  return useCallback((permission: string) => {
    if (!user) {
      throw new Error('Cannot allow permission: No user found');
    }
    rbac.allowPermission(user.id, permission);
    triggerDeniedUpdate(); // Trigger re-render
  }, [rbac, user, triggerDeniedUpdate]);
}

/**
 * Use denied permissions hook
 * Returns array of denied permissions for the current user
 */
export function useDeniedPermissions(): string[] {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useDeniedPermissions must be used within RBACProvider');
  }

  const { rbac, user } = context;
  if (!user) return [];

  return rbac.getDeniedPermissions(user.id);
}

/**
 * Check if user has a denied permission
 */
export function useIsDenied(permission: string): boolean {
  const deniedPermissions = useDeniedPermissions();
  const { rbac } = useContext(RBACContext)!;

  // Check exact match or wildcard match
  return deniedPermissions.some(denied => {
    if (denied === permission) return true;
    if (denied.includes('*')) {
      const pattern = denied.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(permission);
    }
    return false;
  });
}

/**
 * Protected Route Props
 */
export interface ProtectedRouteProps {
  permission?: string;
  role?: string;
  fallback?: ReactNode;
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Protected Route Component
 *
 * Note: Requires react-router-dom to be installed for the Navigate component.
 */
export function ProtectedRoute({
  permission,
  role,
  fallback,
  redirectTo,
  children
}: ProtectedRouteProps) {
  const context = useContext(RBACContext);

  if (!context) {
    throw new Error('ProtectedRoute must be used within RBACProvider');
  }

  const { rbac, user } = context;

  // Check if user exists
  if (!user) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : null;
  }

  // Check permission
  if (permission) {
    const hasPermission = rbac.hasPermission(user, permission);
    if (!hasPermission) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      return fallback ? <>{fallback}</> : null;
    }
  }

  // Check role
  if (role) {
    const hasRole = user.roles?.includes(role) || false;
    if (!hasRole) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      return fallback ? <>{fallback}</> : null;
    }
  }

  return <>{children}</>;
}

/**
 * Can Component Props
 */
export interface CanProps {
  permission?: string;
  role?: string;
  children: ReactNode | ((props: { allowed: boolean }) => ReactNode);
}

/**
 * Can Component - Render if user has permission/role
 */
export function Can({ permission, role, children }: CanProps) {
  const hasPermission = permission ? usePermission(permission) : true;
  const hasRole = role ? useRole(role) : true;

  const allowed = hasPermission && hasRole;

  if (typeof children === 'function') {
    return <>{children({ allowed })}</>;
  }

  return allowed ? <>{children}</> : null;
}

/**
 * Cannot Component - Render if user lacks permission/role
 */
export function Cannot({ permission, role, children }: CanProps) {
  const hasPermission = permission ? usePermission(permission) : true;
  const hasRole = role ? useRole(role) : true;

  const allowed = hasPermission && hasRole;

  return !allowed ? <>{children}</> : null;
}

/**
 * Require Permission Component
 * Throws error if permission denied (for error boundaries)
 */
export interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const result = useAuthorize(permission);

  if (!result.allowed) {
    throw new Error(result.reason || 'Permission denied');
  }

  return <>{children}</>;
}

/**
 * Denied Component Props
 */
export interface DeniedProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Denied Component - Render if user is explicitly denied permission
 * Shows children if denied, shows fallback if not denied
 */
export function Denied({ permission, fallback, children }: DeniedProps) {
  const isDenied = useIsDenied(permission);

  if (isDenied) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

/**
 * NotDenied Component - Render if user is NOT denied permission
 * Opposite of Denied component
 */
export function NotDenied({ permission, fallback, children }: DeniedProps) {
  const isDenied = useIsDenied(permission);

  if (!isDenied) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
