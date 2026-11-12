# Zombie mode in 3D: a risen soldier is green, glows, has dead eyes and shambles; a normal soldier does not.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }"); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    r=J(pg,"""()=>{ const G=__hc.G, us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.vet); const z=us[0], n=us.find(u=>u!==z&&u.type===z.type)||us[1];
      z.vet.risen=true; window._z=z; window._n=n; centerOn(z.x,z.y); return [us.length,z.type,n.type]; }""")
    pg.keyboard.press('F3'); pg.wait_for_timeout(1500)
    r=J(pg,"""()=>{ const gz=V3.objs.get(_z), gn=V3.objs.get(_n); const has=(g,c)=>{ let f=false; g.traverse(o=>{ if(o.material&&o.material.color&&o.material.color.getHexString()===c) f=true; }); return f; };
      return [!!gz.userData.risen, !!gn.userData.risen, has(gz,'9dff6a'), has(gn,'9dff6a'), gz.userData.risen.layers.mask, gz.children[0].layers.mask]; }""")
    check('risen gets the haze, the normal one not', r[0] and not r[1], r)
    check('dead green eyes only on the risen', r[2] and not r[3], r)
    check('haze stays out of the xray pass', r[4]==1, r)
    pg.wait_for_timeout(800)
    r=J(pg,"()=>[V3.objs.get(_z).rotation.z, V3.objs.get(_n).rotation.z, __hc.G.fx.filter(f=>f.col==='#9dff6a').length]")
    check('the risen leans/sways, the normal one stands straight', abs(r[0])>0.05 and abs(r[1])<0.01, r)
    J(pg,"()=>{ VIEW3D.dist=Math.min(VIEW3D.dist,9); centerOn(_z.x,_z.y); }"); pg.wait_for_timeout(600)
    pg.screenshot(path='/home/claude/risen3d.png')
    check('no errors', not errs, errs[:3])
    print('ALL OK' if ok else 'SOME FAIL')
    b.close()
