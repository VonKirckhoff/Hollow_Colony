# The 3D Command Post (Nov 2026): foot with hazard stripes, two riveted storeys with hazard bands, corner irons, the console with
# blinking keys, vent grilles, pipes with a valve wheel, the roof fan, dome and antenna; two searchlights that sweep and light the
# ground in a dark mission (Blackout) and stay off in a lit one; below 50% a cover plate flies off and a pipe leaks steam, below 25%
# smoke and sparks; repaired: whole again.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
def start(pg,mid):
    J(pg,f"()=>{{ startMission(MISSIONS.find(m=>m.id==='{mid}')); }}"); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"""()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; const G=__hc.G; G.devReveal=true;
      for(const u of G.ents) if(u.kind==='unit'&&u.faction==='swarm') u.dead=true;
      window._h=G.ents.find(e=>e.type==='hq'&&!e.dead); ui.follow=false; G.following=false; centerOn(_h.x,_h.y+2*TILE); G.devPause=true; window._T=performance.now(); computeFog();
      window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/20); _T+=1000/20; render(_T); } }; _step(0.3); }""")
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1000,'height':620})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>localStorage.setItem('hc-view3d','true')")
    start(pg,'blackout')
    if not J(pg,"()=>V3.on"): pg.keyboard.press('F3'); pg.wait_for_timeout(400); J(pg,"()=>_step(0.1)")
    r=J(pg,"""()=>{ const g=V3.objs.get(_h), U=g&&g.userData; if(!U) return null; let m=0; g.traverse(o=>{ if(o.isMesh) m++; });
      return [!!U.hq, m, U.spots.length, ['side','upper','top','foot','console'].every(k=>MAT['hqTex'+k]&&MAT['hqTex'+k].map), U.btns.length, !!U.fan, U.plate.visible, U.hole.visible]; }""")
    print('model',r)
    check('the Command Post model is built (many parts, two searchlights, five painted textures, six lamps on the console)', r and r[0] and r[1]>=150 and r[2]==2 and r[3] and r[4]==6, r)
    check('whole: the cover plate on, no hole', r[6] and not r[7], r)
    r=J(pg,"""()=>{ const U=V3.objs.get(_h).userData; const f0=U.fan.rotation.y, y0=U.spots.map(s=>s.yaw.rotation.y); const seen=new Set();
      for(let i=0;i<20;i++){ _step(0.15); seen.add(U.btns.map(b=>b.visible?1:0).join('')); }
      const lit=V3.lights.filter(l=>l.intensity>0&&l.color.b<l.color.r&&l.color.g>0.85).length;
      return [+(U.fan.rotation.y-f0).toFixed(2), U.spots.map((s,i)=>+Math.abs(s.yaw.rotation.y-y0[i]).toFixed(2)), U.spots.every(s=>s.on&&s.beam.visible), lit, seen.size,
        U.spots.map(s=>s.spot&&+Math.hypot(s.spot.x-_h.x/TILE,s.spot.z-_h.y/TILE).toFixed(1))]; }""")
    print('dark',r)
    check('the roof fan turns and the console lamps blink', r[0]>2 and r[4]>=3, r)
    check('dark mission: both searchlights are on, sweep and light the ground in front of the post', r[2] and min(r[1])>0.05 and r[3]>=2 and all(d and 2.5<d<7 for d in r[5]), r)
    for (yaw,dist,name) in [(0,7,'a'),(150,6,'b'),(250,8,'c')]:
        J(pg,f"()=>{{ V3.yaw={yaw}; VIEW3D.dist={dist}; _step(0.1); }}"); pg.wait_for_timeout(100); pg.screenshot(path=f'/tmp/s3/hq_{name}.png')
    r=J(pg,"""()=>{ const U=V3.objs.get(_h).userData; V3.yaw=300; VIEW3D.dist=6; _h.hp=_h.maxHp*0.45; _step(0.2); const fl=V3.bits.filter(b=>b.hq).length, vis=U.plate.visible, hole=U.hole.visible;
      const s0=V3.smoke.filter(s=>s.steam).length; _step(1); const st=V3.smoke.filter(s=>s.steam).length; _step(2.5); const rested=V3.bits.filter(b=>b.hq&&b.rest).length;
      _h.hp=_h.maxHp*0.2; const d0=V3.smoke.filter(s=>!s.steam).length; _step(1); const sm=V3.smoke.filter(s=>!s.steam).length-d0, sp=V3.sparks.length;
      return [vis,hole,fl,st,rested,sm,sp]; }""")
    print('damage',r)
    check('below 50% the cover plate flies off and lands, the hole shows', (not r[0]) and r[1] and r[2]==1 and r[4]==1, r)
    check('below 50% a pipe leaks steam', r[3]>=3, r)
    check('below 25% smoke and sparks', r[5]>=2 and r[6]>=1, r)
    pg.screenshot(path='/tmp/s3/hq_hurt.png')
    r=J(pg,"()=>{ const U=V3.objs.get(_h).userData; _h.hp=_h.maxHp; _step(2); return [U.plate.visible, U.hole.visible, U.leaking, U.burning]; }")
    check('repaired: plate back, no leak, no smoke', r[0] and not r[1] and not r[2] and not r[3], r)
    # a lit mission: searchlights off
    start(pg,'hold-kappa')
    r=J(pg,"()=>{ const g=_h&&V3.objs.get(_h); if(!g) return null; const U=g.userData; _step(0.3); return [!!__hc.G.mission.dark, U.spots.some(s=>s.on||s.beam.visible)]; }")
    print('lit',r)
    check('a lit mission: searchlights off', r and (not r[0]) and (not r[1]), r)
    J(pg,"()=>{ V3.yaw=20; VIEW3D.dist=7; _step(0.1); }"); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s3/hq_day.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(300); J(pg,"()=>_step(0.1)")
    check('back in 2D', not J(pg,"()=>V3.on"))
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
