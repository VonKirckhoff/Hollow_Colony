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
const FIRE = { burn:3, dps:6, radius:0.75, ignite:3, igniteDps:6, max:40, merge:0.6, grow:1.15 };
/* burn: seconds a patch burns · dps: damage per second to the Swarm standing in it · radius: tiles · ignite: seconds a Swarm unit keeps
   burning after it leaves the fire · igniteDps: damage per second while it burns · max: patches at once · merge: a new flame within this many tiles
   of a patch feeds that patch (it burns longer and grows up to `grow` times its radius) */
const ANIM = { prints:80, printLife:7, casings:40, casingLife:5, melt:1.8, glint:1.4, meteorEvery:35, bruteShake:0.05, acid:2.2, flyover:true,
  spitCharge:0.5, emerge:1, idle:true, strays:0.25, dragLife:25, hurtEdge:60, lamps:true, lampRange:5, lampGlow:0.1, muzzleLight:true, orderMark:true, unfold:1.2, devilEvery:45, glints:true, lowGravity:45 };
/* spitCharge: seconds a Spitter's throat swells before the acid leaves (you can step aside; 0 = at once) · emerge: seconds the ground bulges
   before a burrowing wave breaks out (0 = at once) · hurtEdge: damage within about a second that makes the screen edge glow red on the side of
   the attack (0 = never) · lamps: helmet lamps in the dark (they also let you see lampRange tiles further in their beam) · lampGlow: how bright the beams are · muzzleLight: every shot
   lights the ground for a moment · orderMark: a ripple where you send your squad · unfold: seconds a Sentry Gun takes to unfold once set up ·
   devilEvery: about every this many seconds a dust devil crosses the screen (0 = never) · glints: crystals and ice sparkle ·
   lowGravity: how fast debris of an explosion falls back (pixels/s², the game's normal is 180): on the moon it hangs in the air */

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
    G.fx.push({k:'meteor',x,y,t:1.6,max:1.6,dx:rand(-1,1)<0?-1:1}); SFX.play('meteor',x,y); return; } }   /* the whistle starts with the streak, the thud lands with it */
function meteorFx(f){ const tt=f.max-f.t; if(tt>=0.55&&!f.hit){ f.hit=true; addDecal(f.x,f.y,7,'rgba(16,16,20,.6)');
    for(let i=0;i<4;i++) G.fx.push({k:'spark',x:f.x,y:f.y-2,vx:rand(-70,70),vy:rand(-90,-20),t:0.5,max:0.5,col:pick(['#ffe2a8','#ffffff'])});
    debrisBurst(f.x,f.y,10,['#d3c3a6','#8a7a6a','#5a4632'],80); } }
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
function drawSentryBarrel(b,x,y,w,h){ const u=b.unfoldT>0?1-b.unfoldT/ANIM.unfold:1, a=b.angle??-Math.PI/2, rc=(b.recoil>0?3:0), cx=b.x, cy=b.y-1-Math.round(3*u)+3, L=Math.max(2,(13-rc)*u);
  if(u<1){ const l=Math.round(u*6); ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(b.x)-8-l,Math.round(b.y)+8,3,3); ctx.fillRect(Math.round(b.x)+5+l,Math.round(b.y)+8,3,3); ctx.fillStyle='#5d6f83'; ctx.fillRect(Math.round(b.x)-6-l,Math.round(b.y)+8,l+1,1); ctx.fillRect(Math.round(b.x)+5,Math.round(b.y)+8,l+1,1); }
  else { ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(b.x)-14,Math.round(b.y)+8,3,3); ctx.fillRect(Math.round(b.x)+11,Math.round(b.y)+8,3,3); }   /* the feet, folded out */
  ctx.strokeStyle='#0a0b10'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L); ctx.stroke();
  ctx.strokeStyle='#a3b4c6'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*(L-1),cy+Math.sin(a)*(L-1)); ctx.stroke();
  ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(cx)-4,Math.round(cy)-4,8,8); ctx.fillStyle='#5d6f83'; ctx.fillRect(Math.round(cx)-3,Math.round(cy)-3,6,6); }
function sentryFired(b){ b.recoil=0.08; if(animOnScreen(b.x,b.y)&&Math.random()<0.5){ const a=b.angle||0; G.fx.push({k:'dust',x:b.x+Math.cos(a)*14,y:b.y-1+Math.sin(a)*14,vx:Math.cos(a)*8,vy:-14,t:0.9,max:0.9,r0:1,r1:5,col:'#9a9aa5'}); } ejectCasing(b); }

/* ---- the creep: light runs out from the nest through it, and it creeps forward where it grows ---- */
function drawCreepLife(now,vx0,vy0,vx1,vy1){ if(!G.creep||!G.creepAny) return; const m=G.map, W=m.w;
  for(const h of nests()){ if(h.x<vx0-300||h.x>vx1+300||h.y<vy0-300||h.y>vy1+300) continue; const R=(h.creepR||2)*TILE;
    for(let i=0;i<10;i++){ const an=i/10*Math.PI*2+h.id, ph=(now/1000*0.35+animRnd(h.id+i))%1, r=TILE*1.2+ph*R, x=h.x+Math.cos(an)*r, y=h.y+Math.sin(an)*r*0.8, c=creepAt(x,y);
      if(c<0.3||!animSeen(x,y)) continue; ctx.fillStyle=`rgba(166,255,74,${(1-ph)*0.8*c})`; ctx.fillRect(Math.round(x)-1,Math.round(y)-1,3,3); } }
  const T=G.creepTgt, C=G.creep; if(!T) return;
  { const x0=Math.max(0,Math.floor(vx0/TILE)), y0=Math.max(0,Math.floor(vy0/TILE)), x1=Math.min(W-1,Math.ceil(vx1/TILE)), y1=Math.min(m.h-1,Math.ceil(vy1/TILE));   /* dying creep: grey spores drift up */
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const k=y*W+x; if(C[k]>T[k]+0.05&&G.vis[k]&&Math.random()<0.004) G.fx.push({k:'dust',x:(x+Math.random())*TILE,y:(y+Math.random())*TILE,vx:rand(-4,4),vy:rand(-14,-6),t:1.6,max:1.6,r0:1,r1:4,col:'#77726c'}); } } const x0=Math.max(0,Math.floor(vx0/TILE)), y0=Math.max(0,Math.floor(vy0/TILE)), x1=Math.min(W-1,Math.ceil(vx1/TILE)), y1=Math.min(m.h-1,Math.ceil(vy1/TILE));
  ctx.fillStyle='rgba(122,90,142,.85)';
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const k=y*W+x; if(!(T[k]>C[k]+0.02)||C[k]<0.05||!G.seen[k]) continue;   /* a growing edge: tendrils feel their way forward */
    const n=creepNoise(x,y), bx=x*TILE+n*TILE*0.6, by=y*TILE+creepNoise(y,x)*TILE*0.6;
    for(let s=0;s<7;s++) ctx.fillRect(Math.round(bx+s*2+Math.sin(now/300+n*9+s*0.6)*2),Math.round(by+Math.cos(n*20)*s*1.5),2,1); } }

/* ---- the dropship passes over high up before it comes in to land ---- */
function drawFlyover(now){ if(!ANIM.flyover) return; for(const b of G.ents){ if(b.dead||!b.def||!b.def.reinforce||!b.flight) continue; const t=b.flight.t; if(t>10||t<6) continue;
    const k=(10-t)/4, a=(b.flight.ang??-1.5)+Math.PI*0.6, D=900, x=b.x+Math.cos(a)*D*(k*2-1), y=b.y+Math.sin(a)*D*(k*2-1)*0.6, art=ARTC.dropship, w=art.width*4, hh=art.height*4;
    ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.globalAlpha=0.16*Math.sin(k*Math.PI); ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,0,w*0.5,hh*0.36,0,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.globalAlpha=1;
    if(!b.flight.passHeard&&t<9.6){ b.flight.passHeard=true; SFX.play('engine',x,y); } } }

/* ---- combat signals ---- */
/* green ichor on every hit to the Swarm, sprayed away from the shooter */
function hitSplat(t,src){ if(!animOnScreen(t.x,t.y)||!isVisible(t)) return; const a=src&&src.x!=null?Math.atan2(t.y-src.y,t.x-src.x):rand(0,Math.PI*2);
  for(let i=0;i<4;i++){ const b=a+rand(-0.7,0.7), v=rand(40,90); G.fx.push({k:'spark',x:t.x,y:t.y-6,vx:Math.cos(b)*v,vy:Math.sin(b)*v-40,t:0.35,max:0.35,col:i%2?'#a6ff4a':'#4fae22'}); } }
/* a Spitter swelling up before it spits */
function drawSpitCharge(u,now){ const k=1-u.chargeT/ANIM.spitCharge, x=u.x+u.face*8, y=u.y-9, r=2+k*4, on=k>0.6&&Math.floor(now/80)%2;
  ctx.fillStyle=`rgba(166,255,74,${0.25*k})`; ctx.beginPath(); ctx.arc(x,y,r*2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=on?'#a6ff4a':'#4fae22'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
/* the ground bulges where a burrowing wave is about to break out */
function emergeStart(u){ if(!(ANIM.emerge>0)) return; u.emergeT=ANIM.emerge; u.hidden=true; u.invuln=true; }
function emergeTick(u,dt){ u.emergeT-=dt; if(u.emergeT>0) return; u.emergeT=0; u.hidden=false; u.invuln=false;
  if(animOnScreen(u.x,u.y)) debrisBurst(u.x,u.y,6,['#8a7a6a','#5a4632','#b3a58f'],70); }
function drawBulge(f){ if(!animSeen(f.x,f.y)) return; const k=1-f.t/f.max, R=f.r*(0.4+0.6*k);
  ctx.fillStyle=`rgba(58,60,67,${0.5+0.4*k})`; ctx.beginPath(); ctx.ellipse(f.x,f.y,R,R*0.5,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(10,11,16,.9)'; ctx.lineWidth=1; ctx.beginPath(); for(let i=0;i<5;i++){ const a=animRnd(f.seed+i)*Math.PI*2; ctx.moveTo(f.x,f.y); ctx.lineTo(f.x+Math.cos(a)*R*k,f.y+Math.sin(a)*R*0.5*k); } ctx.stroke();
  if(Math.floor(k*14)%2){ ctx.fillStyle='#8a7a6a'; for(let i=0;i<3;i++) ctx.fillRect(Math.round(f.x+(animRnd(f.seed+i+Math.floor(k*14))-0.5)*R*2),Math.round(f.y-2),2,2); } }
/* heavy damage to your side: the screen edge glows red on the side the attack comes from */
function hurtNote(t,amt,src){ if(!(ANIM.hurtEdge>0)) return; G.hurtAcc=(G.hurtAcc||0)+amt; const p=src&&src.x!=null&&!src.dead?src:t; G.hurtAt={x:p.x,y:p.y}; }
function drawHurtEdge(){ const v=G.hurtAcc||0; if(!(ANIM.hurtEdge>0)||v<ANIM.hurtEdge*0.5||!G.hurtAt) return; const k=Math.min(1,(v-ANIM.hurtEdge*0.5)/ANIM.hurtEdge);
  const top=40, bot=ui.vh-(ui.hudH||0), cx=ui.vw/2, cy=(top+bot)/2, a=Math.atan2(G.hurtAt.y-G.cam.y-cy,G.hurtAt.x-G.cam.x-cx), W=80, pulse=0.75+0.25*Math.sin(performance.now()/120);
  const side=Math.abs(Math.cos(a))*(bot-top)>Math.abs(Math.sin(a))*ui.vw?(Math.cos(a)>0?'r':'l'):(Math.sin(a)>0?'b':'t');
  const [x0,y0,x1,y1,rx,ry,rw,rh]=side==='r'?[ui.vw,0,ui.vw-W,0,ui.vw-W,top,W,bot-top]:side==='l'?[0,0,W,0,0,top,W,bot-top]:side==='b'?[0,bot,0,bot-W,0,bot-W,ui.vw,W]:[0,top,0,top+W,0,top,ui.vw,W];
  const g=ctx.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,`rgba(226,70,58,${0.55*k*pulse})`); g.addColorStop(1,'rgba(226,70,58,0)'); ctx.fillStyle=g; ctx.fillRect(rx,ry,rw,rh); }

/* ---- soldiers ---- */
/* falling: a soldier who goes down or dies topples over, his helmet bounces off */
function soldierFalls(u){ if(!animOnScreen(u.x,u.y)) return; u.fallT=0.4;
  G.fx.push({k:'helmet',x:u.x,y:u.y-16,vx:(u.face||1)*rand(18,34),vy:rand(-70,-40),gy:u.y+3,t:2.2,max:2.2,spin:0}); }
function drawHelmet(f){ ctx.globalAlpha=Math.min(1,f.t/0.6); ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(f.x)-3,Math.round(f.y)-2,6,5); ctx.fillStyle='#a3b4c6'; ctx.fillRect(Math.round(f.x)-2,Math.round(f.y)-1,4,3); ctx.globalAlpha=1; }
/* the way a soldier looks: where he walks, or at what he shoots */
function headingTick(u){ if(u.target&&!u.target.dead) u.head=Math.atan2(u.target.y-u.y,u.target.x-u.x);
  else if(u.lx!=null&&Math.hypot(u.x-u.lx,u.y-u.ly)>0.4) u.head=Math.atan2(u.y-u.ly,u.x-u.lx);
  else if(u.head==null) u.head=u.face>0?0:Math.PI; u.lx=u.x; u.ly=u.y; }
const lampOn=u=>ANIM.lamps&&G.mission.dark&&u.kind==='unit'&&u.faction==='corps'&&u.def.bio&&!u.downed&&!u.dead;
/* The beams are drawn together on one layer where overlapping beams do not add up (the brightest wins), so a whole squad
   is no brighter than one soldier; that layer is laid over the map at ANIM.lampGlow strength. */
let lampCan=null, lampCtx=null;
function drawLamps(){ if(!ANIM.lamps||!G.mission.dark||!(ANIM.lampGlow>0)) return; const W=Math.ceil(ui.vw), H=Math.ceil(ui.vh), cx=G.cam.x, cy=G.cam.y;
  if(!lampCan){ lampCan=document.createElement('canvas'); lampCtx=lampCan.getContext('2d'); } if(lampCan.width!==W||lampCan.height!==H){ lampCan.width=W; lampCan.height=H; }
  const c=lampCtx; c.globalCompositeOperation='source-over'; c.clearRect(0,0,W,H); c.globalCompositeOperation='lighten'; let any=false;
  for(const u of G.ents){ if(!lampOn(u)||!animOnScreen(u.x,u.y,200)||(u.faction!==G.side&&!isVisible(u))) continue; any=true; const a=u.head??0, L=(ANIM.lampRange+2)*TILE, x=u.x-cx, y=u.y-10-cy;
    const g=c.createRadialGradient(x,y,4,x,y,L); g.addColorStop(0,'rgb(255,230,160)'); g.addColorStop(1,'rgb(0,0,0)'); c.fillStyle=g;
    c.beginPath(); c.moveTo(x,y); c.arc(x,y,L,a-0.38,a+0.38); c.closePath(); c.fill(); }
  if(!any) return; ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=ANIM.lampGlow; ctx.drawImage(lampCan,cx,cy,W,H); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
/* what a lamp beam lights up you can see (in the dark, beyond the short normal sight) */
function lampReveal(){ if(!ANIM.lamps||!G.mission.dark||G.side!=='corps') return; const m=G.map, W=m.w;
  for(const u of G.ents){ if(!lampOn(u)) continue; const a0=u.head??0;
    for(let r=-2;r<=2;r++){ const a=a0+r*0.16; for(let d=1;d<=ANIM.lampRange+2;d++){ const tx=Math.floor((u.x+Math.cos(a)*d*TILE)/TILE), ty=Math.floor((u.y+Math.sin(a)*d*TILE)/TILE);
        if(tx<0||ty<0||tx>=W||ty>=m.h) break; const k=ty*W+tx; G.vis[k]=1; G.seen[k]=1; if(!m.walk[k]) break; } } } }
/* a shot lights the ground around the muzzle for a moment (much brighter in the dark) */
function muzzleLight(x,y){ if(ANIM.muzzleLight&&animOnScreen(x,y)) G.fx.push({k:'mlight',x,y,t:0.07,max:0.07}); }
function drawMuzzleLight(f){ const dk=!!G.mission.dark, R=dk?46:26, g=ctx.createRadialGradient(f.x,f.y,2,f.x,f.y,R); g.addColorStop(0,`rgba(255,190,90,${dk?0.45:0.18})`); g.addColorStop(1,'rgba(255,190,90,0)');
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g; ctx.fillRect(f.x-R,f.y-R,R*2,R*2); ctx.globalCompositeOperation='source-over'; }
/* where you send your squad: a ripple and four chevrons closing in (red for an attack-move) */
function orderMark(x,y,attack){ if(ANIM.orderMark) G.fx.push({k:'order',x,y,t:0.7,max:0.7,col:attack?'255,90,79':'95,227,176'}); }
function drawOrderMark(f){ const k=1-f.t/f.max; ctx.strokeStyle=`rgba(${f.col},${1-k})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(f.x,f.y,6+k*22,3+k*11,0,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle=`rgba(${f.col},${1-k*0.6})`; const d=18-k*12; for(let i=0;i<4;i++){ const a=i*Math.PI/2; ctx.fillRect(Math.round(f.x+Math.cos(a)*d)-2,Math.round(f.y+Math.sin(a)*d*0.5)-1,4,3); } }

/* ---- structures ---- */
function drawRadar(b,now){ if(!b.built) return;
  if(b.type==='hq'){ const a=now/1000*1.6, cx=b.x-2, cy=b.y-4, ex=cx+Math.cos(a)*17, ey=cy+Math.sin(a)*11;   /* the radar dish sweeps round */
    ctx.strokeStyle='#2c323e'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.fillStyle='#5fe3b0'; ctx.fillRect(Math.round(ex)-1,Math.round(ey)-1,3,3); ctx.fillStyle='#0a0b10'; ctx.fillRect(Math.round(cx)-2,Math.round(cy)-2,5,5); }
  else if(b.type==='relay'){ for(let w=0;w<2;w++){ const s=(now/1000*0.7+w*0.5+b.id*0.13)%1; ctx.strokeStyle=`rgba(255,179,71,${(1-s)*0.8})`; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(b.x,b.y-18,4+s*26,2+s*13,0,0,Math.PI*2); ctx.stroke(); } } }
function sentryUnfolds(b){ if(b.type==='sentry'&&ANIM.unfold>0) b.unfoldT=ANIM.unfold; }

/* ---- surroundings ---- */
function devilTick(dt){ if(!(ANIM.devilEvery>0)) return; G.devilT=(G.devilT??rand(10,ANIM.devilEvery))-dt; if(G.devilT>0) return; G.devilT=ANIM.devilEvery*rand(0.6,1.4);
  for(let i=0;i<20;i++){ const x=G.cam.x+rand(40,ui.vw*0.6), y=G.cam.y+rand(80,ui.vh-(ui.hudH||0)-40), k=Math.floor(y/TILE)*G.map.w+Math.floor(x/TILE), c=G.map.tiles[k];
    if((c!=='.'&&c!==',')||!animSeen(x,y)||(G.creep&&G.creep[k]>0.1)) continue; G.fx.push({k:'devil',x,y,vx:rand(18,30),vy:0,t:7,max:7,seed:Math.random()*99,rest:true}); return; } }
function drawDevil(f){ const tt=f.max-f.t, fade=Math.min(1,tt,f.t), x0=f.x+tt*f.vx, y0=f.y-Math.sin(tt*0.9+f.seed)*10;
  for(let i=0;i<28;i++){ const h=i/28, a=tt*9+i*0.9, r=3+h*14; ctx.fillStyle=`rgba(${i%3?'138,127,112':'179,165,143'},${(0.7-h*0.45)*fade})`; ctx.fillRect(Math.round(x0+Math.cos(a)*r+Math.sin(tt*3)*h*6),Math.round(y0-h*44+Math.sin(a)*r*0.3),2,2); } }
function drawGlints(now,vx0,vy0,vx1,vy1){ if(!ANIM.glints) return; const m=G.map, W=m.w, x0=Math.max(0,Math.floor(vx0/TILE)), y0=Math.max(0,Math.floor(vy0/TILE)), x1=Math.min(W-1,Math.ceil(vx1/TILE)), y1=Math.min(m.h-1,Math.ceil(vy1/TILE));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const k=y*W+x, c=m.tiles[k]; if((c!=='*'&&c!=='~')||!G.vis[k]) continue; const n=creepNoise(x,y), s=(now/1000*0.5+n*7)%1; if(s>0.1) continue;
    const g=1-Math.abs(s-0.05)/0.05, px=x*TILE+4+n*(TILE-8), py=y*TILE+4+creepNoise(y,x)*(TILE-8); ctx.fillStyle=`rgba(240,250,255,${g})`; ctx.fillRect(Math.round(px)-1,Math.round(py),3,1); ctx.fillRect(Math.round(px),Math.round(py)-1,1,3);
    if(g>0.6){ ctx.fillRect(Math.round(px)-3,Math.round(py),1,1); ctx.fillRect(Math.round(px)+3,Math.round(py),1,1); } } }
/* debris in low gravity: it rises, hangs, and comes down slowly; then lies a while */
function debrisBurst(x,y,n,cols,sp=110){ if(!animOnScreen(x,y)) return; for(let i=0;i<n;i++){ const a=-rand(0.15,Math.PI-0.15);
    G.fx.push({k:'debris',x:x+rand(-6,6),y:y-2,vx:Math.cos(a)*rand(0.3,1)*sp,vy:Math.sin(a)*rand(0.5,1)*sp,gy:y+rand(-6,10),t:rand(2.6,4),max:4,col:pick(cols),rest:false}); }
  G.fx.push({k:'dust',x,y:y-4,vx:0,vy:-4,t:3.4,max:3.4,r0:6,r1:26,col:'#8a8a90'}); }
function debrisTick(f,dt){ if(f.rest) return; f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=ANIM.lowGravity*dt; f.vx*=0.995; if(f.y>=f.gy&&f.vy>0){ f.y=f.gy; f.rest=true; } }
function drawDebris(f){ ctx.globalAlpha=Math.min(1,f.t/0.8); ctx.fillStyle=f.col; ctx.fillRect(Math.round(f.x),Math.round(f.y),2,2); ctx.globalAlpha=1; }

/* ---- third round ---- */
/* idle: a soldier who has nothing to do looks round now and then and checks his weapon; the Swarm sniffs the air */
function idleTick(u,dt){ if(!ANIM.idle) return; const idle=!u.moving&&!(u.target&&!u.target.dead)&&!u.downed&&!u.carry;
  if(!idle){ u.idleT=0; if(u.lookT>0){ u.lookT=0; } return; }
  u.idleT=(u.idleT||0)+dt; if(u.lookT>0){ u.lookT-=dt; if(u.lookT<=0) u.face=u.lookFace||u.face; return; }
  if(u.idleT>(u.nextLook||(u.nextLook=rand(3,7)))){ u.idleT=0; u.nextLook=rand(4,9); if(Math.random()<0.6){ u.lookFace=u.face; u.face=-u.face; u.lookT=rand(0.8,1.6); } else u.gleamT=0.18; } }
function drawIdle(u,w,h,now){ if(!ANIM.idle) return;
  if(u.faction==='corps'){ if(u.gleamT>0){ u.gleamT-=1/60; ctx.fillStyle='#ffe2a8'; ctx.fillRect(Math.round(u.x+u.face*8),Math.round(u.y-11),2,1); } return; }
  if(u.moving||u.target||u.hidden||!isVisible(u)) return; const ph=(now/1000+u.id*0.7)%3.5; if(ph>1.1) return;   /* sniffing: little puffs at the head */
  for(let i=0;i<2;i++){ const s=(ph*2+i*0.5)%1; ctx.fillStyle=`rgba(159,211,138,${0.6-s*0.6})`; ctx.fillRect(Math.round(u.x+u.face*(w*0.4+s*6)),Math.round(u.y-h*0.45-s*4),2,2); } }
/* grenade: it spins, and its shadow on the ground shows where it will land */
function drawGrenade(s,t){ const gx=s.sx+(s.tx-s.sx)*t, gy=s.sy+(s.ty-s.sy)*t, x=gx, y=gy-Math.sin(t*Math.PI)*46, sh=1-Math.sin(t*Math.PI)*0.5;
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(gx,gy+6,5*sh,2*sh,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(Math.round(x),Math.round(y)); ctx.rotate(s.t*14); ctx.fillStyle='#0a0b10'; ctx.fillRect(-3,-3,6,6); ctx.fillStyle='#5b6b3a'; ctx.fillRect(-2,-2,4,4); ctx.restore();
  if(Math.floor(s.t*12)%2){ ctx.fillStyle='#ff5a4f'; ctx.fillRect(Math.round(x)-1,Math.round(y)-5,2,2); } }
/* stray rounds: now and then a shot goes past and kicks up dust, or chips the rock (only to look at: every shot still hits) */
function strayRound(mx,my,t){ if(!(ANIM.strays>0)||Math.random()>ANIM.strays||!animOnScreen(t.x,t.y)) return; const a=Math.atan2(t.y-my,t.x-mx)+rand(-0.25,0.25), d=Math.hypot(t.x-mx,t.y-my)+rand(14,40);
  const x=mx+Math.cos(a)*d, y=my+Math.sin(a)*d, tx=Math.floor(x/TILE), ty=Math.floor(y/TILE), rock=tx>=0&&ty>=0&&tx<G.map.w&&ty<G.map.h&&!G.map.walk[ty*G.map.w+tx];
  G.fx.push({k:'tracer',x1:mx,y1:my,x2:x,y2:y,t:0.05,max:0.05});
  for(let i=0;i<(rock?5:3);i++) G.fx.push({k:'spark',x,y,vx:-Math.cos(a)*rand(20,60)+rand(-25,25),vy:rand(-60,-10),t:0.3,max:0.3,col:rock?pick(['#8a8a90','#ffe2a8','#5a5d66']):pick(['#8a7a6a','#b3a58f'])});
  G.fx.push({k:'dust',x,y,vx:-Math.cos(a)*8,vy:-6,t:0.9,max:0.9,r0:1,r1:6,col:rock?'#8a8a90':'#8a7f70'}); }
/* claws on metal: scratches stay on a structure the Swarm tears at (until it is repaired), and sparks fly */
function clawed(b,u){ if(b.kind!=='building'||b.faction!=='corps'||!b.built||b.def.ground) return; const S=b.size*TILE/2;
  b.scratch=b.scratch||[]; if(b.scratch.length<7) b.scratch.push({x:rand(-S*0.6,S*0.4),y:rand(-S*0.6,S*0.4),l:rand(5,9),s:Math.random()<0.5?1:-1});
  if(animOnScreen(b.x,b.y)) for(let i=0;i<3;i++) G.fx.push({k:'spark',x:b.x+(u.x>b.x?S*0.6:-S*0.6),y:b.y+rand(-S*0.4,S*0.3),vx:rand(-50,50),vy:rand(-70,-20),t:0.25,max:0.25,col:pick(['#ffe2a8','#ffffff'])}); }
function drawScratches(b){ if(!b.scratch||!b.scratch.length) return; if(b.hp>=b.maxHp){ b.scratch=null; return; }
  ctx.strokeStyle='rgba(20,22,28,.9)'; ctx.lineWidth=1; ctx.beginPath();
  for(const c of b.scratch) for(let i=0;i<3;i++){ const x=b.x+c.x+i*2, y=b.y+c.y; ctx.moveTo(x,y); ctx.lineTo(x+c.s*c.l*0.6,y+c.l); } ctx.stroke(); }
/* a Relay Tower that is destroyed topples over and breaks */
function toppleFx(b){ if(!animOnScreen(b.x,b.y,120)) return; G.fx.push({k:'topple',x:b.x,y:b.y+b.size*TILE/2-2,t:1.5,max:1.5,art:b.def.art||b.type,dir:Math.random()<0.5?1:-1,w:b.size*TILE}); }
function toppleTick(f){ if(!f.down&&f.t<f.max-1.1){ f.down=true; const L=f.w*0.9; debrisBurst(f.x+f.dir*L*0.7,f.y-4,14,['#8a8a90','#a3b4c6','#5d6f83'],90); SFX.play('boom',f.x,f.y); } }
function drawTopple(f){ const art=ARTC[f.art]; if(!art) return; const tt=f.max-f.t, k=Math.min(1,Math.max(0,(tt-0.15)/0.95)), a=f.dir*k*k*Math.PI/2*0.92, w=f.w, h=f.w;
  ctx.globalAlpha=tt>1.1?Math.max(0,1-(tt-1.1)/0.4):1; ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(a); ctx.drawImage(art,-w/2,-h,w,h); ctx.restore(); ctx.globalAlpha=1; }
/* a generator: electric arcs while it runs; its lights flicker and die when it goes down */
function drawGenerator(b,now){ if(!b.built) return;
  if(b.powered&&Math.floor(now/140+b.id)%4===0){ ctx.strokeStyle='rgba(95,227,176,.9)'; ctx.lineWidth=1; ctx.beginPath(); let x=b.x-12, y=b.y-2+((now/140|0)%3)*3; ctx.moveTo(x,y);
    for(let s=0;s<6;s++){ x+=4; y+=(animRnd(s+Math.floor(now/140)+b.id)-0.5)*7; ctx.lineTo(x,y); } ctx.stroke(); }
  if(b.flickT>0){ b.flickT-=1/60; if(Math.random()<0.5){ const R=b.def.light*TILE*0.6, g=ctx.createRadialGradient(b.x,b.y,6,b.x,b.y,R); g.addColorStop(0,`rgba(255,214,120,${0.25*Math.random()})`); g.addColorStop(1,'rgba(255,180,80,0)');
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g; ctx.fillRect(b.x-R,b.y-R,R*2,R*2); ctx.globalCompositeOperation='source-over'; } } }
/* the drag trail of a fallen soldier the Swarm hauls away: two grooves in the dust, a little blood, it stays a long while */
function dragTrail(b){ if(!b.lastDrag) b.lastDrag={x:b.x,y:b.y}; if(Math.hypot(b.x-b.lastDrag.x,b.y-b.lastDrag.y)<5) return;
  const D=G.drags||(G.drags=[]); D.push({x1:b.lastDrag.x,y1:b.lastDrag.y,x2:b.x,y2:b.y,t:ANIM.dragLife,blood:Math.random()<0.25}); b.lastDrag={x:b.x,y:b.y}; if(D.length>160) D.shift(); }
function drawDrags(){ for(const d of G.drags||[]){ if(!animOnScreen(d.x1,d.y1)) continue; const a=Math.min(1,d.t/4)*0.5; ctx.strokeStyle=`rgba(14,15,18,${a})`; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(d.x1,d.y1); ctx.lineTo(d.x2,d.y2); ctx.moveTo(d.x1,d.y1+3); ctx.lineTo(d.x2,d.y2+3); ctx.stroke(); if(d.blood){ ctx.fillStyle=`rgba(120,24,24,${a*1.4})`; ctx.fillRect(Math.round(d.x2),Math.round(d.y2+1),2,2); } } }
/* a shaft about to spit a wave: dust pours out and claws show at the rim */
function drawShaftSpit(f){ if(!animSeen(f.x,f.y)) return; const k=1-f.t/f.max;
  for(let i=0;i<8;i++){ const s=(k*2.4+animRnd(f.seed+i))%1; ctx.fillStyle=`rgba(138,122,106,${0.6-s*0.6})`; ctx.beginPath(); ctx.arc(f.x-10+animRnd(f.seed+i*3)*20,f.y+2+s*16,1+s*4,0,Math.PI*2); ctx.fill(); }
  if(k>0.5){ ctx.fillStyle='#0a0b10'; for(const [dx,dy] of [[-7,2],[-6,4],[6,2],[5,4],[-2,1],[2,1]]) ctx.fillRect(Math.round(f.x+dx*(1+k*0.3)),Math.round(f.y+dy),2,2); } }

/* ---- per frame ---- */
function updateAnims(dt){
  for(const p of G.prints||[]) p.t-=dt; if(G.prints&&G.prints.length&&G.prints[0].t<=0) G.prints=G.prints.filter(p=>p.t>0);
  for(const u of G.ents){ if(u.dead) continue;
    if(u.kind==='unit'){ if(u.moving&&!u.downed) stepAnims(u); if(u.acidT>0) u.acidT-=dt; if(u.glintT>0) u.glintT-=dt; if(u.chargeT>0) u.chargeT-=dt; if(u.fallT>0) u.fallT-=dt;
      if(u.emergeT>0) emergeTick(u,dt); if(u.faction==='corps'){ headingTick(u); if(u.def.bio) idleTick(u,dt); } }
    else if(u.kind==='building'){ if(u.recoil>0) u.recoil-=dt; if(u.weldT>0) u.weldT-=dt; if(u.unfoldT>0) u.unfoldT-=dt; damageSmoke(u,dt); } }
  for(const d of G.drags||[]) d.t-=dt; if(G.drags&&G.drags.length&&G.drags[0].t<=0) G.drags=G.drags.filter(d=>d.t>0);
  for(const f of G.fx){ if(f.k==='topple') toppleTick(f); if(f.k==='casing'||f.k==='helmet') casingTick(f,dt); else if(f.k==='meteor') meteorFx(f); else if(f.k==='debris') debrisTick(f,dt); }
  if(G.hurtAcc) G.hurtAcc*=Math.exp(-dt*1.6);
  meteorTick(dt); devilTick(dt); updateFires(dt); }
