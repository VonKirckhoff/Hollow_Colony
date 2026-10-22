from playwright.sync_api import sync_playwright
import json
errs=[]
J=lambda pg,s: pg.evaluate(s)
SNAP="""()=>{ const G=__hc.G; const al=G.ents.filter(e=>!e.dead); return JSON.stringify({ t:Math.round(G.time), n:al.length, units:al.filter(e=>e.kind==='unit').length, corps:al.filter(e=>e.faction==='corps'&&e.kind==='unit').map(u=>u.type+':'+Math.round(u.hp)).sort().join(','),
  hives:hives().length, hp:Math.round(al.reduce((s,e)=>s+(e.hp||0),0)), salvage:Math.round(G.salvage), wave:G.swarm.waveN, nextWave:Math.round(G.swarm.nextWave), fired:G.triggers.filter(t=>t.fired).length,
  groups:Object.entries(G.groups).map(([k,v])=>k+':'+v.length).join(','), formShared:(()=>{ const us=al.filter(e=>e.formation); return us.length?new Set(us.map(u=>u.formation)).size:0; })(), sel:G.sel.length, objectives:G.objectives.map(o=>o.state).join(','), creep:G.creep?Math.round(G.creep.reduce((s,x)=>s+x,0)):0, relics:al.filter(e=>e.relic).length, cfg:JSON.stringify(G.swarm.cfg===G.mission.swarm) }); }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-save'); startMission(MISSIONS.find(m=>m.id==='burn-the-brood')); }"); pg.wait_for_timeout(400)
    J(pg,"""()=>{ const G=__hc.G; const us=G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'); selectEntities(us,false); setFormation('wedge'); G.groups['1']=[...us]; G.groups['2']=us.slice(0,3); G.groupForm={'1':us[0].formation};
       G.swarm.nextWave=G.time+20; for(let i=0;i<30*90;i++) __hc.update(1/30); }""")
    a=J(pg,SNAP); print('before', a)
    J(pg,"()=>{ pause(true); }"); pg.wait_for_timeout(200); pg.click('#p-save'); pg.wait_for_timeout(300)
    print('size KB', J(pg,"()=>Math.round(localStorage.getItem('hc-save').length/1024)"))
    pg.reload(); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print('continue btn', J(pg,"()=>{ const b=document.getElementById('m-continue'); return [b.hidden, b.innerText.replace(/\\n/g,' ')]; }"))
    pg.click('#m-continue'); pg.wait_for_timeout(500)
    b2=J(pg,SNAP); print('after ', b2)
    da=json.loads(a); db=json.loads(b2); print('DIFF', {k:(da[k],db[k]) for k in da if da[k]!=db[k]})
    J(pg,"()=>{ for(let i=0;i<30*120;i++) __hc.update(1/30); }")
    print('2 min later', J(pg,SNAP))
    pg.screenshot(path='save_after.png')
    b.close()
print(errs[:5])
