# Attacking in formation: a squad marches up to a hive in its shape and only then attacks; once the hive is gone it forms up again;
# Medics do not walk back to where they last stood when an order of theirs is dropped (formation released, defensive switched on).
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
SETUP="""(a)=>{ const dist=a[0], types=a[1], G=__hc.G; for(const e of G.ents) if(e.kind==='unit'&&(e.faction==='corps'||e.faction==='swarm')) e.dead=true;
  G.swarm.cfg.aggro=0; G.swarm.cfg.rate=0; G.seen.fill(1); HIVE_DEFENCE.brood=0; HIVE_DEFENCE.help=0;
  const h=hives()[0]; let spot=null;
  for(let a=0;a<64&&!spot;a++){ const an=a/64*Math.PI*2, x=h.x+Math.cos(an)*dist*TILE, y=h.y+Math.sin(an)*dist*TILE; let open=true;
    for(let dy=-2;dy<=2&&open;dy++) for(let dx=-2;dx<=2;dx++) if(!walkableP(x+dx*TILE,y+dy*TILE)) open=false; if(open&&findPath(x,y,h.x,h.y)) spot={x,y}; }
  const us=types.map((t,i)=>makeUnit(t,'corps',spot.x+(i%4-1.5)*24,spot.y+(Math.floor(i/4)-1.5)*24));
  formUp(us,'circle'); for(let i=0;i<30*3;i++) __hc.update(1/30); selectEntities(us,false); cmdHold(); for(let i=0;i<30;i++) __hc.update(1/30);
  window.US=us; window.HV=h; h.maxHp*=6; h.hp=h.maxHp; return true; }"""
SQUAD=['trooper','trooper','trooper','trooper','trooper','gunner','gunner','pyro','pyro','medic','medic','engineer','engineer']
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # A. Dust Landing: through the tunnel to the western hive, in formation the whole way
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='dust-landing')); }"); pg.wait_for_timeout(300)
    r=J(pg,"""()=>{ const G=__hc.G; for(const e of G.ents) if(e.kind==='unit'&&(e.faction==='corps'||e.faction==='swarm')) e.dead=true;
      G.swarm.cfg.rate=0; G.swarm.cfg.aggro=0; G.seen.fill(1); HIVE_DEFENCE.brood=0; HIVE_DEFENCE.help=0;
      for(let i=0;i<30;i++) __hc.update(1/30); for(const e of G.ents) if(e.def&&e.def.scenery&&e.tag==='north'&&!e.dead) kill(e); for(let i=0;i<10;i++) __hc.update(1/30);
      const h=hives().sort((a,b)=>a.x-b.x)[0], x0=44.5*TILE, y0=30*TILE, types=['trooper','trooper','trooper','trooper','trooper','trooper','gunner','pyro','medic'];
      const us=types.map((t,i)=>makeUnit(t,'corps',x0+(i%3-1)*24,y0+(Math.floor(i/3)-1)*24));
      formUp(us,'circle'); for(let i=0;i<30*3;i++) __hc.update(1/30); selectEntities(us,false); cmdHold(); for(let i=0;i<30;i++) __hc.update(1/30);
      h.maxHp*=8; h.hp=h.maxHp;
      const sp=()=>{ const n=us.length,cx=us.reduce((a,u)=>a+u.x,0)/n,cy=us.reduce((a,u)=>a+u.y,0)/n; return Math.max(...us.map(u=>Math.hypot(u.x-cx,u.y-cy)))/TILE; };
      const d0=Math.hypot(x0-h.x,y0-h.y)/TILE; smartCommand(h.x,h.y); let maxsp=0, t=0;
      while(t<60){ __hc.update(1/30); t+=1/30; if(us.some(u=>u.order&&u.order.type==='attack')) break; maxsp=Math.max(maxsp,sp()); }
      const hd=Math.hypot(us.reduce((a,u)=>a+u.x,0)/us.length-h.x,us.reduce((a,u)=>a+u.y,0)/us.length-h.y)/TILE;
      return [+d0.toFixed(1), +t.toFixed(1), +maxsp.toFixed(1), +hd.toFixed(1)]; }""")
    check('Dust Landing: marches up in formation, attacks at range', r[0]>25 and r[1]>8 and r[1]<60 and r[2]<3.2 and r[3]<11, r)
    # B. Burn the Brood: attack, the hive falls, the squad forms up again
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    pg.evaluate(SETUP,[14,SQUAD])
    r=J(pg,"""()=>{ const us=US, h=HV, f=us[0].formation; smartCommand(h.x,h.y); const marched=!!(f.march&&f.march.attack);
      let t=0; while(t<30&&!us.some(u=>u.order&&u.order.type==='attack')){ __hc.update(1/30); t+=1/30; }
      const med=us.filter(u=>u.def.heal).map(u=>u.order&&u.order.type).join(',');
      for(let i=0;i<30*4;i++) __hc.update(1/30); const hit=h.hp<h.maxHp;
      kill(h); for(let i=0;i<30*6;i++) __hc.update(1/30);
      const off=Math.max(...us.map(u=>{ const p=formationSpot(u); return p?Math.hypot(p.x-u.x,p.y-u.y)/TILE:99; }));
      return [marched, +t.toFixed(1), med, hit, !!f.at, +off.toFixed(2), f.engaged==null]; }""")
    check('Burn the Brood: march, attack, Medics support, back in formation', r[0] and r[1]>0.5 and r[2]=='support,support' and r[3] and r[4] and r[5]<0.8 and r[6], r)
    # C. close by: the attack starts at once (no march)
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    pg.evaluate(SETUP,[7,SQUAD])
    r=J(pg,"""()=>{ const us=US, h=HV, f=us[0].formation; smartCommand(h.x,h.y); return [!f.march, us.filter(u=>u.order&&u.order.type==='attack').length]; }""")
    check('close by: attacks at once', r[0] and r[1]==11, r)
    # D. a new order on the way cancels the attack; save and load in the middle of an attack march
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    pg.evaluate(SETUP,[14,SQUAD])
    r=J(pg,"""()=>{ const us=US, h=HV, f=us[0].formation; smartCommand(h.x,h.y); for(let i=0;i<20;i++) __hc.update(1/30);
      const s=encodeGame(); const back=JSON.parse(JSON.stringify(s)); const ok1=!!s;
      const x=us[0].x, y=us[0].y; moveGroup(us,x-3*TILE,y,'move'); const cancelled=!(f.march&&f.march.attack);
      for(let i=0;i<30*5;i++) __hc.update(1/30); return [ok1, cancelled, us.every(u=>!u.order||u.order.type!=='attack')]; }""")
    check('save mid-march, new order cancels the attack', all(r), r)
    # E. Medics: a dropped order does not send them back to an old spot (the video: circle released, wedge, wedge released)
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    pg.evaluate(SETUP,[12,SQUAD])
    r=J(pg,"""()=>{ const us=US, h=HV, med=us.filter(u=>u.def.heal); engageTarget(us,h); for(let i=0;i<30*8;i++) __hc.update(1/30);
      selectEntities(us,false); setFormation('circle'); for(let i=0;i<15;i++) __hc.update(1/30); setFormation('wedge'); for(let i=0;i<10;i++) __hc.update(1/30);
      setFormation('wedge'); selectEntities([h],false); const at=med.map(m=>({x:m.x,y:m.y})); for(let i=0;i<30*8;i++) __hc.update(1/30);
      const moved=Math.max(...med.map((m,i)=>Math.hypot(m.x-at[i].x,m.y-at[i].y)/TILE));
      selectEntities(us,false); engageTarget(us,h); for(let i=0;i<30*4;i++) __hc.update(1/30); cmdHold(); const at2=med.map(m=>({x:m.x,y:m.y})); for(let i=0;i<30*6;i++) __hc.update(1/30);
      const moved2=Math.max(...med.map((m,i)=>Math.hypot(m.x-at2[i].x,m.y-at2[i].y)/TILE));
      return [+moved.toFixed(1), +moved2.toFixed(1)]; }""")
    check('Medics stay with the squad after a dropped order', r[0]<1.5 and r[1]<1.5, r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
