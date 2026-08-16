# Phase 1 — Household End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the six-tier model end-to-end at household scale: unlock the household tier via an archive milestone with a graduation, run a roster of autonomous member lives that feed a household bench, fold person-bench residue upward, harvest household-scale Manifests (`tradition`, `heirloom`), toggle embodiment per member, and show a minimal two-row tier rail.

**Architecture:** Catalogs leave the engine for content data (Phase 0 deviation §14.2 entry condition). An archive-stats evaluator fires milestones from session state. The session gains a `members` slice (per-member life/practices) alongside the embodied `life` slice; autonomous members run through the existing `simulateIdleTicks`; a multi-bench stepper iterates benches with a deterministic fold-up rule. UI adds only the rail; the rest of Phase 1 is engine + content.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`), Zod v3, JSON5, Vitest, React Native Web (rail only).

**Design doc:** `docs/superpowers/specs/2026-08-16-tiered-progression-design.md` §1–§4, §12 Phase 1, §14 deviations log.

## Global Constraints

- Engine purity: `src/engine/` — no react/react-native/expo, no `Date.now`/`new Date`/`Math.random`/`fetch`/`process.env`/`console`. Time as `nowUnix`, entropy as seeded `Rng` only.
- No `as any`, no `@ts-ignore`/`@ts-expect-error`, no empty `catch`. Optional props omitted unless typed `T | undefined`.
- No new runtime import cycles. Type-only back-edges must be commented. `src/engine` never imports `src/content/**`.
- Engine files ≤ ~250 lines (split past that).
- Residue stays ids and numbers. Fold markers are ids (`member:<id>`, `bench:person`), never prose.
- No metaphysical currency: milestones observe the archive; nothing is spent.
- Identity fence: roster roles/policies are assignments; member `SocialIdentity` is opaque; nothing sets caste/gender/class/wealth/disability.
- All new player-facing strings are SIDs in `src/i18n/en.json`, house style: nested objects, dotted paths, leaves end `_sid`. Kind/rarity labels are FLAT under `studio` (`studio.kind_tradition_sid`), NOT a `kind.*` namespace. `graduation` is a new top-level namespace.
- Typecheck gate: `pnpm typecheck` (the `typecheck` script is `tsc --noEmit`). The bare `pnpm tsc --noEmit` form misbehaves in this repo.
- Commit voice: imperative, specific. Commit only task-named files.
- Working tree carries a large uncommitted baseline — NEVER `git add -A`/`git add .`.

## Verified Signatures (from Phase 0 + this session's exploration — load-bearing, do not rename)

```ts
// src/engine/studio-offline.ts
stepStudio(studio: StudioState, idle: IdleState, life: LifeState,
  practices: readonly Practice[], schedule: DailySchedule, endings: readonly Ending[],
  ticks: number, rng: Rng): StudioCatchUpResult  // { studio, idle, life, practices, summary }
catchUpStudio(...same..., lastVisitedAtUnix: number, nowUnix: number, rng): StudioCatchUpResult
studioTicksAway(lastVisitedAtUnix: number, nowUnix: number): { ticks, capped }
STUDIO_SECONDS_PER_TICK = 60; STUDIO_AWAY_TICK_CAP = 240

// src/engine/idle.ts
simulateIdleTicks(state: LifeState, idle: IdleState, schedule: DailySchedule,
  practices: readonly Practice[], ticksToSimulate: bigint, endings: readonly Ending[],
  rng: Rng): { state, idle, result: IdleTickResult }
// idle loop resolves resolveScheduleState(schedule, tick).currentBlock each tick;
// emits practice_tick / practice_level / resource_edge / life_ended residue only.

// src/engine/reducer.ts
createLifeState(opts: { id: LifeState['id']; era: LifeState['era']; role: LifeState['role'];
  identity: SocialIdentity; age?: number; resources?: Partial<Record<ResourceId, number>> }): LifeState

// src/engine/manifest.ts
tableFillManifest(window, brief, qualityTier, rng, rngSeed, id, focus?, lifeContext?,
  scale: ManifestScale = 'person', kindRules: readonly KindRule[] = DEFAULT_KIND_RULES): Manifest
// throws loudly when the runtime catalog has no entries for the picked kind

// src/content/progression (Phase 0)
KindRowSchema: { schema_version:'kind/v0', id, scale, pinnable(default false), catalog_ref,
  sid_ns, min_quality(default 0), match: { dominant?|no_dominant?|dominant_in?|social?|spatial? } }
TierSchema: { ..., unlock_milestone: string|null, fold_cadence, roster_size {min,max}, member_unit }
MilestoneSchema: { id, predicate: ArchivePredicate, grants: { tier, ceremony_sid } }
ArchivePredicate = {op:'gte'|'gt'|'eq',key,value} | {op:'and'|'or',operands[]} | {op:'not',operand}
loadProgression(): ProgressionRegistries  // { tiers, kindRows, kindRules, milestones, policies, endowment, visitors, compendium }

// session v1 (src/engine/studio-session.ts)
StudioSession: { schema_version:'studio_session/v1', benches: Record<string,BenchState>,
  archive: Manifest[], tiers: Record<string,TierState>, milestones_done: string[],
  compendium_done: string[], embodied_member: {tier,member}|null, idle, life, practices,
  last_visited_at_unix? }
snapshotStudioSession(studio, idle, life, practices, lastVisitedAtUnix?, progression = defaultProgression())
hydrateStudioSession(session, baseLife, packPractices): { studio, idle, life, practices, progression }
RosterMember: { id, name, role, policy, embodied, focus_id?, seed }

// UI mount (src/ui/components/StudioView.tsx)
// root ScrollView testID="studio-screen"; rail = flex-row View wrapping the ScrollView, rail first.
// test harness: @/test/rntl { render, getByTestID, getByText, press }; SIDs via resolveSid.
```

## File Structure

| File                                          | Action        | Responsibility                                                                                                                               |
| --------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/progression/base/catalogs.json5` | Create        | All table catalog entries (person five + household two), keyed by kind                                                                       |
| `src/content/progression/registry.ts`         | Modify        | Import + expose catalogs bundle                                                                                                              |
| `src/content/progression/loader.ts`           | Modify        | Validate catalogs; build `catalogs: Record<string, CatalogEntry[]>`; lint kind↔catalog                                                       |
| `src/content/progression/lint.ts`             | Modify        | R-PROG-KIND-CATALOG: every kind row's catalog has ≥1 entry                                                                                   |
| `src/content/progression/schema.ts`           | Modify        | CatalogEntrySchema + CatalogFileSchema                                                                                                       |
| `src/engine/table-catalog.ts`                 | Create        | `CatalogEntry` type + `buildCatalog(kindRows, entries): Record<string, readonly CatalogEntry[]>`                                             |
| `src/engine/manifest.ts`                      | Modify        | `tableFillManifest` takes `catalog` param (default: built-in person five, re-exported from manifest-catalog.ts unchanged as DEFAULT_CATALOG) |
| `src/engine/manifest-catalog.ts`              | Keep          | Unchanged person-five tables (still the default; content path overrides)                                                                     |
| `src/engine/archive-stats.ts`                 | Create        | `ArchiveStats`, `computeArchiveStats(session, kindIds)`, `evaluateArchivePredicate(stats, pred)`, key vocabulary + validation                |
| `src/engine/milestones.ts`                    | Create        | `checkMilestones(session, stats, milestones): MilestoneEvent[]` (pure; UI applies)                                                           |
| `src/engine/roster.ts`                        | Create        | Member life factories, `runAutonomousMember`, fold-up stamping, embodiment swap                                                              |
| `src/engine/session-step.ts`                  | Create        | `stepSession(session, ctx, ticks, rng)`: multi-bench tick + autonomous members + fold                                                        |
| `src/engine/studio-session.ts`                | Modify        | v1.1: add `members: Record<string, MemberSlice>` (additive, defaulted)                                                                       |
| `src/content/progression/base/kinds.json5`    | Modify        | Add tradition + heirloom rows (household scale)                                                                                              |
| `src/content/progression/base/policies.json5` | Modify        | Ship one policy (`policy:household-base`)                                                                                                    |
| `src/content/progression/base/roles.json5`    | Create        | Household role/name tables (plain strings — compiled output, like catalogs)                                                                  |
| `src/i18n/en.json`                            | Modify        | `studio.kind_tradition_sid`, `studio.kind_heirloom_sid`, `studio.tier_*`, `graduation.*`                                                     |
| `src/ui/components/StudioRail.tsx`            | Create        | Two-row tier rail with badges                                                                                                                |
| `src/ui/components/StudioView.tsx`            | Modify        | Mount rail; expose `tiers`/`progression` props for it                                                                                        |
| Tests                                         | Create/Modify | Per task                                                                                                                                     |

---

### Task 1: Table catalogs become content

**Files:**

- Create: `src/content/progression/base/catalogs.json5`
- Modify: `src/content/progression/schema.ts`, `registry.ts`, `loader.ts`, `lint.ts`
- Create: `src/engine/table-catalog.ts`
- Modify: `src/engine/manifest.ts`
- Test: `src/content/progression/__tests__/catalogs.test.ts`, modify `loader-lint.test.ts` if the lint signature changes

**Interfaces:**

- Produces:
  - `CatalogEntry { readonly name; one_liner; subject; detail: string; readonly tags: readonly string[] }` (engine, `src/engine/table-catalog.ts`)
  - `CatalogEntrySchema` (content schema; plain strings — compiled card output, not SIDs)
  - `ProgressionRegistries` gains `readonly catalogs: Readonly<Record<string, readonly CatalogEntry[]>>` keyed by kind id
  - `tableFillManifest(..., scale = 'person', kindRules = DEFAULT_KIND_RULES, catalog: Readonly<Record<string, readonly CatalogEntry[]>> = DEFAULT_CATALOG)`
  - Lint rule `R-PROG-KIND-CATALOG`: every `kind/v0` row's `id` has ≥1 entry in `catalogs`

- [ ] **Step 1: Failing test** — `src/content/progression/__tests__/catalogs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';

describe('shipped catalogs', () => {
  const registries = loadProgression();

  it('has entries for every core kind', () => {
    for (const kind of ['thing', 'outcome', 'change', 'person', 'place'] as const) {
      expect((registries.catalogs[kind] ?? []).length).toBeGreaterThan(0);
    }
  });

  it('every catalog entry carries five tags max and a subject', () => {
    for (const entries of Object.values(registries.catalogs)) {
      for (const entry of entries) {
        expect(entry.subject.length).toBeGreaterThan(0);
        expect(entry.tags.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run** `pnpm exec vitest run src/content/progression/__tests__/catalogs.test.ts` — FAIL (no `catalogs` on registries).
- [ ] **Step 3: Implement.** `src/engine/table-catalog.ts`:

```ts
// Runtime table-catalog types + assembler. Entries are compiled card output
// (plain strings by design — the compiler writes sentences, SPEC §7); they
// are NOT SIDs. Pure: data in, data out.

export interface CatalogEntry {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
}

export type CatalogMap = Readonly<Record<string, readonly CatalogEntry[]>>;

/** Assemble the runtime catalog from validated content. Throws on empty kind tables. */
export function buildCatalog(
  kindIds: readonly string[],
  byKind: Readonly<Record<string, readonly CatalogEntry[]>>,
): CatalogMap {
  const out: Record<string, readonly CatalogEntry[]> = {};
  for (const id of kindIds) {
    const entries = byKind[id];
    if (entries === undefined || entries.length === 0) {
      throw new Error(
        `buildCatalog: kind "${id}" has no table entries (table fallback is mandatory)`,
      );
    }
    out[id] = entries;
  }
  return out;
}
```

Content `schema.ts` addition:

```ts
export const CatalogEntrySchema = z
  .object({
    name: z.string().min(1),
    one_liner: z.string().min(1),
    subject: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type CatalogEntryRow = z.infer<typeof CatalogEntrySchema>;
```

`base/catalogs.json5` — copy the five person-kind tables VERBATIM from `src/engine/manifest-catalog.ts` (THINGS/OUTCOMES/CHANGES/PEOPLE/PLACES become `catalogs: { thing: [...], outcome: [...], change: [...], person: [...], place: [...] }`). Do not edit prose.

`registry.ts`: import + expose as `catalogs: unknown`. `loader.ts`: extract `{ catalogs }` array of `{ kind, entries }` — shape the JSON5 as:

```json5
{
  catalogs: [
    { kind: 'thing', entries: [ { name: 'Sealed token', ... } ] },
    ...
  ],
}
```

validate each row with `CatalogEntrySchema.array()`, build `catalogs: CatalogMap` via `buildCatalog(kindRowIds, byKind)` (import `buildCatalog`, `type CatalogMap` from `@/engine/table-catalog` — value import from content into engine module is allowed direction). `lint.ts` adds `R-PROG-KIND-CATALOG` (checks kind row ids ⊆ catalog keys; engine throw already covers the empty case). `manifest.ts`: add trailing `catalog: CatalogMap = DEFAULT_CATALOG` param; replace `CATALOG[kind]` lookup with `catalog[kind]`; import `DEFAULT_CATALOG` from `./manifest-catalog` (keep that file untouched; re-type its export as `CatalogMap`). Update `fill-adapter.ts` call sites to pass nothing (default preserved).

- [ ] **Step 4:** Run catalogs test + full engine + progression suites — PASS. **Step 5:** Commit `feat(content): move table catalogs to progression content`.

---

### Task 2: Archive stats + milestone evaluator

**Files:**

- Create: `src/engine/archive-stats.ts`, `src/engine/milestones.ts`
- Test: `src/engine/__tests__/archive-stats.test.ts`, `src/engine/__tests__/milestones.test.ts`

**Interfaces:**

- Consumes: `StudioSession` (v1), `ArchivePredicate` (content schema type — re-declare structurally in engine; content type assignable).
- Produces:
  - `interface ArchiveStats { readonly pinned: Readonly<Record<string, number>>; readonly world_drafts: Readonly<Record<string, number>>; readonly harvests: Readonly<Record<string, number>> }`
  - `ARCHIVE_STAT_KEYS` (vocabulary: `pinned.*`, `world_drafts.total|<scale>`, `harvests.<rarity>`)
  - `computeArchiveStats(session: StudioSession): ArchiveStats`
  - `evaluateArchivePredicate(stats: ArchivePredicate-shaped, predicate): boolean`
  - `validateArchivePredicateKeys(predicate): string[]` (unknown keys list; empty = valid)
  - `checkMilestones(session, milestones: readonly {id, predicate}[]): string[]` — ids whose predicate flips true and are NOT in `session.milestones_done`

- [ ] **Step 1: Failing tests.** archive-stats: pinned counts by kind (pin state = `session.benches[tier].pinned` for each unlocked bench + `tiers.*.roster.members[].focus_id` presence — v1 keeps one pin per bench; count a kind as pinned when ANY bench pins a card of that kind OR any member focus_id equals a card of that kind); `world_drafts.total` and `world_drafts.household` (world drafts are NOT persisted in v1 — compute from archive: `canAssembleWorld` per scale? NO: world drafts are assembled transiently. For Phase 1, derive: `world_drafts.total = number of archive cards with kind 'place' ≥1 or 'person' ≥2 ? 1 : 0` is wrong. DECISION: stats key `world_drafts.*` reads `session.compendium_done`-like new additive field? — No. Simplest truthful source: the UI assembles drafts; Phase 1 records them: session v1.1 adds `world_drafts: { scale: string }[]` (additive, defaulted []). `computeArchiveStats` counts by scale + total from it. Milestone `unlock-household` needs `world_drafts.total >= 1` — the person bench UI already supports assembling (StudioWorld); Phase 1 records assembly into the session (Task 7 wires the UI call).
      Test milestones: crossing `pinned.person >= 3 && world_drafts.total >= 1` yields `['unlock-household']` exactly once; already-done ids never re-fire; unknown-key predicate → `validateArchivePredicateKeys` returns the key.
- [ ] **Step 2:** FAIL run. **Step 3:** Implement pure functions (switch on `op`; lookup `key.split('.')` → `[section, rest]`; missing → 0 for numbers). `checkMilestones` = filter + evaluate + dedupe. **Step 4:** PASS + full engine suite. **Step 5:** Commit `feat(engine): evaluate archive milestones over session stats`.

---

### Task 3: Session v1.1 — members slice + world drafts (additive)

**Files:**

- Modify: `src/engine/studio-session.ts`, `src/engine/studio-session-v0.ts`
- Test: extend `src/engine/__tests__/studio-session-v1.test.ts`

**Interfaces:**

- `MemberSlice { life: LifeSlice; practices: PracticeSlice[] }` — reuses v0 leaf schemas
- `StudioSession` gains `members: Record<string, MemberSlice>` and `world_drafts: { scale: string }[]` (both `.default({})` / `.default([])` in Zod so v1.0 payloads parse unchanged — migration is schema-default, no imperative path needed)
- `snapshotStudioSession` gains optional `extras?: { members?, world_drafts? }` merged over session defaults
- `hydrateStudioSession` returns `members` and `world_drafts` alongside today's fields

- [ ] Steps: failing round-trip test (v1.0 payload parses with defaulted members/world_drafts; snapshot→parse→hydrate preserves both; v0 migration yields empty members + drafts) → implement (Zod `.default()`; update snapshot/hydrate; v0 migrator returns the two new keys) → full engine + persistence suites → commit `feat(engine): add members and world drafts to the studio session`.

---

### Task 4: Household kind rows, catalogs, policy, roles

**Files:**

- Modify: `src/content/progression/base/kinds.json5`, `policies.json5`
- Create: `src/content/progression/base/roles.json5` (+ schema/loader/lint pass-through like catalogs: `RolesFileSchema { household: { roles: string[], names: string[] } }`)
- Modify: `src/content/progression/base/catalogs.json5` (add tradition ×4, heirloom ×4 entries)
- Test: extend progression loader tests

**Content decisions (verbatim):**

- `tradition` row: `{ schema_version:'kind/v0', id:'tradition', scale:'household', pinnable:false, catalog_ref:'core/tradition', sid_ns:'studio.kind_tradition_sid', min_quality:0, match:{ social:true } }`
- `heirloom` row: `{ ... id:'heirloom', scale:'household', ..., match:{ dominant:'practice_level' } }`
- Both rows APPEND after the eight person rows — household rules only ever run against household-bench windows (Task 6 passes scale-filtered rules), so person-tier picks stay byte-identical.
- Policy `policy:household-base`: `{ schema_version:'policy/v0', id:'policy:household-base', practices:[<three real practice ids from the tang pack practices.json5>], schedule_ref:'schedule:household-morning', choice_weights:{} }` — read the pack to pick real ids; if `schedule:household-morning` does not exist, ADD a fourth schedule block-set to the pack's schedules.json5 covering 24h with the three practices + null-practice rest hours (follow the existing schedule fixture shape).
- Roles: `{ household: { roles: ['elder','cook','runner'], names: ['Second Aunt','Old Wen','Little Shu'] } }` (plain strings — compiled output).

- [ ] Steps: failing loader test asserts tradition/heirloom rows + catalogs + policy + roles load and lint passes → implement → suites → commit `feat(content): ship household kinds, catalogs, policy, and roles`.

---

### Task 5: Roster runtime — member lives + autonomous play

**Files:**

- Create: `src/engine/roster.ts`
- Test: `src/engine/__tests__/roster.test.ts`

**Interfaces:**

- `createMemberLife(memberId: string, role: string, era: EraId, rng: Rng): LifeState` — `createLifeState` with branded ids (`member:<id>` as LifeId via the same cast pattern `studio-bench` uses), role, opaque default identity (`gender:'unspecified', social_class:'household', family_wealth_at_birth:'unspecified', caste_status:'none', disability_status:'none'`), resources `{}`.
- `runAutonomousMember(member: MemberSlice, policyPractices: readonly Practice[], schedule: DailySchedule, endings: readonly Ending[], ticks: bigint, rng: Rng): MemberSlice` — wraps `simulateIdleTicks(member.life, member.idleLike state? NO: member.life carries no idle; maintain tick counter from `member.life.turn`? DECISION: MemberSlice.life IS a LifeState-shaped slice but full LifeState is stored; the slice type in session stores LifeSlice (turn/resources/skills/residue). Runtime rebuilds full LifeState via `{...createMemberLife(...), ...slice}`in hydrate.`runAutonomousMember`runs`simulateIdleTicks`on the rebuilt state with a per-member`IdleState` derived deterministically (`lastSimulatedTick: BigInt(slice.life.turn)`, `totalIdleTicks: 0n`) and returns the new MemberSlice (residue included in slice).
- `memberSeed(sessionSeed: string, memberId: string): bigint` — deterministic hash (FNV-1a over `sessionSeed + ':' + memberId`, folded to bigint) so per-member Rng is stable across reloads.
- `FOLD_IDS = { member: (id: string) => `member:${id}`, bench: 'bench:person' }`
- `foldUpEvents(events: readonly ResidueEvent[], sourceId: string, cadence: number, counter: number): { events: ResidueEvent[]; nextCounter: number }` — emits the input unchanged, except every `cadence`-th event (1-based, deterministic on counter) gains `sourceId` appended to `ids[]` (dedup) — the parent-bench copy is made by the caller.
- `swapEmbodiment(session: StudioSession, memberId: string | null): StudioSession` — `null` re-embodies the default person life. Swapping moves `session.life` ↔ `session.members[id].life` (and `practices` ↔ member practices), sets `embodied_member`, flips the roster member's `embodied` flag, and clears any other member's flag (one embodied at a time). Idempotent no-op when the member is already embodied.

- [ ] Steps: failing tests (deterministic member seed; autonomous member advances practices + emits practice_tick residue; fold emits markers every 4th event and returns counter; swapEmbodiment moves slices both directions, enforces one-embodied, no-ops when already embodied) → implement → engine suite → commit `feat(engine): run autonomous roster members on seeded rng`.

---

### Task 6: stepSession — multi-bench tick with fold-up

**Files:**

- Create: `src/engine/session-step.ts`
- Test: `src/engine/__tests__/session-step.test.ts`

**Interfaces:**

- `interface SessionStepContext { practices: readonly Practice[]; embodiedSchedule: DailySchedule; memberScheduleFor: (policy: string) => DailySchedule; endings: readonly Ending[]; kindRulesByScale: Readonly<Record<string, readonly KindRule[]>>; tiers: readonly { id: string; scale: string; fold_cadence: number }[] }`
- `stepSession(session: StudioSession, ctx: SessionStepContext, ticks: number, rng: Rng): { session: StudioSession; summary: { embodiedTicks: number; memberTicks: number; folded: number; benchesReady: string[] } }`

**Algorithm (exact):**

1. Embodied life: existing `stepStudio(personBench, idle, life, practices, embodiedSchedule, endings, ticks, rng)` — unchanged semantics for the person bench (tests pin this).
2. Autonomous members (only when `session.tiers.household?.unlocked === true`): for each roster member with `embodied === false`, `runAutonomousMember(..., BigInt(ticks), memberRng)`; append member residue to the household bench log with `foldUpEvents(memberEvents, FOLD_IDS.member(id), cadence=1 → every event gets the member marker)`.
3. Person-bench fold-up (only when household unlocked): the person bench's NEWLY recorded events (delta before/after stepStudio) fold to the household bench with `foldUpEvents(delta, FOLD_IDS.bench, tier.fold_cadence, session-scoped counter persisted in... DECISION: derive counter from household bench residue — count existing events already carrying `bench:person` marker; no new persisted counter needed).
4. Household bench cook: `tickStudio(householdBench, ticks)` (+ `absorbSurplus` when charged, mirroring stepStudio's gate).
5. Return new session (benches, life, practices, members updated; idle from stepStudio; progression slices untouched — milestone check is the UI's next step, Task 8).

- [ ] Steps: failing tests (person bench behavior unchanged when household locked — golden vs old `stepStudio`; member residue lands on household bench with markers; every-4th person fold; household bay cooks; determinism: same seeds → same session) → implement → engine suite → commit `feat(engine): step the whole session across benches and members`.

---

### Task 7: Graduation — unlock, roster seeding, first harvest, UI rail

**Files:**

- Create: `src/engine/graduation.ts`
- Modify: `src/i18n/en.json`, `src/ui/components/StudioRail.tsx` (new), `src/ui/components/StudioView.tsx`
- Test: `src/engine/__tests__/graduation.test.ts`, `src/ui/__tests__/StudioRail.test.tsx`, extend `StudioView.test.tsx`

**Engine (`graduation.ts`):**

- `graduateToHousehold(session: StudioSession, roles: { roles: string[]; names: string[] }, rng: Rng): StudioSession` — idempotent guard (`tiers.household.unlocked === true` → return input). Seeds: `tiers.household = createTierState('household', true)` with 3 roster members (`id: 'm1'|'m2'|'m3'`, name/role from tables via `rng.pick`, `policy:'policy:household-base'`, `embodied:false`, `seed: memberSeed(...)` numeric), `benches.household = fresh bench` (residue [], last_harvest_index -1, bay null, quality 0, harvest 0, play_import null, pinned null, surplus 0), `members` slices created (member lives via `createMemberLife`), `milestones_done += ['unlock-household']`, guaranteed first cook: queue a develop ONLY if the fresh household bench already has ≥3 residue (it will not, on graduation day) — DECISION: no fake queue; the graduation harvest is the FIRST tradition/heirloom card once real folded residue cooks. Ceremony is UI.
- Household harvest path: `harvest` uses `kindRulesByScale['household']` + `catalogs` from loader + `scale:'household'` when the ready bay belongs to the household bench (StudioView wires this in this task).

**SIDs (house style, exact keys):**

```json
"studio": {
  "kind_tradition_sid": "Tradition",
  "kind_heirloom_sid": "Heirloom",
  "tier_person_sid": "One life",
  "tier_household_sid": "Household",
  "tier_locked_sid": "Locked",
  "tier_ready_badge_sid": "{n} ready",
  "tier_progress_badge_sid": "{n}/{m}",
  "rail_heading_sid": "The ladder"
},
"graduation": {
  "household_title_sid": "The household gathers",
  "household_line_sid": "Three lives now leave residue under one roof.",
  "dismiss_button_sid": "To the bench"
}
```

**Rail (`StudioRail.tsx`):** presentational; props `{ tiers: readonly { id: string; labelSid: string; unlocked: boolean; readyCount: number; progress: { n: number; m: number } | null }[] }`; renders `testID="studio-rail"` + per-tier `testID={'studio-rail-tier-' + id}`; locked row shows `studio.tier_locked_sid`; reduced-motion safe (no animation). **StudioView:** wrap the ScrollView in `<View style={{ flex: 1, flexDirection: 'row' }}>` with `<StudioRail ... />` first; rail props derived: person row from `canHarvest(studio)`, household row from `session.tiers` + milestone stats (`computeArchiveStats` + the household predicate progress n/m from its gte operands — hardcode the two keys for Phase 1: `pinned.person`/3, `world_drafts.total`/1). Graduation ceremony: when `checkMilestones` returns `['unlock-household']`, call `graduateToHousehold`, set a one-shot overlay `testID="graduation-overlay"` rendering the three graduation SIDs with a dismiss button.

- [ ] Steps: engine failing tests (idempotence; 3 members seeded deterministic from seed; milestones_done recorded; fresh household bench shape) → implement → UI failing tests (rail renders two rows with correct testIDs from injected props; StudioView with a session at 2/3 pinned shows progress badge text via `resolveSid('studio.tier_progress_badge_sid')` formatted; graduation overlay appears for a milestone-ready session and dismiss persists) → implement (SIDs FIRST, then components) → full suites → commit `feat(ui): graduate to the household tier with a rail and ceremony`.

---

### Task 8: Barrel, play-bridge members path, full gate

**Files:**

- Modify: `src/engine/index.ts` (export archive-stats, milestones, roster, session-step, graduation, table-catalog surfaces)
- Test: full gate

- [ ] Steps: add exports (names exactly: `computeArchiveStats`, `evaluateArchivePredicate`, `validateArchivePredicateKeys`, `checkMilestones`, `createMemberLife`, `runAutonomousMember`, `memberSeed`, `foldUpEvents`, `stepSession`, `graduateToHousehold`, `buildCatalog`, types `ArchiveStats`, `CatalogEntry`, `CatalogMap`, `MemberSlice`, `SessionStepContext`) → `pnpm typecheck` (exit 0) → `pnpm lint` (0 errors; pre-existing web.ts warning tolerated) → `pnpm test` (ALL green) → commit `feat(engine): export the household runtime from the barrel`.

---

## Self-Review Notes

- **Spec coverage:** design §12 Phase 1 items map — roster/embodiment (Tasks 3,5,7), autonomous policy play (5), fold-up (6), household kind-set (4), milestone+graduation (2,7), minimal shell rail (7). §14.2 entry conditions: catalog relocation (Task 1), kind-catalog lint (1), ArchivePredicate key validation (2). SID-existence smoke tests land with Task 7 (deviation §14.2 defers the lint itself to when UI reads kind sids — Task 7's tests cover the shipped set).
- **Embodiment toggle:** design §2.2 requires per-member toggle. Task 7 ships display + the underlying session field; the toggle ACTION (swap `session.life` ↔ `members[id].life`, update `embodied_member` + roster flags) is `roster.ts`'s `embodiment` swap — INCLUDED in Task 5 as `swapEmbodiment(session, memberId): StudioSession` (add to Task 5 interfaces + tests: swapping moves the life slice both directions, one embodied at a time, embodied member excluded from autonomous run in Task 6).
- **Type consistency:** `MemberSlice` defined Task 3, consumed 5/6/7; `kindRulesByScale` built by the UI from `loadProgression().kindRows` grouped by `row.scale` preserving file order (loader already preserves order).
- **Known tension accepted:** session v1.1 fields are additive Zod defaults — v1.0 payloads parse unchanged; no version bump (design §8.4 additive rule).
