'use strict';
/* ---------- 2r2. extra animations and the Pyro's ground fire ----------
   Mostly pictures, two of them change the game:
   - FIRE: a Pyro's flame leaves the ground burning where it lands. A burning patch hurts the Swarm that walks through it
           and sets it alight (a burning Swarm unit keeps taking damage for a few seconds). Your own troops are not hurt.
   - ANIM: the rest is only to look at: footprints and moon dust, shell casings, a Swarm unit melting into acid,
           a Brute's stomping, scaffolding while a structure goes up, damage on structures, a turning Sentry Gun,
           a Medic's heart line and shock, acid sizzling on armour, a glint on a new rank, eggs opening like a flower,
           pulses running through the creep, meteorites, and the dropship passing over before it lands.
   Every number is in the dev panel (tab Effects). */
const FIRE = { burn:6, dps:9, radius:0.75, ignite:3, igniteDps:6, max:40, merge:0.6, grow:1.15 };
/* burn: seconds a patch burns · dps: damage per second to the Swarm standing in it · radius: tiles · ignite: seconds a Swarm unit keeps
   burning after it leaves the fire · igniteDps: damage per second while it burns · max: patches at once · merge: a new flame within this many tiles
   of a patch feeds that patch (it burns longer and grows up to `grow` times its radius) */
const ANIM = { prints:80, printLife:7, casings:40, casingLife:5, melt:1.8, glint:1.4, meteorEvery:35, bruteShake:0.05, acid:2.2, flyover:true };

/* ---- shared helpers ---- */
function animOnScreen(x,y,pad=60){ return G&&x>G.cam.x-pad&&x<G.cam.x+ui.vw+pad&&y>G.cam.y-pad&&y<G.cam.y+ui.vh+pad; }
function animSeen(x,y){ const k=Math.floor(y/TILE)*G.map.w+Math.floor(x/TILE); return !!(G.seen&&G.seen[k]); }
const animRnd=s=>{ s=Math.sin(s*127.1)*43758.5453; return s-Math.floor(s); };
let animCan=null, animCtx=null;   /* a scratch canvas to tint sprites */
function animScratch(w,h){ if(!animCan){ animCan=document.createElement('canvas'); animCtx=animCan.getContext('2d'); }
  if(animCan.width<w||animCan.height<h){ animCan.width=Math.max(w,animCan.width); animCan.height=Math.max(h,animCan.height); }
  animCtx.globalCompositeOperation='source-over'; animCtx.clearRect(0,0,animCan.width,animCan.height); return animCtx; }

/* ---- the Pyro's ground fire ---- */
function groundFire(x,y,src){ G.fires=G.fires||[]; const R=FIRE.radius*TILE;
  const near=G.fires.find(f=>Math.hypot(f.x-x,f.y-y)<FIRE.merge*TILE);
  if(near){ near.t=Math.max(near.t,FIRE.burn); near.max=Math.max(near.max,near.t); near.r=Math.min(R*FIRE.grow,near.r+1); if(src) near.src=src; return; }
  G.fires.push({x,y,r:R,t:FIRE.burn,max:FIRE.burn,seed:Math.random()*100,src});
  if(G.fires.length>FIRE.max) G.fires.shift();
  addDecal(x,y,R*0.8,'rgba(20,16,12,.45)'); }
function fireSrc(f){ return f.src&&!f.src.dead?f.src:{faction:'corps',dead:true}; }
function updateFires(dt){ const F=G.fires||(G.fires=[]);
  for(const f of F){ f.t-=dt; if(f.t<=0) continue;
    for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='swarm'||u.def.boss||u.hidden) continue;
      if(Math.hypot(u.x-f.x,(u.y-f.y)*1.4)>f.r+u.r*0.5) continue;
      const fl=u.flash; damage(u,FIRE.dps*dt,fireSrc(f)); u.flash=fl; if(!u.dead){ u.burnT=FIRE.ignite; u.burnSrc=f.src; } }
    for(const b of G.ents) if(!b.dead&&b.kind==='body'&&Math.hypot(b.x-f.x,b.y-f.y)<f.r) burnBody(b); }   /* the fallen burn too: no Husk out of them */
  G.fires=F.filter(f=>f.t>0);
  for(const u of G.ents){ if(u.dead||!(u.burnT>0)) continue; u.burnT-=dt; const fl=u.flash; damage(u,FIRE.igniteDps*dt,u.burnSrc&&!u.burnSrc.dead?u.burnSrc:{faction:'corps',dead:true}); u.flash=fl;
    if(!u.dead&&Math.random()<dt*14&&animOnScreen(u.x,u.y)) G.fx.push({k:'ember',x:u.x+rand(-6,6),y:u.y-rand(4,14),vx:rand(-15,15),vy:rand(-70,-30),t:0.4,max:0.4,col:pick(['#ffe08a','#ff8a2a','#ffd23f'])}); } }
function drawFires(now){ for(const f of G.fires||[]){ if(!animOnScreen(f.x,f.y)||!animSeen(f.x,f.y)) continue; const a=Math.min(1,f.t/1.2);
    ctx.fillStyle=`rgba(255,120,30,${0.16*a})`; ctx.beginPath(); ctx.ellipse(f.x,f.y,f.r,f.r*0.55,0,0,Math.PI*2); ctx.fill();   /* glow on the ground */
    const n=Math.round(6+f.r/4);
    for(let i=0;i<n;i++){ const ang=animRnd(f.seed+i)*Math.PI*2, d=Math.sqrt(animRnd(f.seed+i*3))*f.r*0.85, bx=f.x+Math.cos(ang)*d, by=f.y+Math.sin(ang)*d*0.55;
      const ph=(now/1000*2.6+animRnd(f.seed+i*7))%1, h=(6+animRnd(f.seed+i*5)*8)*a, y=by-ph*h, s=Math.max(1,Math.round(4*(1-ph)*a));
      ctx.fillStyle=ph<0.35?'#ffe08a':ph<0.7?'#ff8a2a':'rgba(150,60,20,.7)'; ctx.fillRect(Math.round(bx-s/2),Math.round(y-s),s,s); } } }
function drawBurning(u,now){ const sp=SPR[u.sprite||u.def.sprite], h=sp.h*(u.def.scale||2);
  for(let i=0;i<5;i++){ const ph=(now/1000*3.2+i*0.21+u.id*0.13)%1, x=u.x+(animRnd(u.id+i)-0.5)*u.r*1.6, y=u.y-2-ph*h*0.9, s=Math.max(1,Math.round(5*(1-ph)));
    ctx.fillStyle=ph<0.3?'#ffe08a':ph<0.65?'#ff8a2a':'#b9521c'; ctx.fillRect(Math.round(x-s/2),Math.round(y-s),s,s); } }

/* ---- shell casings (Gunners and Sentry Guns) ---- */
function ejectCasing(u){ if(!animOnScreen(u.x,u.y)) return; const n=G.fx.reduce((a,f)=>a+(f.k==='casing'),0); if(n>=ANIM.casings) return;
  const face=u.kind==='building'?(Math.cos(u.angle||0)>=0?1:-1):u.face||1;
  G.fx.push({k:'casing',x:u.x-face*3,y:u.y-10,vx:-face*rand(30,70),vy:rand(-110,-70),gy:u.y+rand(2,7),t:ANIM.casingLife,max:ANIM.casingLife,spin:0}); }
function casingTick(f,dt){ if(f.y>=f.gy&&f.vy>0){ f.y=f.gy; f.vy*=-0.35; f.vx*=0.5; if(Math.abs(f.vy)<12){ f.vy=0; f.vx=0; f.rest=true; } } if(f.rest){ f.vy=0; f.vx=0; f.y=f.gy; } f.spin+=dt*20*(f.rest?0:1); }
function drawCasing(f){ const a=Math.min(1,f.t/1.2); ctx.globalAlpha=a; ctx.fillStyle=f.rest?'#a58a2a':'#f2c230'; const up=Math.floor(f.spin)%2;
  ctx.fillRect(Math.round(f.x),Math.round(f.y),up?1:3,up?3:1); ctx.globalAlpha=1; }

/* ---- a Swarm unit melts into its acid ---- */
function meltFx(e){ if(!animOnScreen(e.x,e.y)||!isVisible(e)) return;
  G.fx.push({k:'melt',x:e.x,y:e.y,t:ANIM.melt,max:ANIM.melt,sprite:e.sprite||e.def.sprite,scale:e.def.scale||2,face:e.face||1,seed:e.id}); }
function drawMelt(f){ const sp=SPR[f.sprite]; if(!sp) return; const k=1-f.t/f.max, s=f.scale, w=sp.w*s, h=sp.h*s;
  if(k<0.6){ const q=k/0.6, c=animScratch(sp.w,sp.h); c.drawImage(f.face>0?sp.img:sp.flip,0,0); c.globalCompositeOperation='source-atop'; c.fillStyle=`rgba(79,174,34,${0.25+0.6*q})`; c.fillRect(0,0,sp.w,sp.h);
    const sy=1-0.85*q, sx=1+0.35*q; ctx.globalAlpha=1-q*0.4; ctx.drawImage(animCan,0,0,sp.w,sp.h,Math.round(f.x-w*sx/2),Math.round(f.y+4-h*sy),Math.round(w*sx),Math.max(1,Math.round(h*sy))); ctx.globalAlpha=1; }
  for(let i=0;i<5;i++){ const b=(k*2.2+animRnd(f.seed+i))%1; if(k>0.9) break; ctx.fillStyle=b<0.8?'#a6ff4a':'#d8ff9e'; ctx.fillRect(Math.round(f.x+(animRnd(f.seed+i*3)-0.5)*w*0.8),Math.round(f.y+2-b*10),2,2); }   /* bubbles */
  for(let i=0;i<3;i++){ const t=k*f.max-0.4-i*0.35; if(t<0||t>1.2) continue; ctx.fillStyle=`rgba(180,200,170,${0.4-t*0.3})`; ctx.beginPath(); ctx.arc(f.x+(i-1)*6+Math.sin(t*3+i)*2,f.y-4-t*22,2+t*5,0,Math.PI*2); ctx.fill(); } }

/* ---- footprints and moon dust ---- */
function stepAnims(u){ const step=Math.floor(u.anim*8)%2; if(u.lastStep===step) return; u.lastStep=step;
  if(!animOnScreen(u.x,u.y)) return; const k=Math.floor(u.y/TILE)*G.map.w+Math.floor(u.x/TILE), tile=G.map.tiles[k];
  if(u.type==='brute'&&u.faction==='swarm'){ if(!isVisible(u)) return;   /* the ground shakes under a Brute */
    G.fx.push({k:'stomp',x:u.x,y:u.y+4,t:0.35,max:0.35}); G.fx.push({k:'dust',x:u.x-u.face*10,y:u.y+2,vx:-u.face*rand(10,25),vy:rand(-14,-6),t:1.4,max:1.4,r0:3,r1:10,col:'#8a7a6a'});
    G.shake=Math.max(G.shake||0,ANIM.bruteShake); return; }
  if(u.faction!=='corps'||!u.def.bio||tile==='='||(G.creep&&G.creep[k]>0.2)) return;   /* no prints on plating or on the creep */
  const side=step?1:-1, P=G.prints||(G.prints=[]); P.push({x:u.x+side*2,y:u.y+2,t:ANIM.printLife});
  if(P.length>ANIM.prints) P.shift();
  if(Math.random()<0.7) G.fx.push({k:'dust',x:u.x+side*2,y:u.y+1,vx:rand(-6,6),vy:rand(-10,-4),t:1.8,max:1.8,r0:1,r1:4,col:'#9a968e'}); }   /* low gravity: the dust hangs */
function drawPrints(){ for(const p of G.prints||[]){ if(!animOnScreen(p.x,p.y)) continue; ctx.fillStyle=`rgba(14,15,18,${0.45*Math.min(1,p.t/2)})`; ctx.fillRect(Math.round(p.x)-1,Math.round(p.y),3,2); } }

/* ---- meteorites: now and then one comes down where you can see it (harmless) ---- */
function meteorTick(dt){ if(!(ANIM.meteorEvery>0)) return; G.meteorT=(G.meteorT??rand(8,ANIM.meteorEvery))-dt; if(G.meteorT>0) return;
  G.meteorT=ANIM.meteorEvery*rand(0.6,1.4);
  for(let i=0;i<20;i++){ const x=G.cam.x+rand(60,ui.vw-60), y=G.cam.y+rand(80,ui.vh-(ui.hudH||0)-40), tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
    if(tx<0||ty<0||tx>=G.map.w||ty>=G.map.h||!walkableT(tx,ty)||!animSeen(x,y)) continue;
    G.fx.push({k:'meteor',x,y,t:1.6,max:1.6,dx:rand(-1,1)<0?-1:1}); return; } }
function meteorFx(f){ const tt=f.max-f.t; if(tt>=0.55&&!f.hit){ f.hit=true; addDecal(f.x,f.y,7,'rgba(16,16,20,.6)'); SFX.play('crack',f.x,f.y);
    for(let i=0;i<10;i++) G.fx.push({k:'spark',x:f.x,y:f.y-2,vx:rand(-70,70),vy:rand(-90,-20),t:0.5,max:0.5,col:pick(['#d3c3a6','#ffe2a8','#ffffff'])});
    G.fx.push({k:'dust',x:f.x,y:f.y-2,vx:0,vy:-6,t:1.6,max:1.6,r0:3,r1:12,col:'#8a8a90'}); } }
function drawMeteor(f){ const tt=f.max-f.t; if(tt<0.55){ const k=tt/0.55, sx=f.x-f.dx*160*(1-k), sy=f.y-220*(1-k);
    for(let i=0;i<8;i++){ const b=Math.max(0,k-i*0.035); ctx.globalAlpha=1-i*0.12; ctx.fillStyle=i<2?'#ffffff':'#7ff6ff'; ctx.fillRect(Math.round(f.x-f.dx*160*(1-b)),Math.round(f.y-220*(1-b)),2,2); }
    ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.fillRect(Math.round(sx)-1,Math.round(sy)-1,3,3); }
  else if(tt<0.67){ ctx.fillStyle='rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(f.x,f.y,10,0,Math.PI*2); ctx.fill(); } }

/* ---- the Medic's shock and other small effects ---- */
function drawShock(f){ const a=f.t/f.max; ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(127,246,255,${0.6*a})`; ctx.beginPath(); ctx.arc(f.x,f.y,6+(1-a)*14,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=`rgba(230,255,255,${a})`; ctx.lineWidth=1; ctx.beginPath(); for(let i=0;i<4;i++){ const an=animRnd(f.seed+i)*Math.PI*2; ctx.moveTo(f.x,f.y); ctx.lineTo(f.x+Math.cos(an)*12,f.y+Math.sin(an)*8); } ctx.stroke(); ctx.globalCompositeOperation='source-over'; }
function drawStomp(f){ const a=f.t/f.max; ctx.strokeStyle=`rgba(211,195,166,${a*0.8})`; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(f.x,f.y,6+(1-a)*26,2+(1-a)*9,0,0,Math.PI*2); ctx.stroke(); }
function drawLandRing(f){ const a=f.t/f.max; ctx.strokeStyle=`rgba(194,180,156,${a*0.7})`; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(f.x,f.y,20+(1-a)*90,10+(1-a)*42,0,0,Math.PI*2); ctx.stroke(); }
/* the heart line over a soldier the Medic is working on: flat while he is down, beating once the Medic has him */
function drawECG(u,x,y,now){ const d=u.downed, w=30, live=d.patch>0;
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(x-w/2-2,y-7,w+4,10);
  for(let i=0;i<w;i++){ let yy=0; const ph=((now/1000)*(16+d.patch*20)-i)%14; if(live&&ph>0&&ph<4) yy=[0,-4,3,-1][Math.floor(ph)];
    ctx.fillStyle=live?'#7dffbf':'#3a5a2a'; ctx.fillRect(x-w/2+i,y-2+yy,1,1); } }
/* acid eating into armour */
function drawAcidOn(u,now){ const sp=SPR[u.sprite||u.def.sprite], h=sp.h*(u.def.scale||2), a=Math.min(1,u.acidT/0.8);
  for(let i=0;i<4;i++){ const ph=(now/1000*1.4+i*0.25+u.id*0.1)%1; ctx.fillStyle=`rgba(166,255,74,${a})`; ctx.fillRect(Math.round(u.x-5+i*3),Math.round(u.y-h*0.7+ph*h*0.6),2,2); }
  for(let i=0;i<3;i++){ const ph=(now/1000*0.9+i*0.33)%1; ctx.fillStyle=`rgba(190,235,170,${(0.45-ph*0.4)*a})`; ctx.beginPath(); ctx.arc(u.x-4+i*4+Math.sin(ph*4+i)*2,u.y-h*0.6-ph*14,1.5+ph*3,0,Math.PI*2); ctx.fill(); } }
/* a gold glint running over a new rank mark */
function drawGlint(u,y){ const k=1-u.glintT/ANIM.glint, x=u.x-10+k*20; ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,226,140,${Math.sin(k*Math.PI)})`;
  ctx.fillRect(Math.round(x),y-16,2,10); ctx.fillRect(Math.round(x)-2,y-12,6,2); ctx.globalCompositeOperation='source-over'; }

/* ---- structures: scaffolding while they go up, damage as they get hurt, the Sentry Gun's barrel ---- */
function drawSite(b,art,x,y,w,h,now){ const p=Math.max(0,Math.min(1,b.progress||0));
  ctx.globalAlpha=0.22; ctx.drawImage(art,x,y,w,h); ctx.globalAlpha=1;   /* a ghost of what it will be */
  const cut=Math.round(h*(1-p)); if(h-cut>0) ctx.drawImage(art,0,art.height*(1-p),art.width,art.height*p,x,y+cut,w,h-cut);   /* rises from the ground */
  const x0=b.tx*TILE+1, y0=b.ty*TILE+1, S=b.size*TILE-2; ctx.strokeStyle='rgba(120,124,134,.85)'; ctx.lineWidth=1; ctx.beginPath();
  for(let yy=y0+S;yy>y0;yy-=7){ ctx.moveTo(x0,yy+.5); ctx.lineTo(x0+S,yy+.5); } ctx.moveTo(x0+.5,y0); ctx.lineTo(x0+.5,y0+S); ctx.moveTo(x0+S-.5,y0); ctx.lineTo(x0+S-.5,y0+S); ctx.stroke();
  if(b.weldT>0){ const wy=y+cut; for(let i=0;i<4;i++){ const ph=(now/1000*4+i*0.25)%1; ctx.fillStyle=ph<0.5?'#ffe2a8':'#ff8a2a'; ctx.fillRect(Math.round(b.x+(animRnd(i+Math.floor(now/90))-0.5)*w*0.7),Math.round(wy+ph*8),2,2); }
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(180,230,255,${0.4+0.4*Math.sin(now/30)})`; ctx.beginPath(); ctx.arc(b.x+Math.sin(now/300)*w*0.25,wy,3,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over'; } }
function damageable(b){ return b.kind==='building'&&b.faction==='corps'&&b.built&&!b.dead&&!b.invuln&&!b.def.ground&&!b.def.noBlock&&!b.def.fuse&&!b.def.armTime&&b.maxHp>0; }
function drawDamage(b,now){ if(!damageable(b)) return; const f=b.hp/b.maxHp; if(f>=0.75) return; const S=b.size*TILE, x0=b.x-S/2, y0=b.y-S/2;
  ctx.strokeStyle='rgba(10,11,16,.9)'; ctx.lineWidth=1; ctx.beginPath(); const n=f<0.5?3:2;
  for(let c=0;c<n;c++){ let x=x0+S*(0.2+0.6*animRnd(b.id+c)), y=y0+S*(0.15+0.3*animRnd(b.id+c*5)); ctx.moveTo(x,y); for(let s=0;s<4;s++){ x+=(animRnd(b.id+c*9+s)-0.5)*S*0.25; y+=S*0.1+animRnd(b.id+c*3+s)*S*0.08; ctx.lineTo(x,y); } }
  ctx.stroke();
  if(f<0.5&&Math.floor(now/110+b.id)%5===0){ for(let i=0;i<3;i++){ ctx.fillStyle='#ffe2a8'; ctx.fillRect(Math.round(x0+S*animRnd(b.id+i+Math.floor(now/110))),Math.round(y0+S*0.3*animRnd(b.id+i*2+Math.floor(now/110))),2,2); } }
  if(f<0.25) for(let i=0;i<6;i++){ const ph=(now/1000*2+animRnd(b.id+i))%1, x=x0+S*(0.2+0.6*animRnd(b.id*3+i)), y=y0+S*0.35-ph*12, s=Math.max(1,Math.round(4*(1-ph)));
      ctx.fillStyle=ph<0.35?'#ffe08a':ph<0.7?'#ff8a2a':'#b9521c'; ctx.fillRect(Math.round(x),Math.round(y),s,s); } }
function damageSmoke(b,dt){ if(!damageable(b)) return; const f=b.hp/b.maxHp; if(f>=0.5||!animOnScreen(b.x,b.y)) return;
  if(Math.random()<dt*(f<0.25?6:3)) G.fx.push({k:'dust',x:b.x+rand(-b.r,b.r)*0.5,y:b.y-b.r*0.4,vx:rand(-6,6),vy:rand(-30,-18),t:rand(1.6,2.6),max:2.6,r0:rand(3,5),r1:rand(10,18),col:pick(['#77726c','#5e5a55','#8a857e'])}); }
function drawSentryBarrel(b,x,y,w,h){ const a=b.angle??-Math.PI/2, rc=(b.recoil>0?3:0), cx=b.x, cy=b.y-1, L=13-rc;
  ctx.strokeStyle='#0a0b10'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L); ctx.stroke();
  ctx.strokeStyle='#a3b4c6'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*(L-1),cy+Math.sin(a)*(L-1)); ctx.stroke();
  ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(cx)-4,Math.round(cy)-4,8,8); ctx.fillStyle='#5d6f83'; ctx.fillRect(Math.round(cx)-3,Math.round(cy)-3,6,6); }
function sentryFired(b){ b.recoil=0.08; if(animOnScreen(b.x,b.y)&&Math.random()<0.5){ const a=b.angle||0; G.fx.push({k:'dust',x:b.x+Math.cos(a)*14,y:b.y-1+Math.sin(a)*14,vx:Math.cos(a)*8,vy:-14,t:0.9,max:0.9,r0:1,r1:5,col:'#9a9aa5'}); } ejectCasing(b); }

/* ---- the creep: light runs out from the nest through it, and it creeps forward where it grows ---- */
function drawCreepLife(now,vx0,vy0,vx1,vy1){ if(!G.creep||!G.creepAny) return; const m=G.map, W=m.w;
  for(const h of nests()){ if(h.x<vx0-300||h.x>vx1+300||h.y<vy0-300||h.y>vy1+300) continue; const R=(h.creepR||2)*TILE;
    for(let i=0;i<10;i++){ const an=i/10*Math.PI*2+h.id, ph=(now/1000*0.35+animRnd(h.id+i))%1, r=TILE*1.2+ph*R, x=h.x+Math.cos(an)*r, y=h.y+Math.sin(an)*r*0.8, c=creepAt(x,y);
      if(c<0.3||!animSeen(x,y)) continue; ctx.fillStyle=`rgba(166,255,74,${(1-ph)*0.8*c})`; ctx.fillRect(Math.round(x)-1,Math.round(y)-1,3,3); } }
  const T=G.creepTgt, C=G.creep; if(!T) return; const x0=Math.max(0,Math.floor(vx0/TILE)), y0=Math.max(0,Math.floor(vy0/TILE)), x1=Math.min(W-1,Math.ceil(vx1/TILE)), y1=Math.min(m.h-1,Math.ceil(vy1/TILE));
  ctx.fillStyle='rgba(122,90,142,.85)';
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const k=y*W+x; if(!(T[k]>C[k]+0.02)||C[k]<0.05||!G.seen[k]) continue;   /* a growing edge: tendrils feel their way forward */
    const n=creepNoise(x,y), bx=x*TILE+n*TILE*0.6, by=y*TILE+creepNoise(y,x)*TILE*0.6;
    for(let s=0;s<7;s++) ctx.fillRect(Math.round(bx+s*2+Math.sin(now/300+n*9+s*0.6)*2),Math.round(by+Math.cos(n*20)*s*1.5),2,1); } }

/* ---- the dropship passes over high up before it comes in to land ---- */
function drawFlyover(now){ if(!ANIM.flyover) return; for(const b of G.ents){ if(b.dead||!b.def||!b.def.reinforce||!b.flight) continue; const t=b.flight.t; if(t>10||t<6) continue;
    const k=(10-t)/4, a=(b.flight.ang??-1.5)+Math.PI*0.6, D=900, x=b.x+Math.cos(a)*D*(k*2-1), y=b.y+Math.sin(a)*D*(k*2-1)*0.6, art=ARTC.dropship, w=art.width*4, hh=art.height*4;
    ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.globalAlpha=0.16*Math.sin(k*Math.PI); ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,0,w*0.5,hh*0.36,0,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.globalAlpha=1;
    if(!b.flight.passHeard&&t<9.6){ b.flight.passHeard=true; SFX.play('engine',x,y); } } }

/* ---- per frame ---- */
function updateAnims(dt){
  for(const p of G.prints||[]) p.t-=dt; if(G.prints&&G.prints.length&&G.prints[0].t<=0) G.prints=G.prints.filter(p=>p.t>0);
  for(const u of G.ents){ if(u.dead) continue;
    if(u.kind==='unit'){ if(u.moving&&!u.downed) stepAnims(u); if(u.acidT>0) u.acidT-=dt; if(u.glintT>0) u.glintT-=dt; }
    else if(u.kind==='building'){ if(u.recoil>0) u.recoil-=dt; if(u.weldT>0) u.weldT-=dt; damageSmoke(u,dt); } }
  for(const f of G.fx){ if(f.k==='casing') casingTick(f,dt); else if(f.k==='meteor') meteorFx(f); }
  meteorTick(dt); updateFires(dt); }
