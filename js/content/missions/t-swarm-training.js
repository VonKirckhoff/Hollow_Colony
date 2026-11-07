'use strict';
/* Training (the Swarm): The First Hunger, in Kappa Basin. Every order of the Brood, step by step.
   Hives → hatching → the gathering point → steering a selection → attacking → bringing the fallen home → egg and Grafter
   → the Husk → tactics → burrowing → tearing down an outpost. Press N to skip a step. */
/* FIRST_HUNGER: preyEvery = seconds before a new pair of soldiers wanders into the open once the last ones are down · prey = how many come
   · swarmMax = no new prey while this many Swarm creatures roam (hive guards and Grafters do not count)
   · the drill squad (step 17, tactics): drill = its soldiers, drillHp = their health ×, drillDmg = their damage ×,
     drillRise = share of health they get back up with when knocked to 0 (they never fall), drillHeal = share of health per second they heal with no Swarm within 7 tiles */
const FIRST_HUNGER = { preyEvery:12, prey:2, swarmMax:30, drill:['trooper','trooper','gunner','trooper'], drillHp:3, drillDmg:0.5, drillRise:0.6, drillHeal:0.06 };
const PREY_AT = {x:36,y:24}, DRILL_AT = {x:24,y:33};
function preyStanding(g){ return (g.vars.prey||[]).some(u=>!u.dead&&!u.downed); }
function swarmRoaming(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.role!=='guard'&&!e.def.grafter).length; }
/* the drill squad: tough soldiers who get up again at once (u.drill, see damage() in 08-combat.js) */
function drillSquad(g){ g.vars.drill=(g.vars.drill||[]).filter(u=>!u.dead); if(g.vars.drill.length) return g.vars.drill;
  const F=FIRST_HUNGER, tiles=freeTilesNear(DRILL_AT.x,DRILL_AT.y,F.drill.length);
  F.drill.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'corps',(s.x+.5)*TILE,(s.y+.5)*TILE); fromReserve(u);
    u.maxHp*=F.drillHp; u.hp=u.maxHp; u.dmgMul=(u.dmgMul||1)*F.drillDmg; u.drill={rise:F.drillRise}; u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; g.vars.drill.push(u); });
  g.reveal(DRILL_AT,6,12); g.ping(DRILL_AT); return g.vars.drill; }
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
    units:[ ['trooper',{x:36,y:24},2], ['trooper','Q',2] ], hives:['a','b','c'] },
  swarm:{ hatchToBrood:true, biomass:120, rate:1.0, guardMax:1, guardEvery:30, aggro:0, waves:null, cap:24, unlock:{ spitter:0, brute:0 } },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{ g.vars.prey=g.corps().filter(u=>Math.hypot(u.x-(36.5*TILE),u.y-(24.5*TILE))<4*TILE); for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; }
        g.place('sentry','Q',3,-2); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-19,a.y-20)-Math.hypot(b.x-19,b.y-20))[0]; g.vars.relaySite={x:s.x,y:s.y}; makeBuilding('relay','corps',s.x,s.y,true); } },
    /* a steady supply of prey: once the soldiers in the open are all down, a new pair wanders in after FIRST_HUNGER.preyEvery seconds,
       so the hunt, the fallen and the tactics can be practised again and again */
    { repeat:true, when:g=>!!g.vars.prey, do:g=>{ if(preyStanding(g)){ g.vars.preyAt=null; return; }
        if(g.vars.preyAt==null){ g.vars.preyAt=g.time+FIRST_HUNGER.preyEvery; return; }
        if(g.time>=g.vars.preyAt){ if(swarmRoaming()>=FIRST_HUNGER.swarmMax){ g.vars.preyAt=g.time+3; if(!g.vars.saidFull){ g.vars.saidFull=true; g.brood_say('We are many now. The soft ones keep away until we have spent some of us.'); } return; }
          g.vars.preyAt=null; newPrey(g,true); } } },
    /* the drill squad heals when the Swarm leaves it alone */
    { repeat:true, when:g=>!!(g.vars.drill&&g.vars.drill.length), do:g=>{ const dt=g.time-(g.vars.drillT??g.time); g.vars.drillT=g.time;
        for(const u of g.vars.drill){ if(u.dead||u.hp>=u.maxHp) continue; if(G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,u)<7*TILE)) continue; u.hp=Math.min(u.maxHp,u.hp+u.maxHp*FIRST_HUNGER.drillHeal*dt); } } },
    ...tutorial([
      { say:'We wake. Learn what the Brood can do. The world keeps moving while a card is open; try things as you read. Close a card with [Enter]; the next one comes once you have done what it asks. What we talk about lights up. ◀ and ▶ page back through earlier tips; Practice again redoes one. The Tips tab at the top brings the card back. [N] skips a step.', obj:'Listen to the Brood', hl:['#objectives'], done:g=>g.time>2 },
      { say:'Look around: arrow keys, the edge of the screen, or click the minimap. Our three nests ring the basin.', obj:'Move the camera', hl:['#minimap-wrap'], setup:g=>{ g.vars.cam0={...G.cam}; }, done:tut.camMoved },
      { say:'Click one of our hives. The selected hive is the nest: new brood hatches there.', obj:'Click a hive', setup:()=>{ centerOn(31*TILE,9*TILE); }, done:()=>G.sel.some(e=>e.type==='hive') },
      { say:'Hatch the brood: [Q] a Crawler, [W] a Drone, [E] a Spitter, [R] a Brute. Each costs biomass (top left). Hatch three.', obj:'Hatch three of the brood (Q W E R)', keys:['Q','W','E','R'], hl:['#topbar .res:first-child'], done:()=>broodUsed()>=3 },
      { keys:['G'], say:'[Right-click] on open ground (with nothing selected) to set the gathering point. New brood waits there. [G] + click does the same.', obj:'Move the gathering point (right-click)', setup:g=>{ selectEntities([],false); g.vars.r0={...G.swarm.rally}; },
        done:g=>Math.hypot(G.swarm.rally.x-g.vars.r0.x,G.swarm.rally.y-g.vars.r0.y)>3*TILE },
      { say:'You can also steer them yourself. Drag a box around some of the brood and [Right-click] somewhere: they go there and wait, and the camera follows them.', obj:'Select brood and move it (drag, right-click)', done:()=>G.ents.some(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.post) },
      { keys:['A'], say:'Two soft ones stand in the open. Press [A] and click them: everything waiting (or what you selected) goes to feed.', obj:'Attack the two soldiers (A + click)', mark:{x:36,y:24}, markLabel:'Prey',
        setup:g=>{ g.reveal({x:36,y:24},5,10); }, done:g=>g.vars.prey.every(u=>u.dead||u.downed) },
      { keys:['H'], say:'We do not finish the fallen: a whole body is worth more. They bleed out. Then press [H]: the brood carries them home to the creep of a hive.', obj:'Bring a body home (H)', done:()=>(G.stats.fed||0)>=1 },
      { say:'On the creep an egg opens. A Grafter crawls out, latches onto the body and infects it. Watch.', obj:'Watch the Grafter turn the body', done:()=>G.stats.cocoons>=1 },
      { say:'The cocoon beats faster and faster. What crawls out is a Twitcher, weak while it turns; it molts once and becomes a Husk. The Husk is a warrior: it hunts their soldiers on its own, and you can select and steer it like the rest of the brood.', obj:'Watch it grow', done:g=>G.ents.some(e=>e.type==='husk'&&!e.dead&&e.stage>=1)||g.time>g.vars.tutStart+45 },
      ...topbarSteps('swarm'),
      { keys:['T','A'], say:'How the brood attacks: press [T] to change the tactic. Direct goes straight in, Lure sends a few fast ones first as bait and the rest a few seconds later, Flank swings half round the side. A drill squad of theirs holds the south of the basin: tough soldiers who get back up every time, so you can practise as long as you like. Pick Lure or Flank, then send at least three of the brood at them with [A].', obj:'Attack the drill squad with Lure or Flank (T, then A + click)', mark:DRILL_AT, markLabel:'Drill squad',
        setup:g=>{ g.vars.w0=G.swarm.sent||0; g.biomass(60); drillSquad(g); },
        done:g=>(G.swarm.sent||0)>g.vars.w0&&G.swarm.lastPlan&&G.swarm.lastPlan!=='direct' },
      { keys:['B'], say:'Press [B] and click open ground, away from their eyes: a small brood digs up out of the rock. (For this step the brood limit stretches, so there is always room.)', obj:'Burrow up a brood (B + click)',
        setup:g=>{ const B=SWARM_PLAY.burrow; if(G.swarm.biomass<B.cost) g.biomass(B.cost-G.swarm.biomass+15);
          const short=broodUsed()+B.units.length-broodCap(); if(short>0) G.swarm.capExtra=(G.swarm.capExtra||0)+short;   /* room for one burrow, even at the limit */
          if(!burrowReady()) G.swarm.burrowAt=G.time-B.cooldown; g.vars.b0=G.swarm.burrowAt; },
        done:g=>G.swarm.burrowAt>g.vars.b0 },
      { say:'Their outpost hums at the centre: a tower and a gun that turns by itself. Grow the brood and tear both down. Every soldier we kill feeds us.', obj:'Destroy the Relay Tower and the Sentry Gun', mark:'Q', markLabel:'Outpost',
        setup:g=>{ g.biomass(200); let rebuilt=false;   /* torn down before this step? Then they have built it up again, so there is something to practise on */
          if(!tut.built('relay').length&&g.vars.relaySite){ makeBuilding('relay','corps',g.vars.relaySite.x,g.vars.relaySite.y,true); rebuilt=true; }
          if(!tut.built('sentry').length){ g.place('sentry','Q',3,-2); rebuilt=true; }
          if(rebuilt){ if(!g.near('corps','Q',6)) for(const u of g.spawn('trooper','Q',2)){ u.order={type:'hold'}; u.stance='hold'; }
            g.ping('Q'); g.brood_say('They have raised their outpost again. Tear it down once more.'); } }, done:()=>tut.built('relay').length===0&&tut.built('sentry').length===0, after:g=>g.win('The outpost is torn open. The Brood is ready to wake under Kappa Station.') }
    ])
  ]
};
