# Choice Outcome and Journal Fields

How choices in event packs specify per-choice narrative outcomes and journal memories, and how the turn resolution screen renders them.

---

## 1. Context and Problem

In the life turn flow, after a player selects an action (e.g. _Generosity — "Bring them in and tend to them"_), the game transitions into the **Reflect** phase (`ReflectCard`).
Previously, the outcome card displayed:

- **WHAT HAPPENED**: `"Something quietly shifts."` (`event.default.consequence_sid`)
- **WHAT YOU CARRY**: `"The moment passes, carrying its weight forward into what comes next."` (`event.default.journal_sid`)

This generic fallback pair was rendered for every single choice in the game because the event choice schema (`ChoiceSchema`) had no dedicated outcome prose fields. Authored situations and choices are specific and evocative, but their resolution was reduced to a generic response.

---

## 2. Schema Specification

Two optional fields are added to `ChoiceSchema` in `src/content/schema.ts`:

```ts
export const ChoiceSchema = z
  .object({
    id: TokenSchema,
    label_sid: SidSchema,
    outcome_sid: SidSchema.optional(),
    journal_sid: SidSchema.optional(),
    requires: z.array(PredicateSchema),
    effects: z.array(EffectOpSchema),
    forbidden: z.boolean(),
  })
  .strict();
```

- **`outcome_sid`** (`SidSchema`, optional): String ID referencing the localized prose answering _What happened_ as a direct consequence of this choice.
- **`journal_sid`** (`SidSchema`, optional): String ID referencing the localized prose answering _What you carry_ forward into future turns and memories.
- **Additive**: Existing packs and choices without these fields continue to parse and function without breaking.

---

## 3. Screen and Resolution Behavior

In `app/life/[lifeId].tsx`, when `handleChooseAction` constructs the `ReflectEntry`:

- **`consequence_summary_sid`**: Uses `choice.outcome_sid` if present. If absent, falls back to `findConsequenceSid(choice)` (such as a `narrative_card` effect), and finally falls back to `'event.default.consequence_sid'` (`"Something quietly shifts."`).
- **`journal_memory_sid`**: Uses `choice.journal_sid` if present. If absent, falls back to `'event.default.journal_sid'` (`"The moment passes, carrying its weight forward into what comes next."`).
- **Resource deltas**: Continue to compute and display beneath the outcome prose (e.g. `+3 trust`, `-2 provisions`).

---

## 4. Lint Rules

`src/content/lint.ts` enforces game-design and referential integrity rules for these fields:

1. **`R-RESOLVABLE-OUTCOME-SID`**:
   - When `outcome_sid` or `journal_sid` is defined on any choice in an `EraPack`, the string identifier must resolve in `src/i18n/en.json` (or the provided `i18n` map).
   - If an SID cannot be resolved, `lintPack` fails with an error violation.
2. **`R-NO-KARMA-METER`**:
   - The SID identifiers themselves must not contain forbidden meter tokens (`karma`, `merit`, `spiritual_rank`, `enlightenment`), caught by `checkNoKarmaMeter`.
   - The resolved localization prose must also not contain forbidden meter tokens.
3. **Absence is valid**:
   - Choices omitting both fields remain completely valid and produce no violations.

### Event situation (`situation_sid`)

An event may carry an optional `situation_sid`: one sentence, in the era's voice, saying what has just happened ("a traveller lies in your doorway"). The life turn's act panel groups each visible event's choices under its situation, so a choice like "Bring them in and tend to them" has an antecedent.

1. **`R-RESOLVABLE-SITUATION-SID`**:
   - When `situation_sid` is defined on an event, the identifier must resolve in `src/i18n/en.json` (or the provided `i18n` map). An unresolved SID is an error violation.
   - The resolved prose must not contain the forbidden meter tokens (the same `R-NO-KARMA-METER` pattern as outcome prose).
2. **Absence is valid**: an event without `situation_sid` renders its group of choices with no header and no empty line.
3. A situation must not impersonate a teacher, grade the player, or claim attainment (SPEC section 3).

---

## 5. Authoring Guide for Content (b3)

### SID Naming Convention

Follow the hierarchical nesting already present for choice `label_sid` and `hint_sid`:

```
event.<era>.<event-slug>.<choice-id>.outcome_sid
event.<era>.<event-slug>.<choice-id>.journal_sid
```

### Files to Edit

1. `src/content/packs/tang-china/events.json5` (21 choices across 7 events)
2. `src/content/packs/fantasy-mahayana/events.json5` (21 choices across 7 events)
3. `src/i18n/en.json`

### JSON5 Path Shape (`events.json5`)

In `events.json5`, on each choice object under `events[].choices[]`:

```json5
{
  id: 'comply',
  label_sid: 'event.tang.grain-requisition.comply.label_sid',
  outcome_sid: 'event.tang.grain-requisition.comply.outcome_sid',
  journal_sid: 'event.tang.grain-requisition.comply.journal_sid',
  requires: [],
  effects: [
    { op: 'add_resource', key: 'provisions', delta: -3 },
    { op: 'add_relationship', target: 'officials', delta: 2 },
    { op: 'set_intent_root', intent_root: 'care' },
  ],
  forbidden: false,
}
```

### JSON Path Shape (`src/i18n/en.json`)

Under `event.<era>.<event-slug>.<choice-id>`:

```json
{
  "event": {
    "tang": {
      "grain-requisition": {
        "label_sid": "A bailiff from the county seat stands at the gate...",
        "comply": {
          "label_sid": "Hand over the grain",
          "hint_sid": "You give what is asked without delay...",
          "outcome_sid": "The wagons creak as they pull away down the valley road; the storehouse floor is swept clean, and the household prepares for a frugal winter.",
          "journal_sid": "An empty granary and an official receipt stamped in red ink."
        }
      }
    }
  }
}
```
