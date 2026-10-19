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
/* Training: one per side, shown as 00 above the campaign list. Not part of the campaign: no roster, no unlocks, no trophies.
   Built from steps with tutorial([...]) (see js/engine/27-training.js); press N in a training mission to skip a step. */
const TRAINING = {};
/* the step engine for training missions (runs during the mission; the engine itself is loaded later) */
const TUT_VOICE = { corps:'Sgt. Kessler', swarm:'The Brood' };
function tutorial(steps){ return [
  { repeat:true, when:()=>true, do:g=>tutorialTick(g,steps) } ]; }
function tutorialTick(g,steps){ const V=g.vars;
  if(V.tutI==null){ V.tutI=0; V.tutState='start'; V.tutAt=g.time+1; }
  const st=steps[V.tutI]; if(!st) return;
  if(V.tutState==='start'){ if(g.time<V.tutAt) return;
    if(st.setup) try{ st.setup(g); }catch(e){ console.error('tutorial setup',e); }
    tutHighlight(st);   /* light up the buttons this step is about */
    if(st.say) tutShow(st.who||TUT_VOICE[G.side],st.say,V.tutI+1,steps.length);   /* the card waits until you confirm it */
    g.setText('tut',`Step ${V.tutI+1}/${steps.length}: ${st.obj||''}`); if(st.mark) g.marker('tut',st.mark,st.markLabel||'');
    V.tutState='run'; V.tutStart=g.time; return; }
  let ok=false; try{ ok=!!V.skip||!!st.done(g); }catch(e){ ok=false; } V.skip=false;
  if(ok){ g.unmark('tut'); tutHighlight(null); if(st.after) try{ st.after(g); }catch(e){}
    SFX.play('complete'); G.fx.push({k:'text',x:G.cam.x+ui.vw/2,y:G.cam.y+(ui.vh-ui.hudH)/2-40,t:1.2,max:1.2,txt:'✓',col:'#5fe3b0'});
    V.tutI++; V.tutState='start'; V.tutAt=g.time+(st.pause??1.5);
    if(V.tutI>=steps.length) g.complete('tut'); } }
/* small helpers for the step checks */
const tut = {
  corpsUnits:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  selCorps:()=>G.sel.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  built:type=>G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.type===type&&e.built),
  camMoved:g=>Math.hypot(G.cam.x-g.vars.cam0.x,G.cam.y-g.vars.cam0.y)>260
};


