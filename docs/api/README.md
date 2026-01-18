# API Reference

Complete API documentation for Fire Shield RBAC.

## Overview

This folder contains comprehensive API documentation for all Fire Shield packages and features:

- [`core.md`](./core.md) - Core RBAC class and all methods
- [`rbac-aggregator.md`](./rbac-aggregator.md) - Multi-instance RBAC management
- [`types.md`](./types.md) - TypeScript interfaces and types

## Current Version

**Version**: 3.0.0

All features documented here are **fully implemented** and available in the current release.

## Documentation Structure

### Core API

The [Core API](./core.md) documentation covers:

- **RBAC Class** - Main class for managing roles, permissions, and access control
- **Static Methods** - `fromJSONConfig()`, `validateConfig()`
- **Instance Methods** - Role management, permission checking, user operations
- **Deny Permissions** - Explicit permission denial for users
- **Cache Management** - Permission caching with TTL and size limits
- **Lazy Role Evaluation** - On-demand role loading
- **Memory Optimization** - String interning and memory reduction
- **Audit Logging** - Buffered and custom audit loggers
- **RBAC Builder** - Fluent API for building RBAC configurations
- **Utilities** - `matchPermission()`, `parsePermission()`, error handling
- **Performance** - Best practices and optimization strategies

### RBAC Aggregator

The [RBAC Aggregator](./rbac-aggregator.md) documentation covers:

- **Multi-Domain Management** - Handle multiple RBAC instances
- **Lazy Loading** - Create instances only when needed
- **Unified API** - Single interface for permission checks across domains
- **Caching** - Optional instance caching
- **Domain-Specific Operations** - Check permissions in specific domains

### Types

The [Types](./types.md) documentation covers:

- **User Types** - `RBACUser`, `RBACContext`, `RBACUserContext`
- **Permission Types** - `Permission`, `PermissionSchema`, `PermissionConfig`
- **Role Types** - `Role`, `RoleConfig`, `RoleHierarchy`
- **Config Types** - `PresetConfig`, `RBACConfig`, `RBACOptions`
- **Audit Types** - `AuditEvent`, `AuditLogger`, `AuditEventContext`
- **Plugin Types** - `RBACPlugin`, `PluginContext`, `PluginEvent`

## Related Documentation

- [Getting Started](../guide/getting-started.md) - Setup and basic usage
- [Permissions Guide](../guide/permissions.md) - Permission system details
- [Deny Permissions Guide](../guide/deny-permissions.md) - Explicit permission denial
- [Audit Logging Guide](../guide/audit-logging.md) - Audit system usage
- [Plugin System Guide](../guide/plugins.md) - Extending RBAC with plugins
- [Migration Guide (v2 to v3)](../guide/migration-v3.md) - Upgrading from v2.x

## Examples

Working code examples are available in:
- [`packages/core/examples/`](../../packages/core/examples/) - Core package examples

## Version History

### v3.0.0 (Current)
- **Added**: Plugin system for extensibility
- **Removed**: `RBAC.fromFile()` and `RBAC.fromFileSync()` (use `fromJSONConfig()` instead)
- **Enhanced**: Platform independence (removed fs module dependency)
- **Improved**: Performance optimizations and memory management

### v2.x
- Introduced permission caching, lazy roles, memory optimization
- Added deny permissions feature
- Enhanced audit logging capabilities

---

**Need Help?**
- [Getting Started](../guide/getting-started.md)
- [GitHub Issues](https://github.com/khapu2906/fire-shield/issues)
- [GitHub Discussions](https://github.com/khapu2906/fire-shield/discussions)
