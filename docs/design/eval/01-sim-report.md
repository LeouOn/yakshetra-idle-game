# Evaluation lane b1 — headless playthrough numbers

- **Report:** `docs/design/eval/01-sim-report.md` (this file)
- **Harness:** `docs/design/eval/harness/sim.test.ts` + `vitest.config.ts` (harness-local; `pnpm test` in the repo root does not pick it up). Re-run: `pnpm exec vitest run --config docs/design/eval/harness/vitest.config.ts` (~2 s). Raw output: `docs/design/eval/harness/out/results.json`.
- **Method:** the harness drives the REAL engine (`stepSession`, `queueDevelop`, `harvestTableFill`, `graduateToTier`, `purchaseMarket`, `completeMarketShift`, visitor swaps, milestone/graduation effect) through a player model that mirrors `StudioView`'s handlers 1:1. No product file was modified. Fixed seeds; one deterministic tap per loop iteration.
- **Tree state caveat:** numbers describe the CURRENT WORKING TREE, which other seats are actively editing: the rng `expandSeed` fix is IN (all numbers below are post-fix; I have no usable pre-fix card data to compare — my only pre-fix run died of a harness bug, not the rng), and an uncommitted catalog-copy rewrite is mid-flight (its prose glitches show up verbatim in §4 and are flagged there). A NEW `held_residue` cook-window mechanic (`src/engine/cook-window.ts`) began landing AFTER the measured run — the numbers below are post-`expandSeed`, pre-`held_residue`; re-run the harness (2 s) once that refactor lands to refresh them.

## Player policies simulated

- **Casual** (the ordinary loop): tend → develop at gate (≥3 events) → harvest → upgrade at 3 harvests. Never touches the market. Pin: first person/place card.
- **Grinder** (goal-directed): additionally buys tea (4 copper) whenever the next unlock milestone still lacks its social-kind cards, working market shifts (8 ticks, no residue) to earn copper.

## Q1 — Ticks and taps to first harvest, and between harvests

Casual Tang, 5 seeds — **all five seeds produce identical tick/tap trajectories** (328 ticks, 122 taps, 40 person cards; seeds only shuffle which card name comes out of the table):

- **First harvest: tick 16, tap 4** (tend ×3 → develop → tend → harvest). At the live pulse cadence (1 tick / 4 s, `StudioView.tsx:144`) that is ~64 s of watching, or ~20 s of active tapping.
- **Steady state: 8 ticks and 3 taps per card** — 1 develop + 1 tend + 1 harvest (measured gaps: 8 ticks / 3 taps for cards 2–40; the gap after card 1 is 16 ticks / 4 taps, and card 5 absorbs the one-time upgrade tap). 41 tends, 40 develops, 40 harvests, 1 upgrade = 122 taps for 40 cards.
- **Real choice vs only-button:** of the 122 taps, 40 are `develop` (a timing choice — see Q5a: waiting is strictly dominated), 1 is a one-time upgrade, and 81 (tend/harvest) are "press the only lit button." The UI offers three more choice surfaces the loop never forces: brief (free text), pin (which card), market (tea/supplies). A casual player can play 40 cards making **zero load-bearing decisions**.
- Wall clock per card: 8 ticks ≈ 33 s live (pulse) or ~8 min away (SPEC §4: 1 tick = 60 s away, cap 240 ticks = 4 h ≈ 29 banked cards per absence).

## Q2 — 40 harvests × 5 seeds, Tang vs Fantasy

**Casual (no market), person bench, per run (identical across all 5 seeds and BOTH packs):**

| metric                                 | value                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| kind distribution                      | **place 33, change 7** — thing/outcome/person never appear                                                                                                         |
| rarity                                 | common ≈ 0.68, uncommon ≈ 0.25, rare ≈ 0.075                                                                                                                       |
| distinct names in 40 cards             | 11–12 (of a reachable pool: place 8, change 5)                                                                                                                     |
| repeat share (card already in archive) | **0.70–0.72**                                                                                                                                                      |
| place table exhausted                  | by overall card 13–29 (seed-dependent)                                                                                                                             |
| Tang vs Fantasy                        | **byte-identical card sequences per seed** — same names, same order; the only difference on the card is the subject id-suffix `(alms-round)` vs `(garden-tending)` |

Why only two kinds: the bench schedule is fixed at the first 6 pack practices in 4-hour blocks (`app/studio.tsx benchSchedule`), one tend = 8 ticks = exactly 2 blocks ⇒ every window carries ≥2 distinct practice ids ⇒ `isSpatialWindow` ⇒ **place**; a window where a level-up out-counts ticks ⇒ **change**. `thing` needs a single-practice or empty window (never forms), `outcome` needs `event_resolved` (studio never emits it — only campaign choices do, `reducer.ts:199`), `person` needs a social marker (only tea or campaign). The card pick inside a kind is `rng.pick(entries)` over the table — residue content does not participate (`manifest.ts tableFillManifest`).

**Grinder (tea path):** 87 shifts → 161 copper → 40 teas → 40 person cards (**~2.2 shifts + 4 copper per person card**), plus 108 tier-bench harvests produced autonomously by folds while grinding (tradition 43, ware 54, heirloom 11). Person table (20 names incl. 12 figure rows) exhausted by tick 776 in the long run.

## Q3 — Ladder pace and dead zones

Grinder ladder run (Tang, seed 11; 7,240 ticks = 302 in-game days; ended at 400-card target, NOT at world):

| event                                     | tick      | wall clock (live 4 s/tick · away 60 s/tick) |
| ----------------------------------------- | --------- | ------------------------------------------- |
| first card                                | 16        | ~1 min · ~16 min                            |
| graduation: **household**                 | 48        | ~3 min · 48 min                             |
| graduation: **org**                       | 72        | ~5 min · 72 min                             |
| visitor gate-yaksa seats                  | 248       | ~16 min · ~4 h                              |
| person table exhausted                    | 776       | ~52 min · ~13 h                             |
| **town / city / region / nation / world** | **never** | —                                           |

- **The ladder dead-ends at org in the studio-only path.** `unlock-town` needs `archived.charter ≥ 1` (milestones.json5); charter is org's _social_ kind, and social markers only enter residue via tea's `lens_chosen` events (`market.ts purchaseMarket`) folding up at cadence 1/4 per rung (`tiers.json5 fold_cadence: 4`). In 7,240 ticks with 400 teas, zero charters ever cooked. Reaching `ministry` (nation gate) would require a tea event to survive five 1-in-4 folds (~1/1024 per event). The eight-tier ladder is, for a studio player, a two-rung ladder.
- **Dead zones:** after the last novelty (tick 776, person table exhausted) the run continued for **6,464 ticks — 89% of the run — with nothing new to see or decide**: same 25 tier-table names, same kinds, no further graduations. The largest mid-run gap is 232 ticks between visitor seatings. Full ranking in `results.json ladderDeadZones`.
- The tea-grind incentive is itself a finding: because gates never close, a goal-directed player stops tending entirely — 100% of the ladder run's 7,240 ticks were market shifts (residue-free) plus tea; the "life" being lived is a copper job.

## Q4 — Verbatim cards (casual Tang, seed 1, first 30 person-bench cards in order)

Full JSON in `results.json casualTangSeed1First30Cards`. Shape of what the player actually gets:

```
[1] place/uncommon — Wutai Shan
    one_liner: The northern mountain revered as Mañjuśrī's seat.
    subject:   a mountain of wisdom (alms-round)
    detail:    Pilgrims climb past terraces where the sword is said to have been seen. The cold is part of the teaching…
[2] place/common — The dry cistern
    subject:   a dry reservoir under the garrison — Wutai Shan
[4] place/uncommon — Wutai Shan            ← exact repeat of card [1] by card 4
[6] place/common — Jiuhua Shan
[8] place/common — The river stair
…
```

- 30 cards: 25 places from an 8-name table, 5 changes. Card [4] is a verbatim repeat of card [1].
- Every subject after the first pin carries the suffix `— Wutai Shan` (the pinned card) — the pin decorates every subsequent card and nothing else changes.
- **Copy glitches (in-flight catalog rewrite, not committed prose):** details arrive with unpunctuated glued fragments — "…keeps it from rusting. the early shift she is the only reason…", "You go down it the small hours with a few traces in your arms…". Time-of-day clauses have been spliced into `manifest-catalog.ts`/`catalogs.json5` mid-sentence. Whoever lands the copy pass should see this.
- Grinder person cards leak residue ids into player-visible text: subject "the sword cutting the knot **(tea)**" — the `market:tea` id's last segment, via the generic subject-suffix path.

## Q5 — Does the residue that goes in change what comes out?

Controlled comparisons (same seed, same engine):

1. **Immediate vs delayed develop (seed 21, 12 cards):** immediate (window ~3) = 104 ticks, all `place`; delayed (window ≥8) = 288 ticks (2.8× slower), 6 place + 6 change, rarity statistically indistinguishable (uncommon 1/12 vs 2/12). The one real timing choice in the loop buys ~nothing.
2. **Tang vs Fantasy (same seed):** identical card names in identical order; only the subject suffix differs (`(alms-round)` vs `(garden-tending)`). The two packs are one pack on the bench.
3. **Brief on/off:** brief adds exactly one appended sentence ("You asked for: a red lantern for the gate.") and a `briefed` tag. No effect on kind, name, or rarity.
4. **Pin on/off:** pin adds the `— <pin name>` subject suffix, `focused`/kind tags, `about_id`, and one appended sentence. No effect on kind, name, or rarity.
5. **Code path:** inside a kind, the entry is `rng.pick(entries)` — the residue's _shape_ picks the kind; its _content_ picks nothing (figure-prefer matches never fire on studio residue because no bench-schedule practice carries a `figure:` id — nianfo/medicine-rite/six-syllable are practices 7–9 and never run on the bench).

**Verdict: two very different lives produce the same cards.** The only residue-driven variance on the bench is the kind split (place vs change) and the id suffix in the subject line.

## Verdict on the lead's working diagnosis

"Wide scaffold on a very thin core" is confirmed, with two amendments:

1. The core is not merely thin — it is **closed**. The player's residue cannot express anything: kinds are fixed by the 2-block window shape, card identity is uniform rng over a 5–8-name table, and 70% of cards are repeats by harvest 15. The bottom of the game is fast (a card per ~30 s) but meaningless; the top of the game (town→world, 6 of 8 tiers) is unreachable in the studio-only path, so the scaffold's width is invisible.
2. What the numbers add that "thin core" doesn't say: **the ladder's social gates make the grinder stop playing the life** (100% market shifts), the visitor table-swap content is dead (file-order arrival means `gate-yaksa` always re-seats before `sample-arrival`/`court-auditor`/`road-surveyor` ever get a scan), and 89% of a long session is post-novelty grind with no decision left on screen.

Smallest levers these numbers point at (for the build wave, not this lane): make residue content able to change card identity (figure-prefer reachable, id-weighted picks), widen the kind funnel at the person bench (single-practice windows ⇒ thing; resource edges ⇒ outcome), make social markers producible by play (not only tea), and make repeats do something (upgrade/combine/dust).

---

# Wave 1b — before / after (lane b1 build, same harness, same seeds)

Code changes this wave (all re-measured by the same harness, 2 s re-run):

1. **Authored schedules on the bench.** `app/studio.tsx` no longer invents a 6-practice day; it passes the pack's authored `DailySchedules` (Tang 9, Fantasy 3) and the engine rotates them per in-game day (`session-step.ts` `embodiedSchedules`; prop threaded by b4). Data fix: Tang `monastic-day` started at hour 4 — an engine schedule must cover [0,24) (`resolveBlock` throws) — a null `night-watch` block (0–4) was added (`schedules.json5`, SIDs `tang.block.monastic_day.night_watch.*`).
2. **Engagement markers from play.** A practice whose activity family is social (generosity, beings — `activities.ts`) stamps `engagement:<practiceId>` on its `practice_tick` residue (`idle-residue.ts`, extracted from `idle.ts`). No prose, no new event type — an id convention (`ENGAGEMENT_PREFIX` in `residue.ts`). `isSocialWindow` reads it (`kind-registry.ts`), so a window of social-family work is a **person** without tea.
3. **Kind-rule order per scale.** The tier rows listed the social kind before the level kind, starving heirloom/monument/road/edict/horizon once markers made social windows common (region gate needs `monument ≥ 1`). Reordered to SPEC §6 order — level first — in `kinds.json5` (43 rows, order pinned by `kind-order.test.ts`).

## Kind funnel (Q2 re-run: 40 casual person-bench cards, no market)

Core-kind counts aggregated over seeds (person bench + tier benches; tier kinds listed once each):

| run                         | thing  | change | person  | place  | outcome | figure cards (prefer path) |
| --------------------------- | ------ | ------ | ------- | ------ | ------- | -------------------------- |
| **before** (any pace)       | 0      | 7      | 0       | 33     | 0       | 0 on the bench             |
| Tang tend (5 seeds)         | 0      | 20     | 200     | 10     | 0       | 45                         |
| **Tang mixed (5 seeds)**    | **20** | **10** | **215** | **15** | 0       | **60**                     |
| Tang pulse (3 seeds)        | 15     | 0      | 105     | 3      | 0       | 27                         |
| Fantasy tend (5 seeds)      | 0      | 30     | 95      | 60     | 0       | 0 on the person bench      |
| **Fantasy mixed (3 seeds)** | **24** | 3      | **57**  | **36** | 0       | 0 on the person bench      |

- The mixed rhythm (tend to charge, run-toggle while the bay cooks — the natural session) sees **4 of 5 core kinds** for both packs. Believability: a Tang market life is socially dense (8 of 15 practices are generosity/beings), so its cards lean person; the Fantasy garden's quieter days surface things and places. The packs now _disagree_ — before they were byte-identical.
- `outcome` remains unreachable in the studio loop (needs `event_resolved`/`resource_edge` to dominate; the one-shot `time` edge lands inside practice windows). Campaign play and copper-running-out are the honest sources; proposed, not built.
- Figure cards now harvest on the bench through the prefer path (residue names the figure): Amitābha via nianfo days, Bhaiṣajyaguru via medicine-rite days, etc. Person-bench figures: Tang only (Fantasy ships none — authoring decision parked with the operator).
- Repeat share at 40 cards dropped from 0.70–0.72 to 0.56–0.67 (more kinds + the 20-name person table in rotation).

## Ladder pace (Q3 re-run) — proposal input, no pacing changes made

| graduation | casual (before)      | casual (after) | grinder (after) |
| ---------- | -------------------- | -------------- | --------------- |
| household  | never (tea required) | **88**         | 40              |
| org        | 72 (grinder only)    | **112**        | 64              |
| town       | **never**            | **144**        | 96              |
| city       | never                | **272**        | 240             |
| region     | never                | **432**        | 400             |
| nation     | never                | **528**        | 496             |
| world      | never                | **640**        | 608             |

- **The ladder is a real ladder in casual play: all 8 tiers by tick 640 (≈27 in-game days), zero teas.** The grinder buys 17 teas / works 34 shifts and arrives ~5% faster — the tea-grind incentive is defused (buying social is no longer the only door).
- Dead zones: the largest novelty gap in the casual run is now **80 ticks** (was 6,464). The post-novelty desert is gone within this horizon; the remaining tail repetition is a card-pool size question (b2's composed cards widen it).
- Proposal (not applied): city→region (272→432) is the steepest casual stretch (160 ticks for monument + 2 city drafts); if the operator wants faster mid-game, `fold_cadence` 4→3 on city/region or a second city member would compress it. Household→town (88→144) is tight and feels right as an opening arc.

## New findings (for the lead)

- **Cross-pack figure bleed:** nation-bench members run Tang-authored policies in every pack (`POLICY_PACK = 'tang-china'` in `useStudioSession`), so a Fantasy life still harvests Tang figure cards at nation scale (medicine-rite → Bhaiṣajyaguru). Per-pack member policies would fix it; that file is b4's seam.
- `engagement:` ids ride the fold chain (they are plain residue ids), which is exactly what makes charter/festival/… reachable — but it also means person-scale windows formed purely of folded member work read as `person`. That is the intended SPEC §6 reading ("several distinct ids plus an engagement marker").
- The Tang `person` share (215/260 core cards in mixed play) is high but honest to the pack's social density; if the operator wants more balance, one non-social long block (≥8 h) per Tang day would surface `thing` for tend-players too. Proposed, not built.

## Verification

- New/updated suites, all green: `engagement-marker.test.ts` (4), `kind-window-rules.test.ts` (7), `bench-schedule-rotation.test.ts` (3), `kind-order.test.ts` (2), session-step goldens updated for markers (36), progression loader order fixtures (45), tang pack suites (149 scoped). RED was observed before each GREEN (pieces A/B/C).
- `pnpm exec tsc --noEmit`: clean for every file I touched; the remaining errors are the in-flight `card-composer`/`cook-window` wave (b2/b4, reported to the lead by file).
- `pnpm lint` on my changed files: clean.
- Full `pnpm test`: 83 failures / 20 files — none in files I own; spot-runs show the suspicious ones (nianfo, figure-reach, play-bridge) pass standalone and fail only in the full run (suite-order pollution from the in-flight waves). `catalogs.test.ts`'s mirror failure is b2's in-flight catalog edit (I touched neither side of that mirror).
- Harness re-run against the current tree passes all wave-1b bars: ≥4/5 core kinds (mixed, both packs), figure cards > 0 (Tang person bench), Tang ≠ Fantasy (kind mix and card streams diverge).
