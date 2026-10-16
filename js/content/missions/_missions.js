'use strict';
/* 1g. MISSIONS — one file per mission; the campaign order is the order of the <script> lines in index.html.
   start:     what is on the map at t=0 (points refer to map markers)
   landingZone: optional { tx, ty, max, delay }: a pad where reinforcements are ordered and flown in; max = troop cap
   noTraining: true = the Command Post does not train in this mission
   limits:    optional cap per building type, e.g. { sentry:3 } (packed-up sentries do not count)
   swarm:     AI tuning. waves:null means no attack waves.
   objectives: shown in the HUD. optional:true = not required.
   triggers:  { when:g=>bool, do:g=>{...}, repeat:true? } checked 4× per second.
   The mission API (g) — see makeApi() in the engine:
     g.time  g.vars  g.say(who,text)  g.addObjective(id,text,optional)  g.complete(id)  g.fail(id)
     g.setText(id,text)  g.spawn(type,at,n,{faction,order})  g.alive(list)  g.near(faction,at,radius)
     g.has(type)  g.hives()  g.stat(name)  g.reveal(at,radius,seconds)  g.ping(at)  g.marker(id,at,label)  g.unmark(id)  g.give(salvage)
     g.where(at)  g.wave(budget,aim?)  g.setTimer(seconds,label)  g.clearTimer()
     g.uplinks()  g.uplinkOwned(at)  g.swarmCount()  g.diffBudget()
     g.wall(at,radius,tag)  g.openWall(tag)  g.hiveAt(at)  g.boss(unit,title)
     g.convoy(list,route)  g.convoyGo()  g.convoyArrived()  g.convoyHalted()  g.convoyLead()  g.timerLeft()  g.win(text)  g.lose(text) */
const MISSIONS = [];
