import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount, splitEvenly } from '../src/core/money';

describe('parseAmount', () => {
  it('tolkar heltal i kronor', () => {
    expect(parseAmount('120')).toBe(12000);
  });

  it('tolkar decimal med komma och punkt', () => {
    expect(parseAmount('120,5')).toBe(12050);
    expect(parseAmount('120.05')).toBe(12005);
  });

  it('ignorerar mellanslag', () => {
    expect(parseAmount(' 1 200,50 ')).toBe(120050);
  });

  it('accepterar noll', () => {
    expect(parseAmount('0')).toBe(0);
  });

  it('avvisar ogiltiga belopp', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1,234')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('formaterar med tusentalsavgränsare och två decimaler', () => {
    expect(formatAmount(123450)).toBe('1 234,50 kr');
  });

  it('formaterar små och negativa belopp', () => {
    expect(formatAmount(5)).toBe('0,05 kr');
    expect(formatAmount(-24000)).toBe('-240,00 kr');
  });
});

describe('splitEvenly', () => {
  it('delar jämnt när det går', () => {
    expect(splitEvenly(300, 3)).toEqual([100, 100, 100]);
  });

  it('fördelar resten deterministiskt utan att tappa ören', () => {
    const parts = splitEvenly(100, 3);
    expect(parts).toEqual([34, 33, 33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('hanterar 0 kr och en person', () => {
    expect(splitEvenly(0, 4)).toEqual([0, 0, 0, 0]);
    expect(splitEvenly(999, 1)).toEqual([999]);
  });

  it('kastar fel vid ogiltig indata', () => {
    expect(() => splitEvenly(100, 0)).toThrow(RangeError);
    expect(() => splitEvenly(10.5, 2)).toThrow(RangeError);
  });
});
