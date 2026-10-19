import './style.css';
import type { AppEvent, AppState } from './ui/state';
import { initialState, update } from './ui/state';
import { render } from './ui/view';
import { currentUrl, decodeGroup, encodeGroup, readHash, writeHash } from './storage/url';

/**
 * Kopplar ihop lagren: läser gruppen från länken, renderar,
 * och skriver tillbaka gruppen till länken efter varje ändring.
 */
async function loadFromHash(): Promise<AppState> {
  const hash = readHash();
  if (hash === '') return initialState;
  const group = await decodeGroup(hash);
  if (group) return { ...initialState, group };
  return {
    ...initialState,
    notice: { target: 'load', kind: 'error', text: 'Länken kunde inte läsas. Den kan vara ofullständig, kontrollera att du kopierat hela.' },
  };
}

async function persist(state: AppState): Promise<void> {
  writeHash(state.group ? await encodeGroup(state.group) : '');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function start(root: HTMLElement): Promise<void> {
  let state = await loadFromHash();
  let queue = Promise.resolve();

  const draw = () =>
    render(root, {
      state,
      dispatch,
      shareUrl: currentUrl(),
      onCopyLink: () => {
        // Vänta in eventuell pågående skrivning så att den senaste länken kopieras.
        void queue.then(() => copyToClipboard(currentUrl())).then((ok) =>
          dispatch({
            type: 'notify',
            notice: ok
              ? { target: 'share', kind: 'info', text: 'Länken är kopierad.' }
              : { target: 'share', kind: 'error', text: 'Kunde inte kopiera. Markera länken och kopiera den själv.' },
          }),
        );
      },
    });

  // Rendera direkt så att gränssnittet aldrig väntar på komprimeringen.
  // Länken skrivs efteråt, i en kö så att den alltid speglar den senaste ändringen.
  function dispatch(event: AppEvent): void {
    const previous = state;
    state = update(state, event);
    draw();
    if (state.group === previous.group) return;
    const snapshot = state;
    queue = queue.then(async () => {
      await persist(snapshot);
      const shareInput = document.getElementById('share-url');
      if (shareInput instanceof HTMLInputElement) shareInput.value = currentUrl();
    });
  }

  // Om någon klistrar in en annan grupplänk i samma flik.
  window.addEventListener('hashchange', () => {
    queue = queue.then(async () => {
      state = await loadFromHash();
      draw();
    });
  });

  draw();
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
