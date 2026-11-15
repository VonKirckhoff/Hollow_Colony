# The 3D dropship (Nov 2026): shaped after the 2D sprite, rounded (lathe hull, oval section, blunt nose), swept wings, round pods on
# the wing tips, canted tail fins, bubble canopy, hatch, stripes; every solid part casts a shadow; legs, ramp (shut along the tail,
# open down to the ground), pods turning down, flames; parked, landing (in the air) and taking off.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1000,'height':620})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>localStorage.setItem('hc-view3d','true')")
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='dead-signal')); }"); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"""()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; const G=__hc.G; G.devReveal=true;
      for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      window._b=G.ents.find(e=>e.def&&e.def.reinforce&&!e.dead); ui.follow=false; G.following=false; centerOn(_b.x,_b.y); G.devPause=true; window._T=performance.now(); computeFog();
      _b.ship={ phase:'parked', t:2.6, ang:0 }; window._lock={x:_b.x,y:_b.y}; G.show=null; G.showQ=[]; ui.mouse.inWin=false;
      window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/20); if(window._lock){ G.cam.x=_lock.x-ui.vw/2; G.cam.y=_lock.y-(ui.vh-ui.hudH)/2; } _T+=1000/20; render(_T); } }; _step(0.2); }""")
    if not J(pg,"()=>V3.on"): pg.keyboard.press('F3'); pg.wait_for_timeout(400); J(pg,"()=>_step(0.1)")
    J(pg,"()=>{ const G=__hc.G; G.show=null; G.showQ=[]; ui.mouse.inWin=false; centerOn(_b.x,_b.y); _step(0.1); }")
    r=J(pg,"""()=>{ const g=V3.ships.get(_b.id+':0'); if(!g) return null; const U=g.userData; let m=0, cast=0, solid=0; g.traverse(o=>{ if(!o.isMesh) return; m++; if(o.material.type!=='MeshBasicMaterial'){ solid++; if(o.castShadow) cast++; } });
      const bb=new THREE.Box3().setFromObject(g), s=bb.getSize(new THREE.Vector3());
      return [!!U.dropship, m, solid, cast, U.pods.length, U.legs3.length, +s.x.toFixed(2), +s.z.toFixed(2), !!GEO.shipHull.attributes.color]; }""")
    print('model',r)
    check('the rounded dropship is built (lathe hull with colours, two pods, four legs)', r and r[0] and r[1]>=50 and r[4]==2 and r[5]==4 and r[8], r)
    check('every solid part casts a shadow', r and r[2]==r[3], r)
    check('about the size of the 2D sprite (56×40 px at 2.6 → ~4 × ~2.9 tiles)', r and 3.6<r[6]<4.6 and 2.5<r[7]<3.3, r)
    r=J(pg,"""()=>{ const g=V3.ships.get(_b.id+':0'), U=g.userData; g.updateMatrixWorld(true); const e=new THREE.Vector3(-0.62,0,0); U.ramp.localToWorld(e);
      return [+(e.y-v3H(_b.x/TILE,_b.y/TILE)).toFixed(2), +U.ramp.rotation.z.toFixed(2)]; }""")
    print('ramp',r)
    check('parked: the ramp reaches the ground', r and abs(r[0])<0.15, r)
    for (yaw,dist,name) in [(0,8,'a'),(120,6,'b'),(220,7,'c'),(300,9,'d')]:
        J(pg,f"()=>{{ V3.yaw={yaw}; VIEW3D.dist={dist}; _step(0.1); }}"); pg.wait_for_timeout(100); pg.screenshot(path=f'/tmp/s3/ship_{name}.png')
    J(pg,"()=>{ for(const u of __hc.G.ents) if(u.kind==='unit'){ u.x+=30*TILE; u.y+=6*TILE; } const st=document.createElement('style'); st.id='nohud'; st.textContent='#msgs,#messages,.msg,.dialog,#dialog,#log{display:none!important}'; document.head.appendChild(st); }")
    for (yaw,pitch,name) in [(0,85,'top'),(0,25,'side1'),(180,25,'side2')]:
        J(pg,f"()=>{{ window._p0=window._p0||VIEW3D.pitch; V3.yaw={yaw}; V3.yawR={yaw}*Math.PI/180; VIEW3D.pitch={pitch}; VIEW3D.dist=6.5; _step(0.1); }}"); pg.wait_for_timeout(100); pg.screenshot(path=f'/tmp/s3/ship_{name}.png')
    J(pg,"()=>{ VIEW3D.pitch=_p0; document.getElementById('nohud').remove(); }")
    J(pg,"()=>{ V3.yaw=0; VIEW3D.dist=8; _b.ship={ phase:'takeoff', t:2.2, out:-0.8 }; _step(0.5); }"); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s3/ship_lift.png')
    r=J(pg,"()=>{ const g=V3.ships.get(_b.id+':0'); return g&&[g.visible, +g.userData.ramp.rotation.z.toFixed(2), g.userData.pods[0].userData.flame.scale.y>0.1]; }")
    check('taking off: ramp shut along the tail, flames on', r and r[0] and r[1]<-0.5 and r[2], r)
    J(pg,"()=>{ _step(0.9); }"); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s3/ship_fly.png')
    J(pg,"()=>{ _b.ship=null; _b.flight={ t:3, total:25, cargo:[], ang:-1.2 }; _step(0.1); }"); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s3/ship_land.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(300); J(pg,"()=>_step(0.1)")
    check('back in 2D', not J(pg,"()=>V3.on"))
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
