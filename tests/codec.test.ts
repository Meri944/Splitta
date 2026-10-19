import { describe, expect, it } from 'vitest';
import { fromCompact, toCompact } from '../src/storage/codec';
import { decodeGroup, encodeGroup } from '../src/storage/url';
import type { Group } from '../src/core/types';

const group: Group = {
  name: 'Fjällresa 2026',
  people: [
    { id: '1', name: 'Anna' },
    { id: '2', name: 'Erik Åström' },
  ],
  expenses: [{ id: '1', description: 'Stuga – 3 nätter', amount: 450000, paidBy: '1', sharedBy: ['1', '2'] }],
};

describe('codec', () => {
  it('klarar en tur och retur genom kompakt format', () => {
    expect(fromCompact(JSON.parse(JSON.stringify(toCompact(group))))).toEqual(group);
  });

  it('avvisar fel version och fel struktur', () => {
    expect(fromCompact({ ...toCompact(group), v: 2 })).toBeNull();
    expect(fromCompact(null)).toBeNull();
    expect(fromCompact('hej')).toBeNull();
    expect(fromCompact({ v: 1, n: 'X', p: [[1, 'A']], e: [] })).toBeNull();
  });

  it('avvisar grupper med trasiga referenser', () => {
    const broken = toCompact(group);
    broken.e[0]![3] = '99';
    expect(fromCompact(broken)).toBeNull();
  });
});

describe('url-kodning', () => {
  it('klarar en tur och retur med komprimering och åäö', async () => {
    const encoded = await encodeGroup(group);
    expect(encoded.startsWith('1.')).toBe(true);
    expect(encoded).toMatch(/^1\.[A-Za-z0-9_-]+$/);
    expect(await decodeGroup(encoded)).toEqual(group);
  });

  it('returnerar null för skräp i stället för att krascha', async () => {
    expect(await decodeGroup('')).toBeNull();
    expect(await decodeGroup('1.inte-giltig-data')).toBeNull();
    expect(await decodeGroup('2.abc')).toBeNull();
  });
});
