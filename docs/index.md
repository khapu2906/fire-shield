---
layout: home

hero:
  name: Fire Shield
  text: Type-safe RBAC Library
  tagline: Fast, flexible, and framework-agnostic Role-Based Access Control for JavaScript/TypeScript
  image:
    src: /logo.png
    alt: Fire Shield
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/khapu2906/fire-shield
    - theme: alt
      text: API Reference
      link: /api/core

features:
  - icon: 🚀
    title: Blazing Fast
    details: Optimized with bit-level permission checking and efficient role hierarchy resolution. Built for performance-critical applications.

  - icon: 🛡️
    title: Type-Safe
    details: Full TypeScript support with comprehensive type definitions. Catch permission errors at compile-time, not runtime.

  - icon: 🎯
    title: Framework-Agnostic
    details: Works with Vue, React, Next.js, Nuxt, Angular, Svelte, Express, Fastify, Hono, and more. Use anywhere JavaScript runs.

  - icon: 🔥
    title: Wildcard Permissions
    details: Flexible permission patterns like "posts:*" or "admin:users:*". Simple yet powerful permission management.

  - icon: 📊
    title: Role Hierarchy
    details: Define role inheritance chains. Admins automatically inherit editor permissions. Clean and maintainable.

  - icon: 🔍
    title: Audit Logging
    details: Built-in audit logging for compliance and security. Track who accessed what, when, and why.

  - icon: ⚡
    title: Zero Dependencies
    details: Core library has zero dependencies. Adapters only depend on their respective frameworks. Keep your bundle small.

  - icon: 🧪
    title: Plugin System (NEW!)
    details: Extensible architecture for custom logic. Create plugins for databases, analytics, and more. (v3.0.0)

  - icon: 🚀
    title: Lazy Role Evaluation
    details: On-demand role loading for memory efficiency. Handle thousands of roles with 10x faster startup and 89% less memory.

  - icon: 💾
    title: Permission Caching
    details: Smart caching with TTL and automatic cleanup. Up to 100x faster permission checks for high-traffic applications.

  - icon: 🔧
    title: Memory Optimization
    details: Advanced memory profiling and optimization. String deduplication, optimized storage, and real-time statistics.

  - icon: 🧪
    title: Well Tested
    details: 310+ tests with 100% pass rate. Comprehensive unit and integration tests. Production-ready and reliable.

  - icon: 📦
    title: Tree-Shakeable
    details: Modern ESM build with tree-shaking support. Only import what you need for optimal bundle size.

---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>

## Quick Start

Install Fire Shield in your project:

::: code-group

```bash [npm]
npm install @fire-shield/core
```

```bash [yarn]
yarn add @fire-shield/core
```

```bash [pnpm]
pnpm add @fire-shield/core
```

:::

## Basic Usage

```typescript
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC();

// Define roles and permissions
rbac.createRole('admin', ['posts:*', 'users:*']);
rbac.createRole('editor', ['posts:read', 'posts:write']);
rbac.createRole('viewer', ['posts:read']);

// Check permissions
const user = { id: '1', roles: ['editor'] };
rbac.hasPermission(user, 'posts:write') // ✅ true
rbac.hasPermission(user, 'users:delete') // ❌ false
```

### Using Plugin System (v3.0.0)

```typescript
import { RBAC, RBACPlugin } from '@fire-shield/core';

// Create custom plugin
class DatabaseLoaderPlugin implements RBACPlugin {
  name = 'database-loader';
  
  onPermissionCheck(event) {
    // Log to database for audit
    console.log(`[AUDIT] User ${event.userId} checked ${event.permission}: ${event.allowed}`);
  }
}

// Register plugin
const rbac = new RBAC();
await rbac.registerPlugin(new DatabaseLoaderPlugin());

// All permission checks now trigger to plugin
rbac.hasPermission(user, 'posts:write');
```

### Loading Config from JSON

```typescript
// Platform-independent config loading (v3.0.0)
import { RBAC } from '@fire-shield/core';

const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(JSON.stringify(json));

// Works in Node.js, Browser, Edge, etc.
rbac.hasPermission(user, 'posts:read');
```

## Framework Integrations

Fire Shield provides first-class support for popular frameworks:

::: code-group

```vue [Vue]
<template>
  <!-- Show button only if user can write posts -->
  <button v-can="'posts:write'">Create Post</button>

  <!-- Hide button if user can't delete -->
  <button v-cannot="'posts:delete'">Delete Post</button>
</template>

<script setup>
import { useRBAC } from '@fire-shield/vue'

const { can, cannot } = useRBAC()
</script>
```

```tsx [React]
import { Can, useRBAC } from '@fire-shield/react'

function PostEditor() {
  const { can } = useRBAC()

  return (
    <>
      {/* Conditional rendering */}
      <Can permission="posts:write">
        <button>Create Post</button>
      </Can>

      {/* Programmatic check */}
      {can('posts:delete') && (
        <button>Delete Post</button>
      )}
    </>
  )
}
```

```tsx [Next.js]
import { RBACProvider } from '@fire-shield/react'
import { rbac } from '@/lib/rbac'

// In layout or _app
export default function RootLayout({ children }) {
  return (
    <RBACProvider rbac={rbac}>
      {children}
    </RBACProvider>
  )
}

// Middleware for route protection
export function middleware(request) {
  const user = getUser(request)
  if (!rbac.hasPermission(user, 'admin:access')) {
    return NextResponse.redirect('/unauthorized')
  }
}
```

```vue [Nuxt]
<template>
  <div>
    <!-- Use composables -->
    <button v-if="canWrite">Create Post</button>
    <button v-if="isAdmin">Admin Panel</button>
  </div>
</template>

<script setup>
const { can } = useFireShield()
const canWrite = can('posts:write')
const isAdmin = can('admin:access')
</script>
```

```typescript [Angular]
import { Component } from '@angular/core'
import { RBACService } from '@fire-shield/angular'

@Component({
  selector: 'app-posts',
  template: `
    <!-- Structural directive -->
    <button *fsCanPermission="'posts:write'">
      Create Post
    </button>

    <!-- Observable -->
    <button *ngIf="canDelete$ | async">
      Delete Post
    </button>
  `
})
export class PostsComponent {
  canDelete$ = this.rbac.can$('posts:delete')

  constructor(private rbac: RBACService) {}
}
```

```svelte [Svelte]
<script>
  import { can, hasRole } from '@fire-shield/svelte'

  const canWrite = can('posts:write')
  const isAdmin = hasRole('admin')
</script>

<!-- Reactive permission checks -->
{#if $canWrite}
  <button>Create Post</button>
{/if}

{#if $isAdmin}
  <button>Admin Panel</button>
{/if}

<!-- Use actions -->
<button use:can={'posts:delete'}>Delete</button>
```

```typescript [Express]
import { createExpressRBAC } from '@fire-shield/express'

const rbacMiddleware = createExpressRBAC(rbac, {
  getUser: (req) => req.user
})

// Protect routes
app.post('/posts',
  rbacMiddleware.requirePermission('posts:write'),
  createPost
)

app.delete('/posts/:id',
  rbacMiddleware.requirePermission('posts:delete'),
  deletePost
)
```

```typescript [Fastify]
import { createFastifyRBAC } from '@fire-shield/fastify'

const { rbacPlugin, requirePermission } = createFastifyRBAC(rbac, {
  getUser: (request) => request.user
})

// Register plugin
fastify.register(rbacPlugin)

// Protect routes
fastify.post('/posts', {
  preHandler: requirePermission('posts:write')
}, createPost)
```

```typescript [Hono]
import { Hono } from 'hono'
import { HonoRBACAdapter } from '@fire-shield/hono'

const app = new Hono()
const rbacMiddleware = new HonoRBACAdapter(rbac)

// Protect routes
app.get('/admin',
  rbacMiddleware.permission('admin:access'),
  (c) => c.json({ admin: true })
)

// Works on edge: Cloudflare, Deno, Vercel
export default app
```

```svelte [SvelteKit]
<script lang="ts">
  import { can } from '@fire-shield/sveltekit'

  const canWrite = can('posts:write')
  const canDelete = can('posts:delete')
</script>

<!-- Reactive permission checks -->
{#if $canWrite}
  <button>Create Post</button>
{/if}

{#if $canDelete}
  <button>Delete Post</button>
{/if}
```

```typescript [GraphQL]
import { GraphQLRBACAdapter } from '@fire-shield/graphql'

const rbacAdapter = new GraphQLRBACAdapter(rbac)

const resolvers = {
  Mutation: {
    createPost: rbacAdapter.protect('posts:write', (parent, args, context) => {
      // Create post logic
      return createPost(args.input)
    }),

    deletePost: rbacAdapter.protect('posts:delete', (parent, args, context) => {
      // Delete post logic
      return deletePost(args.id)
    })
  }
}
```

```typescript [tRPC]
import { createTRPCRBAC } from '@fire-shield/trpc'

const { protectedProcedure } = createTRPCRBAC(rbac, {
  getUser: (ctx) => ctx.user
})

const appRouter = router({
  createPost: protectedProcedure('posts:write')
    .input(z.object({ title: z.string() }))
    .mutation(({ input }) => {
      return createPost(input)
    }),

  deletePost: protectedProcedure('posts:delete')
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return deletePost(input.id)
    })
})
```

```tsx [React Native]
import { Can, useRBAC } from '@fire-shield/react-native'
import { View, Button, Text } from 'react-native'

function PostScreen() {
  const { can } = useRBAC()

  return (
    <View>
      <Can permission="posts:write">
        <Button title="Create Post" onPress={createPost} />
      </Can>

      {can('posts:delete') && (
        <Button title="Delete Post" onPress={deletePost} />
      )}
    </View>
  )
}
```

```tsx [Expo]
import { Can, useRBAC } from '@fire-shield/expo'
import { View, Button } from 'react-native'

export default function App() {
  const { can, hasRole } = useRBAC()

  return (
    <View>
      <Can permission="posts:write">
        <Button title="Create Post" onPress={createPost} />
      </Can>

      {hasRole('admin') && (
        <Button title="Admin Panel" onPress={openAdmin} />
      )}
    </View>
  )
}
```

```bash [CLI]
# Validate RBAC configuration
fire-shield validate rbac.config.json

# Check if user has permission
fire-shield check user-123 posts:write --config rbac.config.json

# Get system info
fire-shield info
```

```typescript [MCP]
// AI agents can use RBAC via Model Context Protocol
import { createMCPServer } from '@fire-shield/mcp'

// Start MCP server
const server = createMCPServer(rbac)

// AI can now:
// - Check permissions: check_permission(user_id, permission)
// - List roles: list_roles()
// - Deny permissions: deny_permission(user_id, permission)
// - Get denied permissions: get_denied_permissions(user_id)

server.start()
```

:::

## What's New in v3.0.0

### 🧪 Plugin System
- **Extensible Architecture** - Create custom plugins to extend RBAC functionality
- **Built-in Hooks** - React to permission checks, role additions, permission registration
- **Plugin Examples** - Database loader, audit logger plugins, custom validators
- **Async Plugin Lifecycle** - Safe plugin management without breaking core operations

### 🚫 Breaking Changes from v2.x
- **`RBAC.fromFile()`** - **REMOVED** (Use loader packages instead)
- **`RBAC.fromFileSync()`** - **REMOVED** (Use loader packages instead)
- **`RBAC.validateConfig()`** - Still works, API unchanged

### 📦 Migration from v2.x to v3.0.0

**Node.js:**
```typescript
// Before (v2.x)
import { RBAC } from '@fire-shield/core';
const rbac = await RBAC.fromFile('./rbac.config.json');

// After (v3.0.0) - Not yet created loader packages
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);
```

**Browser/SSR:**
```typescript
// Both versions work to same
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);
```

**[Full Migration Guide](/guide/migration-v3)** - See detailed migration instructions

## Why Fire Shield?

<div class="comparison-section">
  <h3>Compared to other RBAC libraries</h3>

  <div class="comparison-table">
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th class="highlight">Fire Shield</th>
          <th>Casbin</th>
          <th>CASL</th>
          <th>AccessControl</th>
          <th>acl</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>TypeScript</strong></td>
          <td class="highlight"><span class="badge success">✅ Native</span></td>
          <td><span class="badge success">✅ Full</span></td>
          <td><span class="badge success">✅ Full</span></td>
          <td><span class="badge warning">🟡 Partial</span></td>
          <td><span class="badge warning">🟡 Partial</span></td>
        </tr>
        <tr>
          <td><strong>Plugin System</strong></td>
          <td class="highlight"><span class="badge success">✅ v3.0.0</span></td>
          <td><span class="badge warning">🟡 Plugin</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Bundle Size</strong></td>
          <td class="highlight"><span class="badge info">🎯 ~25KB</span></td>
          <td>~600KB+</td>
          <td>~350KB</td>
          <td>~180KB</td>
          <td>~35KB</td>
        </tr>
        <tr>
          <td><strong>Dependencies</strong></td>
          <td class="highlight"><span class="badge success">✅ 0</span></td>
          <td>~5</td>
          <td>1</td>
          <td>0</td>
          <td>Few</td>
        </tr>
        <tr>
          <td><strong>Wildcard Permissions</strong></td>
          <td class="highlight"><span class="badge success">✅ Yes</span></td>
          <td><span class="badge success">✅ Yes (regex)</span></td>
          <td><span class="badge warning">🟡 Partial</span></td>
          <td><span class="badge success">✅ Yes</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Role Hierarchy</strong></td>
          <td class="highlight"><span class="badge success">✅ Yes</span></td>
          <td><span class="badge success">✅ Yes</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Audit Logging</strong></td>
          <td class="highlight"><span class="badge success">✅ Built-in</span></td>
          <td><span class="badge warning">🟡 Plugin</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Deny Permissions</strong></td>
          <td class="highlight"><span class="badge success">✅ Yes</span></td>
          <td><span class="badge success">✅ Yes</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Lazy Role Evaluation</strong></td>
          <td class="highlight"><span class="badge success">✅ Yes</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Permission Caching</strong></td>
          <td class="highlight"><span class="badge success">✅ Built-in</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Memory Optimization</strong></td>
          <td class="highlight"><span class="badge success">✅ Yes</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Framework Adapters</strong></td>
          <td class="highlight"><span class="badge success">✅ 16</span></td>
          <td><span class="badge warning">🟡 Limited</span></td>
          <td><span class="badge warning">🟡 Limited</span></td>
          <td><span class="badge error">❌ No</span></td>
          <td><span class="badge error">❌ No</span></td>
        </tr>
        <tr>
          <td><strong>Maintained</strong></td>
          <td class="highlight"><span class="badge success">✅ Active</span></td>
          <td><span class="badge success">✅ Active</span></td>
          <td><span class="badge success">✅ Active</span></td>
          <td><span class="badge warning">🟡 Low Activity</span></td>
          <td><span class="badge warning">🟡 Old/Little Maintenance</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style>
.comparison-section {
  margin: 2rem 0;
}

.comparison-section h3 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.comparison-table {
  overflow-x: auto;
  margin: 0 auto;
  max-width: 900px;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comparison-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.comparison-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.95rem;
}

.comparison-table th.highlight {
  background: rgba(255, 255, 255, 0.15);
  font-size: 1.05rem;
}

.comparison-table td {
  padding: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.comparison-table td.highlight {
  background: rgba(102, 126, 234, 0.05);
  font-weight: 500;
}

.comparison-table tbody tr:hover {
  background: var(--vp-c-bg);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.badge.info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

@media (max-width: 768px) {
  .comparison-table {
    font-size: 0.85rem;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 0.75rem 0.5rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }
}
</style>

## Support → Project

If you find Fire Shield helpful, consider supporting its development:

<div style="margin-top: 1rem; margin-bottom: 2rem; text-align: center;">
  <BuyMeACoffee />
  <p style="margin-top: 1rem; color: var(--vp-c-text-2); font-size: 0.9rem;">Your support helps maintain and improve Fire Shield! 🙏</p>
</div>

<div style="margin-top: 2rem; padding: 2rem; background: var(--vp-c-bg-soft); border-radius: 8px; text-align: center;">
  <p style="font-size: 1.2rem; margin-bottom: 1rem;">Ready to secure your application?</p>
  <a href="/guide/getting-started" style="display: inline-block; padding: 0.75rem 2rem; background: var(--vp-c-brand); color: white; border-radius: 4px; text-decoration: none; font-weight: 600;">Get Started →</a>
</div>
