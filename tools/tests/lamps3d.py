# Helmet lamps in 3D (Nov 2026): softer default light, saved light reset once, lamps on one spot cap at three lamps worth, visible beams in the dark only. Run: lamps3d.py blackout
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
mission=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.evaluate("()=>localStorage.setItem('hc-light',JSON.stringify({sun:1.45,ambient:0.85,lamp:1.25,bright:1.1}))"); pg.reload(); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    check('old saved light goes to new defaults once, brightness kept', J(pg,"()=>[lightSet.sun,lightSet.lamp,lightSet.bright,lightSet.ver,VIEW3D.sun]")==[1.15,1,1.1,2,1.15], J(pg,"()=>[lightSet.sun,lightSet.lamp,lightSet.bright,lightSet.ver,VIEW3D.sun]"))
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='"+mission+"')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); __hc.G.mission.dark=__hc.G.mission.dark||{sight:0.5}; }"); pg.wait_for_timeout(200); pg.keyboard.press('F3'); pg.wait_for_timeout(1200)
    # three soldiers aim at the same spot
    J(pg,"""()=>{ const G=__hc.G, us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction===G.side&&e.def.bio).slice(0,3); const c=us[0];
      us.forEach((u,i)=>{ u.x=c.x+(i-1)*18; u.y=c.y; }); centerOn(c.x,c.y); for(let k=0;k<5;k++) render(performance.now()+k*16); }""")
    pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const s=V3.lights.filter(l=>l.intensity>0&&l.color.getHex()===0xe4ecff); let mx=0; for(const a of s){ let t=0; for(const b of s) if(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<0.8) t+=b.intensity; mx=Math.max(mx,t); } return [s.length, +mx.toFixed(3), s.map(l=>[l.position.x.toFixed(1),l.position.z.toFixed(1),l.intensity.toFixed(2)])]; }""")
    print('lamps',r)
    check('lamps on one spot give at most 3 lamps worth (1.6 x one lamp)', r[1]<=1.61, r[:2])
    r=J(pg,"""()=>{ const out=[]; for(const [e,g] of V3.objs) if(g.userData.beam&&e.faction===__hc.G.side) out.push([g.userData.beam.visible, g.userData.beam.children[0].material.opacity.toFixed(3)]); return out.slice(0,4); }""")
    check('beams visible in the dark', any(x[0] for x in r), r)
    J(pg,"()=>{ const G=__hc.G, us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction===G.side); let x=0,y=0; us.forEach(u=>{x+=u.x;y+=u.y}); VIEW3D.dist=7; stopFollow(); centerOn(x/us.length,y/us.length); }"); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/lamps-'+mission+'.png')
    J(pg,"()=>{ __hc.G.mission.dark=false; for(let k=0;k<3;k++) render(performance.now()+k*16); }")
    r=J(pg,"()=>{ for(const [e,g] of V3.objs) if(g.userData.beam&&g.userData.beam.visible) return false; return true; }")
    check('no beams in the light', r)
    pg.screenshot(path='/home/claude/light-'+mission+'.png')
    check('no errors', not errs, errs[:3])
print('ALL OK' if ok else 'FAIL')
