import { describe, expect, it } from 'vitest';
import { initialState, parseNames, update } from '../src/ui/state';
import type { AppState } from '../src/ui/state';

const created = (): AppState => update(initialState, { type: 'createGroup', name: 'Resa', peopleText: 'Anna\nErik, Sara' });

describe('parseNames', () => {
  it('delar på radbrytning, komma och semikolon och tar bort tomma', () => {
    expect(parseNames(' Anna \n\nErik, Sara;Leo ')).toEqual(['Anna', 'Erik', 'Sara', 'Leo']);
  });
});

describe('update', () => {
  it('skapar en grupp med deltagare', () => {
    const state = created();
    expect(state.group?.people.map((p) => p.name)).toEqual(['Anna', 'Erik', 'Sara']);
    expect(state.notice).toBeNull();
  });

  it('kräver minst två deltagare och unika namn', () => {
    expect(update(initialState, { type: 'createGroup', name: 'X', peopleText: 'Anna' }).notice?.target).toBe('create');
    expect(update(initialState, { type: 'createGroup', name: 'X', peopleText: 'Anna\nanna' }).group).toBeNull();
  });

  it('lägger till en utgift från formulärtext', () => {
    const state = created();
    const [anna, erik] = state.group!.people.map((p) => p.id) as [string, string];
    const next = update(state, {
      type: 'saveExpense',
      description: 'Middag',
      amountText: '1 200,50',
      paidBy: anna,
      sharedBy: [anna, erik],
    });
    expect(next.group?.expenses[0]?.amount).toBe(120050);
    expect(next.notice).toBeNull();
  });

  it('visar fel vid ogiltigt belopp och behåller gruppen', () => {
    const state = created();
    const anna = state.group!.people[0]!.id;
    const next = update(state, { type: 'saveExpense', description: 'Middag', amountText: 'tusen', paidBy: anna, sharedBy: [anna] });
    expect(next.notice?.target).toBe('expense');
    expect(next.group).toBe(state.group);
  });

  it('redigerar en befintlig utgift', () => {
    const s0 = created();
    const anna = s0.group!.people[0]!.id;
    const s1 = update(s0, { type: 'saveExpense', description: 'Mat', amountText: '100', paidBy: anna, sharedBy: [anna] });
    const id = s1.group!.expenses[0]!.id;
    const s2 = update(update(s1, { type: 'editExpense', id }), {
      type: 'saveExpense',
      description: 'Mat och dryck',
      amountText: '150',
      paidBy: anna,
      sharedBy: [anna],
    });
    expect(s2.group?.expenses).toHaveLength(1);
    expect(s2.group?.expenses[0]?.description).toBe('Mat och dryck');
    expect(s2.editingExpenseId).toBeNull();
  });

  it('använder standardnamn när gruppnamnet är tomt', () => {
    expect(update(initialState, { type: 'createGroup', name: '  ', peopleText: 'Anna\nErik' }).group?.name).toBe('Min grupp');
  });

  it('visar felmeddelandet på svenska', () => {
    const next = update(initialState, { type: 'createGroup', name: 'X', peopleText: 'Anna\nanna' });
    expect(next.notice?.text).toBe('anna finns redan i gruppen.');
  });

  it('frågar innan en ny grupp startas, och avbryt behåller gruppen', () => {
    const asking = update(created(), { type: 'askNewGroup' });
    expect(asking.confirmingNewGroup).toBe(true);
    expect(asking.group).not.toBeNull();
    expect(asking.focus).toBe('confirm-new-group');

    const cancelled = update(asking, { type: 'cancelNewGroup' });
    expect(cancelled.confirmingNewGroup).toBe(false);
    expect(cancelled.group).toBe(asking.group);
    expect(cancelled.focus).toBe('new-group');
  });

  it('stänger frågan om ny grupp vid annan ändring', () => {
    const asking = update(created(), { type: 'askNewGroup' });
    expect(update(asking, { type: 'addPerson', name: 'Leo' }).confirmingNewGroup).toBe(false);
  });

  it('nollställer allt vid ny grupp', () => {
    const next = update(update(created(), { type: 'askNewGroup' }), { type: 'newGroup' });
    expect(next.group).toBeNull();
    expect(next.confirmingNewGroup).toBe(false);
  });
});
