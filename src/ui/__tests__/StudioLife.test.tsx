import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@/test/rntl';
import StudioLife from '@/ui/components/StudioLife';
import { summarizeResidue, type LifeContext, type ResidueEvent } from '@/engine';

const WINDOW: readonly ResidueEvent[] = [
  { tick: 4, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 8 } },
];

/** The bench stand-in life: build-internal era and the placeholder `operator`. */
function standInContext(): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'studio-bench',
    age: 0,
    turn: 0,
    alive: true,
    lens: null,
    setting: {
      era_id: 'studio-bench@0.1.0',
      role_id: 'operator',
      year: 1,
      month: 1,
      day: 1,
      hour: 0,
      calendar_label: 'Year 1, month 1, day 1',
    },
    ties: [],
    strongest_tie: null,
    flags: [],
    residue_summary: summarizeResidue(WINDOW),
    activity: { work: 0, generosity: 0, beings: 0, learning: 0, meditation: 0, other: 0 },
    world_name: null,
    world_line: null,
  };
}

/** A life in progress: the UI resolved real names from the era pack. */
function realLifeContext(): LifeContext {
  return {
    ...standInContext(),
    life_id: 'life-1',
    age: 34,
    turn: 12,
    setting: {
      ...standInContext().setting,
      era_id: 'tang-china',
      era_name: 'Late Tang China',
      role_id: 'peasant',
      role_name: 'Peasant farmer',
    },
  };
}

describe('StudioLife — no stand-in identity leaks into "This life"', () => {
  /** Every visible string in the panel, joined, for substring assertions. */
  function visibleText(ui: ReturnType<typeof render>): string {
    return ui.container
      .queryAll((i: { type?: string }) => i.type === 'Text')
      .map((i: { children: readonly unknown[] }) =>
        i.children.filter((c): c is string => typeof c === 'string').join(''),
      )
      .join(' | ');
  }

  it('does not render the placeholder role when no role name was resolved', () => {
    const ui = render(createElement(StudioLife, { context: standInContext() }));

    expect(ui.getByTestID('studio-life')).toBeTruthy();
    // The regression: the panel used to interpolate `role_id`, printing
    // "operator · age 0" as the player's identity.
    expect(visibleText(ui)).not.toContain('operator');
  });

  it('never prints a build-internal era token', () => {
    const ui = render(createElement(StudioLife, { context: standInContext() }));
    const text = visibleText(ui);
    expect(text).not.toContain('studio-bench@');
    expect(text).not.toMatch(/@\d+\.\d+/);
  });

  it('still shows the year line and the world line for the stand-in', () => {
    const ui = render(createElement(StudioLife, { context: standInContext() }));
    expect(ui.getByTextContent('Year 1, month 1, day 1')).toBeTruthy();
  });

  it('shows the resolved role name when the UI supplied one', () => {
    const ui = render(createElement(StudioLife, { context: realLifeContext() }));
    const text = visibleText(ui);
    expect(text).toContain('Peasant farmer');
    expect(text).toContain('34');
    expect(text).not.toContain('operator');
  });
});
