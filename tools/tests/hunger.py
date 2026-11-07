# The First Hunger (Swarm training): grazer first, prey in the open until huskMax Husks are made, then only by luring;
# the drill squad (cannot fall inside its ring, exposed outside, Engineer mends the lone tower, a soldier chases a lone biter,
# a dropship tops it up), the two-teams and lure steps, the burrow step at the brood limit, the outpost rebuilt for the last step.
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
      ok(steps.length===23,'23 steps ('+steps.length+')'); ok(!steps.some(st=>(st.keys||[]).includes('T')),'no tactic key any more'); ok(!/roots into a new hive/.test(steps[idx('Watch it grow')].say),'step 10 no longer talks about new hives');
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
      swarmHarvest(); for(let i=0;i<160&&!G.ents.some(e=>!e.dead&&e.type==='bloater');i++){ step(1); if(G.vars.stepDone&&G.vars.cardOpen) tutConfirm(); }
      ok(G.ents.some(e=>!e.dead&&e.type==='bloater'),'the carcass became a Bloater');
      for(let i=0;i<3;i++){ step(1); if(G.vars.cardOpen) tutConfirm(); }
      ok(/Attack the two soldiers/.test(G.objectives.find(o=>o.id==='tut').text),'then the soldiers ('+G.objectives.find(o=>o.id==='tut').text+')');
      /* 1c. once huskMax Husks are made, no more soldiers wander into the open, also not when one is spent */
      for(const u of G.vars.prey) u.dead=true; for(const e of G.ents) if(!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))) e.dead=true; const hs=[]; for(let i=0;i<FIRST_HUNGER.huskMax;i++){ const u=makeUnit('husk','swarm',30.5*32,9.5*32); u.role='brood'; hs.push(u); }
      step(FIRST_HUNGER.preyEvery+4); ok(!preyStanding(G.api)&&G.vars.openDone,'no new soldiers with '+turnedCount()+' Husks');
      hs[0].dead=true; step(FIRST_HUNGER.preyEvery+4); ok(!preyStanding(G.api),'one Husk spent: still none in the open');
      /* 2. the drill squad: at the outpost from the start, cannot fall inside the ring */
      const D=G.vars.drill; ok(D.length===4&&D.filter(u=>u.type==='engineer').length===1&&D.every(u=>inRing(u)),'drill squad of 4 with an Engineer, in the ring');
      ok(G.rings&&G.rings.length===1,'the ring is drawn');
      for(const u of D) damage(u,u.maxHp*5,null); ok(D.every(u=>!u.dead&&!u.downed&&u.hp>u.maxHp*0.5),'inside the ring they get back up at once');
      /* 2a. luring the Engineer: bite the lone tower */
      const T=G.vars.lureTower, eng=D.find(u=>u.type==='engineer'); ok(T&&!inRing(T),'lone tower stands outside the ring');
      damage(T,T.maxHp*5,null); ok(!T.dead&&T.hp>=1,'the lone tower does not fall');
      step(1); ok(eng.task==='repair','the Engineer goes out to mend it');
      let out1=false; for(let i=0;i<80&&!out1;i++){ step(0.5); out1=!inRing(eng); } step(0.5); ok(out1&&eng.exposed,'he leaves the ring: EXPOSED ('+(Math.hypot(eng.x-drillCentre().x,eng.y-drillCentre().y)/32).toFixed(1)+' tiles, '+eng.task+')');
      hs.forEach(u=>u.dead=true); const t0=turnedCount(), l0=G.vars.lured||0; damage(eng,eng.maxHp*5,null); step(0.5);
      ok(eng.downed&&(G.vars.lured||0)===l0+1,'brought down outside the ring: lured +1 ('+(G.vars.lured||0)+')');
      /* 2b. the dropship brings a new Engineer */
      let back=false; for(let i=0;i<FIRST_HUNGER.refill+FIRST_HUNGER.flight+15&&!back;i++){ step(1); back=G.vars.drill.some(u=>!u.dead&&!u.downed&&u.type==='engineer'&&u!==eng); }
      ok(back&&G.vars.drill.filter(u=>!u.dead&&!u.downed).length===4,'a dropship brought a new Engineer: 4 again');
      /* 2c. a soldier chases a lone biter, and turns back at chaseR */
      const tr=G.vars.drill.find(u=>u.type==='trooper'&&!u.dead&&!u.downed); const c0=drillCentre(); const ang=0; tr.x=c0.x+3*32; tr.y=c0.y; tr.dhome={x:tr.x,y:tr.y};
      const bx=c0.x+Math.cos(ang)*(FIRST_HUNGER.ring-0.5)*32, by=c0.y+Math.sin(ang)*(FIRST_HUNGER.ring-0.5)*32;
      for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,c0)<14*32) e.dead=true; const biter=makeUnit('crawler','swarm',bx,by); biter.role='brood'; biter.hp=biter.maxHp=5000; damage(tr,1,biter); step(1);
      ok(tr.task==='chase'&&tr.chase===biter,'bitten by a lone creature: he chases it');
      biter.order={type:'move',x:c0.x+Math.cos(ang)*20*32,y:c0.y+Math.sin(ang)*20*32}; setPath(biter,biter.order.x,biter.order.y); biter.post={x:biter.order.x,y:biter.order.y};
      let left=false; const tl=[]; for(let i=0;i<30&&!left;i++){ if(Math.hypot(biter.x-c0.x,biter.y-c0.y)<16*32){ biter.x+=24; biter.path=null; } step(0.5); left=!inRing(tr); tl.push((Math.hypot(tr.x-c0.x,tr.y-c0.y)/32).toFixed(1)+tr.task+'/'+(Math.hypot(biter.x-c0.x,biter.y-c0.y)/32).toFixed(1)); } ok(left,'he follows it out of the ring'+(left?'':' '+tl.slice(0,8).join(' ')));
      let turned=false; for(let i=0;i<40&&!turned;i++){ if(Math.hypot(biter.x-c0.x,biter.y-c0.y)<16*32){ biter.x+=24; biter.path=null; } step(0.5); turned=!tr.task; } ok(turned,'and turns back after a while ('+(Math.hypot(tr.x-c0.x,tr.y-c0.y)/32).toFixed(1)+' tiles out)');
      for(let i=0;i<40&&!inRing(tr);i++) step(0.5); ok(inRing(tr),'back in the ring');
      biter.dead=true;
      /* 2d. a soldier lured out while huskMax are turned dies without a body */
      const hs2=[]; for(let i=0;i<FIRST_HUNGER.huskMax;i++){ const u=makeUnit('husk','swarm',30.5*32,9.5*32); u.role='brood'; hs2.push(u); }
      const tr2=G.vars.drill.find(u=>u.type==='trooper'&&!u.dead&&!u.downed); tr2.x=c0.x+9*32; tr2.y=c0.y; const nb=G.ents.filter(e=>!e.dead&&e.kind==='body').length, bm=G.swarm.biomass;
      damage(tr2,tr2.maxHp*5,biter); ok(tr2.dead&&G.ents.filter(e=>!e.dead&&e.kind==='body').length===nb&&G.swarm.biomass>bm,'with '+FIRST_HUNGER.huskMax+' Husks: dies without a body, still feeds us');
      hs2.forEach(u=>u.dead=true);
      /* 2e. the two-teams step */
      const ti=go('Two teams'); const br=[]; G.swarm.biomass+=500; for(let i=0;i<6;i++){ swarmBreed('crawler'); } step(1); const mine=myBrood();
      selectEntities(mine.slice(0,3),false); G.groups['1']=[...G.sel]; selectEntities(mine.slice(3),false); G.groups['2']=[...G.sel];
      const d0=G.vars.drill.find(u=>!u.dead&&!u.downed); selectEntities(G.groups['1'],false); swarmRight(d0.x,d0.y); step(1);
      ok(G.vars.tutI===ti&&!G.vars.stepDone,'one team sent: step waits');
      selectEntities(G.groups['2'],false); sendWave(d0.x,d0.y); step(1); ok(G.vars.stepDone||G.vars.tutI>ti,'both teams sent: step done');
      /* 2f. the lure step: done when one falls outside the ring */
      const li=go('Lure one'); const e2=G.vars.drill.find(u=>!u.dead&&!u.downed&&u.type==='trooper'); e2.x=c0.x+8*32; e2.y=c0.y; damage(e2,e2.maxHp*5,null); step(1);
      ok(G.vars.stepDone||G.vars.tutI>li,'lure step done when one falls outside the ring');
      /* 2g. (open prey) no new prey while the Swarm is too many: reopen the open field to check */
      G.vars.openDone=false;
      for(const u of G.vars.prey) u.dead=true; G.vars.prey=[]; const extra=[]; for(let i=0;i<FIRST_HUNGER.swarmMax;i++){ const u=makeUnit('crawler','swarm',30.5*32,9.5*32); u.role='brood'; u.invuln=true; extra.push(u); }
      const rl=[]; for(let i=0;i<FIRST_HUNGER.preyEvery+3;i++){ step(1); rl.push(swarmRoaming()+':'+G.vars.prey.length); }  ok(!G.vars.prey.length,'no new prey while '+swarmRoaming()+' roam');
      for(const u of extra) u.dead=true; for(const u of myBrood()) u.dead=true; for(const e of G.ents) if(!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))) e.dead=true; step(FIRST_HUNGER.preyEvery+5); ok(G.vars.prey.length>=FIRST_HUNGER.prey,'prey comes again once the Swarm is spent ('+swarmRoaming()+' roam)');
      /* 2c. a creature hatched from a cocoon waits at the gathering point */
      const cc=makeBuilding('cocoon','swarm',30,12,true); const c=cc; c.hatchType='husk'; c.hatchT=0.01; c.husk=true; step(1);
      const h=G.ents.find(e=>!e.dead&&e.type==='husk'); ok(h&&h.role==='brood','hatched Husk joins the waiting brood ('+(h&&h.role)+')');
      /* 3. burrow at the brood limit */
      G.swarm.biomass+=2000; while(broodUsed()<broodCap()){ const n=broodUsed(); swarmBreed('crawler'); if(broodUsed()===n) break; }
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
