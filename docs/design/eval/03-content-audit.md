# Evaluation Lane b3: Content Depth and Voice Audit

**Date:** 2026-10-03  
**Auditor:** dev-b3 (`dev-b3@yakshetra-idle-game`)  
**Scope:** Complete inventory and textual audit of authored packs (`src/content/packs/tang-china/`, `src/content/packs/fantasy-mahayana/`), progression base (`src/content/progression/base/`), card catalogs (`src/engine/manifest-catalog.ts`, `manifest-catalog-figures.ts`), and localization (`src/i18n/en.json`).  
**Status:** Evaluation Phase (Read-only on engine/product code; report only).

---

## Executive Summary

1. **The Lead's Assumptions vs. Reality:** The evaluation brief estimated "~52 Tang + ~60 Fantasy" events. In reality, **there are exactly 7 Tang events and 7 Fantasy events in the entire repository** (`src/content/packs/tang-china/events.json5` and `src/content/packs/fantasy-mahayana/events.json5`). Three additional Tang events exist only as orphaned text keys in `src/i18n/en.json` (lines 1187–1228) and are never wired to data.
2. **The "Great Dormancy" (Dead Content):** Out of 1,046 player-facing strings in `en.json`, **229 strings (21.9%) are 100% dead code**. All 35 Tang figures (140 strings), all 10 Tang mantras (40 strings), and all 7 Tang sutras (49 strings) are loaded into data structures tested in CI, but **zero of them are ever rendered by any screen or component in `app/` or `src/ui/`**.
3. **The Unreachable Content Bottleneck:**
   - A campaign life lasts only **1 to 4 turns** (`time` starts at 1 for literati-official, 3 for merchant/artisan, 4 for peasant; `useEngineReducer.ts:105` terminates life at `time <= 0`). A player meets only **1 to 4 events in a life**, and **3 to 7 events across an entire 2-life chain**.
   - `app/life/` contains **no practices, no schedules, and no idle ticking**.
   - `app/studio.tsx` (the studio bench) hardcodes `benchSchedule(bench.practices)` with `practices.slice(0, 6)`. Only the first 6 Tang practices are ever scheduled. Practices 7 through 15 (including all three Pure Land / Medicine Buddha / Avalokiteśvara practices) and all 12 Fantasy practices **never tick, never level up, and never emit residue**.
4. **Voice Schism:**
   - The best strings (e.g. artisan practice descriptions, famine choices, bailiff encounters) are visceral, grounded, and tactile.
   - The weakest strings directly violate SPEC §2, §3, and §10: breaking the fourth wall to lecture the player that _"this game does not award merit"_ (`en.json:1120`, `1232`), leaking raw Jira/test jargon (_"Completing advisory onboarding (todo 0)"_, _"test the cross-life flow"_, _"Export life context JSON"_), or reducing spiritual fiction to mobile idle jargon (_"Catch-up stopped at the four-hour cap"_).
5. **The Disconnection of Residue to Harvest:** Residue events discard all narrative context. When a player resolves `hide_some` on `event:tang/grain-requisition`, the harvest does not produce grain, taxation, or rebellion; it registers a numeric `event_resolved` tick and rolls a generic card like _"The heavy oak postern propped open with an ash wedge"_. Figures and mantras do not shape the bench; they are decorative scaffolding.

---

## 1. Real Counts of Distinct Authored Beats and Screen Reach

### 1.1 Complete Content Inventory

| Category                  | Tang China (`tang-china`)                                 | Fantasy Mahāyāna (`fantasy-mahayana`)                             | Progression Base (`base/`)          | Total Authored     | Reaches Screen in Life Loop (`app/life/`) | Reaches Screen on Bench (`app/studio/`)          | Never Reaches Screen (Dormant)              |
| :------------------------ | :-------------------------------------------------------- | :---------------------------------------------------------------- | :---------------------------------- | :----------------- | :---------------------------------------- | :----------------------------------------------- | :------------------------------------------ |
| **Starting Roles**        | 4 (`literati-official`, `merchant`, `artisan`, `peasant`) | 3 (`newly-arrived-soul`, `court-attendant`, `vow-bound-traveler`) | 7 progression roles (`roles.json5`) | **14**             | 7 (player picks 1 per life)               | 0 (only person bench)                            | 7 progression roles                         |
| **Events**                | 7 (`events.json5`) (+ 3 orphaned in `en.json`)            | 7 (`events.json5`)                                                | 0                                   | **14** (+3 orphan) | 1–4 per life (max 7 across chain)         | 0                                                | 3 orphaned events (0%)                      |
| **Event Choices**         | 21 (3 per event)                                          | 21 (3 per event)                                                  | 0                                   | **42**             | 1–4 per life (max 7 across chain)         | 0                                                | 28+ choices never picked in a run           |
| **Practices**             | 15 (`practices.json5`)                                    | 12 (`practices.json5`)                                            | 0                                   | **27**             | **0** (no practices in `app/life/`)       | **6** (`practices.slice(0, 6)`)                  | **21** (77.8% of practices unreachable)     |
| **Daily Schedules**       | 9 (`schedules.json5`)                                     | 3 (`schedules.json5`)                                             | 0                                   | **12**             | **0**                                     | **0** (bench synthesizes dummy 6-block schedule) | **12** (100% of pack schedules unreachable) |
| **Endings**               | 4 (`old-age`, `illness`, `violence`, `starvation`)        | 4 (`fade`, `return`, `vow-bound`, `gardener-blessing`)            | 0                                   | **8**              | 1 per life (max 2 across chain)           | 0                                                | 6 endings per chain                         |
| **Named Figures (Pack)**  | 35 (`figures.json5`)                                      | 0 (empty `[]`, 14-line stub)                                      | 0                                   | **35**             | **0**                                     | **0**                                            | **35** (100% dead data)                     |
| **Mantras**               | 10 (`mantras.json5`)                                      | 0 (empty `[]`)                                                    | 0                                   | **10**             | **0**                                     | **0**                                            | **10** (100% dead data)                     |
| **Sutras**                | 7 (`sutras.json5`)                                        | 0 (empty `[]`)                                                    | 0                                   | **7**              | **0**                                     | **0**                                            | **7** (100% dead data)                      |
| **Minigames**             | 0 (empty `[]`)                                            | 0 (empty `[]`)                                                    | 0                                   | **0**              | **0**                                     | **0**                                            | 0                                           |
| **Card Catalogs (Kinds)** | N/A                                                       | N/A                                                               | 19 catalogs (`catalogs.json5`)      | **115 cards**      | 0                                         | ~3–10 cards per typical session                  | ~100+ cards behind unearned tier gates      |
| **Visitors**              | N/A                                                       | N/A                                                               | 6 (`visitors.json5`)                | **6**              | 0                                         | 1 active at a time (if unlocked)                 | 0                                           |
| **Compendium**            | N/A                                                       | N/A                                                               | 5 (`compendium.json5`)              | **5**              | 0                                         | Passive unlocks                                  | 0                                           |
| **Milestones**            | N/A                                                       | N/A                                                               | 7 (`milestones.json5`)              | **7**              | 0                                         | Passive gates                                    | 0                                           |

### 1.2 Life and Chain Turn Economy

The duration of a player's life is governed strictly by the `time` resource in `src/engine/turn.ts` and `src/ui/hooks/useEngineReducer.ts:105`:

```typescript
// useEngineReducer.ts:105
if ((withLensReset.resources.time ?? 0) <= 0) {
  return { ...withLensReset, alive: false };
}
```

Starting resources from `src/content/packs/tang-china/pack.json5`:

- `literati-official`: `time: 1` $\rightarrow$ **Exactly 1 turn**. The player picks 1 lens, resolves 1 event choice, and immediately dies.
- `merchant`: `time: 3` $\rightarrow$ **3 turns**.
- `artisan`: `time: 3` $\rightarrow$ **3 turns**.
- `peasant`: `time: 4` $\rightarrow$ **4 turns**.

In `fantasy-mahayana/pack.json5`:

- `newly-arrived-soul`: `time: 3` $\rightarrow$ **3 turns**.
- `court-attendant`: `time: 2` $\rightarrow$ **2 turns**.
- `vow-bound-traveler`: `time: 3` $\rightarrow$ **3 turns**.

Because `CHAIN_LIFE_COUNT = 2` (`src/ui/components/BardoView.tsx:54`), an entire campaign chain consists of exactly **two short lives**.

- In Life 1 (Tang), the player sees between **1 and 4 event cards** out of 7.
- In Life 2 (Fantasy), the player sees between **2 and 3 event cards** out of 7.
- **Across the entire chain, the player experiences at most 3 to 7 events total, 2 endings, and 0 practices.**

### 1.3 What Fraction Ever Reaches the Screen?

- **Figures, Mantras, and Sutras:** **0%**. 52 distinct authored items across `figures.json5`, `mantras.json5`, and `sutras.json5` have complete Zod schemas and 229 localization strings, but not a single component in `app/` or `src/ui/` imports or renders them.
- **Practices:** **22.2%**. Only 6 out of 27 practices ever tick on screen (`tang-china` practices 1–6). The remaining 9 Tang practices and all 12 Fantasy practices are unreachable.
- **Schedules:** **0%**. All 12 authored daily schedules in `schedules.json5` are bypassed in favor of an ad-hoc 6-slice generated by `benchSchedule()` in `app/studio.tsx:33`.
- **Localization Strings:** **~55% active**. Out of 1,046 leaf strings in `src/i18n/en.json`, 229 belong to inert sacred types, ~60 belong to unreachable practices and schedules, ~25 belong to orphaned events, and ~80 belong to high-tier milestone catalogs that require dozens of hours of offline idle progression to view.

---

## 2. Voice Audit vs. SPEC Section 3

SPEC §3 states:

> _"Tone of the fiction: warm, specific, slightly occult-workshop. Objects have weight. Names are allowed to land. Copy should feel like handling something, not like labeling a vitrine and not like a sermon."_

SPEC §2 and §10 add:

> _- "Not a karma accountant."_  
> _- "Do not lecture the player. No moral grade."_

### 2.1 The 10 Best Player-Facing Strings

These strings embody physical weight, sensory texture, historical grounding, and the quiet dignity of work:

1. **`tang.practice.workbench_carving.description_sid`** (`src/i18n/en.json:406`):
   > _"Planing wood, cutting dovetail mortises, and shaping brackets at the courtyard workbench."_  
   > _Why:_ Clean, concrete, tactile workshop reality. The verb choices ("planing", "cutting", "shaping") describe bodily craft without pretense.
2. **`event.tang.persecution-edict.label_sid`** (`src/i18n/en.json:1157`):
   > _"An imperial order comes down the road. Monastics are to be defrocked, statues broken, wandering monks returned to lay status. The order is written in the careful hand of someone who has never read a sutra."_  
   > _Why:_ Devastating characterization in a single sentence ("written in the careful hand of someone who has never read a sutra"). Grounded political pressure without hyperbole.
3. **`event.tang.famine-year.hoard.hint_sid`** (`src/i18n/en.json:1149`):
   > _"You nail the bin shut and answer the door less often. The provisions last; the goodwill does not. You will eat in winter; you will eat alone."_  
   > _Why:_ Brutal, spare, completely unsentimental. The physical action ("nail the bin shut") carries the full moral weight.
4. **`event.tang.conscripted-brother.pay_bribe.hint_sid`** (`src/i18n/en.json:1139`):
   > _"Three strings of coin in the officer’s sleeve and your brother’s name is written over. It is done; it is also done."_  
   > _Why:_ The sensory transaction ("Three strings of coin in the officer's sleeve") followed by weary, haunting finality ("It is done; it is also done").
5. **`tang.practice.lamp_tallow_gift.description_sid`** (`src/i18n/en.json:410`):
   > _"Providing clear tallow and pressed sesame oil to maintain the flame in the courtyard pagoda lantern."_  
   > _Why:_ Specific materials (clear tallow, pressed sesame oil) and a specific locus (courtyard pagoda lantern).
6. **`event.tang.sick-traveler.label_sid`** (`src/i18n/en.json:1107`):
   > _"On the road outside the village, a traveler sits under a persimmon tree, forehead burning and lips dry. They look up but cannot rise."_  
   > _Why:_ Sensory and immediate. A persimmon tree, dry lips, burning heat—names and places allowed to land.
7. **`event.tang.grain-requisition.comply.hint_sid`** (`src/i18n/en.json:1097`):
   > _"You give what is asked without delay. The scroll is marked satisfied, the bailiff bows, and the household eats thinner through the rest of the season."_  
   > _Why:_ Directly connects administration ("scroll is marked satisfied") to bodily consequence ("eats thinner").
8. **`visitor.traveling_teacher.line_sid`** (`src/i18n/en.json:303`):
   > _"She corrects one motion and the whole day shortens."_  
   > _Why:_ Pure workshop economy. Not a sermon on enlightenment; a master craftsman adjusting posture at the bench.
9. **`tang.role.artisan.description_sid`** (`src/i18n/en.json:343`):
   > _"You shape timber, stone, and tile with your hands, measuring each cut against grain, balance, patience, and the daily needs of the courtyard."_  
   > _Why:_ Dignified labor anchored in physical materials.
10. **`visitor.gate_yaksa.line_sid`** (`src/i18n/en.json:298`):
    > _"It watches the yard and the work goes faster."_  
    > _Why:_ Folkloric, warm, slightly occult. The spirit is not a boss or a judge; it simply keeps the yard.

---

### 2.2 The 15 Weakest Player-Facing Strings

These strings fail by preaching, breaking character, lecturing the player, exposing system plumbing, or lapsing into abstract, bloodless allegory:

1. **`event.tang.corrupt-donation-demand.give.hint_sid`** (`src/i18n/en.json:1120`):
   > _"You hand over the coin. The framing of “accumulating merit” sits uneasy — this game does not award such a thing; what remains is the gesture, the loss, and the question it left behind."_  
   > _Failure:_ **Direct 4th-wall sermon.** The writer breaks the fiction to lecture the player on the design team's ethical manifesto ("this game does not award such a thing").
2. **`event.tang.card.corrupt-donation-demand-give-commodification_sid`** (`src/i18n/en.json:1232`):
   > _"The older monastic smiled as the coin changed hands. The teaching spoke of accumulating merit; this game does not award merit. What was given was given; what remains is the gesture, the lighter purse, and the question it left behind."_  
   > _Failure:_ **Repeated authorial intrusion.** Verbatim restatement of the design rule on a player-facing card.
3. **`life.start.unavailable_body_sid`** (`src/i18n/en.json:37`):
   > _"Completing advisory onboarding (todo 0) before content authoring can begin."_  
   > _Failure:_ **Internal roadmap leak.** Refers to the retired advisory panel and an engineer's "todo 0" on a public screen.
4. **`life.turn.no_era_body_sid`** (`src/i18n/en.json:65`):
   > _"End this life early to reach the bardo and test the cross-life flow."_  
   > _Failure:_ **QA instruction as player fiction.** Directly asks the player to "test the cross-life flow."
5. **`event.fantasy.court-judgment.card.accept-reading-summary_sid`** (`src/i18n/en.json:1288`):
   > _"The Court gathers tendencies, vows, attachments, and breaks without turning them into a score."_  
   > _Failure:_ **Defensive game-design lecturing.** The narrative character explains that it refuses to be an RPG point system.
6. **`life.turn.manifest_charge_sid`** (`src/i18n/en.json:70`):
   > _"This life is charging Manifest."_  
   > _Failure:_ **System jargon.** "Manifest" used as an abstract, capital-M energy meter.
7. **`studio.export_life_sid`** (`src/i18n/en.json:196`):
   > _"Export life context JSON"_  
   > _Failure:_ **File-format UI label.** Exposes raw data serialisation ("JSON") on an in-game action button.
8. **`compendium.five_harvests.desc_sid`** (`src/i18n/en.json:290`):
   > _"Five common cards. A sixth slot opened on the bench."_  
   > _Failure:_ **Mobile Gacha jargon.** "Common cards" and "sixth slot" sound like a freemium deckbuilder, destroying workshop immersion.
9. **`studio.away_capped_sid`** (`src/i18n/en.json:143`):
   > _"Catch-up stopped at the four-hour cap."_  
   > _Failure:_ **Unvarnished server policy jargon.**
10. **`bardo.no_echoes_sid`** (`src/i18n/en.json:938`):
    > _"No echoes were detected. The next life begins unburdened."_  
    > _Failure:_ **Sci-fi sensor phrasing.** "No echoes were detected" sounds like a submarine sonar ping.
11. **`event.fantasy.soul-in-torment.label_sid`** (`src/i18n/en.json:1244`):
    > _"An arriving being is caught in anguish."_  
    > _Failure:_ **Bloodless vitrine abstraction.** Who is the being? What is the anguish? It reads like a textbook case study.
12. **`event.fantasy.soul-in-torment.hint.attempt-to-soothe_sid`** (`src/i18n/en.json:1248`):
    > _"Try to make the anguish settle into a shape you can fix."_  
    > _Failure:_ **Pop-psychology therapy jargon.**
13. **`event.fantasy.forgotten-name.card.seek-in-court-records-continuity_sid`** (`src/i18n/en.json:1264`):
    > _"The record offers dates and marks, but no proof that a self can be held there."_  
    > _Failure:_ **Philosophical lecturing.** Tells the player what to realize instead of presenting an experience.
14. **`studio.charge_ready_sid`** (`src/i18n/en.json:79`):
    > _"Enough residue to develop"_  
    > _Failure:_ **Software compiler jargon.** Combines "residue" and "develop" into an engineering pipeline status code.
15. **`compendium.househeld.desc_sid`** (`src/i18n/en.json:286`):
    > _"A tradition answered to the door."_  
    > _Failure:_ **Vague pseudo-profound wordplay.** Grammatically strained and fictionally empty.

---

### 2.3 UI Jargon Taxonomy

Player-facing text in `en.json` frequently slips into engineering terminology. Below is a taxonomy of flagged terms currently seen by players:

| Jargon Term          | Occurrences | Example Player-Facing String                                                                          | Recommended Workshop Replacement                               |
| :------------------- | :---------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **"JSON"**           | 3 strings   | `"Export life context JSON"` (`L196`), `"Export world JSON"` (`L162`), `"Export latest JSON"` (`L96`) | _"Copy life chronicle"_, _"Record world scroll"_               |
| **"Residue"**        | 8 strings   | `"Enough residue to develop"` (`L79`), `"Residue {n} / {min}"` (`L78`)                                | _"Charcoal"_, _"Shavings"_, _"Traces"_, _"Gathered work"_      |
| **"Develop"**        | 3 strings   | `"Enough residue to develop"` (`L79`), `"Cook the bench's window"` (`L203`)                           | _"Cook"_, _"Fire the kiln"_, _"Set to simmer"_                 |
| **"Window"**         | 2 strings   | `"Cook the bench's window"` (`L203`), `"The table is not its own for a few windows"` (`L312`)         | _"Batch"_, _"Working"_, _"Season"_                             |
| **"Tier"**           | 6 strings   | `"Growing toward {tier}"` (`L222`), `"Harvest {tier}"` (`L201`), `"Endow a card on {tier}"` (`L205`)  | _"Rung"_, _"Horizon"_, _"Scale"_                               |
| **"Card / Slot"**    | 6 strings   | `"No cards of that kind yet"` (`L94`), `"A card came off the bench"` (`L278`), `"No slot"` (`L159`)   | _"Workings"_, _"Keepsakes"_, _"Tokens"_, _"Room at the bench"_ |
| **"Catch-up / Cap"** | 1 string    | `"Catch-up stopped at the four-hour cap"` (`L143`)                                                    | _"The fire burned down after four hours"_                      |
| **"Flow / Todo"**    | 2 strings   | `"test the cross-life flow"` (`L65`), `"advisory onboarding (todo 0)"` (`L37`)                        | (Delete developer placeholders completely)                     |

---

## 3. Repetition and Structural Formats

### 3.1 Structural Formula of the Original Catalogs

Prior to the uncommitted git changes in `src/engine/manifest-catalog.ts`, every card across `THINGS`, `OUTCOMES`, `CHANGES`, and `PLACES` adhered to an identical three-sentence fortune-cookie formula:

1. **Sentence 1 (Aphorism):** A paradox or minimalist poetic claim (_"A small mark that still holds a decision"_, _"Something you no longer have to carry"_, _"A room that used to be a well"_).
2. **Sentence 2 (Restatement):** An abstract summary (_"Work pressed a choice into something you can hold"_, _"The work filed an edge off the day"_, _"Echoes arrive late"_).
3. **Sentence 3 (Philosophical coda):** A moral resolution with zero sensory detail (_"It is quiet, and it is finished"_, _"The next hour has more room in it"_, _"The empty place is the point"_).

### 3.2 Impact of the Uncommitted Catalog Rewrite

The pending diff on `manifest-catalog.ts` and `catalogs.json5` replaces these abstractions with exceptional material specificity:

- _"Sealed token"_ becomes a stamped lead granary token earned at the river weigh-scales, tucked into a laborer's sash.
- _"Worn ledger"_ becomes a hemp-stitched account book of mulberry paper thumbed dark by oil lamp and well-water.
- _"Folded measure"_ becomes a six-fold carpenter's rule of seasoned boxwood with flat brass pins and imperial/river notches.
- _"The night market"_ becomes canal-side stalls with grease-blackened awnings, blacksmiths selling recycled ship nails, and herb women weighing dried aconite against pebbles.
- _"The clock attic"_ becomes copper clepsydras and bronze gears measured by an apprentice sleeping on an oat-straw pallet.

### 3.3 What the Rewrite Left Unfixed: Extreme Pool Scarcity

While the prose quality of individual entries improved dramatically, **the pool depth did not increase by a single card**:

- `THINGS`: **6 entries**
- `OUTCOMES`: **6 entries**
- `CHANGES`: **5 entries**
- `PLACES`: **6 generic + 2 figure = 8 entries**
- `PEOPLE`: **8 generic + 12 figure = 20 entries**
- All 14 higher progression kinds: **exactly 5 entries each**

**The Mathematics of Harvest Repetition:**

- If a player levels up a practice, `pickKindFromRegistry` selects `change`.
- There are only 5 `change` cards in the catalog.
- **By harvest 3, the probability of drawing a duplicate card exceeds 36%.**
- **By harvest 7, duplicates are statistically guaranteed (over 85% probability).**
- In a typical play session of 10 harvests, players repeatedly harvest the exact same _"Lighter pack"_ and _"Sharper ear"_ cards.

### 3.4 The Repetitive "Run-On Paragraph" Template

In `src/engine/manifest.ts:237`, card details are assembled by string concatenation:

```typescript
detail: `${entry.detail}${briefNote}${focusNote}${settingNote}${tieNote}${activityEval.note}${qualityNote}`;
```

This causes every single card in the archive to terminate in the exact same repetitive boilerplate:

> _"... It is year 742 in tang-china. Closest tie: Abbot Huike. The days were shaped by physical craft and patient labor. The work went long enough to leave a second mark."_

Rather than integrating the player's life context into the card's narrative, the engine staples an identical run-on paragraph onto the end of authored descriptions.

---

## 4. Missing Content Promised by the Fiction

The SPEC promises a living world of Buddhist and Tang figures, economic and communal stakes, and a world draft assembled from rich relationships. None of these systems currently have the content they need to function.

```
+-------------------------------------------------------------------------------+
|                        THE MISSING CONTENT GAP                                 |
+-------------------------------------------------------------------------------+
| PROMISED IN SPEC                 | CURRENT STATUS      | SIZED CONTENT NEEDED |
+----------------------------------+---------------------+----------------------+
| 1. Named figures who ACT         | 0 acting figures    | 16–20 active events  |
| 2. Patrons & Opponents           | 0 patrons/opponents | 10–12 named NPCs     |
| 3. Tang & Buddhist Geography     | 8 isolated cards    | 16–24 linked sites   |
| 4. World Draft Dynamic Tensions  | 0 (uses card titles)| 12–16 tension beats  |
| 5. World Draft Relational Bonds  | Flat ID pairs       | 10–12 bond templates |
| 6. Playable Mantras & Recitations| 10 dead JSON rows   | 6–8 active practices |
+-------------------------------------------------------------------------------+
```

### 4.1 Detailed Breakdown of Missing Types

1. **Named Figures Acting in Encounters (Sizing: 16–20 Events):**
   - _Fiction:_ SPEC §11 and §16.1 promise named figures (Guanyin, Dizang, Bodhidharma, Shakyamuni, courtyard yakṣas) who _do something_—demanding hospitality, inspecting books, testing endurance, or walking with the player.
   - _Current Reality:_ Zero named figures appear in any event. The events are populated entirely by anonymous stock types ("a bailiff", "a traveler", "an older monastic").
   - _Requirement:_ 16–20 narrative events across tiers where figures act as unpredictable agents with distinct motivations.

2. **Patrons and Opponents (Sizing: 10–12 Named Figures):**
   - _Fiction:_ SPEC §3 promises "patrons, opponents" who provide material tension and economic stakes.
   - _Current Reality:_ Economic life consists solely of an abstract "Market Shift" button paying 1 copper. There are no competing workshops, no demanding patrons commissioning altars, no hostile tax inspectors, and no rival guilds.
   - _Requirement:_ 6 named patrons offering commissions and protection, and 6 named opponents presenting institutional, legal, or guild obstacles.

3. **Grounded Places and Travel (Sizing: 16–24 Linked Sites):**
   - _Fiction:_ SPEC §1 and §4 promise that "people and places assemble into a world."
   - _Current Reality:_ Only 8 person-scale places exist in the catalog. In narrative events, there is no spatial presence—no distinction between the West Market, the Southern Suburbs, the canal docks, or mountain hermitages.
   - _Requirement:_ 16–24 specific historical and sacred locations with distinct tags, environmental pressures, and associated crafts.

4. **Authentic Tensions for World Drafts (Sizing: 12–16 World Tensions):**
   - _Fiction:_ SPEC §4 describes assembling a world draft with "name, line, cast, places, tensions, bonds."
   - _Current Reality:_ In `src/engine/world-draft.ts:80-82`, tensions are literally just whatever `outcome` and `change` cards exist in the archive:
     ```typescript
     const tensions = archive
       .filter((card) => card.kind === 'outcome' || card.kind === 'change')
       .map(member);
     ```
     This results in world drafts where the "tensions" are cards like _"A slower morning"_ or _"A habit of returning"_.
   - _Requirement:_ 12–16 authored tension archetypes (e.g. _"Canal silting threatens granary shipments"_, _"Unlicensed bronze-casters evading imperial monopolists"_, _"Monastery sheltering unregistered refugees from the frontier"_).

5. **Relational Bonds for World Drafts (Sizing: 10–12 Bond Archetypes):**
   - _Fiction:_ SPEC §4 step 5 promises "two people who need somewhere to stand, becomes a world draft."
   - _Current Reality:_ A bond in `world-draft.ts:92` is merely an empty link: `{ card_id, card_name, about_id, about_name }`. It contains no relationship verb, no history, and no narrative friction.
   - _Requirement:_ 10–12 structured bond types (e.g. _"apprenticed under"_, _"harbors a mutual secret from the bailiff"_, _"competes for the same timber concession"_, _"holds a shared vow to rebuild the flood weir"_).

6. **Playable Mantra and Recitative Practices (Sizing: 6–8 Active Practices):**
   - _Fiction:_ SPEC §11 and §16.1 promise real mantras and seed syllables integrated into daily life.
   - _Current Reality:_ All 10 mantras in `mantras.json5` are dead data.
   - _Requirement:_ 6–8 recitative practices that can be slotted into daily routines, emitting distinct `mantra:*` residue that can be recognized by the compiler.

---

## 5. End-to-End Tracing: Decoration vs. Mechanical Impact

### 5.1 Trace Case A: Resolving a Life Event $\rightarrow$ Studio Harvest

Let us trace what actually happens when a player plays an event in `app/life/[lifeId].tsx` and takes that residue to the studio bench in `app/studio.tsx`.

```
[Life Screen: Turn 1]
       |
       v
Player chooses "careful_conduct" lens
  --> intendLens() emits ResidueEvent:
      { tick: 1, type: 'lens_chosen', ids: ['careful_conduct'], numbers: {} }
       |
       v
Act phase surfaces event:tang/grain-requisition
Player chooses "hide_some" ("Hide a portion in the back of the storehouse")
  --> applyChoice() applies effects (-1 provisions, flag: hid_grain_from_magistrate)
  --> recordLifeResidue() emits ResidueEvent:
      { tick: 1, type: 'event_resolved', ids: ['hide_some'], numbers: {} }
       |
       v
[Life ends after turn 1-4; player navigates to /studio]
       |
       v
usePlayResidueBridge calls importPlayResidue()
  --> Both ResidueEvents are appended to studio.pending_residue
       |
       v
Player clicks "Tend" (adds 1 practice tick) --> Total 3 events in pending_residue
Player clicks "Develop" --> bay cooks for 8 ticks
Player clicks "Harvest"
       |
       v
tableFillManifest(window) executes:
  1. summarizeResidue(window):
     typeCounts: { lens_chosen: 1, event_resolved: 1, practice_tick: 1 }
     ids: ['careful_conduct', 'hide_some', 'practice:tang/alms-round']
     dominantType: 'event_resolved' (via TYPE_ORDER tie-break)
  2. pickKindFromRegistry:
     Rule: { kind: 'outcome', match: { dominant: 'event_resolved' } }
     --> kind = 'outcome'
  3. figureCandidates(summary, catalog):
     Scans catalog for 'figure:*' tags matching summary.ids.
     'careful_conduct', 'hide_some', and 'practice:tang/alms-round' MATCH NOTHING.
     --> candidates = []
  4. entry = rng.pick(CATALOG['outcome']):
     Catalog has 6 entries. RNG picks: "A door that stays open".
  5. subject formatting:
     subjectId = summary.ids[0] = 'careful_conduct'
     --> subject = "an opening that held (careful_conduct)"
  6. Detail formatting:
     Concatenates catalog detail + setting + activity flavor.
```

**Resulting Manifest Card Harvested:**

- **Name:** _"A door that stays open"_
- **Kind:** `outcome`
- **Subject:** _"an opening that held (careful_conduct)"_
- **Detail:** _"A heavy oak postern propped open with an ash wedge, letting late carters slip in past the curfew bell. The iron drop-bolt stays greased and lifted while the market patrol marches past the end of the lane. Anyone coming cold off the river packet finds the threshold swept and the latch-string hanging out on the public side. It is year 742 in tang-china. The days were marked by open hands and shared portions."_

**Forensic Finding:**

- The grain requisition, the bailiff, the magistrate's tax, the decision to hide food, and the risk of neighbor betrayal **completely disappeared**.
- The event resolution choice (`'hide_some'`) was flattened into a numeric tally mark (`typeCounts.event_resolved = 1`).
- The player receives a card about an oak door at a canal curfew that has zero semantic connection to what happened in their life.
- **Events do not feed the bench; they merely increment an anonymous kind counter.**

---

### 5.2 Trace Case B: Mantras and Named Figures $\rightarrow$ Studio Harvest

SPEC §16.1 outlines a system where practicing nianfo or honoring a figure leads to a harvested card representing that figure (e.g. Amitābha or Avalokiteśvara). Let us trace the execution path in the code:

1. **Can a player recite a mantra to emit residue?**
   - **No.** Mantras in `src/content/packs/tang-china/mantras.json5` have no engine hooks. No screen has a "recite mantra" action. No engine function emits `mantra:*` into a `ResidueEvent.ids` array.
2. **Can an event emit a figure id to trigger `figureCandidates`?**
   - **No.** Events only emit choice IDs (e.g. `ids: ['comply']`). No event emits `figure:*`.
3. **Can idle practices emit a figure or mantra tag?**
   - In `manifest-catalog-figures.ts:41-84`, three catalog rows carry practice tags:
     - Amitābha carries `practice:tang/nianfo-recitation`
     - Bhaiṣajyaguru carries `practice:tang/medicine-rite`
     - Avalokiteśvara carries `practice:tang/six-syllable-recitation`
   - In theory, when one of these practices ticks, `idle.ts:175` emits `ids: [practice.id]`, which `figureCandidates()` matches to harvest the Buddha or Bodhisattva.
4. **Does this ever occur in the actual game?**
   - **No.**
   - In `app/studio.tsx:33-44`, the studio schedule is initialized as:
     ```typescript
     function benchSchedule(practices: readonly Practice[]): DailySchedule {
       const blocks = practices.slice(0, 6).map((practice, index, all) => { ... });
     ```
   - `bench.practices` is loaded from `tang-china/practices.json5`.
   - The practices array has 15 items:
     - Index 0: `alms-round`
     - Index 1: `sutra-copying`
     - Index 2: `breath-sitting`
     - Index 3: `extra-bowl`
     - Index 4: `courtyard-beings`
     - Index 5: `evening-visit`
     - **Index 6: `nianfo-recitation`**
     - **Index 7: `medicine-rite`**
     - **Index 8: `six-syllable-recitation`**
   - Because `benchSchedule()` slices only the **first 6 items**, practices 6, 7, and 8 are **never scheduled**.
   - There is no practice selector or schedule configuration UI in `StudioView.tsx`.
   - Consequently, `nianfo-recitation`, `medicine-rite`, and `six-syllable-recitation` **never tick, never gain progress, and never emit residue**.
5. **What about the other 9 figures in `manifest-catalog-figures.ts`?**
   - Śākyamuni, Vairocana, Maitreya, Mañjuśrī, Samantabhadra, Kṣitigarbha, Mahāsthāmaprāpta, Nāgārjuna, and Bodhidharma have **zero practices and zero events tagged to them anywhere in the codebase**.
   - They can never match `figureCandidates()`.
   - The only way they can ever be harvested is if `summary.dominantType` happens to roll `person`, causing `rng.pick(entries)` to randomly select their row out of 20 candidates.
   - When selected this way, `figureAbout` is `null`, `manifest.about_id` is omitted, and the figure appears as a completely generic person card with no focus binding.

**Forensic Finding:**

- Figures, mantras, and sutras are **100% decorative scaffolding**.
- Even the single intended mechanical bridge between Tang practices and figure harvest is broken by a hardcoded `slice(0, 6)` in the studio route.

---

## 6. Recommendations for Build Wave

To transform Yakshetra from a hollow scaffold into an engaging game that fulfills its own constitution:

1. **Unify Life and Studio Around the Workbench:**
   - Eliminate the disconnected 3-turn life death loop. Life should not be a disposable 3-turn questionnaire that dumps generic residue onto a detached bench.
   - Let daily practices and workbench activities be accessible and visible within the active life, sharing a single coherent loop.
2. **Commit and Expand the Material Catalog:**
   - Commit the uncommitted diff on `manifest-catalog.ts` immediately—its material, tactile prose is the true voice of the game.
   - Triple the catalog size from 5–6 cards per kind to at least 18–24 cards per kind to eliminate the suffocating harvest duplicate rate.
3. **Connect Figures Directly to Active Encounters:**
   - Write 12–16 narrative events in which named figures (Guanyin, Dizang, Bodhidharma, local yakṣas) physically appear as guests, overseers, or travelers.
   - Have event choices emit distinct tags (e.g. `figure:avalokiteshvara`, `mantra:six-syllable`) directly into residue so that life decisions explicitly shape what the bench harvests.
4. **Purge System Jargon and Moralizing Sermons from Localization:**
   - Rewrite the 15 weakest strings. Remove all fourth-wall lectures (_"this game does not award merit"_).
   - Strip engineering artifacts (_"JSON"_, _"todo 0"_, _"cross-life flow"_, _"four-hour cap"_, _"charging Manifest"_).
5. **Replace Pseudo-Tensions in World Drafts with Living Friction:**
   - Stop aliasing `outcome` and `change` cards as world tensions.
   - Author a dedicated registry of 12–16 authentic world conflicts (water rights, tax edicts, kiln wood shortages, monastic sanctuary disputes) that compile dynamically from the player's archive.
