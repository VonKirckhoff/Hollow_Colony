# Hollow Colony — Kaarteditor

Een aparte app om kaarten voor *Hollow Colony* te tekenen of aan te passen. Hij gebruikt dezelfde terreintypes en markeringen als het spel en controleert terwijl je tekent of de kaart speelbaar is.

Open **`map-editor/index.html`** in je browser (dubbelklikken volstaat). De editor laadt de kaarten van het spel rechtstreeks uit `../js/content/maps/`, dus hij moet in de map `map-editor/` naast de rest van het spel blijven staan.

---

## Inhoud

1. [Snel aan de slag](#snel-aan-de-slag)
2. [Scherm](#scherm)
3. [Gereedschap en toetsen](#gereedschap-en-toetsen)
4. [Tegels en markeringen](#tegels-en-markeringen)
5. [Controles](#controles)
6. [Exporteren: twee manieren](#exporteren-twee-manieren)
7. [Een kaart in een missie gebruiken](#een-kaart-in-een-missie-gebruiken)
8. [Bestanden](#bestanden)
9. [Opgeslagen in de browser](#opgeslagen-in-de-browser)
10. [Tips](#tips)

---

## Snel aan de slag

1. **New** → kies breedte en hoogte (24–140 tegels) en een start: open regolith, willekeurige grotten of massieve rots.
2. Geef rechts een **key** (korte codenaam, enkel letters/cijfers, bv. `ridge`), een **name** en een **description**.
3. Teken het terrein, zet een startpunt **P** en minstens één **hive-plek** (a–n).
4. Kijk bij **Checks** tot er geen rode meldingen meer zijn.
5. **Export** → kies:
   - **Map code** om meteen te spelen in Skirmish, of
   - **Map file** om de kaart vast in het spel op te nemen (voor Git en voor missies).

## Scherm

| Deel | Wat |
|---|---|
| Bovenbalk | New, Open, Import, Export · Undo/Redo · zoom (−, Fit, +) · Grid · Unreachable |
| Links | Gereedschap, penseelgrootte, terreinpalet, markeringen |
| Midden | De kaart |
| Rechts | Key, naam, beschrijving, breedte/hoogte (**Resize**), **Rock border**, overzichtskaart en **Checks** |

**Open** toont de kaarten van het spel en je eigen kladversies. Een kaart van het spel openen verandert niets aan het spel zelf: pas als je het kaartbestand opnieuw bewaart, wijzigt ze.

## Gereedschap en toetsen

| Toets | Gereedschap |
|---|---|
| **B** | Penseel (1, 2, 3, 5 of 7 tegels breed) |
| **U** | Rechthoek |
| **F** | Opvullen (alle aangrenzende tegels van hetzelfde type) |
| **I** | Pipet: neem een tegel over |
| **C** | Kraterstempel: straal en hellingen (N/O/Z/W) instelbaar |
| **L** | Plateaustempel: straal en hellingen instelbaar |
| **1–8** | Terreintype kiezen |
| **Ctrl+Z** / **Ctrl+Y** | Ongedaan maken / opnieuw |

- **Links slepen** tekent.
- **Rechts slepen** of **Spatie + slepen** schuift de kaart; het **scrollwiel** zoomt.
- Klik op de **overzichtskaart** om ernaartoe te springen.
- Unieke markeringen (P, Q, 0–9, a–n) verhuizen als je ze opnieuw plaatst.

## Tegels en markeringen

Een kaart is een lijst tekstrijen; elk teken is één tegel van 32×32 pixels in het spel.

| Teken | Betekenis |
|---|---|
| `.` `,` `o` `~` `=` | Begaanbaar: regolith, stof, kleine krater, ijs, metalen vloer |
| `#` `^` `*` | Geblokkeerd: rots, hoge rots, kristal |
| `)` `_` | Kraterrand (geblokkeerd) en kraterbodem (begaanbaar) |
| `:` | Helling: de ingang van een krater of de weg op een plateau |
| `&` `%` | Plateau (begaanbaar) en klif (geblokkeerd) |
| `P` `Q` | Startpunten van de speler (P is verplicht) |
| `R` | Relay pad: linkerbovenhoek van een toren van 2×2 |
| `S` | Salvage-krat |
| `W` | Kudde Grazers (neutrale fauna) |
| `0`–`9` | Benoemde punten voor missiescripts |
| `a`–`n` (geen `o`) | Hive-plekken. In Skirmish wordt elke hive-plek een hive. In een missie staat er alleen een hive op de plekken die de missie noemt (`hives:['a','c']`). |

De volledige legende staat ook bovenaan `js/content/maps/_maps.js`.

## Controles

De editor controleert live en toont de resultaten rechts onder **Checks**. Klik op een melding om naar die plek te springen.

| Kleur | Betekent | Voorbeelden |
|---|---|---|
| Rood | De kaart werkt niet goed | Geen P · een markering is niet bereikbaar vanaf P · relay pad zonder 2×2 vrije grond |
| Geel | Werkt, maar kijk even | Relay pad die een doorgang zou afsluiten · te weinig ruimte (3×3) voor een hive of Command Post · dubbele markering · open randen · onbereikbare stukken · de key bestaat al in het spel |
| Groen | Speelbaar | Telt hive-plekken, relay pads en kratten |

**Unreachable** (bovenbalk) kleurt alle begaanbare tegels die je vanaf P niet kunt bereiken rood. **Rock border** zet rondom een rand van rots.

## Exporteren: twee manieren

### 1 · Map code (snel testen)
Een JSON-regel. Plak die in het spel onder **Skirmish → Load map code**. De kaart verschijnt met het label *CUSTOM* tussen de andere en blijft in de browser bewaard. Met *Remove* (twee keer klikken) haal je ze weg. Er verandert niets aan de bestanden van het spel.

### 2 · Map file (vast in het spel)
De volledige inhoud van een kaartbestand:

```js
'use strict';
/* Ridge Field — 64×44 tiles. Legend: see _maps.js */
MAPS.ridge = {
  name:'Ridge Field',
  desc:'One line for the skirmish list.',
  layout: [
    "################################################################",
    ...
  ]
};
```

1. Klik **Download file** (of **Copy file** en plak in een nieuw bestand) en bewaar het als `js/content/maps/<key>.js`.
2. Voeg de getoonde regel toe aan **`index.html`**, bij de andere kaarten:
   ```html
   <script src="js/content/maps/ridge.js"></script>
   ```
3. Voeg dezelfde regel met `../` ervoor toe aan **`map-editor/index.html`**, zodat de editor de kaart ook onder *Open* toont:
   ```html
   <script src="../js/content/maps/ridge.js"></script>
   ```
4. Commit het nieuwe bestand en de twee gewijzigde HTML-bestanden.

De kaart staat dan automatisch in de Skirmish-lijst. Een bestaande kaart aanpassen gaat hetzelfde: open ze, wijzig, exporteer en overschrijf haar bestand (de `<script>`-regels staan er dan al).

**Save as draft** (in het exportvenster) bewaart de kaart als kladversie in je browser.

## Een kaart in een missie gebruiken

In een missiebestand (`js/content/missions/NN-<id>.js`) verwijs je naar de kaart met haar key, en naar plekken met de markeringen:

```js
MISSIONS.push({
  id:'ridge-run', title:'Ridge Run', map:'ridge',
  start:{ salvage:200, camera:'P', units:[ ['trooper','P',4] ], buildings:[ ['hq','P'] ], hives:['a','b'] },
  ...
});
```

Zet in de editor dus genoeg benoemde punten (`0`–`9`) voor alles wat je missie nodig heeft: spawnpunten, doelen, een extractiepunt. Meer over missies staat in de [hoofd-README](../README.md#een-nieuwe-missie).

## Bestanden

```
map-editor/
  index.html    HTML van de editor + <script>-regels van de kaarten van het spel
  editor.css    opmaak
  editor.js     alle logica: tekenen, gereedschap, controles, import/export
  README.md     deze uitleg
```

De editor heeft geen eigen kopie van de kaarten: wat in `js/content/maps/` staat, is wat hij toont.

## Opgeslagen in de browser

| Sleutel (`localStorage`) | Wat |
|---|---|
| `hc-editor-current` | Je laatste werk; wordt bij het openen hersteld |
| `hc-editor-drafts` | Je kladversies |

Deze gegevens horen bij de browser, niet bij de bestanden, en gaan dus niet mee naar Git.

## Tips

- Begin met **New → caves** en bewerk de grotten; dat gaat sneller dan alles met de hand.
- Gebruik de **kraterstempel** met minstens twee hellingen, anders wordt de krater een val.
- Hou paden minstens **3 tegels breed**: groepen lopen dan vlotter en blijven in formatie.
- Een hive en een Command Post zijn 3×3 en staan gecentreerd op hun markering.
- Een relay pad die een smalle doorgang dichtzet, wordt in het spel geweigerd; de gele melding waarschuwt je vooraf.
- **Import** leest map code, een kaartbestand, of gewoon de tekstrijen van een layout.
