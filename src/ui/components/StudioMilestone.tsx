import { StyleSheet, Text, View } from 'react-native';
import {
  evaluateArchivePredicate,
  type ArchivePredicateLike,
  type ArchiveStats,
  type StudioSession,
} from '@/engine';
import type { ProgressionRegistries } from '@/content/progression/loader';
import { formatSid, resolveSid } from '@/i18n';
import { statValue } from '@/ui/hooks/session-selectors';
import { studioTheme as t } from '@/ui/studio-theme';

function label(key: string): string {
  const [section, tail] = key.split('.');
  if (section === 'world_drafts') {
    return tail === 'total'
      ? resolveSid('studio.milestone_world_sid')
      : formatSid('studio.milestone_world_scale_sid', {
          tier: resolveSid(`studio.tier_${tail}_sid`),
        });
  }
  const name = resolveSid(
    section === 'harvests' ? `studio.rarity_${tail}_sid` : `studio.kind_${tail}_sid`,
  );
  return formatSid(`studio.milestone_${section}_sid`, { name });
}

function Requirement({
  predicate,
  stats,
  path,
}: {
  readonly predicate: ArchivePredicateLike;
  readonly stats: ArchiveStats;
  readonly path: string;
}) {
  if ('operands' in predicate) {
    return (
      <View style={styles.group}>
        <Text style={styles.hint}>{resolveSid(`studio.milestone_${predicate.op}_sid`)}</Text>
        {predicate.operands.map((operand, index) => (
          <Requirement key={index} predicate={operand} stats={stats} path={`${path}-${index}`} />
        ))}
      </View>
    );
  }
  if (predicate.op === 'not') {
    return (
      <View style={styles.group}>
        <Text style={styles.hint}>{resolveSid('studio.milestone_not_sid')}</Text>
        <Requirement predicate={predicate.operand} stats={stats} path={`${path}-not`} />
      </View>
    );
  }
  const done = evaluateArchivePredicate(stats, predicate);
  return (
    <Text testID={`milestone-requirement-${path}`} style={[styles.row, done ? styles.done : null]}>
      {formatSid('studio.milestone_requirement_sid', {
        status: resolveSid(done ? 'studio.milestone_done_sid' : 'studio.milestone_pending_sid'),
        label: label(predicate.key),
        current: statValue(stats, predicate.key),
        comparison: resolveSid(`studio.milestone_${predicate.op}_sid`),
        target: predicate.value,
      })}
    </Text>
  );
}

export default function StudioMilestone({
  session,
  stats,
  registries,
}: {
  readonly session: StudioSession;
  readonly stats: ArchiveStats;
  readonly registries: ProgressionRegistries;
}) {
  const tier = [...registries.tiers]
    .sort((a, b) => a.index - b.index)
    .find((row) => row.unlock_milestone !== null && session.tiers[row.id]?.unlocked !== true);
  if (tier === undefined) return null;
  const milestone = registries.milestones.find((row) => row.id === tier.unlock_milestone);
  if (milestone === undefined) return null;
  return (
    <View testID="studio-milestone" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        {formatSid('studio.milestone_heading_sid', {
          tier: resolveSid(`studio.tier_${tier.id}_sid`),
        })}
      </Text>
      <Text style={styles.hint}>{resolveSid('studio.milestone_hint_sid')}</Text>
      <Requirement predicate={milestone.predicate} stats={stats} path={tier.id} />
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    backgroundColor: t.surface,
    borderColor: t.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  heading: { color: t.text, fontSize: 18, fontWeight: '600' },
  hint: { color: t.muted, fontSize: 13, lineHeight: 20 },
  group: { gap: 6 },
  row: { color: t.muted, fontSize: 14, lineHeight: 22 },
  done: { color: t.harvestText },
});
