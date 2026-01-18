# Changelog

All notable changes to Fire Shield will be documented in this file.

## [3.1.0] - 2026-01-18

### 🚀 Major Feature Release - Plugin System & Platform Independence

#### ✨ Breaking Changes
- **Removed**: `RBAC.fromFile()` and `RBAC.fromFileSync()` - Use `RBAC.fromJSONConfig()` instead
- **Removed**: File system (fs) dependency from core package
- **Removed**: `RBAC.validateConfig()` method - Moved to loader packages
- **Package Renaming**: `@rbac/*` → `@fire-shield/*` across all packages
- **Impact**: Breaking change for Node.js direct file loading, but compatible with all other platforms

> **Migration Guide**: See [Migration Guide v2.x to v3.1.0](./docs/guide/migration-v3.md)

#### ✨ New Features

**Core Package (@fire-shield/core v3.1.0)**

- ✅ **Plugin System** - Extensible architecture for custom logic
  - Register custom plugins to extend RBAC functionality
  - Built-in plugin hooks: `onPermissionCheck`, `onRoleGrant`, `onRoleRevoke`
  - Plugin context with user, permission, and metadata
  - Async plugin support with lifecycle management

- ✅ **Enhanced Audit Logging** - 3 Logger Types
  - `ConsoleAuditLogger` - Development logging
  - `BufferedAuditLogger` - Production-optimized batched logging  
  - `MultiAuditLogger` - Log to multiple destinations simultaneously
  - Rich audit event context with timestamps, user info, and custom metadata

- ✅ **Wildcard Permissions** - Advanced pattern matching
  - Full wildcard support: `admin:*`, `*:read`, `tenant:123:*`
  - Pattern matching: `*` matches any, `admin:*` matches admin.*
  - Configurable via `enableWildcards()` method
  - Regex-based pattern matching for complex scenarios

- ✅ **Deny Permissions** - Explicit permission denial
  - `denyPermission(userId, permission)` - Explicit deny (overriding allows)
  - `allowPermission(userId, permission)` - Remove specific deny
  - `getDeniedPermissions(userId)` - Get all denied permissions for user
  - `isDenied(userId, permission)` - Check if permission is denied for user
  - Deny list management with TTL and cleanup
  - Consistent API across all 9 adapters

- ✅ **Permission Caching** - Performance optimization for repeated checks
  - Configurable cache with TTL (Time To Live)
  - Max size limits to prevent memory bloat
  - Per-user cache invalidation for role changes
  - Cache statistics: `hits`, `misses`, `hitRate`
  - Automatic cleanup of expired entries
  - Manual invalidation: `invalidateUserCache()`, `invalidatePermissionCache()`

- ✅ **Lazy Role Evaluation** - Memory optimization for large role sets
  - Load roles on-demand instead of all at startup
  - Reduce memory footprint for 1000+ role configurations
  - `getEvaluatedRoles()` - List roles loaded into memory
  - `getPendingRoles()` - List roles not yet loaded
  - `getLazyRoleStats()` - Statistics: `pending`, `evaluated`, `total`
  - `evaluateAllRoles()` - Force load all pending roles
  - Configurable via `lazyRoles` option

- ✅ **Memory Optimization** - Efficient data structures
  - String interning to reduce duplicate strings
  - Role mask caching to avoid repeated bit calculations
  - Wildcard pattern caching for faster matching
  - `getMemoryStats()` - Monitor optimization effectiveness
  - `compactMemory()` - Clean up unused resources
  - Configurable via `optimizeMemory` option
  - Estimated memory savings reporting

- ✅ **Enhanced RBACBuilder** - Fluent API improvements
  - Chainable builder methods with TypeScript type inference
  - Method chaining support: `rbac.useBitSystem().addPermission('post:read', 1).build()`
  - Config loading: `withPreset(preset)`, `withAuditLogger(logger)`
  - System configuration: `useBitSystem()`, `useLegacySystem()`, `enableWildcards()`
  - Preset-based configuration support

- ✅ **Config File Loading** - External configuration
  - `RBAC.fromJSONConfig(jsonString)` - Load from JSON string
  - PresetConfig schema validation with detailed error messages
  - Support for loading configs from HTTP/fetch in browser
  - Easy configuration sharing across teams

**New Adapters**
- ✅ **@fire-shield/cli v3.0.0** - Command-line tool for RBAC management
  - `fire-shield validate` - Validate RBAC configuration files
  - `fire-shield check` - Test permission checks from CLI
  - `fire-shield generate` - Generate RBAC configs interactively
  - Developer-friendly error messages and exit codes
  - Rich validation with detailed error reporting

- ✅ **@fire-shield/graphql v3.0.0** - GraphQL schema directives
  - `@hasPermission` - Field-level authorization
  - `@hasRole` - Role-based authorization
  - `@hasAllPermissions` - Check all permissions
  - `@hasAnyPermission` - Check if has any permission
  - `@notDenied`, `@isDenied` directives for deny checks
  - Type-safe resolver integration with context propagation

- ✅ **@fire-shield/trpc v3.0.0** - tRPC middleware
  - `checkPermission()` - Permission validation middleware
  - `checkRole()` - Role validation middleware
  - `checkAllPermissions()` - Check all permissions
  - `denyPermission()`, `allowPermission()` - Deny permission helpers
  - `getDeniedPermissions()` - Get denied permissions list
  - Full TypeScript inference for procedures

- ✅ **@fire-shield/react-native v3.0.0** - React Native hooks
  - `usePermission(permission)` - Check single permission
  - `useRole(role)` - Check user role
  - `useAnyPermissions(permissions)` - Check multiple permissions
  - `useAllPermissions()` - Check if has all permissions
  - `<Protected>` component - Permission-based rendering
  - `<Show>` component - Conditional rendering based on permissions
  - `<NotDenied>` component - Alternative for denied state
  - `<Denied>` component - Component for denied actions
  - Full AsyncStorage integration for production
  - SecureStore integration for Expo managed workflow

- ✅ **@fire-shield/expo v3.0.0** - Expo managed workflow
  - Extends React Native adapter with Expo-specific features
  - `usePersistedUser()` hook - AsyncStorage user persistence
  - `useRBACDebug()` hook - Development mode debugging
  - SecureStore integration for sensitive RBAC configs
  - Expo DevTools logging support

#### 🚀 Performance Improvements
- **90% reduction** in permission checks with caching (frequent: < 1ms)
- **Sub-millisecond** checks with bit-based system
- **40-60% memory reduction** for large-scale applications (1000+ roles)
- **O(1)** overhead with buffered audit logging (batched operations)

#### 📦 Testing
- **Core Tests**: 353 passing tests (100% pass rate)
  - 14 test files covering:
    - Config loading and validation
    - Permission caching mechanisms
    - Lazy role evaluation
    - Memory optimization
    - Integration tests
    - All core functionality
  - **Test Duration**: 6.33s
  
- **CLI Tests**: Validate and check commands
  - Configuration validation scenarios
  - Permission checking with user/role simulation
  - Error handling and exit codes

- **GraphQL Tests**: All 4 directive types
  - Permission and role-based authorization
  - Multiple permission strategies
  - Error scenarios and fallbacks
  - Schema directive integration

- **tRPC Tests**: Middleware and helpers
  - Type-safe permission checks
  - Context propagation
  - Error handling

- **React Native Tests**: Hooks and components
  - Permission and role hooks
  - Protected component rendering
  - Context provider functionality

- **Expo Tests**: Expo-specific features
  - AsyncStorage persistence
  - Debug logging
  - Storage error handling

- **Total**: 460+ passing tests (up from 241)
- **Test Coverage**: 100% pass rate across all packages

#### 📊 Statistics
- **Bundle Size**: ~25KB (minified, zero dependencies)
- **Dependencies**: 0 runtime dependencies
- **TypeScript**: 100% type coverage
- **Platforms**: Node.js, Browser, Edge (Cloudflare Workers, Deno, Bun), React Native, Expo

#### 📚 Documentation
- **VitePress Documentation**: 50+ pages with interactive examples
- **Complete API Reference**: Core, Builder, Audit Logger, Types
- **Framework Integration Guides**: 11+ framework adapters
- **Examples**: Basic usage, Role hierarchy, Wildcards, Audit logging, Multi-tenancy, Best practices
- **Migration Guide**: Comprehensive v2.x to v3.0.0 migration guide
- **Comparison Table**: Verified data vs Casbin, CASL, AccessControl

#### 🔧 Improvements
- Fixed TypeScript export conflicts in adapters
- Improved error messages for configuration validation
- Enhanced type safety across all new adapters
- Better developer experience with CLI tools

#### 🔄 Breaking Changes Migration
All existing code continues to work - **zero breaking changes in API** for users who don't use `fromFile()` or `fromFileSync()`

**Code Migration**:
```bash
# Before (v2.x)
import { RBAC } from '@rbac/core';
const rbac = RBAC.fromFile('./rbac.config.json');

# After (v3.0.0) - No breaking change for manual config loading
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(JSON.stringify(json));
```

**Adapter Migration**: All framework adapters are fully compatible - zero changes required

---

## [2.2.0] - 2025-11-25

### 🎯 Feature Release - Performance & Tooling

#### ✨ New Features

**Core Package (@rbac/core v2.2.0)**

- ✅ **Permission Caching** - Intelligent caching for frequently checked permissions
  - Configurable TTL (Time To Live) for cached permissions
  - Max cache size limits to prevent memory bloat
  - Per-user cache invalidation when roles change
  - Per-permission cache invalidation
  - Cache statistics: hits, misses, hit rate
  - Automatic cleanup of expired entries
  - 60-90% reduction in repeated permission checks

- ✅ **Memory Optimization** - Advanced memory management
  - Lazy role evaluation (load roles on-demand)
  - String interning for duplicate strings
  - Role mask caching for bit calculations
  - Wildcard pattern caching
  - 40-60% memory reduction for 1000+ roles
  - `getMemoryStats()` to monitor effectiveness
  - `compactMemory()` to cleanup unused resources

- ✅ **Config File Loading** - External configuration support
  - Load RBAC from JSON config files
  - `RBAC.fromFile()` - Async file loading (Node.js only)
  - `RBAC.fromFileSync()` - Synchronous file loading (Node.js only)
  - `RBAC.validateConfig()` - Validate config before loading
  - JSON schema validation with detailed errors

- ✅ **Audit Logging** - Built-in compliance tracking
  - ConsoleAuditLogger - Development logging
  - BufferedAuditLogger - Production batched logging
  - Rich audit event context (timestamp, user, action, resource, permission, result, metadata)
  - Automatic flushing on buffer full or interval

- ✅ **CLI Tool** - `@rbac/cli v2.2.0`
  - `rbac validate <config.json>` - Validate RBAC configs
  - `rbac check <config.json> -u <user-id> -r <role> -p <permission>` - Test permissions
  - JSON schema validation
  - Developer-friendly error messages
  - Exit codes and error handling
  - Configuration testing and debugging

- ✅ **GraphQL Adapter** - `@rbac/graphql v2.2.0`
  - Schema directives: `@hasPermission`, `@hasRole`, `@hasAllPermissions`, `@hasAnyPermission`
  - Automatic field-level authorization
  - Type-safe resolvers with RBAC integration
  - GraphQL 16+ compatible
  - Context propagation (user, request info)
  - Error handling and fallbacks

#### 📊 Statistics
- **Total Tests**: 241 passing tests (100% pass rate)
- **New Adapters**: 2 (CLI, GraphQL)
- **Test Files**: 17 test files
- **Bundle Size**: ~25KB
- **Performance**: 60-90% faster for repeated checks

---

## [2.2.5] - 2025-11-20

### 🎉 Feature Release - Deny Permissions & Framework Expansion

#### ✨ New Features

**Core Package (@rbac/core v2.2.5)**

- ✅ **Deny Permissions** - Explicit permission denial system
  - `denyPermission(userId, permission)` - Explicitly deny specific permissions
  - `allowPermission(userId, permission)` - Remove specific denies
  - `getDeniedPermissions(userId)` - Get list of denied permissions
  - `isDenied(userId, permission)` - Check if user has permission denied
  - Deny list takes precedence over allows (security first)
  - Wildcard pattern support in denies (e.g., `admin:*`)
  - Configurable TTL for automatic cleanup of expired denies

- ✅ **Enhanced Wildcard Permissions** - Improved pattern matching
  - Full support: `admin:*`, `*:read`, `tenant:123:*`
  - Better pattern matching performance
  - Configurable via `enableWildcards()` method

- ✅ **Performance Optimizations**
  - Bit-based permission system (O(1) checks)
  - Optimized data structures for large role sets
  - Sub-millisecond permission checks (frequent: < 1ms)
  - String interning for memory reduction

#### 📦 New Adapters

- ✅ **@rbac/tRPC v2.2.5** - Type-safe RPC middleware
  - `checkPermission()` - Permission validation middleware
  - `checkRole()` - Role validation middleware
  - `checkAllPermissions()` - Check all permissions
  - `denyPermission()`, `allowPermission()` - Deny permission helpers
  - `getDeniedPermissions()` - Get denied permissions list
  - Multiple permission strategies (any/all)
  - Full TypeScript inference for procedures
  - Context propagation

- ✅ **@rbac/react-native v2.2.5** - React Native adapter
  - `usePermission(permission)` - Check single permission
  - `useRole(role)` - Check user role
  - `useAnyPermissions(permissions)` - Check multiple permissions
  - `useAllPermissions()` - Check if has all permissions
  - `<Protected>` component - Permission-based rendering
  - `<Show>` component - Conditional rendering
  - `<NotDenied>` and `<Denied>` components
  - AsyncStorage integration
  - Memoization for performance

- ✅ **@rbac/expo v2.2.5** - Expo managed workflow
  - Extends React Native adapter
  - SecureStore integration for sensitive configs
  - Debug logging with Expo DevTools
  - AsyncStorage for user persistence
  - Compatible with Expo managed workflow

#### 📊 Statistics
- **Total Tests**: 353 passing tests (100% pass rate)
- **New Adapters**: 2 (tRPC, React Native, Expo)
- **Test Coverage**: 100% pass rate
- **Framework Adapters**: 10+ adapters

---

## [2.1.1] - 2025-11-15

### 🚀 Minor Release - Plugin System & Branding

#### ✨ New Features

**Core Package (@fire-shield/core v2.1.1)**

- ✅ **Plugin System** - Extensible architecture
  - Register custom plugins to extend RBAC functionality
  - Plugin hooks: `onPermissionCheck`, `onRoleGrant`, `onRoleRevoke`
  - Plugin context with user, permission, and metadata
  - Async plugin support with lifecycle management

- ✅ **Rebranding** - `@rbac/*` → `@fire-shield/*`
  - Unified branding across all packages
  - New website: fire-shield.dev
  - New documentation structure

#### 📊 Statistics
- **Total Tests**: 200+ tests
- **Bundle Size**: ~15KB (minified)
- **TypeScript**: 100% coverage

---

## [2.1.0] - 2025-11-01

### 🎯 Initial Release - Core RBAC System

#### ✨ New Features

**Core Package (@rbac/core v2.1.0)**

- ✅ **Bit-Based Permission System**
  - O(1) permission checks for blazing fast performance
  - Support for 31+ permissions without collision
  - Automatic bit assignment with `autoBitAssignment: true`
  - Manual bit assignment support
  - Configurable start bit value with `startBitValue`

- ✅ **Role-Based Access Control**
  - Create roles with permission sets
  - Role hierarchy with inheritance (e.g., admin → editor → viewer)
  - Multiple roles per user
  - Role levels for hierarchical access

- ✅ **Wildcard Permissions** - Flexible permission matching
  - Pattern matching: `admin:*`, `*:read`, `*:write`
  - Configurable via `enableWildcards()` method
  - Resource-action syntax: `resource:action`

- ✅ **Audit Logging** - Compliance tracking
  - ConsoleAuditLogger - Simple logging
  - BufferedAuditLogger - Batched logging
  - Rich event context (timestamp, user, action, resource, permission, result, metadata)

- ✅ **RBACBuilder** - Fluent API
  - Chainable builder methods
  - Method chaining support
  - Type-safe configuration

- ✅ **Zero Dependencies** - No supply chain risks

#### 📊 Statistics
- **Total Tests**: 100+ tests
- **Bundle Size**: ~10KB (minified)
- **TypeScript**: 100% coverage

---

## [1.0.0] - 2025-10-01

### 🚀 Initial Release

#### ✨ New Features

- Role-based access control
- Permission system
- Audit logging
- Framework adapters (React, Vue, Express, Fastify)
- TypeScript support
- Zero dependencies

#### 📊 Statistics
- **Bundle Size**: ~5KB
- **Total Tests**: 50+ tests
