# The Matron in 3D (Nov 2026): the root heart builds with all its parts, acts out what she does
# (spit, fling, rain, screech, eat, rooted, burrow), tears plates off at 66% and 33% and stays free of errors.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
shots='--shots' in sys.argv
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':900,'height':640})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map, u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); let best=null;
      for(let R=4;R<60&&!best;R++) for(let j=-R;j<=R&&!best;j++) for(let i=-R;i<=R;i++){ const x=Math.floor(u.x/TILE)+i,y=Math.floor(u.y/TILE)+j; let ok=x>6&&y>6&&x<m.w-7&&y<m.h-7; if(ok) for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++) if(!m.walk[(y+dy)*m.w+x+dx]) ok=false; if(ok&&!G.ents.some(e=>!e.dead&&e.kind==='unit'&&Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<TILE*7)){ best={x:(x+.5)*TILE,y:(y+.5)*TILE}; break; } }
      const mo=makeUnit('broodmother','swarm',best.x,best.y); mo.order={type:'hold'}; mo.think=null; window._m=mo; G.devReveal=true; computeFog(); ui.follow=false; G.following=false; centerOn(best.x,best.y);
      for(let i=0;i<5;i++) render(performance.now()+i*16); const g=V3.objs.get(mo), U=g&&g.userData;
      return U?[!!U.matron,U.roots.length,U.trail.length,U.pods.length,U.vents.length,U.eyes.length,U.tents.length,U.veins.length,U.plates.length,U.lips.length,U.fling.segs.length]:null; }""")
    check('Matron model built', r and r[0], r)
    check('8 roots, 5 trailing roots, 5 pods, 3 chimneys, 9 eyes, 3 tendrils, 7 veins', r and r[1:8]==[8,5,5,3,9,3,7], r)
    check('plates, lips, root-arm', r and r[8]>=12 and r[9]==2 and r[10]==6, r)
    if shots:
        J(pg,"()=>{ VIEW3D.dist=11; VIEW3D.minPitch=20; VIEW3D.pitch=24; V3.yaw=200; }"); pg.wait_for_timeout(1200); pg.screenshot(path='/home/claude/matron_a.png')
        J(pg,"()=>{ V3.yaw=20; }"); pg.wait_for_timeout(1200); pg.screenshot(path='/home/claude/matron_b.png')
    pg.wait_for_timeout(300)
    # damage stages
    r=J(pg,"""()=>{ const mo=_m, U=V3.objs.get(mo).userData, vis=()=>U.plates.filter(p=>p.visible).length, a=vis();
      mo.hp=mo.maxHp*0.5; render(performance.now()); const b=vis(), s1=U.slits[1].g.visible, w1=U.slits[0].lips[1].position.x;
      mo.hp=mo.maxHp*0.2; render(performance.now()); const c=vis(), s2=U.slits[1].g.visible, w2=U.slits[0].lips[1].position.x, dr=U.slits[0].drips.filter(d=>d.visible).length;
      return [a,b,c,s1,s2,+w1.toFixed(2),+w2.toFixed(2),dr]; }""")
    check('plates tear off at 66% and 33%', r[0]>r[1]>r[2], r)
    check('second split only below 33%', (not r[3]) and r[4], r)
    check('the split widens, it drips', r[6]>r[5] and r[7]==4, r)
    if shots:
        J(pg,"()=>{ V3.yaw=200; }"); pg.wait_for_timeout(1200); pg.screenshot(path='/home/claude/matron_c.png')
    J(pg,"()=>{ _m.hp=_m.maxHp; render(performance.now()); }")
    # acting out: screech, fling, rain, eat, spit
    def act(k,ago,expr):   # as if she did it ago seconds back; render a few frames so the pose settles
        return J(pg,"()=>{ G.paused=true; bossAnim(_m,'%s'); _m.bossAnim.at=__hc.G.time-%s; for(let i=0;i<12;i++) render(performance.now()+i*16); const U=V3.objs.get(_m).userData; const r=%s; G.paused=false; return r; }"%(k,ago,expr))
    r=act('screech',0.4,"[+(U.eyes[4].scale.x/U.eyes[4].userData.s).toFixed(2), +U.open.toFixed(2), +U.lean.toFixed(2)]")
    check('screech: eyes flare, maw wide open, rears back', r[0]>1.2 and r[1]>0.6 and r[2]<-0.08, r)
    r=act('lob',0.9,"[U.fling.pod.visible]")
    check('fling: the pod leaves the root-arm', r[0]==False, r)
    r=act('lob',2.0,"U.fling.pod.visible")
    check('a new pod grows back', r, r)
    r=act('rain',0.3,"[+U.vents[0].scale.y.toFixed(2), V3.smoke.filter(s=>s.col==='#7ad62a').length]")
    check('acid rain: chimneys swell and blow spores', r[0]>1.02 and r[1]>0, r)
    r=act('eat',0.35,"[+U.tents[1][0].rotation.x.toFixed(2)]")
    check('eat: the tendrils reach out', r[0]<-0.8, r)
    # rooted and burrowing
    r=J(pg,"""()=>{ const mo=_m, U=V3.objs.get(mo).userData, g=V3.objs.get(mo); mo.awake=true; mo.speedMul=mo.def.rootSpeed; mo.bossState={phase:1};
      for(let i=0;i<30;i++) render(performance.now()+i*16); const rk=U.rootK, y0=g.position.y-v3H(mo.x/TILE,mo.y/TILE);
      mo.bossState.burrow={t:mo.def.burrowTime-0.6,x:mo.x,y:mo.y}; mo.hidden=true; render(performance.now()); const vis=g.visible, y1=g.position.y-v3H(mo.x/TILE,mo.y/TILE);
      mo.bossState.burrow.t=1; render(performance.now()); const gone=!g.visible; mo.bossState.burrow=null; mo.hidden=false; mo.bossState.calmAfter=mo.def.burrowCalm-0.1; render(performance.now()); const y2=g.position.y-v3H(mo.x/TILE,mo.y/TILE);
      return [+rk.toFixed(2),+y0.toFixed(2),vis,+y1.toFixed(2),gone,+y2.toFixed(2)]; }""")
    check('rooted: roots dig in, she sits lower', r[0]>0.9 and r[1]<-0.1, r)
    check('burrowing: she sinks out of sight, then hides', r[2] and r[3]<-1.5 and r[4], r)
    check('breaking out: she rises from below', r[5]<-1, r)
    pg.wait_for_timeout(300); J(pg,"()=>{ pause(true); }")
    print('errors',errs[:5]); check('no errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED')
