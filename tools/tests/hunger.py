# The First Hunger (Swarm training): grazer first and the Bloater, bodies stay until H, the steps look at the field, prey in the open
# but never while huskMax are turned, Hive Sense, the burrow step at the brood limit, the outpost rebuilt for the last step.
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
      ok(steps.length===21,'21 steps ('+steps.length+')'); ok(!steps.some(st=>/drill|Lure|Two teams/.test(st.obj||'')),'no drill, lure or teams steps (those are in Brood Tactics)'); ok(!steps.some(st=>(st.keys||[]).includes('T')),'no tactic key any more'); ok(!/roots into a new hive/.test(steps[idx('Watch it grow')].say),'step 10 no longer talks about new hives');
      ok(/Save game/.test(steps[idx('Open the menu')].say),'menu step mentions Save game');
      ok(G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'&&Math.hypot(e.x/32-19.5,e.y/32-20.5)<8).length>=2,'two guards at the outpost ('+G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit').map(e=>Math.round(e.x/32)+','+Math.round(e.y/32)).join(' ')+')'); ok(!G.rings||!G.rings.length,'no drill ring here');
      /* 1. prey keeps coming */
      const prey0=G.vars.prey.slice(); for(const u of prey0) goDown(u,null);
      step(FIRST_HUNGER.preyEvery+2); const fresh=G.vars.prey.filter(u=>!u.dead&&!u.downed);
      ok(fresh.length===FIRST_HUNGER.prey,'a new pair wandered in ('+fresh.length+')');
      for(const u of fresh){ u.dead=true; } step(FIRST_HUNGER.preyEvery+2);
      ok(G.vars.prey.filter(u=>!u.dead&&!u.downed).length===FIRST_HUNGER.prey,'and again');
      /* jump to a step */
      const go=t=>{ G.vars.tutI=idx(t); G.vars.tutState='start'; G.vars.tutAt=0; G.vars.cardOpen=false; step(0.5); if(G.vars.cardOpen) tutConfirm(); step(0.5); return G.vars.tutI; };
      /* 1b. fauna first: kill a grazer, drag it home, it becomes a Bloater */
      for(const u of G.vars.prey) u.dead=true; for(const e of G.ents) if(!e.dead&&e.kind==='body') e.dead=true; G.vars.preyAt=1e9;   /* a quiet field for the fauna part */
      const fi=go('Kill a grazer'); const gz=G.vars.gz; ok(gz&&!gz.dead&&G.markers.some(m=>m.id==='tut'),'fauna step marks a grazer');
      G.swarm.biomass+=300; swarmBreed('drone',4); batchReleaseAll(); step(SWARM_PLAY.batch.grow+2); for(const u of myBrood()) u.invuln=true; sendWave(gz.x,gz.y);
      for(let i=0;i<60&&G.vars.tutI===fi;i++){ step(1); if(G.vars.stepDone&&G.vars.cardOpen) tutConfirm(); }
      ok(G.vars.tutI>fi,'grazer killed: carcass on the ground');
      { const cb=G.ents.find(e=>!e.dead&&e.kind==='body'&&e.fauna); step(20); ok(cb&&!cb.home&&!cb.carrier&&!G.ents.some(e=>!e.dead&&e.claim===cb),'the carcass stays put until H (manualHaul)'); }
      swarmHarvest(); for(let i=0;i<160&&!G.ents.some(e=>!e.dead&&e.type==='bloater');i++){ step(1); if(G.vars.stepDone&&G.vars.cardOpen) tutConfirm(); }
      G.vars.preyAt=null; ok(G.ents.some(e=>!e.dead&&e.type==='bloater'),'the carcass became a Bloater'+(G.ents.some(e=>!e.dead&&e.type==='bloater')?'':' '+JSON.stringify(G.ents.filter(e=>!e.dead&&e.kind==='body').map(b=>({home:!!b.home,carrier:!!b.carrier,ord:!!b.ordered,x:Math.round(b.x/32),y:Math.round(b.y/32)})))+' units '+G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').map(e=>e.type+':'+e.role+(e.mine?'m':'')+(e.target?'T':'')+(e.claim?'C':'')).join(',')));
      for(let i=0;i<3;i++){ step(1); if(G.vars.cardOpen) tutConfirm(); }
      ok(/Attack the two soldiers/.test(G.objectives.find(o=>o.id==='tut').text),'then the soldiers ('+G.objectives.find(o=>o.id==='tut').text+')');
      /* 1c. no new soldiers while huskMax are turned or turning; one Husk spent and they come again */
      for(const u of G.vars.prey) u.dead=true; for(const e of G.ents) if(!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))) e.dead=true; const hs=[]; for(let i=0;i<FIRST_HUNGER.huskMax;i++){ const u=makeUnit('husk','swarm',30.5*32,9.5*32); u.role='brood'; u.invuln=true; hs.push(u); }
      step(FIRST_HUNGER.preyEvery+4); ok(!preyStanding(G.api),'no new soldiers with '+turnedCount()+' Husks');
      hs[0].dead=true; step(8); ok(preyStanding(G.api),'one Husk spent: soldiers come again'); for(const u of hs) u.dead=true;
     
      /* 2d2. steps look at what is on the field: with a Husk already there, the body and Grafter steps are done at once */
      { const hk=makeUnit('husk','swarm',30.5*32,9.5*32); hk.role='brood'; hk.stage=0; const bi0=idx('Bring a body home'); const bi=go('Bring a body home'); step(1); ok(G.vars.stepDone||G.vars.tutI>bi0,'body step already done when a Husk exists'+(G.vars.stepDone||G.vars.tutI>bi?'':' ('+(hk.dead?'husk dead':'husk ok')+' I '+G.vars.tutI+'/'+bi+' '+G.vars.tutState+' card '+G.vars.cardOpen+')'));
        const wi0=idx('Watch the Grafter'); const wi=go('Watch the Grafter'); step(1); ok(G.vars.stepDone||G.vars.tutI>wi0,'Grafter step already done too ('+wi+' '+steps[wi].obj+' husk '+(hk.dead?'dead':'ok')+' I '+G.vars.tutI+' '+G.vars.tutState+')'); hk.dead=true; }
      /* 2g. (open prey) no new prey while the Swarm is too many: reopen the open field to check */
      
      for(const u of G.vars.prey) u.dead=true; G.vars.prey=[]; const extra=[]; for(let i=0;i<FIRST_HUNGER.swarmMax;i++){ const u=makeUnit('crawler','swarm',30.5*32,9.5*32); u.role='brood'; u.invuln=true; extra.push(u); }
      const rl=[]; for(let i=0;i<FIRST_HUNGER.preyEvery+3;i++){ step(1); rl.push(swarmRoaming()+':'+G.vars.prey.length); }  ok(!G.vars.prey.length,'no new prey while '+swarmRoaming()+' roam');
      for(const u of extra) u.dead=true; for(const u of myBrood()) u.dead=true; for(const e of G.ents) if(!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))) e.dead=true; step(FIRST_HUNGER.preyEvery+5); ok(G.vars.prey.length>=FIRST_HUNGER.prey,'prey comes again once the Swarm is spent ('+swarmRoaming()+' roam)');
      /* 2c. a creature hatched from a cocoon waits at the gathering point */
      const cc=makeBuilding('cocoon','swarm',30,12,true); const c=cc; c.hatchType='husk'; c.hatchT=0.01; c.husk=true; step(1);
      const h=G.ents.find(e=>!e.dead&&e.type==='husk'); ok(h&&h.role==='brood','hatched Husk joins the waiting brood ('+(h&&h.role)+')');
      /* 3. burrow at the brood limit */
      G.swarm.biomass+=2000; while(broodUsed()<broodCap()){ const n=broodUsed(); swarmBreed('crawler'); if(broodUsed()===n) break; } batchReleaseAll(); step(SWARM_PLAY.batch.grow+SWARM_PLAY.batch.per*30+1);
      ok(broodUsed()>=broodCap(),'brood at its limit ('+broodUsed()+'/'+broodCap()+')');
      G.swarm.burrowAt=G.time; const bi=go('Burrow up'); ok(burrowReady(),'burrow ready');
      const s=G.map.sites.slice().find(s=>{ const x=(s.x+.5)*32,y=(s.y+.5)*32; return walkableT(s.x,s.y)&&G.map.height[s.y*G.map.w+s.x]===0&&!G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&Math.hypot(e.x-x,e.y-y)<8*32); });
      const n0=broodUsed(); burrowAt((s.x+.5)*32,(s.y+.5)*32); step(1);
      ok(broodUsed()>n0&&(G.vars.stepDone||G.vars.tutI>bi),'burrowed at the limit ('+n0+' -> '+broodUsed()+')');
      /* 4. outpost torn down early: it comes back */
      for(const e of G.ents) if(!e.dead&&!e.lure&&(e.type==='relay'||e.type==='sentry')) e.dead=true; step(1);
      const oi=go('Relay Tower'); ok(tut.built('relay').length===1&&tut.built('sentry').length===1,'outpost rebuilt for the last step');
      ok(G.vars.tutI===oi&&!G.over,'last step not skipped');
      for(const e of G.ents) if(!e.dead&&!e.lure&&(e.type==='relay'||e.type==='sentry')) e.dead=true; step(2);
      ok(G.over&&G.over.win,'tearing it down wins');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }''')
    print(r); pg.screenshot(path='/home/claude/hunger.png'); b.close()
print(errs)
print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
