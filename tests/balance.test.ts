import { describe, expect, it } from 'vitest';
import { computeBalances } from '../src/core/balance';
import type { Group } from '../src/core/types';

const people = [
  { id: 'a', name: 'Anna' },
  { id: 'e', name: 'Erik' },
  { id: 's', name: 'Sara' },
];

const sum = (m: ReadonlyMap<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);

describe('computeBalances', () => {
  it('ger alla 0 när det inte finns utgifter', () => {
    const balances = computeBalances({ name: 'X', people, expenses: [] });
    expect([...balances]).toEqual([
      ['a', 0],
      ['e', 0],
      ['s', 0],
    ]);
  });

  it('räknar ut saldon för en delad utgift', () => {
    const group: Group = {
      name: 'X',
      people,
      expenses: [{ id: '1', description: 'Mat', amount: 30000, paidBy: 'a', sharedBy: ['a', 'e', 's'] }],
    };
    const balances = computeBalances(group);
    expect(balances.get('a')).toBe(20000);
    expect(balances.get('e')).toBe(-10000);
    expect(balances.get('s')).toBe(-10000);
  });

  it('hanterar att betalaren inte själv delar på utgiften', () => {
    const group: Group = {
      name: 'X',
      people,
      expenses: [{ id: '1', description: 'Present', amount: 500, paidBy: 'a', sharedBy: ['e'] }],
    };
    const balances = computeBalances(group);
    expect(balances.get('a')).toBe(500);
    expect(balances.get('e')).toBe(-500);
    expect(balances.get('s')).toBe(0);
  });

  it('summerar alltid till exakt 0, även med avrundning', () => {
    const group: Group = {
      name: 'X',
      people,
      expenses: [
        { id: '1', description: 'Mat', amount: 100, paidBy: 'a', sharedBy: ['a', 'e', 's'] },
        { id: '2', description: 'Taxi', amount: 1001, paidBy: 'e', sharedBy: ['a', 's'] },
        { id: '3', description: 'Fika', amount: 7, paidBy: 's', sharedBy: ['a', 'e', 's'] },
      ],
    };
    expect(sum(computeBalances(group))).toBe(0);
  });
});
