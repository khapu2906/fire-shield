# MCP (Model Context Protocol) Integration

Fire Shield provides a Model Context Protocol (MCP) adapter that exposes RBAC functionality as tools for AI agents.

## Features

- **8 MCP Tools** for permission management
- AI agent integration (Claude Desktop, Continue, etc.)
- Type-safe tool schemas
- Permission checking and management
- Deny permissions support
- Role and permission listing
- Stdio transport for easy integration
- Full TypeScript support

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that enables AI applications to securely connect with data sources and tools. Think of it as a standard way for AI agents to interact with external systems.

**Use cases:**
- AI assistants managing user permissions
- Chatbots checking access control
- Automated permission auditing
- AI-powered admin panels
- Permission recommendations

## Installation

```bash
npm install @fire-shield/mcp @fire-shield/core @modelcontextprotocol/sdk
```

## Quick Start

### 1. Create MCP Server

```typescript
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';

// Initialize RBAC
const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);

// Create MCP server
const mcpServer = await createMCPServer({
  rbac,
  serverName: 'fire-shield-rbac',
  serverVersion: '2.2.0',
  debug: true
});

// Server is now running and listening for MCP requests
```

### 2. Configure AI Client (Claude Desktop)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fire-shield": {
      "command": "node",
      "args": ["/path/to/your/mcp-server.js"]
    }
  }
}
```

### 3. Use in AI Conversations

Now you can ask Claude:

> "Check if user123 with role 'editor' can write posts"

Claude will use the `check_permission` tool to query your RBAC system.

## Available MCP Tools

### 1. `check_permission` - Check User Permission

Check if a user has a specific permission.

**Input Schema:**
```typescript
{
  userId: string;      // User ID
  roles: string[];     // User roles
  permission: string;  // Permission to check
}
```

**Example:**
```json
{
  "userId": "user123",
  "roles": ["editor"],
  "permission": "post:write"
}
```

**Response:**
```json
{
  "hasPermission": true,
  "allowed": true,
  "reason": "Permission granted",
  "userId": "user123",
  "roles": ["editor"],
  "permission": "post:write"
}
```

### 2. `check_role` - Check User Role

Check if a user has a specific role.

**Input Schema:**
```typescript
{
  userId: string;   // User ID
  roles: string[];  // User roles
  role: string;     // Role to check
}
```

**Example:**
```json
{
  "userId": "user123",
  "roles": ["editor", "viewer"],
  "role": "editor"
}
```

**Response:**
```json
{
  "hasRole": true,
  "userId": "user123",
  "roles": ["editor", "viewer"],
  "role": "editor"
}
```

### 3. `list_permissions` - List User Permissions

Get all permissions for a user based on their roles.

**Input Schema:**
```typescript
{
  userId: string;   // User ID
  roles: string[];  // User roles
}
```

**Example:**
```json
{
  "userId": "user123",
  "roles": ["editor"]
}
```

**Response:**
```json
{
  "userId": "user123",
  "roles": ["editor"],
  "permissions": ["post:read", "post:write"]
}
```

### 4. `deny_permission` - Deny Permission

Deny a specific permission for a user (overrides role permissions).

**Input Schema:**
```typescript
{
  userId: string;      // User ID
  permission: string;  // Permission to deny
}
```

**Example:**
```json
{
  "userId": "user123",
  "permission": "post:delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permission 'post:delete' denied for user user123",
  "userId": "user123",
  "permission": "post:delete"
}
```

### 5. `allow_permission` - Allow Permission

Remove a denied permission (restores role permissions).

**Input Schema:**
```typescript
{
  userId: string;      // User ID
  permission: string;  // Permission to allow
}
```

**Example:**
```json
{
  "userId": "user123",
  "permission": "post:delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permission 'post:delete' allowed for user user123",
  "userId": "user123",
  "permission": "post:delete"
}
```

### 6. `get_denied_permissions` - Get Denied Permissions

Get all denied permissions for a user.

**Input Schema:**
```typescript
{
  userId: string;  // User ID
}
```

**Example:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "userId": "user123",
  "deniedPermissions": ["post:delete", "user:write"]
}
```

### 7. `list_roles` - List All Roles

List all available roles in the RBAC system.

**Input Schema:**
```typescript
{}  // No parameters required
```

**Response:**
```json
{
  "roles": ["admin", "editor", "viewer"]
}
```

### 8. `get_role_permissions` - Get Role Permissions

Get all permissions for a specific role.

**Input Schema:**
```typescript
{
  role: string;  // Role name
}
```

**Example:**
```json
{
  "role": "editor"
}
```

**Response:**
```json
{
  "role": "editor",
  "permissions": ["post:read", "post:write"]
}
```

## API Reference

### FireShieldMCPServer

Main class for creating an MCP server.

```typescript
class FireShieldMCPServer {
  constructor(options: FireShieldMCPOptions);
  async start(): Promise<void>;
  getServer(): Server;
}
```

### FireShieldMCPOptions

Configuration options for the MCP server.

```typescript
interface FireShieldMCPOptions {
  rbac: RBAC;              // RBAC instance
  serverName?: string;     // Server name (default: 'fire-shield-rbac')
  serverVersion?: string;  // Server version (default: '2.2.0')
  debug?: boolean;         // Enable debug logging (default: false)
}
```

### createMCPServer()

Factory function to create and start an MCP server.

```typescript
async function createMCPServer(
  options: FireShieldMCPOptions
): Promise<FireShieldMCPServer>
```

### startStandalone()

Start a standalone MCP server from a preset configuration.

```typescript
async function startStandalone(config: PresetConfig): Promise<void>
```

## Usage Examples

### Standalone Server

Create a standalone MCP server file:

```typescript
// mcp-server.ts
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';

async function main() {
  // Initialize RBAC with your configuration
  const rbac = new RBAC();

  // Define roles
  rbac.createRole('admin', ['*']);
  rbac.createRole('editor', ['post:read', 'post:write', 'post:edit']);
  rbac.createRole('viewer', ['post:read']);

  // Create and start MCP server
  const server = await createMCPServer({
    rbac,
    serverName: 'my-app-rbac',
    serverVersion: '1.0.0',
    debug: process.env.NODE_ENV === 'development'
  });

  console.error('MCP server started successfully');
}

main().catch(console.error);
```

Build and run:

```bash
# Build
npx tsc mcp-server.ts

# Run
node mcp-server.js
```

### Load from Config File

```typescript
// mcp-server-config.ts
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';
import { readFileSync } from 'fs';

async function main() {
  // Load RBAC configuration from file
  const config = JSON.parse(readFileSync('./rbac-config.json', 'utf-8'));
  const rbac = new RBAC({ preset: config });

  // Create MCP server
  await createMCPServer({
    rbac,
    serverName: config.name || 'fire-shield-rbac',
    serverVersion: config.version || '1.0.0'
  });
}

main().catch(console.error);
```

Config file (`rbac-config.json`):

```json
{
  "name": "my-app-rbac",
  "version": "1.0.0",
  "permissions": [
    { "name": "user:read", "bit": 1 },
    { "name": "user:write", "bit": 2 },
    { "name": "post:read", "bit": 4 },
    { "name": "post:write", "bit": 8 }
  ],
  "roles": [
    { "name": "admin", "permissions": ["user:*", "post:*"] },
    { "name": "editor", "permissions": ["post:read", "post:write"] },
    { "name": "viewer", "permissions": ["post:read"] }
  ]
}
```

### Integration with Express API

Use MCP server alongside your API:

```typescript
import express from 'express';
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';

// Shared RBAC instance
const rbac = new RBAC();
rbac.createRole('admin', ['*']);
rbac.createRole('editor', ['post:*']);

// Start Express API
const app = express();
app.use(express.json());

app.post('/api/check-permission', (req, res) => {
  const { user, permission } = req.body;
  const hasPermission = rbac.hasPermission(user, permission);
  res.json({ hasPermission });
});

app.listen(3000, () => {
  console.log('API running on port 3000');
});

// Start MCP server (shares the same RBAC instance)
createMCPServer({
  rbac,
  debug: true
}).then(() => {
  console.error('MCP server started');
});
```

## Claude Desktop Configuration

### Basic Configuration

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "fire-shield": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server.js"]
    }
  }
}
```

### With Environment Variables

```json
{
  "mcpServers": {
    "fire-shield": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "NODE_ENV": "production",
        "RBAC_CONFIG": "/path/to/rbac-config.json"
      }
    }
  }
}
```

### Using npx

```json
{
  "mcpServers": {
    "fire-shield": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/path/to/mcp-server.ts"
      ]
    }
  }
}
```

## AI Conversation Examples

### Example 1: Check Permission

**User:** "Check if user 'john' with role 'editor' can write posts"

**Claude:** *Uses check_permission tool*
```json
{
  "userId": "john",
  "roles": ["editor"],
  "permission": "post:write"
}
```

**Response:** "Yes, user 'john' with role 'editor' has permission to write posts."

### Example 2: List Permissions

**User:** "What permissions does the editor role have?"

**Claude:** *Uses get_role_permissions tool*
```json
{
  "role": "editor"
}
```

**Response:** "The editor role has the following permissions:
- post:read
- post:write
- post:edit"

### Example 3: Deny Permission

**User:** "Temporarily revoke post delete permission from user 'alice'"

**Claude:** *Uses deny_permission tool*
```json
{
  "userId": "alice",
  "permission": "post:delete"
}
```

**Response:** "I've denied the 'post:delete' permission for user 'alice'. This override takes precedence over their role permissions."

### Example 4: Audit Permissions

**User:** "Show me all permissions for user 'bob' with roles 'editor' and 'moderator'"

**Claude:** *Uses list_permissions tool*
```json
{
  "userId": "bob",
  "roles": ["editor", "moderator"]
}
```

**Response:** "User 'bob' with roles 'editor' and 'moderator' has these permissions:
- post:read
- post:write
- post:edit
- comment:moderate
- comment:delete"

## Integration with Continue

[Continue](https://continue.dev) is an AI code assistant that supports MCP.

### Configuration

Add to Continue config (`.continue/config.json`):

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "node",
          "args": ["/path/to/mcp-server.js"]
        }
      }
    ]
  }
}
```

### Usage

In your IDE, ask Continue:
- "Check if this user has admin permissions"
- "What roles are available in our RBAC system?"
- "List all permissions for the editor role"

## Debugging

### Enable Debug Mode

```typescript
const server = await createMCPServer({
  rbac,
  debug: true  // Enables debug logging to stderr
});
```

### View MCP Messages

MCP communication happens over stdio:
- **stdin:** Receives MCP requests
- **stdout:** Sends MCP responses
- **stderr:** Debug logs (when debug: true)

### Test Tools Manually

You can test MCP tools using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npm install -g @modelcontextprotocol/inspector

# Inspect your server
mcp-inspector node mcp-server.js
```

## Best Practices

### 1. Separate MCP Server Process

Run your MCP server as a separate process from your main application:

```typescript
// Good: Dedicated MCP server
// mcp-server.ts
createMCPServer({ rbac });

// app.ts
// Your main application
```

### 2. Share Configuration

Use the same RBAC configuration across your app and MCP server:

```typescript
// config/rbac.ts
export const rbacConfig = {
  permissions: [...],
  roles: [...]
};

// app.ts
const rbac = new RBAC({ preset: rbacConfig });

// mcp-server.ts
const rbac = new RBAC({ preset: rbacConfig });
```

### 3. Validate User Input

Always validate user IDs and roles from AI agents:

```typescript
const allowedUsers = ['user1', 'user2', 'user3'];

if (!allowedUsers.includes(userId)) {
  throw new Error('Invalid user ID');
}
```

### 4. Audit MCP Operations

Log all permission checks and modifications:

```typescript
const rbac = new RBAC({
  auditLogger: new BufferedAuditLogger(async (logs) => {
    console.log('MCP Audit:', logs);
    await database.saveLogs(logs);
  })
});
```

### 5. Secure Your MCP Server

MCP servers should only be accessible to trusted AI agents:

- ✅ Run on localhost only
- ✅ Use process isolation
- ✅ Validate all inputs
- ❌ Don't expose over network without authentication

## Limitations

- **No Network Transport:** Currently only stdio transport is supported
- **Stateless:** Each tool call is independent (no session state)
- **Synchronous:** All operations are synchronous (no async RBAC operations in tools)

## Troubleshooting

### MCP Server Not Starting

**Error:** `Cannot find module '@modelcontextprotocol/sdk'`

**Solution:**
```bash
npm install @modelcontextprotocol/sdk
```

### Tools Not Appearing in Claude

**Problem:** Claude doesn't show Fire Shield tools

**Solutions:**
1. Check config file path
2. Ensure server script is executable
3. Restart Claude Desktop
4. Check stderr for errors

### Permission Check Returning Wrong Results

**Problem:** `check_permission` returns unexpected results

**Solutions:**
1. Verify RBAC configuration is loaded correctly
2. Check user roles are spelled correctly
3. Enable debug mode to see logs
4. Test with CLI tool first: `fire-shield check config.json -u user1 -r editor -p post:write`

## Performance

- **Cold Start:** ~50-100ms
- **Tool Execution:** <1ms per operation
- **Memory:** ~10-20MB (depends on RBAC size)

## Next Steps

- [Core API](/api/core) - RBAC API reference
- [CLI Tool](/frameworks/cli) - Command-line validation
- [Deny Permissions](/guide/deny-permissions) - Understanding denies
- [MCP Protocol](https://modelcontextprotocol.io) - Learn more about MCP

## Resources

- **MCP Specification:** https://modelcontextprotocol.io
- **MCP SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **Claude Desktop:** https://claude.ai/download
- **Continue:** https://continue.dev
