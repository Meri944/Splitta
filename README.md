# Splitta

Dela gruppkostnader enkelt – ingen inloggning, ingen installation. Lägg in vem som betalade vad, så räknar Splitta ut vem som ska swisha vem med så få betalningar som möjligt. Gruppen delas med en länk.

**Live:** https://meri944.github.io/Splitta/

## Funktioner (MVP)

- [ ] Skapa grupp med deltagare
- [ ] Lägga till, redigera och ta bort utgifter
- [ ] Saldo per person
- [ ] Minimerad lista med betalningar
- [ ] Dela gruppen via länk

## Kom igång

```bash
npm install
npm run dev     # dev-server
npm test        # tester
npm run build   # bygg till dist/
```

## Teknik

TypeScript, Vite och Vitest. Helt statisk app utan backend, deployad till GitHub Pages via GitHub Actions. Se [CLAUDE.md](CLAUDE.md) för arkitekturprinciper.
