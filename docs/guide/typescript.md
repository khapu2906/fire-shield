# TypeScript Guide

Complete guide to using Fire Shield with TypeScript for maximum type safety.

## Why TypeScript?

TypeScript provides:
- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Better IDE autocomplete
- **Documentation**: Self-documenting code
- **Refactoring**: Safe code changes
- **Maintainability**: Easier to understand and modify

## Basic Types

### RBACUser

The core user type with roles and permissions:

```typescript
import type { RBACUser } from '@fire-shield/core';

const user: RBACUser = {
  id: 'user-123',
  roles: ['editor'],
  permissions: ['beta:feature'], // Optional
  permissionMask: 3 // Optional
};
```

### Extending RBACUser

Add custom fields to the user type:

```typescript
interface AppUser extends RBACUser {
  email: string;
  name: string;
  department: string;
  createdAt: Date;
}

const user: AppUser = {
  id: 'user-123',
  roles: ['editor'],
  email: 'user@example.com',
  name: 'John Doe',
  department: 'Engineering',
  createdAt: new Date()
};

// Still works with RBAC
rbac.hasPermission(user, 'post:write');
```

## Type-Safe Permissions

### Using Const Assertions

```typescript
const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',

  // Post permissions
  POST_READ: 'post:read',
  POST_WRITE: 'post:write',
  POST_DELETE: 'post:delete',

  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
} as const;

// Type-safe permission type
type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Type-safe permission check
function checkPermission(user: RBACUser, permission: Permission): boolean {
  return rbac.hasPermission(user, permission);
}

// ✅ Valid
checkPermission(user, PERMISSIONS.USER_READ);

// ❌ TypeScript error
checkPermission(user, 'invalid:permission');
```

### Using String Literal Types

```typescript
type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'post:read'
  | 'post:write'
  | 'post:delete';

function hasPermission(user: RBACUser, permission: Permission): boolean {
  return rbac.hasPermission(user, permission);
}

// ✅ Type-safe
hasPermission(user, 'user:read');

// ❌ TypeScript error
hasPermission(user, 'invalid:permission');
```

## Type-Safe Roles

### String Literal Types

```typescript
type Role = 'admin' | 'editor' | 'viewer';

function hasRole(user: RBACUser, role: Role): boolean {
  return user.roles.includes(role);
}

// ✅ Type-safe
hasRole(user, 'admin');

// ❌ TypeScript error
hasRole(user, 'invalid-role');
```

### Role Configuration

```typescript
interface RoleConfig {
  name: Role;
  permissions: Permission[];
  level: number;
  description: string;
}

const roles: RoleConfig[] = [
  {
    name: 'admin',
    permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
    level: 10,
    description: 'Administrator'
  },
  {
    name: 'editor',
    permissions: ['post:read', 'post:write'],
    level: 5,
    description: 'Content Editor'
  },
  {
    name: 'viewer',
    permissions: ['post:read'],
    level: 1,
    description: 'Viewer'
  }
];
```

## Generic Functions

### Type-Safe Permission Checker

```typescript
function createPermissionChecker<T extends string>(
  rbac: RBAC,
  user: RBACUser
) {
  return {
    can: (permission: T): boolean => {
      return rbac.hasPermission(user, permission);
    },
    canAll: (permissions: T[]): boolean => {
      return rbac.hasAllPermissions(user, permissions);
    },
    canAny: (permissions: T[]): boolean => {
      return rbac.hasAnyPermission(user, permissions);
    }
  };
}

// Usage
const checker = createPermissionChecker<Permission>(rbac, user);

checker.can('user:read'); // Type-safe ✅
checker.can('invalid'); // Type error ❌
```

### Type-Safe User Factory

```typescript
function createUser<T extends RBACUser>(
  id: string,
  roles: Role[],
  additional?: Omit<T, 'id' | 'roles'>
): T {
  return {
    id,
    roles,
    ...additional
  } as T;
}

// Usage
interface CustomUser extends RBACUser {
  email: string;
  name: string;
}

const user = createUser<CustomUser>('user-1', ['editor'], {
  email: 'user@example.com',
  name: 'John Doe'
});
```

## Discriminated Unions

### Authorization Results

```typescript
type AuthorizationSuccess = {
  allowed: true;
  user: RBACUser;
};

type AuthorizationFailure = {
  allowed: false;
  reason: string;
};

type AuthResult = AuthorizationSuccess | AuthorizationFailure;

function authorize(user: RBACUser, permission: Permission): AuthResult {
  const result = rbac.authorize(user, permission);

  if (result.allowed) {
    return {
      allowed: true,
      user: result.user!
    };
  } else {
    return {
      allowed: false,
      reason: result.reason || 'Permission denied'
    };
  }
}

// Type-safe usage
const result = authorize(user, 'user:read');

if (result.allowed) {
  console.log(result.user); // Type: RBACUser
} else {
  console.log(result.reason); // Type: string
}
```

## Type Guards

### Custom Type Guards

```typescript
function isRBACUser(value: unknown): value is RBACUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as any).id === 'string' &&
    'roles' in value &&
    Array.isArray((value as any).roles)
  );
}

// Usage
function checkUser(maybeUser: unknown) {
  if (isRBACUser(maybeUser)) {
    // TypeScript knows this is an RBACUser
    rbac.hasPermission(maybeUser, 'post:read');
  }
}
```

### Advanced Type Guards

```typescript
function hasPermissions<T extends string[]>(
  user: RBACUser,
  permissions: T
): user is RBACUser & { permissions: T } {
  return permissions.every(p => rbac.hasPermission(user, p));
}

// Usage
if (hasPermissions(user, ['post:read', 'post:write'] as const)) {
  // TypeScript knows user has these permissions
}
```

## Utility Types

### WithMetadata

```typescript
type WithMetadata<T> = T & {
  metadata?: Record<string, any>;
};

type UserWithMetadata = WithMetadata<RBACUser>;

const user: UserWithMetadata = {
  id: 'user-1',
  roles: ['editor'],
  metadata: {
    department: 'Engineering',
    hireDate: '2025-01-01'
  }
};
```

### Partial Permissions

```typescript
type PartialPermissions = {
  [K in Permission]?: boolean;
};

function checkPermissions(user: RBACUser): PartialPermissions {
  const perms: PartialPermissions = {};

  for (const perm of Object.values(PERMISSIONS)) {
    perms[perm] = rbac.hasPermission(user, perm);
  }

  return perms;
}

// Usage
const userPermissions = checkPermissions(user);
console.log(userPermissions['user:read']); // boolean | undefined
```

## Namespaced Permissions

```typescript
namespace Permissions {
  export namespace User {
    export const READ = 'user:read';
    export const WRITE = 'user:write';
    export const DELETE = 'user:delete';
  }

  export namespace Post {
    export const READ = 'post:read';
    export const WRITE = 'post:write';
    export const DELETE = 'post:delete';
  }
}

// Usage
rbac.hasPermission(user, Permissions.User.READ);
rbac.hasPermission(user, Permissions.Post.WRITE);
```

## Configuration Types

### Strongly Typed Configuration

```typescript
interface RBACConfigTyped {
  roles: {
    name: Role;
    permissions: Permission[];
    level: number;
  }[];
  permissions: {
    name: Permission;
    bit: number;
  }[];
}

const config: RBACConfigTyped = {
  roles: [
    { name: 'admin', permissions: ['user:read', 'user:write'], level: 10 }
  ],
  permissions: [
    { name: 'user:read', bit: 1 },
    { name: 'user:write', bit: 2 }
  ]
};
```

## Best Practices

### 1. Define Types Early

```typescript
// ✅ Good: Define at the start
type Permission = 'user:read' | 'user:write';
type Role = 'admin' | 'editor';

interface AppUser extends RBACUser {
  email: string;
}

// Use throughout the app
```

### 2. Use Const Assertions

```typescript
// ✅ Good: Type-safe constants
const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write'
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

### 3. Avoid Any

```typescript
// ❌ Avoid
function checkPermission(user: any, permission: any) {
  return rbac.hasPermission(user, permission);
}

// ✅ Good
function checkPermission(user: RBACUser, permission: Permission) {
  return rbac.hasPermission(user, permission);
}
```

### 4. Use Generics

```typescript
// ✅ Good: Generic type-safe wrapper
function withPermission<T extends RBACUser>(
  user: T,
  permission: Permission,
  action: (user: T) => void
) {
  if (rbac.hasPermission(user, permission)) {
    action(user);
  }
}
```

### 5. Strict Mode

Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

## Framework-Specific Types

### React

```typescript
import type { RBACUser } from '@fire-shield/react';

interface Props {
  user: RBACUser;
  permission: Permission;
}

const ProtectedButton: React.FC<Props> = ({ user, permission }) => {
  const { can } = useRBAC();

  if (!can(permission)) {
    return null;
  }

  return <button>Action</button>;
};
```

### Vue

```typescript
import type { RBACUser } from '@fire-shield/vue';

interface UserState {
  user: RBACUser | null;
  isAuthenticated: boolean;
}

const userState = reactive<UserState>({
  user: null,
  isAuthenticated: false
});
```

### Express

```typescript
import type { Request, Response } from 'express';
import type { RBACUser } from '@fire-shield/core';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: RBACUser;
    }
  }
}

// Type-safe middleware
function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !rbac.hasPermission(req.user, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

## Testing with TypeScript

### Type-Safe Tests

```typescript
import { describe, it, expect } from 'vitest';
import type { RBACUser } from '@fire-shield/core';

describe('RBAC', () => {
  const admin: RBACUser = {
    id: 'admin-1',
    roles: ['admin']
  };

  const viewer: RBACUser = {
    id: 'viewer-1',
    roles: ['viewer']
  };

  it('should allow admin to delete', () => {
    expect(rbac.hasPermission(admin, 'post:delete')).toBe(true);
  });

  it('should deny viewer to delete', () => {
    expect(rbac.hasPermission(viewer, 'post:delete')).toBe(false);
  });
});
```

## Next Steps

- Explore [Core API](/api/core)
- Learn about [TypeScript Types](/api/types)
- Check out [Performance Guide](/guide/performance)
