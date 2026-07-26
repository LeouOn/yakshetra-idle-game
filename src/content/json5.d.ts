// TypeScript ambient declaration for static .json5 imports.
//
// At runtime the bundler (Metro for web/native via scripts/json5-transformer.js,
// Vite for vitest via the plugin in vitest.config.ts) parses the .json5 source
// into a JS object. TypeScript needs this ambient declaration to accept
// `import x from './file.json5'` without a type error.
//
// The parsed shape varies per file; callers narrow it at the use site
// (e.g. the loader validates via EraPackSchema / EventSchema / EndingSchema).

declare module '*.json5' {
  const value: unknown;
  export default value;
}
