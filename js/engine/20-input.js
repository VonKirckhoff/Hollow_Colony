'use strict';
/* ---------- 2s. input ---------- */
function toWorld(sx,sy){ return {x:sx+Math.round(G.cam.x), y:sy+Math.round(G.cam.y)}; }
cv.addEventListener('contextmenu',e=>e.preventDefault());
$('#hud').addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  if(G&&afterDefeat()&&(ui.mode==='game'||ui.mode==='end')){ stopFollow(); ui.pan={x:e.clientX,y:e.clientY,cam:{...G.cam}}; cv.setPointerCapture(e.pointerId); e.preventDefault(); return; }   /* watching after a defeat: any drag pans the camera */
  if(ui.mode!=='game'||!G||G.over) return; cv.setPointerCapture(e.pointerId);
  const w=toWorld(e.clientX,e.clientY);
  if(e.pointerType==='touch'){ ui.drag={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,touch:true,cam:{...G.cam}}; return; }
  if(e.button===1){ ui.pan={x:e.clientX,y:e.clientY,cam:{...G.cam}}; e.preventDefault(); return; }
  if(e.button===2&&(ui.burrow||ui.rallyPick)){ ui.burrow=false; ui.rallyPick=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.button===2&&ui.flare){ ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.button===2){ if(ui.picking){ ui.picking=null; cv.classList.remove('amove'); G.selDirty=true; return; } if(ui.placing){ ui.placing=null; G.selDirty=true; return; } if(ui.amove){ ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; return; } if(G.side==='corps'&&canFace()){ ui.rdrag={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,wx:w.x,wy:w.y}; return; } smartCommand(w.x,w.y); return; }
  if(e.button===0){
    if(ui.placing){ tryPlace(e.shiftKey); return; }
    if(ui.picking){ const s=entityAt(w.x,w.y,x=>x.faction==='corps'&&x.kind==='building'&&x.def.portable&&x.built); ui.picking=null; cv.classList.remove('amove'); G.selDirty=true;
      if(s) packSentry(s); else toast('Click one of your Sentry Guns.'); return; }
    if(ui.flare){ throwFlare(w.x,w.y); return; }
    if(ui.burrow){ burrowAt(w.x,w.y); return; }
    if(ui.rallyPick){ ui.rallyPick=false; cv.classList.remove('amove'); setRally(w.x,w.y); return; }
    if(ui.amove){ attackMoveAt(w.x,w.y); return; }
    ui.drag={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,box:false,shift:e.shiftKey};
  }
});
function attackMoveAt(wx,wy){ if(G.side==='swarm'){ sendWave(wx,wy); return; } const t=entityAt(wx,wy,e=>e.faction!=='corps'&&e.kind!=='crate'); const units=myUnits(); leaveFormation(units);
  const squad=units.filter(u=>!u.def.heal), medics=units.filter(u=>u.def.heal);
  for(const u of units){ u.stance = u.def.damage&&!u.def.heal ? 'attack' : null; u.quiet=false; }   /* an attack order also lifts hold fire */   /* the attack stance stays on for later moves; Medics drop a defensive stance and follow */
  if(t){ for(const u of squad){ u.order={type:'attack',target:t}; u.target=t; } } else if(squad.length) moveGroup(squad,wx,wy,'amove');
  for(const u of medics){ if(squad.length){ u.order={type:'support',squad}; u.path=null; } else moveGroup([u],wx,wy,'move'); }
  SFX.play('attack'); startFollow(); G.pings.push({x:wx,y:wy,t:2.4,col:'#ff5a4f'}); ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; }
window.addEventListener('pointermove',e=>{
  ui.mouse.x=e.clientX; ui.mouse.y=e.clientY; ui.mouse.inWin=true;
  if(G){ const w=toWorld(e.clientX,e.clientY); ui.mouse.wx=w.x; ui.mouse.wy=w.y; }
  if(ui.pan&&G){ stopFollow(); G.cam.x=ui.pan.cam.x-(e.clientX-ui.pan.x); G.cam.y=ui.pan.cam.y-(e.clientY-ui.pan.y); clampCam(); }
  if(ui.rdrag){ ui.rdrag.x1=e.clientX; ui.rdrag.y1=e.clientY; }
  if(ui.drag){ ui.drag.x1=e.clientX; ui.drag.y1=e.clientY;
    if(ui.drag.touch){ if(Math.hypot(ui.drag.x1-ui.drag.x0,ui.drag.y1-ui.drag.y0)>10) ui.drag.panning=true; if(ui.drag.panning&&G){ stopFollow(); G.cam.x=ui.drag.cam.x-(ui.drag.x1-ui.drag.x0); G.cam.y=ui.drag.cam.y-(ui.drag.y1-ui.drag.y0); clampCam(); } }
    else if(Math.abs(ui.drag.x1-ui.drag.x0)+Math.abs(ui.drag.y1-ui.drag.y0)>6) ui.drag.box=true; }
  if(mmDrag) minimapPointer(e);
  showTip(e);
});
document.addEventListener('pointerleave',()=>{ ui.mouse.inWin=false; });
window.addEventListener('blur',()=>{ ui.mouse.inWin=false; ui.keys={}; });
window.addEventListener('pointerup',e=>{
  mmDrag=false; if(ui.pan){ ui.pan=null; return; }
  if(ui.rdrag){ const r=ui.rdrag; ui.rdrag=null; if(!G||ui.mode!=='game') return;
    if(Math.hypot(r.x1-r.x0,r.y1-r.y0)>18) moveFacing(r.wx,r.wy,Math.atan2(r.y1-r.y0,r.x1-r.x0)); else smartCommand(r.wx,r.wy); return; }
  const d=ui.drag; ui.drag=null; if(!d||!G||ui.mode!=='game') return;
  if(d.touch){ if(d.panning) return; const w=toWorld(d.x1,d.y1); const hit=entityAt(w.x,w.y,e=>e.faction===G.side);
    if(hit){ selectEntities([hit],false); } else if(myUnits().length){ if(ui.placing) tryPlace(false); else smartCommand(w.x,w.y); } else { const any=entityAt(w.x,w.y); selectEntities(any?[any]:[],false); } return; }
  if(d.box){
    const a=toWorld(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1)), b=toWorld(Math.max(d.x0,d.x1),Math.max(d.y0,d.y1));
    const inBox=G.ents.filter(e=>!e.dead&&e.faction===G.side&&e.x>=a.x&&e.x<=b.x&&e.y-6>=a.y&&e.y-6<=b.y);
    const units=inBox.filter(e=>e.kind==='unit'); selectEntities(units.length?units:inBox.filter(e=>e.kind==='building').slice(0,1),d.shift);
  } else {
    const w=toWorld(d.x1,d.y1); const hit=entityAt(w.x,w.y,e=>e.kind!=='crate');
    if(!hit){ if(!d.shift) selectEntities([],false); return; }
    const now=performance.now();
    if(hit.faction===G.side && ui.lastClick.id===hit.id && now-ui.lastClick.t<350){
      const same=G.ents.filter(e=>!e.dead&&e.faction===G.side&&e.type===hit.type&&e.x>G.cam.x&&e.x<G.cam.x+ui.vw&&e.y>G.cam.y&&e.y<G.cam.y+ui.vh); selectEntities(same,d.shift);
    } else if(d.shift && hit.faction===G.side){ if(G.sel.includes(hit)){ G.sel=G.sel.filter(x=>x!==hit); G.selDirty=true; uiUsed('shiftdel'); } else { selectEntities([hit],true); uiUsed('shiftadd'); } }
    else selectEntities([hit],false);
    ui.lastClick={id:hit.id,t:now};
  }
});
// minimap
let mmDrag=false;
function minimapPointer(e){ const r=mm.getBoundingClientRect(); const x=(e.clientX-r.left)/G.mmScale*TILE, y=(e.clientY-r.top)/G.mmScale*TILE; return {x,y,move:()=>{ stopFollow(); centerOn(x,y); }}; }
mm.addEventListener('pointerdown',e=>{ if(!G) return; e.preventDefault(); const p=minimapPointer(e); if(e.button===2){ if(!G.over) smartCommand(p.x,p.y); return; } mmDrag=true; p.move(); });
mm.addEventListener('pointermove',e=>{ if(mmDrag&&G) minimapPointer(e).move(); });
// HUD clicks (delegated, on pointerdown so rebuilt markup never swallows a click)
$('#cmdcard').addEventListener('pointerdown',e=>{ const b=e.target.closest('[data-cmd]'); if(!b) return; e.preventDefault(); const c=CMDS[+b.dataset.cmd]; if(c) c.act(); G.selDirty=true; });
$('#selection').addEventListener('pointerdown',e=>{ const q=e.target.closest('[data-cancel]'); if(q){ const b=G.sel[0]; if(b) cancelTrain(b,+q.dataset.cancel); return; }
  const gh=e.target.closest('[data-type]'); if(gh){ selectEntities(G.sel.filter(x=>!x.dead&&x.type===gh.dataset.type),false); return; }
  const o=e.target.closest('[data-only]'); if(o){ const ent=G.sel.find(x=>x.id===+o.dataset.only); if(ent){ selectEntities([ent],false); if(e.detail>1) centerOn(ent.x,ent.y); } } });
/* hovering a soldier in the selection panel lights him up on the map (a group header lights up the whole group) */
$('#selection').addEventListener('pointerover',e=>{ if(!G) return; const o=e.target.closest('[data-only]'), gh=e.target.closest('[data-type]');
  ui.hover = o ? {id:+o.dataset.only} : gh ? {type:gh.dataset.type} : null; });
$('#selection').addEventListener('pointerleave',()=>{ ui.hover=null; });
$('#btn-menu').addEventListener('click',()=>pause(true));
const soundLabel=()=>{ $('#btn-sound').textContent=SFX.muted?'Sound off':'Sound on'; };
$('#btn-sound').addEventListener('click',()=>{ uiUsed('sound'); SFX.toggle(); soundLabel(); if(SFX.muted&&window.speechSynthesis) speechSynthesis.cancel(); }); soundLabel();
const followLabel=()=>{ $('#btn-follow').textContent=ui.follow?'Follow on':'Follow off'; };
function toggleFollow(){ uiUsed('follow'); ui.follow=!ui.follow; store.set('hc-follow',ui.follow); if(!ui.follow) stopFollow(); followLabel(); toast(ui.follow?'Camera follows your squad.':'Camera follow off.',true); }
$('#btn-follow').addEventListener('click',toggleFollow); followLabel();
$('#btn-tracker').addEventListener('click',()=>toggleTracker()); $('#btn-voices').addEventListener('click',()=>toggleVoices());   /* label set at boot (23-main-loop.js) */
$('#btn-speed').addEventListener('click',()=>{ if(!G) return; uiUsed('speed'+(G.speed===1?'1.5':G.speed===1.5?'2':'1')); G.speed=G.speed===1?1.5:G.speed===1.5?2:1; $('#btn-speed').textContent=G.speed+'×'; });
function showTip(e){ const tip=$('#tooltip'); const el=e.target.closest&&e.target.closest('[data-tip]'); if(!el){ tip.hidden=true; return; }
  const [t,b]=el.dataset.tip.split('|'); tip.innerHTML=`<b>${t}</b>${b||''}`; tip.hidden=false; const r=tip.getBoundingClientRect();
  tip.style.left=clamp(e.clientX+14,8,innerWidth-r.width-8)+'px'; tip.style.top=clamp(e.clientY-r.height-14,8,innerHeight-r.height-8)+'px'; }
window.addEventListener('keydown',e=>{
  if(e.target&&e.target.closest&&e.target.closest('#dev')) return;   /* typing in the dev panel */
  if(G&&afterDefeat()&&ui.mode==='end'&&e.key.startsWith('Arrow')){ ui.keys[e.key]=true; e.preventDefault(); return; }   /* arrow keys pan while you watch after a defeat */
  if(ui.mode!=='game'||!G) { if(e.key==='Escape'&&ui.mode==='pause'){ if($('#s-pause').hidden) show('pause'); else pause(false); } return; }   /* Esc in the Field Manual (from pause) goes back to the pause menu */
  if(e.key==='Enter'&&G.vars&&G.vars.cardOpen){ e.preventDefault(); tutConfirm(); return; }   /* a training card is open: Enter closes it, every other key still plays */
  ui.keys[e.key]=true;
  if(G.over) return;
  const k=e.key.toLowerCase();
  if(e.key==='Escape'&&(ui.burrow||ui.rallyPick)){ ui.burrow=false; ui.rallyPick=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.key==='Escape'&&ui.flare){ ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.key==='Escape'){ if(ui.picking){ ui.picking=null; cv.classList.remove('amove'); G.selDirty=true; } else if(ui.placing){ ui.placing=null; G.selDirty=true; } else if(ui.amove){ ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; } else pause(true); return; }
  if(k==='p'){ pause(true); return; }
  if(k==='c' && !e.ctrlKey && !e.metaKey){ toggleFollow(); return; }
  if(k==='k' && !e.ctrlKey && !e.metaKey){ toggleTracker(); return; }
  if(k==='o' && !e.ctrlKey && !e.metaKey){ toggleVoices(); return; }
  /* control groups 1–5, by key position so AZERTY works too: Ctrl+N saves the selection as group N, Ctrl+Shift+N adds it to group N,
     N selects the group (twice: the camera jumps to it). A soldier may be in more than one group. */
  const gm=/^(?:Digit|Numpad)([1-5])$/.exec(e.code||''); if(gm){ const n=gm[1]; e.preventDefault();
    if(e.ctrlKey||e.metaKey){ const cur=(G.groups[n]||[]).filter(x=>!x.dead);
      G.groupForm=G.groupForm||{};
      if(e.shiftKey){ G.groups[n]=[...new Set([...cur,...G.sel])]; if(!G.groupForm[n]) G.groupForm[n]=sharedForm(G.groups[n].filter(x=>x.kind==='unit')); uiUsed('groupadd'); toast(`Added to group ${n}: ${G.groups[n].length} now.`,true); }
      else { G.groups[n]=[...G.sel]; G.groupForm[n]=sharedForm(G.sel.filter(x=>x.kind==='unit')); uiUsed('groupsave'); toast(`Group ${n} saved (${G.sel.length})${G.groupForm[n]?`, in ${FORMATIONS[G.groupForm[n].shape].name} formation`:''}.`,true); }
      G.selDirty=true; }
    else { const g=(G.groups[n]||[]).filter(x=>!x.dead); if(g.length){ const again=G.sel.length===g.length&&g.every(x=>G.sel.includes(x)); selectEntities(g,false); uiUsed('groupsel'); if(again) centerOn(g[0].x,g[0].y);
        /* the group remembers its formation: back into it if they are not in it now */
        const f=(G.groupForm||{})[n], us=myUnits(); if(f&&us.length>1&&!us.every(u=>u.formation===f)&&(f.shape!=='custom'||customForm())){ us.forEach(u=>u.formation=f);
          placeFormation(us,us.reduce((s,u)=>s+u.x,0)/us.length,us.reduce((s,u)=>s+u.y,0)/us.length,f.dir,'move'); uiUsed('groupform'); toast(`Group ${n}: back in ${FORMATIONS[f.shape].name} formation.`,true); } } }
    return; }
  if(e.key===' '){ e.preventDefault(); if(G.alert) centerOn(G.alert.x,G.alert.y); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(k==='n'&&G.mission.training){ G.vars.skip=true; toast('Step skipped.',true); return; }   /* training: skip a step */
  const c=CMDS.find(c=>c.key.toLowerCase()===k); if(c){ e.preventDefault(); c.act(); G.selDirty=true; }
});
window.addEventListener('keyup',e=>{ ui.keys[e.key]=false; });
/* Camera follow: after a move or attack order the camera glides along with the selected squad.
   Scrolling the map yourself pauses following until your next order. Toggle with C or the Follow button. */
function startFollow(){ if(ui.follow&&G) G.following=true; }
function stopFollow(){ if(G) G.following=false; }
function updateCamera(dt){
  if(!G||!(ui.mode==='game'||ui.mode==='end'&&afterDefeat())) return; let vx=0, vy=0; const sp=760*dt, edge=10;
  if(ui.keys.ArrowLeft) vx-=sp; if(ui.keys.ArrowRight) vx+=sp; if(ui.keys.ArrowUp) vy-=sp; if(ui.keys.ArrowDown) vy+=sp;
  if(ui.mouse.inWin && !ui.overDev && !ui.drag && !ui.pan && !mmDrag && matchMedia('(pointer:fine)').matches){ if(ui.mouse.x<edge) vx-=sp; if(ui.mouse.x>ui.vw-edge) vx+=sp; if(ui.mouse.y<edge) vy-=sp; if(ui.mouse.y>ui.vh-edge) vy+=sp; }
  if(vx||vy){ stopFollow(); G.cam.x+=vx; G.cam.y+=vy; clampCam(); }
  else if(G.following && !G.paused){
    const us=G.side==='swarm'?(G.avatar&&!G.avatar.dead&&G.avatar.kind==='unit'?[G.avatar]:selSwarm()):myUnits(); if(!us.length){ stopFollow(); return; }
    const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
    const tx=cx-ui.vw/2, ty=cy-(ui.vh-ui.hudH)/2, k=Math.min(1,dt*3.5);
    G.cam.x+=(tx-G.cam.x)*k; G.cam.y+=(ty-G.cam.y)*k; clampCam();
  }
  const w=toWorld(ui.mouse.x,ui.mouse.y); ui.mouse.wx=w.x; ui.mouse.wy=w.y;
}

$('#tut-ok').addEventListener('click',()=>tutConfirm()); $('#tut-prev').addEventListener('click',()=>tutPage(-1)); $('#tut-next').addEventListener('click',()=>tutPage(1));
$('#tut-practice').addEventListener('click',()=>tutPractice()); $('#tut-open').addEventListener('click',()=>tutReopen());
