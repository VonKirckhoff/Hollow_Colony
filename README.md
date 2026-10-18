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

**Een hive verdedigt zich.** Elke treffer laat hem *krijsen* (hoogstens om de 12 seconden): hij baart meteen een noodbroed dat recht op de aanvaller afgaat. Zakt hij onder 60%, dan roept hij één keer de andere hives, en die sturen een golf naar hem toe. In *Hold Kappa* zijn de hives vier keer zo sterk en krijsen ze feller (`hiveRage`): daar is het de bedoeling dat je standhoudt, niet dat je ze aanvalt. Instellingen: `HIVE_DEFENCE` in `js/engine/12-swarm-director.js`.

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
| **Ctrl + 1–5**, **1–5** | Controlgroep opslaan / oproepen (twee keer drukken centreert de camera) |
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
- **Gesneuveld is gesneuveld:** een veteraan die sterft in een missie die je wint, verdwijnt van het rooster en komt op de **Cenotaph**. Verlies je de missie, dan verandert het rooster niet (je kan opnieuw proberen).
- De knop **Veterans** in de campagnelijst toont het rooster en de rangen; de knop **Cenotaph** toont de gesneuvelden. De briefing toont wie meegaat. Het eindscherm toont promoties (per soldaat alleen de hoogste rang die hij haalde, en alleen van wie de missie overleefde) en nieuwkomers, **gegroepeerd per rang** (hoogste eerst, namen alfabetisch, je eigen soldaat met ★), en **alle** gesneuvelden van die missie (ook soldaten zonder rang) elk op een eigen regel, gesorteerd op rang, met type, missies en kills. Op de Cenotaph komen alleen de veteranen (wie op het rooster stond of een rang had).
- **Namen:** alleen Nederlandstalige familienamen (`SURNAMES` in js/content/veterans.js). De eerste soldaten van een nieuwe campagne heten altijd, in deze volgorde, **Van Kerckhove, Heem, Van Damme, Vikernes en Verstappen** (`STARTER_NAMES`), zolang die namen vrij zijn. Een bewaard rooster met namen die niet in de lijst staan, krijgt bij het laden nieuwe namen.
- **Je eigen soldaat:** bovenaan het campagnescherm staat *Enlist your own soldier*. Geef een naam (2 tot 18 tekens, uniek) en kies een type (Trooper, Gunner, Pyro, Medic of Engineer). Hij gaat mee op elke campagnemissie (hij vervangt een starter van zijn type, of komt er extra bij), draagt een **gouden ster** boven zijn hoofd en verdient rang zoals elke veteraan. Na zijn eerste missie ligt zijn type vast; de naam kan je altijd wijzigen met *Edit*. Sneuvelt hij, dan komt hij op de Cenotaph en kan je een nieuwe soldaat inlijven. Alleen hij kan Captain worden.
- **Intel** (knop in het hoofdmenu en op het campagnescherm): een overzicht met tabbladen **Lunar Corps**, **Structures**, **Swarm** en **Other**. Per eenheid of gebouw een kaart met figuurtje, beschrijving, een korte veldnotitie, en de cijfers: HP, schade per seconde, bereik, snelheid (tegels per seconde), zicht, kostprijs of XP per kill, pantser, wanneer de vijand verschijnt, en de Lieutenant-vaardigheid. De cijfers komen rechtstreeks uit `UNITS` en `BUILDINGS`, dus pas je die aan, dan klopt Intel vanzelf. Welke eenheden op welk tabblad staan en de veldnotities staan in `js/content/intel.js`. Pijltjestoetsen links/rechts wisselen van tabblad.
- **Cenotaph** (knop op het campagnescherm en het Veterans-scherm): een grafsteen met de naam van elke gesneuvelde, met rang, type, de missie waarin hij viel, missies, kills en datum. Je eigen soldaat staat er met zijn ster.
- **Zombie mode** (Halloween, aan/uit op de Cenotaph, onthouden in je browser): met *Raise* haal je een gesneuvelde terug naar het rooster, met zijn rang, XP en kills. Een **risen** soldaat is groen, gloeit, en praat traag en hol. Hij heeft 25% meer levenspunten en geneest zichzelf (2 HP per seconde, maar pas na 4 seconden zonder treffer), maar loopt 15% trager, een Medic kan hem niet genezen, en de Swarm kan hem niet in een cocon stoppen. Sneuvelt hij een tweede keer, dan blijft hij voorgoed rusten (*Fell twice · at rest*). Was het je eigen soldaat en heb je nog geen nieuwe, dan wordt hij weer je eigen soldaat. Instellingen in `RISEN`.
- **Reset veterans** (knop op het Veterans-scherm, twee keer klikken) wist het rooster en de Cenotaph, maar niet je campagnevoortgang. **Reset campaign** wist allebei.
- **Unieke namen:** geen twee soldaten hebben dezelfde naam: niet in het rooster, niet op de Cenotaph en niet in de lopende missie. Pas als alle namen uit `SURNAMES` op zijn, krijgt een nieuwe soldaat een voorletter ("J. Torres"). Een bewaard rooster met dubbele namen wordt bij het laden rechtgezet.
- **Reset campaign** wist ook het rooster. In skirmish wordt niets bewaard.
- Instelbaar bovenaan in de code: `RANKS`, `VET_XP`, `ROSTER_MAX` en de namenlijst `SURNAMES`.

### Selectiepaneel en knoppen
- Geselecteerde troepen staan **gegroepeerd per type**, altijd in dezelfde volgorde (Trooper, Gunner, Pyro, Medic, Engineer …), met het aantal bij elke groep en de meest ervaren eerst. Klik op de groepsnaam om alleen dat type te selecteren.
- De knoppen staan in **rijen met een label**: Orders (A, S, H), Formation (Z, X, V), Build (R, T, B), Sentry (U, D), en bij gebouwen Train of Dropship.

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
Selecteer minstens twee eenheden en druk **Z** (cirkel), **X** (wig/speer) of **V** (vierkant). Dezelfde knoppen staan ook op de commandokaart.
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
- **Cocons:** elke levende eenheid die door de Swarm sterft, wordt een cocon die na 5 seconden uitkomt. Een gesneuvelde Gunner of Pyro wordt een Drone, de rest een Crawler. Pyros doen drievoudige schade aan cocons.

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
  - Een gemengde groep kan: bv. de squad defensief en je eigen Engineer aanvallend. Selecteer je daarna alles en druk je H of A + klik, dan krijgt iedereen die houding (een Medic volgt bij aanval de groep). Er staat altijd maar één knop tegelijk aan: kies je A en daarna H, S of L, dan vervalt de vorige keuze. Esc of rechtsklik annuleert een keuze die nog op een klik wacht.
- **Aanwijzen:** ga je met de muis over een soldaat in het selectiepaneel onderaan, dan licht hij op de kaart geel op (gele ring, pijl erboven, helderder figuurtje) en knippert zijn stip op de minikaart. Over de naam van een groep (bv. *Trooper 4*) licht de hele groep op.
- **Vuren onderweg:** een soldaat met een **verplaatsbevel** blijft lopen, maar schiet onderweg op vijanden binnen zijn bereik, wel 1,35× trager dan stilstaand (`SQUAD.moveFire.rate`). Wil je dat ze stoppen en vechten, gebruik dan een aanvalsbeweging (A + klik).
- **Persoonlijke veteranen:** sneuvelt een soldaat met een rang of met missies achter de rug, dan meldt de radio het: *"Sgt. Van Damme has fallen. 4 missions, 37 kills."* Op het eindscherm en op de Cenotaph staan bij elke gesneuvelde zijn type, de missie waarin hij viel, zijn aantal missies en kills, en de datum. Ook wie pas in die missie een rang haalde, komt op de Cenotaph.
- Alle getallen staan samen in `SQUAD` bovenaan js/engine/22-squad-life.js.

### Camera volgen
Na een verplaats- of aanvalsbevel schuift de camera mee met je geselecteerde squad. Scroll je zelf, dan stopt het volgen tot je volgende bevel. Aan/uit met **C** of de knop **Follow**; je keuze wordt onthouden.

### Geluid
**Muziek.** Op de menuschermen speelt zacht een soundtrack die, net als de geluiden, live in de browser wordt opgewekt (Web Audio, geen audiobestanden). Tijdens een missie zwijgt ze. Rechtsonder op de menuschermen: **♫ Tracks** (de muziekspeler), *Music on/off* en een volumeschuif (standaard 30%). Browsers laten pas geluid toe na een klik of toets; daarom opent het spel op een **startscherm** (*Click or press any key*), en met die eerste klik begint de muziek meteen. Staat de muziek uit, of laat de browser geluid al toe, dan valt het startscherm weg. Naast de knoppen staat een **now playing**-balkje: titel, deel, tijd en een voortgangsbalkje; het licht op als er een ander stuk begint (handig bij shuffle) en opent de muziekspeler als je erop klikt.

**De muziekspeler** (*♫ Tracks*) klapt een venster open met alle stukken. Met ▶ beluister je er een (het blijft spelen tot je ■ drukt, ook als je van scherm wisselt); met *☆ Menu* kies je wat er op de menuschermen speelt; **⤨ Shuffle** (in de balk rechtsonder, en onderaan het venster) laat alle stukken afwisselen, met een overgang na elk stuk; standaard staat shuffle uit. Kies je met *☆ Menu* een vast stuk, dan gaat shuffle uit. Je keuzes worden onthouden (`hc-music-track`, `hc-music-shuffle`). Esc of ✕ sluit het venster.

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
| 3 | **Burn the Brood** | Tycho Maw | Vernietig vijf extra stevige hives en houd daarna 2 minuten stand tegen de laatste stormloop. |
| 4 | **The Hollow Colony** | Hollow Colony | Vind Dr. Elin Maas in het lab en breng haar naar de extraction pad. Houd 4 minuten stand tot het dropship landt, terwijl een Grey Hunter je squad bejaagt. |
| 5 | **Blackout** | Mare Colony | Mijnstadje zonder stroom, **in het donker**. Je ziet maar half zo ver. Herstel met je Engineers de vier generatoren in de hoeken; een draaiende generator verlicht zijn straten maar trekt de Swarm aan, en valt uit onder 60%. Je wint als ze **alle vier tegelijk** draaien. De Command Post in het plein moet overleven. |
| 6 | **Dead Signal** | Ridgeback Canyon | Kleine squad zonder basis. Maak naast drie nesten een **seismische lading** scherp (een Engineer staat 20 s op de plek) en houd elke lading 75 s heel tot ze ontploft; elke ontploffing begraaft het nest. Na elke lading brengt het dropship twee schutters naar je toe. Daarna: iedereen naar het lanceerplatform in het oosten, waar de pickup 90 s later landt. |
| 7 | **Brood Mother** | Maw Depths | Lange missie in de grotten onder Tycho Maw. Bouw een basis bij de grotingang, brand drie zwaar bewaakte eierkamers plat (ze groeien terug als je ze met rust laat) en dood daarna de Brood Mother in haar lair. Het levende membraan voor de lair verdwijnt pas als alle kamers weg zijn. Maximaal 15 man; verliezen vul je aan via de Landing Zone. |
| 8 | **High Ground** | Selene Highlands | Verover drie uplink-bakens op plateaus die je enkel via hellingen bereikt, en houd daarna alle drie tegelijk vast tot de upload van 6 minuten klaar is. Verlies je er één, dan stopt de upload. Tijdens de upload komt er ongeveer elke 35 seconden een golf op een baken (om de derde op twee bakens), maar nooit zolang er al veel Swarm op het veld is. Je start met twee Sentry Guns bij de basis. Versterkingen via de Command Post of de Landing Zone ernaast, max. 24 man. |

**Voortgang:**
- De campagnelijst toont bij elke gewonnen missie de **moeilijkheidsgraad** (Easy, Normal of Hard) en je beste tijd. Win je later op een hogere moeilijkheidsgraad, dan wordt die bewaard. Ook de briefing en het eindscherm tonen het.
- **Reset campaign** onderaan de campagnelijst wist alle voortgang. Je moet twee keer klikken binnen 4 seconden, zodat het niet per ongeluk gebeurt.

De missies zijn nu bewust langer gemaakt. Sentry-limieten per missie: Hold Kappa 4, Burn the Brood 5, The Hollow Colony 1, Brood Mother 6, High Ground 8 (waarvan 2 al bij de start). Een missie wordt vrijgegeven als je de vorige wint. De voortgang wordt in de browser bewaard.

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
  00-core.js … 24-music.js     basis, sprites en art, geluid, kaarten, spelstatus, entiteiten,
                                (22-squad-life.js: tracker, zuur, dekking, fakkels, stemmen, gedenkteksten)
                                pathfinding, beweging, gevecht, gedrag, gebouwen, economie,
                                Swarm-AI, fog of war, mission API, update, berichten, tekenen,
                                HUD, bevelen, invoer, schermen, hoofdlus, muziek
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
