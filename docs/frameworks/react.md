# React Integration

Fire Shield provides hooks and components for React applications.

## Installation

```bash
npm install @fire-shield/react @fire-shield/core
```

## Setup

### Basic Setup

```typescript
// App.tsx
import { RBACProvider } from '@fire-shield/react'
import { RBAC } from '@fire-shield/core'
import { useState } from 'react'

// Initialize RBAC
const rbac = new RBAC()
rbac.createRole('admin', ['posts:*', 'users:*'])
rbac.createRole('editor', ['posts:read', 'posts:write'])
rbac.createRole('viewer', ['posts:read'])

function App() {
  const [user, setUser] = useState({
    id: '1',
    roles: ['editor']
  })

  return (
    <RBACProvider rbac={rbac} user={user}>
      <YourApp />
    </RBACProvider>
  )
}
```

## Hooks

### useRBAC

Access RBAC functionality in your components:

```tsx
import { useRBAC } from '@fire-shield/react'

function PostEditor() {
  const { can, cannot, hasRole, user } = useRBAC()

  const handleDelete = () => {
    if (!can('posts:delete')) {
      alert('No permission to delete')
      return
    }
    deletePost()
  }

  return (
    <div>
      <h2>Post Editor</h2>
      <p>Current user: {user?.id}</p>

      {can('posts:write') && (
        <button onClick={createPost}>Create Post</button>
      )}

      {can('posts:delete') && (
        <button onClick={handleDelete}>Delete Post</button>
      )}

      {cannot('posts:publish') && (
        <p>Contact admin to publish posts</p>
      )}

      {hasRole('admin') && (
        <button onClick={openAdminPanel}>Admin Panel</button>
      )}
    </div>
  )
}
```

### Hook API

```typescript
interface UseRBACReturn {
  // Check if user has permission
  can: (permission: string) => boolean

  // Check if user doesn't have permission
  cannot: (permission: string) => boolean

  // Check if user has role
  hasRole: (role: string) => boolean

  // Current user
  user: RBACUser | null

  // Update current user
  setUser: (user: RBACUser | null) => void

  // RBAC instance
  rbac: RBAC
}
```

## Components

### Can Component

Conditionally render content based on permissions:

```tsx
import { Can } from '@fire-shield/react'

function PostActions() {
  return (
    <div>
      <Can permission="posts:write">
        <button>Create Post</button>
      </Can>

      <Can permission="posts:delete" fallback={<p>No permission</p>}>
        <button>Delete Post</button>
      </Can>
    </div>
  )
}
```

### Cannot Component

Inverse of Can component:

```tsx
import { Cannot } from '@fire-shield/react'

function UpgradePrompt() {
  return (
    <Cannot permission="premium:access">
      <div className="upgrade-banner">
        <p>Upgrade to unlock premium features</p>
        <button>Upgrade Now</button>
      </div>
    </Cannot>
  )
}
```

### RequirePermission Component

Throw error or show fallback if permission is missing:

```tsx
import { RequirePermission } from '@fire-shield/react'

function AdminPanel() {
  return (
    <RequirePermission
      permission="admin:access"
      fallback={<div>Access Denied</div>}
    >
      <div>
        <h1>Admin Panel</h1>
        {/* Admin content */}
      </div>
    </RequirePermission>
  )
}
```

### RequireRole Component

Require specific role:

```tsx
import { RequireRole } from '@fire-shield/react'

function ModeratorTools() {
  return (
    <RequireRole
      role="moderator"
      fallback={<div>Moderator access required</div>}
    >
      <div>
        <h2>Moderator Tools</h2>
        {/* Moderator tools */}
      </div>
    </RequireRole>
  )
}
```

## React Router Integration

### Protected Routes

```tsx
import { Navigate } from 'react-router-dom'
import { useRBAC } from '@fire-shield/react'

function ProtectedRoute({ permission, children }) {
  const { can } = useRBAC()

  if (!can(permission)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

// Usage in router
<Routes>
  <Route
    path="/admin"
    element={
      <ProtectedRoute permission="admin:access">
        <AdminPage />
      </ProtectedRoute>
    }
  />
</Routes>
```

### Route Guards

```tsx
import { createBrowserRouter } from 'react-router-dom'
import { useRBAC } from '@fire-shield/react'

const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminLayout />,
    loader: () => {
      const { can } = useRBAC()
      if (!can('admin:access')) {
        throw new Response('Unauthorized', { status: 403 })
      }
      return null
    },
    children: [
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
])
```

## Updating User

Update user permissions dynamically:

```tsx
import { useRBAC } from '@fire-shield/react'

function UserSwitcher() {
  const { user, setUser } = useRBAC()

  const switchToAdmin = () => {
    setUser({
      id: 'admin-1',
      roles: ['admin']
    })
  }

  const switchToViewer = () => {
    setUser({
      id: 'viewer-1',
      roles: ['viewer']
    })
  }

  return (
    <div>
      <p>Current user: {user?.id}</p>
      <button onClick={switchToAdmin}>Switch to Admin</button>
      <button onClick={switchToViewer}>Switch to Viewer</button>
    </div>
  )
}
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { useRBAC } from '@fire-shield/react'
import type { RBACUser } from '@fire-shield/core'

// Type-safe user
const user: RBACUser = {
  id: 'user-123',
  roles: ['editor']
}

// Type-safe hook
const { can, hasRole } = useRBAC()

can('posts:write')   // Type-checked
hasRole('editor')    // Type-checked
```

## Best Practices

### 1. Use Components for JSX

```tsx
// ✅ Good: Declarative and clean
<Can permission="posts:delete">
  <button>Delete</button>
</Can>

// ❌ Avoid: Less readable
{can('posts:delete') && <button>Delete</button>}
```

### 2. Use Hooks for Logic

```tsx
// ✅ Good: Clear permission check
const { can } = useRBAC()

const handleDelete = () => {
  if (!can('posts:delete')) {
    showError('No permission')
    return
  }
  deletePost()
}

// ❌ Avoid: Permission check in JSX
<button onClick={() => {
  if (!can('posts:delete')) return
  deletePost()
}}>
```

### 3. Memoize Permission Checks

```tsx
import { useMemo } from 'react'
import { useRBAC } from '@fire-shield/react'

function ExpensiveComponent() {
  const { can } = useRBAC()

  const permissions = useMemo(() => ({
    canWrite: can('posts:write'),
    canDelete: can('posts:delete'),
    canPublish: can('posts:publish')
  }), [can])

  return (
    // Use permissions object
  )
}
```

### 4. Handle Loading States

```tsx
function UserProfile() {
  const { user, can } = useRBAC()

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{user.id}</h1>
      {can('profile:edit') && <EditButton />}
    </div>
  )
}
```

## Server-Side Rendering (SSR)

### Next.js Integration

For Next.js, use the dedicated [@fire-shield/next](/frameworks/next) package which provides server-side support.

### Other SSR Frameworks

Provide initial user state from server:

```tsx
// server.tsx
const initialUser = await getUserFromSession(req)

const html = renderToString(
  <RBACProvider rbac={rbac} user={initialUser}>
    <App />
  </RBACProvider>
)
```

## Testing

### Testing Components with RBAC

```tsx
import { render, screen } from '@testing-library/react'
import { RBACProvider } from '@fire-shield/react'
import { RBAC } from '@fire-shield/core'

function renderWithRBAC(component, user) {
  const rbac = new RBAC()
  rbac.createRole('admin', ['posts:*'])
  rbac.createRole('viewer', ['posts:read'])

  return render(
    <RBACProvider rbac={rbac} user={user}>
      {component}
    </RBACProvider>
  )
}

test('shows delete button for admin', () => {
  renderWithRBAC(
    <PostActions />,
    { id: '1', roles: ['admin'] }
  )

  expect(screen.getByText('Delete Post')).toBeInTheDocument()
})

test('hides delete button for viewer', () => {
  renderWithRBAC(
    <PostActions />,
    { id: '2', roles: ['viewer'] }
  )

  expect(screen.queryByText('Delete Post')).not.toBeInTheDocument()
})
```

## Examples

### Blog Post Management

```tsx
import { Can, useRBAC } from '@fire-shield/react'

function PostCard({ post }) {
  const { can } = useRBAC()

  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>

      <div className="actions">
        <Can permission="posts:read">
          <button>Read More</button>
        </Can>

        <Can permission="posts:write">
          <button>Edit</button>
        </Can>

        <Can permission="posts:delete">
          <button>Delete</button>
        </Can>

        {can('posts:publish') && !post.published && (
          <button>Publish</button>
        )}
      </div>
    </div>
  )
}
```

### User Management Dashboard

```tsx
import { RequirePermission, Can } from '@fire-shield/react'

function UserManagement() {
  return (
    <RequirePermission permission="users:read">
      <div>
        <h1>User Management</h1>

        <Can permission="users:create">
          <button>Add New User</button>
        </Can>

        <UserList />

        <Can permission="users:export">
          <button>Export Users</button>
        </Can>
      </div>
    </RequirePermission>
  )
}
```

## Next Steps

- Explore [API Reference](/api/core)
- Learn about [Permissions](/guide/permissions)
- Check out [Examples](/examples/basic-usage)
