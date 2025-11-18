# Getting Started

Quick guide to get up and running with RBAC.

## Installation

```bash
npm install @fire-shield/core
# or
yarn add @fire-shield/core
# or
pnpm add @fire-shield/core
```

## Basic Usage

### 1. Simple Permission Check

```typescript
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC();

// Register permissions
rbac.registerPermission('post:read');
rbac.registerPermission('post:write');

// Create role
rbac.createRole('editor', ['post:read', 'post:write']);

// Check permissions
const user = { id: 'user-1', roles: ['editor'] };

console.log(rbac.hasPermission(user, 'post:read'));  // true
console.log(rbac.hasPermission(user, 'post:delete')); // false
```

### 2. Using Default Preset

```typescript
import { RBAC, defaultPreset } from '@fire-shield/core';

// Use preset with predefined roles
const rbac = new RBAC({ preset: defaultPreset });

const user = { id: 'user-1', roles: ['editor'] };

rbac.hasPermission(user, 'moderator:content:manage'); // true
```

### 3. With Role Hierarchy

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();

// Create roles
rbac.createRole('user', ['post:read']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('admin', ['post:read', 'post:write', 'post:delete']);

// Set hierarchy levels
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('editor', 5);
hierarchy.setRoleLevel('admin', 10);

// Check hierarchy
rbac.canActAsRole('admin', 'editor'); // true (higher can act as lower)
rbac.canActAsRole('editor', 'admin'); // false
```

## Next Steps

- [Core Concepts](./CORE_CONCEPTS.md) - Understand how RBAC works
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Advanced Features](./ADVANCED_FEATURES.md) - Wildcards, Audit Logging, Deny Permissions
- [Examples](./EXAMPLES.md) - Real-world use cases
