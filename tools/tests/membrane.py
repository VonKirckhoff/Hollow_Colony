# Nobody shoots through a Swarm membrane (either way); the membrane itself can still be shot.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='brood-mother')); for(let i=0;i<20;i++) __hc.update(1/30); __hc.G.devReveal=true; computeFog(); }")
    r=J(pg,"""()=>{ const G=__hc.G, ms=G.ents.filter(e=>!e.dead&&e.type==='membrane'); if(!ms.length) return 'no membrane';
      /* a membrane tile with free ground on two opposite sides */
      for(const m of ms){ for(const [dx,dy] of [[1,0],[0,1]]){ const a={x:m.tx-dx*2,y:m.ty-dy*2}, c={x:m.tx+dx*2,y:m.ty+dy*2};
          if(!walkableT(a.x,a.y)||!walkableT(c.x,c.y)||G.block[a.y*G.map.w+a.x]||G.block[c.y*G.map.w+c.x]) continue;
          const t=makeUnit('trooper','corps',(a.x+.5)*TILE,(a.y+.5)*TILE), d=makeUnit('spitter','swarm',(c.x+.5)*TILE,(c.y+.5)*TILE); m.invuln=false;
          const f1=findTarget(t,6), f2=findTarget(d,6,true), v=validTarget(t,d,true), vm=validTarget(t,m,true);
          d.x+=dx*0; for(const x of ms) x.dead=true; G._membT=-1; const f3=findTarget(t,6); for(const x of ms) x.dead=false; G._membT=-1;
          return [f1&&f1.type, f2&&f2.type, v, vm, f3&&f3.type]; } }
      return 'no spot'; }""")
    check('no shooting through a membrane', isinstance(r,list) and r[0]!='spitter' and r[1] is None and r[2]==False and r[3]==True and r[4]=='spitter', r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
