// Not-found screen — shown when no route matches the requested URL.
//
// Presented when a URL is mistyped or a route is gone, so it owes the player
// two things: a plain statement of what happened, and a way back. There is no
// `RoutePlaceholder` here on purpose — that renders a "Coming soon — todo N"
// developer marker, which has no business in front of a player, and it offers
// no exit. Copy comes from the `not_found.*` SIDs; tone is spare and adult per
// SPEC §15. Colors are the shared studio palette, so this is not a third theme.
//
// `role="main"` is kept: it is the page's landmark and the accessibility audit
// counts on it.
//
// Plan reference: todo 11 (route shell) / todo 15 (chain navigation).

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface NotFoundViewProps {
  /** Navigate back to the chain picker. Wired by the route file. */
  readonly onGoHome: () => void;
}

export default function NotFoundView({ onGoHome }: NotFoundViewProps) {
  return (
    <View role="main" style={styles.container}>
      <Text style={styles.heading}>{resolveSid('not_found.heading_sid')}</Text>
      <Pressable
        role="button"
        style={styles.button}
        onPress={onGoHome}
        // WCAG 2.5.3 (Label in Name): the accessible name must contain the
        // visible label, so a voice-control user saying the visible words gets
        // a match. The two are separate SIDs and can drift — NotFoundScreen
        // test asserts the containment.
        accessibilityLabel={resolveSid('not_found.home_label_sid')}
      >
        <Text style={styles.buttonText}>{resolveSid('not_found.home_button_sid')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: t.bg,
  },
  heading: { fontSize: 24, fontWeight: '700', color: t.text, textAlign: 'center' },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  buttonText: { color: t.text, fontSize: 15, fontWeight: '600' },
});
