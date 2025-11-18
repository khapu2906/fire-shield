import { describe, it, expect } from 'vitest';
import { RBAC, BitPermissionManager, defaultPreset } from '../index';

describe('RBAC Core - Legacy System', () => {
  it('should create RBAC instance', () => {
    const rbac = new RBAC({ useBitSystem: false });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should authorize user with correct permissions', () => {
    const rbac = new RBAC({ useBitSystem: false });
    rbac.createRole('editor', ['moderator:content:manage']);

    const user = {
      id: 'user-1',
      roles: ['editor'],
      permissions: []
    };

    const result = rbac.authorize(user, 'moderator:content:manage');
    expect(result.allowed).toBe(true);
  });

  it('should deny authorization for insufficient permissions', () => {
    const rbac = new RBAC({ useBitSystem: false });
    rbac.createRole('user', ['user:read']);

    const user = {
      id: 'user-1',
      roles: ['user'],
      permissions: []
    };

    const result = rbac.authorize(user, 'admin:user:manage');
    expect(result.allowed).toBe(false);
  });

  it('should check role hierarchy with levels', () => {
    const rbac = new RBAC({ preset: defaultPreset, useBitSystem: false });

    expect(rbac.canActAsRole('admin', 'editor')).toBe(true);
    expect(rbac.canActAsRole('editor', 'user')).toBe(true);
    expect(rbac.canActAsRole('user', 'admin')).toBe(false);
  });
});

describe('RBAC Core - Bit-Based System', () => {
  it('should create RBAC instance with bit system', () => {
    const rbac = new RBAC({ useBitSystem: true });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should register permissions dynamically', () => {
    const rbac = new RBAC({ useBitSystem: true });

    const bit1 = rbac.registerPermission('custom:read');
    const bit2 = rbac.registerPermission('custom:write');

    // Note: Default permissions are already registered, so these will be higher bits
    expect(bit1).toBeGreaterThan(0);
    expect(bit2).toBeGreaterThan(bit1);
    expect(bit2).toBe(bit1 * 2); // Each new permission doubles the previous
  });

  it('should create roles with permissions', () => {
    const rbac = new RBAC({ useBitSystem: true });

    rbac.createRole('custom-role', ['user:read', 'user:update']);

    const user = {
      id: 'user-1',
      roles: ['custom-role'],
      permissions: []
    };

    const result = rbac.authorize(user, 'user:read');
    expect(result.allowed).toBe(true);
  });

  it('should handle permission masks', () => {
    const rbac = new RBAC({ useBitSystem: true });
    const bitManager = rbac.getBitPermissionManager();

    if (!bitManager) throw new Error('BitPermissionManager not available');

    // Register permissions
    const readBit = rbac.registerPermission('file:read');
    const writeBit = rbac.registerPermission('file:write');

    // Create permission mask
    const mask = bitManager.createPermissionMask(['file:read']);

    const user = {
      id: 'user-1',
      roles: [],
      permissionMask: mask
    };

    expect(rbac.authorize(user, 'file:read').allowed).toBe(true);
    expect(rbac.authorize(user, 'file:write').allowed).toBe(false);
  });

  it('should check role hierarchy with bit permissions', () => {
    const rbac = new RBAC({ useBitSystem: true });

    // Register permissions first
    rbac.registerPermission('user:read');
    rbac.registerPermission('user:update');

    // Create roles with different permission sets
    rbac.createRole('basic', ['user:read']);
    rbac.createRole('advanced', ['user:read', 'user:update']);

    // Check hierarchy based on permission inclusion
    expect(rbac.canActAsRole('advanced', 'basic')).toBe(true);
    expect(rbac.canActAsRole('basic', 'advanced')).toBe(false);
  });

  it('should combine permissions from multiple roles', () => {
    const rbac = new RBAC({ useBitSystem: true });

    // Register permissions first
    rbac.registerPermission('content:read');
    rbac.registerPermission('content:write');
    rbac.registerPermission('content:delete');

    rbac.createRole('reader', ['content:read']);
    rbac.createRole('writer', ['content:write']);

    const user = {
      id: 'user-1',
      roles: ['reader', 'writer'],
      permissions: []
    };

    expect(rbac.authorize(user, 'content:read').allowed).toBe(true);
    expect(rbac.authorize(user, 'content:write').allowed).toBe(true);
    expect(rbac.authorize(user, 'content:delete').allowed).toBe(false);
  });
});

describe('BitPermissionManager', () => {
  it('should register permissions with unique bit values', () => {
    const manager = new BitPermissionManager();

    const bit1 = manager.registerPermission('perm1');
    const bit2 = manager.registerPermission('perm2');
    const bit3 = manager.registerPermission('perm3');

    expect(bit1).toBe(1);  // 2^0
    expect(bit2).toBe(2);  // 2^1
    expect(bit3).toBe(4);  // 2^2
  });

  it('should create and check permission masks', () => {
    const manager = new BitPermissionManager();

    manager.registerPermission('read');
    manager.registerPermission('write');
    manager.registerPermission('delete');

    const readWriteMask = manager.createPermissionMask(['read', 'write']);

    expect(manager.hasPermission(readWriteMask, 'read')).toBe(true);
    expect(manager.hasPermission(readWriteMask, 'write')).toBe(true);
    expect(manager.hasPermission(readWriteMask, 'delete')).toBe(false);
  });

  it('should handle role permissions', () => {
    const manager = new BitPermissionManager();

    manager.registerPermission('admin');
    manager.registerPermission('moderator');

    manager.registerRole('super-admin', ['admin', 'moderator']);
    manager.registerRole('admin-only', ['admin']);

    expect(manager.roleHasPermission('super-admin', 'admin')).toBe(true);
    expect(manager.roleHasPermission('super-admin', 'moderator')).toBe(true);
    expect(manager.roleHasPermission('admin-only', 'moderator')).toBe(false);
  });

  it('should combine permission masks', () => {
    const manager = new BitPermissionManager();

    manager.registerPermission('read');
    manager.registerPermission('write');

    const readMask = manager.createPermissionMask(['read']);
    const writeMask = manager.createPermissionMask(['write']);
    const combinedMask = manager.combineMasks(readMask, writeMask);

    expect(manager.hasPermission(combinedMask, 'read')).toBe(true);
    expect(manager.hasPermission(combinedMask, 'write')).toBe(true);
  });

  it('should check if one mask includes another', () => {
    const manager = new BitPermissionManager();

    manager.registerPermission('read');
    manager.registerPermission('write');
    manager.registerPermission('delete');

    const readMask = manager.createPermissionMask(['read']);
    const readWriteMask = manager.createPermissionMask(['read', 'write']);

    expect(manager.includesPermissions(readWriteMask, readMask)).toBe(true);
    expect(manager.includesPermissions(readMask, readWriteMask)).toBe(false);
  });
});