# The Hollow Choir (Nov 2026): the search team marches as one circle (a fight stops the whole circle, the Medic stays with it),
# Dr. Maas stands in the middle once she is out, they leave the lab by its east side, dig in in the crater south of it with a
# Sentry Gun (the nearby hive within its reach), and two minutes before the dropship the Engineer packs the gun, they march to
# the pad and he sets it up again there. Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
CODE='''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m);
  const team=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.faction==='corps'&&e.choir);
  const mid=us=>({x:us.reduce((a,u)=>a+u.x,0)/us.length,y:us.reduce((a,u)=>a+u.y,0)/us.length});
  let medFar=0, eastX=0, westOut=false, fought=false;
  const watch=()=>{ const us=team(), med=us.find(u=>u.def.heal), fig=us.filter(u=>!isSupport(u)); if(med&&fig.length){ const c=mid(fig); medFar=Math.max(medFar,Math.hypot(med.x-c.x,med.y-c.y)/TILE); }
    if(G.vars.maas&&G.vars.choir==='east'||G.vars.choir==='crater'){ const c=mid(us); if(c.y<14*TILE) eastX=Math.max(eastX,c.x/TILE); if(c.y<14*TILE&&c.y>12*TILE&&c.x<56*TILE) westOut=true; } };
  const step=(s,w)=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); if(i%5===0) watch(); if(w&&w()) return true; } return false; };
  try{
    for(const e of G.ents) if(e.kind==='unit') e.invuln=true;
    const hc=hives().sort((a,b)=>Math.hypot(a.x/TILE-49.5,a.y/TILE-24.5)-Math.hypot(b.x/TILE-49.5,b.y/TILE-24.5))[0]; hc.invuln=true;   /* the nest by the crater lives until they dig in */
    step(2); let us=team(), f=us[0]&&us[0].formation;
    ok(us.length===9&&f&&f.shape==='circle'&&us.every(u=>u.formation===f),'the search team forms one circle ('+us.length+')');
    ok(marching(f),'the circle marches to the lab');
    /* a fight on the way: a crawler in front of them */
    step(15); const c0=mid(team()), cr=makeUnit('crawler','swarm',c0.x+3*TILE,c0.y-2*TILE); cr.invuln=true; cr.role='brood'; cr.mine=true;
    const mx=f.march&&f.march.x; step(4); fought=team().some(u=>u.target&&u.target.faction==='swarm'); ok(fought,'they fight on the way');
    ok(!f.march||Math.abs(f.march.x-mx)<3*TILE,'the circle stops for the fight'); cr.dead=true;
    const atLab=step(400,()=>!!G.vars.maas); ok(atLab,'Dr. Maas comes out of the lab ('+Math.round(G.time)+' s)');
    ok(medFar<5,'the Medic stays with the squad (at most '+medFar.toFixed(1)+' tiles from the fighters)');
    step(1); const m=G.vars.maas; us=team(); f=us.find(u=>!isSupport(u)).formation;
    ok(m.formation===f&&m.choir,'Maas joins the circle');
    ok(m.slot&&Math.hypot(m.slot.x,m.slot.y)<2,'her place is the very middle of the circle');
    const vs=['medic','engineer'].map(t=>us.find(u=>u.type===t)); ok(vs.every(u=>u&&u.slot&&Math.hypot(u.slot.x,u.slot.y)>10&&Math.hypot(u.slot.x,u.slot.y)<40),'Medic and Engineer stand round her, inside the ring');
    const ring=us.filter(u=>!isSupport(u)); ok(ring.every(u=>u.slot&&Math.hypot(u.slot.x,u.slot.y)>45),'the fighters form the ring');
    const dug=step(200,()=>G.vars.choir==='crater-hold'); ok(dug,'they reach the crater and dig in ('+Math.round(G.time)+' s)'); hc.invuln=false;
    ok(eastX>=60&&!westOut,'they left the lab by the east side (furthest east '+eastX.toFixed(1)+')');
    const c1=mid(team()); ok(Math.hypot(c1.x/TILE-CHOIR_SQUAD.crater.x,c1.y/TILE-CHOIR_SQUAD.crater.y)<3,'the circle stands in the crater');
    ok(Math.hypot(m.x/TILE-CHOIR_SQUAD.crater.x,m.y/TILE-CHOIR_SQUAD.crater.y)<1.6,'Maas in the middle of it');
    step(25); const gun=G.vars.choirGun; ok(alive(gun)&&gun.built,'the Engineer set up a Sentry Gun in the crater');
    const h=hc; ok(h&&gapTo(gun,h)<=gun.def.range*TILE,'the nearby hive lies within the Sentry\\'s reach ('+(gapTo(gun,h)/TILE).toFixed(1)+' tiles)');
    const hp0=h.hp; step(10); ok(h.hp<hp0,'they shoot the nest from the crater');
    ok(team().filter(u=>!u.def.builder).every(u=>Math.hypot(u.x/TILE-CHOIR_SQUAD.crater.x,u.y/TILE-CHOIR_SQUAD.crater.y)<4),'nobody leaves the crater to chase the nest');
    /* save and load in the crater: they still hold, and still leave in time */
    saveGame(); loadGame(); { const G2=__hc.G; ok(G2!==G&&G2.vars.choir==='crater-hold'&&alive(G2.vars.choirGun)&&G2.ents.filter(e=>e.choir&&!e.dead).every(e=>e.slotLeash>0),'save and load: still dug in, gun and leash kept'); }
    return out.join('\\n')+'\\n@@'; }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CODE2='''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m);
  const team=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.faction==='corps'&&e.choir);
  const step=(s,w)=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); if(w&&w()) return true; } return false; };
  try{ const m=G.vars.maas, gun=G.vars.choirGun; for(const e of G.ents) if(e.kind==='unit') e.invuln=true;
    /* two minutes before the dropship */
    G.timer.end=G.time+121; const left=step(20,()=>G.vars.choir==='pad'||G.vars.choir==='pad-hold');
    ok(left,'two minutes before the dropship they leave the crater');
    const eng=team().find(u=>u.def.builder); ok(eng&&eng.carry&&eng.carry.type==='sentry'&&!alive(gun),'the Engineer packed the gun and carries it');
    const there=step(90,()=>G.vars.choir==='pad-hold'); ok(there,'they reach the pad');
    step(15); const pg=G.ents.find(e=>!e.dead&&e.kind==='building'&&e.type==='sentry'&&e.faction==='corps'&&dist(e,ptWorld('2'))<7*TILE);
    ok(pg&&pg.built,'he set the gun up again by the Landing Zone');
    ok(dist(m,ptWorld('2'))<4*TILE,'Maas stands within reach of the pad ('+(dist(m,ptWorld('2'))/TILE).toFixed(1)+' tiles)');
    ok(m.formation&&team().every(u=>u.formation===m.formation),'still one circle');
  }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-choir')); }"); pg.wait_for_timeout(300)
    out=pg.evaluate(CODE); pg.wait_for_timeout(300); out+='\n'+pg.evaluate(CODE2); pg.screenshot(path='/tmp/choir.png')
    b.close()
out='\n'.join(l for l in out.split('\n') if l.strip() not in ('OK','@@')); print(out); print(errs); print('ALL OK' if 'FAIL' not in out and not errs else 'FAILED')
