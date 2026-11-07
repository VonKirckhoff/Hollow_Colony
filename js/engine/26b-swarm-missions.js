'use strict';
/* ---------- 2w-b. tools for the Swarm campaign missions (04–08) ----------
   Light (mission.lightBlind, Lights Out): a running generator lights its streets, and light hurts the Brood. A Swarm creature in the
     light of a running generator is blinded: it moves at SWARM_LIGHT.slow and bites at SWARM_LIGHT.dmg. In the dark (mission.dark)
     the Brood sees the lit streets from afar (light is easy to see).
   Scorch (Seed the Moon): scorchAt(x,y,r,delay) marks a circle on the ground; after `delay` seconds it burns: every Swarm creature
     inside takes SWARM_SCORCH.unit damage, every hive SWARM_SCORCH.hive (× its max health), eggs and cocoons burn away.
   Mission helpers: corpsMendGenerators (Engineers go out to restart a dead generator, with an escort),
     corpsRetake (soldiers go back for a lost beacon), colonistBodies (bodies already lying on the map at the start). */
const SWARM_LIGHT = { slow:0.75, dmg:0.7 };
const SWARM_SCORCH = { unit:400, hive:0.9, warn:15 };
function inGeneratorLight(u){ for(const e of G.ents){ if(e.dead||!e.def||!e.def.generator||!e.powered) continue; if(Math.hypot(e.x-u.x,e.y-u.y)<e.def.light*TILE*0.9) return true; } return false; }
function swarmLightTick(dt){ if(!G.mission.lightBlind) return; G.lightT=(G.lightT||0)-dt; if(G.lightT>0) return; G.lightT=0.25;
  let any=false; for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='swarm') continue; const lit=inGeneratorLight(u); u.blindT=lit?0.5:0; if(lit&&u.mine) any=true; }
  if(any&&!G.vars.saidLight){ G.vars.saidLight=true; say('The Brood','The light burns our eyes. In it we are slow and clumsy. Put the light out.','swarm'); } }
/* scorch zones */
function scorchAt(x,y,r,delay){ (G.scorch=G.scorch||[]).push({x,y,r,t:delay??SWARM_SCORCH.warn,max:delay??SWARM_SCORCH.warn}); G.pings.push({x,y,t:0,col:'#ff5a4f'}); SFX.play('alarm',x,y); }
function scorchTick(dt){ if(!G.scorch||!G.scorch.length) return;
  for(const z of G.scorch){ z.t-=dt; if(z.t>0||z.done) continue; z.done=true; z.burnT=1.2;
    for(const e of G.ents){ if(e.dead||Math.hypot(e.x-z.x,e.y-z.y)>z.r) continue;
      if(e.kind==='unit'&&e.faction==='swarm'&&!e.hidden) damage(e,SWARM_SCORCH.unit,null);
      else if(e.type==='hive') damage(e,e.maxHp*SWARM_SCORCH.hive,null);
      else if(e.type==='egg'||e.type==='cocoon') { e.hp=0; kill(e,null); } }
    for(let i=0;i<40;i++){ const a=rand(0,Math.PI*2), rr=rand(0,z.r); G.fx.push({k:'ember',x:z.x+Math.cos(a)*rr,y:z.y+Math.sin(a)*rr,vx:rand(-30,30),vy:rand(-120,-40),t:1,max:1,col:i%2?'#ff8a2a':'#ffd23f'}); }
    addDecal(z.x,z.y,z.r*0.9,'rgba(20,12,8,.55)'); SFX.play('boom',z.x,z.y); }
  for(const z of G.scorch) if(z.done) z.burnT-=dt;
  G.scorch=G.scorch.filter(z=>!z.done||z.burnT>0); }
function drawScorch(now){ if(!G.scorch) return; for(const z of G.scorch){ ctx.save();
    if(!z.done){ const k=1-z.t/z.max, p=0.5+0.5*Math.sin(now/(z.t<4?60:160)); ctx.fillStyle=`rgba(255,90,40,${0.06+0.12*k*p})`; ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.92,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=`rgba(255,90,40,${0.5+0.4*p})`; ctx.lineWidth=2; ctx.setLineDash([8,6]); ctx.lineDashOffset=-now/50; ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.92,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(`SCORCH ${Math.ceil(z.t)}`,z.x+1,z.y-z.r*0.92-5); ctx.fillStyle='#ff8a2a'; ctx.fillText(`SCORCH ${Math.ceil(z.t)}`,z.x,z.y-z.r*0.92-6); }
    else { ctx.fillStyle=`rgba(255,160,60,${0.5*z.burnT})`; ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.92,0,0,Math.PI*2); ctx.fill(); }
    ctx.restore(); } }
function swarmMissionTick(dt){ swarmLightTick(dt); scorchTick(dt); }
/* Lunar Corps: an Engineer (with an escort of `guard` soldiers) goes out to restart every dead generator; one per generator */
function corpsMendGenerators(g,guard){ const gens=G.ents.filter(e=>!e.dead&&e.def&&e.def.generator&&!e.camp);
  for(const gen of gens){ if(gen.powered){ gen.mender=null; continue; } if(gen.mender&&!gen.mender.dead&&!gen.mender.downed) continue;
    const eng=g.corps().filter(u=>u.def.builder&&!u.downed&&!G.ents.some(o=>o.mender===u)).sort((a,b)=>dist(a,gen)-dist(b,gen))[0]; if(!eng) continue;
    gen.mender=eng; eng.stance=null; eng.target=null; eng.order={type:'repair',target:gen}; eng.path=null;
    const esc=g.corps().filter(u=>!u.def.builder&&!u.def.heal&&!u.downed&&!u.guarding&&dist(u,eng)<14*TILE).sort((a,b)=>dist(a,eng)-dist(b,eng)).slice(0,guard||2);
    for(const s of esc){ s.guarding=gen; s.target=null; s.order={type:'amove',x:gen.x+rand(-40,40),y:gen.y+rand(-40,40)}; setPath(s,s.order.x,s.order.y); s.home={x:s.order.x,y:s.order.y}; }
    say('Intercept · Lunar Corps',`${gen.label||'Generator'} is down. Engineer, get it running again.`,'sys'); } }
/* Lunar Corps: soldiers near the base go back for a beacon the Swarm took */
function corpsRetake(g,beacon,n){ const team=g.corps().filter(u=>!u.def.builder&&!u.downed&&!u.retaking).sort((a,b)=>dist(a,beacon)-dist(b,beacon)).slice(0,g.n(n));
  for(const u of team){ u.retaking=beacon; u.target=null; u.order={type:'amove',x:beacon.x+rand(-30,30),y:beacon.y+rand(-30,30)}; setPath(u,u.order.x,u.order.y); u.home={x:u.order.x,y:u.order.y}; }
  return team; }
/* bodies already lying on the map at the start (colonists): {x,y} tile points; they look like soldiers of `type` */
function colonistBodies(pts,type){ for(const p of pts){ const f=nearestWalkable(p.x,p.y); if(!f) continue; makeBody({ x:(f.x+.5)*TILE, y:(f.y+.5)*TILE, def:UNITS[type||'engineer'], face:Math.random()<0.5?1:-1 }); const b=G.ents[G.ents.length-1]; b.colonist=true; b.def={name:'Fallen colonist'}; } }
