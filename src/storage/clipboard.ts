/**
 * Kopierar text till urklipp. Returnerar false om det inte gick.
 *
 * Försöker först med Clipboard API. Vissa miljöer nekar det (t.ex. inbäddade
 * webbläsare och appar med strikta behörigheter), och då används det äldre
 * `document.execCommand('copy')`, som fortfarande fungerar där.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

/** Reservväg: markerar texten i ett osynligt fält och kör webbläsarens kopiera-kommando. */
function copyWithSelection(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  const previousFocus = document.activeElement;
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
}
