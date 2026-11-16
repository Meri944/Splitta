# Splitta

[![Test och deploy](https://github.com/Meri944/Splitta/actions/workflows/deploy.yml/badge.svg)](https://github.com/Meri944/Splitta/actions/workflows/deploy.yml)

Dela gruppkostnader enkelt, utan inloggning och utan installation. Lägg in vem som betalade vad, så räknar Splitta ut vem som ska swisha vem, med så få betalningar som möjligt. Gruppen delas med en länk.

**Live:** https://meri944.github.io/Splitta/

## Vad projektet gör

Efter en resa, en middag eller ett kollektiv blir det ofta en rörig tråd med "jag la ut för maten, du betalade bensinen …". Befintliga appar kräver konto, nedladdning eller abonnemang. Splitta fungerar direkt i webbläsaren:

- Skapa en grupp med deltagare.
- Lägg till, redigera och ta bort utgifter: vem som betalade, hur mycket och vilka som delar.
- Se saldot per person.
- Få en minimerad lista med betalningar ("Sara swishar Anna 1 600 kr").
- Dela gruppen med en länk. Hela gruppen finns i länken, så den som öppnar den ser samma sak.

### Hur det fungerar

- **Pengar räknas i ören** (heltal), aldrig som flyttal. Ojämna belopp fördelas öre för öre, så summan stämmer alltid exakt.
- **Betalningarna minimeras.** Först paras exakt matchande belopp ihop. Sedan betalar den med störst skuld till den som ska ha mest. Det ger högst *n − 1* betalningar för *n* personer.
- **Ingen server.** Gruppen komprimeras (`deflate-raw`) och läggs i länkens `#`-del, som aldrig skickas till någon server. Formatet är versionerat så att gamla länkar fortsätter att fungera.
- **Skydd mot trasiga och manipulerade länkar.** Data från en länk valideras med samma gränser som appen använder: högst 50 personer, 500 utgifter och 40 tecken per namn. Uppackningen avbryts vid 1 MB.

## Krav och externa beroenden

| Vad | Version | Används till |
|---|---|---|
| [Node.js](https://nodejs.org/) | 22 eller senare | Utveckling, tester och bygge |
| npm | följer med Node | Installera beroenden |
| En modern webbläsare | Chrome/Edge 103+, Firefox 113+, Safari 16.4+ | Köra appen (kräver `CompressionStream` med `deflate-raw`) |

Appen har **inga runtime-beroenden** och gör **inga externa anrop**: ingen backend, ingen databas, ingen analys och inga spårare. Utvecklingsberoendena är bara [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/) och [Vitest](https://vitest.dev/).

## Installation

```bash
git clone https://github.com/Meri944/Splitta.git
cd Splitta
npm install
```

## Konfiguration

Inga miljövariabler, API-nycklar eller hemligheter behövs.

Det enda som kan behöva ändras är **sökvägen appen serveras under**. Den är satt till `/Splitta/` för GitHub Pages i [`vite.config.ts`](vite.config.ts):

```ts
base: '/Splitta/',   // ändra till '/' om appen ska ligga i roten av en domän
```

Gränserna för grupper (namnlängd, antal personer, utgifter och högsta belopp) finns som konstanter i [`src/core/group.ts`](src/core/group.ts). Gränserna för länkar finns i [`src/storage/url.ts`](src/storage/url.ts).

## Köra

```bash
npm run dev       # dev-server på http://localhost:5173/Splitta/
npm test          # kör alla tester (Vitest)
npm run build     # typkontroll + bygge till dist/
npm run preview   # förhandsgranska bygget lokalt
```

## Deployment (CI/CD)

Varje push till `main` kör [GitHub Actions-pipelinen](.github/workflows/deploy.yml):

1. `npm install`
2. `npm test`: pipelinen stoppas om något test misslyckas.
3. `npm run build`
4. Deploy till GitHub Pages.

Pull requests kör test och bygge, men deployar inte. Inga hemligheter behövs, eftersom GitHub Pages använder den inbyggda `GITHUB_TOKEN`.

## Projektstruktur

```
src/
  core/      # ren domänlogik: pengar, saldon, skuldreglering, validering (testas)
  storage/   # I/O: länkkodning, komprimering, urklipp
  ui/        # tillstånd, rendering och felmeddelanden på svenska
  main.ts    # kopplar ihop lagren
tests/       # Vitest-tester
```

Kärnan i `src/core/` är rena funktioner utan DOM och utan I/O, och den känner inte till UI:t. Se [CLAUDE.md](CLAUDE.md) för alla arkitekturprinciper.

## Utvecklad med Claude Code

Projektet byggdes med agentdriven utveckling. Processen finns dokumenterad i repot:

- [`CLAUDE.md`](CLAUDE.md): projektets regler för agenten.
- [`implementation.md`](implementation.md): plan, granskning och stegvis refaktorering (hemuppgift 2, del A).
- [`granskning.md`](granskning.md): arkitektur-, säkerhets- och kodkvalitetsgranskning (del B).
- [`felanalys.md`](felanalys.md): felanalys med hypoteser (hemuppgift 3).
- [`polering.md`](polering.md): poleringsgranskning och åtgärder (hemuppgift 4).
