# 🧪 Plugin System Guide

Fire Shield v3.0.0 introduces a powerful plugin system that allows you to extend RBAC functionality with custom logic, integrations, and automation.

## What are Plugins?

Plugins are modular components that hook into Fire Shield's lifecycle to add custom functionality. They can:

- **Log permission checks** to databases or external services
- **Track role changes** for audit trails
- **Validate permissions** against external systems
- **Rate limit permission checks** to prevent abuse
- **Cache results** in external systems like Redis
- **Send notifications** when permissions change
- And much more!

## Plugin Interface

Every plugin implements the `RBACPlugin` interface:

```typescript
import { RBACPlugin } from '@fire-shield/core';

class MyPlugin implements RBACPlugin {
  // Plugin name (must be unique)
  name: string = 'my-plugin';

  // Optional: Called when permission is checked
  onPermissionCheck?(event: AuditEvent): Promise<void> | void;

  // Optional: Called when a role is created
  onRoleAdded?(roleName: string, permissions: string[]): Promise<void> | void;

  // Optional: Called when a permission is registered
  onPermissionRegistered?(permissionName: string, bit: number): Promise<void> | void;
}
```

### Plugin Hooks

#### `onPermissionCheck(event)`
Triggered after every permission check.

**Event Type:** `AuditEvent`
```typescript
interface AuditEvent {
  type: 'permission_check';
  userId: string;
  permission: string;
  allowed: boolean;
  reason?: string;
  context?: Record<string, any>;
  timestamp: number;
}
```

#### `onRoleAdded(roleName, permissions)`
Triggered after a role is created.

**Parameters:**
- `roleName`: Name of the new role
- `permissions`: Array of permission strings assigned to the role

#### `onPermissionRegistered(permissionName, bit)`
Triggered after a permission is registered (bit-based system only).

**Parameters:**
- `permissionName`: Name of the new permission
- `bit`: Bit value assigned to the permission

## Registering Plugins

```typescript
import { RBAC, RBACPlugin } from '@fire-shield/core';

// Create plugin
const plugin = new MyPlugin();

// Create RBAC instance
const rbac = new RBAC();

// Register plugin
await rbac.registerPlugin(plugin);

// Now all hooks will trigger
rbac.hasPermission(user, 'posts:write');
```

## Plugin Examples

### 1. Database Audit Plugin

Log all permission checks to a database for compliance and auditing.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class DatabaseAuditPlugin implements RBACPlugin {
  name = 'database-audit';
  
  constructor(private db: any) {}

  async onPermissionCheck(event) {
    await this.db.insert({
      type: 'permission_check',
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      reason: event.reason,
      timestamp: event.timestamp
    });
  }

  async onRoleAdded(roleName: string, permissions: string[]) {
    await this.db.insert({
      type: 'role_added',
      roleName,
      permissions,
      timestamp: Date.now()
    });
  }
}

// Usage
const plugin = new DatabaseAuditPlugin(database);
await rbac.registerPlugin(plugin);
```

### 2. Analytics Plugin

Track permission check events for analytics and monitoring.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class AnalyticsPlugin implements RBACPlugin {
  name = 'analytics';
  private events: AuditEvent[] = [];

  onPermissionCheck(event) {
    this.events.push(event);

    // Send to analytics service
    this.analytics.track('permission_check', {
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      timestamp: Date.now()
    });
  }
}

// Usage
const plugin = new AnalyticsPlugin(analyticsService);
await rbac.registerPlugin(plugin);
```

### 3. Rate Limiting Plugin

Prevent excessive permission checks to protect against abuse.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class RateLimitPlugin implements RBACPlugin {
  name = 'rate-limiter';
  private limits: Map<string, { count: number; window: number }> = new Map();

  onPermissionCheck(event) {
    const key = `${event.userId}:${event.permission}`;
    const now = Date.now();
    const limit = this.limits.get(key) || { count: 0, window: 1000 };

    // Reset if window expired
    if (now > limit.window) {
      limit.count = 0;
      limit.window = now + 60000; // 1 minute window
    }

    limit.count++;
    
    if (limit.count > 100) {
      throw new Error(`Rate limit exceeded for ${event.permission}`);
    }

    this.limits.set(key, limit);
  }
}

// Usage
const plugin = new RateLimitPlugin();
await rbac.registerPlugin(plugin);
```

### 4. Cache Plugin

Cache permission check results in external systems like Redis.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class RedisCachePlugin implements RBACPlugin {
  name = 'redis-cache';
  private ttl: number = 60; // 60 seconds

  constructor(private redis: any, options: { ttl?: number } = {}) {
    this.ttl = options.ttl ?? this.ttl;
  }

  async onPermissionCheck(event) {
    const key = `rbac:${event.userId}:${event.permission}`;

    // Try to get from cache
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return;
    }

    // Set in cache
    await this.redis.setex(key, event.allowed, this.ttl);
  }
}

// Usage
const plugin = new RedisCachePlugin(redisClient, { ttl: 120 });
await rbac.registerPlugin(plugin);
```

### 5. Validation Plugin

Validate permissions against an external system before allowing access.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class ExternalValidationPlugin implements RBACPlugin {
  name = 'external-validation';

  constructor(private api: any) {}

  async onPermissionCheck(event) {
    if (!event.allowed) return;

    // Validate against external system
    const valid = await this.api.validatePermission(
      event.userId,
      event.permission
    );

    if (!valid) {
      throw new Error(`Permission ${event.permission} not valid for user ${event.userId}`);
    }
  }
}

// Usage
const plugin = new ExternalValidationPlugin(apiClient);
await rbac.registerPlugin(plugin);
```

### 6. Notification Plugin

Send notifications when roles or permissions change.

```typescript
import { RBACPlugin } from '@fire-shield/core';

export class NotificationPlugin implements RBACPlugin {
  name = 'notification';

  constructor(private notifier: any) {}

  async onRoleAdded(roleName: string, permissions: string[]) {
    await this.notifier.send({
      title: 'New Role Created',
      message: `Role "${roleName}" was created with ${permissions.length} permissions`
    });
  }

  async onPermissionRegistered(permissionName: string, bit: number) {
    await this.notifier.send({
      title: 'New Permission Registered',
      message: `Permission "${permissionName}" (bit: ${bit}) was registered`
    });
  }
}

// Usage
const plugin = new NotificationPlugin(emailService);
await rbac.registerPlugin(plugin);
```

## Plugin Lifecycle

### 1. Registration
```typescript
await rbac.registerPlugin(plugin);
```

### 2. Execution
Plugins are triggered during RBAC operations:
- `hasPermission()` → `onPermissionCheck()`
- `createRole()` → `onRoleAdded()`
- `registerPermission()` → `onPermissionRegistered()`

### 3. Error Handling
Plugin errors don't break RBAC operations:

```typescript
// Plugin throws error
class BuggyPlugin implements RBACPlugin {
  name = 'buggy';
  onPermissionCheck() {
    throw new Error('Oops!');
  }
}

// RBAC catches and logs error, continues operation
await rbac.registerPlugin(new BuggyPlugin());
rbac.hasPermission(user, 'posts:write'); // Still works, error logged
```

### 4. Unregistration
```typescript
await rbac.unregisterPlugin('plugin-name');
```

## Best Practices

### 1. Keep Plugins Lightweight
Plugins should be fast and efficient to avoid slowing down permission checks.

```typescript
// Good: Fast operation
onPermissionCheck(event) {
  this.logger.log(event); // Fast
}

// Bad: Blocking operation
onPermissionCheck(event) {
  await this.database.query('SELECT * FROM huge_table'); // Slow!
}
```

### 2. Handle Errors Gracefully
Always catch and handle errors in your plugins.

```typescript
onPermissionCheck(event) {
  try {
    this.api.track(event);
  } catch (error) {
    console.error('Plugin error:', error);
    // Don't throw - let RBAC continue
  }
}
```

### 3. Use Async for I/O Operations
Use `async/await` for database calls, network requests, etc.

```typescript
async onPermissionCheck(event) {
  await this.database.insert(event); // Use async
}
```

### 4. Test Your Plugins
Write tests for your plugins to ensure they work correctly.

```typescript
describe('MyPlugin', () => {
  it('should log permission checks', async () => {
    const plugin = new MyPlugin(logger);
    const event = {
      type: 'permission_check',
      userId: '123',
      permission: 'posts:read',
      allowed: true,
      timestamp: Date.now()
    };

    await plugin.onPermissionCheck(event);
    expect(logger.log).toHaveBeenCalledWith(event);
  });
});
```

## Plugin Architecture

```
┌─────────────────────────────────────┐
│         RBAC Instance               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    PluginManager          │   │
│  │                           │   │
│  │  ┌─────────────────────┐  │   │
│  │  │    Plugin 1        │  │   │
│  │  │    Plugin 2        │  │   │
│  │  │    Plugin 3        │  │   │
│  │  │    ...             │  │   │
│  │  └─────────────────────┘  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Permission Check Flow:
1. User calls rbac.hasPermission()
2. RBAC checks permission
3. PluginManager.onPermissionCheck() triggered
4. All plugins receive event
5. Result returned to user
```

## Advanced Topics

### Plugin Dependencies

Plugins can depend on other plugins. Execute plugins in specific order:

```typescript
// Register in order - plugins execute in registration order
await rbac.registerPlugin(cachePlugin);
await rbac.registerPlugin(auditPlugin);
await rbac.registerPlugin(notificationPlugin);
```

### Plugin Configuration

Pass configuration to plugins:

```typescript
class ConfigurablePlugin implements RBACPlugin {
  name = 'configurable';
  private options: any;

  constructor(options: any) {
    this.options = options;
  }

  onPermissionCheck(event) {
    if (this.options.logDenied && !event.allowed) {
      console.log('Denied:', event.permission);
    }
  }
}

const plugin = new ConfigurablePlugin({ logDenied: true });
await rbac.registerPlugin(plugin);
```

### Plugin State Management

Plugins can maintain internal state:

```typescript
class StatefulPlugin implements RBACPlugin {
  name = 'stateful';
  private state: Map<string, any> = new Map();

  onPermissionCheck(event) {
    this.state.set(`${event.userId}:${event.permission}`, event);
  }

  getState() {
    return this.state;
  }
}
```

## Debugging Plugins

### 1. Check Registered Plugins
```typescript
const allPlugins = rbac.getAllPlugins();
console.log('Plugins:', allPlugins.map(p => p.name));
```

### 2. Get Specific Plugin
```typescript
const plugin = rbac.getPlugin('database-audit');
console.log('Plugin:', plugin);
```

### 3. Enable Plugin Debugging
```typescript
class DebugPlugin implements RBACPlugin {
  name = 'debug';
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  onPermissionCheck(event) {
    if (this.enabled) {
      console.log('[DEBUG]', event);
    }
  }
}

// Enable debug mode
const plugin = new DebugPlugin(true);
await rbac.registerPlugin(plugin);
```

## Troubleshooting

### Plugin Not Triggering

**Problem:** Plugin hooks not being called.

**Solution:** Check that:
1. Plugin is registered: `rbac.getPlugin('plugin-name')`
2. Plugin implements hooks: `onPermissionCheck` is defined
3. RBAC methods are being called: `hasPermission()`, `createRole()`, etc.

### Plugin Slows Down Permissions

**Problem:** Permission checks are slow after adding plugin.

**Solution:**
1. Keep plugin logic lightweight
2. Use async for I/O operations
3. Consider caching plugin results

### Plugin Errors Break RBAC

**Problem:** Plugin errors crash the RBAC instance.

**Solution:** RBAC automatically catches plugin errors. Check console for error messages:
```typescript
// Plugin errors are logged like:
// Plugin error: <error message>
```

## Next Steps

- Create your first plugin
- Test it thoroughly
- Share it with the community
- Contribute to Fire Shield plugin ecosystem

## Community Plugins

Coming soon! The Fire Shield community will have a plugin marketplace where you can:
- Browse plugins created by others
- Share your own plugins
- Rate and review plugins
- Get inspiration for new plugins

## Need Help?

- Check the [API Reference](/api/core)
- Ask questions in [GitHub Discussions](https://github.com/khapu2906/fire-shield/discussions)
- Report bugs in [GitHub Issues](https://github.com/khapu2906/fire-shield/issues)

---

Happy plugin building! 🧪
