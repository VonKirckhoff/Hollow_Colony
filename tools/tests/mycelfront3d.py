# What lies on top of the mycel in 3D (Nov 2026): soldiers keep their colours on it (no purple tint on models), rings, ranges and a
# choir pod's progress ring are drawn in a second ground layer (v3Top) mixed in after the mycel crust, order marks and pings lie over the
# crust (v3CreepLift), and a choir pod shows how quiet it is. Must end with ALL OK. --shots for a screenshot in /tmp/mf.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1100,'height':720})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ localStorage.removeItem('hc-view3d'); resetRogue(); startMission(ROGUE_MISSIONS.find(m=>m.id==='rogue-among-them')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=pg.evaluate("""()=>{ const G=__hc.G; for(let i=0;i<30;i++) __hc.update(1/30); G.devReveal=true; computeFog(); for(const h of nests()) h.creepR=hiveOpt(h,'creep',CREEP.max); for(let i=0;i<8;i++) updateCreep(1);
      for(const e of G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.invuln=true;
      const b=G.vars.pods[0]; b.quietP=0.7; G.sel=[b]; const tx=Math.floor(b.x/TILE), ty=Math.floor(b.y/TILE);
      const cr=G.ents.filter(e=>!e.dead&&e.crew&&e.kind==='unit'); cr.slice(0,4).forEach((u,i)=>{ u.x=(tx+1.5+i*0.8)*TILE; u.y=(ty+1.5)*TILE; u.path=null; u.order=null; u.home={x:u.x,y:u.y}; });
      G.fx.push({k:'order',x:(tx+4)*TILE,y:(ty+3)*TILE,t:0.5,max:0.7,col:'255,90,79'});
      ui.follow=false; G.following=false; centerOn(b.x,b.y); G.paused=true; window._T=performance.now(); for(let i=0;i<6;i++){ _T+=50; render(_T); }
      /* the top layer: the pod's ring is painted there, not in the layer under the crust */
      const cx=V3.u.decR.value, px=(b.x/TILE-cx.x)/cx.z*1024, py=(b.y/TILE-cx.y)/cx.w*1024, R=TILE*1.15/TILE/cx.z*1024;
      const at=(c,x,y)=>c.getImageData(Math.round(x),Math.round(y),1,1).data, top=at(V3.topCtx,px+R,py), dec=at(V3.decCtx,px+R,py);
      const crust=G.creep[ty*G.map.w+tx];
      /* models: no mycel tint left in the shader for anything but the ground */
      const fog=v3Fogify.toString();
      /* the order mark sits over the crust */
      const ox=tx+4, oz=ty+3, pr=V3.pingPool.find(m=>m.visible), lift=v3CreepLift(ox,oz,0.3);
      return [crust>0, top[3]>100&&top[0]>150&&top[2]>200, dec[2]<top[2]||dec[3]<top[3], !/0\\.62,0\\.42,0\\.78/.test(fog), /v3Top/.test(fog), !!pr&&pr.position.y>v3H(ox,oz)+0.06+lift*0.5, lift];
    }""")
    print(r)
    check('the pod stands on mycel', r[0], r)
    check('its progress ring is in the top layer (lilac)', r[1], r)
    check('not in the layer under the crust', r[2], r)
    check('no purple mycel tint on models any more', r[3], r)
    check('the terrain mixes the top layer after the mycel', r[4], r)
    check('the order ring lies over the crust', r[5], r)
    r=pg.evaluate("""()=>{ const g=V3.objs.get(__hc.G.vars.pods[0]); return !!g; }""")
    check('the pod has a 3D model', r)
    if '--shots' in sys.argv: pg.screenshot(path='/tmp/mf/test.png')
    check('no errors', not errs, errs)
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
