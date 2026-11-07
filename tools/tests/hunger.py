# The First Hunger (Swarm training): new prey keeps coming, the tactic step needs a Lure/Flank attack,
# the burrow step works at the brood limit, the outpost is rebuilt if it was torn down early, step texts are current.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ __hc.startMission(TRAINING.swarm); }"); pg.wait_for_timeout(800)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); };
      const ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m); try{
      const S=G.tutSteps||TRAINING.swarm.triggers; step(1);
      const steps=G.tutSteps; const idx=t=>steps.findIndex(s=>(s.obj||'').includes(t));
      ok(steps.length===22,'22 steps ('+steps.length+')'); ok(!/roots into a new hive/.test(steps[idx('Watch it grow')].say),'step 10 no longer talks about new hives');
      ok(/Save game/.test(steps[idx('Open the menu')].say),'menu step mentions Save game');
      /* 1. prey keeps coming */
      const prey0=G.vars.prey.slice(); for(const u of prey0) goDown(u,null);
      step(FIRST_HUNGER.preyEvery+2); const fresh=G.vars.prey.filter(u=>!u.dead&&!u.downed);
      ok(fresh.length===FIRST_HUNGER.prey,'a new pair wandered in ('+fresh.length+')');
      for(const u of fresh){ u.dead=true; } step(FIRST_HUNGER.preyEvery+2);
      ok(G.vars.prey.filter(u=>!u.dead&&!u.downed).length===FIRST_HUNGER.prey,'and again');
      /* jump to a step */
      const go=t=>{ G.vars.tutI=idx(t); G.vars.tutState='start'; G.vars.tutAt=0; G.vars.cardOpen=false; step(0.5); if(G.vars.cardOpen) tutConfirm(); step(0.5); return G.vars.tutI; };
      /* 1b. fauna first: kill a grazer, drag it home, it becomes a Bloater */
      const fi=go('Kill a grazer'); const gz=G.vars.gz; ok(gz&&!gz.dead&&G.markers.some(m=>m.id==='tut'),'fauna step marks a grazer');
      G.swarm.biomass+=300; for(let i=0;i<4;i++) swarmBreed('drone'); step(1); sendWave(gz.x,gz.y);
      for(let i=0;i<60&&G.vars.tutI===fi;i++){ step(1); if(G.vars.stepDone&&G.vars.cardOpen) tutConfirm(); }
      ok(G.vars.tutI>fi,'grazer killed: carcass on the ground');
      swarmHarvest(); for(let i=0;i<90&&!G.ents.some(e=>!e.dead&&e.type==='bloater');i++){ step(1); if(G.vars.stepDone&&G.vars.cardOpen) tutConfirm(); }
      ok(G.ents.some(e=>!e.dead&&e.type==='bloater'),'the carcass became a Bloater');
      for(let i=0;i<3;i++){ step(1); if(G.vars.cardOpen) tutConfirm(); }
      ok(/Attack the two soldiers/.test(G.objectives.find(o=>o.id==='tut').text),'then the soldiers ('+G.objectives.find(o=>o.id==='tut').text+')');
      /* 1c. no new soldiers while huskMax are turned or turning */
      for(const u of G.vars.prey) u.dead=true; for(const e of G.ents) if(!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))) e.dead=true; const hs=[]; for(let i=0;i<FIRST_HUNGER.huskMax;i++){ const u=makeUnit('husk','swarm',30.5*32,9.5*32); u.role='brood'; hs.push(u); }
      step(FIRST_HUNGER.preyEvery+4); ok(!preyStanding(G.api),'no new soldiers with '+turnedCount()+' Husks');
      hs[0].dead=true; step(8); ok(preyStanding(G.api),'one Husk spent: soldiers come again');
      for(const u of hs) u.dead=true;
      /* 2. tactic step: a drill squad appears, changing the tactic alone is not enough, a Lure attack is; the drill soldiers never fall */
      const ti=go('drill squad'); const D=G.vars.drill||[]; ok(D.length===FIRST_HUNGER.drill.length&&D.every(u=>!u.dead&&u.drill),'tactic step brings the drill squad ('+D.length+')'); ok(D.every(u=>Math.hypot(u.x/32-19.5,u.y/32-20.5)<5),'drill squad stands at the outpost');
      G.swarm.tactic='lure'; step(1); ok(G.vars.tutI===ti&&!G.vars.stepDone,'tactic changed but no attack yet: step waits');
      G.swarm.biomass+=400; for(let i=0;i<8;i++) swarmBreed('brute'); step(1);
      sendWave(D[0].x,D[0].y); step(1);
      ok(G.swarm.lastPlan==='lure'&&(G.vars.stepDone||G.vars.tutI>ti),'a Lure attack ticks the step off');
      for(const u of D) damage(u,u.maxHp*5,null); ok(D.every(u=>!u.dead&&!u.downed&&u.hp>u.maxHp*0.5),'drill soldiers get back up at once');
      step(40); ok(D.every(u=>!u.dead&&!u.downed),'drill squad still standing after 40 s of fighting');
      /* 2b. no new prey while the Swarm is too many */
      for(const u of G.vars.prey) u.dead=true; G.vars.prey=[]; const extra=[]; for(let i=0;i<FIRST_HUNGER.swarmMax;i++){ const u=makeUnit('crawler','swarm',30.5*32,9.5*32); u.role='brood'; u.invuln=true; extra.push(u); }
      const rl=[]; for(let i=0;i<FIRST_HUNGER.preyEvery+3;i++){ step(1); rl.push(swarmRoaming()+':'+G.vars.prey.length); }  ok(!G.vars.prey.length,'no new prey while '+swarmRoaming()+' roam');
      for(const u of extra) u.dead=true; for(const u of myBrood()) u.dead=true; step(FIRST_HUNGER.preyEvery+5); ok(G.vars.prey.length>=FIRST_HUNGER.prey,'prey comes again once the Swarm is spent ('+swarmRoaming()+' roam)');
      /* 2c. a creature hatched from a cocoon waits at the gathering point */
      const c=makeBuilding('cocoon','swarm',30,12,true); c.hatchType='husk'; c.hatchT=0.01; c.husk=true; step(1);
      const h=G.ents.find(e=>!e.dead&&e.type==='husk'); ok(h&&h.role==='brood','hatched Husk joins the waiting brood ('+(h&&h.role)+')');
      /* 3. burrow at the brood limit */
      G.swarm.biomass+=2000; while(broodUsed()<broodCap()){ const n=broodUsed(); swarmBreed('crawler'); if(broodUsed()===n) break; }
      ok(broodUsed()>=broodCap(),'brood at its limit ('+broodUsed()+'/'+broodCap()+')');
      G.swarm.burrowAt=G.time; const bi=go('Burrow up'); ok(burrowReady(),'burrow ready');
      const s=G.map.sites.slice().find(s=>{ const x=(s.x+.5)*32,y=(s.y+.5)*32; return walkableT(s.x,s.y)&&G.map.height[s.y*G.map.w+s.x]===0&&!G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&Math.hypot(e.x-x,e.y-y)<8*32); });
      const n0=broodUsed(); burrowAt((s.x+.5)*32,(s.y+.5)*32); step(1);
      ok(broodUsed()>n0&&(G.vars.stepDone||G.vars.tutI>bi),'burrowed at the limit ('+n0+' -> '+broodUsed()+')');
      /* 4. outpost torn down early: it comes back */
      for(const e of G.ents) if(!e.dead&&(e.type==='relay'||e.type==='sentry')) e.dead=true; step(1);
      const oi=go('Relay Tower'); ok(tut.built('relay').length===1&&tut.built('sentry').length===1,'outpost rebuilt for the last step');
      ok(G.vars.tutI===oi&&!G.over,'last step not skipped');
      for(const e of G.ents) if(!e.dead&&(e.type==='relay'||e.type==='sentry')) e.dead=true; step(2);
      ok(G.over&&G.over.win,'tearing it down wins');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }''')
    print(r); pg.screenshot(path='/home/claude/hunger.png'); b.close()
print(errs)
print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
