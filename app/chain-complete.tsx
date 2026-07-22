// Chain-complete screen — shown after the second (final) life of a chain ends.
//
// Placeholder only. The reflective closing view lands in a later todo.
//
// Plan reference: todo 11 (route shell) / todo 14 (chain wrap-up UX).

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { RoutePlaceholder } from '@/ui/components/RoutePlaceholder';

export default function ChainCompleteScreen() {
  return (
    <RoutePlaceholder title="The chain is complete" implementingTodo="todo 14">
      <Pressable
        role="button"
        style={styles.button}
        onPress={() => router.replace('/')}
        accessibilityLabel="Return to the start"
      >
        <Text style={styles.buttonText}>Begin a new chain</Text>
      </Pressable>
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
