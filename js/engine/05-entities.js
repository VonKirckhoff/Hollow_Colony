'use strict';
/* ---------- 2d. entities ---------- */
function makeUnit(type,faction,x,y){
  const d=UNITS[type]; const hpMul = faction==='swarm' ? G.diff.hp : 1;
  const u=({ id:NEXT_ID++, kind:'unit', type, def:d, faction, x, y, hp:d.hp*hpMul, maxHp:d.hp*hpMul, r:d.radius||9,
    order:null, path:null, pi:0, target:null, cd:Math.random()*0.4, acq:Math.random()*0.3, face:Math.random()<.5?1:-1, anim:Math.random()*10, flash:0, moving:false, role:null, home:null });
  if(faction==='corps' && isSoldierType(type)) u.vet={ id:'v'+Date.now().toString(36)+NEXT_ID, name:freshName(), type, rank:0, xp:0, kills:0, missions:0, healed:0, repaired:0 };
  G.ents.push(u); return u;
}
/* ---------- veterans ---------- */
function isSoldierType(type){ return (BUILDINGS.hq.trains||[]).includes(type); }
/* Every soldier name is unique: across the roster, the fallen and everyone fielded in this mission.
   When the surname list runs out, an initial is added ("J. Torres"). */
const NAME_INITIALS='ABCDEFGHJKLMNPRSTVW';
function validName(n){ const m=/^[A-Z]\. (.+)$/.exec(n); return SURNAMES.includes(m?m[1]:n); }
function uniqueName(taken){
  const free=SURNAMES.filter(n=>!taken.has(n)); if(free.length) return pick(free);
  for(const L of NAME_INITIALS){ const f=SURNAMES.filter(n=>!taken.has(`${L}. ${n}`)); if(f.length) return `${L}. ${pick(f)}`; }
  for(let i=2;;i++){ const n=`${pick(SURNAMES)} ${i}`; if(!taken.has(n)) return n; } }
function loadRoster(){ const r=store.get('hc-roster',{}); r.active=r.active||[]; r.fallen=r.fallen||[];
  // names no longer in SURNAMES, and doubles, get a fresh unique name
  const all=[...r.active,...r.fallen], taken=new Set();
  all.sort((a,b)=>(b.hero||b.risen?1:0)-(a.hero||a.risen?1:0));
  for(const v of all){ if((v.hero||v.risen)&&!taken.has(v.name)){ taken.add(v.name); continue; } if(!validName(v.name)||taken.has(v.name)){ const busy=new Set(all.map(x=>x.name)); taken.forEach(n=>busy.add(n)); v.name=uniqueName(busy); } taken.add(v.name); }
  return r; }
function saveRoster(){ store.set('hc-roster',ui.roster); }
function takenNames(){ const t=new Set(G.usedNames||[]); for(const e of G.ents) if(e.vet) t.add(e.vet.name);
  for(const v of ui.roster.active) t.add(v.name); for(const v of ui.roster.fallen) t.add(v.name); return t; }
function freshName(){ const t=takenNames(), n=STARTER_NAMES.find(x=>!t.has(x))||uniqueName(t); (G.usedNames=G.usedNames||new Set()).add(n); return n; }
function rankFor(xp,hero){ let r=0; RANKS.forEach((k,i)=>{ if(xp>=k.xp&&(!k.heroOnly||hero)) r=i; }); return r; }
/* the next rank this soldier can reach (Captain is for your own soldier only) */
function nextRank(v){ const k=RANKS[v.rank+1]; return k&&(!k.heroOnly||v.hero)?k:null; }
function hasPerk(u){ return !!(u&&u.vet&&RANKS[u.vet.rank].perk); }
function applyRank(u){ const k=RANKS[u.vet.rank], f=u.hp/u.maxHp, z=u.vet.risen;
  u.maxHp=u.def.hp*k.hp*(z?RISEN.hp:1); u.hp=u.maxHp*f; u.dmgMul=k.dmg; u.rateMul=k.rate; u.speedMul=z?RISEN.speed:1;
  u.rangeBonus=(hasPerk(u)&&PERKS[u.type]&&PERKS[u.type].range)||0; u.leader=!!k.aura; }
function gainXP(u,amount){
  if(!u||u.dead||!u.vet||amount<=0) return; u.vet.xp+=amount;
  const r=rankFor(u.vet.xp,u.vet.hero); if(r>u.vet.rank){ u.vet.rank=r; applyRank(u); u.hp=Math.min(u.maxHp,u.hp+u.maxHp*0.25);
    SFX.play('complete'); G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'PROMOTED',col:'#ffb347'});
    say('Field promotion',`${RANKS[r-1].abbr} ${u.vet.name} is now ${RANKS[r].name}.${RANKS[r].perk&&!RANKS[r-1].perk&&PERKS[u.type]?` New ability: ${PERKS[u.type].name}.`:''}${RANKS[r].aura?' The squad rallies around him.':''}`,'sys'); (G.promoted=G.promoted||{})[u.vet.id]={ name:u.vet.name, rank:r }; /* highest rank per soldier */ G.selDirty=true; } }
function isCampaign(){ return G.mission.id!=='skirmish'; }
/* At mission start: veterans from the roster replace starting soldiers of the same type (most experienced first).
   The rest wait in reserve and arrive first whenever you train or order that type. */
function deployRoster(){
  G.reserve=[]; G.deployedIds=new Set(); if(!isCampaign()) return;
  const pool=[...ui.roster.active].sort((a,b)=>b.xp-a.xp);
  // your own soldier always goes in: he takes the place of a starting soldier of his type, or joins the squad as an extra
  const hi=pool.findIndex(v=>v.hero);
  if(hi>=0){ const h=pool.splice(hi,1)[0]; let u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.vet&&e.type===h.type&&!G.deployedIds.has(e.vet.id));
    if(!u){ const first=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.vet); const p=first?{x:Math.floor(first.x/TILE),y:Math.floor(first.y/TILE)}:pt(G.mission.start.camera||'P'); u=(spawnAt(h.type,'corps',p,1)||[])[0]; if(u) u.home={x:u.x,y:u.y}; }
    if(u){ u.vet={...h}; applyRank(u); u.hp=u.maxHp; G.deployedIds.add(h.id); } }
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||!u.vet||G.deployedIds.has(u.vet.id)) continue;   /* never overwrite your own soldier */ const i=pool.findIndex(v=>v.type===u.type); if(i<0) continue;
    u.vet={...pool[i]}; pool.splice(i,1); applyRank(u); u.hp=u.maxHp; G.deployedIds.add(u.vet.id); }
  G.reserve=pool;
}
function fromReserve(u){
  if(!u||!u.vet||!G.reserve) return; const i=G.reserve.findIndex(v=>v.type===u.type); if(i<0) return;
  u.vet={...G.reserve[i]}; G.reserve.splice(i,1); applyRank(u); u.hp=u.maxHp; G.deployedIds.add(u.vet.id);
  say('Roster',`${RANKS[u.vet.rank].abbr} ${u.vet.name} rejoins the fight.`,'sys');
}
/* After a won campaign mission: survivors with experience go into the roster, fallen veterans into the memorial. */
function settleRoster(){
  if(!isCampaign()) return; const R=ui.roster, alive=new Map();
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||!u.vet) continue; alive.set(u.vet.id,u); }
  const res={ joined:[], fallen:[] };
  const P=G.promoted||{};
  const FV=G.fallenVets||{}, ids=new Set(R.active.map(v=>v.id));
  for(const v of R.active){ if(G.deployedIds.has(v.id) && !alive.has(v.id)){ const f=FV[v.id]||v, rank=Math.max(v.rank,f.rank||0,P[v.id]?P[v.id].rank:0);
    const rec={ name:v.name, type:v.type, rank, xp:f.xp||v.xp, kills:f.kills||v.kills||0, missions:v.missions||0, mission:G.mission.title, at:Date.now(), hero:v.hero||undefined, risen:v.risen||undefined };
    R.fallen.unshift(rec); res.fallen.push(rec); } }
  // soldiers who earned a rank in this mission and fell are remembered too
  for(const [id,f] of Object.entries(FV)){ if(ids.has(id)||!(f.rank>=1)) continue;
    const rec={ name:f.name, type:f.type, rank:f.rank, xp:f.xp, kills:f.kills||0, missions:f.missions||0, mission:G.mission.title, at:Date.now() };
    R.fallen.unshift(rec); res.fallen.push(rec); }
  // promotions of soldiers who made it out, highest rank only
  res.promoted=Object.entries(P).filter(([id])=>alive.has(id)).map(([,p])=>p);
  R.active=R.active.filter(v=>!(G.deployedIds.has(v.id)&&!alive.has(v.id)));
  for(const u of alive.values()){ const v={ id:u.vet.id, name:u.vet.name, type:u.type, rank:u.vet.rank, xp:u.vet.xp, kills:u.vet.kills, missions:(u.vet.missions||0)+1, healed:u.vet.healed||0, repaired:u.vet.repaired||0, hero:u.vet.hero||undefined, risen:u.vet.risen||undefined };
    const i=R.active.findIndex(x=>x.id===v.id); if(i>=0) R.active[i]=v; else if(v.xp>0||v.hero){ R.active.push(v); res.joined.push(v); } }
  R.active.sort((a,b)=>(b.hero?1:0)-(a.hero?1:0)||b.xp-a.xp); if(R.active.length>ROSTER_MAX) R.active.length=ROSTER_MAX;   /* your own soldier always stays */ R.fallen=R.fallen.slice(0,60);
  saveRoster(); G.rosterResult=res;
}
function makeBuilding(type,faction,tx,ty,built){
  const d=BUILDINGS[type], s=d.size;
  const b={ id:NEXT_ID++, kind:'building', type, def:d, faction, tx, ty, size:s, x:(tx+s/2)*TILE, y:(ty+s/2)*TILE, r:s*TILE*0.42,
    hp:built?d.hp:d.hp*0.1, maxHp:d.hp, built, progress:built?1:0, queue:[], prodT:0, rally:null, cd:0, angle:0, flash:0, target:null, acq:0 };
  G.ents.push(b); if(!d.noBlock) setBlock(b,2);
  if(built && faction==='corps') G.stats.built++;
  return b;
}
function setBlock(b,v){ for(let y=b.ty;y<b.ty+b.size;y++) for(let x=b.tx;x<b.tx+b.size;x++){ const i=y*G.map.w+x; G.block[i]= v ? 2 : (G.map.walk[i]?0:1); } }
function alive(e){ return e && !e.dead; }
function spiral(r){ const out=[]; for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++) out.push({x,y,d:x*x+y*y+Math.random()*0.5}); return out.sort((a,b)=>a.d-b.d); }
const SPIRAL=spiral(9);
function freeTilesNear(tx,ty,n){
  const out=[]; for(const o of SPIRAL){ const x=tx+o.x, y=ty+o.y; if(walkableT(x,y)){ out.push({x,y}); if(out.length>=n) break; } } return out; }
function spawnAt(type,faction,at,n=1){
  const p=pt(at); if(!p) return []; const spots=freeTilesNear(p.x,p.y,n);
  return spots.map(s=>makeUnit(type,faction,(s.x+.5)*TILE+rand(-5,5),(s.y+.5)*TILE+rand(-5,5)));
}
function spawnNearBuilding(type,faction,b,toward){
  const cands=[]; const s=b.size;
  for(let y=b.ty-1;y<=b.ty+s;y++) for(let x=b.tx-1;x<=b.tx+s;x++){ const inside=x>=b.tx&&x<b.tx+s&&y>=b.ty&&y<b.ty+s; if(inside!==!!b.def.ground) continue; if(walkableT(x,y)) cands.push({x,y}); }
  let spot;
  if(!cands.length){ const f=freeTilesNear(b.tx,b.ty,1)[0]; if(!f) return null; spot=f; }
  else if(toward){ cands.sort((a,c)=>Math.hypot((a.x+.5)*TILE-toward.x,(a.y+.5)*TILE-toward.y)-Math.hypot((c.x+.5)*TILE-toward.x,(c.y+.5)*TILE-toward.y)); spot=cands[0]; }
  else spot=pick(cands);
  return makeUnit(type,faction,(spot.x+.5)*TILE+rand(-4,4),(spot.y+.5)*TILE+rand(-4,4));
}

/* ---- your own soldier: a named recruit you create on the campaign screen ---- */
const HERO_TYPES=['trooper','gunner','pyro','medic','engineer'];
function heroOf(){ return ui.roster.active.find(v=>v.hero)||null; }
function setHero(name,type){
  name=String(name||'').replace(/[<>&"]/g,'').replace(/\s+/g,' ').trim().slice(0,18);
  if(name.length<2) return 'Give your soldier a name of at least 2 letters.';
  if(!HERO_TYPES.includes(type)) return 'Pick a type.';
  const others=new Set([...ui.roster.active.filter(v=>!v.hero).map(v=>v.name),...ui.roster.fallen.map(v=>v.name)]);
  if(others.has(name)) return 'That name is already taken by another soldier (or on the Cenotaph).';
  const h=heroOf();
  if(h){ if(h.type!==type && (h.missions||0)>0) return 'Your soldier has seen action: his type can no longer change.'; h.name=name; h.type=type; }
  else ui.roster.active.unshift({ id:'hero-'+Date.now().toString(36), name, type, rank:0, xp:0, kills:0, missions:0, hero:true });
  saveRoster(); return null;
}

/* ---- zombie mode: raise a fallen soldier from the Cenotaph ---- */
function setZombie(on){ ui.zombie=!!on; store.set('hc-zombie',ui.zombie); }
function canRaise(rec){ return ui.zombie && !rec.risen && !!UNITS[rec.type]; }
function raiseFallen(i){
  const R=ui.roster, rec=R.fallen[i]; if(!rec||!canRaise(rec)) return 'This soldier rests for good.';
  if(R.active.length>=ROSTER_MAX) return 'The roster is full.';
  const hero=!!rec.hero && !heroOf();
  const v={ id:'risen-'+Date.now().toString(36), name:rec.name, type:rec.type, rank:rec.rank||0, xp:rec.xp||0, kills:rec.kills||0, missions:rec.missions||0, healed:0, repaired:0, risen:true, hero:hero||undefined };
  if(v.rank>=RANKS.length || (RANKS[v.rank].heroOnly&&!hero)) v.rank=rankFor(v.xp,hero);
  R.fallen.splice(i,1); if(hero) R.active.unshift(v); else R.active.push(v); saveRoster(); return null;
}
