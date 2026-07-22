import * as engine from '../';
import { describe, expect, it } from 'vitest';

describe('engine smoke', () => {
  it('exports applyChoice stub', () => {
    expect(typeof engine.applyChoice).toBe('function');
  });

  it('exports summarizeLife stub', () => {
    expect(typeof engine.summarizeLife).toBe('function');
  });

  it('exports mergeKarma stub', () => {
    expect(typeof engine.mergeKarma).toBe('function');
  });

  it('exports applyEchoesToNextLife stub', () => {
    expect(typeof engine.applyEchoesToNextLife).toBe('function');
  });

  it('exports emptyKarma helper', () => {
    expect(typeof engine.emptyKarma).toBe('function');
  });

  it('exports advanceTurn stub', () => {
    expect(typeof engine.advanceTurn).toBe('function');
  });

  it('exports createRng stub', () => {
    expect(typeof engine.createRng).toBe('function');
  });

  it('exports canonicalStringify stub', () => {
    expect(typeof engine.canonicalStringify).toBe('function');
  });

  it('emptyKarma returns a well-formed zeroed KarmaState', () => {
    const k = engine.emptyKarma();
    expect(k.echoes).toEqual([]);
    expect(k.vows).toEqual({});
    expect(k.accumulated_intent_roots).toEqual({
      care: 0,
      greed: 0,
      aversion: 0,
      delusion: 0,
    });
  });

  it('applyEchoesToNextLife returns a seed with no social_identity field', () => {
    // Defensive: the barrel-level invariant from plan todo 7.
    const seed = engine.applyEchoesToNextLife(
      engine.emptyKarma(),
      '' as never,
      { next: () => 0 } as never,
    );
    expect(Object.prototype.hasOwnProperty.call(seed, 'social_identity')).toBe(false);
  });
});
