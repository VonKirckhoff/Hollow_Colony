'use strict';
/* ---------- 2r. hive life: the creep around a hive, and the Husk ----------
   CREEP: a living carpet grows out from every hive, from `start` tiles to `max` tiles over `grow` seconds
          (per hive or per mission: creep:<tiles>, creep:0 for none). Swarm units standing on it heal `heal` HP/s.
          When the hive dies, the creep withers away.
   HUSK:  hatches from a body a Grafter infected (see the stages below). The Twitcher fights, the Shambler withdraws from the battle
          (keeps `hide` tiles from your troops), and the finished Husk is a warrior that hunts. Only the creature you steer in The Graft
          can take root (`root` seconds) and become a young hive with `hiveHp` of a normal hive's health and `guardMax` guards. */
const CREEP = { start:2, max:8, grow:150, rise:0.5, fade:0.07, heal:4, at:0.3, every:0.5 };
const HUSK  = { root:18, hiveHp:0.55, guardMax:2, hide:11, reach:34, skipShambler:true };   /* hide: tiles a withdrawing Shambler keeps from your troops · skipShambler: a Husk of the Swarm molts from Twitcher straight into a Husk (the creature you steer in The Graft still goes through all three) */

/* ---- creep ---- */
function creepNoise(x,y){ const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
function updateCreep(dt){
  const m=G.map, W=m.w, H=m.h;   /* creep grows round every nest: hives and shafts with creep (nests()) */
  if(!G.creep){ G.creep=new Float32Array(W*H); G.creepTgt=new Float32Array(W*H); G.creepT=0; }
  if(!G.creepCv){ G.creepCv=document.createElement('canvas'); G.creepCv.width=W; G.creepCv.height=H; }   /* (also after loading a saved game: canvases are not saved) */
  const hs=nests();
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
      if(c>t+0.01){ px[o]=74; px[o+1]=64; px[o+2]=70; } else { px[o]=96; px[o+1]=40+Math.round(26*c); px[o+2]=112; }   /* dying creep turns grey */
      px[o+3]=Math.round(150*Math.min(1,c*1.4)); }
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
   hp/speed/dmg are shares of the Husk's own numbers. */
const HUSK_STAGES = [
  { name:'Twitcher', sprite:'husk1', hp:0.4,  speed:0.7, dmg:0.6,  time:7 },
  { name:'Shambler', sprite:'husk2', hp:0.7,  speed:0.9, dmg:0.75, time:8 },
  { name:'Husk',     sprite:'husk',  hp:1,    speed:1,   dmg:1 }
];
const MOLT = { time:1.6, vuln:1.5 };
/* the stage a molt leads to: the Swarm's own Husks skip the Shambler (HUSK.skipShambler); the creature you steer does not */
function nextStage(u){ const last=HUSK_STAGES.length-1, n=Math.min(last,u.stage+1); return (HUSK.skipShambler&&!u.avatar&&HUSK_STAGES[n].name==='Shambler')?Math.min(last,n+1):n; }
function huskStage(u,i){ const st=HUSK_STAGES[i], f=u.maxHp?u.hp/u.maxHp:1, base=toughHp(u.type)*G.diff.hp;
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
    if(u.molt<=0){ huskStage(u,nextStage(u)); u.order=null; const vis=isVisible(u);
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
  const p=1-u.molt/MOLT.time, nx=SPR[HUSK_STAGES[nextStage(u)].sprite], s=u.def.scale||2, nw=nx.w*s, nh=nx.h*s;
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
const HUSK_WARRIOR = { stay:true, screamR:3.5, mendAt:0.65, mendDone:0.95, escort:3, escortR:14, escortEvery:12 };   /* mendAt: a Husk that brings a soldier down while below this share of its health goes back to the creep to heal; mendDone: it hunts again from this share.
   escort: a full-grown Husk goes to war with this many Swarm creatures round it (gathered within escortR tiles, the rest hatched from the nest it stands at;
   topped up every escortEvery seconds). */
function founderThink(u,dt){
  if(huskGrow(u,dt)) return true;
  if(u.rootT!=null){ u.rootT-=dt; u.order={type:'hold'}; u.path=null; if(u.rootT<=0) rootHive(u); return true; }   /* only your own creature (The Graft) */
  if(u.avatar||G.side==='swarm') return false;   /* yours: you decide */
  if(u.stage!=null&&u.stage<HUSK_STAGES.length-1&&HUSK_WARRIOR.stay) return stayOnCreep(u);
  if(!u.mend&&u.type==='husk'&&u.stage===HUSK_STAGES.length-1&&!u.target&&u.hp<u.maxHp*HUSK_WARRIOR.mendAt&&nests().some(h=>(h.creepR||0)>=1)) u.mend=true;   /* hurt and nothing to fight: back to the creep first */
  if(u.mend) return mendThink(u);
  if(u.type==='husk'&&u.stage===HUSK_STAGES.length-1) huskEscort(u,dt);
  return false; }
/* the thick part of a nest's creep that is closest to u (where a Husk heals best) */
function creepSpot(h,u){ const R=Math.ceil(h.creepR||2), cx=Math.floor(h.x/TILE), cy=Math.floor(h.y/TILE); let best=null, bd=Infinity;
  for(let y=cy-R;y<=cy+R;y++) for(let x=cx-R;x<=cx+R;x++){ if(!walkableT(x,y)||G.block[y*G.map.w+x]) continue; const px=(x+.5)*TILE, py=(y+.5)*TILE;
    if(creepAt(px,py)<0.7) continue; const d=Math.hypot(px-u.x,py-u.y); if(d<bd){ bd=d; best={x:px,y:py}; } }
  return best||spawnSpotToward(h,u); }
/* ---- the Husk's war party ---- */
function escortsOf(u){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.role==='escort'&&e.leader===u); }
function escortFree(e){ return e.kind==='unit'&&!e.dead&&e.faction==='swarm'&&!e.def.founder&&!e.def.boss&&!e.def.grafter&&!e.claim&&!e.haul&&!e.tunnel&&!e.avatar
  &&(e.role==='guard'||e.role==='hunt'||e.role==='wave'||!e.role||(e.role==='escort'&&(!e.leader||e.leader.dead))); }
function huskEscort(u,dt){ u.escortT=(u.escortT||0)-dt; if(u.escortT>0) return; u.escortT=HUSK_WARRIOR.escortEvery;
  let need=HUSK_WARRIOR.escort-escortsOf(u).length; if(need<=0) return;
  const free=G.ents.filter(e=>escortFree(e)&&dist(e,u)<HUSK_WARRIOR.escortR*TILE).sort((a,b)=>dist(a,u)-dist(b,u));
  for(const e of free.slice(0,need)){ joinEscort(e,u); need--; }
  /* not enough round it: the nest it stands at hatches the rest */
  const h=nearestOf(u,isNest); if(need>0&&h&&dist(u,h)<((h.creepR||2)+4)*TILE){
    for(let i=0;i<need;i++){ const e=spawnNearBuilding(i%2?'crawler':'drone','swarm',h,u); if(e){ joinEscort(e,u); if(isVisible(e)) G.fx.push({k:'boom',x:e.x,y:e.y,t:0.3,max:0.3,r:14,col:'#a6ff4a'}); } } }
  if(escortsOf(u).length&&isVisible(u)&&!G.saidEscort&&G.side==='corps'){ G.saidEscort=true; say('Dr. Maas','The Husk is not alone: the brood gathers round it like an honour guard. It leads them now.','alert'); } }
function joinEscort(e,u){ e.role='escort'; e.leader=u; e.guardAt=null; e.order=null; e.target=null; e.path=null; e.slot=(escortsOf(u).length*2.1)%(Math.PI*2); }
/* an escort stays round its Husk: it fights what comes close and walks with the Husk otherwise */
function huskEscortThink(e){ const L=e.leader;
  if(!L||L.dead){ e.role='hunt'; e.leader=null; e.order=null; return; }
  if(e.target) return;
  const d=dist(e,L); if(d<2.6*TILE&&!(e.order&&e.order.type==='amove')) return;
  const x=L.x+Math.cos(e.slot||0)*1.5*TILE, y=L.y+Math.sin(e.slot||0)*1.5*TILE, ok=walkableP(x,y), tx=ok?x:L.x, ty=ok?y:L.y;
  if(d>=2.6*TILE&&(!e.order||e.order.type!=='amove'||Math.hypot(e.order.x-tx,e.order.y-ty)>TILE)){ e.order={type:'amove',x:tx,y:ty}; setPath(e,tx,ty); } }
/* a full-grown Husk that is free to hunt (leads a war party) */
function huskHunter(e){ return e.type==='husk'&&!e.dead&&!e.avatar&&!e.mend&&!(e.molt>0)&&e.stage===HUSK_STAGES.length-1; }
/* a wounded Husk that just made a kill goes back to the creep of the nearest hive, heals there (it only fights what comes right up to it)
   and goes hunting again once it is whole. Returns true while it is mending. */
function mendThink(u){
  if(u.hp>=u.maxHp*HUSK_WARRIOR.mendDone){ u.mend=null; u.order=null; u.target=null; u.role='hunt'; u.escortT=0;   /* healed: top up its war party here at the nest */
    if(isVisible(u)) G.fx.push({k:'text',x:u.x,y:u.y-34,t:1.2,max:1.2,txt:'HUNTING',col:'#ff5a4f'}); return false; }
  const h=nearestOf(u,e=>isNest(e)&&(e.creepR||0)>=1);
  if(!h){ u.mend=null; return false; }   /* no creep left anywhere: it fights on */
  if(creepAt(u.x,u.y)>0.5 && dist(u,h)<((h.creepR||2)+0.5)*TILE){   /* on the creep: it stays and heals */
    if(!u.order||u.order.type!=='hold'){ u.order={type:'hold'}; u.path=null; u.target=null; }
    return true; }
  if(!u.order||u.order.type!=='move'){ const s=creepSpot(h,u); u.target=null; u.order={type:'move',x:s.x,y:s.y}; setPath(u,s.x,s.y);
    if(!u.path){ u.mend=null; u.order=null; return false; } }   /* no way back to the creep: it fights on */
  return true; }
/* still turning: it guards the creep of the nearest hive (fights what comes close, but does not chase you off the creep) */
function stayOnCreep(u){ const h=nearestOf(u,isNest); if(!h){ u.role='hunt'; return false; }
  if(u.role!=='guard'||!u.guardAt||Math.hypot(u.guardAt.x-h.x,u.guardAt.y-h.y)>TILE){ u.role='guard'; u.homeHive=u.homeHive||h.id; u.guardAt={x:h.x,y:h.y}; u.order={type:'guard',x:h.x,y:h.y,wait:0}; u.target=null; setPath(u,h.x,h.y); }
  /* off the creep with nothing to fight: back onto it */
  if(creepAt(u.x,u.y)<CREEP.at && !u.target && (!u.order||u.order.type!=='move')){ const a=Math.atan2(u.y-h.y,u.x-h.x), r=Math.min(dist(u,h),3*TILE), x=h.x+Math.cos(a)*r, y=h.y+Math.sin(a)*r;
    u.order={type:'move',x,y}; setPath(u,x,y); }
  if(u.target && creepAt(u.target.x,u.target.y)<CREEP.at && dist(u.target,h)>(CREEP.max*0.8)*TILE){ u.target=null; u.order={type:'guard',x:h.x,y:h.y,wait:0}; setPath(u,h.x,h.y); }   /* it will not follow you out */
  return false; }
function huskScream(u){ if(!u||u.dead) return; const vis=isVisible(u);
  G.fx.push({k:'boom',x:u.x,y:u.y-14,t:0.5,max:0.5,r:HUSK_WARRIOR.screamR*TILE,col:'#ff5a4f'});
  if(vis){ SFX.play('huskroar',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-34,t:1.2,max:1.2,txt:'SCREAM',col:'#ff5a4f'}); G.shake=Math.max(G.shake||0,0.2); }
  for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.downed&&dist(e,u)<HUSK_WARRIOR.screamR*TILE) e.suppressT=Math.max(e.suppressT||0,SQUAD.suppress.time);
  /* wounded after its kill: back to the creep to heal first */
  if(u.type==='husk'&&!u.avatar&&G.side!=='swarm'&&u.stage===HUSK_STAGES.length-1&&!u.mend&&u.hp<u.maxHp*HUSK_WARRIOR.mendAt&&nests().some(h=>(h.creepR||0)>=1)){
    u.mend=true; u.target=null; u.order=null;
    if(vis){ G.fx.push({k:'text',x:u.x,y:u.y-48,t:1.4,max:1.4,txt:'FALLS BACK',col:'#c38bff'});
      if(!G.saidMend){ G.saidMend=true; say('Dr. Maas','It is going back to the creep to heal. It will come out again for the next one of us. Do not let it get there!','alert'); } } } }
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
  say('Alert','A new hive has grown where the Husk took root.','alert'); G.objDirty=true;
  return h; }
function drawRooting(u,now){
  const p=1-u.rootT/u.rootMax, R=10+p*22;
  ctx.strokeStyle=`rgba(195,139,255,${0.35+0.25*Math.sin(now/180)})`; ctx.lineWidth=2;
  for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+u.id, r=R*(0.7+0.3*creepNoise(i,u.id)); ctx.beginPath(); ctx.moveTo(u.x,u.y+2); ctx.quadraticCurveTo(u.x+Math.cos(a+0.6)*r*0.6,u.y+2+Math.sin(a+0.6)*r*0.35,u.x+Math.cos(a)*r,u.y+2+Math.sin(a)*r*0.55); ctx.stroke(); }
  const y=Math.round(u.y-40), x=Math.round(u.x);
  ctx.fillStyle='#000'; ctx.fillRect(x-15,y-1,30,5); ctx.fillStyle='#c38bff'; ctx.fillRect(x-14,y,Math.round(28*p),3);
  ctx.font='9px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText('ROOTING',x+1,y-3); ctx.fillStyle='#c38bff'; ctx.fillText('ROOTING',x,y-4); }

/* ---- the hatchery: the eggs a hive lays and the Grafters that hatch from them ----
   A hive keeps no eggs waiting: only when a body lies in its creep does it lay an egg, right next to itself (on the side of the body).
   The egg opens, the Grafter runs to the body and turns it.
   EGG: max = eggs a hive can have at once (per hive or mission: eggs:<n>, eggs:0 = none) · open = seconds an egg takes to open
        spitEvery = seconds between two eggs of one hive (one body after another) · life = seconds a Grafter without a body lives */
const EGG = { max:3, open:1.4, spitEvery:3, life:25 };
function eggsOf(h){ return G.ents.filter(e=>!e.dead&&e.type==='egg'&&e.hive===h.id); }
function layHiveEgg(h,x,y,target){ const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE); if(!walkableT(tx,ty)) return null;
  const e=makeBuilding('egg','swarm',tx,ty,true); e.x=x; e.y=y; e.r=7; e.hive=h.id; if(target){ e.target=target; e.openT=EGG.open; } return e; }
function updateHatchery(dt){
  for(const e of G.ents){ if(e.dead||e.type!=='egg') continue;
    if(!G.ents.some(h=>!h.dead&&h.id===e.hive)){ e.hp-=5*dt; if(e.hp<=0){ kill(e,null); continue; } }   /* its hive is dead: it withers */
    if(e.target&&(e.target.dead||!e.target.home)){ e.target=null; e.openT=null; }
    if(e.openT!=null){ e.openT-=dt; if(e.openT<=0) openEgg(e); } } }
/* the tile right next to the hive where its next egg goes: on the side of `toward` (the body), not on top of another egg */
function eggSpot(h,toward){ const s=h.size, c=[];
  for(let y=h.ty-1;y<=h.ty+s;y++) for(let x=h.tx-1;x<=h.tx+s;x++){ if(x>=h.tx&&x<h.tx+s&&y>=h.ty&&y<h.ty+s) continue; if(!walkableT(x,y)||G.block[y*G.map.w+x]) continue;
    const px=(x+.5)*TILE, py=(y+.5)*TILE; if(G.ents.some(e=>!e.dead&&e.type==='egg'&&Math.hypot(e.x-px,e.y-py)<0.8*TILE)) continue; c.push({x:px,y:py}); }
  if(!c.length) return null; if(!toward) return pick(c);
  return c.reduce((a,b)=>Math.hypot(a.x-toward.x,a.y-toward.y)<=Math.hypot(b.x-toward.x,b.y-toward.y)?a:b); }
/* a hive lays an egg next to itself (toward: the body it is for) */
function hiveEgg(h,toward,target){ const s=eggSpot(h,toward); if(!s) return null; return layHiveEgg(h,s.x,s.y,target); }
function openEgg(e){ e.dead=true; const u=makeUnit('grafter','swarm',e.x,e.y); u.graft=e.target; u.life=EGG.life; u.role='grafter';
  addDecal(e.x,e.y,8,'rgba(90,40,110,.6)'); for(let i=0;i<10;i++) G.fx.push({k:'spark',x:e.x,y:e.y-6,vx:rand(-60,60),vy:rand(-90,-10),t:0.5,max:0.5,col:pick(['#c38bff','#a6ff4a','#7a5a8e'])});
  if(isVisible(e)){ SFX.play('crack',e.x,e.y); if(G.side==='corps'&&!G.saidEgg){ G.saidEgg=true; say('Dr. Maas','One of those eggs just opened. Something small is running for the body. Shoot it!','alert'); } } }
/* a body lies in the creep of its hive: the hive lays an egg right next to itself, and its Grafter goes for the body
   (an egg that is already there and free, from an older save, is used first) */
function callGrafter(b){ const h=b.home; if(!h||h.dead||b.avatarBody) return;   /* the body meant for your own Grafter waits for you */
  const free=eggsOf(h).filter(e=>!e.target); if(free.length){ const e=free.reduce((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)<=Math.hypot(c.x-b.x,c.y-b.y)?a:c); e.target=b; e.openT=EGG.open; return; }
  const max=hiveOpt(h,'eggs',EGG.max); if(!max||eggsOf(h).length>=max) return;
  if(G.time<(h.spitAt||0)) return; h.spitAt=G.time+EGG.spitEvery;
  const s=eggSpot(h,b); if(!s) return;
  G.shots.push({k:'egglob',sx:h.x,sy:h.y-18,tx:s.x,ty:s.y,t:0,dur:0.45,faction:'none',splash:0,dmg:0,hive:h.id,body:b});   /* a short heave: the egg drops out of the hive at its foot */
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
  if(opening){ const tx=b.x+jx, ty=b.y-h+9;   /* the four petals of the lid peel open, goo drips, a glow inside */
    ctx.fillStyle=`rgba(166,255,74,${0.35+0.5*p})`; ctx.fillRect(Math.round(tx-2-2*p),Math.round(ty-1),Math.round(4+4*p),3);
    for(let i=0;i<4;i++){ const a=-Math.PI/2+(i-1.5)*(0.35+0.55*p), L=4+6*p; ctx.save(); ctx.translate(Math.round(tx),Math.round(ty)); ctx.rotate(a+Math.PI/2);
      ctx.fillStyle='#0a0b10'; ctx.fillRect(-3,-L-1,6,L+1); ctx.fillStyle='#45304f'; ctx.fillRect(-2,-L,4,L); ctx.fillStyle='#7a5a8e'; ctx.fillRect(-1,-L,2,Math.ceil(L/2)); ctx.restore(); }
    for(let i=0;i<2;i++){ const d=(now/700+i*0.5+b.id)%1; ctx.fillStyle='#a6ff4a'; ctx.fillRect(Math.round(tx-3+i*6),Math.round(ty+2+d*h*0.5),2,2); } } }

/* ---------- a hive's death: the last scream ----------
   A burnt hive does not just blow up. For HIVE_DEATH.scream seconds it shakes harder and harder, its heart races,
   it shrieks (green rings) and the last of its brood scuttles away from it (only a picture: they are not units).
   Then it caves in (HIVE_DEATH.fall seconds): it flattens and darkens, dirt flies, and smoke plumes keep rising until
   the end. A picture in G.fx (k:'hivedeath'), drawn by drawHiveDeath; the hive itself is already gone. */
const HIVE_DEATH = { scream:1.8, fall:0.6, time:3.4, rings:3, brood:7, smoke:12 };
function hiveDeath(h){ const D=HIVE_DEATH;
  G.fx.push({k:'hivedeath',x:h.x,y:h.y,t:D.time,max:D.time,seed:h.id*7.3,ph:h.id*0.37});
  SFX.play('huskroar',h.x,h.y); SFX.play('hatch',h.x,h.y); }
function hiveDeathTick(f){ const tt=f.max-f.t;   /* the sound of the cave-in, once */
  if(!f.fell&&tt>=HIVE_DEATH.scream){ f.fell=true; SFX.play('squelch',f.x,f.y); SFX.play('boom',f.x,f.y);
    for(let i=0;i<14;i++) G.fx.push({k:'ember',x:f.x+rand(-30,30),y:f.y+rand(-10,14),vx:rand(-70,70),vy:rand(-110,-30),t:rand(.5,1),max:1,col:pick(['#5a4632','#d3c3a6','#24182c','#4fae22'])}); } }
const hdRnd=s=>{ s=Math.sin(s*127.1)*43758.5453; return s-Math.floor(s); };
let hdCan=null, hdCtx=null;
function drawHiveDeath(f){ const D=HIVE_DEATH, tt=f.max-f.t, P=PALETTE, S=2;
  if(!G.seen[Math.floor(f.y/TILE)*G.map.w+Math.floor(f.x/TILE)]) return;
  const px=(x,y,col,n=1)=>{ ctx.fillStyle=col; ctx.fillRect(Math.round(x),Math.round(y),S*n,S*n); };
  /* the hive itself: shaking while it screams, then flattening and darkening */
  const fall=Math.min(1,Math.max(0,(tt-D.scream)/D.fall));
  if(fall<1||tt<D.scream+D.fall+0.2){
    if(!hdCan){ hdCan=document.createElement('canvas'); hdCan.width=hdCan.height=48; hdCtx=hdCan.getContext('2d'); }
    hdCtx.globalCompositeOperation='source-over'; hdCtx.clearRect(0,0,48,48); hdCtx.drawImage(hiveFrame(f.ph+tt*(tt<D.scream?3:0.5)),0,0);   /* the heart races */
    const dark=Math.min(0.75,tt/D.scream*0.25+fall*0.55); if(dark>0){ hdCtx.globalCompositeOperation='source-atop'; hdCtx.fillStyle=`rgba(10,11,16,${dark})`; hdCtx.fillRect(0,0,48,48); }
    const sh=tt<D.scream?Math.min(5,tt*2.8):0, k=Math.floor(tt*30), jx=(hdRnd(f.seed+k)-0.5)*sh, jy=(hdRnd(f.seed+k+50)-0.5)*sh*0.5;
    const sx=(1+0.2*fall)*(tt<D.scream?1+0.04*Math.sin(tt*30):1), sy=(1-0.8*fall)*(tt<D.scream?1+0.06*Math.sin(tt*30):1), W=48*S;
    ctx.save(); ctx.translate(Math.round(f.x+jx),Math.round(f.y-W/2-4+38*S+jy)); ctx.scale(sx,sy); ctx.drawImage(hdCan,-W/2,-38*S,W,W); ctx.restore(); }   /* it caves in onto the foot of the bulb (row 38) */
  else { ctx.fillStyle='rgba(10,11,16,.7)'; ctx.beginPath(); ctx.ellipse(f.x,f.y+20,30,8,0,0,Math.PI*2); ctx.fill(); }
  /* the shriek: green rings */
  for(let w=0;w<D.rings;w++){ const t=tt-w*0.5; if(t<0||t>0.8||tt>D.scream) continue; const r=16+t*130, a=1-t/0.8;
    ctx.strokeStyle=`rgba(166,255,74,${a})`; ctx.lineWidth=2; ctx.setLineDash([6,6]); ctx.lineDashOffset=w*4; ctx.beginPath(); ctx.ellipse(f.x,f.y-6,r,r*0.7,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  /* the last brood flees */
  for(let n=0;n<D.brood;n++){ const t=tt-0.3-n*0.18; if(t<0||t>2.6) continue; const a=hdRnd(f.seed+n+20)*Math.PI*2, d=24+t*95,
      X=f.x+Math.cos(a)*d, Y=f.y+16+Math.sin(a)*d*0.6, leg=Math.floor(tt*12+n)%2;
    ctx.globalAlpha=Math.min(1,(2.6-t)*2); px(X-2,Y-2,P.k,2); px(X-4,Y+leg*2,P.k); px(X+2,Y+(1-leg)*2,P.k); px(X,Y-4,P.p); ctx.globalAlpha=1; }
  /* smoke plumes rise from the start to the end */
  for(let n=0;n<D.smoke;n++){ const t=tt-0.3-n*0.22; if(t<0||t>2.2) continue; const X=f.x+(hdRnd(f.seed+n)-0.5)*56+Math.sin(t*3+n)*5, Y=f.y+6-t*46, r=4+t*9;
    ctx.fillStyle=`rgba(140,140,150,${Math.max(0,0.55-t*0.25)})`; ctx.beginPath(); ctx.arc(X,Y,r,0,Math.PI*2); ctx.fill(); }
}
