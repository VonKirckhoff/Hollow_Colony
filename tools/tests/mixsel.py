# A mixed selection: a squad in a circle, one member moved away on his own, then the whole squad moved.
# Everyone must end up at the new spot (the loose one back in the circle), nobody walks back to the old place.
# Also: two squads in formation moved together do not walk back afterwards.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
SETUP="""()=>{ const G=__hc.G; for(const e of G.ents) if(e.kind==='unit'&&(e.faction==='corps'||e.faction==='swarm')) e.dead=true;
  G.swarm.cfg.aggro=0; G.swarm.cfg.rate=0; G.seen.fill(1);
  let spot=null; for(let ty=6;ty<G.map.h-6&&!spot;ty++) for(let tx=6;tx<G.map.w-14&&!spot;tx++){ let open=true;
    for(let dy=-3;dy<=3&&open;dy++) for(let dx=-3;dx<=12;dx++) if(!walkableT(tx+dx,ty+dy)){ open=false; break; } if(open) spot={x:(tx+.5)*TILE,y:(ty+.5)*TILE}; }
  window.SPOT=spot; return spot; }"""
RUN=lambda n: "for(let i=0;i<30*%d;i++) __hc.update(1/30);"%n
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    sp=J(pg,SETUP); print('spot',sp)
    r=J(pg,"""()=>{ const s=SPOT, types=['trooper','trooper','trooper','trooper','gunner','pyro','medic','engineer'];
      const us=types.map((t,i)=>makeUnit(t,'corps',s.x+(i%4-1.5)*24,s.y+(Math.floor(i/4)-.5)*24)); window.US=us;
      selectEntities(us,false); setFormation('circle'); """+RUN(4)+"""
      const one=us[2]; selectEntities([one],false); smartCommand(s.x+3*TILE,s.y+2*TILE); """+RUN(4)+"""
      const away=Math.hypot(one.x-(s.x+3*TILE),one.y-(s.y+2*TILE))/TILE, loose=!one.formation;
      selectEntities(us,false); const tx=s.x+9*TILE, ty=s.y; smartCommand(tx,ty); """+RUN(14)+"""
      const n=us.length, cx=us.reduce((a,u)=>a+u.x,0)/n, cy=us.reduce((a,u)=>a+u.y,0)/n;
      const far=Math.max(...us.map(u=>Math.hypot(u.x-tx,u.y-ty)/TILE)), f=us[0].formation;
      const one_f=us.every(u=>u.formation===f), off=Math.max(...us.map(u=>{ const p=formationSpot(u); return p?Math.hypot(p.x-u.x,p.y-u.y)/TILE:99; }));
      """+RUN(5)+""" const far2=Math.max(...us.map(u=>Math.hypot(u.x-tx,u.y-ty)/TILE));
      return [+away.toFixed(2), loose, +far.toFixed(2), one_f, f&&f.shape, +off.toFixed(2), +far2.toFixed(2)]; }""")
    check('one moved off, then the whole squad: all at the new spot, in one circle, nobody walks back',
          r[0]<1 and r[1] and r[2]<3.5 and r[3] and r[4]=='circle' and r[5]<0.8 and r[6]<3.5, r)
    # two squads in formation, moved together
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(300)
    J(pg,SETUP)
    r=J(pg,"""()=>{ const s=SPOT, mk=(dx)=>['trooper','trooper','trooper','medic'].map((t,i)=>makeUnit(t,'corps',s.x+dx+(i%2-.5)*24,s.y+(Math.floor(i/2)-.5)*24));
      const a=mk(0), b=mk(3*TILE); selectEntities(a,false); setFormation('circle'); selectEntities(b,false); setFormation('wedge'); """+RUN(4)+"""
      const all=[...a,...b]; selectEntities(all,false); const tx=s.x+10*TILE, ty=s.y; smartCommand(tx,ty); """+RUN(18)+"""
      return +Math.max(...all.map(u=>Math.hypot(u.x-tx,u.y-ty)/TILE)).toFixed(2); }""")
    check('two squads moved together stay at the new spot', r<4, r)
    print('errors',errs[:3])
    b.close()
print('ALL OK' if ok and not errs else 'FAILED')
