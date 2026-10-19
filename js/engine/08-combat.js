'use strict';
/* ---------- 2g. combat ---------- */
function hostile(a,b){ if(a===b||a==='none'||b==='none') return false; if(a==='wild') return false; if(b==='wild') return a==='swarm'; return true; }
function visibleTo(faction,e){ if(faction!=='corps') return true; return isVisible(e); }
function isVisible(e){ if(e.faction==='corps') return true; if(e.def&&e.def.cloak&&!(e.revealT>0)) return false; const tx=Math.floor(e.x/TILE), ty=Math.floor(e.y/TILE), i=ty*G.map.w+tx; return (e.kind==='building'&&e.type!=='cocoon') ? G.seen[i]>0 : G.vis[i]>0; }
function validTarget(u,t,explicit){ return t && !t.dead && !t.invuln && !(u.truce&&t.faction===u.truce) && !(t.truce&&t.truce===u.faction) && t.kind!=='crate' && t.faction!==u.faction && (explicit||hostile(u.faction,t.faction)) && visibleTo(u.faction,t); }
function findTarget(u,rangeTiles,unitsOnly){
  const R=rangeTiles*TILE; let best=null, bs=Infinity;
  for(const e of G.ents){ if(e.dead||e.kind==='crate'||!hostile(u.faction,e.faction)) continue;
    if(unitsOnly && (e.kind!=='unit'||e.def.passive)) continue;
    if(e.invuln || (u.truce&&e.faction===u.truce) || (e.truce&&e.truce===u.faction)) continue;
    const d=dist(u,e)-e.r; if(d>R) continue; if(!visibleTo(u.faction,e)) continue;
    let score=d + (e.downed ? 90 : 0) + (e.kind==='building' ? 70 : 0) + (e.def.boss ? 80 : 0) + (e.type==='cocoon' ? -40 : 0) + (e.faction==='wild' ? 90 : 0);
    if(score<bs){ bs=score; best=e; } }
  return best;
}
function fire(u,t){
  const d=u.def; u.cd=d.cooldown*rand(0.9,1.1)/(u.enrage||1)/(u.rateMul||1)/(u.auraT>0?AURA.rate:1)*(u.waverT>0?AURA.waver.rate:1); const dm=u.dmgMul||1;
  if(u.type==='trooper'&&hasPerk(u)&&t.kind==='unit') throwGrenade(u,t);
  if(u.faction==='corps'&&u.kind==='unit'){ if(G.time-(G.lastFight||-99)>8) bark(u,'contact'); G.lastFight=G.time; }
  const ang=Math.atan2(t.y-u.y,t.x-u.x); u.angle=ang;
  const mx = u.kind==='building' ? u.x+Math.cos(ang)*12 : u.x+u.face*12, my = u.kind==='building' ? u.y-4+Math.sin(ang)*12 : u.y-8;
  if(u.faction==='corps'||isVisible(u)) SFX.play(d.attack==='bullet'?(u.type==='gunner'?'gunner':u.type==='sentry'?'sentry':'rifle'):d.attack==='flame'?'flame':d.attack==='acid'?'spit':d.attack==='plasma'?'plasma':'slash',u.x,u.y);
  if(d.attack==='bullet'){
    const hx=t.x+rand(-5,5), hy=t.y-6+rand(-5,5);
    G.fx.push({k:'tracer',x1:mx,y1:my,x2:hx,y2:hy,t:0.06,max:0.06});
    G.fx.push({k:'flash',x:mx,y:my,t:0.05,max:0.05});
    if(Math.random()<0.35) G.fx.push({k:'spark',x:hx,y:hy,vx:rand(-40,40),vy:rand(-60,0),t:0.25,max:0.25,col:'#ffe2a8'});
    damage(t,d.damage*dm,u); if(u.type==='gunner') suppress(t);
  } else if(d.attack==='flame'){
    for(let i=0;i<3;i++){ const a=ang+rand(-0.25,0.25), sp=rand(140,200)*(1+(u.rangeBonus||0)/(d.range||1)*0.8); G.fx.push({k:'flame',x:mx,y:my,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:0.38,max:0.38}); }
    const R=(d.splash||1)*TILE;
    for(const e of G.ents){ if(e.dead||e.kind==='crate'||!hostile(u.faction,e.faction)&&e!==t) continue; if(dist(e,t)<=R+e.r*0.5){ damage(e,d.damage*dm*((d.bonus&&d.bonus[e.type])||1),u); } }
    if(u.faction==='corps') for(const b of G.ents){ if(!b.dead&&b.kind==='body'&&dist(b,t)<=R+TILE*0.5) burnBody(b); }
  } else if(d.attack==='plasma'){
    u.revealT=Math.max(u.revealT||0,1.5); const dd=dist(u,t); G.shots.push({k:'plasma',sx:mx,sy:my,tx:t.x,ty:t.y-6,t:0,dur:dd/460+0.05,src:u,dmg:d.damage*dm,splash:0.4*TILE,faction:u.faction});
  } else if(d.attack==='acid'){
    const dd=dist(u,t); G.shots.push({k:'acid',sx:mx,sy:my,tx:t.x+rand(-6,6),ty:t.y+rand(-6,6),t:0,dur:dd/230+0.15,src:u,dmg:d.damage*dm,splash:(d.splash||0.6)*TILE,faction:u.faction});
  } else {
    damage(t,d.damage*dm,u); u.lunge=0.12;
    G.fx.push({k:'slash',x:t.x,y:t.y-8,t:0.16,max:0.16,face:u.face});
  }
}
function damage(t,amt,src){
  if(!t||t.dead) return;
  if(t.kind==='building' && !t.built) amt*=1.25;
  if(t.def.ground) return;
  if(t.invuln){ if(Math.random()<0.05) G.fx.push({k:'text',x:t.x,y:t.y-12,t:0.8,max:0.8,txt:'SEALED',col:'#ff9a3c'}); return; }
  if(t.bossState) t.bossState.calm=0;
  t.calm=0; t.hitAt=G.time;
  if(t.def.armor) amt*=1-t.def.armor;
  amt=coverDamage(t,amt,src);
  if(t.auraT>0) amt*=1-AURA.armor;   /* the Captain's leadership */
  const was=t.hp; t.hp-=amt; if(t.def.noDestroy&&t.hp<1) t.hp=1; t.flash=0.07;
  if(t.kind==='unit'&&t.faction==='corps'&&t.hp>0&&was>=t.maxHp*0.3&&t.hp<t.maxHp*0.3) bark(t,'hurt'); if(t.def.cloak) t.revealT=Math.max(t.revealT||0,2);
  if(t.faction==='corps' && src && src.faction==='swarm') raiseAlert(t);
  if(t.kind==='unit' && src && !src.dead){
    if(t.def.passive){ const a=Math.atan2(t.y-src.y,t.x-src.x); t.order={type:'move',x:t.x+Math.cos(a)*120,y:t.y+Math.sin(a)*120}; setPath(t,t.order.x,t.order.y); }
    else if((!t.target||t.target.kind==='building') && src.kind==='unit' && (!t.order||t.order.type!=='move') && t.def.damage && hostile(t.faction,src.faction)) t.target=src;
  }
  if(t.type==='hive' && src) hiveAlarm(t,src);
  if(t.hp<=0 && canGoDown(t,src)){ goDown(t,src); return; }   /* a soldier first goes down; a Medic can still patch him up */
  if(t.hp<=0) kill(t,src);
}
function kill(e,src){
  if(e.dead) return; e.dead=true; e.hp=0;
  if(e.kind==='building'){
    if(!e.def.noBlock) setBlock(e,0);
    if(e.type!=='cocoon') SFX.play('boom',e.x,e.y); else SFX.play('squelch',e.x,e.y);
    const big=e.size*TILE;
    for(let i=0;i<(e.size*10);i++) G.fx.push({k:'ember',x:e.x+rand(-big/3,big/3),y:e.y+rand(-big/3,big/3),vx:rand(-60,60),vy:rand(-90,-10),t:rand(.4,1),max:1,col:e.faction==='swarm'?'#a6ff4a':pick(['#ff8a2a','#ffd23f','#ffffff'])});
    G.fx.push({k:'boom',x:e.x,y:e.y,t:0.5,max:0.5,r:big*0.8});
    addDecal(e.x,e.y,big*0.55,e.faction==='swarm'?'rgba(48,90,20,.55)':'rgba(10,10,12,.6)');
    if(e.type==='charge' && e.tag) chargeLost(e);
    if(e.type==='hive') G.stats.hives++;
    if(e.type==='hive' && src && src.faction==='corps') gainXP(src,VET_XP.hive);
    if(e.faction==='corps') G.stats.lost++;
    if(e.type==='cocoon' && src && src.faction==='corps') G.fx.push({k:'text',x:e.x,y:e.y-14,t:1,max:1,txt:'PURGED',col:'#a6ff4a'});
  } else {
    const col = e.faction==='swarm' ? 'rgba(90,190,30,.6)' : e.faction==='wild' ? 'rgba(150,120,80,.55)' : 'rgba(120,24,24,.6)';
    addDecal(e.x,e.y,e.r*1.1,col);
    if(e.faction==='corps'||isVisible(e)) SFX.play(e.faction==='swarm'?'squelch':'death',e.x,e.y);
    for(let i=0;i<8;i++) G.fx.push({k:'spark',x:e.x,y:e.y-6,vx:rand(-70,70),vy:rand(-90,10),t:0.45,max:0.45,col:e.faction==='swarm'?'#a6ff4a':'#d23a3a'});
    if(e.faction==='corps') G.stats.lost++;
    if(e.faction==='corps') obituary(e);
    if(e.faction==='swarm' && e.def.bio!==false) splashAcid(e);
    if(e.faction==='swarm' && src && src.faction==='corps'){ G.stats.kills++; if(src.vet){ src.vet.kills++; gainXP(src, VET_XP[e.type]||VET_XP.kill); } }
    if(e.order && e.order.type==='build' && !e.order.site && !e.order.deploy) G.salvage+=BUILDINGS[e.order.btype].cost;
    if(e.faction==='corps' && e.def.bio && !(e.vet&&e.vet.risen) && !(src&&src.def&&src.def.boss) && walkableP(e.x,e.y)) makeBody(e);   /* the Swarm can claim it later */
    else if(e.faction!=='corps' && e.def.bio && src && src.faction==='swarm' && !(src.def&&src.def.boss) && walkableP(e.x,e.y)){
      const c=makeBuilding('cocoon','swarm',Math.floor(e.x/TILE),Math.floor(e.y/TILE),true); c.x=e.x; c.y=e.y; c.r=9;
      c.hatchT=BUILDINGS.cocoon.hatch; c.hatchType=(e.def.supply||1)>=2?'drone':'crawler'; G.swarm.biomass+=12; G.stats.cocoons++;
    }
  }
  if(G.sel.includes(e)){ G.sel=G.sel.filter(x=>x!==e); G.selDirty=true; }
}
function addDecal(x,y,r,col){ G.decals.push({x,y,r,col,seed:Math.random()*1000,t:0}); if(G.decals.length>180) G.decals.shift(); }
function raiseAlert(t){ if(G.time-G.alertT<10) return; G.alertT=G.time; G.alert={x:t.x,y:t.y}; G.pings.push({x:t.x,y:t.y,t:0,col:'#ff5a4f'}); SFX.play('alarm');
  say('Alert', t.kind==='building' ? `${t.def.name} under attack.` : 'Our forces are under attack.', 'alert'); }
function hiveAlarm(h,src){ for(const e of G.ents){ if(e.kind==='unit'&&!e.dead&&e.faction==='swarm'&&!e.target&&dist(e,h)<12*TILE) e.target=src; } hiveScream(h,src); }
/* Lieutenant Trooper: a grenade now and then, aimed at the thickest group near his target */
function throwGrenade(u,t){
  const P=PERKS.trooper; if(G.time<(u.nadeAt||0)) return; if(dist(u,t)>P.range*TILE) return;
  let best=t, bn=0; for(const e of G.ents){ if(e.dead||e.kind!=='unit'||!hostile(u.faction,e.faction)||dist(e,t)>3*TILE) continue;
    let n=0; for(const o of G.ents) if(!o.dead&&o.kind==='unit'&&hostile(u.faction,o.faction)&&Math.hypot(o.x-e.x,o.y-e.y)<P.radius*TILE) n++; if(n>bn){ bn=n; best=e; } }
  if(bn<2 && !(t.def.supply>=2)) return;   /* not worth a grenade on a single small target */
  u.nadeAt=G.time+P.every; const dd=dist(u,best);
  G.shots.push({k:'grenade',sx:u.x,sy:u.y-10,tx:best.x,ty:best.y,t:0,dur:dd/260+0.25,src:u,dmg:P.damage*(u.dmgMul||1),splash:P.radius*TILE,faction:u.faction});
  bark(u,'grenade');
}
