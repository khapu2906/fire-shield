import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RBAC } from '../index';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Config Loading', () => {
  const testConfigDir = join(__dirname, 'test-configs');
  const testConfigPath = join(testConfigDir, 'test-rbac.json');

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

  describe('RBAC.fromFile', () => {
    beforeAll(() => {
      // Create test directory if it doesn't exist
      try {
        mkdirSync(testConfigDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Write test config file
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
    });

    afterAll(() => {
      // Cleanup test file
      try {
        unlinkSync(testConfigPath);
      } catch (error) {
        // File might not exist
      }
    });

    it('should load RBAC config from file asynchronously', async () => {
      const rbac = await RBAC.fromFile(testConfigPath);

      expect(rbac).toBeInstanceOf(RBAC);

      const user = { id: '1', roles: ['viewer'] };
      expect(rbac.hasPermission(user, 'user:read')).toBe(true);
      expect(rbac.hasPermission(user, 'user:write')).toBe(false);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        RBAC.fromFile('/path/to/nonexistent/file.json')
      ).rejects.toThrow('Config file not found');
    });

    it('should accept additional options', async () => {
      const rbac = await RBAC.fromFile(testConfigPath, {
        enableWildcards: true
      });

      expect(rbac).toBeInstanceOf(RBAC);
    });
  });

  describe('RBAC.fromFileSync', () => {
    beforeAll(() => {
      // Create test directory if it doesn't exist
      try {
        mkdirSync(testConfigDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Write test config file
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
    });

    afterAll(() => {
      // Cleanup test file
      try {
        unlinkSync(testConfigPath);
      } catch (error) {
        // File might not exist
      }
    });

    it('should load RBAC config from file synchronously', () => {
      const rbac = RBAC.fromFileSync(testConfigPath);

      expect(rbac).toBeInstanceOf(RBAC);

      const admin = { id: '1', roles: ['admin'] };
      expect(rbac.hasPermission(admin, 'user:read')).toBe(true);
      expect(rbac.hasPermission(admin, 'user:write')).toBe(true);
      expect(rbac.hasPermission(admin, 'user:delete')).toBe(true);
      expect(rbac.hasPermission(admin, 'post:delete')).toBe(true);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        RBAC.fromFileSync('/path/to/nonexistent/file.json');
      }).toThrow('Config file not found');
    });
  });

  describe('RBAC.validateConfig', () => {
    it('should validate correct config', () => {
      expect(() => RBAC.validateConfig(validConfig)).not.toThrow();
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
      expect(() => RBAC.validateConfig(configWithWildcard)).not.toThrow();
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
    it('should work end-to-end with file loading', async () => {
      // Write config to file
      const configPath = join(testConfigDir, 'integration-test.json');
      writeFileSync(configPath, JSON.stringify(validConfig, null, 2));

      try {
        // Load from file
        const rbac = await RBAC.fromFile(configPath);

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
      } finally {
        // Cleanup
        unlinkSync(configPath);
      }
    });

    it('should handle complex config with deny permissions', async () => {
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

      const configPath = join(testConfigDir, 'complex-test.json');
      writeFileSync(configPath, JSON.stringify(complexConfig, null, 2));

      try {
        const rbac = await RBAC.fromFile(configPath);

        const restrictedAdmin = { id: '4', roles: ['restricted-admin'] };

        // Should have all permissions
        expect(rbac.hasPermission(restrictedAdmin, 'user:delete')).toBe(true);

        // Deny specific permission
        rbac.denyPermission('4', 'user:delete');

        // Should now be denied
        expect(rbac.hasPermission(restrictedAdmin, 'user:delete')).toBe(false);

        // Other permissions still work
        expect(rbac.hasPermission(restrictedAdmin, 'user:read')).toBe(true);
      } finally {
        unlinkSync(configPath);
      }
    });
  });
});
