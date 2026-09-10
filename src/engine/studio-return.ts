// Studio → next life — pinned cards and world drafts seed later play.
//
// Pins already bias the next harvest window (`about_id`). This module is the
// return path SPEC §5 still owed: a new life carries those pins as ties and
// flags, never as social identity. Pure: no Date, no network, no RNG.

import { assembleWorldDraft } from './world-draft';
import type { StudioSession } from './studio-session';
import type { LifeState } from './types';

/** Warm starting tie — same numbers `tiesFromCast` uses for archive persons. */
const PINNED_PERSON_TIE = { trust: 1, debt: 0, affection: 2 } as const;

export function pinFlag(id: string): string {
  return `pin:${id}`;
}

export function placeFlag(id: string): string {
  return `place:${id}`;
}

export function worldDraftFlag(scale: string): string {
  return `world_draft:${scale}`;
}

export const WORLD_ASSEMBLED_FLAG = 'world:assembled';

interface PinRef {
  readonly id: string;
  readonly kind: string;
}

/** Bench pins plus roster focus_ids that resolve in the archive. */
function pinRefs(session: StudioSession): readonly PinRef[] {
  const seen = new Set<string>();
  const out: PinRef[] = [];
  const add = (id: string, kind: string): void => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    out.push({ id, kind });
  };
  for (const bench of Object.values(session.benches)) {
    if (bench.pinned !== null) {
      add(bench.pinned.id, bench.pinned.kind);
    }
  }
  const kindById = new Map(session.archive.map((card) => [card.id, card.kind]));
  for (const tier of Object.values(session.tiers)) {
    for (const member of tier.roster.members) {
      if (member.focus_id === undefined) {
        continue;
      }
      const kind = kindById.get(member.focus_id);
      if (kind === undefined) {
        continue;
      }
      add(member.focus_id, kind);
    }
  }
  return out;
}

/**
 * Fold the studio archive into a freshly created life. Identity is copied
 * untouched. Already-present ties and flags are left as they are so a second
 * call is a no-op. Returns the input life when nothing applies.
 */
export function applyStudioToNextLife(life: LifeState, session: StudioSession): LifeState {
  const pins = pinRefs(session);
  const drafts = session.world_drafts;
  const assembled = assembleWorldDraft(session.archive) !== null;
  if (pins.length === 0 && drafts.length === 0 && !assembled) {
    return life;
  }

  const relationships = { ...life.relationships };
  const flags = new Set(life.flags);
  let changed = false;

  for (const pin of pins) {
    if (!flags.has(pinFlag(pin.id))) {
      flags.add(pinFlag(pin.id));
      changed = true;
    }
    if (pin.kind === 'person' && relationships[pin.id] === undefined) {
      relationships[pin.id] = { ...PINNED_PERSON_TIE };
      changed = true;
    }
    if (pin.kind === 'place' && !flags.has(placeFlag(pin.id))) {
      flags.add(placeFlag(pin.id));
      changed = true;
    }
  }

  for (const draft of drafts) {
    const flag = worldDraftFlag(draft.scale);
    if (!flags.has(flag)) {
      flags.add(flag);
      changed = true;
    }
  }

  if (assembled && !flags.has(WORLD_ASSEMBLED_FLAG)) {
    flags.add(WORLD_ASSEMBLED_FLAG);
    changed = true;
  }

  if (!changed) {
    return life;
  }
  return { ...life, relationships, flags };
}
