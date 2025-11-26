import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { validateCommand } from '../commands/validate';

describe('CLI Validate Command', () => {
  const testDir = join(process.cwd(), '.test-cli');
  const validConfigPath = join(testDir, 'valid-config.json');
  const invalidJsonPath = join(testDir, 'invalid.json');
  const invalidConfigPath = join(testDir, 'invalid-config.json');

  const validConfig = {
    name: 'test-rbac',
    version: '1.0.0',
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
    ],
    roles: [
      { name: 'viewer', permissions: ['user:read'], level: 1 },
      { name: 'editor', permissions: ['user:read', 'user:write'], level: 5 },
    ],
  };

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Mock process.exit to prevent tests from exiting
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process.exit called with code ${code}`);
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(validConfigPath)) unlinkSync(validConfigPath);
    if (existsSync(invalidJsonPath)) unlinkSync(invalidJsonPath);
    if (existsSync(invalidConfigPath)) unlinkSync(invalidConfigPath);

    vi.restoreAllMocks();
  });

  describe('Valid Configuration', () => {
    it('should validate a correct config file', async () => {
      writeFileSync(validConfigPath, JSON.stringify(validConfig, null, 2));

      await expect(
        validateCommand(validConfigPath, { verbose: false })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ Configuration is valid')
      );
    });

    it('should show detailed output with verbose flag', async () => {
      writeFileSync(validConfigPath, JSON.stringify(validConfig, null, 2));

      await expect(
        validateCommand(validConfigPath, { verbose: true })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Configuration details')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Permissions: 2')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Roles: 2')
      );
    });

    it('should work with strict mode', async () => {
      writeFileSync(validConfigPath, JSON.stringify(validConfig, null, 2));

      await expect(
        validateCommand(validConfigPath, { strict: true })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ Configuration is valid')
      );
    });
  });

  describe('Invalid Files', () => {
    it('should fail for non-existent file', async () => {
      await expect(
        validateCommand('non-existent-file.json', {})
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ File not found')
      );
    });

    it('should fail for invalid JSON', async () => {
      writeFileSync(invalidJsonPath, '{ invalid json }');

      await expect(
        validateCommand(invalidJsonPath, {})
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Invalid JSON')
      );
    });

    it('should show JSON error details with verbose', async () => {
      writeFileSync(invalidJsonPath, '{ invalid json }');

      await expect(
        validateCommand(invalidJsonPath, { verbose: true })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Invalid JSON')
      );
    });
  });

  describe('Invalid Configuration', () => {
    it('should fail for missing permissions array', async () => {
      const invalidConfig = {
        name: 'test',
        roles: [],
      };
      writeFileSync(invalidConfigPath, JSON.stringify(invalidConfig));

      await expect(
        validateCommand(invalidConfigPath, {})
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Validation failed')
      );
    });

    it('should fail for duplicate permission names', async () => {
      const duplicateConfig = {
        ...validConfig,
        permissions: [
          { name: 'user:read', bit: 1 },
          { name: 'user:read', bit: 2 },
        ],
      };
      writeFileSync(invalidConfigPath, JSON.stringify(duplicateConfig));

      await expect(
        validateCommand(invalidConfigPath, {})
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate permission name')
      );
    });

    it('should fail for undefined permission in role', async () => {
      const undefinedPermConfig = {
        ...validConfig,
        roles: [
          { name: 'viewer', permissions: ['nonexistent:perm'] },
        ],
      };
      writeFileSync(invalidConfigPath, JSON.stringify(undefinedPermConfig));

      await expect(
        validateCommand(invalidConfigPath, {})
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('undefined permission')
      );
    });

    it('should allow wildcard permissions in validation', async () => {
      const wildcardConfig = {
        ...validConfig,
        roles: [
          { name: 'admin', permissions: ['user:*'] },
        ],
      };
      writeFileSync(validConfigPath, JSON.stringify(wildcardConfig));

      await expect(
        validateCommand(validConfigPath, {})
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ Configuration is valid')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty roles array', async () => {
      const emptyRolesConfig = {
        ...validConfig,
        roles: [],
      };
      writeFileSync(validConfigPath, JSON.stringify(emptyRolesConfig));

      await expect(
        validateCommand(validConfigPath, {})
      ).rejects.toThrow('Process.exit called with code 0');
    });

    it('should handle config without name/version', async () => {
      const minimalConfig = {
        permissions: [{ name: 'test:read', bit: 1 }],
        roles: [],
      };
      writeFileSync(validConfigPath, JSON.stringify(minimalConfig));

      await expect(
        validateCommand(validConfigPath, { verbose: true })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Name: N/A')
      );
    });
  });
});
