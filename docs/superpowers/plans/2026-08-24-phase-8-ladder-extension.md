# Phase 8: Ladder Extension to Nation and World — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship tiers 6 (nation) and 7 (world) as data per the ratified SPEC §1.1 amendment (commit 86efc4f): nation is member-bearing (national institutions under `policy:nation-base`), world is the terminal unit tier (one inert row per unlocked rung). Eight graduations, eight benches, one fold chain — the chain ships through world.

**Architecture:** One engine enum widens (`SCALE_VALUES` — everything downstream derives: `ManifestScale`, the progression `ScaleSchema`, world drafts, bench mapping). Everything else is content in the Phase 3/4 pattern: two tier rows, two milestones, two roles blocks, 10 kind rows (TOTAL fallbacks), 4 catalog blocks (5 authored rows each), 2 policies, 2 schedules, SIDs. The engine's steppers, graduation, fold, endowment, visitors, compendium, offline cap, and the studio shell are already tier-general — no logic changes.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`), Vitest, JSON5 content, Zod schemas.

## Global Constraints

- The amendment is law: SPEC §1.1 (landed 86efc4f) defines both rungs, their kinds (`edict`/`ministry` at nation, `chronicle`/`horizon` at world), and their unlocks. Do not re-amend.
- Kind mapping (mirrors city's institution/monument split): **ministry** and **chronicle** are the people-facing kinds (`social: true` + the event triple); **edict** and **horizon** carry practice-shaped and empty windows (`practice_level`, tick+lens, `no_dominant`).
- Engine purity: `src/engine` stays pure/sync. The only engine edit is `SCALE_VALUES` in `manifest.ts` (a const array) plus tests.
- Catalog rubric (P7) enforces every new row: name 3–40, one_liner 10–120 one sentence, subject 3–60 no terminal punctuation, detail 60–420 with 2+ sentences, tags 2–5 unique, no meter tokens, names unique per table.
- Figure/copy register: descriptive, concrete, adult; no doctrinal claims, no fabricated sayings, no merit/karma/enlightenment/spiritual language. New kinds are `pinnable: false` (every kind past person ships so).
- Practices referenced by policies/schedules already exist (the nine Tang practices incl. nianfo, medicine-rite, six-syllable). NO new practices this phase.
- `visitor_table_ref` per tier is the established convention string (`visitors/<tier>`) — city/region set the precedent; no new visitor rows this phase (org/town have none either).
- SIDs land in the same commit as the rows referencing them.
- Gate: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `pnpm lint` 0 errors; `pnpm test` all green (baseline 1096 + 2 skipped live; count grows). Do NOT use `pnpm tsc`. Clear keys before test runs: `$env:ZAI_API_KEY=$null; $env:MINIMAX_API_KEY=$null`.
- Commit only the files each task names. NEVER `git add -A`. Imperative commit messages.

---

### Task 1: Engine scale + tier registry rows

**Files:**

- Modify: `src/engine/manifest.ts:31` (SCALE_VALUES)
- Modify: `src/content/progression/base/tiers.json5` (2 rows)
- Modify: `src/content/progression/base/milestones.json5` (2 rows)
- Modify: `src/content/progression/base/roles.json5` (2 blocks)
- Modify: `src/i18n/en.json` (tier + graduation SIDs)
- Test: `src/content/progression/__tests__/loader.test.ts` (extend), `src/engine/__tests__/manifest.test.ts` (extend or re-pin)

**Interfaces:**

- Consumes: the TierFileSchema shape (`schema_version: 'tier/v0'`, id, scale, index, roster_size, member_unit, role_table_ref, unlock_milestone, fold_cadence, endowment_slots, visitor_table_ref); the milestone predicate vocabulary (`archived.<kind>`, `world_drafts.<scale>` — both already generic).
- Produces: `ManifestScale` includes `'nation' | 'world'` (Tasks 2–3 rely on this); tier rows `nation` (index 6) and `world` (index 7) load through the real registry; milestones `unlock-nation` / `unlock-world` resolve.

- [ ] **Step 1: Write the failing tests first**

In `loader.test.ts`, extend the tier suite (mirror how the city/region assertions are written — read the file first and follow its fixture style):

```ts
it('loads eight tiers in ladder order through world', () => {
  expect(registries.tiers.map((t) => t.id)).toEqual([
    'person',
    'household',
    'org',
    'town',
    'city',
    'region',
    'nation',
    'world',
  ]);
});

it('seats nation as member-bearing with a policy and world as a unit tier without one', () => {
  const nation = registries.roles.nation;
  const world = registries.roles.world;
  expect(nation?.policy).toBe('policy:nation-base');
  expect(world?.policy).toBeUndefined();
  expect(registries.tiers.find((t) => t.id === 'nation')?.member_unit).toBe('household');
  expect(registries.tiers.find((t) => t.id === 'world')?.member_unit).toBe('nation');
});
```

(READ-FIRST: check how `registries.roles` is typed — if the roles map is a closed Zod record keyed by string, the new blocks parse freely; if a test pins the role-table key set, extend it. Adjust the member_unit assertion for world if `unitRoster` semantics demand a different unit label — region ships `member_unit: 'town'`, its nearest unit tier below; world mirrors with `'nation'`.)

In `manifest.test.ts`:

```ts
it('SCALE_VALUES carries all eight scales in ladder order', () => {
  expect(SCALE_VALUES).toEqual([
    'person',
    'household',
    'org',
    'town',
    'city',
    'region',
    'nation',
    'world',
  ]);
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm vitest run src/content/progression/__tests__/loader.test.ts src/engine/__tests__/manifest.test.ts` → new tests FAIL (six scales, six tiers).

- [ ] **Step 3: Widen `SCALE_VALUES`** in `src/engine/manifest.ts`:

```ts
export const SCALE_VALUES = [
  'person',
  'household',
  'org',
  'town',
  'city',
  'region',
  'nation',
  'world',
] as const;
```

Search `src/` for `SCALE_VALUES` and any `toHaveLength(6)` scale pins; re-pin to 8 with a one-line comment `// eight tiers since the phase-8 amendment`.

- [ ] **Step 4: Add the tier rows** to `tiers.json5` (after region):

```json5
    {
      schema_version: 'tier/v0',
      id: 'nation',
      scale: 'nation',
      index: 6,
      roster_size: { min: 4, max: 60 },
      member_unit: 'household',
      role_table_ref: 'roles/nation',
      unlock_milestone: 'unlock-nation',
      fold_cadence: 4,
      endowment_slots: 5,
      visitor_table_ref: 'visitors/nation',
    },
    {
      schema_version: 'tier/v0',
      id: 'world',
      scale: 'world',
      index: 7,
      roster_size: { min: 2, max: 16 },
      member_unit: 'nation',
      role_table_ref: 'roles/world',
      unlock_milestone: 'unlock-world',
      fold_cadence: 4,
      endowment_slots: 6,
      visitor_table_ref: 'visitors/world',
    },
```

Update the file's header comment ("Six-tier chain ladder" → "Eight-tier chain ladder").

- [ ] **Step 5: Add the milestones** to `milestones.json5` (after unlock-region):

```json5
    {
      schema_version: 'milestone/v0',
      id: 'unlock-nation',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.legend', value: 1 },
          { op: 'gte', key: 'archived.road', value: 1 },
          { op: 'gte', key: 'world_drafts.region', value: 2 },
        ],
      },
      grants: { tier: 'nation', ceremony_sid: 'graduation.nation' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-world',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.edict', value: 1 },
          { op: 'gte', key: 'archived.ministry', value: 1 },
          { op: 'gte', key: 'world_drafts.nation', value: 2 },
        ],
      },
      grants: { tier: 'world', ceremony_sid: 'graduation.world' },
    },
```

Note the world milestone gates on Task 2's kinds (`edict`/`ministry`) — the loader validates milestones against the KIND registry, so if the cross-ref lint rejects unknown `archived.<kind>` keys before Task 2 lands, EITHER land the kinds rows for edict/ministry/chronicle/horizon in this commit too (just the kinds.json5 rows with empty catalogs — NO, that breaks TOTAL) — instead check how the loader validates `archived.<kind>` predicates: if it requires the kind to exist, move the two milestone rows into Task 2's commit and note it in the report. The tier rows stay here either way.

- [ ] **Step 6: Add the roles blocks** to `roles.json5` (after region):

```json5
  // Nation is member-bearing (Phase 8): the national institutions run
  // autonomously under `policy:nation-base`, mirroring the city pattern.
  nation: {
    roles: ['canal-commissioner', 'census-keeper', 'relay-inspector'],
    names: ['the Canal Board', 'the Counting House', 'the Relay Office'],
    policy: 'policy:nation-base',
  },
  // World is the terminal unit tier (nation is the member_unit): its roster
  // rows never run autonomously — mirroring the region pattern.
  world: {
    roles: ['chronicler', 'horizon-keeper', 'archive-master'],
    names: ['the Long Chronicle', 'the Cape Lighthouse', 'the Deep Archive'],
  },
```

NOTE: `policy:nation-base` does not exist until Task 2. If the roles lint requires the policy to resolve at load time, this file's nation block (and the milestone rows) move to Task 2 — check `src/content/progression/lint.ts` for the cross-ref rules FIRST and structure the commit so the loader stays green. The engine SCALE_VALUES widen + tier rows + SIDs always stay in Task 1.

- [ ] **Step 7: Add SIDs to `en.json`** — tier labels beside `tier_region_sid`:

```json
"tier_nation_sid": "Nation",
"tier_world_sid": "World"
```

And under `"graduation"` (READ-FIRST the existing `graduation.household` … `graduation.region` entries and mirror their exact key shape — title/body/narrative SIDs as the file has them) add `nation` and `world` entries in the same spare register, e.g. nation: the commission arrives; the region's ledgers close and the nation's open; the first harvest is a ministry. world: the chronicle takes the region, the nation, and everything below it; the last bench seats; the chain closes without a verdict.

- [ ] **Step 8: Full gate** — tsc 0, lint 0, all green (the ladder-e2e and other 6-tier tests must still pass — nation/world are locked behind milestones no test reaches yet; if ANY existing test breaks, that is a real ripple: stop and report).

- [ ] **Step 9: Commit**

```bash
git add src/engine/manifest.ts src/content/progression/base/tiers.json5 src/content/progression/base/milestones.json5 src/content/progression/base/roles.json5 src/i18n/en.json src/content/progression/__tests__/loader.test.ts src/engine/__tests__/manifest.test.ts
git commit -m "feat(engine): widen the scale ladder to nation and world"
```

---

### Task 2: Nation and world content

**Files:**

- Modify: `src/content/progression/base/kinds.json5` (10 rows)
- Modify: `src/content/progression/base/catalogs.json5` (4 blocks, 20 entries)
- Modify: `src/content/progression/base/policies.json5` (2 rows)
- Modify: `src/content/packs/tang-china/schedules.json5` (2 schedules)
- Modify: `src/i18n/en.json` (kind + schedule/block SIDs)
- Test: `src/content/progression/__tests__/loader.test.ts` (extend + re-pin counts)

**Interfaces:**

- Consumes: Task 1's `nation`/`world` scales and tier rows; the city/region kind-row pattern (5 rows per scale, TOTAL); the nine existing Tang practices.
- Produces: kinds `edict`/`ministry` (scale nation) and `chronicle`/`horizon` (scale world) with 5 catalog rows each; `policy:nation-base` / `policy:world-base`; `schedule:nation-day` / `schedule:world-day`. The milestone predicates from Task 1 (if deferred here) resolve.

- [ ] **Step 1: Write the failing loader tests** (extend loader.test.ts; mirror the city/region assertions):

```ts
it('loads nation and world kind rows with TOTAL fallbacks', () => {
  const nationRows = registries.kinds.filter((k) => k.scale === 'nation');
  const worldRows = registries.kinds.filter((k) => k.scale === 'world');
  expect(nationRows.map((k) => k.id).sort()).toEqual([
    'edict',
    'edict',
    'edict',
    'ministry',
    'ministry',
  ]);
  expect(worldRows.map((k) => k.id).sort()).toEqual([
    'chronicle',
    'chronicle',
    'chronicle',
    'horizon',
    'horizon',
  ]);
  for (const row of [...nationRows, ...worldRows]) {
    expect(row.pinnable).toBe(false);
    expect(row.catalog_ref.startsWith('core/')).toBe(true);
  }
});

it('nation and world catalogs carry five rubric-clean rows per kind', () => {
  for (const kind of ['edict', 'ministry', 'chronicle', 'horizon'] as const) {
    expect((registries.catalogs[kind] ?? []).length).toBeGreaterThanOrEqual(5);
  }
});

it('parses nation and world policies with real practice ids, disjoint from each other', () => {
  const nation = registries.policies.find((p) => p.id === 'policy:nation-base');
  const world = registries.policies.find((p) => p.id === 'policy:world-base');
  expect(nation?.schedule_ref).toBe('schedule:nation-day');
  expect(world?.schedule_ref).toBe('schedule:world-day');
  const n = new Set(nation?.practices ?? []);
  for (const p of world?.practices ?? []) expect(n.has(p)).toBe(false);
});
```

Re-pin the kind-row count: search for the pin asserting 33 kind rows (loader.test.ts) → 43, comment `// +5 nation, +5 world (phase 8)`.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Add the 10 kind rows** to `kinds.json5` (after the region block, comment in the file's established style):

```json5
    // ──────────────────────────────────────────────────────────────────────
    // Nation-scale rows (Phase 8). Ministry carries the people-facing
    // windows (a nation's standing bodies meet and decide); edict carries
    // the practice-shaped and empty windows (proclamations outlast the
    // ministries that seal them). Same TOTAL distribution as city/region.
    // ──────────────────────────────────────────────────────────────────────
    {
      schema_version: 'kind/v0',
      id: 'ministry',
      scale: 'nation',
      pinnable: false,
      catalog_ref: 'core/ministry',
      sid_ns: 'studio.kind_ministry_sid',
      min_quality: 0,
      match: { social: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'edict',
      scale: 'nation',
      pinnable: false,
      catalog_ref: 'core/edict',
      sid_ns: 'studio.kind_edict_sid',
      min_quality: 0,
      match: { dominant: 'practice_level' },
    },
    {
      schema_version: 'kind/v0',
      id: 'ministry',
      scale: 'nation',
      pinnable: false,
      catalog_ref: 'core/ministry',
      sid_ns: 'studio.kind_ministry_sid',
      min_quality: 0,
      match: { dominant_in: ['event_resolved', 'resource_edge', 'life_ended'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'edict',
      scale: 'nation',
      pinnable: false,
      catalog_ref: 'core/edict',
      sid_ns: 'studio.kind_edict_sid',
      min_quality: 0,
      match: { dominant_in: ['practice_tick', 'lens_chosen'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'edict',
      scale: 'nation',
      pinnable: false,
      catalog_ref: 'core/edict',
      sid_ns: 'studio.kind_edict_sid',
      min_quality: 0,
      match: { no_dominant: true },
    },

    // ──────────────────────────────────────────────────────────────────────
    // World-scale rows (Phase 8). Chronicle carries the people-facing
    // windows (the world's told things weave through nations); horizon
    // carries the practice-shaped and empty windows (the world's edges
    // outlast the stories). Same TOTAL distribution as city/region.
    // ──────────────────────────────────────────────────────────────────────
    {
      schema_version: 'kind/v0',
      id: 'chronicle',
      scale: 'world',
      pinnable: false,
      catalog_ref: 'core/chronicle',
      sid_ns: 'studio.kind_chronicle_sid',
      min_quality: 0,
      match: { social: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'horizon',
      scale: 'world',
      pinnable: false,
      catalog_ref: 'core/horizon',
      sid_ns: 'studio.kind_horizon_sid',
      min_quality: 0,
      match: { dominant: 'practice_level' },
    },
    {
      schema_version: 'kind/v0',
      id: 'chronicle',
      scale: 'world',
      pinnable: false,
      catalog_ref: 'core/chronicle',
      sid_ns: 'studio.kind_chronicle_sid',
      min_quality: 0,
      match: { dominant_in: ['event_resolved', 'resource_edge', 'life_ended'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'horizon',
      scale: 'world',
      pinnable: false,
      catalog_ref: 'core/horizon',
      sid_ns: 'studio.kind_horizon_sid',
      min_quality: 0,
      match: { dominant_in: ['practice_tick', 'lens_chosen'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'horizon',
      scale: 'world',
      pinnable: false,
      catalog_ref: 'core/horizon',
      sid_ns: 'studio.kind_horizon_sid',
      min_quality: 0,
      match: { no_dominant: true },
    },
```

- [ ] **Step 4: Add the 4 catalog blocks** to `catalogs.json5` (after the `road` block, before `visitor_tables`; comment style matching the city/region banners). The copy is authored and final — land verbatim (the P7 rubric test enforces the bands):

`edict` (fixed national marks):

```json5
    {
      kind: 'edict',
      entries: [
        {
          name: 'The salt monopoly edict',
          one_liner: 'One sheet of paper that fixed the price of salt for a decade.',
          subject: 'a salt monopoly edict',
          detail:
            'Sealed twice — ministry and throne — and posted at every prefecture gate. The clerks who copied it added their own errors; the collectors enforced those too. Salt stayed cheap at the coast and dear in the mountains, exactly as written.',
          tags: ['edict', 'salt'],
        },
        {
          name: 'The amnesty proclamation',
          one_liner: 'Printed and read aloud in every county seat on the same morning.',
          subject: 'an amnesty proclamation',
          detail:
            'Debts deferred, minor offenses struck, and three named exiles told they could come home. Two of the three arrived before the notice did. The third sent a letter and stayed where he was.',
          tags: ['amnesty', 'proclamation'],
        },
        {
          name: 'The canal toll statute',
          one_liner: 'The single page that made a thousand miles of water pay for itself.',
          subject: 'a canal toll statute',
          detail:
            'One cash per loaded barge, half for grain, nothing for ferrymen crossing with their own families. The toll-houses stamp a wooden tally at every lock, and the statute itself hangs framed in the northernmost one, gone amber with steam.',
          tags: ['canal', 'toll'],
        },
        {
          name: 'The census register',
          one_liner: 'The empire counting itself, household by household, on one long scroll.',
          subject: 'the national census scroll',
          detail:
            'Every roof, every ox, every son of fighting age, called out to a clerk and written down in triplicate. The scroll is wrong in the ways the empire is wrong, and accurate in the ways it is stubborn.',
          tags: ['census', 'register'],
        },
        {
          name: 'The frontier command',
          one_liner: 'The order that moved ten thousand men by naming one man.',
          subject: 'a frontier command',
          detail:
            "It appoints a general, fixes his supply, and wishes him luck in the classical style. The seal is the largest in the ministry's cabinet, and the smallest part of the document it closes.",
          tags: ['frontier', 'command'],
        },
      ],
    },
```

`ministry` (standing bodies):

```json5
    {
      kind: 'ministry',
      entries: [
        {
          name: 'The canal board',
          one_liner: 'Five commissioners who argue one river into obedience.',
          subject: 'the canal board',
          detail:
            "They meet above the lock-gates every tenth day. Upstream wants water, downstream wants it more, and the board allocates both with an abacus and infinite patience. Their minute-books are the river's other bed.",
          tags: ['canal', 'board'],
        },
        {
          name: 'The census bureau',
          one_liner: 'The counting house that never finishes counting.',
          subject: 'the census bureau',
          detail:
            'A courtyard of copyists updating a nation that will not hold still. Births arrive faster than brushes; whole villages move in the time it takes to ink their names. The bureau calls this margin of error, and the villages call it living.',
          tags: ['census', 'bureau'],
        },
        {
          name: 'The salt inspectorate',
          one_liner: "The office that tastes the empire's salt and sets its price.",
          subject: 'the salt inspectorate',
          detail:
            'Inspectors sample every pan at the coast and every sack at the pass. The honest salt passes; the honest inspector is promoted, usually somewhere damp. The inspectorate balances its ledger to the coin, which is its way of praying.',
          tags: ['salt', 'inspectorate'],
        },
        {
          name: 'The granary commission',
          one_liner: 'The desks where famine is arithmetic, and the arithmetic is kind.',
          subject: 'the granary commission',
          detail:
            "They track the empire's stored grain the way physicians track a pulse: too fast is as bad as too slow. When a prefecture runs low, the commission moves surplus before the prefecture's letter arrives, then charges it to the ledger politely.",
          tags: ['granary', 'commission'],
        },
        {
          name: 'The relay administration',
          one_liner: "The office that keeps the empire's horses where its news is.",
          subject: 'the relay administration',
          detail:
            'Stables, stages, and a wall-map stabbed with pins for every rider. An order crossed the empire in nine days last spring, which the administration mentions at every meeting, and which no other office has yet matched.',
          tags: ['relay', 'administration'],
        },
      ],
    },
```

`chronicle` (the world's told things):

```json5
    {
      kind: 'chronicle',
      entries: [
        {
          name: 'The comet-year chronicle',
          one_liner: 'Every surviving copy says the tail pointed somewhere different.',
          subject: 'the comet-year chronicle',
          detail:
            'The comet appeared at harvest and stayed through the frost. Nine chroniclers in nine cities drew it nine ways, and each drawing predicts the dynasty that commissioned the next. The sky has not repeated itself since.',
          tags: ['comet', 'chronicle'],
        },
        {
          name: 'The ledger of favors',
          one_liner: 'A record kept by nobody official and consulted by everyone.',
          subject: 'the ledger of favors',
          detail:
            'Not a book — a habit. Somewhere in every generation someone writes down who saved whom, and the debt outlives the paper. The current keeper lives above a dye shop and tells no one, which is how everyone knows.',
          tags: ['favors', 'ledger'],
        },
        {
          name: 'The pilgrimage accounts',
          one_liner: 'Every road to every shrine, told by the people who walked them.',
          subject: 'the pilgrimage accounts',
          detail:
            'A genre without an author: travelers leaving notes at inns for travelers behind them. The water at the third spring is safe; the pass is cruel in the fourth month; the innkeeper at the border counts spoons. The accounts grow by one page a year and are never finished.',
          tags: ['pilgrimage', 'accounts'],
        },
        {
          name: 'The famine letters',
          one_liner: 'The correspondence of two bad years, kept because it should not repeat.',
          subject: 'the famine letters',
          detail:
            'A magistrate wrote north for grain and the north wrote back for time. Between the requests and the refusals, the letters trace exactly how a bad year becomes a worse one. Schools copy them now, badly, on purpose.',
          tags: ['famine', 'letters'],
        },
        {
          name: 'The map of the mute cartographer',
          one_liner: 'A map of the whole world drawn by a man who never described it.',
          subject: "the mute cartographer's map",
          detail:
            'He walked the roads for forty years and drew what he found, and never once wrote what he thought. The map is accurate where he went and speculative where he dreamed, and the difference has never been settled.',
          tags: ['map', 'cartographer'],
        },
      ],
    },
```

`horizon` (the world's edges):

```json5
    {
      kind: 'horizon',
      entries: [
        {
          name: "The silk road's western end",
          one_liner: 'Where the road stops agreeing about its own name.',
          subject: "the silk road's western end",
          detail:
            'Caravans arrive speaking three languages and none of them calls the road the same thing. The last stone marker stands in a market that has outgrown it, and the road continues past its own ending out of habit.',
          tags: ['silk', 'road'],
        },
        {
          name: "The sea route's first cape",
          one_liner: 'The headland where coastal courage becomes ocean courage.',
          subject: "the sea route's first cape",
          detail:
            'Sailors round it with a sacrifice and return without explaining what they gave. Past the cape the water changes color and the captains change gods, or so the taverns claim. The lighthouse is newer than the fear.',
          tags: ['sea', 'cape'],
        },
        {
          name: 'The pillar of the northern pass',
          one_liner: 'The last marker before the road stops being a road.',
          subject: 'the northern terminus pillar',
          detail:
            'Beyond it the pass narrows to a footpath and the footpath to a story. Traders leave what they cannot carry at its base; the pile has been robbed, rebuilt, and robbed again for longer than the pillar has stood.',
          tags: ['pillar', 'pass'],
        },
        {
          name: "The desert's middle well",
          one_liner: 'The one water between here and there, and everyone knows it.',
          subject: "the desert's middle well",
          detail:
            'Dug in a dynasty the current one does not name, maintained by whoever needs it next. The well has never gone dry and never been guarded; the desert enforces its own etiquette.',
          tags: ['desert', 'well'],
        },
        {
          name: 'The strait of two tides',
          one_liner: 'Where two oceans argue and the ships wait for a decision.',
          subject: 'the strait of two tides',
          detail:
            'The tides meet from opposite directions and the water stands up in ridges. Pilots cross only at the slack, in company, with the older ships going first. The strait has swallowed fleets and returned letters, which it keeps.',
          tags: ['strait', 'tides'],
        },
      ],
    },
```

- [ ] **Step 5: Add the policies** to `policies.json5` (after region-base):

```json5
    {
      schema_version: 'policy/v0',
      id: 'policy:nation-base',
      practices: [
        'practice:tang/sutra-copying',
        'practice:tang/medicine-rite',
        'practice:tang/breath-sitting',
      ],
      schedule_ref: 'schedule:nation-day',
      choice_weights: {},
    },
    {
      schema_version: 'policy/v0',
      id: 'policy:world-base',
      practices: [
        'practice:tang/six-syllable-recitation',
        'practice:tang/nianfo-recitation',
        'practice:tang/evening-visit',
      ],
      schedule_ref: 'schedule:world-day',
      choice_weights: {},
    },
```

- [ ] **Step 6: Add the schedules** to `schedules.json5` (after region-day; comment style matching city-day/region-day). `nation-day` (member-bearing — its member rows run it; city-day is the template):

```json5
    {
      id: 'schedule:nation-day',
      name_sid: 'tang.schedule.nation_day.name_sid',
      blocks: [
        {
          id: 'block:nation-day/night-rest',
          label_sid: 'tang.block.nation_day.night_rest.label_sid',
          startHour: 0,
          endHour: 5,
          practice_id: null,
          icon_sid: 'tang.block.nation_day.night_rest.icon_sid',
        },
        {
          id: 'block:nation-day/dawn-sitting',
          label_sid: 'tang.block.nation_day.dawn_sitting.label_sid',
          startHour: 5,
          endHour: 8,
          practice_id: 'practice:tang/breath-sitting',
          icon_sid: 'tang.block.nation_day.dawn_sitting.icon_sid',
        },
        {
          id: 'block:nation-day/morning-copying',
          label_sid: 'tang.block.nation_day.morning_copying.label_sid',
          startHour: 8,
          endHour: 12,
          practice_id: 'practice:tang/sutra-copying',
          icon_sid: 'tang.block.nation_day.morning_copying.icon_sid',
        },
        {
          id: 'block:nation-day/midday-rites',
          label_sid: 'tang.block.nation_day.midday_rites.label_sid',
          startHour: 12,
          endHour: 15,
          practice_id: 'practice:tang/medicine-rite',
          icon_sid: 'tang.block.nation_day.midday_rites.icon_sid',
        },
        {
          id: 'block:nation-day/afternoon-alms',
          label_sid: 'tang.block.nation_day.afternoon_alms.label_sid',
          startHour: 15,
          endHour: 19,
          practice_id: 'practice:tang/alms-round',
          icon_sid: 'tang.block.nation_day.afternoon_alms.icon_sid',
        },
        {
          id: 'block:nation-day/evening-watch',
          label_sid: 'tang.block.nation_day.evening_watch.label_sid',
          startHour: 19,
          endHour: 22,
          practice_id: null,
          icon_sid: 'tang.block.nation_day.evening_watch.icon_sid',
        },
        {
          id: 'block:nation-day/lamps-down',
          label_sid: 'tang.block.nation_day.lamps_down.label_sid',
          startHour: 22,
          endHour: 24,
          practice_id: null,
          icon_sid: 'tang.block.nation_day.lamps_down.icon_sid',
        },
      ],
    },
```

`world-day` (mirrors the region precedent — shipped for the registry though its unit rows never run it):

```json5
    {
      id: 'schedule:world-day',
      name_sid: 'tang.schedule.world_day.name_sid',
      blocks: [
        {
          id: 'block:world-day/night-rest',
          label_sid: 'tang.block.world_day.night_rest.label_sid',
          startHour: 0,
          endHour: 6,
          practice_id: null,
          icon_sid: 'tang.block.world_day.night_rest.icon_sid',
        },
        {
          id: 'block:world-day/morning-recitation',
          label_sid: 'tang.block.world_day.morning_recitation.label_sid',
          startHour: 6,
          endHour: 10,
          practice_id: 'practice:tang/nianfo-recitation',
          icon_sid: 'tang.block.world_day.morning_recitation.icon_sid',
        },
        {
          id: 'block:world-day/midday-copying',
          label_sid: 'tang.block.world_day.midday_copying.label_sid',
          startHour: 10,
          endHour: 14,
          practice_id: 'practice:tang/sutra-copying',
          icon_sid: 'tang.block.world_day.midday_copying.icon_sid',
        },
        {
          id: 'block:world-day/afternoon-rest',
          label_sid: 'tang.block.world_day.afternoon_rest.label_sid',
          startHour: 14,
          endHour: 17,
          practice_id: null,
          icon_sid: 'tang.block.world_day.afternoon_rest.icon_sid',
        },
        {
          id: 'block:world-day/evening-recitation',
          label_sid: 'tang.block.world_day.evening_recitation.label_sid',
          startHour: 17,
          endHour: 21,
          practice_id: 'practice:tang/six-syllable-recitation',
          icon_sid: 'tang.block.world_day.evening_recitation.icon_sid',
        },
        {
          id: 'block:world-day/lamps-down',
          label_sid: 'tang.block.world_day.lamps_down.label_sid',
          startHour: 21,
          endHour: 24,
          practice_id: null,
          icon_sid: 'tang.block.world_day.lamps_down.icon_sid',
        },
      ],
    },
```

- [ ] **Step 7: Add the SIDs** to `en.json` — kind labels beside `kind_legend_sid`:

```json
"kind_edict_sid": "Edict",
"kind_ministry_sid": "Ministry",
"kind_chronicle_sid": "Chronicle",
"kind_horizon_sid": "Horizon"
```

Schedule + block SIDs: `tang.schedule.nation_day.name_sid` ("The nation's day"), `tang.schedule.world_day.name_sid` ("The world's day"), and each block's label/icon (bare icon names matching the sibling convention — e.g. nation: moon, breath, brush, bowl, rice, lamp, star; world: moon, bell, brush, sun, bell, star — match the actual icon vocabulary the siblings use, READ-FIRST).

- [ ] **Step 8: Full gate** — tsc 0, lint 0, all green. The P7 rubric test now covers the 20 new rows automatically.

- [ ] **Step 9: Commit**

```bash
git add src/content/progression/base/kinds.json5 src/content/progression/base/catalogs.json5 src/content/progression/base/policies.json5 src/content/packs/tang-china/schedules.json5 src/i18n/en.json src/content/progression/__tests__/loader.test.ts
git commit -m "feat(content): ship nation and world tiers as data"
```

---

### Task 3: Full-ladder E2E + UI surface

**Files:**

- Modify: `src/engine/__tests__/ladder-e2e.test.ts` (FULL_LADDER_IDS 6→8, graduations through world)
- Modify: `src/engine/__tests__/graduation.test.ts` (nation member-bearing seeding, world unitRoster)
- Modify: `src/ui/__tests__/StudioViewLadder.test.tsx` (rail renders the two new rungs)
- Test: the three files above

**Interfaces:**

- Consumes: Tasks 1–2 (eight tiers load; milestones resolve; kinds/catalogs ship).
- Produces: proof of the amendment's done-line — six graduations become eight, fold chain spans eight benches, determinism byte-identical at full depth, nation seats member rows under `policy:nation-base`, world seats unit rows.

- [ ] **Step 1: Extend `ladder-e2e.test.ts`** — READ-FIRST the existing six-tier drive (how it graduates through real content: milestone predicates fed by harvesting tier kinds + recording world drafts). Update:

```ts
const FULL_LADDER_IDS = [
  'person',
  'household',
  'org',
  'town',
  'city',
  'region',
  'nation',
  'world',
] as const;
const FULL_LADDER_UNLOCK_IDS = [
  'unlock-household',
  'unlock-org',
  'unlock-town',
  'unlock-city',
  'unlock-region',
  'unlock-nation',
  'unlock-world',
] as const;
```

Extend the drive to graduate nation (feed the region bench until `archived.legend ≥ 1`, `archived.road ≥ 1`, and record 2 region-scale world drafts) and world (feed the nation bench until `archived.edict ≥ 1`, `archived.ministry ≥ 1`, 2 nation-scale drafts). The existing assertions then cover everything: benches keys = FULL_LADDER_IDS, milestones_done = FULL_LADDER_UNLOCK_IDS, fold markers across eight benches, byte-identical determinism (the two-run `toEqual` and chained replay already generalize). Also harvest one nation-scale card and assert `scale: 'nation'` and a nation kind (mirroring the city-scale harvest assertion).

- [ ] **Step 2: Extend `graduation.test.ts`** — two tests mirroring the city (member-bearing) and region (unit) precedents:

```ts
it('graduating to nation seeds autonomous member rows under policy:nation-base', () => {
  // drive a session through unlock-nation; assert the nation bench's roster
  // rows carry member slices, unique ids (nation-m1...), and the seated
  // policy — mirroring the city graduation test's shape.
});

it('graduating to world seats one inert unit row per unlocked lower rung', () => {
  // drive through unlock-world; assert unitRoster returns rows for every
  // unlocked tier (person..nation) and none for world itself — mirroring
  // the region unitRoster tests, including the out-of-order guard if the
  // sibling has one.
});
```

(READ-FIRST the sibling city/region tests in the same file and mirror their session-fixture helpers exactly.)

- [ ] **Step 3: Extend `StudioViewLadder.test.tsx`** — the rail disclosure test renders the new rungs: nation locked-badge appears once region is unlocked; world masked until nation unlocks; full disclosure renders 8 rows. Mirror the existing city/region ladder tests' render harness.

- [ ] **Step 4: Full gate** — tsc 0, lint 0, all green. Expect the test count to grow ~6–10.

- [ ] **Step 5: Commit**

```bash
git add src/engine/__tests__/ladder-e2e.test.ts src/engine/__tests__/graduation.test.ts src/ui/__tests__/StudioViewLadder.test.tsx
git commit -m "feat(engine): prove the eight-tier ladder end to end"
```

---

### Task 4: Close out the program

**Files:**

- Modify: `docs/superpowers/specs/2026-08-24-harvest-quality-program.md` (§9 done-when + a short Phase 8 record)
- Test: none — full gate re-run

- [ ] **Step 1:** In §9, mark Phase 8's line done: "Phase 8: user-approved §1.1 amendment (86efc4f), then the nation and world rungs shipped as data — eight tiers end to end." Append a short `## 11. Ladder extension record (Phase 8)` noting: the amendment's gate (user approval 2026-08-24, before any code), the two rungs' shapes (nation member-bearing / world terminal unit), kinds (`edict`/`ministry`, `chronicle`/`horizon`), unlocks as ratified, and that no engine logic changed beyond `SCALE_VALUES`.

- [ ] **Step 2:** Full gate + commit

```bash
git add docs/superpowers/specs/2026-08-24-harvest-quality-program.md
git commit -m "docs: close the harvest-quality program at eight tiers"
```

---

## Self-Review (completed during planning)

- **Amendment coverage:** §1.1's two new rows → Task 1 (tiers/milestones/roles/SIDs) + Task 2 (kinds/catalogs/policies/schedules); "member-bearing (nation)" → roles block with policy + graduation member test; "unit rows (world)" → unitRoster test; unlocks exactly as ratified (legend/road/2 region drafts; edict/ministry/2 nation drafts).
- **Precedent fidelity:** kind rows copy the city/region TOTAL distribution exactly (ministry/chronicle = social + event triple; edict/horizon = practice_level + tick/lens + no_dominant); policies mirror the base pattern with disjoint practice sets; schedules mirror city-day (member-bearing) and region-day (registry precedent); visitor_table_ref follows the convention-string pattern (org/town ship no visitor rows — so nation/world don't either).
- **Commit-boundary risk (flagged in Task 1 Steps 5–6):** the loader's cross-ref lints may require milestones' `archived.<kind>` keys and roles' `policy` refs to resolve at load time — if so, the milestone + nation-roles additions move to Task 2's commit so the tree stays green at every commit. The implementer checks `src/content/progression/lint.ts` first and structures accordingly; either split is acceptable as long as each commit is independently green.
- **Type consistency:** kind ids (`edict`, `ministry`, `chronicle`, `horizon`) identical across kinds.json5, catalogs.json5, milestones, loader tests, and SIDs; policy ids `policy:nation-base`/`policy:world-base` identical across policies.json5, roles.json5, and tests; schedule ids `schedule:nation-day`/`schedule:world-day` identical across policies and schedules.
- **Placeholders:** none — all 20 catalog rows, 10 kind rows, 2 policies, 2 schedules, and SIDs are authored in full. Read-first adaptations are called out inline (loader fixture style, graduation SID shape, icon vocabulary, sibling test harnesses).
