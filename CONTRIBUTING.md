# Contributing

**Authority:** [`SPEC.md`](SPEC.md) is the product constitution; [`AGENTS.md`](AGENTS.md) is how to touch this repo. They supersede this file wherever they conflict. Rewrite this file when you touch it.

This file describes how to add content, run the gate, and ship. Named figures and real mantras are in play (SPEC §11). The remaining fences are game-design rules, not piety.

---

## Table of contents

1. [Code-quality contract](#code-quality-contract)
2. [Content-authoring contract](#content-authoring-contract)
3. [Extending the game](#extending-the-game)
   - 3.1 [Add a Manifest kind](#31-add-a-manifest-kind)
   - 3.2 [Add a tier](#32-add-a-tier-beyond-region-or-a-variant-ladder)
   - 3.3 [Add an endowment track](#33-add-an-endowment-track)
   - 3.4 [Add a visitor](#34-add-a-visitor)
   - 3.5 [Add a milestone or compendium entry](#35-add-a-milestone-or-compendium-entry)
   - 3.6 [Add an era pack at a tier](#36-add-an-era-pack-at-a-tier)
4. [Running tests](#running-tests)
5. [Adding a new test](#adding-a-new-test)
6. [Commit conventions](#commit-conventions)

---

## Code-quality contract

These are the 12 criteria the F2 code-quality review enforces. Every PR passes all 12. Any PR that breaks one is auto-rejected.

1. No `as any` anywhere in `src/`
2. No `@ts-ignore` or `@ts-expect-error` anywhere in `src/`
3. No empty catch blocks anywhere in `src/`
4. No files >250 LOC in `src/engine/` (extract a module)
5. No circular dependencies in `src/`
6. No leaked platform APIs in `src/engine/` (no `react`, `react-native`, `expo`, `Date.now`, `Math.random`, `fetch`, `process.env`, `console`)
7. No `Math.random()` in `src/engine/` (use the seeded RNG from `src/engine/rng.ts`)
8. No `Date.now()` or `new Date()` in `src/engine/`
9. No `as any` in `src/content/` (the schema and lint are the engine's contract)
10. All `src/content/packs/**/*.json5` files pass `loadEraPack()` with zero lint violations
11. Engine purity fence — `grep -rn "from \"react\"\|from \"react-native\"\|from \"expo\"\|Math\.random\|Date\.now\|new Date" src/engine/ --include="*.ts"` returns zero matches
12. Prohibited mechanics fence — `grep -rn "karma_delta\|merit_delta\|enlightenment_delta\|spiritual_rank_delta" src/` returns zero matches (enforcement tests exempt)

Run all gates locally:

```bash
pnpm tsc --noEmit       # typecheck
pnpm lint              # eslint
pnpm test              # vitest
```

---

## Content-authoring contract

These are the four game-design rules. The schema (`src/content/schema.ts`) and the progression lint (`src/content/progression/lint.ts`) enforce them. Named figures and real mantras are allowed.

| Rule                          | Mechanic                                                                                         | Why                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **R-NO-KARMA-METER**          | An effect key named `karma`, `merit`, `spiritual_rank`, or `enlightenment`                       | Residue → Manifest is the economy. A soul score is a worse game. |
| **R-NO-DONATION-OFFSET**      | A choice that pairs a harm consequence with a donation/alms/merit effect                         | Pay-to-absolve is a dead loop.                                   |
| **R-NO-VISIBLE-KARMA-METER**  | An identifier that exposes karma/merit/spiritual as a `_meter` / `_score` / `_visible` to the UI | Same as R-NO-KARMA-METER at the UI layer.                        |
| **R-NO-PRACTICE-AS-CURRENCY** | A practice that mints `merit`/`karma`/`gold` or tells the player to "earn" a balance             | Practices produce residue. They do not mint a second currency.   |

`advisory/prohibited-names.txt` and `src/content/prohibited-names.ts` are archive. The lint that once read them is gone.

---

## Extending the game

Content ships as Zod + JSON5 packs. Two pack roots exist:

- **Era packs** — `src/content/packs/<era>/`. A pack declares its era, role set, events, endings, practices, schedules, and a `tier` field for tier-aware flavor.
- **Progression packs** — `src/content/progression/base/`. The six tiers, kinds, milestones, policies, endowment tracks, visitors, compendium entries, and catalogs.

Player-facing strings are SIDs in `src/i18n/en.json`. Named figures (a Buddha, a bodhisattva, a historical teacher, a yakṣa at the gate) and real mantras may appear in catalogs and events (SPEC §11) — they need no special-casing in the schema.

The recipes below are how a future agent adds a feature without reading the whole engine.

### 3.1 Add a Manifest kind

1. Row in `base/kinds.json5` (compile rule, catalog ref, `sid_ns`, `min_quality`).
2. Table catalog entries in the kind's catalog namespace.
3. SIDs: `kind.<id>.name`, `kind.<id>.line`, plus catalog entry SIDs.
4. Lint: table entries present; SIDs resolve.
5. Tests: a residue window matching the compile rule harvests the new kind at its scale; table fill returns a valid `manifest/v1`.
6. Done when: cook a qualifying window at that tier, harvest the kind, pin it.

### 3.2 Add a tier (beyond region, or a variant ladder)

1. Row in `base/tiers.json5` + its kind-set rows + unlock milestone row.
2. Role table and name tables for the roster; policies.
3. SIDs for rail label, ceremony, roles, kinds.
4. Tests: milestone crossing unlocks the tier; fold-up feeds its bench; world draft assembles at its scale.
5. Done when: full loop — unlock, auto-produce, harvest, pin, endow, embody.

### 3.3 Add an endowment track

1. Row in `base/endowment.json5` with EffectOps.
2. Lint: ops pass prohibited-mechanics rules.
3. Tests: endowing consumes the Manifest and applies the modifier; modifier math is deterministic.
4. Done when: endow a duplicate card, observe the bench stat change.

### 3.4 Add a visitor

1. Row in `base/visitors.json5` (cadence, duration, effects or table ref).
2. SIDs: arrival banner, active line, departure.
3. Tests: arrival tick is deterministic from seed + tick count; effect applies for exactly N windows.
4. Done when: advance ticks to the arrival, banner shows, effect expires.

### 3.5 Add a milestone or compendium entry

1. Row in the matching JSON5 with a predicate.
2. SIDs: label, progress line, reward line.
3. Tests: predicate false → true crossing fires exactly once; reward applies.
4. Done when: construct an archive that crosses it; ceremony/reward fires.

### 3.6 Add an era pack at a tier

Era packs already declare practices, schedules, events, figures. Tiers consume packs: a pack may declare `tier: "org"` and ship org-flavored practices, events, visitors, and name tables. Recipe matches today's pack-authoring rules plus the tier field and the §3.4 visitor recipe.

---

## Running tests

```bash
pnpm test                   # run all tests once
pnpm test:watch             # re-run on file change
pnpm test:ui                # interactive Vitest UI
pnpm test -- src/engine     # run just engine tests
pnpm test -- src/content    # run just content tests
pnpm test -- src/ui         # run just UI tests
```

Test files live next to the code they test:

- `src/engine/__tests__/*.test.ts` (engine property + unit tests)
- `src/content/__tests__/*.test.ts` (schema + lint tests)
- `src/content/packs/<era>/__tests__/*.test.ts` (per-era pack tests)
- `src/content/progression/__tests__/*.test.ts` (progression schema + lint + loader tests)
- `src/ui/__tests__/*.test.ts` (component tests via test-renderer shim)
- `src/persistence/__tests__/*.test.ts` (save/load round-trip)

---

## Adding a new test

1. **Engine property test** — use `fast-check` for invariants:

   ```ts
   import { fc, test } from 'fast-check';
   import { describe, expect } from 'vitest';
   import { summarizeLife } from '@/engine/echo';
   import { createLifeState } from '@/engine/reducer';

   describe('echo property: tendency thresholds', () => {
     test('tendency echo requires >40% dominant share', () => {
       fc.assert(
         fc.property(
           fc.array(fc.constantFrom('care', 'greed', 'aversion', 'delusion'), {
             minLength: 10,
             maxLength: 50,
           }),
           (history) => {
             const state = createLifeState(/* ... */);
             state.intent_root_history = history;
             const karma = summarizeLife(state, 'life-1');
             // invariant assertions
           },
         ),
       );
     });
   });
   ```

2. **Content schema test** — add to `src/content/__tests__/schema.test.ts`:

   ```ts
   it('rejects karma_delta effect at parse', () => {
     const badPack = {/* ...valid pack with karma_delta effect... */};
     expect(() => EraPackSchema.parse(badPack)).toThrow();
   });
   ```

3. **Lint test** — add to `src/content/__tests__/lint.test.ts`:

   ```ts
   it('rejects a karma resource key', () => {
     const pack = makePackWithResourceKey('karma');
     const report = lintPack(pack);
     expect(report.passed).toBe(false);
     expect(report.violations[0].rule).toBe('R-NO-KARMA-METER');
   });
   ```

4. **UI test** — follow the test-renderer shim pattern at `src/test/rntl.ts`:
   ```ts
   import { renderWithShim } from '@/test/rntl';

   it('reflect card shows three sections', () => {
     const { getByText } = renderWithShim(<ReflectCard entry={mockEntry} onContinue={() => {}} onRemember={() => {}} />);
     expect(getByText('What you intended')).toBeTruthy();
     expect(getByText('What happened')).toBeTruthy();
     expect(getByText('What you carry')).toBeTruthy();
   });
   ```

---

## Commit conventions

Use **conventional commits** with the `feat`/`test`/`docs`/`ci`/`fix`/`chore` scope:

```
feat(engine): add pattern-break echo detector
test(engine): property test for no-karma-to-identity invariant
docs(spec): ratify the six-tier ladder
ci: github actions workflows for test, eas build, and maestro e2e
fix(ui): resolve document-title and region accessibility violations
chore: commit durable advisory document + invariant test artifact
```

- One atomic commit per change (implementation + test in one commit)
- Husky pre-commit hook runs `lint-staged` (prettier + eslint + tsc) on staged files
- Pre-commit hook fails on any tsc error, including in unrelated working-tree files

---

## See also

- `SPEC.md` — the product constitution
- `AGENTS.md` — how to work in the repo
- `docs/superpowers/specs/2026-08-16-tiered-progression-design.md` — the design doc behind the ladder
