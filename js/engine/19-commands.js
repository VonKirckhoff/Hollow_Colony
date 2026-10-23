'use strict';
/* ---------- 2r. commands ---------- */
function myUnits(){ return G.sel.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.dead&&!e.downed); }   /* the downed take no orders */
/* Stances stay with a soldier until you change them: 'attack' (every move becomes an attack-move) or 'hold' (after every move he holds the new spot).
   Cancel order (S) clears both the current order and the stance. */
/* only one pointer mode at a time: attack target, flare, sentry pick-up or building placement */
function clearModes(){ ui.amove=false; ui.flare=false; ui.picking=null; ui.placing=null; cv.classList.remove('amove'); if(G) G.selDirty=true; }
function cmdStop(){ clearModes(); for(const u of myUnits()){ u.order=null; u.target=null; u.path=null; u.home={x:u.x,y:u.y}; u.stance=null; u.quiet=false; } toast('Orders cancelled.',true); }
/* Q toggles hold fire: they do not shoot on their own (not even back), only at what you order them to attack.
   It stays on through moves and the defensive stance; A, S or Q again switch it off. */
function cmdQuiet(){ const us=myUnits(); if(!us.length) return;
  if(us.every(u=>u.quiet)){ for(const u of us) u.quiet=false; toast('Weapons free.',true); }
  else { for(const u of us){ u.quiet=true; u.target=null; u.snap=null; } toast('Hold fire: they only shoot when you order an attack.',true); }
  SFX.play('ack'); G.selDirty=true; }
/* H toggles: on = hold here and after every move; pressing it again (all already defensive) switches it off */
function cmdHold(){ clearModes(); const us=myUnits();
  if(us.length && us.every(u=>u.stance==='hold')){ for(const u of us){ u.stance=null; if(u.order&&u.order.type==='hold') u.order=null; u.home={x:u.x,y:u.y}; } toast('Defensive off.',true); return; }
  for(const u of us){ u.order={type:'hold'}; u.target=null; u.path=null; u.stance='hold'; } toast('Defensive: holding position.',true); }
/* A: pick a target or spot (always, also when the squad is already aggressive). Pressing A again while picking cancels the pick.
   The attack stance itself is switched off with S (or replaced by H). */
function cmdAttack(){ if(ui.amove){ clearModes(); return; } clearModes(); ui.amove=true; cv.classList.add('amove'); G.selDirty=true; }
function stanceType(u,type){ return type==='move'&&u.stance==='attack'&&u.def.damage&&!u.def.heal ? 'amove' : type; }
function stanceOf(units){ if(!units.length) return null;
  if(units.every(u=>u.stance==='hold')) return 'hold';
  const f=units.filter(u=>u.def.damage&&!u.def.heal);   /* Medics and unarmed units never take the attack stance */
  return f.length&&f.every(u=>u.stance==='attack')?'attack':null; }
function startPlacing(type,deploy){ const d=BUILDINGS[type]; if(!deploy&&noBuild(type)){ toast(`No ${d.name}s can be built in this mission.`); return; } if(atLimit(type)){ toast(limitMsg(type)); return; } if(!deploy && G.salvage<d.cost){ toast('Not enough salvage.'); return; } ui.placing={type,deploy:!!deploy}; ui.picking=null; ui.amove=false; ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; }
function tryPlace(keep){
  const s=placementSpot(), d=BUILDINGS[ui.placing.type];
  if(atLimit(ui.placing.type)){ toast(limitMsg(ui.placing.type)); ui.placing=null; G.selDirty=true; return; }
  if(ui.placing.deploy){
    if(!s.ok){ toast('Cannot deploy there.'); return; }
    const carriers=myUnits().filter(u=>u.carry&&u.carry.type===ui.placing.type&&!(u.order&&u.order.deploy)); if(!carriers.length){ ui.placing=null; G.selDirty=true; return; }
    const cx=(s.tx+d.size/2)*TILE, cy=(s.ty+d.size/2)*TILE; carriers.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
    const u=carriers[0]; SFX.play('place'); bark(u,'build'); u.order={type:'build',btype:ui.placing.type,tx:s.tx,ty:s.ty,deploy:true}; u.target=null; u.path=null; u.goal=null;
    G.fx.push({k:'boom',x:cx,y:cy,t:0.3,max:0.3,r:14,col:'#ffe2a8'}); if(!keep||carriers.length<2){ ui.placing=null; } G.selDirty=true; return; }
  if(G.salvage<d.cost){ toast('Not enough salvage.'); return; }
  if(!s.ok){ toast(d.needsSite?'Relay Towers must be built on a free, explored relay pad.':'Cannot build there.'); return; }
  const eng=myUnits().filter(u=>u.def.builder&&!u.carry); if(!eng.length){ ui.placing=null; return; }
  const cx=(s.tx+d.size/2)*TILE, cy=(s.ty+d.size/2)*TILE;
  eng.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
  const u=eng.find(e=>!e.order||e.order.type!=='build')||eng[0];
  if(u.order&&u.order.type==='build'&&!u.order.site) G.salvage+=BUILDINGS[u.order.btype].cost;
  SFX.play('place'); bark(u,'build'); G.salvage-=d.cost; u.order={type:'build',btype:ui.placing.type,tx:s.tx,ty:s.ty}; u.target=null; u.path=null; u.goal=null;
  G.fx.push({k:'boom',x:cx,y:cy,t:0.3,max:0.3,r:14,col:'#ffe2a8'});
  if(!keep){ ui.placing=null; G.selDirty=true; }
}
function entityAt(wx,wy,filter){ let best=null, bd=Infinity;
  for(const e of G.ents){ if(e.dead||e.kind==='body'||(filter&&!filter(e))) continue;
    if(e.hidden) continue;
    if(e.faction!==G.side&&e.kind!=='crate'){ if(e.kind==='unit'&&!isVisible(e)) continue; if(e.kind==='building'&&!G.seen[Math.floor(e.y/TILE)*G.map.w+Math.floor(e.x/TILE)]) continue; }
    let d; if(e.kind==='building') { const hit = e.def.noBlock&&!e.def.ground ? Math.hypot(wx-e.x,wy-e.y)<14 : (wx>=e.tx*TILE&&wx<(e.tx+e.size)*TILE&&wy>=e.ty*TILE-8&&wy<(e.ty+e.size)*TILE); if(!hit) continue; d=Math.hypot(wx-e.x,wy-e.y)+(e.def.ground?80:20); }
    else { const cy=e.kind==='unit'?e.y-8:e.y; d=Math.hypot(wx-e.x,wy-cy); if(d>e.r+8) continue; }
    if(d<bd){ bd=d; best=e; } }
  return best; }
function smartCommand(wx,wy){ if(G.side==='swarm'){ swarmRight(wx,wy); return; }   /* playing the Swarm: right-click calls the brood together */
  const units=myUnits(); const blds=G.sel.filter(e=>e.kind==='building'&&e.faction==='corps');
  if(!units.length){ for(const b of blds) if(b.def.trains||b.def.reinforce){ b.rally={x:wx,y:wy}; b.rallyN=0; G.pings.push({x:wx,y:wy,t:2.2,col:'#5fe3b0'}); } return; }
  const t=entityAt(wx,wy,e=>e.kind!=='crate');
  if(t && t.faction!=='corps' && t.faction!=='none'){ formationsEngage(units); const squad=units.filter(u=>!u.def.heal&&!u.def.escort); for(const u of units){ if(u.def.escort){ u.order=null; continue; } if(u.def.heal){ u.order={type:'support',squad}; u.path=null; continue; } u.order={type:'attack',target:t}; u.target=t; u.path=null; u.goal=null; }
    SFX.play('attack'); startFollow(); G.pings.push({x:t.x,y:t.y,t:2.4,col:'#ff5a4f'}); return; }
  if(t && t.faction==='corps' && t.kind==='building' && t.def.portable && t.built && t.hp>=t.maxHp && units.some(u=>u.def.builder&&!u.carry)){ packSentry(t); const rest=units.filter(u=>!u.def.builder); if(rest.length) moveGroup(rest,wx,wy,'move'); return; }
  if(t && t.faction==='corps' && t.kind==='building' && (t.hp<t.maxHp||!t.built)){ const eng=units.filter(u=>u.def.builder);
    if(eng.length){ for(const u of eng){ u.order={type:'repair',target:t}; u.path=null; u.goal=null; } const rest=units.filter(u=>!u.def.builder); if(rest.length) moveGroup(rest,wx,wy,'move'); return; } }
  leaveFormation(units); moveGroup(units,wx,wy,'move'); SFX.play('ack'); startFollow();
  G.pings.push({x:wx,y:wy,t:2.5,col:'#5fe3b0'});
}
function packSentry(s){ const eng=myUnits().filter(u=>u.def.builder&&!u.carry); if(!eng.length) return;
  eng.sort((a,b)=>dist(a,s)-dist(b,s)); const u=eng[0]; u.order={type:'pack',target:s}; u.target=null; u.path=null; u.goal=null; SFX.play('ack'); G.pings.push({x:s.x,y:s.y,t:2.2,col:'#ffb347'}); }
/* Group moves without a formation keep the squad's current shape: every unit keeps its offset from the group centre,
   and the whole group marches at the pace of its slowest member. A group that is spread out
   too far is pulled together into a tidy block first.
   A squad in formation marches as one body instead (19b-formations.js). */
function moveGroup(units,wx,wy,type){
  const n=units.length; if(!n) return;
  if(units.some(u=>u.faction==='corps')) anyBarker(units,type==='amove'||stanceOf(units)==='attack'?'attack':'move');
  const cx=units.reduce((s,u)=>s+u.x,0)/n, cy=units.reduce((s,u)=>s+u.y,0)/n;
  const form=units[0].formation;
  if(n>1 && form && units.every(u=>u.formation===form)){ marchTo(units,wx,wy,type,null); return; }
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
    const u=o.u; u.order={type:stanceType(u,type),x,y,pace:n>1?pace:null}; u.target=null; setPath(u,x,y); if(u.def.heal) u.healTarget=null; }
}
function selectEntities(list,add){ if(!add) stopFollow(); G.sel = add ? [...new Set([...G.sel,...list])] : list; G.selDirty=true; if(list.length){ SFX.play('select'); if(Math.random()<0.5) anyBarker(list,'select'); } }
