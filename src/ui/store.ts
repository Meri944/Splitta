import type { Group } from '../core/types';
import type { AppEvent, AppState } from './state';
import { update } from './state';

export type Persist = (group: Group | null) => Promise<void>;
export type Listener = (state: AppState) => void;
export type PersistErrorHandler = (error: unknown) => void;

export interface Store {
  getState(): AppState;
  dispatch(event: AppEvent): void;
  /** Ersätter hela tillståndet, t.ex. när en annan grupplänk öppnas. */
  replace(state: AppState): void;
  subscribe(listener: Listener): void;
  /** Väntar tills alla pågående sparningar är klara. */
  flush(): Promise<void>;
}

/**
 * Håller appens tillstånd. Lyssnare anropas direkt vid varje ändring,
 * så att gränssnittet aldrig väntar på att gruppen sparas.
 * Sparningar körs i en kö, i samma ordning som ändringarna, och bara när gruppen ändrats.
 *
 * Ett fel i en sparning stoppar aldrig kön: felet rapporteras till onPersistError och
 * nästa ändring sparas som vanligt. Eftersom hela gruppen sparas varje gång räcker en
 * lyckad sparning för att länken ska vara aktuell igen.
 */
export function createStore(initial: AppState, persist: Persist, onPersistError: PersistErrorHandler): Store {
  let state = initial;
  let queue: Promise<void> = Promise.resolve();
  const listeners: Listener[] = [];

  const notify = () => listeners.forEach((listener) => listener(state));

  return {
    getState: () => state,
    dispatch(event) {
      const previous = state;
      state = update(state, event);
      notify();
      if (state.group === previous.group) return;
      const group = state.group;
      queue = queue.then(() => persist(group)).catch(onPersistError);
    },
    replace(next) {
      state = next;
      notify();
    },
    subscribe(listener) {
      listeners.push(listener);
    },
    flush: () => queue,
  };
}
