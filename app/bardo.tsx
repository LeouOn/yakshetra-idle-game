// Between-lives transition (the "bardo").
//
// Reads the completed life out of save slot 1, surfaces the karma echoes that
// carried forward, and offers the next era(s). Functional UI only — no
// depiction of literal bardo imagery, no judgment by named beings (plan todo 15
// MUST-NOT). Picking an era navigates to /life/start?era=<id>. When the chain
// has no eras left, the view offers to close it and this route opens
// /chain-complete — the closing screen, not a dead end.
//
// Plan reference: todo 15.

import { router } from 'expo-router';

import BardoView, { nextErasAfter } from '@/ui/components/BardoView';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';

export default function BardoScreen() {
  const { state } = useSaveSlot(1);
  const mounted = useMounted();

  if (!mounted) {
    return <ScreenSkeleton sections={2} testID="bardo-skeleton" />;
  }

  const lifeStates = state?.chain.life_states ?? [];
  const lastLife = lifeStates.length > 0 ? lifeStates[lifeStates.length - 1] : undefined;
  const previousEra = lastLife !== undefined ? (lastLife.era as string) : null;
  const echoes = state?.chain.karma_state.echoes ?? [];

  // The chain's length decides whether another life is on offer, so a player
  // cannot alternate between the two eras forever.
  const eras = nextErasAfter(previousEra, lifeStates.length);

  return (
    <BardoView
      previousEra={previousEra}
      echoes={echoes}
      firstLife={lifeStates.length === 1}
      eras={eras}
      onPickEra={(eraId) => router.push({ pathname: '/life/start', params: { era: eraId } })}
      onCloseChain={() => router.replace('/chain-complete')}
    />
  );
}
