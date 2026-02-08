# Expo Integration

Fire Shield provides enhanced Expo support with optimized features for managed workflow, including secure storage integration and development tools.

## Features

- All React Native features included
- Expo SecureStore integration for sensitive data
- AsyncStorage for user preferences
- Expo DevTools debugging support
- TypeScript support
- Works with Expo Go and EAS Build

## Installation

```bash
npx expo install @fire-shield/expo @fire-shield/core
```

## Quick Start

```tsx
import { RBACProvider, useRBAC, Can } from '@fire-shield/expo';
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);

export default function App() {
  const [user, setUser] = useState({ id: '1', roles: ['editor'] });

  return (
    <RBACProvider rbac={rbac} user={user}>
      <YourApp />
    </RBACProvider>
  );
}
```

## Expo-Specific Features

### 1. Persistent User Storage with AsyncStorage

Automatically persist user data across app restarts:

```tsx
import { usePersistedUser } from '@fire-shield/expo';

function App() {
  const [user, setUser] = usePersistedUser('@fire-shield:user');

  return (
    <RBACProvider rbac={rbac} user={user}>
      <YourApp />
    </RBACProvider>
  );
}
```

**How it works:**
- Automatically saves user to AsyncStorage when changed
- Loads user from storage on app start
- Handles JSON serialization/deserialization

### 2. Secure Token Storage with SecureStore

Store sensitive auth tokens securely:

```tsx
import { useSecureRBACToken } from '@fire-shield/expo';

function AuthScreen() {
  const [token, setToken] = useSecureRBACToken('@fire-shield:token');

  const handleLogin = async (credentials) => {
    const response = await loginAPI(credentials);
    // Store token securely in device keychain/keystore
    await setToken(response.token);

    // Set user in RBAC
    setUser(response.user);
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

**Security:**
- Uses iOS Keychain and Android Keystore
- Encrypted at rest
- Protected from unauthorized access
- Automatically deleted on app uninstall

### 3. Development Mode Debugging

Built-in debugging tools for Expo DevTools:

```tsx
import { useRBACDebug } from '@fire-shield/expo';

function DebugPanel() {
  useRBACDebug(__DEV__); // Only enable in development

  const { user } = useRBAC();

  return (
    <View>
      <Text>User: {user?.id}</Text>
      <Text>Roles: {user?.roles.join(', ')}</Text>
    </View>
  );
}
```

**Debug output:**
```
[Fire Shield] Permission Check:
  user: user-123
  roles: ['editor']
  permission: post:write
  result: true
```

## API

### usePersistedUser(storageKey?)

Hook for persisting user data with AsyncStorage.

**Parameters:**
- `storageKey` (optional): Storage key (default: `@fire-shield:user`)

**Returns:** `[user, setUser]`

**Example:**
```tsx
function App() {
  const [user, setUser] = usePersistedUser();

  return (
    <RBACProvider rbac={rbac} user={user}>
      <Navigation />
    </RBACProvider>
  );
}
```

### useSecureRBACToken(tokenKey?)

Hook for securely storing auth tokens in SecureStore.

**Parameters:**
- `tokenKey` (optional): Storage key (default: `@fire-shield:token`)

**Returns:** `[token, setToken]`

**Example:**
```tsx
function useAuth() {
  const [token, setToken] = useSecureRBACToken();
  const { setUser } = useRBAC();

  const login = async (credentials) => {
    const { token, user } = await loginAPI(credentials);
    await setToken(token);
    setUser(user);
  };

  const logout = async () => {
    await setToken(null); // Clear token
    setUser(undefined);
  };

  return { login, logout };
}
```

### useRBACDebug(enabled?)

Hook for enabling debug logging in development.

**Parameters:**
- `enabled` (optional): Enable debugging (default: `__DEV__`)

**Example:**
```tsx
function App() {
  useRBACDebug(__DEV__);

  return <YourApp />;
}
```

## Complete Authentication Example

```tsx
import { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { RBACProvider, useRBAC, usePersistedUser, useSecureRBACToken } from '@fire-shield/expo';
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();
rbac.createRole('admin', ['*']);
rbac.createRole('user', ['post:read', 'post:write']);

export default function App() {
  const [user, setUser] = usePersistedUser();

  return (
    <RBACProvider rbac={rbac} user={user}>
      <AuthScreen />
    </RBACProvider>
  );
}

function AuthScreen() {
  const { user, setUser } = useRBAC();
  const [token, setToken] = useSecureRBACToken();

  const handleLogin = async () => {
    // Call your API
    const response = await fetch('https://api.example.com/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });

    const data = await response.json();

    // Store token securely
    await setToken(data.token);

    // Set user (automatically persisted)
    setUser({
      id: data.user.id,
      roles: data.user.roles
    });
  };

  const handleLogout = async () => {
    await setToken(null);
    setUser(undefined);
  };

  if (!user) {
    return (
      <View>
        <Button title="Login" onPress={handleLogin} />
      </View>
    );
  }

  return (
    <View>
      <Text>Welcome, {user.id}!</Text>
      <Text>Roles: {user.roles.join(', ')}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
```

## EAS Build Configuration

Fire Shield Expo works seamlessly with EAS Build:

```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "RBAC_CACHE_ENABLED": "true"
      }
    },
    "development": {
      "developmentClient": true,
      "env": {
        "RBAC_DEBUG": "true"
      }
    }
  }
}
```

## Expo Go Compatibility

Fire Shield works with Expo Go out of the box:

- ✅ AsyncStorage (via `@react-native-async-storage/async-storage`)
- ✅ SecureStore (via `expo-secure-store`)
- ✅ No native modules required
- ✅ Works in Expo Go sandbox

## Best Practices

1. **Use SecureStore for tokens** - Never store auth tokens in AsyncStorage
2. **Persist user data** - Use `usePersistedUser` for seamless offline experience
3. **Enable debug mode in dev** - Use `useRBACDebug(__DEV__)` for troubleshooting
4. **Clear data on logout** - Always clear both token and user data
5. **Handle loading states** - Check if user is loaded before rendering

## Performance Tips

- Use v2.2.0 caching for faster permission checks
- Enable lazy role loading for large role sets
- Minimize re-renders with `useMemo` and `useCallback`

```tsx
import { useMemo } from 'react';

function PostList() {
  const { user, rbac } = useRBAC();

  const canCreatePost = useMemo(
    () => rbac.hasPermission(user, 'post:write'),
    [user, rbac]
  );

  return (
    <View>
      {canCreatePost && <CreatePostButton />}
      {/* ... */}
    </View>
  );
}
```

## TypeScript

Full TypeScript support:

```tsx
import type { RBACUser } from '@fire-shield/core';

interface AppUser extends RBACUser {
  email: string;
  name: string;
}

const [user, setUser] = usePersistedUser<AppUser>();
```

## Troubleshooting

### SecureStore not available
```
Error: SecureStore is not available on this platform
```

**Solution:** SecureStore only works on iOS and Android. For web, use AsyncStorage or localStorage.

### AsyncStorage quota exceeded
```
Error: AsyncStorage quota exceeded
```

**Solution:** Use pagination for large datasets, or clear old data periodically.

## Next Steps

- [React Native Integration](/frameworks/react-native) - Base React Native features
- [Core Concepts](/guide/permissions) - Understanding permissions
- [API Reference](/api/core) - Complete API documentation
