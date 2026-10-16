'use strict';
/* ---------- 2f. movement ---------- */
function speedOf(u){ return u.def.speed*(u.carry?(u.def.carrySpeed||0.6):1)*(u.speedMul||1); }
function setPath(u,x,y){ u.path=findPath(u.x,u.y,x,y); u.pi=0; u.goal={x,y}; u.repathAt=G.time+1.2; }
function stepMove(u,dt){
  if(!u.path||u.pi>=u.path.length) return true;
  const wp=u.path[u.pi]; const dx=wp.x-u.x, dy=wp.y-u.y, d=Math.hypot(dx,dy);
  const last=u.pi===u.path.length-1;
  if(d<(last?3:8)){ u.pi++; u.stuckN=0; return u.pi>=u.path.length; }
  const tile=tileAt(G.map,Math.floor(u.x/TILE),Math.floor(u.y/TILE));
  const pace=(u.order&&u.order.pace)||speedOf(u); const sp=Math.min(speedOf(u),pace)*(tile==='~'?0.8:1)*dt, k=Math.min(1,sp/d);
  if(u.ghostT>0) u.ghostT-=dt;
  moveBy(u,dx*k,dy*k); if(Math.abs(dx)>2) u.face=dx>0?1:-1; u.moving=true;
  // Stuck detection: a walking unit must get closer to its next waypoint. If it has not gained ground for
  // 0.7 s (pressed into a corner, or pushed back by friends), it may squeeze past friends for a moment and
  // re-plans along tile centres; the second time it also steps back to the centre of its tile.
  if(u.wpKey!==u.pi+'/'+u.path.length){ u.wpKey=u.pi+'/'+u.path.length; u.bestD=d; u.stuckT=0; }
  if(d<u.bestD-2){ u.bestD=d; u.stuckT=0; }
  else { u.stuckT=(u.stuckT||0)+dt;
    if(u.stuckT>0.7){ u.stuckT=0; u.stuckN=(u.stuckN||0)+1; u.ghostT=2; const g=u.path[u.path.length-1];
      if(u.stuckN>=2){ const c={x:(Math.floor(u.x/TILE)+.5)*TILE,y:(Math.floor(u.y/TILE)+.5)*TILE};
        if(walkableP(c.x,c.y)){ u.x=c.x; u.y=c.y; } else { const f=nearestWalkable(Math.floor(u.x/TILE),Math.floor(u.y/TILE)); if(f){ u.x=(f.x+.5)*TILE; u.y=(f.y+.5)*TILE; } } }
      u.path=findPath(u.x,u.y,g.x,g.y,true)||u.path; u.pi=0; u.goal={x:g.x,y:g.y}; u.repathAt=G.time+2; u.wpKey=null; } }
  return false;
}
function moveBy(u,mx,my){
  const nx=u.x+mx, ny=u.y+my;
  if(walkableP(nx,ny)){ u.x=nx; u.y=ny; return; }
  if(walkableP(nx,u.y)){ u.x=nx; return; }
  if(walkableP(u.x,ny)){ u.y=ny; return; }
  for(const s of [0.785,-0.785]){ const c=Math.cos(s), si=Math.sin(s), rx=mx*c-my*si, ry=mx*si+my*c; if(walkableP(u.x+rx,u.y+ry)){ u.x+=rx; u.y+=ry; return; } }
}
function goTo(u,x,y,dt,repath=1.0){
  if(!u.goal || Math.hypot(u.goal.x-x,u.goal.y-y)>20 || G.time>u.repathAt || !u.path){ u.path=findPath(u.x,u.y,x,y); u.pi=0; u.goal={x,y}; u.repathAt=G.time+repath; }
  return stepMove(u,dt);
}
function separate(){
  const units=G.ents.filter(e=>e.kind==='unit'&&!e.dead), cell=48, grid=new Map();
  for(const u of units){ const k=(u.x/cell|0)+','+(u.y/cell|0); let a=grid.get(k); if(!a) grid.set(k,a=[]); a.push(u); }
  for(const u of units){
    const cx=u.x/cell|0, cy=u.y/cell|0;
    for(let oy=-1;oy<=1;oy++) for(let ox=-1;ox<=1;ox++){
      const a=grid.get((cx+ox)+','+(cy+oy)); if(!a) continue;
      for(const v of a){ if(v.id<=u.id) continue; if(u.ghostT>0||v.ghostT>0) continue; const dx=v.x-u.x, dy=v.y-u.y, d=Math.hypot(dx,dy)||0.01, min=(u.r+v.r)*0.95;
        if(d<min){ let nx=dx/d, ny=dy/d; if(d<1){ const a=((u.id*7919+v.id*104729)%628)/100; nx=Math.cos(a); ny=Math.sin(a); }
          const push=Math.max(1,(min-d)*0.35), px=nx*push, py=ny*push; moveBy(u,-px,-py); moveBy(v,px,py); } }
    }
    if(!walkableP(u.x,u.y)){ const t=nearestWalkable(Math.floor(u.x/TILE),Math.floor(u.y/TILE)); if(t){ u.x+=((t.x+.5)*TILE-u.x)*0.3; u.y+=((t.y+.5)*TILE-u.y)*0.3; } }
  }
}
