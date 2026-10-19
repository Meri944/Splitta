import type { Expense, ExpenseId, ExpenseInput, Group, Person, PersonId } from './types';

export const MAX_NAME_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 80;
export const MAX_AMOUNT = 100_000_000_00; // 100 miljoner kronor i ören

/**
 * Resultatet av en ändring som kan misslyckas. Ogiltig indata ignoreras aldrig tyst:
 * anroparen får antingen den nya gruppen eller ett felmeddelande att visa.
 */
export type GroupResult = { readonly ok: true; readonly group: Group } | { readonly ok: false; readonly error: string };

/** Nästa lediga id: högsta befintliga id + 1, i bas 36 för korta länkar. */
function nextId(items: readonly { readonly id: string }[]): string {
  const max = items.reduce((m, item) => Math.max(m, Number.parseInt(item.id, 36) || 0), 0);
  return (max + 1).toString(36);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Returnerar ett felmeddelande, eller null om namnet kan läggas till i gruppen. */
export function validatePersonName(group: Group, name: string): string | null {
  const normalized = normalizeName(name);
  if (normalized === '') return 'Skriv ett namn.';
  if (normalized.length > MAX_NAME_LENGTH) return `Namnet får vara högst ${MAX_NAME_LENGTH} tecken.`;
  const taken = group.people.some((p) => p.name.toLowerCase() === normalized.toLowerCase());
  return taken ? `${normalized} finns redan i gruppen.` : null;
}

export function createGroup(name: string): Group {
  return { name: normalizeName(name) || 'Min grupp', people: [], expenses: [] };
}

export function renameGroup(group: Group, name: string): Group {
  const normalized = normalizeName(name);
  return normalized === '' ? group : { ...group, name: normalized.slice(0, MAX_NAME_LENGTH) };
}

/** Lägger till en person, eller returnerar varför det inte gick. */
export function addPerson(group: Group, name: string): GroupResult {
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

/** Returnerar ett felmeddelande, eller null om utgiften är giltig för gruppen. */
export function validateExpense(group: Group, input: ExpenseInput): string | null {
  const ids = new Set(group.people.map((p) => p.id));
  if (input.description.trim() === '') return 'Skriv vad utgiften gällde.';
  if (input.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return `Beskrivningen får vara högst ${MAX_DESCRIPTION_LENGTH} tecken.`;
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Beloppet måste vara större än 0 kr.';
  if (input.amount > MAX_AMOUNT) return 'Beloppet är för stort.';
  if (!ids.has(input.paidBy)) return 'Välj vem som betalade.';
  if (input.sharedBy.length === 0) return 'Välj minst en person som delar på utgiften.';
  if (!input.sharedBy.every((id) => ids.has(id))) return 'Någon av deltagarna finns inte i gruppen.';
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
  const error = validateExpense(group, input);
  if (error !== null) return { ok: false, error };
  const expense: Expense = { id: nextId(group.expenses), ...normalizeExpense(group, input) };
  return { ok: true, group: { ...group, expenses: [...group.expenses, expense] } };
}

/** Ersätter en befintlig utgift, eller returnerar varför det inte gick. */
export function updateExpense(group: Group, id: ExpenseId, input: ExpenseInput): GroupResult {
  if (!group.expenses.some((e) => e.id === id)) return { ok: false, error: 'Utgiften finns inte längre.' };
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

export function personName(group: Group, id: PersonId): string {
  return group.people.find((p) => p.id === id)?.name ?? 'Okänd';
}

/** Kontrollerar att en grupp (t.ex. inläst från en länk) är internt konsistent. */
export function isValidGroup(group: Group): boolean {
  const personIds = group.people.map((p) => p.id);
  const expenseIds = group.expenses.map((e) => e.id);
  const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;
  if (!unique(personIds) || !unique(expenseIds)) return false;
  if (group.people.some((p) => normalizeName(p.name) === '')) return false;
  return group.expenses.every((e) => validateExpense(group, e) === null);
}
