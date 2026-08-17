// First-visit toast. Does not block the home screen.
//
// Parent (`app/index.tsx`) shows this while `!settings.disclaimerAccepted`.
// "I understand" persists the flag; after that it never comes back.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';

export interface DisclaimerModalProps {
  readonly onUnderstand: () => void;
  readonly onReadMore: () => void;
}

export default function DisclaimerModal({ onUnderstand, onReadMore }: DisclaimerModalProps) {
  return (
    <View testID="disclaimer-modal" accessibilityRole="alert" style={styles.toast}>
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
      <View style={styles.row}>
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
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#221a30',
    borderWidth: 1,
    borderColor: '#3a314c',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#e8c56b' },
  body: { fontSize: 14, lineHeight: 20, color: '#f4eef8' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#6d4aa8',
  },
  primaryButtonText: { color: '#f4eef8', fontSize: 14, fontWeight: '600' },
  secondaryButton: { paddingVertical: 8, paddingHorizontal: 4 },
  secondaryButtonText: { color: '#b5a9c4', fontSize: 14, fontWeight: '600' },
});
