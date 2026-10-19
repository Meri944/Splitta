# Splitta

Dela gruppkostnader enkelt – ingen inloggning, ingen installation. Lägg in vem som betalade vad, så räknar Splitta ut vem som ska swisha vem med så få betalningar som möjligt. Gruppen delas med en länk.

**Live:** https://meri944.github.io/Splitta/

## Funktioner (MVP)

- [x] Skapa grupp med deltagare
- [x] Lägga till, redigera och ta bort utgifter
- [x] Saldo per person
- [x] Minimerad lista med betalningar
- [x] Dela gruppen via länk

## Hur det fungerar

- **Pengar räknas i ören** (heltal), aldrig flyttal. Ojämna belopp fördelas öre för öre så att summan alltid stämmer exakt.
- **Betalningarna minimeras** genom att först para ihop exakt matchande belopp och sedan låta största skulden betala till den som ska ha mest. Det ger högst *n − 1* betalningar för *n* personer.
- **Ingen server.** Gruppen komprimeras (`deflate-raw`) och läggs i länkens `#`-del, som aldrig skickas till någon server. Formatet är versionerat så att gamla länkar fortsätter fungera.

## Kom igång

```bash
npm install
npm run dev     # dev-server
npm test        # tester
npm run build   # bygg till dist/
```

## Teknik

TypeScript, Vite och Vitest. Helt statisk app utan backend, deployad till GitHub Pages via GitHub Actions. Se [CLAUDE.md](CLAUDE.md) för arkitekturprinciper.
