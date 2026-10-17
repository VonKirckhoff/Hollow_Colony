'use strict';
/* ---------- 2i. buildings ---------- */
function updateBuilding(b,dt){
  b.flash=Math.max(0,b.flash-dt);
  if(b.type==='cocoon'){ b.hatchT-=dt; if(b.hatchT<=0){ b.dead=true; const u=makeUnit(b.hatchType,'swarm',b.x,b.y); u.role='hunt'; if(isVisible(b)) SFX.play('hatch',b.x,b.y); G.fx.push({k:'boom',x:b.x,y:b.y,t:0.3,max:0.3,r:16,col:'#a6ff4a'}); addDecal(b.x,b.y,10,'rgba(90,190,30,.55)'); if(G.sel.includes(b)){G.sel=G.sel.filter(x=>x!==b);G.selDirty=true;} } return; }
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
  if(d.reinforce && b.flight){ b.flight.t-=dt;
    if(b.flight.t<=0){ const cargo=b.flight.cargo, rally=b.flight.rally||b.rally, otype=b.flight.rally?'amove':'move'; b.flight=null; if(rally!==b.rally) b.rallyN=0;
      for(const type of cargo){ const u=spawnNearBuilding(type,'corps',b,rally); if(!u) continue; fromReserve(u); G.stats.trained++;
        if(rally){ const n=(b.rallyN=(b.rallyN||0)+1), a=n*2.4, r=n===1?0:12+4*Math.sqrt(n), rx=rally.x+Math.cos(a)*r, ry=rally.y+Math.sin(a)*r; u.order={type:otype,x:walkableP(rx,ry)?rx:rally.x,y:walkableP(rx,ry)?ry:rally.y}; setPath(u,u.order.x,u.order.y); } else u.home={x:u.x,y:u.y}; }
      for(let i=0;i<14;i++) G.fx.push({k:'ember',x:b.x+rand(-40,40),y:b.y+rand(-30,30),vx:rand(-60,60),vy:rand(-50,10),t:0.7,max:0.7,col:'#9aa0ad'});
      SFX.play('complete'); say('Dropship Kestrel',`${cargo.length} reinforcement${cargo.length>1?'s':''} on the ground.`,'sys'); G.selDirty=true; } }
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
  if(eng){ b.arm+=dt/b.def.armTime; if(C) C.state='arming'; eng.face=b.x>eng.x?1:-1; if(Math.random()<dt*6) G.fx.push({k:'spark',x:b.x+rand(-6,6),y:b.y-4,vx:rand(-30,30),vy:rand(-50,-10),t:0.3,max:0.3,col:'#ffd23f'}); }
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
