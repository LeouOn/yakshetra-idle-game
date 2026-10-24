// Every event in both shipped packs opens its choices with a situation line: ONE sentence that says
// what has just happened, so each choice has its antecedent. The life turn shows it as the heading of
// the event's choice group and as that group's accessible name (app/life/[lifeId].tsx), so it has to
// work read aloud, not only on a screen.
import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../i18n';
import { lintPack } from '../lint';
import { forbiddenTerms } from '../progression/garden-do-not';
import { loadEraPack } from '../loader';

const ERAS = ['tang-china', 'fantasy-mahayana'] as const;

// SPEC section 3: no teacher voice, no grading, no attainment, no blessing on offer. The lint bars the
// meter tokens; this is the wider net for the words that would turn a scene into a verdict.
const PROMISE = /attain|enlighten|bless|merit|karma|reward|absolv|forgiv|destin/i;

async function situationLines(era: (typeof ERAS)[number]) {
  const pack = await loadEraPack(era);
  return pack.events.map((ev) => ({
    id: ev.id,
    sid: ev.situation_sid,
    text: ev.situation_sid === undefined ? '' : resolveSid(ev.situation_sid),
  }));
}

describe.each(ERAS)('%s situation lines', (era) => {
  test('every event authors a situation_sid that resolves to prose', async () => {
    const lines = await situationLines(era);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.sid, `${line.id} situation_sid`).toBeDefined();
      expect(line.text.trim().length, `${line.id} situation text`).toBeGreaterThan(0);
    }
  });

  test('each line is one sentence, short enough to hear as a heading', async () => {
    for (const line of await situationLines(era)) {
      const sentences = line.text.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim().length > 0);
      expect(sentences, `${line.id}: ${line.text}`).toHaveLength(1);
      expect(line.text.endsWith('.'), `${line.id} ends with a full stop`).toBe(true);
      const words = line.text.split(/\s+/).length;
      expect(words, `${line.id} word count`).toBeGreaterThanOrEqual(8);
      expect(words, `${line.id} word count`).toBeLessThanOrEqual(30);
    }
  });

  test('promises nothing and grades no one', async () => {
    for (const line of await situationLines(era)) {
      expect(PROMISE.test(line.text), `${line.id}: ${line.text}`).toBe(false);
    }
  });

  test('passes pack lint with the lines in place', async () => {
    const pack = await loadEraPack(era);
    const report = lintPack(pack);
    expect(report.violations, JSON.stringify(report.violations, null, 2)).toHaveLength(0);
  });
});

describe('situation lines across eras', () => {
  test('no two events share a line', async () => {
    const all = [
      ...(await situationLines('tang-china')),
      ...(await situationLines('fantasy-mahayana')),
    ];
    const texts = all.map((l) => l.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  test('the Garden lines carry no Tang noun from the do-not list', async () => {
    for (const line of await situationLines('fantasy-mahayana')) {
      expect([...forbiddenTerms(line.text)], `${line.id}: ${line.text}`).toEqual([]);
    }
  });
});
