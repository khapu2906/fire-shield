/**
 * Fire Shield MCP Adapter
 * Model Context Protocol integration for AI agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RBAC, type RBACUser, type PresetConfig } from '@fire-shield/core';

/**
 * MCP Server options for Fire Shield
 */
export interface FireShieldMCPOptions {
  /**
   * RBAC instance
   */
  rbac: RBAC;

  /**
   * Server name
   */
  serverName?: string;

  /**
   * Server version
   */
  serverVersion?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Fire Shield MCP Server
 * Exposes RBAC functionality as MCP tools for AI agents
 */
export class FireShieldMCPServer {
  private server: Server;
  private rbac: RBAC;
  private debug: boolean;

  constructor(options: FireShieldMCPOptions) {
    this.rbac = options.rbac;
    this.debug = options.debug || false;

    this.server = new Server(
      {
        name: options.serverName || 'fire-shield-rbac',
        version: options.serverVersion || '2.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request)
    );
  }

  /**
   * Get list of available MCP tools
   */
  private getTools(): Tool[] {
    return [
      {
        name: 'check_permission',
        description: 'Check if a user has a specific permission',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            roles: {
              type: 'array',
              items: { type: 'string' },
              description: 'User roles',
            },
            permission: {
              type: 'string',
              description: 'Permission to check (e.g., "user:write")',
            },
          },
          required: ['userId', 'roles', 'permission'],
        },
      },
      {
        name: 'check_role',
        description: 'Check if a user has a specific role',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            roles: {
              type: 'array',
              items: { type: 'string' },
              description: 'User roles',
            },
            role: {
              type: 'string',
              description: 'Role to check',
            },
          },
          required: ['userId', 'roles', 'role'],
        },
      },
      {
        name: 'list_permissions',
        description: 'List all permissions for a user based on their roles',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            roles: {
              type: 'array',
              items: { type: 'string' },
              description: 'User roles',
            },
          },
          required: ['userId', 'roles'],
        },
      },
      {
        name: 'deny_permission',
        description: 'Deny a specific permission for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            permission: {
              type: 'string',
              description: 'Permission to deny',
            },
          },
          required: ['userId', 'permission'],
        },
      },
      {
        name: 'allow_permission',
        description: 'Allow (remove deny) a permission for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            permission: {
              type: 'string',
              description: 'Permission to allow',
            },
          },
          required: ['userId', 'permission'],
        },
      },
      {
        name: 'get_denied_permissions',
        description: 'Get all denied permissions for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'list_roles',
        description: 'List all available roles in the RBAC system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_role_permissions',
        description: 'Get all permissions for a specific role',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Role name',
            },
          },
          required: ['role'],
        },
      },
    ];
  }

  /**
   * Handle tool call requests
   */
  private async handleToolCall(request: any): Promise<any> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'check_permission':
          return this.checkPermission(args);

        case 'check_role':
          return this.checkRole(args);

        case 'list_permissions':
          return this.listPermissions(args);

        case 'deny_permission':
          return this.denyPermission(args);

        case 'allow_permission':
          return this.allowPermission(args);

        case 'get_denied_permissions':
          return this.getDeniedPermissions(args);

        case 'list_roles':
          return this.listRoles();

        case 'get_role_permissions':
          return this.getRolePermissions(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Check permission tool
   */
  private checkPermission(args: any): any {
    const user: RBACUser = {
      id: args.userId,
      roles: args.roles,
    };

    const hasPermission = this.rbac.hasPermission(user, args.permission);
    const result = this.rbac.authorize(user, args.permission);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hasPermission,
            allowed: result.allowed,
            reason: result.reason,
            userId: user.id,
            roles: user.roles,
            permission: args.permission,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Check role tool
   */
  private checkRole(args: any): any {
    const hasRole = args.roles.includes(args.role);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hasRole,
            userId: args.userId,
            roles: args.roles,
            role: args.role,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * List permissions tool
   */
  private listPermissions(args: any): any {
    const user: RBACUser = {
      id: args.userId,
      roles: args.roles,
    };

    const permissions: string[] = [];
    for (const role of user.roles) {
      const rolePerms = this.rbac.getRolePermissions(role);
      permissions.push(...rolePerms);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            userId: user.id,
            roles: user.roles,
            permissions: [...new Set(permissions)],
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Deny permission tool
   */
  private denyPermission(args: any): any {
    this.rbac.denyPermission(args.userId, args.permission);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Permission "${args.permission}" denied for user ${args.userId}`,
            userId: args.userId,
            permission: args.permission,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Allow permission tool
   */
  private allowPermission(args: any): any {
    this.rbac.allowPermission(args.userId, args.permission);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Permission "${args.permission}" allowed for user ${args.userId}`,
            userId: args.userId,
            permission: args.permission,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get denied permissions tool
   */
  private getDeniedPermissions(args: any): any {
    const deniedPermissions = this.rbac.getDeniedPermissions(args.userId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            userId: args.userId,
            deniedPermissions,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * List roles tool
   */
  private listRoles(): any {
    const roles = this.rbac.getAllRoles();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            roles,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get role permissions tool
   */
  private getRolePermissions(args: any): any {
    const permissions = this.rbac.getRolePermissions(args.role);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            role: args.role,
            permissions,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.debug) {
      console.error('Fire Shield MCP Server started');
    }
  }

  /**
   * Get the underlying server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Create and start Fire Shield MCP server
 */
export async function createMCPServer(
  options: FireShieldMCPOptions
): Promise<FireShieldMCPServer> {
  const server = new FireShieldMCPServer(options);
  await server.start();
  return server;
}

/**
 * Standalone server entry point
 */
export async function startStandalone(config: PresetConfig): Promise<void> {
  const rbac = new RBAC({ preset: config });
  await createMCPServer({ rbac, debug: true });
}
