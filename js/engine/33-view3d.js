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
  sun:1.45, ambient:0.85, darkSun:0.14, darkAmbient:0.26,                        /* light; dark: missions with mission.dark */
  seenLift:0.28, seenAdd:0.05, darkSeenAdd:0.11,                                 /* what your units see right now: brighter (×1+lift, +add) */
  lamp:1.25, lamps:6, genLight:2.4,                                              /* helmet lamps in the dark (nearest the camera), running generators */
  unitScale:1.3, xray:0.4, shadows:true, groundAnims:true
};
const V3 = { on:store.get('hc-view3d',false), ok:false, g:null, mapId:null, objs:new Map(), frame:0, yaw:0 };

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
const SKIN={ corps:{ armor:'#5a6880', dark:'#262b35', suit:'#3d4556', metal:'#2c2f36' }, osprey:{ armor:'#2e2621', dark:'#15110e', suit:'#3b2f27', metal:'#211d1a', band:'#c0231d' } };
function v3Soldier(e){
  const t=e.type, osp=e.faction==='osprey'||!!e.crew, P=osp?SKIN.osprey:SKIN.corps, g=new THREE.Group(), U=g.userData;
  const A=mat(t==='medic'&&!osp?'#d8dde3':P.armor), D=mat(P.dark), S=mat(P.suit), Mt=shiny(P.metal), R=mat(ROLE_COL[t]||ROLE_COL.trooper), Rs=osp?mat('#4a3a2e'):R, skin=mat('#c99a78');
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
  else { g.add(ball(A,0.125,0.11,0.135,0,0.94,-0.005)); g.add(box(shiny(osp?'#ff5040':'#7ff6ff',{ emissive:osp?0x801010:0x2a8a96 }),0.17,0.05,0.04,0,0.92,0.11)); g.add(box(Rs,0.03,0.025,0.24,0,1.045,-0.01)); }
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
  void last; U.top=1.1; return g; }

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
    /* an armoured ram: a curved back of bone bands like an armadillo, heavy club forelegs, a low head with curled horns */
    const body=grp(0,0.78,0); g.add(body); U.torso=body;
    body.add(ball(C,0.4,0.36,0.55,0,0,0));
    for(let i=0;i<6;i++){ const band=part(GEO.half,i%2?B:fung('#a89a7e'),0.43-Math.abs(i-2.5)*0.03,0.4,0.11,0,0.02,0.4-i*0.16); band.rotation.x=0; body.add(band); }
    spots(body,5,0.38,0.2,0.5,-0.08,2.1,0.035);
    const head=grp(0,-0.18,0.55); head.add(ball(L,0.2,0.17,0.2,0,0,0)); head.add(box(B,0.22,0.06,0.12,0,-0.12,0.1)); head.add(ball(eye,0.035,0.025,0.02,0.09,0.05,0.17)); head.add(ball(eye,0.035,0.025,0.02,-0.09,0.05,0.17));
    for(const k of [-1,1]){ const horn=part(GEO.torus,B,0.12,0.12,0.12,k*0.2,0.05,-0.02); horn.rotation.set(0,Math.PI/2,0); head.add(horn); } body.add(head); U.head=head;
    for(const k of [-1,1]){ const sh=grp(k*0.32,-0.05,0.3); sh.add(box(Dk,0.15,0.36,0.16,0,-0.18,0)); const el=grp(0,-0.35,0); el.add(box(C,0.13,0.32,0.13,0,-0.14,0)); el.add(ball(B,0.12,0.09,0.13,0,-0.32,0.02)); sh.add(el); sh.rotation.x=-0.15; sh.userData.base=-0.15; body.add(sh); U.arms.push(sh); }
    for(const k of [-1,1]){ const hip=grp(k*0.28,0.6,-0.4); hip.add(box(Dk,0.15,0.32,0.16,0,-0.16,0)); const kn=grp(0,-0.32,0); kn.add(box(C,0.12,0.3,0.12,0,-0.15,0)); kn.add(ball(B,0.1,0.06,0.12,0,-0.3,0.02)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    U.top=1.3; return g; }
  if(t==='bloater'){ const belly=grp(0,0.5,0); belly.add(ball(glow('#a3c94a'),0.32,0.27,0.34,0,0,0)); belly.add(ball(mat('#6d7a2e',{ transparent:true, opacity:0.78 }),0.4,0.34,0.43,0,0,0)); g.add(belly); U.sac=belly;
    for(let i=0;i<9;i++){ const a=i*2.4, b=0.4+hash2(e.id,i,3)*0.8; belly.add(ball(glow('#d8ff6a'),0.04,0.04,0.04,Math.cos(a)*Math.sin(b)*0.4,Math.cos(b)*0.33,Math.sin(a)*Math.sin(b)*0.42)); }
    g.add(ball(L,0.12,0.11,0.13,0,0.42,0.42)); g.add(ball(eye,0.03,0.02,0.02,0.05,0.45,0.53)); g.add(ball(eye,0.03,0.02,0.02,-0.05,0.45,0.53));
    for(const z of [0.22,-0.22]) for(const k of [-1,1]){ const hip=grp(k*0.28,0.3,z); hip.rotation.z=k*0.5; hip.add(box(C,0.08,0.24,0.08,0,-0.12,0)); g.add(hip); U.legs.push(hip); }
    U.top=0.95; return g; }
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
  if(t==='broodmother'){
    /* The Matron: a beating heart of flesh, red veins running over it and a glowing core showing through, brood pods on top,
       walking on a tangle of thick roots */
    const heart=grp(0,1.55,0); g.add(heart); U.sac=heart; U.torso=heart;
    heart.add(ball(fung('#4a2a4e'),1.15,1.0,1.1,0,0,0)); heart.add(ball(fung('#5e3a62'),0.75,0.6,0.7,-0.25,0.35,0.1)); heart.add(ball(fung('#4a2a4e'),0.6,0.55,0.6,0.45,0.45,-0.2));
    const vein=shiny('#8a1f35',{ emissive:0x3a0610 });
    for(let i=0;i<10;i++){ const a=i*0.63, y=((i*0.37)%1-0.5)*0.9, r=Math.sqrt(Math.max(0.05,1-y*y)); const v=ball(vein,0.05,0.42,0.05,Math.cos(a)*r*1.12,y,Math.sin(a)*r*1.07); v.rotation.set(0,-a,0.35*(i%2?1:-1)); heart.add(v); }   /* veins lying on the skin */
    const core=grp(0.6,0.0,0.55); core.add(ball(glow('#a6ff4a'),0.28,0.28,0.28,0,0,0)); core.add(ball(mat('#4fae22',{ transparent:true, opacity:0.5 }),0.42,0.42,0.42,0,0,0)); heart.add(core); U.core3=core;
    for(const [x,z] of [[-0.5,0.3],[0.1,-0.5],[0.5,0.2],[-0.2,-0.2]]){ heart.add(ball(mat('#6d8a35',{ transparent:true, opacity:0.8 }),0.2,0.2,0.2,x,0.95,z)); heart.add(ball(glow('#c7f05a'),0.1,0.1,0.1,x,0.95,z)); }
    for(const k of [-1,1]) heart.add(ball(eye,0.09,0.09,0.09,1.08,0.1,k*0.25));
    for(let i=0;i<8;i++){ const a=i*Math.PI/4+0.2, hip=grp(Math.cos(a)*0.85,1.15,Math.sin(a)*0.85); hip.rotation.set(Math.sin(a)*1.0,0,-Math.cos(a)*1.0);
      hip.add(part(GEO.taper,fung('#3d2a4a'),0.16,0.9,0.16,0,-0.45,0)); const kn=grp(0,-0.88,0); kn.rotation.set(-Math.sin(a)*0.55,0,Math.cos(a)*0.55);
      kn.add(part(GEO.taper,fung('#55405f'),0.1,0.7,0.1,0,-0.35,0)); kn.add(part(GEO.cone,B,0.06,0.25,0.06,0,-0.78,0)); kn.children[1].rotation.x=Math.PI; hip.add(kn); g.add(hip); U.legs.push(hip); }
    U.top=3.0; return g; }
  if(t==='grazer'){ const B=mat('#b9a98a'), B2=mat('#8f8168'), H=mat('#d3c3a6');
    g.add(ball(B,0.3,0.24,0.46,0,0.62,0)); for(let i=0;i<4;i++) g.add(rotX(box(B2,0.24-i*0.03,0.06,0.14,0,0.84,0.25-i*0.17),0.1));
    const neck=grp(0,0.7,0.35); neck.rotation.x=-0.6; neck.add(box(B,0.12,0.12,0.3,0,0,0.15)); const head=grp(0,0,0.32); head.add(ball(H,0.12,0.11,0.2,0,0,0.05)); head.add(rotX(part(GEO.claw,B2,0.025,0.025,0.15,0.06,0.08,-0.05),-2.3)); head.add(rotX(part(GEO.claw,B2,0.025,0.025,0.15,-0.06,0.08,-0.05),-2.3)); head.rotation.x=0.6; neck.add(head); g.add(neck); U.head=head;
    for(const z of [0.28,-0.28]) for(const k of [-1,1]){ const hip=grp(k*0.16,0.55,z); hip.add(box(B,0.08,0.3,0.09,0,-0.15,0)); const kn=grp(0,-0.3,0); kn.add(box(B2,0.06,0.26,0.06,0,-0.13,0)); hip.add(kn); g.add(hip); U.legs.push(hip); }
    U.top=1.0; return g; }
  return null; }

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
  else if(t==='sentry'){ for(let i=0;i<3;i++){ const l=limb(dark,0.05,0.42,Math.cos(i*2.1)*0.05,0.4,Math.sin(i*2.1)*0.05); l.rotation.set(Math.sin(i*2.1)*0.6,0,-Math.cos(i*2.1)*0.6); g.add(l); }
    const tur=grp(0,0.45,0); tur.add(box(plate,0.34,0.24,0.38,0,0,0)); tur.add(box(yel,0.35,0.04,0.39,0,0.1,0)); tur.add(box(glow('#ff5a4f'),0.06,0.03,0.02,0,0.04,0.2)); for(const k of [-1,1]) tur.add(rotX(cyl(steel,0.025,0.45,0.025,k*0.07,0.0,0.32),Math.PI/2));
    g.add(tur); U.turret=tur; top=0.85; }
  else if(t==='barricade'){ g.add(box(mat('#6a6a70'),0.95,0.6,0.42,0,0.3,0)); g.add(box(yel,0.96,0.08,0.43,0,0.46,0)); for(const x of [-0.3,0.3]) g.add(box(dark,0.06,0.62,0.44,x,0.31,0)); top=0.7; }
  else if(t==='hive'){ const H=shiny('#3a2448'), H2=shiny('#5c3e6e');
    for(let i=0;i<8;i++){ const a=i*0.8; g.add(ball(i%2?H:H2,0.5+hash2(e.id,i,1)*0.35,0.45+hash2(e.id,i,2)*0.5,0.5,Math.cos(a)*0.7,0.3,Math.sin(a)*0.7)); }
    g.add(ball(H,0.85,1.15,0.85,0,0.7,0)); for(let i=0;i<6;i++) g.add(ball(H2,0.35,0.06,0.5,0,0.5+i*0.18,-0.2)); const heart=ball(glow('#a6ff4a'),0.3,0.3,0.3,0,1.2,0.65); g.add(heart); U.heart=heart;
    g.add(ball(glow('#2a0d33'),0.32,0.4,0.1,0,0.35,0.8));   /* the mouth */
    for(let i=0;i<6;i++){ const r=cyl(H2,0.06,1.7,0.06,Math.cos(i*1.05)*1.1,0.22,Math.sin(i*1.05)*1.1); r.rotation.set(Math.sin(i*1.05)*1.25,0,-Math.cos(i*1.05)*1.25); g.add(r); } top=2; }
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
  else if(t==='membrane'){ g.add(box(mat('#7a5a8e',{ transparent:true, opacity:0.8 }),0.95,1.3,0.5,0,0.65,0)); top=1.3; }
  else if(t==='rubble'){ for(let i=0;i<5;i++) g.add(part(GEO.lowball,mat('#4a4a52'),0.25,0.2,0.25,(hash2(e.id,i,1)-0.5)*0.6,0.12,(hash2(e.id,i,2)-0.5)*0.6)); top=0.4; }
  else if(t==='wreck'){ const W=mat('#3a3f48'); const hull=box(W,1.2,0.6,2.6,0,0.35,0); hull.rotation.set(0.15,0.4,0.2); g.add(hull); const wing=box(W,2.4,0.08,0.7,0.2,0.25,0.2); wing.rotation.set(0,0.4,0.35); g.add(wing); U.smoke=true; top=1; }
  else if(t==='medtent'){ const tent=new THREE.Mesh(new THREE.CylinderGeometry(0,1,1,4),mat('#c8d0c0')); tent.scale.set(0.9,1.6,0.9); tent.position.y=0.45; tent.rotation.y=Math.PI/4; tent.castShadow=true; g.add(tent); g.add(box(mat('#e2463a'),0.3,0.08,0.02,0,0.5,0.66)); top=1; }
  else if(t==='terminal'){ g.add(box(metal,0.4,0.7,0.3,0,0.35,0)); g.add(box(glow('#5fe3b0'),0.3,0.22,0.02,0,0.55,0.16)); top=0.8; }
  else if(t==='choirpod'){ g.add(part(GEO.cone,shiny('#5c3e6e'),0.3,0.9,0.3,0,0.45,0)); g.add(ball(glow('#c58cff'),0.1,0.1,0.1,0,0.92,0)); top=1; }
  else return null;
  U.top=top; return g; }
function v3Small(e){
  const g=new THREE.Group();
  if(e.kind==='body'){ const swarm=e.faction==='swarm'||e.bio===false, m=swarm?shiny(CH.body):mat(e.faction==='osprey'?'#2e2621':'#5a6880'), a=(e.id%7)*0.9;
    const b=box(m,0.28,0.12,0.62,0,0.07,0); b.rotation.y=a; g.add(b); g.add(ball(mat(swarm?CH.bone:'#262b35'),0.11,0.09,0.11,Math.sin(a)*0.37,0.09,Math.cos(a)*0.37)); g.userData.top=0.3; return g; }
  if(e.relic){ g.add(box(mat('#3a3f48'),0.3,0.2,0.3,0,0.1,0)); g.add(ball(glow('#c58cff'),0.09,0.09,0.09,0,0.3,0)); g.userData.top=0.5; g.userData.bob=true; return g; }
  g.add(box(mat(e.supply?'#3a6a8a':'#5a4632'),0.36,0.26,0.28,0,0.13,0)); g.add(box(mat('#f2c230'),0.37,0.05,0.29,0,0.2,0)); g.userData.top=0.4; g.userData.bob=true; return g; }
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
  V3.fxPool.length=V3.shotPool.length=V3.ringPool.length=V3.pingPool.length=0; V3.smoke=[]; V3.ships=new Map();
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
  if(e.kind==='unit'){ const dx=e.x-U.px, dy=e.y-U.py, tg=e.target&&!e.target.dead?e.target:null, fight=!!tg&&Math.hypot(tg.x-e.x,tg.y-e.y)<(e.def.range||1.5)*TILE+40;
    if(fight) U.want=Math.atan2(tg.x-e.x,tg.y-e.y); else if(Math.hypot(dx,dy)>0.4) U.want=Math.atan2(dx,dy);
    if(U.want!=null){ let d=U.want-U.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); U.yaw+=d*0.25; }
    U.px=e.x; U.py=e.y; g.rotation.set(0,U.yaw,0);
    const mv=e.moving&&!e.downed, ph=T*(e.def.speed>80?14:10)+e.id, sw=mv?Math.sin(ph)*0.55:0;
    U.legs.forEach((l,i)=>{ const b=l.userData.bx??(l.userData.bx=l.rotation.x); l.rotation.x=b+(i%2?sw:-sw); if(l.userData.knee) l.userData.knee.rotation.x=mv?Math.max(0,Math.sin(ph+(i%2?Math.PI:0)))*0.6:0; });
    U.arms.forEach((a,i)=>{ const b=a.userData.base||0; a.rotation.x=U.gun?b+(mv?Math.sin(ph)*0.06:0):b+(e.lunge>0?-0.9:(mv?(i%2?sw:-sw)*0.6:Math.sin(T*1.5+e.id+i)*0.08)); });
    if(U.tail) U.tail.rotation.y=Math.sin(T*2.2+e.id)*0.35;
    if(U.feelers) U.feelers.forEach((f,i)=>f.rotation.z=Math.sin(T*2+i)*0.25);
    if(U.head&&!mv) U.head.rotation.y=Math.sin(T*0.7+e.id*1.3)*0.3;
    if(U.sac){ const beat=e.type==='broodmother'?Math.pow(Math.max(0,Math.sin(T*3.2)),12)*0.07:0.05*Math.sin(T*(e.chargeT>0?14:3)+e.id); U.sac.scale.setScalar(1+beat); }
    if(U.torso){ const b=U.torso.userData.by??(U.torso.userData.by=U.torso.position.y); U.torso.position.y=b+Math.sin(T*2+e.id)*0.01; }
    if(U.spin&&fight) U.spin.rotation.z+=0.6;
    if(U.pilot) U.pilot.scale.setScalar(0.025*(0.8+Math.random()*0.5)*(fight?2:1));
    if(U.blink) U.blink.visible=Math.floor(T*2+e.id)%2===0;
    if(U.weld) U.weld.visible=!!(e.order&&/repair|build/.test(e.order.type))&&Math.random()<0.7;
    if(mv) y+=Math.abs(Math.sin(ph))*0.025;
    if(e.downed){ g.rotation.x=-Math.PI/2*0.92; y+=0.12; } else if(e.stunT>0) g.rotation.z=Math.sin(T*9)*0.25;
    const lg=e.lunge>0?0.15:0; g.position.set(x+Math.sin(U.yaw)*lg,y,z+Math.cos(U.yaw)*lg);
    const s0=U.s0||(U.s0=g.scale.x), fl=e.flash>0?1.06:1; if(U.fl!==fl){ U.fl=fl; g.scale.setScalar(s0*fl); } return; }
  if(e.kind!=='building'&&U.bob) y+=0.05+Math.sin(T*3+e.id)*0.04;
  g.position.set(x,y,z);
  if(e.kind!=='building') return;
  g.scale.y=(!e.built&&e.progress!=null)?Math.max(0.08,e.progress):1;
  if(U.blink) U.blink.visible=Math.floor(T*1.6+e.id)%2===0;
  if(U.lamps) U.lamps.forEach((l,i)=>l.visible=Math.floor(T*3-i*0.5)%2===0);
  if(U.heart){ const f=e.hp/e.maxHp; U.heart.scale.setScalar(0.3*(1+0.2*Math.max(0,Math.sin(T*(2+f*2)+e.id)))); g.scale.set(1+0.02*Math.sin(T*2+e.id),1+0.03*Math.sin(T*2+e.id),1); }
  if(U.turret) U.turret.rotation.y=Math.atan2(Math.cos(e.angle||0),Math.sin(e.angle||0));
  if(U.pulse) U.pulse.scale.set(0.24,0.34*(1+0.06*Math.sin(T*7+e.id)),0.24);
  if(U.core) U.core.visible=!!e.powered&&Math.random()>0.03;
  if(U.smoke&&Math.random()<0.3) V3.smoke.push({x,z,y:y+0.6,t:0});
  if(e.type==='egg'){ const p=e.openT!=null?1-e.openT/EGG.open:0; g.scale.setScalar(1+Math.sin(T*2+e.id)*0.04+0.15*p); U.opening=p; } }
function render3D(now){
  if(V3.forG!==G||V3.mapId!==G.map.id) v3Reset();
  const dt=Math.min(0.1,(now-(V3.last||now))/1000); V3.last=now;
  v3Size(); v3Camera(dt); paintFog(); v3Fog(); V3.frame++; V3.u.time.value=now/1000;
  const T=now/1000, sel=new Set(G.sel), lights=[];
  for(const e of G.ents){ if(!v3Shown(e)) continue;
    let g=V3.objs.get(e); if(!g){ g=v3Model(e); V3.objs.set(e,g); V3.g.add(g); if(e.faction===G.side&&e.kind==='unit') g.traverse(o=>o.layers.set(1)); }
    g.visible=true; g.userData.f=V3.frame; v3Pose(e,g,T);
    if(e.kind==='unit'&&G.mission.dark&&e.faction===G.side&&e.def.bio&&!e.downed) lights.push({x:g.position.x+Math.sin(g.userData.yaw)*1.4,y:g.position.y+1.1,z:g.position.z+Math.cos(g.userData.yaw)*1.4,i:VIEW3D.lamp,c:0xe4ecff,d:7,lamp:1});
    if(e.kind==='building'&&e.def.generator&&e.powered) lights.push({x:g.position.x,y:g.position.y+1.7,z:g.position.z,i:VIEW3D.genLight*(0.92+0.08*Math.sin(now/90+e.id)),c:0xffd690,d:(e.def.light||8)*1.1}); }
  for(const [e,g] of V3.objs){ if(g.userData.f!==V3.frame){ g.visible=false; if(e.dead||V3.frame-g.userData.f>600){ V3.g.remove(g); for(const o of g.userData.own||[]) o.dispose(); V3.objs.delete(e); } } }
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
  const put=(x,y,z,sz,col,a,normal)=>{ if(n>=400) return; const s=fx(n++); s.material.blending=normal?THREE.NormalBlending:THREE.AdditiveBlending; s.position.set(x,y,z); s.scale.setScalar(sz); s.material.color.set(col); s.material.opacity=a; };
  for(const f of G.fx){ const a=Math.max(0,f.t/f.max);
    if(f.k==='tracer'&&nt<400){ const x1=f.x1/TILE, z1=f.y1/TILE, x2=f.x2/TILE, z2=f.y2/TILE, c=new THREE.Color('#ffe2a8').multiplyScalar(a);
      P.set([x1,v3H(x1,z1)+0.6,z1,x2,v3H(x2,z2)+0.5,z2],nt*6); Cc.set([c.r,c.g,c.b,c.r,c.g,c.b],nt*6); nt++; continue; }
    if(f.x==null) continue; const x=f.x/TILE, z=f.y/TILE, gy=v3H(x,z);
    switch(f.k){
      case 'flash': put(x,gy+0.6,z,0.4,'#fff3c4',1); break;
      case 'spark': case 'ember': put(x,gy+0.35+(1-a)*0.5,z,0.13,f.col||'#ffb347',a); break;
      case 'flame': put(x,gy+0.35+(1-a)*0.6,z,0.28+(1-a)*0.5,a>0.6?'#ffe08a':a>0.3?'#ff8a2a':'#783214',a); break;
      case 'boom': put(x,gy+0.45,z,(f.r/TILE)*2.2*(1-a*0.6),f.col||'#ffa03c',a*0.9); break;
      case 'dust': put(x,gy+0.3,z,(f.r0+(1-a)*f.r1)/TILE*2,f.col||'#777',a*0.35,true); break;
      case 'hivedeath': put(x,gy+0.8,z,3*(1-a)+0.5,'#a6ff4a',a*0.6); break;
      case 'mlight': put(x,gy+0.6,z,1.0,'#ffd690',a*0.5); break;
      case 'meteor': put(x,gy+a*6,z,0.5,'#ffb347',1); break;
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
  for(const s of V3.smoke){ const k=s.t/2.5; put(s.x+k*0.6,s.y+k*1.8,s.z,0.4+k*1.2,'#3a3a3a',0.5*(1-k),true); }
  V3.smoke=V3.smoke.filter(s=>(s.t+=dt)<2.5);
  for(const mk of G.markers){ const x=mk.x/TILE, z=mk.y/TILE; put(x,v3H(x,z)+2+Math.sin(now/250)*0.1,z,0.7,mk.col||'#ffb347',0.9); }
  for(const f of G.flareList||[]) if(flareLit(f)){ const x=f.x/TILE, z=f.y/TILE; put(x,v3H(x,z)+0.3,z,1.2,'#ff6040',0.8); }
  v3Ships(now,lights,put);
  hidePool(V3.fxPool,n);
  for(const f of G.flareList||[]) if(flareLit(f)){ const x=f.x/TILE, z=f.y/TILE; lights.push({x,y:v3H(x,z)+0.6,z,i:2,c:0xff6a50,d:(SQUAD.flare.light||6)*1.1}); }
  const near=l=>Math.hypot(l.x-V3.look.x,l.z-V3.look.z); lights.sort((a,b)=>near(a)-near(b));
  let lampsUsed=0; const use=lights.filter(l=>!l.lamp||lampsUsed++<VIEW3D.lamps);
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
function v3Label(){ const b=$('#btn-view'); if(b) b.textContent=V3.on?'3D':'2D'; for(const id of ['btn-turn-l','btn-turn-r']){ const t=$('#'+id); if(t) t.style.display=V3.on?'':'none'; } }
function toggleView3D(){
  if(!V3.on&&!v3Init()){ toast('3D view is not available in this browser (no WebGL).'); return; }
  V3.on=!V3.on; store.set('hc-view3d',V3.on); v3Label(); if(G) clampCam(); toast(V3.on?'3D view. Middle mouse turns the camera, the wheel zooms, F3 back to 2D.':'2D view.',true); }
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
cv.addEventListener('wheel',e=>{ if(!v3Active()) return; e.preventDefault(); VIEW3D.dist=clamp(VIEW3D.dist*(e.deltaY>0?1.1:1/1.1),VIEW3D.minDist,VIEW3D.maxDist); },{ passive:false });
window.addEventListener('keydown',e=>{ if(e.key==='F3'){ e.preventDefault(); if(ui.mode==='game'||ui.mode==='pause') toggleView3D(); }
  else if(e.key==='Home'&&v3Active()){ e.preventDefault(); V3.yaw=0; VIEW3D.pitch=56; } });
{ const b=$('#btn-view'); if(b) b.addEventListener('click',toggleView3D);
  const l=$('#btn-turn-l'), r=$('#btn-turn-r'); if(l) l.addEventListener('click',()=>turnView3D(-90)); if(r) r.addEventListener('click',()=>turnView3D(90)); v3Label(); }
