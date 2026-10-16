'use strict';
/* ---------- 2b. maps ---------- */
const TILE_DEF = {
  '.':{walk:1,mm:'#454852'}, ',':{walk:1,mm:'#55524d'}, 'o':{walk:1,mm:'#3d4049'}, '~':{walk:1,mm:'#7fa1b0'},
  '=':{walk:1,mm:'#59616f'}, '#':{walk:0,mm:'#1d1e25'}, '^':{walk:0,mm:'#141419'}, '*':{walk:0,mm:'#5c4a96'},
  ')':{walk:0,mm:'#8a8c95'}, '_':{walk:1,mm:'#33353d'}, ':':{walk:1,mm:'#6a6a70'},
  '&':{walk:1,mm:'#6e6c72'}, '%':{walk:0,mm:'#a9a6a0'}
};
const MAP_CACHE={};
/* Custom maps added in Skirmish → Load map code (made with the Map Editor). Stored in this browser. */
function loadCustomMaps(){ const c=store.get('hc-custom-maps',{}); for(const [k,m] of Object.entries(c)) MAPS[k]={...m, custom:true}; }
function addCustomMap(text){
  let m; try{ m=JSON.parse(text.trim()); }catch(e){ return 'That is not valid map code. Copy it again from the editor (Export → Copy map code).'; }
  if(!m||!Array.isArray(m.layout)||m.layout.length<10||!m.layout.every(r=>typeof r==='string')) return 'The map code has no usable layout.';
  if(!m.layout.some(r=>r.includes('P'))) return 'The map has no player start P.';
  const key='custom-'+String(m.key||'map').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);
  const all=store.get('hc-custom-maps',{}); all[key]={ name:String(m.name||'Custom map').slice(0,40), desc:String(m.desc||'Made with the Map Editor.').slice(0,140), layout:m.layout };
  store.set('hc-custom-maps',all); MAPS[key]={...all[key],custom:true}; delete MAP_CACHE[key]; return key; }
function removeCustomMap(key){ const all=store.get('hc-custom-maps',{}); delete all[key]; store.set('hc-custom-maps',all); delete MAPS[key]; delete MAP_CACHE[key]; }
function loadMap(id){
  if(MAP_CACHE[id]) return MAP_CACHE[id];
  const def=MAPS[id], rows=def.layout, h=rows.length, w=Math.max(...rows.map(r=>r.length));
  const m={ id, name:def.name, w, h, tiles:new Array(w*h), walk:new Uint8Array(w*h), points:{}, sites:[], crates:[], wild:[] };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let ch=rows[y][x]||'#'; const i=y*w+x;
    if(!TILE_DEF[ch]){
      if(ch==='R') m.sites.push({x,y}); else if(ch==='S') m.crates.push({x,y}); else if(ch==='W') m.wild.push({x,y});
      else (m.points[ch]=m.points[ch]||[]).push({x,y});
      ch = ch==='R' ? '=' : '.';
    }
    m.tiles[i]=ch; m.walk[i]=TILE_DEF[ch].walk;
  }
  // markers (points, pads, crates) sitting on a plateau or crater floor take on that ground
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const raw=rows[y][x]||'#'; if(TILE_DEF[raw]) continue; const cnt={};
    for(let j=-1;j<=1;j++) for(let k=-1;k<=1;k++){ const c=(rows[y+j]||'')[x+k]; if(c==='&'||c==='_') cnt[c]=(cnt[c]||0)+1; }
    for(const c of ['&','_']) if((cnt[c]||0)>=3){ m.tiles[y*w+x]=c; m.walk[y*w+x]=1; } }
  m.height=new Int8Array(m.w*m.h); for(let i=0;i<m.w*m.h;i++){ const c=m.tiles[i]; m.height[i]= c==='&'||c==='%' ? 1 : c==='_' ? -1 : 0; }
  m.ground=renderGround(m); m.mini=renderMini(m);
  MAP_CACHE[id]=m; return m;
}
/* Height map: plateau = 1, normal ground and ramps = 0, crater floor = -1. Only used to keep burrowing Swarm off plateaus and crater floors. */
function tileAt(m,x,y){ return (x<0||y<0||x>=m.w||y>=m.h) ? '^' : m.tiles[y*m.w+x]; }
function renderGround(m){
  const S=16, [c,x]=pxCtx(m.w*S,m.h*S); const img=x.createImageData(m.w*S,m.h*S), d=img.data;
  const put=(px,py,r,g,b)=>{ const i=(py*m.w*S+px)*4; d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=255; };
  const rockish=ch=>ch==='#'||ch==='^'||ch==='*';
  const raised=ch=>rockish(ch)||ch===')';
  for(let ty=0;ty<m.h;ty++) for(let tx=0;tx<m.w;tx++){
    const ch=tileAt(m,tx,ty), up=tileAt(m,tx,ty-1), dn=tileAt(m,tx,ty+1);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){
      const px=tx*S+i, py=ty*S+j, n=hash2(px,py,7), n2=hash2(px>>2,py>>2,3);
      let r,g,b;
      if(ch==='%'){  // cliff face: tall, layered rock with a lit top edge
        const v=78+(n2*10|0)+((j+(hash2(tx,0,4)*4|0))%5===0?-12:0); r=v+6; g=v+4; b=v;
        if(up!=='%' && j<5){ r+=60-j*11; g+=58-j*11; b+=52-j*10; }
        if(dn!=='%'){ const k=Math.max(0,(j-6)*5); r-=k; g-=k; b-=k; }
      } else if(ch===')'){  // crater rim: a raised, sunlit ridge
        const v=98+(n2*14|0)+(n>0.92?14:0)-(n<0.07?18:0); r=v; g=v; b=v+6;
        if(up!==')' && j<4){ r+=40-j*9; g+=40-j*9; b+=36-j*8; }
        if(dn!==')' && j>10){ const k=(j-10)*9; r-=k; g-=k; b-=k-4; }
        if(tileAt(m,tx-1,ty)!==')' && i<2){ r+=14; g+=14; b+=12; }
        if(tileAt(m,tx+1,ty)!==')' && i>13){ r-=16; g-=16; b-=12; }
      } else if(rockish(ch)){
        const base = ch==='^' ? 26 : 36; const v=base + (n2*10|0) + (n>0.93?10:0);
        r=v; g=v; b=v+8;
        if(!rockish(up) && j<3){ r+=34-j*8; g+=34-j*8; b+=40-j*8; }
        if(!rockish(dn) && j>12){ r-=8; g-=8; b-=6; }
        if(ch==='*'){ const cx=Math.abs(i-8)+Math.abs(j-9); if(cx<5 && ((i+j)%3!==0)){ const t=hash2(tx,ty,1)>0.5; r=t?142:86; g=t?108:226; b=t?240:206; if(cx<2){r+=60;g+=30;b+=10;} } }
      } else {
        let base=[70,72,82];
        if(ch===',') base=[86,82,76];
        if(ch==='~') base=[132,164,180];
        if(ch==='=') base=[60,67,79];
        if(ch==='_') base=[50,52,60];
        if(ch==='&') base=[98,95,98];
        if(ch===':') base=[80,80,86];
        const k=(n2-0.5)*10 + (n>0.9?9:0) - (n<0.06?10:0);
        r=base[0]+k; g=base[1]+k; b=base[2]+k;
        if(ch==='~' && ((i+j*2+tx*3)%11===0)){ r+=30; g+=30; b+=24; }
        if(ch==='='){ if(i===0||j===0){ r-=16; g-=16; b-=14; } if((i===3||i===12)&&(j===3||j===12)){ r+=40; g+=40; b+=40; } }
        if(ch==='o'){ const dx=i-7.5, dy=j-7.5, rr=Math.sqrt(dx*dx+dy*dy); if(rr<6.5){ const shade = dy<0 ? -14 : 8; r+=shade; g+=shade; b+=shade; } if(rr>=5.5&&rr<7) { r+=dy<0?14:-10; g+=dy<0?14:-10; b+=dy<0?14:-10; } }
        if(rockish(up) && j<4){ r-=22-j*5; g-=22-j*5; b-=18-j*4; }
        if(up==='%'){ const k=Math.max(0,44-j*4); r-=k; g-=k; b-=k*0.85; }   // long cliff shadow on the ground below
        if(ch==='&' && (tileAt(m,tx-1,ty)==='%'||tileAt(m,tx+1,ty)==='%') && (i<2||i>13)){ r+=10; g+=10; b+=8; }
        if(up===')'){ const k=ch==='_'?Math.max(0,30-j*3):Math.max(0,18-j*5); r-=k; g-=k; b-=k*0.8; }   // the rim casts a shadow
        if(ch==='_' && dn===')' && j>9){ const k=(j-9)*4; r+=k; g+=k; b+=k; }                              // sunlit inner wall
        if(ch===':' && j%4===1){ r-=12; g-=12; b-=10; }                                                       // ramp grooves
      }
      put(px,py,clamp(r,0,255),clamp(g,0,255),clamp(b,0,255));
    }
  }
  x.putImageData(img,0,0);
  for(const s of m.sites){ const X=s.x*S, Y=s.y*S; x.fillStyle='#2a3038'; x.fillRect(X+2,Y+2,28,28);
    x.fillStyle=PALETTE.y; for(const [a,b2] of [[2,2],[26,2],[2,26],[26,26]]){ x.fillRect(X+a,Y+b2,4,1); x.fillRect(X+a,Y+b2,1,4); x.fillRect(X+a+3,Y+b2,1,4); x.fillRect(X+a,Y+b2+3,4,1);}
    x.fillStyle='#4a5366'; x.fillRect(X+12,Y+12,8,8); x.fillStyle=PALETTE.y; x.fillRect(X+15,Y+10,2,12); x.fillRect(X+10,Y+15,12,2); }
  return c;
}
function renderMini(m){ const [c,x]=pxCtx(m.w,m.h);
  for(let y=0;y<m.h;y++) for(let X=0;X<m.w;X++){ x.fillStyle=TILE_DEF[m.tiles[y*m.w+X]].mm; x.fillRect(X,y,1,1); }
  x.fillStyle='#c79a3a'; for(const s of m.sites) x.fillRect(s.x,s.y,2,2); return c; }
