# The Matron's Seed (Nov 2026; crate flag `heart`): what she leaves behind in The Matron's Blood (Rogue job 8), and its split husk
# (flags heart+husk) that Dust finds in The Matron (Corps 9; the Corps mission The Matron's Seed was cut, the campaign has 10 missions).
# 2D: drawn by drawMatronSeed (root fibres, bark rind, glowing cracks, bent tip), also in Intel; 3D: v3Seed (bark plates,
# 16 crack pieces, 7 root fibres with beads of sap, a bud and a haze), it does not bob and it pulses (seedBeat). Must end with ALL OK.
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
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='brood-mother')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); ANIM.meteorEvery=0; ANIM.devilEvery=0; }")
    J(pg,"""()=>{ const G=__hc.G; window._T=performance.now(); window._step=(sec)=>{ const t1=G.time+sec; for(let i=0;i<2000&&G.time<t1;i++){ __hc.update(1/30); _T+=1000/30; render(_T); } }; _step(1.5);
      G.devReveal=true; computeFog(); G.seen.fill(1); window._h=G.vars.husk;
      window._s={ id:NEXT_ID++, kind:'crate', rogue:true, heart:true, x:_h.x-3*TILE, y:_h.y, r:12, faction:'none', t:1e9, seed:1 }; G.ents.push(_s);   /* a Seed to look at, next to the husk */ ui.follow=false; G.following=false; centerOn(_s.x,_s.y); for(const u of G.ents) if(u.kind==='unit'&&u.faction!=='corps') u.devFrozen=true; G.devPause=true; }""")
    r=J(pg,"()=>{ const G=__hc.G; return [MISSIONS.length, MISSIONS.map(m=>m.id).join(','), !!(_h&&_h.heart&&_h.husk), Math.floor(_h.x/TILE), Math.floor(_h.y/TILE), walkableT(Math.floor(_h.x/TILE),Math.floor(_h.y/TILE)), MISSIONS.find(m=>m.id==='brood-mother').briefing.join(' ')]; }")
    print('mission',r[:5])
    check('the Corps campaign has 10 missions, The Matron\'s Seed is gone', r[0]==10 and 'mothers-heart' not in r[1], r[1])
    check('The Matron: the Seed\'s husk lies by her tunnel, on open ground', r[2] and r[5], r[2:6])
    check('The Matron\'s briefing tells what happened (the scream, the crew, what she tore out)', 'scream' in r[6] and 'Osprey crew' in r[6] and 'tore out of herself' in r[6])
    r=J(pg,"""()=>{ const G=__hc.G; const said=[], o=window.say; window.say=(w,t,k)=>{ said.push(t); return o(w,t,k); }; G.devPause=false; let n=0; for(const u of G.ents) if(u.kind==='unit'&&u.faction==='corps'&&n<3){ u.x=_h.x+TILE*(1+n*0.5); u.y=_h.y; u.invuln=true; n++; } _step(3); const early=said.some(t=>/This is where they were/.test(t));
      for(const e of G.ents) if(!e.dead&&e.kind==='building'&&e.type==='hive') damage(e,1e8,null); for(const u of G.ents) if(u.invuln&&u.kind==='unit'){ u.x=_h.x+TILE; u.y=_h.y+TILE*0.5; } _step(4); G.devPause=true; window.say=o; return [early, said.some(t=>/This is where they were/.test(t))]; }""")
    check('Kessler speaks at the husk only once the lair is open', r==[False,True], r)
    r=J(pg,"()=>{ const c=document.createElement('canvas').getContext('2d'); try{ drawSeedHusk(c,100,100); return true; }catch(e){ return String(e); } }")
    check('2D: the husk draws', r is True, r)
    r=J(pg,"()=>{ try{ render(_T); const c=document.createElement('canvas').getContext('2d'); drawMatronSeed(c,100,100,0.3); return [true,typeof seedBeat==='function', +seedBeat(0.29).toFixed(2), +seedBeat(1.0).toFixed(2)]; }catch(e){ return [String(e)]; } }")
    check('2D: the Seed draws, the beat comes and goes', r[0] is True and r[1] and max(r[2],r[3])!=min(r[2],r[3]), r)
    if shots: pg.wait_for_timeout(200); pg.screenshot(path='/tmp/seed2d.png', timeout=90000)
    pg.keyboard.press('F3'); pg.wait_for_timeout(600)
    J(pg,"()=>{ centerOn(_s.x,_s.y); VIEW3D.dist=Math.min(VIEW3D.dist,9); _step(0.5); }")
    r=J(pg,"""()=>{ const g=V3.objs.get(_s), U=g&&g.userData; if(!U) return null; let meshes=0; g.traverse(o=>{ if(o.isMesh) meshes++; });
      return [!!U.seed, meshes, U.cracks.length, U.beads.length, !!U.bud, !!U.halo, !!U.bob]; }""")
    print('model',r)
    check('3D: the Seed model is built (plates, 16 cracks, 7 roots with beads, bud, haze)', r and r[0] and r[1]>=35 and r[2]==16 and r[3]==7 and r[4] and r[5], r)
    check('3D: it is rooted, it does not bob', r and not r[6], r)
    r=J(pg,"""()=>{ const g=V3.objs.get(_s), U=g.userData, out=[]; for(let i=0;i<30;i++){ _step(1/30); out.push([+g.position.y.toFixed(4), +U.cracks[0].scale.x.toFixed(4), +U.halo.scale.x.toFixed(4)]); } return out; }""")
    ys=[a[0] for a in r]; cr=[a[1] for a in r]; ha=[a[2] for a in r]
    check('3D: it stays on the ground', max(ys)-min(ys)<0.001, (min(ys),max(ys)))
    check('3D: the cracks and the haze pulse', max(cr)>min(cr)*1.3 and max(ha)>min(ha)*1.05, (min(cr),max(cr),min(ha),max(ha)))
    r=J(pg,"""()=>{ const g=V3.objs.get(_h), U=g&&g.userData; if(!U) return null; let meshes=0, glow=0; g.traverse(o=>{ if(o.isMesh){ meshes++; if(o.material&&o.material.type==='MeshBasicMaterial') glow++; } }); return [meshes, glow, !!U.seed, !!U.bob]; }""")
    check('3D: the husk is built, dead (no glow, no pulse, no bob)', r and r[0]>=9 and r[1]==0 and not r[2] and not r[3], r)
    if shots: pg.wait_for_timeout(200); pg.screenshot(path='/tmp/seed3d.png', timeout=90000)
    pg.keyboard.press('F3'); pg.wait_for_timeout(300)
    r=J(pg,"()=>{ const e=INTEL_EXTRA.heart; return [e.name, e.role, e.desc]; }")
    check('Intel: Her Seed, The Matron\'s Blood', r[0]=='Her Seed' and "The Matron's Blood" in r[1] and 'heart' not in r[2].lower(), r)
    r=J(pg,"()=>{ const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'); try{ INTEL_SCENES.heart(x,0.3); return true; }catch(e){ return String(e); } }")
    check('Intel: the moving picture draws the Seed', r is True, r)
    r=J(pg,"()=>{ const m=ROGUE_MISSIONS.find(x=>x.id==='rogue-mothers-blood'); return m.summary+' '+m.briefing.join(' '); }")
    check("The Matron's Blood speaks of her Seed, not her hearts", 'Seed' in r and 'heart' not in r.lower(), r[:120])
    b.close()
print('errors',errs)
print('ALL OK' if ok and not errs else 'SOME FAILED')
