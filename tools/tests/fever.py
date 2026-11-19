# The Fever: the sweep team's circle at every hive has a clear line of fire to it (no rock wall in between) and every hive burns in time.
from playwright.sync_api import sync_playwright
JS='''()=>{ const out=[]; resetRogue(); __hc.startMission(ROGUE_MISSIONS.find(m=>m.id==='rogue-the-fever')); const G=__hc.G;
 const step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); };
 step(1); for(const e of G.ents) if(e.crew){ e.invuln=true; } for(const e of G.ents) if(e.faction==='loyal') e.invuln=true;
 G.vars.cured=true; let last=null, lastLog=0;
 for(let t=0;t<900&&!G.over;t+=1){ step(1); const S=G.vars.sw; if(!S) continue; const h=hives().find(h=>dist(h,ptWorld(S.k))<2*TILE);
   if(!last||last!==S.k){ last=S.k; out.push(`t=${Math.round(G.time)} hive ${S.k} spot ${(S.x/TILE).toFixed(1)},${(S.y/TILE).toFixed(1)} blocked=${h?fireBlocked({x:S.x,y:S.y},h):'-'} d=${h?(dist(h,S)/TILE).toFixed(1):'-'}`); }
   if(G.time-lastLog>30){ lastLog=G.time; out.push(`  t=${Math.round(G.time)} ${S.k} ${S.state} hp=${h?Math.round(h.hp/h.maxHp*100):'dead'}`); } }
 out.push('hives left '+hives().length); return out.join('\\n'); }'''
import re
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ for(const m of MISSIONS) recordWin(m.id,'normal',500,false); }")
    r=pg.evaluate(JS); print(r); b.close()
ok='blocked=true' not in r and len(re.findall('hive . spot',r))==5 and 'hives left 0' in r
print('ALL OK' if ok else 'SOME FAILED')
