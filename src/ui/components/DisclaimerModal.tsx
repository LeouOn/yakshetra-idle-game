// Front-matter disclaimer modal — shows once per save slot on first launch.
//
// Pure presentational overlay. The parent route (`app/index.tsx`) gates this on
// `!useSaveSlot().settings.disclaimerAccepted` and wires the two callbacks:
//   - onUnderstand -> updateSettings({ disclaimerAccepted: true }) (the ONLY
//     dismiss path; the modal cannot be closed any other way)
//   - onReadMore   -> router.push('/about')
//
// All visible text flows through `disclaimer.*` string ids. Design constraints
// (plan todo 28): NO claim of doctrinal authority. The body is explicit that
// this is fiction inspired by, not a teaching of, any lineage.
//
// Accessibility: the overlay is marked `accessibilityViewIsModal` so screen
// readers trap focus inside it, and the only interactive dismiss affordance is
// the "I understand" button. There is no backdrop tap-to-dismiss and no Escape
// handler, so keyboard / assistive-tech users cannot dismiss it without the
// explicit acknowledgement button — matching "Escape closes only after
// 'I understand'".

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';

export interface DisclaimerModalProps {
  /** Acknowledge the disclaimer; the parent flips `disclaimerAccepted`. */
  readonly onUnderstand: () => void;
  /** Open the full about/lineage/glossary screen. */
  readonly onReadMore: () => void;
}

export default function DisclaimerModal({ onUnderstand, onReadMore }: DisclaimerModalProps) {
  return (
    <View
      testID="disclaimer-modal"
      accessibilityRole="alert"
      accessibilityViewIsModal
      style={styles.overlay}
    >
      <View
        accessibilityRole="summary"
        accessibilityLabel={resolveSid('disclaimer.title_sid')}
        style={styles.sheet}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {resolveSid('disclaimer.title_sid')}
        </Text>

        <Text
          testID="disclaimer-body"
          accessibilityLabel={resolveSid('disclaimer.body_sid')}
          style={styles.body}
        >
          {resolveSid('disclaimer.body_sid')}
        </Text>

        <Text style={styles.advisory}>{resolveSid('disclaimer.advisory_credit_sid')}</Text>

        <Pressable
          testID="disclaimer-understand"
          accessibilityRole="button"
          accessibilityLabel={resolveSid('disclaimer.understand_button_sid')}
          style={styles.primaryButton}
          onPress={onUnderstand}
        >
          <Text style={styles.primaryButtonText}>
            {resolveSid('disclaimer.understand_button_sid')}
          </Text>
        </Pressable>

        <Pressable
          testID="disclaimer-read-more"
          accessibilityRole="link"
          accessibilityLabel={resolveSid('disclaimer.read_more_button_sid')}
          style={styles.secondaryButton}
          onPress={onReadMore}
        >
          <Text style={styles.secondaryButtonText}>
            {resolveSid('disclaimer.read_more_button_sid')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 22,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  body: { fontSize: 15, lineHeight: 22, color: '#1f2937' },
  advisory: { fontSize: 13, lineHeight: 18, opacity: 0.7, color: '#1f2937' },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
