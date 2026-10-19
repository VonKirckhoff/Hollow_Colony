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
/* how a step runs: start (setup, the card opens) → run (the check, while you play; the card may stay open) → done
   → wait until you have closed the card → the next step. Practising an earlier step (from the card) runs that step once more
   and then comes back to where you were. */
function tutorialTick(g,steps){ const V=g.vars; G.tutSteps=steps;
  if(V.tutI==null){ V.tutI=0; V.tutState='start'; V.tutAt=g.time+1; }
  const st=steps[V.tutI]; if(!st) return;
  if(V.tutState==='start'){ if(g.time<V.tutAt) return;
    if(st.setup) try{ st.setup(g); }catch(e){ console.error('tutorial setup',e); }
    tutHighlight(st);   /* light up the buttons this step is about */
    V.stepDone=false; if(st.say) tutShow(V.tutI); else V.cardOpen=false;
    g.setText('tut',`${V.returnTo!=null?'Practice: ':''}Step ${V.tutI+1}/${steps.length}: ${st.obj||''}`); if(st.mark) g.marker('tut',st.mark,st.markLabel||'');
    V.tutState='run'; V.tutStart=g.time; return; }
  if(V.tutState==='run'){ let ok=false; try{ ok=!!V.skip||!!st.done(g); }catch(e){ ok=false; } V.skip=false;
    if(!ok) return;
    g.unmark('tut'); tutHighlight(null); if(st.after) try{ st.after(g); }catch(e){}
    SFX.play('complete'); G.fx.push({k:'text',x:G.cam.x+ui.vw/2,y:G.cam.y+(ui.vh-ui.hudH)/2-40,t:1.2,max:1.2,txt:'✓',col:'#5fe3b0'});
    V.stepDone=true; V.tutState='wait'; tutRefresh();
    /* tick it off in the objectives list: the last three finished steps stay visible, checked */
    const idx=G.objectives.findIndex(o=>o.id==='tut'); if(idx>=0){ G.objectives.splice(idx,0,{ id:'tutd'+(++V.doneN||(V.doneN=1)), text:st.obj||'', state:'done' });
      const dn=G.objectives.filter(o=>/^tutd/.test(o.id)); if(dn.length>3) G.objectives.splice(G.objectives.indexOf(dn[0]),1); G.objDirty=true; }
    return; }
  if(V.tutState==='wait'&&!V.cardOpen){   /* the next card only comes once you have closed this one */
    if(V.returnTo!=null){ V.tutI=V.returnTo; V.returnTo=null; } else V.tutI++;
    V.tutState='start'; V.tutAt=g.time+(st.pause??0.8);
    if(V.tutI>=steps.length) g.complete('tut'); } }
/* the top bar, one button at a time, each with something to see */
function topbarSteps(side){ const sw=side==='swarm', used=n=>(G.uiUse&&G.uiUse[n])||0;
  return [
    { say:`The motion tracker, bottom right, shows everything that moves near ${sw?'the units you selected (or the middle of the screen)':'your squad'}: ${sw?'every warm body of theirs':'a few Crawlers are creeping about out of sight'}. Switch it off and on again with [K] or the Tracker button.`, obj:'Switch the motion tracker off and on (K)', hl:['#btn-tracker'],
      setup:g=>{ g.vars.u0=used('tracker'); if(!sw){ const c=tut.corpsUnits()[0]; if(c){ const f=freeTilesNear(Math.floor(c.x/TILE)+13,Math.floor(c.y/TILE)-6,1)[0]; if(f) g.vars.blips=g.spawn('crawler',f,3,{order:'guard'}).map(u=>{ u.dmgMul=0.1; u.hp=u.maxHp=10; return u; }); } } },
      done:g=>used('tracker')>=g.vars.u0+2, after:g=>{ for(const u of g.vars.blips||[]) if(!u.dead){ u.dead=true; } } },
    { say:`Camera follow. Switch it off with [C] and send ${sw?'selected brood':'the squad'} somewhere: the camera stays put. Switch it on again and send them once more: now the camera glides along.`, obj:'Switch camera follow off and on, and move (C)', hl:['#btn-follow'],
      setup:g=>{ g.vars.u0=used('follow'); }, done:g=>used('follow')>=g.vars.u0+2&&ui.follow&&G.following },
    { say:'The 1× button sets the game speed. Click it until it says 2×: everything moves twice as fast. Then click it back to 1×.', obj:'Speed up to 2× and back to 1×', hl:['#btn-speed'],
      setup:g=>{ g.vars.u0=used('speed2'); g.vars.u1=used('speed1'); }, done:g=>used('speed2')>g.vars.u0&&used('speed1')>g.vars.u1&&G.speed===1 },
    { say:`${sw?'They talk on their radio and we hear it.':'Your soldiers talk.'} [O] or the Voices button switches the voices off and on; the VOL slider next to it sets how loud they are. Try both.`, obj:'Switch the voices off and on (O) and move the VOL slider', hl:['#btn-voices','.tb-vol'],
      setup:g=>{ g.vars.u0=used('voices'); g.vars.u1=used('volume'); }, done:g=>used('voices')>=g.vars.u0+2&&used('volume')>g.vars.u1&&ui.voices },
    { say:'Sound on/off mutes every sound in the game. Switch it off, listen to the silence, and switch it on again.', obj:'Switch the sound off and on', hl:['#btn-sound'],
      setup:g=>{ g.vars.u0=used('sound'); }, done:g=>used('sound')>=g.vars.u0+2&&!SFX.muted },
    { say:'Menu, [P] or [Esc] pauses the game. From there you can open the Field Manual, restart or quit. Open it and resume.', obj:'Open the menu (P) and resume', hl:['#btn-menu'],
      setup:g=>{ g.vars.u0=used('resume'); }, done:g=>used('resume')>g.vars.u0 }
  ]; }
/* small helpers for the step checks */
const tut = {
  corpsUnits:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  selCorps:()=>G.sel.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  built:type=>G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.type===type&&e.built),
  camMoved:g=>Math.hypot(G.cam.x-g.vars.cam0.x,G.cam.y-g.vars.cam0.y)>260
};


