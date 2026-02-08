import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RBAC } from '../index';

describe('Config Loading', () => {
  const validConfig = {
    name: 'test-rbac',
    version: '1.0.0',
    permissions: [
      { name: 'user:read', bit: 1, description: 'Read users' },
      { name: 'user:write', bit: 2, description: 'Write users' },
      { name: 'user:delete', bit: 4, description: 'Delete users' },
      { name: 'post:read', bit: 8, description: 'Read posts' },
      { name: 'post:write', bit: 16, description: 'Write posts' },
      { name: 'post:delete', bit: 32, description: 'Delete posts' },
      { name: 'post:publish', bit: 64, description: 'Publish posts' }
    ],
    roles: [
      {
        name: 'viewer',
        permissions: ['user:read', 'post:read'],
        level: 1
      },
      {
        name: 'editor',
        permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
        level: 5
      },
      {
        name: 'admin',
        permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write', 'post:delete', 'post:publish'],
        level: 10
      }
    ],
    options: {
      autoBitAssignment: true,
      startBitValue: 1
    }
  };

  describe('RBAC.fromJSONConfig', () => {
    it('should create RBAC instance from valid JSON string', () => {
      const json = JSON.stringify(validConfig);
      const rbac = RBAC.fromJSONConfig(json);

      expect(rbac).toBeInstanceOf(RBAC);

      // Test that roles were created
      const user = { id: '1', roles: ['editor'] };
      expect(rbac.hasPermission(user, 'user:write')).toBe(true);
      expect(rbac.hasPermission(user, 'post:write')).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(() => RBAC.fromJSONConfig(invalidJson)).toThrow('Invalid JSON');
    });

    it('should throw error for invalid config structure', () => {
      const invalidConfig = JSON.stringify({ invalid: 'config' });
      expect(() => RBAC.fromJSONConfig(invalidConfig)).toThrow();
    });

    it('should accept additional options', () => {
      const json = JSON.stringify(validConfig);
      const rbac = RBAC.fromJSONConfig(json, {
        useBitSystem: true,
        enableWildcards: true
      });

      expect(rbac).toBeInstanceOf(RBAC);
    });
  });

  describe('RBAC.validateConfig', () => {
    it('should validate correct config', () => {
      expect(RBAC.validateConfig(validConfig)).toBe(undefined);
    });

    it('should throw for missing permissions array', () => {
      const invalid = { ...validConfig, permissions: undefined as any };
      expect(() => RBAC.validateConfig(invalid)).toThrow('Config.permissions must be an array');
    });

    it('should throw for missing roles array', () => {
      const invalid = { ...validConfig, roles: undefined as any };
      expect(() => RBAC.validateConfig(invalid)).toThrow('Config.roles must be an array');
    });

    it('should throw for duplicate permission names', () => {
      const invalid = {
        ...validConfig,
        permissions: [
          { name: 'user:read', bit: 1 },
          { name: 'user:read', bit: 2 } // Duplicate
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('Duplicate permission name');
    });

    it('should throw for duplicate bit values', () => {
      const invalid = {
        ...validConfig,
        permissions: [
          { name: 'user:read', bit: 1 },
          { name: 'user:write', bit: 1 } // Duplicate bit
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('Duplicate bit value');
    });

    it('should throw for duplicate role names', () => {
      const invalid = {
        ...validConfig,
        roles: [
          { name: 'admin', permissions: [] },
          { name: 'admin', permissions: [] } // Duplicate
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('Duplicate role name');
    });

    it('should throw for undefined permission in role', () => {
      const invalid = {
        ...validConfig,
        roles: [
          {
            name: 'test',
            permissions: ['nonexistent:permission']
          }
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('references undefined permission');
    });

    it('should allow wildcard permissions in roles', () => {
      const configWithWildcard = {
        ...validConfig,
        roles: [
          {
            name: 'admin',
            permissions: ['user:*', 'post:*'] // Wildcards should be allowed
          }
        ]
      };
      RBAC.validateConfig(configWithWildcard); // Should not throw
    });

    it('should throw for invalid permission bit value', () => {
      const invalid = {
        ...validConfig,
        permissions: [
          { name: 'user:read', bit: -1 } // Negative bit
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('invalid bit value');
    });

    it('should throw for invalid role level', () => {
      const invalid = {
        ...validConfig,
        roles: [
          {
            name: 'admin',
            permissions: ['user:read'],
            level: -5 // Negative level
          }
        ]
      };
      expect(() => RBAC.validateConfig(invalid)).toThrow('invalid level');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with config loading', () => {
      const json = JSON.stringify(validConfig);

      // Load from JSON config
      const rbac = RBAC.fromJSONConfig(json);

      // Create test users
      const viewer = { id: '1', roles: ['viewer'] };
      const editor = { id: '2', roles: ['editor'] };
      const admin = { id: '3', roles: ['admin'] };

      // Test permissions
      expect(rbac.hasPermission(viewer, 'user:read')).toBe(true);
      expect(rbac.hasPermission(viewer, 'user:write')).toBe(false);

      expect(rbac.hasPermission(editor, 'user:read')).toBe(true);
      expect(rbac.hasPermission(editor, 'user:write')).toBe(true);
      expect(rbac.hasPermission(editor, 'post:write')).toBe(true);

      expect(rbac.hasPermission(admin, 'user:delete')).toBe(true);
      expect(rbac.hasPermission(admin, 'post:publish')).toBe(true);
      expect(rbac.hasPermission(admin, 'post:delete')).toBe(true);
    });

    it('should handle complex config with deny permissions', () => {
      const complexConfig = {
        ...validConfig,
        roles: [
          ...validConfig.roles,
          {
            name: 'restricted-admin',
            permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write', 'post:delete', 'post:publish'],
            level: 8
          }
        ]
      };

      const rbac = RBAC.fromJSONConfig(JSON.stringify(complexConfig));

      const restrictedAdmin = { id: '4', roles: ['restricted-admin'] };

      // Should have all permissions
      expect(rbac.hasPermission(restrictedAdmin, 'user:delete')).toBe(true);

      // Deny specific permission
      rbac.denyPermission('4', 'user:delete');

      // Should now be denied
      expect(rbac.hasPermission(restrictedAdmin, 'user:delete')).toBe(false);

      // Other permissions still work
      expect(rbac.hasPermission(restrictedAdmin, 'user:read')).toBe(true);
    });

    it('should work with role hierarchy', () => {
      const config = {
        name: 'test-rbac',
        version: '1.0.0',
        permissions: [
          { name: 'read', bit: 1 },
          { name: 'write', bit: 2 },
          { name: 'admin', bit: 4 }
        ],
        roles: [
          {
            name: 'user',
            permissions: ['read'],
            level: 1
          },
          {
            name: 'editor',
            permissions: ['read', 'write'],
            level: 2
          },
          {
            name: 'admin',
            permissions: ['read', 'write', 'admin'],
            level: 3
          }
        ]
      };

      const rbac = RBAC.fromJSONConfig(JSON.stringify(config));

      // Admin can act as editor and user (hierarchy)
      expect(rbac.canActAsRole('admin', 'editor')).toBe(true);
      expect(rbac.canActAsRole('admin', 'user')).toBe(true);

      // Editor can act as user (hierarchy)
      expect(rbac.canActAsRole('editor', 'user')).toBe(true);

      // User cannot act as editor (no hierarchy)
      expect(rbac.canActAsRole('user', 'editor')).toBe(false);
    });
  });
});
