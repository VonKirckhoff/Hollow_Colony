# A GPU reset (WebGL context lost and restored) wipes the big ground canvas in Chrome: the map must come back, in 3D and in 2D, and on the minimap.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
WIPE="""()=>{ const m=__hc.G.map; for(const c of [m.ground,m.mini]) c.getContext('2d').clearRect(0,0,c.width,c.height); }"""
LIT="""()=>{ const m=__hc.G.map, c=m.ground, d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4096) if(d[i]) n++; return n; }"""
MINI="""()=>{ const c=__hc.G.map.mini, d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]) n++; return n; }"""
SHOT="""()=>{ const r=V3.r, gl=r.getContext(); render(performance.now()); const w=gl.drawingBufferWidth, h=gl.drawingBufferHeight, px=new Uint8Array(4*w*h);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px); let s=0, n=0; for(let i=0;i<px.length;i+=4*97){ s+=px[i]+px[i+1]+px[i+2]; n++; } return Math.round(s/n); }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200); J(pg,"()=>{ if(ui.mode==='pause') pause(false); __hc.G.devReveal=true; computeFog(); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(1200)
    check('3D on', J(pg,"()=>V3.on&&V3.ok"))
    check('ground and minimap kept in normal memory', J(pg,"()=>__hc.G.map.mini.getContext('2d').getContextAttributes().willReadFrequently===true"))
    lit0=J(pg,LIT); b0=J(pg,SHOT); pg.screenshot(path='/tmp/s3/ctx-before.png')
    # the GPU resets: Chrome empties the ground canvas, then WebGL comes back
    J(pg,WIPE); check('ground wiped (as Chrome does)', J(pg,LIT)==0)
    J(pg,"()=>{ window._lc=V3.r.getContext().getExtension('WEBGL_lose_context'); window._lc.loseContext(); }"); pg.wait_for_timeout(300)
    J(pg,"()=>window._lc.restoreContext()"); pg.wait_for_timeout(1200)
    check('ground painted again', J(pg,LIT)>=lit0*0.95, [lit0,J(pg,LIT)])
    check('minimap painted again', J(pg,MINI)>0)
    b1=J(pg,SHOT); pg.screenshot(path='/tmp/s3/ctx-after.png')
    check('3D ground not black after the reset', b1>b0*0.7 and b1>15, [b0,b1])
    # the 2D canvas alone loses its picture (Chrome fires contextrestored on it)
    pg.keyboard.press('F3'); pg.wait_for_timeout(500)
    J(pg,WIPE); J(pg,"()=>__hc.G.map.ground.dispatchEvent(new Event('contextrestored'))"); pg.wait_for_timeout(200)
    check('2D ground painted again', J(pg,LIT)>=lit0*0.95)
    check('no errors', not errs, errs[:3])
    b.close()
print('ALL OK' if ok else 'SOME FAIL')
