# Burn the Brood: three mine shafts (west, north, east); with the hives gone the waves and the last surge come up out of them.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(500)
    r=J(pg,"""()=>{ const G=__hc.G, hq=G.ents.find(e=>e.type==='hq');
      return shafts().map(s=>{ const p=findPath(s.x,s.y,hq.x,hq.y+3*TILE); return [s.wall, Math.floor(s.x/TILE), Math.floor(s.y/TILE), s.invuln, !!(p&&p.length)]; }); }""")
    print('shafts', r); ok&=len(r)==3 and all(x[3] and x[4] for x in r)
    for w,x,y,_,_ in r:   # screenshot of each tunnel
        J(pg,f"()=>{{ centerOn({x}*TILE,{y}*TILE); }}"); pg.wait_for_timeout(250); pg.screenshot(path=f'/tmp/claude-0/-home-claude/00c81499-2682-578b-978f-4593823ea0b3/scratchpad/shaft_{w}.png')
    # burn every hive, let the final phase start and run
    r=J(pg,"""()=>{ const G=__hc.G; for(const h of hives()) kill(h); const before=new Set(G.ents.filter(e=>e.faction==='swarm'&&e.kind==='unit').map(e=>e.id));
      const near=[], far=[]; for(let i=0;i<30*48;i++){ __hc.update(1/30);
        for(const e of G.ents) if(!e.dead&&e.faction==='swarm'&&e.kind==='unit'&&!before.has(e.id)){ before.add(e.id); const d=Math.min(...shafts().map(s=>dist(e,s)))/TILE; (d<5?near:far).push(d<5?e.type:[e.type,e.role,Math.round(e.x/TILE),Math.round(e.y/TILE)]); } }
      return [G.vars.final, hives().length, G.timerLeft?null:0, near.length, far, G.msgs.slice(-4).map(m=>m.who||m.text&&m.text.slice(0,40))]; }""")
    print('final', r); ok&=r[0] and r[1]==0 and r[3]>=4 and len(r[4])==0
    # a director wave with no hive left also comes up a shaft
    r=J(pg,"""()=>{ const out=launchWave(120); return out.map(u=>Math.round(Math.min(...shafts().map(s=>dist(u,s)))/TILE)); }""")
    print('wave', r); ok&=len(r)>0 and max(r)<6
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
