'use strict';
/* ---------- 2j. economy & production ---------- */
/* Optional per-mission troop cap (landingZone.max): units on the field + everything ordered or in training. */
function troopCount(){ let n=0; for(const e of G.ents){ if(e.dead||e.faction!=='corps') continue;
    if(e.kind==='unit'&&!e.def.convoy&&!e.def.escort) n++; if(e.kind==='building'){ n+=e.queue.length; if(e.flight) n+=e.flight.cargo.length; } } return n; }
function troopCap(){ const lz=G.mission.landingZone; return lz&&lz.max?lz.max:Infinity; }
function supply(){ let used=0, cap=0;
  for(const e of G.ents){ if(e.dead||e.faction!=='corps') continue;
    if(e.kind==='unit') used+=e.def.supply||0;
    if(e.kind==='building'){ if(e.built) cap+=e.def.supply||0; for(const q of e.queue) used+=UNITS[q].supply||0; } }
  return {used,cap:Math.min(cap,MAX_SUPPLY)}; }
function train(b,type){
  const d=UNITS[type], s=supply();
  if(!b.built) return;
  if(b.queue.length>=5){ toast('Queue is full.'); return; }
  if(G.salvage<d.cost){ toast('Not enough salvage.'); return; }
  if(troopCount()>=troopCap()){ toast(`Troop limit reached (${troopCap()}).`); return; }
  if(!G.mission.landingZone && s.used+d.supply>s.cap){ toast(s.cap>=MAX_SUPPLY?'Supply maximum reached.':'Supply limit reached. Build Relay Towers.'); return; }
  G.salvage-=d.cost; b.queue.push(type); G.selDirty=true;
}
function orderDrop(b,type){
  const d=UNITS[type], L=G.mission.landingZone||{}, cap=b.def.cargo||6;
  if(!b.built) return;
  if(troopCount()>=troopCap()){ toast(`Troop limit reached (${troopCap()}). Reinforcements replace losses only.`); return; }
  if(G.salvage<d.cost){ toast('Not enough salvage.'); return; }
  if(b.flight && b.flight.cargo.length>=cap){ toast('This dropship is full. Wait for the next one.'); return; }
  G.salvage-=d.cost;
  if(!b.flight){ b.flight={ t:L.delay||25, total:L.delay||25, cargo:[] }; say('Dropship Kestrel',`Reinforcements ordered. Wheels down in ${Math.round(b.flight.t)} seconds.`); }
  b.flight.cargo.push(type); SFX.play('ack'); G.selDirty=true;
}
function cancelTrain(b,i){ const type=b.queue[i]; if(!type) return; G.salvage+=UNITS[type].cost; b.queue.splice(i,1); if(i===0) b.prodT=0; G.selDirty=true; }
/* Per-mission limits, e.g. limits:{ sentry:3 }. Built, under construction and on-the-way all count;
   a sentry folded up on an Engineer's back does not, so you leapfrog by packing one up first. */
function fielded(type){ let n=0; for(const e of G.ents){ if(e.dead||e.faction!=='corps') continue;
    if(e.kind==='building'&&e.type===type) n++; else if(e.kind==='unit'&&e.order&&e.order.type==='build'&&!e.order.site&&e.order.btype===type) n++; } return n; }
function limitOf(type){ const l=(G.mission.limits||{})[type]; return l===undefined?Infinity:l; }
function atLimit(type){ return fielded(type)>=limitOf(type); }
function limitMsg(type){ return `Limit reached: ${limitOf(type)} ${BUILDINGS[type].name}s in this mission. Pack one up first.`; }
function siteAt(tx,ty){ return G.map.sites.find(s=>s.x===tx&&s.y===ty); }
function canPlace(type,tx,ty,ignoreFog){
  const d=BUILDINGS[type];
  if(d.needsSite && !siteAt(tx,ty)) return false;
  if(G.ents.some(e=>!e.dead&&e.def&&e.def.ground&&tx<e.tx+e.size&&tx+d.size>e.tx&&ty<e.ty+e.size&&ty+d.size>e.ty)) return false;
  for(let y=ty;y<ty+d.size;y++) for(let x=tx;x<tx+d.size;x++){
    if(!walkableT(x,y)) return false;
    if(!ignoreFog && !G.seen[y*G.map.w+x]) return false;
  }
  return keepsConnected(tx,ty,d.size);
}
/* A structure may never cut the map in two: every free tile around its footprint must still be able to
   reach every other one once the footprint is blocked. This is what stops units getting walled in. */
let CC=null;
function keepsConnected(tx,ty,size){
  const W=G.map.w, H=G.map.h, ring=[], inFoot=(x,y)=>x>=tx&&x<tx+size&&y>=ty&&y<ty+size;
  for(let y=ty-1;y<=ty+size;y++) for(let x=tx-1;x<=tx+size;x++){ if(!inFoot(x,y) && walkableT(x,y)) ring.push(y*W+x); }
  if(!ring.length) return false;
  if(!CC||CC.seen.length!==W*H) CC={ seen:new Uint32Array(W*H), gen:0, q:new Int32Array(W*H) };
  const gen=++CC.gen, seen=CC.seen, q=CC.q; let h=0, tl=0; q[tl++]=ring[0]; seen[ring[0]]=gen;
  let need=new Set(ring); need.delete(ring[0]);
  while(h<tl && need.size){ const i=q[h++], x=i%W, y=i/W|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; if(!walkableT(nx,ny)||inFoot(nx,ny)) continue; const ni=ny*W+nx; if(seen[ni]===gen) continue; seen[ni]=gen; need.delete(ni); q[tl++]=ni; } }
  return need.size===0;
}
/* Safety net: any unit that still ends up in a tiny enclosed pocket is moved to open ground. */
function rescueTrapped(){
  const W=G.map.w, H=G.map.h, N=W*H, comp=new Int32Array(N).fill(-1), sizes=[], q=new Int32Array(N);
  for(let s=0;s<N;s++){ if(comp[s]>=0||G.block[s]) continue; const id=sizes.length; let h=0,tl=0; q[tl++]=s; comp[s]=id;
    while(h<tl){ const i=q[h++], x=i%W, y=i/W|0; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const ni=ny*W+nx; if(comp[ni]>=0||G.block[ni]) continue; comp[ni]=id; q[tl++]=ni; } }
    sizes.push(tl); }
  for(const u of G.ents){ if(u.dead||u.kind!=='unit') continue; const tx=Math.floor(u.x/TILE), ty=Math.floor(u.y/TILE), c=comp[ty*W+tx];
    if(c<0||sizes[c]>=30) continue;
    let best=null, bd=Infinity; for(let r=1;r<20&&!best;r++) for(let y=ty-r;y<=ty+r;y++) for(let x=tx-r;x<=tx+r;x++){ if(x<0||y<0||x>=W||y>=H) continue; const k=comp[y*W+x]; if(k<0||sizes[k]<30) continue; const d=(x-tx)**2+(y-ty)**2; if(d<bd){ bd=d; best={x,y}; } }
    if(best){ u.x=(best.x+.5)*TILE; u.y=(best.y+.5)*TILE; u.path=null; u.goal=null; G.fx.push({k:'boom',x:u.x,y:u.y,t:0.3,max:0.3,r:14,col:'#5fe3b0'}); } }
}
