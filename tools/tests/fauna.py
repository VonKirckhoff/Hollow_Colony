# Fauna: the Swarm kills a grazer far from the creep, drags the carcass to its hive, an egg is laid next to the hive, the Grafter turns it, a Bloater hatches.
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/00c81499-2682-578b-978f-4593823ea0b3/scratchpad/'
errs=[]; ok=True
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    r=pg.evaluate("""()=>{ const G=__hc.G; for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit'){ e.x=4*TILE; e.y=44*TILE; e.order=null; e.path=null; }
      for(let i=0;i<30*10;i++) __hc.update(1/30);
      const h=hives()[0]; const f=freeTilesNear(Math.floor(h.x/TILE)+11,Math.floor(h.y/TILE)+2,1)[0];
      const gz=makeUnit('grazer','wild',(f.x+.5)*TILE,(f.y+.5)*TILE); const d=makeUnit('drone','swarm',gz.x+TILE,gz.y); d.role='hunt';
      kill(gz,d); const body=G.ents.filter(e=>e.kind==='body'&&!e.dead&&e.fauna).pop(); const start=body?+(gapTo(body,h)/TILE).toFixed(1):null;
      let homeGap=null, egg=null, bloater=null, t=0; window.__shot=false;
      for(let i=0;i<30*90&&!bloater;i++){ __hc.update(1/30); t=i/30;
        if(body.home&&homeGap==null) homeGap=+(gapTo(body,h)/TILE).toFixed(2);
        if(!egg){ const e=G.ents.find(x=>!x.dead&&x.type==='egg'&&x.hive===h.id); if(e) egg=+(gapTo(e,h)/TILE).toFixed(2); }
        bloater=G.ents.find(x=>!x.dead&&x.type==='bloater')||null; }
      return { body:!!body, start, homeGap, egg, bloater:!!bloater, at:Math.round(t), home:body.home&&body.home.type }; }""")
    print(r); ok&= r['body'] and r['start']>5 and r['homeGap'] is not None and r['homeGap']<1.3 and r['egg'] is not None and r['bloater']
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
