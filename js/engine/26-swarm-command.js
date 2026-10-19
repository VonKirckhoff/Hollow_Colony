'use strict';
/* ---------- 2w. playing as the Swarm ----------
   You are the Brood, not a general: you do not steer single units. You decide what hatches, where the brood gathers,
   where it strikes and how. The units fight on their own.
     Brood (Q W E R)  hatch a Crawler, Drone, Spitter or Brute at your nest (the selected hive, else the hive nearest the gathering point)
     Gather (G, or right-click)   the gathering point: new brood waits there
     Attack (A + click)  everything waiting at the gathering point goes for that spot, with the chosen tactic
     Tactic (T)        Direct, Lure (a few fast ones first, the rest a little later) or Flank (half swings round the side)
     Burrow (B + click) a small brood digs up out of the ground, somewhere the Lunar Corps is not standing
   Biomass comes from your hives, from every soldier the brood kills and from bodies carried home.
   The Lunar Corps is the computer: its squads hold their ground, answer when their buildings are hit,
   and the mission script moves them, brings reinforcements and trains new soldiers.
   If the gathering point cannot be reached from the nest (a sealed door, a cliff), new brood tunnels through the rock and comes up
   near the gathering point after SWARM_PLAY.tunnel seconds.
   SWARM_PLAY: cap = most brood you can have hatched at once (hive guards do not count) · kill = biomass per soldier killed
   SWARM_DIFF: per difficulty, how tough the Lunar Corps is (health, damage) and how many reinforcements the scripts send. */
const SWARM_PLAY = { cap:40, kill:12, tunnel:4, burrow:{ cost:45, cooldown:25, clear:6, units:['drone','drone','crawler','crawler','crawler'] },
  brood:['crawler','drone','spitter','brute'], keys:{ crawler:'Q', drone:'W', spitter:'E', brute:'R' } };
const SWARM_DIFF = {
  easy:   { hp:0.85, dmg:0.85, reinforce:0.75 },
  normal: { hp:1,    dmg:1,    reinforce:1 },
  hard:   { hp:1.25, dmg:1.15, reinforce:1.35 }
};
const TACTIC_INFO = {
  direct:{ name:'Direct', glyph:'➜', tip:'Everyone goes straight in.' },
  lure:  { name:'Lure',   glyph:'◎', tip:'The fastest few go first as bait; the rest follow a few seconds later and hit them while they chase.' },
  flank: { name:'Flank',  glyph:'⤳', tip:'Half the brood swings out wide and comes in from the side.' }
};
function swarmSide(){ return !!G && G.side==='swarm'; }
function myBrood(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.role==='brood'); }
function broodUsed(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.mine).length; }
function broodCap(){ return G.swarm.cfg.cap||SWARM_PLAY.cap; }
function broodUnlocked(type){ const at=(G.swarm.cfg.unlock||{})[type] ?? UNITS[type].unlock ?? 0; return G.time>=at; }
function nestHive(){ const s=G.sel.find(e=>!e.dead&&e.type==='hive'); if(s) return s; const r=G.swarm.rally; const hs=hives(); if(!hs.length) return null; return r?hs.reduce((a,b)=>dist(a,r)<=dist(b,r)?a:b):hs[0]; }
/* waiting brood stays near the gathering point and fights whatever comes close */
function broodThink(u){ const r=u.post||G.swarm.rally||u.guardAt; if(!r) return; if(u.order&&u.order.type==='move') return;   /* walking to where you sent it */
  if(!u.target&&(!u.order||Math.hypot(u.order.x-r.x,u.order.y-r.y)>TILE)){ u.order={type:'guard',x:r.x,y:r.y,wait:rand(0,2)}; setPath(u,r.x,r.y); } }
function swarmBreed(type){
  const d=UNITS[type], nest=nestHive();
  if(!nest){ toast('No hive left to hatch from.'); return; }
  if(!broodUnlocked(type)){ toast(`The brood cannot grow a ${d.name} yet.`); return; }
  if(G.swarm.biomass<d.biomass){ toast(`Not enough biomass: a ${d.name} costs ${d.biomass}.`); return; }
  if(broodUsed()>=broodCap()){ toast(`The brood is at its limit (${broodCap()}). Spend it first.`); return; }
  const u=spawnNearBuilding(type,'swarm',nest,G.swarm.rally); if(!u){ toast('The nest is surrounded.'); return; }
  G.swarm.biomass-=d.biomass; u.role='brood'; u.mine=true; u.guardAt={x:u.x,y:u.y};
  const r=G.swarm.rally; if(r&&dist(u,r)>4*TILE&&!canReach(u,r)) tunnelTo(u,r);   /* the way is shut: it digs */
  G.fx.push({k:'boom',x:u.x,y:u.y,t:0.3,max:0.3,r:16,col:'#a6ff4a'}); SFX.play('hatch',u.x,u.y); G.selDirty=true; }
/* can a unit walk from a to b? (findPath falls back to the closest point it can reach, so look where the path ends) */
function canReach(a,b){ const p=findPath(a.x,a.y,b.x,b.y,true); if(!p||!p.length) return false; const l=p[p.length-1]; return Math.hypot(l.x-b.x,l.y-b.y)<2*TILE; }
/* a fresh hatchling that cannot walk to the gathering point burrows into the rock and comes up near it a little later */
function tunnelTo(u,r){ u.tunnel={x:r.x,y:r.y,t:SWARM_PLAY.tunnel}; u.hidden=true; u.invuln=true; addDecal(u.x,u.y,10,'rgba(30,26,22,.6)'); }
function updateTunnels(dt){ for(const u of G.ents){ if(u.dead||!u.tunnel) continue; u.tunnel.t-=dt; u.order={type:'hold'}; if(u.tunnel.t>0) continue;
    const f=freeTilesNear(Math.floor(u.tunnel.x/TILE)+Math.round(rand(-2,2)),Math.floor(u.tunnel.y/TILE)+Math.round(rand(-2,2)),1)[0]; if(f){ u.x=(f.x+.5)*TILE; u.y=(f.y+.5)*TILE; }
    u.tunnel=null; u.hidden=false; u.invuln=false; u.order=null; u.path=null; for(let j=0;j<6;j++) G.fx.push({k:'ember',x:u.x+rand(-10,10),y:u.y+rand(-4,6),vx:rand(-50,50),vy:rand(-80,-20),t:0.7,max:0.7,col:'#8a7a6a'}); addDecal(u.x,u.y,12,'rgba(30,26,22,.6)'); } }
/* the swarm units you selected yourself (box-drag or click): you can steer them as a squad */
function selSwarm(){ return G.sel.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss&&(!e.def.grafter||e.avatar)); }
function freeFromJobs(u){ if(u.haul) dropBody(u.haul); u.claim=null; u.claimMode=null; u.waveDelay=0; u.viaGoal=null; }
/* right-click: with swarm units selected they go there (or attack what you clicked) and wait there; otherwise it sets the gathering point */
function swarmRight(x,y){ let us=selSwarm(); if(!us.length&&avatarAlive()&&G.avatar.kind==='unit') us=[G.avatar];   /* your own creature listens even when nothing is selected */
  if(!us.length){ setRally(x,y); return; }
  const t=entityAt(x,y,e=>e.faction==='corps'&&e.kind!=='crate'||e.faction==='wild');
  /* the creature you steer simply goes where you click, or attacks what you click */
  for(const u of us.filter(u=>u.avatar)){ if(u.rootT!=null||u.latched) continue; if(t&&!u.def.grafter){ u.target=t; u.order={type:'attack',target:t}; u.path=null; } else { u.target=null; u.order={type:'move',x,y}; setPath(u,x,y); } }
  if(us.some(u=>u.avatar)){ G.following=true; G.pings.push({x,y,t:0,col:'#c38bff'}); SFX.play('squelch'); } us=us.filter(u=>!u.avatar); if(!us.length) return;
  if(t){ for(const u of us){ freeFromJobs(u); u.role='wave'; u.post=null; u.target=t; u.order={type:'attack',target:t}; u.path=null; } SFX.play('attack'); G.pings.push({x:t.x,y:t.y,t:0,col:'#ff5a4f'}); G.selDirty=true; return; }
  for(const u of us){ freeFromJobs(u); u.role='brood'; u.mine=true; u.target=null; u.post={x,y}; }
  moveGroup(us,x,y,'move'); SFX.play('squelch'); G.pings.push({x,y,t:0,col:'#c38bff'}); G.selDirty=true; }
/* H: the waiting brood (or your selection) goes out to fetch the bodies lying in the field */
function swarmHarvest(){ const us=(selSwarm().length?selSwarm():myBrood()).filter(u=>!u.haul); const bodies=G.ents.filter(b=>!b.dead&&b.kind==='body'&&!b.home&&!b.carrier);
  if(!bodies.length){ toast('No fallen to bring home right now.',true); return; } if(!us.length){ toast('Nobody is free to fetch them.'); return; }
  let n=0; for(const b of bodies){ const pool=us.filter(u=>!u.claim); if(!pool.length) break;
    const c=pool.reduce((a,u)=>dist(u,b)<dist(a,b)?u:a); freeFromJobs(c); c.claim=b; c.claimMode='haul'; c.target=null; c.order=null; n++;
    const g=us.filter(u=>!u.claim); if(g.length){ const e=g.reduce((a,u)=>dist(u,b)<dist(a,b)?u:a); e.claim=b; e.claimMode='guard'; e.target=null; e.order=null; } }
  G.selDirty=true; say('The Brood',`We go to bring ${n} of the fallen home.`,'swarm'); }
function setRally(x,y){ const f=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(!f) return; x=(f.x+.5)*TILE; y=(f.y+.5)*TILE;
  G.swarm.rally={x,y}; for(const u of myBrood()){ u.order=null; u.target=null; u.post=null; } G.pings.push({x,y,t:0,col:'#c38bff'}); SFX.play('squelch'); G.selDirty=true; }
function sendWave(x,y){ ui.amove=false; cv.classList.remove('amove'); G.selDirty=true;
  const sel=selSwarm(), us=sel.length?sel:myBrood(); if(!us.length){ toast('No brood is waiting at the gathering point. Hatch some first.'); return; }
  for(const u of us){ freeFromJobs(u); u.post=null; }
  const t=entityAt(x,y,e=>e.faction==='corps'&&e.kind!=='crate');
  for(const u of us){ u.role='wave'; u.target=t||null; u.order={type:'amove',x:x+rand(-24,24),y:y+rand(-24,24)}; setPath(u,u.order.x,u.order.y); }
  const plan=waveTactic(us,G.swarm.tactic);
  G.pings.push({x,y,t:0,col:'#ff5a4f'}); SFX.play('horn');
  say('The Brood',`${us.length} go${us.length===1?'es':''} to feed${plan!=='direct'?` (${TACTIC_INFO[plan].name.toLowerCase()})`:''}.`,'swarm'); }
function cycleTactic(){ const ks=Object.keys(TACTIC_INFO), i=ks.indexOf(G.swarm.tactic); G.swarm.tactic=ks[(i+1)%ks.length]; toast(`Tactic: ${TACTIC_INFO[G.swarm.tactic].name}. ${TACTIC_INFO[G.swarm.tactic].tip}`,true); G.selDirty=true; }
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
  for(const t of SWARM_PLAY.brood){ const d=UNITS[t], un=broodUnlocked(t);
    out.push({row:'Brood',key:SWARM_PLAY.keys[t],img:iconUrl(t),cost:d.biomass,off:!un||S.biomass<d.biomass||used>=cap,
      tip:`${d.name}|${d.desc} Costs ${d.biomass} biomass.${un?'':` Not yet: the brood can grow it after ${fmtTime((S.cfg.unlock||{})[t]??d.unlock??0)}.`}`,act:()=>swarmBreed(t)}); }
  const sel=selSwarm().length, waiting=sel||myBrood().length, T=TACTIC_INFO[S.tactic];
  out.push({row:'Orders',key:'A',glyph:'⚔',cost:waiting||'',active:ui.amove,off:!waiting,tip:`Attack|Click a spot or an enemy: ${sel?`the ${sel} you selected go`:`all ${waiting} waiting at the gathering point go`} for it (${T.name}).`,act:()=>{ ui.amove=!ui.amove; ui.burrow=false; ui.rallyPick=false; cv.classList.toggle('amove',ui.amove); }});
  out.push({row:'Orders',key:'G',glyph:'⚑',active:ui.rallyPick,tip:'Gather|Click where the brood gathers. Right-click anywhere does the same. New brood hatches at the hive nearest to it, or at the hive you selected.',act:()=>{ ui.rallyPick=!ui.rallyPick; ui.amove=false; ui.burrow=false; cv.classList.toggle('amove',ui.rallyPick); }});
  const nb=G.ents.filter(b=>!b.dead&&b.kind==='body'&&!b.home&&!b.carrier).length;
  out.push({row:'Orders',key:'H',glyph:'⤓',cost:nb||'',off:!nb,tip:`Harvest|${sel?'The units you selected':'The waiting brood'} go out to carry the ${nb} fallen lying in the field home to a hive. One carries, one guards. On the creep a Grafter from a hive egg turns them.`,act:swarmHarvest});
  out.push({row:'Orders',key:'T',glyph:T.glyph,tip:`Tactic: ${T.name}|${T.tip} Press T to change.`,act:cycleTactic});
  const B=SWARM_PLAY.burrow, cd=Math.ceil(B.cooldown-(G.time-S.burrowAt));
  out.push({row:'Orders',key:'B',glyph:'⇣',cost:cd>0?`${cd}s`:B.cost,active:ui.burrow,off:cd>0||S.biomass<B.cost,tip:`Burrow|${B.units.length} of the brood dig up out of the ground where you click, at least ${B.clear} tiles from the Lunar Corps. Costs ${B.cost} biomass, then the ground needs ${B.cooldown} seconds.`,act:()=>{ ui.burrow=!ui.burrow; ui.amove=false; ui.rallyPick=false; cv.classList.toggle('amove',ui.burrow); }});
  return out; }
/* the gathering point and the nest, drawn on the map */
function drawSwarmOrders(now){ const r=G.swarm.rally;
  if(r){ const p=0.5+0.5*Math.sin(now/300); ctx.strokeStyle=`rgba(195,139,255,${0.45+0.3*p})`; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.lineDashOffset=-now/60;
    ctx.beginPath(); ctx.ellipse(r.x,r.y+2,22,12,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#c38bff'; ctx.fillRect(r.x-1,r.y-18,2,18); ctx.fillStyle='#a6ff4a'; ctx.beginPath(); ctx.arc(r.x+1,r.y-19,4+p,0,Math.PI*2); ctx.fill(); }
  const n=nestHive(); if(n){ ctx.strokeStyle='rgba(166,255,74,.45)'; ctx.lineWidth=2; ctx.setLineDash([2,5]); ctx.beginPath(); ctx.ellipse(n.x,n.y+n.r*0.35,n.r*1.25,n.r*0.8,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); } }
/* top bar and the empty selection panel */
function swarmHud(){ $('#r-salvage').textContent=Math.floor(G.swarm.biomass); const s=$('#r-supply'); s.textContent=`${broodUsed()}/${broodCap()}`; s.classList.toggle('warn',broodUsed()>=broodCap());
  $('#r-troops').textContent=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm').length; }
function setupSideHud(){ const sw=swarmSide(), lbl=(id,t)=>{ const el=$(id); if(el){ const l=el.closest('.res').querySelector('.lbl'); if(l) l.textContent=t; } };
  lbl('#r-salvage',sw?'Biomass':'Salvage'); lbl('#r-supply',sw?'Brood':'Supply'); lbl('#r-troops',sw?'Swarm':'Troops');
  $('#r-troops-wrap').dataset.tip=sw?'The Swarm on the field|Your brood, the hive guards and everything that hatched on its own.':'Troops|';
  document.body.classList.toggle('as-swarm',sw); }
const SWARM_HINT='You are the Brood. Drag to select swarm units and <kbd>Right-click</kbd> to move them; with nothing selected, right-click calls the brood together. <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> hatch (click a hive to hatch there), <kbd>A</kbd> + click attacks, <kbd>H</kbd> brings the fallen home.';
/* the Lunar Corps as the computer: a squad answers when one of its buildings or soldiers nearby is hit */
function corpsMove(us,x,y,mode){ for(const u of us){ u.home=null; u.stance=null; } moveGroup(us,x,y,mode); }
function updateCorpsAI(dt){ if(!swarmSide()) return; G.corpsT=(G.corpsT||0)-dt; if(G.corpsT>0) return; G.corpsT=0.5;
  const hit=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.hitAt!=null&&G.time-e.hitAt<3);
  if(!hit.length) return;
  for(const u of G.ents){ if(u.dead||u.downed||u.kind!=='unit'||u.faction!=='corps'||u.target||u.def.escort||!u.def.damage) continue; if(u.order&&u.order.type!=='hold') continue;
    const h=hit.find(e=>e!==u&&dist(e,u)<14*TILE); if(!h) continue;
    const foe=h.hitBy&&!h.hitBy.dead&&h.hitBy.kind?h.hitBy:nearestOf(h,e=>e.faction==='swarm'&&e.kind==='unit'&&dist(e,h)<8*TILE);
    if(foe){ u.target=foe; if(!u.home) u.home={x:u.x,y:u.y}; } } }
/* mission helpers: the starting swarm units become your brood; a Lunar Corps fire team goes to burn the nearest hive */
function swarmBrood(){ for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.homeHive==null&&!u.def.boss){ u.role='brood'; u.mine=true; u.order=null; } }
function corpsRaid(g,n,who,text){ const q=ptWorld('Q')||{x:0,y:0}, h=hives().sort((a,b)=>dist(a,q)-dist(b,q))[0]; if(!h) return;
  const team=g.corps().filter(u=>!u.def.builder&&!u.def.heal).sort((a,b)=>dist(a,h)-dist(b,h)).slice(0,g.n(n)); const med=g.corps().find(u=>u.def.heal); if(med&&team.length>=3) team.push(med);
  if(!team.length) return; g.say(who,text); g.orderCorps(team,{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)},'amove');
  g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }
