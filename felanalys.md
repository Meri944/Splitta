# Uppgift 3: Felanalys med Claude Code

## Problemet

Splitta sparar gruppen direkt i länken. Varje gång man ändrar något, till exempel lägger till en utgift, packas gruppen ihop och skrivs in i webbadressen.

Jag testade vad som händer om den här sparningen misslyckas **en enda gång**. Det gjorde jag genom att låta funktionen som packar ihop datan krascha vid ett tillfälle.

Resultatet blev att appen slutade spara helt:

- Nya utgifter syntes på skärmen men kom aldrig med i länken.
- Knappen "Kopiera länk" gjorde ingenting.
- Inget felmeddelande visades.
- Det höll i sig ända tills man laddade om sidan.

Den som skickade länken till sina vänner skickade alltså en gammal version av gruppen, utan att veta om det.

## Hur jag beskrev felet för agenten

Jag startade en ny Claude-session som inte visste något om felet. Den fick bara de filer som berördes och fick inte köra någon kod, bara läsa och resonera. Jag beskrev tre saker:

- **Vad som hände:** efter ett enda misslyckat sparförsök sparas ingenting mer, kopieringsknappen gör ingenting och inget fel visas.
- **När:** direkt efter felet, och sedan hela tiden.
- **Vad som nyligen ändrats:** sparningen hade gjorts om. Tidigare sparade appen direkt. Nu ritas skärmen om först, och sparningen läggs i en **kö** som körs efteråt, ett sparjobb i taget. "Kopiera länk" väntar tills kön är tom innan den kopierar.

## Agentens tre hypoteser

**1. Ett misslyckat sparjobb blockerar hela kön (mest sannolik).**
Kön är byggd som en kedja där varje sparjobb startar när det förra är klart. Men kedjan saknar felhantering. Om ett jobb kraschar markeras hela kedjan som trasig, och alla jobb som kommer efter hoppas över utan att köras. Knappen "Kopiera länk" väntar på samma trasiga kö, så den avbryts innan den hinner göra något. Felet syns aldrig för användaren.
*Så kan man kontrollera det:* titta efter ett ohanterat fel i webbläsarens konsol, och kontrollera att sparfunktionen aldrig körs igen efter felet.

**2. Kön fastnar och väntar för evigt.**
Om packningen aldrig blir klar, i stället för att krascha, står kön och väntar i all evighet. Symptomen blir desamma, men då syns inget fel i konsolen.

**3. Det finns ingen felhantering någonstans i kedjan.**
Det förklarar varför användaren inte får något felmeddelande, men inte varför appen slutar spara för gott. Agenten konstaterade själv att det här snarare är en del av hypotes 1 än en egen orsak.

## Vilken hypotes jag valde och varför

Jag valde **hypotes 1**.

- Mitt test fick packningen att *krascha*, inte att fastna. Därför passar inte hypotes 2.
- Det avgörande var mönstret: **ett** fel ledde till att **allt** slutade fungera, för gott. Något måste alltså komma ihåg felet mellan sparningarna, och det enda som gör det är kön.

I nästa steg frågade jag agenten var jag skulle leta. Den pekade ut exakt vilka funktioner felet passerar, från packningen, via kön, fram till kopieringsknappen, och på vilka ställen felet hade kunnat fångas men inte gjorde det.

## Vad som faktiskt var fel

Hypotes 1 stämde. Jag körde den gamla koden igen med samma test:

- Efter ett fel och två nya ändringar kördes sparfunktionen **1 gång i stället för 3**.
- Kön var markerad som trasig, så kopieringsknappen avbröts.
- Att klistra in en annan grupplänk i samma flik slutade också fungera, precis som agenten hade förutsett.

**Lösningen:** varje sparjobb i kön har nu egen felhantering. Om ett jobb misslyckas visas ett felmeddelande, och kön fortsätter med nästa jobb. Ett nytt automatiskt test kontrollerar att det fungerar.

## Vad agenten fick rätt och vad den missade

**Rätt**
- Den hittade orsaken direkt, som första hypotes.
- Den pekade ut exakt var i koden felet uppstod.
- Den förutsåg en följd jag inte själv tänkt på: att även byte av grupplänk slutar fungera.

**Mindre bra**
- De tre hypoteserna var egentligen inte tre olika förklaringar. Hypotes 3 var en del av hypotes 1, och hypotes 2 passade inte med hur jag hade framkallat felet.

**Missat**
- Den bedömde inte hur vanligt felet är i verkligheten. Funktionen som packar datan fungerar i alla moderna webbläsare, så felet är ovanligt, men farligt eftersom det är helt tyst.
- Den nämnde inte att länken är inaktuell fram till nästa lyckade sparning, även efter lösningen. Det behövde stå i felmeddelandet.

## Lärdom

Det som hjälpte mest var att beskriva **mönstret** i felet ("ett fel, och sedan slutar allt fungera för gott") och **vad som nyligen ändrats** (den nya sparkön). Det ledde agenten rakt till rätt ställe.

Men valet i steg 2 var mitt eget. Det var min kunskap om hur felet hade framkallats som uteslöt ett alternativ som lät rimligt men var fel.
