// Era pack loader — the runtime entry point for content packs.
//
// Reads `src/content/packs/<eraId>/pack.json5` from disk, parses with JSON5
// (packs are author-friendly JSONC), validates against {@link EraPackSchema}
// (the first enforcement layer), then runs {@link lintPack} (the second,
// textual layer). On any failure the loader throws with the offending field
// name so the call site can surface a precise error rather than a blank
// screen.
//
// This is a Node-targeted utility (it uses `node:fs`). The life-start screen
// treats any load failure — including ENOENT when packs do not exist yet, or
// an unsupported platform — as "no eras available" and renders the advisory
// fallback. When Wave 4 ships authored packs, this loader is what validates
// them.
//
// Plan reference: todo 12.

import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import JSON5 from 'json5';

import { lintPack } from './lint';
import { EraPackSchema, type EraPack } from './schema';

const PACKS_ROOT = resolve(process.cwd(), 'src', 'content', 'packs');

/**
 * The era-id segment of a pack path. Lowercase ASCII slug, optionally
 * hyphenated; matches the `slug` half of a {@link ContentPackIdSchema}. We
 * reject `..`, absolute paths, separators, and any character outside the
 * slug charset so the resolved file path is guaranteed to live under
 * {@link PACKS_ROOT}.
 */
const ERA_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Load, parse, schema-validate, and lint an era pack by id.
 *
 * @param eraId The era directory name under `src/content/packs/` (e.g.
 *   `'tang-china'`). The pack file is `<eraId>/pack.json5`.
 * @returns The fully validated + linted pack.
 * @throws {Error} on read, JSON5 parse, schema, or lint failure — the message
 *   always names the offending field or rule.
 */
export async function loadEraPack(eraId: string): Promise<EraPack> {
  if (!ERA_ID_PATTERN.test(eraId)) {
    throw new Error(
      `loadEraPack("${eraId}"): eraId must match ${ERA_ID_PATTERN} (lowercase ASCII slug)`,
    );
  }
  const path = resolve(PACKS_ROOT, eraId, 'pack.json5');
  const insideRoot = relative(PACKS_ROOT, path)
    .split(/[\\/]+/)
    .join('/');
  if (insideRoot.startsWith('../') || insideRoot.startsWith('/') || insideRoot === '..') {
    throw new Error(`loadEraPack("${eraId}"): resolved path escapes PACKS_ROOT`);
  }

  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(
      `loadEraPack("${eraId}"): could not read pack file: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON5.parse(raw);
  } catch (err) {
    throw new Error(
      `loadEraPack("${eraId}"): invalid JSON5 in pack file: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const parsedResult = EraPackSchema.safeParse(parsed);
  if (!parsedResult.success) {
    const firstIssue = parsedResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): schema validation failed at field "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  const lintReport = lintPack(parsedResult.data);
  if (!lintReport.passed) {
    const first = lintReport.violations[0];
    throw new Error(
      `loadEraPack("${eraId}"): lint rejected pack (rule ${first?.rule ?? 'unknown'}): ${
        first?.message ?? 'unknown violation'
      }`,
    );
  }

  return parsedResult.data;
}
