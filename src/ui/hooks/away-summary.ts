// The return moment: what the away catch-up actually made, in one calm
// summary. Pure: the hook hands it the catch-up result; nothing is persisted.
//
// A return with nothing to show (a two-minute absence, or a first session)
// yields null so the panel stays off. A bay the player left ready is reported
// as ready, never counted as a working finished behind their back.

import type { Manifest } from '@/engine';

/** A keepsake worth naming and opening: a person or place that came back. */
export interface ReturnKeepsake {
  readonly id: string;
  readonly name: string;
}

export interface ReturnSummary {
  readonly ticksSimulated: number;
  readonly residueGained: number;
  /** Archived workings whose cards were made while away. */
  readonly workings: number;
  /** The person/place cards among them, for named chips. */
  readonly keepsakes: readonly ReturnKeepsake[];
  /** Other keepsakes: archived things/changes plus ready tier benches. */
  readonly otherKeepsakes: number;
  /** Any bench with a finished card waiting (including one left ready). */
  readonly bayReady: boolean;
  readonly capped: boolean;
}

export interface ReturnSummaryInput {
  readonly ticksSimulated: number;
  readonly residueGained: number;
  readonly harvested: readonly Manifest[];
  readonly benchesReady: readonly string[];
  readonly capped: boolean;
}

/** Shorter than this, an absence only earns the panel if it left a card. */
export const AWAY_QUIET_TICKS = 30;

const NAMED_KINDS = new Set(['person', 'place']);

export function deriveReturnSummary(input: ReturnSummaryInput): ReturnSummary | null {
  const keepsakes = input.harvested
    .filter((card) => NAMED_KINDS.has(card.kind))
    .map((card) => ({ id: card.id, name: card.name }));
  const otherArchived = input.harvested.length - keepsakes.length;
  const tierReady = input.benchesReady.filter((id) => id !== 'person').length;
  const workings = input.harvested.length;
  const otherKeepsakes = otherArchived + tierReady;
  const bayReady = input.benchesReady.length > 0;
  const hasCard = workings > 0 || otherKeepsakes > 0 || bayReady;
  const hasNews = hasCard || input.capped;
  if (!hasNews && input.ticksSimulated < AWAY_QUIET_TICKS) {
    return null;
  }
  return {
    ticksSimulated: input.ticksSimulated,
    residueGained: input.residueGained,
    workings,
    keepsakes,
    otherKeepsakes,
    bayReady,
    capped: input.capped,
  };
}
