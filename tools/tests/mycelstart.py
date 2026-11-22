# The mycel round every nest that stands there when a mission begins is fully grown from the first moment (Nov 2026), in every
# mission of every campaign; a nest that comes later (a young nest) still grows from CREEP.start. Survives save/load.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    ids=pg.evaluate("()=>[...MISSIONS.map(m=>['MISSIONS',m.id]),...SWARM_MISSIONS.map(m=>['SWARM_MISSIONS',m.id]),...ROGUE_MISSIONS.map(m=>['ROGUE_MISSIONS',m.id]),...Object.values(TRAINING).map(m=>['TRAINING',m.id])]")
    out=[]
    for arr,mid in ids:
        try:
            r=pg.evaluate('''([arr,id])=>{ const m=Object.values(eval(arr)).find(x=>x&&x.id===id); try{ (window.startMission||__hc.startMission)(m); }catch(e){ return 'SKIP '+e.message; } const G=__hc.G; if(!G||G.mission!==m) return 'SKIP not started';
              __hc.update(1/30); const hs=nests().filter(h=>hiveOpt(h,'creep',CREEP.max)>0); if(!hs.length) return 'OK   (no nests with mycel)';
              const bad=hs.filter(h=>h.creepR<hiveOpt(h,'creep',CREEP.max)); const W=G.map.w; let full=0, n=0;
              for(const h of hs){ const R=h.creepR*0.78-1.2, cx=h.x/TILE, cy=h.y/TILE; for(let y=Math.floor(cy-R);y<=Math.ceil(cy+R);y++) for(let x=Math.floor(cx-R);x<=Math.ceil(cx+R);x++){ if(Math.hypot(x+.5-cx,y+.5-cy)>R) continue; const kk=y*W+x; if(!G.map.walk[kk]) continue; n++; if(G.creep[kk]>=0.99) full++; } }
              return (bad.length||full<n?'FAIL ':'OK   ')+hs.length+' nests at full radius, '+full+'/'+n+' tiles inside them filled'; }''',[arr,mid])
        except Exception as e: r='FAIL '+str(e)[:120]
        out.append(r+'  '+arr+' '+mid)
    # a nest that comes later still grows
    r=pg.evaluate('''()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); const G=__hc.G; for(let i=0;i<30;i++) __hc.update(1/30);
      const h=hives()[0], nh=makeBuilding('hive','swarm',h.x+20*TILE,h.y); __hc.update(1/30); const r0=nh.creepR; for(let i=0;i<300;i++) __hc.update(1/30);
      return (r0<=CREEP.start+0.01&&nh.creepR>r0&&nh.creepR<CREEP.max?'OK   ':'FAIL ')+'a nest that comes later grows from '+r0+' (now '+nh.creepR.toFixed(2)+')'; }''')
    out.append(r)
    b.close()
print('\n'.join(out)); print(errs); print('ALL OK' if not any(l.startswith('FAIL') for l in out) and not errs else 'FAILED')
