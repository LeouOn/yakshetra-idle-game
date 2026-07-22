import { vi } from 'vitest';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// Enable React's act() support in this test environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React Native ships Flow-annotated source (`import typeof …`) that vitest's
// pipeline cannot parse, and `@testing-library/react-native` pulls the same
// source via its internal `require("react-native")`. A resolve alias cannot
// reliably intercept that require, so the module is mocked at the loader level:
// `vi.mock` applies to EVERY importer (our components and any library code),
// routing all `react-native` imports to the test shim.
vi.mock('react-native', async () => {
  const shim = await import('./react-native-shim');
  return { ...shim };
});
