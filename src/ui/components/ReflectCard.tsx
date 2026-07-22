// Reflect journal card — the beat after each `applyChoice`.
//
// Shows three sections: what the player intended (lens + action), what happened
// (consequence + resource deltas), and what they carry (a journal memory line).
// Two actions: Continue (advance the turn) and Remember (persist the entry to the
// per-life journal). The card auto-dismisses after `autoDismissMs` if the player
// does not interact, which keeps the turn loop unblocked for motor-impaired
// players. Slide-in animation is suppressed entirely under reduced-motion.
//
// Design constraints (plan todo 14): no virtue/score messaging, no judgment
// language ("perfect"/"imperfect"), no emoji in journal text, no inline string
// literals — all text flows through `@/i18n` string ids.

import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { IntentRoot, Lens, ResourceId } from '@/engine/types';
import { formatSid, resolveSid } from '@/i18n';

const DEFAULT_AUTO_DISMISS_MS = 8000;
const SLIDE_DISTANCE = 24;
const SLIDE_DURATION_MS = 200;

export interface ReflectEntry {
  readonly turn: number;
  readonly chosen_lens: Lens;
  readonly chosen_action_sid: string;
  readonly intent_root: IntentRoot;
  readonly consequence_summary_sid: string;
  readonly world_state_delta: Partial<Record<ResourceId, number>>;
  readonly journal_memory_sid: string;
}

export interface ReflectCardProps {
  readonly entry: ReflectEntry;
  readonly onContinue: () => void;
  readonly onRemember: () => void;
  readonly autoDismissMs?: number;
}

function lensNameSid(lens: Lens): string {
  return `lens.${lens}_sid`;
}

function resourceNameSid(id: ResourceId): string {
  return `resource.${id}_sid`;
}

interface ReducedMotionState {
  readonly reduced: boolean;
  readonly checked: boolean;
}

function readWebReducedMotion(): boolean {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

function useReducedMotion(): ReducedMotionState {
  const [reduced, setReduced] = useState<boolean>(readWebReducedMotion);
  const [checked, setChecked] = useState<boolean>(() => Platform.OS === 'web');
  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === 'web') {
      const mediaQuery =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)')
          : null;
      if (mediaQuery === null) {
        return;
      }
      const handler = (event: MediaQueryListEvent): void => setReduced(event.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    const probe = AccessibilityInfo.isReduceMotionEnabled();
    probe.then((enabled: boolean) => {
      if (!cancelled) {
        setReduced(enabled);
        setChecked(true);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (!cancelled) {
          setReduced(enabled);
        }
      },
    );
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return { reduced, checked };
}

interface ResourceDelta {
  readonly id: ResourceId;
  readonly amount: number;
}

function collectDeltas(delta: Partial<Record<ResourceId, number>>): ResourceDelta[] {
  const entries = Object.entries(delta) as [string, number | undefined][];
  const out: ResourceDelta[] = [];
  for (const [id, amount] of entries) {
    if (amount === undefined || amount === 0) {
      continue;
    }
    out.push({ id: id as ResourceId, amount });
  }
  return out;
}

export default function ReflectCard({
  entry,
  onContinue,
  onRemember,
  autoDismissMs,
}: ReflectCardProps) {
  const { reduced: reducedMotion, checked: motionChecked } = useReducedMotion();
  const dismissed = useRef(false);
  const [translateY] = useState(() => new Animated.Value(0));

  if (entry.consequence_summary_sid.length === 0) {
    throw new Error('missing consequence');
  }

  const dismissMs = autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;

  const [webSlidIn, setWebSlidIn] = useState(false);

  useEffect(() => {
    return () => {
      dismissed.current = true;
    };
  }, []);

  // Native slide-in via Animated. Gated on the reduced-motion probe so the slide
  // never starts (then gets interrupted) before the async check resolves; under
  // reduced motion it is skipped entirely. Animated.Value mutations are not
  // React state, so this effect triggers no re-render.
  useEffect(() => {
    if (Platform.OS === 'web' || !motionChecked || reducedMotion) {
      return;
    }
    translateY.setValue(SLIDE_DISTANCE);
    const animation = Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [motionChecked, reducedMotion, translateY]);

  // Web slide-in via CSS transition: render at the offset, then flip to zero on
  // the next tick so the transition fires. The setState lives inside a timer
  // (async), and is skipped entirely under reduced motion.
  useEffect(() => {
    if (Platform.OS !== 'web' || reducedMotion) {
      return;
    }
    const handle = setTimeout(() => setWebSlidIn(true), 0);
    return () => clearTimeout(handle);
  }, [reducedMotion]);

  const webOffset = reducedMotion ? 0 : webSlidIn ? 0 : SLIDE_DISTANCE;

  useEffect(() => {
    const handle = setTimeout(() => {
      if (dismissed.current) {
        return;
      }
      onContinue();
    }, dismissMs);
    return () => clearTimeout(handle);
  }, [dismissMs, onContinue]);

  const handleContinue = (): void => {
    if (dismissed.current) {
      return;
    }
    dismissed.current = true;
    onContinue();
  };

  const handleRemember = (): void => {
    if (dismissed.current) {
      return;
    }
    dismissed.current = true;
    onRemember();
  };

  const intendedLabel = formatSid('life.reflect.intended_lens_action_sid', {
    lens: resolveSid(lensNameSid(entry.chosen_lens)),
    action: resolveSid(entry.chosen_action_sid),
  });
  const consequence = resolveSid(entry.consequence_summary_sid);
  const journalMemory = resolveSid(entry.journal_memory_sid);
  const deltas = collectDeltas(entry.world_state_delta);

  const cardLabel = resolveSid('life.reflect.card_label_sid');

  const content = (
    <>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('life.reflect.intended_heading_sid')}
        </Text>
        <Text accessibilityLabel={intendedLabel} style={styles.body}>
          {intendedLabel}
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('life.reflect.happened_heading_sid')}
        </Text>
        <Text accessibilityLabel={consequence} style={styles.body}>
          {consequence}
        </Text>
        {deltas.length > 0 ? (
          <View style={styles.deltas}>
            {deltas.map((d) => {
              const text =
                d.amount > 0
                  ? formatSid('life.reflect.delta_positive_sid', {
                      n: Math.abs(d.amount),
                      resource: resolveSid(resourceNameSid(d.id)),
                    })
                  : formatSid('life.reflect.delta_negative_sid', {
                      n: Math.abs(d.amount),
                      resource: resolveSid(resourceNameSid(d.id)),
                    });
              return (
                <Text
                  key={d.id}
                  testID={`reflect-delta-${d.id}`}
                  accessibilityLabel={text}
                  style={d.amount > 0 ? styles.deltaPositive : styles.deltaNegative}
                >
                  {text}
                </Text>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('life.reflect.carry_heading_sid')}
        </Text>
        <Text accessibilityLabel={journalMemory} style={styles.memory}>
          {journalMemory}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="reflect-continue"
          accessibilityRole="button"
          accessibilityLabel={resolveSid('life.reflect.continue_button_sid')}
          accessible
          tabIndex={0}
          onPress={handleContinue}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>
            {resolveSid('life.reflect.continue_button_sid')}
          </Text>
        </Pressable>
        <Pressable
          testID="reflect-remember"
          accessibilityRole="button"
          accessibilityLabel={resolveSid('life.reflect.remember_button_sid')}
          accessible
          tabIndex={0}
          onPress={handleRemember}
          style={styles.rememberButton}
        >
          <Text style={styles.rememberButtonText}>
            {resolveSid('life.reflect.remember_button_sid')}
          </Text>
        </Pressable>
      </View>
    </>
  );

  const baseStyle =
    Platform.OS === 'web'
      ? [
          styles.card,
          {
            transform: [{ translateY: webOffset }],
            transitionProperty: reducedMotion ? 'none' : 'transform',
            transitionDuration: reducedMotion ? '0ms' : `${SLIDE_DURATION_MS}ms`,
          },
        ]
      : styles.card;

  if (Platform.OS === 'web' || reducedMotion) {
    return (
      <View
        testID="reflect-card"
        accessibilityLabel={cardLabel}
        accessibilityRole="summary"
        style={baseStyle}
      >
        {content}
      </View>
    );
  }

  return (
    <Animated.View
      testID="reflect-card"
      accessibilityLabel={cardLabel}
      accessibilityRole="summary"
      style={[styles.card, { transform: [{ translateY }] }]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1b1b1f',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  heading: {
    color: '#e7e7ea',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  body: {
    color: '#f4f4f6',
    fontSize: 16,
    lineHeight: 22,
  },
  memory: {
    color: '#d7d2c4',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  deltas: {
    marginTop: 4,
    gap: 2,
  },
  deltaPositive: {
    color: '#9bcf9b',
    fontSize: 14,
  },
  deltaNegative: {
    color: '#cf9b9b',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#e7e7ea',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  continueButtonText: {
    color: '#1b1b1f',
    fontSize: 15,
    fontWeight: '700',
  },
  rememberButton: {
    borderColor: '#6b6b73',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  rememberButtonText: {
    color: '#e7e7ea',
    fontSize: 15,
    fontWeight: '600',
  },
});
