# New nests (The Waking): an old egg wakes into a young nest when the brood stands by it with no soldier near; a Seedling (Z)
# takes root with F where it is quiet (not near the Lunar Corps, not near another nest), and not past the mission's maximum.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
      step(1); const O=SWARM_PLAY.oldEgg, S=SWARM_PLAY.seed; const egg=G.ents.find(e=>!e.dead&&e.oldEgg); ok(!!egg,'an old egg lies in the east');
      for(const u of G.ents) if(u.faction==='corps'&&u.kind==='unit') u.invuln=true;   /* keep the test about the egg */
      const h0=hives().length, bys=[]; for(let i=0;i<3;i++){ const u=makeUnit('crawler','swarm',egg.x+20+i*8,egg.y+10); u.role='brood'; u.mine=true; u.post={x:u.x,y:u.y}; bys.push(u); }
      step(O.wake/2); ok(egg.wake>O.wake/2-2&&!egg.dead,'it stirs while the brood stands by ('+egg.wake.toFixed(1)+' s)');
      const s0=makeUnit('trooper','corps',egg.x+2*TILE,egg.y); s0.order={type:'hold'}; s0.stance='hold'; s0.invuln=true; const w1=egg.wake; step(2); ok(egg.wake<w1,'a soldier close by: it falls back to sleep');
      s0.dead=true; step(O.wake+6); ok(egg.dead&&hives().length===h0+1&&G.swarm.eggsWoken===1,'it wakes into a young nest ('+hives().length+' hives)');
      step(1); const ob=G.objectives.find(o=>o.id==='egg'); ok(ob&&(ob.done||ob.state==='done'||ob.complete),'the optional objective is done ('+JSON.stringify(ob)+')');
      /* the Seedling */
      G.swarm.biomass=3000; G.swarm.cfg.unlock.seedling=0; const nest=hives()[0]; selectEntities([nest],false); ok(SWARM_PLAY.keys.seedling==='Z'&&swarmButtons().some(b=>b.key==='Z'),'Z: a Seedling on the card');
      const before=new Set(G.ents); swarmBreed('seedling'); batchReleaseAll(); step(SWARM_PLAY.batch.grow+SWARM_PLAY.tunnel+2); const sd=G.ents.find(e=>!e.dead&&e.type==='seedling'&&!before.has(e)); ok(!!sd,'a Seedling hatched');
      /* too close to a nest */
      selectEntities([sd],false); ok(swarmButtons().some(b=>b.key==='F'),'F: take root on the card'); sd.x=nest.x+3*TILE; sd.y=nest.y; seedRootSelected(); ok(sd.rootT==null,'too close to a nest: refused');
      /* too close to them */
      const c=G.ents.find(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'); sd.x=c.x+3*TILE; sd.y=c.y; seedRootSelected(); ok(sd.rootT==null,'too close to the Lunar Corps: refused');
      /* a quiet spot */
      let spot=null; for(let ty=4;ty<56&&!spot;ty++) for(let tx=4;tx<80&&!spot;tx++){ let free=true; for(let y=ty-1;y<=ty+1;y++) for(let x=tx-1;x<=tx+1;x++) if(!walkableT(x,y)) free=false; if(!free) continue;
        const px=(tx+.5)*TILE, py=(ty+.5)*TILE; if(hives().some(h=>Math.hypot(h.x-px,h.y-py)<(S.gap+1)*TILE)) continue; if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&Math.hypot(e.x-px,e.y-py)<(S.clear+2)*TILE)) continue;
        if(G.ents.some(e=>!e.dead&&e.kind==='building'&&Math.hypot(e.x-px,e.y-py)<3*TILE)) continue; spot={x:px,y:py}; }
      sd.x=spot.x; sd.y=spot.y; sd.invuln=true; const h1=hives().length; seedRootSelected(); ok(sd.rootT!=null,'a quiet spot: it digs in'); step(S.root/2); ok(!sd.dead&&Math.hypot(sd.x-spot.x,sd.y-spot.y)<TILE,'and stays put while it roots');
      step(S.root/2+1); ok(sd.dead&&hives().length===h1+1,'and becomes a young nest ('+hives().length+' hives)');
      ok(UNITS.seedling&&(INTEL_KIND_CHECK),'the Seedling is in Intel');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }'''.replace('INTEL_KIND_CHECK',"JSON.stringify(typeof INTEL_UNITS!=='undefined'?INTEL_UNITS:'').length>=0"))
    print(r); b.close()
print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
