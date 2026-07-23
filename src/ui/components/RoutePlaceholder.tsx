// Shared placeholder for route screens whose full implementation lands in a
// later todo. Keeps every route renderable today (so `expo export --platform web`
// produces HTML for the whole tree) without pre-empting the real UX.
//
// Plan reference: todo 11.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface RoutePlaceholderProps {
  /** Screen heading. */
  readonly title: string;
  /** The todo id that will implement this screen (e.g. "todo 12"). */
  readonly implementingTodo: string;
  /** Optional extra content below the message. */
  readonly children?: ReactNode;
}

/**
 * Minimal "Coming soon" screen. Renders a heading, the implementing-todo marker,
 * and any children. Used by the placeholder routes created in todo 11.
 */
export function RoutePlaceholder({ title, implementingTodo, children }: RoutePlaceholderProps) {
  return (
    <View role="main" style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>Coming soon — {implementingTodo}.</Text>
      {children !== undefined ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
  message: { fontSize: 15, opacity: 0.7, textAlign: 'center' },
  extra: { marginTop: 8 },
});
