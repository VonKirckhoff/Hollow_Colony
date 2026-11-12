'use strict';
/* ---------- 2h. unit behaviour ---------- */
/* lunar fauna: a grazer that is hit bolts away from what hit it, and the grazers near it run with it */
const FAUNA = { flee:3.5, fleeTime:2.5, fleeSpeed:2.2, herd:3 };   /* tiles it runs, seconds, × speed, tiles the herd panics with it (flee 0 = they stand still) */
function updateUnit(u,dt){
  const d=u.def;
  if(u.downed){ downedThink(u,dt); return; }
  if(u.emergeT>0) return;   /* still under the bulging ground (a burrowing wave) */
  if(u.stunT>0){ u.stunT-=dt; return; }   /* knocked down: he lies dazed a moment */
  if(u.dazeT>0) u.dazeT-=dt;
  if(d.grafter){ grafterThink(u,dt); return; }
  if(u.feral>0){ u.cd-=dt; u.moving=false; u.anim+=dt; u.flash=Math.max(0,u.flash-dt); u.lunge=Math.max(0,(u.lunge||0)-dt); u.beam=null; feralThink(u,dt); return; }   /* Rogue: feral, out of your control */   /* a Grafter only goes for its body */   /* down: immobile, bleeding out, waiting for a Medic */
  u.cd-=dt; if(u.suppressT>0) u.suppressT-=dt; if(u.auraT>0) u.auraT-=dt; if(u.waverT>0) u.waverT-=dt;
  if(u.vet&&u.vet.risen&&u.hp<u.maxHp&&G.time-(u.hitAt??-99)>RISEN.calm) u.hp=Math.min(u.maxHp,u.hp+RISEN.regen*dt);   /* the risen knit themselves back together, once nothing has hit them for a while */ u.flash=Math.max(0,u.flash-dt); u.lunge=Math.max(0,(u.lunge||0)-dt); u.moving=false; u.anim+=dt; u.beam=null;
  if(u.stance==='hold' && !u.order) u.order={type:'hold'};   /* defensive stance: hold wherever the last order left him */
  if(d.passive){ wildThink(u,dt); return; }
  if(d.escort){ escortThink(u,dt); return; }
  if(d.boss) bossThink(u,dt);
  if(u.faction==='swarm') swarmThink(u,dt);
  if(d.heal){ medicThink(u,dt); return; }
  if(d.builder && (!u.order||u.order.type==='hold')){ u.repScan=(u.repScan||0)-dt;   /* Engineers keep looking after structures, also when defensive */ if(u.repScan<=0){ u.repScan=0.5;
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
  if(u.quiet && !explicit) u.target=null;   /* hold fire: only what you order them to attack */
  if((!o || o.type!=='move') && !(u.quiet && !explicit)){ u.acq-=dt; if(u.acq<=0){ u.acq=0.25+Math.random()*0.1;
      const hold=o&&o.type==='hold';
      const cur=u.target, curD=cur ? dist(u,cur)-cur.r : Infinity, inRange=curD<=(d.range+(u.rangeBonus||0))*TILE+8;
      const rg=d.range+(u.rangeBonus||0), r = hold ? rg+0.3 : explicit ? rg+1.5 : (u.role==='brood'||u.role==='avatar') ? Math.max(4,rg) : Math.max(d.sight,rg);   /* brood waiting at the gathering point only meets what comes close */
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
  /* idle in a formation (after a fight, an order of his own, or back on his feet): back to his place */
  if((!o||o.type==='hold') && u.faction==='corps' && u.formation){ u.rjT=(u.rjT||0)-dt; if(u.rjT<=0){ u.rjT=0.4; if(rejoinFormation(u)) return; } }
  if(!o) return;
  if(o.type==='move' && u.faction==='corps' && d.damage){ snapFire(u,dt); if(u.order!==o||u.dead||u.downed) return; }   /* keep walking, but shoot back on the way (a shot can end his order: acid blood from his kill can bring him down) */
  if(o.type==='move'||o.type==='amove'){ if(walkOrder(u,dt)&&u.order===o){ u.order=null; if(u.faction==='corps') u.home={x:u.x,y:u.y}; } }
  else if(o.type==='guard'){ if(stepMove(u,dt)){ o.wait=(o.wait||0)-dt; if(o.wait<=0){ o.wait=rand(3,8); const a=rand(0,Math.PI*2), r=rand(1,3.5)*TILE; setPath(u,o.x+Math.cos(a)*r,o.y+Math.sin(a)*r); } } }
}
/* distance from a unit to the edge of its target: buildings are square blocks, not circles */
function gapTo(u,t){ if(t.kind==='building'&&t.size&&!t.def.noBlock){ const h=t.size*TILE/2, dx=Math.max(0,Math.abs(u.x-t.x)-h), dy=Math.max(0,Math.abs(u.y-t.y)-h); return Math.hypot(dx,dy); }
  return dist(u,t)-t.r; }
function engage(u,dt,hold){
  const t=u.target, d=u.def;
  const reach=(d.range+(u.rangeBonus||0))*TILE + u.r*0.5 + (t.kind==='building'&&t.size&&!t.def.noBlock?u.r+4:0), dd=gapTo(u,t);
  if(Math.abs(t.x-u.x)>2) u.face=t.x>=u.x?1:-1;
  if(dd<=reach&&fireBlocked(u,t)){   /* rock or a membrane in the way: go round for a clear shot (an order of yours), otherwise look for another target */
    if(hold||!(u.order&&u.order.type==='attack')){ u.target=null; return; } goTo(u,t.x,t.y,dt,0.5); return; }
  if(dd<=reach){ u.path=null; u.goal=null; if(u.cd<=0) fire(u,t); }
  else if(hold){ u.target=null; }
  else goTo(u,t.x,t.y,dt,0.5);
}
function swarmThink(u,dt){
  if(u.def.founder && founderThink(u,dt)) return;   /* a Husk looking for a place to root */
  if(u.role==='eggrun'){ eggRunThink(u); return; }   /* sent for an ancient egg (29-relics.js) */
  if(claimThink(u,dt)) return;   /* busy with a fallen soldier: infecting, carrying or guarding it */
  if(u.role==='avatar') return;   /* the creature you steer yourself */
  if(u.role==='escort'){ huskEscortThink(u); return; }   /* walking with its Husk (25-hive-life.js) */
  if(u.role==='wave' && tacticThink(u,dt)) return;
  if(u.role==='brood'){ broodThink(u); return; }   /* playing the Swarm: waiting at the gathering point for your call */
  u.think=(u.think||0)-dt; if(u.think>0) return; u.think=0.8+Math.random()*0.4;
  if(u.role==='guard'||u.role==='boss'){ if(!u.order && !u.target && u.guardAt) u.order={type:'guard',x:u.guardAt.x,y:u.guardAt.y,wait:0}; return; }
  if((u.role==='hunt'||u.role==='wave') && !u.target && (!u.order||u.order.type!=='amove')){
    const vip=G.side==='corps'&&nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit'&&e.def.escort&&!e.downed&&dist(u,e)<SWARM_VIP.hunt*TILE);   /* Dr. Maas first */
    const t=vip||nearestOf(u,e=>e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&!e.def.scenery&&!e.downed&&!deadGen(u,e)&&!veiled(e));   /* Rogue: a veiled crew member is not prey (Among Them) */   // blast doors and rubble are scenery, not prey
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
  if(!S.home) S.home={x:u.x,y:u.y};
  if(!u.awake){ if(foes.length){ u.awake=true; SFX.play('horn'); } else return; }
  /* back to the lair to heal: every time she loses lairEvery of her health (at most lairTimes), she drags herself home,
     fast, and heals there (lairRegen per second, up to lairHeal of her health, at most lairTime seconds) while she lays
     eggs round her. Whoever follows her in (closer than lairGuard tiles) breaks it off: she turns on them at once. */
  /* burrowed: hidden and out of reach under the ground while it bulges where she will break out */
  if(S.burrow){ const B=S.burrow; B.t-=dt; u.speedMul=0; u.target=null; u.path=null;
    if(B.t>0.8){ const us=foes.filter(e=>e.kind==='unit'); const c=bossCluster(us); if(c){ const f=freeTilesNear(Math.floor(c.x/TILE),Math.floor(c.y/TILE),1)[0]; if(f){ B.x+=((f.x+.5)*TILE-B.x)*Math.min(1,dt*1.5); B.y+=((f.y+.5)*TILE-B.y)*Math.min(1,dt*1.5); } }   /* the bulge follows your group until the last moment */
      const fx=G.fx.find(x=>x===B.fx); if(fx){ fx.x=B.x; fx.y=B.y; } }
    if(B.t>0) return;
    S.burrow=null; S.calmAfter=d.burrowCalm; u.x=B.x; u.y=B.y; u.hidden=false; u.invuln=false; u.order=null; u.path=null;
    for(const e of G.ents) if(!e.dead&&e.faction==='corps'&&e.kind!=='crate'&&!e.def.ground&&Math.hypot(e.x-u.x,e.y-u.y)<u.r+d.burrowRadius*TILE){ damage(e,d.burrowDamage,u);
      if(!e.dead&&!e.downed&&e.kind==='unit') bossKnock(e,u,d.burrowDaze); }   /* who survives is thrown back and lies dazed a moment */
    debrisBurst(u.x,u.y,26,['#8a7a6a','#5a4632','#b3a58f','#3a3c43'],160); SFX.play('boom',u.x,u.y); SFX.play('horn'); G.shake=Math.max(G.shake||0,0.7); addDecal(u.x,u.y,u.r,'rgba(16,16,20,.6)');
    G.fx.push({k:'text',x:u.x,y:u.y-80,t:1.2,max:1.2,txt:'BREAKS OUT!',col:'#ff5a4f'}); S.chargeT=Math.min(S.chargeT??0,1); return; }
  S.lost=S.lost??0; const lostNow=1-u.hp/u.maxHp;
  if(S.calmAfter>0) S.calmAfter-=dt;   /* right after breaking out she fights first: no retreat */
  if(!S.retreat && !(S.calmAfter>0) && (S.lairs||0)<d.lairTimes && lostNow>=(S.lairs||0)*d.lairEvery+d.lairEvery && Math.hypot(u.x-S.home.x,u.y-S.home.y)>2*TILE){
    S.lairs=(S.lairs||0)+1; S.retreat='go'; u.target=null; u.order={type:'move',x:S.home.x,y:S.home.y}; setPath(u,S.home.x,S.home.y); S.charge=0; u.suppressT=0;
    SFX.play('squelch',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1.4,max:1.4,txt:'RETREATS',col:'#c38bff'});
    if(foes.length&&d.coverBrood){ let cx=0, cy=0; for(const e of foes){ cx+=e.x; cy+=e.y; } cx/=foes.length; cy/=foes.length;   /* her brood breaks out of the ground between her and you to cover her */
      const mx=(u.x+cx)/2, my=(u.y+cy)/2; freeTilesNear(Math.floor(mx/TILE),Math.floor(my/TILE),d.coverBrood+2).slice(2).forEach(t=>{ const m=makeUnit('drone','swarm',(t.x+.5)*TILE,(t.y+.5)*TILE); m.role='hunt'; emergeStart(m); });
      G.fx.push({k:'bulge',x:mx,y:my,r:TILE*1.6,t:ANIM.emerge||1,max:ANIM.emerge||1,seed:Math.random()*99}); } }
  if(S.retreat==='go'){ u.speedMul=d.fleeSpeed; u.suppressT=0; u.target=null; if(!u.order||Math.hypot(u.x-S.home.x,u.y-S.home.y)<1.5*TILE){ S.retreat='heal'; S.healT=d.lairTime; S.healTo=Math.min(u.maxHp,u.hp+d.lairHeal*u.maxHp); u.order={type:'hold'}; S.eggT=Math.min(S.eggT,1); } return; }
  if(S.retreat==='heal'){ const near=foes.some(e=>dist(e,u)<d.lairGuard*TILE+u.r); S.healT-=dt; u.speedMul=d.rootSpeed;
    if(near||S.healT<=0||u.hp>=S.healTo){ S.retreat=null; u.order=null; u.guardAt={x:S.home.x,y:S.home.y}; if(near){ S.chargeT=0; G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'FURY!',col:'#ff5a4f'}); } }
    else { u.hp=Math.min(S.healTo,u.hp+d.lairRegen*dt); if(Math.random()<dt*4) G.fx.push({k:'text',x:u.x+rand(-24,24),y:u.y-60,t:0.8,max:0.8,txt:'+',col:'#a6ff4a'});
      S.eggT-=dt*2; if(S.eggT<=0){ S.eggT=d.eggEvery*0.5; for(let i=0;i<d.eggs+1;i++){ const a=rand(0,Math.PI*2), r=rand(1.5,3.5)*TILE; layEgg(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r,pick(['crawler','drone'])); } SFX.play('hatch',u.x,u.y); }
      return; } }
  /* an ambush in her lair: whoever comes into it makes the eggs round her hatch at once */
  if(foes.some(e=>Math.hypot(e.x-S.home.x,e.y-S.home.y)<(d.lairGuard+3)*TILE)) for(const c of G.ents) if(!c.dead&&c.type==='cocoon'&&c.hatchT>0.3&&Math.hypot(c.x-S.home.x,c.y-S.home.y)<6*TILE) c.hatchT=0.3;
  if(!foes.length){ u.speedMul=1; return; }
  /* once in every stage of the fight (from the first call of her brood) she burrows and breaks out under your biggest group */
  if(S.phase>=1&&(S.burrows||0)<S.phase&&(S.phaseT=(S.phaseT||0)+dt)>4){ const us=foes.filter(e=>e.kind==='unit');
    if(us.length){ const best=bossCluster(us);
      const f=freeTilesNear(Math.floor(best.x/TILE),Math.floor(best.y/TILE),1)[0]||{x:Math.floor(best.x/TILE),y:Math.floor(best.y/TILE)};
      S.burrows=(S.burrows||0)+1; S.phaseT=-8;   /* at least 12 s before the next burrow, also if she reached two stages at once */ S.burrow={t:d.burrowTime,x:(f.x+.5)*TILE,y:(f.y+.5)*TILE}; u.hidden=true; u.invuln=true; u.target=null; u.order={type:'hold'}; S.charge=0;
      S.burrow.fx={k:'bulge',x:S.burrow.x,y:S.burrow.y,r:u.r*1.4,t:d.burrowTime,max:d.burrowTime,seed:Math.random()*99}; G.fx.push(S.burrow.fx); debrisBurst(u.x,u.y,16,['#8a7a6a','#5a4632'],90); SFX.play('squelch',u.x,u.y);
      G.fx.push({k:'text',x:u.x,y:u.y-70,t:1.2,max:1.2,txt:'BURROWS!',col:'#c38bff'}); return; } }
  /* her shields stay close to her */
  for(const e of G.ents) if(!e.dead&&e.shieldOf===u&&Math.hypot(e.x-u.x,e.y-u.y)>2.5*TILE+u.r&&(!e.order||e.order.type!=='move')){ e.target=null; e.order={type:'move',x:u.x+rand(-TILE,TILE),y:u.y+rand(-TILE,TILE)}; setPath(e,e.order.x,e.order.y); }
  /* acid rain (from her second call): a curtain of acid between her and you that leaves pools burning a long time */
  /* acid rain (from her second call). Walking rain: three arcs one after another, near her, further, and the last
     right on your squad. Stand still longer than rainStill seconds and the rain lands on top of your group at once. */
  if(S.phase>=2){ let cx=0, cy=0; for(const e of foes){ cx+=e.x; cy+=e.y; } cx/=foes.length; cy/=foes.length;
    if(!S.stillAt||Math.hypot(cx-S.stillAt.x,cy-S.stillAt.y)>TILE){ S.stillAt={x:cx,y:cy}; S.stillT=0; } else S.stillT+=dt;
    const glob=(tx,ty,delay)=>{ const sx=u.x, sy=u.y-50; G.shots.push({k:'acid',sx,sy,tx,ty,t:-delay,dur:Math.hypot(tx-sx,ty-sy)/240+0.3,src:u,dmg:d.spitDamage,splash:0.8*TILE,faction:u.faction,pool:d.rainPool}); };
    S.rainT=(S.rainT??3)-dt;
    if(S.stillT>d.rainStill){ S.stillT=0; S.rainT=d.rainEvery; for(let i=0;i<d.rainGlobs;i++){ const a=i/d.rainGlobs*Math.PI*2, r=i?rand(0.8,2)*TILE:0; glob(cx+Math.cos(a)*r,cy+Math.sin(a)*r,i*0.08); }
      SFX.play('spit',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'ACID RAIN',col:'#a6ff4a'}); }
    else if(S.rainT<=0){ S.rainT=d.rainEvery; const a0=Math.atan2(cy-u.y,cx-u.x), far=Math.max(u.r+4*TILE,Math.hypot(cx-u.x,cy-u.y));
      for(let w=0;w<3;w++){ const R=w===0?u.r+4*TILE:w===1?(u.r+4*TILE+far)/2:far, spread=1.6*(u.r+4*TILE)/Math.max(R,1);
        for(let i=0;i<d.rainGlobs;i++){ const a=a0+(i/(d.rainGlobs-1)-0.5)*spread, r=R+rand(-0.5,0.5)*TILE; glob(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r,w*0.7+i*0.08); } }
      SFX.play('spit',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'ACID RAIN',col:'#a6ff4a'}); } }
  /* kept at a distance: she creeps after you instead of standing still, and flings eggs into your ranks */
  const near=foes.reduce((m,e)=>Math.min(m,dist(e,u)),Infinity), reach=(d.range+1.5)*TILE+u.r;
  S.farT=near>reach?(S.farT||0)+dt:0;
  if(S.farT>d.kiteTime){ S.farT=0; const unitsF=foes.filter(e=>e.kind==='unit'); const t=pick(unitsF.length?unitsF:foes);
    for(let i=0;i<d.lobEggs;i++){ const tx=t.x+rand(-1.5,1.5)*TILE, ty=t.y+rand(-1.5,1.5)*TILE; G.shots.push({k:'broodlob',sx:u.x,sy:u.y-50,tx,ty,t:-i*0.2,dur:Math.hypot(tx-u.x,ty-u.y)/300+0.4,faction:'none',splash:0,dmg:0,type:S.phase>=2?pick(['drone','crawler']):'crawler'}); }
    SFX.play('spit',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'SPAWN!',col:'#a6ff4a'}); }
  // mostly rooted while she spits and lays eggs; every few seconds she charges into the nearest group
  S.chargeT=(S.chargeT??6)-dt;
  if(S.chargeT<=0){ S.charge=d.chargeTime; S.chargeT=d.chargeEvery*(S.phase>=2?0.75:1); SFX.play('squelch',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-70,t:1,max:1,txt:'CHARGE!',col:'#ff5a4f'}); }
  if(S.charge>0){ S.charge-=dt; u.speedMul=d.chargeSpeed; if(Math.random()<dt*20) G.fx.push({k:'ember',x:u.x+rand(-30,30),y:u.y+rand(-4,8),vx:rand(-30,30),vy:rand(-40,-10),t:0.5,max:0.5,col:'#6b5a7a'}); }
  else u.speedMul=near>reach?d.stalkSpeed:d.rootSpeed;   /* close: rooted; kept at a distance: she creeps after you */
  S.eggT-=dt; if(S.eggT<=0){ S.eggT=d.eggEvery*(S.phase>=2?0.7:1); const types=S.phase>=2?['drone','crawler']:['crawler'];
    for(let i=0;i<d.eggs;i++){ const a=rand(0,Math.PI*2), r=rand(1.5,3)*TILE; layEgg(u.x+Math.cos(a)*r,u.y+Math.sin(a)*r,pick(types)); } SFX.play('hatch',u.x,u.y); }
  S.spitT-=dt; if(S.spitT<=0){ S.spitT=d.spitEvery; for(let i=0;i<d.spit;i++){ const t=pick(foes); const sx=u.x+u.face*40, sy=u.y-40, tx=t.x+rand(-24,24), ty=t.y+rand(-24,24);
      G.shots.push({k:'acid',sx,sy,tx,ty,t:-i*0.12,dur:Math.hypot(tx-sx,ty-sy)/260+0.2,src:u,dmg:d.spitDamage,splash:0.8*TILE,faction:u.faction}); } SFX.play('spit',u.x,u.y); }
  const th=[0.75,0.5,0.25];
  if(S.phase<3 && u.hp/u.maxHp<th[S.phase]){ S.phase++; u.enrage=1+0.15*S.phase; SFX.play('horn');
    G.fx.push({k:'boom',x:u.x,y:u.y-20,t:0.6,max:0.6,r:90,col:'#a6ff4a'});
    const tile={x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)}; const n=2+S.phase;
    const types=S.phase>=3?['brute','drone','drone']:S.phase>=2?['spitter','drone','crawler']:['crawler','crawler','drone'];
    freeTilesNear(tile.x,tile.y,n+6).slice(6).forEach(s=>{ const m=makeUnit(pick(types),'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); m.role='hunt'; });
    S.phaseT=0;   /* a new stage: she will burrow once in it */
    for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.downed&&dist(e,u)<d.screechR*TILE+u.r) e.dazeT=d.screechTime;   /* her screech: your soldiers shoot slower for a moment */
    G.fx.push({k:'screech',x:u.x,y:u.y-30,t:0.9,max:0.9,R:d.screechR*TILE});
    if(S.phase>=3) freeTilesNear(tile.x,tile.y,d.shieldBrood+10).slice(10).forEach(s=>{ const m=makeUnit('drone','swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); m.role='shield'; m.shieldOf=u; }); }   /* her shields: they stay with her and take a share of the hits */
}
function escortThink(u,dt){
  const o=u.order;
  if(o && (o.type==='move'||o.type==='amove')){ if(walkOrder(u,dt)&&u.order===o){ u.order=null; } return; }
  if(o && o.type==='hold') return;
  u.order=null; u.follT=(u.follT||0)-dt;
  if(u.follT<=0){ u.follT=0.5; u.lead=nearestOf(u,e=>e.kind==='unit'&&e.faction===u.faction&&!e.def.escort&&e.def.damage&&dist(e,u)<12*TILE); }
  if(u.lead && !u.lead.dead && dist(u,u.lead)>1.8*TILE) goTo(u,u.lead.x,u.lead.y,dt,0.6);
}
function wildFlee(u,from){ const a0=Math.atan2(u.y-from.y,u.x-from.x);
  for(const da of [0,0.5,-0.5,1,-1,1.6,-1.6]){ const x=u.x+Math.cos(a0+da)*FAUNA.flee*TILE, y=u.y+Math.sin(a0+da)*FAUNA.flee*TILE;
    if(walkableP(x,y)){ u.order={type:'move',x,y}; setPath(u,x,y); u.fleeT=FAUNA.fleeTime; u.speedMul=FAUNA.fleeSpeed; u.wait=rand(3,6); return true; } } return false; }
function wildThink(u,dt){
  u.flash=Math.max(0,u.flash-dt);
  if(u.scareFrom){ const f=u.scareFrom; u.scareFrom=null; if(FAUNA.flee>0&&wildFlee(u,f)) for(const o of G.ents) if(o!==u&&!o.dead&&o.faction==='wild'&&o.kind==='unit'&&!(o.fleeT>0)&&dist(o,u)<FAUNA.herd*TILE) wildFlee(o,f); }
  if(u.fleeT>0){ u.fleeT-=dt; if(u.fleeT<=0||!u.order){ u.fleeT=0; u.speedMul=1; } }
  if(u.order){ if(stepMove(u,dt)) u.order=null; return; }
  u.wait=(u.wait||rand(2,6))-dt;
  if(u.wait<=0){ u.wait=rand(4,9); const h=u.home||{x:u.x,y:u.y}; const a=rand(0,Math.PI*2), r=rand(0.5,3)*TILE; u.order={type:'move',x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r}; setPath(u,u.order.x,u.order.y); }
}
const HP_ZONES={ red:0.25, orange:0.5 };
function hpZone(e){ if(e.downed) return -1; const f=e.hp/e.maxHp; return f<=HP_ZONES.red?0:f<=HP_ZONES.orange?1:2; }
const hpColor=f=>f<=HP_ZONES.red?'#ff5a4f':f<=HP_ZONES.orange?'#ff9a3c':'#5fe3b0';
function medicThink(u,dt){
  const d=u.def; u.healT=(u.healT||0)-dt;
  /* the leash: a Medic left to himself (no order, or holding) only goes so far from his place to heal someone,
     so he does not trail after a soldier you send off on his own (SQUAD.medic). With an order of yours he goes where you send him. */
  const free=!u.order||u.order.type==='hold', anchor=free?(formationSpot(u)||u.home):null, M=SQUAD.medic;
  const leashed=e=>!anchor||Math.hypot(e.x-anchor.x,e.y-anchor.y)<=((e.downed?M.downedLeash:M.leash)+d.healRange)*TILE;
  const ok=t=>t&&!t.dead&&t.hp<t.maxHp&&t!==u&&dist(u,t)<d.sight*TILE&&leashed(t);
  // Triage: red patients first. Once a patient is out of the red and someone else is still in the red,
  // move on to them; then orange, then top up the rest.
  if(u.healT<=0){ u.healT=0.3;
    const R=(u.order&&u.order.type==='move'?d.healRange:d.sight)*TILE;
    const cands=G.ents.filter(e=>e.kind==='unit'&&!e.dead&&e.faction===u.faction&&e.def.bio&&!(e.vet&&e.vet.risen)&&e!==u&&e.hp<e.maxHp&&dist(u,e)<R&&leashed(e));   /* the risen cannot be healed */
    if(cands.length){ const worst=Math.min(...cands.map(hpZone)); const cur=ok(u.healTarget)?u.healTarget:null;
      if(!cur || hpZone(cur)>worst){ u.healTarget=cands.filter(e=>hpZone(e)===worst).reduce((a,b)=>dist(u,a)<=dist(u,b)?a:b); if(u.healTarget!==cur&&Math.random()<0.4) bark(u,'heal'); } }
    else if(!ok(u.healTarget)) u.healTarget=null; }
  const t=ok(u.healTarget)?u.healTarget:null;
  const inRange = t && dist(u,t) <= d.healRange*TILE;
  if(!t && d.damage) snapFire(u,dt);   /* healing always comes first; only then the sidearm */
  if(inRange && t.downed){ patchUp(u,t,dt); }
  else if(inRange){ const hh=Math.min(t.maxHp-t.hp,d.heal*(u.dmgMul||1)*dt); t.hp+=hh; if(u.vet){ u.vet.healed=(u.vet.healed||0)+hh; u.vet.hb=(u.vet.hb||0)+hh; if(u.vet.hb>=VET_XP.healPerXp){ u.vet.hb-=VET_XP.healPerXp; gainXP(u,1); } } u.beam=t; SFX.play('heal',u.x,u.y); if(Math.abs(t.x-u.x)>2) u.face=t.x>u.x?1:-1;
    if(Math.random()<dt*3) G.fx.push({k:'text',x:t.x+rand(-6,6),y:t.y-14,t:0.7,max:0.7,txt:'+',col:'#7dffbf'});
    if(hasPerk(u)){ for(const e of G.ents){ if(e===t||e===u||e.dead||e.downed||e.kind!=='unit'||e.faction!==u.faction||!e.def.bio||(e.vet&&e.vet.risen)||e.hp>=e.maxHp||dist(u,e)>d.healRange*TILE) continue;   /* Lieutenant Medic: everyone around him */
        e.hp=Math.min(e.maxHp,e.hp+d.heal*PERKS.medic.share*(u.dmgMul||1)*dt); if(Math.random()<dt*2) G.fx.push({k:'text',x:e.x+rand(-6,6),y:e.y-14,t:0.7,max:0.7,txt:'+',col:'#7dffbf'}); } } }
  if(u.order && u.order.type==='attack') u.order={type:'support',squad:G.ents.filter(e=>e.kind==='unit'&&e.faction===u.faction&&!e.dead&&!e.def.heal&&dist(e,u)<6*TILE)};
  if(u.order && u.order.type==='support'){
    const squad=(u.order.squad||[]).filter(alive);
    if(t){ if(!inRange) goTo(u,t.x,t.y,dt,0.5); return; }
    const lead=squad.length ? squad.reduce((a,b)=>dist(u,a)<dist(u,b)?a:b) : null;
    if(!lead){ u.order=null; u.home={x:u.x,y:u.y}; return; }
    if(dist(u,lead)>2*TILE) goTo(u,lead.x,lead.y,dt,0.6);
    u.home={x:u.x,y:u.y};   /* with the squad: if this order ends, he stays here instead of walking back to where he last stood */
    return; }
  if(u.order && (u.order.type==='move'||u.order.type==='amove')){ const mo=u.order; if(walkOrder(u,dt)&&u.order===mo){ u.order=null; u.home={x:u.x,y:u.y}; } return; }
  if(t && !inRange) goTo(u,t.x,t.y,dt,0.6);
  else if(!t && (!u.order||u.order.type==='hold') && formationSpot(u)){ const p=formationSpot(u), d=Math.hypot(u.x-p.x,u.y-p.y); if(d>TILE*0.8) u.rejoin=true; if(u.rejoin&&d>4){ goTo(u,p.x,p.y,dt); } else { u.rejoin=false; u.home={x:u.x,y:u.y}; } }   /* patient done: back into his place in the formation */
  else if(!t && u.home && Math.hypot(u.x-u.home.x,u.y-u.home.y)>2*TILE) goTo(u,u.home.x,u.home.y,dt);
}
function builderThink(u,dt){
  const o=u.order, d=u.def;
  if(d.damage) snapFire(u,dt);   /* keeps building, repairing or packing, but shoots back at anything in range */
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
      if(o.deploy && fielded(o.btype)-1>=limitOf(o.btype)){ toast(limitMsg(o.btype)); u.order=null; return; }   /* -1: fielded() already counts this Engineer's own order */
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
  if(!alive(b) || (done && b.hp>=b.maxHp)){ u.order=null; u.home={x:u.x,y:u.y}; if(o.type==='repair') rejoinFormation(u); return; }   /* repair done: back into his place */
  const reach=(b.size||1)*TILE/2+u.r+18;
  if(b.kind==='building'){ const p=repairSpot(u,b,o,reach,dt);   /* the side of his squad, away from the Swarm */
    if(p&&Math.hypot(u.x-p.x,u.y-p.y)>10&&!(o.spotWalk>6&&dist(u,b)<=reach)){ o.spotWalk=(o.spotWalk||0)+dt; goTo(u,p.x,p.y,dt); return; } }
  if(dist(u,b)>reach){ goTo(u,b.x,b.y,dt); return; }
  u.path=null; if(Math.abs(b.x-u.x)>2) u.face=b.x>u.x?1:-1;
  u.anim+=dt*2; SFX.play(done?'wrench':'weld',b.x,b.y);
  if(Math.random()<dt*8) G.fx.push({k:'spark',x:b.x+rand(-b.r,b.r)*0.6,y:b.y+rand(-b.r,b.r)*0.6,vx:rand(-50,50),vy:rand(-70,-10),t:0.3,max:0.3,col:'#ffe2a8'});
  if(!done){
    const bd=b.def;
    const sp=hasPerk(u)?PERKS.engineer.speed:1;   /* Lieutenant Engineer: twice as fast */ b.weldT=0.25;   /* welding sparks on the scaffolding */
    if(b.deploy){ b.progress+=dt*sp/bd.deployTime; b.hp=b.carryHp*(0.3+0.7*Math.min(1,b.progress)); }
    else { b.progress+=dt*sp/bd.buildTime; b.hp=Math.min(b.maxHp,b.hp+b.maxHp*0.9*dt*sp/bd.buildTime); }
    if(b.progress>=1){ b.built=true; b.progress=1; sentryUnfolds(b); if(!b.deploy){ G.stats.built++; gainXP(u,VET_XP.build); } b.deploy=false; SFX.play('complete'); say('Engineer',`${bd.name} online.`,'sys'); G.selDirty=true; }
  } else { const rr=Math.min(b.maxHp-b.hp,d.repair*dt*(hasPerk(u)?PERKS.engineer.speed:1)); b.hp+=rr; if(u.vet){ u.vet.repaired=(u.vet.repaired||0)+rr; u.vet.rb=(u.vet.rb||0)+rr; if(u.vet.rb>=VET_XP.repairPerXp){ u.vet.rb-=VET_XP.repairPerXp; gainXP(u,1); } } }
}

/* Where an Engineer stands to build or repair a structure: on a free spot around it, as far as possible on the side of
   his squad and away from the Swarm, without a long walk round. Every spot within reach of the structure gets a score:
   the walk to it (REPAIR_SIDE.walk per tile), the side the Swarm is on (REPAIR_SIDE.enemy: the Swarm within
   REPAIR_SIDE.look tiles) and the side his squad is on (REPAIR_SIDE.squad). Chosen again every second. */
const REPAIR_SIDE = { walk:0.5, enemy:4, squad:2, look:14 };
function repairSpot(u,b,o,reach,dt){ o.spotT=(o.spotT||0)-dt; if(o.spot&&o.spotT>0) return o.spot; o.spotT=1;
  const R=REPAIR_SIDE, L=R.look*TILE, foes=G.ents.filter(e=>!e.dead&&!e.hidden&&e.faction==='swarm'&&(e.kind==='unit'||e.type==='hive')&&Math.hypot(e.x-b.x,e.y-b.y)<L);
  const mates=(u.formation?formMembers(u.formation):G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'&&Math.hypot(e.x-b.x,e.y-b.y)<10*TILE)).filter(e=>e!==u&&!e.dead&&!e.def.builder);
  const dir=list=>{ if(!list.length) return null; let x=0,y=0; for(const e of list){ x+=e.x; y+=e.y; } x=x/list.length-b.x; y=y/list.length-b.y; const n=Math.hypot(x,y); return n>1?{x:x/n,y:y/n}:null; };
  const fd=dir(foes), md=dir(mates); let best=null, bs=Infinity; const sz=b.size||1;
  for(let ty=b.ty-1;ty<=b.ty+sz;ty++) for(let tx=b.tx-1;tx<=b.tx+sz;tx++){ if(tx>=b.tx&&tx<b.tx+sz&&ty>=b.ty&&ty<b.ty+sz) continue; if(!walkableT(tx,ty)) continue;
    const x=(tx+.5)*TILE, y=(ty+.5)*TILE, dx=x-b.x, dy=y-b.y, n=Math.hypot(dx,dy); if(n>reach-2) continue;
    let sc=Math.hypot(u.x-x,u.y-y)/TILE*R.walk; if(fd) sc+=(dx*fd.x+dy*fd.y)/n*R.enemy; if(md) sc-=(dx*md.x+dy*md.y)/n*R.squad;
    if(o.spot&&Math.hypot(x-o.spot.x,y-o.spot.y)<4) sc-=1;   /* he keeps his spot unless another is clearly better: no shuffling about */
    if(sc<bs){ bs=sc; best={x,y}; } }
  if(best&&(!o.spot||Math.hypot(best.x-o.spot.x,best.y-o.spot.y)>4)) o.spotWalk=0;
  o.spot=best; return best; }

/* the spot of your biggest group (for the Brood Mother's burrowing) */
function bossCluster(us){ let best=null, bn=-1; for(const e of us){ const n=us.filter(o=>Math.hypot(o.x-e.x,o.y-e.y)<2*TILE).length; if(n>bn){ bn=n; best=e; } } return best; }
/* thrown back by the Brood Mother breaking out: up to 1.5 tiles away from her (not into rock), then dazed on the ground */
function bossKnock(e,u,t){ const a=Math.atan2(e.y-u.y,e.x-u.x); for(let s=1.5;s>0;s-=0.25){ const x=e.x+Math.cos(a)*s*TILE, y=e.y+Math.sin(a)*s*TILE; if(walkableP(x,y)){ e.x=x; e.y=y; break; } }
  e.stunT=t; e.path=null; e.target=null; soldierFalls(e); }
