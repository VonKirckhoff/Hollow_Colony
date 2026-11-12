# The grazer and the Brute in more detail (Nov 2026): a hit grazer bolts and its herd runs with it, then calms down;
# the 3D models (grazer, Sporebag, grazer carcass, Brute) build and pose without errors; the Brute loses bands as it gets hurt.
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
    # a herd of three on open ground, a Scuttler bites one
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map, u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); let best=null;
      for(let R=3;R<60&&!best;R++) for(let j=-R;j<=R&&!best;j++) for(let i=-R;i<=R;i++){ const x=Math.floor(u.x/TILE)+i,y=Math.floor(u.y/TILE)+j; let ok=x>6&&y>6&&x<m.w-7&&y<m.h-7; if(ok) for(let dy=-3;dy<=3;dy++)for(let dx=-4;dx<=4;dx++) if(!m.walk[(y+dy)*m.w+x+dx]) ok=false; if(ok&&!G.ents.some(e=>!e.dead&&Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<TILE*6)){ best={x:(x+.5)*TILE,y:(y+.5)*TILE}; break; } }
      const gz=[0,1,2].map(i=>{ const g=makeUnit('grazer','wild',best.x+(i-1)*1.2*TILE,best.y); g.home={x:g.x,y:g.y}; g.wait=99; return g; });
      const d=makeUnit('drone','swarm',best.x-TILE*2,best.y); d.order={type:'hold'}; window._t={gz,d,best};
      damage(gz[0],1,d); return [best.x,best.y]; }""")
    pg.wait_for_timeout(150)
    r=J(pg,"()=>{ const {gz,d}=_t; return gz.map(g=>[!!g.order, +(g.fleeT||0).toFixed(2), g.speedMul, g.order?Math.sign(g.order.x-d.x):0]); }")
    check('the hit grazer bolts', r[0][0] and r[0][1]>0 and r[0][2]>1.5, r)
    check('its herd runs with it', all(g[0] and g[1]>0 for g in r[1:]), r)
    check('away from what hit it', r[0][3]>0, r)
    pg.wait_for_timeout(1500)
    r=J(pg,"()=>{ const {gz,best}=_t; return gz.map(g=>Math.round((g.x-best.x)/TILE*10)/10); }")
    check('they ran a few tiles', r[0]>1.5, r)
    pg.wait_for_timeout(2500)
    r=J(pg,"()=>_t.gz.map(g=>[+(g.fleeT||0).toFixed(2), g.speedMul])")
    check('then they calm down', all(g[0]==0 and g[1]==1 for g in r), r)
    r=J(pg,"()=>{ FAUNA.flee=0; const g=_t.gz[1]; g.order=null; damage(g,1,_t.d); updateUnit(g,0.05); const o=!!g.order; FAUNA.flee=3.5; return o; }")
    check('flee 0: a hit grazer stands still', r==False, r)
    # 3D: every model builds, poses for a few seconds, the carcass lies on its back, the Brute breaks bands
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, b=_t.best, br=makeUnit('brute','swarm',b.x,b.y+2*TILE), sb=makeUnit('bloater','swarm',b.x+2*TILE,b.y+2*TILE); br.order=sb.order={type:'hold'}; window._t.br=br; window._t.sb=sb;
      damage(_t.gz[2],999,_t.d); G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(b.x,b.y+TILE); for(let i=0;i<5;i++) render(performance.now()+i*16);
      const body=G.ents.find(e=>e.kind==='body'&&e.fauna&&!e.dead), mb=body&&V3.objs.get(body), mg=V3.objs.get(_t.gz[0]), mbr=V3.objs.get(br), ms=V3.objs.get(sb);
      return [!!body, !!(mb&&mb.children[0]&&Math.abs(mb.children[0].rotation.z-Math.PI)<0.01), !!(mg&&mg.userData.grazer&&mg.userData.neck), !!(mbr&&mbr.userData.bands&&mbr.userData.bands.length===7), !!(ms&&ms.userData.sac&&!ms.userData.grazer)]; }""")
    check('carcass made', r[0], r); check('carcass on its back', r[1], r); check('grazer model', r[2], r); check('Brute model with 7 bands', r[3], r); check('Sporebag is a swollen grazer', r[4], r)
    pg.wait_for_timeout(2500)
    r=J(pg,"""()=>{ const br=_t.br, U=V3.objs.get(br).userData, vis=()=>U.bands.filter(b=>b.visible).length; const a=vis();
      br.hp=br.maxHp*0.4; render(performance.now()); const b1=vis(); br.hp=br.maxHp*0.2; render(performance.now()); const b2=vis(); br.hp=br.maxHp; render(performance.now()); return [a,b1,b2,vis()]; }""")
    check('Brute breaks bands at 50% and 25%', r==[7,6,5,7], r)
    r=J(pg,"""()=>{ const g=_t.gz[0], U=V3.objs.get(g).userData; g.fleeT=0; g.order=null; g.moving=false; U.alert=false; U.alertT=1e9; const T0=performance.now();
      for(let i=0;i<120;i++) v3PoseGrazer(g,U,(Math.PI*0.5-g.id*1.7)/0.3+i*0.016,false); return +U.neck.rotation.x.toFixed(2); }""")
    check('a calm grazer lowers its head to graze', r>0.3, r)
    r=J(pg,"""()=>{ const g=_t.gz[0], U=V3.objs.get(g).userData; U.alertT=0; const d=makeUnit('drone','swarm',g.x+TILE,g.y); d.order={type:'hold'}; for(let i=0;i<80;i++) v3PoseGrazer(g,U,10+i*0.016,false); d.dead=true; return +U.neck.rotation.x.toFixed(2); }""")
    check('something near: head up', r<-0.6, r)
    pg.wait_for_timeout(500)
    J(pg,"()=>{ pause(true); }")
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
