# Contributing

> How to extend Yakshetra — adding events, era packs, lenses, and tests.
> Every contribution must respect the two load-bearing contracts:
> the **code-quality contract** (F2) and the **content-authoring contract**
> (the 5 prohibited mechanics).

---

## Table of contents

1. [Code-quality contract (12 criteria from F2)](#code-quality-contract)
2. [Content-authoring contract (5 prohibited mechanics)](#content-authoring-contract)
3. [Adding a new event to an existing era pack](#adding-a-new-event)
4. [Adding a new era pack](#adding-a-new-era-pack)
5. [Adding a new lens (don't — they're fixed at six)](#adding-a-new-lens)
6. [Adding a new content-warning category (don't — they're fixed at nine)](#adding-a-new-warning-category)
7. [Running tests](#running-tests)
8. [Adding a new test](#adding-a-new-test)
9. [Commit conventions](#commit-conventions)
10. [Submitting a PR](#submitting-a-pr)

---

## Code-quality contract

These are the 12 criteria enforced by the F2 code-quality review. Every PR
must pass all 12. Any PR that breaks one is auto-rejected.

1. No `as any` anywhere in `src/`
2. No `@ts-ignore` or `@ts-expect-error` anywhere in `src/`
3. No empty catch blocks anywhere in `src/`
4. No files >250 LOC in `src/engine/` (large files indicate missing decomposition)
5. No circular dependencies in `src/`
6. No leaked platform APIs in `src/engine/` (no `react`, `react-native`, `expo`, `Date.now`, `Math.random`, `fetch`, `process.env`, `console`)
7. No `Math.random()` anywhere in `src/engine/` (use the seeded RNG from `src/engine/rng.ts`)
8. No `Date.now()` or `new Date()` anywhere in `src/engine/`
9. No `as any` in `src/content/` (the schema and lint are the Buddhist-ethics guarantee)
10. All `src/content/packs/**/*.json5` files pass `loadEraPack()` with zero lint violations
11. Engine purity fence — `grep -rn "from \"react\"\|from \"react-native\"\|from \"expo\"\|Math\.random\|Date\.now\|new Date" src/engine/ --include="*.ts"` returns zero matches
12. Prohibited mechanics fence — `grep -rn "karma_delta\|merit_delta\|enlightenment_delta\|spiritual_rank_delta" src/` returns zero matches (enforcement tests exempt)

Run all gates locally:

```bash
pnpm tsc --noEmit       # typecheck
pnpm lint              # eslint
pnpm test              # vitest
node scripts/audit-plan.mjs   # F1 plan compliance
```

---

## Content-authoring contract

These are the 5 prohibited mechanics. The content schema (`src/content/schema.ts`)
enforces them at parse time; the lint (`src/content/lint.ts`) catches textual
violations. Both must pass for any era pack to ship.

| Rule                         | Mechanic                                                                                                                  | Why it's prohibited                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **R-NO-KARMA-METER**         | Any effect that adds/subtracts a "karma" or "merit" or "spiritual_rank" or "enlightenment" value                          | Numeric karmic accounting trivializes the tradition's qualitative ethical framework and produces the "score rises by giving" anti-pattern. |
| **R-NO-SACRED-NAMES**        | Any use of the 40 names in `advisory/prohibited-names.txt` in narrative text, source bibliography, or glossary            | The game does not depict named Buddhas, bodhisattvas, arahants, or historical teachers as characters.                                      |
| **R-NO-DONATION-OFFSET**     | Any choice that offsets a harm-consequence with a donation/merit effect                                                   | This creates the morally bankrupt "I can sin if I donate" pattern the tradition explicitly rejects.                                        |
| **R-NO-VISIBLE-KARMA-METER** | Any field that exposes karma/merit/spiritual as a numeric meter to the player UI                                          | Same as R-NO-KARMA-METER but at the UI layer.                                                                                              |
| **R-NO-REAL-MANTRA**         | Any use of Sanskrit/Tibetan seed syllables (ॐ, oṁ, aḥ, hūṁ, hrih, hrīḥ, dhih, dhīḥ, bhrūm, vajra, etc.) in narrative text | Real mantras are devotional practice, not game content. Using them trivializes living religious practice.                                  |

---

## Adding a new event to an existing era pack

**Example: adding `event:tang/monsoon-flood` to the Tang China pack.**

1. **Add the event schema** to `src/content/packs/tang-china/events.json5`:

   ```json5
   {
     id: 'event:tang/monsoon-flood',
     weight: 1.0,
     cooldown_turns: 5,
     once_per_run: false,
     trigger: {
       op: 'gte',
       key: 'age',
       value: 18,
     },
     choices: [
       {
         id: 'choice:tang/flood-help-neighbors',
         label_sid: 's:event.tang.monsoon-flood.choice.help-neighbors.label',
         requires: [],
         effects: [
           { op: 'set_intent_root', intent_root: 'care' },
           { op: 'add_resource', key: 'provisions', delta: -10 },
           { op: 'add_relationship', target: 'neighbor-clan', delta: 5 },
         ],
         forbidden: false,
       },
       {
         id: 'choice:tang/flood-seek-high-ground',
         label_sid: 's:event.tang.monsoon-flood.choice.seek-high-ground.label',
         requires: [],
         effects: [
           { op: 'set_intent_root', intent_root: 'delusion' },
           { op: 'add_resource', key: 'provisions', delta: -3 },
         ],
         forbidden: false,
       },
     ],
     content_warnings: ['death-of-family', 'poverty-starvation'],
   }
   ```

2. **Add string entries** to `src/i18n/en.json`:

   ```json
   "event.tang.monsoon-flood.choice.help-neighbors.label": "Help neighbors evacuate"
   "event.tang.monsoon-flood.choice.seek-high-ground.label": "Seek high ground for your own household"
   ```

3. **Add a content-warning audit test** at `src/content/packs/tang-china/__tests__/events.test.ts`:

   ```ts
   it('event:tang/monsoon-flood has correct content warnings', () => {
     const ev = events.find((e) => e.id === 'event:tang/monsoon-flood');
     expect(ev?.content_warnings).toContain('death-of-family');
     expect(ev?.content_warnings).toContain('poverty-starvation');
   });
   ```

4. **Run all gates** to confirm:
   ```bash
   pnpm test
   node scripts/audit-plan.mjs
   ```

---

## Adding a new era pack

**Example: adding a Heian Japan pack (`era:heian-japan@0.1.0`).**

1. **Create the directory** `src/content/packs/heian-japan/`.

2. **Author `pack.json5`** following the `EraPackSchema` shape:

   ```json5
   {
     id: 'heian-japan@0.1.0',
     schema_version: '0.1',
     engine_compat: '>=0.1 <1.0',
     lens_set: 'six-paramita-mahayana',
     locale_default: 'en',
     locale_available: ['en'],
     social: {
       name: 'Heian Japan (794–1185 CE)',
       strata: ['court-noble', 'warrior', 'monastic', 'merchant', 'peasant'],
       default_role_at_birth: 'peasant',
       mobility_rules_sid: 's:social.mobility.heian',
     },
     starting_roles: [
       {
         id: 'court-noble',
         label_sid: 's:role.heian.court-noble.label',
         description_sid: 's:role.heian.court-noble.description',
         starting_resources: { trust: 50, time: 60, provisions: 30 },
       },
       // ... 2 more roles
     ],
     content_warnings: ['death-of-self', 'war-political-violence', 'social-oppression'],
     lineage_notes_sid: 's:lineage.heian.notes',
     glossary: {/* ... */},
     permitted_imagery: [
       'tatami-room',
       'ink-painting-scroll',
       'bamboo-forest',
       'moonlit-pavilion',
       'tea-ceremony-bowl',
     ],
     rule_variation: {
       id: 'court-obligation',
       description_sid: 's:rule.heian.court-obligation',
       enforces: 'social-obligation',
     },
     source_bibliography: [
       {
         citation: 'Morris, Ivan. The World of the Shining Prince.',
         url: 'https://example.com/morris-shining-prince',
       },
       // ... 4 more entries
     ],
   }
   ```

3. **Author `events.json5`** with 6-8 events (see "Adding a new event" above).

4. **Author `endings.json5`** with 4 endings (old-age, illness, violence, starvation — or era-appropriate analogues).

5. **Author `meta.json5`** (lineage notes, glossary, source bibliography).

6. **Add all string entries** to `src/i18n/en.json` under `heian.*` namespace.

7. **Add a pack load test** at `src/content/packs/heian-japan/__tests__/pack.test.ts`:

   ```ts
   import { describe, it, expect } from 'vitest';
   import { loadEraPack } from '@/content/loader';

   describe('heian-japan pack', () => {
     it('loads cleanly and lints clean', async () => {
       const pack = await loadEraPack('heian-japan');
       expect(pack.id).toBe('heian-japan@0.1.0');
       expect(pack.events.length).toBeGreaterThanOrEqual(6);
     });
   });
   ```

8. **Run all gates** to confirm.

---

## Adding a new lens (don't — they're fixed at six)

The six pāramitā-derived lenses are deliberately fixed. Adding a seventh
would require:

- A new entry in the `Lens` enum (`src/engine/types.ts`)
- New string IDs in `src/i18n/en.json` under `lens.*`
- New UI cards in `app/life/[lifeId].tsx`
- A tradition-study justification (no seventh practice has cross-school consensus)

If you believe a seventh lens is genuinely needed, open a discussion in the
advisory process first (`advisory/panel.md`). It is **not** a code change.

---

## Adding a new content-warning category (don't — they're fixed at nine)

Same as lenses — the 9 categories are deliberately fixed to canonical
experiences of suffering that have cross-school consensus:

1. death-of-self
2. death-of-family
3. illness-chronic-suffering
4. war-political-violence
5. betrayal
6. poverty-starvation
7. social-oppression
8. forced-moral-compromise
9. separation-from-loved-ones

Adding a tenth requires advisory review and tradition-study justification.
It is **not** a code change.

---

## Running tests

```bash
pnpm test                   # run all 210 tests once
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
- `src/ui/__tests__/*.test.ts` (component tests via test-renderer shim)
- `src/persistence/__tests__/*.test.ts` (save/load round-trip)
- `src/a11y/audit.test.ts` (axe-core scan)

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
   it('rejects sacred-name mention', () => {
     const pack = makePackWith('lineage_notes_sid', 's:lineage.includes.Amitabha');
     const report = lintPack(pack);
     expect(report.passed).toBe(false);
     expect(report.violations[0].rule).toBe('R-NO-SACRED-NAMES');
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
docs(advisory): gate review-record templates
ci: github actions workflows for test, eas build, and maestro e2e
fix(ui): resolve document-title and region accessibility violations
chore: commit durable advisory document + invariant test artifact
```

- One atomic commit per todo (implementation + test in one commit)
- Husky pre-commit hook runs `lint-staged` (prettier + eslint + tsc) on staged files
- Pre-commit hook fails on any tsc error, including in unrelated working-tree files
- If pre-commit hook fails, the `git stash` / `git apply --index` round-trip
  can collide with concurrent commits — pull main before retrying

---

## Submitting a PR

The advisory process (T32) is currently blocked on user-recruited advisors.
Once the panel is seated and the 6-gate review runs, PRs to `main` will
require:

1. **One advisory sign-off receipt per affected gate** (template at
   `advisory/review-records/gate-N-{name}.md`)
2. **CI pass** (`.github/workflows/test.yml` must be green)
3. **Code review** by an existing maintainer (branch protection will require this
   once the GitHub repo is published)

Until the advisory process is live, changes land via direct commit to `main`
by the project lead. The CI workflows will auto-run once GitHub secrets are
configured.

---

## See also

- `README.md` — quick start, blocked-task handoff
- `ARCHITECTURE.md` — system architecture, data flow, invariants
- `advisory/panel.md` — representation framework
- `docs/roadmap.md` — three future prototypes
- `.omo/plans/buddhist-inspired-incremental-rpg.md` — the full implementation plan
