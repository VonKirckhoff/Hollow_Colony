'use strict';
/* ---------- 2w. playing as the Swarm ----------
   You are the Brood, not a general: you do not steer single units. You decide what hatches, where the brood gathers,
   where it strikes and how. The units fight on their own.
     Brood (Q W E R)  put an egg of a Crawler, Drone, Spitter or Brute in the batch of your nest (the selected hive, else the hive nearest
                      the gathering point); Shift = batch.shift eggs at once. The biomass is taken at once. After batch.quiet seconds without
                      a new egg (or with Space) the batch grows (batch.grow + batch.per seconds per egg) and they all hatch together.
                      Click an egg in the command card to take it back (biomass back).
     Hatch into (T)   the team new brood joins: none, or one of your teams (Ctrl+1 …); it hatches at that team's gathering point.
     Gather (G, or right-click)   the gathering point: new brood waits there. With one team selected, G sets that team's own point,
                      and moving a whole team with right-click moves its point too.
     Attack (A + click)  your selection, or everything waiting (every team from its own point: they come from several sides) goes for that spot.
                      Shift+A: together: the ones closer wait, so all arrive at the same time.
     Burrow (B + click) a small brood digs up out of the ground, somewhere the Lunar Corps is not standing
   Biomass comes from your hives, from every soldier the brood kills and from bodies carried home.
   The Lunar Corps is the computer: its squads hold their ground, answer when their buildings are hit,
   and the mission script moves them, brings reinforcements and trains new soldiers.
   If the gathering point cannot be reached from the nest (a sealed door, a cliff), new brood tunnels through the rock and comes up
   near the gathering point after SWARM_PLAY.tunnel seconds.
   SWARM_PLAY: cap = most brood you can have hatched at once (hive guards do not count) · kill = biomass per soldier killed
   SWARM_DIFF: per difficulty, how tough the Lunar Corps is (health, damage) and how many reinforcements the scripts send. */
const SWARM_PLAY = { cap:58, kill:12, tunnel:4, burrow:{ cost:45, cooldown:25, clear:6, units:['drone','drone','crawler','crawler','crawler'] }, batch:{ quiet:3, grow:2, per:0.3, shift:5 },
  seed:{ root:18, clear:8, gap:12, max:3 }, oldEgg:{ wake:20, reach:3, clear:4 },
  brood:['crawler','drone','spitter','brute'], keys:{ crawler:'Q', drone:'W', spitter:'E', brute:'R', seedling:'Z' } };
/* seed: a Seedling (Z, only where the mission allows swarm.seedling) takes root with F in `root` seconds into a young nest:
     at least `clear` tiles from the Lunar Corps, `gap` tiles from any other hive, at most `max` new nests per mission.
   oldEgg: an old egg on the map (mission.oldEggs) wakes into a young nest once the brood has stood by it (within `reach` tiles,
     no soldier within `clear` tiles) for `wake` seconds in all. */
const SWARM_DIFF = {
  easy:   { hp:0.85, dmg:0.85, reinforce:0.75 },
  normal: { hp:1,    dmg:1,    reinforce:1 },
  hard:   { hp:1.25, dmg:1.15, reinforce:1.35 }
};
function swarmSide(){ return !!G && G.side==='swarm'; }
function myBrood(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.role==='brood'); }
function broodUsed(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.mine).length+broodPending(); }   /* eggs in a batch count already */
function broodPending(){ let n=0; for(const h of G.ents) if(!h.dead&&h.batch) n+=h.batch.items.length; return n; }
function broodCap(){ return (G.swarm.cfg.cap||SWARM_PLAY.cap)+(G.swarm.capExtra||0); }   /* capExtra: room a mission script adds (the training's burrow step) */
function broodUnlocked(type){ const at=(G.swarm.cfg.unlock||{})[type] ?? UNITS[type].unlock ?? 0; return G.time>=at; }
function nestHive(){ const s=G.sel.find(e=>!e.dead&&e.type==='hive'); if(s) return s; const r=G.swarm.rally; const hs=hives(); if(!hs.length) return null; return r?hs.reduce((a,b)=>dist(a,r)<=dist(b,r)?a:b):hs[0]; }
/* waiting brood stays near the gathering point and fights whatever comes close */
function broodThink(u){ if(u.rootT!=null) return;   /* a Seedling taking root stays put */ const r=u.post||G.swarm.rally||u.guardAt; if(!r) return; if(u.order&&u.order.type==='move') return;   /* walking to where you sent it */
  if(!u.target&&(!u.order||Math.hypot(u.order.x-r.x,u.order.y-r.y)>TILE)){ u.order={type:'guard',x:r.x,y:r.y,wait:rand(0,2)}; setPath(u,r.x,r.y); } }
/* Q W E R: an egg in the nest's batch (Shift: several). The batch hatches all at once (see SWARM_PLAY.batch). */
function swarmBreed(type,n){ const d=UNITS[type], nest=nestHive(); n=n||1;
  if(!nest){ toast('No hive left to hatch from.'); return 0; }
  if(!broodUnlocked(type)){ toast(`The brood cannot grow a ${d.name} yet.`); return 0; }
  let put=0;
  for(let k=0;k<n;k++){
    if(G.swarm.biomass<d.biomass){ if(!put) toast(`Not enough biomass: a ${d.name} costs ${d.biomass}.`); break; }
    if(broodUsed()>=broodCap()){ if(!put) toast(`The brood is at its limit (${broodCap()}). Spend it first.`); break; }
    const B=nest.batch||(nest.batch={ items:[], quiet:0, grow:null, team:G.swarm.hatchTeam||null });
    G.swarm.biomass-=d.biomass; B.items.push(type); B.quiet=0; if(B.grow!=null) B.grow+=SWARM_PLAY.batch.per; put++; }
  if(put){ SFX.play('squelch',nest.x,nest.y); G.selDirty=true; }
  return put; }
/* take one egg of this type back out of a batch (its biomass comes back) */
function batchTakeBack(nest,type){ const B=nest&&nest.batch; if(!B) return; const k=B.items.lastIndexOf(type); if(k<0) return;
  B.items.splice(k,1); G.swarm.biomass+=UNITS[type].biomass; if(!B.items.length) nest.batch=null; G.selDirty=true; }
/* the batch stops taking eggs and starts to grow */
function batchRelease(nest){ const B=nest&&nest.batch; if(!B||B.grow!=null||!B.items.length) return; const P=SWARM_PLAY.batch; B.grow=B.growMax=P.grow+P.per*B.items.length; SFX.play('heartbeat',nest.x,nest.y); G.selDirty=true; }
function batchReleaseAll(){ let any=false; for(const h of hives()) if(h.batch&&h.batch.grow==null){ batchRelease(h); any=true; } return any; }
function batchesTick(dt){ newNestTick(dt); for(const h of G.ents){ const B=h.batch; if(!B||h.dead) continue; const c0=Math.ceil(B.grow!=null?B.grow:SWARM_PLAY.batch.quiet-B.quiet);
    if(B.grow==null){ B.quiet+=dt; if(B.quiet>=SWARM_PLAY.batch.quiet) batchRelease(h); else if(Math.ceil(SWARM_PLAY.batch.quiet-B.quiet)!==c0) G.selDirty=true; continue; }
    B.grow-=dt; if(B.grow<=0){ h.batch=null; batchHatch(h,B); continue; }
    if(Math.ceil(B.grow)!==c0) G.selDirty=true; } }   /* the countdown on the card */
/* every egg of a batch hatches at once; the new brood joins the batch's team and waits at that team's gathering point */
function batchHatch(nest,B){ const team=B.team&&teamAlive(B.team)!==false?B.team:null, r=(team&&G.swarm.teamRally[team])||G.swarm.rally, out=[];
  for(const type of B.items){ const u=spawnNearBuilding(type,'swarm',nest,r); if(!u){ G.swarm.biomass+=UNITS[type].biomass; continue; }
    u.role='brood'; u.mine=true; u.guardAt={x:u.x,y:u.y}; if(team){ u.post=r?{x:r.x,y:r.y}:null; ((G.groups=G.groups||{})[team]=G.groups[team]||[]).push(u); }
    if(r&&dist(u,r)>4*TILE&&!canReach(u,r)) tunnelTo(u,r);   /* the way is shut: it digs */
    G.fx.push({k:'boom',x:u.x,y:u.y,t:0.3,max:0.3,r:16,col:'#a6ff4a'}); out.push(u); }
  if(!out.length){ toast('The nest is surrounded.'); return; }
  SFX.play('hatch',nest.x,nest.y); G.selDirty=true;
  if(!G.sel.length||(G.sel.length===1&&G.sel[0]===nest)) selectEntities(out,false);   /* you were looking at the nest: the new brood is selected */
  if(team) toast(`${out.length} hatched into team ${team}.`,true); return out; }
/* ---------- teams: your control groups (Ctrl+1 …) with a gathering point each ---------- */
function teamOfUnit(u){ const g=G.groups||{}; for(const n of Object.keys(g)) if(g[n].includes(u)&&G.swarm.teamRally[n]) return n; return null; }
function teamAlive(n){ return ((G.groups||{})[n]||[]).some(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'); }
function swarmTeams(){ const g=G.groups||{}; return Object.keys(g).filter(n=>teamAlive(n)||G.swarm.teamRally[n]).sort(); }
/* the one team these units are (all in one group, and at least half of it) */
function teamOf(us){ const g=G.groups||{}; for(const n of Object.keys(g)){ const m=g[n].filter(u=>!u.dead); if(m.length&&us.length&&us.every(u=>m.includes(u))&&us.length>=Math.ceil(m.length/2)) return n; } return null; }
function setTeamRally(n,x,y){ const f=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(!f) return; x=(f.x+.5)*TILE; y=(f.y+.5)*TILE;
  G.swarm.teamRally[n]={x,y}; for(const u of (G.groups[n]||[])) if(!u.dead&&u.role==='brood'){ u.post={x,y}; u.order=null; u.target=null; }
  G.pings.push({x,y,t:0,col:'#a6ff4a'}); SFX.play('squelch'); G.selDirty=true; }
function cycleHatchTeam(){ const ts=swarmTeams(), cur=G.swarm.hatchTeam; const all=[null,...ts], k=all.indexOf(cur); G.swarm.hatchTeam=all[(k+1)%all.length];
  toast(G.swarm.hatchTeam?`New brood hatches into team ${G.swarm.hatchTeam}.`:'New brood joins no team.',true); G.selDirty=true; }
/* can a unit walk from a to b? (findPath falls back to the closest point it can reach, so look where the path ends) */
function canReach(a,b){ const p=findPath(a.x,a.y,b.x,b.y,true); if(!p||!p.length) return false; const l=p[p.length-1]; return Math.hypot(l.x-b.x,l.y-b.y)<2*TILE; }
/* a fresh hatchling that cannot walk to the gathering point burrows into the rock and comes up near it a little later */
function tunnelTo(u,r){ u.tunnel={x:r.x,y:r.y,t:SWARM_PLAY.tunnel}; u.hidden=true; u.invuln=true; addDecal(u.x,u.y,10,'rgba(30,26,22,.6)'); }
function updateTunnels(dt){ for(const u of G.ents){ if(u.dead||!u.tunnel) continue; u.tunnel.t-=dt; u.order={type:'hold'}; if(u.tunnel.t>0) continue;
    const f=freeTilesNear(Math.floor(u.tunnel.x/TILE)+Math.round(rand(-2,2)),Math.floor(u.tunnel.y/TILE)+Math.round(rand(-2,2)),1)[0]; if(f){ u.x=(f.x+.5)*TILE; u.y=(f.y+.5)*TILE; }
    u.tunnel=null; u.hidden=false; u.invuln=false; u.order=null; u.path=null; for(let j=0;j<6;j++) G.fx.push({k:'ember',x:u.x+rand(-10,10),y:u.y+rand(-4,6),vx:rand(-50,50),vy:rand(-80,-20),t:0.7,max:0.7,col:'#8a7a6a'}); addDecal(u.x,u.y,12,'rgba(30,26,22,.6)'); } }
/* the swarm units you selected yourself (box-drag or click): you can steer them as a squad */
function selSwarm(){ return G.sel.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss&&(!e.def.grafter||e.avatar)); }
function freeFromJobs(u){ if(u.haul) dropBody(u.haul); if(u.def.seed&&u.rootT!=null){ u.rootT=null; u.site=null; } u.claim=null; u.claimMode=null; u.waveDelay=0; u.viaGoal=null; }
/* right-click: with swarm units selected they go there (or attack what you clicked) and wait there; otherwise it sets the gathering point */
function swarmRight(x,y){ let us=selSwarm(); if(!us.length&&avatarAlive()&&G.avatar.kind==='unit') us=[G.avatar];   /* your own creature listens even when nothing is selected */
  if(!us.length){ setRally(x,y); return; }
  const t=entityAt(x,y,e=>e.faction==='corps'&&e.kind!=='crate'||e.faction==='wild');
  /* the creature you steer simply goes where you click, or attacks what you click */
  for(const u of us.filter(u=>u.avatar)){ if(u.rootT!=null||u.latched) continue; if(t&&!u.def.grafter){ u.target=t; u.order={type:'attack',target:t}; u.path=null; } else { u.target=null; u.order={type:'move',x,y}; setPath(u,x,y); } }
  if(us.some(u=>u.avatar)){ G.following=true; G.pings.push({x,y,t:0,col:'#c38bff'}); SFX.play('squelch'); } us=us.filter(u=>!u.avatar); if(!us.length) return;
  if(t){ for(const u of us){ freeFromJobs(u); u.role='wave'; u.post=null; u.target=t; u.order={type:'attack',target:t}; u.path=null; } SFX.play('attack'); G.pings.push({x:t.x,y:t.y,t:0,col:'#ff5a4f'}); G.selDirty=true; startFollow(); return; }
  const tm=teamOf(us); if(tm) G.swarm.teamRally[tm]={x,y};   /* a whole team moved: its gathering point moves along */
  for(const u of us){ freeFromJobs(u); u.role='brood'; u.mine=true; u.target=null; u.post={x,y}; }
  moveGroup(us,x,y,'move'); SFX.play('squelch'); G.pings.push({x,y,t:0,col:'#c38bff'}); G.selDirty=true; startFollow(); }   /* the camera follows the squad you steer */
/* H: your selection goes out to fetch the bodies lying in the field; with nothing selected, the waiting brood,
   and if none is waiting, your brood out in the field (first the ones without a fight, then the ones still fighting) */
function idleBrood(){ return G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&!e.avatar&&!e.def.boss&&!e.def.grafter&&(e.role==='brood'||(e.role==='wave'&&e.mine))&&!e.target&&!e.claim&&!e.haul); }
function fieldBrood(){ return G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&e.mine&&!e.avatar&&e.role==='wave'&&!e.claim&&!e.haul); }
function swarmHarvest(){ const us=(selSwarm().length?selSwarm():myBrood().filter(u=>!u.claim).length?myBrood():idleBrood().length?idleBrood():fieldBrood()).filter(u=>!u.haul);   /* last resort: your brood still fighting out there */ const bodies=G.ents.filter(b=>!b.dead&&b.kind==='body'&&!b.home&&!b.carrier);
  if(!bodies.length){ toast('No fallen to bring home right now.',true); return; } if(!us.length){ toast('Nobody is free to fetch them.'); return; }
  let n=0; for(const b of bodies){ const pool=us.filter(u=>!u.claim); if(!pool.length) break;
    const c=pool.reduce((a,u)=>dist(u,b)<dist(a,b)?u:a); freeFromJobs(c); b.ordered=true; c.claim=b; c.claimMode='haul'; c.target=null; c.order=null; n++;
    const g=us.filter(u=>!u.claim); if(g.length){ const e=g.reduce((a,u)=>dist(u,b)<dist(a,b)?u:a); e.claim=b; e.claimMode='guard'; e.target=null; e.order=null; } }
  G.selDirty=true; say('The Brood',`We go to bring ${n} of the fallen home.`,'swarm'); }
function setRallyOrTeam(x,y){ const tm=teamOf(selSwarm()); if(tm) setTeamRally(tm,x,y); else setRally(x,y); }
function setRally(x,y){ const f=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(!f) return; x=(f.x+.5)*TILE; y=(f.y+.5)*TILE;
  G.swarm.rally={x,y}; for(const u of myBrood()){ if(u.post&&teamOfUnit(u)) continue; u.order=null; u.target=null; u.post=null; }   /* teams keep their own point */ G.pings.push({x,y,t:0,col:'#c38bff'}); SFX.play('squelch'); G.selDirty=true; }
function sendWave(x,y,sync){ sync=sync??ui.amoveSync; ui.amove=false; ui.amoveSync=false; cv.classList.remove('amove'); G.selDirty=true;
  const sel=selSwarm(), us=sel.length?sel:myBrood(); if(!us.length){ toast('No brood is waiting at the gathering point. Hatch some first.'); return; }
  for(const u of us){ freeFromJobs(u); u.post=null; }
  const t=entityAt(x,y,e=>e.faction==='corps'&&e.kind!=='crate');
  for(const u of us){ u.role='wave'; u.target=t||null; u.order={type:'amove',x:x+rand(-24,24),y:y+rand(-24,24)}; setPath(u,u.order.x,u.order.y); }
  if(sync){   /* together: who is closer waits, so they all get there at the same time */
    const eta=u=>{ let L=0, px=u.x, py=u.y; for(const p of (u.path||[])){ L+=Math.hypot(p.x-px,p.y-py); px=p.x; py=p.y; } return L/Math.max(20,u.def.speed||60); }, T=us.map(eta), mx=Math.max(...T);
    us.forEach((u,i)=>{ const w=mx-T[i]; if(w>0.5){ u.waveDelay=w; u.waveGoal={x:u.order.x,y:u.order.y}; u.order=null; u.path=null; u.target=null; } }); }
  if(sel.length) startFollow();   /* no tactics for the player: you flank or lure with your own groups */
  G.pings.push({x,y,t:0,col:'#ff5a4f'}); SFX.play('horn');
  if(sync) G.swarm.syncN=(G.swarm.syncN||0)+1;
  say('The Brood',sync?`${us.length} go to feed, all at once.`:`${us.length} go${us.length===1?'es':''} to feed.`,'swarm'); }
function burrowReady(){ return G.time-G.swarm.burrowAt>=SWARM_PLAY.burrow.cooldown; }
function burrowAt(x,y){ const B=SWARM_PLAY.burrow; ui.burrow=false; cv.classList.remove('amove'); G.selDirty=true;
  if(!burrowReady()){ toast(`The ground is still settling: ${Math.ceil(B.cooldown-(G.time-G.swarm.burrowAt))} s.`); return; }
  if(G.swarm.biomass<B.cost){ toast(`Burrowing costs ${B.cost} biomass.`); return; }
  if(broodUsed()+B.units.length>broodCap()){ toast(`The brood is at its limit (${broodCap()}).`); return; }
  const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE); if(!walkableT(tx,ty)||G.map.height[ty*G.map.w+tx]!==0){ toast('The brood can only dig up through open ground.'); return; }
  if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&Math.hypot(e.x-x,e.y-y)<B.clear*TILE)){ toast(`Too close to them: dig up at least ${B.clear} tiles away.`); return; }
  G.swarm.biomass-=B.cost; G.swarm.burrowAt=G.time;
  const tiles=freeTilesNear(tx,ty,B.units.length);
  B.units.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'swarm',(s.x+.5)*TILE,(s.y+.5)*TILE); u.role='brood'; u.mine=true; u.guardAt={x,y};
    for(let j=0;j<6;j++) G.fx.push({k:'ember',x:u.x+rand(-10,10),y:u.y+rand(-4,6),vx:rand(-50,50),vy:rand(-80,-20),t:0.7,max:0.7,col:'#8a7a6a'}); });
  addDecal(x,y,22,'rgba(30,26,22,.6)'); SFX.play('land',x,y); G.swarm.rally={x,y}; G.pings.push({x,y,t:0,col:'#c38bff'}); }
/* the command card while playing the Swarm */
function swarmButtons(){ const out=avatarButtons(), S=G.swarm, used=broodUsed(), cap=broodCap();
  const P=SWARM_PLAY.batch, nest=nestHive();
  for(const t of SWARM_PLAY.brood.concat(S.cfg.seedling?['seedling']:[])){ const d=UNITS[t], un=broodUnlocked(t);
    out.push({row:'Brood',key:SWARM_PLAY.keys[t],img:iconUrl(t),cost:d.biomass,off:!un||S.biomass<d.biomass||used>=cap,
      tip:`${d.name}|${d.desc} Costs ${d.biomass} biomass. Puts an egg in the batch of the nest${nest?'':' (no hive left)'}; Shift: ${P.shift} at once. After ${P.quiet} s without a new egg (or Space) they all hatch together.${un?'':` Not yet: the brood can grow it after ${fmtTime((S.cfg.unlock||{})[t]??d.unlock??0)}.`}`,act:e=>swarmBreed(t,e&&e.shiftKey?P.shift:1)}); }
  /* the nest's batch: one icon per kind (click: take one back), and Hatch now */
  const NB=nest&&nest.batch; if(NB&&NB.items.length){ const B=NB, cnt={}; for(const t of B.items) cnt[t]=(cnt[t]||0)+1;
    for(const t of Object.keys(cnt)) out.push({row:'Batch',key:'',img:iconUrl(t),cost:'×'+cnt[t],off:B.grow!=null,tip:`${UNITS[t].name} egg|${B.grow!=null?'Growing: it hatches in a moment.':'Click to take one back (its biomass comes back).'}`,act:()=>{ if(B.grow==null) batchTakeBack(nest,t); }});
    out.push({row:'Batch',key:'Space',glyph:B.grow!=null?'◔':'◉',cost:B.grow!=null?`${Math.ceil(B.grow)}s`:`${Math.max(0,Math.ceil(P.quiet-B.quiet))}s`,active:B.grow!=null,tip:`Hatch now|${B.items.length} eggs${B.team?` for team ${B.team}`:''}. They hatch together ${B.grow!=null?'in a moment':`after ${P.quiet} s without a new egg, or now with Space`}.`,act:()=>batchRelease(nest)}); }
  const seeds=selSwarm().filter(u=>u.def.seed&&u.rootT==null); if(seeds.length){ const SD=SWARM_PLAY.seed; out.push({row:'Orders',key:'F',glyph:'✣',tip:`Take root|The Seedling digs in where it stands and becomes a young nest in ${SD.root} s: open ground, at least ${SD.clear} tiles from the Lunar Corps and ${SD.gap} from any other nest (${G.swarm.founded||0}/${G.swarm.cfg.seedMax??SD.max} new nests).`,act:seedRootSelected}); }
  const teams=swarmTeams(); if(teams.length||S.hatchTeam) out.push({row:'Orders',key:'T',glyph:S.hatchTeam?String(S.hatchTeam):'∅',active:!!S.hatchTeam,tip:`Hatch into|New brood ${S.hatchTeam?`joins team ${S.hatchTeam} and hatches at its gathering point`:'joins no team'}. Press to switch (teams: ${teams.join(', ')||'none'}). Make a team with Ctrl + a number.`,act:cycleHatchTeam});
  const sel=selSwarm().length, waiting=sel||myBrood().length;
  out.push({row:'Orders',key:'A',glyph:'⚔',cost:waiting||'',active:ui.amove,off:!waiting,tip:`Attack|Click a spot or an enemy: ${sel?`the ${sel} you selected go`:`all ${waiting} waiting go (every team from its own gathering point)`} for it. Shift+A: together, so they all arrive at the same time.`,act:e=>{ ui.amoveSync=!!(e&&e.shiftKey); ui.amove=!ui.amove; ui.burrow=false; ui.rallyPick=false; cv.classList.toggle('amove',ui.amove); }});
  out.push({row:'Orders',key:'G',glyph:'⚑',active:ui.rallyPick,tip:'Gather|Click where the brood gathers. Right-click anywhere does the same. With one team selected: that team\'s own gathering point. New brood hatches at the hive nearest to it, or at the hive you selected.',act:()=>{ ui.rallyPick=!ui.rallyPick; ui.amove=false; ui.burrow=false; cv.classList.toggle('amove',ui.rallyPick); }});
  const nb=G.ents.filter(b=>!b.dead&&b.kind==='body'&&!b.home&&!b.carrier).length;
  out.push({row:'Orders',key:'H',glyph:'⤓',cost:nb||'',off:!nb,tip:`Harvest|${sel?'The units you selected':'The waiting brood'} go out to carry the ${nb} fallen lying in the field home to a hive. One carries, one guards. On the creep a Grafter from a hive egg turns them.`,act:swarmHarvest});
  const B=SWARM_PLAY.burrow, cd=Math.ceil(B.cooldown-(G.time-S.burrowAt));
  out.push({row:'Orders',key:'B',glyph:'⇣',cost:cd>0?`${cd}s`:B.cost,active:ui.burrow,off:cd>0||S.biomass<B.cost,tip:`Burrow|${B.units.length} of the brood dig up out of the ground where you click, at least ${B.clear} tiles from the Lunar Corps. Costs ${B.cost} biomass, then the ground needs ${B.cooldown} seconds.`,act:()=>{ ui.burrow=!ui.burrow; ui.amove=false; ui.rallyPick=false; cv.classList.toggle('amove',ui.burrow); }});
  return out; }
/* the gathering point and the nest, drawn on the map */
function drawSwarmOrders(now){ const r=G.swarm.rally;
  if(r){ const p=0.5+0.5*Math.sin(now/300); ctx.strokeStyle=`rgba(195,139,255,${0.45+0.3*p})`; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.lineDashOffset=-now/60;
    ctx.beginPath(); ctx.ellipse(r.x,r.y+2,22,12,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#c38bff'; ctx.fillRect(r.x-1,r.y-18,2,18); ctx.fillStyle='#a6ff4a'; ctx.beginPath(); ctx.arc(r.x+1,r.y-19,4+p,0,Math.PI*2); ctx.fill(); }
  /* team gathering points: a small numbered flag each */
  for(const k of Object.keys(G.swarm.teamRally||{})){ const t=G.swarm.teamRally[k]; if(!t||!teamAlive(k)) continue; const p=0.5+0.5*Math.sin(now/300+(+k));
    ctx.strokeStyle=`rgba(166,255,74,${0.35+0.3*p})`; ctx.lineWidth=1.5; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.ellipse(t.x,t.y+2,16,9,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#a6ff4a'; ctx.fillRect(t.x-1,t.y-20,2,20); ctx.fillStyle='rgba(12,14,20,.9)'; ctx.fillRect(t.x+1,t.y-21,12,11); ctx.strokeStyle='#a6ff4a'; ctx.strokeRect(t.x+1.5,t.y-20.5,11,10);
    ctx.fillStyle='#a6ff4a'; ctx.font='9px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillText(k,t.x+7,t.y-12); }
  /* batches: the eggs round the nest, pulsing; growing ones glow brighter and faster */
  for(const h of G.ents){ const B=h.batch; if(!B||h.dead||!B.items.length) continue; const grow=B.grow!=null, k0=grow?1-B.grow/(B.growMax||1):0;
    B.items.forEach((t,i)=>{ const a=-Math.PI/2+i*(Math.PI*2/Math.max(6,B.items.length)), rr=h.r+10+(i>=12?9:0), x=h.x+Math.cos(a)*rr, y=h.y+Math.sin(a)*rr*0.6+6, p=0.5+0.5*Math.sin(now/(grow?90:260)+i);
      ctx.fillStyle=grow?`rgba(166,255,74,${0.25+0.35*p})`:`rgba(195,139,255,${0.15+0.2*p})`; ctx.beginPath(); ctx.ellipse(x,y,7+2*p,5+1.5*p,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#3a2348'; ctx.beginPath(); ctx.ellipse(x,y,4.5,3.5,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=grow?'#a6ff4a':'#c38bff'; ctx.beginPath(); ctx.ellipse(x,y-0.5,2+k0*1.5,1.5+k0,0,0,Math.PI*2); ctx.fill(); });
    if(B.team){ ctx.fillStyle='#a6ff4a'; ctx.font='9px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillText('→'+B.team,h.x,h.y+h.r*0.6+22); } }
  for(const u of G.ents){ if(u.dead||!u.def||!u.def.seed||u.rootT==null) continue; const k=1-u.rootT/u.rootMax; ctx.strokeStyle='#a6ff4a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(u.x,u.y-4,18,-Math.PI/2,-Math.PI/2+k*Math.PI*2); ctx.stroke(); }   /* a Seedling taking root */
  /* which team a creature is in: a small number over its head */
  const g=G.groups||{}; for(const k of Object.keys(g)){ for(const u of g[k]){ if(u.dead||u.hidden||u.kind!=='unit'||u.faction!=='swarm') continue;
    ctx.fillStyle='rgba(12,14,20,.75)'; ctx.fillRect(u.x-4,u.y-u.r-19,8,9); ctx.fillStyle='#a6ff4a'; ctx.font='8px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillText(k,u.x,u.y-u.r-12); } }
  const n=nestHive(); if(n){ ctx.strokeStyle='rgba(166,255,74,.45)'; ctx.lineWidth=2; ctx.setLineDash([2,5]); ctx.beginPath(); ctx.ellipse(n.x,n.y+n.r*0.35,n.r*1.25,n.r*0.8,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); } }
/* top bar and the empty selection panel */
function swarmHud(){ $('#r-salvage').textContent=Math.floor(G.swarm.biomass); const s=$('#r-supply'); s.textContent=`${broodUsed()}/${broodCap()}`; s.classList.toggle('warn',broodUsed()>=broodCap());
  $('#r-troops').textContent=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').length; }
function setupSideHud(){ const sw=swarmSide(), lbl=(id,t)=>{ const el=$(id); if(el){ const l=el.closest('.res').querySelector('.lbl'); if(l) l.textContent=t; } };
  lbl('#r-salvage',sw?'Biomass':'Salvage'); lbl('#r-supply',sw?'Brood':'Supply'); lbl('#r-troops',sw?'Swarm':'Troops');
  $('#r-troops-wrap').dataset.tip=sw?'The Swarm on the field|Your brood, the hive guards and everything that hatched on its own.':'Troops|';
  document.body.classList.toggle('as-swarm',sw); if(typeof trackerLabel==='function') trackerLabel(); }
const SWARM_HINT='You are the Brood. Drag to select swarm units and <kbd>Right-click</kbd> to move them; with nothing selected, right-click calls the brood together. <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> hatch (click a hive to hatch there), <kbd>A</kbd> + click attacks, <kbd>H</kbd> brings the fallen home.';
/* the Lunar Corps as the computer: a squad answers when one of its buildings or soldiers nearby is hit */
function corpsMove(us,x,y,mode){ for(const u of us){ u.home=null; u.stance=null; } moveGroup(us,x,y,mode); }
function updateCorpsAI(dt){ if(!swarmSide()) return; G.corpsT=(G.corpsT||0)-dt; if(G.corpsT>0) return; G.corpsT=0.5;
  const hit=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.hitAt!=null&&G.time-e.hitAt<3);
  if(!hit.length) return;
  for(const u of G.ents){ if(u.dead||u.downed||u.kind!=='unit'||u.faction!=='corps'||u.target||u.def.escort||!u.def.damage||u.drill) continue;   /* a drill squad (training) has its own brain */ if(u.order&&u.order.type!=='hold') continue;
    const h=hit.find(e=>e!==u&&dist(e,u)<14*TILE); if(!h) continue;
    const foe=h.hitBy&&!h.hitBy.dead&&h.hitBy.kind?h.hitBy:nearestOf(h,e=>e.faction==='swarm'&&e.kind==='unit'&&dist(e,h)<8*TILE);
    if(foe){ u.target=foe; if(!u.home) u.home={x:u.x,y:u.y}; } } }
/* mission helpers: the starting swarm units become your brood; a Lunar Corps fire team goes to burn the nearest hive */
function swarmBrood(){ for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.homeHive==null&&!u.def.boss){ u.role='brood'; u.mine=true; u.order=null; } }
function corpsRaid(g,n,who,text){ const q=ptWorld('Q')||{x:0,y:0}, h=hives().sort((a,b)=>dist(a,q)-dist(b,q))[0]; if(!h) return;
  const team=g.corps().filter(u=>!u.def.builder&&!u.def.heal).sort((a,b)=>dist(a,h)-dist(b,h)).slice(0,g.n(n)); const med=g.corps().find(u=>u.def.heal); if(med&&team.length>=3) team.push(med);
  if(!team.length) return; g.say(who,text); g.orderCorps(team,{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)},'amove');
  g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }

/* ---------- Hive Sense: the Swarm's own tracker (K, or the Sense button) ----------
   The brood feels the warm bodies of the Lunar Corps around your selection (or around the gathering point, with nothing selected).
   red = a soldier · orange = easy prey: a soldier alone or in a small knot (at most aloneMax soldiers and guns within alone tiles),
   or a drill soldier lured out of his ring (training) · yellow = a fallen soldier or carcass in the field, waiting for H.
   It beats like a heart, faster the closer the nearest soldier is.
   HIVE_SENSE: range = tiles it reaches · alone / aloneMax = what counts as easy prey · size = radius on screen (px). */
const HIVE_SENSE = { range:30, alone:6, aloneMax:2, size:64 };
function senseRef(){ const us=selSwarm(); if(us.length) return { x:us.reduce((s,u)=>s+u.x,0)/us.length, y:us.reduce((s,u)=>s+u.y,0)/us.length };
  if(G.swarm.rally) return G.swarm.rally; return { x:G.cam.x+ui.vw/2, y:G.cam.y+(ui.vh-ui.hudH)/2 }; }
/* a soldier who is easy prey: lured out of a drill ring, or alone / in a small knot */
function easyPrey(e){ if(e.drill&&e.drill.r&&Math.hypot(e.x-e.drill.x,e.y-e.drill.y)>e.drill.r) return true;
  if(e.drill) return false;   /* inside his ring he cannot fall */
  const R=HIVE_SENSE.alone*TILE; let n=0;
  for(const o of G.ents){ if(o.dead||o.faction!=='corps'||(o.kind==='unit'&&o.downed)) continue; if(!(o.kind==='unit'||(o.kind==='building'&&o.def&&o.def.damage))) continue; if(Math.hypot(o.x-e.x,o.y-e.y)<R&&++n>HIVE_SENSE.aloneMax) return false; }
  return true; }
function senseContacts(ref){ const R=HIVE_SENSE.range*TILE, out=[];
  for(const e of G.ents){ if(e.dead) continue; let kind=null;
    if(e.kind==='unit'&&e.faction==='corps'){ if(e.def.cloak&&!(e.revealT>0)) continue; kind=e.downed?'fallen':easyPrey(e)?'easy':'soldier'; }
    else if(e.kind==='body'&&!e.home&&!e.carrier) kind='fallen';
    if(!kind) continue; const d=Math.hypot(e.x-ref.x,e.y-ref.y); if(d<R) out.push({e,d,a:Math.atan2(e.y-ref.y,e.x-ref.x),kind}); }
  return out; }
function drawHiveSense(now){ const H=HIVE_SENSE, S=H.size, cx=ui.vw-S-22, cy=ui.vh-ui.hudH-S-22, ref=senseRef(), cs=senseContacts(ref), R=H.range*TILE;
  const live=cs.filter(c=>c.kind!=='fallen'), near=live.length?Math.min(...live.map(c=>c.d)):null, k=near==null?1:near/R, period=0.45+1.4*k;
  const beat=((now/1000)%period)/period, pulse=beat<0.12?beat/0.12:Math.max(0,1-(beat-0.12)/0.5);   /* lub: a quick swell, then it eases off */
  ctx.save();
  const g=ctx.createRadialGradient(cx,cy,4,cx,cy,S); g.addColorStop(0,`rgba(70,24,90,${0.75+0.15*pulse})`); g.addColorStop(1,'rgba(14,6,20,.9)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,S,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=`rgba(195,139,255,${0.35+0.35*pulse})`; ctx.lineWidth=1.5; for(const r of [S/3,S*2/3]){ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); }
  ctx.strokeStyle=`rgba(166,255,74,${0.5+0.4*pulse})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,S,0,Math.PI*2); ctx.stroke();
  if(beat<0.6){ ctx.strokeStyle=`rgba(166,255,74,${0.5*(1-beat/0.6)})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,S*beat/0.6,0,Math.PI*2); ctx.stroke(); }   /* the beat ripples outwards */
  const col={ soldier:'255,90,79', easy:'255,170,40', fallen:'255,226,90' };
  for(const c of cs){ const px=cx+Math.cos(c.a)*c.d/R*S, py=cy+Math.sin(c.a)*c.d/R*S, rgb=col[c.kind], big=c.kind==='easy'?1.5:1;
    ctx.fillStyle=`rgba(${rgb},${0.25+0.25*pulse})`; ctx.beginPath(); ctx.arc(px,py,(4+3*pulse)*big,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(${rgb},.95)`; ctx.beginPath(); ctx.arc(px,py,2*big,0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle='#a6ff4a'; ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fill();
  const easy=cs.filter(c=>c.kind==='easy').length, fallen=cs.filter(c=>c.kind==='fallen').length;
  const txt=near==null?(fallen?`${fallen} FALLEN`:'NOTHING WARM'):easy?`${easy} EASY · ${Math.round(near/TILE*2)} M`:`${Math.round(near/TILE*2)} M`;
  ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'; ctx.fillText(txt,cx+1,cy+S+15);
  ctx.fillStyle=easy?'#ffaa28':near!=null&&near<6*TILE?'#ff5a4f':'#c38bff'; ctx.fillText(txt,cx,cy+S+14);
  ctx.fillStyle='#000'; ctx.fillText('HIVE SENSE',cx+1,cy-S-5); ctx.fillStyle='#a6ff4a'; ctx.fillText('HIVE SENSE',cx,cy-S-6);
  ctx.restore();
  if(near!=null&&!G.paused&&now/1000>(G.senseBeat||0)){ G.senseBeat=now/1000+period; SFX.play('heartbeat'); } }

/* ---------- new nests: the Seedling and the old egg ---------- */
function seedRoot(u){ const S=SWARM_PLAY.seed, tx=Math.floor(u.x/TILE), ty=Math.floor(u.y/TILE);
  const SMAX=G.swarm.cfg.seedMax??S.max; if((G.swarm.founded||0)>=SMAX){ toast(`No more new nests in this mission (${SMAX}).`); return false; }
  for(let y=ty-1;y<=ty+1;y++) for(let x=tx-1;x<=tx+1;x++) if(!walkableT(x,y)||G.ents.some(e=>!e.dead&&e.kind==='building'&&x>=e.tx&&x<e.tx+e.size&&y>=e.ty&&y<e.ty+e.size)){ toast('It needs open ground to take root (3 × 3).'); return false; }
  if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&Math.hypot(e.x-u.x,e.y-u.y)<S.clear*TILE)){ toast(`Too close to them: at least ${S.clear} tiles from the Lunar Corps.`); return false; }
  if(hives().some(h=>Math.hypot(h.x-u.x,h.y-u.y)<S.gap*TILE)){ toast(`Too close to another nest: at least ${S.gap} tiles.`); return false; }
  u.site={x:tx,y:ty}; u.x=(tx+.5)*TILE; u.y=(ty+.5)*TILE; u.rootT=u.rootMax=S.root; u.order={type:'hold'}; u.path=null; u.target=null;
  SFX.play('squelch',u.x,u.y); say('The Brood','The seed digs in. Keep them away from it.','swarm'); G.selDirty=true; return true; }
function seedRootSelected(){ const ss=selSwarm().filter(u=>u.def.seed&&u.rootT==null); if(!ss.length) return; seedRoot(ss[0]); }
/* old eggs, from mission.oldEggs: [{x,y}] */
function spawnOldEggs(m){ if(!m||m.side!=='swarm') return;
  for(const p of (m.oldEggs||[])){ if(!walkableT(p.x,p.y)) continue; const x=(p.x+.5)*TILE, y=(p.y+.5)*TILE;
    G.ents.push({ id:NEXT_ID++, kind:'crate', oldEgg:true, x, y, r:11, faction:'none', value:0, wake:0, tx:p.x, ty:p.y });
    if(typeof addShowcase==='function') addShowcase(x,y,'ancientegg','Old Egg','#a6ff4a'); } }
function newNestTick(dt){ const O=SWARM_PLAY.oldEgg;
  for(const u of G.ents){ if(u.dead||!u.def||!u.def.seed||u.rootT==null) continue; u.rootT-=dt; if(u.rootT<=0){ u.rootT=null; rootHive(u); say('The Brood','The seed has become a nest. Our brood can hatch here now.','swarm'); } }
  for(const c of G.ents){ if(c.dead||!c.oldEgg) continue;
    const by=G.ents.some(u=>!u.dead&&!u.hidden&&u.kind==='unit'&&u.faction==='swarm'&&!u.def.grafter&&!u.def.seed&&dist(u,c)<O.reach*TILE),
      foe=G.ents.some(u=>!u.dead&&!u.downed&&u.kind==='unit'&&u.faction==='corps'&&dist(u,c)<O.clear*TILE);
    if(by&&!foe){ if(!c.wake) say('The Brood','The old egg stirs. Stay by it, keep the soft ones away.','swarm'); c.wake+=dt; } else c.wake=Math.max(0,c.wake-dt*0.5);
    if(c.wake>=O.wake){ c.dead=true; G.markers=G.markers.filter(m=>!(Math.hypot(m.x-c.x,m.y-c.y)<TILE)); rootHive({ site:{x:c.tx,y:c.ty}, x:c.x, y:c.y });
      G.swarm.eggsWoken=(G.swarm.eggsWoken||0)+1; say('The Brood','The old egg breaks open. A nest older than the station breathes again.','swarm'); } } }
function drawOldEgg(e,now){ const a=ARTC.ancientegg, s=2, p=0.5+0.5*Math.sin(now/400); if(!a) return;
  ctx.fillStyle=`rgba(166,255,74,${0.08+0.1*p+(e.wake?0.15:0)})`; ctx.beginPath(); ctx.ellipse(e.x,e.y+4,18,9,0,0,Math.PI*2); ctx.fill();
  ctx.drawImage(a,Math.round(e.x-a.width*s/2),Math.round(e.y-a.height*s+8),a.width*s,a.height*s);
  if(e.wake>0){ const k=e.wake/SWARM_PLAY.oldEgg.wake; ctx.strokeStyle='#a6ff4a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y-14,20,-Math.PI/2,-Math.PI/2+k*Math.PI*2); ctx.stroke(); } }
