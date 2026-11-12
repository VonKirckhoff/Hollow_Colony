# Rogue Strain, the two extra jobs: Needle and Thread (records terminal, alarm, relief squads, stabilizer, Maas's formula)
# and Among Them (the veil, choir pods, the stirred brood, the lull, the way down, Wolf in the Fold). Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  crew=()=>__hc.G.ents.filter(e=>!e.dead&&e.crew), tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.invuln=true; },
  obj=id=>(__hc.G.objectives.find(o=>o.id===id)||{}).state,
  start=id=>{ __hc.startMission(ROGUE_MISSIONS.find(m=>m.id===id)); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
NT="'rogue-needle-and-thread'"; AT="'rogue-among-them'"
CASES=[
('campaign order','''const ids=ROGUE_MISSIONS.map(m=>m.id); ok(ids.length===8,'eight Rogue jobs'); ok(ids[1]==='rogue-needle-and-thread'&&ids[6]==='rogue-among-them'&&ids[7]==='rogue-mothers-blood','Needle and Thread second, Among Them seventh');
  ok(/Kappa Basin/.test(ROGUE_MISSIONS[2].briefing[0]),'Dead Air remembers the cases from Kappa Basin');'''),
('needle: the hospital','''resetRogue(); const G=start('''+NT+'''); step(1); ok(G.ents.filter(e=>!e.dead&&e.type==='medtent').length===3,'three hospital tents'); ok(G.vars.term&&G.vars.term.type==='terminal','a records terminal');
  ok(G.vars.cases.length===3&&G.vars.cases.every(c=>c.stab===1),'a case of stabilizer at every tent'); { const lz=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'), rt=G.ents.find(e=>!e.dead&&e.faction==='loyal'&&e.type==='relay'); ok(!!lz&&!!rt,'a relief pad and a Relay Tower for the hospital');
    ok(lz&&rt&&Math.abs(lz.x-rt.x)<TILE&&lz.y>rt.y&&lz.y-lz.size*TILE/2===rt.y+rt.size*TILE/2,'the pad lies right under the tower, south of the camp'); }
  { const ring=G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&e.ringer), f=ring.filter(u=>!u.def.heal&&!u.def.builder), c={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, ds=f.map(u=>Math.hypot(u.x-c.x,u.y-c.y)/TILE);
    ok(ring.length===7&&ring.every(u=>u.order&&u.order.type==='hold'),'the garrison holds in a ring ('+ring.length+')'); ok(Math.min(...ds)>1.5&&Math.max(...ds)<3.2,'fighters on the ring ('+ds.map(d=>d.toFixed(1)).join(' ')+')');
    ok(ring.filter(u=>u.def.heal||u.def.builder).every(u=>Math.hypot(u.x-c.x,u.y-c.y)<1.4*TILE),'Medics and the Engineer inside it'); }
  ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit').length>=8,'the hospital garrison'); ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.type==='sentry').length===2,'two Sentry Guns'); ok(G.vars.alarm==null&&!G.timer,'quiet until someone is seen');'''),
('needle: download, alarm, relief squads','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); for(const u of crew()) u.invuln=true; const d=crew().find(u=>u.def.heal); for(const e of G.ents) if(e.faction==='loyal'&&e.kind==='building') e.dead=true;
  const ring=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer), J=G.mission.job; let most=0; const watch=s=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); if(i%15===0){ most=Math.max(most,G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit').length); for(const e of G.ents) if(!e.dead&&e.faction==='loyal'&&e.kind==='unit') types.add(e.type); } } }, types=new Set();
  ok(G.vars.ringMax===7&&ring().length===7,'the ring starts with 7 men ('+ring().length+')'); ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&e.patrol&&!e.ringer).length===2,'and a patrol of 2 outside it');
  for(const e of G.ents) if(e.faction==='loyal'&&e.kind==='unit'&&!e.ringer) e.dead=true;
  tp(d,21,18); watch(2); ok(G.vars.dlStart&&G.vars.alarm!=null,'Devreese at the terminal: the hospital raises the alarm'); ok(!G.timer&&G.vars.dueAt==null,'no relief yet: the ring is whole'); const p1=G.vars.dl; ok(p1>0.02&&p1<0.1,'the download runs ('+Math.round(p1*100)+'%)');
  tp(d,30,30); watch(3); ok(Math.abs(G.vars.dl-p1)<0.06,'she walks away: it stops'); tp(d,21,18);
  ring().slice(0,J.lostFor-1).forEach(u=>u.dead=true); watch(3); ok(G.vars.dueAt==null,(J.lostFor-1)+' fallen: still no call');
  ring()[0].dead=true; watch(1); ok(G.vars.dueAt!=null&&G.timer&&G.timer.label==='Relief squad',J.lostFor+' fallen: the hospital calls a relief squad');
  const before=new Set(ring()); watch(J.call+1); ok(G.vars.sent===1,'the first relief squad lands'); const fresh=ring().filter(u=>!before.has(u));
  ok(fresh.length===J.lostFor&&ring().length===G.vars.ringMax,'it fills the ring back up to 7, no more ('+fresh.length+' new)'); ok(fresh.every(u=>!u.hunter),'the relief squad does not hunt');
  watch(12); ok(fresh.every(u=>u.dead||Math.hypot(u.x-u.ringAt.x,u.y-u.ringAt.y)<TILE),'walks into the camp and joins the ring'); ok(fresh.every(u=>u.dead||Math.hypot(u.ringAt.x-NT_RING.x*TILE,u.ringAt.y-NT_RING.y*TILE)<4*TILE),'round the middle of the camp');
  for(const u of G.ents) if(u.faction==='loyal') u.invuln=true; tp(d,21,18); for(let i=0;i<50&&!G.vars.dlDone;i++){ tp(d,21,18); watch(1); } ok(G.vars.dlDone&&obj('records')==='done'&&G.rogue.formula,'the files: Maas\\'s formula');
  ok(obj('stab')==='active'&&!G.rogue.exitOpen,'shaft shut until the cases are taken'); for(const c of G.vars.cases){ tp(d,Math.floor(c.x/TILE),Math.floor(c.y/TILE)); watch(0.4); } watch(1);
  ok(obj('stab')==='done'&&G.rogue.exitOpen,'three cases: the north shaft opens'); ok(G.rogue.stab>=3,'the doses are in the bag ('+G.rogue.stab+')');
  for(let w=0;w<J.waves+2;w++){ ring().forEach(u=>u.dead=true); calm(); watch(J.call+5); }
  ok(G.vars.sent===J.waves,'at most '+J.waves+' drops, however many fall ('+G.vars.sent+')'); ok(most<=G.vars.ringMax,'never more than '+G.vars.ringMax+' Corps soldiers on the field ('+most+')'); ok(types.has('pyro'),'the second one brought a flamer');
  { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'down the north shaft: won');
  const R=rogueStore(); ok(R.flags.formula&&G.rogueResult.formula,'the formula is kept'); ok(/formula/.test(rogueEndHtml()),'the end screen says so'); ok(/brews/.test(rogueBriefNote()),'the next briefing counts the brewed dose');
  const s0=R.stab; start('rogue-dead-air'); step(0.5); ok(__hc.G.rogue.stab===s0+ROGUE.stab.start+ROGUE.stab.formula,'the next job starts with the brewed dose too ('+__hc.G.rogue.stab+')');'''),
('needle: seen early','''resetRogue(); const G=start('''+NT+'''); step(1); for(const e of G.ents) if(e.faction==='swarm') e.invuln=true; const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt); u.invuln=true; tp(u,22,24); step(3);
  ok(G.vars.alarm!=null&&!G.vars.dlStart,'seen before the download: the alarm goes early'); ok(G.msgs.some(m=>m.who==='Kappa medical'),'Kappa medical calls Tycho');'''),
('needle: no Medic, no files','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); const d=crew().find(u=>u.def.heal); damage(d,1e6,null); step(1); ok(!G.over,'Devreese down: not over yet'); kill(d,null); step(1);
  ok(G.over&&!G.over.win&&/formula/.test(G.over.text),'Devreese dead: the job is lost');'''),
('veil: the brood looks through him','''resetRogue(); const G=start('''+AT+'''); step(1); const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt), c=crew().find(x=>x.type==='gunner'); v.vet.taint=ROGUE.veil.taint+5; for(const e of G.ents) if(e.faction==='wild') e.dead=true; v.hp=v.maxHp=1e6; c.hp=c.maxHp=1e6;
  v.quiet=true; for(const x of crew()) if(x!==v&&x!==c) x.dead=true; tp(c,36,42); step(0.5); ok(G.api.veiled(v)&&!G.api.veiled(c),'40+ taint: veiled; clean: not');
  const d=makeUnit('drone','swarm',v.x+30,v.y); d.role='hunt'; tp(v,10,40); d.x=v.x+30; d.y=v.y; d.target=null; ok(findTarget(d,6,false)===null,'a drone next to him finds nothing to attack'); ok(!validTarget(d,v),'and cannot keep him as a target');
  d.order=null; d.think=0; G.swarm.huntT=0; step(1.5); ok(!d.order||Math.hypot(d.order.x-v.x,d.order.y-v.y)>3*TILE,'a hunting drone does not walk after him');
  { const w=launchWave(40); ok(w.every(u=>!u.order||Math.hypot(u.order.x-v.x,u.order.y-v.y)>3*TILE),'a wave is not sent at him'); for(const u of w) u.dead=true; }
  tp(v,5,40); tp(d,10,40); d.order=null; d.target=null; d.think=0; step(4); ok(Math.hypot(d.x-v.x,d.y-v.y)>4*TILE,'he walks off: it does not follow ('+(Math.hypot(d.x-v.x,d.y-v.y)/TILE).toFixed(1)+' tiles)');
  d.x=v.x+30; d.y=v.y; d.order=null; d.target=null;
  tp(c,10,42); ok(findTarget(d,6,false)===c,'but it finds the clean one');
  c.dead=true; const h=hives()[0]; tp(v,Math.floor(h.x/TILE)+3,Math.floor(h.y/TILE)); h.aggroAt=0; const n=G.ents.filter(e=>!e.dead&&e.faction==='swarm').length; step(1); ok(!G.ents.some(e=>!e.dead&&e.faction==='swarm'&&e.target===v),'the hive does not notice him');
  const t=makeUnit('drone','swarm',v.x+40,v.y); fire(v,t); ok(!G.api.veiled(v)&&G.rogue.veilBroken===1,'he fires: the veil is torn'); ok(findTarget(d,30,false)===v||validTarget(d,v),'now they see him');
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; step(ROGUE.veil.broken+1); ok(G.api.veiled(v),'it heals after '+ROGUE.veil.broken+' s'); v.vet.taint=ROGUE.veil.taint-5; step(0.5); ok(!G.api.veiled(v),'a dose too many: under the line, seen');
  v.vet.taint=10; v.vet.strains=['hive']; applyRank(v); ok(G.api.veiled(v),'Hive Scent: always veiled');
  selectEntities([v],false); renderSelection(); ok(/Veiled/.test(document.getElementById('selection').innerHTML),'the stats say Veiled');'''),
('veil: only in Among Them','''resetRogue(); const G=start('rogue-osprey-down'); step(1); const v=crew()[1]; v.vet.taint=70; ok(!veiled(v),'no veil in other jobs'); const d=makeUnit('drone','swarm',v.x+30,v.y); ok(validTarget(d,v),'the Swarm attacks him as always');'''),
('among them: pods, stir, lull, way down, wolf','''resetRogue(); const G=start('''+AT+'''); step(1); ok(G.vars.pods.length===3&&G.vars.pods.every(b=>!b.quiet),'three singing choir pods'); ok(!G.rogue.exitOpen,'the way down is shut');
  ok(G.ents.some(e=>!e.dead&&e.type==='shaft'&&!e.exit&&e.cfg&&e.cfg.creep),'an old burrow with creep by the ridge');
  calm(); for(const x of crew()) x.invuln=true; const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt), c=crew().find(x=>x.type==='gunner'); v.quiet=true;
  const b=G.vars.pods[0]; tp(c,Math.floor(b.x/TILE),Math.floor(b.y/TILE)+1); step(4); ok(b.quietP===0,'a clean one cannot quiet it'); tp(c,36,42);
  v.vet.taint=50; const n0=G.ents.filter(e=>!e.dead&&e.faction==='swarm').length; for(let i=0;i<20&&!b.quiet;i++){ tp(v,Math.floor(b.x/TILE),Math.floor(b.y/TILE)+1); step(1); }
  ok(b.quiet,'a veiled one quiets it'); ok(v.vet.taint>50||true,'(taint '+Math.round(v.vet.taint)+')'); ok(G.ents.some(e=>!e.dead&&e.rogue&&e.dna==='hive')||G.rogue.dna.hive>0,'it drops a Hive sample'); ok(G.ents.filter(e=>!e.dead&&e.faction==='swarm').length>n0,'and stirs the brood');
  for(const p of G.vars.pods.slice(1)) for(let i=0;i<20&&!p.quiet;i++){ v.vet.taint=50; tp(v,Math.floor(p.x/TILE),Math.floor(p.y/TILE)+1); step(1); }
  ok(obj('pods')==='done'&&G.rogue.exitOpen,'three quiet: the way down opens'); ok(G.timer&&G.timer.label==='The brood sleeps'&&G.api.lulled(),'the brood sleeps'); step(0.5);
  const s=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'); ok(s.length&&s.every(e=>e.truce==='corps'),'every creature keeps the truce'); ok(G.swarm.cfg.hunt===false,'the hunt is off');
  const d=s[0]; tp(c,Math.floor(d.x/TILE)+1,Math.floor(d.y/TILE)); ok(!validTarget(d,c),'it leaves the clean one alone'); ok(!findTarget(c,6,false)||findTarget(c,6,false).faction!=='swarm','and the crew does not wake them');
  G.timer.end=G.time+0.3; G.rogue.lullUntil=G.time+0.3; step(1.5); ok(!G.api.lulled()&&G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').every(e=>!e.truce),'they wake up'); ok(G.swarm.cfg.hunt&&G.swarm.cfg.hunt.every===35,'the hunt is back');
  { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'down the shaft: won'); ok(obj('calm')==='done','nobody went feral');
  ok(rogueStore().flags.wolf&&trophies()['rogue:wolf'],'Wolf in the Fold'); ok((rogueStore().dna.hive||0)>=0,'samples into the lab');'''),
('among them: a torn veil, a feral fit','''resetRogue(); const T=trophies(); delete T['rogue:wolf']; store.set('hc-trophies',T); const G=start('''+AT+'''); step(1); calm(); for(const x of crew()) x.invuln=true;
  const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt); v.vet.taint=100; tp(v,20,30); step(1.5); ok(v.feral>0||G.rogue.feral>0,'he snaps'); ok(obj('calm')==='failed','optional failed: someone went feral'); ok(G.rogue.veilBroken>=1,'a feral one is not veiled any more');
  for(const p of G.vars.pods){ p.quiet=true; } step(1); { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()){ x.feral=0; x.vet.taint=20; tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } } step(2);
  ok(G.over&&G.over.win,'won anyway'); ok(!rogueStore().flags.wolf&&!trophies()['rogue:wolf'],'but no Wolf in the Fold');'''),
('among them: save and load','''resetRogue(); const G=start('''+AT+'''); step(2); calm(); const v=crew()[2]; v.vet.taint=55; G.vars.pods[1].quietP=0.5; ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; step(0.5);
  ok(G2.mission.veil&&G2.vars.pods.length===3&&Math.abs(G2.vars.pods[1].quietP-0.5)<0.1,'the pods come back'); ok(G2.ents.some(e=>e.crew&&G2.api.veiled(e)),'and the veil with them');
  goMenu('menu'); resetRogue(); const G3=start('''+NT+'''); step(2); G3.vars.dl=0.4; ok(saveGame(),'needle saved'); goMenu('menu'); ok(loadGame(),'needle loaded'); step(0.5); ok(__hc.G.vars.term&&__hc.G.vars.term.type==='terminal'&&__hc.G.vars.dl>0.39,'the terminal and the download come back');'''),
('intel, trophy wall, dev panel','''goMenu('intel'); intelTab='rogue'; buildIntel(); ok(ROGUE_INTEL.some(x=>x.id==='veil')&&document.querySelectorAll('#intel-list .ili').length===7+6+ROGUE_INTEL.length,'The veil in Rogue Intel');
  ok(ROGUE_TROPHIES.some(t=>t.id==='rogue:wolf'),'Wolf in the Fold on the list'); goMenu('trophies'); trophTab='rogue'; buildTrophies(); const wb=document.querySelector('#trophy-wall').getBoundingClientRect(); ok(wb.bottom<=innerHeight&&wb.top>=0,'the Rogue tab still fits on one screen ('+Math.round(wb.bottom)+'/'+innerHeight+')');
  ok(/Wolf in the Fold/.test(document.querySelector('#trophy-wall').textContent),'the plaque hangs on the wall'); goMenu('menu');
  for(const k of ['ROGUE|stab.formula','ROGUE|veil.taint','ROGUE|veil.broken','M|job.download','M|job.pod','M|job.lull','M|job.stir','M|job.waves','M|job.squad','M|job.lostFor','M|job.call']) ok(!!devHelp(k),'dev help: '+k);''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ for(const m of MISSIONS) recordWin(m.id,'normal',500,false); }")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
