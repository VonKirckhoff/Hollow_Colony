# The Waking (Nov 2026): the Relay Tower on the west end of the station platform. It stands clear of the ship's hull and ramp,
# an idle Engineer mends it, and once the Brood tears it down no ship is called any more and one still far out turns back.
# Without the relay the squad gathers and heals with its own Medic after the east nest (or goes straight back without one), and the end still comes.
from playwright.sync_api import sync_playwright
import sys
errs=[]
JS_HEAD='''const G=__hc.G, g=G.api, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), R=WAKING_REGROUP;
  const clean=()=>{ for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm') e.dead=true; };
  const step=s=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); clean(); } };
  const until=(f,s)=>{ for(let i=0;i<s*30&&!G.over&&!f();i++){ __hc.update(1/30); clean(); } return f(); };
  const relay=()=>G.ents.find(e=>!e.dead&&e.type==='relay'&&e.faction==='corps');
  const lz=G.ents.find(e=>!e.dead&&e.type==='lz');
  const skip=keys=>{ for(const t of G.triggers) if(keys.some(k=>t.do.toString().includes(k))) t.fired=true; };'''
def run(pg,body):
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(300)
    return pg.evaluate("()=>{ "+JS_HEAD+" try{ "+body+" }catch(e){ out.push('FAIL error '+e.message+' '+e.stack.split('\\n')[1]); } return out.join('\\n'); }")
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    res=[]
    # 1: where it stands, the Engineer mends it, the radio
    res.append(run(pg,'''step(1); const t=relay(); ok(!!t&&t.tx===36&&t.ty===34,'a Relay Tower stands on the west end of the platform ('+(t&&[t.tx,t.ty])+')');
      const hd=padHeading(lz), k=SHIP.size3d, cx=lz.x/TILE, cy=lz.y/TILE; let hit=0;
      for(let j=0;j<2;j++) for(let i=0;i<2;i++){ const dx=t.tx+i+.5-cx, dy=t.ty+j+.5-cy, u=dx*Math.cos(hd)+dy*Math.sin(hd), v=-dx*Math.sin(hd)+dy*Math.cos(hd); if(u>-2.1*k-1&&u<1.95*k+1&&Math.abs(v)<1.5*k+1) hit++; }
      ok(hit===0,'clear of the dropship hull, with a tile to spare');
      const rf=rampFoot(lz); ok(Math.hypot(rf.x-t.x,rf.y-t.y)>=4*TILE,'clear of the ramp foot ('+(Math.hypot(rf.x-t.x,rf.y-t.y)/TILE).toFixed(1)+' tiles)');
      ok(Math.hypot(t.x-lz.x,t.y-lz.y)>=8*TILE,'far from the LZ ('+(Math.hypot(t.x-lz.x,t.y-lz.y)/TILE).toFixed(1)+' tiles)');
      ok(G.objectives.some(o=>o.id==='relay'&&o.optional),'an optional objective to tear it down');
      for(const u of g.corps()) u.invuln=true;
      const e=makeUnit('engineer','corps',t.x+2*TILE,t.y+TILE); e.order=null; t.hp=t.maxHp*0.5; const h0=t.hp; step(15); ok(t.hp>h0+20,'an idle Engineer mends it ('+Math.round(h0)+' -> '+Math.round(t.hp)+')');
      e.dead=true; kill(t,null); step(1); ok(G.vars.cut&&G.objectives.find(o=>o.id==='relay').state==='done','torn down: the radio is cut, the objective is done');
      skip(['vars.station=g.time']); G.vars.station=G.time-40; step(2); ok(G.vars.drop1&&g.inbound()===0&&G.vars.noDoor,'no first drop: no Engineer, the doors stay shut');
      ok(!/more will come/.test(G.objectives.find(o=>o.id==='kill').text),'the objective no longer says more will come');
      for(const u of g.corps()){ u.invuln=false; kill(u,null); } step(3); ok(G.over&&G.over.win,'they all fall: the Brood wins'); '''))
    # 2: a ship far out turns back, one already coming in still lands
    res.append(run(pg,'''step(1); for(const u of g.corps()) u.invuln=true; skip(['vars.station=g.time']); G.vars.station=G.time-40; step(1);
      ok(g.inbound()>0&&lz.flight.t>5,'first drop on its way ('+g.inbound()+')'); kill(relay(),null); step(1); ok(g.inbound()===0&&!lz.flight,'relay down: the ship far out turns back');
      step(25); ok(!g.corps().some(e=>e.type==='engineer'),'and nobody lands'); '''))
    res.append(run(pg,'''step(1); for(const u of g.corps()) u.invuln=true; skip(['vars.station=g.time']); G.vars.station=G.time-40; step(1);
      lz.flight.t=3; kill(relay(),null); step(1); ok(!!lz.flight||lz.ship,'a ship already coming in still lands'); step(20); ok(g.corps().some(e=>e.type==='engineer'),'its men are on the ground'); '''))
    # 3: no relay at the regroup: gather, heal with their own Medic, back to the station; without a Medic straight back
    for medic in ('true','false'):
        res.append(run(pg,'''step(1); G.swarm.biomass=0; G.swarm.cfg.rate=0; const MED='''+medic+''';
          const egg=G.ents.find(e=>!e.dead&&e.oldEgg); const yn=makeBuilding('hive','swarm',Math.floor(egg.x/TILE)-2,Math.floor(egg.y/TILE)+1,true); yn.invuln=true;
          Object.assign(G.vars,{station:1,drop1:1,breach:true,live:true,open:true,push:true,east:true});
          skip(['vars.drop1=g.time','vars.breach=true','vars.live=true','vars.open=true','vars.push=true','vars.east=true','vars.drop2=g.time','vars.go2=true','engLost','vars.station=g.time']);
          blowWall('north'); kill(relay(),null); for(const h of hives()) if(h!==yn) kill(h,null);
          const a=ptWorld('a'); for(const u of g.corps()){ u.x=a.x+rand(-40,40); u.y=a.y+rand(-40,40); u.order=null; u.path=null; if(!MED&&u.def.heal) u.dead=true; }
          step(2); ok(G.vars.regroup&&G.vars.alone&&g.inbound()===0,(MED?'[Medic] ':'[no Medic] ')+'both nests ash, no relay: no relief called');
          for(const u of g.corps()) u.hp=Math.max(1,u.maxHp*0.5);
          ok(until(()=>G.vars.met,30),'they gather');
          if(MED){ step(5); ok(!G.vars.home,'hurt: they stay with their Medic'); ok(until(()=>G.vars.home,240),'healed: they fall back'); ok(g.corps().every(e=>e.hp>=e.maxHp-0.5),'every man whole'); }
          else { ok(until(()=>G.vars.home,10),'no Medic: straight back to the station'); }
          const q=ptWorld(R.home); ok(until(()=>g.corps().every(e=>Math.hypot(e.x-q.x,e.y-q.y)<=R.homeR*TILE),120),'they reach the station');
          ok(!G.vars.medCalled,'no Medic is called'); '''))
    # 4: a picture in 3D with the ship on the pad
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(300)
    pg.evaluate('''()=>{ const G=__hc.G; for(const u of G.ents) if(u.faction==='corps'&&u.kind==='unit') u.invuln=true; for(const t of G.triggers) if(t.do.toString().includes('vars.station=g.time')) t.fired=true; G.vars.station=G.time-40;
      for(let i=0;i<30*22;i++){ __hc.update(1/30); } const lz=G.ents.find(e=>e.type==='lz'); for(const e of G.ents) if(e.faction==='corps'&&e.kind==='unit'){ e.x=lz.x-4*TILE; e.y=lz.y-3*TILE; } __hc.update(1/30); centerOn(lz.x-4*TILE,lz.y-TILE); window._shipOk=!!lz.ship; }''')
    pg.keyboard.press('F3'); pg.wait_for_timeout(1500)
    print('ship on pad for the picture:',pg.evaluate("()=>window._shipOk"))
    pg.screenshot(path='/tmp/waking_relay3d.png'); pg.keyboard.press('F3'); pg.wait_for_timeout(500); pg.screenshot(path='/tmp/waking_relay2d.png')
    b.close()
r='\n'.join(res); print(r); print(errs); print('ALL OK' if 'FAIL' not in r and not errs else 'FAILED')
