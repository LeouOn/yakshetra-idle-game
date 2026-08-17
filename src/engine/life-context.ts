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

export const LIFE_CONTEXT_VERSION = 'life_context/v0' as const;

export type BondKind = 'close' | 'owed' | 'warm' | 'thin';

export interface LifeTie {
  readonly id: string;
  readonly source: 'relationship' | 'cast';
  readonly trust: number;
  readonly debt: number;
  readonly affection: number;
  readonly bond: BondKind;
}

export interface LifeSetting {
  readonly era_id: string;
  readonly role_id: string;
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

export function classifyBond(trust: number, debt: number, affection: number): BondKind {
  if (affection >= 3 && trust >= 2) {
    return 'close';
  }
  if (debt > trust) {
    return 'owed';
  }
  if (affection > 0 || trust > 0) {
    return 'warm';
  }
  return 'thin';
}

function tiesFromLife(life: LifeState): LifeTie[] {
  const ties: LifeTie[] = [];
  for (const [id, rel] of Object.entries(life.relationships)) {
    ties.push({
      id,
      source: 'relationship',
      trust: rel.trust,
      debt: rel.debt,
      affection: rel.affection,
      bond: classifyBond(rel.trust, rel.debt, rel.affection),
    });
  }
  return ties;
}

function tiesFromCast(archive: readonly Manifest[]): LifeTie[] {
  return archive
    .filter((card) => card.kind === 'person')
    .map((card) => ({
      id: card.id,
      source: 'cast' as const,
      trust: 1,
      debt: 0,
      affection: 2,
      bond: 'warm' as const,
    }));
}

function strongestTieId(ties: readonly LifeTie[]): string | null {
  if (ties.length === 0) {
    return null;
  }
  const ranked = [...ties].sort((a, b) => {
    const score = (t: LifeTie): number => t.affection * 3 + t.trust * 2 - t.debt;
    return score(b) - score(a);
  });
  return ranked[0]?.id ?? null;
}

export interface EvaluateLifeOptions {
  readonly life: LifeState;
  readonly idle: IdleState;
  readonly epoch: CalendarEpoch;
  readonly practices?: readonly Practice[];
  readonly archive?: readonly Manifest[];
}

export function evaluateLifeContext(opts: EvaluateLifeOptions): LifeContext {
  const cal = tickToCalendar(opts.idle.lastSimulatedTick, opts.epoch);
  const world: WorldDraft | null = opts.archive ? assembleWorldDraft(opts.archive) : null;
  const ties = [...tiesFromLife(opts.life), ...tiesFromCast(opts.archive ?? [])];
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
      year: cal.year,
      month: cal.month,
      day: cal.day,
      hour: cal.hour,
      calendar_label: `Year ${cal.year}, month ${cal.month}, day ${cal.day}`,
    },
    ties,
    strongest_tie: strongestTieId(ties),
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
