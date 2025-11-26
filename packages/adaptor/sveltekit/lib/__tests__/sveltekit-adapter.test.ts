/**
 * SvelteKit Adapter Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBAC } from '@fire-shield/core';
import {
  guardPage,
  checkPermission,
  checkRole,
  authorize,
  denyPermission,
  allowPermission,
  getDeniedPermissions,
  guardNotDenied,
  protectedLoad,
  protectedAction,
} from '../index';
import type { RBACEvent } from '../index';

describe('SvelteKit Adapter', () => {
  let rbac: RBAC;
  let mockEvent: RBACEvent;

  beforeEach(() => {
    rbac = new RBAC({
      config: {
        permissions: [
          { name: 'content:read', bit: 1 },
          { name: 'content:write', bit: 2 },
          { name: 'content:delete', bit: 4 },
          { name: 'admin:delete', bit: 8 },
        ],
        roles: [
          { name: 'viewer', permissions: ['content:read'], level: 1 },
          { name: 'editor', permissions: ['content:read', 'content:write'], level: 5 },
          { name: 'admin', permissions: ['*'], level: 10 },
        ],
      },
    });

    mockEvent = {
      locals: {
        rbac,
        user: {
          id: 'user1',
          roles: ['editor'],
        },
      },
    } as any;
  });

  describe('checkPermission', () => {
    it('should return true when user has permission', () => {
      const result = checkPermission(mockEvent, 'content:write');
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      const result = checkPermission(mockEvent, 'admin:delete');
      expect(result).toBe(false);
    });

    it('should return false when no user', () => {
      mockEvent.locals.user = undefined;
      const result = checkPermission(mockEvent, 'content:read');
      expect(result).toBe(false);
    });
  });

  describe('checkRole', () => {
    it('should return true when user has role', () => {
      const result = checkRole(mockEvent, 'editor');
      expect(result).toBe(true);
    });

    it('should return false when user lacks role', () => {
      const result = checkRole(mockEvent, 'admin');
      expect(result).toBe(false);
    });

    it('should return false when no user', () => {
      mockEvent.locals.user = undefined;
      const result = checkRole(mockEvent, 'editor');
      expect(result).toBe(false);
    });
  });

  describe('authorize', () => {
    it('should return allowed result', () => {
      const result = authorize(mockEvent, 'content:write');
      expect(result.allowed).toBe(true);
    });

    it('should return denied result', () => {
      const result = authorize(mockEvent, 'admin:delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle no user', () => {
      mockEvent.locals.user = undefined;
      const result = authorize(mockEvent, 'content:read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not authenticated');
    });
  });

  describe('guardPage', () => {
    it('should allow access with correct permission', () => {
      expect(() => {
        guardPage(mockEvent, { permission: 'content:write' });
      }).not.toThrow();
    });

    it('should throw error when permission missing', () => {
      expect(() => {
        guardPage(mockEvent, { permission: 'admin:delete' });
      }).toThrow();
    });

    it('should allow access with correct role', () => {
      expect(() => {
        guardPage(mockEvent, { role: 'editor' });
      }).not.toThrow();
    });

    it('should throw error when role missing', () => {
      expect(() => {
        guardPage(mockEvent, { role: 'admin' });
      }).toThrow();
    });

    it('should check all permissions', () => {
      expect(() => {
        guardPage(mockEvent, {
          allPermissions: ['content:read', 'content:write'],
        });
      }).not.toThrow();

      expect(() => {
        guardPage(mockEvent, {
          allPermissions: ['content:read', 'admin:delete'],
        });
      }).toThrow();
    });

    it('should check any permissions', () => {
      expect(() => {
        guardPage(mockEvent, {
          anyPermissions: ['content:write', 'admin:delete'],
        });
      }).not.toThrow();

      expect(() => {
        guardPage(mockEvent, {
          anyPermissions: ['admin:delete', 'admin:create'],
        });
      }).toThrow();
    });

    it('should handle unauthenticated user', () => {
      mockEvent.locals.user = undefined;

      expect(() => {
        guardPage(mockEvent, { permission: 'content:read' });
      }).toThrow();

      expect(() => {
        guardPage(mockEvent, {
          permission: 'content:read',
          allowUnauthenticated: true,
        });
      }).not.toThrow();
    });
  });

  describe('denyPermission', () => {
    it('should deny permission for user', () => {
      denyPermission(mockEvent, 'content:delete');

      const denied = rbac.getDeniedPermissions('user1');
      expect(denied).toContain('content:delete');
    });

    it('should throw when no user', () => {
      mockEvent.locals.user = undefined;

      expect(() => {
        denyPermission(mockEvent, 'content:delete');
      }).toThrow();
    });
  });

  describe('allowPermission', () => {
    it('should remove denied permission', () => {
      rbac.denyPermission('user1', 'content:write');

      allowPermission(mockEvent, 'content:write');

      const denied = rbac.getDeniedPermissions('user1');
      expect(denied).not.toContain('content:write');
    });

    it('should throw when no user', () => {
      mockEvent.locals.user = undefined;

      expect(() => {
        allowPermission(mockEvent, 'content:write');
      }).toThrow();
    });
  });

  describe('getDeniedPermissions', () => {
    it('should get all denied permissions', () => {
      rbac.denyPermission('user1', 'content:delete');
      rbac.denyPermission('user1', 'admin:*');

      const denied = getDeniedPermissions(mockEvent);
      expect(denied).toContain('content:delete');
      expect(denied).toContain('admin:*');
    });

    it('should return empty array when no user', () => {
      mockEvent.locals.user = undefined;

      const denied = getDeniedPermissions(mockEvent);
      expect(denied).toEqual([]);
    });
  });

  describe('guardNotDenied', () => {
    it('should allow when permission not denied', () => {
      expect(() => {
        guardNotDenied(mockEvent, 'content:write');
      }).not.toThrow();
    });

    it('should throw when permission is denied', () => {
      rbac.denyPermission('user1', 'content:delete');

      expect(() => {
        guardNotDenied(mockEvent, 'content:delete');
      }).toThrow();
    });

    it('should match wildcard denies', () => {
      rbac.denyPermission('user1', 'admin:*');

      expect(() => {
        guardNotDenied(mockEvent, 'admin:delete');
      }).toThrow();
    });
  });

  describe('protectedLoad', () => {
    it('should execute load function when authorized', async () => {
      const loadFn = vi.fn().mockResolvedValue({ data: 'test' });

      const protectedFn = protectedLoad(loadFn, {
        permission: 'content:read',
      });

      const result = await protectedFn(mockEvent);
      expect(result).toEqual({ data: 'test' });
      expect(loadFn).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw when unauthorized', async () => {
      const loadFn = vi.fn().mockResolvedValue({ data: 'test' });

      const protectedFn = protectedLoad(loadFn, {
        permission: 'admin:delete',
      });

      await expect(protectedFn(mockEvent)).rejects.toThrow();
      expect(loadFn).not.toHaveBeenCalled();
    });
  });

  describe('protectedAction', () => {
    it('should execute action when authorized', async () => {
      const actionFn = vi.fn().mockResolvedValue({ success: true });

      const protectedFn = protectedAction(actionFn, {
        permission: 'content:write',
      });

      const result = await protectedFn(mockEvent);
      expect(result).toEqual({ success: true });
      expect(actionFn).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw when unauthorized', async () => {
      const actionFn = vi.fn().mockResolvedValue({ success: true });

      const protectedFn = protectedAction(actionFn, {
        permission: 'admin:delete',
      });

      await expect(protectedFn(mockEvent)).rejects.toThrow();
      expect(actionFn).not.toHaveBeenCalled();
    });
  });
});
