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
function startPlacing(type,deploy){ const d=BUILDINGS[type]; if(atLimit(type)){ toast(limitMsg(type)); return; } if(!deploy && G.salvage<d.cost){ toast('Not enough salvage.'); return; } ui.placing={type,deploy:!!deploy}; ui.picking=null; ui.amove=false; ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; }
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
  if(t && t.faction!=='corps' && t.faction!=='none'){ const squad=units.filter(u=>!u.def.heal&&!u.def.escort); for(const u of units){ if(u.def.escort){ u.order=null; continue; } if(u.def.heal){ u.order={type:'support',squad}; u.path=null; continue; } u.order={type:'attack',target:t}; u.target=t; u.path=null; u.goal=null; }
    SFX.play('attack'); startFollow(); G.pings.push({x:t.x,y:t.y,t:2.4,col:'#ff5a4f'}); return; }
  if(t && t.faction==='corps' && t.kind==='building' && t.def.portable && t.built && t.hp>=t.maxHp && units.some(u=>u.def.builder&&!u.carry)){ packSentry(t); const rest=units.filter(u=>!u.def.builder); if(rest.length) moveGroup(rest,wx,wy,'move'); return; }
  if(t && t.faction==='corps' && t.kind==='building' && (t.hp<t.maxHp||!t.built)){ const eng=units.filter(u=>u.def.builder);
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
/* Tactical formations (Z circle, X wedge, V square, I line, W zigzag). Support units (medics, engineers, escorts)
   take the protected centre (behind the line in a line or zigzag); fighters form the outline, with Pyros and Gunners at the tip of the wedge.
   A line or zigzag faces the nearest enemy in sight when you form it. Hold the right mouse button and drag to choose
   where a formation faces when it arrives. A squad keeps its formation on every move until you press the same key again or mix in other units. */
const FORMATIONS = {
  circle:{ name:'Circle', key:'Z', glyph:'◯' },
  wedge: { name:'Wedge',  key:'X', glyph:'⋀' },
  square:{ name:'Square', key:'V', glyph:'▢' },
  line:  { name:'Line',   key:'I', glyph:'━', tip:'Everyone shoulder to shoulder, facing the enemy: every gun can fire. Medics and Engineers stand behind.' },
  zigzag:{ name:'Zigzag', key:'W', glyph:'∿', tip:'A line in two staggered rows: the back row fires through the gaps of the front row. Medics and Engineers stand behind.' },
  custom:{ name:'Your own', key:'Y', glyph:'★', tip:'The formation you saved with F: everyone goes back to the place of his type.' }
};
/* E: spacing of the current formation */
const GAPS=[ {name:'Normal',k:1}, {name:'Wide',k:1.4}, {name:'Tight',k:0.75} ];
const gapName=f=>(GAPS.find(g=>g.k===((f&&f.gap)||1))||GAPS[0]).name;
/* your own formation (F saves the squad as it stands, Y uses it). Kept between missions. */
function customForm(){ const c=store.get('hc-myform',null); return c&&c.slots&&c.slots.length>1?c:null; }
function sharedForm(us){ return us.length>1&&us[0].formation&&us.every(u=>u.formation===us[0].formation)?us[0].formation:null; }
/* a control group that is exactly this selection remembers the formation */
function rememberGroupForm(us,f){ G.groupForm=G.groupForm||{}; for(const [k,g0] of Object.entries(G.groups||{})){ const g=g0.filter(x=>!x.dead&&!x.downed); if(g.length===us.length&&g.every(x=>us.includes(x))) G.groupForm[k]=f; } }
const FACING=new Set(['line','zigzag']);   /* shapes that are built to face an enemy */
const isSupport=u=>!!(u.def.heal||u.def.builder||u.def.escort);
const FRONT_RANK={ pyro:0, gunner:1, trooper:2 };
function formationSlots(shape,nf,ns,sp){
  const f=[], s=[];
  if(shape==='circle'){ const r=Math.max(sp*2,nf*sp*1.35/(2*Math.PI)+sp*0.6); for(let i=0;i<nf;i++){ const a=i/nf*Math.PI*2; f.push({x:Math.cos(a)*r,y:Math.sin(a)*r}); } }
  else if(shape==='wedge'){ const ranks=Math.ceil((nf-1)/2), a=ranks*sp*0.85/2; f.push({x:a+sp*0.4,y:0});
    for(let k=1;f.length<nf;k++){ f.push({x:a+sp*0.4-k*sp*0.85,y:-k*sp*0.8}); if(f.length<nf) f.push({x:a+sp*0.4-k*sp*0.85,y:k*sp*0.8}); } }
  else if(shape==='line'){ const w=sp*1.6; for(let i=0;i<nf;i++) f.push({x:0,y:(i-(nf-1)/2)*w}); }   /* wide: every gun needs a clear line of fire */
  else if(shape==='zigzag'){ const nF=Math.ceil(nf/2), nB=nf-nF, w=sp*1.4, sh=nB===nF?w/2:0;   /* a little closer than a line */
    for(let i=0;i<nF;i++) f.push({x:sp*0.65,y:(i-(nF-1)/2)*w});
    for(let i=0;i<nB;i++) f.push({x:-sp*0.65,y:(i-(nB-1)/2)*w+sh}); }
  else { const per=Math.max(1,Math.ceil(nf/4)), h=Math.max(sp*1.7,per*sp*0.7), P=8*h;
    for(let i=0;i<nf;i++){ let d=i/nf*P, x,y; if(d<2*h){ x=h; y=-h+d; } else if(d<4*h){ x=h-(d-2*h); y=h; } else if(d<6*h){ x=-h; y=h-(d-4*h); } else { x=-h+(d-6*h); y=-h; } f.push({x,y}); } }
  // support in the middle (slightly behind the tip for a wedge)
  const cx = shape==='wedge' ? -sp*0.5 : 0;
  if(FACING.has(shape)){ const bx=shape==='line'?-sp*1.2:-sp*1.8; for(let i=0;i<ns;i++) s.push({x:bx,y:(i-(ns-1)/2)*sp*1.3}); }
  else if(ns===1) s.push({x:cx,y:0}); else for(let i=0;i<ns;i++){ const a=i/ns*Math.PI*2; s.push({x:cx+Math.cos(a)*sp*0.7,y:Math.sin(a)*sp*0.7}); }
  return {f,s};
}
/* which unit goes to which place: a plan of slots (local, facing +x) for a shape */
function slotPlan(units,shape,sp){
  if(shape==='custom'){ const c=customForm(); if(c) return customPlan(units,c,sp/(FORMATION.spacing*1.15)); shape='circle'; }
  const sup=units.filter(isSupport); let fig=units.filter(u=>!isSupport(u));
  if(!fig.length){ fig=sup.splice(0); }
  /* a circle or square needs at least 4 points on its outline: with fewer fighters, support takes a place on the outline too
     (otherwise 2 fighters + support in the middle make a straight line) */
  if(shape!=='wedge' && !FACING.has(shape) && fig.length<4 && sup.length){ const all=[]; while(fig.length||sup.length){ if(fig.length) all.push(fig.shift()); if(sup.length) all.push(sup.shift()); } fig=all; }
  return { shape, fig, sup, slots:formationSlots(shape,fig.length,sup.length,sp) }; }
/* your own formation: every place remembers the type that stood there; a Medic goes to a Medic's place, else to a support place, else anywhere.
   More soldiers than places: the rest line up behind. */
function customPlan(units,c,k){ const slots=c.slots.map(o=>({x:o.x*k,y:o.y*k,type:o.type,sup:o.sup})).sort((a,b)=>b.x-a.x), pool=[...units], pairs=[];
  for(const o of slots){ if(!pool.length) break; let i=pool.findIndex(u=>u.type===o.type); if(i<0) i=pool.findIndex(u=>isSupport(u)===o.sup); if(i<0) i=0; pairs.push([pool.splice(i,1)[0],o]); }
  const minX=Math.min(...slots.map(o=>o.x)), sp=FORMATION.spacing*1.15*k; pool.forEach((u,i)=>pairs.push([u,{x:minX-sp,y:(i-(pool.length-1)/2)*sp}]));
  return { shape:'custom', pairs }; }
function placeFormation(units,wx,wy,dir,type){
  const form=units[0].formation, sp=FORMATION.spacing*1.15*(form.gap||1), plan=slotPlan(units,form.shape,sp), shape=plan.shape;
  const c=Math.cos(dir), s=Math.sin(dir);
  /* against a wall or a rock some places fall on blocked ground: shift the whole shape (up to 3 tiles) to where most of it fits,
     instead of piling the blocked ones up on the click */
  const all=plan.pairs?plan.pairs.map(p=>p[1]):[...plan.slots.f,...plan.slots.s], fits=(ox,oy)=>{ if(!walkableP(ox,oy)) return -1; let n=0; for(const o of all){ const x=ox+o.x*c-o.y*s, y=oy+o.x*s+o.y*c; if(walkableP(x,y)&&lineClear(ox,oy,x,y)) n++; } return n; };
  let best=fits(wx,wy), bx=wx, by=wy;
  if(best<all.length){ for(let r=1;r<=3&&best<all.length;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
      const ox=wx+dx*TILE*0.75, oy=wy+dy*TILE*0.75, n=fits(ox,oy); if(n>best){ best=n; bx=ox; by=oy; } } }
  wx=bx; wy=by;
  const toWorld=o=>({x:wx+o.x*c-o.y*s, y:wy+o.x*s+o.y*c});
  const pace=Math.min(...units.map(speedOf)); let assign=[];
  if(plan.pairs) assign=plan.pairs.map(([u,o])=>[u,toWorld(o)]);
  else { const {fig,sup,slots}=plan;
    // fighters: wedge fills the tip by rank; other shapes take the nearest free slot
    const pool=[...fig]; if(shape==='wedge') pool.sort((a,b)=>(FRONT_RANK[a.type]??3)-(FRONT_RANK[b.type]??3));
    slots.f.forEach(o=>{ const p=toWorld(o); let pickI=0;
      if(shape!=='wedge'){ let bd=Infinity; pool.forEach((u,i)=>{ const d=Math.hypot(u.x-p.x,u.y-p.y); if(d<bd){ bd=d; pickI=i; } }); }
      assign.push([pool.splice(pickI,1)[0],p]); });
    sup.forEach((u,i)=>assign.push([u,toWorld(slots.s[i])])); }
  const taken=new Set(); let swept=false; form.at={x:wx,y:wy};
  for(const [u,p] of assign){ let {x,y}=p;
    if(!walkableP(x,y)||!lineClear(wx,wy,x,y)){ const tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
      for(const o of SPIRAL){ const k=(tx+o.x)+','+(ty+o.y); if(taken.has(k)||!walkableT(tx+o.x,ty+o.y)) continue; taken.add(k); x=(tx+o.x+.5)*TILE; y=(ty+o.y+.5)*TILE; break; } }
    const t=stanceType(u,type);
    /* Sweep: a line on the attack does not break ranks to chase. It walks on at the pace of the slowest man and fires on the move. */
    if(t==='amove'&&shape==='line'&&u.def.damage&&!u.def.heal){ u.order={type:'move',sweep:true,x,y,pace}; swept=true; }
    else u.order={type:t,x,y,pace};
    u.target=null; setPath(u,x,y); if(u.def.heal) u.healTarget=null;
    const dx=x-wx, dy=y-wy; u.slot={x:dx*c+dy*s, y:-dx*s+dy*c}; }   /* his place in the formation, to come back to after a repair or a patient */
  if(swept&&units.some(u=>u.faction==='corps')){ toast('Sweep: the line advances and fires on the move.',true); uiUsed('sweep'); }
}
function setFormation(shape){
  const us=myUnits(); if(us.length<2){ toast('Select at least two units for a formation.',true); return; }
  const cur=us[0].formation;
  if(cur && cur.shape===shape && us.every(u=>u.formation===cur)){ us.forEach(u=>u.formation=null); rememberGroupForm(us,null); toast('Formation released.',true); G.selDirty=true; return; }
  if(shape==='custom'&&!customForm()){ toast('Nothing saved yet: set your squad up the way you like and press F.',true); return; }
  const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
  let dir=cur?cur.dir:-Math.PI/2;
  if(FACING.has(shape)){ const foe=nearestOf({x:cx,y:cy},e=>e.kind==='unit'&&e.faction!=='corps'&&e.faction!=='wild'&&!e.hidden&&isVisible(e)&&Math.hypot(e.x-cx,e.y-cy)<14*TILE); if(foe) dir=Math.atan2(foe.y-cy,foe.x-cx); }
  const f={shape,dir,gap:cur?cur.gap||1:1}; us.forEach(u=>u.formation=f); rememberGroupForm(us,f); if(shape==='custom') uiUsed('formcustom');
  placeFormation(us,cx,cy,f.dir,'move'); SFX.play('ack'); toast(`Formation: ${FORMATIONS[shape].name}`,true); G.selDirty=true;
}
/* F: save the squad as it stands as your own formation (facing the way its formation faces, else north) */
function saveFormation(){ const us=myUnits(); if(us.length<2){ toast('Select at least two units to save a formation.',true); return; }
  const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length, sf=sharedForm(us), dir=sf?sf.dir:-Math.PI/2, gap=(sf&&sf.gap)||1, c=Math.cos(dir), s=Math.sin(dir);
  const slots=us.map(u=>{ const dx=u.x-cx, dy=u.y-cy; return { x:Math.round((dx*c+dy*s)/gap), y:Math.round((-dx*s+dy*c)/gap), type:u.type, sup:isSupport(u) }; });
  if(slots.some(o=>Math.hypot(o.x,o.y)>7*TILE)){ toast('Too spread out: keep the squad within 7 tiles of its centre.',true); return; }
  store.set('hc-myform',{slots}); const f={shape:'custom',dir,gap}; us.forEach(u=>u.formation=f); rememberGroupForm(us,f); uiUsed('formsave');
  SFX.play('ready'); toast(`Your formation is saved (${us.length} places). Y puts any squad in it, also in later missions.`,true); G.selDirty=true; }
/* E: tight, normal or wide */
function cmdGap(){ const us=myUnits(), f=sharedForm(us); if(!f){ toast('Pick a formation first.',true); return; }
  const i=GAPS.findIndex(g=>g.k===(f.gap||1)); f.gap=GAPS[(i+1)%GAPS.length].k;
  const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length; placeFormation(us,cx,cy,f.dir,'move');
  uiUsed('gap'); SFX.play('ack'); toast(`Spacing: ${gapName(f)}`,true); G.selDirty=true;
}
/* where a soldier belongs in his formation now (it follows the squad when it moves on without him), or null */
function formationSpot(u){ const f=u.formation; if(!f||!f.at||!u.slot||u.faction!=='corps') return null;
  if(!G.ents.some(e=>e!==u&&!e.dead&&e.kind==='unit'&&e.formation===f)) return null;
  const c=Math.cos(f.dir), s=Math.sin(f.dir), x=f.at.x+u.slot.x*c-u.slot.y*s, y=f.at.y+u.slot.x*s+u.slot.y*c; return walkableP(x,y)?{x,y}:null; }
/* back into his place after stepping out (an Engineer after a repair, a Medic after a patient) */
function rejoinFormation(u){ const p=formationSpot(u); if(!p||Math.hypot(u.x-p.x,u.y-p.y)<TILE*0.8) return false;
  u.order={type:'move',x:p.x,y:p.y,rejoin:true}; u.target=null; setPath(u,p.x,p.y); return true; }
/* right mouse held and dragged: the squad goes to where you pressed and faces the way you dragged */
function canFace(){ const us=myUnits(); return us.length>1&&us[0].formation&&us.every(u=>u.formation===us[0].formation); }
function moveFacing(wx,wy,dir){ const us=myUnits(); if(!canFace()) { smartCommand(wx,wy); return; }
  us[0].formation.dir=dir; anyBarker(us,stanceOf(us)==='attack'?'attack':'move'); placeFormation(us,wx,wy,dir,'move');
  SFX.play('ack'); startFollow(); G.pings.push({x:wx,y:wy,t:2.5,col:'#5fe3b0'}); uiUsed('facing'); G.selDirty=true; }
/* put a squad straight into a formation where it stands (no walking): used at the start of a mission */
function formUp(units,shape,dir=-Math.PI/2){ if(units.length<2) return; const f={shape,dir,gap:1}; units.forEach(u=>u.formation=f);
  const cx=units.reduce((s,u)=>s+u.x,0)/units.length, cy=units.reduce((s,u)=>s+u.y,0)/units.length; placeFormation(units,cx,cy,dir,'move');
  for(const u of units){ if(u.order&&u.order.x!=null){ u.x=u.order.x; u.y=u.order.y; } u.order=null; u.path=null; u.home={x:u.x,y:u.y}; } }
function moveGroup(units,wx,wy,type){
  const n=units.length; if(!n) return;
  if(units.some(u=>u.faction==='corps')) anyBarker(units,type==='amove'||stanceOf(units)==='attack'?'attack':'move');
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
    const u=o.u; u.order={type:stanceType(u,type),x,y,pace:n>1?pace:null}; u.target=null; setPath(u,x,y); if(u.def.heal) u.healTarget=null; }
}
function selectEntities(list,add){ if(!add) stopFollow(); G.sel = add ? [...new Set([...G.sel,...list])] : list; G.selDirty=true; if(list.length){ SFX.play('select'); if(Math.random()<0.5) anyBarker(list,'select'); } }
