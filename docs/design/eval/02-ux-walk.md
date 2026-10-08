# 02 — UX walk: the first fifteen minutes, played

**Seat:** dev-b2 · **Date:** 2026-10-03 · **Queue:** `qitem-20261003064257-1a124fc8`
**Scope:** read-only. No product file was created, edited, staged, committed or stashed by this
walk. Everything below was measured against the real components and the real exported build.

## What the operator asked

> the game has a shell and ideas but lacks fun, engaging, cool features — pick a distinctive
> direction and flesh it out.

The operator's read is correct, and the walk below locates it precisely: the bench is a
well-engineered, well-tested **shell** around a **six-card** reward. The play is not broken; it
is thin, and thin in a way that a player's first ten minutes will expose immediately.

## How this was measured

Two independent instruments, both read-only:

- **Rendered** — real components mounted through the repo's own `@/test/rntl` harness, in
  throwaway specs under `/tmp/b2-eval/` (never in the repo). Node counts are literally
  `container.querySelectorAll('*').length`. Covers `app/index.tsx`, `StudioView`, `TurnScreen`.
- **Read** — source and shipped `dist/` bundles read directly, plus engine-level simulation
  through the public `src/engine` API (120 real tend → develop → cook → harvest cycles).
- **First paint** — static text extracted from the already-built `dist/*.html`. No rebuild was run.

`rendered` and `read` are marked on every claim. The seeded-stream measurements use the session
seed the app itself uses (`0x5eedn`, `src/ui/hooks/useStudioSession.ts:303`).

### One correction to an earlier hypothesis

A prior note on this queue guessed the fill tables were _biased_ — that one card was being
over-selected. **That is wrong, and it is worth saying so plainly.** Measured on one long-lived
stream (the way the app actually runs), 200 sequential harvests split 40/37/33/32/30/28 across all
six thing rows: uniform. The real defect is not bias. It is that **there are only six of them**
(#2), plus a first-draw bug that makes harvest #1 identical every session (#1).

---

## The twelve gaps, ranked by what a player actually feels

### 1. Every new session's first harvest is the same card, every time

**Evidence (read + rendered).** `createRng(seed)` for any seed below 2³² populates only the low
word of the 128-bit state; xoshiro128\*\*'s first output depends on `state[1]`, which is still
zero. Measured, first draw of a fresh stream:

```
seed 24301: nextInt(0,6)=0   next()=0.000000
seed 1:     nextInt(0,6)=0   next()=0.000000
seed 42:    nextInt(0,6)=0   next()=0.000000
seed 305419896: nextInt(0,6)=0   next()=0.000000
```

The app seeds the session once with `0x5eedn` (`src/ui/hooks/useStudioSession.ts:303`) and the
first fill draws immediately. So table row 0 is always first: the rendered first bench harvest is
`thing / "Sealed token"`, always graded **Rare**. The player's reward for returning is a rerun of
the same reward they already saw. Existing RNG tests miss it by using a fully populated 128-bit
seed.

**Fix:** in `createRng`, split the seed across all four state words (e.g. splitmix-style
expansion) so the first output depends on the whole seed — one function, one test.

### 2. The core loop has a six-card ceiling, exhausted by harvest #10

**Evidence (read).** 120 real engine cycles for a tending player:

```
kind mix: thing=120
DISTINCT CARDS EVER SEEN: 6 of 45 catalog rows
  Sealed token / Second bowl / Shared cloak / Quiet instrument / Folded measure / Worn ledger
repeats of a card already held: 114/120
harvest # at which each new card first appeared: 1, 2, 3, 5, 9, 10
```

A social player does better (19 distinct persons, 101/120 repeats, exhausted by #41) but the shape
is the same. **From harvest #11 onward the player is 100% recycling.** The catalog holds 45 rows
across five kinds — six per kind for things — and the bench spends them in ten presses. Everything
after minute three is a rerun with different wording.

**Fix:** make the _tables_ the content budget — 40+ rows per kind with era- and tier-weighted
selection — before adding any new system.

### 3. The player has no decision that changes the outcome

**Evidence (read + rendered).** The bench's only free-text input, the optional brief, appends a
literal sentence and nothing else (`src/engine/manifest.ts:216-217`):

```ts
const briefNote =
  brief !== null && brief.trim().length > 0 ? ` You asked for: ${brief.trim()}.` : '';
```

Verified: no brief vs `"a quiet night at the weigh-scales"` vs `"GUANYIN blesses the granary"`
produce the same name, subject and detail. The one input that looks like authorship is an echo.
Meanwhile the market panel — the other place agency could live — opens with **0 copper** and its
cheapest options cost 3 and 4, so all three market buttons are dead on arrival.

**Fix:** make the brief a real lever — bind it to at least one selection axis (row window or
`focus`) that visibly changes the harvested card.

### 4. The bench is a 139-node flat wall on a single screen

**Evidence (rendered).** Real `StudioView`, new player: **100 visible nodes**. After one full
tend → develop → cook → harvest: **139 visible nodes**, in one flat scroll: market, journey,
milestone, charge, life, activity balance, world, archive and compendium all rendered together,
nine panel headers competing at the same weight. There is no hierarchy — the charge bar (the thing
you are actually doing) has the same visual status as the export-JSON button.

**Fix:** collapse the bench to charge + one card + one primary action, and put market, milestone,
life, balance and export behind tabs or disclosure.

### 5. What kind you harvest is decided by what you gathered, not by what you want

**Evidence (read).** 120 cycles per window shape:

```
window led by practice_tick -> kind mix: thing=120    (120/120)
window led by lens_chosen   -> kind mix: person=120   (120/120)
```

Window size does not matter either: 3, 4, 6, 8 and 12 ticks all harvest a thing. Kind variety
exists only as a side effect of which residue you collected, so the player can never _aim_ for the
people and places — the parts of the fiction the operator would call the coolest — only wait for
them.

**Fix:** give the cook a declared target ("harvest toward a person / a place / a thing") chosen at
develop time, so kind is a decision rather than a residue accident.

### 6. Harvested prose leaks build internals onto the card

**Evidence (rendered).** A real harvested card ends:

> It is year 1 in **studio-bench@0.1.0**.

That string is `lifeContext.setting.era_id` from the stand-in life
(`src/engine/manifest.ts:222-223`), and it is the final sentence of the reward the player is asked
to treasure. The developer's package identity is the last thing they read.

**Fix:** resolve the era id to its localized display name (`Late Tang China`, not
`studio-bench@0.1.0`) before it reaches `detail`.

### 7. The life panel shows a developer word as the player's identity

**Evidence (rendered).** The "This life" panel on first arrival reads:

> **operator · age 0**

The bench runs on a placeholder life with `role: 'operator'` and
`social_class: 'operator'` (`src/ui/hooks/useStudioSession.ts:279-282`,
`src/engine/studio-session-hydrate.ts:109-112`). The player never chose it, cannot change it, and
reads it under the heading _This life_.

**Fix:** omit the role line when no life is in progress and show the era and chapter instead.

### 8. First paint is either a bare promise or a loading gate

**Evidence (read, from the built `dist/`).** Static first paint, text lines actually in the HTML:

| Route                 | First paint                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | 10 lines — "Work a day. The residue cooks. A world takes shape." / "Go work a day" / "Back to work" / "Manifest" / "Settings" |
| `studio.html`         | **1 line — "Opening the bench…"**                                                                                             |
| `life/start.html`     | **1 line — "Loading the era…"**                                                                                               |
| `bardo.html`          | 7 lines, real content                                                                                                         |
| `chain-complete.html` | **1 line — "Reading the chain…"**                                                                                             |

The two screens a player is sent to are blank-but-for-a-spinner on arrival, and the home screen
opens with two competing primary actions ("Go work a day" _and_ "Back to work") instead of one.
Home also has six visible nodes total: no sense of an existing world, no archive, no teaser of
what the game becomes.

**Fix:** pick one home CTA, and give the studio route a skeleton frame at export time so arrival
shows the bench shape, not a spinner.

### 9. The one reward animation cannot move

**Evidence (read).** `src/ui/components/StudioJuice.tsx` renders five glyphs
(`✦ ✧ ❋ ◆ ◇`) at fixed `left: 18 + slot*14`% positions inside a static `View`. There is no
`Animated`, no timing, no re-render per frame — the file is 42 lines and contains no animation API.
The header comment says "glyphs that fly from the tend button toward the residue bar." **Nothing
flies.** The reward moment of the entire core loop is five stationary characters.

**Fix:** drive `StudioJuice` with `Animated.timing` toward the residue bar, or delete it and spend
the budget on a card-reveal transition.

### 10. Life's first read is two zeros, then an unexplained six-way pick

**Evidence (rendered).** `TurnScreen`, turn 1, 32 visible nodes:

```
Turn 0   Age 0   Lens: none
Where you stand
Late Tang China — Peasant farmer
0 years old
No ongoing situations · No lens chosen yet
Resources: time 100 / energy 100 / provisions 50 / trust 10 / skill 0 / obligation 0
Ties: No ties yet
Choose your lens — "Focus through one of the six parami."
  Generosity · Careful Conduct · Patient Courage · Joyful Effort · Collected Attention · Discernment
```

A player's opening frame is two zeros, four empty states, and the game's first real decision
presented as bare sect jargon with no indication of what any lens changes. The screen is also the
only calm screen in the game (32 nodes vs 100) — which shows the bench is the anomaly, not the norm.

**Fix:** lead with the situation rather than the counters, and give each lens one line of
consequence ("Generosity: raises trust, costs provisions").

### 11. The emotional peak of the game is an empty state on a first run

**Evidence (read, from `dist/bardo.html`).** The bardo's "What carried forward" panel renders:

> **No echoes were detected. The next life begins unburdened.**

That is the correct description of a new save, delivered at the game's most significant moment, in
the tone of a system message. A first-time player is told, at the moment that should feel
consequential, that nothing happened to them.

**Fix:** branch the empty case — first run gets an authored beat about what death leaves; a real
echo list keeps the current copy.

### 12. The game narrates its own rules as odds tables and checklists

**Evidence (rendered).** Verbatim from the first-paint bench:

> Choose your pace: tending gathers experiences; a market shift earns copper over 8 steps.
> **Every shift pays 1 copper. A small tip adds 2 (25%); a generous tip adds 5 (5%). No tip: 70%.**
> To grow — World drafts assembled: 0 (at least 1) · Archived discoveries: Person: 0 (at least 3)
> Harvest 3 more to unlock a deeper fill. · First harvest: Not yet · First world: Not yet

The tip _probabilities_ are the most specific text on the opening screen, stated before the player
has earned a single copper. Progress is expressed as unmet requirements and "Not yet" rows. The
tone of the fiction and the tone of the interface are two different products.

**Fix:** move probabilities behind a help affordance, and render milestones and compendium rows
as forward-looking prose ("what a household needs") rather than counters at zero.

---

## What this walk does not claim

- No visual/aesthetic judgement. Headless screenshots were captured but not inspected; every
  visual claim above is from the rendered text/node tree, not from pixels.
- No full two-life click-through in a browser. Route behaviour is evidenced by component renders
  and the static build; a real session may reorder priorities, though nothing observed here is
  screen-specific.
- `dist/` reflects the current working tree, which includes uncommitted work from a prior task in
  this seat. The report describes the tree as it stands, which is the tree under evaluation.

## Direction, in one paragraph

The distinctive thing this project already has is that **effort becomes a named object**. That is
rare and it is good. It is currently undercut in three ways: the object pool is six deep (#2), the
object is chosen for you (#3, #5), and the object talks about the build rather than the world
(#6, #7). The cheapest large win is content and copy inside the existing system — 40+ rows per
kind, a declared harvest target, and one real brief lever — followed by giving the bench a
hierarchy so the card is the screen. #1 is a one-function fix that pays off on literally the first
harvest of every session, and should go first regardless.

## Reproducing

Throwaway harness, outside the repo: `/tmp/b2-eval/` (`06-live-variety.test.ts` for the stream
and seed measurements, `07-sim.test.ts` for the 120-cycle runs, `08-brief.test.ts` for the brief,
`09-life.test.tsx` for `TurnScreen`, `02-studio.test.tsx` for the bench renders). Run against the
repo with:

```bash
pnpm exec vitest run --config /tmp/b2-eval/vitest.config.ts /tmp/b2-eval/07-sim.test.ts
```
