// Test-only React Native shim.
//
// Vitest cannot load the real `react-native` package: it ships Flow-annotated
// source, and vite's pipeline parses inlined CJS deps before any babel plugin
// can strip Flow. Rather than fight that (no working recipe exists for
// RN 0.86 + React 19 + vitest 4), this shim provides the surface area the
// components under test actually touch, against the real `test-renderer`.
//
// RNTL recognises host text elements by `typeof instance.type === 'string' &&
// type === 'Text'` (see @testing-library/react-native helpers/host-component-names),
// so components are exported as host-type strings cast to component types: at
// runtime `<Text>` becomes `createElement('Text', …)`, producing a host element
// RNTL's queries traverse. It is aliased to `react-native` in vitest.config only;
// production (Metro/expo) builds resolve the real package.

import type { ComponentType, ReactNode } from 'react';
import { createElement } from 'react';

export interface HostProps {
  readonly children?: ReactNode;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly accessibilityRole?: 'button' | 'text' | 'header' | 'none' | 'summary';
  readonly accessible?: boolean;
  readonly style?: Style;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly [key: string]: unknown;
}

export type Style = Record<string, unknown> | readonly Record<string, unknown>[] | undefined;

function host(name: string): ComponentType<HostProps> {
  // Cast a host-type string to a component type: JSX `<X>` compiles to
  // createElement('X', …), yielding a host element whose `type` is the string,
  // which is exactly what RNTL's host detectors look for.
  return name as unknown as ComponentType<HostProps>;
}

export const Text = host('Text');
export const View = host('View');
export const Pressable = host('Pressable');
export const TouchableOpacity = host('TouchableOpacity');
export const ScrollView = host('ScrollView');
export const SafeAreaView = host('SafeAreaView');
export const KeyboardAvoidingView = host('KeyboardAvoidingView');
export const Modal = host('Modal');

export const StyleSheet = {
  create<T extends Record<string, Style>>(styles: T): T {
    return styles;
  },
  flatten(style: Style | readonly Style[]): Record<string, unknown> {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.filter(Boolean));
    }
    return style ? { ...style } : {};
  },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};

export type PlatformSelectDict<T> = { ios?: T; android?: T; web?: T; native?: T; default?: T };

export const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web',
  select<T>(dict: PlatformSelectDict<T>): T {
    return (dict.ios ?? dict.default) as T;
  },
};

// AccessibilityInfo: tests control reduced-motion via vi.spyOn on
// `isReduceMotionEnabled`. Defaults to motion ENABLED (false).
export const AccessibilityInfo = {
  isReduceMotionEnabled(): Promise<boolean> {
    return Promise.resolve(false);
  },
  isScreenReaderEnabled(): Promise<boolean> {
    return Promise.resolve(false);
  },
  addEventListener(): { remove: () => void } {
    return { remove() {} };
  },
  removeEventListener(): void {},
  announceForAccessibility(): void {},
};

interface AnimatedValue {
  setValue(value: number): void;
}

class AnimatedValueImpl implements AnimatedValue {
  current: number;
  constructor(value: number) {
    this.current = value;
  }
  setValue(value: number): void {
    this.current = value;
  }
}

interface AnimationConfig {
  readonly toValue: number;
  readonly duration?: number;
  readonly useNativeDriver?: boolean;
}

interface AnimationHandle {
  start(callback?: (result: { finished: boolean }) => void): void;
  stop(): void;
}

function runImmediately(value: AnimatedValue, config: AnimationConfig): AnimationHandle {
  return {
    start(callback?: (result: { finished: boolean }) => void): void {
      value.setValue(config.toValue);
      callback?.({ finished: true });
    },
    stop() {},
  };
}

export const Animated = {
  Value: AnimatedValueImpl,
  View: host('View'),
  Text: host('Text'),
  timing: (value: AnimatedValue, config: AnimationConfig): AnimationHandle =>
    runImmediately(value, config),
  spring: (value: AnimatedValue, config: AnimationConfig): AnimationHandle =>
    runImmediately(value, config),
};

export const Easing = {
  out: () => (t: number) => t,
  in: () => (t: number) => t,
  inOut: () => (t: number) => t,
  bezier: () => (t: number) => t,
};

// Re-export createElement so consumers using React APIs keep working.
export { createElement };
