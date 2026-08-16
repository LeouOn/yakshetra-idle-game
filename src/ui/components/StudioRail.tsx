// Tier ladder rail — one row per tier, locked rows masked, live badges.
// Presentational and static: no animation, safe under reduced motion.

import { StyleSheet, Text, View } from 'react-native';

import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface RailTier {
  readonly id: string;
  readonly labelSid: string;
  readonly unlocked: boolean;
  readonly readyCount: number;
  readonly progress: { readonly n: number; readonly m: number } | null;
}

export interface StudioRailProps {
  readonly tiers: readonly RailTier[];
}

export default function StudioRail({ tiers }: StudioRailProps) {
  return (
    <View testID="studio-rail" style={styles.rail}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.rail_heading_sid')}
      </Text>
      {tiers.map((tier) => (
        <View key={tier.id} testID={`studio-rail-tier-${tier.id}`} style={styles.tier}>
          <Text style={tier.unlocked ? styles.label : styles.labelLocked}>
            {resolveSid(tier.unlocked ? tier.labelSid : 'studio.tier_locked_sid')}
          </Text>
          {tier.unlocked && tier.readyCount > 0 ? (
            <Text style={styles.ready}>
              {formatSid('studio.tier_ready_badge_sid', { n: tier.readyCount })}
            </Text>
          ) : null}
          {tier.progress === null ? null : (
            <Text style={styles.progress}>
              {formatSid('studio.tier_progress_badge_sid', {
                n: tier.progress.n,
                m: tier.progress.m,
              })}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: 132, paddingVertical: 24, gap: 12, backgroundColor: t.surface },
  heading: { fontSize: 13, fontWeight: '700', color: t.muted },
  tier: { gap: 2 },
  label: { fontSize: 15, fontWeight: '600', color: t.text },
  labelLocked: { fontSize: 15, fontWeight: '600', color: t.muted },
  ready: { fontSize: 12, fontWeight: '700', color: t.harvestText },
  progress: { fontSize: 12, fontWeight: '600', color: t.accent },
});
