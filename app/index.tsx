// Chain picker — the home screen.
//
// Three actions:
//   New chain  -> /life/start          (begin a fresh two-life chain)
//   Continue   -> /life/start?resume=1 (resume from the save slot; todo 12 will
//                                       branch into the active life if one exists)
//   Settings   -> /settings
//
// `router.push` is type-checked against the declared routes because
// `experiments.typedRoutes` is enabled in app.json (todo 1).
//
// Plan reference: todo 11.

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Yakshetra</Text>
        <Text style={styles.subtitle}>Two lives. One thread of karma.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          role="button"
          style={styles.button}
          onPress={() => router.push('/life/start')}
          accessibilityLabel="Start a new chain"
        >
          <Text style={styles.buttonText}>New chain</Text>
        </Pressable>

        <Pressable
          role="button"
          style={styles.button}
          onPress={() => router.push({ pathname: '/life/start', params: { resume: '1' } })}
          accessibilityLabel="Continue from your last save"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>

        <Pressable
          role="button"
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Open settings"
        >
          <Text style={styles.buttonText}>Settings</Text>
        </Pressable>
      </View>
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
  },
  heading: { alignItems: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, opacity: 0.7 },
  actions: { width: '100%', maxWidth: 360, gap: 12 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: '#374151' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
