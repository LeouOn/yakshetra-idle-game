// Emerging world shelf — people and places from the archive, assembled.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  assembleWorldDraft,
  isPinnableKind,
  stringifyWorldDraft,
  type Manifest,
  type ManifestFocus,
} from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface StudioWorldProps {
  readonly archive: readonly Manifest[];
  readonly pinned?: ManifestFocus | null;
  readonly onPin?: (card: Manifest) => void;
  readonly onExportWorld?: (json: string) => void;
  readonly worldExported?: boolean;
}

export default function StudioWorld({
  archive,
  pinned = null,
  onPin,
  onExportWorld,
  worldExported = false,
}: StudioWorldProps) {
  const draft = assembleWorldDraft(archive);
  const pins = archive.filter((card) => isPinnableKind(card.kind));
  return (
    <View testID="studio-world" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.world_heading_sid')}
      </Text>
      {draft === null ? (
        <Text style={styles.hint}>{resolveSid('studio.world_empty_sid')}</Text>
      ) : (
        <>
          <Text style={styles.name}>{draft.name}</Text>
          <Text style={styles.line}>{draft.one_liner}</Text>
          <Text style={styles.hint}>
            {formatSid('studio.world_counts_sid', {
              places: draft.places.length,
              people: draft.cast.length,
            })}
          </Text>
          {draft.places.length === 0 ? null : (
            <Text style={styles.member}>{resolveSid('studio.world_places_label_sid')}</Text>
          )}
          {draft.places.map((member) => (
            <Text key={member.id} testID={`studio-world-place-${member.id}`} style={styles.member}>
              {member.name}
            </Text>
          ))}
          {draft.cast.length === 0 ? null : (
            <Text style={styles.member}>{resolveSid('studio.world_cast_label_sid')}</Text>
          )}
          {draft.cast.map((member) => (
            <Text key={member.id} testID={`studio-world-cast-${member.id}`} style={styles.member}>
              {member.name}
            </Text>
          ))}
        </>
      )}
      {pins.length === 0 || onPin === undefined ? null : (
        <View style={styles.pinRow}>
          {pins.map((card) => {
            const active = pinned?.id === card.id;
            return (
              <Pressable
                key={card.id}
                role="button"
                testID={`studio-pin-${card.id}`}
                accessibilityLabel={formatSid('studio.pin_label_sid', { name: card.name })}
                onPress={() => onPin(card)}
                style={[styles.pin, active ? styles.pinActive : null]}
              >
                <Text style={[styles.pinText, active ? styles.pinTextActive : null]}>
                  {formatSid('studio.pin_chip_sid', { name: card.name })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {pinned === null ? null : (
        <Text testID="studio-pinned" style={styles.hint}>
          {formatSid('studio.pinned_sid', { name: pinned.name })}
        </Text>
      )}
      {draft === null || onExportWorld === undefined ? null : (
        <Pressable
          role="button"
          testID="studio-export-world"
          accessibilityLabel={resolveSid('studio.export_world_sid')}
          onPress={() => onExportWorld(stringifyWorldDraft(draft))}
          style={styles.exportBtn}
        >
          <Text style={styles.exportText}>
            {worldExported
              ? resolveSid('studio.export_world_copied_sid')
              : resolveSid('studio.export_world_sid')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6, marginTop: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: t.text },
  name: { fontSize: 18, fontWeight: '700', color: t.gold },
  line: { fontSize: 15, color: t.muted },
  hint: { fontSize: 14, color: t.muted },
  member: { fontSize: 14, color: t.text },
  pinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pin: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.chip,
  },
  pinActive: { backgroundColor: t.accentDeep, borderColor: t.accent },
  pinText: { fontSize: 13, fontWeight: '600', color: t.muted },
  pinTextActive: { color: t.text },
  exportBtn: { paddingVertical: 10, alignSelf: 'flex-start' },
  exportText: { fontSize: 15, fontWeight: '600', color: t.accent },
});
