# Direction: the bench writes your life back to you

**Status:** lead's synthesis of the four evaluation lanes (`docs/design/eval/01..04`). Decided inside SPEC.md's fences; nothing here lifts one.
**Operator's ask:** "no fun, engaging and cool aspects ... really flesh it out and develop it in a special way."

## What we found (verified at source, not just reported)

The game is a wide scaffold (8 tiers, endowments, visitors, compendium) around a core that does not pay.

1. **The reward pool is tiny and repeats.** Generic pools are 6/6/5/8/6 cards (`manifest-catalog.ts`). A tending player sees 6 distinct cards in 120 harvests, all by harvest #10; 114/120 are repeats. Pigeonhole: the 6th `change` harvest must repeat a name.
2. **The card is blind to the life.** `LifeContext` (era, hour, ranked ties, activity totals) reaches every filler and is spent on two suffix sentences. Rarity changes a label, never the text.
3. **There is no decision at the spend moment.** The brief only appends "You asked for: ..." (`manifest.ts:216`). The predicted kind is computed and never shown. `cookTicksFor` makes the minimum 3-event window strictly dominant.
4. **Authored content is stranded.** The bench schedules only the first 6 practices (`app/studio.tsx:34`). The three practices that bind a figure (6, 7, 8) are not among them, so all 14 named figures are unreachable on the bench. Fantasy ships 0 figures and 0 mantras. Each era has 7 events.
5. **The idle contract is inverted.** Watching ticks every 4 s (`STUDIO_PULSE_MS`); away accrues 1 tick per 60 s, capped at 240 (`studio-offline.ts`). The whole daily away cap equals 16 minutes of watching.
6. **The moments that should land don't.** Harvest juice is 5 static glyphs. Cards ended "It is year 1 in studio-bench@0.1.0" and the life panel said "operator" (both fixed in wave 0). The bardo's peak is "No echoes were detected". The opening screen's most specific text is a tip-odds table. The bench is a flat 100-139 node wall.
7. First harvest of every session was the same card (RNG seed expansion bug; fixed in wave 0, verified).
8. **The core is closed, not just thin** (b1, `eval/01-sim-report.md`). The bench invents a fixed schedule of the first 6 practices in 4-hour blocks, so every window has 2+ distinct practices: only `place` (33/40) and `change` (7/40) ever appear; `thing`, `outcome`, `person` are unreachable without tea. Inside a kind the pick is uniform over the table, so residue content picks nothing.
9. **Tang and Fantasy are one pack on the bench**: byte-identical card sequences per seed; only the subject id-suffix differs.
10. **The ladder is two rungs in studio-only play.** `unlock-town` needs `archived.charter >= 1`; charter is org's social kind; social markers only come from tea and fold up at 1-in-4 per rung. 0 charters in 7,240 ticks with 400 teas. 6 of 8 tiers are unreachable. 89% of a long run is post-novelty grind.
11. Known, parked: the tea-grind makes a goal-directed player stop living the life (100% market shifts); visitor table-swap content is dead (file-order arrival re-seats gate-yaksa forever); the catalog copy rewrite has glued unpunctuated fragments and a `(tea)` id leaking into subjects.

12. **The life chain does not persist on web** (check2, real Firefox, `/tmp/yaksh-browser`). `src/engine/serialize.ts:23` imports `node:crypto`; the web bundle throws `createHash is not a function` on every life save, so `yakshetra.life.slot.1` is never written. Vitest runs in Node, so every test stayed green. SPEC called this "done". The bench persists (different store, no SHA envelope).
13. **Seen in pixels** (`/tmp/yaksh-browser/shots/`): the harvested card is a one-line block ("Discovered: Shen the night clerk" + a quote) among ~10 panels, not a stage; the juice glyphs overprint the "Tend the work" label (worse on a phone); the left rail takes about a third of a phone screen; "Overflow +228 - extra cook, not waste" is the loudest line on the bench and buys nothing visible; the player's closest tie renders as a raw id (`m-0-464489159 (warm)`); home offers three identical purple buttons including unexplained "Manifest" and a "Back to work" with no save behind it.

14. **Wave 1b landed (b1, verified by re-running its harness).** Authored pack schedules run; figures harvest (Tang 45-60 per 5-seed run); 4 of 5 core kinds appear for both packs and the packs now disagree; casual play with zero teas climbs the whole ladder (household t88, org t112, town t144, city t272, region t432, nation t528, world t640). Milestones and `fold_cadence` untouched.
15. **Open from b1, not yet fixed:** (a) nation members run Tang policies in every pack (`POLICY_PACK` const in `useStudioSession.ts`), so Fantasy lives harvest Tang figures at nation scale; (b) the Fantasy bench's very first harvest is Mañjuśrī, a Tang figure, because figures sit in the generic person pool for both packs; (c) `outcome` stays unreachable in studio-only play (event_resolved/resource_edge come only from campaign and market), so the bench never shows an outcome unless the life route fed it; (d) Medicine Buddha appears 4x in the first 17 Tang harvests until the composer varies titles.

## The thesis

Yakshetra already owns one rare thing: **effort becomes a named object, and objects become a world.** Today the object is a table row and the world is two template sentences. The signature is to make the bench _write from the life actually lived_:

- **A. Composed cards.** A card's nouns, hour, practice and tie come from the window that made it. No two harvests read alike. This is the identity move.
- **B. The cook is a hand.** At cook time the player sees the window's chips and the predicted kind, can hold events back, and chooses a short or long fire (long = more ticks, a rarity floor, first call on a figure present in the window). The kind becomes a bet, not a surprise.
- **C. Sought encounters** (next wave): pin a person plus a place, cook the right window, and a figure who currently cannot appear arrives. A compendium page of silhouettes with recipe hints.
- **D. The chronicle** (after A): the world draft becomes a dated gazetteer compiled from the cards, shareable as the artifact.

Order: **A and B as one wave on the same seam**, then C, then D. A without B makes the choice flat; B without A makes a "rare long fire" read like a common card.

## Wave 1 (now)

| Seat   | Owns                                                                                                                            | Files                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| b2     | A: composer + rarity floor                                                                                                      | new `src/engine/card-composer.ts`, `manifest.ts` (rarity floor param, call composer), `table-catalog.ts` / catalog template data |
| b4     | B: hold-back, fire, kind preview                                                                                                | `operations.ts`, `kind-registry.ts` export, `fill-adapter.ts` (request field only), `StudioView.tsx` develop panel only, SIDs    |
| b1     | wave 1b: open the residue (schedule from the pack's authored schedules, kind funnel, social markers from play, Tang != Fantasy) | `app/studio.tsx` schedule, `kinds.json5` + kind rules, residue emission, tests; re-run its harness                               |
| b3     | voice clean-up of named weak strings                                                                                            | `src/i18n/en.json` values only, in place                                                                                         |
| check2 | a real browser harness                                                                                                          | `/tmp` only (puppeteer-core + system Firefox); no repo changes                                                                   |
| check  | reviews the A+B boundary when both land                                                                                         | review only                                                                                                                      |

Shared contract between A and B:

- `ManifestCompileRequest` gains optional `fire: 'short' | 'long'` (additive; b4 lands the type first, b2 consumes it).
- `pickRarity` gains an optional floor argument (b2).
- Held-back events are state, not a restructure: additive optional field with a zod default; no `studio_session` migration; old saves read as no hold-back and short fire.

## Wave 2 (after wave 1 settles; StudioView.tsx is a one-owner file): give the card a stage

Owner TBD (one seat, because StudioView.tsx is 1333 lines): the harvest reveal as the screen (card centered, rarity, name, the composed lines, pin affordance); animate or delete `StudioJuice` and stop it overprinting the button; collapse the bench to charge + card + one primary action with the rest behind tabs; phone layout (rail collapses); demote or hide the overflow counter; humanize the tie name; one primary home CTA, explain or rename "Manifest"; skeleton first paint for /studio, /life/start, /chain-complete; first-run bardo beat instead of "No echoes were detected". Source: `eval/02-ux-walk.md` gaps #4 #6-#12 and the screenshots.

Also in wave 2: `useSaveSlot` now exposes `error: {operation, message}` + `clearError()` (check2's fix), but no screen renders it yet. A failed save must show the player something, in the lexicon's voice.

Then C (sought encounters) and D (chronicle).

**Proposed player-facing lexicon** (b3's voice pass mixed bench/kiln/hearth/sash; pick one vocabulary and use it in every new string): residue -> "traces"; the cook bay -> "the bench"; a cook -> "a working"; short/long cook -> "short fire" / "long fire"; harvest stays "harvest"; a harvested Manifest -> "a keepsake" in prose (the studio route may keep "Manifest" as its name until the operator decides); the archive -> "the archive"; a world draft -> "a world". Never show: residue, window, bay, manifest id, JSON, tier ids, `m-0-...` ids. This is a proposal; the operator can veto it.

## Bars (what "done" means for wave 1)

- > =90% distinct `detail` strings over 50 simulated windows (today: ~2 variants per row).
- A long-fire card visibly differs in text from a short-fire card of the same row.
- In a scripted playthrough, the cook screen shows the predicted kind and offers a hold-back and a fire choice; instrumented target: >50% of cooks use one.
- Lead reads 30 composed cards aloud and they are good prose in the SPEC section 3 voice (warm, specific, slightly occult-workshop; objects have weight; no sermon, no vitrine, no leaked ids).
- Table fallback, engine purity, and schema parse suites stay green; no `karma`/`merit` numbers; engine files stay under about 250 lines (`manifest.ts` is at exactly 250: extract, do not grow).

## Status (October 2026)

Wave 1 and the sought-encounter and chronicle work have landed on `main`. Since then: the chronicle stops repeating sentences, the Garden of Arrivals has its own figures and people, each life turn shows the moment above its choices, the bench follows the era of the life being lived, a return after time away is summarised in one line, and the bench has a single primary action. The thinnest part of the game is now the life itself: nobody ages, so age-gated events and endings never fire; a few events and half the endings are unreachable; role starting resources are not applied; and there is no wealth resource. The next direction is more tick-based play, with time passing on its own across the life as well as on the bench, and tracking more of the character and their world (ageing, history moving on) than the practice lenses alone. That starts with a design pass on what a tick means for a life, then a rules pass (starting age, years per tick, ending evaluation).

## Decisions that are the operator's

1. **Idle contract (SPEC section 4 states 60 s/tick, cap 240).** Leaving costs 15x more than watching. Options: slow the 4 s pulse to about 12-15 s; raise the away rate or cap; or keep the numbers and make returning feel big (a composed "while you were gone" harvest). Recommendation: keep SPEC numbers for wave 1, measure with the browser harness, then decide. Changing the spec is the operator's call.
2. **Push.** Each push has been the operator's explicit word; keep asking per batch.
3. **Ladder pace (new).** After 1b the whole ladder takes under 45 minutes of watching (about 11 hours away at 60 s/tick), with thin content behind each rung. The tier thresholds are in SPEC section 1.1, so slowing it by editing thresholds is a SPEC change. Recommendation: do not tune yet; finish A, B and C first (they change cook length and what a harvest is worth), re-measure with the harness and the browser, then slow the ladder with the non-SPEC levers first (the 4 s pulse, offline rate, `fold_cadence`) and only touch thresholds if those are not enough. Target to propose then: world takes many hours of cumulative play, with a new rung roughly every 15-30 minutes early and longer later.
4. **Fantasy pack has no figures or mantras.** Authoring it is real content width. Within "quality before width" if framed as reachability for the second era; confirm.
5. **Who counts as a person.** SPEC section 6 says a window is a person when it has several distinct ids "plus an engagement marker", and today one social tick qualifies. The old rig's proportional gate (people must be at least a third of the window's activity) is a new rule and is the whole mix effect: Tang tend 84% to 70% person and Garden 49% to 38%. Should a person card mean someone was there for a third of the window, for most of it, or stay as it is? Held as `c1-kindmix2-B.patch`, one small patch on top of what shipped.
6. **Eight voice and tradition decisions** from c1's tone-and-truth review: the religious-boundary disclaimer wording; whether echoes carry across chains; the bibliography; the sutra and mantra attributions; the self-contradicting block of 23 past Buddhas; the narrator line denying that giving is weighed; one name per thing (Late Tang China, Guild); the Mahayana framing of the six lenses. See `c1-voice-20261024-review.md` and `c1-voice-20261024-held.patch`. c1's source corrections are from memory at stated confidence and none was looked up.
7. **The Sought list.** Should a figure met by chance count as Answered, and should a figure with two recipes (Manjushri, Ksitigarbha) count once or twice? Rows are per recipe (11) but the held change matches by figure (9). Held as `c1-studioui-HOLD-sought.patch`.
8. **The save-error bar prints the raw `error.message`** (lexicon voice versus debugging).
9. **Chains and the save slot.** "Begin a new chain" deletes slot 1 and nothing carries across chains (the open persistence row, qitem-20261003062819-125dc512), and a permanently unreadable slot has no in-app way to start fresh except platform navigation and the first persist overwriting it. Decide whether chains should carry echoes, and whether to add an explicit "start fresh, discarding the unreadable save" action (needs copy).
