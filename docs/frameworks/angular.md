# Angular Integration

Fire Shield provides Angular integration with services, directives, and route guards for comprehensive RBAC support.

## Features

- Injectable RBACService with RxJS observables
- Structural directives (`*fsCanPermission`, `*fsHasRole`, `*fsCannotPermission`)
- Route guards for protecting routes
- Reactive state management with BehaviorSubject
- Full TypeScript support
- Compatible with standalone components (Angular 14+)

## Installation

```bash
npm install @fire-shield/angular @fire-shield/core
```

## Setup

### 1. Initialize RBAC

Create an initialization function:

```typescript
// app.config.ts (Angular 17+)
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RBAC } from '@fire-shield/core';
import { RBACService } from '@fire-shield/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    RBACService
  ]
};
```

```typescript
// main.ts
import { APP_INITIALIZER } from '@angular/core';
import { RBACService } from '@fire-shield/angular';
import { RBAC } from '@fire-shield/core';

export function initializeRBAC(rbacService: RBACService) {
  return () => {
    const rbac = new RBAC();

    // Define roles
    rbac.createRole('admin', ['user:*', 'post:*']);
    rbac.createRole('editor', ['post:read', 'post:write']);
    rbac.createRole('viewer', ['post:read']);

    // Set hierarchy
    rbac.getRoleHierarchy().setRoleLevel('admin', 10);
    rbac.getRoleHierarchy().setRoleLevel('editor', 5);
    rbac.getRoleHierarchy().setRoleLevel('viewer', 1);

    rbacService.initialize(rbac, null);
  };
}

// In providers array:
{
  provide: APP_INITIALIZER,
  useFactory: initializeRBAC,
  deps: [RBACService],
  multi: true
}
```

### 2. Update User on Login

```typescript
import { Component, inject } from '@angular/core';
import { RBACService } from '@fire-shield/angular';

@Component({
  selector: 'app-login',
  template: '<button (click)="login()">Login</button>'
})
export class LoginComponent {
  private rbacService = inject(RBACService);

  login() {
    const user = { id: 'user-1', roles: ['editor'] };
    this.rbacService.setUser(user);
  }
}
```

## RBACService

Injectable service that provides RBAC functionality.

### Methods

#### initialize(rbac: RBAC, initialUser?: RBACUser | null)

```typescript
constructor(private rbacService: RBACService) {
  const rbac = new RBAC();
  this.rbacService.initialize(rbac, null);
}
```

#### setUser(user: RBACUser | null)

```typescript
this.rbacService.setUser({ id: 'user-1', roles: ['editor'] });
```

#### getUser(): RBACUser | null

```typescript
const user = this.rbacService.getUser();
```

#### can(permission: string): boolean

Synchronous permission check:

```typescript
const allowed = this.rbacService.can('post:write');
```

#### can$(permission: string): Observable&lt;boolean&gt;

Reactive permission check:

```typescript
this.rbacService.can$('post:write').subscribe(allowed => {
  console.log('Can write:', allowed);
});
```

#### hasRole(role: string): boolean

Synchronous role check:

```typescript
const isAdmin = this.rbacService.hasRole('admin');
```

#### hasRole$(role: string): Observable&lt;boolean&gt;

Reactive role check:

```typescript
this.rbacService.hasRole$('admin').subscribe(isAdmin => {
  console.log('Is admin:', isAdmin);
});
```

#### authorize(permission: string): AuthorizationResult

Get detailed authorization result:

```typescript
const result = this.rbacService.authorize('post:delete');
if (!result.allowed) {
  console.log('Denied:', result.reason);
}
```

#### canAll(permissions: string[]): boolean

Check if user has all permissions:

```typescript
const hasAll = this.rbacService.canAll(['post:read', 'post:write']);
```

#### canAny(permissions: string[]): boolean

Check if user has any permission:

```typescript
const hasAny = this.rbacService.canAny(['post:read', 'post:write']);
```

## Directives

### *fsCanPermission

Conditionally renders content based on permission:

```html
<div *fsCanPermission="'post:write'">
  <button>Create Post</button>
</div>
```

### *fsHasRole

Conditionally renders content based on role:

```html
<div *fsHasRole="'admin'">
  <h2>Admin Panel</h2>
</div>
```

### *fsCannotPermission

Inverse conditional rendering (show when permission is NOT present):

```html
<div *fsCannotPermission="'premium:access'">
  <p>Upgrade to Premium!</p>
</div>
```

## Component Examples

### Basic Component with Directives

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RBACService,
  CanPermissionDirective,
  HasRoleDirective,
  CannotPermissionDirective
} from '@fire-shield/angular';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [
    CommonModule,
    CanPermissionDirective,
    HasRoleDirective,
    CannotPermissionDirective
  ],
  template: `
    <h1>Posts</h1>

    <!-- Using observable -->
    <button *ngIf="canWrite$ | async">Create Post</button>

    <!-- Using directive -->
    <div *fsCanPermission="'post:write'">
      <button>Create Post</button>
    </div>

    <!-- Role check -->
    <div *fsHasRole="'admin'">
      <button>Admin Options</button>
    </div>

    <!-- Cannot check -->
    <div *fsCannotPermission="'premium:access'">
      <p>Upgrade to access premium features</p>
    </div>
  `
})
export class PostsComponent {
  canWrite$ = this.rbacService.can$('post:write');
  isAdmin$ = this.rbacService.hasRole$('admin');

  constructor(private rbacService: RBACService) {}
}
```

### Complex Dashboard Component

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  RBACService,
  CanPermissionDirective,
  HasRoleDirective
} from '@fire-shield/angular';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CanPermissionDirective,
    HasRoleDirective
  ],
  template: `
    <h1>Dashboard</h1>

    <nav>
      <a routerLink="/">Home</a>
      <a *ngIf="canManagePosts$ | async" routerLink="/posts">Posts</a>
      <a *ngIf="canManageUsers$ | async" routerLink="/users">Users</a>
      <a *ngIf="isAdmin$ | async" routerLink="/admin">Admin</a>
    </nav>

    <div class="actions">
      <div *fsCanPermission="'post:write'">
        <button (click)="createPost()">Create Post</button>
      </div>

      <div *fsHasRole="'admin'">
        <h2>Admin Controls</h2>
        <button (click)="openAdminPanel()">Open Admin</button>
      </div>
    </div>

    <div *fsCannotPermission="'premium:access'" class="upgrade-banner">
      <p>Upgrade to Premium for more features!</p>
      <button (click)="upgradeToPremium()">Upgrade Now</button>
    </div>
  `,
  styles: [`
    .upgrade-banner {
      padding: 1rem;
      background: #f0f0f0;
      border-radius: 8px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  canManagePosts$!: Observable<boolean>;
  canManageUsers$!: Observable<boolean>;
  isAdmin$!: Observable<boolean>;

  constructor(private rbacService: RBACService) {}

  ngOnInit() {
    this.canManagePosts$ = this.rbacService.can$('post:write');
    this.canManageUsers$ = this.rbacService.can$('user:write');
    this.isAdmin$ = this.rbacService.hasRole$('admin');
  }

  createPost() {
    console.log('Creating post...');
  }

  openAdminPanel() {
    console.log('Opening admin panel...');
  }

  upgradeToPremium() {
    console.log('Upgrading to premium...');
  }
}
```

### Form with Conditional Fields

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RBACService,
  CanPermissionDirective,
  HasRoleDirective
} from '@fire-shield/angular';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CanPermissionDirective,
    HasRoleDirective
  ],
  template: `
    <form (ngSubmit)="onSubmit()">
      <input name="name" [(ngModel)]="user.name" placeholder="Name" />

      <div *fsCanPermission="'user:edit:email'">
        <input
          name="email"
          [(ngModel)]="user.email"
          type="email"
          placeholder="Email"
        />
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

  onSubmit() {
    console.log('Submitting user:', this.user);
  }
}
```

## Route Guards

### canActivatePermission

Protect routes based on permissions:

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

### canActivateRole

Protect routes based on roles:

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

### canActivateRBAC

Combined guard for both permissions and roles:

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

### Multiple Permissions/Roles

```typescript
export const routes: Routes = [
  {
    path: 'posts',
    component: PostsComponent,
    canActivate: [canActivatePermission],
    data: {
      permissions: ['post:read', 'post:write'],
      requireAll: true, // Must have all permissions
      redirectTo: '/unauthorized'
    }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [canActivatePermission],
    data: {
      permissions: ['admin:view', 'moderator:view'],
      requireAll: false, // Must have at least one permission
      redirectTo: '/unauthorized'
    }
  }
];
```

### Complete Route Configuration

```typescript
import { Routes } from '@angular/router';
import {
  canActivatePermission,
  canActivateRole,
  canActivateRBAC
} from '@fire-shield/angular';

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

## Services

### Permission Service

```typescript
// services/permissions.service.ts
import { Injectable, inject } from '@angular/core';
import { RBACService } from '@fire-shield/angular';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private rbacService = inject(RBACService);

  canManageUsers(): boolean {
    return this.rbacService.can('user:manage');
  }

  canManageUsers$(): Observable<boolean> {
    return this.rbacService.can$('user:manage');
  }

  canEditPost(post: Post): boolean {
    const user = this.rbacService.getUser();
    if (!user) return false;

    return (
      this.rbacService.can('post:edit:any') ||
      (post.authorId === user.id && this.rbacService.can('post:edit:own'))
    );
  }

  canDeletePost(post: Post): boolean {
    const user = this.rbacService.getUser();
    if (!user) return false;

    return (
      this.rbacService.can('post:delete:any') ||
      (post.authorId === user.id && this.rbacService.can('post:delete:own'))
    );
  }
}
```

## HTTP Interceptor

Add RBAC context to HTTP requests:

```typescript
// interceptors/rbac.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RBACService } from '@fire-shield/angular';
import { Router } from '@angular/router';

@Injectable()
export class RBACInterceptor implements HttpInterceptor {
  constructor(
    private rbacService: RBACService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const user = this.rbacService.getUser();

    // Add user roles to header
    if (user) {
      request = request.clone({
        setHeaders: {
          'X-User-Roles': user.roles.join(',')
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 403) {
          // Handle forbidden error
          this.router.navigate(['/unauthorized']);
        }
        return throwError(() => error);
      })
    );
  }
}
```

**Register interceptor:**
```typescript
// app.config.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RBACInterceptor } from './interceptors/rbac.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RBACInterceptor,
      multi: true
    }
  ]
};
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

this.rbacService.setUser(user);
```

## Best Practices

### 1. Use Observables for Reactive UI

```typescript
export class MyComponent {
  canEdit$ = this.rbacService.can$('post:edit');
  isAdmin$ = this.rbacService.hasRole$('admin');

  constructor(private rbacService: RBACService) {}
}
```

### 2. Centralize Permission Logic

```typescript
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  constructor(private rbacService: RBACService) {}

  canAccessAdminPanel() {
    return this.rbacService.hasRole('admin');
  }
}
```

### 3. Use Route Guards

```typescript
const routes: Routes = [
  {
    path: 'admin',
    canActivate: [canActivateRole],
    data: { role: 'admin' }
  }
];
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
