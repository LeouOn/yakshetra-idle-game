// Push campaign-life residue into the persisted Manifest bench.
// No-op when disabled so turn-screen tests stay offline.

import { useEffect } from 'react';

import { hasEraBundle } from '@/content/registry';
import { residueLog, type LifeState, type ResidueEvent } from '@/engine';
import { syncPlayResidueToStudio, type StudioKv } from '@/persistence';

export function usePlayResidueBridge(state: LifeState, enabled: boolean, storage?: StudioKv): void {
  const log: readonly ResidueEvent[] = residueLog(state);
  // The bench follows the player's era, but only a REAL pack id counts: build-internal tokens
  // (`studio-bench@0.1.0`, test eras) and stale ids leave the session's last era alone.
  const era = hasEraBundle(state.era) ? state.era : undefined;
  useEffect(() => {
    if (!enabled) {
      return;
    }
    void syncPlayResidueToStudio(state.id, log, storage, era);
  }, [enabled, state.id, era, log, storage]);
}
