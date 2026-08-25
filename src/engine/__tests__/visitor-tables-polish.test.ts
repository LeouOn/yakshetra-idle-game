// Visitor tables polish (Phase 7 Task 4) — real tables for the seated
// guests. The court auditor and road surveyor now carry `table_ref`s that
// resolve to shipped `visitor_tables` namespaces in catalogs.json5, and
// sample-arrival's fixture copy is replaced with real copy (both names
// kept — the StudioView swap test harvests them).
//
// Harness mirrors the sample-arrival swap tests in visitors.test.ts (the
// `visitorTableOverride(rows, activeId, visitorTables, baseCatalog)` shape
// and the "whole pool, same reference for every kind" assertions), but
// drives the real registries — the ladder-e2e.test.ts precedent for engine
// tests loading content. No runtime dependency flows from engine modules
// to content; only this test file imports the loader.

import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';
import { visitorTableOverride } from '@/engine/visitors';

const reg = loadProgression();

/** Seat `visitorId` and assert the whole-pool swap for `namespace` fires. */
function expectSeatedSwap(visitorId: string, namespace: string, tierScale: string): void {
  // The row exists, walks the named scale, and points at the namespace.
  const row = reg.visitors.find((candidate) => candidate.id === visitorId);
  expect(row, visitorId).toBeDefined();
  expect(row?.tiers, `${visitorId} scale`).toContain(tierScale);
  expect(row?.table_ref, `${visitorId} table_ref`).toBe(namespace);

  // The namespace ships entries, and none of its names appear in any
  // per-kind base table (the swap must be observable in the name).
  const entries = reg.visitorTables[namespace];
  expect(entries, namespace).toBeDefined();
  expect((entries ?? []).length).toBeGreaterThan(0);
  const baseNames = new Set(
    Object.values(reg.catalogs).flatMap((table) => table.map((entry) => entry.name)),
  );
  for (const entry of entries ?? []) {
    expect(baseNames.has(entry.name), `${namespace} name "${entry.name}" must be pool-only`).toBe(
      false,
    );
  }

  // Swapped shape, exactly as the sample-arrival swap test asserts it:
  // NOT the base catalog; every kind returns the visitor's entries; the
  // pool lives once (same reference for every kind).
  const swapped = visitorTableOverride(reg.visitors, visitorId, reg.visitorTables, reg.catalogs);
  expect(swapped).not.toBe(reg.catalogs);
  for (const kind of Object.keys(reg.catalogs)) {
    expect(swapped[kind], `${visitorId} → ${kind}`).toBe(entries);
  }
}

describe('visitor tables (Phase 7 Task 4)', () => {
  it('seated court-auditor swaps every kind for court-audit entries on the city tier', () => {
    expectSeatedSwap('visitor/court-auditor', 'visitor-table/court-audit', 'city');
  });

  it('seated road-surveyor swaps every kind for road-survey entries on the region tier', () => {
    expectSeatedSwap('visitor/road-surveyor', 'visitor-table/road-survey', 'region');
  });

  it('returns the base catalogs when no visitor is seated (regression pin)', () => {
    expect(visitorTableOverride(reg.visitors, null, reg.visitorTables, reg.catalogs)).toBe(
      reg.catalogs,
    );
  });
});
