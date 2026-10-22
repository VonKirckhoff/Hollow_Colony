from playwright.sync_api import sync_playwright
errs=[]
J=lambda pg,s: pg.evaluate(s)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(500)
    print(J(pg,"""()=>{ const G=__hc.G; const h=hives()[0]; const u=makeUnit('husk','swarm',h.x+2*TILE,h.y+2*TILE); huskHatched(u); huskStage(u,2); u.role='hunt';
      for(let k=0;k<4;k++) huskScream(u); const m=G.ents.find(e=>e.type==='matriarch'&&!e.dead); window.__m=m; const h0=hives().length;
      for(let i=0;i<30*60;i++) __hc.update(1/30); return [!!m, u.dead, m&&m.dead, m&&m.rootT!=null, m&&m.site, h0, hives().length, G.swarm.founded]; }"""))
    print(J(pg,"()=>{ for(let i=0;i<30*40;i++) __hc.update(1/30); return [__m.dead, hives().length, __hc.G.swarm.founded]; }"))
    b.close()
print(errs)
