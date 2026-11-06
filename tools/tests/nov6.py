# An Engineer repairs from the side of his squad, away from the Swarm; without Swarm he takes the nearest side. The meteorite has its own sound.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); for(const e of __hc.G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; }"); pg.wait_for_timeout(300)
    setup="""const G=__hc.G, m=G.map; let spot=null;
      for(let y=6;y<m.h-6&&!spot;y++) for(let x=8;x<m.w-10&&!spot;x++){ let open=true; for(let dy=-4;dy<=4&&open;dy++) for(let dx=-7;dx<=7;dx++) if(!walkableT(x+dx,y+dy)||G.block[(y+dy)*m.w+x+dx]) open=false; if(open) spot={x,y}; }
      const s=makeBuilding('sentry','corps',spot.x,spot.y,true); s.hp=s.maxHp*0.3; s.quiet=true; """
    # with the Swarm to the east and the squad to the west, an Engineer coming from the north-east goes round to the west
    r=J(pg,"()=>{ "+setup+"""
      const foes=[0,1,2].map(i=>{ const d=makeUnit('drone','swarm',s.x+6*TILE,s.y-TILE+i*TILE); d.order={type:'hold'}; d.speedMul=0; d.hp=d.maxHp=9999; return d; });
      const mates=[0,1,2].map(i=>makeUnit('trooper','corps',s.x-4*TILE,s.y-TILE+i*TILE)); mates.forEach(t=>t.quiet=true);
      const e=makeUnit('engineer','corps',s.x+2*TILE,s.y-3*TILE); e.quiet=true; e.order={type:'repair',target:s};
      for(let i=0;i<30*6;i++){ __hc.update(1/30); for(const d of foes){ d.x=s.x+6*TILE; d.target=null; d.path=null; } }
      return [Math.round((e.x-s.x)/TILE*10)/10, Math.round(s.hp/s.maxHp*100)]; }""")
    check('repairs from the squad side', r[0]<0 and r[1]>30, r)
    # no Swarm, no squad: the nearest side, no walk round
    r=J(pg,"()=>{ for(const e of __hc.G.ents) if(e.kind==='unit'||e.type==='hive') e.dead=true; "+setup.replace("const G=__hc.G","const G=__hc.G")+"""
      const e=makeUnit('engineer','corps',s.x+4*TILE,s.y); e.quiet=true; e.order={type:'repair',target:s}; let walked=0, lx=e.x, ly=e.y;
      for(let i=0;i<30*5;i++){ __hc.update(1/30); walked+=Math.hypot(e.x-lx,e.y-ly); lx=e.x; ly=e.y; }
      return [Math.round((e.x-s.x)/TILE*10)/10, Math.round(walked/TILE*10)/10, Math.round((e.y-s.y)/TILE*10)/10, s.size, e.order&&e.order.spot&&[(e.order.spot.x-s.x)/TILE,(e.order.spot.y-s.y)/TILE], !!e.order]; }""")
    check('nearest side without Swarm', r[0]>0 and r[1]<4, r)
    check('meteor sound', J(pg,"()=>{ try{ SFX.play('meteor',0,0); return true; }catch(e){ return String(e); } }")==True, '')
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
