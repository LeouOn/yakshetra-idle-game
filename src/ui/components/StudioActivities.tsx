// Evaluates bench time as work, learning, meditation, and other.

import { StyleSheet, Text, View } from 'react-native';

import {
  computeWorkBalance,
  countFoldedResidue,
  summarizeActivities,
  type ActivityFamily,
  type Practice,
} from '@/engine';
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
  readonly marketShifts?: number | undefined;
  readonly copper?: number | undefined;
  readonly residueCount?: number | undefined;
}

export default function StudioActivities({
  practices,
  marketShifts,
  copper,
  residueCount,
}: StudioActivitiesProps) {
  const totals = summarizeActivities(practices);
  const max = Math.max(1, ...ORDER.map((key) => totals[key]));
  const balance = computeWorkBalance(totals);
  const folded = residueCount !== undefined ? countFoldedResidue(residueCount) : undefined;
  const hasFootprint =
    (marketShifts !== undefined && marketShifts > 0) ||
    (copper !== undefined && copper > 0) ||
    (folded !== undefined && folded > 0);

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

      <View testID="studio-balance" style={styles.balanceSection}>
        <Text style={styles.subheading}>{resolveSid('studio.balance_heading_sid')}</Text>
        <Text testID="studio-balance-ratio" style={styles.balanceRatio}>
          {formatSid('studio.balance_ratio_sid', {
            labor: balance.laborPercent,
            quiet: balance.quietPercent,
          })}
        </Text>
        <View style={styles.balanceTrack}>
          <View style={[styles.laborFill, { width: `${balance.laborPercent}%` }]} />
          <View style={[styles.quietFill, { width: `${balance.quietPercent}%` }]} />
        </View>
        <Text testID="studio-balance-note" style={styles.balanceNote}>
          {resolveSid(balance.balanceSid)}
        </Text>
      </View>

      {!hasFootprint ? null : (
        <View testID="studio-footprint" style={styles.footprintSection}>
          <Text style={styles.subheading}>{resolveSid('studio.work_stats_heading_sid')}</Text>
          <View style={styles.footprintGrid}>
            {marketShifts === undefined ? null : (
              <Text testID="studio-footprint-shifts" style={styles.footprintItem}>
                {`⚒ ${formatSid('studio.work_shifts_sid', { n: marketShifts })}`}
              </Text>
            )}
            {copper === undefined ? null : (
              <Text testID="studio-footprint-copper" style={styles.footprintItem}>
                {`🪙 ${formatSid('studio.work_copper_sid', { n: copper })}`}
              </Text>
            )}
            {folded === undefined ? null : (
              <Text testID="studio-footprint-folded" style={styles.footprintItem}>
                {`🏛 ${formatSid('studio.work_folded_sid', { n: folded })}`}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 4 },
  heading: { fontSize: 16, fontWeight: '700', color: t.text },
  subheading: { fontSize: 14, fontWeight: '600', color: t.text },
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
  balanceSection: {
    marginTop: 6,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  balanceRatio: { fontSize: 13, color: t.gold },
  balanceTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    backgroundColor: t.chip,
    overflow: 'hidden',
  },
  laborFill: { height: 6, backgroundColor: t.accent },
  quietFill: { height: 6, backgroundColor: t.gold },
  balanceNote: { fontSize: 12, color: t.muted, lineHeight: 18 },
  footprintSection: {
    marginTop: 6,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  footprintGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footprintItem: { fontSize: 13, color: t.muted },
});
