# mission.buildMax (Nov 2026, Dust Landing: buildMax:{ sentry:2 }): the Engineers may build that many Sentry Guns in all the mission;
# a destroyed one does not free a place; packing one up and setting it down again is no new build. Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
JS='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++){ for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; __hc.update(1/30); } };
 try{ __hc.startMission(MISSIONS.find(m=>m.id==='dust-landing')); const G=__hc.G; step(0.5); G.vars.ambushAt=1e9; G.salvage=1000;
  const e=G.api.spawn('engineer',{x:45,y:37},1)[0]; step(0.5); selectEntities([e]);
  ok(buildMaxOf('sentry')===2&&!atBuildMax('sentry'),'Dust Landing allows 2 Sentry Guns');
  const build=(tx,ty)=>{ startPlacing('sentry'); if(!ui.placing) return false; ui.mouse.wx=(tx+.5)*TILE; ui.mouse.wy=(ty+.5)*TILE; tryPlace(false); return true; };
  ok(build(42,36),'first ordered'); ok(buildsSpent('sentry')===1,'an order on its way counts (1/2)'); for(let i=0;i<40&&!G.ents.some(x=>x.type==='sentry'&&x.built&&!x.dead);i++) step(1);
  const s1=G.ents.find(x=>x.type==='sentry'&&!x.dead); ok(s1&&s1.built,'first built');
  ok(build(48,36),'second ordered'); for(let i=0;i<40&&G.ents.filter(x=>x.type==='sentry'&&x.built&&!x.dead).length<2;i++) step(1);
  ok(G.ents.filter(x=>x.type==='sentry'&&x.built&&!x.dead).length===2,'second built'); ok(atBuildMax('sentry'),'2/2: at the maximum');
  const s0=G.salvage; ok(!build(45,39)&&G.salvage===s0,'a third one is refused, no salvage spent');
  kill(s1,null); step(0.5); ok(atBuildMax('sentry'),'one destroyed: still no new one'); ok(!build(45,39),'still refused');
  const s2=G.ents.find(x=>x.type==='sentry'&&x.built&&!x.dead); selectEntities([e]); e.order={type:'pack',target:s2}; for(let i=0;i<20&&!e.carry;i++) step(0.5); ok(!!e.carry,'packed up');
  selectEntities([e]); startPlacing('sentry',true); ok(!!ui.placing,'deploying the carried one is allowed'); ui.mouse.wx=(42.5)*TILE; ui.mouse.wy=(33.5)*TILE; tryPlace(false);
  for(let i=0;i<30&&!G.ents.some(x=>x.type==='sentry'&&x.built&&!x.dead);i++) step(1); ok(G.ents.some(x=>x.type==='sentry'&&x.built&&!x.dead)&&buildsSpent('sentry')===2,'set down again, still 2/2');
  ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); ok(atBuildMax('sentry'),'the count survives save/load'); goMenu('menu');
 }catch(err){ out.push('FAIL error '+err.message+' '+(err.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ ui.roster=ui.roster||{}; ui.roster.self=ui.roster.self||{name:'Test',sex:'m'}; }")
    r=pg.evaluate(JS); print(r); b.close()
print('errors',errs[:5]); print('ALL OK' if 'FAIL' not in r and not errs else 'SOME FAILED')
