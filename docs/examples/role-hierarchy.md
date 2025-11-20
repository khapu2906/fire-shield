# Role Hierarchy Examples

Practical examples of implementing role hierarchies in real-world applications.

## Corporate Hierarchy

Complete example of a corporate organizational structure:

```typescript
import { RBAC, RBACBuilder } from '@fire-shield/core';

// Build corporate hierarchy
const rbac = new RBACBuilder()
  // Executive Level
  .addRole('ceo', ['*'], {
    level: 100,
    description: 'Chief Executive Officer - Full access'
  })
  .addRole('cto', ['technology:*', 'team:*'], {
    level: 90,
    description: 'Chief Technology Officer'
  })
  .addRole('cfo', ['finance:*', 'team:*'], {
    level: 90,
    description: 'Chief Financial Officer'
  })

  // Management Level
  .addRole('director', ['department:*', 'team:manage'], {
    level: 50,
    description: 'Department Director'
  })
  .addRole('manager', ['team:*', 'project:*'], {
    level: 30,
    description: 'Team Manager'
  })
  .addRole('team-lead', ['project:*', 'code:*'], {
    level: 20,
    description: 'Technical Team Lead'
  })

  // Individual Contributors
  .addRole('senior-engineer', ['code:*', 'review:*'], {
    level: 15,
    description: 'Senior Engineer'
  })
  .addRole('engineer', ['code:read', 'code:write'], {
    level: 10,
    description: 'Engineer'
  })
  .addRole('junior-engineer', ['code:read'], {
    level: 5,
    description: 'Junior Engineer'
  })
  .addRole('intern', ['code:read'], {
    level: 1,
    description: 'Intern - Read-only access'
  })

  .build();

// Usage examples
const ceo = { id: 'ceo-1', roles: ['ceo'] };
const manager = { id: 'mgr-1', roles: ['manager'] };
const engineer = { id: 'eng-1', roles: ['engineer'] };
const intern = { id: 'int-1', roles: ['intern'] };

// CEO can act as anyone
console.log(rbac.canActAsRole('ceo', 'intern')); // true
console.log(rbac.canActAsRole('ceo', 'manager')); // true

// Manager can act as engineers
console.log(rbac.canActAsRole('manager', 'engineer')); // true
console.log(rbac.canActAsRole('manager', 'intern')); // true

// Engineer cannot act as manager
console.log(rbac.canActAsRole('engineer', 'manager')); // false

// Permission checks
console.log(rbac.hasPermission(ceo, 'code:delete')); // true (has *)
console.log(rbac.hasPermission(manager, 'team:manage')); // true
console.log(rbac.hasPermission(intern, 'code:write')); // false
```

## Permission Delegation System

Example of delegating permissions based on hierarchy:

```typescript
interface DelegationRequest {
  delegatorId: string;
  delegateeId: string;
  permission: string;
  duration?: number; // milliseconds
}

class PermissionDelegationSystem {
  constructor(private rbac: RBAC) {}

  delegate(request: DelegationRequest): boolean {
    const delegator = this.getUser(request.delegatorId);
    const delegatee = this.getUser(request.delegateeId);

    // Check if delegator has the permission
    if (!this.rbac.hasPermission(delegator, request.permission)) {
      console.log('Delegator does not have this permission');
      return false;
    }

    // Check hierarchy - delegator must be higher level
    const canDelegate = this.canDelegateToUser(delegator, delegatee);
    if (!canDelegate) {
      console.log('Delegator cannot delegate to this user (insufficient level)');
      return false;
    }

    // Grant temporary permission
    this.grantTemporaryPermission(
      delegatee,
      request.permission,
      request.duration
    );

    return true;
  }

  private canDelegateToUser(delegator: RBACUser, delegatee: RBACUser): boolean {
    const hierarchy = this.rbac.getRoleHierarchy();

    for (const delegatorRole of delegator.roles) {
      for (const delegateeRole of delegatee.roles) {
        const delegatorLevel = hierarchy.getRoleLevel(delegatorRole);
        const delegateeLevel = hierarchy.getRoleLevel(delegateeRole);

        if (delegatorLevel > delegateeLevel) {
          return true;
        }
      }
    }

    return false;
  }

  private grantTemporaryPermission(
    user: RBACUser,
    permission: string,
    duration?: number
  ): void {
    // Add permission to user
    if (!user.permissions) {
      user.permissions = [];
    }
    user.permissions.push(permission);

    // Auto-revoke after duration
    if (duration) {
      setTimeout(() => {
        this.revokePermission(user, permission);
      }, duration);
    }
  }

  private revokePermission(user: RBACUser, permission: string): void {
    if (user.permissions) {
      user.permissions = user.permissions.filter(p => p !== permission);
    }
  }

  private getUser(userId: string): RBACUser {
    // Fetch from database
    return { id: userId, roles: [] };
  }
}

// Usage
const delegationSystem = new PermissionDelegationSystem(rbac);

const admin = { id: 'admin-1', roles: ['admin'] };
const manager = { id: 'mgr-1', roles: ['manager'] };

// Admin delegates permission to manager for 1 hour
delegationSystem.delegate({
  delegatorId: 'admin-1',
  delegateeId: 'mgr-1',
  permission: 'users:delete',
  duration: 3600000 // 1 hour
});
```

## Approval Workflow System

Example of multi-level approval workflow:

```typescript
interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterRole: string;
  action: string;
  resource: string;
  status: 'pending' | 'approved' | 'rejected';
  approvers: Array<{
    userId: string;
    level: number;
    status: 'pending' | 'approved' | 'rejected';
    timestamp?: number;
  }>;
}

class ApprovalWorkflow {
  constructor(private rbac: RBAC) {}

  createRequest(
    requesterId: string,
    requesterRole: string,
    action: string,
    resource: string
  ): ApprovalRequest {
    const hierarchy = this.rbac.getRoleHierarchy();
    const requesterLevel = hierarchy.getRoleLevel(requesterRole);

    // Determine required approval levels
    const approvalLevels = this.getRequiredApprovalLevels(action);

    // Find approvers at each level
    const approvers = approvalLevels
      .filter(level => level > requesterLevel)
      .map(level => ({
        userId: this.findUserAtLevel(level),
        level,
        status: 'pending' as const
      }));

    return {
      id: `req-${Date.now()}`,
      requesterId,
      requesterRole,
      action,
      resource,
      status: 'pending',
      approvers
    };
  }

  approve(request: ApprovalRequest, approverId: string): boolean {
    const approver = this.getUser(approverId);
    const hierarchy = this.rbac.getRoleHierarchy();

    // Check if approver has sufficient level
    const approverMaxLevel = Math.max(
      ...approver.roles.map(r => hierarchy.getRoleLevel(r))
    );

    // Update approvers
    for (const a of request.approvers) {
      if (a.level <= approverMaxLevel && a.status === 'pending') {
        a.status = 'approved';
        a.timestamp = Date.now();
      }
    }

    // Check if all approvals received
    const allApproved = request.approvers.every(a => a.status === 'approved');
    if (allApproved) {
      request.status = 'approved';
      this.executeAction(request);
    }

    return allApproved;
  }

  private getRequiredApprovalLevels(action: string): number[] {
    // Define approval requirements
    const requirements: Record<string, number[]> = {
      'budget:approve:small': [30], // Manager
      'budget:approve:medium': [30, 50], // Manager + Director
      'budget:approve:large': [30, 50, 90], // Manager + Director + Executive
      'user:delete': [50], // Director
      'system:shutdown': [90, 100], // Executive + CEO
    };

    return requirements[action] || [30];
  }

  private findUserAtLevel(level: number): string {
    // Find user with this role level from database
    return `user-level-${level}`;
  }

  private executeAction(request: ApprovalRequest): void {
    console.log(`Executing approved action: ${request.action}`);
  }

  private getUser(userId: string): RBACUser {
    return { id: userId, roles: [] };
  }
}

// Usage
const workflow = new ApprovalWorkflow(rbac);

// Engineer requests budget approval
const request = workflow.createRequest(
  'eng-1',
  'engineer',
  'budget:approve:large',
  'project-x'
);

console.log('Request created:', request);
// {
//   id: 'req-123',
//   approvers: [
//     { userId: 'user-level-30', level: 30, status: 'pending' },
//     { userId: 'user-level-50', level: 50, status: 'pending' },
//     { userId: 'user-level-90', level: 90, status: 'pending' }
//   ]
// }

// Manager approves (level 30)
workflow.approve(request, 'mgr-1');

// Director approves (level 50)
workflow.approve(request, 'dir-1');

// CEO approves (level 100) - approves both level 90 and 100
const approved = workflow.approve(request, 'ceo-1');
console.log('Fully approved:', approved); // true
```

## Document Access Control

Example of hierarchical document access:

```typescript
interface Document {
  id: string;
  title: string;
  ownerId: string;
  ownerRole: string;
  classification: 'public' | 'internal' | 'confidential' | 'secret';
  content: string;
}

class DocumentAccessControl {
  constructor(private rbac: RBAC) {}

  canAccessDocument(user: RBACUser, document: Document): boolean {
    // Owner can always access
    if (user.id === document.ownerId) {
      return true;
    }

    // Check permission based on classification
    const classificationPermission = `document:read:${document.classification}`;
    if (this.rbac.hasPermission(user, classificationPermission)) {
      return true;
    }

    // Check hierarchy - higher roles can access lower role documents
    const hierarchy = this.rbac.getRoleHierarchy();
    const ownerLevel = hierarchy.getRoleLevel(document.ownerRole);

    for (const userRole of user.roles) {
      const userLevel = hierarchy.getRoleLevel(userRole);
      if (userLevel > ownerLevel) {
        return true;
      }
    }

    return false;
  }

  canEditDocument(user: RBACUser, document: Document): boolean {
    // Owner can edit
    if (user.id === document.ownerId) {
      return this.rbac.hasPermission(user, 'document:edit:own');
    }

    // Higher hierarchy can edit
    const hierarchy = this.rbac.getRoleHierarchy();
    const ownerLevel = hierarchy.getRoleLevel(document.ownerRole);

    for (const userRole of user.roles) {
      const userLevel = hierarchy.getRoleLevel(userRole);
      if (userLevel > ownerLevel) {
        return this.rbac.hasPermission(user, 'document:edit:any');
      }
    }

    return false;
  }

  canDeleteDocument(user: RBACUser, document: Document): boolean {
    // Must have delete permission
    if (!this.rbac.hasPermission(user, 'document:delete')) {
      return false;
    }

    // Must be significantly higher in hierarchy (2+ levels)
    const hierarchy = this.rbac.getRoleHierarchy();
    const ownerLevel = hierarchy.getRoleLevel(document.ownerRole);

    for (const userRole of user.roles) {
      const userLevel = hierarchy.getRoleLevel(userRole);
      if (userLevel >= ownerLevel + 20) { // Require 20+ level difference
        return true;
      }
    }

    return false;
  }
}

// Setup permissions
rbac.createRole('intern', ['document:read:public', 'document:edit:own']);
rbac.createRole('employee', ['document:read:internal', 'document:edit:own']);
rbac.createRole('manager', ['document:read:confidential', 'document:edit:any', 'document:delete']);
rbac.createRole('director', ['document:read:secret', 'document:edit:any', 'document:delete']);

const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('intern', 1);
hierarchy.setRoleLevel('employee', 10);
hierarchy.setRoleLevel('manager', 30);
hierarchy.setRoleLevel('director', 50);

// Usage
const docControl = new DocumentAccessControl(rbac);

const employeeDoc: Document = {
  id: 'doc-1',
  title: 'Project Plan',
  ownerId: 'emp-1',
  ownerRole: 'employee',
  classification: 'internal',
  content: '...'
};

const intern = { id: 'int-1', roles: ['intern'] };
const employee = { id: 'emp-2', roles: ['employee'] };
const manager = { id: 'mgr-1', roles: ['manager'] };

console.log(docControl.canAccessDocument(intern, employeeDoc)); // false (no permission)
console.log(docControl.canAccessDocument(employee, employeeDoc)); // true (same level + permission)
console.log(docControl.canAccessDocument(manager, employeeDoc)); // true (higher level)

console.log(docControl.canEditDocument(employee, employeeDoc)); // false (not owner)
console.log(docControl.canEditDocument(manager, employeeDoc)); // true (higher level + edit:any)

console.log(docControl.canDeleteDocument(manager, employeeDoc)); // false (not 20+ levels higher)
console.log(docControl.canDeleteDocument(manager, internDoc)); // true (29 levels higher)
```

## Next Steps

- Learn about [Permissions](/guide/permissions)
- Explore [Wildcards](/examples/wildcards)
- Check [API Reference](/api/core)
