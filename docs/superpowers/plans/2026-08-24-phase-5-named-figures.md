# Phase 5: Named Figures on the Bench — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cooked window whose residue names a figure (or a practice bound to one) harvests a card named for that figure — pinable, with `about_id` — per SPEC §16.1.

**Architecture:** Figure rows land in a new engine data file composed into `CATALOG` (and mirrored into progression `catalogs.json5`, which a test pins entry-for-entry against the engine tables). `tableFillManifest` gains a preference pass: any catalog row whose tags intersect the residue window's `ids[]` (and carries a `figure:*` tag) wins over the plain table pick, overriding `kind` to the row's table and pinning `about_id`/`about_name`. A new nianfo practice (bound to Amitābha by tag) carried on the monastic-day schedule makes the binding reachable in real play. The last three Bhadrakalpa figures land with SIDs. SPEC §14's false "(done)" claims are corrected.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`), Vitest, JSON5 content, Zod schemas.

## Global Constraints

- `src/engine/` is pure: no react/expo imports, no `Date.now`/`new Date`, no `Math.random`, no `fetch`, no `process.env`, no `console`.
- No `as any`, no `@ts-ignore`/`@ts-expect-error`, no empty `catch`.
- Optional properties: omit the key; spread only when defined: `...(x === undefined ? {} : { x })`.
- Engine files stay under ~250 LOC — that is why figure rows live in a new file, not appended to `manifest-catalog.ts` (257 lines).
- Residue stays ids and numbers. Figure ids ride `ids[]`; names are compiled. Catalog rows are plain strings (not SIDs).
- Figure prose: descriptive (iconography, role, Tang context), never doctrinal claims, never fabricated sayings. Real names.
- `src/content/progression/base/catalogs.json5` must mirror the engine `person`/`place` tables exactly (`catalogs.test.ts` asserts `toEqual` for the five core kinds).
- Keys/env: none. This phase touches no secrets, no network, no `src/ai`.
- Gate: `node node_modules/typescript/bin/tsc --noEmit` exit 0, `pnpm lint` 0 errors, `pnpm test` all green. Do NOT use `pnpm tsc` (misbehaves).
- Commit only the files each task names. NEVER `git add -A`. Imperative commit messages.
- Determinism: every rng draw stays seeded. The figure-preference branch consumes exactly one `rng.pick` (same count as the plain branch), so same-seed-same-card holds; widening `person`/`place` tables legitimately shifts which entry a fixed seed selects — if a test pinned a specific generic name for a non-figure window, re-pin it to the new deterministic value with a one-line justification comment.

---

### Task 1: Figure catalog rows (engine + progression mirror)

**Files:**

- Create: `src/engine/manifest-catalog-figures.ts`
- Modify: `src/engine/manifest-catalog.ts` (compose figure rows into `CATALOG`)
- Modify: `src/content/progression/base/catalogs.json5` (append identical rows to `person` and `place` blocks)
- Test: `src/engine/__tests__/manifest-catalog-figures.test.ts`

**Interfaces:**

- Consumes: `CatalogEntry` from `src/engine/manifest-catalog.ts` (shape: `{name, one_liner, subject, detail, tags}`).
- Produces: `FIGURE_PEOPLE: readonly CatalogEntry[]` (12 rows), `FIGURE_PLACES: readonly CatalogEntry[]` (2 rows) — Tasks 2/3 rely on the tag tokens `figure:<id>` (one per row) and `practice:tang/nianfo-recitation` (Amitābha row).

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/manifest-catalog-figures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { CATALOG } from '../manifest-catalog';
import { FIGURE_IDS, FIGURE_PEOPLE, FIGURE_PLACES } from '../manifest-catalog-figures';

describe('figure catalog rows (SPEC 16.1)', () => {
  it('ships twelve figure person rows, each tagged with exactly one figure id', () => {
    expect(FIGURE_PEOPLE).toHaveLength(12);
    for (const row of FIGURE_PEOPLE) {
      const figTags = row.tags.filter((t) => t.startsWith('figure:'));
      expect(figTags).toHaveLength(1);
      expect(FIGURE_IDS).toContain(figTags[0] ?? '');
      expect(CATALOG.person).toContain(row);
    }
  });

  it('ships two site place rows tagged to their figures', () => {
    expect(FIGURE_PLACES).toHaveLength(2);
    const figTags = FIGURE_PLACES.map((r) => r.tags.find((t) => t.startsWith('figure:')));
    expect(figTags).toEqual(['figure:manjushri', 'figure:ksitigarbha']);
    for (const row of FIGURE_PLACES) {
      expect(CATALOG.place).toContain(row);
    }
  });

  it('keeps the eight generic person rows and six generic place rows as fallbacks', () => {
    expect(CATALOG.person).toHaveLength(20); // 8 generic + 12 figures
    expect(CATALOG.place).toHaveLength(8); // 6 generic + 2 sites
  });

  it('binds the nianfo practice and mantras by tag', () => {
    const amitabha = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:amitabha'));
    expect(amitabha?.tags).toContain('mantra:nianfo');
    expect(amitabha?.tags).toContain('practice:tang/nianfo-recitation');
    const guanyin = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:avalokiteshvara'));
    expect(guanyin?.tags).toContain('mantra:six-syllable');
    const medicine = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:medicine-buddha'));
    expect(medicine?.tags).toContain('mantra:medicine-buddha');
  });

  it('caps every figure row at five tags with non-empty prose', () => {
    for (const row of [...FIGURE_PEOPLE, ...FIGURE_PLACES]) {
      expect(row.tags.length).toBeLessThanOrEqual(5);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.one_liner.length).toBeGreaterThan(0);
      expect(row.subject.length).toBeGreaterThan(0);
      expect(row.detail.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/engine/__tests__/manifest-catalog-figures.test.ts`
Expected: FAIL — cannot resolve `../manifest-catalog-figures`.

- [ ] **Step 3: Write `src/engine/manifest-catalog-figures.ts`**

```ts
// Named-figure catalog rows (SPEC §16.1). Each row carries exactly one
// `figure:<id>` tag; other tags bind the mantras and practices that name the
// figure, so the compiler can prefer the row when residue carries those ids.
// Prose is descriptive — iconography, role, Tang context — never doctrinal
// claims and never fabricated sayings. Pure data, like manifest-catalog.

import type { CatalogEntry } from './manifest-catalog';

/** The twelve core Tang figures, in figures.json5 order. */
export const FIGURE_IDS = [
  'figure:shakyamuni',
  'figure:amitabha',
  'figure:medicine-buddha',
  'figure:vairocana',
  'figure:maitreya',
  'figure:avalokiteshvara',
  'figure:manjushri',
  'figure:samantabhadra',
  'figure:ksitigarbha',
  'figure:mahasthamaprapta',
  'figure:nagarjuna',
  'figure:bodhidharma',
] as const;

export const FIGURE_PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Śākyamuni',
    one_liner: 'The historical teacher, seated at the center of every hall.',
    subject: 'the historical teacher',
    detail:
      "Chang'an's monasteries seat him as the teacher of our era. The robe, the ushṇīṣa, the earth-touching gesture — fixed long before the Tang, and every school bows to the same form.",
    tags: ['figure:shakyamuni', 'teacher', 'historical'],
  },
  {
    name: 'Amitābha',
    one_liner: 'The Buddha of the Western direction, recited by name.',
    subject: 'the Buddha of the western direction',
    detail:
      "Pure Land halls in Chang'an chant his name through the day. The hand holds a lotus; the face waits for whoever looks west.",
    tags: ['figure:amitabha', 'mantra:nianfo', 'practice:tang/nianfo-recitation', 'western'],
  },
  {
    name: 'Bhaiṣajyaguru, the Medicine Buddha',
    one_liner: 'Called on when someone is sick.',
    subject: 'a healer of the sick',
    detail:
      'Tang monasteries held his rite for the ill. The bowl holds medicine, not gold, and the hand that lifts it does not ask who can pay.',
    tags: ['figure:medicine-buddha', 'mantra:medicine-buddha', 'healing'],
  },
  {
    name: 'Vairocana',
    one_liner: 'The cosmic Buddha the Huayan masters placed at the source.',
    subject: 'the cosmic Buddha',
    detail:
      'In Huayan halls he sits at the center of the array, and every other figure arranges itself around him like light around a lamp.',
    tags: ['figure:vairocana', 'cosmic', 'huayan'],
  },
  {
    name: 'Maitreya',
    one_liner: 'The future teacher, waiting in Tuṣita.',
    subject: 'the coming teacher',
    detail:
      'He is honored now for a patience the world has not needed yet. Tang sculptors give him a seat already, so the room is ready when he stands.',
    tags: ['figure:maitreya', 'future', 'patience'],
  },
  {
    name: 'Avalokiteśvara (Guanyin)',
    one_liner: 'The bodhisattva of great compassion, known here as Guanyin.',
    subject: 'the one who hears the cries',
    detail:
      "The Lotus Sutra's universal gate chapter reached Chang'an as Guanyin. A willow branch, a vase of water, and a willingness to arrive in whatever shape the hour needs.",
    tags: ['figure:avalokiteshvara', 'mantra:six-syllable', 'compassion', 'guanyin'],
  },
  {
    name: 'Mañjuśrī (Wenshu)',
    one_liner: 'The bodhisattva whose sword cuts confusion.',
    subject: 'wielding discriminative wisdom',
    detail: 'Wutai Shan in the north is his seat. The sword is not raised at anyone; it is raised at the knot.',
    tags: ['figure:manjushri', 'wisdom', 'sword', 'wutai'],
  },
  {
    name: 'Samantabhadra (Puxian)',
    one_liner: 'The bodhisattva of great practice, riding the six-tusked elephant.',
    subject: 'practice carried through',
    detail:
      'The Lotus Sutra closes with him. Where Mañjuśrī cuts, he walks the ground afterward and makes the path real.',
    tags: ['figure:samantabhadra', 'practice', 'elephant'],
  },
  {
    name: 'Kṣitigarbha (Dizang)',
    one_liner: 'The bodhisattva who stays until the last cell opens.',
    subject: 'the great vow held',
    detail:
      'Dizang in Tang China, strongest at Jiuhua Shan. The staff rings in the places no one else goes, and he does not leave early.',
    tags: ['figure:ksitigarbha', 'vow', 'dizang'],
  },
  {
    name: 'Mahāsthāmaprāpta (Dashizhi)',
    one_liner: 'One of the three sages of the West, standing beside Amitābha.',
    subject: 'the power of wisdom arriving',
    detail:
      'Dashizhi in Chinese halls, less carved than his companions and named exactly as often in the sutras.',
    tags: ['figure:mahasthamaprapta', 'wisdom', 'western'],
  },
  {
    name: 'Nāgārjuna',
    one_liner: 'The teacher whose arguments grounded the Prajñāpāramitā.',
    subject: 'a founder of the middle way',
    detail:
      'Tang scholastics read him as the fourteenth patriarch of the lineages Chan claimed. The works are older than the claim and outlast it.',
    tags: ['figure:nagarjuna', 'teacher', 'madhyamaka'],
  },
  {
    name: 'Bodhidharma',
    one_liner: 'The teacher who came from the west and sat facing a wall.',
    subject: 'the first patriarch of Chan',
    detail:
      'Wall-gazing, one sandal, and a refusal to explain what can be done instead of said. Tang Chan traces its beginning to his arrival.',
    tags: ['figure:bodhidharma', 'chan', 'teacher'],
  },
];

export const FIGURE_PLACES: readonly CatalogEntry[] = [
  {
    name: 'Wutai Shan',
    one_liner: 'The northern mountain revered as Mañjuśrī's seat.',
    subject: 'a mountain of wisdom',
    detail:
      'Pilgrims climb past terraces where the sword is said to have been seen. The cold is part of the teaching, the way the climb is part of the arrival.',
    tags: ['figure:manjushri', 'mountain', 'pilgrimage'],
  },
  {
    name: 'Jiuhua Shan',
    one_liner: 'The southern mountain of Kṣitigarbha's great vow.',
    subject: 'a mountain of the vow',
    detail:
      'Mist, stone steps, and a bell that the visitor from Korea is said to have rung first. The ground holds the promise longer than the season.',
    tags: ['figure:ksitigarbha', 'mountain', 'vow'],
  },
];
```

Note: fix the two apostrophes inside single-quoted strings (`Mañjuśrī's`, `Kṣitigarbha's`) by using double quotes for those two `one_liner` values — the linter will catch it if you copy verbatim.

- [ ] **Step 4: Compose into `CATALOG` in `src/engine/manifest-catalog.ts`**

Add after the `PLACES` array, before `CATALOG`:

```ts
import { FIGURE_PEOPLE, FIGURE_PLACES } from './manifest-catalog-figures';
```

(Place the import with the other imports at the top; there are no imports besides the type — add it as the first import.)

Change the `CATALOG` export:

```ts
export const CATALOG: Readonly<Record<string, readonly CatalogEntry[]>> = {
  thing: THINGS,
  outcome: OUTCOMES,
  change: CHANGES,
  person: [...PEOPLE, ...FIGURE_PEOPLE],
  place: [...PLACES, ...FIGURE_PLACES],
};
```

- [ ] **Step 5: Mirror the rows into `src/content/progression/base/catalogs.json5`**

Append the same 12 rows (byte-identical prose and tags) to the `kind: 'person'` block's `entries`, and the same 2 rows to the `kind: 'place'` block's `entries`. The file header says it mirrors the engine tables — keep them identical.

- [ ] **Step 6: Run the new test, then the full gate**

Run: `pnpm vitest run src/engine/__tests__/manifest-catalog-figures.test.ts`
Expected: PASS (6 tests).

Run: `pnpm vitest run src/content/progression/__tests__/catalogs.test.ts`
Expected: PASS — the mirror assertion `toEqual` proves both files match.

Run full gate: `node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green. If a golden test pinned a specific generic `person`/`place` name for a non-figure window (the table widened, so a fixed seed now selects a different row), re-pin that expectation to the new deterministic value with a one-line comment: `// table widened by figure rows; same seed still selects deterministically`.

- [ ] **Step 7: Commit**

```bash
git add src/engine/manifest-catalog-figures.ts src/engine/manifest-catalog.ts src/content/progression/base/catalogs.json5 src/engine/__tests__/manifest-catalog-figures.test.ts
git commit -m "feat(engine): put the twelve Tang figures on the bench"
```

(Plus any re-pinned golden test files, if Step 6 required them.)

---

### Task 2: Figure preference in `tableFillManifest`

**Files:**

- Modify: `src/engine/manifest.ts:117-186` (`tableFillManifest`)
- Test: `src/engine/__tests__/figure-pick.test.ts` (new)

**Interfaces:**

- Consumes: Task 1's tags (`figure:*`, `practice:tang/nianfo-recitation`, `mantra:*`) on catalog rows; `ResidueSummary.ids` from `residue.ts`.
- Produces: behavior — when any catalog row carrying a `figure:*` tag also carries a tag present in `summary.ids`, `tableFillManifest` returns that figure's card: `kind` becomes the row's table kind, `about_id`/`about_name` pin to the figure (when no `focus` is set), subject suffixes the figure id's last segment. Task 3's bridge test relies on exactly this.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/figure-pick.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { tableFillManifest } from '../manifest';
import type { CatalogMap } from '../table-catalog';
import type { ResidueEvent } from '../residue';
import { createRng } from '../rng';

function event(tick: number, ids: string[]): ResidueEvent {
  return { tick, type: 'practice_tick', ids, numbers: { progress: 1 } };
}

describe('figure-tagged catalog preference (SPEC 16.1)', () => {
  it('harvests the named figure when residue names its id', () => {
    const window = [event(1, ['figure:avalokiteshvara'])];
    const m = tableFillManifest(window, null, 0, createRng(7n), 's1', 'm-1');
    expect(m.name).toBe('Avalokiteśvara (Guanyin)');
    expect(m.kind).toBe('person');
    expect(m.about_id).toBe('figure:avalokiteshvara');
    expect(m.about_name).toBe('Avalokiteśvara (Guanyin)');
    expect(m.subject).toContain('avalokiteshvara');
  });

  it('matches a figure-bound practice id and names its figure', () => {
    const window = [
      event(1, ['practice:tang/nianfo-recitation']),
      event(2, ['practice:tang/nianfo-recitation']),
    ];
    const m = tableFillManifest(window, null, 0, createRng(11n), 's2', 'm-2');
    expect(m.name).toBe('Amitābha');
    expect(m.about_id).toBe('figure:amitabha');
  });

  it('keeps the plain table pick when nothing matches', () => {
    const window = [event(1, ['practice.test'])];
    const m = tableFillManifest(window, null, 0, createRng(3n), 's3', 'm-3');
    expect(m.fill_status).toBe('table');
    expect(m.about_id).toBeUndefined();
  });

  it('prefers the pinned focus over the figure for about_id', () => {
    const window = [event(1, ['figure:amitabha'])];
    const focus = { id: 'focus:x', kind: 'practice', name: 'The evening hour' };
    const m = tableFillManifest(window, null, 0, createRng(5n), 's4', 'm-4', focus);
    expect(m.about_id).toBe('focus:x');
  });

  it('is deterministic per seed', () => {
    const window = [event(1, ['figure:avalokiteshvara', 'mantra:six-syllable'])];
    const a = tableFillManifest(window, null, 0, createRng(42n), 's5', 'm-a');
    const b = tableFillManifest(window, null, 0, createRng(42n), 's5', 'm-b');
    expect(a).toEqual(b);
  });

  it('does not figure-match inside a swapped visitor table', () => {
    const entries = [
      {
        name: 'The seated guest',
        one_liner: 'v',
        subject: 'v',
        detail: 'v',
        tags: ['visitor'],
      },
    ];
    const swapped = new Proxy({}, { get: () => entries }) as CatalogMap;
    const m = tableFillManifest(
      [event(1, ['figure:amitabha'])],
      null,
      0,
      createRng(5n),
      's6',
      'm-5',
      null,
      null,
      'person',
      undefined,
      swapped,
    );
    expect(m.name).toBe('The seated guest');
    expect(m.about_id).toBeUndefined();
  });
});
```

Note: the `focus` shape above must match `ManifestFocus` in `src/engine/focus.ts` — read it and adjust the literal (kind union, required fields) so the object typechecks without casts.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/engine/__tests__/figure-pick.test.ts`
Expected: FAIL — first two tests return generic rows (`m.name` is not the figure).

- [ ] **Step 3: Implement the preference pass in `src/engine/manifest.ts`**

Add to imports:

```ts
import type { CatalogEntry, CatalogMap } from './table-catalog';
```

(Replace the existing `import type { CatalogMap } from './table-catalog';`.)

Add above `tableFillManifest`:

```ts
/** A catalog row that names a figure and matches a residue id (SPEC §16.1). */
interface FigureCandidate {
  readonly kind: string;
  readonly entry: CatalogEntry;
  readonly figureId: string;
}

/**
 * Rows whose tags reference an id the residue window carries. Only rows
 * tagged `figure:*` are candidates; the visitor table swap (a Proxy with no
 * own keys) yields none, which preserves the swap's replace-not-merge rule.
 */
function figureCandidates(summary: ResidueSummary, catalog: CatalogMap): FigureCandidate[] {
  const out: FigureCandidate[] = [];
  for (const [kind, entries] of Object.entries(catalog)) {
    for (const entry of entries) {
      const figureTag = entry.tags.find((t) => t.startsWith('figure:'));
      if (figureTag === undefined) {
        continue;
      }
      if (entry.tags.some((t) => summary.ids.includes(t))) {
        out.push({ kind, entry, figureId: figureTag });
      }
    }
  }
  return out;
}
```

`ResidueSummary` is already imported? Check the existing import from `./residue` — it imports `residueWindowId, summarizeResidue, type ResidueEvent`. Add `type ResidueSummary` to it.

Inside `tableFillManifest`, replace the entry pick and subject block:

```ts
const entries = catalog[kind];
if (entries === undefined) {
  throw new Error(`tableFillManifest: no table catalog for kind "${kind}"`);
}
const candidates = figureCandidates(summary, catalog);
let entry: CatalogEntry;
let figureAbout: { id: string; name: string } | null = null;
if (candidates.length > 0) {
  const picked = rng.pick(candidates);
  kind = picked.kind;
  entry = picked.entry;
  figureAbout = { id: picked.figureId, name: picked.entry.name };
} else {
  entry = rng.pick(entries);
}
```

`kind` is a `const` parameter today — change the signature so `kind` is `let`-assignable: keep the parameter `const` and introduce `let kind: string = pickKindFromRegistry(summary, kindRules);` (the current code does `const kind = pickKindFromRegistry(...)`; change `const` to `let`). The `ManifestKind` return of the registry pick widens to `string` — the Manifest field is `string`, so this typechecks.

Subject:

```ts
const subjectId = summary.ids[0];
const subject =
  focus !== null
    ? `${entry.subject} — ${focus.name}`
    : figureAbout !== null
      ? `${entry.subject} (${lastSegment(figureAbout.id)})`
      : subjectId === undefined
        ? entry.subject
        : `${entry.subject} (${lastSegment(subjectId)})`;
```

about spread (replacing the current focus-only spread at the manifest literal):

```ts
    ...(focus !== null
      ? { about_id: focus.id, about_name: focus.name }
      : figureAbout !== null
        ? { about_id: figureAbout.id, about_name: figureAbout.name }
        : {}),
```

Everything else (rarity, tags, notes, schema parse) is unchanged. Draw count is one `rng.pick` on either branch, then the rarity roll — determinism per seed holds.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/engine/__tests__/figure-pick.test.ts`
Expected: PASS (6 tests).

Run: `pnpm vitest run src/engine/__tests__/manifest.test.ts src/engine/__tests__/fill-adapter.test.ts`
Expected: PASS (existing behavior on unmatched windows unchanged).

- [ ] **Step 5: Full gate**

`node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green. `manifest.ts` grows ~35 lines (187 → ~222) — under the 250 ceiling.

- [ ] **Step 6: Commit**

```bash
git add src/engine/manifest.ts src/engine/__tests__/figure-pick.test.ts
git commit -m "feat(engine): prefer figure-tagged catalog rows when residue names a figure"
```

---

### Task 3: Nianfo practice — a figure that acts

**Files:**

- Modify: `src/content/packs/tang-china/practices.json5` (append practice)
- Modify: `src/content/packs/tang-china/schedules.json5` (repoint the monastic-day 17–20 block)
- Modify: `src/i18n/en.json` (practice SIDs + block SIDs)
- Test: `src/content/packs/tang-china/__tests__/nianfo.test.ts` (new)

**Interfaces:**

- Consumes: Task 1's `practice:tang/nianfo-recitation` tag on the Amitābha row; Task 2's preference pass; the pack schema's practice shape (`id`, `label_sid`, `description_sid`, `lens`, `progressPerTick`, `maxProgress`, `effects`).
- Produces: a playable practice whose `practice_tick` residue (`ids: ['practice:tang/nianfo-recitation']`, stamped by `idle.ts`) makes an Amitābha card reachable from real play through the existing bridge.

- [ ] **Step 1: Write the failing test**

Create `src/content/packs/tang-china/__tests__/nianfo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { tableFillManifest } from '@/engine/manifest';
import { createRng } from '@/engine/rng';
import { loadTangPack } from '../../loader'; // adjust to the loader helper the sibling tests use

describe('nianfo recitation (SPEC 16.1: a figure that acts)', () => {
  const pack = loadTangPack();

  it('ships the practice in the pack', () => {
    const ids = pack.practices.map((p: { id: string }) => p.id);
    expect(ids).toContain('practice:tang/nianfo-recitation');
  });

  it('carries the practice on the monastic-day evening block', () => {
    const monastic = pack.schedules.find(
      (s: { id: string }) => s.id === 'schedule:tang/monastic-day',
    );
    const evening = monastic?.blocks.find(
      (b: { practice_id: string | null }) => b.practice_id === 'practice:tang/nianfo-recitation',
    );
    expect(evening?.startHour).toBe(17);
    expect(evening?.endHour).toBe(20);
  });

  it('a window of nianfo practice harvests an Amitabha card with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(21n), 's', 'm-nianfo');
    expect(m.name).toBe('Amitābha');
    expect(m.about_id).toBe('figure:amitabha');
    expect(m.fill_status).toBe('table');
  });
});
```

Before finalizing, read `src/content/packs/tang-china/__tests__/pack.test.ts`'s first lines to see how it loads the pack (loader helper + import path + whether `practices`/`schedules` are exposed on the loaded pack) and adjust the imports/loads to match — do not invent a loader name. If the loaded pack does not expose `schedules`, load `../schedules.json5` directly with the JSON5 import the sibling tests use and assert the block there.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/packs/tang-china/__tests__/nianfo.test.ts`
Expected: FAIL — practice id not found.

- [ ] **Step 3: Add the practice to `practices.json5`**

Append inside `practices: [...]` after `evening-visit` (match file comment style):

```json5
    // ──────────────────────────────────────────────────────────────────────
    // 7. Nianfo recitation — collected attention. Hold Amitābha's name
    // through the evening hour; the practice is bound to the figure by
    // catalog tag so a window of it harvests an Amitābha card (SPEC §16.1).
    // ──────────────────────────────────────────────────────────────────────
    {
      id: 'practice:tang/nianfo-recitation',
      label_sid: 'tang.practice.nianfo_recitation.label_sid',
      description_sid: 'tang.practice.nianfo_recitation.description_sid',
      lens: 'collected_attention',
      progressPerTick: 0.35,
      maxProgress: 10,
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
    },
```

- [ ] **Step 4: Repoint the monastic-day evening block in `schedules.json5`**

Replace the `evening-reflection` block (17–20) with:

```json5
        {
          id: 'block:tang/monastic-day/evening-recitation',
          label_sid: 'tang.block.monastic_day.evening_recitation.label_sid',
          startHour: 17,
          endHour: 20,
          practice_id: 'practice:tang/nianfo-recitation',
          icon_sid: 'tang.block.monastic_day.evening_recitation.icon_sid',
        },
```

Then grep for `evening-reflection` and `evening_reflection` across `src/` — if no test or code references the old block id/SIDs, delete the two old SID entries from `en.json`; if something references them, leave the SIDs in place and note it in the report.

- [ ] **Step 5: Add SIDs to `src/i18n/en.json`**

Under `tang.practice` (match the existing siblings' key style exactly):

```json
"nianfo_recitation": {
  "label_sid": "Nianfo recitation",
  "description_sid": "Hold Amitābha's name through the evening hour. The trust it builds is ordinary: a steadier voice for the people who need one."
}
```

Under `tang.block.monastic_day`:

```json
"evening_recitation": {
  "label_sid": "Evening recitation",
  "icon_sid": "bell"
}
```

(Check the sibling `icon_sid` values — if they are full SID strings or icon names, match that convention exactly.)

- [ ] **Step 6: Run tests and gate**

Run: `pnpm vitest run src/content/packs/tang-china/__tests__/nianfo.test.ts` → PASS (3 tests).
Run: `pnpm vitest run src/content/packs/tang-china` → PASS (pack schema, warnings, events all unchanged — events stay at 7).
Full gate. The schedule repoint changes evening practice for monastic lives: if a golden test (session-step, life-context, play-cursor) pinned `practice:tang/breath-sitting` at the 17–20 block or a derived count, update the expectation to `practice:tang/nianfo-recitation` with a one-line justification.

- [ ] **Step 7: Commit**

```bash
git add src/content/packs/tang-china/practices.json5 src/content/packs/tang-china/schedules.json5 src/i18n/en.json src/content/packs/tang-china/__tests__/nianfo.test.ts
git commit -m "feat(content): let nianfo recitation put Amitabha on the bench"
```

(Plus any golden test files Step 6 required.)

---

### Task 4: The last three Buddhas of the past

**Files:**

- Modify: `src/i18n/en.json` (add `figure.bhadrakalpa.21/22/23`, four SIDs each)
- Modify: `src/content/packs/tang-china/figures.json5` (add 3 rows, replace the tail note)
- Modify: `src/content/packs/tang-china/__tests__/pack.test.ts:70-71` (count 32 → 35)
- Modify: `src/content/__tests__/sacred-types.test.ts:195` (32 → 35)
- Test: covered by the two updated suites

**Interfaces:**

- Consumes: the `figure.bhadrakalpa.<n>` SID nesting already in `en.json` (values are the display strings); the row shape of `figures.json5` (`id`, `display_name_sid`, `transliterated_names`, `role`, `primary_attribute_sid`, `mantra_id`, `sutra_ids`, `iconography_sid`, `reverence_note_sid`).
- Produces: 35 localized figures; `resolveSid` throws on missing keys, so SIDs land in the same commit as the rows.

- [ ] **Step 1: Add the SIDs to `en.json`**

Inside `"bhadrakalpa": {`, after `"20": {...}`, add (match the file's existing four-key style):

```json
"21": {
  "display_name_sid": "Kakusandha",
  "attribute_sid": "The first teacher of the present auspicious aeon; the Pali lineage lists open with him, and the Sanskrit tradition says Krakucchanda for the same seat.",
  "iconography_sid": "A seated awakened teacher in monastic robes, hands in the gesture of meditation; the standard form of a past Buddha, placed first in the row.",
  "reverence_sid": "Invoked at the head of the Buddhas of the past in the confession liturgies that purify broken precept."
},
"22": {
  "display_name_sid": "Koṇāgamana",
  "attribute_sid": "The second teacher of the present aeon, called Kanakamuni in the Sanskrit lists — one teacher, two names.",
  "iconography_sid": "A seated awakened teacher in monastic robes; second in the row of past Buddhas, sometimes shown beneath a nagara tree in the commentaries.",
  "reverence_sid": "Reverenced in the confession liturgy as the second of the past Buddhas of the auspicious aeon."
},
"23": {
  "display_name_sid": "Kassapa",
  "attribute_sid": "The third teacher of the present aeon, the one immediately before Śākyamuni; the Sanskrit lists say Kāśyapa.",
  "iconography_sid": "A seated awakened teacher in monastic robes, third in the row; his form closes the sequence of past Buddhas before the historical teacher.",
  "reverence_sid": "Reverenced as the teacher whose era ended just before ours; the confession liturgy names him third among the past Buddhas."
}
```

- [ ] **Step 2: Add the rows to `figures.json5`**

Replace the trailing comment block (`// Kakusandha, Koṇāgamana, and Kassapa ...`) with:

```json5
    {
      id: 'figure:bhadrakalpa-21',
      display_name_sid: 'figure.bhadrakalpa.21.display_name_sid',
      transliterated_names: ['Kakusandha', 'Krakucchanda'],
      role: 'historical-buddha',
      primary_attribute_sid: 'figure.bhadrakalpa.21.attribute_sid',
      mantra_id: null,
      sutra_ids: ['sutra:bhadrakalpa'],
      iconography_sid: 'figure.bhadrakalpa.21.iconography_sid',
      reverence_note_sid: 'figure.bhadrakalpa.21.reverence_sid',
    },
    {
      id: 'figure:bhadrakalpa-22',
      display_name_sid: 'figure.bhadrakalpa.22.display_name_sid',
      transliterated_names: ['Koṇāgamana', 'Kanakamuni'],
      role: 'historical-buddha',
      primary_attribute_sid: 'figure.bhadrakalpa.22.attribute_sid',
      mantra_id: null,
      sutra_ids: ['sutra:bhadrakalpa'],
      iconography_sid: 'figure.bhadrakalpa.22.iconography_sid',
      reverence_note_sid: 'figure.bhadrakalpa.22.reverence_sid',
    },
    {
      id: 'figure:bhadrakalpa-23',
      display_name_sid: 'figure.bhadrakalpa.23.display_name_sid',
      transliterated_names: ['Kassapa', 'Kāśyapa'],
      role: 'historical-buddha',
      primary_attribute_sid: 'figure.bhadrakalpa.23.attribute_sid',
      mantra_id: null,
      sutra_ids: ['sutra:bhadrakalpa'],
      iconography_sid: 'figure.bhadrakalpa.23.iconography_sid',
      reverence_note_sid: 'figure.bhadrakalpa.23.reverence_sid',
    },
```

Aliases (Krakucchanda, Kanakamuni, Kāśyapa) live in `transliterated_names` only — they are the same people, not extra figures.

- [ ] **Step 3: Update the count pins**

`pack.test.ts` line 70-71:

```ts
// 12 core Tang figures + 23 Buddhas of the past (Bhadrakalpa lineage).
expect(pack.figures).toHaveLength(35);
```

`sacred-types.test.ts` line 195:

```ts
expect(pack.figures.length).toBe(35);
```

- [ ] **Step 4: Run tests and gate**

Run: `pnpm vitest run src/content` → PASS. Full gate green.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.json src/content/packs/tang-china/figures.json5 src/content/packs/tang-china/__tests__/pack.test.ts src/content/__tests__/sacred-types.test.ts
git commit -m "feat(content): finish the Buddhas of the past with localized rows"
```

---

### Task 5: SPEC §14 drift fix + phase close-out

**Files:**

- Modify: `SPEC.md` §14 (lines ~291-295)
- Test: none (docs only) — full gate re-run as the close-out check

**Interfaces:**

- Consumes: Phases 1–4 landed (figures done by Tasks 1–4 of this plan); model harvest deferred to Phase 6 per `docs/superpowers/specs/2026-08-24-harvest-quality-program.md`.
- Produces: a §14 that reads true.

- [ ] **Step 1: Edit `SPEC.md` §14 second sentence**

Replace:

> The order once listed here is closed: named figures on the bench (done), SpaceXAI harvest behind `fillManifestSafe` (done), pinned persons/places changing the next life (done), life-chain persistence at parity with the bench (done), campaign screens on the studio visual language (done).

with:

> The order once listed here is closed: named figures on the bench (done), pinned persons/places changing the next life (done), life-chain persistence at parity with the bench (done), campaign screens on the studio visual language (done). Model harvest behind `fillManifestSafe` is the one open build item; it ships provider-pluggable (Z.ai, MiniMax) as Phase 6 of the harvest-quality program (`docs/superpowers/specs/2026-08-24-harvest-quality-program.md`).

Do not touch §10, §6–§9, §1.1, or §16.

- [ ] **Step 2: Full gate + wire-to-wire check**

`node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green. Then the §16.1 done-line, verbatim from the spec: a window whose residue mentions `figure:avalokiteshvara` (or the compassion practice / six-syllable mantra) harvests a card named for Guanyin — already pinned by `figure-pick.test.ts`; confirm it passed.

- [ ] **Step 3: Commit**

```bash
git add SPEC.md
git commit -m "docs: mark the true state of figures and model harvest in the spec"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §16.1 item 1 (catalog) → Task 1; item 2 (wire pick) → Task 2; item 3 (a figure that acts) → Task 3; item 4 (last three) → Task 4; item 5 (mantras — already in tags; no merit resource minted) → Task 1 tags + no-op; §14 drift → Task 5. "Done when" line → Task 2 test 1 + Task 3 test 3.
- **Type consistency:** `FIGURE_PEOPLE`/`FIGURE_PLACES`/`FIGURE_IDS` named identically in Tasks 1–2; `figureCandidates`/`FigureCandidate` defined in Task 2 only; `practice:tang/nianfo-recitation` token identical in Tasks 1, 2, 3.
- **Placeholders:** none; every code step carries the code. Two intentional read-first adaptations are called out inline (focus literal shape in Task 2; loader helper name in Task 3) because those files were not read at planning time — the implementer must read, then match, not invent.
