type Child = Node | string | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | ((event: Event) => void);

/**
 * Skapar ett DOM-element. Text sätts alltid som textnoder, aldrig som HTML,
 * så namn och beskrivningar från en delad länk kan inte injicera kod.
 *
 * Attribut som börjar med "on" kopplas som event-lyssnare: { onclick: fn }.
 * false/null/undefined hoppas över, true blir ett tomt boolean-attribut.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: (Child | readonly Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) el.append(child);
  }
  return el;
}
