'use strict';
/* ---------- 2n. main update ---------- */
function update(dt){
  G.time+=dt;
  if(G.shake) G.shake=Math.max(0,G.shake-dt);
  updatePools(dt); updateAnims(dt); updateFlares(dt); updateBarks(dt); updateAura(dt); updateBodies(dt); updateCreep(dt); updateHatchery(dt); updateTunnels(dt); if(G.side==='swarm'){ batchesTick(dt); swarmMissionTick(dt); } updateCorpsAI(dt); marchFormations(dt);   /* the guide of every squad marching in formation */
  for(let i=0;i<G.ents.length;i++){ const e=G.ents[i]; if(e.dead) continue; if(e.kind==='unit') updateUnit(e,dt); else if(e.kind==='building') updateBuilding(e,dt); }
  separate();
  for(const s of G.shots){ s.t+=dt; if(s.t<0&&s.k==='acid'&&s.src&&s.src.dead){ s.done=true; continue; }   /* the Spitter died while it swelled up: no acid */
    if(s.t>=s.dur){ s.done=true; if(s.k==='egglob'){ eggLanded(s); continue; } if(s.k==='broodlob'){ layEgg(s.tx,s.ty,s.type); continue; }   /* an egg the Matron flung into your ranks */
      for(const e of G.ents){ if(e.dead||e.kind==='crate'||!hostile(s.faction,e.faction)) continue; if(Math.hypot(e.x-s.tx,e.y-s.ty)<=s.splash+e.r*0.5){ damage(e,s.dmg,s.src&&!s.src.dead?s.src:{faction:s.faction,dead:true}); if(s.k==='acid'&&e.kind==='unit'&&e.faction==='corps') e.acidT=ANIM.acid; } }   /* acid eats into the armour */
      if(s.k==='grenade'){ SFX.play('boom',s.tx,s.ty); G.fx.push({k:'boom',x:s.tx,y:s.ty,t:0.45,max:0.45,r:s.splash}); addDecal(s.tx,s.ty,s.splash*0.5,'rgba(10,10,12,.55)'); G.shake=Math.max(G.shake||0,0.25); debrisBurst(s.tx,s.ty,12,['#8a7a6a','#5a4632','#b3a58f']);
        for(let i=0;i<14;i++) G.fx.push({k:'ember',x:s.tx,y:s.ty,vx:rand(-140,140),vy:rand(-160,10),t:rand(.3,.7),max:.7,col:pick(['#ff8a2a','#ffd23f','#ffffff'])}); continue; }
      if(s.pool) G.pools.push({x:s.tx,y:s.ty+3,r:SQUAD.acid.poolR*1.8,t:s.pool,max:s.pool,seed:Math.random()*10});   /* the Matron's acid rain: pools that burn a long time */
      const pl=s.k==='plasma'; if(!pl){ SFX.play('splat',s.tx,s.ty); addDecal(s.tx,s.ty,10,'rgba(120,220,40,.4)'); } for(let i=0;i<6;i++) G.fx.push({k:'spark',x:s.tx,y:s.ty,vx:rand(-60,60),vy:rand(-80,0),t:0.35,max:0.35,col:pl?'#7ff6ff':'#a6ff4a'}); } }
  G.shots=G.shots.filter(s=>!s.done);
  for(const f of G.fx){ f.t-=dt; if(f.k==='hivedeath') hiveDeathTick(f); if(f.vx!==undefined&&!f.rest&&f.k!=='debris'){ f.x+=f.vx*dt; f.y+=f.vy*dt; if(f.k==='dust'){ f.vx*=0.93; f.vy*=0.93; } else if(f.k!=='flame'){ f.vy+=180*dt; } else { f.vx*=0.94; f.vy*=0.94; } } }
  G.fx=G.fx.filter(f=>f.t>0);
  for(const p of G.pings) p.t+=dt; G.pings=G.pings.filter(p=>p.t<3);
  // crates
  relicTick(dt); rogueTick(dt); ospreyTick(dt);
  for(const c of G.ents){ if(c.kind!=='crate'||c.dead||c.relic||c.rogue) continue;   /* c.rogue: samples and caches (31-rogue.js) */
    if(c.supply){ supplyPickup(c); continue; }   /* a flown-in structure: only an Engineer takes it */
    for(const u of G.ents){ if(u.kind==='unit'&&!u.dead&&u.faction==='corps'&&dist(u,c)<u.r+12){ c.dead=true; G.salvage+=c.value; G.stats.crates++; SFX.play('pickup'); G.fx.push({k:'text',x:c.x,y:c.y-10,t:1.2,max:1.2,txt:'+'+c.value,col:'#ffb347'}); break; } } }
  if(G.ents.some(e=>e.dead)) G.ents=G.ents.filter(e=>!e.dead);
  updateSwarm(dt); swarmHunt(dt);   /* a Husk leads the Swarm to your soldiers (and after a defeat, the Swarm hunts down the rest) */
  G.fogT-=dt; if(G.fogT<=0){ G.fogT=0.15; computeFog(); }
  G.rescueT=(G.rescueT||0)-dt; if(G.rescueT<=0){ G.rescueT=2; rescueTrapped(); }
  G.trigT-=dt; if(G.trigT<=0){ G.trigT=0.25; runTriggers(); }
  if(G.demo) updateDemo(dt);   /* Watch mode: the training plays itself (27b-demo.js) */
}
