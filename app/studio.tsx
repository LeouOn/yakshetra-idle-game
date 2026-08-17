// Manifest bench route. Loads existing practice data as the residue source
// without restyling the rest of the app.

import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { epochFromPackCalendar } from '@/content/calendar-epoch';
import { loadEraPack } from '@/content/loader';
import type { Practice as ContentPractice } from '@/content/schema';
import type { Practice } from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
import { resolveSid } from '@/i18n';
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

function benchSchedule(practices: readonly Practice[]): DailySchedule {
  const blocks = practices.slice(0, 6).map((practice, index, all) => {
    const span = 24 / all.length;
    return {
      id: `studio-block-${index}`,
      label_sid: practice.label_sid,
      startHour: Math.round(index * span),
      endHour: Math.round((index + 1) * span),
      practice_id: practice.id,
      icon_sid: practice.label_sid,
    };
  });
  return {
    id: 'studio-bench',
    name_sid: 'studio.title_sid',
    blocks:
      blocks.length > 0
        ? blocks
        : [
            {
              id: 'studio-block-empty',
              label_sid: 'studio.tend_button_sid',
              startHour: 0,
              endHour: 24,
              practice_id: null,
              icon_sid: 'studio.title_sid',
            },
          ],
  };
}

function loadBench() {
  try {
    const pack = loadEraPack(DEFAULT_ERA);
    const practices = pack.practices.map(toRuntimePractice);
    if (practices.length === 0) {
      return null;
    }
    return {
      practices,
      endings: pack.endings,
      epoch: epochFromPackCalendar(pack.calendar),
    };
  } catch {
    return null;
  }
}

export default function StudioScreen() {
  const bench = loadBench();
  if (bench === null) {
    return (
      <View role="main" style={styles.fallback}>
        <Text>{resolveSid('studio.unavailable_sid')}</Text>
      </View>
    );
  }
  return (
    <StudioView
      practices={bench.practices}
      schedule={benchSchedule(bench.practices)}
      endings={bench.endings}
      onBack={() => router.back()}
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
    backgroundColor: '#0c0a12',
  },
});
