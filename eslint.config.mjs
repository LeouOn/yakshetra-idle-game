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
      'pnpm-lock.yaml',
      'expo-env.d.ts',
    ],
  },
];
