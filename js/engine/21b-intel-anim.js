'use strict';
/* ---------- 21b. Intel: a little moving picture for every entry ----------
   Every picture in Intel (the list on the left and the big card on the right) with a data-anim key gets a canvas that plays a short
   looping scene: a Trooper who fires a burst now and then, a hive that beats on its creep, a Sentry Gun that turns and fires…
   The scenes are drawn from the game's own sprites (SPR) and art (ARTC) plus a few effects, in a 48×48 box, and they hold no
   state: everything follows from the clock, so a scene looks the same whenever you open it. One animation frame loop draws every
   canvas while the Intel screen is open. With "reduce motion" on in the system, the pictures stand still.
   A key is a unit or building type, an INTEL_EXTRA id, crew_<type> (the Osprey crew), vial:<colour>, art:<ART key> (a relic) or
   one of the extra scene names below; an unknown key shows its picture bobbing gently. */
const IA_BOX=48, IA_GROUND=42;
const iaReduce=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
/* a number in [0,1) that is always the same for the same arguments (particles without state) */
function iaHash(a,b){ const x=Math.sin(a*127.1+b*311.7)*43758.5453; return x-Math.floor(x); }
const iaCyc=(t,p)=>({ k:Math.floor(t/p), p:(t%p)/p, s:t%p });   /* which round of a loop, and how far into it */
/* draw a sprite standing on (x, y): its feet at y, centred on x */
function iaSprite(c,key,x,y,sc,face,o={}){ const sp=SPR[key]; if(!sp) return null; const w=sp.w*sc, h=sp.h*sc;
  if(o.alpha!=null) c.globalAlpha=o.alpha;
  c.save(); c.translate(Math.round(x),Math.round(y)); if(o.rot) c.rotate(o.rot); if(o.sx||o.sy) c.scale(o.sx||1,o.sy||1);
  const oy=o.mid?-h/2:-h; c.drawImage(face>0?sp.img:sp.flip,-w/2,oy,w,h); if(o.flash){ c.globalAlpha=o.flash; c.drawImage(face>0?sp.flash:sp.flashFlip,-w/2,oy,w,h); }
  c.restore(); c.globalAlpha=1; return { w, h, top:y-h }; }
function iaArt(c,key,x,y,fit,o={}){ const a=ARTC[key]; if(!a) return null; const sc=o.sc||Math.min(fit/a.width,fit/a.height), w=a.width*sc, h=a.height*sc;
  c.save(); c.translate(Math.round(x),Math.round(y)); if(o.sx||o.sy) c.scale(o.sx||1,o.sy||1); if(o.alpha!=null) c.globalAlpha=o.alpha; c.drawImage(a,-w/2,-h,w,h); c.restore(); return { w, h, top:y-h }; }
function iaShadow(c,x,y,rx){ c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x,y,rx,rx*0.4,0,0,Math.PI*2); c.fill(); }
function iaGlow(c,x,y,r,col){ const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.globalCompositeOperation='lighter'; c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); c.globalCompositeOperation='source-over'; }
function iaDot(c,x,y,col,s=1){ c.fillStyle=col; c.fillRect(Math.round(x),Math.round(y),s,s); }
function iaRing(c,x,y,r,col,a){ c.globalAlpha=Math.max(0,a); c.strokeStyle=col; c.lineWidth=1; c.beginPath(); c.ellipse(x,y,r,r*0.45,0,0,Math.PI*2); c.stroke(); c.globalAlpha=1; }
function iaFloor(c,col){ c.fillStyle=col||'#171920'; c.fillRect(0,IA_GROUND,IA_BOX,IA_BOX-IA_GROUND); for(let i=0;i<9;i++) iaDot(c,iaHash(i,1)*IA_BOX,IA_GROUND+1+iaHash(i,2)*5,'#262934'); }
function iaUnitScale(key,max=26){ const sp=SPR[key]; return sp?Math.min(2,max/sp.h,40/sp.w):2; }
/* a soldier who fires now and then: bursts of `shots` rounds every `every` seconds (a Gunner fires longer, a Pyro a flame) */
function iaShooter(c,t,key,o={}){ const sc=iaUnitScale(key), x=17, y=IA_GROUND, cy=iaCyc(t,o.every||2.4), look=iaCyc(t,5.3);
  const face=look.p>0.82&&look.p<0.9?-1:1, firing=face>0&&cy.s<(o.burst||0.45);
  iaShadow(c,x,y,7); const s=iaSprite(c,key,x,y,sc,face,{ sy:1+(firing?0:0.02*Math.sin(t*2.2)) }); if(!s) return;
  const mx=x+s.w*0.48, my=s.top+s.h*0.5;
  if(o.flame){ const fx=x+s.w*0.4; if(firing) for(let i=0;i<16;i++){ const q=((t*3+iaHash(i,cy.k))%1), d=q*16, sp=(iaHash(i,7)-0.5)*q*10;
      c.globalAlpha=1-q; iaDot(c,fx+d,my+sp,q<0.3?'#fff2a8':q<0.6?'#ffb347':'#ff5a2a',q<0.5?2:3); } c.globalAlpha=1; if(firing) iaGlow(c,fx+8,my,12,'rgba(255,150,60,.35)'); return; }
  if(firing){ const step=o.step||0.13, n=Math.floor(cy.s/step), ph=(cy.s%step)/step;
    if(ph<0.45){ iaGlow(c,mx+1,my,6,'rgba(255,220,120,.8)'); iaDot(c,mx,my-1,'#fff6c8',2); c.strokeStyle='rgba(255,230,150,.7)'; c.beginPath(); c.moveTo(mx+3,my); c.lineTo(IA_BOX,my+(iaHash(n,cy.k)-0.5)*3); c.stroke(); }
    for(let j=0;j<=n;j++){ const a=(cy.s-j*step)/0.5; if(a>1) continue; iaDot(c,mx-6-a*5,my-2-a*9+a*a*14,'#ffd23f'); } } }
function iaMedic(c,t){ const x=13, y=IA_GROUND, pat=33; iaShadow(c,pat,y,9); iaSprite(c,'trooper',pat,y-4,1.3,-1,{ rot:-Math.PI/2, mid:true, flash:0.25+0.25*Math.sin(t*3) });
  iaShadow(c,x,y,7); const s=iaSprite(c,'medic',x,y,iaUnitScale('medic'),1,{ sy:1+0.02*Math.sin(t*2) });
  const beat=iaCyc(t,1.2); c.strokeStyle='rgba(125,255,191,'+(0.5+0.3*Math.sin(t*9))+')'; c.beginPath(); c.moveTo(x+6,s.top+s.h*0.5); c.lineTo(pat-2,y-6); c.stroke();
  for(let i=0;i<3;i++){ const q=(t*0.8+i/3)%1; c.globalAlpha=1-q; c.fillStyle='#7dffbf'; c.font='7px monospace'; c.fillText('+',pat-3+i*3,y-8-q*14); } c.globalAlpha=1;
  c.strokeStyle='#5fe3b0'; c.beginPath(); for(let i=0;i<14;i++){ const xx=26+i, b=beat.p*14|0, yy=8+(Math.abs(i-b)<1?-4:0); i?c.lineTo(xx,yy):c.moveTo(xx,yy); } c.stroke(); }
function iaEngineer(c,t){ const x=14, y=IA_GROUND; iaShadow(c,x,y,7); iaSprite(c,'engineer',x,y,iaUnitScale('engineer'),1,{ sy:1-0.04*Math.abs(Math.sin(t*3)) });
  iaArt(c,'sentry',33,y,16); const cy=iaCyc(t,0.18); for(let i=0;i<5;i++){ const q=(cy.p+i/5)%1, a=iaHash(i,cy.k)*Math.PI*2; iaDot(c,26+Math.cos(a)*q*7,y-10+Math.sin(a)*q*5-q*3,q<0.5?'#fff6c8':'#ffb347'); }
  iaGlow(c,26,y-10,7,'rgba(160,210,255,'+(0.3+0.3*Math.sin(t*30))+')'); }
/* a creature that scurries to and fro; lunge: now and then a claw strike */
function iaRunner(c,t,key,o={}){ const sc=iaUnitScale(key,o.max||22), per=o.per||3.2, ph=(t%per)/per, x=24+Math.sin(ph*Math.PI*2)*(o.range||12), face=Math.cos(ph*Math.PI*2)>=0?1:-1, y=IA_GROUND;
  const bob=Math.floor(t*10)%2; iaShadow(c,x,y,6); iaSprite(c,key,x,y-bob,sc,face);
  if(o.lunge){ const l=iaCyc(t,2.1); if(l.s<0.25){ c.strokeStyle='rgba(255,255,255,'+(1-l.s*4)+')'; c.beginPath(); c.arc(x+face*9,y-8,5,-1.2,1.2); c.stroke(); } } }
function iaSpitter(c,t){ const x=13, y=IA_GROUND, sc=iaUnitScale('spitter'), cy=iaCyc(t,2.6); iaShadow(c,x,y,7); const s=iaSprite(c,'spitter',x,y,sc,1,{ sy:1+(cy.s<0.5?cy.s*0.08:0) });
  const mx=x+s.w*0.4, my=s.top+s.h*0.35; if(cy.s<0.5) iaGlow(c,mx,my,3+cy.s*10,'rgba(150,255,80,.6)');
  else if(cy.s<1.3){ const q=(cy.s-0.5)/0.8, bx=mx+q*(40-mx), by=my-Math.sin(q*Math.PI)*14+q*(y-4-my); c.fillStyle='#9dff4a'; c.beginPath(); c.arc(bx,by,2,0,Math.PI*2); c.fill(); iaGlow(c,bx,by,5,'rgba(150,255,80,.5)'); }
  else if(cy.s<2.2){ const q=(cy.s-1.3)/0.9; c.globalAlpha=1-q; c.fillStyle='rgba(120,220,40,.6)'; c.beginPath(); c.ellipse(40,y-2,3+q*3,1.5+q,0,0,Math.PI*2); c.fill(); c.globalAlpha=1; } }
function iaBrute(c,t){ const cy=iaCyc(t,1.6), st=cy.s<0.12, x=24+(st?(iaHash(cy.k,1)-0.5)*2:0), y=IA_GROUND; iaShadow(c,x,y,12); iaSprite(c,'brute',x,y,iaUnitScale('brute',36),1,{ sy:st?0.96:1 });
  if(cy.s<0.6){ iaRing(c,24,y,4+cy.s*30,'#d3c3a6',0.7-cy.s); for(let i=0;i<6;i++){ const a=iaHash(i,cy.k)*Math.PI; c.globalAlpha=0.6-cy.s; iaDot(c,24+Math.cos(a)*(6+cy.s*20)*(i%2?1:-1),y-cy.s*8*iaHash(i,3),'#8a7d68',2); } c.globalAlpha=1; } }
function iaPulse(c,t,key,o={}){ const y=IA_GROUND, x=24, b=1+(o.amp||0.05)*Math.sin(t*(o.speed||3)); iaShadow(c,x,y,o.shadow||8);
  if(SPR[key]) iaSprite(c,key,x,y,iaUnitScale(key,o.max||26),1,{ sx:2-b, sy:b }); else iaArt(c,key,x,y,o.fit||36,{ sx:2-b, sy:b }); }
function iaBroodMother(c,t){ const cy=iaCyc(t,4), b=1+0.03*Math.sin(t*2); iaShadow(c,24,IA_GROUND,16); iaSprite(c,'broodmother',24,IA_GROUND,iaUnitScale('broodmother',40),1,{ sy:b, sx:2-b });
  if(cy.s<1.2) for(let i=0;i<3;i++){ const r=4+(cy.s-i*0.2)*30; if(r>4) iaRing(c,24,IA_GROUND-20,r,'#c38bff',0.8-(cy.s-i*0.2)); } }
function iaHive(c,t){ const y=IA_GROUND, x=24, beat=Math.max(0,Math.sin(t*3.2))**6, b=1+0.06*beat;
  c.fillStyle='rgba(110,60,140,.55)'; c.beginPath(); c.ellipse(x,y,22,6,0,0,Math.PI*2); c.fill();
  c.strokeStyle='rgba(195,139,255,.55)'; for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+0.3, L=14+6*Math.sin(t*0.8+i); c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+Math.cos(a)*L*0.5,y+Math.sin(a)*3+2,x+Math.cos(a)*L,y+Math.sin(a)*4); c.stroke(); }
  iaGlow(c,x,y-12,14+beat*4,'rgba(166,255,74,'+(0.12+beat*0.2)+')'); iaArt(c,'hive',x,y+2,34,{ sx:2-b, sy:b });
  for(let i=0;i<4;i++){ const q=(t*0.4+i/4)%1; c.globalAlpha=1-q; iaDot(c,x-12+iaHash(i,3)*24,y-6-q*30,'#c38bff'); } c.globalAlpha=1; }
function iaEgg(c,t){ const cy=iaCyc(t,3.5), open=cy.p<0.5?0:Math.sin((cy.p-0.5)*2*Math.PI); iaShadow(c,24,IA_GROUND,8);
  if(open>0) iaGlow(c,24,IA_GROUND-10,8+open*6,'rgba(166,255,74,'+(0.3+open*0.4)+')'); iaArt(c,'egg',24,IA_GROUND,26,{ sx:1+open*0.15, sy:1-open*0.1 });
  if(open>0.5) for(let i=0;i<3;i++){ const q=(t*1.5+i/3)%1; iaDot(c,20+i*4,IA_GROUND-14+q*12,'rgba(166,255,74,.8)'); } }
function iaHeart(c,t){ drawMatronSeed(c,24,IA_GROUND,t); }   /* the Matron's Seed (31-rogue.js) */
function iaGrazer(c,t){ const per=7, ph=(t%per)/per, walk=ph<0.35, x=walk?12+ph/0.35*20:32, y=IA_GROUND, graze=!walk&&Math.sin(t*4)>0;
  iaShadow(c,x,y,8); iaSprite(c,'grazer',x,y-(walk?Math.floor(t*6)%2:0),iaUnitScale('grazer',22),1,{ sy:graze?0.94:1 }); }
/* the Osprey crew in a wedge; now and then the last one breaks off in a cloud of smoke */
function iaRaiders(c,t){ const cy=iaCyc(t,4.5), x0=31, y=IA_GROUND-1, slots=[[0,0],[-9,-4],[-9,4]];   /* a wedge marching on the spot, dust behind */
  for(let i=0;i<5;i++){ const q=(t*1.2+i/5)%1; c.globalAlpha=0.35*(1-q); c.fillStyle='#8a7d68'; c.beginPath(); c.arc(x0-14-q*12,y+2-q*3,1+q*2,0,Math.PI*2); c.fill(); } c.globalAlpha=1;
  slots.forEach(([dx,dy],i)=>{ const x=x0+dx, yy=y+dy, b=Math.floor(t*8+i)%2; const gone=i===2&&cy.s>2.2&&cy.s<4.2;
    if(gone){ if(cy.s<3.2){ const q=cy.s-2.2; for(let j=0;j<6;j++){ c.globalAlpha=0.7*(1-q); c.fillStyle='#8b8f99'; c.beginPath(); c.arc(x+(iaHash(j,cy.k)-0.5)*8,yy-6-q*6*iaHash(j,2),3+q*4,0,Math.PI*2); c.fill(); } c.globalAlpha=1; } return; }
    iaShadow(c,x,yy,5); iaSprite(c,'crew_'+(i===0?'pyro':'trooper'),x,yy-b,1.5,1); }); }
function iaSentry(c,t){ const x=24, y=IA_GROUND, cy=iaCyc(t,1.9); iaShadow(c,x,y,9); iaArt(c,'sentry',x,y,26);
  if(cy.s<0.5){ const n=Math.floor(cy.s/0.12), ph=(cy.s%0.12)/0.12; if(ph<0.5){ iaGlow(c,x+12,y-14,6,'rgba(255,220,120,.8)'); c.strokeStyle='rgba(255,230,150,.7)'; c.beginPath(); c.moveTo(x+13,y-14); c.lineTo(IA_BOX,y-14+(iaHash(n,cy.k)-0.5)*4); c.stroke(); } }
  c.globalAlpha=0.5+0.3*Math.sin(t*2); iaDot(c,x-1,y-20,'#ff5a4f',2); c.globalAlpha=1; }
function iaRelay(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,10); const s=iaArt(c,'relay',x,y,34); const top=s?s.top+3:10;
  for(let i=0;i<3;i++){ const q=(t*0.6+i/3)%1; iaRing(c,x,top,2+q*18,'#7fdfff',0.8-q); } }
function iaHq(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,16); const s=iaArt(c,'hq',x,y,38); const dx=x+8, dy=(s?s.top:6)+4, a=t*1.6;
  c.strokeStyle='#cfd8e0'; c.beginPath(); c.moveTo(dx-Math.cos(a)*4,dy); c.lineTo(dx+Math.cos(a)*4,dy-2); c.stroke(); iaDot(c,dx+Math.cos(a)*4-0.5,dy-2.5,'#5fe3b0'); }
function iaGenerator(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,10); iaArt(c,'generator',x,y,30); const cy=iaCyc(t,0.22);
  iaGlow(c,x,y-12,16,'rgba(255,230,140,'+(0.15+0.1*Math.sin(t*20))+')');
  if(iaHash(cy.k,1)<0.6){ c.strokeStyle='#bfefff'; c.beginPath(); let px=x-8, py=y-18; c.moveTo(px,py); for(let i=0;i<5;i++){ px+=4; py+=(iaHash(cy.k,i+2)-0.5)*6; c.lineTo(px,py); } c.stroke(); } }
function iaCharge(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,7); iaArt(c,'charge',x,y,20); const p=(t%6)/6;
  c.strokeStyle='#ffb347'; c.beginPath(); c.arc(x,y-22,5,-Math.PI/2,-Math.PI/2+(1-p)*Math.PI*2); c.stroke(); if(Math.sin(t*(6+p*20))>0) iaGlow(c,x,y-9,5,'rgba(255,80,60,.9)'); }
function iaUplink(c,t){ const x=24, y=IA_GROUND, p=(t%5)/5; iaArt(c,'uplink',x,y,30); const col=p<0.8?'#ffb347':'#5fe3b0';
  c.strokeStyle='rgba(255,255,255,.15)'; c.beginPath(); c.ellipse(x,y-6,16,7,0,0,Math.PI*2); c.stroke();
  c.strokeStyle=col; c.lineWidth=2; c.beginPath(); c.ellipse(x,y-6,16,7,0,-Math.PI/2,-Math.PI/2+Math.min(1,p/0.8)*Math.PI*2); c.stroke(); c.lineWidth=1;
  if(p>=0.8) iaGlow(c,x,y-10,14,'rgba(95,227,176,.4)'); iaShadow(c,10,y,4); iaSprite(c,'trooper',10,y,1.5,1); }
function iaChargeSite(c,t){ const x=24, y=IA_GROUND; iaArt(c,'chargesite',x,y,22); iaRing(c,x,y-4,6+3*Math.sin(t*3),'#ffb347',0.7); }
function iaLz(c,t){ const x=24, y=IA_GROUND, cy=iaCyc(t,6); iaArt(c,'lz',x,y+4,40);
  if(cy.s<2.2){ const q=cy.s/2.2, h=(1-q)*30, a=ARTC.dropship; if(a){ const w=a.width*0.6, hh=a.height*0.6; c.fillStyle='rgba(0,0,0,'+(0.2+q*0.3)+')'; c.beginPath(); c.ellipse(x,y-4,w*0.4,3,0,0,Math.PI*2); c.fill(); c.drawImage(a,x-w/2,y-10-h-hh/2,w,hh); } }
  else if(cy.s<2.9){ iaRing(c,x,y-4,6+(cy.s-2.2)*30,'#d3c3a6',0.8-(cy.s-2.2)); const a=ARTC.dropship; if(a){ const w=a.width*0.6, hh=a.height*0.6; c.drawImage(a,x-w/2,y-10-hh/2,w,hh); } }
  else if(cy.s<4.2){ const a=ARTC.dropship; if(a){ const w=a.width*0.6, hh=a.height*0.6; c.drawImage(a,x-w/2,y-10-hh/2,w,hh); } iaSprite(c,'trooper',x+10+(cy.s-2.9)*6,y,1.3,1); }
  else if(cy.s<5.6){ const q=(cy.s-4.2)/1.4, a=ARTC.dropship; if(a){ const w=a.width*0.6, hh=a.height*0.6; c.globalAlpha=1-q; c.drawImage(a,x-w/2,y-10-q*30-hh/2,w,hh); c.globalAlpha=1; } } }
function iaBarricade(c,t){ const cy=iaCyc(t,2.2), hit=cy.s<0.15; iaShadow(c,24,IA_GROUND,10); iaArt(c,'barricade',24+(hit?1:0),IA_GROUND,26);
  if(cy.s<0.4) for(let i=0;i<5;i++){ const q=cy.s/0.4, a=-Math.PI*(0.2+iaHash(i,cy.k)*0.6); c.globalAlpha=1-q; iaDot(c,32+Math.cos(a)*q*8,IA_GROUND-12+Math.sin(a)*q*8,'#ffd23f'); } c.globalAlpha=1; }
function iaShaft(c,t){ const x=24, y=IA_GROUND; iaArt(c,'shaft',x,y+2,36); const cy=iaCyc(t,3.4);
  if(cy.s<1.4) for(let i=0;i<7;i++){ const q=cy.s/1.4; c.globalAlpha=0.5*(1-q); c.fillStyle='#8a7d68'; c.beginPath(); c.arc(x+(iaHash(i,cy.k)-0.5)*16,y-8-q*16*iaHash(i,5),2+q*4,0,Math.PI*2); c.fill(); } c.globalAlpha=1;
  if(cy.s>1&&cy.s<2.2){ c.strokeStyle='#1a1d12'; for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(x-6+i*5,y-12); c.lineTo(x-4+i*5,y-17); c.lineTo(x-2+i*5,y-13); c.stroke(); } } }
function iaTerminal(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,8); const s=iaArt(c,'terminal',x,y,26); const top=s?s.top:16;
  c.fillStyle='#5fe3b0'; for(let i=0;i<3;i++){ const on=iaHash(Math.floor(t*4),i)>0.35; if(on) c.fillRect(x-5,top+5+i*3,4+iaHash(Math.floor(t*4),i+5)*7|0,1); }
  iaGlow(c,x,top+8,10,'rgba(95,227,176,'+(0.15+0.1*Math.sin(t*6))+')'); }
function iaTent(c,t){ const x=24, y=IA_GROUND; iaShadow(c,x,y,14); const s=iaArt(c,'medtent',x,y,36); iaGlow(c,x,(s?s.top:10)+12,10+2*Math.sin(t*1.5),'rgba(255,90,80,'+(0.25+0.15*Math.sin(t*1.5))+')'); }
function iaWreck(c,t){ const x=24, y=IA_GROUND; iaArt(c,'wreck',x,y,40); iaGlow(c,x+4,y-10,8+3*Math.sin(t*9),'rgba(255,140,40,.4)');
  for(let i=0;i<6;i++){ const q=(t*0.35+i/6)%1; c.globalAlpha=0.5*(1-q); c.fillStyle='#4a4d55'; c.beginPath(); c.arc(x+4+Math.sin(q*4+i)*4,y-12-q*28,2+q*5,0,Math.PI*2); c.fill(); } c.globalAlpha=1; }
function iaRubble(c,t){ const cy=iaCyc(t,3.8); iaArt(c,'rubble',24,IA_GROUND,26); if(cy.s<1) for(let i=0;i<3;i++){ const q=cy.s; iaDot(c,18+i*6,4+q*q*34,'#6b6458',2); }
  if(cy.s>0.9&&cy.s<2) { c.globalAlpha=0.5*(2-cy.s); c.fillStyle='#8a7d68'; c.beginPath(); c.ellipse(24,IA_GROUND-3,6+(cy.s-0.9)*10,3,0,0,Math.PI*2); c.fill(); c.globalAlpha=1; } }
function iaDoor(c,t){ const x=24, y=IA_GROUND; iaArt(c,'door',x,y,28); if(Math.sin(t*3)>0.3) iaGlow(c,x+6,y-24,4,'rgba(255,180,70,.9)'); }
function iaMembrane(c,t){ const b=1+0.04*Math.sin(t*2.4); iaArt(c,'membrane',24,IA_GROUND,30,{ sx:2-b, sy:b }); iaGlow(c,24,IA_GROUND-12,10,'rgba(195,139,255,'+(0.12+0.08*Math.sin(t*2.4))+')'); }
function iaChoir(c,t){ iaArt(c,'choirpod',24,IA_GROUND,28,{ sy:1+0.05*Math.sin(t*4) }); for(let i=0;i<3;i++){ const q=(t*0.5+i/3)%1; iaRing(c,24,IA_GROUND-14,3+q*20,'#c38bff',0.8-q); } }
function iaCase(c,t){ const x=24, y=IA_GROUND-2+Math.sin(t*2.2)*1.5; iaShadow(c,24,IA_GROUND,9);
  c.fillStyle='#0a0b10'; c.fillRect(x-10,y-13,21,15); c.fillStyle='#3a6f86'; c.fillRect(x-9,y-12,19,13); c.fillStyle='#7fdfff'; c.fillRect(x-1,y-11,3,11); c.fillRect(x-6,y-8,13,4);
  const g=(t%2.5)/2.5; if(g<0.3){ c.globalAlpha=1-g/0.3; c.fillStyle='#ffffff'; c.fillRect(x-9+g/0.3*19,y-12,2,13); c.globalAlpha=1; } iaGlow(c,x,y-6,12,'rgba(127,223,255,.2)'); }
function iaPad(c,t){ const x=12, y=24; c.fillStyle='#2b2a1a'; c.fillRect(x,y,24,16); for(let i=0;i<6;i++){ c.fillStyle=i%2?'#1a1a12':'#ffd23f'; c.fillRect(x+i*4,y,4,2); c.fillRect(x+i*4,y+14,4,2); }
  c.strokeStyle='#ffd23f'; c.strokeRect(x+0.5,y+0.5,23,15); iaGlow(c,x+12,y+8,10+2*Math.sin(t*2),'rgba(255,210,63,.25)'); }
function iaCrate(c,t){ const y=IA_GROUND-1+Math.sin(t*2)*1; iaShadow(c,24,IA_GROUND,7); iaArt(c,'crate',24,y,20); const g=(t%2.2)/2.2;
  if(g<0.25){ c.globalAlpha=1-g/0.25; c.fillStyle='#fff'; c.fillRect(16+g/0.25*16,y-14,2,13); c.globalAlpha=1; } c.globalAlpha=0.6+0.4*Math.sin(t*2); c.fillStyle='#ffd23f'; c.font='6px monospace'; c.fillText('+',30,y-17-((t*8)%6)); c.globalAlpha=1; }
function iaVial(c,t,col){ const x=24, y=IA_GROUND-4+Math.sin(t*2)*1.5; iaShadow(c,24,IA_GROUND,5); iaGlow(c,x,y-8,12,col==='#c38bff'?'rgba(195,139,255,.35)':'rgba(150,255,90,.35)');
  c.fillStyle='#0a0b10'; c.fillRect(x-4,y-17,9,18); c.fillStyle='#cfd8e0'; c.fillRect(x-3,y-18,7,3); c.fillStyle=col; c.fillRect(x-3,y-12,7,12);
  for(let i=0;i<3;i++){ const q=(t*0.9+i/3)%1; iaDot(c,x-2+i*2,y-1-q*10,'#e8ffd0'); } }
function iaVeil(c,t){ const a=0.45+0.25*Math.sin(t*2); iaGlow(c,24,IA_GROUND-14,18,'rgba(195,139,255,.35)'); iaSprite(c,'crew_trooper',24,IA_GROUND,iaUnitScale('crew_trooper'),1,{ alpha:a });
  c.setLineDash([2,2]); iaRing(c,24,IA_GROUND,9,'#c38bff',0.8); c.setLineDash([]); for(let i=0;i<4;i++){ const q=(t*0.6+i/4)%1; c.globalAlpha=1-q; iaDot(c,18+i*4,IA_GROUND-6-q*22,'#c38bff'); } c.globalAlpha=1; }
function iaTaint(c,t){ iaShooter(c,t,'crew_trooper'); const g=0.3+0.3*Math.sin(t*1.7); c.globalAlpha=g; c.strokeStyle='#8dff4a'; c.beginPath(); c.moveTo(14,26); c.lineTo(16,30); c.lineTo(15,35); c.moveTo(19,27); c.lineTo(18,32); c.stroke(); c.globalAlpha=1; }
function iaBob(c,t,key){ const y=IA_GROUND-1+Math.sin(t*2)*1.5; iaShadow(c,24,IA_GROUND,8); if(SPR[key]) iaSprite(c,key,24,y,iaUnitScale(key),1); else if(ARTC[key]) iaArt(c,key,24,y,30);
  const g=(t%3)/3; if(g<0.2) iaGlow(c,24,y-14,6+g*20,'rgba(255,255,255,'+(0.4-g*2)+')'); }
/* which scene for which key */
const INTEL_SCENES = {
  trooper:(c,t)=>iaShooter(c,t,'trooper'), gunner:(c,t)=>iaShooter(c,t,'gunner',{ every:3.2, burst:1.2, step:0.07 }), pyro:(c,t)=>iaShooter(c,t,'pyro',{ flame:true, every:2.6, burst:0.9 }),
  medic:iaMedic, engineer:iaEngineer, scientist:(c,t)=>iaRunner(c,t,'scientist',{ per:6, range:9 }),
  crawler:(c,t)=>iaRunner(c,t,'crawler',{ per:1.6, range:14 }), drone:(c,t)=>iaRunner(c,t,'drone',{ per:2.6, lunge:true }), grafter:(c,t)=>iaRunner(c,t,'grafter',{ per:1.9, range:13 }),
  spitter:iaSpitter, brute:iaBrute, seedling:(c,t)=>iaPulse(c,t,'seedling',{ amp:0.07, speed:2 }), bloater:(c,t)=>iaPulse(c,t,'bloater',{ amp:0.08, speed:1.6, max:28 }),
  husk:(c,t)=>{ const tw=iaHash(Math.floor(t*6),1)>0.8; iaShadow(c,24,IA_GROUND,8); iaSprite(c,'husk',24+(tw?(iaHash(Math.floor(t*6),2)-0.5)*3:0),IA_GROUND,iaUnitScale('husk'),Math.sin(t*0.7)>0?1:-1); },
  broodmother:iaBroodMother, grazer:iaGrazer,
  hq:iaHq, relay:iaRelay, sentry:iaSentry, barricade:iaBarricade, lz:iaLz, uplink:iaUplink, generator:iaGenerator, chargesite:iaChargeSite, charge:iaCharge,
  medtent:iaTent, terminal:iaTerminal, door:iaDoor, wreck:iaWreck, rubble:iaRubble,
  hive:iaHive, egg:iaEgg, cocoon:(c,t)=>iaPulse(c,t,'cocoon',{ amp:0.1*Math.max(0,Math.sin(t*4.5))**4+0.02, speed:4.5, fit:22 }), membrane:iaMembrane, shaft:iaShaft, choirpod:iaChoir,
  relaypad:iaPad, salvage:iaCrate, stabcase:iaCase, heart:iaHeart, raiders:iaRaiders, veil:iaVeil, taint:iaTaint
};
function intelScene(key){ if(INTEL_SCENES[key]) return INTEL_SCENES[key];
  if(/^crew_/.test(key)){ const ty=key.slice(5); if(ty==='medic'||ty==='engineer') return (c,t)=>iaBob(c,t,key); return (c,t)=>iaShooter(c,t,key,ty==='pyro'?{ flame:true, every:2.6, burst:0.9 }:ty==='gunner'?{ every:3.2, burst:1.2, step:0.07 }:{}); }
  if(/^vial:/.test(key)){ const col=key.slice(5); return (c,t)=>iaVial(c,t,col); }
  if(/^art:/.test(key)){ const a=key.slice(4); return (c,t)=>iaBob(c,t,a); }
  return (c,t)=>iaBob(c,t,key); }
/* put a canvas in every picture with a data-anim key (Intel calls this after it builds its list and card) */
function intelAnimMount(root){ (root||document).querySelectorAll('#s-intel .pic[data-anim]').forEach(p=>{ if(p.querySelector('canvas.ianim')) return;
  const side=p.closest('.ili')?24:p.closest('.intel-detail')?80:46, dpr=Math.min(2,window.devicePixelRatio||1);   /* the size of the picture it replaces (css: .ili .pic img, .icard .pic img) */
  const cv=document.createElement('canvas'); cv.className='ianim'; cv.width=Math.round(side*dpr); cv.height=Math.round(side*dpr); cv.style.width=side+'px'; cv.style.height=side+'px'; cv.setAttribute('aria-hidden','true');
  cv._zoom=p.closest('.ili')?1.6:1.4;   /* the small list pictures zoom in on the subject */
  cv._scene=intelScene(p.dataset.anim); const img=p.querySelector('img'); if(img) img.style.display='none'; p.appendChild(cv); iaDraw(cv,iaReduce()?1.3:performance.now()/1000); });
  if(!iaLoopOn){ iaLoopOn=true; requestAnimationFrame(iaLoop); } }
function iaDraw(cv,t){ const c=cv.getContext('2d'), z=cv._zoom||1, k=cv.width/IA_BOX*z, cx=IA_BOX/2, cy=IA_GROUND-14; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,cv.width,cv.height);
  c.setTransform(k,0,0,k,cv.width/2-cx*k,cv.height/2-cy*k); c.imageSmoothingEnabled=false;   /* zoomed in on the subject, round (24, 28) */
  try{ cv._scene(c,t); }catch(e){ /* a scene that fails stands still, it never breaks the screen */ } c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
let iaLoopOn=false;
function iaLoop(){ const scr=document.getElementById('s-intel'); if(!scr||scr.hidden){ iaLoopOn=false; return; }
  if(!iaReduce()){ const t=performance.now()/1000; scr.querySelectorAll('canvas.ianim').forEach(cv=>iaDraw(cv,t)); }
  requestAnimationFrame(iaLoop); }
