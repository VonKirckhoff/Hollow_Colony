# The 3D Sentry Gun (Nov 2026): tripod with feet and spikes, ammo box and cable, turret with plates, LC stencil, jacketed barrel, drum,
# lens, dish and antenna; unfolds and folds; recoil, muzzle flash and casings; scans with no target; a plate flies off below 50%,
# sparks and smoke below 25%, the plate comes back once repaired.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':900,'height':560})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS[0]); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    J(pg,"""()=>{ const G=__hc.G; G.devReveal=true; for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      const P0=G.ents.find(e=>e.kind==='unit'&&e.faction==='corps'); const s=makeBuilding('sentry','corps',Math.floor(P0.x/TILE)+3,Math.floor(P0.y/TILE),true); window._s=s;
      ui.follow=false; G.following=false; centerOn(s.x,s.y); G.devPause=true; window._T=performance.now(); computeFog();
      window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/20); _T+=1000/20; render(_T); } }; _step(0.3); }""")
    print('built',flush=True)
    r=J(pg,"""()=>{ const g=V3.objs.get(_s), U=g&&g.userData; if(!U) return null; let m=0; g.traverse(o=>{ if(o.isMesh) m++; });
      return [!!U.sentry, m, U.legs.length, !!(MAT.sentryTexlc&&MAT.sentryTexlc.map), !!MAT.sentryTexjacket, +U.hub.position.y.toFixed(2), U.cable.visible, U.ext.every(o=>o.visible), +U.top.toFixed(2)]; }""")
    print('model',r)
    check('the sentry model is built (many parts, three legs, LC and jacket textures)', r and r[0] and r[1]>=70 and r[2]==3 and r[3] and r[4], r)
    check('standing up: hub high, cable, dish and antenna shown, a bit taller than before', r[5]>0.4 and r[6] and r[7] and r[8]>0.9, r)
    # scanning with no target
    r=J(pg,"""()=>{ const U=V3.objs.get(_s).userData; SENTRY3D.scanDelay=0.3; SENTRY3D.scanSpeed=2; _s.target=null; _step(1.2); const ys=[]; for(let i=0;i<8;i++){ _step(0.2); ys.push(U.turret.rotation.y); } const d0=U.dishA; _step(0.5);
      return [+(Math.max(...ys)-Math.min(...ys)).toFixed(2), +(U.dishA-d0).toFixed(2)]; }""")
    check('it scans left and right with no target, the dish turns', r[0]>0.6 and r[1]>0.3, r)
    # firing: recoil, flash, casings
    r=J(pg,"""()=>{ const G=__hc.G, U=V3.objs.get(_s).userData; const t=makeUnit('drone','swarm',_s.x+4*TILE,_s.y); t.hp=t.maxHp=99999; computeFog();
      let rec=0, fl=0, cas=0, aim=null; for(let i=0;i<30;i++){ _step(1/20); if(U.gun.position.z<U.gz-0.01) rec++; if(U.flashT>0) fl++; cas=Math.max(cas,V3.bits.length); }
      const want=Math.atan2(Math.cos(_s.angle),Math.sin(_s.angle)); aim=Math.abs(Math.atan2(Math.sin(U.turret.rotation.y-want),Math.cos(U.turret.rotation.y-want)));
      const lit=V3.lights.some(l=>l.intensity>0&&l.color.g>0.6&&l.color.b<0.6); window._t=t; return [rec,fl,cas,+aim.toFixed(2)]; }""")
    print('fire',r)
    check('recoil and muzzle flash while it fires', r[0]>=2 and r[1]>=2, r)
    check('casings fly out', r[2]>=1, r)
    check('aims straight at the target (no scanning)', r[3]<0.15, r)
    pg.screenshot(path='/tmp/s3/fire.png')
    J(pg,"()=>{ _t.dead=true; _step(1.2); }")
    r=J(pg,"()=>V3.bits.filter(b=>!b.flat).length")
    check('casings are cleaned up', r==0, r)
    # damage
    r=J(pg,"""()=>{ const U=V3.objs.get(_s).userData; _s.hp=_s.maxHp*0.45; _step(0.2); const flying=V3.bits.filter(b=>b.flat).map(b=>b.o.position.y); const vis=U.plate.visible;
      _step(3); const rested=V3.bits.filter(b=>b.flat&&b.rest).length;
      _s.hp=_s.maxHp*0.2; const s0=V3.smoke.length; _step(1); const sm=V3.smoke.length-s0, sp=V3.sparks.length;
      _s.hp=_s.maxHp; _step(0.2); return [vis, flying.length, rested, sm, sp, U.plate.visible]; }""")
    print('damage',r)
    check('below 50% a plate flies off and lands', (not r[0]) and r[1]==1 and r[2]==1, r)
    check('below 25% smoke and sparks', r[3]>=2 and r[4]>=1, r)
    check('repaired: the plate is back', r[5], r)
    # unfold and fold
    r=J(pg,"""()=>{ const U=V3.objs.get(_s).userData; sentryUnfolds(_s); _step(0.05); const h0=U.hub.position.y, gx0=U.gun.rotation.x, c0=U.cable.visible;
      _step(ANIM.unfold+0.2); const h1=U.hub.position.y, gx1=U.gun.rotation.x; _s.packing=0.9; _step(0.05); const h2=U.hub.position.y; _s.packing=0; _step(0.05);
      return [+h0.toFixed(2),+h1.toFixed(2),+h2.toFixed(2),+gx0.toFixed(2),+gx1.toFixed(2),c0]; }""")
    print('unfold',r)
    check('unfolds: starts low, barrel down, ends up standing, barrel level', r[0]<0.2 and r[1]>0.4 and r[3]>0.5 and abs(r[4])<0.05 and not r[5], r)
    check('packing folds it down again', r[2]<0.25, r)
    for (yaw,dist,name) in [(0,6,'a'),(120,5,'b'),(230,9,'c')]:
        J(pg,f"()=>{{ V3.yaw={yaw}; VIEW3D.dist={dist}; _step(0.1); }}"); pg.wait_for_timeout(100); pg.screenshot(path=f'/tmp/s3/sentry_{name}.png')
    J(pg,"()=>{ _s.hp=_s.maxHp*0.2; V3.yaw=40; VIEW3D.dist=6; _step(1.2); }"); pg.screenshot(path='/tmp/s3/sentry_hurt.png')
    J(pg,"()=>{ VIEW3D.dist=17; V3.yaw=0; _s.hp=_s.maxHp; _step(0.2); }"); pg.screenshot(path='/tmp/s3/sentry_far.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(300); J(pg,"()=>_step(0.1)")
    check('back in 2D', not J(pg,"()=>V3.on"))
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
