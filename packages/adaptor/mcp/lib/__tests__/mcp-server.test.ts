/**
 * MCP Server Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RBAC } from '@fire-shield/core';
import { FireShieldMCPServer } from '../index';

describe('MCP Server', () => {
  let rbac: RBAC;
  let server: FireShieldMCPServer;

  beforeEach(() => {
    rbac = new RBAC({
      config: {
        permissions: [
          { name: 'content:read', bit: 1 },
          { name: 'content:write', bit: 2 },
          { name: 'content:delete', bit: 4 },
        ],
        roles: [
          { name: 'viewer', permissions: ['content:read'], level: 1 },
          { name: 'editor', permissions: ['content:read', 'content:write'], level: 5 },
          { name: 'admin', permissions: ['*'], level: 10 },
        ],
      },
    });

    server = new FireShieldMCPServer({
      rbac,
      serverName: 'test-server',
      serverVersion: '1.0.0',
      debug: false,
    });
  });

  describe('Server Initialization', () => {
    it('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server.getServer()).toBeDefined();
    });

    it('should have correct server info', () => {
      const serverInstance = server.getServer();
      expect(serverInstance).toBeDefined();
    });
  });

  describe('Tool Availability', () => {
    it('should expose all required tools', () => {
      const tools = (server as any).getTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((t: any) => t.name);
      expect(toolNames).toContain('check_permission');
      expect(toolNames).toContain('check_role');
      expect(toolNames).toContain('list_permissions');
      expect(toolNames).toContain('deny_permission');
      expect(toolNames).toContain('allow_permission');
      expect(toolNames).toContain('get_denied_permissions');
      expect(toolNames).toContain('list_roles');
      expect(toolNames).toContain('get_role_permissions');
    });
  });

  describe('check_permission tool', () => {
    it('should check permission correctly', async () => {
      const result = await (server as any).checkPermission({
        userId: 'user1',
        roles: ['editor'],
        permission: 'content:write',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text);
      expect(data.hasPermission).toBe(true);
      expect(data.allowed).toBe(true);
    });

    it('should reject missing permission', async () => {
      const result = await (server as any).checkPermission({
        userId: 'user1',
        roles: ['viewer'],
        permission: 'content:delete',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.hasPermission).toBe(false);
      expect(data.allowed).toBe(false);
    });
  });

  describe('check_role tool', () => {
    it('should check role correctly', async () => {
      const result = await (server as any).checkRole({
        userId: 'user1',
        roles: ['editor', 'viewer'],
        role: 'editor',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.hasRole).toBe(true);
    });

    it('should reject missing role', async () => {
      const result = await (server as any).checkRole({
        userId: 'user1',
        roles: ['viewer'],
        role: 'admin',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.hasRole).toBe(false);
    });
  });

  describe('list_permissions tool', () => {
    it('should list all user permissions', async () => {
      const result = await (server as any).listPermissions({
        userId: 'user1',
        roles: ['editor'],
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions).toContain('content:read');
      expect(data.permissions).toContain('content:write');
    });
  });

  describe('deny_permission tool', () => {
    it('should deny permission', async () => {
      const result = await (server as any).denyPermission({
        userId: 'user1',
        permission: 'content:delete',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // Verify denied
      const denied = rbac.getDeniedPermissions('user1');
      expect(denied).toContain('content:delete');
    });
  });

  describe('allow_permission tool', () => {
    it('should remove denied permission', async () => {
      // First deny
      rbac.denyPermission('user1', 'content:write');

      // Then allow
      const result = await (server as any).allowPermission({
        userId: 'user1',
        permission: 'content:write',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // Verify not denied
      const denied = rbac.getDeniedPermissions('user1');
      expect(denied).not.toContain('content:write');
    });
  });

  describe('get_denied_permissions tool', () => {
    it('should get all denied permissions', async () => {
      rbac.denyPermission('user1', 'content:delete');
      rbac.denyPermission('user1', 'admin:*');

      const result = await (server as any).getDeniedPermissions({
        userId: 'user1',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.deniedPermissions).toBeDefined();
      expect(Array.isArray(data.deniedPermissions)).toBe(true);
      expect(data.deniedPermissions).toContain('content:delete');
      expect(data.deniedPermissions).toContain('admin:*');
    });

    it('should return empty array when no denies', async () => {
      const result = await (server as any).getDeniedPermissions({
        userId: 'user2',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.deniedPermissions).toEqual([]);
    });
  });

  describe('list_roles tool', () => {
    it('should list all roles', async () => {
      const result = await (server as any).listRoles();

      const data = JSON.parse(result.content[0].text);
      expect(data.roles).toBeDefined();
      expect(Array.isArray(data.roles)).toBe(true);
      expect(data.roles).toContain('viewer');
      expect(data.roles).toContain('editor');
      expect(data.roles).toContain('admin');
    });
  });

  describe('get_role_permissions tool', () => {
    it('should get permissions for a role', async () => {
      const result = await (server as any).getRolePermissions({
        role: 'editor',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.role).toBe('editor');
      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions).toContain('content:read');
      expect(data.permissions).toContain('content:write');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool gracefully', async () => {
      const result = await (server as any).handleToolCall({
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });
  });
});
