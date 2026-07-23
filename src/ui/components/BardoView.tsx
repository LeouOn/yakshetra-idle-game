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
 * Compute the eras offered after a completed life. The prototype has exactly
 * two eras: after one, the other is offered; after both, none (the route then
 * navigates to /chain-complete). `null` previous means a fresh chain offers all.
 */
export function nextErasAfter(previousEra: string | null): readonly EraOption[] {
  if (previousEra === null) return DEFAULT_ERA_OPTIONS;
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
}

export default function BardoView({ previousEra, echoes, eras, onPickEra }: BardoViewProps) {
  const nameSid = eraNameSid(previousEra);
  const headerLine =
    nameSid !== null
      ? formatSid('bardo.life_ended_in_era_sid', { era: resolveSid(nameSid) })
      : resolveSid('bardo.life_ended_generic_sid');

  const groups = groupEchoes(echoes);

  return (
    <ScrollView testID="bardo-screen" role="main" contentContainerStyle={styles.container}>
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
          <Text
            testID="bardo-no-echoes"
            accessibilityLabel={resolveSid('bardo.no_echoes_sid')}
            style={styles.muted}
          >
            {resolveSid('bardo.no_echoes_sid')}
          </Text>
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
          <Text
            testID="bardo-no-eras"
            accessibilityLabel={resolveSid('bardo.next_life_empty_sid')}
            style={styles.muted}
          >
            {resolveSid('bardo.next_life_empty_sid')}
          </Text>
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
  },
  section: { gap: 10 },
  heading: { fontSize: 26, fontWeight: '700' },
  subheading: { fontSize: 16, opacity: 0.75 },
  sectionHeading: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 },
  muted: { fontSize: 15, opacity: 0.6, fontStyle: 'italic' },
  echoGroup: { gap: 4, marginTop: 6 },
  echoGroupHeading: { fontSize: 14, fontWeight: '600', opacity: 0.85 },
  echoItem: { fontSize: 15, lineHeight: 21, opacity: 0.9 },
  eraList: { gap: 12, marginTop: 4 },
  eraButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  eraButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
