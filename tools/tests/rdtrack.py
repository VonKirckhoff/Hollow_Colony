# Real death is a campaign of its own: from mission 1, fresh soldiers, own Veterans/Cenotaph; the normal campaign is kept.
# Von's case: 2 missions won on Hard in the normal campaign, ranked veterans; then Real death on.
from playwright.sync_api import sync_playwright
errs=[]; fails=[]
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(name,ok,val):
    print(('OK   ' if ok else 'FAIL ')+name, val)
    if not ok: fails.append(name)
STATE="()=>({ track:ui.realDeath, vets:ui.roster.active.length, ranks:ui.roster.active.map(v=>v.rank).join(','), hero:heroOf()?heroOf().name:null, list:[...document.querySelectorAll('#mission-list .mission:not(.training) .st')].slice(0,4).map(e=>e.textContent.replace(/[0-9:]/g,'').trim()).join(' | '), eyebrow:document.getElementById('camp-eyebrow').textContent })"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # the normal campaign: 2 missions won on Hard, ranked veterans, a hero
    J(pg,"""()=>{ localStorage.clear(); setTrack(false); ui.progress={results:{}}; ui.rdProgress={results:{}};
      ui.progress.results[MISSIONS[0].id]={diff:'hard',time:300,at:1}; ui.progress.results[MISSIONS[1].id]={diff:'hard',time:400,at:2}; store.set('hc-progress',ui.progress);
      ui.roster=loadRoster(false); setHero('Vonnie','pyro','m'); heroOf().rank=2; heroOf().xp=300; heroOf().missions=2;
      ui.roster.active.push({id:'v1',name:SURNAMES[0],type:'trooper',rank:2,xp:300,kills:9,missions:2},{id:'v2',name:SURNAMES[1],type:'gunner',rank:1,xp:150,kills:5,missions:2}); saveRoster(); goMenu('campaign'); }""")
    n0=J(pg,STATE); print('normal', n0)
    pg.click('#defeat-row [data-rd="1"]'); pg.wait_for_timeout(150)
    r=J(pg,STATE); check('Real death: from mission 1, fresh roster', r['track'] and r['vets']==0 and r['hero'] is None and r['list'].startswith('READY | LOCKED | LOCKED'), r)
    r=J(pg,"()=>({ name:document.getElementById('hero-name').value, type:(document.querySelector('[data-htype].on')||{}).dataset?.htype, sex:(document.querySelector('[data-hsex].on')||{}).dataset?.hsex })")
    check('Real death enlist form starts with your soldier from the normal campaign', r=={'name':'Vonnie','type':'pyro','sex':'m'}, r)
    pg.click('#mission-list [data-mission="2"]', modifiers=['Shift'], force=True); pg.wait_for_timeout(150)
    check('Real death: no Shift-click past a locked mission', J(pg,"()=>document.getElementById('s-brief').hidden"), J(pg,"()=>document.getElementById('toast').textContent"))
    # play mission 1 in Real death with a new soldier, win it
    r=J(pg,"""()=>{ setHero('Rookie','trooper','m'); startMission(MISSIONS[0]); const G=__hc.G; const vets=G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'&&e.vet&&e.vet.rank>0).length;
      G.objectives.forEach(o=>o.state='done'); endGame(true); return { rd:G.realDeath, rankedInField:vets, rdDone:Object.keys(ui.rdProgress.results), normalDone:Object.keys(ui.progress.results).filter(k=>MISSIONS.some(m=>m.id===k)).length,
        normalStored:Object.keys(store.get('hc-progress').results).length, rdHero:heroOf()&&heroOf().name, rdHeroMissions:heroOf()&&heroOf().missions }; }""")
    check('Real death mission 1: no ranked soldiers, its own progress', r['rd'] and r['rankedInField']==0 and r['rdDone']==[J(pg,"()=>MISSIONS[0].id")] and r['normalDone']==2 and r['rdHeroMissions']==1, r)
    J(pg,"()=>goMenu('campaign')"); r=J(pg,STATE); check('Real death list: 1 complete, 2 ready', r['list'].startswith('COMPLETE') and 'READY' in r['list'].split(' | ')[1], r)
    # the normal campaign is untouched
    J(pg,"()=>{ ui.roster.active=ui.roster.active.filter(v=>!v.hero); saveRoster(); }")   # no soldier yet in Real death: the normal form shows its own
    pg.click('#defeat-row [data-rd="0"]'); pg.wait_for_timeout(150)
    r=J(pg,STATE); check('back to normal: 2 on Hard, veterans with their ranks', (not r['track']) and r['vets']==n0['vets'] and r['ranks']==n0['ranks'] and r['hero']=='Vonnie' and r['list'].count('COMPLETE')==2, r)
    # a Real death save continues in the Real death campaign, even from the normal campaign screen
    r=J(pg,"""()=>{ setTrack(true); startMission(MISSIONS[1]); saveGame(); setTrack(false); goMenu('menu'); loadGame(); const G=__hc.G;
      return { rd:G.realDeath, track:ui.realDeath, rosterRd:ui.roster.rd, hero:heroOf()&&heroOf().name }; }""")
    check('Continue a Real death save: its own campaign and roster', r['rd'] and r['track'] and r['rosterRd'] and r['hero'] is None, r)
    J(pg,"()=>{ __hc.G=null; goMenu('campaign'); }"); pg.wait_for_timeout(100)
    pg.click('#hero-save'); pg.wait_for_timeout(150)
    r=J(pg,"()=>({ hero:heroOf()&&heroOf().name, type:heroOf()&&heroOf().type, rd:ui.roster.rd })")
    check('Enlist with the prefilled form: the same soldier in Real death', r=={'hero':'Vonnie','type':'pyro','rd':True}, r)
    # reset the Real death campaign: the normal one stays
    J(pg,"()=>{ goMenu('campaign'); }"); pg.click('#btn-reset'); pg.click('#btn-reset'); pg.wait_for_timeout(150)
    r=J(pg,"()=>({ rd:Object.keys(ui.rdProgress.results).length, rdRoster:ui.roster.active.length, normal:Object.keys(store.get('hc-progress').results).length, normalVets:store.get('hc-roster').active.length })")
    check('Reset campaign in Real death: only the Real death campaign goes', r['rd']==0 and r['rdRoster']==0 and r['normal']==2 and r['normalVets']==3, r)
    pg.screenshot(path='rdtrack.png')
    b.close()
if errs: fails.append('page errors: '+'; '.join(errs[:3]))
print('ALL OK' if not fails else 'FAILED: '+', '.join(fails))
