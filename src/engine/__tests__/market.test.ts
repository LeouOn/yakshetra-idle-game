import { describe, expect, it } from 'vitest';
import { completeMarketShift, copperBalance, marketReward, purchaseMarket } from '../market';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  StudioSessionSchema,
  createRng,
  queueDevelop,
  recordStudioResidues,
} from '@/engine';
import { studioToBench } from '../bench-mapping';
function session() {
  const b = emptyHydratedSession();
  return snapshotStudioSession(b.studio, b.idle, b.life, b.practices);
}
describe('market economy', () => {
  it('has explicit bounded payment probabilities', () => {
    expect([0, 0.04999, 0.05, 0.29999, 0.3, 0.9999].map(marketReward)).toEqual([6, 6, 3, 3, 1, 1]);
    expect(() => marketReward(1)).toThrow();
    expect(() => marketReward(-1)).toThrow();
  });
  it('preserves the next payment and balance through save/load', () => {
    let s = session();
    for (let i = 0; i < 19; i++) s = completeMarketShift(s).session;
    const restored = StudioSessionSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(completeMarketShift(restored)).toEqual(completeMarketShift(s));
    expect(copperBalance(restored)).toBeGreaterThanOrEqual(19);
    expect(restored.life.skills.market_shifts).toBe(19);
  });
  it('produces base pay and both tips across a deterministic run', () => {
    let s = session();
    const counts = new Map<number, number>();
    for (let i = 0; i < 1000; i++) {
      const result = completeMarketShift(s);
      s = result.session;
      counts.set(result.copper, (counts.get(result.copper) ?? 0) + 1);
    }
    expect(counts.get(1)).toBeGreaterThan(600);
    expect(counts.get(3)).toBeGreaterThan(150);
    expect(counts.get(6)).toBeGreaterThan(15);
  });
  it('rejects unaffordable purchases without mutation', () => {
    const s = session();
    expect(purchaseMarket(s, 'tea')).toBe(s);
    expect(purchaseMarket(s, 'supplies')).toBe(s);
  });
  it('spends exactly four copper on three social experiences and prevents a second purchase', () => {
    const base = session();
    const s = { ...base, life: { ...base.life, resources: { ...base.life.resources, copper: 4 } } };
    const bought = purchaseMarket(s, 'tea');
    expect(copperBalance(bought)).toBe(0);
    expect(bought.benches.person?.residue).toHaveLength(3);
    expect(purchaseMarket(bought, 'tea')).toBe(bought);
    expect(StudioSessionSchema.safeParse(bought).success).toBe(true);
    expect(copperBalance(s)).toBe(4);
  });
  it('preserves leftover supplies when a working finishes', () => {
    const base = session();
    const b = emptyHydratedSession();
    const studio = queueDevelop(
      recordStudioResidues(
        b.studio,
        [1, 2, 3].map((tick) => ({
          tick,
          type: 'practice_tick' as const,
          ids: ['work'],
          numbers: {},
        })),
      ),
      null,
      createRng(23n),
    );
    const s = {
      ...base,
      life: { ...base.life, resources: { ...base.life.resources, copper: 3 } },
      benches: { ...base.benches, person: studioToBench(studio) },
    };
    const bought = purchaseMarket(s, 'supplies');
    expect(bought.benches.person?.bay?.status).toBe('ready');
    expect(bought.benches.person?.surplus).toBe(1);
    expect(copperBalance(bought)).toBe(0);
    expect(StudioSessionSchema.safeParse(bought).success).toBe(true);
  });
  it('banks all supplies if the bay is empty', () => {
    const base = session();
    const s = { ...base, life: { ...base.life, resources: { ...base.life.resources, copper: 3 } } };
    expect(purchaseMarket(s, 'supplies').benches.person?.surplus).toBe(8);
  });
});
