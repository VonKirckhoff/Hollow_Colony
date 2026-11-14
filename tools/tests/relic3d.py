# Relics in 3D (Nov 2026; RELIC3D in 33-view3d.js): every hidden item has its own model (Flight Recorder, mug, Survey Scuttler Core,
# Colony Charter, plush rabbit, cassette, fossil, flag), the four ancient eggs each their own stone and light; items lie still,
# a glint only while the spot is in sight, the flag and the rabbit's tag move in the wind; an egg beats faster while it hatches,
# and shows a gold (secured) and a green (hatched) ring. `relic3d.py shots` saves /tmp/relic3d*.png. Must end with ALL OK.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
shots=len(sys.argv)>1 and sys.argv[1]=='shots'
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); ui.roster.self=ui.roster.self||{name:'Test',sex:'m'}; startMission(MISSIONS.find(m=>m.id==='dust-landing')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; }")
    J(pg,"""()=>{ const G=__hc.G; window._T=performance.now(); window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/30); _T+=1000/30; render(_T); } }; _step(1);
      G.devReveal=true; computeFog(); G.seen.fill(1); G.vis.fill(1);
      const hq=G.ents.find(e=>e.kind==='building'&&e.faction==='corps')||G.ents.find(e=>e.kind==='unit'&&e.faction==='corps');
      let cx=Math.floor(hq.x/TILE)+6, cy=Math.floor(hq.y/TILE)-2; window._R=[];
      RELICS.forEach((r,i)=>{ const c={ id:NEXT_ID++, kind:'crate', relic:r.id, egg:r.kind==='egg', x:(cx+(i%4)*1.6+.5)*TILE, y:(cy+Math.floor(i/4)*1.6+.5)*TILE, r:8, faction:'none', value:0, secure:0, hatch:0, wakeAt:1e9 }; G.ents.push(c); _R.push(c); });
      for(const u of G.ents) if(u.kind==='unit'&&u.faction==='corps'){ u.x=(cx-4)*TILE; u.y=(cy-3)*TILE; }
      ui.follow=false; G.following=false; centerOn(_R[5].x,_R[5].y); }""")
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    J(pg,"()=>{ centerOn(_R[5].x,_R[5].y); VIEW3D.dist=Math.min(VIEW3D.dist,7); __hc.G.vis.fill(1); render(_T+=33); }")
    r=J(pg,"""()=>_R.map(c=>{ const g=V3.objs.get(c), U=g&&g.userData; if(!U) return null; let n=0; g.traverse(o=>{ if(o.isMesh) n++; }); return [c.relic, U.relic, n, !!U.relicEgg, !!U.glint, !!U.bob]; })""")
    print(r)
    check('3D: every relic has its own model', all(x and x[1]==x[0] for x in r) and len(r)==12, [x and x[:3] for x in r])
    check('3D: items have detail (8+ parts), eggs too', all(x[2]>=8 for x in r), [x[2] for x in r])
    check('3D: the 8 items glint, the 4 eggs do not; nothing bobs', sum(1 for x in r if x[4])==8 and not any(x[3] and x[4] for x in r) and not any(x[5] for x in r))
    r=J(pg,"""()=>{ const e=_R.find(c=>c.relic==='mug'), g=V3.objs.get(e), U=g.userData, ys=[], gl=[]; for(let i=0;i<120;i++){ render(_T+=33); ys.push(g.position.y); gl.push(U.glint.visible); } 
      const i=Math.floor(e.y/TILE)*__hc.G.map.w+Math.floor(e.x/TILE); __hc.G.vis[i]=0; let hid=false; for(let k=0;k<120;k++){ render(_T+=33); __hc.G.vis[i]=0; hid=hid||U.glint.visible; } __hc.G.vis.fill(1);
      return [Math.max(...ys)-Math.min(...ys), gl.filter(Boolean).length, hid]; }""")
    check('3D: an item lies still', r[0]<0.001, r)
    check('3D: it glints now and then, never when out of sight', 0<r[1]<60 and not r[2], r)
    r=J(pg,"""()=>{ const f=V3.objs.get(_R.find(c=>c.relic==='flag')).userData, t=V3.objs.get(_R.find(c=>c.relic==='rabbit')).userData, a=[], b=[]; for(let i=0;i<20;i++){ render(_T+=50); a.push(f.cloth[3].rotation.y); b.push(t.tag.rotation.z); } return [f.cloth.length, Math.max(...a)-Math.min(...a), Math.max(...b)-Math.min(...b)]; }""")
    check('3D: the flag (5 strips) and the rabbit tag move in the wind', r[0]==5 and r[1]>0.1 and r[2]>0.1, r)
    r=J(pg,"""()=>{ const e=_R.find(c=>c.relic==='egg-depths'), U=V3.objs.get(e).userData, sw=()=>{ const o=[]; for(let i=0;i<60;i++){ render(_T+=33); o.push(U.halo.material.opacity); } return o; };
      const calm=sw(); const r0=U.rings.map(m=>m.visible); e.secure=0.5; e.hatch=0.6; const hot=sw(); const r1=U.rings.map(m=>m.visible), arc=U.rings.map(m=>m.geometry.parameters&&m.geometry.parameters.thetaLength);
      e.secure=0; e.hatch=0; render(_T+=33); return [r0, r1, arc.map(x=>+(x||0).toFixed(2)), calm.reduce((a,b)=>a+b)/calm.length, hot.reduce((a,b)=>a+b)/hot.length, U.seams.length, !!V3.objs.get(_R.find(c=>c.relic==='egg-convoy')).userData.heat]; }""")
    check('3D: an egg shows no rings at rest, gold and green rings while secured/hatched, at the right length', r[0]==[False,False] and r[1]==[True,True] and abs(r[2][0]-3.14)<0.15 and abs(r[2][1]-3.77)<0.15, r)
    check('3D: a hatching egg glows brighter', r[4]>r[3]*1.3 and r[5]>=5, r)
    check('3D: the convoy egg gives off warm air', r[6], r)
    r=J(pg,"""()=>{ const mk=id=>{ const c=_R.find(x=>x.relic===id); return V3.objs.get(c).userData.body.children.map(o=>o.material&&o.material.color&&o.material.color.getHexString()).slice(0,1)[0]; }; return ['egg-maw','egg-mare','egg-convoy','egg-depths'].map(mk); }""")
    check('3D: the four eggs each have their own stone', len(set(r))==4, r)
    if shots:
        J(pg,"()=>{ __hc.G.pings.length=0; for(let i=0;i<6;i++) render(_T+=33); }"); pg.screenshot(path='/tmp/relic3d.png', timeout=90000)
        J(pg,"()=>{ VIEW3D.dist=3.2; centerOn(_R[1].x+TILE*0.8,_R[1].y); __hc.G.pings.length=0; for(let i=0;i<4;i++) render(_T+=33); }"); pg.screenshot(path='/tmp/relic3d-items.png', timeout=90000)
        J(pg,"()=>{ const e=_R.find(c=>c.relic==='egg-mare'); e.secure=0.4; _R.find(c=>c.relic==='egg-convoy').hatch=0.7; centerOn(e.x+TILE*0.8,e.y); __hc.G.pings.length=0; for(let i=0;i<4;i++) render(_T+=33); }"); pg.screenshot(path='/tmp/relic3d-eggs.png', timeout=90000)
    b.close()
print('errors',errs)
print('ALL OK' if ok and not errs else 'SOME FAILED')
