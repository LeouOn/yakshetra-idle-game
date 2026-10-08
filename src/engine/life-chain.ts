// Life-chain snapshot — campaign SaveBlob helpers.
//
// Studio has its own store. This module writes the life-chain blob the
// persistence adapters wrap. Pure: no Date; `nowUnix` is a parameter.

import { emptyKarma } from './echo';
import type { LifeState, SaveBlob } from './types';

export const LIFE_CHAIN_ENGINE_COMPAT = '0.1.0';

function asStringSet(value: unknown): Set<string> {
  if (value instanceof Set) {
    return value;
  }
  if (Array.isArray(value)) {
    return new Set(value.filter((entry) => typeof entry === 'string'));
  }
  return new Set();
}

/** Revive Set fields after JSON load (canonical encoding stores them as arrays). */
export function reviveLifeState(life: LifeState): LifeState {
  return {
    ...life,
    flags: asStringSet(life.flags),
    fired_once_per_run: asStringSet(life.fired_once_per_run),
  };
}

export function currentLife(blob: SaveBlob): LifeState | null {
  const idx = blob.chain.current_life_index;
  const life = blob.chain.life_states[idx];
  if (life === undefined) {
    return null;
  }
  return reviveLifeState(life);
}

/**
 * The life a player may still act in: the current one only while it lives.
 *
 * `currentLife` answers "which slot is the cursor on" and keeps returning a
 * finished life, which is what persistence needs. The routes need the other
 * question — "is there a life to resume?" — so they never reopen a corpse.
 */
export function openLife(blob: SaveBlob): LifeState | null {
  const life = currentLife(blob);
  return life !== null && life.alive ? life : null;
}

/**
 * Write `life` into the current chain slot. A missing prior blob starts a
 * new chain. Identity is copied through the life as-is.
 */
export function snapshotLifeChain(
  life: LifeState,
  prior: SaveBlob | null,
  nowUnix: number,
): SaveBlob {
  if (prior === null) {
    return {
      schema_version: '0.1',
      engine_compat: LIFE_CHAIN_ENGINE_COMPAT,
      created_at_unix: nowUnix,
      run_id: life.id,
      chain: {
        life_states: [life],
        karma_state: emptyKarma(),
        current_life_index: 0,
      },
    };
  }
  const idx = prior.chain.current_life_index;
  const lives = [...prior.chain.life_states];
  if (idx >= 0 && idx < lives.length) {
    lives[idx] = life;
  } else {
    lives.push(life);
  }
  return {
    ...prior,
    chain: {
      ...prior.chain,
      life_states: lives,
    },
  };
}

/**
 * Open a NEW life in the chain: append it and move the cursor onto it.
 *
 * `snapshotLifeChain` overwrites the current slot, so using it for a second
 * life would land the new life on top of the first — the chain would never
 * grow past one. This appends instead. Re-opening the life that already
 * occupies the current slot is a no-op, so a re-render cannot fork the chain.
 * A missing prior blob starts a new chain, as in `snapshotLifeChain`.
 */
export function startNextLife(prior: SaveBlob | null, life: LifeState, nowUnix: number): SaveBlob {
  if (prior === null) {
    return snapshotLifeChain(life, null, nowUnix);
  }
  const idx = prior.chain.current_life_index;
  const lives = [...prior.chain.life_states];
  const atCursor = idx >= 0 && idx < lives.length ? lives[idx] : undefined;
  if (atCursor !== undefined && atCursor.id === life.id) {
    lives[idx] = life;
    return { ...prior, chain: { ...prior.chain, life_states: lives } };
  }
  lives.push(life);
  return {
    ...prior,
    chain: {
      ...prior.chain,
      life_states: lives,
      current_life_index: lives.length - 1,
    },
  };
}
