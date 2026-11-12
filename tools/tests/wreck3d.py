# The crashed Osprey in 3D (Nov 2026): the dropship nose-first in the ground, broken in two, a wing torn off, OSPREY / LC-71 on the hull;
# smoke plumes from several spots, sparks, small flames from the bent pod, a glow and a light in the crack; the 2D wreck smoke is not drawn flat in 3D.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
dark=len(sys.argv)>1 and sys.argv[1]=='dark'
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hollow-colony')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    J(pg,"""()=>{ const G=__hc.G; G.devReveal=true; computeFog(); for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      const w=G.ents.find(e=>e.type==='wreck'); window._w=w; ui.follow=false; G.following=false; centerOn(w.x,w.y); G.devPause=true; window._T=performance.now();
      window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/30); _T+=1000/30; render(_T); } }; _step(3); }""")
    r=J(pg,"""()=>{ const g=V3.objs.get(_w), U=g&&g.userData; if(!U) return null; let meshes=0; g.traverse(o=>{ if(o.isMesh) meshes++; });
      const tex=['wreckTex0','wreckTex1','wreckTex2','wreckTex3'].every(k=>MAT[k]&&MAT[k].map);
      const nose=U.nose.getWorldPosition(new THREE.Vector3()), rear=U.rearSmoke.getWorldPosition(new THREE.Vector3());
      return [!!U.wreck, meshes, tex, +(nose.y-v3H(nose.x,nose.z)).toFixed(2), +(rear.y-v3H(rear.x,rear.z)).toFixed(2)]; }""")
    print('model',r)
    check('the wreck model is built (many parts, both hull textures)', r and r[0] and r[1]>=60 and r[2], r)
    check('nose low in the mound, tail up in the air', r and r[3]<0.6 and r[4]>r[3]+0.3, r)
    r=J(pg,"""()=>{ const g=V3.objs.get(_w); const sm=V3.smoke.filter(s=>s.life&&Math.hypot(s.x-g.position.x,s.z-g.position.z)<3);
      const ys=sm.map(s=>s.y+s.t/s.life*s.rise*s.sz); const xs=sm.map(s=>s.x), zs=sm.map(s=>s.z);
      const flat=__hc.G.fx.filter(f=>f.wr).length;
      const shown=V3.fxPool.filter(s=>s.visible&&Math.hypot(s.position.x-g.position.x,s.position.z-g.position.z)<4);
      const orange=shown.filter(s=>s.material.blending===THREE.AdditiveBlending&&s.material.color.r>0.7&&s.material.color.b<0.4).length;
      const lit=V3.lights.some(l=>l.intensity>0&&l.color.r>0.9&&l.color.b<0.4&&Math.hypot(l.position.x-g.position.x,l.position.z-g.position.z)<3);
      return [sm.length, +(Math.max(...ys)-Math.min(...ys)).toFixed(2), +(Math.max(...xs)-Math.min(...xs)+Math.max(...zs)-Math.min(...zs)).toFixed(2), V3.sparks.length, orange, lit, flat]; }""")
    print('fx',r)
    check('smoke plumes that rise and come from several spots', r[0]>=25 and r[1]>2 and r[2]>1.5, r)
    check('sparks flying', r[3]>=3, r)
    check('flames and glow (orange, additive)', r[4]>=5, r)
    check('a light in the crack', r[5], r)
    check('the 2D wreck smoke still runs (for 2D) but is tagged', r[6]>=1, r)
    for (yaw,name) in [(0,'a'),(140,'b'),(250,'c')]:
        J(pg,f"()=>{{ V3.yaw={yaw}; VIEW3D.dist=8; _step(0.2); }}"); pg.wait_for_timeout(100); pg.screenshot(path=f'/tmp/wreck_{name}.png')
    J(pg,"()=>{ V3.yaw=0; VIEW3D.dist=17; _step(0.2); }"); pg.screenshot(path='/tmp/wreck_far.png')
    # 2D unchanged
    pg.keyboard.press('F3'); pg.wait_for_timeout(300); J(pg,"()=>_step(0.1)"); pg.screenshot(path='/tmp/wreck_2d.png')
    r=J(pg,"()=>V3.on"); check('back in 2D', not r, r)
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
