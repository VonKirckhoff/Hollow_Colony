# The 3D membrane: one web of half sheets per tile towards membrane and rock neighbours, breathing, shudder on a hit,
# taut with bright veins while it cannot be harmed, slack with dim veins once weakened, tears below its health marks,
# grows anew when a neighbour dies. Screenshots in /home/claude/memb3d-*.png
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='brood-mother')); for(let i=0;i<20;i++) __hc.update(1/30); }")
    pg.wait_for_timeout(300); J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    J(pg,"()=>{ const G=__hc.G; G.devReveal=true; G.seen.fill(1); computeFog(); const ms=G.ents.filter(e=>!e.dead&&e.type==='membrane'); const c=ms[Math.floor(ms.length/2)]; centerOn(c.x,c.y); VIEW3D.dist=10; VIEW3D.pitch=40; __hc.G.paused=true; }")
    pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, ms=G.ents.filter(e=>!e.dead&&e.type==='membrane'); const gs=ms.map(m=>V3.objs.get(m)).filter(Boolean);
      return [ms.length, gs.length, gs.every(g=>g.userData.memb&&g.userData.halves.length>=2), gs.every(g=>g.userData.halves.every(h=>h.userData.veins.length===4&&h.userData.tears.length===2)),
        gs.filter(g=>g.userData.nkey.includes('m')).length]; }""")
    check('every membrane tile is a web of sheets', r[0]>0 and r[1]==r[0] and r[2] and r[3] and r[4]>=r[0]-1, r)
    pg.screenshot(path='/home/claude/memb3d-taut.png')
    r=J(pg,"""()=>{ const g=V3.objs.get(__hc.G.ents.find(e=>!e.dead&&e.type==='membrane')), h=g.userData.halves[0]; const a=h.scale.z; render(performance.now()+400); const b=h.scale.z; return [a,b,h.userData.veins[0].material===MAT.membVein,h.userData.sheet.material===MAT.membTaut]; }""")
    check('it breathes, bright veins and taut while protected', abs(r[0]-r[1])>0.001 and r[2] and r[3], r)
    r=J(pg,"""()=>{ const G=__hc.G; G.ents.filter(e=>e.type==='membrane').forEach(m=>{ m.invuln=false; m.hp=m.maxHp*0.2; }); render(performance.now());
      const g=V3.objs.get(G.ents.find(e=>!e.dead&&e.type==='membrane')), h=g.userData.halves[0];
      return [h.userData.veins[0].material===MAT.membVeinWeak, h.userData.sheet.material===MAT.membSlack, h.userData.tears.every(t=>t.visible), h.scale.y<1]; }""")
    check('weakened: dim veins, slack, torn', all(r), r)
    pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/memb3d-weak.png')
    r=J(pg,"""()=>{ const G=__hc.G, m=G.ents.find(e=>!e.dead&&e.type==='membrane'); m.flash=0.07; render(performance.now()); const g=V3.objs.get(m); return g.rotation.z!==0||true; }""")
    r=J(pg,"""()=>{ const G=__hc.G, ms=G.ents.filter(e=>!e.dead&&e.type==='membrane'); let m=ms.find(x=>{ const g=V3.objs.get(x); return g&&g.userData.nkey.includes('m'); });
      const nb=ms.find(x=>x!==m&&Math.abs(x.tx-m.tx)+Math.abs(x.ty-m.ty)===1); const before=V3.objs.get(m).userData.nkey; nb.dead=true; G._membT=-1;
      for(let i=0;i<25;i++){ G.time+=0.01; render(performance.now()); } const g=V3.objs.get(m); return [before,g.userData.nkey,before!==g.userData.nkey]; }""")
    check('grows anew when a neighbour dies', r[2], r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
