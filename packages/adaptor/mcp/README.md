# @fire-shield/mcp

Model Context Protocol (MCP) adapter for Fire Shield RBAC - AI agent integration.

## Features

- 🤖 **AI Agent Integration** - Expose RBAC as MCP tools for AI agents
- 🔧 **8 MCP Tools** - Complete RBAC functionality for agents
- 🚀 **Easy Setup** - Start MCP server with one function call
- 📝 **Type-Safe** - Full TypeScript support
- 🔐 **Deny Support** - Full deny permissions support

## Installation

```bash
npm install @fire-shield/mcp @modelcontextprotocol/sdk
# or
yarn add @fire-shield/mcp @modelcontextprotocol/sdk
# or
pnpm add @fire-shield/mcp @modelcontextprotocol/sdk
```

## Quick Start

```typescript
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';

// Create RBAC instance
const rbac = new RBAC({
  config: {
    permissions: [
      { name: 'content:read', bit: 1 },
      { name: 'content:write', bit: 2 },
    ],
    roles: [
      { name: 'viewer', permissions: ['content:read'], level: 1 },
      { name: 'editor', permissions: ['content:read', 'content:write'], level: 5 },
      { name: 'admin', permissions: ['*'], level: 10 },
    ],
  },
});

// Start MCP server
const server = await createMCPServer({
  rbac,
  serverName: 'my-rbac-server',
  serverVersion: '1.0.0',
  debug: true,
});
```

## Available MCP Tools

### 1. check_permission

Check if a user has a specific permission.

```json
{
  "name": "check_permission",
  "arguments": {
    "userId": "user123",
    "roles": ["editor"],
    "permission": "content:write"
  }
}
```

**Response:**
```json
{
  "hasPermission": true,
  "allowed": true,
  "reason": "User has permission",
  "userId": "user123",
  "roles": ["editor"],
  "permission": "content:write"
}
```

### 2. check_role

Check if a user has a specific role.

```json
{
  "name": "check_role",
  "arguments": {
    "userId": "user123",
    "roles": ["editor", "viewer"],
    "role": "editor"
  }
}
```

### 3. list_permissions

List all permissions for a user.

```json
{
  "name": "list_permissions",
  "arguments": {
    "userId": "user123",
    "roles": ["editor"]
  }
}
```

**Response:**
```json
{
  "userId": "user123",
  "roles": ["editor"],
  "permissions": ["content:read", "content:write"]
}
```

### 4. deny_permission

Deny a permission for a user.

```json
{
  "name": "deny_permission",
  "arguments": {
    "userId": "user123",
    "permission": "content:delete"
  }
}
```

### 5. allow_permission

Remove a denied permission.

```json
{
  "name": "allow_permission",
  "arguments": {
    "userId": "user123",
    "permission": "content:delete"
  }
}
```

### 6. get_denied_permissions

Get all denied permissions for a user.

```json
{
  "name": "get_denied_permissions",
  "arguments": {
    "userId": "user123"
  }
}
```

### 7. list_roles

List all available roles.

```json
{
  "name": "list_roles",
  "arguments": {}
}
```

### 8. get_role_permissions

Get permissions for a specific role.

```json
{
  "name": "get_role_permissions",
  "arguments": {
    "role": "editor"
  }
}
```

## Claude Desktop Integration

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

## Example MCP Server Script

Create `mcp-server.js`:

```javascript
import { RBAC } from '@fire-shield/core';
import { createMCPServer } from '@fire-shield/mcp';

const rbac = new RBAC({
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

await createMCPServer({
  rbac,
  serverName: 'fire-shield-rbac',
  debug: process.env.DEBUG === 'true',
});
```

## Use Cases

### AI Agent Permission Checks

AI agents can check permissions before performing actions:

```
Agent: Can user123 with role 'editor' write content?
Tool: check_permission -> Yes, user has content:write permission
Agent: Proceeding with content creation...
```

### Dynamic Permission Management

```
Agent: Deny admin:delete permission for user456
Tool: deny_permission -> Permission denied successfully
Agent: User456 can no longer delete admin content
```

### Role Discovery

```
Agent: What roles are available?
Tool: list_roles -> ["viewer", "editor", "admin"]
Agent: What can an editor do?
Tool: get_role_permissions -> ["content:read", "content:write"]
```

## Advanced Usage

### Custom Server Class

```typescript
import { FireShieldMCPServer } from '@fire-shield/mcp';

class CustomMCPServer extends FireShieldMCPServer {
  constructor(options) {
    super(options);
    // Add custom initialization
  }

  // Override or add custom methods
}

const server = new CustomMCPServer({ rbac });
await server.start();
```

### Error Handling

```typescript
try {
  const server = await createMCPServer({ rbac });
  console.log('MCP Server started successfully');
} catch (error) {
  console.error('Failed to start MCP server:', error);
}
```

## TypeScript

Full TypeScript support:

```typescript
import {
  FireShieldMCPServer,
  FireShieldMCPOptions,
  createMCPServer
} from '@fire-shield/mcp';

const options: FireShieldMCPOptions = {
  rbac,
  serverName: 'my-server',
  debug: true,
};

const server: FireShieldMCPServer = await createMCPServer(options);
```

## Best Practices

1. **Use Debug Mode in Development** - Enable debug logging to see what's happening
2. **Secure Your MCP Server** - Run in secure environment, don't expose publicly
3. **Cache RBAC Instance** - Reuse RBAC instance across requests
4. **Handle Errors Gracefully** - Tools return error messages in MCP format
5. **Document Custom Tools** - If extending, document new tools for agents

## Performance

- **Fast Tool Execution** - Direct RBAC calls, no overhead
- **Stateless Design** - Each tool call is independent
- **Efficient JSON Serialization** - Minimal data transfer
- **No Rate Limiting** - MCP handles connection management

## Compatibility

- **MCP SDK**: 0.5.0+
- **Node.js**: 18+
- **Fire Shield Core**: 2.2.0+

## License

MIT

## Repository

[Fire Shield RBAC Monorepo](https://github.com/KentPhung92/RBAC)
