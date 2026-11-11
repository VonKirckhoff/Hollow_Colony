'use strict';
/* ---------- 2l. fog of war ---------- */
/* Sight and rock (Nov 2026): a rock wall (#, high rock ^, crystal *, cliff %; the same tiles that stop gunfire) blocks what a unit sees.
   You do see the wall itself. A crater rim does not block. From the plateau (&) you look down over the cliff edge.
   Buildings, flares, generators and reveals see all round as before. The pattern per tile and radius is kept on the map (tiles never change). */
const SIGHT = { rockBlocks:true };
function sightMask(m,cx,cy,r){ const key=cx+','+cy+','+r; let c=m._sight; if(!c) c=m._sight=new Map(); let o=c.get(key); if(o) return o;
  const W=m.w, R=Math.ceil(r), out=[], high=m.tiles[cy*W+cx]==='&';
  for(let j=-R;j<=R;j++) for(let i=-R;i<=R;i++){ if(i*i+j*j>r*r+0.5) continue; const X=cx+i, Y=cy+j; if(X<0||Y<0||X>=W||Y>=m.h) continue;
    const n=Math.ceil(Math.max(Math.abs(i),Math.abs(j))*2); let open=true;
    for(let s=1;s<n;s++){ const tx=Math.floor(cx+0.5+i*s/n), ty=Math.floor(cy+0.5+j*s/n); if(tx===cx&&ty===cy||tx===X&&ty===Y) continue; const ch=m.tiles[ty*W+tx];
      if(FIRE_BLOCK[ch]&&!(high&&ch==='%')){ open=false; break; } }
    if(open) out.push(Y*W+X); }
  o=Int32Array.from(out); if(c.size>20000) c.clear(); c.set(key,o); return o; }
function computeFog(){
  if(afterDefeat()){ G.vis.fill(1); G.seen.fill(1); return; }   /* the mission is lost: the fog lifts so you can watch the Swarm */
  const m=G.map, W=m.w; G.vis.fill(0);
  const mark=(x,y,r)=>{ const cx=Math.floor(x/TILE), cy=Math.floor(y/TILE), R=Math.ceil(r);
    for(let j=-R;j<=R;j++) for(let i=-R;i<=R;i++){ if(i*i+j*j>r*r+0.5) continue; const X=cx+i, Y=cy+j; if(X<0||Y<0||X>=W||Y>=m.h) continue; const k=Y*W+X; G.vis[k]=1; G.seen[k]=1; } };
  // Darkness (mission option dark:{ sight }): everyone sees less, and only running generators light the area around them.
  const dk=G.mission.dark;
  for(const e of G.ents){ if(e.dead||e.faction!==G.side) continue;
    let r=e.kind==='building'&&!e.built?3:e.def.sight+(e.sightAdd||0);   /* sightAdd: Night Eyes (Rogue) */
    if(e.def.generator&&e.powered) r=Math.max(r,e.def.light); else if(dk) r=Math.max(2,r*(e.nightEyes?Math.max(dk.sight,0.9):dk.sight));
    if(r<=0) continue;
    if(SIGHT.rockBlocks&&e.kind==='unit'){ const cx=Math.floor(e.x/TILE), cy=Math.floor(e.y/TILE); if(cx<0||cy<0||cx>=W||cy>=m.h){ mark(e.x,e.y,r); continue; }
      for(const k of sightMask(m,cx,cy,Math.round(r*2)/2)){ G.vis[k]=1; G.seen[k]=1; } }   /* radius in half tiles, so the patterns can be shared */
    else mark(e.x,e.y,r); }
  if(dk&&(G.side==='swarm'||G.mission.rogue)) for(const e of G.ents) if(!e.dead&&e.def&&e.def.generator&&e.powered&&e.faction!==G.side) mark(e.x,e.y,e.def.light*0.9);   /* (Rogue: the Corps' lit streets too) */   /* playing the Swarm in the dark: their lit streets are seen from afar */
  lampReveal();   /* in the dark: what the helmet lamps light up */
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
