import { writable, derived, type Readable, type Writable } from 'svelte/store';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Svelte RBAC Store
 */
export interface SvelteRBACStore {
  rbac: RBAC;
  user: Writable<RBACUser | null>;
  can: (permission: string) => Readable<boolean>;
  hasRole: (role: string) => Readable<boolean>;
  authorize: (permission: string) => Readable<AuthorizationResult>;
  canAll: (permissions: string[]) => Readable<boolean>;
  canAny: (permissions: string[]) => Readable<boolean>;
}

/**
 * Create Svelte RBAC Store
 */
export function createRBACStore(rbac: RBAC, initialUser: RBACUser | null = null): SvelteRBACStore {
  const user = writable<RBACUser | null>(initialUser);

  return {
    rbac,
    user,

    can: (permission: string) => {
      return derived(user, ($user) => {
        if (!$user) return false;
        return rbac.hasPermission($user, permission);
      });
    },

    hasRole: (role: string) => {
      return derived(user, ($user) => {
        if (!$user) return false;
        return $user.roles?.includes(role) || false;
      });
    },

    authorize: (permission: string) => {
      return derived(user, ($user) => {
        if (!$user) {
          return {
            allowed: false,
            reason: 'No user found',
          };
        }
        return rbac.authorize($user, permission);
      });
    },

    canAll: (permissions: string[]) => {
      return derived(user, ($user) => {
        if (!$user) return false;
        return permissions.every((permission) => rbac.hasPermission($user, permission));
      });
    },

    canAny: (permissions: string[]) => {
      return derived(user, ($user) => {
        if (!$user) return false;
        return permissions.some((permission) => rbac.hasPermission($user, permission));
      });
    },
  };
}

/**
 * Svelte Action for conditional rendering based on permission
 *
 * Usage:
 * <div use:can={'post:write'}>Content</div>
 * <div use:can={{ permission: 'post:write', hide: true }}>Content</div>
 */
export function can(node: HTMLElement, params: string | { permission: string; hide?: boolean; store: SvelteRBACStore }) {
  let permission: string;
  let hide = false;
  let store: SvelteRBACStore | null = null;

  if (typeof params === 'string') {
    permission = params;
  } else {
    permission = params.permission;
    hide = params.hide || false;
    store = params.store || null;
  }

  if (!store) {
    console.error('[Fire Shield] Svelte action "can" requires a store parameter');
    return {};
  }

  const canStore = store.can(permission);

  const unsubscribe = canStore.subscribe((allowed) => {
    if (!allowed) {
      if (hide) {
        node.style.display = 'none';
      } else {
        node.remove();
      }
    } else {
      if (hide) {
        node.style.display = '';
      }
    }
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}

/**
 * Svelte Action for conditional rendering based on role
 *
 * Usage:
 * <div use:role={'admin'}>Content</div>
 * <div use:role={{ role: 'admin', hide: true }}>Content</div>
 */
export function role(node: HTMLElement, params: string | { role: string; hide?: boolean; store: SvelteRBACStore }) {
  let roleName: string;
  let hide = false;
  let store: SvelteRBACStore | null = null;

  if (typeof params === 'string') {
    roleName = params;
  } else {
    roleName = params.role;
    hide = params.hide || false;
    store = params.store || null;
  }

  if (!store) {
    console.error('[Fire Shield] Svelte action "role" requires a store parameter');
    return {};
  }

  const roleStore = store.hasRole(roleName);

  const unsubscribe = roleStore.subscribe((hasRole) => {
    if (!hasRole) {
      if (hide) {
        node.style.display = 'none';
      } else {
        node.remove();
      }
    } else {
      if (hide) {
        node.style.display = '';
      }
    }
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}

/**
 * Svelte Action for inverse conditional rendering (show when permission is NOT present)
 *
 * Usage:
 * <div use:cannot={'post:write'}>Upgrade to create posts</div>
 */
export function cannot(node: HTMLElement, params: string | { permission: string; hide?: boolean; store: SvelteRBACStore }) {
  let permission: string;
  let hide = false;
  let store: SvelteRBACStore | null = null;

  if (typeof params === 'string') {
    permission = params;
  } else {
    permission = params.permission;
    hide = params.hide || false;
    store = params.store || null;
  }

  if (!store) {
    console.error('[Fire Shield] Svelte action "cannot" requires a store parameter');
    return {};
  }

  const canStore = store.can(permission);

  const unsubscribe = canStore.subscribe((allowed) => {
    if (allowed) {
      if (hide) {
        node.style.display = 'none';
      } else {
        node.remove();
      }
    } else {
      if (hide) {
        node.style.display = '';
      }
    }
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}

/**
 * Export types
 */
export type { RBACUser, AuthorizationResult } from '@fire-shield/core';
export { RBAC } from '@fire-shield/core';
