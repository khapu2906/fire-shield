# 🗺️ Roadmap

Fire Shield development roadmap and upcoming features.

<div class="roadmap-intro">
  <p>This roadmap outlines our vision for Fire Shield. Features and timelines may change based on community feedback and priorities.</p>
  <p><strong>Want to contribute?</strong> Check out our <a href="https://github.com/khapu2906/fire-shield/issues">GitHub Issues</a> or join the discussion!</p>
</div>

## ✅ Recently Completed

<div class="roadmap-section completed">

### v3.0.0 - Plugin System & Platform Independence (January 2026)

**Core Features** - ✅ 100% Complete
- ✅ **Plugin System** - Extensible architecture for custom logic (NEW!)
  - `RBACPlugin` interface with 3 hooks
  - `PluginManager` class for plugin lifecycle management
  - `onPermissionCheck()` - Triggered on every permission check
  - `onRoleAdded()` - Triggered when role is created
  - `onPermissionRegistered()` - Triggered when permission is registered
  - `registerPlugin()` / `unregisterPlugin()` methods
  - `getPlugin()` / `getAllPlugins()` methods
- ✅ **Platform Independence** - Removed fs module dependency (BREAKING CHANGE!)
  - ✅ **Config Loading** - `RBAC.fromJSONConfig()` - Platform-independent (Node.js, Browser, Edge)
  - ✅ **Removed Methods** - `RBAC.fromFile()` and `RBAC.fromFileSync()` - Use loader packages instead

**Plugin Hooks Examples**
- ✅ **Audit Database Plugin** - Log permission checks to database
- ✅ **Analytics Plugin** - Track permission check events
- ✅ **Rate Limit Plugin** - Prevent excessive permission checks
- ✅ **Validator Plugin** - Custom permission validation logic

**Documentation Updates**
- ✅ **Updated README.md** - v3.0.0 features, breaking changes, migration guide
- ✅ **Updated docs/index.md** - Homepage with plugin system info
- ✅ **Plugin Examples** - Database loader, analytics, rate limiting examples
- ✅ **Migration Guide** - From v2.x to v3.0.0 (fromFile removal, plugin system)

**Breaking Changes**
- ⚠️ `RBAC.fromFile()` - REMOVED (Use `@fire-shield/node-loader` package)
- ⚠️ `RBAC.fromFileSync()` - REMOVED (Use `@fire-shield/node-loader` package)
- ✅ `RBAC.fromJSONConfig()` - Still works, unchanged (cross-platform)
- ✅ `RBAC.validateConfig()` - Still works, unchanged

**Migration Path**
```typescript
// Before (v2.x)
import { RBAC } from '@fire-shield/core';
const rbac = await RBAC.fromFile('./rbac.config.json');

// After (v3.0.0) - Browser/Edge (works same)
import { RBAC } from '@fire-shield/core';
const json = require('./rbac.config.json');
const rbac = RBAC.fromJSONConfig(json);

// After (v3.0.0) - Node.js (loader package - coming soon)
import { NodeLoader } from '@fire-shield/node-loader';
const rbac = await NodeLoader.load('./rbac.config.json');
```

**Statistics**
- 310+ passing tests (up from 460, after removing fromFile tests)
- Plugin system with 3 hooks
- 0 runtime dependencies (unchanged)
- ~25KB bundle size (unchanged)
- Platform-independent core (tree-shakeable for browser)

</div>

## 🚧 In Progress

<div class="roadmap-section in-progress">

### v3.1 - Loader Packages & Plugin Ecosystem (Q1 2026)

**Loader Packages**
- 🚧 **Node Loader** - File system access for Node.js backends
  - `NodeLoader.load()` - Async file loading
  - `NodeLoader.loadSync()` - Synchronous file loading
  - `NodeLoader.loadFromDirectory()` - Load multiple config files
  - Validation and error handling

- 🚧 **Web Loader** - Browser-compatible config loading
  - `WebLoader.fromFetch()` - Load from HTTP/HTTPS endpoints
  - `WebLoader.fromLocalStorage()` - Load from browser storage
  - `WebLoader.fromURL()` - Load from CDN URLs
  - CORS and security handling

**Plugin Examples**
- 🚧 **Database Loader Plugin** - Load config from database
  - PostgreSQL, MySQL, MongoDB support
  - Prisma, Drizzle ORM integration
  - Connection pooling and caching

- 🚧 **Redis Cache Plugin** - Distributed permission caching
  - Redis-based permission cache
  - Cache invalidation and expiration
  - Cluster support

- 🚧 **Elasticsearch Audit Plugin** - Log events to Elasticsearch
  - Structured audit logs
  - Search and analytics support
  - Index management

**Documentation**
- 🚧 **Plugin System Guide** - How to create custom plugins
  - Plugin lifecycle and best practices
  - Hook reference and examples
  - Testing plugins

- 🚧 **Loader Package Guide** - How to use loader packages
  - Installation and configuration
  - Migration examples
  - Troubleshooting

</div>

## 📋 Planned

<div class="roadmap-section planned">

### v3.2 - Advanced Plugin Features (Q2 2026)

**Plugin Enhancements**
- 📋 **Plugin Dependencies** - Plugins can depend on other plugins
- 📋 **Plugin Middleware** - Transform plugin hooks before/after execution
- 📋 **Plugin Events** - Pub/sub event system for plugins
- 📋 **Plugin Configuration** - Configurable plugin options

**Built-in Plugins**
- 📋 **Analytics Plugin** - Built-in analytics and metrics
- 📋 **Cache Plugin** - Redis/memcached integration
- 📋 **Audit Plugin** - Elasticsearch/Logstash integration
- 📋 **Webhook Plugin** - Send events to webhooks
- 📋 **Notification Plugin** - Send alerts on permission changes

### v3.3 - Enterprise Features (Q3 2026)

**Enterprise Plugins**
- 📋 **LDAP Plugin** - Integrate with LDAP/Active Directory
- 📋 **OAuth2 Plugin** - OAuth2 token validation
- 📋 **SAML Plugin** - SAML SSO integration
- 📋 **SCIM Plugin** - User provisioning and sync

**Security Plugins**
- 📋 **IP Whitelist Plugin** - IP-based access control
- 📋 **Geo-Fencing Plugin** - Geographic access restrictions
- 📋 **Time-Based Plugin** - Temporal access control
- 📋 **MFA Plugin** - Multi-factor authentication integration

**Admin Plugins**
- 📋 **Admin Dashboard Plugin** - Web-based RBAC admin panel
- 📋 **Visualization Plugin** - Graphical role/permission viewer
- 📋 **Reporting Plugin** - Compliance reports and analytics
- 📋 **Audit Log Plugin** - Advanced audit log querying

### v3.4 - Ecosystem Expansion (Q4 2026)

**Framework Adapters**
- 📋 NestJS adapter - Native NestJS integration
- 📋 Remix adapter - Remix framework support
- 📋 Astro adapter - Astro framework support
- 📋 SolidJS adapter - SolidJS framework support
- 📋 Qwik adapter - Qwik framework support

**Developer Tools**
- 📋 **VS Code Extension** - RBAC language support and tools
- 📋 **CLI Enhancements** - Better CLI commands and interactive mode
- 📋 **Admin UI** - Web-based admin panel
- 📋 **Migration Tool** - Automated migration from other RBAC libraries

</div>

## 💡 Future Ideas

<div class="roadmap-section future">

### Long-term Vision (2027+)

**Advanced Permission Models**
- 💡 **Conditional Permissions** - If-then rules for dynamic evaluation
- 💡 **Permission Templates** - Reusable permission schemas
- 💡 **Permission Marketplace** - Share common permission schemas
- 💡 **Policy Engine** - Complex policy evaluation (OPA, XACML)
- 💡 **Attribute-Based Access Control (ABAC)** - Full ABAC support

**Enterprise Features**
- 💡 **Multi-Tenancy** - Advanced multi-tenant RBAC
- 💡 **Distributed RBAC** - Cross-microservice RBAC sync
- 💡 **RBAC-as-a-Service** - Cloud-hosted RBAC solution
- 💡 **SSO Integration** - SAML, OIDC, CAS integration
- 💡 **Compliance Framework** - SOC2, HIPAA, GDPR compliance

**Developer Experience**
- 💡 **Visual Builder** - Drag-and-drop RBAC builder
- 💡 **Auto-Discovery** - Auto-discover roles/permissions from codebase
- 💡 **Testing Tools** - RBAC testing and validation tools
- 💡 **IDE Extensions** - VS Code, WebStorm, IntelliJ plugins
- 💡 **DevOps Integration** - Kubernetes, Docker, CI/CD integrations

**Infrastructure**
- 💡 **Edge Deployment** - Cloudflare Workers, Vercel Edge, Deno Deploy
- 💡 **Serverless Functions** - AWS Lambda, Azure Functions, GCP Functions
- 💡 **Microservices Support** - Service mesh integration, gRPC support
- 💡 **Database Integrations** - Native database drivers, ORM plugins
- 💡 **Caching Layer** - Redis, Memcached, Varnish integration

</div>

## 🎯 Community Priorities

Based on GitHub issues and community feedback, these features are most requested:

<div class="priority-list">

### High Priority
1. **Plugin System** - Extensible architecture for custom logic ✅ (v3.0.0)
2. **Node Loader Package** - File system access for Node.js (v3.1.0)
3. **Web Loader Package** - Browser-compatible config loading (v3.1.0)
4. **Plugin Examples** - Database, analytics, rate limiting plugins (v3.1.0)
5. **Migration Guide v2.x → v3.0.0** - Upgrade documentation (v3.0.0)

### Medium Priority
1. **Redis Cache Plugin** - Distributed permission caching (v3.2.0)
2. **Database Loader Plugin** - Load config from database (v3.1.0)
3. **Admin Dashboard** - Web-based RBAC admin panel (v3.3.0)
4. **NestJS Adapter** - Native NestJS integration (v3.4.0)
5. **VS Code Extension** - IDE support and tools (v3.4.0)

### Under Consideration
1. **Conditional Permissions** - If-then rules for dynamic evaluation
2. **Permission Marketplace** - Share common permission schemas
3. **Federated RBAC** - Cross-organization permissions
4. **ABAC Support** - Attribute-Based Access Control

</div>

## 📊 Release Cycle

<div class="release-info">

**Major Versions** (x.0.0)
- Released yearly
- May include breaking changes
- Extensive migration guides provided

**Minor Versions** (3.x.0)
- Released quarterly
- New features, backward compatible
- Performance improvements

**Patch Versions** (3.0.x)
- Released as needed
- Bug fixes and security updates
- No breaking changes

</div>

## 🤝 How to Contribute

We welcome contributions to help achieve this roadmap!

### Ways to Contribute

**Code Contributions**
- Pick an issue from our [GitHub Issues](https://github.com/khapu2906/fire-shield/issues)
- Submit pull requests for roadmap features
- Write tests and improve coverage

**Documentation**
- Improve existing documentation
- Write tutorials and guides
- Translate documentation to other languages

**Community**
- Answer questions in discussions
- Share your Fire Shield use cases
- Write blog posts about Fire Shield

**Feedback**
- Report bugs and issues
- Suggest new features
- Vote on existing feature requests

### Feature Requests

Have an idea not on this roadmap? We'd love to hear it!

1. Check [existing issues](https://github.com/khapu2906/fire-shield/issues)
2. Create a new feature request
3. Describe your use case
4. Explain why it would benefit to community

## 📢 Stay Updated

- **GitHub**: Star and watch [khapu2906/fire-shield](https://github.com/khapu2906/fire-shield)
- **NPM**: Follow [@fire-shield/core](https://www.npmjs.com/package/@fire-shield/core)
- **Changelog**: Check [releases](https://github.com/khapu2906/fire-shield/releases)

## ☕ Support → Project

If you find Fire Shield helpful and want to support its development:

<div style="margin: 2rem 0; text-align: center;">
  <BuyMeACoffee />
  <p style="margin-top: 1rem; color: var(--vp-c-text-2);">Your support helps maintain and improve Fire Shield! 🙏</p>
</div>

---

<div class="roadmap-footer">
  <p><em>Last updated: January 2026</em></p>
  <p>This roadmap is subject to change based on community needs and feedback.</p>
</div>

## 💡 Future Ideas

<div class="roadmap-section future">

### Long-term Vision (2027+)

**Advanced Permission Models**
- 💡 Delegation chains (A delegates to B delegates to C)
- 💡 Conditional permissions (if-then rules)
- 💡 Permission templates and inheritance
- 💡 Geographic-based permissions
- 💡 Device-based access control

**Enterprise Features**
- 💡 Distributed RBAC across microservices
- 💡 Real-time permission sync
- 💡 RBAC-as-a-Service cloud offering
- 💡 Multi-region permission replication
- 💡 Advanced audit log querying and analytics

**Developer Tools**
- 💡 Web-based RBAC admin dashboard
- 💡 Browser DevTools extension
- 💡 Terraform/Pulumi providers
- 💡 OpenAPI/Swagger integration
- 💡 GraphQL schema generator

**Standards & Compliance**
- 💡 OAuth2/OIDC integration
- 💡 SAML support
- 💡 XACML compatibility
- 💡 ISO 27001 compliance toolkit

</div>

## 🎯 Community Priorities

Based on GitHub issues and community feedback, these features are most requested:

<div class="priority-list">

### High Priority
1. **Permission Caching** - Reduce redundant permission calculations
2. **GraphQL Adapter** - First-class GraphQL support
3. **Interactive Playground** - Try Fire Shield directly in browser
4. **Migration Guides** - Easy migration from Casbin, CASL, etc.

### Medium Priority
1. **Temporal Permissions** - Time-based access control
2. **Audit Log Analytics** - Built-in reporting and dashboards
3. **NestJS Decorators** - Native NestJS integration
4. **Permission Visualization** - Graphical role/permission viewer

### Under Consideration
1. **Dynamic Permissions** - Runtime permission definition
2. **Permission Marketplace** - Share common permission schemas
3. **Federated RBAC** - Cross-organization permissions
4. **Blockchain Audit Trail** - Immutable audit logs

</div>

## 📊 Release Cycle

<div class="release-info">

**Major Versions** (x.0.0)
- Released yearly
- May include breaking changes
- Extensive migration guides provided

**Minor Versions** (2.x.0)
- Released quarterly
- New features, backward compatible
- Performance improvements

**Patch Versions** (2.1.x)
- Released as needed
- Bug fixes and security updates
- No breaking changes

</div>

## 🤝 How to Contribute

We welcome contributions to help achieve this roadmap!

### Ways to Contribute

**Code Contributions**
- Pick an issue from our [GitHub Issues](https://github.com/khapu2906/fire-shield/issues)
- Submit pull requests for roadmap features
- Write tests and improve coverage

**Documentation**
- Improve existing documentation
- Write tutorials and guides
- Translate documentation to other languages

**Community**
- Answer questions in discussions
- Share your Fire Shield use cases
- Write blog posts about Fire Shield

**Feedback**
- Report bugs and issues
- Suggest new features
- Vote on existing feature requests

### Feature Requests

Have an idea not on this roadmap? We'd love to hear it!

1. Check [existing issues](https://github.com/khapu2906/fire-shield/issues)
2. Create a new feature request
3. Describe your use case
4. Explain why it would benefit the community

## 📢 Stay Updated

- **GitHub**: Star and watch [khapu2906/fire-shield](https://github.com/khapu2906/fire-shield)
- **NPM**: Follow [@fire-shield/core](https://www.npmjs.com/package/@fire-shield/core)
- **Changelog**: Check [releases](https://github.com/khapu2906/fire-shield/releases)

## ☕ Support the Project

If you find Fire Shield helpful and want to support its development:

<div style="margin: 2rem 0; text-align: center;">
  <BuyMeACoffee />
  <p style="margin-top: 1rem; color: var(--vp-c-text-2);">Your support helps maintain and improve Fire Shield! 🙏</p>
</div>

---

<div class="roadmap-footer">
  <p><em>Last updated: November 2025</em></p>
  <p>This roadmap is subject to change based on community needs and feedback.</p>
</div>

<style>
.roadmap-intro {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  border-left: 4px solid var(--vp-c-brand);
}

.roadmap-intro p {
  margin: 0.5rem 0;
}

.roadmap-section {
  margin: 2rem 0;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.roadmap-section.completed {
  background: rgba(16, 185, 129, 0.05);
  border-color: #10b981;
}

.roadmap-section.in-progress {
  background: rgba(59, 130, 246, 0.05);
  border-color: #3b82f6;
}

.roadmap-section.planned {
  background: rgba(245, 158, 11, 0.05);
  border-color: #f59e0b;
}

.roadmap-section.future {
  background: rgba(168, 85, 247, 0.05);
  border-color: #a855f7;
}

.roadmap-section h3 {
  margin-top: 0;
  font-size: 1.3rem;
}

.roadmap-section ul {
  margin: 1rem 0;
}

.roadmap-section li {
  margin: 0.5rem 0;
  padding-left: 0.5rem;
}

.priority-list {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.priority-list h3 {
  margin-top: 1.5rem;
  font-size: 1.1rem;
  color: var(--vp-c-brand);
}

.priority-list h3:first-child {
  margin-top: 0;
}

.priority-list ol {
  margin: 0.5rem 0;
}

.priority-list li {
  margin: 0.5rem 0;
}

.release-info {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.release-info strong {
  color: var(--vp-c-brand);
}

.release-info p {
  margin: 1rem 0;
}

.roadmap-footer {
  text-align: center;
  margin: 3rem 0 1rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.roadmap-footer p {
  margin: 0.25rem 0;
}

@media (max-width: 768px) {
  .roadmap-section,
  .priority-list,
  .release-info {
    padding: 1rem;
  }
}
</style>
