// Era pack loader — the runtime entry point for content packs.
//
// Reads pack + events + endings from the statically-bundled registry
// (./registry), merges the events array into the pack scaffold, validates the
// merged pack against EraPackSchema (the first enforcement layer), runs
// lintPack (the second, textual layer), then validates the endings standalone
// against EndingSchema and attaches them as a sibling field. The schema is
// strict and intentionally has no `endings` key — endings are a separate
// artifact per plan todo 18.
//
// This is a PURE, SYNCHRONOUS loader: the registry is bundled at build time
// (Metro for web/native, Vite for vitest), so there is no disk read and no
// Promise. The life-start and turn screens call this directly inside
// `useMemo` without a loading state.
//
// Plan reference: todo 12 (original loader), T12+T13 integration (real content).

import { lintPack } from './lint';
import { getEraBundle, hasEraBundle, listEraIds } from './registry';
import { EndingSchema, EraPackSchema, type Ending, type EraPack } from './schema';

/**
 * The loaded era pack: the schema-validated {@link EraPack} (with the events
 * array from events.json5 merged in) plus the endings array from endings.json5.
 *
 * `endings` is a sibling field rather than a key on `EraPack` because the
 * schema's strict object check rejects unknown keys; endings are validated
 * standalone (the same pattern events used before this loader merged them).
 */
export interface LoadedEraPack extends EraPack {
  /** The era's death/transition endings, validated against EndingSchema. */
  readonly endings: readonly Ending[];
}

/**
 * The era-id segment of a pack path. Lowercase ASCII slug, optionally
 * hyphenated; matches the `slug` half of a {@link ContentPackIdSchema}. We
 * reject `..`, absolute paths, separators, and any character outside the
 * slug charset so a malicious id cannot reach outside the registry.
 */
const ERA_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Pull the `events` array out of an events.json5 shape.
 *
 * The authored files use `{ events: [...] }` (a top-level object wrapper). We
 * also accept a bare top-level array defensively, matching the extractor in
 * the standalone events test, but the shipped packs use the wrapper shape.
 */
function extractEventsArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'events' in raw &&
    Array.isArray((raw as { events: unknown }).events)
  ) {
    return (raw as { events: unknown[] }).events;
  }
  throw new Error(
    `loadEraPack("${eraId}"): ${filename} must be a top-level array or an object with an "events" array`,
  );
}

/** Pull the `endings` array out of a endings.json5 shape: `{ endings: [...] }`. */
function extractEndingsArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'endings' in raw &&
    Array.isArray((raw as { endings: unknown }).endings)
  ) {
    return (raw as { endings: unknown[] }).endings;
  }
  throw new Error(`loadEraPack("${eraId}"): ${filename} must be an object with an "endings" array`);
}

/**
 * Load, merge, schema-validate, and lint an era pack by id.
 *
 * Synchronous: the registry is bundled at build time, so there is no disk I/O
 * and no Promise to await. Callers that previously did `await loadEraPack(id)`
 * continue to work — `await` on a non-Promise value is a no-op.
 *
 * @param eraId The era directory name under `src/content/packs/` (e.g.
 *   `'tang-china'`).
 * @returns The fully validated + linted pack, with events merged in and
 *   endings attached as a sibling field.
 * @throws {Error} on registry miss, schema, lint, or endings-validation
 *   failure — the message always names the offending field or rule.
 */
export function loadEraPack(eraId: string): LoadedEraPack {
  if (!ERA_ID_PATTERN.test(eraId)) {
    throw new Error(
      `loadEraPack("${eraId}"): eraId must match ${ERA_ID_PATTERN} (lowercase ASCII slug)`,
    );
  }
  if (!hasEraBundle(eraId)) {
    throw new Error(
      `loadEraPack("${eraId}"): era is not in the registry (known: ${listEraIds().join(', ') || 'none'})`,
    );
  }

  const bundle = getEraBundle(eraId);

  // --- Merge events into the pack scaffold ---------------------------------
  // pack.json5 intentionally ships WITHOUT an events field (the schema's
  // `.optional().default([])` makes omission valid). The real events live in
  // the sibling events.json5; we merge them here so EraPackSchema sees the
  // full event graph and enforces the 6..10 min/max.
  const eventsArray = extractEventsArray(bundle.events, eraId, 'events.json5');
  const packScaffold =
    bundle.pack !== null && typeof bundle.pack === 'object'
      ? (bundle.pack as Record<string, unknown>)
      : {};
  const merged = { ...packScaffold, events: eventsArray };

  // --- Schema validation (first enforcement layer) -------------------------
  const parsedResult = EraPackSchema.safeParse(merged);
  if (!parsedResult.success) {
    const firstIssue = parsedResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): schema validation failed at field "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Lint (second enforcement layer) -------------------------------------
  const lintReport = lintPack(parsedResult.data);
  if (!lintReport.passed) {
    const first = lintReport.violations[0];
    throw new Error(
      `loadEraPack("${eraId}"): lint rejected pack (rule ${first?.rule ?? 'unknown'}): ${
        first?.message ?? 'unknown violation'
      }`,
    );
  }

  // --- Endings validation --------------------------------------------------
  // EraPackSchema is strict and has no `endings` key by design (plan todo 4:
  // endings are a standalone artifact). We validate them standalone here and
  // attach them post-validation so the loader's return value is a complete
  // era bundle.
  const endingsArray = extractEndingsArray(bundle.endings, eraId, 'endings.json5');
  const endingsResult = EndingSchema.array().safeParse(endingsArray);
  if (!endingsResult.success) {
    const firstIssue = endingsResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): endings schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  return { ...parsedResult.data, endings: endingsResult.data };
}
