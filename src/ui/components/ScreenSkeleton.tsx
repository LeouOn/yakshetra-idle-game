// ScreenSkeleton — the shape of a screen, shown while its data loads.
//
// Arrival used to show one spinner line ("Opening the bench…"): a promise,
// not a place. The skeleton renders the frame the loaded screen will fill —
// heading, era line, section blocks — so arrival already shows the bench.
// Pure presentation; no data, no network, no clock.

import { StyleSheet, View } from 'react-native';

import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  /** Accessible name for the frame — MUST be the SAME label the loaded
   * screen's root carries (browser finding 3: a different aria-label on the
   * same element is a React #418 hydration mismatch). Omit when the screen's
   * root carries no label; the skeleton then carries none either. */
  readonly labelSid?: string;
  /** How many section blocks (label bar + two body lines) to render. */
  readonly sections?: number;
  readonly testID?: string;
}

function Bar({ height, width }: { height: number; width: `${number}%` | number }) {
  return <View style={{ height, width, borderRadius: 6, backgroundColor: t.chip }} />;
}

export default function ScreenSkeleton({ labelSid, sections = 3, testID }: Props) {
  return (
    <View
      role="main"
      {...(labelSid === undefined ? {} : { accessibilityLabel: resolveSid(labelSid) })}
      testID={testID ?? 'screen-skeleton'}
      style={styles.frame}
    >
      <Bar height={28} width="70%" />
      <Bar height={14} width="45%" />
      <View style={{ height: 12 }} />
      {Array.from({ length: sections }, (_, i) => (
        <View key={i} style={styles.section}>
          <Bar height={12} width="32%" />
          <View style={{ height: 6 }} />
          <Bar height={14} width="92%" />
          <View style={{ height: 6 }} />
          <Bar height={14} width="78%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 14,
    backgroundColor: t.bg,
  },
  section: { gap: 8 },
});
