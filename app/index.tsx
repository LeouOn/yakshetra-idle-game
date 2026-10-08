// Chain picker — the home screen.
//
// One primary action (wave 2b): "Go work a day" leads. "Back to work"
// appears only when a save actually exists, with a line saying what it
// resumes (era, role, lens). The studio button says what it is in the
// direction's lexicon — "The bench" — with one quiet line under it.
// Settings stays quiet. Persistence failures surface via SaveSlotErrorBar.
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
import { studioTheme as t } from '@/ui/studio-theme';
import DisclaimerModal from '@/ui/components/DisclaimerModal';
import SaveSlotErrorBar from '@/ui/components/SaveSlotErrorBar';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import type { LifeState } from '@/engine/types';

/** The era/role/lens of the life a resume would reopen, for the button line. */
function resumeLineOf(life: LifeState | null): string | null {
  if (life === null) {
    return null;
  }
  const era = life.era.split('@')[0] ?? life.era;
  const role = life.role.split('@')[0] ?? life.role;
  const lens = life.chosen_lens;
  return lens === null
    ? `${era} · ${role}`
    : `${era} · ${role} · ${resolveSid(`lens.${lens}_sid`)}`;
}

export default function IndexScreen() {
  const { settings, updateSettings, state, loading, error, clearError } = useSaveSlot(1);
  const mounted = useMounted();
  const life =
    state === null ? null : (state.chain.life_states[state.chain.current_life_index] ?? null);
  const resumable = life !== null && life.alive;
  const resumeLine = resumeLineOf(resumable ? life : null);

  // Hydration-safe: the skeleton is what the server rendered; live content
  // (localStorage-derived) swaps in only after mount.
  if (loading || !mounted) {
    return <ScreenSkeleton sections={2} testID="home-skeleton" />;
  }

  return (
    <View role="main" style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>{resolveSid('home.title_sid')}</Text>
        <Text style={styles.subtitle}>{resolveSid('home.subtitle_sid')}</Text>
      </View>

      <SaveSlotErrorBar error={error} onContinue={clearError} />

      <View style={styles.actions}>
        <Pressable
          role="button"
          style={styles.buttonPrimary}
          onPress={() => router.push('/life/start')}
          accessibilityLabel={resolveSid('home.new_life_label_sid')}
        >
          <Text style={styles.buttonTextPrimary}>{resolveSid('home.new_life_button_sid')}</Text>
        </Pressable>

        {resumable ? (
          <View style={styles.resumeWrap}>
            <Pressable
              role="button"
              style={styles.button}
              onPress={() => router.push({ pathname: '/life/start', params: { resume: '1' } })}
              accessibilityLabel={resolveSid('home.continue_label_sid')}
            >
              <Text style={styles.buttonText}>{resolveSid('home.continue_button_sid')}</Text>
            </Pressable>
            <Text testID="home-resume-line" style={styles.resumeLine}>
              {resumeLine}
            </Text>
          </View>
        ) : null}

        <View style={styles.resumeWrap}>
          <Pressable
            role="button"
            style={styles.button}
            onPress={() => router.push('/studio')}
            accessibilityLabel={resolveSid('studio.home_button_sid')}
          >
            <Text style={styles.buttonText}>{resolveSid('studio.home_button_sid')}</Text>
          </Pressable>
          <Text style={styles.resumeLine}>{resolveSid('studio.home_button_hint_sid')}</Text>
        </View>

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
    backgroundColor: t.bg,
  },
  heading: { alignItems: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '700', color: t.text },
  subtitle: { fontSize: 16, color: t.muted },
  actions: { width: '100%', maxWidth: 360, gap: 12 },
  buttonPrimary: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accent,
    alignItems: 'center',
  },
  buttonTextPrimary: { color: t.bg, fontSize: 17, fontWeight: '700' },
  resumeWrap: { gap: 4 },
  resumeLine: { color: t.muted, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: t.chip },
  buttonText: { color: t.text, fontSize: 16, fontWeight: '600' },
});
