import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { checkCommand } from '../commands/check';

describe('CLI Check Command', () => {
  const testDir = join(process.cwd(), '.test-cli');
  const configPath = join(testDir, 'config.json');

  const testConfig = {
    name: 'test-rbac',
    version: '1.0.0',
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
      { name: 'user:delete', bit: 4 },
      { name: 'post:read', bit: 8 },
      { name: 'post:write', bit: 16 },
    ],
    roles: [
      {
        name: 'viewer',
        permissions: ['user:read', 'post:read'],
        level: 1,
      },
      {
        name: 'editor',
        permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
        level: 5,
      },
      {
        name: 'admin',
        permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write'],
        level: 10,
      },
    ],
  };

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process.exit called with code ${code}`);
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (existsSync(configPath)) unlinkSync(configPath);
    vi.restoreAllMocks();
  });

  describe('Successful Permission Checks', () => {
    it('should pass when user has required permission', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ User has permission "user:write"')
      );
    });

    it('should show detailed output with verbose flag', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['editor'],
          permission: 'user:write',
          verbose: true,
        })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('User: user1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Roles: editor')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Permission: user:write')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Granted by: editor')
      );
    });

    it('should work with multiple roles', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['viewer', 'editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ User has permission')
      );
    });

    it('should identify which role grants permission', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['viewer', 'editor'],
          permission: 'user:write',
          verbose: true,
        })
      ).rejects.toThrow('Process.exit called with code 0');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Granted by: editor')
      );
    });
  });

  describe('Failed Permission Checks', () => {
    it('should fail when user lacks permission', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['viewer'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ User does NOT have permission "user:write"')
      );
    });

    it('should show denial details with verbose', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['viewer'],
          permission: 'user:write',
          verbose: true,
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Result:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DENIED')
      );
    });

    it('should fail for non-existent permission', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['admin'],
          permission: 'nonexistent:permission',
        })
      ).rejects.toThrow('Process.exit called with code 1');
    });
  });

  describe('Missing Required Options', () => {
    it('should fail without user option', async () => {
      await expect(
        checkCommand(configPath, {
          roles: ['editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ User ID is required')
      );
    });

    it('should fail without roles option', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ At least one role is required')
      );
    });

    it('should fail with empty roles array', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: [],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ At least one role is required')
      );
    });

    it('should fail without permission option', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'user1',
          roles: ['editor'],
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Permission is required')
      );
    });
  });

  describe('Invalid Files', () => {
    it('should fail for non-existent config file', async () => {
      await expect(
        checkCommand('non-existent.json', {
          user: 'user1',
          roles: ['editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ File not found')
      );
    });

    it('should fail for invalid JSON config', async () => {
      const invalidPath = join(testDir, 'invalid.json');
      writeFileSync(invalidPath, '{ invalid }');

      await expect(
        checkCommand(invalidPath, {
          user: 'user1',
          roles: ['editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Invalid JSON')
      );

      unlinkSync(invalidPath);
    });

    it('should fail for invalid RBAC config', async () => {
      const invalidPath = join(testDir, 'bad-config.json');
      writeFileSync(
        invalidPath,
        JSON.stringify({ permissions: 'not-an-array' })
      );

      await expect(
        checkCommand(invalidPath, {
          user: 'user1',
          roles: ['editor'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✖ Failed to initialize RBAC')
      );

      unlinkSync(invalidPath);
    });
  });

  describe('Edge Cases', () => {
    it('should handle admin with all permissions', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'admin1',
          roles: ['admin'],
          permission: 'user:delete',
        })
      ).rejects.toThrow('Process.exit called with code 0');
    });

    it('should handle viewer with limited permissions', async () => {
      await expect(
        checkCommand(configPath, {
          user: 'viewer1',
          roles: ['viewer'],
          permission: 'user:read',
        })
      ).rejects.toThrow('Process.exit called with code 0');

      await expect(
        checkCommand(configPath, {
          user: 'viewer1',
          roles: ['viewer'],
          permission: 'user:write',
        })
      ).rejects.toThrow('Process.exit called with code 1');
    });
  });
});
