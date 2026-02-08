# 🛡️ Fire Shield - Angular Adapter

Angular integration for Fire Shield RBAC authorization with services, directives, and route guards.

## Features

- ✅ **RBACService** - Injectable service with RxJS observables
- ✅ **Structural Directives** - `*fsCanPermission`, `*fsHasRole`, `*fsCannotPermission`
- ✅ **Route Guards** - `canActivatePermission`, `canActivateRole`, `canActivateRBAC`
- ✅ **Reactive State** - RxJS BehaviorSubject for user state
- ✅ **TypeScript Support** - Full type safety
- ✅ **Standalone Components** - Compatible with Angular 14+

## Installation

```bash
npm install @fire-shield/angular @fire-shield/core
```

## Quick Start

### 1. Initialize RBAC Service

```typescript
// app.config.ts (Angular 17+) or main.ts
import { ApplicationConfig } from '@angular/core';
import { RBAC } from '@fire-shield/core';
import { RBACService } from '@fire-shield/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
  ]
};

// In your app initialization
export function initializeRBAC(rbacService: RBACService) {
  return () => {
    const rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);

    rbacService.initialize(rbac, null);
  };
}
```

### 2. Update User on Login

```typescript
import { Component } from '@angular/core';
import { RBACService } from '@fire-shield/angular';

@Component({
  selector: 'app-login',
  template: `<button (click)="login()">Login</button>`
})
export class LoginComponent {
  constructor(private rbacService: RBACService) {}

  login() {
    const user = { id: 'user-1', roles: ['editor'] };
    this.rbacService.setUser(user);
  }
}
```

### 3. Use in Components

```typescript
import { Component } from '@angular/core';
import { RBACService, CanPermissionDirective } from '@fire-shield/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, CanPermissionDirective],
  template: `
    <!-- Using observable -->
    <button *ngIf="canWrite$ | async">Create Post</button>

    <!-- Using directive -->
    <div *fsCanPermission="'post:write'">
      <button>Create Post</button>
    </div>
  `
})
export class PostsComponent {
  canWrite$ = this.rbacService.can$('post:write');

  constructor(private rbacService: RBACService) {}
}
```

## API

### RBACService

Injectable service that provides RBAC functionality.

#### Methods

**initialize(rbac: RBAC, initialUser?: RBACUser | null)**
```typescript
const rbac = new RBAC();
rbacService.initialize(rbac, null);
```

**setUser(user: RBACUser | null)**
```typescript
rbacService.setUser({ id: 'user-1', roles: ['editor'] });
```

**getUser(): RBACUser | null**
```typescript
const user = rbacService.getUser();
```

**can(permission: string): boolean**
```typescript
const allowed = rbacService.can('post:write');
```

**can$(permission: string): Observable<boolean>**
```typescript
rbacService.can$('post:write').subscribe(allowed => {
  console.log('Can write:', allowed);
});
```

**hasRole(role: string): boolean**
```typescript
const isAdmin = rbacService.hasRole('admin');
```

**hasRole$(role: string): Observable<boolean>**
```typescript
rbacService.hasRole$('admin').subscribe(isAdmin => {
  console.log('Is admin:', isAdmin);
});
```

**authorize(permission: string): AuthorizationResult**
```typescript
const result = rbacService.authorize('post:delete');
if (!result.allowed) {
  console.log('Denied:', result.reason);
}
```

**canAll(permissions: string[]): boolean**
```typescript
const hasAll = rbacService.canAll(['post:read', 'post:write']);
```

**canAny(permissions: string[]): boolean**
```typescript
const hasAny = rbacService.canAny(['post:read', 'post:write']);
```

### Directives

#### *fsCanPermission

Conditionally renders content based on permission.

```html
<div *fsCanPermission="'post:write'">
  Create Post Button
</div>
```

#### *fsHasRole

Conditionally renders content based on role.

```html
<div *fsHasRole="'admin'">
  Admin Panel
</div>
```

#### *fsCannotPermission

Conditionally renders content when permission is NOT present.

```html
<div *fsCannotPermission="'premium:access'">
  <p>Upgrade to Premium!</p>
</div>
```

### Route Guards

#### canActivatePermission

Protects routes based on permissions.

```typescript
import { Routes } from '@angular/router';
import { canActivatePermission } from '@fire-shield/angular';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [canActivatePermission],
    data: { permission: 'admin:access', redirectTo: '/unauthorized' }
  }
];
```

#### canActivateRole

Protects routes based on roles.

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [canActivateRole],
    data: { role: 'admin', redirectTo: '/unauthorized' }
  }
];
```

#### canActivateRBAC

Combined guard for both permissions and roles.

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [canActivateRBAC],
    data: {
      permission: 'admin:access',
      role: 'admin',
      redirectTo: '/unauthorized'
    }
  }
];
```

#### Multiple Permissions/Roles

```typescript
export const routes: Routes = [
  {
    path: 'posts',
    component: PostsComponent,
    canActivate: [canActivatePermission],
    data: {
      permissions: ['post:read', 'post:write'],
      requireAll: true, // or false for "any"
      redirectTo: '/unauthorized'
    }
  }
];
```

## Examples

### Component with Multiple Checks

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RBACService, CanPermissionDirective, HasRoleDirective } from '@fire-shield/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CanPermissionDirective, HasRoleDirective],
  template: `
    <h1>Dashboard</h1>

    <!-- Observable approach -->
    <nav>
      <a routerLink="/">Home</a>
      <a *ngIf="canManagePosts$ | async" routerLink="/posts">Posts</a>
      <a *ngIf="isAdmin$ | async" routerLink="/admin">Admin</a>
    </nav>

    <!-- Directive approach -->
    <div *fsCanPermission="'post:write'">
      <button>Create Post</button>
    </div>

    <div *fsHasRole="'admin'">
      <h2>Admin Controls</h2>
    </div>

    <div *fsCannotPermission="'premium:access'">
      <p>Upgrade to Premium for more features!</p>
    </div>
  `
})
export class DashboardComponent {
  canManagePosts$ = this.rbacService.can$('post:write');
  isAdmin$ = this.rbacService.hasRole$('admin');

  constructor(private rbacService: RBACService) {}
}
```

### Form with Conditional Fields

```typescript
@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CanPermissionDirective],
  template: `
    <form>
      <input name="name" [(ngModel)]="user.name" placeholder="Name" />

      <div *fsCanPermission="'user:edit:email'">
        <input name="email" [(ngModel)]="user.email" type="email" />
      </div>

      <div *fsCanPermission="'user:edit:role'">
        <select name="role" [(ngModel)]="user.role">
          <option value="user">User</option>
          <option value="editor">Editor</option>
          <option *fsHasRole="'admin'" value="admin">Admin</option>
        </select>
      </div>

      <button type="submit">Save</button>
    </form>
  `
})
export class UserFormComponent {
  user = { name: '', email: '', role: 'user' };

  constructor(private rbacService: RBACService) {}
}
```

### Route Configuration

```typescript
import { Routes } from '@angular/router';
import { canActivatePermission, canActivateRole, canActivateRBAC } from '@fire-shield/angular';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'posts',
    component: PostsComponent,
    canActivate: [canActivatePermission],
    data: { permission: 'post:read', redirectTo: '/unauthorized' }
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [canActivateRole],
    data: { role: 'admin', redirectTo: '/unauthorized' }
  },
  {
    path: 'editor',
    component: EditorComponent,
    canActivate: [canActivateRBAC],
    data: {
      permissions: ['post:read', 'post:write'],
      role: 'editor',
      requireAll: true,
      redirectTo: '/unauthorized'
    }
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  }
];
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/angular';

interface User extends RBACUser {
  email: string;
  name: string;
}

const user: User = {
  id: 'user-1',
  roles: ['editor'],
  email: 'user@example.com',
  name: 'John Doe'
};

rbacService.setUser(user);
```

## Learn More

- [@fire-shield/core Documentation](https://npmjs.com/package/@fire-shield/core)
- [Angular Documentation](https://angular.dev)
- [RxJS Documentation](https://rxjs.dev)

## License

DIB © Fire Shield Team
