import { describe, expect, it } from 'vitest';
import type { GroupError } from '../src/core/group';
import { errorMessage } from '../src/ui/messages';

const allErrors: GroupError[] = [
  { code: 'name-empty' },
  { code: 'name-too-long', max: 40 },
  { code: 'name-taken', name: 'Anna' },
  { code: 'description-empty' },
  { code: 'description-too-long', max: 80 },
  { code: 'amount-not-positive' },
  { code: 'amount-too-large' },
  { code: 'payer-missing' },
  { code: 'no-sharers' },
  { code: 'unknown-sharer' },
  { code: 'expense-missing' },
  { code: 'too-many-people', max: 50 },
  { code: 'too-many-expenses', max: 500 },
];

describe('errorMessage', () => {
  it('har en svensk text för varje felkod', () => {
    for (const error of allErrors) {
      const text = errorMessage(error);
      expect(text.length > 0 && text.endsWith('.')).toBe(true);
    }
  });

  it('fyller i detaljer från felet', () => {
    expect(errorMessage({ code: 'name-too-long', max: 40 })).toBe('Namnet får vara högst 40 tecken.');
    expect(errorMessage({ code: 'name-taken', name: 'Anna' })).toBe('Anna finns redan i gruppen.');
  });
});
