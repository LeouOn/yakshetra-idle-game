// Bench ↔ studio field mapping — the single shape translator.
//
// The BenchState (storage) ↔ StudioState (runtime) field mapping used to be
// duplicated across studio-session (snapshot + hydrate), studio-session-v0
// (migration), and session-step (benchToStudio + benchAfterStep). It lives
// here once now. Every import is TYPE-ONLY: this module has no value
// dependencies, so it can sit under any importer without creating a runtime
// cycle. Pure: no Date, no network, no RNG. Copy-on-write: inputs are never
// mutated and shared arrays are reused by reference where the step loop
// allows it (see benchAfterStep).

import type { Manifest } from './manifest';
import type { StudioState } from './operations';
import type { ResidueEvent } from './residue';
import type { BenchState } from './studio-session';

/** An empty storage bench — the baseline before any residue lands. */
export function emptyBench(): BenchState {
  return {
    residue: [],
    last_harvest_index: -1,
    bay: null,
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: 0,
  };
}

/** Storage bench slice → runtime StudioState; the shared archive (kept at
 * session level, never on the bench) is attached by the caller. The stored
 * bay's optional focus is normalized to null. */
export function benchToStudio(bench: BenchState, archive: readonly Manifest[]): StudioState {
  return {
    residue: bench.residue,
    last_harvest_index: bench.last_harvest_index,
    bay: bench.bay === null ? null : { ...bench.bay, focus: bench.bay.focus ?? null },
    archive,
    quality_tier: bench.quality_tier,
    harvest_count: bench.harvest_count,
    play_import: bench.play_import,
    pinned: bench.pinned,
    surplus: bench.surplus,
  };
}

/** Re-shape runtime events (readonly ids/numbers) as mutable schema events —
 * storage slices own their copies. */
function schemaEvents(log: readonly ResidueEvent[]): BenchState['residue'] {
  return log.map((event) => ({
    ...event,
    ids: [...event.ids],
    numbers: { ...event.numbers },
  }));
}

/** Runtime StudioState → storage bench slice. The archive is NOT stored on
 * the bench. Residue logs and the queued bay window are copied into mutable
 * schema shape; use benchAfterStep on the step path instead, where the
 * append-only discipline reuses the persisted prefix. */
export function studioToBench(studio: StudioState): BenchState {
  return {
    residue: schemaEvents(studio.residue),
    last_harvest_index: studio.last_harvest_index,
    bay: studio.bay === null ? null : { ...studio.bay, residue: schemaEvents(studio.bay.residue) },
    quality_tier: studio.quality_tier,
    harvest_count: studio.harvest_count,
    play_import: studio.play_import,
    pinned: studio.pinned,
    surplus: studio.surplus,
  };
}

/** Only the events a step appended beyond the persisted prefix, re-shaped as
 * mutable schema events (session slices store mutable ids/numbers). */
export function freshSchemaEvents(
  log: readonly ResidueEvent[],
  prevLen: number,
): BenchState['residue'] {
  return log.slice(prevLen).map((event) => ({
    ...event,
    ids: [...event.ids],
    numbers: { ...event.numbers },
  }));
}

/** stepStudio only advances cook_ticks_done/status — keep the queued window. */
function bayAfterStep(studio: StudioState, prevBay: BenchState['bay']): BenchState['bay'] {
  if (studio.bay === null) {
    return null;
  }
  if (prevBay === null) {
    throw new Error('stepSession: step produced a bay without a queued window');
  }
  return { ...prevBay, cook_ticks_done: studio.bay.cook_ticks_done, status: studio.bay.status };
}

/** Bench slice after a step. Logs are append-only, so the persisted prefix
 * array is reused and only the fresh tail is copied. */
export function benchAfterStep(studio: StudioState, prev: BenchState): BenchState {
  const prevLen = prev.residue.length;
  return {
    residue:
      studio.residue.length === prevLen
        ? prev.residue
        : [...prev.residue, ...freshSchemaEvents(studio.residue, prevLen)],
    last_harvest_index: studio.last_harvest_index,
    bay: bayAfterStep(studio, prev.bay),
    quality_tier: studio.quality_tier,
    harvest_count: studio.harvest_count,
    play_import: studio.play_import,
    pinned: studio.pinned,
    surplus: studio.surplus,
  };
}
