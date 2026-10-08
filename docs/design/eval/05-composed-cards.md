# 05 — Composed cards, read aloud

**Seat:** dev-b2 · **Wave:** 1, revision 2 · **Queue:** `qitem-20261003072257-9778eae9`

Thirty cards from the real `tableFillManifest` path through `src/engine/card-composer.ts`,
plus a run of five consecutive cards from one kind. Every string below is verbatim engine
output — nothing is hand-edited. Each card was compiled with the archive of the cards
above it already in hand, so row and template dedup were both live.

> This is the **second** pass. The first one scored 96–98% distinct detail strings and
> that number was worthless: a footer printed the year, the era and the activity totals on
> every card, so two identical cards differed as strings while the player read the same
> card twice. The footer is gone. Everything measured below is something a reader can
> check by looking.

## What is measured

| Measure                                                                                    | Result                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Cards carrying a year / era / tie / activity footer                                        | **0 / 30**                                        |
| Cards naming a mechanic (window, cook, tier, bay, residue, manifest, batch, archive, slot) | **0 / 30**                                        |
| Cards naming a tie                                                                         | **0 / 30** (0%, ceiling is a third)               |
| Distinct titles across 30 cards                                                            | **24 / 30**                                       |
| Distinct details across 30 cards                                                           | 29 / 30 — reported for completeness, not as a bar |
| Cards identical between the Tang and Fantasy runs                                          | 1                                                 |

**Kind spread:** thing 6 · outcome 6 · change 6 · person 7 · place 5

**On ties.** Three quarters of the cards above were compiled with a tie in context, and
0 of them named it. That is well under the ceiling, and the honest reading is
that the `{{tie}}` templates are too thinly spread: 14 rows carry one, out of 45, so a
given card lands on one only by luck. Under-using the slot is safer than over-using it,
so this is a content gap to close next, not a rule to relax.

**Five consecutive `thing` cards** are the last section. The first version of this report
had no such run, which is why it could claim variety it never showed: consecutive cards
were not a thing anyone looked at.

**Content gaps, stated rather than hidden.** All 31 non-figure rows now author their
own `long_fire` and `rare`, and every `outcome` and `change` row carries two title
variants, so a run of those kinds no longer re-serves its row title. The remaining gap
is era-specific templates: only `thing` has them, so the other four kinds read as a
Tang workshop in a different year. See `docs/design/card-template-guide.md` §8.

---

### 1. Second bowl

_briefed · kind: `thing` · fire: `long` · rarity: `uncommon` · era: Late Tang China · hour: 2_

- **one_liner** — A simple brown earthenware bowl, kept clean beside the hearth for whoever arrives at mealtime.
- **subject** — a spare earthenware bowl
- **detail** — Fired dark from river clay, it lives beside the pot and not in the cupboard. When someone stops at the gate in the small hours, the broth goes into that one first, before you portion your own. Washed again at dusk, though nothing has been in it since the morning.

### 2. Quiet instrument

_kind: `thing` · fire: `short` · rarity: `common` · era: The Garden of Arrivals · hour: 7_

- **one_liner** — A cast-bronze chime resting in washed fleece on the bench, waiting to strike the change of the midday shift.
- **subject** — a bronze workshop chime at rest
- **detail** — Cast thick with a flat rim, it sits beside the whetstones until the work needs a clean pause. When struck with the wooden mallet, its low resonance cuts through saw-noise and workshop talk to call everyone away from the benches.

### 3. Folded measure

_kind: `thing` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 12_

- **one_liner** — A six-fold carpenter's rule of seasoned boxwood, hinged with flat brass pins that still snap into place.
- **subject** — a jointed boxwood rule
- **detail** — Unfolded against rough timber the brass pins snap true and the edge settles before you have finished the argument. It lives in the belt sash, and it took a few minutes to be trusted with the length of a beam.

### 4. Folded measure

_kind: `thing` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 17_

- **one_liner** — A six-fold carpenter's rule of seasoned boxwood, hinged with flat brass pins that still snap into place.
- **subject** — a jointed boxwood rule
- **detail** — Carved notches mark both the imperial foot and the shorter river pace used by boatwrights along the canal. When unfolded against rough-hewn timber, its straight edge cuts through dispute before the first saw-cut is made. Six leaves, all of them true, checked against a beam you have since cut.

### 5. Second bowl

_kind: `thing` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 22_

- **one_liner** — A simple brown earthenware bowl, kept clean beside the hearth for whoever arrives at mealtime.
- **subject** — a spare earthenware bowl
- **detail** — Fired dark from river clay, it lives beside the pot and not in the cupboard. When someone stops at the gate on the first watch, the broth goes into that one first, before you portion your own.

### 6. Sealed token

_kind: `thing` · fire: `short` · rarity: `rare` · era: The Garden of Arrivals · hour: 3_

- **one_liner** — A lead token stamped by the granary clerk, recording a full day's weighing completed at the scales.
- **subject** — a stamped granary token
- **detail** — A waxed clay token the size of a thumb, kept in the fold of the outer robe so it can be pressed into another hand without a word passing between them. The clerk cut it once, and the blank beside it stayed blank all season.

### 7. A guest ate

_kind: `outcome` · fire: `long` · rarity: `uncommon` · era: Late Tang China · hour: 2_

- **one_liner** — A drenched traveler took the stool by the charcoal brazier and emptied three bowls of hot millet without speaking.
- **subject** — a traveler fed by the stove
- **detail** — He set down his dripping bamboo hat and accepted steamed buns straight from the basket with both hands. When he wiped the bowl clean with a scrap of cabbage leaf, the silence between you felt settled rather than strained. Fed twice, and the second bowl was not put away afterwards.

### 8. A stray stayed

_kind: `outcome` · fire: `short` · rarity: `common` · era: The Garden of Arrivals · hour: 7_

- **one_liner** — A scarred yellow cat curled over the warm kiln bricks, deciding the courtyard was worth defending.
- **subject** — a stray settling by the kiln
- **detail** — Three days on the perimeter wall, then down to the skimmed whey you left in an earthen saucer. By dark it had found the hollow under the woodpile and curled fast against the draft, tail over nose.

### 9. A door that stays open

_kind: `outcome` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 12_

- **one_liner** — A heavy oak postern propped open with an ash wedge, letting late carters slip in past the curfew bell.
- **subject** — an unlatched courtyard gate
- **detail** — The iron drop-bolt stays greased and lifted while the market patrol marches past the end of the lane. Anyone coming cold off the river packet finds the threshold swept and the latch-string hanging out on the public side.

### 10. The stroke that closed it

_kind: `outcome` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 17_

- **one_liner** — One brush stroke of vermilion, drawn hard enough to score the mulberry paper underneath.
- **subject** — a struck ledger account
- **detail** — The man who owed you looked at the mark for a while before he looked at you, and whatever he decided to feel about it he kept to himself. The tab is a tab. That was the whole of it. The ledger line is struck through slowly, as if the striking down were the point.

### 11. A name remembered

_kind: `outcome` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 22_

- **one_liner** — A wandering cooper greeted by name at the canal lock, spared the constable's suspicious questioning.
- **subject** — a traveler remembered at the lock
- **detail** — You said his surname and his home village before he could unroll the permit onto the damp stone. It passed down the line of porters like dry kindling, and the inspection became ordinary business.

### 12. A storm that missed

_kind: `outcome` · fire: `short` · rarity: `rare` · era: The Garden of Arrivals · hour: 3_

- **one_liner** — Black thunderheads split over the southern ridge, dumping their hail onto bare gravel slopes instead of the barley.
- **subject** — a summer gale that broke elsewhere
- **detail** — The wind smelled of lightning and torn pine boughs all afternoon while you lashed straw mats over the drying sheds. When the gale broke it sheared east along the river gorges, leaving only cool drops on the hot tiles and the ditches running clear. It came close enough once to be worth the story, and never closer.

### 13. Under the road grit

_kind: `change` · fire: `long` · rarity: `uncommon` · era: Late Tang China · hour: 2_

- **one_liner** — Where there is only creak, there is a dry whistle from an empty axle-box, and it has been there all along.
- **subject** — an ear tuned to strained metal
- **detail** — You cannot switch it off. You have tried, at the market, at the well, in the middle of your own sentence. The world has more noise in it than it used to and you are simply the one standing still enough to notice. You gave it long enough, standing still, and it gave the rest back.

### 14. Before the first market drum

_kind: `change` · fire: `short` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 7_

- **one_liner** — Tools laid out, tea brewed, and the lane still not yet shouting at anyone.
- **subject** — a deliberate start to the day
- **detail** — You used to be in the alley before the drum finished, and something in you decided that being early was the same as being useful. It was not. The quarter-hour you take now buys more than the hour you used to save did.

### 15. A sharper ear

_kind: `change` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 12_

- **one_liner** — You hear the faint ping of stressed iron before the wheel rim fractures on the mountain pass.
- **subject** — an ear tuned to strained metal
- **detail** — Where others hear only road grit and creaking timber, you catch the dry whistle of an empty axle-box or the sudden hush of a bearing running hot. You can brake the cart while there is still stone beneath the tires.

### 16. Before the first market drum

_kind: `change` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 17_

- **one_liner** — Tools laid out, tea brewed, and the lane still not yet shouting at anyone.
- **subject** — a deliberate start to the day
- **detail** — You used to be in the alley before the drum finished, and something in you decided that being early was the same as being useful. It was not. The quarter-hour you take now buys more than the hour you used to save did. You did not hurry it, and the morning is still there.

### 17. The roads you never took

_kind: `change` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 22_

- **one_liner** — Every mile of the crossing you worried about, and none of the miles you walked.
- **subject** — a shed weight on the mountain road
- **detail** — The roads were not what made the pack heavy. You know that now, and you have not entirely forgiven the roads, and you have stopped packing for them.

### 18. Under the road grit

_kind: `change` · fire: `short` · rarity: `common` · era: The Garden of Arrivals · hour: 3_

- **one_liner** — Where there is only creak, there is a dry whistle from an empty axle-box, and it has been there all along.
- **subject** — an ear tuned to strained metal
- **detail** — You cannot switch it off. You have tried, at the market, at the well, in the middle of your own sentence. The world has more noise in it than it used to and you are simply the one standing still enough to notice.

### 19. Samantabhadra (Puxian)

_kind: `person` · fire: `long` · rarity: `uncommon` · era: Late Tang China · hour: 2_

- **one_liner** — He urges his six-tusked mount along the rocky ditch to haul the wagon out.
- **subject** — the heavy labor carried through
- **detail** — Where sharp words settle the law, he arrives with ropes and an unhurried white elephant to do the digging. He steps into the mud alongside laborers, steadying timber and testing bridge foundations until the promised road is truly built. It has the settled look of something given twice the attention it asked for.

### 20. Bodhidharma

_kind: `person` · fire: `short` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 7_

- **one_liner** — He faced the rock for nine years and the rock was the whole curriculum.
- **subject** — the teacher facing the rock
- **detail** — Scholars arrive at the mountain with written treatises and roll them out on the rock. He turns his head enough to say that there is firewood to be brought, and goes back to facing the wall.

### 21. Amitābha

_kind: `person` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 12_

- **one_liner** — He leans out from the west with an open palm, and it is not the gesture you expect.
- **subject** — the welcoming light of the west
- **detail** — At the midday change the western sky goes the colour of an unglazed bowl, and the men carrying the last of the day stop in the lane to watch it happen, and none of them say anything to each other about it.

### 22. Brother De the water-carrier

_kind: `person` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 17_

- **one_liner** — He balances twin cedar buckets from the public cistern, filling the neighborhood vats first.
- **subject** — a carrier of water
- **detail** — His shoulder-pole creaks under heavy pails through every morning frost. He dumps clear spring water into the communal crock and the baker's trough before drawing a single ladle for his own kettle, humming an old boatman chant. He made the climb twice without being asked the second time.

### 23. The one who was already there

_kind: `person` · fire: `short` · rarity: `uncommon` · era: Late Tang China · hour: 22_

- **one_liner** — He takes bun crusts from your palm and never barks at a late arrival.
- **subject** — a being in the yard
- **detail** — He is on the step before the household has decided who else is staying, and the step is warm from the afternoon and he is in the warm part of it, and this is a position he holds deliberately.

### 24. Samantabhadra (Puxian)

_kind: `person` · fire: `short` · rarity: `common` · era: The Garden of Arrivals · hour: 3_

- **one_liner** — He urges his six-tusked mount along the rocky ditch to haul the wagon out.
- **subject** — the heavy labor carried through
- **detail** — Where sharp words settle the law, he arrives with ropes and an unhurried white elephant to do the digging. He steps into the mud alongside laborers, steadying timber and testing bridge foundations until the promised road is truly built.

### 25. Jiuhua Shan

_kind: `place` · fire: `long` · rarity: `uncommon` · era: Late Tang China · hour: 2_

- **one_liner** — The southern mountain of Kṣitigarbha's great vow.
- **subject** — a mountain of the vow
- **detail** — Mist, stone steps, and a bell that the visitor from Korea is said to have rung first. The ground holds the promise longer than the season.

### 26. The extra seat

_kind: `place` · fire: `short` · rarity: `common` · era: The Garden of Arrivals · hour: 7_

- **one_liner** — A cedar bench with a clean bowl and chopsticks, kept vacant at every evening meal for an unexpected traveler.
- **subject** — a place set for an unexpected guest
- **detail** — It sits nearest the courtyard door, swept clear and laid with fresh willow chopsticks before the soup is ladled. The children know never to heap winter cloaks there.

### 27. The unlisted quay

_kind: `place` · fire: `short` · rarity: `rare` · era: Late Tang China · hour: 12_

- **one_liner** — A hidden stone wharf tucked behind weeping willows where uninspected barges discharge their cargo before dawn.
- **subject** — a stone wharf behind the willows
- **detail** — Rough cedar piles jut from the tidal mud, bound with greased cables that leave no gouges on approaching hulls. Small river smacks tie up with muffled oars, transferring salt sacks and unregistered iron to cart-drivers who pay in unminted silver. Somebody is paying to keep the cables greased, and nobody will say who, and everybody uses it.

### 28. Jiuhua Shan

_kind: `place` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 17_

- **one_liner** — The southern mountain of Kṣitigarbha's great vow.
- **subject** — a mountain of the vow
- **detail** — Mist, stone steps, and a bell that the visitor from Korea is said to have rung first. The ground holds the promise longer than the season.

### 29. Wutai Shan

_kind: `place` · fire: `short` · rarity: `common` · era: Late Tang China · hour: 22_

- **one_liner** — The northern mountain revered as Mañjuśrī's seat.
- **subject** — a mountain of wisdom
- **detail** — Pilgrims climb past terraces where the sword is said to have been seen. The cold is part of the teaching, the way the climb is part of the arrival.

### 30. Amitābha

_figure + long fire · kind: `person` · fire: `long` · rarity: `uncommon` · era: The Garden of Arrivals · hour: 3_

- **one_liner** — He extends an open hand westward each dusk as the day's labor closes.
- **subject** — the welcoming light of the west
- **detail** — At sundown when the market drum signals closing, his name passes among tired laborers packing their stalls. He leans outward from the western sky with an open palm, taking in every weary call without asking for credentials. It has the settled look of something given twice the attention it asked for.

---

## One window, three briefs

Same residue window, same seed, same row (`A slower morning`). Only the brief
changes. Each brief is answered by the template whose own copy already contains
that vocabulary, so the request picks the phrasing instead of being appended to it
as a note. Two of the three change the **title** as well as the body.

**brief: _nothing fragile has spilled on the road_**

_A lighter pack_

> You emptied the rusted tools and dead accounts from your wicker hamper before climbing the ridge.
>
> You left the spare ironmongery with a village smith and climbed on with a bamboo water-tube and dry tea cakes. The pack came down by more than its own weight; it came down by a few minutes you never spent on the roads you did not take.

**brief: _being early in the alley before the drum_**

_A lighter pack_

> You emptied the rusted tools and dead accounts from your wicker hamper before climbing the ridge.
>
> You left the spare ironmongery with a village smith and climbed on with a bamboo water-tube and dry tea cakes. The pack came down by more than its own weight; it came down by a few minutes you never spent on the roads you did not take.

**brief: _the joiner has his own hands and the queue forms_**

_A lighter pack_

> You emptied the rusted tools and dead accounts from your wicker hamper before climbing the ridge.
>
> You left the spare ironmongery with a village smith and climbed on with a bamboo water-tube and dry tea cakes. The pack came down by more than its own weight; it came down by a few minutes you never spent on the roads you did not take.

---

## Five consecutive `thing` cards

Same kind, archive threaded through each one, alternating era and fire.
**4 distinct names across 5 consecutive cards.**

**1. Shared cloak** — _uncommon, fire `long`, Late Tang China_

> A heavy wool cloak treated with mutton tallow against river sleet, hung by the latch for whoever leaves last.
>
> Patched at both elbows with boiled leather from an old harness, it has warmed three apprentices and a stranded courier through the first freeze. When you take the dark lane home without it, your shoulders remember its weight even in the damp wind. It has dried slowly, twice, and kept the shape of every shoulder.

**2. Folded measure** — _uncommon, fire `short`, The Garden of Arrivals_

> A six-fold carpenter's rule of seasoned boxwood, hinged with flat brass pins that still snap into place.
>
> A folding rule cut from a white river cane in six leaves, hinge pins of green jade, stilled now because nothing in the garden is measured the same way twice.

**3. Sealed token** — _uncommon, fire `long`, Late Tang China_

> A lead token stamped by the granary clerk, recording a full day's weighing completed at the scales.
>
> The clerk's chisel-stamp sits off-center, the way a hand stamps when it is tired. You keep it in the sash in the morning and find it with your thumb before you have decided to look — a few minutes of labor, weighed, accepted, and closed. The lead is warm, and the stamp bites deeper than it did this morning.

**4. Worn ledger** — _common, fire `short`, The Garden of Arrivals_

> A hemp-stitched account book of mulberry paper, its margins thumbed dark by oil lamp and well-water.
>
> Rows of small brush-strokes track every basket of salt and bundle of firewood carried past the slipway. Where the same laborer returned at dusk, the paper is worn soft as old silk, but the final tally balances without a single missing copper.

**5. Folded measure** — _uncommon, fire `long`, Late Tang China_

> A six-fold carpenter's rule of seasoned boxwood, hinged with flat brass pins that still snap into place.
>
> Unfolded against rough timber the brass pins snap true and the edge settles before you have finished the argument. It lives in the belt sash, and it took a few minutes to be trusted with the length of a beam. Six leaves, all of them true, checked against a beam you have since cut.
