import JSON5 from 'json5';

/**
 * Vite plugin: parse .json5 files into ES modules so
 * `import x from './f.json5'` yields the parsed object.
 *
 * Mirrors the Metro transformer at scripts/json5-transformer.js so the same
 * registry imports work under both bundlers.
 *
 * Extracted from vitest.config.ts so the main config and the report-generator
 * config (scripts/report.vitest.config.ts) cannot drift: a second hand-copied
 * copy of this plugin is how a generator ends up failing to parse the content
 * packs it is trying to read.
 */
export const json5Plugin = () => ({
  name: 'yakshetra-json5',
  transform(code: string, id: string): { code: string; map: null } | null {
    if (!id.endsWith('.json5')) {
      return null;
    }
    const parsed = JSON5.parse(code);
    return { code: `export default ${JSON.stringify(parsed)};`, map: null };
  },
});
