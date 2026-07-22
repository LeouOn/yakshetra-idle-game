/**
 * Tang China event graph tests (plan todo 17).
 *
 * Validates the seven authored events in
 * `src/content/packs/tang-china/events.json5`:
 *   - the file is parseable as JSON5
 *   - each entry parses against the {@link EventSchema}
 *   - when wrapped in a synthetic {@link EraPack} the {@link lintPack} pass
 *     reports zero violations (the same second-line-of-defense contract
 *     exercised by `lint.test.ts`)
 *   - the seven event ids and the choice-count constraint (2..3) match the
 *     plan
 *   - every choice carries exactly one `set_intent_root` effect whose root
 *     is one of the four canonical values
 *
 * The events file is intentionally NOT loaded by
 * {@link import('../loader').loadEraPack} (the loader reads only
 * `pack.json5`); this test exercises the standalone validation path the
 * engine will use when the events are merged into the pack at integration
 * time.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import JSON5 from 'json5';
import { describe, expect, test } from 'vitest';

import { lintPack } from '../../../lint';
import { EraPackSchema, EventSchema, type EraPack, type Event } from '../../../schema';

/** Expected event ids, in plan order. The ids are the canonical references
 *  every other system (triggers, echoes, content-warning audit) uses. */
const EXPECTED_EVENT_IDS = [
  'event:tang/grain-requisition',
  'event:tang/sick-traveler',
  'event:tang/corrupt-donation-demand',
  'event:tang/conscripted-brother',
  'event:tang/famine-year',
  'event:tang/persecution-edict',
  'event:tang/child-illness',
] as const;

/** Permitted intent_root values per the plan (four canonical roots). */
const PERMITTED_INTENT_ROOTS = ['care', 'greed', 'aversion', 'delusion'] as const;

/** Resolve the events file from this test's location. */
function loadEventsFile(): Promise<unknown> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', 'events.json5');
  return readFile(path, 'utf8').then((raw) => JSON5.parse(raw));
}

/** Pull the events array out of either a `{events: [...]}` wrapper or a
 *  bare top-level array. Both shapes are defensible for a `events.json5`
 *  authored file; the plan's exact wording permits either. */
function extractEvents(parsed: unknown): readonly Event[] {
  if (Array.isArray(parsed)) {
    return parsed as Event[];
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'events' in parsed &&
    Array.isArray((parsed as { events: unknown }).events)
  ) {
    return (parsed as { events: Event[] }).events;
  }
  throw new Error(
    'events.json5 must be either a top-level array or an object with an "events" array',
  );
}

/**
 * Build a minimal valid EraPack wrapping the authored events so the
 * second-line lint pass ({@link lintPack}) can operate on them. Every
 * non-event field is a deliberate placeholder chosen to satisfy the schema
 * and avoid spurious lint findings (no prohibited meter tokens, no
 * sacred-name collisions, no Sanskrit seed syllables).
 */
function syntheticPack(events: readonly Event[]): EraPack {
  return {
    id: 'tang-china@0.1.0',
    name_sid: 'era.tang-china.name_sid',
    locale_default: 'en',
    locale_available: ['en'],
    schema_version: '0.1',
    engine_compat: '^0.1.0',
    lens_set: 'six-paramita-mahayana',
    social: {
      paramitas: ['generosity'],
      relations: ['officials', 'travelers', 'monastics', 'family', 'neighbors'],
    },
    calendar: 'tang-ce-7xx',
    content_warnings: [],
    events: events.map((e) => ({ ...e })),
    lineage_notes_sid: 'era.tang-china.lineage_notes_sid',
    glossary: {
      chan: { en: 'A contemplative tradition originating in Tang China.' },
    },
    source_bibliography: [
      {
        citation: 'A study of late Tang social history.',
        url: 'https://example.org/tang-social-history',
      },
    ],
    permitted_imagery: ['monastery'],
    rule_variation: {
      id: 'social-obligation',
      description_sid: 'rule.tang.social-obligation.description_sid',
      enforces: 'social-obligation',
    },
  };
}

describe('Tang China events.json5', () => {
  test('parses as JSON5', async () => {
    const parsed = await loadEventsFile();
    expect(parsed).toBeDefined();
  });

  test('contains exactly 7 events with the plan-canonical ids, in order', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    expect(events).toHaveLength(7);
    expect(events.map((e) => e.id)).toEqual([...EXPECTED_EVENT_IDS]);
  });

  test('each event parses against EventSchema and has 2-3 choices', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    for (const ev of events) {
      const result = EventSchema.safeParse(ev);
      expect(result.success, `event "${ev.id}" must validate`).toBe(true);
      expect(ev.choices.length, `event "${ev.id}" choices`).toBeGreaterThanOrEqual(2);
      expect(ev.choices.length, `event "${ev.id}" choices`).toBeLessThanOrEqual(3);
    }
  });

  test('every choice carries exactly one set_intent_root effect with a permitted root', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    let totalChoices = 0;
    for (const ev of events) {
      for (const ch of ev.choices) {
        totalChoices += 1;
        const intentEffects = ch.effects.filter((eff) => eff.op === 'set_intent_root');
        expect(intentEffects, `choice "${ch.id}" of "${ev.id}"`).toHaveLength(1);
        const root = intentEffects[0]?.intent_root;
        expect(
          PERMITTED_INTENT_ROOTS,
          `choice "${ch.id}" of "${ev.id}" must use a canonical intent_root`,
        ).toContain(root);
      }
    }
    // Sanity-check the plan-mandated choice count: 7 events × 3 choices = 21.
    expect(totalChoices).toBe(21);
  });

  test('lint reports zero violations on the events wrapped in a synthetic EraPack', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    const pack = syntheticPack(events);
    // The synthetic pack must itself satisfy the schema; if it does not,
    // the test wiring is broken rather than the events.
    const schemaResult = EraPackSchema.safeParse(pack);
    expect(schemaResult.success, 'synthetic EraPack must validate').toBe(true);
    const report = lintPack(pack);
    expect(report.passed, JSON.stringify(report.violations, null, 2)).toBe(true);
  });

  test('persecution-edict fires only in mid-life (age >= 25)', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    const ev = events.find((e) => e.id === 'event:tang/persecution-edict');
    expect(ev, 'persecution-edict event must exist').toBeDefined();
    expect(ev?.trigger).toEqual({ op: 'gte', key: 'state.age', value: 25 });
  });

  test('conscripted-brother requires a family relationship flag', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    const ev = events.find((e) => e.id === 'event:tang/conscripted-brother');
    expect(ev, 'conscripted-brother event must exist').toBeDefined();
    expect(ev?.trigger).toEqual({ op: 'has_flag', key: 'has_brother' });
  });

  test('corrupt-donation-demand "give" choice attaches a narrative_card rejecting commodification', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    const ev = events.find((e) => e.id === 'event:tang/corrupt-donation-demand');
    expect(ev, 'corrupt-donation-demand event must exist').toBeDefined();
    const give = ev?.choices.find((c) => c.id === 'give');
    expect(give, 'give choice must exist').toBeDefined();
    const card = give?.effects.find((eff) => eff.op === 'narrative_card');
    expect(card, 'give must attach a narrative_card').toBeDefined();
    if (card && card.op === 'narrative_card') {
      // The sid must reference the corrupt-donation-demand event but must
      // NOT contain any prohibited meter token (no "merit", "karma",
      // "spiritual_rank", or "enlightenment") — the lint rule covers this
      // for the whole pack, but we re-assert it here for explicitness.
      expect(card.card_sid).toMatch(/corrupt-donation-demand/);
      expect(card.card_sid).not.toMatch(/karma|merit|spiritual_rank|enlightenment/);
    }
  });

  test('every event declares a non-empty content_warnings array', async () => {
    const parsed = await loadEventsFile();
    const events = extractEvents(parsed);
    for (const ev of events) {
      expect(
        Array.isArray(ev.content_warnings),
        `event "${ev.id}" content_warnings must be an array`,
      ).toBe(true);
      expect(
        ev.content_warnings.length,
        `event "${ev.id}" must declare at least one content warning`,
      ).toBeGreaterThan(0);
    }
  });
});
