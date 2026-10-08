// The world section (wave 3) — the chronicle reads the run back: the world's
// name and line, then dated gazetteer entries compiled from the harvest.
// Newest first: the bench is revisited after every harvest and the fresh
// entry must be visible without scrolling; each entry's ordinal keeps the
// story order. Presentation only; entries are derived in the engine.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { chronicleDatePhrase, chronicleToText, type ChronicleEntry } from '@/engine';
import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface StudioChronicleProps {
  readonly entries: readonly ChronicleEntry[];
  readonly worldName: string | null;
  readonly worldLine: string | null;
  /** Clipboard writer (injected; tests spy on it). */
  readonly onCopy: (text: string) => void;
  readonly copied: boolean;
}

export default function StudioChronicle({
  entries,
  worldName,
  worldLine,
  onCopy,
  copied,
}: StudioChronicleProps) {
  const copy = (): void => {
    onCopy(chronicleToText(entries, worldName, worldLine));
  };
  return (
    <View testID="studio-chronicle" style={styles.wrap}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.chronicle_heading_sid')}
      </Text>
      {worldName === null ? (
        <Text style={styles.hint}>{resolveSid('studio.chronicle_world_pending_sid')}</Text>
      ) : (
        <View style={styles.worldHead}>
          <Text style={styles.worldName}>{worldName}</Text>
          <Text style={styles.worldLine}>{worldLine}</Text>
        </View>
      )}
      {entries.length === 0 ? (
        <Text testID="chronicle-empty" style={styles.hint}>
          {resolveSid('studio.chronicle_empty_sid')}
        </Text>
      ) : (
        <ScrollView style={styles.scroll}>
          {[...entries]
            .sort((a, b) => b.ordinal - a.ordinal)
            .map((entry) => (
              <View
                key={`${entry.ordinal}-${entry.cardId ?? entry.scale}`}
                testID={`chronicle-entry-${entry.ordinal}`}
                style={styles.entry}
              >
                <Text style={styles.date}>{chronicleDatePhrase(entry.date)}</Text>
                <Text style={styles.text}>{entry.text}</Text>
              </View>
            ))}
        </ScrollView>
      )}
      <Pressable
        role="button"
        testID="chronicle-copy"
        accessibilityLabel={resolveSid('studio.chronicle_copy_sid')}
        onPress={copy}
        disabled={entries.length === 0}
        style={[styles.button, entries.length === 0 ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>
          {resolveSid(copied ? 'studio.chronicle_copied_sid' : 'studio.chronicle_copy_sid')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: t.text },
  hint: { fontSize: 14, color: t.muted },
  worldHead: { gap: 4, paddingBottom: 6 },
  worldName: { fontSize: 24, fontWeight: '700', color: t.gold },
  worldLine: { fontSize: 15, color: t.text },
  scroll: { maxHeight: 420 },
  entry: {
    borderTopWidth: 1,
    borderColor: t.line,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 3,
  },
  date: { fontSize: 12, fontWeight: '700', color: t.muted, letterSpacing: 0.5 },
  text: { fontSize: 15, color: t.text, lineHeight: 22 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: t.accentDeep,
  },
  buttonDisabled: { backgroundColor: t.disabled },
  buttonText: { color: t.text, fontSize: 15, fontWeight: '700' },
});
