// Push campaign-life residue into the persisted Manifest bench.
// No-op when disabled so turn-screen tests stay offline.

import { useEffect } from 'react';

import { residueLog, type LifeState, type ResidueEvent } from '@/engine';
import { syncPlayResidueToStudio, type StudioKv } from '@/persistence';

export function usePlayResidueBridge(state: LifeState, enabled: boolean, storage?: StudioKv): void {
  const log: readonly ResidueEvent[] = residueLog(state);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    void syncPlayResidueToStudio(state.id, log, storage);
  }, [enabled, state.id, log, storage]);
}
