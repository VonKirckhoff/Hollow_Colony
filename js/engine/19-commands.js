'use strict';
/* ---------- 2r. commands ---------- */
function myUnits(){ return G.sel.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.dead&&!e.def.convoy); }
function cmdStop(){ for(const u of myUnits()){ u.order=null; u.marchIdle=null; u.target=null; u.path=null; u.home={x:u.x,y:u.y}; } }
function cmdHold(){ for(const u of myUnits()){ u.order={type:'hold'}; u.target=null; u.path=null; } }
function startPlacing(type,deploy){ const d=BUILDINGS[type]; if(atLimit(type)){ toast(limitMsg(type)); return; } if(!deploy && G.salvage<d.cost){ toast('Not enough salvage.'); return; } ui.placing={type,deploy:!!deploy}; ui.picking=null; ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; }
function tryPlace(keep){
  const s=placementSpot(), d=BUILDINGS[ui.placing.type];
  if(atLimit(ui.placing.type)){ toast(limitMsg(ui.placing.type)); ui.placing=null; G.selDirty=true; return; }
  if(ui.placing.deploy){
    if(!s.ok){ toast('Cannot deploy there.'); return; }
    const carriers=myUnits().filter(u=>u.carry&&u.carry.type===ui.placing.type&&!(u.order&&u.order.deploy)); if(!carriers.length){ ui.placing=null; G.selDirty=true; return; }
    const cx=(s.tx+d.size/2)*TILE, cy=(s.ty+d.size/2)*TILE; carriers.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
    const u=carriers[0]; SFX.play('place'); u.order={type:'build',btype:ui.placing.type,tx:s.tx,ty:s.ty,deploy:true}; u.target=null; u.path=null; u.goal=null;
    G.fx.push({k:'boom',x:cx,y:cy,t:0.3,max:0.3,r:14,col:'#ffe2a8'}); if(!keep||carriers.length<2){ ui.placing=null; } G.selDirty=true; return; }
  if(G.salvage<d.cost){ toast('Not enough salvage.'); return; }
  if(!s.ok){ toast(d.needsSite?'Relay Towers must be built on a free, explored relay pad.':'Cannot build there.'); return; }
  const eng=myUnits().filter(u=>u.def.builder&&!u.carry); if(!eng.length){ ui.placing=null; return; }
  const cx=(s.tx+d.size/2)*TILE, cy=(s.ty+d.size/2)*TILE;
  eng.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
  const u=eng.find(e=>!e.order||e.order.type!=='build')||eng[0];
  if(u.order&&u.order.type==='build'&&!u.order.site) G.salvage+=BUILDINGS[u.order.btype].cost;
  SFX.play('place'); G.salvage-=d.cost; u.order={type:'build',btype:ui.placing.type,tx:s.tx,ty:s.ty}; u.target=null; u.path=null; u.goal=null;
  G.fx.push({k:'boom',x:cx,y:cy,t:0.3,max:0.3,r:14,col:'#ffe2a8'});
  if(!keep){ ui.placing=null; G.selDirty=true; }
}
function entityAt(wx,wy,filter){ let best=null, bd=Infinity;
  for(const e of G.ents){ if(e.dead||(filter&&!filter(e))) continue;
    if(e.faction!=='corps'&&e.kind!=='crate'){ if(e.kind==='unit'&&!isVisible(e)) continue; if(e.kind==='building'&&!G.seen[Math.floor(e.y/TILE)*G.map.w+Math.floor(e.x/TILE)]) continue; }
    let d; if(e.kind==='building') { const hit = e.def.noBlock&&!e.def.ground ? Math.hypot(wx-e.x,wy-e.y)<14 : (wx>=e.tx*TILE&&wx<(e.tx+e.size)*TILE&&wy>=e.ty*TILE-8&&wy<(e.ty+e.size)*TILE); if(!hit) continue; d=Math.hypot(wx-e.x,wy-e.y)+(e.def.ground?80:20); }
    else { const cy=e.kind==='unit'?(e.def.vehicle?e.y-18:e.y-8):e.y; d=Math.hypot(wx-e.x,wy-cy); if(d>(e.r+(e.def.vehicle?14:8))) continue; }
    if(d<bd){ bd=d; best=e; } }
  return best; }
function smartCommand(wx,wy){
  const units=myUnits(); const blds=G.sel.filter(e=>e.kind==='building'&&e.faction==='corps');
  if(!units.length){ for(const b of blds) if(b.def.trains||b.def.reinforce){ b.rally={x:wx,y:wy}; b.rallyN=0; G.pings.push({x:wx,y:wy,t:2.2,col:'#5fe3b0'}); } return; }
  const t=entityAt(wx,wy,e=>e.kind!=='crate');
  if(t && t.faction!=='corps' && t.faction!=='none'){ const squad=units.filter(u=>!u.def.heal&&!u.def.escort); for(const u of units){ if(u.def.escort){ u.order=null; continue; } if(u.def.heal){ u.order={type:'support',squad}; u.path=null; continue; } u.order={type:'attack',target:t}; u.target=t; u.path=null; u.goal=null; }
    SFX.play('attack'); startFollow(); G.pings.push({x:t.x,y:t.y,t:2.4,col:'#ff5a4f'}); return; }
  if(t && t.faction==='corps' && t.kind==='building' && t.def.portable && t.built && t.hp>=t.maxHp && units.some(u=>u.def.builder&&!u.carry)){ packSentry(t); const rest=units.filter(u=>!u.def.builder); if(rest.length) moveGroup(rest,wx,wy,'move'); return; }
  if(t && t.faction==='corps' && ((t.kind==='building' && (t.hp<t.maxHp||!t.built)) || (t.kind==='unit' && t.def.vehicle && t.hp<t.maxHp))){ const eng=units.filter(u=>u.def.builder);
    if(eng.length){ for(const u of eng){ u.order={type:'repair',target:t}; u.path=null; u.goal=null; } const rest=units.filter(u=>!u.def.builder); if(rest.length) moveGroup(rest,wx,wy,'move'); return; } }
  moveGroup(units,wx,wy,'move'); SFX.play('ack'); startFollow();
  G.pings.push({x:wx,y:wy,t:2.5,col:'#5fe3b0'});
}
/* Group moves keep the squad's current shape: every unit keeps its offset from the group centre,
   and the whole group marches at the pace of its slowest member. A group that is spread out
   too far is pulled together into a tidy block first. */
const FORMATION = { maxRadius:4.5, spacing:24, minGap:14 };
function packSentry(s){ const eng=myUnits().filter(u=>u.def.builder&&!u.carry); if(!eng.length) return;
  eng.sort((a,b)=>dist(a,s)-dist(b,s)); const u=eng[0]; u.order={type:'pack',target:s}; u.target=null; u.path=null; u.goal=null; SFX.play('ack'); G.pings.push({x:s.x,y:s.y,t:2.2,col:'#ffb347'}); }
/* Tactical formations (Z circle, X wedge, V square). Support units (medics, engineers, escorts)
   take the protected centre; fighters form the outline, with Pyros and Gunners at the tip of the wedge.
   A squad keeps its formation on every move until you press the same key again or mix in other units. */
const FORMATIONS = {
  circle:{ name:'Circle', key:'Z', glyph:'◯' },
  wedge: { name:'Wedge',  key:'X', glyph:'⋀' },
  square:{ name:'Square', key:'V', glyph:'▢' }
};
const isSupport=u=>!!(u.def.heal||u.def.builder||u.def.escort);
const FRONT_RANK={ pyro:0, gunner:1, trooper:2 };
function formationSlots(shape,nf,ns,sp){
  const f=[], s=[];
  if(shape==='circle'){ const r=Math.max(sp*2,nf*sp*1.35/(2*Math.PI)+sp*0.6); for(let i=0;i<nf;i++){ const a=i/nf*Math.PI*2; f.push({x:Math.cos(a)*r,y:Math.sin(a)*r}); } }
  else if(shape==='wedge'){ const ranks=Math.ceil((nf-1)/2), a=ranks*sp*0.85/2; f.push({x:a+sp*0.4,y:0});
    for(let k=1;f.length<nf;k++){ f.push({x:a+sp*0.4-k*sp*0.85,y:-k*sp*0.8}); if(f.length<nf) f.push({x:a+sp*0.4-k*sp*0.85,y:k*sp*0.8}); } }
  else { const per=Math.max(1,Math.ceil(nf/4)), h=Math.max(sp*1.7,per*sp*0.7), P=8*h;
    for(let i=0;i<nf;i++){ let d=i/nf*P, x,y; if(d<2*h){ x=h; y=-h+d; } else if(d<4*h){ x=h-(d-2*h); y=h; } else if(d<6*h){ x=-h; y=h-(d-4*h); } else { x=-h+(d-6*h); y=-h; } f.push({x,y}); } }
  // support in the middle (slightly behind the tip for a wedge)
  const cx = shape==='wedge' ? -sp*0.5 : 0;
  if(ns===1) s.push({x:cx,y:0}); else for(let i=0;i<ns;i++){ const a=i/ns*Math.PI*2; s.push({x:cx+Math.cos(a)*sp*0.7,y:Math.sin(a)*sp*0.7}); }
  return {f,s};
}
function placeFormation(units,wx,wy,dir,type){
  const sup=units.filter(isSupport); let fig=units.filter(u=>!isSupport(u));
  if(!fig.length){ fig=sup.splice(0); }
  const shape=units[0].formation.shape, sp=FORMATION.spacing*1.15, slots=formationSlots(shape,fig.length,sup.length,sp);
  const c=Math.cos(dir), s=Math.sin(dir), toWorld=o=>({x:wx+o.x*c-o.y*s, y:wy+o.x*s+o.y*c});
  const pace=Math.min(...units.map(speedOf)), assign=[];
  // fighters: wedge fills the tip by rank; other shapes take the nearest free slot
  const pool=[...fig]; if(shape==='wedge') pool.sort((a,b)=>(FRONT_RANK[a.type]??3)-(FRONT_RANK[b.type]??3));
  slots.f.forEach(o=>{ const p=toWorld(o); let pickI=0;
    if(shape!=='wedge'){ let bd=Infinity; pool.forEach((u,i)=>{ const d=Math.hypot(u.x-p.x,u.y-p.y); if(d<bd){ bd=d; pickI=i; } }); }
    assign.push([pool.splice(pickI,1)[0],p]); });
  sup.forEach((u,i)=>assign.push([u,toWorld(slots.s[i])]));
  const taken=new Set();
  for(const [u,p] of assign){ let {x,y}=p;
    if(!walkableP(x,y)||!lineClear(wx,wy,x,y)){ const tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
      for(const o of SPIRAL){ const k=(tx+o.x)+','+(ty+o.y); if(taken.has(k)||!walkableT(tx+o.x,ty+o.y)) continue; taken.add(k); x=(tx+o.x+.5)*TILE; y=(ty+o.y+.5)*TILE; break; } }
    u.order={type,x,y,pace}; u.target=null; setPath(u,x,y); if(u.def.heal) u.healTarget=null; }
}
/* ---------- formation march ----------
   A long move in formation is led by one shared "anchor" that walks a path through the middle of corridors.
   Every unit heads for its own slot around that anchor, so the shape is kept on the way and not only at the end.
   Where a slot would be inside rock, it is pulled in towards the anchor: the squad squeezes only where it must. */
const MARCH = { minDist:5, wallCost:1.6, wantClear:4, turnRate:2.4, lookAhead:2.5, maxLag:2.2 };
function clearanceMap(){
  const W=G.map.w, H=G.map.h, N=W*H, c=new Uint8Array(N).fill(255), q=new Int32Array(N); let qh=0, qt=0;
  for(let i=0;i<N;i++) if(G.block[i]!==0){ c[i]=0; q[qt++]=i; }
  while(qh<qt){ const i=q[qh++], x=i%W, y=i/W|0, v=c[i]+1;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const j=ny*W+nx; if(c[j]>v){ c[j]=v; q[qt++]=j; } } }
  return c;
}
/* A* that prefers tiles far from walls: the middle of a corridor is cheaper than its edge. */
function findWidePath(sx,sy,gx,gy){
  const W=G.map.w, H=G.map.h, clr=clearanceMap();
  let s=nearestWalkable(Math.floor(sx/TILE),Math.floor(sy/TILE)), t=nearestWalkable(Math.floor(gx/TILE),Math.floor(gy/TILE)); if(!s||!t) return null;
  const start=s.y*W+s.x, goal=t.y*W+t.x, N=W*H, g=new Float32Array(N).fill(Infinity), from=new Int32Array(N).fill(-1), done=new Uint8Array(N);
  const heap=[], hf=[], push=(i,f)=>{ heap.push(i); hf.push(f); let k=heap.length-1; while(k>0){ const p=(k-1)>>1; if(hf[p]<=hf[k]) break; [heap[p],heap[k]]=[heap[k],heap[p]]; [hf[p],hf[k]]=[hf[k],hf[p]]; k=p; } },
    pop=()=>{ const top=heap[0], li=heap.pop(), lf=hf.pop(); if(heap.length){ heap[0]=li; hf[0]=lf; let k=0; for(;;){ const l=2*k+1, r=l+1; let m=k; if(l<heap.length&&hf[l]<hf[m]) m=l; if(r<heap.length&&hf[r]<hf[m]) m=r; if(m===k) break; [heap[m],heap[k]]=[heap[k],heap[m]]; [hf[m],hf[k]]=[hf[k],hf[m]]; k=m; } } return top; },
    h=i=>Math.hypot(i%W-t.x,(i/W|0)-t.y);
  g[start]=0; push(start,h(start)); let found=false, iter=0;
  while(heap.length && iter++<N*6){ const cur=pop(); if(done[cur]) continue; done[cur]=1; if(cur===goal){ found=true; break; }
    const cx=cur%W, cy=cur/W|0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const nx=cx+dx, ny=cy+dy;
      if(!walkableT(nx,ny) || (dx&&dy&&(!walkableT(cx+dx,cy)||!walkableT(cx,cy+dy)))) continue;
      const j=ny*W+nx; if(done[j]) continue;
      const ng=g[cur]+(dx&&dy?1.4142:1)*(1+MARCH.wallCost*Math.max(0,MARCH.wantClear-clr[j]));
      if(ng<g[j]){ g[j]=ng; from[j]=cur; push(j,ng+h(j)); } } }
  if(!found) return null;
  const tiles=[]; for(let i=goal;i!==-1;i=from[i]) tiles.push(i); tiles.reverse();
  const pts=tiles.map(i=>({x:(i%W+.5)*TILE,y:((i/W|0)+.5)*TILE})); pts[pts.length-1]={x:gx,y:gy};
  // drop points on straight stretches
  const out=[pts[0]]; for(let i=1;i<pts.length-1;i++){ const a=out[out.length-1], b=pts[i], c=pts[i+1]; if(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>1 || Math.hypot(b.x-a.x,b.y-a.y)>4*TILE) out.push(b); } out.push(pts[pts.length-1]);
  return out;
}
function startMarch(units,wx,wy,type){
  const n=units.length, cx=units.reduce((s,u)=>s+u.x,0)/n, cy=units.reduce((s,u)=>s+u.y,0)/n;
  const path=findWidePath(cx,cy,wx,wy); if(!path||path.length<2) return false;
  const form=units[0].formation, sup=units.filter(isSupport); let fig=units.filter(u=>!isSupport(u)); if(!fig.length) fig=sup.splice(0);
  const slots=formationSlots(form.shape,fig.length,sup.length,FORMATION.spacing*1.15);
  const dir=Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x), c=Math.cos(dir), s=Math.sin(dir);
  const pool=[...fig]; if(form.shape==='wedge') pool.sort((a,b)=>(FRONT_RANK[a.type]??3)-(FRONT_RANK[b.type]??3));
  const m={ form, path, i:1, x:path[0].x, y:path[0].y, dir, type, goal:{x:wx,y:wy}, pace:Math.min(...units.map(speedOf)), units:[] };
  slots.f.forEach(o=>{ const p={x:cx+o.x*c-o.y*s, y:cy+o.x*s+o.y*c}; let k=0;
    if(form.shape!=='wedge'){ let bd=Infinity; pool.forEach((u,i)=>{ const d=Math.hypot(u.x-p.x,u.y-p.y); if(d<bd){ bd=d; k=i; } }); }
    const u=pool.splice(k,1)[0]; u.slot=o; m.units.push(u); });
  sup.forEach((u,i)=>{ u.slot=slots.s[i]; m.units.push(u); });
  form.dir=dir; G.marches=(G.marches||[]).filter(x=>!x.units.some(u=>units.includes(u))); G.marches.push(m);
  for(const u of m.units){ u.order={type,x:u.x,y:u.y,march:m}; u.target=null; u.path=null; if(u.def.heal) u.healTarget=null; }
  updateMarch(m,0); return true;
}
function slotPoint(m,u){
  const c=Math.cos(m.dir), s=Math.sin(m.dir); let k=1;
  for(;k>0;k-=0.2){ const x=m.x+(u.slot.x*c-u.slot.y*s)*k, y=m.y+(u.slot.x*s+u.slot.y*c)*k; if(walkableP(x,y)&&lineClear(m.x,m.y,x,y)) return {x,y}; }
  return {x:m.x,y:m.y};
}
function updateMarch(m,dt){
  // a unit stays in the march while it follows it; any other order (or Stop) takes it out
  m.units=m.units.filter(u=>{ if(u.dead) return false; if(u.order&&u.order.march===m) return true; if(!u.order&&u.marchIdle===m) return true; if(u.marchIdle===m) u.marchIdle=null; return false; });
  if(!m.units.length) return false;
  // how far the slowest unit is behind its slot decides how fast the anchor may go
  let lag=0; for(const u of m.units){ if(u.target) continue; const p=slotPoint(m,u); lag=Math.max(lag,Math.hypot(u.x-p.x,u.y-p.y)); }
  const slow=Math.max(0.1,Math.min(1,1-(lag-TILE)/(MARCH.maxLag*TILE)));
  let step=m.pace*slow*dt;
  while(step>0 && m.i<m.path.length){ const w=m.path[m.i], d=Math.hypot(w.x-m.x,w.y-m.y); if(d<=step){ m.x=w.x; m.y=w.y; m.i++; step-=d; } else { m.x+=(w.x-m.x)/d*step; m.y+=(w.y-m.y)/d*step; step=0; } }
  // face where the path goes a little further ahead, turning smoothly
  let la=MARCH.lookAhead*TILE, px=m.x, py=m.y, j=m.i; while(j<m.path.length&&la>0){ const w=m.path[j], d=Math.hypot(w.x-px,w.y-py); if(d>=la){ px+=(w.x-px)/d*la; py+=(w.y-py)/d*la; la=0; } else { px=w.x; py=w.y; la-=d; j++; } }
  if(Math.hypot(px-m.x,py-m.y)>4){ const want=Math.atan2(py-m.y,px-m.x); let da=want-m.dir; while(da>Math.PI) da-=2*Math.PI; while(da<-Math.PI) da+=2*Math.PI;
    m.dir+=Math.max(-MARCH.turnRate*dt,Math.min(MARCH.turnRate*dt,da)); m.form.dir=m.dir; }
  if(m.i>=m.path.length){ // arrived: settle into the final formation
    const us=m.units; us.forEach(u=>{ u.marchIdle=null; }); placeFormation(us,m.goal.x,m.goal.y,m.dir,m.type); return false; }
  for(const u of m.units){ if(u.target) continue;
    const p=slotPoint(m,u), d=Math.hypot(u.x-p.x,u.y-p.y);
    u.order={type:m.type,x:p.x,y:p.y,march:m,pace:d>12?speedOf(u):m.pace*slow};
    if(lineClear(u.x,u.y,p.x,p.y)) u.path=[p]; else if(!u.path||!u.marchRepath||G.time>u.marchRepath){ u.path=findPath(u.x,u.y,p.x,p.y); u.marchRepath=G.time+0.5; }
    u.pi=0; u.goal={x:p.x,y:p.y}; u.wpKey=null; u.marchIdle=m; }
  return true;
}
function updateMarches(dt){ if(G.marches&&G.marches.length) G.marches=G.marches.filter(m=>updateMarch(m,dt)); }
function setFormation(shape){
  const us=myUnits(); if(us.length<2){ toast('Select at least two units for a formation.',true); return; }
  const cur=us[0].formation;
  if(cur && cur.shape===shape && us.every(u=>u.formation===cur)){ us.forEach(u=>u.formation=null); toast('Formation released.',true); G.selDirty=true; return; }
  const f={shape,dir:cur?cur.dir:-Math.PI/2}; us.forEach(u=>u.formation=f);
  const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
  placeFormation(us,cx,cy,f.dir,'move'); SFX.play('ack'); toast(`Formation: ${FORMATIONS[shape].name}`,true); G.selDirty=true;
}
function moveGroup(units,wx,wy,type){
  const n=units.length; if(!n) return;
  const cx=units.reduce((s,u)=>s+u.x,0)/n, cy=units.reduce((s,u)=>s+u.y,0)/n;
  const form=units[0].formation;
  if(n>1 && form && units.every(u=>u.formation===form)){
    if(Math.hypot(wx-cx,wy-cy)>MARCH.minDist*TILE && startMarch(units,wx,wy,type)) return;
    if(Math.hypot(wx-cx,wy-cy)>24) form.dir=Math.atan2(wy-cy,wx-cx);
    placeFormation(units,wx,wy,form.dir,type); return; }
  let offs=units.map(u=>({u,dx:u.x-cx,dy:u.y-cy}));
  const spread=Math.max(...offs.map(o=>Math.hypot(o.dx,o.dy)));
  let tight=false; for(let i=0;i<offs.length&&!tight;i++) for(let j=i+1;j<offs.length;j++) if(Math.hypot(offs[i].dx-offs[j].dx,offs[i].dy-offs[j].dy)<FORMATION.minGap){ tight=true; break; }
  if(n>1 && (spread>FORMATION.maxRadius*TILE || tight)){
    const cols=Math.ceil(Math.sqrt(n)), rows=Math.ceil(n/cols), sp=FORMATION.spacing;
    offs.sort((a,b)=>a.dy-b.dy); const out=[];
    for(let r=0;r<rows;r++){ const row=offs.slice(r*cols,r*cols+cols).sort((a,b)=>a.dx-b.dx);
      row.forEach((o,c)=>out.push({u:o.u,dx:(c-(row.length-1)/2)*sp,dy:(r-(rows-1)/2)*sp})); }
    offs=out;
  }
  const pace=Math.min(...units.map(speedOf));
  const taken=new Set();
  for(const o of offs){ let x=wx+o.dx, y=wy+o.dy;
    if(!walkableP(x,y)||!lineClear(wx,wy,x,y)){ // slot blocked: nearest free spot around the click
      const tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
      for(const s of SPIRAL){ const k=(tx+s.x)+','+(ty+s.y); if(taken.has(k)||!walkableT(tx+s.x,ty+s.y)) continue; taken.add(k); x=(tx+s.x+.5)*TILE+rand(-4,4); y=(ty+s.y+.5)*TILE+rand(-4,4); break; } }
    const u=o.u; u.order={type,x,y,pace:n>1?pace:null}; u.target=null; setPath(u,x,y); if(u.def.heal) u.healTarget=null; }
}
function selectEntities(list,add){ if(!add) stopFollow(); G.sel = add ? [...new Set([...G.sel,...list])] : list; G.selDirty=true; if(list.length) SFX.play('select'); }
