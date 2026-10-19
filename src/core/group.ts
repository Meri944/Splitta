import type { Expense, ExpenseId, ExpenseInput, Group, Person, PersonId } from './types';

export const MAX_NAME_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 80;
export const MAX_AMOUNT = 100_000_000_00; // 100 miljoner kronor i ören
export const MAX_PEOPLE = 50;
export const MAX_EXPENSES = 500;
const MAX_ID_LENGTH = 8; // id:n är korta bas 36-tal, se nextId

/**
 * Varför en ändring inte gick att göra. Kärnan beskriver bara *vad* som är fel;
 * UI-lagret bestämmer hur det formuleras för användaren (se src/ui/messages.ts).
 */
export type GroupError =
  | { readonly code: 'name-empty' }
  | { readonly code: 'name-too-long'; readonly max: number }
  | { readonly code: 'name-taken'; readonly name: string }
  | { readonly code: 'description-empty' }
  | { readonly code: 'description-too-long'; readonly max: number }
  | { readonly code: 'amount-not-positive' }
  | { readonly code: 'amount-too-large' }
  | { readonly code: 'payer-missing' }
  | { readonly code: 'no-sharers' }
  | { readonly code: 'unknown-sharer' }
  | { readonly code: 'expense-missing' }
  | { readonly code: 'too-many-people'; readonly max: number }
  | { readonly code: 'too-many-expenses'; readonly max: number };

/**
 * Resultatet av en ändring som kan misslyckas. Ogiltig indata ignoreras aldrig tyst:
 * anroparen får antingen den nya gruppen eller ett fel att visa.
 */
export type GroupResult = { readonly ok: true; readonly group: Group } | { readonly ok: false; readonly error: GroupError };

/** Nästa lediga id: högsta befintliga id + 1, i bas 36 för korta länkar. */
function nextId(items: readonly { readonly id: string }[]): string {
  const max = items.reduce((m, item) => Math.max(m, Number.parseInt(item.id, 36) || 0), 0);
  return (max + 1).toString(36);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Returnerar varför namnet inte kan läggas till, eller null om det går. */
export function validatePersonName(group: Group, name: string): GroupError | null {
  const normalized = normalizeName(name);
  if (normalized === '') return { code: 'name-empty' };
  if (normalized.length > MAX_NAME_LENGTH) return { code: 'name-too-long', max: MAX_NAME_LENGTH };
  const taken = group.people.some((p) => p.name.toLowerCase() === normalized.toLowerCase());
  return taken ? { code: 'name-taken', name: normalized } : null;
}

/** Skapar en tom grupp. Ett tomt namn är tillåtet – UI-lagret väljer standardnamn. */
export function createGroup(name: string): Group {
  return { name: normalizeName(name).slice(0, MAX_NAME_LENGTH), people: [], expenses: [] };
}

export function renameGroup(group: Group, name: string): Group {
  const normalized = normalizeName(name);
  return normalized === '' ? group : { ...group, name: normalized.slice(0, MAX_NAME_LENGTH) };
}

/** Lägger till en person, eller returnerar varför det inte gick. */
export function addPerson(group: Group, name: string): GroupResult {
  if (group.people.length >= MAX_PEOPLE) return { ok: false, error: { code: 'too-many-people', max: MAX_PEOPLE } };
  const error = validatePersonName(group, name);
  if (error !== null) return { ok: false, error };
  const person: Person = { id: nextId(group.people), name: normalizeName(name) };
  return { ok: true, group: { ...group, people: [...group.people, person] } };
}

export function isPersonInvolved(group: Group, id: PersonId): boolean {
  return group.expenses.some((e) => e.paidBy === id || e.sharedBy.includes(id));
}

/** Tar bort en person som inte är med i någon utgift. Annars returneras gruppen oförändrad. */
export function removePerson(group: Group, id: PersonId): Group {
  if (isPersonInvolved(group, id)) return group;
  return { ...group, people: group.people.filter((p) => p.id !== id) };
}

/** Returnerar varför utgiften är ogiltig för gruppen, eller null om den är giltig. */
export function validateExpense(group: Group, input: ExpenseInput): GroupError | null {
  const ids = new Set(group.people.map((p) => p.id));
  const description = input.description.trim();
  if (description === '') return { code: 'description-empty' };
  if (description.length > MAX_DESCRIPTION_LENGTH) return { code: 'description-too-long', max: MAX_DESCRIPTION_LENGTH };
  if (!Number.isInteger(input.amount) || input.amount <= 0) return { code: 'amount-not-positive' };
  if (input.amount > MAX_AMOUNT) return { code: 'amount-too-large' };
  if (!ids.has(input.paidBy)) return { code: 'payer-missing' };
  if (input.sharedBy.length === 0) return { code: 'no-sharers' };
  if (!input.sharedBy.every((id) => ids.has(id))) return { code: 'unknown-sharer' };
  return null;
}

/** Sorterar och tar bort dubbletter så att samma utgift alltid delas upp likadant. */
function normalizeExpense(group: Group, input: ExpenseInput): ExpenseInput {
  const shared = new Set(input.sharedBy);
  return {
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    sharedBy: group.people.filter((p) => shared.has(p.id)).map((p) => p.id),
  };
}

/** Lägger till en utgift, eller returnerar varför det inte gick. */
export function addExpense(group: Group, input: ExpenseInput): GroupResult {
  if (group.expenses.length >= MAX_EXPENSES) return { ok: false, error: { code: 'too-many-expenses', max: MAX_EXPENSES } };
  const error = validateExpense(group, input);
  if (error !== null) return { ok: false, error };
  const expense: Expense = { id: nextId(group.expenses), ...normalizeExpense(group, input) };
  return { ok: true, group: { ...group, expenses: [...group.expenses, expense] } };
}

/** Ersätter en befintlig utgift, eller returnerar varför det inte gick. */
export function updateExpense(group: Group, id: ExpenseId, input: ExpenseInput): GroupResult {
  if (!group.expenses.some((e) => e.id === id)) return { ok: false, error: { code: 'expense-missing' } };
  const error = validateExpense(group, input);
  if (error !== null) return { ok: false, error };
  const updated = normalizeExpense(group, input);
  return {
    ok: true,
    group: { ...group, expenses: group.expenses.map((e) => (e.id === id ? { id, ...updated } : e)) },
  };
}

export function removeExpense(group: Group, id: ExpenseId): Group {
  return { ...group, expenses: group.expenses.filter((e) => e.id !== id) };
}

export function totalSpent(group: Group): number {
  return group.expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Namnet på en person i gruppen, eller undefined om id:t inte finns. */
export function personName(group: Group, id: PersonId): string | undefined {
  return group.people.find((p) => p.id === id)?.name;
}

/**
 * Kontrollerar att en grupp är giltig. Används på data från länkar, som kan vara handgjorda:
 * samma gränser som när man skapar gruppen i appen gäller, så en länk kan aldrig
 * innehålla något som appen själv inte hade kunnat skapa.
 */
export function isValidGroup(group: Group): boolean {
  const personIds = group.people.map((p) => p.id);
  const expenseIds = group.expenses.map((e) => e.id);
  const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;
  const validId = (id: string) => /^[0-9a-z]+$/.test(id) && id.length <= MAX_ID_LENGTH;
  const validName = (name: string) => normalizeName(name) !== '' && name.length <= MAX_NAME_LENGTH;

  if (group.name.length > MAX_NAME_LENGTH) return false;
  if (group.people.length > MAX_PEOPLE || group.expenses.length > MAX_EXPENSES) return false;
  if (![...personIds, ...expenseIds].every(validId)) return false;
  if (!unique(personIds) || !unique(expenseIds)) return false;
  if (!group.people.every((p) => validName(p.name))) return false;
  return group.expenses.every((e) => e.sharedBy.length <= group.people.length && validateExpense(group, e) === null);
}
