# Line of fire: rock walls and membranes stop shots, crater rims do not; an attack order goes round for a clear shot.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); const G=__hc.G; G.devReveal=true; computeFog(); for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; }")
    find="""(wall)=>{ const G=__hc.G, m=G.map, W=m.w; for(let y=3;y<m.h-3;y++) for(let x=3;x<m.w-3;x++){ if(!wall.includes(m.tiles[y*W+x])) continue;
        if(!walkableT(x-2,y)||!walkableT(x+2,y)||G.block[y*W+x-2]||G.block[y*W+x+2]) continue; if(!wall.includes(m.tiles[y*W+x-1])&&!walkableT(x-1,y)) continue;
        if(walkableT(x-1,y)&&walkableT(x+1,y)) continue; return {x,y}; } return null; }"""
    for wall,name,blocked in [('#^','rock',True),(')','crater rim',False)]:
        r=J(pg,"()=>{ const f="+find+"; const s=f('"+wall+"'); if(!s) return 'none'; const G=__hc.G;"+"""
          const a=makeUnit('trooper','corps',(s.x-2+.5)*TILE,(s.y+.5)*TILE), d=makeUnit('spitter','swarm',(s.x+2+.5)*TILE,(s.y+.5)*TILE); a.order={type:'hold'}; d.order={type:'hold'};
          const r=[fireBlocked(a,d), (findTarget(a,6)||{}).type, (findTarget(d,6,true)||{}).type]; a.dead=true; d.dead=true; return r; }""")
        check(name, isinstance(r,list) and r[0]==blocked and ((r[1]=='spitter')!=blocked) and ((r[2]=='trooper')!=blocked), r)
    # an attack order on a target behind rock: he goes round and fires
    r=J(pg,"()=>{ const f="+find+"; const s=f('#^'); const G=__hc.G;"+"""
      const a=makeUnit('trooper','corps',(s.x-2+.5)*TILE,(s.y+.5)*TILE), d=makeUnit('drone','swarm',(s.x+2+.5)*TILE,(s.y+.5)*TILE); d.hp=d.maxHp=9999; d.order={type:'hold'}; d.speedMul=0; d.def={...d.def,damage:0};
      a.order={type:'attack',target:d}; const x0=a.x, y0=a.y; let fired=false; for(let i=0;i<30*15;i++){ __hc.update(1/30); if(d.hp<9999){ fired=true; break; } }
      return [fired, Math.round(Math.hypot(a.x-x0,a.y-y0)/TILE)]; }""")
    check('attack order goes round', r[0] and r[1]>=1, r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
