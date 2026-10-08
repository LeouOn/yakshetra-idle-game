# The Garden of Arrivals: Era Bible (`fantasy-mahayana`)

**Status:** Authoring bible for era-scoped card templates (`era: 'fantasy'`) in `src/engine/manifest-catalog.ts` and `src/content/progression/base/catalogs.json5`.  
**Target consumer:** `dev-b2` (card composer / template authoring).  
**Canon sources:** `src/content/packs/fantasy-mahayana/*.json5` and `src/i18n/en.json` (`fantasy.*`, `event.fantasy.*`, `ending.fantasy.*`).  
**Constitutional anchor:** `SPEC.md` §3 (warm, specific, slightly occult-workshop; objects have weight; names allowed to land; handling something, not a vitrine, not a sermon; the app does not claim the authority of a sangha).

---

## 1. The Place in Six Sentences

1. **What it is:** The Garden of Arrivals is an allegorical cosmic courtyard and terraced working ground where beings step immediately following a life's crossing, carrying no possessions beyond their residual habits, unresolved vows, and memories that tear like wet paper.
2. **Who is there:** Newly arrived travelers sit dazed on damp threshold flags, quiet court attendants in washed hemp walk unhurried rounds bearing cloth tallies of past deeds, and vow-bound wanderers pace the flagged margins muttering old pledges to keep them from cooling.
3. **The Gardener:** Moving between the stone benches and the perimeter ditch is the Gardener, an unhurried caretaker leaning on a notched iron spade, who cuts back wild blackthorn before it chokes the flagged paths and asks each arrival to name what burden crossed the threshold with them.
4. **The Daily Rhythm:** Days are measured not by solar transit or bell towers, but by twelve manual and contemplative labours: listening at the slow gate, tending the living hedge, walking the long flagged course between the two fountains, resting attention on the Bell That Rings Once, tracing memory stones, and stepping in cadence with the slow water.
5. **The Court:** At the heart of the terrace stands the open-sided Court, an austere pavilion where attendants unroll accounts of tendencies and debts without anger or arithmetic, waiting to see whether an arrival's pattern loosens into the common ground or hardens into resistance.
6. **The Boundary:** At the perimeter, where the paved stones end and the Garden's pattern thins into a howling storm of unheld anguish, arrivals must eventually choose whether to fade peacefully into the garden's larger rhythm, depart through the outer gate toward an unknown next life, or receive a transformed vow offered by the Gardener.

---

## 2. Where It Is NOT Tang: The Five Essential Contrasts

When authoring templates for the Garden of Arrivals, contrast every sensory element against Tang China across these five dimensions:

| Dimension     | Late Tang China (`era: 'tang'`)                                                                                                                             | The Garden of Arrivals (`era: 'fantasy'`)                                                                                                                                                                                                    |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Light**     | Sharp, harsh Wei valley sun; oily tallow candles; red paper lanterns over wine taverns; charcoal smoke that stings the eyes at dusk.                        | Diffuse, shadowless amber-grey illumination filtering through high mist and living hornbeam branches; pale light pooling on wet slate and slow canal water; no glaring midday or pitch-black night.                                          |
| **Weather**   | Seasonal continental extremes: yellow loess dust storms in spring, torrential canal-flooding autumn rains, freezing drafty winters through slatted screens. | Only two atmospheric states: the cool, still, damp cellar-calm inside the living hedge, and the violent, static-charged storm of unhoused memories that batters against the outer perimeter ditch.                                           |
| **Materials** | Rough kiln-baked grey brick, rotting pine beams, lead granary tokens, cast-iron pots, copper cash, pig lard, beaten loess earth, coarse hemp sacks.         | Water-smoothed white river cane, jade hinge pins, thumb-waxed unbaked clay, dense blue slate that sweats when handled, living blackthorn that heals its cuts, washed fleece, tea-stained mulberry paper.                                     |
| **Work**      | Civic and economic coercion: hauling tax grain to imperial silos, paying coin to market bailiffs, beating hemp in stagnant pits, dodging curfew runners.    | Contemplative maintenance and threshold care: pruning brambles so wanderers do not tear their flesh, sitting beside a screaming stranger until their breath steadies, washing the spare bowl on the sill, matching one's pace to slow water. |
| **Company**   | Cantankerous boatmen, haughty prefectural scribes, suspicious neighborhood bailiffs, tired apprentices sleeping under benches, tavern-keepers.              | Shivering travelers gripped by raw grief, soft-footed attendants who never speak unasked, solitary vow-walkers pacing stone circuits, and a silent Gardener whose spade leaves dark, straight furrows.                                       |

---

## 3. Objects: 24 Seeds Across Card Kinds

Six `thing` seeds already exist as Fantasy variants in `src/engine/manifest-catalog.ts`:

- _Clay token:_ A waxed clay token the size of a thumb, pressed into another hand without a word.
- _Tea-dark ledger:_ A ledger of grafts and grudges on paper the colour of weak tea, debts marked with green chalk.
- _Six-leaf rule:_ A folding rule cut from white river cane with green jade hinge pins, stilled because nothing is measured twice.
- _Bowl-rung:_ A bowl-rung of fired clay on silk cord above sleeping quarters; struck once, it stops an argument.
- _Bowl on sill:_ A second bowl kept unwashed on the sill so late knockers know a place is set.
- _The other cloak:_ A rain-dark cloak of waxed flax on a peg for thirty years, patched by four hands that never spoke of it.

Below are **6 additional things**, **6 outcomes**, **6 changes**, and **6 places** for authoring era-scoped cards. Each provides a name and a single concrete sentence defining its weight, material, use, and wear.

### 6 Additional Things

1. **Notched pruning bill:** A curved billhook forged from dark river-iron and hafted in root-burl, its inner crescent honed thin from slicing wild blackthorn runners without splitting the grain.
2. **Water-slate stylus:** A rounded stylus of river-bone wrapped in greasy flax thread, used by court attendants to trace fleeting recollections onto damp slate before the water evaporates and the marks dissolve.
3. **Washed fleece cushion:** A square pad of raw sheep’s wool soaked repeatedly in the slow canal to strip its lanolin, kept on the outer stone bench so a traveler can sit through a cold watch without stiffening.
4. **Braided vow-cord:** A cord of three rough hemp strands twisted around a single silver wire, notched at intervals to count walking laps between the fountains and blackened with thumb-oil at the fifth knot.
5. **Storm-reed whistle:** A short tube of hollow river-reed plugged with beeswax, kept on a lanyard at the perimeter post to warn the inner court whenever the storm-edge surges inland.
6. **Stoneware hearth-crock:** A heavy, unglazed jar of coarse grey clay with a pine bung, holding bitter dried root leaves kept warm in hearth-ashes for anyone who arrives unable to speak.

### 6 Outcomes

1. **A memory smoothed clean:** A blue slate tablet returned to the wall rack without a single scratch, its crowded chalk-marks dissolved by slow water until only the dark, wet grain of the stone shows.
2. **The storm hedge grafted:** Two torn boughs of blackthorn bound together with wet bast and river silt, holding firm against the gale where the garden’s boundary meets the void.
3. **A vow re-knotted:** An old pledge carried across the crossing spoken aloud before the court attendants, recorded not with ink but by a tight square knot pulled flush into oiled flax cord.
4. **Tea set for a stranger:** A shallow earthenware cup filled from the hearth crock and set steaming on the window-sill, emptied to the dregs without a question asked or an answer demanded.
5. **The low gate left unlatched:** The heavy white-cane bar left resting on its bracket through the third watch, allowing three frost-blinded travelers to stumble into the porch without beating on the timber.
6. **The ledger closed in green:** An account of an old family grievance ruled through with a single broad stroke of soft green chalk, then tied shut with split reed so it will not fall open again.

### 6 Changes

1. **Hands calloused to the thorn:** The tender skin of the palms replaced by a tough, yellow horn-grain that can grip wild blackthorn shoots without flinching or drawing blood.
2. **Pace matched to the water:** A hurried, scrambling city stride slowed step-by-step until the heel strikes the flags only when the ripple from the sluice touches the canal margin.
3. **An ear for the single bell:** The jumpy alertness of crowded market streets replaced by a quiet attention that rests inside the long, three-minute reverberation of the bronze bowl after the mallet lifts.
4. **Release of the ancestral roll:** The nervous habit of searching court records for family names set aside, leaving both hands empty and free to carry bread out to the threshold benches.
5. **Tolerance for cold limestone:** The body's instinct to shudder against damp stone giving way to a grounded, heavy stillness that can sit through another soul’s hours of silent grief.
6. **Breath steadied at the boundary:** The sudden panic that rises when looking into the chaotic void beyond the ditch settling into a low, measured rhythm behind the ribs.

### 6 Places

1. **The Twin Fountains terrace:** A broad expanse of weathered flagstones laid between two low circular limestone basins, where travelers pace the straight line between them until their vows stop racing.
2. **The Low Gate threshold:** An unadorned lintel of rough grey river stone hung with a wicket of woven cane, where every arriving traveler pauses in travel-stained cloth to meet the Gardener’s eyes.
3. **The Hall of Rolls:** An open-sided pavilion of salt-bleached cedar posts roofed with slate, where court attendants sit at long scrubbed trestles unrolling lengths of thumbed mulberry paper.
4. **The Storm Edge ditch:** A wide, sunken ditch of loose river gravel and dense briar that marks the outer boundary where the paved flagstones end and the unformed tempest begins.
5. **The Bell Pavilion:** A four-pillar cedar cupola sheltering the Bell That Rings Once, hung from cured rawhide so low that a seated listener’s forehead rests level with its rim.
6. **The Slow Water reach:** A shallow, straight canal walled with flat blue stones, whose current moves so imperceptibly that fallen willow leaves take half a morning to drift from the sluice to the lower weir.

---

## 4. People of the Garden

### 12 Generic People of the Garden

Authoring card templates for `person` rows in the Fantasy era should draw from these archetypes, gestures, and practical services. Names are short, grounded, and unadorned:

1. **Gate Listener (An):** Sits on the low mounting stone with knees pulled up to the chest; tilts their chin toward the latch when footsteps approach; hands the player a dry scrap of woolen cloth to wipe threshold mud from their face.
2. **Hedge Pruner (Dan):** Constantly wipes green sap from the hook of a pruning bill onto a stiff leather apron; points out where wild briars have rooted into flagstone cracks so the player can clear the footing.
3. **Roll Attendant (Sula):** Unrolls narrow strips of mulberry paper with steady thumbs without looking up; reads the player’s recorded habits aloud in a neutral, calm voice that strips them of pride and guilt.
4. **Water Tender (Mire):** Skims duckweed and fallen twigs from the slow canal using a split-wicker scoop; warns the player when the current has begun to back up against the stone sluice.
5. **Vow Walker (Kith):** Walks with eyes fixed three paces ahead, right thumb working a notched hemp cord at the sash; matches strides with the player for three laps between the fountains until their breathing falls into cadence.
6. **Tea Keeper (Renn):** Blows gently on charcoal embers beneath a battered iron kettle; slides a cracked earthenware cup of steaming root-tea across the hearth stones without asking who you were.
7. **Storm Watcher (Oris):** Leans against the bleached pine watch-post with one forearm shading their eyes against the glare of the void; signals when a squall threatens to tear through the outer wicker screens.
8. **Slate Scourer (Vanya):** Rinses slate memory tablets in a cedar tub of lime-water with a stiff horsehair brush; sets out a clean, dripping stone on the bench for the player to write upon.
9. **Bell Striker (Cor):** Stands motionless beside the cedar pillar with a cloth-wrapped mallet held against their breastbone; gives the player a brief nod just before striking the single noon note.
10. **Threshold Attendant (Jael):** Kneels on the damp flags folding discarded wet cloaks into tight bundles; takes the player’s drenched outer wrap and hangs it on the drying pegs by the flue.
11. **Seed Gatherer (Maren):** Shakes ripe blackthorn berries into a split-willow basket with thorn-scratched fingers; hands the player a scoop of hard black seeds to press into gaps along the northern hedge.
12. **Cane Joiner (Thess):** Trims strips of white river cane with a flat thumb-knife; replaces a cracked hinge pin on the player’s rule with a polished peg of green river-jade.

---

### How Tang / Buddhist Figures Appear in the Garden

`SPEC.md` §3 and `AGENTS.md` make clear: named figures (Buddhas, bodhisattvas, historical teachers, yakṣas) are permitted game content. However, the app **does not claim the authority of a sangha**: they never preach sermons, never evaluate the player’s soul, never award enlightenment points, and never act as remote deities.

In the Garden of Arrivals, they do not appear in gold leaf, behind altar rails, or amid imperial court ceremonies. They appear as embodied presences engaged in manual threshold labor:

- **Avalokiteśvara (Guanyin):** Appears not as an ornate porcelain statue, but as an attendant in coarse, water-soaked linen sitting silently on cold flagstones beside a traveler whose memories are tearing, offering warm tea and a steady hand without reciting doctrine.
- **Amitābha:** Not an enthroned emperor of a golden pure land, but the quiet, pervasive warmth in the high amber mist, or an architect whose measurements established the exact distance between the twin fountains so an agitated heart can find its pace.
- **Kṣitigarbha (Dizang):** Appears with a notched, iron-shod staff resting against the potting shed wall; he works down in the root cellars or wades into the thorny muck of the Storm Edge ditch to haul out travelers who stumbled before reaching the gate.
- **Yakṣas (Kumbhīra, Vajra, etc.):** Not ferocious temple guardians with theatrical painted fangs, but heavy-shouldered, quiet stone-masons and ditch-wardens who brace timber storm-screens against the void during a perimeter gale.

### 6 Garden-Native Figures with a Deed Each

Every named figure must DO a concrete deed that affects the physical reality of the place:

1. **The Gardener of the Notched Spade:** Leaned on the notched spade at the low gate when a traveler collapsed from shame, scraped dried yellow mud from the traveler’s boots with the spade’s edge, and pointed toward the hearth fire without speaking a word of reproach.
2. **Old Vanya of the Slates:** Placed her bare palms over a memory slate where a soldier had gouged the burning of his village, held it submerged in the slow canal until the chalk softened and drifted away, and stacked the cold stone clean on the drying rack.
3. **Elder Sula of the Fountains:** Replaced the cracked limestone lip of the southern basin during the fourth watch so vow-walkers would not catch their hems in the dark, tamping the joint flush with river silt and lime.
4. **The Bell Warden Cor:** Struck the bronze bell once when panic broke out among new arrivals at dawn, wrapping both arms around the vibrating rim to absorb the excess clang until only a low hum remained to steady the courtyard.
5. **Maren of the Storm Ditch:** Waded waist-deep into the freezing briar-wash of the outer ditch during an anguish squall to drag a thrashing traveler out onto the gravel bank by the waistband of their trousers.
6. **The Scribe Thess:** Ruled a broad stroke of soft green chalk across three generations of unpayable household debts in the Court ledger, torn the corner off the mulberry sheet, and tossed the scrap into the hearth charcoal.

---

## 5. Voice Differences: Five Sentence-Level Tells

A card written for the Garden of Arrivals must sound distinct from a Tang card on every line:

1. **What is measured vs. what is unmeasured:**
   - _Tang measures:_ Dynastic calendar years, market cash, copper taels, pecks of grain, hours of the drum tower, distance in li (`"four strings of copper cash"`, `"seventeen li from the south gate"`).
   - _Garden measures:_ Paces between fountain basins, the three-minute hum of a bronze bowl, how many hands mended a cloak peg, the depth of silt in the canal, or whether a knot holds under thumb-pressure.
2. **Sensory vocabulary and material nouns:**
   - _Tang nouns:_ Cast iron, lime kiln, brick floor, loess dust, mule dung, curdled pig fat, rice-wine jar, magistrate’s seal, wooden curfew tally.
   - _Garden nouns:_ River cane, jade pin, unbaked clay, blue slate, living hornbeam, blackthorn root, washed fleece, cold tea, slow water, threshold latch.
3. **The nature of urgency:**
   - _Tang urgency:_ Civic, legal, and financial peril: escaping the night patrol, paying the prefectural tax levy, arriving before the city gates bolt.
   - _Garden urgency:_ Maintenance of attention and transitional safety: preventing blackthorn from choking the flagged walks, steadying a mind whose recollections are shredding, keeping an old vow from turning bitter.
4. **Rhetorical posture:**
   - _Tang posture:_ Sharp, cynical social realism; transactional banter; weary tradesmen’s pragmatism (`"The clerk stamps the token off-center, the way a hand stamps when it is tired."`).
   - _Garden posture:_ Observant, intimate, grounded, slightly austere, without sermonizing or sentimentality (`"Nobody asked for the token. You took it anyway, and the weight of it has stayed in your pocket like a stone you meant to throw away and never did."`).
5. **Handling of contemplation and ethics:**
   - _Tang handling:_ Institutional religion, public monasteries, paid ordination certificates, incense donations, bell towers marking shifts.
   - _Garden handling:_ Contemplation as physical craft: scouring slate, testing cane joints, walking straight lines, listening without offering unsolicited remedies.

---

## 6. The "Do Not" List: Tang-isms to Avoid

Dev-b2 must never allow the following terms, concepts, or tropes into Garden of Arrivals card templates:

- **Toponyms & geography:** `Chang'an`, `Luoyang`, `the capital`, `Yellow River`, `Wei River`, `Huainan`, `city wards (fang)`, `imperial highway`.
- **Social roles & classes:** `Peasant`, `serf`, `tenant`, `landlord`, `magistrate`, `prefect`, `bailiff`, `imperial envoy`, `eunuch`, `courtesan`, `tax collector`, `muleteer`, `tavern-keeper`.
- **Commerce & currency:** `Tael`, `copper cash`, `strings of coin`, `granary receipts`, `pawnshop`, `market license`, `pecks`, `piculs`.
- **Civic & martial machinery:** `Curfew bell`, `curfew drum`, `night watchman`, `city gate patrol`, `yamen`, `bastinado`, `garrison`, `conscription register`.
- **Everyday agrarian & tavern life:** `Mule litter`, `pack ox`, `grain cart`, `tavern bench`, `wine jar`, `tallow dip`, `courtyard hound` (unless allegorical threshold animal), `pork fat`, `slatted paper window`.
- **Institutional religious apparatus:** `Monk certificates`, `abbot`, `temple donation box`, `temple estate`, `incense burner for merit`.

---

## 7. Pack Canon Direct Citations

For checking templates against existing authored strings in `src/content/packs/fantasy-mahayana/` and `src/i18n/en.json`:

| Concept                  | Pack File / Key                            | Verbatim Canon Line                                                                                                                                                                                                   |
| :----------------------- | :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Garden**           | `pack.json5:24`                            | `"The Garden of Arrivals (fictional)"`                                                                                                                                                                                |
| **Living Hedge**         | `practices.json5:17`                       | `"Mindful work in the Garden's living hedge; small trust gain per tick."`                                                                                                                                             |
| **Slow Gate**            | `practices.json5:34`                       | `"Sit at the Garden's slow gate and listen to arriving travelers; grants the patient-ear skill."`                                                                                                                     |
| **Twin Fountains**       | `practices.json5:51`                       | `"Walk the long path between the Garden's two fountains holding a vow in mind; restores energy."`                                                                                                                     |
| **Bell That Rings Once** | `practices.json5:68`                       | `"Sit where the Bell That Rings Once can be heard and rest the attention on its single note..."`                                                                                                                      |
| **Memory Stones**        | `practices.json5:86`                       | `"Place a hand on a memory stone and read what arrived with you..."`                                                                                                                                                  |
| **Slow Water**           | `practices.json5:103`                      | `"Walk beside the Garden's slow water and match its pace; restores energy."`                                                                                                                                          |
| **Gardener's Spade**     | `en.json:event.fantasy.gardener-question`  | `"The keeper of the garden leans on a notched spade at the gate, asking what burden you brought across the crossing."`                                                                                                |
| **Torn Memories**        | `en.json:event.fantasy.soul-in-torment`    | `"A newly arrived traveler shivers on the cold flagstones, gripping their head as old memories tear like wet paper."`                                                                                                 |
| **The Court's Reading**  | `en.json:event.fantasy.court-judgment`     | `"The Court unrolls the account of your deeds: tendencies, vows, attachments, and sudden turns laid bare like cloth on a table..."`                                                                                   |
| **Storm at Edge**        | `events.json5:322`                         | `"A disturbance gathers at the Garden's edge."`                                                                                                                                                                       |
| **Permanent Fade**       | `en.json:ending.fantasy.fade`              | `"The separate pattern that was you loosens into the Garden's larger rhythm. There is no fanfare, no destination named, no final word spoken. The stone bench where you sat grows quiet."`                            |
| **Gardener Blessing**    | `en.json:ending.fantasy.gardener-blessing` | `"The Gardener meets you at the edge where the Garden's pattern thins... A transformed vow is offered for the next chain: the old commitment, loosened and re-spoken, carried forward not as debt but as direction."` |

---

## 8. Five Uncertain Choices (For Lead & Operator Review)

1. **How to handle animals in the Garden:** Tang has the courtyard hound and canal mules. We deliberately excluded draft animals and guard dogs. Is it appropriate to have quiet, wild threshold creatures (e.g. river herons in the slow water, blackthorn finches in the hedge), or should the Garden remain strictly populated by souls, attendants, and the Gardener?
2. **Presence of the Court vs. Gardener:** The pack canon defines both the Gardener (warm, direct, manual) and the Court (administrative, reviewing cloth accounts, recording debts). We portrayed the Court not as a legalistic bureaucracy, but as an open-air stone pavilion of neutral roll-scriveners. Does this strike the right balance, or could the Court easily slip into a Tang magistrate's office if b2 is not vigilant?
3. **Degree of Mahāyāna figure visibility:** SPEC §3 allows named figures who act, while the original fantasy pack header noted "no named sacred figure appears in this pack". We reconciled this by establishing how figures like Guanyin, Amitābha, and Kṣitigarbha appear _in the vernacular of the Garden_ (manual labor, sitting on flags, ditch-hauling). Does dev-lead want them to appear as rare figure-cards in this era, or should Fantasy stick exclusively to Garden-native figures?
4. **Tea in an allegorical realm:** We kept tea (steaming root-infusion from coarse earthenware) because SPEC §3 demands sensory weight and tangible handling ("warm, specific, slightly occult-workshop"). Is tea sufficiently universal and grounding, or does it feel too closely tethered to East Asian domesticity?
5. **Vow tracking mechanism:** We introduced physical vow-cords (notched hemp with a silver thread) and green river-chalk on slates to represent the pack's `vow-enforcement` mechanic in card prose. Does this physical metaphor feel true to the "occult workshop" tone, or does it risk becoming too systematized?
