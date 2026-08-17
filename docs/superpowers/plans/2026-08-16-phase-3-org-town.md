# Phase 3 — Org + Town, Full UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the working chain to org and town tiers (ladder-generalized engine, content kind-sets, graduations), and deliver the UI overhaul the design promises: tier-generalized shell, next-action rail, ceremonies, and a hook extraction that makes StudioView maintainable before two more tiers mount on it.

**Architecture:** `stepSession`'s hardcoded household branch becomes a ladder loop — every unlocked tier's bench folds its new events to the NEXT tier's bench (receiving tier's `fold_cadence`), auto-queues, and cooks under its own modifiers; golden invariant: org+town locked ≡ today's behavior exactly. World drafts gain per-scale assembly + recording. `graduateToHousehold` generalizes to content-driven `graduateToTier`. The milestone ladder's operand policy resolves to `archived.*` (the P2-recorded entry condition). UI: session/progression logic moves into hooks; tier enumeration, banners, roster, rail, and gate badges iterate content instead of hardcoding two tiers.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`), Zod v3, JSON5, Vitest, React Native Web.

**Design doc:** §1 (ladder), §3.1–3.2 (kinds/world drafts at scale), §6 (UI overhaul), §12 Phase 3, §14 deviations log.

## Global Constraints

- Engine purity; no `as any` (branded casts sanctioned); no `@ts-ignore`/empty catch; no new runtime cycles; engine files ≤ ~250 lines (operations.ts split lands this phase); residue stays ids/numbers.
- No metaphysical currency; modifier vocabulary stays the five whitelisted keys; all new strings SIDs (house style); tests key on testIDs/resolveSid.
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Commit voice imperative; commit only task-named files; NEVER `git add -A`.

## Verified Signatures (load-bearing)

```ts
// Engine (Phase 2 head state)
stepSession(session, ctx: SessionStepContext, ticks, rng): { session, summary }
//   ctx = { practices, embodiedSchedule, memberScheduleFor, memberPracticesFor,
//           endings, sessionSeed, visitors?, tiers: {id,scale,fold_cadence}[], modifiersFor? }
//   household branch hardcoded: HOUSEHOLD_BENCH gate, fold via tierConfig.fold_cadence,
//   auto-queue effectiveMin, cook + absorb alreadyCharged gate.
graduateToHousehold(session, roles: {roles,names}, rng): StudioSession  // hardcodes 3 members, household tier
assembleWorldDraft(archive): WorldDraft | null                          // person rules only
computeArchiveStats(session, worldDrafts?)  // archived.<kind> counts exist since P2
checkMilestones(session, worldDrafts, milestones)  // gates incl. world_drafts.<scale>
canEndow/endowManifest/computeBenchModifiers/effectiveAwayCap/stepVisitors/noteVisitorHarvest/grantCompendium
swapEmbodiment(session, memberId|null)  // roster-fold
// UI
StudioView (~1240 lines): buildSession/sessionFromSlices/stepCtx/adoptSteppedSession/
//   modifiersForSession/seatedVisitors [EMBODIED_TIER, HOUSEHOLD_TIER] hardcode/
//   HOUSEHOLD_GATE hardcode/harvest priority household-then-person/withRecordedDraft
StudioRoster: members/onEmbody/onFocus props, household-unlocked mount gate
// Content: tiers.json5 rows carry {id, scale, index, roster_size, member_unit,
//   role_table_ref, unlock_milestone, fold_cadence, endowment_slots, visitor_table_ref};
//   kinds.json5 (11 rows), catalogs.json5, roles.json5 {household:{roles,names}},
//   milestones.json5 (5 rows, org→region still pinned.* operands), visitors.json5 (3)
```

## Binding Decisions (locked — record in §14.8)

1. **Operand policy: `archived.*`.** Amend milestones org→region to `archived.tradition|charter|festival|landmark|institution|monument` (world_drafts operands unchanged). Rationale: new kinds ship `pinnable: false` and pins/focus stay person/place (design §3.1); `archived.*` is provably reachable at every scale. Log as the P2 entry-condition resolution.
2. **Ladder semantics.** Fold: for each tier T (index order) whose NEXT tier N exists and is unlocked, T's per-call delta events fold to N's bench at N's `fold_cadence`, ordinal persisted on N's `fold_position` (household's existing rule generalized). Members: autonomous rosters run on ANY unlocked tier (org seeds lives; town seeds NO lives — its roster rows are units, `embodied: false`, policy of the source tier, never run autonomously; `member_unit` from content drives this: 'life'|'person'|'household'… rows whose unit is a bench aggregate skip the member loop). Auto-queue/cook: every unlocked non-person bench, its own `modifiersFor(tierId)`.
3. **World drafts per scale.** `assembleWorldDraftAtScale(archive, scale)`: person keeps today's rules over person-scale cards; household/org/town assemble when ≥2 cards of that scale exist (name from the first card; line from the second). Recording: `withRecordedDraft` generalizes to record each scale at most once per archive (dedup by scale presence in `world_drafts`).
4. **Graduation generalization.** `graduateToTier(session, tierId, registries, rng)`: reads the tier row + roles table; org seeds `roster_size.min` members as autonomous lives (org policy, seeds via memberSeed); town seeds unit rows (one per unlocked lower tier, no lives/members slices); fresh bench + `milestones_done` append; idempotent. `graduateToHousehold` becomes a thin wrapper or is replaced (update call sites + tests).
5. **Hook extraction.** `useStudioSession` (load/catch-up/step/save/benchRef) + `useStudioProgression` (milestone/compendium/graduation effects) extracted from StudioView; StudioView keeps render + handlers. Tier enumeration (banners, roster, rail, harvest priority = highest-index ready bench, gate badges derived from milestone predicates via existing `statValue`) iterates `registries().tiers`. Target: StudioView ≤ ~900 lines after.
6. **operations.ts split:** cook math stays; play-import cursor + import helpers move to `src/engine/play-cursor.ts` (pure move, no behavior change).

## File Structure

| File                                                          | Action        | Responsibility                                                                                                                                  |
| ------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/session-step.ts`                                  | Modify        | Ladder loop (fold/auto-queue/cook per tier); golden unchanged                                                                                   |
| `src/engine/world-scale.ts`                                   | Create        | `assembleWorldDraftAtScale` + per-scale recording helper                                                                                        |
| `src/engine/graduation.ts`                                    | Modify        | `graduateToTier` generalization                                                                                                                 |
| `src/engine/operations.ts` + `play-cursor.ts`                 | Modify/Create | Split                                                                                                                                           |
| `src/content/progression/base/*.json5`                        | Modify        | Milestone operand amendments; org/town kinds (charter/ware/festival/landmark + fallback rows) + catalogs; org policy + schedule; org/town roles |
| `src/ui/hooks/useStudioSession.ts`, `useStudioProgression.ts` | Create        | Extracted state/effects                                                                                                                         |
| `src/ui/components/StudioView.tsx`                            | Modify        | Tier-generalized, hook-driven, next-action rail, ceremonies                                                                                     |
| `src/ui/components/StudioNextAction.tsx`                      | Create        | Computed "what to do next" strip                                                                                                                |
| `src/i18n/en.json`                                            | Modify        | org/town SIDs (kinds, tiers, ceremonies, next-action)                                                                                           |
| Tests                                                         | Create/Modify | Per task                                                                                                                                        |

---

### Task 1: Engine ladder + operand policy + world drafts at scale

**Files:** Modify `session-step.ts`, create `world-scale.ts`, modify `base/milestones.json5`; tests.
**Steps:** TDD — (a) GOLDEN: org+town locked → stepSession ≡ current head behavior (snapshot test vs recorded output or field-by-field vs the household-only path); (b) org unlocked → household delta folds to org bench at org's fold_cadence, org auto-queues/cooks under its modifiers; (c) town unlocked → org delta folds to town; (d) unit-roster rows (town) never enter the member loop; (e) org autonomous members run + fold to org bench; (f) milestone operands amended + loader pin; (g) `assembleWorldDraftAtScale` person-parity + household ≥2 rule; (h) per-scale recording dedup → implement → engine+progression suites + typecheck → commit `feat(engine): step the tier ladder and gate it on archived cards`.

### Task 2: graduateToTier + operations split

**Files:** Modify `graduation.ts`, `index.ts`; create `play-cursor.ts`; modify `operations.ts`; tests.
**Steps:** TDD — org graduation seeds min-roster autonomous lives (org policy, deterministic seeds, milestones_done append, fresh bench, idempotent); town graduation seeds unit rows only (no member slices); `graduateToHousehold` wrapper parity (existing tests stay green); play-cursor split is behavior-neutral (existing operations tests unchanged) → commit `feat(engine): graduate content-driven tiers and split the play cursor`.

### Task 3: Org + town content

**Files:** Modify `kinds.json5`, `catalogs.json5`, `policies.json5`, tang `schedules.json5`, `roles.json5`; tests.
**Steps:** charter/ware (org) + festival/landmark (town) rows with household-style TOTAL fallbacks; 4 catalog entries each (workshop-voiced: a guild seal, a measured glaze; market-voiced: lantern night, the west bridge); `policy:org-base` + `schedule:workshop-day` (24h gap-free); org roles/names (abbot, kilnmaster, clerk / Master Yun, Old Shi, Young Bao) + town roles/names (headman, market-warden, ferry-keeper / relations by household name) → loader/lint/meter suites → commit `feat(content): ship org and town tiers as data`.

### Task 4: Hook extraction + tier-generalized UI

**Files:** Create `useStudioSession.ts`, `useStudioProgression.ts`; modify `StudioView.tsx`, `StudioRoster.tsx`; tests.
**Steps:** Extract with behavior parity (all existing UI tests stay green untouched — the parity gate); tier enumeration from `registries().tiers` (banners, rail, roster mount per unlocked tier, harvest priority = highest-index ready bench); gate badges derived from each tier's milestone predicate (delete HOUSEHOLD_GATE); stepCtx/visitor ctx generalized (no household hardcodes) → UI suite + typecheck → commit `feat(ui): drive the studio shell from the tier registry`.

### Task 5: Next-action rail + ceremonies + theme pass

**Files:** Create `StudioNextAction.tsx`; modify `StudioView.tsx`, `en.json`; tests.
**Steps:** Next-action derivation (ready harvest any bench; pending window ≥ effective min; locked-tier gate ≥ 80%; active visitor with windows; empty endowment slot) as a pure function of session+registries (unit-test the derivation, render the strip testID `studio-next-action`); graduation ceremony overlay generalized (org/town SIDs + title/line/dismiss); studio-theme token audit (colors/spacing via `t.*` only — sweep inline literals in touched components) → commit `feat(ui): point the player at the next action and stage graduations`.

### Task 6: Barrel + deviations + full gate

**Steps:** Export `assembleWorldDraftAtScale`, `graduateToTier`, `withRecordedDraftAtScale` (or the recording helper's public name), next-action derivation (if engine-side), `play-cursor` surface; §14.8 deviations (Binding Decisions 1–6 + execution deviations); full gate → commit `feat(engine): export the tier-ladder runtime from the barrel`.

---

## Self-Review Notes

- Spec coverage: design §12 Phase 3 = org+town (T1–T3), shell/next-action/ceremonies (T4–T5); P2 handoff items: operand policy (T1), tier generalization + hook extraction (T4), operations split (T2), visitor partition semantics — carried as a documented §14.8 note (not fixed; banner/rail generalize in T4).
- Golden risk: the ladder rewrite is the highest-risk change; T1's golden (org+town locked ≡ head behavior) plus the untouched Phase-1 golden (household-locked ≡ stepStudio) pin both edges.
- `world_drafts.<scale>` recording previously person-only (P1 minor) — resolved by Binding Decision 3.
- Known open riding forward: visitor `table_ref` swap unwired; StudioView size after extraction is a target, not a hard gate; charge bar MIN-3 cosmetic.
