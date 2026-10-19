import type { Balances, PersonId, Transfer } from './types';

interface Party {
  readonly id: PersonId;
  amount: number;
}

const largestFirst = (a: Party, b: Party): number =>
  b.amount - a.amount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Föreslår betalningar som gör alla kvitt, med så få betalningar som möjligt.
 *
 * 1. Den som är skyldig exakt lika mycket som någon annan ska ha betalar direkt till den personen.
 * 2. Resten matchas girigt: största skulden betalas till den som ska ha mest.
 *
 * Ger alltid högst (antal personer − 1) betalningar och är deterministisk.
 */
export function settleDebts(balances: Balances): Transfer[] {
  const creditors: Party[] = [];
  const debtors: Party[] = [];
  for (const [id, amount] of balances) {
    if (amount > 0) creditors.push({ id, amount });
    if (amount < 0) debtors.push({ id, amount: -amount });
  }
  creditors.sort(largestFirst);
  debtors.sort(largestFirst);

  const transfers: Transfer[] = [];
  const pay = (debtor: Party, creditor: Party, amount: number) => {
    transfers.push({ from: debtor.id, to: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
  };

  for (const debtor of debtors) {
    const match = creditors.find((c) => c.amount > 0 && c.amount === debtor.amount);
    if (match) pay(debtor, match, debtor.amount);
  }

  for (;;) {
    const debtor = debtors.filter((d) => d.amount > 0).sort(largestFirst)[0];
    const creditor = creditors.filter((c) => c.amount > 0).sort(largestFirst)[0];
    if (!debtor || !creditor) break;
    pay(debtor, creditor, Math.min(debtor.amount, creditor.amount));
  }

  return transfers;
}
