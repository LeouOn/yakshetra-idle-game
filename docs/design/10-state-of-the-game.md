# State of the game, 2026-10-08

An honest read of Yakshetra as it plays now, after the fun pass. Evidence: the headless simulation (`docs/design/eval/harness`), the code, real-Firefox screenshots (taken with a local browser harness, not in this repo), and a hand-played first minute (`lead-life.mjs`, `lead-click.mjs`). Not verified in this document: native iOS/Android, sound (there is none), anything past about 45 minutes of real play.

## The game in one paragraph

You live short lives; the work leaves traces; you cook a pile of traces into a keepsake on the bench; keepsakes become a world that climbs an eight-rung ladder (person, household, org, town, city, region, nation, world). The prize is the world, told back to you as a chronicle.

## A minute-by-minute read

| When        | What the player meets                                                                                                                                                                                                                                                                       | Verdict                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0:00        | Home: one clear primary button ("Go work a day"), "The workshop", Settings, a small "Just a game" toast.                                                                                                                                                                                    | Works. Clean.                                                                                                       |
| 0:10        | Life start: about 500 words of "Lineage notes" above "Choose your station". The notes say "The game does not depict any historical Buddhist teachers", which is false now. Toggling "Review content warnings" shows raw keys (`content_warning.war-political-violence.label_sid`).          | Broken first impression. Fix first.                                                                                 |
| 0:40        | Life frame: six lenses, then six action choices (good writing), then the outcome: "Something quietly shifts. / The moment passes, carrying its weight forward." The same two sentences after every choice, because the schema has no outcome prose (42 choices, 0 outcomes).                | The weakest part of the game.                                                                                       |
| 1:30        | The bench: "Begin with an ordinary day. [Live a little]", a trace bar, Tend, Let the bench run, an optional brief, a disabled cook button, Harvest. One good primary card, five equal controls beneath, a "Next:" strip that repeats the primary card, and a bar that reads "Traces 4 / 3". | Clear enough; cluttered.                                                                                            |
| 2:00        | First harvest: the card is the screen (chips, big title, one-liner, composed prose, Pin, Back to bench). "He carries an adze and a coil of split bamboo... You wake to find the garden gate swinging true."                                                                                 | The best moment in the game. Works.                                                                                 |
| 5-10 min    | The cook is a real choice: spend a chosen subset of traces, see the kinds the pile can become, short or long fire. Figures arrive with three scenes each.                                                                                                                                   | Works (the browser confirmed advertised ticks equal real ticks, held traces return, the quick-pick lands its kind). |
| ~7 min      | First graduation: "The guild takes a seal. The work outgrows one roof; a charter holds it. [To the bench]".                                                                                                                                                                                 | One of the best beats. Under-used.                                                                                  |
| 15-45 min   | The ladder climbs: household t88, org t112, town t144, city t272, region t432, nation t528, world t640 (casual play, zero teas).                                                                                                                                                            | Fast; see below.                                                                                                    |
| after world | Nothing new: the compendium has 5 rows, endowments 4 tracks, visitors 6. 11 sought encounters exist in the engine; their UI is not in yet.                                                                                                                                                  | Dead end.                                                                                                           |

## What works

- **The harvest moment.** A named, specific card with prose that sounds like handling an object, on a stage that is the whole screen. Rarity changes the text, not just a chip.
- **Composed cards and figures.** No footer, no ids, dedup against the archive, the brief steers the card. 12 figures x 3 scenes in which a named figure does something specific ("A woman asks him, on a night when the fever will not break, whether the west is far. He does not say no.").
- **The Garden era.** A Fantasy life draws its own rows and voice ("The marks go soft at the edges first and then all at once, the way a word leaves a face you are not looking at."), not Tang with another name.
- **The cook decision and the long fire.** One planner now produces the advertised and the real ticks; banked heat can no longer erase the long fire's price.
- **One-press drain.** Every ready bench opens at once, person card last: a good "welcome back".
- **The chronicle.** Built around each card's own sentence, dated, in founding order: "The grain inspection house was the first stone of the city: The wall where every sack is opened and weighed in public."

## What does not

1. **The life part is the weakest and the first thing a player sees.** Generic outcomes after every choice; a 500-word wall; raw keys; "Open Manifest" still the link name on the life frame while the screen is now "The workshop"; each turn asks for a lens (six options) and then an action.
2. **Most of what accumulates is thin.** In a casual hour 181 of 218 cards come from the autonomous tier benches, which draw from 5-row tables with no composed prose: 63 distinct names, a 71% repeat rate. The rich cards (persons, things, places, outcomes, changes) are 17% of the archive.
3. **The ladder is too short for the content behind it.** All eight rungs in about 43 minutes of watching; then nothing. The compendium, endowments and visitors are a handful each.
4. **There is no art and no sound.** The UI is dark type on dark. A card is a text block. Atmosphere is carried only by prose. For a game meant to be "special", this is the largest unbuilt layer (the optional per-kind glyph was skipped).
5. **The bench screen is still a form.** Five equal-weight controls under one good card; a redundant "Next:" strip; "Traces 4 / 3".

## How the idle game actually works

- **While the bench is open and running:** one tick every 4 seconds (`STUDIO_PULSE_MS`); a tend tap adds 8 ticks. A cook takes about 6-18 ticks, so a card every 24-72 seconds per bench, and one press of "Harvest" opens every ready bench.
- **While you are away:** one tick per 60 seconds, capped at 240 ticks (4 hours); compendium and endowment rewards can raise the cap.
- **The structural problem: a queue of one.** A bench auto-queues a cook only when its bay is empty, and a finished cook sits ready until you reveal it (`src/engine/session-ladder.ts`: no auto-harvest, no stacking). So away production is bounded by the number of bays, not by time. Come back after 20 minutes or after 10 hours: at most one ready card per unlocked bench plus a pile of traces for the person bench. The 4-hour cap is moot; time beyond the longest cook is simply lost.
- **Watching beats leaving by about 15x per tick, and by far more per card.** In the casual run 218 cards arrive in 43 minutes of watching (about 5 per minute); a long absence returns about 9. That is the opposite of an idle game's promise, where leaving is the main way to earn.
- **What does compound** is the archive (cards), the chronicle (derived from it), tier unlocks, and the compendium and endowment slots. The market adds copper (shifts earn 1-6, tea costs 4, supplies 3) but copper only buys speed and social traces, and the "tea grind" made a goal-directed player stop living the life until the social markers were opened up.

## What to build next, ranked

1. **Fix the first minute (cheap, high payoff).** Per-choice outcome prose (rows are in the queue: schema by check, 42 outcomes by b3), a two-sentence era note, defined content-warning labels, "Open Manifest" renamed.
2. **Give idle depth.** Let finished cooks stack on a shelf per bench (not a second bay: a queue of finished goods), capped, so away time compounds and the 4-hour cap means something; reveal them as a sequence on return ("while you were away: six keepsakes arrived"). This is a SPEC section 4 decision for the operator, and it must be paired with pacing.
3. **Slow and widen the ladder.** Re-pace with the non-spec levers first (pulse, offline rate, fold cadence); give the tier benches composed prose and more than 5 rows each (the same composer, org to world kinds).
4. **Finish the encounters UI** (pin two cards, a Sought page); it adds named goals that outlast the ladder.
5. **An atmosphere layer.** A procedural glyph or pattern per kind and rarity; one or two sounds (harvest, graduation). Assets cost; procedural SVG does not.
6. **Declutter the bench** (one primary action, controls behind a disclosure).

## Operator decisions this depends on

Residue or traces in the UI (SPEC's word is residue); the idle contract and ladder pace (SPEC section 4); whether the Garden-native named figures are authored; the life-chain "Begin a new chain deletes save slot 1" persistence choice.
