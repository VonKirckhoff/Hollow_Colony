# The Waking (Nov 2026): once the east nest (a) is ash too and a young nest keeps the Brood alive, the squad holds at the east cavern,
# a relief team with a Medic lands and walks to them, they wait until everyone is at full health (the Medic patches himself too),
# then all fall back to the station by the LZ and stay there.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, g=G.api, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), R=WAKING_REGROUP;
      const step=s=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'){ e.dead=true; } } };
      const near=(at,r)=>{ const q=ptWorld(at); return g.corps().every(e=>Math.hypot(e.x-q.x,e.y-q.y)<=r*TILE); };
      const until=(f,s)=>{ for(let i=0;i<s*30&&!G.over&&!f();i++){ __hc.update(1/30); for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm') e.dead=true; } return f(); };
      try{
      step(1); G.swarm.biomass=0; G.swarm.cfg.rate=0;
      /* a young nest far in the west, out of everyone's way */
      const egg=G.ents.find(e=>!e.dead&&e.oldEgg); const yn=makeBuilding('hive','swarm',Math.floor(egg.x/TILE)-2,Math.floor(egg.y/TILE)+1,true); yn.invuln=true;
      /* the story so far: doors blown, both old nests burnt, Dust at the east cavern */
      Object.assign(G.vars,{station:1,drop1:1,breach:true,live:true,open:true,push:true,east:true,drop2:1,go2:true});
      const old=['vars.drop1=g.time','vars.breach=true','vars.live=true','vars.open=true','vars.push=true','vars.east=true','vars.drop2=g.time','vars.go2=true','engLost','vars.station=g.time'];
      for(const t of G.triggers) if(old.some(k=>t.do.toString().includes(k))) t.fired=true;
      blowWall('north'); for(const h of hives()) if(h!==yn) kill(h,null);
      const a=ptWorld('a'); for(const u of g.corps()){ u.x=a.x+rand(-40,40); u.y=a.y+rand(-40,40); u.order=null; u.path=null; }
      for(const u of g.corps()) if(u.def.heal) u.dead=true;   /* no Medic in Dust: the relief brings one */
      const n0=g.corps().length; step(2);
      ok(G.vars.regroup&&g.inbound()>0,'both old nests ash, a young nest breathes: relief called ('+g.inbound()+' inbound)');
      ok(!G.over,'the mission goes on');
      until(()=>G.vars.met,90);
      ok(G.vars.met,'the relief team walks up to the squad and they count as together');
      ok(g.corps().length>n0&&g.corps().some(e=>e.def.heal),'the relief brought a Medic ('+g.corps().length+' soldiers)');
      ok(!G.vars.home,'they do not leave yet');
      /* hurt everyone, the Medic too */
      for(const u of g.corps()) u.hp=Math.max(1,u.maxHp*0.4);
      step(6); ok(!G.vars.home,'hurt men: they stay and heal');
      const med=g.corps().find(e=>e.def.heal); ok(med.hp>med.maxHp*0.4+1,'the Medic patches himself up ('+Math.round(med.hp)+'/'+med.maxHp+')');
      ok(until(()=>G.vars.home,180),'everyone whole: they fall back');
      ok(g.corps().every(e=>e.hp>=e.maxHp-0.5),'every man is at full health when they go');
      ok(until(()=>near(R.home,R.homeR),120),'they reach the station by the LZ');
      step(30); ok(near(R.home,R.homeR+1),'and stay there');
      /* someone pulled away walks back */
      const u=g.corps()[0]; u.x=a.x; u.y=a.y; u.order=null; u.path=null; u.target=null;
      ok(until(()=>near(R.home,R.homeR+1),90),'a straggler walks back to the base');
      ok(!G.over,'no end yet: the Brood still has to kill them');
      }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }''')
    print(r); b.close()
print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
