# Real death is a campaign of its own: from mission 1, fresh soldiers, own Veterans/Cenotaph; the normal campaign is kept.
# Your own soldier is one person in both: the same name and sex; rank, XP and missions belong to each campaign.
from playwright.sync_api import sync_playwright
errs=[]; fails=[]
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(name,ok,val):
    print(('OK   ' if ok else 'FAIL ')+name, val)
    if not ok: fails.append(name)
STATE="()=>{ const h=heroOf(); return { track:ui.realDeath, others:ui.roster.active.filter(v=>!v.hero).length, ranks:ui.roster.active.filter(v=>!v.hero).map(v=>v.rank).join(','), hero:h?h.name:null, heroRank:h?h.rank:null, heroXp:h?h.xp:null, heroMissions:h?h.missions||0:null, heroType:h?h.type:null, list:[...document.querySelectorAll('#mission-list .mission:not(.training) .st')].slice(0,4).map(e=>e.textContent.replace(/[0-9:]/g,'').trim()).join(' | ') }; }"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # the normal campaign: 2 missions won on Hard, ranked veterans, your soldier Vonnie (Pyro, Captain material)
    J(pg,"""()=>{ localStorage.clear(); setTrack(false); ui.progress={results:{}}; ui.rdProgress={results:{}};
      ui.progress.results[MISSIONS[0].id]={diff:'hard',time:300,at:1}; ui.progress.results[MISSIONS[1].id]={diff:'hard',time:400,at:2}; store.set('hc-progress',ui.progress);
      ui.roster=loadRoster(false); setHero('Vonnie','pyro','m'); Object.assign(heroOf(),{rank:2,xp:300,missions:2,kills:20});
      ui.roster.active.push({id:'v1',name:SURNAMES[5],type:'trooper',rank:2,xp:300,kills:9,missions:2},{id:'v2',name:SURNAMES[6],type:'gunner',rank:1,xp:150,kills:5,missions:2}); saveRoster(); goMenu('campaign'); }""")
    n0=J(pg,STATE); print('normal', n0)
    pg.click('#defeat-row [data-rd="1"]'); pg.wait_for_timeout(150)
    r=J(pg,STATE); check('Real death: from mission 1, no veterans, your soldier there from zero', r['track'] and r['others']==0 and r['hero']=='Vonnie' and r['heroRank']==0 and r['heroXp']==0 and r['heroMissions']==0 and r['heroType']=='pyro' and r['list'].startswith('READY | LOCKED | LOCKED'), r)
    pg.click('#mission-list [data-mission="2"]', modifiers=['Shift'], force=True); pg.wait_for_timeout(150)
    check('Real death: no Shift-click past a locked mission', J(pg,"()=>document.getElementById('s-brief').hidden"), J(pg,"()=>document.getElementById('toast').textContent"))
    r=J(pg,"""()=>{ startMission(MISSIONS[0]); const G=__hc.G; const ranked=G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'&&e.vet&&e.vet.rank>0).length;
      G.objectives.forEach(o=>o.state='done'); endGame(true); return { rd:G.realDeath, rankedInField:ranked, rdDone:Object.keys(ui.rdProgress.results), normalDone:Object.keys(ui.progress.results).filter(k=>MISSIONS.some(m=>m.id===k)).length, heroMissions:heroOf().missions }; }""")
    check('Real death mission 1: no ranked soldiers, its own progress', r['rd'] and r['rankedInField']==0 and r['rdDone']==[J(pg,"()=>MISSIONS[0].id")] and r['normalDone']==2 and r['heroMissions']==1, r)
    J(pg,"()=>goMenu('campaign')"); r=J(pg,STATE); check('Real death list: 1 complete, 2 ready', r['list'].startswith('COMPLETE') and 'READY' in r['list'].split(' | ')[1], r)
    # rename in Real death: the same name in the normal campaign, with its rank kept
    J(pg,"()=>{ setHero('Patrick','pyro','m'); }")
    pg.click('#defeat-row [data-rd="0"]'); pg.wait_for_timeout(150)
    r=J(pg,STATE); check('back to normal: same name (renamed in Real death), rank and veterans kept', (not r['track']) and r['hero']=='Patrick' and r['heroRank']==2 and r['heroMissions']==2 and r['others']==2 and r['ranks']==n0['ranks'] and r['list'].count('COMPLETE')==2, r)
    # rename in the normal campaign: Real death follows
    J(pg,"()=>{ setHero('Von','pyro','m'); }"); pg.click('#defeat-row [data-rd="1"]'); pg.wait_for_timeout(150)
    r=J(pg,STATE); check('rename in normal: Real death follows, its own progress kept', r['hero']=='Von' and r['heroMissions']==1 and r['heroRank']==0, r)
    # two different names from before (old saves): aligned when the game starts
    J(pg,"()=>{ const a=store.get('hc-roster'); a.active.find(v=>v.hero).name='Alpha'; store.set('hc-roster',a); const b2=store.get('hc-roster-rd'); b2.active.find(v=>v.hero).name='Bravo'; store.set('hc-roster-rd',b2); store.set('hc-real-death',false); }")
    pg.reload(); pg.wait_for_timeout(500); pg.keyboard.press('Enter')
    r=J(pg,"()=>({ normal:store.get('hc-roster').active.find(v=>v.hero).name, rd:store.get('hc-roster-rd').active.find(v=>v.hero).name })")
    check('different names from before are aligned at start (the chosen campaign wins)', r=={'normal':'Alpha','rd':'Alpha'}, r)
    # a Real death save continues in the Real death campaign, even from the normal campaign screen
    r=J(pg,"""()=>{ setTrack(true); startMission(MISSIONS[1]); saveGame(); setTrack(false); goMenu('menu'); loadGame(); const G=__hc.G; return { rd:G.realDeath, track:ui.realDeath, rosterRd:ui.roster.rd, hero:heroOf()&&heroOf().name }; }""")
    check('Continue a Real death save: its own campaign and roster', r['rd'] and r['track'] and r['rosterRd'] and r['hero']=='Alpha', r)
    # reset the Real death campaign: the normal one stays, your soldier is back in Real death from zero
    J(pg,"()=>{ __hc.G=null; goMenu('campaign'); }"); pg.click('#btn-reset'); pg.click('#btn-reset'); pg.wait_for_timeout(150)
    r=J(pg,"()=>({ rd:Object.keys(ui.rdProgress.results).length, rdOthers:ui.roster.active.filter(v=>!v.hero).length, rdHero:heroOf()&&heroOf().name, rdHeroMissions:heroOf()&&heroOf().missions, normal:Object.keys(store.get('hc-progress').results).length, normalVets:store.get('hc-roster').active.length })")
    check('Reset campaign in Real death: only Real death goes; your soldier there from zero', r['rd']==0 and r['rdOthers']==0 and r['rdHero']=='Alpha' and r['rdHeroMissions']==0 and r['normal']==2 and r['normalVets']==3, r)
    b.close()
if errs: fails.append('page errors: '+'; '.join(errs[:3]))
print('ALL OK' if not fails else 'FAILED: '+', '.join(fails))
