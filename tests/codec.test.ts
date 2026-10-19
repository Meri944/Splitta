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

describe('gränser för data från länkar', () => {
  const people = (n: number, length = 5) =>
    Array.from({ length: n }, (_, i) => [i.toString(36), `P${i}`.padEnd(length, 'x')] as [string, string]);

  it('avvisar för långa namn', () => {
    expect(fromCompact({ v: 1, n: 'x'.repeat(41), p: people(2), e: [] })).toBeNull();
    expect(fromCompact({ v: 1, n: 'Resa', p: [['1', 'x'.repeat(41)]], e: [] })).toBeNull();
    expect(fromCompact({ v: 1, n: 'x'.repeat(40), p: [['1', 'x'.repeat(40)]], e: [] })).not.toBeNull();
  });

  it('avvisar för många personer', () => {
    expect(fromCompact({ v: 1, n: 'Resa', p: people(50), e: [] })).not.toBeNull();
    expect(fromCompact({ v: 1, n: 'Resa', p: people(51), e: [] })).toBeNull();
  });

  it('avvisar konstiga id:n', () => {
    expect(fromCompact({ v: 1, n: 'Resa', p: [['<script>', 'Anna']], e: [] })).toBeNull();
    expect(fromCompact({ v: 1, n: 'Resa', p: [['1'.repeat(100), 'Anna']], e: [] })).toBeNull();
  });

  it('avvisar en dekomprimeringsbomb utan att packa upp allt', async () => {
    // 50 MB nollor komprimeras till en kort sträng
    const zeros = new Blob([new Uint8Array(50_000_000)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(zeros).arrayBuffer());
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const bomb = '1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const start = Date.now();
    expect(await decodeGroup(bomb)).toBeNull();
    expect(Date.now() - start < 1000).toBe(true);
  });

  it('avvisar för långa länkar direkt', async () => {
    expect(await decodeGroup('1.' + 'A'.repeat(400_000))).toBeNull();
  });
});
