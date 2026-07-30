// Era pack loader — the runtime entry point for content packs.
//
// Reads pack + events + endings + practices + schedules from the
// statically-bundled registry (./registry), merges the events array into the
// pack scaffold, validates the merged pack against EraPackSchema (the first
// enforcement layer), runs lintPack (the second, textual layer), then
// validates the endings, practices, and schedules standalone against their
// respective schemas and attaches them as sibling fields. EraPackSchema is
// strict and intentionally carries none of these as keys — each is a
// separate artifact (endings per plan todo 18; practices/schedules per the
// idle-mode todo).
//
// This is a PURE, SYNCHRONOUS loader: the registry is bundled at build time
// (Metro for web/native, Vite for vitest), so there is no disk read and no
// Promise. The life-start and turn screens call this directly inside
// `useMemo` without a loading state.
//
// Plan reference: todo 12 (original loader), T12+T13 integration (real content).

import { lintPack } from './lint';
import { MinigameDefSchema, type MinigameDef } from './minigame-schema';
import { getEraBundle, hasEraBundle, listEraIds } from './registry';
import {
  BuddhistFigureSchema,
  DailyScheduleSchema,
  EndingSchema,
  EraPackSchema,
  MantraSchema,
  PracticeSchema,
  SutraSchema,
  type BuddhistFigure,
  type Ending,
  type EraPack,
  type Mantra,
  type Practice,
  type Sutra,
  type DailySchedule,
} from './schema';

/**
 * The loaded era pack: the schema-validated {@link EraPack} (with the events
 * array from events.json5 merged in) plus the endings, practices, and
 * schedules arrays from their sibling files.
 *
 * `endings`, `practices`, and `schedules` are sibling fields rather than keys
 * on `EraPack` because the schema's strict object check rejects unknown keys;
 * they are validated standalone (the same pattern events used before this
 * loader merged them) and attached post-validation.
 */
export interface LoadedEraPack extends EraPack {
  /** The era's death/transition endings, validated against EndingSchema. */
  readonly endings: readonly Ending[];
  /** The era's idle-mode practices, validated against PracticeSchema. */
  readonly practices: readonly Practice[];
  /** The era's daily schedules, validated against DailyScheduleSchema. */
  readonly schedules: readonly DailySchedule[];
  /** The era's canonical sutras, validated against SutraSchema. */
  readonly sutras: readonly Sutra[];
  /** The era's recitative phrases, validated against MantraSchema. */
  readonly mantras: readonly Mantra[];
  /** The era's tradition-inspired figure refs, validated against BuddhistFigureSchema. */
  readonly figures: readonly BuddhistFigure[];
  /** The era's engagement minigames, validated against MinigameDefSchema. */
  readonly minigames: readonly MinigameDef[];
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

/** Pull the `practices` array out of a practices.json5 shape: `{ practices: [...] }`. */
function extractPracticesArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'practices' in raw &&
    Array.isArray((raw as { practices: unknown }).practices)
  ) {
    return (raw as { practices: unknown[] }).practices;
  }
  throw new Error(
    `loadEraPack("${eraId}"): ${filename} must be an object with a "practices" array`,
  );
}

/** Pull the `schedules` array out of a schedules.json5 shape: `{ schedules: [...] }`. */
function extractSchedulesArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'schedules' in raw &&
    Array.isArray((raw as { schedules: unknown }).schedules)
  ) {
    return (raw as { schedules: unknown[] }).schedules;
  }
  throw new Error(
    `loadEraPack("${eraId}"): ${filename} must be an object with a "schedules" array`,
  );
}

/** Pull the `sutras` array out of a sutras.json5 shape: `{ sutras: [...] }`. */
function extractSutrasArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'sutras' in raw &&
    Array.isArray((raw as { sutras: unknown }).sutras)
  ) {
    return (raw as { sutras: unknown[] }).sutras;
  }
  throw new Error(`loadEraPack("${eraId}"): ${filename} must be an object with a "sutras" array`);
}

/** Pull the `mantras` array out of a mantras.json5 shape: `{ mantras: [...] }`. */
function extractMantrasArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'mantras' in raw &&
    Array.isArray((raw as { mantras: unknown }).mantras)
  ) {
    return (raw as { mantras: unknown[] }).mantras;
  }
  throw new Error(`loadEraPack("${eraId}"): ${filename} must be an object with a "mantras" array`);
}

/** Pull the `figures` array out of a figures.json5 shape: `{ figures: [...] }`. */
function extractFiguresArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'figures' in raw &&
    Array.isArray((raw as { figures: unknown }).figures)
  ) {
    return (raw as { figures: unknown[] }).figures;
  }
  throw new Error(`loadEraPack("${eraId}"): ${filename} must be an object with a "figures" array`);
}

/** Pull the `minigames` array out of a minigames.json5 shape: `{ minigames: [...] }`. */
function extractMinigamesArray(raw: unknown, eraId: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'minigames' in raw &&
    Array.isArray((raw as { minigames: unknown }).minigames)
  ) {
    return (raw as { minigames: unknown[] }).minigames;
  }
  throw new Error(
    `loadEraPack("${eraId}"): ${filename} must be an object with a "minigames" array`,
  );
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

  // --- Practices validation (before lint so R-NO-PRACTICE-AS-CURRENCY can
  // scan the typed array alongside the pack) --------------------------------
  const practicesArray = extractPracticesArray(bundle.practices, eraId, 'practices.json5');
  const practicesResult = PracticeSchema.array().safeParse(practicesArray);
  if (!practicesResult.success) {
    const firstIssue = practicesResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): practices schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Minigames validation (before lint so reward-tier EffectOps can be
  // scanned for forbidden meter tokens alongside the pack) ------------------
  const minigamesArray = extractMinigamesArray(bundle.minigames, eraId, 'minigames.json5');
  const minigamesResult = MinigameDefSchema.array().safeParse(minigamesArray);
  if (!minigamesResult.success) {
    const firstIssue = minigamesResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): minigames schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Lint (second enforcement layer) -------------------------------------
  const lintReport = lintPack(parsedResult.data, practicesResult.data, {}, minigamesResult.data);
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

  // --- Schedules validation ------------------------------------------------
  const schedulesArray = extractSchedulesArray(bundle.schedules, eraId, 'schedules.json5');
  const schedulesResult = DailyScheduleSchema.array().safeParse(schedulesArray);
  if (!schedulesResult.success) {
    const firstIssue = schedulesResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): schedules schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Sutras validation ---------------------------------------------------
  const sutrasArray = extractSutrasArray(bundle.sutras, eraId, 'sutras.json5');
  const sutrasResult = SutraSchema.array().safeParse(sutrasArray);
  if (!sutrasResult.success) {
    const firstIssue = sutrasResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): sutras schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Mantras validation --------------------------------------------------
  const mantrasArray = extractMantrasArray(bundle.mantras, eraId, 'mantras.json5');
  const mantrasResult = MantraSchema.array().safeParse(mantrasArray);
  if (!mantrasResult.success) {
    const firstIssue = mantrasResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): mantras schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  // --- Figures validation --------------------------------------------------
  const figuresArray = extractFiguresArray(bundle.figures, eraId, 'figures.json5');
  const figuresResult = BuddhistFigureSchema.array().safeParse(figuresArray);
  if (!figuresResult.success) {
    const firstIssue = figuresResult.error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '(root)';
    throw new Error(
      `loadEraPack("${eraId}"): figures schema validation failed at "${fieldPath}": ${
        firstIssue?.message ?? 'unknown error'
      }`,
    );
  }

  return {
    ...parsedResult.data,
    endings: endingsResult.data,
    practices: practicesResult.data,
    schedules: schedulesResult.data,
    sutras: sutrasResult.data,
    mantras: mantrasResult.data,
    figures: figuresResult.data,
    minigames: minigamesResult.data,
  };
}
