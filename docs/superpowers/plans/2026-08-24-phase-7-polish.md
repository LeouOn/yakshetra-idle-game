# Phase 7: Polish Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every tier's harvest reads named, specific, usable later — a written rubric, a mechanical rubric test, deeper tables (a fifth row per tier kind), wider real-play figure reachability, and real visitor flavor (SPEC §10.15 "quality before width"; program design §5 "copy-only: no schemas, no new mechanics, no new lint rules").

**Architecture:** Pure content pass. One test file gains rubric enforcement; `catalogs.json5` gains 10 tier rows + 2 visitor-table namespaces; two figure-bound practices close the reachability gap the Phase 5 oracle flagged (only Amitābha was reachable from play); the sample-arrival visitor table swaps fixture copy for real copy and the city/region visitors gain their own tables through the EXISTING `table_ref` mechanic. No engine code changes except zero — all edits are JSON5 content, en.json SIDs, figure-row TAGS (data in the engine's figure file, mirrored byte-identical), and tests.

**Tech Stack:** JSON5 content, Zod-validated packs, Vitest, en.json SIDs.

## Global Constraints

- **Copy-only.** No new mechanics, no schema changes, no new lint RULES (the rubric test asserts content, it is not a `lintPack` rule). The `table_ref` swap is an existing, tested mechanic — wiring it to two more visitors is data.
- Mirror law: `catalogs.test.ts` asserts progression `person`/`place`/`thing`/`outcome`/`change` ≡ engine `CATALOG` entry-for-entry (`toEqual`). Any edit to those tables (incl. figure-row tag additions) lands byte-identical in BOTH `src/engine/manifest-catalog-figures.ts` (or `manifest-catalog.ts`) and `src/content/progression/base/catalogs.json5`.
- Tier kinds (tradition…road) are progression-only — they live ONLY in `catalogs.json5`; no engine edit needed for them.
- Figure prose + all new copy: descriptive, concrete, adult; no doctrinal claims, no fabricated sayings, no merit/karma/enlightenment/spiritual language; no meter tokens.
- Practices touch only mundane resources (`trust`, `energy`). No new resource kinds.
- Visitor-table entries are plain strings (compiled-card register, not SIDs). Visitor arrival notices stay SIDs (`sid_ns` in visitors.json5 — unchanged).
- SIDs land in the same commit as the rows/practices that reference them (`resolveSid` throws on missing keys).
- Gate: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `pnpm lint` 0 errors; `pnpm test` all green (baseline 1087 + 2 skipped live; count grows). Do NOT use `pnpm tsc`.
- Commit only the files each task names. NEVER `git add -A`. Imperative commit messages.

---

### Task 1: The rubric — written + mechanically enforced

**Files:**

- Modify: `src/content/progression/__tests__/catalogs.test.ts` (append rubric describe)
- Test: same file

**Interfaces:**

- Consumes: `loadProgression()` registries (`.catalogs`, `.visitorTables` — check the loader's export name for the visitor tables map; if it is not exposed, assert over `registries.catalogs` only and note it).
- Produces: the mechanical rubric every later task's copy must satisfy. Criteria (the written rubric, embedded in the test as the source of truth):

1. `name`: 3–40 chars, unique within its table.
2. `one_liner`: 10–120 chars, exactly one sentence (no `. ` inside), ends with `.` or `?`.
3. `subject`: 3–60 chars, lowercase noun phrase (no sentence-ending punctuation).
4. `detail`: 60–420 chars, at least two sentences.
5. `tags`: 2–5 entries, all non-empty, no duplicates.
6. No meter tokens anywhere: `/karma|merit|enlightenment|spiritual_rank/i` over name+one_liner+subject+detail.

- [ ] **Step 1: Append the failing rubric test** to `catalogs.test.ts`:

```ts
describe('catalog rubric (SPEC 10.15 quality pass)', () => {
  const METER = /karma|merit|enlightenment|spiritual_rank/i;

  function rowsOf(
    registries: ReturnType<typeof loadProgression>,
  ): Array<{
    table: string;
    i: number;
    entry: {
      name: string;
      one_liner: string;
      subject: string;
      detail: string;
      tags: readonly string[];
    };
  }> {
    const out: Array<{
      table: string;
      i: number;
      entry: {
        name: string;
        one_liner: string;
        subject: string;
        detail: string;
        tags: readonly string[];
      };
    }> = [];
    for (const [kind, entries] of Object.entries(registries.catalogs)) {
      entries.forEach((entry, i) => out.push({ table: kind, i, entry }));
    }
    return out;
  }

  it('every row satisfies the mechanical rubric', () => {
    const failures: string[] = [];
    for (const { table, i, entry } of rowsOf(registries)) {
      const where = `${table}[${i}] ${entry.name}`;
      if (entry.name.length < 3 || entry.name.length > 40)
        failures.push(`${where}: name length ${entry.name.length}`);
      if (entry.one_liner.length < 10 || entry.one_liner.length > 120)
        failures.push(`${where}: one_liner length ${entry.one_liner.length}`);
      if (!/[.?!]$/.test(entry.one_liner) || entry.one_liner.includes('. '))
        failures.push(`${where}: one_liner must be one sentence`);
      if (entry.subject.length < 3 || entry.subject.length > 60 || /[.?!]$/.test(entry.subject))
        failures.push(`${where}: subject shape`);
      if (entry.detail.length < 60 || entry.detail.length > 420)
        failures.push(`${where}: detail length ${entry.detail.length}`);
      if ((entry.detail.match(/[.?!]/g) ?? []).length < 2)
        failures.push(`${where}: detail needs 2+ sentences`);
      if (entry.tags.length < 2 || entry.tags.length > 5)
        failures.push(`${where}: ${entry.tags.length} tags`);
      if (new Set(entry.tags).size !== entry.tags.length) failures.push(`${where}: duplicate tags`);
      if (METER.test(`${entry.name} ${entry.one_liner} ${entry.subject} ${entry.detail}`))
        failures.push(`${where}: meter token`);
    }
    expect(failures).toEqual([]);
  });

  it('names are unique within each table', () => {
    for (const [kind, entries] of Object.entries(registries.catalogs)) {
      const names = entries.map((e) => e.name);
      expect(new Set(names).size, kind).toBe(names.length);
    }
  });
});
```

- [ ] **Step 2: Run it and FIX THE CONTENT it flags** (not the test — the rubric is the law now):

Run: `pnpm vitest run src/content/progression/__tests__/catalogs.test.ts`
Expected: some rows fail length/sentence bands (older core rows are terse). Fix each flagged row in BOTH the engine table and the `catalogs.json5` mirror (byte-identical). Widen prose minimally — keep each row's voice, just bring it inside the bands. Do NOT touch row names (golden tests may pin them); widen `one_liner`/`detail` where needed.

- [ ] **Step 3: Full gate** — tsc 0, lint 0, all tests green (re-pin any golden that pinned widened prose — names were untouched so this should be rare).

- [ ] **Step 4: Commit**

```bash
git add src/content/progression/__tests__/catalogs.test.ts src/content/progression/base/catalogs.json5 src/engine/manifest-catalog.ts
git commit -m "test(content): enforce the catalog rubric and bring every row inside it"
```

(Stage exactly the files you edited — the engine figure file too if a figure row was flagged.)

---

### Task 2: A fifth row for every tier table

**Files:**

- Modify: `src/content/progression/base/catalogs.json5` (10 new entries — tier kinds only, progression-only, NO engine mirror needed)
- Test: covered by Task 1's rubric test + loader counts (re-pin if pinned)

**Interfaces:** none — pure content. The rows must pass the Task 1 rubric and never duplicate an existing name in their table.

- [ ] **Step 1: Author the rows** (copy below is final; adjust only if the rubric test flags a band):

`tradition` (append after 'The new-year verse'):

```json5
        {
          name: 'The door-god print',
          one_liner: 'A woodblock pair re-pasted every new year, slightly crooked.',
          subject: 'a re-pasted door print',
          detail:
            'The same two guardians, printed from the worn block the family shares with three other households. The paste is flour and water. The crook is on purpose — a print hung too straight means the house thinks too highly of itself.',
          tags: ['print', 'door'],
        },
```

`heirloom` (after 'The tea canister'):

```json5
        {
          name: 'The weighing beam',
          one_liner: 'A steelyard that has judged every sale since the grandfather.',
          subject: 'a family steelyard',
          detail:
            "The pivot cord is new; the beam is not. Its sliding weight is worn smooth on one face from a thumb holding it steady while the price is argued. It reads true, which is why the neighbors borrow it to settle disputes.",
          tags: ['steelyard', 'trade'],
        },
```

`charter` (after 'The ferry compact'):

```json5
        {
          name: 'The apprentice rolls',
          one_liner: "The workshop's list of who owes whom how many years.",
          subject: 'apprentice rolls',
          detail:
            'Each boy enters in ink; the master counts the years served in chalk beneath the name. The rolls outlast most of the names on them, and the workshop feeds whoever\'s page is still open.',
          tags: ['apprentice', 'rolls'],
        },
```

`ware` (after 'The fair-copy ledgers'):

```json5
        {
          name: "The dyer's blacks",
          one_liner: 'A black the workshop sells to every mourning household.',
          subject: 'a workshop black dye',
          detail:
            'Iron-gall and soot, steeped longer than anyone thinks necessary. Every family in the district has worn it once. The dyer keeps the recipe unwritten and the vat covered, and mourns nothing himself.',
          tags: ['dye', 'black'],
        },
```

`festival` (after 'The bell night'):

```json5
        {
          name: 'The cold-food morning',
          one_liner: 'One breakfast eaten cold, together, before the fires are relit.',
          subject: 'a cold-food morning',
          detail:
            "The town lets its hearths go dark for a single night. At dawn the bread is stale, the tea is unheated, and the whole street compares how badly they slept. The first new fire is walked door to door from the temple's ember.",
          tags: ['cold-food', 'morning'],
        },
```

`landmark` (after 'The town well'):

```json5
        {
          name: 'The flood stones',
          one_liner: 'One engraved stone per flood, stacked where the water stopped.',
          subject: 'a stack of flood stones',
          detail:
            'Eleven stones now, the oldest half-buried. Each carries a year and a line where the river peaked. The mason who cuts them has an arrangement with the river he refuses to explain.',
          tags: ['flood', 'stones'],
        },
```

`institution` (after "The paupers' dormitory"):

```json5
        {
          name: 'The archives vault',
          one_liner: 'Where the city keeps the papers that outlast the magistrates.',
          subject: 'a city archives vault',
          detail:
            'Three clerks, forty years of tax rolls, and a smell of camphor. The newest magistrate always orders a re-counting; the oldest clerk always finds the same numbers, on purpose, slowly.',
          tags: ['archives', 'vault'],
        },
```

`monument` (after "The founder's stela"):

```json5
        {
          name: 'The unfinished pagoda',
          one_liner: 'A pagoda that stopped at the third roof, two hundred years ago.',
          subject: 'an unfinished pagoda',
          detail:
            'The funding died with the donor; the will did not. Scaffolding holes dot the upper courses, and every generation debates finishing it. The birds have voted already, floor by floor.',
          tags: ['pagoda', 'unfinished'],
        },
```

`legend` (after 'The year the river walked'):

```json5
        {
          name: 'The collector who returned',
          one_liner: 'A story every region tells about a tax that came back.',
          subject: 'a legend of returned taxes',
          detail:
            'A collector walked the whole circuit, then walked it again in the other direction, handing back what he had taken. In some tellings he was dismissed; in others, promoted. In all of them the second walk is longer.',
          tags: ['collector', 'return'],
        },
```

`road` (after 'The old mountain pass'):

```json5
        {
          name: 'The relay stages',
          one_liner: 'A road measured in horses rather than miles.',
          subject: 'a relay road',
          detail:
            "Stables a hard day apart, each with fresh mounts and a ledger of who went by. The grooms know the road's whole gossip by its riders. Imperial orders and love letters travel at the same speed, which is the road's one democracy.",
          tags: ['relay', 'stages'],
        },
```

- [ ] **Step 2: Run the rubric test + loader suite** — `pnpm vitest run src/content` → the rubric test covers all 10 new rows; re-pin any loader count pinning tier-table lengths (search `toHaveLength(4)` under `src/content`).

- [ ] **Step 3: Full gate + commit**

```bash
git add src/content/progression/base/catalogs.json5
git commit -m "feat(content): deepen every tier table with a fifth row"
```

(Plus re-pinned loader test files.)

---

### Task 3: Wider figure reachability — medicine rite and six-syllable recitation

**Files:**

- Modify: `src/engine/manifest-catalog-figures.ts` (2 tag additions)
- Modify: `src/content/progression/base/catalogs.json5` (mirror the same 2 tag additions on the person rows)
- Modify: `src/content/packs/tang-china/practices.json5` (2 practices)
- Modify: `src/content/packs/tang-china/schedules.json5` (2 block repoints)
- Modify: `src/i18n/en.json` (practice + block SIDs)
- Test: `src/content/packs/tang-china/__tests__/figure-reach.test.ts` (new)

**Interfaces:**

- Consumes: the Phase 5 preference pass (`figureCandidates` matches any row tag against residue ids) and the Amitābha precedent (`practice:tang/nianfo-recitation`).
- Produces: `practice:tang/medicine-rite` (bound to `figure:medicine-buddha`) and `practice:tang/six-syllable-recitation` (bound to `figure:avalokiteshvara`), carried on `schedule:tang/city-day` and `schedule:tang/region-day` respectively.

- [ ] **Step 1: Write the failing test** `figure-reach.test.ts` (copy the loader + assertion shape from `nianfo.test.ts`):

```ts
import { describe, expect, it } from 'vitest';

import { tableFillManifest } from '@/engine/manifest';
import { createRng } from '@/engine/rng';
import { loadEraPack } from '../../../loader'; // match nianfo.test.ts's real import path

describe('figure reachability from real play (phase 7 polish)', () => {
  const pack = loadEraPack();

  it('ships the medicine rite practice in the pack', () => {
    expect(pack.practices.map((p: { id: string }) => p.id)).toContain(
      'practice:tang/medicine-rite',
    );
  });

  it('carries the medicine rite on the city-day schedule', () => {
    const city = pack.schedules.find((s: { id: string }) => s.id === 'schedule:tang/city-day');
    const block = city?.blocks.find(
      (b: { practice_id: string | null }) => b.practice_id === 'practice:tang/medicine-rite',
    );
    expect(block).toBeDefined();
  });

  it('a window of medicine rite harvests the Medicine Buddha with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/medicine-rite'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/medicine-rite'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(6n), 's', 'm-med');
    expect(m.name).toContain('Medicine Buddha');
    expect(m.about_id).toBe('figure:medicine-buddha');
  });

  it('a window of six-syllable recitation harvests Guanyin with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/six-syllable-recitation'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/six-syllable-recitation'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(7n), 's', 'm-six');
    expect(m.name).toContain('Guanyin');
    expect(m.about_id).toBe('figure:avalokiteshvara');
  });
});
```

(READ-FIRST: copy the exact import path + loader call from `nianfo.test.ts`; if it asserts block hours, match that style.)

- [ ] **Step 2: Run to verify it fails** — `pnpm vitest run src/content/packs/tang-china/__tests__/figure-reach.test.ts` → FAIL (practice ids absent).

- [ ] **Step 3: Add the practice tags to the figure rows** — in `src/engine/manifest-catalog-figures.ts`:
  - Medicine Buddha row tags: `['figure:medicine-buddha', 'mantra:medicine-buddha', 'practice:tang/medicine-rite', 'healing']` (4 tags).
  - Guanyin row tags: `['figure:avalokiteshvara', 'mantra:six-syllable', 'practice:tang/six-syllable-recitation', 'compassion', 'guanyin']` (5 tags — at the cap, allowed).
  - Mirror BOTH rows byte-identically in the `person` block of `catalogs.json5` (the `toEqual` mirror test enforces it).

- [ ] **Step 4: Add the practices** to `practices.json5` (match the nianfo comment style):

```json5
    // ──────────────────────────────────────────────────────────────────────
    // 8. Medicine rite — generosity. Recite for the sick at the clinic
    // door; bound to Bhaiṣajyaguru by catalog tag (SPEC §16.1 reach).
    // ──────────────────────────────────────────────────────────────────────
    {
      id: 'practice:tang/medicine-rite',
      label_sid: 'tang.practice.medicine_rite.label_sid',
      description_sid: 'tang.practice.medicine_rite.description_sid',
      lens: 'generosity',
      progressPerTick: 0.3,
      maxProgress: 10,
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
    },

    // ──────────────────────────────────────────────────────────────────────
    // 9. Six-syllable recitation — collected attention. Hold the
    // six-syllable mantra through the working day; bound to Guanyin.
    // ──────────────────────────────────────────────────────────────────────
    {
      id: 'practice:tang/six-syllable-recitation',
      label_sid: 'tang.practice.six_syllable_recitation.label_sid',
      description_sid: 'tang.practice.six_syllable_recitation.description_sid',
      lens: 'collected_attention',
      progressPerTick: 0.35,
      maxProgress: 12,
      effects: [{ op: 'add_resource', key: 'energy', delta: 1 }],
    },
```

- [ ] **Step 5: Repoint schedule blocks** — READ-FIRST the current block ids/hours, then:
  - `schedule:tang/city-day`: replace ONE `practice:tang/breath-sitting` block (the later one) with `{ id: 'block:tang/city-day/medicine-rite', label_sid: 'tang.block.city_day.medicine_rite.label_sid', same hours, practice_id: 'practice:tang/medicine-rite', icon_sid: 'tang.block.city_day.medicine_rite.icon_sid' }`.
  - `schedule:tang/region-day`: replace the later `practice:tang/sutra-copying` block with `{ id: 'block:tang/region-day/six-syllable', label_sid: 'tang.block.region_day.six_syllable.label_sid', same hours, practice_id: 'practice:tang/six-syllable-recitation', icon_sid: 'tang.block.region_day.six_syllable.icon_sid' }`.
  - Remove the replaced blocks' old SIDs from en.json ONLY if nothing else references them (grep first — other schedules share breath-sitting/sutra-copying so the PRACTICE SIDs stay; only BLOCK label/icon SIDs of the replaced blocks are candidates for deletion).

- [ ] **Step 6: Add SIDs to `en.json`** (match sibling nesting exactly — practices get label+description, blocks get label+icon with the bare-icon-name convention):

```json
"medicine_rite": {
  "label_sid": "Medicine rite",
  "description_sid": "Recite at the clinic door for whoever is inside. The trust it builds is the ordinary kind: neighbors who know you will come."
},
"six_syllable_recitation": {
  "label_sid": "Six-syllable recitation",
  "description_sid": "Hold the six syllables through the working day. The energy it returns is ordinary: a steadier hand for the afternoon."
}
```

```json
"medicine_rite": { "label_sid": "Medicine rite", "icon_sid": "bowl" },
"six_syllable": { "label_sid": "Six syllables", "icon_sid": "bell" }
```

- [ ] **Step 7: Full gate** — the four new tests pass; golden tests pinning the replaced blocks' practice ids get re-pinned with a one-line comment. Gate green.

- [ ] **Step 8: Commit**

```bash
git add src/engine/manifest-catalog-figures.ts src/content/progression/base/catalogs.json5 src/content/packs/tang-china/practices.json5 src/content/packs/tang-china/schedules.json5 src/i18n/en.json src/content/packs/tang-china/__tests__/figure-reach.test.ts
git commit -m "feat(content): put the medicine buddha and guanyin within reach of play"
```

(Plus re-pinned golden test files.)

---

### Task 4: Visitor flavor — real tables for the seated guests

**Files:**

- Modify: `src/content/progression/base/catalogs.json5` (polish sample-arrival copy; add 2 visitor-table namespaces)
- Modify: `src/content/progression/base/visitors.json5` (add `table_ref` to court-auditor + road-surveyor)
- Test: `src/engine/__tests__/visitor-tables-polish.test.ts` (new) + re-pin swap/loader tests

**Interfaces:**

- Consumes: the existing `visitorTableOverride(reg.visitors, seatId, reg.visitorTables, reg.catalogs)` swap; the sample-arrival precedent.
- Produces: `visitor-table/court-audit` (city) and `visitor-table/road-survey` (region) namespaces wired to their visitors; sample-arrival's fixture copy replaced with real copy.

- [ ] **Step 1: Write the failing test** (READ-FIRST: copy the swap-test harness from the existing visitor swap tests under `src/engine/__tests__/visitors.test.ts` — how they build a session with a seated visitor and assert the harvested name):

```ts
// Assert, mirroring the sample-arrival swap test's shape:
// 1. Seated court-auditor on the city tier → the override is NOT the base
//    catalogs and every kind returns court-audit entries.
// 2. Seated road-surveyor on the region tier → same for road-survey entries.
// 3. No seat → base catalogs (existing behavior, re-pinned).
```

Write the three assertions with the real API calls the sibling test uses (`visitorTableOverride` + `tableFillerWithCatalog` or the full harvest path — match the sibling exactly).

- [ ] **Step 2: Replace sample-arrival's copy** (keep BOTH names distinct from every per-kind table name — they already are; polish only one_liner/subject/detail/tags inside rubric bands):

```json5
    'visitor-table/sample-arrival': [
      {
        name: 'A guest-epoch card',
        one_liner: 'A card stamped by whoever was seated, not by the bench.',
        subject: 'a visitor-stamped card',
        detail:
          "The harvest came up from the guest's own table while the seat was warm. The bench's shelf had nothing to do with it, and the card is none the worse for that.",
        tags: ['visitor', 'table'],
      },
      {
        name: 'A swap-flavored stamp',
        one_liner: 'A mark proving the table was swapped mid-window.',
        subject: 'a swap stamp',
        detail:
          'Whoever pressed it was seated when the residue cooked. The kind is not the one the bench would have picked, which is the point of having guests.',
        tags: ['visitor', 'swap'],
      },
    ],
```

(Re-pin any test asserting the old one_liner/detail strings verbatim.)

- [ ] **Step 3: Add the two namespaces** under `visitor_tables:`:

```json5
    'visitor-table/court-audit': [
      {
        name: "The assessor's seal",
        one_liner: 'A stamp that follows the number, not the asker.',
        subject: "an assessor's seal",
        detail:
          "The court's man presses it under the tally and the tally becomes true everywhere. Wax the color of dried persimmon, a handle worn to the grain of one particular hand.",
        tags: ['seal', 'audit'],
      },
      {
        name: 'The re-counted granary',
        one_liner: 'The same sacks, a different number, and the number held.',
        subject: 'a re-counted granary',
        detail:
          'The auditors opened every bin and found the surplus smaller than reported and larger than feared. The correction outlived the magistrate who ordered it.',
        tags: ['granary', 'count'],
      },
      {
        name: "The auditor's lodging",
        one_liner: "The bureau's guest room, which no guest enjoys.",
        subject: 'an official lodging',
        detail:
          "A clean pallet in the bureau's back court, one lamp, one lock. Assessors accept it as part of the fee. The ledger of its occupants is the city's honest history.",
        tags: ['lodging', 'audit'],
      },
      {
        name: 'The clerk who sleeps well',
        one_liner: 'He signs last and sleeps first.',
        subject: 'a trusted clerk',
        detail:
          "Thirty years of entering other men's numbers without once adjusting one. The court trusts his sleep more than its own seals.",
        tags: ['clerk', 'trust'],
      },
    ],
    'visitor-table/road-survey': [
      {
        name: "The surveyor's chain",
        one_liner: 'A measured length the whole road agrees on.',
        subject: "a surveyor's chain",
        detail:
          'Brass links, a hundred to the chain, carried shoulder-sore across three prefectures. Where the chain ends and is lifted, that is a mile, whatever the map says.',
        tags: ['chain', 'measure'],
      },
      {
        name: 'The re-drawn ford',
        one_liner: 'The crossing moved, and the map admitted it.',
        subject: 'a re-drawn ford',
        detail:
          'The river shifted in the spring floods; the surveyor walked the new bank and moved the ink. Two villages discovered they were now half a day nearer each other.',
        tags: ['ford', 'map'],
      },
      {
        name: 'The milestone at the false crest',
        one_liner: 'A stone that lies about the distance, on purpose.',
        subject: 'an encouraging milestone',
        detail:
          'The first surveyor set it past the crest where tired walkers could see it, saving them despair. Every survey since has preserved the error.',
        tags: ['milestone', 'crest'],
      },
      {
        name: 'The chain-apprentice',
        one_liner: 'Counts her steps in her sleep, she says.',
        subject: 'a chain-apprentice',
        detail:
          'She carries the spare chain and a grudge against hills. Her notebook margins fill with birds, which the surveyor pretends not to see.',
        tags: ['apprentice', 'survey'],
      },
    ],
```

- [ ] **Step 4: Wire the visitors** in `visitors.json5` — add `table_ref: 'visitor-table/court-audit'` to `visitor/court-auditor` and `table_ref: 'visitor-table/road-survey'` to `visitor/road-surveyor` (keep their `effects` rows exactly as-is; update the file's Phase-4 comment that says "the table_ref swap is a future-hook" to note Phase 7 wired two real tables).

- [ ] **Step 5: Re-pin loader/swap tests** — any test asserting the visitor_tables key set is exactly `['visitor-table/sample-arrival']` re-pins to three keys; the sample-arrival copy re-pins from Step 2.

- [ ] **Step 6: Full gate + commit**

```bash
git add src/content/progression/base/catalogs.json5 src/content/progression/base/visitors.json5 src/engine/__tests__/visitor-tables-polish.test.ts
git commit -m "feat(content): seat the court auditor and road surveyor at real tables"
```

(Plus re-pinned test files.)

---

### Task 5: Close-out — record the audit, check the constitution

**Files:**

- Modify: `docs/superpowers/specs/2026-08-24-harvest-quality-program.md` (append §10 audit record)
- Test: none — full gate re-run

- [ ] **Step 1: Append the audit record** to the program design doc (after §9):

```markdown
## 10. Polish audit record (Phase 7, 2026-08-24)

Rubric: written into `src/content/progression/__tests__/catalogs.test.ts` and
enforced on every kind table (name/one_liner/subject/detail bands, sentence
counts, tag counts, uniqueness, no meter tokens).

- Core tables: rows brought inside the rubric bands; names unchanged.
- Tier tables: deepened 4 → 5 rows each (10 new entries, one per kind).
- Figure reachability: Amitābha (nianfo), Bhaiṣajyaguru (medicine rite),
  Guanyin (six-syllable recitation) all reachable from real schedules.
- Visitor flavor: sample-arrival copy replaced; court-auditor and
  road-surveyor seated at real tables via the existing table_ref swap.

Verdict: every tier's rows pass the rubric. §10.15's quality work for cards
and city/region content is done; the deferred width item (second bay, new
family, new pack) remains deferred.
```

- [ ] **Step 2: Gate + commit**

```bash
git add docs/superpowers/specs/2026-08-24-harvest-quality-program.md
git commit -m "docs: record the phase-7 polish audit"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** design §5 rubric → Task 1; per-tier audit + weakest-row upgrades → Tasks 1–2; figure reachability (P5 oracle's carried gap) → Task 3; city/region visitor flavor → Task 4; audit recorded → Task 5. "Copy-only" honored: no schemas, no mechanics — the table_ref wiring uses the existing tested swap.
- **Type consistency:** practice ids `practice:tang/medicine-rite` / `practice:tang/six-syllable-recitation` identical across figure tags, practices, schedules, tests; visitor namespaces `visitor-table/court-audit` / `visitor-table/road-survey` identical across catalogs + visitors + tests.
- **Placeholders:** Task 4 Step 1's test skeleton is read-first-by-design (the sibling swap test's harness is the source — the implementer copies it, as in Phase 5's nianfo task); all copy is authored in full.
- **Risks flagged:** mirror byte-identity (Task 3 tag additions touch engine + json5 — `toEqual` enforces); loader count pins (Tasks 2/4 re-pin); replaced schedule blocks' SIDs deleted only when unreferenced.
