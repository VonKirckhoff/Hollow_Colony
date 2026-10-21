# Hollow Colony

Een realtime strategiespel (RTS) in de browser, geïnspireerd op *Aliens versus Predator: Extinction*, maar met een eigen verhaal en eigen facties. De speltekst is in het Engels; deze README is in het Nederlands.

Open **`index.html`** in een moderne browser (Chrome, Edge, Firefox) en je kan spelen: dubbelklikken volstaat. Er is geen installatie, buildstap, server of internet nodig; alleen het lettertype komt van Google Fonts en valt zonder internet terug op een standaardletter.

De inhoud staat in losse bestanden: elke kaart en elke missie heeft een eigen bestand, zodat wijzigingen in Git makkelijk te volgen zijn. De kaarteditor staat in [`map-editor/`](map-editor/README.md).

---

## Inhoud

1. [Het spel](#het-spel)
2. [Besturing](#besturing)
3. [Spelmechanismen](#spelmechanismen)
4. [Campagne](#campagne)
5. [Opbouw van het project](#opbouw-van-het-project)
6. [Inhoud toevoegen](#inhoud-toevoegen)
7. [Mission API](#mission-api)
8. [Instelbare waarden](#instelbare-waarden)
9. [Testen en tips](#testen-en-tips)
10. [Bekende beperkingen en ideeën](#bekende-beperkingen-en-ideeën)

---

## Het spel

De terraformingkolonies op de maan zijn stilgevallen. Onder de regolith is iets wakker geworden.

| Factie | Speelbaar | Kenmerk |
|---|---|---|
| **Lunar Corps** (mensen) | ja | Salvage uit Relay Towers en kratten. Engineers bouwen, Medics genezen. |
| **The Swarm** (biologische zwerm) | nee (AI) | Groeit vanuit hives. Wat de Swarm doodt, wordt een cocon die uitkomt als nieuwe Swarm. |
| **The Grey** (jagers) | nee (AI, vanaf missie 4) | Gecamoufleerde jagers die op de sterkste prooi jagen en zich terugtrekken als ze verliezen. |

**Spelvormen:** een campagne van 8 missies en skirmish (kies een kaart en vernietig alle hives). Er zijn drie moeilijkheidsgraden: Easy, Normal en Hard.

| | Easy | Normal | Hard |
|---|---|---|---|
| Levenspunten Swarm | ×0,85 | ×1 | ×1,25 |
| Schade Swarm | ×0,85 | ×1 | ×1,15 |
| Grootte van golven en van het noodbroed | ×0,7 | ×1 | ×1,4 |
| Tijd tussen golven en hive-kreten | ×1,25 | ×1 | ×0,8 |
| Levenspunten hives | ×0,85 | ×1 | ×1,35 |

**Een hive verdedigt zich.** Komen je soldaten binnen zijn *waarnemingsstraal* (standaard 8 tegels, × 0,8 op Easy en × 1,25 op Hard), dan merkt hij ze op: zijn bewakers vallen aan en hij baart een broed (daarna wacht hij 18 seconden voor hij opnieuw zo reageert). Elke treffer laat hem *krijsen* (hoogstens om de 12 seconden): weer een broed dat recht op de aanvaller afgaat. Zakt hij onder 60%, dan roept hij één keer de andere hives, en die sturen een golf naar hem toe. Er komen nooit meer broedsels als er al 60 Swarm-eenheden op de kaart zijn.

### Moeilijkheid aanpassen

Alles wat de Swarm doet, stel je in op drie niveaus. Het meest specifieke wint: **per hive** › **per missie** › **standaard**.

**1. Voor het hele spel** — `js/content/difficulty.js` (`DIFFICULTY`, per moeilijkheidsgraad) en `HIVE_DEFENCE` bovenaan het hive-stuk in `js/engine/12-swarm-director.js` (de standaardwaarden).

**2. Per missie** — in het missiebestand (`js/content/missions/…`), in `swarm:{ … }`:

| Instelling | Betekenis | Voorbeeld |
|---|---|---|
| `biomass` | Biomassa waarmee de Swarm start (betaalt bewakers) | `80` |
| `rate` | Biomassa per seconde, per levende hive | `0.5` |
| `guardMax` | Maximum bewakers per hive | `6` |
| `guardEvery` | Seconden tussen twee nieuwe bewakers | `12` |
| `guards` | Welke types een hive als bewaker maakt (herhalen = vaker) | `['drone','drone','spitter']` |
| `aggro` | Waarnemingsstraal van hives in tegels (`0` = blind tot je schiet) | `8` |
| `aggroBrood` | Biomassa van het broed als een hive je opmerkt (standaard 45) | `55` |
| `aggroCooldown` | Seconden voor een hive opnieuw zo reageert | `18` |
| `brood` | Biomassa van het broed als een hive geraakt wordt | `45` |
| `hiveRage` | Factor op alle broedsels en het tempo van krijsen | `1.8` |
| `waves` | `{ first, every, budget, growth, growWaves, max, types }`: eerste golf na `first` s, dan om de `every` s; grootte `budget` + `growth` per golf, maar enkel de eerste `growWaves` golven groeien (standaard 8), daarna blijft de grootte gelijk; `max` is een vast plafond; `types` beperkt de soorten. Elke verbrande hive maakt de golven kleiner (met nog 2 van de 5 hives zijn ze nog 64% zo groot). | `{ first:140, every:85, budget:80, growth:32 }` |
| `maxAlive` | Hoeveel Swarm er hoogstens tegelijk rondloopt (de bewakers bij hun hive tellen niet mee), maal de moeilijkheid. Zit de Swarm aan 85%, dan wacht de volgende golf 15 seconden. Standaard `WAVES.maxAlive` = 40 in js/engine/12-swarm-director.js | `40` |
| `unlock` | Na hoeveel seconden een type mag verschijnen | `{ spitter:120, brute:480 }` |
| `burrows` | Als alle hives weg zijn, graven golven zich uit de grond op | `true` |
| `creep` | Straal (tegels) die de schimmel rond elke hive uiteindelijk haalt (`0` = geen schimmel) | `6` |

Ook in `start:{ … }`: `hiveHp` (factor op de levenspunten van alle hives in die missie).

**3. Per hive** — zet in `start.hives` een object in plaats van een letter. Alles wat je weglaat, komt van de missie:

```js
hives:[ 'a', 'b',
  { at:'c', guardMax:8, guards:['drone','drone','spitter'], aggro:10 },   // het grote nest: meer en zwaardere bewakers, ziet je van ver
  'd',
  { at:'e', hp:2.4, rage:1.4 } ]                                          // taaier en bozer
```

Velden per hive: `at` (kaartpunt), `hp` (factor), `guardMax`, `guardEvery`, `guards`, `aggro`, `aggroBrood`, `aggroCooldown`, `brood`, `rage`, `creep`.

**Tijdens een missie** kan een trigger de instellingen veranderen met `g.setSwarm({ … })`, bv. `g.setSwarm({ aggro:7 })` als de deuren opengaan (zo doet *Dust Landing* het: daar zijn de hives blind tot de blast doors open zijn).

Huidige afstelling: *Burn the Brood* gebruikt de per-hive-instellingen hierboven als voorbeeld; *The Hollow Colony* heeft geen golven, maar de hives letten op de weg (`aggro:9`).

---

## Besturing

| Invoer | Actie |
|---|---|
| Linker muisknop slepen | Eenheden selecteren met een kader |
| Klik / dubbelklik | Eén eenheid selecteren / alle eenheden van dat type in beeld |
| Shift + klik | Toevoegen aan of verwijderen uit de selectie |
| Rechtermuisknop | Slim bevel: bewegen, aanvallen, krat oprapen, repareren (Engineer), rally point zetten (Command Post), ongeschonden Sentry inpakken (Engineer) |
| **A** + klik | Attack-move: lopen en onderweg alles aanvallen |
| **S** / **H** | Stop / positie houden |
| **I** / **W** / **Y** | Lijn / zigzag / je eigen formatie (naast Z, X, V) |
| **F** / **E** | Huidige opstelling bewaren als eigen formatie / afstand wisselen (normaal, ruim, dicht) |
| **Q** | Vuur inhouden (schakelaar): ze schieten niet uit zichzelf, ook niet terug, enkel op wat je met rechtsklik aanvalt |
| Rechtsklik ingedrukt + slepen | Een squad in formatie loopt naar waar je drukte en kijkt in de richting waarin je sleepte |
| **Ctrl + 1–5**, **1–5** | Controlgroep opslaan (vervangt de groep) / oproepen (twee keer drukken centreert de camera). Werkt ook op een AZERTY-toetsenbord (de toets telt, niet het teken). |
| **Ctrl + Shift + 1–5** | De selectie **toevoegen** aan die groep zonder de groep te vervangen. Een soldaat mag in meer dan één groep zitten (handig voor een Medic of Engineer die bij twee teams hoort). Iemand uit een groep halen: groep selecteren, hem met Shift+klik weghalen, opnieuw Ctrl+nummer. |
| **Shift + klik** | Een eenheid aan de selectie toevoegen of eruit halen. |
| Pijltjes, schermrand, middelste muisknop | Kaart scrollen |
| Minimap | Klik of sleep om te springen, rechtsklik om eenheden te sturen |
| **Spatie** | Naar de laatste melding springen |
| **Z** / **X** / **V** | Formatie: cirkel / wig (speer) / vierkant. Nog eens drukken = formatie loslaten |
| **C** | Camera volgen aan/uit |
| **K** | Motion tracker aan/uit |
| **O** | Gesproken stemmen aan/uit |
| **L** + klik | Fakkel gooien (met een Trooper, Gunner of Pyro geselecteerd) |
| **U** / **D** | Engineer: Sentry Gun inpakken / opstellen |
| **P** / **Esc** | Pauzemenu (Esc annuleert ook plaatsen, inpakken en attack-move) |
| Knoppen bovenaan | **Follow** (camera), **Tracker** (motion tracker), **Voices** (stemmen), **Sound** (geluid), **1×/1.5×/2×** (spelsnelheid), **Menu** |

**Trainen bij de Command Post:** T = Trooper, G = Gunner, M = Medic, F = Pyro, E = Engineer.
**Bouwen met een Engineer:** R = Relay Tower, T = Sentry Gun, B = Barricade.

Bovenaan zie je **Salvage**, **Supply**, **Troops** (aantal eigen eenheden op het veld; beweeg de muis erover voor de verdeling per type) en eventueel een **timer**.

---

## Spelmechanismen

### Veterans
- **Elke soldaat heeft een naam** (Trooper, Gunner, Pyro, Medic, Engineer) en verdient **ervaring (XP)**:

| Actie | XP |
|---|---|
| Swarm-eenheid gedood | 1 (Spitter 2, Brute 4) |
| Hive of eierkamer vernietigd | 5 |
| Brood Mother gedood | 10 |
| Medic: 60 HP genezen | 1 |
| Engineer: gebouw afgewerkt / 250 HP hersteld | 1 |

- **Rangen:**

| Rang | XP | Bonus |
|---|---|---|
| Private | 0 | — |
| Corporal (›) | 4 | +15% HP, +10% schade, +5% vuursnelheid |
| Sergeant (») | 10 | +30% HP, +20% schade, +10% vuursnelheid |
| Veteran (★) | 20 | +50% HP, +30% schade, +15% vuursnelheid |
| Lieutenant (★★) | 40 | +75% HP, +45% schade, +20% vuursnelheid, plus een **vaardigheid** van zijn type |
| Captain (✪) | 60 | Alleen **je eigen soldaat**: +85% HP, +55% schade, +25% vuursnelheid, plus de vaardigheid en **leiderschap** |

- **Vaardigheden van een Lieutenant** (`PERKS` in js/content/veterans.js):
  - Trooper, *Grenade*: om de 9 s een granaat (55 schade, straal 1,5 tegel) naar de dichtste groep vijanden rond zijn doelwit. Op één klein beest gooit hij er geen.
  - Gunner, *Steady aim*: schiet tijdens het lopen even snel als stilstaand.
  - Pyro, *Long flame*: zijn vlammenwerper reikt 1,5 tegel verder.
  - Medic, *Field triage*: geneest naast zijn patiënt ook iedereen rondom zich (aan 60% van zijn snelheid).
  - Engineer, *Quick hands*: bouwt, herstelt en zet ladingen twee keer zo snel.
- **Leiderschap van de Captain** (`AURA`): soldaten binnen 4 tegels schieten 10% sneller en krijgen 10% minder schade; een gestippelde gouden cirkel toont het bereik. Sneuvelt hij, dan **wankelt** de groep: wie binnen 9 tegels stond, schiet 10 seconden lang 15% trager.

- Bij een promotie meldt de radio het, verschijnt "PROMOTED" en krijgt de soldaat een kwart van zijn levenspunten terug. Het rangteken staat boven de soldaat en in het selectiepaneel; daar zie je ook naam, XP, kills en aantal missies.
- **Rooster:** win je een campagnemissie, dan gaan alle overlevenden met XP naar het rooster (max. 30, de meest ervarenen eerst). In de volgende campagnemissie vervangen ze startsoldaten van hetzelfde type. Wie niet meteen een plaats heeft, staat in **reserve** en komt als eerste zodra je dat type traint of via de dropship bestelt.
- **Gesneuveld is gesneuveld:** een veteraan die sterft in een missie die je wint, verdwijnt van het rooster en komt op de **Cenotaph**.
- **Neer, niet dood:** een soldaat op 0 levenspunten valt **neer** (15 seconden): hij ligt op de grond met een rood kruis en een ring die aftelt, en neemt geen bevelen. Een Medic gaat eerst naar de neergevallen soldaten; na 4 seconden oplappen (een groene ring; een Lieutenant-Medic is sneller) staat hij weer op met 30% levenspunten. Komt er niemand, dan bloedt hij dood. De Swarm valt liever wie nog rechtstaat aan, maar kan een neergevallen soldaat afmaken. Risen soldaten vallen niet neer. Instellingen: `SQUAD.downed`.
- **De gevallenen:** het lichaam blijft 35 seconden liggen. Elke seconde roept het de dichtste vrije Swarm-eenheden (binnen 8 tegels, of 14 als je de Swarm speelt; hive-bewakers blijven bij hun hive):
  - **Eén draagt het naar huis**, naar de schimmel rond de dichtste hive (aan 70% van zijn snelheid). Is de weg dicht (een gesloten deur), dan graaft de drager zich met het lichaam door de rots (4 seconden) en komt bij de hive boven. Thuis geeft het lichaam 20 biomassa en geneest de hive 10%. Dood de drager en hij laat het lichaam vallen; een ander pakt het weer op.
  - **Twee andere bewaken het** en vechten tegen wie in de buurt komt.
  - **Thuis op de schimmel** opent een van de **eieren** die elke hive klaar heeft liggen (3 per hive, een nieuw om de 18 seconden; `EGG` in js/engine/25-hive-life.js, per hive of missie `eggs:<n>`). Is er geen vrij ei, dan **spuwt de hive een vers ei** naast het lichaam. Uit het ei kruipt een **Grafter** (een kleine parasiet die niet kan vechten), die naar het lichaam rent, zich vastklampt en het in 3 seconden infecteert. Dan wordt het een cocon waaruit een **Husk** komt. **Buiten de schimmel komt niets uit:** ook dieren die de Swarm doodt, worden alleen op de schimmel een cocon.
  - Staat er een soldaat naast het lichaam (1,6 tegel), dan kan niemand het oppakken of infecteren: de Swarm valt eerst die bewaker aan. Een **Pyro** verbrandt het (ook als zijn vlam ernaast landt, ook als het net wordt weggedragen). Schiet ook de eieren en Grafters. Instellingen: `SQUAD.body` in js/engine/22-squad-life.js.
- **Bij een nederlaag** kies je op het campagnescherm (*On defeat*, onthouden als `hc-real-death`):
  - **Retry with the same soldiers** (standaard): het rooster blijft zoals voor de missie, je kan opnieuw proberen met dezelfde soldaten. Het eindscherm noemt wie viel, met de vermelding dat niemand verloren is.
  - **☠ Real death**: ook bij een nederlaag is wie sneuvelde weg en komt op de Cenotaph; wie overleeft, houdt zijn XP en promoties. Het spel vermeldt dit overal: een rode rand en uitleg op het campagnescherm, een rode regel in de briefing, een badge *☠ Real death* in de bovenbalk tijdens de missie, en een rode regel op het eindscherm.
- De knop **Veterans** in de campagnelijst toont links het rooster (een lang rooster scrollt in zijn eigen vak) en rechts de rangen; de knop **Cenotaph** toont de gesneuvelden. De briefing toont wie meegaat. Het eindscherm toont promoties (per soldaat alleen de hoogste rang die hij haalde, en alleen van wie de missie overleefde) en nieuwkomers, **gegroepeerd per rang** (hoogste eerst, namen alfabetisch, je eigen soldaat met ★), en **alle** gesneuvelden van die missie (ook soldaten zonder rang) elk op een eigen regel, gesorteerd op rang, met type, missies en kills. Op de Cenotaph komen alleen de veteranen (wie op het rooster stond of een rang had).
- **Namen:** alleen Nederlandstalige familienamen (`SURNAMES` in js/content/veterans.js). De eerste soldaten van een nieuwe campagne heten altijd, in deze volgorde, **Van Kerckhove, Heem, Van Damme, Vikernes en Verstappen** (`STARTER_NAMES`), zolang die namen vrij zijn. Een bewaard rooster met namen die niet in de lijst staan, krijgt bij het laden nieuwe namen.
- **Wie spreekt:** geef je een groep een bevel of selecteer je hem, dan antwoordt **de hoogste in rang** (bij gelijke rang je eigen soldaat, dan wie de meeste XP heeft).
- **Je eigen soldaat:** bovenaan het campagnescherm staat *Enlist your own soldier*. Geef een naam (2 tot 18 tekens, uniek), kies **man of vrouw** en een type (Trooper, Gunner, Pyro, Medic of Engineer). Man of vrouw bepaalt de **stem**: het spel kiest een mannen- of vrouwenstem uit de stemmen van je browser (bij het kiezen hoor je meteen een proefzin), en heeft je browser er geen van die soort, dan doet de toonhoogte het werk. Ook de radioberichten volgen je keuze (*Soldier down … she has 15 seconds*); man/vrouw kan je altijd wijzigen met *Edit*. Hij gaat mee op elke campagnemissie (hij vervangt een starter van zijn type, of komt er extra bij), draagt een **gouden ster** boven zijn hoofd en verdient rang zoals elke veteraan. Na zijn eerste missie ligt zijn type vast; de naam kan je altijd wijzigen met *Edit*. Sneuvelt hij, dan komt hij op de Cenotaph en kan je een nieuwe soldaat inlijven. Alleen hij kan Captain worden.
- **Trophy wall** (knop *Trophies* op het campagnescherm): een muur met een trofee per **rol** (Trooper, Gunner, Pyro, Medic, Engineer) en per kolom **Easy, Normal, Hard en Real death** (iron mode): 20 trofeeën. Je verdient er een als **je eigen soldaat** in die rol **alle campagnemissies wint en uit elke missie levend terugkomt**. Een overwinning op Hard telt ook voor Normal en Easy; de kolom Real death telt alleen missies die je met *☠ Real death* aan won (op eender welke moeilijkheid). De regel is **streng**: de soldaat moet **bij missie 1 begonnen** zijn en de missies **in volgorde** winnen. De voortgang (bv. *Normal 3/8*) is hoe ver die ononderbroken reeks loopt: alleen de volgende missie in de rij telt; een latere missie die je eerder speelt, telt niet (speel ze opnieuw als ze aan de beurt is), een oudere opnieuw spelen verandert niets. Was de eerste missie van je soldaat niet missie 1, dan doet die soldaat nooit mee (*Not on a trophy run*). Ook een opgewekte (risen) soldaat begint opnieuw. De voortgang staat bovenaan de muur, op zijn rij, en na elke gewonnen missie op het eindscherm (*Trophy run*). Sneuvelt hij, dan begint een nieuwe soldaat van nul. Een behaalde trofee wordt goud (Real death: rood) met de naam en datum; wie daarna dezelfde trofee haalt, komt erbij (*+1 more*). Daaronder hangen **twee grote trofeeën**: *Hollow Light* (alle 20 trofeeën van de Lunar Corps) en *The Long Hunger* (elke Swarm-missie gewonnen op Easy, Normal en Hard; een overwinning op Hard telt ook voor de lagere). De muur telt 22 trofeeën; een behaalde grote trofee meldt het eindscherm. Bewaard in `hc-trophies`; *Start fresh* laat de muur staan tenzij je het vakje *Keep my trophy wall* uitvinkt.
- **Intel** (knop in het hoofdmenu en op het campagnescherm): een overzicht met tabbladen **Lunar Corps**, **Structures**, **Swarm** en **Other**. Links staat per tabblad een lijst (klik, of pijltjes omhoog/omlaag), rechts de volledige kaart van wat je kiest, zodat niets moet scrollen. Per eenheid of gebouw een kaart met figuurtje, beschrijving, een korte veldnotitie, en de cijfers: HP, schade per seconde, bereik, snelheid (tegels per seconde), zicht, kostprijs of XP per kill, pantser, wanneer de vijand verschijnt, en de Lieutenant-vaardigheid. De cijfers komen rechtstreeks uit `UNITS` en `BUILDINGS`, dus pas je die aan, dan klopt Intel vanzelf. Welke eenheden op welk tabblad staan en de veldnotities staan in `js/content/intel.js`. Pijltjestoetsen links/rechts wisselen van tabblad.
- **Cenotaph** (knop op het campagnescherm en het Veterans-scherm): een grafsteen met de naam van elke gesneuvelde, met rang, type, de missie waarin hij viel, missies, kills en datum. Je eigen soldaat staat er met zijn ster.
- **Zombie mode** (Halloween, aan/uit op de Cenotaph, onthouden in je browser): met *Raise* haal je een gesneuvelde terug naar het rooster, met zijn rang, XP en kills. Een **risen** soldaat is groen, gloeit, en praat traag en hol. Hij heeft 25% meer levenspunten en geneest zichzelf (2 HP per seconde, maar pas na 4 seconden zonder treffer), maar loopt 15% trager, een Medic kan hem niet genezen, en de Swarm kan hem niet in een cocon stoppen. Sneuvelt hij een tweede keer, dan blijft hij voorgoed rusten (*Fell twice · at rest*). Was het je eigen soldaat en heb je nog geen nieuwe, dan wordt hij weer je eigen soldaat. Instellingen in `RISEN`.
- **Start fresh** (onderaan de Field Manual, twee keer klikken) wist alles wat het spel in je browser bewaart: campagne, veteranen, je eigen soldaat, Cenotaph, moeilijkheidsgraad, keuze bij een nederlaag, zombie mode en alle muziek-, geluids- en stemmeninstellingen. Je eigen kaarten uit de kaarteditor blijven, tenzij je het vakje aanvinkt; je trofeeënmuur blijft, tenzij je *Keep my trophy wall* uitvinkt. Daarna herlaadt het spel.
- De **Field Manual** is ook te openen vanuit het pauzemenu (*Field manual*); *Back* of Esc brengt je terug naar het pauzemenu, en tijdens een missie blijft de muziek stil.
- **Reset veterans** (knop op het Veterans-scherm, twee keer klikken) wist het rooster en de Cenotaph, maar niet je campagnevoortgang. **Reset campaign** wist allebei.
- **Unieke namen:** geen twee soldaten hebben dezelfde naam: niet in het rooster, niet op de Cenotaph en niet in de lopende missie. Pas als alle namen uit `SURNAMES` op zijn, krijgt een nieuwe soldaat een voorletter ("J. Torres"). Een bewaard rooster met dubbele namen wordt bij het laden rechtgezet.
- **Reset campaign** wist ook het rooster. In skirmish wordt niets bewaard.
- Instelbaar bovenaan in de code: `RANKS`, `VET_XP`, `ROSTER_MAX` en de namenlijst `SURNAMES`.

### Selectiepaneel en knoppen
- Bovenaan het selectiepaneel staan **groepschips**: *1 5/7* betekent dat 5 van de 7 leden van groep 1 geselecteerd zijn; groen is precies die groep. Elke eenheid toont in haar vakje de nummers van de groepen waarin ze zit.
- Geselecteerde troepen staan **gegroepeerd per type**, altijd in dezelfde volgorde (Trooper, Gunner, Pyro, Medic, Engineer …), met het aantal bij elke groep en de meest ervaren eerst. Klik op de groepsnaam om alleen dat type te selecteren.
- De knoppen staan in **rijen met een label**: Orders (A, H, Q, S), Formation (Z, X, V, I, W, Y, F, E), Build (R, T, B), Sentry (U, D), en bij gebouwen Train of Dropship.

### Kraters
- Kappa Basin, Tycho Maw, Ridgeback Canyon en Hollow Colony hebben **inslagkraters** met een verhoogde rand. Je kan niet over de rand: je moet erom heen of via een **helling** (gestreepte strook) naar binnen. Grote kraters hebben twee hellingen, kleine één.
- In sommige kraters liggen kratten of een relay pad: de moeite van de omweg waard, maar je moet ze verdedigen via die ene ingang.
- Op de minimap zie je de kraters als lichte ringen.
- Een kraterrand of helling teken je zelf met `)`, `_` en `:` (zie de kaartlegende).

### Plateaus
- Plateaus zijn verhoogde vlaktes, omringd door **kliffen** waar je niet over kan. De enige weg naar boven is een gestreepte **helling**. Dat maakt ze makkelijk te verdedigen en traag om te bereiken, voor beide kanten.

### Uplink-bakens (missie 8)
- Ga met eenheden naast een baken staan zonder Swarm in de buurt: na 20 seconden is het van jou (ring wordt groen).
- Staat de Swarm er alleen bij, dan loopt de ring terug en verlies je het baken na 15 seconden (rood). Zijn beide partijen er, dan is het betwist (oranje).
- Bakens zijn markeringen op de grond: je kan erover lopen en de vijand kan ze niet vernietigen.
- Instelbaar bij `BUILDINGS.uplink`: `captureTime`, `loseTime`. In een missie: `start.uplinks:[ ['1','Naam'], … ]`.

### Nooit vastzitten
- Een gebouw mag nooit een doorgang afsluiten: het spel weigert een plek als de vrije tegels rond het gebouw daarna niet meer met elkaar verbonden zijn.
- Raakt een eenheid toch ingesloten in een klein stukje kaart, dan wordt ze binnen 2 seconden naar de dichtstbijzijnde open ruimte verplaatst (groene flits).
- Alle relay pads op alle kaarten zijn nagekeken, zodat een toren er nooit iets kan afsluiten.
- **Vastgelopen tijdens het lopen:** komt een eenheid 0,7 seconde niet dichter bij haar volgende tussenpunt (tegen een kraterrand of hoek, of klem tussen vrienden), dan mag ze even door vrienden heen glippen en plant ze een nieuwe route langs tegelmiddens. Lukt dat niet, dan stapt ze terug naar het midden van haar tegel en probeert ze opnieuw. Getest met 1000 tochten in en uit kraters: geen enkele bleef hangen.

### Economie
- **Salvage** krijg je uit Relay Towers (1,2 per seconde) en uit kratten. Een krat raap je op door erover te lopen.
- **Relay Towers** bouw je enkel op de gele relay pads. Elke toren geeft +4 supply.
- **Supply:** de Command Post geeft 12, het maximum is 50. Bij "—" is er geen Command Post.

### Gevechtsprioriteit
Eenheden schieten altijd eerst op **vijandelijke eenheden** en pas daarna op gebouwen, ook als je zelf een hive als doelwit aanklikte. Zijn de aanvallers dood, dan gaan ze vanzelf verder op het gebouw. Dezelfde regel geldt voor de Swarm.

### Formatie
Een groep die je verplaatst houdt zijn vorm: elke eenheid bewaart haar positie ten opzichte van het midden van de groep. De hele groep loopt op het tempo van de traagste eenheid.
- Staat de groep te ver uit elkaar (`maxRadius`), dan schuift ze samen tot een blok.
- Staan eenheden te dicht op elkaar (`minGap`), dan worden ze ook netjes in een blok gezet, zodat er nooit eenheden onzichtbaar op elkaar staan.
- Valt een plek op een rots, dan neemt die eenheid de dichtstbijzijnde vrije plek.

### Tactische formaties
Selecteer minstens twee eenheden en druk **Z** (cirkel), **X** (wig/speer), **V** (vierkant), **I** (lijn), **W** (zigzag) of **Y** (je eigen formatie). Dezelfde knoppen staan ook op de commandokaart.
- **Lijn:** iedereen schouder aan schouder, ruim uit elkaar, zodat elk geweer kan vuren. **Zigzag:** een lijn in twee rijen die verspringen, zodat de achterste rij door de gaten van de voorste schiet; iets dichter bij elkaar dan de lijn, en de twee rijen staan kort achter elkaar.
- **Sweep:** een lijn die aanvalt (A + klik, of een squad in aanvalshouding die je verplaatst) breekt niet uit de rij om vijanden achterna te gaan. Ze stappen samen op, op het tempo van de traagste, en vuren al lopend. Op hun bestemming vechten ze gewoon verder.
- **Eigen formatie (F en Y):** zet de soldaten met de hand waar je ze wil, selecteer de squad en druk **F**. Hun posities (en de kijkrichting van hun formatie, anders noord) worden je eigen formatie. **Y** zet elke squad daarna in die vorm: elke plek onthoudt het type (Medic naar de Medic-plek, anders naar een ondersteuningsplek, anders eender waar). Meer soldaten dan plekken: de rest staat erachter. De formatie blijft bewaard voor latere missies (`hc-myform`). Zonder bewaarde formatie is Y grijs.
- **Afstand (E):** wisselt tussen normaal, ruim (×1,4: beter tegen spuwers en ontploffingen) en dicht (×0,75: voor smalle gangen). De letter op de knop toont de huidige afstand. Werkt ook voor je eigen formatie.
- **Terug in de rij:** stapt een Engineer uit de formatie om iets te herstellen, of een Medic om iemand te verzorgen, dan gaat hij daarna terug naar zijn plek. Is de squad intussen verder gestapt, dan gaat hij naar zijn plek op de nieuwe positie.
- **Iemand apart wegsturen:** stuur je één soldaat uit een formatie ergens heen (bv. de Medic buiten de cirkel), dan verlaat hij de formatie en blijft hij waar je hem zet. Stuur je er twee of meer samen weg, dan houden die de vorm onder elkaar; de rest blijft in de oude formatie.
- **Groepen onthouden hun formatie:** sla je een groep op (Ctrl+N) terwijl die in formatie staat, of geef je een groep een formatie terwijl precies die groep geselecteerd is, dan onthoudt de groep die vorm. Druk je later het nummer, dan gaat de groep er meteen weer in staan. De groepschip toont het teken van die formatie (bv. *2 ∿ 3/3*). Bij beide staan Medics en Engineers erachter, in een rij met de Medics in het midden en de Engineers aan de zijkanten. Vorm je een lijn of zigzag terwijl er een vijand in zicht is (tot 14 tegels), dan kijkt ze meteen naar de dichtstbijzijnde.
- **Richting kiezen:** houd de rechtermuisknop ingedrukt waar de squad moet staan en sleep in de richting waarin ze moet kijken. Tijdens het slepen zie je de plekken en een pijl. Een gewone rechtsklik (zonder slepen) werkt zoals altijd; dan kijkt de formatie in de looprichting.
- **Kleine groepen:** heeft een cirkel of vierkant minder dan vier strijders, dan staan Medics en Engineers mee op de rand (afwisselend met de strijders); anders zou de groep in een rechte lijn staan.
- **Ondersteuning in het midden:** Medics, Engineers en escortes (zoals Dr. Maas) staan beschermd in het centrum. Bij de wig staan ze net achter de punt.
- **Wig:** Pyros komen vooraan, dan Gunners, en Troopers vullen de vleugels. De punt wijst altijd in de looprichting.
- **Cirkel en vierkant:** elke strijder neemt de dichtstbijzijnde plek op de rand.
- De squad **houdt de formatie** bij elke verplaatsing en attack-move, en draait mee met de looprichting.
- Druk dezelfde toets nog eens om de formatie los te laten. Selecteer je een groep met eenheden die niet in de formatie zaten, dan gebruikt die groep de gewone formatie.
- De vormen staan in `FORMATIONS` en `formationSlots()` in de code. De afstand tussen eenheden volgt `FORMATION.spacing`.

### Medic: triage
De levensbalken hebben drie zones: **rood** (≤ 25%), **oranje** (25–50%) en **groen** (> 50%).
1. De Medic behandelt eerst de dichtstbijzijnde gewonde in het rood.
2. Komt zijn patiënt in het oranje terwijl iemand anders nog in het rood ligt, dan schakelt hij over.
3. Daarna doet hij hetzelfde met de oranje gewonden, en pas dan maakt hij iedereen volledig beter.

De Medic draagt een **licht pistool** (bereik 3, 2 schade). Genezen gaat altijd voor: hij schiet alleen als er niemand in de buurt behandeling nodig heeft. Bij een aanvalsbevel volgt hij de groep op korte afstand in plaats van mee naar het doelwit te lopen.

### Engineer
- **Automatische reparatie:** een Engineer zonder bevel herstelt beschadigde gebouwen binnen 7 tegels en maakt bouwplaatsen in de buurt af.
- **Limiet per missie:** een missie kan bepalen hoeveel Sentry Guns er tegelijk in het veld mogen staan (`limits:{ sentry:3 }`). Gebouwde, in aanbouw en onderweg zijnde sentries tellen mee; een ingeklapte sentry op de rug van een Engineer telt niet. Zo moet je er eerst één inpakken voor je verder kan. De commandoknop toont de stand, bijvoorbeeld `2/3`.
- **Sentry Gun meedragen:** druk **U** en klik op een Sentry Gun (of rechtsklik op een onbeschadigde). Inklappen duurt 2 s. De Engineer loopt dan op 60% snelheid. Met **D** stel je hem weer op in 3 s; dat kost niets en de schade blijft behouden. Sterft de Engineer onderweg, dan is de Sentry verloren.

### The Swarm
- Hives maken bewakers aan zolang er biomassa is. In sommige missies komen er ook **aanvalsgolven** die steeds groter worden.
- **Spitters** verschijnen na 2 minuten, **Brutes** na 5 minuten (instelbaar met `unlock`).
- **Ingegraven aanvallen:** zijn alle hives vernietigd, dan stoppen de scriptgolven niet meer. De Swarm graaft zich dan op uit de grond, op een plek die je niet ziet, 12 tot 22 tegels van het doel en minstens 9 tegels van je troepen (stofwolk, donkere vlek). In *High Ground* gaan ook de gewone golven zo door (`swarm.burrows:true`), maar alleen zolang er niet al te veel Swarm op het veld is.
- **Hives groeien terug** (6 hp per seconde) als ze 12 seconden niet geraakt zijn. Even aanvallen en weglopen helpt dus niet; doorduwen wel. Instelbaar met `regen` en `regenDelay` bij `BUILDINGS.hive`.
- **Cocons:** lunar fauna die door de Swarm sterft **op de schimmel**, wordt een cocon die na 5 seconden uitkomt (een Crawler); daarbuiten komt er niets uit. Gesneuvelde soldaten volgen hun eigen regels (zie *De gevallenen* bij Veterans). Pyros doen drievoudige schade aan cocons.
- **De schimmel (creep):** rond elke hive groeit een paarse, levende laag, van 3 tegels naar 11 tegels in tweeënhalve minuut, met aders en groene puisten. Swarm-eenheden die erop staan, **genezen** 4 HP per seconde (een paars plusje). Valt de hive, dan verwelkt de schimmel in een tiental seconden. Instellingen: `CREEP` in js/engine/25-hive-life.js; per missie of per hive `creep:<tegels>`.
- **De Bloater:** een grazer (lokale fauna) die de Swarm op haar schimmel doodt, wordt een cocon waaruit een **Bloater** komt: traag, taai (120 HP), zwakke beet, maar bij zijn dood barst hij open: zuur in een straal van 1,8 tegel (28 schade, ook voor de Swarm) en een grote zuurplas. Dood hem op afstand.
- **De Husk:** een gesneuvelde soldaat die op de schimmel door een Grafter is geïnfecteerd. Het **verloop** (instellingen: `HUSK_STAGES`, `MOLT` en `HUSK` in js/engine/25-hive-life.js):
  1. **Infectie:** op de schimmel klampt een Grafter uit een hive-ei zich vast. Het lichaam schokt, kleurt groen en er kruipen groene aders uit (geluid: nat geknaag).
  2. **Cocon:** een lange paarse pod, de helm steekt er nog uit. Hij **klopt als een hart**, steeds sneller, met een paarse gloed en tentakels in de grond. Het laatste stuk komen er barsten in en schudt hij (geluid: hartslag, dan krakend pantser). Na 8 seconden barst hij open: een gil, rondvliegend vlees, een schokje van de camera en *IT LIVES*.
  3. **Twitcher:** kruipt op handen en voeten (40% van de Husk: levenspunten, snelheid 70%, schade 45%). Na 7 seconden **vervelt** hij.
  4. **Shambler:** rechtop, half pantser half vlees (70% levenspunten, 90% snelheid, 75% schade). Na 8 seconden vervelt hij opnieuw.
  5. **Husk:** de eindvorm (150 HP, 10% pantser, zware klauwen, 3 XP, met een brul).
  - **Vervellen** duurt 1,6 seconden: hij staat stil en schudt, zijn huid licht op, de volgende vorm groeit erdoorheen en stukken pantser vliegen eraf (geluid: knakkende botten en gekreun). Ondertussen valt hij niet aan en krijgt hij **50% meer schade**. Dat is je kans.
  - **Zolang hij nog verandert** (Twitcher en Shambler) **blijft hij op de schimmel** van de dichtstbijzijnde hive en verdedigt die: hij valt aan wat op de schimmel komt, maar volgt je er niet af. Is er geen hive meer, dan jaagt hij meteen.
  - De **eindvorm** is een **krijger**: hij verlaat de schimmel en jaagt op je squad. Hij schiet **geen wortel** meer en wordt nooit een hive (alleen je eigen wezen in *The Graft* doet dat nog, met F).
  - **Schreeuw:** brengt een Husk een soldaat neer of doodt hij er een, dan schreeuwt hij (*SCREAM*, een rode schokgolf): de soldaten binnen 3,5 tegels deinzen terug (ze zijn even onderdrukt: trager, zoals onder zwaar vuur). `HUSK_WARRIOR` in js/engine/25-hive-life.js.
  - In het selectiepaneel zie je in welk stadium hij zit (*Twitcher (turning into a Husk)*).
  - **Matriarch:** heeft een volgroeide Husk **4 soldaten** neergehaald of gedood (`HUSK_WARRIOR.matriarch`), dan vervelt hij nog één keer tot een **Matriarch**: groter (×1,5), 340 HP, 20% pantser, met een paarse gloed en *MATRIARCH* boven zijn hoofd. Die vecht niet meer maar loopt naar een rustige plek (minstens 13 tegels van je troepen en gebouwen, 16 van een andere hive, hooguit 34 tegels ver) en **schiet daar 18 seconden wortel**. Dood je hem niet op tijd, dan groeit er een **jonge hive** (55% van de levenspunten, 2 bewakers). Per missie hoogstens 2 (`swarm.husks`), en nooit meer hives dan de missie plus één (`swarm.maxHives`). Zijn die grenzen bereikt, dan blijft hij gewoon een zware krijger.

### Landing Zone en troepenlimiet (missie 1, 5, 6, 7 en 8)
- Bij de basis ligt een **Landing Zone**: een markering op de grond met een grote H. Eenheden lopen er gewoon over, de vijand negeert ze en kan ze niet beschadigen, en je kan er niets op bouwen. Klik erop om ze te selecteren. Selecteer ze om versterkingen te bestellen: Trooper, Gunner, Medic, Pyro of Engineer, met dezelfde prijs en sneltoetsen als bij de Command Post.
- Een **dropship** brengt ze na 25 seconden. Bestellingen tijdens de vlucht gaan mee, tot 6 per vlucht. Je ziet het toestel landen, de nieuwe soldaten staan op het platform, en in het selectiepaneel staan de lading en de resterende tijd.
- Rechtsklik op de grond met de Landing Zone geselecteerd om een verzamelpunt te zetten.
- **Troepenlimiet:** je kan nooit meer dan **15 man** tegelijk hebben. Eenheden op het veld en alles wat onderweg is tellen mee. Je kan dus enkel verliezen aanvullen. De bovenbalk toont `Troops 12/15`.
- In **Blackout** ligt de Landing Zone naast de Command Post, en in **Dead Signal** op de plek waar je start. In beide is het maximum het aantal soldaten waarmee je de missie begint (11): je kan dus enkel verliezen aanvullen. In Dead Signal landt de pickup op een tweede platform in het oosten (`g.pad()` en `g.landShip()`).
- **Het dropship** komt schuin van buiten de kaart aangevlogen, met een schaduw die kleiner en scherper wordt naarmate het daalt. Het zet zich met een stofwolk neer op het platform, laat de troepen uitstappen (laadklep open), blijft even staan en vliegt dan weer weg. Bij een pickup blijft het staan tot iedereen aan boord is.
- In **Dust Landing** ligt de Landing Zone op het platform van Kappa Station. Daar bestel je niets: het verhaal stuurt het dropship (`landingZone:{ …, scripted:true }` en `g.airdrop()`).
- In **Brood Mother** traint de Command Post niet; alles komt via de Landing Zone (max. 15 man).
- In **High Ground** ligt de Landing Zone naast de Command Post en kan je op beide plaatsen versterkingen krijgen, samen max. **24 man**.
- In missies met een Landing Zone vervangt de troepenlimiet de supply: Supply is daar verborgen.
- Instellen per missie: `landingZone:{ tx, ty, max, delay }` (positie linksboven, limiet, vliegtijd) en `noTraining:true`. De lading per vlucht staat in `BUILDINGS.lz.cargo`.

### De Brood Mother (missie 7)
- Ze is reusachtig, staat meestal stil en spuwt zuur. Elke paar seconden **chargeert** ze in je linies ("CHARGE!"): trek je mensen dan terug.
- Ze legt eieren die uitkomen als Crawlers of Drones. Brand ze met Pyros voor ze uitkomen.
- Bij 75%, 50% en 25% roept ze haar broed op en wordt ze telkens sneller.
- Wie ze doodt, eet ze op: die eenheid wordt géén cocon.
- Zodra je haar 8 seconden niet raakt, **geneest** ze.
- Bovenaan het scherm staat een levensbalk met de huidige fase.
- Je soldaten pakken eerst de kleinere vijanden rond haar aan en schieten daarna op haar.
- Instelbaar bij `UNITS.broodmother`: `hp`, `damage`, `regen`, `eggEvery`, `eggs`, `spitEvery`, `spit`, `spitDamage`, `chargeEvery`, `chargeTime`, `chargeSpeed`, `rootSpeed`.

### The Grey Hunter (missie 4 en 7)
- Hij is gecamoufleerd: in je zichtveld zie je alleen een flikkering. Je kan hem pas aanvallen wanneer hij net gevuurd heeft, geraakt werd of dichtbij komt.
- Hij jaagt op je sterkste eenheid met plasmaschoten en valt ook de Swarm aan.
- Onder 45% levenspunten trekt hij zich terug en verdwijnt (`retreatAt`).
- In missie 7 duikt er een op met een **wapenstilstand**: hij negeert jou en jaagt op de Brood Mother. Dat doet hij voor de trofee, niet om jou te helpen.

### Duisternis en generatoren (missie 5)
- Een missie met `dark:{ sight:0.5 }` speelt **in het donker**: alle eenheden en gebouwen zien maar de helft zo ver (minstens 2 tegels), en wat je eerder zag, zakt bijna helemaal weg in het zwart.
- **Generatoren** zijn missiegebouwen. Ze starten kapot (5% hp). Engineers herstellen ze (automatisch in de buurt of met rechtsklik). Op 100% gaan ze **online**: ze geven licht in een straal van 9 tegels, en dat gebied zie je dan gewoon.
- Licht trekt de Swarm aan: in Blackout komt er 10 seconden nadat een generator aanslaat een golf op af, en daarna elke 45 seconden zolang hij draait (niet als er al 40 of meer Swarm op het veld zijn).
- **Mijnschachten** (`start.shafts:[punten]`): oude schachten die je niet kan vernietigen. Zolang er nog hives zijn, gebeurt er niets. Zijn alle hives weg, dan komen de golven (en de golven die op licht afkomen) uit de schacht, maar maar 40% zo groot (`WAVES.shaftScale`): hives verbranden blijft lonen. Ze komen uit de schacht die het dichtst bij hun doel ligt, maar nooit uit een schacht waar je soldaten binnen 6 tegels staan. Blackout heeft er drie.
- Een generator die uitgevallen is (offline), laat de Swarm met rust: er valt niets meer aan te breken, want een generator gaat niet kapot. Ze lopen door naar je troepen en de Command Post. Zodra hij weer draait, komen ze er opnieuw op af.
- Zakt een generator onder **60%**, dan valt hij uit. Kapot gaan kan hij niet: hij blijft op minstens 1 hp en moet weer helemaal hersteld worden.
- Boven elke generator staat ONLINE of OFFLINE met het percentage. Instelbaar in `BUILDINGS.generator`: `hp`, `startHp`, `failAt`, `light`.

### Seismische ladingen en instortingen (missie 6)
- Een **ladingplek** (rood-zwart kader) maak je met `g.chargeSite(punt, tag)`. Een Engineer die er **stil op staat**, maakt de lading scherp in 20 seconden (ARMING %). Loopt hij weg, dan blijft de voortgang staan.
- De **lading** zelf (320 hp) ontploft na 75 seconden. Boven de lading telt de tijd af. Engineers kunnen ze repareren. Wordt ze vernietigd, dan komt de plek terug en moet je opnieuw beginnen.
- De ontploffing doet 450 schade aan alle vijanden binnen 4,5 tegels en laat het beeld schudden.
- `g.bury(punt, straal)` laat de grond **instorten**: hives bij dat punt sterven en er komt puin (onbegaanbaar) op de grond, behalve onder soldaten. Wie daardoor afgesneden raakt van het startpunt, wordt automatisch uitgegraven naar de dichtstbijzijnde open grond.
- Instelbaar in `BUILDINGS.chargesite` (`armTime`) en `BUILDINGS.charge` (`hp`, `fuse`, `blast`, `blastDamage`).

### Sfeer en tactiek
- **Motion tracker** (rechtsonder, aan/uit met **K** of de knop *Tracker*): een radar rond je geselecteerde squad (of het midden van het scherm als je niets selecteert). Alles van de Swarm dat binnen 20 tegels beweegt, verschijnt als stip, ook in het donker of achter rotsen. Onderaan staat de afstand tot het dichtstbijzijnde contact in meter (rood onder 12 m). Hoe dichter, hoe sneller en hoger de piep. Een gecamoufleerde Grey zie je er niet op.
- **Zuurbloed:** een Swarm-wezen dat sterft, spat zuur op soldaten binnen 1,2 tegels (6 schade, Brute meer, Brood Mother veel meer) en laat een plas achter die 3 seconden blijft branden. Wie erin staat, verliest hp. Afstand houden loont, Pyros lopen meer risico.
- **Dekking:** staat er rots of een gebouw tussen een soldaat en een vijand die van ver schiet (Spitter, Grey Hunter), dan krijgt die soldaat 40% minder schade. Af en toe zie je "COVER". Tegen beten en klauwen helpt dekking niet.
- **Onderdrukkingsvuur:** een vijand die door een **Gunner** geraakt wordt, loopt 1,4 seconden bijna half zo snel (blauwe pijltjes boven het wezen). Gunners houden zo een stormloop op.
- **Fakkels** (**L**, dan klik): een Trooper, Gunner of Pyro gooit een fakkel tot 9 tegels ver. Ze brandt 45 seconden en verlicht een straal van 6 tegels. Je hebt er 3 per missie, 6 in donkere missies (instelbaar per missie met `flares:`).
- **Stemmen:** soldaten zeggen iets bij selecteren, bewegen, aanvallen, het eerste contact, bij zware verwondingen, wanneer een kameraad sneuvelt (met zijn naam), bij genezen, bouwen en fakkels. Een tekstballon met een radioklikje, en de zin wordt ook **uitgesproken** met de spraakstemmen van je browser (elke soldaat zijn eigen stem en toonhoogte). Aan/uit met **O** of de knop *Voices*, het volume met de schuif *Vol* ernaast (standaard 30%, onthouden in je browser); *Sound off* zet ze ook stil. Nooit meer dan één zin per 1,6 seconden. De zinnen staan in `VOICE` (js/content/veterans.js).
- **Een Swarm met een plan:** een golf van minstens 6 wezens kiest een aanpak: **recht op je af**, **lokaas** (de snelste paar komen eerst, de rest wacht 9 seconden en valt aan terwijl jij achter het lokaas aan zit) of **flank** (de helft maakt een boog en komt van opzij). De eerste keer waarschuwt Kessler of Dr. Maas je. Verhouding instelbaar in `TACTICS` (js/engine/12-swarm-director.js).
- **Bevelen** (in deze volgorde): **Attack** (A), **Defensive** (H), **Cancel order** (S) en **Flare** (L). Attack en Defensive zijn een **houding** die blijft tot je ze wijzigt:
  - *Attack*: klik een plek of vijand; daarna wordt elke gewone verplaatsing (rechtsklik) een aanvalsbeweging: ze stoppen onderweg om te vechten. Een rood streepje boven geselecteerde soldaten toont het.
  - *Defensive*: ze houden hun plek en schieten alleen op wat binnen bereik komt. Verplaats je ze, dan lopen ze (en schieten terug), en op de nieuwe plek houden ze weer stand. Een oranje streepje toont het.
  - *Cancel order* stopt het huidige bevel en zet de houding terug op normaal. Medics en Engineers nemen de aanvalshouding niet over.
  - **A** kiest altijd een nieuw doel, ook als de squad al aanvallend staat; nog eens A terwijl je kiest, annuleert de keuze. De aanvalshouding zet je uit met S (of je vervangt ze door H). **H** is een schakelaar: nog eens drukken zet de defensieve houding uit.
  - Een **Engineer** in de defensieve houding blijft zelf gebouwen en Sentries in de buurt herstellen (binnen 7 tegels) en houdt daarna stand waar hij staat.
  - **Q (vuur inhouden)** is een schakelaar: de soldaten schieten niet meer uit zichzelf, ook niet terug als ze beschoten worden. Wat je met rechtsklik aanvalt, beschieten ze wel. Handig om langs een nest te sluipen zonder het wakker te maken. Het blijft aan na verplaatsingen en samen met H; nog eens Q, of A of S, zet het uit. Een blauw streepje boven hun hoofd toont het.
  - Een gemengde groep kan: bv. de squad defensief en je eigen Engineer aanvallend. Selecteer je daarna alles en druk je H of A + klik, dan krijgt iedereen die houding (een Medic volgt bij aanval de groep). Er staat altijd maar één knop tegelijk aan: kies je A en daarna H, S of L, dan vervalt de vorige keuze. Esc of rechtsklik annuleert een keuze die nog op een klik wacht.
- **Aanwijzen:** ga je met de muis over een soldaat in het selectiepaneel onderaan, dan licht hij op de kaart geel op (gele ring, pijl erboven, helderder figuurtje) en knippert zijn stip op de minikaart. Over de naam van een groep (bv. *Trooper 4*) licht de hele groep op.
- **Vuren onderweg:** een soldaat met een **verplaatsbevel** blijft lopen, maar schiet onderweg op vijanden binnen zijn bereik, wel 1,35× trager dan stilstaand (`SQUAD.moveFire.rate`). Wil je dat ze stoppen en vechten, gebruik dan een aanvalsbeweging (A + klik).
- **Persoonlijke veteranen:** sneuvelt een soldaat met een rang of met missies achter de rug, dan meldt de radio het: *"Sgt. Van Damme has fallen. 4 missions, 37 kills."* Op het eindscherm en op de Cenotaph staan bij elke gesneuvelde zijn type, de missie waarin hij viel, zijn aantal missies en kills, en de datum. Ook wie pas in die missie een rang haalde, komt op de Cenotaph.
- Alle getallen staan samen in `SQUAD` bovenaan js/engine/22-squad-life.js.

### Camera volgen
Na een verplaats- of aanvalsbevel schuift de camera mee met je geselecteerde squad. Scroll je zelf, dan stopt het volgen tot je volgende bevel. Aan/uit met **C** of de knop **Follow**; je keuze wordt onthouden.

### Geluid
**Muziek.** Op de menuschermen speelt zacht een soundtrack die, net als de geluiden, live in de browser wordt opgewekt (Web Audio, geen audiobestanden). Tijdens een missie zwijgt ze, tenzij je bovenaan op **Music** klikt: dan speelt je menumuziek (of shuffle/autoplay) zachter op de achtergrond, op 45% van het muziekvolume (`GAME_MUSIC_LEVEL` in js/engine/24-music.js). Die keuze wordt onthouden (`hc-game-music`). De muziek wordt een paar keer per seconde vooruit ingepland; dat vraagt weinig van de computer. Rechtsonder op de menuschermen: **♫ Tracks** (de muziekspeler), *Music on/off* en een volumeschuif (standaard 30%). Browsers laten pas geluid toe na een klik of toets; daarom opent het spel op een **startscherm** (*Click or press any key*), en met die eerste klik begint de muziek meteen. Staat de muziek uit, of laat de browser geluid al toe, dan valt het startscherm weg. Naast de knoppen staat een **now playing**-balkje: titel, deel, tijd en een voortgangsbalkje; het licht op als er een ander stuk begint (handig bij shuffle) en opent de muziekspeler als je erop klikt.

**De muziekspeler** (*♫ Tracks*) klapt een venster open met alle stukken. Met ▶ beluister je er een (het blijft spelen tot je ■ drukt, ook als je van scherm wisselt); met *☆ Menu* kies je wat er op de menuschermen speelt; **▶▶ Autoplay** (in de balk rechtsonder) speelt de stukken na elkaar in de volgorde van de lijst, te beginnen bij je gekozen menustuk; na het laatste begint de lijst opnieuw. **⤨ Shuffle** (in de balk rechtsonder, en onderaan het venster) laat alle stukken afwisselen, met een overgang na elk stuk; standaard staan autoplay en shuffle uit, en er kan er maar één tegelijk aan. Kies je met *☆ Menu* een vast stuk, dan gaat shuffle uit. Je keuzes worden onthouden (`hc-music-track`, `hc-music-shuffle`, `hc-music-auto`). Esc of ✕ sluit het venster.

Bovenaan het venster staat een **tijdlijn** van het stuk dat speelt: een blok per deel (Ruins, Doom, Black …), een afspeelkop, en de tijd (verstreken / totaal). Klik op een blok om naar dat deel te springen. In de lijst staat bij elk stuk hoe lang één doorloop duurt (bij Hollow Light wisselt dat, omdat de volgorde telkens anders is). De stukken worden live opgewekt en spelen dus eindeloos: na een doorloop begint de volgende, met kleine variaties.

Ook op het **eindscherm** speelt muziek: na een overwinning je menumuziek, na een nederlaag het stuk van de Cenotaph.

| Stuk | Stijl | Tempo | Wat je hoort |
|---|---|---|---|
| Hollow Light | doom, black, industrial | 72 | Het origineel: Ruins (drone, koor), Doom (gitaarmuur, de Eb die pijn doet), Black (tremolo in de galm), Machine (aambeeld, arpeggio, glitches), telkens in een andere volgorde |
| Hollow Light: Drowned | variant, funeral doom | 60 | Trager, een hele toon lager, veel dieper in de galm; geen machine, de lead zingt over de riff |
| Iron Psalm | variant, industrial metal | 84 | De machinekant: palm-muted chugs met Eb- en F-accenten, aambeelden en zuigers |
| Event Horizon | space black metal | 68 | Synth-nevels en sterren, dan een muur van tremologitaar met blastbeats ver weg, en een trage drift |
| Selene's Silence | ambient black metal | 60 | Clean gitaararpeggio's in de wind; een storm die aanzwelt, losbarst en weer wegebt |
| Cold Quarters | depressive black metal | 58 | Lo-fi (cassette, gekraak): een eenzaam pianomotief, een huilende lead, slepende drums |
| Dead Satellite | dark ambient | 50 | Geen drums: pulsartikken, morse (SOS, LUNAR, DUST), een drijvende pad |
| Funeral Orbit | funeral doom | 48 | Een processie onder luidende klokken; het zwaarste op de Maan |
| Hollow Light: Starfall | variant · space black metal | 72 | Het black-gedeelte van Hollow Light uitgegroeid tot een volledig nummer: vallende sterren boven het akkoordenschema, een tremolomelodie met een terts erboven, en een storm van blastbeats |
| Mare Tranquillitatis | atmosferische space black metal | 66 | B mineur. Een stille kust van cleane gitaar en sterrenlicht, dan een vloed van tremolomelodie die stijgt tot het apogeum en terugvalt |
| Cold Light of Distant Suns | space black metal | 84 | E mineur. Een pulserende arpeggiator, dan tremolo-gepickte riffs op volle snelheid, een eclips in half tempo en op het einde een aurora in majeur |
| Perihelion | kosmische black metal | 70 | C mineur. Een arpeggiator in een baan rond een black metal-riff, een trage zwaai langs de zon en de brand van de dichtste nadering |
| Briefing / Cenotaph | schermstukken | 72 | Hartslag en radioruis bij de briefing; doodsklok en koor op de Cenotaph, in zombie mode met een valse speeldoos |

Elk stuk is een lijst secties (`TRACKS` in `js/engine/24-music.js`) met eigen tempo (`bpm`), toonhoogte (`tr`, in halve tonen), galm (`rev`) en volume (`gain`); `lofi:true` zet er een cassettefilter op. Een eigen stuk toevoegen: schrijf secties in `SECTIONS` en zet ze in een `plan`.

Alle geluiden worden in de browser opgewekt met de Web Audio API; er zijn geen audiobestanden nodig. Het gaat om wapens, de Medic die geneest, het radarpiepje bij vijandelijk contact, bevelen, alarmen, golven, bouwen en herstellen, cocons, kratten, berichten en een melodietje bij winst of verlies. Geluiden ver buiten beeld klinken zachter. Het geluid start na je eerste klik (een browserregel). Met de knop **Sound** zet je alles uit.

### Doelmarkeringen
Een oranje ruit met label toont waar je naartoe moet. Ze knippert op de minimap, en als het doel buiten beeld ligt, wijst een pijl aan de schermrand de richting aan.

---

## Campagne

| # | Missie | Kaart | Doel |
|---|---|---|---|
| 1 | **Dust Landing** | Kappa Canyons | Volg de brede kloven (minstens 7 tegels breed) vanaf de landingsplaats (twee routes) naar Kappa Station en overleef de hinderlaag uit de oostelijke tunnel. Het dropship landt versterking op het platform van het station. Daarna gaan de blast doors naar de noordelijke grotten open: vernietig de hive in de westelijke grot en daarna die in de oostelijke. De tweede versterking landt op het platform en loopt zelf door de tunnel naar je squad. Breng daarna **iedereen** terug naar het landingsplatform: het dropship vertrekt pas als de hele squad er staat (de doelenlijst telt mee). Tot de deuren opengaan, zijn de hives onbereikbaar en ver buiten schootsafstand. Je speelt zonder basis. |
| 2 | **Hold Kappa** | Kappa Basin | Bouw 2 Relay Towers en houd 15 minuten stand tot het konvooi komt. De Command Post moet overleven. |
| 3 | **Burn the Brood** | Tycho Maw | Vernietig vijf extra stevige hives en houd daarna 2 minuten stand tegen de laatste stormloop. Een **Landing Zone** oostelijk van de Command Post vliegt vervangers in voor wie sneuvelt (hoogstens de 14 waarmee je begint). |
| 4 | **The Hollow Colony** | Hollow Colony | Voor het lab ligt het smeulende wrak van het eerste reddingsschip. Achteraan in het lab gaat een deur open zodra je squad dichtbij komt: Dr. Maas stapt uit en sluit aan. Vind Dr. Elin Maas in het lab en breng haar naar de extraction pad. Houd 4 minuten stand tot het dropship landt, terwijl een Grey Hunter je squad bejaagt. |
| 5 | **Blackout** | Mare Colony | Mijnstadje zonder stroom, **in het donker**. Je ziet maar half zo ver. Herstel met je Engineers de vier generatoren in de hoeken; een draaiende generator verlicht zijn straten maar trekt de Swarm aan, en valt uit onder 60%. Je wint als ze **alle vier tegelijk** draaien. De Command Post in het plein moet overleven. Naast de Command Post staat een kleine **kampgenerator** die vanaf het begin draait en het kamp verlicht (telt niet mee voor het doel). Zijn de hives verbrand, dan blijven de golven komen, maar dan uit drie oude **mijnschachten**. |
| 6 | **Dead Signal** | Ridgeback Canyon | Kleine squad zonder basis. Maak naast drie nesten een **seismische lading** scherp (een Engineer staat 20 s op de plek) en houd elke lading 75 s heel tot ze ontploft; elke ontploffing begraaft het nest. Na elke lading brengt het dropship twee schutters naar je toe. Daarna: iedereen naar het lanceerplatform in het oosten, waar de pickup 90 s later landt. |
| 7 | **Brood Mother** | Maw Depths | Lange missie in de grotten onder Tycho Maw. Bouw een basis bij de grotingang, brand drie zwaar bewaakte eierkamers plat (ze groeien terug als je ze met rust laat) en dood daarna de Brood Mother in haar lair. Het levende membraan voor de lair verdwijnt pas als alle kamers weg zijn. Maximaal 15 man; verliezen vul je aan via de Landing Zone. |
| 8 | **High Ground** | Selene Highlands | Verover drie uplink-bakens op plateaus die je enkel via hellingen bereikt, en houd daarna alle drie tegelijk vast tot de upload van 6 minuten klaar is. Verlies je er één, dan stopt de upload. Tijdens de upload komt er ongeveer elke 35 seconden een golf op een baken (om de derde op twee bakens), maar nooit zolang er al veel Swarm op het veld is. Je start met twee Sentry Guns bij de basis. Versterkingen via de Command Post of de Landing Zone ernaast, max. 24 man. |

**Voortgang:**
- De campagnelijst toont bij elke gewonnen missie de **moeilijkheidsgraad** (Easy, Normal of Hard) en je beste tijd. Win je later op een hogere moeilijkheidsgraad, dan wordt die bewaard. Ook de briefing en het eindscherm tonen het.
- **Reset campaign** onderaan de campagnelijst wist alle voortgang. Je moet twee keer klikken binnen 4 seconden, zodat het niet per ongeluk gebeurt.

De missies zijn nu bewust langer gemaakt. Sentry-limieten per missie: Hold Kappa 4, Burn the Brood 5, The Hollow Colony 1, Brood Mother 6, High Ground 8 (waarvan 2 al bij de start). Een missie wordt vrijgegeven als je de vorige wint. De voortgang wordt in de browser bewaard.

### Training (00 in beide campagnes)

Bovenaan de missielijst staat voor elke kant een **training** (*00*). Ze telt niet mee voor de campagne: geen veteranen, geen trofeeën, ze schakelt niets vrij. Elke stap verschijnt op een **kaart** bovenaan het scherm. Het spel **loopt door** terwijl de kaart openstaat, zodat je meteen kan uitproberen wat er staat. Je sluit de kaart met *Got it* of Enter; de volgende kaart komt pas als je de vorige gesloten hebt én gedaan hebt wat ze vroeg (is de stap al gelukt terwijl de kaart open is, dan zegt de knop *Next step*). Met **◀ ▶** blader je terug door de vorige tips; met **Practice again** doe je een vroegere stap opnieuw, daarna ga je verder waar je was. Gesloten kaart terughalen: het tabje **📖 Tips** bovenaan. De stap wacht tot je gedaan hebt wat ze vraagt; een geslaagde stap wordt in de doelenlijst **afgevinkt** (de laatste drie blijven zichtbaar); de doelenlijst toont *Step 3/20: …*. De knoppen waarover de stap gaat (en waar nodig de minimap, de bovenbalk of de doelen) **lichten geel op**. Met **N** sla je een stap over. In de stappen schrijf je toetsen als `[A]` (dan worden ze een toets-icoontje) en geef je met `keys:['A']` en `hl:['#minimap-wrap']` aan wat moet oplichten. Na de training brengt *Next mission* je naar missie 1.

- **Boot Camp** (Lunar Corps, Kappa Basin, 36 stappen; de squad begint in een cirkelformatie, zodat je ziet wie wie is): één soldaat selecteren, de hele squad selecteren, iemand met Shift+klik uit de selectie halen en terug toevoegen, verplaatsen (pas daarna de camera, zodat die ruimte heeft), groep 1 bewaren (Ctrl+1), een vuurploeg als groep 2 (Ctrl+2), de Medic aan groep 2 toevoegen (Ctrl+Shift+2), groep 1 weer oproepen (1), minstens drie andere formaties (X, V, I, W), in lijn of zigzag opstellen met de richting naar het zuiden (rechtsklik slepen), de afstand wijzigen (E), een eigen formatie bewaren en gebruiken (F, Y), een groep die zijn formatie onthoudt, defensief (H), aanvallen (A) op oefendoelen, vuur inhouden (Q), bevelen annuleren (S), een fakkel (L), met de Engineer een Relay Tower op een pad (R), een Sentry Gun (T) en een Barricade (B), een beschadigde sentry herstellen, de sentry inpakken (U) en weer neerzetten (D), daarna de **Landing Zone** (die werkt pas zodra de Relay Tower staat): eerst het verzamelpunt zetten (Landing Zone selecteren, rechtsklik op de markering), dan een Pyro en een Medic bestellen en zien hoe ze na de landing zelf naar dat punt lopen, een Medic die een neergevallen soldaat oplapt, een Pyro die een cocon verbrandt, **elke knop van de bovenbalk** (tracker uit en aan terwijl er Crawlers rondsluipen, camera volgen uit en aan met een verplaatsing, snelheid naar 2× en terug, stemmen uit en aan en het volume, geluid uit en aan, menu openen en verdergaan), en tot slot een oefen-hive met schimmel en eieren.
- **The First Hunger** (de Swarm, Kappa Basin, 19 stappen): camera, een hive aanklikken (het nest), drie brood laten uitkomen (Q W E R), het verzamelpunt verzetten, brood selecteren en verplaatsen, twee soldaten aanvallen (A), een lichaam naar huis brengen (H), kijken hoe een Grafter het lichaam omvormt en de Husk opgroeit, de tactiek op Flank zetten (T), ingraven (B), en dezelfde knoppen van de bovenbalk, en een buitenpost (Relay Tower en Sentry Gun) slopen.
- Een training maak je met `tutorial([ … stappen … ])` (in js/content/missions/_missions.js); elke stap heeft `say`, `obj`, eventueel `mark`, `setup(g)` en `done(g)`. Trainingen staan in `TRAINING.corps` en `TRAINING.swarm` (js/content/missions/t-corps-training.js en t-swarm-training.js).

### De Swarm-campagne (*The Long Hunger*)

Op het campagnescherm kies je bovenaan **Lunar Corps** of **The Swarm** (onthouden als `hc-camp-side`). In de Swarm-campagne speel je hetzelfde verhaal op dezelfde kaarten, maar dan als **de Brood**. Je bent een regisseur: je stuurt geen losse eenheden, maar je beslist wat er uitkomt, waar het verzamelt en waar het toeslaat. De eenheden vechten zelf. De **Lunar Corps** wordt door de computer gespeeld.

**Besturing**

| Toets | Wat |
|---|---|
| `Q` `W` `E` `R` | Een Crawler, Drone, Spitter of Brute laten uitkomen (kost biomassa) bij je **nest**: de hive die je aanklikt, anders de hive het dichtst bij het verzamelpunt. Spitter en Brute komen pas na een tijd vrij. |
| Rechtsklik (zonder selectie), of `G` + klik | Het **verzamelpunt**: nieuwe brood wacht daar (paarse cirkel met vlag). Kan de brood er niet heen lopen (een gesloten deur), dan graaft ze zich door de rots en komt ze 4 seconden later bij het verzamelpunt boven. |
| `A` + klik | **Aanvallen**: alles wat aan het verzamelpunt wacht, gaat naar die plek of dat doelwit. |
| `T` | **Tactiek** wisselen: *Direct* (allemaal recht erop), *Lure* (de snelsten eerst als lokaas, de rest een paar seconden later) of *Flank* (de helft maakt een grote boog en valt van opzij aan). |
| Slepen, klik | Swarm-eenheden **selecteren**. Met een selectie stuurt rechtsklik ze naar die plek (daar wachten ze), of op een vijand: aanvallen. De camera volgt de groep die je stuurt (Follow aan, `C`). `A` + klik stuurt dan alleen de selectie. Groepen bewaren met Ctrl+1–5 werkt ook. |
| `H` | **Oogsten**: de wachtende brood (of je selectie) gaat de gevallenen ophalen die in het veld liggen: per lichaam één drager en één bewaker. |
| `B` + klik | **Ingraven**: 5 eenheden graven zich op uit de grond waar je klikt, minstens 6 tegels van de Lunar Corps. 45 biomassa, daarna 25 seconden wachten. |

- **Biomassa:** elke hive levert biomassa per seconde (`swarm.rate`). Elke soldaat die sterft (ook wie doodbloedt) geeft er 12. Een lichaam dat thuis op de schimmel van een hive belandt, geeft er 20.
- **Limiet:** je kan hoogstens 30 tot 40 brood tegelijk hebben (`swarm.cap`). De paar bewakers die elke hive zelf kweekt, tellen niet mee en kosten niets.
- **Alles uit de Swarm werkt mee:** lichamen infecteren en wegslepen, Husks die als krijgers jagen, schimmel die je eenheden geneest, hives die krijsen en broed uitspuwen als ze geraakt worden.
- **Wat je ziet:** je ziet wat je eenheden, hives en schimmel zien. De bovenbalk toont *Biomass*, *Brood* (jouw brood / limiet) en *Swarm* (alles samen). De radio van de Lunar Corps vang je op als *Intercept*; de stem van de Brood staat in het groen. De motion tracker toont nu de soldaten.
- **De computer (Lunar Corps):** de soldaten houden hun positie, schieten op wat binnen bereik komt en komen helpen als een gebouw of soldaat in de buurt geraakt wordt (14 tegels). Medics lappen op, Engineers herstellen. Het missiescript laat ze verplaatsen, stuurt versterking met het dropship, traint nieuwe soldaten en stuurt aanvalsploegen naar je hives.
- **Moeilijkheid** maakt de Lunar Corps sterker (`SWARM_DIFF` in js/engine/26-swarm-command.js): Easy 85% levenspunten en schade, Hard 125% levenspunten, 115% schade en 35% meer versterking (`g.n(x)` in de scripts). In *Kappa Siege* staan op Easy/Normal/Hard 2/3/4 Sentry Guns.
- **Instelbaar:** `SWARM_PLAY` (limiet, biomassa per kill, ingraven, tunnelen) in js/engine/26-swarm-command.js; per missie in `swarm:{ … }`: `rate`, `cap`, `unlock`, `guardMax`. Extra missievelden: `side:'swarm'`, `start.rally` (eerste verzamelpunt). Extra mission API: `g.corps()`, `g.orderCorps(lijst|'all', punt, 'amove')`, `g.place(type, punt, dx, dy)`, `g.biomass(n)`, `g.brood()`, `g.inbound()`, `g.n(x)`, `g.brood_say(tekst)`. Missies staan in `SWARM_MISSIONS` (js/content/missions/s01-…, s02-…).

| # | Missie | Kaart | Doel |
|---|---|---|---|
| 1 | **The Waking** | Kappa Canyons | De andere kant van *Dust Landing*. Je twee hives zitten achter de blast doors; een kleine brood wacht in de oostelijke tunnel. Squad Dust loopt naar het station, het dropship brengt twee keer versterking, en zodra er een Pyro is, gaan de deuren open en komen ze je nesten platbranden. Laat niemand leven en houd minstens één hive in leven. Optioneel: breng 2 gevallenen naar huis, naar een hive. |
| 2 | **The Graft** | Kappa Canyons | Je bestuurt **één wezen**, van ei tot nest. Een Drone sleept een gesneuvelde van Dust naar het westelijke nest; het ei dat opengaat, ben jij. **Grafter**: rechtsklik het lichaam en klamp je vast. **Cocon**: overleef. **Twitcher**: voed je, dood 3 grazers (een soldaat telt dubbel; je mag ook neergevallen soldaten opeten). **Shambler**: verberg je, blijf 10 seconden lang minstens 11 tegels van elke soldaat (een jachtploeg zoekt je, op Hard met een Pyro; zijn ze verder dan 16 tegels, dan verliezen ze je spoor). **Husk**: zoek open grond, minstens 9 tegels van de Lunar Corps en 12 van een andere hive, en druk **F** om wortel te schieten (12 seconden; je krijgt dan maar de helft van de schade, en het nest stuurt zijn brood om je te beschermen). Groeit het nest, dan win je; sterft je wezen, dan verlies je. X centreert de camera op je wezen. Het nest kan een kleine brood laten uitkomen (Q, W, E). De nestbewakers laten de grazers met rust: die zijn voor jou (`swarm.spareFauna`). Instellingen: `AVATAR` in js/engine/27-training.js. |
| 3 | **Kappa Siege** | Kappa Basin | De andere kant van *Hold Kappa*. De Lunar Corps zit ingegraven rond een versterkte Command Post (dubbele levenspunten) met Sentry Guns, barricades en twee Relay Towers, traint om de minuut een soldaat en stuurt na 4 en 9 minuten een ploeg naar je dichtste hive. Vernietig de Command Post voor het konvooi aankomt (15 minuten). Optioneel: vernietig beide Relay Towers. |

De andere missies volgen. Getest met een eenvoudige automatische speler: op Easy en Normal winbaar, op Hard verloor die.

---

## Opslaan en verdergaan

- In het **pauzemenu** (P of Esc) staat **Save game**: de hele lopende missie wordt in deze browser bewaard (`hc-save`, één plaats: een nieuwe save vervangt de vorige). Je ziet een melding met de missie en de klok.
- In het **hoofdmenu** verschijnt dan **Continue** met de missie, de klok en wanneer je bewaarde. Klik erop en je speelt verder waar je was: elke soldaat, elk gebouw, de schimmel, de golven, je groepen en formaties, de missie-doelen en de tijd.
- Een save blijft staan tot je opnieuw bewaart; je kan dus vaker terugkeren naar hetzelfde punt.
- Trainingen kan je niet bewaren. Werkt voor de Lunar Corps- en de Swarm-campagne en skirmish.
- Hoe: js/engine/30-save.js schrijft de spelstatus `G` als een graaf (elke eenheid één keer, verwijzingen per id; gedeelde objecten zoals een formatie één keer; tabellen als `UNITS` per naam). Functies, canvassen en voorbijgaande effecten worden niet bewaard. Een save is zo'n 50 tot 150 kB.

## Relics: verborgen voorwerpen en oeroude eieren

Op elke kaart van de Lunar Corps-campagne ligt iets verstopt, ver van de gebaande paden (js/content/relics.js).
- **Voorwerpen** (8, één per missie): een blauw gloeiend artefact dat af en toe flonkert. Loop er met een soldaat over en je hebt het. Elk vertelt een stukje van het verhaal (de zwarte doos van het eerste bevoorradingsschip, de mok van de stationschef, de knuffel van een kind uit Mare Colony …).
- **Oeroude eieren** (4: Burn the Brood, Blackout, Dead Signal, Brood Mother): een groot versteend ei met amberlicht. Zet er een soldaat naast zonder Swarm binnen 3,5 tegels en houd het **5 seconden** vast (gele ring): het is van jou. Maar de Swarm wil het ook: na 2,5 tot 5 minuten stuurt de dichtstbijzijnde hive 3 Drones (en later opnieuw als die sneuvelen). Houden zij het **15 seconden** zonder soldaat in de buurt (groene ring), dan **ontwaakt het ei tot een nieuwe hive**.
- Wat je vindt, wordt onthouden (`hc-relics`) en verschijnt niet opnieuw. Ook als je de missie verliest, hou je het.
- **Intel → Relics**: alles wat je vond, met het verhaal; wat je nog niet vond staat er als *???* met de missie waarin het ligt.
- **Trofeemuur**, rij *Relics*: **Archivist** (alle voorwerpen) en **Egg Hunter** (alle oeroude eieren). Op het eindscherm staat wat je die missie vond.
- Instelbaar: `EGG_RELIC` in js/engine/29-relics.js (hoe lang vasthouden, wanneer de Swarm komt, hoeveel Drones).

## Dev-modus (waarden testen tijdens het spelen)

Druk tijdens een missie op **F9** (of de toets links van 1: `²` op AZERTY, `` ` `` op QWERTY). Rechts verschijnt een half doorzichtig paneel.

- **Bovenaan:** *Pause/Run* pauzeert of hervat het spel zonder menu (je kan intussen wel bevelen geven), de snelheid (0,25× tot 4×), ◐ wisselt de doorzichtigheid, en een klik op **DEV** klapt het paneel dicht of open. ✕ of F9 sluit het.
- **Live:** wat er nu gebeurt (tijd, moeilijkheid, hives, golf en wanneer de volgende komt, hoeveel Swarm rondloopt tegenover het maximum, troepen, de grootte van de volgende golf). Je kan salvage, biomassa, fakkels en de tijd tot de volgende golf meteen aanpassen. Knoppen: *Wave now*, *Reveal map* (aan/uit: blijft de hele missie aan), *Heal everyone*, *Kill all roaming Swarm*, *Win mission*, *Lose mission*. Dit geldt enkel voor het lopende spel.
- **Mission:** de instellingen van deze missie (start-salvage, fakkels, Landing Zone, sentry-limiet, en alles van de Swarm: biomassa, ritme, bewakers, aggro, golven, `maxAlive`, `growWaves`, `max`, wanneer Spitters en Brutes mogen komen). Leeg = de standaardwaarde van het spel. Bewaarde waarden gelden enkel voor die missie.
- **Difficulty:** `DIFFICULTY` (Easy, Normal, Hard voor de Lunar Corps-campagne) en `SWARM_DIFF` (voor de Swarm-campagne).
- **Swarm:** `WAVES`, `HIVE_DEFENCE`, `TACTICS`, `CREEP`, `HUSK`, `EGG`, `MOLT`, `SWARM_PLAY`, `AVATAR`.
- **Squad:** `SQUAD`, `FORMATION`, `AURA`, `RISEN`, `VET_XP`.
- **Units:** kies een eenheid of gebouw en pas levenspunten, snelheid, bereik, schade, kosten … aan. Levenspunten veranderen ook voor wie al op de kaart staat; de rest geldt voor nieuwe eenheden.
- **Uitleg:** ga met de muis over de naam van een waarde (of klik in het vakje): onderaan in het paneel staat wat ze doet, in welke eenheid, en de standaardwaarde. De teksten staan in js/engine/28-dev-help.js (`DEV_HELP`).
- Elke wijziging werkt **meteen**. Een gewijzigde waarde staat in oranje met een ↺ om ze terug te zetten. Onderaan staat hoeveel waarden afwijken en of ze bewaard zijn.
- **Save** bewaart alle wijzigingen in deze browser (`hc-dev-tune`); ze worden voortaan bij het laden van het spel toegepast. **Reset all** zet alles terug en wist de bewaarde waarden. **Export** toont elke wijziging (oud → nieuw, plus JSON) en kopieert ze, zodat je ze kan doorgeven om ze vast in de code te zetten.
- Code: js/engine/28-dev.js (`DEV_ROOTS` bepaalt welke instellingen in het paneel staan, `DEV_MISSION_KEYS` de missie-instellingen).

---

## Kaarteditor

`map-editor/index.html` is een aparte app (uitleg in [map-editor/README.md](map-editor/README.md)) om kaarten te tekenen of aan te passen. Hij gebruikt dezelfde terreintypes en markeringen als het spel.

- **Openen:** de kaarten van het spel, je eigen kladversies, of **Import** (map code, een kaartbestand, of losse tekstrijen).
- **Nieuw:** kies breedte en hoogte, en start van open regolith, willekeurige grotten of massieve rots.
- **Gereedschap:**

| Toets | Gereedschap |
|---|---|
| **B** | Penseel (1, 2, 3, 5 of 7 tegels breed) |
| **U** | Rechthoek |
| **F** | Opvullen |
| **I** | Pipet (neem een tegel over) |
| **C** | Kraterstempel (straal en hellingen N/O/Z/W) |
| **L** | Plateaustempel (straal en hellingen) |

  Terrein kies je met de toetsen **1–8** of in het palet. Markeringen (P, Q, relay pad, krat, grazers, waypoint 0–9, hive a–n) kies je in het palet. Unieke markeringen verhuizen als je ze opnieuw plaatst.
- **Navigeren:** rechts slepen of **Spatie**+slepen om te schuiven, scrollwiel om te zoomen, klikken op het overzicht om te springen. **Ctrl+Z** / **Ctrl+Y** om ongedaan te maken of opnieuw te doen.
- **Controles (live):** startpunt P aanwezig, alles bereikbaar vanaf P, relay pads 2×2 vrij en zonder een doorgang af te sluiten, ruimte voor Command Post en hives, dubbele markeringen, open randen. Klik op een melding om naar die plek te springen. **Unreachable** kleurt onbereikbare stukken rood.
- **Exporteren:**
  1. **Map code:** plak die in het spel onder **Skirmish → Load map code**. De kaart verschijnt dan met het label "CUSTOM" tussen de andere kaarten en blijft in je browser bewaard. Met *Remove* (twee keer klikken) haal je ze weg.
  2. **Kaartbestand:** bewaar het als `js/content/maps/<key>.js` (knop *Download file* of *Copy file*) en voeg de getoonde `<script>`-regel toe aan `index.html`. Dan zit de kaart vast in het spel, bijvoorbeeld voor een nieuwe missie.
- **Kladversies** (Export → *Save as draft*) en je laatste werk worden in de browser van de editor bewaard.

## Opbouw van het project

```
index.html                      HTML van de HUD en de schermen + de lijst met <script>-regels
css/game.css                    kleuren, lettertypes en HUD-layout
js/content/                     SECTION 1 — CONTENT: alles wat je normaal aanpast
  sprites.js                    PALETTE (kleuren) en SPRITES (pixel-art als tekstrijen)
  units.js                      UNITS, BUILDINGS, MAX_SUPPLY
  veterans.js                   RANKS, PERKS, AURA, RISEN, VET_XP, ROSTER_MAX, SURNAMES, VOICE
  intel.js                      INTEL_TABS, INTEL_NOTES (het Intel-scherm)
  difficulty.js                 DIFFICULTY
  maps/_maps.js                 legende van de kaarttekens + const MAPS = {}
  maps/<key>.js                 één kaart per bestand: MAPS.<key> = { name, desc, layout }
  missions/_missions.js         uitleg van de missievelden + const MISSIONS = []
  missions/NN-<id>.js           één missie per bestand: MISSIONS.push({ … })
  skirmish.js                   startopstelling voor skirmish
js/engine/                      SECTION 2 — ENGINE, in genummerde blokken
  00-core.js … 27-training.js basis, sprites en art, geluid, kaarten, spelstatus, entiteiten,
                                (22-squad-life.js: tracker, zuur, dekking, fakkels, stemmen, gedenkteksten)
                                pathfinding, beweging, gevecht, gedrag, gebouwen, economie,
                                Swarm-AI, fog of war, mission API, update, berichten, tekenen,
                                HUD, bevelen, invoer, schermen, hoofdlus, muziek
                                (25-hive-life.js: schimmel rond hives, eieren, Husks)
                                (26-swarm-command.js: spelen als de Swarm, de Lunar Corps als computer)
                                (27-training.js: één wezen besturen van ei tot hive)
map-editor/                     de kaarteditor (leest de kaarten uit js/content/maps/)
```

**Hoe het laadt:** het zijn gewone `<script>`-bestanden (geen modules), daarom werkt het ook rechtstreeks vanaf je schijf (`file://`). Alle bestanden delen dezelfde globale namen (`MAPS`, `MISSIONS`, `UNITS`…). De volgorde in `index.html` telt:

1. eerst de content, dan de engine;
2. `_maps.js` vóór de kaarten en `_missions.js` vóór de missies;
3. de volgorde van de missieregels is de volgorde van de campagne (de nummers in de bestandsnamen zijn er enkel voor het overzicht);
4. de engineblokken in hun nummervolgorde. Code die meteen bij het laden iets uitvoert (niet in een functie) mag alleen dingen gebruiken uit eerdere bestanden; het opstarten zelf gebeurt in `23-main-loop.js`; `24-music.js` (de soundtrack) laadt daarna en start pas bij je eerste klik.

---

## Inhoud toevoegen

### Een nieuwe kaart
De makkelijkste weg is de [kaarteditor](map-editor/README.md). Met de hand kan ook:

1. Kopieer een bestand in `js/content/maps/`, bv. `kappa.js` → `ridge.js`.
2. Pas de sleutel aan (`MAPS.ridge = {`), de `name`, de `desc` en teken een nieuwe `layout`. Rijen mogen verschillend lang zijn; ontbrekende tegels worden rots.
3. Voeg in `index.html` bij de andere kaarten `<script src="js/content/maps/ridge.js"></script>` toe, en in `map-editor/index.html` dezelfde regel met `../` ervoor.

```js
'use strict';
MAPS.ridge = {
  name:'Ridge Field',
  desc:'One line for the skirmish list.',
  layout: [
    "##########",
    "#P......a#",
    "##########"
  ]
};
```

| Teken | Betekenis |
|---|---|
| `.` `,` `o` `~` `=` | Begaanbaar: regolith, stof, krater, ijs, metalen vloer |
| `#` `^` `*` | Geblokkeerd: rots, hoge rots, kristal |
| `)` | Kraterrand: verhoogd, niet begaanbaar |
| `_` | Kraterbodem: begaanbaar, lager en donkerder |
| `:` | Helling: de ingang van een krater of de weg op een plateau, begaanbaar |
| `&` | Plateau: hoge grond, begaanbaar |
| `%` | Klif: rand van een plateau, niet begaanbaar |
| `R` | Relay pad (linkerbovenhoek van een toren van 2×2) |
| `S` | Salvage-krat |
| `W` | Kudde Grazers (neutrale fauna) |
| `P` `Q` | Startpunten van de speler |
| `0`–`9` | Benoemde punten voor missiescripts |
| `a`–`n` (geen `o`) | Hive-plekken. In skirmish wordt elke kleine letter een hive. |

Een kaart staat automatisch in de skirmish-lijst. Zorg dat alle punten bereikbaar zijn vanaf `P`. Een hive (3×3) en een Command Post (3×3) staan gecentreerd op hun punt en hebben daar vrije ruimte nodig.

### Een nieuwe missie
1. Maak een bestand in `js/content/missions/`, bv. `08-mijn-missie.js` (kopieer gerust een bestaande missie).
2. Voeg in `index.html` na de laatste missieregel `<script src="js/content/missions/08-mijn-missie.js"></script>` toe. De volgorde van die regels is de volgorde in de campagne.
3. Gebruik je een nieuwe kaart, dan moet haar `<script>`-regel bij de kaarten staan (die komen vóór de missies).

```js
'use strict';
MISSIONS.push({
  id:'mijn-missie', title:'My Mission', map:'kappa',
  summary:'Eén zin voor de missielijst.',
  briefing:[ 'Alinea 1.', 'Alinea 2.' ],
  start:{
    salvage:200, camera:'P',
    units:[ ['trooper','P',4], ['engineer','P',1,{carry:'sentry'}] ],  // type, punt, aantal, opties
    buildings:[ ['hq','P'] ],
    hives:['a','b'], hiveHp:2,                                      // optioneel: hives 2× zo sterk
    swarmUnits:[ ['drone','a',4] ]                                  // optioneel: bewakers bij de start
  },
  swarm:{ biomass:60, rate:0.5, guardMax:4, guardEvery:14,
          waves:{ first:120, every:80, budget:70, growth:30 } },    // waves:null = geen golven
  limits:{ sentry:3 },                                              // optioneel: max. aantal per gebouwtype
  landingZone:{ tx:16, ty:44, max:15, delay:25 },                   // optioneel: Landing Zone + troepenlimiet
                                                                    // scripted:true = geen bestelknoppen, enkel g.airdrop()
  noTraining:true,                                                  // optioneel: Command Post traint niet
  dark:{ sight:0.5 },                                               // optioneel: missie in het donker (zie Duisternis)
  flares:4,                                                         // optioneel: aantal fakkels (standaard 3, in het donker 6)
  objectives:[ { id:'doel', text:'Destroy all hives' }, { id:'extra', text:'Find crates', optional:true } ],
  triggers:[
    { when:g=>g.time>1, do:g=>g.say('Cmdr. Varga','Go!') },
    { when:g=>g.hives()===0, do:g=>{ g.complete('doel'); g.win('Victory text.'); } },
    { repeat:true, when:()=>true, do:g=>g.setText('doel',`Destroy all hives (${2-g.hives()}/2)`) }
  ]
});
```

- Triggers worden 4 keer per seconde gecontroleerd. Zonder `repeat:true` gaan ze maar één keer af.
- Je verliest automatisch als je geen eenheden en geen gebouwen meer hebt.
- De `id` moet uniek blijven: de voortgang en het veteranenrooster worden daaraan gekoppeld. Een missie hernoemen kan via `title`.

### Een nieuwe eenheid
1. Teken een sprite in `SPRITES` (`js/content/sprites.js`). Elke letter is een kleur uit `PALETTE` en `.` is transparant. Sprites kijken naar rechts.
2. Voeg een regel toe aan `UNITS` (`js/content/units.js`). Belangrijke velden:
   - `faction`: `'corps'`, `'swarm'`, `'wild'` of `'grey'`
   - `hp`, `speed` (pixels per seconde), `radius`
   - `sight`, `range`, `splash`, `healRange`: in tegels
   - `damage`, `cooldown` (seconden tussen schoten)
   - `attack`: `'bullet'`, `'flame'`, `'acid'`, `'plasma'` of `'melee'`
   - Corps: `cost`, `supply`, `buildTime`, `key` (sneltoets)
   - Swarm: `biomass`, `weight`, `unlock`
   - Speciale vlaggen: `bio` (kan cocon worden, kan genezen worden), `heal`, `builder`, `escort`, `armor` (0–1, deel van de schade dat geblokkeerd wordt), `boss`, `cloak`, `passive`, `scale`, `bonus:{type:factor}`
3. Wil je de eenheid kunnen trainen, voeg ze dan toe aan `trains` van de `hq` in `BUILDINGS`.

### Een nieuw gebouw
Voeg het toe aan `BUILDINGS` in `js/content/units.js` (met `size` in tegels) en teken het in `ART` in `js/engine/01-sprites-art.js`. Wil je dat een Engineer het kan bouwen, voeg het dan toe aan `builds` van de Engineer.

---

## Mission API

In triggers krijg je een object `g` mee:

| Functie | Wat ze doet |
|---|---|
| `g.time`, `g.vars` | Speeltijd in seconden; een vrij object om waarden te bewaren |
| `g.say(wie, tekst)` | Radiobericht tonen |
| `g.addObjective(id, tekst, optioneel)` | Nieuw doel toevoegen |
| `g.complete(id)`, `g.fail(id)`, `g.setText(id, tekst)` | Doel afvinken, laten mislukken of hernoemen |
| `g.spawn(type, punt, aantal, {faction, order, prey, truce})` | Eenheden plaatsen. Geeft een lijst terug. Swarm-`order`: `'hunt'` (standaard), `'guard'` of `'boss'`. `prey`: welke factie een Grey Hunter bejaagt. `truce`: met welke factie de eenheid niet vecht. |
| `g.wall(punt, straal, tag, soort)`, `g.openWall(tag)` | Een tunnel afsluiten (straal 0 = één tegel). `soort` is `'membrane'` (standaard, levend membraan), `'door'` (blast door van het station) of `'rubble'` (puin). Beide zijn onkwetsbaar. `openWall` laat het membraan wegrotten of schuift de deuren open. |
| `g.weakenWall(tag, hp)`, `g.walls(tag)` | Het membraan kwetsbaar maken, zodat je troepen het kunnen wegbranden (optioneel met nieuwe hp per tegel); aantal tegels dat nog staat |
| `g.airdrop([[type, aantal], …], seconden, punt)` | Het dropship vliegt versterking naar de Landing Zone van de missie (zie `landingZone`). Met `punt` doen de nieuwe troepen na de landing een attack-move naar dat punt, bv. om bij de squad te komen. |
| `g.troops()` | Aantal levende Corps-soldaten op de kaart, waar ze ook staan |
| `g.hiveAt(punt)` | Of er bij dat punt nog een hive staat |
| `g.online()`, `g.generatorAt(punt)` | Aantal generatoren dat nu draait; de generator op dat punt (bv. om `label` te zetten) |
| `g.chargeSite(punt, tag)`, `g.charge(tag)`, `g.chargeFuse(tag)` | Seismische ladingplek maken; toestand `'site'`, `'arming'`, `'armed'` of `'blown'`; seconden tot de ontploffing |
| `g.pad(punt, tag)`, `g.landShip(tag, seconden)` | Extra landingsplatform zonder bestellingen; een dropship laat daar landen en laten wachten (pickup) |
| `g.bury(punt, straal, tag)` | Instorting: hives bij het punt sterven, puin op de grond, afgesneden soldaten worden uitgegraven |
| `g.uplinks()`, `g.uplinkOwned(punt)` | Aantal veroverde bakens; of het baken bij dat punt van jou is |
| `g.boss(eenheid, titel)` | Toont de levensbalk van een baas bovenaan |
| `g.alive(lijst)` | Aantal levende eenheden in een lijst |
| `g.near(factie, punt, straal)` | Aantal eenheden van een factie binnen een straal (in tegels) |
| `g.has(type)` | Aantal eigen gebouwen of eenheden van een type |
| `g.hives()` | Aantal hives dat nog overeind staat |
| `g.stat(naam)` | Statistiek: `kills`, `lost`, `crates`, `cocoons`, `built`, `trained`, `hives` |
| `g.where(punt)` | Wereldcoördinaten van een kaartpunt |
| `g.reveal(punt, straal, seconden)` | Gebied tijdelijk zichtbaar maken |
| `g.ping(punt)` | Ping op kaart en minimap |
| `g.marker(id, punt, label)`, `g.unmark(id)` | Doelmarkering met pijl plaatsen of weghalen |
| `g.give(salvage)` | Salvage geven |
| `g.wave(budget, doel)` | Meteen een Swarm-golf sturen. Optioneel `doel` (kaartpunt, tegel `{x, y}` of eenheid): de golf komt dan van de twee dichtstbijzijnde hives en loopt naar dat doel. |
| `g.setTimer(seconden, label)`, `g.timerLeft()`, `g.clearTimer()` | Aftelklok in de bovenbalk |
| `g.win(tekst)`, `g.lose(tekst)` | Missie winnen of verliezen |

Een `punt` is een kaartteken (`'P'`, `'1'`, `'a'`) of een tegelcoördinaat `{x, y}`.

---

## Instelbare waarden

De meeste waarden staan in `js/content/units.js`. Uitzonderingen: `FORMATION` staat in `js/engine/19-commands.js`, `HP_ZONES` in `js/engine/09-unit-behaviour.js`, `DIFFICULTY` in `js/content/difficulty.js`, en de missiewaarden in het bestand van die missie.

| Waar | Waarde | Betekenis |
|---|---|---|
| `FORMATION` | `maxRadius` (4.5) | Hoe ver (in tegels) een groep uit elkaar mag staan voor ze samenschuift |
| | `spacing` (24) | Afstand in pixels tussen eenheden in een blokformatie |
| | `minGap` (14) | Staan eenheden dichter bij elkaar dan dit, dan worden ze in een blok gezet |
| `BUILDINGS.uplink` | `captureTime` (20), `loseTime` (15) | Seconden om een baken in te nemen of te verliezen |
| `HP_ZONES` | `red` (0.25), `orange` (0.5) | Grenzen voor de kleuren van de levensbalk en de triage van de Medic |
| `MAX_SUPPLY` | 50 | Maximale supply |
| missie `limits` | bv. `{ sentry:3 }` | Maximum aantal van een gebouwtype tegelijk in het veld |
| `DIFFICULTY` | `hp`, `dmg`, `budget`, `interval`, `hiveHp` | Factoren voor Swarm-levenspunten, Swarm-schade, golfgrootte (en noodbroed), tijd tussen golven (en hive-kreten) en hive-levenspunten |
| `HIVE_DEFENCE` | `cooldown` (12), `brood` (45), `helpAt` (0,6), `help` (70) | Hoe vaak een hive krijst, hoeveel biomassa zijn noodbroed krijgt, wanneer hij hulp roept en hoe groot die hulpgolf is |
| `UNITS.engineer` | `autoRepair` (7) | Straal in tegels voor automatische reparatie |
| | `carrySpeed` (0.6) | Snelheidsfactor tijdens het dragen |
| | `packTime` (2) | Seconden om een Sentry in te klappen |
| | `repair` (22) | Herstelde hp per seconde |
| `BUILDINGS.sentry` | `deployTime` (3), `portable` | Opsteltijd; of hij meegedragen kan worden |
| `BUILDINGS.relay` | `income` (1.2), `supply` (4) | Salvage per seconde en supply |
| `BUILDINGS.cocoon` | `hatch` (5) | Seconden tot een cocon uitkomt |
| `BUILDINGS.hive` | `regen` (6), `regenDelay` (12) | Teruggroei van hives: hp per seconde, na zoveel seconden zonder schade |
| missie `start` | `hiveHp` | Factor voor de levenspunten van hives in die missie (Brood Mother: 12) |
| `UNITS.broodmother` | `hp` (14000), `regen` (20), `chargeEvery` (10) … | Zie *De Brood Mother* hierboven |
| `UNITS.hunter` | `retreatAt` (0.45) | Bij welk deel van zijn hp de Grey Hunter vlucht |
| `UNITS.medic` | `heal` (9), `healRange` (3.5) | Genezing per seconde en bereik |
| `UNITS.engineer` | `speed` (68 = 2,1 tegels/s, zoals de Medic), `range` (5), `damage` (4) | De Engineer schiet even ver als een Trooper (Spitter: 4,6) en schiet terug terwijl hij bouwt, herstelt of inpakt |
| missie `swarm` | `rate`, `guardMax`, `guardEvery`, `waves` | Groei, bewakers en golven per missie |

---

## Testen en tips

- **Vergrendelde missie spelen:** houd **Shift** ingedrukt en klik op de missie in de campagnelijst.
- **Spelsnelheid** 1,5× of 2× via de knop bovenaan, handig om te testen.
- **Opgeslagen in de browser** (`localStorage`):
  - `hc-roster`: het veteranenrooster en de Cenotaph; `hc-zombie`: zombie mode aan of uit
  - `hc-progress`: per gewonnen missie de hoogste moeilijkheidsgraad, de beste tijd en de datum
  - `hc-diff`: moeilijkheidsgraad
  - `hc-mute`: geluid aan/uit
  - `hc-follow`: camera volgen aan/uit
  - `hc-custom-maps`: kaarten die je via *Load map code* hebt toegevoegd

  Wis de sitegegevens van je browser om opnieuw te beginnen.
- In de browserconsole (F12) is `__hc` beschikbaar voor tests, bijvoorbeeld `__hc.G` voor de spelstatus of `__hc.startMission(__hc.MISSIONS[3])`.
- **Syntaxcontrole** van alle bestanden: `for f in js/content/*.js js/content/*/*.js js/engine/*.js; do node --check "$f"; done`. Een vergeten komma geeft anders een leeg of bevroren scherm; de browserconsole (F12) toont dan welk bestand en welke regel.
- Een fout in een trigger breekt het spel niet af. De fout verschijnt in de console en die trigger wordt overgeslagen.

---

## Bekende beperkingen en ideeën

- **The Grey** zijn nog niet speelbaar als factie (renown-economie, eigen eenheden).
- De muren in de ruïnes van Hollow Colony zijn in het donker soms moeilijk te onderscheiden.
- Het spel is gemaakt voor muis en toetsenbord. Aanraken werkt basaal: tik om te selecteren of een bevel te geven, sleep om te scrollen.
- Mogelijke uitbreidingen: een Swarm-campagne, upgrades en veteranen, de Grey als speelbare factie.
