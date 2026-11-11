# Swarm campaign missions 4–8: each starts clean, its own mechanic works, and its win and lose fire.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const G=__hc.G, out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  calm=()=>{ for(const e of G.ents) if(e.faction==='corps'||e.faction==='swarm') e.invuln=true; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES={
 'swarm-lights':'''step(2); const gens=['1','2','3','4'].map(k=>G.ents.find(e=>!e.dead&&e.def&&e.def.generator&&e.label&&e.label.startsWith(['North-west','North-east','South-west','South-east'][+k-1])));
   ok(gens.every(Boolean)&&gens.every(e=>e.powered),'four generators run'); const hq=G.ents.find(e=>e.type==='hq'); ok(hq.invuln,'the Command Post is shielded'); ok(G.objectives.find(o=>o.id==='dark').state==='active','the grid objective is still open');
   const u=makeUnit('crawler','swarm',gens[0].x+TILE,gens[0].y); u.role='brood'; u.mine=true; step(0.5); ok(u.blindT>0,'a crawler in the light is blinded'); ok(speedOf(u)<u.def.speed*0.9,'and slow');
   for(const e of G.ents) if(e.kind==='unit'&&e.faction==='corps'&&e.def.builder) e.dead=true;
   for(const g of gens){ g.powered=false; g.hp=0.01; } step(1); ok(!hq.invuln&&G.objectives.find(o=>o.id==='dark').state==='done','all four dark: shield down');
   damage(hq,1e7,null); step(1); ok(G.over&&G.over.win,'win when the Command Post falls');''',
 'swarm-choir':'''step(2); ok(G.timer&&G.timer.label==='Dropship','the dropship clock runs'); ok(G.ents.some(e=>e.colonist),'colonists lie on the map');
   step(16*0+1); const sq=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); ok(sq.length>0,'a squad is on the map');
   let t=0; while(!G.vars.maas&&t<120){ step(1); t++; } for(const e of G.ents) if(e.faction==='corps') e.invuln=false;
   const m=G.ents.find(e=>!e.dead&&e.type==='scientist'); ok(!!m,'Dr. Maas comes out of the lab ('+t+' s)'); if(m){ for(const e of G.ents) if(e.kind==='unit'&&e.faction==='corps'&&e.def.heal) e.dead=true; damage(m,1e7,null); step(SQUAD.downed.time+2); ok(G.over&&G.over.win,'win when Maas falls (and bleeds out)'); }''',
 'swarm-signal':'''step(1); const bs=G.ents.filter(e=>!e.dead&&e.def&&e.def.capture); ok(bs.length===3&&bs.every(b=>b.owned),'they hold three beacons'); ok(G.timer&&G.timer.label==='Fleet','the fleet clock runs');
   for(const e of G.ents) if(e.kind==='unit'&&e.faction==='corps') e.dead=true; for(const e of G.ents) if(e.type==='sentry') e.dead=true;
   const brood=[]; for(const b of bs) for(let i=0;i<2;i++){ const u=makeUnit('crawler','swarm',b.x+i*10,b.y+20); u.role='brood'; u.mine=true; u.invuln=true; u.post={x:u.x,y:u.y}; u.order={type:'hold'}; brood.push(u); }
   step(18); ok(bs.every(b=>!b.owned),'brood on all three: they go quiet'); step(30); const o=G.objectives.find(o=>o.id==='quiet'); ok(/to go/.test(o.text),'the hold clock counts ('+o.text+')');
   step(35); ok(G.over&&G.over.win,'win after holding all three for a minute');''',
 'swarm-mother':'''step(1); const m=G.vars.mother; ok(m&&Math.abs(m.hp/m.maxHp-0.45)<0.02,'the Mother lies wounded (45%)'); ok(G.ents.some(e=>!e.dead&&e.type==='membrane'&&e.tag==='lair'),'the living wall stands');
   calm(); m.invuln=false; step(62); ok(G.vars.raids>=1,'a fire team came down the tunnels'); for(const h of hives()) h.dead=true; step(1); ok(!G.ents.some(e=>!e.dead&&e.type==='membrane'&&e.tag==='lair'),'all chambers gone: the wall opens');
   G.timer.end=G.time+0.5; step(1); ok(G.over&&G.over.win,'win when the clock runs out with her alive');''',
 'swarm-seed':'''step(1); ok(hives().length===3,'three nests'); ok(G.ents.filter(e=>!e.dead&&e.oldEgg).length===3,'three old eggs'); ok(G.swarm.cfg.seedMax===5,'up to five Seedling nests');
   calm(); for(const h of hives()) h.invuln=false; step(92); ok((G.scorch||[]).length>=1,'a strike from orbit is coming'); const s=G.scorch[0]; const h=hives().find(h=>Math.hypot(h.x-s.x,h.y-s.y)<TILE); const hp=h?h.hp:0;
   step(16); ok(h&&h.hp<hp*0.5,'it burns the nest it fell on'); G.timer.end=G.time+0.5; step(1); ok(G.over&&!G.over.win,'lose with too few nests when the fire stops');'''
}
LOSE={
 'swarm-lights':"step(1); for(const h of hives()) h.dead=true; step(1); ok(G.over&&!G.over.win,'lose when every nest burns');",
 'swarm-choir':"step(1); for(const h of hives()) h.dead=true; step(1); ok(G.over&&!G.over.win,'lose when every nest burns');",
 'swarm-signal':"step(1); G.timer.end=G.time+0.5; step(1); ok(G.over&&!G.over.win,'lose when the fleet arrives');",
 'swarm-mother':"step(1); damage(G.vars.mother,1e8,null); step(1); ok(G.over&&!G.over.win,'lose when the Mother dies');",
 'swarm-seed':"step(1); for(const h of hives()) h.dead=true; step(1); ok(G.over&&!G.over.win,'lose when every nest burns');",
}
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    for mid,body in CASES.items():
        for part,code in (('main',body),('lose',LOSE[mid])):
            pg.evaluate("id=>{ startMission(SWARM_MISSIONS.find(m=>m.id===id)); }",mid); pg.wait_for_timeout(300)
            r=pg.evaluate(HEAD+code+TAIL); res.append(f'--- {mid} ({part})\n'+r)
            if part=='main': pg.screenshot(path=f'/tmp/{mid}.png')
    b.close()
out='\n'.join(res); print(out); print(errs); print('ALL OK' if 'FAIL' not in out and not errs else 'FAILED')
