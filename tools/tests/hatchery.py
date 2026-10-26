# Hive life: no eggs until a body lies in the creep; the body is carried up to the hive; the egg is laid right next to the hive;
# the Swarm's Husk skips the Shambler; creep is smaller (CREEP.max 8).
from playwright.sync_api import sync_playwright
errs=[]; ok=True
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    r=pg.evaluate("""()=>{ const G=__hc.G; for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit') { e.x=4*TILE; e.y=44*TILE; e.order=null; e.path=null; }
      for(let i=0;i<30*20;i++) __hc.update(1/30);
      const eggs0=G.ents.filter(e=>!e.dead&&e.type==='egg').length;
      const h=hives()[0];
      /* a body 7 tiles from the hive, on its creep */
      const f=freeTilesNear(Math.floor(h.x/TILE)+6,Math.floor(h.y/TILE)+3,1)[0]; makeBody({x:(f.x+.5)*TILE,y:(f.y+.5)*TILE,def:UNITS.trooper,face:1}); const body=G.ents[G.ents.length-1];
      const d0=gapTo(body,h)/TILE; let homeGap=null, egg=null, eggGap=null, cocoon=false;
      for(let i=0;i<30*60&&!cocoon;i++){ __hc.update(1/30);
        if(body.home&&homeGap==null) homeGap=gapTo(body,h)/TILE;
        const e=G.ents.find(x=>!x.dead&&x.type==='egg'&&x.hive===h.id); if(e&&!egg){ egg=e; eggGap=gapTo(e,h)/TILE; }
        if(body.dead&&G.ents.some(c=>!c.dead&&c.type==='cocoon')) cocoon=true; }
      return { creepMax:CREEP.max, eggs0, d0:+d0.toFixed(1), homeGap:homeGap==null?null:+homeGap.toFixed(2), eggGap:eggGap==null?null:+eggGap.toFixed(2), cocoon }; }""")
    print(r); ok&= r['creepMax']==8 and r['eggs0']==0 and r['homeGap'] is not None and r['homeGap']<1.3 and r['eggGap'] is not None and r['eggGap']<1.0 and r['cocoon']
    r=pg.evaluate("""()=>{ const G=__hc.G, h=hives()[0]; const u=makeUnit('husk','swarm',h.x+2*TILE,h.y+2*TILE); huskHatched(u); const seen=[u.stageName];
      for(let i=0;i<30*20;i++){ __hc.update(1/30); const n=u.stage===HUSK_STAGES.length-1?'Husk':u.stageName; if(seen[seen.length-1]!==n) seen.push(n); }
      return seen; }""")
    print(r); ok&= r==['Twitcher','Husk']
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
