# Playing the Swarm: your own brood never goes hunting by itself.
# A carrier sent with A brings a body home and then waits at that hive as brood (also with a gathering point set elsewhere),
# a body lying near that hive is fetched by it; attackers sent with A finish the fight in sight and then wait where it ended.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-siege')); }"); pg.wait_for_timeout(500)
    r=pg.evaluate('''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; try{
      step(1); const h=hives()[0], T=TILE;
      for(const e of G.ents) if(!e.dead&&e.faction==='corps'){ e.invuln=true; if(e.kind==='unit'){ e.quiet=true; e.order={type:'hold'}; } }   G.swarm.cfg.spareFauna=true;   /* no fights of the mission's own (or with grazers) to muddle the picture */
      /* the gathering point lies far from the hive */
      const fr=freeTilesNear(Math.floor(h.x/T)-8,Math.floor(h.y/T)+2,1)[0]; setRally((fr.x+.5)*T,(fr.y+.5)*T);
      /* a body in the field, a Scuttler of yours that was sent out with A (role wave) carries it home */
      const f=freeTilesNear(Math.floor(h.x/T)+7,Math.floor(h.y/T)+1,1)[0];
      makeBody({x:(f.x+.5)*T,y:(f.y+.5)*T,type:'trooper',def:UNITS.trooper}); const body=G.ents[G.ents.length-1]; const c=makeUnit('drone','swarm',body.x+T,body.y); c.mine=true; c.role='wave'; c.claim=body; c.claimMode='haul';
      for(let i=0;i<30*40&&!body.home;i++) __hc.update(1/30);
      ok(!!body.home,'the body reached the hive');
      ok(c.role==='brood'&&c.post&&Math.hypot(c.post.x-h.x,c.post.y-h.y)<4*T,'the carrier is brood again and waits at that hive ('+c.role+')');
      /* a second body near that hive: the carrier fetches it */
      const f2=freeTilesNear(Math.floor(h.x/T)+5,Math.floor(h.y/T)-3,1)[0]; makeBody({x:(f2.x+.5)*T,y:(f2.y+.5)*T,type:'trooper',def:UNITS.trooper}); const b2=G.ents[G.ents.length-1];
      let fetched=false; for(let i=0;i<30*40&&!b2.home;i++){ __hc.update(1/30); if(b2.carrier===c) fetched=true; }
      ok(fetched&&!!b2.home,'it fetched the next body by itself');
      let far=0; for(let i=0;i<30*40;i++){ __hc.update(1/30); far=Math.max(far,Math.hypot(c.x-h.x,c.y-h.y)/T); }
      ok(!c.dead&&c.role==='brood'&&far<8,'it stays at the hive, no hunting (furthest '+far.toFixed(1)+' tiles)');
      /* a new gathering point calls it away */
      setRally((fr.x+.5)*T,(fr.y+.5)*T); step(30); ok(!c.post&&c.order&&Math.hypot(c.order.x-(fr.x+.5)*T,c.order.y-(fr.y+.5)*T)<T&&Math.hypot(c.x-(fr.x+.5)*T,c.y-(fr.y+.5)*T)<6*T,'a new gathering point calls it there ('+(Math.hypot(c.x-(fr.x+.5)*T,c.y-(fr.y+.5)*T)/T).toFixed(1)+' tiles, '+c.role+' '+(c.order&&c.order.type)+' claim '+!!c.claim+' post '+JSON.stringify(c.post)+' tgt '+(c.target&&c.target.type)+')');
      /* attackers: sent with A at a soldier; once the fight in sight is over they wait where it ended */
      const s=G.ents.find(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'); const fa=freeTilesNear(Math.floor(s.x/T),Math.floor(s.y/T)+3,4).slice(1,4);
      s.invuln=false; s.quiet=false; s.order=null;   /* one soldier to fight, the rest stay out of the picture */
      const us=fa.map(t=>{ const u=makeUnit('brute','swarm',(t.x+.5)*T,(t.y+.5)*T); u.mine=true; u.role='brood'; u.invuln=true; return u; });   /* they must live to show what they do after the fight */
      selectEntities(us,false); sendWave(s.x,s.y,false); ok(us.every(u=>u.role==='wave'),'A: they go as attackers');
      let back=false; for(let i=0;i<30*90&&!back;i++){ __hc.update(1/30); back=us.filter(u=>!u.dead).every(u=>u.role==='brood'); }
      const alive=us.filter(u=>!u.dead);
      ok(back&&alive.length,'after the fight they are brood again ('+alive.length+' alive)');
      if(alive.length){ const where=alive.map(u=>({x:u.x,y:u.y})); step(30);
        const moved=Math.max(...alive.filter(u=>!u.dead).map((u,i)=>Math.hypot(u.x-where[i].x,u.y-where[i].y)/T));
        ok(alive.every(u=>u.dead||u.role==='brood'),'still brood 30 s later'); ok(moved<12,'they stay where the fight ended (moved at most '+moved.toFixed(1)+' tiles)'); }
    }catch(e){ ok(false,'error '+e.stack); } return out; }''')
    for l in r: print(l)
    b.close()
print(errs); print('ALL OK' if all(l.startswith('OK') for l in r) and not errs else 'FAIL')
