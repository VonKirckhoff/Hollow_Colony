# The Osprey crew as the enemy in the Lunar Corps campaign (Nov 2026): Night Shift, Kill Order, Mother's Heart.
# The crew never dies: they break off below OSPREY.breakAt and run for a way out. Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  osp=()=>__hc.G.ents.filter(e=>!e.dead&&e.osprey), dust=()=>__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm') e.invuln=true; },
  obj=id=>(__hc.G.objectives.find(o=>o.id===id)||{}).state,
  start=id=>{ __hc.startMission(MISSIONS.find(m=>m.id===id)); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('campaign order','''const ids=MISSIONS.map(m=>m.id); ok(ids.length===11,'eleven Corps missions');
  ok(ids[4]==='night-shift'&&ids[7]==='kill-order'&&ids[8]==='mothers-heart'&&ids[9]==='brood-mother'&&ids[10]==='high-ground','Night Shift 5, Kill Order 8, Mother\\'s Heart 9, Brood Mother 10, High Ground 11');
  for(const m of MISSIONS) recordWin(m.id,'normal',500,false); ok(rogueUnlocked(),'all eleven won: Rogue open');
  const P=ui.progress; for(const id of ['night-shift','kill-order','mothers-heart']) delete (P.results||P)[id]; ok(rogueUnlocked(),'the eight old ones won before Nov 2026: Rogue stays open');
  for(const id of ['brood-mother']) delete (P.results||P)[id]; ok(!rogueUnlocked()||devUnlock,'one old one missing and the new ones not won: locked'); for(const m of MISSIONS) recordWin(m.id,'normal',500,false);'''),
('the crew: truce, breaking off, never dying','''const G=start('night-shift'); step(0.5); calm(); const u=G.api.osprey('trooper',{x:20,y:30},1)[0]; G.api.ospreyExits([{x:2,y:35}]);
  ok(u.sprite==='crew_trooper'&&u.faction==='osprey','crew kit, faction osprey'); ok(u.maxHp>UNITS.trooper.hp*1.2,'tougher than a trooper ('+Math.round(u.maxHp)+')');
  const d=makeUnit('drone','swarm',u.x+30,u.y); ok(!validTarget(d,u)&&!validTarget(u,d),'the Swarm and the crew leave each other alone'); d.dead=true;
  const s=dust()[0]; tp(s,21,30); step(0.4); ok(validTarget(s,u),'Dust may shoot them'); const xp=s.vet.xp; damage(u,u.maxHp*0.5,s); ok(!u.ospBroke,'half health: still fighting');
  damage(u,1e8,s); ok(!u.dead&&u.ospBroke&&u.invuln,'a killing blow: he breaks off instead, out of reach'); ok(s.vet.xp>xp,'XP for breaking him off'); ok(!validTarget(s,u),'nobody can target him any more');
  const x0=Math.hypot(u.x-G.api.where({x:2,y:35}).x,u.y-G.api.where({x:2,y:35}).y); step(3); ok(Math.hypot(u.x-G.api.where({x:2,y:35}).x,u.y-G.api.where({x:2,y:35}).y)<x0,'he runs for the way out');
  step(OSPREY.vanish); ok(u.dead&&G.osprey.gone>=1,'and is gone'); ok(!G.ents.some(e=>e.kind==='body'&&e.faction==='osprey'),'no body left behind');
  for(const x of dust()) x.quiet=true; const c=G.api.osprey('trooper',{x:20,y:30},1)[0]; c.quiet=true; c.hp=c.maxHp*0.5; G.creep[30*G.map.w+20]=1; step(2); ok(c.hp>c.maxHp*0.5,'the creep heals them');'''),
('night shift: the raid','''const G=start('night-shift'); step(1); ok(G.ents.filter(e=>!e.dead&&e.type==='medtent').length===3&&G.vars.term,'three tents and a terminal'); ok(G.vars.cases.length===3,'three cases of stabilizer');
  ok(osp().length===0,'quiet at first'); calm(); for(const s of dust()) s.invuln=true; step(G.mission.job.nsArrive); ok(osp().length===4,'four raiders from the south-west'); ok(G.msgs.some(m=>m.who==='Kappa medical'),'Kappa medical sees them'); step(G.mission.job.nsSneak+0.5); ok(osp().length===7&&G.vars.doc,'and three out of the old shaft: seven'); ok(G.mission.dark,'a night mission');
  for(const s of dust()) s.quiet=true; const doc=G.vars.doc; doc.invuln=true; tp(doc,20,19); step(3); ok(G.vars.dl>0.02,'their Medic at the terminal: the download runs ('+Math.round(G.vars.dl*100)+'%)');
  const g1=G.vars.grabbers[0]; g1.invuln=true; const c=G.vars.cases[0]; tp(g1,Math.floor(c.x/TILE),Math.floor(c.y/TILE)); step(G.mission.job.nsGrab+1); ok(c.dead&&obj('stab')==='failed','a case is taken: optional failed');
  doc.invuln=false; g1.invuln=false; const s=dust()[0]; s.invuln=false; for(const u of osp().slice(0,G.mission.job.nsBreak)) damage(u,1e8,s); step(1); ok(G.vars.out,'six broke off: the rest pull out');
  ok(osp().every(u=>u.ospBroke),'every one of them runs'); for(let i=0;i<40&&!G.over;i++) step(1); ok(G.over&&G.over.win,'all gone: won'); ok(obj('drive')==='done'&&obj('records')==='done','driven out, and the files kept'); ok(/Containment Order 9/.test(G.over.text),'the end tells who they were');'''),
('night shift: they get the files','''const G=start('night-shift'); step(1); calm(); for(const s of dust()){ s.invuln=true; s.quiet=true; } step(G.mission.job.nsArrive+G.mission.job.nsSneak+0.5); const doc=G.vars.doc; doc.invuln=true;
  for(let i=0;i<G.mission.job.nsDownload+5&&!G.vars.dlDone;i++){ tp(doc,20,19); step(1); } ok(G.vars.dlDone&&obj('records')==='failed','the download finishes: optional failed');'''),
('kill order: Kessler, beacons, the hauler','''const G=start('kill-order'); step(1); const k=G.vars.kessler; ok(k&&k.npc&&k.vet.name==='Kessler'&&k.vet.rank===2,'Sgt. Kessler in the squad'); ok(osp().length===7,'seven of them');
  ok(osp().every(u=>!validTarget(u,k)),'they will not shoot Kessler'); ok(osp().every(u=>validTarget(u,dust().find(s=>s!==k))),'but the rest of Dust, yes'); ok(G.timer&&G.timer.label==='Hauler','the hauler is coming');
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; calm(); G.swarm.nextWave=1e9; for(const u of osp()){ u.invuln=true; tp(u,45,45); u.ospHunt=false; } for(const s of dust()) s.invuln=true;
  const ups=G.ents.filter(e=>!e.dead&&e.def&&e.def.capture); const ss=dust(); ups.forEach((b,i)=>{ for(const s of ss.filter((_,j)=>j%3===i)) tp(s,Math.floor(b.x/TILE)+1,Math.floor(b.y/TILE)); });
  for(let i=0;i<30&&G.api.uplinks()<3;i++){ for(const u of osp()) tp(u,45,45); step(1); } ok(G.api.uplinks()===3,'Dust holds all three beacons');
  const o=osp()[0]; o.invuln=false; tp(o,Math.floor(ups[0].x/TILE)-2,Math.floor(ups[0].y/TILE)); for(const s of ss) if(Math.hypot(s.x-ups[0].x,s.y-ups[0].y)<6*TILE) tp(s,40,58); step(BUILDINGS.uplink.loseTime+2);
  ok(!ups[0].owned,'the crew takes a beacon back'); ok(G.msgs.some(m=>/Osprey crew/.test(m.text)),'lost to the Osprey crew');'''),
('kill order: denied, they run, won','''const G=start('kill-order'); step(1); calm(); for(const s of dust()) s.invuln=true; for(const b of G.ents.filter(e=>e.def&&e.def.capture)){ b.owned=true; b.cap=1; } for(const u of osp()){ u.invuln=true; tp(u,45,45); }
  G.timer.end=G.time+0.2; step(1); ok(obj('beacons')==='done'&&osp().every(u=>u.ospBroke),'the hauler turns back, they all break off'); for(let i=0;i<40&&!G.over;i++) step(1);
  ok(G.over&&G.over.win&&obj('kessler')==='done','won, Kessler alive'); settleRoster(); ok(!ui.roster.active.some(v=>v.name==='Kessler'),'Kessler does not join your roster');'''),
('kill order: back on his feet','''const G=start('kill-order'); step(1); calm(); for(const s of dust()) s.invuln=true; const u=osp()[1], ty=u.type; damage(u,1e8,null); ok(u.ospBroke,'broken off'); step(OSPREY.vanish+1); ok(u.dead&&G.api.ospreyComing()===1,'gone, and coming back');
  const n=osp().length; step((G.mission.job.koBack[G.diffKey]||60)+1); const b=osp().find(x=>x.ospBack); ok(b&&b.type===ty&&b.hp===b.maxHp&&osp().length===n+1,'he is back, healed'); ok(!validTarget(b,G.vars.kessler),'and still spares Kessler');
  step(G.mission.job.koRethink+1); ok(G.vars.teams.some(t=>t.list.includes(b)),'he joins a team');'''),
('kill order: lost','''let G=start('kill-order'); step(1); calm(); for(const s of dust()) s.invuln=true; G.timer.end=G.time+0.2; step(1); ok(G.over&&!G.over.win&&/Magpie/.test(G.over.text),'a beacon not yours: the hauler lands');
  G=start('kill-order'); step(1); calm(); kill(G.vars.kessler,null); step(1); ok(G.over&&!G.over.win&&obj('kessler')==='failed','Kessler dead: lost');'''),
("mother's heart: burn it",'''const G=start('mothers-heart'); step(1); ok(G.vars.sac&&G.vars.sac.heart,'her heart, still beating'); ok(osp().length===7,'seven of them'); ok(!G.ents.some(e=>!e.dead&&e.type==='broodmother'),'no Brood Mother: she fled');
  calm(); for(const u of osp()) u.invuln=true; for(const s of dust()) s.invuln=true; step(5); ok(G.vars.tap>0,'they drain it ('+(G.vars.tap*100).toFixed(1)+'%)'); ok(G.timer&&G.timer.label==='Heart drained','the clock shows how long');
  const py=dust().find(s=>s.type==='pyro'); const h=G.vars.sac; for(let i=0;i<G.mission.job.mhBurn+3&&!G.vars.done;i++){ tp(py,Math.floor(h.x/TILE)-1,Math.floor(h.y/TILE)); step(1); }
  ok(G.vars.done==='burnt'&&obj('blood')==='done','a Pyro burns it'); ok(osp().every(u=>u.ospBroke),'they all run'); for(let i=0;i<40&&!G.over;i++) step(1); ok(G.over&&G.over.win&&/alive/.test(G.over.text),'won: and the Mother lives');'''),
("mother's heart: drained",'''const G=start('mothers-heart'); step(1); calm(); for(const u of osp()) u.invuln=true; G.vars.tap=0.995; step(3); ok(G.over&&!G.over.win&&obj('blood')==='failed','they drain it: lost');'''),
("mother's blood: she tears free",'''resetRogue(); __hc.startMission(ROGUE_MISSIONS.find(m=>m.id==='rogue-mothers-blood')); const G=__hc.G; step(1); const m=G.vars.mother; m.invuln=false; damage(m,1e8,null); step(1);
  ok(m.dead&&G.vars.heart&&G.vars.heart.heart,'she tears a heart loose and is gone'); ok(G.msgs.some(x=>/scream/.test(x.text)),'Varga: something hurt her'); ok(/blood trail/.test(ROGUE_MISSIONS.find(x=>x.id==='rogue-mothers-blood').triggers.map(t=>String(t.do)).join('')),'no dead queen any more');
  ok(/lived through/.test(MISSIONS.find(x=>x.id==='brood-mother').briefing[0]),'Brood Mother: she lived through it');'''),
('save and load, dev panel','''let G=start('night-shift'); step(1); calm(); step(G.mission.job.nsArrive+G.mission.job.nsSneak+1); G.vars.dl=0.3; ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); G=__hc.G; step(0.5);
  ok(osp().length===7&&osp().every(u=>u.truce==='swarm'&&u.sprite==='crew_'+u.type),'the raiders come back as they were'); ok(G.vars.dl>=0.29&&G.vars.term,'and the download'); goMenu('menu');
  for(const k of ['OSPREY|breakAt','OSPREY|hp.normal','OSPREY|creepHeal','OSPREY|vanish','M|job.nsDownload','M|job.koShip','M|job.mhTap.normal','M|job.mhBurn']) ok(!!devHelp(k),'dev help: '+k);''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
