# Hollow Colony: notes for Claude

Read this first in every new session. The README holds the full design (in Dutch); this file holds how we work.

## The person
- Von (Patrick Van Kerckhove), Flemish. **Always answer in Dutch** (Flemish style). **All game text in English** (UI, dialogue, tooltips, code comments).
- He tests in the browser and gives feedback in numbered lists. Keep answers short and structured: what changed, how it was tested, what is open.
- Names in Dutch replies: use the Dutch word when one exists (formatie, schimmel, schachten …), game names as they are (Husk, Matriarch, Landing Zone).

## Workflow
1. Start of every round: `git fetch -q`, check `git status -sb` / `git log`, then `git reset -q --hard origin/main`. Von pushes himself (also from other sessions), so origin/main is always the truth.
2. Make the change, test it (see Tests), update the README (Dutch) where the behaviour is described.
3. Commit locally. Commit messages in English, ending with the attribution lines the session gives.
4. **Do not push** unless Von asks for it in that session. Deliver a zip of the changed files instead:
   `cd /home/claude/hollow_colony && zip -q /home/claude/hollow-colony-wijzigingen.zip $(git diff --name-only origin/main)` and send it.
   Stop-hook nags about unpushed commits: answer briefly in Dutch that Von pushes himself.
5. Update the playable artifact **https://claude.ai/code/artifact/YTTHeofMGNWub5XuL7Wsqo** (publish, never a new URL):
   - build `game.html` from index.html: the `<title>`/`<link>` lines of `<head>` plus the whole `<body>` (script tags included);
   - publish with `root=/home/claude/hollow_colony` and `files` = every changed js/css file (same path as published);
   - a publish is refused for files changed since the last read: compare the sha256 with `git show origin/main:<file>`, read those files (action read, `paths`, an `out_dir` in the scratchpad), then publish again.

## Code map
- Plain `<script>` files, no build step, everything global. Load order is the order in index.html.
- `js/content/`: data. `units.js` (UNITS, BUILDINGS), `difficulty.js`, `veterans.js`, `intel.js`, `relics.js`, `sprites.js`, `maps/*.js` (ASCII maps, legend in `_maps.js`), `missions/*.js` (campaign 01–08, Swarm s01/s01b/s02, trainings t-*). `_missions.js` holds the mission API docs and the tutorial engine.
- `js/engine/`: 00 core … 30. Notable: 05 entities, 08 combat, 09 unit behaviour, 12 swarm director (WAVES, shafts), 14 mission API, 17 rendering, 18 HUD, 19 commands, 19b formations (shapes, who stands where via assignCheapest, the march: a guide walks the path and every member walks to his place around it), 20 input, 21 screens (menus, intel, trophies, end screen), 22 squad life (SQUAD, bodies), 24 music (generated, TRACKS), 25 hive life (creep, Husk, Matriarch, eggs, the hive's last scream), 25b animations (FIRE: the Pyro's burning ground; ANIM: footprints, casings, melting, damage, scaffolding, meteorites …), 26 playing the Swarm, 27 training/avatar, 28 dev panel (F9) + 28-dev-help (DEV_HELP), 29 relics, 30 save/continue.
- Game state lives in `G` (newGame in 04). Entities: `kind` unit / building / body / crate (relics are crates with `relic`).
- Tunables are UPPERCASE objects at the top of their file; every one is in the dev panel (`DEV_ROOTS` in 28-dev.js) and needs a line in `DEV_HELP` (28-dev-help.js).
- New mission or map: see README "Inhoud toevoegen". New mission settings that matter for tuning: add them to `DEV_MISSION_KEYS`.

## Tests
- Playwright with the preinstalled Chromium; scripts in `tools/tests/` (they load `file:///home/claude/hollow_colony/index.html` and drive the game through `__hc` and the globals).
  - `splittest2.py`: corps regression (must end with `('DIFF', None)`).
  - `trainc2.py corps|swarm`: plays both trainings to the end (skipping steps).
  - `save.py`: save, reload, continue, compare state.
  - `fm4.py`: formations, groups, sweep. `relic.py`: relics and eggs. `matri.py`: Matriarch rooting. `devmenu.py`: the dev panel closes when you leave a mission. `kappaheirs.py`: Hold Kappa's heir shafts. `hatchery.py`: no eggs until a body lies in the creep, body carried to the hive, egg at its foot, Husk skips the Shambler. `fauna.py`: a grazer carcass dragged home becomes a Bloater. `pack.py`: waves march as a pack. (These four must end with `ALL OK`.) `nov5b.py`: High Ground shafts with creep, a downed soldier keeps time for a Medic, a formation takes the clicked spot, the Medic's leash (must end with `ALL OK`). `nov6.py`: an Engineer repairs from his squad's side, away from the Swarm (must end with `ALL OK`). `nov7.py`: a squad in formation marches up to a hive in its shape and attacks at range, forms up again once the hive is gone, Medics do not walk back to an old spot when an order is dropped (must end with `ALL OK`). `los.py`: rock walls stop fire, crater rims do not, an attack order goes round (must end with `ALL OK`). `membrane.py`: nobody shoots through a Swarm membrane (must end with `ALL OK`). `mother.py`: the Brood Mother creeps after a squad that keeps its distance, flings eggs, retreats to her lair to heal and breaks it off when followed, burrows under the squad, acid rain, brood shields (must end with `ALL OK`). `anims3.py`: the third round of animations (idle looks, stray rounds, claw scratches, toppling tower, drag trail, dying creep, shaft spitting, generator flicker; must end with `ALL OK`). `anims2.py`: the second round of animations (spit wind-up, bulging ground, red edge, lamps, unfolding sentry, debris …; must end with `ALL OK`). `anims.py`: the extra animations and the Pyro's ground fire (must end with `ALL OK`). `broodshafts.py`: Burn the Brood's mine shafts (waves and the last surge come up out of them; must end with `ALL OK`). `formations.py`: the formation engine (no swaps, shape on the march, re-forming on the move, fights, save, the ruins of Hollow Colony); must end with `ALL OK`.
- Music: `MUSIC.renderOffline(sec,id)` renders a track; compare peak/RMS with 'hollow'.
- Always look at a screenshot when something is visual.

## Where things stand (Oct 2026)
- Corps campaign 8 missions + training, Swarm campaign 3 missions + training (more Swarm missions still to come), skirmish, map editor.
- Recent: dev panel, save/continue, relics and ancient eggs, Matriarch, Husk as warrior, mine shafts, formations (line, zigzag, own formation, spacing, groups remember formation, sweep), hold fire, four new music tracks.
- Formations march as one body (19b-formations.js): no place swaps, the wedge tip (Pyro) leads, a new formation is taken up on the move, a soldier back up rejoins the squad as it is now. An attack order on one target marches up in formation first (`attackInFormation`) and the squad re-forms once the target is gone (`afterEngage`).
- Real death is gone (Oct 2026). In its place the Flawless trophies: one per difficulty for winning a Corps campaign mission without losing a soldier (G.stats.fallen, results[id].flawless, 'flawless:<diff>' in hc-trophies).
- Hive life: no eggs until a body lies in the creep, then one egg at the hive's foot; bodies are carried right up to the hive; grazer carcasses go the same way and become Bloaters; the Swarm's Husks skip the Shambler (The Graft keeps it). Waves march as a pack (PACK). Heir shafts (swarm.shaftHeirs, Hold Kappa) take over from a burnt hive.
- Ideas mentioned but not built: relics for the Swarm campaign, more Swarm missions, spore sac for new hives.
