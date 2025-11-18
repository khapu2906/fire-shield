import { describe, it, expect, vi } from 'vitest';
import { RBAC, ConsoleAuditLogger, BufferedAuditLogger } from '../index';
import type { AuditEvent } from '../types/audit.types';

describe('Advanced Features', () => {
  describe('Wildcard Permissions', () => {
    it('should support wildcard in role permissions (admin:*)', () => {
      const rbac = new RBAC({ enableWildcards: true });

      rbac.registerPermission('admin:users');
      rbac.registerPermission('admin:posts');
      rbac.registerPermission('admin:settings');

      // Create role with wildcard
      rbac.createRole('admin', ['admin:*']);

      const admin = { id: '1', roles: ['admin'] };

      // Should match all admin permissions
      expect(rbac.hasPermission(admin, 'admin:users')).toBe(true);
      expect(rbac.hasPermission(admin, 'admin:posts')).toBe(true);
      expect(rbac.hasPermission(admin, 'admin:settings')).toBe(true);

      // Should not match non-admin permissions
      expect(rbac.hasPermission(admin, 'user:read')).toBe(false);
    });

    it('should support wildcard in direct permissions', () => {
      const rbac = new RBAC({ enableWildcards: true });

      const user = {
        id: '1',
        roles: [],
        permissions: ['post:*', 'comment:read']
      };

      expect(rbac.hasPermission(user, 'post:read')).toBe(true);
      expect(rbac.hasPermission(user, 'post:write')).toBe(true);
      expect(rbac.hasPermission(user, 'post:delete')).toBe(true);
      expect(rbac.hasPermission(user, 'comment:read')).toBe(true);
      expect(rbac.hasPermission(user, 'comment:write')).toBe(false);
    });

    it('should support multiple wildcards (*:*:delete)', () => {
      const rbac = new RBAC({ enableWildcards: true });

      const user = {
        id: '1',
        roles: [],
        permissions: ['*:*:delete']
      };

      expect(rbac.hasPermission(user, 'user:post:delete')).toBe(true);
      expect(rbac.hasPermission(user, 'admin:comment:delete')).toBe(true);
      expect(rbac.hasPermission(user, 'editor:file:delete')).toBe(true);
      expect(rbac.hasPermission(user, 'user:post:read')).toBe(false);
    });

    it('should disable wildcard when enableWildcards = false', () => {
      const rbac = new RBAC({ enableWildcards: false });

      const user = {
        id: '1',
        roles: [],
        permissions: ['admin:*']
      };

      // Wildcard treated as literal string
      expect(rbac.hasPermission(user, 'admin:users')).toBe(false);
      expect(rbac.hasPermission(user, 'admin:*')).toBe(true);
    });
  });

  describe('Deny Permissions', () => {
    it('should deny specific permission for user', () => {
      const rbac = new RBAC();

      rbac.registerPermission('post:read');
      rbac.registerPermission('post:write');
      rbac.createRole('editor', ['post:read', 'post:write']);

      const user = { id: 'user-1', roles: ['editor'] };

      // Can read and write initially
      expect(rbac.hasPermission(user, 'post:read')).toBe(true);
      expect(rbac.hasPermission(user, 'post:write')).toBe(true);

      // Deny write permission
      rbac.denyPermission('user-1', 'post:write');

      // Can still read, but not write
      expect(rbac.hasPermission(user, 'post:read')).toBe(true);
      expect(rbac.hasPermission(user, 'post:write')).toBe(false);
    });

    it('should support wildcard in deny permissions', () => {
      const rbac = new RBAC({ enableWildcards: true });

      rbac.createRole('admin', ['admin:*', 'user:*']);

      const user = { id: 'user-1', roles: ['admin'] };

      // Deny all user permissions
      rbac.denyPermission('user-1', 'user:*');

      expect(rbac.hasPermission(user, 'admin:read')).toBe(true);
      expect(rbac.hasPermission(user, 'admin:write')).toBe(true);
      expect(rbac.hasPermission(user, 'user:read')).toBe(false);
      expect(rbac.hasPermission(user, 'user:write')).toBe(false);
    });

    it('should allow permission after deny', () => {
      const rbac = new RBAC();

      rbac.createRole('editor', ['post:write']);
      const user = { id: 'user-1', roles: ['editor'] };

      rbac.denyPermission('user-1', 'post:write');
      expect(rbac.hasPermission(user, 'post:write')).toBe(false);

      rbac.allowPermission('user-1', 'post:write');
      expect(rbac.hasPermission(user, 'post:write')).toBe(true);
    });

    it('should get denied permissions for user', () => {
      const rbac = new RBAC();

      rbac.denyPermission('user-1', 'post:delete');
      rbac.denyPermission('user-1', 'comment:delete');

      const denied = rbac.getDeniedPermissions('user-1');
      expect(denied).toContain('post:delete');
      expect(denied).toContain('comment:delete');
      expect(denied).toHaveLength(2);
    });

    it('should clear all denied permissions for user', () => {
      const rbac = new RBAC();

      rbac.denyPermission('user-1', 'post:delete');
      rbac.denyPermission('user-1', 'comment:delete');

      rbac.clearDeniedPermissions('user-1');

      const denied = rbac.getDeniedPermissions('user-1');
      expect(denied).toHaveLength(0);
    });

    it('deny should take precedence over allow', () => {
      const rbac = new RBAC();

      const user = {
        id: 'user-1',
        roles: [],
        permissions: ['post:delete'] // Direct permission
      };

      expect(rbac.hasPermission(user, 'post:delete')).toBe(true);

      // Deny overrides direct permission
      rbac.denyPermission('user-1', 'post:delete');
      expect(rbac.hasPermission(user, 'post:delete')).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log permission checks', () => {
      const events: AuditEvent[] = [];
      const mockLogger = {
        log: vi.fn((event: AuditEvent) => {
          events.push(event);
        })
      };

      const rbac = new RBAC({ auditLogger: mockLogger });

      rbac.registerPermission('user:read');
      rbac.createRole('viewer', ['user:read']);

      const user = { id: 'user-123', roles: ['viewer'] };

      rbac.hasPermission(user, 'user:read');

      expect(mockLogger.log).toHaveBeenCalled();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.type).toBe('permission_check');
      expect(event.userId).toBe('user-123');
      expect(event.permission).toBe('user:read');
      expect(event.allowed).toBe(true);
      expect(event.context?.roles).toEqual(['viewer']);
    });

    it('should log denied permissions with reason', () => {
      const events: AuditEvent[] = [];
      const mockLogger = {
        log: (event: AuditEvent) => events.push(event)
      };

      const rbac = new RBAC({ auditLogger: mockLogger });

      const user = { id: 'user-123', roles: [] };

      rbac.hasPermission(user, 'admin:delete');

      const event = events[0];
      expect(event.allowed).toBe(false);
      expect(event.reason).toBeDefined();
      expect(event.reason).toContain('lacks permission');
    });

    it('should use ConsoleAuditLogger', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rbac = new RBAC({ auditLogger: new ConsoleAuditLogger() });

      rbac.registerPermission('test:perm');
      const user = { id: 'user-1', roles: [] };

      rbac.hasPermission(user, 'test:perm');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should use BufferedAuditLogger', async () => {
      const flushedEvents: AuditEvent[][] = [];

      const logger = new BufferedAuditLogger(
        (events) => {
          flushedEvents.push(events);
        },
        { maxBufferSize: 3, flushIntervalMs: 0 } // No auto-flush
      );

      const rbac = new RBAC({ auditLogger: logger });

      const user = { id: 'user-1', roles: [] };

      // Log 2 events (under buffer size)
      rbac.hasPermission(user, 'perm1');
      rbac.hasPermission(user, 'perm2');

      expect(flushedEvents).toHaveLength(0); // Not flushed yet

      // Log 3rd event (triggers flush)
      rbac.hasPermission(user, 'perm3');

      expect(flushedEvents).toHaveLength(1);
      expect(flushedEvents[0]).toHaveLength(3);

      logger.destroy();
    });

    it('should not throw if audit logging fails', () => {
      const brokenLogger = {
        log: () => {
          throw new Error('Logger error');
        }
      };

      const rbac = new RBAC({ auditLogger: brokenLogger });

      const user = { id: 'user-1', roles: [] };

      // Should not throw
      expect(() => rbac.hasPermission(user, 'test')).not.toThrow();
    });
  });

  describe('Combined Features', () => {
    it('should support wildcards + deny + audit together', () => {
      const events: AuditEvent[] = [];
      const mockLogger = {
        log: (event: AuditEvent) => events.push(event)
      };

      const rbac = new RBAC({
        enableWildcards: true,
        auditLogger: mockLogger
      });

      rbac.createRole('admin', ['admin:*']);
      const user = { id: 'admin-1', roles: ['admin'] };

      // Admin can do everything
      expect(rbac.hasPermission(user, 'admin:users')).toBe(true);
      expect(rbac.hasPermission(user, 'admin:settings')).toBe(true);

      // Deny specific permission
      rbac.denyPermission('admin-1', 'admin:settings');

      // Now can't access settings
      expect(rbac.hasPermission(user, 'admin:settings')).toBe(false);
      expect(rbac.hasPermission(user, 'admin:users')).toBe(true);

      // Check audit logs
      expect(events.length).toBeGreaterThan(0);
      const deniedEvent = events.find(e => e.permission === 'admin:settings' && !e.allowed);
      expect(deniedEvent).toBeDefined();
      expect(deniedEvent?.reason).toContain('explicitly denied');
    });
  });
});
