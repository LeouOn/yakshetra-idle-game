/**
 * Fantasy Mahayana content-warning tagging audit (plan todo 25).
 *
 * Validates the seven authored events in
 * `src/content/packs/fantasy-mahayana/events.json5` against the pack's own
 * declared warning vocabulary (plan line 460) and the per-event tag
 * assignments (plan line 483).
 *
 * Vocabulary note
 * ---------------
 * The fantasy pack declares a FOUR-category content-warning vocabulary that
 * is deliberately distinct from the engine-level canonical 9-category
 * taxonomy in `src/content/warning-taxonomy.ts`. The canonical nine
 * (death-of-self, death-of-family, illness-chronic-suffering,
 * war-political-violence, betrayal, poverty-starvation, social-oppression,
 * forced-moral-compromise, separation-from-loved-ones) model realistic
 * historical-era content. The Garden life is original allegorical fiction;
 * its concerns (loss of memory, encounters with anguish, spiritual
 * disorientation, separation) do not map cleanly onto the realistic nine.
 * The plan (line 460) therefore declares the pack's own vocabulary, and the
 * events (line 483) use it. This test audits that every event's tags fall
 * within that declared vocabulary and match the plan's per-event spec.
 *
 * The audit is the T25 deliverable (parallel to T20 for Tang China). It
 * does not modify events.json5; it asserts the committed tags are correct.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import JSON5 from 'json5';
import { describe, expect, test } from 'vitest';

import { EventSchema, type Event } from '../../../schema';

/**
 * The pack-level content-warning vocabulary declared in pack.json5
 * (plan line 460). Every event-level tag MUST be a member of this set.
 */
const PACK_DECLARED_WARNINGS = [
  'separation',
  'loss-of-memory',
  'spiritual-disorientation',
  'encounters-with-anguish',
] as const;

/**
 * Per-event expected content_warnings, keyed by event id. Derived from the
 * plan (line 483) and the committed events.json5:
 *   - Event 2 (soul-in-torment): encounters-with-anguish
 *   - Event 3 (forgotten-name): loss-of-memory
 *   - Event 6 (offer-to-stay): spiritual-disorientation
 *   - Event 7 (storm-at-edge): separation
 *   - Events 1, 4, 5: the plan does not single these out explicitly, but the
 *     committed events.json5 assigns tags consistent with each event's theme
 *     (gardener-question → loss-of-memory, vow-reminder →
 *     spiritual-disorientation, court-judgment → spiritual-disorientation).
 */
const EXPECTED_WARNINGS: Readonly<Record<string, readonly string[]>> = {
  'event:fantasy/gardener-question': ['loss-of-memory'],
  'event:fantasy/soul-in-torment': ['encounters-with-anguish'],
  'event:fantasy/forgotten-name': ['loss-of-memory'],
  'event:fantasy/vow-reminder': ['spiritual-disorientation'],
  'event:fantasy/court-judgment': ['spiritual-disorientation'],
  'event:fantasy/offer-to-stay': ['spiritual-disorientation'],
  'event:fantasy/storm-at-edge': ['separation'],
};

/** Expected event ids in plan order. */
const EXPECTED_EVENT_IDS = Object.keys(EXPECTED_WARNINGS);

/** Resolve the events file from this test's location. */
async function loadEventsFile(): Promise<readonly Event[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', 'events.json5');
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON5.parse(raw);
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'events' in parsed &&
    Array.isArray((parsed as { events: unknown }).events)
  ) {
    return (parsed as { events: Event[] }).events;
  }
  throw new Error('events.json5 must be an object with an "events" array');
}

describe('Fantasy Mahayana content-warning audit (T25)', () => {
  test('contains exactly 7 events with the plan-canonical ids', async () => {
    const events = await loadEventsFile();
    expect(events).toHaveLength(7);
    expect(events.map((e) => e.id)).toEqual([...EXPECTED_EVENT_IDS]);
  });

  test('every event parses against EventSchema', async () => {
    const events = await loadEventsFile();
    for (const ev of events) {
      const result = EventSchema.safeParse(ev);
      expect(result.success, `event "${ev.id}" must validate`).toBe(true);
    }
  });

  test('every event declares a non-empty content_warnings array', async () => {
    const events = await loadEventsFile();
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

  test('every warning tag belongs to the pack-declared vocabulary', async () => {
    const events = await loadEventsFile();
    for (const ev of events) {
      for (const tag of ev.content_warnings) {
        expect(PACK_DECLARED_WARNINGS, `event "${ev.id}" uses unknown warning "${tag}"`).toContain(
          tag,
        );
      }
    }
  });

  test('each event carries exactly the plan-specified warning set', async () => {
    const events = await loadEventsFile();
    for (const ev of events) {
      const expected = EXPECTED_WARNINGS[ev.id];
      if (expected === undefined) {
        throw new Error(`no expected warnings recorded for "${ev.id}"`);
      }
      expect(
        [...ev.content_warnings].sort(),
        `event "${ev.id}" content_warnings must match the plan spec`,
      ).toEqual([...expected].sort());
    }
  });

  test('no event uses an undeclared ad-hoc warning string', async () => {
    const events = await loadEventsFile();
    const allUsed = new Set(events.flatMap((e) => e.content_warnings));
    for (const tag of allUsed) {
      expect(
        PACK_DECLARED_WARNINGS,
        `warning "${tag}" is used but not declared in the pack vocabulary`,
      ).toContain(tag);
    }
    // Sanity: all four vocabulary members should appear at least once across
    // the seven events (otherwise a category was declared but never applied,
    // which an audit should flag).
    for (const declared of PACK_DECLARED_WARNINGS) {
      expect(
        allUsed.has(declared),
        `declared warning "${declared}" is never applied to any event`,
      ).toBe(true);
    }
  });
});
