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
- `js/engine/`: 00 core … 30. Notable: 05 entities, 08 combat, 09 unit behaviour, 12 swarm director (WAVES, shafts), 14 mission API, 17 rendering, 18 HUD, 19 commands (formations), 20 input, 21 screens (menus, intel, trophies, end screen), 22 squad life (SQUAD, bodies), 24 music (generated, TRACKS), 25 hive life (creep, Husk, Matriarch, eggs), 26 playing the Swarm, 27 training/avatar, 28 dev panel (F9) + 28-dev-help (DEV_HELP), 29 relics, 30 save/continue.
- Game state lives in `G` (newGame in 04). Entities: `kind` unit / building / body / crate (relics are crates with `relic`).
- Tunables are UPPERCASE objects at the top of their file; every one is in the dev panel (`DEV_ROOTS` in 28-dev.js) and needs a line in `DEV_HELP` (28-dev-help.js).
- New mission or map: see README "Inhoud toevoegen". New mission settings that matter for tuning: add them to `DEV_MISSION_KEYS`.

## Tests
- Playwright with the preinstalled Chromium; scripts in `tools/tests/` (they load `file:///home/claude/hollow_colony/index.html` and drive the game through `__hc` and the globals).
  - `splittest2.py`: corps regression (must end with `('DIFF', None)`).
  - `trainc2.py corps|swarm`: plays both trainings to the end (skipping steps).
  - `save.py`: save, reload, continue, compare state.
  - `fm4.py`: formations, groups, sweep. `relic.py`: relics and eggs. `matri.py`: Matriarch rooting. `rdsave.py`: Real death iron mode (save and quit, one-time Continue, fallen at once, quit = lost mission).
- Music: `MUSIC.renderOffline(sec,id)` renders a track; compare peak/RMS with 'hollow'.
- Always look at a screenshot when something is visual.

## Where things stand (Oct 2026)
- Corps campaign 8 missions + training, Swarm campaign 3 missions + training (more Swarm missions still to come), skirmish, map editor.
- Recent: dev panel, save/continue, relics and ancient eggs, Matriarch, Husk as warrior, mine shafts, formations (line, zigzag, own formation, spacing, groups remember formation, sweep), hold fire, four new music tracks.
- Real death is iron mode (save and quit, Continue once, the fallen go on the Cenotaph at once, quitting = a lost mission).
- Ideas mentioned but not built: relics for the Swarm campaign, more Swarm missions, spore sac for new hives.
