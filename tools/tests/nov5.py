# Dead Signal shafts, High Ground flat + heir shafts, dev panel XP buttons, end screen Soldiers lost / Assets lost.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
SHOT='/tmp/hc/'
def check(name,cond,val):
    global ok; print(name, 'OK' if cond else 'FAIL', val); ok&=bool(cond)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # --- Dead Signal
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='dead-signal')); }"); pg.wait_for_timeout(500)
    r=J(pg,"""()=>{ const G=__hc.G, p=G.ents.find(e=>e.kind==='unit'&&e.faction==='corps');
      return shafts().map(s=>{ const q=findPath(s.x,s.y,p.x,p.y); return [s.wall, Math.floor(s.x/TILE), Math.floor(s.y/TILE), !!(q&&q.length)]; }); }""")
    check('ds shafts', len(r)==4 and all(x[3] for x in r), r)
    for w,x,y,_ in r:
        J(pg,f"()=>{{ centerOn({x}*TILE,{y}*TILE); }}"); pg.wait_for_timeout(200); pg.screenshot(path=SHOT+f'ds_{x}_{y}.png')
    r=J(pg,"""()=>{ const G=__hc.G; for(const h of hives()) kill(h); const out=launchWave(120,{x:78*TILE,y:30*TILE}); return out.map(u=>Math.round(Math.min(...shafts().map(s=>dist(u,s)))/TILE)); }""")
    check('ds wave from shaft', len(r)>0 and max(r)<6, r)
    r=J(pg,"""()=>{ const G=__hc.G; const n0=G.ents.filter(e=>e.faction==='corps'&&e.kind==='unit'&&!e.dead).length; G.api.charge&&0;
      for(const s of DS_SITES){ const c=G.ents.find(e=>e.type==='charge'&&e.tag===s.tag); }
      return n0; }""")
    # --- dev XP buttons
    J(pg,"()=>{ devToggle(true); dev.tab='live'; devRender(); const u=__hc.G.ents.find(e=>e.kind==='unit'&&e.faction==='corps'&&e.vet); u.vet.hero=true; u.vet.xp=75; u.vet.rank=rankFor(75,true); applyRank(u); }")
    pg.wait_for_timeout(200); pg.click('[data-dv="maxxp"]'); pg.wait_for_timeout(200)
    r=J(pg,"()=>__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.vet).map(u=>[!!u.vet.hero,u.vet.xp,RANKS[u.vet.rank].name,Math.round(u.maxHp)])")
    check('max xp', all((x[1]==75 and x[2]=='Captain') if x[0] else (x[1]==40 and x[2]=='Lieutenant') for x in r), r[:4])
    pg.screenshot(path=SHOT+'dev_max.png')
    pg.click('[data-dv="zeroxp"]'); pg.wait_for_timeout(200)
    r=J(pg,"()=>__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.vet).map(u=>[u.vet.xp,u.vet.rank,Math.round(u.maxHp)===Math.round(u.def.hp)])")
    check('zero xp', all(x==[0,0,True] for x in r), r[:4])
    # --- losses: one soldier, one sentry
    r=J(pg,"""()=>{ const G=__hc.G; const u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.type==='trooper'); kill(u);
      const p={x:Math.floor(u.x/TILE)+2,y:Math.floor(u.y/TILE)}; const s=makeBuilding('sentry','corps',p.x,p.y,true); kill(s); return [G.stats.soldiers,G.stats.assets,G.stats.lost]; }""")
    check('stats', r==[1,1,2], r)
    J(pg,"()=>{ devToggle(false); __hc.G.api.win('test'); }"); pg.wait_for_timeout(2500)
    t=J(pg,"()=>document.querySelector('#e-stats').innerText")
    check('end screen', 'soldiers lost' in t.lower() and 'assets lost' in t.lower() and 'losses' not in t.lower(), t.replace('\n',' | '))
    pg.screenshot(path=SHOT+'end.png')
    # --- High Ground
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='high-ground')); }"); pg.wait_for_timeout(500)
    r=J(pg,"()=>{ const m=__hc.G.map; let h=0; for(let i=0;i<m.w*m.h;i++) if(m.height[i]===1) h++; return [h, MAPS.high.layout.join('').split('').filter(c=>c==='&'||c==='%').length]; }")
    check('hg flat', r==[0,0], r)
    r=J(pg,"""()=>{ const G=__hc.G, hq=G.ents.find(e=>e.type==='hq'); const up=G.ents.filter(e=>e.type==='uplink').map(u=>{ const q=findPath(hq.x,hq.y+3*TILE,u.x,u.y); return !!(q&&q.length); });
      const sh=shafts().map(s=>{ const q=findPath(s.x,s.y,hq.x,hq.y+3*TILE); return [s.wall||'-',Math.floor(s.x/TILE),Math.floor(s.y/TILE),!!(q&&q.length)]; }); return [up,sh]; }""")
    check('hg paths', all(r[0]) and len(r[1])==4 and all(x[3] for x in r[1]), r)
    for w,x,y,_ in r[1]:
        J(pg,f"()=>{{ centerOn({x}*TILE,{y}*TILE); }}"); pg.wait_for_timeout(200); pg.screenshot(path=SHOT+f'hg_{x}_{y}.png')
    r=J(pg,"""()=>{ const G=__hc.G; for(let i=0;i<30;i++) __hc.update(1/30); const h0=hives().length; for(const h of hives()) kill(h); for(let i=0;i<30;i++) __hc.update(1/30);
      const sp=spawners().map(s=>s.type); const before=new Set(G.ents.filter(e=>e.faction==='swarm'&&e.kind==='unit').map(e=>e.id));
      const out=launchWave(150,G.ents.find(e=>e.type==='uplink')); return [h0,sp,out.length,out.map(u=>Math.round(Math.min(...shafts().map(s=>dist(u,s)))/TILE))]; }""")
    check('hg heirs', r[0]==4 and r[1]==['shaft']*4 and r[2]>0 and max(r[3])<6, r)
    # a guard grows at an heir shaft
    r=J(pg,"""()=>{ const G=__hc.G; G.swarm.biomass=500; for(let i=0;i<30*30;i++) __hc.update(1/30); return G.ents.filter(e=>!e.dead&&e.role==='guard'&&shafts().some(s=>s.id===e.homeHive)).length; }""")
    check('hg shaft guards', r>0, r)
    J(pg,"()=>{ centerOn(44*TILE,30*TILE); }"); pg.wait_for_timeout(200); pg.screenshot(path=SHOT+'hg_mid.png')
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
