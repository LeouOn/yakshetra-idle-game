// Between-lives transition (the "bardo").
//
// Reads the completed life out of save slot 1, surfaces the karma echoes that
// carried forward, and offers the next era(s). Functional UI only — no
// depiction of literal bardo imagery, no judgment by named beings (plan todo 15
// MUST-NOT). Picking an era navigates to /life/start?era=<id>.
//
// Plan reference: todo 15.

import { router } from 'expo-router';

import BardoView, { nextErasAfter } from '@/ui/components/BardoView';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';

export default function BardoScreen() {
  const { state } = useSaveSlot(1);

  const lifeStates = state?.chain.life_states ?? [];
  const lastLife = lifeStates.length > 0 ? lifeStates[lifeStates.length - 1] : undefined;
  const previousEra = lastLife !== undefined ? (lastLife.era as string) : null;
  const echoes = state?.chain.karma_state.echoes ?? [];

  const eras = nextErasAfter(previousEra);

  return (
    <BardoView
      previousEra={previousEra}
      echoes={echoes}
      eras={eras}
      onPickEra={(eraId) => router.push({ pathname: '/life/start', params: { era: eraId } })}
    />
  );
}
