// StudioSoughtList — the "Sought" page (wave 3b, item 3). The figures the
// bench can name: the ones you have met show the archived card that
// answered; the ones you have not are a dark silhouette plus the authored
// hint sentence. Lives in the archive tab because that is the surface of what
// you keep and what you are looking for — the pair is pinned there, and the
// answers land there. Presentational; rows come from the pure
// soughtEncounters selector.
//
// The ledger counts FIGURES, not recipes: two recipes can summon the same
// person (Manjushri has his knot and the Wutai terrace), so one person is one
// row and one tally entry, however many ways there are to call them.

import { StyleSheet, Text, View } from 'react-native';

import { soughtEncounters, type EncounterRecipe, type Manifest } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly encounters: readonly EncounterRecipe[];
  readonly encountered: readonly string[];
  /** The archive, to read a met figure's card (name + one-liner). */
  readonly archive: readonly Manifest[];
}

export default function StudioSoughtList({ encounters, encountered, archive }: Props) {
  const rows = soughtEncounters(encounters, encountered);
  if (rows.length === 0) {
    return null;
  }
  // 'Who have you met': a figure is Answered when its card is in the archive
  // by ANY route — encounters are how you AIM at a figure, the archive is the
  // fact of having met them. Met by chance counts. A person card answers
  // first: a place that carries the figure's tag (Wutai Shan for Manjushri)
  // must not stand in for the figure when both are held.
  const cardOf = (figureId: string): Manifest | undefined =>
    archive.find((entry) => entry.about_id === figureId && entry.kind === 'person') ??
    archive.find((entry) => entry.about_id === figureId) ??
    archive.find((entry) => entry.tags.includes(figureId));
  // One row per FIGURE, in the order its first recipe appears. A figure with
  // two recipes keeps both hints (two ways to call the same person).
  const order: string[] = [];
  const hints = new Map<string, string[]>();
  const fired = new Set<string>();
  for (const row of rows) {
    const known = hints.get(row.figureId);
    if (known === undefined) {
      hints.set(row.figureId, [row.hintSid]);
      order.push(row.figureId);
    } else {
      known.push(row.hintSid);
    }
    if (row.discovered) {
      fired.add(row.figureId);
    }
  }
  const figures = order.map((figureId) => {
    const card = cardOf(figureId);
    return {
      figureId,
      hintSids: hints.get(figureId) ?? [],
      // A recipe that fired always brings the card with it (the harvest only
      // records a recipe when the card carries the figure), so the card is
      // the ledger's source of truth; the recipe is the belt to its braces.
      answered: card !== undefined || fired.has(figureId),
      card,
    };
  });
  const answered = figures.filter((figure) => figure.answered).length;
  const tally = `${formatSid('studio.sought_tally_sid', {
    answered,
    total: figures.length,
  })} · ${figures.length - answered} ${resolveSid('studio.sought_undiscovered_sid')}`;
  return (
    <View testID="studio-sought" style={styles.list}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.sought_heading_sid')}
      </Text>
      <Text testID="studio-sought-tally" style={styles.tally}>
        {tally}
      </Text>
      {figures.map((figure) => {
        const card = figure.card;
        if (figure.answered) {
          return (
            <View
              key={figure.figureId}
              testID={`studio-sought-row-${figure.figureId}`}
              accessibilityLabel={`${card?.name ?? ''}. ${resolveSid('studio.sought_discovered_sid')}`}
              style={[styles.row, styles.rowFound]}
            >
              <Text style={styles.foundLabel}>{resolveSid('studio.sought_discovered_sid')}</Text>
              {card === undefined ? null : (
                <>
                  <Text style={styles.foundName}>{card.name}</Text>
                  <Text style={styles.foundLine}>{card.one_liner}</Text>
                </>
              )}
            </View>
          );
        }
        return (
          <View
            key={figure.figureId}
            testID={`studio-sought-row-${figure.figureId}`}
            accessibilityLabel={resolveSid('studio.sought_silhouette_sid')}
            style={[styles.row, styles.rowDark]}
          >
            <Text style={styles.silhouette}>{resolveSid('studio.sought_silhouette_sid')}</Text>
            {figure.hintSids.map((hintSid) => (
              <Text key={hintSid} style={styles.hint}>
                {resolveSid(hintSid)}
              </Text>
            ))}
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
