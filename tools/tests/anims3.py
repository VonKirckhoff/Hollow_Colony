# Third round of animations: idle looks, sniffing, grenade shadow, stray rounds, claw scratches, toppling tower,
# generator arcs and flicker, drag trails, dying creep, a shaft spitting its wave.
from playwright.sync_api import sync_playwright
import sys
errs=[]; ok=True; SHOT=sys.argv[1] if len(sys.argv)>1 else None
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    def shot(name,cx,cy,w=360,h=240):
        if not SHOT: return
        J(pg,f"()=>{{ centerOn({cx},{cy}); }}"); pg.wait_for_timeout(150)
        c=J(pg,f"()=>[Math.round({cx}-__hc.G.cam.x),Math.round({cy}-__hc.G.cam.y)]")
        pg.screenshot(path=f'{SHOT}/{name}.png',clip={'x':max(0,c[0]-w//2),'y':max(0,c[1]-h//2),'width':w,'height':h})
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); const G=__hc.G; G.devReveal=true; computeFog(); for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; const hq=G.ents.find(e=>e.type==='hq'); window.P0={x:hq.x+5*TILE,y:hq.y+3*TILE}; }")
    pg.wait_for_timeout(300)
    r=J(pg,"""()=>{ const G=__hc.G, u=makeUnit('trooper','corps',P0.x,P0.y); u.order=null; let flips=0, f0=u.face; for(let i=0;i<30*20;i++){ __hc.update(1/30); if(u.face!==f0){ flips++; f0=u.face; } } return flips; }""")
    check('idle soldier looks round', r>=1, r)
    r=J(pg,"""()=>{ const G=__hc.G, d=makeUnit('drone','swarm',P0.x+80,P0.y+40), t=makeUnit('trooper','corps',P0.x+40,P0.y+120); t.quiet=true;
      let strays=0; const n0=G.fx.length; for(let i=0;i<40;i++){ fire(t,d); d.hp=d.maxHp; } strays=G.fx.filter(f=>f.k==='tracer').length; return strays; }""")
    check('stray rounds', r>40, r)
    r=J(pg,"""()=>{ const G=__hc.G, s=makeBuilding('barricade','corps',Math.floor((P0.x-90)/TILE),Math.floor((P0.y+60)/TILE),true); const d=makeUnit('drone','swarm',s.x+30,s.y); for(let i=0;i<5;i++) fire(d,s); window._bar=s; d.dead=true; return (s.scratch||[]).length; }""")
    check('claw scratches', r>=4, r)
    shot('scratch',J(pg,"()=>_bar.x"),J(pg,"()=>_bar.y"),160,120)
    r=J(pg,"""()=>{ const G=__hc.G, rl=makeBuilding('relay','corps',Math.floor((P0.x+120)/TILE),Math.floor((P0.y-120)/TILE),true); window._rl={x:rl.x,y:rl.y}; kill(rl,null); for(let i=0;i<20;i++) __hc.update(1/30); return G.fx.some(f=>f.k==='topple'); }""")
    check('tower topples', r, '')
    shot('topple',J(pg,"()=>_rl.x"),J(pg,"()=>_rl.y"),200,160)
    r=J(pg,"""()=>{ const G=__hc.G; const t=makeUnit('trooper','corps',P0.x-40,P0.y-100); kill(t,null); const body=G.ents.filter(e=>e.kind==='body'&&!e.dead).pop(); const d=makeUnit('drone','swarm',body.x,body.y);
      d.haul=body; body.carrier=d; d.order={type:'move',x:body.x-6*TILE,y:body.y}; setPath(d,d.order.x,d.order.y); for(let i=0;i<60;i++){ __hc.update(1/30); }
      window._drag={x:body.x,y:body.y}; return (G.drags||[]).length; }""")
    check('drag trail', r>=5, r)
    shot('drag',J(pg,"()=>_drag.x+60"),J(pg,"()=>_drag.y"),300,140)
    r=J(pg,"""()=>{ const G=__hc.G, s=makeUnit('trooper','corps',P0.x,P0.y+150); const d=makeUnit('drone','swarm',P0.x+120,P0.y+150); d.hp=d.maxHp=9999; const d2=makeUnit('drone','swarm',P0.x+126,P0.y+156); d2.hp=d2.maxHp=9999; throwGrenade(s,d); for(let i=0;i<8;i++) __hc.update(1/30); window._gr={x:P0.x+60,y:P0.y+150}; return G.shots.some(x=>x.k==='grenade'); }""")
    check('grenade in flight', r, '')
    shot('grenade',J(pg,"()=>_gr.x"),J(pg,"()=>_gr.y"),260,140)
    r=J(pg,"""()=>{ const G=__hc.G; for(const h of hives()) kill(h); for(let i=0;i<30*4;i++) __hc.update(1/30); let dying=0; for(let k=0;k<G.creep.length;k++) if(G.creep[k]>G.creepTgt[k]+0.05) dying++; return dying; }""")
    check('creep dies off', r>10, r)
    r=J(pg,"""()=>{ const G=__hc.G; for(const sh of shafts()) sh.heir=null; G.devReveal=false; G.vis.fill(0); const out=launchWave(80,P0); const sp=G.fx.find(f=>f.k==='shaftspit'); G.devReveal=true; computeFog(); window._sp=sp&&{x:sp.x,y:sp.y};
      return [out.length, out.every(u=>u.hidden), !!sp]; }""")
    check('shaft spits', r[0]>0 and r[1] and r[2], r)
    if r[2]:
        J(pg,"()=>{ for(let i=0;i<20;i++) __hc.update(1/30); }"); shot('shaftspit',J(pg,"()=>_sp.x"),J(pg,"()=>_sp.y+10"),200,140)
    r=J(pg,"""()=>{ startMission(MISSIONS.find(m=>m.id==='blackout')); const G=__hc.G; for(let i=0;i<5;i++) __hc.update(1/30); const g=G.ents.find(e=>e.def&&e.def.generator); if(!g) return 'none';
      g.powered=true; g.hp=g.maxHp; __hc.update(1/30); g.hp=g.maxHp*0.1; __hc.update(1/30); return [g.powered, g.flickT>0]; }""")
    check('generator flickers out', r==[False,True], r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
