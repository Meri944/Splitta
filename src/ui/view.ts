import { computeBalances } from '../core/balance';
import { isPersonInvolved, personName, totalSpent } from '../core/group';
import { formatAmount, formatAmountForInput, formatSignedAmount } from '../core/money';
import { settleDebts } from '../core/settle';
import type { Expense, Group, Person } from '../core/types';
import { h } from './dom';
import type { AppEvent, AppState, Notice, NoticeTarget } from './state';

export type Dispatch = (event: AppEvent) => void;

export interface ViewContext {
  readonly state: AppState;
  readonly dispatch: Dispatch;
  readonly shareUrl: string;
  readonly onCopyLink: () => void;
}

const formValue = (form: HTMLFormElement, name: string): string => {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
};

function noticeFor(notice: Notice | null, target: NoticeTarget): HTMLElement | null {
  if (!notice || notice.target !== target) return null;
  return h('p', { class: `notice notice-${notice.kind}`, role: notice.kind === 'error' ? 'alert' : 'status' }, notice.text);
}

/* ---------- Startsidan ---------- */

function renderStart({ state, dispatch }: ViewContext): HTMLElement {
  const onsubmit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    dispatch({ type: 'createGroup', name: formValue(form, 'name'), peopleText: formValue(form, 'people') });
  };

  return h(
    'div',
    { class: 'start' },
    h('h1', { class: 'wordmark' }, 'Splitta'),
    h(
      'p',
      { class: 'lead' },
      'Lägg in vem som betalade vad. Splitta räknar ut vem som ska swisha vem, med så få betalningar som möjligt.',
    ),
    h(
      'form',
      { class: 'panel stack', onsubmit, novalidate: true },
      noticeFor(state.notice, 'load'),
      h('label', { for: 'group-name' }, 'Vad ska ni dela på?'),
      h('input', { id: 'group-name', name: 'name', type: 'text', placeholder: 'Fjällresan', maxlength: 40, autocomplete: 'off' }),
      h('label', { for: 'group-people' }, 'Vilka är med?'),
      h('textarea', {
        id: 'group-people',
        name: 'people',
        rows: 4,
        placeholder: 'Anna\nErik\nSara',
        'aria-describedby': 'group-people-hint',
      }),
      h('p', { id: 'group-people-hint', class: 'hint' }, 'Ett namn per rad. Du kan lägga till fler senare.'),
      noticeFor(state.notice, 'create'),
      h('button', { type: 'submit', class: 'button primary' }, 'Skapa grupp'),
    ),
    h(
      'p',
      { class: 'hint center' },
      'Ingen inloggning. Gruppen sparas i länken, inte på någon server.',
    ),
  );
}

/* ---------- Deltagare ---------- */

function renderPeople({ state, dispatch }: ViewContext, group: Group): HTMLElement {
  const onsubmit = (event: Event) => {
    event.preventDefault();
    dispatch({ type: 'addPerson', name: formValue(event.currentTarget as HTMLFormElement, 'name') });
  };

  const chip = (person: Person) => {
    const involved = isPersonInvolved(group, person.id);
    return h(
      'li',
      { class: 'chip' },
      h('span', {}, person.name),
      h(
        'button',
        {
          type: 'button',
          class: 'chip-remove',
          disabled: involved,
          title: involved ? `${person.name} är med i en utgift och kan inte tas bort` : `Ta bort ${person.name}`,
          'aria-label': `Ta bort ${person.name}`,
          onclick: () => dispatch({ type: 'removePerson', id: person.id }),
        },
        '×',
      ),
    );
  };

  return h(
    'section',
    { class: 'section', 'aria-labelledby': 'people-heading' },
    h('h2', { id: 'people-heading' }, 'Deltagare'),
    h('ul', { class: 'chips' }, group.people.map(chip)),
    h(
      'form',
      { class: 'inline-form', onsubmit, novalidate: true },
      h('label', { for: 'person-name', class: 'visually-hidden' }, 'Namn på ny deltagare'),
      h('input', { id: 'person-name', name: 'name', type: 'text', placeholder: 'Lägg till person', maxlength: 40, autocomplete: 'off' }),
      h('button', { type: 'submit', class: 'button' }, 'Lägg till'),
    ),
    noticeFor(state.notice, 'person'),
  );
}

/* ---------- Utgifter ---------- */

function renderExpenseForm({ state, dispatch }: ViewContext, group: Group): HTMLElement {
  const editing = group.expenses.find((e) => e.id === state.editingExpenseId) ?? null;
  const sharedBy = new Set(editing ? editing.sharedBy : group.people.map((p) => p.id));

  const onsubmit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    dispatch({
      type: 'saveExpense',
      description: formValue(form, 'description'),
      amountText: formValue(form, 'amount'),
      paidBy: formValue(form, 'paidBy'),
      sharedBy: data.getAll('sharedBy').filter((v): v is string => typeof v === 'string'),
    });
  };

  const amountValue = editing ? formatAmountForInput(editing.amount) : '';

  return h(
    'form',
    { class: 'panel stack', onsubmit, novalidate: true, 'aria-labelledby': 'expense-form-heading' },
    h('h3', { id: 'expense-form-heading' }, editing ? 'Ändra utgift' : 'Ny utgift'),
    h(
      'div',
      { class: 'row' },
      h(
        'div',
        { class: 'field grow' },
        h('label', { for: 'expense-description' }, 'Vad'),
        h('input', {
          id: 'expense-description',
          name: 'description',
          type: 'text',
          placeholder: 'Middag på Bistro',
          maxlength: 80,
          autocomplete: 'off',
          value: editing?.description,
        }),
      ),
      h(
        'div',
        { class: 'field amount-field' },
        h('label', { for: 'expense-amount' }, 'Belopp'),
        h(
          'div',
          { class: 'with-suffix' },
          h('input', {
            id: 'expense-amount',
            name: 'amount',
            type: 'text',
            inputmode: 'decimal',
            placeholder: '0',
            autocomplete: 'off',
            value: amountValue || undefined,
          }),
          h('span', { 'aria-hidden': 'true' }, 'kr'),
        ),
      ),
    ),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'expense-paid-by' }, 'Betalades av'),
      h(
        'select',
        { id: 'expense-paid-by', name: 'paidBy' },
        group.people.map((p, i) =>
          h('option', { value: p.id, selected: editing ? editing.paidBy === p.id : i === 0 }, p.name),
        ),
      ),
    ),
    h(
      'fieldset',
      { class: 'field' },
      h('legend', {}, 'Delas av'),
      h(
        'div',
        { class: 'checks' },
        group.people.map((p) =>
          h(
            'label',
            { class: 'check' },
            h('input', { type: 'checkbox', name: 'sharedBy', value: p.id, checked: sharedBy.has(p.id) }),
            h('span', {}, p.name),
          ),
        ),
      ),
    ),
    noticeFor(state.notice, 'expense'),
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'submit', class: 'button primary' }, editing ? 'Spara ändringar' : 'Lägg till utgift'),
      editing &&
        h('button', { type: 'button', class: 'button ghost', onclick: () => dispatch({ type: 'editExpense', id: null }) }, 'Avbryt'),
    ),
  );
}

function describeSharing(group: Group, expense: Expense): string {
  if (expense.sharedBy.length === group.people.length && group.people.length > 1) return 'delas av alla';
  const names = expense.sharedBy.map((id) => personName(group, id));
  if (names.length === 1) return `för ${names[0]}`;
  return `delas av ${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`;
}

function renderExpenses(context: ViewContext, group: Group): HTMLElement {
  const { dispatch, state } = context;

  const item = (expense: Expense) =>
    h(
      'li',
      { class: `expense${state.editingExpenseId === expense.id ? ' is-editing' : ''}` },
      h(
        'div',
        { class: 'expense-main' },
        h('span', { class: 'expense-title' }, expense.description),
        h('span', { class: 'expense-meta' }, `${personName(group, expense.paidBy)} betalade, ${describeSharing(group, expense)}`),
      ),
      h('span', { class: 'amount' }, formatAmount(expense.amount)),
      h(
        'div',
        { class: 'expense-actions' },
        h(
          'button',
          {
            type: 'button',
            class: 'link-button',
            'aria-label': `Ändra ${expense.description}`,
            onclick: () => dispatch({ type: 'editExpense', id: expense.id }),
          },
          'Ändra',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'link-button danger',
            'aria-label': `Ta bort ${expense.description}`,
            onclick: () => dispatch({ type: 'removeExpense', id: expense.id }),
          },
          'Ta bort',
        ),
      ),
    );

  return h(
    'section',
    { class: 'section', 'aria-labelledby': 'expenses-heading' },
    h('h2', { id: 'expenses-heading' }, 'Utgifter'),
    renderExpenseForm(context, group),
    group.expenses.length === 0
      ? h('p', { class: 'empty' }, 'Inga utgifter än. Lägg till den första ovan.')
      : h('ul', { class: 'expenses' }, [...group.expenses].reverse().map(item)),
  );
}

/* ---------- Kvittot ---------- */

function renderReceipt(context: ViewContext, group: Group): HTMLElement {
  const balances = computeBalances(group);
  const transfers = settleDebts(balances);
  const hasExpenses = group.expenses.length > 0;

  const settlement = !hasExpenses
    ? h('p', { class: 'receipt-empty' }, 'Här dyker det upp vem som ska betala vem.')
    : transfers.length === 0
      ? h('p', { class: 'receipt-empty' }, 'Alla är kvitt.')
      : h(
          'ol',
          { class: 'transfers' },
          transfers.map((t) =>
            h(
              'li',
              {},
              h(
                'span',
                { class: 'transfer-names' },
                h('strong', {}, personName(group, t.from)),
                h('span', { class: 'transfer-verb' }, ' swishar '),
                h('strong', {}, personName(group, t.to)),
              ),
              h('span', { class: 'amount' }, formatAmount(t.amount)),
            ),
          ),
        );

  const balanceRow = (person: Person) => {
    const amount = balances.get(person.id) ?? 0;
    const tone = amount > 0 ? 'plus' : amount < 0 ? 'minus' : 'zero';
    return h(
      'div',
      { class: 'balance' },
      h('dt', {}, person.name),
      h('dd', { class: `amount ${tone}` }, formatSignedAmount(amount)),
    );
  };

  return h(
    'aside',
    { class: 'receipt', 'aria-labelledby': 'receipt-heading' },
    h(
      'div',
      { class: 'receipt-paper' },
      h('h2', { id: 'receipt-heading' }, 'Så blir ni kvitt'),
      settlement,
      hasExpenses &&
        h(
          'div',
          { class: 'receipt-section' },
          h('h3', {}, 'Saldo'),
          h('dl', { class: 'balances' }, group.people.map(balanceRow)),
          h('p', { class: 'total' }, h('span', {}, 'Totalt'), h('span', { class: 'amount' }, formatAmount(totalSpent(group)))),
        ),
    ),
    renderShare(context),
  );
}

function renderShare({ state, shareUrl, onCopyLink }: ViewContext): HTMLElement {
  return h(
    'div',
    { class: 'share stack' },
    h('h3', {}, 'Dela gruppen'),
    h(
      'p',
      { class: 'hint' },
      'Hela gruppen finns i länken. Skicka den till de andra och spara den själv, utan länken går gruppen inte att hitta igen.',
    ),
    h(
      'div',
      { class: 'inline-form' },
      h('label', { for: 'share-url', class: 'visually-hidden' }, 'Länk till gruppen'),
      h('input', { id: 'share-url', type: 'text', readonly: true, value: shareUrl, onfocus: (e: Event) => (e.target as HTMLInputElement).select() }),
      h('button', { type: 'button', class: 'button primary', onclick: onCopyLink }, 'Kopiera länk'),
    ),
    noticeFor(state.notice, 'share'),
  );
}

/* ---------- Gruppvyn ---------- */

function renderGroup(context: ViewContext, group: Group): HTMLElement {
  const { dispatch } = context;

  const onNewGroup = () => {
    const ok = window.confirm('Starta en ny grupp? Spara länken till den här gruppen först om du vill komma tillbaka till den.');
    if (ok) dispatch({ type: 'newGroup' });
  };

  const onRename = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value.trim() !== group.name) dispatch({ type: 'renameGroup', name: input.value });
  };

  return h(
    'div',
    { class: 'group' },
    h(
      'header',
      { class: 'group-header' },
      h('span', { class: 'wordmark small' }, 'Splitta'),
      h('button', { type: 'button', class: 'link-button', onclick: onNewGroup }, 'Ny grupp'),
    ),
    h('label', { for: 'group-title', class: 'visually-hidden' }, 'Gruppens namn'),
    h('input', {
      id: 'group-title',
      class: 'group-title',
      type: 'text',
      value: group.name,
      maxlength: 40,
      autocomplete: 'off',
      onchange: onRename,
    }),
    h(
      'div',
      { class: 'layout' },
      h('div', { class: 'main-column' }, renderPeople(context, group), renderExpenses(context, group)),
      renderReceipt(context, group),
    ),
  );
}

/** Uppdaterar länken i delningsfältet utan att rendera om, t.ex. när en sparning blivit klar. */
export function updateShareUrl(url: string): void {
  const input = document.getElementById('share-url');
  if (input instanceof HTMLInputElement) input.value = url;
}

export function render(root: HTMLElement, context: ViewContext): void {
  const { group } = context.state;
  root.replaceChildren(group ? renderGroup(context, group) : renderStart(context));

  const focusId = context.state.focus;
  if (focusId) document.getElementById(focusId)?.focus();
}
