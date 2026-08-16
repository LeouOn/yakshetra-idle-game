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
 * Creates a session if none exists. No-op when the cursor is already current.
 */
export async function syncPlayResidueToStudio(
  lifeId: string,
  lifeLog: readonly ResidueEvent[],
  kv?: StudioKv,
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
        };
  const next = importPlayResidue(studio, lifeId, lifeLog);
  if (next === studio) {
    return next;
  }
  const saved = parseStudioSession({
    ...base,
    benches: {
      ...base.benches,
      person: {
        residue: next.residue,
        last_harvest_index: next.last_harvest_index,
        bay: next.bay,
        quality_tier: next.quality_tier,
        harvest_count: next.harvest_count,
        play_import: next.play_import,
        pinned: next.pinned,
        surplus: next.surplus,
      },
    },
  });
  await saveStudioSession(saved, kv);
  return next;
}
