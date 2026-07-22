// useSaveSlot — the React-side seam over the persistence layer.
//
// This hook owns ONE save slot's state. It loads the blob on mount via the
// memory adapter (native/web adapters from todo 10 are a drop-in swap once the
// platform is known) and exposes a typed `dispatch` channel for the semantic
// actions the UI emits.
//
// IMPORTANT (plan todo 11): this hook is a thin persistence wrapper. It does NOT
// contain engine logic. The semantic transitions NEW_CHAIN / START_LIFE /
// ADVANCE_TURN / CHOOSE / END_LIFE require engine functions (createLifeState,
// advanceTurn, applyChoice) and are wired up by todos 12-13. Until then they
// throw {@link SaveSlotActionNotImplementedError} rather than silently no-op'ing
// or fabricating fake state. The two persistence-only actions (PERSIST,
// DELETE_SLOT) work today and give the UI a real save/delete escape hatch.
//
// Plan reference: todo 11 (shell), todos 12-13 (semantic wiring).

import { useCallback, useEffect, useState } from 'react';

import type { RoleId, SaveBlob } from '@/engine';
import { MemoryStorageAdapter } from '@/persistence';

// ---------------------------------------------------------------------------
// Action channel
// ---------------------------------------------------------------------------

/**
 * The set of operations the UI may ask the save slot to perform.
 *
 * The semantic intents (`NEW_CHAIN`, `START_LIFE`, `ADVANCE_TURN`, `CHOOSE`,
 * `END_LIFE`) map 1:1 to engine transitions and are implemented in todos 12-13.
 * `PERSIST` and `DELETE_SLOT` are pure persistence and work today.
 */
export type SaveSlotAction =
  | { readonly type: 'NEW_CHAIN' }
  | { readonly type: 'START_LIFE'; readonly role: RoleId }
  | { readonly type: 'ADVANCE_TURN' }
  | { readonly type: 'CHOOSE'; readonly choiceId: string }
  | { readonly type: 'END_LIFE' }
  | { readonly type: 'PERSIST'; readonly blob: SaveBlob }
  | { readonly type: 'DELETE_SLOT' };

/**
 * Thrown when a semantic action is dispatched before its engine wiring lands.
 * Lets todos 12-13 fail loudly at the call site rather than silently no-op'ing.
 */
export class SaveSlotActionNotImplementedError extends Error {
  constructor(actionType: SaveSlotAction['type']) {
    super(
      `useSaveSlot: action "${actionType}" is not implemented yet ` +
        '(see plan todos 12-13). Use PERSIST to write a blob directly in the meantime.',
    );
    this.name = 'SaveSlotActionNotImplementedError';
  }
}

/**
 * Module-scoped adapter so a single in-memory store is shared across hook
 * instances within a session. Swap for NativeStorageAdapter / WebStorageAdapter
 * (todo 10) once the platform is selected; the {@link StorageAdapter} contract
 * is identical.
 */
const adapter = new MemoryStorageAdapter();

/** Return shape of {@link useSaveSlot}. */
export interface UseSaveSlotResult {
  /** The loaded save blob, or `null` when the slot is empty/not yet created. */
  readonly state: SaveBlob | null;
  /** True until the initial load resolves. */
  readonly loading: boolean;
  /** Send a semantic or persistence action to this slot. */
  readonly dispatch: (action: SaveSlotAction) => Promise<void>;
}

/**
 * Bind a React component tree to one save slot.
 *
 * @param slot The opaque slot number to load/persist (default 1).
 */
export function useSaveSlot(slot: number = 1): UseSaveSlotResult {
  const [state, setState] = useState<SaveBlob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const slots = await adapter.listSlots();
      const blob = slots.includes(slot) ? await adapter.load(slot) : null;
      if (!cancelled) {
        setState(blob);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const dispatch = useCallback(
    async (action: SaveSlotAction): Promise<void> => {
      switch (action.type) {
        case 'NEW_CHAIN':
        case 'START_LIFE':
        case 'ADVANCE_TURN':
        case 'CHOOSE':
        case 'END_LIFE':
          // Engine transitions — wired in todos 12-13.
          throw new SaveSlotActionNotImplementedError(action.type);

        case 'PERSIST': {
          await adapter.save(slot, action.blob);
          setState(action.blob);
          return;
        }

        case 'DELETE_SLOT': {
          await adapter.deleteSlot(slot);
          setState(null);
          return;
        }

        default: {
          // Exhaustiveness guard: a new action added to the union without a
          // case here is a compile error (never) plus a runtime error.
          const _exhaustive: never = action;
          throw new Error(`useSaveSlot: unhandled action ${String(_exhaustive)}`);
        }
      }
    },
    [slot],
  );

  return { state, loading, dispatch };
}
