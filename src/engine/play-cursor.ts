// Play-import cursor — folding a campaign life's residue log into the bench.
//
// Pure move from operations.ts (Binding Decision 6): the cursor type, the
// import helper, and nothing else. StudioState is imported TYPE-ONLY (erased
// at compile time) so operations.ts can re-export this module's values
// without a runtime import cycle.
// Pure: no Date, no Math.random, no fetch.

import type { StudioState } from './operations';
import type { ResidueEvent } from './residue';

/** How far this bench has already imported a campaign life's residue log. */
export interface PlayImportCursor {
  readonly life_id: string;
  readonly index: number;
}

function appendResidues(studio: StudioState, events: readonly ResidueEvent[]): StudioState {
  if (events.length === 0) {
    return studio;
  }
  return { ...studio, residue: [...studio.residue, ...events] };
}

/**
 * Fold a campaign life's residue log into the bench.
 * Same life: only events after `play_import.index`. New life: import all.
 */
export function importPlayResidue(
  studio: StudioState,
  lifeId: string,
  lifeLog: readonly ResidueEvent[],
): StudioState {
  if (lifeLog.length === 0) {
    const cursor = studio.play_import;
    if (cursor !== null && cursor.life_id === lifeId && cursor.index === -1) {
      return studio;
    }
    return { ...studio, play_import: { life_id: lifeId, index: -1 } };
  }
  const sameLife = studio.play_import !== null && studio.play_import.life_id === lifeId;
  const start = sameLife ? studio.play_import.index + 1 : 0;
  const last = lifeLog.length - 1;
  if (start > last) {
    return studio;
  }
  const fresh = lifeLog.slice(start);
  return {
    ...appendResidues(studio, fresh),
    play_import: { life_id: lifeId, index: last },
  };
}
