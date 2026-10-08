// Data-level guard for WCAG 2.5.3 (Label in Name) on the home screen.
//
// A button whose `accessibilityLabel` does not contain its visible text breaks
// voice control: a player saying "click Go work a day" gets no match, because
// the element's accessible name is something else entirely. Nothing at the
// component level catches this — the button renders fine and the axe audit only
// sees a named control — so the check belongs here, over the string table where
// the two texts are paired as `<base>_button_sid` (visible) and
// `<base>_label_sid` (accessible name).
//
// Scope is `home.*` deliberately: that is where the pairs are consumed by
// `app/index.tsx`. The other namespaces are audited by hand as they come up
// rather than by a rule that guesses at their markup.

import { describe, it, expect } from 'vitest';

import en from '../en.json';

interface StringTable {
  readonly [key: string]: string | StringTable;
}

const home = (en as unknown as StringTable)['home'] as StringTable;

const LABEL_SUFFIX = '_label_sid';
const BUTTON_SUFFIX = '_button_sid';

/** Every `<base>` in `home` that pairs a visible button label with an accessible name. */
function buttonLabelPairs(table: StringTable): { base: string; visible: string; label: string }[] {
  const pairs: { base: string; visible: string; label: string }[] = [];
  for (const key of Object.keys(table)) {
    if (!key.endsWith(LABEL_SUFFIX)) continue;
    const base = key.slice(0, -LABEL_SUFFIX.length);
    const visible = table[base + BUTTON_SUFFIX];
    const label = table[key];
    if (typeof visible === 'string' && typeof label === 'string') {
      pairs.push({ base, visible, label });
    }
  }
  return pairs;
}

const PAIRS = buttonLabelPairs(home);

describe('home screen label-in-name (WCAG 2.5.3)', () => {
  it('has button/label pairs to check (guards against a vacuous pass)', () => {
    // If a namespace is renamed or the suffixes change, this fails loudly
    // rather than letting every assertion below pass over an empty list.
    expect(PAIRS.length).toBeGreaterThan(0);
    expect(PAIRS.map((p) => p.base).sort()).toEqual(['continue', 'new_life', 'settings']);
  });

  it.each(PAIRS)(
    'accessible name for $base contains its visible text',
    ({ base, visible, label }) => {
      expect(
        label.toLowerCase(),
        `home.${base}_label_sid ("${label}") must contain the visible text ` +
          `home.${base}_button_sid ("${visible}"), or voice control cannot find the button`,
      ).toContain(visible.toLowerCase());
    },
  );
});
