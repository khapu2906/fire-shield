# 🚀 Migration Guide: v2.x to v3.0.0

This guide helps you migrate from Fire Shield v2.x to v3.0.0.

## ✅ What's New in v3.0.0

### New Features
- **🧪 Plugin System** - Extensible architecture for custom logic
- **📦 Platform Independence** - Removed fs module dependency

### Breaking Changes
| Feature | v2.x | v3.0.0 | Action Required |
|---------|------|--------|------------------|
| `RBAC.fromFile()` | Available | ❌ **REMOVED** | Use loader packages |
| `RBAC.fromFileSync()` | Available | ❌ **REMOVED** | Use loader packages |
| `RBAC.fromJSONConfig()` | Available | ✅ Still works | No action |
| `RBAC.validateConfig()` | Available | ✅ Still works | No action |
| Plugin System | Not available | ✅ **NEW** | Optional - see plugin guide |

## 📦 Migration Paths

### 1. Node.js Backend

#### Before (v2.x)

```typescript
import { RBAC } from '@fire-shield/core';

// Load from file (NOT AVAILABLE IN v3.0.0)
const rbac = await RBAC.fromFile('./rbac.config.json');
```

#### After (v3.0.0) - Use fromJSONConfig

```typescript
import { RBAC } from '@fire-shield/core';
import { readFileSync } from 'fs';

// Load from file manually
const json = JSON.parse(readFileSync('./rbac.config.json', 'utf-8'));
const config = JSON.parse(json);

// Create RBAC from JSON config
const rbac = new RBAC({
  preset: config
});

// Or use static method
const rbac2 = RBAC.fromJSONConfig(JSON.stringify(config));

// Everything works to same!
rbac.hasPermission(user, 'posts:write');
```

### 2. Browser / SSR / Edge

#### Before (v2.x)

```typescript
import { RBAC } from '@fire-shield/core';

// In browser, we couldn't use fromFile anyway
// We used fromJSONConfig or manual setup
const json = require('./rbac.config.json');
const rbac = new RBAC({ preset: json });
```

#### After (v3.0.0) - No Changes Needed!

```typescript
import { RBAC } from '@fire-shield/core';

// Browser/SSR/Edge - No changes needed!
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);

// Works exactly to same
rbac.hasPermission(user, 'posts:read');
```

### 3. React / Vue / Angular / Other Frameworks

#### Framework Adapters

All framework adapters (React, Vue, Next.js, Nuxt, Angular, Svelte, Express, Fastify, Hono, etc.) are **NOT AFFECTED** by the v3.0.0 breaking changes.

They use the core `RBAC` class internally, and the only breaking change was the removal of `fromFile()` and `fromFileSync()`. Since framework adapters don't use these methods (they typically use `fromJSONConfig()` or manual setup), you don't need to change any adapter code.

```typescript
// React - NO CHANGES NEEDED
import { RBAC } from '@fire-shield/core';
import { useRBAC } from '@fire-shield/react';

const rbac = new RBAC(); // Works same as before
const { can } = useRBAC(rbac);
```

```vue
<!-- Vue - NO CHANGES NEEDED -->
<script setup>
import { RBAC } from '@fire-shield/core';
import { can } from '@fire-shield/vue';

const rbac = new RBAC(); // Works same as before
</script>
```

```typescript
// Express - NO CHANGES NEEDED
import { createExpressRBAC } from '@fire-shield/express';
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC(); // Works same as before
const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user
});
```

## 🔧 Step-by-Step Migration

### Step 1: Identify Your Usage

**Check if you use:**

1. `RBAC.fromFile()` or `RBAC.fromFileSync()` - ❌ **NEEDS MIGRATION**
2. `RBAC.fromJSONConfig()` - ✅ **NO MIGRATION NEEDED**
3. Manual setup with `new RBAC({ config: ... })` - ✅ **NO MIGRATION NEEDED**

### Step 2: Choose Migration Path

#### Path A: Use fromJSONConfig (Recommended for Now)

**Best for:** All platforms (Node.js, Browser, Edge, SSR)

**Code:**
```typescript
import { RBAC } from '@fire-shield/core';
import { readFileSync } from 'fs'; // Node.js only

// Node.js
import { readFileSync } from 'fs';
const json = JSON.parse(readFileSync('./rbac.config.json', 'utf-8'));
const rbac = RBAC.fromJSONConfig(JSON.stringify(json));

// Browser/Edge
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);
```

**Pros:**
- ✅ Works on all platforms
- ✅ No external dependencies
- ✅ No package installation needed
- ✅ Future-proof - won't break in v4.0.0

**Cons:**
- ⚠️ Manual file reading in Node.js
- ⚠️ Need to parse JSON yourself

#### Path B: Use Loader Packages (Recommended for Node.js)

**Best for:** Node.js backends only

**Code:** (Coming in v3.1.0)
```typescript
import { NodeLoader } from '@fire-shield/node-loader';

// Load from file
const rbac = await NodeLoader.load('./rbac.config.json');

// Load from directory
const rbac = await NodeLoader.loadFromDirectory('./configs');

// Load with validation
const rbac = await NodeLoader.load('./rbac.config.json', {
  validate: true
});
```

**Pros:**
- ✅ Clean API
- ✅ Built-in validation
- ✅ Error handling
- ✅ Supports multiple formats

**Cons:**
- ⚠️ Requires package installation
- ⚠️ Node.js only

### Step 3: Update Your Code

#### Example 1: Express Server (Node.js)

**Before (v2.x):**
```typescript
import express from 'express';
import { RBAC } from '@fire-shield/core';

const rbac = await RBAC.fromFile('./rbac.config.json');

const app = express();
app.use('/admin',
  rbacMiddleware.requirePermission('admin:access')
);
```

**After (v3.0.0):**
```typescript
import express from 'express';
import { readFileSync } from 'fs';
import { RBAC } from '@fire-shield/core';
import { createExpressRBAC } from '@fire-shield/express';

// Load config manually
const json = JSON.parse(readFileSync('./rbac.config.json', 'utf-8'));
const rbac = new RBAC({ preset: json });

// Or use fromJSONConfig
const rbac2 = RBAC.fromJSONConfig(JSON.stringify(json));

const app = express();
app.use('/admin',
  rbacMiddleware.requirePermission('admin:access')
);
```

#### Example 2: Next.js (SSR)

**Before (v2.x):**
```typescript
import { RBAC } from '@fire-shield/core';

// In server-side code
const rbac = await RBAC.fromFile('./rbac.config.json');

export default function RootLayout({ children }) {
  return (
    <RBACProvider rbac={rbac}>
      {children}
    </RBACProvider>
  );
}
```

**After (v3.0.0) - No Changes Needed!**

```typescript
import { RBAC } from '@fire-shield/core';

// In server-side code - fromFile was never used in SSR anyway
const json = require('./rbac.config.json');
const rbac = new RBAC({ preset: json });

export default function RootLayout({ children }) {
  return (
    <RBACProvider rbac={rbac}>
      {children}
    </RBACProvider>
  );
}
```

#### Example 3: React App (Browser)

**Before (v2.x):**
```typescript
import { RBAC } from '@fire-shield/core';

// In browser, fromFile doesn't work
const json = require('./rbac.config.json');
const rbac = new RBAC({ preset: json });
```

**After (v3.0.0) - Same!**
```typescript
import { RBAC } from '@fire-shield/core';

// In browser, nothing changes!
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);
```

## 🧪 Plugin System Migration (Optional)

### What is the Plugin System?

The plugin system in v3.0.0 allows you to extend RBAC functionality with custom logic. You can create plugins for:

- Database audit logging
- Analytics tracking
- Rate limiting
- External validation
- And much more!

### Do You Need to Migrate?

**NO!** The plugin system is **OPTIONAL**. You don't need to use it if you don't want to.

Your existing code will work exactly the same without plugins.

### How to Use Plugins (Optional)

If you want to use the new plugin system:

```typescript
import { RBAC, RBACPlugin } from '@fire-shield/core';

// Create a custom plugin
class AuditDatabasePlugin implements RBACPlugin {
  name = 'database-audit';
  
  constructor(private db: any) {}

  async onPermissionCheck(event) {
    // Log to database
    await this.db.insert({
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      timestamp: event.timestamp
    });
  }
}

// Create RBAC instance
const rbac = new RBAC();

// Register plugin
await rbac.registerPlugin(new AuditDatabasePlugin(database));

// Now all permission checks are logged to database!
rbac.hasPermission(user, 'posts:write');
```

**Learn More:** [Plugin System Guide](./plugins.md)

## ✅ Verification Checklist

After migrating, verify:

- [ ] All tests pass
- [ ] Permission checks work as expected
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Config loads correctly
- [ ] Role hierarchy works
- [ ] Wildcard permissions work
- [ ] Deny permissions work
- [ ] Audit logging works (if used)
- [ ] Framework adapters work (if used)

## 🐛 Common Issues and Solutions

### Issue 1: "RBAC.fromFile is not a function"

**Cause:** You're trying to use `RBAC.fromFile()` which was removed in v3.0.0.

**Solution:** Use `RBAC.fromJSONConfig()` instead:
```typescript
// ❌ DON'T
const rbac = await RBAC.fromFile('./config.json');

// ✅ DO
const json = require('./config.json');
const rbac = RBAC.fromJSONConfig(json);
```

### Issue 2: "fs module not found" (in Browser)

**Cause:** You're importing `fs` in browser code.

**Solution:** Don't use `fs` in browser code. Use `require()` or `fetch()`:
```typescript
// ❌ DON'T (Browser)
import { readFileSync } from 'fs';

// ✅ DO (Browser)
const json = require('./config.json');
```

### Issue 3: "Cannot find module '@fire-shield/node-loader'"

**Cause:** Loader packages are coming in v3.1.0, not v3.0.0.

**Solution:** Use `RBAC.fromJSONConfig()` for now (Option A), or wait for v3.1.0 loader packages.

## 📚 Additional Resources

- [Plugin System Guide](./plugins.md) - Learn how to create custom plugins
- [API Reference](../api/core) - Complete API documentation
- [Getting Started](./getting-started) - Setup guide and basic usage
- [Roadmap](../roadmap) - Future plans and release notes

## 💡 Tips

### 1. Use Presets for Cleaner Code

```typescript
// Before
const rbac = new RBAC();
rbac.createRole('admin', ['*']);
rbac.createRole('editor', ['posts:read', 'posts:write']);
// ... more setup

// After - Use preset
const preset = {
  name: 'my-app',
  permissions: [
    { name: 'admin', bit: 1 },
    { name: 'posts:read', bit: 2 },
    { name: 'posts:write', bit: 4 }
  ],
  roles: [
    {
      name: 'admin',
      permissions: ['admin', 'posts:read', 'posts:write'],
      level: 10
    },
    {
      name: 'editor',
      permissions: ['posts:read', 'posts:write'],
      level: 5
    }
  ]
};

const rbac = new RBAC({ preset });
```

### 2. Use Environment Variables for Config Paths

```typescript
// Node.js
const configPath = process.env.RBAC_CONFIG_PATH || './rbac.config.json';
const json = readFileSync(configPath, 'utf-8');
const rbac = RBAC.fromJSONConfig(json);

// Browser
const configUrl = process.env.RBAC_CONFIG_URL || '/rbac.config.json';
const response = await fetch(configUrl);
const json = await response.json();
const rbac = RBAC.fromJSONConfig(json);
```

### 3. Wrap Loading in Try-Catch

```typescript
let rbac: RBAC;

try {
  const json = require('./rbac.config.json');
  rbac = RBAC.fromJSONConfig(json);
} catch (error) {
  console.error('Failed to load RBAC config:', error);
  // Use fallback config
  rbac = new RBAC({
    preset: fallbackConfig
  });
}
```

## 🎯 Quick Reference

| Feature | v2.x | v3.0.0 | Migration |
|---------|------|--------|----------|
| `RBAC.fromFile()` | ✅ | ❌ Removed | Use `fromJSONConfig()` |
| `RBAC.fromFileSync()` | ✅ | ❌ Removed | Use `fromJSONConfig()` |
| `RBAC.fromJSONConfig()` | ✅ | ✅ | ✅ No change |
| `RBAC.validateConfig()` | ✅ | ✅ | ✅ No change |
| Plugin System | ❌ | ✅ | Optional |
| Core functionality | ✅ | ✅ | ✅ No change |
| Framework adapters | ✅ | ✅ | ✅ No change |

## ✅ You're Ready!

After following this migration guide:

- ✅ Your code works with v3.0.0
- ✅ You have access to the new plugin system (optional)
- ✅ Your app is platform-independent (works in Node.js, Browser, Edge)
- ✅ You're ready for future v3.x releases

---

**Need Help?**

- [Plugin System Guide](./plugins.md) - Learn about plugins
- [GitHub Issues](https://github.com/khapu2906/fire-shield/issues) - Report bugs
- [GitHub Discussions](https://github.com/khapu2906/fire-shield/discussions) - Ask questions

---

**Happy migrating! 🚀**
