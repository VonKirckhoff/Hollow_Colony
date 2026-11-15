# Dead Signal (Nov 2026): a tunnel under each charge nest. Burn the hive and the brood comes up out of its tunnel; the charge's
# collapse closes it. Waves never come out of a shaft that is walled off from their goal (the pocket in the north wall). Must end with ALL OK.
import sys
from playwright.sync_api import sync_playwright
JS='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  __hc.startMission(MISSIONS.find(m=>m.id==='dead-signal')); const G=__hc.G; step(0.5);
  for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit') e.invuln=true;
  const W=G.map.w, tile=e=>[Math.floor(e.x/TILE),Math.floor(e.y/TILE)];
  const under=G.ents.filter(e=>e.type==='shaft'&&e.under), hv=id=>G.ents.find(e=>e.type==='hive'&&tile(e)+''===tile(G.ents.find(s=>s.id===id))+'');
  ok(under.length===3,'three tunnels under the charge nests');
  ok(under.every(s=>G.ents.some(h=>!h.dead&&h.type==='hive'&&Math.hypot(h.x-s.x,h.y-s.y)<TILE)),'each right under its hive');
  ok(under.every(s=>s.heirOf!=null&&Math.hypot(G.ents.find(h=>h.id===s.heirOf).x-s.x,G.ents.find(h=>h.id===s.heirOf).y-s.y)<TILE),'each is its own hive\\'s heir');
  ok(G.ents.filter(e=>e.type==='shaft'&&!e.under).every(s=>s.heirOf==null),'the wall shafts are not heirs (no swarm.shaftHeirs)');
  ok(!spawners().some(s=>s.type==='shaft'),'no tunnel spawns while its hive lives');
  // burn the central hive: its tunnel takes over
  const tc=under.find(s=>Math.abs(tile(s)[1]-16)<2), hc=G.ents.find(e=>e.id===tc.heirOf); kill(hc,null); step(1);
  ok(tc.heir&&spawners().includes(tc),'central hive burnt: its tunnel takes over'); ok(G.msgs.some(m=>/tunnel under it/.test(m.text)),'Kessler says so');
  const wv=launchWave(80,G.api.where({x:47,y:12})); ok(wv.length>0&&wv.some(u=>Math.hypot(u.x-tc.x,u.y-tc.y)<5*TILE),'a wave at the central charge comes out of that tunnel');
  ok(wv.every(u=>u.path&&u.path.length||Math.hypot(u.x-u.order.x,u.y-u.order.y)<3*TILE),'and has a way to the charge');
  for(const u of wv) u.dead=true;
  // the charge blows: the tunnel caves in
  G.api.bury({x:47,y:12},1.6,'cave-s2'); step(1); ok(tc.dead&&!spawners().includes(tc),'the collapse closes the tunnel');
  const ts=under.find(s=>Math.abs(tile(s)[1]-3)<2); ok(!ts.dead,'the other tunnels stay open');
  const wall=G.ents.find(e=>e.type==='shaft'&&!e.under&&tile(e)[0]===31); G.api.bury({x:32,y:3},1.6,'cave-s1'); step(1);
  ok(ts.dead,'the north charge closes the north tunnel'); ok(wall&&!wall.dead,'the wall shaft next to it stays (it is not under a hive)');
  // every hive gone: no wave out of the walled-off shaft in the north wall
  for(const h of G.ents) if(h.type==='hive'&&!h.dead) kill(h,null); for(const s of under) if(!s.dead){ s.dead=true; }
  step(1); const pocket=G.ents.find(e=>e.type==='shaft'&&tile(e)[0]===50&&tile(e)[1]<=2);
  ok(pocket&&!shaftsReaching(G.api.where({x:47,y:12})).includes(pocket),'the shaft in the sealed pocket cannot reach the central site');
  ok(shaftsReaching(G.api.where({x:47,y:12})).length>=2,'the open wall shafts can');
  let bad=0; for(let k=0;k<12;k++){ const w=launchWave(60,G.api.where({x:47,y:12})); if(w.some(u=>Math.hypot(u.x-pocket.x,u.y-pocket.y)<4*TILE)) bad++; for(const u of w) u.dead=true; }
  ok(bad===0,'twelve waves at the central site: none from the pocket');
  bad=0; for(let k=0;k<12;k++){ const w=launchWave(60); if(w.some(u=>Math.hypot(u.x-pocket.x,u.y-pocket.y)<4*TILE)) bad++; for(const u of w) u.dead=true; }
  ok(bad===0,'twelve unaimed waves: none from the pocket');
  }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(1500)
  r=pg.evaluate(JS); print(r); print('errors',errs)
  print('ALL OK' if 'FAIL' not in r and not errs else 'SOME FAILED'); b.close()
