// ESLint flat config. Uses eslint-config-expo's flat preset.
import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      '.expo-shared/**',
      'coverage/**',
      'eas-build/**',
      '.omo/**',
      // Agent tooling materializes these into the working copy. They are not
      // project source, and linting them fails on CommonJS `__dirname` under
      // the browser/node globals that eslint-config-expo sets.
      '.claude/**',
      '.openrig/**',
      '.superpowers/**',
      'pnpm-lock.yaml',
      'expo-env.d.ts',
    ],
  },
];
