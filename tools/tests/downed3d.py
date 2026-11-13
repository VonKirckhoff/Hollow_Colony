# A fallen soldier in 3D shows the same marks as in 2D: the red bleed-out ring, the Medic's green ring, the red cross and the heart line.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }"); pg.keyboard.press('F3'); pg.wait_for_timeout(1200)
    J(pg,"""()=>{ const G=__hc.G, u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.type==='pyro')||G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps');
      goDown(u); u.downed.t=u.downed.max*0.6; u.downed.patch=0.4; window._dn=u; centerOn(u.x,u.y); G.speed=0; }""")
    pg.wait_for_timeout(800)
    # read the overlay pixels round the projected mark: red of the bleed ring and green of the Medic ring must be there
    r=J(pg,"""()=>{ const u=window._dn; render(performance.now()); const g=V3.objs.get(u), p=v3Screen(u.x,u.y,(g.userData.top||1)+0.25); p.y-=16; const d=ui.dpr, x0=Math.round((p.x-16)*d), y0=Math.round((p.y-16)*d);
      const px=ctx.getImageData(x0,y0,Math.round(32*d),Math.round(32*d)).data; let red=0, green=0;
      for(let i=0;i<px.length;i+=4){ const R=px[i],Gc=px[i+1],B=px[i+2],A=px[i+3]; if(A<200) continue; if(R>230&&Gc<120&&B<110) red++; if(R<150&&Gc>230&&B>170) green++; }
      return [p.ok, red, green]; }""")
    check('red bleed-out ring and cross in 3D', r[0] and r[1]>20, r)
    check('green Medic ring in 3D', r[2]>8, r)
    pg.screenshot(path='/home/claude/scratch/downed3d.png')
    check('no errors', not errs, errs)
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
