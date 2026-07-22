/**
 * Tang China content-warning tagging audit (plan todo 20).
 *
 * Asserts that every event in `src/content/packs/tang-china/events.json5`
 * carries exactly the content-warning category set mandated by the plan's
 * per-event mapping. This is the "fix any drift" gate: the T17 authoring
 * pass may have used broader or non-canonical tags, and this test locks the
 * audited canonical sets so later changes surface immediately.
 *
 * The expected sets are drawn from the plan (line 397 + the T20 MUST-include
 * clauses) and mapped onto the 9-category taxonomy in
 * `src/content/warning-taxonomy.ts`. Every tag used MUST be a valid
 * WarningCategoryId — the test fails if any event references an unknown id.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import JSON5 from 'json5';
import { describe, expect, test } from 'vitest';

import { WARNING_CATEGORIES, type WarningCategoryId } from '../../../warning-taxonomy';

/** The closed set of valid warning category ids, as a Set for O(1) lookup. */
const VALID_CATEGORY_IDS: ReadonlySet<string> = new Set(WARNING_CATEGORIES.map((c) => c.id));

/** Canonical event-id → expected content_warnings set (plan todo 20 audit). */
const EXPECTED_WARNINGS: Readonly<Record<string, readonly WarningCategoryId[]>> = {
  'event:tang/grain-requisition': ['war-political-violence', 'forced-moral-compromise'],
  'event:tang/sick-traveler': ['illness-chronic-suffering'],
  'event:tang/corrupt-donation-demand': ['forced-moral-compromise', 'social-oppression'],
  'event:tang/conscripted-brother': [
    'war-political-violence',
    'forced-moral-compromise',
    'separation-from-loved-ones',
  ],
  'event:tang/famine-year': ['poverty-starvation'],
  'event:tang/persecution-edict': ['social-oppression', 'forced-moral-compromise'],
  'event:tang/child-illness': ['illness-chronic-suffering', 'death-of-family'],
};

interface EventShape {
  id: string;
  content_warnings: string[];
}

interface EventsFile {
  events: EventShape[];
}

/** Resolve and parse the events file relative to this test. */
async function loadEvents(): Promise<readonly EventShape[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', 'events.json5');
  const raw = await readFile(path, 'utf8');
  const parsed = JSON5.parse(raw) as EventsFile | EventShape[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.events;
}

/** Sort helper for stable set comparison regardless of declaration order. */
function sorted(arr: readonly string[]): readonly string[] {
  return [...arr].sort();
}

describe('Tang China content-warning audit (T20)', () => {
  test('every event id in the audit map exists in the events file', async () => {
    const events = await loadEvents();
    const actualIds = new Set(events.map((e) => e.id));
    for (const expectedId of Object.keys(EXPECTED_WARNINGS)) {
      expect(actualIds.has(expectedId), `missing event "${expectedId}"`).toBe(true);
    }
  });

  test('the events file contains exactly the 7 audited events', async () => {
    const events = await loadEvents();
    expect(events).toHaveLength(7);
    expect(Object.keys(EXPECTED_WARNINGS)).toHaveLength(7);
  });

  test('each event has exactly the expected content_warnings set', async () => {
    const events = await loadEvents();
    for (const ev of events) {
      const expected = EXPECTED_WARNINGS[ev.id];
      expect(expected, `no audit entry for event "${ev.id}"`).toBeDefined();
      expect(sorted(ev.content_warnings), `event "${ev.id}" content_warnings drift`).toEqual(
        sorted(expected!),
      );
    }
  });

  test('every tag used is a canonical WarningCategoryId from the 9-category taxonomy', async () => {
    const events = await loadEvents();
    for (const ev of events) {
      for (const tag of ev.content_warnings) {
        expect(
          VALID_CATEGORY_IDS.has(tag),
          `event "${ev.id}" uses non-canonical warning tag "${tag}"`,
        ).toBe(true);
      }
    }
  });

  test('no event uses forced-moral-compromise as a sole catch-all tag', async () => {
    const events = await loadEvents();
    for (const ev of events) {
      if (ev.content_warnings.includes('forced-moral-compromise')) {
        expect(
          ev.content_warnings.length,
          `event "${ev.id}" uses forced-moral-compromise alone — a specific tag is required alongside it`,
        ).toBeGreaterThan(1);
      }
    }
  });

  test('child-illness includes death-of-family (child may die)', async () => {
    const events = await loadEvents();
    const ev = events.find((e) => e.id === 'event:tang/child-illness');
    expect(ev).toBeDefined();
    expect(ev?.content_warnings).toContain('death-of-family');
    expect(ev?.content_warnings).toContain('illness-chronic-suffering');
  });

  test('persecution-edict includes social-oppression and forced-moral-compromise', async () => {
    const events = await loadEvents();
    const ev = events.find((e) => e.id === 'event:tang/persecution-edict');
    expect(ev).toBeDefined();
    expect(ev?.content_warnings).toContain('social-oppression');
    expect(ev?.content_warnings).toContain('forced-moral-compromise');
  });

  test('famine-year includes poverty-starvation', async () => {
    const events = await loadEvents();
    const ev = events.find((e) => e.id === 'event:tang/famine-year');
    expect(ev).toBeDefined();
    expect(ev?.content_warnings).toContain('poverty-starvation');
  });

  test('conscripted-brother includes war, forced-moral-compromise, and separation', async () => {
    const events = await loadEvents();
    const ev = events.find((e) => e.id === 'event:tang/conscripted-brother');
    expect(ev).toBeDefined();
    expect(ev?.content_warnings).toContain('war-political-violence');
    expect(ev?.content_warnings).toContain('forced-moral-compromise');
    expect(ev?.content_warnings).toContain('separation-from-loved-ones');
  });
});
