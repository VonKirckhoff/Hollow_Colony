# Brood Tactics (Swarm training 2): the drill squad (cannot fall inside its ring, exposed outside, the lone tower goes DOWN and its
# Engineer comes out to mend it, a soldier runs after a lone biter, a dropship tops the squad up), no prey in the open, Hive Sense,
# the young western nest, the two-teams and lure steps, the menu lists both Swarm trainings.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    menu=pg.evaluate("()=>{ ui.campSide='swarm'; buildCampaign(); return [...document.querySelectorAll('#mission-list .training .mt')].map(e=>e.textContent); }")
    pg.evaluate("()=>{ __hc.startMission(TRAINING.swarmTactics); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); };
      const ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m); try{ step(1);
      const steps=G.tutSteps, idx=t=>steps.findIndex(s=>(s.obj||'').includes(t));
      const go=t=>{ G.vars.tutI=idx(t); G.vars.tutState='start'; G.vars.tutAt=0; G.vars.cardOpen=false; step(0.5); if(G.vars.cardOpen) tutConfirm(); step(0.5); return G.vars.tutI; };
      ok(steps.length===10,'10 steps ('+steps.length+')'); ok(demoBrood().length>=6,'starts with a brood ('+demoBrood().length+')');
      ok(hives().length===4&&hives().some(h=>h.tx===WEST_NEST.x&&h.ty===WEST_NEST.y),'a young nest in the west');
      ok(!G.vars.prey,'no soldiers in the open');
      
      /* the head-on step is done once one of them got back up */
      { const hi=go('head-on'); const d=G.vars.drill.find(u=>!u.dead&&!u.downed); damage(d,d.maxHp*5,null); step(1); ok(G.vars.stepDone||G.vars.tutI>hi,'head-on step: done once one HOLDS'); }
      /* 2. the drill squad: at the outpost from the start, cannot fall inside the ring */
      const D=G.vars.drill; ok(D.length===4&&D.filter(u=>u.type==='engineer').length===1&&D.every(u=>inRing(u)),'drill squad of 4 with an Engineer, in the ring');
      ok(G.rings&&G.rings.length===1,'the ring is drawn');
      for(const u of D) damage(u,u.maxHp*5,null); ok(D.every(u=>!u.dead&&!u.downed&&u.hp>u.maxHp*0.5),'inside the ring they get back up at once');
      /* 2a. luring the Engineer: bite the lone tower */
      const T=G.vars.lureTower, eng=D.find(u=>u.type==='engineer'); ok(T&&!inRing(T),'lone tower stands outside the ring');
      damage(T,T.maxHp*5,null); ok(!T.dead&&T.hp>=1,'the lone tower does not fall');
      step(1); ok(eng.task==='repair','the Engineer goes out to mend it');
      let out1=false; for(let i=0;i<80&&!out1;i++){ step(0.5); out1=!inRing(eng); } step(0.5); ok(out1&&eng.exposed,'he leaves the ring: EXPOSED ('+(Math.hypot(eng.x-drillCentre().x,eng.y-drillCentre().y)/32).toFixed(1)+' tiles, '+eng.task+')');
      const t0=turnedCount(), l0=G.vars.lured||0; damage(eng,eng.maxHp*5,null); step(0.5);
      ok(eng.downed&&(G.vars.lured||0)===l0+1,'brought down outside the ring: lured +1 ('+(G.vars.lured||0)+')');
      /* 2b. the dropship brings a new Engineer */
      let back=false; for(let i=0;i<BROOD_TACTICS.refill+BROOD_TACTICS.flight+15&&!back;i++){ step(1); back=G.vars.drill.some(u=>!u.dead&&!u.downed&&u.type==='engineer'&&u!==eng); }
      ok(back&&G.vars.drill.filter(u=>!u.dead&&!u.downed).length===4,'a dropship brought a new Engineer: 4 again');
      /* 2a2. the lone tower stands on the build site, goes DOWN at 1 HP, the brood lets go and can be sent away, it comes back ONLINE at half */
      ok(T.tx===8&&T.ty===25,'lone tower on the build site (8,25)');
      { for(const u of G.vars.drill) if(u.type==='engineer'&&!u.dead) u.x=u.dhome.x; const bs=[]; for(let i=0;i<6;i++){ const u=makeUnit('brute','swarm',T.x+40,T.y+10*i); u.role='brood'; u.mine=true; u.target=T; u.order={type:'attack',target:T}; bs.push(u); }
        T.hp=25; let down=false; for(let i=0;i<60&&!down;i++){ step(0.5); down=!!T.down; } ok(down&&T.invuln&&!T.dead,'bitten to 1 HP: DOWN, not dead');
        step(1); ok(bs.every(u=>u.dead||u.target!==T),'the brood lets go of it');
        selectEntities(bs.filter(u=>!u.dead),false); const far={x:T.x+10*32,y:T.y-3*32}; swarmRight(far.x,far.y); const d0=bs.filter(u=>!u.dead).map(u=>dist(u,far)); step(5);
        ok(bs.filter(u=>!u.dead).every((u,i)=>dist(u,far)<d0[i]),'and follows a move order away from it');
        for(const u of bs) u.dead=true; let up=false; for(let i=0;i<120&&!up;i++){ step(0.5); up=!T.down; } ok(up&&!T.invuln,'mended to half: ONLINE again ('+Math.round(T.hp/T.maxHp*100)+'%)'); }
      /* 2a3. Hive Sense */
      { const lone=makeUnit('trooper','corps',45*32,36*32); const cs=senseContacts({x:45*32,y:30*32}); const k=cs.find(c=>c.e===lone);
        ok(k&&k.kind==='easy','Hive Sense: a lone soldier is easy prey (orange)'); const inr=G.vars.drill.find(u=>!u.dead&&!u.downed&&inRing(u)); ok(inr&&!easyPrey(inr),'a drill soldier in his ring is not');
        const sv={x:inr.x,y:inr.y}; inr.x=drillCentre().x+9*32; ok(easyPrey(inr),'out of his ring he is'); inr.x=sv.x; inr.y=sv.y; lone.dead=true;
        trackerLabel(); ok(/Sense/.test(document.getElementById('btn-tracker').textContent),'the button says Sense'); }
      /* 2c. a soldier chases a lone biter, and turns back at chaseR */
      const tr=G.vars.drill.find(u=>u.type==='trooper'&&!u.dead&&!u.downed); const c0=drillCentre(); const ang=0; tr.x=c0.x+3*32; tr.y=c0.y; tr.dhome={x:tr.x,y:tr.y};
      const bx=c0.x+Math.cos(ang)*(BROOD_TACTICS.ring-0.5)*32, by=c0.y+Math.sin(ang)*(BROOD_TACTICS.ring-0.5)*32;
      for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,c0)<14*32) e.dead=true; const biter=makeUnit('crawler','swarm',bx,by); biter.role='brood'; biter.hp=biter.maxHp=5000; damage(tr,1,biter); step(1);
      ok(tr.task==='chase'&&tr.chase===biter,'bitten by a lone creature: he chases it');
      biter.order={type:'move',x:c0.x+Math.cos(ang)*20*32,y:c0.y+Math.sin(ang)*20*32}; setPath(biter,biter.order.x,biter.order.y); biter.post={x:biter.order.x,y:biter.order.y};
      let left=false; const tl=[]; for(let i=0;i<30&&!left;i++){ if(Math.hypot(biter.x-c0.x,biter.y-c0.y)<16*32){ biter.x+=24; biter.path=null; } step(0.5); left=!inRing(tr); tl.push((Math.hypot(tr.x-c0.x,tr.y-c0.y)/32).toFixed(1)+tr.task+'/'+(Math.hypot(biter.x-c0.x,biter.y-c0.y)/32).toFixed(1)); } ok(left,'he follows it out of the ring'+(left?'':' '+tl.slice(0,8).join(' ')));
      let turned=false; for(let i=0;i<70&&!turned;i++){ if(Math.hypot(biter.x-c0.x,biter.y-c0.y)<16*32){ biter.x+=24; biter.path=null; } step(0.5); turned=!tr.task; } ok(turned,'and turns back after a while ('+(Math.hypot(tr.x-c0.x,tr.y-c0.y)/32).toFixed(1)+' tiles out)');
      for(let i=0;i<40&&!inRing(tr);i++) step(0.5); ok(inRing(tr),'back in the ring');
      biter.dead=true;
      /* 2d. a soldier lured out while huskMax are turned dies without a body */
      const hs2=[]; for(let i=0;i<BROOD_TACTICS.huskMax;i++){ const u=makeUnit('husk','swarm',30.5*32,9.5*32); u.role='brood'; hs2.push(u); }
      const tr2=G.vars.drill.find(u=>u.type==='trooper'&&!u.dead&&!u.downed)||makeDrill(G.api,makeUnit('trooper','corps',c0.x,c0.y)); tr2.x=c0.x+9*32; tr2.y=c0.y; const nb=G.ents.filter(e=>!e.dead&&e.kind==='body').length, bm=G.swarm.biomass;
      damage(tr2,tr2.maxHp*5,biter); ok(tr2.dead&&G.ents.filter(e=>!e.dead&&e.kind==='body').length===nb&&G.swarm.biomass>bm,'with '+BROOD_TACTICS.huskMax+' Husks: dies without a body, still feeds us');
      hs2.forEach(u=>u.dead=true);
      /* 2e. the two-teams step */
      const ti=go('Two teams'); const br=[]; G.swarm.biomass+=500; swarmBreed('crawler',6); batchReleaseAll(); step(SWARM_PLAY.batch.grow+3); const mine=myBrood();
      selectEntities(mine.slice(0,3),false); G.groups['1']=[...G.sel]; selectEntities(mine.slice(3),false); G.groups['2']=[...G.sel];
      const d0=G.vars.drill.find(u=>!u.dead&&!u.downed); selectEntities(G.groups['1'],false); swarmRight(d0.x,d0.y); step(1);
      ok(G.vars.tutI===ti&&!G.vars.stepDone,'one team sent: step waits');
      selectEntities(G.groups['2'],false); sendWave(d0.x,d0.y); step(1); ok(G.vars.stepDone||G.vars.tutI>ti,'both teams sent: step done');
      /* 2f. the lure step: done when one falls outside the ring */
      const li=go('Lure the Engineer'); const e2=G.vars.drill.find(u=>!u.dead&&!u.downed&&u.type==='engineer')||makeDrill(G.api,makeUnit('engineer','corps',c0.x,c0.y)); e2.x=c0.x+8*32; e2.y=c0.y; damage(e2,e2.maxHp*5,null); step(1);
      ok(G.vars.stepDone||G.vars.tutI>li,'lure step done when the Engineer falls outside the ring');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }''')
    print(r); b.close()
print('menu',menu); ok=menu==['The First Hunger','Brood Tactics']; print(('OK   ' if ok else 'FAIL ')+'campaign screen lists both Swarm trainings')
print(errs)
print('ALL OK' if 'FAIL' not in r and ok and not errs else 'FAILED')
