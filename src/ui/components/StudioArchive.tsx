// Archive panel for the Manifest bench — kind filter chips plus collectible
// cards. Presentational: filter lives in local state, never in the save blob.

import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Manifest, ManifestKind, ManifestRarity } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export type ArchiveFilter = 'all' | ManifestKind;

export const ARCHIVE_FILTERS: readonly ArchiveFilter[] = [
  'all',
  'thing',
  'outcome',
  'change',
  'person',
  'place',
];

function kindLabel(kind: string): string {
  return resolveSid(`studio.kind_${kind}_sid`);
}

function rarityLabel(rarity: ManifestRarity): string {
  return resolveSid(`studio.rarity_${rarity}_sid`);
}

function filterLabel(filter: ArchiveFilter): string {
  return filter === 'all' ? resolveSid('studio.filter_all_sid') : kindLabel(filter);
}

/** Endow chip state for one archive card, derived from the session by the parent. */
export type EndowChipState =
  | { readonly mode: 'locked' }
  | { readonly mode: 'pick' }
  | { readonly mode: 'chosen'; readonly trackLabel: string };

interface StudioArchiveProps {
  readonly archive: readonly Manifest[];
  /** Manifest id harvested just now; draws the flourish border. */
  readonly freshId: string | null;
  /** Absent → cards render without the endow chip. */
  readonly endowState?: (cardId: string) => EndowChipState;
  /** Press on the chip: selects the first eligible track, further presses cycle. */
  readonly onEndow?: (cardId: string) => void;
  /** Press on the "Endowed" chip: commits the chosen track. */
  readonly onEndowCommit?: (cardId: string) => void;
}

export default function StudioArchive({
  archive,
  freshId,
  endowState,
  onEndow,
  onEndowCommit,
}: StudioArchiveProps) {
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const visible = filter === 'all' ? archive : archive.filter((card) => card.kind === filter);

  return (
    <View>
      {archive.length === 0 ? null : (
        <View style={styles.chipRow}>
          {ARCHIVE_FILTERS.map((entry) => {
            const active = filter === entry;
            return (
              <Pressable
                key={entry}
                role="button"
                testID={`studio-filter-${entry}`}
                accessibilityLabel={filterLabel(entry)}
                onPress={() => setFilter(entry)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {filterLabel(entry)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {archive.length === 0 ? (
        <Text style={styles.hint}>{resolveSid('studio.archive_empty_sid')}</Text>
      ) : visible.length === 0 ? (
        <Text style={styles.hint}>{resolveSid('studio.archive_filter_empty_sid')}</Text>
      ) : (
        visible.map((card) => (
          <ManifestCard
            key={card.id}
            manifest={card}
            highlighted={card.id === freshId}
            {...(endowState === undefined ? {} : { endowState: endowState(card.id) })}
            onEndow={onEndow}
            onEndowCommit={onEndowCommit}
          />
        ))
      )}
    </View>
  );
}

function endowChipLabel(state: EndowChipState): string {
  switch (state.mode) {
    case 'locked':
      return resolveSid('studio.endow_locked_sid');
    case 'pick':
      return resolveSid('studio.endow_button_sid');
    case 'chosen':
      return formatSid('studio.endow_track_sid', { track: state.trackLabel });
  }
}

function EndowChipRow({
  manifest,
  state,
  onEndow,
  onEndowCommit,
}: {
  readonly manifest: Manifest;
  readonly state: EndowChipState;
  readonly onEndow: ((cardId: string) => void) | undefined;
  readonly onEndowCommit: ((cardId: string) => void) | undefined;
}): ReactNode {
  const locked = state.mode === 'locked';
  return (
    <View style={styles.chipRow}>
      <Pressable
        role="button"
        testID={`studio-endow-${manifest.id}`}
        accessibilityLabel={endowChipLabel(state)}
        disabled={locked}
        onPress={locked ? undefined : () => onEndow?.(manifest.id)}
        style={[styles.chip, locked ? styles.chipLocked : styles.chipActive]}
      >
        <Text style={[styles.chipText, locked ? null : styles.chipTextActive]}>
          {endowChipLabel(state)}
        </Text>
      </Pressable>
      {state.mode !== 'chosen' || onEndowCommit === undefined ? null : (
        <Pressable
          role="button"
          testID={`studio-endow-commit-${manifest.id}`}
          accessibilityLabel={resolveSid('studio.endow_done_sid')}
          onPress={() => onEndowCommit(manifest.id)}
          style={styles.chipEndow}
        >
          <Text style={styles.chipTextEndow}>{resolveSid('studio.endow_done_sid')}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ManifestCard({
  manifest,
  highlighted,
  endowState,
  onEndow,
  onEndowCommit,
}: {
  readonly manifest: Manifest;
  readonly highlighted: boolean;
  readonly endowState?: EndowChipState | undefined;
  readonly onEndow: ((cardId: string) => void) | undefined;
  readonly onEndowCommit: ((cardId: string) => void) | undefined;
}): ReactNode {
  return (
    <View
      testID={`manifest-${manifest.id}`}
      style={[styles.card, highlighted ? flourishStyle(manifest.rarity) : null]}
    >
      <View style={styles.cardMeta}>
        <Text testID={`manifest-kind-${manifest.id}`} style={styles.kindBadge}>
          {kindLabel(manifest.kind)}
        </Text>
        <Text style={[styles.rarityBadge, rarityStyle(manifest.rarity)]}>
          {rarityLabel(manifest.rarity)}
        </Text>
      </View>
      <Text style={styles.cardName}>{manifest.name}</Text>
      <Text style={styles.cardLine}>{manifest.one_liner}</Text>
      <Text style={styles.cardDetail}>{manifest.detail}</Text>
      {endowState === undefined ? null : (
        <EndowChipRow
          manifest={manifest}
          state={endowState}
          onEndow={onEndow}
          onEndowCommit={onEndowCommit}
        />
      )}
    </View>
  );
}

function rarityStyle(rarity: ManifestRarity) {
  if (rarity === 'rare') {
    return styles.rare;
  }
  if (rarity === 'uncommon') {
    return styles.uncommon;
  }
  return styles.common;
}

function flourishStyle(rarity: ManifestRarity) {
  if (rarity === 'rare') {
    return styles.flourishRare;
  }
  if (rarity === 'uncommon') {
    return styles.flourishUncommon;
  }
  return styles.flourishCommon;
}

const styles = StyleSheet.create({
  hint: { fontSize: 14, color: t.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.chip,
  },
  chipActive: { backgroundColor: t.accentDeep, borderColor: t.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: t.muted },
  chipTextActive: { color: t.text },
  chipLocked: { backgroundColor: '#3f3a4a', borderColor: t.line },
  chipEndow: { backgroundColor: t.harvest, borderColor: t.harvest },
  chipTextEndow: { fontSize: 13, fontWeight: '600', color: t.harvestText },
  card: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    backgroundColor: t.surface,
  },
  flourishCommon: { borderWidth: 2, borderColor: t.gold },
  flourishUncommon: { borderWidth: 2, borderColor: '#7eb6ff', backgroundColor: '#1a2740' },
  flourishRare: { borderWidth: 2, borderColor: t.accent, backgroundColor: '#24183a' },
  cardMeta: { flexDirection: 'row', gap: 8 },
  kindBadge: { fontSize: 12, fontWeight: '700', color: t.muted },
  rarityBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  cardName: { fontSize: 18, fontWeight: '700', color: t.text },
  cardLine: { fontSize: 15, color: t.muted },
  cardDetail: { fontSize: 14, color: t.muted },
  common: { color: t.muted, borderColor: t.line, backgroundColor: t.chip },
  uncommon: { color: '#7eb6ff', borderColor: '#3d5a80', backgroundColor: '#1a2740' },
  rare: { color: t.accent, borderColor: t.accentDeep, backgroundColor: '#24183a' },
});
