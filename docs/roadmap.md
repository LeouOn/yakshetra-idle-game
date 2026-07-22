# Roadmap for Prototypes 2–4 and Shared-Core Extraction

> **Status:** Living document. Companion to the Prototype 1 turn-based text
> management game that is currently committed and largely working
> (engine, content, persistence, UI shell). This roadmap is _not_ an
> implementation plan for any specific prototype. Detailed plans are
> authored just-in-time, immediately before each build begins.
>
> **Scope of this document:**
>
> 1. Outline the three future prototypes — real-time text, 2D RPG,
>    2D platformer — at the level of: what is reused, what is new,
>    what single hypothesis each one tests, effort range, and ordering.
> 2. Describe a shared-core extraction plan triggered _after_
>    Prototype 1 ships, not before.
> 3. Document the hybrid approach to reuse: extract only what is
>    proven shared, defer everything else.
>
> **Out of scope here:** multiplayer, mobile-only or PC-only constraints,
> engine rewrites, monetization, the advisory panel process, content
> localization beyond i18n keys. Those are decisions for later plans.

---

## Why three prototypes, and why now

The Prototype 1 game already validates the most fragile claims — that a
turn-based, contemplative, low-resolution text interface can carry an
ethical weight grounded in Buddhist concepts without violating the
advisory panel's stop-ship rules (representation, no karma-as-identity,
no canonical doctrinal claims). The three future prototypes each test
**exactly one** further variable against that validated baseline:

| Prototype               | New variable tested                        | Already validated by P1                                |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------ |
| **P2 — Real-time text** | Wall-clock pressure instead of turn pacing | Content, ethics, advisory                              |
| **P3 — 2D sprite RPG**  | Spatial exploration                        | Content, ethics, advisory, real-time pressure          |
| **P4 — 2D platformer**  | Reflex/skill gating                        | Content, ethics, advisory, real-time pressure, spatial |

Each prototype is therefore a _controlled experiment_: if the dharma
frame holds in P2, we know it survives real-time. If it holds in P3, we
know it survives spatial exploration. If it holds in P4, we know it
survives reflex. Failure at any step is signal, not a setback — it tells
us which mechanics are load-bearing for the contemplative frame and
which are decoration.

---

## Recommended order

**Prototype 2 next, then 3, then 4.**

P2 reuses 100% of the committed content (Tang China + Fantasy Mahāyāna
era packs, 14 events, 8 endings), 100% of the advisory-validated text,
and roughly 80–90% of the engine surface. The only meaningful new
component is a real-time driver loop that the current turn-based engine
does not contain. P2 therefore tests exactly one variable — _does
real-time pressure change the ethical feel of the same content?_ — for
the lowest possible build cost. P3 and P4 introduce compounding variables
that should not be attempted until the variable introduced in P2 has
been independently validated.

---

## Prototype 2 — Real-time text management

### (a) What is reused from the engine and content

- **Content schema and packs.** Tang China (`events.json5`, `pack.json5`)
  and Fantasy Mahāyāna (`events.json5`) load unchanged. The schema
  (`src/content/schema.ts`), loader (`loader.ts`), lint (`lint.ts`), and
  warning taxonomy (`warning-taxonomy.ts`) are pure data plumbing with
  no UI assumption and require no modification.
- **Engine rules.** The reducer (`src/engine/reducer.ts`), turn
  (`turn.ts`), echo (`echo.ts`, `echo-heuristics.ts`), RNG
  (`rng.ts`, `rng-impl.ts`), and serialization (`serialize.ts`) all
  accept discrete events and produce deterministic state. None of them
  assumes _when_ a turn fires; they only assume a turn boundary.
- **Persistence.** The `SaveAdapter` interface (`src/persistence/adapter.ts`)
  plus the existing implementations (native, web, memory, corruption
  fallback) work for any state shape that serializes to JSON.
- **Advisory framework.** Sign-off receipts, warning taxonomy, and
  content-lint fixtures carry over verbatim. No new sacred-name or
  mantra risk is introduced by changing pacing.
- **i18n.** The translation key set is unchanged; real-time copy is a
  small additive layer (e.g. "time is short" tooltips).
- **Test scaffolding.** Property-test fixtures, reducer tests, and the
  engine invariant test all run unchanged because the underlying state
  machine is the same.

### (b) What is new

- **Real-time driver.** A loop that advances _engine_ turns on
  wall-clock ticks (e.g. one turn per N seconds) instead of waiting for
  the player to tap "next". This is the single new engine-level
  component.
- **Resource decay on wall-clock.** Resources (grit, merit, attention,
  whatever the current schema names them) decay continuously, not only
  on turn boundaries. This is the single new mechanic.
- **Timer-based event firing.** Events may now resolve on a timer
  rather than waiting for a player choice. Player must commit before
  the timer expires; expiry resolves to a default lens.
- **Pause-and-pacing controls.** Pause-on-blur, pause-on-background,
  slow-motion toggle, accessibility "turn-mode revert" (an option that
  falls back to P1's tap-to-advance behavior for motor-impaired
  players).
- **Reflection beat under pressure.** The existing reflect-journal UI
  card either shortens, becomes skippable, or moves to a pause-only
  state. This is the most delicate UI change.
- **Telemetry.** Per-turn wall-clock duration, per-decision latency,
  per-event timeout rate. Feeds the playtest hypothesis evaluation.

### (c) Hypothesis tested

**Real-time pressure, holding content and engine rules constant,
changes the ethical feel of the choices — but does it sharpen the
contemplative frame, fracture it, or leave it neutral?**

The sub-questions are:

- Do players still report "no obviously-right answer" (the moral-weight
  Likert from the Prototype 1 playtest rubric)?
- Does the reflect beat survive when the timer is ticking? If players
  skip reflection 80%+ of the time, the contemplative frame is
  effectively gone and P2 has not preserved P1's core promise.
- Does real-time pressure make ending 7 (or whichever ending tests
  sustained discipline) feel earned, or feel like a chore?

### (d) Estimated effort

**Smallest of the three.** Roughly **3–5 weeks** for a single
experienced developer who already knows the P1 codebase.

- ~1 week: real-time driver + tick integration with the existing
  reducer.
- ~1 week: pause/slow-mo/accessibility toggles.
- ~1 week: reflection beat under pressure — design + UI.
- ~1 week: telemetry, instrumentation, lint extensions, content
  schema adjustments if any surface.
- ~1 week buffer: playtest instrumentation, fix-up, advisory review
  of any new copy.

No new art. No new audio. No new physics.

### (e) Order recommendation

**Build next.** P2 is the smallest possible delta from P1. It tests
exactly one new variable. It reuses every artifact that has already
been built, reviewed, and tested. If P2 fails its hypothesis, we have
learned something durable about the contemplative frame at the cost
of one small build. If it succeeds, the validation is equally durable
and P3 becomes the natural next experiment.

### Risks specific to P2

- **Reflection under pressure.** The most likely failure mode. If the
  reflect beat is the load-bearing element of the contemplative frame,
  real-time pacing may erase it. Mitigate with a long pause-then-act
  default and an accessibility "turn-mode revert" toggle.
- **Motor accessibility.** Real-time pressure is a known accessibility
  hazard. The turn-mode revert toggle is non-optional, not a premium
  feature.
- **Save/load across wall-clock.** A player who pauses for a week
  should not have their resources decay during the pause. Pause-on-blur
  and pause-on-background are required from day one.

---

## Prototype 3 — 2D sprite RPG (top-down / JRPG-style)

### (a) What is reused

- **Engine rules.** Reducer, turn, echo, RNG, serialization all carry
  over. P3 also adds a movement step to the engine, but the existing
  turn boundary remains the unit of resolution.
- **Content schema (reframed).** Events become NPC encounters at
  geographic nodes. Era packs continue to supply setting; events
  continue to supply ethical choices. The schema may grow a
  `location` field on each event but the core fields (lens weights,
  echo triggers, endings) stay identical.
- **Persistence and serialization.** Save shape evolves (adds position,
  map id, NPCs-met set) but the versioned load logic and corruption
  fallback carry over.
- **Advisory framework, warning taxonomy, i18n.** Same as P2 — content
  is the same data.
- **Echo system.** The cross-life echo, which is the single most
  P1-validated mechanic, becomes a _carried-between-lives_ feature
  that maps naturally onto a save slot.

### (b) What is new

- **Tile renderer.** Top-down or fixed-camera 2D renderer. Tile size,
  sprite sheet pipeline, depth sorting, lighting (likely none — P1's
  restraint should carry over).
- **Sprite assets.** Original art for the player avatar, NPCs, tiles,
  and props. This is the dominant new cost. Any reliance on AI-generated
  imagery must clear the advisory panel's "permitted imagery" gate,
  same as any P1 imagery decision.
- **World map and NPC dialog UI.** Spatial dialog UI is a _new UI
  surface_ — it does not exist in P1. Distance and facing affect which
  NPCs can be addressed and when.
- **Player avatar and movement.** Continuous movement between tiles;
  turn boundaries remain, but movement within a turn is a new
  affordance.
- **Audio.** P1 ships without audio. P3 is the first opportunity to
  add contemplative ambient audio, which should also clear advisory
  review.
- **Asset pipeline.** Sprite import, tileset slicing, animation states.

### (c) Hypothesis tested

**Spatial exploration, holding content and engine rules constant,
changes the dharma systems' feel — specifically, does "travel to the
event" make ethical choice feel more grounded (because the player
arrived at it) or more gamey (because the player sought it out)?**

Sub-questions:

- Does physical proximity change which lens the player picks? In P1
  lens choice is from a calm menu; in P3 it may be from a moment of
  arrival.
- Does the map create new affordances that compete with the
  contemplative frame (e.g. fast-travel trivializing patience)?
- Does NPC dialog at distance feel like _meeting a teacher_, or does
  it feel like _opening a quest log entry_?

### (d) Estimated effort

**Medium-large.** Roughly **3–6 months** for a single experienced
developer with art support, longer without.

- ~2–4 weeks: tile renderer + sprite pipeline.
- ~4–8 weeks: art (sprite sheets, tilesets, NPC portraits).
- ~2–3 weeks: world map, NPC dialog UI, movement.
- ~1–2 weeks: audio (if pursued at all in P3).
- ~1 week: engine extension for movement-step + position in state.
- ~2–3 weeks: telemetry, playtest, advisory re-review, fix-up.

Art cost is the dominant unknown. A pixel-art minimalist direction can
halve the art budget; a painterly direction can double it.

### (e) Order recommendation

**Build second, after P2.** P3 introduces spatial exploration, which is
a meaningful new variable but does not introduce reflex. Building P3
after P2 means the contemplative frame has already been validated under
real-time pressure, which is a harder test than the static P1 case.
P3 is also the natural next step for shared-core extraction to be
_tested_ — if P2 and P3 both end up importing the same engine and
content modules, the extraction was correct.

### Risks specific to P3

- **Art cost.** Art is the dominant budget. A pixel-art constraint
  chosen up-front is the single best hedge.
- **Scope.** Open-world temptation. The world should be the size that
  fits the event graph, not a "world for its own sake". The advisory
  panel will scrutinize any expansion that introduces new ethical
  material beyond the existing era packs.
- **Fast-travel as dharma-violation.** If fast-travel is added, it
  may trivialize the patience that the contemplative frame depends
  on. Consider deliberate _no_ fast-travel as a design constraint.
- **Audio drift.** If audio is added, it should remain contemplative
  ambient, not signal-heavy. Advisory review is non-optional.

---

## Prototype 4 — 2D action platformer (reflex/skill)

### (a) What is reused

- **Engine rules (heavily reframed).** The reducer and turn-boundary
  concept survive, but a turn in P4 may be a single jump, a single
  parry window, or a single NPC interaction. The core reducer remains
  useful; turn.ts becomes a much thinner layer.
- **Content schema (heavily reframed).** Events become encounters that
  _must_ resolve within a timing window. Lens choice becomes _in-the-moment
  stance_ rather than turn orientation — see (c) below.
- **Persistence.** Same shape, expanded for position, animation state,
  level progress.
- **Advisory, warning taxonomy, i18n.** Same data, same gates.
- **Echo system.** Carries across lives. May need a P4-specific
  reframe ("carry-between-runs" rather than "carry-between-lives").

### (b) What is new

- **Physics and input controllers.** Jump arc, collision, hitbox /
  hurtbox. The single largest new technical surface.
- **Animation states.** Idle, run, jump, attack, hit, recover. Sprite
  sheets per state.
- **Level design.** Discrete levels rather than open map; pacing is
  designed not emergent.
- **Enemy AI and timing windows.** Enemies attack on timers; player
  must parry within a window. This is the most direct way reflex
  enters the frame.
- **Audio cues.** Reflex gameplay almost requires audio cues (parry
  window beep, hit confirm, danger tone). Advisory review of any new
  audio is required.
- **The "lenses as stances" reframe.** The most delicate design
  problem in the whole roadmap. See (c).

### (c) Hypothesis tested

**The dharma frame survives when timing matters — i.e. when reflex/skill
gating replaces deliberation as the primary player action.** The
specific question is whether the six lenses of P1 can be reframed as
_in-the-moment stances_ rather than _turn orientations_.

Sub-questions:

- Can "compassion" become a stance that opens the parry window
  wider but reduces damage? Can "discernment" become a stance that
  tightens timing but rewards perfect execution? This is the deepest
  reframe attempted across all prototypes.
- Does reflex pressure (a parry window closing) destroy the
  contemplative frame the way real-time pressure did _not_, in P2's
  expected success case?
- Does the player still report "no obviously-right answer" when
  every answer has a reflex cost?

If P4 fails its hypothesis — i.e. reflex destroys the contemplative
frame — the result is still valuable: it tells us the frame is
deliberation-bound, not reflex-bound, and P3 is the right ceiling for
the genre experiment.

### (d) Estimated effort

**Largest.** Roughly **6–12 months** for a small team (1 programmer,
1 artist, ideally a designer).

- ~4–8 weeks: physics, input, collision, animation state machine.
- ~4–8 weeks: art (multi-state sprite sheets per character; tilesets
  per level).
- ~2–4 weeks: level design and pacing.
- ~2–4 weeks: "lenses as stances" reframe — design + balance.
- ~1–2 weeks: audio (cues, ambient).
- ~2–4 weeks: telemetry, playtest, advisory re-review, fix-up.

The lenses-as-stances reframe is the unknown that could double the
design budget if it requires iteration.

### (e) Order recommendation

**Build last, and only if P2 and P3 have both validated the
contemplative frame in their respective new variables.** P4 introduces
the most variables and is the most likely to invalidate the frame. If
P2 has already failed, P4 is almost certainly going to fail and is
not worth the budget. If P3 succeeded and P2 succeeded, P4 is the
final question: _is there a dharma game at all, or is the genre
ceiling at spatial exploration?_

### Risks specific to P4

- **Reflex destroys the contemplative frame.** Highest-probability
  failure mode of any prototype. The lenses-as-stances reframe is the
  single highest-stakes design decision in the entire project.
- **Accessibility.** Reflex gameplay is a major accessibility hazard.
  P4 must ship with difficulty options that approach P1's
  contemplation (assist mode, slow-mo, no-fail mode) and those must
  clear advisory review.
- **Audio dependency.** Reflex gameplay without audio cues is a much
  weaker experience. Adding audio to P4 means advisory review of a
  new audio surface.
- **Genre drift.** Platformers are a much broader genre than the
  contemplative frame. There is a real risk of building a generic
  platformer that has lost the dharma content entirely. Strict
  design discipline required.

---

## Shared-core extraction plan

### Trigger

**After Prototype 1 ships and before Prototype 2 begins.**

Not before. Extraction before P1 ships is premature. There is no
evidence yet of what is actually shared across prototypes, because
there is only one prototype. Premature extraction is a known
anti-pattern: it either locks in the wrong abstraction (because no
real prototype has pressure-tested it) or it bloats the shared surface
with code that is only used once. The user's confirmed hybrid approach
is correct: do not extract what is not yet proven to be shared.

### Audit method

1. **Wait for P1 to ship.** P1 must be committed, lint-clean, advisory-
   signed-off, and playable end-to-end before any extraction begins.
2. **Begin P2 build as a _consumer_ of P1 source paths.** During the
   P2 build, mark every import from P1 source that is needed by P2.
3. **At the end of P2 build (or partway through, once the import
   surface stabilizes), inventory the imports.** This is the empirical
   list of what is actually shared.
4. **Promote the inventory into a `packages/yakshetra-core/` package.**
   This is the _first_ extraction.

### What gets extracted in the first cut

Based on the engine and content structure today, the first extraction
will very likely include:

- **`packages/yakshetra-core/engine/`** — `reducer.ts`, `turn.ts`,
  `echo.ts`, `echo-heuristics.ts`, `rng.ts`, `rng-impl.ts`,
  `serialize.ts`, `types.ts`, `index.ts`. These are platform-agnostic,
  framework-agnostic, and have no React Native import surface.
- **`packages/yakshetra-core/content/`** — `schema.ts`, `loader.ts`,
  `lint.ts`, `warning-taxonomy.ts`, and the test fixtures (without the
  pack data itself; see below).
- **`packages/yakshetra-core/persistence/`** — `adapter.ts`,
  `corruption.ts`, `index.ts`. _Not_ the platform implementations
  (`native.ts`, `web.ts`, `memory.ts`); those stay per-prototype
  because each prototype may target a different platform mix.
- **`packages/yakshetra-core/test/`** — reducer tests, determinism
  property tests, invariant tests, smoke tests. These travel with the
  engine.
- **`packages/yakshetra-core/i18n/`** — the i18n key registry. The
  translations themselves stay per-prototype.

### What does NOT get extracted yet

- **Content packs themselves (`tang-china/`, `fantasy-mahayana/`).**
  They may diverge per prototype. P3 may reframespace events by
  location; P4 may reframe lenses as stances. Keeping the packs out
  of the core package preserves that optionality.
- **UI (`src/ui/`).** React Native-specific; will not be reused by
  the 2D-rendered prototypes. A separate UI extraction may happen
  later, but only if P2 needs to share a UI primitive with P3 or P4
  (unlikely in the first iteration).
- **Platform persistence modules.** `native.ts`, `web.ts`, `memory.ts`
  are platform-specific; they stay per-prototype until two prototypes
  share a target platform.
- **Advisory process files.** Those are project-process artifacts, not
  reusable code.
- **Anything that has not been imported by P2 yet.** "We might need
  this later" is exactly the wrong reason to extract.

### Second cut (after P2 ships)

Once P2 ships, repeat the audit. Likely second-cut additions:

- Real-time driver extracted to core if P3 or P4 also needs it.
- Telemetry schema extracted if multiple prototypes want it.
- Anything P2 introduced that P3 also imports.

### Third cut (after P3 ships)

If P3 ships, repeat again. At this point a clear shared core has
emerged from evidence. Likely third-cut additions:

- Asset pipeline helpers if P4 reuses them.
- Audio scaffold if P3 and P4 both have audio.
- Cross-prototype save migration if a player could carry state from
  one prototype to another (currently out of scope but possible).

### Decision rule

**Extract only what two shipped prototypes have independently imported.**
Single-use code stays where it was written. The hybrid approach is
_evidence-driven extraction_, not _speculative generalization_.

---

## Sequencing summary

1. **Now:** Ship Prototype 1, complete the n=8 playtest (T33), the
   advisory panel review (T32), and the cross-platform builds (T31).
2. **Next:** Begin P2 build. Audit imports from P1 during the P2
   build. At the end of the P2 build, perform the first extraction
   into `packages/yakshetra-core/`.
3. **Then:** P2 playtest and advisory re-review (lighter than T32 —
   the variable tested is small and the content is unchanged).
4. **After P2 ships:** Begin P3 build. Audit imports. Perform the
   second extraction cut.
5. **After P3 ships:** Decide whether P4 is worth building based on
   whether the contemplative frame has held through real-time
   pressure and spatial exploration. If yes, begin P4. If no, the
   roadmap terminates at P3 as the genre ceiling.

This sequence is a recommendation, not a commitment. The plan for each
prototype is written just-in-time before its build begins, with the
evidence from the prior prototype's playtest in hand. If the playtest
evidence from P1 (T33) recommends a different first prototype, the
roadmap adapts.

---

## Open questions deferred to just-in-time plans

- Exact tile size and art direction for P3 (pixel-art minimalist vs.
  painterly).
- Whether P3 includes any audio at all, and if so whether that audio
  is advisory-reviewed.
- The full "lenses as stances" reframe for P4 — to be designed in
  P4's just-in-time plan, not here.
- Save migration across prototypes — currently assumed out of scope.
- Localization beyond the existing i18n key set.

These questions are intentionally _not_ answered in this roadmap. The
roadmap is the shape; the just-in-time plans are the substance.
