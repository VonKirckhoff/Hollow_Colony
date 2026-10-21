'use strict';
/* ---------- 2l. fog of war ---------- */
function computeFog(){
  if(afterDefeat()){ G.vis.fill(1); G.seen.fill(1); return; }   /* the mission is lost: the fog lifts so you can watch the Swarm */
  const m=G.map, W=m.w; G.vis.fill(0);
  const mark=(x,y,r)=>{ const cx=Math.floor(x/TILE), cy=Math.floor(y/TILE), R=Math.ceil(r);
    for(let j=-R;j<=R;j++) for(let i=-R;i<=R;i++){ if(i*i+j*j>r*r+0.5) continue; const X=cx+i, Y=cy+j; if(X<0||Y<0||X>=W||Y>=m.h) continue; const k=Y*W+X; G.vis[k]=1; G.seen[k]=1; } };
  // Darkness (mission option dark:{ sight }): everyone sees less, and only running generators light the area around them.
  const dk=G.mission.dark;
  for(const e of G.ents){ if(e.dead||e.faction!==G.side) continue;
    let r=e.kind==='building'&&!e.built?3:e.def.sight;
    if(e.def.generator&&e.powered) r=Math.max(r,e.def.light); else if(dk) r=Math.max(2,r*dk.sight);
    if(r>0) mark(e.x,e.y,r); }
  G.reveals=G.reveals.filter(r=>r.until>G.time); for(const r of G.reveals) mark(r.x,r.y,r.r);
  for(const f of G.flareList) if(flareLit(f)) mark(f.x,f.y,SQUAD.flare.light);
  if(G.devReveal){ G.vis.fill(1); G.seen.fill(1); }   /* dev panel: the whole map stays revealed */
  if(G.side==='swarm'&&G.creep){ const C=G.creep; for(let k=0;k<C.length;k++) if(C[k]>0.3){ G.vis[k]=1; G.seen[k]=1; } }   /* the Swarm feels everything that touches its creep */
}
let fogCanvas=null, fogCtx=null, fogImg=null;
function paintFog(){
  const m=G.map;
  if(!fogCanvas||fogCanvas.width!==m.w||fogCanvas.height!==m.h){ [fogCanvas,fogCtx]=pxCtx(m.w,m.h); fogImg=fogCtx.createImageData(m.w,m.h); }
  const d=fogImg.data, seenA=G.mission.dark?238:150;   /* in the dark, what you saw earlier fades almost to black */
  for(let i=0;i<m.w*m.h;i++){ d[i*4]=5; d[i*4+1]=6; d[i*4+2]=10; d[i*4+3]=G.vis[i]?0:(G.seen[i]?seenA:250); }
  fogCtx.putImageData(fogImg,0,0);
}
