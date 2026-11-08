'use strict';
/* ---------- 31. Rogue Strain: the Osprey crew goes AWOL ----------
   The third campaign (ROGUE_MISSIONS, js/content/rogue.js). You play the Osprey crew: seven named soldiers who carry their rank,
   their strains and their taint from mission to mission (hc-rogue). No base, no dropship.
   - DNA: Swarm the crew kills (not with fire) can leave a sample; walk over it. A hive killed without fire leaves several.
   - Splice (campaign screen, Rogue side): a sample strain gives a soldier a lasting ability (STRAINS) and taint.
   - Taint: double-edged. More damage (fever), the hunt passes him by, the creep heals him; but from 85 he has seizures and at 100
     he goes feral for a while: out of your control, then he collapses. A Medic with a stabilizer dose (J) brings it down.
   - The loyal Lunar Corps (faction 'loyal') hunts the crew: they fight the Swarm and the crew alike.
   Tunables: ROGUE (js/content/rogue.js), also in the dev panel (tab Rogue). */
const ROGUE_KEY='hc-rogue';
const isRogue=()=>!!(G&&G.mission&&G.mission.rogue);
function freshCrew(c){ return { id:c.id, name:c.name, type:c.type, rank:c.rank, xp:c.xp, kills:0, missions:0, healed:0, repaired:0, sex:c.sex||undefined, capt:c.capt||undefined, strains:[], taint:0 }; }
function loadRogue(){ const r=store.get(ROGUE_KEY,null)||{}; r.crew=Array.isArray(r.crew)?r.crew:[];
  for(const c of ROGUE_CREW) if(!r.crew.some(v=>v.id===c.id)) r.crew.push(freshCrew(c));
  r.crew=r.crew.filter(v=>ROGUE_CREW.some(c=>c.id===v.id)); for(const v of r.crew){ v.strains=v.strains||[]; v.taint=v.taint||0; }
  r.dna=r.dna||{}; r.flags=r.flags||{}; r.stab=r.stab||0; return r; }
function rogueStore(){ if(!ui.rogue) ui.rogue=loadRogue(); return ui.rogue; }
function saveRogue(){ store.set(ROGUE_KEY,rogueStore()); }
function resetRogue(){ ui.rogue=null; try{ localStorage.removeItem(ROGUE_KEY); }catch(e){} rogueStore(); saveRogue(); }
/* the Rogue side opens once the Lunar Corps has won The Hollow Colony (Corps mission 4): that is where the Osprey went down */
function rogueUnlocked(){ return isDone('hollow-colony'); }
const crewDef=id=>ROGUE_CREW.find(c=>c.id===id)||{};
const crewTitle=v=>`${RANKS[v.rank].abbr} ${v.name}`;
const dnaTotal=d=>Object.values(d||{}).reduce((s,n)=>s+n,0);

/* ---- a mission starts: the crew from hc-rogue takes the field ---- */
function rogueDeploy(){
  const R=rogueStore(), st=G.mission.start, at=pt(st.crewAt||st.camera||'P'), list=R.crew.filter(v=>!(st.crewOnly&&!st.crewOnly.includes(v.id)));
  G.rogue={ dna:{}, stab:R.stab+ROGUE.stab.start+(G.mission.stab||0), feral:0, harvested:0, burnt:0, ending:null };
  const spots=freeTilesNear(at.x,at.y,list.length);
  list.forEach((v,i)=>{ const s=spots[i]||at, u=makeUnit(v.type,'corps',(s.x+.5)*TILE+rand(-4,4),(s.y+.5)*TILE+rand(-4,4));
    u.vet={ ...v, strains:[...(v.strains||[])], taint:v.taint||0 }; delete u.vet.fallen; u.crew=true; u.home={x:u.x,y:u.y}; applyRank(u); u.hp=u.maxHp; G.deployedIds.add(v.id); });
  if(G.usedNames) for(const v of list) G.usedNames.add(v.name);
}
/* strains on top of the rank bonuses (called from applyRank, so a promotion keeps them) */
function rogueStrainApply(u){ const s=u.vet.strains||[];
  u.sightAdd=0; u.nightEyes=false; u.knit=0; u.scent=false; u.acidRounds=false; if(u.chitin){ u.armor=undefined; u.chitin=false; }
  if(s.includes('crawler')){ u.sightAdd=2; u.nightEyes=true; u.speedMul*=1.05; }
  if(s.includes('drone')) u.speedMul*=1.15;
  if(s.includes('spitter')){ u.dmgMul*=1.15; u.acidRounds=true; }
  if(s.includes('brute')){ u.armor=(u.def.armor||0)+0.2; u.chitin=true; const f=u.hp/u.maxHp; u.maxHp*=1.15; u.hp=u.maxHp*f; }
  if(s.includes('husk')) u.knit=2.5;
  if(s.includes('hive')) u.scent=true;
  if(u.feral) u.speedMul*=1.3; }
/* fever: taint makes him hit harder (fire() multiplies by this) */
function feverOf(u){ return u&&u.crew&&u.vet&&u.vet.taint>0 ? 1+u.vet.taint*ROGUE.taint.fever : 1; }
/* the Swarm smells one of its own: the hunt passes him by (taint ≥ scent, or the Hive strain) */
function rogueHuntSkip(e){ return !!(e.crew&&e.vet&&(e.scent||e.vet.taint>=ROGUE.taint.scent)); }

/* ---- the mission is won: what the crew carries home ---- */
function rogueSettle(){
  const R=rogueStore(), T=ROGUE.taint, alive=new Map(), FV=G.fallenVets||{}, res={ back:[], dna:{...G.rogue.dna}, promoted:[], taint:[] };
  for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.crew) alive.set(u.vet.id,u);
  for(const v of R.crew){ if(!G.deployedIds.has(v.id)) continue; const u=alive.get(v.id), n=u?u.vet:FV[v.id]; if(!n) continue;
    const r0=v.rank; v.xp=n.xp; v.rank=Math.max(v.rank,n.rank||0); v.kills=n.kills||0; v.healed=n.healed||0; v.repaired=n.repaired||0; v.missions=(v.missions||0)+1;
    if(v.rank>r0) res.promoted.push({ name:v.name, rank:v.rank });
    const was=Math.round(n.taint||0);
    if(u) v.taint=Math.max(0,was-T.rest);
    else { v.taint=Math.min(T.feral-5,was+T.fallen); res.back.push(v.name); }   /* the strain stitched him back together */
    res.taint.push({ name:v.name, from:was, to:v.taint, back:!u }); }
  for(const [k,n] of Object.entries(G.rogue.dna)) R.dna[k]=(R.dna[k]||0)+n;
  R.stab=Math.max(0,G.rogue.stab);
  if(G.rogue.feral>0) R.flags.feral=true;
  if(G.rogue.ending){ R.ending=G.rogue.ending; if(G.rogue.ending==='ascend') for(const v of R.crew) if(!v.strains.includes('mother')) v.strains.push('mother'); }
  saveRogue(); G.rogueResult=res; G.rogueWon=checkRogueTrophies(); }
/* ---- trophies of the Rogue campaign (a row on the Trophy wall) ---- */
function rogueTrophyHave(id){ const R=rogueStore(), all=ROGUE_MISSIONS.length&&ROGUE_MISSIONS.every(m=>isDone(m.id));
  if(id==='rogue:done') return all; if(id==='rogue:ascend') return R.ending==='ascend'; if(id==='rogue:ashes') return R.ending==='ashes';
  if(id==='rogue:full') return R.crew.some(v=>STRAIN_ORDER.every(k=>v.strains.includes(k))); if(id==='rogue:cold') return all&&!R.flags.feral; return false; }
function checkRogueTrophies(){ const T=trophies(), won=[]; for(const t of ROGUE_TROPHIES){ if(!T[t.id]&&rogueTrophyHave(t.id)){ T[t.id]={ at:Date.now() }; won.push(t.id); } }
  if(won.length) store.set('hc-trophies',T); return won; }

/* ---- splicing (campaign screen) ---- */
const SPLICE_MAX=95;   /* Devreese will not push anyone past this much taint */
function canSplice(v,k){ const R=rogueStore(), S=STRAINS[k]; if(!S||v.strains.includes(k)) return 'He already carries it.';
  if((R.dna[k]||0)<S.cost) return `Needs ${S.cost} ${S.from} samples.`; if(v.taint+S.taint>SPLICE_MAX) return `Too much taint: ${v.name} cannot take another strain yet.`; return null; }
function splice(id,k){ const R=rogueStore(), v=R.crew.find(x=>x.id===id); if(!v) return 'Nobody to splice.'; const err=canSplice(v,k); if(err) return err;
  const S=STRAINS[k]; R.dna[k]-=S.cost; v.strains.push(k); v.taint=Math.min(SPLICE_MAX,v.taint+S.taint); saveRogue(); checkRogueTrophies(); return null; }
function stabilizeCrew(id){ const R=rogueStore(), v=R.crew.find(x=>x.id===id); if(!v) return 'Nobody.'; if(R.stab<1) return 'No stabilizer left.'; if(v.taint<1) return `${v.name} is clean.`;
  R.stab--; v.taint=Math.max(0,v.taint-ROGUE.stab.amount); saveRogue(); return null; }

/* ---- during a mission ---- */
function rogueTick(dt){ if(!isRogue()||!G.rogue) return; const T=ROGUE.taint;
  G.rogueAcidT=(G.rogueAcidT||0)-dt; const acidTick=G.rogueAcidT<=0; if(acidTick) G.rogueAcidT=0.25;
  for(const u of G.ents){ if(u.dead||u.kind!=='unit') continue;
    if(u.rogueAcid>0&&acidTick){ u.rogueAcid-=0.25; const fl=u.flash; damage(u,2*0.25*4,u.acidBy&&!u.acidBy.dead?u.acidBy:{faction:'corps',dead:true,def:{}}); u.flash=fl;
      if(!u.dead&&Math.random()<0.5&&animOnScreen(u.x,u.y)) G.fx.push({k:'spark',x:u.x+rand(-5,5),y:u.y-rand(4,14),vx:rand(-10,10),vy:rand(-30,-10),t:0.4,max:0.4,col:'#a6ff4a'}); }
    if(!u.crew||u.dead||!u.vet) continue; const v=u.vet;
    if(u.feral>0){ u.feral-=dt; if(u.feral<=0) endFeral(u,false); continue; }
    if(u.downed) continue;
    if(creepAt(u.x,u.y)>0.3){ v.taint=Math.min(T.feral,v.taint+T.creep*dt); if(v.taint>=T.mend&&u.hp<u.maxHp) u.hp=Math.min(u.maxHp,u.hp+T.mendRate*dt); }
    if(u.knit&&u.hp<u.maxHp&&G.time-(u.hitAt??-99)>4) u.hp=Math.min(u.maxHp,u.hp+u.knit*dt);
    if(v.taint>=T.seizure){ u.seizeT=(u.seizeT??rand(T.seizureEvery,T.seizureEvery2)*0.5)-dt;
      if(u.seizeT<=0){ u.seizeT=rand(T.seizureEvery,T.seizureEvery2); u.stunT=T.seizureTime; u.target=null; G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.2,max:1.2,txt:'SEIZURE',col:'#9dff6a'});
        if(!G.saidSeize){ G.saidSeize=true; say('Devreese',`${v.name} is seizing! Too much strain in the blood. A stabilizer dose brings it down: select me and press J.`,'crew'); } } }
    else u.seizeT=null;
    if(v.taint>=T.feral) goFeral(u); }
  /* samples: walk over them; they rot away after a while */
  for(const c of G.ents){ if(c.dead||!c.rogue||c.heart) continue; c.t-=dt; if(c.t<=0){ c.dead=true; continue; }   /* c.heart: the Brood Mother's heart (job 6), the mission decides */
    const u=G.ents.find(e=>e.kind==='unit'&&!e.dead&&!e.downed&&e.crew&&!e.feral&&dist(e,c)<e.r+12); if(!u) continue; c.dead=true;
    if(c.dna){ G.rogue.dna[c.dna]=(G.rogue.dna[c.dna]||0)+1; SFX.play('pickup'); G.fx.push({k:'text',x:c.x,y:c.y-10,t:1.2,max:1.2,txt:`+1 ${STRAINS[c.dna].from} DNA`,col:'#9dff6a'});
      if(!G.saidDna){ G.saidDna=true; say('Devreese','Got it, a clean sample. Keep them coming: every strain I can bottle, I can put into one of us between jobs.','crew'); } }
    if(c.stab){ G.rogue.stab+=c.stab; SFX.play('pickup'); G.fx.push({k:'text',x:c.x,y:c.y-10,t:1.2,max:1.2,txt:`+${c.stab} stabilizer`,col:'#7fdfff'}); }
    if(c.loot){ G.salvage+=c.loot; SFX.play('pickup'); G.fx.push({k:'text',x:c.x,y:c.y-10,t:1.2,max:1.2,txt:'+'+c.loot,col:'#ffb347'}); G.stats.crates++; } }
  loyalAI(dt); }
function goFeral(u){ const T=ROGUE.taint; if(u.feral>0) return; u.feral=T.feralTime; G.rogue.feral++; u.order=null; u.path=null; u.target=null; u.stance=null;
  if(typeof leaveFormation==='function') leaveFormation([u]); if(G.sel.includes(u)){ G.sel=G.sel.filter(x=>x!==u); G.selDirty=true; }
  applyRank(u); SFX.play('huskroar',u.x,u.y); G.fx.push({k:'text',x:u.x,y:u.y-34,t:1.6,max:1.6,txt:'FERAL',col:'#ff5a4f'}); G.pings.push({x:u.x,y:u.y,t:0,col:'#ff5a4f'});
  say(u.vet.type==='medic'?'Capt. Haesaert':'Devreese',`${u.vet.name} has gone feral! Stay clear of ${pron(u.vet,'him')}, it passes. Or get a stabilizer into ${pron(u.vet,'him')}.`,'crew alert'); }
function endFeral(u,dosed){ const T=ROGUE.taint; u.feral=0; applyRank(u); u.target=null; u.order=null;
  if(!dosed){ u.stunT=T.collapse; u.vet.taint=T.after; G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.4,max:1.4,txt:'COLLAPSES',col:'#9dff6a'}); }
  else u.stunT=0.8;
  u.home={x:u.x,y:u.y}; G.selDirty=true; }
/* a feral soldier runs at whatever is closest and hostile; nobody can give him orders */
function feralThink(u,dt){
  if(!u.target||!validTarget(u,u.target)||dist(u,u.target)>14*TILE){ u.feralScan=(u.feralScan||0)-dt;
    if(u.feralScan<=0){ u.feralScan=0.5; u.target=nearestOf(u,e=>e.kind==='unit'&&!e.dead&&!e.downed&&hostile(u.faction,e.faction)&&e.faction!=='wild'&&dist(u,e)<14*TILE&&!e.invuln); } }
  if(u.target){ engage(u,dt,false); return; }
  if(!u.path||u.pi>=u.path.length){ const a=rand(0,Math.PI*2), r=rand(2,4)*TILE, x=u.x+Math.cos(a)*r, y=u.y+Math.sin(a)*r; if(walkableP(x,y)) setPath(u,x,y); }
  stepMove(u,dt); }
/* a Medic of the crew with a dose: the most tainted one in reach (a feral one first) */
function stabTarget(m){ let best=null, bs=-1; for(const u of G.ents){ if(u.dead||u.kind!=='unit'||!u.crew||u.downed) continue; if(dist(m,u)>ROGUE.stab.reach*TILE) continue;
    const s=(u.feral>0?1000:0)+u.vet.taint; if(u.vet.taint>=5&&s>bs){ bs=s; best=u; } } return best; }
function rogueStabilize(){ const meds=myUnits().filter(u=>u.crew&&u.def.heal);
  if(!meds.length){ toast('Select a Medic of the crew.'); return; } if(!(G.rogue.stab>0)){ toast('No stabilizer left.'); return; }
  let t=null, by=null; for(const m of meds){ const x=stabTarget(m); if(x&&(!t||(x.feral>0)>(t.feral>0)||x.vet.taint>t.vet.taint)){ t=x; by=m; } }
  if(!t){ toast(`Nobody within ${ROGUE.stab.reach} tiles needs a dose.`); return; }
  G.rogue.stab--; t.vet.taint=Math.max(0,t.vet.taint-ROGUE.stab.amount); if(t.feral>0) endFeral(t,true); t.seizeT=null; uiUsed('stab');
  SFX.play('heal',t.x,t.y); G.fx.push({k:'text',x:t.x,y:t.y-30,t:1.4,max:1.4,txt:'STABILIZED',col:'#7fdfff'}); for(let i=0;i<10;i++) G.fx.push({k:'spark',x:t.x+rand(-6,6),y:t.y-rand(4,18),vx:rand(-20,20),vy:rand(-50,-10),t:0.6,max:0.6,col:'#7fdfff'});
  by.face=t.x>=by.x?1:-1; G.selDirty=true; }

/* ---- kills: samples, harvests and the loyal Corps ---- */
const burntBy=(e,src)=>!!((src&&src.def&&src.def.attack==='flame')||e.burnT>0||(src&&src.dead&&!src.def));
function dropSample(x,y,dna,spread){ let px=x, py=y;
  for(let k=0;k<12;k++){ const a=rand(0,Math.PI*2), r=spread?rand(0.4,spread)*TILE:k*3; px=x+Math.cos(a)*r; py=y+Math.sin(a)*r; if(walkableP(px,py)) break; px=null; }
  if(px==null){ const f=freeTilesNear(Math.floor(x/TILE),Math.floor(y/TILE),1)[0]; if(!f) return; px=(f.x+.5)*TILE; py=(f.y+.5)*TILE; }   /* never lost in the rock */
  G.ents.push({ id:NEXT_ID++, kind:'crate', rogue:true, dna, x:px, y:py, r:7, faction:'none', t:ROGUE.dna.life, seed:Math.random()*9 }); }
function rogueKill(e,src){ if(!isRogue()||!G.rogue) return;
  if(e.kind==='unit'&&e.faction==='loyal'&&src&&src.faction==='corps'&&src.vet&&!src.dead){ src.vet.kills++; gainXP(src,ROGUE.loyal.xp); G.stats.loyal=(G.stats.loyal||0)+1; }
  if(e.kind==='unit'&&e.crew){ const f=(G.fallenVets||{})[e.vet.id]; if(f) f.taint=e.vet.taint; if(e.feral>0) e.feral=0;
    const v=e.vet, doc=e.def.heal?'Capt. Haesaert':'Devreese';
    if(!G.saidCrewDown){ G.saidCrewDown=true; setTimeout(()=>{ if(G&&!G.over) say(doc,doc==='Devreese'?`We lost ${v.name}... no. Wait. The strain is still moving in ${pron(v,'him')}. Win this, and I can bring ${pron(v,'him')} back. ${pron(v,'He')} will not come back clean.`:`Devreese is down... but look at her hand, it is still twitching. The strain will not let her go. Win this and we carry her out.`,'crew'); },1500); }
    else say('Crew',`${crewTitle(v)} is down. Win the job and the strain brings ${pron(v,'him')} back, tainted.`,'alert');
    return; }
  const crewKill=src&&(src.crew||(src.faction==='corps'&&src.dead));
  if(e.kind==='building'&&e.type==='hive'){ if(!crewKill) return;
    if(burntBy(e,src)){ G.rogue.burnt++; G.fx.push({k:'text',x:e.x,y:e.y-40,t:1.6,max:1.6,txt:'BURNT · NO SAMPLES',col:'#ff9a3c'});
      if(!G.saidBurnt){ G.saidBurnt=true; say('Devreese','Mortier! You cooked it. There is nothing left in there I can use. Kill them with lead if you want samples.','crew'); } return; }
    G.rogue.harvested++; for(let i=0;i<ROGUE.dna.hive;i++) dropSample(e.x,e.y+TILE,'hive',2.4); G.fx.push({k:'text',x:e.x,y:e.y-40,t:1.6,max:1.6,txt:'HARVEST',col:'#9dff6a'}); return; }
  if(e.kind!=='unit'||e.faction!=='swarm'||!crewKill) return; const ch=ROGUE.dna[e.type]; if(!ch||e.def.boss) return;
  if(burntBy(e,src)) return;   /* fire leaves nothing to harvest */
  if(Math.random()<ch) dropSample(e.x,e.y,e.type,0); }
/* Acid Blood: his rounds leave acid in the wound */
function acidRound(u,t){ if(t.kind!=='unit'||t.faction==='corps'||t.def.boss) return; t.rogueAcid=2; t.acidBy=u; }

/* ---- the loyal Lunar Corps: they hold, patrol or hunt, and come to help each other ---- */
function loyalScale(u){ const L=ROGUE.loyal, k=G.diffKey||'normal'; u.hp=u.maxHp=u.maxHp*(L.hp[k]||1); u.dmgMul=(u.dmgMul||1)*(L.dmg[k]||1); }
function loyalAI(dt){ G.loyalT=(G.loyalT||0)-dt; if(G.loyalT>0) return; G.loyalT=0.5;
  const L=ROGUE.loyal, hit=G.ents.filter(e=>!e.dead&&e.faction==='loyal'&&e.hitAt!=null&&G.time-e.hitAt<3);
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='loyal'||u.downed) continue;
    if(hit.length&&!u.target&&u.def.damage&&!(u.order&&u.order.type==='move')){ const h=hit.find(e=>e!==u&&dist(e,u)<L.help*TILE);
      if(h){ const foe=nearestOf(h,e=>e.kind==='unit'&&!e.dead&&!e.downed&&(e.faction==='corps'||e.faction==='swarm')&&dist(e,h)<9*TILE); if(foe) u.target=foe; } }
    if(u.target) continue;
    if(u.hunter&&(!u.order||u.order.type!=='amove'||G.time>(u.huntAt||0)+12)&&G.time>(u.huntAt||0)){ u.huntAt=G.time+5;
      const t=nearestOf(u,e=>e.kind==='unit'&&e.crew&&!e.dead); if(t){ u.home=null; u.order={type:'amove',x:t.x+rand(-24,24),y:t.y+rand(-24,24)}; setPath(u,u.order.x,u.order.y); } continue; }
    if(u.patrol&&!u.order){ const P=u.patrol, p=ptWorld(P.pts[P.i%P.pts.length]); P.i++; if(p){ u.home=null; u.order={type:'amove',x:p.x+rand(-20,20),y:p.y+rand(-20,20)}; setPath(u,u.order.x,u.order.y); } } } }
/* the extra mission API for Rogue missions (mixed into g) */
function rogueApi(){ return {
  /* loyal(type, at, n, { hunter, patrol:[points], hold, tough }) : Lunar Corps soldiers who shoot the crew on sight */
  loyal(type,at,n=1,opt={}){ const us=spawnAt(type,'loyal',at,n);
    for(const u of us){ loyalScale(u); u.home={x:u.x,y:u.y}; if(opt.hunter) u.hunter=true; if(opt.patrol) u.patrol={ pts:opt.patrol, i:Math.floor(Math.random()*opt.patrol.length) };
      if(opt.hold) u.order={type:'hold'}; if(opt.tough){ u.hp=u.maxHp=u.maxHp*opt.tough; } if(opt.name) u.loyalName=opt.name; }
    return us; },
  /* loyalB(type, at): a Lunar Corps structure (relay, sentry, barricade) that belongs to them */
  loyalB(type,at){ const p=pt(at); if(!p) return null; const s=BUILDINGS[type].size; for(const o of SPIRAL){ const x=p.x+o.x, y=p.y+o.y; let ok=true;
      for(let j=0;j<s&&ok;j++) for(let i=0;i<s;i++) if(!walkableT(x+i,y+j)){ ok=false; break; } if(ok){ const b=makeBuilding(type,'loyal',x,y,true); return b; } } return null; },
  loyals:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='loyal'),
  hunt(list){ for(const u of list||[]) if(!u.dead){ u.hunter=true; u.patrol=null; if(u.order&&u.order.type==='hold') u.order=null; } },
  crew:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.crew),
  crewUp:()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.crew).length,
  crewNear(at,r){ const p=ptWorld(at); if(!p) return 0; return G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.crew&&Math.hypot(e.x-p.x,e.y-p.y)<=r*TILE).length; },
  crewMember:id=>G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.crew&&e.vet.id===id)||null,
  /* spotted(): a loyal soldier or gun that is shooting at (or about to shoot) one of the crew, or null */
  spotted(){ return G.ents.find(e=>!e.dead&&e.faction==='loyal'&&e.target&&!e.target.dead&&e.target.crew)||null; },
  dna:k=>k?(G.rogue.dna[k]||0):dnaTotal(G.rogue.dna),
  harvested:()=>G.rogue.harvested,
  sample(k,at,n=1,spread=1.2){ const p=ptWorld(at); if(p) for(let i=0;i<n;i++) dropSample(p.x,p.y,k,spread); },
  cache(at,{ stab=0, loot=0 }={}){ const p=ptWorld(at); if(!p) return; G.ents.push({ id:NEXT_ID++, kind:'crate', rogue:true, stab:stab||undefined, loot:loot||undefined, x:p.x, y:p.y, r:8, faction:'none', t:1e9, seed:Math.random()*9 }); },
  stabs:()=>G.rogue.stab,
  crewSay:(who,text)=>say(who,text,'crew'),
  ending(k){ G.rogue.ending=k; }
}; }

/* ---- drawing ---- */
function tintSprite(sp,key,col,mul){ let r=sp[key]; if(r) return r; r={};
  for(const k of ['img','flip']){ const c=document.createElement('canvas'); c.width=sp[k].width; c.height=sp[k].height; const x=c.getContext('2d');
    x.drawImage(sp[k],0,0); x.globalCompositeOperation='source-atop'; x.fillStyle=col; x.fillRect(0,0,c.width,c.height);
    x.globalCompositeOperation='multiply'; x.fillStyle=mul; x.fillRect(0,0,c.width,c.height); x.globalCompositeOperation='destination-in'; x.drawImage(sp[k],0,0); r[k]=c; }
  return sp[key]=r; }
/* the loyal Corps: cold blue-grey kit and a blue chevron over the helmet */
const loyalSprite=sp=>tintSprite(sp,'loyal','rgba(90,140,230,.32)','rgba(190,205,235,1)');
function drawLoyalMark(e,top){ const x=Math.round(e.x), y=Math.round(top);
  ctx.fillStyle='#000'; ctx.fillRect(x-4,y-1,9,5); ctx.fillStyle='#7fb2ff'; ctx.fillRect(x-3,y,2,2); ctx.fillRect(x-1,y+1,3,2); ctx.fillRect(x+2,y,2,2); }
/* taint: a green glow that grows with it; above the mend line the veins show through; feral: a red one */
function drawTaint(u,now,x,y,w,h,sp){ const t=u.vet.taint||0;
  if(u.feral>0){ const p=0.5+0.5*Math.sin(now/90); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(u.x,u.y-10,2,u.x,u.y-10,26); g.addColorStop(0,`rgba(255,70,60,${0.28+0.18*p})`); g.addColorStop(1,'rgba(255,70,60,0)'); ctx.fillStyle=g; ctx.fillRect(u.x-28,u.y-38,56,56); ctx.globalCompositeOperation='source-over'; return; }
  if(t<15) return; const a=Math.min(1,t/100), p=0.5+0.5*Math.sin(now/(420-a*250)+u.id);
  ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(u.x,u.y-10,2,u.x,u.y-10,14+a*10); g.addColorStop(0,`rgba(130,255,90,${(0.06+0.16*a)*(0.6+0.4*p)})`); g.addColorStop(1,'rgba(130,255,90,0)'); ctx.fillStyle=g; ctx.fillRect(u.x-26,u.y-36,52,52); ctx.globalCompositeOperation='source-over'; }
function drawTaintVeins(u,x,y,w,h,sp){ const t=u.vet.taint||0; if(t<ROGUE.taint.mend||u.feral>0) return; const z=risenSprite(sp); ctx.globalAlpha=Math.min(0.75,(t-ROGUE.taint.mend)/55); ctx.drawImage(u.face>0?z.img:z.flip,x,y,w,h); ctx.globalAlpha=1; }
/* a sample (a pulsing vial of ichor), a stabilizer case or a loot case */
function drawRogueCrate(c,now){ const bob=Math.sin(now/280+c.seed)*1.5, x=Math.round(c.x), y=Math.round(c.y+bob);
  if(c.heart){ const b=1+0.12*Math.max(0,Math.sin(now/180))**8+0.06*Math.max(0,Math.sin(now/180+0.6))**8, r=10*b;   /* it still beats: a double thump */
    ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(c.x,c.y-6,2,c.x,c.y-6,34); g.addColorStop(0,'rgba(195,139,255,.55)'); g.addColorStop(1,'rgba(195,139,255,0)'); ctx.fillStyle=g; ctx.fillRect(c.x-36,c.y-42,72,72); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#2a0f22'; ctx.beginPath(); ctx.ellipse(c.x,c.y-6,r+2,r*0.85+2,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#8a2f6a'; ctx.beginPath(); ctx.ellipse(c.x,c.y-6,r,r*0.85,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c38bff'; ctx.fillRect(Math.round(c.x-r*0.5),Math.round(c.y-9),3,3); ctx.strokeStyle='#a6ff4a'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(c.x-r,c.y-4); ctx.quadraticCurveTo(c.x,c.y-14,c.x+r,c.y-6); ctx.stroke(); return; }
  if(c.dna){ const fade=c.t<10?(0.4+0.6*Math.abs(Math.sin(now/120))):1; ctx.globalAlpha=fade;
    ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(x,y-4,1,x,y-4,12); g.addColorStop(0,'rgba(150,255,90,.45)'); g.addColorStop(1,'rgba(150,255,90,0)'); ctx.fillStyle=g; ctx.fillRect(x-12,y-16,24,24); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#0a0b10'; ctx.fillRect(x-3,y-11,7,12); ctx.fillStyle='#cfd8e0'; ctx.fillRect(x-2,y-12,5,2); ctx.fillStyle=c.dna==='hive'?'#c38bff':'#8dff4a'; ctx.fillRect(x-2,y-8,5,8); ctx.fillStyle='#e8ffd0'; ctx.fillRect(x-1,y-7,1,3); ctx.globalAlpha=1; return; }
  ctx.fillStyle='#0a0b10'; ctx.fillRect(x-7,y-9,15,11); ctx.fillStyle=c.stab?'#3a6f86':'#6b5a3a'; ctx.fillRect(x-6,y-8,13,9); ctx.fillStyle=c.stab?'#7fdfff':'#ffb347'; ctx.fillRect(x-1,y-7,3,7); ctx.fillRect(x-4,y-5,9,3); }

/* ---- HUD ---- */
function rogueHud(){ const on=isRogue()&&!!G.rogue, w=$('#r-dna-wrap'), s=$('#r-stab-wrap'); if(w) w.hidden=!on; if(s) s.hidden=!on; if(!on) return; $('#r-supply-wrap').hidden=true;   /* no base, no supply */
  $('#r-dna').textContent=dnaTotal(G.rogue.dna); $('#r-stab').textContent=G.rogue.stab;
  w.dataset.tip='DNA samples this mission|'+(STRAIN_ORDER.filter(k=>G.rogue.dna[k]).map(k=>`${G.rogue.dna[k]}× ${STRAINS[k].from}`).join(', ')||'None yet. Kill Swarm without fire and walk over what they leave.')+' They go into the splice lab when you win.';
  s.dataset.tip=`Stabilizer|Doses left. Select a Medic of the crew and press J: the most tainted soldier within ${ROGUE.stab.reach} tiles loses ${ROGUE.stab.amount} taint, and a feral one comes back to his senses. Doses you do not use are kept.`; }
function rogueStats(e){ if(!isRogue()||!e.crew||!e.vet) return ''; const v=e.vet, T=ROGUE.taint, t=Math.round(v.taint);
  const st=(v.strains||[]).filter(k=>STRAINS[k]).map(k=>STRAINS[k].name).join(', ');
  const fx=[t>=T.scent||e.scent?'the hunt passes him by':'', t>=T.mend?'the creep heals him':'', t>=T.seizure?'seizures':''].filter(Boolean).join(', ');
  return `<span>Taint <b style="color:${t>=T.seizure?'#ff5a4f':t>=T.mend?'#9dff6a':'#cfe8b0'}">${t}%</b></span>${t>0?`<span>Fever <b>+${Math.round(t*T.fever*100)}% dmg</b></span>`:''}${fx?`<span><b style="color:#9dff6a">${fx}</b></span>`:''}${e.feral>0?'<span><b style="color:#ff5a4f">FERAL</b></span>':''}${st?`<span>Strains <b>${st}</b></span>`:''}`; }
function rogueButtons(units,out){ if(!isRogue()||!units.some(u=>u.crew&&u.def.heal)) return;
  out.push({ row:'Orders', key:'J', glyph:'✚', cost:`${G.rogue.stab}`, off:!(G.rogue.stab>0), tip:`Stabilizer|The Medic injects the most tainted soldier within ${ROGUE.stab.reach} tiles: ${ROGUE.stab.amount} taint less, and a feral one comes back to his senses at once. ${G.rogue.stab} dose${G.rogue.stab===1?'':'s'} left.`, act:rogueStabilize }); }

/* ---- campaign screen, Rogue side: the crew and the splice lab ---- */
let crewSel=null;
function taintBar(t){ const T=ROGUE.taint, col=t>=T.seizure?'#ff5a4f':t>=T.mend?'#9dff6a':t>=T.scent?'#c9f07a':'#7d8a6e';
  return `<span class="tbar2" title="Taint ${Math.round(t)}%"><span style="width:${Math.min(100,t)}%;background:${col}"></span><i style="left:${T.scent}%"></i><i style="left:${T.mend}%"></i><i style="left:${T.seizure}%"></i></span>`; }
function buildCrew(){ const R=rogueStore(), el=$('#hero-card'); if(!crewSel||!R.crew.some(v=>v.id===crewSel)) crewSel=R.crew[0].id;
  const v=R.crew.find(x=>x.id===crewSel), T=ROGUE.taint, d=crewDef(v.id);
  const dna=STRAIN_ORDER.map(k=>`<span class="dchip ${R.dna[k]?'':'zero'}" title="${STRAINS[k].from} samples">${STRAINS[k].glyph} ${STRAINS[k].from} <b>${R.dna[k]||0}</b></span>`).join('');
  el.innerHTML=`<div class="lbl">The Osprey crew · splice lab</div>
    <div class="dna-row">${dna}<span class="dchip stab" title="Stabilizer doses: take one into the next mission, or use one here">✚ Stabilizer <b>${R.stab}</b></span></div>
    <div class="crew-list">${R.crew.map(c=>`<button type="button" class="crow ${c.id===crewSel?'on':''}" data-crew="${c.id}"><img alt="" src="${iconUrl(c.type)}"><span class="cn">${c.capt?'✪ ':''}${crewTitle(c)}<small>${UNITS[c.type].name}${c.missions?` · ${c.missions} job${c.missions>1?'s':''}`:''}</small></span>${taintBar(c.taint)}<span class="cs">${c.strains.map(k=>k==='mother'?'<b title="Mother strain" class="ms">♛</b>':`<b title="${STRAINS[k]?STRAINS[k].name:k}">${STRAINS[k]?STRAINS[k].glyph:'?'}</b>`).join('')}</span></button>`).join('')}</div>
    <div class="crew-detail"><p class="lede" style="margin:0"><b>${crewTitle(v)}</b>, ${UNITS[v.type].name}${v.sex==='f'?' (she)':''}. ${d.bio||''} Taint <b>${Math.round(v.taint)}%</b>${v.taint>=T.seizure?': seizures, close to going feral.':v.taint>=T.mend?': the creep heals '+pron(v,'him')+'.':v.taint>=T.scent?': the hunt passes '+pron(v,'him')+' by.':'.'}</p>
      <div class="splice-row">${STRAIN_ORDER.map(k=>{ const S=STRAINS[k], has=v.strains.includes(k), err=has?null:canSplice(v,k);
        return `<button type="button" class="splice ${has?'has':''}" data-splice="${k}" ${has||err?'disabled':''} title="${S.name}: ${S.text}${err&&!has?' · '+err:''}"><span class="g">${S.glyph}</span><b>${S.name}</b><small>${has?'carries it':`${S.cost} ${S.from} · +${S.taint} taint`}</small></button>`; }).join('')}
        <button type="button" class="splice stabb" data-stabcrew="1" ${R.stab<1||v.taint<1?'disabled':''} title="A stabilizer dose: −${ROGUE.stab.amount} taint"><span class="g">✚</span><b>Stabilize</b><small>1 dose · −${ROGUE.stab.amount} taint</small></button></div>
      <p class="rdim" style="margin:0;font-size:12px">Taint: from ${T.scent}% the hunt passes ${pron(v,'him')} by, from ${T.mend}% the creep heals ${pron(v,'him')}, from ${T.seizure}% seizures, at ${T.feral}% ${pron(v,'he')} goes feral for ${T.feralTime} s. Every point of taint adds ${(T.fever*100).toFixed(1)}% damage. After every won job ${T.rest} taint fades. A fallen crew member comes back with +${T.fallen}.</p></div>`; }
$('#hero-card').addEventListener('click',e=>{ if(ui.campSide!=='rogue') return;
  const c=e.target.closest('[data-crew]'); if(c){ crewSel=c.dataset.crew; buildCrew(); return; }
  const s=e.target.closest('[data-splice]'); if(s&&!s.disabled){ const v=rogueStore().crew.find(x=>x.id===crewSel), k=s.dataset.splice, err=splice(crewSel,k); if(err){ toast(err); return; }
    SFX.play('squelch'); buildCrew(); toast(`${v.name} takes the ${STRAINS[k].name} strain.`,true); return; }
  const b=e.target.closest('[data-stabcrew]'); if(b&&!b.disabled){ const err=stabilizeCrew(crewSel); if(err){ toast(err); return; } SFX.play('heal'); buildCrew(); toast('One dose of stabilizer.',true); } });
/* the briefing of a Rogue mission: who goes, how tainted, what you have in the lab */
function rogueBriefNote(){ const R=rogueStore(); return `<p class="rdim">The crew: ${R.crew.map(v=>`${crewTitle(v)}${v.taint>=ROGUE.taint.seizure?' <b style="color:#ff5a4f">(taint '+Math.round(v.taint)+'%)</b>':v.taint>0?' ('+Math.round(v.taint)+'%)':''}`).join(', ')}. Stabilizer: ${R.stab+ROGUE.stab.start} dose${R.stab+ROGUE.stab.start===1?'':'s'}.</p>`; }
/* the end screen of a won Rogue mission */
function rogueEndHtml(){ const r=G.rogueResult; if(!r) return ''; const out=[];
  const got=STRAIN_ORDER.filter(k=>r.dna[k]).map(k=>`${r.dna[k]}× ${STRAINS[k].from}`).join(', ');
  out.push(`<div class="vsec"><span class="lbl">Samples</span><div>${got||'No samples this time.'}${G.rogue.harvested?` · ${G.rogue.harvested} hive${G.rogue.harvested>1?'s':''} harvested`:''}${G.rogue.burnt?` · ${G.rogue.burnt} burnt`:''}. They are in the splice lab on the campaign screen.</div></div>`);
  if(r.back.length) out.push(`<div class="vsec fallen"><span class="lbl">Back from the dead</span><div>${r.back.join(', ')}: the strain stitched ${r.back.length>1?'them':pron(rogueStore().crew.find(v=>v.name===r.back[0]),'him')} back together (+${ROGUE.taint.fallen} taint).</div></div>`);
  if(r.promoted.length) out.push(`<div class="vsec"><span class="lbl">Promotions</span><div>${r.promoted.map(p=>`${p.name}: ${RANKS[p.rank].name}`).join(', ')}</div></div>`);
  out.push(`<div class="vsec"><span class="lbl">Taint</span><div>${r.taint.map(x=>`${x.name} ${x.to}%`).join(' · ')}</div></div>`);
  if((G.rogueWon||[]).length) out.push(`<div class="vsec troph"><span class="lbl">🏆 Trophy earned</span>${G.rogueWon.map(id=>{ const t=ROGUE_TROPHIES.find(x=>x.id===id); return `<div>${t.name}: ${t.what.toLowerCase()}. It hangs on the Trophy wall.</div>`; }).join('')}</div>`);
  return out.join(''); }
/* the Trophy wall row */
function rogueTrophyRow(){ const T=trophies();
  return `<div class="trow grand rogue-row"><span class="trole">Rogue</span>${ROGUE_TROPHIES.map(t=>{ const w=T[t.id]; return `<div class="plaque grandp rogue ${w?'won':''}" title="${t.name}|${t.what}">${CUP_SVG}<b>${t.name}</b><i>${t.what}</i><i>${w?new Date(w.at).toLocaleDateString():'not yet'}</i></div>`; }).join('')}</div>`; }
