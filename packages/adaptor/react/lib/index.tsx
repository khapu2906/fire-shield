import React, { createContext, useContext, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * RBAC Context
 */
interface RBACContextValue {
  rbac: RBAC;
  user: RBACUser | null;
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
  return (
    <RBACContext.Provider value={{ rbac, user }}>
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

  const { rbac, user } = context;
  if (!user) return false;

  return rbac.hasPermission(user, permission);
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
