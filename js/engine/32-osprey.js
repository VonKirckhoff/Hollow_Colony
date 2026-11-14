'use strict';
/* ---------- 32. The Osprey crew as the enemy (Lunar Corps campaign) ----------
   In two Corps missions (Night Shift, Kill Order) Squad Dust runs into the Osprey crew: the deserters of the
   Rogue Strain campaign, now played by the computer (faction 'osprey'). They wear the crew's black and brown with the red armband.
   - The Swarm leaves them alone and they leave the Swarm alone (truce): the strain in their blood.
   - The creep heals them.
   - They never die: below OSPREY.breakAt of their health one of them breaks off (smoke, nobody can hit him any more), runs for the
     nearest way out (g.ospreyExits) and is gone. That way the crew is never killed in a Corps mission and still alive in the next one.
   - Breaking one off is worth XP to the soldier who did it.
   - g.ospreyReturn(seconds): one who got away comes back out of a way out that much later, healed (the strain knits him), until
     g.ospreyWithdraw() ends it. Kill Order uses it, so the crew keeps coming as long as it has a reason to.
   - g.ospreyHeal(true) (Night Shift): one who breaks off runs to the nearest living hive instead, still out of reach, and the hive
     heals him (OSPREY.hiveHeal). Healed (OSPREY.healTo) he waits there, guarding it, until the mission sends them in again
     (g.ospreyReady()). Burn the hives and they have nowhere to heal: then they run for a way out and are gone.
   - The way back never goes through Dust: every route (to a hive, or to a way out) costs extra for each tile it runs within
     OSPREY.danger tiles of a soldier, a Sentry Gun or a zone the mission marks (g.ospreyAvoid). When the way to a hive runs
     through the camp, he takes the shaft behind him instead; underground (OSPREY.tunnel seconds) he comes up again next to the
     hive with the fewest soldiers round it, and heals there.
   - g.ospreyEmerge(list, at, seconds): they go underground (the hive tunnels) and come up again at `at`: a push from another side.
   - Their Captain throws a grenade at a group of OSPREY.nadeMin soldiers or more standing close together (OSPREY.nade…).
   - Their Engineer blows up your defences: he goes for the nearest Barricade, Sentry Gun or Relay Tower within OSPREY.demoSeek
     tiles, kneels at it for OSPREY.demoPlant seconds (break him off and the charge is never set) and then the charge blinks for
     OSPREY.demoFuse seconds and goes off (OSPREY.demoDmg on the structure, demoSplashDmg on soldiers next to it).
   - Squads (g.ospreySquad, and g.ospreyOrder with two or more): they march in a wedge (Pyro at the tip, Medic and Engineer at the
     back) at the pace of the slowest, break formation to fight when Dust is close, close up again and march on. At the goal they
     hold it and go for Dust only within a leash round it.
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
  xp:3,                                         /* XP for the soldier who breaks one off */
  hiveHeal:6,                                   /* HP per second at a hive (g.ospreyHeal: Night Shift) */
  healTo:0.9,                                   /* share of health at which one healing at a hive is back on his feet */
  spacing:1.1,                                  /* tiles between two of them in the wedge */
  contact:7,                                    /* tiles: Dust this close to a marching squad, and it breaks formation to fight */
  calm:3,                                       /* seconds without contact before a squad closes up again */
  danger:4,                                     /* tiles: a way back that runs this close to a soldier or a Sentry Gun counts as through the camp */
  dangerCost:25,                                /* how many tiles of detour he takes to stay clear of one such tile */
  tunnel:8,                                     /* seconds underground, from a shaft to a hive (Night Shift) */
  tunnelCost:6,                                 /* tiles: a shaft must be this much shorter or safer before he takes it instead of the open way to a hive */
  nadeEvery:14,                                 /* seconds between two grenades of their Captain */
  nadeMin:3,                                    /* soldiers standing within nadeRadius of each other before he throws one */
  nadeRadius:1.6,                               /* tiles: the blast of his grenade */
  nadeRange:6,                                  /* tiles: how far he throws it */
  nadeDmg:35,                                   /* damage of his grenade (× his damage) */
  demoSeek:8,                                   /* tiles: how far their Engineer looks for a Barricade, Sentry Gun or Relay Tower to blow up */
  demoPlant:3,                                  /* seconds he kneels at it to set the charge */
  demoFuse:4,                                   /* seconds the charge blinks before it goes off */
  demoDmg:600,                                  /* damage to the structure */
  demoSplash:1.6,                               /* tiles: the blast round it */
  demoSplashDmg:30,                             /* damage to soldiers in the blast */
  demoEvery:25                                  /* seconds before he goes for the next one */
};
const ospreyUnits=()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.osprey);
function ospreyState(){ return G.osprey||(G.osprey={ exits:[], broken:0, gone:0, barkAt:-99, back:0, queue:[], squads:[], heal:false, healed:0, avoid:[], charges:[] }); }
const ospreyHives=()=>G.ents.filter(e=>!e.dead&&e.type==='hive');
function ospreyMake(type,at,n,opt={}){ const k=G.diffKey||'normal', us=spawnAt(type,'osprey',at,n);
  for(const u of us){ u.osprey=true; u.truce='swarm'; u.sprite='crew_'+type; u.noBody=true;
    u.hp=u.maxHp=u.maxHp*(OSPREY.hp[k]||1)*(opt.tough||1); u.dmgMul=(u.dmgMul||1)*(OSPREY.dmg[k]||1); u.speedMul=(u.speedMul||1)*OSPREY.speed;
    u.home={x:u.x,y:u.y}; if(opt.hold) u.order={type:'hold'}; if(opt.hunt) u.ospHunt=true; if(opt.patrol) u.ospPatrol={ pts:opt.patrol, i:Math.floor(Math.random()*opt.patrol.length) };
    if(opt.spare) u.spare=opt.spare;   /* a unit (Kessler) they will not shoot */
    if(opt.capt) u.ospCapt=true; }
  return us; }
/* he breaks off: smoke, out of reach, off to the nearest way out */
function ospreyBreak(u,src,out){ if(u.ospBroke) return; const S=ospreyState(); if(out) u.ospOut=true; if(u.demo){ u.demo=null; if(!S.saidDemo){ S.saidDemo=true; say('Sgt. Kessler','Got him before he set it. Watch their Engineer, he goes for the guns.'); } } u.ospBroke=G.time; u.hp=Math.max(u.hp,1); u.invuln=true; u.target=null; u.order=null; u.path=null; u.ospHunt=false; u.ospPatrol=null;
  u.speedMul=(u.speedMul||1)*OSPREY.run; S.broken++;
  dustPuff(u.x,u.y,16); for(let i=0;i<10;i++) G.fx.push({k:'dust',x:u.x+rand(-10,10),y:u.y+rand(-10,6),vx:rand(-25,25),vy:rand(-30,-5),t:rand(1.2,2.2),max:2.2,r:rand(5,10)});
  G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'BREAKS OFF',col:'#e2556b'}); SFX.play('boom',u.x,u.y);
  if(src&&src.faction==='corps'&&src.vet&&!src.dead) gainXP(src,OSPREY.xp);
  if(G.time-S.barkAt>9){ S.barkAt=G.time; say(G.mission.ospreyVoice||'Osprey crew',pick(['I am hit. Falling back!','Smoke out! I am gone.','Breaking off. Do not wait for me.','Hit bad. Going to ground.']),'crew'); }
  ospreyLeave(u); ospreyRoute(u); }
/* a spot 1.5 to 3 tiles from a hive, where one of them heals */
function hiveSpot(h){ const c={x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)}, f=pick(freeTilesNear(c.x,c.y,10).filter(t=>Math.hypot(t.x-c.x,t.y-c.y)>=1.5&&Math.hypot(t.x-c.x,t.y-c.y)<=3))||freeTilesNear(c.x,c.y,1)[0]||c;
  return {x:(f.x+.5)*TILE,y:(f.y+.5)*TILE}; }
/* what a way back costs: its length in tiles, plus OSPREY.dangerCost for every tile that runs close to Dust (or through a zone the
   mission marks). The first two tiles do not count: that is where he stands now, in the middle of the fight. */
function routeCost(u,to,foes){ const S=ospreyState(), path=findPath(u.x,u.y,to.x,to.y,true); if(!path||!path.length) return Infinity;
  let len=0, bad=0, px=u.x, py=u.y; const D=OSPREY.danger*TILE;
  for(const p of path){ const L=Math.hypot(p.x-px,p.y-py), n=Math.max(1,Math.round(L/TILE));
    for(let k=1;k<=n;k++){ const x=px+(p.x-px)*k/n, y=py+(p.y-py)*k/n; len++; if(len<=2) continue;
      if(foes.some(f=>Math.hypot(f.x-x,f.y-y)<D)||S.avoid.some(a=>Math.hypot(a.x-x,a.y-y)<a.r)) bad++; }
    px=p.x; py=p.y; }
  return len+bad*OSPREY.dangerCost; }
/* the way back after breaking off: straight to a hive if that way is clear, else the shaft behind him (and underground to a hive) */
function ospreyRoute(u){ const S=ospreyState(), heal=S.heal&&!u.ospOut;
  const foes=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&((e.kind==='unit'&&!e.def.escort&&!e.downed)||(e.kind==='building'&&e.def.damage)));
  let best=null, bc=Infinity;
  if(heal) for(const h of ospreyHives()){ const sp=hiveSpot(h), c=routeCost(u,sp,foes); if(c<bc){ bc=c; best={h,sp}; } }
  if(heal&&!ospreyHives().length){ ospreyFlee(u); return; }   /* nowhere to heal: out, and gone */
  for(const a of S.exits){ const p=ptWorld(a); if(!p) continue; const c=routeCost(u,p,foes)+(heal?OSPREY.tunnelCost:0); if(c<bc){ bc=c; best={p}; } }
  if(!best){ ospreyVanish(u); return; }
  if(best.h){ u.ospHeal=best.h; u.ospTo=best.sp; u.order={type:'move',x:best.sp.x,y:best.sp.y}; setPath(u,best.sp.x,best.sp.y); return; }
  u.ospHeal=null; u.ospViaShaft=heal; u.ospTo=best.p; u.order={type:'move',x:best.p.x,y:best.p.y}; setPath(u,best.p.x,best.p.y); }
/* into the shaft: underground to the hive with the fewest soldiers round it, up again there, and heal */
function ospreyUnder(u){ u.ospTunnel=G.time+OSPREY.tunnel; u.ospViaShaft=false; u.order=null; u.path=null; u.target=null; dustPuff(u.x,u.y,10);
  G.fx.push({k:'text',x:u.x,y:u.y-24,t:1.2,max:1.2,txt:'INTO THE SHAFT',col:'#e2556b'}); }
/* g.ospreyEmerge: up again at the point the mission chose, spread round it, back in the fight */
function ospreyPopUp(u){ const p=u.ospUp, c={x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)}, f=pick(freeTilesNear(c.x,c.y,8))||c;
  u.ospTunnel=null; u.ospUp=null; u.x=(f.x+.5)*TILE; u.y=(f.y+.5)*TILE; u.order={type:'hold'}; u.home={x:u.x,y:u.y}; u.path=null; if(!u.ospBroke) u.invuln=false;
  dustPuff(u.x,u.y,12); G.fx.push({k:'text',x:u.x,y:u.y-28,t:1.2,max:1.2,txt:'UP',col:'#e2556b'}); }
/* their Captain: a grenade at the thickest group of soldiers in reach */
function ospreyGrenade(u){ if(G.time<(u.nadeAt||0)) return; const R=OSPREY.nadeRadius*TILE;
  const dust=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.downed&&!e.def.escort&&dist(e,u)<OSPREY.nadeRange*TILE);
  let best=null, bn=0; for(const e of dust){ const n=dust.filter(o=>Math.hypot(o.x-e.x,o.y-e.y)<R).length; if(n>bn){ bn=n; best=e; } }
  if(!best||bn<OSPREY.nadeMin) return; u.nadeAt=G.time+OSPREY.nadeEvery; const d=dist(u,best);
  G.shots.push({k:'grenade',sx:u.x,sy:u.y-10,tx:best.x,ty:best.y,t:0,dur:d/260+0.25,src:u,dmg:OSPREY.nadeDmg*(u.dmgMul||1),splash:R,faction:u.faction});
  const S=ospreyState(); if(G.time-(S.nadeSaid||-99)>20){ S.nadeSaid=G.time; say(G.mission.ospreyVoice||'Osprey crew',pick(['Grenade out!','Bunched up. Frag out!','Spread them out for me.']),'crew'); } }
/* ---- their Engineer: charges on your defences ---- */
const OSP_DEMO=['barricade','sentry','relay'];
function ospreyDemoPick(u){ if(G.time<(u.demoAt||0)||u.demo) return; let best=null, bd=OSPREY.demoSeek*TILE;
  for(const e of G.ents){ if(e.dead||e.kind!=='building'||e.faction!=='corps'||!OSP_DEMO.includes(e.type)) continue; const d=dist(e,u); if(d<bd&&!ospreyState().charges.some(c=>c.on===e.id)){ bd=d; best=e; } }
  if(!best) return; ospreyLeave(u); u.ospHunt=false; u.ospReady=false; u.target=null; u.demo={ on:best.id, t:0 };
  const a=Math.atan2(u.y-best.y,u.x-best.x), r=(best.def.size||1)*TILE*0.5+TILE*0.6, x=best.x+Math.cos(a)*r, y=best.y+Math.sin(a)*r; u.demo.x=x; u.demo.y=y; u.order={type:'move',x,y}; setPath(u,x,y); }
function ospreyDemoTick(u,dt){ const D=u.demo, b=G.ents.find(e=>e.id===D.on&&!e.dead); if(!b){ u.demo=null; u.order=null; return; }
  if(Math.hypot(u.x-D.x,u.y-D.y)>0.8*TILE){ if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:D.x,y:D.y}; setPath(u,D.x,D.y); } return; }
  u.order=null; u.target=null; u.stunT=0.2; u.face=b.x>=u.x?1:-1; if(!D.t){ G.pings.push({x:b.x,y:b.y,t:0,col:'#e2556b'}); say('Alert',`Someone is at the ${b.def.name}: a charge! Stop him!`,'alert'); }
  D.t+=dt; if(Math.random()<dt*8) G.fx.push({k:'spark',x:(u.x+b.x)/2+rand(-4,4),y:(u.y+b.y)/2-6,vx:rand(-20,20),vy:rand(-30,-5),t:0.3,max:0.3,col:'#ffb347'});
  if(D.t>=OSPREY.demoPlant){ const S=ospreyState(); S.charges.push({ on:b.id, x:(u.x+b.x*2)/3, y:(u.y+b.y*2)/3+4, at:G.time+OSPREY.demoFuse, by:u.id, name:b.def.name }); SFX.play('click',b.x,b.y);
    say('Alert',`Charge on the ${b.def.name}! Clear the area!`,'alert'); u.demo=null; u.demoAt=G.time+OSPREY.demoEvery; u.stunT=0;
    const a=Math.atan2(u.y-b.y,u.x-b.x), x=u.x+Math.cos(a)*4*TILE, y=u.y+Math.sin(a)*4*TILE; if(walkableP(x,y)){ u.order={type:'move',x,y}; setPath(u,x,y); } } }
function ospreyCharges(){ const S=G.osprey; if(!S||!S.charges||!S.charges.length) return;
  for(const c of [...S.charges]){ if(G.time<c.at) continue; S.charges.splice(S.charges.indexOf(c),1); const b=G.ents.find(e=>e.id===c.on&&!e.dead), src=G.ents.find(e=>e.id===c.by)||{faction:'osprey',dead:true};
    if(b) damage(b,OSPREY.demoDmg,src);
    for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'&&Math.hypot(e.x-c.x,e.y-c.y)<OSPREY.demoSplash*TILE) damage(e,OSPREY.demoSplashDmg,src);
    SFX.play('boom',c.x,c.y); G.fx.push({k:'boom',x:c.x,y:c.y,t:0.5,max:0.5,r:OSPREY.demoSplash*TILE}); addDecal(c.x,c.y,OSPREY.demoSplash*TILE*0.6,'rgba(10,10,12,.6)'); G.shake=Math.max(G.shake||0,0.4);
    debrisBurst(c.x,c.y,18,['#8a7a6a','#5a4632','#b3a58f','#ffd23f']); for(let i=0;i<16;i++) G.fx.push({k:'ember',x:c.x,y:c.y,vx:rand(-160,160),vy:rand(-180,10),t:rand(.3,.8),max:.8,col:pick(['#ff8a2a','#ffd23f','#ffffff'])}); } }
/* a set charge: a little block with a red light that blinks faster and faster, and a ring that runs out */
function ospreyDrawCharges(){ const S=G.osprey; if(!S||!S.charges) return;
  for(const c of S.charges){ if(!isVisible(c)&&!G.seen[Math.floor(c.y/TILE)*G.map.w+Math.floor(c.x/TILE)]) continue; const left=Math.max(0,c.at-G.time), p=left/OSPREY.demoFuse;
    ctx.fillStyle='#1a1b20'; ctx.fillRect(Math.round(c.x-4),Math.round(c.y-5),9,6); ctx.fillStyle='#c8401f'; ctx.fillRect(Math.round(c.x-3),Math.round(c.y-4),7,4);
    if(Math.sin(G.time*(8+(1-p)*30))>0){ ctx.fillStyle='#ff5a4f'; ctx.fillRect(Math.round(c.x),Math.round(c.y-7),2,2); }
    ctx.strokeStyle='#ffb347'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(c.x,c.y-2,9,-Math.PI/2,-Math.PI/2+p*Math.PI*2); ctx.stroke(); ctx.lineWidth=1; } }
function ospreyResurface(u){ u.ospTunnel=null; const hs=ospreyHives(); if(!hs.length){ ospreyVanish(u); return; }
  const near=h=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&Math.hypot(e.x-h.x,e.y-h.y)<8*TILE).length;
  const h=hs.reduce((a,b)=>near(a)<=near(b)?a:b), sp=hiveSpot(h); u.x=sp.x; u.y=sp.y; u.ospHeal=h; u.ospTo=sp; u.order=null; u.path=null;
  dustPuff(u.x,u.y,12); G.fx.push({k:'text',x:u.x,y:u.y-28,t:1.4,max:1.4,txt:'RESURFACES',col:'#c38bff'}); }
/* healed at the hive: he is back in the fight, and waits there for the next push */
function ospreyHealed(u){ const S=ospreyState(); u.ospBroke=null; u.ospHeal=null; u.invuln=false; u.speedMul=(u.speedMul||1)/OSPREY.run; u.ospReady=true; S.healed++;
  u.order={type:'hold'}; u.home={x:u.x,y:u.y}; G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.4,max:1.4,txt:'BACK ON HIS FEET',col:'#c38bff'}); }
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
  ospreyCharges();
  const list=ospreyUnits(); if(!list.length) return;
  for(const u of list){
    if(u.ospBroke&&u.ospHeal){ u.target=null;   /* on his way to a hive, or healing at it */
      if(u.ospHeal.dead){ u.ospHeal=null; ospreyRoute(u); continue; }
      const h=u.ospHeal, at=Math.hypot(u.x-h.x,u.y-h.y)<3.4*TILE||Math.hypot(u.x-u.ospTo.x,u.y-u.ospTo.y)<1.2*TILE;
      if(at){ u.stunT=0.3; u.order=null; u.hp=Math.min(u.maxHp,u.hp+OSPREY.hiveHeal*dt); if(Math.random()<dt*4) G.fx.push({k:'spark',x:u.x+rand(-6,6),y:u.y-8,vx:rand(-8,8),vy:rand(-30,-10),t:0.6,max:0.6,col:'#c38bff'});
        if(u.hp>=u.maxHp*OSPREY.healTo) ospreyHealed(u); }
      else if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:u.ospTo.x,y:u.ospTo.y}; setPath(u,u.ospTo.x,u.ospTo.y); }
      continue; }
    if(u.ospTunnel){ u.stunT=0.3; u.target=null; if(G.time>=u.ospTunnel){ if(u.ospUp) ospreyPopUp(u); else ospreyResurface(u); } continue; }   /* underground, on his way to a hive */
    if(u.ospBroke){ u.target=null; const p=u.ospTo;
      if(!p||G.time-u.ospBroke>OSPREY.vanish||Math.hypot(u.x-p.x,u.y-p.y)<1.4*TILE){ if(u.ospViaShaft&&S.heal&&!u.ospOut&&ospreyHives().length) ospreyUnder(u); else ospreyVanish(u); continue; }
      if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); }
      if(Math.random()<dt*3) G.fx.push({k:'dust',x:u.x,y:u.y,vx:rand(-10,10),vy:rand(-20,-5),t:1.2,max:1.2,r:rand(4,7)});
      continue; }
    if(u.hp<u.maxHp&&creepAt(u.x,u.y)>0.3) u.hp=Math.min(u.maxHp,u.hp+OSPREY.creepHeal*dt);
    if(u.demo) ospreyDemoTick(u,dt);
    if(u.spare&&u.target===u.spare) u.target=null; }
  S.sqT=(S.sqT||0)-dt; if(S.sqT<=0){ S.sqT=0.25; squadsTick(); }
  S.aiT=(S.aiT||0)-dt; if(S.aiT>0) return; S.aiT=0.5;
  const hit=list.filter(e=>!e.ospBroke&&e.hitAt!=null&&G.time-e.hitAt<3);
  for(const u of list){ if(u.ospBroke||u.dead||u.ospTunnel) continue;
    if(u.ospCapt) ospreyGrenade(u);
    if(u.type==='engineer'&&!u.ospReady) ospreyDemoPick(u);
    if(u.demo) continue;   /* busy with a charge */
    if(u.ospSquad) continue;   /* a squad looks after its own (squadsTick) */
    if(hit.length&&!u.target&&u.def.damage&&!(u.order&&u.order.type==='move')){ const h=hit.find(e=>e!==u&&dist(e,u)<OSPREY.help*TILE);
      if(h){ const foe=nearestOf(h,e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.faction==='corps'&&e!==u.spare&&dist(e,h)<9*TILE); if(foe) u.target=foe; } }
    if(u.target) continue;
    if(u.ospHunt&&G.time>(u.huntAt||0)){ u.huntAt=G.time+5; const t=nearestOf(u,e=>e.kind==='unit'&&!e.dead&&e.faction==='corps'&&!e.def.escort&&e!==u.spare);
      if(t){ u.home=null; u.order={type:'amove',x:t.x+rand(-24,24),y:t.y+rand(-24,24)}; setPath(u,u.order.x,u.order.y); } continue; }
    if(u.ospPatrol&&!u.order){ const P=u.ospPatrol, p=ptWorld(P.pts[P.i%P.pts.length]); P.i++; if(p){ u.home=null; u.order={type:'amove',x:p.x+rand(-20,20),y:p.y+rand(-20,20)}; setPath(u,u.order.x,u.order.y); } } } }
/* ---- squads: a wedge on the march, a fight when Dust comes close, the goal held with a leash ---- */
const OSP_WEDGE=[[0,0],[-1,-1],[-1,1],[-2,-2],[-2,2],[-2,0],[-3,-1],[-3,1],[-4,0]];   /* [back, side] in OSPREY.spacing */
const OSP_FRONT={ pyro:0, gunner:1, trooper:2, engineer:3, medic:4 };
function ospreyLeave(u){ const S=ospreyState(); if(u.ospLead){ u.speedMul/=u.ospLead; u.ospLead=null; } for(const q of S.squads) q.members=q.members.filter(m=>m!==u); u.ospSquad=null; }
function ospreySquad(list,at,opt={}){ const S=ospreyState(), p=ptWorld(at); if(!p) return null;
  const ms=(list||[]).filter(u=>u&&!u.dead&&!u.ospBroke&&u.osprey).sort((a,b)=>(OSP_FRONT[a.type]??2)-(OSP_FRONT[b.type]??2)||(b.ospCapt?1:0)-(a.ospCapt?1:0));
  if(!ms.length) return null; for(const u of ms){ ospreyLeave(u); u.ospHunt=false; u.ospPatrol=null; u.ospReady=false; u.home=null; u.target=null; u.order=null; u.path=null; }
  const q={ members:ms, goal:p, state:'march', leash:opt.leash||8, calm:0, head:Math.atan2(p.y-ms[0].y,p.x-ms[0].x), re:0 }; for(const u of ms) u.ospSquad=q; S.squads.push(q); return q; }
const sqCentre=ms=>({ x:ms.reduce((a,u)=>a+u.x,0)/ms.length, y:ms.reduce((a,u)=>a+u.y,0)/ms.length });
function sqSlot(q,i,bx,by){ const o=OSP_WEDGE[i]||[-(i-4),0], sp=OSPREY.spacing*TILE, c=Math.cos(q.head), s=Math.sin(q.head);
  const x=bx+(o[0]*c-o[1]*s)*sp, y=by+(o[0]*s+o[1]*c)*sp; return walkableP(x,y)?{x,y}:{x:bx,y:by}; }
function sqGo(u,x,y,type){ if(u.order&&u.order.type===type&&Math.hypot(u.order.x-x,u.order.y-y)<0.6*TILE) return; u.order={type,x,y}; setPath(u,x,y); }
function squadsTick(){ const S=ospreyState();
  for(const q of [...S.squads]){ q.members=q.members.filter(u=>!u.dead&&!u.ospBroke&&u.ospSquad===q);
    if(!q.members.length){ S.squads.splice(S.squads.indexOf(q),1); continue; }
    const ms=q.members, lead=ms[0], C=sqCentre(ms);
    const foe=nearestOf(C,e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.faction==='corps'&&!e.def.escort&&e!==lead.spare&&Math.hypot(e.x-C.x,e.y-C.y)<OSPREY.contact*TILE);
    const contact=!!foe||ms.some(u=>u.target&&u.target.kind==='unit');
    if(q.state==='march'){
      if(contact){ q.state='fight'; q.calm=0; for(const u of ms){ if(u.order&&u.order.type==='move') u.order=null; } continue; }
      const slow=Math.min(...ms.map(u=>speedOf(u)/(u.ospLead||1)));   /* the tip walks at the pace of the slowest */
      for(const u of ms) if(u!==lead&&u.ospLead){ u.speedMul/=u.ospLead; u.ospLead=null; }
      const want=Math.min(1,slow*0.9/(speedOf(lead)/(lead.ospLead||1))); if(lead.ospLead!==want){ lead.speedMul=lead.speedMul/(lead.ospLead||1)*want; lead.ospLead=want; }
      if(!lead.order||lead.order.type!=='amove'){ lead.order={type:'amove',x:q.goal.x,y:q.goal.y}; setPath(lead,q.goal.x,q.goal.y); }
      const nx=lead.path&&lead.path[lead.pi||0]; if(nx&&Math.hypot(nx.x-lead.x,nx.y-lead.y)>4) q.head=Math.atan2(nx.y-lead.y,nx.x-lead.x);
      for(let i=1;i<ms.length;i++){ const u=ms[i], s=sqSlot(q,i,lead.x,lead.y); if(Math.hypot(u.x-s.x,u.y-s.y)>0.5*TILE) sqGo(u,s.x,s.y,'move'); }
      if(Math.hypot(lead.x-q.goal.x,lead.y-q.goal.y)<2.5*TILE){ q.state='there'; if(lead.ospLead){ lead.speedMul/=lead.ospLead; lead.ospLead=null; } }
      continue; }
    if(lead.ospLead){ lead.speedMul/=lead.ospLead; lead.ospLead=null; }
    if(q.state==='fight'){ q.calm=contact?0:q.calm+0.25;
      for(const u of ms) if(!u.target&&Math.hypot(u.x-C.x,u.y-C.y)>6*TILE) sqGo(u,C.x,C.y,'amove');   /* nobody runs off on his own */
      if(foe) for(const u of ms) if(!u.target&&u.def.damage&&!u.def.heal&&(!u.order||u.order.type!=='amove')) sqGo(u,foe.x,foe.y,'amove');
      if(q.calm>=OSPREY.calm){ q.state=Math.hypot(C.x-q.goal.x,C.y-q.goal.y)<3*TILE?'there':'march'; for(const u of ms) u.order=null; }
      continue; }
    /* there: hold the goal; go for Dust only within the leash */
    const near=nearestOf(q.goal,e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.faction==='corps'&&!e.def.escort&&e!==lead.spare&&Math.hypot(e.x-q.goal.x,e.y-q.goal.y)<q.leash*TILE);
    ms.forEach((u,i)=>{ if(u.target) return; if(near&&u.def.damage&&!u.def.heal) sqGo(u,near.x,near.y,'amove'); else { const s=sqSlot(q,i,q.goal.x,q.goal.y); if(Math.hypot(u.x-s.x,u.y-s.y)>1*TILE) sqGo(u,s.x,s.y,'amove'); } }); } }
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
  ospreyOrder(list,at,mode='amove'){ const p=ptWorld(at); if(!p) return; const L=(list||[]).filter(u=>!u.dead&&!u.ospBroke);
    if(mode==='amove'&&L.length>=2){ ospreySquad(L,at); return; }   /* two or more: as a squad, in a wedge */
    for(const u of L){ ospreyLeave(u); u.ospHunt=false; u.ospPatrol=null; u.home=null; u.target=null;
      u.order={type:mode,x:p.x+rand(-20,20),y:p.y+rand(-20,20)}; setPath(u,u.order.x,u.order.y); } },
  ospreyHunt(list){ for(const u of list||[]) if(!u.dead&&!u.ospBroke){ ospreyLeave(u); u.ospHunt=true; u.ospPatrol=null; if(u.order&&u.order.type==='hold') u.order=null; } },
  /* ospreyWithdraw(list?): they all pull out, out of reach, to the ways out (the end of a mission) */
  ospreyWithdraw(list){ const S=ospreyState(); if(!list){ S.back=0; S.queue=[]; S.heal=false; } for(const u of (list||ospreyUnits())){ if(u.dead) continue; u.ospOut=true;
      if(u.ospTunnel){ ospreyVanish(u); continue; } if(!u.ospBroke) ospreyBreak(u,null,true); else { u.ospHeal=null; u.ospViaShaft=false; ospreyFlee(u); } } },
  /* ospreyAvoid([{ at, r }]): zones (r in tiles) their way back keeps clear of, e.g. the hospital */
  ospreyAvoid(list){ ospreyState().avoid=(list||[]).map(z=>{ const p=ptWorld(z.at); return p?{x:p.x,y:p.y,r:z.r*TILE}:null; }).filter(Boolean); },
  /* ospreySquad(list, at, { leash }): march there as one squad in a wedge, then hold it */
  ospreySquad:(list,at,opt)=>ospreySquad(list,at,opt),
  ospreyLeave:u=>ospreyLeave(u),
  /* ospreyEmerge(list, at, seconds): underground, and up again round `at` after that many seconds (out of reach meanwhile) */
  ospreyEmerge(list,at,sec=5){ const p=ptWorld(at); if(!p) return; for(const u of list||[]){ if(u.dead||u.ospBroke) continue; ospreyLeave(u); u.ospReady=false; u.invuln=true; u.target=null; u.order=null; u.path=null;
      u.ospTunnel=G.time+sec; u.ospUp=p; dustPuff(u.x,u.y,10); G.fx.push({k:'text',x:u.x,y:u.y-24,t:1,max:1,txt:'DOWN',col:'#e2556b'}); } },
  ospreyUnder:()=>ospreyUnits().filter(u=>u.ospTunnel).length,
  /* ospreyHeal(on): those who break off heal at the nearest hive instead of leaving; ospreyReady() = healed and waiting there */
  ospreyHeal(on){ ospreyState().heal=!!on; },
  ospreyReady:()=>ospreyUnits().filter(u=>!u.ospBroke&&u.ospReady),
  ospreyHealing:()=>ospreyUnits().filter(u=>u.ospBroke&&u.ospHeal).length,
  /* ospreyReturn(seconds): one who got away comes back that much later out of a way out, healed (0 = they stay away); ospreyWithdraw() ends it */
  ospreyReturn(s){ ospreyState().back=s||0; },
  ospreyComing:()=>(ospreyState().queue||[]).length,   /* gone, but coming back */
  ospreyNear(at,r){ const p=ptWorld(at); if(!p) return 0; return ospreyUnits().filter(u=>!u.ospBroke&&Math.hypot(u.x-p.x,u.y-p.y)<=r*TILE).length; },
  ospreySay:(who,text)=>say(who,text,'crew script')
}; }
