import { formatAmount, splitEvenly } from './core/money';

// Tillfällig startpunkt: visar att kärnlogiken är inkopplad.
// Ersätts av UI-lagret i src/ui/ när MVP byggs.
function renderDemo(root: HTMLElement): void {
  const example = document.createElement('p');
  const parts = splitEvenly(100000, 3).map(formatAmount).join(' + ');
  example.textContent = `Exempel: 1 000 kr delat på tre = ${parts}`;
  root.append(example);
}

const root = document.querySelector<HTMLElement>('#app');
if (root) renderDemo(root);
