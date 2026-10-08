// Bardo transition screen — the between-lives view.
//
// Pure presentational component: reads echoes + the previous era and renders
// three sections — "Your life has ended" (header), "What carried forward"
// (echoes grouped by type), and "Choose your next life" (available eras). The
// parent route wires `useSaveSlot` + `router` and passes data/callbacks in.
//
// Design constraints (plan todo 15): NO depiction of literal bardo imagery, NO
// judgment by named beings. This is functional UI, not cinematic. Echoes are
// surfaced as narrative summaries via `bardo.echo.*` string ids — the engine's
// colon-delimited `echo.narrative_sid` is the canonical reference but is NOT
// resolved here (it is not a dotted i18n key); the view composes a localized
// summary from `echo.type` + `echo.key` instead.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Echo, EchoType } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

// ---------------------------------------------------------------------------
// Era option model + the prototype's static era set
// ---------------------------------------------------------------------------

/** One selectable next-life era. `nameSid` resolves to the era display name. */
export interface EraOption {
  readonly id: string;
  readonly nameSid: string;
}

/** The two prototype eras, in display order. */
export const DEFAULT_ERA_OPTIONS: readonly EraOption[] = [
  { id: 'tang-china', nameSid: 'era.tang-china.name_sid' },
  { id: 'fantasy-mahayana', nameSid: 'era.fantasy-mahayana.name_sid' },
];

/** Known era values that have a localized name in `era.*`. */
const KNOWN_ERA_NAME_SID: Readonly<Record<string, string>> = {
  'tang-china': 'era.tang-china.name_sid',
  'fantasy-mahayana': 'era.fantasy-mahayana.name_sid',
};

/** Resolve an era value to its name SID, or null when the era is unknown. */
export function eraNameSid(era: string | null): string | null {
  if (era === null) return null;
  return KNOWN_ERA_NAME_SID[era] ?? null;
}

/**
 * Lives in a chain before it closes. The prototype chain is two lives long
 * (see the life-chain entry in `src/i18n/en.json`), so the second death is
 * the chain's end rather than another era to pick.
 */
export const CHAIN_LIFE_COUNT = 2;

/**
 * Compute the eras offered after a completed life. A chain with lives left
 * offers the eras it has not played (all of them for a fresh chain); a chain
 * that has spent its lives offers none, and the route then navigates to
 * /chain-complete. `null` previous era means a fresh chain.
 */
export function nextErasAfter(previousEra: string | null, livesPlayed = 0): readonly EraOption[] {
  if (livesPlayed >= CHAIN_LIFE_COUNT) {
    return [];
  }
  if (previousEra === null) {
    return DEFAULT_ERA_OPTIONS;
  }
  return DEFAULT_ERA_OPTIONS.filter((e) => e.id !== previousEra);
}

// ---------------------------------------------------------------------------
// Echo → localized summary
// ---------------------------------------------------------------------------

interface EchoSummary {
  readonly summarySid: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/**
 * Parse the vow lifecycle state out of an echo's `narrative_sid`. The engine
 * emits `echo:vow:<name>:<state>`; the state segment is `kept` | `broken` |
 * `declared`. Anything unparseable falls back to `declared`.
 */
function parseVowState(narrativeSid: string): 'kept' | 'broken' | 'declared' {
  const segments = narrativeSid.split(':');
  const state = segments[3];
  if (state === 'kept' || state === 'broken') return state;
  return 'declared';
}

function describeEcho(echo: Echo): EchoSummary {
  switch (echo.type) {
    case 'tendency':
      return {
        summarySid: 'bardo.echo.tendency_sid',
        params: { root: resolveSid(`intent.${echo.key}_sid`) },
      };
    case 'pattern_break':
      return { summarySid: 'bardo.echo.pattern_break_sid', params: {} };
    case 'unresolved_attachment':
      return {
        summarySid: 'bardo.echo.attachment_sid',
        params: { subject: echo.key },
      };
    case 'vow': {
      const state = parseVowState(echo.narrative_sid);
      const sid =
        state === 'broken'
          ? 'bardo.echo.vow_broken_sid'
          : state === 'kept'
            ? 'bardo.echo.vow_kept_sid'
            : 'bardo.echo.vow_declared_sid';
      return { summarySid: sid, params: { vow: echo.key } };
    }
  }
}

/** Display order of echo groups, with their heading SID. */
const ECHO_GROUP_HEADING_SID: Readonly<Record<EchoType, string>> = {
  tendency: 'bardo.echo.group_tendency_sid',
  vow: 'bardo.echo.group_vow_sid',
  unresolved_attachment: 'bardo.echo.group_unresolved_attachment_sid',
  pattern_break: 'bardo.echo.group_pattern_break_sid',
};

const ECHO_GROUP_ORDER: readonly EchoType[] = [
  'tendency',
  'pattern_break',
  'vow',
  'unresolved_attachment',
];

interface EchoGroup {
  readonly type: EchoType;
  readonly items: readonly Echo[];
}

function groupEchoes(echoes: readonly Echo[]): readonly EchoGroup[] {
  const groups: EchoGroup[] = [];
  for (const type of ECHO_GROUP_ORDER) {
    const items = echoes.filter((e) => e.type === type);
    if (items.length > 0) {
      groups.push({ type, items });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface BardoViewProps {
  /** Era value of the just-ended life (e.g. "tang-china"), or null if none. */
  readonly previousEra: string | null;
  /** Karma echoes carried out of the completed life. */
  readonly echoes: readonly Echo[];
  /** Selectable next-life eras. Empty → "no further lives" message. */
  readonly eras: readonly EraOption[];
  /** Fired when the player picks an era; parent navigates to /life/start. */
  readonly onPickEra: (eraId: string) => void;
  /**
   * Fired when the player closes a chain with no eras left; parent navigates
   * to /chain-complete. Omitted in tests that never reach the chain's end.
   */
  readonly onCloseChain?: () => void;
  /** The chain's first life just ended (no prior lives). */
  readonly firstLife?: boolean;
}

export default function BardoView({
  previousEra,
  echoes,
  firstLife = false,
  eras,
  onPickEra,
  onCloseChain,
}: BardoViewProps) {
  const nameSid = eraNameSid(previousEra);
  const headerLine =
    nameSid !== null
      ? formatSid('bardo.life_ended_in_era_sid', { era: resolveSid(nameSid) })
      : resolveSid('bardo.life_ended_generic_sid');

  const groups = groupEchoes(echoes);

  return (
    <ScrollView
      testID="bardo-screen"
      role="main"
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('bardo.life_ended_heading_sid')}
        </Text>
        <Text accessibilityLabel={headerLine} style={styles.subheading}>
          {headerLine}
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('bardo.echoes_heading_sid')}
        </Text>
        {echoes.length === 0 ? (
          firstLife ? (
            // The game's most significant moment gets an authored beat, not
            // a detection report: what a FIRST life leaves is residue on the
            // bench, and only later lives can choose to carry echoes.
            <View testID="bardo-first-life" style={styles.firstLifeBeat}>
              <Text style={styles.subheading}>{resolveSid('bardo.first_life_label_sid')}</Text>
              <Text style={styles.body}>{resolveSid('bardo.first_life_body_sid')}</Text>
            </View>
          ) : (
            <Text
              testID="bardo-no-echoes"
              accessibilityLabel={resolveSid('bardo.no_echoes_sid')}
              style={styles.muted}
            >
              {resolveSid('bardo.no_echoes_sid')}
            </Text>
          )
        ) : (
          groups.map((group) => {
            const groupHeading = resolveSid(ECHO_GROUP_HEADING_SID[group.type]);
            return (
              <View
                key={group.type}
                style={styles.echoGroup}
                testID={`bardo-echo-group-${group.type}`}
              >
                <Text accessibilityRole="header" style={styles.echoGroupHeading}>
                  {groupHeading}
                </Text>
                {group.items.map((echo, idx) => {
                  const { summarySid, params } = describeEcho(echo);
                  const text = formatSid(summarySid, params);
                  return (
                    <Text
                      key={`${echo.type}-${echo.key}-${idx}`}
                      accessibilityLabel={text}
                      style={styles.echoItem}
                    >
                      {text}
                    </Text>
                  );
                })}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('bardo.next_life_heading_sid')}
        </Text>
        {eras.length === 0 ? (
          <View style={styles.eraList}>
            <Text
              testID="bardo-no-eras"
              accessibilityLabel={resolveSid('bardo.next_life_empty_sid')}
              style={styles.muted}
            >
              {resolveSid('bardo.next_life_empty_sid')}
            </Text>
            {onCloseChain !== undefined ? (
              <Pressable
                testID="bardo-close-chain"
                accessibilityRole="button"
                accessibilityLabel={resolveSid('bardo.close_chain_button_sid')}
                style={styles.eraButton}
                onPress={onCloseChain}
              >
                <Text style={styles.eraButtonText}>
                  {resolveSid('bardo.close_chain_button_sid')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.eraList}>
            {eras.map((era) => {
              const eraName = resolveSid(era.nameSid);
              const buttonLabel = formatSid('bardo.choose_era_button_sid', { era: eraName });
              return (
                <Pressable
                  key={era.id}
                  testID={`bardo-era-${era.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={buttonLabel}
                  style={styles.eraButton}
                  onPress={() => onPickEra(era.id)}
                >
                  <Text style={styles.eraButtonText}>{buttonLabel}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
    backgroundColor: t.bg,
  },
  section: { gap: 10 },
  firstLifeBeat: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: t.surface,
  },
  body: { color: t.text, fontSize: 15, lineHeight: 22 },
  heading: { fontSize: 26, fontWeight: '700', color: t.text },
  subheading: { fontSize: 16, opacity: 0.75, color: t.muted },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.8,
    color: t.gold,
  },
  muted: { fontSize: 15, opacity: 0.6, fontStyle: 'italic', color: t.muted },
  echoGroup: { gap: 4, marginTop: 6 },
  echoGroupHeading: { fontSize: 14, fontWeight: '600', opacity: 0.85, color: t.text },
  echoItem: { fontSize: 15, lineHeight: 21, opacity: 0.9, color: t.text },
  eraList: { gap: 12, marginTop: 4 },
  eraButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  eraButtonText: { color: t.text, fontSize: 16, fontWeight: '600' },
});
