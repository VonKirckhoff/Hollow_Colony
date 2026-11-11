# Sight and rock (Nov 2026): a rock wall blocks what a soldier sees, the wall itself is seen, crater rims do not block, the plateau sees over the cliff.
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }"); pg.wait_for_timeout(300)
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map, W=m.w, T=(x,y)=>m.tiles[y*W+x];
      G.ents.filter(e=>e.faction==='corps'&&!e.dead).forEach(e=>{ e.x=-9999; e.y=-9999; });   /* nobody else looks */
      for(let y=5;y<m.h-5;y++) for(let x=5;x<m.w-8;x++){ if(m.walk[y*W+x]&&m.walk[y*W+x+1]&&T(x+2,y)==='#'&&m.walk[y*W+x+4]&&m.walk[y*W+x+5]&&T(x+2,y-1)==='#'&&T(x+2,y+1)==='#'&&T(x+3,y)==='#'){
        const u=makeUnit('trooper','corps',(x+.5)*TILE,(y+.5)*TILE); G.seen.fill(0); computeFog(); const k=y*W+x+5, wall=y*W+x+2;
        const behind=G.vis[k], wallSeen=G.vis[wall]; SIGHT.rockBlocks=false; G.seen.fill(0); computeFog(); const off=G.vis[k]; SIGHT.rockBlocks=true; u.dead=true; return [x,y,behind,wallSeen,off]; } } return null; }""")
    check('rock wall hides what is behind it', r and r[2]==0, r)
    check('the wall itself is seen', r and r[3]==1, r)
    check('without the rule he sees all round', r and r[4]==1, r)
    r=J(pg,"""()=>{ const rows=['............','............','&&&&&%......','............','............'], m={ w:12, h:5, tiles:rows.join('').split('') };
      const hi=sightMask(m,2,2,6), lo=sightMask(m,8,2,6); return [hi.includes(2*12+8)?1:0, lo.includes(2*12+2)?1:0]; }""")
    check('from the plateau you see down over the cliff', r and r[0]==1, r)
    check('from below the cliff blocks the view up', r and r[1]==0, r)
    r=J(pg,"""()=>{ for(const id of ['canyons','high','depths','mare','maw','convoy','hollow','kappa']){ const m=loadMap(id), W=m.w, T=(x,y)=>m.tiles[y*W+x];
        for(let y=3;y<m.h-3;y++) for(let x=3;x<m.w-4;x++) if(m.walk[y*W+x]&&T(x+1,y)===')'&&m.walk[y*W+x+2]){ return [id,x,y,sightMask(m,x,y,5).includes(y*W+x+2)?1:0]; } } return null; }""")
    check('a crater rim does not block', r and r[3]==1, r)
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
