import type { Ore } from './money';

export type PersonId = string;
export type ExpenseId = string;

export interface Person {
  readonly id: PersonId;
  readonly name: string;
}

export interface Expense {
  readonly id: ExpenseId;
  readonly description: string;
  /** Totalt belopp i ören. */
  readonly amount: Ore;
  readonly paidBy: PersonId;
  /** Deltagare som delar på utgiften, lika delar. */
  readonly sharedBy: readonly PersonId[];
}

export type ExpenseInput = Omit<Expense, 'id'>;

export interface Group {
  readonly name: string;
  readonly people: readonly Person[];
  readonly expenses: readonly Expense[];
}

/** En föreslagen betalning: `from` betalar `amount` till `to`. */
export interface Transfer {
  readonly from: PersonId;
  readonly to: PersonId;
  readonly amount: Ore;
}

/** Saldo per person. Positivt = ska få pengar, negativt = ska betala. */
export type Balances = ReadonlyMap<PersonId, Ore>;
