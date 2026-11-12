# The hive in 3D (Nov 2026): the root bulb of 2D. Folds, roots with rootlets and sap, sprout and bud, mushrooms and spores;
# hurt below 66% / 33% (withered roots without sap, cracks, sagging and a dim bud), sap moves, and a dying hive takes the worst look.
# --shots for screenshots.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':900,'height':640})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, h=G.ents.find(e=>!e.dead&&e.type==='hive'); window._h=h; G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(h.x,h.y);
      G.paused=true; render(performance.now()); const g=V3.objs.get(h), U=g&&g.userData; window._g=g; if(!U) return null;
      return [v3Active(), U.hive, U.folds.length, U.roots.length, U.roots.every(r=>r.parts.length==2&&r.sap.length==HIVE3D.sap), !!U.sprout, !!U.budGlow, U.spores.length, U.cracks.length, !!U.heart, U.puffs.length>0]; }""")
    check('3D on, hive model', r and r[0] and r[1], r)
    check('7 folds, 7 roots with rootlet and sap, sprout and bud, spores, 8 cracks, heart, puffs', r and r[2]==7 and r[3]==7 and r[4] and r[5] and r[6] and r[7]==5 and r[8]==8 and r[9] and r[10], r)
    def look(hp):
        return J(pg,"""(hp)=>{ _h.hp=_h.maxHp*hp; render(performance.now()); const U=_g.userData;
          return { hurt:U.hurt, dead:U.roots.filter(r=>r.dead).length, sapOn:U.roots.filter(r=>r.sap[0].visible).length, cracks:U.cracks.filter(c=>c.visible).length, sy:+U.body.scale.y.toFixed(2), short:U.roots.filter(r=>r.g.scale.x<1).length, droop:U.sprout.rotation.x }; }""",hp)
    a=look(1); b1=look(0.5); c=look(0.2); d=look(1)
    print(a); print(b1); print(c)
    check('healthy: no withered roots, sap on all, no cracks, full height', a['hurt']==0 and a['dead']==0 and a['sapOn']==7 and a['cracks']==0 and a['sy']==1, a)
    check('below 66%: some roots withered (short, no sap), three cracks', b1['hurt']==1 and b1['dead']==3 and b1['short']==3 and b1['sapOn']==4 and b1['cracks']==3 and b1['sy']==1, b1)
    check('below 33%: more withered, all cracks, sags, sprout droops', c['hurt']==2 and c['dead']==5 and c['cracks']==8 and c['sy']<1 and c['droop']>0, c)
    check('healed: back to healthy', d['hurt']==0 and d['dead']==0 and d['cracks']==0 and d['sy']==1, d)
    r=J(pg,"""()=>{ const U=_g.userData, s=U.roots[1].sap[0]; v3PoseHive(_h,_g,1.0); const p0=s.position.clone(); v3PoseHive(_h,_g,1.6); const sp0=U.spores[0].position.clone(); v3PoseHive(_h,_g,2.4);
      return [+s.position.distanceTo(p0).toFixed(3), +U.spores[0].position.distanceTo(sp0).toFixed(3)]; }""")
    check('sap runs and spores drift', r[0]>0.01 and r[1]>0.01, r)
    r=J(pg,"""()=>{ const G=__hc.G; kill(_h,null); const f=G.fx.find(f=>f.k==='hivedeath'); render(performance.now()); const g=V3.dying.get(f), hv=g&&g.userData.hive;
      return hv?[hv.userData.hurt, hv.userData.cracks.filter(c=>c.visible).length]:null; }""")
    check('a dying hive takes the worst look', r and r[0]==2 and r[1]==8, r)
    if '--shots' in sys.argv:
        J(pg,"()=>{ const G=__hc.G, h=G.ents.find(e=>!e.dead&&e.type==='hive'); centerOn(h.x,h.y); VIEW3D.dist=6; render(performance.now()); }"); pg.screenshot(path='/home/claude/hive3d.png')
    check('no errors', not errs, errs[:3])
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
