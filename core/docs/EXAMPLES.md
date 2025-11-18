# Examples

Real-world use cases and patterns for using RBAC in production applications.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Blog Application](#blog-application)
- [E-commerce Platform](#e-commerce-platform)
- [Multi-Tenant SaaS](#multi-tenant-saas)
- [Content Management System](#content-management-system)
- [API Gateway](#api-gateway)
- [Healthcare System](#healthcare-system)

---

## Basic Usage

The simplest way to get started with RBAC.

```typescript
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC({ useBitSystem: true });

// Register permissions
rbac.registerPermission('document:read');
rbac.registerPermission('document:write');
rbac.registerPermission('document:delete');

// Create roles
rbac.createRole('viewer', ['document:read']);
rbac.createRole('editor', ['document:read', 'document:write']);
rbac.createRole('admin', ['document:read', 'document:write', 'document:delete']);

// Check permissions
const viewer = { id: 'user-001', roles: ['viewer'] };
const editor = { id: 'user-002', roles: ['editor'] };
const admin = { id: 'user-003', roles: ['admin'] };

console.log(rbac.hasPermission(viewer, 'document:read'));   // true
console.log(rbac.hasPermission(viewer, 'document:write'));  // false
console.log(rbac.hasPermission(editor, 'document:write'));  // true
console.log(rbac.hasPermission(admin, 'document:delete'));  // true
```

**See:** [`examples/01-basic-usage.ts`](../examples/01-basic-usage.ts)

---

## Blog Application

A complete blog system with multiple content types and user roles.

### Features

- Multiple content types (posts, comments, pages)
- Different user roles (guest, author, editor, admin)
- Role hierarchy
- Permission matrix

### Implementation

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC({ useBitSystem: true });

// Register permissions with manual bits
rbac.registerPermission('post:read', 1);
rbac.registerPermission('post:create', 2);
rbac.registerPermission('post:edit', 4);
rbac.registerPermission('post:delete', 8);
rbac.registerPermission('post:publish', 16);

rbac.registerPermission('comment:read', 32);
rbac.registerPermission('comment:create', 64);
rbac.registerPermission('comment:moderate', 128);

rbac.registerPermission('page:read', 256);
rbac.registerPermission('page:edit', 512);

// Create roles
rbac.createRole('guest', ['post:read', 'comment:read', 'page:read']);
rbac.createRole('registered', ['post:read', 'comment:read', 'comment:create', 'page:read']);
rbac.createRole('author', [
  'post:read', 'post:create', 'post:edit',
  'comment:read', 'comment:create',
  'page:read'
]);
rbac.createRole('editor', [
  'post:read', 'post:create', 'post:edit', 'post:delete', 'post:publish',
  'comment:read', 'comment:create', 'comment:moderate',
  'page:read', 'page:edit'
]);

// Set hierarchy
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('guest', 1);
hierarchy.setRoleLevel('registered', 2);
hierarchy.setRoleLevel('author', 5);
hierarchy.setRoleLevel('editor', 10);
```

### Use Cases

**1. Content Publishing Workflow**
```typescript
const author = { id: 'author-1', roles: ['author'] };
const editor = { id: 'editor-1', roles: ['editor'] };

// Author can create and edit posts
rbac.hasPermission(author, 'post:create'); // true
rbac.hasPermission(author, 'post:edit');   // true

// But cannot publish
rbac.hasPermission(author, 'post:publish'); // false

// Editor can publish
rbac.hasPermission(editor, 'post:publish'); // true
```

**2. Comment Moderation**
```typescript
const registered = { id: 'user-1', roles: ['registered'] };
const editor = { id: 'editor-1', roles: ['editor'] };

// Registered users can create comments
rbac.hasPermission(registered, 'comment:create'); // true

// But cannot moderate
rbac.hasPermission(registered, 'comment:moderate'); // false

// Editors can moderate
rbac.hasPermission(editor, 'comment:moderate'); // true
```

**3. Direct Permissions for Special Cases**
```typescript
// Senior author with publish permission
const seniorAuthor = {
  id: 'author-2',
  roles: ['author'],
  permissions: ['post:publish'] // Direct permission override
};

rbac.hasPermission(seniorAuthor, 'post:publish'); // true
```

**See:** [`examples/02-blog-application.ts`](../examples/02-blog-application.ts)

---

## E-commerce Platform

Multi-vendor e-commerce with complex permission requirements.

### Features

- Multiple roles (customer, vendor, customer service, operations, admin)
- Product and order management
- Inventory control
- Analytics and user management
- Role composition

### Implementation

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  // Product permissions
  .addPermission('product:view', 1)
  .addPermission('product:create', 2)
  .addPermission('product:edit', 4)
  .addPermission('product:delete', 8)
  .addPermission('product:price:edit', 16)

  // Order permissions
  .addPermission('order:view', 32)
  .addPermission('order:create', 64)
  .addPermission('order:cancel', 128)
  .addPermission('order:fulfill', 256)
  .addPermission('order:refund', 512)

  // Inventory, payment, analytics
  .addPermission('inventory:view', 1024)
  .addPermission('inventory:manage', 2048)
  .addPermission('payment:process', 4096)
  .addPermission('analytics:view', 8192)

  // Create roles with hierarchy
  .addRole('customer', ['product:view', 'order:view', 'order:create', 'order:cancel'], { level: 1 })
  .addRole('vendor', [
    'product:view', 'product:create', 'product:edit', 'product:price:edit',
    'order:view', 'order:fulfill',
    'inventory:view', 'inventory:manage',
    'analytics:view'
  ], { level: 5 })
  .addRole('customer-service', ['product:view', 'order:view', 'order:cancel', 'order:refund'], { level: 7 })
  .addRole('operations', ['product:view', 'order:view', 'order:fulfill', 'inventory:view', 'inventory:manage'], { level: 8 })
  .addRole('admin', ['*'], { level: 100 })
  .build();
```

### Use Cases

**1. Vendor Product Management**
```typescript
const vendor = { id: 'vendor-1', roles: ['vendor'] };

// Vendor can manage their products
rbac.hasPermission(vendor, 'product:create');     // true
rbac.hasPermission(vendor, 'product:edit');       // true
rbac.hasPermission(vendor, 'product:price:edit'); // true

// But cannot delete (admin only)
rbac.hasPermission(vendor, 'product:delete'); // false
```

**2. Customer Service Refunds**
```typescript
const csAgent = { id: 'cs-1', roles: ['customer-service'] };

const result = rbac.authorize(csAgent, 'order:refund');
if (result.allowed) {
  // Process refund
  processRefund(orderId);
}
```

**3. Premium Vendor with Extra Permissions**
```typescript
const premiumVendor = {
  id: 'vendor-2',
  roles: ['vendor'],
  permissions: ['product:delete'], // Extra permission
  isPremium: true
};

// Premium vendor can delete their own products
rbac.hasPermission(premiumVendor, 'product:delete'); // true
```

**4. Order Fulfillment Workflow**
```typescript
const opsManager = { id: 'ops-1', roles: ['operations'] };

// Check all required permissions
const required = ['order:view', 'order:fulfill', 'inventory:manage'];
if (rbac.hasAllPermissions(opsManager, required)) {
  // Fulfill order
  fulfillOrder(orderId);
}
```

**See:** [`examples/03-ecommerce-platform.ts`](../examples/03-ecommerce-platform.ts)

---

## Multi-Tenant SaaS

SaaS application with tenant isolation and per-tenant permissions.

### Features

- Tenant isolation
- Per-tenant roles and permissions
- Wildcard permissions
- Cross-tenant admin access

### Implementation

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC({ enableWildcards: true });

// Create tenant-specific roles using wildcards
rbac.createRole('tenant-owner', ['tenant:*']);
rbac.createRole('tenant-admin', ['tenant:users:*', 'tenant:data:*']);
rbac.createRole('tenant-user', ['tenant:data:read']);

// Platform admin can access all tenants
rbac.createRole('platform-admin', ['*']);

// Check permission with tenant context
function hasPermissionInTenant(user, permission, tenantId) {
  const tenantPermission = `tenant:${tenantId}:${permission}`;
  return rbac.hasPermission(user, tenantPermission);
}
```

### Use Cases

**1. Tenant Isolation**
```typescript
const tenant123Owner = {
  id: 'user-1',
  roles: [],
  permissions: ['tenant:123:*'] // All permissions for tenant 123
};

const tenant456Owner = {
  id: 'user-2',
  roles: [],
  permissions: ['tenant:456:*'] // All permissions for tenant 456
};

// User 1 can access tenant 123
rbac.hasPermission(tenant123Owner, 'tenant:123:users:read'); // true

// But not tenant 456
rbac.hasPermission(tenant123Owner, 'tenant:456:users:read'); // false
```

**2. Tenant-Scoped Roles**
```typescript
function assignTenantRole(userId, tenantId, role) {
  const user = getUser(userId);

  if (role === 'admin') {
    user.permissions = user.permissions || [];
    user.permissions.push(`tenant:${tenantId}:users:*`);
    user.permissions.push(`tenant:${tenantId}:data:*`);
  } else if (role === 'user') {
    user.permissions = user.permissions || [];
    user.permissions.push(`tenant:${tenantId}:data:read`);
  }
}

assignTenantRole('user-3', 'tenant-123', 'admin');
```

**3. Cross-Tenant Admin**
```typescript
const platformAdmin = {
  id: 'admin-1',
  roles: ['platform-admin']
};

// Platform admin can access any tenant
rbac.hasPermission(platformAdmin, 'tenant:123:users:read'); // true
rbac.hasPermission(platformAdmin, 'tenant:456:data:write'); // true
rbac.hasPermission(platformAdmin, 'tenant:789:delete');     // true
```

**4. Billing Restrictions**
```typescript
// Deny billing access for tenant admins
rbac.createRole('tenant-admin', ['tenant:users:*', 'tenant:data:*']);

const tenantAdmin = { id: 'admin-2', roles: ['tenant-admin'] };

// Explicitly deny billing permissions
rbac.denyPermission('admin-2', 'tenant:*:billing:*');

rbac.hasPermission(tenantAdmin, 'tenant:123:users:read');   // true
rbac.hasPermission(tenantAdmin, 'tenant:123:billing:view'); // false (denied)
```

---

## Content Management System

CMS with complex content workflows and approval processes.

### Features

- Content drafts, review, and publishing
- Multiple content types
- Approval workflow
- Version control permissions

### Implementation

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC({ enableWildcards: true });

// Content lifecycle permissions
rbac.registerPermission('content:draft:create');
rbac.registerPermission('content:draft:edit');
rbac.registerPermission('content:draft:delete');
rbac.registerPermission('content:review:submit');
rbac.registerPermission('content:review:approve');
rbac.registerPermission('content:review:reject');
rbac.registerPermission('content:publish');
rbac.registerPermission('content:unpublish');
rbac.registerPermission('content:version:view');
rbac.registerPermission('content:version:restore');

// Create roles for workflow
rbac.createRole('content-writer', [
  'content:draft:create',
  'content:draft:edit',
  'content:draft:delete',
  'content:review:submit',
  'content:version:view'
]);

rbac.createRole('content-reviewer', [
  'content:draft:edit',
  'content:review:*', // All review actions
  'content:version:view'
]);

rbac.createRole('content-publisher', [
  'content:draft:*',
  'content:review:*',
  'content:publish',
  'content:unpublish',
  'content:version:*'
]);
```

### Use Cases

**1. Content Creation Workflow**
```typescript
const writer = { id: 'writer-1', roles: ['content-writer'] };
const reviewer = { id: 'reviewer-1', roles: ['content-reviewer'] };
const publisher = { id: 'publisher-1', roles: ['content-publisher'] };

// Writer creates draft
rbac.hasPermission(writer, 'content:draft:create'); // true

// Writer submits for review
rbac.hasPermission(writer, 'content:review:submit'); // true

// Writer cannot approve
rbac.hasPermission(writer, 'content:review:approve'); // false

// Reviewer approves
rbac.hasPermission(reviewer, 'content:review:approve'); // true

// Publisher publishes
rbac.hasPermission(publisher, 'content:publish'); // true
```

**2. Emergency Unpublish**
```typescript
// Only publishers can unpublish
const result = rbac.authorize(publisher, 'content:unpublish');
if (result.allowed) {
  unpublishContent(contentId);
}
```

**3. Version Control**
```typescript
// Restore previous version
if (rbac.hasPermission(publisher, 'content:version:restore')) {
  restoreVersion(contentId, versionId);
}
```

---

## API Gateway

API gateway with rate limiting and endpoint-level permissions.

### Features

- Endpoint-level permissions
- HTTP method-based access
- Rate limiting via audit logs
- API key management

### Implementation

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core';

// Rate limiting audit logger
class RateLimitLogger {
  private attempts = new Map();

  log(event) {
    const key = event.userId;
    const now = Date.now();

    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const userAttempts = this.attempts.get(key);
    userAttempts.push(now);

    // Keep only last minute
    this.attempts.set(key, userAttempts.filter(t => now - t < 60000));

    // Block if too many attempts
    if (userAttempts.length > 100) {
      rbac.denyPermission(key, '*');
      alert(`Rate limit exceeded for ${key}`);
    }
  }
}

const rbac = new RBAC({
  enableWildcards: true,
  auditLogger: new RateLimitLogger()
});

// API endpoint permissions
rbac.registerPermission('api:users:get');
rbac.registerPermission('api:users:post');
rbac.registerPermission('api:users:put');
rbac.registerPermission('api:users:delete');

rbac.createRole('api-read', ['api:*:get']);
rbac.createRole('api-write', ['api:*:get', 'api:*:post', 'api:*:put']);
rbac.createRole('api-admin', ['api:*']);
```

### Use Cases

**1. API Endpoint Protection**
```typescript
app.get('/api/users', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const user = getUserFromApiKey(apiKey);

  if (!rbac.hasPermission(user, 'api:users:get')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Continue with request
  res.json(getUsers());
});

app.post('/api/users', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const user = getUserFromApiKey(apiKey);

  if (!rbac.hasPermission(user, 'api:users:post')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Create user
  res.json(createUser(req.body));
});
```

**2. Rate Limiting**
```typescript
// Automatic rate limiting via audit logger
// After 100 requests in 1 minute, user is blocked
app.use((req, res, next) => {
  const user = getUserFromRequest(req);

  // Permission check triggers audit log
  if (!rbac.hasPermission(user, getRequiredPermission(req))) {
    return res.status(403).json({ error: 'Forbidden or rate limited' });
  }

  next();
});
```

**3. API Key Scopes**
```typescript
const readOnlyKey = {
  id: 'key-123',
  roles: ['api-read']
};

const writeKey = {
  id: 'key-456',
  roles: ['api-write']
};

rbac.hasPermission(readOnlyKey, 'api:users:get');    // true
rbac.hasPermission(readOnlyKey, 'api:users:post');   // false
rbac.hasPermission(writeKey, 'api:users:post');      // true
```

---

## Healthcare System

HIPAA-compliant healthcare system with strict access controls.

### Features

- Patient record access
- Role-based medical staff permissions
- Audit logging for compliance
- Emergency access override

### Implementation

```typescript
import { RBAC, BufferedAuditLogger } from '@fire-shield/core';

// HIPAA audit logger
const auditLogger = new BufferedAuditLogger(
  async (events) => {
    await database.hipaaAuditLog.insertMany(events);
  },
  { maxBufferSize: 10, flushIntervalMs: 1000 } // Frequent flushing for compliance
);

const rbac = new RBAC({
  strictMode: true,
  auditLogger,
  enableWildcards: true
});

// Patient record permissions
rbac.registerPermission('patient:record:read');
rbac.registerPermission('patient:record:write');
rbac.registerPermission('patient:record:delete');
rbac.registerPermission('patient:diagnosis:read');
rbac.registerPermission('patient:diagnosis:write');
rbac.registerPermission('patient:prescription:read');
rbac.registerPermission('patient:prescription:write');
rbac.registerPermission('patient:lab:read');
rbac.registerPermission('patient:lab:write');

// Staff roles
rbac.createRole('nurse', ['patient:record:read', 'patient:lab:read']);
rbac.createRole('doctor', [
  'patient:record:read',
  'patient:record:write',
  'patient:diagnosis:*',
  'patient:prescription:*',
  'patient:lab:*'
]);
rbac.createRole('admin', ['patient:record:*', 'patient:*']);
```

### Use Cases

**1. Medical Record Access**
```typescript
const nurse = { id: 'nurse-1', roles: ['nurse'] };
const doctor = { id: 'doctor-1', roles: ['doctor'] };

// Nurse can read records
rbac.hasPermission(nurse, 'patient:record:read'); // true

// But cannot write prescriptions
rbac.hasPermission(nurse, 'patient:prescription:write'); // false

// Doctor can write prescriptions
rbac.hasPermission(doctor, 'patient:prescription:write'); // true

// All access is logged for HIPAA compliance
```

**2. Emergency Access Override**
```typescript
function grantEmergencyAccess(staffId, patientId, durationMs) {
  const staff = getStaff(staffId);

  // Grant temporary full access
  staff.permissions = staff.permissions || [];
  staff.permissions.push('patient:*');

  // Log emergency access
  auditLogger.log({
    type: 'emergency_access',
    userId: staffId,
    permission: 'patient:*',
    allowed: true,
    context: {
      patientId,
      emergency: true,
      duration: durationMs
    },
    timestamp: Date.now()
  });

  // Remove after duration
  setTimeout(() => {
    staff.permissions = staff.permissions.filter(p => p !== 'patient:*');
  }, durationMs);
}
```

**3. Audit Trail**
```typescript
// Query audit logs for patient access
async function getPatientAccessLog(patientId) {
  const logs = await database.hipaaAuditLog.find({
    'context.patientId': patientId
  }).sort({ timestamp: -1 });

  return logs.map(log => ({
    staff: log.userId,
    action: log.permission,
    timestamp: new Date(log.timestamp),
    allowed: log.allowed
  }));
}
```

---

## Summary

### Example Files

All examples are available in the [`examples/`](../examples/) directory:

- `01-basic-usage.ts` - Simple getting started example
- `02-blog-application.ts` - Complete blog system
- `03-ecommerce-platform.ts` - Multi-vendor e-commerce
- `04-state-persistence.ts` - Saving and loading RBAC state
- `05-advanced-patterns.ts` - Complex permission patterns
- `06-framework-integration.ts` - Express, React, etc.
- `07-advanced-features.ts` - Wildcards, audit, deny permissions

### Running Examples

```bash
# Install dependencies
npm install

# Run specific example
npx tsx examples/01-basic-usage.ts
npx tsx examples/02-blog-application.ts
npx tsx examples/03-ecommerce-platform.ts
```

---

See also:
- [Getting Started](./GETTING_STARTED.md) - Quick start guide
- [Core Concepts](./CORE_CONCEPTS.md) - Understanding RBAC fundamentals
- [Best Practices](./BEST_PRACTICES.md) - Recommended patterns
