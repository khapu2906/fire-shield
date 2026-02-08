import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistedUser, useRBACDebug } from '../index';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

// Mock __DEV__
global.__DEV__ = true;

describe('Expo-specific Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePersistedUser', () => {
    it('should load user from AsyncStorage on mount', async () => {
      const storedUser = {
        id: 'user1',
        roles: ['viewer'],
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedUser));

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => {
        expect(result.current[0]).toEqual(storedUser);
      });

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@fire-shield:user');
    });

    it('should return undefined when no stored user', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => usePersistedUser());

      // Wait for initial load (even if undefined)
      await waitFor(() => {
        expect(mockAsyncStorage.getItem).toHaveBeenCalled();
      });

      expect(result.current[0]).toBeUndefined();
    });

    it('should persist user when setUser is called', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      const newUser = {
        id: 'user2',
        roles: ['editor'],
      };

      await act(async () => {
        await result.current[1](newUser);
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@fire-shield:user',
        JSON.stringify(newUser)
      );
      expect(result.current[0]).toEqual(newUser);
    });

    it('should remove from storage when user is set to undefined', async () => {
      const storedUser = {
        id: 'user1',
        roles: ['viewer'],
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedUser));
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      expect(result.current[0]).toEqual(storedUser);

      await act(async () => {
        await result.current[1](undefined);
      });

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@fire-shield:user');
      expect(result.current[0]).toBeUndefined();
    });

    it('should use custom storage key', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const customKey = '@myapp:current-user';
      const { result } = renderHook(() => usePersistedUser(customKey));

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(customKey);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      expect(result.current[0]).toBeUndefined();
      expect(consoleWarn).toHaveBeenCalledWith(
        'Failed to load user from storage:',
        expect.any(Error)
      );

      consoleWarn.mockRestore();
    });

    it('should handle setItem errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      const newUser = { id: 'user1', roles: ['viewer'] };

      await act(async () => {
        await result.current[1](newUser);
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        'Failed to persist user to storage:',
        expect.any(Error)
      );
      expect(result.current[0]).toEqual(newUser); // State still updates

      consoleWarn.mockRestore();
    });
  });

  describe('useRBACDebug', () => {
    it('should log permission checks when enabled', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useRBACDebug(true));

      const user = { id: 'user1', roles: ['editor'] };
      result.current.logPermissionCheck(user, 'user:write', true);

      expect(consoleLog).toHaveBeenCalledWith('[Fire Shield] Permission Check:', {
        user: 'user1',
        roles: ['editor'],
        permission: 'user:write',
        result: true,
      });

      consoleLog.mockRestore();
    });

    it('should not log when disabled', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      global.__DEV__ = false;

      const { result } = renderHook(() => useRBACDebug(false));

      const user = { id: 'user1', roles: ['editor'] };
      result.current.logPermissionCheck(user, 'user:write', true);

      expect(consoleLog).not.toHaveBeenCalled();

      consoleLog.mockRestore();
      global.__DEV__ = true;
    });

    it('should log on mount when enabled in dev mode', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderHook(() => useRBACDebug(true));

      expect(consoleLog).toHaveBeenCalledWith('[Fire Shield] RBAC Debug Mode Enabled');

      consoleLog.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should persist user across multiple renders', async () => {
      const user1 = { id: 'user1', roles: ['viewer'] };
      const user2 = { id: 'user2', roles: ['editor'] };

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersistedUser());

      await waitFor(() => { expect(mockAsyncStorage.getItem).toHaveBeenCalled(); });

      // Set first user
      await act(async () => {
        await result.current[1](user1);
      });

      expect(result.current[0]).toEqual(user1);

      // Update to second user
      await act(async () => {
        await result.current[1](user2);
      });

      expect(result.current[0]).toEqual(user2);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });
});
