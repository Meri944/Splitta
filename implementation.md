# Hemuppgift 2, del A: Implementation med plan

Refaktorering av Splitta enligt flödet *analys → plan → granskning → ett steg i taget → verifiering*.
Inget beteende ska ändras – målet är att minska teknisk skuld.

## 1. Vad identifierade agenten?

Agenten fick först bara analysera kodbasen mot `CLAUDE.md`, utan att föreslå lösningar. Den hittade åtta punkter:

| # | Fynd | Var |
|---|---|---|
| 1 | **Dubbel validering som misslyckas tyst.** `addPerson`/`addExpense`/`updateExpense` validerar internt och returnerar gruppen oförändrad vid fel, samtidigt som UI-lagret validerar samma sak innan. Två källor till sanning – om de glider isär försvinner ändringar utan felmeddelande. | `src/core/group.ts`, `src/ui/state.ts` |
| 2 | **Svenska användartexter i kärnlagret** (felmeddelanden, `'Okänd'`). Bryter mot principen att kärnan är ren logik. | `src/core/group.ts` |
| 3 | **Inkonsekventa längdregler och ingen gräns på data från länken.** En handgjord länk kan innehålla obegränsat långa namn och obegränsat antal personer/utgifter. | `src/core/group.ts` (`isValidGroup`) |
| 4 | **Skör koppling till formatering.** UI:t tog fram redigeringsvärdet genom att skala bort `" kr"` från `formatAmount` med regex, och byggde eget minustecken för saldon. | `src/ui/view.ts` |
| 5 | **`view.ts` är stor** (~300 rader) och växer med varje funktion. | `src/ui/view.ts` |
| 6 | **`main.ts` gör mer än att koppla ihop lagren** – kö för sparning, urklipp, DOM-uppdatering. | `src/main.ts` |
| 7 | **Algoritmen lovar mer än den håller.** Girig skuldreglering ger högst n−1 betalningar men inte alltid exakt minimum (NP-svårt). | `src/core/settle.ts`, `README.md` |
| 8 | **Icke-reproducerbara byggen** – ingen `package-lock.json`, CI kör `npm install`. | `package.json`, CI |

## 2. Planen och vad jag stoppade

Agenten tog fram en plan för punkt 1, 4 och 6, i ordningen 4 → 1 → 6 (minsta ändringen först).
Varje steg verifierades innan nästa påbörjades.

**Stoppat eller flyttat, och varför:**

- **Punkt 5 – dela upp `view.ts`: stoppad.** För tidigt. Filen är fortfarande läsbar, och en uppdelning nu ger mest flyttad kod och en stor diff utan verklig vinst. Görs när filen faktiskt blir svår att arbeta i.
- **Punkt 7 – algoritmens löfte: stoppad som eget steg.** Bara en textändring, behöver ingen plan.
- **Punkt 8 – lockfil: stoppad.** Rätt i sak, men lockfilen måste genereras med `npm install` lokalt. Görs separat.
- **Punkt 2 och 3: flyttade till del B.** Punkt 2 är ett rent brott mot arkitekturprinciperna och punkt 3 är saknad inputvalidering av opålitlig data – de hör hemma i arkitektur- respektive säkerhetsgranskningen.
- **Direkt push till `main`: stoppad.** `CLAUDE.md` säger att agenten inte ska pusha till `main` utan att fråga. Ändringarna ligger därför på grenen `refactor/del-a` med en pull request.

## 3. Genomförande

| Steg | Ändring | Filer |
|---|---|---|
| 1 | `formatAmountForInput` och `formatSignedAmount` i kärnan; UI:t använder dem i stället för regex och eget tecken. Nya tester, bl.a. att `parseAmount(formatAmountForInput(x)) === x`. | `src/core/money.ts`, `src/ui/view.ts`, `tests/money.test.ts` |
| 2 | `addPerson`, `addExpense` och `updateExpense` returnerar `{ ok: true, group }` eller `{ ok: false, error }`. UI-lagret använder resultatet direkt och anropar inte längre `validate*`. `updateExpense` ger fel för en utgift som inte finns (misslyckades tidigare tyst). | `src/core/group.ts`, `src/ui/state.ts`, `tests/group.test.ts` |
| 3 | Ny `createStore` med kö för sparning (testbar utan webbläsare), urklipp flyttat till I/O-lagret. `main.ts` kopplar nu bara ihop länk, tillstånd och vy. | `src/ui/store.ts`, `src/storage/clipboard.ts`, `src/main.ts`, `src/ui/view.ts`, `tests/store.test.ts` |

Befintliga tester ändrades bara där funktionernas returtyp ändrades; inga påståenden togs bort.

## 4. Verifiering efter varje steg

Samma kontroll kördes efter varje steg, och webbläsartestets utdata jämfördes rad för rad med en körning av koden **före** ändringarna:

1. **Enhetstester** – 48 före, 51 efter steg 1, 52 efter steg 2, 56 efter steg 3. Alla passerar.
2. **Typkontroll** med `tsc` (strict) – ren efter varje steg.
3. **Bygge** – lyckas efter varje steg.
4. **Webbläsartest** (Playwright, headless Chromium): skapa grupp med valideringsfel, tre utgifter med ojämna belopp, kontrollera betalningar och saldon (Erik −999,67 kr, Sara −1 600,16 kr, totalt 6 300,50 kr), lägga till/ta bort person, redigera utgift, kopiera länk, öppna delad länk i ny flik, trasig länk, byta gruppnamn, mobilbredd i mörkt läge, HTML i namn renderas som text, inga konsolfel. **Resultat: identiskt med före ändringarna efter alla tre stegen.**
5. **Extra test efter steg 3** – att klistra in en annan grupplänk i samma flik (`hashchange`), eftersom den logiken skrevs om och inte täcktes av webbläsartestet.

## 5. Vad missade agenten?

- **Samma mönster finns kvar på två ställen.** `removePerson` och `renameGroup` ignorerar fortfarande ogiltiga anrop tyst – precis det problem som punkt 1 handlade om. Analysen pekade bara ut `add*`/`update*`. Det är mindre allvarligt här (knappen för att ta bort är inaktiverad och tomt namn ska ignoreras), men det borde ha nämnts.
- **`updateExpense` med okänt id** misslyckades tyst. Det upptäcktes först under implementationen, inte i analysen.
- **Testlucka:** webbläsartestet täckte inte `hashchange`. Det upptäcktes först när koden i steg 3 skrevs om.
- **Lokala tester:** Vitest kunde inte installeras i agentens miljö, så testerna kördes lokalt med en minimal ersättare för Vitest och fullt i GitHub Actions.

## 6. Är projektet körbart efter implementationen?

Ja. Alla 56 tester passerar, typkontrollen är ren, bygget lyckas och webbläsartestet ger samma resultat som före ändringarna. GitHub Actions kör tester och bygge på pull requesten, och live-sidan deployas när grenen slås ihop med `main`.
