# Rogue Strain as a sequel to the Corps campaign (Nov 2026): Containment Order 10, your own soldier's lines and taint,
# Dead Man's Frequency, The Seed Wakes with the Heir, Kessler or Van Der Planck, the High Ground hint, Intel, no Okafor left.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.invuln=true; for(const e of __hc.G.ents) if(e.crew) e.invuln=true; },
  said=(who,re)=>__hc.G.msgs.some(m=>(!who||m.who===who||m.who==='Intercept · '+who)&&re.test(m.text)), job=id=>{ __hc.startMission(ROGUE_MISSIONS.find(m=>m.id===id)); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
CASES=[
('the frame','''ui.roster=emptyRoster(); enlistSelf('Vonk','f','trooper'); resetRogue(); const v=rogueStore().crew.find(x=>x.id==='osp-self');
  ok(v.taint===25,'your soldier starts with 25 taint'); ok(selfName()==='Vonk'&&/Private Vonk/.test(selfRankName()),'selfName / selfRankName');
  ok(/Containment Order 10/.test(document.querySelector('.lede.rogue-only').textContent),'campaign text: Containment Order 10');
  ok(ROGUE_MISSIONS[0].title==="Dead Man's Frequency"&&ROGUE_MISSIONS[ROGUE_MISSIONS.length-1].title==='The Seed Wakes','job 1 and job 8 renamed');
  ok(ROGUE_MISSIONS.every(m=>!/Okafor/.test(JSON.stringify(m.briefing))),'no Okafor in the briefings');
  ok(ROGUE_INTEL.some(x=>x.id==='order10')&&ROGUE_INTEL.some(x=>x.id==='heir'),'Intel: the order and the Heir');
  ok(/Seed into your blood/.test(ROGUE_TROPHIES.find(t=>t.id==='rogue:ascend').what),'Ascension speaks of the Seed');'''),
("Dead Man's Frequency",'''resetRogue(); const G=job('rogue-osprey-down'); calm(); step(17);
  ok(said('Capt. Kerckhoffs',/Welcome to the dead, Vonk/),'Kerckhoffs welcomes you by name'); ok(said('Cmdr. Varga',/Containment Order 10.*Private Vonk/),'Varga names you on the order');
  ok(said('Vonk',/furnaces/),'your own line'); ok(!G.msgs.some(m=>/Dr\\. Maas \\(intercom\\)/.test(m.who)),'no Maas on the intercom');'''),
('Hunted: Kessler and the flag','''resetRogue(); const G=job('rogue-hunted'); calm(); step(13);
  ok(said('Sgt. Kessler',/^Vonk\\. I know you can hear me/),'Kessler calls you by name'); ok(said('Vonk',/furnaces, Sarge/),'you answer him');
'''),
('The Seed Wakes: the Heir','''resetRogue(); const G=job('rogue-mothers-blood'); step(5); const h=G.vars.mother;
  ok(h&&h.type==='heir'&&G.bossTitle==='The Heir','the boss is the Heir'); const M=UNITS.broodmother, H=UNITS.heir;
  ok(Math.abs(H.scale/M.scale-0.6)<0.01&&Math.abs(H.speed/M.speed-1.3)<0.01&&H.hp<M.hp&&H.boss,'60% size, 30% faster, less health, still a boss');
  ok(said('Vonk',/smaller/),'your line at the start'); ok(!(G.mission.tough||{}).broodmother&&G.mission.tough.heir,'tough set for the Heir');
  const tr=String(G.mission.triggers.find(t=>String(t.do).includes('dustLand=true')).do); ok(/kesslerDead/.test(tr)&&/Van Der Planck/.test(tr)&&/this ends today/.test(tr),'Dust comes down with Kessler, or Van Der Planck if he died');
  const hu=String(ROGUE_MISSIONS.find(m=>m.id==='rogue-hunted').triggers.map(t=>t.do).join(' ')); ok(/flags\\.kesslerDead=/.test(hu),'Hunted writes the flag');'''),
('High Ground hint and end screen','''ok(/report to medical for screening/.test(MISSIONS.find(m=>m.id==='high-ground').triggers.map(t=>String(t.do)).join(' ')),'High Ground: the screening hint');
  ok(/Containment Order 10 has your name on it/.test(String(showEnd)),'end screen when Rogue opens');''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ localStorage.clear(); for(const m of MISSIONS) recordWin(m.id,'normal',500,false); }")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
