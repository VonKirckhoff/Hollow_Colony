# Brood Mother: kept at a distance she creeps after you and flings eggs; twice she goes back to her lair to heal;
# whoever follows her in breaks it off.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='brood-mother')); for(let i=0;i<20;i++) __hc.update(1/30); }"); pg.wait_for_timeout(200)
    r=J(pg,"""()=>{ const G=__hc.G, M=G.ents.find(e=>e.type==='broodmother'); for(const h of hives()) kill(h); for(let i=0;i<30*3;i++) __hc.update(1/30);
      for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit'&&e!==M) e.dead=true;
      /* a squad 7 tiles away, holding, out of her reach */
      const a=Math.PI*0.75, us=[]; for(let i=0;i<6;i++){ const u=makeUnit('trooper','corps',M.x+Math.cos(a)*7*TILE+(i%3)*20,M.y+Math.sin(a)*7*TILE+Math.floor(i/3)*20); u.hp=u.maxHp=99999; u.order={type:'hold'}; us.push(u); }
      window._M=M; window._us=us; const x0=M.x, y0=M.y; let lobs=0;
      for(let i=0;i<30*14;i++){ __hc.update(1/30); lobs=Math.max(lobs,G.shots.filter(s=>s.k==='broodlob').length+(G.ents.filter(e=>e.type==='cocoon'&&!e.dead).length>0?1:0)); for(const u of us) u.hp=u.maxHp; }
      return [M.awake, Math.round(Math.hypot(M.x-x0,M.y-y0)/TILE*10)/10, lobs]; }""")
    check('she creeps and flings eggs', r[0] and r[1]>=1 and r[2]>=1, r)
    r=J(pg,"""()=>{ const G=__hc.G, M=_M, S=M.bossState; M.x=S.home.x+6*TILE; M.y=S.home.y; M.path=null; M.hp=M.maxHp*0.65; for(let i=0;i<10;i++) __hc.update(1/30);
      const went=S.retreat; let home=false; for(let i=0;i<30*25;i++){ __hc.update(1/30); for(const u of _us){ u.hp=u.maxHp; } if(S.retreat==='heal'){ home=true; break; } }
      const h0=M.hp; for(let i=0;i<30*3;i++) __hc.update(1/30); return [went, home, Math.round((M.hp-h0)/M.maxHp*1000)/10, S.lairs]; }""")
    check('retreats to heal', r[0]=='go' and r[1] and r[2]>0 and r[3]==1, r)
    r=J(pg,"""()=>{ const G=__hc.G, M=_M, S=M.bossState; const t=makeUnit('trooper','corps',M.x+3*TILE,M.y); t.hp=t.maxHp=99999; for(let i=0;i<10;i++) __hc.update(1/30); return [S.retreat, S.chargeT<=1]; }""")
    check('following her in breaks it off', r[0] is None, r)
    # burrowing, acid rain, shields
    r=J(pg,"""()=>{ const G=__hc.G, M=_M, S=M.bossState; for(const e of G.ents) if(e.kind==='unit'&&e.faction==='corps') e.dead=true;
      const us=[]; for(let i=0;i<6;i++){ const u=makeUnit('trooper','corps',S.home.x-6*TILE+(i%3)*22,S.home.y+Math.floor(i/3)*22); u.hp=u.maxHp=99999; u.order={type:'hold'}; us.push(u); }
      S.retreat=null; M.order=null; M.x=S.home.x; M.y=S.home.y; M.hp=M.maxHp*0.45; S.lairs=2; let burrowed=false, out=null, rain=0, pools0=G.pools.length;
      for(let i=0;i<30*14;i++){ __hc.update(1/30); for(const u of us) u.hp=u.maxHp; if(S.burrow) burrowed=true; if(burrowed&&!S.burrow&&!out) out=[M.x,M.y]; rain=Math.max(rain,G.shots.filter(s=>s.pool).length); }
      const cx=us.reduce((a,u)=>a+u.x,0)/6, cy=us.reduce((a,u)=>a+u.y,0)/6;
      return [S.phase, burrowed, out?Math.round(Math.hypot(out[0]-cx,out[1]-cy)/TILE*10)/10:null, rain, G.pools.length>pools0]; }""")
    check('burrows under the squad, acid rain', r[1] and r[2] is not None and r[2]<3 and r[3]>=1 and r[4], r)
    r=J(pg,"""()=>{ const G=__hc.G, M=_M; M.hp=M.maxHp*0.2; for(let i=0;i<30;i++) __hc.update(1/30); const sh=G.ents.filter(e=>!e.dead&&e.shieldOf===M);
      for(const s of sh){ s.hp=s.maxHp=5000; s.x=M.x+M.r+10; s.y=M.y; } const h0=M.hp, s0=sh.reduce((a,s)=>a+s.hp,0); const g=makeUnit('trooper','corps',M.x-200,M.y); damage(M,100,g);
      return [sh.length, Math.round(h0-M.hp), Math.round(s0-sh.reduce((a,s)=>a+s.hp,0))]; }""")
    check('shields take half', r[0]>=1 and r[1]<100 and r[2]>0, r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
