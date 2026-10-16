'use strict';
/* ---------- 2r. commands ---------- */
function myUnits(){ return G.sel.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.dead&&!e.def.convoy); }
function cmdStop(){ for(const u of myUnits()){ u.order=null; u.target=null; u.path=null; u.home={x:u.x,y:u.y}; } }
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
