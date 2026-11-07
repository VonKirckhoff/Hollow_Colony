# Playing the Swarm: batch hatching (eggs, Shift ×5, 3 s quiet, Space, take back), teams with their own gathering point,
# hatch into a team, A with nothing selected sends every team from its own point, Shift+A arrives together; a Bloater waits at the rally.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-siege')); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
      step(1); const P=SWARM_PLAY.batch, mine=()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.mine).length; G.swarm.biomass=2000;
      const h=hives()[0]; selectEntities([h],false); const m0=mine(), b0=G.swarm.biomass;
      swarmBreed('crawler'); swarmBreed('drone'); ok(h.batch&&h.batch.items.length===2&&mine()===m0,'two eggs in the batch, nothing hatched yet');
      ok(G.swarm.biomass===b0-UNITS.crawler.biomass-UNITS.drone.biomass,'biomass taken at once'); ok(broodUsed()===m0+2,'eggs count for the brood limit');
      swarmBreed('crawler',P.shift); ok(h.batch.items.length===2+P.shift,'Shift: '+P.shift+' at once');
      const bb=G.swarm.biomass; batchTakeBack(h,'crawler'); ok(h.batch.items.length===1+P.shift&&G.swarm.biomass===bb+UNITS.crawler.biomass,'take one back: biomass back');
      step(P.quiet-0.5); ok(h.batch&&h.batch.grow==null,'still taking eggs before '+P.quiet+' s of quiet');
      step(1); ok(h.batch&&h.batch.grow!=null,'after '+P.quiet+' s quiet it grows');
      const n=h.batch.items.length; let hatchedAt=[]; for(let i=0;i<30*10&&h.batch;i++){ __hc.update(1/30); }
      ok(!h.batch&&mine()===m0+n,'all '+n+' hatched'); ok(G.sel.length===n&&G.sel.every(u=>u.kind==='unit'),'the new brood is selected');
      /* Space */
      selectEntities([h],false); swarmBreed('drone',2); ok(batchReleaseAll()&&h.batch.grow!=null,'Space: grows at once');
      step(P.grow+P.per*2+0.5); ok(!h.batch,'and hatches');
      /* teams */
      const all=myBrood(); G.groups=G.groups||{}; G.groups['1']=all.slice(0,4); G.groups['2']=all.slice(4,8);
      const p1={x:h.x+6*TILE,y:h.y}, p2={x:h.x,y:h.y+6*TILE}; selectEntities(G.groups['1'],false); ui.rallyPick=true; setRallyOrTeam(p1.x,p1.y);
      ok(G.swarm.teamRally['1']&&G.groups['1'].every(u=>u.post&&Math.hypot(u.post.x-G.swarm.teamRally['1'].x,u.post.y-G.swarm.teamRally['1'].y)<2),'G with team 1 selected: its own point');
      selectEntities(G.groups['2'],false); swarmRight(p2.x,p2.y); ok(!!G.swarm.teamRally['2'],'moving all of team 2 moves its point');
      const gr=G.swarm.rally; selectEntities([],false); setRally(h.x-5*TILE,h.y-3*TILE); ok(G.groups['1'].every(u=>u.post),'the main gathering point leaves the teams alone');
      /* hatch into team 2 */
      G.swarm.hatchTeam=null; cycleHatchTeam(); cycleHatchTeam(); ok(G.swarm.hatchTeam==='2','T cycles to team 2');
      const before=new Set(G.ents); selectEntities([h],false); swarmBreed('drone'); batchReleaseAll(); step(P.grow+1); const nb=G.ents.find(e=>!e.dead&&e.type==='drone'&&e.mine&&!before.has(e));
      ok(nb&&G.groups['2'].includes(nb)&&nb.post&&Math.hypot(nb.post.x-G.swarm.teamRally['2'].x,nb.post.y-G.swarm.teamRally['2'].y)<2,'hatched into team 2, waits at its point');
      step(8);
      /* A with nothing selected: every team goes; Shift+A: the closer ones wait */
      const corp=G.ents.find(e=>!e.dead&&e.faction==='corps'&&e.kind==='building'); selectEntities([],false);
      const waiting=myBrood(); sendWave(corp.x,corp.y,true); const del=waiting.filter(u=>u.waveDelay>0);
      ok(waiting.length>=8&&G.groups['1'].concat(G.groups['2']).every(u=>u.role==='wave'),'A with nothing selected: every team goes ('+waiting.length+')');
      ok(del.length>0&&del.length<waiting.length,'Shift+A: '+del.length+' of '+waiting.length+' wait a little to arrive together');
      /* the Bloater from a cocoon waits */
      const c=makeBuilding('cocoon','swarm',Math.floor(h.x/TILE),Math.floor(h.y/TILE)+3,true); c.hatchType='bloater'; c.hatchT=0.01; step(1);
      const bl=G.ents.find(e=>!e.dead&&e.type==='bloater'); ok(bl&&bl.role==='brood','a Bloater from a cocoon waits at the gathering point ('+(bl&&bl.role)+')');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }''')
    print(r); b.close()
print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
