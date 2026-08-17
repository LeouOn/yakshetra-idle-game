// Glyphs that fly from the tend button toward the residue bar.

import { StyleSheet, Text, View } from 'react-native';

const GLYPHS = ['✦', '✧', '❋', '◆', '◇'] as const;

export interface StudioJuiceProps {
  readonly burstId: number;
  readonly reducedMotion: boolean;
}

export default function StudioJuice({ burstId, reducedMotion }: StudioJuiceProps) {
  if (burstId === 0 || reducedMotion) {
    return null;
  }
  return (
    <View pointerEvents="none" testID="studio-juice" style={styles.layer}>
      {[0, 1, 2, 3, 4].map((slot) => (
        <Text key={`${burstId}-${slot}`} style={[styles.glyph, { left: `${18 + slot * 14}%` }]}>
          {GLYPHS[slot] ?? '✦'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: 72,
  },
  glyph: {
    position: 'absolute',
    bottom: 0,
    fontSize: 18,
    color: '#e8c56b',
  },
});
