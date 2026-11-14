# Your own soldier (Nov 2026): one name and sex for good, five careers (one per role), only the picked career goes,
# a mission where he falls does not count, never on the Cenotaph; an old roster migrates; his name in the Osprey crew in Braet's place.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  win=()=>{ const G=__hc.G; G.objectives.forEach(o=>o.state='done'); endGame(true,'test'); }, me=()=>__hc.G.ents.find(e=>!e.dead&&e.vet&&e.vet.hero); try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('enlist once, name fixed','''ui.roster=emptyRoster(); saveRoster(); ui.campSide='corps'; goMenu('campaign');
  ok(!!document.querySelector('#hero-name')&&/cannot be changed later/.test(document.getElementById('hero-card').textContent),'enlist form warns: for good');
  document.querySelector('#hero-name').value='Vonk'; document.querySelector('[data-hsex=f]').click(); document.querySelector('#hero-name').value='Vonk'; document.querySelector('[data-htype=medic]').click(); document.querySelector('#hero-name').value='Vonk'; document.querySelector('#hero-save').click();
  ok(selfOf()&&selfOf().name==='Vonk'&&selfOf().sex==='f','name and sex stored'); ok(heroOf()&&heroOf().type==='medic'&&heroOf().name==='Vonk','first career: Medic');
  ok(!document.querySelector('#hero-name')&&!document.querySelector('#hero-edit')&&document.querySelectorAll('[data-career]').length===5,'no name field and no Edit any more: five career buttons');
  ok(enlistSelf('Other','m','trooper')!==null&&selfOf().name==='Vonk','enlisting again is refused');
  document.querySelector('[data-career=pyro]').click(); ok(heroOf().type==='pyro'&&heroOf().name==='Vonk'&&heroOf().sex==='f'&&heroOf().rank===0,'pick Pyro: a new career, same name and sex');
  ok(ui.roster.active.filter(v=>v.hero).length===2,'two careers on the roster');
  const r2=loadRoster(); ok(r2.active.filter(v=>v.hero).every(v=>v.name==='Vonk'),'reload keeps both careers on the one name (no renaming)');'''),
('only the picked career goes','''pickCareer('pyro'); __hc.startMission(MISSIONS[0]); step(1); const hs=__hc.G.ents.filter(e=>!e.dead&&e.vet&&e.vet.hero);
  ok(hs.length===1&&hs[0].type==='pyro','one star in the field, the Pyro'); ok(!(__hc.G.reserve||[]).some(v=>v.hero),'the Medic career is not in reserve');
  win(); const p=careerOf('pyro'); ok(p.missions===1&&trophyProgress(p,'easy')===1,'Pyro career: 1 mission, run 1/'+MISSIONS.length); ok(trophyProgress(careerOf('medic'),'easy')===0,'Medic career untouched');'''),
('falling: the mission does not count','''pickCareer('pyro'); const before=JSON.stringify(careerOf('pyro')); __hc.startMission(MISSIONS[1]); step(1); const u=me(); u.vet.xp+=20; damage(u,1e6,null); kill(u,null); step(0.5); win();
  const p=careerOf('pyro'); ok(!!p&&JSON.stringify(p)===before,'the career is as before the mission (no mission, no XP, no run step)');
  ok(!ui.roster.fallen.some(v=>v.hero||v.name==='Vonk'),'not on the Cenotaph'); ok(__hc.G.rosterResult.heroDown==='Vonk','noted as down');
  showEnd(); ok(/does not count for the Pyro career/.test(document.getElementById('e-vets').textContent),'the end screen says so');
  __hc.startMission(MISSIONS[1]); step(1); win(); ok(trophyProgress(careerOf('pyro'),'easy')===2,'played again: it counts now');'''),
('a career that starts late can still run','''pickCareer('gunner'); __hc.startMission(MISSIONS[3]); step(1); win(); const g=careerOf('gunner'); ok(!(g.tp&&g.tp.void)&&trophyProgress(g,'easy')===0,'mission 4 first: no void, nothing counted');
  __hc.startMission(MISSIONS[0]); step(1); win(); ok(trophyProgress(careerOf('gunner'),'easy')===1,'then mission 1: the run starts');'''),
('trophy wall and resets','''goMenu('trophies'); const t=document.getElementById('trophy-wall').textContent; ok(/2 \\/ /.test(t)&&/1 \\/ /.test(t),'progress per career on the wall');
  ok(/five careers/.test(document.getElementById('troph-lede').textContent),'the lede explains careers');
  document.getElementById('btn-reset-vets').click(); document.getElementById('btn-reset-vets').click(); ok(selfOf()&&selfOf().name==='Vonk'&&careerOf('pyro'),'Reset veterans keeps your soldier and careers');'''),
('old roster migrates','''ui.roster={ active:[{ id:'hero-x', name:'Oldhand', type:'engineer', sex:'m', rank:2, xp:20, kills:3, missions:3, hero:true, tp:{easy:['dust-landing'],void:true} },{ id:'v1', name:'Peeters', type:'trooper', rank:1, xp:8, kills:1, missions:1 }], fallen:[] }; saveRoster(); ui.roster=loadRoster();
  ok(selfOf()&&selfOf().name==='Oldhand'&&ui.roster.career==='engineer','the old hero becomes your name and first career'); ok(!heroOf().tp.void&&trophyProgress(heroOf(),'easy')===1,'void cleared, progress kept');'''),
('in the Osprey crew','''ui.roster.self={ name:'Vonk', sex:'f' }; resetRogue(); const R=rogueStore(), v=R.crew.find(x=>x.id==='osp-self');
  ok(v&&v.name==='Vonk'&&v.sex==='f'&&v.type==='trooper'&&v.rank===0,'your soldier in Braet\\'s place: Trooper, Braet\\'s rank'); ok(!R.crew.some(x=>x.name==='Braet')&&R.crew.length===7,'no Braet, still seven');
  ok(R.crew[0].capt&&R.crew[0].name==='Kerckhoffs','Kerckhoffs still leads'); ok(!ospreyLost().some(o=>/Vonk|Braet/.test(o.title)),'not on the Osprey stone');
  ok(/she was the one hunting/.test(crewText(v,crewDef(v.id).bio)),'bio follows her sex');
  store.set('hc-rogue',{crew:[{id:'osp-braet',name:'Braet',type:'trooper',rank:1,xp:7,strains:['drone'],taint:10}]}); ui.rogue=null; const w=rogueStore().crew.find(x=>x.id==='osp-self'); ok(w&&w.name==='Vonk'&&w.rank===1&&w.strains.includes('drone'),'an old save: Braet\\'s rank and strains carry over');
  ui.campSide='rogue'; goMenu('campaign'); ok(/Vonk/.test(document.getElementById('hero-card').textContent),'the splice lab shows the name');
  __hc.startMission(ROGUE_MISSIONS[0]); step(1); ok(__hc.G.ents.some(e=>!e.dead&&e.crew&&e.vet.name==='Vonk'),'she takes the field in a job');''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ localStorage.clear(); for(const m of MISSIONS) recordWin(m.id,'normal',500,false); }")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
