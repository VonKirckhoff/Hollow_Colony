# The second round of animations: spit wind-up, hit splatter, ground bulge, red edge, falling, helmet lamps, muzzle light,
# order mark, radar, sentry unfolding, dust devil, glints, low-gravity debris.
from playwright.sync_api import sync_playwright
import sys
errs=[]; ok=True; SHOT=sys.argv[1] if len(sys.argv)>1 else None
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':760}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    def shot(name,cx,cy,w=360,h=260,full=False):
        if not SHOT: return
        J(pg,f"()=>{{ centerOn({cx},{cy}); }}"); pg.wait_for_timeout(150)
        if full: pg.screenshot(path=f'{SHOT}/{name}.png'); return
        c=J(pg,f"()=>[Math.round({cx}-__hc.G.cam.x),Math.round({cy}-__hc.G.cam.y)]")
        pg.screenshot(path=f'{SHOT}/{name}.png',clip={'x':max(0,c[0]-w//2),'y':max(0,c[1]-h//2),'width':w,'height':h})
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); const G=__hc.G; G.devReveal=true; computeFog(); for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; const hq=G.ents.find(e=>e.type==='hq'); window.P0={x:hq.x+5*TILE,y:hq.y+3*TILE}; window._hq=hq; }")
    pg.wait_for_timeout(300)
    # spit wind-up: no acid lands before the charge; a dead Spitter spits nothing
    r=J(pg,"""()=>{ const G=__hc.G, s=makeUnit('spitter','swarm',P0.x+90,P0.y), t=makeUnit('trooper','corps',P0.x,P0.y); fire(s,t); const n0=G.shots.length, c=s.chargeT;
      for(let i=0;i<6;i++) __hc.update(1/30); const early=G.shots.some(x=>x.k==='acid'&&x.t<0);
      const s2=makeUnit('spitter','swarm',P0.x+90,P0.y+40); fire(s2,t); s2.dead=true; for(let i=0;i<3;i++) __hc.update(1/30);
      return [+c.toFixed(2), early, G.shots.filter(x=>x.src===s2).length]; }""")
    check('spit wind-up', r[0]==0.5 and r[1] and r[2]==0, r)
    r=J(pg,"""()=>{ const G=__hc.G, d=makeUnit('drone','swarm',P0.x+40,P0.y+60), g=makeUnit('gunner','corps',P0.x-20,P0.y+60); const n=G.fx.length; damage(d,1,g); return G.fx.length-n; }""")
    check('hit splatter', r>=4, r)
    # bulge: a burrowing wave stays hidden first
    r=J(pg,"""()=>{ const G=__hc.G; G.devReveal=false; G.vis.fill(0); for(const h of hives()) kill(h); for(const s of shafts()) s.dead=true; for(let i=0;i<5;i++) __hc.update(1/30);
      const out=launchWave(100,{x:P0.x,y:P0.y}); const hid=out.length&&out.every(u=>u.hidden&&u.invuln), b=G.fx.find(f=>f.k==='bulge'); window._bul=b&&{x:b.x,y:b.y};
      for(let i=0;i<10;i++) __hc.update(1/30); G.devReveal=true; computeFog(); return [out.length, hid, !!b, out.map(u=>[Math.round(u.x),Math.round(u.y)])[0]]; }""")
    check('bulge first', r[0]>0 and r[1] and r[2], r)
    if r[2]: shot('bulge',J(pg,"()=>_bul.x"),J(pg,"()=>_bul.y"),240,160)
    r=J(pg,"""()=>{ for(let i=0;i<30;i++) __hc.update(1/30); return __hc.G.ents.filter(u=>u.kind==='unit'&&u.faction==='swarm'&&!u.dead).every(u=>!u.hidden&&!(u.emergeT>0)); }""")
    check('broke out', r, '')
    J(pg,"()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; __hc.update(1/30); }")
    # red edge
    r=J(pg,"""()=>{ const G=__hc.G, t=makeUnit('trooper','corps',P0.x,P0.y); t.hp=t.maxHp=9999; for(let i=0;i<5;i++) damage(t,40,{faction:'swarm',dead:false,x:P0.x+900,y:P0.y}); return Math.round(G.hurtAcc); }""")
    check('red edge', r>=150, r)
    shot('rededge',J(pg,"()=>P0.x"),J(pg,"()=>P0.y"),full=True)
    # falling and helmet
    r=J(pg,"""()=>{ const G=__hc.G, t=makeUnit('trooper','corps',P0.x-60,P0.y+80); goDown(t,null); __hc.update(1/30); window._fall=t; return [+(t.fallT||0).toFixed(2), G.fx.some(f=>f.k==='helmet')]; }""")
    check('falls', r[0]>0 and r[1], r)
    # order mark, radar, sentry unfold, debris, devil, glints
    r=J(pg,"""()=>{ const G=__hc.G; orderMark(P0.x+120,P0.y+100,false); orderMark(P0.x+160,P0.y+100,true);
      const s=makeBuilding('sentry','corps',Math.floor((P0.x+60)/TILE),Math.floor((P0.y-80)/TILE),false); s.progress=0.999; const e=makeUnit('engineer','corps',s.x+20,s.y); e.order={type:'repair',target:s};
      for(let i=0;i<150;i++){ __hc.update(1/30); if(s.built) break; } window._dbg=[Math.round(e.x-s.x),Math.round(e.y-s.y),e.order&&e.order.spot&&[e.order.spot.x-s.x,e.order.spot.y-s.y],s.progress]; orderMark(P0.x+120,P0.y+100,false); orderMark(P0.x+160,P0.y+100,true); window._sen=s; debrisBurst(P0.x-120,P0.y+40,20,['#8a7a6a','#5a4632']); G.devilT=0; __hc.update(1/30);
      return [G.fx.filter(f=>f.k==='order').length, s.built, s.unfoldT>0, _dbg, G.fx.filter(f=>f.k==='debris').length, G.fx.some(f=>f.k==='devil')]; }""")
    check('order, unfold, debris, devil', r[0]==2 and r[1] and r[2] and r[4]>=20 and r[5], r)
    shot('misc',J(pg,"()=>P0.x"),J(pg,"()=>P0.y+20"),520,320)
    r=J(pg,"()=>{ for(let i=0;i<30*2;i++) __hc.update(1/30); const d=__hc.G.fx.filter(f=>f.k==='debris'); return [d.length, d.filter(f=>f.rest).length]; }")
    check('debris hangs then lands', r[0]>=10, r)
    shot('hq_radar',J(pg,"()=>_hq.x"),J(pg,"()=>_hq.y"),200,160)
    # helmet lamps in Blackout: further sight inside the beam
    r=J(pg,"""()=>{ startMission(MISSIONS.find(m=>m.id==='blackout')); const G=__hc.G; for(let i=0;i<10;i++) __hc.update(1/30);
      const u=G.ents.find(e=>e.kind==='unit'&&e.faction==='corps'&&e.def.bio); u.head=0; ANIM.lamps=false; computeFog(); let tx=0, ty=0;
      for(let y=3;y<G.map.h-3&&!tx;y++) for(let x=3;x<G.map.w-12&&!tx;x++){ let ok=true; for(let d=-2;d<=9&&ok;d++) if(!walkableT(x+d,y)||G.vis[y*G.map.w+x+d]) ok=false; if(ok){ tx=x; ty=y; } }
      u.x=(tx+.5)*TILE; u.y=(ty+.5)*TILE; u.order={type:'hold'}; u.path=null; u.target=null;
      ANIM.lamps=false; computeFog(); let off=0; for(let d=1;d<9;d++) if(G.vis[ty*G.map.w+tx+d]) off=d; else break;
      ANIM.lamps=true; computeFog(); let on=0; for(let d=1;d<9;d++) if(G.vis[ty*G.map.w+tx+d]) on=d; else break; window._lu=u;
      return [off,on]; }""")
    check('lamps see further', r[1]>r[0], r)
    shot('lamps',J(pg,"()=>_lu.x"),J(pg,"()=>_lu.y"),500,320)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
