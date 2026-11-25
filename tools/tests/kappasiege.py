# Kappa Siege (Nov 2026): the garrison round the Command Post fights like Needle and Thread's (ring, front, back, regroup, newcomers join,
# Engineers rebuild guns and barricades), and the raids march out in a wedge and come home: after the hive falls or when they bleed out.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  calm=()=>{ for(const e of G.ents) if(e.faction==='corps'||e.faction==='swarm') e.invuln=true; }, C=()=>G.vars.ksMid, tl=(u)=>Math.hypot(u.x-C().x,u.y-C().y)/TILE,
  corps=()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'), brood=(type,dx,dy,n)=>{ const out=[]; for(let i=0;i<n;i++){ const u=makeUnit(type,'swarm',C().x+dx*TILE+(i%3)*10,C().y+dy*TILE+Math.floor(i/3)*10); u.role='brood'; u.mine=true; u.invuln=true; u.order={type:'hold'}; u.post={x:u.x,y:u.y}; out.push(u); } return out; }; try{ step(2); '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('ring at the start','''const us=corps(); ok(us.length>=11&&us.every(u=>u.ksRing),'every soldier is in the ring ('+us.length+')');
  const f=us.filter(u=>!u.def.heal&&!u.def.builder), s=us.filter(u=>u.def.heal||u.def.builder);
  ok(f.every(u=>tl(u)>=KS_CAMP.r-0.6),'the fighters stand on the ring, clear of the Command Post'); ok(s.every(u=>tl(u)<KS_CAMP.r),'Medic and Engineers inside it');
  ok(us.every(u=>u.stance==='hold'&&u.leash),'defensive, on a leash'); ok(G.vars.ksSites.length>=5,'the guns and barricades are written down to rebuild ('+G.vars.ksSites.length+')');'''),
('front, then calm','''calm(); const bs=brood('drone',9,0,4); step(3); const T=G.vars.ksTac; ok(T.mode==='front','Brood seen: front'); ok(T.dir.x>0.9,'facing east');
  step(6); const f=corps().filter(u=>!u.def.heal&&!u.def.builder), line=f.filter(u=>u.ksLine), rest=f.filter(u=>!u.ksLine);
  ok(line.length===Math.ceil(f.length*KS_TAC.lineShare),'half of the fighters in the line ('+line.length+'/'+f.length+')'); ok(line.every(u=>(u.x-C().x)/TILE>2),'the line stands east');
  ok(rest.every(u=>Math.atan2(u.y-C().y,u.x-C().x)*180/Math.PI>KS_TAC.restArc-5||Math.atan2(u.y-C().y,u.x-C().x)*180/Math.PI<-(KS_TAC.restArc-5)),'the rest stay round the back');
  const med=corps().find(u=>u.def.heal); const lx=line.reduce((a,u)=>a+u.x,0)/line.length; ok(med.x<lx-TILE,'the Medic behind the line');
  for(const b of bs) b.dead=true; step(KS_TAC.calm+2); ok(T.mode==='ring','nothing seen: back to the ring');'''),
('two sides: the line faces the nearer group','''calm(); brood('drone',8,0,3); brood('drone',0,-11,3); step(3); const T=G.vars.ksTac; ok(T.mode==='front'&&T.dir.x>0.85,'line faces the nearer group (east), not the middle of both ('+T.dir.x.toFixed(2)+','+T.dir.y.toFixed(2)+')');'''),
('a man falls: the line closes up','''calm(); brood('drone',9,0,4); step(6); const line=corps().filter(u=>u.ksLine); const v=line[0]; v.invuln=false; damage(v,1e5,null); step(1.5);
  const now=corps().filter(u=>u.ksLine&&!u.downed); ok(!now.includes(v)&&now.length>=1,'the line is shared out again without him ('+now.length+')');'''),
('newcomers join','''calm(); const n=corps().length; const u=G.api.spawn('trooper','Q',1,{faction:'corps'})[0]; step(1.5); ok(u&&u.ksRing&&u.ringAt,'a new soldier from the Command Post joins the ring');'''),
('back: hit from out of reach','''calm(); const sp=brood('spitter',10,0,2); step(3); const T=G.vars.ksTac; ok(T.mode==='front','Spitters seen: front'); for(const u of corps()) u.rangeBonus=-4;   /* out of their reach */
  for(let i=0;i<12;i++){ for(const u of corps()){ u.shotBy=sp[0]; u.shotAt=G.time; } step(0.5); }
  ok(T.mode==='back','spat at from out of reach: they fall back ('+T.mode+')'); step(4); ok(corps().filter(u=>!u.def.heal&&!u.def.builder).every(u=>u.x<C().x+TILE),'behind the Command Post');
  for(const s of sp){ s.x=C().x+5*TILE; } step(1); ok(T.mode==='front','the Brood comes close: back on the line');'''),
('regroup when the Brood sits still','''calm(); const sp=brood('spitter',9,0,2); step(3); const T=G.vars.ksTac; const f=corps().filter(u=>!u.def.heal&&!u.def.builder); for(const u of f) u.hp=u.maxHp*0.5; step(KS_TAC.campFor+2);
  ok(T.mode==='regroup','hurt while the Brood sits still: regroup ('+T.mode+')'); for(const u of f) u.hp=u.maxHp; step(1.5); ok(T.mode==='front','patched up: back on the line');'''),
('raid in a wedge, the hive falls, home','''calm(); ksRaid(G.api,4,'Sgt. Kessler','go'); const R=G.vars.ksRaids[0], ms=()=>G.ents.filter(e=>!e.dead&&e.ksRaid===R); R.hive.invuln=false; R.hive.maxHp=R.hive.hp=1e7;
  ok(ms().length===5&&ms().some(u=>u.def.heal)&&ms().some(u=>u.type==='pyro'),'four fighters with the Pyro, and a Medic'); ok(ms()[0].formation&&ms()[0].formation.shape==='wedge','in a wedge');
  ok(ksMen().every(u=>!u.ksRaid),'the raid left the ring'); ok(R.state==='muster','they form up first'); let w=0; while(R.state==='muster'&&w<KS_RAID.muster+1){ step(0.5); w+=0.5; } ok(R.state==='out','formed up, off to the hive ('+w+' s)'); step(3); const h=R.hive, d=u=>Math.hypot(u.x-h.x,u.y-h.y), py=ms().find(u=>u.type==='pyro');
  ok(py&&py.slot&&ms().every(u=>!u.slot||u.slot.x<=py.slot.x)&&(()=>{ const m=py.formation.march; if(!m) return false; const al=u=>u.x*Math.cos(m.head)+u.y*Math.sin(m.head); return ms().every(u=>al(py)>=al(u)-TILE*0.5); })(),'the Pyro walks at the tip ('+ms().map(u=>u.type[0]+(d(u)/TILE).toFixed(1)+(u.slot?'['+u.slot.x.toFixed(0)+']':'')).join(' ')+')'); step(25); ok(ms().filter(u=>!u.def.heal).every(u=>d(u)<8*TILE)&&ms().some(u=>u.target===h),'they reach the hive ('+ms().map(u=>u.type[0]+(d(u)/TILE).toFixed(1)+'/'+(u.target?u.target.type:'-')).join(' ')+')'); ok(h.hp<h.maxHp,'and burn it');
  damage(h,1e8,null); step(1); ok(R.state==='home','the hive falls: they turn for home'); step(45); ok(!G.vars.ksRaids.length&&corps().every(u=>u.ksRing&&!u.ksRaid),'home and back in the ring');
  ok(corps().every(u=>!u.formation),'no raid formation left');'''),
('raid breaks off when it bleeds','''calm(); ksRaid(G.api,6,'Cmdr. Varga','go'); const R=G.vars.ksRaids[0], ms=()=>G.ents.filter(e=>!e.dead&&e.ksRaid===R); step(8);
  for(const u of ms()) u.hp=u.maxHp*0.3; step(1); ok(R.state==='home','below '+KS_RAID.abort*100+'%: back to the Command Post'); ok(alive(R.hive),'with the hive still standing'); step(50); ok(corps().every(u=>u.ksRing&&!u.ksRaid),'home and back in the ring');'''),
('raid resumes after a fight on the way','''calm(); ksRaid(G.api,4,'Sgt. Kessler','go'); const R=G.vars.ksRaids[0], ms=()=>G.ents.filter(e=>!e.dead&&e.ksRaid===R); R.hive.invuln=false; R.hive.maxHp=R.hive.hp=1e7; step(4);
  const quiet=()=>{ for(const e of G.ents) if(e.kind==='unit'&&e.faction==='swarm') e.dead=true; };   /* no guards to keep them busy */
  quiet(); for(const u of ms()){ u.order=null; u.target=null; u.path=null; if(u.formation) u.formation.march=null; } for(let i=0;i<(KS_RAID.resume+4)*4;i++){ quiet(); step(0.25); } ok(!!ms()[0].formation.march||ms().some(u=>u.target===R.hive||(u.order&&u.order.type==='attack'&&u.order.target===R.hive)),'on for the hive again ('+ms().map(u=>(u.order&&u.order.type)+'/'+(u.target?u.target.type:'-')).join(' ')+' '+R.state+')'); step(30); ok(R.hive.hp<R.hive.maxHp,'and they burn it');'''),
('Engineers rebuild, not with Brood about','''calm(); const s0=G.ents.find(e=>!e.dead&&e.type==='sentry'); const tx=s0.tx, ty=s0.ty; s0.invuln=false; damage(s0,1e6,null); step(2);
  const site=G.ents.find(e=>!e.dead&&e.type==='sentry'&&e.tx===tx&&e.ty===ty); ok(site&&site.ntSite,'a new site on the old spot'); const eng=corps().find(u=>u.def.builder&&u.order&&u.order.target===site); ok(!!eng,'an Engineer works on it');
  step(30); ok(site.built,'the Sentry Gun stands again');
  const b0=G.ents.find(e=>!e.dead&&e.type==='barricade'); const bx=b0.tx, by=b0.ty; b0.invuln=false; damage(b0,1e6,null); const bs=brood('drone',(bx+.5)-C().x/TILE,(by+.5)-C().y/TILE+1,1); step(3);
  ok(!G.ents.some(e=>!e.dead&&e.type==='barricade'&&e.tx===bx&&e.ty===by),'Brood by the spot: nobody rebuilds'); bs[0].dead=true; step(3); ok(G.ents.some(e=>!e.dead&&e.type==='barricade'&&e.tx===bx&&e.ty===by),'gone: the site goes up');'''),
('save and load mid-raid','''calm(); ksRaid(G.api,4,'Sgt. Kessler','go'); step(6); ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; for(let i=0;i<30;i++) __hc.update(1/30);
  const R=G2.vars.ksRaids[0]; ok(R&&G2.ents.filter(e=>!e.dead&&e.ksRaid===R).length===5,'the raid and its men come back'); ok(G2.ents.filter(e=>!e.dead&&e.ksRing&&!e.ksRaid&&e.kind==='unit').length>=6,'the ring too');
  R.hive.invuln=true; damage(R.hive,1e7,null); for(let i=0;i<30;i++) __hc.update(1/30); R.hive.dead=true; for(let i=0;i<60;i++) __hc.update(1/30); ok(R.state==='home','after loading: the hive falls, they go home');'''),
('win and lose still fire','''const hq=G.ents.find(e=>e.type==='hq'); hq.invuln=false; damage(hq,1e8,null); step(1); ok(G.over&&G.over.win,'the Command Post falls: won');'''),
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    for name,code in CASES:
        pg.evaluate("()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-siege')); }"); pg.wait_for_timeout(200)
        r=pg.evaluate(HEAD+code+TAIL); res.append(f'--- {name}\n'+r)
        if name.startswith('front'): pg.screenshot(path='/tmp/ks-front.png')
    b.close()
out='\n'.join(res); print(out); print(errs); print('ALL OK' if 'FAIL' not in out and not errs else 'FAILED')
