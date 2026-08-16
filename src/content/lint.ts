/**
 * Game-design lint — the SECOND enforcement layer for content packs.
 *
 * The Zod schema in `./schema` is the first line of defense: it rejects
 * structurally invalid packs (any effect op that would reify a metaphysical
 * score is omitted from the discriminated union and cannot parse). This
 * module is the second line: it catches TEXTUAL violations the schema cannot
 * reach — a resource `key` named `karma`, a choice that pairs a harm
 * consequence with a donation "offset", a visible "merit meter" identifier,
 * or a practice framed as a currency the player optimizes for.
 *
 * Named figures and real mantras are allowed (see SPEC.md). This lint does
 * not scan for them.
 *
 * Design notes:
 * - The lint is PURE rule-based regex/heuristic logic: no clock primitives,
 *   no RNG, no AI/LLM calls. Same pack ⇒ same report.
 */

import type { MinigameDef } from './minigame-schema';
import type { EffectOp, EraPack, Practice } from './schema';

/* -------------------------------------------------------------------------------------------------
 * Public types
 * -----------------------------------------------------------------------------------------------*/

export type LintSeverity = 'error' | 'warning';

export interface LintViolation {
  rule: string;
  severity: LintSeverity;
  message: string;
  location?: string;
}

export interface LintReport {
  passed: boolean;
  violations: LintViolation[];
}

/* -------------------------------------------------------------------------------------------------
 * Rule identifiers
 * -----------------------------------------------------------------------------------------------*/

export const R_NO_KARMA_METER = 'R-NO-KARMA-METER' as const;
export const R_NO_DONATION_OFFSET = 'R-NO-DONATION-OFFSET' as const;
export const R_NO_VISIBLE_KARMA_METER = 'R-NO-VISIBLE-KARMA-METER' as const;
export const R_NO_PRACTICE_AS_CURRENCY = 'R-NO-PRACTICE-AS-CURRENCY' as const;

/* -------------------------------------------------------------------------------------------------
 * Compiled patterns
 *
 * The four "meter" tokens whose presence in any effect/event identifier is
 * forbidden (a quantified metaphysical score). Substring match per the plan.
 * -----------------------------------------------------------------------------------------------*/
const KARMA_METER_RE = /karma|merit|spiritual_rank|enlightenment/;

/** True when `s` carries a forbidden metaphysical-meter token. */
export function containsMeterToken(s: string): boolean {
  return KARMA_METER_RE.test(s);
}

/** Suffixes that turn a theme into a VISIBLE on-screen meter. */
const VISIBLE_SUFFIX_RE = /_visible|_meter|_score/;

/** Themes that, when combined with a visibility suffix, are forbidden. */
const VISIBLE_THEME_RE = /karma|merit|spiritual/;

/** Resource/relationship keys that denote a harm consequence. */
const HARM_KEY_RE = /^harm_/;

/** Resource/relationship keys that denote a donation/alms/merit "offset". */
const DONATION_KEY_RE = /^(donation|alms|merit)_/;

/** Narrative-card sids whose name implies a harm action (weak heuristic). */
const HARM_WORDS_RE = /\b(kill|steal|lie|betray)\b/;

/* -------------------------------------------------------------------------------------------------
 * R-NO-PRACTICE-AS-CURRENCY patterns
 *
 * A practice becomes a "currency" when its outputs read like a score the
 * player optimizes for: a resource key named `merit_points`, a description
 * that tells the player to "earn" or "bank" something, or a maxProgress that
 * looks like a round "complete and cash in" target.
 * -----------------------------------------------------------------------------------------------*/

/**
 * Resource keys that reify a metaphysical score or money token inside a
 * practice effect. Substring match, case-insensitive.
 */
const PRACTICE_CURRENCY_KEY_RE = /merit|karma|score|points|coin|gold/i;

/**
 * Player-facing verbs that frame the practice as accumulating or spending a
 * balance. Word-boundary anchored so "earned" matches but "learns" does not.
 */
const PRACTICE_CURRENCY_LANG_RE =
  /\b(earn\w*|accumulate\w*|bank\w*|spend\w*|invest\w*|return on)\b/i;

/**
 * Round maxProgress values that suggest a "complete and cash in" target. The
 * list is intentionally tiny and exact: false-positives on arbitrary round
 * numbers would drown the signal. Matches produce a WARNING, not an error.
 */
const ROUND_MAX_PROGRESS_VALUES: ReadonlySet<number> = new Set([100, 1000]);

/* -------------------------------------------------------------------------------------------------
 * Generic walker — yields every string key and string value under an object.
 *
 * Used by R-NO-KARMA-METER to surface any identifier (field name OR value)
 * that carries a forbidden meter token.
 * -----------------------------------------------------------------------------------------------*/

interface WalkedString {
  /** The string itself (a key or a value). */
  s: string;
  /** Dotted/bracketed path to the string, for diagnostics. */
  path: string;
}

export function* walkStrings(obj: unknown, path = ''): Generator<WalkedString> {
  if (typeof obj === 'string') {
    yield { s: obj, path };
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const child = obj[i];
      if (child !== undefined) yield* walkStrings(child, `${path}[${i}]`);
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const childPath = path.length === 0 ? key : `${path}.${key}`;
      // The field NAME is itself a potential carrier of a forbidden token.
      yield { s: key, path: childPath };
      yield* walkStrings(value, childPath);
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Identifier extraction for a single EffectOp.
 *
 * Returns the string fields an author could weaponize as a meter name (the
 * resource/skill/flag/event/relationship/intent/card identifier). The
 * exhaustive switch satisfies `noFallthroughCasesInSwitch` and gives a
 * compile error if a new effect variant is added without coverage.
 * -----------------------------------------------------------------------------------------------*/

function effectIdentifiers(eff: EffectOp): readonly string[] {
  switch (eff.op) {
    case 'add_resource':
      return [eff.key];
    case 'add_skill':
      return [eff.key];
    case 'add_flag':
      return [eff.key];
    case 'remove_flag':
      return [eff.key];
    case 'add_relationship':
      return [eff.target];
    case 'modify_event_weight':
      return [eff.event_id];
    case 'trigger_event':
      return [eff.event_id];
    case 'set_intent_root':
      return [eff.intent_root];
    case 'narrative_card':
      return [eff.card_sid];
    case 'set_schedule':
      return [eff.schedule_id];
    case 'set_practice_override':
      return eff.practice_id === null ? [] : [eff.practice_id];
  }
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

function violation(rule: string, message: string, location?: string): LintViolation {
  const v: LintViolation = { rule, severity: 'error', message };
  if (location !== undefined) v.location = location;
  return v;
}

function warning(rule: string, message: string, location?: string): LintViolation {
  const v: LintViolation = { rule, severity: 'warning', message };
  if (location !== undefined) v.location = location;
  return v;
}

/* -------------------------------------------------------------------------------------------------
 * Rule implementations
 * -----------------------------------------------------------------------------------------------*/

/**
 * R-NO-KARMA-METER: no effect/event identifier may carry a forbidden meter
 * token (`karma`, `merit`, `spiritual_rank`, `enlightenment`). Scans every
 * string under each event (its id, trigger predicate, choices, and effects —
 * both field names and values).
 */
function checkNoKarmaMeter(pack: EraPack, out: LintViolation[]): void {
  for (const ev of pack.events) {
    const eventScope = { id: ev.id, trigger: ev.trigger, choices: ev.choices };
    for (const { s, path } of walkStrings(eventScope, `events[${ev.id}]`)) {
      if (KARMA_METER_RE.test(s)) {
        out.push(
          violation(R_NO_KARMA_METER, `prohibited meter token "${s}" in event "${ev.id}"`, path),
        );
      }
    }
  }
}

/**
 * R-NO-DONATION-OFFSET: no single choice may pair a harm consequence with a
 * donation/alms/merit effect. The mechanism models ethical weight through
 * narrative, NOT through an "offset" you can buy back with offerings.
 *
 * Heuristic (per plan todo 5): a choice violates if its effects contain BOTH
 *  - a harm indicator: an `add_resource`/`add_relationship` whose key/target
 *    starts with `harm_`, OR a `narrative_card` whose sid names a harm verb
 *    (kill/steal/lie/betray); AND
 *  - a donation indicator: an `add_resource`/`add_relationship` whose
 *    key/target starts with `donation_`/`alms_`/`merit_`.
 *
 * This is deliberately conservative: it keys off resource/relationship
 * identifiers rather than free text, because free-text harm intent lives in
 * the (out-of-pack) localization bundle.
 */
function checkNoDonationOffset(pack: EraPack, out: LintViolation[]): void {
  for (const ev of pack.events) {
    for (const ch of ev.choices) {
      let hasHarm = false;
      let hasDonation = false;
      for (const eff of ch.effects) {
        if (eff.op === 'add_resource') {
          if (HARM_KEY_RE.test(eff.key)) hasHarm = true;
          if (DONATION_KEY_RE.test(eff.key)) hasDonation = true;
        } else if (eff.op === 'add_relationship') {
          if (HARM_KEY_RE.test(eff.target)) hasHarm = true;
          if (DONATION_KEY_RE.test(eff.target)) hasDonation = true;
        } else if (eff.op === 'narrative_card') {
          if (HARM_WORDS_RE.test(eff.card_sid)) hasHarm = true;
        }
      }
      if (hasHarm && hasDonation) {
        out.push(
          violation(
            R_NO_DONATION_OFFSET,
            `choice "${ch.id}" pairs a harm consequence with a donation/alms/merit effect (forbidden "offset" mechanic)`,
            `events[${ev.id}].choices[${ch.id}].effects`,
          ),
        );
      }
    }
  }
}

/**
 * R-NO-VISIBLE-KARMA-METER: no effect identifier may pair a visibility suffix
 * (`_visible`/`_meter`/`_score`) with a forbidden theme
 * (`karma`/`merit`/`spiritual`).
 */
function checkNoVisibleKarmaMeter(pack: EraPack, out: LintViolation[]): void {
  for (const ev of pack.events) {
    for (const ch of ev.choices) {
      for (const eff of ch.effects) {
        for (const id of effectIdentifiers(eff)) {
          if (VISIBLE_SUFFIX_RE.test(id) && VISIBLE_THEME_RE.test(id)) {
            out.push(
              violation(
                R_NO_VISIBLE_KARMA_METER,
                `visible meter identifier "${id}" in choice "${ch.id}"`,
                `events[${ev.id}].choices[${ch.id}].effects[${eff.op}]`,
              ),
            );
          }
        }
      }
    }
  }
}

/**
 * R-NO-PRACTICE-AS-CURRENCY: a practice must not be framed as a currency or
 * score the player optimizes for. Three signals, each producing its own
 * violation so the author can fix them independently:
 *
 *  1. (error) An `add_resource` effect whose key matches `merit|karma|score|
 *     points|coin|gold` — the practice is literally minting a metaphysical
 *     or monetary token.
 *  2. (warning) A `maxProgress` of exactly 100 or 1000 — round "complete and
 *     cash in" targets. Warning, not error: legitimate progress curves may
 *     land on these by coincidence.
 *  3. (error) A description (resolved through the optional i18n map by
 *     `description_sid`) that uses currency verbs: earn/accumulate/bank/
 *     spend/invest/"return on". Skipped silently when the sid is absent from
 *     the map — the lint cannot invent the prose.
 *
 * `practices` and `i18n` default to empty so callers that predate this rule
 * continue to compile and behave identically.
 */
function checkNoPracticeAsCurrency(
  practices: readonly Practice[],
  i18n: Readonly<Record<string, string>>,
  out: LintViolation[],
): void {
  for (const p of practices) {
    for (const eff of p.effects) {
      if (eff.op === 'add_resource' && PRACTICE_CURRENCY_KEY_RE.test(eff.key)) {
        out.push(
          violation(
            R_NO_PRACTICE_AS_CURRENCY,
            `practice "${p.id}" mints a currency-like token via add_resource key "${eff.key}"`,
            `practices[${p.id}].effects[add_resource].key`,
          ),
        );
      }
    }
    if (ROUND_MAX_PROGRESS_VALUES.has(p.maxProgress)) {
      out.push(
        warning(
          R_NO_PRACTICE_AS_CURRENCY,
          `practice "${p.id}" has round maxProgress=${p.maxProgress} (suggests "complete and cash in")`,
          `practices[${p.id}].maxProgress`,
        ),
      );
    }
    const desc = i18n[p.description_sid];
    if (desc !== undefined && PRACTICE_CURRENCY_LANG_RE.test(desc)) {
      out.push(
        violation(
          R_NO_PRACTICE_AS_CURRENCY,
          `practice "${p.id}" description uses currency language: "${desc}"`,
          `practices[${p.id}].description_sid`,
        ),
      );
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Minigame reward scanning
 *
 * Minigame reward tiers are EffectOp[] drawn from the SAME closed union as
 * event/choice effects (see ./minigame-schema). They are therefore subject
 * to the same textual defense-in-depth: an author can still smuggle a
 * metaphysical score into a free-form resource key or pair a harm
 * consequence with a donation "offset" inside one tier.
 * -----------------------------------------------------------------------------------------------*/

/**
 * Scan every minigame's reward tiers with the remaining game-design rules:
 *
 *  - R-NO-KARMA-METER: every string under a reward effect (field name OR
 *    value) is checked for `karma|merit|spiritual_rank|enlightenment`.
 *  - R-NO-VISIBLE-KARMA-METER: each effect identifier is checked for a
 *    visibility suffix paired with a forbidden theme.
 *  - R-NO-DONATION-OFFSET: applied PER REWARD TIER — the tier's rewards play
 *    the role a choice's effects play in the pack.
 *
 * `minigames` defaults to empty so callers that predate this scan continue to
 * compile and behave identically.
 */
function checkMinigameRewards(minigames: readonly MinigameDef[], out: LintViolation[]): void {
  for (const mg of minigames) {
    for (const [ti, tier] of mg.rewardTiers.entries()) {
      // R-NO-DONATION-OFFSET accumulator (per tier, like per choice in the pack).
      let hasHarm = false;
      let hasDonation = false;

      for (const [ei, eff] of tier.rewards.entries()) {
        const loc = `minigames[${mg.id}].rewardTiers[${ti}].rewards[${ei}]`;

        // R-NO-KARMA-METER: scan every string under the effect.
        for (const { s, path } of walkStrings(eff, loc)) {
          if (KARMA_METER_RE.test(s)) {
            out.push(
              violation(
                R_NO_KARMA_METER,
                `prohibited meter token "${s}" in minigame "${mg.id}" reward tier ${ti}`,
                path,
              ),
            );
          }
        }

        // R-NO-VISIBLE-KARMA-METER: scan effect identifiers.
        for (const id of effectIdentifiers(eff)) {
          if (VISIBLE_SUFFIX_RE.test(id) && VISIBLE_THEME_RE.test(id)) {
            out.push(
              violation(
                R_NO_VISIBLE_KARMA_METER,
                `visible meter identifier "${id}" in minigame "${mg.id}" reward tier ${ti}`,
                loc,
              ),
            );
          }
        }

        // R-NO-DONATION-OFFSET accumulator (op-shape mirrors the pack-level rule).
        if (eff.op === 'add_resource') {
          if (HARM_KEY_RE.test(eff.key)) hasHarm = true;
          if (DONATION_KEY_RE.test(eff.key)) hasDonation = true;
        } else if (eff.op === 'add_relationship') {
          if (HARM_KEY_RE.test(eff.target)) hasHarm = true;
          if (DONATION_KEY_RE.test(eff.target)) hasDonation = true;
        } else if (eff.op === 'narrative_card') {
          if (HARM_WORDS_RE.test(eff.card_sid)) hasHarm = true;
        }
      }

      if (hasHarm && hasDonation) {
        out.push(
          violation(
            R_NO_DONATION_OFFSET,
            `minigame "${mg.id}" reward tier ${ti} pairs a harm consequence with a donation/alms/merit reward (forbidden "offset" mechanic)`,
            `minigames[${mg.id}].rewardTiers[${ti}].rewards`,
          ),
        );
      }
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Entry point
 * -----------------------------------------------------------------------------------------------*/

/**
 * Lint a parsed {@link EraPack} (plus optional practices, i18n strings, and
 * minigames) against the remaining game-design rules.
 *
 * `practices` and `i18n` default to empty: callers that predate
 * R-NO-PRACTICE-AS-CURRENCY continue to compile and produce identical reports.
 * When practices are supplied, R-NO-PRACTICE-AS-CURRENCY scans each practice's
 * effects, maxProgress, and (if the description_sid resolves through `i18n`)
 * description prose for currency framing.
 *
 * `minigames` defaults to empty: callers that predate minigame reward scanning
 * continue to compile and behave identically. When minigames are supplied,
 * R-NO-KARMA-METER, R-NO-VISIBLE-KARMA-METER, and R-NO-DONATION-OFFSET are
 * re-run against each minigame's `rewardTiers[].rewards`.
 *
 * `passed` is `true` iff there are zero ERROR-severity violations; WARNINGs
 * (e.g. round maxProgress) are reported but do not fail the pack.
 *
 * @returns a {@link LintReport}. Deterministic: same inputs ⇒ same report.
 */
export function lintPack(
  pack: EraPack,
  practices: readonly Practice[] = [],
  i18n: Readonly<Record<string, string>> = {},
  minigames: readonly MinigameDef[] = [],
): LintReport {
  const violations: LintViolation[] = [];
  checkNoKarmaMeter(pack, violations);
  checkNoDonationOffset(pack, violations);
  checkNoVisibleKarmaMeter(pack, violations);
  checkNoPracticeAsCurrency(practices, i18n, violations);
  checkMinigameRewards(minigames, violations);
  const hasError = violations.some((v) => v.severity === 'error');
  return { passed: !hasError, violations };
}
