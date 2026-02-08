# React Native Integration

Fire Shield provides React Native hooks and components for mobile RBAC authorization, compatible with both Expo and bare React Native projects.

## Features

- React hooks for permission checks (`useRBAC`, `usePermission`, `useRole`)
- Component-based authorization (`<Can>`, `<Cannot>`)
- Async Storage integration for persistence
- TypeScript support
- Works with Expo and bare React Native
- Zero native dependencies

## Installation

```bash
npm install @fire-shield/react-native @fire-shield/core react react-native
```

## Quick Start

```tsx
import { RBACProvider, useRBAC, Can } from '@fire-shield/react-native';
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);

// Wrap your app with RBACProvider
export default function App() {
  const [user, setUser] = useState({ id: '1', roles: ['editor'] });

  return (
    <RBACProvider rbac={rbac} user={user}>
      <YourApp />
    </RBACProvider>
  );
}

// Use hooks in components
function PostEditor() {
  const { can, hasRole } = useRBAC();

  return (
    <View>
      {/* Component-based check */}
      <Can permission="post:write">
        <Button title="Create Post" onPress={createPost} />
      </Can>

      {/* Hook-based check */}
      {can('post:delete') && (
        <Button title="Delete Post" onPress={deletePost} />
      )}

      {/* Role check */}
      {hasRole('admin') && (
        <Button title="Admin Panel" onPress={openAdmin} />
      )}
    </View>
  );
}
```

## API

### RBACProvider

Provider component that makes RBAC available to all child components.

**Props:**
```typescript
interface RBACProviderProps {
  rbac: RBAC;
  user?: RBACUser;
  children: React.ReactNode;
}
```

**Example:**
```tsx
<RBACProvider rbac={rbac} user={currentUser}>
  <App />
</RBACProvider>
```

### useRBAC()

Main hook for accessing RBAC functionality.

**Returns:**
```typescript
{
  rbac: RBAC;
  user?: RBACUser;
  setUser: (user: RBACUser | undefined) => void;
  can: (permission: string) => boolean;
  cannot: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}
```

**Example:**
```tsx
function MyComponent() {
  const { can, hasRole, user, setUser } = useRBAC();

  const handleLogin = (userData) => {
    setUser({ id: userData.id, roles: userData.roles });
  };

  return (
    <View>
      {can('post:write') && <CreatePostButton />}
      {hasRole('admin') && <AdminPanel />}
    </View>
  );
}
```

### usePermission(permission)

Hook for checking a specific permission (returns boolean).

**Example:**
```tsx
function DeleteButton({ postId }) {
  const canDelete = usePermission('post:delete');

  if (!canDelete) return null;

  return <Button title="Delete" onPress={() => deletePost(postId)} />;
}
```

### useRole(role)

Hook for checking a specific role (returns boolean).

**Example:**
```tsx
function AdminBadge() {
  const isAdmin = useRole('admin');

  if (!isAdmin) return null;

  return <Text style={styles.badge}>Admin</Text>;
}
```

## Components

### \<Can\>

Conditionally render children if user has permission.

**Props:**
```typescript
interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

**Example:**
```tsx
<Can permission="post:write" fallback={<Text>No access</Text>}>
  <Button title="Create Post" onPress={createPost} />
</Can>
```

### \<Cannot\>

Conditionally render children if user DOES NOT have permission.

**Props:**
```typescript
interface CannotProps {
  permission: string;
  children: React.ReactNode;
}
```

**Example:**
```tsx
<Cannot permission="post:delete">
  <Text>You cannot delete posts</Text>
</Cannot>
```

## Persistence with AsyncStorage

Fire Shield React Native can persist user data to AsyncStorage:

```tsx
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRBAC } from '@fire-shield/react-native';

function App() {
  const { user, setUser } = useRBAC();

  // Load user from storage on mount
  useEffect(() => {
    AsyncStorage.getItem('user').then((data) => {
      if (data) {
        setUser(JSON.parse(data));
      }
    });
  }, []);

  // Save user to storage when it changes
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
      AsyncStorage.removeItem('user');
    }
  }, [user]);

  return <YourApp />;
}
```

## Platform-Specific Features

### iOS & Android

Works seamlessly on both platforms with no platform-specific code needed.

### Web (React Native Web)

Also compatible with React Native Web for cross-platform development.

## Best Practices

1. **Initialize RBAC once** - Create RBAC instance outside component tree
2. **Use hooks for dynamic checks** - Better performance than re-rendering
3. **Persist user data** - Use AsyncStorage for offline support
4. **Handle loading states** - Check if user is loaded before rendering protected content

## Examples

### Protected Screen Navigation

```tsx
import { useRBAC } from '@fire-shield/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { hasRole } = useRBAC();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        {hasRole('admin') && (
          <Stack.Screen name="Admin" component={AdminScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Conditional UI Elements

```tsx
function PostCard({ post }) {
  const { can } = useRBAC();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{post.title}</Text>
      <Text>{post.content}</Text>

      <View style={styles.actions}>
        {can('post:write') && (
          <Button title="Edit" onPress={() => editPost(post.id)} />
        )}
        {can('post:delete') && (
          <Button title="Delete" onPress={() => deletePost(post.id)} />
        )}
      </View>
    </View>
  );
}
```

### Login/Logout

```tsx
function AuthButtons() {
  const { user, setUser } = useRBAC();

  const handleLogin = async () => {
    const userData = await loginAPI();
    setUser({
      id: userData.id,
      roles: userData.roles,
      permissions: userData.permissions
    });
  };

  const handleLogout = () => {
    setUser(undefined);
  };

  return (
    <View>
      {user ? (
        <Button title="Logout" onPress={handleLogout} />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
}
```

## TypeScript

Full TypeScript support with type inference:

```tsx
import type { RBACUser } from '@fire-shield/core';

interface AppUser extends RBACUser {
  name: string;
  email: string;
}

function UserProfile() {
  const { user } = useRBAC<AppUser>();

  return (
    <View>
      <Text>{user?.name}</Text>
      <Text>{user?.email}</Text>
    </View>
  );
}
```

## Next Steps

- [Expo Integration](/frameworks/expo) - Enhanced features for Expo projects
- [Core Concepts](/guide/permissions) - Understanding permissions and roles
- [API Reference](/api/core) - Complete API documentation
