import {
  addExpense,
  addPerson,
  createGroup,
  removeExpense,
  removePerson,
  renameGroup,
  updateExpense,
  validateExpense,
  validatePersonName,
} from '../core/group';
import { parseAmount } from '../core/money';
import type { ExpenseId, ExpenseInput, Group, PersonId } from '../core/types';

export type NoticeTarget = 'create' | 'person' | 'expense' | 'share' | 'load';

export interface Notice {
  readonly target: NoticeTarget;
  readonly kind: 'error' | 'info';
  readonly text: string;
}

export interface AppState {
  readonly group: Group | null;
  readonly editingExpenseId: ExpenseId | null;
  readonly notice: Notice | null;
  /** Id på ett element som ska få fokus efter nästa rendering. */
  readonly focus: string | null;
}

export type AppEvent =
  | { readonly type: 'createGroup'; readonly name: string; readonly peopleText: string }
  | { readonly type: 'renameGroup'; readonly name: string }
  | { readonly type: 'addPerson'; readonly name: string }
  | { readonly type: 'removePerson'; readonly id: PersonId }
  | {
      readonly type: 'saveExpense';
      readonly description: string;
      readonly amountText: string;
      readonly paidBy: PersonId;
      readonly sharedBy: readonly PersonId[];
    }
  | { readonly type: 'editExpense'; readonly id: ExpenseId | null }
  | { readonly type: 'removeExpense'; readonly id: ExpenseId }
  | { readonly type: 'newGroup' }
  | { readonly type: 'notify'; readonly notice: Notice | null };

export const initialState: AppState = { group: null, editingExpenseId: null, notice: null, focus: null };

const error = (target: NoticeTarget, text: string): Notice => ({ target, kind: 'error', text });

/** Delar upp "Anna, Erik\nSara" i namn. */
export function parseNames(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

function handleCreate(name: string, peopleText: string): AppState {
  const names = parseNames(peopleText);
  if (names.length < 2) {
    return { ...initialState, notice: error('create', 'Skriv minst två namn, ett per rad.') };
  }
  let group = createGroup(name);
  for (const person of names) {
    const problem = validatePersonName(group, person);
    if (problem) return { ...initialState, notice: error('create', problem) };
    group = addPerson(group, person);
  }
  return { ...initialState, group, focus: 'expense-description' };
}

function handleSaveExpense(state: AppState, group: Group, event: Extract<AppEvent, { type: 'saveExpense' }>): AppState {
  const amount = parseAmount(event.amountText);
  if (amount === null) {
    return { ...state, notice: error('expense', 'Skriv beloppet i kronor, till exempel 249 eller 249,50.'), focus: 'expense-amount' };
  }
  const input: ExpenseInput = {
    description: event.description,
    amount,
    paidBy: event.paidBy,
    sharedBy: event.sharedBy,
  };
  const problem = validateExpense(group, input);
  if (problem) return { ...state, notice: error('expense', problem) };

  const next = state.editingExpenseId
    ? updateExpense(group, state.editingExpenseId, input)
    : addExpense(group, input);
  return { group: next, editingExpenseId: null, notice: null, focus: 'expense-description' };
}

/** Ren funktion: räknar ut nästa tillstånd från ett tillstånd och en händelse. */
export function update(state: AppState, event: AppEvent): AppState {
  const base: AppState = { ...state, notice: null, focus: null };

  if (event.type === 'createGroup') return handleCreate(event.name, event.peopleText);
  if (event.type === 'newGroup') return { ...initialState, focus: 'group-name' };
  if (event.type === 'notify') return { ...state, notice: event.notice, focus: null };

  const group = state.group;
  if (!group) return base;

  switch (event.type) {
    case 'renameGroup':
      return { ...base, group: renameGroup(group, event.name) };
    case 'addPerson': {
      const problem = validatePersonName(group, event.name);
      if (problem) return { ...base, notice: error('person', problem), focus: 'person-name' };
      return { ...base, group: addPerson(group, event.name), focus: 'person-name' };
    }
    case 'removePerson':
      return { ...base, group: removePerson(group, event.id) };
    case 'saveExpense':
      return handleSaveExpense(base, group, event);
    case 'editExpense':
      return { ...base, editingExpenseId: event.id, focus: 'expense-description' };
    case 'removeExpense':
      return {
        ...base,
        group: removeExpense(group, event.id),
        editingExpenseId: state.editingExpenseId === event.id ? null : state.editingExpenseId,
      };
  }
}
