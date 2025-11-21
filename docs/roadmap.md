# 🗺️ Roadmap

Fire Shield development roadmap and upcoming features.

<div class="roadmap-intro">
  <p>This roadmap outlines our vision for Fire Shield. Features and timelines may change based on community feedback and priorities.</p>
  <p><strong>Want to contribute?</strong> Check out our <a href="https://github.com/khapu2906/fire-shield/issues">GitHub Issues</a> or join the discussion!</p>
</div>

## ✅ Recently Completed

<div class="roadmap-section completed">

### v2.1.1 - Current Release (November 2025)

**Core Features**
- ✅ **Bit-based Permission System** - about one hundred million ops/sec, O(1) permission checks
- ✅ **String-based Fallback System** - Support for >31 permissions
- ✅ **Wildcard Permissions** - Pattern matching (`admin:*`, `*:read`, `tenant:123:*`)
- ✅ **Deny Permissions** - Explicit denials that override allows
- ✅ **Audit Logging** - 3 built-in loggers (Console, Buffered, Multi)
- ✅ **Role Hierarchy** - Level-based role inheritance with 17 methods
- ✅ **State Serialization** - Complete JSON export/import
- ✅ **RBAC Builder** - Fluent API with method chaining
- ✅ **Zero Dependencies** - No runtime dependencies, 15KB bundle

**Framework Adapters (9+)**
- ✅ Express v2.0.5 - Middleware with guards
- ✅ Fastify v2.0.5 - preHandler hooks
- ✅ Hono v2.0.5 - Edge runtime support
- ✅ Next.js v2.0.1 - App Router integration
- ✅ Nuxt v2.0.1 - Nuxt 3 module
- ✅ React v2.0.2 - Hooks & components
- ✅ Vue v2.0.8 - Composables, directives, router guards
- ✅ Angular v2.0.1 - Services, guards, directives
- ✅ Svelte v2.0.1 - Stores & actions

**Testing & Documentation**
- ✅ **241+ Test Cases** - 100% pass rate, 2106+ lines
- ✅ **VitePress Documentation** - 50+ pages with interactive examples
- ✅ **12+ Example Files** - Real-world patterns and use cases
- ✅ **TypeScript 100%** - Full type safety across all packages

</div>

## 🚧 In Progress

<div class="roadmap-section in-progress">

### v2.2 - Performance & Developer Experience (Dec 2025 - Q1 2026)

**Performance Optimizations**
- 🚧 Permission caching layer
- 🚧 Lazy role evaluation
- 🚧 Memory optimization for large permission sets
- 🚧 Benchmark suite for continuous performance tracking

**Developer Experience**
- 🚧 Interactive playground on documentation site
- 🚧 CLI tool for permission management
- 🚧 Config file loading convenience methods (`RBAC.fromFile()`, validation)
- 🚧 GraphQL adapter

**Documentation**
- 🚧 Video tutorials
- 🚧 Migration guides from other RBAC libraries
- 🚧 Real-world case studies

</div>

## 📋 Planned

<div class="roadmap-section planned">

### v2.3 - Advanced Features (Q2-Q3 2026)

**Attribute-Based Access Control (ABAC)**
- 📋 Context-based permissions
- 📋 Dynamic permission evaluation
- 📋 Custom permission validators
- 📋 Time-based permissions (temporal access)

**Multi-Tenancy Enhancements**
- 📋 Tenant isolation guarantees
- 📋 Cross-tenant permission sharing
- 📋 Tenant-specific role hierarchies
- 📋 Tenant analytics and reporting

**Database Integrations**
- 📋 Prisma integration
- 📋 Drizzle ORM integration
- 📋 TypeORM integration
- 📋 MongoDB native support

**Security Features**
- 📋 Permission change notifications
- 📋 Anomaly detection in access patterns
- 📋 Rate limiting for permission checks
- 📋 Security compliance reports (SOC2, GDPR, HIPAA)

### v2.4 - Ecosystem Growth (Q4 2026)

**Framework Adapters**
- 📋 Remix adapter
- 📋 Astro adapter
- 📋 SolidJS adapter
- 📋 Qwik adapter
- 📋 NestJS decorator-based adapter
- 📋 tRPC middleware

**Tooling**
- 📋 Permission visualization tool
- 📋 Role conflict detector
- 📋 Permission dependency analyzer
- 📋 Import/export from CSV, JSON, YAML

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
