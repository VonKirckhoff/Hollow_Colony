from playwright.sync_api import sync_playwright
errs=[]
J=lambda pg,s: pg.evaluate(s)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-relics'); startMission(MISSIONS.find(m=>m.id==='blackout')); }"); pg.wait_for_timeout(600)
    print('spawned', J(pg,"()=>__hc.G.ents.filter(e=>e.relic).map(e=>e.relic+(e.egg?'(egg)':'')+'@'+Math.floor(e.x/TILE)+','+Math.floor(e.y/TILE))"))
    # item pickup
    print(J(pg,"""()=>{ const G=__hc.G; const r=G.ents.find(e=>e.relic==='rabbit'); const u=G.ents.find(e=>e.type==='trooper'); u.x=r.x+30; u.y=r.y; u.order=null; u.path=null; moveGroup([u],r.x,r.y,'move'); for(let i=0;i<90;i++) __hc.update(1/30); return [r.dead, JSON.stringify(relicsFound())]; }"""))
    # swarm takes the egg
    print(J(pg,"""()=>{ const G=__hc.G; const c=G.ents.find(e=>e.relic==='egg-mare'); c.wakeAt=G.time; const h0=hives().length; for(let i=0;i<30*80;i++) __hc.update(1/30); return [c.dead, Math.round(c.hatch*100), h0, hives().length, G.ents.filter(u=>!u.dead&&u.eggRun).length]; }"""))
    # corps takes an egg in burn the brood
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(400)
    print(J(pg,"""()=>{ const G=__hc.G; const c=G.ents.find(e=>e.relic==='egg-maw'); const u=G.ents.find(e=>e.type==='gunner'); u.x=c.x+10; u.y=c.y+20; u.order={type:'hold'}; u.path=null; for(let i=0;i<30*7;i++) __hc.update(1/30); return [c.dead, Object.keys(relicsFound())]; }"""))
    pg.wait_for_timeout(300)
    J(pg,"()=>{ const G=__hc.G; const c=G.ents.find(e=>e.relic==='drone'); centerOn(c.x,c.y); G.devReveal=true; G.following=false; ui.follow=false; }"); pg.wait_for_timeout(1500)
    pg.screenshot(path='relic_item.png', clip={'x':533,'y':170,'width':300,'height':200})
    J(pg,"()=>{ goMenu('intel'); }"); pg.wait_for_timeout(300)
    pg.click('[data-itab=relics]'); pg.wait_for_timeout(300); pg.screenshot(path='relic_intel.png')
    J(pg,"()=>{ goMenu('trophies'); }"); pg.wait_for_timeout(300); pg.screenshot(path='relic_troph.png')
    b.close()
print(errs)
