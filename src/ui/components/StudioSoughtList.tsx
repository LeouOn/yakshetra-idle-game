// StudioSoughtList — the "Sought" page (wave 3b, item 3). Eleven figures the
// bench can name: discovered ones show the archived card that answered;
// undiscovered ones are a dark silhouette plus the authored hint sentence.
// Lives in the archive tab because that is the surface of what you keep and
// what you are looking for — the pair is pinned there, and the answers land
// there. Presentational; rows come from the pure soughtEncounters selector.

import { StyleSheet, Text, View } from 'react-native';

import { soughtEncounters, type EncounterRecipe, type Manifest } from '@/engine';
import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly encounters: readonly EncounterRecipe[];
  readonly encountered: readonly string[];
  /** The archive, to read a discovered figure's card (name + one-liner). */
  readonly archive: readonly Manifest[];
}

export default function StudioSoughtList({ encounters, encountered, archive }: Props) {
  const rows = soughtEncounters(encounters, encountered);
  if (rows.length === 0) {
    return null;
  }
  const found = rows.filter((row) => row.discovered).length;
  return (
    <View testID="studio-sought" style={styles.list}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.sought_heading_sid')}
      </Text>
      <Text style={styles.tally}>
        {found}/{rows.length} · {resolveSid('studio.sought_undiscovered_sid')}
      </Text>
      {rows.map((row) => {
        const card = archive.find(
          (entry) => entry.about_id === row.figureId || entry.tags.includes(row.figureId),
        );
        if (row.discovered && card !== undefined) {
          return (
            <View
              key={row.id}
              testID={`studio-sought-row-${row.id}`}
              accessibilityLabel={`${card.name}. ${resolveSid('studio.sought_discovered_sid')}`}
              style={[styles.row, styles.rowFound]}
            >
              <Text style={styles.foundLabel}>{resolveSid('studio.sought_discovered_sid')}</Text>
              <Text style={styles.foundName}>{card.name}</Text>
              <Text style={styles.foundLine}>{card.one_liner}</Text>
            </View>
          );
        }
        return (
          <View
            key={row.id}
            testID={`studio-sought-row-${row.id}`}
            accessibilityLabel={resolveSid('studio.sought_silhouette_sid')}
            style={[styles.row, styles.rowDark]}
          >
            <Text style={styles.silhouette}>{resolveSid('studio.sought_silhouette_sid')}</Text>
            <Text style={styles.hint}>{resolveSid(row.hintSid)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginBottom: 16 },
  heading: { fontSize: 15, fontWeight: '700', color: t.text },
  tally: { color: t.muted, fontSize: 12 },
  row: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  rowFound: { borderColor: t.harvest, backgroundColor: t.surface },
  rowDark: { borderColor: t.line, backgroundColor: t.bg },
  foundLabel: {
    color: t.harvestText,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  foundName: { color: t.text, fontSize: 15, fontWeight: '600' },
  foundLine: { color: t.muted, fontSize: 13, lineHeight: 18 },
  silhouette: { color: t.muted, fontSize: 12, fontStyle: 'italic' },
  hint: { color: t.text, fontSize: 13, lineHeight: 19 },
});
