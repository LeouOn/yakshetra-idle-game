// Chain picker — the home screen.
//
// Four actions, all copy via `home.*` / `studio.*` SIDs:
//   Go work a day -> /life/start          (begin a fresh two-life chain)
//   Back to work  -> /life/start?resume=1 (resume from the save slot)
//   Manifest      -> /studio              (the bench — the main loop's verb)
//   Settings      -> /settings
//
// First visit: a small toast. After Got it, it stays gone.
//
// `router.push` is type-checked against the declared routes because
// `experiments.typedRoutes` is enabled in app.json (todo 1).
//
// Plan reference: todo 11 (home shell), todo 28 (disclaimer wiring).

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';
import DisclaimerModal from '@/ui/components/DisclaimerModal';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';

export default function IndexScreen() {
  const { settings, updateSettings } = useSaveSlot(1);

  return (
    <View role="main" style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>{resolveSid('home.title_sid')}</Text>
        <Text style={styles.subtitle}>{resolveSid('home.subtitle_sid')}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          role="button"
          style={styles.button}
          onPress={() => router.push('/life/start')}
          accessibilityLabel={resolveSid('home.new_life_label_sid')}
        >
          <Text style={styles.buttonText}>{resolveSid('home.new_life_button_sid')}</Text>
        </Pressable>

        <Pressable
          role="button"
          style={styles.button}
          onPress={() => router.push({ pathname: '/life/start', params: { resume: '1' } })}
          accessibilityLabel={resolveSid('home.continue_label_sid')}
        >
          <Text style={styles.buttonText}>{resolveSid('home.continue_button_sid')}</Text>
        </Pressable>

        <Pressable
          role="button"
          style={styles.button}
          onPress={() => router.push('/studio')}
          accessibilityLabel={resolveSid('studio.home_button_sid')}
        >
          <Text style={styles.buttonText}>{resolveSid('studio.home_button_sid')}</Text>
        </Pressable>

        <Pressable
          role="button"
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push('/settings')}
          accessibilityLabel={resolveSid('home.settings_label_sid')}
        >
          <Text style={styles.buttonText}>{resolveSid('home.settings_button_sid')}</Text>
        </Pressable>
      </View>

      {settings.disclaimerAccepted ? null : (
        <DisclaimerModal
          onUnderstand={() => updateSettings({ disclaimerAccepted: true })}
          onReadMore={() => router.push('/about')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    backgroundColor: '#0c0a12',
  },
  heading: { alignItems: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '700', color: '#f4eef8' },
  subtitle: { fontSize: 16, color: '#b5a9c4' },
  actions: { width: '100%', maxWidth: 360, gap: 12 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#6d4aa8',
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: '#2a2238' },
  buttonText: { color: '#f4eef8', fontSize: 16, fontWeight: '600' },
});
