// Slot vocabulary for composed cards. Split out of `card-composer.ts` so both
// stay inside the engine's ~250-line budget and the word lists stay editable as
// content. Pure: no Date, no Math.random, no I/O.

import type { ManifestFocus } from './focus';
import type { LifeContext } from './life-context';
import { safeName, safePhrase } from './prose';
import type { ResidueSummary } from './residue';

/**
 * Time phrases by hour. The bench writes prose, so a number will not do.
 *
 * These are **adverbials, lowercase** ("in the early shift"). A template that
 * needs a sentence to open on the hour must be authored to do that itself; a
 * capitalized slot value cannot serve both a mid-sentence and a sentence-start
 * slot, and a mid-sentence noun phrase ("struck with the mallet the early
 * shift") is not English.
 */
const HOUR_PHRASES: readonly string[] = [
  'in the small hours',
  'in the small hours',
  'in the small hours',
  'in the small hours',
  'in the last of the night',
  'at first light',
  'at first light',
  'on the early shift',
  'on the early shift',
  'in the morning',
  'in the morning',
  'in the morning',
  'at the midday change',
  'at the midday change',
  'in the long afternoon',
  'in the long afternoon',
  'in the long afternoon',
  'in the hour before dusk',
  'in the hour before dusk',
  'at dusk',
  'at dusk',
  'on the first watch',
  'on the first watch',
  'on the last watch',
];

/**
 * Human durations for the residue count, so a card never says "count: 7".
 * These are durations on purpose: a template can then read "it took
 * {{count}}" or "said nothing for {{count}}" and still be a sentence, which a
 * bare noun phrase ("a few traces") does not survive.
 */
const COUNT_PHRASES: readonly string[] = [
  // Every entry has to survive being the object of "for" and of "it took",
  // because templates do both. "no time at all" did not: "for no time at all".
  'less than a moment',
  'a moment',
  'a quarter of a morning',
  'a few minutes',
  'most of a morning',
  'a full morning',
  'a long morning',
  'a heavy morning',
  'the better part of a day',
  'a day and a night',
  'more than a day',
  'two days and a night',
  'a stretch of days',
];

/**
 * Slots every template may use, with a grammatical contract each must honour.
 * The contract is documented in docs/design/card-template-guide.md; adding a
 * slot means adding it there too.
 */
export interface SlotSource {
  readonly summary: ResidueSummary;
  readonly lifeContext: LifeContext | null;
  readonly focus: ManifestFocus | null;
  readonly brief: string | null;
  readonly qualityTier: number;
  readonly fire: 'short' | 'long';
}

function countPhrase(count: number): string {
  const last = COUNT_PHRASES.length - 1;
  return COUNT_PHRASES[Math.min(Math.max(count, 0), last)] ?? 'a morning of work';
}

export function trimmedBrief(brief: string | null): string | null {
  if (brief === null) {
    return null;
  }
  const trimmed = brief.trim().replace(/\s+/g, ' ');
  return trimmed.length === 0 ? null : trimmed;
}

/** The `{{slot}}` vocabulary a template may use. Absent key = slot unavailable. */
export function buildSlots(src: SlotSource): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  const ctx = src.lifeContext;
  const work = src.summary.ids.map(safePhrase).find((p) => p !== null);
  const put = (key: string, value: string | undefined | null): void => {
    if (value !== undefined && value !== null && value.length > 0) {
      out[key] = value;
    }
  };
  put('era', ctx?.setting.era_name);
  put('role', ctx?.setting.role_name);
  put('hour', ctx === null ? undefined : HOUR_PHRASES[ctx.setting.hour % 24]);
  put('year', ctx === null ? undefined : String(ctx.setting.year));
  // A name, so it is cased; safeName refuses handles and title-cases the
  // rest. A row only reaches this through a {{tie}} slot, which the lead caps
  // at roughly a third of cards — that cap is a content choice, not enforced
  // here, but the no-leak test pins the casing.
  put('tie', safeName(ctx?.strongest_tie) ?? undefined);
  put('lens', safePhrase(ctx?.lens) ?? undefined);
  put('work', work);
  put('count', countPhrase(src.summary.count));
  put('focus', src.focus?.name);
  put('brief', trimmedBrief(src.brief));
  return out;
}

/**
 * Substitute `{{slot}}` placeholders, or return null when the template needs a
 * slot this window cannot supply. Skipping beats half-empty sentences: a
 * template that cannot be filled whole is not a candidate.
 */
export function fillSlots(
  template: string,
  slots: Readonly<Record<string, string>>,
): string | null {
  const parts: string[] = [];
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf('{{', i);
    if (open < 0) {
      parts.push(template.slice(i));
      break;
    }
    const close = template.indexOf('}}', open);
    if (close < 0) {
      parts.push(template.slice(i));
      break;
    }
    parts.push(template.slice(i, open));
    const value = slots[template.slice(open + 2, close).trim()];
    if (value === undefined) {
      return null;
    }
    parts.push(value);
    i = close + 2;
  }
  return parts.join('');
}

/**
 * What a card may say beyond its authored text.
 *
 * There is deliberately no year, era, tie or activity line here. The lead read
 * thirty cards aloud and heard a form letter: those sentences made every card
 * differ as a *string* while the experience repeated, which made the
 * "distinct detail" measurement gameable. The year, the era and the closest tie
 * stay in data (tags, the request, the panel); a tie may only reach prose
 * through a `{{tie}}` slot inside a row's own sentence, in a natural clause.
 */
export function closingNotes(_src: SlotSource): string {
  return '';
}
