// Life context — evaluate a life for setting, time, and ties.
// Structured for a later LLM filler. Pure: no Date, no fetch.

import { z } from 'zod';

import { summarizeActivities, type ActivityTotals } from './activities';
import { tickToCalendar, type CalendarEpoch } from './calendar';
import type { IdleState, LifeState, Practice } from './types';
import { residueLog, summarizeResidue, type ResidueSummary } from './residue';
import { assembleWorldDraft, type WorldDraft } from './world-draft';
import type { Manifest } from './manifest';
import { canonicalStringify } from './serialize';
import { tiesFromCast, tiesFromLife, strongestTieName } from './life-ties';

export const LIFE_CONTEXT_VERSION = 'life_context/v0' as const;

export type BondKind = 'close' | 'owed' | 'warm' | 'thin';

export interface LifeTie {
  readonly id: string;
  /**
   * The name a card is allowed to print. A cast tie's id is a manifest id
   * ("m-0-464489159"), which is not a word; the card's own name is. Null means
   * "no display name yet", and callers must then fall back to the id or print
   * nothing.
   */
  readonly name: string | null;
  readonly source: 'relationship' | 'cast';
  readonly trust: number;
  readonly debt: number;
  readonly affection: number;
  readonly bond: BondKind;
}

export interface LifeSetting {
  readonly era_id: string;
  readonly role_id: string;
  /**
   * Player-facing era name, supplied by the caller. The engine cannot resolve
   * an id to a label (no i18n in `src/engine`), so it stays absent unless the
   * UI passes it. Callers that leave it absent must not print `era_id` to the
   * player — it is a build-internal token like `studio-bench@0.1.0`.
   */
  readonly era_name?: string;
  /**
   * Player-facing role name, supplied by the caller. Absent for a bench
   * stand-in life, whose `role_id` (`operator`) is a placeholder rather than
   * an identity the player chose.
   */
  readonly role_name?: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly calendar_label: string;
}

export interface LifeContext {
  readonly schema_version: typeof LIFE_CONTEXT_VERSION;
  readonly life_id: string;
  readonly age: number;
  readonly turn: number;
  readonly alive: boolean;
  readonly lens: string | null;
  readonly setting: LifeSetting;
  readonly ties: readonly LifeTie[];
  readonly strongest_tie: string | null;
  readonly flags: readonly string[];
  readonly residue_summary: ResidueSummary;
  readonly activity: ActivityTotals;
  readonly world_name: string | null;
  readonly world_line: string | null;
}

const TieSchema = z
  .object({
    id: z.string().min(1),
    source: z.enum(['relationship', 'cast']),
    trust: z.number(),
    debt: z.number(),
    affection: z.number(),
    bond: z.enum(['close', 'owed', 'warm', 'thin']),
  })
  .strict();

export const LifeContextSchema = z
  .object({
    schema_version: z.literal(LIFE_CONTEXT_VERSION),
    life_id: z.string().min(1),
    age: z.number().int().nonnegative(),
    turn: z.number().int().nonnegative(),
    alive: z.boolean(),
    lens: z.string().nullable(),
    setting: z
      .object({
        era_id: z.string().min(1),
        role_id: z.string().min(1),
        era_name: z.string().min(1).optional(),
        role_name: z.string().min(1).optional(),
        year: z.number().int(),
        month: z.number().int(),
        day: z.number().int(),
        hour: z.number().int(),
        calendar_label: z.string().min(1),
      })
      .strict(),
    ties: z.array(TieSchema),
    strongest_tie: z.string().nullable(),
    flags: z.array(z.string()),
    residue_summary: z.object({
      count: z.number().int().nonnegative(),
      firstTick: z.number(),
      lastTick: z.number(),
      typeCounts: z.record(z.string(), z.number()),
      dominantType: z.string().nullable(),
      ids: z.array(z.string()),
    }),
    activity: z.object({
      work: z.number(),
      generosity: z.number(),
      beings: z.number(),
      learning: z.number(),
      meditation: z.number(),
      other: z.number(),
    }),
    world_name: z.string().nullable(),
    world_line: z.string().nullable(),
  })
  .strict();

export interface EvaluateLifeOptions {
  readonly life: LifeState;
  readonly idle: IdleState;
  readonly epoch: CalendarEpoch;
  readonly practices?: readonly Practice[];
  readonly archive?: readonly Manifest[];
  /**
   * Player-facing era/role names, resolved by the UI from the era pack. The
   * engine stores them verbatim; it never derives a label from an id.
   * Omit them when the life has no pack behind it (the bench stand-in).
   */
  readonly eraName?: string;
  readonly roleName?: string;
}

export function evaluateLifeContext(opts: EvaluateLifeOptions): LifeContext {
  const cal = tickToCalendar(opts.idle.lastSimulatedTick, opts.epoch);
  const world: WorldDraft | null = opts.archive ? assembleWorldDraft(opts.archive) : null;
  const manifestIds = new Set((opts.archive ?? []).map((c) => c.id));
  const ties = [...tiesFromLife(opts.life, manifestIds), ...tiesFromCast(opts.archive ?? [])];
  const context: LifeContext = {
    schema_version: LIFE_CONTEXT_VERSION,
    life_id: opts.life.id,
    age: opts.life.age,
    turn: opts.life.turn,
    alive: opts.life.alive,
    lens: opts.life.chosen_lens,
    setting: {
      era_id: opts.life.era,
      role_id: opts.life.role,
      ...(opts.eraName === undefined ? {} : { era_name: opts.eraName }),
      ...(opts.roleName === undefined ? {} : { role_name: opts.roleName }),
      year: cal.year,
      month: cal.month,
      day: cal.day,
      hour: cal.hour,
      calendar_label: `Year ${cal.year}, month ${cal.month}, day ${cal.day}`,
    },
    ties,
    strongest_tie: strongestTieName(ties),
    flags: [...opts.life.flags].sort(),
    residue_summary: summarizeResidue(residueLog(opts.life)),
    activity: summarizeActivities(opts.practices ?? []),
    world_name: world?.name ?? null,
    world_line: world?.one_liner ?? null,
  };
  return context;
}

export function stringifyLifeContext(context: LifeContext): string {
  return canonicalStringify(context);
}
