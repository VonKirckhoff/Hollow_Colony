'use strict';
/* ---------- 2i. buildings ---------- */
function updateBuilding(b,dt){
  b.flash=Math.max(0,b.flash-dt);
  if(b.type==='cocoon'){ b.hatchT-=dt; if(b.hatchT<=0){ b.dead=true; const u=makeUnit(b.hatchType,'swarm',b.x,b.y); u.role='hunt'; if(isVisible(b)) SFX.play('hatch',b.x,b.y); G.fx.push({k:'boom',x:b.x,y:b.y,t:0.3,max:0.3,r:16,col:'#a6ff4a'}); addDecal(b.x,b.y,10,'rgba(90,190,30,.55)'); if(G.sel.includes(b)){G.sel=G.sel.filter(x=>x!==b);G.selDirty=true;} } return; }
  if(!b.built) return;
  const d=b.def;
  if(d.regen){ b.calm=(b.calm||0)+dt; if(b.calm>d.regenDelay && b.hp<b.maxHp) b.hp=Math.min(b.maxHp,b.hp+d.regen*dt); }
  if(d.income) G.salvage+=d.income*dt;
  if(d.capture){
    const R1=2.5*TILE, R2=3.5*TILE;
    const ours=G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.def.convoy&&dist(e,b)<R1);
    const theirs=G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,b)<R2);
    b.state = ours&&theirs ? 'contested' : ours ? 'ours' : theirs ? 'theirs' : 'idle';
    if(b.state==='ours'){ b.cap=Math.min(1,(b.cap||0)+dt/d.captureTime); if(b.cap>=1 && !b.owned){ b.owned=true; SFX.play('complete'); say('Uplink',`${b.label||'Beacon'} secured.`,'sys'); G.pings.push({x:b.x,y:b.y,t:0,col:'#5fe3b0'}); } }
    if(b.state==='theirs'){ b.cap=Math.max(0,(b.cap||0)-dt/d.loseTime); if(b.cap<=0 && b.owned){ b.owned=false; SFX.play('alarm'); say('Alert',`${b.label||'Beacon'} lost to the Swarm!`,'alert'); G.pings.push({x:b.x,y:b.y,t:0,col:'#ff5a4f'}); } }
  }
  if(d.reinforce && b.flight){ b.flight.t-=dt;
    if(b.flight.t<=0){ const cargo=b.flight.cargo; b.flight=null;
      for(const type of cargo){ const u=spawnNearBuilding(type,'corps',b,b.rally); if(!u) continue; fromReserve(u); G.stats.trained++;
        if(b.rally){ const n=(b.rallyN=(b.rallyN||0)+1), a=n*2.4, r=n===1?0:12+4*Math.sqrt(n), rx=b.rally.x+Math.cos(a)*r, ry=b.rally.y+Math.sin(a)*r; u.order={type:'move',x:walkableP(rx,ry)?rx:b.rally.x,y:walkableP(rx,ry)?ry:b.rally.y}; setPath(u,u.order.x,u.order.y); } else u.home={x:u.x,y:u.y}; }
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
