# Architecture

> System architecture for Yakshetra — a Samsara-inspired roguelite with
> deterministic engine, data-driven content, and a representation-fenced
> editorial framework.

---

## High-level diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          app/  (Expo Router)                        │
│   index → life/start → life/[lifeId] → bardo → chain-complete    │
│              ↓                                ↑                    │
│          settings  ←────────────────────── about                   │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ React + useSaveSlot/useEngineReducer
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                src/ui/  (React components + hooks)                 │
│   BardoView · SettingsView · AboutView · DisclaimerModal · …     │
│   useSaveSlot (persistence bridge) · useEngineReducer (state ctx) │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ pure function calls, no platform APIs
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 src/engine/  (PURE TYPESCRIPT)                      │
│                                                                     │
│   types.ts ────► reducer.ts ────► echo.ts ────► turn.ts            │
│       │              │              │              │               │
│       └──────────────┴──────────────┴──────────────┘               │
│                            │                                       │
│                     predicates.ts (extracted)                       │
│                     rng.ts (xoshiro128**)                          │
│                     serialize.ts (canonical JSON + SHA-256)         │
│                                                                     │
│   HARD RULES: zero react, zero react-native, zero expo,            │
│               zero Date.now, zero Math.random, zero console        │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ imported by content/ and persistence/
                  ▼
┌──────────────────────┬──────────────────────────┬──────────────────┐
│  src/content/        │  src/persistence/        │  src/i18n/       │
│  schema.ts (Zod)     │  adapter.ts (interface)  │  en.json (SIDs)   │
│  lint.ts (5 rules)   │  memory.ts               │                   │
│  loader.ts           │  native.ts (expo-sqlite) │                   │
│  warning-taxonomy.ts │  web.ts (idb-keyval)     │                   │
│  packs/              │  corruption.ts (fallback)│                   │
│   ├ tang-china/      │                          │                   │
│   └ fantasy-mahayana/│                          │                   │
└──────────────────────┴──────────────────────────┴──────────────────┘
```

---

## The turn loop (within a life)

```
  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌─────────┐
  │ ORIENT  │──►│  INTEND  │──►│   ACT    │──►│  RESOLVE   │──►│ REFLECT  │
  │ see     │   │ pick one │   │ pick one │   │ apply      │   │ journal  │
  │ state   │   │ of 6     │   │ of 2-4   │   │ effects    │   │ card     │
  │         │   │ lenses   │   │ choices  │   │ show delta │   │ (dismiss-│
  │         │   │          │   │          │   │            │   │ ible)    │
  └─────────┘   └──────────┘   └──────────┘   └────────────┘   └────┬────┘
       ▲                                                         │
       │                                                         ▼
       └────────────── advanceTurn (capped accrual, era hook) ──────┘
```

The 4-phase loop is in `app/life/[lifeId].tsx`; the reducer logic is in
`src/engine/reducer.ts`. Every state transition goes through `applyChoice`
or `advanceTurn` — direct mutation is forbidden (enforced by `F2` grep gate).

---

## The cross-life echo flow

```
   Life 1 (Tang China)                    Life 2 (Fantasy)
  ┌──────────────────┐                   ┌──────────────────────┐
  │  applyChoice ×n   │                   │  applyEchoesToNextLife│
  │       │           │                   │       ▲               │
  │       ▼           │                   │       │               │
  │  summarizeLife    │                   │  ┌────┴────────┐      │
  │       │           │                   │  │ KarmaState  │      │
  │       ├─► Echo[] │ ──── mergeKarma ─►│  │  echoes[]    │      │
  │       │           │                   │  │  vows        │      │
  │       └─► IR[]   │                   │  │  IR_agg      │      │
  └──────────────────┘                   │  └─────────────┘      │
                                          │       │               │
                                          │       ▼               │
                                          │  NextLifeSeed         │
                                          │  - resource_mods      │
                                          │  - blocked_roles      │
                                          │  - narrative_seeds    │
                                          │  - imagery_tag        │
                                          └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  CRITICAL INVARIANT:  │
                                          │  NO SocialIdentity    │
                                          │  in NextLifeSeed      │
                                          │  (1000-case property  │
                                          │   test enforces)      │
                                          └──────────────────────┘
```

The 4 echo types are:

- **Tendency**: dominant intent-root share > 40% → next-life event-pool bias
- **Vow**: declared / kept / broken vow flag → next-life action-gating predicate
- **Unresolved attachment**: `attachment:*` flag never cleared → next-life
  rhyming NPC or situation
- **Pattern break**: ≥5-turn care-dominance after prior aversion-dominance →
  next-life rare "blessing" endings unlock

The `social_identity` invariant is enforced by:

1. The `EraPack` type does NOT include any identity fields
2. `applyEchoesToNextLife` returns a `NextLifeSeed` that has NO identity fields
3. A property test at `src/engine/__tests__/invariant.test.ts` generates 1000
   random `KarmaState`s and asserts no `NextLifeSeed` key matches
   `/(gender|caste|race|disability|wealth|species|social_identity)/i`

---

## Content pack loading sequence

```
  src/content/packs/tang-china/
    pack.json5       ─┐
    events.json5     ─┼──► loadEraPack('tang-china')
    endings.json5    ─┤              │
    meta.json5       ─┘              ▼
                            JSON5.parse
                                │
                                ▼
                       EraPackSchema.safeParse
                                │
                                ▼
                          lintPack (5 rules)
                                │
                                ▼
                          EraPack (typed)
                                │
                                ▼
              dispatched to engine at run-time
```

The `loadEraPack` helper at `src/content/loader.ts`:

- Reads the directory via `node:fs/promises`
- Parses with `JSON5.parse`
- Validates with Zod (rejects prohibited effect types at parse — schema is the
  first line of defense)
- Runs the lint (rejects textual violations — lint is the second line)
- Returns the typed `EraPack` or throws with the offending field

---

## Persistence model

```
                          ┌────────────────────────┐
                          │  StorageAdapter interface │
                          │  load(slot) → SaveBlob   │
                          │  save(slot, blob)        │
                          │  listSlots() → number[]   │
                          │  deleteSlot(slot)        │
                          └─────────┬──────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
       memory.ts              native.ts                  web.ts
   (in-memory Map)        (expo-sqlite/kv-store)    (idb-keyval)
   used in tests          used on iOS/Android         used on web
```

A `SaveBlob` looks like:

```ts
{
  schema_version: "0.1",       // literal type — strict matching
  engine_compat: ">=0.1 <1.0", // semver range
  created_at_unix: 1234567890, // metadata ONLY — never read by engine
  run_id: "uuid",
  chain: {
    life_states: LifeState[],
    karma_state: KarmaState,
    current_life_index: number
  }
}
```

On corruption (integrity hash mismatch, parse error, shape mismatch), the bad
blob is archived to `corrupted-slot-N-{timestamp}.json` and the load returns
`null`. The engine falls back to a fresh chain.

---

## The six-lens system

The player chooses one of six lenses each turn, framing the choices
they see:

| Player-facing label | Sanskrit term | Frame                                                |
| ------------------- | ------------- | ---------------------------------------------------- |
| Generosity          | dāna          | actions emphasizing giving                           |
| Careful Conduct     | śīla          | actions emphasizing ethical restraint                |
| Patient Courage     | kṣānti        | actions emphasizing endurance (NOT enduring abuse)   |
| Joyful Effort       | vīrya         | actions emphasizing sustained engagement (NOT grind) |
| Collected Attention | dhyāna        | actions emphasizing presence                         |
| Discernment         | prajñā        | actions emphasizing wise judgment                    |

**Hard rule**: no lens is leveled, no lens is "perfected," no lens is
"better." The player's lens choice biases which actions are _salient_
(some actions require a specific lens to be visible) but never grants
power, score, or progression. The lenses are interdependent perspectives,
not a skill tree.

The six terms appear in UI as English-only player-facing labels
(no Sanskrit) — Sanskrit/Pāli terms live exclusively in the glossary at
`src/i18n/en.json` under `glossary.*` for readers who want to learn the
original vocabulary.

---

## Determinism guarantees

The engine is bit-exact reproducible across platforms:

1. **RNG**: `xoshiro128**` seeded via `bigint` (≥128 bits). No `Math.random`
   anywhere in `src/engine/`.
2. **Time**: zero `Date.now()` or `new Date()` anywhere in `src/engine/`.
   `created_at_unix` in `SaveBlob` is metadata only — never read by engine.
3. **Serialization**: `canonicalStringify` sorts keys at every level. `Map` →
   sorted-key object; `Set` → sorted array; `bigint` →
   `{__bigint: "<decimal>"}`. SHA-256 integrity hash on every blob.
4. **Property test**: `src/engine/__tests__/determinism.test.ts` runs 50 turns
   100 times with the same seed and asserts identical hashes.

**The only non-determinism in the system is platform float formatting** for
non-integer values. We mitigate by using `JSON.stringify` (shortest-round-trip)
instead of `toFixed`, and the invariant holds across V8 (Node/web) and JSC (iOS).

---

## Module dependency graph

```
                    app/
                      │
                      ▼
                  src/ui/ ─────► src/engine (read-only imports)
                      │           ▲
                      ▼           │
                src/persistence ──┘ (read-only imports)

                src/content (uses src/engine types)
```

Critical: **no upward dependencies**. `src/engine/` imports nothing from
`app/`, `src/ui/`, `src/persistence/`, or `src/content/`. This is what makes
the engine testable in pure Node and what allows future prototypes
(real-time text, 2D RPG, platformer) to reuse the rules with different
surfaces.

---

## See also

- `docs/roadmap.md` — how future prototypes share this engine
- `advisory/panel.md` — representation framework
- `.omo/plans/buddhist-inspired-incremental-rpg.md` — the full implementation plan
- `README.md` — quick start, toolchain notes, blocked-task handoff
- `CONTRIBUTING.md` — how to add events, era packs, lenses, and tests
