'use strict';
/* ---------- 2p. rendering ---------- */
const cv=$('#game'), ctx=cv.getContext('2d');
const mm=$('#minimap'), mctx=mm.getContext('2d');
function resize(){
  ui.dpr=Math.min(2,window.devicePixelRatio||1); ui.vw=innerWidth; ui.vh=innerHeight;
  cv.width=Math.round(ui.vw*ui.dpr); cv.height=Math.round(ui.vh*ui.dpr);
  ui.hudH = $('#hud').hidden ? 0 : $('#bottom').getBoundingClientRect().height;
  if(G) sizeMinimap();
}
function sizeMinimap(){ const wrap=$('#minimap-wrap').getBoundingClientRect(); const box=Math.max(60,Math.min(wrap.width,wrap.height)-6);
  const s=Math.min(box/G.map.w,box/G.map.h); mm.width=Math.floor(G.map.w*s); mm.height=Math.floor(G.map.h*s); mm.style.width=mm.width+'px'; mm.style.height=mm.height+'px'; G.mmScale=s; }
function centerOn(x,y){ G.cam.x=x-ui.vw/2; G.cam.y=y-(ui.vh-ui.hudH)/2; clampCam(); }
function clampCam(){ const W=G.map.w*TILE, H=G.map.h*TILE; G.cam.x=clamp(G.cam.x,-40,Math.max(-40,W-ui.vw+40)); G.cam.y=clamp(G.cam.y,-60,Math.max(-60,H-(ui.vh-ui.hudH)+20)); }
function drawShadow(x,y,rx,ry){ ctx.fillStyle='rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); }

function render(now){
  ctx.setTransform(ui.dpr,0,0,ui.dpr,0,0); ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#07080c'; ctx.fillRect(0,0,ui.vw,ui.vh);
  if(ui.mode==='menu'||!G){ renderMenuBg(now); return; }
  const sh=(G.shake||0)*10, cam={x:Math.round(G.cam.x+(sh?rand(-sh,sh):0)),y:Math.round(G.cam.y+(sh?rand(-sh,sh):0))}, m=G.map;
  drawStars(cam);
  ctx.drawImage(m.ground,0,0,m.ground.width,m.ground.height,-cam.x,-cam.y,m.w*TILE,m.h*TILE);
  ctx.save(); ctx.translate(-cam.x,-cam.y);
  const vx0=cam.x-64, vy0=cam.y-64, vx1=cam.x+ui.vw+64, vy1=cam.y+ui.vh+64;
  const inView=e=>e.x>vx0&&e.x<vx1&&e.y>vy0&&e.y<vy1;
  // decals
  for(const d of G.decals){ if(!inView(d)) continue; ctx.fillStyle=d.col; for(let i=0;i<5;i++){ const a=d.seed+i*1.7, rr=d.r*(0.35+0.25*((i*37+d.seed)%1)); ctx.fillRect(Math.round(d.x+Math.cos(a)*d.r*0.5-rr/2),Math.round(d.y+Math.sin(a)*d.r*0.35-rr/3),Math.round(rr),Math.round(rr*0.66)); } }
  drawPools(now);
  for(const e of G.ents){ if(e.dead||!e.def||!e.def.ground||!inView(e)) continue; const a=ARTC[e.def.art]; ctx.globalAlpha=0.9; ctx.drawImage(a,e.tx*TILE,e.ty*TILE,e.size*TILE,e.size*TILE); ctx.globalAlpha=1;
    if(e.def.capture){ const r=e.size*TILE*0.62, col=e.state==='contested'?'#ff9a3c':e.owned?'#5fe3b0':e.state==='theirs'?'#ff5a4f':'#ffb347';
      ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(e.x,e.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(e.cap||0)); ctx.stroke();
      if(e.label){ ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(e.label.toUpperCase(),e.x+1,e.y+r+15); ctx.fillStyle=col; ctx.fillText(e.label.toUpperCase(),e.x,e.y+r+14); } }
    if(e.flight){ ctx.strokeStyle=`rgba(255,179,71,${0.4+0.4*Math.sin(now/150)})`; ctx.lineWidth=2; ctx.strokeRect(e.tx*TILE+2,e.ty*TILE+2,e.size*TILE-4,e.size*TILE-4); } }
  // relay site hints during placement
  if(ui.placing && BUILDINGS[ui.placing.type].needsSite){ for(const s of m.sites){ ctx.strokeStyle='rgba(255,179,71,.65)'; ctx.setLineDash([4,4]); ctx.strokeRect(s.x*TILE+2,s.y*TILE+2,TILE*2-4,TILE*2-4); ctx.setLineDash([]); } }
  // rally
  for(const e of G.sel){ if(e.kind==='building'&&e.rally){ ctx.strokeStyle='rgba(95,227,176,.5)'; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.rally.x,e.rally.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#5fe3b0'; ctx.fillRect(e.rally.x-1,e.rally.y-14,2,14); ctx.fillRect(e.rally.x+1,e.rally.y-14,7,5); } }
  // visible entities
  const list=[], shimmer=[]; for(const e of G.ents){ if(e.dead||!inView(e)) continue;
    if(e.kind==='crate'){ if(G.seen[Math.floor(e.y/TILE)*m.w+Math.floor(e.x/TILE)]) list.push(e); continue; }
    if(e.faction==='corps'){ list.push(e); continue; }
    if(e.kind==='building' && e.type!=='cocoon'){ if(G.seen[Math.floor(e.y/TILE)*m.w+Math.floor(e.x/TILE)]) list.push(e); continue; }
    if(isVisible(e)) list.push(e); else if(e.def&&e.def.cloak&&!e.retreating&&G.vis[Math.floor(e.y/TILE)*m.w+Math.floor(e.x/TILE)]) shimmer.push(e); }
  for(let i=list.length-1;i>=0;i--) if(list[i].def&&list[i].def.ground) list.splice(i,1);
  list.sort((a,b)=>(a.kind==='building'?a.y+a.r*0.6:a.y)-(b.kind==='building'?b.y+b.r*0.6:b.y));
  // selection rings
  for(const e of G.sel){ if(!e.dead&&e.def&&e.def.ground){ ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=2; ctx.strokeRect(e.tx*TILE,e.ty*TILE,e.size*TILE,e.size*TILE); continue; }
    if(e.dead||!list.includes(e)) continue; ctx.strokeStyle=e.faction==='corps'?'#5fe3b0':'#ff5a4f'; ctx.lineWidth=2;
    ctx.beginPath(); if(e.kind==='building') ctx.ellipse(e.x,e.y+e.r*0.35,e.r*1.1,e.r*0.75,0,0,Math.PI*2); else ctx.ellipse(e.x,e.y+4,e.r+4,(e.r+4)*0.55,0,0,Math.PI*2); ctx.stroke(); }
  for(const e of list){ if(e.kind==='unit') drawUnit(e); else if(e.kind==='building') drawBuilding(e,now); else ctx.drawImage(ARTC.crate,Math.round(e.x-12),Math.round(e.y-10+Math.sin(now/300+e.id)*1.5),24,20); }
  for(const e of shimmer){ const sp=SPR[e.def.sprite], s=2; ctx.globalAlpha=0.1+0.08*Math.sin(now/90+e.id); ctx.drawImage(e.face>0?sp.flash:sp.flashFlip,Math.round(e.x-sp.w+Math.sin(now/60)*2),Math.round(e.y-sp.h*s+4),sp.w*s,sp.h*s); ctx.globalAlpha=1; }
  // heal beams
  for(const e of list){ if(e.beam&&!e.beam.dead){ ctx.strokeStyle='rgba(120,255,190,.75)'; ctx.lineWidth=2; ctx.setLineDash([2,3]); ctx.lineDashOffset=-now/40; ctx.beginPath(); ctx.moveTo(e.x+e.face*4,e.y-12); ctx.lineTo(e.beam.x,e.beam.y-10); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#9fffd0'; ctx.fillRect(e.beam.x-1,e.beam.y-22-((now/120)%8),2,2); } }
  // shots & fx
  for(const s of G.shots){ if(s.t<0) continue; const t=s.t/s.dur; if(s.k==='plasma'){ const x=s.sx+(s.tx-s.sx)*t, y=s.sy+(s.ty-s.sy)*t; ctx.fillStyle='#1a8fa0'; ctx.fillRect(Math.round(x)-4,Math.round(y)-4,8,8); ctx.fillStyle='#d8feff'; ctx.fillRect(Math.round(x)-2,Math.round(y)-2,4,4); continue; }
    const x=s.sx+(s.tx-s.sx)*t, y=s.sy+(s.ty-s.sy)*t-Math.sin(t*Math.PI)*40; ctx.fillStyle='#4fae22'; ctx.fillRect(Math.round(x)-3,Math.round(y)-3,6,6); ctx.fillStyle='#a6ff4a'; ctx.fillRect(Math.round(x)-2,Math.round(y)-2,3,3); }
  drawFx(); drawFlares(now);
  // light from running generators
  ctx.globalCompositeOperation='lighter';
  for(const e of G.ents){ if(e.dead||!e.def||!e.def.generator||!e.powered) continue; const R=e.def.light*TILE*0.9, fl=0.9+0.1*Math.sin(now/90+e.id);
    const g=ctx.createRadialGradient(e.x,e.y,8,e.x,e.y,R); g.addColorStop(0,`rgba(255,214,120,${0.22*fl})`); g.addColorStop(0.5,`rgba(255,190,90,${0.08*fl})`); g.addColorStop(1,'rgba(255,180,80,0)');
    ctx.fillStyle=g; ctx.fillRect(e.x-R,e.y-R,R*2,R*2); }
  ctx.globalCompositeOperation='source-over';
  // fog
  paintFog(); ctx.imageSmoothingEnabled=true; ctx.drawImage(fogCanvas,0,0,m.w,m.h,0,0,m.w*TILE,m.h*TILE); ctx.imageSmoothingEnabled=false;
  // bars
  for(const e of list){ if(e.kind==='crate') continue; const show=G.sel.includes(e)||e.hp<e.maxHp||(e.kind==='building'&&!e.built); if(!show) continue;
    const w=e.kind==='building'?e.size*TILE*0.8:24, x=Math.round(e.x-w/2), y=Math.round(e.kind==='building'?e.y-e.size*TILE/2-8:e.y-(SPR[e.def.sprite].h*(e.def.scale||2))-6);
    ctx.fillStyle='#000'; ctx.fillRect(x-1,y-1,w+2,5); ctx.fillStyle='#3a1512'; ctx.fillRect(x,y,w,3);
    const f=clamp(e.hp/e.maxHp,0,1); ctx.fillStyle=e.faction!=='corps'?'#ff5a4f':hpColor(f); ctx.fillRect(x,y,Math.round(w*f),3);
    if(e.kind==='building'&&!e.built){ ctx.fillStyle='#000'; ctx.fillRect(x-1,y+4,w+2,4); ctx.fillStyle='#ffb347'; ctx.fillRect(x,y+5,Math.round(w*e.progress),2); }
    if(e.type==='cocoon'){ ctx.fillStyle='#a6ff4a'; ctx.fillRect(x,y+4,Math.round(w*(1-e.hatchT/BUILDINGS.cocoon.hatch)),2); } }
  // status labels of mission objects (generators, charges)
  ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center';
  for(const e of G.ents){ if(e.dead||!e.status||!inView(e)) continue; if(e.faction!=='corps'&&!isVisible(e)) continue;
    const y=e.kind==='building'?e.y+e.size*TILE/2+14:e.y-34; ctx.fillStyle='#000'; ctx.fillText(e.status.txt,e.x+1,y+1); ctx.fillStyle=e.status.col; ctx.fillText(e.status.txt,e.x,y); }
  drawBarks();
  for(const p of G.pings){ const r=10+p.t*28; ctx.strokeStyle=p.col; ctx.globalAlpha=Math.max(0,1-p.t/3); ctx.lineWidth=2; ctx.strokeRect(p.x-r,p.y-r,r*2,r*2); ctx.globalAlpha=1; }
  for(const b of G.ents){ if(!b.dead&&b.def&&b.def.reinforce&&b.flight&&b.flight.t<4&&inView(b)){ const k=b.flight.t/4, art=ARTC.dropship, w=art.width*3, h=art.height*3;
      drawShadow(b.x,b.y+10,50*(1-k*0.5),18*(1-k*0.5)); ctx.globalAlpha=Math.min(1,1.4-k); ctx.drawImage(art,Math.round(b.x-w/2),Math.round(b.y-h/2-20-k*260),w,h); ctx.globalAlpha=1;
      if(Math.random()<0.5) G.fx.push({k:'ember',x:b.x+rand(-50,50),y:b.y+rand(-20,30),vx:rand(-80,80),vy:rand(-30,10),t:0.5,max:0.5,col:'#8a8f9c'}); } }
  drawPlacement();
  for(const mk of G.markers){ const bob=Math.sin(now/250)*3, y=mk.y-30+bob;
    ctx.strokeStyle='#ffb347'; ctx.lineWidth=2; ctx.globalAlpha=0.6+0.4*Math.sin(now/250); ctx.strokeRect(mk.x-TILE*1.5,mk.y-TILE*1.5,TILE*3,TILE*3); ctx.globalAlpha=1;
    ctx.fillStyle='#0a0b10'; ctx.beginPath(); ctx.moveTo(mk.x,y-11); ctx.lineTo(mk.x+11,y); ctx.lineTo(mk.x,y+11); ctx.lineTo(mk.x-11,y); ctx.fill();
    ctx.fillStyle='#ffb347'; ctx.beginPath(); ctx.moveTo(mk.x,y-8); ctx.lineTo(mk.x+8,y); ctx.lineTo(mk.x,y+8); ctx.lineTo(mk.x-8,y); ctx.fill();
    ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(mk.label.toUpperCase(),mk.x+1,y-15); ctx.fillStyle='#ffe2a8'; ctx.fillText(mk.label.toUpperCase(),mk.x,y-16); }
  ctx.restore();
  // arrows at the screen edge pointing to off-screen markers
  const top=48, bottom=ui.vh-ui.hudH-12;
  for(const mk of G.markers){ const sx=mk.x-cam.x, sy=mk.y-cam.y; if(sx>0&&sx<ui.vw&&sy>top&&sy<bottom) continue;
    const cx=ui.vw/2, cy=(top+bottom)/2, a=Math.atan2(sy-cy,sx-cx);
    const k=Math.min((ui.vw/2-30)/Math.abs(Math.cos(a)||1e-6),((bottom-top)/2-30)/Math.abs(Math.sin(a)||1e-6));
    const ax=cx+Math.cos(a)*k, ay=cy+Math.sin(a)*k;
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(a); ctx.fillStyle='#0a0b10'; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(-10,-12); ctx.lineTo(-10,12); ctx.fill();
    ctx.fillStyle='#ffb347'; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-7,-9); ctx.lineTo(-7,9); ctx.fill(); ctx.restore();
    const lx=clamp(ax-Math.cos(a)*34,50,ui.vw-50), ly=clamp(ay-Math.sin(a)*24,top+14,bottom-6);
    ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(mk.label.toUpperCase(),lx+1,ly+1); ctx.fillStyle='#ffe2a8'; ctx.fillText(mk.label.toUpperCase(),lx,ly); }
  if(ui.drag && ui.drag.box){ const d=ui.drag; ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=1; ctx.fillStyle='rgba(95,227,176,.08)'; const x=Math.min(d.x0,d.x1), y=Math.min(d.y0,d.y1), w=Math.abs(d.x1-d.x0), h=Math.abs(d.y1-d.y0); ctx.fillRect(x,y,w,h); ctx.strokeRect(x+.5,y+.5,w,h); }
  // vignette
  const g=ctx.createRadialGradient(ui.vw/2,ui.vh/2,Math.min(ui.vw,ui.vh)*0.4,ui.vw/2,ui.vh/2,Math.max(ui.vw,ui.vh)*0.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.45)'); ctx.fillStyle=g; ctx.fillRect(0,0,ui.vw,ui.vh);
  drawTracker(now);
  if(G.paused&&!G.over){ ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,ui.vw,ui.vh); }
}
function drawStars(cam){ ctx.fillStyle='#2a2d3a'; for(let i=0;i<70;i++){ const x=((hash2(i,1,9)*ui.vw*2-cam.x*0.05)%ui.vw+ui.vw)%ui.vw, y=((hash2(i,2,9)*ui.vh*2-cam.y*0.05)%ui.vh+ui.vh)%ui.vh; ctx.fillRect(x|0,y|0,1+(i%3===0),1); } }
function drawUnit(u){
  const sp=SPR[u.def.sprite], s=u.def.scale||2, w=sp.w*s, h=sp.h*s;
  const bob = u.moving ? (Math.floor(u.anim*8)%2) : 0;
  const lunge = u.lunge>0 ? u.face*4 : 0;
  drawShadow(u.x,u.y+3,u.r*0.95,u.r*0.42);
  const x=Math.round(u.x-w/2+lunge), y=Math.round(u.y-h+4-bob*s/2);
  if(u.carry){ const a=ARTC[BUILDINGS[u.carry.type].art]; ctx.drawImage(a,Math.round(u.x-u.face*9-9),y+2,18,18); }
  ctx.drawImage(u.face>0?sp.img:sp.flip,x,y,w,h);
  if(u.flash>0){ ctx.globalAlpha=(u.def.scale||2)>=3?0.25:0.8; ctx.drawImage(u.face>0?sp.flash:sp.flashFlip,x,y,w,h); ctx.globalAlpha=1; }
  if(u.vet && u.vet.rank>0){ ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; const mk=RANKS[u.vet.rank].mark; ctx.fillStyle='#000'; ctx.fillText(mk,u.x+1,y-7); ctx.fillStyle=u.vet.rank>=3?'#ffe2a8':'#ffb347'; ctx.fillText(mk,u.x,y-8); }
  if(u.order&&u.order.type==='hold'&&G.sel.includes(u)){ ctx.fillStyle='#ffb347'; ctx.fillRect(Math.round(u.x)-3,y-6,6,2); }
  if(u.suppressT>0 && isVisible(u)){ ctx.fillStyle='rgba(159,211,255,.85)'; for(let k=0;k<2;k++){ const yy=Math.round(u.y-30+k*4); ctx.fillRect(Math.round(u.x)-3,yy,2,2); ctx.fillRect(Math.round(u.x)+1,yy,2,2); ctx.fillRect(Math.round(u.x)-1,yy+2,2,2); } }
}
function drawBuilding(b,now){
  const art=ARTC[b.def.art], s=2, w=art.width*s, h=art.height*s;
  let x=b.kind==='building'&&b.def.noBlock ? Math.round(b.x-w/2) : b.tx*TILE + Math.round((b.size*TILE-w)/2);
  let y=b.def.noBlock ? Math.round(b.y-h/2-4) : b.ty*TILE + Math.round((b.size*TILE-h)/2);
  if(!b.def.noBlock) drawShadow(b.x+4,b.y+b.size*TILE*0.32,b.size*TILE*0.5,b.size*TILE*0.22);
  if(b.type==='hive'){ const p=1+Math.sin(now/420+b.id)*0.025; const ww=Math.round(w*p), hh=Math.round(h*p); ctx.drawImage(art,Math.round(b.x-ww/2),Math.round(b.y-hh/2-4),ww,hh); }
  else if(b.type==='cocoon'){ const p=1+Math.sin(now/120)*0.06*(1-b.hatchT/BUILDINGS.cocoon.hatch+0.3); ctx.drawImage(art,Math.round(b.x-w*p/2),Math.round(b.y-h*p+6),Math.round(w*p),Math.round(h*p)); }
  else { if(!b.built) ctx.globalAlpha=0.45+0.4*b.progress; ctx.drawImage(art,x,y,w,h); ctx.globalAlpha=1; }
  if(b.flash>0){ ctx.globalAlpha=0.35; ctx.fillStyle='#fff'; ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2); ctx.globalAlpha=1; }
  if(!b.built){ ctx.strokeStyle='rgba(255,179,71,.8)'; ctx.setLineDash([6,4]); ctx.strokeRect(b.tx*TILE+1,b.ty*TILE+1,b.size*TILE-2,b.size*TILE-2); ctx.setLineDash([]); return; }
  if(b.type==='sentry' && b.packing && b.packing<1 && !b.dead){ ctx.fillStyle='#000'; ctx.fillRect(b.x-12,b.y+14,24,4); ctx.fillStyle='#ffb347'; ctx.fillRect(b.x-11,b.y+15,Math.round(22*b.packing),2); }
  if(b.type==='sentry'){ const a=b.angle||0; ctx.strokeStyle='#0a0b10'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(b.x,b.y-4); ctx.lineTo(b.x+Math.cos(a)*15,b.y-4+Math.sin(a)*15); ctx.stroke(); ctx.strokeStyle='#4f5766'; ctx.lineWidth=3; ctx.stroke(); }
  if(b.type==='hq'){ if(Math.floor(now/600)%2){ ctx.fillStyle='#ff5a4f'; ctx.fillRect(x+38*s,y+2*s,4,4); } if(b.queue.length){ ctx.fillStyle='#ffb347'; ctx.fillRect(x+15*s,y+26*s,Math.round(18*s*(b.prodT/UNITS[b.queue[0]].buildTime)),4); } }
  if(b.type==='relay'){ if(Math.floor(now/800+b.id)%2){ ctx.fillStyle='#ffb347'; ctx.fillRect(b.x-2,y+4*s-2,4,4); } }
}
function drawFx(){
  for(const f of G.fx){ const a=Math.max(0,f.t/f.max);
    switch(f.k){
      case 'tracer': ctx.strokeStyle=`rgba(255,226,168,${a})`; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(f.x1,f.y1); ctx.lineTo(f.x2,f.y2); ctx.stroke(); break;
      case 'flash': ctx.fillStyle='#fff3c4'; ctx.fillRect(Math.round(f.x)-3,Math.round(f.y)-3,6,6); break;
      case 'spark': case 'ember': ctx.fillStyle=f.col; ctx.globalAlpha=a; ctx.fillRect(Math.round(f.x),Math.round(f.y),2,2); ctx.globalAlpha=1; break;
      case 'flame': { const sz=Math.round(4+(1-a)*8); ctx.fillStyle=a>0.6?'#ffe08a':a>0.3?'#ff8a2a':'rgba(120,50,20,.6)'; ctx.fillRect(Math.round(f.x-sz/2),Math.round(f.y-sz/2),sz,sz); break; }
      case 'slash': ctx.strokeStyle=`rgba(255,255,255,${a})`; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(f.x-8*f.face,f.y-6); ctx.lineTo(f.x+8*f.face,f.y+6); ctx.stroke(); break;
      case 'boom': { const r=f.r*(1-a*0.6); ctx.globalAlpha=a*0.55; ctx.fillStyle=f.col||'#ffa03c'; ctx.beginPath(); ctx.arc(f.x,f.y,r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; break; }
      case 'text': ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(f.txt,f.x+1,f.y-(1-a)*18+1); ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y-(1-a)*18); break;
    } }
}
function placementSpot(){
  const p=ui.placing, d=BUILDINGS[p.type];
  let tx=Math.floor(ui.mouse.wx/TILE - d.size/2 + 0.5), ty=Math.floor(ui.mouse.wy/TILE - d.size/2 + 0.5);
  if(d.needsSite){ let best=null, bd=Infinity; for(const s of G.map.sites){ const dd=Math.hypot(s.x+1-ui.mouse.wx/TILE,s.y+1-ui.mouse.wy/TILE); if(dd<bd){ bd=dd; best=s; } } if(best&&bd<3.5){ tx=best.x; ty=best.y; } }
  return {tx,ty,ok:canPlace(p.type,tx,ty)&&(p.deploy||G.salvage>=d.cost)};
}
function drawPlacement(){
  if(!ui.placing) return; const d=BUILDINGS[ui.placing.type], s=placementSpot(), art=ARTC[d.art];
  ctx.globalAlpha=0.6; ctx.drawImage(art,s.tx*TILE+Math.round((d.size*TILE-art.width*2)/2),s.ty*TILE+Math.round((d.size*TILE-art.height*2)/2),art.width*2,art.height*2); ctx.globalAlpha=1;
  ctx.fillStyle=s.ok?'rgba(95,227,176,.22)':'rgba(255,90,79,.3)'; ctx.fillRect(s.tx*TILE,s.ty*TILE,d.size*TILE,d.size*TILE);
  ctx.strokeStyle=s.ok?'#5fe3b0':'#ff5a4f'; ctx.lineWidth=2; ctx.strokeRect(s.tx*TILE+1,s.ty*TILE+1,d.size*TILE-2,d.size*TILE-2);
  if(d.range){ ctx.strokeStyle='rgba(255,179,71,.35)'; ctx.setLineDash([4,6]); ctx.beginPath(); ctx.arc((s.tx+d.size/2)*TILE,(s.ty+d.size/2)*TILE,d.range*TILE,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
}
function renderMenuBg(now){
  const m=loadMap('maw'); const t=now/1000;
  const cx=(Math.sin(t*0.03)*0.5+0.5)*(m.w*TILE-ui.vw), cy=(Math.cos(t*0.021)*0.5+0.5)*(m.h*TILE-ui.vh);
  ctx.drawImage(m.ground,0,0,m.ground.width,m.ground.height,-Math.round(cx),-Math.round(cy),m.w*TILE,m.h*TILE);
  const sp=SPR.trooper; for(let i=0;i<5;i++){ const x=m.w*TILE*0.5-cx+i*26-60, y=m.h*TILE*0.82-cy+(i%2)*18; drawShadow(x+16,y+30,9,4); ctx.drawImage(sp.img,Math.round(x),Math.round(y),32,28); }
}
function renderMinimap(){
  if(!G||!G.mmScale) return; const m=G.map, s=G.mmScale;
  mctx.imageSmoothingEnabled=false; mctx.drawImage(m.mini,0,0,mm.width,mm.height);
  for(const e of G.ents){ if(e.dead||e.kind==='crate') continue;
    if(e.faction!=='corps'){ if(e.kind==='unit'&&!isVisible(e)) continue; if(e.kind==='building'&&!G.seen[Math.floor(e.y/TILE)*m.w+Math.floor(e.x/TILE)]) continue; }
    mctx.fillStyle=e.def.capture?(e.owned?'#5fe3b0':e.state==='theirs'?'#ff5a4f':'#ffffff'):e.faction==='corps'?(e.def.escort?'#ffffff':'#ffb347'):e.faction==='swarm'?'#a6ff4a':e.faction==='grey'?'#7ff6ff':'#d3c3a6';
    const sz=e.kind==='building'?Math.max(3,e.size*s):Math.max(2,s*0.9);
    mctx.fillRect(Math.round(e.x/TILE*s-sz/2),Math.round(e.y/TILE*s-sz/2),Math.ceil(sz),Math.ceil(sz)); }
  mctx.imageSmoothingEnabled=true; mctx.drawImage(fogCanvas||m.mini,0,0,mm.width,mm.height); mctx.imageSmoothingEnabled=false;
  for(const p of G.pings){ const r=3+p.t*6; mctx.strokeStyle=p.col; mctx.globalAlpha=Math.max(0,1-p.t/3); mctx.strokeRect(p.x/TILE*s-r,p.y/TILE*s-r,r*2,r*2); mctx.globalAlpha=1; }
  for(const mk of G.markers){ const on=Math.floor(performance.now()/400)%2; mctx.fillStyle=on?'#ffb347':'#fff'; mctx.fillRect(Math.round(mk.x/TILE*s)-3,Math.round(mk.y/TILE*s)-3,6,6); }
  mctx.strokeStyle='#fff'; mctx.lineWidth=1; mctx.strokeRect(Math.round(G.cam.x/TILE*s)+.5,Math.round(G.cam.y/TILE*s)+.5,Math.round(ui.vw/TILE*s),Math.round((ui.vh-ui.hudH)/TILE*s));
}
