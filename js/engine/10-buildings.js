'use strict';
/* ---------- 2i. buildings ---------- */
function updateBuilding(b,dt){
  b.flash=Math.max(0,b.flash-dt);
  if(b.type==='cocoon'){ b.hatchT-=dt; if(b.husk) huskCocoonThink(b,dt); if(b.hatchT<=0){ b.dead=true; const u=makeUnit(b.hatchType,'swarm',b.x,b.y); u.role='hunt'; if(u.def.founder) huskHatched(u); if(b.avatar){ u.role='avatar'; setAvatar(u); } if(isVisible(b)) SFX.play('hatch',b.x,b.y); G.fx.push({k:'boom',x:b.x,y:b.y,t:0.3,max:0.3,r:16,col:'#a6ff4a'}); addDecal(b.x,b.y,10,'rgba(90,190,30,.55)'); if(G.sel.includes(b)){G.sel=G.sel.filter(x=>x!==b);G.selDirty=true;} } return; }
  if(b.def.smoke && Math.random()<dt*10){   /* a smouldering wreck: smoke rising, now and then a spark */
    G.fx.push({k:'dust',x:b.x+rand(-26,26),y:b.y+rand(-14,10),vx:rand(-6,6),vy:rand(-34,-18),t:rand(2.2,3.6),max:3.6,r0:rand(5,9),r1:rand(16,28),col:pick(['#77726c','#8a857e','#5e5a55'])});
    if(Math.random()<0.25) G.fx.push({k:'ember',x:b.x+rand(-14,14),y:b.y+rand(-10,4),vx:rand(-20,20),vy:rand(-60,-30),t:0.8,max:0.8,col:pick(['#ff8a2a','#ffd23f'])}); }
  if(!b.built) return;
  const d=b.def;
  if(d.generator) updateGenerator(b,dt);
  if(d.armTime) updateChargeSite(b,dt);
  if(d.fuse) updateCharge(b,dt);
  if(d.regen){ b.calm=(b.calm||0)+dt; if(b.calm>d.regenDelay && b.hp<b.maxHp) b.hp=Math.min(b.maxHp,b.hp+d.regen*dt); }
  if(d.income) G.salvage+=d.income*dt;
  if(d.capture){
    const R1=2.5*TILE, R2=3.5*TILE;
    const ours=G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&dist(e,b)<R1);
    const theirs=G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,b)<R2);
    b.state = ours&&theirs ? 'contested' : ours ? 'ours' : theirs ? 'theirs' : 'idle';
    if(b.state==='ours'){ b.cap=Math.min(1,(b.cap||0)+dt/d.captureTime); if(b.cap>=1 && !b.owned){ b.owned=true; SFX.play('complete'); say('Uplink',`${b.label||'Beacon'} secured.`,'sys'); G.pings.push({x:b.x,y:b.y,t:0,col:'#5fe3b0'}); } }
    if(b.state==='theirs'){ b.cap=Math.max(0,(b.cap||0)-dt/d.loseTime); if(b.cap<=0 && b.owned){ b.owned=false; SFX.play('alarm'); say('Alert',`${b.label||'Beacon'} lost to the Swarm!`,'alert'); G.pings.push({x:b.x,y:b.y,t:0,col:'#ff5a4f'}); } }
  }
  if(d.reinforce) updateShip(b,dt);
  if(d.reinforce && b.flight){ b.flight.t-=dt; if(b.flight.ang===undefined) b.flight.ang=rand(-2.7,-0.45);
    if(b.flight.t<5 && !b.flight.heard){ b.flight.heard=true; SFX.play('engine',b.x,b.y); }
    if(b.flight.t<1.6 && Math.random()<dt*30) dustPuff(b.x,b.y,1);
    if(b.flight.t<=0){ const cargo=b.flight.cargo, rally=b.flight.rally||b.rally, otype=b.flight.rally?'amove':'move', pickup=b.flight.pickup, ang=b.flight.ang; b.flight=null; if(rally!==b.rally) b.rallyN=0;
      b.ship={ phase:pickup?'parked':'ground', t:2.6, ang }; dustPuff(b.x,b.y,22); SFX.play('land',b.x,b.y);
      for(const type of cargo){ if(!UNITS[type]){ dropSupply(b,type); continue; }   /* a folded-up structure (a Sentry Gun): set down on the pad for an Engineer */ const u=spawnNearBuilding(type,'corps',b,rally); if(!u) continue; fromReserve(u); G.stats.trained++;
        if(rally){ const n=(b.rallyN=(b.rallyN||0)+1), a=n*2.4, r=n===1?0:12+4*Math.sqrt(n), rx=rally.x+Math.cos(a)*r, ry=rally.y+Math.sin(a)*r; u.order={type:otype,x:walkableP(rx,ry)?rx:rally.x,y:walkableP(rx,ry)?ry:rally.y}; setPath(u,u.order.x,u.order.y); } else u.home={x:u.x,y:u.y}; }
      const men=cargo.filter(t=>UNITS[t]).length; if(men){ SFX.play('complete'); say('Dropship Kestrel',`${men} reinforcement${men>1?'s':''} on the ground.`,'sys'); } G.selDirty=true; } }
  if(d.trains && b.queue.length){
    b.prodT+=dt; const type=b.queue[0];
    if(b.prodT>=UNITS[type].buildTime){
      const u=spawnNearBuilding(type,b.faction,b,b.rally); if(u) fromReserve(u);
      if(u){ b.prodT=0; b.queue.shift(); G.stats.trained++; SFX.play('ready'); G.selDirty=true; if(b.rally){ const n=(b.rallyN=(b.rallyN||0)+1), a=n*2.4, r=n===1?0:12+4*Math.sqrt(n); const rx=b.rally.x+Math.cos(a)*r, ry=b.rally.y+Math.sin(a)*r; const ok=walkableP(rx,ry); u.order={type:'move',x:ok?rx:b.rally.x,y:ok?ry:b.rally.y}; setPath(u,u.order.x,u.order.y); } else u.home={x:u.x,y:u.y}; }
    }
  }
  if(d.attack){
    b.cd-=dt; b.acq-=dt;
    if(b.acq<=0){ b.acq=0.25; if(!validTarget(b,b.target) || dist(b,b.target)-b.target.r>d.range*TILE) b.target=findTarget(b,d.range); }
    if(b.target && validTarget(b,b.target)){ b.angle=Math.atan2(b.target.y-b.y,b.target.x-b.x); if(b.cd<=0 && dist(b,b.target)-b.target.r<=d.range*TILE) fire(b,b.target); }
  }
}

/* Generators (mission objects): start broken, come online when fully repaired, shut down when badly damaged.
   A running generator lights the area around it (see computeFog). */
function updateGenerator(b,dt){
  const d=b.def;
  if(b.powered===undefined){ b.powered=false; b.hp=b.maxHp*d.startHp; }
  if(!b.powered && b.hp>=b.maxHp-0.5){ b.powered=true; SFX.play('complete',b.x,b.y); say('Colony grid',`${b.label||'Generator'} online.`,'sys'); G.pings.push({x:b.x,y:b.y,t:0,col:'#ffd23f'}); G.selDirty=true; }
  else if(b.powered && b.hp<b.maxHp*d.failAt){ b.powered=false; SFX.play('alarm',b.x,b.y); say('Alert',`${b.label||'Generator'} is down! Repair it.`,'alert'); G.pings.push({x:b.x,y:b.y,t:0,col:'#ff5a4f'}); G.selDirty=true; }
  b.status = b.powered ? {txt:'ONLINE',col:'#ffd23f'} : {txt:`OFFLINE ${Math.floor(b.hp/b.maxHp*100)}%`,col:'#ff9a3c'};
}
/* Seismic charges: an Engineer standing still on a site arms a charge; the charge must survive its fuse. */
function updateChargeSite(b,dt){
  const eng=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.def.builder&&!e.moving&&Math.hypot(e.x-b.x,e.y-b.y)<1.6*TILE);
  const C=G.charges&&G.charges[b.tag];
  if(eng){ b.arm+=dt*(hasPerk(eng)?PERKS.engineer.speed:1)/b.def.armTime; if(C) C.state='arming'; eng.face=b.x>eng.x?1:-1; if(Math.random()<dt*6) G.fx.push({k:'spark',x:b.x+rand(-6,6),y:b.y-4,vx:rand(-30,30),vy:rand(-50,-10),t:0.3,max:0.3,col:'#ffd23f'}); }
  else if(C && C.state==='arming' && b.arm>0) C.state='site';
  b.status={ txt: b.arm>0 ? `ARMING ${Math.floor(b.arm*100)}%` : 'CHARGE SITE', col:'#ff9a3c' };
  if(b.arm>=1){ b.dead=true; const c=makeBuilding('charge','corps',b.tx,b.ty,true); c.tag=b.tag; c.fuse=c.def.fuse; G.stats.built--;
    if(C){ C.state='armed'; C.charge=c; } SFX.play('ack',b.x,b.y); say('Engineer',`Charge armed. ${c.def.fuse} seconds. Keep them off it!`,'sys'); G.selDirty=true; }
}
function updateCharge(b,dt){
  b.fuse-=dt; b.status={ txt:`${Math.ceil(b.fuse)}`, col: b.fuse<10 && Math.floor(b.fuse*4)%2 ? '#ffffff' : '#ff5a4f' };
  if(b.fuse>0) return;
  const d=b.def; b.blown=true; b.dead=true; setBlock(b,0);
  for(const e of G.ents){ if(e.dead||e.faction==='corps'||e.kind==='crate'||e.invuln||(e.def&&e.def.scenery)) continue; if(Math.hypot(e.x-b.x,e.y-b.y)<d.blast*TILE) damage(e,d.blastDamage,{faction:'corps',dead:true}); }
  for(let i=0;i<60;i++) G.fx.push({k:'ember',x:b.x+rand(-20,20),y:b.y+rand(-20,20),vx:rand(-220,220),vy:rand(-260,40),t:rand(.6,1.4),max:1.4,col:pick(['#ff8a2a','#ffd23f','#ffffff','#8a8f9c'])});
  G.fx.push({k:'boom',x:b.x,y:b.y,t:0.9,max:0.9,r:d.blast*TILE}); addDecal(b.x,b.y,d.blast*TILE*0.7,'rgba(10,10,12,.7)'); SFX.play('boom',b.x,b.y); G.shake=Math.max(G.shake||0,0.8);
  if(G.charges&&G.charges[b.tag]) G.charges[b.tag].state='blown';
}
/* A destroyed charge leaves its site behind, so an Engineer can arm a new one. */
function chargeLost(c){ const s=makeBuilding('chargesite','corps',c.tx,c.ty,true); s.tag=c.tag; s.invuln=true; s.arm=0; G.stats.built--;
  if(G.charges&&G.charges[c.tag]) G.charges[c.tag].state='site'; say('Alert','The charge is destroyed! Arm it again.','alert'); }

/* ---------- supply drops: a folded-up structure flown in by dropship (g.supplyDrop) ----------
   It is set down on the pad as a crate. An Engineer with free hands who walks onto it picks it up and carries it,
   exactly like a sentry he packed up himself (D to deploy). The Swarm leaves it alone. */
function dropSupply(lz,type){ const a=rand(0,Math.PI*2), r=TILE*0.6, x=lz.x+Math.cos(a)*r, y=lz.y+TILE*0.4+Math.sin(a)*r*0.4;
  G.ents.push({ id:NEXT_ID++, kind:'crate', supply:type, x, y, r:10, faction:'none', hp:toughHp(type) });
  G.pings.push({x,y,t:0,col:'#ffb347'}); SFX.play('complete');
  say('Dropship Kestrel',`${BUILDINGS[type].name} is on the pad, folded up. Send an Engineer to pick it up.`,'sys'); }
/* an Engineer with free hands who walks onto a supply crate takes it */
function supplyPickup(c){ const u=G.ents.find(e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.faction==='corps'&&e.def.builder&&!e.carry&&dist(e,c)<e.r+16); if(!u) return;
  c.dead=true; u.carry={type:c.supply,hp:c.hp}; SFX.play('ready'); bark(u,'build');
  G.fx.push({k:'text',x:c.x,y:c.y-14,t:1.4,max:1.4,txt:BUILDINGS[c.supply].name.toUpperCase(),col:'#ffb347'});
  say('Engineer',`Got the ${BUILDINGS[c.supply].name}. Tell me where you want it.`,'sys'); G.selDirty=true; }
/* how many of a portable type the Lunar Corps has anywhere: standing, being set up, on an Engineer's back, on a pad or on a dropship */
function suppliesOf(type){ let n=0; for(const e of G.ents){ if(e.dead) continue;
    if(e.kind==='building'&&e.faction==='corps'&&e.type===type) n++;
    else if(e.kind==='unit'&&e.carry&&e.carry.type===type) n++;
    else if(e.kind==='crate'&&e.supply===type) n++;
    if(e.flight&&e.flight.cargo) n+=e.flight.cargo.filter(t=>t===type).length; } return n; }
function drawSupply(c,now){ const a=ARTC[BUILDINGS[c.supply].art], bob=Math.sin(now/300+c.id)*1.5, p=0.5+0.5*Math.sin(now/260);
  ctx.strokeStyle=`rgba(255,179,71,${0.35+0.45*p})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(c.x,c.y+4,15,8,0,0,Math.PI*2); ctx.stroke();
  ctx.drawImage(ARTC.crate,Math.round(c.x-13),Math.round(c.y-8+bob),26,21);
  ctx.globalAlpha=0.95; ctx.drawImage(a,Math.round(c.x-9),Math.round(c.y-24+bob),18,18); ctx.globalAlpha=1; }
