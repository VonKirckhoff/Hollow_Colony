'use strict';
/* =====================================================================
   HOLLOW COLONY MAP EDITOR
   Same tile language as the game (legend: js/content/maps/_maps.js).
   The game's maps are loaded from ../js/content/maps/*.js (see index.html).
   ===================================================================== */
const GAME_MAPS = (typeof MAPS!=='undefined') ? MAPS : {};

const TERRAIN = [
  { ch:'.', name:'Regolith',      key:'1', walk:1 },
  { ch:',', name:'Dust',          key:'2', walk:1 },
  { ch:'o', name:'Small crater',  key:'3', walk:1 },
  { ch:'~', name:'Ice',           key:'4', walk:1 },
  { ch:'=', name:'Plating',       key:'5', walk:1 },
  { ch:'#', name:'Rock',          key:'6', walk:0 },
  { ch:'^', name:'High rock',     key:'7', walk:0 },
  { ch:'*', name:'Crystal',       key:'8', walk:0 },
  { ch:')', name:'Crater rim',    key:'',  walk:0 },
  { ch:'_', name:'Crater floor',  key:'',  walk:1 },
  { ch:':', name:'Ramp',          key:'',  walk:1 },
  { ch:'&', name:'Plateau',       key:'',  walk:1 },
  { ch:'%', name:'Cliff',         key:'',  walk:0 }
];
const MARKERS = [
  { ch:'P', name:'Player start', unique:true },
  { ch:'Q', name:'2nd start', unique:true },
  { ch:'R', name:'Relay pad' },
  { ch:'S', name:'Crate' },
  { ch:'W', name:'Grazers' },
  { ch:'#num', name:'Waypoint 0–9' },
  { ch:'#hive', name:'Hive site a–n' }
];
const BLOCK=new Set(['#','^','*',')','%']);
const TOOLS=[ {id:'brush',glyph:'✎',name:'Brush',key:'B'}, {id:'rect',glyph:'▭',name:'Rectangle',key:'U'}, {id:'fill',glyph:'◧',name:'Fill',key:'F'},
              {id:'pick',glyph:'⊙',name:'Pick',key:'I'}, {id:'crater',glyph:'◎',name:'Crater',key:'C'}, {id:'plateau',glyph:'⬢',name:'Plateau',key:'L'} ];
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hash2(x,y,s){ let h=(x*374761393+y*668265263+(s|0)*1442695041)|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
const store={ get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
let toastT=null; function toast(t){ const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,1800); }

/* ---------- tile textures (16×16, similar to the game) ---------- */
function texture(ch,variant){
  const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d'), img=x.createImageData(16,16), d=img.data;
  const rock=ch==='#'||ch==='^'||ch==='*';
  for(let j=0;j<16;j++) for(let i=0;i<16;i++){
    const n=hash2(i+variant*16,j,7), n2=hash2((i>>2)+variant*4,j>>2,3); let r,g,b;
    if(ch===')'){ const v=98+(n2*14|0)+(n>0.92?14:0); r=v; g=v; b=v+6; if(j<3){ r+=30-j*9; g+=30-j*9; b+=28-j*8; } if(j>12){ r-=18; g-=18; b-=14; } }
    else if(ch==='%'){ const v=78+(n2*10|0)+((j+variant)%5===0?-12:0); r=v+6; g=v+4; b=v; if(j<4){ r+=50-j*11; g+=48-j*11; b+=42-j*10; } }
    else if(rock){ const base=ch==='^'?26:36, v=base+(n2*10|0)+(n>0.93?10:0); r=v; g=v; b=v+8;
      if(ch==='*'){ const cx=Math.abs(i-8)+Math.abs(j-9); if(cx<5&&((i+j)%3!==0)){ const t=variant%2; r=t?142:86; g=t?108:226; b=t?240:206; } } }
    else { let base=[70,72,82];
      if(ch===',') base=[86,82,76]; if(ch==='~') base=[132,164,180]; if(ch==='=') base=[60,67,79]; if(ch==='_') base=[50,52,60]; if(ch===':') base=[80,80,86]; if(ch==='&') base=[98,95,98];
      const k=(n2-0.5)*10+(n>0.9?9:0)-(n<0.06?10:0); r=base[0]+k; g=base[1]+k; b=base[2]+k;
      if(ch==='~'&&((i+j*2+variant*3)%11===0)){ r+=30; g+=30; b+=24; }
      if(ch==='='&&(i===0||j===0)){ r-=16; g-=16; b-=14; }
      if(ch===':'&&j%4===1){ r-=12; g-=12; b-=10; }
      if(ch==='o'){ const dx=i-7.5, dy=j-7.5, rr=Math.sqrt(dx*dx+dy*dy); if(rr<6.5){ const s=dy<0?-14:8; r+=s; g+=s; b+=s; } } }
    const p=(j*16+i)*4; d[p]=clamp(r,0,255); d[p+1]=clamp(g,0,255); d[p+2]=clamp(b,0,255); d[p+3]=255;
  }
  x.putImageData(img,0,0); return c;
}
const TEX={}; for(const t of TERRAIN){ TEX[t.ch]=[0,1,2,3].map(v=>texture(t.ch,v)); }
const MM_COL={'.':'#454852',',':'#55524d','o':'#3d4049','~':'#7fa1b0','=':'#59616f','#':'#1d1e25','^':'#141419','*':'#5c4a96',')':'#8a8c95','_':'#33353d',':':'#6a6a70','&':'#6e6c72','%':'#a9a6a0'};

/* ---------- state ---------- */
const S={ g:[], w:0, h:0, key:'mymap', name:'New map', desc:'', zoom:16, ox:0, oy:0, tool:'brush', paint:'.', brush:1, radius:5, ramps:['S'],
  grid:true, reach:false, undo:[], redo:[], dirty:false, checks:[], unreach:null };
const isMarker=ch=>!TERRAIN.some(t=>t.ch===ch);
const walkable=ch=>!BLOCK.has(ch);
function snapshot(){ return S.g.map(r=>r.join('')); }
function pushUndo(){ S.undo.push({g:snapshot(),w:S.w,h:S.h}); if(S.undo.length>80) S.undo.shift(); S.redo.length=0; }
function restore(s){ S.g=s.g.map(r=>r.split('')); S.w=s.w; S.h=s.h; changed(true); }
function load(rows,meta={}){
  const w=Math.max(...rows.map(r=>r.length)), h=rows.length;
  S.g=rows.map(r=>r.padEnd(w,'#').split('')); S.w=w; S.h=h;
  S.key=meta.key||S.key; S.name=meta.name||S.name; S.desc=meta.desc??S.desc; S.undo=[]; S.redo=[];
  syncProps(); fit(); changed(true);
}
function syncProps(){ $('#p-key').value=S.key; $('#p-name').value=S.name; $('#p-desc').value=S.desc; $('#p-w').value=S.w; $('#p-h').value=S.h; }

/* ---------- canvas ---------- */
const cv=$('#cv'), ctx=cv.getContext('2d'), stage=$('#stage'), mini=$('#mini'), mctx=mini.getContext('2d');
let dpr=1;
function resize(){ dpr=Math.min(2,window.devicePixelRatio||1); const r=stage.getBoundingClientRect(); cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); draw(); }
function fit(){ const r=stage.getBoundingClientRect(); const z=Math.max(4,Math.floor(Math.min((r.width-24)/S.w,(r.height-24)/S.h))); S.zoom=Math.min(z,32); S.ox=Math.round((r.width-S.w*S.zoom)/2); S.oy=Math.round((r.height-S.h*S.zoom)/2); draw(); }
function zoomAt(f,cx,cy){ const nz=clamp(Math.round(S.zoom*f),4,40); if(nz===S.zoom) return; const wx=(cx-S.ox)/S.zoom, wy=(cy-S.oy)/S.zoom; S.zoom=nz; S.ox=Math.round(cx-wx*nz); S.oy=Math.round(cy-wy*nz); draw(); }
function cellAt(px,py){ return { x:Math.floor((px-S.ox)/S.zoom), y:Math.floor((py-S.oy)/S.zoom) }; }
function markerGlyph(ch,x,y,z){
  const cx=x+z/2, cy=y+z/2; ctx.save();
  if(ch==='R'){ ctx.fillStyle='rgba(42,48,56,.9)'; ctx.fillRect(x+1,y+1,z*2-2,z*2-2); ctx.strokeStyle='#f2c230'; ctx.lineWidth=Math.max(1,z/10); ctx.strokeRect(x+2,y+2,z*2-4,z*2-4); ctx.fillStyle='#f2c230'; ctx.fillRect(x+z-1,y+z*0.55,2,z*0.9); ctx.fillRect(x+z*0.55,y+z-1,z*0.9,2); }
  else if(ch==='S'){ ctx.fillStyle='#0a0b10'; ctx.fillRect(x+z*0.15,y+z*0.25,z*0.7,z*0.55); ctx.fillStyle='#4f5766'; ctx.fillRect(x+z*0.2,y+z*0.3,z*0.6,z*0.45); ctx.fillStyle='#ffb347'; ctx.fillRect(x+z*0.2,y+z*0.47,z*0.6,z*0.12); }
  else if(ch==='W'){ ctx.fillStyle='#d3c3a6'; ctx.beginPath(); ctx.ellipse(cx,cy,z*0.38,z*0.24,0,0,Math.PI*2); ctx.fill(); }
  else { const hive=/[a-n]/.test(ch), num=/[0-9]/.test(ch);
    ctx.fillStyle= ch==='P'?'#ffb347': ch==='Q'?'#ffd38a': hive?'#7a5a8e':'#dde1ea';
    if(hive){ ctx.globalAlpha=0.35; ctx.fillRect(x-z,y-z,z*3,z*3); ctx.globalAlpha=1; }
    if(ch==='P'||ch==='Q'){ ctx.globalAlpha=0.3; ctx.fillRect(x-z,y-z,z*3,z*3); ctx.globalAlpha=1; }
    ctx.beginPath(); ctx.arc(cx,cy,z*0.42,0,Math.PI*2); ctx.fill();
    if(z>=9){ ctx.fillStyle=hive?'#a6ff4a':'#0a0b10'; ctx.font=`${Math.round(z*0.6)}px Silkscreen, monospace`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(ch,cx,cy+1); } }
  ctx.restore();
}
function draw(){
  if(!S.w) return; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false;
  const r=stage.getBoundingClientRect(); ctx.fillStyle='#05060a'; ctx.fillRect(0,0,r.width,r.height);
  const z=S.zoom, x0=Math.max(0,Math.floor(-S.ox/z)), y0=Math.max(0,Math.floor(-S.oy/z)), x1=Math.min(S.w,Math.ceil((r.width-S.ox)/z)), y1=Math.min(S.h,Math.ceil((r.height-S.oy)/z));
  const markers=[];
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ let ch=S.g[y][x]; if(isMarker(ch)){ markers.push([ch,x,y]); ch=ch==='R'?'=':'.'; }
    ctx.drawImage(TEX[ch][(hash2(x,y,5)*4)|0],S.ox+x*z,S.oy+y*z,z,z); }
  if(S.reach && S.unreach){ ctx.fillStyle='rgba(255,90,79,.38)'; for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(S.unreach[y*S.w+x]) ctx.fillRect(S.ox+x*z,S.oy+y*z,z,z); }
  if(S.grid && z>=8){ ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.beginPath();
    for(let x=x0;x<=x1;x++){ ctx.moveTo(S.ox+x*z+.5,S.oy+y0*z); ctx.lineTo(S.ox+x*z+.5,S.oy+y1*z); }
    for(let y=y0;y<=y1;y++){ ctx.moveTo(S.ox+x0*z,S.oy+y*z+.5); ctx.lineTo(S.ox+x1*z,S.oy+y*z+.5); } ctx.stroke();
    ctx.strokeStyle='rgba(255,179,71,.12)'; ctx.beginPath(); for(let x=x0-x0%10;x<=x1;x+=10){ ctx.moveTo(S.ox+x*z+.5,S.oy+y0*z); ctx.lineTo(S.ox+x*z+.5,S.oy+y1*z); } for(let y=y0-y0%10;y<=y1;y+=10){ ctx.moveTo(S.ox+x0*z,S.oy+y*z+.5); ctx.lineTo(S.ox+x1*z,S.oy+y*z+.5); } ctx.stroke(); }
  for(const [ch,x,y] of markers) markerGlyph(ch,S.ox+x*z,S.oy+y*z,z);
  ctx.strokeStyle='#2c3140'; ctx.lineWidth=1; ctx.strokeRect(S.ox-.5,S.oy-.5,S.w*z+1,S.h*z+1);
  // previews
  if(P.preview){ const p=P.preview; ctx.strokeStyle='#ffb347'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
    if(p.type==='rect'){ ctx.strokeRect(S.ox+p.x0*z,S.oy+p.y0*z,(p.x1-p.x0+1)*z,(p.y1-p.y0+1)*z); }
    if(p.type==='circle'){ ctx.beginPath(); ctx.arc(S.ox+(p.x+.5)*z,S.oy+(p.y+.5)*z,(p.r+0.4)*z,0,Math.PI*2); ctx.stroke(); }
    if(p.type==='brush'){ const b=S.brush, o=Math.floor((b-1)/2); ctx.setLineDash([]); ctx.strokeRect(S.ox+(p.x-o)*z,S.oy+(p.y-o)*z,b*z,b*z); }
    ctx.setLineDash([]); }
  for(const f of S.flash){ ctx.strokeStyle='#ff5a4f'; ctx.lineWidth=3; ctx.strokeRect(S.ox+(f.x-1)*z,S.oy+(f.y-1)*z,3*z,3*z); }
  drawMini();
}
S.flash=[];
function drawMini(){
  const s=Math.max(1,Math.floor(260/S.w)); mini.width=S.w*s; mini.height=S.h*s;
  for(let y=0;y<S.h;y++) for(let x=0;x<S.w;x++){ const ch=S.g[y][x]; mctx.fillStyle= MM_COL[ch] || (ch==='P'||ch==='Q'?'#ffb347': /[a-n]/.test(ch)?'#a6ff4a': ch==='R'?'#c79a3a': ch==='S'?'#ffb347': '#dde1ea'); mctx.fillRect(x*s,y*s,s,s); }
  if(/[a-n]|P/.test('')){ }
  const r=stage.getBoundingClientRect(); mctx.strokeStyle='#fff'; mctx.lineWidth=1; mctx.strokeRect((-S.ox/S.zoom)*s+.5,(-S.oy/S.zoom)*s+.5,r.width/S.zoom*s,r.height/S.zoom*s);
}

/* ---------- editing ---------- */
function setCell(x,y,ch){ if(x<0||y<0||x>=S.w||y>=S.h) return false; if(S.g[y][x]===ch) return false; S.g[y][x]=ch; return true; }
function currentPaint(){
  if(S.paint==='#num') return $('#m-num').value; if(S.paint==='#hive') return $('#m-hive').value; return S.paint; }
function placeMarker(x,y,ch){
  const uniq=ch==='P'||ch==='Q'||/[0-9a-n]/.test(ch);
  if(uniq) for(let j=0;j<S.h;j++) for(let i=0;i<S.w;i++) if(S.g[j][i]===ch) S.g[j][i]='.';
  setCell(x,y,ch);
}
function brushAt(x,y){ const ch=currentPaint(); if(isMarker(ch)){ placeMarker(x,y,ch); return; } const b=S.brush, o=Math.floor((b-1)/2);
  for(let j=0;j<b;j++) for(let i=0;i<b;i++) setCell(x-o+i,y-o+j,ch); }
function lineCells(a,b){ const out=[]; const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))||1; for(let i=0;i<=n;i++) out.push({x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)}); return out; }
function fillAt(x,y){ const ch=currentPaint(); if(isMarker(ch)) return; const from=S.g[y]?.[x]; if(from===undefined||from===ch) return;
  const q=[[x,y]]; while(q.length){ const [cx,cy]=q.pop(); if(cx<0||cy<0||cx>=S.w||cy>=S.h||S.g[cy][cx]!==from) continue; S.g[cy][cx]=ch; q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]); } }
function rectFill(a,b){ const ch=currentPaint(); if(isMarker(ch)) return; for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++) for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++) setCell(x,y,ch); }
const DIRS={N:-Math.PI/2,E:0,S:Math.PI/2,W:Math.PI};
function stamp(kind,cx,cy){
  const R=S.radius, angs=S.ramps.map(k=>DIRS[k]);
  const ring=kind==='crater'?')':'%', inner=kind==='crater'?'_':'&';
  for(let y=Math.floor(cy-R-3);y<=cy+R+3;y++) for(let x=Math.floor(cx-R-3);x<=cx+R+3;x++){
    if(x<1||y<1||x>=S.w-1||y>=S.h-1) continue; const d=Math.hypot(x-cx,y-cy), a=Math.atan2(y-cy,x-cx);
    const onramp=angs.some(ra=>Math.abs((a-ra+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.max(d,1)<1.6);
    const cur=S.g[y][x];
    if(d<=R-1.25){ if(!isMarker(cur)) S.g[y][x]=inner; }
    else if(d<=R+0.35){ S.g[y][x]=onramp?':':ring; }
    else if(d<=R+2.4 && onramp && BLOCK.has(cur)) S.g[y][x]='.';
  }
}
function addBorder(){ pushUndo(); for(let y=0;y<S.h;y++) for(let x=0;x<S.w;x++) if(x===0||y===0||x===S.w-1||y===S.h-1) S.g[y][x]='#'; changed(); }
function resizeMap(w,h){ w=clamp(w|0,24,140); h=clamp(h|0,20,140); if(w===S.w&&h===S.h) return; pushUndo();
  const g=[]; for(let y=0;y<h;y++){ const row=[]; for(let x=0;x<w;x++) row.push(y<S.h&&x<S.w?S.g[y][x]:(x===0||y===0||x===w-1||y===h-1?'#':'.')); g.push(row); }
  S.g=g; S.w=w; S.h=h; syncProps(); changed(); fit(); }

/* ---------- checks: the same rules the game relies on ---------- */
function validate(){
  const W=S.w, H=S.h, out=[], at=(x,y)=>(x<0||y<0||x>=W||y>=H)?'#':S.g[y][x];
  const find=ch=>{ const r=[]; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(S.g[y][x]===ch) r.push({x,y}); return r; };
  const P=find('P');
  if(!P.length) out.push({lvl:'err',msg:'No player start P. Every map needs one.'});
  // reachability from P
  const seen=new Uint8Array(W*H);
  if(P.length){ const q=[P[0]]; seen[P[0].y*W+P[0].x]=1; while(q.length){ const {x,y}=q.pop(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const k=ny*W+nx; if(seen[k]||!walkable(S.g[ny][nx])) continue; seen[k]=1; q.push({x:nx,y:ny}); } } }
  S.unreach=new Uint8Array(W*H); let dead=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const ch=S.g[y][x]; if(walkable(ch)&&!seen[y*W+x]&&P.length){ if(ch!=='&'&&ch!=='_'){ S.unreach[y*W+x]=1; dead++; } else S.unreach[y*W+x]=1; } }
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const ch=S.g[y][x]; if(!isMarker(ch)||!P.length) continue;
    if(!seen[y*W+x]) out.push({lvl:'err',msg:`${labelOf(ch)} at ${x},${y} cannot be reached from P.`,x,y}); }
  // pads
  for(const r of find('R')){ const foot=[[0,0],[1,0],[0,1],[1,1]];
    if(foot.some(([i,j])=>!walkable(at(r.x+i,r.y+j))||(i||j)&&isMarker(at(r.x+i,r.y+j)))) { out.push({lvl:'err',msg:`Relay pad at ${r.x},${r.y} needs 2×2 free ground (it is the top-left tile).`,x:r.x,y:r.y}); continue; }
    const ring=[]; for(let j=-1;j<=2;j++) for(let i=-1;i<=2;i++){ if(i>=0&&i<=1&&j>=0&&j<=1) continue; if(walkable(at(r.x+i,r.y+j))) ring.push([r.x+i,r.y+j]); }
    const inF=(x,y)=>x>=r.x&&x<=r.x+1&&y>=r.y&&y<=r.y+1, s2=new Set([ring[0]+'']), q=[ring[0]];
    while(q.length){ const [x,y]=q.pop(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy, k=nx+','+ny; if(s2.has(k)||inF(nx,ny)||!walkable(at(nx,ny))) continue; s2.add(k); q.push([nx,ny]); } }
    if(!ring.every(p=>s2.has(p+''))) out.push({lvl:'warn',msg:`Relay pad at ${r.x},${r.y} would cut a passage once a tower stands on it. The game then refuses to build there.`,x:r.x,y:r.y}); }
  // starts and hives need room
  const room=(p,what)=>{ for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){ const c=at(p.x+i,p.y+j); if(!walkable(c)) return out.push({lvl:'warn',msg:`${what} at ${p.x},${p.y} needs 3×3 open ground around it.`,x:p.x,y:p.y}); } };
  P.forEach(p=>room(p,'Player start (Command Post)'));
  const hives=[]; for(const c of 'abcdefghijklmn') find(c).forEach(p=>{ hives.push(p); room(p,`Hive site ${c}`); });
  if(!hives.length) out.push({lvl:'warn',msg:'No hive sites (a–n). Skirmish on this map would be won immediately.'});
  // duplicates
  for(const c of 'PQ0123456789abcdefghijklmn'){ const n=find(c).length; if(n>1) out.push({lvl:'warn',msg:`Marker ${c} is used ${n} times. The game only uses the first.`}); }
  // border
  let open=0; for(let x=0;x<W;x++){ if(walkable(S.g[0][x])) open++; if(walkable(S.g[H-1][x])) open++; } for(let y=0;y<H;y++){ if(walkable(S.g[y][0])) open++; if(walkable(S.g[y][W-1])) open++; }
  if(open) out.push({lvl:'warn',msg:`${open} open tiles on the edge. A rock border looks better (button "Rock border").`});
  if(dead>40) out.push({lvl:'warn',msg:`${dead} walkable tiles cannot be reached from P. Show them with "Unreachable".`});
  if(!/^[a-z][a-z0-9]*$/.test(S.key)) out.push({lvl:'err',msg:'Key must start with a letter and contain only lowercase letters and digits.'});
  if(GAME_MAPS[S.key] && GAME_MAPS[S.key].name!==S.name) out.push({lvl:'warn',msg:`Key "${S.key}" is already used by ${GAME_MAPS[S.key].name}. Its map file would be replaced.`});
  if(!out.some(o=>o.lvl==='err')) out.unshift({lvl:'ok',msg:`Playable: ${hives.length} hive site${hives.length===1?'':'s'}, ${find('R').length} relay pads, ${find('S').length} crates.`});
  S.checks=out; renderChecks();
}
function labelOf(ch){ if(ch==='P') return 'Player start'; if(ch==='Q') return 'Second start'; if(ch==='R') return 'Relay pad'; if(ch==='S') return 'Crate'; if(ch==='W') return 'Grazer herd'; if(/[0-9]/.test(ch)) return `Waypoint ${ch}`; if(/[a-n]/.test(ch)) return `Hive site ${ch}`; return `Marker ${ch}`; }
function renderChecks(){ $('#checks').innerHTML=S.checks.map((c,i)=>`<button type="button" class="chk ${c.lvl}" data-chk="${i}"><i></i><span>${c.msg}</span></button>`).join(''); }
$('#checks').addEventListener('click',e=>{ const b=e.target.closest('[data-chk]'); if(!b) return; const c=S.checks[+b.dataset.chk]; if(c.x==null) return;
  const r=stage.getBoundingClientRect(); S.ox=Math.round(r.width/2-(c.x+.5)*S.zoom); S.oy=Math.round(r.height/2-(c.y+.5)*S.zoom); S.flash=[{x:c.x,y:c.y}]; draw(); setTimeout(()=>{ S.flash=[]; draw(); },1400); });

let vTimer=null, saveTimer=null;
function changed(now){ S.dirty=true; draw(); clearTimeout(vTimer); vTimer=setTimeout(()=>{ validate(); draw(); }, now?0:120);
  clearTimeout(saveTimer); saveTimer=setTimeout(()=>store.set('hc-editor-current',{key:S.key,name:S.name,desc:S.desc,layout:snapshot()}),400);
  $('#b-undo').disabled=!S.undo.length; $('#b-redo').disabled=!S.redo.length; }

/* ---------- input ---------- */
const P={ down:false, btn:0, last:null, start:null, preview:null, pan:null, space:false };
stage.addEventListener('contextmenu',e=>e.preventDefault());
stage.addEventListener('pointerdown',e=>{
  stage.setPointerCapture(e.pointerId); const r=stage.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top, c=cellAt(px,py);
  if(e.button===2||e.button===1||P.space){ P.pan={x:e.clientX,y:e.clientY,ox:S.ox,oy:S.oy}; return; }
  if(c.x<0||c.y<0||c.x>=S.w||c.y>=S.h) return;
  P.down=true; P.start=c; P.last=c;
  if(S.tool==='pick'){ const ch=S.g[c.y][c.x]; if(/[0-9]/.test(ch)){ S.paint='#num'; $('#m-num').value=ch; } else if(/[a-n]/.test(ch)){ S.paint='#hive'; $('#m-hive').value=ch; } else S.paint=ch; renderPalette(); setTool('brush'); P.down=false; return; }
  pushUndo();
  if(S.tool==='brush'){ brushAt(c.x,c.y); changed(); }
  else if(S.tool==='fill'){ fillAt(c.x,c.y); changed(); P.down=false; }
  else if(S.tool==='crater'||S.tool==='plateau'){ stamp(S.tool,c.x,c.y); changed(); P.down=false; }
  else if(S.tool==='rect'){ P.preview={type:'rect',x0:c.x,y0:c.y,x1:c.x,y1:c.y}; draw(); }
});
stage.addEventListener('pointermove',e=>{
  const r=stage.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top, c=cellAt(px,py);
  if(P.pan){ S.ox=P.pan.ox+(e.clientX-P.pan.x); S.oy=P.pan.oy+(e.clientY-P.pan.y); draw(); return; }
  const inside=c.x>=0&&c.y>=0&&c.x<S.w&&c.y<S.h;
  $('#hover').textContent= inside ? `${c.x}, ${c.y} · ${nameOf(S.g[c.y][c.x])}` : '—';
  if(P.down && S.tool==='brush' && inside){ for(const p of lineCells(P.last,c)) brushAt(p.x,p.y); P.last=c; changed(); return; }
  if(P.down && S.tool==='rect'){ P.preview={type:'rect',x0:Math.min(P.start.x,c.x),y0:Math.min(P.start.y,c.y),x1:Math.max(P.start.x,c.x),y1:Math.max(P.start.y,c.y)}; draw(); return; }
  if(inside){ P.preview= S.tool==='crater'||S.tool==='plateau' ? {type:'circle',x:c.x,y:c.y,r:S.radius} : S.tool==='brush'&&!isMarker(currentPaint()) ? {type:'brush',x:c.x,y:c.y} : null; draw(); }
});
window.addEventListener('pointerup',e=>{
  if(P.pan){ P.pan=null; return; }
  if(P.down && S.tool==='rect' && P.preview){ const p=P.preview; rectFill({x:p.x0,y:p.y0},{x:p.x1,y:p.y1}); P.preview=null; changed(); }
  P.down=false;
});
stage.addEventListener('pointerleave',()=>{ if(!P.down){ P.preview=null; draw(); } });
stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(); zoomAt(e.deltaY<0?1.2:1/1.2,e.clientX-r.left,e.clientY-r.top); },{passive:false});
mini.addEventListener('pointerdown',e=>{ const r=mini.getBoundingClientRect(), s=mini.width/S.w/(r.width/mini.width); const x=(e.clientX-r.left)/(r.width/S.w), y=(e.clientY-r.top)/(r.height/S.h); const sr=stage.getBoundingClientRect(); S.ox=Math.round(sr.width/2-x*S.zoom); S.oy=Math.round(sr.height/2-y*S.zoom); draw(); });
function nameOf(ch){ const t=TERRAIN.find(t=>t.ch===ch); return t?t.name:labelOf(ch); }
window.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')) return;
  if(e.key===' '){ P.space=true; e.preventDefault(); return; }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); return; }
  if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){ e.preventDefault(); redo(); return; }
  const tl=TOOLS.find(t=>t.key.toLowerCase()===e.key.toLowerCase()); if(tl){ setTool(tl.id); return; }
  const tt=TERRAIN.find(t=>t.key&&t.key===e.key); if(tt){ S.paint=tt.ch; renderPalette(); if(['pick','crater','plateau'].includes(S.tool)) setTool('brush'); return; }
  if(e.key==='+'||e.key==='='){ const r=stage.getBoundingClientRect(); zoomAt(1.2,r.width/2,r.height/2); }
  if(e.key==='-'){ const r=stage.getBoundingClientRect(); zoomAt(1/1.2,r.width/2,r.height/2); }
  if(e.key==='Escape') document.querySelectorAll('.modal').forEach(m=>m.hidden=true);
});
window.addEventListener('keyup',e=>{ if(e.key===' ') P.space=false; });
function undo(){ const s=S.undo.pop(); if(!s) return; S.redo.push({g:snapshot(),w:S.w,h:S.h}); restore(s); syncProps(); }
function redo(){ const s=S.redo.pop(); if(!s) return; S.undo.push({g:snapshot(),w:S.w,h:S.h}); restore(s); syncProps(); }

/* ---------- palette ---------- */
function swatch(ch){ const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d');
  if(TEX[ch]) x.drawImage(TEX[ch][0],0,0); else { x.fillStyle='#454852'; x.fillRect(0,0,16,16); x.fillStyle= ch==='P'?'#ffb347': ch==='Q'?'#ffd38a': ch==='#hive'?'#7a5a8e': ch==='R'?'#f2c230': ch==='S'?'#4f5766': ch==='W'?'#d3c3a6':'#dde1ea'; x.beginPath(); x.arc(8,8,6,0,Math.PI*2); x.fill(); }
  return c.toDataURL(); }
function renderPalette(){
  const mk=(list,el)=>{ $(el).innerHTML=list.map(t=>`<button type="button" class="tile ${S.paint===t.ch?'on':''}" data-paint="${t.ch}" title="${t.name}"><canvas data-sw="${t.ch}"></canvas><span>${t.name}</span><kbd>${t.key||(t.ch.length===1?t.ch:'')}</kbd></button>`).join('');
    $(el).querySelectorAll('[data-sw]').forEach(c=>{ const img=new Image(); img.onload=()=>{ c.width=16; c.height=16; c.getContext('2d').drawImage(img,0,0); }; img.src=swatch(c.dataset.sw); }); };
  mk(TERRAIN,'#pal-terrain'); mk(MARKERS,'#pal-markers');
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-paint]'); if(!b) return; S.paint=b.dataset.paint; renderPalette(); if(['pick','crater','plateau','fill','rect'].includes(S.tool)&&isMarker(currentPaint())) setTool('brush'); else if(['pick','crater','plateau'].includes(S.tool)) setTool('brush'); });
$('#m-num').innerHTML=[...'0123456789'].map(c=>`<option>${c}</option>`).join('');
$('#m-hive').innerHTML=[...'abcdefghijklmn'].map(c=>`<option>${c}</option>`).join('');
$('#m-num').addEventListener('change',()=>{ S.paint='#num'; renderPalette(); setTool('brush'); });
$('#m-hive').addEventListener('change',()=>{ S.paint='#hive'; renderPalette(); setTool('brush'); });
function setTool(id){ S.tool=id; $('#tools').innerHTML=TOOLS.map(t=>`<button type="button" class="tool ${t.id===id?'on':''}" data-tool="${t.id}" title="${t.name} (${t.key})"><b>${t.glyph}</b><span>${t.name}</span></button>`).join('');
  $('#opt-brush').hidden=id!=='brush'; $('#opt-stamp').hidden=!(id==='crater'||id==='plateau'); P.preview=null; draw(); }
$('#tools').addEventListener('click',e=>{ const b=e.target.closest('[data-tool]'); if(b) setTool(b.dataset.tool); });
$('#brush-seg').innerHTML=[1,2,3,5,7].map(n=>`<button type="button" data-b="${n}">${n}</button>`).join('');
$('#brush-seg').addEventListener('click',e=>{ const b=e.target.closest('[data-b]'); if(!b) return; S.brush=+b.dataset.b; syncSeg(); });
$('#ramp-seg').innerHTML=['N','E','S','W'].map(n=>`<button type="button" data-r="${n}">${n}</button>`).join('');
$('#ramp-seg').addEventListener('click',e=>{ const b=e.target.closest('[data-r]'); if(!b) return; const k=b.dataset.r; S.ramps=S.ramps.includes(k)?S.ramps.filter(x=>x!==k):[...S.ramps,k]; syncSeg(); });
$('#rad').addEventListener('input',()=>{ S.radius=+$('#rad').value; $('#rad-val').textContent=S.radius; });
function syncSeg(){ $('#brush-seg').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.b===S.brush)); $('#ramp-seg').querySelectorAll('button').forEach(b=>b.classList.toggle('on',S.ramps.includes(b.dataset.r))); }

/* ---------- top bar ---------- */
$('#b-undo').addEventListener('click',undo); $('#b-redo').addEventListener('click',redo);
$('#b-zin').addEventListener('click',()=>{ const r=stage.getBoundingClientRect(); zoomAt(1.25,r.width/2,r.height/2); });
$('#b-zout').addEventListener('click',()=>{ const r=stage.getBoundingClientRect(); zoomAt(0.8,r.width/2,r.height/2); });
$('#b-fit').addEventListener('click',fit);
$('#b-grid').addEventListener('click',()=>{ S.grid=!S.grid; $('#b-grid').classList.toggle('on',S.grid); draw(); });
$('#b-reach').addEventListener('click',()=>{ S.reach=!S.reach; $('#b-reach').classList.toggle('on',S.reach); draw(); });
$('#b-border').addEventListener('click',addBorder);
$('#b-resize').addEventListener('click',()=>resizeMap(+$('#p-w').value,+$('#p-h').value));
$('#p-key').addEventListener('input',()=>{ S.key=$('#p-key').value.trim(); changed(); });
$('#p-name').addEventListener('input',()=>{ S.name=$('#p-name').value; changed(); });
$('#p-desc').addEventListener('input',()=>{ S.desc=$('#p-desc').value; changed(); });
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) e.target.closest('.modal').hidden=true; });
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('pointerdown',e=>{ if(e.target===m) m.hidden=true; }));

// New
let newStart='open';
$('#b-new').addEventListener('click',()=>{ $('#m-new').hidden=false; });
$('#n-start').addEventListener('click',e=>{ const b=e.target.closest('[data-v]'); if(!b) return; newStart=b.dataset.v; $('#n-start').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); });
$('#n-go').addEventListener('click',()=>{ const w=clamp(+$('#n-w').value||64,24,140), h=clamp(+$('#n-h').value||44,20,140);
  let g=[]; for(let y=0;y<h;y++){ const r=[]; for(let x=0;x<w;x++) r.push(newStart==='rock'?'#':'.'); g.push(r); }
  if(newStart==='caves'){ for(let y=0;y<h;y++) for(let x=0;x<w;x++) g[y][x]=Math.random()<0.53?'#':'.';
    for(let k=0;k<4;k++){ const n=g.map(r=>r.slice()); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let c=0; for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){ if(!i&&!j) continue; const yy=y+j, xx=x+i; if(yy<0||xx<0||yy>=h||xx>=w||g[yy][xx]==='#') c++; } n[y][x]=c>=5?'#':'.'; } g=n; } }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(x===0||y===0||x===w-1||y===h-1) g[y][x]='#';
  if(newStart!=='rock'){ const px=Math.floor(w/2), py=h-6; for(let j=-3;j<=3;j++) for(let i=-4;i<=4;i++) g[py+j][px+i]= Math.abs(j)<=2&&Math.abs(i)<=3?'=':'.'; g[py][px]='P'; }
  load(g.map(r=>r.join('')),{key:'mymap',name:'New map',desc:''}); $('#m-new').hidden=true; });

// Open
function drafts(){ return store.get('hc-editor-drafts',{}); }
$('#b-open').addEventListener('click',()=>{
  $('#open-game').innerHTML=Object.entries(GAME_MAPS).map(([k,m])=>`<div class="item"><span><b>${m.name}</b><br><small>${m.layout[0].length}×${m.layout.length} · key ${k}</small></span><span></span><button class="btn" type="button" data-open-game="${k}">Open</button></div>`).join('');
  const d=drafts(); const ks=Object.keys(d);
  $('#open-drafts').innerHTML= ks.length ? ks.map(k=>`<div class="item"><span><b>${d[k].name}</b><br><small>${d[k].layout[0].length}×${d[k].layout.length} · key ${k} · ${new Date(d[k].at).toLocaleString()}</small></span><button class="btn" type="button" data-del-draft="${k}">Delete</button><button class="btn" type="button" data-open-draft="${k}">Open</button></div>`).join('') : '<p class="hint">No drafts yet. Use Export → Save as draft.</p>';
  $('#m-open').hidden=false; });
$('#m-open').addEventListener('click',e=>{
  const g=e.target.closest('[data-open-game]'); if(g){ const m=GAME_MAPS[g.dataset.openGame]; load(m.layout,{key:g.dataset.openGame,name:m.name,desc:m.desc}); $('#m-open').hidden=true; toast(`Opened ${m.name}`); return; }
  const o=e.target.closest('[data-open-draft]'); if(o){ const m=drafts()[o.dataset.openDraft]; load(m.layout,{key:o.dataset.openDraft,name:m.name,desc:m.desc}); $('#m-open').hidden=true; toast(`Opened draft ${m.name}`); return; }
  const d=e.target.closest('[data-del-draft]'); if(d){ if(d.dataset.armed!=='1'){ d.dataset.armed='1'; d.textContent='Sure?'; return; } const all=drafts(); delete all[d.dataset.delDraft]; store.set('hc-editor-drafts',all); $('#b-open').click(); }
});

// Export
function exportJSON(){ return JSON.stringify({ key:S.key, name:S.name, desc:S.desc, layout:snapshot() }); }
function exportCode(){ const esc=s=>s.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); const L=snapshot();
  return `'use strict';\n/* ${S.name} — ${L[0].length}×${L.length} tiles. Legend: see _maps.js */\nMAPS.${S.key} = {\n  name:'${esc(S.name)}',\n  desc:'${esc(S.desc)}',\n  layout: [\n`+L.map(r=>'    '+JSON.stringify(r)).join(',\n')+`\n  ]\n};\n`; }
function exportTag(){ return `<script src="js/content/maps/${S.key}.js"></script>`; }
$('#b-export').addEventListener('click',()=>{ validate(); const errs=S.checks.filter(c=>c.lvl==='err').length;
  $('#x-json').value=exportJSON(); $('#x-code').value=exportCode(); $('#x-tag').value=exportTag(); $('#x-fname').textContent=`js/content/maps/${S.key}.js`; $('#m-export').hidden=false; if(errs) toast(`${errs} problem${errs>1?'s':''} still open: see Checks`); });
function copy(id){ const ta=$(id); navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),()=>{ ta.focus(); ta.select(); toast('Press Ctrl+C to copy'); }); }
$('#x-copy-json').addEventListener('click',()=>copy('#x-json'));
$('#x-copy-code').addEventListener('click',()=>copy('#x-code'));
$('#x-download').addEventListener('click',()=>{ try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([exportCode()],{type:'text/javascript'})); a.download=S.key+'.js'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast(`Downloaded ${S.key}.js`); }catch(e){ toast('Download blocked here: use Copy file'); } });
$('#x-draft').addEventListener('click',()=>{ const all=drafts(); all[S.key]={name:S.name,desc:S.desc,layout:snapshot(),at:Date.now()}; store.set('hc-editor-drafts',all); toast(`Saved draft "${S.name}"`); });

// Import
$('#b-import').addEventListener('click',()=>{ $('#i-text').value=''; $('#m-import').hidden=false; $('#i-text').focus(); });
$('#i-go').addEventListener('click',()=>{ const txt=$('#i-text').value.trim(); let m=null;
  try{ const o=JSON.parse(txt); if(Array.isArray(o)) m={layout:o}; else if(o&&o.layout) m=o; }catch(e){}
  if(!m){ const lay=txt.match(/layout\s*:\s*\[([\s\S]*?)\]/); const rows=(lay?lay[1]:txt).match(/"([^"]*)"/g);
    if(rows&&rows.length>4){ m={layout:rows.map(r=>JSON.parse(r))}; const k=txt.match(/MAPS\.(\w+)\s*=/)||txt.match(/^\s*(\w+)\s*:\s*\{/); if(k) m.key=k[1]; const n=txt.match(/name\s*:\s*'([^']*)'/); if(n) m.name=n[1]; const d=txt.match(/desc\s*:\s*'([^']*)'/); if(d) m.desc=d[1]; }
    else { const plain=txt.split(/\r?\n/).map(s=>s.replace(/\s+$/,'')).filter(s=>s.length>8); if(plain.length>4) m={layout:plain}; } }
  if(!m||!m.layout||m.layout.length<5){ toast('Could not read a map from that text'); return; }
  load(m.layout,{key:m.key||'imported',name:m.name||'Imported map',desc:m.desc||''}); $('#m-import').hidden=true; toast('Imported'); });

/* ---------- boot ---------- */
window.addEventListener('resize',resize);
renderPalette(); setTool('brush'); syncSeg();
const cur=store.get('hc-editor-current',null);
requestAnimationFrame(()=>{ resize();
  if(cur&&cur.layout&&cur.layout.length>4) load(cur.layout,cur); else { const k=Object.keys(GAME_MAPS)[0]; if(k){ const m=GAME_MAPS[k]; load(m.layout,{key:k,name:m.name,desc:m.desc}); } else load(Array.from({length:44},(_,y)=>(y===0||y===43)?'#'.repeat(64):'#'+'.'.repeat(62)+'#'),{key:'newmap',name:'New map',desc:''}); } });
setInterval(()=>{ $('#status').textContent=`${S.w}×${S.h} · ${S.name} · zoom ${S.zoom}px`; },500);
