// Studio roster — the seated household after graduation.
//
// Presentational: members, embodiment, and focus arrive as props; the swap
// and the row update are StudioView's job. The focus control is one button
// cycling none → card1 → … → none over the pinnable archive (person/place
// cards). Static on purpose: no animation, reduced-motion safe. All copy is
// SIDs.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Manifest, RosterMember } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface StudioRosterProps {
  readonly members: readonly RosterMember[];
  /** The member whose slice the bench currently embodies; null = default life. */
  readonly embodiedMemberId: string | null;
  /** The focus picker's domain: pinnable person/place archive cards. */
  readonly pinnable: readonly Manifest[];
  readonly onEmbody: (id: string | null) => void;
  readonly onFocus: (id: string, cardId: string | null) => void;
}

/** The card the button's next press focuses, null when it clears, undefined
 *  when there is nothing to focus at all. */
function upcomingFocus(
  pinnable: readonly Manifest[],
  focusIndex: number,
): string | null | undefined {
  if (focusIndex < 0) {
    return pinnable[0]?.id;
  }
  return pinnable[focusIndex + 1]?.id ?? null;
}

export default function StudioRoster({
  members,
  embodiedMemberId,
  pinnable,
  onEmbody,
  onFocus,
}: StudioRosterProps) {
  return (
    <View testID="studio-roster" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.roster_heading_sid')}
      </Text>
      {members.map((member) => {
        const embodied = member.id === embodiedMemberId;
        const embodyLabel = embodied
          ? formatSid('studio.roster_embodied_sid', { name: member.name })
          : formatSid('studio.roster_embody_sid', { name: member.name });
        const focusIndex = pinnable.findIndex((card) => card.id === member.focus_id);
        const focused = focusIndex >= 0 ? pinnable[focusIndex] : undefined;
        const next = upcomingFocus(pinnable, focusIndex);
        const focusLabel =
          focused === undefined
            ? resolveSid('studio.roster_focus_next_sid')
            : focusIndex === pinnable.length - 1
              ? resolveSid('studio.roster_focus_clear_sid')
              : formatSid('studio.roster_focus_label_sid', { name: focused.name });
        return (
          <View key={member.id} testID={`studio-roster-member-${member.id}`} style={styles.row}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.role}>{member.role}</Text>
            <Text style={styles.policy}>
              {formatSid('studio.roster_policy_sid', { policy: member.policy })}
            </Text>
            <Pressable
              role="button"
              testID={`studio-roster-embody-${member.id}`}
              accessibilityLabel={embodyLabel}
              onPress={() => onEmbody(embodied ? null : member.id)}
              style={[styles.button, ...(embodied ? [styles.buttonActive] : [])]}
            >
              <Text style={styles.buttonText}>{embodyLabel}</Text>
            </Pressable>
            <Pressable
              role="button"
              testID={`studio-roster-focus-${member.id}`}
              accessibilityLabel={focusLabel}
              onPress={() => {
                if (next !== undefined) {
                  onFocus(member.id, next);
                }
              }}
              style={styles.buttonSecondary}
            >
              <Text style={styles.buttonText}>{focusLabel}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: t.text },
  row: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    backgroundColor: t.surface,
  },
  name: { fontSize: 16, fontWeight: '600', color: t.text },
  role: { fontSize: 13, color: t.muted },
  policy: { fontSize: 13, color: t.muted },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: t.chip,
    alignItems: 'center',
  },
  buttonActive: { backgroundColor: t.accentDeep },
  buttonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: t.chip,
    alignItems: 'center',
  },
  buttonText: { color: t.text, fontSize: 14, fontWeight: '600' },
});
