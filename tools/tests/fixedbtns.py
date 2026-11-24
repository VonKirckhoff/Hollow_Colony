# Buttons keep their place: releasing a formation does not shift the command card, switching 2D/3D does not shift the top bar.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
POS="""()=>{ const o={}; for(const b of document.querySelectorAll('#cmdcard .cmd, #topbar .tb-btn')){ const r=b.getBoundingClientRect(); o[(b.id||b.dataset.key)]=[Math.round(r.x),Math.round(r.y),getComputedStyle(b).visibility]; } return o; }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); const us=__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); selectEntities(us,false); }"); pg.wait_for_timeout(300)
    none=J(pg,POS)
    for k,name in (('z','circle'),('v','square')):
        pg.keyboard.press(k); pg.wait_for_timeout(300); on=J(pg,POS)
        pg.screenshot(path='/home/claude/fixed-'+name+'.png')
        pg.keyboard.press(k); pg.wait_for_timeout(300); off=J(pg,POS)
        check(name+': E is there with and without formation', 'E' in on and 'E' in off, [on.get('E'),off.get('E')])
        check(name+': no command button moves when released', all(on[x][:2]==off.get(x,[0,0])[:2] for x in on), {x:(on[x],off.get(x)) for x in on if on[x][:2]!=off.get(x,[0,0])[:2]})
    check('same places as before any formation', all(none[x][:2]==off[x][:2] for x in none))
    E=J(pg,"()=>{ const c=CMDS.find(c=>c.key==='E'); return [!!c.off,c.cost]; }")
    check('E greyed out without a formation', E[0] and not E[1], E)
    pg.keyboard.press('F3'); pg.wait_for_timeout(1200); d3=J(pg,POS)
    pg.screenshot(path='/home/claude/fixed-3d.png')
    pg.keyboard.press('F3'); pg.wait_for_timeout(600); d2=J(pg,POS)
    pg.screenshot(path='/home/claude/fixed-2d.png')
    tb=['btn-follow','btn-view','btn-turn-l','btn-turn-r','btn-speed','btn-menu']
    check('turn buttons visible in 3D, hidden in 2D', d3['btn-turn-l'][2]=='visible' and d2['btn-turn-l'][2]=='hidden', [d3['btn-turn-l'],d2['btn-turn-l']])
    check('top bar buttons keep their place 2D/3D', all(d3[x][:2]==d2[x][:2] for x in tb), {x:(d3[x],d2[x]) for x in tb})
    # playing the Swarm: the Batch row is always there, so Select all and the other Orders keep their place while a batch grows
    J(pg,"()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-siege')); }"); pg.wait_for_timeout(500)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); __hc.G.swarm.biomass=2000; selectEntities([],false); G.selDirty=true; renderCmdCard(); }"); pg.wait_for_timeout(300)
    s0=J(pg,POS)
    J(pg,"()=>{ swarmBreed('crawler'); swarmBreed('drone',3); renderCmdCard(); if(!nestHive().batch.items.length) throw 'no eggs'; }"); pg.wait_for_timeout(300)
    s1=J(pg,POS); check('swarm: eggs show in the Batch row', J(pg,"()=>CMDS.filter(c=>c.row==='Batch').length===3")); pg.screenshot(path='/home/claude/fixed-swarm-batch.png')
    J(pg,"()=>{ batchReleaseAll(); renderCmdCard(); }"); pg.wait_for_timeout(300); s2=J(pg,POS)
    J(pg,"()=>{ const P=SWARM_PLAY.batch; for(let i=0;i<(P.grow+P.per*6+2)*10;i++) update(0.1); renderCmdCard(); }"); pg.wait_for_timeout(300); s3=J(pg,POS)
    pg.screenshot(path='/home/claude/fixed-swarm-empty.png')
    keys=['^A','A','G','H','B','T','Q','W','E','R','Space']
    check('swarm: Batch row there without eggs', J(pg,"()=>!!CMDS.find(c=>c.row==='Batch'&&c.key==='Space'&&c.off)"))
    for nm,st in (('eggs in the batch',s1),('batch growing',s2),('hatched',s3)):
        check('swarm: buttons keep their place, '+nm, all(k in s0 and k in st and s0[k][:2]==st[k][:2] for k in keys), {k:(s0.get(k),st.get(k)) for k in keys if s0.get(k,[0,0])[:2]!=st.get(k,[1,1])[:2]})
    check('no errors', not errs, errs[:3])
    print('ALL OK' if ok else 'SOME FAILED')
