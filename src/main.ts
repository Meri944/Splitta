import './style.css';
import type { Group } from './core/types';
import { copyText } from './storage/clipboard';
import { currentUrl, decodeGroup, encodeGroup, readHash, writeHash } from './storage/url';
import type { AppState, Notice } from './ui/state';
import { initialState } from './ui/state';
import { createStore } from './ui/store';
import { render, updateShareUrl } from './ui/view';

/** Kopplar ihop lagren: länken (storage), tillståndet (store) och gränssnittet (view). */

const LINK_ERROR: Notice = {
  target: 'load',
  kind: 'error',
  text: 'Länken kunde inte läsas. Den kan vara ofullständig, kontrollera att du kopierat hela.',
};

async function loadFromHash(): Promise<AppState> {
  const hash = readHash();
  if (hash === '') return initialState;
  const group = await decodeGroup(hash);
  return group ? { ...initialState, group } : { ...initialState, notice: LINK_ERROR };
}

async function saveToHash(group: Group | null): Promise<void> {
  writeHash(group ? await encodeGroup(group) : '');
  updateShareUrl(currentUrl());
}

async function start(root: HTMLElement): Promise<void> {
  const store = createStore(await loadFromHash(), saveToHash);

  const copyLink = async () => {
    await store.flush(); // så att den senaste versionen av länken kopieras
    const ok = await copyText(currentUrl());
    store.dispatch({
      type: 'notify',
      notice: ok
        ? { target: 'share', kind: 'info', text: 'Länken är kopierad.' }
        : { target: 'share', kind: 'error', text: 'Kunde inte kopiera. Markera länken och kopiera den själv.' },
    });
  };

  const draw = (state: AppState) =>
    render(root, { state, dispatch: store.dispatch, shareUrl: currentUrl(), onCopyLink: () => void copyLink() });

  store.subscribe(draw);

  // Om någon klistrar in en annan grupplänk i samma flik.
  window.addEventListener('hashchange', () => {
    void store.flush().then(loadFromHash).then(store.replace);
  });

  draw(store.getState());
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
