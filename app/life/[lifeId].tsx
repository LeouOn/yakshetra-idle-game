// Active life turn screen (dynamic route: /life/[lifeId]).
//
// Placeholder only. The turn loop, choice cards, and resource HUD land in
// todo 13.
//
// Plan reference: todo 13.

import type { FC } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { RoutePlaceholder } from '@/ui/components/RoutePlaceholder';

/**
 * Renders the opaque life id so the dynamic route is observably wired during
 * static export. `lifeId` is opaque metadata here; no game logic reads it yet.
 */
const PlaceholderDetail: FC<{ readonly lifeId: string | undefined }> = ({ lifeId }) => (
  <Text style={styles.detail}>life id: {lifeId ?? '(unset)'}</Text>
);

export default function LifeTurnScreen() {
  // `useLocalSearchParams` is typed by Expo Router's typed-routes codegen. The
  // bracket param `[lifeId]` surfaces here as `lifeId`. Reading it (even when
  // absent in static export) keeps the route param-aware without crash risk.
  const { lifeId } = useLocalSearchParams<{ lifeId: string }>();

  return (
    <RoutePlaceholder title="The present moment" implementingTodo="todo 13">
      <PlaceholderDetail lifeId={lifeId} />
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  detail: { fontSize: 13, opacity: 0.6 },
});
