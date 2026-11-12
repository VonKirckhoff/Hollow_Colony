# The moon's weather in 3D (Nov 2026): a meteorite comes in at a slant with a streak and smoke, hits with a flash, stones and a glowing
# crater that cools and is cleaned up; a dust devil is a turning funnel of dust and whips dust off the units it crosses (2D and 3D).
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
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    # a soldier and a spot of open ground next to him
    J(pg,"""()=>{ const G=__hc.G; G.devReveal=true; computeFog(); for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      const u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.def.bio); window._u=u; ui.follow=false; G.following=false; centerOn(u.x,u.y);
      const f=nearestWalkable(Math.floor(u.x/TILE)+3,Math.floor(u.y/TILE)); window._spot={x:(f.x+.5)*TILE,y:(f.y+.5)*TILE};
      G.devPause=true; G.fx=G.fx.filter(f=>f.k!=='meteor'&&f.k!=='devil'); for(const M of (V3.meteors||new Map()).values()) v3MeteorDone(M); V3.meteors=new Map(); window._T=performance.now(); }""")
    step="""(sec)=>{ const G=__hc.G, t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/30); _T+=1000/30; render(_T); } }"""
    J(pg,"()=>{ const s=_spot; __hc.G.fx.push({k:'meteor',x:s.x,y:s.y,t:1.6,max:1.6,dx:1}); window._step="+step+"; _step(0.3); }")
    r=J(pg,"""()=>{ const M=[...V3.meteors.values()][0]; if(!M) return null; const gy=v3H(_spot.x/TILE,_spot.y/TILE);
      return [!!M.head.visible, +(M.head.position.y-gy).toFixed(2), +Math.hypot(M.head.position.x-_spot.x/TILE,M.head.position.z-_spot.y/TILE).toFixed(2), V3.smoke.length]; }""")
    print('flight',r)
    check('meteorite in the air, at a slant', r and r[0] and r[1]>1.5 and r[2]>1, r)
    check('a smoke trail', r and r[3]>=3, r)
    pg.screenshot(path='/tmp/meteor_flight.png')
    J(pg,"()=>_step(0.35)")
    r=J(pg,"()=>{ const M=[...V3.meteors.values()][0]; const up=M.rocks.filter(r=>!r.rest).length; return [M.hit, M.rocks.length, up, M.glow.visible, M.ring.visible, M.head.visible]; }")
    print('hit',r)
    check('the hit: stones in the air, ring, glowing crater', r[0] and r[1]>=8 and r[2]>=4 and r[3] and r[4] and not r[5], r)
    pg.screenshot(path='/tmp/meteor_hit.png')
    J(pg,"()=>_step(0.8)"); pg.screenshot(path='/tmp/meteor_hang.png')
    r=J(pg,"()=>{ const M=[...V3.meteors.values()][0]; return [M.rocks.filter(r=>!r.rest).length, M.glow.visible, +M.glow.material.opacity.toFixed(2)]; }")
    print('later',r); check('stones still hang a while (low gravity)', r[0]>=1, r)
    J(pg,"()=>_step(1.9)")
    r=J(pg,"()=>{ const M=[...V3.meteors.values()][0]; return [M.rocks.every(r=>r.rest), M.glow.visible, M.rim.visible]; }")
    check('stones down, crater cooled, rim there', r[0] and not r[1] and r[2], r)
    J(pg,"()=>_step(1.2)")
    r=J(pg,"()=>[V3.meteors.size, __hc.G.decals.length>0]")
    check('cleaned up, the scar stays as a decal', r[0]==0 and r[1], r)
    # a dust devil crossing the soldier
    J(pg,"()=>{ const u=_u; centerOn(u.x,u.y); __hc.G.fx.push({k:'devil',x:u.x-20,y:u.y,vx:24,vy:0,t:7,max:7,seed:0,rest:true}); _step(1.2); }")
    r=J(pg,"""()=>{ const G=__hc.G, f=G.fx.find(f=>f.k==='devil'), P=devilPos(f), d=G.fx.filter(f=>f.k==='dust'&&f.lift);
      const vis=V3.fxPool.filter(s=>s.visible&&Math.hypot(s.position.x-P.x/TILE,s.position.z-P.y/TILE)<AMBIENT3D.devilWide*1.6+1);
      const ys=vis.map(s=>s.position.y); return [vis.length, +(Math.max(...ys)-Math.min(...ys)).toFixed(2), d.length]; }""")
    print('devil',r)
    check('a dust funnel stands up in 3D', r[0]>=20 and r[1]>1.8, r)
    check('dust is whipped off the soldier', r[2]>=2, r)
    r=J(pg,"()=>{ const g=[...V3.devils.values()][0]; return [V3.devils.size, !!(g&&g.visible), g?g.children.length:0]; }")
    check('the funnel mesh turns there', r[0]==1 and r[1] and r[2]==2, r)
    J(pg,"()=>{ V3.zoom=9; VIEW3D.dist=9; render(_T); }"); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/devil.png')
    J(pg,"()=>_step(0.6)"); pg.screenshot(path='/tmp/devil2.png')
    J(pg,"()=>_step(6)"); r=J(pg,"()=>V3.devils.size"); check('funnel cleaned up when the devil is gone', r==0, r)
    # 2D still draws it
    pg.keyboard.press('F3'); pg.wait_for_timeout(300); J(pg,"()=>_step(0.1)"); pg.screenshot(path='/tmp/devil_2d.png')
    J(pg,"()=>{ pause(true); }")
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
