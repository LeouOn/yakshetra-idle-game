// The reveal stage (wave 2a, lane b1) — when a working finishes, the card is
// the screen: name large, rarity chip, kind marker, the composed prose, the
// figure/pin line, the Pin action, and a keep-going continue. A multi-bench
// drain stages the person card and lists the rest as "also revealed".
// Entry: one <=400ms scale/fade with a rarity-tinted edge, skipped entirely
// (no Animated call) under reduced motion. Presentational only; all copy SIDs.

import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { isPinnableKind, type Manifest } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export const REVEAL_ANIMATION_MS = 320;

/** Rarity accent with a WCAG floor: every rarity reads >= 4.5:1 against the
 * chip/card backgrounds (common used to be t.line grey-on-dark, ~1.9:1). */
export function rarityColor(rarity: Manifest['rarity']): string {
  if (rarity === 'rare') {
    return t.gold;
  }
  if (rarity === 'uncommon') {
    return t.accent;
  }
  return t.muted;
}

export interface StudioRevealStageProps {
  readonly card: Manifest;
  /** Tier-bench cards revealed by the same press, highest rung first. */
  readonly alsoRevealed: readonly Manifest[];
  readonly reducedMotion: boolean;
  /** The bench's current pin: the stage labels an already-followed card. */
  readonly pinned: { readonly id: string } | null;
  /** A sought encounter answered on this reveal: one in-voice line, no
   * mechanics (wave 3b). */
  readonly soughtAnswered?: boolean;
  readonly onPin: (card: Manifest) => void;
  readonly onContinue: () => void;
}

export default function StudioRevealStage({
  card,
  alsoRevealed,
  reducedMotion,
  pinned,
  onPin,
  soughtAnswered = false,
  onContinue,
}: StudioRevealStageProps) {
  // Lazy useState (not useRef): stable Animated value identity without
  // reading a ref during render (react-compiler lint).
  const [entry] = useState(() => new Animated.Value(0.86));
  const [entryOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    // Two independent timings (the test shim ships no Animated.parallel):
    // both start together, both stop together in the cleanup.
    const scale = Animated.timing(entry, {
      toValue: 1,
      duration: REVEAL_ANIMATION_MS,
      useNativeDriver: true,
    });
    const fade = Animated.timing(entryOpacity, {
      toValue: 1,
      duration: REVEAL_ANIMATION_MS,
      useNativeDriver: true,
    });
    scale.start();
    fade.start();
    return () => {
      scale.stop();
      fade.stop();
    };
    // One animation per card: the card id, not the object identity.
  }, [card.id, reducedMotion, entry, entryOpacity]);

  const edge = rarityColor(card.rarity);
  const followed = pinned?.id === card.id;
  const kindLabel = resolveSid(`studio.kind_${card.kind}_sid`);
  const rarityLabel = resolveSid(`studio.rarity_${card.rarity}_sid`);
  const animatedStyle = reducedMotion
    ? null
    : { transform: [{ scale: entry }], opacity: entryOpacity };

  return (
    <Animated.View
      testID="reveal-stage"
      accessibilityRole="alert"
      style={[styles.stage, { borderColor: edge }, animatedStyle]}
    >
      <View style={styles.chips}>
        <View testID="reveal-kind-chip" style={[styles.chip, { borderColor: edge }]}>
          <Text testID="reveal-kind" style={[styles.chipText, { color: edge }]}>
            {kindLabel}
          </Text>
        </View>
        <View testID="reveal-rarity-chip" style={[styles.chip, { borderColor: edge }]}>
          <Text testID="reveal-rarity" style={[styles.chipText, { color: edge }]}>
            {rarityLabel}
          </Text>
        </View>
      </View>
      <Text accessibilityRole="header" testID="reveal-name" style={styles.name}>
        {card.name}
      </Text>
      {soughtAnswered ? (
        <Text testID="reveal-sought-line" style={styles.soughtLine}>
          {resolveSid('encounter.reveal_line_sid')}
        </Text>
      ) : null}
      <Text testID="reveal-one-liner" style={styles.oneLiner}>
        {card.one_liner}
      </Text>
      <Text testID="reveal-subject" style={styles.subject}>
        {formatSid('studio.reveal_subject_sid', { subject: card.subject })}
      </Text>
      <Text testID="reveal-detail" style={styles.detail}>
        {card.detail}
      </Text>
      {card.about_name === undefined ? null : (
        <Text testID="reveal-about" style={styles.about}>
          {formatSid('studio.reveal_about_sid', { name: card.about_name })}
        </Text>
      )}
      {alsoRevealed.length === 0 ? null : (
        <View testID="reveal-also" style={styles.also}>
          <Text style={styles.alsoLabel}>{resolveSid('studio.reveal_also_sid')}</Text>
          {alsoRevealed.map((manifest) => (
            <Text key={manifest.id} style={styles.alsoName}>
              {formatSid('studio.reveal_also_row_sid', {
                kind: resolveSid(`studio.kind_${manifest.kind}_sid`),
                name: manifest.name,
              })}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        {isPinnableKind(card.kind) ? (
          <Pressable
            role="button"
            testID="reveal-pin"
            accessibilityState={{ selected: followed }}
            onPress={() => onPin(card)}
            style={[styles.action, followed ? styles.actionDone : null]}
          >
            <Text style={styles.actionText}>
              {resolveSid(followed ? 'studio.journey_unfollow_sid' : 'studio.journey_follow_sid')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          role="button"
          testID="reveal-continue"
          onPress={onContinue}
          style={[styles.action, styles.actionPrimary, { backgroundColor: edge }]}
        >
          <Text style={[styles.actionText, { color: t.bg }]}>
            {resolveSid('studio.reveal_continue_sid')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  soughtLine: { color: t.gold, fontSize: 14, lineHeight: 20 },
  stage: {
    borderWidth: 2,
    borderRadius: 18,
    backgroundColor: t.surface,
    padding: 22,
    gap: 10,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: t.bg,
  },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  name: { fontSize: 28, fontWeight: '700', color: t.text, lineHeight: 34 },
  oneLiner: { fontSize: 16, color: t.text, lineHeight: 23 },
  subject: { fontSize: 14, fontWeight: '600', color: t.muted },
  detail: { fontSize: 15, color: t.text, lineHeight: 23 },
  about: { fontSize: 14, fontWeight: '600', color: t.gold },
  also: {
    borderTopWidth: 1,
    borderColor: t.line,
    paddingTop: 10,
    gap: 4,
    marginTop: 2,
  },
  alsoLabel: { fontSize: 12, fontWeight: '700', color: t.muted, letterSpacing: 0.5 },
  alsoName: { fontSize: 14, color: t.muted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  action: {
    minHeight: 48,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: t.chip,
  },
  actionDone: { borderWidth: 1, borderColor: t.line },
  actionPrimary: { backgroundColor: t.accentDeep },
  actionText: { fontSize: 15, fontWeight: '700', color: t.text },
});
