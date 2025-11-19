import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
  ProtectedRoute
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
});
