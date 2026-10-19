import { describe, expect, it } from 'vitest';
import { settleDebts } from '../src/core/settle';
import type { Transfer } from '../src/core/types';

const balancesOf = (entries: Record<string, number>) => new Map(Object.entries(entries));

/** Tillämpar betalningarna och returnerar saldona efteråt. */
function applyTransfers(balances: Map<string, number>, transfers: readonly Transfer[]) {
  const result = new Map(balances);
  for (const t of transfers) {
    result.set(t.from, (result.get(t.from) ?? 0) + t.amount);
    result.set(t.to, (result.get(t.to) ?? 0) - t.amount);
  }
  return result;
}

describe('settleDebts', () => {
  it('ger inga betalningar när alla redan är kvitt', () => {
    expect(settleDebts(balancesOf({ a: 0, e: 0 }))).toEqual([]);
    expect(settleDebts(new Map())).toEqual([]);
  });

  it('ger en betalning mellan två personer', () => {
    expect(settleDebts(balancesOf({ a: 500, e: -500 }))).toEqual([{ from: 'e', to: 'a', amount: 500 }]);
  });

  it('låter flera skuldsatta betala samma person', () => {
    const transfers = settleDebts(balancesOf({ a: 20000, e: -10000, s: -10000 }));
    expect(transfers).toEqual([
      { from: 'e', to: 'a', amount: 10000 },
      { from: 's', to: 'a', amount: 10000 },
    ]);
  });

  it('parar ihop exakt matchande belopp först', () => {
    // Girigt utan matchning skulle ge 3 betalningar; med matchning räcker 2.
    const transfers = settleDebts(balancesOf({ a: 700, b: 300, c: -300, d: -700 }));
    expect(transfers).toHaveLength(2);
    expect(transfers).toContainEqual({ from: 'd', to: 'a', amount: 700 });
    expect(transfers).toContainEqual({ from: 'c', to: 'b', amount: 300 });
  });

  it('gör alla kvitt med högst n − 1 betalningar', () => {
    const balances = balancesOf({ a: 1234, b: -567, c: 890, d: -1001, e: -556 });
    const transfers = settleDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(4);
    expect([...applyTransfers(balances, transfers).values()].every((v) => v === 0)).toBe(true);
    expect(transfers.every((t) => t.amount > 0 && Number.isInteger(t.amount))).toBe(true);
  });

  it('är deterministisk', () => {
    const balances = balancesOf({ a: 100, b: 100, c: -100, d: -100 });
    expect(settleDebts(balances)).toEqual(settleDebts(balances));
  });

  it('muterar inte indata', () => {
    const balances = balancesOf({ a: 100, b: -100 });
    settleDebts(balances);
    expect(balances.get('a')).toBe(100);
  });
});
