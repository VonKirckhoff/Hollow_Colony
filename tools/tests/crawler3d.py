# The Crawler as a centipede (Nov 2026): ten segments with bone plates and lights, a leg pair each, a head with eyes, feelers and two fangs,
# two tail prongs; it snakes while it runs, the legs ripple in a wave, the body bends into a turn, it rears up in a fight and bites
# with a strike forward and the fangs snapping shut (CENTI3D). The 2D sprite is a centipede too. The Grafter keeps its small tick.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    J(pg,"""()=>{ const G=__hc.G, m=G.map, u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); let best=null;
      for(let R=3;R<60&&!best;R++) for(let j=-R;j<=R&&!best;j++) for(let i=-R;i<=R;i++){ const x=Math.floor(u.x/TILE)+i,y=Math.floor(u.y/TILE)+j; let ok=x>8&&y>8&&x<m.w-9&&y<m.h-9; if(ok) for(let dy=-3;dy<=3;dy++)for(let dx=-6;dx<=6;dx++) if(!m.walk[(y+dy)*m.w+x+dx]) ok=false; if(ok&&!G.ents.some(e=>!e.dead&&e.kind!=='crate'&&Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<7*TILE)){ best={x:(x+.5)*TILE,y:(y+.5)*TILE}; break; } }
      const cr=makeUnit('crawler','swarm',best.x,best.y); cr.order={type:'hold'}; const gr=makeUnit('grafter','swarm',best.x+2*TILE,best.y); gr.order={type:'hold'}; window._t={best,cr,gr}; return !!best; }""")
    r=J(pg,"()=>{ const s=SPR.crawler; return [s.w,s.h]; }")
    check('2D sprite: the centipede (18x8)', r==[18,8], r)
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, {cr,gr,best}=_t; G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(best.x,best.y); for(let i=0;i<4;i++) render(performance.now()+i*16);
      const U=V3.objs.get(cr).userData, W=V3.objs.get(gr).userData; return [!!U.centi, U.segs.length, U.cLegs.length, U.fangs.length, U.feelers2.length, U.prongs.length, !!W.centi, W.legs.length]; }""")
    check('model: 10 segments, 18 legs, 2 fangs, 2 feelers, 2 prongs; the Grafter keeps the tick', r==[True,10,18,2,2,2,False,6], r)
    # running: the body snakes (segments shift sideways), the legs ripple
    r=J(pg,"""()=>{ const {cr}=_t, g=V3.objs.get(cr), U=g.userData; let T=100; cr.moving=true; cr.target=null; let xs=[], legs=0;
      for(let i=0;i<40;i++){ T+=1/60; v3Pose(cr,g,T); xs.push(U.segs[5].position.x); legs=Math.max(legs,Math.abs(U.cLegs[6].rotation.y)); }
      return [+(Math.max(...xs)-Math.min(...xs)).toFixed(3), +legs.toFixed(2), +g.position.y.toFixed(3)]; }""")
    check('runs: the body snakes from side to side', r[0]>0.04, r)
    check('runs: the legs ripple', r[1]>0.2, r)
    # a turn bends the body: the tail lags behind on the outside
    r=J(pg,"""()=>{ const {cr}=_t, g=V3.objs.get(cr), U=g.userData; let T=200; cr.moving=false; for(let i=0;i<30;i++){ T+=1/60; v3Pose(cr,g,T); }
      const tail0=U.segs[9].position.x; U.yaw0=U.yaw; for(let i=0;i<6;i++){ T+=1/60; U.want=U.yaw+1.2; v3Pose(cr,g,T); } return [+U.bend.toFixed(2), +(U.segs[9].position.x-tail0).toFixed(3)]; }""")
    check('a turn bends the body', abs(r[0])>0.5 and abs(r[1])>0.02, r)
    # a fight: rears up; a bite: strikes forward, fangs shut
    r=J(pg,"""()=>{ const {cr}=_t, g=V3.objs.get(cr), U=g.userData, G=__hc.G; const s=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps');
      cr.target=s; const sx=s.x, sy=s.y; s.x=cr.x+10; s.y=cr.y; let T=300; cr.moving=false; for(let i=0;i<60;i++){ T+=1/60; v3Pose(cr,g,T); }
      const head=U.segs[0].position.y, tilt=U.segs[0].rotation.x, z0=U.segs[0].position.z, f0=U.fangs[0].rotation.y;
      cr.lunge=0.12; let reach=0, shut=0; for(let i=0;i<20;i++){ T+=1/60; v3Pose(cr,g,T); reach=Math.max(reach,U.segs[0].position.z-z0); shut=Math.min(shut,U.fangs[0].rotation.y*U.fangs[0].userData.s); if(i>6) cr.lunge=0; }
      s.x=sx; s.y=sy; cr.target=null; return [+head.toFixed(3), +tilt.toFixed(2), +reach.toFixed(3), +shut.toFixed(2), +f0.toFixed(2)]; }""")
    check('fight: rears its front up', r[0]>0.13 and r[1]<-0.3, r)
    check('bite: strikes forward and the fangs snap shut', r[2]>0.04 and r[3]<0.1, r)
    # on the mycel round a hive it stands on top of the raised crust (v3CreepAt), not sunk out of sight in it
    r=J(pg,"""()=>{ const G=__hc.G, {cr}=_t, g=V3.objs.get(cr), U=g.userData; const h=G.ents.find(e=>!e.dead&&e.kind==='building'&&e.type==='hive');
      const m=G.map; let spot=null; for(let R=2;R<6&&!spot;R++) for(let a=0;a<12&&!spot;a++){ const tx=Math.floor(h.x/TILE+Math.cos(a)*R), ty=Math.floor(h.y/TILE+Math.sin(a)*R); if(m.walk[ty*m.w+tx]&&G.creep[ty*m.w+tx]>0.9) spot={x:(tx+.5)*TILE,y:(ty+.5)*TILE}; }
      cr.x=spot.x; cr.y=spot.y; cr.moving=false; cr.target=null; centerOn(spot.x,spot.y); for(let i=0;i<4;i++) render(performance.now()+i*16);
      const x=cr.x/TILE, z=cr.y/TILE, lift=v3CreepAt(x,z), above=g.position.y-v3H(x,z);
      return [+lift.toFixed(3), +above.toFixed(3), +(U.segs[5].position.y).toFixed(3)]; }""")
    check('on the mycel: the crust lifts the ground and the Crawler stands on top of it', r[0]>0.1 and r[1]>=r[0]-0.005, r)
    pg.screenshot(path='/home/claude/shots/crawler-mycel3d.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(300)
    J(pg,"()=>{ const {cr}=_t; ui.zoom=2.2; centerOn(cr.x,cr.y); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/home/claude/shots/crawler2d.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(400)
    J(pg,"()=>{ const {cr,best}=_t; VIEW3D.dist=VIEW3D.dist*0.35; cr.order={type:'move',x:best.x+4*TILE,y:best.y+2*TILE}; setPath(cr,best.x+4*TILE,best.y+2*TILE); centerOn(best.x+2*TILE,best.y+TILE); }")
    pg.wait_for_timeout(700)
    pg.screenshot(path='/home/claude/shots/crawler3d.png')
    pg.wait_for_timeout(1500)
    print('errors',errs[:5]); check('no errors', not errs)
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
