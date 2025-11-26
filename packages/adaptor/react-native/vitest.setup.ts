/**
 * Vitest setup for React Native tests
 * Enables React Native mock from __mocks__ directory
 */

import { vi } from 'vitest';

// Ensure TextEncoder/TextDecoder are available
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Enable manual mock for react-native from __mocks__/react-native.ts
vi.mock('react-native');
