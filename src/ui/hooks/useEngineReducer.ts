// useEngineReducer — React context bound to the within-life engine reducer.
//
// The turn loop is driven by `useReducer` over the pure engine functions
// (`applyChoice`, `advanceTurn`). The provider closes over an era pack to
// resolve `CHOOSE_ACTION { choiceId }` to a full Choice, and over a
// deterministic Rng — no `Math.random` / `Date.now` ever reaches the engine.
// All UI state flows through this context; there is no direct LifeState
// mutation anywhere in the view layer.
//
// Plan reference: todo 13.

import {
  createElement,
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { advanceTurn, applyChoice, createRng, evaluatePredicate } from '@/engine';
import type { LifeState, Lens, Rng } from '@/engine';
import type { Choice, EraPack, Event } from '@/content/schema';

/** Deterministic seed for the provider's Rng when no override is supplied. */
const DEFAULT_SEED = 0x5eedn;

/**
 * The four UI actions the turn screen dispatches.
 *
 * `DIE` is for DEV/testing only (the dev-only skip button). Production turn
 * flow is INTEND_LENS -> CHOOSE_ACTION -> ADVANCE_TURN.
 */
export type EngineAction =
  | { readonly type: 'INTEND_LENS'; readonly lens: Lens }
  | { readonly type: 'CHOOSE_ACTION'; readonly choiceId: string }
  | { readonly type: 'ADVANCE_TURN' }
  | { readonly type: 'DIE' };

/** Context surface: the current LifeState plus a stable dispatch function. */
export interface EngineContextValue {
  readonly state: LifeState;
  readonly dispatch: (action: EngineAction) => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export interface EngineProviderProps {
  readonly initial: LifeState;
  readonly eraPack: EraPack | null;
  readonly rng?: Rng;
  readonly children: ReactNode;
}

/** Index every Choice in the pack by id so `CHOOSE_ACTION` is O(1). */
function buildChoicesById(eraPack: EraPack | null): Map<string, Choice> {
  const map = new Map<string, Choice>();
  if (eraPack !== null) {
    for (const evt of eraPack.events) {
      for (const choice of evt.choices) {
        map.set(choice.id, choice);
      }
    }
  }
  return map;
}

/**
 * Provider that binds a React subtree to one within-life reducer.
 *
 * `rngValue` and `choicesById` are both memoised so the reducer closes over
 * frozen values, not refs — the React Compiler's `react-hooks/refs` rule
 * rejects a reducer that captures a `useRef` (it cannot prove the function
 * passed to `useReducer` won't read the ref during render). The reducer is
 * recreated only when the choices index or the rng instance changes, both
 * of which are rare (era pack load, seed override).
 */
export function EngineProvider({ initial, eraPack, rng, children }: EngineProviderProps) {
  // Memoised rng: the prop is normally stable, so this evaluates the factory
  // once per lifetime and gives the React Compiler a memoised value to close
  // over instead of a ref.
  const rngValue = useMemo<Rng>(() => rng ?? createRng(DEFAULT_SEED), [rng]);
  const choicesById = useMemo(() => buildChoicesById(eraPack), [eraPack]);

  const reduce = useMemo(() => {
    return (state: LifeState, action: EngineAction): LifeState => {
      switch (action.type) {
        case 'INTEND_LENS':
          return { ...state, chosen_lens: action.lens };
        case 'CHOOSE_ACTION': {
          const choice = choicesById.get(action.choiceId);
          if (choice === undefined) {
            return state;
          }
          return applyChoice(state, choice, rngValue);
        }
        case 'ADVANCE_TURN': {
          const advanced = advanceTurn(state, rngValue);
          // Each new turn the player picks a fresh lens; clearing here keeps
          // the turn loop turn-based (intent -> act -> resolve -> intend).
          const withLensReset: LifeState = { ...advanced, chosen_lens: null };
          // Natural death: the `time` resource is the lifespan counter,
          // decremented once per turn by `advanceTurn`. Era-scripted death
          // triggers ride on the same gate via their trigger predicate.
          if ((withLensReset.resources.time ?? 0) <= 0) {
            return { ...withLensReset, alive: false };
          }
          return withLensReset;
        }
        case 'DIE':
          return { ...state, alive: false };
        default: {
          const _exhaustive: never = action;
          throw new Error(`useEngineReducer: unhandled action ${String(_exhaustive)}`);
        }
      }
    };
  }, [choicesById, rngValue]);

  const [state, dispatch] = useReducer(reduce, initial);
  const value = useMemo<EngineContextValue>(() => ({ state, dispatch }), [state]);

  return createElement(EngineContext.Provider, { value }, children);
}

/** Consume the engine context. Throws if used outside a provider. */
export function useEngineReducer(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (ctx === null) {
    throw new Error('useEngineReducer must be used inside an <EngineProvider>');
  }
  return ctx;
}

/**
 * Filter the era pack's events by their `trigger` predicate against the state.
 * Returns an empty list when no pack is loaded. Pure; shared between the Act
 * phase and its tests.
 */
export function filterEventsForState(eraPack: EraPack | null, state: LifeState): readonly Event[] {
  if (eraPack === null) {
    return [];
  }
  return eraPack.events.filter((evt) => {
    if (evt.trigger === undefined) {
      return true;
    }
    return evaluatePredicate(state, evt.trigger);
  });
}
