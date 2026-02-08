# 🛡️ Fire Shield - React Adapter

React integration for Fire Shield RBAC authorization with hooks, components, and route guards.

## Features

- ✅ **React Hooks** - `usePermission`, `useRole`, `useRBAC`, `useAuthorize`
- ✅ **Conditional Components** - `<Can>`, `<Cannot>`
- ✅ **Route Protection** - `<ProtectedRoute>` (requires React Router)
- ✅ **TypeScript Support** - Full type safety
- ✅ **Framework Agnostic** - Works with any React app

## Installation

```bash
pnpm add @fire-shield/react @fire-shield/core

# If using ProtectedRoute component, also install:
pnpm add react-router-dom
```

## Quick Start

### 1. Setup RBAC Provider

```typescript
// App.tsx
import { BrowserRouter } from 'react-router-dom';
import { RBAC } from '@fire-shield/core';
import { RBACProvider } from '@fire-shield/react';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

function App() {
  const user = useAuth(); // Your auth hook

  return (
    <BrowserRouter>
      <RBACProvider rbac={rbac} user={user}>
        <Routes>
          {/* Your routes */}
        </Routes>
      </RBACProvider>
    </BrowserRouter>
  );
}
```

### 2. Protect Routes

**Note:** `ProtectedRoute` requires `react-router-dom` to be installed.

```typescript
// routes.tsx
import { ProtectedRoute } from '@fire-shield/react';

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Home />} />

      {/* Protected by permission */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute permission="admin:access">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected by role */}
      <Route
        path="/editor"
        element={
          <ProtectedRoute role="editor">
            <EditorPanel />
          </ProtectedRoute>
        }
      />

      {/* Custom unauthorized component */}
      <Route
        path="/users"
        element={
          <ProtectedRoute
            permission="user:read"
            fallback={<NoAccess />}
          >
            <UserList />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### 3. Use Hooks in Components

```typescript
// components/CreatePostButton.tsx
import { usePermission, useRole } from '@fire-shield/react';

function CreatePostButton() {
  const canCreate = usePermission('post:write');
  const isEditor = useRole('editor');

  if (!canCreate) {
    return null; // Hide button
  }

  return (
    <button onClick={createPost}>
      {isEditor ? 'Create & Publish' : 'Create Draft'}
    </button>
  );
}
```

## API

### Components

#### `<RBACProvider>`

Provides RBAC context to child components.

```typescript
<RBACProvider rbac={rbac} user={user}>
  {children}
</RBACProvider>
```

**Props:**
- `rbac: RBAC` - RBAC instance
- `user: RBACUser` - Current user
- `children: ReactNode` - Child components

#### `<ProtectedRoute>`

Protects routes with permission or role checks.

```typescript
<ProtectedRoute
  permission="admin:access"
  role="admin"
  fallback={<Unauthorized />}
  redirectTo="/login"
>
  {children}
</ProtectedRoute>
```

**Props:**
- `permission?: string` - Required permission
- `role?: string` - Required role
- `fallback?: ReactNode` - Component to show if unauthorized
- `redirectTo?: string` - Path to redirect if unauthorized
- `children: ReactNode` - Protected content

#### `<Can>`

Conditionally render based on permissions.

```typescript
<Can permission="post:write">
  <CreatePostButton />
</Can>

<Can role="admin">
  <AdminPanel />
</Can>
```

#### `<Cannot>`

Conditionally render when user lacks permission.

```typescript
<Cannot permission="post:write">
  <UpgradePrompt />
</Cannot>
```

### Hooks

#### `useRBAC()`

Returns RBAC instance from context.

```typescript
const rbac = useRBAC();

// Use RBAC methods
const canDelete = rbac.hasPermission(user, 'post:delete');
```

#### `usePermission(permission)`

Check if current user has permission.

```typescript
const canWrite = usePermission('post:write');

if (canWrite) {
  // Show editor
}
```

#### `useRole(role)`

Check if current user has role.

```typescript
const isAdmin = useRole('admin');

if (isAdmin) {
  // Show admin features
}
```

#### `useAuthorize(permission)`

Get full authorization result.

```typescript
const result = useAuthorize('admin:delete');

if (!result.allowed) {
  console.log('Denied:', result.reason);
}
```

#### `useUser()`

Get current user from context.

```typescript
const user = useUser();
console.log(user.id, user.roles);
```

## Examples

### Nested Route Protection

```typescript
function AdminRoutes() {
  return (
    <ProtectedRoute permission="admin:access">
      <Routes>
        <Route path="/" element={<AdminDashboard />} />

        <Route
          path="/users"
          element={
            <ProtectedRoute permission="user:manage">
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute permission="settings:manage">
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ProtectedRoute>
  );
}
```

### Dynamic Navigation

```typescript
function Navigation() {
  const canManageUsers = usePermission('user:manage');
  const canManagePosts = usePermission('post:manage');
  const isAdmin = useRole('admin');

  return (
    <nav>
      <Link to="/">Home</Link>

      {canManagePosts && (
        <Link to="/posts">Posts</Link>
      )}

      {canManageUsers && (
        <Link to="/users">Users</Link>
      )}

      {isAdmin && (
        <Link to="/admin">Admin</Link>
      )}
    </nav>
  );
}
```

### Action Buttons

```typescript
function PostActions({ post }: { post: Post }) {
  const canEdit = usePermission('post:edit');
  const canDelete = usePermission('post:delete');
  const canPublish = usePermission('post:publish');

  return (
    <div>
      {canEdit && (
        <button onClick={() => editPost(post.id)}>
          Edit
        </button>
      )}

      {canPublish && !post.published && (
        <button onClick={() => publishPost(post.id)}>
          Publish
        </button>
      )}

      {canDelete && (
        <button onClick={() => deletePost(post.id)}>
          Delete
        </button>
      )}
    </div>
  );
}
```

### Form Field Protection

```typescript
function UserForm() {
  const canEditEmail = usePermission('user:edit:email');
  const canEditRole = usePermission('user:edit:role');
  const canSetAdmin = useRole('admin');

  return (
    <form>
      <input name="name" />

      {canEditEmail && (
        <input name="email" type="email" />
      )}

      {canEditRole && (
        <select name="role">
          <option value="user">User</option>
          <option value="editor">Editor</option>
          {canSetAdmin && (
            <option value="admin">Admin</option>
          )}
        </select>
      )}
    </form>
  );
}
```

### Loading States

```typescript
function ProtectedDashboard() {
  const user = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute
      permission="dashboard:access"
      fallback={<Unauthorized />}
    >
      <Dashboard />
    </ProtectedRoute>
  );
}
```

## TypeScript Support

```typescript
import type { RBACUser } from '@fire-shield/core';

interface User extends RBACUser {
  email: string;
  name: string;
}

function App() {
  const user: User = useAuth();

  return (
    <RBACProvider<User> rbac={rbac} user={user}>
      {/* Fully typed */}
    </RBACProvider>
  );
}
```

## License

DIB © Fire Shield Team

## Links

- [Fire Shield Core](https://github.com/khapu2906/fire-shield/tree/main/packages/core)
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com) (for ProtectedRoute)
- [NPM](https://www.npmjs.com/package/@fire-shield/react)
