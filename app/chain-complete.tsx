// Chain-complete screen — the reflective close of a life chain.
//
// Reads the life-chain save slot and the bench session, hands both to
// `describeChain`, and owns the one action: beginning a new chain clears the
// life slot so the next life opens a fresh chain. The bench session is left
// alone — its pins and world drafts seed that new chain through
// `applyStudioToNextLife` on the life route.

import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import type { StudioSession } from '@/engine';
import { loadStudioSession } from '@/persistence';
import ChainCompleteView, { describeChain } from '@/ui/components/ChainCompleteView';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';

export default function ChainCompleteScreen() {
  const { state, loading, deleteSlot } = useSaveSlot(1);
  const mounted = useMounted();
  const [session, setSession] = useState<StudioSession | null>(null);
  const [benchRead, setBenchRead] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadStudioSession().then((loaded) => {
      if (!cancelled) {
        setSession(loaded);
        setBenchRead(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Both stores have to be read before the record is true: rendering early
  // would tell a player the bench kept nothing while it was still loading.
  if (loading || !benchRead || !mounted) {
    return <ScreenSkeleton sections={3} testID="chain-complete-skeleton" />;
  }

  return (
    <ChainCompleteView
      {...describeChain(state, session)}
      onBeginNewChain={() => {
        void deleteSlot(1).then(() => {
          router.replace('/life/start');
        });
      }}
    />
  );
}
