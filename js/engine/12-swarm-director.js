'use strict';
/* ---------- 2k. the Swarm director ---------- */
function swarmTypes(){ return Object.keys(UNITS).filter(k=>UNITS[k].faction==='swarm' && UNITS[k].weight && G.time>=((G.swarm.cfg.unlock||{})[k] ?? UNITS[k].unlock ?? 0)); }
/* only: an optional list of types (e.g. ['drone','drone','spitter']: repeats make a type more likely). A listed type ignores its unlock time. */
function pickSwarmType(maxCost,only){
  if(only&&only.length){ const opts=only.filter(k=>UNITS[k]&&UNITS[k].biomass<=maxCost); return opts.length?pick(opts):null; }
  const opts=swarmTypes().filter(k=>UNITS[k].biomass<=maxCost); if(!opts.length) return null;
  let tot=opts.reduce((s,k)=>s+UNITS[k].weight,0), r=Math.random()*tot; for(const k of opts){ r-=UNITS[k].weight; if(r<=0) return k; } return opts[0]; }
function swarmCount(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss).length; }
function hives(){ return G.ents.filter(e=>e.type==='hive'&&!e.dead); }
function shafts(){ return G.ents.filter(e=>e.type==='shaft'&&!e.dead&&!e.exit); }   /* e.exit: a Rogue way out, not theirs */
/* Heir shafts (mission swarm.shaftHeirs:true): every mine shaft belongs to the hive nearest to it. When that hive is burnt, its shaft(s)
   take over its role: guards, watching the ground, biomass and the waves, as strong as the hive was (two shafts behind one hive share it).
   spawners(): living hives plus shafts that took over. */
function spawners(){ return G.ents.filter(e=>!e.dead&&(e.type==='hive'||(e.type==='shaft'&&e.heir))); }
function spawnerCount(){ const s=new Set(); for(const e of spawners()) s.add(e.type==='hive'?e.id:'h'+e.heirOf); return s.size; }   /* a hive and its heirs count as one */
function assignHeirs(){ const hs=hives(); for(const s of shafts()){ const h=hs.length?hs.reduce((a,b)=>dist(a,s)<=dist(b,s)?a:b):null; if(h) s.heirOf=h.id; } }
function heirTakeover(){ for(const s of shafts()){ if(s.heir||s.heirOf==null) continue; const h=G.ents.find(e=>e.id===s.heirOf); if(h&&!h.dead) continue;
    const group=shafts().filter(o=>o.heirOf===s.heirOf); for(const o of group){ o.heir=true; o.share=1/group.length; o.cfg={...((h&&h.cfg)||{}), creep:(o.cfg&&o.cfg.creep)||0, eggs:(o.cfg&&o.cfg.eggs)||0};   /* a shaft with creep of its own keeps it: still a nest for the dead */ o.spawnT=rand(3,6);
      G.pings.push({x:o.x,y:o.y,t:0,col:'#a6ff4a'}); if(isVisible(o)||G.seen[Math.floor(o.y/TILE)*G.map.w+Math.floor(o.x/TILE)]) SFX.play('hatch',o.x,o.y); }
    if(G.side==='corps') say(G.mission.rogue?'Capt. Haesaert':'Sgt. Kessler',G.saidHeir?'Another one. That shaft has taken over from the hive we burnt.':'The hive is ash, but listen: they are coming up the old mine shaft behind it now. Same numbers as before.','alert'); G.saidHeir=true; } }
/* nests: everything with creep the Swarm brings its dead home to and where Husks heal: hives, and shafts with creep of their own (shaft entry creep:<tiles>) */
function isNest(e){ return !e.dead&&(e.type==='hive'||(e.type==='shaft'&&e.cfg&&e.cfg.creep>0)); }
function nests(){ return G.ents.filter(isNest); }
/* Waves: they grow for the first few waves and then stop growing, they shrink as you burn hives, and the Swarm never
   fields more than a set number of creatures at once (a wave that would go over waits).
   Per mission in swarm.waves: max (biggest wave budget), growWaves (how many waves keep growing); in swarm: maxAlive. */
const WAVES = { growWaves:8, maxAlive:40, hiveScale:0.6, waitFull:15, shaftScale:0.9 };   /* shaftScale: waves out of mine shafts (no hive left) are this size */
function swarmCap(){ return (G.swarm.cfg.maxAlive??WAVES.maxAlive)*G.diff.budget; }
function roamCount(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss&&e.role!=='guard').length; }   /* the cap is for what roams: the guards at home do not count */
function waveBudget(){ const S=G.swarm, w=S.cfg.waves, hs=spawnerCount();
  let b=w.budget+w.growth*Math.min(S.waveN-1, w.growWaves??WAVES.growWaves); if(w.max!=null) b=Math.min(b,w.max);
  if(S.hives0&&hs) b*=1-WAVES.hiveScale*(1-Math.min(1,hs/S.hives0));   /* every burnt hive makes the waves smaller */
  return b*G.diff.budget; }
function nextWaveDue(){ const S=G.swarm; if(roamCount()>=swarmCap()*0.85){ S.nextWave=G.time+WAVES.waitFull; return false; } return true; }
function updateSwarm(dt){
  const S=G.swarm, cfg=S.cfg;
  if(S.hives0==null){ S.hives0=hives().length; if(cfg.shaftHeirs) assignHeirs(); }
  if(cfg.shaftHeirs) heirTakeover();
  const hs=spawners();
  if(!hs.length){ if((cfg.burrows||shafts().length) && cfg.waves && G.time>=S.nextWave && nextWaveDue()){   /* no hive left: they burrow up, or come up the mine shafts */ S.waveN++; launchWave(waveBudget()); S.nextWave=G.time+cfg.waves.every*G.diff.interval; } return; }
  S.biomass+=cfg.rate*hs.reduce((n,h)=>n+(h.share||1),0)*dt;
  for(const h of hs){
    hiveWatch(h,dt);
    h.spawnT-=dt; if(h.spawnT>0) continue; h.spawnT=hiveOpt(h,'guardEvery',14)*rand(0.8,1.2);
    const guards=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.homeHive===h.id&&e.role==='guard').length;
    if(guards>=Math.ceil(hiveOpt(h,'guardMax',4)*(h.share||1))) continue;   /* heir shafts behind one hive share its guards */
    const own=G.side==='swarm';   /* playing the Swarm, a hive grows its own few guards for free: your biomass is yours */
    const type=pickSwarmType(own?40:S.biomass,hiveOpt(h,'guards',own?['drone','crawler']:null)); if(!type) continue;
    if(!own) S.biomass-=UNITS[type].biomass;
    const u=spawnNearBuilding(type,'swarm',h); if(!u) continue;
    u.role='guard'; u.homeHive=h.id; u.guardAt={x:h.x,y:h.y}; u.order={type:'guard',x:h.x,y:h.y,wait:0};
  }
  if(cfg.waves && G.time>=S.nextWave && nextWaveDue()){
    S.waveN++; launchWave(waveBudget());
    S.nextWave=G.time+cfg.waves.every*G.diff.interval;
  }
}
/* When no hive is left, the Swarm burrows up out of the regolith instead: at an unseen spot on normal
   ground, 12-22 tiles from the target and well away from your troops. */
function burrowSpot(aim){
  const m=G.map, W=m.w, corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit');
  const ref=aim || corps[Math.floor(Math.random()*Math.max(1,corps.length))] || {x:W*TILE/2,y:m.h*TILE/2};
  let best=null;
  for(let i=0;i<400;i++){ const x=1+Math.floor(Math.random()*(W-2)), y=1+Math.floor(Math.random()*(m.h-2)), k=y*W+x;
    if(G.block[k]||m.height[k]!==0||G.vis[k]) continue;
    const px=(x+.5)*TILE, py=(y+.5)*TILE, d=Math.hypot(px-ref.x,py-ref.y)/TILE; if(d<12||d>22) continue;
    if(corps.some(e=>Math.hypot(e.x-px,e.y-py)<9*TILE)) continue;
    best={x,y}; break; }
  return best;
}
function launchWave(budget,aim){
  let hs=spawners(); const out=[]; let left=budget, guard=0;
  if(!hs.length&&shafts().length){   /* mine shafts: the wave comes up out of one (the nearest to its goal, not one your troops stand on) */
    left*=G.swarm.cfg.shaftScale!=null?G.swarm.cfg.shaftScale:WAVES.shaftScale;   /* the hives are gone: what climbs out of the shafts is less (a mission can set swarm.shaftScale) */
    const corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'), ok=shafts().filter(s=>!corps.some(c=>dist(c,s)<6*TILE)), pool=ok.length?ok:shafts();
    const sh=aim?pool.sort((a,b)=>dist(a,aim)-dist(b,aim))[0]:pick(pool), room=swarmCap()-roamCount(), wt=G.swarm.cfg.waves&&G.swarm.cfg.waves.types;
    const tiles=freeTilesNear(Math.floor(sh.x/TILE),Math.floor(sh.y/TILE),24);
    while(left>=15 && guard++<80 && out.length<Math.min(room,tiles.length)){ const type=pickSwarmType(left,wt); if(!type) break; left-=UNITS[type].biomass;
      const s=tiles[out.length], u=makeUnit(type,'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); u.role='wave'; out.push(u); emergeStart(u);   /* they wait in the shaft while it spits dust */
      for(let j=0;j<5;j++) G.fx.push({k:'ember',x:sh.x+rand(-14,14),y:sh.y+rand(-6,8),vx:rand(-40,40),vy:rand(-90,-30),t:0.8,max:0.8,col:pick(['#8a7a6a','#a6ff4a'])}); }
    if(out.length&&ANIM.emerge>0) G.fx.push({k:'shaftspit',x:sh.x,y:sh.y,t:ANIM.emerge,max:ANIM.emerge,seed:Math.random()*99});
    if(out.length){ if(isVisible(sh)||G.seen[Math.floor(sh.y/TILE)*G.map.w+Math.floor(sh.x/TILE)]) G.pings.push({x:sh.x,y:sh.y,t:0,col:'#a6ff4a'}); SFX.play('hatch',sh.x,sh.y);
      if(!G.shaftWarned){ G.shaftWarned=true; say('Dr. Maas','The hives are gone, but listen: they are climbing up the old mine shafts. The tunnels under this town go deep.','alert'); } }
  } else if(!hs.length){
    const spot=burrowSpot(aim); if(!spot) return [];
    const types=[], wt=G.swarm.cfg.waves&&G.swarm.cfg.waves.types; while(left>=15 && guard++<80){ const type=pickSwarmType(left,wt); if(!type) break; left-=UNITS[type].biomass; types.push(type); }
    const tiles=freeTilesNear(spot.x,spot.y,types.length);
    if(ANIM.emerge>0&&types.length) G.fx.push({k:'bulge',x:(spot.x+.5)*TILE,y:(spot.y+.5)*TILE,r:TILE*(1+Math.sqrt(types.length)*0.5),t:ANIM.emerge,max:ANIM.emerge,seed:Math.random()*99});   /* the ground bulges first */
    types.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); u.role='wave'; out.push(u); emergeStart(u);
      for(let j=0;j<6;j++) G.fx.push({k:'ember',x:u.x+rand(-10,10),y:u.y+rand(-4,6),vx:rand(-50,50),vy:rand(-80,-20),t:0.7,max:0.7,col:'#8a7a6a'}); });
    addDecal((spot.x+.5)*TILE,(spot.y+.5)*TILE,22,'rgba(30,26,22,.6)');
    if(out.length && !G.burrowWarned){ G.burrowWarned=true; say('Dr. Maas','With the hives gone they are burrowing up through the ground. Watch every direction!'); }
  } else {
    if(aim) hs=[...hs].sort((a,b)=>dist(a,aim)-dist(b,aim)).slice(0,2);   // aimed waves come from the nearest hives
    const wt=G.swarm.cfg.waves&&G.swarm.cfg.waves.types;
    const room=swarmCap()-roamCount();   /* never more than the cap at once */
    while(left>=15 && guard++<80 && out.length<room){ const type=pickSwarmType(left,wt); if(!type) break; left-=UNITS[type].biomass;
      const u=spawnNearBuilding(type,'swarm',pick(hs)); if(u){ u.role='wave'; out.push(u); } }
  }
  for(const u of out){ const t=aim || nearestOf(u,e=>e.faction==='corps'&&e.kind==='building'&&!e.def.ground&&!e.def.scenery&&!deadGen(u,e)) || nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit'&&!e.downed);
    if(t){ u.order={type:'amove',x:t.x+rand(-30,30),y:t.y+rand(-30,30)}; setPath(u,u.order.x,u.order.y); } }
  if(hs.length||shafts().length) waveTactic(out);
  makePacks(out);
  if(out.length){ SFX.play('horn'); say('Alert','Swarm movement detected. A wave is coming.','alert'); }
  return out;
}

/* ---------- Swarm tactics ----------
   A big enough wave picks a plan:
   direct – everyone straight in;
   lure   – the fastest few go first, the rest wait a few seconds and hit you while you chase the bait;
   flank  – half the wave swings out wide and comes in from the side. The swing point and the way to it stay out of reach of the
            Lunar Corps (their range + flankClear tiles); the flankers walk there without stopping to fight, then come in.
            If no such point is found (flankOffset … flankOffset+flankSearch tiles out, either side), the wave comes in direct. */
const TACTICS = { minSize:6, lureDelay:9, flankOffset:9, flankSearch:12, flankClear:2, weights:{ direct:0.4, lure:0.3, flank:0.3 } };
/* a swing point for flankers, from (cx,cy) round to goal, out of reach of the Lunar Corps all the way; null if there is none */
function flankPoint(cx,cy,goal){ const T=TACTICS, threats=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&e.def&&e.def.damage&&e.def.range&&!e.downed);
  const safe=(x,y)=>threats.every(e=>Math.hypot(e.x-x,e.y-y)>(e.def.range+(e.rangeBonus||0)+T.flankClear)*TILE);
  const lineSafe=(x0,y0,x1,y1)=>{ const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/TILE)); for(let i=0;i<=n;i++){ if(!safe(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n)) return false; } return true; };
  const base=Math.atan2(goal.y-cy,goal.x-cx), first=Math.random()<0.5?1:-1;
  for(let off=T.flankOffset;off<=T.flankOffset+T.flankSearch;off+=3) for(const side of [first,-first]){
    const a=base+side*Math.PI/2, mx=(cx+goal.x)/2+Math.cos(a)*off*TILE, my=(cy+goal.y)/2+Math.sin(a)*off*TILE;
    const f=nearestWalkable(Math.floor(mx/TILE),Math.floor(my/TILE)); if(!f) continue; const vx=(f.x+.5)*TILE, vy=(f.y+.5)*TILE;
    if(safe(vx,vy)&&lineSafe(cx,cy,vx,vy)) return {x:vx,y:vy}; }
  return null; }
function waveTactic(out,forced){
  const us=out.filter(u=>u.order); if(us.length<(forced?3:TACTICS.minSize)) return 'direct';
  let r=Math.random(), plan='direct'; if(forced) plan=forced; else for(const [k,w] of Object.entries(TACTICS.weights)){ if(r<w){ plan=k; break; } r-=w; }
  if(plan==='lure'){
    const sorted=[...us].sort((a,b)=>b.def.speed-a.def.speed), bait=Math.max(2,Math.round(us.length*0.3));
    sorted.slice(bait).forEach(u=>{ u.waveDelay=TACTICS.lureDelay+rand(0,2); u.waveGoal={x:u.order.x,y:u.order.y}; u.order=null; u.path=null; });
    if(!G.saidLure){ G.saidLure=true; setTimeout(()=>{ if(G&&!G.over) say('Sgt. Kessler','Only a handful? Careful, that is bait. The rest are waiting.'); },4000); }
  } else if(plan==='flank'){
    const goal={x:us[0].order.x,y:us[0].order.y}, cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
    const via=flankPoint(cx,cy,goal); if(!via) return 'direct';   /* no way round out of their reach: straight in */
    us.filter((u,i)=>i%2===1).forEach(u=>{ u.viaGoal={x:u.order.x,y:u.order.y}; u.order={type:'move',x:via.x+rand(-30,30),y:via.y+rand(-30,30)}; setPath(u,u.order.x,u.order.y); });   /* move, not amove: they do not stop to fight on the way round */
    if(!G.saidFlank){ G.saidFlank=true; say('Dr. Maas','They are splitting up. Part of them is going around you!'); }
  }
  return plan;
}
/* ---------- a wave moves as a pack ----------
   The units of one wave (or of one part of it: the bait, the waiting rest, the flankers) march together at the pace of the slowest,
   and one that has run ahead waits for the others. Only when any of them is within PACK.contact tiles of the Lunar Corps
   (or fights one of them) is the pack let loose: then the fast ones storm ahead.
   PACK: contact = tiles to the enemy that let the pack loose · lead = tiles a unit may be ahead of the pack's middle before it waits
   · wait = share of the pace it walks at while it waits · every = seconds between two checks of a pack. */
const PACK = { contact:7, lead:2.5, wait:0.35, every:0.5 };
function makePacks(out){ const groups=new Map();
  for(const u of out){ if(!u.order&&!(u.waveDelay>0)) continue; const k=(u.viaGoal?1:0)+(u.waveDelay>0?2:0); if(!groups.has(k)) groups.set(k,{ members:[], t:-1 }); groups.get(k).members.push(u); }
  for(const P of groups.values()) if(P.members.length>1) for(const u of P.members) u.pack=P; }
function packUpdate(P){ if(G.time<P.t) return; P.t=G.time+PACK.every;
  const live=P.members.filter(u=>!u.dead&&u.pack===P&&u.role==='wave'&&!u.claim&&!u.haul); P.live=live.length;
  if(live.length<2){ P.contact=true; return; }
  P.slow=Math.min(...live.map(u=>u.def.speed*(u.speedMul||1))); P.cx=live.reduce((s,u)=>s+u.x,0)/live.length; P.cy=live.reduce((s,u)=>s+u.y,0)/live.length;
  const R=PACK.contact*TILE, foes=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&!e.def.scenery);
  P.contact=live.some(u=>(u.target&&u.target.faction==='corps')||foes.some(e=>Math.abs(e.x-u.x)<R&&Math.abs(e.y-u.y)<R&&Math.hypot(e.x-u.x,e.y-u.y)<R));
  if(P.contact) for(const u of P.members) if(u.pack===P) u.pack=null; }   /* let loose for good: from here every one fights on its own */
/* the pace a pack holds a unit to (0 = no limit) */
function packPace(u){ const P=u.pack; if(!P||u.role!=='wave'||u.target||u.claim||u.haul||u.waveDelay>0) return 0; packUpdate(P); if(P.contact||!u.pack) return 0;
  let pace=P.slow; const o=u.order;
  if(o&&o.x!=null&&Math.hypot(u.x-P.cx,u.y-P.cy)>PACK.lead*TILE&&Math.hypot(o.x-u.x,o.y-u.y)<Math.hypot(o.x-P.cx,o.y-P.cy)-PACK.lead*TILE) pace*=PACK.wait;   /* ahead of the others: wait for them */
  return pace; }
/* Called from swarmThink: waiting lure groups and flankers on their way to the side point. */
function tacticThink(u,dt){
  if(u.waveDelay>0){ u.waveDelay-=dt; if(u.waveDelay<=0&&u.waveGoal){ u.order={type:'amove',x:u.waveGoal.x,y:u.waveGoal.y}; setPath(u,u.order.x,u.order.y); u.waveGoal=null; } return true; }
  if(u.viaGoal && !u.target && (!u.order||Math.hypot(u.order.x-u.x,u.order.y-u.y)<2*TILE)){ u.order={type:'amove',x:u.viaGoal.x,y:u.viaGoal.y}; setPath(u,u.order.x,u.order.y); u.viaGoal=null; }
  return false;
}

/* ---------- a hive defends itself ----------
   Every hit makes it scream (at most once per `cooldown` seconds): it births an emergency brood that goes straight for the attacker.
   Below `helpAt` of its health it calls the other hives once, and they send a wave to it.
   Missions can make this fiercer with swarm.hiveRage (Hold Kappa: the hives there are not meant to be destroyed). */
const HIVE_DEFENCE = { cooldown:12, brood:45, helpAt:0.6, help:70, aggro:8, aggroBrood:45, aggroCooldown:18 };
function hiveScream(h,src){
  if(h.dead||G.time<(h.screamAt||0)) return; const D=G.diff, rage=hiveOpt(h,'rage',G.swarm.cfg.hiveRage||1);
  h.screamAt=G.time+HIVE_DEFENCE.cooldown*D.interval/Math.sqrt(rage);
  const out=hiveBrood(h,src,hiveOpt(h,'brood',HIVE_DEFENCE.brood)*D.budget*rage);
  if(out.length){ G.fx.push({k:'boom',x:h.x,y:h.y,t:0.35,max:0.35,r:28,col:'#a6ff4a'}); if(isVisible(h)) SFX.play('hatch',h.x,h.y);
    if(!G.saidScream && isVisible(h)){ G.saidScream=true; say('Dr. Maas','The hive is screaming. It is birthing defenders as fast as it can!'); } }
  if(!h.calledHelp && h.hp<h.maxHp*HIVE_DEFENCE.helpAt && hives().length>1){ h.calledHelp=true;
    const w=launchWave(HIVE_DEFENCE.help*D.budget*rage,{x:h.x,y:h.y}); if(w.length) say('Sgt. Kessler','The other hives heard that. Everything is converging on the nest you are hitting!','alert'); }
}

/* a setting for one hive: its own value (mission start.hives entry), else the mission's swarm value, else the default */
function hiveOpt(h,key,def){ if(h.cfg&&h.cfg[key]!=null) return h.cfg[key]; const c=G.swarm.cfg; if(c[key]!=null) return c[key]; return def; }
/* an emergency brood: biomass spent on fresh units that go straight for the target */
function hiveBrood(h,target,budget){ let left=budget, guard=0; const out=[], only=hiveOpt(h,'guards',null); if(swarmCount()>60) return out;   /* never a runaway swarm */
  while(left>=15 && guard++<20){ const type=pickSwarmType(left,only); if(!type) break; const u=spawnNearBuilding(type,'swarm',h); if(!u) break; left-=UNITS[type].biomass;
    u.role='hunt'; if(target&&target.kind==='unit'&&!target.dead){ u.target=target; u.order={type:'amove',x:target.x,y:target.y}; setPath(u,target.x,target.y); } out.push(u); }
  return out; }
/* A hive notices soldiers who come within its aggro radius (tiles × difficulty): its guards go for them and it births a brood.
   Then it waits aggroCooldown seconds before it can react to that again. aggro:0 makes a hive blind (it still screams when hit). */
function hiveWatch(h,dt){
  h.watchT=(h.watchT||0)-dt; if(h.watchT>0) return; h.watchT=0.5;
  const R=hiveOpt(h,'aggro',HIVE_DEFENCE.aggro)*(G.diff.aggro||1)*TILE; if(R<=0||G.time<(h.aggroAt||0)) return;
  const t=nearestOf(h,e=>e.kind==='unit'&&e.faction==='corps'&&!e.def.escort&&!e.downed&&!e.scent&&!veiled(e));   /* Hive Scent (Rogue): the hive does not notice him; nor a veiled one (Among Them) */ if(!t||dist(h,t)>R) return;
  const D=G.diff, rage=hiveOpt(h,'rage',G.swarm.cfg.hiveRage||1);
  h.aggroAt=G.time+hiveOpt(h,'aggroCooldown',HIVE_DEFENCE.aggroCooldown)*D.interval;
  for(const e of G.ents){ if(e.kind==='unit'&&!e.dead&&e.faction==='swarm'&&e.homeHive===h.id){ e.target=t; } }
  const out=hiveBrood(h,t,hiveOpt(h,'aggroBrood',HIVE_DEFENCE.aggroBrood)*D.budget*rage);
  if(out.length){ G.fx.push({k:'boom',x:h.x,y:h.y,t:0.35,max:0.35,r:24,col:'#a6ff4a'}); if(isVisible(h)) SFX.play('hatch',h.x,h.y);
    G.pings.push({x:h.x,y:h.y,t:0,col:'#a6ff4a'});
    if(!G.saidAggro){ G.saidAggro=true; say('Dr. Maas','The hive has noticed you. Keep your distance, or burn it down.','alert'); } }
}

/* ---------- the hunt: a Husk leads the Swarm to your soldiers (during play and after a defeat) ----------
   Every `every` seconds (afterEvery once the mission is lost), as long as soldiers live:
   - a full-grown Husk is told where the nearest soldiers are and leads the attack (THE HUNT); a fresh party from the nest
     nearest to him joins his war party (up to partyMax), so the last blow stays his;
   - idle hunters go looking for soldiers;
   - with no Husk about, a plain wave goes for a soldier.
   This comes on top of the mission's own waves. Each round is a little bigger (grow, up to growMax rounds).
   A mission can switch it off with swarm.hunt:false (the hunt after a defeat still runs), or tune it with swarm.hunt:{ every, budget, grow, growMax, … }. */
const HUNT_DEFAULT = { every:30, afterEvery:20, first:6, budget:40, afterBudget:60, grow:0.2, growMax:10, partyMax:8 };
function huntCfg(){ const h=G.swarm.cfg.hunt; return h&&typeof h==='object'?{...HUNT_DEFAULT,...h}:HUNT_DEFAULT; }
function swarmHunt(dt){ if(G.side!=='corps'||G.mission.training) return; const S=G.swarm, lost=afterDefeat(); if(!lost&&S.cfg.hunt===false) return;
  const HUNT=huntCfg();
  S.huntT=(S.huntT??(lost?HUNT.first:HUNT.every))-dt; if(S.huntT>0) return; S.huntT=lost?HUNT.afterEvery:HUNT.every;
  const corps=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.faction==='corps'&&!e.def.escort&&!e.def.ground&&!rogueHuntSkip(e)); if(!corps.length) return;   /* Rogue: a tainted one smells like the brood */
  const near=u=>{ let b=null, bd=Infinity; for(const e of corps){ const d=dist(u,e); if(d<bd){ bd=d; b=e; } } return b; };
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='swarm'||u.target||u.claim||u.haul||u.def.boss||u.def.grafter||u.def.founder) continue;
    if(!(u.role==='hunt'||u.role==='wave')||(u.order&&u.order.type==='amove')) continue; const t=near(u); u.order={type:'amove',x:t.x,y:t.y}; setPath(u,t.x,t.y); }
  const n=S.huntN=(S.huntN||0)+1, budget=(lost?HUNT.afterBudget:HUNT.budget)*(1+HUNT.grow*Math.min(n,HUNT.growMax))*G.diff.budget;
  const husk=G.ents.filter(e=>huskHunter(e)).sort((a,b)=>dist(a,near(a))-dist(b,near(b)))[0];
  if(husk){ const t=near(husk); if(!husk.target){ husk.order={type:'amove',x:t.x,y:t.y}; setPath(husk,t.x,t.y); }
    if(escortsOf(husk).length<HUNT.partyMax&&nests().length&&roamCount()<swarmCap()) for(const u of launchWave(budget,husk)) joinEscort(u,husk);   /* they gather round the Husk and go in with him */
    if(isVisible(husk)){ G.fx.push({k:'text',x:husk.x,y:husk.y-48,t:1.4,max:1.4,txt:'THE HUNT',col:'#ff5a4f'});
      if(!G.saidHunt){ G.saidHunt=true; say('Dr. Maas','The Husk is calling the brood to it. They are coming for us, and they are leaving the kill to it.','alert'); } } }
  else if(roamCount()<swarmCap()) launchWave(budget,pick(corps)); }
