'use strict';
/* ---------- 2e. grid & pathfinding ---------- */
function walkableT(x,y){ return x>=0&&y>=0&&x<G.map.w&&y<G.map.h&&G.block[y*G.map.w+x]===0; }
function walkableP(x,y){ return walkableT(Math.floor(x/TILE),Math.floor(y/TILE)); }
let PB=null;
function initPathBuffers(){ const N=G.map.w*G.map.h; PB={ g:new Float32Array(N), from:new Int32Array(N), stamp:new Uint32Array(N), closed:new Uint32Array(N), gen:0, heap:[], hf:[] }; }
function nearestWalkable(tx,ty){ for(const o of SPIRAL){ if(walkableT(tx+o.x,ty+o.y)) return {x:tx+o.x,y:ty+o.y}; } return null; }
function findPath(sx,sy,gx,gy,raw){
  const m=G.map, W=m.w;
  let s={x:Math.floor(sx/TILE),y:Math.floor(sy/TILE)}, t={x:Math.floor(gx/TILE),y:Math.floor(gy/TILE)}, exact=true;
  if(!walkableT(s.x,s.y)) s=nearestWalkable(s.x,s.y);
  if(!walkableT(t.x,t.y)){ t=nearestWalkable(t.x,t.y); exact=false; }
  if(!s||!t) return null;
  if(s.x===t.x&&s.y===t.y) return [exact?{x:gx,y:gy}:{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}];
  if(lineClear(sx,sy,exact?gx:(t.x+.5)*TILE,exact?gy:(t.y+.5)*TILE)) return [exact?{x:gx,y:gy}:{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}];
  const gen=++PB.gen, start=s.y*W+s.x, goal=t.y*W+t.x;
  const H=(i)=>{ const dx=Math.abs(i%W-t.x), dy=Math.abs((i/W|0)-t.y); return (dx+dy)+(1.4142-2)*Math.min(dx,dy); };
  const heap=PB.heap, hf=PB.hf; heap.length=0; hf.length=0;
  const push=(i,f)=>{ heap.push(i); hf.push(f); let k=heap.length-1; while(k>0){ const p=(k-1)>>1; if(hf[p]<=hf[k]) break; [heap[p],heap[k]]=[heap[k],heap[p]]; [hf[p],hf[k]]=[hf[k],hf[p]]; k=p; } };
  const pop=()=>{ const top=heap[0]; const li=heap.pop(), lf=hf.pop(); if(heap.length){ heap[0]=li; hf[0]=lf; let k=0; for(;;){ const l=2*k+1, r=l+1; let mm=k; if(l<heap.length&&hf[l]<hf[mm]) mm=l; if(r<heap.length&&hf[r]<hf[mm]) mm=r; if(mm===k) break; [heap[mm],heap[k]]=[heap[k],heap[mm]]; [hf[mm],hf[k]]=[hf[k],hf[mm]]; k=mm; } } return top; };
  PB.stamp[start]=gen; PB.g[start]=0; PB.from[start]=-1; push(start,H(start));
  let best=start, bestH=H(start), found=false, iter=0;
  const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.4142],[1,-1,1.4142],[-1,1,1.4142],[-1,-1,1.4142]];
  while(heap.length && iter++<8000){
    const cur=pop(); if(PB.closed[cur]===gen) continue; PB.closed[cur]=gen;
    if(cur===goal){ found=true; break; }
    const hc=H(cur); if(hc<bestH){ bestH=hc; best=cur; }
    const cx=cur%W, cy=cur/W|0;
    for(const [dx,dy,c] of DIRS){
      const nx=cx+dx, ny=cy+dy; if(!walkableT(nx,ny)) continue;
      if(dx&&dy&&(!walkableT(cx+dx,cy)||!walkableT(cx,cy+dy))) continue;
      const ni=ny*W+nx; if(PB.closed[ni]===gen) continue;
      const ng=PB.g[cur]+c;
      if(PB.stamp[ni]!==gen || ng<PB.g[ni]){ PB.stamp[ni]=gen; PB.g[ni]=ng; PB.from[ni]=cur; push(ni,ng+H(ni)); }
    }
  }
  let end=found?goal:best; const tiles=[];
  while(end!==-1 && end!==undefined){ tiles.push(end); if(end===start) break; end=PB.from[end]; }
  tiles.reverse();
  const pts=tiles.map(i=>({x:(i%W+.5)*TILE,y:((i/W|0)+.5)*TILE}));
  if(found&&exact) pts[pts.length-1]={x:gx,y:gy};
  if(raw) return pts;   // tile-centre path, used to get unstuck
  // string-pull smoothing
  const out=[]; let ax=sx, ay=sy, i=0;
  while(i<pts.length){ let j=pts.length-1; while(j>i && !lineClear(ax,ay,pts[j].x,pts[j].y)) j--; out.push(pts[j]); ax=pts[j].x; ay=pts[j].y; i=j+1; }
  return out;
}
function lineClear(x0,y0,x1,y1){
  const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy); if(L<1) return true;
  const nx=-dy/L*7, ny=dx/L*7, steps=Math.ceil(L/8);
  for(let i=0;i<=steps;i++){ const t=i/steps, x=x0+dx*t, y=y0+dy*t; if(!walkableP(x,y)||!walkableP(x+nx,y+ny)||!walkableP(x-nx,y-ny)) return false; }
  return true;
}
