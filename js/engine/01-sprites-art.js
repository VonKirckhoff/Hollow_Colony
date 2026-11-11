'use strict';
/* ---------- 2a. sprites & art ---------- */
const SPR = {};
function mirror(src){ const c=document.createElement('canvas'); c.width=src.width; c.height=src.height; const x=c.getContext('2d'); x.translate(src.width,0); x.scale(-1,1); x.drawImage(src,0,0); return c; }
function buildSprite(rows){
  const h=rows.length, w=Math.max(...rows.map(r=>r.length));
  const mk=fn=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){ const ch=rows[j][i]; if(!ch||ch==='.') continue; x.fillStyle=fn(ch); x.fillRect(i,j,1,1); } return c; };
  const img=mk(ch=>PALETTE[ch]||'#ff00ff'), flash=mk(()=>'#ffffff');
  return { img, flip:mirror(img), flash, flashFlip:mirror(flash), w, h, url:img.toDataURL() };
}
for(const k in SPRITES) SPR[k]=buildSprite(SPRITES[k]);

function pxCtx(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); return [c,x]; }
function disc(x,cx,cy,r,col){ x.fillStyle=col; for(let j=-r;j<=r;j++){ const half=Math.floor(Math.sqrt(r*r-j*j)+0.3); x.fillRect(cx-half,cy+j,half*2+1,1); } }
function oval(x,cx,cy,rx,ry,col){ x.fillStyle=col; for(let j=-ry;j<=ry;j++){ const half=Math.floor(rx*Math.sqrt(Math.max(0,1-(j*j)/(ry*ry)))+0.3); x.fillRect(cx-half,cy+j,half*2+1,1); } }
const ART = {
  hq(){ const [c,x]=pxCtx(48,48); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(3,6,42,40); x.fillRect(6,3,36,46);
    x.fillStyle='#3a4150'; x.fillRect(4,7,40,38); x.fillRect(7,4,34,44);
    x.fillStyle='#4a5366'; x.fillRect(6,9,36,32);
    for(let i=0;i<9;i++){ x.fillStyle=i%2?P.k:P.y; x.fillRect(7+i*4,42,4,3); }
    x.fillStyle='#2c323e'; x.fillRect(8,11,6,6); x.fillRect(34,11,6,6); x.fillRect(8,31,6,6);
    disc(x,24,24,11,P.k); disc(x,24,24,10,P.A); disc(x,23,22,8,P.a); disc(x,21,20,3,'#d7e1ec');
    x.fillStyle=P.k; x.fillRect(14,25,20,4); x.fillStyle=P.v; x.fillRect(15,26,18,2);
    x.fillStyle=P.W; x.fillRect(38,2,2,14); x.fillStyle=P.k; x.fillRect(35,15,8,3);
    return c; },
  relay(){ const [c,x]=pxCtx(32,32); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(2,14,28,16); x.fillStyle='#3a4150'; x.fillRect(3,15,26,14);
    x.fillStyle=P.y; x.fillRect(3,27,4,2); x.fillRect(25,27,4,2);
    x.fillStyle=P.k; x.fillRect(14,6,4,20); x.fillStyle=P.a; x.fillRect(15,6,2,20);
    x.fillStyle=P.A; x.fillRect(8,24,3,4); x.fillRect(21,24,3,4);
    oval(x,16,7,9,5,P.k); oval(x,16,7,8,4,P.a); oval(x,15,6,5,2,'#d7e1ec'); x.fillStyle=P.k; x.fillRect(15,4,2,4);
    return c; },
  sentry(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(2,4,12,11); x.fillRect(4,2,8,14); x.fillStyle=P.G; x.fillRect(3,5,10,9); x.fillRect(5,3,6,12);
    x.fillStyle=P.A; x.fillRect(5,6,6,6); x.fillStyle=P.y; x.fillRect(3,13,2,1); x.fillRect(11,13,2,1); return c; },
  barricade(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,3,16,13); x.fillStyle='#7d8392'; x.fillRect(1,4,14,11); x.fillStyle='#9aa0ad'; x.fillRect(1,4,14,2);
    for(let i=0;i<4;i++){ x.fillStyle=i%2?P.k:P.y; x.fillRect(1+i*4,9,4,3); } return c; },
  hive(){ return hiveDraw(pxCtx(48,48),0.4); },   /* the still picture (Intel, editor); in the game the hive is animated (hiveFrame) */
  /* a soldier's body wrapped in Swarm tissue: a long pod, the helmet still showing at one end */
  huskcocoon(){ const [c,x]=pxCtx(20,16); const P=PALETTE;
    oval(x,10,10,9,5,P.k); oval(x,10,10,8,4,P.C); oval(x,9,9,6,3,P.p); oval(x,15,9,3,3,P.k); oval(x,15,9,2,2,P.A); x.fillStyle=P.a; x.fillRect(15,8,2,1);
    x.fillStyle=P.e; x.fillRect(4,10,5,1); x.fillRect(8,8,1,4); x.fillRect(11,11,3,1); x.fillRect(12,7,1,2); x.fillStyle=P.E; x.fillRect(5,8,2,1); x.fillRect(10,12,2,1);
    x.fillStyle=P.c; x.fillRect(2,13,3,1); x.fillRect(16,14,2,1); return c; },
  /* a brood bulb: a round fungal pod with light in its veins and a curled sprout on top */
  egg(){ const [c,x]=pxCtx(12,14); const P=PALETTE;
    oval(x,6,9,5,5,P.k); oval(x,6,9,4,4,P.C); oval(x,5,8,2,2,P.p); oval(x,9,11,2,2,P.k); oval(x,9,11,1,1,P.p);
    x.fillStyle=P.k; x.fillRect(5,2,3,3); x.fillRect(7,1,3,2); x.fillStyle=P.p; x.fillRect(6,3,1,2); x.fillRect(7,2,2,1); x.fillRect(9,2,1,1);
    x.fillStyle=P.e; x.fillRect(3,9,1,1); x.fillRect(7,8,1,1); x.fillRect(5,11,1,1); x.fillRect(8,10,1,1); x.fillStyle=P.k; x.fillRect(3,13,6,1); return c; },
  cocoon(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    oval(x,8,9,5,6,P.k); oval(x,8,9,4,5,P.C); oval(x,7,7,2,3,P.p); x.fillStyle=P.e; x.fillRect(9,8,1,4); x.fillRect(6,11,3,1); return c; },
  lz(){ const [c,x]=pxCtx(48,48); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(1,1,46,46); x.fillStyle='#3a4150'; x.fillRect(2,2,44,44); x.fillStyle='#4a5366'; x.fillRect(5,5,38,38);
    for(let i=0;i<11;i++){ x.fillStyle=i%2?P.k:P.y; x.fillRect(2+i*4,2,4,2); x.fillRect(2+i*4,44,4,2); x.fillRect(2,2+i*4,2,4); x.fillRect(44,2+i*4,2,4); }
    disc(x,24,24,14,'#2c323e'); disc(x,24,24,12,'#4a5366'); x.fillStyle=P.y; x.fillRect(17,15,3,18); x.fillRect(28,15,3,18); x.fillRect(17,22,14,3);
    x.fillStyle=P.v; x.fillRect(6,6,2,2); x.fillRect(40,6,2,2); x.fillRect(6,40,2,2); x.fillRect(40,40,2,2); return c; },
  dropship(){ const [c,x]=pxCtx(56,40); const P=PALETTE;
    const poly=(col,pts)=>{ x.fillStyle=col; x.beginPath(); pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b)); x.closePath(); x.fill(); };
    const R=(col,a,b,w,h)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
    // swept wings (outline, then plate)
    poly(P.k,[[35,12],[29,2],[15,2],[21,12],[21,28],[15,38],[29,38],[35,28]]);
    poly(P.G,[[33,13],[28,4],[17,4],[22,13],[22,27],[17,36],[28,36],[33,27]]);
    poly(P.A,[[31,13],[27,6],[20,6],[24,13],[24,27],[20,34],[27,34],[31,27]]);
    // engine pods on the wing tips, exhaust glow at the back
    for(const y of [0,33]){ R(P.k,13,y,20,7); R(P.G,14,y+1,18,5); R(P.a,15,y+1,16,2); R(P.g,14,y+5,18,1); R(P.k,11,y+1,3,5); R(P.o,11,y+2,2,3); R(P.y,30,y+2,2,3); }
    // twin tail fins
    poly(P.k,[[3,9],[11,11],[11,15],[3,13]]); poly(P.k,[[3,31],[11,29],[11,25],[3,27]]); R(P.G,4,10,6,2); R(P.G,4,28,6,2);
    // fuselage: wide armoured body tapering to a blunt nose
    poly(P.k,[[2,15],[8,11],[40,11],[50,14],[54,18],[54,22],[50,26],[40,29],[8,29],[2,25]]);
    poly(P.A,[[4,16],[9,13],[40,13],[49,16],[52,19],[52,21],[49,24],[40,27],[9,27],[4,24]]);
    poly(P.a,[[6,15],[10,14],[40,14],[48,17],[50,19],[10,19]]);                         // lit top
    R(P.g,9,23,32,3);                                                                   // shadow side
    R(P.k,18,13,1,14); R(P.k,30,13,1,14); R(P.k,10,19,30,1);                            // panel lines
    R(P.G,20,15,9,8); R(P.k,21,16,7,6); R(P.g,22,17,5,4);                                // roof hatch
    for(let i=0;i<4;i++){ R(i%2?P.k:P.y,33+i*2,22,2,3); }                                // hazard stripe
    poly(P.k,[[42,15],[49,17],[51,20],[49,23],[42,25]]); poly(P.q,[[43,16],[48,18],[49,20],[48,22],[43,24]]); R(P.w,45,18,2,1);   // cockpit
    R(P.k,1,16,3,8); R(P.g,0,17,2,6); R(P.y,0,17,1,1); R(P.y,0,22,1,1);                  // rear ramp
    R(P.v,12,24,4,1); R(P.v,12,15,4,1);                                                 // markings
    return c; },
  /* the first rescue dropship, crashed nose-first: tilted, burnt black, one wing torn, the hull split open */
  wreck(){ const [c,x]=pxCtx(64,52); const ship=ART.dropship();
    x.save(); x.translate(32,28); x.rotate(-0.32); x.drawImage(ship,-28,-20); x.restore();
    x.globalCompositeOperation='source-atop'; x.fillStyle='rgba(20,14,10,.55)'; x.fillRect(0,0,64,52);
    for(const [a,b,r] of [[22,24,9],[40,30,7],[30,18,5]]){ const g=x.createRadialGradient(a,b,0,a,b,r); g.addColorStop(0,'rgba(0,0,0,.85)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(a-r,b-r,r*2,r*2); }
    x.globalCompositeOperation='destination-out'; x.fillRect(12,31,7,9); x.fillRect(44,9,6,4); x.globalCompositeOperation='source-over';
    x.fillStyle='#1a1410'; x.fillRect(27,25,10,2); x.fillStyle='#ff8a2a'; x.fillRect(29,25,3,1); x.fillRect(34,26,2,1);
    for(const [a,b] of [[8,44],[14,46],[50,40],[56,44],[44,47],[20,48]]){ x.fillStyle='#2a2b33'; x.fillRect(a,b,3,2); x.fillStyle='#4c4e58'; x.fillRect(a,b,2,1); }
    return c; },
  /* a relic: a small battered case with a bright edge, something worth picking up */
  relic(){ const [c,x]=pxCtx(12,12); disc(x,6,6,5,'rgba(120,230,255,.25)'); disc(x,6,6,4,'#0a0b10'); disc(x,6,6,3,'#3fb6d8'); disc(x,5,5,2,'#9ff0ff'); x.fillStyle='#ffffff'; x.fillRect(4,4,1,1);
    x.fillStyle='#ffd23f'; x.fillRect(6,0,1,2); x.fillRect(6,10,1,2); x.fillRect(0,6,2,1); x.fillRect(10,6,2,1); return c; },
  /* an ancient egg: tall, petrified, cracked, with amber light inside */
  ancientegg(){ const [c,x]=pxCtx(14,18); oval(x,7,10,6,8,'#0a0b10'); oval(x,7,10,5,7,'#5b544a'); oval(x,6,9,3,5,'#776e60'); oval(x,7,12,2,3,'#c97a24'); oval(x,7,12,1,2,'#ffd23f');
    x.fillStyle='#2a2620'; x.fillRect(4,6,1,4); x.fillRect(5,10,2,1); x.fillRect(9,4,1,5); x.fillRect(8,9,1,2); x.fillStyle='#8f8676'; x.fillRect(5,4,2,1); x.fillStyle='#0a0b10'; x.fillRect(3,17,8,1); return c; },
  uplink(){ const [c,x]=pxCtx(32,32); const P=PALETTE;
    disc(x,16,16,14,P.k); disc(x,16,16,13,'#3a4150'); disc(x,16,16,9,'#2c323e');
    for(let a=0;a<8;a++){ const ang=a*Math.PI/4; x.fillStyle=a%2?P.y:P.k; x.fillRect(Math.round(16+Math.cos(ang)*11)-1,Math.round(16+Math.sin(ang)*11)-1,3,3); }
    x.fillStyle=P.k; x.fillRect(14,5,4,20); x.fillStyle=P.a; x.fillRect(15,5,2,20); oval(x,16,6,6,3,P.k); oval(x,16,6,5,2,P.a); x.fillStyle=P.v; x.fillRect(15,4,2,2); return c; },
  /* an old mine shaft: rubble, a broken timber frame and a pit that goes down forever (the Swarm comes up out of it) */
  shaft(){ const [c,x]=pxCtx(32,32);
    oval(x,16,18,15,11,'#1d1a16'); oval(x,16,18,14,10,'#2a2620');
    for(const [a,b,w,h,col] of [[3,14,3,2,'#4b4640'],[5,24,4,2,'#5d574f'],[24,25,3,2,'#4b4640'],[27,15,3,3,'#5d574f'],[10,27,3,2,'#3d3934'],[20,28,4,2,'#5d574f'],[2,19,2,2,'#5d574f']]){ x.fillStyle=col; x.fillRect(a,b,w,h); }
    oval(x,16,19,10,7,'#0c0b0d'); oval(x,16,20,7,5,'#000000');
    oval(x,16,22,4,1,'rgba(130,210,50,.45)'); x.fillStyle='rgba(166,255,74,.6)'; x.fillRect(14,22,1,1); x.fillRect(18,21,1,1);
    x.fillStyle='#3a2a18'; x.fillRect(6,7,3,14); x.fillRect(23,7,3,14); x.fillStyle='#5a4128'; x.fillRect(7,7,1,13); x.fillRect(24,7,1,13);
    x.fillStyle='#3a2a18'; x.fillRect(4,5,24,3); x.fillStyle='#6b4c2c'; x.fillRect(4,5,24,1); x.fillStyle='#000'; x.fillRect(17,5,2,3);
    x.fillStyle='#5a4128'; x.fillRect(19,12,7,2); return c; },
  /* a Swarm tunnel breaking out of a rock wall (drawn with the wall at the top; rotated for other walls) */
  tunnel(){ const [c,x]=pxCtx(32,32);
    x.fillStyle='#2b2a2e'; x.fillRect(0,0,32,12); oval(x,16,8,16,8,'#2b2a2e');
    for(const [a,b,w,h,col] of [[1,2,6,4,'#3a3940'],[9,0,7,3,'#45434b'],[20,1,8,4,'#3a3940'],[27,6,5,4,'#45434b'],[0,8,4,3,'#45434b'],[24,10,4,3,'#3a3940']]){ x.fillStyle=col; x.fillRect(a,b,w,h); }
    oval(x,16,13,11,10,'#1c1720'); oval(x,16,14,9,8,'#0b080d'); oval(x,16,15,6,6,'#000000');
    x.fillStyle='#3d2a46'; for(const [a,b] of [[7,9],[24,9],[9,5],[22,5],[16,3]]) x.fillRect(a,b,2,3);   /* ribs of hardened resin round the hole */
    oval(x,16,24,12,5,'#4a2552'); oval(x,16,25,9,4,'#5f2f6a'); oval(x,16,23,6,2,'#2a1030');
    for(const [a,b,w,h,col] of [[3,26,4,2,'#4b4640'],[25,27,4,2,'#5d574f'],[12,29,3,2,'#3d3934'],[20,29,3,2,'#4b4640']]){ x.fillStyle=col; x.fillRect(a,b,w,h); }
    x.fillStyle='rgba(166,255,74,.75)'; x.fillRect(13,17,1,1); x.fillRect(19,16,1,1); x.fillRect(11,25,2,1); x.fillRect(21,24,1,1);
    oval(x,16,18,3,1,'rgba(130,210,50,.4)'); return c; },
  generator(){ const [c,x]=pxCtx(32,32); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(2,5,28,25); x.fillStyle=P.G; x.fillRect(3,6,26,23); x.fillStyle=P.A; x.fillRect(5,8,22,10);
    for(let i=0;i<5;i++){ x.fillStyle=P.k; x.fillRect(7+i*4,9,2,8); }
    x.fillStyle=P.g; x.fillRect(5,20,22,7); x.fillStyle=P.y; x.fillRect(6,21,3,5); x.fillRect(23,21,3,5);
    x.fillStyle=P.k; x.fillRect(12,1,8,6); x.fillStyle=P.a; x.fillRect(13,2,6,4); x.fillStyle=P.k; x.fillRect(11,22,10,4); return c; },
  chargesite(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    for(let i=0;i<8;i++){ x.fillStyle=i%2?P.k:P.r; x.fillRect(i*2,0,2,2); x.fillRect(i*2,14,2,2); x.fillRect(0,i*2,2,2); x.fillRect(14,i*2,2,2); }
    x.fillStyle=P.r; x.fillRect(7,4,2,8); x.fillRect(4,7,8,2); return c; },
  charge(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(3,4,10,11); x.fillStyle=P.O; x.fillRect(4,5,8,9); x.fillStyle=P.o; x.fillRect(4,5,8,2);
    x.fillStyle=P.k; x.fillRect(5,9,6,3); x.fillStyle=P.r; x.fillRect(6,10,4,1); x.fillStyle=P.k; x.fillRect(7,1,2,4); x.fillStyle=P.r; x.fillRect(7,0,2,2); return c; },
  rubble(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(1,6,14,9); x.fillRect(4,3,8,4); x.fillStyle='#3a3b44'; x.fillRect(2,7,6,7); x.fillRect(5,4,6,4); x.fillStyle='#4c4e58'; x.fillRect(8,8,6,6); x.fillRect(6,4,3,2);
    x.fillStyle='#2a2b33'; x.fillRect(3,12,4,2); x.fillRect(10,12,3,2); return c; },
  door(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,0,16,16); x.fillStyle=P.G; x.fillRect(1,1,14,14); x.fillStyle=P.A; x.fillRect(2,2,5,12); x.fillRect(9,2,5,12);
    x.fillStyle=P.k; x.fillRect(7,1,2,14);
    for(let i=0;i<4;i++){ x.fillStyle=i%2?P.k:P.y; x.fillRect(2,2+i*3,5,2); x.fillRect(9,3+i*3,5,2); }
    x.fillStyle=P.v; x.fillRect(7,7,2,2); return c; },
  membrane(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,1,16,15); x.fillStyle=P.C; x.fillRect(1,2,14,13); x.fillStyle=P.m; x.fillRect(2,4,5,4); x.fillRect(9,8,5,5);
    x.fillStyle=P.p; x.fillRect(3,3,3,1); x.fillRect(10,7,3,1); x.fillStyle=P.e; x.fillRect(7,3,1,9); x.fillRect(4,11,6,1); x.fillRect(12,4,1,4); return c; },
  /* Rogue, Needle and Thread: the field hospital's records terminal (a Corps console with a green screen) and a hospital tent */
  terminal(){ const [c,x]=pxCtx(16,18); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(2,2,12,10); x.fillStyle=P.G; x.fillRect(3,3,10,8); x.fillStyle='#0d2a1a'; x.fillRect(4,4,8,6);
    x.fillStyle='#5fe3b0'; x.fillRect(5,5,5,1); x.fillRect(5,7,3,1); x.fillRect(9,7,2,1); x.fillStyle='#2f8f6a'; x.fillRect(5,9,6,1);
    x.fillStyle=P.k; x.fillRect(6,12,4,3); x.fillRect(1,15,14,3); x.fillStyle=P.A; x.fillRect(2,16,12,1); x.fillStyle=P.r; x.fillRect(12,13,2,2); return c; },
  medtent(){ const [c,x]=pxCtx(32,30); const P=PALETTE;
    x.fillStyle=P.k; for(let j=0;j<20;j++){ const h=Math.round(4+j*0.7); x.fillRect(16-h-1,6+j,h*2+2,1); }
    for(let j=0;j<19;j++){ const h=Math.round(4+j*0.7); x.fillStyle=j<3?'#d8dccf':'#b9bdb0'; x.fillRect(16-h,7+j,h,1); x.fillStyle=j<3?'#c5c9bb':'#9a9e91'; x.fillRect(16,7+j,h,1); }
    x.fillStyle=P.k; x.fillRect(12,17,8,9); x.fillStyle='#1a1c22'; x.fillRect(13,18,6,8);
    x.fillStyle=P.w; x.fillRect(5,14,7,7); x.fillStyle=P.r; x.fillRect(7,15,3,5); x.fillRect(6,16,5,3);
    x.fillStyle=P.G; x.fillRect(15,2,2,6); x.fillStyle=P.k; x.fillRect(3,26,26,2); return c; },
  /* Rogue, Among Them: a choir pod, a swollen Swarm throat that keeps the brood awake with its song */
  choirpod(){ const [c,x]=pxCtx(20,24); const P=PALETTE;
    oval(x,10,20,9,3,P.c); oval(x,10,13,7,9,P.k); oval(x,10,13,6,8,P.C); oval(x,9,11,3,5,P.p);
    x.fillStyle=P.c; x.fillRect(7,4,6,3); x.fillStyle=P.k; x.fillRect(8,3,4,2); x.fillStyle=P.m; x.fillRect(9,4,2,2);
    x.fillStyle=P.e; x.fillRect(5,14,1,1); x.fillRect(14,11,1,1); x.fillRect(10,18,1,1); x.fillStyle=P.E; x.fillRect(4,19,3,1); x.fillRect(13,20,3,1); return c; },
  crate(){ const [c,x]=pxCtx(12,10); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,0,12,10); x.fillStyle=P.G; x.fillRect(1,1,10,8); x.fillStyle=P.v; x.fillRect(1,4,10,2); x.fillStyle=P.A; x.fillRect(5,1,2,8); return c; }
};
/* The hive: a root bulb. A fleshy bulb on a web of roots that run out into the creep; it beats like a heart
   (a double beat), green sap runs out along the roots, and a sprout on top sways. One loop lasts HIVE_LOOP seconds;
   hiveFrame(t) gives the picture at time t from HIVE_FRAMES pictures made once. */
const HIVE_LOOP=5, HIVE_FPS=12;
function hiveDraw([c,x],t,hurt=0){   /* hurt 0 healthy, 1 hurt (a third of the roots wither), 2 badly hurt (two thirds, a darker bulb with cracks) */ const P=PALETTE, px=(a,b,col)=>{ x.fillStyle=col; x.fillRect(Math.round(a),Math.round(b),1,1); }, w=2*Math.PI/HIVE_LOOP;
  const roots=[[4,38],[10,44],[44,40],[40,45],[24,46],[2,28],[46,30]];
  roots.forEach(([a,b],i)=>{ const dead=hurt&&(i%3===0||(hurt>1&&i%3===1)), len=dead?0.6:1;   /* a withered root: shrunk, grey, no sap */
    for(let s=0;s<=len;s+=0.03){ const X=24+(a-24)*s+Math.sin(s*6+i)*1.5, Y=34+(b-34)*s; px(X,Y+1,P.k); px(X,Y,dead?'#3a3340':P.C); }
    if(dead) return; const q=(t*3/HIVE_LOOP+i*0.23)%1; px(24+(a-24)*q+Math.sin(q*6+i)*1.5,34+(b-34)*q,P.e); });   /* sap running out along the root */
  const hb=(t*6/HIVE_LOOP)%1, beat=hb<0.08?1:hb<0.16?0.3:hb<0.24?0.8:0, s=1+0.08*beat;   /* six double beats per loop */
  oval(x,24,26,Math.round(12*s),Math.round(13*s),P.k); oval(x,24,26,Math.round(11*s),Math.round(12*s),hurt>1?'#3a2843':P.C); oval(x,21,22,Math.round(6*s),Math.round(7*s),hurt>1?'#5e4670':P.p);
  for(let i=-1;i<=1;i++) for(let y=16;y<36;y++) px(24+i*6*Math.sin((y-13)/23*Math.PI)*s,y,P.c);   /* the folds of the bulb */
  const sw=Math.sin(t*w); for(let s2=0;s2<1;s2+=0.05) px(24+Math.sin(s2*4+sw)*2*s2,13-s2*8,P.C);   /* the sprout */
  disc(x,Math.round(24+Math.sin(4+sw)*2),5,1,hurt>1?P.E:P.e); disc(x,24,27,2,beat>0.5?P.e:P.E);
  if(hurt){ x.fillStyle=P.k; [[16,20],[17,21],[17,22],[18,23],[30,28],[31,29],[30,30],[31,31]].slice(0,hurt*4).forEach(([a,b])=>x.fillRect(a,b,1,1)); }   /* cracks */
  return c; }
const HIVE_FRAMES=[0,1,2].map(hu=>{ const a=[]; for(let i=0;i<HIVE_LOOP*HIVE_FPS;i++) a.push(hiveDraw(pxCtx(48,48),i/HIVE_FPS,hu)); return a; });   /* healthy, hurt, badly hurt */
function hiveFrame(t,hurt=0){ const F=HIVE_FRAMES[hurt]||HIVE_FRAMES[0], n=F.length; return F[((Math.floor(t*HIVE_FPS)%n)+n)%n]; }
const ARTC={}; const ARTURL={};
for(const k in ART){ ARTC[k]=ART[k](); ARTURL[k]=ARTC[k].toDataURL(); }
function iconUrl(type){ return UNITS[type] ? SPR[UNITS[type].sprite].url : (ARTURL[BUILDINGS[type]?.art]||''); }
