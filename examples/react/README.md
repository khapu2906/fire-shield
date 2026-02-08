# 🛡️ Fire Shield React Example

This is a complete example application demonstrating how to use `@fire-shield/react` for role-based access control in a React application.

## Features Demonstrated

- ✅ **RBACProvider** - Providing RBAC context to the app
- ✅ **usePermission()** - Checking user permissions
- ✅ **useRole()** - Checking user roles
- ✅ **&lt;Can&gt;** - Conditional rendering based on permissions
- ✅ **&lt;Cannot&gt;** - Inverse conditional rendering
- ✅ **&lt;ProtectedRoute&gt;** - Protecting routes with permission/role checks
- ✅ **React Router Integration** - Full routing with protection

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### 3. Build for Production

```bash
pnpm build
```

### 4. Preview Production Build

```bash
pnpm preview
```

## How It Works

### Roles & Permissions

The example includes three predefined roles:

- **Admin** - Full access (`user:*`, `post:*`, `settings:*`)
- **Editor** - Can read, write, and publish posts (`post:read`, `post:write`, `post:publish`)
- **Viewer** - Can only read posts (`post:read`)

### Try It Out

1. Use the role switcher at the top to switch between different user roles
2. Notice how the navigation, UI elements, and available pages change based on permissions
3. Try accessing protected routes as different roles

### Pages

- **Home** - Public page showing permission-based content
- **Posts** - Protected page requiring `post:read` permission
- **Admin** - Protected page requiring `admin` role

## Code Structure

```
src/
├── main.tsx          # App entry point
├── App.tsx           # Main app component with RBAC examples
└── index.css         # Basic styles
```

## Key Concepts

### 1. Setup RBAC Provider

```tsx
import { RBAC } from '@fire-shield/core';
import { RBACProvider } from '@fire-shield/react';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);

<RBACProvider rbac={rbac} user={currentUser}>
  <App />
</RBACProvider>
```

### 2. Use Hooks

```tsx
import { usePermission, useRole } from '@fire-shield/react';

const canWrite = usePermission('post:write');
const isAdmin = useRole('admin');
```

### 3. Conditional Rendering

```tsx
import { Can, Cannot } from '@fire-shield/react';

<Can permission="post:write">
  <CreateButton />
</Can>

<Cannot permission="post:write">
  <UpgradePrompt />
</Cannot>
```

### 4. Protected Routes

```tsx
import { ProtectedRoute } from '@fire-shield/react';

<Route
  path="/admin"
  element={
    <ProtectedRoute role="admin" redirectTo="/">
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

## Learn More

- [@fire-shield/react Documentation](https://npmjs.com/package/@fire-shield/react)
- [@fire-shield/core Documentation](https://npmjs.com/package/@fire-shield/core)
- [React Router Documentation](https://reactrouter.com)

## License

DIB © Fire Shield Team
