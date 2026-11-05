# High Ground shafts with creep, a downed soldier keeps time for a Medic, formation takes the clicked spot, Medic on a leash.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # A. High Ground: shafts keep creep and become nests when the hives are gone
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='high-ground')); }"); pg.wait_for_timeout(300)
    r=J(pg,"""()=>{ const G=__hc.G; for(let i=0;i<30;i++) __hc.update(1/30); for(const h of hives()) kill(h); for(let i=0;i<30*20;i++) __hc.update(1/30);
      return [hives().length, shafts().map(s=>[!!s.heir, isNest(s), +Math.max(...[-1,0,1].flatMap(a=>[-1,0,1].map(b=>creepAt(s.x+a*TILE,s.y+b*TILE)))).toFixed(2)]), nests().length]; }""")
    check('HG shafts are nests with creep', r[0]==0 and all(x[0] and x[1] and x[2]>0.3 for x in r[1]) and r[2]==4, r)
    r=J(pg,"""()=>{ const G=__hc.G, s=shafts()[2]; const t=makeUnit('trooper','corps',s.x+2*TILE,s.y+TILE); kill(t,null); const body=G.ents.find(e=>e.kind==='body'&&!e.dead);
      for(let i=0;i<30*40;i++){ __hc.update(1/30); if(G.ents.some(e=>e.type==='cocoon'&&!e.dead)||G.ents.some(e=>e.def&&e.def.grafter&&!e.dead)) break; }
      return [!!body, G.ents.some(e=>!e.dead&&(e.type==='egg'||e.type==='cocoon'||(e.def&&e.def.grafter)))]; }""")
    check('HG body turns at a shaft', r==[True,True], r)
    # B. downed: splash no longer finishes him; the Brood Mother still can
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); for(const e of __hc.G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; }"); pg.wait_for_timeout(300)
    r=J(pg,"""()=>{ const G=__hc.G, hq=G.ents.find(e=>e.type==='hq'), t=makeUnit('trooper','corps',hq.x+4*TILE,hq.y+3*TILE), d=makeUnit('drone','swarm',t.x+60,t.y);
      goDown(t,d); const t0=t.downed.t; for(let i=0;i<20;i++) damage(t,200,{faction:'swarm',dead:true,acid:true}); const left=t.downed&&t.downed.t;
      const bm={faction:'swarm',kind:'unit',def:{boss:true},dead:false}; const t2=makeUnit('trooper','corps',t.x,t.y+40); goDown(t2,d); damage(t2,9999,bm);
      return [t0, !t.dead, +(left||0).toFixed(1), !!t2.dead]; }""")
    check('downed keeps time', r[1] and r[2]>=6 and r[3], r)
    # C. Medic on a leash
    r=J(pg,"""()=>{ const G=__hc.G, hq=G.ents.find(e=>e.type==='hq'), x0=hq.x+6*TILE, y0=hq.y+4*TILE;
      const us=[makeUnit('medic','corps',x0,y0), makeUnit('trooper','corps',x0+30,y0), makeUnit('trooper','corps',x0-30,y0), makeUnit('trooper','corps',x0,y0+30)];
      formUp(us,'circle'); for(let i=0;i<30*4;i++) __hc.update(1/30); const m=us[0], s=us[1]; s.hp=s.maxHp*0.3;
      const spot=formationSpot(m)||m.home; leaveFormation([s]); moveGroup([s],x0-16*TILE,y0,'move'); let far=0;
      for(let i=0;i<30*14;i++){ __hc.update(1/30); far=Math.max(far,Math.hypot(m.x-spot.x,m.y-spot.y)/TILE); }
      const near=us[2]; near.hp=near.maxHp*0.3; const h0=near.hp; for(let i=0;i<30*4;i++) __hc.update(1/30);
      return [+far.toFixed(1), Math.round(Math.hypot(s.x-x0,s.y-y0)/TILE), near.hp>h0]; }""")
    check('medic stays near the squad, still heals the squad', r[0]<=4+3.5+0.6 and r[1]>=12 and r[2], r)
    # D. formation takes the clicked spot next to rock
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map; let spot=null;
      for(let y=4;y<m.h-4&&!spot;y++) for(let x=8;x<m.w-8&&!spot;x++){ if(!walkableT(x,y)||!walkableT(x-1,y)) continue; if(walkableT(x+1,y)) continue;   /* rock right next to it on the east */
        let open=true; for(let dy=-3;dy<=3&&open;dy++) for(let dx=-6;dx<=0;dx++) if(!walkableT(x+dx,y+dy)) open=false; if(open) spot={x,y}; }
      const cx=(spot.x+.5)*TILE, cy=(spot.y+.5)*TILE, us=[];
      for(let i=0;i<8;i++) us.push(makeUnit(i==4?'medic':'trooper','corps',cx-8*TILE+(i%4)*24,cy+Math.floor(i/4)*24));
      formUp(us,'circle'); for(let i=0;i<30*3;i++) __hc.update(1/30); moveGroup(us,cx,cy,'move'); for(let i=0;i<30*20;i++) __hc.update(1/30);
      const f=us[0].formation, ux=us.reduce((a,u)=>a+u.x,0)/8, uy=us.reduce((a,u)=>a+u.y,0)/8;
      return [spot, +(Math.hypot(f.at.x-cx,f.at.y-cy)/TILE).toFixed(2), +(Math.hypot(ux-cx,uy-cy)/TILE).toFixed(2), us.every(u=>walkableP(u.x,u.y))]; }""")
    check('formation on the clicked spot', r[1]<0.3 and r[2]<1.6 and r[3], r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
