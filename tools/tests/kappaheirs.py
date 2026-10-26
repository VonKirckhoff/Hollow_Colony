# Hold Kappa: a mine shaft behind every hive takes over when its hive is burnt (same guards, biomass and waves); no win for burning the hives.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }"); pg.wait_for_timeout(300)
    r=pg.evaluate("""()=>{ const G=__hc.G; for(let i=0;i<30*2;i++) __hc.update(1/30);
      const hs=hives(), heirs=shafts().map(s=>{ const h=hs.find(x=>x.id===s.heirOf); return [Math.floor(s.x/TILE),Math.floor(s.y/TILE),h?[h.tx+1,h.ty+1]:null]; });
      const b0=waveBudget(), n0=spawnerCount();
      const a=hs.find(h=>h.tx+1===47&&h.ty+1===7); kill(a); for(let i=0;i<30*1;i++) __hc.update(1/30);
      const heirNow=shafts().filter(s=>s.heir).map(s=>[Math.floor(s.x/TILE),Math.floor(s.y/TILE),s.share]);
      const b1=waveBudget(), n1=spawnerCount();
      for(const h of hives()) kill(h); for(let i=0;i<30*40;i++) __hc.update(1/30);
      const guards=G.ents.filter(e=>!e.dead&&e.role==='guard'&&shafts().some(s=>s.id===e.homeHive)).length;
      const w=launchWave(150); const fromShaft=w.filter(u=>shafts().some(s=>s.heir&&dist(u,s)<4*TILE)).length;
      return { heirs, b0, b1, n0, n1, heirNow, guards, wave:w.length, fromShaft, over:G.over, hivesLeft:hives().length }; }""")
    print(r)
    ok&= all(h[2] for h in r['heirs']) and abs(r['b0']-r['b1'])<0.01 and r['n0']==r['n1']==3 and len(r['heirNow'])==2 and r['guards']>0 and r['wave']>0 and r['fromShaft']==r['wave'] and r['over'] is None
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
