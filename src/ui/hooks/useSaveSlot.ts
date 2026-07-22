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
// Plan reference: todo 11 (shell), todos 12-13 (semantic wiring), todo 15
// (settings/accessibility + save-slot management extensions).

import { useCallback, useEffect, useState } from 'react';

import type { ContentWarningSettings, WarningCategoryId } from '@/content/warning-taxonomy';
import { defaultContentWarningSettings } from '@/content/warning-taxonomy';
import type { RoleId, SaveBlob } from '@/engine';
import { deserializeSaveBlob, serializeSaveBlob } from '@/engine';
import { MemoryStorageAdapter } from '@/persistence';

// ---------------------------------------------------------------------------
// Accessibility + content-warning settings (the in-memory seam)
// ---------------------------------------------------------------------------

/** Three text-size steps surfaced by the settings screen. */
export type FontScale = 'small' | 'medium' | 'large';

/**
 * App-level accessibility + content-warning settings.
 *
 * These live on the React-side seam, NOT on the persisted {@link SaveBlob}
 * (extending the blob schema is out of scope for todo 15; todo 28 carries the
 * full settings-on-blob persistence). They are in-memory for the lifetime of
 * the hook instance, which is sufficient for the settings UI to read/write them
 * within a session.
 */
export interface AppSettings {
  readonly contentWarnings: ContentWarningSettings;
  readonly reducedMotion: boolean;
  readonly fontScale: FontScale;
  /**
   * Whether the front-matter disclaimer (todo 28) has been acknowledged for
   * this save slot. `false` on a fresh slot so the disclaimer shows once on
   * first launch; once the player taps "I understand" the flag flips to `true`
   * via {@link updateSettings} and the modal does not reappear for this slot.
   */
  readonly disclaimerAccepted: boolean;
}

/** Build the default settings (all nine categories on, motion on, medium text). */
export function defaultAppSettings(): AppSettings {
  return {
    contentWarnings: defaultContentWarningSettings(),
    reducedMotion: false,
    fontScale: 'medium',
    disclaimerAccepted: false,
  };
}

/** Per-slot summary surfaced by {@link useSaveSlot.allSlots}. */
export interface SlotSummary {
  readonly slot: number;
  readonly blob: SaveBlob | null;
}

// ---------------------------------------------------------------------------
// Base64 codec around the canonical save envelope
// ---------------------------------------------------------------------------

/**
 * Base64-encode the canonical envelope of a {@link SaveBlob} for clipboard
 * export. Web uses `btoa`; native/node uses `Buffer` (where `btoa` is absent or
 * where the payload may contain bytes > 255). The decode is the exact inverse.
 */
export function encodeSaveBlob(blob: SaveBlob): string {
  const envelope = serializeSaveBlob(blob);
  if (typeof btoa === 'function') {
    return btoa(envelope);
  }
  return Buffer.from(envelope, 'utf8').toString('base64');
}

/**
 * Decode a base64 save code back into a verified {@link SaveBlob}.
 *
 * @throws when the base64 is malformed OR the integrity envelope rejects the
 *   payload (re-computed hash mismatch). Callers surface `import_failed` rather
 *   than crashing the screen.
 */
export function decodeSaveBlob(base64: string): SaveBlob {
  const envelope =
    typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
  return deserializeSaveBlob(envelope).saveBlob;
}

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

/** The save-slot numbers the UI exposes for manual management. */
const MANAGED_SLOTS: readonly number[] = [1, 2, 3, 4, 5];

/** Return shape of {@link useSaveSlot}. */
export interface UseSaveSlotResult {
  /** The loaded save blob, or `null` when the slot is empty/not yet created. */
  readonly state: SaveBlob | null;
  /** True until the initial load resolves. */
  readonly loading: boolean;
  /** Send a semantic or persistence action to this slot. */
  readonly dispatch: (action: SaveSlotAction) => Promise<void>;
  /** In-memory accessibility + content-warning settings for this slot. */
  readonly settings: AppSettings;
  /** Merge a partial settings patch into the current settings. */
  readonly updateSettings: (patch: Partial<AppSettings>) => void;
  /** Flip one content-warning category (convenience over updateSettings). */
  readonly setContentWarning: (id: WarningCategoryId, enabled: boolean) => void;
  /** Snapshot of slots 1-5 (blob or null), refreshed on mount + after each op. */
  readonly allSlots: readonly SlotSummary[];
  /** Reload {@link allSlots} from the adapter. */
  readonly refreshAllSlots: () => Promise<void>;
  /**
   * Base64 save code for an occupied slot, read from the current snapshot.
   * @throws if the slot is empty.
   */
  readonly exportSlot: (slot: number) => string;
  /** Decode + verify a base64 save code, persist it into `slot`, then refresh. */
  readonly importSlot: (slot: number, base64: string) => Promise<void>;
  /** Delete an arbitrary slot (no-op when absent), then refresh. */
  readonly deleteSlot: (slot: number) => Promise<void>;
}

/**
 * Bind a React component tree to one save slot.
 *
 * @param slot The opaque slot number to load/persist (default 1).
 */
export function useSaveSlot(slot: number = 1): UseSaveSlotResult {
  const [state, setState] = useState<SaveBlob | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [allSlots, setAllSlots] = useState<readonly SlotSummary[]>([]);

  const refreshAllSlots = useCallback(async (): Promise<void> => {
    const summaries: SlotSummary[] = [];
    for (const s of MANAGED_SLOTS) {
      const blob = await adapter.load(s);
      summaries.push({ slot: s, blob });
    }
    setAllSlots(summaries);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const slots = await adapter.listSlots();
      const blob = slots.includes(slot) ? await adapter.load(slot) : null;
      const summaries: SlotSummary[] = [];
      for (const s of MANAGED_SLOTS) {
        if (s === slot) {
          summaries.push({ slot: s, blob });
        } else {
          const b = slots.includes(s) ? await adapter.load(s) : null;
          summaries.push({ slot: s, blob: b });
        }
      }
      if (!cancelled) {
        setState(blob);
        setAllSlots(summaries);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const updateSettings = useCallback((patch: Partial<AppSettings>): void => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setContentWarning = useCallback((id: WarningCategoryId, enabled: boolean): void => {
    setSettings((prev) => ({
      ...prev,
      contentWarnings: { ...prev.contentWarnings, [id]: enabled },
    }));
  }, []);

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
          await refreshAllSlots();
          return;
        }

        case 'DELETE_SLOT': {
          await adapter.deleteSlot(slot);
          setState(null);
          await refreshAllSlots();
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
    [slot, refreshAllSlots],
  );

  const exportSlot = useCallback(
    (target: number): string => {
      const found = allSlots.find((s) => s.slot === target);
      if (found === undefined || found.blob === null) {
        throw new Error(`useSaveSlot.exportSlot: slot ${target} is empty`);
      }
      return encodeSaveBlob(found.blob);
    },
    [allSlots],
  );

  const importSlot = useCallback(
    async (target: number, base64: string): Promise<void> => {
      const blob = decodeSaveBlob(base64);
      await adapter.save(target, blob);
      if (target === slot) {
        setState(blob);
      }
      await refreshAllSlots();
    },
    [slot, refreshAllSlots],
  );

  const deleteSlot = useCallback(
    async (target: number): Promise<void> => {
      await adapter.deleteSlot(target);
      if (target === slot) {
        setState(null);
      }
      await refreshAllSlots();
    },
    [slot, refreshAllSlots],
  );

  return {
    state,
    loading,
    dispatch,
    settings,
    updateSettings,
    setContentWarning,
    allSlots,
    refreshAllSlots,
    exportSlot,
    importSlot,
    deleteSlot,
  };
}
