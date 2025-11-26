/**
 * Manual mock for react-native module
 * This allows tests to run without actual React Native implementation
 */

import * as React from 'react';

// Simple mock components that render as divs with children
export const Text = ({ children, ...props }: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'text' }, children);
};

export const View = ({ children, ...props }: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'view' }, children);
};

export const TouchableOpacity = ({ children, ...props }: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'touchable' }, children);
};

export const TouchableHighlight = ({ children, ...props }: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'touchable' }, children);
};

export const ScrollView = ({ children, ...props }: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'scroll-view' }, children);
};

export const ActivityIndicator = (props: any) => {
  return React.createElement('div', { ...props, 'data-testid': 'activity-indicator' });
};

export const Platform = {
  OS: 'ios' as const,
  Version: '14.0',
  select: (obj: any) => obj.ios || obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => style,
};
