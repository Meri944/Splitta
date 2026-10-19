import { describe, expect, it } from 'vitest';
import {
  addExpense,
  addPerson,
  createGroup,
  isPersonInvolved,
  isValidGroup,
  removeExpense,
  removePerson,
  renameGroup,
  totalSpent,
  updateExpense,
  validateExpense,
  validatePersonName,
} from '../src/core/group';
import type { GroupResult } from '../src/core/group';
import type { Group } from '../src/core/types';

/** Hämtar gruppen ur ett lyckat resultat, annars fallerar testet. */
function unwrap(result: GroupResult): Group {
  if (!result.ok) throw new Error(`Oväntat fel: ${result.error}`);
  return result.group;
}

const withPeople = (...names: string[]): Group =>
  names.reduce((g, name) => unwrap(addPerson(g, name)), createGroup('Resa'));

describe('createGroup och renameGroup', () => {
  it('skapar en tom grupp med trimmat namn', () => {
    expect(createGroup('  Fjällresa  ')).toEqual({ name: 'Fjällresa', people: [], expenses: [] });
  });

  it('lämnar tomt namn tomt – standardnamnet väljs i UI-lagret', () => {
    expect(createGroup('   ').name).toBe('');
  });

  it('kortar av för långa gruppnamn', () => {
    expect(createGroup('x'.repeat(100)).name).toHaveLength(40);
  });

  it('byter namn men ignorerar tomt namn', () => {
    const g = createGroup('A');
    expect(renameGroup(g, 'B').name).toBe('B');
    expect(renameGroup(g, '  ')).toBe(g);
  });
});

describe('personer', () => {
  it('lägger till personer med unika id', () => {
    const g = withPeople('Anna', 'Erik', 'Sara');
    expect(g.people.map((p) => p.name)).toEqual(['Anna', 'Erik', 'Sara']);
    expect(new Set(g.people.map((p) => p.id)).size).toBe(3);
  });

  it('validerar tomma och dubbla namn', () => {
    const g = withPeople('Anna');
    expect(validatePersonName(g, '  ')).not.toBeNull();
    expect(validatePersonName(g, 'anna')).not.toBeNull();
    expect(validatePersonName(g, 'Erik')).toBeNull();
    expect(addPerson(g, 'ANNA')).toEqual({ ok: false, error: { code: 'name-taken', name: 'ANNA' } });
  });

  it('muterar inte originalgruppen', () => {
    const g = withPeople('Anna');
    unwrap(addPerson(g, 'Erik'));
    expect(g.people).toHaveLength(1);
  });

  it('tar bort en person som inte är med i någon utgift', () => {
    const g = withPeople('Anna', 'Erik');
    const erik = g.people[1]!.id;
    expect(removePerson(g, erik).people.map((p) => p.name)).toEqual(['Anna']);
  });

  it('tar inte bort en person som är med i en utgift', () => {
    const g0 = withPeople('Anna', 'Erik');
    const [anna, erik] = g0.people.map((p) => p.id) as [string, string];
    const g = unwrap(addExpense(g0, { description: 'Mat', amount: 100, paidBy: anna, sharedBy: [erik] }));
    expect(isPersonInvolved(g, erik)).toBe(true);
    expect(removePerson(g, erik)).toBe(g);
  });
});

describe('utgifter', () => {
  const g0 = withPeople('Anna', 'Erik', 'Sara');
  const [anna, erik, sara] = g0.people.map((p) => p.id) as [string, string, string];

  it('lägger till en utgift och sorterar deltagare i gruppens ordning', () => {
    const g = unwrap(addExpense(g0, { description: ' Mat ', amount: 30000, paidBy: anna, sharedBy: [sara, anna, sara] }));
    expect(g.expenses).toHaveLength(1);
    expect(g.expenses[0]).toMatchObject({ description: 'Mat', sharedBy: [anna, sara] });
    expect(totalSpent(g)).toBe(30000);
  });

  it('avvisar ogiltiga utgifter', () => {
    const base = { description: 'Mat', amount: 100, paidBy: anna, sharedBy: [anna] };
    expect(validateExpense(g0, base)).toBeNull();
    expect(validateExpense(g0, { ...base, description: ' ' })).not.toBeNull();
    expect(validateExpense(g0, { ...base, amount: 0 })).not.toBeNull();
    expect(validateExpense(g0, { ...base, amount: 1.5 })).not.toBeNull();
    expect(validateExpense(g0, { ...base, paidBy: 'x' })).not.toBeNull();
    expect(validateExpense(g0, { ...base, sharedBy: [] })).not.toBeNull();
    expect(validateExpense(g0, { ...base, sharedBy: ['x'] })).not.toBeNull();
    expect(addExpense(g0, { ...base, amount: -1 })).toEqual({ ok: false, error: { code: 'amount-not-positive' } });
  });

  it('uppdaterar och tar bort utgifter', () => {
    const g1 = unwrap(addExpense(g0, { description: 'Mat', amount: 100, paidBy: anna, sharedBy: [anna, erik] }));
    const id = g1.expenses[0]!.id;
    const g2 = unwrap(updateExpense(g1, id, { description: 'Middag', amount: 200, paidBy: erik, sharedBy: [erik] }));
    expect(g2.expenses[0]).toEqual({ id, description: 'Middag', amount: 200, paidBy: erik, sharedBy: [erik] });
    expect(removeExpense(g2, id).expenses).toHaveLength(0);
  });

  it('ger fel i stället för att tyst ignorera ogiltiga ändringar', () => {
    const g1 = unwrap(addExpense(g0, { description: 'Mat', amount: 100, paidBy: anna, sharedBy: [anna] }));
    const id = g1.expenses[0]!.id;
    const valid = { description: 'Mat', amount: 100, paidBy: anna, sharedBy: [anna] };
    expect(updateExpense(g1, 'finns-inte', valid)).toEqual({ ok: false, error: { code: 'expense-missing' } });
    expect(updateExpense(g1, id, { ...valid, sharedBy: [] }).ok).toBe(false);
  });

  it('ger nya utgifter unika id även efter borttagning', () => {
    const add = (g: Group) => unwrap(addExpense(g, { description: 'X', amount: 1, paidBy: anna, sharedBy: [anna] }));
    const g = add(add(g0));
    const ids = add(removeExpense(g, g.expenses[0]!.id)).expenses.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('felkoder', () => {
  it('returnerar strukturerade fel, inte användartexter', () => {
    const g = withPeople('Anna');
    expect(validatePersonName(g, '')).toEqual({ code: 'name-empty' });
    expect(validatePersonName(g, 'x'.repeat(41))).toEqual({ code: 'name-too-long', max: 40 });
  });
});

describe('isValidGroup', () => {
  it('godkänner en konsistent grupp', () => {
    const g0 = withPeople('Anna', 'Erik');
    const anna = g0.people[0]!.id;
    expect(isValidGroup(unwrap(addExpense(g0, { description: 'Mat', amount: 1, paidBy: anna, sharedBy: [anna] })))).toBe(true);
  });

  it('underkänner dubbla id och trasiga referenser', () => {
    expect(
      isValidGroup({ name: 'X', people: [{ id: '1', name: 'A' }, { id: '1', name: 'B' }], expenses: [] }),
    ).toBe(false);
    expect(
      isValidGroup({
        name: 'X',
        people: [{ id: '1', name: 'A' }],
        expenses: [{ id: '1', description: 'Mat', amount: 1, paidBy: '2', sharedBy: ['1'] }],
      }),
    ).toBe(false);
  });
});
