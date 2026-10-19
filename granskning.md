# Hemuppgift 2, del B: Kodgranskning

Tre separata granskningar av Splitta, gjorda mot koden i grenen `refactor/del-a` (efter del A).
Varje granskning gjordes isolerat. Fynd som kunde verifieras kördes som små testskript – de markeras **(verifierat)**.

---

## 1. Arkitektur – mot principerna i `CLAUDE.md`

### Brott mot principerna

| # | Princip | Fynd | Var |
|---|---|---|---|
| A1 | *Ren kärnlogik* / *Svenska i UI:t* | Kärnan returnerar färdiga svenska användartexter: alla felmeddelanden i `validatePersonName` och `validateExpense`, standardnamnet `'Min grupp'` och fallbacken `'Okänd'`. Kärnan bestämmer därmed hur fel *visas*, vilket är UI-lagrets ansvar. Det gör kärnan svår att återanvända och omöjlig att översätta. | `src/core/group.ts:26–27, 33, 62–70, 95, 114` |
| A2 | *Pengar i heltal (ören)* | `totalSpent` returnerar `number` i stället för `Ore`, så typen tappar betydelsen "ören" på vägen. Ingen bugg idag, men typsystemet hjälper inte. | `src/core/group.ts:109` |
| A3 | *Funktioner gör en sak* | `renderExpenseForm` är ~100 rader: räknar ut redigeringsläge, läser formuläret, formaterar och bygger markup. | `src/ui/view.ts:119–217` |
| A4 | *Testa kärnan* | Lagringslagret testas delvis (`codec`, `url`), men gränsfallen för opålitlig data saknar tester (se S1). | `tests/codec.test.ts` |

### I linje med principerna

| Princip | Hur | Var |
|---|---|---|
| Ren kärnlogik | `balance`, `settle`, `money` har inga DOM-anrop, ingen I/O och inga sidoeffekter utåt. | `src/core/*.ts` |
| All I/O i ett lager | URL och urklipp ligger bara i `src/storage/`. `main.ts` kopplar ihop men gör ingen egen I/O. | `src/storage/url.ts`, `src/storage/clipboard.ts`, `src/main.ts` |
| UI anropar kärnan, aldrig tvärtom | Inga importer från `ui/` eller `storage/` i `core/`. | `src/core/*.ts` (importer) |
| Pengar i heltal | Alla belopp är ören; avrundning fördelas deterministiskt. | `src/core/money.ts:59–69`, `src/core/balance.ts` |
| Inga globala variabler | Tillståndet lever i `createStore` och skickas explicit. | `src/ui/store.ts:23` |
| Immutabilitet | Kärnfunktioner returnerar ny data; mutation sker bara på lokala kopior. | `src/core/group.ts`, `src/core/settle.ts:20–27` |
| Inga externa anrop | Inga `fetch`, inga typsnitt eller skript från tredje part. | hela `src/`, `index.html` |
| Bakåtkompatibelt länkformat | Versionerat (`v: 1`, prefix `1.`). | `src/storage/codec.ts:4–14`, `src/storage/url.ts:8` |

---

## 2. Säkerhet

| # | Kategori | Fynd | Var | Allvar |
|---|---|---|---|---|
| S1 | Saknad inputvalidering | **Data från länken saknar storleksgränser.** `isValidGroup` kontrollerar inte gruppnamnets längd, personnamnens längd eller antalet personer/utgifter. En handgjord länk med ett gruppnamn på 100 000 tecken och 5 000 personer à 1 000 tecken accepteras **(verifierat)**. | `src/core/group.ts:118–125`, `src/storage/codec.ts:51–61` | Medel |
| S2 | Saknad inputvalidering | **Dekomprimeringsbomb.** Länken packas upp utan gräns. En länk på 65 000 tecken packas upp till 50 MB och använder ~160 MB minne **(verifierat)**; en längre länk kan krascha fliken. Påverkar bara den som öppnar länken, men den kan skickas till vem som helst. | `src/storage/url.ts:26–29, 38–46` | Medel |
| S3 | Osäkra standardvärden | **Ingen Content-Security-Policy.** GitHub Pages kan inte sätta headers, men en `<meta http-equiv>`-CSP skulle begränsa skadan om XSS ändå uppstod. | `index.html` | Låg |
| S4 | Osäkra standardvärden | **För breda behörigheter i CI.** `pages: write` och `id-token: write` gäller alla jobb, även `build` som kör `npm install` (tredjepartskod). Bara `deploy` behöver dem. Actions är också fästa vid taggar (`@v4`) i stället för commit-SHA. | `.github/workflows/deploy.yml:9–12, 22–23, 29` | Låg |
| S5 | Osäkra standardvärden | `concurrency: group: pages` med `cancel-in-progress: true` delas av pull requests och `main` – en PR-körning kan avbryta en pågående deploy. | `.github/workflows/deploy.yml:14–16` | Låg |
| – | Hårdkodade hemligheter | **Inga hittade.** Inga nycklar, tokens eller lösenord i koden eller CI. | – | – |
| – | Injection (SQL, kommando, path traversal) | **Inte tillämpligt / inga hittade.** Ingen backend, databas, filsystem eller `eval`. XSS är hanterat: all text renderas som textnoder och `innerHTML` används inte. | `src/ui/dom.ts:11–25` | – |
| – | Känsliga data i loggar | **Inga hittade.** Inga `console`-anrop. Notera: gruppens innehåll (namn, belopp) ligger i länken och i webbläsarhistoriken – det är avsiktlig design och står i appen. | `src/ui/view.ts:343–348` | – |

---

## 3. Kodkvalitet – de fem allvarligaste

| # | Kategori | Problem | Var |
|---|---|---|---|
| K1 | Saknad felhantering för externa anrop | **Sparkön förgiftas av ett enda fel.** Om `persist` kastar (t.ex. om `CompressionStream` saknas eller misslyckas) blir kön ett avvisat löfte, och alla senare `queue.then(...)` hoppas över. Inga fler ändringar sparas i länken, `flush()` avvisas så "Kopiera länk" slutar fungera – och användaren får inget felmeddelande **(verifierat: efter ett fel och två ändringar anropades persist 1 gång i stället för 3)**. | `src/ui/store.ts:38`, `src/main.ts:25–28, 33–35, 50–52` |
| K2 | Funktion som gör mer än en sak | `renderExpenseForm` (~100 rader) blandar tillståndslogik, formulärläsning och markup. | `src/ui/view.ts:119–217` |
| K3 | Otydlig namngivning / svårläst | `h()` tolkar varje attribut vars värde är en funktion som en event-lyssnare genom att kapa bort de två första tecknen (`key.slice(2)`). Skickas en funktion till t.ex. `value` blir det tyst en lyssnare på eventet `"lue"`. Konventionen syns inte i anropen. | `src/ui/dom.ts:19` |
| K4 | Otydlig namngivning | `transform` (vad transformeras?), `pay`, `Party` och enbokstavsnamnet `h` kräver att man läser implementationen. | `src/storage/url.ts:26`, `src/core/settle.ts:3, 30`, `src/ui/dom.ts:11` |
| K5 | Svårläst utan kommentarer | Skuldregleringens andra fas (`for (;;)` som filtrerar och sorterar om i varje varv) är svår att följa och O(n² log n). Funktionens docstring förklarar *vad* men inte varför loopen ser ut så. | `src/core/settle.ts:36–46` |

---

## Åtgärdat (minst en punkt per kategori)

| Kategori | Åtgärd | Verifiering |
|---|---|---|
| Arkitektur | **A1** – Kärnan returnerar strukturerade fel (`GroupError`, t.ex. `{ code: 'name-taken', name }`) i stället för svenska texter. Nya `src/ui/messages.ts` översätter dem; `switch`-satsen är uttömmande så att en ny felkod inte går att lägga till utan en text. Standardnamnet och `'Okänd'` flyttade också till UI-lagret. `src/core/` innehåller nu inga användartexter. | Tester för felkoder i kärnan och för att varje kod har en svensk text. Webbläsartest identiskt med före. |
| Säkerhet | **S1 + S2** – `isValidGroup` tillämpar samma gränser på länkdata som appen själv: namn ≤ 40 tecken, högst 50 personer och 500 utgifter, id:n bara korta bas 36-tal. `addPerson`/`addExpense` ger fel vid gränsen. Länkar över 400 000 tecken avvisas direkt, och uppackningen avbryts vid 1 MB. | Bomben från granskningen: **357 ms / ~160 MB → 12 ms / ~2 MB**. Gruppen med 5 000 personer avvisas. Den största *giltiga* gruppen (50 personer, 500 utgifter) ger en länk på 48 000 tecken och fungerar fortfarande. |
| Kodkvalitet | **K1** – Sparkön fångar fel per sparning (`.catch(onPersistError)`), så kön fortsätter. `main.ts` visar ett felmeddelande. Eftersom hela gruppen sparas varje gång blir länken aktuell igen vid nästa lyckade sparning. | Test: efter ett fel och två ändringar anropas persist 3 gånger och `flush()` avvisas inte. Webbläsartest med simulerat fel i `CompressionStream`: felmeddelandet visas och nästa ändring sparar hela gruppen. |

Efter alla tre åtgärderna: 69 tester passerar (56 före del B), `tsc` strict ren, bygget lyckas och webbläsartestet ger identiskt resultat med koden före ändringarna.

## Medvetet inte åtgärdat

| Fynd | Varför |
|---|---|
| **S4, S5** – CI-behörigheter och `concurrency` | `CLAUDE.md` säger att agenten inte ska ändra deploy-workflowet utan att fråga. Rätt i sak, men görs som en separat, avsiktlig ändring. |
| **S3** – Content-Security-Policy | Låg risk eftersom all text renderas som textnoder. Värt att lägga till, men kräver test av att Vite-bygget fungerar med en strikt policy. |
| **A3/K2** – dela upp `renderExpenseForm` | Samma bedömning som i del A: läsbart idag, en uppdelning ger mest flyttad kod. |
| **K3, K4, K5** – namngivning och `settle`-loopen | Kosmetiskt eller utan praktisk påverkan vid ≤ 50 personer. Noterat för framtida städning. |
| **A2** – `totalSpent` returnerar `number` | Liten typfråga utan buggrisk idag. |
