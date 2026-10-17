'use strict';
/* ---------- 2h. unit behaviour ---------- */
function updateUnit(u,dt){
  const d=u.def;
  u.cd-=dt; u.flash=Math.max(0,u.flash-dt); u.lunge=Math.max(0,(u.lunge||0)-dt); u.moving=false; u.anim+=dt; u.beam=null;
  if(d.passive){ wildThink(u,dt); return; }
  if(d.escort){ escortThink(u,dt); return; }
  if(d.cloak && greyThink(u,dt)) return;
  if(d.boss) bossThink(u,dt);
  if(u.faction==='swarm') swarmThink(u,dt);
  if(d.heal){ medicThink(u,dt); return; }
  if(d.builder && !u.order){ u.repScan=(u.repScan||0)-dt; if(u.repScan<=0){ u.repScan=0.5;
      // Idle engineers repair damaged structures (and finish construction sites) nearby on their own.
      const b=nearestOf(u,e=>e.kind==='building'&&!e.def.noBlock&&e.faction===u.faction&&(e.hp<e.maxHp||(e.kind==='building'&&!e.built))&&dist(u,e)<d.autoRepair*TILE);
      if(b){ u.order={type:'repair',target:b,auto:true}; u.target=null; u.path=null; u.goal=null; } } }
  if(d.builder && u.order && (u.order.type==='build'||u.order.type==='repair'||u.order.type==='pack')){ builderThink(u,dt); return; }
  let o=u.order;
  if(o && o.type==='attack' && !validTarget(u,o.target,true)){ u.order=o=null; u.target=null; }
  const explicit = !!(o && o.type==='attack');
  if(o && o.type==='move') u.target=null;
  if(u.target && !validTarget(u,u.target,explicit)) u.target=null;
  // Priority rule: enemy units that can fight back always come before structures.
  if(!o || o.type!=='move'){ u.acq-=dt; if(u.acq<=0){ u.acq=0.25+Math.random()*0.1;
      const hold=o&&o.type==='hold';
      const cur=u.target, curD=cur ? dist(u,cur)-cur.r : Infinity, inRange=curD<=d.range*TILE+8;
      const r = hold ? d.range+0.3 : explicit ? d.range+1.5 : d.sight;
      if(!cur || cur.kind!=='unit' || cur.def.boss || !inRange){
        const tu=findTarget(u,r,true);
        if(tu){ if(!cur && u.faction==='corps') SFX.play('contact',u.x,u.y); u.target=tu; }
        else if(explicit) u.target=o.target;
        else if(!cur || !inRange){ const tb=findTarget(u,r); if(tb) u.target=tb; else if(!cur) u.target=null; }
      } } }
  if(!u.target && explicit) u.target=o.target;
  if(u.target){
    engage(u,dt,o&&o.type==='hold');
    const anchor=u.home||u.guardAt;
    if(!o && anchor && Math.hypot(u.x-anchor.x,u.y-anchor.y)>9*TILE){ u.target=null; u.order={type:'move',x:anchor.x,y:anchor.y}; setPath(u,anchor.x,anchor.y); }
    else if(o && o.type==='guard' && Math.hypot(u.x-o.x,u.y-o.y)>11*TILE){ u.target=null; setPath(u,o.x,o.y); }
    return;
  }
  if(!o) return;
  if((o.type==='move'||o.type==='amove') && !u.path){ setPath(u,o.x,o.y); }
  if(o.type==='move'||o.type==='amove'){ if(stepMove(u,dt)){ u.order=null; if(u.faction==='corps') u.home={x:u.x,y:u.y}; } }
  else if(o.type==='guard'){ if(stepMove(u,dt)){ o.wait=(o.wait||0)-dt; if(o.wait<=0){ o.wait=rand(3,8); const a=rand(0,Math.PI*2), r=rand(1,3.5)*TILE; setPath(u,o.x+Math.cos(a)*r,o.y+Math.sin(a)*r); } } }
}
function engage(u,dt,hold){
  const t=u.target, d=u.def;
  const reach=d.range*TILE + t.r + u.r*0.5, dd=dist(u,t);
  if(Math.abs(t.x-u.x)>2) u.face=t.x>=u.x?1:-1;
  if(dd<=reach){ u.path=null; u.goal=null; if(u.cd<=0) fire(u,t); }
  else if(hold){ u.target=null; }
  else goTo(u,t.x,t.y,dt,0.5);
}
function swarmThink(u,dt){
  u.think=(u.think||0)-dt; if(u.think>0) return; u.think=0.8+Math.random()*0.4;
  if(u.role==='guard'||u.role==='boss'){ if(!u.order && !u.target && u.guardAt) u.order={type:'guard',x:u.guardAt.x,y:u.guardAt.y,wait:0}; return; }
  if((u.role==='hunt'||u.role==='wave') && !u.target && (!u.order||u.order.type!=='amove')){
    const t=nearestOf(u,e=>e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&e.type!=='door');   // blast doors are scenery, not prey
    if(t){ u.order={type:'amove',x:t.x,y:t.y}; setPath(u,t.x,t.y); }
  }
}
function nearestOf(from,filter){ let best=null, bd=Infinity; for(const e of G.ents){ if(e.dead||!filter(e)) continue; const d=dist(from,e); if(d<bd){ bd=d; best=e; } } return best; }
/* The Brood Mother: wakes when your troops come close, lays eggs, sprays acid, calls her brood at
   75/50/25% health (and gets faster each time) and regenerates when nobody has hurt her for a while. */
function layEgg(x,y,type){ const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE); if(!walkableT(tx,ty)) return;
  const c=makeBuilding('cocoon','swarm',tx,ty,true); c.x=x; c.y=y; c.r=9; c.hatchT=4; c.hatchType=type; }
function bossThink(u,dt){
  const d=u.def, S=u.bossState||(u.bossState={eggT:6,spitT:4,phase:0,calm:99});
  S.calm+=dt; if(S.calm>8 && u.hp<u.maxHp){ u.hp=Math.min(u.maxHp,u.hp+d.regen*dt); if(Math.random()<dt*2) G.fx.push({k:'text',x:u.x+rand(-20,20),y:u.y-60,t:0.8,max:0.8,txt:'+',col:'#a6ff4a'}); }
  const foes=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind!=='crate'&&!e.def.ground&&dist(e,u)<9*TILE);
  if(!u.awake){ if(foes.length){ u.awake=true; SFX.play('horn'); } else return; }
  if(!foes.length){ u.speedMul=1; return; }
  // mostly rooted while she spits and lays eggs; every few seconds she charges into the nearest group
  S.chargeT=(S.chargeT??6)-dt;
  if(S.chargeT<=0){ S.charge=d.chargeTime; S.chargeT=d.chargeEvery*(S.phase>=2?0.75:1); SFX.play('squelch',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'CHARGE!',col:'#ff5a4f'}); }
  if(S.charge>0){ S.charge-=dt; u.speedMul=d.chargeSpeed; if(Math.random()<dt*20) G.fx.push({k:'ember',x:u.x+rand(-30,30),y:u.y+rand(-4,8),vx:rand(-30,30),vy:rand(-40,-10),t:0.5,max:0.5,col:'#6b5a7a'}); }
  else u.speedMul=d.rootSpeed;
  S.eggT-=dt; if(S.eggT<=0){ S.eggT=d.eggEvery*(S.phase>=2?0.7:1); const types=S.phase>=2?['drone','crawler']:['crawler'];
    for(let i=0;i<d.eggs;i++){ const a=rand(0,Math.PI*2), r=rand(1.5,3)*TILE; layEgg(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r,pick(types)); } SFX.play('hatch',u.x,u.y); }
  S.spitT-=dt; if(S.spitT<=0){ S.spitT=d.spitEvery; for(let i=0;i<d.spit;i++){ const t=pick(foes); const sx=u.x+u.face*40, sy=u.y-40, tx=t.x+rand(-24,24), ty=t.y+rand(-24,24);
      G.shots.push({k:'acid',sx,sy,tx,ty,t:-i*0.12,dur:Math.hypot(tx-sx,ty-sy)/260+0.2,src:u,dmg:d.spitDamage,splash:0.8*TILE,faction:u.faction}); } SFX.play('spit',u.x,u.y); }
  const th=[0.75,0.5,0.25];
  if(S.phase<3 && u.hp/u.maxHp<th[S.phase]){ S.phase++; u.enrage=1+0.15*S.phase; SFX.play('horn');
    G.fx.push({k:'boom',x:u.x,y:u.y-20,t:0.6,max:0.6,r:90,col:'#a6ff4a'});
    const tile={x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)}; const n=2+S.phase;
    const types=S.phase>=3?['brute','drone','drone']:S.phase>=2?['spitter','drone','crawler']:['crawler','crawler','drone'];
    freeTilesNear(tile.x,tile.y,n+6).slice(6).forEach(s=>{ const m=makeUnit(pick(types),'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); m.role='hunt'; }); }
}
function escortThink(u,dt){
  const o=u.order;
  if(o && (o.type==='move'||o.type==='amove')){ if(!u.path) setPath(u,o.x,o.y); if(stepMove(u,dt)){ u.order=null; } return; }
  if(o && o.type==='hold') return;
  u.order=null; u.follT=(u.follT||0)-dt;
  if(u.follT<=0){ u.follT=0.5; u.lead=nearestOf(u,e=>e.kind==='unit'&&e.faction===u.faction&&!e.def.escort&&e.def.damage&&dist(e,u)<12*TILE); }
  if(u.lead && !u.lead.dead && dist(u,u.lead)>1.8*TILE) goTo(u,u.lead.x,u.lead.y,dt,0.6);
}
/* The Grey hunter: cloaked, picks the strongest prey, and slips away when badly hurt. */
function greyThink(u,dt){
  u.revealT=Math.max(0,(u.revealT||0)-dt);
  if(u.retreating){ u.target=null; u.revealT=0; if(!u.order){ const e=u.escape||u.spawnAt; u.order={type:'move',x:e.x,y:e.y}; setPath(u,e.x,e.y); }
    if(stepMove(u,dt)){ u.dead=true; if(G.sel.includes(u)){ G.sel=G.sel.filter(x=>x!==u); G.selDirty=true; } } return true; }
  if(!u.spawnAt) u.spawnAt={x:u.x,y:u.y};
  if(u.hp<u.maxHp*u.def.retreatAt){ u.retreating=true; u.order=null; u.path=null; G.fx.push({k:'boom',x:u.x,y:u.y,t:0.4,max:0.4,r:20,col:'#7ff6ff'}); return true; }
  if(nearestOf(u,e=>e.kind==='unit'&&e.faction==='corps'&&dist(e,u)<2.5*TILE)) u.revealT=Math.max(u.revealT,0.4);
  u.huntT=(u.huntT||0)-dt;
  if(u.huntT<=0){ u.huntT=1.5;
    let best=null, bs=-Infinity; for(const e of G.ents){ if(e.dead||e.kind!=='unit'||e.faction!==(u.prey||'corps')) continue; const s=e.maxHp-dist(u,e)/6; if(s>bs){ bs=s; best=e; } }
    if(best && (!u.order||u.order.type!=='attack'||u.order.target!==best)){ u.order={type:'attack',target:best}; u.target=best; u.path=null; } }
  return false;
}
function wildThink(u,dt){
  u.flash=Math.max(0,u.flash-dt);
  if(u.order){ if(stepMove(u,dt)) u.order=null; return; }
  u.wait=(u.wait||rand(2,6))-dt;
  if(u.wait<=0){ u.wait=rand(4,9); const h=u.home||{x:u.x,y:u.y}; const a=rand(0,Math.PI*2), r=rand(0.5,3)*TILE; u.order={type:'move',x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r}; setPath(u,u.order.x,u.order.y); }
}
const HP_ZONES={ red:0.25, orange:0.5 };
function hpZone(e){ const f=e.hp/e.maxHp; return f<=HP_ZONES.red?0:f<=HP_ZONES.orange?1:2; }
const hpColor=f=>f<=HP_ZONES.red?'#ff5a4f':f<=HP_ZONES.orange?'#ff9a3c':'#5fe3b0';
function medicThink(u,dt){
  const d=u.def; u.healT=(u.healT||0)-dt;
  const ok=t=>t&&!t.dead&&t.hp<t.maxHp&&t!==u&&dist(u,t)<d.sight*TILE;
  // Triage: red patients first. Once a patient is out of the red and someone else is still in the red,
  // move on to them; then orange, then top up the rest.
  if(u.healT<=0){ u.healT=0.3;
    const R=(u.order&&u.order.type==='move'?d.healRange:d.sight)*TILE;
    const cands=G.ents.filter(e=>e.kind==='unit'&&!e.dead&&e.faction===u.faction&&e.def.bio&&e!==u&&e.hp<e.maxHp&&dist(u,e)<R);
    if(cands.length){ const worst=Math.min(...cands.map(hpZone)); const cur=ok(u.healTarget)?u.healTarget:null;
      if(!cur || hpZone(cur)>worst) u.healTarget=cands.filter(e=>hpZone(e)===worst).reduce((a,b)=>dist(u,a)<=dist(u,b)?a:b); }
    else if(!ok(u.healTarget)) u.healTarget=null; }
  const t=ok(u.healTarget)?u.healTarget:null;
  const inRange = t && dist(u,t) <= d.healRange*TILE;
  if(inRange){ const hh=Math.min(t.maxHp-t.hp,d.heal*(u.dmgMul||1)*dt); t.hp+=hh; if(u.vet){ u.vet.healed=(u.vet.healed||0)+hh; u.vet.hb=(u.vet.hb||0)+hh; if(u.vet.hb>=VET_XP.healPerXp){ u.vet.hb-=VET_XP.healPerXp; gainXP(u,1); } } u.beam=t; SFX.play('heal',u.x,u.y); if(Math.abs(t.x-u.x)>2) u.face=t.x>u.x?1:-1;
    if(Math.random()<dt*3) G.fx.push({k:'text',x:t.x+rand(-6,6),y:t.y-14,t:0.7,max:0.7,txt:'+',col:'#7dffbf'}); }
  if(u.order && u.order.type==='attack') u.order={type:'support',squad:G.ents.filter(e=>e.kind==='unit'&&e.faction===u.faction&&!e.dead&&!e.def.heal&&dist(e,u)<6*TILE)};
  if(u.order && u.order.type==='support'){
    const squad=(u.order.squad||[]).filter(alive);
    if(t){ if(!inRange) goTo(u,t.x,t.y,dt,0.5); return; }
    const lead=squad.length ? squad.reduce((a,b)=>dist(u,a)<dist(u,b)?a:b) : null;
    if(!lead){ u.order=null; u.home={x:u.x,y:u.y}; return; }
    if(dist(u,lead)>2*TILE) goTo(u,lead.x,lead.y,dt,0.6);
    return; }
  if(u.order && (u.order.type==='move'||u.order.type==='amove')){ if(!u.path) setPath(u,u.order.x,u.order.y); if(stepMove(u,dt)){ u.order=null; u.home={x:u.x,y:u.y}; } return; }
  if(t && !inRange) goTo(u,t.x,t.y,dt,0.6);
  else if(!t && u.home && Math.hypot(u.x-u.home.x,u.y-u.home.y)>2*TILE) goTo(u,u.home.x,u.home.y,dt);
}
function builderThink(u,dt){
  const o=u.order, d=u.def;
  if(o.type==='pack'){ // fold up a portable turret and carry it
    const s=o.target; if(!alive(s)||!s.built||!s.def.portable||u.carry){ u.order=null; return; }
    if(dist(u,s)>s.size*TILE/2+u.r+18){ goTo(u,s.x,s.y,dt); return; }
    u.path=null; if(Math.abs(s.x-u.x)>2) u.face=s.x>u.x?1:-1; o.t=(o.t||0)+dt; s.packing=o.t/d.packTime;
    SFX.play('wrench',s.x,s.y); if(Math.random()<dt*8) G.fx.push({k:'spark',x:s.x+rand(-8,8),y:s.y+rand(-8,8),vx:rand(-50,50),vy:rand(-70,-10),t:0.3,max:0.3,col:'#ffe2a8'});
    if(o.t>=d.packTime){ u.carry={type:s.type,hp:s.hp}; s.dead=true; setBlock(s,0); if(G.sel.includes(s)) G.sel=G.sel.filter(x=>x!==s); SFX.play('ready'); u.order=null; u.home={x:u.x,y:u.y}; G.selDirty=true; }
    return; }
  if(o.type==='build' && !o.site){
    const bd=BUILDINGS[o.btype], cx=(o.tx+bd.size/2)*TILE, cy=(o.ty+bd.size/2)*TILE;
    if(Math.hypot(u.x-cx,u.y-cy) <= bd.size*TILE/2+u.r+18){
      if(o.deploy && fielded(o.btype)>=limitOf(o.btype)){ toast(limitMsg(o.btype)); u.order=null; return; }
      if(!canPlace(o.btype,o.tx,o.ty,true)){ if(!o.deploy) G.salvage+=bd.cost; toast('Construction site is blocked.'); u.order=null; return; }
      if(o.deploy && !u.carry){ u.order=null; return; }
      const site=makeBuilding(o.btype,'corps',o.tx,o.ty,false);
      if(o.deploy){ site.deploy=true; site.carryHp=u.carry.hp; site.hp=u.carry.hp*0.3; u.carry=null; G.selDirty=true; }
      for(const e of G.ents) if(e.kind==='unit'&&!e.dead&&!walkableP(e.x,e.y)){ const f=nearestWalkable(Math.floor(e.x/TILE),Math.floor(e.y/TILE)); if(f){ e.x=(f.x+.5)*TILE; e.y=(f.y+.5)*TILE; } }
      u.order={type:'repair',target:site}; return;
    }
    goTo(u,cx,cy,dt); return;
  }
  const b=o.target;
  const done=b&&(b.kind==='unit'||b.built);
  if(!alive(b) || (done && b.hp>=b.maxHp)){ u.order=null; u.home={x:u.x,y:u.y}; return; }
  const reach=(b.size||1)*TILE/2+u.r+18;
  if(dist(u,b)>reach){ goTo(u,b.x,b.y,dt); return; }
  u.path=null; if(Math.abs(b.x-u.x)>2) u.face=b.x>u.x?1:-1;
  u.anim+=dt*2; SFX.play(done?'wrench':'weld',b.x,b.y);
  if(Math.random()<dt*8) G.fx.push({k:'spark',x:b.x+rand(-b.r,b.r)*0.6,y:b.y+rand(-b.r,b.r)*0.6,vx:rand(-50,50),vy:rand(-70,-10),t:0.3,max:0.3,col:'#ffe2a8'});
  if(!done){
    const bd=b.def;
    if(b.deploy){ b.progress+=dt/bd.deployTime; b.hp=b.carryHp*(0.3+0.7*Math.min(1,b.progress)); }
    else { b.progress+=dt/bd.buildTime; b.hp=Math.min(b.maxHp,b.hp+bd.hp*0.9*dt/bd.buildTime); }
    if(b.progress>=1){ b.built=true; b.progress=1; if(!b.deploy){ G.stats.built++; gainXP(u,VET_XP.build); } b.deploy=false; SFX.play('complete'); say('Engineer',`${bd.name} online.`,'sys'); G.selDirty=true; }
  } else { const rr=Math.min(b.maxHp-b.hp,d.repair*dt); b.hp+=rr; if(u.vet){ u.vet.repaired=(u.vet.repaired||0)+rr; u.vet.rb=(u.vet.rb||0)+rr; if(u.vet.rb>=VET_XP.repairPerXp){ u.vet.rb-=VET_XP.repairPerXp; gainXP(u,1); } } }
}
