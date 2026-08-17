# Phase 2 — Idle Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer idle depth onto the working household loop: endowment (cards become permanent bench upgrades), visitors (deterministic boost guests), a compendium (one-time achievement rewards), raisable offline caps — and close the roster-reachability gap so a player can actually fire the household graduation (pin + member focus assignments + draft).

**Architecture:** All four systems read the content registries Phase 0 shipped empty (`endowment.json5`, `visitors.json5`, `compendium.json5`) through the existing loader + lint. Modifiers use one shared vocabulary expressed as `add_resource` EffectOps on whitelisted keys (`cook_speed`, `window_min`, `surplus_rate`, `offline_cap`, `endowment_slots`). One engine module owns modifier math (`endowment.ts`); `stepSession` and the two queue sites consume it. Visitors are deterministic per-tier counters on `TierState`. Compendium grants derive rewards from `compendium_done` — numbers are never stored, only ids.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`), Zod v3, JSON5, Vitest, React Native Web (banner/panels only).

**Design doc:** `docs/superpowers/specs/2026-08-16-tiered-progression-design.md` §5 (Idle Mechanics), §12 Phase 2, §14 deviations.

## Global Constraints

- Engine purity: `src/engine/` — no react/expo/Date/Math.random/fetch/process.env/console; zod only. Time as `nowUnix`, entropy as seeded `Rng`.
- No `as any` (branded-id casts sanctioned), no `@ts-ignore`/`@ts-expect-error`, no empty `catch`.
- No new runtime import cycles (type-only back-edges commented). `src/engine` never imports `src/content/**`.
- Engine files ≤ ~250 lines. Residue stays ids/numbers.
- **No metaphysical currency (binding on the modifier vocabulary):** the ONLY legal effect keys are `cook_speed`, `window_min`, `surplus_rate`, `offline_cap`, `endowment_slots`. Anything else in endowment/visitor/compendium rows fails lint (extend `R-PROG-NO-METER` or add `R-PROG-MODIFIER-KEYS`).
- No pay-to-absolve, identity fence unchanged. All new strings SIDs (house style: flat under `studio`, new top-level `visitor` namespace per the `graduation` precedent).
- Gate: `pnpm typecheck` (NOT bare `pnpm tsc`), `pnpm lint`, `pnpm test`.
- Commit voice imperative/specific; commit only task-named files; NEVER `git add -A` (large uncommitted baseline persists).

## Verified Signatures (load-bearing — do not rename)

```ts
// Phase 0/1 surfaces this plan builds on:
TierState = { schema_version:'tier_state/v0', tier, unlocked, roster, endowed: string[],
  active_visitor: { id: string; windows_left: number } | null }   // src/engine/tier-state.ts
EndowmentTrackSchema = { schema_version:'endowment/v0', id, tier, requires: string|null,
  slot_cost: int>=1, effects: EffectOp[] }                        // progression/schema.ts
VisitorSchema = { schema_version:'visitor/v0', id, tiers: Scale[], cadence_ticks>=1,
  jitter_ticks>=0, duration_windows>=1, effects XOR table_ref, sid_ns }
CompendiumEntrySchema = { schema_version:'compendium/v0', id, predicate: ArchivePredicate,
  reward: { effects XOR unlock }, sid_ns }
StudioSession = { ..., benches: Record<string,BenchState>, tiers: Record<string,TierState>,
  milestones_done: string[], compendium_done: string[], members, world_drafts, archive }
queueDevelop(studio, brief, rng)  // operations.ts; cookTicksFor(window.length) internal
tickStudio / absorbSurplus / pendingResidue / MIN_RESIDUE_TO_DEVELOP=3  // operations.ts
studioTicksAway(lastVisitedAtUnix, nowUnix)  // hardcodes STUDIO_AWAY_TICK_CAP=240 today
stepSession(session, ctx: SessionStepContext, ticks, rng): { session, summary }  // session-step.ts
//   ctx = { practices, embodiedSchedule, memberScheduleFor, memberPracticesFor,
//           endings, tiers: {id,scale,fold_cadence}[], sessionSeed }
computeArchiveStats(session, worldDrafts?) / evaluateArchivePredicate / checkMilestones
swapEmbodiment(session, memberId|null)  // roster-fold.ts (exported, UI-unreachable today)
pinnableCards(archive) / focusFromManifest  // focus.ts (person/place kinds only)
memberSeed(sessionSeed, memberId): bigint  // roster.ts — sanctioned derived-stream ids
loadProgression(): ProgressionRegistries  // { tiers, kindRows, kindRules, milestones,
//   policies, endowment, visitors, compendium, catalogs, roles } — all validated+linted
EffectOpSchema includes add_resource { key, delta }  // content/schema.ts
StudioView: buildSession()/stepCtxRef/adoptSteppedSession; harvest prefers household;
//   rail display-only; testIDs studio-*; tests via @/test/rntl + resolveSid
```

## Binding Decisions (locked — record in design §14 after landing)

1. **Modifier vocabulary** (`add_resource` keys, deltas are integers): `cook_speed` (cook-ticks discount per queue), `window_min` (lowers the tier's minimum residue window, floor 2), `surplus_rate` (extra surplus ticks per absorbed tick), `offline_cap` (added away-tick cap), `endowment_slots` (+1 bench slot, compendium rewards only). Whitelisted by lint.
2. **Endowing is permanent** (design §5.1): no un-endow. `endowManifest(session, tierId, trackId, cardId, tracks)` removes the card from the archive, clears it as that bench's `pinned` and from any roster `focus_id` (key omitted), appends the track id to `tiers[tierId].endowed`. Validations: tier unlocked, track.tier matches, `requires` milestone done (or null), card exists, slot capacity (`Σ slot_cost of endowed + track.slot_cost ≤ tier.endowment_slots + compendium slot bonus`), not already endowed.
3. **Compendium rewards are global** (apply to every tier's modifier sum); endowment/visitor modifiers are per-tier. Auto-grant on crossing (idle-appropriate); the panel lists done/undone.
4. **Offline cap** uses the PERSON tier's modifiers (the embodied bench drives catch-up ticks; household accrues with the same ticks). `effectiveAwayCap(session, …) = 240 + personTier.offlineCap + globalCompendium.offlineCap`.
5. **Visitors:** per-tier counter `visitor_ticks` (additive `tier_state/v0` field, `.default(0)` — same pattern as `fold_position`). Arrival when `visitor_ticks ≥ cadence + jitter` where `jitter = Number(memberSeed(ctx.sessionSeed, 'visitor:' + tierId + ':' + visitorId) % BigInt(jitter_ticks + 1))`; then counter resets and `active_visitor = { id, windows_left: duration_windows }`. One active visitor per tier (arrivals skip while one is active). Effects apply while `windows_left > 0`. Decay: `noteVisitorHarvest(session, tierId)` decrements after each successful harvest from that tier's bench (UI calls it). Visitor effects use the same modifier vocabulary.
6. **Endow UI tier selection** mirrors harvest priority: household tier if unlocked, else person.

## File Structure

| File                                                                 | Action        | Responsibility                                                                             |
| -------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `src/engine/endowment.ts`                                            | Create        | `BenchModifiers`, `computeBenchModifiers`, `endowManifest`, `canEndow`, `effectiveAwayCap` |
| `src/engine/visitors.ts`                                             | Create        | `stepVisitors` (pure arrival/decay slice), `noteVisitorHarvest`, jitter math               |
| `src/engine/compendium.ts`                                           | Create        | `grantCompendium` (auto-grant pass), `computeGlobalRewards`                                |
| `src/engine/tier-state.ts`                                           | Modify        | `visitor_ticks: z.number().int().min(0).default(0)` (additive)                             |
| `src/engine/operations.ts`                                           | Modify        | `queueDevelop` optional trailing `opts?: { cookTicksDiscount?: number }`                   |
| `src/engine/studio-offline.ts`                                       | Modify        | `studioTicksAway(last, now, cap = STUDIO_AWAY_TICK_CAP)`                                   |
| `src/engine/session-step.ts`                                         | Modify        | Modifier threading (surplus_rate, window_min at auto-queue, visitor step)                  |
| `src/content/progression/base/{endowment,visitors,compendium}.json5` | Modify        | Shipped rows (below)                                                                       |
| `src/content/progression/lint.ts`                                    | Modify        | `R-PROG-MODIFIER-KEYS` whitelist                                                           |
| `src/i18n/en.json`                                                   | Modify        | studio.* + visitor.* SIDs (below)                                                          |
| `src/ui/components/StudioRoster.tsx`                                 | Create        | Roster panel: focus assignment + embody toggle                                             |
| `src/ui/components/StudioView.tsx`                                   | Modify        | Visitor banner, compendium panel, endow affordance, roster mount, cap + modifier wiring    |
| Tests                                                                | Create/Modify | Per task                                                                                   |

---

### Task 1: Endowment engine + content + lint

**Files:** Create `src/engine/endowment.ts`; Modify `tier-state.ts` (visitor_ticks — land it here so Task 3 needs no schema edit), `base/endowment.json5`, `progression/lint.ts`; Test `src/engine/__tests__/endowment.test.ts`, extend progression lint test.

**Interfaces (Produces):**

- `interface BenchModifiers { readonly cookSpeed: number; readonly windowMin: number; readonly surplusRate: number; readonly offlineCap: number; readonly endowmentSlots: number }` (+ `EMPTY_BENCH_MODIFIERS`)
- `computeBenchModifiers(tierId: string, session: StudioSession, tracks: readonly EndowmentTrack[], global: BenchModifiers = EMPTY): BenchModifiers` — sums endowed tracks' `add_resource` deltas for the tier + global
- `endowableSlots(tierId, session, tiers: readonly Tier[], global): number`
- `canEndow(session, tierId, track, cardId, tracks, tiers, global): { ok: boolean; reason: string | null }`
- `endowManifest(session, tierId, trackId, cardId, tracks): StudioSession` (throws on invalid; cascades pin/focus clears; pure)
- `effectiveAwayCap(session, tracks, global): number`

**Content (verbatim rows):** `{ endowment: [
  { schema_version:'endowment/v0', id:'endow/person/swift-cook', tier:'person', requires:null, slot_cost:1, effects:[{op:'add_resource', key:'cook_speed', delta:1}] },
  { schema_version:'endowment/v0', id:'endow/person/deep-window', tier:'person', requires:null, slot_cost:1, effects:[{op:'add_resource', key:'window_min', delta:1}] },
  { schema_version:'endowment/v0', id:'endow/household/hearth-surplus', tier:'household', requires:'unlock-household', slot_cost:1, effects:[{op:'add_resource', key:'surplus_rate', delta:1}] },
  { schema_version:'endowment/v0', id:'endow/household/long-absence', tier:'household', requires:'unlock-household', slot_cost:2, effects:[{op:'add_resource', key:'offline_cap', delta:120}] } ] }`

**Lint:** `R-PROG-MODIFIER-KEYS` — every `add_resource` key in endowment/visitors/compendium rows ∈ the five-key whitelist; error otherwise.

- [ ] TDD: failing tests (modifier sums; slot capacity incl. slot_cost 2; requires-gate; card removal + pinned/focus cascade; double-endow rejected; effectiveAwayCap math; lint rejects `karma_points` key; tier_state round-trips with defaulted visitor_ticks) → implement → `pnpm exec vitest run src/engine/__tests__/ src/content/progression/__tests__/` + `pnpm typecheck` → commit `feat(engine): endow cards into permanent bench modifiers`.

### Task 2: Apply modifiers at the queue/tick/cap sites

**Files:** Modify `operations.ts`, `studio-offline.ts`, `session-step.ts`, `StudioView.tsx`; Tests both suites.

**Binding semantics:** `queueDevelop(studio, brief, rng, opts?)` — `cook_ticks_total = max(2, cookTicksFor(len) - (opts?.cookTicksDiscount ?? 0))`. `stepSession` ctx GAINS `modifiersFor?: (tierId: string) => BenchModifiers` (default EMPTY — golden test unaffected): auto-queue passes the tier's `cookSpeed`, applies `windowMin` (floor 2) to the queue gate, and `absorbSurplus` calls gain `surplusRate` extra ticks; `studioTicksAway` cap param consumed by StudioView's catch-up with `effectiveAwayCap`. UI develop path passes the person/household discount per harvest-priority tier.

- [ ] TDD: cook discount math (floor 2), window_min gate, surplus_rate amplification, cap param default-compat (old tests unchanged), UI: endowed swift-cook shortens the visible bay cook total → commit `feat(engine): apply endowment modifiers across cook, window, surplus, and cap`.

### Task 3: Visitors — deterministic arrivals, banner, content

**Files:** Create `src/engine/visitors.ts`; Modify `session-step.ts`, `base/visitors.json5`, `en.json`, `StudioView.tsx`; Tests.

**Interfaces:** `stepVisitors(session, ctx, ticks): StudioSession` (pure; iterates `ctx.tiers`, per-tier visitor rows matching tier scale; counter/jitter/one-active/decay rules per Binding Decision 5; called from `stepSession` before benches cook) + `noteVisitorHarvest(session, tierId): StudioSession` + `activeVisitorFor(session, tierId)`.

**Content (verbatim):** `{ visitors: [
  { schema_version:'visitor/v0', id:'visitor/gate-yaksa', tiers:['person'], cadence_ticks:240, jitter_ticks:60, duration_windows:2, effects:[{op:'add_resource', key:'surplus_rate', delta:1}], sid_ns:'visitor.gate_yaksa' },
  { schema_version:'visitor/v0', id:'visitor/traveling-teacher', tiers:['household'], cadence_ticks:360, jitter_ticks:120, duration_windows:2, effects:[{op:'add_resource', key:'cook_speed', delta:1}], sid_ns:'visitor.traveling_teacher' },
  { schema_version:'visitor/v0', id:'visitor/festival-day', tiers:['person','household'], cadence_ticks:720, jitter_ticks:240, duration_windows:3, effects:[{op:'add_resource', key:'surplus_rate', delta:2}], sid_ns:'visitor.festival_day' } ] }`

**SIDs:** top-level `visitor` namespace: `gate_yaksa.name_sid` "The yakṣa at the gate" / `.line_sid` "It watches the yard and the work goes faster."; `traveling_teacher.name_sid` "The traveling teacher" / `.line_sid` "She corrects one motion and the whole day shortens."; `festival_day.name_sid` "Festival day" / `.line_sid` "The household cooks as if for a hundred."; plus `studio.visitor_banner_sid` "A guest: {name}", `studio.visitor_windows_sid` "{n} windows".

**UI:** banner strip on the affected bench (testID `studio-visitor`, shows name via the row's sid_ns + `.name_sid`, windows-left countdown); `noteVisitorHarvest` wired into both harvest sites; visitor effects feed `modifiersFor` while active.

- [ ] TDD: arrival determinism (same seeds → same arrival tick), jitter bounds, one-active skip, counter reset, windows decay via noteVisitorHarvest, locked-tier no-op, banner render + resolveSid smoke, E2E-ish: active gate-yaksa raises surplus accrual in a stepped session → commit `feat(engine): host deterministic visitors on the benches`.

### Task 4: Compendium — grants, rewards, panel

**Files:** Create `src/engine/compendium.ts`; Modify `base/compendium.json5`, `en.json`, `StudioView.tsx`; Tests.

**Interfaces:** `grantCompendium(session, worldDrafts, entries): { session, granted }` (same exactly-once pattern as `checkMilestones`) + `computeGlobalRewards(done: readonly string[], entries): BenchModifiers` (sums reward `effects` deltas; `endowment_slots` counted here).

**Content (verbatim):** `{ compendium: [
  { schema_version:'compendium/v0', id:'compendium/first-harvest', predicate:{op:'gte',key:'harvests.common',value:1}, reward:{effects:[{op:'add_resource', key:'offline_cap', delta:30}]}, sid_ns:'compendium.first_harvest' },
  { schema_version:'compendium/v0', id:'compendium/first-world', predicate:{op:'gte',key:'world_drafts.total',value:1}, reward:{unlock:'title/worldwright'}, sid_ns:'compendium.first_world' },
  { schema_version:'compendium/v0', id:'compendium/three-pins', predicate:{op:'gte',key:'pinned.person',value:3}, reward:{unlock:'title/keeper-of-three'}, sid_ns:'compendium.three_pins' },
  { schema_version:'compendium/v0', id:'compendium/five-harvests', predicate:{op:'gte',key:'harvests.common',value:5}, reward:{effects:[{op:'add_resource', key:'endowment_slots', delta:1}]}, sid_ns:'compendium.five_harvests' },
  { schema_version:'compendium/v0', id:'compendium/househeld', predicate:{op:'gte',key:'pinned.tradition',value:1}, reward:{effects:[{op:'add_resource', key:'offline_cap', delta:60}]}, sid_ns:'compendium.househeld' } ] }`

**SIDs:** `compendium.<id snake>.name_sid` + `.desc_sid` per row (short, warm); `studio.compendium_heading_sid` "Compendium", `studio.compendium_done_sid` "Kept", `studio.compendium_locked_sid` "Not yet".

**UI:** auto-grant runs beside the milestone check; panel section (testID `studio-compendium`) lists rows with done/locked states; global rewards feed `computeBenchModifiers`' `global` arg and `effectiveAwayCap`.

- [ ] TDD: exactly-once grants, reward sums incl. slot bonus flowing into `endowableSlots`, predicates evaluate off real stats, panel render + smoke, grant persists via session → commit `feat(engine): grant compendium rewards from the archive`.

### Task 5: Roster panel + graduation reachability

**Files:** Create `src/ui/components/StudioRoster.tsx`; Modify `StudioView.tsx`, `en.json`; Test `src/ui/__tests__/StudioRoster.test.tsx` + extend StudioView tests.

**Binding:** Roster panel mounts when household is unlocked (below the rail-facing bench sections; testID `studio-roster`). Per member card: name/role (testID `studio-roster-member-<id>`), embody toggle (`studio-roster-embody-<id>`, calls `swapEmbodiment`, confirms one-embodied via session), focus assignment: cycle picker over `pinnableCards(archive)` (`studio-roster-focus-<id>`, sets `member.focus_id`; "clear" option omits the key). Policy shown read-only text.

**E2E test (the reachability pin):** person bench pins person card A; roster assigns focus to cards B and C; assemble a world draft; milestone check fires `unlock-household`; graduation overlay appears — entirely through UI actions, no hand-spliced session.

- [ ] TDD per above → commit `feat(ui): assign focus and embodiment from the roster panel`.

### Task 6: Barrel, deviations log, full gate

**Files:** Modify `src/engine/index.ts`, design doc §14; gate.

- [ ] Export: `computeBenchModifiers`, `endowManifest`, `canEndow`, `endowableSlots`, `effectiveAwayCap`, `EMPTY_BENCH_MODIFIERS`, `BenchModifiers`, `stepVisitors`, `noteVisitorHarvest`, `activeVisitorFor`, `grantCompendium`, `computeGlobalRewards` → design doc §14 gains a Phase 2 deviations entry (Binding Decisions 1–6 + any execution deviations) → `pnpm typecheck` 0, `pnpm lint` 0 errors, `pnpm test` ALL green → commit `feat(engine): export the idle-depth runtime from the barrel`.

---

## Self-Review Notes

- **Spec coverage:** design §5.1 endowment (T1/T2), §5.2 visitors (T3), §5.3 compendium (T4), §5.4 offline cap (T1/T2), Phase 1 handoff reachability (T5). §14.2 SID-lint stays deferred (smoke tests cover shipped SIDs; the lint itself remains a Phase 3 entry condition).
- **No currency:** everything is object-spending (endowment) or observation (compendium/milestones); deltas are bench logistics, whitelisted by lint.
- **Type consistency:** `BenchModifiers` defined T1, consumed T2–T4; `visitor_ticks` lands T1 (schema) before T3 uses it; `SessionStepContext.modifiersFor` optional with default so the Phase 1 golden test is untouched by construction.
- **Known accepted:** visitor `table_ref` harvest-table swap is schema-legal but unshipped (all three rows use effects); titles are unlock strings rendered from the compendium panel only.
