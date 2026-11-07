# Swarm AI flank: the swing point and the way to it stay out of reach of the Lunar Corps; flankers walk there (move) without stopping.
# The Matriarch is gone: no unit, a Husk with many kills stays a Husk, no kill tally.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }"); pg.wait_for_timeout(400)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
      step(2); const corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'&&e.def.damage); const c=corps[0];
      let tries=0, good=0, direct=0;
      for(let k=0;k<12;k++){ const a=k/12*Math.PI*2, sx=c.x+Math.cos(a)*22*TILE, sy=c.y+Math.sin(a)*22*TILE; const f=nearestWalkable(Math.floor(sx/TILE),Math.floor(sy/TILE)); if(!f) continue;
        const us=[]; for(let i=0;i<8;i++){ const u=makeUnit('crawler','swarm',(f.x+.5)*TILE,(f.y+.5)*TILE); u.role='wave'; u.order={type:'amove',x:c.x,y:c.y}; us.push(u); }
        const plan=waveTactic(us,'flank'); tries++;
        if(plan==='direct'){ direct++; } else { const fl=us.filter(u=>u.viaGoal);
          const threats=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.def&&e.def.damage&&e.def.range);
          const safe=fl.every(u=>u.order.type==='move'&&threats.every(e=>Math.hypot(e.x-u.order.x,e.y-u.order.y)>(e.def.range+(e.rangeBonus||0)+TACTICS.flankClear)*TILE-40));
          if(safe&&fl.length===4) good++; }
        for(const u of us) u.dead=true; }
      ok(good+direct===tries&&good>0,'flank: every swing point out of reach ('+good+' flanks, '+direct+' fell back to direct, of '+tries+')');
      ok(!UNITS.matriarch&&!INTEL_TEXT_HAS_M,'no Matriarch unit');
      const h=makeUnit('husk','swarm',c.x+30*TILE,c.y); h.stage=HUSK_STAGES.length-1; for(let i=0;i<8;i++) huskScream(h); step(2);
      ok(!h.dead&&h.type==='husk'&&!G.ents.some(e=>!e.dead&&e.type==='matriarch'),'a Husk with 8 kills stays a Husk');
      ok(typeof drawKillTally==='undefined'&&typeof becomeMatriarch==='undefined','kill tally and Matriarch code gone');
      }catch(e){ out.push('FAIL error '+e.message); } return out.join('\\n'); }'''.replace('INTEL_TEXT_HAS_M',"JSON.stringify(typeof INTEL!=='undefined'?INTEL:{}).includes('matriarch')"))
    print(r); b.close()
print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
