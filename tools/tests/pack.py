# Swarm waves march as a pack: at the pace of the slowest while no enemy is near; let loose when they come close.
# (a unit that chases a grazer or carries a carcass home leaves its pack, so the spread is compared, not fixed)
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J="""(usePack)=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); const G=__hc.G;
  const hq=G.ents.find(e=>e.type==='hq'); for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit'){ e.x=hq.x; e.y=hq.y+2*TILE; e.order={type:'hold'}; e.path=null; }
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; TACTICS.weights={direct:1,lure:0,flank:0}; const hs=hives().sort((a,c)=>dist(a,hq)-dist(c,hq)); for(const h of hs.slice(0,-1)) h.dead=true;
  G.swarm.cfg.waves.types=['crawler','crawler','brute']; const out=launchWave(260, {x:hq.x,y:hq.y}); if(!usePack) for(const u of out) u.pack=null;
  const spread=()=>{ const l=out.filter(u=>!u.dead); const d=l.map(u=>Math.hypot(u.x-hq.x,u.y-hq.y)/TILE); return +(Math.max(...d)-Math.min(...d)).toFixed(1); };
  const near=()=>+Math.min(...out.filter(u=>!u.dead).map(u=>Math.hypot(u.x-hq.x,u.y-hq.y)/TILE)).toFixed(1);
  const s0=spread(); for(let i=0;i<30*14;i++) __hc.update(1/30); const s1=spread(), n1=near();
  let loose=null; for(let i=0;i<30*60;i++){ __hc.update(1/30); if(out.every(u=>u.dead||!u.pack)){ loose=near(); break; } }
  return { n:out.length, types:[...new Set(out.map(u=>u.type))], s0, s1, n1, loose }; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    a=pg.evaluate(J,True); bb=pg.evaluate(J,False); print('pack',a); print('free',bb)
    ok&= a['s1']<bb['s1']*0.6 and a['loose'] is not None and a['loose']<=8
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
