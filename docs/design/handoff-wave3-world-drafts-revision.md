# Handoff: World Draft Revision (Wave 3, Lane b3)

## 1. Defect 1: Elimination of Name/Line Splice (Rule 1)

### Red Evidence

11 templates across `household`, `org`, `town`, `city`, and `region` contained unindexed `{line}` tokens where `{line}` was substituted with card 2's sentence, while `{name}` was card 1's name. This resulted in card 1's name being followed by card 2's sentence (e.g. Draft 10: _"The workshop took form around the celadon glazes: A six-fold boxwood rule..."_ where the sentence belonged to _Six-leaf rule_, not _The celadon glazes_).

Unit test failure before fix:

```
FAIL src/engine/__tests__/world-draft.test.ts > assembleWorldDraft > Rule 1: for every template and every scale, whenever a card is named, its own sentence immediately follows
AssertionError: Templates where card name is followed by the other card sentence:
[household] "Around {name}, a household holds together: {line}."
[household] "{name} anchors the home: {line}."
[org] "The workshop took form around {name}: {line}."
[org] "Through {name}, the guild found its footing: {line}."
[town] "The town gathered around {name}: {line}."
[town] "Where the parish lanes meet at {name}: {line}."
[town] "{name} marks the town crossing: {line}."
[city] "From {name} across the city wards: {line}."
[city] "Anchored by {name}: {line}."
[region] "Out where {name} carries: {line}."
[region] "{line1} — extending as far as {name}: {line2}."
```

### Fix

- In `src/engine/world-draft-templates.ts`:
  - Removed all unindexed `{line}` tokens.
  - Rewrote all 11 spliced templates to strictly place `{line1}` (card 1's sentence) immediately following `{name}` (card 1's name), followed by `{line2}` (card 2's sentence).
- In `src/engine/world-draft.ts`:
  - Removed `{line}` substitution logic entirely.

### Green Evidence

- In `src/engine/__tests__/world-draft.test.ts`:
  - `Rule 1: for every template and every scale, whenever a card is named, its own sentence immediately follows` passed 100%.
- Draft 10 now renders:
  > _The workshop took form around the celadon glazes: Greens the kiln finds once in twenty firings. Across the benches: A six-fold boxwood rule with flat brass pins, unhurried in the hand, and the only straight edge in the workshop._

---

## 2. Defect 2: Person-Scale Lines Name Person & Omit Filler Tails (Rule 2)

### Red Evidence

In Drafts 1, 2, 7, and 8, person cards were never named in the world line, leading to orphan pronouns ("He works his abacus...", "He leans out from the west...") or missing actors. Additionally, frames contained filler tails ("life carries on", "The morning gathers about...", "the day unfolds").

Unit test failure before fix:

```
FAIL src/engine/__tests__/world-draft.test.ts > assembleWorldDraft > Rule 2: person-scale lines name the person and use their card words without filler tails
AssertionError: expected 'Near canal-side stalls after curfew: …' to contain 'Shen the night clerk'
Expected: "Shen the night clerk"
Received: "Near canal-side stalls after curfew: He works his abacus by tallow dip, noting tea and grain before you recall what was spent."
```

### Fix

- In `src/engine/world-draft-templates.ts`:
  - Authored 10 clean `personWithPlace` frames:
    1. `{person} is at {place}: {line}.`
    2. `At {place}, {person}: {line}.`
    3. `{person}, found at {place}: {line}.`
    4. `By {place}, {person}: {line}.`
    5. `{person} keeps to {place}: {line}.`
    6. `Down at {place}, {person}: {line}.`
    7. `{person} stays close to {place}: {line}.`
    8. `Near {place}, {person}: {line}.`
    9. `Out at {place}, {person}: {line}.`
    10. `{person} at {place}: {line}.`
  - Zero filler tails.
  - Strict naming of person (`personCard.name`), place (`placeCard.name`), and person action in their own authored words (`personCard.one_liner`).
- In `src/engine/world-draft.ts`:
  - Populates `{person}` with `personCard.name` and `{place}` with `withLowerArticle(placeCard.name)`.

### Green Evidence

- In `src/engine/__tests__/world-draft.test.ts`:
  - `Rule 2: person-scale lines name the person and use their card words without filler tails` passed 100%.
  - `no phrasing frame appears on >25% of drafts in a 40-draft sample, with at least 6 distinct frames` passed 100%.

---

## 3. Test & Golden Updates

1. `src/engine/__tests__/world-draft.test.ts`:
   - Added Rule 1 & Rule 2 test suites.
   - Updated frame normalization in 40-draft sample test.
   - Updated Buddhist figure test expectation to match place name.
2. `src/engine/__tests__/world-scale.test.ts`:
   - Line 117 (town): Updated golden from spliced `'Where the parish lanes meet at the west bridge: Lantern night waits.'` to `'Where the parish lanes meet at the west bridge: The west bridge waits. Down the high lane: Lantern night waits.'`.
   - Line 140 (org world1): Updated golden from spliced `'Through the counted yard, the guild found its footing: The tally master waits.'` to `'Through the counted yard, the guild found its footing: The counted yard waits. In the yard: The tally master waits.'`.
3. `src/engine/__tests__/chronicle.test.ts`:
   - 13 / 13 passed without changes.
4. `src/engine/__tests__/eval-drafts.test.ts`:
   - 1 / 1 passed verbatim.

---

## 4. The 12 Reprinted World Drafts

Printed verbatim from `docs/design/eval/09-world-drafts.md`:

### Tang Era

1. **Person Scale — The night market**
   - _Line_: By the night market, Shen the night clerk: He works his abacus by tallow dip, noting tea and grain before you recall what was spent.
2. **Person Scale — The river stair**
   - _Line_: Down at the river stair, Amitābha: He leans out from the west with an open palm, and it is not the gesture you expect.
3. **Household Scale — The dumpling fold**
   - _Line_: A household gathered by quiet habit: A pinch the family passes before the new year. The plank that holds up the room where everyone argues.
4. **Org Scale — The weavers' charter**
   - _Line_: Along the row of benches: One width of cloth, one price, sworn before the looms. In the yard: Every tile on the hall carries the same thumb-wide seal.
5. **Town Scale — The bell tower at dusk**
   - _Line_: A town shaped by common days: The town tells its time by a tower with no clock face. The whole town spends a day agreeing on the number.
6. **City Scale — The watch's muster hall**
   - _Line_: The room where the city's lanterns line up before dusk. Past the muster gates: Where a hungry household learns whether the city remembers it.

### Fantasy Era (The Garden of Arrivals)

7. **Person Scale — The Bell Pavilion**
   - _Line_: Cor, the bell striker stays close to the Bell Pavilion: Still at the cedar pillar, mallet held in, giving the nod before the one note.
8. **Person Scale — The Twin Fountains terrace**
   - _Line_: Mire, the water tender, found at the Twin Fountains terrace: Skimming the slow reach and watching the current at the sluice.
9. **Household Scale — The needle case**
   - _Line_: By the shared hearth: A bamboo tube with three needles and a story per slot. Across the threshold: A brown earthenware bowl kept by the pot and not in the cupboard, for whoever turns up after the household has eaten.
10. **Org Scale — The celadon glazes**

- _Line_: The workshop took form around the celadon glazes: Greens the kiln finds once in twenty firings. Across the benches: A six-fold boxwood rule with flat brass pins, unhurried in the hand, and the only straight edge in the workshop.

11. **Town Scale — The unlisted quay**

- _Line_: A hidden stone wharf tucked behind weeping willows where uninspected barges discharge their cargo before dawn — where the town bells reach: Oiled paper lanterns strung along the canal wire before dusk settles.

12. **Region Scale — The southern ridge**

- _Line_: From mountain pass to waterway: The black heads split above the ridge and went on south, and your drying mats got nothing. A cold track through limestone where carts must drop their trailing axle.

---

## 5. Verification

- `pnpm tsc --noEmit`: 0 errors
- `pnpm lint`: 0 errors, 1 unrelated pre-existing test warning
- `env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER pnpm test`: 141 test files passed, 1513 tests passed, 0 failed
- `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 pnpm exec expo export --platform web`: 10 static routes, 0 errors
- Engine purity: 0 Date, 0 Math.random, pure TypeScript, all files under 250 lines
