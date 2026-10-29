# First-Minute Prose Handoff: Choice Outcomes, Life-Start Wall, Content Warnings, and Appositive Comma

---

## 1. Executive Summary

All four items from the first-minute prose pass plus the follow-on items from dev-lead's dispatches are complete, wired, and verified:

1. **42 Choice Answers:** Authored and wired `outcome_sid` (1–3 sentences with concrete setting cost, no moralizing, no meters) and `journal_sid` (1 sentence) for all 21 Tang choices and all 21 Fantasy choices across 14 events.
2. **Life-Start Wall:** Replaced the ~500-word defensive advisory essay with 2–3 evocative, true-to-the-game sentences for both Late Tang China and The Garden of Arrivals.
3. **Raw String Keys & Safe Fallback:** Defined all 13 content warning labels and descriptions in plain language in `en.json`. Hardened `app/life/start.tsx` to omit unauthored warning labels rather than leaking raw keys or dot-paths, with an in-voice fallback message when empty. Verified by UI test. Scanned and audited all other `resolveSid` catch blocks across `app/` and `src/ui/`.
4. **Fantasy Life-Start Verification:** Verified the Fantasy life-start route against the same standards.
5. **Appositive Comma Fix:** Implemented `formatPersonInTemplate` in `src/engine/world-draft.ts` to add the required closing comma after names containing `, the X` when followed by verbs. Tested across all 10 person-scale frames.

---

## 2. Item 2: The Life-Start Wall (Before vs. After)

### Tang China (`era: 'tang'`)

- **Before (~500 words):** Long disclaimer written for advisory panels ("Players should read the pack as a respectful, limited fiction built from scholarship...", claiming "No historical Buddhist teacher appears as a character" which contradicted current gameplay).
- **After (3 sentences):**
  > "Late Tang China, where the Silk Road meets the capital at Chang'an, and monastery bells measure out the market day. A life here is shaped by grain taxes, seasonal labor, family obligations, and quiet encounters along the road. Every choice costs something real — a thinner pot of millet, a neighbor's trust, or a day spent in the dust of the county seat."

### The Garden of Arrivals (`era: 'fantasy'`)

- **Before (~500 words):** Doctrinal defense asserting lack of sutra provenance and disclaiming devotional claims.
- **After (3 sentences):**
  > "The Garden of Arrivals, a quiet borderland of stone basins, slow water, and four cedar posts where a bell rings once. Arriving souls bring what they carried across thresholds of memory, answering the Gardener and tending the common work. A vow declared here holds across lives, and what you choose to release or keep will shape the ground you return to."

---

## 3. Items 3 & 4: Raw Content-Warning Keys & Safe Fallbacks

### Root Cause Analysis

In `app/life/start.tsx`, `warningLabel(warningId)` caught errors from `resolveSid` and returned the raw `sid` directly (`catch { return sid; }`). Because 11 of the 13 taxonomy IDs lacked entries under `content_warning` in `en.json`, the UI rendered raw dot-paths like `content_warning.war-political-violence.label_sid`.

### Fixes Applied

1. **Taxonomy Strings Defined:** Added all 13 taxonomy entries (`death-of-self`, `death-of-family`, `illness-chronic-suffering`, `war-political-violence`, `betrayal`, `poverty-starvation`, `social-oppression`, `forced-moral-compromise`, `separation-from-loved-ones`, `loss-of-memory`, `encounters-with-anguish`, `spiritual-disorientation`, `separation`) with concise player-facing labels and descriptions in `en.json`.
2. **Safe Fallback in `app/life/start.tsx`:** Changed `warningLabel` to return `null` on failure. Filtered the visible list so missing labels are completely omitted from the rendered UI (never printed). Added an in-voice fallback string (`"No content warnings recorded for this era."`) when the filtered list is empty.
3. **Regression Test:** Added a test in `src/ui/__tests__/LifeStart.test.tsx` that deliberately mocks a missing label, mounts `LifeStartScreen`, and asserts that no string containing `_sid` or a dot-path appears anywhere in the rendered component hierarchy.

### Audit of Other `resolveSid` Catch Blocks in `app/` and `src/ui/`

- `app/life/start.tsx:56`: Now returns `null` and omits row. Safe.
- `src/ui/components/StudioView.tsx:246`: `practiceNowLabel` fallback was defaulting to `practice.label_sid`. Changed fallback to `practice.id`. Safe.
- `src/ui/components/StudioView.tsx:138`: `roleInfo` catch block returns `{}` (empty object). Safe.
- `src/ui/components/ChainCompleteView.tsx:100`: `scaleName` catch block returns `scale` (typed literal `'household' | 'org'`, not a dot-path). Safe.

---

## 4. Appositive Closing Comma Fix (`formatPersonInTemplate`)

- **Issue:** In world draft lines such as Draft 7, names like "Cor, the bell striker" lacked a closing comma when followed by verbs: `"Cor, the bell striker stays close to the Bell Pavilion"`.
- **Solution:** Added `formatPersonInTemplate(template, personName)` in `src/engine/world-draft.ts`. When a card name matches `/, the\b/i` and is immediately followed by a verb in the template frame, a closing comma is inserted.
- **Verification:** Tested across all 10 person-scale frames in `src/engine/__tests__/world-draft.test.ts` (verbs like `is`, `stays`, `keeps` receive closing commas; prepositions/colons do not generate double commas or `,:`). Draft 7 now produces:  
  `"Cor, the bell striker, stays close to the Bell Pavilion: Still at the cedar pillar, mallet held in, giving the nod before the one note."`

---

## 5. Verification Results

- `pnpm exec expo export --platform web`: Clean export to `dist`.
- `pnpm typecheck` (`tsc --noEmit`): Passed with 0 errors.
- Boundary ESLint (`app/life/start.tsx`, `LifeStart.test.tsx`, `pack.test.ts`, `world-draft.ts`): 0 errors, 0 warnings.
- Test Suite on boundary: All 10 test files and 78 tests passed (`env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER pnpm test src/content/packs/ src/ui/__tests__/LifeStart.test.tsx src/engine/__tests__/world-draft.test.ts`).
- Non-boundary note: During full-repo testing, temporary uncommitted edits in peer lanes (`kinds.json5` and `useSaveSlot.ts`) caused isolated failures in their respective tests; our boundary tests are 100% clean and green.

---

## 6. Complete 42-Choice Answers Table

| Event & Choice                                          | Outcome (`outcome_sid`)                                                                                                                                                                                                                        | Journal (`journal_sid`)                                                                |
| :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **`tang/grain-requisition.comply`**                     | The bailiff tallies four sacks against your tax roll and leaves a marked wooden tag. The carts rattle on toward the western pass, and your family measures the remaining winter millet by the half-cup.                                        | Four sacks gone to the frontier garrison, and a stamped tag on the lintel.             |
| **`tang/grain-requisition.hide_some`**                  | You dig two pecks beneath the earthen floor of the tool shed before the magistrate's men arrive. You surrender the rest with lowered eyes; the bailiff glances at the loose earth by the threshold, but moves on without speaking.             | Two pecks buried in darkness, and a cold sweat as the constables stamped the yard.     |
| **`tang/grain-requisition.petition`**                   | You walk five leagues to the county seat and kneel on the stone pavers outside the yamen. The clerk takes your written plea with an indifferent nod, but by nightfall no grain has been returned and your knees are bruised purple.            | A morning on cold yamen flags, and a brush stroke that altered nothing.                |
| **`tang/sick-traveler.shelter`**                        | You make a pallet by the hearth and boil bitter medicinal herbs until dawn. The traveler's fever breaks on the third morning, but your household eats half-rations for a week to balance what was spent.                                       | A stranger breathing easy on hearth straw, and thin gruel in the bowls.                |
| **`tang/sick-traveler.turn_away`**                      | You bar the wooden gate and extinguish the oil lamp, leaving the road in quiet darkness. In the morning you find a dropped straw sandal at the ditch, and the lane remains heavy with silence.                                                 | A barred wicket gate in the dusk, and a single sandal left in the frozen mire.         |
| **`tang/sick-traveler.escort_abbey`**                   | You support the shivering traveler two leagues up the mountain road to the abbey gate. The infirmary monk accepts them with an incline of the head, and you walk the dark track home alone with aching shoulders.                              | Two leagues up mountain stone under a stranger's heavy arm.                            |
| **`tang/corrupt-donation-demand.refuse`**               | You refuse the abbot's steward at the precinct threshold and take back your strings of coin. Within a month the temple elders decline your family's festival offerings, and neighbors avert their eyes when you cross the lane.                | Coins returned to the pocket, and cold shoulders along the temple wall.                |
| **`tang/corrupt-donation-demand.give`**                 | You lay three silver bits into the steward's velvet tray to secure the ancestral tablet's place. The monk writes your lineage in the heavy register, but your purse is emptied of the winter firewood money.                                   | Silver laid on velvet for a tablet's niche, and cold hearthstones at home.             |
| **`tang/corrupt-donation-demand.bargain`**              | You spend an afternoon negotiating with the temple factor over tea, offering dried beans in place of coin. The monks accept the compromise, but whisper in the market that your piety is measured with a scale.                                | Four sacks of beans weighed against prayers, and quiet mockery in the square.          |
| **`tang/conscripted-brother.bribe`**                    | You empty the ceramic floor-pot of your lifetime savings and hand the silver to the military registrar. Your brother's name is struck from the scroll with a red line, but you have no coin left to repair the collapsed roof.                 | A name crossed out in vermilion ink, and the roof leaking through the rains.           |
| **`tang/conscripted-brother.let_go`**                   | You pack two pairs of hemp sandals and salted plums into his hemp knapsack at dawn. He marches west with the levy column through the dust; you turn back to the empty plow.                                                                    | A brother's back vanishing into the western dust, and one less hand at the yoke.       |
| **`tang/conscripted-brother.take_place`**               | You step forward at the muster ground and answer to your brother's name before the prefect. They hand you iron greaves and a heavy spear; your brother weeps on the ditch bank as the column steps out.                                        | An iron spear taken in another's name, and the home road left behind.                  |
| **`tang/famine-year.share`**                            | You divide the dried tubers and salted greens among six neighboring doors. Every bowl is light, everyone's ribs show by spring, but no funeral pyre is lit on your lane.                                                                       | Six bowls filled from one shallow bin until the frost broke.                           |
| **`tang/famine-year.hoard`**                            | You bar the storeroom hatch and cook only after dark so smoke does not drift. Your family survives without fever, but the village lane turns hostile and no neighbor offers salt.                                                              | Cooking after dark behind barred shutters, and silence on the road.                    |
| **`tang/famine-year.seek_monastery_granary`**           | You stand in the freezing rain at the abbey gate with dozens of begging villagers. The almoner distributes a cup of barley per mouth, and your boots rot through from the muddy trek.                                                          | A cup of cold barley received in the rain, and waterlogged boots.                      |
| **`tang/persecution-edict.hide_monk`**                  | You conceal two elderly monks in the tool shed behind bundles of reed. The constables search the main courtyard and move on; you sleep in terror for two weeks, sharing your meager rice in secret.                                            | Two shaved heads hidden behind reed bundles, and boots stamping in the yard.           |
| **`tang/persecution-edict.comply_and_report`**          | You hand over the temple brass and guide the constable to the monks' hiding place behind the granary. You receive three pecks of confiscated grain, but the neighbors turn their backs when you cross the bridge.                              | Three pecks of reward grain eaten in bitter isolation.                                 |
| **`tang/persecution-edict.flee_region`**                | You pack the cart before dawn, abandoning the winter cabbage plot, and cross into the neighboring prefecture. You sleep on roadside straw for a month, spending your small savings on river tolls.                                             | A cabbage plot left behind in the dark, and toll coins paid at every river crossing.   |
| **`tang/child-illness.spend_all_wealth`**               | You hire a horse cart and pay the physician his steep fee in silver. He brews pungent root medicine that breaks the fever by second watch, but you owe three months of labor to the town.                                                      | A fever broken by midnight, and three months of debt on the books.                     |
| **`tang/child-illness.pray_and_wait`**                  | You brew willow bark, bathe the small forehead with well water through the night, and never leave the mat. By sunrise the breathing softens, but exhaustion clouds your eyes for days.                                                         | A vigil on a cold mat, wringing well water until dawn broke.                           |
| **`tang/child-illness.call_folk_healer`**               | You summon the village crone with her bundle of dried mugwort and river stones. She burns sage across the thresholds, charging two pecks of millet; the child stirs by evening, though the smoke leaves the room bitter for a week.            | Mugwort smoke drifting through rafters, and two pecks of millet given to the crone.    |
| **`fantasy/gardener-question.name-a-grief`**            | You speak the grief aloud onto the wet flagstones. The keeper listens without writing it down, nods once, and points along the raked gravel toward the inner pool.                                                                             | A name spoken aloud at the threshold, and a fresh notch in the gate post.              |
| **`fantasy/gardener-question.refuse-to-name`**          | You clamp your teeth shut and stare past the spade into the grey mist. The Gardener steps aside without pressing, but the cold weight in your chest hardens into a tight knot that drags at your stride.                                       | Silence held at the gate, and an old knot carried into the courtyard.                  |
| **`fantasy/gardener-question.name-a-joy`**              | You describe a summer morning by the river, smelling of warm grass and river silt. The Gardener lets you speak until the memory thins into quiet air, leaving your hands empty on your knees.                                                  | A summer morning remembered clearly, and allowed to drift away.                        |
| **`fantasy/soul-in-torment.sit-with`**                  | You pull your knees up and sit beside the traveler on the damp flags through two cold watches. Their ragged shivering slows as the mist thickens, though your limbs stiffen until you cannot stand without leaning on the wall.                | Two watches spent on cold flags until a stranger's breath steadied.                    |
| **`fantasy/soul-in-torment.attempt-to-soothe`**         | You brew bitter root-tea and press the hot cup into their trembling fingers, murmuring assurances that the crossing is done. The steam rises between you, but their terror does not yield to words and the tea cools untouched on the stone.   | A hot cup of tea pressed into trembling hands, and fear that would not yield to words. |
| **`fantasy/soul-in-torment.ask-gardener-to-take-them`** | You back away from the thrashing figure and call across the terrace for the Gardener's help. The caretaker arrives with a woolen fleece and takes the watch, while you stand alone under the eaves with guilt burning behind your collar.      | Backing away from a stranger's anguish to let another shoulder the weight.             |
| **`fantasy/forgotten-name.meditate`**                   | You sit upright on the stone bench and watch the syllables echo and dissolve against the slow canal. The urge to chase who you were ebbs away, leaving your thoughts clear and your ears open to the single bell.                              | Syllables watched like ripples in the canal until the urge to claim them passed.       |
| **`fantasy/forgotten-name.let-go`**                     | You open your fingers over the canal margin and let the phantom syllables sink into the weed. Nothing answers from the water, but the sudden lightness leaves an unexpected ache where a history used to rest.                                 | An old title dropped into the current, and an empty palm.                              |
| **`fantasy/forgotten-name.seek-in-court-records`**      | You spend half a day unrolling dusty mulberry rolls in the Hall of Rolls, searching for a seal or title you once bore. The ink is flaked and the names blur together; by dusk your thumbs are blackened with grime and no answer has come.     | Ink on the thumbs from searching dusty rolls for a name that was never there.          |
| **`fantasy/vow-reminder.re-affirm`**                    | You stand before the open Court and speak the old pledge word for word before the quiet attendants. The words settle into the oiled cord at your sash, tightening like a damp strap across your ribs.                                          | A pledge spoken again before the cedar rafters, and a heavy cloak taken back up.       |
| **`fantasy/vow-reminder.set-aside`**                    | You tell the court attendants that the promise has outlived the life that made it. They nod once and lay the cord into a shallow cedar box; relief washes over you, followed by a raw, hollow silence where the duty used to burn.             | A knotted vow laid down at last, leaving a quiet and raw ache behind the ribs.         |
| **`fantasy/vow-reminder.transform`**                    | You hold the knotted vow out to the Gardener, who snips the binding twine with his curved billhook. The old loyalty loosens into a wider care for anyone who limps through the gate, costing you the comfort of a single household to protect. | The twine of an old promise snipped open so care could reach beyond one hearth.        |
| **`fantasy/court-judgment.accept-reading`**             | You stand motionless as the attendant reads the full tally of your habits and evasions without anger. The stripped truth leaves no corner to hide in, but the stone beneath your feet feels solid and real.                                    | The ledger of habits read aloud without cruelty, leaving nowhere left to hide.         |
| **`fantasy/court-judgment.dispute`**                    | You contest the tally, arguing that hunger, fear, and bad counsel forced your harsher choices. The attendant listens with lowered eyes until your breath runs dry, then gently folds the mulberry paper without striking out a single stroke.  | Arguments spent against the ledger, and the ink drying unchanged.                      |
| **`fantasy/court-judgment.request-next-life`**          | You bow to the bench and ask for the crossing gate to be unlatched. The attendant marks the roll with a dry brush and gestures toward the outer path; you pick up your walking staff with both hands, ready for whatever road opens.           | Asking for the crossing gate to open, and hoisting the pack for another road.          |
| **`fantasy/offer-to-stay.accept`**                      | You accept a pallet beneath the cedar eaves and a broom to sweep the morning flags. The sheltered days blur into uncounted watches, peaceful and warm, while the road beyond the wicket gate fades into distance.                              | A broom taken up beneath the cedar eaves, and the wider road left behind.              |
| **`fantasy/offer-to-stay.decline`**                     | You shake your head and step back toward the threshold gate into the cold air. The Gardener watches you with quiet eyes as you pull your damp coat tight and face the unpaved road.                                                            | Turning away from a sheltered room to meet whatever the road brings next.              |
| **`fantasy/offer-to-stay.ask-cost`**                    | You ask the Gardener who tends the outer ditch while those inside sleep warm under slate. He taps his spade against the mounting stone and points to the frost gathering on the briars; discernment leaves no room for easy comfort.           | Asking who pays the price of quiet shelter when the ditch is cold.                     |
| **`fantasy/storm-at-edge.investigate`**                 | You walk out past the ditch where unhoused memories howl through the blackthorn hedge. You drag a disoriented traveler out of the briars and back to the terrace, nursing scraped forearms and gasping for breath in the freezing gale.        | Walking into the freezing gale at the boundary to pull someone from the briars.        |
| **`fantasy/storm-at-edge.warn-gardener`**               | You run across the flagstones to the tool shed, signaling with the storm-reed whistle. The Gardener drops his spade to brace the outer wicker screens, while you lean against the rain-barrel, chest heaving from the sprint.                  | Sounding the reed whistle across the terrace before the outer squall hit.              |
| **`fantasy/storm-at-edge.ignore`**                      | You turn your collar up and hurry into the tea pavilion, pulling the felt curtain shut. The warm broth tastes thin while the wind shudders against the cedar posts and an unanswered shout dies out in the squall.                             | Drinking warm tea behind felt curtains while the wind battered the outer ditch.        |
