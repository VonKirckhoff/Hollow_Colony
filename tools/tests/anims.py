# Extra animations and the Pyro's ground fire: every effect runs without errors; the fire hurts and sets the Swarm alight, not your troops.
from playwright.sync_api import sync_playwright
import sys
errs=[]; ok=True; SHOT=sys.argv[1] if len(sys.argv)>1 else None
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); const G=__hc.G; G.devReveal=true; computeFog(); for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; }")
    pg.wait_for_timeout(300)
    def shot(name,cx,cy,w=360,h=260):
        if not SHOT: return
        J(pg,f"()=>{{ centerOn({cx},{cy}); }}"); pg.wait_for_timeout(120)
        c=J(pg,f"()=>[Math.round({cx}-__hc.G.cam.x),Math.round({cy}-__hc.G.cam.y)]")
        pg.screenshot(path=f'{SHOT}/{name}.png',clip={'x':max(0,c[0]-w//2),'y':max(0,c[1]-h//2),'width':w,'height':h})
    step=lambda n: J(pg,f"()=>{{ for(let i=0;i<{n};i++) __hc.update(1/30); }}")
    # the open ground in front of the Command Post
    J(pg,"()=>{ const hq=__hc.G.ents.find(e=>e.type==='hq'); window.P0={x:hq.x+5*TILE,y:hq.y+3*TILE}; }")
    # 1. Pyro fire
    r=J(pg,"""()=>{ const G=__hc.G, p=makeUnit('pyro','corps',P0.x-40,P0.y); p.quiet=false; const ds=[0,1,2].map(i=>{ const d=makeUnit('drone','swarm',P0.x+10,P0.y-16+i*16); d.hp=d.maxHp=400; return d; });
      for(let i=0;i<12;i++) fire(p,ds[1]); const n=(G.fires||[]).length; for(const d of ds){ d.x+=2; }
      for(let i=0;i<20;i++) __hc.update(1/30); window._ds=ds; window._py=p;
      return [n, ds.map(d=>Math.round(d.hp)), ds.map(d=>+(d.burnT||0).toFixed(1)), Math.round(p.hp)===Math.round(p.maxHp)]; }""")
    check('fire patches + burning', r[0]>=1 and all(x<400 for x in r[1]) and any(x>0 for x in r[2]), r)
    r=J(pg,"""()=>{ const s=makeUnit('trooper','corps',P0.x+10,P0.y); const hp=s.hp; for(let i=0;i<30;i++) __hc.update(1/30); return [hp,Math.round(s.hp)]; }""")
    check('own troops not hurt by fire', r[0]==r[1], r)
    shot('fire',J(pg,"()=>P0.x"),J(pg,"()=>P0.y"))
    r=J(pg,"""()=>{ for(let i=0;i<30*16;i++) __hc.update(1/30); return [(__hc.G.fires||[]).length, _ds.filter(d=>!d.dead).length, (__hc.G.fires||[]).map(f=>[Math.round(f.t),f.src&&f.src.type, f.src&&f.src.target&&f.src.target.type])]; }""")
    check('fire goes out', r[0]==0, r)
    # 2. melt
    J(pg,"()=>{ const d=makeUnit('drone','swarm',P0.x,P0.y+60); kill(d,null); for(let i=0;i<20;i++) __hc.update(1/30); }")
    check('melt fx', J(pg,"()=>__hc.G.fx.some(f=>f.k==='melt')"), '')
    shot('melt',J(pg,"()=>P0.x"),J(pg,"()=>P0.y+60"),200,140)
    # 3. gunner casings, sentry barrel
    r=J(pg,"""()=>{ const G=__hc.G, g=makeUnit('gunner','corps',P0.x-80,P0.y+120), d=makeUnit('drone','swarm',P0.x+40,P0.y+120); d.hp=d.maxHp=9999;
      const s=makeBuilding('sentry','corps',Math.floor((P0.x-20)/TILE),Math.floor((P0.y+160)/TILE),true); for(let i=0;i<8;i++){ fire(g,d); fire(s,d); } for(let i=0;i<90;i++) __hc.update(1/30);
      return [G.fx.filter(f=>f.k==='casing').length, G.fx.filter(f=>f.k==='casing'&&f.rest).length, +(s.angle||0).toFixed(2)]; }""")
    check('casings', r[0]>=8 and r[1]>=1, r)
    shot('casings',J(pg,"()=>P0.x-20"),J(pg,"()=>P0.y+130"))
    # 4. damage stages and a construction site
    J(pg,"""()=>{ const G=__hc.G, a=makeBuilding('barricade','corps',Math.floor((P0.x-100)/TILE),Math.floor((P0.y-120)/TILE),true); a.hp=a.maxHp*0.6;
      const b=makeBuilding('barricade','corps',Math.floor((P0.x-60)/TILE),Math.floor((P0.y-120)/TILE),true); b.hp=b.maxHp*0.4;
      const c=makeBuilding('barricade','corps',Math.floor((P0.x-20)/TILE),Math.floor((P0.y-120)/TILE),true); c.hp=c.maxHp*0.15;
      const s=makeBuilding('relay','corps',Math.floor((P0.x+40)/TILE),Math.floor((P0.y-130)/TILE),false); s.progress=0.55; s.weldT=5; for(let i=0;i<40;i++) __hc.update(1/30); s.weldT=5; }""")
    shot('damage_site',J(pg,"()=>P0.x-20"),J(pg,"()=>P0.y-115"),420,200)
    # 5. medic on a downed soldier, acid, promotion glint
    J(pg,"""()=>{ const G=__hc.G, t=makeUnit('trooper','corps',P0.x+140,P0.y); goDown(t,null); t.downed.patch=0.5; const v=makeUnit('trooper','corps',P0.x+190,P0.y); v.acidT=2;
      const w=makeUnit('trooper','corps',P0.x+230,P0.y); if(!w.vet) w.vet={name:'X',rank:0,xp:0,kills:0,id:'zz'}; gainXP(w,5); w.glintT=0.7; window._t=t; }""")
    shot('medic_acid_glint',J(pg,"()=>P0.x+185"),J(pg,"()=>P0.y-10"),300,140)
    r=J(pg,"()=>{ const m=makeUnit('medic','corps',_t.x+14,_t.y); patchUp(m,_t,10); return [!_t.downed, __hc.G.fx.some(f=>f.k==='shock')]; }")
    check('shock on revive', r==[True,True], r)
    # 6. brute stomp + footprints
    r=J(pg,"""()=>{ const G=__hc.G, br=makeUnit('brute','swarm',P0.x-120,P0.y+200); br.order={type:'move',x:P0.x+120,y:P0.y+200}; setPath(br,br.order.x,br.order.y); br.role='hunt';
      const s=makeUnit('trooper','corps',P0.x-120,P0.y+240); s.order={type:'move',x:P0.x+60,y:P0.y+240}; setPath(s,s.order.x,s.order.y);
      for(let i=0;i<45;i++) __hc.update(1/30); window._br=br; return [G.fx.filter(f=>f.k==='stomp').length, (G.prints||[]).length]; }""")
    check('stomps + prints', r[0]>=1 and r[1]>=3, r)
    shot('brute_prints',J(pg,"()=>_br.x"),J(pg,"()=>P0.y+220"),400,200)
    # 7. hive hurt, eggs opening, creep pulses
    J(pg,"""()=>{ const G=__hc.G, h=hives()[0]; h.hp=h.maxHp*0.25; window._hv=h; const e=layHiveEgg(h,h.x+2*TILE,h.y+TILE,null); e.openT=EGG.open*0.3; }""")
    shot('hive_hurt_egg',J(pg,"()=>_hv.x"),J(pg,"()=>_hv.y"),300,240)
    # 8. meteor, flyover
    J(pg,"()=>{ centerOn(P0.x,P0.y); __hc.G.meteorT=0; __hc.update(1/30); }")
    check('meteor', J(pg,"()=>__hc.G.fx.some(f=>f.k==='meteor')"), '')
    J(pg,"()=>{ for(let i=0;i<18;i++) __hc.update(1/30); }")
    m=J(pg,"()=>{ const f=__hc.G.fx.find(f=>f.k==='meteor'); return f?[f.x,f.y]:[P0.x,P0.y]; }")
    shot('meteor',m[0],m[1],200,160)
    r=J(pg,"""()=>{ const G=__hc.G; let lz=G.ents.find(e=>e.def&&e.def.reinforce); if(!lz){ lz=makeBuilding('lz','corps',Math.floor(P0.x/TILE)+2,Math.floor(P0.y/TILE)+6,true); lz.invuln=true; }
      lz.flight={t:8.2,total:25,cargo:[]}; window._lz=lz; return !!lz; }""")
    shot('flyover',J(pg,"()=>_lz.x"),J(pg,"()=>_lz.y"),700,500)
    J(pg,"()=>{ for(let i=0;i<30*9;i++) __hc.update(1/30); }")
    check('landed (ring)', J(pg,"()=>!_lz.flight"), '')
    # 9. dev panel tab
    J(pg,"()=>{ devToggle(true); dev.tab='fx'; devRender(); }"); pg.wait_for_timeout(200)
    check('dev tab', J(pg,"()=>document.querySelector('#dev .dv-body').innerText.includes('igniteDps')"), '')
    if SHOT: pg.screenshot(path=f'{SHOT}/dev.png')
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
