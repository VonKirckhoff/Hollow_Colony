'use strict';
/* Training (the Swarm): The First Hunger, in Kappa Basin. Every order of the Brood, step by step.
   Hives → hatching → the gathering point → steering a selection → attacking → bringing the fallen home → egg and Grafter
   → the Husk → two teams → luring one out → burrowing → tearing down an outpost. Press N to skip a step. */
/* FIRST_HUNGER: preyEvery = seconds before a new pair of soldiers wanders into the open once the last ones are down · prey = how many come
   · huskMax = most soldiers turned or turning at once (bodies on the field, cocoons, Twitchers and Husks). Once that many have been reached,
     no more soldiers wander into the open: new prey only comes from luring one of the drill squad out of its ring.
     A lured soldier brought down while huskMax are turned dies without leaving a body (he still feeds the brood).
   · swarmMax = no new prey in the open while this many Swarm creatures roam (hive guards and Grafters do not count)
   · the drill squad at the outpost: drill = its soldiers, drillHp = their health ×, drillDmg = their damage ×,
     ring = tiles round the outpost where they cannot fall (drillRise = share of health they get back up with), outside it they are exposed,
     drillHeal = share of health per second they heal inside the ring with no Swarm within 7 tiles,
     chaseR = tiles from the outpost a soldier chases a lone biter (chaseFoes = at most this many Swarm creatures near him), chaseTime = seconds at most,
     refill = seconds before a dropship brings a replacement, flight = seconds the dropship takes */
const FIRST_HUNGER = { preyEvery:12, prey:2, huskMax:4, swarmMax:30, drill:['trooper','trooper','trooper','engineer'], drillHp:2, drillDmg:0.5, drillRise:0.6, drillHeal:0.06,
  ring:6, chaseR:12, chaseFoes:2, chaseTime:15, refill:10, flight:12 };
const PREY_AT = {x:36,y:24}, DRILL_AT = {x:19,y:20}, GRAZE_AT = {x:16,y:9}, LURE_AT = {x:9,y:26}, PAD_AT = {x:16,y:22}, SIDE_AT = {x:11,y:21};
   /* DRILL_AT: the outpost (Q) · LURE_AT: the lone Relay Tower outside the ring (on the build site at 8,25) · PAD_AT: where the dropship lands · SIDE_AT: the way round for the second team */
function preyStanding(g){ return (g.vars.prey||[]).some(u=>!u.dead&&!u.downed); }
/* soldiers on their way to becoming Husks, or already Husks */
function turnedCount(){ return G.ents.filter(e=>!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))).length; }
/* the grazer to show in the fauna step: the one nearest the gathering point; if none are left, two wander in */
function grazerTarget(g){ const r=G.swarm.rally||{x:30*TILE,y:9*TILE}; let gz=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.type==='grazer');
  if(!gz.length) gz=spawnAt('grazer','wild',GRAZE_AT,2).map(u=>{ u.home={x:u.x,y:u.y}; return u; });
  return gz.sort((a,b)=>dist(a,r)-dist(b,r))[0]; }
function swarmRoaming(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.role!=='guard'&&!e.def.grafter).length; }
/* ---- the drill squad: inside its ring it never falls (u.drill, see damage() in 08-combat.js); outside it, it can be brought down ---- */
const drillCentre=()=>({x:(DRILL_AT.x+.5)*TILE,y:(DRILL_AT.y+.5)*TILE});
function inRing(u){ const c=drillCentre(); return Math.hypot(u.x-c.x,u.y-c.y)<=FIRST_HUNGER.ring*TILE; }
function makeDrill(g,u){ const F=FIRST_HUNGER, c=drillCentre();
  u.maxHp*=F.drillHp; u.hp=u.maxHp; u.dmgMul=(u.dmgMul||1)*F.drillDmg; u.drill={ rise:F.drillRise, x:c.x, y:c.y, r:F.ring*TILE, noBody:()=>turnedCount()>=FIRST_HUNGER.huskMax };
  u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; u.dhome={x:u.x,y:u.y}; (g.vars.drill=g.vars.drill||[]).push(u); return u; }
function drillSquad(g){ const F=FIRST_HUNGER, tiles=freeTilesNear(DRILL_AT.x,DRILL_AT.y,F.drill.length); g.vars.drill=[];
  F.drill.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'corps',(s.x+.5)*TILE,(s.y+.5)*TILE); fromReserve(u); makeDrill(g,u); });
  const c=drillCentre(); G.rings=[{x:c.x,y:c.y,r:F.ring*TILE,col:'#ffb347',label:'DRILL SQUAD: CANNOT FALL INSIDE'}];
  return g.vars.drill; }
/* the drill squad's brain, every tick: the Engineer goes out to mend the lone tower, a soldier chases a lone biter, the rest hold the ring;
   who leaves the ring is EXPOSED; who falls outside it counts as lured (g.vars.lured); the dropship tops the squad up to its full strength */
function drillThink(g){ const F=FIRST_HUNGER, dt=g.time-(g.vars.drillT??g.time); g.vars.drillT=g.time; const c=drillCentre(), tower=g.vars.lureTower;
  /* the lone tower cannot fall: at 1 HP it goes DOWN (nobody can bite it any more, so the brood lets go) until it is mended to half again */
  if(tower&&!tower.dead){ if(!tower.down&&tower.hp<=1.01){ tower.down=true; tower.invuln=true; G.fx.push({k:'text',x:tower.x,y:tower.y-34,t:1.6,max:1.6,txt:'DOWN',col:'#8a8f9c'});
      for(let i=0;i<14;i++) G.fx.push({k:'spark',x:tower.x+rand(-10,10),y:tower.y-14,vx:rand(-80,80),vy:rand(-110,-20),t:0.6,max:0.6,col:'#ffd23f'});
      if(!g.vars.saidDown){ g.vars.saidDown=true; g.brood_say('Their tower is dead. Nothing left to bite: wait for the mender.'); } }
    else if(tower.down&&tower.hp>=tower.maxHp*0.5){ tower.down=false; tower.invuln=false; G.fx.push({k:'text',x:tower.x,y:tower.y-34,t:1.2,max:1.2,txt:'ONLINE',col:'#5fe3b0'}); } }
  const home=u=>{ u.task=null; u.chase=null; u.target=null; u.order={type:'move',x:u.dhome.x,y:u.dhome.y}; setPath(u,u.dhome.x,u.dhome.y); };
  for(const u of g.vars.drill){
    if(u.dead||u.downed){ if(!u.counted){ u.counted=true; if(u.lastOut||!inRing(u)){ g.vars.lured=(g.vars.lured||0)+1; } } continue; }   /* fell outside the ring: lured */
    const inside=inRing(u); u.lastOut=!inside;
    if(!inside&&!u.exposed){ u.exposed=true; G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'EXPOSED',col:'#ff5a4f'}); }
    if(inside) u.exposed=false;
    if(inside&&u.hp<u.maxHp&&!G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,u)<7*TILE)) u.hp=Math.min(u.maxHp,u.hp+u.maxHp*F.drillHeal*dt);
    if(u.def.builder){   /* the Engineer: out to the lone tower when it is hurt, home again once it is whole */
      if(tower&&!tower.dead&&tower.hp<tower.maxHp&&u.task!=='repair'){ u.task='repair'; u.stance=null; u.target=null; u.order={type:'repair',target:tower}; u.path=null;
        if(!g.vars.saidEng){ g.vars.saidEng=true; g.brood_say('Their mender walks out to the hurt tower. Outside the ring he is soft.'); } }
      else if(u.task==='repair'&&(!tower||tower.dead||tower.hp>=tower.maxHp)) home(u);
      else if(u.task==='repair'&&(!u.order||u.order.type!=='repair')&&tower&&!tower.dead) u.order={type:'repair',target:tower}; }
    else if(u.task==='chase'){ const t=u.chase; if(!t||t.dead||t.hidden||Math.hypot(u.x-c.x,u.y-c.y)>F.chaseR*TILE||g.time-u.chaseAt>F.chaseTime) home(u);
      else if(!u.order||u.order.type!=='attack'||u.order.target!==t){ u.target=t; u.order={type:'attack',target:t}; u.path=null; } }
    else if(!u.task&&u.hitAt!=null&&u.hitAt>(u.hitSeen??-1)){ u.hitSeen=u.hitAt;   /* bitten since the last look: by a lone creature? then he goes after it */
      const near=G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,u)<6*TILE);
      if(near.length&&near.length<=F.chaseFoes){ const t=near.sort((a,b)=>dist(a,u)-dist(b,u))[0]; u.task='chase'; u.chase=t; u.chaseAt=g.time; u.stance=null; u.target=t; u.order={type:'attack',target:t}; u.path=null;
        G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.2,max:1.2,txt:'AFTER IT',col:'#ffb347'}); if(!g.vars.saidChase){ g.vars.saidChase=true; g.brood_say('One of them runs after the biter. Lead him out of the ring.'); } } }
    if(!u.task){   /* back to his place in the ring, then hold */
      const away=Math.hypot(u.x-u.dhome.x,u.y-u.dhome.y)>TILE;
      if(away&&!u.target&&(!u.order||u.order.type!=='move')) home(u);
      else if(!away&&u.order&&u.order.type==='move'){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; } } }
  g.vars.drill=g.vars.drill.filter(u=>!(u.dead||u.downed)||!u.counted);
  /* top up: a dropship brings who is missing */
  const pad=g.vars.pad; if(!pad||pad.dead) return;
  for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='corps'&&!u.drill&&!(g.vars.prey||[]).includes(u)&&dist(u,pad)<4*TILE){ makeDrill(g,u); u.dhome={x:u.x,y:u.y}; }   /* just off the dropship */
  const alive=g.vars.drill.filter(u=>!u.dead&&!u.downed), want=[...F.drill]; for(const u of alive){ const k=want.indexOf(u.type); if(k>=0) want.splice(k,1); }
  if(!want.length||pad.flight){ g.vars.refillAt=null; return; }
  if(g.vars.refillAt==null){ g.vars.refillAt=g.time+F.refill; return; }
  if(g.time>=g.vars.refillAt){ g.vars.refillAt=null; pad.flight={ t:F.flight, total:F.flight, cargo:want }; G.selDirty=true; g.brood_say('A flying thing comes to their outpost. It brings new soft ones to stand in the ring.'); } }
function newPrey(g,talk){ g.vars.prey=(g.vars.prey||[]).filter(u=>!u.dead&&u.downed);   /* keep the ones still bleeding out (the step checks look at the list) */
  const us=g.spawn('trooper',PREY_AT,FIRST_HUNGER.prey); for(const u of us){ u.order={type:'hold'}; u.stance='hold'; g.vars.prey.push(u); }
  g.reveal(PREY_AT,5,8); g.ping(PREY_AT); if(talk) g.brood_say('More of the soft ones wander into the open. Feed.'); return us; }
TRAINING.swarm = {
  id:'training-swarm', side:'swarm', training:true, title:'The First Hunger', map:'kappa',
  summary:'Learn to be the Brood: hatching, gathering, striking, and what the Swarm does with the fallen.',
  briefing:[
    'Before the Brood wakes under Kappa Station, learn what it can do. Each step tells you what to do and waits for you; the objective in the bottom left shows where you are.',
    'Press <b>N</b> to skip a step. Nothing here counts for the campaign.'
  ],
  start:{ camera:{x:31,y:9}, rally:{x:30,y:9},
    units:[ ['trooper',{x:36,y:24},2] ], hives:['a','b','c'] },
  swarm:{ hatchToBrood:true, manualHaul:true, biomass:120, rate:1.0, guardMax:1, guardEvery:30, aggro:0, waves:null, cap:24, unlock:{ spitter:0, brute:0 } },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{ g.vars.prey=g.corps().filter(u=>Math.hypot(u.x-(36.5*TILE),u.y-(24.5*TILE))<4*TILE); for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; }
        g.place('sentry','Q',3,-2); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-19,a.y-20)-Math.hypot(b.x-19,b.y-20))[0]; g.vars.relaySite={x:s.x,y:s.y}; makeBuilding('relay','corps',s.x,s.y,true);
        const t=makeBuilding('relay','corps',8,25,true); t.lure=true; t.noDestroy=true; g.vars.lureTower=t;   /* the lone tower outside the ring, on the build site: it never falls, their Engineer comes to mend it */
        g.vars.pad=g.pad(PAD_AT,'drill'); drillSquad(g); } },
    /* a steady supply of prey: once the soldiers in the open are all down, a new pair wanders in after FIRST_HUNGER.preyEvery seconds,
       so the hunt, the fallen and the tactics can be practised again and again */
    { repeat:true, when:g=>!!g.vars.prey&&!g.vars.openDone, do:g=>{ if(turnedCount()>=FIRST_HUNGER.huskMax){ g.vars.openDone=true;   /* enough Husks made: from now on only what you lure out of the ring */
          g.brood_say(`${FIRST_HUNGER.huskMax} of theirs are ours. No more soft ones will wander into the open: lure them out of their ring.`); return; }
        if(preyStanding(g)){ g.vars.preyAt=null; return; }
        if(g.vars.preyAt==null){ g.vars.preyAt=g.time+FIRST_HUNGER.preyEvery; return; }
        if(g.time>=g.vars.preyAt){ if(swarmRoaming()>=FIRST_HUNGER.swarmMax){ g.vars.preyAt=g.time+3; if(!g.vars.saidFull){ g.vars.saidFull=true; g.brood_say('We are many now. The soft ones keep away until we have spent some of us.'); } return; }
          g.vars.preyAt=null; newPrey(g,true); } } },
    { repeat:true, when:g=>!!g.vars.drill, do:drillThink },
    ...tutorial([
      { say:'We wake. Learn what the Brood can do. The world keeps moving while a card is open; try things as you read. Close a card with [Enter]; the next one comes once you have done what it asks. What we talk about lights up. ◀ and ▶ page back through earlier tips; Practice again redoes one. The Tips tab at the top brings the card back. [N] skips a step.', obj:'Listen to the Brood', hl:['#objectives'], done:g=>g.time>2 },
      { say:'Look around: arrow keys, the edge of the screen, or click the minimap. Our three nests ring the basin.', obj:'Move the camera', hl:['#minimap-wrap'], setup:g=>{ g.vars.cam0={...G.cam}; }, done:tut.camMoved },
      { say:'Click one of our hives. The selected hive is the nest: new brood hatches there.', obj:'Click a hive', setup:()=>{ centerOn(31*TILE,9*TILE); }, done:()=>G.sel.some(e=>e.type==='hive') },
      { say:'Hatch the brood: [Q] a Crawler, [W] a Drone, [E] a Spitter, [R] a Brute. Each costs biomass (top left). Hatch three.', obj:'Hatch three of the brood (Q W E R)', keys:['Q','W','E','R'], hl:['#topbar .res:first-child'], done:()=>broodUsed()>=3 },
      { keys:['G'], say:'[Right-click] on open ground (with nothing selected) to set the gathering point. New brood waits there. [G] + click does the same.', obj:'Move the gathering point (right-click)', setup:g=>{ selectEntities([],false); g.vars.r0={...G.swarm.rally}; },
        done:g=>Math.hypot(G.swarm.rally.x-g.vars.r0.x,G.swarm.rally.y-g.vars.r0.y)>3*TILE },
      { say:'You can also steer them yourself. Drag a box around some of the brood and [Right-click] somewhere: they go there and wait, and the camera follows them.', obj:'Select brood and move it (drag, right-click)', done:()=>G.ents.some(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.post) },
      { keys:['A'], say:'Not everything here is theirs. Grazers, the lunar fauna, wander the basin: soft meat to start on. Press [A] and click next to one (or select brood and [Right-click] it): the brood goes to feed.', obj:'Kill a grazer (A + click)', markLabel:'Grazer',
        setup:g=>{ const gz=grazerTarget(g); g.vars.gz=gz; if(gz){ g.marker('tut',{x:gz.x/TILE-0.5,y:gz.y/TILE-0.5},'Grazer'); g.reveal({x:gz.x/TILE,y:gz.y/TILE},5,12); centerOn(gz.x,gz.y); } },
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&e.fauna)||(e.type==='cocoon'&&e.hatchType==='bloater')||e.type==='bloater')) },
      { keys:['H'], say:'We do not tear a body apart: a whole one is worth more. It stays where it fell until we fetch it. Press [H]: the brood drags the carcass home to the creep of a hive.', obj:'Drag the carcass home (H)',
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&e.fauna&&e.home)||(e.type==='cocoon'&&e.hatchType==='bloater')||e.type==='bloater')) },
      { say:'On the creep an egg opens. A Grafter crawls out, latches onto the carcass and remakes it. A grazer becomes a Bloater: slow and swollen with acid, and when it dies it bursts and burns everything around it. Watch.', obj:'Watch the grazer become a Bloater',
        done:g=>G.ents.some(e=>!e.dead&&e.type==='bloater')||g.time>g.vars.tutStart+60 },
      { keys:['A'], say:'Now their soldiers. Two soft ones stand in the open. Press [A] and click them: everything waiting (or what you selected) goes to feed.', obj:'Attack the two soldiers (A + click)', mark:PREY_AT, markLabel:'Prey',
        setup:g=>{ if(!preyStanding(g)) newPrey(g,false); g.reveal(PREY_AT,5,10); }, done:g=>g.vars.prey.every(u=>u.dead||u.downed) },
      { keys:['H'], say:'We do not finish the fallen. They bleed out, and the body stays where it fell until we fetch it. Press [H]: the brood carries them home.', obj:'Bring a body home (H)',
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&!e.fauna&&e.home)||(e.type==='cocoon'&&e.husk)||e.type==='husk')) },
      { say:'The Grafter does the same with a soldier, but what grows out of him is something else. Watch.', obj:'Watch the Grafter turn the body',
        done:()=>G.ents.some(e=>!e.dead&&((e.type==='cocoon'&&e.husk)||e.type==='husk')) },
      { say:`The cocoon beats faster and faster. What crawls out is a Twitcher, weak while it turns; it molts once and becomes a Husk, a warrior. It joins the brood at the gathering point and goes where you send it. Soldiers keep wandering into the open until ${FIRST_HUNGER.huskMax} of them are turned. After that you only get more by luring them out of their outpost, and never more than ${FIRST_HUNGER.huskMax} Husks at once: to make room, spend some in a fight.`, obj:'Watch it grow',
        done:g=>G.ents.some(e=>e.type==='husk'&&!e.dead&&e.stage>=1)||g.time>g.vars.tutStart+45 },
      ...topbarSteps('swarm'),
      { keys:['Ctrl','1','2'], say:'There is no plan button: you make the plan. Their drill squad guards the outpost; inside the dashed ring they always get back up. Split the brood in two. Select part of it and press [Ctrl]+[1]; select the rest and press [Ctrl]+[2]. Then press [1] and send that team at them from the front ([A] + click, or [Right-click] a soldier), press [2] and send the other team round the side (the marker) to bite from there.', obj:'Two teams: Ctrl+1, Ctrl+2, attack from two sides', mark:SIDE_AT, markLabel:'Round the side',
        setup:g=>{ g.biomass(150); g.reveal(DRILL_AT,8,15); },
        done:()=>{ const grp=n=>((G.groups||{})[n]||[]).filter(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'); const a=grp('1'), b=grp('2'), sent=u=>u.role==='wave'||(u.target&&u.target.faction==='corps');
          return a.length&&b.length&&a.some(u=>!b.includes(u))&&a.some(sent)&&b.some(sent); } },
      { say:'Inside the ring they cannot be beaten; outside it they are soft. Lure one out. Send a single creature to bite the lone Relay Tower outside the ring: their Engineer walks out to mend it. Or let a single creature bite a soldier at the edge of the ring and run: he chases it. Hide the rest of the brood along the way, bring the lured one down, and carry him home.', obj:'Lure one of the drill squad out of the ring and bring him down', mark:LURE_AT, markLabel:'Lone tower',
        setup:g=>{ g.vars.l0=g.vars.lured||0; g.biomass(100); g.reveal(LURE_AT,5,15); },
        done:g=>(g.vars.lured||0)>g.vars.l0 },
      { keys:['B'], say:'Press [B] and click open ground, away from their eyes: a small brood digs up out of the rock. (For this step the brood limit stretches, so there is always room.)', obj:'Burrow up a brood (B + click)',
        setup:g=>{ const B=SWARM_PLAY.burrow; if(G.swarm.biomass<B.cost) g.biomass(B.cost-G.swarm.biomass+15);
          const short=broodUsed()+B.units.length-broodCap(); if(short>0) G.swarm.capExtra=(G.swarm.capExtra||0)+short;   /* room for one burrow, even at the limit */
          if(!burrowReady()) G.swarm.burrowAt=G.time-B.cooldown; g.vars.b0=G.swarm.burrowAt; },
        done:g=>G.swarm.burrowAt>g.vars.b0 },
      { say:'Their outpost hums at the centre: a tower and a gun that turns by itself. Grow the brood and tear both down; the drill squad will not fall, but it cannot stop us alone. Every soldier we kill feeds us.', obj:'Destroy the Relay Tower and the Sentry Gun', mark:'Q', markLabel:'Outpost',
        setup:g=>{ g.biomass(200); let rebuilt=false;   /* torn down before this step? Then they have built it up again, so there is something to practise on */
          if(!tut.built('relay').length&&g.vars.relaySite){ makeBuilding('relay','corps',g.vars.relaySite.x,g.vars.relaySite.y,true); rebuilt=true; }
          if(!tut.built('sentry').length){ g.place('sentry','Q',3,-2); rebuilt=true; }
          if(rebuilt){ g.ping('Q'); g.brood_say('They have raised their outpost again. Tear it down once more.'); } }, done:()=>tut.built('relay').length===0&&tut.built('sentry').length===0, after:g=>g.win('The outpost is torn open. The Brood is ready to wake under Kappa Station.') }
    ])
  ]
};
