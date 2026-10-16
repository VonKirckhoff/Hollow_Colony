'use strict';
/* ---------- 2l. fog of war ---------- */
function computeFog(){
  const m=G.map, W=m.w; G.vis.fill(0);
  const mark=(x,y,r)=>{ const cx=Math.floor(x/TILE), cy=Math.floor(y/TILE), R=Math.ceil(r);
    for(let j=-R;j<=R;j++) for(let i=-R;i<=R;i++){ if(i*i+j*j>r*r+0.5) continue; const X=cx+i, Y=cy+j; if(X<0||Y<0||X>=W||Y>=m.h) continue; const k=Y*W+X; G.vis[k]=1; G.seen[k]=1; } };
  for(const e of G.ents){ if(e.dead||e.faction!=='corps') continue; mark(e.x,e.y,e.kind==='building'&&!e.built?3:e.def.sight); }
  G.reveals=G.reveals.filter(r=>r.until>G.time); for(const r of G.reveals) mark(r.x,r.y,r.r);
}
let fogCanvas=null, fogCtx=null, fogImg=null;
function paintFog(){
  const m=G.map;
  if(!fogCanvas||fogCanvas.width!==m.w||fogCanvas.height!==m.h){ [fogCanvas,fogCtx]=pxCtx(m.w,m.h); fogImg=fogCtx.createImageData(m.w,m.h); }
  const d=fogImg.data; for(let i=0;i<m.w*m.h;i++){ d[i*4]=5; d[i*4+1]=6; d[i*4+2]=10; d[i*4+3]=G.vis[i]?0:(G.seen[i]?150:250); }
  fogCtx.putImageData(fogImg,0,0);
}
