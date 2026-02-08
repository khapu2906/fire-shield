# Role Hierarchy

Understanding and implementing role hierarchies in Fire Shield.

## What is Role Hierarchy?

Role hierarchy is a level-based system where higher-level roles can perform actions on behalf of lower-level roles. This creates a natural organizational structure that mirrors real-world authority relationships.

## Key Concepts

**Level-Based System:**
- Each role is assigned a numeric level
- Higher numbers = more privileged
- Level determines if a role can "act as" another role

**Use Cases:**
- Organizational hierarchies (CEO > Manager > Employee)
- Permission delegation (Admin can act as any lower role)
- Resource access control (only higher roles can manage lower-role resources)
- Approval workflows (requires someone of higher level)

## Setting Up Hierarchy

### Basic Setup

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();

// Create roles
rbac.createRole('employee', ['document:read', 'document:create']);
rbac.createRole('manager', ['document:*', 'team:view']);
rbac.createRole('admin', ['*']);

// Set hierarchy levels
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('employee', 1);
hierarchy.setRoleLevel('manager', 5);
hierarchy.setRoleLevel('admin', 10);
```

### With RBAC Builder

```typescript
import { RBACBuilder } from '@fire-shield/core';

const rbac = new RBACBuilder()
  .addRole('employee', ['document:read'], { level: 1 })
  .addRole('manager', ['document:*'], { level: 5 })
  .addRole('admin', ['*'], { level: 10 })
  .build();
```

## Checking Hierarchy

### canActAs

Check if a role can act as another role:

```typescript
// Can admin act as manager?
rbac.canActAsRole('admin', 'manager'); // true (10 >= 5)

// Can manager act as admin?
rbac.canActAsRole('manager', 'admin'); // false (5 < 10)

// Can manager act as employee?
rbac.canActAsRole('manager', 'employee'); // true (5 >= 1)
```

### Direct Hierarchy Access

```typescript
const hierarchy = rbac.getRoleHierarchy();

// Check if role1 can act as role2
hierarchy.canActAs('admin', 'manager'); // true

// Check if role1 has higher level than role2
hierarchy.hasHigherLevel('admin', 'employee'); // true

// Get role level
const adminLevel = hierarchy.getRoleLevel('admin'); // 10
```

## Real-World Examples

### Corporate Hierarchy

```typescript
const rbac = new RBACBuilder()
  // C-Level
  .addRole('ceo', ['*'], {
    level: 100,
    description: 'Chief Executive Officer'
  })
  .addRole('cto', ['technology:*', 'team:*'], {
    level: 90,
    description: 'Chief Technology Officer'
  })

  // Management
  .addRole('director', ['department:*', 'team:manage'], {
    level: 50,
    description: 'Department Director'
  })
  .addRole('manager', ['team:*', 'project:*'], {
    level: 30,
    description: 'Team Manager'
  })

  // Individual Contributors
  .addRole('senior-engineer', ['project:*', 'code:*'], {
    level: 20,
    description: 'Senior Engineer'
  })
  .addRole('engineer', ['code:read', 'code:write'], {
    level: 10,
    description: 'Engineer'
  })
  .addRole('intern', ['code:read'], {
    level: 1,
    description: 'Intern'
  })

  .build();

// CEO can act as anyone
rbac.canActAsRole('ceo', 'intern'); // true

// Manager can act as engineers
rbac.canActAsRole('manager', 'engineer'); // true

// Engineer cannot act as manager
rbac.canActAsRole('engineer', 'manager'); // false
```

### Permission Delegation

```typescript
function canDelegatePermission(
  delegator: RBACUser,
  delegatee: RBACUser,
  permission: string
): boolean {
  // Check if delegator has the permission
  if (!rbac.hasPermission(delegator, permission)) {
    return false;
  }

  // Check if delegator can act as delegatee (higher level)
  const delegatorRoles = delegator.roles;
  const delegateeRoles = delegatee.roles;

  for (const delegatorRole of delegatorRoles) {
    for (const delegateeRole of delegateeRoles) {
      if (rbac.canActAsRole(delegatorRole, delegateeRole)) {
        return true;
      }
    }
  }

  return false;
}

// Usage
const admin = { id: 'admin-1', roles: ['admin'] };
const manager = { id: 'mgr-1', roles: ['manager'] };

canDelegatePermission(admin, manager, 'team:manage'); // true
```

### Resource Access Control

```typescript
interface Document {
  id: string;
  ownerId: string;
  ownerRole: string;
  content: string;
}

function canAccessDocument(
  user: RBACUser,
  document: Document
): boolean {
  // Owner can always access
  if (user.id === document.ownerId) {
    return true;
  }

  // Check if user's role is higher than document owner's role
  for (const userRole of user.roles) {
    const userLevel = rbac.getRoleHierarchy().getRoleLevel(userRole);
    const ownerLevel = rbac.getRoleHierarchy().getRoleLevel(document.ownerRole);

    if (userLevel > ownerLevel) {
      return true;
    }
  }

  return false;
}

// Usage
const manager = { id: 'mgr-1', roles: ['manager'] };
const employeeDoc = {
  id: 'doc-1',
  ownerId: 'emp-1',
  ownerRole: 'employee',
  content: 'Employee document'
};

canAccessDocument(manager, employeeDoc); // true (manager > employee)
```

### Approval Workflows

```typescript
interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterRole: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected';
}

function canApproveRequest(
  approver: RBACUser,
  request: ApprovalRequest
): boolean {
  // Must have approval permission
  if (!rbac.hasPermission(approver, 'approval:grant')) {
    return false;
  }

  // Approver must be higher level than requester
  const hierarchy = rbac.getRoleHierarchy();

  for (const approverRole of approver.roles) {
    const approverLevel = hierarchy.getRoleLevel(approverRole);
    const requesterLevel = hierarchy.getRoleLevel(request.requesterRole);

    if (approverLevel > requesterLevel) {
      return true;
    }
  }

  return false;
}

// Usage
const manager = { id: 'mgr-1', roles: ['manager'] };
const employeeRequest: ApprovalRequest = {
  id: 'req-1',
  requesterId: 'emp-1',
  requesterRole: 'employee',
  action: 'vacation',
  status: 'pending'
};

canApproveRequest(manager, employeeRequest); // true
```

## Advanced Patterns

### Multi-Role Users

```typescript
const user = {
  id: 'user-1',
  roles: ['engineer', 'team-lead'] // Multiple roles
};

// Check if user can act as any role
function canActAsAnyRole(user: RBACUser, targetRole: string): boolean {
  return user.roles.some(role => rbac.canActAsRole(role, targetRole));
}

canActAsAnyRole(user, 'intern'); // true if either engineer or team-lead can
```

### Cross-Department Hierarchy

```typescript
const rbac = new RBACBuilder()
  // Engineering
  .addRole('engineering-director', ['engineering:*'], { level: 50 })
  .addRole('engineering-manager', ['engineering:team:*'], { level: 30 })
  .addRole('engineer', ['engineering:code:*'], { level: 10 })

  // Sales
  .addRole('sales-director', ['sales:*'], { level: 50 })
  .addRole('sales-manager', ['sales:team:*'], { level: 30 })
  .addRole('sales-rep', ['sales:deal:*'], { level: 10 })

  // Executive (above all departments)
  .addRole('ceo', ['*'], { level: 100 })

  .build();

// CEO can act as any role
rbac.canActAsRole('ceo', 'engineering-director'); // true
rbac.canActAsRole('ceo', 'sales-director'); // true

// Directors cannot cross departments
rbac.canActAsRole('engineering-director', 'sales-director'); // false (same level)
```

### Dynamic Level Assignment

```typescript
function assignRoleLevel(role: string, departmentSize: number): number {
  const baseLevel = {
    'ceo': 100,
    'director': 50,
    'manager': 30,
    'lead': 20,
    'member': 10
  };

  // Adjust level based on department size
  const sizeMultiplier = Math.log10(departmentSize);
  return Math.floor(baseLevel[role] * (1 + sizeMultiplier * 0.1));
}

// Large department managers get slightly higher level
const largeTeamManager = assignRoleLevel('manager', 100); // ~33
const smallTeamManager = assignRoleLevel('manager', 10); // ~30
```

## Best Practices

### 1. Use Meaningful Levels

```typescript
// ✅ Good: Clear hierarchy
.addRole('ceo', ['*'], { level: 100 })
.addRole('director', ['department:*'], { level: 50 })
.addRole('manager', ['team:*'], { level: 30 })
.addRole('employee', ['task:*'], { level: 10 })

// ❌ Avoid: Random numbers
.addRole('admin', ['*'], { level: 42 })
.addRole('user', ['read'], { level: 7 })
```

### 2. Leave Room for Growth

```typescript
// ✅ Good: Spacing allows insertions
.addRole('ceo', ['*'], { level: 100 })
.addRole('vp', ['division:*'], { level: 80 })
.addRole('director', ['department:*'], { level: 60 })
.addRole('manager', ['team:*'], { level: 40 })

// Now you can add 'senior-manager' at level 50
```

### 3. Document Hierarchy

```typescript
// ✅ Good: Clear descriptions
.addRole('admin', ['*'], {
  level: 100,
  description: 'System administrator - can manage all resources',
  metadata: {
    canDelegate: true,
    maxDelegationLevel: 90
  }
})
```

### 4. Validate Hierarchy

```typescript
// Validate hierarchy on startup
function validateHierarchy(rbac: RBAC) {
  const hierarchy = rbac.getRoleHierarchy();
  const roles = hierarchy.getAllRoles();

  for (const role of roles) {
    const level = hierarchy.getRoleLevel(role);
    console.log(`${role}: level ${level}`);

    if (level === 0) {
      console.warn(`⚠️ Role ${role} has no level set`);
    }
  }
}
```

## Common Pitfalls

### 1. Circular Dependencies

```typescript
// ❌ Avoid: Same levels can cause issues
rbac.getRoleHierarchy().setRoleLevel('admin', 10);
rbac.getRoleHierarchy().setRoleLevel('manager', 10);

// Who can act as who?
rbac.canActAsRole('admin', 'manager'); // false (10 >= 10 is false)
```

### 2. Forgetting to Set Levels

```typescript
// ❌ Avoid: Roles without levels
rbac.createRole('admin', ['*']); // No level set!

// ✅ Good: Always set levels
rbac.createRole('admin', ['*']);
rbac.getRoleHierarchy().setRoleLevel('admin', 10);
```

## Next Steps

- Learn about [Permissions](/guide/permissions)
- Explore [Roles](/guide/roles)
- Check out [Examples](/examples/basic-usage)
