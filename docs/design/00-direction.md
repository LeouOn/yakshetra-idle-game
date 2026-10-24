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

## Status, 2026-10-24 evening (v2 rig `yakshetra`, cycles 1 and 2; read this first after any restore)

Tree: `origin/main` = 9ac91ab, everything landed is pushed (the learner gave a standing authorization to push reviewed commits, never with force). Every product commit was built by one model family and reviewed by another, and the committed bytes were checked equal to the reviewed bytes. Gate at 9ac91ab in a clean worktree: tsc 0, eslint 0, prettier clean on touched files, full suite capped at two workers with provider keys unset: 150 files passed, 1 skipped; 1629 tests passed, 2 skipped (live-provider). The working tree keeps, on purpose and uncommitted: `AGENTS.md` and `CLAUDE.md` (rig-managed, never commit them), `docs/design/eval/07-chronicle-sample.md` (generated by `eval/harness/sim.test.ts`; g2 regenerates it with the chronicle fix) and `docs/design/eval/10-first-minute-handoff.md` (a 6-row string sync waits for c1). `prettier --check` is red only on `catalogs.json5` (a generated mirror: never hand-format) and one historical plan doc.

LANDED, oldest first (cycle 1: bdaa7b6 banked-heat cap in `src/engine/heat.ts`; c8591e4 voice and truth pass; 1bb4426 a place needs several distinct practices; 9ec2834 and 5eefb01 cook-panel family labels and heat ceiling; 4371161, 84ef12c, eec67bc the save-error bar; 5566656 this doc), then cycle 2:

- fa73b6a: `LifeContextSchema` carries `practiceIds` and tie names, a fractional `surplus_rate` banks whole ticks, the slow prose test is fast, the always-green member-copies test says so.
- 9de3dc9: the Sought list has one row per figure and counts a figure met by chance as Answered; the cook panel names practices (no raw ids) with 44x44 steppers.
- 8442da3: "Start fresh" for an unreadable save, behind a two-step confirmation, on all six routes that show the error bar. The life screen no longer silently overwrites an unreadable save (found in the real browser at the previous HEAD while all tests were green), "Go on" is withheld where dismissing would write, and no phantom life is written after Start fresh.
- 6aacf15: the lens cards no longer make the first life screen scroll sideways on phones.
- c6f02dd: the voice and tradition pass, sources looked up: three wrong translation attributions, an invented Maitreya custom and Samantabhadra guild link, three mantra texts and the 23 Buddhas corrected; hedging beyond SPEC section 3 dropped; "Late Tang Chang'an" and "Guild" used everywhere; Settings says "Begun <date>". The sources ledger lives in `~/proj/rig-lab/yaksh-backups/c1-voice2-sources.md`; Sanskrit and Chinese readers have not checked the three corrected mantra texts.
- fd8ce51: the banked-heat line is legible and set apart on phones.
- 15d613c, 9ac91ab: the Maestro flows match the app and a test (`maestro-text.test.ts`) fails the suite when they drift (26 of 68 assertions had rotted); nine pre-red json5 files formatted, proven format-only.

IN FLIGHT (rows in the queue; see `~/proj/rig-lab/briefs/yakshetra-v2-cycle2/`): g2 the repeating chronicle sentences; c1 Garden of Arrivals content (Patch A: six sourced or native figures as catalog rows; plan in `yaksh-backups/c1-garden-plan.md`, decisions: print the two promise-free mantra verses, keep Garden figures near a third of person cards, no hard stories); d1 the away-window fix; g1 the life-turn screen; check-g four studio UX fixes.

FINDINGS THAT SHAPE THE NEXT WAVE:

- Away play is broken, not slow (d1's measurements, `yaksh-backups/d1-pacing-report.md`): at the SPEC cap of 240 ticks the whole absence is one cook window, any level-up makes it a `change` card, tier folds copy that window around, and a long-away player reaches 0 to 1 of 7 ladder rungs (Garden away play is 100% `change`). Windows of 60 ticks or fewer reach the world rung. Fix: cap a window near 16 events and auto-queue 2 to 3 workings per return; SPEC section 4 (1 tick = 60 s, cap 240) does not change.
- Live play: the ladder outruns the content after town (world at 640 ticks in Tang, 472 in Garden, 65% to 68% repeats), a live Tang run reaches only two named figures and a Garden run one (a Tang figure). In a 12-harvest browser run the same Medicine Buddha and Guanyin cards repeated verbatim. Next: figure variety, Tang figure reachability, Garden Sought recipes (after Patch A, both move seeded goldens).
- The life turn lists every eligible event's choices in one flat list and events have no situation text ("Bring them in and tend to them": who?). The schema has no description field; `situation_sid` is being added and c1 writes the 14 lines.
- The first-ten-minutes UX walk (`yaksh-backups/agycheck-ux-walk.md`, screenshots under `yaksh-browser/shots/agy-ux/`): an impossible "Next: set a keepsake" on unpinnable cards, a cook panel below the fold on phones, the archive burying earned keepsakes under nine riddles, no back navigation on life/start and settings, nine content warnings above core settings, a stray white gutter on desktop, an adult farmer who is "0 years old", a reflect card that dismisses itself after 8 s (decided: off by default; g1 is building it), duplicate primary buttons on the bench (a design call still to make).

HELD FOR THE LEARNER: the "person = a third of the window" gate (`c1-kindmix2-B.patch`); echoes across chains; the away-play richness and ladder-pacing curve (d1's recommended targets: region about 55, nation about 80, world about 110 minutes of watching, world repeat at most 50%); an atmosphere layer; an expert reader for the corrected mantra texts and the new Garden figures.

STILL OPEN: the 6-row sync in `10-first-minute-handoff.md`; Tang figure variants and the Great Compassion Dharani (T 1060, Tang-attested) as a Tang practice; roster policies always resolve against the Tang pack (Garden members carry Tang practice ids); the Sought list is not era-scoped; ladder pacing; an atmosphere layer; composer treatment for the 13 tier kinds.

RULES LEARNED THE HARD WAY (all seats):

- NEVER run git checkout/restore/reset/stash/clean/rm on this uncommitted tree. One `git checkout --` destroyed a day of catalog authoring.
- A generator that reads its own output is a loop. scripts/catalog-mirror.test.ts writes catalogs.json5 FROM the engine; scripts/rebuild-catalog.py reads it BACK and drops row-level era tags. Running the pair repeatedly tripled the Garden rows (and leaked them into Tang runs). Never "restore from HEAD" (HEAD predates all catalog authoring). Repair by editing the engine file, running the mirror writer ONCE, and cmp-ing a second run.
- Run tests with the provider keys UNSET (env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER): live.test.ts makes real provider calls whenever a key exists.
- Green tests were not enough: the web build threw on every life save while the suite passed (Node has node:crypto, the browser does not). Verify in the real browser harness.
- Measure the thing the player sees, not a proxy: a "96% distinct" metric hid a footer on every card; reading card titles hid figure cards wearing variant titles. Read the output aloud.
- Wall-clock assertions flake: bound work by complexity, not by 50 ms.
- Validate the instrument before believing a finding. The browser harness's static server fell back to index.html for every deep link (the bare path /studio does not exist; only studio.html does), so each route hydrated against the HOME page's HTML and produced a React #418 "bug" on six routes for days, and two seats worked on fixes for it. Fixed in ~/proj/rig-lab/yaksh-browser/serve.mjs; the production export hydrates with 0 errors on all routes. The harness now has to assert the served HTML belongs to the route before any hydration test. Same family, second time: a "chronicle renders on one line" finding measured a display:none draft panel (every rect at 0,0, innerText collapsed to one line) while the visible chronicle was fine; and a "pair missing" finding came from a build that was not the tree. Before believing a browser measurement, assert the element has height > 0 and that the build contains the code under test.
- The pre-commit hook runs `eslint --fix` on staged files; its import/no-duplicates fixer can merge two imports from one module into a broken statement (a double comma). Never leave two imports from one module in a file; run prettier and eslint --fix yourself before committing and re-run the suite.
- Seats can be rate-limited by their model provider (429 'usage limit', hours of lockout): the stuck-sweep is sometimes right. Check the seat's screen, then reassign the work, do not wait.

- A seat's verdict can land in the lead's inbox, not the queue, when its pane sends time out. Run `rig queue inbox-pending dev-lead@yakshetra` on every wake; three hours of verdicts sat unread on 2026-10-24.
- Heavy checks go through `~/proj/rig-lab/bin/yaksh-heavy` (a rig-wide `flock`) with vitest `--maxWorkers=2`. The machine is shared with other rigs and ran out of RAM on 2026-10-24. Check a PID's working directory before blaming or killing it: a "single-thread vitest" blamed on one seat was another rig's.
- Never partially stage on the dirty shared tree: the pre-commit hook's lint-staged stashes partially staged files. Whole files commit directly. A file shared between batches is committed from a clean `git worktree`, `main` is moved with `git update-ref` compare-and-swap, the same reviewed bytes are applied to the shared tree first, and only those paths' index entries are repaired with `git update-index --cacheinfo`. After every commit, `git show HEAD:path | cmp - reviewed-file`, because the hook runs prettier and `eslint --fix`.
- The stuck sweep sees queue notes only. It fired about a dozen times on 2026-10-24 and was a false positive every time a seat was visibly working; check the row's notes, the seat's worktrees and the process list, then close it with the evidence. z.ai 429 reset times are China time (UTC+8): convert before judging a GLM seat blocked, then re-nudge.
- Reproduce, do not trust: the best catches of the cycle (a save warning cleared by a reload, a button that destroyed an unreadable save, a balance lever that caused most of the mix shift, an "identical" mix that was one seat's copy of an instrument) all came from a reviewer re-deriving a claim.

- Reproduce UI claims in the real browser before dispatching a fix, and read the schema before trusting a proposed field: a review proposed rendering `event.title_sid`, which does not exist. Builders reproduce first and say so when a claim is wrong.
- Seats on one provider share one quota: MiniMax seats (m1, check-m) stopped on a "Token Plan usage limit" 429 mid-task on 2026-10-24. Take over small finished work and route new work to other families.
- zsh reads `$NEW:path` as a history modifier: write `"${NEW}:${path}"` when handing a ref and path to git.

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
