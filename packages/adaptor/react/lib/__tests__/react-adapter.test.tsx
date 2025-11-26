import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { RBAC } from '@fire-shield/core';
import * as matchers from '@testing-library/jest-dom/matchers';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
}

expect.extend(matchers);

import {
  RBACProvider,
  useRBAC,
  useUser,
  usePermission,
  useRole,
  useAuthorize,
  Can,
  Cannot,
  ProtectedRoute,
  useDenyPermission,
  useAllowPermission,
  useDeniedPermissions,
  useIsDenied,
  Denied,
  NotDenied
} from '../index';

// Helper component to test hooks
function TestHooks() {
  const rbac = useRBAC();
  const user = useUser();
  const canWrite = usePermission('post:write');
  const isAdmin = useRole('admin');
  const authorizeResult = useAuthorize('post:delete');

  return (
    <div>
      <div data-testid="rbac-exists">{rbac ? 'yes' : 'no'}</div>
      <div data-testid="user-id">{user?.id || 'none'}</div>
      <div data-testid="can-write">{canWrite ? 'yes' : 'no'}</div>
      <div data-testid="is-admin">{isAdmin ? 'yes' : 'no'}</div>
      <div data-testid="authorize-allowed">{authorizeResult.allowed ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('React RBAC Adapter', () => {
  let rbac: RBAC;
  const user = { id: 'user-1', roles: ['editor'] };

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);
  });

  afterEach(() => {
    cleanup();
  });

  describe('RBACProvider', () => {
    it('should provide RBAC context to children', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('rbac-exists')).toHaveTextContent('yes');
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-1');
    });

    it('should handle null user', () => {
      render(
        <RBACProvider rbac={rbac} user={null}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('user-id')).toHaveTextContent('none');
      expect(screen.getByTestId('can-write')).toHaveTextContent('no');
    });
  });

  describe('usePermission hook', () => {
    it('should return true when user has permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('can-write')).toHaveTextContent('yes');
    });

    it('should return false when user lacks permission', () => {
      render(
        <RBACProvider rbac={rbac} user={{ id: 'user-2', roles: ['viewer'] }}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('can-write')).toHaveTextContent('no');
    });
  });

  describe('useRole hook', () => {
    it('should return false when user lacks role', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('is-admin')).toHaveTextContent('no');
    });

    it('should return true when user has role', () => {
      render(
        <RBACProvider rbac={rbac} user={{ id: 'admin-1', roles: ['admin'] }}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('is-admin')).toHaveTextContent('yes');
    });
  });

  describe('useAuthorize hook', () => {
    it('should return authorization result', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <TestHooks />
        </RBACProvider>
      );

      expect(screen.getByTestId('authorize-allowed')).toHaveTextContent('no');
    });
  });

  describe('Can component', () => {
    it('should render children when user has permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <Can permission="post:write">
            <div data-testid="protected-content">Protected</div>
          </Can>
        </RBACProvider>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user lacks permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <Can permission="user:delete">
            <div data-testid="protected-content">Protected</div>
          </Can>
        </RBACProvider>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should work with role check', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <Can role="editor">
            <div data-testid="editor-content">Editor</div>
          </Can>
        </RBACProvider>
      );

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Cannot component', () => {
    it('should render children when user lacks permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <Cannot permission="user:delete">
            <div data-testid="fallback-content">No Access</div>
          </Cannot>
        </RBACProvider>
      );

      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });

    it('should not render children when user has permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <Cannot permission="post:write">
            <div data-testid="fallback-content">No Access</div>
          </Cannot>
        </RBACProvider>
      );

      expect(screen.queryByTestId('fallback-content')).not.toBeInTheDocument();
    });
  });

  describe('ProtectedRoute component', () => {
    it('should render children when user has permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <ProtectedRoute permission="post:write">
            <div data-testid="route-content">Route Content</div>
          </ProtectedRoute>
        </RBACProvider>
      );

      expect(screen.getByTestId('route-content')).toBeInTheDocument();
    });

    it('should render fallback when user lacks permission', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <ProtectedRoute
            permission="user:delete"
            fallback={<div data-testid="fallback">Unauthorized</div>}
          >
            <div data-testid="route-content">Route Content</div>
          </ProtectedRoute>
        </RBACProvider>
      );

      expect(screen.queryByTestId('route-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should work with role check', () => {
      render(
        <RBACProvider rbac={rbac} user={user}>
          <ProtectedRoute role="editor">
            <div data-testid="editor-route">Editor Route</div>
          </ProtectedRoute>
        </RBACProvider>
      );

      expect(screen.getByTestId('editor-route')).toBeInTheDocument();
    });
  });

  describe('Deny Permissions', () => {
    describe('useDenyPermission hook', () => {
      it('should deny permission for current user', async () => {
        function TestDeny() {
          const denyPermission = useDenyPermission();
          const hasPermission = usePermission('post:write');

          return (
            <div>
              <div data-testid="has-permission">{hasPermission ? 'yes' : 'no'}</div>
              <button onClick={() => denyPermission('post:write')}>Deny</button>
            </div>
          );
        }

        const { getByText } = render(
          <RBACProvider rbac={rbac} user={user}>
            <TestDeny />
          </RBACProvider>
        );

        expect(screen.getByTestId('has-permission')).toHaveTextContent('yes');

        getByText('Deny').click();

        // After deny, permission should be revoked
        await waitFor(() => {
          expect(screen.getByTestId('has-permission')).toHaveTextContent('no');
        });
      });

      it('should throw error when no user', () => {
        function TestDenyNoUser() {
          const denyPermission = useDenyPermission();

          return (
            <button onClick={() => denyPermission('post:write')}>Deny</button>
          );
        }

        const { getByText } = render(
          <RBACProvider rbac={rbac} user={null}>
            <TestDenyNoUser />
          </RBACProvider>
        );

        expect(() => getByText('Deny').click()).toThrow('Cannot deny permission: No user found');
      });
    });

    describe('useAllowPermission hook', () => {
      it('should remove denied permission', async () => {
        // First deny the permission
        rbac.denyPermission(user.id, 'post:write');

        function TestAllow() {
          const allowPermission = useAllowPermission();
          const hasPermission = usePermission('post:write');

          return (
            <div>
              <div data-testid="has-permission">{hasPermission ? 'yes' : 'no'}</div>
              <button onClick={() => allowPermission('post:write')}>Allow</button>
            </div>
          );
        }

        const { getByText } = render(
          <RBACProvider rbac={rbac} user={user}>
            <TestAllow />
          </RBACProvider>
        );

        expect(screen.getByTestId('has-permission')).toHaveTextContent('no');

        getByText('Allow').click();

        // After allow, permission should be granted again
        await waitFor(() => {
          expect(screen.getByTestId('has-permission')).toHaveTextContent('yes');
        });
      });
    });

    describe('useDeniedPermissions hook', () => {
      it('should return array of denied permissions', () => {
        rbac.denyPermission(user.id, 'post:delete');
        rbac.denyPermission(user.id, 'user:*');

        function TestDeniedList() {
          const deniedPermissions = useDeniedPermissions();

          return (
            <div data-testid="denied-list">
              {deniedPermissions.join(', ')}
            </div>
          );
        }

        render(
          <RBACProvider rbac={rbac} user={user}>
            <TestDeniedList />
          </RBACProvider>
        );

        const deniedList = screen.getByTestId('denied-list').textContent;
        expect(deniedList).toContain('post:delete');
        expect(deniedList).toContain('user:*');
      });

      it('should return empty array when no user', () => {
        function TestDeniedListNoUser() {
          const deniedPermissions = useDeniedPermissions();

          return (
            <div data-testid="denied-count">{deniedPermissions.length}</div>
          );
        }

        render(
          <RBACProvider rbac={rbac} user={null}>
            <TestDeniedListNoUser />
          </RBACProvider>
        );

        expect(screen.getByTestId('denied-count')).toHaveTextContent('0');
      });
    });

    describe('useIsDenied hook', () => {
      it('should return true for denied permission', () => {
        rbac.denyPermission(user.id, 'post:delete');

        function TestIsDenied() {
          const isDenied = useIsDenied('post:delete');

          return (
            <div data-testid="is-denied">{isDenied ? 'yes' : 'no'}</div>
          );
        }

        render(
          <RBACProvider rbac={rbac} user={user}>
            <TestIsDenied />
          </RBACProvider>
        );

        expect(screen.getByTestId('is-denied')).toHaveTextContent('yes');
      });

      it('should return false for non-denied permission', () => {
        function TestIsNotDenied() {
          const isDenied = useIsDenied('post:write');

          return (
            <div data-testid="is-denied">{isDenied ? 'yes' : 'no'}</div>
          );
        }

        render(
          <RBACProvider rbac={rbac} user={user}>
            <TestIsNotDenied />
          </RBACProvider>
        );

        expect(screen.getByTestId('is-denied')).toHaveTextContent('no');
      });

      it('should match wildcard denied permissions', () => {
        rbac.denyPermission(user.id, 'user:*');

        function TestWildcardDenied() {
          const isDeniedDelete = useIsDenied('user:delete');
          const isDeniedUpdate = useIsDenied('user:update');

          return (
            <div>
              <div data-testid="denied-delete">{isDeniedDelete ? 'yes' : 'no'}</div>
              <div data-testid="denied-update">{isDeniedUpdate ? 'yes' : 'no'}</div>
            </div>
          );
        }

        render(
          <RBACProvider rbac={rbac} user={user}>
            <TestWildcardDenied />
          </RBACProvider>
        );

        expect(screen.getByTestId('denied-delete')).toHaveTextContent('yes');
        expect(screen.getByTestId('denied-update')).toHaveTextContent('yes');
      });
    });

    describe('Denied component', () => {
      it('should render children when permission is denied', () => {
        rbac.denyPermission(user.id, 'post:delete');

        render(
          <RBACProvider rbac={rbac} user={user}>
            <Denied permission="post:delete">
              <div data-testid="denied-content">You are denied</div>
            </Denied>
          </RBACProvider>
        );

        expect(screen.getByTestId('denied-content')).toBeInTheDocument();
      });

      it('should render fallback when permission is not denied', () => {
        render(
          <RBACProvider rbac={rbac} user={user}>
            <Denied
              permission="post:delete"
              fallback={<div data-testid="not-denied">You are allowed</div>}
            >
              <div data-testid="denied-content">You are denied</div>
            </Denied>
          </RBACProvider>
        );

        expect(screen.queryByTestId('denied-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('not-denied')).toBeInTheDocument();
      });

      it('should work with wildcard denies', () => {
        rbac.denyPermission(user.id, 'admin:*');

        render(
          <RBACProvider rbac={rbac} user={user}>
            <Denied permission="admin:delete">
              <div data-testid="denied-admin">Admin denied</div>
            </Denied>
          </RBACProvider>
        );

        expect(screen.getByTestId('denied-admin')).toBeInTheDocument();
      });
    });

    describe('NotDenied component', () => {
      it('should render children when permission is not denied', () => {
        render(
          <RBACProvider rbac={rbac} user={user}>
            <NotDenied permission="post:write">
              <div data-testid="allowed-content">You can write</div>
            </NotDenied>
          </RBACProvider>
        );

        expect(screen.getByTestId('allowed-content')).toBeInTheDocument();
      });

      it('should render fallback when permission is denied', () => {
        rbac.denyPermission(user.id, 'post:delete');

        render(
          <RBACProvider rbac={rbac} user={user}>
            <NotDenied
              permission="post:delete"
              fallback={<div data-testid="denied-fallback">Denied</div>}
            >
              <div data-testid="allowed-content">You can delete</div>
            </NotDenied>
          </RBACProvider>
        );

        expect(screen.queryByTestId('allowed-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('denied-fallback')).toBeInTheDocument();
      });
    });
  });
});
