// Chain-complete screen — the reflective close of a life chain.
//
// Reads the life-chain save slot and the bench session, hands both to
// `describeChain`, and owns the one action: beginning a new chain clears the
// life slot so the next life opens a fresh chain. The bench session is left
// alone — its pins and world drafts seed that new chain through
// `applyStudioToNextLife` on the life route.

import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { StudioSession } from '@/engine';
import { loadStudioSession } from '@/persistence';
import ChainCompleteView, { describeChain } from '@/ui/components/ChainCompleteView';
import SaveSlotErrorBar, { retryPropsFor } from '@/ui/components/SaveSlotErrorBar';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';

export default function ChainCompleteScreen() {
  const { state, loading, deleteSlot, error, clearError, retryLoad } = useSaveSlot(1);
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

  // A load failure means the bytes exist but we could not read them: the
  // screen has nothing to close, and the one action would delete the only
  // copy. Block it until a retry reads the slot; the bar's Try again is the
  // enabled path out. A DELETE failure keeps the action live for a retry.
  const beginBlocked = error?.operation === 'load';

  return (
    <View style={styles.flex}>
      {error === null ? null : (
        <SaveSlotErrorBar
          error={error}
          {...retryPropsFor(error, retryLoad)}
          onContinue={clearError}
        />
      )}
      <ChainCompleteView
        {...describeChain(state, session)}
        beginDisabled={beginBlocked}
        onBeginNewChain={() => {
          // The disabled control is the perceivable guard; this is the real
          // one, so a programmatic press cannot destroy unreadable bytes.
          if (beginBlocked) {
            return;
          }
          // Only leave once the slot is actually gone; a refused delete keeps
          // the player here with the bar explaining why.
          void deleteSlot(1).then((deleted) => {
            if (deleted) {
              router.replace('/life/start');
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
