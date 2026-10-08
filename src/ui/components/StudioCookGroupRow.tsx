// StudioCookGroupRow — one trace group's spend stepper inside the cook
// panel (lane B round 2). Presentational: the panel owns the counts.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CookGroup } from '@/engine/cook-groups';
import { formatSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly group: CookGroup;
  readonly spend: number;
  readonly canStepDown: boolean;
  readonly onStep: (delta: 1 | -1) => void;
}

function traceLabel(key: string): string {
  const ids = key.split('|')[1] ?? key;
  const first = ids.split('|')[0] ?? '';
  const cut = Math.max(first.lastIndexOf('/'), first.lastIndexOf(':'));
  return cut >= 0 ? first.slice(cut + 1) : first;
}

export default function StudioCookGroupRow({ group, spend, canStepDown, onStep }: Props) {
  const count = group.indices.length;
  const label = traceLabel(group.key);
  const moreDisabled = spend >= count;
  const lessDisabled = spend <= 0 || !canStepDown;
  return (
    <View testID={`studio-cook-group-${group.key}`} style={styles.group}>
      <Text style={styles.groupLabel}>
        {label} x{count}
      </Text>
      <View style={styles.stepper}>
        <Pressable
          role="button"
          testID={`studio-cook-less-${group.key}`}
          accessibilityLabel={formatSid('studio.cook_spend_less_sid', { trace: label })}
          disabled={lessDisabled}
          onPress={() => onStep(-1)}
          style={[styles.stepButton, lessDisabled ? styles.stepDisabled : null]}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text testID={`studio-cook-spent-${group.key}`} style={styles.groupSpend}>
          {formatSid('studio.cook_group_spent_sid', { spent: spend, count })}
        </Text>
        <Pressable
          role="button"
          testID={`studio-cook-more-${group.key}`}
          accessibilityLabel={formatSid('studio.cook_spend_more_sid', { trace: label })}
          disabled={moreDisabled}
          onPress={() => onStep(1)}
          style={[styles.stepButton, moreDisabled ? styles.stepDisabled : null]}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.chip,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  groupLabel: { color: t.text, fontSize: 13, flexGrow: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: t.accentDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDisabled: { backgroundColor: t.disabled },
  stepButtonText: { color: t.text, fontSize: 18, lineHeight: 22 },
  groupSpend: { color: t.muted, fontSize: 12, minWidth: 92, textAlign: 'center' },
});
