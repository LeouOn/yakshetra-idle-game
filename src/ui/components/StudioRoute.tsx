// StudioRoute — the /studio route body (wave 2 hydration fix, lane b1).
//
// Loads the pack bench and gates it behind useMounted: the server render and
// the FIRST client render both show ScreenSkeleton, so React 19 hydration
// (#418) succeeds — the bench derives from client-only state (the persisted
// session, window width for the rail variant) and mounts only after the
// flip, as a normal post-hydration update. Every loaded-bench testID is
// unchanged after mount.

import { StyleSheet, Text, View } from 'react-native';

import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';
import { epochFromPackCalendar } from '@/content/calendar-epoch';
import { loadEraPack } from '@/content/loader';
import type { Practice as ContentPractice } from '@/content/schema';
import type { Practice } from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import StudioView from '@/ui/components/StudioView';

const DEFAULT_ERA = 'tang-china';

function toRuntimePractice(practice: ContentPractice): Practice {
  return {
    id: practice.id,
    label_sid: practice.label_sid,
    description_sid: practice.description_sid,
    lens: practice.lens,
    progressPerTick: practice.progressPerTick,
    maxProgress: practice.maxProgress,
    currentProgress: 0,
    level: 0,
    effects: practice.effects,
    ...(practice.minigame_id === undefined ? {} : { minigame_id: practice.minigame_id }),
  };
}

// Wave 1b: the bench runs the pack's AUTHORED DailySchedules, rotated per
// in-game day by the engine (session-step reads ctx.embodiedSchedules and
// runs day N on schedules[N % length]). The invented slice(0, 6) bench day
// stranded every practice past position 6 — including all three
// figure-bound ones — and made every window multi-practice, closing the
// kind funnel. `schedule` stays the first authored day as the single-day
// fallback for callers that never pass the list.

function loadBench() {
  try {
    const pack = loadEraPack(DEFAULT_ERA);
    const practices = pack.practices.map(toRuntimePractice);
    const schedules: readonly DailySchedule[] = pack.schedules;
    if (practices.length === 0 || schedules.length === 0) {
      return null;
    }
    return {
      practices,
      schedules,
      endings: pack.endings,
      epoch: epochFromPackCalendar(pack.calendar),
    };
  } catch {
    return null;
  }
}

export default function StudioRoute({ onBack }: { readonly onBack?: () => void }) {
  const bench = loadBench();
  const firstDay = bench?.schedules[0];
  // Hydration parity (React #418, review fix): the server and the FIRST
  // client render both show the skeleton — the bench derives from client
  // state (the persisted session, window width for the rail variant), so it
  // mounts only after useMounted flips. The swap is a normal post-hydration
  // update; every testID of the loaded bench is unchanged after mount.
  const mounted = useMounted();
  if (!mounted) {
    // No labelSid: StudioView's root (studio-screen) carries no
    // accessibilityLabel, so the skeleton must not either (browser finding
    // 3 — a different aria-label on the same element is a #418 mismatch).
    return <ScreenSkeleton sections={6} testID="studio-skeleton" />;
  }
  if (bench === null || firstDay === undefined) {
    return (
      <View role="main" style={styles.fallback}>
        <Text>{resolveSid('studio.unavailable_sid')}</Text>
      </View>
    );
  }
  return (
    <StudioView
      practices={bench.practices}
      schedule={firstDay}
      embodiedSchedules={bench.schedules}
      endings={bench.endings}
      {...(onBack === undefined ? {} : { onBack })}
      persist
      epoch={bench.epoch}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: t.bg,
  },
});
