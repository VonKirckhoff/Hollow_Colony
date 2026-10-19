'use strict';
/* ---------- 2r. hive life: the creep around a hive, and the Husk that roots into a new hive ----------
   CREEP: a living carpet grows out from every hive, from `start` tiles to `max` tiles over `grow` seconds
          (per hive or per mission: creep:<tiles>, creep:0 for none). Swarm units standing on it heal `heal` HP/s.
          When the hive dies, the creep withers away.
   HUSK:  hatches from a body a Crawler infected. It hunts for `hunt` seconds, then walks to a quiet spot
          (at least `clear` tiles from your troops and buildings, `spacing` tiles from other hives, at most `reach` tiles away)
          and takes root for `root` seconds. Then it becomes a young hive with `hiveHp` of a normal hive's health.
          A mission can cap the new hives with swarm.husks (default `max`; 0 = Husks never root). */
const CREEP = { start:2, max:5.5, grow:90, rise:0.5, fade:0.07, heal:4, at:0.3, every:0.5 };
const HUSK  = { hunt:8, root:18, clear:13, spacing:11, reach:34, max:2, hiveHp:0.55, guardMax:2 };

/* ---- creep ---- */
function creepNoise(x,y){ const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
function updateCreep(dt){
  const m=G.map, W=m.w, H=m.h;
  if(!G.creep){ G.creep=new Float32Array(W*H); G.creepTgt=new Float32Array(W*H); G.creepT=0; G.creepCv=document.createElement('canvas'); G.creepCv.width=W; G.creepCv.height=H; }
  const hs=hives();
  for(const h of hs){ const max=hiveOpt(h,'creep',CREEP.max); if(h.creepR==null) h.creepR=Math.min(max,CREEP.start); if(h.creepR<max) h.creepR=Math.min(max,h.creepR+dt*Math.max(0.5,max-CREEP.start)/CREEP.grow); }
  G.creepT-=dt;
  if(G.creepT<=0){ const step=CREEP.every-G.creepT; G.creepT=CREEP.every;
    const C=G.creep, T=G.creepTgt; T.fill(0);
    for(const h of hs){ const R=h.creepR; if(!(R>0)) continue; const cx=h.x/TILE, cy=h.y/TILE;
      for(let y=Math.max(0,Math.floor(cy-R-2));y<=Math.min(H-1,Math.ceil(cy+R+2));y++) for(let x=Math.max(0,Math.floor(cx-R-2));x<=Math.min(W-1,Math.ceil(cx+R+2));x++){
        const k=y*W+x; if(!m.walk[k]) continue;
        const r=R*(0.78+0.4*creepNoise(x,y)), d=Math.hypot(x+.5-cx,y+.5-cy), v=d<r-1?1:d<r?r-d:0; if(v>T[k]) T[k]=v; } }
    let any=false; const cv=G.creepCv, c2=cv.getContext('2d'), img=c2.createImageData(W,H), px=img.data;
    for(let k=0;k<W*H;k++){ const t=T[k]; let c=C[k];
      if(c<t) c=Math.min(t,c+CREEP.rise*step); else if(c>t) c=Math.max(t,c-CREEP.fade*step);
      C[k]=c; if(c<=0.01||!G.seen[k]) continue; any=true; const o=k*4;
      px[o]=96; px[o+1]=40+Math.round(26*c); px[o+2]=112; px[o+3]=Math.round(150*Math.min(1,c*1.4)); }
    c2.putImageData(img,0,0); G.creepAny=any; }
  /* the Swarm heals on it */
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='swarm'||u.def.boss||u.hp>=u.maxHp) continue;
    const c=G.creep[Math.floor(u.y/TILE)*W+Math.floor(u.x/TILE)]; if(!(c>CREEP.at)) continue;
    u.hp=Math.min(u.maxHp,u.hp+CREEP.heal*c*dt);
    if(Math.random()<dt*1.5&&isVisible(u)) G.fx.push({k:'text',x:u.x+rand(-6,6),y:u.y-24,t:0.7,max:0.7,txt:'+',col:'#c38bff'}); }
}
function creepAt(x,y){ return G.creep?G.creep[Math.floor(y/TILE)*G.map.w+Math.floor(x/TILE)]||0:0; }
function drawCreep(now,vx0,vy0,vx1,vy1){
  if(!G.creep||!G.creepAny) return; const m=G.map, W=m.w;
  ctx.imageSmoothingEnabled=true; ctx.drawImage(G.creepCv,0,0,W*TILE,m.h*TILE); ctx.imageSmoothingEnabled=false;
  /* veins and pustules on the thicker parts */
  const x0=Math.max(0,Math.floor(vx0/TILE)), y0=Math.max(0,Math.floor(vy0/TILE)), x1=Math.min(W-1,Math.ceil(vx1/TILE)), y1=Math.min(m.h-1,Math.ceil(vy1/TILE));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const k=y*W+x, c=G.creep[k]; if(c<0.35||!G.seen[k]) continue;
    const n=creepNoise(x,y), n2=creepNoise(y+7,x+3), bx=x*TILE, by=y*TILE;
    ctx.fillStyle=`rgba(40,14,52,${0.6*c})`; ctx.fillRect(bx+Math.floor(n*TILE*0.7),by+Math.floor(n2*TILE*0.8),Math.round(6+n2*8),2); ctx.fillRect(bx+Math.floor(n2*TILE*0.6),by+Math.floor(n*TILE*0.5),2,Math.round(4+n*6));
    ctx.fillStyle=`rgba(150,90,170,${0.35*c})`; ctx.fillRect(bx+Math.floor(n2*TILE*0.9),by+Math.floor(n*TILE*0.9),3,2);
    if(n>0.55){ const p=0.5+0.5*Math.sin(now/500+n*20); ctx.fillStyle=`rgba(166,255,74,${(0.25+0.45*p)*c})`; ctx.fillRect(bx+Math.floor(n2*TILE*0.8),by+Math.floor(n*TILE*0.7),3,3);
      ctx.fillStyle=`rgba(120,60,150,${0.7*c})`; ctx.fillRect(bx+Math.floor(n2*TILE*0.8)-1,by+Math.floor(n*TILE*0.7)+3,5,2); } }
}

/* ---- the Husk ---- */
function huskHatched(u){ u.role='hunt'; u.foundT=HUSK.hunt;
  if(isVisible(u)&&!G.saidHusk){ G.saidHusk=true; say('Dr. Maas','That thing was one of ours. A Husk. If it gets away from you it will take root and grow a new hive. Kill it!','alert'); } }
function huskCap(){ const c=G.swarm.cfg.husks; return c!=null?c:HUSK.max; }
/* a quiet 3×3 spot, far from the Lunar Corps and other hives, as close to the Husk as possible */
function huskSite(u){
  const m=G.map, W=m.w, hs=hives(), corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!(e.def&&e.def.scenery));
  const marks=G.ents.filter(e=>!e.dead&&e.kind==='building'&&e.def.noBlock);   /* landing zones, beacons, charge sites: not on top of those */
  let best=null, bd=Infinity;
  for(let i=0;i<600;i++){ const x=2+Math.floor(Math.random()*(W-4)), y=2+Math.floor(Math.random()*(m.h-4)); let ok=true;
    for(let dy=-1;dy<=1&&ok;dy++) for(let dx=-1;dx<=1;dx++) if(!walkableT(x+dx,y+dy)){ ok=false; break; } if(!ok) continue;
    const px=(x+.5)*TILE, py=(y+.5)*TILE, d=Math.hypot(px-u.x,py-u.y); if(d>HUSK.reach*TILE||d>=bd) continue;
    if(corps.some(e=>Math.hypot(e.x-px,e.y-py)<HUSK.clear*TILE)) continue;
    if(hs.some(h=>Math.hypot(h.x-px,h.y-py)<HUSK.spacing*TILE)) continue;
    if(marks.some(e=>Math.hypot(e.x-px,e.y-py)<3*TILE)) continue;
    if(G.ents.some(e=>!e.dead&&e.rootT!=null&&e!==u&&Math.hypot(e.x-px,e.y-py)<HUSK.spacing*TILE)) continue;
    best={x,y}; bd=d; }
  return best; }
function rooting(){ return G.ents.filter(e=>!e.dead&&e.rootT!=null).length; }
/* returns true while the Husk is busy founding (swarmThink then leaves it alone) */
function founderThink(u,dt){
  if(u.rootT!=null){ u.rootT-=dt; u.order={type:'hold'}; u.path=null; if(u.rootT<=0) rootHive(u); return true; }
  if(u.noFound) return false;
  u.foundT=(u.foundT??HUSK.hunt)-dt; if(u.foundT>0) return false;
  if((G.swarm.founded||0)+rooting()>=huskCap()){ u.noFound=true; return false; }   /* enough new hives: it just hunts */
  if(!u.site){ u.siteT=(u.siteT||0)-dt; if(u.siteT>0) return false; u.siteT=4;
    const s=huskSite(u); if(!s) return false; const sx=(s.x+.5)*TILE, sy=(s.y+.5)*TILE;
    u.target=null; u.order={type:'move',x:sx,y:sy}; setPath(u,sx,sy); if(!u.path){ u.order=null; return false; } u.site=s; }
  const sx=(u.site.x+.5)*TILE, sy=(u.site.y+.5)*TILE;
  if(Math.hypot(u.x-sx,u.y-sy)<TILE*0.7){
    let ok=true; for(let dy=-1;dy<=1&&ok;dy++) for(let dx=-1;dx<=1;dx++) if(!walkableT(u.site.x+dx,u.site.y+dy)){ ok=false; break; }
    if(ok&&G.ents.some(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'&&Math.hypot(e.x-sx,e.y-sy)<5*TILE)) ok=false;
    if(!ok){ u.site=null; u.siteT=1; return false; }
    u.x=sx; u.y=sy; u.rootT=u.rootMax=HUSK.root; u.order={type:'hold'}; u.target=null; u.path=null;
    G.pings.push({x:sx,y:sy,t:0,col:'#c38bff'}); if(isVisible(u)) SFX.play('squelch',u.x,u.y);
    say('Dr. Maas',isVisible(u)?'The Husk is taking root. Stop it before a new hive grows out of it!':'Something out there is taking root. Our sensors picked up a new nest forming.','alert');
    return true; }
  if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:sx,y:sy}; setPath(u,sx,sy); if(!u.path){ u.site=null; return false; } }
  return true; }
function rootHive(u){
  const s=u.site; u.dead=true; if(G.sel.includes(u)){ G.sel=G.sel.filter(x=>x!==u); G.selDirty=true; }
  const h=makeBuilding('hive','swarm',s.x-1,s.y-1,true);
  h.maxHp=BUILDINGS.hive.hp*HUSK.hiveHp*(G.diff.hiveHp||1); h.hp=h.maxHp*0.6; h.spawnT=5; h.cfg={ guardMax:HUSK.guardMax, offshoot:true }; h.offshoot=true; h.creepR=1;
  G.swarm.founded=(G.swarm.founded||0)+1;
  /* nobody may stand inside the new hive */
  for(const e of G.ents){ if(e.dead||e.kind!=='unit') continue; const tx=Math.floor(e.x/TILE), ty=Math.floor(e.y/TILE);
    if(tx>=h.tx&&tx<h.tx+3&&ty>=h.ty&&ty<h.ty+3){ const f=nearestWalkable(tx,ty); if(f){ e.x=(f.x+.5)*TILE; e.y=(f.y+.5)*TILE; e.path=null; } } }
  G.fx.push({k:'boom',x:h.x,y:h.y,t:0.6,max:0.6,r:40,col:'#c38bff'}); addDecal(h.x,h.y,30,'rgba(70,30,90,.5)');
  G.pings.push({x:h.x,y:h.y,t:0,col:'#a6ff4a'}); SFX.play('horn');
  say('Alert','A new hive has grown where the Husk took root.','alert'); G.objDirty=true;
  return h; }
function drawRooting(u,now){
  const p=1-u.rootT/u.rootMax, R=10+p*22;
  ctx.strokeStyle=`rgba(195,139,255,${0.35+0.25*Math.sin(now/180)})`; ctx.lineWidth=2;
  for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+u.id, r=R*(0.7+0.3*creepNoise(i,u.id)); ctx.beginPath(); ctx.moveTo(u.x,u.y+2); ctx.quadraticCurveTo(u.x+Math.cos(a+0.6)*r*0.6,u.y+2+Math.sin(a+0.6)*r*0.35,u.x+Math.cos(a)*r,u.y+2+Math.sin(a)*r*0.55); ctx.stroke(); }
  const y=Math.round(u.y-40), x=Math.round(u.x);
  ctx.fillStyle='#000'; ctx.fillRect(x-15,y-1,30,5); ctx.fillStyle='#c38bff'; ctx.fillRect(x-14,y,Math.round(28*p),3);
  ctx.font='9px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText('ROOTING',x+1,y-3); ctx.fillStyle='#c38bff'; ctx.fillText('ROOTING',x,y-4); }
