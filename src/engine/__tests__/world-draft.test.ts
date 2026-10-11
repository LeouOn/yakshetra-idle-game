import { describe, expect, it } from 'vitest';

import {
  assembleWorldDraft,
  canAssembleWorld,
  composeWorldDraftLine,
  type Manifest,
  type ManifestScale,
} from '../';
import { isIdShaped } from '../prose';
import { templatesForScale } from '../world-draft-templates';

function card(
  kind: Manifest['kind'],
  id: string,
  name: string,
  scale: ManifestScale = 'person',
  overrides: Partial<Manifest> = {},
): Manifest {
  return {
    schema_version: 'manifest/v1',
    scale,
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-1',
    kind,
    name,
    one_liner: `${name} waits.`,
    subject: name,
    detail: 'detail',
    tags: ['t'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
    ...overrides,
  };
}

const BANNED = [
  'understood',
  'attained',
  'merit',
  'karma',
  'enlightenment',
  'lesson',
  'you have',
  'rewarded',
  'org',
  'tier',
  'scale',
  'breadth',
  'record opens',
  'work took shape',
];

describe('assembleWorldDraft', () => {
  it('needs a place or two people', () => {
    expect(canAssembleWorld([card('person', 'p1', 'The clerk')])).toBe(false);
    expect(canAssembleWorld([card('place', 'pl1', 'The quay')])).toBe(true);
    expect(
      canAssembleWorld([card('person', 'p1', 'The clerk'), card('person', 'p2', 'The courier')]),
    ).toBe(true);
  });

  it('names the world after the first place and mentions the first person', () => {
    const draft = assembleWorldDraft([
      card('person', 'p1', 'The night clerk'),
      card('place', 'pl1', 'The night market'),
      card('outcome', 'o1', 'A door that stays open'),
    ]);
    expect(draft?.name).toBe('The night market');
    expect(draft?.one_liner).toContain('The night clerk');
    expect(draft?.cast).toHaveLength(1);
    expect(draft?.places).toHaveLength(1);
    expect(draft?.tensions).toHaveLength(1);
    expect(draft?.bonds).toEqual([]);
  });

  it('records bonds when a card is about a pinned subject', () => {
    const place = card('place', 'pl1', 'The night market');
    const about: Manifest = {
      ...card('thing', 't1', 'Sealed token'),
      about_id: 'pl1',
      about_name: 'The night market',
    };
    const draft = assembleWorldDraft([place, about]);
    expect(draft?.bonds).toEqual([
      {
        card_id: 't1',
        card_name: 'Sealed token',
        about_id: 'pl1',
        about_name: 'The night market',
      },
    ]);
  });

  it('falls back honestly when only two people exist (no place card)', () => {
    const draft = assembleWorldDraft([
      card('person', 'p1', 'The night clerk', 'person', {
        one_liner:
          'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
      }),
      card('person', 'p2', 'The courier', 'person', {
        one_liner: 'She keeps the satchel strap wrapped twice around the wrist.',
      }),
    ]);
    expect(draft).not.toBeNull();
    expect(draft?.name).toBe('A street that is still deciding');
    expect(draft?.cast).toHaveLength(2);
    expect(draft?.places).toHaveLength(0);
    // Honest person-only fallback line
    expect(draft?.one_liner).toContain('He works his abacus by tallow dip');
    expect(
      draft?.one_liner.includes('watching for somewhere to settle') ||
        draft?.one_liner.includes('before the street has found a name') ||
        draft?.one_liner.includes('Somewhere to land has not yet opened') ||
        draft?.one_liner.includes('waiting for a quiet threshold') ||
        draft?.one_liner.includes('ground has yet to take shape') ||
        draft?.one_liner.includes('nowhere yet to lay down their pack') ||
        draft?.one_liner.includes('waiting for a doorway') ||
        draft?.one_liner.includes('before the hearth is lit') ||
        draft?.one_liner.includes('lanes are still unmapped') ||
        draft?.one_liner.includes('standing where a road might one day pass'),
    ).toBe(true);
  });

  it('falls back honestly when only a place exists (no person card)', () => {
    const draft = assembleWorldDraft([
      card('place', 'pl1', 'The river stair', 'person', {
        one_liner:
          'Forty granite slabs cut with high-water marks and worn smooth by the bare feet of three dynasties.',
      }),
    ]);
    expect(draft).not.toBeNull();
    expect(draft?.name).toBe('The river stair');
    expect(draft?.cast).toHaveLength(0);
    expect(draft?.places).toHaveLength(1);
    expect(draft?.one_liner).toContain('Forty granite slabs cut with high-water marks');
    expect(
      draft?.one_liner.includes('waiting for someone to arrive') ||
        draft?.one_liner.includes('no one has stepped through') ||
        draft?.one_liner.includes('ready before the first footsteps sound') ||
        draft?.one_liner.includes('before anyone has made it home') ||
        draft?.one_liner.includes('folk have yet to gather') ||
        draft?.one_liner.includes('No one has stopped here yet') ||
        draft?.one_liner.includes('unlatched for the first visitor') ||
        draft?.one_liner.includes('waiting for hands') ||
        draft?.one_liner.includes('no one walks it yet') ||
        draft?.one_liner.includes('beneath the eaves'),
    ).toBe(true);
  });

  it('world name is never an id and never two cards spliced', () => {
    const draftWithIdName = assembleWorldDraft([
      card('place', 'pl1', 'm-0-184920'),
      card('person', 'p1', 'The porter'),
    ]);
    expect(isIdShaped(draftWithIdName?.name ?? '')).toBe(false);
    expect(draftWithIdName?.name).toBe('A street that is still deciding');

    const draftNormal = assembleWorldDraft([
      card('place', 'pl1', 'The river stair'),
      card('person', 'p1', 'The porter'),
    ]);
    expect(draftNormal?.name).toBe('The river stair');
    expect(draftNormal?.name).not.toContain(' — ');
    expect(draftNormal?.name).not.toContain('The porter');
  });

  it('composeWorldDraftLine is deterministic: same inputs produce exact same line', () => {
    const p = card('person', 'p-1', 'Shen the night clerk', 'person', {
      one_liner:
        'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
    });
    const pl = card('place', 'pl-1', 'The night market', 'person', {
      subject: 'canal-side stalls after curfew',
      one_liner:
        'Oiled paper lanterns illuminate rows of noodle cauldrons and scrap-iron stalls along the west canal.',
    });
    const a = composeWorldDraftLine(p, pl, 'person');
    const b = composeWorldDraftLine(p, pl, 'person');
    expect(a).toBe(b);
  });

  it('no phrasing frame appears on >25% of drafts in a 40-draft sample, with at least 6 distinct frames', () => {
    const frames = new Map<string, number>();
    for (let i = 0; i < 40; i += 1) {
      const p = card('person', `person-${i}`, `Person ${i}`, 'person', {
        one_liner: `Person ${i} keeps the ledger at the front gate.`,
      });
      const pl = card('place', `place-${i}`, `Place ${i}`, 'person', {
        subject: `a stone stair at crossing ${i}`,
        one_liner: `Stone stair ${i} leads to the harbor dock.`,
      });
      const line = composeWorldDraftLine(p, pl, 'person');
      // Normalize out person, place, and line tokens to extract frame
      const frame = line
        .replace(new RegExp(`person ${i} keeps the ledger at the front gate`, 'i'), '{line}')
        .replace(new RegExp(`person ${i}`, 'i'), '{person}')
        .replace(new RegExp(`place ${i}`, 'i'), '{place}')
        .trim();
      frames.set(frame, (frames.get(frame) ?? 0) + 1);
    }

    // At least 6 distinct frames
    expect(frames.size).toBeGreaterThanOrEqual(6);
    // No frame appears on more than 25% (10 out of 40)
    for (const [frame, count] of frames.entries()) {
      expect(
        count,
        `Frame "${frame}" appeared ${count} times (max 10 allowed)`,
      ).toBeLessThanOrEqual(10);
    }
  });

  it('tier scales read at that scale rather than as person-place pairs', () => {
    const scales: readonly ManifestScale[] = [
      'household',
      'org',
      'town',
      'city',
      'region',
      'nation',
      'world',
    ];
    for (const scale of scales) {
      const c1 = card('place', `${scale}-1`, `The ${scale} hall`, scale, {
        one_liner: `First working of the ${scale} stays steady.`,
      });
      const c2 = card('thing', `${scale}-2`, `The ${scale} token`, scale, {
        one_liner: `Second working of the ${scale} keeps the hours.`,
      });
      const line = composeWorldDraftLine(c1, c2, scale);
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toContain('keeps returning to');
    }
  });

  it('never prints an id-shaped token or a banned phrase across 100 generated drafts', () => {
    const scales: readonly ManifestScale[] = [
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
      'nation',
      'world',
    ];
    for (let i = 0; i < 100; i += 1) {
      const scale = scales[i % scales.length]!;
      const p = card('person', `m-0-${i * 100}`, `Dweller ${i}`, scale, {
        one_liner: `Dweller ${i} works quietly each morning.`,
        subject: `dweller ${i}`,
      });
      const pl = card('place', `m-0-${i * 100 + 1}`, `Harbor ${i}`, scale, {
        one_liner: `Harbor ${i} opens to the water.`,
        subject: `the harbor ${i} steps`,
      });
      const line = composeWorldDraftLine(p, pl, scale);

      expect(/m-\d|m-[a-f0-9]{6}/i.test(line)).toBe(false);
      expect(/:[a-z]+\//.test(line)).toBe(false);
      const lower = line.toLowerCase();
      for (const banned of BANNED) {
        expect(lower).not.toContain(banned);
      }
    }
  });

  it('preserves real Buddhist figure names without corruption', () => {
    const amitabha = card('person', 'p-ami', 'Amitābha', 'person', {
      one_liner: 'Amitābha leans out from the west with an open palm.',
    });
    const wutai = card('place', 'pl-wutai', 'Wutai Shan', 'person', {
      subject: 'a mountain of wisdom',
      one_liner: 'The northern mountain revered as Mañjuśrī seat.',
    });
    const line = composeWorldDraftLine(amitabha, wutai, 'person');
    expect(line).toContain('Amitābha');
    expect(line).toContain('Wutai Shan');
  });

  it('Rule 1: for every template and every scale, whenever a card is named, its own sentence immediately follows', () => {
    const scales: readonly ManifestScale[] = [
      'household',
      'org',
      'town',
      'city',
      'region',
      'nation',
      'world',
    ];
    const c1 = card('thing', 'c-alpha', 'Alpha Card', 'org', {
      one_liner: 'Alpha unique sentence.',
    });
    const c2 = card('thing', 'c-beta', 'Beta Card', 'org', {
      one_liner: 'Beta unique sentence.',
    });

    const failedTemplates: string[] = [];
    for (const scale of scales) {
      const templates = templatesForScale(scale);
      for (const tmpl of templates) {
        // Verify no template uses unindexed {line}
        expect(tmpl).not.toMatch(/{line}(?!1|2)/);

        const rendered = tmpl
          .replace(/{name}/g, 'alpha card')
          .replace(/{line1}/g, c1.one_liner)
          .replace(/{line2}/g, c2.one_liner);

        const alphaIdx = rendered.indexOf('alpha card');
        if (alphaIdx !== -1) {
          const afterAlpha = rendered.slice(alphaIdx);
          const betaSentenceIdx = afterAlpha.indexOf('Beta unique sentence');
          const alphaSentenceIdx = afterAlpha.indexOf('Alpha unique sentence');

          if (
            betaSentenceIdx !== -1 &&
            (alphaSentenceIdx === -1 || betaSentenceIdx < alphaSentenceIdx)
          ) {
            failedTemplates.push(`[${scale}] "${tmpl}"`);
          }
        }
      }
    }

    expect(
      failedTemplates,
      `Templates where card name is followed by the other card sentence: \n${failedTemplates.join('\n')}`,
    ).toEqual([]);
  });

  it('Rule 2: person-scale lines name the person and use their card words without filler tails', () => {
    const shen = card('person', 'shen-1', 'Shen the night clerk', 'person', {
      one_liner:
        'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
    });
    const market = card('place', 'market-1', 'The night market', 'person', {
      subject: 'canal-side stalls after curfew',
      one_liner:
        'Oiled paper lanterns illuminate rows of noodle cauldrons and scrap-iron stalls along the west canal.',
    });
    const line = composeWorldDraftLine(shen, market, 'person');

    // Must name the person
    expect(line).toContain('Shen the night clerk');
    // Must contain what they do in their own words
    expect(line).toContain(
      'He works his abacus by tallow dip, noting tea and grain before you recall what was spent',
    );
    // No filler tails
    expect(line).not.toContain('life carries on');
    expect(line).not.toContain('The morning gathers about');
    expect(line).not.toContain('the day unfolds');
  });
});
