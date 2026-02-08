# @fire-shield/expo

Expo adapter for Fire Shield RBAC - Optimized for Expo managed workflow with AsyncStorage persistence and SecureStore integration.

## Features

- 🔄 **All React Native Features** - Inherits all hooks and components from `@fire-shield/react-native`
- 💾 **Persistent User State** - Automatic user persistence with AsyncStorage
- 🔐 **Secure Config Storage** - Store sensitive RBAC config in Expo SecureStore
- 🐛 **Debug Mode** - Development-mode permission logging
- 📱 **Expo Optimized** - Works seamlessly with Expo managed workflow
- ⚡ **Lazy Loading** - Dynamic imports for Expo-specific modules

## Installation

```bash
npm install @fire-shield/expo
# or
yarn add @fire-shield/expo
# or
pnpm add @fire-shield/expo
```

## Peer Dependencies

Make sure you have these installed:

```bash
npx expo install @react-native-async-storage/async-storage expo-secure-store
```

## Quick Start

```tsx
import { RBAC } from '@fire-shield/core';
import { RBACProvider, usePersistedUser, Protected } from '@fire-shield/expo';

// Initialize RBAC
const rbac = new RBAC({
  roles: {
    viewer: { permissions: ['read'] },
    editor: { permissions: ['read', 'write'] },
  },
});

function App() {
  // Automatically load and persist user from AsyncStorage
  const [user, setUser] = usePersistedUser();

  return (
    <RBACProvider rbac={rbac} user={user}>
      <Protected permission="write">
        <EditButton />
      </Protected>
    </RBACProvider>
  );
}
```

## Expo-Specific Hooks

### usePersistedUser

Automatically persists user to AsyncStorage:

```tsx
import { usePersistedUser } from '@fire-shield/expo';

function LoginScreen() {
  const [user, setUser] = usePersistedUser();

  const handleLogin = async (credentials) => {
    const userData = await api.login(credentials);
    // Automatically saved to AsyncStorage
    await setUser({
      id: userData.id,
      roles: userData.roles,
    });
  };

  const handleLogout = async () => {
    // Automatically removed from AsyncStorage
    await setUser(undefined);
  };

  return (
    <View>
      {user ? (
        <Button title="Logout" onPress={handleLogout} />
      ) : (
        <LoginForm onSubmit={handleLogin} />
      )}
    </View>
  );
}
```

**Custom Storage Key:**

```tsx
const [user, setUser] = usePersistedUser('@myapp:current-user');
```

### useRBACDebug

Development-mode debugging for permission checks:

```tsx
import { useRBACDebug, usePermission } from '@fire-shield/expo';

function MyComponent() {
  const debug = useRBACDebug(true); // Only logs in __DEV__
  const canEdit = usePermission('write');

  debug.logPermissionCheck(user, 'write', canEdit);

  return <View>{canEdit && <EditButton />}</View>;
}
```

## SecureStore Integration

Store sensitive RBAC configuration in Expo SecureStore:

```tsx
import {
  loadRBACConfigFromSecureStore,
  saveRBACConfigToSecureStore,
} from '@fire-shield/expo';
import { RBAC } from '@fire-shield/core';

// Load config from SecureStore
async function initializeRBAC() {
  const config = await loadRBACConfigFromSecureStore();

  if (config) {
    return new RBAC(config);
  }

  // Fallback to default config
  const defaultConfig = {
    roles: {
      viewer: { permissions: ['read'] },
      editor: { permissions: ['read', 'write'] },
    },
  };

  // Save default config for next time
  await saveRBACConfigToSecureStore(defaultConfig);

  return new RBAC(defaultConfig);
}

// In your App component
function App() {
  const [rbac, setRbac] = useState<RBAC | null>(null);

  useEffect(() => {
    initializeRBAC().then(setRbac);
  }, []);

  if (!rbac) return <LoadingScreen />;

  return <RBACProvider rbac={rbac}>...</RBACProvider>;
}
```

**Custom SecureStore Key:**

```tsx
await saveRBACConfigToSecureStore(config, '@myapp:rbac-config');
const config = await loadRBACConfigFromSecureStore('@myapp:rbac-config');
```

## All React Native Features

Since `@fire-shield/expo` re-exports everything from `@fire-shield/react-native`, you get all these features:

### Hooks

- `useRBAC()` - Access RBAC instance and current user
- `usePermission(permission)` - Check single permission
- `useRole(role)` - Check if user has role
- `useAnyPermissions([...])` - Check any of multiple permissions
- `useAllPermissions([...])` - Check all of multiple permissions
- `useAnyRoles([...])` - Check any of multiple roles
- `useAllRoles([...])` - Check all of multiple roles

### Components

- `<Protected>` - Conditional rendering based on permissions/roles
- `<RBACProvider>` - Context provider for RBAC

```tsx
import { Protected, usePermission } from '@fire-shield/expo';

function MyScreen() {
  const canEdit = usePermission('write');

  return (
    <View>
      <Protected permission="read">
        <Text>Readable content</Text>
      </Protected>

      <Protected role="admin">
        <AdminPanel />
      </Protected>

      <Protected anyPermissions={['write', 'admin']}>
        <EditButton />
      </Protected>

      <Protected
        allPermissions={['read', 'write']}
        fallback={<Text>No access</Text>}
      >
        <Editor />
      </Protected>
    </View>
  );
}
```

## Complete Example

```tsx
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { RBAC } from '@fire-shield/core';
import {
  RBACProvider,
  usePersistedUser,
  usePermission,
  useRBACDebug,
  Protected,
  loadRBACConfigFromSecureStore,
  saveRBACConfigToSecureStore,
} from '@fire-shield/expo';

// Initialize RBAC
const rbac = new RBAC({
  roles: {
    guest: { permissions: [] },
    viewer: { permissions: ['content:read'] },
    editor: {
      permissions: ['content:read', 'content:write'],
      extends: ['viewer'],
    },
    admin: {
      permissions: ['content:read', 'content:write', 'user:manage'],
      extends: ['editor'],
    },
  },
});

function AppContent() {
  const [user, setUser] = usePersistedUser();
  const debug = useRBACDebug(__DEV__);
  const canRead = usePermission('content:read');
  const canWrite = usePermission('content:write');
  const canManageUsers = usePermission('user:manage');

  // Log permission checks in development
  useEffect(() => {
    debug.logPermissionCheck(user, 'content:read', canRead);
    debug.logPermissionCheck(user, 'content:write', canWrite);
    debug.logPermissionCheck(user, 'user:manage', canManageUsers);
  }, [user, canRead, canWrite, canManageUsers]);

  const handleLogin = async (role: string) => {
    await setUser({
      id: `user-${Date.now()}`,
      roles: [role],
    });
  };

  const handleLogout = async () => {
    await setUser(undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fire Shield Expo Demo</Text>

      {!user ? (
        <View style={styles.loginButtons}>
          <Button title="Login as Viewer" onPress={() => handleLogin('viewer')} />
          <Button title="Login as Editor" onPress={() => handleLogin('editor')} />
          <Button title="Login as Admin" onPress={() => handleLogin('admin')} />
        </View>
      ) : (
        <>
          <Text>User: {user.id}</Text>
          <Text>Roles: {user.roles.join(', ')}</Text>

          <Protected permission="content:read">
            <Text style={styles.content}>📖 You can read content</Text>
          </Protected>

          <Protected permission="content:write">
            <Text style={styles.content}>✏️ You can write content</Text>
          </Protected>

          <Protected permission="user:manage">
            <Text style={styles.content}>👥 You can manage users</Text>
          </Protected>

          <Button title="Logout" onPress={handleLogout} />
        </>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <RBACProvider rbac={rbac}>
      <AppContent />
    </RBACProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loginButtons: {
    gap: 10,
  },
  content: {
    fontSize: 16,
    marginVertical: 5,
  },
});
```

## API Reference

### Hooks

#### usePersistedUser(storageKey?)

Returns `[user, setUser]` with automatic AsyncStorage persistence.

```tsx
const [user, setUser] = usePersistedUser('@myapp:user');
```

#### useRBACDebug(enabled?)

Returns debug utilities for development.

```tsx
const debug = useRBACDebug(__DEV__);
debug.logPermissionCheck(user, 'permission', result);
```

### Utilities

#### loadRBACConfigFromSecureStore(key?)

Load RBAC config from Expo SecureStore.

```tsx
const config = await loadRBACConfigFromSecureStore('@myapp:config');
```

#### saveRBACConfigToSecureStore(config, key?)

Save RBAC config to Expo SecureStore.

```tsx
await saveRBACConfigToSecureStore(config, '@myapp:config');
```

## TypeScript

Full TypeScript support with all types from `@fire-shield/core` and `@fire-shield/react-native`:

```tsx
import type { RBACUser, RBACRole } from '@fire-shield/expo';

const user: RBACUser = {
  id: 'user1',
  roles: ['viewer', 'editor'],
};
```

## Best Practices

1. **Use SecureStore for Sensitive Config** - Store production RBAC configuration in SecureStore
2. **Enable Debug in Development** - Use `useRBACDebug(__DEV__)` to log permission checks
3. **Persist User State** - Use `usePersistedUser()` for seamless user experience across app restarts
4. **Lazy Loading** - Expo modules are dynamically imported to reduce initial bundle size
5. **Error Handling** - All storage operations handle errors gracefully with console warnings

## Performance

- Dynamic imports for AsyncStorage and SecureStore
- Memoized hook results
- No blocking on storage operations
- Optimized for React Native performance

## License

DIB

## Repository

[Fire Shield RBAC Monorepo](https://github.com/khapu2906/RBAC)
