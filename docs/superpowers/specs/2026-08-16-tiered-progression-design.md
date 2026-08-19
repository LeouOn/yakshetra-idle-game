# Tiered Progression — The Chain

**Status:** design, pending user review
**Date:** 2026-08-16
**Supersedes:** the §14 build-order list in `SPEC.md` (ratified by a SPEC amendment in Phase 4, not before)
**Respects:** every fence in `SPEC.md` §10. See §11 of this doc.

---

## 0. What this is

Yakshetra grows from one life into a nested idle game. The player manages a
**person**, then a **household**, an **organization**, a **town**, a **city**,
and finally a **region** — six tiers, each a bench like today's studio, each
cooking its own scale of Manifest. Lower benches run themselves once unlocked.
The archive — pinned Manifests and world drafts — is the only proof of
progress. There is no new currency.

This document is the whole model plus the extension contracts. Implementation
is phased (§12); each phase is its own plan.

## 0.1 Decisions log

Settled in brainstorming with the user, 2026-08-16:

1. The chain is **nested benches**, not parallel save-slots. Tiers compose:
   a town literally contains the player's households and organizations.
2. Tier unlocks are **archive milestones** — predicates over pinned Manifests
   and world drafts. Nothing is spent; the archive is the proof.
3. Unlocked lower benches run at **full auto-production**: they tick, cook,
   and hold harvests. The player returns to harvest, pin, and direct.
4. The ladder is six tiers and **stops at region**. "Subdivision" means a
   province-scale division _above_ a city, not a city district.
5. **Per-member embodiment toggle.** Any roster member can be embodied
   (actively played through the campaign life surface) or autonomous
   (self-playing under direction). One embodied member at a time.
6. **Manifests scale with tier.** `manifest/v1` adds a `scale` field; `kind`
   becomes an extensible registry with per-tier kind-sets.
7. All four proposed idle mechanics are in scope: **endowment** (upgrade
   tracks), **visitors** (boost events), **compendium** (milestones with
   one-time rewards), **bigger offline cap**.
8. UI/UX is an overhaul, not a polish pass: navigation/cohesion, flat reward
   feedback, and visual identity are all in scope, and the current
   single-bench layout must gain room for the chain.
9. **Extensibility is a first-class requirement.** Every system is a registry
   of data with an "Adding X" recipe (§9) so other agents can extend the game
   without reading the whole engine.

---

## 1. The Ladder

Six tiers. The defining rule is **composition**: a tier's roster is made of
whole lower-tier units, so the nesting is literal, not decorative.

| #   | Tier        | Roster contains            | Fiction frame                                    |
| --- | ----------- | -------------------------- | ------------------------------------------------ |
| 0   | `person`    | one life                   | today's game, unchanged                          |
| 1   | `household` | 3–8 lives under one roof   | head of a family — a merchant house, a farmstead |
| 2   | `org`       | households + loose members | a guild, a monastery, a clinic, a troupe         |
| 3   | `town`      | households + organizations | a market settlement, a county seat               |
| 4   | `city`      | households + many orgs     | a prefectural city, a pilgrimage hub             |
| 5   | `region`    | towns + cities             | a province, a circuit — the top of the ladder    |

Tier definitions are data (`tier/v0`, §8), not engine constants. The engine
knows "a tier has a scale, a roster composition rule, a fold cadence, an
unlock milestone"; the ladder above is the shipped content.

### 1.1 Residue folds upward

Every bench keeps its own residue window and cooks its own tier's Manifests.
In addition, a fixed share of each bench's residue flows into its parent
bench's window:

- Fold cadence is per-tier data; the shipped default is **every 4th event**
  (deterministic counter, not RNG).
- A folded event is a copy of the child event with one extra id in `ids[]`:
  `folded_from:<childBenchId>`. Residue stays ids and numbers. No prose.
- Folded events count toward the parent window's minimums (the 3-event cook
  threshold) and participate in the parent's kind-compile rules.

A household card is therefore partly made of what the people did. Region
residue is genuinely the sediment of everything below it.

### 1.2 Auto-production below the waterline

Once a tier is unlocked, its benches tick, cook, and hold harvests on their
own. Only the tier containing the embodied member takes active play. The
player's verbs at every automated tier are: **harvest**, **pin**, **endow**,
**direct** (assign policies and focus), **embody**.

Catch-up math (1 studio tick = 60 s, base cap 240 ticks) applies **per bench**,
so a week away means every unlocked tier has cards waiting. The engine never
reads the clock; callers pass `nowUnix` as today.

---

## 2. Roster & Embodiment

### 2.1 Roster

A tier's roster (`roster/v0`) is a list of members:

```
roster/v0
  tier: string                    // tier id, e.g. "household"
  members: [
    id: string
    name: string                  // compiled by bench, not player-typed prose
    role: string                  // data-defined per tier: parent, apprentice, abbot…
    policy: string                // autonomous policy id (policy/v0, §8)
    embodied: boolean
    focus_id?: string             // pinned person/place Manifest biasing this member
    seed: number                  // per-member RNG seed, derived from session seed + id
  ]
```

- **Roles are fiction and management assignments, not rebirth outcomes.**
  The echo reducer is untouched; `SocialIdentity` stays opaque; nothing in a
  roster sets caste, gender, class, wealth, or disability. (Fence 8.)
- Roster size bounds are tier data (household ships 3–8).
- Names compile from the tier's name tables, same as Manifest names.

### 2.2 Embodiment toggle

- Any member can be toggled `embodied ↔ autonomous`. **One embodied member
  across the whole game at a time.** Embodying member B releases member A.
- Embodying binds the existing campaign life surface (`app/life/...`) to that
  member: the player plays their turns, events, and choices exactly as
  person-tier works today. The residue shape is identical either way.
- The person tier is **not special-cased**: it is a roster of one whose sole
  member starts embodied. All tier logic is uniform from the start.

### 2.3 Autonomous play

Autonomous members self-play on the existing schedule/practice systems
(`src/engine/schedule.ts`, `activities.ts`) driven by their policy:

- A policy (`policy/v0`, data) references practice/schedule ids from era packs
  plus event-choice preference weights keyed by event tags.
- All randomness comes from the member's seeded `Rng`. No wall clock, no
  LLM, no prose on the engine side.
- Autonomous lives emit the same `ResidueEvent` shapes as played lives, so
  benches cannot tell the difference — and should not.

---

## 3. Scaled Manifests (`manifest/v1`)

The Manifest gains exactly one field:

```
manifest/v1  =  manifest/v0  +  scale: "person" | "household" | "org"
                                    | "town" | "city" | "region"
```

- Migration is additive: `manifest/v0` entries load as `scale: "person"` via
  `src/engine/migration.ts`. All other slots are untouched, so the filler
  contract and the §16.2 model-harvest path carry over unchanged.
- `about_id` / `about_name` and pinning work at every scale.

### 3.1 The kind registry

`kind` stops being a closed union in engine code and becomes loaded data
(`kind/v0`, §8). The five core kinds (`thing`, `outcome`, `change`, `person`,
`place`) ship as registry rows at `person` scale. Each tier adds a kind-set:

| Scale     | New kinds                 | Examples                                              |
| --------- | ------------------------- | ----------------------------------------------------- |
| household | `tradition`, `heirloom`   | the New Year dumpling fold; grandmother's needle case |
| org       | `charter`, `ware`         | the weavers' guild charter; the kiln's celadon glaze  |
| town      | `festival`, `landmark`    | the lantern market; the west bridge                   |
| city      | `institution`, `monument` | the relief bureau; the bell tower                     |
| region    | `legend`, `road`          | the tale of the gate yakṣa; the pilgrimage circuit    |

Each `kind/v0` row declares:

```
kind/v0
  id: string                      // "tradition"
  scale: string                   // tier scale this kind belongs to
  compile_rule: predicate         // residue-window pattern, same family as SPEC §6
  catalog_ref: string             // table catalog namespace for tableFiller
  sid_ns: string                  // i18n namespace for names/lines
  min_quality: number             // lowest quality tier this kind appears at
```

- Kind pick reads the registry in declared order; first matching compile rule
  wins. The existing §6 rules become the `person`-scale rows' rules.
- **Table fallback applies per kind:** a kind with no table catalog entries
  fails content lint. A model may never be the only way to fill a kind.
  (Fence 3, extended.)

### 3.2 World drafts at scale

World drafts gain `scale`. A tier's draft assembles from that tier's own
anchors — people/places at person scale, and the tier's kinds above it
(a town draft is woven from `festival` + `landmark` + pinned town people, not
from 400 pinned individuals). Assembly stays deterministic from the archive;
export stays `canonicalStringify`.

---

## 4. Unlock Economy — Archive Milestones

A tier unlocks when its **milestone** (`milestone/v0`, data) evaluates true
over the archive. Milestones are declarative predicates evaluated by the
existing predicate engine (`src/engine/predicates.ts`) over archive stats:
pinned counts by kind and scale, world-draft counts by scale, harvest counts
by rarity.

Shipped ladder (initial values; tuning is content work):

- `household` ← 1 world draft + 3 pinned `person`
- `org` ← 2 pinned `tradition` + 1 household-scale world draft
- `town` ← 1 pinned `charter` + 2 org-scale world drafts
- `city` ← 1 pinned `festival` + 1 pinned `landmark` + 2 town-scale world drafts
- `region` ← 1 pinned `institution` + 1 pinned `monument` + 2 city-scale world drafts

Rules:

- **Nothing is spent.** Milestones observe the archive; pinned cards stay
  pinned. (Fence 6 — the archive is the economy, not a number.)
- Crossing a milestone fires a **graduation**: a ceremony (§6.4) plus a
  guaranteed first harvest auto-queued at the new tier, so the player
  immediately holds a card at the new scale.
- Milestone progress is visible in the UI (badges, next-action rail).

---

## 5. Idle Mechanics

Four systems. All pure-engine, all data-defined, all deterministic.

### 5.1 Endowment (upgrade tracks)

Pin a Manifest permanently into a bench's **endowment slot**: the card leaves
the archive and the bench gains a permanent, data-defined modifier.

- Effects are EffectOps — the same op vocabulary practices and minigames
  already use (`cook_speed`, `window_size`, `surplus_rate`, `offline_cap`…).
- Each bench ships with 2 slots; compendium rewards add slots.
- Tracks are per-tier data, gated by milestones. An endowment track row:
  `{ id, tier, requires?: milestoneId, slot_cost: number, effects: EffectOp[] }`.
- This is the sink that makes duplicate cards valuable **without inventing a
  currency**: you spend objects, never a number. (Fence 6 holds.)

### 5.2 Visitors (boost events)

Per-tier visitor tables (`visitor/v0`, data). A visitor arrival applies a
temporary modifier or swaps in a special harvest table for the next N windows.

- Arrival is deterministic: computed from bench tick count + bench seed,
  with data-defined cadence and jitter. No wall clock.
- Shipped examples: a yakṣa at the gate, a traveling teacher, a festival day.
- Era packs can ship their own visitors — visitors are content, not engine.
- Visitor fiction may name figures per SPEC §3/§11; visitors never lecture
  and never grant attainment. (Fences 11–12.)

### 5.3 Compendium

A milestone-style achievement registry (`compendium/v0`, data) with one-time
rewards: titles, new table vocabularies, offline-cap raises, extra endowment
slots, cosmetic themes.

- Entries are predicates over archive + tier stats, same evaluator as §4.
- Rewards are EffectOps or unlock references — data, not code.
- Persisted in the studio session; one-time, idempotent.

### 5.4 Offline cap

- Base stays 240 ticks per bench. Endowment and compendium rewards raise it
  (data-defined amounts).
- The engine still never reads the clock. Callers pass `nowUnix`; catch-up
  runs per bench.

---

## 6. UI/UX Overhaul

Studio stays the visual lead. One shell, four moves against the pains flagged
in brainstorming (navigation/cohesion, flat feedback, glanceability, no room
for the chain).

### 6.1 StudioShell

A single shell hosts every bench. Route `app/studio` becomes the shell host.

- **Left rail: the ladder.** One row per unlocked tier with live badges:
  ready harvests, active visitors, milestone progress toward the next tier.
  Selecting a tier swaps the bench view. Locked tiers show their milestone
  progress, greyed.
- **Bench view** is today's studio surface (tend, windows, cook, archive,
  world) re-parented under the shell, plus the tier's roster panel.
- Campaign screens migrate onto the shell and studio theme when touched. No
  third palette.

### 6.2 Next-action rail

A computed "what to do next" strip, always visible, derived from state:

- a ready harvest on any bench
- an uncooked window ≥ 3 events
- a milestone at ≥ 80%
- an active visitor with windows remaining
- an empty endowment slot on any unlocked bench

It answers the idle player's only question at a glance. Pure function of
session state; unit-tested like any engine selector.

### 6.3 Visual identity

Deepen `src/ui/studio-theme.ts` in the occult-workshop direction — ink,
lacquer, brass, paper — as **tokens**, not ad-hoc colors. Existing components
migrate to tokens as they are touched. Tone stays SPEC §3: warm, specific,
objects with weight.

### 6.4 Ceremonies (juice)

Reward moments get staging, all behind `StudioJuice`-style reduced-motion
respect:

- **Harvest reveal:** card flip, rarity-weighted.
- **Graduation:** tier-unlock sequence — the rail lights the new tier, the
  guaranteed first harvest cooks on screen.
- **Visitor arrival:** banner treatment on the affected bench, with remaining
  windows counted down.
- **Tend overflow:** the charge bar visibly spills into surplus cook.

All copy through SIDs. Tests key on `testID`s, never on poetry.

### 6.5 Embodiment UX

The roster is a grid of member cards: name, role, policy, embodied state,
focus. An embody toggle on each card. Embodying slides the life surface in
over the bench as a panel (route-preserving); releasing returns to the bench
with session state intact.

---

## 7. Data Schemas (sketches)

Normative Zod schemas land with Phase 0. Sketches here fix the shapes:

```
tier/v0        id, scale, index, roster_size: {min,max}, member_unit: string,
               role_table_ref, unlock_milestone: milestoneId,
               fold_cadence: number, endowment_slots: number,
               visitor_table_ref
kind/v0        (§3.1)
milestone/v0   id, predicate, grants: { tier?: string, ceremony_sid: string }
roster/v0      (§2.1)
policy/v0      id, practices: string[], schedule_ref,
               choice_weights: { [eventTag: string]: number }
endowment/v0   id, tier, requires?: milestoneId, slot_cost, effects: EffectOp[]
visitor/v0     id, tiers: string[], cadence_ticks, jitter_ticks,
               duration_windows, effects: EffectOp[] | table_ref, sid_ns
compendium/v0  id, predicate, reward: EffectOp[] | unlock_ref, sid_ns
tier_state/v0  tier, unlocked, roster: roster/v0,
               endowed: endowmentId[], active_visitor?: { id, windows_left }
```

Persistence: the studio session becomes `studio_session/v1` —

```
studio_session/v1
  benches: { [tierId: string]: BayState }
  tiers:   { [tierId: string]: tier_state/v0 }
  archive: Manifest[]             // shared across tiers, as today
  milestones_done: string[]
  compendium_done: string[]
  embodied_member?: { tier: string, member: string }
```

`studio_session/v0` migrates by wrapping the existing bay as the `person`
bench. The life-chain `SaveBlob` is untouched; the play-residue bridge now
targets the bench of the tier containing the embodied member.

---

## 8. Extensibility Architecture

Goal: a future agent adds a feature by writing **data and tests**, not by
reading the whole engine.

### 8.1 The progression content domain

New directory `src/content/progression/`: Zod + JSON5, loaded like era packs.

```
src/content/progression/
  schema.ts            // tier/v0, kind/v0, milestone/v0, policy/v0,
                       // endowment/v0, visitor/v0, compendium/v0
  loader.ts            // loadProgression() → validated registries
  base/                // shipped content: the six tiers, all kind rows,
    tiers.json5        // milestones, policies, endowment tracks,
    kinds.json5        // visitor tables, compendium entries
    milestones.json5
    policies.json5
    endowment.json5
    visitors.json5
    compendium.json5
  __tests__/
```

### 8.2 Registries, not enums

Engine code reads tier/kind/endowment/visitor/milestone definitions from the
loaded registries. There is no closed union in `src/engine` that an agent
must edit to add content. Kind pick, milestone evaluation, visitor
scheduling, and endowment effects are all registry-driven.

### 8.3 Lint extends, never relaxes

The existing prohibited-mechanics lint (`R-NO-KARMA-METER`,
`R-NO-VISIBLE-KARMA-METER`, `R-NO-DONATION-OFFSET`,
`R-NO-PRACTICE-AS-CURRENCY`) extends to the new effect sites: an endowment
track, visitor effect, or compendium reward that mints a metaphysical meter
fails lint exactly as a pack effect would today. Content lint also requires:

- every `kind/v0` row has ≥ 1 table catalog entry and a valid `sid_ns` _(deferred to Phase 1 — see §14)_
- every SID referenced exists in `src/i18n/en.json` (`resolveSid` throws on
  missing keys — lint catches it first) _(deferred to Phase 1 — see §14)_
- every milestone/compendium predicate parses under the predicate schema

### 8.4 Versioning rules

- Schemas are versioned (`/v0`, `/v1`, …). Evolution is **additive**: new
  optional fields, new registry rows. Renames and removals get a new version
  plus a `migration.ts` path.
- `manifest/v1` is the template: one additive field, one migration.

### 8.5 Invariants restated for agents

1. `src/engine/` stays pure: no React/Expo, no clock, no `Math.random`, no
   `fetch`, no `process.env`, no `console`. Time is `nowUnix`; entropy is the
   seeded `Rng`.
2. Schema or it does not exist. Every new state shape parses with Zod.
3. Table fallback per kind, always.
4. Residue stays ids and numbers. Compilers write sentences.
5. No metaphysical currency, no pay-to-absolve, identity is not a score.
6. No new import cycles. Engine files split past ~250 lines.
7. All player-facing strings are SIDs.

---

## 9. Agent Recipes — "Adding X"

These recipes moved to `CONTRIBUTING.md` §"Extending the game" (§9.1–9.6
verbatim, kept as the canonical authoring recipes). This section remains
so in-doc references don't break.

---

## 10. Testing Strategy

- Tests next to the module (`src/engine/__tests__/`, `src/content/__tests__/`,
  `src/ui/__tests__/`), as today.
- Determinism: property tests that identical seeds produce identical
  autonomous lives, visitor schedules, and fold-up streams.
- Schema: every `*/v0` and `manifest/v1` round-trips; migrations from
  `manifest/v0` and `studio_session/v0` are tested with fixtures.
- Fallback: for each shipped kind, a model-filler failure still yields a
  table card of that kind.
- UI: shell rail badges, next-action rail, and ceremonies tested via
  `testID`s.
- Gate per phase: `pnpm tsc --noEmit && pnpm lint && pnpm test` green.

---

## 11. Fences Carried Forward

How this design obeys SPEC §10:

- **Engine purity (1).** All new systems are pure functions of state + seed +
  `nowUnix`. §7 schemas live half in engine (state), half in content (data).
- **Schema harvest (2, 3).** `manifest/v1` is still the only product object;
  every kind has table entries; the model path is unchanged.
- **No metaphysical currency (6).** Milestones observe; endowment spends
  _objects_; no farmable number is added anywhere.
- **Identity is not a score (8).** Roster roles are assignments; the echo
  reducer and `NextLifeSeed` are untouched.
- **No teacher impersonation, no lecturing (11, 12).** Visitors and
  ceremonies name figures and stage moments; they never grade the player.
- **Quality before width (15).** Phasing builds household end-to-end before
  any wider tier exists. §14's "second bay" caution is honored: the chain
  multiplies benches only after the model is proven at household.

---

## 12. Phasing

Each phase is its own implementation plan, written when the previous phase
closes. Scope discipline: nothing outside the phase enters the change set.

- **Phase 0 — Foundation.** `src/content/progression/` schemas + loader +
  base content skeleton; kind registry wired into compile; `manifest/v1` +
  migration; `studio_session/v1` + migration. No UI. Person tier plays
  exactly as today on the new schemas.
- **Phase 1 — Household end-to-end.** Roster, embodiment toggle, autonomous
  policy play, residue fold-up, household kind-set, the household milestone +
  graduation, minimal shell rail (two rows). **This phase proves the model.**
- **Phase 2 — Idle depth.** Endowment, visitors, compendium, offline-cap
  raises.
- **Phase 3 — Org + town, full UI overhaul.** StudioShell complete,
  next-action rail, identity/token pass, ceremonies.
- **Phase 4 — City + region, polish. Done (commits 10364da…c15d909 on
  `feat/phase-4-city-region`).** Visitor `table_ref` swap and `effectiveAwayCap`
  overlay wired; city (`institution`, `monument`) and region (`legend`, `road`)
  kinds + fallbacks + catalogs + policies + roles + schedules + visitors
  ship; six-tier E2E proven; ladder helpers consolidated (Phase 3 minors
  closed). Then the SPEC amendment: ratify the ladder and this doc's decisions;
  supersede §14's ordering; move §9 recipes into `CONTRIBUTING.md`. See §14.9.

---

## 13. Open Questions

None blocking. Two assumptions were presented twice without objection and are
recorded as decisions (§0.1): tiers compose literally rather than running as
parallel slots, and exactly one member is embodied at a time. Either can be
revisited before Phase 1 without schema churn — both are behavior policy, not
data shape.

---

## 14. Phase 0 Deviation Log

Recorded post-implementation (commit range 2613648..2f2adfb on
`feat/phase-0-progression-foundation`) so Phase 1 agents and SPEC amendments
work against truth, not sketches.

### 14.1 Sketches that drifted from the landed code

- **§3.1 kind registry — `compile_rule` renamed to `match`.** The landed
  `KindRuleSchema` field is named `match` (and `KindMatchSchema`); the §3.1
  sketch used `compile_rule`. Field shape is unchanged. Phase 1 code should
  read/write `match`.
- **§3.1 kind registry — added `pinnable` field.** The landed `KindRowSchema`
  carries `pinnable: boolean` (default false), not in the sketch. Person and
  place rows in `kinds.json5` set it true. Phase 1 schema-aware pin logic
  reads `pinnable`; the engine `isPinnableKind(kind: string)` keeps its
  person/place membership check for backwards compatibility.
- **§7 sketch — manifest migration lives in `src/engine/manifest-migration.ts`.**
  The §7 sketch implied a single `src/engine/migration.ts` path; that file is
  already the SaveBlob migrator (`migrateSaveBlob`, `CURRENT_SCHEMA_VERSION
= '0.2'`). A second migration file with the same name would collide, so
  the manifest migration is its own module. The barrel exports it
  separately.
- **§7 studio session sketch — `BenchSchema` makes `play_import`/`pinned`/
  ` `surplus`required.** The sketch said optional; the landed schema makes
them required-nullable / required (since the runtime`StudioState`always
carries them, and the migration normalizes absent v0 keys to`null`/`null`/`0`). Migration is additive; fixtures in
`studio-session-v1.test.ts` assert the defaults.

### 14.2 Deferrals — must land before Phase 1 closes a tier with new kinds

- **§8.3 catalog-entry-per-kind lint is not yet enforced.** The lint
  verifies referential integrity (every tier unlock resolves, every
  milestone grant resolves), core-kind coverage, and meter-token bans. It
  does NOT yet require that a `kind/v0` row's `catalog_ref` resolves to a
  real catalog. Today, `catalog_ref` is decorative: adding a kind still
  requires editing `src/engine/manifest-catalog.ts` (the `CATALOG` Record)
  because that file remains engine-resident. The shipped 8 core-kind rows
  use `catalog_ref: 'core/<id>'` by convention; runtime loud-failure is
  enforced by `tableFillManifest`'s `CATALOG[kind] === undefined` throw
  (tested). **Phase 1 entry condition:** relocate table catalogs from
  `src/engine/manifest-catalog.ts` into content data, wire
  `loadProgression` to build the runtime `CATALOG`, and add the lint rule.
- **§8.3 i18n SID existence check is not yet enforced.** Player-facing SIDs
  arrive with their UI surfaces in Phase 3 (StudioShell, next-action rail,
  ceremonies). Until those read `kind.<id>.name` etc., an early check would
  produce dead-code warnings. **Phase 1 entry condition:** when the first
  household kind row lands, add `resolveSid`-style existence validation
  against `src/i18n/en.json` and the kind's `sid_ns` namespace.
- **`ArchivePredicate.key` is free-form.** A typo'd key (`pinned.traditon`)
  yields a silently-never-true milestone. Phase 1's evaluator must validate
  keys against the archive-stats vocabulary
  (`pinned.<kind-or-scale>`, `world_drafts.<scale-or-total>`, `harvests.<rarity>`).

### 14.3 Deviations the plan called out but are now resolved

- **Manifest vs. SaveBlob migration files split.** Implemented as
  `src/engine/manifest-migration.ts` and `src/engine/studio-session-v0.ts`
  respectively, with `src/engine/migration.ts` unchanged as the SaveBlob
  migrator. This is the right separation; no SPEC amendment needed.
- **Studio-session v1 re-parses a v0 archive card per-element.** The brief's
  verbatim `v0.studio.archive.map((card) => parseManifest(card))` failed tsc
  because `parseManifest` returns the engine `Manifest` (readonly `tags`)
  while the `StudioSession['archive']` slot demands mutable `string[]`. The
  landed fix `ManifestSchema.parse(parseManifest(card))` is minimal, the
  runtime is identical, and the cost is one redundant validation pass on
  a once-per-payload migration path. Documented inline at
  `studio-session-v0.ts:113`.
- **Play-bridge hand-rolled a session-level splice.** The plan did not
  enumerate `src/persistence/play-bridge.ts` as a consumer of the v0 session
  shape; it crashed against v1 and was adapted in a standalone commit. The
  splice preserves v0 semantics by construction (`{...base, benches: {...}}`
  spread keeps idle/life/practices/tiers/milestones/compendium/
  `last_visited_at_unix`; the saved archive is `base.archive`
  unconditionally). Fix `2f2adfb` adds the archive-survival regression test
  that locks this invariant.

### 14.4 Minor findings deferred to Phase 1

These are noted by the final whole-branch review and ride to Phase 1:

- `manifest-catalog.ts` is 257 lines (over the ~250 ceiling). Phase 1's
  catalog relocation to content resolves it naturally.
- `studio-session.ts` is 252 lines. Split when extracting
  `hydrateStudioSession` / `emptyHydratedSession` into a hydrate module for
  multi-bench support.
- The bench↔studio field mapping appears three times (engine hydrate, the
  play-bridge reassembly, the save splice). Extract `benchToStudio` /
  `studioToBench` helpers when the second tier lands.
- The progression meter scan excludes `tiers` and `kindRows` rows. Extend
  `meterScope` when those fields start carrying player-visible strings.
- `ArchivePredicateSchema: z.ZodType<ArchivePredicate>` creates a drift seam
  tsc won't catch. If the interfaces and sub-schemas ever diverge, the
  schema tests are the guard.

### 14.5 Process notes (not code changes)

- `pnpm tsc --noEmit` as documented in AGENTS.md prints "Already up to date"
  in this repo's pnpm version — the working invocation is
  `node node_modules/typescript/bin/tsc --noEmit`. Worth a one-line
  `package.json` script fix at convenience time.
- `src/persistence/studio-kv.ts` deletes the session key on parse failure
  (pre-existing). With v0→v1 migration running inside that try, one
  unparseable card now destroys the whole session with no diagnostic.
  Phase 1 should consider quarantine-before-delete when the persistence
  layer is next touched.

### 14.6 Phase 1 deviations (household end-to-end)

Recorded so later agents work against truth.

- **Household bench auto-queues its cook inside `stepSession`.** Once folded
  residue reaches the effective minimum, the cook fires there — this
  replaces design §4's ceremony-queued guaranteed first harvest; the first
  household card arrives when real folded residue cooks. Golden-tested
  person equivalence.
- **Member rng streams seed from the persisted roster `seed` row.**
  Graduation derives it once, stable across reloads; `ctx.sessionSeed`
  drives only the household-develop stream.
- **`BenchState` gained `fold_position` (additive, defaulted)** so
  every-4th-cumulative-event fold ordinals persist across sub-cadence
  batches.
- **The bench↔studio field mapping was extracted to
  `src/engine/bench-mapping.ts`** (was 4 duplicated copies).
- **`POLICY_PACK = 'tang-china'` hardcodes the only residue source**;
  `stepCtx` captures first-render props (pack-constant assumption,
  documented in-code).
- **`unlock-household` originally gated on `pinned.person >= 3`** —
  unreachable pre-roster (one bench pin slot; focus_ids only exist
  post-graduation). Amended in Phase 2 to `archived.person >= 3`.
- **Tang schedule block SIDs (`tang.block.*`) added** after content
  referenced missing keys (22 keys); SID-existence lint remains deferred
  (§14.2).
- **Household kind rules made TOTAL (three appended fallback rows)** so no
  legal window shape can crash the kind pick.
- **Known open:** `operations.ts` at 286 lines (over the ~250 ceiling,
  extraction deferred); charge bar renders against MIN 3 regardless of
  window_min.

### 14.7 Phase 2 deviations (idle depth)

Recorded so later agents work against truth.

- **Modifier vocabulary is exactly five whitelisted keys** (`cook_speed`,
  `window_min`, `surplus_rate`, `offline_cap`, `endowment_slots`),
  lint-enforced by `R-PROG-MODIFIER-KEYS` with integer/non-negative delta
  checks; the engine tolerates off-vocabulary ops at runtime (lint rejects
  at load).
- **`queueDevelop` gained optional `{ cookTicksDiscount, minResidue }`**
  (minResidue ratified beyond the plan's literal shape — without it
  window_min would no-op against the internal ≥3 gate).
- **`effectiveAwayCap = 240 + Σ unlocked tiers' offline_cap + global`**
  (originally person-only; the household-keyed `long-absence` row forced
  the sum). All four shipped endowment rows verified to bite.
- **`visitor/gate-yaksa` grants `cook_speed` (not the planned
  `surplus_rate`)** — the person bench's surplus path is golden-protected
  inside `stepStudio`; `visitor/festival-day` is household-only for the
  same reason. Visitor arrivals: per-tier `visitor_ticks` counter
  (additive field), jitter = memberSeed-derived modulus, one active seat
  per tier, decay ONLY on harvest (`noteVisitorHarvest`).
- **`SessionStepContext` gained optional `visitors`; `adoptSteppedSession`
  syncs `progression.tiers`** (visitor seats live there and would evaporate
  after live ticks otherwise).
- **Compendium:** auto-grant mirrors checkMilestones' exactly-once;
  `computeGlobalRewards` folds MULTISEMANTICALLY (duplicate done ids
  double-fold — sole writer dedupes; contract-locked by test); global
  rewards feed `computeBenchModifiers`' 4th arg + `effectiveAwayCap`;
  panel always rendered.
- **Roster panel (StudioRoster):** focus cycle [none → cards → none] with
  forward-looking labels; embody = engine `swapEmbodiment` adopt path;
  focus writes only the roster row (key-omitted clear).
- **`endow/person/deep-window`'s `window_min` gates the manual develop
  button in the UI** (person engine path untouched, golden preserved).
- **`compendium/househeld` amended from `pinned.tradition` to
  `archived.tradition`** — tradition/heirloom ship `pinnable: false`, so a
  pinned operand was permanently dead; household harvests produce archived
  tradition cards (the live path). The org→region milestone ladder
  (`pinned.charter/festival/landmark/institution/monument`) is a Phase 3
  entry condition: either ship those kinds `pinnable: true` or switch the
  operands to `archived.*`, decided before org content lands.

### 14.8 Phase 3 deviations (org + town + UI overhaul)

Recorded so later agents work against truth. Line counts corrected post-Phase 4.

- **Ladder generalization.** `src/engine/session-ladder.ts` (175 LOC)
  replaced the hardcoded household branch in `session-step.ts`. Per-tier
  delta (embodied growth + member appends + incoming folds) folds at the
  receiving rung's `fold_cadence`; ordinal persists on `fold_position`;
  locked rungs drop the flow. Person bench still routes through
  `stepStudio` unchanged (Phase 1 golden preserved).
- **Operand policy finalized to `archived.*` across the whole ladder**
  (org→region gates + compendium rewards). New kinds ship
  `pinnable: false`; `pinned.*` stays valid for person/place but is unused
  by any current milestone. Loader pin enforces.
- **World drafts at scale.** `assembleWorldDraftAtScale` (person =
  existing rules verbatim; household/org/town = ≥2 cards of that scale,
  name from first, line from second) + `recordWorldDraftAtScale`
  (dedup append). `world-draft.ts` untouched.
- **`graduateToTier(session, tierId, tierRow, rolesRow, rng)`** replaces
  `graduateToHousehold` internals; org seeds `roster_size.min` autonomous
  lives with tier-unique ids + policy; town seeds one unit roster row per
  unlocked lower tier (no lives). `graduateToHousehold` thin wrapper
  retained for existing tests.
- **Operations split.** `play-cursor.ts` (49) + `practice-progress.ts` (30)
  moved out; `operations.ts` 294 → 210. Pure move, identity-tested.
- **StudioView hook extraction.** `useStudioSession.ts` (515) +
  `useStudioProgression.ts` (146); StudioView 1240 → 1041. The ≤~900
  target miss is the DECLARED DEVIATION: extraction is complete, remaining
  mass is honest render/handler code.
- **Next-action rail.** `src/ui/hooks/next-action.ts` pure derivation,
  priority (a) ready harvest → (b) locked-tier gate ≥80% → (c) uncooked
  window ≥ effective min → (d) active visitor → (e) empty endowment slot
  → (f) null; first-match-wins; renders via `StudioNextAction.tsx`
  (testID `studio-next-action`); 13 unit tests.
- **Generalized graduation overlay.** Reads `ceremony_sid` from any
  milestone grant; org/town SIDs added under `graduation` namespace;
  `dismiss_button_sid` shared; `milestones_done` blocks re-fire so
  dismissal persists.
- **Theme token pass.** `studioTheme.disabled` added; one inline literal
  swept (StudioView `buttonDisabled` → `t.disabled`); "touched only" scope
  preserved; StudioArchive's literal out of scope.
- **Phase 4 carryovers (closed).** Visitor `table_ref` swap is wired
  (§14.9), visitor partition coarseness unchanged, city + region scales
  ship, and the SPEC amendment is landed.

### 14.9 Phase 4 deviations (city + region + polish)

Recorded so later agents work against truth. Bindings from the Phase 4 plan
(`docs/superpowers/plans/2026-08-16-phase-4-city-region.md`) plus the
Task 2/3/4 corrections and Task 5 itself.

- **City/region kinds + fallbacks mirror org/town.** City ships
  `institution {social}` + `monument {dominant practice_level}` + three
  TOTAL fallbacks; region ships `legend {social}` + `road {dominant
practice_level}` + three fallbacks. All rows `pinnable: false`,
  `catalog_ref 'core/<id>'`, `sid_ns 'studio.kind_<id>_sid'`. The
  fallback row keeps `tableFiller`'s hard guarantee that every legal
  window shape yields a valid card at its scale.
- **Visitor `table_ref` swap is replace-not-merge.** A seated visitor
  row whose payload is `table_ref` (instead of `effects`) replaces the
  affected bench's harvest catalog for the visitor's remaining windows.
  Catalog resolution lives in `catalogs.json5` under a new top-level
  `visitor_tables` key (`VisitorTableMapSchema`). Harvest consults the
  active visitor's table before the tier's kind catalog;
  `noteVisitorHarvest` still decays windows. Deterministic; no rng.
  Missing or unresolved `table_ref` falls back silently to the tier
  catalog — the swap is opportunistic, never a blocker.
- **`effectiveAwayCap` counts seated visitor `offline_cap`.** The away
  cap now adds the seated visitor's `offline_cap` (if any) per tier,
  same pattern as `modifiersForSession`. No shipped visitor grants
  `offline_cap` today — this closes the future-hole, not a live gap.
- **Shared-helper hoist.** `EMBODIED_TIER`, the `statValue` walker, and
  `personEffectiveMin` (floor-at-2) move to single definitions:
  `src/engine/ladder-const.ts` for the constant, the walker + floor in
  `src/ui/hooks/session-selectors.ts`. The three duplicated copies across
  `next-action.ts`, `StudioView`, and `session-ladder` resolve to those
  imports.
- **SPEC amendment ratified (§1.1 + §14 rewrite).** SPEC.md §1 gains the
  ladder table (six tiers, composition rule, fold-up cadence,
  archive-milestone unlock, auto-production below the waterline). §14
  becomes a closing paragraph instead of a build-order list. §10 fences
  are untouched; §6/§7/§8/§9 stay as-is.
- **`visitors.json5` ships six rows.** Three carried over from Phase 2
  (`gate-yaksa`, `traveling-teacher`, `festival-day`), one added by
  Task 2 as the `table_ref` swap fixture (`sample-arrival`), and two new
  from Task 3 (`court-auditor` at city scale, `road-surveyor` at region
  scale). The Phase 4 plan's "two visitors" was Task 3's delta, not the
  shipped total.
- **`fold_position` is benign at 0.** The schema accepts `fold_position`
  ≥ 0 (`z.number().int().min(0)`); person benches sit at 0 by design
  (the embodied rung never folds into itself), fresh unlocked benches
  start at 0, and only non-person rungs advance per call. The full-ladder
  E2E (Task 4) locks this invariant: `benches['person'].fold_position`
  is always 0; every other unlocked rung is > 0 after enough residue.
