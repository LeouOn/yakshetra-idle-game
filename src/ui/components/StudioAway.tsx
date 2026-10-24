// The away panel: the return moment, not a meter. It names the workings the
// catch-up finished, offers the person/place keepsakes as chips that open the
// archive, and counts the rest. Rendering only happens when the pure selector
// has something to say; the panel never blocks the bench and is dismissed once.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import type { ReturnKeepsake, ReturnSummary } from '@/ui/hooks/away-summary';

interface Props {
  readonly summary: ReturnSummary;
  readonly onDismiss: () => void;
  readonly onOpenKeepsake: (keepsake: ReturnKeepsake) => void;
}

function awayDuration(ticks: number): string {
  if (ticks < 60) {
    return `${ticks} min`;
  }
  const hours = Math.floor(ticks / 60);
  const minutes = ticks % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export default function StudioAway({ summary, onDismiss, onOpenKeepsake }: Props) {
  return (
    <View testID="studio-away" role="status" accessibilityLiveRegion="polite" style={styles.away}>
      <Text style={styles.awayText}>
        {formatSid('studio.away_sid', {
          duration: awayDuration(summary.ticksSimulated),
          residue: summary.residueGained,
        })}
      </Text>
      {summary.workings > 0 ? (
        <Text testID="studio-away-workings" style={styles.awayText}>
          {formatSid(
            summary.workings === 1 ? 'studio.away_workings_one_sid' : 'studio.away_workings_sid',
            { n: summary.workings },
          )}
        </Text>
      ) : null}
      {summary.keepsakes.length > 0 ? (
        <View style={styles.chips}>
          {summary.keepsakes.map((keepsake) => (
            <Pressable
              key={keepsake.id}
              role="button"
              testID={`studio-away-keepsake-${keepsake.id}`}
              accessibilityLabel={formatSid('studio.away_open_sid', { name: keepsake.name })}
              onPress={() => onOpenKeepsake(keepsake)}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{keepsake.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {summary.otherKeepsakes > 0 ? (
        <Text testID="studio-away-other" style={styles.hint}>
          {formatSid('studio.away_other_sid', { n: summary.otherKeepsakes })}
        </Text>
      ) : null}
      {summary.capped ? (
        <Text style={styles.hint}>{resolveSid('studio.away_capped_sid')}</Text>
      ) : null}
      {summary.bayReady ? (
        <Text testID="studio-away-ready" style={styles.ready}>
          {resolveSid('studio.away_ready_sid')}
        </Text>
      ) : null}
      <Pressable
        role="button"
        testID="studio-away-dismiss"
        accessibilityLabel={resolveSid('studio.away_dismiss_sid')}
        onPress={onDismiss}
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>{resolveSid('studio.away_dismiss_sid')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  away: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: t.surface,
  },
  awayText: { fontSize: 15, color: t.text },
  hint: { fontSize: 14, color: t.muted },
  ready: { fontSize: 16, fontWeight: '600', color: t.harvestText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: t.chip,
  },
  chipText: { fontSize: 15, color: t.accent },
  dismiss: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  dismissText: { fontSize: 16, color: t.muted },
});
