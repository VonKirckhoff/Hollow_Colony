'use strict';
/* ---------- 2s. input ---------- */
function toWorld(sx,sy){ return {x:sx+Math.round(G.cam.x), y:sy+Math.round(G.cam.y)}; }
cv.addEventListener('contextmenu',e=>e.preventDefault());
$('#hud').addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  if(ui.mode!=='game'||!G||G.over) return; cv.setPointerCapture(e.pointerId);
  const w=toWorld(e.clientX,e.clientY);
  if(e.pointerType==='touch'){ ui.drag={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,touch:true,cam:{...G.cam}}; return; }
  if(e.button===1){ ui.pan={x:e.clientX,y:e.clientY,cam:{...G.cam}}; e.preventDefault(); return; }
  if(e.button===2&&ui.flare){ ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.button===2){ if(ui.picking){ ui.picking=null; cv.classList.remove('amove'); G.selDirty=true; return; } if(ui.placing){ ui.placing=null; G.selDirty=true; return; } if(ui.amove){ ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; return; } smartCommand(w.x,w.y); return; }
  if(e.button===0){
    if(ui.placing){ tryPlace(e.shiftKey); return; }
    if(ui.picking){ const s=entityAt(w.x,w.y,x=>x.faction==='corps'&&x.kind==='building'&&x.def.portable&&x.built); ui.picking=null; cv.classList.remove('amove'); G.selDirty=true;
      if(s) packSentry(s); else toast('Click one of your Sentry Guns.'); return; }
    if(ui.flare){ throwFlare(w.x,w.y); return; }
    if(ui.amove){ attackMoveAt(w.x,w.y); return; }
    ui.drag={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,box:false,shift:e.shiftKey};
  }
});
function attackMoveAt(wx,wy){ const t=entityAt(wx,wy,e=>e.faction!=='corps'&&e.kind!=='crate'); const units=myUnits();
  const squad=units.filter(u=>!u.def.heal), medics=units.filter(u=>u.def.heal);
  if(t){ for(const u of squad){ u.order={type:'attack',target:t}; u.target=t; } } else if(squad.length) moveGroup(squad,wx,wy,'amove');
  for(const u of medics){ if(squad.length){ u.order={type:'support',squad}; u.path=null; } else moveGroup([u],wx,wy,'move'); }
  SFX.play('attack'); startFollow(); G.pings.push({x:wx,y:wy,t:2.4,col:'#ff5a4f'}); ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; }
window.addEventListener('pointermove',e=>{
  ui.mouse.x=e.clientX; ui.mouse.y=e.clientY; ui.mouse.inWin=true;
  if(G){ const w=toWorld(e.clientX,e.clientY); ui.mouse.wx=w.x; ui.mouse.wy=w.y; }
  if(ui.pan&&G){ stopFollow(); G.cam.x=ui.pan.cam.x-(e.clientX-ui.pan.x); G.cam.y=ui.pan.cam.y-(e.clientY-ui.pan.y); clampCam(); }
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
  const d=ui.drag; ui.drag=null; if(!d||!G||ui.mode!=='game') return;
  if(d.touch){ if(d.panning) return; const w=toWorld(d.x1,d.y1); const hit=entityAt(w.x,w.y,e=>e.faction==='corps');
    if(hit){ selectEntities([hit],false); } else if(myUnits().length){ if(ui.placing) tryPlace(false); else smartCommand(w.x,w.y); } else { const any=entityAt(w.x,w.y); selectEntities(any?[any]:[],false); } return; }
  if(d.box){
    const a=toWorld(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1)), b=toWorld(Math.max(d.x0,d.x1),Math.max(d.y0,d.y1));
    const inBox=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.x>=a.x&&e.x<=b.x&&e.y-6>=a.y&&e.y-6<=b.y);
    const units=inBox.filter(e=>e.kind==='unit'); selectEntities(units.length?units:inBox.filter(e=>e.kind==='building').slice(0,1),d.shift);
  } else {
    const w=toWorld(d.x1,d.y1); const hit=entityAt(w.x,w.y,e=>e.kind!=='crate');
    if(!hit){ if(!d.shift) selectEntities([],false); return; }
    const now=performance.now();
    if(hit.faction==='corps' && ui.lastClick.id===hit.id && now-ui.lastClick.t<350){
      const same=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.type===hit.type&&e.x>G.cam.x&&e.x<G.cam.x+ui.vw&&e.y>G.cam.y&&e.y<G.cam.y+ui.vh); selectEntities(same,d.shift);
    } else if(d.shift && hit.faction==='corps'){ if(G.sel.includes(hit)){ G.sel=G.sel.filter(x=>x!==hit); G.selDirty=true; } else selectEntities([hit],true); }
    else selectEntities([hit],false);
    ui.lastClick={id:hit.id,t:now};
  }
});
// minimap
let mmDrag=false;
function minimapPointer(e){ const r=mm.getBoundingClientRect(); const x=(e.clientX-r.left)/G.mmScale*TILE, y=(e.clientY-r.top)/G.mmScale*TILE; return {x,y,move:()=>{ stopFollow(); centerOn(x,y); }}; }
mm.addEventListener('pointerdown',e=>{ if(!G) return; e.preventDefault(); const p=minimapPointer(e); if(e.button===2){ smartCommand(p.x,p.y); return; } mmDrag=true; p.move(); });
mm.addEventListener('pointermove',e=>{ if(mmDrag&&G) minimapPointer(e).move(); });
// HUD clicks (delegated, on pointerdown so rebuilt markup never swallows a click)
$('#cmdcard').addEventListener('pointerdown',e=>{ const b=e.target.closest('[data-cmd]'); if(!b) return; e.preventDefault(); const c=CMDS[+b.dataset.cmd]; if(c) c.act(); G.selDirty=true; });
$('#selection').addEventListener('pointerdown',e=>{ const q=e.target.closest('[data-cancel]'); if(q){ const b=G.sel[0]; if(b) cancelTrain(b,+q.dataset.cancel); return; }
  const gh=e.target.closest('[data-type]'); if(gh){ selectEntities(G.sel.filter(x=>!x.dead&&x.type===gh.dataset.type),false); return; }
  const o=e.target.closest('[data-only]'); if(o){ const ent=G.sel.find(x=>x.id===+o.dataset.only); if(ent){ selectEntities([ent],false); if(e.detail>1) centerOn(ent.x,ent.y); } } });
$('#btn-menu').addEventListener('click',()=>pause(true));
const soundLabel=()=>{ $('#btn-sound').textContent=SFX.muted?'Sound off':'Sound on'; };
$('#btn-sound').addEventListener('click',()=>{ SFX.toggle(); soundLabel(); if(SFX.muted&&window.speechSynthesis) speechSynthesis.cancel(); }); soundLabel();
const followLabel=()=>{ $('#btn-follow').textContent=ui.follow?'Follow on':'Follow off'; };
function toggleFollow(){ ui.follow=!ui.follow; store.set('hc-follow',ui.follow); if(!ui.follow) stopFollow(); followLabel(); toast(ui.follow?'Camera follows your squad.':'Camera follow off.',true); }
$('#btn-follow').addEventListener('click',toggleFollow); followLabel();
$('#btn-tracker').addEventListener('click',()=>toggleTracker()); $('#btn-voices').addEventListener('click',()=>toggleVoices());   /* label set at boot (23-main-loop.js) */
$('#btn-speed').addEventListener('click',()=>{ if(!G) return; G.speed=G.speed===1?1.5:G.speed===1.5?2:1; $('#btn-speed').textContent=G.speed+'×'; });
function showTip(e){ const tip=$('#tooltip'); const el=e.target.closest&&e.target.closest('[data-tip]'); if(!el){ tip.hidden=true; return; }
  const [t,b]=el.dataset.tip.split('|'); tip.innerHTML=`<b>${t}</b>${b||''}`; tip.hidden=false; const r=tip.getBoundingClientRect();
  tip.style.left=clamp(e.clientX+14,8,innerWidth-r.width-8)+'px'; tip.style.top=clamp(e.clientY-r.height-14,8,innerHeight-r.height-8)+'px'; }
window.addEventListener('keydown',e=>{
  if(ui.mode!=='game'||!G) { if(e.key==='Escape'&&ui.mode==='pause') pause(false); return; }
  ui.keys[e.key]=true;
  if(G.over) return;
  const k=e.key.toLowerCase();
  if(e.key==='Escape'&&ui.flare){ ui.flare=false; cv.classList.remove('amove'); G.selDirty=true; return; }
  if(e.key==='Escape'){ if(ui.picking){ ui.picking=null; cv.classList.remove('amove'); G.selDirty=true; } else if(ui.placing){ ui.placing=null; G.selDirty=true; } else if(ui.amove){ ui.amove=false; cv.classList.remove('amove'); G.selDirty=true; } else pause(true); return; }
  if(k==='p'){ pause(true); return; }
  if(k==='c' && !e.ctrlKey && !e.metaKey){ toggleFollow(); return; }
  if(k==='k' && !e.ctrlKey && !e.metaKey){ toggleTracker(); return; }
  if(k==='o' && !e.ctrlKey && !e.metaKey){ toggleVoices(); return; }
  if(/^[1-5]$/.test(e.key)){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); G.groups[e.key]=[...G.sel]; toast(`Group ${e.key} saved.`,true); } else { const g=(G.groups[e.key]||[]).filter(x=>!x.dead); if(g.length){ const again=G.sel.length===g.length&&g.every(x=>G.sel.includes(x)); selectEntities(g,false); if(again) centerOn(g[0].x,g[0].y); } } return; }
  if(e.key===' '){ e.preventDefault(); if(G.alert) centerOn(G.alert.x,G.alert.y); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const c=CMDS.find(c=>c.key.toLowerCase()===k); if(c){ e.preventDefault(); c.act(); G.selDirty=true; }
});
window.addEventListener('keyup',e=>{ ui.keys[e.key]=false; });
/* Camera follow: after a move or attack order the camera glides along with the selected squad.
   Scrolling the map yourself pauses following until your next order. Toggle with C or the Follow button. */
function startFollow(){ if(ui.follow&&G) G.following=true; }
function stopFollow(){ if(G) G.following=false; }
function updateCamera(dt){
  if(!G||ui.mode!=='game') return; let vx=0, vy=0; const sp=760*dt, edge=10;
  if(ui.keys.ArrowLeft) vx-=sp; if(ui.keys.ArrowRight) vx+=sp; if(ui.keys.ArrowUp) vy-=sp; if(ui.keys.ArrowDown) vy+=sp;
  if(ui.mouse.inWin && !ui.drag && !ui.pan && !mmDrag && matchMedia('(pointer:fine)').matches){ if(ui.mouse.x<edge) vx-=sp; if(ui.mouse.x>ui.vw-edge) vx+=sp; if(ui.mouse.y<edge) vy-=sp; if(ui.mouse.y>ui.vh-edge) vy+=sp; }
  if(vx||vy){ stopFollow(); G.cam.x+=vx; G.cam.y+=vy; clampCam(); }
  else if(G.following && !G.paused){
    const us=myUnits(); if(!us.length){ stopFollow(); return; }
    const cx=us.reduce((s,u)=>s+u.x,0)/us.length, cy=us.reduce((s,u)=>s+u.y,0)/us.length;
    const tx=cx-ui.vw/2, ty=cy-(ui.vh-ui.hudH)/2, k=Math.min(1,dt*3.5);
    G.cam.x+=(tx-G.cam.x)*k; G.cam.y+=(ty-G.cam.y)*k; clampCam();
  }
  const w=toWorld(ui.mouse.x,ui.mouse.y); ui.mouse.wx=w.x; ui.mouse.wy=w.y;
}
