// Active life turn screen (dynamic route: /life/[lifeId]).
//
// Implements the 4-phase turn loop: Orient -> Intend -> Act -> Resolve.
// State is owned by the engine reducer (exposed via `useEngineReducer`) and
// every mutation flows through `dispatch` — there is no direct write to
// LifeState anywhere in the view layer. The era pack is loaded synchronously
// via `loadEraPack` (the registry is bundled at build time); if loading fails
// the Act phase renders a graceful "no events for this era yet" fallback whose
// end-life button drives the player into the bardo (todo 15).
//
// Plan reference: todo 13.

import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { loadEraPack } from '@/content/loader';
import type { Choice, EraPack, Event } from '@/content/schema';
import { applyChoice, createLifeState, createRng } from '@/engine';
import type { EraId, IntentRoot, LifeId, LifeState, Lens, ResourceId, RoleId } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import ReflectCard, { type ReflectEntry } from '@/ui/components/ReflectCard';
import {
  EngineProvider,
  filterEventsForState,
  useEngineReducer,
} from '@/ui/hooks/useEngineReducer';

// `__DEV__` is injected by Metro/Expo at build time (true in dev, false in
// production). It is absent under Vitest; the helper below reads it defensively
// from `globalThis` so the dev tools hide cleanly in tests and prod without a
// global polyfill.
function readDevFlag(): boolean {
  if (typeof globalThis !== 'object' || globalThis === null) {
    return false;
  }
  return (globalThis as { __DEV__?: unknown }).__DEV__ === true;
}

/** Deterministic seed for the handler-side `applyChoice` preview. Non-zero:
 * xoshiro128** rejects an all-zero state. */
const PREVIEW_SEED = 1n;

/** Fixed render-order of the six lenses. */
const LENSES: readonly Lens[] = [
  'generosity',
  'careful_conduct',
  'patient_courage',
  'joyful_effort',
  'collected_attention',
  'discernment',
];

/** Fixed render-order of the six resources. */
const RESOURCES: readonly ResourceId[] = [
  'time',
  'energy',
  'provisions',
  'trust',
  'skill',
  'obligation',
];

function lensNameSid(lens: Lens): string {
  return `lens.${lens}_sid`;
}

function resourceNameSid(id: ResourceId): string {
  return `resource.${id}_sid`;
}

/** The interactive phase below the always-on Orient panel. */
type Phase = 'intend' | 'act' | 'resolve';

function computePhase(reflect: ReflectEntry | null, state: LifeState): Phase {
  if (reflect !== null) {
    return 'resolve';
  }
  if (state.chosen_lens === null) {
    return 'intend';
  }
  return 'act';
}

/** Flatten all choices of all events into a single render list. */
function collectChoices(events: readonly Event[]): readonly Choice[] {
  const out: Choice[] = [];
  for (const evt of events) {
    for (const choice of evt.choices) {
      out.push(choice);
    }
  }
  return out;
}

/**
 * Lens-to-event mapping: which event ids each lens surfaces, per era.
 *
 * Each lens shows a DIFFERENT 2-3 event subset so the Intend choice is
 * meaningful — without this every lens sees the full event graph and the
 * parami choice becomes cosmetic (the first playtest's top complaint).
 * Events may overlap across lenses (e.g. famine-year appears under both
 * patient_courage and joyful_effort).
 *
 * Keyed by era id (the registry slug, e.g. 'tang-china'). Unknown eras
 * and empty intersections fall back to the full event set — see
 * {@link filterEventsForLens} — so the player is never stuck.
 */
const LENS_EVENTS_BY_ERA: Readonly<Record<string, Readonly<Record<Lens, readonly string[]>>>> = {
  'tang-china': {
    generosity: ['event:tang/sick-traveler', 'event:tang/child-illness'],
    careful_conduct: ['event:tang/grain-requisition', 'event:tang/persecution-edict'],
    patient_courage: ['event:tang/conscripted-brother', 'event:tang/famine-year'],
    joyful_effort: ['event:tang/famine-year', 'event:tang/sick-traveler'],
    collected_attention: ['event:tang/persecution-edict', 'event:tang/child-illness'],
    discernment: ['event:tang/corrupt-donation-demand', 'event:tang/grain-requisition'],
  },
  'fantasy-mahayana': {
    generosity: ['event:fantasy/soul-in-torment', 'event:fantasy/gardener-question'],
    careful_conduct: ['event:fantasy/vow-reminder', 'event:fantasy/storm-at-edge'],
    patient_courage: ['event:fantasy/offer-to-stay', 'event:fantasy/storm-at-edge'],
    joyful_effort: ['event:fantasy/storm-at-edge', 'event:fantasy/forgotten-name'],
    collected_attention: ['event:fantasy/forgotten-name', 'event:fantasy/gardener-question'],
    discernment: [
      'event:fantasy/gardener-question',
      'event:fantasy/court-judgment',
      'event:fantasy/vow-reminder',
    ],
  },
};

/**
 * Apply the lens filter on top of the state-filtered events.
 *
 * If the chosen lens has a known event subset for the current era, only those
 * events survive (intersected with whatever {@link filterEventsForState}
 * already kept). We fall back to the full state-filtered set when:
 *   - no lens is chosen yet (Intend phase),
 *   - the era is not mapped in {@link LENS_EVENTS_BY_ERA},
 *   - the lens has no mapped subset for this era, or
 *   - the subset is empty after intersection (e.g. trigger predicates filtered
 *     every candidate out) — so the player is never left without actions.
 */
function filterEventsForLens(
  events: readonly Event[],
  era: EraId,
  lens: Lens | null,
): readonly Event[] {
  if (lens === null) {
    return events;
  }
  const eraMapping = LENS_EVENTS_BY_ERA[String(era)];
  if (eraMapping === undefined) {
    return events;
  }
  const allowed = eraMapping[lens];
  if (allowed === undefined || allowed.length === 0) {
    return events;
  }
  const allowedSet = new Set(allowed);
  const filtered = events.filter((evt) => allowedSet.has(evt.id));
  return filtered.length === 0 ? events : filtered;
}

/**
 * Resolve a role's localized display name from the era pack's starting_roles.
 *
 * Falls back to the raw role id when the pack has no matching role entry
 * (e.g. test fixtures, or a role id that is not author-defined) so a content
 * gap never crashes the Orient panel.
 */
function resolveRoleLabel(eraPack: EraPack | null, roleId: RoleId): string {
  if (eraPack !== null && eraPack.starting_roles !== undefined) {
    const id = String(roleId);
    for (const role of eraPack.starting_roles) {
      if (role.id === id) {
        const sid = role.label_sid ?? role.title_sid;
        if (sid !== undefined) {
          return resolveSid(sid);
        }
        break;
      }
    }
  }
  return String(roleId);
}

/** Pull the intent root a choice springs from, falling back to `care`. */
function findIntentRoot(choice: Choice): IntentRoot {
  for (const eff of choice.effects) {
    if (eff.op === 'set_intent_root') {
      return eff.intent_root as IntentRoot;
    }
  }
  return 'care';
}

/** Pull a choice's narrative consequence SID, if it has one. */
function findConsequenceSid(choice: Choice): string | null {
  for (const eff of choice.effects) {
    if (eff.op === 'narrative_card') {
      return eff.card_sid;
    }
  }
  return null;
}

/** Diff before/after resource maps into a Partial<ResourceId, number>. */
function computeResourceDelta(
  before: Record<string, number>,
  after: Record<string, number>,
): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  for (const id of RESOURCES) {
    const b = before[id] ?? 0;
    const a = after[id] ?? 0;
    if (a !== b) {
      out[id] = a - b;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Default export — wires route params, era pack loader, and bardo navigation.
// ---------------------------------------------------------------------------

/**
 * Resolve the era pack for a life, falling back to null on failure.
 *
 * The loader is synchronous (registry is bundled at build time). On failure
 * we log in dev and return null so the no-era fallback renders rather than
 * white-screening — a content bug should never crash the route.
 */
function resolveEraPack(era: EraId): EraPack | null {
  try {
    return loadEraPack(era);
  } catch (err) {
    if (readDevFlag()) {
      console.error('[life] loadEraPack failed:', err);
    }
    return null;
  }
}

/** Build a placeholder initial life state from the route's lifeId. */
function createInitialLife(lifeId: string | undefined): LifeState {
  return createLifeState({
    id: (lifeId ?? 'placeholder') as LifeId,
    era: 'tang-china' as EraId,
    role: 'wanderer' as RoleId,
    identity: {
      gender: 'unset',
      social_class: 'unset',
      family_wealth_at_birth: 'unset',
      caste_status: 'unset',
      disability_status: 'unset',
    },
  });
}

export default function LifeTurnScreen() {
  const router = useRouter();
  const { lifeId } = useLocalSearchParams<{ lifeId: string }>();

  const initialState = useMemo<LifeState>(() => createInitialLife(lifeId), [lifeId]);
  const eraPack = useMemo<EraPack | null>(
    () => resolveEraPack(initialState.era),
    [initialState.era],
  );

  return (
    <TurnScreen
      initialState={initialState}
      eraPack={eraPack}
      onDeath={() => {
        router.push('/bardo');
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Named export — directly testable (no router inside).
// ---------------------------------------------------------------------------

export interface TurnScreenProps {
  readonly initialState: LifeState;
  readonly eraPack: EraPack | null;
  readonly onDeath: () => void;
}

export function TurnScreen({ initialState, eraPack, onDeath }: TurnScreenProps) {
  return (
    <EngineProvider initial={initialState} eraPack={eraPack}>
      <TurnScreenBody eraPack={eraPack} onDeath={onDeath} />
    </EngineProvider>
  );
}

interface TurnScreenBodyProps {
  readonly eraPack: EraPack | null;
  readonly onDeath: () => void;
}

function TurnScreenBody({ eraPack, onDeath }: TurnScreenBodyProps) {
  const { state, dispatch } = useEngineReducer();
  const [reflect, setReflect] = useState<ReflectEntry | null>(null);

  // Death navigation: fires once when `alive` flips to false (resource exhausted
  // via ADVANCE_TURN, or the dev DIE button). Re-running when alive toggles
  // back to true is a no-op for the navigation call.
  useEffect(() => {
    if (!state.alive) {
      onDeath();
    }
  }, [state.alive, onDeath]);

  const phase = computePhase(reflect, state);

  const handleChooseLens = (lens: Lens): void => {
    dispatch({ type: 'INTEND_LENS', lens });
  };

  const handleChooseAction = (choice: Choice): void => {
    if (state.chosen_lens === null) {
      // Defensive: Act-phase UI only renders when a lens is set, but a stray
      // press must never mutate state out of band.
      return;
    }
    // Compute the post-choice state purely for delta display. `applyChoice` is
    // deterministic today (applyEffect's reserved `_rng` slot is unused), so
    // the reducer's CHOOSE_ACTION case produces an identical LifeState.
    const after = applyChoice(state, choice, createRng(PREVIEW_SEED));
    const entry: ReflectEntry = {
      turn: state.turn,
      chosen_lens: state.chosen_lens,
      chosen_action_sid: choice.label_sid,
      intent_root: findIntentRoot(choice),
      consequence_summary_sid: findConsequenceSid(choice) ?? 'event.default.consequence_sid',
      world_state_delta: computeResourceDelta(state.resources, after.resources),
      journal_memory_sid: 'event.default.journal_sid',
    };
    setReflect(entry);
    dispatch({ type: 'CHOOSE_ACTION', choiceId: choice.id });
  };

  const handleEndLifeEarly = (): void => {
    dispatch({ type: 'DIE' });
  };

  const handleDevSkipTurn = (): void => {
    setReflect(null);
    dispatch({ type: 'ADVANCE_TURN' });
  };

  const handleReflectContinue = (): void => {
    setReflect(null);
    dispatch({ type: 'ADVANCE_TURN' });
  };

  const handleReflectRemember = (): void => {
    // Persistence wiring (SaveBlob.chain.life_states[current].journal) lands in
    // a later todo. For now Remember mirrors Continue so the turn loop is
    // unblocked and the entry's resource deltas are still observed.
    setReflect(null);
    dispatch({ type: 'ADVANCE_TURN' });
  };

  const stateEvents = filterEventsForState(eraPack, state);
  const visibleEvents = filterEventsForLens(stateEvents, state.era, state.chosen_lens);
  const choices = collectChoices(visibleEvents);
  const noEra = eraPack === null;

  return (
    <View
      role="main"
      style={styles.screen}
      accessibilityLabel={resolveSid('life.turn.screen_label_sid')}
    >
      <TopBar state={state} />
      <OrientPanel state={state} eraPack={eraPack} />
      {noEra && phase !== 'resolve' ? <NoEraFallback onEndLifeEarly={handleEndLifeEarly} /> : null}
      {!noEra && phase === 'intend' ? (
        <IntendPanel state={state} onChoose={handleChooseLens} />
      ) : null}
      {!noEra && phase === 'act' ? (
        <ActPanel state={state} choices={choices} onChoose={handleChooseAction} />
      ) : null}
      {phase === 'resolve' && reflect !== null ? (
        <ReflectCard
          entry={reflect}
          onContinue={handleReflectContinue}
          onRemember={handleReflectRemember}
        />
      ) : null}
      {readDevFlag() && phase !== 'resolve' ? (
        <DevTools onSkipTurn={handleDevSkipTurn} onDie={handleEndLifeEarly} />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

interface TopBarProps {
  readonly state: LifeState;
}

function TopBar({ state }: TopBarProps) {
  const turn = formatSid('life.turn.turn_label_sid', { n: state.turn });
  const age = formatSid('life.turn.age_label_sid', { n: state.age });
  const lensLabel =
    state.chosen_lens === null
      ? resolveSid('life.turn.lens_unset_sid')
      : formatSid('life.turn.lens_chosen_sid', {
          lens: resolveSid(lensNameSid(state.chosen_lens)),
        });
  return (
    <View
      accessibilityLabel={resolveSid('life.turn.top_bar_label_sid')}
      accessibilityRole="header"
      style={styles.topBar}
    >
      <Text testID="turn-top-turn" style={styles.topBarText}>
        {turn}
      </Text>
      <Text testID="turn-top-age" style={styles.topBarText}>
        {age}
      </Text>
      <Text testID="turn-top-lens" style={styles.topBarText}>
        {lensLabel}
      </Text>
    </View>
  );
}

interface OrientPanelProps {
  readonly state: LifeState;
  readonly eraPack: EraPack | null;
}

function OrientPanel({ state, eraPack }: OrientPanelProps) {
  const eraName = eraPack !== null ? resolveSid(eraPack.name_sid) : String(state.era);
  const roleName = resolveRoleLabel(eraPack, state.role);
  const eraRole = formatSid('life.turn.orient_era_role_sid', {
    era: eraName,
    role: roleName,
  });

  const ageRow = formatSid('life.turn.orient_age_row_sid', { n: state.age });
  const relationshipKeys = Object.keys(state.relationships);
  const flagsCount = state.flags.size;
  const flagsRow =
    flagsCount === 0
      ? resolveSid('life.turn.orient_flags_none_sid')
      : formatSid('life.turn.orient_flags_row_sid', { n: flagsCount });

  const lensRow =
    state.chosen_lens === null
      ? resolveSid('life.turn.orient_lens_focus_none_sid')
      : formatSid('life.turn.orient_lens_focus_sid', {
          lens: resolveSid(lensNameSid(state.chosen_lens)),
        });

  return (
    <View style={styles.orient} accessibilityLabel={resolveSid('life.turn.orient_heading_sid')}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.turn.orient_heading_sid')}
      </Text>
      <Text testID="turn-orient-era-role" style={styles.body}>
        {eraRole}
      </Text>
      <Text testID="turn-orient-age" style={styles.body}>
        {ageRow}
      </Text>
      <Text testID="turn-orient-flags" style={styles.body}>
        {flagsRow}
      </Text>
      <Text testID="turn-orient-lens" style={styles.body}>
        {lensRow}
      </Text>
      <Text style={styles.subheading}>{resolveSid('life.turn.orient_resources_label_sid')}</Text>
      <View style={styles.resourceGrid}>
        {RESOURCES.map((id) => {
          const value = state.resources[id] ?? 0;
          const row = formatSid('life.turn.orient_resource_row_sid', {
            resource: resolveSid(resourceNameSid(id)),
            n: value,
          });
          return (
            <Text key={id} testID={`turn-resource-${id}`} style={styles.resourceCell}>
              {row}
            </Text>
          );
        })}
      </View>
      <Text style={styles.subheading}>
        {resolveSid('life.turn.orient_relationships_label_sid')}
      </Text>
      {relationshipKeys.length === 0 ? (
        <Text style={styles.body}>{resolveSid('life.turn.orient_no_relationships_sid')}</Text>
      ) : (
        <View>
          {relationshipKeys.map((key) => (
            <Text key={key} style={styles.body}>
              {key}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

interface IntendPanelProps {
  readonly state: LifeState;
  readonly onChoose: (lens: Lens) => void;
}

function IntendPanel({ state, onChoose }: IntendPanelProps) {
  return (
    <View style={styles.phase}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.turn.intend_heading_sid')}
      </Text>
      <Text style={styles.body}>{resolveSid('life.turn.intend_hint_sid')}</Text>
      <View style={styles.lensGrid}>
        {LENSES.map((lens) => {
          const label = resolveSid(lensNameSid(lens));
          const selected = state.chosen_lens === lens;
          return (
            <Pressable
              key={lens}
              testID={`turn-lens-${lens}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessible
              style={selected ? styles.lensCardSelected : styles.lensCard}
              onPress={() => {
                onChoose(lens);
              }}
            >
              <Text style={styles.lensCardText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface ActPanelProps {
  readonly state: LifeState;
  readonly choices: readonly Choice[];
  readonly onChoose: (choice: Choice) => void;
}

function ActPanel({ state, choices, onChoose }: ActPanelProps) {
  return (
    <View style={styles.phase}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.turn.act_heading_sid')}
      </Text>
      <Text style={styles.body}>{resolveSid('life.turn.act_hint_sid')}</Text>
      {choices.length === 0 ? (
        <Text testID="turn-act-empty" style={styles.body}>
          {resolveSid('life.turn.act_empty_sid')}
        </Text>
      ) : (
        <View style={styles.actionList}>
          {choices.map((choice) => {
            const label = resolveSid(choice.label_sid);
            const disabled = state.chosen_lens === null;
            return (
              <Pressable
                key={choice.id}
                testID={`turn-action-${choice.id}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessible
                disabled={disabled}
                style={disabled ? styles.actionCardDisabled : styles.actionCard}
                onPress={() => {
                  onChoose(choice);
                }}
              >
                <Text style={styles.actionCardText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

interface NoEraFallbackProps {
  readonly onEndLifeEarly: () => void;
}

function NoEraFallback({ onEndLifeEarly }: NoEraFallbackProps) {
  return (
    <View style={styles.phase}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.turn.no_era_heading_sid')}
      </Text>
      <Text style={styles.body}>{resolveSid('life.turn.no_era_body_sid')}</Text>
      <Pressable
        testID="turn-end-life-early"
        accessibilityRole="button"
        accessibilityLabel={resolveSid('life.turn.end_life_button_sid')}
        accessible
        style={styles.endLifeButton}
        onPress={onEndLifeEarly}
      >
        <Text style={styles.endLifeButtonText}>{resolveSid('life.turn.end_life_button_sid')}</Text>
      </Pressable>
    </View>
  );
}

interface DevToolsProps {
  readonly onSkipTurn: () => void;
  readonly onDie: () => void;
}

function DevTools({ onSkipTurn, onDie }: DevToolsProps) {
  return (
    <View style={styles.devTools} accessibilityLabel={resolveSid('life.turn.dev_tools_label_sid')}>
      <Pressable
        testID="turn-dev-skip"
        accessibilityRole="button"
        accessibilityLabel={resolveSid('life.turn.dev_skip_turn_button_sid')}
        accessible
        style={styles.devButton}
        onPress={onSkipTurn}
      >
        <Text style={styles.devButtonText}>{resolveSid('life.turn.dev_skip_turn_button_sid')}</Text>
      </Pressable>
      <Pressable
        testID="turn-dev-die"
        accessibilityRole="button"
        accessibilityLabel={resolveSid('life.turn.dev_die_button_sid')}
        accessible
        style={styles.devButton}
        onPress={onDie}
      >
        <Text style={styles.devButtonText}>{resolveSid('life.turn.dev_die_button_sid')}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#0f0f12',
  },
  topBar: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a30',
  },
  topBarText: {
    color: '#e7e7ea',
    fontSize: 14,
    fontWeight: '600',
  },
  orient: {
    gap: 6,
    backgroundColor: '#15151a',
    borderRadius: 8,
    padding: 12,
  },
  phase: {
    gap: 8,
    backgroundColor: '#15151a',
    borderRadius: 8,
    padding: 12,
  },
  heading: {
    color: '#e7e7ea',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subheading: {
    color: '#a0a0a8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  body: {
    color: '#f4f4f6',
    fontSize: 15,
    lineHeight: 21,
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resourceCell: {
    color: '#d7d2c4',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  lensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  lensCard: {
    backgroundColor: '#1f1f25',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 140,
  },
  lensCardSelected: {
    backgroundColor: '#2c4a2c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 140,
  },
  lensCardText: {
    color: '#f4f4f6',
    fontSize: 15,
    fontWeight: '600',
  },
  actionList: {
    gap: 8,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#1f1f25',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionCardDisabled: {
    backgroundColor: '#161619',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.5,
  },
  actionCardText: {
    color: '#f4f4f6',
    fontSize: 15,
    fontWeight: '500',
  },
  endLifeButton: {
    borderColor: '#6b6b73',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  endLifeButtonText: {
    color: '#e7e7ea',
    fontSize: 14,
    fontWeight: '600',
  },
  devTools: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a30',
  },
  devButton: {
    backgroundColor: '#3a2a1a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  devButtonText: {
    color: '#f4f4f6',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
