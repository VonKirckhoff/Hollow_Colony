# A hive's death in 3D (Nov 2026): the last scream of 2D (HIVE_DEATH) also plays in the 3D view:
# the hive shakes, its heart races, green rings fly out, its last brood scuttles away, it caves in flat and dark,
# a scar stays, smoke rises, and everything is cleaned up when the fx ends. --shots for screenshots.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
shots='--shots' in sys.argv
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':900,'height':640})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, h=G.ents.find(e=>!e.dead&&e.type==='hive'); if(!h) return null; window._h=h; G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(h.x,h.y);
      G.paused=true; for(let i=0;i<3;i++) render(performance.now()+i*16); const had=!!V3.objs.get(h); kill(h,null);
      window._f=G.fx.find(f=>f.k==='hivedeath'); render(performance.now()); const g=V3.dying.get(_f);
      return [v3Active(), had, !!_f, !!g, g&&g.userData.rings.length, g&&g.userData.brood.length]; }""")
    check('3D on, hive model, hive dies, dying model built', r and r[0] and r[1] and r[2] and r[3], r)
    check('rings and fleeing brood as in HIVE_DEATH', r and r[4]==3 and r[5]==7, r)
    # pose at a given moment of the death (tt seconds after it started)
    def at(tt):
        return J(pg,"""()=>{ _f.t=_f.max-%s; render(performance.now()); const g=V3.dying.get(_f), U=g&&g.userData; if(!U) return null; const hv=U.hive;
          return { vis:g.visible, hive:hv.visible, sy:+hv.scale.y.toFixed(2), sx:+hv.scale.x.toFixed(2), jit:+Math.hypot(hv.position.x,hv.position.z).toFixed(3), dark:+(U.cols[0].m.color.r/U.cols[0].c.r).toFixed(2),
            heart:U.heart?+U.heart.scale.x.toFixed(3):0, rings:U.rings.filter(r=>r.visible).length, ringR:+Math.max(0,...U.rings.filter(r=>r.visible).map(r=>r.scale.x)).toFixed(2),
            brood:U.brood.filter(c=>c.visible).length, far:+Math.max(0,...U.brood.filter(c=>c.visible).map(c=>Math.hypot(c.position.x,c.position.z))).toFixed(2), scar:U.scar.visible,
            smoke:V3.fxPool.filter(s=>s.visible&&s.material.blending===THREE.NormalBlending).length }; }"""%tt)
    a=at(0.1); s=at(1.5); f1=at(2.35); f2=at(2.7); e=at(3.3)
    print(a); print(s); print(f1); print(f2); print(e)
    check('screaming: shakes harder over time', a['jit']<=s['jit'] and s['jit']>0.02, (a['jit'],s['jit']))
    check('screaming: rings fly out and grow', a['rings']>=1 and s['rings']>=0 and at(0.6)['ringR']>a['ringR'], '')
    check('screaming: heart races (bigger than at rest)', max(at(0.5)['heart'],at(0.52)['heart'],at(0.54)['heart'],at(0.56)['heart'])>0.4, '')
    check('brood scuttles away', s['brood']>=1 and at(2.0)['far']>at(0.6)['far'], '')
    check('caving in: flat, wide and dark', f1['sy']<0.5 and f1['sx']>1.05 and f1['dark']<0.5, f1)
    check('no rings after the scream', f1['rings']==0, f1)
    check('afterwards: the mound is gone, a scar stays', not f2['hive'] and f2['scar'], f2)
    check('smoke plumes rise', s['smoke']>0 and f1['smoke']>0, (s['smoke'],f1['smoke']))
    if shots:
        J(pg,"()=>{ VIEW3D.dist=12; }")
        for tt,n in [(0.9,'a'),(1.7,'b'),(2.3,'c'),(2.9,'d')]:
            at(tt); pg.wait_for_timeout(50); J(pg,"()=>{ _f.t=_f.max-%s; render(performance.now()); }"%tt); pg.screenshot(path='/home/claude/hivedeath_%s.png'%n)
    # unseen ground: nothing shows
    r=J(pg,"""()=>{ const G=__hc.G, k=Math.floor(_f.y/TILE)*G.map.w+Math.floor(_f.x/TILE), was=G.seen[k]; G.seen[k]=0; _f.t=_f.max-1; render(performance.now()); const v=V3.dying.get(_f).visible; G.seen[k]=was; return v; }""")
    check('hidden where the map was never seen', r==False, r)
    # the fx ends: the model is removed
    r=J(pg,"""()=>{ const G=__hc.G; G.fx=G.fx.filter(f=>f!==_f); render(performance.now()); return [V3.dying.size, V3.g.children.includes(V3.dying.get(_f))]; }""")
    check('cleaned up when it ends', r[0]==0, r)
    # back to 2D and in again while one is dying: no errors
    J(pg,"()=>{ const G=__hc.G; G.paused=false; const h=G.ents.find(e=>!e.dead&&e.type==='hive'); if(h) kill(h,null); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(400); pg.keyboard.press('F3'); pg.wait_for_timeout(1500)
    r=J(pg,"()=>[v3Active(), V3.dying.size]")
    check('switching 2D/3D during a death', r[0], r)
    for _ in range(30):   # swiftshader is slow: wait for the game clock, not the wall clock
        pg.wait_for_timeout(500); r=J(pg,"()=>[V3.dying.size, __hc.G.fx.some(f=>f.k==='hivedeath')]")
        if not r[1]: break
    check('all gone after the fx', r[0]==0 and not r[1], r)
    check('no errors', not errs, errs[:3])
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
