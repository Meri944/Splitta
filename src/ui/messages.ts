import type { GroupError } from '../core/group';

/** Standardnamn när användaren inte skriver något gruppnamn. */
export const DEFAULT_GROUP_NAME = 'Min grupp';

/** Visas när en person som inte längre finns i gruppen refereras. */
export const UNKNOWN_PERSON = 'Okänd';

/**
 * Översätter ett fel från kärnan till en svensk text för användaren.
 * `switch` är uttömmande: lägger man till en ny felkod i kärnan
 * slutar typkontrollen fungera tills den har en text här.
 */
export function errorMessage(error: GroupError): string {
  switch (error.code) {
    case 'name-empty':
      return 'Skriv ett namn.';
    case 'name-too-long':
      return `Namnet får vara högst ${error.max} tecken.`;
    case 'name-taken':
      return `${error.name} finns redan i gruppen.`;
    case 'description-empty':
      return 'Skriv vad utgiften gällde.';
    case 'description-too-long':
      return `Beskrivningen får vara högst ${error.max} tecken.`;
    case 'amount-not-positive':
      return 'Beloppet måste vara större än 0 kr.';
    case 'amount-too-large':
      return 'Beloppet är för stort.';
    case 'payer-missing':
      return 'Välj vem som betalade.';
    case 'no-sharers':
      return 'Välj minst en person som delar på utgiften.';
    case 'unknown-sharer':
      return 'Någon av deltagarna finns inte i gruppen.';
    case 'expense-missing':
      return 'Utgiften finns inte längre.';
  }
}
