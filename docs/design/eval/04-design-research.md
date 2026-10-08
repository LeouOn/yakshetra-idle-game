# 04 — Design research: what makes this genre sticky, mapped to Yakshetra

**Seat:** dev-b4 · **Date:** 2026-10-03 · **Queue:** `qitem-20261003064300-af245916`
**Scope:** read-only on product code. No file under `src/`, `app/`, `scripts/`, `package.json`,
`SPEC.md`, `AGENTS.md` was created, edited, staged, committed or stashed. This report is the only
artifact written. `pnpm check` / `expo export` were not run (per lane rules); no tests were run
because no product behavior changed.

## How this was measured

- **Code** — every number below was read out of the working tree on 2026-10-03, with `file:line`
  cited (Appendix A). The tree carries uncommitted peer work and peers kept landing while this
  lane ran (~1.2k lines changed mid-session); all anchors were re-based against the tree as it
  stood at report close, and small drift after that is expected. Nothing here depends on those
  diffs being committed or reverted.
- **Web** — sources fetched live via `curl` (Wikipedia REST/API, live sites) or via the Internet
  Archive Wayback Machine where the live site blocks bots. URL + publication date + access date
  (2026-10-03) given per source (Appendix B). **No browser was available**; no claim below rests on
  having _played_ any cited game this session, and none rests on screenshots.
- **Not verified this session:** `kittensgame.com` / `bloodrizer.ru` were unreachable (404/301), so
  Kittens Game is cited only where its behavior is corroborated by a fetched secondary source, and
  marked otherwise. I did not play Yakshetra in a browser; behavioral claims about _Yakshetra_ come
  from code and from sibling lane b2's rendered-component walk (`02-ux-walk.md`), which is cited as
  their evidence, not mine.

---

## 0. TL;DR

1. The genre's retention engines are: a **cost/production seesaw with a steady unlock rhythm**, a
   **reveal cadence** (fiction changes as numbers grow), **active beats** layered on idle time,
   **pity/near-miss structure** around variable rewards, **discovery by recipe**, and **prestige or
   completion ledgers that change play rather than reset it**. Yakshetra has none of these running:
   its reward pool is 5–8 verbatim cards per kind, its rarity roll changes a label and not a card,
   and between "tend" and "harvest" the player makes zero decisions (§2).
2. The lead's diagnosis is directionally right and numerically slightly off in the player's favor
   _against_ the game: not "~6 cards per kind," but generic pools of **6/6/5/8/6** plus **14
   named-figure rows of which only 3 are reachable through play** (§2.1–2.2). By pigeonhole, the
   6th `change` harvest always repeats a card name verbatim; 72% of the time a repeat happens within
   4 harvests of one kind (§2.3).
3. The idle contract is inverted: active auto-run grants a tick every **4 s**, offline accrues
   1 tick/**60 s** — the entire 240-tick away cap is earned by **16 minutes of watching** (§2.5).
4. Four candidate signature mechanics follow (§3), all inside the SPEC §10 fences, none requiring a
   second bay or a new family: **A. composed cards** (the bench writes cards _from_ the life),
   **B. the cook is a hand** (window curation + cook length as the missing decision), **C. sought
   encounters** (recipe pins that unlock the 11 dead figure rows), **D. the chronicle** (the world
   draft reads the lives back). Recommendation: **B first, A on the same seam**, minimum slice in §4.

---

## Part 1 — Mechanisms, not genres

### 1.1 The seesaw and the unlock rhythm

The canonical model (Pecorella, _The Math of Idle Games, Part I_, Game Developer, 2016-10-13):
production grows polynomially, costs exponentially; the player lives on the seesaw between them.
Two retention-relevant details:

- **Multipliers key off ownership milestones** (AdVenture Capitalist's ×2 at 25 and 50 of a
  generator), which produces visible purchase spikes — the player _plans_ around them. "You can see
  the expected spikes in purchases right around 25 and 50 multipliers kicking in, since those are
  temporarily overvalued."
- **Multiple generators create the choice.** With one track there is nothing to decide; the article's
  own caution: "the newest generator is nearly always dominant once it can be purchased… That's not
  very interesting for the player. It means older generators are largely irrelevant and removes any
  interesting decisions."

**Mapped to Yakshetra:** there is exactly one spend decision (which window to cook, and the free-text
brief), one generator (the embodied bench), and no ownership milestones that change production
mid-run. The endowment/visitor modifiers exist but are thresholds over the _archive_, i.e. over
harvests already ground out — they arrive after the seesaw would have mattered. Cookie Clicker's
24-hour **sugar lumps** (Wikipedia, accessed 2026-10-03) are the appointment-scheduling version of
the same idea: something to come back for on a clock.

### 1.2 Reveal as the reward

- **A Dark Room** (Doublespeak, 2013) is the minimal proof: the fiction itself is the progression —
  "a dark room" becomes a fire, a village, a trading post, a "dusty path," and eventually a space
  program; the prequel _The Ensign_ exists because players wanted _more world_, not more numbers
  (Wikipedia, accessed 2026-10-03).
- **Cookie Clicker** "gradually shifts to themes of cosmic horror" as production grows exponential
  (Wikipedia, accessed 2026-10-03) — the grandmapocalypse is a reveal keyed to _scale_, not to a
  level number.
- **Universal Paperclips** (Lantz, 2017) formalizes it: "at various levels the exponential growth
  plateaus, requiring the user to invest resources… into inventing another breakthrough to move to
  the next phase of growth" (Wikipedia, accessed 2026-10-03). Phases _change the verbs_: sell
  paperclips → manage raw materials → hypnodrones → probes → combat → ending.

**Mapped:** Yakshetra's fiction is static per scale. A household cook and a region cook read
identically except for a `scale` enum the card never voices; the eight-tier ladder (SPEC §1.1)
changes _where_ residue comes from but not _what a harvest feels like_. The reveal engine the spec
already owns — kind rules, era, ties, hour — never reaches the card text (§2.6).

### 1.3 Active beats on an idle canvas

Cookie Clicker's **golden cookies** appear at random, fade in seconds, and pay production spikes if
clicked (Wikipedia, accessed 2026-10-03): a near-miss structure (they expire!) that converts idle
attention into a skill of _attending_. **Wrinklers** invert it — pests that reduce production but
repay with interest when popped: a risk/reward decision living inside a numbers game. **Dave the
Diver** (Mintrocket, 2023) runs a two-verb loop — dive by day, run the restaurant by night
(Wikipedia, accessed 2026-10-03) — so the "idle" half (management) is textured by an active half
that shares the same economy.

**Mapped:** the only active beats are _tend_ (a tap that grants 8 ticks, `operations.ts:31`) and
market shifts (SPEC §17, explicit work for copper). Tend has no timing tension: the button is
always worth pressing whenever lit. Nothing expires, nothing is missed by looking away — which is
also why looking away pays 15× worse (§2.5).

### 1.4 Near-miss, pity, and the completion ledger

The gacha world has industrialized variable-reward fairness (Wikipedia, _Gacha game_ §Pity system,
accessed 2026-10-03): **soft pity** (rate rises past a threshold), **hard pity** (guarantee after N),
**sparking** (currency per pull, redeem the target), **50/50** (lose the coin, next one is
guaranteed). The design point is not monetization — it is _goal-directed variance_: the player can
name what they want and see measurable progress toward it. **Melvor Idle** is the counterproof that
you can keep players for years with zero prestige restarts by making the _completion ledger_ the
goal: "a fairly feature-rich idle game… a lot of things to craft and progress, as well as an
emphasis on zero prestige mechanics requiring a game restart" — enough that Jagex signed it as
publisher a year after its Steam early access (PC Gamer, Jonathan Bolding, 2021-10-24, accessed
2026-10-03). Cookie Clicker's **shadow achievements** and milk-color tiers are the same ledger in a
prestige game.

**Mapped:** Yakshetra's rarity roll (`manifest.ts:110-119`: rare 8%→18% at quality tier 1,
uncommon 22%→42% at window ≥6) is pure variance with no target, no pity, and no ledger — the roll
changes the `rarity` _field_ while `name`/`one_liner`/`detail` stay verbatim from the pool, so a
"rare" card can be textually identical to a common one the player already holds. The compendium
(5 rows) and milestones (14 rows) are the only ledgers, and both are archive-_count_ predicates:
grind N, unlock — no named targets the player can steer toward.

### 1.5 Discovery by recipe

**Cultist Simulator** (Weather Factory, 2018) is a "card-based simulation" (Wikipedia, accessed
2026-10-03) whose whole engine is combinatorial: place card X in verb Y and the _combination_ is the
content, and much of it is undiscovered until tried. This is discovery-by-recipe — the player
authors experiments, and the game answers with cards/verbs they have never seen. The repo already
contains a dormant precedent: visitor `table_ref` swaps swap in **"entries [that] use names that
NEVER appear in the per-kind tables, so a…"** discovery flourish (verbatim comment,
`src/content/progression/base/catalogs.json5:1103-1111`, quote at `:1108`; swap path `src/engine/visitors.ts:139-168`).

**Mapped:** no combination surface exists. Pinning is a single toggle (`focus.ts:33-40`), the brief
is free text that only appends "You asked for: …" to `detail` (`manifest.ts:216`), and two cards in
the archive never interact.

### 1.6 Prestige that changes the game vs. prestige that resets numbers

Pecorella, _Part III_ (Game Developer, 2017-02-01, accessed 2026-10-03): prestige serves two
purposes — the "ladder climbing" effect (reset with a boost, "a sense of power and progress") and
reining numbers into a stable range. The interesting axis for Yakshetra is _what survives_: Cookie
Clicker's ascension buys **heavenly-chip upgrades that are new mechanics** (minigames unlocked via
sugar lumps; prestige upgrades tree; Wikipedia, accessed 2026-10-03), not merely bigger multipliers.
Melvor shows the other pole: no resets at all, retention via breadth + the ledger.

**Mapped:** Yakshetra has already chosen — correctly, for its fiction — the _no-reset_ pole: "The
archive — pinned Manifests and world drafts — is the only proof of progress. Nothing is spent"
(SPEC §1.1). But the archive-**as**-prestige needs the archive to _change play_, and today pins
change one sentence of `subject`/`detail` (focus notes, `manifest.ts:195,217`), not what can be
harvested. The ladder's graduation ceremonies and fold-up residue are structural prestige without a
felt payoff in the card.

### 1.7 Generated text that carries memory

**Dwarf Fortress** "set in a detailed, procedurally generated fantasy world with randomized
creatures, NPCs, and history" (Wikipedia, accessed 2026-10-03) is the extreme: the artifact is a
_story that only your world can tell_, which is why a fortress log is shareable and a spreadsheet
is not. A Dark Room gets the same effect with 1% of the machinery by making every sentence arrive
at the moment it describes. Kittens Game is commonly credited with the same trick at idle cadence
(long-form event text that references prior state); **not verified this session** — its sites were
unreachable.

**Mapped:** this is the gap between Yakshetra's _data_ and its _cards_. Every Manifest already
carries `residue_window_id`, `brief`, `rng_seed`, provenance (`manifest.ts:58-83`), and the fill
request already receives a `LifeContext` with era, year/hour, ties, activity totals
(`life-context.ts:190-221`) — the memory is all there. The table compiler uses almost none of it:
`detail` is `entry.detail` plus template notes ("It is year {Y} in {era}." / "Closest tie: {t}.",
`manifest.ts:219-224`), and `subject` gets a parenthesized id suffix (`manifest.ts:194-203`). The
window's ids, counts, hour, and dominant practice never change a card's nouns or verbs.

### 1.8 The archive as spectacle / the emotional close

**Spiritfarer** (Thunder Lotus, 2020) retains because the loop's output is a _relationship ledger
with an ending_: you farm/cook/manage so you can _say goodbye_ to named spirits (Wikipedia, accessed
2026-10-03). The spectacle is the archive of farewells. Dwarf Fortress's player stories (and MoMA
acquisition, Wikipedia, accessed 2026-10-03) are the emergent-text version of the same: the archive
is the shareable object.

**Mapped:** the world draft (`world-draft.ts:74-116`) is the intended Yakshetra answer and it is
currently one template deep: `name` = the first place card's name, `one_liner` = one of two
sentences ("{Person} keeps returning to {Place}." / fallbacks), `bonds` = `about_id` pairs. It is a
valid schema wrapped around a birthday-card generator. Nothing in it can be _shown_ to someone and
recognized as the life the player lived.

### Mechanism scorecard

| Mechanism                     | Genre evidence                                               | Yakshetra today                                        |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Seesaw + unlock rhythm        | Pecorella I (2016)                                           | absent — no spend pacing, no ownership milestones      |
| Reveal keyed to scale         | Paperclips, Cookie Clicker, A Dark Room                      | absent — card text scale-blind                         |
| Active beats / timing tension | golden cookies, wrinklers, Dave the Diver                    | tend is a flat tap; nothing expires                    |
| Pity / named-target variance  | Gacha §Pity (WP), shadow achievements                        | rarity changes a label, not a card; no targets         |
| Discovery by recipe           | Cultist Simulator; in-repo visitor tables                    | none; pin is a toggle, brief is an echo                |
| Prestige that changes play    | Pecorella III; Cookie Clicker ascension; Melvor counterproof | archive chosen as prestige but doesn't change harvests |
| Text that carries memory      | Dwarf Fortress, A Dark Room                                  | memory collected (`LifeContext`) then mostly ignored   |
| Archive as spectacle          | Spiritfarer                                                  | world draft = 2 templates                              |

---

## Part 2 — Testing the lead's diagnosis

Working diagnosis under test: _"wide scaffold (8 tiers, endowments, visitors, compendium, 14
milestones) on a very thin core… fixed tables of ~6 cards per kind… a cook takes 4–12 ticks and one
tend is 8 ticks, and the player makes almost no decisions between 'tend' and 'harvest'."_

### 2.1 Confirmed, with exact numbers

- Generic pools: **THINGS 6** (`manifest-catalog.ts:15`), **OUTCOMES 6** (`:72`), **CHANGES 5**
  (`:129`), **PEOPLE 8** (`:177`), **PLACES 6** (`:248`) — lead said PEOPLE 8 / CHANGES 5 / PLACES 6
  / OUTCOMES 6 / THINGS 6: exact.
- Cook length: `cookTicksFor = 4 + min(window, 8)` → **4–12 ticks** (`operations.ts:110-113`). One
  tend = **8 ticks** (`operations.ts:31`). Minimum window **3** events (`operations.ts:25`).
- Ladder width: **8 tiers**, **14 milestones**, **6 visitors**, compendium **5 rows**
  (`src/content/progression/base/`, counted 2026-10-03).
- "Almost no decisions between tend and harvest" — confirmed and sharpened in §2.4.

### 2.2 Correction 1 — the named-figure content is 77% dead

The catalog ships **14 named-figure rows** (12 people `manifest-catalog-figures.ts:25`, 2 places
`:136`), and `figureCandidates` fires only when a residue window carries one of the row's tags
(`manifest.ts:142-160`). Normal play emits only practice ids, choice ids, lens ids
(`reducer.ts:199-215`, `residue.ts`), and exactly **three** figure rows carry a practice-id tag:
Amitābha ← `practice:tang/nianfo-recitation` (`:41`), Medicine Buddha ←
`practice:tang/medicine-rite` (`:49-54`), Guanyin ← `practice:tang/six-syllable-recitation`
(`:78-82`). **The other 11 rows — Śākyamuni, Vairocana, Maitreya, Mañjuśrī, Samantabhadra,
Kṣitigarbha, Mahāsthāmaprāpta, Nāgārjuna, Bodhidharma, and both figure places (Wutai, the Kṣitigarbha
mountain) — cannot be harvested from any window the game can produce.** They are dead weight in
every `rng.pick` (they _are_ in the `person`/`place` pools via `CATALOG`, `manifest-catalog.ts:309-310`,
so they dilute the generic pools while being unreachable as figures). This also means the spec's own
"Done when" for §16.1 — "a cooked window whose residue mentions `figure:avalokiteshvara` … harvests a
card named for Guanyin" — holds only for the 3 mantra-bound figures, and no Tang event or practice
puts a bare `figure:*` id into residue.

### 2.3 Correction 2 — verbatim repeats are a mathematical certainty, not a tendency

Entry pick is uniform `rng.pick(entries)` with no memory of the archive (`manifest.ts:190`; uniform
pick interface `types.ts:39`) and `tableFillManifest` receives no archive at all (`manifest.ts:162`).
Therefore, per kind:

- `change`: pool 5 → **any 6 `change` harvests must repeat a name verbatim** (pigeonhole). P(a
  repeat within 4) = 1 − (5·4·3·2)/5⁴ = **84%**.
- `thing`: pool 6 → P(a repeat within 4) = 1 − (6·5·4·3)/6⁴ = **72%**; certainty by the 7th.
- `person` (generic, no figure tag in window): pool 8 → P(repeat within 4) ≈ **59%**.

Early sessions are `thing`-heavy: tend windows are `practice_tick`-dominant, which the registry maps
to `thing` (`kind-registry.ts:101`). With active auto-run at one tick per **4 s**
(`StudioView.tsx:170,573-576`), a cook of 4–12 ticks is 16–48 s, i.e. roughly **one card per
half-minute of active play** — the player has seen the entire THINGS pool before the first quality
upgrade unlocks (3 harvests, `operations.ts:28`), and the "rare" roll on the 4th card re-prints the
1st card's exact text with a different color chip. The repeat is not softened by any composition:
`one_liner` and `detail` are the table row verbatim (`manifest.ts:234-237`).

### 2.4 Sharpening — the real decision inventory

Between queuing a cook and harvesting it, the player can do exactly nothing. The full decision
surface today: lens choice (life screen, affects which events surface, `app/life/[lifeId].tsx:120-125`),
brief free text (echoed into `detail`, `manifest.ts:216`), tend/auto-run, pin toggle
(`StudioView.tsx:829-830`), quality deepen after 3 harvests (one-shot, `operations.ts:237-242` —
`quality_tier` caps at 1 and never rises again), market shift / tea / supplies (copper economy,
`market.ts:8-9,34`: 70%/25%/5% tip split), endowment picks, export. The **kind** of the next card —
the single most interesting output — is computed (`kind-registry.ts:90-102`) but **never previewed**,
and the player's only lever over it is implicit (which practices ran), not visible at cook time.
Note also that `cookTicksFor` _rewards small windows_ (4 + min(len,8): more residue = longer cook for
the same one card), so the one numeric choice — how much to bank — currently has a strictly dominant
answer: cook the minimum-3 window every time.

### 2.5 Correction 3 — the idle contract is inverted

Offline: 1 tick = **60 s** real, catch-up capped at **240 ticks** (`studio-offline.ts:24,27`) = 4 h
away. Active auto-run: 1 tick per **4 s** (`StudioView.tsx:170`). So watching the screen accrues
ticks **15× faster** than leaving, and the _entire daily away cap equals 16 minutes of active
watching_. Classic idle design pays offline ≈ online (or a large fraction) precisely so returning is
a joy; here returning after a day yields what a coffee break yields, and the away-cap toast
routinely tells the player how little they earned. (Sibling lane b2 rendered the away screen; see
`02-ux-walk.md` for the UX half of this.)

### 2.6 Where the diagnosis under-sells the assets

Two things the "thin core" framing misses, both load-bearing for §3: (1) the **fill request already
carries the life** — `LifeContext` with era/year/hour, ranked ties, activity totals, world name
(`life-context.ts:190-221`) is handed to every filler and used for two template sentences; (2) the
**schema is already wide enough for authored variance** — `about_id`/`about_name`, `tags` from
focus/brief/activity (`manifest.ts:202-214`) all exist. The engine collects memory and spends it on
suffixes. That is why the fixes below are composition and decision work, not new systems.

---

## Part 3 — Four candidate signature mechanics

All four: no second bay, no new family, no new pack (SPEC §10.15); engine stays pure and sync;
schema harvest and table fallback intact; no karma/merit/donation-offset ops (lint rules stay); no
`Date`/`Math.random`/`fetch` in `src/engine`. None requires a fence lifted — each notes its
watch-items.

### A. Composed cards — the bench writes from the life

**Player-facing (3 sentences).** Every harvest card is _about the window that made it_: "A stamped
granary token, sealed at the hour of the monkey after nine days at the weigh-scales; the clerk's
mark is crooked because you were steadying the beam for Old Wei." Two cooks of the same table row
never read alike, because nouns (hour, era, tie names, dominant practice, counts) come from the
residue summary and life context the compiler already receives. The archive becomes a stack of
sentences only this life could have produced.

**The decision.** None new — this is the payoff layer for decisions the player already makes
(practices, lens, ties, brief). It converts existing hidden state into visible variety.

**Engine/schema/UI.** New pure module `src/engine/card-composer.ts` (~150 lines): a
`compose(entry, summary, lifeContext, focus, rng) → {name, one_liner, subject, detail}` that fills
authored slot templates (5–8 per kind, stored as data beside the catalog rows — tags-like metadata
on `CatalogEntry` in `src/engine/table-catalog.ts` + `manifest-catalog.ts`, no schema change to
`Manifest`). `tableFillManifest` (`manifest.ts:162`) calls it instead of copying `entry.detail`
verbatim; `fill-adapter.ts` needs no change (same Manifest shape out). Model fillers get the same
slots in their prompt (§16.2 path) so table and model converge. UI: none required beyond the
existing card view; SIDs unchanged (cards are data, not SIDs — same as today). Tests:
`src/engine/__tests__/card-composer.test.ts` — distinct-text rate over simulated windows, purity
(only injected rng/inputs), determinism (same inputs ⇒ same card).

**Size.** 4–6 builder-days (2 days engine + 2 days copy templates + 1–2 days tests/polish).

**Risk.** Medium. Template prose can read as slot salad; mitigation is few, good templates per kind
(quality over combinatorics, per SPEC's own copy bar) and a dedup guard (composer may not emit a
detail string already in the archive when an alternative template fits). No fence risk: the
compiler writing sentences is the spec's design ("Prose is compiled, not logged", SPEC §7).

**Measure.** Simulate 50 diverse windows → % distinct `detail` strings (target ≥ 90%, vs today's
~2 variants per row); playtest: pin rate per harvest (does the card feel worth keeping?); zero
change to harvest failure/fallback rate (table path must stay green in `fill-adapter` tests).

### B. The cook is a hand — curation and stakes at queue time

**Player-facing (3 sentences).** Pressing "Begin a working" opens the window like a hand of cards:
each residue chip (practice, event, lens) is visible, the _predicted kind_ is named ("these traces
want to become a **person**"), and two or three chips can be held back for the next cook. You also
choose the cook: a short fire (fast, common floor) or a long fire (more ticks — and a rising rarity
floor plus first-call on figure rows whose chips are present). The kind you were steering for is no
longer a surprise you read after the fact; it is a bet you placed.

**The decision.** Which events to spend now vs bank; short vs long fire; whether to chase a person
window (≥2 distinct ids + engagement marker, `kind-registry.ts:33-40`) by holding back a lone
practice. This is the missing decision _at_ the tend→harvest seam, and it uses only rules the
engine already computes.

**Engine/schema/UI.** `operations.ts`: `queueDevelop` already takes `opts` (`:134-170`) — extend
`DevelopOperation` with `window_slice: number[]` (indices into the spent window; held-back events
return to pending) and `fire: 'short' | 'long'` (long adds ticks and a rarity floor parameter into
the fill request). `fill-adapter.ts`: pass `fire` through `ManifestCompileRequest` (additive,
versioned `manifest_compile/v2` — request-only, `Manifest` schema unchanged; `pickRarity` gains a
floor argument, `manifest.ts:110`). `kind-registry.ts`: export the already-pure predicted-kind
preview (it exists: `pickKindFromRegistry`). UI: `StudioView.tsx` develop panel (`:1111-1114`)
becomes a modal (chips + predicted kind + fire choice), SIDs in `src/i18n/en.json`; receipts
already exist (`market_cook_receipt_sid`). Tests: `operations.test.ts` (banking round-trips events;
fire changes ticks and floor), `manifest.test.ts` (floor ordering common < uncommon < rare).

**Size.** 5–8 builder-days.

**Risk.** Medium-high — the only candidate that adds a persistent field to a persisted operation
(`DevelopOperation` lives in `studio_session/v1`; additive optional field with zod default, no
migration needed for old saves since absent = short/no slice). Watch-item: rarity floor must stay a
_roll modifier_, never a spendable "merit" (R-NO-PRACTICE-AS-CURRENCY stays green; it is the same
class as the existing `quality_tier` bump).

**Measure.** % of cooks where the player adjusts the window or picks long fire (target > 50% —
today's baseline is 0%); banked-event recycle rate; session length and cooks/session in
`studio_session` stats; pin rate.

### C. Sought encounters — recipe pins that unlock dead figures

**Player-facing (3 sentences).** Pinning stops being a toggle and becomes a _summons_: pin Guanyin's
practice card together with a river place, cook a window of six-syllable recitation, and the harvest
comes back as Guanyin _at that landing stage_ — a card that exists in no generic pool. The
compendium gains a "Sought" page listing encounters by their recipe (person + place + window
family), undiscovered ones shown as silhouettes with their recipe hinted. Eleven figures who
currently cannot appear at all become the game's named long-term goals.

**The decision.** Which encounter to pursue (pins + window composition), i.e. the named-target
variance + recipe discovery of §1.4–1.5, using only cards the player already holds.

**Engine/schema/UI.** `focus.ts`: extend `ManifestFocus` to a 1–2 card focus (additive optional
`second` field; `nextPinned` becomes a small state machine, still pure). New pure module
`src/engine/encounters.ts` (~120 lines): table of `{ figure_id, needs: {card_kinds, residue_token},
row_ref }` matching against (pinned pair, window summary) — on match, `tableFillManifest` prefers
that figure row (the `figureCandidates` mechanism already does preference-matching,
`manifest.ts:142-160`; encounters just widen what counts as a candidate). Content: bind the 11 dead
rows in `manifest-catalog-figures.ts` to recipes (data beside the rows or in
`src/content/progression/base/catalogs.json5`); NO new rows needed — this is reachability for
authored content, not width. `compendium.ts`: encounter rows are a new predicate kind (schema
additive). UI: pin-two interaction in the archive panel (`StudioView.tsx:1198`), "Sought" list
in the compendium view, SIDs added before any row (repo rule). Tests:
`src/engine/__tests__/encounters.test.ts` — every authored recipe is satisfiable by a legal window;
no encounter fires from an unmatched window; determinism.

**Size.** 6–9 builder-days.

**Risk.** Medium — authoring cost of 11 recipes + their hint copy; combinatorial testing. Fences:
fine (seeded rng only, no new currency; figures already allowed content per SPEC §16.1). Watch-item:
"quality before width" — this adds _reachability_, not new card rows; say so in the PR.

**Measure.** # distinct encounters harvested in the first N sessions (target: a new player triggers
≥1 within 30 min); % of sessions that experiment with pin pairs; compendium completion attempts;
D1/D7 return (the ledger effect).

### D. The chronicle — a world that reads the lives back

**Player-facing (3 sentences).** The world draft stops being two sentences and becomes a compiled
gazetteer: each harvest appends a dated entry — "In the year 24 of the Kaiyuan era, at the hour of
the dog, a sealed token was drawn from nine days at the scales; Old Wei was near" — assembled from
provenance, residue summary, and tie data the Manifest already stores. Places carry their visitors,
people carry their haunts, and the graduation ceremony reads three entries aloud as the tier's
history. Export becomes shareable: the chronicle _is_ the artifact someone would post.

**The decision.** None new — this is the retention/payoff layer that makes A–C worth collecting
(the Spiritfarer close, §1.8).

**Engine/schema/UI.** New pure module `src/engine/chronicle.ts` (~150 lines): `buildChronicle(archive,
lifeContext) → readonly ChronicleEntry[]` compiled from fields already on every card
(`residue_window_id`, `brief`, `about_id`, provenance, `quality_tier`, `manifest.ts:58-83`) — no new
data collection; `world-draft.ts` gains a `chronicle` field (additive optional, zod-defaulted;
`WorldDraftSchema` stays strict-parseable for old drafts). UI: world/graduation surfaces
(`StudioView.tsx:1261+`, world panel), entries rendered as the studio-themed scroll; SIDs for
chrome, entries are data strings (card-register, not SIDs — same as card text today). Tests:
`src/engine/__tests__/chronicle.test.ts` — determinism, monotonic dating, no lecturing-tone tokens
(banned-phrase lint over authored template fragments).

**Size.** 4–6 builder-days.

**Risk.** Low-medium — template quality again (shared with A: build A's composer first and D reuses
it); watch-item: fence 12 (no moral grade) — entries state what happened, never what it _meant_;
the banned-phrase test enforces it mechanically.

**Measure.** World-draft page dwell (instrumented counters already exist in session stats);
graduation ceremony completion rate; export/share click rate (today: `exportLatest` exists but the
draft gives ~2 sentences to share).

---

## 4. Ranked recommendation and the minimum slice

**Ranking:** **B > A > C > D.**

- **B first** because it repairs the loop itself: the genre evidence is unambiguous that decisions
  and stakes _at the moment of spend_ are the engine of engagement (Pecorella I's generator-choice
  point, §1.1; active beats, §1.3), and Yakshetra's spend moment is currently a confirmation click.
  Every other investment compounds on a loop players actually engage with.
- **A immediately beside it** because B without A makes the _reward_ end of the bet flat (a "rare,
  long-fired" card that reads verbatim like the common one breaks the promise the mechanic just
  made), and because A is the identity move — "no two harvests read alike" is the sentence that
  makes Yakshetra not a generic idle game. A and B touch the same seam (`manifest.ts` +
  `fill-adapter.ts`) and should ship as one wave.
- **C next**: it is the retention arc (named targets + ledger, §1.4) and it fixes the measured
  dead-content defect (§2.2) with authored data, not new systems.
- **D last**: real emotional payoff, but it pays off _A_ — chronicle entries are only as good as the
  composed sentences they aggregate. Ship D on top of A's composer.

**Minimum slice that proves the best one (B, with A's floor):**

1. Predicted-kind preview at the develop button (engine export exists: `pickKindFromRegistry`; UI
   text + one SID). — ~0.5 day
2. Hold-back: allow excluding up to 2 chips from the window; excluded events return to pending
   (`queueDevelop` `window_slice`; receipts already narrate residue counts). — ~1.5 days
3. Long fire: `fire: 'short' | 'long'` — long adds +4 ticks and raises the rarity floor to
   uncommon; a figure row present in the window gets first call on long fires. — ~1.5 days
4. Composer floor from A: hour + dominant-practice + one tie name interpolated into `detail` (3
   templates/kind) so the long-fire card visibly differs from the short-fire one. — ~1.5 days
5. Tests beside the modules (`operations`, `card-composer`), plus a simulated-50-window distinctness
   check; run `pnpm exec vitest run src/engine/__tests__` only (full `pnpm check` deferred per lane
   rules — no dist/ rewrite under other readers).

Total ≈ **5 builder-days**. Success = >50% of cooks use hold-back or long fire; ≥90% distinct
details in simulation; table fallback and purity suites stay green; no `studio_session` migration
(additive optional fields only).

---

## Appendix A — evidence index (code, working tree 2026-10-03)

| Claim                                                  | Evidence                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| generic pools 6/6/5/8/6                                | `src/engine/manifest-catalog.ts:15,72,129,177,248`                                                                                                    |
| 14 figure rows, 12+2                                   | `src/engine/manifest-catalog-figures.ts:25,136`; merged at `manifest-catalog.ts:309-310`                                                              |
| only 3 figure rows reachable (practice-tagged)         | `manifest-catalog-figures.ts:41,49-54,78-82`; matching rule `manifest.ts:142-160`; residue emits only practice/choice/lens ids — `reducer.ts:199-215` |
| uniform pick, no dedup, no archive knowledge           | `manifest.ts:190` (+ `:185` figure path), `types.ts:39`, `tableFillManifest` signature `manifest.ts:162-172`                                          |
| repeat probabilities                                   | arithmetic on pool sizes above (§2.3)                                                                                                                 |
| rarity roll 8/18% rare, 22/42% uncommon; label-only    | `manifest.ts:110-119`; `name/one_liner/detail` copied verbatim `manifest.ts:234-237`                                                                  |
| detail = row text + template notes                     | `manifest.ts:216-224` ("You asked for:", "It is year…", "Closest tie:")                                                                               |
| subject suffix decoration                              | `manifest.ts:194-203`                                                                                                                                 |
| kind rules incl. thing-dominant early game             | `kind-registry.ts:90-102`; social/spatial defs `:33-48`                                                                                               |
| cook 4–12 ticks; tend 8; min window 3; quality 3→cap 1 | `operations.ts:110-113,:31,:25,:28,:237-242`                                                                                                          |
| small-window dominance (cook cost of banking)          | `cookTicksFor` `operations.ts:110-113`                                                                                                                |
| offline 60 s/tick, cap 240; auto-run 4 s/tick          | `studio-offline.ts:24,27`; `StudioView.tsx:170,573-576`                                                                                               |
| away cap = 16 min of watching                          | 240 × 4 s (arithmetic, §2.5)                                                                                                                          |
| pin is single toggle                                   | `focus.ts:33-40`; UI `StudioView.tsx:829-830,1198`                                                                                                    |
| brief only echoes                                      | `StudioView.tsx:426,583`; `manifest.ts:216`                                                                                                           |
| market tips 70/25/5, tea 4 / supplies 3                | `market.ts:8-9,34`; SPEC §17                                                                                                                          |
| world draft 2 templates                                | `world-draft.ts:85-93,93-105`                                                                                                                         |
| cast ties constant warm                                | `life-context.ts:151-158`                                                                                                                             |
| LifeContext already delivered to fillers               | `life-context.ts:190-221`; `fill-adapter.ts:53-75`; used only for notes `manifest.ts:219-224`                                                         |
| visitor table-swap precedent + exclusive names         | `visitors.ts:139-168`; `catalogs.json5:1103-1111` (quote at `:1108`)                                                                                  |
| 8 tiers / 14 milestones / 6 visitors / compendium 5    | `src/content/progression/base/{tiers,milestones,visitors,compendium}.json5` (id counts)                                                               |
| queueDevelop already parameterized                     | `operations.ts:134-170` (`cookTicksDiscount`, `minResidue`)                                                                                           |

## Appendix B — sources (all accessed 2026-10-03)

1. Anthony Pecorella, _The Math of Idle Games, Part I_, Game Developer, 2016-10-13 —
   live via Wayback snapshot 2026-09-14:
   `https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i`
   (Quotes: multiplier purchase spikes; "not very interesting for the player… removes any
   interesting decisions".)
2. Anthony Pecorella, _The Math of Idle Games, Part III_, Game Developer, 2017-02-01 —
   via Wayback snapshot 2026-05-31:
   `https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii`
   (Quotes: prestige's two purposes; "ladder climbing" effect.)
3. Wikipedia, _Cookie Clicker_ (REST extract, accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/Cookie_Clicker` — cosmic-horror shift, golden cookies,
   wrinklers, sugar lumps (24 h), ascension (+1%/level, cube scaling), achievements/milk.
4. Wikipedia, _Universal Paperclips_ (accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/Universal_Paperclips` — plateau→breakthrough phase structure.
5. Wikipedia, _A Dark Room_ (accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/A_Dark_Room` — reveal pacing, prequel _The Ensign_.
6. Jonathan Bolding, _Jagex to publish Runescape-inspired idle game Melvor Idle_, PC Gamer,
   2021-10-24 — via Wayback snapshot 2021-10-25:
   `https://www.pcgamer.com/jagex-to-publish-runescape-inspired-idle-game-melvor-idle/`
   (Quote: "a lot of things to craft and progress… zero prestige mechanics requiring a game
   restart".)
7. Wikipedia, _Gacha game_ §Pity system (accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/Gacha_game` — soft/hard pity, sparking, 50/50 definitions.
8. Wikipedia, _Dwarf Fortress_ (accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/Dwarf_Fortress` — procedural history, emergent play, MoMA,
   "Losing is Fun".
9. Wikipedia, _Spiritfarer_ (accessed 2026-10-03):
   `https://en.wikipedia.org/wiki/Spiritfarer` — farewell-ledger loop.
10. Wikipedia, _Dave the Diver_ (accessed 2026-10-03):
    `https://en.wikipedia.org/wiki/Dave_the_Diver` — dual active/manage loop.
11. Wikipedia, _Cultist Simulator_ (accessed 2026-10-03):
    `https://en.wikipedia.org/wiki/Cultist_Simulator` — card-based simulation premise.
12. Kittens Game — **not verified this session** (sites `kittensgame.com`, `bloodrizer.ru`
    unreachable); mentioned only with that caveat.
