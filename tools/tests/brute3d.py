# The Brute (Nov 2026): goat tail, cloven goat hooves on all four legs, two curved tusks; it walks like a heavy beast:
# its heading u.hd turns at a limited rate (BRUTE_WALK), it turns on the spot when the way on lies behind it and slows down
# for bends; the 3D model follows that heading without spinning, steps while it turns on the spot, charges when it strikes.
import math
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
      const br=makeUnit('brute','swarm',best.x,best.y); br.order={type:'hold'}; br.hd=Math.PI/2; window._t={best,br}; return !!best; }""")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, {br,best}=_t; G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(best.x,best.y); for(let i=0;i<4;i++) render(performance.now()+i*16);
      const g=V3.objs.get(br), U=g&&g.userData; if(!U) return null; let hooves=0; g.traverse(o=>{ if(o.userData&&o.userData.hoof) hooves++; });
      return [!!U.brute, !!U.tail, hooves, (U.tusks||[]).length, U.bands.length, U.fore.length, U.hind.length]; }""")
    check('Brute model: tail, 4 goat hooves, 2 tusks, 7 bands, 2+2 legs', r==[True,True,4,2,7,2,2], r)
    # logic: facing east, sent west: it first turns on the spot, its heading turns no faster than BRUTE_WALK.turnRate
    r=J(pg,"""()=>{ const G=__hc.G, {br,best}=_t; G.ents.filter(e=>e!==br&&e.kind==='unit'&&e.faction==='corps').forEach(e=>{ e.x=e.x; });
      br.hd=Math.PI/2; br.hw=0; br.order={type:'move',x:best.x-5*TILE,y:best.y}; setPath(br,best.x-5*TILE,best.y);
      const x0=br.x, y0=br.y, h0=br.hd; let maxRate=0, prev=br.hd; for(let i=0;i<8;i++){ updateUnit(br,0.05); const d=Math.atan2(Math.sin(br.hd-prev),Math.cos(br.hd-prev)); maxRate=Math.max(maxRate,Math.abs(d)/0.05); prev=br.hd; }
      return [+(Math.hypot(br.x-x0,br.y-y0)/TILE).toFixed(3), +maxRate.toFixed(2), BRUTE_WALK.turnRate, +Math.abs(Math.atan2(Math.sin(br.hd-h0),Math.cos(br.hd-h0))).toFixed(2), !!br.moving]; }""")
    check('turns on the spot first (barely moves in 0.4 s)', r[0]<0.15 and r[3]>0.3, r)
    check('heading turns no faster than turnRate', r[1]<=r[2]+0.01, r)
    check('counts as moving while it turns (legs step)', r[4], r)
    r=J(pg,"""()=>{ const {br,best}=_t; let n=0; while(br.order&&n<400){ updateUnit(br,0.05); n++; } return [n*0.05, +((br.x-(best.x-5*TILE))/TILE).toFixed(2), +Math.cos(br.hd).toFixed(2), +Math.sin(br.hd).toFixed(2)]; }""")
    check('then walks there and arrives', r[0]<12 and abs(r[1])<0.5, r)
    check('facing west when it gets there', r[3]<-0.8, r)
    # a bend: on a 90° turn it slows down
    r=J(pg,"""()=>{ const {br}=_t; br.hd=Math.atan2(1,0); br.hw=0; const ks=[heavyTurn(br,Math.atan2(1,0),0.05), heavyTurn(br,Math.atan2(0,1),0.05)]; br.hd=Math.atan2(1,0); br.hw=0; return ks.map(k=>+k.toFixed(2)); }""")
    check('full speed straight on, slow into a 90° bend', r[0]==1 and r[1]<0.4, r)
    # 3D: the model follows the heading smoothly (no snapping), its legs step while it turns on the spot
    r=J(pg,"""()=>{ const {br,best}=_t; const g=V3.objs.get(br), U=g.userData; br.x=best.x; br.y=best.y; br.order={type:'hold'}; br.moving=false;
      let T=performance.now()/1000+5; for(let i=0;i<60;i++){ T+=1/60; v3PoseBrute(br,g,U,T,br.x/TILE,0,br.y/TILE); }
      const y0=U.yaw; br.hd=y0+Math.PI; br.moving=true; let maxStep=0, prev=U.yaw, ph0=U.ph, legs=0;
      for(let i=0;i<30;i++){ T+=1/60; v3PoseBrute(br,g,U,T,br.x/TILE,0,br.y/TILE); maxStep=Math.max(maxStep,Math.abs(U.yaw-prev)); prev=U.yaw; legs=Math.max(legs,Math.abs(U.fore[0].sh.rotation.z)); }
      return [+(maxStep*60).toFixed(2), BRUTE3D.turnRate, +(U.ph-ph0).toFixed(2), +legs.toFixed(3), +Math.abs(U.yaw-y0).toFixed(2), +U.look.toFixed(2)]; }""")
    check('3D model turns no faster than BRUTE3D.turnRate', r[0]<=r[1]+0.05, r)
    check('3D legs step while it turns on the spot', r[2]>0.3 and r[3]>0.01, r)
    check('3D head looks into the turn first', abs(r[5])>0.3, r)
    # the blow: a short charge forward with the head down, then back
    r=J(pg,"""()=>{ const {br}=_t; const g=V3.objs.get(br), U=g.userData; br.moving=false; br.hd=U.yaw; let T=performance.now()/1000+20;
      for(let i=0;i<40;i++){ T+=1/60; v3PoseBrute(br,g,U,T,br.x/TILE,0,br.y/TILE); }
      const p0=[g.position.x,g.position.z]; br.lunge=0.12; let far=0, head=0; for(let i=0;i<12;i++){ T+=1/60; v3PoseBrute(br,g,U,T,br.x/TILE,0,br.y/TILE); far=Math.max(far,Math.hypot(g.position.x-p0[0],g.position.z-p0[1])); head=Math.max(head,U.head.rotation.x); }
      br.lunge=0; for(let i=0;i<60;i++){ T+=1/60; v3PoseBrute(br,g,U,T,br.x/TILE,0,br.y/TILE); }
      return [+far.toFixed(2), +head.toFixed(2), +Math.hypot(g.position.x-p0[0],g.position.z-p0[1]).toFixed(3)]; }""")
    check('charges forward with the head down when it strikes', r[0]>0.2 and r[1]>0.4, r)
    check('and comes back', r[2]<0.02, r)
    # live: a few seconds of play with the Brute walking about, no errors
    J(pg,"()=>{ const {br,best}=_t; br.order={type:'move',x:best.x+4*TILE,y:best.y+3*TILE}; setPath(br,best.x+4*TILE,best.y+3*TILE); }")
    pg.wait_for_timeout(2500)
    pg.screenshot(path='/home/claude/shots/brute-game.png')
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
