'use strict';
/* ---------- 3D view (prototype) ----------
   A second way to look at the same battle. The game itself does not change: same G, same rules, same orders.
   Only the drawing (THREE.js, js/vendor/three.min.js) and the mouse-to-ground mapping (toWorld) are swapped while the view is on.
   - Switch with F3 or the "2D / 3D" button in the top bar; the choice is remembered (hc-view3d).
   - Camera: mouse wheel zooms, middle mouse drag turns (left/right) and tilts (up/down), the ⟲ ⟳ buttons turn a quarter, Home sets it straight.
     Edge scroll, arrow keys, minimap and camera follow work as in 2D (turned along with the camera).
   - Rock stands up out of the ground and hides what is behind it from the camera. Your own soldiers behind rock show as an outline (xray).
   - What your units see is lit up a little; the ground animations of the 2D view (footprints, casings, acid, fire, drag trails …) are painted on the 3D ground.
   Tile = 1 unit in the 3D world: map x → world x, map y → world z, up is world y. */
const VIEW3D = {
  pitch:56, dist:17, minDist:7, maxDist:42, fov:40, minPitch:32, maxPitch:84,   /* camera: degrees above the ground, distance to the point it looks at (tiles) */
  turnSpeed:0.35, tiltSpeed:0.25,                                                /* middle mouse drag: degrees per pixel */
  rock:2.0, highRock:2.9, crystal:1.9, rim:0.4, cliff:1.15, plateau:0.9, crater:-0.5, rockNoise:0.6,   /* terrain heights (tiles), taken when a mission starts */
  sun:1.15, ambient:0.68, darkSun:0.12, darkAmbient:0.22,                        /* light; dark: missions with mission.dark (Nov 2026: a bit less bright) */
  seenLift:0.2, seenAdd:0.036, darkSeenAdd:0.08,                                 /* what your units see right now: brighter (×1+lift, +add) */
  lamp:1.0, lamps:6, genLight:2.1,                                               /* helmet lamps in the dark (nearest the camera), running generators */
  lampStack:0.3, lampStackMax:3, lampOverlap:2.6,                                /* lamps on one spot do not add up: each extra lamp adds lampStack, at most lampStackMax lamps' worth (3 = full); lampOverlap: tiles within which two lamp spots count as one */
  beam:0.5,                                                                      /* how well you see the helmet lamp beam itself (0 = not at all) */
  unitScale:1.3, xray:0.4, shadows:true, groundAnims:true
};
VIEW3D.dist=clamp(store.get('hc-dist3d',VIEW3D.dist),VIEW3D.minDist,VIEW3D.maxDist);   /* the camera height you chose last time (+ / − / wheel) */
const V3 = { on:store.get('hc-view3d',false), ok:false, g:null, mapId:null, objs:new Map(), dying:new Map(), frame:0, yaw:0 };

/* ---------- setup ---------- */
function v3Init(){
  if(V3.ok||V3.failed) return V3.ok;
  if(typeof THREE==='undefined'){ V3.failed=true; return false; }
  let r; try{ r=new THREE.WebGLRenderer({ antialias:true }); }catch(e){ V3.failed=true; return false; }
  V3.r=r; r.setClearColor(0x05060a); r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap;
  const c=r.domElement; c.id='game3d'; c.style.cssText='position:fixed;left:0;top:0;display:none;pointer-events:none;';
  cv.parentNode.insertBefore(c,cv); c.style.filter=cv.style.filter;   /* the Brightness setting (34-settings.js) */
  V3.scene=new THREE.Scene();
  V3.cam=new THREE.PerspectiveCamera(VIEW3D.fov,1,0.3,300);
  V3.hemi=new THREE.HemisphereLight(0xb8c6e4,0x2a2a33,VIEW3D.ambient); V3.scene.add(V3.hemi);
  const sun=V3.sun=new THREE.DirectionalLight(0xf0f4ff,VIEW3D.sun); sun.castShadow=!!VIEW3D.shadows; sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=-30; sc.right=30; sc.top=30; sc.bottom=-30; sc.near=1; sc.far=90; sun.shadow.bias=-0.0008; sun.shadow.normalBias=0.03;
  V3.scene.add(sun); V3.scene.add(sun.target);
  V3.lights=[]; for(let i=0;i<10;i++){ const l=new THREE.PointLight(0xffd690,0,9,1.5); l.position.set(0,-50,0); V3.scene.add(l); V3.lights.push(l); }
  V3.u={ fog:{value:null}, size:{value:new THREE.Vector2(1,1)}, lift:{value:new THREE.Vector2(0,0)}, dec:{value:null}, decR:{value:new THREE.Vector4(0,0,1,1)}, time:{value:0} };
  V3.ray=new THREE.Raycaster(); V3.ray.layers.enableAll();
  v3MakeShared();
  V3.ok=true; return true;
}
const GEO={}, MAT={};
/* every material: darkened by the fog of war, lit up where your units see, tinted by creep; the ground also gets the painted 2D animations */
function v3Fogify(m,decal){
  m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,{ v3Fog:V3.u.fog, v3Size:V3.u.size, v3Lift:V3.u.lift, v3Dec:V3.u.dec, v3DecR:V3.u.decR });
    sh.uniforms.v3Time=V3.u.time;
    sh.vertexShader=(decal?'#define V3_DECAL\n':'')+sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 v3W; uniform sampler2D v3Fog; uniform vec2 v3Size;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef V3_DECAL\n { vec4 wp0=modelMatrix*vec4(transformed,1.0); transformed.y+=texture2D(v3Fog,wp0.xz/v3Size).r*0.16; }\n#endif')
      .replace('#include <project_vertex>','#include <project_vertex>\n#ifdef USE_INSTANCING\n v3W=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\n v3W=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif');
    sh.fragmentShader=(decal?'#define V3_DECAL\n':'')+sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 v3W; uniform sampler2D v3Fog; uniform vec2 v3Size; uniform vec2 v3Lift; uniform sampler2D v3Dec; uniform vec4 v3DecR; uniform float v3Time;')
      .replace('#include <dithering_fragment>',`#include <dithering_fragment>
 vec4 v3f=texture2D(v3Fog,v3W.xz/v3Size);
 #ifdef V3_DECAL
 vec2 v3d=(v3W.xz-v3DecR.xy)/v3DecR.zw;
 if(v3d.x>0.0&&v3d.y>0.0&&v3d.x<1.0&&v3d.y<1.0){ vec4 dc=texture2D(v3Dec,vec2(v3d.x,1.0-v3d.y)); gl_FragColor.rgb=mix(gl_FragColor.rgb,dc.rgb,dc.a); }
 #endif
 gl_FragColor.rgb=gl_FragColor.rgb*(1.0+v3Lift.x*v3f.g)+v3Lift.y*v3f.g;
 gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*vec3(0.62,0.42,0.78)+vec3(0.09,0.02,0.11),v3f.r);
 #ifdef V3_DECAL
 gl_FragColor.rgb+=vec3(0.16,0.09,0.2)*v3f.r*pow(0.5+0.5*sin(v3W.x*2.3+v3W.z*1.7+sin(v3W.z*3.1-v3Time*0.6)),6.0);   /* wet sheen on the mycel */
 #endif
 gl_FragColor.rgb*=1.0-v3f.a;`); };
  return m; }
function mat(col,o={}){ const k='l'+col+JSON.stringify(o); return MAT[k]||(MAT[k]=v3Fogify(new THREE.MeshLambertMaterial({ color:col, ...o }))); }
function shiny(col,o={}){ const k='p'+col+JSON.stringify(o); return MAT[k]||(MAT[k]=v3Fogify(new THREE.MeshPhongMaterial({ color:col, specular:0x8a7aa0, shininess:70, ...o }))); }   /* wet chitin, visors */
function glow(col,o={}){ const k='g'+col+JSON.stringify(o); return MAT[k]||(MAT[k]=new THREE.MeshBasicMaterial({ color:col, ...o })); }
function v3MakeShared(){
  GEO.box=new THREE.BoxGeometry(1,1,1); GEO.ball=new THREE.SphereGeometry(1,16,12); GEO.lowball=new THREE.IcosahedronGeometry(1,0);
  GEO.cyl=new THREE.CylinderGeometry(1,1,1,12); GEO.taper=new THREE.CylinderGeometry(0.6,1,1,10); GEO.cone=new THREE.ConeGeometry(1,1,8); GEO.ring=new THREE.RingGeometry(0.86,1,40).rotateX(-Math.PI/2);
  GEO.disc=new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2); GEO.torus=new THREE.TorusGeometry(1,0.12,8,24).rotateX(Math.PI/2); GEO.half=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);
  GEO.claw=new THREE.ConeGeometry(1,1,5).translate(0,0.5,0).rotateX(Math.PI/2);   /* points along +z from its base */
  MAT.xray=new THREE.MeshBasicMaterial({ color:0x5fe3b0, transparent:true, opacity:VIEW3D.xray, depthFunc:THREE.GreaterDepth, depthWrite:false });
  MAT.depth=new THREE.MeshBasicMaterial({ colorWrite:false });
  const gc=document.createElement('canvas'); gc.width=gc.height=64; const gx=gc.getContext('2d'), gr=gx.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.35,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); gx.fillStyle=gr; gx.fillRect(0,0,64,64);
  V3.glowTex=new THREE.CanvasTexture(gc);
  V3.fxPool=[]; V3.shotPool=[]; V3.ringPool=[]; V3.pingPool=[];
  const tg=new THREE.BufferGeometry(); V3.tracerPos=new Float32Array(400*6); V3.tracerCol=new Float32Array(400*6);
  tg.setAttribute('position',new THREE.BufferAttribute(V3.tracerPos,3)); tg.setAttribute('color',new THREE.BufferAttribute(V3.tracerCol,3));
  V3.tracers=new THREE.LineSegments(tg,new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false })); V3.tracers.frustumCulled=false;
  V3.ghost=new THREE.Mesh(GEO.box,new THREE.MeshBasicMaterial({ color:0x5fe3b0, transparent:true, opacity:0.3, depthWrite:false }));
  /* the painted ground layer (2D ground animations), redrawn every frame around the point the camera looks at */
  V3.dec=document.createElement('canvas'); V3.dec.width=V3.dec.height=1024; V3.decCtx=V3.dec.getContext('2d');
  const dt=new THREE.CanvasTexture(V3.dec); dt.minFilter=THREE.LinearFilter; dt.generateMipmaps=false; V3.u.dec.value=dt;
}

/* ---------- terrain ---------- */
const V3B=8, V3S=3;   /* border of rock round the map (tiles), vertices per tile */
function tileH(ch){ const V=VIEW3D; return ch==='#'?V.rock:ch==='^'?V.highRock:ch==='*'?V.crystal:ch===')'?V.rim:ch==='%'?V.cliff:ch==='&'?V.plateau:ch==='_'?V.crater:0; }
function v3BuildTerrain(){
  const m=G.map, W=m.w+V3B*2, H=m.h+V3B*2, NX=W*V3S+1, NZ=H*V3S+1;
  const th=new Float32Array(W*H), at=(tx,ty)=>tileAt(m,tx,ty);
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
  const mesh=new THREE.Mesh(g,v3Fogify(new THREE.MeshLambertMaterial({ map:tex }),true)); mesh.receiveShadow=true; mesh.castShadow=true;
  V3.terrain=mesh; V3.g.add(mesh);
  const cr=[]; for(let y=0;y<m.h;y++) for(let x=0;x<m.w;x++) if(m.tiles[y*m.w+x]==='*') cr.push([x,y]);
  if(cr.length){ const n=cr.length*3, im=new THREE.InstancedMesh(GEO.cone,v3Fogify(new THREE.MeshPhongMaterial({ color:0x9a7ef0, emissive:0x3a2a90, shininess:90 })),n), o=new THREE.Object3D(); let k=0;
    for(const [x,y] of cr) for(let q=0;q<3;q++){ const px=x+0.2+hash2(x,y,q)*0.6, pz=y+0.2+hash2(y,x,q+5)*0.6, hh=0.6+hash2(x+q,y,3)*1.0;
      o.position.set(px,v3H(px,pz)+hh*0.4,pz); o.rotation.set((hash2(x,y,q+9)-0.5)*0.6,hash2(x,y,q)*6,(hash2(y,x,q+2)-0.5)*0.6); o.scale.set(0.15+hash2(x,y,q+4)*0.1,hh,0.15); o.updateMatrix(); im.setMatrixAt(k++,o.matrix); }
    im.castShadow=true; V3.g.add(im); }
  V3.fogData=new Uint8Array(m.w*m.h*4); const ft=new THREE.DataTexture(V3.fogData,m.w,m.h,THREE.RGBAFormat); ft.magFilter=ft.minFilter=THREE.LinearFilter; ft.needsUpdate=true;
  V3.u.fog.value=ft; V3.u.size.value.set(m.w,m.h);
}
function v3H(x,z){ const NX=V3.NX, NZ=V3.NZ; if(!V3.hv) return 0;
  const gx=clamp((x+V3B)*V3S,0,NX-1.001), gz=clamp((z+V3B)*V3S,0,NZ-1.001), i=Math.floor(gx), j=Math.floor(gz), fx=gx-i, fz=gz-j, h=V3.hv;
  return (h[j*NX+i]*(1-fx)+h[j*NX+i+1]*fx)*(1-fz)+(h[(j+1)*NX+i]*(1-fx)+h[(j+1)*NX+i+1]*fx)*fz; }
/* fog texture: R creep, G seen right now, A darkness */
function v3Fog(){ const m=G.map, d=V3.fogData, seenA=Math.min(250,Math.round((G.mission.dark?232:140)*(ui.fogDark??1))), C=G.creep;
  for(let i=0;i<m.w*m.h;i++){ d[i*4]=C?Math.min(255,(C[i]||0)*300):0; d[i*4+1]=G.vis[i]?255:0; d[i*4+3]=G.vis[i]?0:(G.seen[i]?seenA:250); }
  V3.u.fog.value.needsUpdate=true; }

/* ---------- model parts ---------- */
function part(geo,m,w,h,d,x,y,z){ const o=new THREE.Mesh(geo,m); o.scale.set(w,h,d); o.position.set(x,y,z); o.castShadow=true; return o; }
const box=(m,w,h,d,x,y,z)=>part(GEO.box,m,w,h,d,x,y,z), ball=(m,w,h,d,x,y,z)=>part(GEO.ball,m,w,h,d,x,y,z), cyl=(m,w,h,d,x,y,z)=>part(GEO.cyl,m,w,h,d,x,y,z);
const grp=(x=0,y=0,z=0,...kids)=>{ const g=new THREE.Group(); g.position.set(x,y,z); for(const k of kids) g.add(k); return g; };
/* a limb hanging down from a pivot (rotate the pivot to swing it) */
function limb(m,w,len,x,y,z,d=w){ const p=grp(x,y,z); p.add(box(m,w,len,d,0,-len/2,0)); return p; }
function rotX(o,a){ o.rotation.x=a; return o; } function rotZ(o,a){ o.rotation.z=a; return o; }
function claws(m,n,len,r,spread){ const g=new THREE.Group(); for(let i=0;i<n;i++){ const c=part(GEO.claw,m,r,r,len,(i-(n-1)/2)*spread,0,0); c.rotation.y=(i-(n-1)/2)*0.25; g.add(c); } return g; }

/* ---------- soldiers ---------- */
const ROLE_COL={ trooper:'#86a36e', gunner:'#d0563c', pyro:'#ee8a26', medic:'#f2f4f6', engineer:'#f2c230', scientist:'#d9dee4' };
const SKIN={ corps:{ armor:'#5a6880', dark:'#262b35', suit:'#3d4556', metal:'#2c2f36' }, osprey:{ armor:'#2e2621', dark:'#15110e', suit:'#3b2f27', metal:'#211d1a', band:'#c0231d' },
  risen:{ armor:'#5f7055', dark:'#1f261c', suit:'#3a4634', metal:'#2a3028', medic:'#a9b89a', skin:'#8fa877', eye:'#9dff6a' } };   /* zombie mode: a mouldy green copy of the Corps kit, as the 2D sprite */
function v3Soldier(e){
  const t=e.type, osp=e.faction==='osprey'||!!e.crew, rz=!osp&&!!(e.vet&&e.vet.risen), P=osp?SKIN.osprey:rz?SKIN.risen:SKIN.corps, g=new THREE.Group(), U=g.userData;
  const A=mat(t==='medic'&&!osp?(rz?P.medic:'#d8dde3'):P.armor), D=mat(P.dark), S=mat(P.suit), Mt=shiny(P.metal), R=mat(ROLE_COL[t]||ROLE_COL.trooper), Rs=osp?mat('#4a3a2e'):R, skin=mat(rz?P.skin:'#c99a78');
  const bulk=t==='gunner'?1.18:1, last=()=>g.children[g.children.length-1];
  U.legs=[]; U.arms=[];
  /* legs: thigh, shin with knee pad, boot */
  for(const s of [-1,1]){ const hip=grp(s*0.075,0.44,0); hip.add(box(S,0.11,0.22,0.12,0,-0.11,0));
    const knee=grp(0,-0.22,0); knee.add(box(S,0.1,0.18,0.11,0,-0.09,0)); knee.add(box(A,0.11,0.08,0.05,0,-0.03,0.06)); knee.add(box(D,0.12,0.07,0.18,0,-0.2,0.025)); hip.add(knee); hip.userData.knee=knee;
    g.add(hip); U.legs.push(hip); }
  /* hips, belt with pouches, torso, shoulder pads in the role colour */
  g.add(box(S,0.26,0.1,0.15,0,0.46,0)); g.add(box(D,0.28,0.045,0.17,0,0.51,0));
  for(const x of [-0.09,0,0.09]) g.add(box(mat('#3a3a2e'),0.06,0.06,0.04,x,0.5,0.1));
  g.add(box(S,0.24*bulk,0.12,0.15,0,0.57,0)); g.add(box(A,0.31*bulk,0.2,0.2*bulk,0,0.69,0.005)); g.add(box(A,0.22*bulk,0.06,0.06,0,0.67,0.11));
  for(const s of [-1,1]) g.add(ball(Rs,0.095*bulk,0.07,0.11,s*0.19*bulk,0.79,0));
  if(osp) g.add(box(mat(P.band),0.085,0.05,0.1,-0.2*bulk,0.71,0));   /* the Rogue crew's red armband */
  /* arms held forward round the weapon */
  for(const s of [-1,1]){ const sh=grp(s*0.19*bulk,0.76,0); sh.add(box(S,0.08,0.19,0.08,0,-0.09,0));
    const el=grp(0,-0.18,0); el.add(box(A,0.085,0.17,0.085,0,-0.08,0)); el.add(box(D,0.07,0.06,0.07,0,-0.18,0)); el.rotation.x=-1.25; sh.add(el);
    sh.rotation.x=s<0?-0.55:-0.3; sh.rotation.z=s*-0.18; sh.userData.base=sh.rotation.x; g.add(sh); U.arms.push(sh); }
  /* head */
  g.add(box(D,0.08,0.05,0.08,0,0.83,0));
  if(t==='scientist'){ g.add(ball(skin,0.1,0.11,0.1,0,0.94,0)); g.add(ball(mat('#5a4632'),0.105,0.07,0.105,0,1.0,-0.01)); }
  else if(t==='engineer'){ g.add(ball(D,0.1,0.1,0.1,0,0.92,0)); g.add(part(GEO.half,Rs,0.13,0.11,0.14,0,0.95,0)); g.add(box(Rs,0.28,0.02,0.3,0,0.95,0.02)); g.add(box(glow('#7ff6ff'),0.14,0.04,0.03,0,0.92,0.1)); }
  else if(t==='pyro'){ g.add(ball(A,0.12,0.11,0.12,0,0.93,0)); for(const k of [-1,1]){ g.add(rotX(cyl(D,0.05,0.07,0.05,k*0.045,0.89,0.1),1.4)); g.add(box(glow('#ffb347'),0.05,0.035,0.02,k*0.04,0.96,0.115)); } }   /* gas mask with two filters */
  else { g.add(ball(A,0.125,0.11,0.135,0,0.94,-0.005)); g.add(rz?box(glow(P.eye),0.17,0.05,0.04,0,0.92,0.11):box(shiny(osp?'#ff5040':'#7ff6ff',{ emissive:osp?0x801010:0x2a8a96 }),0.17,0.05,0.04,0,0.92,0.11)); g.add(box(Rs,0.03,0.025,0.24,0,1.045,-0.01)); }
  /* helmet lamp: a small lamp on the right of the helmet; in dark missions it glows and throws a visible beam down to the spot it lights (v3Pose) */
  { const lx=-0.1, ly=t==='scientist'?0.98:1.0, lz=0.085; g.add(rotX(cyl(mat('#2a2e33'),0.032,0.05,0.032,lx,ly,lz-0.015),Math.PI/2));
    const bulb=ball(glow('#5a5e66'),0.026,0.026,0.012,lx,ly,lz+0.012); g.add(bulb); U.lampBulb=bulb; U.lampBulbOff=bulb.material;
    const beam=grp(lx,ly,lz+0.02); beam.userData.noXray=true;
    for(const [r,o] of [[0.22,1],[0.4,0.45]]){ const m=new THREE.MeshBasicMaterial({ color:0xe4ecff, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
      const c=new THREE.Mesh(V3.beamGeo||(V3.beamGeo=new THREE.ConeGeometry(1,1,18,1,true).translate(0,-0.5,0).rotateX(-Math.PI/2)),m); c.scale.set(r,r,1); c.userData.noXray=true; c.userData.op=o; c.raycast=()=>{}; beam.add(c); (U.own||(U.own=[])).push(m); }
    const halo=v3Sprite(); halo.material.color.set('#fff2d0'); halo.scale.setScalar(0.32); halo.position.set(lx,ly,lz+0.04); halo.userData.noXray=true; halo.raycast=()=>{}; halo.visible=false; g.add(halo); U.lampHalo=halo; U.own.push(halo.material);
    beam.visible=false; g.add(beam); U.beam=beam; }
  if(t==='medic'){ g.add(box(mat('#e2463a'),0.03,0.08,0.02,0,1.0,0.1)); g.add(box(mat('#e2463a'),0.08,0.03,0.02,0,1.0,0.1)); for(const s of [-1,1]) g.add(box(mat('#e2463a'),0.02,0.06,0.02,s*0.27,0.8,0.02)); }
  /* back and weapon: per role */
  const gun=grp(0.07,0.66,0.2); g.add(gun); U.gun=gun;
  if(t==='gunner'){ g.add(rotZ(cyl(D,0.11,0.24,0.11,0,0.68,-0.18),Math.PI/2)); g.add(box(mat('#3a3a2e'),0.04,0.04,0.25,0.12,0.6,-0.04));   /* ammo drum and belt */
    gun.add(box(Mt,0.13,0.13,0.3,0,0,0.05)); gun.add(box(D,0.06,0.1,0.12,0,-0.08,-0.02)); const spin=grp(0,0,0.26); for(let i=0;i<6;i++){ const a=i*Math.PI/3; spin.add(rotX(cyl(Mt,0.018,0.32,0.018,Math.cos(a)*0.035,Math.sin(a)*0.035,0.12),Math.PI/2)); }
    spin.add(rotX(cyl(D,0.06,0.04,0.06,0,0,0.24),Math.PI/2)); gun.add(spin); U.spin=spin; }
  else if(t==='pyro'){ for(const s of [-1,1]){ g.add(cyl(shiny('#c4501c'),0.075,0.34,0.075,s*0.075,0.66,-0.17)); g.add(part(GEO.half,shiny('#c4501c'),0.075,0.05,0.075,s*0.075,0.83,-0.17)); }
    g.add(rotZ(cyl(D,0.02,0.3,0.02,0.1,0.55,-0.02),0.6));
    gun.add(box(Mt,0.07,0.09,0.42,0,0,0.08)); gun.add(rotX(part(GEO.taper,Mt,0.035,0.08,0.035,0,0,0.33),-Math.PI/2)); const pilot=ball(glow('#5ab0ff'),0.025,0.025,0.025,0,-0.02,0.38); gun.add(pilot); U.pilot=pilot; }
  else if(t==='medic'){ g.add(box(mat('#eef2f5'),0.24,0.24,0.12,0,0.67,-0.16)); g.add(box(mat('#e2463a'),0.05,0.14,0.02,0,0.69,-0.225)); g.add(box(mat('#e2463a'),0.14,0.05,0.02,0,0.69,-0.225));
    g.add(box(mat('#eef2f5'),0.08,0.08,0.1,-0.17,0.48,0.02)); gun.add(box(Mt,0.05,0.08,0.22,0,0,0.04)); gun.add(box(D,0.03,0.08,0.03,0,-0.06,0)); }
  else if(t==='engineer'){ g.add(box(R,0.26,0.26,0.14,0,0.66,-0.17)); g.add(box(D,0.27,0.04,0.15,0,0.72,-0.17)); g.add(cyl(Mt,0.008,0.38,0.008,0.09,0.94,-0.2)); const bl=ball(glow('#ff5a4f'),0.02,0.02,0.02,0.09,1.13,-0.2); g.add(bl); U.blink=bl;
    g.add(box(mat('#3a3a2e'),0.3,0.05,0.18,0,0.51,0.01)); gun.add(box(Mt,0.06,0.07,0.28,0,0,0.06)); const w=box(glow('#9fd3ff'),0.03,0.03,0.04,0,0,0.22); gun.add(w); U.weld=w; }
  else if(t==='scientist'){ g.children.forEach(c=>{ if(c.material===A||c.material===S) c.material=mat('#d9dee4'); }); g.add(box(mat('#d9dee4'),0.3,0.32,0.2,0,0.5,0)); g.add(box(mat('#3a6a8a'),0.14,0.16,0.06,0.12,0.6,0.14)); g.add(box(glow('#7ff6ff'),0.08,0.03,0.065,0.12,0.62,0.14)); g.remove(gun); U.gun=null; }
  else { g.add(box(D,0.22,0.22,0.1,0,0.67,-0.15)); g.add(rotZ(cyl(D,0.05,0.2,0.05,0,0.6,-0.22),Math.PI/2));   /* trooper: pack and bedroll */
    gun.add(box(Mt,0.07,0.1,0.42,0,0,0.08)); gun.add(rotX(cyl(D,0.02,0.18,0.02,0,0.02,0.36),Math.PI/2)); gun.add(box(D,0.05,0.12,0.06,0,-0.09,0.08)); gun.add(rotX(cyl(Mt,0.026,0.16,0.026,0,-0.06,0.24),Math.PI/2)); gun.add(box(R,0.072,0.02,0.1,0,0.06,0.0)); }
  if(rz) v3Risen(g,U,t);
  void last; U.top=1.1; return g; }
/* the risen (zombie mode): torn armour with the green showing through, dead green eyes, a pulsing green haze and a shamble (v3Pose) */
function v3Risen(g,U,t){ const rot=glow(SKIN.risen.eye), D=mat('#141a12');
  if(t==='scientist'||t==='engineer'||t==='pyro') for(const k of [-1,1]) g.add(ball(rot,0.022,0.022,0.022,k*0.04,0.94,t==='scientist'?0.095:0.11));   /* dead eyes where there is no visor */
  for(const [x,y,z,w,h] of [[0.07,0.72,0.112,0.07,0.05],[-0.1,0.62,0.09,0.05,0.06],[0.04,0.3,0.07,0.04,0.07]]){ g.add(box(D,w+0.02,h+0.02,0.012,x,y,z)); g.add(box(rot,w,h,0.014,x,y,z+0.002)); }   /* tears in the kit, glowing inside */
  g.add(box(D,0.12,0.03,0.12,-0.075,0.04,0.01));   /* a scrap of rag at one boot */
  const haze=v3Sprite(); haze.material.color.set('#7cff52'); haze.scale.set(0.9,1.2,1); haze.position.set(0,0.55,0); haze.userData.noXray=true; haze.raycast=()=>{}; g.add(haze);
  U.risen=haze; U.lean=0.14; }

/* ---------- creatures ----------
   The Swarm is its own life: lunar fungus and burrowing arthropods, plum flesh with bone plates and green light in the seams.
   On purpose nothing here is shaped like a film monster: no long smooth skulls, no tubes on the back, no bladed tails,
   no crowned queen with an egg sac, no eggs that open in petals. Names (Nov 2026): Scuttler (type drone), Sporebag (bloater), The Matron (broodmother). */
const CH={ body:'#3d2a4a', dark:'#2a1e33', bone:'#bcae90', pale:'#7d6290', glow:'#a6ff4a' };
function fung(col){ return shiny(col,{ specular:0x3a3044, shininess:22 }); }
function legPair(g,U,m,x,y,z,len,w,splay,bend){ for(const s of [-1,1]){ const hip=grp(s*x,y,z); hip.rotation.z=s*splay; hip.add(box(m,w,len,w,0,-len/2,0));
    const kn=grp(0,-len,0); kn.add(box(m,w*0.8,len*1.1,w*0.8,0,-len*0.55,0)); kn.add(part(GEO.cone,m,w*0.5,len*0.3,w*0.5,0,-len*1.2,0)); kn.rotation.z=-s*bend; hip.add(kn); g.add(hip); U.legs.push(hip); } }
/* spots of light along a shell */
function spots(par,n,rx,ry,rz,y0,seed,size=0.03){ for(let i=0;i<n;i++){ const a=i*2.39+seed, b=0.3+((i*0.37+seed)%1)*0.9; par.add(ball(glow(CH.glow),size,size,size,Math.cos(a)*Math.sin(b)*rx,y0+Math.cos(b)*ry,Math.sin(a)*Math.sin(b)*rz)); } }
/* a cloven goat hoof under a pastern: two glossy dark halves with a split between them, two dewclaws behind (lvl levels it on the ground) */
function v3Hoof(par,y,sc,lvl=0){ const h=grp(0,y,0); h.rotation.x=lvl; h.userData.hoof=true; par.add(h); const m=shiny('#1d191c',{ specular:0x6a6070, shininess:60 });
  h.add(ball(mat('#2a1e33'),0.05*sc,0.03*sc,0.05*sc,0,0,0));
  for(const k of [-1,1]){ const hf=part(GEO.taper,m,0.03*sc,0.065*sc,0.05*sc,k*0.029*sc,-0.035*sc,0.012*sc); hf.rotation.z=-k*0.1; h.add(hf); const toe=part(GEO.cone,m,0.022*sc,0.04*sc,0.02*sc,k*0.03*sc,-0.05*sc,0.055*sc); toe.rotation.x=Math.PI/2+0.3; h.add(toe); }
  for(const k of [-1,1]){ const dc=part(GEO.cone,m,0.012*sc,0.035*sc,0.012*sc,k*0.025*sc,0.0,-0.045*sc); dc.rotation.x=Math.PI-0.5; h.add(dc); }
  return h; }
function v3Creature(e){
  const t=e.type, g=new THREE.Group(), U=g.userData; U.legs=[]; U.arms=[];
  const C=fung(CH.body), Dk=fung(CH.dark), B=fung(CH.bone), L=fung(CH.pale), eye=glow(CH.glow);
  if(t==='crawler'||t==='grafter'){ const s=t==='grafter'?0.65:1;
    /* a tick: a low round shell with a bone rim, six short legs, two feelers, lights on its back */
    const shell=grp(0,0.13*s,0); shell.add(part(GEO.half,C,0.22*s,0.13*s,0.24*s,0,0,0)); shell.add(part(GEO.torus,B,0.21*s,0.5*s,0.23*s,0,0.005,0)); spots(shell,5,0.15*s,0.1*s,0.16*s,0,1.3,0.022*s); g.add(shell); U.torso=shell;
    g.add(ball(L,0.07*s,0.05*s,0.06*s,0,0.12*s,0.22*s)); for(const k of [-1,1]){ g.add(ball(eye,0.016*s,0.016*s,0.016*s,k*0.03*s,0.15*s,0.27*s)); const f=part(GEO.claw,B,0.008*s,0.008*s,0.16*s,k*0.03*s,0.14*s,0.26*s); f.rotation.set(-0.5,k*0.5,0); g.add(f); }
    for(let i=0;i<3;i++) for(const k of [-1,1]){ const hip=grp(k*0.17*s,0.12*s,(0.1-i*0.1)*s); hip.rotation.z=k*1.25; hip.rotation.y=k*(i-1)*0.4; hip.add(box(Dk,0.03*s,0.12*s,0.03*s,0,-0.06*s,0));
      const kn=grp(0,-0.12*s,0); kn.rotation.z=-k*1.6; kn.add(box(B,0.022*s,0.13*s,0.022*s,0,-0.065*s,0)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    if(t==='grafter') for(let i=0;i<3;i++) g.add(rotX(cyl(glow('#c58cff'),0.008,0.25,0.008,(i-1)*0.05,0.25,0.2),0.8));
    U.top=0.35*s; return g; }
  if(t==='drone'){
    /* the Scuttler: an upright mantis of the dark. A low ringed abdomen, a thin standing body, a small head with two big glowing eyes,
       two bone scythes folded ready in front, four long splayed legs */
    const abd=grp(0,0.4,-0.16); abd.rotation.x=-0.25; abd.add(ball(Dk,0.11,0.1,0.24,0,0,-0.04)); for(let i=0;i<3;i++) abd.add(part(GEO.torus,B,0.105-i*0.012,0.25,0.1-i*0.012,0,0,0.08-i*0.1)); spots(abd,3,0.08,0.07,0.18,0.01,0.7,0.02); g.add(abd);
    const body=grp(0,0.42,0.0); body.rotation.x=-0.35; g.add(body); U.torso=body;
    body.add(box(C,0.09,0.34,0.08,0,0.17,0)); body.add(box(B,0.095,0.04,0.085,0,0.08,0)); body.add(box(B,0.095,0.04,0.085,0,0.22,0));
    const head=grp(0,0.38,0.03); head.add(rotX(part(GEO.cone,L,0.07,0.1,0.06,0,0,0.03),Math.PI/2)); for(const k of [-1,1]) head.add(ball(eye,0.035,0.04,0.035,k*0.06,0.01,0.0));
    for(const k of [-1,1]){ const md=part(GEO.claw,B,0.008,0.008,0.06,k*0.02,-0.03,0.09); md.rotation.y=-k*0.5; head.add(md); } body.add(head); U.head=head;
    for(const k of [-1,1]){ const sh=grp(k*0.06,0.29,0.04); sh.add(box(B,0.035,0.2,0.035,0,0.1,0)); const el=grp(0,0.2,0); el.add(box(B,0.03,0.2,0.03,0,-0.1,0));
      const blade=part(GEO.claw,B,0.012,0.04,0.18,0,-0.2,0); blade.rotation.x=Math.PI/2+0.3; el.add(blade); for(let i=0;i<3;i++) el.add(part(GEO.cone,B,0.008,0.03,0.008,0,-0.05-i*0.05,0.02));
      el.rotation.x=2.5; sh.add(el); sh.rotation.set(-0.9,0,k*0.08); sh.userData.base=-0.9; body.add(sh); U.arms.push(sh); }
    for(let i=0;i<2;i++) for(const k of [-1,1]){ const hip=grp(k*0.06,0.42,0.02-i*0.16); hip.rotation.set(0,k*(i?-0.5:0.5),k*1.2); hip.add(box(Dk,0.03,0.3,0.03,0,-0.15,0));
      const kn=grp(0,-0.3,0); kn.rotation.z=-k*1.9; kn.add(box(B,0.025,0.42,0.025,0,-0.21,0)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    U.top=0.95; return g; }
  if(t==='spitter'){
    /* a squat mortar-beetle: four thick legs, a huge glowing acid bladder on its back, a hard nozzle curving up from the face */
    const body=grp(0,0.38,0); g.add(body); U.torso=body;
    body.add(ball(C,0.2,0.14,0.24,0,0,0)); body.add(part(GEO.torus,B,0.2,0.4,0.24,0,-0.02,0));
    const sac=grp(0,0.2,-0.06); sac.add(ball(glow('#7ad62a'),0.16,0.15,0.18,0,0,0)); sac.add(ball(mat('#5fae22',{ transparent:true, opacity:0.5 }),0.21,0.2,0.23,0,0,0)); for(let i=0;i<4;i++) sac.add(rotZ(box(B,0.015,0.02,0.42,0,0,0),0)), sac.children[sac.children.length-1].rotation.set(0,i*0.8,0), sac.children[sac.children.length-1].position.y=0.17; body.add(sac); U.sac=sac;
    const head=grp(0,0.02,0.24); head.add(ball(L,0.09,0.08,0.08,0,0,0)); head.add(ball(eye,0.02,0.02,0.02,0.05,0.04,0.06)); head.add(ball(eye,0.02,0.02,0.02,-0.05,0.04,0.06));
    const noz=grp(0,0.03,0.07); let seg=noz; for(let i=0;i<3;i++){ const s=grp(0,0,0.06); s.add(rotX(cyl(B,0.03-i*0.004,0.08,0.03-i*0.004,0,0,0.03),Math.PI/2)); s.rotation.x=-0.35; seg.add(s); seg=s; } seg.add(ball(glow('#c7f05a'),0.025,0.025,0.025,0,0,0.08)); head.add(noz); body.add(head); U.head=head;
    for(const z of [0.13,-0.13]) for(const k of [-1,1]){ const hip=grp(k*0.17,0.38,z); hip.rotation.z=k*0.7; hip.add(box(Dk,0.07,0.22,0.07,0,-0.11,0)); const kn=grp(0,-0.22,0); kn.rotation.z=-k*0.9; kn.add(box(B,0.05,0.22,0.05,0,-0.11,0)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    U.top=0.85; return g; }
  if(t==='brute'){
    /* an armoured ram: seven overlapping bone bands like an armadillo (knobs on top, plum flesh and a thin green glow in the seams),
       a flat battering-ram skull plate with cracks, curled ram horns, eyes deep under the plate, two curved tusks on the jaw,
       forelegs with a studded bone club at the wrist, digitigrade hind legs, all four on cloven goat hooves, a short goat tail over the rump plate.
       U.bands break off as it gets hurt (v3Pose: below 50% and 25%), the seams behind them glow brighter. */
    const body=grp(0,0.78,0); g.add(body); U.torso=body; U.bands=[]; U.seams=[];
    body.add(ball(C,0.38,0.33,0.55,0,0,0)); body.add(ball(Dk,0.33,0.2,0.48,0,-0.13,0.02));
    const B2=fung('#a89a7e'), B3=fung('#8f8268'), seam=glow('#3f6a1e');
    for(let i=0;i<7;i++){ const r=0.46-Math.abs(i-2.6)*0.032, z=0.42-i*0.145, yo=0.02-Math.max(0,i-4)*0.035, band=grp(0,yo,z);
      band.add(part(GEO.half,i%2?B:B2,r,r*0.92,0.135,0,0,0)); band.add(part(GEO.half,B3,r+0.014,r*0.92+0.014,0.03,0,0,-0.105));   /* the band and its raised back edge */
      for(const a of [-0.55,0,0.55]){ const kn=part(GEO.cone,B3,0.035,0.07,0.035,Math.sin(a)*r*0.98,Math.cos(a)*r*0.9+0.02,-0.02); kn.rotation.z=-a; band.add(kn); }
      body.add(band); band.userData.by=yo; U.bands.push(band);
      if(i<6){ const sm=part(GEO.half,seam,r*0.955,r*0.88,0.03,0,yo,z-0.15); body.add(sm); U.seams.push(sm); } }
    spots(body,4,0.36,0.12,0.45,-0.16,2.1,0.03);
    const rump=part(GEO.half,B2,0.25,0.12,0.22,0,-0.04,-0.55); rump.rotation.x=-Math.PI/2; body.add(rump);
    for(let i=0;i<5;i++){ const a=i*1.257+0.3, kn=part(GEO.lowball,B3,0.04,0.04,0.04,Math.cos(a)*0.17,-0.04+Math.sin(a)*0.15,-0.6); body.add(kn); }
    /* a short goat tail: up and back from the rump, curling over, a bony tuft at the tip (v3PoseBrute flicks it) */
    { let tl=grp(0,0.06,-0.64); tl.rotation.x=-0.55; body.add(tl); U.tail=tl;
      for(let i=0;i<4;i++){ const rr=0.055-i*0.01; tl.add(cyl(i%2?C:Dk,rr,0.09,rr,0,0.045,0)); tl.add(part(GEO.torus,B3,rr*1.1,0.6,rr*1.1,0,0.08,0)); const nx=grp(0,0.09,0); nx.rotation.x=-0.38; tl.add(nx); tl=nx; }
      for(let i=0;i<6;i++){ const a=i*1.05, tf=part(GEO.cone,B3,0.024,0.1,0.024,Math.cos(a)*0.016,0.04,Math.sin(a)*0.016); tf.rotation.set(Math.sin(a)*0.55,0,-Math.cos(a)*0.55); tl.add(tf); } }
    /* the head: skull, ram plate, cracks, brow, sockets with small eyes, jaw with tusks, nostrils (steam comes out here) */
    const head=grp(0,-0.12,0.58); body.add(head); U.head=head;
    head.add(ball(L,0.19,0.16,0.2,0,0,0));
    const plate=grp(0,0.04,0.17); plate.rotation.x=-0.28; head.add(plate);
    plate.add(ball(B,0.17,0.145,0.06,0,0,0)); plate.add(ball(B2,0.19,0.045,0.07,0,0.12,-0.01)); plate.add(ball(B3,0.13,0.03,0.05,0,-0.13,0.0));
    for(const [x,y,h,r] of [[-0.07,0.03,0.09,0.5],[-0.035,-0.035,0.06,-0.3],[0.08,0.0,0.07,-0.9],[0.04,0.06,0.05,0.2]]){ const ck=box(B3,0.009,h,0.01,x,y,0.058); ck.rotation.z=r; plate.add(ck); }   /* old cracks in the plate */
    for(const k of [-1,1]){ head.add(ball(Dk,0.045,0.035,0.03,k*0.115,-0.06,0.18)); head.add(ball(eye,0.022,0.018,0.015,k*0.115,-0.06,0.2)); }
    const jaw=grp(0,-0.13,0.06); jaw.add(box(Dk,0.2,0.06,0.2,0,0,0.04)); head.add(jaw); U.jaw=jaw; U.tusks=[];
    for(const k of [-1,1]){ let tg=grp(k*0.09,-0.01,0.12); tg.rotation.set(0.6,0,k*0.2); jaw.add(tg); U.tusks.push(tg);   /* two tusks: down and back out of the jaw, then curving forward */
      for(let i=0;i<4;i++){ const rr=0.032-i*0.0065; tg.add(cyl(i?B:B2,rr,0.058,rr,0,-0.029,0)); const nx=grp(0,-0.058,0); nx.rotation.x=-0.45; tg.add(nx); tg=nx; } }
    for(const k of [-1,1]) head.add(ball(glow('#120c16'),0.02,0.015,0.01,k*0.04,-0.1,0.21));
    const snout=grp(0,-0.1,0.24); head.add(snout); U.snout=snout;
    /* curled ram horns: a chain of ridged segments that grows up and back, then curls down and forward around the side of the head */
    for(const k of [-1,1]){ let seg=grp(k*0.17,0.1,-0.03); seg.rotation.set(-0.5,0,-k*0.6); head.add(seg);
      for(let i=0;i<7;i++){ const rr=0.065-i*0.0065, ln=0.085; seg.add(cyl(i%2?B:B2,rr,ln,rr,0,ln/2,0)); seg.add(part(GEO.torus,B3,rr*1.05,0.6,rr*1.05,0,0.004,0));
        const nx=grp(0,ln,0); nx.rotation.set(-0.72,0,-k*0.07); seg.add(nx); seg=nx; } }
    /* forelegs: a thick upper arm under a bone shoulder plate, a forearm with a knuckled, studded bone club at the wrist, a slim pastern on a goat hoof */
    U.fore=[]; U.hind=[]; U.brute=true;
    for(const k of [-1,1]){ const sh=grp(k*0.33,-0.05,0.3); sh.add(box(Dk,0.17,0.34,0.18,0,-0.16,0)); sh.add(part(GEO.half,B2,0.13,0.1,0.15,k*0.02,0.0,0)); sh.children[1].rotation.z=-k*0.5;
      const el=grp(0,-0.33,0); el.add(part(GEO.taper,C,0.08,0.24,0.08,0,-0.11,0)); el.children[0].rotation.x=Math.PI; el.add(ball(B,0.115,0.12,0.12,0,-0.22,0.02)); el.add(box(B3,0.15,0.035,0.15,0,-0.17,0.02));
      for(let i=0;i<6;i++){ const a=i*1.05; el.add(part(GEO.cone,B3,0.022,0.05,0.022,Math.cos(a)*0.11,-0.22+Math.sin(a)*0.04,0.02+Math.sin(a)*0.09)); el.children[el.children.length-1].rotation.set(Math.sin(a)*1.2,0,-Math.cos(a)*1.4); }
      el.add(cyl(Dk,0.04,0.1,0.04,0,-0.32,0)); v3Hoof(el,-0.36,1.35);
      sh.add(el); sh.rotation.x=-0.15; body.add(sh); U.fore.push({ sh, el, k, off:k<0?0:Math.PI }); }
    /* hind legs: thigh down and forward, shin down and back, a long upright pastern on a goat hoof */
    for(const k of [-1,1]){ const hip=grp(k*0.27,0.64,-0.38); hip.rotation.x=-0.45; hip.add(box(Dk,0.17,0.34,0.2,0,-0.16,0));
      const kn=grp(0,-0.32,0); kn.rotation.x=0.95; kn.add(box(C,0.12,0.26,0.13,0,-0.12,0)); kn.add(ball(B3,0.07,0.06,0.07,0,0,0));
      const ft=grp(0,-0.25,0); ft.rotation.x=-0.5; ft.add(cyl(Dk,0.045,0.12,0.045,0,-0.05,0)); v3Hoof(ft,-0.1,1.35,0.5);
      kn.add(ft); hip.add(kn); g.add(hip); U.hind.push({ hip, kn, ft, k, off:k<0?Math.PI:0 }); }
    U.top=1.3; return g; }
  if(t==='bloater') return v3Grazer(e,true);
  if(t==='husk'){ const F=mat('#56614b'), Su=mat('#3d4556'), A=mat('#4a5468'), grow=shiny('#5c3e6e');
    for(const s of [-1,1]){ const hip=grp(s*0.08,0.42,0); hip.add(box(Su,0.1,0.22,0.11,0,-0.11,0)); const kn=grp(0,-0.22,0); kn.add(box(F,0.09,0.2,0.1,0,-0.1,0)); kn.add(box(mat('#262b35'),0.11,0.07,0.17,0,-0.2,0.025)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    const torso=grp(0,0.48,0); torso.rotation.x=0.45; g.add(torso); U.torso=torso;
    torso.add(box(Su,0.26,0.14,0.15,0,0.07,0)); torso.add(box(A,0.3,0.18,0.19,0,0.22,0)); torso.add(ball(grow,0.12,0.1,0.1,0.06,0.3,-0.12)); torso.add(ball(grow,0.08,0.07,0.07,-0.1,0.27,-0.1));
    const head=grp(0,0.38,0.04); head.add(ball(F,0.1,0.11,0.11,0,0,0)); head.add(ball(grow,0.07,0.06,0.07,0.05,0.07,-0.03)); head.add(ball(eye,0.025,0.02,0.02,0.04,0,0.1)); head.add(ball(eye,0.025,0.02,0.02,-0.04,0,0.1)); torso.add(head); U.head=head;
    const ra=grp(0.2,0.3,0); ra.add(box(F,0.08,0.24,0.08,0,-0.12,0)); const re=grp(0,-0.24,0); re.add(box(F,0.07,0.22,0.07,0,-0.11,0)); const cl=claws(mat('#d8d0bc'),3,0.2,0.02,0.035); cl.position.set(0,-0.22,0.03); cl.rotation.x=0.9; re.add(cl); re.rotation.x=-0.7; ra.add(re); ra.rotation.x=-0.6; ra.userData.base=-0.6; torso.add(ra); U.arms.push(ra);
    const la=grp(-0.2,0.3,0); la.add(box(Su,0.08,0.2,0.08,0,-0.1,0)); la.add(box(F,0.07,0.2,0.07,0,-0.3,0.02)); la.rotation.x=-0.2; la.userData.base=-0.2; torso.add(la); U.arms.push(la);
    U.top=0.95; return g; }
  if(t==='seedling'){ const pod=grp(0,0.95,0); pod.add(ball(shiny('#5c3e6e'),0.3,0.36,0.3,0,0,0)); for(let i=0;i<5;i++) pod.add(ball(glow('#c58cff'),0.05,0.05,0.05,Math.cos(i*1.26)*0.27,0.08,Math.sin(i*1.26)*0.27)); g.add(pod); U.sac=pod;
    for(let i=0;i<4;i++){ const a=i*Math.PI/2+0.4, hip=grp(Math.cos(a)*0.18,0.85,Math.sin(a)*0.18); hip.rotation.set(Math.sin(a)*0.5,0,-Math.cos(a)*0.5); hip.add(box(C,0.04,0.85,0.04,0,-0.42,0)); g.add(hip); U.legs.push(hip); }
    U.top=1.35; return g; }
  if(t==='broodmother') return v3Matron(e);
  if(t==='grazer') return v3Grazer(e,false);
  return null; }

/* the grazer: docile lunar fauna in dusty ochre with a pale belly. A folded hide, two rows of slanted dark plates down the back,
   a long neck, big dark eyes, flap ears, two short back-swept horns, feelers under the snout to scrape lichen off the rock,
   knees and broad flat hooves for the dust, a stubby tail. Infected (the Sporebag) it is the same beast, swollen: the hide split
   over a see-through belly full of glowing acid, purple rot in the folds, green eyes. */
function v3Grazer(e,sick){
  const g=new THREE.Group(), U=g.userData; U.legs=[]; U.arms=[]; U.grazer=!sick;
  const H=sick?mat('#7a5634'):mat('#a87a42'), Dk=sick?fung(CH.body):mat('#6e4e2a'), N=mat(sick?'#9a8a6a':'#d6b47e'), P=sick?fung('#4a3040'):mat('#4f3720'),
        Hf=mat('#2e2218'), Hn=mat(sick?'#8f8168':'#c9b48a'), eyeM=sick?glow(CH.glow):shiny('#141013',{ specular:0xffffff, shininess:110 });
  const body=grp(0,0.62,0); g.add(body); U.torso=body;
  if(sick){ const belly=grp(0,-0.02,0); belly.add(ball(glow('#a3c94a'),0.3,0.26,0.4,0,0,0)); belly.add(ball(mat('#6d7a2e',{ transparent:true, opacity:0.72 }),0.37,0.32,0.48,0,0,0));
      for(let i=0;i<10;i++){ const a=i*2.4, b=0.5+hash2(e.id,i,3)*0.9; belly.add(ball(glow('#d8ff6a'),0.035,0.035,0.035,Math.cos(a)*Math.sin(b)*0.37,Math.cos(b)*0.31,Math.sin(a)*Math.sin(b)*0.47)); }
      body.add(belly); U.sac=belly;
      for(const [x,z,w,a] of [[0.17,0.18,0.15,0.5],[-0.19,-0.06,0.17,-0.55],[0.13,-0.27,0.13,0.35],[-0.12,0.3,0.11,-0.3]]){ const sh=part(GEO.half,H,w,0.03,w*1.3,x,Math.sqrt(Math.max(0,1-(x/0.37)**2-(z/0.48)**2))*0.3-0.03,z); sh.rotation.z=-a; body.add(sh); }   /* torn flaps of hide still lying on the belly */
      spots(body,5,0.34,0.2,0.44,0.0,1.7,0.03); }
  else { body.add(ball(H,0.28,0.24,0.44,0,0,0)); body.add(ball(N,0.23,0.15,0.37,0,-0.1,0.02));
      const R=mat('#96693a'); body.add(ball(R,0.27,0.2,0.13,0,0.06,0.3)); body.add(ball(R,0.25,0.19,0.12,0,0.05,-0.3)); body.add(ball(R,0.2,0.12,0.06,0,0.03,0.39)); for(const k of [-1,1]) body.add(ball(R,0.05,0.14,0.2,k*0.25,-0.02,0.02)); }   /* rolls of loose hide over the shoulders, the rump and along the flanks */
  const bh=sick?0.32:0.24, bl=sick?0.48:0.44;
  for(let i=0;i<6;i++) for(const k of [-1,1]){ if(sick&&hash2(e.id,i,k+5)<0.5) continue; const z=0.3-i*0.12+(k>0?0.05:0), y=bh*Math.sqrt(Math.max(0,1-(z/bl)**2))-0.005;
      const pl=part(GEO.cone,P,0.012,0.11-Math.abs(i-2)*0.012,0.055,k*0.05,y+0.04,z); pl.rotation.z=-k*0.35; body.add(pl); }   /* two rows of slanted plates */
  const tail=grp(0,0.04,-bl+0.02); tail.add(rotX(part(GEO.taper,H,0.05,0.18,0.05,0,0,-0.08),-Math.PI/2-0.5)); body.add(tail); U.tail=tail;
  /* neck and head */
  const neck=grp(0,0.1,bl-0.1); neck.rotation.x=-0.6; neck.userData.base=-0.6; body.add(neck); U.neck=neck;
  neck.add(rotX(part(GEO.taper,H,0.085,0.32,0.1,0,0,0.15),-Math.PI/2)); neck.add(ball(sick?H:mat('#96693a'),0.1,0.09,0.08,0,0.0,0.04));
  neck.add(box(N,0.06,0.05,0.26,0,-0.06,0.15));
  const head=grp(0,0,0.32); head.rotation.x=0.6; head.userData.base=0.6; head.scale.setScalar(1.25); neck.add(head); U.head=head;
  head.add(ball(H,0.11,0.1,0.14,0,0,0.05)); head.add(ball(N,0.075,0.065,0.09,0,-0.03,0.17));
  for(const k of [-1,1]){ head.add(ball(eyeM,0.038,0.044,0.04,k*0.085,0.03,0.09)); if(!sick) head.add(ball(glow('#ffffff'),0.008,0.008,0.008,k*0.1,0.05,0.12));
    const ear=grp(k*0.075,0.07,-0.04); ear.add(ball(Dk,0.07,0.014,0.035,k*0.06,0,0)); ear.add(ball(N,0.05,0.016,0.022,k*0.06,0.004,0.005)); ear.rotation.set(0,k*0.5,-k*0.35); ear.userData.bz=-k*0.35; head.add(ear); (U.ears||(U.ears=[])).push(ear);
    const horn=part(GEO.claw,Hn,0.022,0.022,0.14,k*0.045,0.09,-0.0); horn.rotation.set(-2.5,k*0.25,0); head.add(horn); }
  const jaw=grp(0,-0.07,0.12); jaw.add(box(Dk,0.09,0.03,0.11,0,0,0.04)); head.add(jaw); U.jaw=jaw;
  U.feelers=[]; for(let i=0;i<4;i++){ const f=grp((i-1.5)*0.03,-0.07,0.22); f.add(cyl(sick?glow('#c7f05a'):Hn,0.005,0.08,0.005,0,-0.04,0)); f.rotation.x=0.3; head.add(f); U.feelers.push(f); }
  /* legs with knees and broad flat hooves; order: front left, front right, back left, back right */
  const lw=sick?1.15:1, spread=sick?0.2:0.17;
  for(const z of [0.26,-0.26]) for(const k of [-1,1]){ const hip=grp(k*spread,-0.07,z); hip.add(box(H,0.09*lw,0.27,0.11*lw,0,-0.12,0));
      const kn=grp(0,-0.26,0); kn.add(ball(Dk,0.05,0.045,0.055,0,0,0)); kn.add(box(Dk,0.06*lw,0.22,0.065*lw,0,-0.11,0)); kn.add(cyl(Hf,0.055,0.04,0.065,0,-0.235,0.01)); hip.add(kn); hip.userData.knee=kn;
      body.add(hip); U.legs.push(hip); }
  U.top=sick?1.05:1.0; return g; }

/* ---------- the Sentry Gun (Nov 2026): a tripod with knees, foot plates and ground spikes, an ammo/battery box with a cable, a slewing ring,
   an armoured turret (slanted plates, rivets, hazard stripe, LC stencil), one heavy barrel with a perforated cooling jacket and a muzzle brake,
   an ammo drum with a belt, a sensor head with a red lens, a radar dish and an antenna.
   Moves: unfolds when set up and folds when packed (legs out, turret rises, barrel swings up), recoil, muzzle flash and casings flying out,
   scans slowly with no target, the dish turns; below plateAt a side plate flies off, below smokeAt it sparks and smokes. ---------- */
const SENTRY3D = { size:1.15, scan:0.7, scanSpeed:0.55, scanDelay:2, recoil:0.07, flash:1, casings:true, plateAt:0.5, smokeAt:0.25, smoke:5, sparks:4 };
function v3SentryTex(kind){ const k='sentryTex'+kind; if(MAT[k]) return MAT[k];
  const c=document.createElement('canvas'), x=c.getContext('2d');
  if(kind==='jacket'){ c.width=64; c.height=64; x.fillStyle='#363c45'; x.fillRect(0,0,64,64); x.fillStyle='#0b0c0e';
    for(let j=0;j<6;j++) for(let i=0;i<8;i++){ x.beginPath(); x.arc(4+i*8,5+j*10+(i%2)*5,2.3,0,7); x.fill(); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,1); return MAT[k]=v3Fogify(new THREE.MeshLambertMaterial({ map:t })); }
  /* 'lc': a worn plate with the Lunar Corps stencil */
  c.width=128; c.height=64; x.fillStyle='#323944'; x.fillRect(0,0,128,64);
  for(let i=0;i<40;i++){ x.fillStyle=`rgba(${i%2?20:90},${i%2?22:96},${i%2?26:106},.35)`; x.fillRect(hash2(i,1,3)*128,hash2(i,2,3)*64,2+hash2(i,3,3)*10,1); }   /* scratches and grime */
  x.save(); x.globalAlpha=0.7; x.fillStyle='#b9c0c8'; x.font='bold 40px Impact, "Arial Black", sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('LC',64,34); x.restore();
  x.globalCompositeOperation='destination-out'; x.fillStyle='#000'; x.fillRect(52,14,2,40); x.fillRect(76,14,2,40); x.globalCompositeOperation='source-over';   /* stencil bridges */
  x.fillStyle='rgba(185,192,200,.55)'; x.fillRect(6,6,116,1); x.fillRect(6,57,116,1);
  const t=new THREE.CanvasTexture(c); t.anisotropy=4; return MAT[k]=v3Fogify(new THREE.MeshLambertMaterial({ map:t })); }
function v3Sentry(e){
  const g=new THREE.Group(), U=g.userData; U.own=[]; GEO.plane=GEO.plane||new THREE.PlaneGeometry(1,1);
  const hull=mat('#262c34'), plate=mat('#313843'), dark=mat('#121418'), gunM=shiny('#363c45',{ specular:0x4a505a, shininess:45 }), yel=mat('#8a6d22'),
        brass=shiny('#7a5d1e',{ specular:0x665533, shininess:55 }), rub=mat('#0a0b0c'), lc=v3SentryTex('lc');
  const S=grp(); S.scale.setScalar(SENTRY3D.size); g.add(S); U.S=S;
  const L=0.6; U.L=L;
  /* the ammo/battery box on the ground between two legs, a cable up to the hub */
  const ba=Math.PI+Math.PI/3, B=grp(Math.sin(ba)*0.34,0,Math.cos(ba)*0.34); B.rotation.y=ba; S.add(B);
  B.add(box(plate,0.24,0.14,0.16,0,0.07,0)); B.add(box(dark,0.25,0.02,0.17,0,0.145,0)); B.add(box(yel,0.245,0.025,0.165,0,0.1,0));
  B.add(box(dark,0.1,0.02,0.02,0,0.165,0)); B.add(box(glow('#5fe3b0'),0.02,0.02,0.01,0.08,0.12,0.083)); for(const k of [-1,1]) B.add(box(dark,0.02,0.1,0.17,k*0.12,0.07,0));
  const bw=new THREE.Vector3(Math.sin(ba)*0.34,0.15,Math.cos(ba)*0.34), V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const cg=v3Tube([bw,V(bw.x*0.75,0.24,bw.z*0.75),V(bw.x*0.3,0.3,bw.z*0.3),V(0,0.4,0)],0.014,0.014,10,5); U.own.push(cg);
  U.cable=new THREE.Mesh(cg,rub); U.cable.castShadow=true; S.add(U.cable);
  /* the hub: legs hang from it, the slewing ring and turret sit on it (its height follows the legs) */
  const hub=grp(0,0.45,0); S.add(hub); U.hub=hub;
  hub.add(cyl(dark,0.1,0.14,0.1,0,0.0,0)); hub.add(cyl(hull,0.17,0.05,0.17,0,0.08,0)); hub.add(part(GEO.torus,gunM,0.17,0.5,0.17,0,0.08,0));
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; hub.add(ball(dark,0.012,0.012,0.012,Math.sin(a)*0.15,0.106,Math.cos(a)*0.15)); }   /* bolts on the ring */
  U.legs=[];
  for(let i=0;i<3;i++){ const r=grp(); r.rotation.y=Math.PI+i*2*Math.PI/3; hub.add(r); r.add(box(dark,0.07,0.06,0.09,0,-0.02,0.07));
    const h=grp(0,-0.02,0.1); r.add(h);
    h.add(box(hull,0.06,L*0.55,0.07,0,-L*0.275,0)); h.add(ball(dark,0.045,0.045,0.045,0,-L*0.55,0)); h.add(box(dark,0.045,L*0.47,0.05,0,-L*0.77,0));
    h.add(cyl(gunM,0.014,L*0.45,0.014,0,-L*0.3,-0.05)); h.add(box(yel,0.062,0.03,0.072,0,-L*0.12,0));   /* hydraulic piston, a yellow band */
    const f=grp(0,-L,0); h.add(f); f.add(cyl(dark,0.075,0.025,0.075,0,0.012,0)); f.add(rotX(part(GEO.cone,gunM,0.022,0.09,0.022,0,-0.035,0),Math.PI));
    U.legs.push({ h, f }); }
  /* the turret: forward is +z */
  const T=grp(0,0.11,0); hub.add(T); U.turret=T;
  T.add(box(dark,0.3,0.04,0.34,0,0.02,0)); T.add(box(hull,0.3,0.22,0.36,0,0.14,0));
  const gl=box(plate,0.32,0.17,0.05,0,0.16,0.19); gl.rotation.x=-0.55; T.add(gl);   /* slanted front plate */
  const top=grp(0,0.26,-0.02); top.add(box(plate,0.31,0.03,0.3,0,0,0)); const tl=new THREE.Mesh(GEO.plane,lc); tl.scale.set(0.24,0.12,1); tl.rotation.x=-Math.PI/2; tl.position.set(0,0.016,-0.05); top.add(tl); T.add(top);
  const side=(k)=>{ const p=grp(k*0.165,0.14,0); p.add(box(plate,0.03,0.2,0.32,0,0,0)); p.rotation.z=-k*0.1;
    for(const [yy,zz] of [[0.08,0.13],[0.08,-0.13],[-0.08,0.13],[-0.08,-0.13]]) p.add(ball(dark,0.012,0.012,0.012,k*0.016,yy,zz));
    const s=new THREE.Mesh(GEO.plane,lc); s.scale.set(0.24,0.12,1); s.rotation.y=k*Math.PI/2; s.position.set(k*0.016,0,-0.02); p.add(s); T.add(p); return p; };
  U.plate=side(-1); side(1);
  for(let i=0;i<6;i++) T.add(box(i%2?dark:yel,0.05,0.045,0.012,-0.125+i*0.05,0.08,-0.183));   /* hazard stripe on the back */
  for(const k of [-1,1]) T.add(box(dark,0.02,0.02,0.1,k*0.1,0.1,-0.2));   /* grab handles */
  /* the gun */
  const gn=grp(0,0.13,0.17); T.add(gn); U.gun=gn; U.gz=0.17;
  gn.add(box(dark,0.11,0.11,0.16,0,0,0.02)); gn.add(box(hull,0.115,0.04,0.1,0,0.06,0.0));
  gn.add(rotX(cyl(v3SentryTex('jacket'),0.048,0.32,0.048,0,0,0.26),Math.PI/2)); gn.add(rotX(cyl(dark,0.052,0.02,0.052,0,0,0.11),Math.PI/2)); gn.add(rotX(cyl(dark,0.052,0.02,0.052,0,0,0.42),Math.PI/2));
  gn.add(rotX(cyl(gunM,0.024,0.18,0.024,0,0,0.5),Math.PI/2));
  gn.add(box(dark,0.075,0.055,0.1,0,0,0.62)); for(const k of [-1,1]) gn.add(box(rub,0.077,0.012,0.012,0,k*0.012,0.6+k*0.02));   /* muzzle brake with slots */
  U.muzzle=grp(0,0,0.68); gn.add(U.muzzle); U.port=grp(0.06,0.02,0.04); gn.add(U.port);
  /* ammo drum on the right with the belt running into the gun */
  const dr=grp(0.25,0.13,0.0); T.add(dr); dr.add(rotZ(cyl(hull,0.11,0.1,0.11,0,0,0),Math.PI/2)); dr.add(rotZ(cyl(dark,0.08,0.104,0.08,0,0,0),Math.PI/2)); dr.add(rotZ(part(GEO.torus,gunM,0.11,0.6,0.11,0.05,0,0),Math.PI/2));
  for(let i=0;i<7;i++){ const t=i/6, x=0.24-t*0.18, y=0.24+Math.sin(t*Math.PI)*0.04-t*0.02, z=0.05+t*0.11; const l=box(brass,0.022,0.012,0.04,x,y,z); l.rotation.y=0.6; T.add(l); }
  /* sensor head with the red lens, radar dish, antenna */
  const sh=grp(-0.1,0.31,0.11); T.add(sh); sh.add(box(dark,0.1,0.075,0.09,0,0,0)); sh.add(box(hull,0.11,0.015,0.11,0,0.044,0.01));
  U.lens=ball(glow('#ff3b2f'),0.026,0.026,0.012,0,0,0.047); sh.add(U.lens); sh.add(rotX(part(GEO.torus,gunM,0.03,0.4,0.03,0,0,0.046),Math.PI/2));
  U.ext=[];
  const dm=grp(0.07,0.275,-0.11); T.add(dm); dm.add(cyl(gunM,0.012,0.07,0.012,0,0.035,0)); U.dish=grp(0,0.075,0); dm.add(U.dish);
  const dish=part(GEO.half,gunM,0.075,0.025,0.075,0,0,0); dish.rotation.x=-1.25; U.dish.add(dish); U.dish.add(cyl(dark,0.006,0.06,0.006,0,0.02,0.02)); U.ext.push(dm);
  const an=grp(-0.12,0.275,-0.15); T.add(an); an.add(cyl(dark,0.007,0.34,0.007,0,0.17,0)); U.blink=ball(glow('#ff5a4f'),0.016,0.016,0.016,0,0.345,0); an.add(U.blink); U.ext.push(an);
  U.sentry=true; U.top=1.0*SENTRY3D.size; U.dishA=0; return g; }
/* u: 0 folded … 1 unfolded */
function v3PoseSentry(e,U,T){ const C=SENTRY3D;
  let u=1; if(e.built){ if(e.unfoldT>0) u=1-e.unfoldT/(ANIM.unfold||1); else if(e.packing>0&&e.packing<1) u=1-e.packing; }
  u=clamp(u,0,1); const s=u*u*(3-2*u), lu=clamp(s/0.6,0,1), gu=clamp((s-0.5)/0.5,0,1), sp=1.45+(0.72-1.45)*lu;
  U.hub.position.y=U.L*Math.cos(sp)+0.025;
  for(const l of U.legs){ l.h.rotation.x=-sp; l.f.rotation.x=sp; }
  U.cable.visible=u>=1; for(const o of U.ext) o.visible=gu>0.8;
  const dt=Math.min(0.1,Math.max(0,T-(U.lt??T))); U.lt=T;
  /* aim, or scan slowly with nothing to shoot at */
  const tg=e.target&&!e.target.dead; if(tg) U.aimT=T; const idle=T-(U.aimT??-99)>C.scanDelay&&u>=1;
  U.scanW=(U.scanW||0)+((idle?1:0)-(U.scanW||0))*Math.min(1,dt*1.5);
  const a=e.angle??-Math.PI/2; U.turret.rotation.y=Math.atan2(Math.cos(a),Math.sin(a))+U.scanW*Math.sin(T*C.scanSpeed+e.id)*C.scan;
  U.dishA+=dt*(idle?1.6:4.5); U.dish.rotation.y=U.dishA;
  /* barrel: hangs down while folded; recoil; a new shot flashes and throws a casing */
  const rc=e.recoil>0?e.recoil/0.08:0; U.gun.rotation.x=(1-gu)*0.9; U.gun.position.z=U.gz-C.recoil*rc;
  if(e.recoil>(U.lastRc||0)+0.005){ U.flashT=0.06; U.shot=true; } U.lastRc=e.recoil>0?e.recoil:0;
  U.lens.scale.set(0.026*(tg?1.35:1)*(0.85+0.15*Math.sin(T*(tg?9:3)+e.id)),0.026*(tg?1.35:1)*(0.85+0.15*Math.sin(T*(tg?9:3)+e.id)),0.012);
  /* damage */
  const f=e.hp/e.maxHp, gone=e.built&&f<C.plateAt;
  if(U.plateGone==null) U.plateGone=gone;
  else if(gone&&!U.plateGone){ U.plateGone=true; U.fly=true; }
  else if(!gone&&U.plateGone&&f>=C.plateAt) U.plateGone=false;
  U.plate.visible=!U.plateGone; U.burning=e.built&&f<C.smokeAt; }
function v3SentryFx(now,dt,put,lights){ const C=SENTRY3D, w=V3._sw||(V3._sw=new THREE.Vector3()), w2=V3._sw2||(V3._sw2=new THREE.Vector3());
  V3.bits=V3.bits||[]; V3.sparks=V3.sparks||[];
  for(const [e,g] of V3.objs){ const U=g.userData; if(!U.sentry||!g.visible) continue;
    if(U.flashT>0){ U.flashT-=dt; U.muzzle.getWorldPosition(w); if(C.flash>0){ put(w.x,w.y,w.z,0.38*C.flash*(0.8+Math.random()*0.4),'#fff3c4',1); put(w.x,w.y,w.z,0.7*C.flash,'#ffb347',0.45); }
      if(ANIM.muzzleLight&&C.flash>0) lights.push({ x:w.x, y:w.y+0.2, z:w.z, i:1.6*C.flash, c:0xffc070, d:3.5 }); }
    if(U.shot){ U.shot=false; if(C.casings&&V3.bits.length<40){ U.port.getWorldPosition(w); const r=U.turret.getWorldQuaternion(new THREE.Quaternion()), side=new THREE.Vector3(1,0,0).applyQuaternion(r);
        const o=cyl(MAT.sentryBrass||(MAT.sentryBrass=shiny('#b08a2c',{ specular:0x998855, shininess:60 })),0.014,0.045,0.014,w.x,w.y,w.z); V3.g.add(o);
        V3.bits.push({ o, vx:side.x*rand(1.0,1.6), vy:rand(1.4,2.0), vz:side.z*rand(1.0,1.6), sx:rand(10,20), sz:rand(5,12), t:0, life:0.9, fade:0.3 }); } }
    if(U.fly){ U.fly=false; U.plate.getWorldPosition(w); U.plate.getWorldQuaternion(V3._sq||(V3._sq=new THREE.Quaternion()));
      const o=box(mat('#313843'),0.035,0.23,0.37,w.x,w.y,w.z); o.quaternion.copy(V3._sq); V3.g.add(o); const side=new THREE.Vector3(-1,0,0).applyQuaternion(V3._sq);
      V3.bits.push({ o, vx:side.x*rand(1.5,2.2), vy:rand(2.2,3), vz:side.z*rand(1.5,2.2), sx:rand(4,8), sz:rand(2,5), t:0, life:6, fade:1.5, flat:true });
      for(let i=0;i<8;i++) V3.sparks.push({ x:w.x, y:w.y, z:w.z, vx:rand(-0.8,0.8), vy:rand(0.6,1.6), vz:rand(-0.8,0.8), t:0, life:rand(0.4,0.9), col:pick(['#ffd23f','#fff3c4','#ff8a2a']) }); }
    if(U.burning){ U.acc=(U.acc||0)+dt*C.smoke; U.sacc=(U.sacc||0)+dt*C.sparks; U.turret.getWorldPosition(w2);
      while(U.acc>=1){ U.acc--; V3.smoke.push({ x:w2.x+rand(-0.1,0.1), y:w2.y+0.25, z:w2.z+rand(-0.1,0.1), t:0, sz:rand(0.6,0.85), col:pick(['#1d1b1a','#2a2725','#3a3633']), a:0.8, rise:1.6, life:rand(2,3) }); }
      while(U.sacc>=1){ U.sacc--; V3.sparks.push({ x:w2.x+rand(-0.15,0.15), y:w2.y+0.2, z:w2.z+rand(-0.15,0.15), vx:rand(-0.6,0.6), vy:rand(0.5,1.3), vz:rand(-0.6,0.6), t:0, life:rand(0.3,0.7), col:pick(['#fff3c4','#ffd23f','#9fd3ff']) }); }
      if(Math.random()<dt*3) lights.push({ x:w2.x, y:w2.y+0.4, z:w2.z, i:0.8, c:0x9fd3ff, d:2 }); } }
  for(const b of V3.bits){ b.t+=dt; const o=b.o; if(!b.rest){ b.vy-=4.5*dt; o.position.x+=b.vx*dt; o.position.y+=b.vy*dt; o.position.z+=b.vz*dt; o.rotation.x+=b.sx*dt; o.rotation.z+=b.sz*dt;
      const gy=v3H(o.position.x,o.position.z)+(b.flat?0.02:0.01); if(o.position.y<=gy&&b.vy<0){ o.position.y=gy; b.vy*=-0.3; b.vx*=0.5; b.vz*=0.5; b.sx*=0.5; b.sz*=0.5;
        if(Math.abs(b.vy)<0.4){ b.rest=true; o.rotation.set(0,o.rotation.y,Math.PI/2); } } }   /* lies flat: a plate on its face, a casing on its side */
    if(b.t>b.life-b.fade) o.position.y-=dt*0.02/b.fade; }   /* sinks into the dust before it goes (the 2D casing stays on the ground layer) */
  for(const b of V3.bits) if(b.t>=b.life) V3.g.remove(b.o);
  V3.bits=V3.bits.filter(b=>b.t<b.life); }

/* ---------- buildings, crates, bodies ---------- */
function v3Billboard(canvas,scale=2){ const tex=new THREE.CanvasTexture(canvas); tex.magFilter=THREE.NearestFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true })), w=canvas.width*scale/TILE, h=canvas.height*scale/TILE; s.scale.set(w,h,1); s.position.y=h/2;
  const g=new THREE.Group(); g.add(s); g.userData.top=h; g.userData.own=[s.material,tex]; return g; }
function v3Building(e){
  const t=e.type, s=e.size||1, g=new THREE.Group(), U=g.userData; let top=1;
  const metal=mat('#3d4454'), plate=mat('#525c70'), dark=mat('#262a33'), yel=mat('#f2c230'), steel=shiny('#8a95a6');
  if(t==='hq'){ g.add(box(dark,2.7,0.25,2.7,0,0.12,0)); g.add(box(metal,2.4,0.75,2.4,0,0.62,0)); g.add(box(plate,1.7,0.55,1.7,0,1.25,0));
    for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]) g.add(box(plate,0.35,1.1,0.35,x*1.1,0.6,z*1.1));
    g.add(part(GEO.half,shiny('#5d6f83'),0.62,0.5,0.62,0,1.52,0)); g.add(cyl(steel,0.03,1.4,0.03,0.95,1.9,-0.95)); U.blink=box(glow('#ff5a4f'),0.1,0.1,0.1,0.95,2.62,-0.95); g.add(U.blink);
    g.add(box(glow('#9fd3ff'),0.9,0.12,0.02,0,0.85,1.21)); for(let i=0;i<9;i++) g.add(box(i%2?dark:yel,0.25,0.12,0.04,-1.0+i*0.25,0.3,1.21)); top=2.7; }
  else if(t==='relay'){ g.add(box(metal,1.6,0.3,1.6,0,0.15,0)); for(const [x,z] of [[-0.4,-0.4],[0.4,-0.4],[-0.4,0.4],[0.4,0.4]]){ const l=cyl(plate,0.04,2.2,0.04,x*0.6,1.2,z*0.6); l.rotation.z=x*0.12; l.rotation.x=-z*0.12; g.add(l); }
    for(const y of [0.7,1.3,1.9]) g.add(box(plate,0.55,0.04,0.55,0,y,0));
    g.add(rotX(part(GEO.half,steel,0.45,0.15,0.45,0,2.3,0.05),-1.0)); U.blink=box(glow('#ffb347'),0.1,0.1,0.1,0,2.5,0); g.add(U.blink); top=2.6; }
  else if(t==='sentry') return v3Sentry(e);
  else if(t==='barricade'){ g.add(box(mat('#6a6a70'),0.95,0.6,0.42,0,0.3,0)); g.add(box(yel,0.96,0.08,0.43,0,0.46,0)); for(const x of [-0.3,0.3]) g.add(box(dark,0.06,0.62,0.44,x,0.31,0)); top=0.7; }
  else if(t==='hive') return v3Hive(e);
  else if(t==='lz'){ U.lamps=[]; for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ g.add(cyl(dark,0.05,0.3,0.05,x*1.3,0.15,z*1.3)); const l=ball(glow('#ffb347'),0.05,0.05,0.05,x*1.3,0.32,z*1.3); g.add(l); U.lamps.push(l); } top=0.4; }
  else if(t==='uplink'){ g.add(box(metal,0.8,0.2,0.8,0,0.1,0)); g.add(cyl(plate,0.06,1.0,0.06,0,0.6,0)); g.add(rotX(part(GEO.half,steel,0.42,0.14,0.42,0,1.1,0.05),-0.8)); top=1.4; }
  else if(t==='shaft'){ if(e.wall){ U.top=0.5; return g; } g.add(part(GEO.disc,glow('#050507'),0.7,1,0.7,0,0.03,0)); g.add(part(GEO.torus,mat('#4f5766'),0.8,1.4,0.8,0,0.08,0)); g.add(box(mat('#5a4632'),1.7,0.1,0.12,0,0.8,0.55)); g.add(box(mat('#5a4632'),0.12,0.8,0.12,-0.8,0.4,0.55)); g.add(box(mat('#5a4632'),0.12,0.8,0.12,0.8,0.4,0.55)); top=1.0; }
  else if(t==='generator'){ g.add(box(metal,1.6,0.9,1.2,0,0.45,0)); for(let i=0;i<4;i++) g.add(box(dark,0.08,0.6,1.22,-0.5+i*0.33,0.5,0)); g.add(cyl(plate,0.12,0.5,0.12,0.55,1.1,-0.3)); const core=box(glow('#ffb347'),0.4,0.25,0.06,0,0.6,0.62); g.add(core); U.core=core; top=1.2; }
  else if(t==='charge'){ g.add(cyl(mat('#59616f'),0.18,0.5,0.18,0,0.25,0)); g.add(box(yel,0.38,0.06,0.38,0,0.35,0)); U.blink=box(glow('#ff5a4f'),0.08,0.08,0.08,0,0.55,0); g.add(U.blink); top=0.7; }
  else if(t==='chargesite') top=0.2;
  else if(t==='egg'){ /* a brood bulb: a round fungal pod with light in its veins and a curled sprout on top (no lid, no petals) */
    g.add(ball(fung('#6a4a72'),0.2,0.2,0.2,0,0.2,0)); g.add(ball(fung('#7d6290'),0.12,0.12,0.12,0.13,0.12,0.06)); g.add(ball(mat('#6d8a35',{ transparent:true, opacity:0.75 }),0.09,0.09,0.09,-0.1,0.3,0.08)); g.add(ball(glow('#c7f05a'),0.05,0.05,0.05,-0.1,0.3,0.08));
    let seg=grp(0,0.38,0); g.add(seg); for(let i=0;i<4;i++){ const s=grp(0,0.05,0); s.add(cyl(fung('#bcae90'),0.018-i*0.003,0.06,0.018-i*0.003,0,0.025,0)); s.rotation.z=0.45; seg.add(s); seg=s; } top=0.6; }
  else if(t==='cocoon'){ const c=ball(shiny('#4f6a2a'),0.24,0.34,0.24,0,0.32,0); g.add(c); g.add(ball(glow('#a6ff4a'),0.08,0.12,0.08,0,0.34,0.17)); U.pulse=c; top=0.7; }
  else if(t==='door'){ g.add(box(mat('#59616f'),0.98,1.2,0.98,0,0.6,0)); g.add(box(yel,1.0,0.1,1.0,0,1.0,0)); top=1.3; }
  else if(t==='membrane') return v3Membrane(e);
  else if(t==='rubble'){ for(let i=0;i<5;i++) g.add(part(GEO.lowball,mat('#4a4a52'),0.25,0.2,0.25,(hash2(e.id,i,1)-0.5)*0.6,0.12,(hash2(e.id,i,2)-0.5)*0.6)); top=0.4; }
  else if(t==='wreck') return v3Wreck(e);
  else if(t==='medtent'){ const tent=new THREE.Mesh(new THREE.CylinderGeometry(0,1,1,4),mat('#c8d0c0')); tent.scale.set(0.9,1.6,0.9); tent.position.y=0.45; tent.rotation.y=Math.PI/4; tent.castShadow=true; g.add(tent); g.add(box(mat('#e2463a'),0.3,0.08,0.02,0,0.5,0.66)); top=1; }
  else if(t==='terminal'){ g.add(box(metal,0.4,0.7,0.3,0,0.35,0)); g.add(box(glow('#5fe3b0'),0.3,0.22,0.02,0,0.55,0.16)); top=0.8; }
  else if(t==='choirpod'){ g.add(part(GEO.cone,shiny('#5c3e6e'),0.3,0.9,0.3,0,0.45,0)); g.add(ball(glow('#c58cff'),0.1,0.1,0.1,0,0.92,0)); top=1; }
  else return null;
  U.top=top; return g; }
/* ---------- the hive: the root bulb of 2D, in 3D (Nov 2026) ----------
   A folded bulb with a wet shine (folds twist a little as they climb) on a foot of thick, twisting roots that sink into the mycel,
   each with a rootlet. Green sap runs along the roots towards the bulb. A curled sprout sways on top with a glowing bud; small
   mushrooms and spore puffs grow round its foot and spores drift up from them. The heart glows on the front as before.
   Hurt, as in 2D (below 66% and below 33%): roots wither (grey, shrunk, no sap), cracks open in the bulb, and at the worst the
   bulb sags and darkens, the bud dims and the sprout droops. A dying hive (HIVE_DEATH) uses the worst look. */
/* ---------- the crashed Osprey (Nov 2026): the 3D dropship nose-first in the ground, burnt, broken in two, one wing torn off ----------
   Smoke as in 2D but in plumes from the crack, the bent pod, the nose and the torn wing; sparks flying up; small open flames out of
   the bent pod; a flickering glow in the crack that lights the ground. The 2D smoke fx of a wreck are not drawn in 3D (f.wr). */
const WRECK3D = { smoke:14, smokeLife:4.2, smokeSize:1, embers:7, flames:1, glow:1, light:2.4, lightReach:6 };
function v3WreckTex(kind){ const k='wreckTex'+kind; if(MAT[k]) return MAT[k];
  const c=document.createElement('canvas'); c.width=512; c.height=kind>1?256:128; const x=c.getContext('2d'), R=(a,b,s)=>hash2(a,b,s+kind*7), top=kind>1;
  if(top){ x.translate(0,64); }   /* the top decals: the same drawing, more soot round it */
  x.fillStyle='#46525f'; x.fillRect(0,top?-64:0,512,top?256:128);                                             /* what is left of the paint */
  x.fillStyle='#37414d'; for(let i=1;i<6;i++) x.fillRect(i*86,0,2,128); x.fillRect(0,40,512,2); x.fillRect(0,92,512,2);   /* panel lines */
  for(let i=0;i<40;i++){ x.fillStyle='rgba(30,36,44,.5)'; x.fillRect(R(i,1,1)*512,R(i,2,1)*128,2,2); }   /* rivets */
  /* hazard stripes along the bottom, half burnt away */
  for(let i=0;i<14;i++){ x.fillStyle=i%2?'#1c1c1f':'#a8862c'; x.beginPath(); x.moveTo(20+i*16,128); x.lineTo(36+i*16,104); x.lineTo(52+i*16,104); x.lineTo(36+i*16,128); x.fill(); }
  /* the name: a faded stencil */
  x.save(); x.globalAlpha=0.62; x.fillStyle='#d8dde2'; x.textBaseline='middle';
  if(kind===0||kind===2){ x.font='bold 74px Impact, "Arial Black", sans-serif'; x.fillText('OSPREY',150,62); }
  else { x.font='bold 46px Impact, "Arial Black", sans-serif'; x.fillText('LC-71',300,58); x.font='bold 18px sans-serif'; x.fillText('LUNAR CORPS',304,90); }
  x.restore(); x.globalCompositeOperation='destination-out'; x.fillStyle='#000';
  for(let i=0;i<6;i++) x.fillRect(178+i*41,40,3,44);   /* stencil bridges */
  x.globalCompositeOperation='source-over';
  if(top){ x.translate(0,-64); for(let i=0;i<6;i++){ const py=i<5?R(i,20,1)*60:196+R(i,20,1)*60, px=R(i,21,1)*512, r=50+R(i,22,1)*50; const g=x.createRadialGradient(px,py,0,px,py,r); g.addColorStop(0,'rgba(12,10,9,.9)'); g.addColorStop(1,'rgba(12,10,9,0)'); x.fillStyle=g; x.fillRect(px-r,py-r,r*2,r*2); } x.translate(0,64); }
  /* soot and scorch: dark clouds, worst towards the crack (kind 0: the right end, kind 1: the left end) */
  for(let i=0;i<(top?12:26);i++){ const near=i<(top?4:10), px=near?(kind%2===0?512-R(i,4,2)*150:R(i,4,2)*150):R(i,4,3)*512, py=R(i,5,2)*128, r=26+R(i,6,2)*60;
    const g=x.createRadialGradient(px,py,0,px,py,r); g.addColorStop(0,`rgba(12,10,9,${near?0.95:top?0.55:0.7})`); g.addColorStop(1,'rgba(12,10,9,0)'); x.fillStyle=g; x.fillRect(px-r,py-r,r*2,r*2); }
  for(let i=0;i<(top?6:18);i++){ x.strokeStyle='rgba(10,9,8,.6)'; x.lineWidth=2+R(i,7,1)*4; const sx=R(i,8,1)*512; x.beginPath(); x.moveTo(sx,128); x.lineTo(sx+30+R(i,9,1)*60,0); x.stroke(); }   /* streaks blown back */
  for(let i=0;i<30;i++){ x.fillStyle=`rgba(${120+R(i,10,1)*60|0},${130+R(i,11,1)*60|0},${140+R(i,12,1)*50|0},.5)`; x.fillRect(R(i,13,1)*512,R(i,14,1)*128,3+R(i,15,1)*8,1); }   /* bare metal scratches */
  const t=new THREE.CanvasTexture(c); t.anisotropy=4;
  return MAT[k]=v3Fogify(new THREE.MeshLambertMaterial({ map:t })); }
function v3Wreck(e){ const g=new THREE.Group(), U=g.userData, H=(i,s)=>hash2(e.id,i,s);
  GEO.plane=GEO.plane||new THREE.PlaneGeometry(1,1);
  const soot=mat('#19191c'), burnt=mat('#232428'), dark=mat('#0c0c0f'), rib=mat('#34363c'), paint=mat('#3c4753'), dirt=mat('#3d3a38'), dirt2=mat('#24211f'),
        glass=shiny('#0a1014',{ specular:0x667788, shininess:90 }), yel=mat('#a8862c'), crate=mat('#4f5766');
  U.own=[]; const emb=new THREE.MeshBasicMaterial({ color:'#ff6a20' }); U.own.push(emb); U.emb=emb;
  const side=(par,kind,w,h,x,y,z)=>{ for(const s of [-1,1]){ const p=new THREE.Mesh(GEO.plane,v3WreckTex(kind)); p.scale.set(w,h,1); p.position.set(x,y,z*s); if(s<0) p.rotation.y=Math.PI; p.castShadow=false; par.add(p); } };
  const yaw=0.4+H(1,1)*0.6, W=grp(); W.rotation.y=yaw; g.add(W);   /* W: the crash site, nose along +x */
  /* the ground: a scorched patch, the furrow it ploughed, the mound thrown up in front of the nose */
  const scorch=part(GEO.disc,mat('#0a0908',{ transparent:true, opacity:0.6, depthWrite:false }),2.4,1,1.7,-0.2,0.03,0); scorch.castShadow=false; scorch.renderOrder=1; W.add(scorch);
  const fur=part(GEO.plane,mat('#0e0c0b',{ transparent:true, opacity:0.55, depthWrite:false }),2.4,0.6,1,-2.6,0.035,0); fur.rotation.x=-Math.PI/2; fur.castShadow=false; fur.renderOrder=1; W.add(fur);
  for(let i=0;i<10;i++){ const s=i%2?1:-1, x=-1.5-i*0.22-H(i,30)*0.2, z=s*(0.3+H(i,31)*0.14)*(1-i/24); W.add(part(GEO.lowball,dirt2,0.05+H(i,32)*0.05,0.03+H(i,33)*0.03,0.05+H(i,34)*0.04,x,0.02,z)); }   /* clods thrown up along the furrow */
  for(let i=0;i<16;i++){ const a=(i/15-0.5)*2.6, r=1.95+H(i,2)*0.4; W.add(part(GEO.lowball,i%3?dirt:dirt2,0.1+H(i,3)*0.16,0.06+H(i,4)*0.12,0.1+H(i,5)*0.14,Math.cos(a)*r*0.95,0.04,Math.sin(a)*r*0.6)); }   /* the mound in front of the nose */
  /* the ship: pitched nose-down into the mound, rolled a little */
  const S=grp(0.05,0.44,0); S.rotation.order='YZX'; S.rotation.set(0.15,0,-0.22); W.add(S); U.ship=S;
  /* front half: hull, crumpled nose, broken canopy */
  const F=grp(); S.add(F);
  F.add(box(soot,1.55,0.7,1.1,0.78,0,0)); F.add(box(burnt,1.25,0.12,0.8,0.8,0.4,0)); side(F,1,1.5,0.66,0.78,0,0.556);
  const ft=new THREE.Mesh(GEO.plane,v3WreckTex(3)); ft.scale.set(0.95,0.78,1); ft.position.set(0.62,0.465,0); ft.rotation.x=-Math.PI/2; ft.castShadow=false; F.add(ft);
  const nose=rotZ(part(GEO.cone,soot,0.58,0.62,0.58,1.82,-0.04,0),-Math.PI/2); nose.rotation.y=0.25; nose.scale.set(0.62,0.62,0.5); F.add(nose);
  F.add(box(dark,0.2,0.62,1.0,1.55,-0.02,0));   /* the crushed bulkhead behind the nose */
  const can=box(glass,0.5,0.2,0.62,1.38,0.27,0); can.rotation.z=-0.12; F.add(can);
  for(let i=0;i<4;i++){ const sh=box(glass,0.14,0.02,0.08,1.25+H(i,6)*0.3,0.39,(H(i,7)-0.5)*0.5); sh.rotation.set(H(i,8)*0.8,H(i,9)*3,H(i,10)*0.6); F.add(sh); }   /* shards */
  F.add(box(dark,0.36,0.04,0.52,1.36,0.38,0));   /* the canopy frame, glass gone */
  U.nose=grp(1.55,0.32,0.1); F.add(U.nose);
  /* the crack: frames, cables, embers inside */
  for(const s of [-1,1]) F.add(box(rib,0.05,0.66,0.05,0.0,0,s*0.5));
  const top=box(rib,0.05,0.05,0.62,0.0,0.33,0.2); top.rotation.x=0.3; F.add(top);
  for(let i=0;i<4;i++){ const c=cyl(dark,0.012,0.4+H(i,11)*0.3,0.012,-0.04,0.12-H(i,12)*0.2,(i-1.5)*0.22); c.rotation.z=0.4+H(i,13)*0.6; F.add(c); }
  F.add(box(emb,0.1,0.3,0.8,0.05,-0.18,0)); U.crack=grp(0,0.3,0); F.add(U.crack);
  /* rear half: broken off at the keel and sagging, the tail, the ramp hanging open */
  const R=grp(-0.1,-0.35,0); R.rotation.z=0.16; S.add(R); U.rear=R;
  R.add(box(soot,1.3,0.7,1.1,-0.68,0.35,0)); R.add(box(burnt,1.1,0.12,0.8,-0.7,0.75,0)); side(R,0,1.28,0.66,-0.68,0.35,0.556);
  const rt=new THREE.Mesh(GEO.plane,v3WreckTex(2)); rt.scale.set(1.08,0.78,1); rt.position.set(-0.7,0.815,0); rt.rotation.x=-Math.PI/2; rt.castShadow=false; R.add(rt);   /* OSPREY on the roof too: the view is mostly from above */
  for(const s of [-1,1]) R.add(box(rib,0.05,0.66,0.05,-0.04,0.35,s*0.5));
  const fin1=box(burnt,0.5,0.6,0.08,-1.15,0.8,0.42), fin2=box(burnt,0.5,0.42,0.08,-1.12,0.74,-0.48); fin2.rotation.x=-0.5; R.add(fin1); R.add(fin2);
  const ramp=grp(-1.33,0.05,0); ramp.add(box(dark,0.9,0.06,0.8,-0.45,0,0)); ramp.add(box(yel,0.06,0.07,0.8,-0.88,0,0)); ramp.rotation.z=-0.62; ramp.rotation.x=0.08; R.add(ramp);
  U.rearSmoke=grp(-0.9,0.8,0); R.add(U.rearSmoke);
  /* legs snapped off */
  for(const [x,z] of [[0.75,-0.4],[0.75,0.4]]) F.add(cyl(dark,0.05,0.18,0.05,x,-0.42,z));
  const leg=cyl(dark,0.05,0.5,0.05,-0.7,-0.05,0.55); leg.rotation.x=1.2; R.add(leg);
  /* the right wing (z-) bent up, its pod snapped upwards and still burning */
  const RW=grp(-0.2,0.02,-0.5); RW.rotation.x=0.5; S.add(RW);
  RW.add(box(burnt,1.25,0.1,1.05,0,0,-0.5)); RW.add(box(mat('#2e3742'),0.5,0.105,0.4,0.25,0,-0.45));
  const pod=grp(0.0,0.05,-1.1); pod.rotation.set(-0.3,0.2,0.95); RW.add(pod);
  pod.add(rotZ(cyl(soot,0.24,1.4,0.24,0,0,0),Math.PI/2)); pod.add(rotZ(part(GEO.torus,dark,0.2,1,0.2,-0.7,0,0),Math.PI/2));
  pod.add(rotZ(part(GEO.disc,dark,0.22,1,0.22,0.71,0,0),-Math.PI/2)); pod.add(rotZ(part(GEO.disc,emb,0.14,1,0.14,0.715,0,0),-Math.PI/2));
  U.pod=grp(0.78,0,0); pod.add(U.pod);
  /* the left wing (z+): only a torn stub */
  const stub=grp(-0.2,0.0,0.55); S.add(stub); stub.add(box(burnt,0.9,0.1,0.32,0,0,0.16));
  for(let i=0;i<4;i++){ const sp=part(GEO.cone,burnt,0.08,0.22+H(i,14)*0.2,0.05,-0.35+i*0.24,0,0.42); sp.rotation.x=Math.PI/2; sp.rotation.z=(H(i,15)-0.5)*0.6; stub.add(sp); }
  /* the torn wing on the ground, its pod crushed beside it */
  const TW=grp(-1.0,0.07,2.15); TW.rotation.set(0.06,0.7,-0.04); W.add(TW);
  TW.add(box(burnt,1.3,0.08,1.0,0,0,0)); TW.add(box(mat('#2e3742'),0.6,0.085,0.35,-0.2,0,0.15)); for(let i=0;i<3;i++){ const sp=part(GEO.cone,burnt,0.08,0.25,0.05,-0.4+i*0.35,0,-0.55); sp.rotation.x=-Math.PI/2; TW.add(sp); }
  const cp=rotZ(cyl(soot,0.24,1.3,0.24,-0.2,0.14,0.9),Math.PI/2); cp.scale.set(0.24,1.3,0.13); cp.rotation.x=0.3; TW.add(cp); TW.add(part(GEO.torus,dark,0.2,1,0.12,0.45,0.14,0.9));
  U.wing=grp(-0.2,0.2,0.9); TW.add(U.wing);
  /* debris all round: plates, a crate, a fuel can, a bit of tail */
  for(let i=0;i<11;i++){ const a=H(i,16)*Math.PI*2, r=1.5+H(i,17)*1.4, x=Math.cos(a)*r, z=Math.sin(a)*r*0.8; if(x>1.6&&Math.abs(z)<1) continue; const k=i%4;
    const o=k===0?box(crate,0.3,0.22,0.24,x,0.11,z):k===1?box(i%3?burnt:paint,0.4+H(i,18)*0.3,0.03,0.25+H(i,19)*0.2,x,0.03,z):k===2?rotZ(cyl(rib,0.07,0.28,0.07,x,0.07,z),Math.PI/2):box(dark,0.18,0.1,0.3,x,0.05,z);
    o.rotation.y=H(i,20)*3; if(k===1) o.rotation.z=(H(i,21)-0.5)*0.4; W.add(o); if(k===0) o.add(box(yel,1.03,0.18,1.03,0,0.3,0)); }
  g.scale.setScalar(0.95); U.wreck=true; U.top=1.2; U.emit=[[U.crack,0.38,'#1e1c1b'],[U.pod,0.27,'#2a2826'],[U.nose,0.15,'#45413d'],[U.rearSmoke,0.1,'#55514c'],[U.wing,0.1,'#5e5a55']];
  U.acc=0; U.eacc=0; return g; }
function v3WreckFx(now,dt,put,lights){ const W=WRECK3D, T=now/1000, w=V3._ww||(V3._ww=new THREE.Vector3());
  V3.sparks=V3.sparks||[];
  for(const [e,g] of V3.objs){ const U=g.userData; if(!U.wreck||!g.visible) continue;
    const fl=0.75+0.15*Math.sin(T*13+e.id)+0.1*Math.sin(T*31)+0.08*Math.random();
    U.emb.color.setRGB(1,0.3+0.18*fl,0.06);
    U.acc+=dt*W.smoke; let guard=0;
    while(U.acc>=1&&guard++<20){ U.acc--; let r=Math.random(), em=U.emit[0]; for(const E of U.emit){ if((r-=E[1])<=0){ em=E; break; } }
      em[0].getWorldPosition(w); V3.smoke.push({ x:w.x+rand(-0.12,0.12), y:w.y+rand(0,0.1), z:w.z+rand(-0.12,0.12), t:0, sz:rand(0.75,1.25)*W.smokeSize, col:Math.random()<0.5?em[2]:pick(['#2f2d2b','#3d3a37','#4f4b47']), a:0.72, rise:1.6, life:W.smokeLife*rand(0.8,1.15) }); }
    U.eacc+=dt*W.embers; guard=0;
    while(U.eacc>=1&&guard++<20){ U.eacc--; (Math.random()<0.6?U.crack:U.pod).getWorldPosition(w);
      V3.sparks.push({ x:w.x, y:w.y, z:w.z, vx:rand(-0.35,0.35), vy:rand(0.7,1.6), vz:rand(-0.35,0.35), t:0, life:rand(0.9,1.8), col:pick(['#ff8a2a','#ffd23f','#ff6a20']) }); }
    /* small open flames out of the bent pod: licking upwards */
    U.pod.getWorldPosition(w);
    if(W.flames>0) for(let i=0;i<5;i++){ const ph=(T*2.2+i/5+e.id*0.37)%1, s=W.flames*(0.42-ph*0.28)*(0.8+0.4*Math.random());
      put(w.x+Math.sin(T*7+i*2)*0.06+ph*0.12, w.y+0.05+ph*0.55*W.flames, w.z+Math.cos(T*6+i)*0.06, s, ph<0.3?'#ffe08a':ph<0.65?'#ff8a2a':'#c43c10', (1-ph)*0.9); }
    const pw={ x:w.x, y:w.y, z:w.z };
    /* the glow in the crack */
    U.crack.getWorldPosition(w);
    if(W.glow>0){ put(w.x,w.y-0.1,w.z,1.1*W.glow*fl,'#ff5a1a',0.35); put(w.x,w.y-0.15,w.z,0.5*W.glow*fl,'#ffb347',0.5); }
    if(W.light>0){ lights.push({ x:w.x, y:w.y+0.6, z:w.z, i:W.light*fl, c:0xff7a30, d:W.lightReach }); lights.push({ x:pw.x, y:pw.y+0.5, z:pw.z, i:W.light*0.6*fl, c:0xff9a40, d:W.lightReach*0.7 }); } }
  for(const s of V3.sparks){ s.t+=dt; s.x+=(s.vx+0.2)*dt; s.y+=s.vy*dt; s.z+=s.vz*dt; s.vy-=0.25*dt; const k=s.t/s.life; put(s.x,s.y,s.z,0.06+0.03*Math.sin(s.t*20),s.col,(1-k)*(0.7+0.3*Math.sin(s.t*25))); }
  V3.sparks=V3.sparks.filter(s=>s.t<s.life); }
const HIVE3D={ sapSpeed:0.35, sap:2, spores:5, sporeRise:1.6, sway:0.1, sag:0.9 };
const HIVE3D_COL={ body:'#3a2448', fold:'#5c3e6e', hurt:'#2c2034', root:'#38243f', foldHurt:'#46344f', dead:'#55505a', sap:'#a6ff4a', bud:'#a6ff4a', budWeak:'#56692f', crack:'#2f5a18' };
/* a tube along points that tapers from r0 to r1 (one mesh: cheap) */
function v3Tube(pts,r0,r1,n=12,rad=6){ const c=new THREE.CatmullRomCurve3(pts), geo=new THREE.TubeGeometry(c,n,r0,rad,false), P=geo.attributes.position, p=new THREE.Vector3();
  for(let i=0;i<=n;i++){ c.getPointAt(i/n,p); const k=1+(r1/r0-1)*i/n; for(let j=0;j<=rad;j++){ const v=i*(rad+1)+j; P.setXYZ(v,p.x+(P.getX(v)-p.x)*k,p.y+(P.getY(v)-p.y)*k,p.z+(P.getZ(v)-p.z)*k); } }
  P.needsUpdate=true; geo.computeBoundingSphere(); geo.userData.curve=c; return geo; }
function v3Hive(e){
  const g=new THREE.Group(), U=g.userData, id=e.id||0, C=HIVE3D_COL, own=U.own=[], H=1.9, h=(i,s)=>hash2(id,i,s), V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const mesh=(geo,m)=>{ own.push(geo); const o=new THREE.Mesh(geo,m); o.castShadow=true; return o; };
  const tw=0.5+h(1,1)*0.5, lump=h(1,2)*6;
  const bulbR=(t,a)=>1.1*Math.pow(Math.max(0,Math.sin(Math.PI*t)),0.7)*(1-0.3*t)*(1+0.07*Math.cos(7*(a+tw*t))+0.03*Math.sin(3*a+lump)*Math.sin(Math.PI*t));
  const surf=(t,a,out=0)=>{ const r=bulbR(t,a)+out; return V(Math.sin(a)*r,t*H,Math.cos(a)*r); };
  const body=grp(); g.add(body); U.body=body; U.mats=[];
  /* the bulb: a lathe, then pushed out into seven folds */
  const prof=[]; for(let i=0;i<=24;i++){ const t=i/24; prof.push(new THREE.Vector2(Math.max(0.001,1.1*Math.pow(Math.sin(Math.PI*t),0.7)*(1-0.3*t)),t*H)); }
  const bg=new THREE.LatheGeometry(prof,56), P=bg.attributes.position;
  for(let v=0;v<P.count;v++){ const x=P.getX(v), y=P.getY(v), z=P.getZ(v), r=Math.hypot(x,z); if(r<1e-3) continue; const a=Math.atan2(x,z), k=bulbR(y/H,a)/r; P.setXYZ(v,x*k,y,z*k); }
  bg.computeVertexNormals(); const bulb=mesh(bg,shiny(C.body)); body.add(bulb); U.bulb=bulb;
  U.folds=[]; for(let k=0;k<7;k++){ const pts=[]; for(let s=0;s<=6;s++){ const t=0.12+s*0.125, a=k*Math.PI*2/7-tw*t; pts.push(surf(t,a,-0.01)); }
    const f=mesh(v3Tube(pts,0.05,0.025,14,5),shiny(C.fold)); body.add(f); U.folds.push(f); }
  /* the heart (as before) and the mouth at the foot: a dark slit between two fleshy lips */
  const heart=ball(glow('#a6ff4a'),0.3,0.3,0.3,0,1.2,0.65); body.add(heart); U.heart=heart;
  const mz=bulbR(0.2,0)-0.02; body.add(ball(glow('#2a0d33'),0.26,0.16,0.08,0,0.38,mz)); for(const k of [-1,1]) body.add(ball(shiny(C.fold),0.28,0.06,0.09,0,0.38+k*0.13,mz-0.01));
  /* cracks: dark seams with a green glow deep inside; a few open below 66%, all below 33% */
  U.cracks=[]; for(let k=0;k<8;k++){ const t0=0.3+h(k,30)*0.45, a0=h(k,31)*Math.PI*2, pts=[]; let t=t0, a=a0;
    for(let s=0;s<4;s++){ pts.push(surf(t,a,0.005)); t+=(h(k,32+s)-0.5)*0.12+0.04; a+=(h(k,40+s)-0.5)*0.35; }
    const c=mesh(v3Tube(pts,0.03,0.012,8,4),glow(C.crack)); c.visible=false; body.add(c); U.cracks.push(c); }
  /* the sprout: a curl with a fleshy bud that glows */
  const sp=grp(0,H-0.08,0); body.add(sp); U.sprout=sp; const spts=[], curl=1.6+h(2,1)*0.6, side=h(2,2)<0.5?-1:1;
  for(let s=0;s<=8;s++){ const q=s/8, an=q*curl; spts.push(V(side*(1-Math.cos(an))*0.28,Math.sin(an)*0.28+q*0.2,0)); }
  sp.add(mesh(v3Tube(spts,0.07,0.025,12,6),shiny(C.body))); U.sproutTube=sp.children[0];
  const tip=spts[8]; U.bud=ball(shiny(C.fold),0.07,0.07,0.07,tip.x,tip.y,tip.z); U.budGlow=ball(glow(C.bud),0.045,0.045,0.045,tip.x,tip.y+0.03,tip.z+0.03); sp.add(U.bud,U.budGlow);
  /* the roots: thick at the bulb, tapering into the ground, with a rootlet each; sap runs up them */
  U.roots=[]; for(let i=0;i<7;i++){ const a=i*Math.PI*2/7+h(i,3)*0.35, d=V(Math.sin(a),0,Math.cos(a)), pp=V(Math.cos(a),0,-Math.sin(a)), w=(h(i,4)-0.5)*0.45, L=h(i,5)*0.35;
    const b0=surf(0.12,a,-0.1), rg=grp(b0.x,b0.y,b0.z); g.add(rg);
    const at=(r,y,wig)=>V(d.x*r+pp.x*wig-b0.x,y-b0.y,d.z*r+pp.z*wig-b0.z);
    const pts=[at(bulbR(0.16,a)-0.12,b0.y,0),at(0.9,0.2,w*0.3),at(1.2+L*0.4,0.1,w),at(1.5+L*0.7,0.03,-w*0.5),at(1.8+L,-0.2,-w*0.2)];
    const geo=v3Tube(pts,0.19,0.035,16,7), root=mesh(geo,fung(C.root)); rg.add(root);
    const p2=pts[2], s2=h(i,6)<0.5?-1:1, lp=[p2.clone(),p2.clone().add(V(d.x*0.2+pp.x*s2*0.2,-0.04,d.z*0.2+pp.z*s2*0.2)),p2.clone().add(V(d.x*0.35+pp.x*s2*0.38,-0.22,d.z*0.35+pp.z*s2*0.38))];
    const twig=mesh(v3Tube(lp,0.06,0.015,6,5),fung(C.root)); rg.add(twig);
    const sap=[]; for(let s=0;s<Math.max(0,HIVE3D.sap|0);s++){ const b=ball(glow(C.sap),0.05,0.05,0.05,0,0,0); rg.add(b); sap.push(b); }
    U.roots.push({ g:rg, curve:geo.userData.curve, parts:[root,twig], sap, dead:false }); }
  /* mushrooms and spore puffs between the roots */
  U.puffs=[]; for(let i=0;i<9;i++){ const a=(i+0.5)*Math.PI*2/9+h(i,7)*0.3, r=0.8+h(i,8)*0.55, x=Math.sin(a)*r, z=Math.cos(a)*r;
    if(i%3===2){ const s=0.08+h(i,9)*0.05, pf=ball(fung('#7d6290'),s,s*0.85,s,x,s*0.7,z); g.add(pf); g.add(ball(glow('#c7f05a'),s*0.3,s*0.3,s*0.3,x,s*1.45,z)); U.puffs.push(V(x,s*1.5,z)); continue; }
    for(let k=0;k<1+(h(i,10)*3|0);k++){ const ox=x+(h(i,11+k)-0.5)*0.22, oz=z+(h(i,14+k)-0.5)*0.22, ht=0.1+h(i,17+k)*0.14, cr=0.06+h(i,20+k)*0.07, lean=(h(i,23+k)-0.5)*0.5;
      const m=grp(ox,0,oz); m.rotation.set(lean,0,lean*0.6); m.add(cyl(fung('#bcae90'),0.014+cr*0.15,ht,0.014+cr*0.15,0,ht/2,0));
      m.add(part(GEO.half,fung(k%2?'#bcae90':'#8a6a9a'),cr,cr*0.6,cr,0,ht,0)); g.add(m); } }
  if(!U.puffs.length) U.puffs.push(V(0.9,0.1,0));
  /* spores drifting up from the puffs */
  U.spores=[]; for(let k=0;k<Math.max(0,HIVE3D.spores|0);k++){ const s=ball(glow('#c7f05a'),0.03,0.03,0.03,0,0,0); s.userData.from=U.puffs[k%U.puffs.length]; s.userData.ph=h(k,50); g.add(s); U.spores.push(s); }
  U.hive=true; U.hurt=0; U.top=2.2; return g; }
/* the look for a hurt level (0 healthy, 1 below 66%, 2 below 33%), as in hiveDraw in 2D: which roots wither, cracks, sagging, dim bud */
function v3HiveHurt(g,hurt){ const U=g.userData, C=HIVE3D_COL; if(U.hurt===hurt) return; U.hurt=hurt;
  U.roots.forEach((r,i)=>{ const dead=hurt>0&&(i%3===0||(hurt>1&&i%3===1)); r.dead=dead; r.g.scale.setScalar(dead?0.6:1); for(const p of r.parts) p.material=dead?shiny(C.dead,{ specular:0x222222, shininess:10 }):fung(C.root); for(const s of r.sap) s.visible=!dead; });
  U.cracks.forEach((c,i)=>c.visible=hurt>1||(hurt>0&&i<3));
  U.bulb.material=shiny(hurt>1?C.hurt:C.body); for(const f of U.folds) f.material=shiny(hurt>1?C.foldHurt:C.fold);
  U.body.scale.y=hurt>1?HIVE3D.sag:1; U.budGlow.material=glow(hurt>1?C.budWeak:C.bud); U.sprout.rotation.x=hurt>1?0.5:0; }
function v3PoseHive(e,g,T){ const U=g.userData, f=clamp(e.hp/e.maxHp,0,1), hurt=f<0.33?2:f<0.66?1:0, rate=[1,0.75,0.5][hurt], D=HIVE3D, p=new THREE.Vector3();
  v3HiveHurt(g,hurt);
  U.sprout.rotation.z=Math.sin(T*1.3*rate+e.id)*D.sway; U.sprout.rotation.y=Math.sin(T*0.6+e.id)*D.sway*2;
  U.budGlow.scale.setScalar(0.045*(1+0.25*Math.sin(T*3*rate+e.id)));
  U.roots.forEach((r,i)=>{ if(r.dead) return; r.sap.forEach((s,k)=>{ const q=((T*D.sapSpeed*rate+i*0.23+k/r.sap.length)%1+1)%1; r.curve.getPointAt(1-q,p);   /* from the tip up to the bulb */
    const rad=0.19+(0.035-0.19)*(1-q); s.position.set(p.x,p.y+rad*0.75,p.z); s.scale.setScalar(0.03+0.03*Math.sin(q*Math.PI)); }); });
  U.spores.forEach(s=>{ const q=((T*0.22+s.userData.ph)%1), o=s.userData.from; s.position.set(o.x+Math.sin(T*1.7+s.userData.ph*9)*0.12*q,o.y+q*D.sporeRise,o.z+Math.cos(T*1.3+s.userData.ph*7)*0.12*q); s.scale.setScalar(0.03*Math.sin(q*Math.PI)); }); }
/* ---------- the membrane: a living web that grows across a tunnel ----------
   Each tile sends a half sheet towards every neighbour that is membrane or rock, so the sheets of a whole wall meet edge to edge and
   hang between fleshy knots like tissue between fingers. The top edge follows the world position (neighbours agree where they meet), dips
   between the knots and climbs into rock. Tendons run across, glowing veins between them. It breathes (a wave through the wall), shudders
   when hit, tears open as it loses health; while its egg chambers live the veins burn bright and the sheet is taut, once it is weakened
   the veins dim and it hangs slack. The model is rebuilt when a neighbour dies (v3MembKey). */
const MEMB={ breathe:0.22, breatheSpeed:1.7, slackBreathe:0.3, slackSpeed:1.1, slackBulge:1.35, shudder:0.5, sag:0.34, opTaut:0.72, opSlack:0.55 };
const MEMB_COL={ col:'#7a5a8e', vein:'#a6ff4a', veinWeak:'#56692f', tendon:'#3a2448', root:'#5c3e6e' };
const MEMB_DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
function v3MembNb(e){ const S=membraneTiles(), W=G.map.w, out=[];
  for(const [dx,dy] of MEMB_DIRS){ const x=e.tx+dx, y=e.ty+dy; if(x<0||y<0||x>=W||y>=G.map.h){ out.push('r'); continue; } const k=y*W+x;
    out.push(S.has(k)?'m':!walkableT(x,y)?'r':'-'); } return out; }
function v3MembKey(e){ return v3MembNb(e).join(''); }
function membTop(wx,wz){ return 1.18+0.2*Math.sin(wx*2.7+wz*1.3)+0.14*Math.sin(wx*1.1-wz*3.3); }   /* the ragged top edge, the same for both sheets meeting at a point */
function v3MembSheet(e,dx,dy,rock,own,i){
  const cx=e.tx+0.5, cz=e.ty+0.5, NU=8, NV=9, sgn=hash2(e.tx*2+dx+7,e.ty*2+dy+7,3)<0.5?-1:1, bow=0.07+hash2(e.tx,e.ty,i)*0.05;
  const rockH=rock?tileH(G.map.tiles[(e.ty+dy)*G.map.w+e.tx+dx])*0.92:0;
  const top=u=>{ const wx=cx+dx*u*0.5, wz=cz+dy*u*0.5, h=membTop(wx,wz)*(1-MEMB.sag*Math.sin(u*Math.PI/2)); return rock?h+(Math.min(Math.max(h,rockH),h+0.35)-h)*u*u:h; };
  const surf=(u,v,lift=0)=>{ const z=(sgn*bow*Math.sin(Math.PI*u)*Math.sin(Math.PI*Math.min(1,v*1.1))+lift*sgn)*(rock?1-u*0.6:1);
    return new THREE.Vector3(u*0.5,v*top(u),z); };
  /* the sheet itself */
  const pos=[], idx=[]; for(let j=0;j<=NV;j++) for(let k=0;k<=NU;k++){ const p=surf(k/NU,j/NV); pos.push(p.x,p.y,p.z); }
  for(let j=0;j<NV;j++) for(let k=0;k<NU;k++){ const a=j*(NU+1)+k, b=a+1, c=a+NU+1, d=c+1; idx.push(a,c,b,b,c,d); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setIndex(idx); geo.computeVertexNormals(); own.push(geo);
  const half=new THREE.Group(); half.rotation.y=Math.atan2(-dy,dx);   /* local +x runs from the knot to the edge */
  const sheet=new THREE.Mesh(geo,MAT.membTaut); sheet.castShadow=true; sheet.renderOrder=1; half.add(sheet); half.userData.sheet=sheet;
  /* tendons: two dark cords across the sheet, a vein of light running beside each, and fine veins branching off */
  const cord=(pts,r,m,lift)=>{ const c=new THREE.CatmullRomCurve3(pts.map(([u,v])=>surf(u,v,lift))), tg=new THREE.TubeGeometry(c,10,r,5,false); own.push(tg); const o=new THREE.Mesh(tg,m); half.add(o); return o; };
  const h1=hash2(e.tx,e.ty,i+11), h2=hash2(e.tx,e.ty,i+23);
  cord([[0,0.15+h1*0.2],[0.35,0.4],[0.7,0.6+h2*0.15],[1,0.75]],0.022,MAT.membTendon,0.012);
  cord([[0,0.85],[0.4,0.62+h1*0.1],[0.8,0.35],[1,0.2+h2*0.15]],0.018,MAT.membTendon,0.012);
  half.userData.veins=[ cord([[0,0.3+h1*0.2],[0.3,0.5],[0.65,0.72],[1,0.88]],0.009,MAT.membVein,0.02),
    cord([[0.15,0.95],[0.45,0.7],[0.8,0.55],[1,0.45]],0.008,MAT.membVein,0.02),
    cord([[0.3,0.5],[0.42,0.32],[0.55,0.12]],0.006,MAT.membVein,0.02), cord([[0.65,0.72],[0.75,0.9]],0.006,MAT.membVein,0.02) ];
  /* fleshy roots along the foot and a thick rim along the top */
  for(let k=0;k<3;k++){ const u=0.2+k*0.3, w=0.1+hash2(e.tx,e.ty,i*5+k)*0.06; half.add(ball(MAT.membRoot,0.13,w,0.12+w*0.5,u*0.5,0.03,0)); }
  const rim=[]; for(let k=0;k<=5;k++) rim.push([k/5,0.985]); cord(rim,0.014,MAT.membTendon,0);
  /* tears: dark ragged holes that open as it loses health */
  half.userData.tears=[]; for(let k=0;k<2;k++){ const u=0.35+k*0.35*hash2(e.tx,e.ty,i+40+k)+0.05, v=0.3+0.35*hash2(e.tx,e.ty,i+50+k), r=0.07+0.05*hash2(e.tx,e.ty,i+60+k);
    const sh=new THREE.Shape(); for(let a=0;a<=12;a++){ const ang=a/12*Math.PI*2, rr=r*(0.6+0.7*hash2(e.tx*13+a,e.ty,i+k)); sh[a?'lineTo':'moveTo'](Math.cos(ang)*rr,Math.sin(ang)*rr*1.4); }
    const tg=new THREE.ShapeGeometry(sh); own.push(tg); const t=new THREE.Mesh(tg,MAT.membTear), p=surf(u,v,0.006); t.position.copy(p); t.visible=false;
    t.userData.at=0.75-k*0.3-0.1*hash2(e.tx,e.ty,i+70+k); half.add(t); half.userData.tears.push(t); }
  return half; }
function v3Membrane(e){
  if(!MAT.membTaut){ const sh=o=>v3Fogify(new THREE.MeshPhongMaterial({ color:MEMB_COL.col, emissive:'#2a1236', specular:0x8a7aa0, shininess:40, side:THREE.DoubleSide, transparent:true, depthWrite:false, ...o }));
    MAT.membTaut=sh({ opacity:MEMB.opTaut }); MAT.membSlack=sh({ opacity:MEMB.opSlack, color:'#6a4e78' });
    MAT.membTendon=shiny(MEMB_COL.tendon); MAT.membRoot=fung(MEMB_COL.root); MAT.membVein=glow(MEMB_COL.vein); MAT.membVeinWeak=glow(MEMB_COL.veinWeak);
    MAT.membTear=v3Fogify(new THREE.MeshBasicMaterial({ color:'#120816', side:THREE.DoubleSide })); }
  const g=new THREE.Group(), U=g.userData, own=[], nb=v3MembNb(e); U.own=own; U.memb=true; U.nkey=nb.join(''); U.halves=[];
  let dirs=MEMB_DIRS.map((d,i)=>[d,nb[i]]).filter(([d,n])=>n!=='-');
  if(!dirs.length) dirs=[[MEMB_DIRS[0],'-'],[MEMB_DIRS[1],'-']];   /* alone in the open: a single sheet across */
  dirs.forEach(([[dx,dy],n],i)=>{ const h=v3MembSheet(e,dx,dy,n==='r',own,i); g.add(h); U.halves.push(h); });
  /* the knot in the middle: a tendon column with a swelling at the top and a fleshy foot */
  const top=membTop(e.tx+0.5,e.ty+0.5), H=(k)=>hash2(e.tx,e.ty,90+k); U.knot=part(GEO.taper,MAT.membTendon,0.06,top,0.06,0,top/2,0); U.knot.rotation.set((H(1)-0.5)*0.15,0,(H(2)-0.5)*0.15); g.add(U.knot);
  for(let k=0;k<5;k++){ const y=0.08+k*top/5.2, w=0.1-k*0.012+H(k+3)*0.03; g.add(ball(MAT.membRoot,w,0.09+H(k+9)*0.05,w*0.9,(H(k+15)-0.5)*0.05,y,(H(k+21)-0.5)*0.05)); }   /* a lumpy, tapering knot of flesh */
  g.add(ball(MAT.membRoot,0.22,0.08,0.22,0,0.02,0)); g.add(ball(MAT.membTendon,0.045,0.07,0.045,0,top-0.02,0));
  U.bud=ball(MAT.membVein,0.035,0.035,0.035,(H(30)-0.5)*0.04,top*0.55,0.05); g.add(U.bud);   /* a glowing node half-way up the knot */
  U.top=top+0.2; U.phase=(e.tx+e.ty)*0.55; return g; }
function v3PoseMembrane(e,g,T){ const U=g.userData, weak=!e.invuln, f=clamp(e.hp/e.maxHp,0,1), hit=e.flash>0;
  const M=MEMB, br=weak?M.slackBulge+M.slackBreathe*Math.sin(T*M.slackSpeed+U.phase):1+M.breathe*Math.sin(T*M.breatheSpeed+U.phase), sh=hit?Math.sin(T*70)*M.shudder:0;
  MAT.membTaut.opacity=M.opTaut; MAT.membSlack.opacity=M.opSlack;
  const sm=weak?MAT.membSlack:MAT.membTaut, vm=weak?MAT.membVeinWeak:MAT.membVein;
  for(const h of U.halves){ h.scale.set(1,weak?0.93:1,br+sh); if(h.userData.sheet.material!==sm) h.userData.sheet.material=sm;
    for(const v of h.userData.veins) if(v.material!==vm) v.material=vm;
    for(const t of h.userData.tears) t.visible=f<t.userData.at; }
  U.bud.scale.setScalar(0.04*(1+(weak?0.1:0.5)*Math.max(0,Math.sin(T*2.4+U.phase)))); if(U.bud.material!==vm) U.bud.material=vm;
  g.rotation.z=hit?Math.sin(T*55)*0.015:0; }
function v3Small(e){
  const g=new THREE.Group();
  if(e.kind==='body'&&e.fauna){ /* a grazer carcass: the grazer on its back, legs stiff in the air, head lolling to one side (as in 2D) */
    const c=v3Grazer({ id:e.id, type:'grazer' },false), U=c.userData; c.rotation.set(0,(e.id%7)*0.9,Math.PI); c.position.y=0.88;
    U.neck.rotation.set(0.5,0.6,0); U.head.rotation.x=0.2; U.jaw.rotation.x=0.4; U.legs.forEach((l,i)=>{ l.rotation.set((i<2?-0.35:0.35),0,(i%2?0.25:-0.25)); l.userData.knee.rotation.x=i<2?0.5:-0.3; });
    U.tail.rotation.x=0.6; c.scale.setScalar(VIEW3D.unitScale); g.add(c); g.userData.top=0.6; return g; }
  if(e.kind==='body') return v3Fallen(e,g);
  if(e.rogue&&e.dna){ /* a DNA sample: an upright glass vial of glowing ichor with a steel cap, as in 2D (green, or purple from a hive) */
    const col=e.dna==='hive'?'#c38bff':'#8dff4a';
    g.add(ball(glow(col,{ transparent:true, opacity:0.18, depthWrite:false }),0.2,0.24,0.2,0,0.18,0));   /* its glow */
    g.add(cyl(glow(col),0.065,0.26,0.065,0,0.15,0)); g.add(cyl(mat('#d8eef4',{ transparent:true, opacity:0.35 }),0.085,0.36,0.085,0,0.2,0));
    g.add(cyl(shiny('#cfd8e0'),0.095,0.07,0.095,0,0.41,0)); g.add(box(glow('#e8ffd0'),0.018,0.12,0.01,-0.03,0.19,0.07));
    g.scale.setScalar(1.35); g.userData.top=0.75; g.userData.bob=true; return g; }   /* a bit bigger than true size, so it reads from the camera */
  if(e.rogue&&e.heart){ g.add(ball(shiny('#8a2f6a'),0.24,0.2,0.24,0,0.24,0)); g.add(ball(glow('#c38bff'),0.06,0.06,0.06,-0.1,0.3,0.18)); g.userData.top=0.5; g.userData.bob=true; return g; }
  if(e.rogue){ /* a stabilizer case (blue with a cyan cross) or a loot case (brown with an orange cross), as in 2D */
    const c=e.stab?'#7fdfff':'#ffb347'; g.add(box(mat(e.stab?'#3a6f86':'#6b5a3a'),0.42,0.24,0.3,0,0.12,0));
    g.add(box(glow(c),0.07,0.02,0.24,0,0.245,0)); g.add(box(glow(c),0.26,0.02,0.07,0,0.245,0)); g.add(box(glow(c),0.07,0.16,0.01,0,0.12,0.151)); g.add(box(glow(c),0.2,0.05,0.01,0,0.13,0.151));
    g.userData.top=0.4; g.userData.bob=true; return g; }
  if(e.relic){ g.add(box(mat('#3a3f48'),0.3,0.2,0.3,0,0.1,0)); g.add(ball(glow('#c58cff'),0.09,0.09,0.09,0,0.3,0)); g.userData.top=0.5; g.userData.bob=true; return g; }
  g.add(box(mat(e.supply?'#3a6a8a':'#5a4632'),0.36,0.26,0.28,0,0.13,0)); g.add(box(mat('#f2c230'),0.37,0.05,0.29,0,0.2,0)); g.userData.top=0.4; g.userData.bob=true; return g; }
/* ---------- a fallen soldier ----------
   The soldier's own model (role, kit, Osprey colours) laid on his back: arms flung out, one knee bent, the head turned aside,
   the visor dark, his weapon beside his hand and a dark pool under him. When the Brood drags him off (b.carrier) he is pulled
   by the boots: feet up at the carrier, head and arms trailing over the ground, the weapon left behind, the pool gone.
   Tunables in FALLEN3D. */
const FALLEN3D={ lift:0.32, behind:0.5, sway:0.12, pool:0.7 };
function v3Fallen(e,g){
  const L=e.look||{ type:'trooper' }, s=v3Soldier({ id:e.id, type:L.type, faction:L.osp?'osprey':'corps', crew:L.osp }), U=g.userData, S=s.userData, h=(e.id*7919)%97/97;
  /* soldier space: feet at 0, head at y≈1.05, facing +z. Laid down (rotation.x −90°) the head ends at −z: on his back, the face up. */
  s.rotation.x=-Math.PI/2; s.position.set(0,0.09,0.52); s.rotation.z=(h-0.5)*0.25;
  s.traverse(o=>{ if(o.material&&!o.isSprite&&o!==S.lampBulb&&((o.material.emissive&&o.material.emissive.getHex())||(o.material.isMeshBasicMaterial&&!o.material.transparent))){ o.material=mat('#14181e'); } });   /* visor, goggles and lights go dark */
  if(S.beam) S.beam.visible=false; if(S.lampHalo) S.lampHalo.visible=false;
  S.arms.forEach((a,i)=>{ const k=i?1:-1; a.rotation.set(-0.15,0,k*(1.05+h*0.5)); a.children[1].rotation.x=-0.35-h*0.4; a.userData.lie=a.rotation.z; });
  S.legs.forEach((l,i)=>{ const k=i?1:-1; l.rotation.set(i===(e.id%2)?-0.55:0,0,k*0.14); l.userData.knee.rotation.x=i===(e.id%2)?0.9:0.1; });
  /* the head turned aside: the parts above the shoulders roll a little round the neck */
  const head=new THREE.Group(); head.position.set(0,0.83,0); s.add(head);
  for(const c of [...s.children]) if(c!==head&&c.position.y>0.82&&c!==S.gun&&!(c.isSprite)){ c.position.y-=0.83; head.add(c); }
  head.rotation.y=(e.id%2?1:-1)*0.75; head.rotation.x=-0.15;
  if(S.gun){ s.remove(S.gun); const gun=S.gun; gun.position.set((e.id%2?-1:1)*0.42,0.04,0.12); gun.rotation.set(0,(e.id%2?-1:1)*(0.4+h),Math.PI/2); g.add(gun); U.gun=gun; }   /* his weapon, dropped by his hand */
  const pool=new THREE.Group(), bm=MAT.blood||(MAT.blood=v3Fogify(new THREE.MeshLambertMaterial({ color:0x2a0806 }))), P=FALLEN3D.pool;   /* an uneven dark pool under his back and head */
  for(const [px,pz,w,d] of [[0,-0.12,0.42,0.55],[(h-0.5)*0.3,-0.42,0.3,0.3],[(0.5-h)*0.25,0.12,0.22,0.26],[(e.id%2?1:-1)*0.22,-0.3,0.16,0.2]]){
    const b=part(GEO.ball,bm,P*w,0.008,P*d,px*P/0.55,0.012,pz*P/0.55); b.castShadow=false; b.receiveShadow=true; b.rotation.y=h*3+px*5; pool.add(b); }
  g.add(pool); U.pool=pool;
  const tilt=new THREE.Group(); tilt.add(s); g.add(tilt); U.tilt=tilt; U.body=s; U.S=S; U.fallen=true;
  g.rotation.order='YXZ'; U.yaw=(e.id%7)*0.9; s.scale.setScalar(VIEW3D.unitScale); U.top=0.35; return g; }
function v3PoseFallen(e,g,T,x,z){ const U=g.userData, F=FALLEN3D, c=e.carrier;
  if(c){ const dx=e.x-(U.px??e.x), dy=e.y-(U.py??e.y); if(Math.hypot(dx,dy)>0.3){ let d=Math.atan2(dx,dy)-U.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); U.yaw+=d*0.2; } }
  U.px=e.x; U.py=e.y;
  const drag=!!c, dt=Math.min(0.1,Math.max(0,T-(U.lt??T))); U.lt=T; const k=U.dk=(U.dk||0)+((drag?1:0)-(U.dk||0))*Math.min(1,dt*8);   /* eases between lying and being dragged */
  const bx=x-Math.sin(U.yaw)*F.behind*k, bz=z-Math.cos(U.yaw)*F.behind*k;   /* dragged: he trails behind the carrier, boots at its jaws */
  g.position.set(bx,v3H(bx,bz),bz); g.rotation.set(0,U.yaw,0);
  U.tilt.position.y=F.lift*k*0.55; U.tilt.rotation.x=-F.lift*k;   /* feet up, head down on the ground */
  U.S.arms.forEach((a,i)=>{ const s=i?1:-1, tr=2.7+Math.sin(T*6+i*1.7+e.id)*F.sway;   /* dragged: the arms trail over the head */
    a.rotation.x=-0.15*(1-k)+tr*k; a.rotation.z=a.userData.lie*(1-k)+s*0.35*k; });
  U.body.rotation.z=(drag?Math.sin(T*5+e.id)*F.sway*0.6:0)+((e.id*7919)%97/97-0.5)*0.25*(1-k);
  if(U.gun) U.gun.visible=!drag; if(U.pool) U.pool.visible=!drag&&!e.home; }
function v3Model(e){
  let g=null;
  if(e.kind==='unit'){ const f=UNITS[e.type]&&UNITS[e.type].faction; g=(f==='corps'&&e.type!=='husk')?v3Soldier(e):v3Creature(e);
    if(!g){ const sp=SPR[e.sprite||e.def.sprite]; g=v3Billboard(sp.img,e.def.scale||2); }
    else { const sc=(e.type==='broodmother'||e.type==='brute'?1.1:(e.def.radius||9)/9)*VIEW3D.unitScale; g.scale.setScalar(sc); g.userData.top*=sc; } }
  else if(e.kind==='building'){ g=v3Building(e); if(!g&&e.def&&ARTC[e.def.art]) g=v3Billboard(ARTC[e.def.art],2); }
  else g=v3Small(e);
  if(!g) g=v3Small(e);
  g.userData.ent=e; g.userData.yaw=e.face<0?-Math.PI/2:Math.PI/2; g.userData.px=e.x; g.userData.py=e.y; g.userData.top=g.userData.top||1; g.userData.legs=g.userData.legs||[]; g.userData.arms=g.userData.arms||[];
  g.traverse(o=>{ if(o.isMesh) o.receiveShadow=true; });
  return g; }


/* ---------- the dropship (nose along +x): poses come from shipPoses in 22-squad-life.js, the same as in 2D ---------- */
function v3Dropship(){ const g=new THREE.Group(), U=g.userData; g.rotation.order='YZX';
  const hull=mat('#5d6f83'), top=mat('#a3b4c6'), dark=mat('#262a33'), plate=mat('#4f5766'), yel=mat('#f2c230');
  g.add(box(hull,3.0,0.7,1.1,0,0,0)); g.add(box(top,2.6,0.12,0.8,-0.1,0.4,0)); g.add(box(dark,1.0,0.1,0.6,-0.4,0.47,0));
  g.add(rotZ(part(GEO.cone,hull,0.56,0.9,0.56,1.9,0,0),-Math.PI/2)); g.add(box(shiny('#7ff6ff',{ emissive:0x1a6a78 }),0.5,0.22,0.62,1.45,0.28,0));
  for(let i=0;i<4;i++) g.add(box(i%2?dark:yel,0.18,0.12,0.02,0.6+i*0.18,-0.12,0.56));
  for(const z of [-1,1]){ const w=box(plate,1.3,0.1,1.2,-0.25,0.02,z*0.95); w.rotation.y=z*0.25; g.add(w); g.add(box(dark,0.5,0.6,0.08,-1.45,0.45,z*0.42)); }
  U.pods=[]; for(const z of [-1,1]){ const pod=grp(-0.15,0.05,z*1.65); pod.add(rotZ(cyl(plate,0.24,1.5,0.24,0,0,0),Math.PI/2)); pod.add(rotZ(cyl(top,0.25,0.5,0.25,0.35,0,0),Math.PI/2));
    pod.add(rotZ(part(GEO.torus,dark,0.2,1,0.2,-0.76,0,0),Math.PI/2)); const fl=rotZ(part(GEO.cone,glow('#ffb35a',{ transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false }),0.17,1,0.17,-0.76,0,0),Math.PI/2);
    fl.geometry=GEO.flame||(GEO.flame=new THREE.ConeGeometry(1,1,10).translate(0,0.5,0)); fl.castShadow=false; pod.add(fl); pod.userData.flame=fl;
    const core=rotZ(part(GEO.flame,glow('#9ff8ff',{ transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false }),0.08,1,0.08,-0.76,0,0),Math.PI/2); core.castShadow=false; pod.add(core); pod.userData.core=core;
    g.add(pod); U.pods.push(pod); }
  U.legs3=[]; for(const [x,z] of [[-0.9,-0.45],[-0.9,0.45],[0.8,-0.4],[0.8,0.4]]){ const l=grp(x,-0.35,z); l.add(cyl(dark,0.05,0.5,0.05,0,-0.25,0)); l.add(box(plate,0.24,0.05,0.24,0,-0.5,0)); g.add(l); U.legs3.push(l); }
  const ramp=grp(-1.5,-0.3,0); ramp.add(box(dark,0.9,0.06,0.8,-0.45,0,0)); ramp.add(box(yel,0.06,0.07,0.8,-0.88,0,0)); g.add(ramp); U.ramp=ramp;
  U.red=ball(glow('#ff5a4f'),0.07,0.07,0.07,-0.2,0.1,-2.45); U.green=ball(glow('#5fe3b0'),0.07,0.07,0.07,-0.2,0.1,2.45); g.add(U.red); g.add(U.green);
  g.traverse(o=>{ if(o.isMesh&&o.material.type!=='MeshBasicMaterial') o.receiveShadow=true; });
  return g; }
function v3Ships(now,lights,put){ const T=now/1000, seen=new Set();
  for(const b of G.ents){ if(b.dead||!b.def||!b.def.reinforce) continue; const poses=shipPoses(b);
    poses.forEach((P,i)=>{ const key=b.id+':'+i; seen.add(key); let g=V3.ships.get(key); if(!g){ g=v3Dropship(); V3.ships.set(key,g); V3.g.add(g); } g.visible=true; const U=g.userData;
      const x=P.gx/TILE, z=P.gy/TILE, gy=v3H(b.x/TILE,b.y/TILE), y=Math.max(gy,v3H(x,z))+0.85+P.alt/TILE*0.55;
      g.position.set(x,y,z); g.rotation.set(P.bank*0.6,-P.hd,P.pitch*0.45);
      for(const pod of U.pods){ pod.rotation.z=P.tilt*Math.PI/2; const L=(0.4+1.2*P.thrust*(0.85+0.15*Math.sin(T*40)))*(P.tilt>0.5?0.8:1.2); pod.userData.flame.scale.set(0.17,P.thrust>0.02?L:0.001,0.17); pod.userData.core.scale.set(0.08,P.thrust>0.02?L*0.6:0.001,0.08); }
      for(const l of U.legs3) l.scale.y=Math.max(0.01,P.legs);
      U.ramp.rotation.z=(1-P.ramp)*1.45-P.ramp*0.35;
      const blink=Math.floor(now/400)%2===0; U.red.visible=U.green.visible=blink;
      if(P.thrust>0.4&&P.alt<120) lights.push({x,y:y-0.6,z,i:2.2*P.thrust,c:0xffa860,d:6});
      if(P.beams>0){ const ahead=(SHIP.lightReach+P.alt*0.35)/TILE; for(const side of [-1,1]){ const sw=Math.sin(now/520+side)*0.7, lx=x+Math.cos(P.hd)*ahead-Math.sin(P.hd)*(side*0.45+sw), lz=z+Math.sin(P.hd)*ahead+Math.cos(P.hd)*(side*0.45+sw);
        put(lx,v3H(lx,lz)+0.08,lz,1.6,'#fff0c8',0.35*P.beams); if(side>0) lights.push({x:lx,y:v3H(lx,lz)+1.2,z:lz,i:1.6*P.beams,c:0xfff0c8,d:5}); } } }); }
  for(const [k,g] of V3.ships) if(!seen.has(k)) g.visible=false; }

/* ---------- which entities show (as in 2D) ---------- */
function v3Shown(e){ const m=G.map;
  if(e.hidden&&!e.dead&&e.bossState&&e.bossState.burrow&&e.def.burrowTime-e.bossState.burrow.t<0.9) return isVisible(e);   /* the Matron sinking into the ground */
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
  V3.fxPool.length=V3.shotPool.length=V3.ringPool.length=V3.pingPool.length=0; V3.smoke=[]; V3.sparks=[]; V3.bits=[]; V3.meteors=new Map(); V3.devils=new Map(); V3.ambT=null; V3.ships=new Map(); for(const g of (V3.dying||new Map()).values()) for(const m of g.userData.own) m.dispose(); V3.dying=new Map();
  V3.fxg=new THREE.Group(); V3.g.add(V3.fxg); V3.fxg.add(V3.tracers); V3.fxg.add(V3.ghost); v3BuildTerrain(); }
function v3Camera(dt){ const V=VIEW3D, tx=(G.cam.x+ui.vw/2)/TILE, tz=(G.cam.y+(ui.vh-ui.hudH)/2)/TILE, ty=Math.max(0,v3H(tx,tz)), sh=(G.shake||0)*0.3;
  let d=V3.yaw*Math.PI/180-(V3.yawR||0); d=Math.atan2(Math.sin(d),Math.cos(d)); V3.yawR=(V3.yawR||0)+d*Math.min(1,dt*8);
  V.pitch=clamp(V.pitch,V.minPitch,V.maxPitch); const p=V.pitch*Math.PI/180, hd=V.dist*Math.cos(p), a=V3.yawR;
  if(V3.cam.fov!==V.fov){ V3.cam.fov=V.fov; V3.cam.updateProjectionMatrix(); }
  V3.cam.position.set(tx+hd*Math.sin(a)+(sh?rand(-sh,sh):0),ty+V.dist*Math.sin(p),tz+hd*Math.cos(a)); V3.cam.lookAt(tx,ty,tz);
  V3.sun.castShadow=!!VIEW3D.shadows; const dark=!!G.mission.dark; V3.sun.intensity=dark?V.darkSun:V.sun; V3.hemi.intensity=dark?V.darkAmbient:V.ambient;
  V3.u.lift.value.set(V.seenLift,dark?V.darkSeenAdd:V.seenAdd);
  V3.sun.position.set(tx-16,ty+24,tz-9); V3.sun.target.position.set(tx,ty,tz); V3.sun.target.updateMatrixWorld(); V3.look={x:tx,z:tz}; }
function pool(arr,make){ return i=>{ if(!arr[i]){ arr[i]=make(); V3.fxg.add(arr[i]); } const o=arr[i]; o.visible=true; return o; }; }
function hidePool(arr,n){ for(let i=n;i<arr.length;i++) arr[i].visible=false; }
function v3Sprite(){ return new THREE.Sprite(new THREE.SpriteMaterial({ map:V3.glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false })); }
/* animate one entity's model */
function v3Pose(e,g,T){ const U=g.userData, x=e.x/TILE, z=e.y/TILE; let y=v3H(x,z);
  if(e.kind==='unit'&&U.brute) return v3PoseBrute(e,g,U,T,x,y,z);
  if(e.kind==='unit'){ const dx=e.x-U.px, dy=e.y-U.py, tg=e.target&&!e.target.dead?e.target:null, fight=!!tg&&Math.hypot(tg.x-e.x,tg.y-e.y)<(e.def.range||1.5)*TILE+40;
    if(fight) U.want=Math.atan2(tg.x-e.x,tg.y-e.y); else if(Math.hypot(dx,dy)>0.4) U.want=Math.atan2(dx,dy);
    if(U.want!=null){ let d=U.want-U.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); U.yaw+=d*0.25; }
    U.px=e.x; U.py=e.y; g.rotation.set(0,U.yaw,0);
    const mv=e.moving&&!e.downed, ph=T*(e.def.speed>80?14:10)+e.id, sw=mv?Math.sin(ph)*0.55:0;
    U.legs.forEach((l,i)=>{ const b=l.userData.bx??(l.userData.bx=l.rotation.x); l.rotation.x=b+(i%2?sw:-sw); if(l.userData.knee){ const k=l.userData.knee; k.rotation.x=(k.userData.kb||0)+(mv?Math.max(0,Math.sin(ph+(i%2?Math.PI:0)))*0.6:0); } });
    U.arms.forEach((a,i)=>{ const b=a.userData.base||0; a.rotation.x=U.gun?b+(mv?Math.sin(ph)*0.06:0):b+(e.lunge>0?-0.9:(mv?(i%2?sw:-sw)*0.6:Math.sin(T*1.5+e.id+i)*0.08)); });
    if(U.tail) U.tail.rotation.y=Math.sin(T*2.2+e.id)*0.35;
    if(U.feelers) U.feelers.forEach((f,i)=>f.rotation.z=Math.sin(T*2+i)*0.25);
    if(U.head&&!mv) U.head.rotation.y=Math.sin(T*0.7+e.id*1.3)*0.3;
    if(U.sac){ const beat=e.type==='broodmother'?Math.pow(Math.max(0,Math.sin(T*3.2)),12)*0.07:0.05*Math.sin(T*(e.chargeT>0?14:3)+e.id); U.sac.scale.setScalar(1+beat); }
    if(U.torso){ const b=U.torso.userData.by??(U.torso.userData.by=U.torso.position.y); U.torso.position.y=b+Math.sin(T*2+e.id)*0.01; }
    if(U.spin&&fight) U.spin.rotation.z+=0.6;
    if(U.pilot) U.pilot.scale.setScalar(0.025*(0.8+Math.random()*0.5)*(fight?2:1));
    if(U.blink) U.blink.visible=Math.floor(T*2+e.id)%2===0;
    if(U.risen){ const p=0.5+0.5*Math.sin(T*3.8+e.id); U.risen.material.opacity=0.32+0.3*p; U.risen.scale.set(0.85+0.1*p,1.15+0.1*p,1);
      g.rotation.z=(mv?Math.sin(ph*0.5)*0.16:Math.sin(T*0.9+e.id)*0.05)+U.lean*(e.id%2?1:-1);   /* the shamble: a lurching sway, always leaning to one side */
      if(U.arms[0]&&!e.downed) U.arms[0].rotation.x=U.arms[0].userData.base*0.3+(mv?Math.sin(ph*0.5)*0.2:0);   /* one arm hangs loose */
      if(Math.random()<0.05) G.fx.push({k:'spark',x:e.x+rand(-6,6),y:e.y-rand(4,20),vx:rand(-8,8),vy:rand(-40,-20),t:0.8,max:0.8,col:'#9dff6a'}); }
    if(U.beam){ const on=!!G.mission.dark&&e.faction===G.side&&!e.downed&&VIEW3D.lamp>0, b=U.beam; b.visible=on&&VIEW3D.beam>0;
      U.lampBulb.material=on?(MAT.lampOn||(MAT.lampOn=glow('#fff6dc'))):U.lampBulbOff; if(on) U.lampBulb.scale.set(0.034,0.034,0.016); else U.lampBulb.scale.set(0.026,0.026,0.012);
      if(b.visible){ const s=g.scale.x||1, len=Math.hypot(1.4/s,1.0)*1.02, a=VIEW3D.beam*Math.min(1.5,VIEW3D.lamp)*Math.sqrt(U.lampShare??1);   /* aim at the lit spot, 1.4 tiles ahead on the ground */
        b.rotation.set(Math.atan2(b.position.y,1.4/s-b.position.z),0,0); for(const c of b.children){ c.scale.z=len; c.material.opacity=0.26*a*c.userData.op; } }
      U.lampHalo.visible=on&&VIEW3D.beam>0; if(on) U.lampHalo.material.opacity=Math.min(1,0.9*VIEW3D.beam*Math.min(1.5,VIEW3D.lamp)); }
    if(U.weld) U.weld.visible=!!(e.order&&/repair|build/.test(e.order.type))&&Math.random()<0.7;
    if(U.grazer) v3PoseGrazer(e,U,T,mv); else if(U.matron) y+=v3PoseMatron(e,g,U,T,mv,fight,ph);
    if(mv) y+=Math.abs(Math.sin(ph))*0.025;
    if(e.downed){ g.rotation.x=-Math.PI/2*0.92; y+=0.12; } else if(e.stunT>0) g.rotation.z=Math.sin(T*9)*0.25;
    const lg=e.lunge>0?0.15:0; g.position.set(x+Math.sin(U.yaw)*lg,y,z+Math.cos(U.yaw)*lg);
    const s0=U.s0||(U.s0=g.scale.x), fl=e.flash>0?1.06:1; if(U.fl!==fl){ U.fl=fl; g.scale.setScalar(s0*fl); } return; }
  if(U.fallen) return v3PoseFallen(e,g,T,x,z);
  if(e.kind!=='building'&&U.bob) y+=0.05+Math.sin(T*3+e.id)*0.04;
  g.position.set(x,y,z);
  if(e.kind!=='building') return;
  g.scale.y=(!e.built&&e.progress!=null)?Math.max(0.08,e.progress):1;
  if(U.blink) U.blink.visible=Math.floor(T*1.6+e.id)%2===0;
  if(U.lamps) U.lamps.forEach((l,i)=>l.visible=Math.floor(T*3-i*0.5)%2===0);
  if(U.heart){ const f=e.hp/e.maxHp; U.heart.scale.setScalar(0.3*(1+0.2*Math.max(0,Math.sin(T*(2+f*2)+e.id)))); g.scale.set(1+0.02*Math.sin(T*2+e.id),1+0.03*Math.sin(T*2+e.id),1); }
  if(U.hive) v3PoseHive(e,g,T);
  if(U.sentry) v3PoseSentry(e,U,T);
  if(U.pulse) U.pulse.scale.set(0.24,0.34*(1+0.06*Math.sin(T*7+e.id)),0.24);
  if(U.core) U.core.visible=!!e.powered&&Math.random()>0.03;
  if(U.memb) v3PoseMembrane(e,g,T);
  if(e.type==='egg'){ const p=e.openT!=null?1-e.openT/EGG.open:0; g.scale.setScalar(1+Math.sin(T*2+e.id)*0.04+0.15*p); U.opening=p; } }
/* the Brute walks like a heavy beast (BRUTE3D): its heading turns at a limited rate with inertia (and follows u.hd, the heading
   the movement code gives it, see BRUTE_WALK), its steps come from the distance walked and from turning on the spot, so it never
   spins on its legs. A diagonal gait (left fore with right hind), the head looks into the turn before the body follows, the body
   leans into bends and pitches as it speeds up or slows down, the bands ripple, the tail flicks.
   Fighting: before each blow it lowers its head and paws the ground with a forehoof, the blow is a short charge with the head
   down. One band breaks off below 50% health, a second below 25% (the seams glow brighter); steam from the nostrils at rest. */
const BRUTE3D = { turnRate:2.6, turnAccel:8, stride:1.5, turnStride:1.1, swing:0.5, lean:0.09, look:0.9, ramTime:0.7, reach:0.35, windup:0.45 };
function v3PoseBrute(e,g,U,T,x,y,z){ const ease=k=>k<0?0:k>1?1:k*k*(3-2*k);
  const B=BRUTE3D, dt=Math.min(0.1,Math.max(0,T-(U.lt??T))); U.lt=T; const s0=U.s0||(U.s0=g.scale.x);
  const dx=e.x-U.px, dy=e.y-U.py, moved=Math.hypot(dx,dy)/TILE; U.px=e.x; U.py=e.y;
  const tg=e.target&&!e.target.dead?e.target:null, fight=!!tg&&Math.hypot(tg.x-e.x,tg.y-e.y)<(e.def.range||1.5)*TILE+40, mv=e.moving&&!e.downed;
  let want=null; if(fight) want=Math.atan2(tg.x-e.x,tg.y-e.y); else if(mv&&e.hd!=null) want=e.hd; else if(moved>0.01) want=Math.atan2(dx,dy);
  const err=want==null?0:Math.atan2(Math.sin(want-U.yaw),Math.cos(want-U.yaw));
  const wT=clamp(err*3,-B.turnRate,B.turnRate); U.w=(U.w||0)+clamp(wT-(U.w||0),-B.turnAccel*dt,B.turnAccel*dt); U.yaw+=U.w*dt;
  if(dt>0) U.v=(U.v||0)+(moved/dt-(U.v||0))*Math.min(1,dt*8);
  const vmax=(e.def.speed||50)/TILE, vn=clamp((U.v||0)/vmax,0,1), wn=clamp(Math.abs(U.w)/B.turnRate,0,1), turnOnly=wn*(1-vn);
  U.amp=(U.amp||0)+(clamp(vn*1.05+turnOnly*0.55,0,1)-(U.amp||0))*Math.min(1,dt*6); U.tAmp=(U.tAmp||0)+(turnOnly-(U.tAmp||0))*Math.min(1,dt*6); if(Math.abs(U.w)>0.05) U.tsg=Math.sign(U.w);
  U.ph=(U.ph??e.id)+((U.v||0)/(B.stride*s0)+Math.abs(U.w)*(1-vn)/B.turnStride)*Math.PI*2*dt;
  if(U.amp<0.04) U.ph+=(Math.round(U.ph/Math.PI)*Math.PI-U.ph)*Math.min(1,dt*2);   /* settle the legs when it stops */
  U.look=(U.look||0)+(clamp(err,-0.7,0.7)-(U.look||0))*Math.min(1,dt*5);
  U.lean=(U.lean||0)+(-U.w*vn*B.lean-(U.lean||0))*Math.min(1,dt*4);
  const acc=dt>0?((U.v||0)-(U.lv||0))/dt:0; U.lv=U.v; U.pitch=(U.pitch||0)+(clamp(acc*0.035,-0.07,0.07)-(U.pitch||0))*Math.min(1,dt*4);
  /* the blow: e.lunge is set when it strikes; play a short charge from there. Before the next blow: head down, paw the ground */
  if(e.lunge>0&&!U.lungeSeen){ U.lungeSeen=true; U.ram=0; } if(!(e.lunge>0)) U.lungeSeen=false;
  if(U.ram!=null){ U.ram+=dt/B.ramTime; if(U.ram>=1) U.ram=null; }
  const r=U.ram, hitK=r!=null?(r<0.2?ease(r/0.2):1-ease((r-0.2)/0.8)):0, wind=fight&&r==null&&e.cd<B.windup?1-Math.max(0,e.cd)/B.windup:0;
  const p=U.ph, a=U.amp, t=U.tAmp*(U.tsg||1);
  for(const F of U.fore){ const q=p+F.off, lift=Math.max(0,Math.cos(q)); let sx=-0.15-Math.sin(q)*B.swing*a, ex=lift*0.95*a;
    if(wind&&F.k>0){ const paw=Math.sin(T*16); sx+=(-0.2-paw*0.35)*wind; ex+=Math.max(0,paw)*0.8*wind; }
    F.sh.rotation.x=sx-hitK*0.5; F.el.rotation.x=ex+hitK*0.55; F.sh.rotation.z=Math.sin(q)*0.22*t; }
  for(const H of U.hind){ const q=p+H.off, lift=Math.max(0,Math.cos(q));
    H.hip.rotation.x=-0.45-Math.sin(q)*B.swing*0.85*a+hitK*0.35; H.kn.rotation.x=0.95+lift*0.55*a-hitK*0.2; H.ft.rotation.x=-0.5-lift*0.5*a; H.hip.rotation.z=-Math.sin(q)*0.15*t; }
  const body=U.torso; body.position.y=0.78-Math.abs(Math.cos(p))*0.045*a+0.02*a-wind*0.05+Math.sin(T*1.7+e.id)*0.008*(1-a);
  body.rotation.x=-wind*0.06+hitK*0.14+U.pitch; body.rotation.z=Math.sin(p)*0.035*a+U.lean;
  U.bands.forEach((b,i)=>{ b.position.y=b.userData.by+Math.sin(p*2-i*0.9)*0.013*a+Math.sin(T*1.7-i*0.5)*0.004; });
  U.head.rotation.y=U.look*B.look; U.head.rotation.x=Math.sin(p*2+0.6)*0.05*a+wind*0.45+hitK*0.55+(e.flash>0?-0.2:0);
  U.jaw.rotation.x=hitK*0.3+Math.max(0,Math.sin(T*0.9+e.id))*0.05;
  if(U.tail){ U.tail.rotation.y=Math.sin(T*2.4+e.id)*0.25*(1-a)+Math.sin(p)*0.3*a; U.tail.rotation.x=-0.55-hitK*0.5-wind*0.3+Math.max(0,Math.sin(T*0.7+e.id))**12*0.6; }   /* a flick now and then, up when it charges */
  /* wounds: bands break off, the seams glow brighter */
  const f=e.hp/e.maxHp, broke=f<0.25?2:f<0.5?1:0;
  if(U.broke!==broke){ const was=U.broke||0; U.broke=broke; const gone=[1+e.id%2,4+e.id%2].slice(0,broke);
    U.bands.forEach((b,i)=>b.visible=!gone.includes(i)); U.seams.forEach(m=>m.material=broke?glow('#a6ff4a'):glow('#3f6a1e'));
    if(broke>was&&V3.smoke){ const w=U.bands[gone[broke-1]].getWorldPosition(V3._w||(V3._w=new THREE.Vector3())); for(let i=0;i<3;i++) V3.smoke.push({x:w.x+rand(-0.2,0.2),z:w.z+rand(-0.2,0.2),y:w.y,t:0,sz:0.3,col:'#8f8268'}); } }
  if(a<0.1&&!fight&&V3.smoke&&Math.random()<0.006){ const w=U.snout.getWorldPosition(V3._w||(V3._w=new THREE.Vector3())); for(let i=0;i<2;i++) V3.smoke.push({x:w.x,z:w.z,y:w.y,t:i*0.3,sz:0.16,col:'#b4b4c0'}); }
  /* place it: the charge carries it forward along its facing */
  g.rotation.set(0,U.yaw,0); if(e.stunT>0) g.rotation.z=Math.sin(T*9)*0.25;
  const lg=hitK*B.reach-wind*0.05; g.position.set(x+Math.sin(U.yaw)*lg,y,z+Math.cos(U.yaw)*lg);
  const fl=e.flash>0?1.06:1; if(U.fl!==fl){ U.fl=fl; g.scale.setScalar(s0*fl); } }
/* ---------- The Matron (Wortelhart, the root heart) ----------
   A two-chambered heart of flesh, shingled with bark and bone plates, thick knotted veins that pulse one after another,
   her glowing core showing through a split in the skin. A vertical maw at the front lined with bone hooks, a ring of small
   glowing eye pits above it, three grasping tendrils below. Brood pods sit in bark cups on top, each with a small Scuttler
   curled inside; a long root-arm on her back plucks a pod and flings it. Three bone chimneys on her back breathe spores
   (her acid rain comes out of them). She walks on eight knotted roots with side roots and root hairs, and drags a tail of
   mycel roots behind her. Shaped as a heart and a tree stump on purpose: no crown, no egg sac, nothing of a film queen.
   v3PoseMatron: rooted (roots dig in), charge, creeping, spit, egg flinging, acid rain, screech, eating, the drag back to
   her lair, healing, burrowing and breaking out; plates tear off at 66% and 33% health and the split widens. */
function v3Matron(e){
  const g=new THREE.Group(), U=g.userData; U.legs=[]; U.arms=[]; U.matron=true;
  const RX=1.1, RY=0.95, RZ=1.05, V=(x,y,z)=>new THREE.Vector3(x,y,z), UP=V(0,1,0), FW=V(0,0,1);
  const skin=(d,off=0)=>{ d=d.clone().normalize(); const p=d.multiplyScalar(1/Math.hypot(d.x/RX,d.y/RY,d.z/RZ)), n=V(p.x/RX/RX,p.y/RY/RY,p.z/RZ/RZ).normalize(); p.addScaledVector(n,off); return {p,n}; };
  const at=(o,p,n,ax=FW)=>{ o.position.copy(p); o.quaternion.setFromUnitVectors(ax,n); return o; };
  const seg=(m,r,a,b)=>{ const d=b.clone().sub(a), L=d.length(), o=part(GEO.cyl,m,r,L,r,0,0,0); o.position.copy(a).addScaledVector(d,0.5); o.quaternion.setFromUnitVectors(UP,d.normalize()); return o; };
  const flip=o=>{ o.rotation.x=Math.PI; return o; };
  const skinM=U.skinM=v3Fogify(new THREE.MeshPhongMaterial({ color:'#4a2a4e', specular:0x3a3044, shininess:22 }));
  const skin2=fung('#5e3a62'), bark=fung('#5b4a3a'), bark2=fung('#463729'), B=fung(CH.bone), B3=fung('#8f8268'), Dk=fung(CH.dark), C=fung(CH.body), flesh=fung('#6e3f5c'), root2=fung('#55405f');
  U.skinBase=new THREE.Color('#4a2a4e'); U.skinPale=new THREE.Color('#8a7488');
  /* the heart: a big chamber, a second chamber high at the back, an atrium on top */
  const heart=grp(0,1.55,0); g.add(heart); U.torso=heart; U.heart=heart;
  U.ch1=ball(skinM,RX,RY,RZ,0,0,0); U.ch2=ball(skinM,0.78,0.72,0.72,-0.5,0.4,-0.3); U.atr=ball(skin2,0.5,0.42,0.48,0.45,0.62,-0.35); heart.add(U.ch1,U.ch2,U.atr);
  /* bark and bone plates shingled over the skin; under each a patch of raw glowing flesh. Stage 1 plates tear off below 66%, stage 2 below 33% */
  U.plates=[];
  for(let i=0;i<24;i++){ const y=0.86-(i+0.5)/24*1.6, r=Math.sqrt(1-y*y), a=i*2.399+0.4, d=V(Math.cos(a)*r,y,Math.sin(a)*r);
    if(d.z>0.4&&Math.abs(d.x)<0.8&&d.y<0.6) continue;   /* the face stays bare: maw, eyes, the split */
    const {p,n}=skin(d), w=0.27+((i*0.618)%1)*0.1;
    heart.add(at(part(GEO.half,glow('#2f5a18'),w*0.8,0.035,w*0.65,0,0,0),p,n,UP));
    const pl=at(grp(),p.clone().addScaledVector(n,-0.05),n,UP), inn=grp(); inn.rotation.y=a*1.7; pl.add(inn);
    inn.add(part(GEO.half,i%2?bark:B,w,0.15,w*0.78,0,0,0)); inn.add(box(i%2?bark2:B3,w*1.1,0.035,0.035,0,0.13,0));
    for(const x of [-0.35,0.35]) inn.add(part(GEO.cone,B3,0.025,0.06,0.025,x*w,0.14,0));
    pl.userData.stage=i%3===0?1:i%3===1?2:0; heart.add(pl); U.plates.push(pl); }
  /* thick knotted veins from under her up over the top, each with its own pulse; a small fork halfway */
  U.veins=[];
  [-0.2,0.5,2.5,3.2,3.9,4.6,5.4].forEach((a0,i)=>{ const m=v3Fogify(new THREE.MeshPhongMaterial({ color:'#5e1426', emissive:0x1e0308, specular:0x552233, shininess:40 })); U.veins.push(m);
    const pts=[]; for(let j=0;j<=9;j++){ const t=j/9, y=-0.85+t*1.62, a=a0+Math.sin(t*3+i)*0.22, r=Math.sqrt(Math.max(0.04,1-y*y)); pts.push(skin(V(Math.cos(a)*r,y,Math.sin(a)*r),0.025).p); }
    for(let j=0;j<9;j++){ heart.add(seg(m,0.05*(1-j/18),pts[j],pts[j+1])); if(j%3===1) heart.add(ball(m,0.07,0.06,0.07,pts[j].x,pts[j].y,pts[j].z)); }
    const f0=pts[4], f1=skin(V(Math.cos(a0+0.5)*0.9,-0.05,Math.sin(a0+0.5)*0.9),0.02).p, f2=skin(V(Math.cos(a0+0.75)*0.85,0.3,Math.sin(a0+0.75)*0.85),0.02).p;
    heart.add(seg(m,0.03,f0,f1)); heart.add(seg(m,0.022,f1,f2)); });
  /* the split: her core glows through a tear between two swollen lips; a second split opens below 33% */
  const slit=(d)=>{ const s=skin(d,0.01), sg=at(grp(),s.p,s.n); const core=ball(glow('#a6ff4a'),0.07,0.42,0.09,0,0,-0.02), mem=ball(mat('#4fae22',{ transparent:true, opacity:0.45 }),0.13,0.5,0.07,0,0,0);
    const lips=[-1,1].map(k=>{ const l=grp(k*0.09,0,0); l.add(ball(flesh,0.07,0.5,0.09,0,0,0)); l.userData.k=k; sg.add(l); return l; });
    const drips=[0,1,2,3].map(i=>{ const dp=ball(glow('#a6ff4a'),0.025,0.045,0.025,0,0,0); dp.visible=false; sg.add(dp); return dp; });
    sg.add(core,mem); heart.add(sg); return { g:sg, core, mem, lips, drips }; };
  U.slits=[slit(V(0.75,0.25,0.62)),slit(V(-0.85,-0.1,0.5))]; U.slits[1].g.visible=false;
  /* the maw: a vertical slit at the front, lips with bone hooks, a red throat */
  const d0=V(0,-0.3,1).normalize(), mw=skin(d0), maw=at(grp(),mw.p,mw.n); heart.add(maw); U.maw=maw;
  maw.add(ball(mat('#1a0a12'),0.16,0.4,0.12,0,0,-0.02)); maw.add(ball(glow('#5a1222'),0.05,0.22,0.04,0,0,0.07));
  U.lips=[-1,1].map(k=>{ const lip=grp(k*0.06,0,0); lip.add(ball(flesh,0.1,0.46,0.11,k*0.06,0,0.02));
    for(let i=0;i<5;i++){ const c=part(GEO.claw,B,0.018,0.018,0.09,0,(i-2)*0.15,0.08); c.rotation.y=-k*1.2; lip.add(c); }
    lip.userData.k=k; maw.add(lip); return lip; });
  /* a ring of small eye pits above the maw */
  U.eyes=[]; const right=V(1,0,0), up=V(0,1,0.3).normalize();
  for(let i=0;i<9;i++){ const a=0.25+i/8*(Math.PI-0.5), d=d0.clone().addScaledVector(right,Math.cos(a)*0.5).addScaledVector(up,Math.sin(a)*0.5), {p,n}=skin(d), sz=0.026+0.016*Math.sin(a);
    heart.add(at(ball(Dk,sz*1.8,sz*1.8,sz,0,0,0),p,n)); const ey=at(ball(glow(CH.glow),sz,sz,sz*0.8,0,0,0),p.clone().addScaledVector(n,0.012),n); ey.userData.s=sz; heart.add(ey); U.eyes.push(ey); }
  /* three grasping tendrils under the maw */
  U.tents=[-1,0,1].map(k=>{ const s=skin(V(k*0.28,-0.8,0.8)), base=grp(s.p.x,s.p.y,s.p.z); base.rotation.y=k*0.25; heart.add(base); const segs=[]; let par=base;
    for(let j=0;j<6;j++){ const r=0.06-j*0.007, sg=grp(0,j?-0.18:0,0); sg.add(flip(part(GEO.taper,flesh,r,0.19,r,0,-0.09,0))); if(j===5) sg.add(flip(part(GEO.cone,B,0.025,0.1,0.025,0,-0.22,0)));
      par.add(sg); segs.push(sg); par=sg; } return segs; });
  /* brood pods in bark cups on top, a Scuttler curled in each */
  U.pods=[[0.35,1,0.4],[0,1,0.55],[0.6,0.85,0.1],[0.25,1,-0.05],[-0.25,0.9,0.6]].map(([x,y,z],i)=>{ const s=skin(V(x,y,z)), pg=at(grp(),s.p,s.n,UP);
    pg.add(part(GEO.half,bark2,0.19,0.08,0.19,0,-0.02,0)); pg.add(part(GEO.torus,bark,0.17,0.9,0.17,0,0.03,0));
    const pod=ball(mat('#6d8a35',{ transparent:true, opacity:0.5, depthWrite:false }),0.15,0.2,0.15,0,0.17,0), lit=ball(glow('#c7f05a'),0.06,0.04,0.06,0,0.05,0);
    const sc=grp(0,0.15,0); sc.add(box(Dk,0.025,0.11,0.03,0,0,0)); sc.add(ball(Dk,0.03,0.03,0.03,0,0.07,0.01)); for(const k of [-1,1]){ sc.add(ball(glow(CH.glow),0.008,0.008,0.008,k*0.014,0.075,0.035)); const cl=part(GEO.claw,B3,0.006,0.006,0.06,k*0.02,0.04,0.02); cl.rotation.x=0.9; sc.add(cl); }
    sc.rotation.z=0.5; pg.add(sc,pod,lit); heart.add(pg); return { pod, lit, sc }; });
  /* the root-arm on her back that flings a pod */
  { const s=skin(V(0.35,0.85,-0.45)), arm=grp(s.p.x,s.p.y,s.p.z); arm.rotation.x=-0.6; arm.rotation.z=-0.25; heart.add(arm); const segs=[]; let par=arm;
    for(let j=0;j<6;j++){ const r=0.11-j*0.013, sg=grp(0,j?0.2:0,0); sg.add(part(GEO.taper,j%2?C:root2,r,0.21,r,0,0.1,0)); sg.add(part(GEO.torus,bark2,r*1.05,0.7,r*1.05,0,0.01,0)); par.add(sg); segs.push(sg); par=sg; }
    const hand=grp(0,0.22,0); for(let i=0;i<3;i++){ const c=part(GEO.claw,B,0.02,0.02,0.14,Math.cos(i*2.09)*0.06,0,Math.sin(i*2.09)*0.06); c.rotation.set(-Math.PI/2+0.5*Math.sin(i*2.09),0,0); hand.add(c); }
    const pod=ball(mat('#6d8a35',{ transparent:true, opacity:0.6 }),0.12,0.15,0.12,0,0.12,0); pod.add(ball(glow('#c7f05a'),0.4,0.4,0.4,0,0,0)); hand.add(pod); par.add(hand);
    U.fling={ segs, pod }; }
  /* three bone chimneys on her back that breathe spores */
  U.vents=[[0.75,0.45,-0.6],[0.3,0.35,-0.95],[0.95,0.0,-0.4]].map(([x,y,z])=>{ const s=skin(V(x,y,z)), v=at(grp(),s.p,s.n,UP);
    v.add(part(GEO.taper,B,0.13,0.42,0.13,0,0.2,0)); v.add(part(GEO.torus,B3,0.13,0.8,0.13,0,0.1,0)); v.add(part(GEO.torus,B3,0.11,0.8,0.11,0,0.3,0));
    v.add(ball(Dk,0.08,0.03,0.08,0,0.42,0)); const top=ball(glow('#a6ff4a'),0.055,0.02,0.055,0,0.43,0); v.add(top); v.userData.top=top; heart.add(v); return v; });
  /* eight knotted roots with side roots and root hairs */
  U.roots=[];
  for(let i=0;i<8;i++){ const a=i*Math.PI/4+Math.PI/8, yawG=grp(Math.cos(a)*0.75,1.25,Math.sin(a)*0.75); yawG.rotation.y=-a; g.add(yawG);
    const hip=grp(); hip.rotation.z=1.0; yawG.add(hip);
    hip.add(flip(part(GEO.taper,C,0.17,0.95,0.17,0,-0.47,0))); hip.add(part(GEO.lowball,bark2,0.13,0.11,0.13,0,-0.95,0)); hip.add(part(GEO.lowball,bark,0.12,0.09,0.12,0,-0.4,0.02));
    const sr=grp(0,-0.5,0); sr.rotation.set(i%2?0.7:-0.7,0,0.6); sr.add(flip(part(GEO.taper,root2,0.045,0.38,0.045,0,-0.18,0))); hip.add(sr);
    const knee=grp(0,-0.95,0); knee.rotation.z=-1.3; hip.add(knee);
    knee.add(flip(part(GEO.taper,root2,0.11,0.8,0.11,0,-0.39,0))); knee.add(part(GEO.lowball,bark2,0.09,0.08,0.09,0,-0.35,0));
    const sr2=grp(0,-0.3,0); sr2.rotation.set(i%2?-0.8:0.8,0,-0.5); sr2.add(flip(part(GEO.taper,C,0.035,0.3,0.035,0,-0.14,0))); knee.add(sr2);
    const foot=grp(0,-0.78,0); knee.add(foot); foot.add(ball(bark2,0.07,0.05,0.07,0,0,0));
    for(let j=0;j<5;j++){ const hh=grp(); hh.rotation.set((j-2)*0.32,0,j%2?0.35:-0.35); hh.add(flip(part(GEO.cone,B3,0.02,0.22,0.02,0,-0.1,0))); foot.add(hh); }
    U.roots.push({ yawG, hip, knee, foot, a }); }
  /* a tail of mycel roots dragging behind her, glowing at the tips */
  U.trail=[0,1,2,3,4].map(k=>{ const base=grp((k-2)*0.22,0.55,-0.7); base.rotation.y=(k-2)*0.28; g.add(base); const segs=[]; let par=base;
    for(let j=0;j<6;j++){ const sg=grp(0,0,j?-0.3:0); sg.rotation.x=j===0?-1.0:0.3-(j>3?0.3:0); const m=part(GEO.cyl,j%2?C:root2,0.035-j*0.004,0.31,0.035-j*0.004,0,0,-0.15); m.rotation.x=Math.PI/2; sg.add(m);
      if(j===5) sg.add(ball(glow('#a6ff4a'),0.03,0.03,0.04,0,0,-0.3)); par.add(sg); segs.push(sg); par=sg; } return segs; });
  U.rootK=0; U.stage=0; U.lean=0; U.open=0; U.top=3.0; return g; }
/* one frame of the Matron; returns how far she sits lower or higher than the ground (burrowing, dragging, rooted) */
function v3PoseMatron(e,g,U,T,mv,fight,ph){
  const S=e.bossState||{}, d=e.def, A=e.bossAnim, since=k=>A&&A.k===k?G.time-A.at:99, lerp=(a,b,k)=>a+(b-a)*k;
  const charge=S.charge>0, flee=S.retreat==='go', heal=S.retreat==='heal', rooted=!charge&&!flee&&e.awake&&(e.speedMul||1)<=d.rootSpeed+0.01;
  U.rootK=lerp(U.rootK,rooted?1:0,0.08); let dy=-0.14*U.rootK+(charge?0.08:0)+(flee?-0.22:0);
  /* damage: plates tear off, the split opens wider, the second split opens, it drips */
  const f=e.hp/e.maxHp, stage=f<0.33?2:f<0.66?1:0;
  if(U.stage!==stage){ const was=U.stage; U.stage=stage;
    U.plates.forEach(p=>{ const off=p.userData.stage&&p.userData.stage<=stage; if(off&&p.visible&&stage>was&&V3.smoke){ const w=p.getWorldPosition(V3._w||(V3._w=new THREE.Vector3())); V3.smoke.push({x:w.x,z:w.z,y:w.y,t:0,sz:0.25,col:'#6b5a48'}); } p.visible=!off; });
    U.slits[1].g.visible=stage>=2; }
  const nd=stage===0?0:stage===1?2:4;
  U.slits.forEach((s,si)=>{ const w=si?0.6:1+stage*0.8; s.lips.forEach(l=>l.position.x=l.userData.k*(0.09+0.07*(si?1:stage))); s.core.scale.set(0.07*w,0.42,0.09); s.mem.scale.set(0.13*w,0.5,0.07);
    s.drips.forEach((dp,i)=>{ dp.visible=s.g.visible&&i<(si?2:nd); if(!dp.visible) return; const c=(T*0.7+i*0.37+si*0.2)%1; dp.position.set((i-1.5)*0.05,-0.15-c*0.9,0.05+c*0.12); dp.scale.setScalar(0.03*(1-c*0.6)); }); });
  /* the beat: lub-dub, faster when she charges or flees, slow while she heals; a hard beat when she lays eggs */
  const rate=charge?6.5:flee?5:heal?2.2:3.2, b1=Math.pow(Math.max(0,Math.sin(T*rate)),12)+(since('egg')<0.5?0.6:0), b2=Math.pow(Math.max(0,Math.sin(T*rate-0.6)),12);
  U.heart.scale.setScalar(1+0.035*b1); U.ch2.scale.set(0.78*(1+0.08*b2),0.72*(1+0.08*b2),0.72*(1+0.08*b2)); U.atr.scale.set(0.5*(1+0.1*b2),0.42*(1+0.1*b2),0.48*(1+0.1*b2));
  U.veins.forEach((m,i)=>{ const k=Math.pow(Math.max(0,Math.sin(T*rate-i*0.35)),6), p=flee?0.25:1; m.emissive.setRGB((0.08+0.4*k)*p,(0.01+0.03*k)*p,(0.03+0.08*k)*p); m.color.setHex(flee?0xb07a86:0x5e1426); });
  U.skinM.color.lerp(flee?U.skinPale:U.skinBase,0.05);
  const hk=heal?1.3+0.25*Math.sin(T*4):1; U.slits[0].core.scale.x*=hk; U.slits[0].core.scale.y*=heal?1.15:1;
  /* her face: the eyes flare when she screeches, the maw opens to spit, to scream and to eat */
  const sc=since('screech'), sp=since('spit'), ea=since('eat'), scr=sc<1.1;
  U.eyes.forEach((ey,i)=>ey.scale.setScalar(ey.userData.s*(scr?1.8:1)*(0.85+0.15*Math.sin(T*3+i))));
  const open=scr?1:sp<0.45?0.6:(ea>0.7&&ea<1.6)?0.8:0.08*Math.max(0,Math.sin(T*0.8+e.id));
  U.open=lerp(U.open,open,0.25); U.lips.forEach(l=>l.rotation.y=l.userData.k*U.open*0.7);
  U.lean=lerp(U.lean,charge?0.25:flee?0.12:scr?-0.22:sp<0.4?0.1:0,0.12); U.heart.rotation.x=U.lean;
  U.heart.position.x=scr?Math.sin(T*60)*0.03*(1-sc/1.1):0; U.heart.rotation.z=0;
  /* tendrils: sway; reach out and pull in what she eats; trail behind when she drags herself home */
  U.tents.forEach((segs,k)=>segs.forEach((s,j)=>{ let tg=j===0?-0.4:-0.25+Math.sin(T*1.4+j*0.7+k*2)*0.12;
    if(ea<0.7) tg=j===0?-1.2:-0.05; else if(ea<1.6) tg=j===0?-0.2:-0.55; else if(flee) tg=j===0?0.35:0.05+Math.sin(T*3+j+k)*0.1;
    s.rotation.x=lerp(s.rotation.x,tg,0.15); }));
  /* pods: they breathe, the Scuttlers inside twitch now and then; they light up when she lays or flings */
  const lob=since('lob'), egg=since('egg');
  U.pods.forEach((p,i)=>{ p.pod.scale.set(0.15,0.2*(1+0.04*Math.sin(T*2+i)),0.15); const tw=Math.sin(T*0.7+i*3)>0.85; p.sc.rotation.y=Math.sin(T*(tw?18:2)+i*1.7)*(tw?0.5:0.15);
    p.lit.scale.setScalar(0.06*((lob<0.8||egg<0.8)?1.8:1)); });
  /* the root-arm: rests curled over her back; winds back and snaps forward to fling a pod */
  U.fling.segs.forEach((s,j)=>{ const tg=lob<0.35?0.62:lob<0.65?-0.28:0.42+Math.sin(T*0.9+j)*0.05; s.rotation.x=lerp(s.rotation.x,tg,lob<0.65?0.35:0.1); });
  U.fling.pod.visible=!(lob>0.5&&lob<1.6);
  /* the chimneys: swell and blow green spores for the acid rain; a lazy puff now and then */
  const rn=since('rain');
  U.vents.forEach((v,i)=>{ const sw=rn<1.4?1+0.35*Math.abs(Math.sin(rn*14+i)):1+0.03*Math.sin(T*2+i); v.scale.set(1+(sw-1)*0.5,sw,1+(sw-1)*0.5);
    if(V3.smoke&&(rn<1.4?Math.random()<0.35:Math.random()<0.003)){ const w=v.userData.top.getWorldPosition(V3._w||(V3._w=new THREE.Vector3())); V3.smoke.push({x:w.x,z:w.z,y:w.y,t:0,sz:rn<1.4?0.3:0.15,col:rn<1.4?'#7ad62a':'#4a5a3a'}); } });
  /* roots: they step in pairs as she walks (fast in a charge, low and dragging when she flees), dig in when she is rooted */
  const mk=mv?1:0, p2=ph*(charge?1.6:1);
  U.roots.forEach((r,i)=>{ const p=p2*0.5+(i%2)*Math.PI+(i>>1)*0.4, lift=Math.max(0,Math.sin(p))*0.3*mk*(flee?0.4:1);
    r.yawG.rotation.y=-r.a+Math.sin(p)*0.15*mk; r.hip.rotation.z=1.0+lift+U.rootK*0.06-(flee?0.2:0); r.knee.rotation.z=-1.3-lift*0.6-U.rootK*0.1; r.foot.scale.setScalar(1+0.5*U.rootK); });
  U.trail.forEach((segs,k)=>segs.forEach((s,j)=>{ if(j) s.rotation.y=Math.sin(T*(mv?3:1.6)-j*0.8+k)*0.12; }));
  /* burrowing: she sinks into the ground; breaking out: she rises out of it */
  if(S.burrow){ const k=clamp((d.burrowTime-S.burrow.t)/0.9,0,1); dy-=k*3.2; U.heart.rotation.z=Math.sin(T*20)*0.08*k; }
  else if(S.calmAfter>d.burrowCalm-0.8){ const k=(S.calmAfter-(d.burrowCalm-0.8))/0.8; dy-=k*3; U.heart.rotation.z=Math.sin(T*20)*0.06*k; }
  return dy; }
/* the grazer: grazes with its head down and its jaw chewing, lifts its head and pricks its ears when something walks near,
   twitches an ear now and then, and gallops (front legs together, then the back ones, the body rocking) when it flees */
function v3PoseGrazer(e,U,T,mv){
  const flee=e.fleeT>0;
  if(U.alertT==null||T>U.alertT){ U.alertT=T+0.4; U.alert=G.ents.some(o=>!o.dead&&o.kind==='unit'&&o.faction!=='wild'&&o.faction!=='none'&&Math.abs(o.x-e.x)<5*TILE&&Math.abs(o.y-e.y)<5*TILE); }
  const up=flee||U.alert, graze=!up&&!mv&&Math.sin(T*0.3+e.id*1.7)>-0.3, nw=up?-0.95:graze?0.55:-0.6, hw=graze?1.0:0.6;
  U.neck.rotation.x+=(nw-U.neck.rotation.x)*0.06; U.head.rotation.x+=(hw-U.head.rotation.x)*0.06;
  U.jaw.rotation.x=graze&&U.neck.rotation.x>0.3?Math.max(0,Math.sin(T*7+e.id))*0.35:0;
  U.ears.forEach((r,i)=>{ const s=-Math.sign(r.userData.bz), tw=Math.sin(T*1.3+e.id*3+i*2)>0.97?0.5:0; r.rotation.z=r.userData.bz+s*((up?0.7:0)+tw); });
  if(flee&&mv){ const p=T*16+e.id; U.legs.forEach((l,i)=>{ l.rotation.x=(l.userData.bx||0)+(i<2?1:-1)*Math.sin(p)*0.75; l.userData.knee.rotation.x=Math.max(0,Math.sin(p+(i<2?0:Math.PI)))*0.8; }); U.torso.rotation.x=Math.sin(p)*0.08; }
  else U.torso.rotation.x*=0.85; }
/* ---------- a hive's death in 3D: the last scream (HIVE_DEATH in 25-hive-life.js), the same story as drawHiveDeath in 2D ----------
   While it screams the hive shakes harder and harder, its heart races and green shriek rings fly out over the ground; the last of
   its brood scuttles away in every direction (only a picture). Then it caves in: it flattens, spreads and goes dark, a dark scar
   stays on the ground, dirt flies (the 'ember' fx) and smoke plumes rise until the end (drawn with the other fx in render3D).
   One model per G.fx entry (V3.dying), with its own materials so it can darken and fade; gone when the fx ends. */
const V3_DARK=typeof THREE!=='undefined'?new THREE.Color('#0a0b10'):null;
function v3HiveDeathModel(f){
  const g=new THREE.Group(), U=g.userData, own=U.own=[], D=HIVE_DEATH;
  const mine=m=>{ const c=m.clone(); if(m.onBeforeCompile) c.onBeforeCompile=m.onBeforeCompile; own.push(c); return c; };
  const hv=v3Building({ type:'hive', id:f.id||0, size:2 }); U.cols=[]; v3HiveHurt(hv,2); own.push(...hv.userData.own);   /* it dies in its worst look */
  hv.traverse(o=>{ if(o.isMesh){ o.material=mine(o.material); if(o.material.color) U.cols.push({ m:o.material, c:o.material.color.clone(), s:o.material.specular&&o.material.specular.clone() }); } });
  U.hive=hv; U.heart=hv.userData.heart; g.add(hv);
  const scarM=new THREE.MeshBasicMaterial({ color:0x0a0b10, transparent:true, opacity:0.7, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }); own.push(scarM);
  U.scar=new THREE.Mesh(GEO.disc,scarM); U.scar.position.y=0.2;   /* above the bulge of the mycel */ U.scar.renderOrder=1; g.add(U.scar);
  U.rings=[]; for(let i=0;i<Math.max(1,D.rings);i++){ const m=new THREE.MeshBasicMaterial({ color:0xa6ff4a, transparent:true, depthWrite:false, side:THREE.DoubleSide }); own.push(m);
    const r=new THREE.Mesh(GEO.ring,m); r.renderOrder=2; g.add(r); U.rings.push(r); }
  U.brood=[]; for(let i=0;i<Math.max(0,D.brood);i++){   /* a little scuttler: dark shell, purple head, four legs */
    const bm=v3Fogify(new THREE.MeshPhongMaterial({ color:'#1a1420', specular:0x8a7aa0, shininess:60, transparent:true })), hm=v3Fogify(new THREE.MeshLambertMaterial({ color:'#7a5a8e', transparent:true })); own.push(bm,hm);
    const c=grp(); c.add(ball(bm,0.12,0.07,0.15,0,0.09,0)); c.add(ball(hm,0.06,0.05,0.06,0,0.1,0.15)); c.userData.legs=[];
    for(let k=0;k<4;k++){ const l=limb(bm,0.025,0.11,(k%2?1:-1)*0.1,0.1,k<2?0.06:-0.06); l.rotation.z=(k%2?1:-1)*0.9; c.add(l); c.userData.legs.push(l); }
    c.userData.mats=[bm,hm]; g.add(c); U.brood.push(c); }
  return g; }
function v3HiveDeathPose(f,g,T){ const D=HIVE_DEATH, tt=f.max-f.t, U=g.userData, x=f.x/TILE, z=f.y/TILE, gy=v3H(x,z);
  g.visible=!!G.seen[Math.floor(f.y/TILE)*G.map.w+Math.floor(f.x/TILE)]; if(!g.visible) return;
  g.position.set(x,gy,z);
  const scream=tt<D.scream, fall=clamp((tt-D.scream)/Math.max(0.01,D.fall),0,1), hv=U.hive;
  hv.visible=tt<D.scream+D.fall+0.2;
  if(hv.visible){ const sh=scream?Math.min(5,tt*2.8):0, k=Math.floor(tt*30);   /* shaking harder and harder, as in 2D (pixels → tiles) */
    hv.position.set((hdRnd(f.seed+k)-0.5)*sh*0.035,0,(hdRnd(f.seed+k+50)-0.5)*sh*0.035);
    const wob=scream?Math.sin(tt*30):0, wide=(1+0.2*fall)*(1+0.04*wob); hv.scale.set(wide,(1-0.8*fall)*(1+0.06*wob),wide);
    const dark=Math.min(0.75,tt/D.scream*0.25+fall*0.55); for(const c of U.cols){ c.m.color.copy(c.c).lerp(V3_DARK,dark); if(c.s) c.m.specular.copy(c.s).multiplyScalar(Math.max(0,1-dark*1.8)); }   /* no wet shine left on a dead hive */
    if(U.heart) U.heart.scale.setScalar(0.3*(scream?1+0.5*Math.pow(Math.max(0,Math.sin(tt*24)),2)+tt*0.15:1-0.6*fall)); }   /* the heart races, then gives out */
  U.scar.visible=tt>=D.scream; if(U.scar.visible){ const r=0.7+0.6*fall; U.scar.scale.set(r*1.3,1,r); U.scar.material.opacity=0.7*Math.min(1,f.t/0.4); }
  U.rings.forEach((r,w)=>{ const t=tt-w*0.5; r.visible=scream&&t>=0&&t<=0.8; if(!r.visible) return; const R=(16+t*130)/TILE; r.scale.set(R,1,R); r.position.y=0.3+t*0.4; r.material.opacity=1-t/0.8; });
  U.brood.forEach((c,n)=>{ const t=tt-0.3-n*0.18; c.visible=t>=0&&t<=2.6; if(!c.visible) return;
    const a=hdRnd(f.seed+n+20)*Math.PI*2, d=(24+t*95)/TILE, bx=Math.cos(a)*d, bz=Math.sin(a)*d;
    c.position.set(bx,v3H(x+bx,z+bz)-gy+Math.abs(Math.sin(tt*24+n))*0.02,bz); c.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));
    const leg=Math.floor(tt*12+n)%2; c.userData.legs.forEach((l,i)=>l.rotation.x=((i+leg)%2?0.6:-0.6));
    const op=Math.min(1,(2.6-t)*2); for(const m of c.userData.mats) m.opacity=op; }); }
function v3HiveDeaths(T){ const live=new Set();
  for(const f of G.fx){ if(f.k!=='hivedeath') continue; live.add(f); let g=V3.dying.get(f); if(!g){ g=v3HiveDeathModel(f); V3.dying.set(f,g); V3.g.add(g); } v3HiveDeathPose(f,g,T); }
  for(const [f,g] of V3.dying) if(!live.has(f)){ V3.g.remove(g); for(const m of g.userData.own) m.dispose(); V3.dying.delete(f); } }
/* Helmet lamps on one spot must not add up to a glare. n = how many lamps light this spot (a lamp counts less the farther its spot is,
   gone at lampOverlap tiles). Together they give 1 + (n-1)×lampStack lamps' worth, at most lampStackMax lamps (3 = full), shared out over them. */
function lampTotal(n){ const V=VIEW3D; return 1+(Math.min(n,V.lampStackMax)-1)*V.lampStack; }
function v3LampShare(ls){ const R=VIEW3D.lampOverlap;
  for(const l of ls){ let n=0; for(const o of ls){ const d=Math.hypot(o.x-l.x,o.z-l.z); if(d<R) n+=1-d/R; }
    const k=lampTotal(Math.max(1,n))/Math.max(1,n); l.i*=k; if(l.U) l.U.lampShare=k; } }
/* ---------- the moon's own weather in 3D (Nov 2026): meteorites and dust devils ----------
   The 2D sim makes them (meteorTick / devilTick in 25b); here they get a real shape.
   Meteorite: a glowing stone comes in at a slant, with a white-to-ice-blue streak and a thin smoke trail, lights the ground,
   hits with a flash, a ring of dust, stones that hang in the low gravity and a small crater that glows and cools (the scar is the 2D decal).
   Dust devil: a turning funnel of dust, thin at the foot and wide at the top, with a collar of dust and grit that is sucked up and thrown out. */
const AMBIENT3D = {
  meteorHigh:9, meteorSlant:6, meteorSize:0.17, meteorTrail:18, meteorRocks:12, meteorLight:3, craterGlow:2.5, meteorLife:4.5, meteorGravity:2.2,   /* tiles, seconds; tiles/s² (stones hang in the low gravity) */
  devilHigh:2.8, devilWide:1.0, devilPuffs:18, devilGrit:12, devilLean:0.45
};
function v3Ambient(now,put,lights){ const A=AMBIENT3D; V3.meteors=V3.meteors||new Map();
  const dt=Math.max(0,Math.min(0.1,G.time-(V3.ambT??G.time))); V3.ambT=G.time;   /* game time: stands still in a pause, runs with the game speed */
  for(const f of G.fx) if(f.k==='meteor'&&!V3.meteors.has(f)) V3.meteors.set(f,{ f, t0:G.time-(f.max-f.t), ang:Math.random()*Math.PI*2, spin:new THREE.Vector3(rand(-9,9),rand(-9,9),rand(-9,9)) });
  for(const [f,M] of V3.meteors){ M.tt=G.time-M.t0;
    if(M.tt>A.meteorLife){ v3MeteorDone(M); V3.meteors.delete(f); continue; }
    v3Meteor(M,now,dt,put,lights); }
  V3.put=put; v3Devils(); }
const METEOR_HIT=0.55;   /* seconds of the fall, as in 2D (meteorFx) */
function v3MeteorDone(M){ if(M.g){ V3.fxg.remove(M.g); } }
function v3Meteor(M,now,dt,put,lights){ const A=AMBIENT3D, f=M.f, ix=f.x/TILE, iz=f.y/TILE, gy=v3H(ix,iz);
  if(!G.seen[Math.floor(f.y/TILE)*G.map.w+Math.floor(f.x/TILE)]){ if(M.g) M.g.visible=false; return; }
  if(!M.g){ const g=M.g=new THREE.Group(); V3.fxg.add(g);
    M.head=new THREE.Mesh(GEO.lowball,glow('#fff1d6')); M.head.scale.set(A.meteorSize,A.meteorSize*0.8,A.meteorSize*1.2); g.add(M.head);
    M.ring=new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ color:0xb9ad98, transparent:true, depthWrite:false })); M.ring.visible=false; g.add(M.ring);
    M.glow=new THREE.Mesh(GEO.disc,new THREE.MeshBasicMaterial({ color:0xff5a10, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); M.glow.visible=false; g.add(M.glow);
    M.rim=new THREE.Mesh(GEO.torus,mat('#4e4234')); M.rim.visible=false; M.rim.receiveShadow=true; g.add(M.rim);
    M.rocks=[]; }
  M.g.visible=true; const tt=M.tt, dx=Math.cos(M.ang)*A.meteorSlant, dz=Math.sin(M.ang)*A.meteorSlant;
  const at=k=>({ x:ix+dx*(1-k), y:gy+A.meteorHigh*(1-k), z:iz+dz*(1-k) });
  if(tt<METEOR_HIT){ const k=tt/METEOR_HIT, p=at(k);
    M.head.visible=true; M.head.position.set(p.x,p.y,p.z); M.head.rotation.x+=M.spin.x*dt; M.head.rotation.y+=M.spin.y*dt; M.head.rotation.z+=M.spin.z*dt;
    put(p.x,p.y,p.z,0.75,'#ffb347',0.8); put(p.x,p.y,p.z,0.35,'#ffffff',1);
    const N=A.meteorTrail; for(let i=1;i<=N;i++){ const ki=k-i*0.022; if(ki<0) break; const q=at(ki), w=1-i/N;
      put(q.x,q.y,q.z,0.08+0.3*w,i<3?'#ffffff':i<6?'#ffe2a8':'#7ff6ff',w*0.9); }
    if(Math.random()<0.6) V3.smoke.push({ x:p.x, y:p.y, z:p.z, t:0, sz:0.14, col:'#a7a4a8', a:0.22, rise:0.2 });   /* a thin trail of smoke hangs behind it */
    lights.push({ x:p.x, y:p.y, z:p.z, i:0.6+1.6*k, c:0xffc080, d:4+3*k });
    return; }
  /* the hit */
  const h=tt-METEOR_HIT; M.head.visible=false;
  if(!M.hit){ M.hit=true; const n=A.meteorRocks;
    for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, sp=rand(0.5,1.7), m=new THREE.Mesh(GEO.lowball,mat(pick(['#6a5a48','#8a7a6a','#4e4034','#b0a28a'])));
      const s=rand(0.035,0.08); m.scale.set(s,s*0.8,s); m.castShadow=true; m.position.set(ix,gy+0.05,iz); M.g.add(m);
      M.rocks.push({ m, vx:Math.cos(a)*sp, vy:rand(1.2,2.6), vz:Math.sin(a)*sp, r:rand(-8,8), rest:false }); }
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; V3.smoke.push({ x:ix+Math.cos(a)*0.3, y:gy+0.1, z:iz+Math.sin(a)*0.3, t:0, sz:0.55, col:'#8a8276' }); } }
  const G3=A.meteorGravity;
  for(const r of M.rocks){ if(r.rest) continue; r.vy-=G3*dt; r.m.position.x+=r.vx*dt; r.m.position.y+=r.vy*dt; r.m.position.z+=r.vz*dt; r.m.rotation.x+=r.r*dt; r.m.rotation.z+=r.r*0.7*dt;
    const gh=v3H(r.m.position.x,r.m.position.z); if(r.m.position.y<=gh+0.02&&r.vy<0){ r.m.position.y=gh+0.02; r.rest=true; } }
  const fadeOut=Math.min(1,(A.meteorLife-tt)/0.8);
  for(const r of M.rocks) r.m.scale.y=r.m.scale.x*0.8*fadeOut+0.0001;
  if(h<0.25) put(ix,gy+0.5,iz,2.4*(1-h/0.25)+0.4,'#fff3c4',1-h/0.25);   /* the flash */
  if(h<0.5) lights.push({ x:ix, y:gy+0.8, z:iz, i:A.meteorLight*(1-h/0.5), c:0xffb070, d:7 });
  const rk=Math.min(1,h/1.1); M.ring.visible=rk<1; M.ring.scale.set(0.3+2.2*rk,1,0.3+2.2*rk); M.ring.position.set(ix,gy+0.06,iz); M.ring.material.opacity=0.55*(1-rk);
  for(let i=0;i<8&&h<1.6;i++){ const a=i/8*Math.PI*2+M.ang, d=0.3+1.6*Math.min(1,h/1.2); put(ix+Math.cos(a)*d,gy+0.2+h*0.25,iz+Math.sin(a)*d,0.5+h*0.6,'#9a9080',0.4*(1-h/1.6),true); }
  const cg=Math.max(0,1-h/A.craterGlow); M.glow.visible=cg>0; M.glow.scale.setScalar(0.32); M.glow.position.set(ix,gy+0.05,iz); M.glow.material.opacity=0.9*cg*(0.85+0.15*Math.sin(now/70));
  if(cg>0.05) put(ix,gy+0.15,iz,0.6,'#ff7a2a',0.5*cg);
  M.rim.visible=true; M.rim.scale.set(0.38,0.3*fadeOut+0.001,0.38); M.rim.position.set(ix,gy+0.01,iz); }
function devilPos(f){ const tt=f.max-f.t; return { x:f.x+tt*f.vx, y:f.y-Math.sin(tt*0.9+f.seed)*10, tt }; }   /* same as drawDevil (25b) */
/* the funnel itself: two open cones of streaky, turning dust (a shader), the axis bent so the top sways and lags */
function v3DevilMesh(){ const geo=new THREE.CylinderGeometry(1,0.12,1,28,10,true).translate(0,0.5,0), g=new THREE.Group(), U={ time:{value:0}, fade:{value:1}, lean:{value:new THREE.Vector2()}, H:{value:1}, W:{value:1} };
  const mk=(k,col,sp,op)=>{ const m=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, side:THREE.DoubleSide,
      uniforms:{ ...U, col:{value:new THREE.Color(col)}, sp:{value:sp}, op:{value:op}, k:{value:k} },
      vertexShader:`uniform vec2 lean; uniform float H, W, k; varying float vh; varying float va; varying vec3 vn; varying vec3 vw;
        void main(){ vec3 p=position; vh=p.y; va=atan(p.z,p.x); float h=p.y; p.xz*=W*k; p.y*=H; p.x+=lean.x*h+lean.y*h*h; p.z+=0.15*sin(h*5.0+va)*h;
          vec4 w=modelMatrix*vec4(p,1.0); vw=w.xyz; vn=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform float time, fade, sp, op; uniform vec3 col; varying float vh; varying float va; varying vec3 vn; varying vec3 vw;
        float hs(vec2 q){ return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453); }
        float n2(vec2 q){ vec2 i=floor(q), f=fract(q); f=f*f*(3.0-2.0*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
        void main(){ float a=va/6.2831853, t=time*sp;
          float s=n2(vec2(a*7.0+t*(1.6-vh*0.7)-vh*2.5, vh*3.0-time*0.8))*0.65+n2(vec2(a*17.0+t*2.2-vh*5.0, vh*7.0-time*1.4))*0.35;
          float streak=smoothstep(0.3,0.8,s);
          float edge=pow(1.0-abs(dot(normalize(cameraPosition-vw),vn)),0.6);   /* thicker where you look along its side */
          float alpha=streak*(0.35+0.65*edge)*smoothstep(0.0,0.12,vh)*(1.0-smoothstep(0.65,1.0,vh))*op*fade;
          gl_FragColor=vec4(col*(0.8+0.3*s),alpha); }` });
    const o=new THREE.Mesh(geo,m); o.frustumCulled=false; o.renderOrder=3; return o; };
  g.add(mk(1.0,'#d2c2a2',7.0,1.0)); g.add(mk(0.7,'#a8977c',9.5,0.85));
  g.userData={ U, geo }; V3.fxg.add(g); return g; }
function v3Devils(){ V3.devils=V3.devils||new Map(); const live=new Set();
  for(const f of G.fx) if(f.k==='devil'){ live.add(f); v3Devil(f); }
  for(const [f,g] of V3.devils) if(!live.has(f)){ V3.fxg.remove(g); g.userData.geo.dispose(); g.children.forEach(o=>o.material.dispose()); V3.devils.delete(f); } }
function v3Devil(f){ const put=V3.put, A=AMBIENT3D, P=devilPos(f), tt=P.tt, cx=P.x/TILE, cz=P.y/TILE;
  let M=V3.devils.get(f); if(!M){ M=v3DevilMesh(); V3.devils.set(f,M); }
  if(!G.seen[Math.floor(P.y/TILE)*G.map.w+Math.floor(P.x/TILE)]){ M.visible=false; return; } M.visible=true;
  const gy=v3H(cx,cz), grow=Math.min(1,tt/1.2), die=Math.min(1,f.t/1.2), fade=Math.min(grow,die), H=A.devilHigh*(0.35+0.65*grow)*(0.6+0.4*die), W=A.devilWide*(1+(1-die)*0.8);
  const dir=Math.sign(f.vx||1), lean=t=>Math.sin(tt*1.3+f.seed)*A.devilLean*t-dir*t*t*0.35;   /* the top sways and lags behind the foot */
  { const U=M.userData.U, sw=Math.sin(tt*1.3+f.seed)*A.devilLean; M.position.set(cx,gy,cz); U.time.value=tt; U.fade.value=fade; U.H.value=H; U.W.value=W; U.lean.value.set(sw,-dir*0.35); }
  const N=A.devilPuffs; for(let i=0;i<N;i++){ const h=i/N, a=tt*(9-h*4)+i*2.39, r=0.08+Math.pow(h,1.4)*W, x=cx+lean(h)+Math.cos(a)*r, z=cz+Math.sin(a)*r*0.9;
    put(x,gy+0.1+h*H,z,0.2+h*0.45,i%3?'#b8a68a':'#d6c6a8',(0.45-h*0.3)*fade,true); }
  for(let i=0;i<7;i++){ const a=-tt*5+i*0.9, r=0.4+0.25*Math.sin(tt*3+i); put(cx+Math.cos(a)*r,gy+0.15,cz+Math.sin(a)*r,0.7,'#bfae92',0.5*fade,true); }   /* the collar of dust at its foot */
  const n=A.devilGrit; for(let j=0;j<n;j++){ const p=(tt*0.55+j/n)%1, a=tt*12+j*1.9, out=Math.max(0,p-0.82)/0.18, r=0.1+p*W*0.7+out*1.4;
    put(cx+lean(p)+Math.cos(a)*r,gy+0.08+p*H*0.9-out*out*H*0.7,cz+Math.sin(a)*r,0.07,'#3e352c',0.9*fade*(1-out*0.6),true); } }   /* grit sucked up, thrown out at the top */
function render3D(now){
  if(V3.forG!==G||V3.mapId!==G.map.id) v3Reset();
  const dt=clamp((now-(V3.last||now))/1000,0,0.1); V3.last=now;
  v3Size(); v3Camera(dt); paintFog(); v3Fog(); V3.frame++; V3.u.time.value=now/1000;
  const T=now/1000, sel=new Set(G.sel), lights=[];
  for(const e of G.ents){ if(!v3Shown(e)) continue;
    let g=V3.objs.get(e); if(!g){ g=v3Model(e); V3.objs.set(e,g); V3.g.add(g); if(e.faction===G.side&&e.kind==='unit') g.traverse(o=>{ if(!o.userData.noXray) o.layers.set(1); }); }
    if(g.userData.memb&&(V3.frame+e.id)%20===0&&v3MembKey(e)!==g.userData.nkey){ V3.g.remove(g); for(const o of g.userData.own||[]) o.dispose(); g=v3Model(e); V3.objs.set(e,g); V3.g.add(g); }   /* a neighbour died: grow anew */
    g.visible=true; g.userData.f=V3.frame; v3Pose(e,g,T);
    if(e.kind==='unit'&&G.mission.dark&&e.faction===G.side&&e.def.bio&&!e.downed) lights.push({x:g.position.x+Math.sin(g.userData.yaw)*1.4,y:g.position.y+1.1,z:g.position.z+Math.cos(g.userData.yaw)*1.4,i:VIEW3D.lamp,c:0xe4ecff,d:7,lamp:1,U:g.userData});
    if(e.kind==='building'&&e.def.generator&&e.powered) lights.push({x:g.position.x,y:g.position.y+1.7,z:g.position.z,i:VIEW3D.genLight*(0.92+0.08*Math.sin(now/90+e.id)),c:0xffd690,d:(e.def.light||8)*1.1}); }
  for(const [e,g] of V3.objs){ if(g.userData.f!==V3.frame){ g.visible=false; if(e.dead||V3.frame-g.userData.f>600){ V3.g.remove(g); for(const o of g.userData.own||[]) o.dispose(); V3.objs.delete(e); } } }
  v3HiveDeaths(T);
  /* selection rings */
  let n=0; const ring=pool(V3.ringPool,()=>{ const r=new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ transparent:true, opacity:0.9, depthWrite:false })); r.renderOrder=2; return r; });
  for(const e of sel){ if(e.dead||!v3Shown(e)||e.def&&e.def.ground) continue; const r=ring(n++), rad=e.kind==='building'?(e.size||1)*0.72:(e.r/TILE)*1.5+0.12, x=e.x/TILE, z=e.y/TILE;
    r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.04,z); r.material.color.set(e.faction===G.side?'#5fe3b0':'#ff5a4f'); }
  hidePool(V3.ringPool,n);
  n=0; const ping=pool(V3.pingPool,()=>new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false })));
  for(const p of G.pings){ const r=ping(n++), rad=(10+p.t*28)/TILE, x=p.x/TILE, z=p.y/TILE; r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set(p.col); r.material.opacity=Math.max(0,1-p.t/3); }
  for(const f of G.fx){ if(f.k!=='order') continue; const k=1-f.t/f.max, r=ping(n++), rad=(6+k*22)/TILE, x=f.x/TILE, z=f.y/TILE; r.scale.set(rad,1,rad); r.position.set(x,v3H(x,z)+0.06,z); r.material.color.set('rgb('+f.col+')'); r.material.opacity=1-k; }
  hidePool(V3.pingPool,n);
  n=0; const shot=pool(V3.shotPool,()=>new THREE.Mesh(GEO.ball,new THREE.MeshBasicMaterial({ color:0x4fae22 })));
  for(const s of G.shots){ if(s.t<0) continue; const t=s.t/s.dur, x=(s.sx+(s.tx-s.sx)*t)/TILE, z=(s.sy+(s.ty-s.sy)*t)/TILE, egg=s.k==='egglob'||s.k==='broodlob', arc=s.k==='plasma'?0:Math.sin(t*Math.PI)*(egg?2.2:1.3);
    const o=shot(n++); o.position.set(x,v3H(x,z)+0.6+arc,z); o.material.color.set(s.k==='plasma'?'#7ff6ff':s.k==='grenade'?'#3a4150':egg?'#6d5a3e':'#a6ff4a'); o.scale.setScalar(egg?0.14:s.k==='grenade'?0.08:0.09); }
  hidePool(V3.shotPool,n);
  /* effects in the air */
  let nt=0; const P=V3.tracerPos, Cc=V3.tracerCol; n=0; const fx=pool(V3.fxPool,v3Sprite);
  let cap=400; const put=(x,y,z,sz,col,a,normal)=>{ if(n>=cap) return; const s=fx(n++); s.material.blending=normal?THREE.NormalBlending:THREE.AdditiveBlending; s.position.set(x,y,z); s.scale.setScalar(sz); s.material.color.set(col); s.material.opacity=a; };
  for(const f of G.fx){ const a=Math.max(0,f.t/f.max);
    if(f.k==='tracer'&&nt<400){ const x1=f.x1/TILE, z1=f.y1/TILE, x2=f.x2/TILE, z2=f.y2/TILE, c=new THREE.Color('#ffe2a8').multiplyScalar(a);
      P.set([x1,v3H(x1,z1)+0.6,z1,x2,v3H(x2,z2)+0.5,z2],nt*6); Cc.set([c.r,c.g,c.b,c.r,c.g,c.b],nt*6); nt++; continue; }
    if(f.x==null||f.wr) continue; const x=f.x/TILE, z=f.y/TILE, gy=v3H(x,z);
    switch(f.k){
      case 'flash': put(x,gy+0.6,z,0.4,'#fff3c4',1); break;
      case 'spark': case 'ember': put(x,gy+0.35+(1-a)*0.5,z,0.13,f.col||'#ffb347',a); break;
      case 'flame': put(x,gy+0.35+(1-a)*0.6,z,0.28+(1-a)*0.5,a>0.6?'#ffe08a':a>0.3?'#ff8a2a':'#783214',a); break;
      case 'boom': put(x,gy+0.45,z,(f.r/TILE)*2.2*(1-a*0.6),f.col||'#ffa03c',a*0.9); break;
      case 'dust': put(x,gy+0.3+(f.lift?(1-a)*f.lift:0),z,(f.r0+(1-a)*f.r1)/TILE*2,f.col||'#777',a*(f.lift?0.5:0.35),true); break;   /* f.lift: dust whipped up by a dust devil rises */
      case 'hivedeath': { const D=HIVE_DEATH, tt=f.max-f.t; if(!G.seen[Math.floor(f.y/TILE)*G.map.w+Math.floor(f.x/TILE)]) break;
        if(tt<D.scream) put(x,gy+1.1,z,1.4+0.5*Math.abs(Math.sin(tt*24)),'#a6ff4a',0.25+0.2*tt/D.scream);   /* the heart's glow while it screams */
        for(let k=0;k<D.smoke;k++){ const t=tt-0.3-k*0.22; if(t<0||t>2.2) continue;   /* smoke plumes, as in 2D */
          put(x+((hdRnd(f.seed+k)-0.5)*56+Math.sin(t*3+k)*5)/TILE,gy+0.3+t*46/TILE,z+(hdRnd(f.seed+k+40)-0.5)*40/TILE,(4+t*9)*4.5/TILE,'#34323a',Math.max(0,0.8-t*0.3),true);   /* darker than in 2D: the 3D ground is lighter */ }
        break; }
      case 'mlight': put(x,gy+0.6,z,1.0,'#ffd690',a*0.5); break;
      case 'slash': put(x,gy+0.6,z,0.5,'#ffffff',a*0.8); break; } }
  for(let i=nt*6;i<(V3.lastNt||0)*6;i++){ P[i]=0; Cc[i]=0; } V3.lastNt=nt;
  V3.tracers.geometry.setDrawRange(0,nt*2); V3.tracers.geometry.attributes.position.needsUpdate=true; V3.tracers.geometry.attributes.color.needsUpdate=true;
  /* on units: burning, acid, a Spitter winding up, the heal beam */
  for(const [e,g] of V3.objs){ if(!g.visible||e.kind!=='unit') continue; const p=g.position, top=g.userData.top;
    if(e.burnT>0) for(let i=0;i<2;i++) put(p.x+rand(-0.15,0.15),p.y+rand(0.2,top),p.z+rand(-0.15,0.15),rand(0.15,0.3),Math.random()<0.5?'#ff8a2a':'#ffe08a',0.8);
    if(e.acidT>0) put(p.x+rand(-0.15,0.15),p.y+rand(0.2,top*0.8),p.z+rand(-0.15,0.15),0.14,'#a6ff4a',0.7);
    if(e.chargeT>0) put(p.x+Math.sin(g.userData.yaw)*0.35,p.y+top*0.75,p.z+Math.cos(g.userData.yaw)*0.35,0.25+0.15*Math.sin(now/40),'#c7f05a',0.9);
    if(e.beam&&!e.beam.dead){ const b=V3.objs.get(e.beam); if(b) for(let k=1;k<6;k++){ const t=((k/6)+now/900)%1; put(p.x+(b.position.x-p.x)*t,p.y+0.6+(b.position.y-p.y)*t,p.z+(b.position.z-p.z)*t,0.12,'#78ffbe',0.8); } } }
  for(const [e,g] of V3.objs) if(g.visible&&g.userData.opening>0){ const p=g.userData.opening; for(let i=0;i<3;i++){ const d=(now/900+i/3+e.id*0.13)%1, a=i*2.4+now/700; put(g.position.x+Math.cos(a)*d*0.4*p,g.position.y+0.4+d*0.8*p,g.position.z+Math.sin(a)*d*0.4*p,0.1,i%2?'#a6ff4a':'#c58cff',(1-d)*0.9); } }   /* an egg breathing out spores */
  v3WreckFx(now,dt,put,lights); v3SentryFx(now,dt,put,lights);
  for(const s of V3.smoke){ const k=s.t/(s.life||2.5), z=s.sz||1, up=s.rise??1.8; put(s.x+k*0.6*z,s.y+k*up*z,s.z,(0.4+k*1.2)*z,s.col||'#3a3a3a',(s.a??0.5)*(1-k),true); }   /* s.a, s.rise: a faint trail that hangs (a meteorite's) */   /* s.sz, s.col: small puffs (a Brute's breath, a band breaking off) */
  V3.smoke=V3.smoke.filter(s=>(s.t+=dt)<(s.life||2.5));   /* s.life: a wreck's plumes hang longer */
  for(const mk of G.markers){ const x=mk.x/TILE, z=mk.y/TILE; put(x,v3H(x,z)+2+Math.sin(now/250)*0.1,z,0.7,mk.col||'#ffb347',0.9); }
  for(const f of G.flareList||[]) if(flareLit(f)){ const x=f.x/TILE, z=f.y/TILE; put(x,v3H(x,z)+0.3,z,1.2,'#ff6040',0.8); }
  v3Ships(now,lights,put); cap=n+140; v3Ambient(now,put,lights);   /* the meteorite and dust devil always get their own room */
  hidePool(V3.fxPool,n);
  for(const f of G.flareList||[]) if(flareLit(f)){ const x=f.x/TILE, z=f.y/TILE; lights.push({x,y:v3H(x,z)+0.6,z,i:2,c:0xff6a50,d:(SQUAD.flare.light||6)*1.1}); }
  const near=l=>Math.hypot(l.x-V3.look.x,l.z-V3.look.z); lights.sort((a,b)=>near(a)-near(b));
  let lampsUsed=0; const use=lights.filter(l=>!l.lamp||lampsUsed++<VIEW3D.lamps);
  v3LampShare(lights.filter(l=>l.lamp));
  V3.lights.forEach((l,i)=>{ const L=use[i]; if(L){ l.position.set(L.x,L.y,L.z); l.intensity=L.i; l.color.setHex(L.c); l.distance=L.d; } else l.intensity=0; });
  if(ui.placing){ const d=BUILDINGS[ui.placing.type], s=placementSpot(), cx=s.tx+d.size/2, cz=s.ty+d.size/2; V3.ghost.visible=true; V3.ghost.scale.set(d.size,0.9,d.size); V3.ghost.position.set(cx,v3H(cx,cz)+0.45,cz); V3.ghost.material.color.set(s.ok?'#5fe3b0':'#ff5a4f'); }
  else V3.ghost.visible=false;
  v3GroundLayer(now);
  /* draw: 1. everything; 2. the depth of the ground and buildings alone; 3. your own soldiers in outline where that stands in front of them (xray) */
  const R=V3.r, C=V3.cam; R.autoClear=true; C.layers.set(0); C.layers.enable(1); R.render(V3.scene,C);
  MAT.xray.opacity=VIEW3D.xray;
  if(VIEW3D.xray>0){ R.autoClear=false; R.shadowMap.autoUpdate=false; V3.fxg.visible=false;
    R.clearDepth(); V3.scene.overrideMaterial=MAT.depth; C.layers.set(0); R.render(V3.scene,C);
    V3.scene.overrideMaterial=MAT.xray; C.layers.set(1); R.render(V3.scene,C);
    V3.scene.overrideMaterial=null; V3.fxg.visible=true; R.shadowMap.autoUpdate=true; R.autoClear=true; }
  v3Overlay(now);
}
/* The ground animations of the 2D view (footprints, drag trails, casings, acid pools, burning ground, decals, zones, capture rings, the
   building you are placing …) are drawn by the 2D code onto the game canvas, copied into a texture and laid on the 3D ground. */
const V3_GROUND_FX=new Set(['tendril','casing','melt','shock','stomp','landring','bulge','screech','shaftspit','helmet','topple']);
function v3GroundLayer(now){
  const on=VIEW3D.groundAnims; if(!on){ V3.u.decR.value.set(-1e4,-1e4,1,1); return; }
  const side=Math.max(ui.vw,ui.vh)+256, x0=G.cam.x+ui.vw/2-side/2, y0=G.cam.y+(ui.vh-ui.hudH)/2-side/2, W=cv.width, H=cv.height, sx=W/side, sy=H/side;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,H); ctx.setTransform(sx,0,0,sy,-x0*sx,-y0*sy); ctx.imageSmoothingEnabled=false;
  const vx0=x0, vy0=y0, vx1=x0+side, vy1=y0+side, inView=e=>e.x>vx0&&e.x<vx1&&e.y>vy0&&e.y<vy1;
  try{
    for(const d of G.decals){ if(!inView(d)) continue; ctx.fillStyle=d.col; for(let i=0;i<5;i++){ const a=d.seed+i*1.7, rr=d.r*(0.35+0.25*((i*37+d.seed)%1)); ctx.fillRect(Math.round(d.x+Math.cos(a)*d.r*0.5-rr/2),Math.round(d.y+Math.sin(a)*d.r*0.35-rr/3),Math.round(rr),Math.round(rr*0.66)); } }
    drawMycel(now,vx0,vy0,vx1,vy1); drawCreepLife(now,vx0,vy0,vx1,vy1); drawPools(now); drawDrags(); drawPrints(); drawFires(now);
    for(const e of G.ents){ if(e.dead||!e.def||!e.def.ground||!inView(e)) continue; if(e.wall){ drawTunnel(e,now); continue; } const a=ARTC[e.def.art]; if(a){ ctx.globalAlpha=0.9; ctx.drawImage(a,e.tx*TILE,e.ty*TILE,e.size*TILE,e.size*TILE); ctx.globalAlpha=1; }
      if(e.def.capture){ const r=e.size*TILE*0.62, col=e.state==='contested'?'#ff9a3c':e.owned?'#5fe3b0':e.state==='theirs'?'#ff5a4f':'#ffb347';
        ctx.lineWidth=5; ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.stroke(); ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(e.x,e.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(e.cap||0)); ctx.stroke(); }
      if(e.flight){ ctx.strokeStyle=`rgba(255,179,71,${0.4+0.4*Math.sin(now/150)})`; ctx.lineWidth=2; ctx.strokeRect(e.tx*TILE+2,e.ty*TILE+2,e.size*TILE-4,e.size*TILE-4); }
      if(G.sel.includes(e)){ ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=3; ctx.strokeRect(e.tx*TILE,e.ty*TILE,e.size*TILE,e.size*TILE); } }
    if(ui.placing&&BUILDINGS[ui.placing.type].needsSite) for(const s of G.map.sites){ ctx.strokeStyle='rgba(255,179,71,.75)'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.strokeRect(s.x*TILE+2,s.y*TILE+2,TILE*2-4,TILE*2-4); ctx.setLineDash([]); }
    for(const e of G.sel){ if(e.kind==='building'&&e.rally){ ctx.strokeStyle='rgba(95,227,176,.6)'; ctx.lineWidth=2; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.rally.x,e.rally.y); ctx.stroke(); ctx.setLineDash([]); } }
    const all=G.fx; G.fx=all.filter(f=>V3_GROUND_FX.has(f.k)); try{ drawFx(); } finally { G.fx=all; }
    if(G.side==='swarm'){ drawSwarmOrders(now); drawScorch(now); }
    drawPlacement(); for(const z of G.rings||[]) drawRing(z,now);
  }catch(err){ if(!V3.layerErr){ V3.layerErr=true; console.warn('3D ground layer:',err); } }
  ctx.setTransform(1,0,0,1,0,0);
  const dc=V3.decCtx; dc.clearRect(0,0,1024,1024); dc.drawImage(cv,0,0,W,H,0,0,1024,1024); V3.u.dec.value.needsUpdate=true;
  V3.u.decR.value.set(x0/TILE,y0/TILE,side/TILE,side/TILE); }
/* screen position of a world point (px, from the top-left of the window) */
const _v=typeof THREE!=='undefined'?new THREE.Vector3():null;
function v3Screen(wx,wy,up){ const x=wx/TILE, z=wy/TILE; _v.set(x,v3H(x,z)+(up||0),z).project(V3.cam); return { x:(_v.x+1)/2*V3.w, y:(1-_v.y)/2*V3.h, ok:_v.z<1&&_v.z>-1 }; }
/* the flat layer on top: health bars, rank marks, barks, labels, marker arrows, the drag box, the motion tracker */
function v3Overlay(now){
  ctx.setTransform(ui.dpr,0,0,ui.dpr,0,0); ctx.clearRect(0,0,ui.vw,ui.vh); ctx.imageSmoothingEnabled=false;
  ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center';
  const label=(txt,col,p)=>{ ctx.fillStyle='#000'; ctx.fillText(txt,p.x+1,p.y+1); ctx.fillStyle=col; ctx.fillText(txt,p.x,p.y); };
  for(const [e,g] of V3.objs){ if(!g.visible||e.kind==='crate'||e.kind==='body'||!e.maxHp||e.ospTunnel) continue;
    const crew=e.crew&&e.vet&&isRogue(), show=G.sel.includes(e)||e.hp<e.maxHp||(e.kind==='building'&&!e.built)||crew; if(!show||(e.def&&e.def.ground&&!G.sel.includes(e))) continue;
    const p=v3Screen(e.x,e.y,(g.userData.top||1)+0.25); if(!p.ok) continue; const w=e.kind==='building'?Math.min(70,(e.size||1)*26):26, x=Math.round(p.x-w/2), y=Math.round(p.y);
    ctx.fillStyle='#000'; ctx.fillRect(x-1,y-1,w+2,5); ctx.fillStyle='#3a1512'; ctx.fillRect(x,y,w,3);
    const f=clamp(e.hp/e.maxHp,0,1); ctx.fillStyle=e.faction!==G.side?'#ff5a4f':hpColor(f); ctx.fillRect(x,y,Math.round(w*f),3);
    if(e.kind==='building'&&!e.built){ ctx.fillStyle='#000'; ctx.fillRect(x-1,y+4,w+2,4); ctx.fillStyle='#ffb347'; ctx.fillRect(x,y+5,Math.round(w*(e.progress||0)),2); }
    if(e.type==='cocoon'){ ctx.fillStyle='#a6ff4a'; ctx.fillRect(x,y+4,Math.round(w*(1-e.hatchT/(e.hatchMax||BUILDINGS.cocoon.hatch))),2); }
    try{ if(crew) drawTaintBar(e,x,y,w,now); if(e.osprey) ospreyBarMark(e,x,y,w); }catch(err){} }
  for(const [e,g] of V3.objs){ if(!g.visible||e.kind!=='unit') continue; const p=v3Screen(e.x,e.y,(g.userData.top||1)+0.25); if(!p.ok) continue;
    if(e.vet&&e.vet.rank>0&&RANKS[e.vet.rank].mark) label(RANKS[e.vet.rank].mark,e.vet.rank>=5?'#ffd23f':'#e8ecf2',{x:p.x,y:p.y-4});
    if(e.vet&&e.vet.hero){ ctx.fillStyle='#000'; ctx.fillRect(Math.round(p.x)-3,p.y-21,7,7); ctx.fillStyle='#ffd23f'; ctx.fillRect(Math.round(p.x)-1,p.y-20,3,5); }
    if(G.sel.includes(e)){ if(e.order&&e.order.type==='hold'){ ctx.fillStyle='#ffb347'; ctx.fillRect(Math.round(p.x)-3,p.y+6,6,2); } if(e.stance==='attack'){ ctx.fillStyle='#ff5a4f'; ctx.fillRect(Math.round(p.x)-3,p.y+6,6,2); } if(e.quiet){ ctx.fillStyle='#9fd3ff'; ctx.fillRect(Math.round(p.x)-3,p.y+9,6,2); } } }
  for(const e of G.ents){ if(e.dead||!e.status) continue; const g=V3.objs.get(e); if(!g||!g.visible) continue; const p=v3Screen(e.x,e.y,(g.userData.top||1)+0.7); if(p.ok) label(e.status.txt,e.status.col,p); }
  for(const e of G.ents){ if(e.dead||!e.label||!e.def||!e.def.capture) continue; const p=v3Screen(e.x,e.y,0); if(p.ok) label(e.label.toUpperCase(),'#ffe2a8',{x:p.x,y:p.y+30}); }
  for(const f of G.fx){ if(f.k!=='text') continue; const a=Math.max(0,f.t/f.max), p=v3Screen(f.x,f.y,1+(1-a)*0.6); if(p.ok) label(f.txt,f.col,p); }
  /* barks: speech bubbles over the soldier's head */
  ctx.font='11px "Chakra Petch", sans-serif';
  for(const b of G.barks){ const u=b.u, g=V3.objs.get(u); if(!g||!g.visible) continue; const p=v3Screen(u.x,u.y,(g.userData.top||1)+0.55); if(!p.ok) continue;
    const y=Math.round(p.y), w=Math.ceil(ctx.measureText(b.text).width)+12, x=Math.round(p.x-w/2), a=Math.min(1,b.t/0.4);
    ctx.globalAlpha=a; ctx.fillStyle='rgba(10,12,18,.85)'; ctx.fillRect(x,y-13,w,18); ctx.fillStyle='#5fe3b0'; ctx.fillRect(x,y-13,2,18);
    ctx.beginPath(); ctx.moveTo(p.x-4,y+5); ctx.lineTo(p.x+4,y+5); ctx.lineTo(p.x,y+10); ctx.fillStyle='rgba(10,12,18,.85)'; ctx.fill();
    ctx.fillStyle='#e8ecf2'; ctx.fillText(b.text,p.x+1,y); ctx.globalAlpha=1; }
  ctx.font='10px Silkscreen, monospace';
  /* markers: a label over the spot, or an arrow at the screen edge when it is off screen */
  const top=48, bottom=ui.vh-ui.hudH-12;
  for(const mk of G.markers){ const p=v3Screen(mk.x,mk.y,2.5); if(p.ok&&p.x>0&&p.x<ui.vw&&p.y>top&&p.y<bottom){ label(mk.label.toUpperCase(),'#ffe2a8',p); continue; }
    const q=v3Screen(mk.x,mk.y,0), cx=ui.vw/2, cy=(top+bottom)/2; let dx=q.x-cx, dy=q.y-cy; if(!q.ok){ dx=-dx; dy=-dy; } const a=Math.atan2(dy,dx);
    const k=Math.min((ui.vw/2-30)/Math.abs(Math.cos(a)||1e-6),((bottom-top)/2-30)/Math.abs(Math.sin(a)||1e-6)), ax=cx+Math.cos(a)*k, ay=cy+Math.sin(a)*k;
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(a); ctx.fillStyle='#0a0b10'; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(-10,-12); ctx.lineTo(-10,12); ctx.fill();
    ctx.fillStyle=mk.col||'#ffb347'; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-7,-9); ctx.lineTo(-7,9); ctx.fill(); ctx.restore();
    label(mk.label.toUpperCase(),'#ffe2a8',{x:clamp(ax-Math.cos(a)*34,50,ui.vw-50),y:clamp(ay-Math.sin(a)*24,top+14,bottom-6)}); }
  if(ui.rdrag&&Math.hypot(ui.rdrag.x1-ui.rdrag.x0,ui.rdrag.y1-ui.rdrag.y0)>18){ const r=ui.rdrag; ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(r.x0,r.y0); ctx.lineTo(r.x1,r.y1); ctx.stroke();
    const d=Math.atan2(r.y1-r.y0,r.x1-r.x0); ctx.save(); ctx.translate(r.x1,r.y1); ctx.rotate(d); ctx.fillStyle='#5fe3b0'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-7); ctx.lineTo(-6,7); ctx.fill(); ctx.restore(); }
  if(ui.drag&&ui.drag.box){ const d=ui.drag, x=Math.min(d.x0,d.x1), y=Math.min(d.y0,d.y1), w=Math.abs(d.x1-d.x0), h=Math.abs(d.y1-d.y0);
    ctx.strokeStyle='#5fe3b0'; ctx.lineWidth=1; ctx.fillStyle='rgba(95,227,176,.08)'; ctx.fillRect(x,y,w,h); ctx.strokeRect(x+.5,y+.5,w,h); }
  const g=ctx.createRadialGradient(ui.vw/2,ui.vh/2,Math.min(ui.vw,ui.vh)*0.5,ui.vw/2,ui.vh/2,Math.max(ui.vw,ui.vh)*0.85); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.25)'); ctx.fillStyle=g; ctx.fillRect(0,0,ui.vw,ui.vh);
  try{ drawHurtEdge(); drawTracker(now); }catch(err){}
  if(G.paused&&!G.over&&$('#s-settings').hidden){ ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,ui.vw,ui.vh); }
}

/* ---------- switching, the camera controls, and the hooks into 2D drawing and input ---------- */
function v3Want(){ return !!(V3.on&&G&&(ui.mode==='game'||ui.mode==='pause'||ui.mode==='end')); }
function v3Active(){ return v3Want()&&V3.ok; }
function v3Label(){ const b=$('#btn-view'); if(b) b.textContent=V3.on?'3D':'2D'; for(const id of ['btn-turn-l','btn-turn-r']){ const t=$('#'+id); if(t){ t.style.display=''; t.style.visibility=V3.on?'':'hidden'; } }   /* hidden, not removed: the top bar keeps its places */ }
function toggleView3D(){
  if(!V3.on&&!v3Init()){ toast('3D view is not available in this browser (no WebGL).'); return; }
  const c=G?viewCenter():null; V3.on=!V3.on; store.set('hc-view3d',V3.on); v3Label(); if(G) centerOn(c.x,c.y);   /* the same spot stays in the middle */
  toast(V3.on?'3D view. Middle mouse turns the camera, the wheel or + and − zoom, F3 back to 2D.':'2D view.',true); }
function turnView3D(deg){ if(!v3Active()) return; V3.yaw=(V3.yaw+deg)%360; }
const render2D=render;
render=function(now){ const on=v3Want()&&v3Init();
  if(V3.r) V3.r.domElement.style.display=on?'block':'none';
  if(!on){ render2D(now); return; }
  render3D(now); };
/* in 3D the camera may look at any point of the map (the 2D limits keep a whole screen of map in view) */
const clampCam2D=clampCam;
clampCam=function(){ if(!v3Active()) return clampCam2D(); const W=G.map.w*TILE, H=G.map.h*TILE, vh=ui.vh-ui.hudH;
  G.cam.x=clamp(G.cam.x,-ui.vw/2,W-ui.vw/2); G.cam.y=clamp(G.cam.y,-vh/2,H-vh/2); };
/* edge scroll and arrow keys move along the turned camera */
const updateCamera2D=updateCamera;
updateCamera=function(dt){ if(!v3Active()||!V3.yawR||!G||!(ui.mode==='game'||ui.mode==='end'&&afterDefeat())) return updateCamera2D(dt);
  let vx=0, vy=0; const sp=760*dt, edge=10;
  if(ui.keys.ArrowLeft) vx-=sp; if(ui.keys.ArrowRight) vx+=sp; if(ui.keys.ArrowUp) vy-=sp; if(ui.keys.ArrowDown) vy+=sp;
  if(ui.mouse.inWin&&!ui.overDev&&!ui.drag&&!ui.pan&&!mmDrag&&!V3.rot&&matchMedia('(pointer:fine)').matches){ if(ui.mouse.x<edge) vx-=sp; if(ui.mouse.x>ui.vw-edge) vx+=sp; if(ui.mouse.y<edge) vy-=sp; if(ui.mouse.y>ui.vh-edge) vy+=sp; }
  if(!vx&&!vy) return updateCamera2D(dt);
  const a=V3.yawR; stopFollow(); G.cam.x+=vx*Math.cos(a)+vy*Math.sin(a); G.cam.y+=-vx*Math.sin(a)+vy*Math.cos(a); clampCam();
  const w=toWorld(ui.mouse.x,ui.mouse.y); ui.mouse.wx=w.x; ui.mouse.wy=w.y; };
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
/* middle mouse in 3D turns and tilts the camera (in 2D it pans, as before) */
window.addEventListener('pointerdown',e=>{ if(!v3Active()||e.button!==1||e.target!==cv) return; e.preventDefault(); e.stopPropagation(); V3.rot={ x:e.clientX, y:e.clientY, yaw:V3.yaw, pitch:VIEW3D.pitch }; },true);
window.addEventListener('pointermove',e=>{ const r=V3.rot; if(!r) return; V3.yaw=r.yaw-(e.clientX-r.x)*VIEW3D.turnSpeed; V3.yawR=V3.yaw*Math.PI/180; VIEW3D.pitch=clamp(r.pitch+(e.clientY-r.y)*VIEW3D.tiltSpeed,VIEW3D.minPitch,VIEW3D.maxPitch); });
/* box select and right-drag facing in 3D (these run before the 2D handler, which then finds nothing left to do) */
window.addEventListener('pointerup',e=>{ if(V3.rot){ V3.rot=null; return; } if(!v3Active()||!G||ui.mode!=='game') return;
  const r=ui.rdrag; if(r&&Math.hypot(r.x1-r.x0,r.y1-r.y0)>18){ ui.rdrag=null; const a=toWorld(r.x0,r.y0), b=toWorld(r.x1,r.y1); moveFacing(r.wx,r.wy,Math.atan2(b.y-a.y,b.x-a.x)); return; }
  const d=ui.drag; if(!d||!d.box||d.touch) return; ui.drag=null;
  const x0=Math.min(d.x0,d.x1), x1=Math.max(d.x0,d.x1), y0=Math.min(d.y0,d.y1), y1=Math.max(d.y0,d.y1);
  const inBox=G.ents.filter(en=>{ if(en.dead||en.faction!==G.side) return false; const g=V3.objs.get(en), p=v3Screen(en.x,en.y,g?(g.userData.top||1)*0.5:0.4); return p.ok&&p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1; });
  const units=inBox.filter(en=>en.kind==='unit'); selectEntities(units.length?units:inBox.filter(en=>en.kind==='building').slice(0,1),d.shift); },true);
cv.addEventListener('wheel',e=>{ if(!v3Active()) return; e.preventDefault(); VIEW3D.dist=clamp(VIEW3D.dist*(e.deltaY>0?1.1:1/1.1),VIEW3D.minDist,VIEW3D.maxDist); store.set('hc-dist3d',VIEW3D.dist); },{ passive:false });
window.addEventListener('keydown',e=>{ if(e.key==='F3'){ e.preventDefault(); if(ui.mode==='game'||ui.mode==='pause') toggleView3D(); }
  else if(e.key==='Home'&&v3Active()){ e.preventDefault(); V3.yaw=0; VIEW3D.pitch=56; } });
{ const b=$('#btn-view'); if(b) b.addEventListener('click',toggleView3D);
  const l=$('#btn-turn-l'), r=$('#btn-turn-r'); if(l) l.addEventListener('click',()=>turnView3D(-90)); if(r) r.addEventListener('click',()=>turnView3D(90)); v3Label(); }
