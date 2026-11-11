'use strict';
/* ---------- 3D view (prototype) ----------
   A second way to look at the same battle. The game itself does not change: same G, same rules, same orders.
   Only the drawing (THREE.js, js/vendor/three.min.js) and the mouse-to-ground mapping (toWorld) are swapped while the view is on.
   - Switch with F3 or the "2D / 3D" button in the top bar; the choice is remembered (hc-view3d).
   - Rock, high rock, crystal and cliffs stand up out of the ground: what is behind them is hidden from the camera.
     Your own soldiers behind rock still show as a faint outline (xray), the enemy does not.
   - Mouse wheel zooms. Edge scroll, arrow keys, minimap and camera follow work as in 2D.
   Tile = 1 unit in the 3D world: map x → world x, map y → world z, up is world y. */
const VIEW3D = {
  pitch:54, dist:22, minDist:9, maxDist:42, fov:40,     /* camera: degrees above the ground, distance to the point it looks at (tiles) */
  rock:1.5, highRock:2.5, crystal:1.3, rim:0.38, cliff:1.05, plateau:0.85, crater:-0.5, rockNoise:0.55,   /* terrain heights (tiles) */
  sun:1.15, ambient:0.5, darkSun:0.1, darkAmbient:0.1, lamp:1.2, genLight:2.2,   /* light; dark: missions with mission.dark */
  unitScale:1.35, xray:0.4, shadows:true
};
const V3 = { on:store.get('hc-view3d',false), ok:false, g:null, mapId:null, objs:new Map(), frame:0 };

/* ---------- setup ---------- */
function v3Init(){
  if(V3.ok||V3.failed) return V3.ok;
  if(typeof THREE==='undefined'){ V3.failed=true; return false; }
  let r; try{ r=new THREE.WebGLRenderer({ antialias:true }); }catch(e){ V3.failed=true; return false; }
  V3.r=r; r.setClearColor(0x05060a); r.shadowMap.enabled=VIEW3D.shadows; r.shadowMap.type=THREE.PCFSoftShadowMap;
  const c=r.domElement; c.id='game3d'; c.style.cssText='position:fixed;left:0;top:0;display:none;pointer-events:none;';
  cv.parentNode.insertBefore(c,cv);
  V3.scene=new THREE.Scene();
  V3.cam=new THREE.PerspectiveCamera(VIEW3D.fov,1,0.5,300); V3.cam.layers.enable(1);
  V3.hemi=new THREE.HemisphereLight(0xa9b8d8,0x1b1a22,VIEW3D.ambient); V3.scene.add(V3.hemi);
  const sun=V3.sun=new THREE.DirectionalLight(0xe8eeff,VIEW3D.sun); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=-34; sc.right=34; sc.top=34; sc.bottom=-34; sc.near=1; sc.far=90; sun.shadow.bias=-0.0008; sun.shadow.normalBias=0.03;
  V3.scene.add(sun); V3.scene.add(sun.target);
  V3.lights=[]; for(let i=0;i<8;i++){ const l=new THREE.PointLight(0xffd690,0,9,1.6); l.position.set(0,-50,0); V3.scene.add(l); V3.lights.push(l); }
  V3.u={ fog:{value:null}, size:{value:new THREE.Vector2(1,1)} };
  V3.ray=new THREE.Raycaster(); V3.ray.layers.enableAll();
  v3MakeShared();
  V3.ok=true; return true;
}
const GEO={}, MAT={};
function v3Fogify(m){   /* darkens a material by the fog of war and tints it where the creep grows */
  m.onBeforeCompile=sh=>{ sh.uniforms.v3Fog=V3.u.fog; sh.uniforms.v3Size=V3.u.size;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 v3W;')
      .replace('#include <project_vertex>','#include <project_vertex>\n#ifdef USE_INSTANCING\n v3W=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\n v3W=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 v3W; uniform sampler2D v3Fog; uniform vec2 v3Size;')
      .replace('#include <dithering_fragment>','#include <dithering_fragment>\n vec4 v3f=texture2D(v3Fog,v3W.xz/v3Size);\n gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*vec3(0.62,0.42,0.78)+vec3(0.09,0.02,0.11),v3f.r);\n gl_FragColor.rgb*=1.0-v3f.a;'); };
  return m; }
function mat(col,o={}){ const k=col+JSON.stringify(o); if(MAT[k]) return MAT[k];
  const m=new THREE.MeshLambertMaterial({ color:col, ...o }); return MAT[k]=v3Fogify(m); }
function glow(col){ const k='glow'+col; if(MAT[k]) return MAT[k]; return MAT[k]=new THREE.MeshBasicMaterial({ color:col }); }
function v3MakeShared(){
  GEO.box=new THREE.BoxGeometry(1,1,1); GEO.ball=new THREE.SphereGeometry(1,12,9); GEO.lowball=new THREE.IcosahedronGeometry(1,0);
  GEO.cyl=new THREE.CylinderGeometry(1,1,1,10); GEO.cone=new THREE.ConeGeometry(1,1,6); GEO.ring=new THREE.RingGeometry(0.86,1,40).rotateX(-Math.PI/2);
  GEO.disc=new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2); GEO.torus=new THREE.TorusGeometry(1,0.12,6,24).rotateX(Math.PI/2); GEO.oct=new THREE.OctahedronGeometry(1,0);
  MAT.xray=new THREE.MeshBasicMaterial({ color:0x5fe3b0, transparent:true, opacity:VIEW3D.xray, depthFunc:THREE.GreaterDepth, depthWrite:false });
  MAT.depth=new THREE.MeshBasicMaterial({ colorWrite:false });
  const gc=document.createElement('canvas'); gc.width=gc.height=64; const gx=gc.getContext('2d'), gr=gx.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.35,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); gx.fillStyle=gr; gx.fillRect(0,0,64,64);
  V3.glowTex=new THREE.CanvasTexture(gc);
  /* pools: effect sprites, shots, selection rings, pings */
  V3.fxPool=[]; V3.shotPool=[]; V3.ringPool=[]; V3.pingPool=[];
  const tg=new THREE.BufferGeometry(); V3.tracerPos=new Float32Array(400*6); V3.tracerCol=new Float32Array(400*6);
  tg.setAttribute('position',new THREE.BufferAttribute(V3.tracerPos,3)); tg.setAttribute('color',new THREE.BufferAttribute(V3.tracerCol,3));
  V3.tracers=new THREE.LineSegments(tg,new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  V3.tracers.frustumCulled=false;
  V3.ghost=new THREE.Mesh(GEO.box,new THREE.MeshBasicMaterial({ color:0x5fe3b0, transparent:true, opacity:0.35, depthWrite:false }));
}

/* ---------- terrain ---------- */
const V3B=8, V3S=3;   /* border of rock round the map (tiles), vertices per tile */
function tileH(ch){ const V=VIEW3D; return ch==='#'?V.rock:ch==='^'?V.highRock:ch==='*'?V.crystal:ch===')'?V.rim:ch==='%'?V.cliff:ch==='&'?V.plateau:ch==='_'?V.crater:0; }
function v3BuildTerrain(){
  const m=G.map, W=m.w+V3B*2, H=m.h+V3B*2, NX=W*V3S+1, NZ=H*V3S+1;
  const th=new Float32Array(W*H);
  const at=(tx,ty)=>tileAt(m,tx,ty);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const tx=x-V3B, ty=y-V3B, ch=at(tx,ty); let h=tileH(ch);
    if(ch===':'){ let s=0,n=0; for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++){ const c=at(tx+i,ty+j); if(c!==':'&&TILE_DEF[c]&&TILE_DEF[c].walk){ s+=tileH(c); n++; } } h=n?s/n:0; }
    th[y*W+x]=h; }
  const hv=new Float32Array(NX*NZ), rockish=c=>c==='#'||c==='^'||c==='*'||c==='%';
  for(let j=0;j<NZ;j++) for(let i=0;i<NX;i++){
    const cs=i%V3S?[Math.floor(i/V3S)]:[i/V3S-1,i/V3S], rs=j%V3S?[Math.floor(j/V3S)]:[j/V3S-1,j/V3S];
    let s=0,n=0,allRock=true;
    for(const y of rs) for(const x of cs){ const xx=clamp(x,0,W-1), yy=clamp(y,0,H-1); s+=th[yy*W+xx]; n++; if(!rockish(at(xx-V3B,yy-V3B))) allRock=false; }
    let h=s/n; if(allRock) h+=(hash2(i,j,11)-0.35)*VIEW3D.rockNoise;
    hv[j*NX+i]=h; }
  V3.hv=hv; V3.NX=NX; V3.NZ=NZ;
  const pos=new Float32Array(NX*NZ*3), uv=new Float32Array(NX*NZ*2);
  for(let j=0;j<NZ;j++) for(let i=0;i<NX;i++){ const k=j*NX+i, x=i/V3S-V3B, z=j/V3S-V3B;
    pos[k*3]=x; pos[k*3+1]=hv[k]; pos[k*3+2]=z; uv[k*2]=x/m.w; uv[k*2+1]=1-z/m.h; }
  const idx=new Uint32Array((NX-1)*(NZ-1)*6); let p=0;
  for(let j=0;j<NZ-1;j++) for(let i=0;i<NX-1;i++){ const a=j*NX+i, b=a+1, c=a+NX, d=c+1; idx[p++]=a; idx[p++]=c; idx[p++]=b; idx[p++]=b; idx[p++]=c; idx[p++]=d; }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeVertexNormals();
  const tex=new THREE.CanvasTexture(m.ground); tex.magFilter=THREE.NearestFilter; tex.anisotropy=4; tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  const mesh=new THREE.Mesh(g,v3Fogify(new THREE.MeshLambertMaterial({ map:tex }))); mesh.receiveShadow=true; mesh.castShadow=true;
  V3.terrain=mesh; V3.g.add(mesh);
  /* crystal clusters on * tiles */
  const cr=[]; for(let y=0;y<m.h;y++) for(let x=0;x<m.w;x++) if(m.tiles[y*m.w+x]==='*') cr.push([x,y]);
  if(cr.length){ const n=cr.length*3, im=new THREE.InstancedMesh(GEO.cone,v3Fogify(new THREE.MeshLambertMaterial({ color:0x9a7ef0, emissive:0x3a2a90 })),n), o=new THREE.Object3D(); let k=0;
    for(const [x,y] of cr) for(let q=0;q<3;q++){ const px=x+0.2+hash2(x,y,q)*0.6, pz=y+0.2+hash2(y,x,q+5)*0.6, hh=0.5+hash2(x+q,y,3)*0.9;
      o.position.set(px,v3H(px,pz)+hh*0.4,pz); o.rotation.set((hash2(x,y,q+9)-0.5)*0.6,hash2(x,y,q)*6,(hash2(y,x,q+2)-0.5)*0.6); o.scale.set(0.14+hash2(x,y,q+4)*0.1,hh,0.14); o.updateMatrix(); im.setMatrixAt(k++,o.matrix); }
    im.castShadow=true; V3.g.add(im); }
  /* fog + creep texture (R creep, A fog), one texel per tile */
  V3.fogData=new Uint8Array(m.w*m.h*4); const ft=new THREE.DataTexture(V3.fogData,m.w,m.h,THREE.RGBAFormat); ft.magFilter=ft.minFilter=THREE.LinearFilter; ft.needsUpdate=true;
  V3.u.fog.value=ft; V3.u.size.value.set(m.w,m.h);
}
/* ground height at a world point (tiles), smooth between vertices */
function v3H(x,z){ const NX=V3.NX, NZ=V3.NZ; if(!V3.hv) return 0;
  const gx=clamp((x+V3B)*V3S,0,NX-1.001), gz=clamp((z+V3B)*V3S,0,NZ-1.001), i=Math.floor(gx), j=Math.floor(gz), fx=gx-i, fz=gz-j, h=V3.hv;
  return (h[j*NX+i]*(1-fx)+h[j*NX+i+1]*fx)*(1-fz)+(h[(j+1)*NX+i]*(1-fx)+h[(j+1)*NX+i+1]*fx)*fz; }
function v3Fog(){ const m=G.map, d=V3.fogData, seenA=G.mission.dark?238:150, C=G.creep;
  for(let i=0;i<m.w*m.h;i++){ d[i*4]=C?Math.min(255,(C[i]||0)*300):0; d[i*4+3]=G.vis[i]?0:(G.seen[i]?seenA:250); }
  V3.u.fog.value.needsUpdate=true; }

/* ---------- models ---------- */
function part(geo,m,w,h,d,x,y,z){ const o=new THREE.Mesh(geo,m); o.scale.set(w,h,d); o.position.set(x,y,z); o.castShadow=true; return o; }
const box=(m,w,h,d,x,y,z)=>part(GEO.box,m,w,h,d,x,y,z), ball=(m,w,h,d,x,y,z)=>part(GEO.ball,m,w,h,d,x,y,z), cyl=(m,w,h,d,x,y,z)=>part(GEO.cyl,m,w,h,d,x,y,z);
function limb(m,w,len,x,y,z,ang=0){ const p=new THREE.Group(); p.position.set(x,y,z); const b=box(m,w,len,w,0,-len/2,0); p.add(b); p.rotation.z=ang; return p; }
const SKIN={ corps:{ armor:'#4c586d', dark:'#2b313d', trim:'#8a97ab' }, osprey:{ armor:'#2c2420', dark:'#17120f', trim:'#4a3a2e', band:'#b3211c' } };
function v3Soldier(e){
  const t=e.type, P=(e.faction==='osprey'||e.crew)?SKIN.osprey:SKIN.corps, A=mat(P.armor), D=mat(P.dark), T=mat(P.trim), g=new THREE.Group(), legs=[];
  for(const s of [-1,1]){ const l=limb(D,0.1,0.32,s*0.075,0.32,0); g.add(l); legs.push(l); }
  if(t==='scientist'){ g.add(box(mat('#d9dee4'),0.3,0.4,0.2,0,0.5,0)); g.add(ball(mat('#d9a27a'),0.1,0.11,0.1,0,0.79,0)); g.add(ball(mat('#5a4632'),0.105,0.07,0.105,0,0.85,-0.01));
    g.add(box(mat('#3a6a8a'),0.12,0.14,0.05,0.1,0.48,0.12)); }   /* the data core under her arm */
  else {
    g.add(box(A,0.3,0.32,0.19,0,0.49,0)); g.add(box(T,0.36,0.08,0.21,0,0.62,0));   /* torso, shoulder plates */
    g.add(ball(D,0.1,0.1,0.1,0,0.74,0)); g.add(ball(A,0.125,0.1,0.125,0,0.79,-0.01));
    g.add(box(glow(P.band?'#ff5040':'#7ff6ff'),0.15,0.04,0.04,0,0.75,0.1));   /* visor */
    if(P.band) g.add(box(mat(P.band),0.06,0.06,0.2,-0.19,0.56,0));   /* the Rogue crew's red armband */
    const gun=new THREE.Group(); gun.position.set(0.13,0.5,0.08); g.add(gun);
    if(t==='gunner'){ gun.add(box(D,0.1,0.11,0.32,0,0,0.1)); for(const s of [-1,1]) gun.add(cyl(mat('#59616f'),0.022,0.36,0.022,s*0.025,0,0.3)); gun.children.slice(1).forEach(c=>c.rotation.x=Math.PI/2); g.add(box(mat('#3a4150'),0.26,0.26,0.12,0,0.5,-0.16)); }
    else if(t==='pyro'){ gun.add(box(D,0.07,0.08,0.38,0,0,0.12)); gun.add(box(glow('#ff8a2a'),0.04,0.04,0.04,0,0,0.33)); g.add(cyl(mat('#b9521c'),0.075,0.34,0.075,-0.07,0.52,-0.15)); g.add(cyl(mat('#b9521c'),0.075,0.34,0.075,0.07,0.52,-0.15)); }
    else { gun.add(box(D,0.05,0.07,t==='medic'?0.2:0.36,0,0,0.1)); }
    if(t==='medic'){ g.add(box(mat('#eef2f5'),0.31,0.06,0.2,0,0.43,0)); g.add(box(mat('#e2463a'),0.03,0.09,0.02,0,0.82,0.12)); g.add(box(mat('#e2463a'),0.09,0.03,0.02,0,0.82,0.12)); }
    if(t==='engineer'){ g.add(box(mat('#f2c230'),0.24,0.24,0.12,0,0.52,-0.15)); g.add(cyl(mat('#59616f'),0.01,0.3,0.01,0.08,0.78,-0.17)); }
    if(t==='husk'){ g.children.forEach(c=>{ if(c.material===A) c.material=mat('#55604a'); }); }
  }
  g.userData.legs=legs; g.userData.top=0.95; return g; }
function v3Creature(e){
  const t=e.type, g=new THREE.Group(), legs=[], C=mat('#2a2133'), C2=mat('#45304f'), eye=glow('#a6ff4a');
  const legRing=(n,len,w,y,sx,sz,m=C)=>{ for(let i=0;i<n;i++){ const side=i%2?1:-1, k=Math.floor(i/2)/Math.max(1,(n/2-1))-0.5; const l=limb(m,w,len,side*sx,y,k*sz,side*0.9); l.rotation.y=0; g.add(l); legs.push(l); } };
  if(t==='crawler'||t==='grafter'){ const s=t==='grafter'?0.6:1; g.add(ball(C,0.17*s,0.09*s,0.26*s,0,0.16*s,0)); g.add(ball(C2,0.11*s,0.08*s,0.12*s,0,0.19*s,0.2*s)); g.add(ball(eye,0.03*s,0.02*s,0.02*s,0,0.21*s,0.31*s)); legRing(6,0.22*s,0.03*s,0.17*s,0.13*s,0.36*s); }
  else if(t==='drone'||t==='spitter'||t==='husk'&&false){
    const body=ball(C,0.17,0.15,0.3,0,0.48,-0.02); body.rotation.x=-0.35; g.add(body);
    const head=ball(C2,0.1,0.1,0.26,0,0.62,0.22); head.rotation.x=0.5; g.add(head); g.add(ball(eye,0.05,0.025,0.03,0,0.6,0.35));
    for(const s of [-1,1]){ const l=limb(C,0.07,0.42,s*0.12,0.42,-0.05,s*0.25); g.add(l); legs.push(l); const a=limb(C2,0.04,0.32,s*0.17,0.56,0.12,s*0.5); a.rotation.x=-0.8; g.add(a); }
    const tail=cyl(C,0.03,0.6,0.03,0,0.42,-0.42); tail.rotation.x=1.2; g.add(tail);
    if(t==='spitter'){ g.add(ball(glow('#7ad62a'),0.17,0.15,0.2,0,0.62,-0.2)); g.add(ball(mat('#4fae22',{transparent:true,opacity:0.55}),0.21,0.18,0.24,0,0.62,-0.2)); } }
  else if(t==='brute'){ const P=mat('#3b2f45'); g.add(ball(C,0.42,0.32,0.55,0,0.7,0)); for(let i=0;i<4;i++) g.add(box(P,0.5-i*0.06,0.12,0.18,0,0.98-i*0.04,0.25-i*0.18));
    g.add(ball(C2,0.2,0.18,0.25,0,0.62,0.52)); g.add(ball(eye,0.09,0.03,0.04,0,0.64,0.74)); legRing(4,0.55,0.13,0.55,0.32,0.6); }
  else if(t==='bloater'){ g.add(ball(mat('#6d7a2e'),0.38,0.32,0.42,0,0.48,0)); g.add(ball(glow('#c7f05a'),0.2,0.12,0.2,0.1,0.72,0.05)); g.add(ball(mat('#b9b08a'),0.12,0.11,0.14,0,0.4,0.42)); legRing(4,0.26,0.07,0.24,0.24,0.5,mat('#8c8466')); }
  else if(t==='seedling'){ g.add(ball(mat('#5c3e6e'),0.3,0.34,0.3,0,0.85,0)); g.add(ball(glow('#c58cff'),0.12,0.14,0.12,0,0.95,0.12)); legRing(4,0.7,0.035,0.75,0.2,0.3); }
  else if(t==='broodmother'){ g.add(ball(C,1.1,0.75,1.5,0,1.0,-0.9)); g.add(ball(C2,0.55,0.6,0.6,0,1.45,0.5)); const crest=ball(C,0.7,0.35,0.9,0,2.0,0.2); crest.rotation.x=-0.6; g.add(crest);
    g.add(ball(eye,0.25,0.08,0.1,0,1.7,1.0)); for(let i=0;i<5;i++) g.add(ball(glow('#a6ff4a'),0.12,0.1,0.12,(i-2)*0.35,1.15,-1.9)); legRing(8,1.3,0.12,1.15,0.9,2.2); }
  else if(t==='grazer'){ const B=mat('#b9a98a'); g.add(ball(B,0.28,0.22,0.42,0,0.55,0)); g.add(ball(mat('#d3c3a6'),0.13,0.12,0.18,0,0.62,0.45)); legRing(4,0.42,0.06,0.45,0.18,0.5,B); }
  else if(t==='husk'){ const F=mat('#5c6a52'), D=mat('#2f3a2a'); for(const s of [-1,1]){ const l=limb(D,0.1,0.34,s*0.08,0.34,0); g.add(l); legs.push(l); }
    const torso=box(F,0.32,0.36,0.22,0,0.52,0.05); torso.rotation.x=0.35; g.add(torso); g.add(ball(C2,0.12,0.12,0.16,0,0.78,0.18)); g.add(ball(eye,0.06,0.03,0.03,0,0.78,0.3));
    for(const s of [-1,1]){ const a=limb(F,0.08,0.42,s*0.2,0.66,0.1,s*0.3); a.rotation.x=-0.6; g.add(a); } }
  else return null;
  g.userData.legs=legs; g.userData.top=t==='broodmother'?2.4:t==='brute'?1.15:0.85; return g; }
function v3Billboard(canvas,scale=2){ const tex=new THREE.CanvasTexture(canvas); tex.magFilter=THREE.NearestFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true })), w=canvas.width*scale/TILE, h=canvas.height*scale/TILE; s.scale.set(w,h,1); s.position.y=h/2;
  const g=new THREE.Group(); g.add(s); g.userData.top=h; g.userData.own=[s.material,tex]; return g; }
function v3Building(e){
  const t=e.type, s=e.size||1, g=new THREE.Group(); let top=1;
  const metal=mat('#3a4150'), plate=mat('#4a5366'), dark=mat('#262a33'), yel=mat('#f2c230');
  if(t==='hq'){ g.add(box(dark,2.7,0.25,2.7,0,0.12,0)); g.add(box(metal,2.4,0.7,2.4,0,0.6,0)); g.add(box(plate,1.7,0.5,1.7,0,1.2,0));
    const dome=ball(mat('#5d6f83'),0.62,0.45,0.62,0,1.45,0); g.add(dome); g.add(cyl(mat('#aab4bf'),0.03,1.4,0.03,0.95,1.9,-0.95)); g.userData.blink=box(glow('#ff5a4f'),0.1,0.1,0.1,0.95,2.62,-0.95); g.add(g.userData.blink);
    for(let i=0;i<9;i++) g.add(box(i%2?dark:yel,0.25,0.12,0.04,-1.0+i*0.25,0.3,1.21)); top=2.7; }
  else if(t==='relay'){ g.add(box(metal,1.6,0.3,1.6,0,0.15,0)); for(const [x,z] of [[-0.4,-0.4],[0.4,-0.4],[-0.4,0.4],[0.4,0.4]]){ const l=cyl(plate,0.04,2.2,0.04,x*0.6,1.2,z*0.6); l.rotation.z=x*0.12; l.rotation.x=-z*0.12; g.add(l); }
    const dish=ball(mat('#aab4bf'),0.45,0.12,0.45,0,2.35,0); dish.rotation.x=0.5; g.add(dish); g.userData.blink=box(glow('#ffb347'),0.1,0.1,0.1,0,2.5,0); g.add(g.userData.blink); top=2.6; }
  else if(t==='sentry'){ for(let i=0;i<3;i++){ const l=limb(dark,0.05,0.42,Math.cos(i*2.1)*0.05,0.4,Math.sin(i*2.1)*0.05,0); l.rotation.set(Math.sin(i*2.1)*0.6,0,-Math.cos(i*2.1)*0.6); g.add(l); }
    const tur=new THREE.Group(); tur.position.y=0.45; tur.add(box(plate,0.32,0.22,0.36,0,0,0)); tur.add(box(dark,0.05,0.05,0.45,0.06,0.02,0.3)); tur.add(box(dark,0.05,0.05,0.45,-0.06,0.02,0.3)); g.add(tur); g.userData.turret=tur; top=0.8; }
  else if(t==='barricade'){ g.add(box(mat('#6a6a70'),0.95,0.55,0.42,0,0.27,0)); g.add(box(yel,0.96,0.08,0.43,0,0.42,0)); top=0.6; }
  else if(t==='hive'){ const H=mat('#3a2448'), H2=mat('#5c3e6e');
    for(let i=0;i<7;i++){ const a=i*0.9; g.add(ball(i%2?H:H2,0.55+hash2(e.id,i,1)*0.35,0.5+hash2(e.id,i,2)*0.5,0.55,Math.cos(a)*0.65,0.35,Math.sin(a)*0.65)); }
    g.add(ball(H,0.85,1.1,0.85,0,0.7,0)); const heart=ball(glow('#a6ff4a'),0.32,0.32,0.32,0,1.2,0.62); g.add(heart); g.userData.heart=heart;
    for(let i=0;i<5;i++){ const r=cyl(H2,0.06,1.6,0.06,Math.cos(i*1.3)*1.1,0.25,Math.sin(i*1.3)*1.1); r.rotation.set(Math.sin(i*1.3)*1.25,0,-Math.cos(i*1.3)*1.25); g.add(r); } top=2; }
  else if(t==='lz'){ g.add(part(GEO.disc,mat('#2a3038'),1.45,1,1.45,0,0.03,0)); g.add(part(GEO.ring,mat('#f2c230'),1.4,1,1.4,0,0.05,0)); g.add(box(mat('#f2c230'),1.6,0.02,0.18,0,0.05,0)); g.add(box(mat('#f2c230'),0.18,0.02,1.6,0,0.05,0)); top=0.3; }
  else if(t==='uplink'){ g.add(box(metal,0.8,0.2,0.8,0,0.1,0)); g.add(cyl(plate,0.06,1.0,0.06,0,0.6,0)); const d=ball(mat('#aab4bf'),0.4,0.1,0.4,0,1.15,0); d.rotation.x=0.7; g.add(d);
    const ring=part(GEO.ring,new THREE.MeshBasicMaterial({ color:0xffb347, transparent:true, opacity:0.8 }),s*0.75,1,s*0.75,0,0.06,0); g.add(ring); g.userData.capRing=ring; g.userData.own=[ring.material]; top=1.4; }
  else if(t==='shaft'){ g.add(part(GEO.disc,glow('#050507'),0.75,1,0.75,0,0.04,0)); g.add(part(GEO.torus,mat('#4f5766'),0.8,1.4,0.8,0,0.08,0)); g.add(box(mat('#5a4632'),1.7,0.1,0.12,0,0.4,0.55)); g.add(box(mat('#5a4632'),0.12,0.8,0.12,-0.8,0.2,0.55)); g.add(box(mat('#5a4632'),0.12,0.8,0.12,0.8,0.2,0.55)); top=0.6; }
  else if(t==='generator'){ g.add(box(metal,1.6,0.9,1.2,0,0.45,0)); for(let i=0;i<4;i++) g.add(box(dark,0.08,0.6,1.22,-0.5+i*0.33,0.5,0)); const core=box(glow('#ffb347'),0.4,0.25,0.06,0,0.6,0.62); g.add(core); g.userData.core=core; top=1.1; }
  else if(t==='charge'){ g.add(cyl(mat('#59616f'),0.18,0.5,0.18,0,0.25,0)); g.userData.blink=box(glow('#ff5a4f'),0.08,0.08,0.08,0,0.55,0); g.add(g.userData.blink); top=0.7; }
  else if(t==='chargesite'){ g.add(part(GEO.ring,mat('#ffb347'),0.42,1,0.42,0,0.04,0)); top=0.2; }
  else if(t==='egg'){ g.add(ball(mat('#6d5a3e'),0.18,0.26,0.18,0,0.22,0)); g.add(ball(glow('#a6ff4a'),0.06,0.04,0.06,0,0.46,0)); top=0.5; }
  else if(t==='cocoon'){ const c=ball(mat('#4f6a2a'),0.22,0.32,0.22,0,0.3,0); g.add(c); g.userData.pulse=c; top=0.65; }
  else if(t==='barricade'||t==='door'){ g.add(box(mat('#59616f'),0.98,1.1,0.98,0,0.55,0)); g.add(box(yel,1.0,0.1,1.0,0,0.9,0)); top=1.2; }
  else if(t==='membrane'){ g.add(box(mat('#7a5a8e',{transparent:true,opacity:0.8}),0.95,1.2,0.5,0,0.6,0)); top=1.2; }
  else if(t==='rubble'){ for(let i=0;i<4;i++) g.add(part(GEO.lowball,mat('#4a4a52'),0.25,0.2,0.25,(hash2(e.id,i,1)-0.5)*0.6,0.12,(hash2(e.id,i,2)-0.5)*0.6)); top=0.4; }
  else if(t==='wreck'){ const W=mat('#3a3f48'); const hull=box(W,1.2,0.6,2.6,0,0.35,0); hull.rotation.set(0.15,0.4,0.2); g.add(hull); const wing=box(W,2.4,0.08,0.7,0.2,0.25,0.2); wing.rotation.set(0,0.4,0.35); g.add(wing); g.userData.smoke=true; top=1; }
  else if(t==='medtent'){ const tent=part(GEO.cyl,mat('#c8d0c0'),0.9,1.6,0.9,0,0.45,0); tent.geometry=new THREE.CylinderGeometry(0,1,1,4); tent.rotation.y=Math.PI/4; g.add(tent); g.add(box(mat('#e2463a'),0.3,0.08,0.02,0,0.5,0.66)); top=1; }
  else if(t==='terminal'){ g.add(box(metal,0.4,0.7,0.3,0,0.35,0)); g.add(box(glow('#5fe3b0'),0.3,0.22,0.02,0,0.55,0.16)); top=0.8; }
  else if(t==='choirpod'){ const c=part(GEO.cone,mat('#5c3e6e'),0.3,0.9,0.3,0,0.45,0); g.add(c); g.add(ball(glow('#c58cff'),0.1,0.1,0.1,0,0.92,0)); top=1; }
  else return null;
  g.userData.top=top; return g; }
function v3Small(e){
  const g=new THREE.Group();
  if(e.kind==='body'){ const m=e.bio===false||e.faction==='swarm'?mat('#2a2133'):mat(e.faction==='osprey'?'#2c2420':'#4c586d'); const b=box(m,0.26,0.12,0.62,0,0.07,0); b.rotation.y=(e.id%7)*0.9; g.add(b); g.add(ball(mat('#2b313d'),0.1,0.08,0.1,Math.sin((e.id%7)*0.9)*0.36,0.08,Math.cos((e.id%7)*0.9)*0.36)); g.userData.top=0.3; return g; }
  if(e.relic){ g.add(box(mat('#3a3f48'),0.3,0.2,0.3,0,0.1,0)); g.add(ball(glow('#c58cff'),0.09,0.09,0.09,0,0.3,0)); g.userData.top=0.5; g.userData.bob=true; return g; }
  g.add(box(mat(e.supply?'#3a6a8a':'#5a4632'),0.36,0.26,0.28,0,0.13,0)); g.add(box(mat('#f2c230'),0.37,0.05,0.29,0,0.2,0)); g.userData.top=0.4; g.userData.bob=true; return g; }
function v3Model(e){
  let g=null;
  if(e.kind==='unit'){ const f=UNITS[e.type]&&UNITS[e.type].faction; g=(f==='corps'&&e.type!=='husk')?v3Soldier(e):v3Creature(e);
    if(!g){ const sp=SPR[e.sprite||e.def.sprite]; g=v3Billboard(sp.img,e.def.scale||2); }
    else { const sc=(e.type==='broodmother'||e.type==='brute'?1:(e.def.radius||9)/9)*VIEW3D.unitScale; g.scale.setScalar(sc); g.userData.top*=sc; } }
  else if(e.kind==='building'){ g=v3Building(e); if(!g&&e.def&&ARTC[e.def.art]) g=v3Billboard(ARTC[e.def.art],2); }
  else g=v3Small(e);
  if(!g) g=v3Small(e);
  g.userData.ent=e; g.userData.yaw=e.face<0?-Math.PI/2:Math.PI/2; g.userData.px=e.x; g.userData.py=e.y;
  g.traverse(o=>{ if(o.isMesh) o.receiveShadow=true; });
  return g; }

/* ---------- which entities show (as in 2D: your own always, the rest only in sight; buildings once seen) ---------- */
function v3Shown(e){ const m=G.map;
  if(e.dead||e.hidden||e.ospTunnel) return false;
  if(e.kind==='body'&&e.carrier) return isVisible(e.carrier);
  const i=Math.floor(e.y/TILE)*m.w+Math.floor(e.x/TILE);
  if(e.kind==='crate'||e.kind==='body') return !!G.seen[i];
  if(e.def&&e.def.ground) return true;
  if(e.faction===G.side) return true;
  if(e.kind==='building'&&e.type!=='cocoon') return !!G.seen[i];
  return isVisible(e); }

/* ---------- frame ---------- */
function v3Size(){ const w=ui.vw, h=Math.max(100,ui.vh-ui.hudH); if(V3.w!==w||V3.h!==h||V3.dpr!==ui.dpr){ V3.w=w; V3.h=h; V3.dpr=ui.dpr; V3.r.setPixelRatio(Math.min(ui.dpr,1.5)); V3.r.setSize(w,h); V3.cam.aspect=w/h; V3.cam.updateProjectionMatrix(); } }
function v3Reset(){ if(V3.g) V3.scene.remove(V3.g); V3.g=new THREE.Group(); V3.scene.add(V3.g); V3.objs.clear(); V3.forG=G; V3.mapId=G.map.id;
  V3.fxPool.length=V3.shotPool.length=V3.ringPool.length=V3.pingPool.length=0; V3.smoke=[];
  V3.fxg=new THREE.Group(); V3.g.add(V3.fxg); V3.fxg.add(V3.tracers); V3.fxg.add(V3.ghost); v3BuildTerrain(); }
function v3Camera(){ const V=VIEW3D, tx=(G.cam.x+ui.vw/2)/TILE, tz=(G.cam.y+(ui.vh-ui.hudH)/2)/TILE, ty=Math.max(0,v3H(tx,tz)), p=V.pitch*Math.PI/180, sh=(G.shake||0)*0.3;
  V3.cam.fov=V.fov; V3.cam.updateProjectionMatrix();
  V3.cam.position.set(tx+(sh?rand(-sh,sh):0),ty+V.dist*Math.sin(p),tz+V.dist*Math.cos(p)); V3.cam.lookAt(tx,ty,tz);
  const dark=!!G.mission.dark; V3.sun.intensity=dark?V.darkSun:V.sun; V3.hemi.intensity=dark?V.darkAmbient:V.ambient;
  V3.sun.position.set(tx-16,ty+22,tz-9); V3.sun.target.position.set(tx,ty,tz); V3.sun.target.updateMatrixWorld(); V3.look={x:tx,z:tz}; }
function pool(arr,make){ return i=>{ if(!arr[i]){ arr[i]=make(); V3.fxg.add(arr[i]); } const o=arr[i]; o.visible=true; return o; }; }
function hidePool(arr,n){ for(let i=n;i<arr.length;i++) arr[i].visible=false; }
function v3Sprite(){ return new THREE.Sprite(new THREE.SpriteMaterial({ map:V3.glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false })); }
function render3D(now){
  if(V3.forG!==G||V3.mapId!==G.map.id) v3Reset();
  v3Size(); v3Camera(); paintFog(); v3Fog(); V3.frame++;
  const T=now/1000, sel=new Set(G.sel), lights=[];
  /* entities */
  for(const e of G.ents){ if(!v3Shown(e)) continue;
    let g=V3.objs.get(e); if(!g){ g=v3Model(e); V3.objs.set(e,g); V3.g.add(g); if(e.faction===G.side&&e.kind==='unit') g.traverse(o=>o.layers.set(1)); }
    g.visible=true; g.userData.f=V3.frame;
    const x=e.x/TILE, z=e.y/TILE, U=g.userData; let y=v3H(x,z);
    if(e.kind==='unit'){ const dx=e.x-U.px, dy=e.y-U.py, tg=e.target&&!e.target.dead?e.target:null;
      if(Math.hypot(dx,dy)>0.4) U.want=Math.atan2(dx,dy); else if(tg) U.want=Math.atan2(tg.x-e.x,tg.y-e.y);
      if(U.want!=null){ let d=U.want-U.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); U.yaw+=d*Math.min(1,0.25); }
      U.px=e.x; U.py=e.y; g.rotation.set(0,U.yaw,0);
      const mv=e.moving&&!e.downed, sw=mv?Math.sin(T*11+e.id)*0.6:0; for(let i=0;i<(U.legs||[]).length;i++) U.legs[i].rotation.x=i%2?sw:-sw;
      if(mv) y+=Math.abs(Math.sin(T*11+e.id))*0.03;
      if(e.downed){ g.rotation.x=-Math.PI/2*0.9; y+=0.1; } else if(e.stunT>0) g.rotation.z=Math.sin(T*9)*0.25;
      if(e.lunge>0){ g.position.set(x+Math.sin(U.yaw)*0.12,y,z+Math.cos(U.yaw)*0.12); } else g.position.set(x,y,z);
      const fl=e.flash>0?1.08:1; g.children.forEach(c=>{ if(!c.userData.s0) c.userData.s0=c.scale.clone(); c.scale.copy(c.userData.s0).multiplyScalar(fl); });
      if(G.mission.dark&&e.faction===G.side&&e.def.bio&&lights.length<5) lights.push({x:x+Math.sin(U.yaw)*1.2,y:y+0.9,z:z+Math.cos(U.yaw)*1.2,i:VIEW3D.lamp,c:0xdde8ff,d:5}); }
    else { if(e.kind!=='building'&&U.bob) y+=0.05+Math.sin(T*3+e.id)*0.04; g.position.set(x,y,z);
      if(e.kind==='building'){ if(!e.built&&e.progress!=null) g.scale.y=Math.max(0.08,e.progress); else g.scale.y=1;
        if(U.blink) U.blink.visible=Math.floor(T*1.6+e.id)%2===0;
        if(U.heart){ const f=e.hp/e.maxHp; U.heart.scale.setScalar(0.32*(1+0.18*Math.max(0,Math.sin(T*(2+f*2)+e.id)))); g.scale.set(1+0.02*Math.sin(T*2+e.id),1+0.03*Math.sin(T*2+e.id),1); }
        if(U.turret) U.turret.rotation.y=Math.atan2(Math.cos(e.angle||0),Math.sin(e.angle||0));
        if(U.pulse) U.pulse.scale.setScalar(0.22*(1+0.08*Math.sin(T*7+e.id)));
        if(U.capRing) U.capRing.material.color.set(e.state==='contested'?'#ff9a3c':e.owned?'#5fe3b0':e.state==='theirs'?'#ff5a4f':'#ffb347');
        if(U.core){ U.core.visible=!!e.powered; if(e.powered) lights.push({x,y:y+1.6,z,i:VIEW3D.genLight,c:0xffd690,d:e.def.light||9}); }
        if(U.smoke&&Math.random()<0.3) (V3.smoke=V3.smoke||[]).push({x,z,y:y+0.6,t:0}); } } }
  V3.smoke=(V3.smoke||[]).filter(s=>(s.t+=1/60)<2.5);
  for(const [e,g] of V3.objs){ if(g.userData.f!==V3.frame){ g.visible=false; if(e.dead||V3.frame-g.userData.f>600){ V3.g.remove(g); for(const o of g.userData.own||[]) o.dispose(); V3.objs.delete(e); } } }
  /* lights (generators, helmet lamps in the dark) */
  lights.sort((a,b)=>Math.hypot(a.x-V3.look.x,a.z-V3.look.z)-Math.hypot(b.x-V3.look.x,b.z-V3.look.z));
  V3.lights.forEach((l,i)=>{ const L=lights[i]; if(L){ l.position.set(L.x,L.y,L.z); l.intensity=L.i; l.color.setHex(L.c); l.distance=L.d; } else l.intensity=0; });
  /* selection rings */
  let n=0; const ring=pool(V3.ringPool,()=>{ const r=new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ transparent:true, opacity:0.9, depthWrite:false })); r.renderOrder=2; return r; });
  for(const e of sel){ if(e.dead||!v3Shown(e)) continue; const r=ring(n++), rad=e.kind==='building'?(e.size||1)*0.72:(e.r/TILE)*1.45+0.08, x=e.x/TILE, z=e.y/TILE;
    r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.04,z); r.material.color.set(e.faction===G.side?'#5fe3b0':'#ff5a4f'); }
  hidePool(V3.ringPool,n);
  /* pings and mission rings on the ground */
  n=0; const ping=pool(V3.pingPool,()=>new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false })));
  for(const p of G.pings){ const r=ping(n++), rad=(10+p.t*28)/TILE, x=p.x/TILE, z=p.y/TILE; r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set(p.col); r.material.opacity=Math.max(0,1-p.t/3); }
  for(const f of G.fx){ if(f.k!=='order') continue; const k=1-f.t/f.max, r=ping(n++), rad=(6+k*22)/TILE, x=f.x/TILE, z=f.y/TILE; r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set('rgb('+f.col+')'); r.material.opacity=1-k; }   /* where an order was given */
  for(const zr of G.rings||[]){ const r=ping(n++), rad=zr.r/TILE, x=zr.x/TILE, z=zr.y/TILE; r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set(zr.col||'#ffb347'); r.material.opacity=0.6; }
  for(const mk of G.markers){ const r=ping(n++), x=mk.x/TILE, z=mk.y/TILE; r.scale.set(1.5,1,1.5); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set(mk.col||'#ffb347'); r.material.opacity=0.5+0.4*Math.sin(now/250); }
  hidePool(V3.pingPool,n);
  /* shots */
  n=0; const shot=pool(V3.shotPool,()=>new THREE.Mesh(GEO.ball,new THREE.MeshBasicMaterial({ color:0x4fae22 })));
  for(const s of G.shots){ if(s.t<0) continue; const t=s.t/s.dur, x=(s.sx+(s.tx-s.sx)*t)/TILE, z=(s.sy+(s.ty-s.sy)*t)/TILE, arc=s.k==='plasma'?0:Math.sin(t*Math.PI)*(s.k==='egglob'||s.k==='broodlob'?2.2:1.3);
    const o=shot(n++); o.position.set(x,v3H(x,z)+0.5+arc,z); const egg=s.k==='egglob'||s.k==='broodlob';
    o.material.color.set(s.k==='plasma'?'#7ff6ff':s.k==='grenade'?'#3a4150':egg?'#6d5a3e':'#a6ff4a'); o.scale.setScalar(egg?0.13:s.k==='grenade'?0.07:0.08); }
  hidePool(V3.shotPool,n);
  /* effects */
  let nt=0; const P=V3.tracerPos, Cc=V3.tracerCol; n=0; const fx=pool(V3.fxPool,v3Sprite);
  const put=(x,y,z,sz,col,a)=>{ if(n>=400) return; const s=fx(n++); s.material.blending=THREE.AdditiveBlending; s.position.set(x,y,z); s.scale.setScalar(sz); s.material.color.set(col); s.material.opacity=a; };
  for(const f of G.fx){ const a=Math.max(0,f.t/f.max);
    if(f.k==='tracer'&&nt<400){ const x1=f.x1/TILE, z1=f.y1/TILE, x2=f.x2/TILE, z2=f.y2/TILE, c=new THREE.Color('#ffe2a8').multiplyScalar(a);
      P.set([x1,v3H(x1,z1)+0.5,z1,x2,v3H(x2,z2)+0.45,z2],nt*6); Cc.set([c.r,c.g,c.b,c.r,c.g,c.b],nt*6); nt++; continue; }
    if(f.x==null) continue; const x=f.x/TILE, z=f.y/TILE, gy=v3H(x,z);
    switch(f.k){
      case 'flash': put(x,gy+0.5,z,0.35,'#fff3c4',1); break;
      case 'spark': case 'ember': put(x,gy+0.3+(1-a)*0.4,z,0.12,f.col||'#ffb347',a); break;
      case 'flame': put(x,gy+0.3+(1-a)*0.5,z,0.25+(1-a)*0.45,a>0.6?'#ffe08a':a>0.3?'#ff8a2a':'#783214',a); break;
      case 'boom': put(x,gy+0.4,z,(f.r/TILE)*2.2*(1-a*0.6),f.col||'#ffa03c',a*0.9); break;
      case 'dust': put(x,gy+0.3+(f.h3?(1-a)*1.5:0),z,(f.r0+(1-a)*f.r1)/TILE*2,f.col||'#777',a*0.35); break;
      case 'hivedeath': put(x,gy+0.8,z,3*(1-a)+0.5,'#a6ff4a',a*0.6); break;
      case 'mlight': put(x,gy+0.5,z,0.9,'#ffd690',a*0.5); break; } }
  for(let i=nt*6;i<V3.tracerPos.length && i<(V3.lastNt||0)*6;i++){ P[i]=0; Cc[i]=0; } V3.lastNt=nt;
  V3.tracers.geometry.setDrawRange(0,nt*2); V3.tracers.geometry.attributes.position.needsUpdate=true; V3.tracers.geometry.attributes.color.needsUpdate=true;
  for(const mk of G.markers){ put(mk.x/TILE,v3H(mk.x/TILE,mk.y/TILE)+1.6+Math.sin(now/250)*0.1,mk.y/TILE,0.7,mk.col||'#ffb347',0.9); }
  for(const fl of G.flareList||[]){ if(flareLit(fl)){ const x=fl.x/TILE, z=fl.y/TILE; put(x,v3H(x,z)+0.3,z,1.2,'#ff6040',0.8); } }
  for(const s of V3.smoke){ const k=s.t/2.5; if(n<400){ const o=fx(n++); o.position.set(s.x+k*0.6,s.y+k*1.8,s.z); o.scale.setScalar(0.4+k*1.2); o.material.color.set('#3a3a3a'); o.material.opacity=0.5*(1-k); o.material.blending=THREE.NormalBlending; } }
  hidePool(V3.fxPool,n);
  /* placing a building */
  if(ui.placing){ const d=BUILDINGS[ui.placing.type], s=placementSpot(), cx=s.tx+d.size/2, cz=s.ty+d.size/2; V3.ghost.visible=true; V3.ghost.scale.set(d.size,0.9,d.size); V3.ghost.position.set(cx,v3H(cx,cz)+0.45,cz); V3.ghost.material.color.set(s.ok?'#5fe3b0':'#ff5a4f'); }
  else V3.ghost.visible=false;
  /* draw: 1. everything; 2. the depth of the ground and buildings alone; 3. your own soldiers in outline where that depth stands in front of them (xray).
     Your own soldiers live on layer 1 only, so step 2 leaves them out and they never hide themselves. */
  const R=V3.r, C=V3.cam; R.autoClear=true; C.layers.set(0); C.layers.enable(1); R.render(V3.scene,C);
  MAT.xray.opacity=VIEW3D.xray;
  if(VIEW3D.xray>0){ R.autoClear=false; R.shadowMap.autoUpdate=false; V3.fxg.visible=false;
    R.clearDepth(); V3.scene.overrideMaterial=MAT.depth; C.layers.set(0); R.render(V3.scene,C);
    V3.scene.overrideMaterial=MAT.xray; C.layers.set(1); R.render(V3.scene,C);
    V3.scene.overrideMaterial=null; V3.fxg.visible=true; R.shadowMap.autoUpdate=true; R.autoClear=true; }
  v3Overlay(now);
}
/* screen position of a world point (px, from the top-left of the window) */
const _v=typeof THREE!=='undefined'?new THREE.Vector3():null;
function v3Screen(wx,wy,up){ const x=wx/TILE, z=wy/TILE; _v.set(x,v3H(x,z)+(up||0),z).project(V3.cam); return { x:(_v.x+1)/2*V3.w, y:(1-_v.y)/2*V3.h, ok:_v.z<1 }; }
/* the flat layer on top: health bars, labels, the drag box (drawn on the 2D canvas, which also takes the mouse) */
function v3Overlay(now){
  ctx.setTransform(ui.dpr,0,0,ui.dpr,0,0); ctx.clearRect(0,0,ui.vw,ui.vh);
  ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center';
  for(const [e,g] of V3.objs){ if(!g.visible||e.kind==='crate'||e.kind==='body'||!e.maxHp||e.ospTunnel) continue;
    const show=G.sel.includes(e)||e.hp<e.maxHp||(e.kind==='building'&&!e.built); if(!show||(e.def&&e.def.ground&&!G.sel.includes(e))) continue;
    const p=v3Screen(e.x,e.y,(g.userData.top||1)+0.25); if(!p.ok) continue; const w=e.kind==='building'?Math.min(70,(e.size||1)*26):24, x=Math.round(p.x-w/2), y=Math.round(p.y);
    ctx.fillStyle='#000'; ctx.fillRect(x-1,y-1,w+2,5); ctx.fillStyle='#3a1512'; ctx.fillRect(x,y,w,3);
    const f=clamp(e.hp/e.maxHp,0,1); ctx.fillStyle=e.faction!==G.side?'#ff5a4f':hpColor(f); ctx.fillRect(x,y,Math.round(w*f),3);
    if(e.kind==='building'&&!e.built){ ctx.fillStyle='#000'; ctx.fillRect(x-1,y+4,w+2,4); ctx.fillStyle='#ffb347'; ctx.fillRect(x,y+5,Math.round(w*(e.progress||0)),2); } }
  const label=(txt,col,p)=>{ ctx.fillStyle='#000'; ctx.fillText(txt,p.x+1,p.y+1); ctx.fillStyle=col; ctx.fillText(txt,p.x,p.y); };
  for(const e of G.ents){ if(e.dead||!e.status) continue; const g=V3.objs.get(e); if(!g||!g.visible) continue; const p=v3Screen(e.x,e.y,(g.userData.top||1)+0.6); if(p.ok) label(e.status.txt,e.status.col,p); }
  for(const e of G.ents){ if(e.dead||!e.label||!e.def||!e.def.capture) continue; const p=v3Screen(e.x,e.y,0); if(p.ok) label(e.label.toUpperCase(),'#ffe2a8',{x:p.x,y:p.y+26}); }
  for(const mk of G.markers){ const p=v3Screen(mk.x,mk.y,2.2); if(p.ok) label(mk.label.toUpperCase(),'#ffe2a8',p); }
  for(const f of G.fx){ if(f.k!=='text') continue; const a=Math.max(0,f.t/f.max), p=v3Screen(f.x,f.y,1+(1-a)*0.6); if(p.ok) label(f.txt,f.col,p); }
  if(ui.drag&&ui.drag.box){ const d=ui.drag, x=Math.min(d.x0,d.x1), y=Math.min(d.y0,d.y1), w=Math.abs(d.x1-d.x0), h=Math.abs(d.y1-d.y0);
    ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=1; ctx.fillStyle='rgba(95,227,176,.08)'; ctx.fillRect(x,y,w,h); ctx.strokeRect(x+.5,y+.5,w,h); }
  const g=ctx.createRadialGradient(ui.vw/2,ui.vh/2,Math.min(ui.vw,ui.vh)*0.45,ui.vw/2,ui.vh/2,Math.max(ui.vw,ui.vh)*0.8); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.35)'); ctx.fillStyle=g; ctx.fillRect(0,0,ui.vw,ui.vh);
  try{ drawHurtEdge(); }catch(e){}
  if(G.paused&&!G.over){ ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,ui.vw,ui.vh); }
}

/* ---------- switching, and the hooks into 2D drawing and input ---------- */
function v3Want(){ return !!(V3.on&&G&&(ui.mode==='game'||ui.mode==='pause'||ui.mode==='end')); }
function v3Active(){ return v3Want()&&V3.ok; }
function v3Label(){ const b=$('#btn-view'); if(b) b.textContent=V3.on?'3D':'2D'; }
function toggleView3D(){
  if(!V3.on&&!v3Init()){ toast('3D view is not available in this browser (no WebGL).'); return; }
  V3.on=!V3.on; store.set('hc-view3d',V3.on); v3Label(); if(G) clampCam(); toast(V3.on?'3D view (prototype). F3 switches back to 2D.':'2D view.',true); }
const render2D=render;
render=function(now){ const on=v3Want()&&v3Init();
  if(V3.r) V3.r.domElement.style.display=on?'block':'none';
  if(!on){ render2D(now); return; }
  render3D(now); };
/* in 3D the camera may look at any point of the map (the 2D limits keep a whole screen of map in view) */
const clampCam2D=clampCam;
clampCam=function(){ if(!v3Active()) return clampCam2D(); const W=G.map.w*TILE, H=G.map.h*TILE, vh=ui.vh-ui.hudH;
  G.cam.x=clamp(G.cam.x,-ui.vw/2,W-ui.vw/2); G.cam.y=clamp(G.cam.y,-vh/2,H-vh/2); };
const toWorld2D=toWorld;
toWorld=function(sx,sy){ if(!v3Active()||!V3.hv) return toWorld2D(sx,sy); return v3Pick(sx,sy,!ui.placing); };
/* mouse → map: first a soldier, creature or building under the cursor, else where the ray meets the ground (rock tops included) */
function v3Pick(sx,sy,ents){
  const nd=new THREE.Vector2(sx/V3.w*2-1,-(sy/V3.h)*2+1); V3.ray.setFromCamera(nd,V3.cam);
  if(ents){ const roots=[]; for(const g of V3.objs.values()) if(g.visible&&!(g.userData.ent.def&&g.userData.ent.def.ground)) roots.push(g);
    const hit=V3.ray.intersectObjects(roots,true)[0]; if(hit){ let o=hit.object; while(o&&!o.userData.ent) o=o.parent; if(o&&!o.userData.ent.dead) return { x:Math.round(o.userData.ent.x), y:Math.round(o.userData.ent.y) }; } }
  const O=V3.ray.ray.origin, D=V3.ray.ray.direction; let a=0, b=-1;
  for(let t=0;t<260;t+=0.2){ const x=O.x+D.x*t, y=O.y+D.y*t, z=O.z+D.z*t; if(y<=v3H(x,z)){ b=t; break; } a=t; }
  if(b<0){ const t=D.y<0?-O.y/D.y:0; return { x:Math.round((O.x+D.x*t)*TILE), y:Math.round((O.z+D.z*t)*TILE) }; }
  for(let k=0;k<10;k++){ const m=(a+b)/2, y=O.y+D.y*m; if(y<=v3H(O.x+D.x*m,O.z+D.z*m)) b=m; else a=m; }
  return { x:Math.round((O.x+D.x*b)*TILE), y:Math.round((O.z+D.z*b)*TILE) }; }
/* box select in 3D: what stands inside the box on screen (runs before the 2D handler, which then finds no drag) */
window.addEventListener('pointerup',e=>{ const d=ui.drag; if(!v3Active()||!d||!d.box||d.touch||!G||ui.mode!=='game') return; ui.drag=null;
  const x0=Math.min(d.x0,d.x1), x1=Math.max(d.x0,d.x1), y0=Math.min(d.y0,d.y1), y1=Math.max(d.y0,d.y1);
  const inBox=G.ents.filter(en=>{ if(en.dead||en.faction!==G.side) return false; const g=V3.objs.get(en), p=v3Screen(en.x,en.y,g?(g.userData.top||1)*0.5:0.4); return p.ok&&p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1; });
  const units=inBox.filter(en=>en.kind==='unit'); selectEntities(units.length?units:inBox.filter(en=>en.kind==='building').slice(0,1),d.shift); },true);
cv.addEventListener('wheel',e=>{ if(!v3Active()) return; e.preventDefault(); VIEW3D.dist=clamp(VIEW3D.dist*(e.deltaY>0?1.1:1/1.1),VIEW3D.minDist,VIEW3D.maxDist); },{ passive:false });
window.addEventListener('keydown',e=>{ if(e.key==='F3'){ e.preventDefault(); if(ui.mode==='game'||ui.mode==='pause') toggleView3D(); } });
{ const b=$('#btn-view'); if(b) b.addEventListener('click',toggleView3D); v3Label(); }
