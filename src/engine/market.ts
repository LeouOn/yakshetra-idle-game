// Material market work. Copper and completed shifts use existing durable life maps.
// Rewards have their own seeded stream; harvesting RNG is never consumed here.
import { createRng } from './rng';
import type { StudioSession } from './studio-session';
import { absorbSurplus } from './operations';
import { benchToStudio, studioToBench } from './bench-mapping';

export const TEA_COST = 4;
export const SUPPLIES_COST = 3;
export const SUPPLIES_STEPS = 8;
export type MarketPurchase = 'tea' | 'supplies';

export function copperBalance(session: StudioSession): number {
  return Math.max(0, Math.floor(session.life.resources.copper ?? 0));
}

/** Hash all four state words so the first random draw is well mixed. */
function shiftSeed(index: number): bigint {
  let seed = 0n;
  for (let word = 0; word < 4; word++) {
    let hash = 0x811c9dc5;
    const key = `yakshetra-market-v1:${index}:${word}`;
    for (let i = 0; i < key.length; i++)
      hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
    seed = (seed << 32n) | BigInt(hash);
  }
  return seed || 1n;
}

/** 70% base pay, 25% small tip, 5% generous tip. No spend or loss on a roll. */
export function marketReward(roll: number): number {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1)
    throw new RangeError('market roll must be in [0, 1)');
  return roll < 0.05 ? 6 : roll < 0.3 ? 3 : 1;
}

/** Called once after a completed active shift; the saved count prevents reload rerolls. */
export function completeMarketShift(session: StudioSession): {
  session: StudioSession;
  copper: number;
} {
  const shifts = Math.max(0, Math.floor(session.life.skills.market_shifts ?? 0));
  const copper = marketReward(createRng(shiftSeed(shifts)).next());
  return {
    copper,
    session: {
      ...session,
      life: {
        ...session.life,
        resources: { ...session.life.resources, copper: copperBalance(session) + copper },
        skills: { ...session.life.skills, market_shifts: shifts + 1 },
      },
    },
  };
}

/** Fixed-price choices; failure is an identity-preserving no-op. */
export function purchaseMarket(session: StudioSession, purchase: MarketPurchase): StudioSession {
  const cost = purchase === 'tea' ? TEA_COST : SUPPLIES_COST;
  const balance = copperBalance(session);
  const bench = session.benches.person;
  if (balance < cost || bench === undefined) return session;
  let next = bench;
  if (purchase === 'supplies') {
    // Carry unused supplies forward instead of discarding steps when a batch finishes.
    const remaining =
      bench.bay?.status === 'cooking' ? bench.bay.cook_ticks_total - bench.bay.cook_ticks_done : 0;
    const used = Math.min(SUPPLIES_STEPS, remaining);
    const accelerated = absorbSurplus(benchToStudio(bench, session.archive), used);
    next = studioToBench(
      { ...accelerated, surplus: accelerated.surplus + SUPPLIES_STEPS - used },
      bench.fold_position,
    );
  } else {
    const tick = Number(session.idle.last_simulated_tick);
    next = {
      ...bench,
      residue: [
        ...bench.residue,
        ...[0, 1, 2].map((index) => ({
          tick,
          type: 'lens_chosen' as const,
          ids: ['market:tea', `conversation:${index}`],
          numbers: { copper_spent: index === 0 ? cost : 0 },
        })),
      ],
    };
  }
  return {
    ...session,
    benches: { ...session.benches, person: next },
    life: { ...session.life, resources: { ...session.life.resources, copper: balance - cost } },
  };
}
