from playwright.sync_api import sync_playwright
# Real death (iron mode) and saving: every way back must fail.
# 1 a fallen soldier is on the Cenotaph at once  2 save = save and quit  3 Continue uses the save up
# 4 a death after Continue stays  5 Quit asks twice and counts as a lost mission  6 a new mission gives up a suspended one
# 7 the end screen after a win lists nobody twice  8 without real death saving works as before
errs=[]
J=lambda pg,s,*a: pg.evaluate(s,*a)
ROSTER="()=>{ const R=ui.roster; return {active:R.active.map(v=>v.id).sort().join(','), fallen:R.fallen.map(v=>v.name).sort().join(',')}; }"
KILL="(id)=>{ const u=__hc.G.ents.find(e=>!e.dead&&e.vet&&e.vet.id===id); if(!u) return 'none'; u.downed=false; kill(u,null); return 'killed '+u.vet.name; }"
SETUP="""()=>{ localStorage.clear(); setTrack(true); ui.roster=emptyRoster(); setHero('Vonnie','gunner','m');
  ui.roster.active.push({id:'v1',name:SURNAMES[0],type:'trooper',rank:2,xp:300,kills:9,missions:3},{id:'v2',name:SURNAMES[1],type:'medic',rank:1,xp:150,kills:1,missions:2}); saveRoster();
  setTrack(true); }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,SETUP)
    J(pg,"()=>{ startMission(MISSIONS[1]); for(let i=0;i<30*5;i++) __hc.update(1/30); }")
    print('deployed', J(pg,"()=>__hc.G.ents.filter(e=>e.vet&&e.vet.missions).map(e=>e.vet.id).sort().join(',')"))
    print(1, J(pg,KILL,'v1'), J(pg,ROSTER), 'stored:', J(pg,"()=>store.get('hc-roster-rd').fallen.map(v=>v.name).join(',')"))
    J(pg,"()=>pause(true)"); pg.wait_for_timeout(150)
    print(2, 'labels', J(pg,"()=>[document.getElementById('p-save').innerText, document.getElementById('p-quit').innerText].map(s=>s.replace(/\\n/g,' '))"))
    pg.click('#p-save'); pg.wait_for_timeout(300)
    print(2, 'after save: G null', J(pg,"()=>__hc.G===null"), 'continue', J(pg,"()=>document.getElementById('m-continue').innerText.replace(/\\n/g,' ')"))
    pg.reload(); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.click('#m-continue'); pg.wait_for_timeout(500)
    print(3, 'save gone', J(pg,"()=>localStorage.getItem('hc-save')===null"), 'continue hidden', J(pg,"()=>{ refreshContinue(); return document.getElementById('m-continue').hidden; }"), 'rd', J(pg,"()=>__hc.G.realDeath"), 'v1 back in the field', J(pg,"()=>__hc.G.ents.some(e=>!e.dead&&e.vet&&e.vet.id==='v1')"))
    print(4, J(pg,KILL,'v2'), J(pg,ROSTER))
    pg.reload(); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print(4, 'after closing the tab', J(pg,ROSTER), 'continue hidden', J(pg,"()=>document.getElementById('m-continue').hidden"))
    # 5 quit twice
    J(pg,"()=>{ setTrack(true); startMission(MISSIONS[1]); for(let i=0;i<30*5;i++) __hc.update(1/30); pause(true); }"); pg.wait_for_timeout(150)
    pg.click('#p-quit'); pg.wait_for_timeout(100)
    print(5, 'first click: still in mission', J(pg,"()=>!!__hc.G"), J(pg,"()=>document.getElementById('p-quit').innerText.replace(/\\n/g,' ')"))
    hm=J(pg,"()=>heroOf().missions")
    pg.click('#p-quit'); pg.wait_for_timeout(200)
    print(5, 'second click: menu', J(pg,"()=>__hc.G===null"), 'hero missions', hm, '->', J(pg,"()=>heroOf().missions"))
    # 6 suspended mission given up by a new one
    J(pg,"()=>{ setTrack(true); startMission(MISSIONS[1]); for(let i=0;i<30*5;i++) __hc.update(1/30); pause(true); }"); pg.click('#p-save'); pg.wait_for_timeout(200)
    J(pg,"()=>startMission(MISSIONS[2])"); pg.wait_for_timeout(100)
    print(6, 'save gone', J(pg,"()=>localStorage.getItem('hc-save')===null"))
    # 7 win with a death in between: no double entries
    J(pg,"()=>{ goMenu('menu'); ui.roster.active.push({id:'v3',name:SURNAMES[2],type:'trooper',rank:2,xp:300,kills:3,missions:4}); saveRoster(); setTrack(true); startMission(MISSIONS[1]); for(let i=0;i<30*3;i++) __hc.update(1/30); }")
    print(7, J(pg,KILL,'v3'))
    J(pg,"()=>{ endGame(true); }") if J(pg,"()=>typeof endGame==='function'") else J(pg,"()=>{ __hc.G.objectives.forEach(o=>o.state='done'); for(let i=0;i<30*3&&!__hc.G.over;i++) __hc.update(1/30); }")
    pg.wait_for_timeout(3500)
    print(7, 'over', J(pg,"()=>__hc.G&&__hc.G.over"), 'v3 on Cenotaph x', J(pg,"()=>ui.roster.fallen.filter(v=>v.name===SURNAMES[2]).length"), 'in active', J(pg,"()=>ui.roster.active.some(v=>v.id==='v3')"), 'end lists', J(pg,"()=>document.getElementById('e-vets').innerText.replace(/\\n/g,' | ')"))
    pg.screenshot(path='rd_end.png')
    # 8 normal mode
    J(pg,"()=>{ goMenu('menu'); setTrack(false); startMission(MISSIONS[1]); pause(true); }"); pg.wait_for_timeout(150)
    pg.click('#p-save'); pg.wait_for_timeout(200)
    print(8, 'still in mission', J(pg,"()=>!!__hc.G"), 'labels', J(pg,"()=>document.getElementById('p-save').innerText.replace(/\\n/g,' ')"))
    J(pg,"()=>{ goMenu('menu'); }"); pg.click('#m-continue'); pg.wait_for_timeout(300)
    print(8, 'save stays after Continue', J(pg,"()=>localStorage.getItem('hc-save')!==null"))
    b.close()
print(errs[:5])
