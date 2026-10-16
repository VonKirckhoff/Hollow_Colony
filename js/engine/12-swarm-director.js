'use strict';
/* ---------- 2k. the Swarm director ---------- */
function swarmTypes(){ return Object.keys(UNITS).filter(k=>UNITS[k].faction==='swarm' && UNITS[k].weight && G.time>=((G.swarm.cfg.unlock||{})[k] ?? UNITS[k].unlock ?? 0)); }
function pickSwarmType(maxCost){ const opts=swarmTypes().filter(k=>UNITS[k].biomass<=maxCost); if(!opts.length) return null;
  let tot=opts.reduce((s,k)=>s+UNITS[k].weight,0), r=Math.random()*tot; for(const k of opts){ r-=UNITS[k].weight; if(r<=0) return k; } return opts[0]; }
function swarmCount(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss).length; }
function hives(){ return G.ents.filter(e=>e.type==='hive'&&!e.dead); }
function updateSwarm(dt){
  const S=G.swarm, cfg=S.cfg, hs=hives();
  if(!hs.length){ if(cfg.burrows && cfg.waves && G.time>=S.nextWave && swarmCount()<=14*G.diff.budget){ S.waveN++; launchWave((cfg.waves.budget+cfg.waves.growth*(S.waveN-1))*G.diff.budget); S.nextWave=G.time+cfg.waves.every*G.diff.interval; } return; }
  S.biomass+=cfg.rate*hs.length*dt;
  for(const h of hs){
    h.spawnT-=dt; if(h.spawnT>0) continue; h.spawnT=cfg.guardEvery*rand(0.8,1.2);
    const guards=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.homeHive===h.id&&e.role==='guard').length;
    if(guards>=cfg.guardMax) continue;
    const type=pickSwarmType(S.biomass); if(!type) continue;
    S.biomass-=UNITS[type].biomass;
    const u=spawnNearBuilding(type,'swarm',h); if(!u) continue;
    u.role='guard'; u.homeHive=h.id; u.guardAt={x:h.x,y:h.y}; u.order={type:'guard',x:h.x,y:h.y,wait:0};
  }
  if(cfg.waves && G.time>=S.nextWave){
    S.waveN++; launchWave((cfg.waves.budget+cfg.waves.growth*(S.waveN-1))*G.diff.budget);
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
  let hs=hives(); const out=[]; let left=budget, guard=0;
  if(!hs.length){
    const spot=burrowSpot(aim); if(!spot) return [];
    const types=[]; while(left>=15 && guard++<80){ const type=pickSwarmType(left); if(!type) break; left-=UNITS[type].biomass; types.push(type); }
    const tiles=freeTilesNear(spot.x,spot.y,types.length);
    types.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); u.role='wave'; out.push(u);
      for(let j=0;j<6;j++) G.fx.push({k:'ember',x:u.x+rand(-10,10),y:u.y+rand(-4,6),vx:rand(-50,50),vy:rand(-80,-20),t:0.7,max:0.7,col:'#8a7a6a'}); });
    addDecal((spot.x+.5)*TILE,(spot.y+.5)*TILE,22,'rgba(30,26,22,.6)');
    if(out.length && !G.burrowWarned){ G.burrowWarned=true; say('Dr. Maas','With the hives gone they are burrowing up through the ground. Watch every direction!'); }
  } else {
    if(aim) hs=[...hs].sort((a,b)=>dist(a,aim)-dist(b,aim)).slice(0,2);   // aimed waves come from the nearest hives
    while(left>=15 && guard++<80){ const type=pickSwarmType(left); if(!type) break; left-=UNITS[type].biomass;
      const u=spawnNearBuilding(type,'swarm',pick(hs)); if(u){ u.role='wave'; out.push(u); } }
  }
  for(const u of out){ const t=aim || nearestOf(u,e=>e.faction==='corps'&&e.kind==='building'&&!e.def.ground) || nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit');
    if(t){ u.order={type:'amove',x:t.x+rand(-30,30),y:t.y+rand(-30,30)}; setPath(u,u.order.x,u.order.y); } }
  if(out.length){ SFX.play('horn'); say('Alert','Swarm movement detected. A wave is coming.','alert'); }
  return out;
}
