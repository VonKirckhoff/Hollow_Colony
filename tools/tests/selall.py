# Select all: the button in the Orders row (also with nothing selected) and Ctrl+A select every unit of yours on the whole map (not the downed or those aboard);
# pressed again, the camera jumps to them; then a formation key puts them all in one formation. Also when playing the Brood.
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
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); const G=__hc.G; const us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps');"
          " us[0].x+=40*TILE; us[1].downed={t:99,max:99,patch:0}; us[1].order=null; selectEntities([],false); window.__n=us.length; }")
    pg.click("#cmdcard [data-key=\"^A\"]"); pg.wait_for_timeout(200)
    r=J(pg,"()=>{ const G=__hc.G; return [G.sel.length, window.__n, G.sel.some(e=>e.downed), G.sel.every(e=>e.faction==='corps'&&e.kind==='unit')]; }")
    check('button selects all but the downed, also far away', r[0]==r[1]-1 and not r[2] and r[3], r)
    cam0=J(pg,"()=>[__hc.G.cam.x,__hc.G.cam.y]")
    pg.click("#cmdcard [data-key=\"^A\"]"); pg.wait_for_timeout(200)
    cam1=J(pg,"()=>[__hc.G.cam.x,__hc.G.cam.y]")
    check('second press moves the camera to them', cam0!=cam1, [cam0,cam1])
    J(pg,"()=>selectEntities([],false)"); pg.keyboard.press('Control+a'); pg.wait_for_timeout(200)
    check('Ctrl+A does the same', J(pg,"()=>__hc.G.sel.length")==r[0])
    pg.keyboard.press('z'); pg.wait_for_timeout(300)
    f=J(pg,"()=>{ const us=myUnits(); return [us.length, us.every(u=>u.formation&&u.formation===us[0].formation)]; }")
    check('then Z puts them all in one formation', f[1] and f[0]==r[0], f)
    pg.screenshot(path="/home/claude/selall.png")
    J(pg,"()=>selectEntities([],false)"); pg.wait_for_timeout(300); pg.screenshot(path="/home/claude/selall-none.png")
    check("button there with nothing selected", J(pg,"()=>!!document.querySelector('#cmdcard [data-key=\"^A\"]')"))
    J(pg,"()=>{ startMission(SWARM_MISSIONS.find(m=>!m.training)); }"); pg.wait_for_timeout(400); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('Control+a'); pg.wait_for_timeout(200)
    s=J(pg,"()=>{ const G=__hc.G; return [G.side, G.sel.length, G.sel.every(e=>e.faction===G.side&&!(e.def&&e.def.boss)), selSwarm().length]; }")
    check('Brood: Ctrl+A selects the brood', s[0]=='swarm' and s[1]>0 and s[2] and s[3]==s[1], s)
    check('no errors', not errs, errs[:3])
    print('ALL OK' if ok else 'SOME FAILED')
