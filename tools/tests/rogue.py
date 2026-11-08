# Rogue Strain (the Osprey crew): unlock, splice lab, DNA, taint, feral, stabilizer, strains, the loyal Corps, all six jobs, save, trophies.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  crew=()=>__hc.G.ents.filter(e=>!e.dead&&e.crew), tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.invuln=true; },
  start=i=>{ __hc.startMission(ROGUE_MISSIONS[i]); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('unlock and splice lab','''resetRogue(); delete ui.progress.results['hollow-colony']; ui.campSide='rogue'; goMenu('campaign'); ok(ui.campSide==='corps'&&document.querySelector('[data-side=rogue]').hidden,'locked until Corps mission 4 is won');
  recordWin('hollow-colony','normal',500,false); goMenu('campaign'); ok(!document.querySelector('[data-side=rogue]').hidden,'unlocked after The Hollow Colony');
  ui.campSide='rogue'; goMenu('campaign'); ok(document.querySelectorAll('.crow').length===7,'seven crew in the splice lab'); ok(/Rogue Strain/.test(document.getElementById('camp-title').textContent),'campaign title');
  const R=rogueStore(); ok(R.crew.find(v=>v.capt).rank===5,'Haesaert is the Captain'); ok(splice('osp-braet','drone')!==null,'no samples: no splice');
  R.dna.drone=3; ok(splice('osp-braet','drone')===null&&R.crew.find(v=>v.id==='osp-braet').taint===10&&R.dna.drone===0,'splice: strain in, taint up, samples spent');
  ok(splice('osp-braet','drone')!==null,'a strain only once'); R.crew[2].taint=90; R.dna.hive=3; ok(/taint/.test(splice(R.crew[2].id,'hive')||''),'no splice past '+SPLICE_MAX);
  R.stab=1; ok(stabilizeCrew(R.crew[2].id)===null&&R.crew[2].taint===55&&R.stab===0,'a dose in the lab: -35'); resetRogue();'''),
('osprey down: freezer, samples, escape, settle','''resetRogue(); const G=start(0); step(1); ok(crew().length===7,'the crew is on the field'); ok(crew().every(u=>u.hp<u.maxHp),'everyone hurt from the crash');
  calm(); const eng=crew().find(u=>u.def.builder); tp(eng,53,9); step(13); ok(G.objectives.find(o=>o.id==='freezer').state==='done','the Engineer cracks the freezer');
  const vials=G.ents.filter(e=>!e.dead&&e.rogue&&e.dna==='hive'); ok(vials.length+(G.rogue.dna.hive||0)===2,'two hive samples in the freezer'); for(const v of vials){ tp(eng,Math.floor(v.x/TILE),Math.floor(v.y/TILE)); step(0.3); }
  ok(G.rogue.dna.hive===2,'picked up'); step(7); ok(G.timer&&G.timer.label==='Dust lands','the radio: Dust is coming');
  G.rogue.dna.drone=4; step(1); ok(G.objectives.find(o=>o.id==='escape'),'six samples: the way out opens');
  const st=G.rogue.stab; const ex=G.ents.find(e=>e.exit), sp=exitSpot(ex); for(const u of crew()) tp(u,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); step(1); ok(G.over&&G.over.win,'into the tunnel: won');
  const R=rogueStore(); ok(R.dna.hive===2&&R.dna.drone===4,'samples in the lab'); ok(R.crew.every(v=>v.missions===1),'one job for everyone'); ok(R.stab===st,'unused doses are kept ('+R.stab+')');
  ok(/Samples/.test(rogueEndHtml()),'end screen shows the samples');'''),
('dna drops, fire, harvest','''resetRogue(); const G=start(2); step(1); calm(); const tr=crew().find(u=>u.type==='trooper'&&!u.vet.capt), py=crew().find(u=>u.type==='pyro'); const keep=ROGUE.dna.drone; ROGUE.dna.drone=1;
  const d1=makeUnit('drone','swarm',tr.x+40,tr.y); kill(d1,tr); ok(G.ents.some(e=>!e.dead&&e.rogue&&e.dna==='drone'),'a drone shot dead leaves a sample');
  const n=G.ents.filter(e=>e.rogue&&e.dna).length; const d2=makeUnit('drone','swarm',tr.x+40,tr.y); kill(d2,py); ok(G.ents.filter(e=>e.rogue&&e.dna).length===n,'a drone burnt leaves nothing'); ROGUE.dna.drone=keep;
  const hs=hives(); hs[0].invuln=false; kill(hs[0],tr); ok(G.rogue.harvested===1&&G.ents.filter(e=>!e.dead&&e.rogue&&e.dna==='hive').length===ROGUE.dna.hive,'a hive shot dead is harvested');
  hs[1].invuln=false; kill(hs[1],py); ok(G.rogue.burnt===1&&G.rogue.harvested===1,'a hive burnt is not');
  const loy=G.ents.find(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'); loy.invuln=false; const xp=tr.vet.xp; kill(loy,tr); ok(tr.vet.xp===xp+ROGUE.loyal.xp,'a loyal kill gives XP'); ok(G.ents.some(e=>e.kind==='body'&&Math.hypot(e.x-loy.x,e.y-loy.y)<2),'and leaves a body for the Swarm');'''),
('taint: seizure, feral, stabilizer','''resetRogue(); const G=start(0); step(1); calm(); const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt), m=crew().find(x=>x.def.heal); u.invuln=true; m.invuln=true;
  u.vet.taint=90; let seized=false; for(let i=0;i<60&&!seized;i++){ step(1); if(u.stunT>0) seized=true; } ok(seized,'seizures above '+ROGUE.taint.seizure);
  u.vet.taint=100; step(0.2); ok(u.feral>0&&G.rogue.feral===1,'feral at 100'); selectEntities([u],false); ok(myUnits().length===0,'a feral one takes no orders');
  step(ROGUE.taint.feralTime+0.5); ok(!(u.feral>0)&&Math.round(u.vet.taint)===ROGUE.taint.after,'the fit ends: he collapses, taint '+ROGUE.taint.after);
  u.vet.taint=100; step(0.2); ok(u.feral>0,'feral again'); tp(m,Math.floor(u.x/TILE)+1,Math.floor(u.y/TILE)); selectEntities([m],false); const s=G.rogue.stab; rogueStabilize(); ok(!(u.feral>0)&&u.vet.taint<=65&&G.rogue.stab===s-1,'the Medic doses him: back to his senses');
  ok(cmdButtons().some(c=>c.key==='J'),'the Medic has the J button');'''),
('strains on the field','''resetRogue(); const R=rogueStore(); const v=R.crew.find(x=>x.id==='osp-braet'); v.strains=['brute','drone','husk','hive','crawler']; v.taint=20; saveRogue();
  const G=start(0); step(1); calm(); const u=crew().find(x=>x.vet.id==='osp-braet'), w=crew().find(x=>x.vet.id==='osp-vanwesemael');
  ok(Math.abs(u.armor-0.2)<1e-6&&u.maxHp>w.maxHp,'Chitin: armour and health'); ok(speedOf(u)>speedOf(w)*1.15,'Swift and Night Eyes: faster'); ok(u.sightAdd===2,'Night Eyes: +2 sight');
  u.hp=10; u.hitAt=-99; step(2); ok(u.hp>10,'Knitting Flesh heals'); ok(rogueHuntSkip(u)&&!rogueHuntSkip(w),'Hive Scent: the hunt passes him by');
  gainXP(u,10); ok(u.vet.rank>0&&Math.abs(u.armor-0.2)<1e-6,'a promotion keeps the strains'); w.vet.taint=50; ok(feverOf(w)>1.09,'fever: taint adds damage');'''),
('fallen crew comes back tainted','''resetRogue(); const G=start(0); step(1); calm(); const u=crew().find(x=>x.vet.id==='osp-braet'); u.vet.taint=30; damage(u,1e6,null); kill(u,null); step(1); ok(u.dead,'Braet is dead');
  G.objectives.forEach(o=>o.state='done'); endGame(true,'test'); const v=rogueStore().crew.find(x=>x.id==='osp-braet'); ok(v.taint===30+ROGUE.taint.fallen,'back with +'+ROGUE.taint.fallen+' taint ('+v.taint+')'); ok(G.rogueResult.back.includes('Braet'),'the end screen says so');'''),
('dead air: alarm, towers, caches, escape','''resetRogue(); const G=start(1); step(1); ok(G.vars.relays.length===2,'two relay towers'); ok(G.vars.caches.length===3,'three caches');
  for(const e of G.ents) if(e.faction==='swarm') e.invuln=true; const u=crew()[1]; tp(u,40,36); u.invuln=true; step(3); ok(G.vars.alarm&&G.timer&&G.timer.label==='Call to Tycho','seen: the towers start calling'); ok(G.objectives.find(o=>o.id==='quiet').state==='failed','not quiet any more');
  for(const r of G.vars.relays){ r.invuln=false; kill(r,u); } step(1); ok(G.objectives.find(o=>o.id==='towers').state==='done'&&!G.timer,'both towers down: dead air');
  for(const e of G.ents) if(e.faction==='loyal') e.dead=true; for(const c of G.vars.caches){ tp(u,Math.floor(c.x/TILE),Math.floor(c.y/TILE)); step(0.3); } step(1); ok(G.objectives.find(o=>o.id==='caches').state==='done','three caches taken');
  ok(G.rogue.stab>=2,'a cache held stabilizer'); { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'out through the east shaft: won');'''),
('dead air: the call gets through','''resetRogue(); const G=start(1); step(1); for(const e of G.ents) if(e.faction==='swarm') e.invuln=true; const u=crew()[1]; tp(u,40,36); u.invuln=true; step(3);
  G.timer.end=G.time+0.3; step(1); ok(G.vars.called,'the call went through'); const n=G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.hunter).length; step(21); ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.hunter).length>n,'Kestrel brings hunters');'''),
('cold harvest: lights, harvest, escape','''resetRogue(); const G=start(2); step(1.5); ok(G.vars.gens.length===5&&G.vars.gens.every(g=>g.powered),'five lit generators of the Corps');
  const u=crew()[0]; u.invuln=true; tp(u,Math.floor(G.vars.gens[0].x/TILE)+2,Math.floor(G.vars.gens[0].y/TILE)+2); step(1); ok(G.objectives.find(o=>o.id==='dark').state==='failed','walk into the light: seen');
  for(const e of G.ents) if(e.faction==='loyal') e.dead=true; calm(); const tr=crew().find(x=>x.type==='trooper'); for(const h of hives().slice(0,3)){ h.invuln=false; kill(h,tr); } step(1);
  ok(G.objectives.find(o=>o.id==='harvest').state==='done','three hives harvested'); { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'down the shaft: won'); ok(rogueStore().dna.hive===3*ROGUE.dna.hive||true,'samples');'''),
('cold harvest: burnt too many','''resetRogue(); const G=start(2); step(1.5); calm(); const py=crew().find(x=>x.type==='pyro'); for(const h of hives().slice(0,2)){ h.invuln=false; kill(h,py); } step(1); ok(G.over&&!G.over.win,'burn two of four: nothing left to harvest');'''),
('the fever','''resetRogue(); const G=start(3); step(1); const p=G.vars.pt; ok(p&&p.vet.taint>=72,'one of the crew is burning up: '+(p&&p.vet.name)); const t0=p.vet.taint; step(10); ok(p.vet.taint>t0+3||p.feral>0,'the fever climbs');
  ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.sweep).length===6,'a sweep team in the east'); step(20); ok(G.vars.sw&&G.vars.sw.k==='d','they march on the first hive'); const h0=hives().find(h=>dist(h,G.api.where('d'))<2*TILE); ok(Math.hypot(G.vars.sw.x-h0.x,G.vars.sw.y-h0.y)>6*TILE,'and stop well short of it');
  calm(); for(const e of G.ents) if(e.crew) e.invuln=true; const h=hives()[0]; tp(p,Math.floor(h.x/TILE)+2,Math.floor(h.y/TILE)+2); for(let i=0;i<24&&!G.vars.cured;i++){ tp(p,Math.floor(h.x/TILE)+2,Math.floor(h.y/TILE)+2); step(1); }
  ok(G.objectives.find(o=>o.id==='calm').state==='done'&&p.vet.taint<=43,'twenty seconds at a hive: the fever breaks'); { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'into the south shaft: won');'''),
('hunted: Kessler, the call, the Magpie','''resetRogue(); const G=start(4); step(14); const k=G.vars.kessler; ok(k&&k.faction==='loyal'&&k.maxHp>UNITS.trooper.hp*2,'Kessler lands, tough'); ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.hunter).length>=5,'his squad hunts');
  k.hp=k.maxHp*0.25; step(1); ok(G.vars.kOut&&k.invuln,'badly hurt: he pulls back'); step(21); ok(G.objectives.find(o=>o.id==='kessler').state==='done','he walked away: optional done');
  for(const e of G.ents) if(e.faction==='loyal'||e.faction==='swarm') e.dead=true; const up=G.ents.find(e=>e.def&&e.def.capture&&e.point==='3'); for(const x of crew()){ tp(x,44,31); x.invuln=true; } step(22);
  ok(G.objectives.find(o=>o.id==='call').state==='done'&&G.timer&&G.timer.label==='Magpie','beacon taken: the Magpie is coming'); G.timer.end=G.time+0.3; step(2); ok(G.over&&G.over.win,'aboard: won');'''),
('mothers blood: the membrane knows its own, ascension','''resetRogue(); const G=start(5); step(1); calm(); const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt); u.vet.taint=65; u.invuln=true; tp(u,61,13); for(let i=0;i<8&&!G.vars.open;i++){ tp(u,61,13); step(1); }
  ok(G.vars.open&&!G.ents.some(e=>!e.dead&&e.type==='membrane'&&e.tag==='lair'),'60+ taint at the membrane: it opens'); const m=G.vars.mother; m.invuln=false; ok(m.maxHp<UNITS.broodmother.hp*0.5,'the Mother is weaker for seven'); damage(m,1e8,u); step(1);
  ok(G.vars.heart&&G.timer&&G.timer.label==='Dust in the Maw','her heart beats; Dust is coming'); const h=G.vars.heart; const c=crew().find(x=>x.vet.capt); c.invuln=true; for(let i=0;i<10&&!G.over;i++){ tp(c,Math.floor(h.x/TILE),Math.floor(h.y/TILE)); step(1); }
  ok(G.over&&G.over.win&&rogueStore().ending==='ascend','Ascension'); ok(rogueStore().crew.every(v=>v.strains.includes('mother')),'the Mother strain in all of them');'''),
('mothers blood: ashes and the trophies','''resetRogue(); for(const m of ROGUE_MISSIONS) recordWin(m.id,'normal',100,false); const T=trophies(); for(const t of ROGUE_TROPHIES) delete T[t.id]; store.set('hc-trophies',T);
  const G=start(5); step(1); calm(); for(const h of hives()){ h.invuln=false; kill(h,null); } step(1); ok(G.vars.open,'three chambers gone: the lair opens');
  const m=G.vars.mother; m.invuln=false; damage(m,1e8,null); step(1); const py=crew().find(x=>x.type==='pyro'); py.invuln=true; const h=G.vars.heart; for(let i=0;i<9&&!G.over;i++){ tp(py,Math.floor(h.x/TILE)+1,Math.floor(h.y/TILE)); step(1); }
  ok(G.over&&G.over.win&&rogueStore().ending==='ashes','Ashes'); const W=trophies(); ok(W['rogue:ashes']&&W['rogue:done']&&W['rogue:cold'],'trophies: Ashes, Ghost Crew, Cold Blood'); ok(!W['rogue:ascend'],'not Ascension');
  goMenu('trophies'); ok(document.querySelectorAll('.plaque.rogue').length===5,'a Rogue row on the Trophy wall');'''),
('mothers blood: Dust gets there first','''resetRogue(); const G=start(5); step(1); calm(); const m=G.vars.mother; m.invuln=false; for(const h of hives()){ h.invuln=false; kill(h,null); } step(1); damage(m,1e8,null); step(1); G.timer.end=G.time+0.3; step(1); ok(G.over&&!G.over.win,'no choice in time: lost');'''),
('save and load a job','''resetRogue(); const G=start(0); step(2); const u=crew()[3]; u.vet.taint=44; G.rogue.dna.drone=2; ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; step(0.5);
  ok(G2.mission.rogue&&G2.ents.filter(e=>!e.dead&&e.crew).length===7,'the crew is back'); ok(G2.ents.some(e=>e.crew&&Math.round(e.vet.taint)===44),'taint kept'); ok(G2.rogue.dna.drone===2,'samples kept'); ok(typeof G2.api.loyal==='function','the Rogue mission API is there'); localStorage.removeItem('hc-save');'''),
('exit shaft, shaft heirs, advisors','''resetRogue(); const G=start(0); step(1); calm(); const ex=G.ents.find(e=>e.exit); ok(ex&&ex.faction==='none'&&!shafts().includes(ex),'the south tunnel is a way out, not a Swarm shaft'); ok(G.swarm.cfg.shaftHeirs&&shafts().length===2,'the other two shafts are heirs');
  const u=crew()[2]; selectEntities([u],false); smartCommand(ex.x,ex.y); ok(u.order&&Math.hypot(u.order.x-exitSpot(ex).x,u.order.y-exitSpot(ex).y)<TILE*1.5,'right-click the tunnel: he walks to it');
  tp(u,Math.floor(exitSpot(ex).x/TILE),Math.floor(exitSpot(ex).y/TILE)); step(0.5); ok(!u.dead,'shut before the job is done');
  G.vars.fzDone=true; G.api.openExit(); step(0.5); ok(u.dead&&G.rogue.out.length===1,'open: he goes in'); for(const x of crew()) x.dead=true; step(0.5); ok(!G.over||G.over.win,'no defeat while someone got out');
  const hs=hives(); for(const h of hs){ h.invuln=false; kill(h,null); } step(1); ok(shafts().every(s=>s.heir),'hives gone: the shafts take over');
  say('Dr. Maas','test line'); ok(G.msgs.some(m=>m.who==='Devreese'&&m.text==='test line'),'Maas\\'s engine warnings come from Devreese');'''),
('feral comes back to the squad','''resetRogue(); const G=start(0); step(1); calm(); for(const x of crew()) x.invuln=true; selectEntities(crew(),false); setFormation('line'); step(3);
  const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt), f=u.formation; ok(!!f,'in a formation'); u.vet.taint=100; step(0.2); ok(u.feral>0&&!u.formation,'feral: out of the line');
  step(ROGUE.taint.feralTime+ROGUE.taint.collapse+6); const p=formationSpot(u); ok(u.formation===f,'back in his formation'); ok(p&&Math.hypot(u.x-p.x,u.y-p.y)<TILE*1.5,'and back in his place');
  const w=crew().find(x=>x.type==='gunner'); w.formation=null; w.slot=null; w.vet.taint=100; step(0.2); tp(w,Math.floor(w.x/TILE)+0,Math.floor(w.y/TILE)); step(ROGUE.taint.feralTime+ROGUE.taint.collapse+8); const m=nearestOf(w,e=>e!==w&&e.crew&&!e.dead); ok(dist(w,m)<3*TILE,'no formation: he walks back to the crew');'''),
('intel tab','''goMenu('intel'); ok([...document.querySelectorAll('[data-itab]')].some(b=>b.dataset.itab==='rogue'),'Rogue Strain tab'); intelTab='rogue'; buildIntel(); ok(document.querySelectorAll('#intel-list .ili').length===7+6+ROGUE_INTEL.length,'crew, strains, rules'); ok(/Haesaert/.test(document.getElementById('intel-grid').innerHTML),'first card: the Captain'); goMenu('menu');'''),
('the crew sounds different','''resetRogue(); const G=start(0); step(1); calm(); const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt), d=crew().find(x=>x.vet.id==='osp-devreese');
  G.barkNext=0; bark(u,'move'); ok(G.barks.some(b=>b.u===u&&ROGUE_VOICE.move.includes(b.text)),'a crew line, not a Corps line');
  u.vet.taint=0; const t0=crewTone(u,false); u.vet.taint=100; const t1=crewTone(u,false); ok(t1.pitch<t0.pitch*0.6&&t1.rate<t0.rate,'the taint drags the voice down');
  ok(crewTone(d,false).pitch>t0.pitch,'Devreese higher than the men'); u.vet.taint=100; step(0.2); ok(u.feral>0&&crewVoicePool(u,'select')===ROGUE_VOICE.feral&&crewTone(u,false).pitch===ROGUE_VOICE_TONE.feralPitch,'feral: only growls');
  const l=makeUnit('trooper','loyal',u.x+60,u.y); G.lastFight=-99; G.barkNext=0; const w=crew().find(x=>x.type==='gunner'); fire(w,l); ok(G.barks.some(b=>b.u===w&&ROGUE_VOICE.loyal.includes(b.text)),'first shots at the Corps: a loyal line');'''),
('osprey down: no Engineer, no job; sorry after a fit','''resetRogue(); const G=start(0); step(1); calm(); const e=crew().find(u=>u.def.builder); damage(e,1e6,null); step(1); ok(!G.over,'Engineer down: not over yet, a Medic can still help'); kill(e,null); step(1); ok(G.over&&!G.over.win&&/Cnudde/.test(G.over.text),'Engineer dead before the freezer: lost');
  resetRogue(); const G2=start(0); step(1); calm(); const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt); u.invuln=true; u.vet.taint=100; step(0.2); G2.barks=[]; step(ROGUE.taint.feralTime+ROGUE.taint.collapse+1.5); ok(G2.barks.some(b=>b.u===u&&ROGUE_VOICE.sorry.includes(b.text)),'back on his feet: sorry about that');'''),
('corps campaign untouched','''resetRogue(); __hc.startMission(MISSIONS[0]); const G=__hc.G; step(2); ok(!G.rogue&&!G.ents.some(e=>e.crew),'no crew in a Corps mission'); ok(document.getElementById('r-dna-wrap').hidden,'no DNA counter');''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>recordWin('hollow-colony','normal',500,false)")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
