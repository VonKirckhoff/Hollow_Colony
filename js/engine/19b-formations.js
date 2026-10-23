'use strict';
/* ---------- 2s. formations: the shapes, who stands where, and a squad that marches as one body ----------
   A formation (u.formation, shared by its members) has a shape, a facing (dir), a spacing (gap), the spot it stands on (at)
   and a line-up number (seq). Every member has a place in it: u.slot, his offset from the formation's spot in the
   formation's own frame (+x = front), handed out in line-up number u.formSeq.

   Who stands where: the shape decides the places and their role (Medics, Engineers and escorts in the centre or behind,
   Pyros at the tip of a wedge, then Gunners). Within a role the places are shared out so that every soldier keeps his own
   side of the squad: the cheapest assignment (assignCheapest), so nobody crosses through the squad to swap places.

   The march: a squad in formation moves as one body. A guide point walks the path at the pace of the slowest member,
   and every soldier walks to his own place around the guide, so the shape holds on the way and the tip of a wedge leads.
   The guide slows down for anyone who falls behind and stops while the squad fights on an attack-move (a Sweep walks on).
   A wedge, line, zigzag or your own formation turns gently with the path; a circle and a square keep their orientation.
   In a narrow passage, whoever's place falls in the rock follows the guide in a file.
   A new formation or spacing given on the march is taken up on the way: the guide does not stop.
   At the end every soldier gets his final place around the destination (against a wall the shape shifts to fit). */
const FORMATION = { maxRadius:4.5, spacing:24, minGap:14, march:0.9, catchUp:2, wait:1.5, slowest:0.4, turn:1.8, file:0.9 };
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
const TURNS=new Set(['wedge','line','zigzag','custom']);   /* shapes with a front: they turn with the way they walk (a circle and a square keep their orientation) */
const isSupport=u=>!!(u.def.heal||u.def.builder||u.def.escort);
const FRONT_RANK={ pyro:0, gunner:1, trooper:2 };
const formSpacing=f=>FORMATION.spacing*1.15*((f&&f.gap)||1);
const marching=f=>!!(f&&f.march&&!f.march.done);
/* the living members of a formation (the downed are not counted until they are back up) */
function formMembers(f){ return G.ents.filter(e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.formation===f); }
function formationSlots(shape,nf,ns,sp){
  const f=[], s=[];
  if(shape==='circle'){ const r=Math.max(sp*2,nf*sp*1.35/(2*Math.PI)+sp*0.6); for(let i=0;i<nf;i++){ const a=i/nf*Math.PI*2; f.push({x:Math.cos(a)*r,y:Math.sin(a)*r}); } }
  else if(shape==='wedge'){ const ranks=Math.ceil((nf-1)/2), a=ranks*sp*0.85/2; f.push({x:a+sp*0.4,y:0});
    for(let k=1;f.length<nf;k++){ f.push({x:a+sp*0.4-k*sp*0.85,y:-k*sp*0.8}); if(f.length<nf) f.push({x:a+sp*0.4-k*sp*0.85,y:k*sp*0.8}); } }
  else if(shape==='line'){ const w=sp*1.6; for(let i=0;i<nf;i++) f.push({x:0,y:(i-(nf-1)/2)*w}); }   /* wide: every gun needs a clear line of fire */
  else if(shape==='zigzag'){ const nF=Math.ceil(nf/2), nB=nf-nF, w=sp*1.4, sh=nB===nF?w/2:0;   /* a little closer than a line */
    for(let i=0;i<nF;i++) f.push({x:sp*0.42,y:(i-(nF-1)/2)*w});   /* the two rows close together */
    for(let i=0;i<nB;i++) f.push({x:-sp*0.42,y:(i-(nB-1)/2)*w+sh}); }
  else { const per=Math.max(1,Math.ceil(nf/4)), h=Math.max(sp*1.7,per*sp*0.7), P=8*h;
    for(let i=0;i<nf;i++){ let d=i/nf*P, x,y; if(d<2*h){ x=h; y=-h+d; } else if(d<4*h){ x=h-(d-2*h); y=h; } else if(d<6*h){ x=-h; y=h-(d-4*h); } else { x=-h+(d-6*h); y=-h; } f.push({x,y}); } }
  // support in the middle (slightly behind the tip for a wedge)
  const cx = shape==='wedge' ? -sp*0.5 : 0;
  if(FACING.has(shape)){ const bx=shape==='line'?-sp*1.2:-sp*1.4; for(let i=0;i<ns;i++) s.push({x:bx,y:(i-(ns-1)/2)*sp*1.3}); }
  else if(ns===1) s.push({x:cx,y:0}); else for(let i=0;i<ns;i++){ const a=i/ns*Math.PI*2; s.push({x:cx+Math.cos(a)*sp*0.7,y:Math.sin(a)*sp*0.7}); }
  return {f,s};
}
/* which kind of unit goes to which place: a plan of slots (local, facing +x) for a shape (also drawn by the right-drag preview) */
function slotPlan(units,shape,sp){
  if(shape==='custom'){ const c=customForm(); if(c) return customPlan(units,c,sp/(FORMATION.spacing*1.15)); shape='circle'; }
  let sup=units.filter(isSupport), fig=units.filter(u=>!isSupport(u));
  if(!fig.length){ fig=sup.splice(0); }
  /* a circle or square needs at least 4 points on its outline: with fewer fighters, support takes a place on the outline too
     (otherwise 2 fighters + support in the middle make a straight line) */
  if(shape!=='wedge' && !FACING.has(shape) && fig.length<4 && sup.length){ const all=[]; while(fig.length||sup.length){ if(fig.length) all.push(fig.shift()); if(sup.length) all.push(sup.shift()); } fig=all; }
  /* behind a line or zigzag the support stands in a row: Medics in the middle, Engineers and escorts on both sides */
  if(FACING.has(shape)&&sup.length>2){ const med=sup.filter(u=>u.def.heal), oth=sup.filter(u=>!u.def.heal), h=Math.ceil(oth.length/2); sup=[...oth.slice(0,h),...med,...oth.slice(h)]; }
  return { shape, fig, sup, slots:formationSlots(shape,fig.length,sup.length,sp) }; }
/* your own formation: every place remembers the type that stood there; a Medic goes to a Medic's place, else to a support place, else anywhere.
   More soldiers than places: the rest line up behind. */
function customPlan(units,c,k){ const slots=c.slots.map(o=>({x:o.x*k,y:o.y*k,type:o.type,sup:o.sup})).sort((a,b)=>b.x-a.x), pool=[...units], pairs=[];
  for(const o of slots){ if(!pool.length) break; let i=pool.findIndex(u=>u.type===o.type); if(i<0) i=pool.findIndex(u=>isSupport(u)===o.sup); if(i<0) i=0; pairs.push([pool.splice(i,1)[0],o]); }
  const minX=Math.min(...slots.map(o=>o.x)), sp=FORMATION.spacing*1.15*k; pool.forEach((u,i)=>pairs.push([u,{x:minX-sp,y:(i-(pool.length-1)/2)*sp}]));
  return { shape:'custom', pairs }; }
/* The places of a formation for these units, each with the role that may take it: cls (support or fighter; in your own
   formation the unit type) and, in a wedge, its row from the tip (0 = the tip) so the front ranks go forward. */
function formPlaces(units,shape,sp){
  const plan=slotPlan(units,shape,sp), places=[];
  if(plan.pairs){ for(const [u,o] of plan.pairs) places.push({x:o.x,y:o.y,cls:u.type,row:0}); return { shape:plan.shape, places, clsOf:u=>u.type, rankOf:()=>0 }; }
  const clsOf=u=>isSupport(u)?'s':'f', wedge=plan.shape==='wedge';
  const pool=[...plan.fig]; if(wedge) pool.sort((a,b)=>(FRONT_RANK[a.type]??3)-(FRONT_RANK[b.type]??3));
  plan.slots.f.forEach((o,i)=>places.push({x:o.x,y:o.y,cls:clsOf(pool[i]),row:wedge?Math.ceil(i/2):0}));
  plan.sup.forEach((u,i)=>places.push({x:plan.slots.s[i].x,y:plan.slots.s[i].y,cls:clsOf(u),row:0}));
  return { shape:plan.shape, places, clsOf, rankOf:wedge?(u=>isSupport(u)?0:(FRONT_RANK[u.type]??3)):(()=>0) }; }
/* The cheapest way to give n people n places (the Hungarian method). cost[i][j]: person i on place j. Returns the place of each person. */
function assignCheapest(cost){ const n=cost.length, m=n?cost[0].length:0, INF=1e30;
  const U=new Float64Array(n+1), V=new Float64Array(m+1), P=new Int32Array(m+1), way=new Int32Array(m+1);
  for(let i=1;i<=n;i++){ P[0]=i; let j0=0; const minv=new Float64Array(m+1).fill(INF), used=new Uint8Array(m+1);
    do{ used[j0]=1; const i0=P[j0]; let delta=INF, j1=0;
      for(let j=1;j<=m;j++) if(!used[j]){ const cur=cost[i0-1][j-1]-U[i0]-V[j]; if(cur<minv[j]){ minv[j]=cur; way[j]=j0; } if(minv[j]<delta){ delta=minv[j]; j1=j; } }
      for(let j=0;j<=m;j++){ if(used[j]){ U[P[j]]+=delta; V[j]-=delta; } else minv[j]-=delta; }
      j0=j1; } while(P[j0]!==0);
    do{ const j1=way[j0]; P[j0]=P[j1]; j0=j1; } while(j0); }
  const out=new Array(n); for(let j=1;j<=m;j++) if(P[j]) out[P[j]-1]=j-1; return out; }
/* Give every unit a place for the formation facing dir. The role comes first (a support place only for support, the tip of a
   wedge for the front rank); after that, each soldier's spot relative to the squad's centre is matched with the place's spot
   relative to the formation's centre, so everyone keeps his side and nobody crosses the squad. Returns [unit, place] pairs. */
function assignPlaces(units,F,dir){
  const n=units.length, c=Math.cos(dir), s=Math.sin(dir), W=F.places.map(o=>({x:o.x*c-o.y*s, y:o.x*s+o.y*c}));
  const mx=W.reduce((a,o)=>a+o.x,0)/W.length, my=W.reduce((a,o)=>a+o.y,0)/W.length, ux=units.reduce((a,u)=>a+u.x,0)/n, uy=units.reduce((a,u)=>a+u.y,0)/n;
  const cost=units.map(u=>{ const cl=F.clsOf(u), rk=F.rankOf(u); return F.places.map((o,j)=>{ const dx=(u.x-ux)-(W[j].x-mx), dy=(u.y-uy)-(W[j].y-my);
    return dx*dx+dy*dy + (o.cls===cl?0:1e12) - 1e8*rk*o.row; }); });   /* role first, then rank by row, then distance */
  const a=assignCheapest(cost); return units.map((u,i)=>[u,F.places[a[i]]]); }
/* where the places fall around (wx,wy) facing dir. Against a wall or a rock the whole shape shifts (up to 3 tiles) to where most of it fits;
   in a room too small for it, the shape squeezes together (down to half its size) before anyone is sent elsewhere;
   a place that still falls in the rock moves to the nearest free spot the centre can see. Returns {x,y,spots:[{u,x,y}]}. */
const SQUEEZE=[1,0.85,0.7,0.55];
function placeSpots(pairs,wx,wy,dir){
  const c=Math.cos(dir), s=Math.sin(dir), all=pairs.map(p=>p[1]);
  const fits=(ox,oy,k)=>{ if(!walkableP(ox,oy)) return -1; let n=0; for(const o of all){ const x=ox+(o.x*c-o.y*s)*k, y=oy+(o.x*s+o.y*c)*k; if(walkableP(x,y)&&lineClear(ox,oy,x,y)) n++; } return n; };
  let best=-2, bx=wx, by=wy, bk=1;
  for(const k of SQUEEZE){ let kb=fits(wx,wy,k), kx=wx, ky=wy;
    if(kb<all.length){ for(let r=1;r<=3&&kb<all.length;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
        const ox=wx+dx*TILE*0.75, oy=wy+dy*TILE*0.75; if(!lineClear(wx,wy,ox,oy)) continue;   /* never shift to the other side of a wall */
        const n=fits(ox,oy,k); if(n>kb){ kb=n; kx=ox; ky=oy; } } }
    if(kb>best){ best=kb; bx=kx; by=ky; bk=k; } if(best>=all.length) break; }
  if(!walkableP(bx,by)){ const t=nearestWalkable(Math.floor(bx/TILE),Math.floor(by/TILE)); if(t){ bx=(t.x+.5)*TILE; by=(t.y+.5)*TILE; } }
  const pts=pairs.map(([u,o])=>{ const x=bx+(o.x*c-o.y*s)*bk, y=by+(o.x*s+o.y*c)*bk; return {u,x,y,ok:walkableP(x,y)&&lineClear(bx,by,x,y)}; });
  const taken=new Set(pts.filter(p=>p.ok).map(p=>Math.floor(p.x/TILE)+','+Math.floor(p.y/TILE)));
  for(const p of pts){ if(p.ok) continue; const tx=Math.floor(p.x/TILE), ty=Math.floor(p.y/TILE); p.x=bx; p.y=by;
    for(const q of SPIRAL){ const nx=tx+q.x, ny=ty+q.y, k=nx+','+ny; if(taken.has(k)||!walkableT(nx,ny)) continue; const px=(nx+.5)*TILE, py=(ny+.5)*TILE; if(!lineClear(bx,by,px,py)) continue; taken.add(k); p.x=px; p.y=py; break; } }
  return { x:bx, y:by, spots:pts }; }
/* the order a member gets: a Sweep for a line on the attack (it does not break ranks to chase, it fires on the move) */
function formOrder(u,f,type,x,y,pace){ const t=stanceType(u,type);
  if(t==='amove'&&f.shape==='line'&&u.def.damage&&!u.def.heal) return {type:'move',sweep:true,x,y,pace,form:f,seq:f.seq};
  return {type:t,x,y,pace,form:f,seq:f.seq}; }
/* a member who is busy with something of his own (repairing, healing a patient on order, an attack you gave) keeps doing it:
   he only gets his new place, and walks to it when he is done */
const formFree=u=>!u.order||u.order.type==='hold'||u.order.form||u.order.rejoin;
function giveSlot(u,f,local){ u.slot={x:local.x,y:local.y}; u.formSeq=f.seq; }
/* Settle a formation around a spot: final places and orders. fromMarch: the march just arrived (orders keep their type). */
function settleFormation(f,units,at,dir,type,fromMarch,force){
  const F=formPlaces(units,f.shape,formSpacing(f)), pl=placeSpots(assignPlaces(units,F,dir),at.x,at.y,dir), pace=Math.min(...units.map(speedOf));
  const c=Math.cos(dir), s=Math.sin(dir); f.at={x:pl.x,y:pl.y}; f.dir=dir;
  let swept=false;
  for(const {u,x,y} of pl.spots){ const dx=x-pl.x, dy=y-pl.y; giveSlot(u,f,{x:dx*c+dy*s, y:-dx*s+dy*c});
    if(fromMarch){ const o=u.order; if(o&&o.form===f){ o.x=x; o.y=y; o.pace=pace; o.seq=f.seq; u.path=null; } continue; }
    if(!force&&!formFree(u)) continue;
    u.order=formOrder(u,f,type,x,y,pace); if(u.order.sweep) swept=true; u.target=null; u.path=null; if(u.def.heal) u.healTarget=null; }
  return swept; }
/* the spot a squad stands on now: the guide of a march, or where the formation would stand around its members */
function squadSpot(units,f,F,dir){ if(marching(f)) return {x:f.march.x,y:f.march.y};
  const n=units.length, c=Math.cos(dir), s=Math.sin(dir), mx=F.places.reduce((a,o)=>a+o.x,0)/F.places.length, my=F.places.reduce((a,o)=>a+o.y,0)/F.places.length;
  const cx=units.reduce((a,u)=>a+u.x,0)/n, cy=units.reduce((a,u)=>a+u.y,0)/n, x=cx-(mx*c-my*s), y=cy-(mx*s+my*c);
  if(walkableP(x,y)) return {x,y}; if(walkableP(cx,cy)) return {x:cx,y:cy};
  const t=nearestWalkable(Math.floor(cx/TILE),Math.floor(cy/TILE)); return t?{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}:{x:cx,y:cy}; }
const angTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
/* the way a path leaves from S (the first point at least a tile away) and the way it arrives at its end */
function pathDirs(S,path){ const first=path.find(p=>Math.hypot(p.x-S.x,p.y-S.y)>TILE)||path[path.length-1], last=path[path.length-1];
  let prev=S; for(let i=path.length-2;i>=0;i--) if(Math.hypot(path[i].x-last.x,path[i].y-last.y)>TILE){ prev=path[i]; break; }
  return { out:angTo(S,first), arrive:Math.hypot(last.x-prev.x,last.y-prev.y)>4?angTo(prev,last):angTo(S,last) }; }
/* Send a squad in formation to (wx,wy). face: the direction it should face there (right-drag), or null: a shape with a front
   faces the way it walked in, a circle or square keeps its orientation. A short step re-forms in place. */
function marchTo(units,wx,wy,type,face){
  const f=units[0].formation; f.seq=(f.seq||0)+1;
  const F=formPlaces(units,f.shape,formSpacing(f)), turns=TURNS.has(f.shape), was=f.march;
  const S=squadSpot(units,f,F,f.dir), far=Math.hypot(wx-S.x,wy-S.y)>TILE*1.2;
  if(!far){ f.march=null; const dir=face!=null?face:f.dir; return finishPlace(f,units,{x:wx,y:wy},dir,type); }
  const path=findPath(S.x,S.y,wx,wy)||[{x:wx,y:wy}], last=path[path.length-1], pd=pathDirs(S,path);
  const head=turns?pd.out:(face!=null?face:f.dir);
  const endDir=face!=null?face:(turns?pd.arrive:f.dir);
  f.dir=endDir; f.at={x:wx,y:wy};
  f.march={ path, i:0, x:S.x, y:S.y, head, dest:{x:last.x,y:last.y}, endDir, face, arrive:pd.arrive, type, speed:Math.min(...units.map(speedOf))*FORMATION.march, k:1, trail:[{x:S.x,y:S.y}], spots:null, done:false };
  if(was&&!was.done&&was.trail) f.march.trail=was.trail.slice(-40);   /* a new order on the march: the file keeps its trail */
  let swept=false;
  for(const [u,o] of assignPlaces(units,F,head)){ giveSlot(u,f,o); u.order=formOrder(u,f,type,last.x,last.y,null); if(u.order.sweep) swept=true; u.target=null; u.path=null; if(u.def.heal) u.healTarget=null; }
  marchSpots(f,units);
  sweepNote(swept,units); }
function finishPlace(f,units,at,dir,type){ const swept=settleFormation(f,units,at,dir,type,false,true); sweepNote(swept,units); }
function sweepNote(swept,units){ if(swept&&units.some(u=>u.faction==='corps')){ toast('Sweep: the line advances and fires on the move.',true); uiUsed('sweep'); } }
/* Re-form a squad (a new shape, a new spacing, a soldier back up): on the march it is taken up on the way, else in place.
   force: your own key press, so everyone takes his new place; otherwise a soldier busy with his own work keeps at it. */
function reformSquad(units,f,oldMarch,force){
  f.seq=(f.seq||0)+1; const F=formPlaces(units,f.shape,formSpacing(f));
  if(oldMarch&&!oldMarch.done){ const m=f.march=oldMarch;
    const w=m.path[Math.min(m.i,m.path.length-1)], walk=Math.hypot(w.x-m.x,w.y-m.y)>4?angTo(m,w):m.head;
    if(TURNS.has(f.shape)){ m.head=walk; m.endDir=m.face!=null?m.face:m.arrive; } else { m.head=m.face!=null?m.face:f.dir; m.endDir=m.head; }
    f.dir=m.endDir; let swept=false;
    for(const [u,o] of assignPlaces(units,F,m.head)){ giveSlot(u,f,o); if(!force&&!formFree(u)) continue;
      u.order=formOrder(u,f,m.type,m.dest.x,m.dest.y,null); if(u.order.sweep) swept=true; u.path=null; }
    marchSpots(f,units); sweepNote(swept,units); return; }
  f.march=null; const at=squadSpot(units,f,F,f.dir); sweepNote(settleFormation(f,units,at,f.dir,'move',false,force),units); }
/* where a member's place is on the march now; a place in the rock (a narrow passage) becomes a spot in the file behind the guide */
function trailPoint(m,back){ let x=m.x, y=m.y; for(let i=m.trail.length-1;i>=0;i--){ const p=m.trail[i], d=Math.hypot(x-p.x,y-p.y); if(d>=back&&d>0) return {x:x+(p.x-x)*back/d, y:y+(p.y-y)*back/d}; back-=d; x=p.x; y=p.y; } return {x,y}; }
function marchSpots(f,us){ const m=f.march, c=Math.cos(m.head), s=Math.sin(m.head), spots=new Map(), file=[];
  for(const u of us){ if(!u.slot) continue; const ox=u.slot.x*c-u.slot.y*s, oy=u.slot.x*s+u.slot.y*c; let got=false;
    for(const k of [1,0.7,0.45]){ const x=m.x+ox*k, y=m.y+oy*k; if(walkableP(x,y)&&lineClear(m.x,m.y,x,y)){ spots.set(u.id,{x,y}); got=true; break; } }   /* a narrow way: squeeze in toward the guide */
    if(!got) file.push(u); }
  file.sort((a,b)=>b.slot.x-a.slot.x||Math.abs(a.slot.y)-Math.abs(b.slot.y));
  file.forEach((u,i)=>spots.set(u.id,trailPoint(m,(i+1)*FORMATION.spacing*FORMATION.file)));
  m.spots=spots; m.file=new Set(file.map(u=>u.id)); return spots; }
/* the members on this march: alive, standing, and still walking under its orders */
function marchMembers(f){ return G.ents.filter(e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.formation===f&&e.order&&e.order.form===f&&e.order.seq===f.seq); }
/* every frame: move the guide of every marching formation */
function marchFormations(dt){ const seen=new Set();
  for(const e of G.ents){ const f=e.kind==='unit'&&!e.dead&&e.formation; if(!f||!f.march||seen.has(f)) continue; seen.add(f); marchStep(f,dt); } }
function marchStep(f,dt){ const m=f.march, us=marchMembers(f);
  if(!us.length){ if(!m.done){ f.at={x:m.x,y:m.y}; f.dir=m.head; } f.march=null; return; }   /* everyone got other orders: the formation stands where its guide stopped */
  if(m.done) return;   /* arrived: the members walk to their final places */
  const spots=marchSpots(f,us);
  let lag=0, fighting=false;
  for(const u of us){ if(u.target&&u.order.type==='amove'){ fighting=true; continue; }   /* on an attack-move the squad stops to fight */
    if(u.def.heal&&u.healTarget&&!u.healTarget.dead&&dist(u,u.healTarget)<=u.def.healRange*TILE) continue;   /* a Medic at work catches up after */
    if(m.file.has(u.id)) continue;   /* a file through a door is long by nature: it does not hold up the guide */
    const p=spots.get(u.id); if(!p) continue; const d=Math.hypot(u.x-p.x,u.y-p.y);
    if(d<8*TILE&&(d<TILE||lineClear(u.x,u.y,p.x,p.y))) lag=Math.max(lag,d); }   /* someone finding his way round a corner catches up on his own */
  /* slow down for whoever falls behind (never quite to a stop: a new formation is taken up on the way) */
  m.k=fighting?0:clamp(1-(lag-FORMATION.wait*TILE)/(2*TILE),FORMATION.slowest,1);
  let step=m.speed*m.k*dt;
  while(step>0&&m.i<m.path.length){ const w=m.path[m.i], dx=w.x-m.x, dy=w.y-m.y, d=Math.hypot(dx,dy);
    if(d<=step){ m.x=w.x; m.y=w.y; step-=d; m.i++; } else { m.x+=dx/d*step; m.y+=dy/d*step; step=0; } }
  if(TURNS.has(f.shape)&&m.i<m.path.length){ const w=m.path[m.i]; if(Math.hypot(w.x-m.x,w.y-m.y)>6){ let d=angTo(m,w)-m.head; d=Math.atan2(Math.sin(d),Math.cos(d));
      const mx=FORMATION.turn*dt*Math.max(m.k,0.5); m.head+=clamp(d,-mx,mx); } }   /* a shape with a front turns gently at a corner */
  const lt=m.trail[m.trail.length-1]; if(Math.hypot(m.x-lt.x,m.y-lt.y)>8){ m.trail.push({x:m.x,y:m.y}); if(m.trail.length>200) m.trail.shift(); }
  if(m.i>=m.path.length){ m.done=true; settleFormation(f,formMembers(f).filter(u=>u.formSeq===f.seq),m.dest,m.endDir,m.type,true); }
}
/* A member walking under a formation order (instead of plain stepMove). Returns true when he has arrived. */
function walkOrder(u,dt){ const o=u.order, f=o.form;
  if(f&&(u.formation!==f||o.seq!==f.seq)){ u.order=null; u.path=null; return false; }   /* an order from an older line-up: dropped (he goes to his current place) */
  const m=f&&f.march;
  if(m&&!m.done){ const p=(m.spots&&m.spots.get(u.id))||{x:m.x,y:m.y}, d=Math.hypot(p.x-u.x,p.y-u.y);
    o.pace=Math.min(speedOf(u),m.speed*m.k+FORMATION.catchUp*d);   /* keep up with the guide, and catch up when behind */
    if(d>TILE*0.5) u.ghostT=Math.max(u.ghostT||0,0.15);   /* on his way to his place he may slip past his mates (else two of them can block each other) */
    if(lineClear(u.x,u.y,p.x,p.y)){ u.path=[{x:p.x,y:p.y}]; u.pi=0; u.goal={x:p.x,y:p.y}; u.wpKey=null; }   /* in sight: straight to his place (a moving target, so no stuck check) */
    else if(!u.path||!u.goal||G.time>u.repathAt||Math.hypot(u.goal.x-p.x,u.goal.y-p.y)>TILE){ u.path=findPath(u.x,u.y,p.x,p.y); u.pi=0; u.goal={x:p.x,y:p.y}; u.repathAt=G.time+0.6; }
    stepMove(u,dt); return false; }
  if(!u.path||!u.goal||Math.hypot(u.goal.x-o.x,u.goal.y-o.y)>TILE) setPath(u,o.x,o.y);
  if(f&&Math.hypot(o.x-u.x,o.y-u.y)>TILE*0.5) u.ghostT=Math.max(u.ghostT||0,0.15);   /* the same on the last steps to his final place */
  return stepMove(u,dt); }
function setFormation(shape){
  const us=myUnits(); if(us.length<2){ toast('Select at least two units for a formation.',true); return; }
  const cur=us[0].formation, same=!!cur&&us.every(u=>u.formation===cur), m=same&&marching(cur)?cur.march:null;
  if(same && cur.shape===shape){ us.forEach(u=>{ u.formation=null; u.slot=null; }); rememberGroupForm(us,null);
    if(m) moveGroup(us,m.dest.x,m.dest.y,m.type);   /* released on the march: they walk on to the same spot, without a formation */
    toast('Formation released.',true); G.selDirty=true; return; }
  if(shape==='custom'&&!customForm()){ toast('Nothing saved yet: set your squad up the way you like and press F.',true); return; }
  let dir=cur?cur.dir:-Math.PI/2;
  if(!m&&FACING.has(shape)){ const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
    const foe=nearestOf({x:cx,y:cy},e=>e.kind==='unit'&&e.faction!=='corps'&&e.faction!=='wild'&&!e.hidden&&isVisible(e)&&Math.hypot(e.x-cx,e.y-cy)<14*TILE); if(foe) dir=Math.atan2(foe.y-cy,foe.x-cx); }
  /* a squad walking without a formation (or a march that is nearly there) keeps going to the same spot, now in formation */
  let to=null; if(!m){ const mv=us.filter(u=>u.order&&(u.order.type==='move'||u.order.type==='amove')&&!u.order.rejoin&&u.order.x!=null);
    if(mv.length*2>=us.length){ const x=mv.reduce((a,u)=>a+u.order.x,0)/mv.length, y=mv.reduce((a,u)=>a+u.order.y,0)/mv.length, cx=us.reduce((a,u)=>a+u.x,0)/us.length, cy=us.reduce((a,u)=>a+u.y,0)/us.length;
      if(Math.hypot(x-cx,y-cy)>TILE*1.5) to={x,y,type:mv.some(u=>u.order.type==='amove'||u.order.sweep)?'amove':'move'}; } }
  const f={shape,dir,gap:cur?cur.gap||1:1,seq:0}; us.forEach(u=>u.formation=f); rememberGroupForm(us,f); if(shape==='custom') uiUsed('formcustom');
  if(to){ if(TURNS.has(shape)) f.dir=angTo({x:us.reduce((a,u)=>a+u.x,0)/us.length,y:us.reduce((a,u)=>a+u.y,0)/us.length},to); marchTo(us,to.x,to.y,to.type,null); }
  else reformSquad(us,f,m,true);
  SFX.play('ack'); toast(`Formation: ${FORMATIONS[shape].name}${m||to?' (on the move)':''}`,true); G.selDirty=true;
}
/* F: save the squad as it stands as your own formation (facing the way its formation faces, else north) */
function saveFormation(){ const us=myUnits(); if(us.length<2){ toast('Select at least two units to save a formation.',true); return; }
  const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length, sf=sharedForm(us), dir=sf?(marching(sf)?sf.march.head:sf.dir):-Math.PI/2, gap=(sf&&sf.gap)||1, c=Math.cos(dir), s=Math.sin(dir);
  const slots=us.map(u=>{ const dx=u.x-cx, dy=u.y-cy; return { x:Math.round((dx*c+dy*s)/gap), y:Math.round((-dx*s+dy*c)/gap), type:u.type, sup:isSupport(u) }; });
  if(slots.some(o=>Math.hypot(o.x,o.y)>7*TILE)){ toast('Too spread out: keep the squad within 7 tiles of its centre.',true); return; }
  store.set('hc-myform',{slots}); const f={shape:'custom',dir,gap,seq:0}; us.forEach(u=>u.formation=f); rememberGroupForm(us,f); uiUsed('formsave');
  /* they stand in it already: their places are where they stand */
  f.at={x:cx,y:cy}; f.seq=1; us.forEach((u,i)=>{ giveSlot(u,f,{x:slots[i].x*gap,y:slots[i].y*gap}); if(u.order&&u.order.form) u.order=null; });
  SFX.play('ready'); toast(`Your formation is saved (${us.length} places). Y puts any squad in it, also in later missions.`,true); G.selDirty=true; }
/* E: tight, normal or wide (the whole formation, also on the march) */
function cmdGap(){ const us=myUnits(), f=sharedForm(us); if(!f){ toast('Pick a formation first.',true); return; }
  const i=GAPS.findIndex(g=>g.k===(f.gap||1)); f.gap=GAPS[(i+1)%GAPS.length].k;
  reformSquad(formMembers(f),f,marching(f)?f.march:null,true);
  uiUsed('gap'); SFX.play('ack'); toast(`Spacing: ${gapName(f)}`,true); G.selDirty=true;
}
/* a control group back into the formation it remembers */
function groupFormUp(us,f){ us.forEach(u=>u.formation=f); f.march=null; reformSquad(us,f,null,true); }
/* You order part of a formation somewhere on its own (one Medic, or two of the squad): they leave that formation, so they do not walk
   back to their old place afterwards. Two or more moved together keep the shape between them. Called with the whole selection. */
function leaveFormation(sel){ const byForm=new Map(); for(const u of sel) if(u.formation){ if(!byForm.has(u.formation)) byForm.set(u.formation,[]); byForm.get(u.formation).push(u); }
  for(const [f,us] of byForm){ const members=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.formation===f); if(members.every(m=>us.includes(m))) continue;
    if(us.length>1){ const nf={...f,march:null,seq:0}; us.forEach(u=>u.formation=nf); } else us.forEach(u=>{ u.formation=null; u.slot=null; u.rejoin=false; }); } }
/* where a soldier belongs in his formation now (it follows the squad when it moves on without him), or null */
function formationSpot(u){ const f=u.formation; if(!f||!u.slot||u.faction!=='corps') return null;
  if(u.formSeq!=null&&u.formSeq!==f.seq) return null;   /* his place belongs to an older line-up */
  if(!G.ents.some(e=>e!==u&&!e.dead&&e.kind==='unit'&&e.formation===f)) return null;
  const m=f.march; if(m&&!m.done){ const p=m.spots&&m.spots.get(u.id); if(p) return p; const c=Math.cos(m.head), s=Math.sin(m.head), x=m.x+u.slot.x*c-u.slot.y*s, y=m.y+u.slot.x*s+u.slot.y*c; return walkableP(x,y)?{x,y}:{x:m.x,y:m.y}; }
  if(!f.at) return null;
  const c=Math.cos(f.dir), s=Math.sin(f.dir), x=f.at.x+u.slot.x*c-u.slot.y*s, y=f.at.y+u.slot.x*s+u.slot.y*c; return walkableP(x,y)?{x,y}:null; }
/* back into his place after stepping out (an Engineer after a repair, a Medic after a patient, a soldier after a fight) */
function rejoinFormation(u){ const p=formationSpot(u); if(!p||Math.hypot(u.x-p.x,u.y-p.y)<TILE*0.8) return false;
  u.order={type:'move',x:p.x,y:p.y,rejoin:true}; u.target=null; setPath(u,p.x,p.y); return true; }
/* a soldier back on his feet: his place may have gone to someone else while he was down, so the squad makes room for him */
function backInFormation(u){ u.order=null; u.path=null; u.target=null; const f=u.formation; if(!f) return;
  const mates=formMembers(f); if(mates.length<2){ u.formation=null; u.slot=null; return; }
  if(u.formSeq===f.seq&&!marching(f)) return;   /* nothing moved while he was down: his place is still his */
  reformSquad(mates,f,marching(f)?f.march:null); }
/* an attack you order on one enemy: the squad leaves its spot; after the fight they stay where they are (no walking back) */
function formationsEngage(units){ for(const u of units){ const f=u.formation; if(f){ f.march=null; f.at=null; } } }
/* right mouse held and dragged: the squad goes to where you pressed and faces the way you dragged */
function canFace(){ const us=myUnits(); return us.length>1&&us[0].formation&&us.every(u=>u.formation===us[0].formation); }
function moveFacing(wx,wy,dir){ const us=myUnits(); if(!canFace()) { smartCommand(wx,wy); return; }
  leaveFormation(us); anyBarker(us,stanceOf(us)==='attack'?'attack':'move'); marchTo(us,wx,wy,'move',dir);
  SFX.play('ack'); startFollow(); G.pings.push({x:wx,y:wy,t:2.5,col:'#5fe3b0'}); uiUsed('facing'); G.selDirty=true; }
/* put a squad straight into a formation where it stands (no walking): used at the start of a mission */
function formUp(units,shape,dir=-Math.PI/2){ if(units.length<2) return; const f={shape,dir,gap:1,seq:0}; units.forEach(u=>u.formation=f);
  reformSquad(units,f,null,true);
  for(const u of units){ if(u.order&&u.order.x!=null){ u.x=u.order.x; u.y=u.order.y; } u.order=null; u.path=null; u.home={x:u.x,y:u.y}; } }
