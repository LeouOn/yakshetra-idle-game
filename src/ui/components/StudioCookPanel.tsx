// StudioCookPanel — the cook is a hand (docs/design/00-direction.md, lane B).
// Round 2: traces group by kind ("alms round x6") with a stepper per group
// for how many to SPEND (default: everything); the predicted kind of the
// spent mix previews live; quick-picks list the kinds the pile can actually
// become and select the leanest plan for one. No hold cap — the only floor
// is the gate. Dumb component: engine math is imported pure; the queue call
// stays in StudioView.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  groupTraces,
  previewOf,
  reachableKinds,
  spentIndices,
  type CookGroup,
  type SpendCounts,
} from '@/engine/cook-groups';
import StudioCookGroupRow from './StudioCookGroupRow';
import { planCookTicks, type CookFire } from '@/engine';
import type { ResidueEvent } from '@/engine/residue';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

/** One pending residue event, positioned for hold-back. */
export interface CookChip {
  /** Absolute index into the bench's residue log (the hold-back currency). */
  readonly index: number;
  readonly event: ResidueEvent;
  /** Already held from an earlier cook (starts unspent). */
  readonly held: boolean;
}

export interface CookChoice {
  readonly fire: CookFire;
  /** Absolute indices to leave unspent (the full desired held set). */
  readonly holdBack: readonly number[];
}

interface Props {
  readonly chips: readonly CookChip[];
  /** Effective queue gate for this bench (endowed/visitor window_min in play). */
  readonly gate: number;
  /** Endowed cook_speed discount, snapshotted at panel open. */
  readonly cookTicksDiscount?: number;
  /** Banked heat (surplus), snapshotted at panel open. */
  readonly surplus?: number;
  readonly onCook: (choice: CookChoice) => void;
  readonly onCancel: () => void;
}

function kindWord(kind: string): string {
  return resolveSid(`studio.kind_${kind}_sid`);
}

/** Spend counts that start every group fully spent, except carried-in
 * holds. (Meeting the gate from holds is lifted by the caller.) */
function initialCounts(
  groups: readonly CookGroup[],
  chips: readonly CookChip[],
): Record<string, number> {
  const held = new Set(chips.filter((chip) => chip.held).map((chip) => chip.index));
  const counts: Record<string, number> = {};
  for (const group of groups) {
    counts[group.key] = group.indices.filter((index) => !held.has(index)).length;
  }
  return counts;
}

export default function StudioCookPanel({
  chips,
  gate,
  cookTicksDiscount = 0,
  surplus = 0,
  onCook,
  onCancel,
}: Props) {
  const groups = useMemo(() => groupTraces(chips), [chips]);
  const reachable = useMemo(() => reachableKinds(groups, gate), [groups, gate]);
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base = initialCounts(groups, chips);
    // Lift spent counts (from the front) until the gate is met.
    let total = groups.reduce((sum, g) => sum + (base[g.key] ?? 0), 0);
    for (const group of groups) {
      if (total >= gate) {
        break;
      }
      const full = group.indices.length;
      const now = base[group.key] ?? 0;
      if (now < full) {
        const add = Math.min(full - now, gate - total);
        base[group.key] = now + add;
        total += add;
      }
    }
    return base;
  });
  const [fire, setFire] = useState<CookFire>('short');

  const totalSpend = groups.reduce((sum, group) => sum + (counts[group.key] ?? 0), 0);
  const heatSaved = planCookTicks(totalSpend, fire, cookTicksDiscount, surplus).heatSaved;
  const canMeetGate = groups.reduce((sum, group) => sum + group.indices.length, 0) >= gate;

  function step(group: CookGroup, delta: 1 | -1): void {
    const now = counts[group.key] ?? 0;
    const next = now + delta;
    if (next < 0 || next > group.indices.length) {
      return;
    }
    if (delta === -1 && totalSpend - 1 < gate) {
      return; // never below the gate
    }
    setCounts({ ...counts, [group.key]: next });
  }

  function quickPick(plan: SpendCounts): void {
    // A plan names every group it wants spent; any group it does not name
    // (e.g. one that appeared after the options were computed) stays
    // unspent. Absent-key-spends-full is for the DEFAULT state only —
    // applying it here is what made a Place pick land on Thing (browser
    // finding 1).
    const next: Record<string, number> = {};
    for (const group of groups) {
      next[group.key] = plan[group.key] ?? 0;
    }
    setCounts(next);
  }

  const preview = previewOf(groups, counts);
  const previewText =
    preview === null
      ? resolveSid('studio.cook_preview_none_sid')
      : formatSid('studio.cook_preview_sid', { kind: kindWord(preview) });
  const holdBack = useMemo(() => {
    const spent = new Set(spentIndices(groups, counts));
    return chips.filter((chip) => !spent.has(chip.index)).map((chip) => chip.index);
  }, [chips, counts, groups]);

  return (
    <View testID="studio-cook-panel" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        {resolveSid('studio.cook_title_sid')}
      </Text>
      <Text testID="studio-cook-preview" style={styles.preview}>
        {previewText}
      </Text>
      {reachable.length === 0 ? null : (
        <View style={styles.reachable}>
          <Text style={styles.hint}>{resolveSid('studio.cook_reachable_sid')}</Text>
          <View style={styles.kindRow}>
            {reachable.map((option) => (
              <Pressable
                key={option.kind}
                role="button"
                testID={`studio-cook-kind-${option.kind}`}
                accessibilityLabel={kindWord(option.kind)}
                onPress={() => quickPick(option.counts)}
                style={styles.kindChip}
              >
                <Text style={styles.kindChipText}>{kindWord(option.kind)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <View style={styles.groups}>
        {groups.map((group) => (
          <StudioCookGroupRow
            key={group.key}
            group={group}
            spend={counts[group.key] ?? 0}
            canStepDown={totalSpend - 1 >= gate}
            onStep={(delta) => step(group, delta)}
          />
        ))}
      </View>
      <Text style={styles.hint}>{resolveSid('studio.cook_hold_hint_sid')}</Text>
      {heatSaved > 0 ? (
        <Text testID="studio-cook-heat" style={styles.hint}>
          {formatSid('studio.cook_heat_saves_sid', { n: heatSaved })}
        </Text>
      ) : null}
      <View style={styles.fires}>
        {(['short', 'long'] as const).map((choice) => {
          const selected = fire === choice;
          return (
            <Pressable
              key={choice}
              role="button"
              testID={`studio-cook-fire-${choice}`}
              accessibilityState={{ selected }}
              onPress={() => setFire(choice)}
              style={[styles.fire, selected ? styles.fireSelected : null]}
            >
              <Text style={styles.label}>
                {formatSid(`studio.cook_fire_${choice}_sid`, {
                  ticks: planCookTicks(totalSpend, choice, cookTicksDiscount, surplus).total,
                })}
              </Text>
              <Text style={styles.hint}>{resolveSid(`studio.cook_fire_${choice}_hint_sid`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        role="button"
        testID="studio-cook-confirm"
        disabled={!canMeetGate || totalSpend < gate}
        accessibilityState={{ disabled: !canMeetGate || totalSpend < gate }}
        onPress={() => onCook({ fire, holdBack })}
        style={[styles.button, !canMeetGate || totalSpend < gate ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>{resolveSid('studio.cook_confirm_sid')}</Text>
      </Pressable>
      {canMeetGate ? null : (
        <Text style={styles.hint}>{formatSid('studio.cook_gate_hint_sid', { n: gate })}</Text>
      )}
      <Pressable role="button" testID="studio-cook-cancel" onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>{resolveSid('studio.cook_cancel_sid')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: t.text },
  preview: { color: t.gold, fontSize: 15, lineHeight: 21 },
  reachable: { gap: 6 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: {
    backgroundColor: t.chip,
    borderColor: t.accent,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kindChipText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  groups: { gap: 8 },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19 },
  fires: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fire: {
    flexGrow: 1,
    flexBasis: 200,
    minHeight: 72,
    backgroundColor: t.chip,
    padding: 12,
    gap: 6,
    borderRadius: 8,
  },
  fireSelected: { borderColor: t.gold, borderWidth: 1 },
  label: { color: t.text, fontSize: 15, fontWeight: '600' },
  button: {
    minHeight: 48,
    backgroundColor: t.accentDeep,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: t.disabled },
  buttonText: { color: t.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  cancel: { minHeight: 40, justifyContent: 'center' },
  cancelText: { color: t.muted, fontSize: 14, textAlign: 'center' },
});
