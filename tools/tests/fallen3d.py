# A fallen soldier in 3D (Nov 2026): the soldier's own model on his back (arms out, weapon by his hand, a dark pool),
# and when the Brood drags him off he is pulled by the boots behind the carrier, arms trailing, weapon and pool left behind.
import sys
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
    r=J(pg,"""()=>{ const G=__hc.G, us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.def.bio);
      const types=['trooper','gunner','medic','pyro','engineer']; const c=us[0], victims=types.map(t=>makeUnit(t,'corps',c.x,c.y)); victims.forEach((u,i)=>{ const f=nearestWalkable(Math.floor(c.x/TILE)+(i-2)*2,Math.floor(c.y/TILE)+3); u.x=(f.x+.5)*TILE; u.y=(f.y+.5)*TILE; u.order={type:'hold'}; });
      for(const u of victims){ u.downed=null; u.hp=0; kill(u,null); }
      return victims.map(v=>v.type); }""")
    print('victims',r)
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    r=J(pg,"""()=>{ const G=__hc.G; G.devReveal=true; computeFog(); for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      const bs=G.ents.filter(e=>e.kind==='body'&&!e.dead); window._b=bs; if(bs[0]){ ui.follow=false; G.following=false; centerOn(bs[2]?bs[2].x:bs[0].x,bs[0].y); }
      if(V3.dist!=null) V3.dist=7; for(let i=0;i<5;i++) render(performance.now()+i*16);
      return bs.map(b=>{ const g=V3.objs.get(b); return [b.look&&b.look.type, !!(g&&g.userData.fallen), !!(g&&g.userData.gun&&g.userData.gun.visible), !!(g&&g.userData.pool.visible)]; }); }""")
    print(r)
    check('bodies have a look', len(r)>=3 and all(x[0] for x in r), r)
    check('bodies use the fallen soldier model', all(x[1] for x in r), r)
    check('weapon by his hand and a pool', all(x[3] for x in r) and sum(x[2] for x in r)>=len(r)-1, r)
    pg.wait_for_timeout(500); pg.screenshot(path='/tmp/fallen_lying.png')
    if len(sys.argv)>1: J(pg,"()=>{ V3.zoom=VIEW3D.minDist; VIEW3D.dist=VIEW3D.minDist; }"); pg.wait_for_timeout(600); pg.screenshot(path='/tmp/fallen_close.png')
    # a Scuttler drags the first body off
    r=J(pg,"""()=>{ const b=_b[0], d=makeUnit('drone','swarm',b.x,b.y); d.haul=b; b.carrier=d; d.order={type:'move',x:b.x+6*TILE,y:b.y}; window._d=d; return true; }""")
    pg.wait_for_timeout(1500)
    r=J(pg,"""()=>{ const b=_b[0], d=_d, g=V3.objs.get(b), dg=V3.objs.get(d); render(performance.now());
      const behind=(dg.position.x-g.position.x)*Math.sin(g.userData.yaw)+(dg.position.z-g.position.z)*Math.cos(g.userData.yaw);
      return [!!b.carrier, +behind.toFixed(2), g.userData.gun?g.userData.gun.visible:null, g.userData.pool.visible, +g.userData.tilt.rotation.x.toFixed(2), +g.userData.S.arms[0].rotation.x.toFixed(2), +(d.x-b.x).toFixed(1)]; }""")
    print(r)
    check('being dragged', r[0], r); check('he trails behind the carrier', r[1]>0.2, r)
    check('weapon and pool left behind', r[2]==False and r[3]==False, r)
    check('feet lifted, arms over the head', r[4]<-0.15 and r[5]>2, r)
    J(pg,"()=>{ const b=_b[0]; centerOn(b.x,b.y); }"); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/fallen_drag.png')
    # save/load keeps the look
    r=J(pg,"()=>{ const s=encodeGame(); const e=s.ents.find(x=>x.kind==='body'); return e&&e.look&&e.look.type; }")
    check('the look is saved', bool(r), r)
    J(pg,"()=>{ pause(true); }")
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
