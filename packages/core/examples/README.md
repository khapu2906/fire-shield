# RBAC Examples

This directory contains comprehensive examples demonstrating various features and use cases of the RBAC library.

## Running the Examples

Each example is a standalone TypeScript file that can be executed directly:

```bash
# Install dependencies first
npm install

# Run an example with ts-node
npx ts-node examples/01-basic-usage.ts

# Or compile and run
npm run build
node dist/examples/01-basic-usage.js
```

## Examples Overview

### 01-basic-usage.ts
**Beginner-friendly introduction to RBAC**

Learn the fundamentals:
- Creating an RBAC instance
- Registering permissions
- Creating roles
- Checking user permissions
- Authorization with detailed results
- Multiple permission checks (ANY/ALL)

**Perfect for:** First-time users, understanding core concepts

```bash
npx ts-node examples/01-basic-usage.ts
```

---

### 02-blog-application.ts
**Real-world blog platform implementation**

Demonstrates:
- Multi-resource permissions (posts, comments, pages)
- User role hierarchy (guest → registered → author → editor → admin)
- Resource-based permissions
- Permission matrices
- Multi-role users
- Direct permission overrides

**Perfect for:** Content management systems, blogging platforms

```bash
npx ts-node examples/02-blog-application.ts
```

**Key Features:**
- 11 granular permissions
- 5 distinct user roles
- Hierarchical permission inheritance
- Content moderation capabilities

---

### 03-ecommerce-platform.ts
**Multi-vendor e-commerce system**

Demonstrates:
- E-commerce specific permissions (products, orders, inventory)
- Vendor vs admin permissions
- Customer service workflows
- Operations management
- Premium vendor features (direct permissions)
- Context-based authorization
- Permission matrices for role comparison

**Perfect for:** E-commerce platforms, multi-vendor marketplaces

```bash
npx ts-node examples/03-ecommerce-platform.ts
```

**Key Features:**
- 15 granular permissions across 4 resource types
- 5 specialized roles (customer, vendor, customer-service, operations, admin)
- Workflow demonstrations (shopping, fulfillment, refunds)
- Role hierarchy validation

---

### 04-state-persistence.ts
**Comprehensive state management**

Demonstrates:
- Serializing RBAC state to JSON
- Saving to multiple storage backends:
  - File system
  - Memory cache
  - localStorage (simulated)
  - Database (simulated)
- Restoring RBAC from saved state
- State integrity verification
- Incremental updates
- Version management
- Performance benchmarking

**Perfect for:** Production deployments, state management, migration

```bash
npx ts-node examples/04-state-persistence.ts
```

**Key Features:**
- Storage-agnostic persistence
- State versioning system
- High-performance serialization (< 1ms)
- Incremental state updates

---

### 05-advanced-patterns.ts
**Advanced RBAC techniques**

Demonstrates:
- High-performance permission masks
- Multi-tenant authorization
- Dynamic permission computation:
  - Ownership-based permissions
  - Time-based permissions
- Permission inheritance and composition
- Custom authorization logic:
  - IP whitelisting
  - Time-restricted access
  - Resource state validation
- Performance benchmarking (100k+ ops)

**Perfect for:** Advanced use cases, multi-tenant SaaS, complex authorization

```bash
npx ts-node examples/05-advanced-patterns.ts
```

**Key Features:**
- Multi-tenant isolation
- Dynamic permission rules
- Custom authorization engine
- Performance optimization techniques

---

### 06-framework-integration.ts
**Integration with popular frameworks**

Demonstrates:
- **Express.js**: Middleware for route protection
- **NestJS**: Guards and decorators
- **GraphQL**: Authorization directives
- **REST API**: Helper classes
- **Webhooks**: Event authorization

**Perfect for:** Integrating RBAC into existing applications

```bash
npx ts-node examples/06-framework-integration.ts
```

**Includes:**
- Express middleware patterns
- NestJS guard implementation
- GraphQL directive schemas
- API controller helpers
- Webhook authorization logic

---

## Example Categories

### By Complexity Level

**Beginner:**
- 01-basic-usage.ts

**Intermediate:**
- 02-blog-application.ts
- 03-ecommerce-platform.ts
- 06-framework-integration.ts

**Advanced:**
- 04-state-persistence.ts
- 05-advanced-patterns.ts

### By Use Case

**Content Management:**
- 02-blog-application.ts (blog, CMS)

**E-commerce:**
- 03-ecommerce-platform.ts (marketplace, vendors)

**Multi-Tenant SaaS:**
- 05-advanced-patterns.ts (tenant isolation)

**Framework Integration:**
- 06-framework-integration.ts (Express, NestJS, GraphQL)

**Production Deployment:**
- 04-state-persistence.ts (state management, migration)

### By Feature

**Permission Masks:**
- 05-advanced-patterns.ts (Pattern 1)

**Role Hierarchy:**
- 02-blog-application.ts
- 03-ecommerce-platform.ts

**Direct Permissions:**
- 02-blog-application.ts
- 03-ecommerce-platform.ts

**State Persistence:**
- 04-state-persistence.ts

**Dynamic Permissions:**
- 05-advanced-patterns.ts (Pattern 3)

**Multi-Tenant:**
- 05-advanced-patterns.ts (Pattern 2)

## Common Patterns

### Pattern: Route Protection (Express)

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();

function requirePermission(permission: string) {
  return (req, res, next) => {
    if (!req.user || !rbac.hasPermission(req.user, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.get('/api/users', requirePermission('user:read'), listUsers);
app.post('/api/users', requirePermission('user:create'), createUser);
```

### Pattern: Multi-Tenant Authorization

```typescript
class MultiTenantRBAC {
  private rbacInstances = new Map<string, RBAC>();

  getOrCreateRBAC(tenantId: string): RBAC {
    if (!this.rbacInstances.has(tenantId)) {
      this.rbacInstances.set(tenantId, new RBAC());
    }
    return this.rbacInstances.get(tenantId)!;
  }
}
```

### Pattern: Permission Masks (Performance)

```typescript
const bitManager = rbac.getBitPermissionManager();
const mask = bitManager.createPermissionMask(['read', 'write']);

const user = {
  id: 'user-1',
  roles: [],
  permissionMask: mask
};

// Ultra-fast bitwise permission checks
rbac.hasPermission(user, 'read'); // O(1)
```

### Pattern: State Persistence

```typescript
// Save
const state = rbac.toJSON();
await database.save('rbac_state', state);

// Restore
const savedState = await database.load('rbac_state');
const rbac = new RBAC();
rbac.fromJSON(savedState);
```

## Performance Notes

All examples include performance considerations:

- **Permission checks**: < 0.01ms per operation
- **State serialization**: < 1ms for typical configurations
- **Permission masks**: Constant time O(1) lookups
- **Multi-tenant**: Isolated per-tenant RBAC instances

## Testing

Each example can be used as a basis for tests:

```typescript
import { describe, it, expect } from 'vitest';

describe('RBAC Blog Example', () => {
  it('should authorize editor to publish', () => {
    // Code from 02-blog-application.ts
  });
});
```

## Next Steps

After reviewing these examples:

1. **Start Simple**: Begin with `01-basic-usage.ts`
2. **Choose Your Use Case**: Select the example closest to your needs
3. **Customize**: Modify the example for your specific requirements
4. **Integrate**: Use `06-framework-integration.ts` to integrate with your framework
5. **Deploy**: Use `04-state-persistence.ts` for production deployment

## Additional Resources

- [Main Documentation](../README.md)
- [API Reference](../README.md#api-reference)
- [Best Practices](../README.md#best-practices)

## Contributing

Have a useful example? Submit a PR! We especially welcome:
- Industry-specific examples (healthcare, finance, education)
- Additional framework integrations
- Performance optimization techniques
- Real-world case studies
