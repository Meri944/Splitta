import { describe, expect, it } from 'vitest';
import type { Group } from '../src/core/types';
import { initialState } from '../src/ui/state';
import { createStore } from '../src/ui/store';

/** Används där inga sparfel förväntas: ett oväntat fel ska synas i testet. */
const failOnError = (error: unknown) => {
  throw error;
};

const createEvent = { type: 'createGroup', name: 'Resa', peopleText: 'Anna\nErik' } as const;

/** En persist-funktion som loggar vad som sparas och kan göras långsam. */
function recordingPersist(delayMs = 0) {
  const saved: (string | null)[] = [];
  const persist = async (group: Group | null) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    saved.push(group ? group.people.map((p) => p.name).join(',') : null);
  };
  return { saved, persist };
}

describe('createStore', () => {
  it('meddelar lyssnare direkt, utan att vänta på sparning', () => {
    const { persist } = recordingPersist(50);
    const store = createStore(initialState, persist, failOnError);
    const seen: number[] = [];
    store.subscribe((state) => seen.push(state.group?.people.length ?? 0));
    store.dispatch(createEvent);
    expect(seen).toEqual([2]);
  });

  it('sparar bara när gruppen ändras', async () => {
    const { saved, persist } = recordingPersist();
    const store = createStore(initialState, persist, failOnError);
    store.dispatch(createEvent);
    store.dispatch({ type: 'editExpense', id: null }); // ändrar inte gruppen
    store.dispatch({ type: 'notify', notice: null }); // ändrar inte gruppen
    await store.flush();
    expect(saved).toEqual(['Anna,Erik']);
  });

  it('sparar i samma ordning som ändringarna, även när sparningen är långsam', async () => {
    const { saved, persist } = recordingPersist(10);
    const store = createStore(initialState, persist, failOnError);
    store.dispatch(createEvent);
    store.dispatch({ type: 'addPerson', name: 'Sara' });
    store.dispatch({ type: 'newGroup' });
    await store.flush();
    expect(saved).toEqual(['Anna,Erik', 'Anna,Erik,Sara', null]);
  });

  it('ersätter tillståndet och meddelar lyssnare', () => {
    const store = createStore(initialState, recordingPersist().persist, failOnError);
    let calls = 0;
    store.subscribe(() => calls++);
    store.dispatch(createEvent);
    store.replace(initialState);
    expect(store.getState()).toBe(initialState);
    expect(calls).toBe(2);
  });

  it('fortsätter spara efter ett fel och rapporterar felet', async () => {
    const saved: number[] = [];
    const errors: unknown[] = [];
    let calls = 0;
    const store = createStore(
      initialState,
      async (group) => {
        calls++;
        if (calls === 1) throw new Error('komprimering misslyckades');
        saved.push(group?.people.length ?? 0);
      },
      (error) => errors.push(error),
    );
    store.dispatch(createEvent); // misslyckas
    store.dispatch({ type: 'addPerson', name: 'Sara' });
    store.dispatch({ type: 'addPerson', name: 'Leo' });
    await store.flush(); // avvisas inte

    expect(errors).toHaveLength(1);
    expect(calls).toBe(3);
    expect(saved).toEqual([3, 4]);
  });
});
