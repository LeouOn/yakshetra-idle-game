// Evaluates bench time as work, learning, meditation, and other.

import { StyleSheet, Text, View } from 'react-native';

import { summarizeActivities, type ActivityFamily, type Practice } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

const ORDER: readonly ActivityFamily[] = [
  'work',
  'generosity',
  'beings',
  'learning',
  'meditation',
  'other',
];
const GLYPH: Record<ActivityFamily, string> = {
  work: '⚒',
  generosity: '❀',
  beings: '◎',
  learning: '✦',
  meditation: '◯',
  other: '✧',
};

export interface StudioActivitiesProps {
  readonly practices: readonly Practice[];
}

export default function StudioActivities({ practices }: StudioActivitiesProps) {
  const totals = summarizeActivities(practices);
  const max = Math.max(1, ...ORDER.map((key) => totals[key]));
  return (
    <View testID="studio-activities" style={styles.panel}>
      <Text style={styles.heading}>{resolveSid('studio.activities_heading_sid')}</Text>
      {ORDER.map((family) => (
        <View key={family} style={styles.row}>
          <Text style={styles.label}>
            {GLYPH[family]} {resolveSid(`studio.activity_${family}_sid`)}
          </Text>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${Math.round((totals[family] / max) * 100)}%` }]}
            />
          </View>
          <Text style={styles.value}>
            {formatSid('studio.activity_value_sid', { n: Math.round(totals[family]) })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 4 },
  heading: { fontSize: 16, fontWeight: '700', color: t.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 132, fontSize: 13, color: t.muted },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.chip,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: t.accent },
  value: { width: 36, fontSize: 12, color: t.gold, textAlign: 'right' },
});
