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

**Spelvormen:** een campagne van 11 missies en skirmish (kies een kaart en vernietig alle hives). Er zijn drie moeilijkheidsgraden: Easy, Normal en Hard.

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
| `creep` | Straal (tegels) die de schimmel rond elke hive uiteindelijk haalt (`0` = geen schimmel; standaard `CREEP.max` = 8) | `6` |

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
  - Trooper, *Grenade*: om de 9 s een granaat (55 schade, straal 1,5 tegel) naar de dichtste groep vijanden rond zijn doelwit, tot 6 tegels ver (`PERKS.trooper.throw`). Zijn geweer schiet niet verder dan gewoon (5 tegels). Op één klein beest gooit hij er geen.
  - Gunner, *Steady aim*: schiet tijdens het lopen even snel als stilstaand.
  - Pyro, *Long flame*: zijn vlammenwerper reikt 1,5 tegel verder.
  - Medic, *Field triage*: geneest naast zijn patiënt ook iedereen rondom zich (aan 60% van zijn snelheid).
  - Engineer, *Quick hands*: bouwt, herstelt en zet ladingen twee keer zo snel.
- **Leiderschap van de Captain** (`AURA`): soldaten binnen 4 tegels schieten 10% sneller en krijgen 10% minder schade; een gestippelde gouden cirkel toont het bereik. Sneuvelt hij, dan **wankelt** de groep: wie binnen 9 tegels stond, schiet 10 seconden lang 15% trager.

- Bij een promotie meldt de radio het, verschijnt "PROMOTED" en krijgt de soldaat een kwart van zijn levenspunten terug. Het rangteken staat boven de soldaat en in het selectiepaneel; daar zie je ook naam, XP, kills en aantal missies.
- **Rooster:** win je een campagnemissie, dan gaan alle overlevenden met XP naar het rooster (max. 30, de meest ervarenen eerst). In de volgende campagnemissie vervangen ze startsoldaten van hetzelfde type. Wie niet meteen een plaats heeft, staat in **reserve** en komt als eerste zodra je dat type traint of via de dropship bestelt.
- **Gesneuveld is gesneuveld:** een veteraan die sterft in een missie die je wint, verdwijnt van het rooster en komt op de **Cenotaph**.
- **Neer, niet dood:** een soldaat op 0 levenspunten valt **neer** (15 seconden): hij ligt op de grond met een rood kruis en een ring die aftelt, en neemt geen bevelen. Een Medic gaat eerst naar de neergevallen soldaten; na 4 seconden oplappen (een groene ring; een Lieutenant-Medic is sneller) staat hij weer op met 30% levenspunten. Komt er niemand, dan bloedt hij dood. De Swarm valt liever wie nog rechtstaat aan. Raakt hem toch iets terwijl hij neerligt (zuur, een plas, een ontploffing), dan kost dat hem tijd in plaats van zijn leven: een treffer zo groot als zijn volle levenspunten kost 10 seconden (`hitTime`), maar treffers brengen hem **nooit onder 6 seconden** (`minLeft`), zodat een Medic altijd tijd heeft om hem te bereiken. Alleen de Brood Mother kan een neergevallen soldaat nog afmaken. Risen soldaten vallen niet neer. Instellingen: `SQUAD.downed`.
- **De gevallenen:** het lichaam **blijft liggen** tot de Swarm het meeneemt of een Pyro het verbrandt. Valt een soldaat vlak aan de voet van een hive (of op de schimmel van een tunnel), dan neemt dat nest het meteen. Elders op de schimmel wordt het nog verder gedragen, tot aan de hive. Komt er 8 seconden niemand voor een lichaam (`SQUAD.body.fetch`), dan stuurt het dichtste nest een Crawler om het te halen, hoe ver het ook ligt. Elke seconde roept het de dichtste vrije Swarm-eenheden (binnen 8 tegels, of 14 als je de Swarm speelt; hive-bewakers blijven bij hun hive):
  - **Eén draagt het naar huis**, **tot vlak naast de dichtste hive** (aan 70% van zijn snelheid), niet tot waar de schimmel begint. Is de weg dicht (een gesloten deur), dan graaft de drager zich met het lichaam door de rots (4 seconden) en komt bij de hive boven. Thuis geeft het lichaam 20 biomassa en geneest de hive 10%. Dood de drager en hij laat het lichaam vallen; een ander pakt het weer op.
  - **Twee andere bewaken het** en vechten tegen wie in de buurt komt.
  - **Pas als er een lichaam in zijn schimmel ligt, legt de hive een ei**, altijd **vlak naast zichzelf** (aan de kant van het lichaam). Een hive heeft geen eieren klaarliggen. Meerdere lichamen: om de 3 seconden een ei, hoogstens 3 tegelijk (`EGG` in js/engine/25-hive-life.js, per hive of missie `eggs:<n>`, `eggs:0` = geen). Uit het ei kruipt een **Grafter** (een kleine parasiet die niet kan vechten), die naar het lichaam rent, zich vastklampt en het in 3 seconden infecteert. Dan wordt het een cocon waaruit een **Husk** komt. **Fauna** gaat dezelfde weg: een grazer die de Swarm doodt (waar ook), laat een karkas achter dat naar de hive gesleept wordt; daar komt een ei, een Grafter, en uit de cocon een **Bloater**.
  - Staat er een soldaat naast het lichaam (1,6 tegel), dan kan niemand het oppakken of infecteren: de Swarm valt eerst die bewaker aan. Een **Pyro** verbrandt het (ook als zijn vlam ernaast landt, ook als het net wordt weggedragen). Schiet ook de eieren en Grafters. Instellingen: `SQUAD.body` in js/engine/22-squad-life.js.
- **Eindscherm, cijfers:** bij de Lunar Corps staan de verliezen apart: *Soldiers lost* (soldaten die sneuvelden) en *Assets lost* (gebouwen en ander materieel: Relay Towers, Sentry Guns, Barricades, ladingen). Bij de Swarm blijft het *Brood lost*.
- **Een nederlaag kost niemand:** verlies je een missie, dan blijft het rooster zoals voor de missie en kan je opnieuw proberen met dezelfde soldaten. Het eindscherm noemt wie viel, met de vermelding dat niemand verloren is. (Real death bestaat niet meer; een oud Real death-rooster in de browser, `hc-roster-rd`, wordt niet meer gebruikt.)
- De knop **Veterans** in de campagnelijst toont links het rooster (een lang rooster scrollt in zijn eigen vak) en rechts de rangen; de knop **Cenotaph** toont de gesneuvelden. De briefing toont wie meegaat. Het eindscherm toont promoties (per soldaat alleen de hoogste rang die hij haalde, en alleen van wie de missie overleefde) en nieuwkomers, **gegroepeerd per rang** (hoogste eerst, namen alfabetisch, je eigen soldaat met ★), en **alle** gesneuvelden van die missie (ook soldaten zonder rang) elk op een eigen regel, gesorteerd op rang, met type, missies en kills. Op de Cenotaph komen alleen de veteranen (wie op het rooster stond of een rang had).
- **Namen:** alleen gewone Vlaamse familienamen, zonder bekende naamgenoten (`SURNAMES` in js/content/veterans.js). De eerste soldaten van een nieuwe campagne heten altijd, in deze volgorde, **Verhelst, Staelens, De Ridder, De Vos en Wolfaert** (`STARTER_NAMES`), zolang die namen vrij zijn. Een bewaard rooster met namen die niet in de lijst staan, krijgt bij het laden nieuwe namen. *Kerckhoffs* staat sinds nov 2026 niet meer in de lijst: die naam hoort bij de Captain van de Osprey (Rogue Strain); een soldaat die zo heette, krijgt bij het laden een nieuwe naam (behalve je eigen held).
- **Wie spreekt:** geef je een groep een bevel of selecteer je hem, dan antwoordt **de hoogste in rang** (bij gelijke rang je eigen soldaat, dan wie de meeste XP heeft).
- **Je eigen soldaat:** bovenaan het campagnescherm staat *Enlist your own soldier*. Geef een naam (2 tot 18 tekens, uniek), kies **man of vrouw** en een type (Trooper, Gunner, Pyro, Medic of Engineer). Man of vrouw bepaalt de **stem**: het spel kiest een mannen- of vrouwenstem uit de stemmen van je browser (bij het kiezen hoor je meteen een proefzin), en heeft je browser er geen van die soort, dan doet de toonhoogte het werk. Ook de radioberichten volgen je keuze (*Soldier down … she has 15 seconds*); man/vrouw kan je altijd wijzigen met *Edit*. Hij gaat mee op elke campagnemissie (hij vervangt een starter van zijn type, of komt er extra bij), draagt een **gouden ster** boven zijn hoofd en verdient rang zoals elke veteraan. Na zijn eerste missie ligt zijn type vast; de naam kan je altijd wijzigen met *Edit*. Sneuvelt hij, dan komt hij op de Cenotaph en kan je een nieuwe soldaat inlijven. Alleen hij kan Captain worden.
- **Trophy wall** (knop *Trophies* in het hoofdmenu, onder Campaign; *Back* brengt je terug naar het hoofdmenu): een muur met een trofee per **rol** (Trooper, Gunner, Pyro, Medic, Engineer) en per kolom **Easy, Normal en Hard**: 15 trofeeën. Je verdient er een als **je eigen soldaat** in die rol **alle campagnemissies wint en uit elke missie levend terugkomt**. Een overwinning op Hard telt ook voor Normal en Easy. De regel is **streng**: de soldaat moet **bij missie 1 begonnen** zijn en de missies **in volgorde** winnen. De voortgang (bv. *Normal 3/8*) is hoe ver die ononderbroken reeks loopt: alleen de volgende missie in de rij telt; een latere missie die je eerder speelt, telt niet (speel ze opnieuw als ze aan de beurt is), een oudere opnieuw spelen verandert niets. Was de eerste missie van je soldaat niet missie 1, dan doet die soldaat nooit mee (*Not on a trophy run*). Ook een opgewekte (risen) soldaat begint opnieuw. De voortgang staat bovenaan de muur, op zijn rij, en na elke gewonnen missie op het eindscherm (*Trophy run*). Sneuvelt hij, dan begint een nieuwe soldaat van nul. Een behaalde trofee wordt goud met de naam en datum; wie daarna dezelfde trofee haalt, komt erbij (*+1 more*). Daaronder de rij **Flawless**: één trofee per moeilijkheid (Easy, Normal, Hard) voor wie een **campagnemissie van de Lunar Corps wint zonder één soldaat te verliezen** (neergaan en opgelapt worden telt niet als verlies; de trainingen en skirmish tellen niet). Een foutloze overwinning op Hard telt ook voor Normal en Easy. De plaquette toont de missie waarmee je hem haalde en hoeveel van de 8 missies je al foutloos speelde; de briefing vermeldt het bij een missie (*Done flawless on Hard*), het eindscherm meldt het (*🏆 Flawless*). Per missie bewaard als `flawless` in `hc-progress`, de trofee als `flawless:easy` … in `hc-trophies` (js/engine/05-entities.js: `flawlessRun`, `checkFlawless`; de soldaten die vallen telt `G.stats.fallen`). Daaronder hangt de **grote trofee** *Hollow Light* (alle 15 rol-trofeeën en de 3 Flawless-trofeeën van de Lunar Corps). (*The Long Hunger* is weg sinds nov 2026: hetzelfde als Devourer.) De muur heeft **vier tabs** (`TROPH_TABS` in 21-screens.js): *Lunar Corps* (het rollenraster, Flawless en Hollow Light), *The Swarm* (*Hatchling*, *Stalker*, *Devourer*: elke Swarm-missie gewonnen op Easy, Normal, Hard), *Rogue Strain* (*Deserter*, *Turncoat*, *Apex Strain* per moeilijkheid, en de vier verhaaltrofeeën) en *Relics* (*Archivist*, *Egg Hunter*). Een winst op Hard telt telkens ook voor de lagere (`SWARM_TROPHIES` in 05-entities.js, `swarm:easy` … in `hc-trophies`). Elke tab toont per trofee wat je moet doen en de datum of de voortgang; de rolvakjes tonen de naam van de soldaat. De tekst links hoort bij de gekozen tab, de teller (31 trofeeën) telt de hele muur; elke tab toont zijn eigen telling. Alles past op één scherm zonder scrollen (ook op 1024×768). Een behaalde trofee meldt het eindscherm. Bewaard in `hc-trophies`; *Start fresh* laat de muur staan tenzij je het vakje *Keep my trophy wall* uitvinkt.
- **Intel** (knop in het hoofdmenu en op het campagnescherm): een overzicht met tabbladen **Lunar Corps**, **Structures**, **Swarm** en **Other**. Links staat per tabblad een lijst (klik, of pijltjes omhoog/omlaag), rechts de volledige kaart van wat je kiest, zodat niets moet scrollen. Per eenheid of gebouw een kaart met figuurtje, beschrijving, een korte veldnotitie, en de cijfers: HP, schade per seconde, bereik, snelheid (tegels per seconde), zicht, kostprijs of XP per kill, pantser, wanneer de vijand verschijnt, en de Lieutenant-vaardigheid. De cijfers komen rechtstreeks uit `UNITS` en `BUILDINGS`, dus pas je die aan, dan klopt Intel vanzelf. Welke eenheden op welk tabblad staan en de veldnotities staan in `js/content/intel.js`. Pijltjestoetsen links/rechts wisselen van tabblad.
- **Cenotaph** (knop op het campagnescherm en het Veterans-scherm): een grafsteen met de naam van elke gesneuvelde, met rang, type, de missie waarin hij viel, missies, kills en datum. Je eigen soldaat staat er met zijn ster.
- **De Osprey op de Cenotaph** (`markOspreyLost`, `ospreyOnStone` in 31-rogue.js, `ospreyLost` en `OSPREY_PILOT` in js/content/rogue.js): zodra de Corps in *The Hollow Colony* bij het wrak van de Osprey komt (of die missie al gewonnen heeft), staat onder de eigen gesneuvelden een tweede blok, **THE OSPREY · LOST WITH ALL HANDS**: Capt. Kerckhoffs, de piloot **Lt. Van Haviksburg** (die echt omkwam bij de crash: *"Pilot's gone"* in *Osprey Down*) en de zes anderen, telkens *Osprey crew, lost at Hollow Colony*. Bewaard als `ospreyLost` in `hc-progress`. In zombie mode hebben zij geen *Raise*: ze zijn niet van de Corps om op te wekken.
- **Lijkwake over de intercom** (`memorialLines` in 22-squad-life.js): open je de Cenotaph, dan klinkt de omroepgong en houdt dezelfde intercomstem als bij de briefing een moment van stilte: *Tycho Memorial. All stations, a moment of silence.*, dan elke gesneuvelde (rang, type, waar hij viel; de oudste eerst), dan de bemanning van de Osprey, en *Their names are cut in stone. They are not forgotten. Tycho out.* Een lege steen: *There are no names on the stone. Keep it that way.* De Requiem zakt zolang de stem spreekt. Knop **Read aloud / Stop voice** op de Cenotaph; het scherm verlaten stopt het. Getest in `tools/tests/intercom.py`.
- **Zombie mode** (Halloween, aan/uit op de Cenotaph, onthouden in je browser): met *Raise* haal je een gesneuvelde terug naar het rooster, met zijn rang, XP en kills. Een **risen** soldaat is groen, gloeit, en praat traag en hol. Hij heeft 25% meer levenspunten en geneest zichzelf (2 HP per seconde, maar pas na 4 seconden zonder treffer), maar loopt 15% trager, een Medic kan hem niet genezen, en de Swarm kan hem niet in een cocon stoppen. Sneuvelt hij een tweede keer, dan blijft hij voorgoed rusten (*Fell twice · at rest*). Was het je eigen soldaat en heb je nog geen nieuwe, dan wordt hij weer je eigen soldaat. Instellingen in `RISEN`.
- **Start fresh** (tab *Start fresh* van de Field Manual, twee keer klikken) wist alles wat het spel in je browser bewaart: campagne, veteranen, je eigen soldaat, Cenotaph, moeilijkheidsgraad, keuze bij een nederlaag, zombie mode en alle muziek-, geluids- en stemmeninstellingen. Je eigen kaarten uit de kaarteditor blijven, tenzij je het vakje aanvinkt; je trofeeënmuur blijft, tenzij je *Keep my trophy wall* uitvinkt. Daarna herlaadt het spel.
- De **Field Manual** staat in tabs (nov 2026), zodat niets moet scrollen: *Controls*, *Field notes*, *Factions* (Lunar Corps, The Swarm en Rogue Strain: de Osprey-crew, de loyale Corps, wanneer de campagne opengaat), *Veterans* (rangen, XP, eigen soldaat, Cenotaph), *Campaigns* (training, de Swarm spelen, Rogue Strain, trofeeënmuur) en *Start fresh*. Pijltjes links/rechts wisselen van tab; de manual opent weer op de tab waar je hem verliet.
- De **Field Manual** is ook te openen vanuit het pauzemenu (*Field manual*); *Back* of Esc brengt je terug naar het pauzemenu, en tijdens een missie blijft de muziek stil.
- **Reset veterans** (knop op het Veterans-scherm, twee keer klikken) wist het rooster en de Cenotaph, maar niet je campagnevoortgang. **Reset campaign** wist allebei. Beide gelden alleen voor de campagne die je bekijkt (gewoon of Real death).
- **Unieke namen:** geen twee soldaten hebben dezelfde naam: niet in het rooster, niet op de Cenotaph en niet in de lopende missie. Pas als alle namen uit `SURNAMES` op zijn, krijgt een nieuwe soldaat een voorletter ("J. Torres"). Een bewaard rooster met dubbele namen wordt bij het laden rechtgezet.
- **Reset campaign** wist ook het rooster en de bewaarde missie van die campagne. In skirmish wordt niets bewaard.
- Instelbaar bovenaan in de code: `RANKS`, `VET_XP`, `ROSTER_MAX` en de namenlijst `SURNAMES`.

### Vuurlijn: rots houdt schoten tegen
- Een **rotswand** (`#`, hoge rots `^`, kristal `*`, klif `%`) en een **membraan** van de Swarm houden geweervuur, zuur van Spitters en vlammen tegen, in beide richtingen. Over **lage rots** schiet je wel: een kraterrand (`)`).
- Wat je beschiet, houdt het schot zelf niet tegen: je kan een membraan of een gebouw nog altijd beschieten.
- Granaten en wat de Brood Mother in een boog gooit (eieren, zuurregen), vliegen erover.
- Een soldaat of Sentry Gun kiest geen doelwit achter de rots; staat zijn doelwit erachter, dan zoekt hij een ander. Geef je zelf een aanvalsbevel op iets achter de rots, dan loopt hij eromheen tot hij vrij kan schieten.
- Zien gaat nog wel door de rots: je ziet de vijand achter een dunne wand, maar je kan er niet op schieten. Code: `fireBlocked` en `FIRE_BLOCK` in js/engine/08-combat.js.

### Animaties (enkel om naar te kijken)
Alles in js/engine/25b-animations.js, de getallen in `ANIM` (dev panel, tab *Effects*):
- **Maanstof en voetsporen:** soldaten laten voetsporen achter (niet op plating of schimmel) die na 7 s vervagen, en bij elke stap een wolkje stof dat traag blijft hangen.
- **Hulzen:** Gunners en Sentry Guns werpen hulzen uit die op de grond stuiteren en 5 s blijven liggen (hoogstens 40).
- **Sentry Gun:** de loop draait mee met zijn doelwit, slaat terug bij elk schot en rookt.
- **Swarm sterft:** een Swarm-eenheid kruipt ineen en smelt in haar zuurplas, met belletjes en wat rook.
- **Brute:** bij elke stap een stofwolk, een ring van zijn stamp, en het beeld trilt licht (`bruteShake`, 0 = uit).
- **Zuur op pantser:** een soldaat die zuur krijgt (Spitter of zuurplons), sist nog 2 s: groene druppels en rook.
- **Medic:** boven een neergevallen soldaat loopt een hartlijn, plat tot een Medic bij hem is; als hij opstaat, een elektrische schok.
- **Promotie:** een gouden glinstering loopt over het nieuwe rangteken.
- **Bouwen:** een gebouw in aanbouw staat in de steigers en rijst uit de grond, met lasvonken zolang de Engineer werkt.
- **Schade aan gebouwen:** onder 75% barsten, onder 50% vonken en rook, onder 25% vuur.
- **Schimmel:** licht loopt van het nest naar buiten door de schimmel, en waar ze groeit, tasten ranken vooruit.
- **Eieren:** de vier blaadjes van het deksel gaan open, er druipt slijm en het binnenste gloeit.
- **Meteorieten:** ongeveer om de 35 s komt er ergens in beeld een kleine meteoriet neer: een streep met een dalend fluitje, een doffe plof, een flits, een kratertje (onschadelijk; `meteorEvery`, 0 = nooit).
- **Spitter laadt op:** voor hij spuwt, zwelt zijn keel een halve seconde groen op (`spitCharge`). Het zuur vertrekt pas daarna: je hebt even tijd om opzij te stappen. Sterft hij intussen, dan komt er geen zuur. (Dit verandert het spel een beetje: vroeger vertrok het zuur meteen. 0 = zoals vroeger.)
- **Swarm geraakt:** bij elke treffer spat groen bloed weg van de schutter.
- **De grond bolt op:** een golf die zich opgraaft (als alle hives weg zijn), blijft eerst 1 seconde onder een opbollende, scheurende plek (`emerge`). Pas dan breken ze uit, met aarde in het rond. Zolang ze onder de grond zitten, kan niemand ze raken en doen ze niets.
- **Rode rand:** krijgt jouw kant in korte tijd zware schade (ongeveer 60 in een seconde, `hurtEdge`), dan kleurt de rand van het scherm rood aan de kant waar de aanval vandaan komt, ook als je camera elders staat.
- **Soldaat valt neer:** hij valt om en zijn helm stuitert weg (ook als hij sneuvelt).
- **Helmlampen** (alleen in het donker, Blackout): elke soldaat heeft een lichtkegel waar hij kijkt (waar hij loopt, of naar zijn doelwit). Wat in de kegel ligt, zie je tot 5 tegels verder dan je korte zicht in het donker Het licht is zacht (`lampGlow`, 0,1) en kegels die overlappen, tellen niet op: een hele squad geeft niet meer licht dan één soldaat (`lamps`, `lampRange`, `lampGlow`).
- **Mondingsvuur:** elk schot licht de grond rond de loop even op, in het donker veel sterker (`muzzleLight`).
- **Bevelmarkering:** waar je je squad naartoe stuurt, verschijnt een rimpel met vier pijltjes, rood bij een aanvalsbevel (`orderMark`).
- **Radar en antennes:** de radarschotel van de Command Post draait; een Relay Tower zendt ringen uit.
- **Sentry klapt open:** een Sentry Gun die net gebouwd of neergezet is, klapt in 1,2 s zijn pootjes uit en schuift zijn loop naar buiten (`unfold`).
- **Stofduiveltje:** ongeveer om de 45 s draait er een kleine wervelwind over het regoliet in beeld (`devilEvery`).
- **Glinsteringen:** kristallen (`*`) en ijs (`~`) die je ziet, glinsteren af en toe (`glints`).
- **Lage zwaartekracht:** het puin van granaten, seismische ladingen en meteorieten vliegt hoog, blijft lang hangen en valt traag terug (`lowGravity`, de gewone val is 180), met een stofwolk die lang blijft.
- **Wachten:** een soldaat die niets te doen heeft, kijkt af en toe om of bekijkt zijn geweer (een glinstering); Swarm die stilstaat, snuffelt (`idle`).
- **Granaat:** draait in de lucht, en zijn schaduw op de grond toont waar hij neerkomt.
- **Verdwaalde kogels:** bij een kwart van de schoten vliegt er een kogel voorbij die stof opwaait of splinters uit de rots slaat. Enkel beeld: elk schot raakt nog altijd (`strays`).
- **Klauwen op metaal:** de Swarm laat krassen achter op een gebouw dat hij aanvalt, met vonken. De krassen verdwijnen als het gebouw volledig hersteld is.
- **Toren zakt in elkaar:** van een vernietigde Relay Tower schuift de mast met vonken in de kast, de schotel kraakt erbovenop, met puin en rook. De zwartgeblakerde kast blijft nog even staan en verdwijnt dan.
- **Generator:** zolang hij draait, springen er elektrische boogjes over; valt hij uit, dan flakkert zijn licht en dooft het.
- **Sleepspoor:** de Swarm die een gevallene wegsleept, laat twee groeven in het stof achter, met wat bloed. Het spoor blijft 25 s (`dragLife`).
- **Schimmel sterft af:** de schimmel rond een verbrande hive wordt grijs terwijl hij wegkwijnt, en er stijgen grijze sporen op.
- **Schacht spuwt een golf:** voor een golf uit een mijnschacht klimt, spuwt de schacht 1 s stof en zie je klauwen aan de rand (`emerge`). Zolang ze in de schacht zitten, kan niemand ze raken.
- **Dropship vertrekt:** bij het opstijgen een stofring.
- **Dropship:** voor hij landt, vliegt hij eerst hoog over (zijn schaduw veegt over de grond, je hoort de motoren); bij de landing een stofring.

### Bovenbalk
Midden in de bovenbalk staan de **titel van de missie** en de **mode**: welke campagne en het missienummer (*Corps 4*, *Swarm 2*, *Corps training*, *Skirmish*) en de moeilijkheid. Hover voor de volledige uitleg.

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
- Plateaus zijn verhoogde vlaktes, omringd door **kliffen** waar je niet over kan. De enige weg naar boven is een gestreepte **helling**. Dat maakt ze makkelijk te verdedigen en traag om te bereiken, voor beide kanten. Er is geen gevechtsvoordeel van hoog naar laag. Geen enkele kaart van het spel gebruikt ze nog (High Ground is sinds nov. 2026 vlak); in de kaarteditor kan je ze nog tekenen.

### Uplink-bakens (missie 8 en 11)
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
Een groep **zonder** tactische formatie die je verplaatst, houdt zijn vorm: elke eenheid bewaart haar positie ten opzichte van het midden van de groep. De hele groep loopt op het tempo van de traagste eenheid. (Een squad **in** een tactische formatie marcheert als één geheel, zie hieronder.)
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
- **Wig:** Pyros komen vooraan (de punt), dan Gunners, en Troopers vullen de vleugels. De punt wijst in de looprichting en loopt ook onderweg vooraan.
- **Marcheren als één geheel:** een squad in formatie verplaatst zich als één blok. Een onzichtbaar gidspunt volgt het pad op het tempo van de traagste soldaat (× `FORMATION.march`), en elke soldaat loopt naar zijn eigen plek rond dat gidspunt. Zo blijft de vorm onderweg staan, en loopt de punt van een wig echt vooraan.
  - Raakt iemand achterop, dan vertraagt het gidspunt (nooit tot stilstand: tot `FORMATION.slowest` van het tempo), en de achterblijver loopt sneller om bij te benen (`catchUp`).
  - Bij een **attack-move** stopt de squad om te vechten en marcheert daarna verder. Een **Sweep** (lijn in de aanval) loopt door en vuurt al lopend.
  - Een wig, lijn, zigzag of je eigen formatie **draait** mee met het pad (rustig, `FORMATION.turn`); een cirkel en een vierkant houden hun richting.
  - In een **smalle doorgang** knijpt de formatie samen naar het midden; wie dan nog geen plek heeft, volgt het gidspunt in een rij. Na de doorgang gaan ze weer open. Bij aankomst neemt de squad **de plek die je aanklikt**: past de vorm daar niet helemaal (een rots, een muur), dan schuift ze eerst wat in elkaar (tot de helft), en wie dan nog een plaats in de rots heeft, stapt opzij naar de dichtste vrije plek. Een paar soldaten staan dan wat uit de lijn, maar de plek is ingenomen. Pas als minder dan de helft van de plaatsen daar past (`FORMATION.stay`), verschuift de hele vorm (tot 3 tegels) naar waar ze beter past, en nooit door een muur naar de andere kant.
- **Wie waar staat:** de rol gaat voor (Medics en Engineers in het midden of erachter, Pyros en Gunners vooraan in de wig). Binnen die rol worden de plekken zo verdeeld dat **iedereen aan zijn eigen kant van de squad blijft**: de goedkoopste verdeling, zodat niemand dwars door de squad loopt om met een ander van plaats te wisselen. Dat geldt bij elke verplaatsing, ook als de formatie omkeert.
- **Nieuwe formatie of afstand onderweg:** druk je een formatietoets (of E) terwijl de squad loopt, dan nemen ze de nieuwe vorm aan **al lopend**. Ze stoppen niet en lopen door naar dezelfde bestemming.
- **Terug in de rij na een gevecht:** een soldaat die niets te doen heeft (na een gevecht, of als hij een vijand achternaging) gaat terug naar zijn plek in de formatie.
- **Aanvallen in formatie:** geef je de hele squad in formatie een aanval op één vijand of een hive (rechtsklik erop, of `A` + klik) die nog ver weg is, dan **marcheert ze er in haar vorm naartoe** (als een attack-move: wat haar onderweg aanvalt, krijgt eerst de kogels). Ze stopt waar het doel binnen het gewone bereik van haar strijders ligt (de mediaan, + `FORMATION.standoff` tegels), of zodra iemand vooraan het doel al onder vuur neemt; pas dan valt iedereen aan en volgen de Medics de squad. Staat ze er al dichtbij (binnen `FORMATION.engageAt` tegels daarvan), dan valt ze meteen aan. Een nieuw bevel onderweg heft de aanval op. **Is het doel weg** (de hive verbrand), dan gaat de squad weer in formatie staan waar ze is. js/engine/19b-formations.js: `attackInFormation()`, `engageTarget()`, `afterEngage()`.
- **Weer recht na neergaan:** een soldaat die neerging en door een Medic wordt opgelapt, krijgt een plek in de formatie zoals die **nu** is. Is de squad intussen verder gestapt, dan maakt ze plaats voor hem; hij loopt niet meer naar een oude plek.
- **Cirkel en vierkant:** elke strijder blijft op zijn eigen plek van de rand; bij een verplaatsing wisselt niemand van plaats.
- Druk dezelfde toets nog eens om de formatie los te laten (onderweg lopen ze dan zonder formatie door naar dezelfde plek). Selecteer je een groep met eenheden die niet in de formatie zaten, dan gebruikt die groep de gewone formatie.
- Code: js/engine/19b-formations.js. De vormen staan in `FORMATIONS` en `formationSlots()`, het verdelen van de plekken in `assignPlaces()` (met de Hongaarse methode in `assignCheapest()`), het marcheren in `marchTo()`, `marchStep()` en `walkOrder()`. De afstand tussen eenheden volgt `FORMATION.spacing`.

### Medic: triage
De levensbalken hebben drie zones: **rood** (≤ 25%), **oranje** (25–50%) en **groen** (> 50%).
1. De Medic behandelt eerst de dichtstbijzijnde gewonde in het rood.
2. Komt zijn patiënt in het oranje terwijl iemand anders nog in het rood ligt, dan schakelt hij over.
3. Daarna doet hij hetzelfde met de oranje gewonden, en pas dan maakt hij iedereen volledig beter.

**Aan de lijn:** een Medic zonder bevel blijft bij zijn squad. Hij gaat iemand genezen tot 4 tegels van zijn plaats (in de formatie, of waar je hem achterliet), en voor een neergevallen soldaat tot 8 tegels (`SQUAD.medic`). Stuur je één soldaat weg, dan loopt de Medic hem dus niet achterna. Geef je de Medic zelf een bevel, dan gaat hij waar je hem stuurt. Zijn plaats is altijd waar hij nu bij de squad staat: valt een bevel van hem weg (je laat de formatie los, of zet defensief aan), dan blijft hij daar en loopt hij niet terug naar waar hij vroeger eens stilstond.

De Medic draagt een **licht pistool** (bereik 3, 2 schade). Genezen gaat altijd voor: hij schiet alleen als er niemand in de buurt behandeling nodig heeft. Bij een aanvalsbevel volgt hij de groep op korte afstand in plaats van mee naar het doelwit te lopen.

### Engineer
- **Automatische reparatie:** een Engineer zonder bevel herstelt beschadigde gebouwen binnen 7 tegels en maakt bouwplaatsen in de buurt af.
- **De veilige kant:** een Engineer die iets bouwt of herstelt, kiest een vrije plek rond het gebouw aan de kant van zijn squad en weg van de Swarm (binnen 14 tegels), zonder een lange omweg. Hij houdt zijn plek tenzij een andere duidelijk beter is, en geraakt hij er na 6 s niet, dan werkt hij waar hij staat. Instelbaar in `REPAIR_SIDE` (dev panel, tab Squad): `walk`, `enemy`, `squad`, `look`.
- **Limiet per missie:** een missie kan bepalen hoeveel Sentry Guns er tegelijk in het veld mogen staan (`limits:{ sentry:3 }`). Gebouwde, in aanbouw en onderweg zijnde sentries tellen mee; een ingeklapte sentry op de rug van een Engineer telt niet. Zo moet je er eerst één inpakken voor je verder kan. De commandoknop toont de stand, bijvoorbeeld `2/3`.
- **Sentry Gun meedragen:** druk **U** en klik op een Sentry Gun (of rechtsklik op een onbeschadigde). Inklappen duurt 2 s. De Engineer loopt dan op 60% snelheid. Met **D** stel je hem weer op in 3 s; dat kost niets en de schade blijft behouden. Sterft de Engineer onderweg, dan is de Sentry verloren.
- **Niet bouwen, wel laten invliegen** (`noBuild:['sentry']`): in *The Hollow Colony* kan de Engineer geen Sentry Gun bouwen. Hij heeft er één bij zich. Gaat die verloren (vernietigd, of samen met de Engineer die hem droeg), dan vliegt het dropship een nieuwe naar het **landingsplatform waar je squad begon** (60/80/100 s op Easy/Normal/Hard). Hij staat daar ingeklapt als een kist met een oranje ring. Een Engineer met lege handen die erop loopt, neemt hem mee; daarna D om op te stellen. Er is er altijd hooguit één (in het veld, op een rug, op het platform of onderweg).

### The Swarm
- **Pyro: brandende grond.** Waar de vlam van een Pyro neerkomt, blijft de grond 3 seconden branden. Swarm die erdoor loopt, krijgt 6 schade per seconde en vat vuur: nog 3 seconden 6 schade per seconde, ook buiten het vuur (je ziet de vlammen op hem). Je eigen troepen hebben er geen last van. Een nieuwe vlam vlak bij een brandende plek voedt die plek (ze brandt langer en wordt iets groter), hoogstens 40 plekken tegelijk. Gevallenen in het vuur verbranden. Zo kan je een doorgang of de weg naar een lichaam afsluiten. Instelbaar in `FIRE` (js/engine/25b-animations.js, dev panel tab *Effects*).
- **Hoe een hive eruitziet:** een **wortelknol**, een vlezige knol op een web van wortels die de schimmel in lopen. Hij klopt als een hart (een dubbele slag, zes keer per 5 seconden), groen sap stroomt langs de wortels naar buiten en de spruit bovenop wiegt. Elke hive loopt een beetje verschoven, zodat ze niet in de maat kloppen. Code: `hiveDraw` en `hiveFrame` in js/engine/01-sprites-art.js (60 beeldjes, 12 per seconde, één keer gemaakt).
- **Gewonde hive:** onder 66% levenspunten verdort een derde van de wortels (grijs, geen sap meer) en klopt het hart trager; onder 33% twee derde, de knol wordt donkerder en krijgt barsten.
- **De laatste krijs:** een verbrande hive ontploft niet zomaar. Eerst schudt hij steeds harder, zijn hart gaat tekeer, hij krijst (drie groene ringen) en zijn laatste broed vlucht weg (enkel een beeld, geen echte eenheden). Na 1,8 s zakt hij in elkaar: hij wordt plat en donker, er vliegt aarde in het rond, en rookpluimen stijgen op tot het einde (3,4 s). Instelbaar in `HIVE_DEATH` (js/engine/25-hive-life.js, ook in het dev panel, tab Swarm): `scream`, `fall`, `time`, `rings`, `brood`, `smoke`.
- Hives maken bewakers aan zolang er biomassa is. In sommige missies komen er ook **aanvalsgolven** die steeds groter worden.
- **Spitters** verschijnen na 2 minuten, **Brutes** na 5 minuten (instelbaar met `unlock`).
- **Ingegraven aanvallen:** zijn alle hives vernietigd, dan stoppen de scriptgolven niet meer. De Swarm graaft zich dan op uit de grond, op een plek die je niet ziet, 12 tot 22 tegels van het doel en minstens 9 tegels van je troepen (stofwolk, donkere vlek).
- **Hives groeien terug** (6 hp per seconde) als ze 12 seconden niet geraakt zijn. Even aanvallen en weglopen helpt dus niet; doorduwen wel. Instelbaar met `regen` en `regenDelay` bij `BUILDINGS.hive`.
- **Cocons:** lunar fauna die de Swarm doodt, wordt naar de hive gesleept en daar een Bloater (zie *De Bloater*). Gesneuvelde soldaten volgen hun eigen regels (zie *De gevallenen* bij Veterans). Pyros doen drievoudige schade aan cocons.
- **De schimmel (creep):** rond elke hive groeit een paarse, levende laag, van 2 tegels naar 8 tegels in tweeënhalve minuut, met aders en groene puisten. Swarm-eenheden die erop staan, **genezen** 4 HP per seconde (een paars plusje). Valt de hive, dan verwelkt de schimmel in een tiental seconden. Instellingen: `CREEP` in js/engine/25-hive-life.js; per missie of per hive `creep:<tegels>`.
- **De Bloater:** een grazer (lokale fauna) die de Swarm doodt, waar dan ook, laat een **karkas** achter (op zijn rug). De Swarm sleept het naar de dichtste hive, net als een gesneuvelde soldaat; daar legt de hive een ei, de Grafter infecteert het karkas en uit de cocon (5 seconden) komt een **Bloater**: traag, taai (120 HP), zwakke beet, maar bij zijn dood barst hij open: zuur in een straal van 1,8 tegel (28 schade, ook voor de Swarm) en een grote zuurplas. Dood hem op afstand.
- **De Husk:** een gesneuvelde soldaat die op de schimmel door een Grafter is geïnfecteerd. Het **verloop** (instellingen: `HUSK_STAGES`, `MOLT` en `HUSK` in js/engine/25-hive-life.js):
  1. **Infectie:** op de schimmel klampt een Grafter uit een hive-ei zich vast. Het lichaam schokt, kleurt groen en er kruipen groene aders uit (geluid: nat geknaag).
  2. **Cocon:** een lange paarse pod, de helm steekt er nog uit. Hij **klopt als een hart**, steeds sneller, met een paarse gloed en tentakels in de grond. Het laatste stuk komen er barsten in en schudt hij (geluid: hartslag, dan krakend pantser). Na 8 seconden barst hij open: een gil, rondvliegend vlees, een schokje van de camera en *IT LIVES*.
  3. **Twitcher:** kruipt op handen en voeten (40% van de Husk: levenspunten, snelheid 70%, schade 45%). Na 7 seconden **vervelt** hij, meteen tot Husk.
  4. **Shambler** (rechtop, half pantser half vlees, 70% levenspunten): de Husks van de Swarm **slaan dit stadium over** (`HUSK.skipShambler`, ook in het dev panel). Alleen het wezen dat je zelf bestuurt in *The Graft* gaat er nog door, omdat die missie erop gebouwd is (verbergen als Shambler).
  5. **Husk:** de eindvorm (150 HP, 10% pantser, zware klauwen, 3 XP, met een brul).
  - **Vervellen** duurt 1,6 seconden: hij staat stil en schudt, zijn huid licht op, de volgende vorm groeit erdoorheen en stukken pantser vliegen eraf (geluid: knakkende botten en gekreun). Ondertussen valt hij niet aan en krijgt hij **50% meer schade**. Dat is je kans.
  - **Zolang hij nog verandert** (Twitcher en Shambler) **blijft hij op de schimmel** van de dichtstbijzijnde hive en verdedigt die: hij valt aan wat op de schimmel komt, maar volgt je er niet af. Is er geen hive meer, dan jaagt hij meteen.
  - De **eindvorm** is een **krijger**: hij verlaat de schimmel en jaagt op je squad. Hij schiet **geen wortel** meer en wordt nooit een hive (alleen je eigen wezen in *The Graft* doet dat nog, met F).
  - **Terug naar de schimmel:** heeft een volgroeide Husk een soldaat neergehaald of gedood, of heeft hij niets meer om tegen te vechten, en heeft hij minder dan 65% van zijn levenspunten (`HUSK_WARRIOR.mendAt`), dan valt hij terug (*FALLS BACK*) naar de schimmel van de dichtstbijzijnde hive. Onderweg vecht hij niet; op de schimmel geneest hij en vecht hij alleen tegen wat tot bij hem komt. Vanaf 95% (`mendDone`) gaat hij een nieuw slachtoffer zoeken (*HUNTING*). Is er geen hive met schimmel meer of geen weg erheen, dan vecht hij gewoon door.
  - **Oorlogsbende:** een volgroeide Husk trekt ten strijde met **3 Swarm-wezens** rond zich (`HUSK_WARRIOR.escort`): eerst vrije wezens binnen 14 tegels, de rest komt uit het nest waar hij staat. Elke 12 seconden vult hij aan (ook na het genezen). Ze lopen mee, vechten wat dichtbij komt en volgen hem terug naar de schimmel.
  - **De jacht** (`HUNT` in js/engine/12-swarm-director.js), ook tijdens het spelen: om de 30 seconden krijgt een volgroeide Husk te horen waar je soldaten zijn en leidt hij de aanval (*THE HUNT*). Een verse groep uit het nest dat het dichtst bij hem ligt, sluit zich bij zijn bende aan (tot 8 wezens). Wezens die niets te doen hebben, gaan ook zoeken. Is er geen Husk, dan gaat er een **gewone golf** op een soldaat af. Dat komt bovenop de eigen golven van de missie; elke ronde is iets groter (tot 10 rondes ver). Een missie kan het uitzetten met `swarm.hunt:false`, of zelf afstellen met `swarm.hunt:{ every, budget, grow, growMax, afterEvery, afterBudget }`. *The Hollow Colony* jaagt harder: om de 25 seconden, groter, en het groeit langer door. Na een nederlaag om de 20 seconden en groter.
  - Boven een Husk staat geen killteller meer en hij groeit niet verder: de Matriarch is in november 2026 uit het spel gehaald (een oude save met een Matriarch laadt hem als Husk).
  - **Schreeuw:** brengt een Husk een soldaat neer of doodt hij er een, dan schreeuwt hij (*SCREAM*, een rode schokgolf): de soldaten binnen 3,5 tegels deinzen terug (ze zijn even onderdrukt: trager, zoals onder zwaar vuur). `HUSK_WARRIOR` in js/engine/25-hive-life.js.
  - In het selectiepaneel zie je in welk stadium hij zit (*Twitcher (turning into a Husk)*).
  - Nieuwe hives groeien alleen nog uit je eigen wezen in *The Graft* (F, `HUSK.root`, `hiveHp`, `guardMax`).

### Landing Zone en troepenlimiet (missie 1, 3, 6, 7, 8, 9, 10 en 11)
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

### De Brood Mother (missie 10)
- Ze is reusachtig, staat stil als je dichtbij bent en spuwt zuur. Elke paar seconden **chargeert** ze in je linies ("CHARGE!"): trek je mensen dan terug.
- Ze legt eieren die uitkomen als Crawlers of Drones. Brand ze met Pyros voor ze uitkomen.
- Bij 75%, 50% en 25% roept ze haar broed op en wordt ze telkens sneller.
- Wie ze doodt, eet ze op: die eenheid wordt géén cocon.
- Zodra je haar 8 seconden niet raakt, **geneest** ze.
- **Afstand houden helpt niet:** staat niemand binnen haar bereik, dan kruipt ze je traag achterna (`stalkSpeed`), en houd je haar 5 s op afstand (`kiteTime`), dan slingert ze 3 eieren midden in je troepen (`lobEggs`, "SPAWN!"). Van dichtbij staat ze stil (`rootSpeed`).
- **Terug naar haar hol:** telkens ze 30% van haar levenspunten verliest (`lairEvery`, hoogstens 2 keer: `lairTimes`), sleept ze zich snel terug naar haar hol ("RETREATS", 4× haar snelheid, `fleeSpeed`), en krijgt ze onderweg maar de helft van de schade (`fleeArmor`). Op het moment dat ze vlucht, breken 4 Drones uit de grond tussen haar en jou om haar aftocht te dekken (`coverBrood`). Tijdens het helen groeit het membraan van haar hol half terug (300 levenspunten per stuk): brand of schiet je naar binnen. Kom je in haar hol, dan komen haar eieren daar meteen uit: een hinderlaag. Daar geneest ze 110 per seconde (`lairRegen`), tot 12% van haar levenspunten (`lairHeal`) of 25 s (`lairTime`), en legt ze dubbel zo snel eieren rond zich. Komt iemand dichter dan 4 tegels (`lairGuard`), dan breekt ze het af en valt ze meteen aan ("FURY!"). Je moet haar dus het hol in volgen.
- **Ingraven:** in elke fase (vanaf haar eerste roep) graaft ze zich één keer in ("BURROWS!"), met minstens 12 s ertussen. 4 s lang is ze onder de grond en niet te raken, terwijl de grond opbolt onder je grootste groep en die tot het laatste moment volgt; dan breekt ze daar uit ("BREAKS OUT!"): 70 schade aan iedereen binnen 2,5 tegels, wie overleeft wordt weggeslingerd en ligt 1,5 s versuft neer, en ze chargeert bijna meteen. Na het uitbreken vecht ze minstens 10 s voor ze zich nog terugtrekt (`burrowTime`, `burrowDamage`, `burrowRadius`, `burrowDaze`, `burrowCalm`). Spreid je troepen.
- **Zuurregen** (vanaf fase 2): om de 9 s een **wandelende regen** ("ACID RAIN"): drie bogen van 6 klodders na elkaar, eerst vlak bij haar, dan halfweg, en de laatste op je squad. Staat je squad langer dan 6 s stil (minder dan een tegel verplaatst), dan landt de regen meteen recht op je groep. Waar een klodder neerkomt, blijft een plas 12 s branden (`rainEvery`, `rainGlobs`, `rainPool`, `rainStill`).
- **Krijs:** bij elke nieuwe fase krijst ze (paarse ringen): soldaten binnen 7 tegels schieten 2 s lang 1,6 keer trager (`screechR`, `screechTime`, `screechSlow`).
- **Eet om te helen:** doodt ze een soldaat, dan eet ze hem op ("FEEDS") en heelt ze 4% van haar levenspunten (`feedHeal`).
- **Schild van broed** (fase 3): 4 Drones komen haar beschermen en blijven bij haar. Zolang er een naast haar staat, vangt die de helft van elk schot op haar op (`shieldBrood`, `shieldShare`). Schiet eerst de schilden neer.
- Bovenaan het scherm staat een levensbalk met de huidige fase.
- Je soldaten pakken eerst de kleinere vijanden rond haar aan en schieten daarna op haar.
- Instelbaar bij `UNITS.broodmother`: `hp`, `damage`, `regen`, `eggEvery`, `eggs`, `spitEvery`, `spit`, `spitDamage`, `chargeEvery`, `chargeTime`, `chargeSpeed`, `rootSpeed`, `stalkSpeed`, `kiteTime`, `lobEggs`, `lairEvery`, `lairTimes`, `lairHeal`, `lairRegen`, `lairTime`, `lairGuard`, `fleeSpeed`, `fleeArmor`, `coverBrood`, `burrowTime`, `burrowDamage`, `burrowRadius`, `burrowDaze`, `burrowCalm`, `shieldBrood`, `shieldShare`, `rainEvery`, `rainGlobs`, `rainPool`, `rainStill`, `screechR`, `screechTime`, `screechSlow`, `feedHeal`.

### Dr. Maas als doelwit (missie 4)
De Swarm wil Dr. Maas boven alles (`SWARM_VIP` in js/engine/08-combat.js): in een gevecht kiest een Swarm-wezen haar boven een soldaat die tot 3 tegels dichter staat, jagers binnen 22 tegels gaan recht op haar af, en elke golf na de redding wordt op haar gericht. Je kan haar mee selecteren en verplaatsen; zonder bevel volgt ze de dichtste soldaat.

### Duisternis en generatoren (missie 6)
- Een missie met `dark:{ sight:0.5 }` speelt **in het donker**: alle eenheden en gebouwen zien maar de helft zo ver (minstens 2 tegels), en wat je eerder zag, zakt bijna helemaal weg in het zwart.
- **Generatoren** zijn missiegebouwen. Ze starten kapot (5% hp). Engineers herstellen ze (automatisch in de buurt of met rechtsklik). Op 100% gaan ze **online**: ze geven licht in een straal van 9 tegels, en dat gebied zie je dan gewoon.
- Licht trekt de Swarm aan: in Blackout komt er 10 seconden nadat een generator aanslaat een golf op af, en daarna elke 45 seconden zolang hij draait (niet als er al 40 of meer Swarm op het veld zijn).
- **Mijnschachten** (`start.shafts:[punten]`): oude schachten die je niet kan vernietigen. Zolang er nog hives zijn, gebeurt er niets. Zijn alle hives weg, dan komen de golven (en de golven die op licht afkomen) uit de schacht, maar maar 90% zo groot (`WAVES.shaftScale`): hives verbranden blijft lonen. Ze komen uit de schacht die het dichtst bij hun doel ligt, maar nooit uit een schacht waar je soldaten binnen 6 tegels staan. Blackout heeft er drie, Dead Signal vier. Een missie kan de grootte zelf kiezen met `swarm.shaftScale`.
- **Schachten die het overnemen** (`swarm.shaftHeirs:true`): elke schacht hoort bij de hive die er het dichtst bij ligt. Verbrand je die hive, dan **neemt zijn schacht zijn rol over**: bewakers, het opmerken van je soldaten, biomassa en golven, even sterk als de hive was (de golven worden dus niet kleiner). Staan er twee schachten achter één hive, dan delen ze zijn rol (elk de helft van de bewakers). Kessler meldt het. *Hold Kappa* heeft er vier (twee achter de noordoostelijke hive), *High Ground* ook vier (één bij elke hive), elk met een plekje schimmel en een ei: zijn alle hives verbrand, dan slepen ze de gevallenen naar een schacht en komen daar nog Husks uit. js/engine/12-swarm-director.js: `spawners()`, `heirTakeover()`.
- **Swarm-tunnels in de wand** (`start.shafts:[{ x, y, wall:'n'|'s'|'e'|'w', creep:3, eggs:1 }]`): een schacht met `wall` wordt getekend als een gat dat de Swarm door de rotswand aan die kant heeft gevreten. Met `creep` groeit er een klein plekje schimmel rond, met `eggs` eieren erop: dan is het een **nest** zoals een hive. Gesneuvelden worden ernaartoe gesleept, een Grafter infecteert ze daar en er kan een **Husk** uitkomen; een gewonde Husk geneest er ook. *Burn the Brood* heeft er drie zonder schimmel (west, noord en oost), ook de laatste stormloop komt daaruit. *The Hollow Colony* heeft er drie (noord, oost en zuid): verbrand je alle hives voor je Dr. Maas vindt, dan kruipen de golven tijdens de escorte uit de wand.
- Een generator die uitgevallen is (offline), laat de Swarm met rust: er valt niets meer aan te breken, want een generator gaat niet kapot. Ze lopen door naar je troepen en de Command Post. Zodra hij weer draait, komen ze er opnieuw op af.
- Zakt een generator onder **60%**, dan valt hij uit. Kapot gaan kan hij niet: hij blijft op minstens 1 hp en moet weer helemaal hersteld worden.
- Boven elke generator staat ONLINE of OFFLINE met het percentage. Instelbaar in `BUILDINGS.generator`: `hp`, `startHp`, `failAt`, `light`.

### Seismische ladingen en instortingen (missie 7)
- Een **ladingplek** (rood-zwart kader) maak je met `g.chargeSite(punt, tag)`. Een Engineer die er **stil op staat**, maakt de lading scherp in 20 seconden (ARMING %). Loopt hij weg, dan blijft de voortgang staan.
- De **lading** zelf (320 hp) ontploft na 75 seconden. Boven de lading telt de tijd af. Engineers kunnen ze repareren. Wordt ze vernietigd, dan komt de plek terug en moet je opnieuw beginnen.
- De ontploffing doet 450 schade aan alle vijanden binnen 4,5 tegels en laat het beeld schudden.
- `g.bury(punt, straal)` laat de grond **instorten**: hives bij dat punt sterven en er komt puin (onbegaanbaar) op de grond, behalve onder soldaten. Wie daardoor afgesneden raakt van het startpunt, wordt automatisch uitgegraven naar de dichtstbijzijnde open grond.
- Instelbaar in `BUILDINGS.chargesite` (`armTime`) en `BUILDINGS.charge` (`hp`, `fuse`, `blast`, `blastDamage`).

### Sfeer en tactiek
- **Motion tracker** (rechtsonder, aan/uit met **K** of de knop *Tracker*): een radar rond je geselecteerde squad (of het midden van het scherm als je niets selecteert). Alles van de Swarm dat binnen 20 tegels beweegt, verschijnt als stip, ook in het donker of achter rotsen. Onderaan staat de afstand tot het dichtstbijzijnde contact in meter (rood onder 12 m). Hoe dichter, hoe sneller en hoger de piep.
- **Zuurbloed:** een Swarm-wezen dat sterft, spat zuur op soldaten binnen 1,2 tegels (6 schade, Brute meer, Brood Mother veel meer) en laat een plas achter die 3 seconden blijft branden. Wie erin staat, verliest hp. Afstand houden loont, Pyros lopen meer risico.
- **Dekking:** staat er rots of een gebouw tussen een soldaat en een vijand die van ver schiet (Spitter), dan krijgt die soldaat 40% minder schade. Af en toe zie je "COVER". Tegen beten en klauwen helpt dekking niet.
- **Onderdrukkingsvuur:** een vijand die door een **Gunner** geraakt wordt, loopt 1,4 seconden bijna half zo snel (blauwe pijltjes boven het wezen). Gunners houden zo een stormloop op.
- **Fakkels** (**L**, dan klik): een Trooper, Gunner of Pyro gooit een fakkel tot 9 tegels ver. Ze brandt 45 seconden en verlicht een straal van 6 tegels. Je hebt er 3 per missie, 6 in donkere missies (instelbaar per missie met `flares:`).
- **Stemmen:** soldaten zeggen iets bij selecteren, bewegen, aanvallen, het eerste contact, bij zware verwondingen, wanneer een kameraad sneuvelt (met zijn naam), bij genezen, bouwen en fakkels. Een tekstballon met een radioklikje, en de zin wordt ook **uitgesproken** met de spraakstemmen van je browser (elke soldaat zijn eigen stem en toonhoogte). Aan/uit met **O** of de knop *Voices*, het volume met de schuif *Vol* ernaast (standaard 30%, onthouden in je browser); *Sound off* zet ze ook stil. Nooit meer dan één zin per 1,6 seconden. De zinnen staan in `VOICE` (js/content/veterans.js).
- **Briefing over de intercom** (`BRIEF_VOICE` en `INTERCOM` in js/engine/22-squad-life.js): open je een briefing, dan klinkt een omroepgong (drie tonen), en een stem leest de briefing voor alsof het uit een intercom komt: eerst wie aangesproken wordt en welke missie (*Lunar Corps, Squad Dust. Mission four: The Hollow Colony.*; de Corps-training: *Lunar Corps, Squad Dust recruits.*; een Rogue-job: de Captain op het eigen kanaal van de bemanning, *Osprey crew, this is Kerckhoffs. Job one: …*; een Swarm-missie alleen de titel), dan de tekst, zin per zin. Titels worden voluit gezegd (`SPOKEN_TITLES`: *Dr.* wordt *Doctor*, *Capt.* *Captain*, *Sgt.* *Sergeant*, *Vet.* *Veteran* …), zodat de stem geen *drive Maas* zegt en de zin niet bij *Dr.* afbreekt. Onder de stem zoemt het net (50 Hz), ruist de lijn en kraakt het af en toe (`SFX.bedStart`); de muziek zakt zolang de stem spreekt (`MUSIC.duck`). Een browser laat spraak niet door Web Audio lopen, dus het radiogeluid komt van de lagere, tragere stem (bij voorkeur een Britse mannenstem) en de ruis eronder, niet van een filter op de stem zelf. Knop **Read aloud / Stop voice** op het briefingscherm; *Back*, *Deploy* en elk ander scherm stoppen het. Volgt *Sound* en *Voices*; het volume is de stemmenschuif × 3. Alles is af te stellen in het dev panel (tab Effects, `INTERCOM`: ook `auto` uit = alleen op de knop). Getest met `tools/tests/intercom.py` (met een nagemaakte spraakmotor; moet eindigen met `ALL OK`), dat ook de nieuwe ontgrendeling van Rogue Strain test.
- **Een Swarm met een plan:** een golf van minstens 6 wezens kiest een aanpak: **recht op je af**, **lokaas** (de snelste paar komen eerst, de rest wacht 9 seconden en valt aan terwijl jij achter het lokaas aan zit) of **flank** (de helft maakt een boog en komt van opzij). Het flankpunt en de weg erheen blijven **buiten het schietbereik** van je troepen (hun bereik + `flankClear` tegels; gezocht tot `flankOffset`+`flankSearch` tegels opzij), en de flankeerders lopen erheen zonder onderweg te stoppen om te vechten. Is er zo'n punt niet, dan komt de golf recht op je af. De eerste keer waarschuwt Kessler of Dr. Maas je. Verhouding instelbaar in `TACTICS` (js/engine/12-swarm-director.js). Als je zelf de Swarm speelt is er geen tactiekknop: flanken en lokken doe je zelf met je eigen groepen.
- **Een golf rukt op als een groep** (`PACK` in js/engine/12-swarm-director.js, ook in het dev panel): de wezens van een golf (of van één deel ervan: het lokaas, de wachtende rest, de flankeerders) lopen samen, **op het tempo van de traagste**; wie te ver vooruit loopt (meer dan 2,5 tegels voor het midden), wacht. Pas als een van hen **binnen 7 tegels van de Lunar Corps** komt (of er een aanvalt), wordt de groep losgelaten en **stormen de snelle vooruit**. Een wezen dat een grazer najaagt of een lichaam wegsleept, laat de groep los.
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
- **Persoonlijke veteranen:** sneuvelt een soldaat met een rang of met missies achter de rug, dan meldt de radio het: *"Sgt. Verheyden has fallen. 4 missions, 37 kills."* Op het eindscherm en op de Cenotaph staan bij elke gesneuvelde zijn type, de missie waarin hij viel, zijn aantal missies en kills, en de datum. Ook wie pas in die missie een rang haalde, komt op de Cenotaph.
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
| The Firmament Hums | rauwe atmosferische black metal | 96 | E mineur, lo-fi. Eén zoemende fuzzriff die blijft rondgaan tot hij hypnotiseert; een oud orgel komt eronder, een stem raspt ver weg in de galm, en alles sterft uit in brom en feedback |
| Briefing / Cenotaph | schermstukken | 72 | Hartslag en radioruis bij de briefing; doodsklok en koor op de Cenotaph, in zombie mode met een valse speeldoos |

Elk stuk is een lijst secties (`TRACKS` in `js/engine/24-music.js`) met eigen tempo (`bpm`), toonhoogte (`tr`, in halve tonen), galm (`rev`) en volume (`gain`); `lofi:true` zet er een cassettefilter op, `fuzz:true` geeft het stuk een eigen fuzzgitaar (`fuzzChord`, `fuzzRing`, `feedback`). Een eigen stuk toevoegen: schrijf secties in `SECTIONS` en zet ze in een `plan`.

Alle geluiden worden in de browser opgewekt met de Web Audio API; er zijn geen audiobestanden nodig. Het gaat om wapens, de Medic die geneest, het radarpiepje bij vijandelijk contact, bevelen, alarmen, golven, bouwen en herstellen, cocons, kratten, berichten en een melodietje bij winst of verlies. Geluiden ver buiten beeld klinken zachter. Het geluid start na je eerste klik (een browserregel). Met de knop **Sound** zet je alles uit.

### Doelmarkeringen
Een oranje ruit met label toont waar je naartoe moet. Ze knippert op de minimap, en als het doel buiten beeld ligt, wijst een pijl aan de schermrand de richting aan.

---

## Campagne

| # | Missie | Kaart | Doel |
|---|---|---|---|
| 1 | **Dust Landing** | Kappa Canyons | Volg de brede kloven (minstens 7 tegels breed) vanaf de landingsplaats (twee routes) naar Kappa Station en overleef de hinderlaag uit de oostelijke tunnel. Het dropship landt versterking op het platform van het station. Daarna gaan de blast doors naar de noordelijke grotten open: vernietig de hive in de westelijke grot en daarna die in de oostelijke. De tweede versterking landt op het platform en loopt zelf door de tunnel naar je squad. Breng daarna **iedereen** terug naar het landingsplatform: het dropship vertrekt pas als de hele squad er staat (de doelenlijst telt mee). Tot de deuren opengaan, zijn de hives onbereikbaar en ver buiten schootsafstand. Je speelt zonder basis. Twee **oude mijnschachten** in de kloofwanden: een in de oostwand (daar komt de hinderlaag uit, en later de groep die je wil afsnijden) en een in de westwand achter de hive linksboven (na die hive klimmen er om de zoveel tijd een paar uit). Ook als beide hives verbrand zijn, blijven er golven uit de schachten komen tot het dropship vertrekt. |
| 2 | **Hold Kappa** | Kappa Basin | Bouw 2 Relay Towers en houd 15 minuten stand tot het konvooi komt. De Command Post moet overleven. De hives verbranden doet de missie niet winnen: achter elke hive zit een **mijnschacht** die zijn rol overneemt (zelfde bewakers en golven). |
| 3 | **Burn the Brood** | Tycho Maw | Vernietig vijf extra stevige hives en houd daarna 3 minuten stand tegen de laatste stormloop. Drie **mijnschachten** in de rotswand (links, rechts en midden boven): zijn de hives verbrand, dan komen de golven en de laatste stormloop daaruit (nooit uit een schacht waar je soldaten binnen 6 tegels staan). De stormloop staat in `BROOD_SURGE` (ook in het dev panel): op Normal om de 12 s 5 Drones en 2 Spitters, om de andere groep ook 2 Brutes. Easy en Hard schalen dat met de `budget` en `interval` van hun moeilijkheid. Een **Landing Zone** oostelijk van de Command Post vliegt vervangers in voor wie sneuvelt (hoogstens de 14 waarmee je begint). |
| 4 | **The Hollow Colony** | Hollow Colony | Voor het lab ligt het smeulende wrak van het eerste reddingsschip (de Osprey): bij de start toont de camera het even, en het houdt een marker *Crashed Osprey* tot een soldaat binnen 6 tegels komt. Achteraan in het lab gaat een deur open zodra je squad dichtbij komt: Dr. Maas stapt uit en sluit aan. Vind Dr. Elin Maas in het lab en breng haar naar de extraction pad. Houd 4 minuten stand tot het dropship landt. Je hebt maar één Sentry Gun (dubbel zo veel HP, 30% pantser); een verloren sentry wordt ingevlogen naar je startplatform. Husks zijn hier taaier (×1,6 HP, 30% pantser). Drie Swarm-tunnels in de buitenwand, met wat schimmel errond: zijn de hives weg, dan komen de golven daaruit. |
| 5 | **Night Shift** | Kappa Basin | Een week na *The Hollow Colony*. Het relaisstation uit *Hold Kappa* is een veldhospitaal (drie tenten, een records-terminal, drie kisten stabilizer van Dr. Maas). **Houd het hospitaal tot de dageraad: 10 minuten** (klok *Dawn* bovenaan, `job.nsHold`), **'s nachts** (je ziet half zo ver, het hospitaal is verlicht), zonder Command Post, met 2 Sentry Guns en een Landing Zone net ten zuiden van de tenten (max. 10 man). Na 40 s komen vier soldaten in Corps-pantser zonder IFF uit het zuidwesten, **in een wig**, en graven zich in aan de rand van het plating (een afleiding); 25 s later klimmen er drie uit de oude schacht in de noordwand: hun Medic gaat naar de terminal (60 s downloaden; wat ze heeft, houdt ze), twee anderen pakken de kisten (2,5 s per kist). Wie afbreekt (25%), **rent naar een hive**, buiten bereik, en **de hive geneest hem** (zolang hij geneest, schiet hij niet). Hij loopt **nooit door het kamp**: loopt de weg naar een hive door het hospitaal of langs je soldaten, dan neemt hij **de schacht achter hem**, gaat ondergronds (8 s, `OSPREY.tunnel`) en komt boven bij de hive met de minste soldaten errond (*RESURFACES*); genezen wacht hij daar en bewaakt hij de hive. Na 120 s en daarna **om de 90 s** komen alle genezen raiders samen terug, **met een Swarm-golf** (`nsFirst`, `nsEvery`, `nsWave`, `nsWaveGrow`). **Verbrand de hives**, dan kunnen ze nergens meer genezen: wie dan afbreekt, verdwijnt door een schacht. Optioneel: houd ze van de terminal, houd de drie kisten. Bij de dageraad trekken ze zich terug. Het eindscherm onthult wie het waren: de bemanning van de Osprey, met de strain in het bloed; Varga tekent **Containment Order 9**. Getallen in `job` (dev panel, *This mission*). |
| 6 | **Blackout** | Mare Colony | Mijnstadje zonder stroom, **in het donker**. Je ziet maar half zo ver. Herstel met je Engineers de vier generatoren in de hoeken; een draaiende generator verlicht zijn straten maar trekt de Swarm aan, en valt uit onder 60%. Je wint als ze **alle vier tegelijk** draaien. De Command Post in het plein moet overleven. Naast de Command Post staat een kleine **kampgenerator** die vanaf het begin draait en het kamp verlicht (telt niet mee voor het doel). Zijn de hives verbrand, dan blijven de golven komen, maar dan uit drie oude **mijnschachten**. |
| 7 | **Dead Signal** | Ridgeback Canyon | Kleine squad zonder basis. Maak naast drie nesten een **seismische lading** scherp (een Engineer staat 20 s op de plek) en houd elke lading 75 s heel tot ze ontploft; elke ontploffing begraaft het nest. Vervangers bestel je zelf op het landingsplatform waar je start (er worden geen extra soldaten meer ingevlogen na een lading). Vier **oude mijnschachten** in de kloofwanden (drie in het noorden, één in het zuiden): zijn alle hives weg (begraven of verbrand), dan komen de golven daaruit. Daarna: iedereen naar het lanceerplatform in het oosten, waar de pickup 90 s later landt. |
| 8 | **Kill Order** | Selene Highlands | Order 9 geldt. De Osprey-bemanning (zeven) is gezien op de Highlands, en een ertsvrachtschip zonder vluchtplan komt ze halen: ze heeft een uplink-baken nodig om te landen. **Houd alle drie de bakens** als ze na 5 minuten binnenkomt, en **Sgt. Kessler moet overleven** (hij loopt mee als soldaat van je squad, Sergeant, 4× levenspunten, 40% pantser; hij gaat niet mee naar je rooster). De bemanning gaat in twee ploegen op de bakens af en neemt ze je ook af (een baken met alleen de bemanning erbij loopt leeg, zoals bij de Swarm). Ze **schieten nooit op Kessler** (*"Why are they not shooting at me?"*). Wie afbreekt en wegkomt, staat na 60 s (Easy 80, Hard 45) weer op uit een oude schacht, genezen, en sluit aan bij een ploeg. Keert het schip om, dan breken ze allemaal af en verdwijnen in de schachten: gewonnen. Heeft de bemanning dan een baken, dan landt ze daar: verloren. Landing Zone op het plating (max. 14), 3 Sentry Guns. |
| 9 | **Mother's Heart** | Maw Depths | Iets heeft de Brood Mother verwond: ze rukte zich los en vluchtte de diepte in, en liet **een van haar harten** achter in de lair, nog kloppend. De Osprey-bemanning heeft het membraan geopend en tapt het bloed af (210 s op Normal, 260 Easy, 180 Hard, half zo snel zonder hun Medic; de klok bovenaan toont hoe lang nog). Twee bemanningsleden houden de poort, vijf staan rond het hart. **Verbrand het hart**: een Pyro ernaast 10 s, een andere soldaat 25 s. Wie afbreekt, komt na 45 s terug uit haar tunnel, tot het hart weg is; dan trekken ze zich allemaal terug. Is het hart leeg, dan verlies je. Command Post en Landing Zone bij de grotingang (max. 14). |
| 10 | **Brood Mother** | Maw Depths | Lange missie in de grotten onder Tycho Maw (de Brood Mother overleefde *Mother's Heart* en verzegelde haar lair opnieuw). Bouw een basis bij de grotingang, brand drie zwaar bewaakte eierkamers plat (ze groeien terug als je ze met rust laat) en dood daarna de Brood Mother in haar lair. Het levende membraan voor de lair verdwijnt pas als alle kamers weg zijn. Maximaal 15 man; verliezen vul je aan via de Landing Zone. |
| 11 | **High Ground** | Selene Highlands | Verover drie uplink-bakens op open hoogvlakte (geen plateaus of hellingen meer: de Swarm kan van alle kanten komen), en houd daarna alle drie tegelijk vast tot de upload van 6 minuten klaar is. Verlies je er één, dan stopt de upload. Tijdens de upload komt er ongeveer elke 35 seconden een golf op een baken (om de derde op twee bakens), maar nooit zolang er al veel Swarm op het veld is. Bij elke hive hoort een **mijnschacht** die zijn rol overneemt als je hem verbrandt (`swarm.shaftHeirs`): de golven op de bakens blijven dus komen. Je start met twee Sentry Guns bij de basis. Versterkingen via de Command Post of de Landing Zone ernaast, max. 24 man. |

**De Osprey-bemanning als vijand** (missies 5, 8 en 9; `js/engine/32-osprey.js`, factie `osprey`): de deserteurs uit *Rogue Strain*, nu door de computer gespeeld, in hun zwart en bruin met de rode armband. Ze werken als **elite-ploeg**: twee of meer samen marcheren **in een wig** (Pyro vooraan, Medic en Engineer achteraan) op het tempo van de traagste; komt Dust binnen 7 tegels (`OSPREY.contact`), dan breken ze de formatie om te vechten, laten niemand verder dan 6 tegels afdwalen, en sluiten na 3 s rust weer aan (`OSPREY.calm`). Op hun doel houden ze stand en gaan ze enkel binnen een leiband op Dust af (`g.ospreySquad`). De Swarm laat hen met rust en zij de Swarm (een wapenstilstand: de strain in hun bloed). Op de schimmel genezen ze. Ze zijn taaier dan een gewone soldaat (`OSPREY.hp`, `OSPREY.dmg` per moeilijkheid). **Ze sterven nooit**: zakt iemand onder 25% (`OSPREY.breakAt`, een wit streepje op zijn levensbalk), dan **breekt hij af**: rookwolk, *BREAKS OFF*, niemand kan hem nog raken, en hij rent naar de dichtste uitweg (een oude schacht) en is weg (na hoogstens 25 s, `OSPREY.vanish`). In *Night Shift* (`g.ospreyHeal(true)`) rent hij in plaats daarvan naar een hive, die hem geneest (`OSPREY.hiveHeal`, tot `OSPREY.healTo`). **De weg terug loopt nooit door Dust**: elke route (naar een hive of een uitweg) kost per tegel binnen 4 tegels van een soldaat of Sentry Gun, of in een zone die de missie aanduidt (`g.ospreyAvoid([{at, r}])`, in Night Shift het hospitaal), 25 tegels omweg extra (`OSPREY.danger`, `OSPREY.dangerCost`). Is de schacht achter hem goedkoper (`OSPREY.tunnelCost`), dan neemt hij die en komt hij na `OSPREY.tunnel` seconden boven bij de hive met de minste soldaten errond. Wie hem afbreekt, krijgt 3 XP. Zo is de bemanning nooit dood in een Corps-missie en duikt ze levend op in de volgende. Hun Captain heeft in de Corps-campagne geen naam: daar heten ze *the Osprey crew*. Mission API: `g.osprey(type, punt, n, { hold, hunt, patrol, tough, spare, capt })`, `g.ospreys()`, `g.ospreyBroken()`, `g.ospreyLeft()`, `g.ospreyExits([punten])`, `g.ospreyOrder(lijst, punt, mode)`, `g.ospreyHunt(lijst)`, `g.ospreyWithdraw()`, `g.ospreyReturn(seconden)`, `g.ospreyComing()`, `g.ospreySquad(lijst, punt, { leash })`, `g.ospreyLeave(u)`, `g.ospreyHeal(aan)`, `g.ospreyAvoid([zones])`, `g.ospreyReady()`, `g.ospreyHealing()`, `g.ospreyNear(punt, r)`, `g.ospreySay(wie, tekst)`. Getest met `tools/tests/osprey.py` (moet eindigen met `ALL OK`).

**Voortgang:**
- De campagnelijst toont bij elke gewonnen missie de **moeilijkheidsgraad** (Easy, Normal of Hard) en je beste tijd. Win je later op een hogere moeilijkheidsgraad, dan wordt die bewaard. Ook de briefing en het eindscherm tonen het.
- **Reset campaign** onderaan de campagnelijst wist alle voortgang, en ook de bewaarde missie (*Continue* verdwijnt). Je moet twee keer klikken binnen 4 seconden, zodat het niet per ongeluk gebeurt.

De missies zijn nu bewust langer gemaakt. Sentry-limieten per missie: Hold Kappa 4, Burn the Brood 5, The Hollow Colony 1, Night Shift 2, Kill Order 3, Mother's Heart 4, Brood Mother 6, High Ground 8 (waarvan 2 al bij de start). Een missie wordt vrijgegeven als je de vorige wint. De voortgang wordt in de browser bewaard.

### Training (00 in beide campagnes)

Bovenaan de missielijst staat voor elke kant een **training** (*00*). Ze telt niet mee voor de campagne: geen veteranen, geen trofeeën, ze schakelt niets vrij. Elke stap verschijnt op een **kaart** bovenaan het scherm. Het spel **loopt door** terwijl de kaart openstaat, zodat je meteen kan uitproberen wat er staat. Je sluit de kaart met *Got it* of Enter; de volgende kaart komt pas als je de vorige gesloten hebt én gedaan hebt wat ze vroeg (is de stap al gelukt terwijl de kaart open is, dan zegt de knop *Next step*). Met **◀ ▶** blader je terug door de vorige tips; met **Practice again** doe je een vroegere stap opnieuw, daarna ga je verder waar je was. Gesloten kaart terughalen: het tabje **📖 Tips** bovenaan. De stap wacht tot je gedaan hebt wat ze vraagt; een geslaagde stap wordt in de doelenlijst **afgevinkt** (de laatste drie blijven zichtbaar); de doelenlijst toont *Step 3/20: …*. De knoppen waarover de stap gaat (en waar nodig de minimap, de bovenbalk of de doelen) **lichten geel op**. Met **N** sla je een stap over. In de stappen schrijf je toetsen als `[A]` (dan worden ze een toets-icoontje) en geef je met `keys:['A']` en `hl:['#minimap-wrap']` aan wat moet oplichten. Na de training brengt *Next mission* je naar missie 1.

- **Boot Camp** (Lunar Corps, Kappa Basin, 36 stappen; de squad begint in een cirkelformatie, zodat je ziet wie wie is): één soldaat selecteren, de hele squad selecteren, iemand met Shift+klik uit de selectie halen en terug toevoegen, verplaatsen (pas daarna de camera, zodat die ruimte heeft), groep 1 bewaren (Ctrl+1), een vuurploeg als groep 2 (Ctrl+2), de Medic aan groep 2 toevoegen (Ctrl+Shift+2), groep 1 weer oproepen (1), minstens drie andere formaties (X, V, I, W), in lijn of zigzag opstellen met de richting naar het zuiden (rechtsklik slepen), de afstand wijzigen (E), een eigen formatie bewaren en gebruiken (F, Y), een groep die zijn formatie onthoudt, defensief (H), aanvallen (A) op oefendoelen, vuur inhouden (Q), bevelen annuleren (S), een fakkel (L), met de Engineer een Relay Tower op een pad (R), een Sentry Gun (T) en een Barricade (B), een beschadigde sentry herstellen, de sentry inpakken (U) en weer neerzetten (D), daarna de **Landing Zone** (die werkt pas zodra de Relay Tower staat): eerst het verzamelpunt zetten (Landing Zone selecteren, rechtsklik op de markering), dan een Pyro en een Medic bestellen en zien hoe ze na de landing zelf naar dat punt lopen, een Medic die een neergevallen soldaat oplapt, een Pyro die een cocon verbrandt, **elke knop van de bovenbalk** (tracker uit en aan terwijl er Crawlers rondsluipen, camera volgen uit en aan met een verplaatsing, snelheid naar 2× en terug, stemmen uit en aan en het volume, geluid uit en aan, menu openen en verdergaan), en tot slot een oefen-hive met schimmel en eieren.
- **The First Hunger** (de Swarm, Kappa Basin, 21 stappen): camera, een hive aanklikken (het nest), drie brood laten uitkomen (Q W E R), het verzamelpunt verzetten, brood selecteren en verplaatsen; eerst de maanfauna: een grazer doden (A), het kadaver naar huis slepen (H) en zien hoe het een Bloater wordt; dan de soldaten: twee soldaten aanvallen (A), een lichaam naar huis brengen (H), zien hoe een Grafter het omvormt en de Husk opgroeit (Twitcher → Husk); de knoppen van de bovenbalk (Hive Sense, Follow, snelheid, stemmen, geluid, het menu met Save game); ingraven (B) en de buitenpost (Relay Tower en Sentry Gun, twee wachters) slopen.
  - **Aanvoer:** zodra de soldaten in het open veld allemaal neer zijn, wandelt na `FIRST_HUNGER.preyEvery` seconden (12) een nieuw paar binnen, maar niet zolang er `huskMax` (4) soldaten omgevormd zijn of worden (lichamen, cocons, Twitchers, Husks), en niet als er `swarmMax` (30) Swarm-wezens rondlopen. Minder Husks krijg je alleen door ze te verliezen in een aanval.
  - **Lichamen op bevel** (`swarm.manualHaul`, alleen in de trainingen): soldaten en kadavers blijven liggen tot jij **H** geeft (ook vlak naast een hive). De stappen kijken naar wat er op het veld te zien is: ligt het lichaam al thuis of zit er al een cocon, dan is de stap meteen afgevinkt.
  - Speel je de Swarm, dan sluit wat uit een cocon kruipt (Husk, Bloater) aan bij het wachtende brood aan het verzamelpunt (ook in de campagne). Bij het ingraven rekt de broodlimiet op als je er al aan zit; is de buitenpost al eerder gesloopt, dan bouwen ze hem voor de laatste stap opnieuw op. De tipkaart staat rechtsboven; sleep hem aan zijn titel (onthouden), dubbelklik zet hem terug.
- **Brood Tactics** (de Swarm, Kappa Basin, 10 stappen, js/content/missions/t-swarm-tactics.js): het vervolg op The First Hunger. Je begint met 8 brood en een **jong nest in het westen**, bij de losse toren. Er wandelen geen soldaten in het open veld: wat je wilt, lok je eruit. Stappen: Hive Sense lezen (brood selecteren), het oefensquad frontaal aanvallen en zien dat het blijft staan (*HOLDS*), **twee teams** (Ctrl+1 en Ctrl+2, van voren en langs de noordwestkant), **teampunten en samen aanvallen** (G per team, T om in een team uit te komen, Shift+A), de **Engineer weglokken** met de losse toren en neerhalen, hem **naar huis brengen** (H), **een soldaat weglokken door te bijten**, de **dropship** zien komen (en de limiet van 4 Husks), en de buitenpost slopen.
  - **Oefensquad** (`BROOD_TACTICS`): 3 troopers en een Engineer bij de buitenpost (Q), `drillHp`× leven, `drillDmg`× schade. Binnen de gestippelde **ring** (`ring` = 6 tegels) vallen ze nooit: ze staan meteen weer recht en genezen als de Swarm ze met rust laat. Daarbuiten zijn ze **kwetsbaar** (*EXPOSED*). Valt er een lid weg, dan brengt na `refill` seconden een **dropship** een vervanger (landt na `flight` seconden op het platform in de ring).
  - **Weglokken:** (1) de losse Relay Tower staat buiten de ring, op de bouwplaats (+) in het westen. Hij valt nooit: op 1 HP gaat hij **uit** (*DOWN*) en is hij geen doelwit meer (de Swarm laat los), tot hij weer voor de helft hersteld is (*ONLINE*). Bijt er één wezen in, dan wandelt de Engineer uit de ring om hem te herstellen. (2) Bijt één wezen (of twee, `chaseFoes`) een soldaat, dan **loopt** die erachteraan (*AFTER IT*, hij schiet onderweg), tot `chaseR` tegels van de buitenpost of `chaseTime` seconden, en keert dan terug. Wie buiten de ring valt, telt als weggelokt. Nooit meer dan `huskMax` (4) soldaten tegelijk omgevormd: wie je dan nog neerhaalt sterft zonder lichaam (wel biomassa).
- **Watch** (js/engine/27b-demo.js): op de briefing van beide Swarm-trainingen staat een knop **Watch**. De training speelt zichzelf: elke kaart blijft open zo lang je nodig hebt om ze te lezen en sluit dan vanzelf, de demo doet wat elke stap vraagt (uitkomen, aanvallen, H, groepen, lokken, de knoppen van de bovenbalk, ingraven …) en de camera glijdt mee. Een toets of klik van jezelf neemt het over: vanaf daar speel je zelf verder. Een bekeken training telt niet als gedaan. Elke stap heeft een `demo(g,D)`; een stap die langer duurt dan `DEMO.stepMax` (120 s) wordt overgeslagen. Instelbaar in `DEMO` (devpaneel).
- **Na een training:** *Next mission* opent na The First Hunger Brood Tactics, en daarna missie 1. Het campagnescherm toont de trainingen van een kant als T1, T2.
- **Campagnescherm:** bovenaan kies je met twee grote knoppen met welke kant je speelt (*Play as Lunar Corps* in amber, *Play as The Swarm* in groen), elk met de naam van de campagne en je voortgang.
- Een training maak je met `tutorial([ … stappen … ])` (in js/content/missions/_missions.js); elke stap heeft `say`, `obj`, eventueel `mark`, `setup(g)` en `done(g)`. Trainingen staan in `TRAINING.corps` en `TRAINING.swarm` (js/content/missions/t-corps-training.js en t-swarm-training.js).

### De Swarm-campagne (*The Long Hunger*)

Op het campagnescherm kies je bovenaan **Lunar Corps** of **The Swarm** (onthouden als `hc-camp-side`). In de Swarm-campagne speel je hetzelfde verhaal op dezelfde kaarten, maar dan als **de Brood**. Je bent een regisseur: je stuurt geen losse eenheden, maar je beslist wat er uitkomt, waar het verzamelt en waar het toeslaat. De eenheden vechten zelf. De **Lunar Corps** wordt door de computer gespeeld.

**Besturing**

| Toets | Wat |
|---|---|
| `Q` `W` `E` `R` | Een ei van een Crawler, Drone, Spitter of Brute in de **batch** van je **nest** (de hive die je aanklikt, anders de hive het dichtst bij het verzamelpunt). **Shift** + toets: 5 eieren tegelijk. De biomassa gaat er meteen af en eieren tellen al mee voor de limiet. Je ziet ze als pulserende bolletjes rond de hive en als pictogrammen in de rij *Batch* (klik er een aan om hem terug te nemen, met biomassa terug). **3 seconden** na het laatste ei, of meteen met **Spatie**, groeit de batch even (2 s + 0,3 s per ei) en komen **ze allemaal tegelijk uit**; de nieuwe brood wordt geselecteerd als je naar de hive keek. `SWARM_PLAY.batch`. Spitter en Brute komen pas na een tijdje vrij. |
| Rechtsklik (zonder selectie), of `G` + klik | Het **verzamelpunt**: nieuwe brood wacht daar (paarse cirkel met vlag). Kan de brood er niet heen lopen (een gesloten deur), dan graaft ze zich door de rots en komt ze 4 seconden later bij het verzamelpunt boven. |
| `A` + klik | **Aanvallen**: je selectie, of zonder selectie alles wat wacht (elk team vanaf zijn eigen verzamelpunt, dus van meerdere kanten), gaat naar die plek of dat doelwit. **Shift+A**: **samen**: wie dichterbij staat wacht, zodat iedereen tegelijk toeslaat. |
| `Ctrl` + cijfer, cijfer | **Teams**: een selectie onthouden en terugroepen (een klein cijfer boven elk wezen toont zijn team). Met één team geselecteerd zet **G** + klik **het verzamelpunt van dat team** (een genummerde vlag); een heel team verplaatsen met rechtsklik verplaatst zijn punt mee. Het gewone verzamelpunt laat de teams met rust. Geen tactiekknop: flanken en lokken doe je met je teams. |
| `T` | **Hatch into**: in welk team nieuwe brood uitkomt (geen, of team 1, 2 …); een batch komt dan uit bij de vlag van dat team en hoort er meteen bij. |
| `Z`, dan `F` | **Seedling** (waar de missie het toelaat, `swarm.seedling`; 250 biomassa): een zaadpod op pootjes die niet vecht. Breng hem naar open grond, minstens 8 tegels van de Lunar Corps en 12 van een ander nest, en druk **F**: in 18 seconden schiet hij wortel en wordt hij een **jong nest** (hoogstens 3 nieuwe nesten per missie, per missie aan te passen met `swarm.seedMax`). `SWARM_PLAY.seed`. |
| Slepen, klik | Swarm-eenheden **selecteren**. Met een selectie stuurt rechtsklik ze naar die plek (daar wachten ze), of op een vijand: aanvallen. De camera volgt de groep die je stuurt (Follow aan, `C`). `A` + klik stuurt dan alleen de selectie. Groepen bewaren met Ctrl+1–5 werkt ook. |
| `H` | **Oogsten**: je selectie gaat de gevallenen ophalen die in het veld liggen: per lichaam één drager en één bewaker. Zonder selectie gaat de wachtende brood; wacht er niemand, dan je brood in het veld (eerst wie niet vecht, anders wie nog vecht). |
| `K` | **Hive Sense** aan/uit (rechtsonder, knop *Sense*): de Brood voelt de warme lichamen van de Lunar Corps rond je selectie (of rond het verzamelpunt), 30 tegels ver. **Rood** = een soldaat, **oranje** = makkelijke prooi (alleen of in een klein groepje: hooguit 2 soldaten en kanonnen binnen 6 tegels, of een oefensoldaat buiten zijn ring), **geel** = een gevallene of kadaver dat op **H** wacht. Het klopt als een hart, sneller naarmate de dichtste soldaat dichterbij is. `HIVE_SENSE` in js/engine/26-swarm-command.js. |
| `B` + klik | **Ingraven**: 5 eenheden graven zich op uit de grond waar je klikt, minstens 6 tegels van de Lunar Corps. 45 biomassa, daarna 25 seconden wachten. |

- **Oud ei** (`mission.oldEggs`: in *The Waking* in het oosten bij de tunnel, ook in *Signal in the Dark* en *Seed the Moon*): zet brood naast het ei (binnen 3 tegels) zonder soldaat binnen 4 tegels; na 20 seconden in totaal breekt het open in een **jong nest**. Een soldaat in de buurt laat het weer inslapen. `SWARM_PLAY.oldEgg`.
- **Uit een cocon:** wat eruit kruipt (Husk, Bloater) sluit aan bij het wachtende brood aan het verzamelpunt en wacht op je bevel; het gaat niet zelf op jacht.
- **Biomassa:** elke hive levert biomassa per seconde (`swarm.rate`). Elke soldaat die sterft (ook wie doodbloedt) geeft er 12. Een lichaam dat thuis op de schimmel van een hive belandt, geeft er 20.
- **Limiet:** je kan hoogstens 30 tot 40 brood tegelijk hebben (`swarm.cap`). De paar bewakers die elke hive zelf kweekt, tellen niet mee en kosten niets.
- **Alles uit de Swarm werkt mee:** lichamen infecteren en wegslepen, Husks die als krijgers jagen, schimmel die je eenheden geneest, hives die krijsen en broed uitspuwen als ze geraakt worden.
- **Wat je ziet:** je ziet wat je eenheden, hives en schimmel zien. De bovenbalk toont *Biomass*, *Brood* (jouw brood / limiet) en *Swarm* (alles samen). De radio van de Lunar Corps vang je op als *Intercept*; de stem van de Brood staat in het groen. De motion tracker toont nu de soldaten.
- **De computer (Lunar Corps):** de soldaten houden hun positie, schieten op wat binnen bereik komt en komen helpen als een gebouw of soldaat in de buurt geraakt wordt (14 tegels). Medics lappen op, Engineers herstellen. Het missiescript laat ze verplaatsen, stuurt versterking met het dropship, traint nieuwe soldaten en stuurt aanvalsploegen naar je hives.
- **Moeilijkheid** maakt de Lunar Corps sterker (`SWARM_DIFF` in js/engine/26-swarm-command.js): Easy 85% levenspunten en schade, Hard 125% levenspunten, 115% schade en 35% meer versterking (`g.n(x)` in de scripts). In *Kappa Siege* staan op Easy/Normal/Hard 2/3/4 Sentry Guns.
- **Instelbaar:** `SWARM_PLAY` (limiet, biomassa per kill, ingraven, tunnelen) in js/engine/26-swarm-command.js; per missie in `swarm:{ … }`: `rate`, `cap`, `unlock`, `guardMax`. Extra missievelden: `side:'swarm'`, `start.rally` (eerste verzamelpunt). Extra mission API: `g.corps()`, `g.orderCorps(lijst|'all', punt, 'amove')`, `g.place(type, punt, dx, dy)`, `g.biomass(n)`, `g.brood()`, `g.inbound()`, `g.n(x)`, `g.brood_say(tekst)`. Missies staan in `SWARM_MISSIONS` (js/content/missions/s01-… tot s08-…).

| # | Missie | Kaart | Doel |
|---|---|---|---|
| 1 | **The Waking** | Kappa Canyons | De andere kant van *Dust Landing*. Je twee hives zitten achter de blast doors; een kleine brood wacht in de oostelijke tunnel. Squad Dust loopt naar het station, het dropship brengt twee keer versterking, en zodra er een Pyro is, gaan de deuren open en komen ze je nesten platbranden. Laat niemand leven en houd minstens één hive in leven. Optioneel: breng 2 gevallenen naar huis, naar een hive. |
| 2 | **The Graft** | Kappa Canyons | Je bestuurt **één wezen**, van ei tot nest. Een Drone sleept een gesneuvelde van Dust naar het westelijke nest; het ei dat opengaat, ben jij. **Grafter**: rechtsklik het lichaam en klamp je vast. **Cocon**: overleef. **Twitcher**: voed je, dood 3 grazers (een soldaat telt dubbel; je mag ook neergevallen soldaten opeten). **Shambler**: verberg je, blijf 10 seconden lang minstens 11 tegels van elke soldaat (een jachtploeg zoekt je, op Hard met een Pyro; zijn ze verder dan 16 tegels, dan verliezen ze je spoor). **Husk**: zoek open grond, minstens 9 tegels van de Lunar Corps en 12 van een andere hive, en druk **F** om wortel te schieten (12 seconden; je krijgt dan maar de helft van de schade, en het nest stuurt zijn brood om je te beschermen). Groeit het nest, dan win je; sterft je wezen, dan verlies je. X centreert de camera op je wezen. Het nest kan een kleine brood laten uitkomen (Q, W, E). De nestbewakers laten de grazers met rust: die zijn voor jou (`swarm.spareFauna`). Instellingen: `AVATAR` in js/engine/27-training.js. |
| 3 | **Kappa Siege** | Kappa Basin | De andere kant van *Hold Kappa*. De Lunar Corps zit ingegraven rond een versterkte Command Post (dubbele levenspunten) met Sentry Guns, barricades en twee Relay Towers, traint om de minuut een soldaat en stuurt na 4 en 9 minuten een ploeg naar je dichtste hive. Vernietig de Command Post voor het konvooi aankomt (15 minuten). Optioneel: vernietig beide Relay Towers. |
| 4 | **Lights Out** | Mare Colony | De andere kant van *Blackout*. De Lunar Corps heeft de vier generatoren in de hoeken weer aangezet; hun licht verblindt de Brood (trager en minder schade in een verlichte straat), in het donker zie je minder ver. Zolang er één generator draait, is de Command Post onkwetsbaar (gele ring). Bijt een generator stuk: een Engineer met escorte komt hem herstarten, lok ze. Doe alle vier tegelijk uit en breek dan de Command Post af. |
| 5 | **The Hollow Choir** | Hollow Colony | De andere kant van *The Hollow Colony*. Een ploeg zoekt Dr. Maas: ze lopen naar het lab, snijden haar deur open (12 s) en brengen haar naar het landingsplatform, waar na 12 minuten het dropship landt (na 6 minuten zet het er een ploeg af om het open te houden). Dood Maas voor ze vertrekt. Optioneel: breng 5 gevallen kolonisten naar huis (ze liggen verspreid door de hallen). |
| 6 | **Signal in the Dark** | Selene Highlands | De andere kant van *High Ground*. De Lunar Corps heeft de drie uplink-bakens in handen (elk met een ploeg en een Sentry Gun) en roept een vloot, die na 15 minuten landt. Een baken valt stil als je brood ernaast staat zonder soldaat erop (15 s); een soldaat moet er dan 20 s alleen op staan om het terug te nemen. Houd **alle drie tegelijk 60 seconden** stil. Wie een baken verliest, stuurt een ploeg om het terug te nemen; om de 2,5 minuten landen verse soldaten, na 7 en 12 minuten gaat een ploeg naar je dichtste nest. Twee oude eieren en de Seedling. |
| 7 | **Mother's Call** | Maw Depths | De andere kant van *Brood Mother*. De Brood Mother ligt gewond (45%) in haar lair, achter het levende membraan dat de drie eikamers (je hives) voeden. Vanaf de grotmond sturen ze om de 90 seconden een vuurploeg met Pyro naar de dichtste eikamer, elke keer groter. Vallen alle drie de kamers, dan rot het membraan weg en gaat iedereen op haar af. Je stuurt haar niet zelf (haar eigen AI), maar ze geneest als ze eet. Houd haar 12 minuten in leven. |
| 8 | **Seed the Moon** | Tycho Maw | De Lunar Corps brandt de krater plat vanuit een baan om de maan. Vanaf 1:30 valt om de 70 seconden een **inslag**: een rode cirkel met een aftelling (*SCORCH*, 15 s), daarna 400 schade voor elk wezen erin en 90% van zijn levenspunten voor een hive. Meestal op het nest dat het langst niet geraakt werd, elke derde keer op de dikste groep brood. Groei: Seedlings (hoogstens 5 nieuwe nesten, `swarm.seedMax`) en drie oude eieren. Heb **6 nesten** als de 15 minuten om zijn. |

- **Licht verblindt** (*Lights Out*, `mission.lightBlind`): Swarm in het licht van een draaiende generator loopt trager en doet minder schade (`SWARM_LIGHT`: `slow` 0,75, `dmg` 0,7, in js/engine/26b-swarm-missions.js, ook in het dev panel).
- **Inslag uit de ruimte** (*Seed the Moon*): `scorchAt(x, y, straal, aftelling)` in js/engine/26b-swarm-missions.js; schade instelbaar in `SWARM_SCORCH` (`unit`, `hive`, `warn`).
- **De computer helpt zichzelf** (js/engine/26b-swarm-missions.js): `corpsMendGenerators(g, escorte)` stuurt een Engineer met escorte naar een uitgevallen generator, `corpsRetake(g, baken, n)` stuurt een ploeg naar een verloren baken, `colonistBodies(punten)` legt gevallen kolonisten op de kaart.

*Kappa Siege* is getest met een eenvoudige automatische speler: op Easy en Normal winbaar, op Hard verloor die. Missies 4 tot 8 zijn getest op hun mechanismen, winst en verlies (`tools/tests/swarmcamp.py`), nog niet op balans.

---

### De derde campagne: *Rogue Strain* (de Osprey-bemanning)

Een derde knop op het campagnescherm, **Play as The Osprey crew** (rood), staat er altijd, maar de campagne is pas **speelbaar** als **de hele Lunar Corps-campagne** (alle 11 missies) gewonnen is op **Normal of Hard**; een missie die je alleen op Easy won, telt niet (`rogueUnlocked` en `ROGUE_UNLOCK_DIFF` in 31-rogue.js). Tot dan staat op de knop *🔒 Playable after the Corps campaign* en kun je het Rogue-scherm al openen: de titel, de intro en de acht jobs (allemaal *LOCKED*, ook Shift-klik opent ze niet), en in plaats van het splice lab een kaart met wat ervoor nodig is en hoe ver je bent (*Lunar Corps: 3 / 11 missions won on Normal or Hard*, `buildRogueLock`). *Reset campaign* staat dan niet op het scherm. (Sinds nov 2026; daarvoor was de knop verborgen.) Win je de laatste ontbrekende missie, dan meldt het eindscherm dat er een nieuwe campagne open is. Wie vóór nov 2026 de acht oude Corps-missies al op Normal of Hard won, houdt de campagne open (`ROGUE_LEGACY`); de drie nieuwe Corps-missies hoeven dan niet eerst. (Tot nov 2026 ging ze open na missie 4.) Het verhaal: de Osprey, het eerste reddingsschip dat voor het lab van Dr. Maas neerstortte, staat geboekt als *verloren met alle opvarenden*. Dat klopt niet. Zeven overlevenden vonden Maas' stalen, zagen wat Swarm-DNA met een lichaam doet, en meldden zich nooit meer. Ze gaan AWOL en proberen zichzelf sterker te maken met Swarm-DNA. Je speelt die bemanning: geen basis, geen dropship, opgejaagd door de Swarm en door de Corps die ze achterlieten. (Het spoor uit missie 4, *"Swarm bodies here. Shot clean through... That was not us."*, was dus de bemanning.) Code: `js/engine/31-rogue.js`, inhoud: `js/content/rogue.js`, missies: `js/content/missions/r01-…` tot `r06-…`, met `r01b-…` en `r05b-…` ertussen (in `ROGUE_MISSIONS`, missieveld `rogue:true`).

**De bemanning** (`ROGUE_CREW`, vaste mensen met een eigen rooster in `hc-rogue`, los van de veteranen van de Lunar Corps): **Capt. Kerckhoffs** (Trooper, Captain; zijn korte bio (lab) knipoogt naar de Bokkerijders, zijn langere tekst in Intel (`intel`-veld) vertelt over Heinrich Joseph Kerckhoffs, de chirurgijn uit Herzogenrath die hun vermeende leider was; tot nov 2026 heette hij Haesaert, een bewaarde bemanning wordt bij het laden omgezet: leidt de squad met de AURA), **Sgt. Dehandschutter** (Gunner), **Cpl. Mortier** (Pyro), **Cpl. Devreese** (Medic, zij), **Pvt. Cnudde** (Engineer), **Pvt. Van Wesemael** en **Pvt. Braet** (Troopers). Ze nemen rang, XP, strains en taint mee van job tot job. Gaat er iemand dood in een job die je wint, dan komt die de volgende keer terug met **+20 taint** (*de strain naaide hem weer aan elkaar*). Een verloren job kost niets: alles staat terug zoals ervoor.

**DNA oogsten.** Een Swarm-wezen dat de bemanning doodt (niet met vuur), laat soms een staal achter: een groen flesje op de grond (Crawler 35%, Drone 30%, Spitter 50%, Brute en Husk altijd; `ROGUE.dna`). Loop erover. Een **hive** die de bemanning doodt zonder vuur laat **3 Hive-stalen** achter (*HARVEST*); verbrandt Mortier hem, dan is er niets (*BURNT · NO SAMPLES*). Ook wat in de brandende grond of in de vlam sterft, levert niets op. De Pyro is dus je sterkste wapen, maar wat hij verbrandt, kun je niet gebruiken. Stalen rotten na 90 s weg. Bovenaan staan **DNA** (stalen deze job) en **Stabilizer** (dosissen).

**Splicen (het splice lab op het campagnescherm).** Aan de Rogue-kant staat in plaats van *je eigen soldaat* het lab: je DNA-voorraad, de zeven bemanningsleden met hun taint-balk en strains, en per bemanningslid zes knoppen. Elke strain kan een soldaat één keer krijgen (`STRAINS`):

| Strain | Uit | Kost | Taint | Effect |
|---|---|---|---|---|
| Night Eyes | Crawler | 3 | +10 | +2 zicht, verliest bijna niets in het donker, +5% snelheid |
| Swift | Drone | 3 | +10 | +15% snelheid |
| Acid Blood | Spitter | 3 | +14 | +15% schade, zijn kogels laten zuur in de wonde (2 s) |
| Chitin | Brute | 2 | +16 | +20% pantser, +15% levenspunten |
| Knitting Flesh | Husk | 2 | +18 | geneest 2,5 HP/s als hij 4 s niet geraakt is |
| Hive Scent | Hive | 3 | +22 | de jacht laat hem links liggen, hives merken hem niet op, de brood kiest hem als laatste |

Devreese splicet niemand voorbij **95% taint**. Een stabilizer-dosis in het lab haalt er 35 af.

**Taint** (`ROGUE.taint`) werkt in twee richtingen. Elk punt geeft +0,2% schade (*fever*). Vanaf **30%** laat de jacht (*THE HUNT*) hem links liggen, vanaf **60%** geneest de schimmel hem (4 HP/s) en zie je groene aders door zijn pak. Maar vanaf **85%** krijgt hij af en toe een aanval (*SEIZURE*, 1,6 s op de grond) en op **100%** gaat hij **feral**: 10 s lang luistert hij niet meer, rent op het dichtste doelwit af (Swarm of Corps), sneller en harder, en zakt daarna 3 s in elkaar met 70% taint. Een tijdelijke straf, geen verlies. Op de schimmel staan kost +1,2 taint per seconde. Na elke gewonnen job zakt de taint met 8.

**Na een feral aanval** zegt hij iets als *"Sorry about that."* (`ROGUE_VOICE.sorry`) en keert hij terug naar zijn squad: naar zijn oude plaats in de formatie als die nog bestaat, anders naar het dichtstbijzijnde bemanningslid.

**De weg naar buiten** (de meeste jobs): een oude mijnschacht in de wand (`start.shafts`-item met `exit:true`). Zolang de job niet af is, blijft hij dicht. Daarna **rechtsklik je op de schacht**: de geselecteerde soldaten lopen erheen, en wie aankomt, verdwijnt veilig in het donker (*INTO THE DARK*). De job is gewonnen als er niemand van de bemanning meer rechtop op het veld staat. De Swarm gebruikt die schacht niet. In jobs 1, 3 en 5 nemen de andere schachten het over van de hives die je vernietigt (`shaftHeirs`). In een Rogue-job komen de waarschuwingen van het spel zelf (hives, husks, de jacht) van Devreese en Kerckhoffs in plaats van Dr. Maas en Kessler (`ROGUE_ADVISORS`).

**Stemmen.** De bemanning heeft eigen zinnen (`ROGUE_VOICE` in js/content/rogue.js): korter en harder (*"Talk."*, *"Into the dark."*, *"Shoot, don't burn!"*). Bij de eerste schoten op de loyale Corps zeggen ze *"Corps. Our old friends."*. Boven 85% taint zeggen ze soms iets als *"I can hear them singing..."*. Bij een aanval hoor je *"Not now... not now!"*, feral hoor je alleen gegrom, en de Medic zegt iets bij een dosis. De spraakstem is lager en trager dan bij de Corps, en zakt verder naarmate de taint stijgt (tot −45% toonhoogte en −25% tempo bij 100%). Feral is ze bijna een grom (`ROGUE_VOICE_TONE`).

**Intel** heeft altijd een tab **Rogue Strain** (zolang de campagne niet open is met een 🔒 voor de naam; sinds nov 2026, daarvoor verscheen hij pas bij het openen): de zeven bemanningsleden zoals ze nu zijn (rang, taint, strains), de zes strains (wie ze draagt) en uitleg over stalen, taint, stabilizer, de sluier, de loyale Corps en de weg naar buiten.

**Bijna feral** (`ROGUE.taint.warn`, 92): elk bemanningslid met 15+ taint heeft een taint-balkje onder zijn levensbalk (groen, oranje vanaf de stuipen, rood en knipperend vanaf 92). Vanaf 92 staat er ook een rode ring aan zijn voeten en een **!** boven hem, en zijn portret (en zijn vakje in een groep) knippert rood met *About to go feral*. De eerste keer in een missie komt er een ping op de minimap, een hartslag, en Devreese waarschuwt (*… is about to snap!*), met wat je kan doen: een dosis (de Medic en J), of hem van de creep halen als er geen dosissen meer zijn. Is Devreese het zelf, dan waarschuwt Kerckhoffs.

**Stabilizer** (`ROGUE.stab`): selecteer een Medic van de bemanning en druk **J** (of de knop ✚ bij *Orders*): de soldaat met de meeste taint binnen 4 tegels krijgt −35 taint, een feral soldaat komt meteen tot zichzelf. Elke job begint met 1 dosis bovenop wat je bewaarde; dosissen die je niet gebruikt, blijven in het lab. Heeft de bemanning **Maas' formule** (gewonnen in *Needle and Thread*), dan brouwt Devreese er voor elke job nog **1** bij (`ROGUE.stab.formula`); de briefing en de Intel-kaart tellen die mee, en het eindscherm van *Needle and Thread* meldt het.

**De sluier** (`ROGUE.veil`, alleen in een job met `veil:true`, nu *Among Them*): een bemanningslid met **40+ taint**, of met **Hive Scent**, is *veiled*. Geen enkel Swarm-wezen en geen hive kiest hem als doelwit; hij loopt ongezien tussen het broed. Je ziet het aan een paarse gloed, een gestippelde paarse ring aan zijn voeten, opstijgende vonkjes en een half doorzichtige soldaat; boven hem verschijnt *VEILED*, en op zijn taint-balk staat een paars streepje op 40. Bij de stats staat *Veiled* of *Seen x s*. **Schiet hij** (ook automatisch!) of gaat hij **feral**, dan scheurt de sluier: 8 s lang (`veil.broken`) ziet het broed hem zoals iedereen, en wat dichtbij staat, valt hem meteen aan (*SEEN*). Gebruik dus **Hold fire (Q)**. Een dosis stabilizer kan hem onder de 40 duwen: dan is hij weer zichtbaar. Devreese legt het uit bij de eerste keer, bij het eerste schot en bij de eerste die te *schoon* wordt.

**De loyale Corps** (factie `loyal`): soldaten en gebouwen van de Lunar Corps die op de bemanning schieten. Ze dragen het gewone Corps-uniform (op de minimap blauw); de bemanning zelf draagt zwart en donkerbruin met een **rode band om de arm** (`CREW_KIT` in js/engine/31-rogue.js), vechten ook tegen de Swarm, komen elkaar helpen binnen 12 tegels, en laten een lichaam achter waar de Swarm een Husk van maakt. Een gedode loyale soldaat geeft 2 XP. Hun Relay Towers betalen jou niets. Op Easy/Hard hebben ze 85%/120% levenspunten (`ROGUE.loyal`).

**De acht jobs:**

| # | Job | Kaart | Doel |
|---|---|---|---|
| 1 | **Osprey Down** | Hollow Colony | Vóór *The Hollow Colony*. De bemanning kruipt gewond uit het wrak. Dr. Maas doet haar deur niet open (intercom), maar Cnudde (een Engineer) kraakt haar stalenvriezer in 12 s: 2 Hive-stalen en een stabilizer. Dan hoor je Varga de Osprey verloren verklaren en vertrekt Dust (4 min). Sterft Cnudde (de enige Engineer) voor de vriezer open is, dan verlies je; neer is nog niet dood, een Medic kan hem oplappen. Verzamel 6 stalen en verdwijn met iedereen door de Swarm-tunnel in de zuidwand (rechtsklik erop). De schachten in het noorden en oosten nemen het over van de hives. Blijf je te lang, dan landt Dust en jaagt op je. |
| 2 | **Needle and Thread** | Kappa Basin | Een week na *Osprey Down*. De Corps heeft van het relaisstation dat Dust in *Hold Kappa* hield een veldhospitaal gemaakt (drie tenten, een records-terminal, twee Sentry Guns, een garnizoen met Medics en een patrouille). Een **Medic** moet **50 s** aan de terminal staan (de voortgang stopt als ze wegloopt, neergaat of feral is). Zodra ze begint, of zodra iemand de bemanning ziet, belt het hospitaal Tycho: **3 hulpsquads** landen op het pad in het noordoosten (na 20 s, daarna om de 35 s; 4 soldaten op Normal, 3 op Easy, 5 op Hard; de tweede brengt een Pyro, de derde een Medic) en jagen op je. Na 50 s alarm komt ook de Swarm op de sirenes af. Neem de **3 kisten stabilizer** voor de tenten. De bestanden geven **Maas' formule**: vanaf de volgende job brouwt Devreese 1 dosis extra per job. Sterft elke Medic voor de download klaar is, dan verlies je. Weg via de oude schacht in de noordwand. Instelbaar in het dev panel onder *This job* (`job.download`, `firstWave`, `waveEvery`, `waves`, `squad`). |
| 3 | **Dead Air** | Kappa Canyons | Kappa Station is een Corps-bevoorradingspost. Neem de drie kisten op het platform (een met 2 stabilizers). Verplicht: Kappa mag Tycho niet bellen. Ziet een loyale soldaat of Sentry je terwijl er nog een Relay Tower staat, dan beginnen de torens te bellen: haal ze allebei binnen 30 s neer, anders verlies je. Torens die al neer zijn (door de bemanning of door de Swarm) kunnen niet meer bellen, dus laat de Swarm eerst het garnizoen uitdunnen. Het stationsplatform en de noordelijke toren blijven de hele missie zichtbaar (geen mist), zodat je van ver ziet wat de Swarm al vernietigd heeft. Weg via de oude mijnschacht in de oostwand. |
| 4 | **Cold Harvest** | Mare Colony (donker) | De Corps heeft de vijf generatoren aan (onkwetsbaar). Wie van de bemanning in hun licht staat, wordt gezien door elke soldaat bij die generator, en een patrouille komt kijken. **Oogst 3 van de 4 hives** zonder vuur; verbrand je er te veel, dan verlies je. Optioneel: nooit in het licht. Weg via de mijnschacht in het zuidwesten. |
| 5 | **The Fever** | Ridgeback Canyon | De bemanning met de meeste taint (niet de Captain of de Medic) heeft koorts: minstens 72 taint en +0,45 per seconde, dus telkens weer feral. Alleen het lied van een levende hive kalmeert de strain: houd hem **20 s binnen 4 tegels van een levende hive**. Een sweep team van Lt. Okafor verbrandt intussen de hives één voor één (zuidoost, noordoost, midden, noord, zuidwest). Ze stoppen 7,5 tegels voor elke hive in een cirkel (Pyro, Medic en Engineer in het midden) en houden stand tegen wat komt. Is het 4 s rustig, dan gaan de geweren de hive van op afstand te lijf (de Pyro pas onder 50%), en bij een tegenaanval terug in de cirkel (`FV_SWEEP`); valt het weg, dan komt er één keer een tweede. Zijn alle hives weg voor hij genezen is, of sterft hij, dan verlies je. Weg via de zuidelijke schacht. |
| 6 | **Hunted** | Selene Highlands | Sgt. Kessler (3× levenspunten, boss-balk) en zijn squad landen en jagen op je; na 4 min komt Okafor met nog een ploeg. Neem één van de drie uplink-bakens: de **Magpie** (een ertsvrachtschip zonder vragen) komt na 2,5 min naar dat baken; dan iedereen aan boord. Optioneel: **laat Kessler leven**. Onder 30% trekt hij zich terug (onkwetsbaar) en vertrekt; schiet je hem eerder dood, dan mislukt het. |
| 7 | **Among Them** | Tycho Maw | De nacht na *Hunted*. De Magpie zet de bemanning af op de landingsrug in het zuiden; de weg naar de Maw Depths is een oude schacht in de noordwand, pal onder het grootste nest. Vijf hives, veel te veel om te bevechten. **De sluier** (zie hierboven): wie 40+ taint heeft of Hive Scent draagt, loopt ongezien tussen het broed zolang hij niet schiet. Niemand ver genoeg? Bij de **oude burrow** ten westen van de rug ligt creep: blijf erop staan tot de taint hoog genoeg is. **Drie choir pods** (oost, noordoost, noordwest), elk naast een nest, houden het broed wakker: een **veiled** bemanningslid moet er **12 s** bij staan (een paarse balk boven de pod; loopt hij weg, dan zakt hij langzaam terug). Een schone soldaat kan het niet. Elke stille pod laat 1 Hive-staal vallen en stuurt het broed op de schone soldaten op de rug af (een golf uit de nesten, en de eerste twee keer kruipt er ook broed uit de oude burrow, vlak naast de rug). Let op: de pods staan op de creep, dus de taint stijgt terwijl je er staat. Zijn alle drie stil, dan **slaapt het broed 90 s** (*The brood sleeps*: niemand valt aan, de jacht staat stil, *z* boven de beesten; de bemanning valt ze ook niet aan). In die tijd moet iedereen door het nest en de schacht in. Daarna wordt het wakker met een grote golf naar de schacht. Optioneel: **niemand gaat feral**. Instelbaar onder *This job* (`job.pod`, `lull`, `stir`, `burrow`). |
| 8 | **Mother's Blood** | Maw Depths | Vóór *Brood Mother*. Het membraan voor de lair gaat open als de drie eierkamers weg zijn, **of** als een bemanningslid met **60+ taint** er 6 s tegenaan staat (*het kent zijn eigen soort*). Bloed de Brood Mother leeg (40% van haar gewone levenspunten): ze **sterft niet**, maar rukt zich los en graaft zich weg in de diepte (*SHE TEARS FREE*; ze leeft nog in *Mother's Heart* en *Brood Mother* van de Corps), en laat **een van haar harten** achter. Dat hart blijft kloppen, en Dust daalt af (2,5 min). **Kies:** zet iemand (geen Pyro) 8 s op het hart: ***Ascension***, de Mother-strain gaat in iedereen (♛ in het lab). Of zet Mortier (een Pyro) 6 s ernaast: ***Ashes***, alles gaat in vlammen op. Kies je niet op tijd, dan verlies je. |

**Trofeeën** (`ROGUE_TROPHIES`, bewaard in `hc-trophies`): in het onderste blok van de Trophy wall *Ascension* en *Ashes* (de twee eindes), *Full Strain* (één bemanningslid met alle zes strains), *Cold Blood* (alle jobs gewonnen zonder dat iemand ooit feral ging; sinds het laatste *Reset campaign* aan de Rogue-kant), *Wolf in the Fold* (*Among Them* gewonnen zonder dat er ooit een sluier scheurde: geen schot van een veiled soldaat, niemand feral terwijl hij veiled was); in de rij *Rogue* *Deserter* (alle acht jobs op Easy), *Turncoat* (op Normal) en *Apex Strain* (op Hard), met voortgang (x / 8). Een winst op Hard telt ook voor Normal en Easy. (*Ghost Crew* is weg sinds nov 2026: hetzelfde als Deserter.)

**Reset campaign** aan de Rogue-kant wist alleen de Rogue-jobs, de bemanning, het lab en een bewaarde Rogue-job. Aan de andere kanten wist het nu ook het lab. De briefing van een job noemt de bemanning met hun taint; het eindscherm toont de stalen, wie terugkwam, promoties en de taint van iedereen.

**Instelbaar:** `ROGUE` in `js/content/rogue.js` (ook in het dev panel, tab **Rogue**). Extra mission API voor Rogue-missies: `g.loyal(type, punt, n, { hunter, patrol:[punten], hold, tough })`, `g.loyalB(type, punt)`, `g.loyals()`, `g.hunt(lijst)`, `g.crew()`, `g.crewUp()`, `g.crewNear(punt, r)`, `g.crewMember(id)`, `g.spotted()`, `g.dna(soort?)`, `g.harvested()`, `g.sample(soort, punt, n)`, `g.cache(punt, { stab, loot })`, `g.stabs()`, `g.crewSay(wie, tekst)`, `g.ending(soort)`, `g.formula()` (de bemanning heeft Maas' formule), `g.veiled(u)` / `g.veilKin(u)` (de sluier), `g.lull(seconden)` / `g.lulled()` (het broed slaapt: wapenstilstand met de bemanning, de jacht staat uit); in de missie: `start.crewAt` (waar de bemanning staat), `stab` (extra dosissen), `veil:true` (de sluier werkt in deze job), `job:{ … }` (eigen getallen van de job, in het dev panel onder *This job*). Stemmen van de Corps (Varga, Kessler, Kestrel, Okafor …, `ROGUE_INTERCEPT`) komen binnen als *Intercept*, de bemanning spreekt in het rood.

**Getest** met `tools/tests/rogue.py` (moet eindigen met `ALL OK`): ontgrendelen, het lab, stalen en vuur, oogsten, taint, aanvallen, feral, stabilizer, de strains, een gevallen bemanningslid, de zes oorspronkelijke jobs (winst en verlies, beide eindes), opslaan en laden. Een paar gevallen daarin hangen van het toeval af en falen soms (*the fit ends*, *back in his place*, *picked up*); dat was al zo voor de twee nieuwe jobs. `tools/tests/rogue2.py` (moet eindigen met `ALL OK`) test *Needle and Thread* (hospitaal, download, alarm, hulpsquads, kisten, de formule in de volgende job, verlies zonder Medic) en *Among Them* (de sluier: wel en niet gezien, schieten, genezen, Hive Scent, alleen in die job; pods, burrow, slaap, ontwaken, winst, Wolf in the Fold, feral) plus opslaan/laden, Intel, de trofeewand en het dev panel. *Osprey Down* is ook door een eenvoudige automatische speler uitgespeeld (Normal, 16 stalen). De balans van de andere jobs is nog niet met de hand getest. *Needle and Thread* en *Among Them* zijn door een eenvoudige automatische speler uitgespeeld (Normal): *Needle* in ±2 min, met alle drie de hulpsquads en twee tot vijf bemanningsleden die het halen; *Among Them* in ±2 min met één veiled soldaat die de drie pods doet (taint van 45 naar 80-90) en de rest die zonder sturing op de rug blijft (tot 58% levenspunten).

### Na een nederlaag: de strijd loopt door
Mislukt een missie, dan is het rapport (*Defeat*) **doorzichtig** en speelt het gevecht erachter gewoon verder: de Swarm sleept zijn doden weg, Husks komen uit, golven trekken verder. De mist verdwijnt, zodat je alles ziet. Je kan de camera verslepen (muis), met de pijltjestoetsen bewegen of op de minimap klikken. Met **Watch the field** verberg je het rapport helemaal; **Show report** bovenaan haalt het terug. Triggers en scripts lopen niet meer (`afterDefeat()` in js/engine/14-mission-api-triggers.js). Zolang er nog soldaten leven, **jaagt de Swarm ze op** (zie *De jacht* bij de Husk): om de 20 seconden, met een gewone golf als er geen Husk is.

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
- **Camerashot bij de start**: ligt er een oeroud ei op de kaart, dan glijdt de camera na de briefing even naar het ei (de mist gaat daar een paar seconden open, gouden ping), blijft ±3 seconden hangen en glijdt dan terug naar je squad (follow staat weer aan). Zelf scrollen, iets selecteren of een bevel geven breekt het shot meteen af. Het ei houdt een **gouden marker** (pijl boven het ei, pijl aan de schermrand, knipperpunt op de minimap) tot het weg is: door de Swarm overgenomen of door jou binnengehaald. Dr. Maas zegt haar zin over het ei pas als je squad het zelf ziet. Een opgeslagen spel speelt het shot niet opnieuw af. Instelbaar: `SHOWCASE` in js/engine/20-input.js (dev-paneel, tab Effects). Voor missies: `g.showcase(id, plek, label, kleur)`, de marker gaat weg met `g.unmark(id)`.
- Wat je vindt, wordt onthouden (`hc-relics`). Ook als je de missie verliest, hou je het. Een **voorwerp** is daarna voorgoed weg van de kaart. Een **oeroud ei** ligt er bij elke nieuwe keer dat je de missie speelt opnieuw: de Swarm wil het nog altijd, en laat je het liggen, dan kan er nog steeds een hive uit groeien. Een ei dat je al had, telt niet nog eens mee op de trofeemuur.
- **Intel → Relics**: alles wat je vond, met het verhaal; wat je nog niet vond staat er als *???* met de missie waarin het ligt.
- **Trofeemuur**, rij *Relics*: **Archivist** (alle voorwerpen) en **Egg Hunter** (alle oeroude eieren). Op het eindscherm staat wat je die missie vond.
- **Elk relic heeft een eigen sprite** (js/engine/01b-relic-art.js, `RELIC_ART`, op relic-id): de flight recorder, de mok, de dronekern, het charter, het pluche konijn, de cassette, de fossiele scherf, de vlag en vier verschillende oeroude eieren. Op de kaart en in Intel. Een nieuw relic zonder eigen sprite krijgt het algemene kistje of ei.
- Instelbaar: `EGG_RELIC` in js/engine/29-relics.js (hoe lang vasthouden, wanneer de Swarm komt, hoeveel Drones).

## Dev-modus (waarden testen tijdens het spelen)

Druk tijdens een missie op **F9** (of de toets links van 1: `²` op AZERTY, `` ` `` op QWERTY). Rechts verschijnt een half doorzichtig paneel.

**Alle missies open (campagnescherm):** druk op het campagnescherm op dezelfde toets (`²` of F9). Dan staan alle missies van de drie campagnes (Lunar Corps, The Swarm, Rogue Strain, splice lab inbegrepen) open en speelbaar; de voortgangsregel toont in oranje *DEV: all missions open*. Nog eens drukken zet alles terug zoals het was. Je voortgang wordt niet aangepast (win je een missie, dan telt die wel gewoon mee), en de stand wordt niet bewaard: herladen zet het uit. Test: `tools/tests/devunlock.py` (moet eindigen met `ALL OK`).

- **Bovenaan:** *Pause/Run* pauzeert of hervat het spel zonder menu (je kan intussen wel bevelen geven), de snelheid (0,25× tot 4×), ◐ wisselt de doorzichtigheid, en een klik op **DEV** klapt het paneel dicht of open. ✕ of F9 sluit het. Het paneel hoort bij de missie: ga je naar het menu (Quit, Main menu), dan verdwijnt het vanzelf, en in de menuschermen opent F9 het niet. Op het eindscherm blijft het nog open.
- **Live:** wat er nu gebeurt (tijd, moeilijkheid, hives, golf en wanneer de volgende komt, hoeveel Swarm rondloopt tegenover het maximum, troepen, de grootte van de volgende golf). Je kan salvage, biomassa, fakkels en de tijd tot de volgende golf meteen aanpassen. Knoppen: *Wave now*, *Reveal map* (aan/uit: blijft de hele missie aan), *Heal everyone*, **Max XP** (elke soldaat op de kaart en in reserve die er nog niet zit, krijgt de hoogste XP: 60, Captain, voor je eigen soldaat, 40, Lieutenant, voor de anderen; wie al meer heeft, houdt dat), **XP to 0** (iedereen terug naar 0 XP, Private), *Kill all roaming Swarm*, *Win mission*, *Lose mission*. Dit geldt enkel voor het lopende spel (maar win je de missie, dan gaan de soldaten met die XP naar het rooster).
- **Mission:** de instellingen van deze missie (start-salvage, fakkels, Landing Zone, sentry-limiet, en alles van de Swarm: biomassa, ritme, bewakers, aggro, golven, `maxAlive`, `growWaves`, `max`, wanneer Spitters en Brutes mogen komen). Leeg = de standaardwaarde van het spel. Bewaarde waarden gelden enkel voor die missie.
- **Difficulty:** `DIFFICULTY` (Easy, Normal, Hard voor de Lunar Corps-campagne) en `SWARM_DIFF` (voor de Swarm-campagne).
- **Effects:** `FIRE` (de brandende grond van de Pyro) en `ANIM` (de animaties).
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
  rogue.js                      ROGUE_MISSIONS, ROGUE_CREW, STRAINS, ROGUE, ROGUE_TROPHIES (de derde campagne)
  missions/rNN-<id>.js          de jobs van Rogue Strain: ROGUE_MISSIONS.push({ … rogue:true })
  skirmish.js                   startopstelling voor skirmish
js/engine/                      SECTION 2 — ENGINE, in genummerde blokken
  00-core.js … 27-training.js basis, sprites en art, geluid, kaarten, spelstatus, entiteiten,
                                (22-squad-life.js: tracker, zuur, dekking, fakkels, stemmen, gedenkteksten)
                                pathfinding, beweging, gevecht, gedrag, gebouwen, economie,
                                Swarm-AI, fog of war, mission API, update, berichten, tekenen,
                                HUD, bevelen, invoer, schermen, hoofdlus, muziek
                                (19b-formations.js: tactische formaties en marcheren als één geheel)
                                (25-hive-life.js: schimmel rond hives, eieren, Husks)
                                (25b-animations.js: brandende grond van de Pyro en de extra animaties)
                                (26-swarm-command.js: spelen als de Swarm, de Lunar Corps als computer)
                                (27-training.js: één wezen besturen van ei tot hive)
                                (31-rogue.js: Rogue Strain, de Osprey-bemanning, DNA, taint, de loyale Corps)
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
  noBuild:['sentry'],                                               // optioneel: deze types kan de Engineer hier niet bouwen
  tough:{ sentry:{ hp:2, armor:0.3 }, husk:{ hp:1.6, armor:0.3 } }, // optioneel: per type meer HP (×) en ander pantser
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
   - `faction`: `'corps'`, `'swarm'` of `'wild'`
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
| `g.spawn(type, punt, aantal, {faction, order, prey, truce})` | Eenheden plaatsen. Geeft een lijst terug. Swarm-`order`: `'hunt'` (standaard), `'guard'` of `'boss'`. `truce`: met welke factie de eenheid niet vecht. |
| `g.wall(punt, straal, tag, soort)`, `g.openWall(tag)` | Een tunnel afsluiten (straal 0 = één tegel). `soort` is `'membrane'` (standaard, levend membraan), `'door'` (blast door van het station) of `'rubble'` (puin). Beide zijn onkwetsbaar. `openWall` laat het membraan wegrotten of schuift de deuren open. |
| `g.weakenWall(tag, hp)`, `g.walls(tag)` | Het membraan kwetsbaar maken, zodat je troepen het kunnen wegbranden (optioneel met nieuwe hp per tegel); aantal tegels dat nog staat |
| `g.airdrop([[type, aantal], …], seconden, punt)` | Het dropship vliegt versterking naar de Landing Zone van de missie (zie `landingZone`). Met `punt` doen de nieuwe troepen na de landing een attack-move naar dat punt, bv. om bij de squad te komen. |
| `g.troops()` | Aantal levende Corps-soldaten op de kaart, waar ze ook staan |
| `g.hiveAt(punt)` | Of er bij dat punt nog een hive staat |
| `g.online()`, `g.generatorAt(punt)` | Aantal generatoren dat nu draait; de generator op dat punt (bv. om `label` te zetten) |
| `g.chargeSite(punt, tag)`, `g.charge(tag)`, `g.chargeFuse(tag)` | Seismische ladingplek maken; toestand `'site'`, `'arming'`, `'armed'` of `'blown'`; seconden tot de ontploffing |
| `g.pad(punt, tag)`, `g.landShip(tag, seconden, blijft)` | Extra landingsplatform zonder bestellingen; een dropship laat daar landen en laten wachten (pickup). Met `blijft=false` is het een drop: het schip landt, lost en stijgt weer op (de missie zet zelf de soldaten neer, bv. de relief squads in Needle and Thread) |
| `g.supplyDrop(type, tag, seconden)`, `g.supplies(type)` | Het dropship vliegt een ingeklapt gebouw (bv. `'sentry'`) naar het platform met die tag (zonder tag: de Landing Zone); een Engineer raapt het op. `supplies` telt hoeveel je er overal hebt (in het veld, gedragen, op een platform, onderweg) |
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

De meeste waarden staan in `js/content/units.js`. Uitzonderingen: `FORMATION` staat in `js/engine/19b-formations.js`, `HP_ZONES` in `js/engine/09-unit-behaviour.js`, `DIFFICULTY` in `js/content/difficulty.js`, en de missiewaarden in het bestand van die missie.

| Waar | Waarde | Betekenis |
|---|---|---|
| `FORMATION` | `maxRadius` (4.5) | Hoe ver (in tegels) een groep uit elkaar mag staan voor ze samenschuift |
| | `spacing` (24) | Afstand in pixels tussen eenheden in een blokformatie |
| | `minGap` (14) | Staan eenheden dichter bij elkaar dan dit, dan worden ze in een blok gezet |
| | `march` (0.9) | Een squad in formatie marcheert op dit deel van het tempo van de traagste, zodat iedereen nog wat over heeft om zijn plek te houden |
| | `catchUp` (2), `wait` (1.5), `slowest` (0.4) | Bijbenen (extra px/s per pixel naast zijn plek); vanaf hoeveel tegels achterstand het gidspunt vertraagt; hoe traag het gidspunt minstens blijft gaan |
| | `turn` (1.8), `file` (0.9) | Hoe snel een formatie met een voorkant draait (radialen/s); afstand tussen soldaten in een rij door een smalle doorgang (× spacing) |
| | `standoff` (0.5), `engageAt` (2) | Aanvallen in formatie: de squad marcheert tot het doel binnen het gewone bereik van haar strijders ligt (+ `standoff` tegels); staat ze minder dan `engageAt` tegels verder, dan valt ze meteen aan |
| `BUILDINGS.uplink` | `captureTime` (20), `loseTime` (15) | Seconden om een baken in te nemen of te verliezen |
| `HP_ZONES` | `red` (0.25), `orange` (0.5) | Grenzen voor de kleuren van de levensbalk en de triage van de Medic |
| `MAX_SUPPLY` | 50 | Maximale supply |
| missie `limits` | bv. `{ sentry:3 }` | Maximum aantal van een gebouwtype tegelijk in het veld |
| missie `noBuild` | bv. `['sentry']` | Gebouwtypes die de Engineer in die missie niet kan bouwen |
| missie `tough` | bv. `{ husk:{ hp:1.6, armor:0.3 } }` | Per type: levenspunten × `hp`, pantser vervangen door `armor` |
| `HUSK_WARRIOR` | `mendAt` 0.65, `mendDone` 0.95 | Een gewonde Husk valt na een kill terug om te genezen, en jaagt weer vanaf `mendDone` |
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
| `UNITS.medic` | `heal` (9), `healRange` (3.5) | Genezing per seconde en bereik |
| `UNITS.engineer` | `speed` (68 = 2,1 tegels/s, zoals de Medic), `range` (5), `damage` (4) | De Engineer schiet even ver als een Trooper (Spitter: 4,6) en schiet terug terwijl hij bouwt, herstelt of inpakt |
| missie `swarm` | `rate`, `guardMax`, `guardEvery`, `waves` | Groei, bewakers en golven per missie |

---

## Testen en tips

- **Vergrendelde missie spelen:** houd **Shift** ingedrukt en klik op de missie in de campagnelijst.
- **Spelsnelheid** 1,5× of 2× via de knop bovenaan, handig om te testen.
- **Opgeslagen in de browser** (`localStorage`):
  - `hc-roster`: het veteranenrooster en de Cenotaph; `hc-zombie`: zombie mode aan of uit
  - `hc-rogue`: de Osprey-bemanning (rang, strains, taint), het DNA in het splice lab, de stabilizers en het gekozen einde
  - `hc-progress`: per gewonnen missie de hoogste moeilijkheidsgraad, de beste tijd, de datum en de hoogste moeilijkheid waarop ze foutloos (zonder verlies) gewonnen werd
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

- De muren in de ruïnes van Hollow Colony zijn in het donker soms moeilijk te onderscheiden.
- Het spel is gemaakt voor muis en toetsenbord. Aanraken werkt basaal: tik om te selecteren of een bevel te geven, sleep om te scrollen.
- De Swarm-campagne telt nu 8 missies (en twee trainingen). De balans van missies 4 tot 8 is nog niet uitgetest.
- *Rogue Strain* telt 8 jobs (sinds nov 2026 ook *Needle and Thread* en *Among Them*); de balans is nog niet met de hand getest.
- Ideeën die nog niet gebouwd zijn: relics in de Swarm-campagne. The Grey zijn in november 2026 uit het spel gehaald.

## Copyright

© 2026 VonKirckhoff. All rights reserved. Hollow Colony (game, map editor, art, music and texts) may not be copied, reused or distributed without written permission. See [LICENSE](LICENSE).
