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
  hive(){ const [c,x]=pxCtx(48,48); const P=PALETTE;
    oval(x,24,30,22,16,'rgba(36,24,44,.9)');
    disc(x,24,27,17,P.k); disc(x,24,27,16,P.c); disc(x,22,24,13,P.C); disc(x,20,21,8,P.p);
    disc(x,33,17,7,P.k); disc(x,33,17,6,P.C); disc(x,32,16,3,P.p);
    disc(x,13,33,6,P.k); disc(x,13,33,5,P.C);
    x.fillStyle=P.b; x.fillRect(10,14,2,10); x.fillRect(36,26,2,9); x.fillRect(26,8,2,7); x.fillRect(18,36,9,2);
    disc(x,24,30,3,P.k); disc(x,24,30,2,P.e); disc(x,33,18,2,P.E); disc(x,14,34,2,P.E);
    return c; },
  cocoon(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    oval(x,8,9,5,6,P.k); oval(x,8,9,4,5,P.C); oval(x,7,7,2,3,P.p); x.fillStyle=P.e; x.fillRect(9,8,1,4); x.fillRect(6,11,3,1); return c; },
  lz(){ const [c,x]=pxCtx(48,48); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(1,1,46,46); x.fillStyle='#3a4150'; x.fillRect(2,2,44,44); x.fillStyle='#4a5366'; x.fillRect(5,5,38,38);
    for(let i=0;i<11;i++){ x.fillStyle=i%2?P.k:P.y; x.fillRect(2+i*4,2,4,2); x.fillRect(2+i*4,44,4,2); x.fillRect(2,2+i*4,2,4); x.fillRect(44,2+i*4,2,4); }
    disc(x,24,24,14,'#2c323e'); disc(x,24,24,12,'#4a5366'); x.fillStyle=P.y; x.fillRect(17,15,3,18); x.fillRect(28,15,3,18); x.fillRect(17,22,14,3);
    x.fillStyle=P.v; x.fillRect(6,6,2,2); x.fillRect(40,6,2,2); x.fillRect(6,40,2,2); x.fillRect(40,40,2,2); return c; },
  dropship(){ const [c,x]=pxCtx(40,26); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(4,6,32,14); x.fillRect(0,10,40,6); x.fillStyle=P.A; x.fillRect(5,7,30,12); x.fillStyle=P.a; x.fillRect(6,8,28,4);
    x.fillStyle=P.k; x.fillRect(1,11,38,4); x.fillStyle=P.G; x.fillRect(2,12,36,2); x.fillStyle=P.v; x.fillRect(30,9,4,3); x.fillStyle=P.y; x.fillRect(8,16,4,2); x.fillRect(28,16,4,2);
    x.fillStyle=P.o; x.fillRect(9,20,3,4); x.fillRect(28,20,3,4); x.fillStyle=P.y; x.fillRect(10,21,1,3); x.fillRect(29,21,1,3); return c; },
  uplink(){ const [c,x]=pxCtx(32,32); const P=PALETTE;
    disc(x,16,16,14,P.k); disc(x,16,16,13,'#3a4150'); disc(x,16,16,9,'#2c323e');
    for(let a=0;a<8;a++){ const ang=a*Math.PI/4; x.fillStyle=a%2?P.y:P.k; x.fillRect(Math.round(16+Math.cos(ang)*11)-1,Math.round(16+Math.sin(ang)*11)-1,3,3); }
    x.fillStyle=P.k; x.fillRect(14,5,4,20); x.fillStyle=P.a; x.fillRect(15,5,2,20); oval(x,16,6,6,3,P.k); oval(x,16,6,5,2,P.a); x.fillStyle=P.v; x.fillRect(15,4,2,2); return c; },
  membrane(){ const [c,x]=pxCtx(16,16); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,1,16,15); x.fillStyle=P.C; x.fillRect(1,2,14,13); x.fillStyle=P.m; x.fillRect(2,4,5,4); x.fillRect(9,8,5,5);
    x.fillStyle=P.p; x.fillRect(3,3,3,1); x.fillRect(10,7,3,1); x.fillStyle=P.e; x.fillRect(7,3,1,9); x.fillRect(4,11,6,1); x.fillRect(12,4,1,4); return c; },
  crate(){ const [c,x]=pxCtx(12,10); const P=PALETTE;
    x.fillStyle=P.k; x.fillRect(0,0,12,10); x.fillStyle=P.G; x.fillRect(1,1,10,8); x.fillStyle=P.v; x.fillRect(1,4,10,2); x.fillStyle=P.A; x.fillRect(5,1,2,8); return c; }
};
const ARTC={}; const ARTURL={};
for(const k in ART){ ARTC[k]=ART[k](); ARTURL[k]=ARTC[k].toDataURL(); }
function iconUrl(type){ return UNITS[type] ? SPR[UNITS[type].sprite].url : (ARTURL[BUILDINGS[type]?.art]||''); }
