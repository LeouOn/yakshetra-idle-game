import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

import BardoView, {
  DEFAULT_ERA_OPTIONS,
  eraNameSid,
  nextErasAfter,
  type BardoViewProps,
  type EraOption,
} from '@/ui/components/BardoView';
import type { Echo, LifeId } from '@/engine';
import { render } from '@/test/rntl';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const lifeId = (s: string): LifeId => s as LifeId;

/** Build an Echo with the engine's canonical narrative_sid shape. */
function echo(partial: Omit<Echo, 'source_life_id'> & { source_life_id?: string }): Echo {
  return {
    source_life_id: lifeId(partial.source_life_id ?? 'life-prev'),
    ...partial,
    weight: partial.weight ?? 0,
  } as Echo;
}

const SAMPLE_ECHOES: readonly Echo[] = [
  echo({
    type: 'tendency',
    key: 'aversion',
    weight: -0.6,
    narrative_sid: 'echo:tendency:aversion',
  }),
  echo({
    type: 'pattern_break',
    key: 'care_after_aversion',
    weight: 0.5,
    narrative_sid: 'echo:pattern_break:care_after_aversion',
  }),
  echo({
    type: 'vow',
    key: 'silence',
    weight: -0.6,
    narrative_sid: 'echo:vow:silence:broken',
  }),
  echo({
    type: 'unresolved_attachment',
    key: 'daughter',
    weight: -0.4,
    narrative_sid: 'echo:attachment:daughter',
  }),
];

function renderBardo(props: Partial<BardoViewProps> = {}): ReturnType<typeof render> {
  const full: BardoViewProps = {
    previousEra: 'tang-china',
    echoes: SAMPLE_ECHOES,
    eras: DEFAULT_ERA_OPTIONS,
    onPickEra: props.onPickEra ?? vi.fn(),
    ...props,
  };
  return render(createElement(BardoView, full));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BardoView', () => {
  it('renders the life-ended header using the previous era name', () => {
    // Exclude the just-played era from the next-life list (the parent route
    // passes `nextErasAfter(previousEra)`); otherwise the era button would
    // also contain the era name and `getByTextContent` would match twice.
    const { getByTextContent } = renderBardo({
      previousEra: 'tang-china',
      eras: nextErasAfter('tang-china'),
    });
    // Header heading.
    expect(() => getByTextContent('Your life has ended')).not.toThrow();
    // Subheading resolves era.tang-china.name_sid ("Tang Dynasty Chang'an").
    expect(() => getByTextContent('Tang Dynasty Chang')).not.toThrow();
  });

  it('falls back to the generic header when the previous era is unknown', () => {
    const { getByText } = renderBardo({ previousEra: 'some-unknown-era' });
    expect(() => getByText('A life has ended.')).not.toThrow();
  });

  it('groups echoes by type and renders a localized summary for each', () => {
    const { getByTextContent, getByTestID } = renderBardo();

    // One group per echo type present.
    expect(() => getByTestID('bardo-echo-group-tendency')).not.toThrow();
    expect(() => getByTestID('bardo-echo-group-pattern_break')).not.toThrow();
    expect(() => getByTestID('bardo-echo-group-vow')).not.toThrow();
    expect(() => getByTestID('bardo-echo-group-unresolved_attachment')).not.toThrow();

    // Tendency summary references the resolved intent-root label.
    expect(() => getByTextContent('tendency toward aversion')).not.toThrow();
    // Vow summary reflects the parsed broken state.
    expect(() => getByTextContent('vow of silence was broken')).not.toThrow();
    // Attachment summary references the subject.
    expect(() => getByTextContent('attachment to daughter')).not.toThrow();
    // Pattern-break summary.
    expect(() => getByTextContent('pattern broke open')).not.toThrow();
  });

  it('shows the graceful "no echoes" message when the life produced none', () => {
    const { getByTestID } = renderBardo({ echoes: [] });
    const node = getByTestID('bardo-no-echoes');
    expect(node.children[0]).toBe('No echoes were detected. The next life begins unburdened.');
  });

  it('lists each available era and fires onPickEra with the era id on tap', () => {
    const onPickEra = vi.fn();
    const { getByTestID, press } = renderBardo({ onPickEra });

    const fantasy = getByTestID('bardo-era-fantasy-mahayana');
    press(fantasy);
    expect(onPickEra).toHaveBeenCalledWith('fantasy-mahayana');

    const tang = getByTestID('bardo-era-tang-china');
    press(tang);
    expect(onPickEra).toHaveBeenCalledWith('tang-china');
  });

  it('shows the "no further lives" message when the era list is empty', () => {
    const { getByTestID } = renderBardo({ eras: [] });
    expect(getByTestID('bardo-no-eras').children[0]).toBe(
      'No further lives are available in this chain.',
    );
  });
});

describe('BardoView era helpers', () => {
  it('eraNameSid maps known eras to a name SID and unknown to null', () => {
    expect(eraNameSid('tang-china')).toBe('era.tang-china.name_sid');
    expect(eraNameSid('fantasy-mahayana')).toBe('era.fantasy-mahayana.name_sid');
    expect(eraNameSid('mystery-era')).toBeNull();
    expect(eraNameSid(null)).toBeNull();
  });

  it('nextErasAfter offers all eras for a fresh chain and filters the just-played era', () => {
    const fresh = nextErasAfter(null);
    expect(fresh.map((e: EraOption) => e.id)).toEqual(['tang-china', 'fantasy-mahayana']);

    const afterTang = nextErasAfter('tang-china');
    expect(afterTang.map((e: EraOption) => e.id)).toEqual(['fantasy-mahayana']);

    const afterFantasy = nextErasAfter('fantasy-mahayana');
    expect(afterFantasy.map((e: EraOption) => e.id)).toEqual(['tang-china']);
  });
});
