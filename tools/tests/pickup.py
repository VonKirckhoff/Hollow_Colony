# Pickups (Nov 2026): the dropship waits SHIP.wait (90 s) with its ramp down; soldiers who reach the pad walk up the ramp one by one
# and are aboard (hidden, safe); the ship has a hull (BUILDINGS.hull, invisible) that the Brood attacks; spent hull or time up: it lifts
# off, and whoever is not aboard loses the mission. Dead Signal, Dust Landing, Hunted (the Magpie). Also: the 3D ship is SHIP.size3d
# times the 2D sprite and every pad lets it land along a heading with no rock, cliff, rim or map edge under it. Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  dust=()=>__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  crew=()=>__hc.G.ents.filter(e=>!e.dead&&e.crew), tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.dead=true; __hc.G.swarm.cfg.waves=false; },
  ALLM=()=>[...MISSIONS,...ROGUE_MISSIONS,...SWARM_MISSIONS,...Object.values(TRAINING)], start=id=>{ __hc.startMission(ALLM().find(m=>m.id===id)); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
DS='''const G=start('dead-signal'); step(0.5); calm(); G.vars.extract=true; G.api.addObjective('extract','x'); G.vars.chase=1e9; G.api.landShip('pickup',1); step(2);
  const pad=G.ents.find(e=>e.tag==='pickup'&&e.def.reinforce), s=pad.ship, h=s&&s.hull;'''
CASES=[
('every pad: a heading with nothing under the ship','''const bad=[]; for(const m of ALLM()){ if(m.landingZone||(m.triggers||[]).some(t=>/pad[(]|landShip/.test(String(t.do)))||/pad[(]/.test(String(m.steps&&m.steps.map(x=>String(x.setup))))){
      try{ start(m.id); }catch(e){ continue; } const G=__hc.G; if(!G) continue; step(1); if(m.id==='rogue-hunted'){ step(14); } for(const b of G.ents) if(!b.dead&&b.def&&b.def.reinforce){ const n=shipBlocked(b.x/TILE,b.y/TILE,padHeading(b),SHIP.size3d); if(n>0) bad.push(m.id+'@'+Math.floor(b.x/TILE)+','+Math.floor(b.y/TILE)+':'+n); } } }
  ok(!bad.length,'no rock, rim, cliff or map edge under a landed ship (at '+SHIP.size3d+'x): '+bad.join(' '));'''),
('pads made later in a mission: room too','''const bad=[]; for(const [id,x,y] of [['training-swarm-tactics',16.5,22.5],['rogue-needle-and-thread',23.5,26.5],['rogue-osprey-down','P'],['hollow-colony','2'],['rogue-hunted','1'],['rogue-hunted','2'],['rogue-hunted','3']]){
    start(id); const G=__hc.G; let cx=x, cy=y; if(typeof x==='string'){ const p=ptWorld(x); cx=p.x/TILE; cy=p.y/TILE; if(id==='rogue-hunted'){ cx=Math.floor(cx)-0.5; cy=Math.floor(cy)+2.5; } }
    const f={x:cx*TILE,y:cy*TILE}, n=shipBlocked(cx,cy,padHeading(f),SHIP.size3d); if(n>0) bad.push(id+'@'+cx+','+cy+':'+n); }
  ok(!bad.length,'the Brood Tactics drill pad, the Needle relief pad, the Dead Man pad, the Hollow Colony pickup and the Magpie beacons: '+bad.join(' '));'''),
('no quick turns: landing and lifting off turn slowly','''const G=start('dead-signal'); step(0.5); calm(); let worst=0, worstT=0, where='';
  for(const pad of G.ents.filter(e=>!e.dead&&e.def&&e.def.reinforce)) for(let r=0;r<16;r++){ const ang=r/16*Math.PI*2, d=(a,b)=>{ let x=b-a; while(x>Math.PI) x-=2*Math.PI; while(x<-Math.PI) x+=2*Math.PI; return Math.abs(x); };
    let prev=null; for(let t=4.95;t>=0;t-=0.05){ pad.flight={ t, total:25, cargo:[], ang }; const P=shipPoses(pad)[0]; if(prev!=null){ const w=d(prev,P.hd)/0.05; if(w>worst){ worst=w; where='landing t='+t.toFixed(2)+' ang='+ang.toFixed(2); } } prev=P.hd; }
    pad.flight=null; prev=null; for(let t=2.99;t>0;t-=0.05){ pad.ship={ phase:'takeoff', t, out:ang }; const P=shipPoses(pad)[0]; if(prev!=null){ const w=d(prev,P.hd)/0.05; if(w>worstT){ worstT=w; } } prev=P.hd; } pad.ship=null; }
  ok(worst<1.6,'landing: never faster than 90°/s ('+(worst*57.3).toFixed(0)+'°/s, '+where+')'); ok(worstT<1.6,'lifting off: never faster than 90°/s ('+(worstT*57.3).toFixed(0)+'°/s)');'''),
('dead signal: the ship waits, they board one by one, won','''%s
  ok(s&&s.phase==='parked'&&s.pickup&&h&&h.hidden&&h.def.hull,'parked with a hidden hull over the pad'); ok(G.vars.landed&&G.timer&&G.timer.label==='Lift-off'&&Math.abs(G.api.timerLeft()-SHIP.wait)<3,'the mission counts down the lift-off ('+Math.round(G.api.timerLeft())+' s)');
  const us=dust(); for(const u of us) u.invuln=true; tp(us[0],Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); step(8); ok(us[0].aboard===pad&&us[0].hidden&&G.api.aboard('pickup')===1,'the first walks up the ramp and is aboard');
  ok(!G.sel.includes(us[0])&&!G.over,'out of the selection, not won yet ('+G.api.aboard('pickup')+'/'+G.api.troops()+')');
  const t0=us[0].x; step(2); ok(us[0].x===pad.x,'aboard he stays put');
  for(const u of us) if(!u.aboard) tp(u,Math.floor(pad.x/TILE)+1,Math.floor(pad.y/TILE)); step(25); ok(G.over&&G.over.win,'all aboard: won ('+G.api.aboard('pickup')+'/'+G.api.troops()+')'); ok(!pad.ship||pad.ship.phase==='takeoff','and the ship lifts off');''' % DS),
('dead signal: too late is lost','''%s
  const us=dust(); for(const u of us) u.invuln=true; tp(us[0],Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); step(SHIP.wait-25); ok(!G.over&&G.api.aboard('pickup')===1,'one aboard, the rest far away');
  step(30); ok(G.over&&!G.over.win&&G.api.shipGone('pickup')==='time','time up: it leaves and the mission is lost'); ok(h.dead,'the hull is gone with it');''' % DS),
('dead signal: the Brood goes for the hull','''%s
  for(const u of dust()){ u.invuln=true; tp(u,10,20); } const bs=G.api.spawn('drone',{x:Math.floor(pad.x/TILE)-6,y:Math.floor(pad.y/TILE)},12,{faction:'swarm'});
  step(6); const hit=h.hp<h.maxHp; ok(hit,'the drones attack the ship ('+Math.round(h.hp)+'/'+h.maxHp+')'); ok(bs.some(b=>b.target===h),'it is their target');
  for(let i=0;i<60&&!G.over;i++) step(1); ok(G.over&&!G.over.win&&G.api.shipGone('pickup')==='hull','hull spent: it pulls out early, lost ('+(G.over&&G.over.text||'')+')');''' % DS),
('dust landing: a real pickup at Kappa pad','''const G=start('dust-landing'); step(0.5); calm(); G.vars.extract=true; G.api.addObjective('extract','x'); G.vars.shaftNext=1e9; G.api.landShip(null,1); step(2);
  const pad=G.ents.find(e=>e.def.reinforce&&!e.tag); ok(G.vars.landed&&pad.ship&&pad.ship.hull,'the Kestrel lands on the station pad and waits');
  for(const u of dust()){ u.invuln=true; tp(u,Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); } step(25); ok(G.over&&G.over.win,'all aboard: won');'''),
('the hollow colony: Dr. Maas and everyone up the ramp','''const G=start('hollow-colony'); step(1); calm(); G.vars.nextWave=1e9; G.vars.maas=G.api.spawn('scientist',{x:53,y:4},1)[0]; G.vars.rescueT=G.time; G.api.pad('2','extract'); G.api.addObjective('escort','x'); G.api.landShip('extract',1); step(2);
  const pad=G.ents.find(e=>e.tag==='extract'); ok(G.vars.landed&&pad.ship&&pad.ship.hull,'the Kestrel lands at the extraction pad and waits');
  const mine=dust().filter(u=>u!==G.vars.maas); for(const u of mine){ u.invuln=true; tp(u,Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); } step(20); ok(!G.over,'not without Dr. Maas ('+G.api.aboard('extract')+'/'+G.api.troops()+')');
  G.vars.maas.invuln=true; tp(G.vars.maas,Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); step(15); ok(G.over&&G.over.win,'Dr. Maas aboard too: won');'''),
('hunted: the Magpie waits 90 s','''resetRogue(); const G=start('rogue-hunted'); step(14); calm(); for(const e of G.ents) if(e.faction==='loyal') e.dead=true;
  const up=G.ents.find(e=>e.def&&e.def.capture&&e.point==='3'); for(const x of crew()){ tp(x,44,31); x.invuln=true; } step(22); G.timer.end=G.time+0.3; step(2);
  const pad=G.ents.find(e=>e.tag==='magpie'); ok(pad&&pad.ship&&pad.ship.pickup&&pad.ship.name==='Magpie'&&G.timer.label==='Lift-off','the Magpie lands and waits ('+Math.round(G.api.timerLeft())+' s)');
  for(const x of crew()) tp(x,Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); step(25); ok(G.over&&G.over.win,'the crew aboard: won ('+G.api.aboard('magpie')+'/'+G.api.crewUp()+')');'''),
('save and load during a pickup','''%s
  const us=dust(); tp(us[0],Math.floor(pad.x/TILE),Math.floor(pad.y/TILE)); step(8); ok(us[0].aboard===pad,'one aboard'); ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; step(0.5);
  const p2=G2.ents.find(e=>e.tag==='pickup'&&e.def.reinforce); ok(p2.ship&&p2.ship.hull&&!p2.ship.hull.dead&&G2.api.aboard('pickup')===1,'ship, hull and the man aboard come back'); goMenu('menu');''' % DS),
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'ERR_' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ ui.roster=ui.roster||{}; ui.roster.self=ui.roster.self||{name:'Test',sex:'m'}; }")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
