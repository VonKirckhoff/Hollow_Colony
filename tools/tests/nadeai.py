# NADE_AI (Nov 2026): the Brood minds grenades when you play it: creatures in a grenade's landing circle spring out of it,
# and near a soldier who can throw grenades the brood keeps apart. Not in Corps missions (NADE_AI.everywhere 0). Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
CODE='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m); try{
  startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-choir')); let G=__hc.G; const step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; step(0.5);
  for(const e of G.ents) if(e.kind==='unit'&&!e.dead&&e.faction!=='swarm') e.dead=true;   /* an empty field */
  const X=20*TILE, Y=36*TILE, pack=(type,n)=>{ const us=[]; for(let i=0;i<n;i++){ const u=makeUnit(type,'swarm',X+(i%3-1)*10,Y+(Math.floor(i/3)-1)*10); u.role='brood'; u.mine=true; u.order={type:'hold'}; us.push(u); } return us; };
  const throwAt=(us,dur)=>{ const s={k:'grenade',sx:X-5*TILE,sy:Y,tx:X,ty:Y,t:0,dur,src:null,dmg:55,splash:PERKS.trooper.radius*TILE,faction:'corps'}; G.shots.push(s); let inside=0;
    for(let i=0;i<dur*30+2;i++){ __hc.update(1/30); } inside=us.filter(u=>!u.dead&&Math.hypot(u.x-s.tx,u.y-s.ty)<=s.splash+u.r*0.5).length; return inside; };
  /* 1: crawlers spring out of the circle */
  let us=pack('crawler',6); for(const u of us) u.invuln=true; const n1=throwAt(us,0.75);
  ok(n1===0,'fast Crawlers spring out of the blast ('+n1+' of 6 still inside)');
  for(const u of us) u.dead=true;
  /* 2: a Brute is too slow to get out in time */
  us=pack('brute',1); for(const u of us) u.invuln=true; const n2=throwAt(us,0.5); ok(n2===1,'a Brute is often too slow ('+n2+' inside)'); step(0.3); ok(!(us[0].dodgeT>0),'and it carries on after the blast');
  for(const u of us) u.dead=true;
  /* 3: no grenadier near: a clump stays a clump */
  us=pack('drone',6); for(const u of us) u.invuln=true; step(3);
  const gapMin=()=>{ let m=1e9; for(const a of us) for(const b of us) if(a!==b) m=Math.min(m,Math.hypot(a.x-b.x,a.y-b.y)); return m/TILE; };
  const g0=gapMin(); ok(g0<1,'no grenadier: the brood stands together ('+g0.toFixed(2)+' tiles)');
  /* 4: a Lieutenant Trooper close by: they move apart */
  const t=makeUnit('trooper','corps',X-5*TILE,Y); t.rankFixed=true; t.vet.rank=4; applyRank(t); t.invuln=true; t.quiet=false; t.order={type:'hold'}; t.stance='hold';
  step(4); const g1=gapMin(); ok(g1>NADE_AI.gap*0.8,'a grenadier near: they keep apart ('+g1.toFixed(2)+' tiles)');
  let bunched=0; for(const a of us){ let n=0; for(const b of us) if(Math.hypot(a.x-b.x,a.y-b.y)<PERKS.trooper.radius*TILE) n++; bunched=Math.max(bunched,n); } ok(bunched<2,'no two within one grenade');
  /* 5: Corps missions: the Brood the computer leads does not dodge (everywhere 0) */
  goMenu('menu'); startMission(MISSIONS[0]); G=__hc.G; step(0.5); for(const e of G.ents) if(e.kind==='unit'&&!e.dead&&e.faction==='swarm') e.dead=true;
  us=[0,1,2].map(i=>{ const u=makeUnit('crawler','swarm',X+i*8,Y); u.invuln=true; u.order={type:'hold'}; return u; }); const n5=throwAt(us,0.75); ok(n5===3,'Corps missions: the enemy Brood does not dodge ('+n5+' inside)');
}catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    out=pg.evaluate(CODE)
    b.close()
print(out); print(errs); print('ALL OK' if 'FAIL' not in out and not errs else 'FAILED')
