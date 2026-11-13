# Hovering a soldier in the selection panel lights him up in 3D too (pulsing yellow ring, bouncing marker), like in 2D.
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
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }"); pg.wait_for_timeout(200)
    pg.keyboard.press('F3'); pg.wait_for_timeout(1200)
    J(pg,"()=>{ const us=__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); selectEntities(us,false); centerOn(us[0].x,us[0].y); }"); pg.wait_for_timeout(500)
    row=pg.locator('#selection [data-only]').first
    bb=J(pg,"()=>{ const r=document.querySelector('#selection [data-only]').getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2,+document.querySelector('#selection [data-only]').dataset.only]; }"); uid=bb[2]
    pg.mouse.move(bb[0]-3,bb[1]); pg.mouse.move(bb[0],bb[1],steps=3); pg.wait_for_timeout(400)
    check('hover set', J(pg,"()=>ui.hover&&ui.hover.id")==uid)
    r=J(pg,"()=>{ const u=__hc.G.ents.find(e=>e.id==="+str(uid)+"); render(performance.now()); const rs=V3.ringPool.filter(r=>r.visible); const yl=rs.filter(r=>['ffd23f','fff3b0'].includes(r.material.color.getHexString())); return [isHovered(u), yl.length, rs.length]; }")
    check('one yellow ring in 3D', r[0] and r[1]==1, r)
    pg.screenshot(path='/home/claude/scratch/hover3d.png')
    pg.mouse.move(600,300); pg.wait_for_timeout(300)
    r=J(pg,"()=>{ render(performance.now()); return [ui.hover, V3.ringPool.filter(r=>r.visible&&['ffd23f','fff3b0'].includes(r.material.color.getHexString())).length]; }")
    check('gone when the mouse leaves', r[0] is None and r[1]==0, r)
    check('no errors', not errs, errs)
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
