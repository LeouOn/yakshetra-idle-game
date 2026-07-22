// Content-warning taxonomy (9 categories).
//
// Codifies the closed set of content-warning categories the player may toggle
// per-category (granular control is required — there is NO global "disable all"
// toggle). Each category carries a localization label/description SID plus a
// severity hint surfaced to the UI for ordering and emphasis.
//
// The `default_state` of every category is `"on"`: the game errs on the side of
// surfacing warnings rather than hiding them. The player opts a category OFF to
// filter the corresponding events out of the pool (handled by the engine/event
// layer, not here).
//
// Plan reference: todo 28 (taxonomy) — consumed by todo 15 settings UI.
// MUST NOT: do not add a 10th "off" global. Per-category only.

/** The closed set of content-warning category ids (9). */
export type WarningCategoryId =
  | 'death-of-self'
  | 'death-of-family'
  | 'illness-chronic-suffering'
  | 'war-political-violence'
  | 'betrayal'
  | 'poverty-starvation'
  | 'social-oppression'
  | 'forced-moral-compromise'
  | 'separation-from-loved-ones';

/** Whether a category is on by default for a fresh save. Always "on" here. */
export type WarningDefaultState = 'on' | 'off';

/** Coarse severity hint for UI emphasis (not a game mechanic). */
export type WarningSeverityHint = 'low' | 'medium' | 'high';

/** A single content-warning category definition. */
export interface WarningCategory {
  readonly id: WarningCategoryId;
  readonly label_sid: string;
  readonly description_sid: string;
  readonly default_state: WarningDefaultState;
  readonly severity_hint: WarningSeverityHint;
}

/**
 * The production taxonomy. Exactly nine categories, in display order.
 * Every entry defaults to `"on"`.
 */
export const WARNING_CATEGORIES: readonly WarningCategory[] = [
  {
    id: 'death-of-self',
    label_sid: 'warning.death-of-self.label_sid',
    description_sid: 'warning.death-of-self.description_sid',
    default_state: 'on',
    severity_hint: 'high',
  },
  {
    id: 'death-of-family',
    label_sid: 'warning.death-of-family.label_sid',
    description_sid: 'warning.death-of-family.description_sid',
    default_state: 'on',
    severity_hint: 'high',
  },
  {
    id: 'illness-chronic-suffering',
    label_sid: 'warning.illness-chronic-suffering.label_sid',
    description_sid: 'warning.illness-chronic-suffering.description_sid',
    default_state: 'on',
    severity_hint: 'medium',
  },
  {
    id: 'war-political-violence',
    label_sid: 'warning.war-political-violence.label_sid',
    description_sid: 'warning.war-political-violence.description_sid',
    default_state: 'on',
    severity_hint: 'high',
  },
  {
    id: 'betrayal',
    label_sid: 'warning.betrayal.label_sid',
    description_sid: 'warning.betrayal.description_sid',
    default_state: 'on',
    severity_hint: 'medium',
  },
  {
    id: 'poverty-starvation',
    label_sid: 'warning.poverty-starvation.label_sid',
    description_sid: 'warning.poverty-starvation.description_sid',
    default_state: 'on',
    severity_hint: 'medium',
  },
  {
    id: 'social-oppression',
    label_sid: 'warning.social-oppression.label_sid',
    description_sid: 'warning.social-oppression.description_sid',
    default_state: 'on',
    severity_hint: 'medium',
  },
  {
    id: 'forced-moral-compromise',
    label_sid: 'warning.forced-moral-compromise.label_sid',
    description_sid: 'warning.forced-moral-compromise.description_sid',
    default_state: 'on',
    severity_hint: 'medium',
  },
  {
    id: 'separation-from-loved-ones',
    label_sid: 'warning.separation-from-loved-ones.label_sid',
    description_sid: 'warning.separation-from-loved-ones.description_sid',
    default_state: 'on',
    severity_hint: 'low',
  },
];

/** Per-category enabled flag, keyed by category id. */
export type ContentWarningSettings = Readonly<Record<WarningCategoryId, boolean>>;

/**
 * Build the default per-category settings from the taxonomy: every category
 * starts at its `default_state` (always "on" today). Returns a fresh object.
 */
export function defaultContentWarningSettings(): ContentWarningSettings {
  const out = {} as Record<WarningCategoryId, boolean>;
  for (const cat of WARNING_CATEGORIES) {
    out[cat.id] = cat.default_state === 'on';
  }
  return out;
}
