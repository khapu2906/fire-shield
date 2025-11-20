# Changelog

All notable changes to Fire Shield will be documented in this file.

## [2.1.1] - 2025-11-20

### 🎯 Current Release

#### ✨ Enhancements

**Documentation**
- ✅ VitePress Documentation - 50+ pages with interactive examples
- ✅ Complete roadmap with v2.2-v2.4 planning
- ✅ Comparison table with verified data (Casbin, CASL, AccessControl, acl)
- ✅ JSON config file loading documentation
- ✅ Buy Me a Coffee support button integration

**Testing**
- ✅ 241+ test cases - 100% pass rate, 2106+ lines
- ✅ Comprehensive coverage across all adapters

**Framework Adapters**
- ✅ Express v2.0.5 - Middleware with guards
- ✅ Fastify v2.0.5 - preHandler hooks
- ✅ Hono v2.0.5 - Edge runtime support
- ✅ Next.js v2.0.1 - App Router integration
- ✅ Nuxt v2.0.1 - Nuxt 3 module
- ✅ React v2.0.2 - Hooks & components
- ✅ Vue v2.0.8 - Composables, directives, router guards
- ✅ Angular v2.0.1 - Services, guards, directives
- ✅ Svelte v2.0.1 - Stores & actions

#### 📦 Package Details
- Bundle Size: ~15KB (verified)
- Dependencies: 0
- TypeScript: 100% type coverage

---

## [2.0.0] - 2025-11-18

### 🎉 Major Release - Fire Shield Branding

#### 🔄 Breaking Changes
- Package renamed from `@rbac/*` to `@fire-shield/*`
- Version bumped to 2.0.0 across all packages

#### ✨ New Features

**Core Package (@fire-shield/core)**
- ✅ Wildcard Permissions - Pattern matching with `*` (`admin:*`, `*:read`, `tenant:123:*`)
- ✅ Audit Logging - Built-in compliance logging with 3 logger types
  - ConsoleAuditLogger - Development logging
  - BufferedAuditLogger - Production-optimized batched logging
  - MultiAuditLogger - Log to multiple destinations
- ✅ Deny Permissions - Explicit permission denials that override allows
- ✅ Bit-based Performance - 125M ops/sec (15-260x faster than alternatives)
- ✅ Zero Dependencies - No supply chain risks
- ✅ Full TypeScript Support - 100% type-safe

**Adapters**
- @fire-shield/express - Express.js middleware
- @fire-shield/fastify - Fastify plugin
- @fire-shield/hono - Hono middleware
- @fire-shield/next - Next.js integration
- @fire-shield/nuxt - Nuxt.js integration
- @fire-shield/react-router - React Router integration
- @fire-shield/vue-router - Vue Router integration

#### 📚 Documentation
- Complete API Reference
- Core Concepts Guide
- Advanced Features Guide  
- Best Practices
- Performance Guide
- Migration Guide
- Library Comparison
- Examples Guide
- TypeScript Types Reference
- 176+ tests with 100% pass rate

#### 🚀 Performance
- 125 million operations per second
- 15KB bundle size (minified)
- O(1) permission checks with bit-based system
- <0.01ms overhead with buffered audit logging

#### 🆚 Comparison
Fire Shield vs alternatives:
- 15-260x faster than Casbin, CASL, AccessControl
- 3-8x smaller bundle size
- Only RBAC library with built-in audit logging
- Only RBAC library with deny permissions
- Zero dependencies vs 3-10+ in alternatives

### Migration from 1.x

```bash
# Update package names
npm uninstall @rbac/core
npm install @fire-shield/core

# Update imports
- import { RBAC } from '@rbac/core';
+ import { RBAC } from '@fire-shield/core';
```

All existing code continues to work - zero breaking changes in API!

See [Migration Guide](./core/docs/MIGRATION_GUIDE.md) for details.

---

## [1.0.0] - Initial Release

- Basic RBAC functionality
- Role-based permissions
- Role hierarchy
- Multiple framework adapters
- TypeScript support
