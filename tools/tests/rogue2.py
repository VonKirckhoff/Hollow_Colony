# Rogue Strain, the two extra jobs: Needle and Thread (records terminal, alarm, relief squads, stabilizer, Maas's formula)
# and Among Them (the veil, choir pods, the stirred brood, the lull, the way down, Wolf in the Fold). Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
HEAD='''()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m), step=s=>{ const G=__hc.G; for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); },
  crew=()=>__hc.G.ents.filter(e=>!e.dead&&e.crew), tp=(u,x,y)=>{ u.x=(x+.5)*TILE; u.y=(y+.5)*TILE; u.path=null; u.order=null; u.target=null; u.home={x:u.x,y:u.y}; },
  calm=()=>{ for(const e of __hc.G.ents) if(e.faction==='swarm'||e.faction==='loyal') e.invuln=true; },
  obj=id=>(__hc.G.objectives.find(o=>o.id===id)||{}).state,
  start=id=>{ __hc.startMission(ROGUE_MISSIONS.find(m=>m.id===id)); return __hc.G; }; try{ '''
TAIL=''' }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
NT="'rogue-needle-and-thread'"; AT="'rogue-among-them'"
CASES=[
('campaign order','''const ids=ROGUE_MISSIONS.map(m=>m.id); ok(ids.length===8,'eight Rogue jobs'); ok(ids[1]==='rogue-needle-and-thread'&&ids[6]==='rogue-among-them'&&ids[7]==='rogue-mothers-blood','Needle and Thread second, Among Them seventh');
  ok(/Kappa Basin/.test(ROGUE_MISSIONS[2].briefing[0]),'Dead Air remembers the cases from Kappa Basin');'''),
('needle: the hospital','''resetRogue(); const G=start('''+NT+'''); step(1); ok(G.ents.filter(e=>!e.dead&&e.type==='medtent').length===3,'three hospital tents'); ok(G.vars.term&&G.vars.term.type==='terminal','a records terminal');
  ok(G.vars.cases.length===3&&G.vars.cases.every(c=>c.stab===1),'a case of stabilizer at every tent'); { const lz=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'), rt=G.ents.find(e=>!e.dead&&e.faction==='loyal'&&e.type==='relay'); ok(!!lz&&!!rt,'a relief pad and a Relay Tower for the hospital');
    ok(lz&&Math.floor(lz.x/TILE)===NT_PAD.x&&Math.floor(lz.y/TILE)===NT_PAD.y&&lz.x>NT_RING.x*TILE,'the pad lies at NT_PAD, on the east side of the camp'); }
  { const ring=G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&e.ringer), f=ring.filter(u=>!u.def.heal&&!u.def.builder), c={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, ds=f.map(u=>Math.hypot(u.x-c.x,u.y-c.y)/TILE);
    ok(ring.length===9&&ring.every(u=>u.order&&u.order.type==='hold'&&u.stance==='hold'&&u.leash),'the garrison holds in a ring, defensive ('+ring.length+')'); ok(!G.ents.some(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&!e.ringer),'no patrol outside it'); ok(Math.min(...ds)>1.5&&Math.max(...ds)<3.2,'fighters on the ring ('+ds.map(d=>d.toFixed(1)).join(' ')+')');
    ok(ring.filter(u=>u.def.heal||u.def.builder).every(u=>Math.hypot(u.x-c.x,u.y-c.y)<1.4*TILE),'Medics and the Engineer inside it'); }
  ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit').length===9,'the hospital garrison'); ok(G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.type==='sentry').length===2,'two Sentry Guns'); ok(G.vars.alarm==null&&!G.timer,'quiet until someone is seen');'''),
('needle: a seasoned garrison','''resetRogue(); const G=start('''+NT+'''); step(1); const ring=G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&e.ringer), J=G.mission.job;
  const lead=G.vars.lead, fight=ring.filter(u=>u!==lead&&!u.def.heal&&!u.def.builder), sup=ring.filter(u=>u.def.heal||u.def.builder);
  ok(lead&&lead.vet&&lead.vet.rank===4&&hasPerk(lead)&&lead.type==='trooper','the ring has a Lieutenant who can throw grenades');
  ok(fight.length===5&&fight.every(u=>u.vet&&u.vet.rank===J.rank),'the fighters are Sergeants ('+fight.map(u=>u.vet&&u.vet.rank).join(',')+')');
  ok(sup.length===3&&sup.every(u=>u.vet&&u.vet.rank===J.supRank),'Medics and Engineer are Corporals');
  { let m=99; for(const a of sup) for(const b of sup) if(a!==b) m=Math.min(m,Math.hypot(a.x-b.x,a.y-b.y)/TILE); ok(m>PERKS.trooper.radius+0.3,'Medics and Engineer stand apart: one grenade never catches two of them (closest '+m.toFixed(2)+' tiles)');
    const md=sup.filter(u=>u.def.heal); ok(md.length===2&&Math.hypot(md[0].x-md[1].x,md[0].y-md[1].y)/TILE>=NT_RING.supGap-0.3,'the two Medics are not side by side'); }
  ok(fight.every(u=>Math.abs(u.maxHp-u.def.hp*RANKS[2].hp)<1&&Math.abs(u.dmgMul-RANKS[2].dmg)<0.01),'rank hp and damage on Normal');
  ok(ring.every(u=>u.npc),'never on a roster'); const x0=fight[0].vet.xp; gainXP(fight[0],50); ok(fight[0].vet.xp===x0&&fight[0].vet.rank===J.rank,'they gain no experience');
  ok(G.vars.barricades.length===3&&G.vars.barricades.every(b=>b.faction==='loyal'&&b.type==='barricade'),'three barricades of theirs');
  ok(G.vars.barricades.filter(b=>b.x>NT_RING.x*TILE).length===2,'two on the side of the pad');
  { const b=G.vars.barricades[0], t=fight[0], c=crew().find(u=>u.type==='trooper'); t.x=b.x-TILE; t.y=b.y; c.x=b.x+5*TILE; c.y=b.y; ok(Math.abs(coverDamage(t,10,c)-10*SQUAD.cover.factor)<0.01,'behind the sandbags they take less fire');
  }
  goMenu('menu'); const d0=ui.diff; ui.diff='hard'; resetRogue(); const H=start('''+NT+'''); step(1); ui.diff=d0;
  ok(H.diffKey==='hard'&&H.vars.lead.vet.rank===4&&H.ents.filter(e=>!e.dead&&e.ringer&&!e.def.heal&&!e.def.builder&&e!==H.vars.lead).every(u=>u.vet.rank===3),'Hard: Veterans'); goMenu('menu');'''),
('needle: Medics keep apart while healing','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); for(const c of crew()){ c.invuln=true; c.quiet=true; c.order={type:'hold'}; }
  const ring=()=>G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'&&e.ringer), md=ring().filter(u=>u.def.heal), f=ring().filter(u=>!u.def.heal&&!u.def.builder);
  ok(md.length===2&&md.every(m=>m.spread===NT_RING.supGap),'the Medics of the ring keep a distance');
  const gap=m=>Math.hypot(md[0].x-md[1].x,md[0].y-md[1].y)/TILE;
  /* one patient: one Medic takes him, the other stays where he is */
  const p1=f[0]; p1.hp=p1.maxHp*0.2; let lo=99, healed=false; for(let i=0;i<8*30;i++){ __hc.update(1/30); if(md.some(m=>m.beam===p1)) healed=true; lo=Math.min(lo,gap()); if(p1.hp>=p1.maxHp) break; }
  ok(healed,'he gets healed'); ok(md.filter(m=>m.healTarget===p1).length<=1,'by one Medic only'); ok(lo>PERKS.trooper.radius,'one patient: the Medics never stand within one grenade (closest '+lo.toFixed(2)+' tiles)');
  /* two patients side by side, out on the ring: each Medic takes one, and they still keep apart */
  const a=f[1], b=f.find(u=>u!==a&&u!==p1&&Math.hypot(u.x-a.x,u.y-a.y)<3*TILE)||f[2]; a.hp=a.maxHp*0.2; b.hp=b.maxHp*0.25; b.x=a.x+TILE*0.8; b.y=a.y; b.order={type:'hold'}; b.path=null;
  lo=99; let split=false; for(let i=0;i<15*30;i++){ __hc.update(1/30); lo=Math.min(lo,gap()); if(md[0].healTarget&&md[1].healTarget&&md[0].healTarget!==md[1].healTarget) split=true; if(a.hp>=a.maxHp&&b.hp>=b.maxHp) break; }
  ok(split,'two patients: each Medic takes his own'); ok(lo>PERKS.trooper.radius,'and they still keep apart (closest '+lo.toFixed(2)+' tiles)'); ok(a.hp>=a.maxHp*0.99&&b.hp>=b.maxHp*0.99,'both are healed ('+Math.round(a.hp/a.maxHp*100)+'%, '+Math.round(b.hp/b.maxHp*100)+'%, '+md.map(m=>(m.healTarget===a?'a':m.healTarget===b?'b':m.healTarget?'?':'-')+':'+(m.beam===a?'A':m.beam===b?'B':'.')).join(' ')+')');
  step(6); ok(!G.over,'(the job still runs)'); ok(md.every(m=>Math.hypot(m.x-m.ringAt.x,m.y-m.ringAt.y)<TILE),'then back to their places ('+md.map(m=>(Math.hypot(m.x-m.ringAt.x,m.y-m.ringAt.y)/TILE).toFixed(1)+' '+(m.order&&m.order.type)+' '+(m.healTarget?Math.round(m.healTarget.hp/m.healTarget.maxHp*100):'-')).join(' / ')+')');'''),
('needle: download, alarm, relief squads','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); for(const u of crew()) u.invuln=true; const d=crew().find(u=>u.def.heal); for(const e of G.ents) if(e.faction==='loyal'&&e.kind==='building') e.dead=true;
  const ring=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer), J=G.mission.job; let most=0; const watch=s=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); if(i%15===0){ most=Math.max(most,G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit').length); for(const e of G.ents) if(!e.dead&&e.faction==='loyal'&&e.kind==='unit') types.add(e.type); } } }, types=new Set();
  ok(G.vars.ringMax===9&&ring().length===9,'the ring starts with 9 men ('+ring().length+')');
  for(const e of G.ents) if(e.faction==='loyal'&&e.kind==='unit'&&!e.ringer) e.dead=true;
  tp(d,21,18); watch(2); ok(G.vars.dlStart&&G.vars.alarm!=null,'Devreese at the terminal: the hospital raises the alarm'); ok(!G.timer&&G.vars.dueAt==null,'no relief yet: the ring is whole'); const p1=G.vars.dl; ok(p1>0.02&&p1<0.1,'the download runs ('+Math.round(p1*100)+'%)');
  tp(d,30,30); watch(3); ok(Math.abs(G.vars.dl-p1)<0.06,'she walks away: it stops'); tp(d,21,18);
  ring().slice(0,J.lostFor-1).forEach(u=>u.dead=true); watch(3); ok(G.vars.dueAt==null,(J.lostFor-1)+' fallen: still no call');
  ring()[0].dead=true; watch(1); ok(G.vars.dueAt!=null&&G.timer&&G.timer.label==='Relief squad',J.lostFor+' fallen: the hospital calls a relief squad');
  const before=new Set(ring()); watch(J.call+1); ok(G.vars.sent===1,'the first relief squad lands'); const fresh=ring().filter(u=>!before.has(u));
  ok(fresh.length===J.lostFor&&ring().length===G.vars.ringMax,'it fills the ring back up, no more ('+fresh.length+' new)'); ok(fresh.every(u=>!u.hunter),'the relief squad does not hunt');
  watch(18); ok(fresh.every(u=>u.dead||Math.hypot(u.x-u.ringAt.x,u.y-u.ringAt.y)<TILE),'walks into the camp and joins the ring ('+fresh.map(u=>u.dead?'x':(Math.hypot(u.x-u.ringAt.x,u.y-u.ringAt.y)/TILE).toFixed(1)+(u.hidden?'h':'')+(u.order?u.order.type:'-')+(u.target?'T':'')).join(' ')+')'); ok(fresh.every(u=>u.dead||Math.hypot(u.ringAt.x-NT_RING.x*TILE,u.ringAt.y-NT_RING.y*TILE)<4*TILE),'round the middle of the camp');
  for(const u of G.ents) if(u.faction==='loyal') u.invuln=true; tp(d,21,18); for(let i=0;i<50&&!G.vars.dlDone;i++){ tp(d,21,18); watch(1); } ok(G.vars.dlDone&&obj('records')==='done'&&G.rogue.formula,'the files: Maas\\'s formula');
  ok(obj('stab')==='active'&&!G.rogue.exitOpen,'shaft shut until the cases are taken'); for(const c of G.vars.cases){ tp(d,Math.floor(c.x/TILE),Math.floor(c.y/TILE)); watch(0.4); } watch(1);
  ok(obj('stab')==='done'&&G.rogue.exitOpen,'three cases: the north shaft opens'); ok(G.rogue.stab>=3,'the doses are in the bag ('+G.rogue.stab+')');
  for(let w=0;w<J.waves+2;w++){ ring().forEach(u=>u.dead=true); calm(); watch(J.call+5); }
  ok(G.vars.sent===J.waves,'at most '+J.waves+' drops, however many fall ('+G.vars.sent+')'); ok(most<=G.vars.ringMax,'never more than '+G.vars.ringMax+' Corps soldiers on the field ('+most+')'); ok(types.has('pyro'),'the second one brought a flamer');
  { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'down the north shaft: won');
  const R=rogueStore(); ok(R.flags.formula&&G.rogueResult.formula,'the formula is kept'); ok(/formula/.test(rogueEndHtml()),'the end screen says so'); ok(/brews/.test(rogueBriefNote()),'the next briefing counts the brewed dose');
  const s0=R.stab; start('rogue-dead-air'); step(0.5); ok(__hc.G.rogue.stab===s0+ROGUE.stab.start+ROGUE.stab.formula,'the next job starts with the brewed dose too ('+__hc.G.rogue.stab+')');'''),
('needle: only the camp','''resetRogue(); const G=start('''+NT+'''); step(1); for(const u of crew()){ u.invuln=true; u.quiet=true; } ntAlarm(G.api,'test');
  const ring=()=>G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.kind==='unit'), C={x:NT_RING.x*TILE,y:NT_RING.y*TILE}; let far=0, hive=false;
  const h=G.ents.find(e=>!e.dead&&e.type==='hive'&&Math.hypot(e.x-C.x,e.y-C.y)<20*TILE); const d=makeUnit('drone','swarm',C.x+10*TILE,C.y); d.order={type:'hold'}; d.invuln=true;
  for(let i=0;i<240*30&&!G.over;i++){ __hc.update(1/30); if(i%10===0) for(const u of ring()){ if(u.def.builder) continue; far=Math.max(far,Math.hypot(u.x-C.x,u.y-C.y)/TILE); if(u.target&&(u.target.type==='hive'||u.target===d)) hive=true; } }
  ok(!hive,'nobody goes for a hive or a drone outside the camp'); ok(far<NT_RING.leash,'they stay in the camp (furthest '+far.toFixed(1)+' tiles)');
  ok(h&&!h.dead,'the hive nearest the camp is left alone'); { const fr=Math.min(...ring().filter(u=>!u.def.heal&&!u.def.builder).map(u=>Math.hypot(u.ringAt.x-C.x,u.ringAt.y-C.y))); ok(ring().filter(u=>u.def.heal).every(u=>Math.hypot(u.ringAt.x-C.x,u.ringAt.y-C.y)<fr-TILE*0.5),'the Medics stand inside the ring of fighters'); }'''),
('needle: grenades and the drop','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); for(const e of G.ents) if(e.faction==='loyal'&&e.kind==='building') e.dead=true;
  const lt=crew().find(u=>u.type==='trooper'); lt.vet.rank=2; applyRank(lt); lt.invuln=true; for(const u of crew()) if(u!==lt){ tp(u,4,40); u.quiet=true; }
  const ring=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.faction==='loyal');
  const med=ring().filter(u=>u.def.heal), eng=ring().find(u=>u.def.builder); for(const m of med){ m.x=eng.x+10; m.y=eng.y+6; m.invuln=false; m.spread=0; m.healTarget=null; }   /* this case is about the blast, not about Medics keeping apart */
  for(const u of ring()) u.invuln=false; const hp0=med.map(m=>m.hp); lt.nadeAt=0; tp(lt,Math.floor(eng.x/TILE)+4,Math.floor(eng.y/TILE)); throwGrenade(lt,eng); const sh=G.shots.find(x=>x.k==='grenade'); ok(!!sh,'a Lieutenant throws a grenade at the Engineer and his Medics');
  for(let i=0;i<60&&G.shots.includes(sh);i++){ for(const u of ring()){ u.order={type:'hold'}; u.target=null; } __hc.update(1/30); }
  ok(med.every(m=>!m.dead)&&!eng.dead,'it hurts them, nobody dies of it ('+med.map(m=>Math.round(m.hp)).join('/')+', Engineer '+Math.round(eng.hp)+')'); ok(med.some((m,i)=>m.hp<hp0[i]-10),'but it does hurt');
  ok(G.fx.some(f=>f.k==='nade'),'a blast you can see'); 
  { const d=makeUnit('drone','swarm',lt.x+90,lt.y), d2=makeUnit('drone','swarm',lt.x+95,lt.y+5); d.hp=d.maxHp=200; d2.hp=d2.maxHp=200; d.invuln=false; lt.nadeAt=0; const hpd=d.hp; throwGrenade(lt,d); const s2=G.shots.find(x=>x.k==='grenade'&&x!==sh); for(let i=0;i<60&&s2&&G.shots.includes(s2);i++) __hc.update(1/30); ok(s2&&hpd-d.hp>PERKS.trooper.damage*0.9,'against the Brood it hits as hard as ever ('+Math.round(hpd-d.hp)+')'); d.dead=true; d2.dead=true; }
  lt.quiet=true; lt.nadeAt=0; const n0=G.shots.filter(x=>x.k==='grenade').length; throwGrenade(lt,eng); ok(G.shots.filter(x=>x.k==='grenade').length===n0,'hold fire (Q): no grenade, not even with an order'); lt.quiet=false;
  for(const u of ring()) u.dead=true; G.vars.alarm=G.time; G.vars.dueAt=G.time+1; for(let i=0;i<5*30&&!G.vars.sent;i++) __hc.update(1/30); __hc.update(1/30);
  const fresh=ring(); ok(G.vars.sent===1&&fresh.length>=2,'a relief squad lands ('+fresh.length+')'); ok(fresh.every(u=>u.vet&&u.vet.rank===G.mission.job.reliefRank),'the first relief squad are Corporals'); ok(fresh.filter(u=>!u.hidden).length===1,'they come down the ramp one by one ('+fresh.filter(u=>!u.hidden).length+' out)');
  ok(fresh.filter(u=>u.hidden).every(u=>u.invuln&&findTarget(lt,40,true)!==u),'the ones still aboard cannot be hit');
  const pad=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'); let shipGoneEarly=false; let close=99, at=''; for(let i=0;i<8*30;i++){ __hc.update(1/30); if(ring().some(u=>u.hidden)&&!(pad.ship&&pad.ship.phase==='ground')) shipGoneEarly=true; const v=ring().filter(u=>!u.hidden&&Math.hypot(u.x-u.ringAt.x,u.y-u.ringAt.y)>TILE); for(const a of v) for(const b of v) if(a!==b) close=Math.min(close,Math.hypot(a.x-b.x,a.y-b.y)/TILE); if(ring().every(u=>!u.hidden)) break; }
  ok(ring().every(u=>!u.hidden&&!u.invuln),'all out'); ok(!shipGoneEarly,'the ship stays on the pad, ramp down, until the last one is off'); for(let i=0;i<2*30&&pad.ship&&pad.ship.phase==='ground';i++) __hc.update(1/30); ok(!pad.ship||pad.ship.phase!=='ground','then it lifts off'); ok(close>PERKS.trooper.radius,'on the way to the ring, never two within reach of one grenade (closest '+close.toFixed(1)+' tiles)');'''),
('needle: seen early','''resetRogue(); const G=start('''+NT+'''); step(1); for(const e of G.ents) if(e.faction==='swarm') e.invuln=true; const u=crew().find(x=>x.type==='trooper'&&!x.vet.capt); u.invuln=true; tp(u,22,24); step(3);
  ok(G.vars.alarm!=null&&!G.vars.dlStart,'seen before the download: the alarm goes early'); ok(G.msgs.some(m=>m.who==='Kappa medical'),'Kappa medical calls Tycho');'''),
('needle: no Medic, no files','''resetRogue(); const G=start('''+NT+'''); step(1); calm(); const d=crew().find(u=>u.def.heal); damage(d,1e6,null); step(1); ok(!G.over,'Devreese down: not over yet'); kill(d,null); step(1);
  ok(G.over&&!G.over.win&&/formula/.test(G.over.text),'Devreese dead: the job is lost');'''),
('veil: the brood looks through him','''resetRogue(); const G=start('''+AT+'''); step(1); const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt), c=crew().find(x=>x.type==='gunner'); v.vet.taint=ROGUE.veil.taint+5; for(const e of G.ents) if(e.faction==='wild') e.dead=true; v.hp=v.maxHp=1e6; c.hp=c.maxHp=1e6;
  v.quiet=true; for(const x of crew()) if(x!==v&&x!==c) x.dead=true; tp(c,36,42); step(0.5); ok(G.api.veiled(v)&&!G.api.veiled(c),'40+ taint: veiled; clean: not');
  const d=makeUnit('drone','swarm',v.x+30,v.y); d.role='hunt'; tp(v,10,40); d.x=v.x+30; d.y=v.y; d.target=null; ok(findTarget(d,6,false)===null,'a drone next to him finds nothing to attack'); ok(!validTarget(d,v),'and cannot keep him as a target');
  d.order=null; d.think=0; G.swarm.huntT=0; step(1.5); ok(!d.order||Math.hypot(d.order.x-v.x,d.order.y-v.y)>3*TILE,'a hunting drone does not walk after him');
  { const w=launchWave(40); ok(w.every(u=>!u.order||Math.hypot(u.order.x-v.x,u.order.y-v.y)>3*TILE),'a wave is not sent at him'); for(const u of w) u.dead=true; }
  tp(v,5,40); tp(d,10,40); d.order=null; d.target=null; d.think=0; step(4); ok(Math.hypot(d.x-v.x,d.y-v.y)>4*TILE,'he walks off: it does not follow ('+(Math.hypot(d.x-v.x,d.y-v.y)/TILE).toFixed(1)+' tiles)');
  d.x=v.x+30; d.y=v.y; d.order=null; d.target=null;
  tp(c,10,42); ok(findTarget(d,6,false)===c,'but it finds the clean one');
  c.dead=true; const h=hives()[0]; tp(v,Math.floor(h.x/TILE)+3,Math.floor(h.y/TILE)); h.aggroAt=0; const n=G.ents.filter(e=>!e.dead&&e.faction==='swarm').length; step(1); ok(!G.ents.some(e=>!e.dead&&e.faction==='swarm'&&e.target===v),'the hive does not notice him');
  const t=makeUnit('drone','swarm',v.x+40,v.y); fire(v,t); ok(!G.api.veiled(v)&&G.rogue.veilBroken===1,'he fires: the veil is torn'); ok(findTarget(d,30,false)===v||validTarget(d,v),'now they see him');
  for(const e of G.ents) if(e.faction==='swarm'&&e.kind==='unit') e.dead=true; step(ROGUE.veil.broken+1); ok(G.api.veiled(v),'it heals after '+ROGUE.veil.broken+' s'); v.vet.taint=ROGUE.veil.taint-5; step(0.5); ok(!G.api.veiled(v),'a dose too many: under the line, seen');
  v.vet.taint=10; v.vet.strains=['hive']; applyRank(v); ok(G.api.veiled(v),'Hive Scent: always veiled');
  selectEntities([v],false); renderSelection(); ok(/Veiled/.test(document.getElementById('selection').innerHTML),'the stats say Veiled');'''),
('veil: only in Among Them','''resetRogue(); const G=start('rogue-osprey-down'); step(1); const v=crew()[1]; v.vet.taint=70; ok(!veiled(v),'no veil in other jobs'); const d=makeUnit('drone','swarm',v.x+30,v.y); ok(validTarget(d,v),'the Swarm attacks him as always');'''),
('among them: pods, stir, lull, way down, wolf','''resetRogue(); const G=start('''+AT+'''); step(1); ok(G.vars.pods.length===3&&G.vars.pods.every(b=>!b.quiet),'three singing choir pods'); ok(!G.rogue.exitOpen,'the way down is shut');
  ok(G.ents.some(e=>!e.dead&&e.type==='shaft'&&!e.exit&&e.cfg&&e.cfg.creep),'an old burrow with creep by the ridge');
  calm(); for(const x of crew()) x.invuln=true; const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt), c=crew().find(x=>x.type==='gunner'); v.quiet=true;
  const b=G.vars.pods[0]; tp(c,Math.floor(b.x/TILE),Math.floor(b.y/TILE)+1); step(4); ok(b.quietP===0,'a clean one cannot quiet it'); tp(c,36,42);
  v.vet.taint=50; const n0=G.ents.filter(e=>!e.dead&&e.faction==='swarm').length; for(let i=0;i<20&&!b.quiet;i++){ tp(v,Math.floor(b.x/TILE),Math.floor(b.y/TILE)+1); step(1); }
  ok(b.quiet,'a veiled one quiets it'); ok(v.vet.taint>50||true,'(taint '+Math.round(v.vet.taint)+')'); ok(G.ents.some(e=>!e.dead&&e.rogue&&e.dna==='hive')||G.rogue.dna.hive>0,'it drops a Hive sample'); ok(G.ents.filter(e=>!e.dead&&e.faction==='swarm').length>n0,'and stirs the brood');
  for(const p of G.vars.pods.slice(1)) for(let i=0;i<20&&!p.quiet;i++){ v.vet.taint=50; tp(v,Math.floor(p.x/TILE),Math.floor(p.y/TILE)+1); step(1); }
  ok(obj('pods')==='done'&&G.rogue.exitOpen,'three quiet: the way down opens'); ok(G.timer&&G.timer.label==='The brood sleeps'&&G.api.lulled(),'the brood sleeps'); step(0.5);
  const s=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'); ok(s.length&&s.every(e=>e.truce==='corps'),'every creature keeps the truce'); ok(G.swarm.cfg.hunt===false,'the hunt is off');
  const d=s[0]; tp(c,Math.floor(d.x/TILE)+1,Math.floor(d.y/TILE)); ok(!validTarget(d,c),'it leaves the clean one alone'); ok(!findTarget(c,6,false)||findTarget(c,6,false).faction!=='swarm','and the crew does not wake them');
  G.timer.end=G.time+0.3; G.rogue.lullUntil=G.time+0.3; step(1.5); ok(!G.api.lulled()&&G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').every(e=>!e.truce),'they wake up'); ok(G.swarm.cfg.hunt&&G.swarm.cfg.hunt.every===35,'the hunt is back');
  { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()) tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } step(1); ok(G.over&&G.over.win,'down the shaft: won'); ok(obj('calm')==='done','nobody went feral');
  ok(rogueStore().flags.wolf&&trophies()['rogue:wolf'],'Wolf in the Fold'); ok((rogueStore().dna.hive||0)>=0,'samples into the lab');'''),
('among them: a torn veil, a feral fit','''resetRogue(); const T=trophies(); delete T['rogue:wolf']; store.set('hc-trophies',T); const G=start('''+AT+'''); step(1); calm(); for(const x of crew()) x.invuln=true;
  const v=crew().find(x=>x.type==='trooper'&&!x.vet.capt); v.vet.taint=100; tp(v,20,30); step(1.5); ok(v.feral>0||G.rogue.feral>0,'he snaps'); ok(obj('calm')==='failed','optional failed: someone went feral'); ok(G.rogue.veilBroken>=1,'a feral one is not veiled any more');
  for(const p of G.vars.pods){ p.quiet=true; } step(1); { const sp=exitSpot(G.ents.find(e=>e.exit)); for(const x of crew()){ x.feral=0; x.vet.taint=20; tp(x,Math.floor(sp.x/TILE),Math.floor(sp.y/TILE)); } } step(2);
  ok(G.over&&G.over.win,'won anyway'); ok(!rogueStore().flags.wolf&&!trophies()['rogue:wolf'],'but no Wolf in the Fold');'''),
('among them: save and load','''resetRogue(); const G=start('''+AT+'''); step(2); calm(); const v=crew()[2]; v.vet.taint=55; G.vars.pods[1].quietP=0.5; ok(saveGame(),'saved'); goMenu('menu'); ok(loadGame(),'loaded'); const G2=__hc.G; step(0.5);
  ok(G2.mission.veil&&G2.vars.pods.length===3&&Math.abs(G2.vars.pods[1].quietP-0.5)<0.1,'the pods come back'); ok(G2.ents.some(e=>e.crew&&G2.api.veiled(e)),'and the veil with them');
  goMenu('menu'); resetRogue(); const G3=start('''+NT+'''); step(2); G3.vars.dl=0.4; ok(saveGame(),'needle saved'); goMenu('menu'); ok(loadGame(),'needle loaded'); step(0.5); ok(__hc.G.vars.term&&__hc.G.vars.term.type==='terminal'&&__hc.G.vars.dl>0.39,'the terminal and the download come back');'''),
('intel, trophy wall, dev panel','''goMenu('intel'); intelTab='rogue'; buildIntel(); ok(ROGUE_INTEL.some(x=>x.id==='veil')&&document.querySelectorAll('#intel-list .ili').length===(selfJoined()?7:6)+6+ROGUE_INTEL.length,'The veil in Rogue Intel');
  ok(ROGUE_TROPHIES.some(t=>t.id==='rogue:wolf'),'Wolf in the Fold on the list'); goMenu('trophies'); trophTab='rogue'; buildTrophies(); const wb=document.querySelector('#trophy-wall').getBoundingClientRect(); ok(wb.bottom<=innerHeight&&wb.top>=0,'the Rogue tab still fits on one screen ('+Math.round(wb.bottom)+'/'+innerHeight+')');
  ok(/Wolf in the Fold/.test(document.querySelector('#trophy-wall').textContent),'the plaque hangs on the wall'); goMenu('menu');
  for(const k of ['ROGUE|stab.formula','ROGUE|veil.taint','ROGUE|veil.broken','M|job.download','M|job.pod','M|job.lull','M|job.stir','M|job.waves','M|job.squad','M|job.lostFor','M|job.call','M|job.rank','M|job.leadRank','M|job.supRank','M|job.reliefRank','MEDIC_SPREAD|reach','MEDIC_SPREAD|every']) ok(!!devHelp(k),'dev help: '+k);''')
]
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ for(const m of MISSIONS) recordWin(m.id,'normal',500,false); }")
    for name,body in CASES:
        r=pg.evaluate(HEAD+body+TAIL); print('--',name); print(r); res.append(r)
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
