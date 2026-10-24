// Fold a campaign life's residue log into the persisted studio session.
// Pure merge lives in the engine; this file is only load → import → save.

import {
  emptyHydratedSession,
  importPlayResidue,
  parseStudioSession,
  snapshotStudioSession,
} from '@/engine';
import type { ResidueEvent, StudioState } from '@/engine';

import { loadStudioSession, saveStudioSession, type StudioKv } from './studio-kv';

/**
 * Import new play residue into the bench session.
 * Creates a session if none exists. No-op when the cursor is already current and the era is
 * unchanged.
 *
 * `era` is the campaign life's era when it is a real pack id (the caller filters build-internal
 * tokens): the bench follows the era the player is living in. It is written even when there is
 * no new residue, so a player who starts a Garden life and opens the bench at once gets the
 * Garden bench. Absent, the session keeps its last value.
 */
export async function syncPlayResidueToStudio(
  lifeId: string,
  lifeLog: readonly ResidueEvent[],
  kv?: StudioKv,
  era?: string,
): Promise<StudioState> {
  const existing = await loadStudioSession(kv);
  const empty = emptyHydratedSession();
  const base =
    existing ?? snapshotStudioSession(empty.studio, empty.idle, empty.life, empty.practices);
  const bench = base.benches['person'];
  const studio: StudioState =
    bench === undefined
      ? { ...empty.studio, archive: base.archive }
      : {
          residue: bench.residue,
          last_harvest_index: bench.last_harvest_index,
          bay: bench.bay === null ? null : { ...bench.bay, focus: bench.bay.focus ?? null },
          archive: base.archive,
          quality_tier: bench.quality_tier,
          harvest_count: bench.harvest_count,
          play_import: bench.play_import,
          pinned: bench.pinned,
          surplus: bench.surplus,
          held_residue: bench.held_residue,
          cook_choices: bench.cook_choices,
        };
  const next = importPlayResidue(studio, lifeId, lifeLog);
  const eraChanged = era !== undefined && base.bench_era !== era;
  if (next === studio && !eraChanged) {
    return next;
  }
  // Spread the EXISTING bench and override only the imported fields, so a
  // bench field added later can never be silently dropped here (wave-1
  // review #1: the field-listed literal reset held_residue, cook_choices and
  // fold_position to their zod defaults on every campaign sync — silent
  // data loss of carried traces).
  const person = base.benches['person'];
  const saved = parseStudioSession({
    ...base,
    ...(era === undefined ? {} : { bench_era: era }),
    benches: {
      ...base.benches,
      ...(person === undefined
        ? {}
        : {
            person: {
              ...person,
              residue: next.residue,
              last_harvest_index: next.last_harvest_index,
              bay: next.bay,
              quality_tier: next.quality_tier,
              harvest_count: next.harvest_count,
              play_import: next.play_import,
              pinned: next.pinned,
              surplus: next.surplus,
            },
          }),
    },
  });
  await saveStudioSession(saved, kv);
  return next;
}
