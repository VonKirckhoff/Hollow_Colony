# The Graft (Nov 2026): your Husk never roots. Once it is whole, the old nest lays a Seedling for it; moving the selected Seedling
# the Husk follows it; F roots the Seedling into the nest that wins the mission. A dead Seedling is laid again (spares by difficulty),
# a fallen Husk after the Seedling is out does not end it, the last seed dead does.
# No Twitcher (Nov 2026): the cocoon opens on a Shambler; a grazer your Shambler or your Husk kills leaves a carcass.
from playwright.sync_api import sync_playwright
errs=[]
JS_START='''()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-graft')); }'''
JS_HUSK='''()=>{ const G=__hc.G; for(let i=0;i<30*40&&!G.vars.hatched;i++) __hc.update(1/30);
  const a=G.avatar; const u=makeUnit('husk','swarm',a.x,a.y); u.stage=HUSK_STAGES.length-1; u.role='avatar'; a.dead=true; setAvatar(u);
  for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit') e.invuln=true; return !!G.vars.hatched; }'''
CASES='''()=>{ const G=__hc.G, V=G.vars, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  { const st=ptWorld('1'); }
  const b0=G.swarm.biomass; ok(broodCap()===10,'the whole Brood from the start: limit 10 ('+broodCap()+')');
  const u=G.avatar; step(1);
  ok(broodCap()===10+GRAFT_BROOD.cap&&G.swarm.biomass>=b0+GRAFT_BROOD.biomass-1,'the Seedling is out: limit '+broodCap()+', biomass '+Math.round(G.swarm.biomass)+' (was '+Math.round(b0)+')');
  ok(!broodUnlocked('brute')&&broodUnlocked('spitter'),'Spitters now, no Brutes yet');
  { const t0=G.time; G.time+=GRAFT_BROOD.brute+1; ok(broodUnlocked('brute'),'Brutes after '+GRAFT_BROOD.brute+' s'); G.time=t0; }
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
  { const p0={x:sd.x,y:sd.y}; sd.x=tgt.x; sd.y=tgt.y; sd.post={x:sd.x,y:sd.y}; sd.path=null; sd.order=null; makeBody({x:sd.x+2*TILE,y:sd.y,def:UNITS.trooper,face:1}); const bd=G.ents[G.ents.length-1]; ok(creepAt(bd.x,bd.y)<CREEP.at,'(a body off the mycel next to the Seedling)'); step(8); ok(sd.claim!==bd&&!sd.haul&&bd.carrier!==sd,'the Seedling never goes to fetch a body'); bd.dead=true; }
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
  step(S.root+2); ok(!G.over&&(G.swarm.founded||0)===1&&G.vars.rooted,'it becomes the nest, but soldiers still live: not won yet');
  ok(/left/.test((G.objectives.find(o=>o.id==='purge')||{}).text||''),'the objective counts the soldiers ('+(G.objectives.find(o=>o.id==='purge')||{}).text+')');
  for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.graftPost==='tunnel'){ e.invuln=false; kill(e,null); } step(1);
  ok(!G.over,'the tower still stands: not won');
  kill(graftRelay(),null); step(1); for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='corps'){ e.invuln=false; kill(e,null); } for(const l of G.ents) if(l.type==='lz') l.flight=null; step(1);
  ok(G.over&&G.over.win,'every soldier dead and the nest stands: won ('+JSON.stringify(G.over)+')');
  }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }'''
LOSE='''()=>{ const G=__hc.G, V=G.vars, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  step(1); const u=G.avatar; u.hp=0; u.dead=true; step(1); ok(!G.over,'Husk dead, Seedling alive: still going');
  const sd=graftSeedling(); sd.hp=0; sd.dead=true; step(2); ok(G.over&&!G.won,'Husk and Seedling dead: lost');
  }catch(e){ out.push('FAIL error '+e.message); } return out.join('\\n'); }'''
STAGES='''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  ok(!HUSK_STAGES.some(s=>s.name==='Twitcher'),'no Twitcher stage left');
  { const st=ptWorld('1'), n=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&Math.hypot(e.x-st.x,e.y-st.y)<6*TILE).length; ok(n===14,'fourteen soldiers at the station ('+n+')'); }
  for(let i=0;i<30*60&&!(G.avatar&&G.avatar.type==='cocoon');i++){ const a=G.avatar, b=G.vars.body; if(a&&a.type==='grafter'&&b){ a.order={type:'move',x:b.x,y:b.y}; setPath(a,b.x,b.y); } __hc.update(1/30); }
  ok(G.avatar&&G.avatar.type==='cocoon','your Grafter turned the body into a cocoon');
  for(let i=0;i<30*40&&G.avatar&&G.avatar.type==='cocoon';i++) __hc.update(1/30);
  const u=G.avatar; ok(u&&u.type==='husk'&&u.stage===0&&avatarStage()==='shambler','the cocoon opens on a Shambler ('+avatarStage()+')');
  for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit') e.invuln=true;
  const g1=makeUnit('grazer','wild',u.x+20,u.y); const n0=G.ents.filter(e=>e.kind==='body').length; damage(g1,9999,u); step(0.2);
  ok(G.ents.some(e=>e.kind==='body'&&!e.dead&&e.fauna&&Math.hypot(e.x-g1.x,e.y-g1.y)<TILE),'a grazer your Shambler kills leaves a carcass');
  u.stage=HUSK_STAGES.length-1; const g2=makeUnit('grazer','wild',u.x+20,u.y); damage(g2,9999,u); step(0.2);
  ok(G.ents.some(e=>e.kind==='body'&&!e.dead&&e.fauna&&Math.hypot(e.x-g2.x,e.y-g2.y)<TILE),'a grazer your Husk kills leaves a carcass');
  const h=makeUnit('husk','swarm',u.x+60,u.y+60); huskHatched(h); ok(h.stage===HUSK_STAGES.length-1&&!h.stageName,'a Husk of the Brood crawls out full grown');
  }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }'''
RELAY='''()=>{ const G=__hc.G, V=G.vars, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
  step(1); const r=graftRelay(); ok(!!r&&r.clickOnly&&r.ty<12,'a Relay Tower in the north cavern ('+(r&&r.tx)+','+(r&&r.ty)+')');
  ok(graftGarrison().length===14&&G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.graftPost==='tunnel').length===2,'fourteen in the garrison, two in the tunnel');
  ok(!!G.ents.find(e=>!e.dead&&e.type==='lz'),'a Landing Zone at the station');
  /* the brood leaves the tower alone until you send it */
  const ds=[]; for(let i=0;i<3;i++){ const d=makeUnit('drone','swarm',r.x+30+i*10,r.y+40); d.role='brood'; d.mine=true; d.post={x:d.x,y:d.y}; ds.push(d); }
  const hp0=r.hp; step(6); ok(r.hp===hp0&&!ds.some(d=>d.target===r),'brood next to the tower leaves it alone');
  { const far=[]; for(let i=0;i<4;i++){ const d=makeUnit('crawler','swarm',r.x-3*TILE+i*12,r.y+3*TILE); d.role='wave'; d.mine=true; far.push(d); }
    const d0=far.map(d=>dist(d,r)); step(8); ok(far.every(d=>d.target!==r&&!(d.order&&Math.hypot(d.order.x-r.x,d.order.y-r.y)<4*TILE)),'brood out hunting does not go and gather at the tower '+JSON.stringify(far.map((d,i)=>[Math.round(d0[i]/TILE),Math.round(dist(d,r)/TILE),d.order&&d.order.type,d.order&&Math.round(d.order.x/TILE),d.order&&Math.round(d.order.y/TILE),d.target&&d.target.type]))); for(const d of far) d.dead=true; }
  selectEntities(ds,false); swarmRight(r.x,r.y); step(3); ok(r.hp<hp0,'right-clicked: they tear at it ('+Math.round(r.hp)+'/'+Math.round(hp0)+')');
  for(const d of ds) d.dead=true;
  /* the tower is hurt: a repair team with an Engineer */
  step(1); const lz=G.ents.find(e=>e.type==='lz'); ok(lz.flight&&lz.flight.cargo.includes('engineer')&&lz.flight.cargo.length===4,'the tower is hurt: an Engineer and three Troopers are on their way ('+(lz.flight&&lz.flight.cargo)+')');
  for(let i=0;i<30*(GRAFT_CORPS.call+120)&&!(r.hp>=r.maxHp);i++) __hc.update(1/30);
  const rt=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.graftPost==='repair'); ok(rt.length===4&&rt.some(e=>e.type==='engineer'),'the repair team is down ('+rt.map(e=>e.type)+')');
  ok(r.hp>=r.maxHp&&rt.every(e=>dist(e,r)<12*TILE),'they walked to the tower and mended it ('+Math.round(r.hp)+'/'+r.maxHp+')');
  /* the garrison loses two: not enough for a ship; four: a ship brings them back, shielded */
  let tr=graftGarrison().filter(u=>u.type==='trooper'&&!u.invuln).slice(0,2); for(const u of tr) kill(u,null); step(2);
  ok(!lz.flight,'two lost: no ship yet (never in ones and twos)');
  tr=graftGarrison().filter(u=>u.type==='trooper'&&!u.invuln).slice(0,2); for(const u of tr) kill(u,null); step(1);
  ok(lz.flight&&lz.flight.cargo.length===4,'four lost: a ship with four is on its way');
  const before=new Set(G.ents); for(let i=0;i<30*(GRAFT_CORPS.call+25)&&graftGarrison().length<14;i++) __hc.update(1/30); step(1);
  const nw=graftGarrison().filter(u=>!before.has(u)); ok(graftGarrison().length===14&&nw.length===4,'they land and join the garrison ('+graftGarrison().length+')');
  { const u=nw[0], h=u.hp; damage(u,50,null); ok(u.invuln&&u.hp===h,'off the ship: they cannot be hurt'); step(GRAFT_CORPS.safe+1); damage(u,10,null); ok(!u.invuln&&u.hp<h,'after '+GRAFT_CORPS.safe+' s they can'); }
  /* the tunnel two are not replaced */
  for(const u of G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.graftPost==='tunnel')) kill(u,null); step(2); ok(G.ents.filter(e=>e.type==='lz'&&e.flight).length===0,'the tunnel patrol is not replaced');
  /* the tower falls: no more ships */
  kill(r,null); step(1); ok(V.cut&&G.objectives.find(o=>o.id==='relay').state==='done','the tower is down: objective done');
  kill(graftGarrison()[0],null); step(3); ok(!G.ents.some(e=>e.type==='lz'&&e.flight),'no tower: no ship for the next loss');
  }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }'''
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate(JS_START); pg.wait_for_timeout(400); res.append(pg.evaluate(STAGES))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate(JS_START); pg.wait_for_timeout(400); res.append(pg.evaluate(RELAY))
    for js in (CASES,LOSE):
        pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
        pg.evaluate(JS_START); pg.wait_for_timeout(400); pg.evaluate(JS_HUSK)
        res.append(pg.evaluate(js))
    b.close()
r='\n'.join(res); print(r); print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
