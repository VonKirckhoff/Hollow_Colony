'use strict';
/* ---------- 2r. hive life: the creep around a hive, and the Husk that roots into a new hive ----------
   CREEP: a living carpet grows out from every hive, from `start` tiles to `max` tiles over `grow` seconds
          (per hive or per mission: creep:<tiles>, creep:0 for none). Swarm units standing on it heal `heal` HP/s.
          When the hive dies, the creep withers away.
   HUSK:  hatches from a body a Crawler infected (see the stages below). The Twitcher fights, the Shambler withdraws from the battle
          (keeps `hide` tiles from your troops), and the finished Husk goes straight to a quiet spot
          (at least `clear` tiles from your troops and buildings, `spacing` tiles from other hives, at most `reach` tiles away)
          and takes root for `root` seconds. Then it becomes a young hive with `hiveHp` of a normal hive's health.
          A mission can cap the new hives with swarm.husks (default `max`; 0 = Husks never root). */
const CREEP = { start:3, max:11, grow:150, rise:0.5, fade:0.07, heal:4, at:0.3, every:0.5 };
const HUSK  = { root:18, clear:13, spacing:16, reach:34, max:2, hiveHp:0.55, guardMax:2, hide:11 };   /* hide: tiles a withdrawing Shambler keeps from your troops */

/* ---- creep ---- */
function creepNoise(x,y){ const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
function updateCreep(dt){
  const m=G.map, W=m.w, H=m.h;
  if(!G.creep){ G.creep=new Float32Array(W*H); G.creepTgt=new Float32Array(W*H); G.creepT=0; }
  if(!G.creepCv){ G.creepCv=document.createElement('canvas'); G.creepCv.width=W; G.creepCv.height=H; }   /* (also after loading a saved game: canvases are not saved) */
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

/* ---- the Husk: the turning of a fallen soldier ----
   A Crawler burrows into the body (it twitches and turns green), the body becomes a cocoon that beats like a heart,
   faster and faster until the shell cracks. What crawls out is not a Husk yet: it grows through three stages,
   and between them it stops to molt (its skin splits; it takes 50% more damage while it does).
     Twitcher: crawls on all fours, weak and slow · Shambler: upright, half armour, half flesh · Husk: the final form.
   Only the final form goes off to take root. hp/speed/dmg are shares of the Husk's own numbers. */
const HUSK_STAGES = [
  { name:'Twitcher', sprite:'husk1', hp:0.4,  speed:0.7, dmg:0.6,  time:7 },
  { name:'Shambler', sprite:'husk2', hp:0.7,  speed:0.9, dmg:0.75, time:8 },
  { name:'Husk',     sprite:'husk',  hp:1,    speed:1,   dmg:1 }
];
const MOLT = { time:1.6, vuln:1.5 };
function huskStage(u,i){ const st=HUSK_STAGES[i], f=u.maxHp?u.hp/u.maxHp:1, base=u.def.hp*G.diff.hp;
  u.stage=i; u.sprite=st.sprite; u.stageName=i<HUSK_STAGES.length-1?st.name:null; u.speedMul=st.speed; u.dmgMul=(G.diff.dmg||1)*st.dmg;
  u.maxHp=base*st.hp; u.hp=Math.min(u.maxHp,Math.max(u.maxHp*f,u.maxHp*0.5)); u.stageT=st.time||0; }
function huskHatched(u){ u.role='hunt'; huskStage(u,0); u.foundT=0;
  const vis=isVisible(u); G.fx.push({k:'boom',x:u.x,y:u.y,t:0.6,max:0.6,r:34,col:'#c38bff'}); addDecal(u.x,u.y,18,'rgba(70,30,90,.6)');
  for(let i=0;i<26;i++) G.fx.push({k:'ember',x:u.x+rand(-6,6),y:u.y-6+rand(-6,6),vx:rand(-120,120),vy:rand(-170,-20),t:rand(.5,1.1),max:1.1,col:pick(['#a6ff4a','#c38bff','#7a5a8e','#d23a3a','#eef2f5'])});
  if(vis){ SFX.play('huskborn',u.x,u.y); G.shake=Math.max(G.shake||0,0.3); G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'IT LIVES',col:'#c38bff'}); }
  if(vis&&!G.saidHusk){ G.saidHusk=true; say('Dr. Maas','That thing was one of ours. It is still changing, safe on the creep: once it is a full Husk it comes for us. Kill it while it is weak!','alert'); } }
/* growing up: returns true while it is molting (it stands still and cannot attack) */
function huskGrow(u,dt){
  if(u.molt>0){ u.molt-=dt; u.order={type:'hold'}; u.path=null; u.target=null; u.cd=Math.max(u.cd,0.3);
    if(Math.random()<dt*14) G.fx.push({k:'ember',x:u.x+rand(-8,8),y:u.y-rand(2,20),vx:rand(-40,40),vy:rand(-70,-20),t:0.6,max:0.6,col:pick(['#a6ff4a','#c38bff','#d23a3a'])});
    if(u.molt<=0){ huskStage(u,u.stage+1); u.order=null; const vis=isVisible(u);
      G.fx.push({k:'boom',x:u.x,y:u.y-6,t:0.45,max:0.45,r:26,col:'#c38bff'}); addDecal(u.x,u.y,12,'rgba(90,40,110,.55)');
      for(let i=0;i<14;i++) G.fx.push({k:'spark',x:u.x,y:u.y-10,vx:rand(-90,90),vy:rand(-120,0),t:0.5,max:0.5,col:pick(['#7a5a8e','#a6ff4a','#5d6f83'])});   /* shed armour and skin */
      const final=u.stage===HUSK_STAGES.length-1;
      if(vis){ SFX.play(final?'huskroar':'crack',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-32,t:1.4,max:1.4,txt:final?'HUSK':HUSK_STAGES[u.stage].name.toUpperCase(),col:final?'#ff5a4f':'#c38bff'}); if(final) G.shake=Math.max(G.shake||0,0.25); }
      if(final){ u.foundT=0; u.hide=null; if(!u.avatar&&G.side!=='swarm'){ u.role='hunt'; u.guardAt=null; u.order=null; }   /* full grown: it leaves the creep and hunts */
        if(vis&&!G.saidHuskFull){ G.saidHuskFull=true; say('Dr. Maas','It has finished turning. A Husk: it leaves the creep now, and it is coming for us.','alert'); } } }
    return true; }
  if(u.stage<HUSK_STAGES.length-1){ const ready=u.avatar?avatarReady(u,dt):(u.stageT-=dt)<=0;   /* the creature you steer grows by feeding and hiding, not by the clock */
    if(ready){ u.molt=MOLT.time; if(isVisible(u)) SFX.play('molt',u.x,u.y); return true; } }
  return false; }
/* drawn on top of the Husk while it molts: it shakes, its skin glows and the next form pushes through */
function drawMolt(u,x,y,w,h,now){
  const p=1-u.molt/MOLT.time, nx=SPR[HUSK_STAGES[Math.min(u.stage+1,HUSK_STAGES.length-1)].sprite], s=u.def.scale||2, nw=nx.w*s, nh=nx.h*s;
  ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.25+0.35*Math.abs(Math.sin(now/60));
  ctx.drawImage(u.face>0?SPR[u.sprite].flash:SPR[u.sprite].flashFlip,x,y,w,h); ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=p*0.85; ctx.drawImage(u.face>0?nx.img:nx.flip,Math.round(u.x-nw/2+rand(-2,2)),Math.round(u.y-nh+4),nw,nh); ctx.globalAlpha=1;
  ctx.strokeStyle=`rgba(195,139,255,${0.5*(1-p)})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(u.x,u.y+2,10+p*14,(10+p*14)*0.5,0,0,Math.PI*2); ctx.stroke(); }
/* the cocoon a Husk grows in: a heartbeat that speeds up, veins reaching out, then cracks */
function huskCocoonThink(c,dt){ const p=1-c.hatchT/c.hatchMax, period=1.1-0.8*p;
  c.beatT=(c.beatT||0)-dt; if(c.beatT<=0){ c.beatT=period; c.beat=1; if(isVisible(c)){ SFX.play('heartbeat',c.x,c.y); if(p>0.6) SFX.play('crack',c.x,c.y); } }
  c.beat=Math.max(0,(c.beat||0)-dt*4);
  if(p>0.3&&Math.random()<dt*(2+p*10)) G.fx.push({k:'ember',x:c.x+rand(-8,8),y:c.y-rand(4,18),vx:rand(-20,20),vy:rand(-50,-15),t:0.9,max:0.9,col:pick(['#a6ff4a','#c38bff'])}); }
function drawHuskCocoon(c,now){ const p=1-c.hatchT/c.hatchMax, b=c.beat||0;
  const g=ctx.createRadialGradient(c.x,c.y-6,2,c.x,c.y-6,26+p*14); g.addColorStop(0,`rgba(195,139,255,${0.18+0.3*b+0.2*p})`); g.addColorStop(1,'rgba(195,139,255,0)');
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g; ctx.fillRect(c.x-42,c.y-48,84,84); ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle=`rgba(80,30,100,${0.7})`; ctx.lineWidth=2;
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+c.id, r=(8+p*20)*(0.7+0.3*creepNoise(i,c.id)); ctx.beginPath(); ctx.moveTo(c.x,c.y+4); ctx.quadraticCurveTo(c.x+Math.cos(a+0.5)*r*0.6,c.y+4+Math.sin(a+0.5)*r*0.3,c.x+Math.cos(a)*r,c.y+4+Math.sin(a)*r*0.5); ctx.stroke(); } }
function drawHuskCracks(c){ const p=1-c.hatchT/c.hatchMax; if(p<0.55) return; const n=Math.floor((p-0.55)/0.45*6)+1;
  ctx.strokeStyle='#d8ff9a'; ctx.lineWidth=1.5; ctx.globalAlpha=0.6+0.4*(c.beat||0);
  for(let i=0;i<n;i++){ const a=creepNoise(i,c.id)*Math.PI*2, x0=c.x+Math.cos(a)*3, y0=c.y-10+Math.sin(a)*5; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0+Math.cos(a)*5+2,y0+Math.sin(a)*4-2); ctx.lineTo(x0+Math.cos(a)*9,y0+Math.sin(a)*7+1); ctx.stroke(); }
  ctx.globalAlpha=1; }
function huskCap(){ const c=G.swarm.cfg.husks; return c!=null?c:HUSK.max; }
/* the most hives there may be at once on a map: the mission's own hives plus one (at least 3); a mission can set swarm.maxHives */
function hiveMax(){ const c=G.swarm.cfg.maxHives; return c!=null?c:Math.max(3,(G.mission.start.hives||[]).length+1); }
/* a quiet 3×3 spot, far from the Lunar Corps (clear tiles) and other hives (spacing tiles), at most reach tiles away, as close to the Husk as possible */
function quietSpot(u,clear,spacing,reach){
  const m=G.map, W=m.w, hs=hives(), corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!(e.def&&e.def.scenery));
  const marks=G.ents.filter(e=>!e.dead&&e.kind==='building'&&e.def.noBlock);   /* landing zones, beacons, charge sites: not on top of those */
  let best=null, bd=Infinity;
  for(let i=0;i<600;i++){ const x=2+Math.floor(Math.random()*(W-4)), y=2+Math.floor(Math.random()*(m.h-4)); let ok=true;
    for(let dy=-1;dy<=1&&ok;dy++) for(let dx=-1;dx<=1;dx++) if(!walkableT(x+dx,y+dy)){ ok=false; break; } if(!ok) continue;
    const px=(x+.5)*TILE, py=(y+.5)*TILE, d=Math.hypot(px-u.x,py-u.y); if(d>reach*TILE||d>=bd) continue;
    if(corps.some(e=>Math.hypot(e.x-px,e.y-py)<clear*TILE)) continue;
    if(spacing&&hs.some(h=>Math.hypot(h.x-px,h.y-py)<spacing*TILE)) continue;
    if(marks.some(e=>Math.hypot(e.x-px,e.y-py)<3*TILE)) continue;
    if(spacing&&G.ents.some(e=>!e.dead&&e.rootT!=null&&e!==u&&Math.hypot(e.x-px,e.y-py)<spacing*TILE)) continue;
    best={x,y}; bd=d; }
  return best; }
function huskSite(u){ return quietSpot(u,HUSK.clear,HUSK.spacing,HUSK.reach); }
/* the Shambler, close to its final form, stops fighting and slips away from the battle to finish turning in peace.
   It keeps HUSK.hide tiles between itself and your troops; if they come after it, it moves on. Returns true while it is withdrawing. */
function withdraw(u,dt){
  const near=nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit'&&!e.downed), dn=near?dist(u,near)/TILE:99;
  u.hideT=(u.hideT||0)-dt;
  if(!u.hide||(dn<HUSK.hide*0.6&&u.hideT<=0)){ u.hideT=2; const s=quietSpot(u,HUSK.hide,0,HUSK.reach); if(!s) return false;
    u.hide={x:(s.x+.5)*TILE,y:(s.y+.5)*TILE}; u.target=null; u.order={type:'move',x:u.hide.x,y:u.hide.y}; setPath(u,u.hide.x,u.hide.y); if(!u.path){ u.hide=null; u.order=null; return false; }
    if(isVisible(u)&&!G.saidWithdraw){ G.saidWithdraw=true; say('Sgt. Kessler','That one is pulling back. It wants to finish changing where we cannot see it. Do not let it get away!','alert'); } }
  if(Math.hypot(u.x-u.hide.x,u.y-u.hide.y)<TILE*0.8){ u.order={type:'hold'}; u.target=null; u.cd=Math.max(u.cd,0.3); }   /* hidden: it waits and does not fight */
  else if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:u.hide.x,y:u.hide.y}; setPath(u,u.hide.x,u.hide.y); }
  return true; }
function rooting(){ return G.ents.filter(e=>!e.dead&&e.rootT!=null).length; }
/* The Husk is a warrior. While it is still turning (Twitcher, Shambler) it stays on the creep of its hive and only fights what comes there;
   full grown, it leaves the creep and hunts (role 'hunt', see swarmThink). Only the creature you steer yourself in The Graft takes root (F).
   When a Husk kills a soldier it screams: the soldiers close by flinch (suppressed). Returns true while it is busy (molting, rooting). */
const HUSK_WARRIOR = { stay:true, screamR:3.5, matriarch:4 };   /* matriarch: soldiers a full Husk must bring down (or kill) to grow into a Matriarch */
function founderThink(u,dt){
  if(u.def.matriarch) return founderRoot(u,dt);   /* the Matriarch looks for a quiet place and takes root */
  if(huskGrow(u,dt)) return true;
  if(u.rootT!=null){ u.rootT-=dt; u.order={type:'hold'}; u.path=null; if(u.rootT<=0) rootHive(u); return true; }   /* only your own creature (The Graft) */
  if(u.avatar||G.side==='swarm') return false;   /* yours: you decide */
  if(u.stage!=null&&u.stage<HUSK_STAGES.length-1&&HUSK_WARRIOR.stay) return stayOnCreep(u);
  return false; }
/* still turning: it guards the creep of the nearest hive (fights what comes close, but does not chase you off the creep) */
function stayOnCreep(u){ const h=nearestOf(u,e=>e.type==='hive'&&!e.dead); if(!h){ u.role='hunt'; return false; }
  if(u.role!=='guard'||!u.guardAt||Math.hypot(u.guardAt.x-h.x,u.guardAt.y-h.y)>TILE){ u.role='guard'; u.homeHive=u.homeHive||h.id; u.guardAt={x:h.x,y:h.y}; u.order={type:'guard',x:h.x,y:h.y,wait:0}; u.target=null; setPath(u,h.x,h.y); }
  /* off the creep with nothing to fight: back onto it */
  if(creepAt(u.x,u.y)<CREEP.at && !u.target && (!u.order||u.order.type!=='move')){ const a=Math.atan2(u.y-h.y,u.x-h.x), r=Math.min(dist(u,h),3*TILE), x=h.x+Math.cos(a)*r, y=h.y+Math.sin(a)*r;
    u.order={type:'move',x,y}; setPath(u,x,y); }
  if(u.target && creepAt(u.target.x,u.target.y)<CREEP.at && dist(u.target,h)>(CREEP.max*0.8)*TILE){ u.target=null; u.order={type:'guard',x:h.x,y:h.y,wait:0}; setPath(u,h.x,h.y); }   /* it will not follow you out */
  return false; }
function huskScream(u){ if(!u||u.dead) return; const vis=isVisible(u); u.kills=(u.kills||0)+1;
  G.fx.push({k:'boom',x:u.x,y:u.y-14,t:0.5,max:0.5,r:HUSK_WARRIOR.screamR*TILE,col:'#ff5a4f'});
  if(vis){ SFX.play('huskroar',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-34,t:1.2,max:1.2,txt:'SCREAM',col:'#ff5a4f'}); G.shake=Math.max(G.shake||0,0.2); }
  for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.downed&&dist(e,u)<HUSK_WARRIOR.screamR*TILE) e.suppressT=Math.max(e.suppressT||0,SQUAD.suppress.time);
  if(u.type==='husk'&&!u.avatar&&G.side!=='swarm'&&u.stage===HUSK_STAGES.length-1&&u.kills>=HUSK_WARRIOR.matriarch&&canFound()) becomeMatriarch(u); }
/* may one more hive be founded? (swarm.husks new hives per mission, default HUSK.max; never more hives at once than hiveMax()) */
function canFound(){ return (G.swarm.founded||0)+rooting()<huskCap() && hives().length+rooting()<hiveMax(); }
/* a Husk that has fed enough grows into a Matriarch: bigger, tougher, and it will take root */
function becomeMatriarch(u){ const sel=G.sel.includes(u), m=makeUnit('matriarch','swarm',u.x,u.y); m.role='hunt'; m.face=u.face; m.foundT=3; m.molt=0;
  u.dead=true; if(sel){ G.sel=G.sel.filter(x=>x!==u); G.selDirty=true; }
  const vis=isVisible(m); G.fx.push({k:'boom',x:m.x,y:m.y-10,t:0.8,max:0.8,r:60,col:'#c38bff'}); addDecal(m.x,m.y,22,'rgba(90,40,110,.6)');
  for(let i=0;i<30;i++) G.fx.push({k:'ember',x:m.x+rand(-10,10),y:m.y-10,vx:rand(-130,130),vy:rand(-180,-20),t:rand(.5,1.2),max:1.2,col:pick(['#c38bff','#a6ff4a','#d23a3a'])});
  if(vis){ SFX.play('huskroar',m.x,m.y); SFX.play('molt',m.x,m.y); G.shake=Math.max(G.shake||0,0.4); G.fx.push({k:'text',x:m.x,y:m.y-56,t:1.8,max:1.8,txt:'MATRIARCH',col:'#c38bff'}); }
  say('Dr. Maas',vis?'That Husk has fed enough. It is changing again: a Matriarch. It will go somewhere quiet and seed a new hive. Kill it before it takes root!':'Something out there just changed. A Matriarch: it will try to seed a new hive.','alert');
  return m; }
/* the Matriarch walking off to a quiet place to root a hive (if the hive limits still allow it; otherwise it just hunts) */
function founderRoot(u,dt){
  if(u.rootT!=null){ u.rootT-=dt; u.order={type:'hold'}; u.path=null; if(u.rootT<=0) rootHive(u); return true; }
  if(u.noFound) return false;
  u.foundT=(u.foundT??0)-dt; if(u.foundT>0) return false;
  if((G.swarm.founded||0)+rooting()>=huskCap()||hives().length+rooting()>=hiveMax()){ u.noFound=true; return false; }   /* enough new hives: it just hunts */
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
    say('Dr. Maas',isVisible(u)?'The Matriarch is taking root. Stop it before a new hive grows out of it!':'Something out there is taking root. Our sensors picked up a new nest forming.','alert');
    return true; }
  if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:sx,y:sy}; setPath(u,sx,sy); if(!u.path){ u.site=null; return false; } }
  return true; }
function rootHive(u){
  const s=u.site; u.dead=true; if(G.sel.includes(u)){ G.sel=G.sel.filter(x=>x!==u); G.selDirty=true; }
  const h=makeBuilding('hive','swarm',s.x-1,s.y-1,true);
  h.maxHp=BUILDINGS.hive.hp*HUSK.hiveHp*(G.diff.hiveHp||1); h.hp=h.maxHp*0.6; h.spawnT=5; h.cfg={ guardMax:HUSK.guardMax, offshoot:true }; h.offshoot=true; h.creepR=1;
  G.swarm.founded=(G.swarm.founded||0)+1; if(u.avatar){ h.avatar=true; G.avatar=h; }
  /* nobody may stand inside the new hive */
  for(const e of G.ents){ if(e.dead||e.kind!=='unit') continue; const tx=Math.floor(e.x/TILE), ty=Math.floor(e.y/TILE);
    if(tx>=h.tx&&tx<h.tx+3&&ty>=h.ty&&ty<h.ty+3){ const f=nearestWalkable(tx,ty); if(f){ e.x=(f.x+.5)*TILE; e.y=(f.y+.5)*TILE; e.path=null; } } }
  G.fx.push({k:'boom',x:h.x,y:h.y,t:0.6,max:0.6,r:40,col:'#c38bff'}); addDecal(h.x,h.y,30,'rgba(70,30,90,.5)');
  G.pings.push({x:h.x,y:h.y,t:0,col:'#a6ff4a'}); SFX.play('horn');
  say('Alert',`A new hive has grown where the ${u.def.matriarch?'Matriarch':'Husk'} took root.`,'alert'); G.objDirty=true;
  return h; }
function drawRooting(u,now){
  const p=1-u.rootT/u.rootMax, R=10+p*22;
  ctx.strokeStyle=`rgba(195,139,255,${0.35+0.25*Math.sin(now/180)})`; ctx.lineWidth=2;
  for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+u.id, r=R*(0.7+0.3*creepNoise(i,u.id)); ctx.beginPath(); ctx.moveTo(u.x,u.y+2); ctx.quadraticCurveTo(u.x+Math.cos(a+0.6)*r*0.6,u.y+2+Math.sin(a+0.6)*r*0.35,u.x+Math.cos(a)*r,u.y+2+Math.sin(a)*r*0.55); ctx.stroke(); }
  const y=Math.round(u.y-40), x=Math.round(u.x);
  ctx.fillStyle='#000'; ctx.fillRect(x-15,y-1,30,5); ctx.fillStyle='#c38bff'; ctx.fillRect(x-14,y,Math.round(28*p),3);
  ctx.font='9px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText('ROOTING',x+1,y-3); ctx.fillStyle='#c38bff'; ctx.fillText('ROOTING',x,y-4); }

/* ---- the hatchery: eggs on the creep and the Grafters that hatch from them ----
   EGG: max = eggs a hive keeps waiting (per hive or mission: eggs:<n>) · every = seconds to grow a new one
        open = seconds an egg takes to open · spitEvery = how often a hive can spit a fresh egg at a body when none is free
        life = seconds a Grafter without a body lives */
const EGG = { max:3, every:18, open:1.4, spitEvery:6, life:25 };
function eggsOf(h){ return G.ents.filter(e=>!e.dead&&e.type==='egg'&&e.hive===h.id); }
function layHiveEgg(h,x,y,target){ const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE); if(!walkableT(tx,ty)) return null;
  const e=makeBuilding('egg','swarm',tx,ty,true); e.x=x; e.y=y; e.r=7; e.hive=h.id; if(target){ e.target=target; e.openT=EGG.open; } return e; }
function updateHatchery(dt){
  for(const h of hives()){ const max=hiveOpt(h,'eggs',EGG.max); if(!max) continue;
    if(!h.eggInit){ h.eggInit=true; h.eggT=EGG.every; for(let i=0;i<max;i++) placeEgg(h,2.2,3.2); continue; }   /* a few eggs already waiting */
    h.eggT-=dt; if(h.eggT<=0){ h.eggT=EGG.every; if(eggsOf(h).length<max&&(h.creepR||0)>=2.5) placeEgg(h,2.2,Math.min(5,Math.max(2.6,h.creepR-0.4))); } }
  for(const e of G.ents){ if(e.dead||e.type!=='egg') continue;
    if(!G.ents.some(h=>!h.dead&&h.id===e.hive)){ e.hp-=5*dt; if(e.hp<=0){ kill(e,null); continue; } }   /* its hive is dead: it withers */
    if(e.target&&(e.target.dead||!e.target.home)){ e.target=null; e.openT=null; }
    if(e.openT!=null){ e.openT-=dt; if(e.openT<=0) openEgg(e); } } }
function placeEgg(h,r0,r1){ for(let k=0;k<24;k++){ const a=Math.random()*Math.PI*2, r=rand(r0,r1)*TILE, x=h.x+Math.cos(a)*r, y=h.y+Math.sin(a)*r;
    if(!walkableT(Math.floor(x/TILE),Math.floor(y/TILE))) continue; if(G.ents.some(e=>!e.dead&&e.type==='egg'&&Math.hypot(e.x-x,e.y-y)<1.3*TILE)) continue;
    return layHiveEgg(h,x,y); } return null; }
function openEgg(e){ e.dead=true; const u=makeUnit('grafter','swarm',e.x,e.y); u.graft=e.target; u.life=EGG.life; u.role='grafter';
  addDecal(e.x,e.y,8,'rgba(90,40,110,.6)'); for(let i=0;i<10;i++) G.fx.push({k:'spark',x:e.x,y:e.y-6,vx:rand(-60,60),vy:rand(-90,-10),t:0.5,max:0.5,col:pick(['#c38bff','#a6ff4a','#7a5a8e'])});
  if(isVisible(e)){ SFX.play('crack',e.x,e.y); if(G.side==='corps'&&!G.saidEgg){ G.saidEgg=true; say('Dr. Maas','One of those eggs just opened. Something small is running for the body. Shoot it!','alert'); } } }
/* a body has come home: send the nearest waiting egg's Grafter, or spit a fresh egg next to it */
function callGrafter(b){ const h=b.home; if(!h||h.dead||b.avatarBody) return;   /* the body meant for your own Grafter waits for you */
  const free=eggsOf(h).filter(e=>!e.target); if(free.length){ const e=free.reduce((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)<=Math.hypot(c.x-b.x,c.y-b.y)?a:c); e.target=b; e.openT=EGG.open; return; }
  if(G.time<(h.spitAt||0)) return; h.spitAt=G.time+EGG.spitEvery;
  const f=freeTilesNear(Math.floor(b.x/TILE)+(Math.random()<0.5?1:-1),Math.floor(b.y/TILE),1)[0]; if(!f) return; const tx=(f.x+.5)*TILE, ty=(f.y+.5)*TILE;
  G.shots.push({k:'egglob',sx:h.x,sy:h.y-24,tx,ty,t:0,dur:Math.hypot(tx-h.x,ty-h.y)/200+0.35,faction:'none',splash:0,dmg:0,hive:h.id,body:b});
  if(isVisible(h)) SFX.play('spit',h.x,h.y); }
function eggLanded(s){ const h=G.ents.find(e=>!e.dead&&e.id===s.hive)||{id:s.hive}; const e=layHiveEgg(h,s.tx,s.ty,s.body&&!s.body.dead?s.body:null);
  if(e){ SFX.play('splat',e.x,e.y); addDecal(e.x,e.y,9,'rgba(90,40,110,.5)'); } }
/* the Grafter: runs to its body (or another body at home nearby) and latches on; without one it withers away */
function grafterThink(u,dt){ u.flash=Math.max(0,u.flash-dt); u.anim+=dt; u.moving=false; u.target=null;
  if(u.avatar){ avatarGrafter(u,dt); return; }
  let b=u.graft;
  if(!b||b.dead||!b.home){ b=u.graft=nearestOf(u,e=>e.kind==='body'&&!e.dead&&e.home&&!G.ents.some(g=>g!==u&&!g.dead&&g.def&&g.def.grafter&&g.graft===e))||null;
    if(!b||dist(u,b)>12*TILE){ u.graft=null; u.life-=dt; if(u.life<=0){ u.dead=true; addDecal(u.x,u.y,5,'rgba(90,40,110,.5)'); } return; } }
  if(u.latched) return;
  if(Math.hypot(u.x-b.x,u.y-b.y)>TILE*0.7) goTo(u,b.x,b.y,dt,0.6); }
/* an egg on the map: it breathes, and shudders open when its Grafter is needed */
function drawEgg(b,art,now){ const opening=b.openT!=null, p=opening?1-b.openT/EGG.open:0, s=1+Math.sin(now/500+b.id)*0.04+(opening?0.12*p:0), jx=opening?rand(-1.5,1.5):0;
  const w=art.width*2*s, h=art.height*2*s; ctx.drawImage(art,Math.round(b.x-w/2+jx),Math.round(b.y-h+6),Math.round(w),Math.round(h));
  if(opening){ ctx.strokeStyle='#a6ff4a'; ctx.lineWidth=2; for(let i=0;i<4;i++){ const a=-Math.PI/2+(i-1.5)*0.5; ctx.beginPath(); ctx.moveTo(b.x,b.y-h+10); ctx.lineTo(b.x+Math.cos(a)*7*p,b.y-h+10+Math.sin(a)*7*p); ctx.stroke(); } } }
