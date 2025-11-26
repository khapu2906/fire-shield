/**
 * Fire Shield Expo Adapter
 * Optimized RBAC adapter for Expo managed workflow
 * Re-exports React Native adapter with Expo-specific utilities
 */

// Re-export everything from React Native adapter
export * from '@fire-shield/react-native';

import { useEffect, useState } from 'react';
import type { RBAC, RBACUser } from '@fire-shield/core';

// Declare React Native global
declare const __DEV__: boolean;

/**
 * Expo-specific: Hook to persist and restore user from AsyncStorage
 * @param storageKey Key to use for AsyncStorage
 * @returns Current user and setter function
 */
export function usePersistedUser(storageKey: string = '@fire-shield:user'): [
  RBACUser | undefined,
  (user: RBACUser | undefined) => Promise<void>
] {
  const [user, setUserState] = useState<RBACUser | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user from storage on mount
  useEffect(() => {
    async function loadUser() {
      try {
        // Dynamic import for Expo's AsyncStorage
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (mod) => mod.default
        );

        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setUserState(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load user from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    }

    loadUser();
  }, [storageKey]);

  // Function to update user and persist to storage
  const setUser = async (newUser: RBACUser | undefined) => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
        (mod) => mod.default
      );

      if (newUser) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem(storageKey);
      }
      setUserState(newUser);
    } catch (error) {
      console.warn('Failed to persist user to storage:', error);
      setUserState(newUser);
    }
  };

  return [user, setUser];
}

/**
 * Expo-specific: Hook to check app permissions (camera, location, etc.)
 * Useful for combining with RBAC permissions
 */
export function useExpoPermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const checkPermission = async (permissionType: string): Promise<boolean> => {
    try {
      // This is a placeholder - in real usage, import from expo-permissions
      // const { status } = await Permissions.askAsync(permissionType);
      // return status === 'granted';
      return true;
    } catch (error) {
      console.warn('Failed to check Expo permission:', error);
      return false;
    }
  };

  return { permissions, checkPermission };
}

/**
 * Expo-specific: Initialize RBAC from SecureStore
 * Useful for storing sensitive RBAC config
 */
export async function loadRBACConfigFromSecureStore(
  key: string = '@fire-shield:config'
): Promise<any | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    const stored = await SecureStore.getItemAsync(key);

    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load RBAC config from SecureStore:', error);
    return null;
  }
}

/**
 * Expo-specific: Save RBAC config to SecureStore
 */
export async function saveRBACConfigToSecureStore(
  config: any,
  key: string = '@fire-shield:config'
): Promise<boolean> {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, JSON.stringify(config));
    return true;
  } catch (error) {
    console.warn('Failed to save RBAC config to SecureStore:', error);
    return false;
  }
}

/**
 * Expo-specific: Hook for development mode debugging
 * Shows permission check logs in Expo DevTools
 */
export function useRBACDebug(enabled: boolean = __DEV__) {
  useEffect(() => {
    if (enabled && __DEV__) {
      console.log('[Fire Shield] RBAC Debug Mode Enabled');
    }
  }, [enabled]);

  return {
    logPermissionCheck: (user: RBACUser | undefined, permission: string, result: boolean) => {
      if (enabled && __DEV__) {
        console.log(`[Fire Shield] Permission Check:`, {
          user: user?.id,
          roles: user?.roles,
          permission,
          result,
        });
      }
    },
  };
}

/**
 * Expo-specific: Enhanced debug hook for deny permissions
 * Shows deny permission logs in Expo DevTools
 */
export function useDenyDebug(enabled: boolean = __DEV__) {
  useEffect(() => {
    if (enabled && __DEV__) {
      console.log('[Fire Shield] Deny Permission Debug Mode Enabled');
    }
  }, [enabled]);

  return {
    logDenyCheck: (user: RBACUser | undefined, permission: string, isDenied: boolean) => {
      if (enabled && __DEV__) {
        console.log(`[Fire Shield] Deny Permission Check:`, {
          user: user?.id,
          permission,
          isDenied,
          timestamp: new Date().toISOString(),
        });
      }
    },
    logDenyAction: (user: RBACUser | undefined, permission: string, action: 'deny' | 'allow') => {
      if (enabled && __DEV__) {
        console.warn(`[Fire Shield] Deny Permission ${action.toUpperCase()}:`, {
          user: user?.id,
          permission,
          action,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };
}

/**
 * Expo-specific: Hook to persist denied permissions to AsyncStorage
 * @param userId User ID to persist denied permissions for
 * @param storageKey Custom storage key (optional)
 * @returns Denied permissions array and sync function
 */
export function usePersistedDeniedPermissions(
  rbac: RBAC,
  userId?: string,
  storageKey: string = '@fire-shield:denied-permissions'
): [string[], () => Promise<void>] {
  const [deniedPermissions, setDeniedPermissions] = useState<string[]>([]);

  // Load from storage on mount
  useEffect(() => {
    async function loadDenied() {
      if (!userId) return;

      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (mod) => mod.default
        );

        const key = `${storageKey}:${userId}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const permissions = JSON.parse(stored);
          setDeniedPermissions(permissions);
        } else {
          // Load from RBAC instance
          const current = rbac.getDeniedPermissions(userId);
          setDeniedPermissions(current);
        }
      } catch (error) {
        console.warn('Failed to load denied permissions from storage:', error);
        if (userId) {
          setDeniedPermissions(rbac.getDeniedPermissions(userId));
        }
      }
    }

    loadDenied();
  }, [rbac, userId, storageKey]);

  // Function to sync denied permissions to storage
  const syncToStorage = async () => {
    if (!userId) return;

    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
        (mod) => mod.default
      );

      const current = rbac.getDeniedPermissions(userId);
      const key = `${storageKey}:${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(current));
      setDeniedPermissions(current);
    } catch (error) {
      console.warn('Failed to sync denied permissions to storage:', error);
    }
  };

  return [deniedPermissions, syncToStorage];
}

/**
 * Expo-specific: Wrapper for useDenyPermission with automatic storage sync
 * @param autoSync Whether to auto-sync to AsyncStorage after denying
 * @returns Function to deny permission with optional storage sync
 */
export function useDenyPermissionWithStorage(
  autoSync: boolean = true
): (permission: string) => Promise<void> {
  const [user, setUser] = usePersistedUser();
  // Note: This assumes RBAC is available in context via re-exported hooks

  return async (permission: string) => {
    if (!user) {
      throw new Error('Cannot deny permission: No user found');
    }

    try {
      // Import React Native hooks to get RBAC instance
      const { useRBAC } = await import('@fire-shield/react-native');
      // Note: This is conceptual - in practice you'd need access to RBAC instance

      if (autoSync) {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (mod) => mod.default
        );

        const key = `@fire-shield:denied-permissions:${user.id}`;
        const stored = await AsyncStorage.getItem(key);
        const denied = stored ? JSON.parse(stored) : [];

        if (!denied.includes(permission)) {
          denied.push(permission);
          await AsyncStorage.setItem(key, JSON.stringify(denied));
        }
      }
    } catch (error) {
      console.warn('Failed to sync deny permission to storage:', error);
    }
  };
}

/**
 * Expo-specific: Wrapper for useAllowPermission with automatic storage sync
 * @param autoSync Whether to auto-sync to AsyncStorage after allowing
 * @returns Function to allow permission with optional storage sync
 */
export function useAllowPermissionWithStorage(
  autoSync: boolean = true
): (permission: string) => Promise<void> {
  const [user] = usePersistedUser();

  return async (permission: string) => {
    if (!user) {
      throw new Error('Cannot allow permission: No user found');
    }

    if (autoSync) {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (mod) => mod.default
        );

        const key = `@fire-shield:denied-permissions:${user.id}`;
        const stored = await AsyncStorage.getItem(key);
        const denied = stored ? JSON.parse(stored) : [];

        const filtered = denied.filter((p: string) => p !== permission);
        await AsyncStorage.setItem(key, JSON.stringify(filtered));
      } catch (error) {
        console.warn('Failed to sync allow permission to storage:', error);
      }
    }
  };
}

/**
 * Expo-specific: Save denied permissions to SecureStore
 * Useful for sensitive permission data
 */
export async function saveDeniedPermissionsToSecureStore(
  userId: string,
  deniedPermissions: string[],
  key: string = '@fire-shield:denied-permissions'
): Promise<boolean> {
  try {
    const SecureStore = await import('expo-secure-store');
    const storageKey = `${key}:${userId}`;
    await SecureStore.setItemAsync(storageKey, JSON.stringify(deniedPermissions));
    return true;
  } catch (error) {
    console.warn('Failed to save denied permissions to SecureStore:', error);
    return false;
  }
}

/**
 * Expo-specific: Load denied permissions from SecureStore
 * Useful for restoring sensitive permission data
 */
export async function loadDeniedPermissionsFromSecureStore(
  userId: string,
  key: string = '@fire-shield:denied-permissions'
): Promise<string[] | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    const storageKey = `${key}:${userId}`;
    const stored = await SecureStore.getItemAsync(storageKey);

    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load denied permissions from SecureStore:', error);
    return null;
  }
}

// Type exports
export type { RBACUser } from '@fire-shield/core';
