# AI_RANKS (Nov 2026): the computer's soldiers (Corps when you play the Brood, loyal Corps in Rogue) come in with ranks by difficulty:
# one Captain (a Trooper) while none stands, Medics Lieutenant, a share of Lieutenants, the rest lower; difficulty health kept through
# the rank; a rank a Rogue script chose stays; no radio for their promotions or deaths. Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]
CODE='''([d,kind])=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+d+' '+m), said=[]; if(!window.__say0) window.__say0=say; say=(w,t,k)=>{ said.push(w+': '+t); return window.__say0(w,t,k); }; try{
  if(kind==='swarm'){ ui.diff=d; startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-lights')); }
  else { ui.diff=d; startMission(ROGUE_MISSIONS.find(m=>m.id==='rogue-dead-air')); }
  const G=__hc.G, step=s=>{ for(let i=0;i<s*30&&!G.over;i++) __hc.update(1/30); }; step(3);
  const fac=kind==='swarm'?'corps':'loyal', P=AI_RANKS[d], us=()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction===fac&&isSoldierType(e.type));
  const all=us(), capts=all.filter(u=>u.leader), meds=all.filter(u=>u.def.heal);
  ok(all.length>3&&all.every(u=>u.vet&&u.npc),'every soldier has a rank ('+all.length+')');
  ok(P.captain?capts.length===1&&capts[0].type==='trooper'&&capts[0].vet.rank===5:capts.length===0,'Captain: '+capts.map(u=>u.type).join(','));
  ok(meds.every(u=>u.vet.rank===P.medic),'Medics are rank '+P.medic);
  const rest=all.filter(u=>!u.leader&&!u.def.heal); ok(rest.every(u=>u.vet.rank===4||(u.vet.rank>=P.lo&&u.vet.rank<=P.hi)),'the rest between '+P.lo+' and '+P.hi+' or Lieutenant');
  const hk=kind==='swarm'?SWARM_DIFF[d].hp:ROGUE.loyal.hp[d], dk=kind==='swarm'?SWARM_DIFF[d].dmg:ROGUE.loyal.dmg[d];
  ok(all.every(u=>Math.abs(u.maxHp-u.def.hp*RANKS[u.vet.rank].hp*hk*(u.hpMul/hk||1))<1&&Math.abs(u.dmgMul-RANKS[u.vet.rank].dmg*dk)<0.01),'difficulty health and damage kept on top of the rank');
  if(kind==='swarm'){
    /* a drop while the Captain stands: no second Captain; after he falls the next group gets one */
    const drop=['trooper','trooper','medic'].map((t,i)=>makeUnit(t,'corps',(10+i)*TILE,36*TILE)); step(0.2);
    ok(drop.every(u=>u.vet&&u.npc)&&!drop.some(u=>u.leader),'a drop gets ranks, no second Captain');
    if(P.captain){ const c=capts[0]; const mates=G.ents.filter(e=>!e.dead&&e!==c&&e.faction==='corps'&&dist(e,c)<AURA.waver.radius*TILE); for(const e of G.ents) if(e.def&&e.def.heal&&e.faction==='corps') e.dead=true; c.invuln=false; damage(c,1e7,null); step(SQUAD.downed.time+2);
      ok(c.dead,'the Captain falls'); ok(mates.some(e=>e.waverT>0),'his squad wavers');
      const d2=['trooper','gunner'].map((t,i)=>makeUnit(t,'corps',(10+i)*TILE,37*TILE)); step(0.2); ok(d2.some(u=>u.leader),'the next group gets a new Captain'); }
    const radio=said.join(' | '); ok(!/In memory|Field promotion/.test(radio),'no radio for their deaths or promotions');
  } else {
    /* a rank the script chose stays */
    const f=G.api.loyal('trooper',{x:20,y:20},2,{rank:1}); step(0.2); ok(f.every(u=>u.vet.rank===1&&u.rankFixed),'a script rank stays');
  }
}catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    res=[]
    for kind in ['swarm','rogue']:
        for d in ['easy','normal','hard']:
            res.append(pg.evaluate(CODE,[d,kind])); pg.wait_for_timeout(100)
    b.close()
out='\n'.join(res); print(out); print(errs); print('ALL OK' if 'FAIL' not in out and not errs else 'FAILED')
