import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBAC } from '@fire-shield/core';
import { NuxtRBACAdapter } from '../index';

// Mock H3Event
const createMockEvent = () => ({
  context: {
    user: { id: 'user-1', roles: ['editor'] }
  },
  node: {
    req: {},
    res: {}
  }
});

describe('NuxtRBACAdapter', () => {
  let rbac: RBAC;
  let adapter: NuxtRBACAdapter;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    adapter = new NuxtRBACAdapter(rbac);
  });

  describe('requirePermission()', () => {
    it('should not throw when user has permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requirePermission(event as any, 'post:read')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requirePermission(event as any, 'user:delete')
      ).rejects.toThrow('Forbidden');
    });

    it('should throw when no user is present', async () => {
      const event = createMockEvent();
      event.context.user = null as any;

      await expect(
        adapter.requirePermission(event as any, 'post:read')
      ).rejects.toThrow();
    });
  });

  describe('requireRole()', () => {
    it('should not throw when user has role', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireRole(event as any, 'editor')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks role', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireRole(event as any, 'admin')
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('requireResourceAction()', () => {
    it('should not throw when user has resource:action permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireResourceAction(event as any, 'post', 'read')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks resource:action permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireResourceAction(event as any, 'user', 'delete')
      ).rejects.toThrow();
    });
  });

  describe('requireAll()', () => {
    it('should not throw when user has all permissions', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireAll(event as any, 'post:read', 'post:write')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks any permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireAll(event as any, 'post:read', 'user:read')
      ).rejects.toThrow();
    });
  });

  describe('requireAny()', () => {
    it('should not throw when user has any permission', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireAny(event as any, 'post:read', 'user:read')
      ).resolves.not.toThrow();
    });

    it('should throw when user has none of the permissions', async () => {
      const event = createMockEvent();
      await expect(
        adapter.requireAny(event as any, 'user:read', 'user:write')
      ).rejects.toThrow();
    });
  });

  describe('Custom Options', () => {
    it('should use custom getUser function', async () => {
      const customAdapter = new NuxtRBACAdapter(rbac, {
        getUser: (event) => event.context.session?.user || event.context.user
      });

      const event = createMockEvent();
      event.context.user = undefined as any;
      (event.context as any).session = { user: { id: 'user-2', roles: ['viewer'] } };

      await expect(
        customAdapter.requirePermission(event as any, 'post:read')
      ).resolves.not.toThrow();
    });

    it('should use custom onUnauthorized handler', async () => {
      const customHandler = vi.fn().mockImplementation(() => {
        throw new Error('Custom unauthorized');
      });

      const customAdapter = new NuxtRBACAdapter(rbac, {
        onUnauthorized: customHandler
      });

      const event = createMockEvent();
      await expect(
        customAdapter.requirePermission(event as any, 'user:delete')
      ).rejects.toThrow('Custom unauthorized');

      expect(customHandler).toHaveBeenCalled();
    });
  });

  describe('H3Event Integration', () => {
    it('should work with event context', async () => {
      const event = createMockEvent();
      event.context.user = { id: 'admin-1', roles: ['admin'] };

      await expect(
        adapter.requirePermission(event as any, 'user:create')
      ).resolves.not.toThrow();
    });

    it('should handle missing context gracefully', async () => {
      const event = { context: {} } as any;

      await expect(
        adapter.requirePermission(event, 'post:read')
      ).rejects.toThrow();
    });
  });
});
