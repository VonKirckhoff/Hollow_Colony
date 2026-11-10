'use strict';
/* ---------- 32. The Osprey crew as the enemy (Lunar Corps campaign) ----------
   In three Corps missions (Night Shift, Kill Order, Mother's Heart) Squad Dust runs into the Osprey crew: the deserters of the
   Rogue Strain campaign, now played by the computer (faction 'osprey'). They wear the crew's black and brown with the red armband.
   - The Swarm leaves them alone and they leave the Swarm alone (truce): the strain in their blood.
   - The creep heals them.
   - They never die: below OSPREY.breakAt of their health one of them breaks off (smoke, nobody can hit him any more), runs for the
     nearest way out (g.ospreyExits) and is gone. That way the crew is never killed in a Corps mission and still alive in the next one.
   - Breaking one off is worth XP to the soldier who did it.
   - g.ospreyReturn(seconds): one who got away comes back out of a way out that much later, healed (the strain knits him), until
     g.ospreyWithdraw() ends it. Kill Order and Mother's Heart use it, so the crew keeps coming as long as it has a reason to.
   The Captain's name stays out of the Corps campaign: the Corps calls them "the Osprey crew".
   Tunables: OSPREY (dev panel, tab Squad). */
const OSPREY = {
  breakAt:0.25,                                 /* share of health at which one of them breaks off and runs */
  hp:{ easy:2, normal:2.5, hard:3 },            /* their health × this (the strain makes them tough) */
  dmg:{ easy:0.85, normal:1, hard:1.15 },      /* their damage × this */
  speed:1.08,                                   /* their speed × this */
  creepHeal:4,                                  /* HP per second while they stand on the creep */
  help:10,                                      /* tiles: when one of them is hit, the others this close come to help */
  run:1.35,                                     /* speed × this once he breaks off */
  vanish:25,                                    /* seconds: a broken one who has not reached a way out by then slips away anyway */
  xp:3                                          /* XP for the soldier who breaks one off */
};
const ospreyUnits=()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.osprey);
function ospreyState(){ return G.osprey||(G.osprey={ exits:[], broken:0, gone:0, barkAt:-99, back:0, queue:[] }); }
function ospreyMake(type,at,n,opt={}){ const k=G.diffKey||'normal', us=spawnAt(type,'osprey',at,n);
  for(const u of us){ u.osprey=true; u.truce='swarm'; u.sprite='crew_'+type; u.noBody=true;
    u.hp=u.maxHp=u.maxHp*(OSPREY.hp[k]||1)*(opt.tough||1); u.dmgMul=(u.dmgMul||1)*(OSPREY.dmg[k]||1); u.speedMul=(u.speedMul||1)*OSPREY.speed;
    u.home={x:u.x,y:u.y}; if(opt.hold) u.order={type:'hold'}; if(opt.hunt) u.ospHunt=true; if(opt.patrol) u.ospPatrol={ pts:opt.patrol, i:Math.floor(Math.random()*opt.patrol.length) };
    if(opt.spare) u.spare=opt.spare;   /* a unit (Kessler) they will not shoot */
    if(opt.capt) u.ospCapt=true; }
  return us; }
/* he breaks off: smoke, out of reach, off to the nearest way out */
function ospreyBreak(u,src,out){ if(u.ospBroke) return; const S=ospreyState(); if(out) u.ospOut=true; u.ospBroke=G.time; u.hp=Math.max(u.hp,1); u.invuln=true; u.target=null; u.order=null; u.path=null; u.ospHunt=false; u.ospPatrol=null;
  u.speedMul=(u.speedMul||1)*OSPREY.run; S.broken++;
  dustPuff(u.x,u.y,16); for(let i=0;i<10;i++) G.fx.push({k:'dust',x:u.x+rand(-10,10),y:u.y+rand(-10,6),vx:rand(-25,25),vy:rand(-30,-5),t:rand(1.2,2.2),max:2.2,r:rand(5,10)});
  G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'BREAKS OFF',col:'#e2556b'}); SFX.play('boom',u.x,u.y);
  if(src&&src.faction==='corps'&&src.vet&&!src.dead) gainXP(src,OSPREY.xp);
  if(G.time-S.barkAt>9){ S.barkAt=G.time; say(G.mission.ospreyVoice||'Osprey crew',pick(['I am hit. Falling back!','Smoke out! I am gone.','Breaking off. Do not wait for me.','Hit bad. Going to ground.']),'crew'); }
  ospreyFlee(u); }
function ospreyFlee(u){ const S=ospreyState(); let best=null, bd=Infinity;
  for(const a of S.exits){ const p=ptWorld(a); if(!p) continue; const d=Math.hypot(p.x-u.x,p.y-u.y); if(d<bd){ bd=d; best=p; } }
  if(!best){ ospreyVanish(u); return; }
  u.ospTo=best; u.order={type:'move',x:best.x,y:best.y}; setPath(u,best.x,best.y); }
function ospreyVanish(u){ if(u.dead) return; const S=ospreyState(); u.dead=true; S.gone++;
  if(S.back>0&&!u.ospOut) S.queue.push({ type:u.type, at:G.time+S.back, capt:u.ospCapt||undefined, spare:u.spare||undefined });   /* he comes back (g.ospreyReturn) */ dustPuff(u.x,u.y,10); G.fx.push({k:'text',x:u.x,y:u.y-24,t:1.2,max:1.2,txt:'GONE',col:'#e2556b'}); }
function ospreyTick(dt){ const S=G.osprey; if(!S) return;
  if(S.queue&&S.queue.length&&S.back>0) for(const q of [...S.queue]){ if(G.time<q.at) continue; S.queue.splice(S.queue.indexOf(q),1); const a=pick(S.exits); if(!a) continue;
    const u=ospreyMake(q.type,a,1,{ capt:q.capt, spare:q.spare })[0]; if(!u) continue; u.ospBack=true; u.ospHunt=true; dustPuff(u.x,u.y,10); G.fx.push({k:'text',x:u.x,y:u.y-28,t:1.4,max:1.4,txt:'BACK ON HIS FEET',col:'#e2556b'});
    G.pings.push({x:u.x,y:u.y,t:0,col:'#e2556b'}); if(!S.saidBack){ S.saidBack=true; say('Sgt. Kessler','That one went down a minute ago, and he is back on his feet. Whatever is in their blood, it does not let them stay down.'); } }
  const list=ospreyUnits(); if(!list.length) return;
  for(const u of list){
    if(u.ospBroke){ u.target=null; const p=u.ospTo;
      if(!p||G.time-u.ospBroke>OSPREY.vanish||Math.hypot(u.x-p.x,u.y-p.y)<1.4*TILE){ ospreyVanish(u); continue; }
      if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); }
      if(Math.random()<dt*3) G.fx.push({k:'dust',x:u.x,y:u.y,vx:rand(-10,10),vy:rand(-20,-5),t:1.2,max:1.2,r:rand(4,7)});
      continue; }
    if(u.hp<u.maxHp&&creepAt(u.x,u.y)>0.3) u.hp=Math.min(u.maxHp,u.hp+OSPREY.creepHeal*dt);
    if(u.spare&&u.target===u.spare) u.target=null; }
  S.aiT=(S.aiT||0)-dt; if(S.aiT>0) return; S.aiT=0.5;
  const hit=list.filter(e=>!e.ospBroke&&e.hitAt!=null&&G.time-e.hitAt<3);
  for(const u of list){ if(u.ospBroke||u.dead) continue;
    if(hit.length&&!u.target&&u.def.damage&&!(u.order&&u.order.type==='move')){ const h=hit.find(e=>e!==u&&dist(e,u)<OSPREY.help*TILE);
      if(h){ const foe=nearestOf(h,e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.faction==='corps'&&e!==u.spare&&dist(e,h)<9*TILE); if(foe) u.target=foe; } }
    if(u.target) continue;
    if(u.ospHunt&&G.time>(u.huntAt||0)){ u.huntAt=G.time+5; const t=nearestOf(u,e=>e.kind==='unit'&&!e.dead&&e.faction==='corps'&&!e.def.escort&&e!==u.spare);
      if(t){ u.home=null; u.order={type:'amove',x:t.x+rand(-24,24),y:t.y+rand(-24,24)}; setPath(u,u.order.x,u.order.y); } continue; }
    if(u.ospPatrol&&!u.order){ const P=u.ospPatrol, p=ptWorld(P.pts[P.i%P.pts.length]); P.i++; if(p){ u.home=null; u.order={type:'amove',x:p.x+rand(-20,20),y:p.y+rand(-20,20)}; setPath(u,u.order.x,u.order.y); } } } }
/* the hp bar of one of them carries a mark where he breaks off */
function ospreyBarMark(e,x,y,w){ if(!e.osprey) return; ctx.fillStyle='#ffffff'; ctx.fillRect(x+Math.round(w*OSPREY.breakAt),y-1,1,5); }
/* the mission API (mixed into g in every mission) */
function ospreyApi(){ return {
  /* osprey(type, at, n, { hold, hunt, patrol:[points], tough, spare }) : the Osprey crew, played by the computer */
  osprey:(type,at,n=1,opt={})=>ospreyMake(type,at,n,opt),
  ospreys:()=>ospreyUnits().filter(u=>!u.ospBroke),   /* still in the fight */
  ospreyBroken:()=>ospreyState().broken,              /* how many broke off so far */
  ospreyLeft:()=>ospreyUnits().length,                /* still on the map (fighting or running) */
  /* ospreyExits([points]): where a broken one runs to (an old shaft, the map edge) */
  ospreyExits(list){ ospreyState().exits=list||[]; },
  /* ospreyOrder(list, at, mode): send them somewhere ('amove' fights on the way, 'move' does not) */
  ospreyOrder(list,at,mode='amove'){ const p=ptWorld(at); if(!p) return; for(const u of list||[]) if(!u.dead&&!u.ospBroke){ u.ospHunt=false; u.ospPatrol=null; u.home=null; u.target=null;
      u.order={type:mode,x:p.x+rand(-20,20),y:p.y+rand(-20,20)}; setPath(u,u.order.x,u.order.y); } },
  ospreyHunt(list){ for(const u of list||[]) if(!u.dead&&!u.ospBroke){ u.ospHunt=true; u.ospPatrol=null; if(u.order&&u.order.type==='hold') u.order=null; } },
  /* ospreyWithdraw(list?): they all pull out, out of reach, to the ways out (the end of a mission) */
  ospreyWithdraw(list){ const S=ospreyState(); if(!list){ S.back=0; S.queue=[]; } for(const u of (list||ospreyUnits())){ if(u.dead) continue; u.ospOut=true; if(!u.ospBroke) ospreyBreak(u,null,true); } },
  /* ospreyReturn(seconds): one who got away comes back that much later out of a way out, healed (0 = they stay away); ospreyWithdraw() ends it */
  ospreyReturn(s){ ospreyState().back=s||0; },
  ospreyComing:()=>(ospreyState().queue||[]).length,   /* gone, but coming back */
  ospreyNear(at,r){ const p=ptWorld(at); if(!p) return 0; return ospreyUnits().filter(u=>!u.ospBroke&&Math.hypot(u.x-p.x,u.y-p.y)<=r*TILE).length; },
  ospreySay:(who,text)=>say(who,text,'crew script')
}; }
