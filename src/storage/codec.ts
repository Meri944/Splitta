import { isValidGroup } from '../core/group';
import type { Expense, Group, Person } from '../core/types';

/**
 * Kompakt JSON-format för en grupp i en delningslänk (version 1).
 * Korta nycklar och arrayer i stället för objekt håller länkarna korta.
 *
 *   { v: 1, n: namn, p: [[id, namn]], e: [[id, beskrivning, belopp, betalare, [deltagare]]] }
 *
 * Ändra aldrig detta format bakåtinkompatibelt – skapa i stället version 2
 * och behåll avkodningen av version 1, så att gamla länkar fortsätter fungera.
 */
export const FORMAT_VERSION = 1;

type CompactPerson = [id: string, name: string];
type CompactExpense = [id: string, description: string, amount: number, paidBy: string, sharedBy: string[]];

interface CompactGroupV1 {
  v: 1;
  n: string;
  p: CompactPerson[];
  e: CompactExpense[];
}

export function toCompact(group: Group): CompactGroupV1 {
  return {
    v: FORMAT_VERSION,
    n: group.name,
    p: group.people.map((p) => [p.id, p.name]),
    e: group.expenses.map((e) => [e.id, e.description, e.amount, e.paidBy, [...e.sharedBy]]),
  };
}

const isString = (x: unknown): x is string => typeof x === 'string';

function parsePerson(raw: unknown): Person | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const [id, name] = raw as unknown[];
  return isString(id) && isString(name) ? { id, name } : null;
}

function parseExpense(raw: unknown): Expense | null {
  if (!Array.isArray(raw) || raw.length !== 5) return null;
  const [id, description, amount, paidBy, sharedBy] = raw as unknown[];
  if (!isString(id) || !isString(description) || !isString(paidBy)) return null;
  if (typeof amount !== 'number' || !Array.isArray(sharedBy) || !sharedBy.every(isString)) return null;
  return { id, description, amount, paidBy, sharedBy };
}

/** Tolkar okänd indata (t.ex. JSON från en länk) till en giltig grupp, eller null. */
export function fromCompact(raw: unknown): Group | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { v, n, p, e } = raw as Record<string, unknown>;
  if (v !== 1 || !isString(n) || !Array.isArray(p) || !Array.isArray(e)) return null;

  const people = p.map(parsePerson);
  const expenses = e.map(parseExpense);
  if (people.includes(null) || expenses.includes(null)) return null;

  const group: Group = { name: n, people: people as Person[], expenses: expenses as Expense[] };
  return isValidGroup(group) ? group : null;
}
