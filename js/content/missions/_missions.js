'use strict';
/* 1g. MISSIONS — one file per mission; the campaign order is the order of the <script> lines in index.html.
   start:     what is on the map at t=0 (points refer to map markers)
   landingZone: optional { tx, ty, max, delay }: a pad where reinforcements are ordered and flown in; max = troop cap.
                scripted:true = no order buttons; only the mission sends the dropship, with g.airdrop([[type,n],…], seconds)
   noTraining: true = the Command Post does not train in this mission
   limits:    optional cap per building type, e.g. { sentry:3 } (packed-up sentries do not count)
   swarm:     AI tuning (see "Moeilijkheid aanpassen" in the README). waves:null means no attack waves.
              biomass, rate, guardMax, guardEvery, hiveRage, aggro, aggroBrood, aggroCooldown, brood, guards:[types], creep (tiles of fungus), husks (max new hives),
              waves:{ first, every, budget, growth, types:[types] }, unlock:{ type:seconds }, burrows
   start.hives: map points, or { at:'a', hp, guardMax, guardEvery, guards, aggro, aggroBrood, aggroCooldown, brood, rage, creep } per hive
   dark:      optional { sight }: the mission plays in the dark (sight × sight; running generators give light)
   flares:    optional number of flares (default 3, or 6 in a dark mission)
   objectives: shown in the HUD. optional:true = not required.
   triggers:  { when:g=>bool, do:g=>{...}, repeat:true? } checked 4× per second.
   The mission API (g) — see makeApi() in the engine:
     g.time  g.vars  g.say(who,text)  g.addObjective(id,text,optional)  g.complete(id)  g.fail(id)
     g.setText(id,text)  g.spawn(type,at,n,{faction,order})  g.alive(list)  g.near(faction,at,radius)
     g.has(type)  g.hives()  g.stat(name)  g.reveal(at,radius,seconds)  g.ping(at)  g.marker(id,at,label)  g.unmark(id)  g.give(salvage)
     g.where(at)  g.wave(budget,aim?)  g.setTimer(seconds,label)  g.clearTimer()
     g.uplinks()  g.uplinkOwned(at)  g.swarmCount()  g.diffBudget()
     g.wall(at,radius,tag,kind)  g.openWall(tag)  g.weakenWall(tag,hp)  g.walls(tag)  g.airdrop(list,seconds,rallyAt)  g.troops()
     g.setSwarm({...})  g.online()  g.generatorAt(at)  g.chargeSite(at,tag)  g.charge(tag)  g.chargeFuse(tag)  g.bury(at,radius,tag)  g.hiveAt(at)  g.boss(unit,title)
     g.timerLeft()  g.win(text)  g.lose(text) */
const MISSIONS = [];
/* The Swarm campaign: the same maps and story, played as the Brood (side:'swarm'). The Lunar Corps is the computer.
   Extra: start.rally (where the brood gathers first), start.units are Lunar Corps soldiers, start.swarmUnits your first brood
   (give them order:'brood' via swarmBrood), swarm.cap (most brood at once), swarm.unlock (when you may hatch a type).
   Extra mission API for these: g.corps() g.orderCorps(list|'all',at,mode) g.place(type,at,dx,dy) g.biomass(n) g.brood() g.inbound() g.n(x) g.brood_say(text) */
const SWARM_MISSIONS = [];
