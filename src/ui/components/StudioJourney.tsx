import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DEFAULT_KIND_RULES,
  isPinnableKind,
  spendableResidue,
  pickKindFromRegistry,
  summarizeResidue,
  type Manifest,
  type StudioState,
} from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly studio: StudioState;
  readonly minimum: number;
  readonly harvestable: boolean;
  readonly onTend: () => void;
  readonly onDevelop: () => void;
  readonly onHarvest: () => void;
  readonly onPin: (card: Manifest) => void;
  /** True while the reveal stage is showing the latest card: the discovery
   * block under it would be a duplicate, so it is omitted. */
  readonly hideDiscovery?: boolean;
}

/** A state-backed preview: cooking uses the frozen window, gathering uses pending residue. */
export default function StudioJourney({
  studio,
  minimum,
  harvestable,
  onTend,
  onDevelop,
  onHarvest,
  onPin,
  hideDiscovery,
}: Props) {
  // The bar, the "ready from N" line, and the gate all read the SAME
  // spendable count (browser finding 2): pending minus held-out traces.
  // Reading raw pending here made the screen say "Residue 26 / 3" while the
  // develop gate truthfully evaluated 2 spendable.
  const spendable = spendableResidue(studio);
  const window = studio.bay?.residue ?? spendable;
  const kind =
    window.length === 0 ? null : pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES);
  const cooking = studio.bay?.status === 'cooking';
  const developable = studio.bay === null && spendable.length >= minimum;
  const action = harvestable ? 'reveal' : cooking ? 'tend' : developable ? 'cook' : 'gather';
  const press = harvestable ? onHarvest : developable ? onDevelop : onTend;
  const latest = studio.archive[studio.archive.length - 1];
  // A queued window retains its original focus even if the player changes the next pin.
  const focus = studio.bay === null ? studio.pinned : studio.bay.focus;
  return (
    <View testID="studio-journey" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.journey_heading_sid')}
      </Text>
      <Text testID="journey-preview" style={styles.body}>
        {kind === null
          ? resolveSid('studio.journey_empty_sid')
          : formatSid('studio.journey_preview_sid', {
              kind: resolveSid(`studio.kind_${kind}_sid`),
            })}
      </Text>
      <Text style={styles.hint}>
        {resolveSid(
          cooking || studio.bay?.status === 'ready'
            ? 'studio.journey_frozen_sid'
            : developable
              ? 'studio.journey_gather_hint_sid'
              : 'studio.journey_start_hint_sid',
        )}
      </Text>
      <Text testID="journey-progress" style={styles.hint}>
        {studio.bay === null
          ? formatSid('studio.journey_progress_sid', { n: spendable.length, min: minimum })
          : formatSid('studio.journey_cooking_progress_sid', {
              done: studio.bay.cook_ticks_done,
              total: studio.bay.cook_ticks_total,
            })}
      </Text>
      {focus === null ? null : (
        <Text testID="journey-focus" style={styles.hint}>
          {formatSid('studio.journey_focus_sid', { name: focus.name })}
        </Text>
      )}
      <Pressable
        role="button"
        testID="journey-primary"
        onPress={press}
        style={[styles.button, harvestable ? styles.ready : null]}
      >
        <Text style={styles.buttonText}>{resolveSid(`studio.journey_${action}_sid`)}</Text>
      </Pressable>
      {latest === undefined || hideDiscovery ? null : (
        <View testID="journey-discovery" style={styles.discovery}>
          <Text style={styles.hint}>{resolveSid('studio.journey_latest_sid')}</Text>
          <Text style={styles.body}>
            {formatSid('studio.journey_discovery_sid', { name: latest.name })}
          </Text>
          <Text style={styles.hint}>
            {formatSid('studio.journey_detail_sid', { detail: latest.one_liner })}
          </Text>
          {!isPinnableKind(latest.kind) ? (
            <Text style={styles.hint}>{resolveSid('studio.journey_saved_sid')}</Text>
          ) : (
            <Pressable
              role="button"
              testID="journey-follow"
              accessibilityState={{ selected: studio.pinned?.id === latest.id }}
              onPress={() => onPin(latest)}
              style={styles.follow}
            >
              <Text style={styles.buttonText}>
                {resolveSid(
                  studio.pinned?.id === latest.id
                    ? 'studio.journey_unfollow_sid'
                    : 'studio.journey_follow_sid',
                )}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    backgroundColor: t.surface,
    borderColor: t.accentDeep,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  heading: { color: t.gold, fontSize: 14, fontWeight: '700' },
  body: { color: t.text, fontSize: 20, fontWeight: '600' },
  hint: { color: t.muted, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    backgroundColor: t.accentDeep,
  },
  ready: { backgroundColor: t.harvest },
  buttonText: { color: t.text, fontSize: 16, fontWeight: '600' },
  discovery: { borderTopWidth: 1, borderColor: t.line, paddingTop: 14, gap: 8 },
  follow: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    backgroundColor: t.chip,
    borderRadius: 10,
  },
});
