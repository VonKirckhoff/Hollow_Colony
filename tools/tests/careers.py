# Your own soldier (Nov 2026): one name and sex for good, always a Trooper (Corps and Osprey crew), a mission where he falls does not count,
# never on the Cenotaph, one trophy row; old rosters with careers migrate; his name in the Osprey crew in Braet's place; no Corps mission before you enlisted.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  win=()=>{ const G=__hc.G; G.objectives.forEach(o=>o.state='done'); endGame(true,'test'); }, me=()=>__hc.G.ents.find(e=>!e.dead&&e.vet&&e.vet.hero); try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('enlist once, always a Trooper','''ui.roster=emptyRoster(); saveRoster(); ui.campSide='corps'; goMenu('campaign');
  const card=()=>document.getElementById('hero-card');
  ok(!!document.querySelector('#hero-name')&&/cannot be changed later/.test(card().textContent)&&/is a Trooper/.test(card().textContent),'enlist form: for good, a Trooper');
  ok(!document.querySelector('[data-htype]')&&!document.querySelector('[data-career]'),'no role to pick');
  document.querySelector('[data-hsex=f]').click(); document.querySelector('#hero-name').value='Vonk'; document.querySelector('#hero-save').click();
  ok(selfOf()&&selfOf().name==='Vonk'&&selfOf().sex==='f','name and sex stored'); ok(heroOf()&&heroOf().type==='trooper'&&heroOf().name==='Vonk'&&heroOf().rank===0,'a Trooper, Private');
  ok(!document.querySelector('#hero-name')&&/Trooper/.test(card().textContent)&&!document.querySelector('[data-career]'),'card: name, Trooper, no buttons');
  ok(enlistSelf('Other','m')!==null&&selfOf().name==='Vonk','enlisting again is refused'); ok(enlistSelf.length<=2,'enlist takes no role');
  ok(ui.roster.active.filter(v=>v.hero).length===1,'one record on the roster');'''),
('he goes, as a Trooper','''__hc.startMission(MISSIONS[0]); step(1); const hs=__hc.G.ents.filter(e=>!e.dead&&e.vet&&e.vet.hero);
  ok(hs.length===1&&hs[0].type==='trooper','one star in the field, a Trooper'); win(); ok(heroOf().missions===1&&trophyProgress(heroOf(),'easy')===1,'1 mission, run 1/'+MISSIONS.length);'''),
('falling: the mission does not count','''const before=JSON.stringify(heroOf()); __hc.startMission(MISSIONS[1]); step(1); const u=me(); u.vet.xp+=20; damage(u,1e6,null); kill(u,null); step(0.5); win();
  ok(JSON.stringify(heroOf())===before,'as before the mission (no mission, no XP, no run step)');
  ok(!ui.roster.fallen.some(v=>v.hero||v.name==='Vonk'),'not on the Cenotaph'); ok(__hc.G.rosterResult.heroDown==='Vonk','noted as down');
  showEnd(); ok(/does not count for the trophy run/.test(document.getElementById('e-vets').textContent),'the end screen says so');
  __hc.startMission(MISSIONS[1]); step(1); win(); ok(trophyProgress(heroOf(),'easy')===2,'played again: it counts now');'''),
('trophy wall and resets','''goMenu('trophies'); const rows=[...document.querySelectorAll('#trophy-wall .trow')].filter(r=>!r.classList.contains('thead'));
  ok(rows.length===2&&/Your soldier/.test(rows[0].textContent)&&/Flawless/.test(rows[1].textContent),'two rows: your soldier and Flawless');
  ok(/2 \/ /.test(rows[0].textContent),'his run on the wall'); ok(!/Gunner|Pyro|Medic|Engineer/.test(document.getElementById('trophy-wall').textContent),'no other roles');
  ok(/for your own soldier \(a Trooper\)/.test(document.getElementById('troph-lede').textContent),'the lede'); ok(grandStatus().corps.need===6,'Hollow Light needs 6 trophies');
  document.getElementById('btn-reset-vets').click(); document.getElementById('btn-reset-vets').click(); ok(selfOf()&&heroOf()&&heroOf().missions===2,'Reset veterans keeps your soldier');'''),
('old rosters migrate','''ui.roster={ self:{name:'Oldhand',sex:'m'}, career:'pyro', active:[
    { id:'hero-p', name:'Oldhand', type:'pyro', sex:'m', rank:2, xp:20, kills:3, missions:3, hero:true, tp:{easy:['dust-landing','hold-kappa']}, won:['dust-landing','hold-kappa','burn-the-brood'] },
    { id:'hero-m', name:'Oldhand', type:'medic', sex:'m', rank:1, xp:5, kills:0, missions:1, hero:true, won:['dust-landing'] },
    { id:'v1', name:'Peeters', type:'trooper', rank:1, xp:8, kills:1, missions:1 }], fallen:[], finished:['pyro'] }; saveRoster(); ui.roster=loadRoster();
  const h=ui.roster.active.filter(v=>v.hero); ok(h.length===1&&h[0].id==='hero-p'&&h[0].type==='trooper'&&h[0].rank===2&&trophyProgress(h[0],'easy')===2,'no Trooper career: the one with most wins becomes the Trooper, rank and run kept');
  ok(!('finished' in ui.roster)&&ui.roster.career==='trooper','old fields gone');
  ui.roster={ self:{name:'Oldhand',sex:'m'}, career:'pyro', active:[{ id:'hero-p', name:'Oldhand', type:'pyro', hero:true, rank:2, missions:5, won:['a','b','c'] },{ id:'hero-t', name:'Oldhand', type:'trooper', hero:true, rank:1, missions:1, won:['a'] }], fallen:[] }; saveRoster(); ui.roster=loadRoster();
  ok(ui.roster.active.filter(v=>v.hero).map(v=>v.id).join()==='hero-t','a Trooper career stays, the rest goes');
  ui.roster={ active:[{ id:'hero-x', name:'Veryold', type:'engineer', sex:'f', rank:1, missions:2, hero:true, tp:{easy:['dust-landing'],void:true} }], fallen:[] }; saveRoster(); ui.roster=loadRoster();
  ok(selfOf()&&selfOf().name==='Veryold'&&heroOf().type==='trooper'&&!heroOf().tp.void&&trophyProgress(heroOf(),'easy')===1,'the oldest roster: hero becomes your Trooper');'''),
('in the Osprey crew','''ui.roster=emptyRoster(); enlistSelf('Vonk','f'); store.set('hc-rogue',{crew:[{id:'osp-braet',name:'Braet',type:'trooper',rank:1,xp:7,strains:['drone'],taint:10}],selfRole:'medic'}); ui.rogue=null;
  const R=rogueStore(), v=R.crew.find(x=>x.id==='osp-self'); ok(v&&v.name==='Vonk'&&v.type==='trooper'&&v.rank===1&&v.strains.includes('drone')&&!('selfRole' in R),'an old save: Trooper, Braet\\'s rank and strains, no role pick left');
  resetRogue(); const w=rogueStore().crew.find(x=>x.id==='osp-self'); ok(w.type==='trooper'&&w.rank===0&&w.sex==='f','a new crew: Trooper at Private');
  ok(rogueStore().crew[0].capt&&rogueStore().crew[0].name==='Kerckhoffs'&&rogueStore().crew.length===7,'Kerckhoffs leads, seven'); ok(!ospreyLost().some(o=>/Vonk|Braet/.test(o.title)),'not on the Osprey stone');
  ui.campSide='rogue'; goMenu('campaign'); document.querySelector('[data-crew="osp-self"]').click(); ok(!document.querySelector('[data-selfrole]')&&/Vonk/.test(document.getElementById('hero-card').textContent),'splice lab: the name, no role buttons');
  __hc.startMission(ROGUE_MISSIONS[0]); step(1); ok(__hc.G.ents.some(e=>!e.dead&&e.crew&&e.vet.name==='Vonk'&&e.type==='trooper'),'she takes the field as a Trooper');'''),
('enlist before the campaign','''localStorage.removeItem('hc-roster'); ui.roster=emptyRoster(); ui.campSide='corps'; goMenu('campaign');
  document.querySelector('#mission-list [data-mission="0"]').click(); ok(document.getElementById('s-brief').hidden,'no soldier: mission 1 does not open');
  ok(document.activeElement&&document.activeElement.id==='hero-name','the name field gets the focus');
  document.querySelector('#mission-list [data-mission="-1"]').click(); ok(!document.getElementById('s-brief').hidden,'the training still opens'); goMenu('campaign');
  enlistSelf('Vonk','f'); document.querySelector('#mission-list [data-mission="0"]').click(); ok(!document.getElementById('s-brief').hidden,'enlisted: mission 1 opens');''')
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
