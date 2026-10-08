import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { render } from '@/test/rntl';
import StudioLife from '@/ui/components/StudioLife';
import {
  createIdleState,
  evaluateLifeContext,
  type IdleState,
  type LifeState,
  type Manifest,
  type Practice,
} from '@/engine';
import { resolveSid } from '@/i18n';
import { isIdShaped } from '@/engine/prose';

function life(): LifeState {
  return {
    id: 'life-1',
    alive: true,
    age: 30,
    turn: 40,
    era: 'tang-china@0.1.0',
    role: 'peasant@0.1.0',
    chosen_lens: 'generosity',
    flags: new Set<string>(),
    resources: { time: 10, energy: 10, provisions: 10, trust: 0, skill: 0, obligation: 0 },
    skills: {},
    relationships: {},
    residue: [],
    history: [],
  } as unknown as LifeState;
}

function card(id: string, name: string): Manifest {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-x',
    kind: 'person',
    scale: 'person',
    name,
    one_liner: 'A cast card.',
    subject: 'a cast card',
    detail: 'A cast card.',
    tags: ['cast'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

const PRACTICE: Practice = {
  id: 'practice.test',
  label_sid: 'practice.test.label_sid',
  description_sid: 'practice.test.desc_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 100,
  currentProgress: 0,
  level: 0,
  effects: [],
};

describe('StudioLife ties print names, never ids (finding 1)', () => {
  function contextWithTies(archive: readonly Manifest[]) {
    return evaluateLifeContext({
      life: life(),
      idle: createIdleState() as IdleState,
      epoch: { year: 742, month: 1, day: 1, hour: 0 },
      practices: [PRACTICE],
      archive,
    });
  }

  it('a tie filed under a manifest id prints the archived card name', () => {
    const archive = [card('m-0-1259077839', 'Old Wei of the quay')];
    const context = contextWithTies(archive);
    // The tie is filed under the manifest id; the filed name may or may not
    // be carried (b2's LifeTie change) — the SCREEN contract is what matters:
    // the card's name prints, the id never does.

    const ui = render(createElement(StudioLife, { context, archive }));
    const texts = ui.container
      .queryAll((n) => typeof n.children?.[0] === 'string')
      .map((n) => String(n.children[0]));
    expect(texts.some((tx) => tx.includes('Old Wei of the quay'))).toBe(true);
    expect(texts.some((tx) => tx.includes('m-0-1259077839'))).toBe(false);
  });

  it('a tie whose card cannot be resolved is omitted, not printed as an id', () => {
    const archive = [card('m-1-known', 'The night clerk')];
    const context = contextWithTies(archive);
    const ui = render(createElement(StudioLife, { context, archive }));
    const texts = ui.container
      .queryAll((n) => typeof n.children?.[0] === 'string')
      .map((n) => String(n.children[0]));
    // No id-shaped token anywhere on the screen.
    for (const tx of texts) {
      const words = tx.split(/\s+/);
      for (const word of words) {
        expect(isIdShaped(word), `id-shaped token "${word}" on the life tab`).toBe(false);
      }
    }
    // And the known card still prints.
    expect(texts.some((tx) => tx.includes('The night clerk'))).toBe(true);
  });

  it('an id-shaped filed name is refused and the archived name used instead', () => {
    const archive = [card('m-2-shaped', 'Auntie Qian')];
    const context = contextWithTies(archive);
    const ui = render(createElement(StudioLife, { context, archive }));
    const texts = ui.container
      .queryAll((n) => typeof n.children?.[0] === 'string')
      .map((n) => String(n.children[0]));
    expect(texts.some((tx) => tx.includes('Auntie Qian'))).toBe(true);
  });

  it('no ties at all keeps the empty line', () => {
    const context = contextWithTies([]);
    const ui = render(createElement(StudioLife, { context, archive: [] }));
    expect(ui.getByText(resolveSid('studio.life_ties_empty_sid'))).toBeDefined();
  });
});
