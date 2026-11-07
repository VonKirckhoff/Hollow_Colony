# Showcase: the camera shows the ancient egg / the crashed Osprey at the start, comes back to the squad; markers stay until gone.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(name,cond,info=''):
    global ok; print(('OK  ' if cond else 'FAIL'),name,info); ok=ok and bool(cond)
STEP="""(n)=>{ for(let i=0;i<n;i++){ __hc.update(1/30); updateCamera(1/30); } const G=__hc.G; return {cx:G.cam.x+ui.vw/2, cy:G.cam.y+(ui.vh-ui.hudH)/2, show:G.show?G.show.phase:null, fol:G.following}; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ ui.follow=true; ui.mouse.inWin=false; startMission(MISSIONS.find(m=>m.id==='blackout')); }"); pg.wait_for_timeout(300)
    egg=J(pg,"()=>{ const c=__hc.G.ents.find(e=>e.relic==='egg-mare'); return {x:c.x,y:c.y}; }")
    check('egg marker at start', J(pg,"()=>__hc.G.markers.some(m=>m.id==='relic:egg-mare'&&m.col)"))
    s0=J(pg,"()=>({cx:__hc.G.cam.x+ui.vw/2, cy:__hc.G.cam.y+(ui.vh-ui.hudH)/2})")
    s=J(pg,"("+STEP+")(30)")
    s=J(pg,"("+STEP+")(45)")
    on=pg.evaluate("(e)=>{ const G=__hc.G; return e.x>G.cam.x+40&&e.x<G.cam.x+ui.vw-40&&e.y>G.cam.y+40&&e.y<G.cam.y+ui.vh-ui.hudH-40; }",egg)
    check('camera holds on egg (egg on screen)', s['show']=='hold' and on, s)
    pg.wait_for_timeout(1300); pg.screenshot(path='/home/claude/shots/sc_egg.png')
    check('Maas silent during shot', not J(pg,"()=>__hc.G.ents.find(e=>e.relic==='egg-mare').seenSaid"))
    s=J(pg,"("+STEP+")(30*8)")
    d0=((s['cx']-s0['cx'])**2+(s['cy']-s0['cy'])**2)**.5
    check('back at squad, following', s['show'] is None and s['fol'] and d0<250, (s,round(d0)))
    check('Maas still silent after shot', not J(pg,"()=>__hc.G.ents.find(e=>e.relic==='egg-mare').seenSaid"))
    check('marker stays', J(pg,"()=>__hc.G.markers.some(m=>m.id==='relic:egg-mare')"))
    pg.screenshot(path='/home/claude/shots/sc_back.png')
    # the swarm takes the egg: marker gone
    r=J(pg,"""()=>{ const G=__hc.G; const c=G.ents.find(e=>e.relic==='egg-mare'); const h=hives()[0]; for(let i=0;i<3;i++){ const u=spawnNearBuilding('drone','swarm',h); u.x=c.x+8; u.y=c.y; u.order={type:'hold'}; u.path=null; u.role='eggrun'; u.eggRun=c.id; }
       for(let i=0;i<30*25&&!c.dead;i++) __hc.update(1/30); return [c.dead, G.markers.some(m=>m.id==='relic:egg-mare')]; }""")
    check('swarm took egg, marker gone', r[0] and not r[1], r)
    # own scroll ends the shot
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(200)
    s=J(pg,"("+STEP+")(40)"); check('shot running', s['show'] is not None, s)
    s=J(pg,"()=>{ ui.keys.ArrowLeft=true; updateCamera(1/30); ui.keys.ArrowLeft=false; return {show:__hc.G.show, q:__hc.G.showQ.length}; }")
    check('arrow key ends shot', s['show'] is None and s['q']==0, s)
    r=J(pg,"""()=>{ const G=__hc.G; const c=G.ents.find(e=>e.relic==='egg-maw'); const u=G.ents.find(e=>e.type==='gunner'); u.x=c.x+10; u.y=c.y+20; u.order={type:'hold'}; u.path=null; for(let i=0;i<30*7;i++) __hc.update(1/30); return [c.dead, G.markers.some(m=>m.id==='relic:egg-maw'), c.seenSaid]; }""")
    check('squad took egg, marker gone, Maas spoke when squad saw it', r[0] and not r[1] and r[2], r)
    # Hollow Colony: the Osprey
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hollow-colony')); }"); pg.wait_for_timeout(200)
    s=J(pg,"("+STEP+")(30*2)")
    check('osprey marker + shot', J(pg,"()=>__hc.G.markers.some(m=>m.id==='osprey')") and s['show'] is not None, s)
    s=J(pg,"("+STEP+")(30)"); pg.wait_for_timeout(1300); pg.screenshot(path='/home/claude/shots/sc_osprey.png')
    s=J(pg,"("+STEP+")(30*8)"); check('osprey shot back at squad', s['show'] is None, s)
    r=J(pg,"""()=>{ const G=__hc.G; for(const u of G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps')){ u.x=42.5*TILE; u.y=13*TILE; u.path=null; u.order=null; } for(let i=0;i<30*2;i++) __hc.update(1/30); return G.markers.some(m=>m.id==='osprey'); }""")
    check('osprey marker gone when squad near', not r)
    # save does not replay
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='blackout')); }"); pg.wait_for_timeout(200)
    r=J(pg,"()=>{ const e=encodeGame(); return [!!e.G.show, !!e.G.showQ, (e.G.markers.__a||[]).length]; }")
    check('show not saved, markers saved', not r[0] and not r[1] and r[2]>0, r)
    b.close()
print(errs)
print('ALL OK' if ok and not errs else 'FAILED')
