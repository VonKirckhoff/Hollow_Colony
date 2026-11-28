# The Seedling's octopus tentacles (Nov 2026): eight in 2D (no stick legs in the sprite, the pod floats on them), in the Intel
# picture and in 3D (8 chains of 6 tapering joints); they ripple while it walks, drift while it stands, spread flat while it roots.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and 'TUNNEL' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(400)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    r=J(pg,"""()=>{ const G=__hc.G, h=hives()[0]; const sd=makeUnit('seedling','swarm',h.x+3*TILE,h.y+2*TILE); sd.role='brood'; sd.mine=true; sd.invuln=true;
      window._sd=sd; G.devReveal=true; computeFog(); ui.follow=false; centerOn(sd.x,sd.y); render(performance.now());
      const sp=SPR.seedling, c=document.createElement('canvas'); c.width=sp.w; c.height=sp.h; const x=c.getContext('2d'); x.drawImage(sp.img,0,0);
      const d=x.getImageData(0,sp.h-2,sp.w,2).data; let legs=0; for(let i=3;i<d.length;i+=4) if(d[i]) legs++; return [legs, sp.h]; }""")
    check('2D sprite: no stick legs left', r[0]==0, r)
    # 2D: tentacle pixels round the pod, different from frame to frame while it walks
    r=J(pg,"""()=>{ const sd=_sd, cv=document.querySelector('canvas'), grab=()=>{ render(performance.now()); const q=worldToScreen?worldToScreen(sd.x,sd.y):null; return null; };
      const c=document.createElement('canvas'); c.width=60; c.height=30; const x=c.getContext('2d'); let pix=0, t=0;
      drawTentacles(x,30,8,18,1,1.2,false,false); drawTentacles(x,30,8,18,1,1.2,false,true); const d=x.getImageData(0,0,60,30).data; for(let i=3;i<d.length;i+=4) if(d[i]) pix++;
      const a=document.createElement('canvas'); a.width=60; a.height=30; const ax=a.getContext('2d'); drawTentacles(ax,30,8,18,1,1.2,true,false); drawTentacles(ax,30,8,18,1,1.2,true,true);
      const b=document.createElement('canvas'); b.width=60; b.height=30; const bx=b.getContext('2d'); drawTentacles(bx,30,8,18,1,1.35,true,false); drawTentacles(bx,30,8,18,1,1.35,true,true);
      const da=ax.getImageData(0,0,60,30).data, db=bx.getImageData(0,0,60,30).data; let diff=0; for(let i=3;i<da.length;i+=4) if(!!da[i]!==!!db[i]) diff++;
      let left=0,right=0; for(let y=0;y<30;y++) for(let X=0;X<60;X++) if(d[(y*60+X)*4+3]){ if(X<24) left++; if(X>36) right++; }
      return [pix, diff, left, right]; }""")
    check('2D: tentacles drawn on both sides of the pod', r[0]>120 and r[2]>15 and r[3]>15, r)
    check('2D: they move while it walks', r[1]>10, r)
    # Intel picture draws without errors
    r=J(pg,"()=>{ const c=document.createElement('canvas'); c.width=48; c.height=48; const x=c.getContext('2d'); const sc=intelScene('seedling'); for(let t=0;t<12;t+=0.5) sc(x,t); return true; }")
    check('Intel picture plays', r, r)
    pg.screenshot(path='/tmp/tent2d.png', clip={'x':583,'y':300,'width':200,'height':160})
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    r=J(pg,"""()=>{ const sd=_sd; centerOn(sd.x,sd.y); for(let i=0;i<4;i++) render(performance.now()+i*16); const g=V3.objs.get(sd), U=g&&g.userData; if(!U||!U.tents) return null;
      return [U.tents.length, U.tents.map(t=>t.length)]; }""")
    check('3D: 8 tentacles of 6 joints', r and r[0]==8 and all(n==6 for n in r[1]), r)
    r=J(pg,"""()=>{ const sd=_sd, U=V3.objs.get(sd).userData, rz=()=>U.tents.map(t=>t.map(j=>j.rotation.z)); const tip=()=>{ const v=new THREE.Vector3(); U.tents[0][5].getWorldPosition(v); return v.y; };
      const g=V3.objs.get(sd); g.updateMatrixWorld(true); const gy=v3H(sd.x/TILE,sd.y/TILE)+v3CreepAt(sd.x/TILE,sd.y/TILE);   /* the top of the mycel crust: units stand on it (v3CreepAt) */
      sd.moving=false; v3PoseTentacles(sd,U,1,false); const a=rz(); v3PoseTentacles(sd,U,1.3,false); const b=rz();
      sd.moving=true; v3PoseTentacles(sd,U,1,true); const c=rz(); v3PoseTentacles(sd,U,1.1,true); const d=rz();
      const diff=(p,q)=>p.flat().reduce((s,v,i)=>s+Math.abs(v-q.flat()[i]),0);
      v3PoseTentacles(sd,U,1,false); g.updateMatrixWorld(true); const v=new THREE.Vector3(); let lo=9; for(const t of U.tents){ t[4].getWorldPosition(v); lo=Math.min(lo,v.y-gy); }
      /* tentacle 0 and 4 at the same moment are at different points of the ripple */
      const r1=diff([c[0]],[c[4]]);
      return [+diff(a,b).toFixed(3), +diff(c,d).toFixed(3), +lo.toFixed(3), +r1.toFixed(3)]; }""")
    check('3D: slow drift standing, faster wave walking', r[0]>0.02 and r[1]>r[0], r)
    check('3D: the tentacles reach the ground', abs(r[2])<0.12, r)
    check('3D: a ripple runs round the pod', r[3]>0.05, r)
    J(pg,"""()=>{ const sd=_sd; sd.order={type:'move',x:sd.x+4*TILE,y:sd.y+TILE}; setPath(sd,sd.x+4*TILE,sd.y+TILE); }""")
    for i in range(6): J(pg,"()=>{ __hc.update(1/30); render(performance.now()); }")
    J(pg,"()=>{ VIEW3D.dist=Math.max(4,VIEW3D.dist*0.4); centerOn(_sd.x,_sd.y); render(performance.now()); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/tent3d.png', clip={'x':483,'y':200,'width':400,'height':320})
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAILED')
