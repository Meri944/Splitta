# CLAUDE.md – Splitta

## Vad projektet gör

Splitta är en webbapp för att dela gemensamma kostnader i en grupp: en resa, ett kollektiv, en middag eller en svensexa. Man skapar en grupp, lägger till deltagare och utgifter (vem som betalade, hur mycket och vilka som ska dela). Appen räknar ut varje persons saldo och föreslår **så få betalningar som möjligt** för att alla ska bli kvitt.

### Problemet den löser

Efter en gemensam aktivitet blir det ofta en rörig tråd med "jag la ut för maten, du betalade bensinen...". Någon får sitta med ett kalkylark, och många betalar fram och tillbaka i onödan. Befintliga appar kräver konto, nedladdning eller betalabonnemang. Splitta fungerar direkt i webbläsaren: **ingen inloggning och ingen installation**. Gruppen delas med en länk.

### Kärnfunktioner (MVP)

1. Skapa en grupp med namn och deltagare.
2. Lägga till, redigera och ta bort utgifter (betalare, belopp, beskrivning, vilka som delar).
3. Visa saldo per person.
4. Visa en minimerad lista med betalningar ("Anna → Erik: 240 kr").
5. Dela gruppen via länk, där hela tillståndet är kodat i URL:en.

### Utanför scope för MVP (görs bara om tid finns)

- Swish-QR-kod per betalning
- Export till CSV
- Flera valutor
- Ojämn fördelning (procent eller andelar)

## Teknikstack och varför

| Val | Motivering |
|---|---|
| **TypeScript** | Typsäkerhet kring pengar och datamodell. Fångar fel tidigt. |
| **Vite** | Snabb dev-server och enkel statisk build som passar GitHub Pages. |
| **Vanilla TS (inget UI-ramverk)** | Appen är liten. Färre beroenden ger mindre att underhålla och lära sig. |
| **Vitest** | Samma konfiguration som Vite. Används för att testa beräkningslogiken. |
| **GitHub Pages + GitHub Actions** | Gratis hosting. Varje push till `main` deployas automatiskt. |
| **Ingen backend eller databas** | Tillståndet lever i URL:en (komprimerad JSON). Ingen drift, inga kostnader, ingen persondata lagras. |

## Arkitekturprinciper

- **Ren kärnlogik.** All beräkning (saldon, minimering av betalningar) ligger i `src/core/` som rena funktioner utan DOM, utan I/O och utan sidoeffekter.
- **All I/O i ett lager.** Läsning och skrivning av URL och `localStorage` sker endast i `src/storage/`. Kärnan känner inte till var data kommer ifrån.
- **UI i ett eget lager.** DOM-kod ligger i `src/ui/` och anropar kärnan. Kärnan anropar aldrig UI:t.
- **Pengar i heltal (ören).** Belopp lagras och beräknas som heltal i ören, aldrig som flyttal. Avrundningsrester fördelas deterministiskt.
- **Inga globala variabler.** Tillståndet hålls i ett appstate-objekt som skickas explicit.
- **Funktioner gör en sak.** Hellre små namngivna funktioner än långa.
- **Immutabilitet.** Funktioner returnerar ny data i stället för att mutera argument.
- **Testa kärnan.** Varje funktion i `src/core/` ska ha enhetstester, inklusive kantfall (0 kr, en person, avrundning, alla redan kvitt).
- **Tillgänglighet och mobil först.** Appen ska fungera på en mobilskärm och med tangentbord, med semantisk HTML och labels på alla fält.
- **Svenska i UI:t, engelska i koden.** Variabel- och funktionsnamn samt commits skrivs på engelska.

### Mappstruktur

```
src/
  core/      # ren domänlogik + typer (testas)
  storage/   # URL-kodning, localStorage
  ui/        # DOM-rendering och event-hantering
  main.ts    # kopplar ihop lagren
tests/       # Vitest-tester
```

## Saker agenten INTE ska göra

- **Lägg inte till en backend, databas eller inloggning.** Appen ska förbli helt statisk.
- **Lägg inte till externa beroenden utan att fråga först.** Det gäller både runtime- och dev-beroenden.
- **Byt inte till ett UI-ramverk** (React, Vue, Svelte osv.) utan att fråga.
- **Använd aldrig flyttal för pengar.**
- **Skicka ingen data till tredje part.** Ingen analytics, inga trackers, inga externa API-anrop.
- **Ändra inte formatet på delningslänken** så att gamla länkar slutar fungera, utan versionering och bakåtkompatibilitet.
- **Bygg inte features utanför MVP-listan** innan MVP är klar och deployad.
- **Ta inte bort eller försvaga tester** för att få dem att passera.
- **Pusha inte direkt till `main` och ändra inte deploy-workflowet** utan att fråga.

## Kommandon

```bash
npm install       # installera beroenden
npm run dev       # starta dev-server
npm test          # kör tester
npm run build     # bygg till dist/
```

## Definition of done för en ändring

- `npm test` och `npm run build` passerar.
- Ny kärnlogik har tester.
- Ändringen fungerar på mobilbredd.
