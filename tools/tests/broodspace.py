# The Brood keeps a little room between its creatures (BROOD_SPACE, Nov 2026):
# thirty Scuttlers and six Brutes sent to one spot (right-click) stand side by side, not on one tile;
# (a creature squeezing past a friend for a moment, ghostT, is left out of the count)
# the same at a gathering point (G) and while waiting there for a while; the Brutes never hide in each other.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-siege')); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
      step(1); const h=hives()[0], T=TILE;
      for(const e of G.ents) if(!e.dead&&e.faction==='corps'){ e.invuln=true; if(e.kind==='unit'){ e.quiet=true; e.order={type:'hold'}; } }   G.swarm.cfg.spareFauna=true;
      for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss&&!e.avatar&&e.role!=='guard') e.dead=true;
      const f=freeTilesNear(Math.floor(h.x/T)+2,Math.floor(h.y/T)+2,40);
      const us=[]; for(let i=0;i<36;i++){ const t=f[i%f.length]; const u=makeUnit(i<30?'drone':'brute','swarm',(t.x+.5)*T,(t.y+.5)*T); u.mine=true; u.role='brood'; u.invuln=true; us.push(u); }
      const check=(lbl)=>{ let over=0, bad=0, perTile=new Map(); const a=us.filter(u=>!u.dead&&!(u.ghostT>0));   /* one squeezing past a friend for a moment (ghostT) does not count */
        for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++){ const d=Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y), m=a[i].r+a[j].r; if(d<m*0.8) over++; if(d<m*0.4) bad++; }
        for(const u of a){ const k=Math.floor(u.x/T)+','+Math.floor(u.y/T); perTile.set(k,(perTile.get(k)||0)+1); }
        const mx=Math.max(...perTile.values()); const br=a.filter(u=>u.type==='brute'); let bh=0; for(let i=0;i<br.length;i++) for(let j=i+1;j<br.length;j++) if(Math.hypot(br[i].x-br[j].x,br[i].y-br[j].y)<br[i].r+br[j].r-4) bh++;
        const det=[]; for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++){ const d=Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y); if(d<(a[i].r+a[j].r)*0.8) det.push(a[i].type+'/'+a[j].type+' d'+d.toFixed(0)+' '+(a[i].order&&a[i].order.type)+'/'+(a[j].order&&a[j].order.type)+' g'+(a[i].ghostT>0?1:0)+(a[j].ghostT>0?1:0)); }
        const gh=us.filter(u=>!u.dead&&u.ghostT>0).length;
        ok(bad===0&&over<=3&&mx<=4&&bh===0&&gh<=3,det.join('; ')+' '+lbl+': '+gh+' squeezing'+': pairs overlapping '+over+' (deep '+bad+'), most on one tile '+mx+', Brutes in each other '+bh); };
      /* everything piled on one spot first, as before the fix */
      for(const u of us){ u.x=h.x+3*T+rand(-2,2); u.y=h.y+3*T+rand(-2,2); }
      const g=freeTilesNear(Math.floor(h.x/T)-7,Math.floor(h.y/T)+1,1)[0], gx=(g.x+.5)*T, gy=(g.y+.5)*T;
      selectEntities(us,false); swarmRight(gx,gy); step(25); check('right-click on one spot');
      step(30); check('still waiting there 30 s later');
      const near=us.filter(u=>Math.hypot(u.x-gx,u.y-gy)<7*T).length; ok(near>=34,'they wait round the clicked spot ('+near+' of 36 within 7 tiles)');
      selectEntities([],false); const g2=freeTilesNear(Math.floor(h.x/T)+6,Math.floor(h.y/T)-2,1)[0]; setRally((g2.x+.5)*T,(g2.y+.5)*T); step(30); check('gathering point (G)');
      const near2=us.filter(u=>Math.hypot(u.x-(g2.x+.5)*T,u.y-(g2.y+.5)*T)<7*T).length; ok(near2>=34,'they wait round the gathering point ('+near2+' of 36 within 7 tiles)');
    }catch(e){ ok(false,'error '+e.stack); } return out; }''')
    for l in r: print(l)
    b.close()
print(errs); print('ALL OK' if all(l.startswith('OK') for l in r) and not errs else 'FAIL')
