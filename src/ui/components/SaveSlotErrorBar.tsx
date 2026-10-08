// SaveSlotErrorBar — persistence failures stop failing silently.
//
// useSaveSlot swallows load/save/import/delete failures on purpose (the app
// keeps running); the cost was that a player saw an empty slot and concluded
// nothing was ever saved. This bar surfaces the hook's `error` in the bench's
// voice with a way out: retry the operation where a real retry exists, or
// dismiss and continue knowing what happened.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SaveSlotError } from '@/ui/hooks/useSaveSlot';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly error: SaveSlotError | null;
  /** Re-run the failed operation when one can be re-run; absent = continue-only. */
  readonly onRetry?: () => void;
  /** Dismiss the bar (clearError). Always present — the player is never trapped. */
  readonly onContinue: () => void;
}

function messageSid(operation: SaveSlotError['operation']): string {
  return `save_error.${operation}_sid`;
}

export default function SaveSlotErrorBar({ error, onRetry, onContinue }: Props) {
  if (error === null || error === undefined) {
    return null;
  }
  return (
    <View testID="save-error-bar" accessibilityLiveRegion="polite" style={styles.bar}>
      <Text style={styles.title}>{resolveSid('save_error.title_sid')}</Text>
      <Text style={styles.body}>{formatSid(messageSid(error.operation), {})}</Text>
      <Text style={styles.detail}>{error.message}</Text>
      <View style={styles.row}>
        {onRetry === undefined ? null : (
          <Pressable
            role="button"
            testID="save-error-retry"
            accessibilityLabel={resolveSid('save_error.retry_sid')}
            onPress={onRetry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{resolveSid('save_error.retry_sid')}</Text>
          </Pressable>
        )}
        <Pressable
          role="button"
          testID="save-error-continue"
          accessibilityLabel={resolveSid('save_error.continue_sid')}
          onPress={onContinue}
          style={[styles.button, styles.buttonSecondary]}
        >
          <Text style={styles.buttonText}>{resolveSid('save_error.continue_sid')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 1,
    borderColor: t.danger,
    backgroundColor: t.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  title: { color: t.text, fontSize: 15, fontWeight: '700' },
  body: { color: t.text, fontSize: 14, lineHeight: 20 },
  detail: { color: t.muted, fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: t.accentDeep,
  },
  buttonSecondary: { backgroundColor: t.chip },
  buttonText: { color: t.text, fontSize: 14, fontWeight: '600' },
});
