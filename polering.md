# Hemuppgift 4, steg 3: Polering

Hela kodbasen gicks igenom systematiskt med poleringsprompten. Varje fynd anges med fil, rad och en konkret åtgärd. Radnumren gäller koden efter åtgärderna.

## Fynd

| # | Kategori | Fil:rad | Fynd | Åtgärd | Status |
|---|---|---|---|---|---|
| P1 | Felhantering för externa anrop | `src/storage/url.ts:67`, `src/main.ts:22, 37` | Äldre webbläsare (t.ex. Safari före 16.4) saknar `CompressionStream`. Då gick det varken att spara eller öppna grupper, och användaren fick det missvisande beskedet att länken "kan vara ofullständig". | Ny `supportsLinkCompression()` i lagringslagret. `main.ts` visar då ett eget meddelande: uppdatera webbläsaren eller använd en annan. | **Åtgärdat** |
| P2 | Otydligt felmeddelande | `src/ui/messages.ts:37`, `src/core/group.ts:90` | "Beloppet är för stort." säger inte vad gränsen är. | Felkoden bär med sig gränsen (`max`), och texten blir "Beloppet får vara högst 100 000 000,00 kr." | **Åtgärdat** |
| P3 | Edge case i indata | `src/core/money.ts:5, 12` | Det är vanligt att skriva "249 kr" eller "249:-", men det gav felet "Skriv beloppet i kronor". | `parseAmount` tar bort valutasuffixen `kr`, `kr.`, `:-` och `SEK`. Nya tester, och "kr" ensamt avvisas fortfarande. | **Åtgärdat** |
| P4 | Saknad dokumentation i komplex kod | `src/core/settle.ts:41–45` | Den giriga andra fasen i skuldregleringen (`for (;;)` som sorterar om i varje varv) förklarade inte varför den ser ut så eller varför den alltid tar slut. | Kommentar om algoritmen, varför den alltid avslutas, komplexiteten och varför den räcker vid högst 50 personer. | **Åtgärdat** |
| P5 | Hårdkodade värden | `src/ui/view.ts:54, 113, 157, 393` | `maxlength: 40` och `maxlength: 80` upprepade gränserna från kärnan. Ändras en gräns där stämmer formulären inte längre. | Använder `MAX_NAME_LENGTH` och `MAX_DESCRIPTION_LENGTH` från `src/core/group.ts`. | **Åtgärdat** |
| P6 | Otydligt felmeddelande | `src/main.ts:13` | Samma text visas för en avklippt länk som för en för stor eller manipulerad länk. | Skilja på orsakerna genom att låta `decodeGroup` returnera en felorsak i stället för `null`. | Kvar, låg nytta |
| P7 | Edge case i indata | `src/core/money.ts:13` | ",50" (utan nolla före kommat) avvisas. | Tillåt tom heltalsdel. | Kvar, ovanligt |
| P8 | Svårläst konvention | `src/ui/dom.ts:19` | `h()` gör varje funktionsvärde till en lyssnare genom att kapa de två första tecknen, även om nyckeln inte börjar med "on". | Kasta ett fel om en funktion skickas till en nyckel som inte börjar med "on". | Kvar, inget faktiskt fel idag |
| P9 | Bygg/CI | `package.json`, `.github/workflows/deploy.yml` | Ingen `package-lock.json`, så `npm install` kan få andra versioner vid varje körning. Actions är fästa vid taggar och har för breda behörigheter (S4/S5 i del B). | Committa en låsfil och använd `npm ci`. Begränsa behörigheterna per jobb. | Kvar, `CLAUDE.md` kräver att man frågar innan deploy-workflowet ändras |
| – | Felhantering för externa anrop | `src/storage/clipboard.ts:4` | Urklipp kan nekas. | Hanteras redan: `try/catch` och uppmaningen "markera länken och kopiera den själv". | OK |

## Verifiering

- 72 tester passerar (69 före), och `tsc` strict ger inga fel.
- Webbläsartestet ger exakt samma resultat som före poleringen.
- Nya beteenden testade i Chromium:
  - "249 kr" sparas som 249,00 kr.
  - 200 000 000 kr ger "Beloppet får vara högst 100 000 000,00 kr."
  - Med `CompressionStream` borttaget visas meddelandet om gammal webbläsare, både när man öppnar en länk och när man sparar.
