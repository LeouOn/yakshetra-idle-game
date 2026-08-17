// Next-action strip — what the player should reach for next.
//
// Presentational and static: no animation, safe under reduced motion. The
// caller computes the action via the pure `nextAction` derivation and
// passes the result in. A null action hides the strip entirely.

import { StyleSheet, Text, View } from 'react-native';

import { formatSid, resolveSid } from '@/i18n';
import type { NextAction } from '@/ui/hooks/next-action';
import { studioTheme as t } from '@/ui/studio-theme';

export interface StudioNextActionProps {
  readonly action: NextAction | null;
}

export default function StudioNextAction({ action }: StudioNextActionProps) {
  if (action === null) {
    return null;
  }
  const line =
    action.values === undefined ? resolveSid(action.sid) : formatSid(action.sid, action.values);
  return (
    <View testID="studio-next-action" style={styles.strip}>
      <Text style={styles.heading}>{resolveSid('studio.next_action_heading_sid')}</Text>
      <Text style={styles.body}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: t.surface,
  },
  heading: { fontSize: 13, fontWeight: '700', color: t.muted },
  body: { fontSize: 16, fontWeight: '600', color: t.text },
});
