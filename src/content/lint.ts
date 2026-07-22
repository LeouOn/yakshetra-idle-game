/**
 * Prohibited-mechanics lint — the SECOND enforcement layer for content packs.
 *
 * The Zod schema in `./schema` is the first line of defense: it rejects
 * structurally invalid packs (any effect op that would reify a metaphysical
 * score is omitted from the discriminated union and cannot parse). This
 * module is the second line: it catches TEXTUAL violations that
 * the schema cannot reach — sacred names smuggled into a bibliographic
 * citation, a resource `key` named `karma`, a choice that pairs a harm
 * consequence with a donation "offset", a visible "merit meter" identifier,
 * or a real Sanskrit/Tibetan seed syllable embedded in glossary text.
 *
 * Both layers must pass for a content pack to ship.
 *
 * Design notes:
 * - The lint is PURE rule-based regex/heuristic logic: no clock primitives,
 *   no RNG, no AI/LLM calls. Given the same pack + the same closed
 *   list file, {@link lintPack} is deterministic.
 * - The closed list is read once at module load from
 *   `advisory/prohibited-names.txt` (resolved against `process.cwd()`, which
 *   is the repo root under both vitest and the CLI). It is read with
 *   `node:fs/promises` via top-level await (the toolchain targets ESNext +
 *   `module: preserve`, which support it), then cached so repeated lint calls
 *   do not touch the filesystem.
 *
 * See `.omo/plans/buddhist-inspired-incremental-rpg.md` todo 5.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { EffectOp, EraPack } from './schema';

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
export const R_NO_SACRED_NAMES = 'R-NO-SACRED-NAMES' as const;
export const R_NO_DONATION_OFFSET = 'R-NO-DONATION-OFFSET' as const;
export const R_NO_VISIBLE_KARMA_METER = 'R-NO-VISIBLE-KARMA-METER' as const;
export const R_NO_REAL_MANTRA = 'R-NO-REAL-MANTRA' as const;

/* -------------------------------------------------------------------------------------------------
 * Compiled patterns
 *
 * The four "meter" tokens whose presence in any effect/event identifier is
 * forbidden (a quantified metaphysical score). Substring match per the plan.
 * -----------------------------------------------------------------------------------------------*/
const KARMA_METER_RE = /karma|merit|spiritual_rank|enlightenment/;

/** Suffixes that turn a theme into a VISIBLE on-screen meter. */
const VISIBLE_SUFFIX_RE = /_visible|_meter|_score/;

/** Themes that, when combined with a visibility suffix, are forbidden. */
const VISIBLE_THEME_RE = /karma|merit|spiritual/;

/**
 * Sanskrit/Tibetan seed syllables (bija) and standalone mantra tokens. The
 * pattern is anchored to whole lines (`m` flag) so a glossary entry whose
 * value is exactly `om` or `oṁ` triggers, but `om` buried inside
 * `welcome` does not. Case-insensitive (`i`).
 */
const MANTRA_RE = /^(ॐ|oṁ|om|aḥ|hūṁ|hrih|hrīḥ|dhih|dhīḥ|bhrūm|vajra|oṃ\s|ah.*ah.*ah)$/im;

/** Resource/relationship keys that denote a harm consequence. */
const HARM_KEY_RE = /^harm_/;

/** Resource/relationship keys that denote a donation/alms/merit "offset". */
const DONATION_KEY_RE = /^(donation|alms|merit)_/;

/** Narrative-card sids whose name implies a harm action (weak heuristic). */
const HARM_WORDS_RE = /\b(kill|steal|lie|betray)\b/;

/* -------------------------------------------------------------------------------------------------
 * Closed prohibited-names list (loaded once at module import)
 * -----------------------------------------------------------------------------------------------*/

const PROHIBITED_NAMES_PATH = resolve(process.cwd(), 'advisory', 'prohibited-names.txt');

/** Parsed entries from the closed list, or empty if the file failed to load. */
let prohibitedNames: readonly string[] = [];

/** Set when the closed list could not be read; reported fail-closed by R-NO-SACRED-NAMES. */
let prohibitedNamesLoadError: string | undefined;

/**
 * Parse the raw closed-list file into individual name entries.
 *
 * - One name per line.
 * - Blank lines are skipped.
 * - Lines whose first non-space character is `#` are comments and skipped.
 */
function parseNameList(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('#')) continue;
    out.push(trimmed);
  }
  return out;
}

// Top-level await: read once, cache. Runs under vitest (node env) and tsc
// (--noEmit, ESNext target). If the file is missing the lint fails closed.
try {
  const raw = await readFile(PROHIBITED_NAMES_PATH, 'utf8');
  prohibitedNames = parseNameList(raw);
} catch (err) {
  prohibitedNames = [];
  prohibitedNamesLoadError = err instanceof Error ? err.message : String(err);
}

/**
 * Build a single combined regex from the closed list. Uses Unicode
 * letter-based boundaries via lookarounds (`\p{L}`) instead of `\b`, because
 * `\b` is ASCII-only and would mishandle diacritics that begin/end names such
 * as `Śāntideva` (leading `Ś`) or `Mañjuśrī` (trailing `ī`).
 */
function buildNamesRegex(names: readonly string[]): RegExp | null {
  if (names.length === 0) return null;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}])(?:${escaped.join('|')})(?![\\p{L}])`, 'giu');
}

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

function* walkStrings(obj: unknown, path = ''): Generator<WalkedString> {
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

/** All `_sid` string fields that the schema guarantees exist on the pack. */
function collectSidStrings(pack: EraPack): readonly { text: string; loc: string }[] {
  const out: { text: string; loc: string }[] = [
    { text: pack.name_sid, loc: 'name_sid' },
    { text: pack.lineage_notes_sid, loc: 'lineage_notes_sid' },
    { text: pack.rule_variation.description_sid, loc: 'rule_variation.description_sid' },
  ];
  for (const ev of pack.events) {
    for (const ch of ev.choices) {
      out.push({
        text: ch.label_sid,
        loc: `events[${ev.id}].choices[${ch.id}].label_sid`,
      });
      for (const eff of ch.effects) {
        if (eff.op === 'narrative_card') {
          out.push({
            text: eff.card_sid,
            loc: `events[${ev.id}].choices[${ch.id}].effects[narrative_card].card_sid`,
          });
        }
      }
    }
  }
  return out;
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
 * R-NO-SACRED-NAMES: no `_sid`, source_bibliography entry, or
 * lineage_notes_sid may reference a name from the closed list. Case-insensitive
 * with Unicode letter boundaries. Fails closed if the list could not load.
 */
function checkNoSacredNames(pack: EraPack, out: LintViolation[]): void {
  if (prohibitedNamesLoadError !== undefined) {
    out.push(
      violation(
        R_NO_SACRED_NAMES,
        `closed prohibited-names list could not be loaded from disk (${prohibitedNamesLoadError}); cannot verify`,
        PROHIBITED_NAMES_PATH,
      ),
    );
    return;
  }
  const re = buildNamesRegex(prohibitedNames);
  if (re === null) return;

  const haystacks: { text: string; loc: string }[] = [
    ...collectSidStrings(pack),
    { text: pack.lineage_notes_sid, loc: 'lineage_notes_sid' },
  ];
  for (const src of pack.source_bibliography) {
    haystacks.push({ text: src.citation, loc: 'source_bibliography.citation' });
    haystacks.push({ text: src.url, loc: 'source_bibliography.url' });
  }

  for (const h of haystacks) {
    re.lastIndex = 0;
    if (re.test(h.text)) {
      out.push(
        violation(
          R_NO_SACRED_NAMES,
          `prohibited sacred-name reference in ${h.loc}: "${h.text}"`,
          h.loc,
        ),
      );
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
 * R-NO-REAL-MANTRA: no narrative text may contain a real Sanskrit/Tibetan seed
 * syllable. Scans glossary values (the only player-facing prose in the pack).
 * `lineage_notes` prose lives in the localization bundle, not the pack; its
 * `_sid` is scanned here as a weak signal.
 */
function checkNoRealMantra(pack: EraPack, out: LintViolation[]): void {
  const texts: { text: string; loc: string }[] = [];
  for (const [term, localized] of Object.entries(pack.glossary)) {
    if (typeof localized === 'string') {
      texts.push({ text: localized, loc: `glossary[${term}]` });
      continue;
    }
    for (const [locale, value] of Object.entries(localized)) {
      texts.push({ text: value, loc: `glossary[${term}][${locale}]` });
    }
  }
  texts.push({ text: pack.lineage_notes_sid, loc: 'lineage_notes_sid' });

  for (const t of texts) {
    if (MANTRA_RE.test(t.text)) {
      out.push(
        violation(R_NO_REAL_MANTRA, `seed-syllable mantra token in ${t.loc}: "${t.text}"`, t.loc),
      );
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Entry point
 * -----------------------------------------------------------------------------------------------*/

/**
 * Lint a parsed {@link EraPack} against all five prohibited-mechanics rules.
 *
 * @returns a {@link LintReport}; `passed` is `true` iff there are zero
 * violations. Deterministic: same pack + same closed-list file ⇒ same report.
 */
export function lintPack(pack: EraPack): LintReport {
  const violations: LintViolation[] = [];
  checkNoKarmaMeter(pack, violations);
  checkNoSacredNames(pack, violations);
  checkNoDonationOffset(pack, violations);
  checkNoVisibleKarmaMeter(pack, violations);
  checkNoRealMantra(pack, violations);
  return { passed: violations.length === 0, violations };
}

/** Read-only access to the loaded closed list (for self-check tooling/tests). */
export function getProhibitedNames(): readonly string[] {
  return prohibitedNames;
}

/** The load error for the closed list, if any (for diagnostics). */
export function getProhibitedNamesLoadError(): string | undefined {
  return prohibitedNamesLoadError;
}
