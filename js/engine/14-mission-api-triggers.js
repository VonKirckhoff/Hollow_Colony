'use strict';
/* ---------- 2m. mission API & triggers ---------- */
function makeApi(){
  const objective=id=>G.objectives.find(o=>o.id===id);
  return {
    get time(){ return G.time; }, get vars(){ return G.vars; },
    say:(who,text)=>say(who,text),
    addObjective(id,text,optional){ if(!objective(id)){ G.objectives.push({id,text,optional,state:'active'}); G.objDirty=true; say('Objective',text,'sys'); } },
    complete(id){ const o=objective(id); if(o&&o.state==='active'){ o.state='done'; G.objDirty=true; } },
    fail(id){ const o=objective(id); if(o&&o.state==='active'){ o.state='failed'; G.objDirty=true; } },
    setText(id,text){ const o=objective(id); if(o&&o.text!==text){ o.text=text; G.objDirty=true; } },
    isDone:id=>objective(id)?.state==='done',
    spawn(type,at,n=1,opt={}){ const f=opt.faction||UNITS[type].faction; const us=spawnAt(type,f,at,n);
      for(const u of us){ if(f==='corps') fromReserve(u); if(opt.prey) u.prey=opt.prey; if(opt.truce) u.truce=opt.truce; if(f==='swarm'){ u.role=opt.order||'hunt'; if(u.role==='boss'||u.role==='guard') u.guardAt={x:u.x,y:u.y}; } else u.home={x:u.x,y:u.y}; if(f==='corps') G.fx.push({k:'boom',x:u.x,y:u.y,t:0.3,max:0.3,r:18,col:'#ffe2a8'}); }
      return us; },
    alive:list=>(list||[]).filter(e=>!e.dead).length,
    near(faction,at,radius){ const p=ptWorld(at); if(!p) return 0; return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction===faction&&Math.hypot(e.x-p.x,e.y-p.y)<=radius*TILE).length; },
    has:type=>G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.type===type&&(e.kind!=='building'||e.built)).length,
    hives:()=>hives().length,
    stat:name=>G.stats[name]||0,
    reveal(at,radius=4,seconds=6){ const p=ptWorld(at); if(p) G.reveals.push({x:p.x,y:p.y,r:radius,until:G.time+seconds}); },
    ping(at){ const p=ptWorld(at); if(p) G.pings.push({x:p.x,y:p.y,t:0,col:'#ffb347'}); },
    marker(id,at,label){ const p=ptWorld(at); if(!p) return; G.markers=G.markers.filter(m=>m.id!==id); G.markers.push({id,x:p.x,y:p.y,label}); },
    unmark(id){ G.markers=G.markers.filter(m=>m.id!==id); },
    /* showcase: the camera shows this spot at the start of the mission (SHOWCASE in 20-input.js) and it keeps a marker until unmark(id) */
    showcase(id,at,label,col){ const p=ptWorld(at); if(p) addShowcase(p.x,p.y,id,label,col); },
    give(n){ G.salvage+=n; },
    /* wall: seal tiles with living membrane (kind 'membrane', default) or a station blast door (kind 'door'). Radius 0 = one tile. */
    wall(at,radius,tag,kind='membrane'){ const p=pt(at); if(!p) return; const R2=radius*radius; for(let y=p.y-Math.ceil(radius);y<=p.y+Math.ceil(radius);y++) for(let x=p.x-Math.ceil(radius);x<=p.x+Math.ceil(radius);x++){
        if((x-p.x)**2+(y-p.y)**2>R2||!walkableT(x,y)) continue; const f=BUILDINGS[kind].faction, m=makeBuilding(kind,f,x,y,true); m.tag=tag; m.invuln=true; if(f==='corps') G.stats.built--; } },
    /* weakenWall: the membrane stays but can now be destroyed (optionally with new hp per tile). walls(tag): tiles still standing. */
    weakenWall(tag,hp){ for(const e of G.ents) if(e.type==='membrane'&&e.tag===tag&&!e.dead){ e.invuln=false; if(hp){ e.hp=e.maxHp=hp; } } },
    walls:tag=>G.ents.filter(e=>e.type==='membrane'&&e.tag===tag&&!e.dead).length,
    /* airdrop: the dropship flies cargo to the mission's Landing Zone, e.g. g.airdrop([['trooper',2],['pyro',1]], 15). */
    /* airdrop: optional rallyAt = point the new troops attack-move to after landing (e.g. to join the squad). */
    airdrop(list,delay=15,rallyAt){ const lz=G.ents.find(e=>!e.dead&&e.def&&e.def.reinforce&&!e.noOrders); if(!lz) return;
      const cargo=[]; for(const [type,n=1] of list) for(let i=0;i<n;i++) cargo.push(type);
      if(lz.flight) lz.flight.cargo.push(...cargo); else lz.flight={ t:Math.max(5,delay), total:Math.max(5,delay), cargo };
      if(rallyAt) lz.flight.rally=ptWorld(rallyAt); G.selDirty=true; },
    /* troops(): living Corps soldiers on the map (all of them, wherever they are). */
    /* Seismic charges: chargeSite(at,tag[,opt]) marks a site; charge(tag) is 'site', 'arming', 'armed' or 'blown'.
       opt (all optional): { arm, fuse, blast (tiles), reset:true (a hit or stepping off restarts the arming), own (damage to your own soldiers in the blast, red ring while it burns),
       opens:'wallTag' (the blast blows that wall away), name:'breaching charge', label:'BREACH POINT' }. chargeResets(tag): how often the arming was interrupted. */
    chargeSite(at,tag,opt){ const p=pt(at); if(!p) return; const s=makeBuilding('chargesite','corps',p.x,p.y,true); s.tag=tag; s.invuln=true; s.arm=0; if(opt) s.opt=opt; G.stats.built--;
      (G.charges=G.charges||{})[tag]={ state:'site', at:p }; },
    charge:tag=>(G.charges&&G.charges[tag])?G.charges[tag].state:null,
    chargeResets:tag=>(G.charges&&G.charges[tag]&&G.charges[tag].resets)||0,
    chargeFuse:tag=>{ const c=G.ents.find(e=>!e.dead&&e.type==='charge'&&e.tag===tag); return c?Math.ceil(c.fuse):null; },
    /* Generators: online() = how many run right now; generatorAt(at) = the generator on that point. */
    online:()=>G.ents.filter(e=>!e.dead&&e.def&&e.def.generator&&e.powered).length,
    generatorAt(at){ const p=ptWorld(at); if(!p) return null; return G.ents.find(e=>!e.dead&&e.def&&e.def.generator&&Math.hypot(e.x-p.x,e.y-p.y)<TILE*2)||null; },
    /* bury(at, radius, tag): a collapse. Hives near the point die (and the tunnels under them, shaft entry under:true), rubble fills the ground around it (not under soldiers),
       and any soldier cut off from the start point P is dug out to the nearest open ground. */
    bury(at,radius=1.6,tag='collapse'){ const p=pt(at); if(!p) return; const w=ptWorld(at);
      for(const h of G.ents) if(!h.dead&&h.type==='hive'&&Math.hypot(h.x-w.x,h.y-w.y)<(radius+2)*TILE) kill(h,null);
      for(const s of G.ents) if(!s.dead&&s.type==='shaft'&&s.under&&Math.hypot(s.x-w.x,s.y-w.y)<(radius+2)*TILE){ s.dead=true; s.closed=true; }   /* a tunnel under a buried hive caves in with it */
      const R2=radius*radius;
      for(let y=p.y-Math.ceil(radius);y<=p.y+Math.ceil(radius);y++) for(let x=p.x-Math.ceil(radius);x<=p.x+Math.ceil(radius);x++){
        if((x-p.x)**2+(y-p.y)**2>R2||!walkableT(x,y)) continue; const cx=(x+.5)*TILE, cy=(y+.5)*TILE;
        if(G.ents.some(e=>!e.dead&&e.kind==='unit'&&Math.hypot(e.x-cx,e.y-cy)<TILE*0.9)) continue;
        const m=makeBuilding('rubble','none',x,y,true); m.tag=tag; m.invuln=true; }
      for(let i=0;i<40;i++) G.fx.push({k:'ember',x:w.x+rand(-60,60),y:w.y+rand(-50,50),vx:rand(-90,90),vy:rand(-120,0),t:rand(.6,1.2),max:1.2,col:pick(['#8a8f9c','#5d6170','#3a3b44'])});
      digOut(pt('P')); },
    /* pad(at, tag): an extra landing pad (no orders), e.g. for a pickup. landShip(tag, seconds): a dropship lands there and waits.
       landShip(tag, seconds, false): a drop, not a pickup; it sets down, unloads and lifts off again (the mission spawns the men). */
    pad(at,tag){ const p=pt(at); if(!p) return; const b=makeBuilding('lz','corps',p.x-1,p.y-1,true); b.flight=null; b.invuln=true; b.r=TILE*1.5; b.noOrders=true; b.tag=tag; G.stats.built--; return b; },
    landShip(tag,seconds=60,stay=true,opt={}){ const b=shipPad(tag); if(b){ b.shipLeft=null; b.flight={ t:seconds, total:seconds, cargo:[], pickup:!!stay, wait:opt.wait||SHIP.wait, name:opt.name }; } },
    /* a pickup (Nov 2026): shipDown(tag) the ship is on the pad and waiting; aboard(tag) how many went up its ramp; shipGone(tag) it left
       ('time', 'hull' or 'done'); liftOff(tag) send it off now (the mission is won); shipLeft(tag) seconds until it goes; hullLeft(tag) 0…1.
       tag null: the mission's own Landing Zone. */
    shipDown:tag=>{ const b=shipPad(tag); return !!(b&&b.ship&&b.ship.phase==='parked'&&b.ship.pickup); },
    aboard:tag=>{ const b=shipPad(tag); return b?G.ents.filter(e=>!e.dead&&e.aboard===b).length:0; },
    shipGone:tag=>{ const b=shipPad(tag); return b?b.shipLeft||null:null; },
    liftOff(tag){ const b=shipPad(tag); if(b&&b.ship&&b.ship.phase==='parked'&&b.ship.pickup) pickupLeave(b,b.ship,'done'); },
    shipLeft:tag=>{ const b=shipPad(tag); return b&&b.ship&&b.ship.pickup&&b.ship.phase==='parked'?Math.max(0,b.ship.t):0; },
    hullLeft:tag=>{ const b=shipPad(tag), h=b&&pickupHull(b); return h?h.hp/h.maxHp:0; },
    /* supplyDrop(type, tag, seconds): the dropship flies a folded-up structure (e.g. 'sentry') to a pad (g.pad tag, or the mission's
       Landing Zone without a tag). It is set down on the pad; an Engineer picks it up by walking onto it.
       supplies(type): how many the Corps has anywhere (standing, carried, on a pad or on the way). */
    supplyDrop(type,tag,seconds=60){ const lz=G.ents.find(e=>!e.dead&&e.def&&e.def.reinforce&&(tag?e.tag===tag:!e.noOrders)); if(!lz) return;
      if(lz.flight) lz.flight.cargo.push(type); else lz.flight={ t:Math.max(5,seconds), total:Math.max(5,seconds), cargo:[type] }; G.selDirty=true; },
    supplies:type=>suppliesOf(type),
    troops:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps').length,
    openWall(tag){ for(const e of G.ents) if((e.type==='membrane'||e.def&&e.def.scenery)&&e.tag===tag&&!e.dead){
        if(e.def.scenery){ e.dead=true; e.hp=0; setBlock(e,0); for(let i=0;i<8;i++) G.fx.push({k:'spark',x:e.x+rand(-12,12),y:e.y,vx:rand(-50,50),vy:rand(-60,0),t:0.5,max:0.5,col:'#ffd23f'}); SFX.play('ack',e.x,e.y); }
        else { e.invuln=false; kill(e,null); } } },
    swarmCount:()=>swarmCount(),
    /* setSwarm({...}): change the mission's swarm settings mid-mission, e.g. g.setSwarm({ aggro:7 }) when the hives wake up */
    setSwarm(o){ Object.assign(G.swarm.cfg,o||{}); },
    diffBudget:()=>G.diff.budget,
    diffInterval:()=>G.diff.interval,
    uplinks:()=>G.ents.filter(e=>!e.dead&&e.def&&e.def.capture&&e.owned).length,
    uplinkOwned:at=>G.ents.some(e=>!e.dead&&e.def&&e.def.capture&&e.point===at&&e.owned),
    hiveAt(at){ const w=ptWorld(at); return !!w && hives().some(h=>dist(h,w)<2*TILE); },
    boss(u,title){ G.boss=u; G.bossTitle=title||u.def.name; },
    where:at=>ptWorld(at),
    wave:(budget,aim)=>launchWave(budget*G.diff.budget, typeof aim==='string'||(aim&&!aim.kind)?ptWorld(aim):aim),   // aim: map point, tile {x,y} or a unit
    waveAt:(budget,from,aim,only,first)=>launchWaveAt(budget*G.diff.budget, pt(from), ptWorld(aim), only, first),   // a wave out of the ground at `from` (tile), to `aim`; only: allowed types, first: types it certainly holds
    clearTimer(){ G.timer=null; },
    setTimer(seconds,label){ G.timer={end:G.time+seconds,label}; },
    timerLeft:()=>G.timer?Math.max(0,G.timer.end-G.time):Infinity,
    /* for the Swarm campaign: the Lunar Corps is the computer's side */
    corps:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.def.escort),
    orderCorps(list,at,mode='amove'){ const p=ptWorld(at); if(!p) return; const us=(list==='all'?G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'):list).filter(e=>!e.dead&&!e.downed); if(us.length) corpsMove(us,p.x,p.y,mode); },
    place(type,at,dx=0,dy=0){ const p=pt(at); if(!p) return null; const s=BUILDINGS[type].size; for(const o of SPIRAL){ const x=p.x+dx+o.x, y=p.y+dy+o.y; let ok=true;
        for(let j=0;j<s&&ok;j++) for(let i=0;i<s;i++) if(!walkableT(x+i,y+j)){ ok=false; break; } if(ok) return makeBuilding(type,'corps',x,y,true); } return null; },
    biomass(n){ G.swarm.biomass+=n; },
    brood:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').length,
    inbound:()=>G.ents.filter(e=>!e.dead&&e.type==='lz'&&e.flight).reduce((s,e)=>s+e.flight.cargo.length,0),
    n:x=>Math.max(1,Math.round(x*(G.corpsDiff?G.corpsDiff.reinforce:1))),
    brood_say:(text)=>say('The Brood',text,'swarm'),
    win:text=>endGame(true,text), lose:text=>endGame(false,text)
  };
}
function runTriggers(){
  if(G.endWait){ if(!shipLeaving()){ const e=G.endWait; G.endWait=null; endGame(e.win,e.text); } return; }   /* waiting for the dropship to be gone */
  for(const t of G.triggers){ if(G.over) return; if(t.fired && !t.repeat) continue;
    let ok=false; try{ ok=t.when(G.api); }catch(e){ console.error('Trigger condition error',e); t.fired=true; continue; }
    if(ok){ t.fired=true; try{ t.do(G.api); }catch(e){ console.error('Trigger action error',e); } } }
  // default defeat: nothing left
  if(!G.over && G.side==='swarm'){ if(!G.ents.some(e=>!e.dead&&e.faction==='swarm'&&(e.kind==='unit'||e.type==='hive'||e.type==='cocoon'))) endGame(false,'The brood is ash. Nothing is left to remember the hunger.'); }
  else if(!G.over && !G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground) && !(G.rogue&&G.rogue.out&&G.rogue.out.length)) endGame(false,'Your forces have been wiped out.');   /* (Rogue: the crew that went down the shaft is safe) */
}
/* After a defeat the battle carries on behind the report: the simulation keeps running (no more triggers), the fog lifts
   and you can pan around to watch what the Swarm does next (23-main-loop.js, 13-fog-of-war.js, 20-input.js, showEnd). */
function afterDefeat(){ return !!(G&&G.over&&!G.over.win); }
/* Nov 2026: a pickup that ends the mission (won or lost) first lets the dropship lift off and fly away; the end comes after */
const shipLeaving=()=>G.ents.some(b=>!b.dead&&b.ship&&b.ship.pickup&&b.ship.phase==='takeoff');
function endGame(win,text){
  if(G.over||G.endWait) return; if(shipLeaving()){ G.endWait={win,text}; return; } G.over={win,text,at:performance.now()}; SFX.play(win?'win':'lose');
  if(win){ settleRoster(); if(G.mission.rogue) rogueSettle(); }   /* Rogue: the crew, its samples and its taint (31-rogue.js) */
  if(win && G.mission.id!=='skirmish' && !G.demo){   /* a training you only watched does not count */ G.prevBest=resultOf(G.mission.id)?{...resultOf(G.mission.id)}:null;
    const rogueWas=typeof rogueUnlocked==='function'&&rogueUnlocked(); G.flawless=flawlessRun(); recordWin(G.mission.id,G.diffKey,Math.round(G.time),G.flawless); G.flawlessWon=G.flawless?checkFlawless():[]; G.grandWon=checkGrand(); G.swarmWon=G.mission.side==='swarm'?checkSwarmTrophies():[]; G.rogueOpened=!rogueWas&&typeof rogueUnlocked==='function'&&rogueUnlocked();   /* the last Corps mission on Normal+ opens Rogue Strain */
    if(G.mission.rogue) G.rogueWon=(G.rogueWon||[]).concat(checkRogueTrophies()); }   /* the difficulty trophies need this win recorded first */
  ui.placing=null; ui.amove=false;
  setTimeout(()=>{ if(G&&G.over) showEnd(); },1800);
}
