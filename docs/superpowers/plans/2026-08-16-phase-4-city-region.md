# Phase 4 — City + Region, Polish, SPEC Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the six-tier ladder with city and region (content is now data-only — the engine ladder, graduation, world-drafts-at-scale, and kind totality all generalize), close out the accumulated Phase 3 minors, wire the two deferred visitor mechanics (`table_ref` harvest swap, `effectiveAwayCap` overlay), and ratify the ladder in SPEC.md.

**Architecture:** No new engine subsystem. City/region are rows in the existing registries (tiers.json5 already carries index 4/5). The engine work is hardening + two visitor gaps; the content work is authoring; the final task is the constitutional amendment.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`), Zod v3, JSON5, Vitest, React Native Web.

**Design doc:** §12 Phase 4, §14 (deviations), §9 (recipes → CONTRIBUTING.md). SPEC.md §1/§14 are the amendment targets.

## Global Constraints

- Engine purity; no `as any`; no `@ts-ignore`/empty catch; no new runtime import cycles; engine files ≤ ~250 lines.
- No metaphysical currency; modifier whitelist unchanged; all strings SIDs; tests key on testIDs/resolveSid.
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Commit imperative; commit only task-named files; NEVER `git add -A`.

## Verified State (Phase 3 head `af7c09f`)

- `tiers.json5` carries city (index 4, member_unit household) + region (index 5, member_unit town).
- Milestones already on `archived.*`: unlock-city (`archived.festival`+`archived.landmark`+`world_drafts.town≥2`), unlock-region (`archived.institution`+`archived.monument`+`world_drafts.city≥2`).
- Ladder (`session-ladder.ts`), graduation (`graduateToTier`), world-drafts-at-scale (`world-scale.ts`), and kind totality all generalize to N tiers — city/region need no engine change to function, only content.
- 13 accumulated minors + 4 cross-phase items are triaged to this phase (see Task 1/2 scope below).

## Binding Decisions (locked — record in §14.9)

1. **City/region kinds + fallbacks** mirror the org/town pattern exactly (TOTAL per scale): city = `institution {social}` + `monument {dominant practice_level}` + three fallbacks; region = `legend {social}` + `road {dominant practice_level}` + three fallbacks. All `pinnable: false`, `catalog_ref 'core/<id>'`, `sid_ns 'studio.kind_<id>_sid'`.
2. **Visitor `table_ref` harvest swap**: a visitor row with `table_ref` (instead of `effects`) swaps the affected bench's harvest catalog to that table for the visitor's remaining windows. `table_ref` resolves to a catalog namespace in `catalogs.json5` (a new top-level `visitor_tables` key, keyed by namespace id). Harvest consults the active visitor's table before the tier's kind catalog; `noteVisitorHarvest` still decays windows. Deterministic; no rng.
3. **`effectiveAwayCap` visitor overlay**: the away cap now adds the seated visitor's `offline_cap` (if any) per tier, same pattern as `modifiersForSession`. No shipped visitor grants `offline_cap` yet — this closes the future-hole, not a live gap.
4. **Shared-helper hoist**: `EMBODIED_TIER`, the `statValue` walker, and `personEffectiveMin` (floor-at-2 rule) move to a single shared module (`src/engine/ladder-const.ts` for the constant; the walker + floor to `src/ui/hooks/session-selectors.ts` or engine-side where pure) — eliminating the three duplicated copies across next-action.ts / StudioView / session-ladder.
5. **SPEC amendment**: SPEC.md §1 gains the ladder table (six tiers, composition rule, fold-up), §14's build-order list is superseded by "the chain ships through Phase 4; §1 is the canonical ladder", §3/§4/§6 stay. §14.8's stale line counts are corrected. Design doc §9 "Adding X" recipes move verbatim into CONTRIBUTING.md (with §9 reduced to a pointer).

## File Structure

| File                                      | Action        | Responsibility                                                                             |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `src/engine/ladder-const.ts`              | Create        | `EMBODIED_TIER` + any shared ladder constant                                               |
| `src/ui/hooks/session-selectors.ts`       | Create        | `statValue` walker + `personEffectiveMin` floor                                            |
| `src/engine/graduation.ts`                | Modify        | `unitRoster` `tierRow.index` lower-tier filter                                             |
| `src/engine/session-ladder.ts`            | Modify        | `benchFoldId` collapse; type-only cycle doc/hoist                                          |
| `src/engine/visitors.ts`                  | Modify        | `effectiveAwayCap` overlay support (or `endowment.ts` if the fn lives there)               |
| `src/engine/operations.ts` / harvest path | Modify        | Visitor `table_ref` catalog swap at harvest                                                |
| `src/content/progression/base/*.json5`    | Modify        | city/region kinds + catalogs + roles + schedules + policies + visitors; `visitor_tables`   |
| `src/i18n/en.json`                        | Modify        | city/region SIDs                                                                           |
| `src/ui/components/StudioView.tsx`        | Modify        | charge-bar `personEffectiveMin`; rail comment; tierScaleOf comment; import hoisted helpers |
| `SPEC.md`                                 | Modify        | Ratify ladder; supersede §14 ordering                                                      |
| `CONTRIBUTING.md`, design doc §9/§14.9    | Modify        | Move recipes; correct §14.8; add §14.9                                                     |
| Tests                                     | Create/Modify | Per task                                                                                   |

---

### Task 1: Hardening + helper consolidation + minors

**Files:** Modify `session-ladder.ts`, `graduation.ts`, `next-action.ts`, `useStudioSession.ts`, `StudioView.tsx`, `roles.json5`, `kinds.json5` (Ware copy); create `ladder-const.ts`, `session-selectors.ts`; tests.
**Steps:** TDD — (a) `unitRoster` excludes a tier whose `index >= current` (out-of-order unlock can't seat a higher tier as a lower unit); (b) `benchFoldId` collapses to the template (person still yields `bench:person` — parity test); (c) the three duplicated copies (`EMBODIED_TIER`, `statValue`, `personEffectiveMin`) resolve to single definitions (import-path tests or a lint-level uniqueness grep); (d) charge bar uses `personEffectiveMin`; (e) roles.json5 trailing newline; (f) "Ware" → a concrete noun (decision: `studio.kind_ware_sid` "Ware" stays the label but the catalog subject/one_liners already read concrete — pick "The guild's wares" for the kind SID, verify no test pins the old string); (g) rail comment + tierScaleOf comment. Commit `chore(engine): consolidate ladder helpers and close the phase-3 minors`.

### Task 2: Visitor table_ref harvest swap + effectiveAwayCap overlay

**Files:** Modify `visitors.ts` (or `endowment.ts` for the cap), the harvest path (`session-step.ts`/`StudioView.tsx` harvest handlers), `schema.ts` if `visitor_tables` needs a Zod shape; tests.
**Steps:** TDD — (a) a visitor with `table_ref` makes harvest fill from that table while seated (and only then); (b) `noteVisitorHarvest` decay still applies; (c) `effectiveAwayCap` adds a seated `offline_cap` visitor's delta; (d) no visitor / no `offline_cap` → unchanged. Commit `feat(engine): swap harvest tables for visitors and count their cap`.

### Task 3: City + region content

**Files:** Modify `kinds.json5`, `catalogs.json5`, `policies.json5`, `roles.json5`, tang `schedules.json5`, `visitors.json5`, `en.json`; tests.
**Steps:** institution/monument (city) + legend/road (region) rows with TOTAL fallbacks; 4 catalog entries each (city-voiced: the relief bureau, the bell tower; region-voiced: the gate-yakṣa tale, the pilgrimage circuit); city/region policies + gap-free schedules + roles; two visitors (one city, one region — use `effects` not `table_ref` for now so Task 2's swap isn't a live content dependency); SIDs for tier labels + kind labels + ceremony copy. Loader pins updated (counts/ids/order). Commit `feat(content): ship city and region tiers as data`.

### Task 4: Full-ladder E2E + UI six-tier surface

**Files:** Modify `StudioView.tsx` (if any 6-tier assumption remains), tests.
**Steps:** TDD — (a) engine E2E: graduate person→household→org→town→city→region in one session (fresh benches, folds chain, each unlock via its archived.* milestone) and step multi-tick deterministically; (b) UI: six rail rows render (locked ones masked per disclosure), a city bench harvests at city scale (institution/monument in export JSON), the next-action rail still fires correctly at the top tier; (c) parity: existing tests untouched. Commit `feat(ui): prove the six-tier ladder end to end`.

### Task 5: SPEC amendment + CONTRIBUTING recipes

**Files:** Modify `SPEC.md`, `CONTRIBUTING.md`, design doc; tests (none — doc only, but re-run the gate).
**Steps:** SPEC §1 ladder table + composition + fold-up; §14 superseded (point to §1 + this phase's completion); §14.8 line-count corrections; design doc §9 recipes moved verbatim into CONTRIBUTING.md under "Extending the game", §9 reduced to a pointer; §14.9 records Phase 4 deviations (Binding Decisions 1–5). Commit `docs: ratify the six-tier ladder in the spec and move extension recipes`.

### Task 6: Barrel + full gate

**Steps:** Export any newly-public Phase 4 surfaces (`EMBODIED_TIER` if engine-side, visitor-table resolver); full gate green; commit `feat(engine): export the phase-4 runtime from the barrel`.

---

## Self-Review Notes

- Spec coverage: design §12 Phase 4 = city+region (T3/T4), polish + visitor gaps (T1/T2), SPEC amendment (T5). Oracle Phase-4 checklist items map 1:1 (table_ref→T2, effectiveAwayCap→T2, vocab-sweep-promotion→deferred to a lint follow-up if it matters post-amendment, unitRoster→T1, hoist→T1, SPEC→T5).
- Golden risk: T1 touches session-ladder (benchFoldId) and T2 touches harvest — the Phase-1/2/3 goldens (household-locked ≡ stepStudio; ladder lower edge) must stay green; T4's full-chain E2E is the new upper edge.
- `vocab-sweep` lint promotion is intentionally dropped: the sweep is test-side today and the milestone policy is frozen by the SPEC amendment (T5); promoting it to lint is a nice-to-have that would reject nothing currently shipped.
- Known-open riding past Phase 4 (record in §14.9): visitor partition coarseness, StudioView render-mass (~1041 lines), `nonPersonBenches` export surface.
