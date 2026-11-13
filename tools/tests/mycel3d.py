# The mycel in 3D (Nov 2026): a dark crusty skin with veinlets and spots that glow up and go out (terrain shader), raised light veins
# from every nest with pulses running out (only where there is mycel), a low mist and spores that drift up from mycel your units see.
# Veins go when the nest goes; MYCEL3D is in the dev panel with help. --shots for screenshots.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1100,'height':720})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type in('error','warning') and 'ERR_' not in m.text and 'GPU stall' not in m.text and 'GL Driver' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(800)
    # full-grown mycel round every nest, everything seen, camera on a hive
    r=J(pg,"""()=>{ const G=__hc.G; G.devReveal=true; computeFog(); for(const h of nests()) h.creepR=hiveOpt(h,'creep',CREEP.max); for(let i=0;i<8;i++) updateCreep(1);
      const h=G.ents.find(e=>!e.dead&&e.type==='hive'); window._h=h; ui.follow=false; G.following=false; centerOn(h.x,h.y); G.paused=true;
      window._T=performance.now(); for(let i=0;i<20;i++){ _T+=50; render(_T); }
      const M=V3.myc; return [v3Active(), !!M, nests().length, M?M.veins.size:0, G.creepAny]; }""")
    check('3D on, the mycel objects are there, a vein network per nest', r[0] and r[1] and r[3]==r[2] and r[2]>0 and r[4], r)
    r=J(pg,"""()=>{ const g=V3.myc.veins.get(_h), m=g.children; const pts=m.flatMap(o=>{ const p=o.geometry.attributes.position; return [0,Math.floor(p.count/2),p.count-1].map(i=>[p.getX(i),p.getZ(i)]); });
      const far=Math.max(...pts.map(([x,z])=>Math.hypot(x-_h.x/TILE,z-_h.y/TILE)));
      const onWalk=pts.every(([x,z])=>{ const c=tileAt(__hc.G.map,Math.floor(x),Math.floor(z)); return TILE_DEF[c]&&TILE_DEF[c].walk; });
      const S=m.map(o=>o.geometry.attributes.aS.array), s0=Math.min(...S.map(a=>a[0])), s1=Math.max(...S.map(a=>a[a.length-1]));
      return [m.length, +far.toFixed(1), hiveOpt(_h,'creep',CREEP.max), onWalk, +s0.toFixed(2), +s1.toFixed(1), m[0].material===V3.myc.veinMat]; }""")
    print('veins',r)
    check('strongly veined: main veins plus forks', r[0]>=14, r)
    check('veins stay inside the mycel radius and on walkable ground', r[1]<=r[2]+0.5 and r[1]>r[2]*0.5 and r[3], r)
    check('vein distance runs outward from the nest (pulses go out)', r[4]<1.5 and r[5]>4, r)
    # pulses move outward over time: the pulse uniform keeps its speed and time advances
    r=J(pg,"()=>{ const u=V3.myc.veinMat.uniforms; return [u.uP.value.x, u.uP.value.y, u.uP.value.z, u.v3Fog.value===V3.u.fog.value]; }")
    check('pulse speed, gap and brightness come from MYCEL3D; veins read the fog texture', r[0]==2.4 and r[1]==6 and r[2]==1.5 and r[3], r)
    # the ground shader: crust + spots, no more sheen wave
    r=J(pg,"""()=>{ const src=V3.r.info.programs.map(p=>p.name+'').length; const m=V3.terrain.material; return [V3.u.myc.value.toArray(), typeof V3_MYC_GLSL, V3_MYC_GLSL.includes('v3Worley'), /wet sheen/.test(v3Fogify.toString())]; }""")
    check('terrain shader carries the crust and glowing spots, the sheen wave is gone', r[0]==[1,1.1,1,0.55] and r[2] and not r[3], r)
    # spores: spawned only on mycel that is seen, rising
    r=J(pg,"""()=>{ const M=V3.myc, G=__hc.G, live=[]; for(let i=0;i<M.life.length;i++) if(M.life[i].max>0) live.push(i);
      const on=live.filter(i=>{ const x=M.sp[i*3], z=M.sp[i*3+2], k=Math.floor(z)*G.map.w+Math.floor(x); return (G.creep[k]||0)>0.2; }).length/live.length>0.9;
      const i=live[0], y0=M.sp[i*3+1]; v3Mycel3D(_T/1000,0.5); const y1=M.sp[i*3+1]; return [live.length, on, +(y1-y0).toFixed(3)]; }""")
    print('spores',r)
    check('spores drift up from the mycel', r[0]>=40 and r[1] and r[2]>0, r)
    r=J(pg,"()=>V3.myc.mist.map(o=>[o.visible,o.material.transparent,o.material.depthWrite,o.parent===V3.fxg])")
    check('three layers of mist, see-through, outside the xray pass', len(r)==3 and all(m[0] and m[1] and not m[2] and m[3] for m in r), r)
    # spores only where your units see: hide everything and let them run out
    r=J(pg,"""()=>{ const G=__hc.G; G.devReveal=false; G.vis.fill(0); for(let i=0;i<30;i++) v3Mycel3D(_T/1000+i*0.4,0.4); const M=V3.myc;
      return M.life.filter(l=>l.max>0).length; }""")
    check('no new spores where nobody sees', r==0, r)
    J(pg,"()=>{ __hc.G.devReveal=true; computeFog(); }")
    # dev panel knobs
    r=J(pg,"()=>{ MYCEL3D.mist=0; MYCEL3D.spores=0; MYCEL3D.spots=0; _T+=50; render(_T); const M=V3.myc; const r=[M.mist.every(o=>!o.visible), M.life.every(l=>l.max<=0), V3.u.myc.value.y]; MYCEL3D.mist=0.45; MYCEL3D.spores=260; MYCEL3D.spots=1.1; return r; }")
    check('mist, spores and spots can be switched off', r[0] and r[1] and r[2]==0, r)
    r=J(pg,"()=>{ const n0=V3.myc.veins.get(_h).children.length; MYCEL3D.branches=20; _T+=50; render(_T); const n1=V3.myc.veins.get(_h).children.length; MYCEL3D.branches=12; _T+=50; render(_T); return [n0,n1]; }")
    check('more branches regrow the network', r[1]>r[0], r)
    r=J(pg,"()=>[DEV_ROOTS.MYCEL3D===MYCEL3D, Object.keys(MYCEL3D).every(k=>DEV_HELP['MYCEL3D|'+k]), DEV_TABS.some(t=>(t.roots||[]).includes('MYCEL3D'))]")
    check('MYCEL3D in the dev panel with help', all(r), r)
    if '--shots' in sys.argv:
        J(pg,"()=>{ VIEW3D.dist=14; for(let i=0;i<10;i++){ _T+=80; render(_T); } }"); pg.screenshot(path='/home/claude/mycel3d.png')
        J(pg,"()=>{ VIEW3D.dist=8; for(let i=0;i<10;i++){ _T+=80; render(_T); } }"); pg.screenshot(path='/home/claude/mycel3d_close.png')
    # the nest goes: its veins go with it
    r=J(pg,"()=>{ kill(_h,null); _T+=50; render(_T); return V3.myc.veins.has(_h); }")
    check('veins go when the nest goes', not r, r)
    J(pg,"()=>{ pause(true); }")
    check('no errors', not errs, errs[:3])
    print('ALL OK' if ok else 'SOME FAILED')
