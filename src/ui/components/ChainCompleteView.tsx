// Chain-complete screen — the reflective close of a life chain.
//
// Pure presentational component: the route reads the save slot and the bench
// session, hands over the plain summary from `describeChain`, and wires the
// action. All copy is SIDs; the palette is the studio's.
//
// The chain used to end in a `RoutePlaceholder` ("Coming soon") that nothing
// linked to. This screen is the door: it shows the chain's record, what the
// echoes carried, and what the bench kept — the pins and world drafts that
// seed the next chain through `applyStudioToNextLife`.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Echo, SaveBlob, StudioSession } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import { eraNameSid } from '@/ui/components/BardoView';

/** One life in the chain's record. */
export interface ChainLifeLine {
  readonly id: string;
  readonly era: string;
  readonly turns: number;
}

/** A bench card the chain kept — the harvest made usable later. */
export interface ChainKeep {
  readonly id: string;
  readonly name: string;
  readonly kind: 'person' | 'place';
  readonly oneLiner: string;
}

export interface ChainSummary {
  readonly lives: readonly ChainLifeLine[];
  readonly echoes: readonly Echo[];
  readonly keeps: readonly ChainKeep[];
  readonly draftScales: readonly string[];
}

export interface ChainCompleteViewProps extends ChainSummary {
  /** Fired when the player begins a new chain; the route clears the slot. */
  readonly onBeginNewChain: () => void;
}

/**
 * Read the chain's closing state out of the two stores.
 *
 * The life-chain blob holds the lives and the echoes; the bench session holds
 * the pins and the world drafts. Either may be absent — a player can reach
 * this screen with a cleared slot — so both degrade to an empty record
 * rather than throwing.
 */
export function describeChain(blob: SaveBlob | null, session: StudioSession | null): ChainSummary {
  const lives: ChainLifeLine[] =
    blob === null
      ? []
      : blob.chain.life_states.map((life) => ({
          id: String(life.id),
          era: String(life.era),
          turns: life.turn,
        }));

  const keeps: ChainKeep[] =
    session === null
      ? []
      : Object.values(session.benches)
          .map((bench) => bench.pinned)
          .filter((pinned) => pinned !== null)
          .map((pinned) => ({
            id: pinned.id,
            name: pinned.name,
            kind: pinned.kind,
            oneLiner: pinned.one_liner,
          }));

  return {
    lives,
    echoes: blob === null ? [] : blob.chain.karma_state.echoes,
    keeps,
    draftScales: session === null ? [] : session.world_drafts.map((draft) => draft.scale),
  };
}

/** Era display name, or a plain line for an era the table does not name. */
function lifeLineText(line: ChainLifeLine): string {
  const nameSid = eraNameSid(line.era);
  const lineSid =
    nameSid === null ? 'chain_complete.life_unknown_era_sid' : 'chain_complete.life_line_sid';
  return formatSid(lineSid, {
    era: nameSid === null ? '' : resolveSid(nameSid),
    turns: line.turns,
  });
}

/** Tier label for a world-draft scale, falling back to the raw scale id. */
function scaleName(scale: string): string {
  try {
    return resolveSid(`studio.tier_${scale}_sid`);
  } catch {
    return scale;
  }
}

export default function ChainCompleteView({
  lives,
  echoes,
  keeps,
  draftScales,
  onBeginNewChain,
}: ChainCompleteViewProps) {
  const summary: ChainSummary = { lives, echoes, keeps, draftScales };
  return (
    <ScrollView
      testID="chain-complete-screen"
      role="main"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('chain_complete.heading_sid')}
      </Text>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('chain_complete.lives_heading_sid')}
        </Text>
        {summary.lives.length === 0 ? (
          <Text testID="chain-lives-empty" style={styles.muted}>
            {resolveSid('chain_complete.carried_none_sid')}
          </Text>
        ) : (
          summary.lives.map((line) => (
            <Text
              key={line.id}
              testID={`chain-life-${line.era}`}
              accessibilityLabel={lifeLineText(line)}
              style={styles.body}
            >
              {lifeLineText(line)}
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('chain_complete.carried_heading_sid')}
        </Text>
        {summary.echoes.length === 0 ? (
          <Text testID="chain-carried-empty" style={styles.muted}>
            {resolveSid('chain_complete.carried_none_sid')}
          </Text>
        ) : (
          <Text testID="chain-carried-count" style={styles.body}>
            {formatSid('chain_complete.carried_count_sid', { n: summary.echoes.length })}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('chain_complete.keeps_heading_sid')}
        </Text>
        {summary.keeps.length === 0 ? (
          <Text testID="chain-keeps-empty" style={styles.muted}>
            {resolveSid('chain_complete.keeps_empty_sid')}
          </Text>
        ) : (
          summary.keeps.map((keep) => {
            const text = formatSid('chain_complete.keeps_line_sid', {
              name: keep.name,
              one_liner: keep.oneLiner,
            });
            return (
              <Text
                key={keep.id}
                testID={`chain-keep-${keep.id}`}
                accessibilityLabel={text}
                style={styles.body}
              >
                {text}
              </Text>
            );
          })
        )}
      </View>

      {summary.draftScales.length > 0 ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            {resolveSid('chain_complete.drafts.heading_sid')}
          </Text>
          {summary.draftScales.map((scale) => (
            <Text
              key={scale}
              testID={`chain-draft-${scale}`}
              accessibilityLabel={formatSid('chain_complete.drafts.line_sid', {
                scale: scaleName(scale),
              })}
              style={styles.body}
            >
              {formatSid('chain_complete.drafts.line_sid', { scale: scaleName(scale) })}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable
        testID="chain-begin-new"
        accessibilityRole="button"
        accessibilityLabel={resolveSid('chain_complete.begin_new_chain_label_sid')}
        style={styles.button}
        onPress={onBeginNewChain}
      >
        <Text style={styles.buttonText}>
          {resolveSid('chain_complete.begin_new_chain_button_sid')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: 24, paddingVertical: 32, gap: 28 },
  heading: { fontSize: 26, fontWeight: '700', color: t.text },
  section: { gap: 10 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: t.muted },
  body: { fontSize: 15, color: t.text },
  muted: { fontSize: 15, color: t.muted },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  buttonText: { color: t.text, fontSize: 15, fontWeight: '600' },
});
