# Dust Landing's blast doors (Nov 2026): the controls are slagged, the Icarus brings an Engineer who arms a breaching charge on the
# Breach point (10 s standing still; a hit or a step off starts it over), a small group climbs out of the east shaft while he works,
# then a 10 s fuse with a red ring: the blast blows both sets of doors away (row 24 at the station, row 15 at the caverns) and hurts your own soldiers in the ring. Lost Engineer: a new one.
# The Waking (the Brood's side) uses the same charge: their Engineer blows the doors, hit him and he starts over, two replacements at most.
# Must end with ALL OK.
from playwright.sync_api import sync_playwright
import sys
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  dust=()=>__hc.G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'),
  tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; u.moving=false; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; __hc.G.swarm.cfg.waves=false; },
  doors=()=>__hc.G.ents.filter(e=>!e.dead&&e.type==='door'&&e.tag==='north').length,
  start=()=>{ __hc.startMission(MISSIONS.find(m=>m.id==='dust-landing')); const G=__hc.G; step(0.5); calm();
    G.vars.ambushAt=null; G.vars.ambush=[]; G.vars.drop1=true; G.api.addObjective('drop','x'); return G; },
  eng=()=>__hc.G.ents.find(e=>!e.dead&&e.type==='engineer'); try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('the drop brings an Engineer, the site appears','''__hc.startMission(MISSIONS.find(m=>m.id==='dust-landing')); const G=__hc.G; step(0.5); calm();
  G.vars.ambushAt=null; G.vars.ambush=[]; G.vars.drop1=false; step(1); const lz=G.ents.find(e=>e.def&&e.def.reinforce);
  G.vars.ambush=[]; G.triggers=G.triggers||G.triggers; G.api.airdrop([['trooper',2],['pyro',1],['engineer',1]],1); G.vars.drop1=true; G.api.addObjective('drop','x');
  for(let i=0;i<40&&!eng();i++) step(1); ok(!!eng(),'an Engineer comes off the Icarus'); step(6);
  const site=G.ents.find(e=>!e.dead&&e.type==='chargesite'&&e.tag==='breach'); ok(site&&site.tx===44&&site.ty===26,'the Breach point lies in front of the doors'); ok(doors()===18,'both sets of doors are still shut ('+doors()+')'); ok(!walkableT(44,15)&&!walkableT(44,24),'doors at the station end and the cavern end');
  ok(G.objectives.some(o=>o.id==='breach'),'objective: blow the blast doors'); ok(!G.vars.open,'not open by itself');'''),
('arming: a hit starts it over, the east shaft wakes','''const G=start(); G.api.spawn('engineer',{x:45,y:37},1); step(6); const e=eng(); const n0=G.ents.filter(x=>!x.dead&&x.faction==='swarm'&&x.kind==='unit').length;
  tp(e,44,26); step(5); const site=G.ents.find(x=>!x.dead&&x.type==='chargesite'); ok(site.arm>0.4&&site.arm<0.6,'half armed after 5 s ('+site.arm.toFixed(2)+')'); ok(G.api.charge('breach')==='arming','state arming');
  const n1=G.ents.filter(x=>!x.dead&&x.faction==='swarm'&&x.kind==='unit').length; ok(n1>n0,'a small group climbs out of the east shaft ('+n0+' -> '+n1+')'); calm();
  damage(e,1,{faction:'swarm',dead:true}); step(0.2); ok(site.arm<0.05&&G.api.chargeResets('breach')===1,'hit: he starts over ('+site.arm.toFixed(2)+')');
  step(4); tp(e,44,30); step(0.5); ok(site.arm===0&&G.api.chargeResets('breach')===2,'stepping off: over too'); ok(!G.vars.open,'still shut');'''),
('the fuse, the ring, the blast','''const G=start(); G.api.spawn('engineer',{x:45,y:37},1); G.api.spawn('trooper',{x:44,y:28},1); step(6); calm(); G.vars.breach=true; const e=eng(); e.invuln=false;
  const tr=G.ents.find(x=>!x.dead&&x.type==='trooper'&&Math.abs(x.y/TILE-28.5)<1.5); tp(e,44,26); for(let i=0;i<15&&G.api.charge('breach')!=='armed';i++){ calm(); step(1); }
  ok(G.api.charge('breach')==='armed','armed after about 10 s'); const fz=G.api.chargeFuse('breach'); ok(fz>=8&&fz<=10,'a 10 s fuse ('+fz+')');
  ok((G.rings||[]).some(z=>z.charge==='breach'&&z.col==='#ff5a4f'),'a red ring shows the blast');
  tp(e,44,34); tp(tr,44,27); tr.hp=tr.maxHp; const hp0=e.hp; for(let i=0;i<12&&G.api.charge('breach')!=='blown';i++){ calm(); tp(tr,44,27); step(1); }
  ok(G.api.charge('breach')==='blown','it blows'); ok(doors()===0,'the doors are gone'); ok(walkableT(44,24)&&walkableT(40,24)&&walkableT(48,24)&&walkableT(44,15)&&walkableT(40,15)&&walkableT(48,15),'both doors blown at once, the tunnel is open');
  ok(tr.hp<tr.maxHp&&!tr.dead&&!tr.downed,'the Trooper in the ring is hurt, not down ('+Math.round(tr.hp)+'/'+tr.maxHp+')'); ok(e.hp===hp0,'the Engineer out of the ring is not');
  ok(!(G.rings||[]).some(z=>z.charge==='breach'),'the ring is gone'); step(1); ok(G.vars.open&&G.swarm.cfg.aggro===7&&G.objectives.some(o=>o.id==='nest'),'the caverns wake up, next objective');
  ok(G.decals.length>5,'black scars where the doors stood');'''),
('a lost Engineer: Varga sends another','''const G=start(); G.api.spawn('engineer',{x:45,y:37},1); step(6); calm(); const e=eng(); e.dead=true; step(2); ok(G.vars.engCalled,'a new Engineer is on his way');
  for(let i=0;i<40&&!eng();i++) step(1); ok(!!eng()&&!G.vars.engCalled,'he lands');'''),
('save and load with a live charge','''const G=start(); G.api.spawn('engineer',{x:45,y:37},1); step(6); calm(); const e=eng(); tp(e,44,26); for(let i=0;i<15&&G.api.charge('breach')!=='armed';i++){ calm(); step(1); }
  ok(G.api.charge('breach')==='armed','armed'); ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; step(0.2);
  ok(G2.api.chargeFuse('breach')>0&&(G2.rings||[]).some(z=>z.charge==='breach'),'charge and ring come back'); tp(eng(),44,34); for(let i=0;i<12&&G2.api.charge('breach')!=='blown';i++){ for(const x of G2.ents) if(x.faction==='swarm'&&x.kind==='unit') x.dead=true; step(1); }
  ok(G2.api.charge('breach')==='blown'&&doors()===0&&!(G2.rings||[]).length,'it still blows the doors'); goMenu('menu');'''),
('the waking: their Engineer blows the doors','''__hc.startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); const G=__hc.G; step(0.5);
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; G.vars.station=G.time; G.vars.drop1=G.time-30; step(1);
  ok(doors()===9,'shut at first'); G.api.spawn('engineer',{x:45,y:37},1); step(3); ok(G.vars.breach&&G.ents.some(e=>!e.dead&&e.type==='chargesite'&&e.tag==='breach'),'the Breach point is set');
  let armedAt=null; for(let i=0;i<60&&G.api.charge('breach')!=='blown';i++){ if(!armedAt&&G.api.charge('breach')==='armed') armedAt=G.time; step(1); }
  ok(armedAt!=null,'their Engineer walks up and arms it'); ok(G.api.charge('breach')==='blown'&&doors()===0&&G.vars.open,'the doors are blown, the way is open');
  const near=G.api.corps().filter(e=>Math.hypot(e.x/TILE-44.5,e.y/TILE-26.5)<4.5).length; ok(true,'squad near the blast afterwards: '+near);
  ok(G.api.corps().every(e=>!e.breacher),'nobody keeps the breacher flag');'''),
('the waking: hit him and he starts over; two replacements, then the doors stay shut','''__hc.startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); const G=__hc.G; step(0.5);
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; G.vars.station=G.time; G.vars.drop1=G.time-30; G.api.spawn('engineer',{x:44,y:28},1); step(3);
  const e=eng(); for(let i=0;i<60&&!(G.ents.find(x=>!x.dead&&x.type==='chargesite').arm>0.3);i++) step(0.5); const site=G.ents.find(x=>!x.dead&&x.type==='chargesite');
  ok(site.arm>0.3,'he is arming ('+site.arm.toFixed(2)+')'); damage(e,1,{faction:'swarm',dead:true}); step(0.2); ok(site.arm<0.05,'a hit: he starts over');
  let calls=0; for(let k=0;k<4;k++){ const x=eng(); if(x) x.dead=true; step(2); if(G.vars.engCalled&&!G.vars.noDoor) calls++; for(let i=0;i<40&&!eng()&&!G.vars.noDoor;i++) step(1); }
  ok(G.vars.noDoor&&G.vars.engLost===3,'after two replacements no more Engineers ('+G.vars.engLost+')'); step(20); ok(doors()===9&&!G.vars.open,'the doors stay shut');'''),
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
