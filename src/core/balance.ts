import { splitEvenly } from './money';
import type { Balances, Group, PersonId } from './types';

/**
 * Räknar ut saldo per person i ören.
 * Den som betalat får plus för hela beloppet, och varje deltagare får minus för sin andel.
 * Summan av alla saldon är alltid exakt 0.
 */
export function computeBalances(group: Group): Balances {
  const balances = new Map<PersonId, number>(group.people.map((p) => [p.id, 0]));
  const add = (id: PersonId, amount: number) => balances.set(id, (balances.get(id) ?? 0) + amount);

  for (const expense of group.expenses) {
    add(expense.paidBy, expense.amount);
    const shares = splitEvenly(expense.amount, expense.sharedBy.length);
    expense.sharedBy.forEach((id, i) => add(id, -(shares[i] ?? 0)));
  }
  return balances;
}
