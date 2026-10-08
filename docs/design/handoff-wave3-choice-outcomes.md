# Handoff: Every Choice Answers (Engineering Half)

## Summary of Completed Work

1. **Schema (`src/content/schema.ts`)**:
   - Added optional `outcome_sid: SidSchema.optional()` and `journal_sid: SidSchema.optional()` to `ChoiceSchema`.
   - Maintained `.strict()` on `ChoiceSchema` to reject extraneous keys while permitting additive fields.
   - All existing packs continue to parse without modification.

2. **Lint (`src/content/lint.ts`)**:
   - Added exported rule constant `R_RESOLVABLE_OUTCOME_SID = 'R-RESOLVABLE-OUTCOME-SID'`.
   - Implemented `checkResolvableOutcomeSids` and wired it into `lintPack`.
   - When `outcome_sid` or `journal_sid` is present:
     - Verifies resolution in `src/i18n/en.json` (or passed `i18n` map). Unknown SIDs flag `R_RESOLVABLE_OUTCOME_SID`.
     - Verifies that resolved prose does not contain prohibited metaphysical-meter tokens (`karma`, `merit`, `spiritual_rank`, `enlightenment`), flagging `R_NO_KARMA_METER`.
     - Verifies that the SID string itself does not carry meter tokens (flagged by existing `checkNoKarmaMeter`).
   - Choices omitting both fields remain completely valid and generate no violations.

3. **Life Turn Screen (`app/life/[lifeId].tsx`)**:
   - Updated `findConsequenceSid` and `handleChooseAction`:
     - Under "WHAT HAPPENED" (`consequence_summary_sid`): Uses `choice.outcome_sid` when set, falling back to `findConsequenceSid(choice)` (narrative_card if any), and finally `'event.default.consequence_sid'` (`"Something quietly shifts."`).
     - Under "WHAT YOU CARRY" (`journal_memory_sid`): Uses `choice.journal_sid` when set, falling back to `'event.default.journal_sid'` (`"The moment passes, carrying its weight forward into what comes next."`).
     - Preserved resource delta calculation and display (`world_state_delta`).
     - Preserved all testIDs and lens/choice turn interactions.

4. **Tests**:
   - New test suite `src/content/__tests__/choice-outcome.test.ts` (13 tests):
     - Schema accepts valid `outcome_sid` and `journal_sid`, accepts choices without them, parses full `EraPackSchema` with them, rejects invalid SID syntax, rejects empty strings, rejects unknown extraneous fields.
     - Lint passes when resolving against `en.json` or custom `i18n` maps, fails with `R_RESOLVABLE_OUTCOME_SID` on unknown SIDs, fails with `R_NO_KARMA_METER` if the SID or resolved prose contains forbidden meter tokens, and passes cleanly for choices without these fields.
   - Screen test suite `src/ui/__tests__/TurnScreen.test.tsx` (12 tests):
     - Updated fixture choice `choice-give-alms` to include `test.consequence.alms_given_sid` and `test.journal.alms_memory_sid`.
     - Verified per-choice outcome and journal prose rendering on ReflectCard.
     - Added test verifying generic fallback prose when a choice lacks both fields (`choice-harvest-rice`).
     - Added test exercising the full turn reducer loop end-to-end with a fixture choice carrying both fields.

5. **Design Documentation (`docs/design/choice-outcome-fields.md`)**:
   - Documented the schema fields, screen resolution rules, lint rules, and instructions for content authors.

---

## Content Authoring Instructions for b3

### SID Convention

Nest keys under the choice namespace, mirroring `label_sid`:

- `outcome_sid`: `event.<era>.<event-slug>.<choice-id>.outcome_sid`
- `journal_sid`: `event.<era>.<event-slug>.<choice-id>.journal_sid`

### Files to Edit

1. `src/content/packs/tang-china/events.json5` (21 choices across 7 events)
2. `src/content/packs/fantasy-mahayana/events.json5` (21 choices across 7 events)
3. `src/i18n/en.json`

### JSON / JSON5 Path Shape

**In `events.json5`** (per choice in `events[].choices[]`):

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

**In `src/i18n/en.json`** (under `event.<era>.<event-slug>.<choice-id>`):

```json
{
  "event": {
    "tang": {
      "grain-requisition": {
        "label_sid": "A bailiff from the county seat...",
        "comply": {
          "label_sid": "Hand over the grain",
          "hint_sid": "You give what is asked without delay...",
          "outcome_sid": "The wagons creak down the road with the autumn harvest; the household prepares to eat thin until spring.",
          "journal_sid": "A clean-swept granary floor and an official receipt stamped in red ink."
        }
      }
    }
  }
}
```

---

## Review Question: What failing input would our own change miss?

1. **Empty string or whitespace-only prose in `en.json`**:
   If an author defines `"outcome_sid": ""` or `"outcome_sid": "   "` in `en.json`, `resolveSid` does not throw an error because the key is present. The lint currently checks resolution and meter tokens, but not string length of the resolved value; the UI would render a blank line under "WHAT HAPPENED".
2. **Dynamic placeholder mismatch**:
   If an author writes template tokens like `{target}` into an outcome string, `ReflectCard` calls `resolveSid` rather than `formatSid`. The literal token `{target}` would display to the user without substitution.
3. **Cross-namespace semantic mismatch**:
   If an author typos an SID to point to an existing valid string in an unrelated section of `en.json` (e.g. `home.settings_button_sid`), the lint will accept it because the identifier successfully resolves in `en.json`.
4. **Prose mechanics & tone**:
   Unlike catalog card templates which run quality assertions (e.g. sentence starts, punctuation), event prose is not yet linted for terminal punctuation or capitalization.

---

## Verification & Boundary Status

- **Boundary verified**:
  - `src/content/schema.ts`
  - `src/content/lint.ts`
  - `app/life/[lifeId].tsx`
  - `src/ui/__tests__/TurnScreen.test.tsx`
  - `src/content/__tests__/choice-outcome.test.ts`
  - `docs/design/choice-outcome-fields.md`
  - 82/82 tests pass across boundary test files (`pnpm test src/content/__tests__/choice-outcome.test.ts src/ui/__tests__/TurnScreen.test.tsx src/content/__tests__/schema.test.ts src/content/__tests__/lint.test.ts src/content/packs/tang-china/__tests__/events.test.ts src/content/packs/tang-china/__tests__/pack.test.ts src/content/packs/fantasy-mahayana/__tests__/pack.test.ts src/ui/__tests__/ReflectCard.test.tsx`).
  - `pnpm lint` passed with 0 errors across the codebase.
- **NOT verified**:
  - Full `pnpm exec expo export --platform web` and `src/a11y/audit.test.ts` were blocked by a syntax error in `src/engine/manifest-catalog.ts:322` (`day's warmth.`, unescaped single quote) modified outside our boundary by another task. Per boundary instructions, we did not modify `src/engine/manifest-catalog.ts`.
