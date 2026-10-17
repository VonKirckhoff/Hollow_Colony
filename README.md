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

**Spelvormen:** een campagne van 7 missies en skirmish (kies een kaart en vernietig alle hives). Er zijn drie moeilijkheidsgraden: Easy, Normal en Hard.

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
| **U** / **D** | Engineer: Sentry Gun inpakken / opstellen |
| **P** / **Esc** | Pauzemenu (Esc annuleert ook plaatsen, inpakken en attack-move) |
| Knoppen bovenaan | **Follow** (camera), **Sound** (geluid), **1×/1.5×/2×** (spelsnelheid), **Menu** |

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

- Bij een promotie meldt de radio het, verschijnt "PROMOTED" en krijgt de soldaat een kwart van zijn levenspunten terug. Het rangteken staat boven de soldaat en in het selectiepaneel; daar zie je ook naam, XP, kills en aantal missies.
- **Rooster:** win je een campagnemissie, dan gaan alle overlevenden met XP naar het rooster (max. 30, de meest ervarenen eerst). In de volgende campagnemissie vervangen ze startsoldaten van hetzelfde type. Wie niet meteen een plaats heeft, staat in **reserve** en komt als eerste zodra je dat type traint of via de dropship bestelt.
- **Gesneuveld is gesneuveld:** een veteraan die sterft in een missie die je wint, verdwijnt van het rooster en komt op de gedenklijst. Verlies je de missie, dan verandert het rooster niet (je kan opnieuw proberen).
- De knop **Veterans** in de campagnelijst toont het rooster, de rangen en de gedenklijst. De briefing toont wie meegaat. Het eindscherm toont promoties (per soldaat alleen de hoogste rang die hij haalde, en alleen van wie de missie overleefde), nieuwkomers en gesneuvelden (met de rang die ze op het moment van hun dood hadden).
- **Unieke namen:** geen twee soldaten hebben dezelfde naam: niet in het rooster, niet op de gedenklijst en niet in de lopende missie. Pas als alle namen uit `SURNAMES` op zijn, krijgt een nieuwe soldaat een voorletter ("J. Torres"). Een bewaard rooster met dubbele namen wordt bij het laden rechtgezet.
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

### Uplink-bakens (missie 7)
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
- **Ondersteuning in het midden:** Medics, Engineers en escortes (zoals Dr. Maas) staan beschermd in het centrum. Bij de wig staan ze net achter de punt.
- **Wig:** Pyros komen vooraan, dan Gunners, en Troopers vullen de vleugels. De punt wijst altijd in de looprichting.
- **Cirkel en vierkant:** elke strijder neemt de dichtstbijzijnde plek op de rand.
- De squad **houdt de formatie** bij elke verplaatsing en attack-move, en draait mee met de looprichting.
- **Onderweg in formatie (mars):** bij een verplaatsing van meer dan 5 tegels loopt de squad als één blok. Een onzichtbaar middelpunt volgt een route door het **midden** van gangen, en elke soldaat houdt zijn plaats rond dat punt. Blijft iemand achter, dan wacht de groep. Is een gang te smal, dan schuiven alleen de soldaten die tegen de rotswand zouden lopen naar binnen; daarna gaan ze terug naar hun plek. Aan het doel zet de squad zich in de gewone formatie. Krijgt een soldaat onderweg een ander bevel (of **S**top), dan verlaat hij de mars.
- Druk dezelfde toets nog eens om de formatie los te laten. Selecteer je een groep met eenheden die niet in de formatie zaten, dan gebruikt die groep de gewone formatie.
- De vormen staan in `FORMATIONS` en `formationSlots()` in de code. De afstand tussen eenheden volgt `FORMATION.spacing`.

### Medic: triage
De levensbalken hebben drie zones: **rood** (≤ 25%), **oranje** (25–50%) en **groen** (> 50%).
1. De Medic behandelt eerst de dichtstbijzijnde gewonde in het rood.
2. Komt zijn patiënt in het oranje terwijl iemand anders nog in het rood ligt, dan schakelt hij over.
3. Daarna doet hij hetzelfde met de oranje gewonden, en pas dan maakt hij iedereen volledig beter.

De Medic is ongewapend. Bij een aanvalsbevel volgt hij de groep op korte afstand in plaats van mee naar het doelwit te lopen.

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

### Landing Zone en troepenlimiet (missie 1, 6 en 7)
- Bij de basis ligt een **Landing Zone**: een markering op de grond met een grote H. Eenheden lopen er gewoon over, de vijand negeert ze en kan ze niet beschadigen, en je kan er niets op bouwen. Klik erop om ze te selecteren. Selecteer ze om versterkingen te bestellen: Trooper, Gunner, Medic, Pyro of Engineer, met dezelfde prijs en sneltoetsen als bij de Command Post.
- Een **dropship** brengt ze na 25 seconden. Bestellingen tijdens de vlucht gaan mee, tot 6 per vlucht. Je ziet het toestel landen, de nieuwe soldaten staan op het platform, en in het selectiepaneel staan de lading en de resterende tijd.
- Rechtsklik op de grond met de Landing Zone geselecteerd om een verzamelpunt te zetten.
- **Troepenlimiet:** je kan nooit meer dan **15 man** tegelijk hebben. Eenheden op het veld en alles wat onderweg is tellen mee. Je kan dus enkel verliezen aanvullen. De bovenbalk toont `Troops 12/15`.
- In **Dust Landing** ligt de Landing Zone op het platform van Kappa Station. Daar bestel je niets: het verhaal stuurt het dropship (`landingZone:{ …, scripted:true }` en `g.airdrop()`).
- In **Brood Mother** traint de Command Post niet; alles komt via de Landing Zone (max. 15 man).
- In **High Ground** ligt de Landing Zone naast de Command Post en kan je op beide plaatsen versterkingen krijgen, samen max. **24 man**.
- In missies met een Landing Zone vervangt de troepenlimiet de supply: Supply is daar verborgen.
- Instellen per missie: `landingZone:{ tx, ty, max, delay }` (positie linksboven, limiet, vliegtijd) en `noTraining:true`. De lading per vlucht staat in `BUILDINGS.lz.cargo`.

### De Brood Mother (missie 6)
- Ze is reusachtig, staat meestal stil en spuwt zuur. Elke paar seconden **chargeert** ze in je linies ("CHARGE!"): trek je mensen dan terug.
- Ze legt eieren die uitkomen als Crawlers of Drones. Brand ze met Pyros voor ze uitkomen.
- Bij 75%, 50% en 25% roept ze haar broed op en wordt ze telkens sneller.
- Wie ze doodt, eet ze op: die eenheid wordt géén cocon.
- Zodra je haar 8 seconden niet raakt, **geneest** ze.
- Bovenaan het scherm staat een levensbalk met de huidige fase.
- Je soldaten pakken eerst de kleinere vijanden rond haar aan en schieten daarna op haar.
- Instelbaar bij `UNITS.broodmother`: `hp`, `damage`, `regen`, `eggEvery`, `eggs`, `spitEvery`, `spit`, `spitDamage`, `chargeEvery`, `chargeTime`, `chargeSpeed`, `rootSpeed`.

### The Grey Hunter (missie 4 en 6)
- Hij is gecamoufleerd: in je zichtveld zie je alleen een flikkering. Je kan hem pas aanvallen wanneer hij net gevuurd heeft, geraakt werd of dichtbij komt.
- Hij jaagt op je sterkste eenheid met plasmaschoten en valt ook de Swarm aan.
- Onder 45% levenspunten trekt hij zich terug en verdwijnt (`retreatAt`).
- In missie 6 duikt er een op met een **wapenstilstand**: hij negeert jou en jaagt op de Brood Mother. Dat doet hij voor de trofee, niet om jou te helpen.

### Konvooi (missie 5)
- **Mobile Habitats** zijn reusachtige, trage rupsvoertuigen (ongeveer drie keer zo groot als een soldaat) met zware bepantsering (ze krijgen maar de helft van de schade). Je bestuurt ze niet zelf: ze kruipen in colonne de oranje gestippelde route (ook op de minimap).
- Komt de Swarm binnen 3,5 tegels van één voertuig, dan stopt het **hele konvooi** ("HALTED" boven de voertuigen), zodat het niet uit elkaar valt. Ruim de weg op en ze rijden verder.
- Voertuigen houden onderling afstand ("WAIT"). Op het platform rijdt het eerste naar het midden en parkeren de volgende erachter.
- **Engineers repareren de voertuigen**, automatisch of met rechtsklik. Medics kunnen ze niet genezen.
- Aanvalsgolven in deze missie komen van de hives het dichtst bij het voorste voertuig.
- Instelbaar in `CONVOY` in de code: `haltRange`, `gap`, `arriveRange`, `padSpacing`.

### Camera volgen
Na een verplaats- of aanvalsbevel schuift de camera mee met je geselecteerde squad. Scroll je zelf, dan stopt het volgen tot je volgende bevel. Aan/uit met **C** of de knop **Follow**; je keuze wordt onthouden.

### Geluid
Alle geluiden worden in de browser opgewekt met de Web Audio API; er zijn geen audiobestanden nodig. Het gaat om wapens, de Medic die geneest, het radarpiepje bij vijandelijk contact, bevelen, alarmen, golven, bouwen en herstellen, cocons, kratten, berichten en een melodietje bij winst of verlies. Geluiden ver buiten beeld klinken zachter. Het geluid start na je eerste klik (een browserregel). Met de knop **Sound** zet je alles uit.

### Doelmarkeringen
Een oranje ruit met label toont waar je naartoe moet. Ze knippert op de minimap, en als het doel buiten beeld ligt, wijst een pijl aan de schermrand de richting aan.

---

## Campagne

| # | Missie | Kaart | Doel |
|---|---|---|---|
| 1 | **Dust Landing** | Kappa Canyons | Volg de brede kloven (minstens 7 tegels, zodat een squad in formatie blijft) vanaf de landingsplaats (twee routes) naar Kappa Station en overleef de hinderlaag uit de oostelijke tunnel. Het dropship landt versterking op het platform van het station. Daarna gaan de blast doors naar de noordelijke grotten open: vernietig de hive in de westelijke grot en daarna die in de oostelijke. De tweede versterking landt op het platform en loopt zelf door de tunnel naar je squad. Breng daarna **iedereen** terug naar het landingsplatform: het dropship vertrekt pas als de hele squad er staat (de doelenlijst telt mee). Tot de deuren opengaan, zijn de hives onbereikbaar en ver buiten schootsafstand. Je speelt zonder basis. |
| 2 | **Hold Kappa** | Kappa Basin | Bouw 2 Relay Towers en houd 15 minuten stand tot het konvooi komt. De Command Post moet overleven. |
| 3 | **Burn the Brood** | Tycho Maw | Vernietig vijf extra stevige hives en houd daarna 2 minuten stand tegen de laatste stormloop. |
| 4 | **The Hollow Colony** | Hollow Colony | Vind Dr. Elin Maas in het lab en breng haar naar de extraction pad. Houd 4 minuten stand tot het dropship landt, terwijl een Grey Hunter je squad bejaagt. |
| 5 | **Last Convoy** | Ridgeback Canyon | Begeleid drie trage Mobile Habitats met mijnwerkers van Ridgeback Mine naar het lanceerplatform in het oosten. Je hebt anderhalve minuut voorbereiding en maximaal 3 Sentry Guns tegelijk. Minstens 2 habitats moeten aankomen. |
| 6 | **Brood Mother** | Maw Depths | Lange missie in de grotten onder Tycho Maw. Bouw een basis bij de grotingang, brand drie zwaar bewaakte eierkamers plat (ze groeien terug als je ze met rust laat) en dood daarna de Brood Mother in haar lair. Het levende membraan voor de lair verdwijnt pas als alle kamers weg zijn. Maximaal 15 man; verliezen vul je aan via de Landing Zone. |
| 7 | **High Ground** | Selene Highlands | Verover drie uplink-bakens op plateaus die je enkel via hellingen bereikt, en houd daarna alle drie tegelijk vast tot de upload van 6 minuten klaar is. Verlies je er één, dan stopt de upload. Tijdens de upload komt er ongeveer elke 35 seconden een golf op een baken (om de derde op twee bakens), maar nooit zolang er al veel Swarm op het veld is. Je start met twee Sentry Guns bij de basis. Versterkingen via de Command Post of de Landing Zone ernaast, max. 24 man. |

**Voortgang:**
- De campagnelijst toont bij elke gewonnen missie de **moeilijkheidsgraad** (Easy, Normal of Hard) en je beste tijd. Win je later op een hogere moeilijkheidsgraad, dan wordt die bewaard. Ook de briefing en het eindscherm tonen het.
- **Reset campaign** onderaan de campagnelijst wist alle voortgang. Je moet twee keer klikken binnen 4 seconden, zodat het niet per ongeluk gebeurt.

De missies zijn nu bewust langer gemaakt. Sentry-limieten per missie: Hold Kappa 4, Burn the Brood 5, The Hollow Colony 1, Last Convoy 3, Brood Mother 6, High Ground 8 (waarvan 2 al bij de start). Een missie wordt vrijgegeven als je de vorige wint. De voortgang wordt in de browser bewaard.

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
  veterans.js                   RANKS, VET_XP, ROSTER_MAX, SURNAMES
  difficulty.js                 DIFFICULTY
  maps/_maps.js                 legende van de kaarttekens + const MAPS = {}
  maps/<key>.js                 één kaart per bestand: MAPS.<key> = { name, desc, layout }
  missions/_missions.js         uitleg van de missievelden + const MISSIONS = []
  missions/NN-<id>.js           één missie per bestand: MISSIONS.push({ … })
  skirmish.js                   startopstelling voor skirmish
js/engine/                      SECTION 2 — ENGINE, in genummerde blokken
  00-core.js … 22-main-loop.js  basis, sprites en art, geluid, kaarten, spelstatus, entiteiten,
                                pathfinding, beweging, gevecht, gedrag, gebouwen, economie,
                                Swarm-AI, fog of war, mission API, update, berichten, tekenen,
                                HUD, bevelen, invoer, schermen, hoofdlus
map-editor/                     de kaarteditor (leest de kaarten uit js/content/maps/)
```

**Hoe het laadt:** het zijn gewone `<script>`-bestanden (geen modules), daarom werkt het ook rechtstreeks vanaf je schijf (`file://`). Alle bestanden delen dezelfde globale namen (`MAPS`, `MISSIONS`, `UNITS`…). De volgorde in `index.html` telt:

1. eerst de content, dan de engine;
2. `_maps.js` vóór de kaarten en `_missions.js` vóór de missies;
3. de volgorde van de missieregels is de volgorde van de campagne (de nummers in de bestandsnamen zijn er enkel voor het overzicht);
4. de engineblokken in hun nummervolgorde. Code die meteen bij het laden iets uitvoert (niet in een functie) mag alleen dingen gebruiken uit eerdere bestanden; het opstarten zelf gebeurt helemaal op het einde, in `22-main-loop.js`.

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
   - Speciale vlaggen: `bio` (kan cocon worden, kan genezen worden), `heal`, `builder`, `escort`, `convoy` (rijdt zelf een route), `vehicle` (Engineers kunnen repareren), `armor` (0–1, deel van de schade dat geblokkeerd wordt), `boss`, `cloak`, `passive`, `scale`, `bonus:{type:factor}`
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
| `g.wall(punt, straal, tag, soort)`, `g.openWall(tag)` | Een tunnel afsluiten (straal 0 = één tegel). `soort` is `'membrane'` (standaard, levend membraan) of `'door'` (blast door van het station). Beide zijn onkwetsbaar. `openWall` laat het membraan wegrotten of schuift de deuren open. |
| `g.weakenWall(tag, hp)`, `g.walls(tag)` | Het membraan kwetsbaar maken, zodat je troepen het kunnen wegbranden (optioneel met nieuwe hp per tegel); aantal tegels dat nog staat |
| `g.airdrop([[type, aantal], …], seconden, punt)` | Het dropship vliegt versterking naar de Landing Zone van de missie (zie `landingZone`). Met `punt` doen de nieuwe troepen na de landing een attack-move naar dat punt, bv. om bij de squad te komen. |
| `g.troops()` | Aantal levende Corps-soldaten op de kaart, waar ze ook staan |
| `g.hiveAt(punt)` | Of er bij dat punt nog een hive staat |
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
| `g.wave(budget, doel)` | Meteen een Swarm-golf sturen. Optioneel `doel` (punt of eenheid): de golf komt dan van de twee dichtstbijzijnde hives en loopt naar dat doel. |
| `g.setTimer(seconden, label)`, `g.timerLeft()`, `g.clearTimer()` | Aftelklok in de bovenbalk |
| `g.convoy(lijst, route)`, `g.convoyGo()` | Eenheden als konvooi een route laten volgen (lijst van punten), en het vertrek starten |
| `g.convoyArrived()`, `g.convoyHalted()`, `g.convoyLead()` | Aantal aangekomen voertuigen; of het konvooi stilstaat; het voorste voertuig |
| `g.win(tekst)`, `g.lose(tekst)` | Missie winnen of verliezen |

Een `punt` is een kaartteken (`'P'`, `'1'`, `'a'`) of een tegelcoördinaat `{x, y}`.

---

## Instelbare waarden

De meeste waarden staan in `js/content/units.js`. Uitzonderingen: `FORMATION` en `MARCH` staan in `js/engine/19-commands.js`, `CONVOY` en `HP_ZONES` in `js/engine/09-unit-behaviour.js`, `DIFFICULTY` in `js/content/difficulty.js`, en de missiewaarden in het bestand van die missie.

| Waar | Waarde | Betekenis |
|---|---|---|
| `MARCH` (19-commands.js) | `minDist` (5), `wantClear` (4), `wallCost` (1.6), `turnRate` (2.4), `maxLag` (2.2) | Mars in formatie: vanaf welke afstand (tegels), hoe ver van de wand de route wil blijven en hoe sterk ze dat probeert, hoe snel de formatie draait (rad/s), en hoeveel achterstand (tegels) de groep laat wachten |
| `FORMATION` | `maxRadius` (4.5) | Hoe ver (in tegels) een groep uit elkaar mag staan voor ze samenschuift |
| | `spacing` (24) | Afstand in pixels tussen eenheden in een blokformatie |
| | `minGap` (14) | Staan eenheden dichter bij elkaar dan dit, dan worden ze in een blok gezet |
| `BUILDINGS.uplink` | `captureTime` (20), `loseTime` (15) | Seconden om een baken in te nemen of te verliezen |
| `HP_ZONES` | `red` (0.25), `orange` (0.5) | Grenzen voor de kleuren van de levensbalk en de triage van de Medic |
| `MAX_SUPPLY` | 50 | Maximale supply |
| missie `limits` | bv. `{ sentry:3 }` | Maximum aantal van een gebouwtype tegelijk in het veld |
| `CONVOY` | `haltRange` (3.5), `gap` (1.2), `arriveRange` (1.5), `padSpacing` (2.4) | Konvooi: stopafstand tot vijanden, vrije ruimte tussen voertuigen, wanneer een routepunt bereikt is, en parkeerafstand op het platform (in tegels) |
| `UNITS.habitat` | `hp` (900), `speed` (14), `armor` (0.5), `scale` (3) | Levenspunten, snelheid, bepantsering (deel van de schade dat geblokkeerd wordt) en grootte van de Mobile Habitats |
| `DIFFICULTY` | `hp`, `budget`, `interval` | Factoren voor Swarm-levenspunten, golfgrootte en tijd tussen golven |
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
| missie `swarm` | `rate`, `guardMax`, `guardEvery`, `waves` | Groei, bewakers en golven per missie |

---

## Testen en tips

- **Vergrendelde missie spelen:** houd **Shift** ingedrukt en klik op de missie in de campagnelijst.
- **Spelsnelheid** 1,5× of 2× via de knop bovenaan, handig om te testen.
- **Opgeslagen in de browser** (`localStorage`):
  - `hc-roster`: het veteranenrooster en de gedenklijst
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
