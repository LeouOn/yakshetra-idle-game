// SaveSlotErrorBar — persistence failures stop failing silently.
//
// useSaveSlot swallows load/save/import/delete failures on purpose (the app
// keeps running); the cost was that a player saw an empty slot and concluded
// nothing was ever saved. This bar surfaces the hook's `error` in the bench's
// voice with a way out: retry the operation where a real retry exists, or
// dismiss and continue knowing what happened.
//
// An unreadable slot gets one more way out: Start fresh, in two steps. The
// first press never deletes — it swaps the bar for a plain statement of what
// is lost, with Cancel first and a destructive Confirm. The raw error text
// stays visible in both steps (the maintainer's decision).

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SaveSlotError } from '@/ui/hooks/useSaveSlot';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly error: SaveSlotError | null;
  /** Re-run the failed operation when one can be re-run; absent = continue-only. */
  readonly onRetry?: () => void;
  /** Delete the unreadable slot and start a fresh chain. Resolves false when
   * the delete was refused, so the bar stays up with the delete error. */
  readonly onStartFresh?: () => Promise<boolean>;
  /** True on screens where dismissing the bar starts a write (the life route
   * builds and persists a fresh life). There, Go on is withheld while the
   * slot is unreadable or a fresh attempt failed, so no single press can
   * overwrite bytes the player never saw. */
  readonly continueWouldPersist?: boolean;
  /** Dismiss the bar (clearError). Always present — the player is never trapped. */
  readonly onContinue: () => void;
}

function messageSid(operation: SaveSlotError['operation']): string {
  return `save_error.${operation}_sid`;
}

/**
 * Props for the bar's retry control, from the one rule every route uses: the
 * control is honest only for a LOAD failure, because the retry re-runs the
 * mount load. A save/import/delete failure gets no retry control — a button
 * that reloads without retrying the write would be a lie.
 */
export function retryPropsFor(
  error: SaveSlotError | null | undefined,
  retryLoad: (() => void) | undefined,
): { readonly onRetry?: () => void } {
  if (
    error === null ||
    error === undefined ||
    error.operation !== 'load' ||
    retryLoad === undefined
  ) {
    return {};
  }
  return { onRetry: retryLoad };
}

/**
 * The action behind Start fresh: delete slot 1, dismiss the warning, then
 * land the player where a fresh chain begins. Resolves false when the delete
 * was refused; the caller keeps the confirmation up so Confirm can be pressed
 * again.
 */
export function startFreshAction(
  deleteSlot: (slot: number) => Promise<boolean>,
  clearError: () => void,
  goFresh: () => void,
): () => Promise<boolean> {
  return async () => {
    const deleted = await deleteSlot(1);
    if (deleted) {
      clearError();
      goFresh();
    }
    return deleted;
  };
}

export default function SaveSlotErrorBar({
  error,
  onRetry,
  onStartFresh,
  continueWouldPersist = false,
  onContinue,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  // True when a fresh attempt was refused: keeps Start fresh reachable after
  // Cancel, so the player who backed out of confirmation can return to it.
  const [freshFailed, setFreshFailed] = useState(false);
  const cancelRef = useRef<View>(null);

  // Cancel is the default action: when the confirmation opens, put focus on
  // it (web: a real DOM focus; native: a no-op if the node has no focus).
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus?.();
    }
  }, [confirming]);

  if (error === null || error === undefined) {
    return null;
  }

  const canStartFresh = onStartFresh !== undefined && (error.operation === 'load' || freshFailed);
  // The confirmation needs a fresh-delete context: the original load failure,
  // or a delete failure from this flow. Another error (a save warning, say)
  // falls back to the ordinary bar without resetting state in an effect.
  const confirmingNow = confirming && canStartFresh;
  // On a persisting screen, Go on is only honest when the bar is not hiding
  // an unreadable slot (or the ruins of a failed fresh attempt).
  const showContinue = !continueWouldPersist || (error.operation !== 'load' && !freshFailed);

  const confirmFresh = async (): Promise<void> => {
    if (onStartFresh === undefined || busy) {
      return;
    }
    setBusy(true);
    const deleted = await onStartFresh();
    setBusy(false);
    if (deleted) {
      setConfirming(false);
    } else {
      setFreshFailed(true);
    }
  };

  if (confirmingNow) {
    return (
      <View testID="save-error-bar" accessibilityLiveRegion="polite" style={styles.bar}>
        <Text style={styles.title}>{resolveSid('save_error.start_fresh_title_sid')}</Text>
        <Text testID="save-error-confirm-statement" style={styles.body}>
          {resolveSid('save_error.start_fresh_body_sid')}
        </Text>
        {error.operation === 'delete' ? (
          <Text style={styles.body}>{resolveSid('save_error.delete_sid')}</Text>
        ) : null}
        <Text testID="save-error-detail" style={styles.detail}>
          {error.message}
        </Text>
        <View style={styles.row}>
          <Pressable
            ref={cancelRef}
            role="button"
            testID="save-error-cancel"
            accessibilityLabel={resolveSid('save_error.start_fresh_cancel_sid')}
            onPress={() => setConfirming(false)}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>{resolveSid('save_error.start_fresh_cancel_sid')}</Text>
          </Pressable>
          <Pressable
            role="button"
            testID="save-error-confirm"
            accessibilityLabel={resolveSid('save_error.start_fresh_confirm_sid')}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => {
              void confirmFresh();
            }}
            style={[styles.button, styles.buttonDestructive]}
          >
            <Text style={styles.buttonText}>
              {resolveSid('save_error.start_fresh_confirm_sid')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View testID="save-error-bar" accessibilityLiveRegion="polite" style={styles.bar}>
      <Text style={styles.title}>{resolveSid('save_error.title_sid')}</Text>
      <Text style={styles.body}>{formatSid(messageSid(error.operation), {})}</Text>
      <Text testID="save-error-detail" style={styles.detail}>
        {error.message}
      </Text>
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
        {canStartFresh ? (
          <Pressable
            role="button"
            testID="save-error-start-fresh"
            accessibilityLabel={resolveSid('save_error.start_fresh_sid')}
            onPress={() => {
              setFreshFailed(false);
              setConfirming(true);
            }}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>{resolveSid('save_error.start_fresh_sid')}</Text>
          </Pressable>
        ) : null}
        {showContinue ? (
          <Pressable
            role="button"
            testID="save-error-continue"
            accessibilityLabel={resolveSid('save_error.continue_sid')}
            onPress={onContinue}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>{resolveSid('save_error.continue_sid')}</Text>
          </Pressable>
        ) : null}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  // 44x44 minimum touch target on every bar control.
  button: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: t.accentDeep,
  },
  buttonSecondary: { backgroundColor: t.chip },
  // Destructive is carried by the wording; the outline makes it visible
  // without relying on color alone.
  buttonDestructive: {
    backgroundColor: t.chip,
    borderWidth: 2,
    borderColor: t.danger,
  },
  buttonText: { color: t.text, fontSize: 14, fontWeight: '600' },
});
