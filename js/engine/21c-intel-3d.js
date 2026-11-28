'use strict';
/* ---------- 21c. Intel in 3D: the game's own 3D model next to every 2D picture ----------
   The big card on the right of the Intel screen shows two pictures side by side: the 2D scene (21b-intel-anim.js) and the same
   entry as its 3D model from the 3D view (33-view3d.js), with the name of what it is doing underneath. The list on the left stays 2D.
   Units play the loop of states from 21b (INTEL_LOOP: at rest, walking, attacking, a special move, hit, down and up again): both
   pictures read the same clock (iaPlan/iaAt) and the same beats (iaShots, iaStrike, iaSpit, iaRam, iaHits), so a step, a shot or a
   blow falls at the same moment in 2D and in 3D. Structures, extras and relics follow the clock of their own 2D scene.
   How: one small WebGL renderer of its own (IA3.r) with its own scene: the subject stands on a dark floor in a little world of its
   own. The model is made with v3Model and posed with v3Pose, the same code as in a mission, on a stand-in entity; while it is posed
   and drawn, G is swapped for a tiny stand-in world (ia3G) and the 3D view's shared uniforms for neutral ones (no fog of war, no
   mycel), then everything is put back. The picture is copied into the card's canvas. Effects (muzzle flash, tracers, flame, acid,
   rings, sparks, smoke) come from a small pool (ia3Glow, ia3Ball, ia3Ring, ia3Line) and are laid out again every frame.
   Tunables: INTEL3D. The loop lengths are in INTEL_LOOP (21b). */
const INTEL3D = { fov:28, yaw:0.62, pitch:0.34, hemi:1.15, sun:1.25, fill:0.35, flash:1, frame:1 };
const IA3 = { ok:false, failed:false, models:new Map() };
const IA3_X=32, IA3_Z=32;   /* where the subject stands in its little world (tiles) */
function ia3Init(){ if(IA3.ok||IA3.failed) return IA3.ok;
  if(typeof THREE==='undefined'||typeof v3Init!=='function'||!v3Init()){ IA3.failed=true; return false; }
  let r; try{ r=new THREE.WebGLRenderer({ antialias:true, alpha:false }); }catch(e){ IA3.failed=true; return false; }
  IA3.r=r; r.setPixelRatio(1); r.setClearColor(0x0b0c11,1); r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap;
  const S=IA3.scene=new THREE.Scene(); IA3.cam=new THREE.PerspectiveCamera(INTEL3D.fov,1,0.05,200);
  IA3.hemi=new THREE.HemisphereLight(0xb8c6e4,0x2a2a33,INTEL3D.hemi); S.add(IA3.hemi);
  const sun=IA3.sun=new THREE.DirectionalLight(0xf0f4ff,INTEL3D.sun); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.bias=-0.0008; sun.shadow.normalBias=0.02; S.add(sun); S.add(sun.target);
  IA3.fill=new THREE.DirectionalLight(0x9fb4ff,INTEL3D.fill); S.add(IA3.fill); S.add(IA3.fill.target);
  IA3.flashL=new THREE.PointLight(0xffc070,0,4,1.5); S.add(IA3.flashL);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(400,64).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({ color:0x171920 })); floor.position.set(IA3_X,0,IA3_Z); floor.receiveShadow=true; S.add(floor);
  /* a few pebbles, as on the 2D floor */
  const peb=new THREE.MeshLambertMaterial({ color:0x262934 }); for(let i=0;i<40;i++){ const m=new THREE.Mesh(GEO.lowball,peb), a=iaHash(i,1)*Math.PI*2, d=0.4+iaHash(i,2)*5; m.scale.set(0.03,0.012,0.03); m.position.set(IA3_X+Math.cos(a)*d,0.004,IA3_Z+Math.sin(a)*d); S.add(m); }
  IA3.stage=new THREE.Group(); S.add(IA3.stage); IA3.fxg=new THREE.Group(); S.add(IA3.fxg);
  /* the fog-of-war texture the materials read: everything seen, nothing dark, no mycel */
  IA3.fogTex=new THREE.DataTexture(new Uint8Array([0,255,0,0]),1,1,THREE.RGBAFormat); IA3.fogTex.needsUpdate=true;
  IA3.pool={ glow:[], ball:[], ring:[], line:[] }; IA3.n={};
  IA3.ok=true; return true; }
/* ---------- the little world the model is posed in ---------- */
function ia3G(){ if(IA3.G) return IA3.G; const W=64;
  return IA3.G={ ents:[], fx:[], rings:[], mission:{ dark:false }, side:'corps', map:{ w:W, h:W, id:'intel3d' }, block:new Uint8Array(W*W), vis:new Uint8Array(W*W).fill(1), seen:new Uint8Array(W*W).fill(1),
    creep:null, time:0, cam:{ x:0, y:0 }, shake:0, stats:{} }; }
function ia3Swap(t){ const g=ia3G(); g.time=t; g.fx.length=0; const u=V3.u, s={ G, hv:V3.hv, fd:V3.fogData, smoke:V3.smoke, sparks:V3.sparks, bits:V3.bits,
    fog:u.fog.value, sz:u.size.value.clone(), lift:u.lift.value.clone(), time:u.time.value };
  G=g; V3.hv=null; V3.fogData=null; V3.smoke=[]; V3.sparks=[]; V3.bits=[]; u.fog.value=IA3.fogTex; u.size.value.set(1,1); u.lift.value.set(0,0); u.time.value=t; return s; }
function ia3Unswap(s){ const u=V3.u; G=s.G; V3.hv=s.hv; V3.fogData=s.fd; V3.smoke=s.smoke; V3.sparks=s.sparks; V3.bits=s.bits; u.fog.value=s.fog; u.size.value.copy(s.sz); u.lift.value.copy(s.lift); u.time.value=s.time; }
function ia3Ent(o){ return Object.assign({ id:7, x:IA3_X*TILE, y:IA3_Z*TILE, face:1, hp:100, maxHp:100, dead:false, moving:false, target:null, lunge:0, flash:0, stunT:0, downed:false,
  built:true, powered:true, visible:true, set:true, angle:0, recoil:0 }, o); }
const ia3W=x2d=>x2d-24;   /* box x to the offset from the middle, in box pixels (times M.k for tiles) */
/* ---------- effects: pooled, laid out again every frame ---------- */
function ia3Get(kind,make){ const P=IA3.pool[kind], i=IA3.n[kind]=(IA3.n[kind]||0)+1; if(!P[i-1]){ P[i-1]=make(); IA3.fxg.add(P[i-1]); } const o=P[i-1]; o.visible=true; return o; }
function ia3FxBegin(){ for(const k in IA3.n) IA3.n[k]=0; IA3.flashL.intensity=0; IA3.flashL.distance=4; }
function ia3FxEnd(){ for(const k in IA3.pool) IA3.pool[k].forEach((o,i)=>{ if(i>=(IA3.n[k]||0)) o.visible=false; }); }
function ia3Glow(x,y,z,s,col,op=1){ const o=ia3Get('glow',()=>new THREE.Sprite(new THREE.SpriteMaterial({ map:V3.glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false })));
  o.position.set(x,y,z); o.scale.setScalar(s); o.material.color.set(col); o.material.opacity=op; return o; }
function ia3Ball(x,y,z,r,col,op=1){ const o=ia3Get('ball',()=>new THREE.Mesh(GEO.ball,new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false })));
  o.position.set(x,y,z); o.scale.setScalar(r); o.material.color.set(col); o.material.opacity=op; return o; }
function ia3Ring(x,y,z,r,col,op=1,flat=true){ const o=ia3Get('ring',()=>new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false, side:THREE.DoubleSide })));
  o.position.set(x,y,z); o.scale.setScalar(r); o.rotation.set(flat?0:Math.PI/2,0,0); o.material.color.set(col); o.material.opacity=Math.max(0,op); return o; }
function ia3Line(a,b,col,op=1){ const o=ia3Get('line',()=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
    return new THREE.Line(g,new THREE.LineBasicMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); });
  const p=o.geometry.attributes.position; p.setXYZ(0,a.x,a.y,a.z); p.setXYZ(1,b.x,b.y,b.z); p.needsUpdate=true; o.geometry.computeBoundingSphere(); o.material.color.set(col); o.material.opacity=op; return o; }
const ia3V=(x,y,z)=>new THREE.Vector3(x,y,z);
/* ---------- models ---------- */
/* the model for a key, made once: { root, g, e, pose(M,t), k (tiles per box pixel), V (view height), cy (look-at height) } */
function ia3Model(key){ if(IA3.models.has(key)) return IA3.models.get(key); let M=null;
  const s=ia3Swap(0); try{ M=ia3Make(key); }catch(e){ M=null; } finally{ ia3Unswap(s); }
  if(M){ M.key=key; IA3.stage.add(M.root); M.root.visible=false; ia3Frame(M); }
  IA3.models.set(key,M); return M; }
function ia3Unit(ty,crew){ const d=UNITS[ty]; return ia3Ent({ kind:'unit', type:ty, def:d, faction:crew?'osprey':d.faction, crew:crew?{ id:'intel' }:undefined, sprite:d.sprite, hp:d.hp, maxHp:d.hp, bossState:{}, awake:true, speedMul:1 }); }
function ia3Build(ty,o={}){ const d=BUILDINGS[ty]||{}; return ia3Ent({ kind:'building', type:ty, def:d, size:d.size||1, faction:d.faction, tx:IA3_X, ty:IA3_Z, hp:d.hp||100, maxHp:d.hp||100, ...o }); }
function ia3Add(M,e,dx=0,dz=0){ const g=v3Model(e); g.rotation.order='YXZ'; e.x+=dx*TILE; e.y+=dz*TILE; g.userData.px=e.x; g.userData.py=e.y; M.root.add(g); return g; }
function ia3Make(key){ const M={ root:new THREE.Group(), props:{} }, P=iaPlan(key);
  if(P){ const e=ia3Unit(P.ty,/^crew_/.test(key)); M.plan=P; M.e=e; M.g=ia3Add(M,e); M.pose=ia3PoseUnit;
    if(P.ty==='medic'){ const pe=ia3Unit('trooper',/^crew_/.test(key)); M.props.patient={ e:pe }; }
    if(P.ty==='engineer'){ const se=ia3Build('sentry'); M.props.sentry={ e:se }; }
    if(P.ty==='broodmother'||P.ty==='heir'){ M.props.egg={ e:ia3Build('egg') }; }
    return M; }
  const H=IA3_HOOKS[key]||(/^vial:/.test(key)?IA3_HOOKS['vial:']:/^art:/.test(key)?IA3_HOOKS['art:']:null);
  if(H&&H.make){ H.make(M,key); M.pose=H.pose||ia3PoseStill; return M.g||M.root.children.length?M:null; }
  if(BUILDINGS[key]){ const e=ia3Build(key); M.e=e; M.g=ia3Add(M,e); M.pose=(H&&H.pose)||ia3PoseStill; return M; }
  return null; }
/* the props a unit uses for its special move (the Medic's patient, the Engineer's Sentry Gun, the Matron's egg), made on first use */
function ia3Prop(M,name,dx){ const p=M.props[name]; if(!p) return null; if(!p.g){ p.g=ia3Add(M,p.e,dx,0); p.g.userData.yaw=-Math.PI/2; } p.g.visible=true; return p; }
function ia3HideProps(M,keep){ for(const k in M.props){ const p=M.props[k]; if(p.g&&k!==keep) p.g.visible=false; } }
/* how big the picture is: the same framing as the 2D card (IA_BOX/IA_CARD.zoom box pixels high, the look-at point 14 above the ground) for units,
   so the model is as big as the sprite; structures are framed round their own size */
/* the size of what can be seen: hidden parts (rings, glints, a beam) and sprites do not count */
function ia3Box(obj){ const box=new THREE.Box3(), b=new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverseVisible(o=>{ if(!o.isMesh||!o.geometry||(o.material&&(o.material.transparent&&o.material.opacity<0.3||o.material.blending===THREE.AdditiveBlending))) return;
    if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(b); });
  if(box.isEmpty()) box.setFromObject(obj); return box; }
function ia3Frame(M){ const sz=new THREE.Vector3(), box=ia3Box(M.g||M.root); box.getSize(sz);
  const h=Math.max(0.05,box.max.y), w=Math.max(sz.x,sz.z);
  if(M.plan){ const spk=iaSprKey(M.plan.key), sp=SPR[spk], sc=iaUnitScale(spk,IA_MAX[M.plan.ty]||26), hp=sp.h*sc; M.hp=hp; M.k=h/hp; M.V=Math.max(IA_BOX/IA_CARD.zoom*M.k,h*1.35,w*1.05)*INTEL3D.frame; M.cy=Math.min(M.V*0.45,14*M.k*M.V/(IA_BOX/IA_CARD.zoom*M.k)); }   /* the same framing as the 2D card (IA_CARD.zoom) */
  else { M.k=M.k||h/26; M.V=(M.V||Math.max(h*1.7,w*1.45,0.6))*INTEL3D.frame; M.cy=M.cy||Math.max(h*0.5,M.V*0.36); }
  M.h=h; M.w=w; }
function ia3Camera(M,asp=1){ const C=IA3.cam, D=INTEL3D, d=(M.V/2)/Math.tan(D.fov*Math.PI/360), tx=IA3_X+(M.cx||0), tz=IA3_Z+(M.cz||0);
  C.fov=D.fov; C.aspect=asp; C.position.set(tx+Math.sin(D.yaw)*Math.cos(D.pitch)*d,M.cy+Math.sin(D.pitch)*d,tz+Math.cos(D.yaw)*Math.cos(D.pitch)*d); C.lookAt(tx,M.cy,tz); C.near=d*0.1; C.far=d*40; C.updateProjectionMatrix();
  const S=IA3.sun, r=Math.max(2,M.V*1.5); S.position.set(tx-r*0.7,r*2.2,tz+r*0.9); S.target.position.set(tx,0,tz); const sc=S.shadow.camera; sc.left=-r; sc.right=r; sc.top=r; sc.bottom=-r; sc.near=0.1; sc.far=r*6; sc.updateProjectionMatrix();
  IA3.fill.position.set(tx+r,r,tz-r); IA3.fill.target.position.set(tx,0,tz); IA3.hemi.intensity=D.hemi; S.intensity=D.sun; IA3.fill.intensity=D.fill; }
function ia3PoseStill(M,t){ v3Pose(M.e,M.g,t); }
/* ---------- a unit in its state (the 3D half of iaUnit) ---------- */
const fight0=st=>st==='attack'||st==='heal'||st==='repair';
function ia3PoseUnit(M,t){ const P=M.plan, S=iaAt(P,t), e=M.e, g=M.g, U=g.userData, st=S.st, ty=P.ty, K=M.k, pos=iaPos(P,S), soldier=P.kind==='soldier', mat=ty==='broodmother'||ty==='heir';
  const X=x2d=>IA3_X+ia3W(x2d)*K;
  let x2=pos.x; const hk=st==='hit'?iaHits(S):0; if(hk) x2-=1.5*hk;
  let strike=null, spit=null, ram=null, sh=null;
  e.moving=st==='walk'||st==='flee'; e.fleeT=st==='flee'?1:0; e.lunge=0; e.order=null; e.rootT=st==='root'?S.s:null; e.cd=1; e.bossAnim=null; e.flash=hk>0.3?0.1:0; e.stunT=0;
  if(e.moving) e.hd=pos.face>0?Math.PI/2:-Math.PI/2;
  if(st==='attack'){
    if(soldier) sh=iaShots(ty,S);
    else if(ty==='spitter'||mat){ spit=iaSpit(S); if(mat){ const sp0=iaCyc(S.s,1.5); e.bossAnim={ k:'spit', at:t-Math.max(0,sp0.s-0.3) }; } }
    else if(ty==='brute'){ ram=iaRam(S); e.cd=ram.cd; if(ram.ram>=0&&ram.ram<0.3) e.lunge=0.2; if(ram.ram>=0) x2+=Math.sin(ram.ram*Math.PI)*5; }
    else if(ty==='grafter'){ strike=iaStrike(S,1,0.35); if(strike.on){ x2+=Math.sin(strike.q*Math.PI)*6; e.lunge=0.1; } }
    else { strike=iaStrike(S); if(strike.on){ x2+=Math.sin(strike.q*Math.PI)*3; e.lunge=0.15; } } }
  if(st==='screech') e.bossAnim={ k:'screech', at:S.at+Math.floor(S.s/1.2)*1.2 };
  if(st==='egg') e.bossAnim={ k:'egg', at:S.at+0.4 };
  if(st==='rain') e.bossAnim={ k:'rain', at:S.at+Math.floor(S.s/1.4)*1.4 };
  if(st==='repair') e.order={ type:'repair' };
  if(soldier&&(st==='down'||st==='up')) x2+=iaFall(S)*M.hp*0.5;   /* he lies across the middle, as in 2D */
  e.x=X(x2)*TILE; e.y=IA3_Z*TILE;
  if(!e.moving){ U.px=e.x; U.py=e.y; if(!fight0(st)) U.want=Math.PI/2; }   /* a knock-back or a lunge is no walk: it keeps facing right, as in 2D */
  /* the target: a spot in front, so it turns to it and fights (the patient or the Sentry Gun for the special moves) */
  const fight=fight0(st); e.target=fight?(M.tgt||(M.tgt={ dead:false })):null;
  if(fight){ M.tgt.x=e.x+30; M.tgt.y=e.y; }
  ia3HideProps(M,st==='heal'?'patient':st==='repair'?'sentry':st==='egg'?'egg':null);
  if(st==='heal'){ const p=ia3Prop(M,'patient',0); p.e.x=X(36)*TILE; p.e.y=e.y; v3Pose(p.e,p.g,t); p.g.rotation.x=-Math.PI/2*0.92; p.g.position.y+=0.1; }
  if(st==='repair'){ const p=ia3Prop(M,'sentry',0); p.e.x=X(36)*TILE; p.e.y=e.y; p.e.angle=Math.PI; p.e.target=null; v3Pose(p.e,p.g,t); p.g.scale.setScalar(0.62); }
  if(st==='egg'){ const q=clamp((S.s-0.6)/0.5,0,1), p=ia3Prop(M,'egg',0); p.e.x=X(41)*TILE; p.e.y=e.y; v3Pose(p.e,p.g,t); p.g.visible=q>0; p.g.scale.set(0.4+0.6*q,(0.6+0.4*q)*(0.4+0.6*q),0.4+0.6*q); }
  v3Pose(e,g,t);
  /* what v3Pose does not know: falling over and getting up, dying and sinking away, bursting, burrowing, rising out of the ground */
  const fall=iaFall(S), fade=iaFade(P,S), dig=iaDig(S); let dy=0;
  g.rotation.x=0; g.rotation.z=g.rotation.z||0; g.visible=true;
  if(fall){ if(soldier){ g.rotation.x=-Math.PI/2*0.92*fall; dy+=0.1*fall*(M.h/1.1); } else { g.rotation.z=Math.PI/2*0.6*fall; dy+=0.03*fall; } }
  if(fade<1) dy-=(1-fade)*M.h*1.1;
  if(dig) dy-=dig*M.h*1.1;
  if(st==='burst'){ if(S.s<0.5){ g.scale.setScalar((U.s0||1)*(1+0.3*S.s/0.5)); } else g.visible=false; }
  else if(U.s0&&!e.flash) g.scale.setScalar(U.s0);
  g.position.y+=dy; g.updateMatrixWorld(true);
  /* effects */
  const fw=ia3V(Math.sin(U.yaw),0,Math.cos(U.yaw)), base=g.position, chest=ia3V(base.x,base.y+M.h*0.55,base.z), D=INTEL3D;
  if(sh&&sh.firing&&U.gun){ const mz=U.gun.localToWorld(ia3V(0,0,sh.o.flame?0.42:0.45));
    if(sh.o.flame){ for(let i=0;i<16;i++){ const q=((t*3+iaHash(i,sh.cy.k))%1), d=q*16*K, s2=(iaHash(i,7)-0.5)*q*10*K;
        ia3Glow(mz.x+fw.x*d,mz.y+s2*0.5,mz.z+fw.z*d+s2*0.3,(q<0.5?5:8)*K*(1+q),q<0.3?'#fff2a8':q<0.6?'#ffb347':'#ff5a2a',1-q); }
      IA3.flashL.position.copy(mz).addScaledVector(fw,8*K); IA3.flashL.intensity=1.6*D.flash; IA3.flashL.color.set(0xff9040); }
    else { if(sh.flash){ ia3Glow(mz.x,mz.y,mz.z,6*K,'#ffdc78',0.9*D.flash); ia3Glow(mz.x,mz.y,mz.z,2.5*K,'#fff6c8',1);
        const end=mz.clone().addScaledVector(fw,30*K); end.y+=(iaHash(sh.n,sh.cy.k)-0.5)*3*K; ia3Line(mz,end,'#ffe696',0.75); IA3.flashL.position.copy(mz); IA3.flashL.intensity=1.6*D.flash; IA3.flashL.color.set(0xffc070); }
      for(let j=0;j<=sh.n;j++){ const a=(sh.cy.s-j*sh.o.step)/0.5; if(a>1) continue; ia3Ball(mz.x-fw.x*(6+a*5)*K,mz.y+(2+a*9-a*a*14)*K,mz.z-fw.z*(6+a*5)*K+0.02,0.6*K,'#ffd23f'); } } }
  if(strike&&strike.on&&ty!=='grafter'){ const p=chest.clone().addScaledVector(fw,M.w*0.5+2*K); ia3Glow(p.x,p.y,p.z,6*K,'#ffffff',0.6*(1-strike.q)); }
  if(spit){ const o=chest.clone().addScaledVector(fw,M.w*0.35); o.y=base.y+M.h*0.65; const tp=ia3V(X(42),2*K,IA3_Z);
    if(spit.wind) ia3Glow(o.x,o.y,o.z,(3+spit.wind*5)*K*1.6,'#96ff50',0.7);
    if(spit.fly>=0){ const q=spit.fly, b=o.clone().lerp(tp,q); b.y+=Math.sin(q*Math.PI)*12*K; ia3Ball(b.x,b.y,b.z,2*K,'#9dff4a'); ia3Glow(b.x,b.y,b.z,6*K,'#96ff50',0.6); }
    if(spit.splash>=0){ const q=spit.splash; ia3Ring(tp.x,0.01,tp.z,(3+q*3)*K,'#78dc28',0.8*(1-q)); ia3Ball(tp.x,0,tp.z,(2+q*2)*K,'#78dc28',0.5*(1-q)).scale.y=0.3*K; } }
  if(ram&&ram.dust>=0){ const q=ram.dust, p=base.clone().addScaledVector(fw,4*K); ia3Ring(p.x,0.02,p.z,(4+q*16)*K,'#d3c3a6',0.7*(1-q));
    for(let i=0;i<6;i++){ const a=iaHash(i,ram.k)*Math.PI*2; ia3Ball(p.x+Math.cos(a)*(5+q*12)*K,q*6*K*iaHash(i,3),p.z+Math.sin(a)*(5+q*12)*K,1.2*K,'#8a7d68',0.6*(1-q)); } }
  if(st==='heal'){ const p=M.props.patient.g.position, pc=ia3V(p.x,p.y+0.15,p.z); ia3Line(chest,pc,'#7dffbf',0.5+0.3*Math.sin(t*9)); ia3Glow(pc.x,pc.y,pc.z,8*K,'#7dffbf',0.35+0.15*Math.sin(t*3));
    for(let i=0;i<3;i++){ const q=(t*0.8+i/3)%1; ia3Glow(pc.x+(i-1)*3*K,pc.y+(2+q*14)*K,pc.z,3*K,'#7dffbf',1-q); } }
  if(st==='repair'){ const sp=ia3V(X(31),9*K,IA3_Z), cy=iaCyc(t,0.18); ia3Glow(sp.x,sp.y,sp.z,7*K*1.4,'#a0d2ff',0.3+0.3*Math.sin(t*30));
    for(let i=0;i<5;i++){ const q=(cy.p+i/5)%1, a=iaHash(i,cy.k)*Math.PI*2; ia3Glow(sp.x+Math.cos(a)*q*7*K,sp.y-Math.sin(a)*q*5*K+q*3*K,sp.z+Math.sin(a*1.7)*q*3*K,1.6*K,q<0.5?'#fff6c8':'#ffb347',1-q*0.5); } }
  if(st==='scream'||st==='screech'){ const col=st==='scream'?'#e8e8f0':'#c38bff', hp=ia3V(base.x,base.y+M.h*0.65,base.z).addScaledVector(fw,M.w*0.3);
    for(let i=0;i<3;i++){ if(S.s<i*0.25) continue; const q=((S.s-i*0.25)%1.2)/1.2; ia3Ring(hp.x,hp.y,hp.z,(3+q*20)*K,col,0.8*(1-q),false).rotation.y=U.yaw; } }
  if(st==='egg'&&S.s>0.4&&S.s<0.9) ia3Glow(chest.x,chest.y,chest.z,M.w*0.6,'#a6ff4a',0.5);
  if(st==='rain'){ for(let i=0;i<10;i++){ const q=(S.s*1.4+iaHash(i,4))%1, x=X(4+iaHash(i,9)*40), z=IA3_Z+(iaHash(i,11)-0.5)*14*K, yy=(1-q)*40*K; ia3Ball(x,yy,z,0.9*K,'#9dff4a'); if(q>0.92) ia3Ring(x,0.01,z,2*K,'#9dff4a',0.7); } }
  if(st==='root'){ const rk=iaEase(Math.min(1,S.s/1.2)); ia3Ring(base.x,0.01,base.z,(4+rk*16)*K,'#c38bff',0.7*(1-rk*0.3)); }
  if(hk&&g.visible){ for(let i=0;i<(soldier?6:5);i++){ const a=iaHash(i,Math.floor(S.s*2))*Math.PI*2, r=((1-hk)*7+1)*K, c2=soldier?(i%2?'#ffd23f':'#e2463a'):'#9dff4a';
      ia3Glow(chest.x+fw.x*M.w*0.2+Math.cos(a)*r,chest.y+Math.sin(a)*r*0.7,chest.z+fw.z*M.w*0.2+Math.sin(a*1.3)*r*0.5,2*K,c2,1); } }
  if(fall&&!(st==='up'&&fall<=0.2)){ const k=st==='up'?fall:Math.min(1,S.s/1.2), back=soldier?-1:0; const p=base.clone().addScaledVector(fw,back*M.h*0.45);
    const o=ia3Ball(p.x,0.004,p.z,(3+k*7)*K,soldier?'#5a0d0d':'#3d6b12',0.55*k*fade); o.scale.y=0.002; o.material.depthWrite=false; }
  if(st==='burst'&&S.s>=0.5){ const q=(S.s-0.5)/(S.d-0.5); for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, r=(3+q*14)*K; ia3Ball(base.x+Math.cos(a)*r,(6-Math.sin(a)*2)*K+q*4*K,base.z+Math.sin(a)*r*0.7,(2+q*4)*K,'#96e63c',0.5*(1-q)); } }
  if(dig&&st==='burrow'&&S.s<1.4||st==='rise'&&dig>0){ for(let i=0;i<6;i++){ const q=(t*2+i/6)%1; ia3Ball(base.x+(iaHash(i,5)-0.5)*28*K,(1+q*8)*K,base.z+(iaHash(i,6)-0.5)*10*K,1.2*K,'#8a7d68',0.6*(1-q)); } } }
/* ---------- structures, extras and relics: their 3D follows the clock of their own 2D scene in 21b ---------- */
/* the membrane seals a tunnel: rock on both sides of it, in its little world and as two blocks of rock in the picture */
function ia3Membrane(M){ const g=G, W=g.map.w; g.map.tiles=g.map.tiles||new Array(W*W).fill('.');
  for(const dx of [-1,1]){ g.block[IA3_Z*W+IA3_X+dx]=1; g.map.tiles[IA3_Z*W+IA3_X+dx]='#'; }
  const e=ia3Build('membrane',{ invuln:true, x:(IA3_X+0.5)*TILE, y:(IA3_Z+0.5)*TILE }); e.tx=IA3_X; e.ty=IA3_Z; g.ents.push(e); M.e=e; M.g=ia3Add(M,e);
  const rock=mat('#3b3e48'), rh=Math.min(tileH('#'),1.7); for(const dx of [-1,1]) M.root.add(part(GEO.lowball,rock,0.55,rh,0.7,IA3_X+0.5+dx*1.0,rh*0.45,IA3_Z+0.5));
  M.V=3.6; M.cy=0.8; M.cx=0.5; M.cz=0.5; }
/* the dropship (the Landing Zone and its own card): the 3D half of iaShipAt/iaShip2D in 21b. It is SHIP.size3d times its 2D art,
   as in a mission; sc is how big the 2D picture draws the art, so one pixel of art is as far in 2D as in 3D */
function ia3ShipMake(M,sc,zoom){ const k=SHIP.size3d; M.ship=v3Dropship(); M.ship.scale.setScalar(k); M.ship.traverse(o=>{ if(o.isMesh) o.receiveShadow=true; }); M.root.add(M.ship);
  M.man={ e:ia3Unit('trooper') }; M.man.g=ia3Add(M,M.man.e); M.man.g.scale.multiplyScalar(1.6);   /* a bit bigger than true size, so he reads next to the ship */ M.g=M.root; M.px=shipPx*k; M.k=M.px/sc; M.V=IA_BOX/zoom*M.k; M.cy=14*M.k; }
function ia3ShipPose(M,t){ const P=iaShipAt(t), S=M.ship, U=S.userData, k=SHIP.size3d, X=IA3_X+P.x*M.px, y=0.85*k+P.alt*M.px;
  S.visible=!P.gone; S.position.set(X,y,IA3_Z); S.rotation.set(0,0,P.pitch*0.45);
  for(const pod of U.pods){ pod.rotation.z=P.tilt*Math.PI/2; const L=(0.4+1.2*P.thrust*(0.85+0.15*Math.sin(t*40)))*(P.tilt>0.5?0.8:1.2); pod.userData.flame.scale.set(0.17,P.thrust>0.02?L:0.001,0.17); pod.userData.core.scale.set(0.08,P.thrust>0.02?L*0.6:0.001,0.08); }
  for(const l of U.legs3) l.scale.y=Math.max(0.01,P.legs);
  U.ramp.rotation.z=(1-P.ramp)*-0.62+P.ramp*0.78; U.red.visible=U.green.visible=Math.floor(t*2.5)%2===0;
  if(!P.gone&&P.thrust>0.4&&P.alt<14){ IA3.flashL.position.set(X,y-0.6*k,IA3_Z); IA3.flashL.intensity=2*P.thrust; IA3.flashL.color.set(0xffa860); IA3.flashL.distance=4*k;
    if(P.tilt>0.5) ia3Ring(X,0.03,IA3_Z,(10+P.alt)*M.px*1.4*2+Math.sin(t*20)*0.1,'#ffd9a0',0.4*(1-P.alt/14)); }
  if(P.beams&&P.alt>8) ia3Glow(X+2.2*k+P.alt*M.px*0.4,0.1,IA3_Z,3*k,'#fff0c8',0.3);
  const G2=M.man; G2.g.visible=P.man!=null&&P.manA>0; if(G2.g.visible){ G2.e.moving=P.walk; G2.e.x=(IA3_X+P.man*M.px)*TILE; G2.e.y=IA3_Z*TILE; if(!P.walk) G2.g.userData.yaw=-Math.PI/2; v3Pose(G2.e,G2.g,t);
    if(P.manA<1) G2.g.position.y-=(1-P.manA)*1.2; } }
const ia3Top=(M,f=1)=>ia3V(IA3_X,M.h*f,IA3_Z);
function ia3Smoke(x,y,z,t,n,K,col='#4a4d55',rise=28,sp=0.35){ for(let i=0;i<n;i++){ const q=(t*sp+i/n)%1; ia3Ball(x+Math.sin(q*4+i)*4*K,y+q*rise*K,z+Math.cos(q*3+i)*2*K,(2+q*5)*K,col,0.5*(1-q)); } }
const IA3_HOOKS = {
  hq:{ make(M){ M.e=ia3Build('hq'); M.g=ia3Add(M,M.e); M.V=4.2; M.cy=0.9; const n=BUILDINGS.hq.size||3, h=(n-1)/2, A=mat('#454a58'), B=mat('#3c404d');   /* its own tiles under it, as in 2D */
      for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const t=part(GEO.box,(i+j)%2?B:A,0.94,0.04,0.94,IA3_X+i-h,0.02,IA3_Z+j-h); t.castShadow=false; t.receiveShadow=true; M.root.add(t); } },
    pose:ia3PoseStill },
  membrane:{ make:ia3Membrane, pose(M,t){ M.e.flash=0; v3Pose(M.e,M.g,t); } },
  wreck:{ make(M){ M.e=ia3Build('wreck'); M.g=ia3Add(M,M.e); M.V=8; M.cy=1.4; }, pose(M,t){ v3Pose(M.e,M.g,t); ia3Glow(IA3_X+0.3,0.7,IA3_Z+0.2,1+0.3*Math.sin(t*9),'#ff8c28',0.4); ia3Smoke(IA3_X+0.3,0.8,IA3_Z,t,6,0.08); } },
  sentry:{ pose(M,t){ const e=M.e, cy=iaCyc(t,1.9), U=M.g.userData; e.angle=0; e.target=cy.s<0.5?(M.tgt||(M.tgt={ dead:false, x:e.x+60, y:e.y })):null;
    const n=Math.floor(cy.s/0.12), ph=(cy.s%0.12)/0.12, on=cy.s<0.5&&ph<0.5; e.recoil=on?0.08*(1-ph*2):0; v3Pose(e,M.g,t); M.g.updateMatrixWorld(true);
    if(on&&U.muzzle){ const mz=U.muzzle.getWorldPosition(ia3V(0,0,0)), fw=ia3V(1,0,0); ia3Glow(mz.x,mz.y,mz.z,0.35,'#ffdc78',0.9); const end=mz.clone().addScaledVector(fw,4); end.y+=(iaHash(n,cy.k)-0.5)*0.2; ia3Line(mz,end,'#ffe696',0.7);
      IA3.flashL.position.copy(mz); IA3.flashL.intensity=1.4; IA3.flashL.color.set(0xffc070); } } },
  barricade:{ pose(M,t){ const cy=iaCyc(t,2.2), e=M.e; e.flash=cy.s<0.15?0.1:0; v3Pose(e,M.g,t); M.g.position.x+=cy.s<0.15?0.03:0;
    if(cy.s<0.4) for(let i=0;i<5;i++){ const q=cy.s/0.4, a=-Math.PI*(0.2+iaHash(i,cy.k)*0.6); ia3Glow(IA3_X+0.52+Math.cos(a)*q*0.3,M.h*0.6-Math.sin(a)*q*0.3,IA3_Z+0.2,0.08,'#ffd23f',1-q); } } },
  relay:{ pose(M,t){ v3Pose(M.e,M.g,t); const p=ia3Top(M,0.95); for(let i=0;i<3;i++){ const q=(t*0.6+i/3)%1; ia3Ring(p.x,p.y,p.z,0.1+q*M.h*0.6,'#7fdfff',0.8-q); } } },
  generator:{ pose(M,t){ v3Pose(M.e,M.g,t); const cy=iaCyc(t,0.22), p=ia3V(IA3_X,M.h*0.9,IA3_Z+0.3); ia3Glow(p.x,p.y,p.z,1.4,'#ffe68c',0.15+0.1*Math.sin(t*20));
    if(iaHash(cy.k,1)<0.6){ let a=ia3V(IA3_X-0.5,M.h*1.05,IA3_Z+0.2); for(let i=0;i<5;i++){ const b=a.clone(); b.x+=0.22; b.y+=(iaHash(cy.k,i+2)-0.5)*0.3; ia3Line(a,b,'#bfefff',0.9); a=b; } } } },
  charge:{ pose(M,t){ const U=M.g.userData, p=(t%6)/6; v3Pose(M.e,M.g,t); if(U.blink) U.blink.visible=Math.sin(t*(6+p*20))>0;
    if(Math.sin(t*(6+p*20))>0){ const b=ia3Top(M,0.8); ia3Glow(b.x,b.y,b.z,0.35,'#ff503c',0.9); }
    const n=Math.max(1,Math.round((1-p)*48)), k='ia3arc'+n, top=ia3Top(M,1.25), o=ia3Ring(top.x,top.y,top.z,0.22,'#ffb347',0.9,false);
    o.geometry=GEO[k]||(GEO[k]=new THREE.RingGeometry(0.8,1,48,1,Math.PI/2,Math.PI*2*n/48)); o.rotation.set(0,INTEL3D.yaw,0); } },
  chargesite:{ make(M){ M.e=ia3Build('chargesite'); M.g=ia3Add(M,M.e); M.V=1.4; M.cy=0.3; }, pose(M,t){ v3Pose(M.e,M.g,t); ia3Ring(IA3_X,0.02,IA3_Z,0.35+0.15*Math.sin(t*3),'#ffb347',0.7); ia3Ball(IA3_X,0.02,IA3_Z,0.3,'#ffb347',0.25).scale.y=0.01; } },
  uplink:{ make(M){ M.e=ia3Build('uplink'); M.g=ia3Add(M,M.e); M.props.tr={ e:ia3Unit('trooper') }; M.props.tr.g=ia3Add(M,M.props.tr.e,-1.1,0.2); M.V=2.4; M.cy=0.8; },
    pose(M,t){ v3Pose(M.e,M.g,t); const T=M.props.tr; v3Pose(T.e,T.g,t); const p=(t%5)/5, n=Math.max(1,Math.round(Math.min(1,p/0.8)*48)), k='ia3arc'+n;
      ia3Ring(IA3_X,0.03,IA3_Z,0.95,'#ffffff',0.15); const o=ia3Ring(IA3_X,0.04,IA3_Z,0.95,p<0.8?'#ffb347':'#5fe3b0',0.9); o.geometry=GEO[k]||(GEO[k]=new THREE.RingGeometry(0.8,1,48,1,Math.PI/2,Math.PI*2*n/48)); o.rotation.set(-Math.PI/2,0,0);
      if(p>=0.8) ia3Glow(IA3_X,0.6,IA3_Z,1.6,'#5fe3b0',0.4); } },
  lz:{ make(M){ ia3ShipMake(M,0.6,1); M.e=ia3Build('lz'); M.pad=ia3Add(M,M.e); }, pose(M,t){ v3Pose(M.e,M.pad,t); M.pad.scale.setScalar(SHIP.size3d); ia3ShipPose(M,t); } },
  dropship:{ make(M){ ia3ShipMake(M,0.75,IA_CARD.bigZoom.dropship); }, pose:ia3ShipPose },
  medtent:{ pose(M,t){ v3Pose(M.e,M.g,t); ia3Glow(IA3_X,M.h*0.55,IA3_Z+0.5,0.9+0.2*Math.sin(t*1.5),'#ff5a50',0.25+0.15*Math.sin(t*1.5)); } },
  terminal:{ pose(M,t){ v3Pose(M.e,M.g,t); ia3Glow(IA3_X,M.h*0.7,IA3_Z+0.2,0.8,'#5fe3b0',0.15+0.1*Math.sin(t*6)+(iaHash(Math.floor(t*4),1)>0.35?0.15:0)); } },
  door:{ pose(M,t){ v3Pose(M.e,M.g,t); if(Math.sin(t*3)>0.3) ia3Glow(IA3_X+0.3,M.h*0.95,IA3_Z+0.52,0.35,'#ffb446',0.9); } },
  rubble:{ pose(M,t){ v3Pose(M.e,M.g,t); const cy=iaCyc(t,3.8); if(cy.s<1) for(let i=0;i<3;i++) ia3Ball(IA3_X-0.35+i*0.35,(1-cy.s*cy.s)*2.2,IA3_Z,0.06,'#6b6458');
    if(cy.s>0.9&&cy.s<2) ia3Ball(IA3_X,0.05,IA3_Z,0.4+(cy.s-0.9)*0.5,'#8a7d68',0.5*(2-cy.s)).scale.y=0.08; } },
  shaft:{ pose(M,t){ v3Pose(M.e,M.g,t); const cy=iaCyc(t,3.4); if(cy.s<1.4) for(let i=0;i<7;i++){ const q=cy.s/1.4; ia3Ball(IA3_X+(iaHash(i,cy.k)-0.5)*0.9,0.3+q*1.1*iaHash(i,5),IA3_Z+(iaHash(i,cy.k+3)-0.5)*0.5,0.1+q*0.2,'#8a7d68',0.5*(1-q)); } } },
  egg:{ pose(M,t){ const cy=iaCyc(t,3.5), open=cy.p<0.5?0:Math.sin((cy.p-0.5)*2*Math.PI); M.e.openT=open>0?EGG.open*(1-open):null; v3Pose(M.e,M.g,t);
    if(open>0){ ia3Glow(IA3_X,M.h*0.6,IA3_Z,0.5+open*0.4,'#a6ff4a',0.3+open*0.4); } if(open>0.5) for(let i=0;i<3;i++){ const q=(t*1.5+i/3)%1; ia3Ball(IA3_X-0.1+i*0.1,M.h*(1-q*0.7),IA3_Z+0.15,0.02,'#a6ff4a',0.8); } } },
  hive:{ pose(M,t){ v3Pose(M.e,M.g,t); for(let i=0;i<4;i++){ const q=(t*0.4+i/4)%1; ia3Ball(IA3_X-0.7+iaHash(i,3)*1.4,M.h*0.2+q*M.h*1.1,IA3_Z+0.4,0.03,'#c38bff',1-q); } } },
  choirpod:{ pose(M,t){ v3Pose(M.e,M.g,t); for(let i=0;i<3;i++){ const q=(t*0.5+i/3)%1; ia3Ring(IA3_X,M.h*0.5,IA3_Z,0.1+q*1.2,'#c38bff',0.8-q); } } },
  mortar:{ make(M){ M.e=ia3Build('mortar'); M.g=ia3Add(M,M.e,-0.9,0); M.g.rotation.y=-Math.PI/2; M.V=3; M.cy=0.7; M.cx=0.2; },
    pose(M,t){ const e=M.e, cy=iaCyc(t,2.8), p=cy.p, U=M.g.userData; v3Pose(e,M.g,t); M.g.rotation.y=-Math.PI/2; M.g.updateMatrixWorld(true);
      const mz=U.tube?U.tube.localToWorld(ia3V(0,0.78,0)):ia3V(IA3_X-0.9,0.8,IA3_Z), tp=ia3V(IA3_X+1.4,0,IA3_Z);
      if(p<0.08){ ia3Glow(mz.x,mz.y,mz.z,0.6,'#ffd278',0.9); IA3.flashL.position.copy(mz); IA3.flashL.intensity=1.2; }
      for(let i=0;i<4;i++){ const q=p*4-i*0.15; if(q<=0||q>1) continue; ia3Ball(mz.x-q*0.2,mz.y+q*0.5,mz.z,0.08+q*0.15,'#9a9a9a',0.5*(1-q)); }
      if(p>=0.06&&p<0.7){ const k=(p-0.06)/0.64, b=mz.clone().lerp(tp,k); b.y+=Math.sin(k*Math.PI)*1.8; ia3Ball(b.x,b.y,b.z,0.06,'#0a0b10',1); ia3Glow(b.x,b.y,b.z,0.15,Math.floor(t*14)%2?'#ff5a4f':'#6f8240',0.7);
        ia3Ring(tp.x,0.02,tp.z,0.32+Math.sin(t*14)*0.03,'#ff5a4f',0.5+0.4*k); }
      if(p>=0.7&&p<0.95){ const q=(p-0.7)/0.25; ia3Glow(tp.x,0.25,tp.z,1.2*(1-q*0.5),'#ff8c3c',0.9*(1-q)); IA3.flashL.position.set(tp.x,0.4,tp.z); IA3.flashL.intensity=1.5*(1-q);
        for(let i=0;i<7;i++){ const a=iaHash(cy.k,i)*Math.PI, r=q*0.8; ia3Ball(tp.x+Math.cos(a)*r,Math.sin(a)*r*1.2-q*q*0.4+0.05,tp.z+(iaHash(i,cy.k)-0.5)*0.4,0.04,i%2?'#ffd23f':'#8a7a6a'); } } } },
  relaypad:{ make(M){ const g=new THREE.Group(), dark=mat('#2b2a1a'), yel=mat('#ffd23f'), blk=mat('#1a1a12'); g.add(box(dark,2,0.06,2,0,0.03,0));
      for(let i=0;i<8;i++) for(const s of [-1,1]){ g.add(box(i%2?blk:yel,0.25,0.07,0.12,-0.875+i*0.25,0.035,s*0.94)); g.add(box(i%2?blk:yel,0.12,0.07,0.25,s*0.94,0.035,-0.875+i*0.25)); }
      g.position.set(IA3_X,0,IA3_Z); M.root.add(g); M.g=g; M.V=2.4; M.cy=0.3; },
    pose(M,t){ ia3Glow(IA3_X,0.15,IA3_Z,1.6+0.3*Math.sin(t*2),'#ffd23f',0.22); } },
  salvage:{ make(M){ M.e=ia3Ent({ kind:'crate' }); M.g=ia3Add(M,M.e); M.V=1; M.cy=0.25; },
    pose(M,t){ v3Pose(M.e,M.g,t); M.g.position.y=0.03+Math.sin(t*2)*0.025; const g2=(t%2.2)/2.2; if(g2<0.25) ia3Glow(IA3_X-0.18+g2/0.25*0.36,0.25,IA3_Z+0.15,0.15,'#ffffff',1-g2/0.25);
      ia3Glow(IA3_X+0.15,0.5+((t*8)%6)*0.02,IA3_Z,0.12,'#ffd23f',0.6+0.4*Math.sin(t*2)); } },
  stabcase:{ make(M){ M.e=ia3Ent({ kind:'crate', rogue:true, stab:true }); M.g=ia3Add(M,M.e); M.V=1; M.cy=0.25; },
    pose(M,t){ v3Pose(M.e,M.g,t); M.g.position.y=0.03+Math.sin(t*2.2)*0.03; ia3Glow(IA3_X,0.2,IA3_Z,0.6,'#7fdfff',0.2); const g2=(t%2.5)/2.5; if(g2<0.3) ia3Glow(IA3_X-0.2+g2/0.3*0.4,0.18,IA3_Z+0.16,0.15,'#ffffff',1-g2/0.3); } },
  heart:{ make(M){ M.e=ia3Ent({ kind:'crate', rogue:true, heart:true }); M.g=ia3Add(M,M.e); }, pose:ia3PoseStill },
  'vial:':{ make(M,key){ const col=key.slice(5); M.col=col; M.e=ia3Ent({ kind:'crate', rogue:true, dna:col==='#c38bff'?'hive':'feral' }); M.g=ia3Add(M,M.e); M.V=0.9; M.cy=0.3; },
    pose(M,t){ v3Pose(M.e,M.g,t); M.g.position.y=0.06+Math.sin(t*2)*0.035; for(let i=0;i<3;i++){ const q=(t*0.9+i/3)%1; ia3Ball(IA3_X-0.03+i*0.03,M.g.position.y+0.08+q*0.3,IA3_Z,0.012,'#e8ffd0',1-q); } } },
  'art:':{ make(M,key){ const a=key.slice(4), r=typeof RELICS!=='undefined'&&RELICS.find(x=>relicArt(x)===a); if(!r) return; M.e=ia3Ent({ kind:'crate', relic:r.id, egg:r.kind==='egg' }); M.g=ia3Add(M,M.e); },
    pose(M,t){ v3Pose(M.e,M.g,t); const U=M.g.userData, g2=(t%3)/3; if(U.glint){ U.glint.visible=g2<0.2; if(g2<0.2) U.glint.scale.setScalar(RELIC3D.glintSize*Math.sin(g2/0.2*Math.PI)); } } },
  raiders:{ make(M){ M.crew=[]; [['pyro',0,0],['trooper',-0.55,-0.35],['trooper',-0.55,0.35]].forEach(([ty,dx,dz])=>{ const e=ia3Unit(ty,true); e.moving=true; M.crew.push({ e, g:ia3Add(M,e,dx+0.25,dz) }); }); M.g=M.root; M.V=2.2; M.cy=0.6; },
    pose(M,t){ const cy=iaCyc(t,4.5); M.crew.forEach((c,i)=>{ c.e.moving=true; c.g.userData.px=c.e.x-1; v3Pose(c.e,c.g,t); const gone=i===2&&cy.s>2.2&&cy.s<4.2; c.g.visible=!gone;
        if(gone&&cy.s<3.2){ const q=cy.s-2.2; for(let j=0;j<6;j++) ia3Ball(c.g.position.x+(iaHash(j,cy.k)-0.5)*0.5,0.4+q*0.4*iaHash(j,2),c.g.position.z+(iaHash(j,cy.k+5)-0.5)*0.4,0.18+q*0.25,'#8b8f99',0.7*(1-q)); } });
      for(let i=0;i<5;i++){ const q=(t*1.2+i/5)%1; ia3Ball(IA3_X-0.9-q*0.7,0.05+q*0.18,IA3_Z+(iaHash(i,2)-0.5)*0.6,0.06+q*0.12,'#8a7d68',0.35*(1-q)); } } },
  veil:{ make(M){ M.e=ia3Unit('trooper',true); M.g=ia3Add(M,M.e); M.mats=[]; M.g.traverse(o=>{ if(o.isMesh&&o.material&&!o.material.transparent){ o.material=o.material.clone(); v3Fogify(o.material); o.material.transparent=true; M.mats.push(o.material); } }); M.V=1.6; M.cy=0.6; },
    pose(M,t){ v3Pose(M.e,M.g,t); const a=0.45+0.25*Math.sin(t*2); M.mats.forEach(m=>m.opacity=a); ia3Glow(IA3_X,0.65,IA3_Z,1.6,'#c38bff',0.35);
      for(let i=0;i<12;i++){ if(i%2) continue; const a0=i/12*Math.PI*2; ia3Ball(IA3_X+Math.cos(a0+t*0.3)*0.5,0.01,IA3_Z+Math.sin(a0+t*0.3)*0.5,0.03,'#c38bff',0.8).scale.y=0.005; }
      for(let i=0;i<4;i++){ const q=(t*0.6+i/4)%1; ia3Ball(IA3_X-0.25+i*0.15,0.3+q*0.9,IA3_Z,0.02,'#c38bff',1-q); } } },
  taint:{ make(M){ M.e=ia3Unit('trooper',true); M.g=ia3Add(M,M.e,-0.3,0); M.V=1.7; M.cy=0.6; },
    pose(M,t){ const e=M.e, cy=iaCyc(t,2.4), look=iaCyc(t,5.3), face=look.p>0.82&&look.p<0.9?-1:1, firing=face>0&&cy.s<0.45, U=M.g.userData;
      e.target=firing||face<0?(M.tgt||(M.tgt={ dead:false })):null; if(M.tgt){ M.tgt.x=e.x+face*30; M.tgt.y=e.y; } v3Pose(e,M.g,t); M.g.updateMatrixWorld(true);
      const n=Math.floor(cy.s/0.13), ph=(cy.s%0.13)/0.13; if(firing&&ph<0.45&&U.gun){ const mz=U.gun.localToWorld(ia3V(0,0,0.45)); ia3Glow(mz.x,mz.y,mz.z,0.3,'#ffdc78',0.9); ia3Line(mz,mz.clone().add(ia3V(2,(iaHash(n,cy.k)-0.5)*0.1,0)),'#ffe696',0.7); IA3.flashL.position.copy(mz); IA3.flashL.intensity=1.4; }
      const g2=0.3+0.3*Math.sin(t*1.7); ia3Glow(IA3_X-0.3,0.7,IA3_Z+0.08,0.5,'#8dff4a',g2); } }
};
/* ---------- drawing ---------- */
/* one frame of one card: pose, lay out the effects, render, copy into the card's canvas */
function ia3Draw(cv,t){ if(!ia3Init()) return false; const M=ia3Model(cv._key); if(!M) return false;
  const r=IA3.r, W=cv.width, H=cv.height; if(IA3.w!==W||IA3.h!==H){ r.setSize(W,H,false); IA3.w=W; IA3.h=H; }
  for(const [k,m] of IA3.models) if(m) m.root.visible=m===M;
  ia3FxBegin(); const s=ia3Swap(t);
  try{ M.pose(M,t); ia3FxEnd(); ia3Camera(M,W/H); r.render(IA3.scene,IA3.cam); }catch(e){ M.err=e.message; } finally{ ia3Unswap(s); }
  const c=cv.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.drawImage(r.domElement,0,0,W,H); return true; }
/* the card's picture box gets a second canvas for the 3D model and a line that names the state (intelAnimMount in 21b calls this) */
function ia3Ok(key){ return !!(key&&ia3Init()&&ia3Model(key)); }
function ia3Mount(pic,cv2d,big){ const key=pic.dataset.anim, card=pic.closest('.icard'); if(!key||!card||!ia3Ok(key)) return;
  card.classList.add('dual3d'); card.classList.toggle('wide3d',!!big); pic.classList.add('dual');
  const W=parseInt(cv2d.style.width)||80, H=parseInt(cv2d.style.height)||W, dpr=Math.min(2,window.devicePixelRatio||1), cv=document.createElement('canvas');
  cv.className='ianim3d'; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px'; cv.setAttribute('aria-hidden','true'); cv._key=key;
  const lab=document.createElement('div'); lab.className='ia-state'; lab.setAttribute('aria-hidden','true'); const P=iaPlan(key); lab.hidden=!P; cv._lab=lab; cv._plan=P;
  pic.appendChild(cv); pic.appendChild(lab); ia3Tick(cv,iaReduce()?1.3:performance.now()/1000); }
function ia3Tick(cv,t){ ia3Draw(cv,t); const P=cv._plan; if(P&&cv._lab){ const S=iaAt(P,t); if(cv._lab._st!==S.i){ cv._lab._st=S.i;
    cv._lab.innerHTML=`<b>${S.lab}</b><i>${P.L.map((x,i)=>i===S.i?'●':'○').join('')}</i>`; } } }
