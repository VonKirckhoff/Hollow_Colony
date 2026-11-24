# The Graft (Nov 2026): your Husk never roots. Once it is whole, the old nest lays a Seedling for it; moving the selected Seedling
# the Husk follows it; F roots the Seedling into the nest that wins the mission. A dead Seedling is laid again (spares by difficulty),
# a fallen Husk after the Seedling is out does not end it, the last seed dead does.
from playwright.sync_api import sync_playwright
errs=[]
JS_START='''()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-graft')); }'''
JS_HUSK='''()=>{ const G=__hc.G; for(let i=0;i<30*40&&!G.vars.hatched;i++) __hc.update(1/30);
  const a=G.avatar; const u=makeUnit('husk','swarm',a.x,a.y); u.stage=HUSK_STAGES.length-1; u.role='avatar'; a.dead=true; setAvatar(u);
  for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit') e.invuln=true; return !!G.vars.hatched; }'''
CASES='''()=>{ const G=__hc.G, V=G.vars, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  const u=G.avatar; step(1);
  ok(!avatarButtons().some(b=>b.tip.startsWith('Take root|Grow a new hive')),'the Husk has no root button of its own');
  const sd=graftSeedling(); ok(!!sd&&sd.type==='seedling'&&V.seedPhase,'the nest laid a Seedling once the Husk was whole');
  ok(/Seedling/.test((G.objectives.find(o=>o.id==='life')||{}).text||''),'the objective speaks of the Seedling ('+(G.objectives.find(o=>o.id==='life')||{}).text+')');
  /* the Husk follows the moved Seedling */
  u.x=sd.x+6*TILE; u.y=sd.y; u.path=null; u.order=null; selectEntities([sd],false); const p0={x:sd.x,y:sd.y};
  let tgt=null; for(let ty=4;ty<60&&!tgt;ty++) for(let tx=4;tx<90&&!tgt;tx++){ if(!walkableT(tx,ty)) continue; const px=(tx+.5)*TILE, py=(ty+.5)*TILE, d=Math.hypot(px-p0.x,py-p0.y); if(d>9*TILE&&d<12*TILE&&!G.ents.some(e=>!e.dead&&e.faction==='corps'&&Math.hypot(e.x-px,e.y-py)<10*TILE)) tgt={x:px,y:py}; }
  swarmRight(tgt.x,tgt.y); step(14); ok(Math.hypot(sd.x-tgt.x,sd.y-tgt.y)<2*TILE,'the Seedling walks where you send it ('+(Math.hypot(sd.x-tgt.x,sd.y-tgt.y)/TILE).toFixed(1)+' left, from '+(Math.hypot(p0.x-tgt.x,p0.y-tgt.y)/TILE).toFixed(1)+', order '+JSON.stringify(sd.order)+' role '+sd.role+')');
  ok(dist(u,sd)<AVATAR.follow*TILE*2.2,'and the Husk walks with it ('+(dist(u,sd)/TILE).toFixed(1)+' tiles)');
  /* the Husk moved on its own: the Seedling stays */
  selectEntities([u],false); const s1={x:sd.x,y:sd.y}; swarmRight(sd.x-5*TILE,sd.y); step(4); ok(Math.hypot(sd.x-s1.x,sd.y-s1.y)<TILE,'moving the Husk leaves the Seedling where it is ('+(Math.hypot(sd.x-s1.x,sd.y-s1.y)/TILE).toFixed(1)+' moved, order '+JSON.stringify(sd.order)+', post '+JSON.stringify(sd.post)+', at '+Math.round(sd.x)+','+Math.round(sd.y)+')');
  /* A and a new gathering point leave it alone */
  ok(!myBrood().includes(sd)&&!idleBrood().includes(sd),'A, H and the gathering point leave the Seedling out');
  /* a dead Seedling comes back */
  const spare=graftSeedSpare(); sd.hp=0; sd.dead=true; step(1); ok(V.seedAt!=null&&V.spareUsed===1,'a dead Seedling: the nest grows another ('+spare+' spare on '+G.diffKey+')');
  step(AVATAR.seedAgain+1); const sd2=graftSeedling(); ok(!!sd2&&sd2!==sd,'after '+AVATAR.seedAgain+' s a new Seedling crawls out');
  /* too close to the old nest: refused; F with it selected on a quiet spot roots it */
  selectEntities([sd2],false); const fb=avatarButtons().find(b=>b.key==='F'); ok(fb&&!fb.off,'F: take root on the card with the Seedling selected');
  fb.act(); ok(sd2.rootT==null,'too close to the old nest: refused');
  /* the Husk falls: the Seedling goes on */
  u.hp=0; u.dead=true; step(1); ok(!G.over&&V.huskLost&&G.sel.includes(sd2),'the Husk falls: not lost, the Seedling is selected');
  let spot=null; const S=SWARM_PLAY.seed; for(let ty=4;ty<60&&!spot;ty++) for(let tx=4;tx<90&&!spot;tx++){ let free=true; for(let y=ty-1;y<=ty+1;y++) for(let x=tx-1;x<=tx+1;x++) if(!walkableT(x,y)) free=false; if(!free) continue;
    const px=(tx+.5)*TILE, py=(ty+.5)*TILE; if(hives().some(h=>Math.hypot(h.x-px,h.y-py)<(S.gap+1)*TILE)) continue; if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&Math.hypot(e.x-px,e.y-py)<(S.clear+2)*TILE)) continue;
    if(G.ents.some(e=>!e.dead&&e.kind==='building'&&Math.hypot(e.x-px,e.y-py)<3*TILE)) continue; spot={x:px,y:py}; }
  sd2.x=spot.x; sd2.y=spot.y; sd2.path=null; sd2.order=null; sd2.post={x:spot.x,y:spot.y}; sd2.invuln=true;
  avatarButtons().find(b=>b.key==='F').act(); ok(sd2.rootT!=null,'a quiet spot: the Seedling digs in');
  step(S.root+2); ok(G.over&&G.won!==false&&(G.swarm.founded||0)===1,'it becomes the nest and the mission is won ('+JSON.stringify(G.over)+')');
  }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }'''
LOSE='''()=>{ const G=__hc.G, V=G.vars, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  step(1); const u=G.avatar; u.hp=0; u.dead=true; step(1); ok(!G.over,'Husk dead, Seedling alive: still going');
  const sd=graftSeedling(); sd.hp=0; sd.dead=true; step(2); ok(G.over&&!G.won,'Husk and Seedling dead: lost');
  }catch(e){ out.push('FAIL error '+e.message); } return out.join('\\n'); }'''
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    for js in (CASES,LOSE):
        pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
        pg.evaluate(JS_START); pg.wait_for_timeout(400); pg.evaluate(JS_HUSK)
        res.append(pg.evaluate(js))
    b.close()
r='\n'.join(res); print(r); print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
