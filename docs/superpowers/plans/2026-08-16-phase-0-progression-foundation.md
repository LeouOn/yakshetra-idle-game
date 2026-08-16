# Phase 0 — Progression Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the data foundation for the six-tier chain — progression content domain (schemas + JSON5 + loader + lint), a registry-driven kind compile, `manifest/v1` with `scale`, and `studio_session/v1` with benches/tiers — with zero UI changes and person-tier behavior byte-identical to today.

**Architecture:** Kinds become ordered data rules evaluated first-match-wins against a residue summary (SPEC §6 rules ship as the engine's default registry). Manifest gains one additive field (`scale`) plus a v0→v1 migration; the studio session restructures into `benches` + shared `archive` + `tiers` with a v0→v1 migration that wraps today's bay as the person bench. All new progression content lives in `src/content/progression/` as Zod + JSON5, mirroring the era-pack pattern.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`), Zod v3, JSON5 (bundled via existing transformer), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-16-tiered-progression-design.md` (Phase 0 section).

## Global Constraints

- `src/engine/` purity: no `react`, `react-native`, `expo`, `Date.now`, `new Date`, `Math.random`, `fetch`, `process.env`, `console`. Only `zod` as a dependency.
- No `as any`, no `@ts-ignore` / `@ts-expect-error`, no empty `catch`. Optional props are omitted, never assigned `undefined`, unless the declared type is `T | undefined`.
- Interfaces that receive Zod-parsed optional fields declare them as `field?: T | undefined` (Zod `.optional()` infers `T | undefined`).
- No new import cycles. Direction rules: `kind-registry.ts` imports only from `residue.ts`; `manifest.ts` may import `kind-registry.ts` (never the reverse); nothing in `src/engine/` imports `src/content/progression/`; `src/content/progression/` may import engine types.
- Engine files stay ≤ ~250 lines. Split past that.
- Table fallback is loud: a kind with no table catalog throws; it is never silently skipped.
- Commit voice: imperative, specific (repo style: `feat(engine): ...` / `feat(content): ...`).
- Gate after every task: `pnpm exec vitest run <task test files>` green. Gate at plan end: `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test` all green.

## File Structure

| File                                   | Action        | Responsibility                                                                                               |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/engine/kind-registry.ts`          | Create        | `KindMatch`/`KindRule` types, `DEFAULT_KIND_RULES`, `pickKindFromRegistry`, social/spatial window helpers    |
| `src/engine/manifest.ts`               | Modify        | v1 schema (`scale`, `kind: string`), delegates kind pick to registry                                         |
| `src/engine/manifest-migration.ts`     | Create        | v0 schema, `migrateManifestV0`, `parseManifest` (v1-or-migrate)                                              |
| `src/engine/manifest-catalog.ts`       | Modify        | `CATALOG` type widened to `Record<string, ...>`                                                              |
| `src/engine/focus.ts`                  | Modify        | `isPinnableKind(kind: string)`                                                                               |
| `src/engine/fill-adapter.ts`           | Modify        | compile request carries `scale`; `fillManifestSafe` parses via `parseManifest`                               |
| `src/engine/tier-state.ts`             | Create        | `tier_state/v0` + `roster/v0` Zod schemas and factory                                                        |
| `src/engine/studio-session-v0.ts`      | Create        | v0 session schema + `migrateStudioSessionV0`; owns the shared leaf schemas                                   |
| `src/engine/studio-session.ts`         | Modify        | v1 session schema, snapshot/hydrate over benches+archive, parse dispatch                                     |
| `src/engine/index.ts`                  | Modify        | Barrel exports for all new modules                                                                           |
| `src/content/progression/schema.ts`    | Create        | `tier/v0`, `kind/v0`, `milestone/v0`, `policy/v0`, `endowment/v0`, `visitor/v0`, `compendium/v0` Zod schemas |
| `src/content/progression/registry.ts`  | Create        | Static JSON5 bundle imports                                                                                  |
| `src/content/progression/loader.ts`    | Create        | `loadProgression()` → validated registries + engine `KindRule[]`                                             |
| `src/content/progression/lint.ts`      | Create        | Referential integrity + meter-token scan                                                                     |
| `src/content/progression/base/*.json5` | Create        | Shipped data: 6 tiers, 8 core kind rows, 5 milestones, 4 empty files                                         |
| `src/content/lint.ts`                  | Modify        | Export `walkStrings` + `containsMeterToken`                                                                  |
| Test files                             | Create/Modify | Per task                                                                                                     |

---

### Task 1: Engine kind registry

**Files:**

- Create: `src/engine/kind-registry.ts`
- Modify: `src/engine/manifest.ts` (remove private `pickKind`/`isSocialWindow`/`isSpatialWindow`/`KIND_FROM_TYPE`; use the registry)
- Test: `src/engine/__tests__/kind-registry.test.ts`

**Interfaces:**

- Consumes: `ResidueSummary`, `ResidueEventType` from `./residue`.
- Produces:
  - `type CoreManifestKind = 'thing' | 'outcome' | 'change' | 'person' | 'place'`
  - `interface KindMatch { readonly dominant?: ResidueEventType | undefined; readonly no_dominant?: boolean | undefined; readonly dominant_in?: readonly ResidueEventType[] | undefined; readonly social?: boolean | undefined; readonly spatial?: boolean | undefined; }`
  - `interface KindRule { readonly kind: string; readonly match: KindMatch; }`
  - `isSocialWindow(summary: ResidueSummary): boolean`
  - `isSpatialWindow(summary: ResidueSummary): boolean`
  - `pickKindFromRegistry<K extends string>(summary: ResidueSummary, rules: readonly { readonly kind: K; readonly match: KindMatch }[]): K`
  - `const DEFAULT_KIND_RULES: readonly { readonly kind: CoreManifestKind; readonly match: KindMatch }[]`

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/kind-registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES, pickKindFromRegistry, type KindRule } from '@/engine/kind-registry';
import { summarizeResidue, type ResidueEvent, type ResidueEventType } from '@/engine/residue';

function event(tick: number, type: ResidueEventType, ids: readonly string[]): ResidueEvent {
  return { tick, type, ids, numbers: {} };
}

function kindOf(events: readonly ResidueEvent[], rules = DEFAULT_KIND_RULES): string {
  return pickKindFromRegistry(summarizeResidue(events), rules);
}

describe('DEFAULT_KIND_RULES reproduce the SPEC §6 pick rules', () => {
  it('level-up windows harvest change', () => {
    expect(kindOf([event(1, 'practice_level', ['p:zazen'])])).toBe('change');
  });

  it('resolved-event windows harvest outcome', () => {
    expect(kindOf([event(1, 'event_resolved', ['ev:fire'])])).toBe('outcome');
  });

  it('social windows harvest person', () => {
    const window = [
      event(1, 'practice_tick', ['p:tea']),
      event(2, 'lens_chosen', ['lens:beings']),
      event(3, 'practice_tick', ['p:tea', 'being:guest']),
    ];
    expect(kindOf(window)).toBe('person');
  });

  it('spatial windows harvest place', () => {
    const window = [
      event(1, 'practice_tick', ['p:zazen']),
      event(2, 'practice_tick', ['p:walking']),
    ];
    expect(kindOf(window)).toBe('place');
  });

  it('empty windows harvest thing', () => {
    expect(kindOf([])).toBe('thing');
  });

  it('practice_tick-dominant windows harvest thing', () => {
    expect(kindOf([event(1, 'practice_tick', ['p:zazen'])])).toBe('thing');
  });

  it('resource_edge-dominant windows harvest outcome', () => {
    expect(kindOf([event(1, 'resource_edge', ['res:grain'])])).toBe('outcome');
  });

  it('life_ended-dominant windows harvest change', () => {
    expect(kindOf([event(1, 'life_ended', ['life:one'])])).toBe('change');
  });

  it('level-up beats social (rule order is load-bearing)', () => {
    const window = [
      event(1, 'practice_level', ['p:zazen']),
      event(2, 'lens_chosen', ['lens:beings']),
      event(3, 'practice_tick', ['p:zazen', 'being:guest']),
    ];
    expect(kindOf(window)).toBe('change');
  });
});

describe('pickKindFromRegistry', () => {
  it('throws when no rule matches', () => {
    const empty: readonly KindRule[] = [];
    expect(() => pickKindFromRegistry(summarizeResidue([]), empty)).toThrow('no rule matched');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/engine/__tests__/kind-registry.test.ts`
Expected: FAIL — `@/engine/kind-registry` does not exist.

- [ ] **Step 3: Create the registry module**

Create `src/engine/kind-registry.ts`:

```ts
// Kind registry — how a residue window claims a Manifest kind.
//
// Kind is DATA, not a closed union: the compile step reads an ordered list of
// rules and the first row whose match clauses all hold wins. The engine ships
// DEFAULT_KIND_RULES, which reproduce the SPEC §6 pick rules exactly; content
// (src/content/progression) may pass a longer list with higher-scale kinds.
// Pure: no Date, no Math.random, no platform APIs.

import type { ResidueEventType, ResidueSummary } from './residue';

/** The five SPEC §6 core kinds. New kinds arrive via registry rows. */
export type CoreManifestKind = 'thing' | 'outcome' | 'change' | 'person' | 'place';

/**
 * Residue-pattern clauses. Every specified clause must hold. Fields are
 * `T | undefined` because registry rows are Zod-parsed content.
 */
export interface KindMatch {
  readonly dominant?: ResidueEventType | undefined;
  readonly no_dominant?: boolean | undefined;
  readonly dominant_in?: readonly ResidueEventType[] | undefined;
  readonly social?: boolean | undefined;
  readonly spatial?: boolean | undefined;
}

/** An ordered registry row: when `match` holds, the window claims `kind`. */
export interface KindRule {
  readonly kind: string;
  readonly match: KindMatch;
}

/** "Social" = ≥2 distinct ids + an engagement marker (SPEC §6). */
export function isSocialWindow(summary: ResidueSummary): boolean {
  return (
    summary.ids.length >= 2 &&
    (summary.typeCounts.lens_chosen > 0 || summary.typeCounts.event_resolved > 0)
  );
}

/** Two or more practices, no social marker — a setting, not a someone. */
export function isSpatialWindow(summary: ResidueSummary): boolean {
  return (
    summary.ids.length >= 2 && summary.typeCounts.practice_tick >= 2 && !isSocialWindow(summary)
  );
}

function matchHolds(match: KindMatch, summary: ResidueSummary): boolean {
  if (match.dominant !== undefined && summary.dominantType !== match.dominant) {
    return false;
  }
  if (match.no_dominant === true && summary.dominantType !== null) {
    return false;
  }
  if (
    match.dominant_in !== undefined &&
    (summary.dominantType === null || !match.dominant_in.includes(summary.dominantType))
  ) {
    return false;
  }
  if (match.social === true && !isSocialWindow(summary)) {
    return false;
  }
  if (match.spatial === true && !isSpatialWindow(summary)) {
    return false;
  }
  return true;
}

/**
 * First-match-wins kind pick. Throws when no rule matches: a registry that
 * cannot classify a window is a content bug, not a runtime condition.
 */
export function pickKindFromRegistry<K extends string>(
  summary: ResidueSummary,
  rules: readonly { readonly kind: K; readonly match: KindMatch }[],
): K {
  for (const rule of rules) {
    if (matchHolds(rule.match, summary)) {
      return rule.kind;
    }
  }
  throw new Error('pickKindFromRegistry: no rule matched the residue summary');
}

/**
 * The SPEC §6 pick rules as data. Order is load-bearing:
 * level-up -> change, resolved-event -> outcome, social -> person,
 * spatial -> place, empty -> thing, then the dominant-type tail.
 */
export const DEFAULT_KIND_RULES: readonly {
  readonly kind: CoreManifestKind;
  readonly match: KindMatch;
}[] = [
  { kind: 'change', match: { dominant: 'practice_level' } },
  { kind: 'outcome', match: { dominant: 'event_resolved' } },
  { kind: 'person', match: { social: true } },
  { kind: 'place', match: { spatial: true } },
  { kind: 'thing', match: { no_dominant: true } },
  { kind: 'change', match: { dominant_in: ['life_ended'] } },
  { kind: 'outcome', match: { dominant_in: ['resource_edge'] } },
  { kind: 'thing', match: { dominant_in: ['practice_tick', 'lens_chosen'] } },
];
```

- [ ] **Step 4: Rewire manifest.ts to the registry**

In `src/engine/manifest.ts`:

1. Add to the imports:

```ts
import { DEFAULT_KIND_RULES, pickKindFromRegistry, type CoreManifestKind } from './kind-registry';
```

2. Replace the line `export type ManifestKind = 'thing' | 'outcome' | 'change' | 'person' | 'place';` with:

```ts
export type ManifestKind = CoreManifestKind;
```

3. Delete the `KIND_FROM_TYPE` constant, the `isSocialWindow` function, the `isSpatialWindow` function, and the `pickKind` function (lines 82–126 of the current file).

4. In `tableFillManifest`, replace `const kind = pickKind(summary);` with:

```ts
const kind = pickKindFromRegistry(summary, DEFAULT_KIND_RULES);
```

- [ ] **Step 5: Run the tests**

Run: `pnpm exec vitest run src/engine/__tests__/kind-registry.test.ts src/engine/__tests__/manifest.test.ts`
Expected: PASS (all). The existing manifest tests confirm the rewired pick is behavior-identical.

- [ ] **Step 6: Commit**

```bash
git add src/engine/kind-registry.ts src/engine/manifest.ts src/engine/__tests__/kind-registry.test.ts
git commit -m "feat(engine): drive the kind pick from an ordered registry"
```

---

### Task 2: manifest/v1 — scale field, kind as string, v0 migration

**Files:**

- Modify: `src/engine/manifest.ts`
- Create: `src/engine/manifest-migration.ts`
- Modify: `src/engine/manifest-catalog.ts` (`CATALOG` type widen)
- Modify: `src/engine/focus.ts` (`isPinnableKind` accepts `string`)
- Modify: `src/engine/__tests__/manifest.test.ts:22`
- Modify: `src/engine/__tests__/life-context.test.ts:39` (fixture)
- Modify: `src/engine/__tests__/world-draft.test.ts:7` (fixture)
- Modify: `src/ui/__tests__/StudioView.test.tsx:135`
- Test: `src/engine/__tests__/manifest-migration.test.ts`

**Interfaces:**

- Consumes: Task 1's registry.
- Produces:
  - `MANIFEST_SCHEMA_VERSION = 'manifest/v1'`, `MANIFEST_LEGACY_VERSION = 'manifest/v0'`
  - `SCALE_VALUES = ['person', 'household', 'org', 'town', 'city', 'region'] as const`
  - `type ManifestScale = (typeof SCALE_VALUES)[number]`
  - `Manifest` gains `readonly scale: ManifestScale`; `kind` widens to `string`
  - `tableFillManifest(..., scale: ManifestScale = 'person', kindRules: readonly KindRule[] = DEFAULT_KIND_RULES)`
  - `parseManifest(raw: unknown): Manifest` (accepts v1, migrates v0, throws otherwise)
  - `migrateManifestV0(v0: ManifestV0): Manifest`

- [ ] **Step 1: Update the fixture tests to expect v1 (failing)**

1. `src/engine/__tests__/manifest.test.ts:22` — change `expect(manifest.schema_version).toBe('manifest/v0');` to:

```ts
expect(manifest.schema_version).toBe('manifest/v1');
expect(manifest.scale).toBe('person');
```

2. `src/engine/__tests__/life-context.test.ts:39` — change the fixture line `schema_version: 'manifest/v0',` to `schema_version: 'manifest/v1',` and insert `scale: 'person',` on the line immediately after it.

3. `src/engine/__tests__/world-draft.test.ts:7` — same two-line change as above, applied to **every** `schema_version: 'manifest/v0'` occurrence in the file.

4. `src/ui/__tests__/StudioView.test.tsx:135` — change `expect(json).toContain('"schema_version":"manifest/v0"');` to:

```ts
expect(json).toContain('"schema_version":"manifest/v1"');
```

5. Create `src/engine/__tests__/manifest-migration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { migrateManifestV0, parseManifest } from '@/engine/manifest-migration';
import { MANIFEST_SCHEMA_VERSION } from '@/engine/manifest';

const V0_MANIFEST = {
  schema_version: 'manifest/v0',
  id: 'm-0-1',
  rng_seed: '42',
  brief: null,
  residue_window_id: 'w-1-3-3',
  kind: 'person',
  name: 'The night clerk',
  one_liner: 'Remembers what you owe before you do.',
  subject: 'a keeper of small debts',
  detail: 'The ledger stays open at strange hours.',
  tags: ['clerk', 'debts'],
  rarity: 'common',
  fill_status: 'table',
  quality_tier: 0,
  provenance: { source: 'table', revision: 'table/v0' },
} as const;

describe('parseManifest', () => {
  it('passes a v1 manifest through unchanged', () => {
    const v1 = { ...V0_MANIFEST, schema_version: 'manifest/v1', scale: 'person' };
    const parsed = parseManifest(v1);
    expect(parsed.schema_version).toBe('manifest/v1');
    expect(parsed.scale).toBe('person');
  });

  it('migrates a v0 manifest to v1 with scale person', () => {
    const parsed = parseManifest(V0_MANIFEST);
    expect(parsed.schema_version).toBe(MANIFEST_SCHEMA_VERSION);
    expect(parsed.scale).toBe('person');
    expect(parsed.name).toBe('The night clerk');
  });

  it('keeps v0 optional about fields through migration', () => {
    const parsed = parseManifest({ ...V0_MANIFEST, about_id: 'm-x', about_name: 'X' });
    expect(parsed.about_id).toBe('m-x');
    expect(parsed.about_name).toBe('X');
  });

  it('throws on garbage', () => {
    expect(() => parseManifest({ schema_version: 'manifest/v9' })).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });
});

describe('migrateManifestV0', () => {
  it('is additive: only version and scale change', () => {
    const migrated = parseManifest(V0_MANIFEST);
    expect(migrated.kind).toBe('person');
    expect(migrated.rarity).toBe('common');
    expect(migrated.tags).toEqual(['clerk', 'debts']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/engine/__tests__/manifest-migration.test.ts src/engine/__tests__/manifest.test.ts`
Expected: FAIL — `@/engine/manifest-migration` missing; `scale` is not on Manifest.

- [ ] **Step 3: Bump manifest.ts to v1**

In `src/engine/manifest.ts`:

1. Replace the version constant block with:

```ts
export const MANIFEST_SCHEMA_VERSION = 'manifest/v1' as const;
export const MANIFEST_LEGACY_VERSION = 'manifest/v0' as const;
export const SCALE_VALUES = ['person', 'household', 'org', 'town', 'city', 'region'] as const;
export type ManifestScale = (typeof SCALE_VALUES)[number];
```

2. In the `Manifest` interface, change `readonly kind: ManifestKind;` to `readonly kind: string;` and add directly after it:

```ts
  readonly scale: ManifestScale;
```

3. In `ManifestSchema`, replace `kind: z.enum(KIND_VALUES),` with:

```ts
    kind: z.string().min(1),
    scale: z.enum(SCALE_VALUES),
```

4. Delete the now-unused `KIND_VALUES` constant.

5. Change the `tableFillManifest` signature to:

```ts
export function tableFillManifest(
  window: readonly ResidueEvent[],
  brief: string | null,
  qualityTier: number,
  rng: Rng,
  rngSeed: string,
  id: string,
  focus: ManifestFocus | null = null,
  lifeContext: LifeContext | null = null,
  scale: ManifestScale = 'person',
  kindRules: readonly KindRule[] = DEFAULT_KIND_RULES,
): Manifest {
```

(add `type KindRule` to the kind-registry import), and its first lines to:

```ts
const summary = summarizeResidue(window);
const kind = pickKindFromRegistry(summary, kindRules);
const catalog = CATALOG[kind];
if (catalog === undefined) {
  throw new Error(`tableFillManifest: no table catalog for kind "${kind}"`);
}
```

6. In the constructed `manifest` object, add after `kind,`:

```ts
    scale,
```

- [ ] **Step 4: Create the migration module**

Create `src/engine/manifest-migration.ts`:

```ts
// Manifest v0 -> v1 migration. Additive: v0 entries gain scale: "person".
// Pure: no Date, no platform APIs. Unknown payloads throw loudly.

import { z } from 'zod';

import {
  MANIFEST_LEGACY_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestSchema,
  type Manifest,
} from './manifest';

const ManifestV0Schema = z
  .object({
    schema_version: z.literal(MANIFEST_LEGACY_VERSION),
    id: z.string().min(1),
    rng_seed: z.string().min(1),
    brief: z.string().nullable(),
    residue_window_id: z.string().min(1),
    kind: z.enum(['thing', 'outcome', 'change', 'person', 'place']),
    name: z.string().min(1),
    one_liner: z.string().min(1),
    subject: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    fill_status: z.enum(['latent', 'table', 'model']),
    quality_tier: z.number().int().min(0),
    provenance: z
      .object({
        source: z.enum(['table', 'model']),
        revision: z.string().min(1),
      })
      .strict(),
    about_id: z.string().min(1).optional(),
    about_name: z.string().min(1).optional(),
  })
  .strict();

export type ManifestV0 = z.infer<typeof ManifestV0Schema>;

export function migrateManifestV0(v0: ManifestV0): Manifest {
  return ManifestSchema.parse({
    ...v0,
    schema_version: MANIFEST_SCHEMA_VERSION,
    scale: 'person',
  });
}

/**
 * Parse any supported Manifest payload, migrating v0 to v1. Throws when the
 * payload is neither — a filler that returns garbage has failed, and the
 * caller (fillManifestSafe) falls back to tables.
 */
export function parseManifest(raw: unknown): Manifest {
  const v1 = ManifestSchema.safeParse(raw);
  if (v1.success) {
    return v1.data;
  }
  const v0 = ManifestV0Schema.safeParse(raw);
  if (v0.success) {
    return migrateManifestV0(v0.data);
  }
  throw new Error('parseManifest: payload is neither manifest/v1 nor manifest/v0');
}
```

- [ ] **Step 5: Widen catalog and focus**

1. `src/engine/manifest-catalog.ts` — change the `CATALOG` declaration to:

```ts
export const CATALOG: Readonly<Record<string, readonly CatalogEntry[]>> = {
```

(drop the now-unused `ManifestKind` import if the type is no longer referenced).

2. `src/engine/focus.ts` — change the signature to:

```ts
export function isPinnableKind(kind: string): kind is 'person' | 'place' {
```

(drop the `ManifestKind` import; keep `Manifest`.)

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run src/engine/__tests__/manifest-migration.test.ts src/engine/__tests__/manifest.test.ts src/engine/__tests__/life-context.test.ts src/engine/__tests__/world-draft.test.ts src/ui/__tests__/StudioView.test.tsx`
Expected: PASS (all). If `fill-adapter.test.ts` fails on the v0 literal, that is Task 3's fixture — note it and proceed.

- [ ] **Step 7: Commit**

```bash
git add src/engine/manifest.ts src/engine/manifest-migration.ts src/engine/manifest-catalog.ts src/engine/focus.ts src/engine/__tests__/manifest.test.ts src/engine/__tests__/manifest-migration.test.ts src/engine/__tests__/life-context.test.ts src/engine/__tests__/world-draft.test.ts src/ui/__tests__/StudioView.test.tsx
git commit -m "feat(engine): bump Manifest to v1 with scale and v0 migration"
```

---

### Task 3: Thread scale through the fill adapter

**Files:**

- Modify: `src/engine/fill-adapter.ts`
- Modify: `src/engine/__tests__/fill-adapter.test.ts`

**Interfaces:**

- Consumes: `parseManifest` (Task 2), `ManifestScale` (Task 2).
- Produces:
  - `MANIFEST_COMPILE_VERSION = 'manifest_compile/v1'`
  - `ManifestCompileRequest` gains `readonly scale: ManifestScale`
  - `compileRequestFromBay(bay, qualityTier, harvestCount, lifeContext = null, scale: ManifestScale = 'person')`
  - `fillManifestSafe` validates via `parseManifest`; fallback threads `request.scale`

- [ ] **Step 1: Update the adapter tests (failing)**

In `src/engine/__tests__/fill-adapter.test.ts`:

1. Line 68 — change `expect(manifest.schema_version).toBe('manifest/v0');` to:

```ts
expect(manifest.schema_version).toBe('manifest/v1');
```

2. Append these tests inside the existing top-level `describe('fill adapter')` block, reusing that file's `readyStudio()` helper and its existing imports (`createRng`, `compileRequestFromBay`, `fillManifestSafe`, `ManifestFiller`, `Manifest` are all already imported from `'../'`):

```ts
it('compile request carries the person scale by default', () => {
  const studio = readyStudio();
  const bay = studio.bay;
  if (bay === null) {
    throw new Error('expected bay');
  }
  const req = compileRequestFromBay(bay, 0, 0);
  expect(req.scale).toBe('person');
});

it('migrates a v0-shaped filler payload to v1', () => {
  const studio = readyStudio();
  const bay = studio.bay;
  if (bay === null) {
    throw new Error('expected bay');
  }
  const v0Card = {
    schema_version: 'manifest/v0',
    id: 'm-legacy',
    rng_seed: '7',
    brief: null,
    residue_window_id: 'w-1-3-3',
    kind: 'thing',
    name: 'Sealed token',
    one_liner: 'A small mark that still holds a decision.',
    subject: 'a kept token',
    detail: 'Work pressed a choice into something you can hold.',
    tags: ['token'],
    rarity: 'common',
    fill_status: 'model',
    quality_tier: 0,
    provenance: { source: 'model', revision: 'spacexai/test' },
  } as unknown as Manifest;
  const legacyFiller: ManifestFiller = {
    id: 'legacy/v0',
    fill: () => v0Card,
  };
  const req = compileRequestFromBay(bay, 0, 0);
  const manifest = fillManifestSafe(req, createRng(4n), legacyFiller);
  expect(manifest.schema_version).toBe('manifest/v1');
  expect(manifest.scale).toBe('person');
  expect(manifest.name).toBe('Sealed token');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run src/engine/__tests__/fill-adapter.test.ts`
Expected: FAIL — `scale` is not on the compile request.

- [ ] **Step 3: Wire the adapter**

In `src/engine/fill-adapter.ts`:

1. Imports — add:

```ts
import { parseManifest } from './manifest-migration';
import type { ManifestScale } from './manifest';
```

2. Change `export const MANIFEST_COMPILE_VERSION = 'manifest_compile/v0' as const;` to:

```ts
export const MANIFEST_COMPILE_VERSION = 'manifest_compile/v1' as const;
```

3. Add to `ManifestCompileRequest`, after `quality_tier`:

```ts
  readonly scale: ManifestScale;
```

4. Change `compileRequestFromBay` to:

```ts
export function compileRequestFromBay(
  bay: CompileBayInput,
  qualityTier: number,
  harvestCount: number,
  lifeContext: LifeContext | null = null,
  scale: ManifestScale = 'person',
): ManifestCompileRequest {
  return {
    schema_version: MANIFEST_COMPILE_VERSION,
    id: `m-${harvestCount}-${bay.rng_seed}`,
    rng_seed: bay.rng_seed,
    brief: bay.brief,
    residue_window_id: bay.residue_window_id || residueWindowId(bay.residue),
    residue: bay.residue,
    summary: summarizeResidue(bay.residue),
    quality_tier: qualityTier,
    scale,
    focus: bay.focus ?? null,
    life_context: lifeContext,
  };
}
```

5. In `tableFiller().fill`, add `request.scale` as the ninth argument to `tableFillManifest` (after `request.life_context`).

6. In `fillManifestSafe`, replace `ManifestSchema.parse(filler.fill(request, rng))` with `parseManifest(filler.fill(request, rng))`, and in the `catch` fallback add `request.scale` as the ninth `tableFillManifest` argument. Drop the now-unused `ManifestSchema` import.

- [ ] **Step 4: Run the tests**

Run: `pnpm exec vitest run src/engine/__tests__/fill-adapter.test.ts src/engine/__tests__/operations.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/engine/fill-adapter.ts src/engine/__tests__/fill-adapter.test.ts
git commit -m "feat(engine): thread scale through the fill adapter"
```

---

### Task 4: Progression content schemas

**Files:**

- Create: `src/content/progression/schema.ts`
- Test: `src/content/progression/__tests__/schema.test.ts`

**Interfaces:**

- Consumes: `EffectOpSchema` from `../schema`; `SCALE_VALUES` from `@/engine/manifest`.
- Produces (all `z.infer` types exported too):
  - `ScaleSchema`, `KindMatchSchema`, `KindRowSchema` (`kind/v0`), `TierSchema` (`tier/v0`)
  - `ArchivePredicateSchema` + `ArchivePredicate` type
  - `MilestoneSchema` (`milestone/v0`), `PolicySchema` (`policy/v0`)
  - `EndowmentTrackSchema` (`endowment/v0`), `VisitorSchema` (`visitor/v0`), `CompendiumEntrySchema` (`compendium/v0`)

- [ ] **Step 1: Write the failing test**

Create `src/content/progression/__tests__/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  ArchivePredicateSchema,
  CompendiumEntrySchema,
  EndowmentTrackSchema,
  KindRowSchema,
  MilestoneSchema,
  PolicySchema,
  TierSchema,
  VisitorSchema,
} from '@/content/progression/schema';

describe('TierSchema', () => {
  const tier = {
    schema_version: 'tier/v0',
    id: 'household',
    scale: 'household',
    index: 1,
    roster_size: { min: 3, max: 8 },
    member_unit: 'person',
    role_table_ref: 'roles/household',
    unlock_milestone: 'unlock-household',
    fold_cadence: 4,
    endowment_slots: 2,
    visitor_table_ref: 'visitors/household',
  };

  it('accepts a well-formed tier', () => {
    expect(TierSchema.parse(tier).id).toBe('household');
  });

  it('rejects a fold cadence below 1', () => {
    expect(() => TierSchema.parse({ ...tier, fold_cadence: 0 })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => TierSchema.parse({ ...tier, karma: 1 })).toThrow();
  });
});

describe('KindRowSchema', () => {
  const row = {
    schema_version: 'kind/v0',
    id: 'person',
    scale: 'person',
    pinnable: true,
    catalog_ref: 'core/person',
    sid_ns: 'kind.person',
    min_quality: 0,
    match: { social: true },
  };

  it('accepts a well-formed kind row', () => {
    expect(KindRowSchema.parse(row).id).toBe('person');
  });

  it('rejects a match with no clauses', () => {
    expect(() => KindRowSchema.parse({ ...row, match: {} })).toThrow();
  });

  it('defaults pinnable to false and min_quality to 0', () => {
    const { pinnable: _p, min_quality: _q, ...rest } = row;
    const parsed = KindRowSchema.parse(rest);
    expect(parsed.pinnable).toBe(false);
    expect(parsed.min_quality).toBe(0);
  });
});

describe('ArchivePredicateSchema', () => {
  it('parses a nested and/gte predicate', () => {
    const predicate = {
      op: 'and',
      operands: [
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'gte', key: 'pinned.person', value: 3 },
      ],
    };
    expect(ArchivePredicateSchema.parse(predicate).op).toBe('and');
  });

  it('rejects an unknown op', () => {
    expect(() => ArchivePredicateSchema.parse({ op: 'has_flag', key: 'x', value: 1 })).toThrow();
  });
});

describe('remaining progression schemas', () => {
  it('MilestoneSchema accepts the household unlock', () => {
    const milestone = {
      schema_version: 'milestone/v0',
      id: 'unlock-household',
      predicate: { op: 'gte', key: 'pinned.person', value: 3 },
      grants: { tier: 'household', ceremony_sid: 'graduation.household' },
    };
    expect(MilestoneSchema.parse(milestone).grants.tier).toBe('household');
  });

  it('PolicySchema accepts a routine policy', () => {
    const policy = {
      schema_version: 'policy/v0',
      id: 'policy/farmer',
      practices: ['practice:tilling'],
      schedule_ref: 'schedules/farmstead',
      choice_weights: { generosity: 0.4 },
    };
    expect(PolicySchema.parse(policy).id).toBe('policy/farmer');
  });

  it('EndowmentTrackSchema accepts an EffectOp track', () => {
    const track = {
      schema_version: 'endowment/v0',
      id: 'endow/swift-cook',
      tier: 'person',
      requires: null,
      slot_cost: 1,
      effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
    };
    expect(EndowmentTrackSchema.parse(track).slot_cost).toBe(1);
  });

  it('VisitorSchema requires exactly one of effects or table_ref', () => {
    const base = {
      schema_version: 'visitor/v0',
      id: 'visitor/gate-yaksa',
      tiers: ['person'],
      cadence_ticks: 240,
      jitter_ticks: 60,
      duration_windows: 2,
      sid_ns: 'visitor.gate-yaksa',
    };
    expect(() => VisitorSchema.parse({ ...base })).toThrow();
    expect(() =>
      VisitorSchema.parse({
        ...base,
        effects: [{ op: 'add_resource', key: 'surplus_rate', delta: 1 }],
        table_ref: 'tables/yaksa',
      }),
    ).toThrow();
    expect(VisitorSchema.parse({ ...base, table_ref: 'tables/yaksa' }).table_ref).toBe(
      'tables/yaksa',
    );
  });

  it('CompendiumEntrySchema accepts a predicate + reward', () => {
    const entry = {
      schema_version: 'compendium/v0',
      id: 'compendium/first-world',
      predicate: { op: 'gte', key: 'world_drafts.total', value: 1 },
      reward: { unlock: 'theme/lacquer' },
      sid_ns: 'compendium.first-world',
    };
    expect(CompendiumEntrySchema.parse(entry).id).toBe('compendium/first-world');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run src/content/progression/__tests__/schema.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the schema module**

Create `src/content/progression/schema.ts`:

```ts
// Progression content schemas — the data contract for the six-tier chain.
//
// Every row is versioned (`tier/v0`, `kind/v0`, …). Evolution is additive:
// new optional fields or new rows; renames get a new version plus a
// migration. Validated by ./loader; design-linted by ./lint.

import { z } from 'zod';

import { SCALE_VALUES } from '@/engine/manifest';

import { EffectOpSchema } from '../schema';

export const ScaleSchema = z.enum(SCALE_VALUES);
export type Scale = z.infer<typeof ScaleSchema>;

/* ---- kind/v0 ------------------------------------------------------------ */

const ResidueEventTypeSchema = z.enum([
  'practice_tick',
  'practice_level',
  'lens_chosen',
  'event_resolved',
  'resource_edge',
  'life_ended',
]);

export const KindMatchSchema = z
  .object({
    dominant: ResidueEventTypeSchema.optional(),
    no_dominant: z.literal(true).optional(),
    dominant_in: z.array(ResidueEventTypeSchema).min(1).optional(),
    social: z.literal(true).optional(),
    spatial: z.literal(true).optional(),
  })
  .strict()
  .refine((m) => Object.values(m).some((v) => v !== undefined), {
    message: 'kind match must specify at least one clause',
  });

export const KIND_ROW_VERSION = 'kind/v0' as const;

export const KindRowSchema = z
  .object({
    schema_version: z.literal(KIND_ROW_VERSION),
    id: z.string().min(1),
    scale: ScaleSchema,
    pinnable: z.boolean().default(false),
    catalog_ref: z.string().min(1),
    sid_ns: z.string().min(1),
    min_quality: z.number().int().min(0).default(0),
    match: KindMatchSchema,
  })
  .strict();
export type KindRow = z.infer<typeof KindRowSchema>;

/* ---- tier/v0 ------------------------------------------------------------ */

export const TIER_VERSION = 'tier/v0' as const;

export const TierSchema = z
  .object({
    schema_version: z.literal(TIER_VERSION),
    id: z.string().min(1),
    scale: ScaleSchema,
    index: z.number().int().min(0),
    roster_size: z
      .object({
        min: z.number().int().min(0),
        max: z.number().int().min(1),
      })
      .strict(),
    member_unit: z.string().min(1),
    role_table_ref: z.string().min(1),
    unlock_milestone: z.string().min(1).nullable(),
    fold_cadence: z.number().int().min(1),
    endowment_slots: z.number().int().min(0),
    visitor_table_ref: z.string().min(1),
  })
  .strict();
export type Tier = z.infer<typeof TierSchema>;

/* ---- archive predicates -------------------------------------------------- */

export interface ArchiveComparison {
  op: 'gte' | 'gt' | 'eq';
  key: string;
  value: number;
}
export interface ArchiveJunction {
  op: 'and' | 'or';
  operands: ArchivePredicate[];
}
export interface ArchiveNegation {
  op: 'not';
  operand: ArchivePredicate;
}
export type ArchivePredicate = ArchiveComparison | ArchiveJunction | ArchiveNegation;

export const ArchivePredicateSchema: z.ZodType<ArchivePredicate> = z.lazy(() =>
  z.union([ArchiveComparisonSchema, ArchiveJunctionSchema, ArchiveNegationSchema]),
);

const ArchiveComparisonSchema = z
  .object({
    op: z.enum(['gte', 'gt', 'eq']),
    key: z.string().min(1),
    value: z.number(),
  })
  .strict();
const ArchiveJunctionSchema = z
  .object({
    op: z.enum(['and', 'or']),
    operands: z.array(ArchivePredicateSchema).min(1),
  })
  .strict();
const ArchiveNegationSchema = z
  .object({
    op: z.literal('not'),
    operand: ArchivePredicateSchema,
  })
  .strict();

/* ---- milestone/v0 -------------------------------------------------------- */

export const MILESTONE_VERSION = 'milestone/v0' as const;

export const MilestoneSchema = z
  .object({
    schema_version: z.literal(MILESTONE_VERSION),
    id: z.string().min(1),
    predicate: ArchivePredicateSchema,
    grants: z
      .object({
        tier: z.string().min(1),
        ceremony_sid: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type Milestone = z.infer<typeof MilestoneSchema>;

/* ---- policy/v0 ------------------------------------------------------------ */

export const POLICY_VERSION = 'policy/v0' as const;

export const PolicySchema = z
  .object({
    schema_version: z.literal(POLICY_VERSION),
    id: z.string().min(1),
    practices: z.array(z.string().min(1)),
    schedule_ref: z.string().min(1),
    choice_weights: z.record(z.string(), z.number()),
  })
  .strict();
export type Policy = z.infer<typeof PolicySchema>;

/* ---- endowment/v0 ---------------------------------------------------------- */

export const ENDOWMENT_VERSION = 'endowment/v0' as const;

export const EndowmentTrackSchema = z
  .object({
    schema_version: z.literal(ENDOWMENT_VERSION),
    id: z.string().min(1),
    tier: z.string().min(1),
    requires: z.string().min(1).nullable(),
    slot_cost: z.number().int().min(1),
    effects: z.array(EffectOpSchema),
  })
  .strict();
export type EndowmentTrack = z.infer<typeof EndowmentTrackSchema>;

/* ---- visitor/v0 ------------------------------------------------------------- */

export const VISITOR_VERSION = 'visitor/v0' as const;

export const VisitorSchema = z
  .object({
    schema_version: z.literal(VISITOR_VERSION),
    id: z.string().min(1),
    tiers: z.array(ScaleSchema).min(1),
    cadence_ticks: z.number().int().min(1),
    jitter_ticks: z.number().int().min(0),
    duration_windows: z.number().int().min(1),
    effects: z.array(EffectOpSchema).optional(),
    table_ref: z.string().min(1).optional(),
    sid_ns: z.string().min(1),
  })
  .strict()
  .refine((v) => (v.effects === undefined) !== (v.table_ref === undefined), {
    message: 'visitor must set exactly one of effects or table_ref',
  });
export type Visitor = z.infer<typeof VisitorSchema>;

/* ---- compendium/v0 ----------------------------------------------------------- */

export const COMPENDIUM_VERSION = 'compendium/v0' as const;

export const CompendiumEntrySchema = z
  .object({
    schema_version: z.literal(COMPENDIUM_VERSION),
    id: z.string().min(1),
    predicate: ArchivePredicateSchema,
    reward: z
      .object({
        effects: z.array(EffectOpSchema).optional(),
        unlock: z.string().min(1).optional(),
      })
      .strict()
      .refine((r) => (r.effects === undefined) !== (r.unlock === undefined), {
        message: 'reward must set exactly one of effects or unlock',
      }),
    sid_ns: z.string().min(1),
  })
  .strict();
export type CompendiumEntry = z.infer<typeof CompendiumEntrySchema>;
```

- [ ] **Step 4: Run the tests**

Run: `pnpm exec vitest run src/content/progression/__tests__/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/progression/schema.ts src/content/progression/__tests__/schema.test.ts
git commit -m "feat(content): add progression content schemas"
```

---

### Task 5: Progression base content, registry, and loader

**Files:**

- Create: `src/content/progression/base/tiers.json5`, `kinds.json5`, `milestones.json5`, `policies.json5`, `endowment.json5`, `visitors.json5`, `compendium.json5`
- Create: `src/content/progression/registry.ts`
- Create: `src/content/progression/loader.ts`
- Test: `src/content/progression/__tests__/loader.test.ts`

**Interfaces:**

- Consumes: Task 4 schemas; `KindRule` type from `@/engine/kind-registry`.
- Produces:
  - `getProgressionBundle(): ProgressionBundle`
  - `interface ProgressionRegistries { tiers, kindRows, kindRules, milestones, policies, endowment, visitors, compendium }`
  - `loadProgression(): ProgressionRegistries` (throws naming file + field on any validation failure)

- [ ] **Step 1: Write the base JSON5 files**

`src/content/progression/base/tiers.json5`:

```json5
{
  tiers: [
    {
      schema_version: 'tier/v0',
      id: 'person',
      scale: 'person',
      index: 0,
      roster_size: { min: 1, max: 1 },
      member_unit: 'life',
      role_table_ref: 'roles/person',
      unlock_milestone: null,
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/person',
    },
    {
      schema_version: 'tier/v0',
      id: 'household',
      scale: 'household',
      index: 1,
      roster_size: { min: 3, max: 8 },
      member_unit: 'person',
      role_table_ref: 'roles/household',
      unlock_milestone: 'unlock-household',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/household',
    },
    {
      schema_version: 'tier/v0',
      id: 'org',
      scale: 'org',
      index: 2,
      roster_size: { min: 2, max: 12 },
      member_unit: 'household',
      role_table_ref: 'roles/org',
      unlock_milestone: 'unlock-org',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/org',
    },
    {
      schema_version: 'tier/v0',
      id: 'town',
      scale: 'town',
      index: 3,
      roster_size: { min: 3, max: 24 },
      member_unit: 'household',
      role_table_ref: 'roles/town',
      unlock_milestone: 'unlock-town',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/town',
    },
    {
      schema_version: 'tier/v0',
      id: 'city',
      scale: 'city',
      index: 4,
      roster_size: { min: 4, max: 40 },
      member_unit: 'household',
      role_table_ref: 'roles/city',
      unlock_milestone: 'unlock-city',
      fold_cadence: 4,
      endowment_slots: 3,
      visitor_table_ref: 'visitors/city',
    },
    {
      schema_version: 'tier/v0',
      id: 'region',
      scale: 'region',
      index: 5,
      roster_size: { min: 2, max: 12 },
      member_unit: 'town',
      role_table_ref: 'roles/region',
      unlock_milestone: 'unlock-region',
      fold_cadence: 4,
      endowment_slots: 4,
      visitor_table_ref: 'visitors/region',
    },
  ],
}
```

`src/content/progression/base/kinds.json5` (order is load-bearing — mirrors `DEFAULT_KIND_RULES`):

```json5
{
  kinds: [
    {
      schema_version: 'kind/v0',
      id: 'change',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/change',
      sid_ns: 'kind.change',
      min_quality: 0,
      match: { dominant: 'practice_level' },
    },
    {
      schema_version: 'kind/v0',
      id: 'outcome',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/outcome',
      sid_ns: 'kind.outcome',
      min_quality: 0,
      match: { dominant: 'event_resolved' },
    },
    {
      schema_version: 'kind/v0',
      id: 'person',
      scale: 'person',
      pinnable: true,
      catalog_ref: 'core/person',
      sid_ns: 'kind.person',
      min_quality: 0,
      match: { social: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'place',
      scale: 'person',
      pinnable: true,
      catalog_ref: 'core/place',
      sid_ns: 'kind.place',
      min_quality: 0,
      match: { spatial: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'thing',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/thing',
      sid_ns: 'kind.thing',
      min_quality: 0,
      match: { no_dominant: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'change',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/change',
      sid_ns: 'kind.change',
      min_quality: 0,
      match: { dominant_in: ['life_ended'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'outcome',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/outcome',
      sid_ns: 'kind.outcome',
      min_quality: 0,
      match: { dominant_in: ['resource_edge'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'thing',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/thing',
      sid_ns: 'kind.thing',
      min_quality: 0,
      match: { dominant_in: ['practice_tick', 'lens_chosen'] },
    },
  ],
}
```

`src/content/progression/base/milestones.json5`:

```json5
{
  milestones: [
    {
      schema_version: 'milestone/v0',
      id: 'unlock-household',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'world_drafts.total', value: 1 },
          { op: 'gte', key: 'pinned.person', value: 3 },
        ],
      },
      grants: { tier: 'household', ceremony_sid: 'graduation.household' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-org',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.tradition', value: 2 },
          { op: 'gte', key: 'world_drafts.household', value: 1 },
        ],
      },
      grants: { tier: 'org', ceremony_sid: 'graduation.org' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-town',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.charter', value: 1 },
          { op: 'gte', key: 'world_drafts.org', value: 2 },
        ],
      },
      grants: { tier: 'town', ceremony_sid: 'graduation.town' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-city',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.festival', value: 1 },
          { op: 'gte', key: 'pinned.landmark', value: 1 },
          { op: 'gte', key: 'world_drafts.town', value: 2 },
        ],
      },
      grants: { tier: 'city', ceremony_sid: 'graduation.city' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-region',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.institution', value: 1 },
          { op: 'gte', key: 'pinned.monument', value: 1 },
          { op: 'gte', key: 'world_drafts.city', value: 2 },
        ],
      },
      grants: { tier: 'region', ceremony_sid: 'graduation.region' },
    },
  ],
}
```

`src/content/progression/base/policies.json5`: `{ policies: [] }`
`src/content/progression/base/endowment.json5`: `{ endowment: [] }`
`src/content/progression/base/visitors.json5`: `{ visitors: [] }`
`src/content/progression/base/compendium.json5`: `{ compendium: [] }`

- [ ] **Step 2: Write the failing loader test**

Create `src/content/progression/__tests__/loader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES } from '@/engine/kind-registry';

import { loadProgression } from '@/content/progression/loader';

describe('loadProgression', () => {
  const registries = loadProgression();

  it('loads the six tiers in ladder order', () => {
    expect(registries.tiers.map((t) => t.id)).toEqual([
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
    ]);
    expect(registries.tiers.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('person tier is the only one without an unlock milestone', () => {
    const person = registries.tiers.find((t) => t.id === 'person');
    expect(person?.unlock_milestone).toBeNull();
  });

  it('ships kind rules identical to the engine defaults', () => {
    expect(registries.kindRules).toEqual(DEFAULT_KIND_RULES);
  });

  it('ships one unlock milestone per non-person tier', () => {
    expect(registries.milestones.map((m) => m.id)).toEqual([
      'unlock-household',
      'unlock-org',
      'unlock-town',
      'unlock-city',
      'unlock-region',
    ]);
  });

  it('ships empty extension files as valid empty registries', () => {
    expect(registries.policies).toEqual([]);
    expect(registries.endowment).toEqual([]);
    expect(registries.visitors).toEqual([]);
    expect(registries.compendium).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm exec vitest run src/content/progression/__tests__/loader.test.ts`
Expected: FAIL — `@/content/progression/loader` does not exist.

- [ ] **Step 4: Create the registry**

Create `src/content/progression/registry.ts`:

```ts
// Statically-bundled progression content. Same pattern as ../registry:
// the bundler (Metro transformer / Vite plugin) inlines parsed JSON5 at
// build time, so there is no disk read at runtime.

import compendium from './base/compendium.json5';
import endowment from './base/endowment.json5';
import kinds from './base/kinds.json5';
import milestones from './base/milestones.json5';
import policies from './base/policies.json5';
import tiers from './base/tiers.json5';
import visitors from './base/visitors.json5';

export interface ProgressionBundle {
  readonly tiers: unknown;
  readonly kinds: unknown;
  readonly milestones: unknown;
  readonly policies: unknown;
  readonly endowment: unknown;
  readonly visitors: unknown;
  readonly compendium: unknown;
}

export function getProgressionBundle(): ProgressionBundle {
  return { tiers, kinds, milestones, policies, endowment, visitors, compendium };
}
```

- [ ] **Step 5: Create the loader**

Create `src/content/progression/loader.ts`:

```ts
// Progression loader — validates the base JSON5 files against the
// progression schemas and flattens kind rows into engine KindRules.
// Pure and synchronous, mirroring ../loader.

import { z } from 'zod';

import type { KindRule } from '@/engine/kind-registry';

import { getProgressionBundle } from './registry';
import {
  CompendiumEntrySchema,
  EndowmentTrackSchema,
  KindRowSchema,
  MilestoneSchema,
  PolicySchema,
  TierSchema,
  VisitorSchema,
  type CompendiumEntry,
  type EndowmentTrack,
  type KindRow,
  type Milestone,
  type Policy,
  type Tier,
  type Visitor,
} from './schema';

export interface ProgressionRegistries {
  readonly tiers: readonly Tier[];
  readonly kindRows: readonly KindRow[];
  /** Engine-shaped rules, in file order. First match wins at compile. */
  readonly kindRules: readonly KindRule[];
  readonly milestones: readonly Milestone[];
  readonly policies: readonly Policy[];
  readonly endowment: readonly EndowmentTrack[];
  readonly visitors: readonly Visitor[];
  readonly compendium: readonly CompendiumEntry[];
}

function extractArray(raw: unknown, key: string, filename: string): unknown[] {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    key in raw &&
    Array.isArray((raw as Record<string, unknown>)[key])
  ) {
    return (raw as Record<string, unknown[]>)[key];
  }
  throw new Error(`loadProgression: ${filename} must be an object with a "${key}" array`);
}

function parseFile<S extends z.ZodType>(
  schema: S,
  rows: unknown[],
  filename: string,
): z.infer<S>[] {
  const result = schema.array().safeParse(rows);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') ?? '(root)';
    throw new Error(
      `loadProgression: ${filename} validation failed at "${path}": ${
        issue?.message ?? 'unknown error'
      }`,
    );
  }
  return result.data as z.infer<S>[];
}

export function loadProgression(): ProgressionRegistries {
  const bundle = getProgressionBundle();
  const tiers = parseFile(
    TierSchema,
    extractArray(bundle.tiers, 'tiers', 'tiers.json5'),
    'tiers.json5',
  );
  const kindRows = parseFile(
    KindRowSchema,
    extractArray(bundle.kinds, 'kinds', 'kinds.json5'),
    'kinds.json5',
  );
  const milestones = parseFile(
    MilestoneSchema,
    extractArray(bundle.milestones, 'milestones', 'milestones.json5'),
    'milestones.json5',
  );
  const policies = parseFile(
    PolicySchema,
    extractArray(bundle.policies, 'policies', 'policies.json5'),
    'policies.json5',
  );
  const endowment = parseFile(
    EndowmentTrackSchema,
    extractArray(bundle.endowment, 'endowment', 'endowment.json5'),
    'endowment.json5',
  );
  const visitors = parseFile(
    VisitorSchema,
    extractArray(bundle.visitors, 'visitors', 'visitors.json5'),
    'visitors.json5',
  );
  const compendium = parseFile(
    CompendiumEntrySchema,
    extractArray(bundle.compendium, 'compendium', 'compendium.json5'),
    'compendium.json5',
  );
  const kindRules: KindRule[] = kindRows.map((row) => ({ kind: row.id, match: row.match }));
  return { tiers, kindRows, kindRules, milestones, policies, endowment, visitors, compendium };
}
```

Note: `kindRows.map(...)` relies on the content `KindMatch` Zod inference being structurally assignable to the engine `KindMatch` (all fields `T | undefined` on both sides). If `tsc` disagrees, widen the map callback's return with an explicit spread of the five clause fields — do not add a cast.

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run src/content/progression/__tests__/loader.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/progression/base src/content/progression/registry.ts src/content/progression/loader.ts src/content/progression/__tests__/loader.test.ts
git commit -m "feat(content): add progression base content, registry, and loader"
```

---

### Task 6: Progression lint

**Files:**

- Modify: `src/content/lint.ts` (export `walkStrings`, add `containsMeterToken`)
- Create: `src/content/progression/lint.ts`
- Test: `src/content/progression/__tests__/lint.test.ts`

**Interfaces:**

- Consumes: `ProgressionRegistries` (Task 5 loader type), `LintReport`/`LintViolation` from `../lint`.
- Produces: `lintProgression(registries: ProgressionRegistries): LintReport` with rules `R-PROG-REF-INTEGRITY`, `R-PROG-CORE-KINDS`, `R-PROG-NO-METER`.

- [ ] **Step 1: Write the failing test**

Create `src/content/progression/__tests__/lint.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';
import { lintProgression } from '@/content/progression/lint';
import type { ProgressionRegistries } from '@/content/progression/loader';

describe('lintProgression', () => {
  it('passes the shipped base content', () => {
    const report = lintProgression(loadProgression());
    expect(report.violations).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it('rejects a tier whose unlock milestone is missing', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      milestones: registries.milestones.filter((m) => m.id !== 'unlock-org'),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-REF-INTEGRITY')).toBe(true);
  });

  it('rejects a milestone granting an unknown tier', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      milestones: registries.milestones.map((m) =>
        m.id === 'unlock-region' ? { ...m, grants: { ...m.grants, tier: 'planet' } } : m,
      ),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-REF-INTEGRITY')).toBe(true);
  });

  it('rejects a registry missing a core kind', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      kindRows: registries.kindRows.filter((r) => r.id !== 'place'),
      kindRules: registries.kindRules.filter((r) => r.kind !== 'place'),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-CORE-KINDS')).toBe(true);
  });

  it('rejects meter tokens anywhere in progression data', () => {
    const registries = loadProgression();
    const row = CompendiumEntrySchema.parse({
      schema_version: 'compendium/v0',
      id: 'compendium/merit-badge',
      predicate: { op: 'gte', key: 'pinned.person', value: 1 },
      reward: { unlock: 'merit_meter' },
      sid_ns: 'compendium.merit-badge',
    });
    const broken: ProgressionRegistries = { ...registries, compendium: [row] };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-NO-METER')).toBe(true);
  });
});
```

(The test builds a synthetic compendium row because the shipped compendium file is empty. Add `CompendiumEntrySchema` to the schema import at the top of the test file.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run src/content/progression/__tests__/lint.test.ts`
Expected: FAIL — `@/content/progression/lint` does not exist.

- [ ] **Step 3: Export the walker and meter check from content lint**

In `src/content/lint.ts`:

1. Change `function* walkStrings(` to `export function* walkStrings(`.
2. Add after the `KARMA_METER_RE` definition:

```ts
/** True when `s` carries a forbidden metaphysical-meter token. */
export function containsMeterToken(s: string): boolean {
  return KARMA_METER_RE.test(s);
}
```

- [ ] **Step 4: Create the progression lint**

Create `src/content/progression/lint.ts`:

```ts
// Progression design lint — referential integrity plus the game-design
// meter ban, applied to the progression registries. Pure and deterministic.

import { containsMeterToken, walkStrings, type LintReport, type LintViolation } from '../lint';
import type { ProgressionRegistries } from './loader';

export const R_PROG_REF_INTEGRITY = 'R-PROG-REF-INTEGRITY' as const;
export const R_PROG_CORE_KINDS = 'R-PROG-CORE-KINDS' as const;
export const R_PROG_NO_METER = 'R-PROG-NO-METER' as const;

const CORE_KIND_IDS = ['thing', 'outcome', 'change', 'person', 'place'] as const;

function error(rule: string, message: string, location: string): LintViolation {
  return { rule, severity: 'error', message, location };
}

/**
 * Lint the loaded progression registries.
 *  - R-PROG-REF-INTEGRITY: tier unlock milestones and milestone grants point
 *    at rows that exist.
 *  - R-PROG-CORE-KINDS: the five SPEC §6 core kinds all have registry rows,
 *    so the table fallback can never lose a person-scale kind.
 *  - R-PROG-NO-METER: no metaphysical-meter token in any progression row.
 */
export function lintProgression(registries: ProgressionRegistries): LintReport {
  const violations: LintViolation[] = [];

  const tierIds = new Set(registries.tiers.map((t) => t.id));
  const milestoneIds = new Set(registries.milestones.map((m) => m.id));

  for (const tier of registries.tiers) {
    if (tier.unlock_milestone !== null && !milestoneIds.has(tier.unlock_milestone)) {
      violations.push(
        error(
          R_PROG_REF_INTEGRITY,
          `tier "${tier.id}" references missing milestone "${tier.unlock_milestone}"`,
          `tiers[${tier.id}].unlock_milestone`,
        ),
      );
    }
  }
  for (const milestone of registries.milestones) {
    if (!tierIds.has(milestone.grants.tier)) {
      violations.push(
        error(
          R_PROG_REF_INTEGRITY,
          `milestone "${milestone.id}" grants unknown tier "${milestone.grants.tier}"`,
          `milestones[${milestone.id}].grants.tier`,
        ),
      );
    }
  }

  const kindIds = new Set(registries.kindRows.map((r) => r.id));
  for (const core of CORE_KIND_IDS) {
    if (!kindIds.has(core)) {
      violations.push(error(R_PROG_CORE_KINDS, `core kind "${core}" has no registry row`, 'kinds'));
    }
  }

  const meterScope = {
    milestones: registries.milestones,
    policies: registries.policies,
    endowment: registries.endowment,
    visitors: registries.visitors,
    compendium: registries.compendium,
  };
  for (const { s, path } of walkStrings(meterScope)) {
    if (containsMeterToken(s)) {
      violations.push(
        error(R_PROG_NO_METER, `prohibited meter token "${s}" in progression data`, path),
      );
    }
  }

  const hasError = violations.some((v) => v.severity === 'error');
  return { passed: !hasError, violations };
}
```

- [ ] **Step 5: Wire lint into the loader**

In `src/content/progression/loader.ts`, import `lintProgression` from './lint', and at the end of `loadProgression`, before the `return`:

```ts
const registries: ProgressionRegistries = {
  tiers,
  kindRows,
  kindRules,
  milestones,
  policies,
  endowment,
  visitors,
  compendium,
};
const lintReport = lintProgression(registries);
if (!lintReport.passed) {
  const first = lintReport.violations[0];
  throw new Error(
    `loadProgression: lint rejected progression content (rule ${first?.rule ?? 'unknown'}): ${
      first?.message ?? 'unknown violation'
    }`,
  );
}
return registries;
```

(replacing the existing `return { ... }` statement.)

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run src/content/progression/__tests__ src/content/__tests__/lint.test.ts`
Expected: PASS (all — existing pack lint tests confirm the walker export changed nothing).

- [ ] **Step 7: Commit**

```bash
git add src/content/lint.ts src/content/progression/lint.ts src/content/progression/loader.ts src/content/progression/__tests__/lint.test.ts
git commit -m "feat(content): lint progression data for integrity and meter tokens"
```

---

### Task 7: tier-state + studio_session/v1 with v0 migration

**Files:**

- Create: `src/engine/tier-state.ts`
- Create: `src/engine/studio-session-v0.ts`
- Modify: `src/engine/studio-session.ts`
- Test: `src/engine/__tests__/studio-session-v1.test.ts`

**Interfaces:**

- Consumes: `parseManifest` (Task 2), `ManifestSchema` (Task 2).
- Produces:
  - `TierStateSchema`, `RosterSchema`, `RosterMemberSchema`, `createTierState(tier, unlocked): TierState`
  - `STUDIO_SESSION_VERSION = 'studio_session/v1'`; `STUDIO_SESSION_V0_VERSION = 'studio_session/v0'`
  - `interface SessionProgression { tiers, milestones_done, compendium_done, embodied_member }`; `defaultProgression()`
  - `snapshotStudioSession(studio, idle, life, practices, lastVisitedAtUnix?, progression = defaultProgression())`
  - `parseStudioSession(raw): StudioSession` — v1, or v0 migrated
  - `hydrateStudioSession(session, baseLife, packPractices): HydratedStudioSession` — same runtime shape as today plus `progression`

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/studio-session-v1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createStudioState } from '@/engine/operations';
import {
  defaultProgression,
  emptyHydratedSession,
  hydrateStudioSession,
  parseStudioSession,
  snapshotStudioSession,
} from '@/engine/studio-session';

const V0_SESSION = {
  schema_version: 'studio_session/v0',
  studio: {
    residue: [
      { tick: 1, type: 'practice_tick', ids: ['p:zazen'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['p:walking'], numbers: {} },
    ],
    last_harvest_index: -1,
    bay: null,
    archive: [
      {
        schema_version: 'manifest/v0',
        id: 'm-0-1',
        rng_seed: '42',
        brief: null,
        residue_window_id: 'w-1-3-3',
        kind: 'person',
        name: 'The night clerk',
        one_liner: 'Remembers what you owe before you do.',
        subject: 'a keeper of small debts',
        detail: 'The ledger stays open at strange hours.',
        tags: ['clerk'],
        rarity: 'common',
        fill_status: 'table',
        quality_tier: 0,
        provenance: { source: 'table', revision: 'table/v0' },
      },
    ],
    quality_tier: 0,
    harvest_count: 1,
  },
  idle: { mode: 'idle', last_simulated_tick: '0', total_idle_ticks: '0' },
  life: { turn: 0, resources: {}, skills: {}, residue: [] },
  practices: [],
} as const;

describe('parseStudioSession v0 migration', () => {
  it('wraps the v0 bay as the person bench', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.schema_version).toBe('studio_session/v1');
    expect(session.benches['person']?.harvest_count).toBe(1);
    expect(session.benches['person']?.residue).toHaveLength(2);
  });

  it('hoists the archive and migrates its manifests to v1', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.archive).toHaveLength(1);
    expect(session.archive[0]?.schema_version).toBe('manifest/v1');
    expect(session.archive[0]?.scale).toBe('person');
  });

  it('seeds the person tier state and empty progression', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.tiers['person']?.unlocked).toBe(true);
    expect(session.tiers['person']?.roster.members).toEqual([]);
    expect(session.milestones_done).toEqual([]);
    expect(session.compendium_done).toEqual([]);
    expect(session.embodied_member).toBeNull();
  });

  it('hydrates a migrated session into today’s runtime shape', () => {
    const session = parseStudioSession(V0_SESSION);
    const hydrated = hydrateStudioSession(session, emptyHydratedSession().life, []);
    expect(hydrated.studio.harvest_count).toBe(1);
    expect(hydrated.studio.archive).toHaveLength(1);
    expect(hydrated.studio.residue).toHaveLength(2);
    expect(hydrated.progression.tiers['person']?.unlocked).toBe(true);
  });
});

describe('v1 round-trip', () => {
  it('snapshot -> parse -> hydrate preserves the bench and archive', () => {
    const base = emptyHydratedSession();
    const snapshot = snapshotStudioSession(base.studio, base.idle, base.life, base.practices);
    expect(snapshot.schema_version).toBe('studio_session/v1');
    const parsed = parseStudioSession(JSON.parse(JSON.stringify(snapshot)));
    const hydrated = hydrateStudioSession(parsed, base.life, []);
    expect(hydrated.studio).toEqual(createStudioState());
    expect(hydrated.progression).toEqual(defaultProgression());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run src/engine/__tests__/studio-session-v1.test.ts`
Expected: FAIL — v1 surface does not exist (`benches`, `defaultProgression`).

- [ ] **Step 3: Create tier-state.ts**

Create `src/engine/tier-state.ts`:

```ts
// Tier state — per-tier progression slice of the studio session.
// Roster members arrive in Phase 1; the schema ships now so sessions are
// forward-compatible. Pure: no Date, no platform APIs.

import { z } from 'zod';

export const TIER_STATE_VERSION = 'tier_state/v0' as const;

export const RosterMemberSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    policy: z.string().min(1),
    embodied: z.boolean(),
    focus_id: z.string().min(1).optional(),
    seed: z.number().int(),
  })
  .strict();
export type RosterMember = z.infer<typeof RosterMemberSchema>;

export const RosterSchema = z
  .object({
    tier: z.string().min(1),
    members: z.array(RosterMemberSchema),
  })
  .strict();
export type Roster = z.infer<typeof RosterSchema>;

export const ActiveVisitorSchema = z
  .object({
    id: z.string().min(1),
    windows_left: z.number().int().min(0),
  })
  .strict();
export type ActiveVisitor = z.infer<typeof ActiveVisitorSchema>;

export const TierStateSchema = z
  .object({
    schema_version: z.literal(TIER_STATE_VERSION),
    tier: z.string().min(1),
    unlocked: z.boolean(),
    roster: RosterSchema,
    endowed: z.array(z.string().min(1)),
    active_visitor: ActiveVisitorSchema.nullable(),
  })
  .strict();
export type TierState = z.infer<typeof TierStateSchema>;

export function createTierState(tier: string, unlocked: boolean): TierState {
  return {
    schema_version: TIER_STATE_VERSION,
    tier,
    unlocked,
    roster: { tier, members: [] },
    endowed: [],
    active_visitor: null,
  };
}
```

- [ ] **Step 4: Create studio-session-v0.ts**

Create `src/engine/studio-session-v0.ts`. Move `ResidueEventSchema`, `DevelopOperationSchema`, and the v0 `StudioStateSchema` out of `studio-session.ts` into this file (verbatim), renamed as below, and add the migration. Note the type-only back-edge: `studio-session-v0` imports the `StudioSession` **type** from `./studio-session` while `studio-session` imports values from `./studio-session-v0`; the type import is erased at compile time, so there is no runtime import cycle. Do not add a value import in that direction.

```ts
// Legacy studio_session/v0 schema and its migration to v1.
//
// This module also owns the shared leaf schemas (residue events, develop
// operations) reused by the v1 session — they originated with v0 and have
// not changed shape. Pure: no Date, no platform APIs.

import { z } from 'zod';

import { parseManifest } from './manifest-migration';
import { createTierState } from './tier-state';
import type { StudioSession } from './studio-session';

export const STUDIO_SESSION_V0_VERSION = 'studio_session/v0' as const;

export const ResidueEventSchema = z
  .object({
    tick: z.number().int(),
    type: z.enum([
      'practice_tick',
      'practice_level',
      'lens_chosen',
      'event_resolved',
      'resource_edge',
      'life_ended',
    ]),
    ids: z.array(z.string()),
    numbers: z.record(z.string(), z.number()),
  })
  .strict();

export const DevelopOperationSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('develop_from_residue'),
    residue_window_id: z.string().min(1),
    residue: z.array(ResidueEventSchema),
    brief: z.string().nullable(),
    cook_ticks_total: z.number().int().nonnegative(),
    cook_ticks_done: z.number().int().nonnegative(),
    status: z.enum(['cooking', 'ready', 'harvested']),
    rng_seed: z.string().min(1),
    focus: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        kind: z.enum(['person', 'place']),
        one_liner: z.string().min(1),
      })
      .nullable()
      .optional(),
  })
  .strict();

const PlayImportSchema = z
  .object({
    life_id: z.string().min(1),
    index: z.number().int().min(-1),
  })
  .strict();

const PinnedSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['person', 'place']),
    one_liner: z.string().min(1),
  })
  .strict();

const StudioStateV0Schema = z
  .object({
    residue: z.array(ResidueEventSchema),
    last_harvest_index: z.number().int().min(-1),
    bay: DevelopOperationSchema.nullable(),
    archive: z.array(z.unknown()),
    quality_tier: z.number().int().min(0),
    harvest_count: z.number().int().min(0),
    play_import: PlayImportSchema.nullable().optional(),
    pinned: PinnedSchema.nullable().optional(),
    surplus: z.number().int().min(0).optional(),
  })
  .strict();

export const IdleSliceSchema = z
  .object({
    mode: z.enum(['idle', 'decision']),
    last_simulated_tick: z.string().regex(/^-?\d+$/),
    total_idle_ticks: z.string().regex(/^-?\d+$/),
  })
  .strict();

export const LifeSliceSchema = z
  .object({
    turn: z.number().int().nonnegative(),
    resources: z.record(z.string(), z.number()),
    skills: z.record(z.string(), z.number()),
    residue: z.array(ResidueEventSchema),
  })
  .strict();

export const PracticeSliceSchema = z
  .object({
    id: z.string().min(1),
    currentProgress: z.number(),
    level: z.number().int().nonnegative(),
  })
  .strict();

export const StudioSessionV0Schema = z
  .object({
    schema_version: z.literal(STUDIO_SESSION_V0_VERSION),
    studio: StudioStateV0Schema,
    idle: IdleSliceSchema,
    life: LifeSliceSchema,
    practices: z.array(PracticeSliceSchema),
    last_visited_at_unix: z.number().optional(),
  })
  .strict();

export type StudioSessionV0 = z.infer<typeof StudioSessionV0Schema>;

/**
 * Wrap the v0 single-bay session as the person bench of a v1 session.
 * The archive is hoisted to the top level and each card is migrated to
 * manifest/v1; a card that fails to parse fails the whole migration loudly.
 */
export function migrateStudioSessionV0(v0: StudioSessionV0): StudioSession {
  return {
    schema_version: 'studio_session/v1',
    benches: {
      person: {
        residue: v0.studio.residue,
        last_harvest_index: v0.studio.last_harvest_index,
        bay: v0.studio.bay,
        quality_tier: v0.studio.quality_tier,
        harvest_count: v0.studio.harvest_count,
        play_import: v0.studio.play_import ?? null,
        pinned: v0.studio.pinned ?? null,
        surplus: v0.studio.surplus ?? 0,
      },
    },
    archive: v0.studio.archive.map((card) => parseManifest(card)),
    tiers: { person: createTierState('person', true) },
    milestones_done: [],
    compendium_done: [],
    embodied_member: null,
    idle: v0.idle,
    life: v0.life,
    practices: v0.practices,
    ...(v0.last_visited_at_unix === undefined
      ? {}
      : { last_visited_at_unix: v0.last_visited_at_unix }),
  };
}
```

Note: `archive: z.array(z.unknown())` in the v0 studio schema is deliberate — cards are validated individually by `parseManifest` during migration, so a mixed-age archive migrates card-by-card.

- [ ] **Step 5: Rewrite studio-session.ts as v1**

Replace the contents of `src/engine/studio-session.ts` with:

```ts
// Studio session snapshot — durable bench state, not the life-chain SaveBlob.
//
// v1: benches keyed by tier id, a shared archive, per-tier progression state.
// v0 payloads are migrated by ./studio-session-v0. Pure: no Date, no
// platform APIs. Bigints are decimal strings. Invalid payloads throw so the
// persistence layer can treat them as absent.

import { z } from 'zod';

import { createIdleState } from './idle';
import { ManifestSchema } from './manifest';
import { parseManifest } from './manifest-migration';
import { createStudioState, type StudioState } from './operations';
import { createLifeState } from './reducer';
import {
  DevelopOperationSchema,
  IdleSliceSchema,
  LifeSliceSchema,
  PracticeSliceSchema,
  ResidueEventSchema,
  STUDIO_SESSION_V0_VERSION,
  StudioSessionV0Schema,
  migrateStudioSessionV0,
} from './studio-session-v0';
import { TierStateSchema, createTierState, type TierState } from './tier-state';
import type { IdleState, LifeState, Practice } from './types';

export const STUDIO_SESSION_VERSION = 'studio_session/v1' as const;

const PlayImportSchema = z
  .object({
    life_id: z.string().min(1),
    index: z.number().int().min(-1),
  })
  .strict();

const PinnedSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['person', 'place']),
    one_liner: z.string().min(1),
  })
  .strict();

const BenchSchema = z
  .object({
    residue: z.array(ResidueEventSchema),
    last_harvest_index: z.number().int().min(-1),
    bay: DevelopOperationSchema.nullable(),
    quality_tier: z.number().int().min(0),
    harvest_count: z.number().int().min(0),
    play_import: PlayImportSchema.nullable(),
    pinned: PinnedSchema.nullable(),
    surplus: z.number().int().min(0),
  })
  .strict();

export type BenchState = z.infer<typeof BenchSchema>;

const EmbodiedMemberSchema = z
  .object({
    tier: z.string().min(1),
    member: z.string().min(1),
  })
  .strict();

export const StudioSessionSchema = z
  .object({
    schema_version: z.literal(STUDIO_SESSION_VERSION),
    benches: z.record(z.string(), BenchSchema),
    archive: z.array(z.preprocess((card) => parseManifest(card), ManifestSchema)),
    tiers: z.record(z.string(), TierStateSchema),
    milestones_done: z.array(z.string().min(1)),
    compendium_done: z.array(z.string().min(1)),
    embodied_member: EmbodiedMemberSchema.nullable(),
    idle: IdleSliceSchema,
    life: LifeSliceSchema,
    practices: z.array(PracticeSliceSchema),
    last_visited_at_unix: z.number().optional(),
  })
  .strict();

export type StudioSession = z.infer<typeof StudioSessionSchema>;

export interface SessionProgression {
  readonly tiers: Readonly<Record<string, TierState>>;
  readonly milestones_done: readonly string[];
  readonly compendium_done: readonly string[];
  readonly embodied_member: { readonly tier: string; readonly member: string } | null;
}

export function defaultProgression(): SessionProgression {
  return {
    tiers: { person: createTierState('person', true) },
    milestones_done: [],
    compendium_done: [],
    embodied_member: null,
  };
}

export function snapshotStudioSession(
  studio: StudioState,
  idle: IdleState,
  life: LifeState,
  practices: readonly Practice[],
  lastVisitedAtUnix?: number,
  progression: SessionProgression = defaultProgression(),
): StudioSession {
  return StudioSessionSchema.parse({
    schema_version: STUDIO_SESSION_VERSION,
    benches: {
      person: {
        residue: studio.residue,
        last_harvest_index: studio.last_harvest_index,
        bay: studio.bay,
        quality_tier: studio.quality_tier,
        harvest_count: studio.harvest_count,
        play_import: studio.play_import,
        pinned: studio.pinned,
        surplus: studio.surplus,
      },
    },
    archive: studio.archive,
    tiers: progression.tiers,
    milestones_done: progression.milestones_done,
    compendium_done: progression.compendium_done,
    embodied_member: progression.embodied_member,
    idle: {
      mode: idle.mode,
      last_simulated_tick: idle.lastSimulatedTick.toString(10),
      total_idle_ticks: idle.totalIdleTicks.toString(10),
    },
    life: {
      turn: life.turn,
      resources: { ...life.resources },
      skills: { ...life.skills },
      residue: [...(life.residue ?? [])],
    },
    practices: practices.map((p) => ({
      id: p.id,
      currentProgress: p.currentProgress,
      level: p.level,
    })),
    ...(lastVisitedAtUnix === undefined ? {} : { last_visited_at_unix: lastVisitedAtUnix }),
  });
}

/** Parse a session payload of any supported version, migrating v0 to v1. */
export function parseStudioSession(raw: unknown): StudioSession {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { schema_version?: unknown }).schema_version === STUDIO_SESSION_V0_VERSION
  ) {
    return migrateStudioSessionV0(StudioSessionV0Schema.parse(raw));
  }
  return StudioSessionSchema.parse(raw);
}

export interface HydratedStudioSession {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: Practice[];
  readonly progression: SessionProgression;
}

/** Overlay a snapshot onto a fresh bench (identity/era stay on `baseLife`). */
export function hydrateStudioSession(
  session: StudioSession,
  baseLife: LifeState,
  packPractices: readonly Practice[],
): HydratedStudioSession {
  const progress = new Map(session.practices.map((p) => [p.id, p]));
  const practices = packPractices.map((practice) => {
    const saved = progress.get(practice.id);
    if (saved === undefined) {
      return practice;
    }
    return {
      ...practice,
      currentProgress: saved.currentProgress,
      level: saved.level,
    };
  });
  const idle: IdleState = {
    mode: session.idle.mode,
    lastSimulatedTick: BigInt(session.idle.last_simulated_tick),
    totalIdleTicks: BigInt(session.idle.total_idle_ticks),
  };
  const life: LifeState = {
    ...baseLife,
    turn: session.life.turn,
    resources: { ...baseLife.resources, ...session.life.resources },
    skills: { ...session.life.skills },
    residue: session.life.residue,
  };
  const bench = session.benches['person'];
  const base = createStudioState();
  const studio: StudioState =
    bench === undefined
      ? { ...base, archive: session.archive }
      : {
          residue: bench.residue,
          last_harvest_index: bench.last_harvest_index,
          bay: bench.bay === null ? null : { ...bench.bay, focus: bench.bay.focus ?? null },
          archive: session.archive,
          quality_tier: bench.quality_tier,
          harvest_count: bench.harvest_count,
          play_import: bench.play_import,
          pinned: bench.pinned,
          surplus: bench.surplus,
        };
  return {
    studio,
    idle,
    life,
    practices,
    progression: {
      tiers: session.tiers,
      milestones_done: session.milestones_done,
      compendium_done: session.compendium_done,
      embodied_member: session.embodied_member,
    },
  };
}

/** Empty session helpers for tests that need a known baseline. */
export function emptyHydratedSession(baseLife?: LifeState): HydratedStudioSession {
  const life =
    baseLife ??
    createLifeState({
      id: 'studio-bench' as LifeState['id'],
      era: 'studio-bench@0.1.0' as LifeState['era'],
      role: 'operator' as LifeState['role'],
      identity: {
        gender: 'unspecified',
        social_class: 'operator',
        family_wealth_at_birth: 'unspecified',
        caste_status: 'none',
        disability_status: 'none',
      },
    });
  return {
    studio: createStudioState(),
    idle: createIdleState(),
    life,
    practices: [],
    progression: defaultProgression(),
  };
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run src/engine/__tests__/studio-session-v1.test.ts src/engine/__tests__/studio-session.test.ts src/persistence/__tests__/studio-kv.test.ts src/ui/__tests__/StudioView.test.tsx`
Expected: PASS (all). The pre-existing session/kv/UI tests confirm the person-tier surface is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/engine/tier-state.ts src/engine/studio-session-v0.ts src/engine/studio-session.ts src/engine/__tests__/studio-session-v1.test.ts
git commit -m "feat(engine): persist studio session v1 with benches, tiers, and v0 migration"
```

---

### Task 8: Barrel exports and full gate

**Files:**

- Modify: `src/engine/index.ts`

**Interfaces:**

- Produces: public exports for all Phase 0 engine surface.

- [ ] **Step 1: Add the exports**

In `src/engine/index.ts`:

1. In the `./manifest` value-export block, add `SCALE_VALUES` and `MANIFEST_LEGACY_VERSION`. In the `./manifest` type-export block, add `ManifestScale`.
2. Append:

```ts
export {
  DEFAULT_KIND_RULES,
  isSocialWindow,
  isSpatialWindow,
  pickKindFromRegistry,
} from './kind-registry';
export type { CoreManifestKind, KindMatch, KindRule } from './kind-registry';
export { migrateManifestV0, parseManifest } from './manifest-migration';
export type { ManifestV0 } from './manifest-migration';
export {
  TIER_STATE_VERSION,
  ActiveVisitorSchema,
  RosterMemberSchema,
  RosterSchema,
  TierStateSchema,
  createTierState,
} from './tier-state';
export type { ActiveVisitor, Roster, RosterMember, TierState } from './tier-state';
export { migrateStudioSessionV0, STUDIO_SESSION_V0_VERSION } from './studio-session-v0';
export { defaultProgression } from './studio-session';
export type { BenchState, SessionProgression } from './studio-session';
```

- [ ] **Step 2: Run the full gate**

Run, in order, each expected to pass:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Expected: `tsc` exits 0; eslint reports no errors; the entire vitest suite is green. Any failure in a file this plan touched is in scope to fix; pre-existing failures elsewhere are noted, not fixed.

- [ ] **Step 3: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat(engine): export the progression foundation from the barrel"
```

---

## Self-Review Notes (completed by the plan author)

- **Spec coverage:** Phase 0 in the design doc maps to Tasks 1–8: progression schemas+loader+lint (4–6), kind registry wired into compile (1), `manifest/v1` + migration (2), adapter threading (3), `studio_session/v1` + migration (7), barrel (8). Roster _runtime_, milestone evaluation, embodiment, and UI are Phases 1–3 and intentionally absent.
- **Type consistency:** `KindMatch`/`KindRule` (Task 1) are the same shapes consumed by the loader (Task 5) and `tableFillManifest` (Task 2). `SessionProgression`/`defaultProgression` defined and used only in Task 7. `parseManifest` defined Task 2, used Tasks 3 and 7.
- **Import direction:** `kind-registry` → `residue` only; `manifest` → `kind-registry`; `fill-adapter` → `manifest-migration` → `manifest`; `studio-session` → `studio-session-v0` → (`manifest-migration`, `tier-state`); `content/progression` → engine types. No cycles.
- **Known deliberate deviations from the design doc:** milestone predicates use a compact dedicated `ArchivePredicate` union (not the `LifeState` predicate engine) because archive stats are not `LifeState`; the evaluator lands in Phase 1 with the unlock flow.
