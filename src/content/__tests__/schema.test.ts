import { describe, expect, test } from 'vitest';

import { EraPackSchema, type EraPack } from '../schema';

/**
 * Canonical valid era pack fixture (the "happy" case).
 * Also serialized to `.omo/evidence/task-4-schema-valid.json`.
 */
const validEraPack: EraPack = {
  id: 'ancient-monastery@0.1.0',
  name_sid: 'era.ancient_monastery.name_sid',
  locale_default: 'en',
  locale_available: ['en', 'sa', 'bo'],
  schema_version: '0.1',
  engine_compat: '^0.1.0',
  lens_set: 'six-paramita-mahayana',
  social: {
    paramitas: ['generosity', 'ethics', 'patience', 'diligence', 'meditation', 'wisdom'],
    relations: ['teacher', 'village_elder', 'fellow_practitioner'],
  },
  calendar: 'lunar-traditional',
  content_warnings: ['depiction-of-illness', 'references-to-death'],
  events: [
    {
      id: 'alms_round',
      weight: 1.0,
      cooldown_turns: 3,
      once_per_run: false,
      trigger: { op: 'has_resource', key: 'alms' },
      content_warnings: [],
      choices: [
        {
          id: 'give',
          label_sid: 'event.alms_round.choice.give.label_sid',
          requires: [{ op: 'gte', key: 'alms', value: 1 }],
          effects: [
            { op: 'add_resource', key: 'alms', delta: -1 },
            { op: 'add_relationship', target: 'village_elder', delta: 1 },
          ],
          forbidden: false,
        },
        {
          id: 'withhold',
          label_sid: 'event.alms_round.choice.withhold.label_sid',
          requires: [],
          effects: [{ op: 'narrative_card', card_sid: 'card.alms_round.withhold_sid' }],
          forbidden: false,
        },
      ],
    },
    {
      id: 'sick_traveler',
      weight: 0.8,
      cooldown_turns: 5,
      once_per_run: false,
      content_warnings: [],
      choices: [
        {
          id: 'tend',
          label_sid: 'event.sick_traveler.choice.tend.label_sid',
          requires: [],
          effects: [
            { op: 'add_flag', key: 'tended_sick' },
            { op: 'modify_event_weight', event_id: 'alms_round', multiplier: 1.5 },
          ],
          forbidden: false,
        },
      ],
    },
    {
      id: 'harvest_offer',
      weight: 1.2,
      cooldown_turns: 2,
      once_per_run: false,
      content_warnings: [],
      choices: [
        {
          id: 'accept',
          label_sid: 'event.harvest_offer.choice.accept.label_sid',
          requires: [],
          effects: [{ op: 'add_resource', key: 'alms', delta: 2 }],
          forbidden: false,
        },
        {
          id: 'refuse',
          label_sid: 'event.harvest_offer.choice.refuse.label_sid',
          requires: [{ op: 'has_skill', key: 'restraint' }],
          effects: [{ op: 'add_skill', key: 'restraint' }],
          forbidden: false,
        },
      ],
    },
    {
      id: 'wayfarer_question',
      weight: 0.9,
      cooldown_turns: 4,
      once_per_run: true,
      trigger: {
        op: 'or',
        operands: [
          { op: 'gte', key: 'alms', value: 3 },
          { op: 'has_flag', key: 'tended_sick' },
        ],
      },
      content_warnings: [],
      choices: [
        {
          id: 'answer',
          label_sid: 'event.wayfarer_question.choice.answer.label_sid',
          requires: [],
          effects: [{ op: 'set_intent_root', intent_root: 'compassion' }],
          forbidden: false,
        },
      ],
    },
    {
      id: 'stolen_bowl',
      weight: 0.5,
      cooldown_turns: 6,
      once_per_run: false,
      content_warnings: [],
      choices: [
        {
          id: 'forgive',
          label_sid: 'event.stolen_bowl.choice.forgive.label_sid',
          requires: [],
          effects: [
            { op: 'remove_flag', key: 'tended_sick' },
            { op: 'trigger_event', event_id: 'harvest_offer' },
          ],
          forbidden: false,
        },
        {
          id: 'pursue',
          label_sid: 'event.stolen_bowl.choice.pursue.label_sid',
          requires: [],
          effects: [{ op: 'narrative_card', card_sid: 'card.stolen_bowl.pursue_sid' }],
          forbidden: true,
        },
      ],
    },
    {
      id: 'dawn_meditation',
      weight: 1.5,
      cooldown_turns: 1,
      once_per_run: false,
      content_warnings: [],
      choices: [
        {
          id: 'sit',
          label_sid: 'event.dawn_meditation.choice.sit.label_sid',
          requires: [],
          effects: [
            { op: 'add_resource', key: 'alms', delta: 0 },
            { op: 'add_skill', key: 'meditation' },
          ],
          forbidden: false,
        },
      ],
    },
  ],
  lineage_notes_sid: 'era.ancient_monastery.lineage_notes_sid',
  glossary: {
    paramita: { en: 'Perfection; a transcendent virtue practiced on the path.' },
    alms: { en: 'Food or offerings gathered during the morning round.' },
  },
  source_bibliography: [
    {
      citation: 'Dhammapada, translated by Easwaran (2007)',
      url: 'https://example.org/dhammapada',
    },
  ],
  permitted_imagery: ['monastery', 'alms-bowl', 'lotus', 'incense'],
  rule_variation: {
    id: 'social-obligation-default',
    description_sid: 'rule.social_obligation.description_sid',
    enforces: 'social-obligation',
  },
};

/** Deep-clone helper so each mutation case starts from a clean fixture. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('EraPackSchema v0.1', () => {
  test('(a) a well-formed era pack parses successfully', () => {
    const result = EraPackSchema.safeParse(validEraPack);
    expect(result.success).toBe(true);
  });

  test("(b) locale_available missing 'en' is rejected", () => {
    const pack = clone(validEraPack);
    pack.locale_available = ['sa', 'bo'];
    const result = EraPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
  });

  test('(c) an effect with the prohibited karma_delta op is rejected at parse', () => {
    const pack = clone(validEraPack);
    // Attach a prohibited effect. The op literal is not in the EffectOp union,
    // so the discriminatedUnion throws "Invalid discriminator value".
    const event = pack.events[0];
    if (event !== undefined) {
      const firstChoice = event.choices[0];
      if (firstChoice !== undefined) {
        firstChoice.effects = [
          // intentionally invalid op — must be rejected by schema, not by lint
          { op: 'karma_delta', key: 'karma', delta: -5 } as unknown as never,
        ];
      }
    }
    const result = EraPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
  });

  test('(d) events array of length 11 (over the 10 cap) is rejected', () => {
    const pack = clone(validEraPack);
    const baseEvent = pack.events[0];
    if (baseEvent === undefined) {
      throw new Error('fixture must have at least one event to clone');
    }
    // validEraPack has 6 events; push 5 more clones to reach 11.
    for (let i = 0; i < 5; i++) {
      const copy = clone(baseEvent);
      copy.id = `extra-event-${i}`;
      pack.events.push(copy);
    }
    expect(pack.events).toHaveLength(11);
    const result = EraPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
  });

  test('(e) events array of length 5 (under the 6 floor) is rejected', () => {
    const pack = clone(validEraPack);
    // validEraPack has 6 events; drop one to reach 5.
    pack.events.pop();
    expect(pack.events).toHaveLength(5);
    const result = EraPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
  });
});
