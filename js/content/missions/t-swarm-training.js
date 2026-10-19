'use strict';
/* Training (the Swarm): The First Hunger, in Kappa Basin. Every order of the Brood, step by step.
   Hives → hatching → the gathering point → steering a selection → attacking → bringing the fallen home → egg and Grafter
   → the Husk → tactics → burrowing → tearing down an outpost. Press N to skip a step. */
TRAINING.swarm = {
  id:'training-swarm', side:'swarm', training:true, title:'The First Hunger', map:'kappa',
  summary:'Learn to be the Brood: hatching, gathering, striking, and what the Swarm does with the fallen.',
  briefing:[
    'Before the Brood wakes under Kappa Station, learn what it can do. Each step tells you what to do and waits for you; the objective in the bottom left shows where you are.',
    'Press <b>N</b> to skip a step. Nothing here counts for the campaign.'
  ],
  start:{ camera:{x:31,y:9}, rally:{x:30,y:9},
    units:[ ['trooper',{x:36,y:24},2], ['trooper','Q',2] ], hives:['a','b','c'] },
  swarm:{ biomass:120, rate:1.0, guardMax:1, guardEvery:30, aggro:0, waves:null, cap:24, unlock:{ spitter:0, brute:0 } },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{ g.vars.prey=g.corps().filter(u=>Math.hypot(u.x-(36.5*TILE),u.y-(24.5*TILE))<4*TILE); for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; }
        g.place('sentry','Q',3,-2); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-19,a.y-20)-Math.hypot(b.x-19,b.y-20))[0]; makeBuilding('relay','corps',s.x,s.y,true); } },
    ...tutorial([
      { say:'We wake. Learn what the Brood can do. Each step waits for you; press N to skip one.', obj:'Listen to the Brood', done:g=>g.time>5 },
      { say:'Look around: arrow keys, the edge of the screen, or click the minimap. Our three nests ring the basin.', obj:'Move the camera', setup:g=>{ g.vars.cam0={...G.cam}; }, done:tut.camMoved },
      { say:'Click one of our hives. The selected hive is the nest: new brood hatches there.', obj:'Click a hive', setup:()=>{ centerOn(31*TILE,9*TILE); }, done:()=>G.sel.some(e=>e.type==='hive') },
      { say:'Hatch the brood: Q a Crawler, W a Drone, E a Spitter, R a Brute. Each costs biomass. Hatch three.', obj:'Hatch three of the brood (Q W E R)', done:()=>broodUsed()>=3 },
      { say:'Right-click on open ground (with nothing selected) to set the gathering point. New brood waits there.', obj:'Move the gathering point (right-click)', setup:g=>{ selectEntities([],false); g.vars.r0={...G.swarm.rally}; },
        done:g=>Math.hypot(G.swarm.rally.x-g.vars.r0.x,G.swarm.rally.y-g.vars.r0.y)>3*TILE },
      { say:'You can also steer them yourself. Drag a box around some of the brood and right-click somewhere: they go there and wait.', obj:'Select brood and move it (drag, right-click)', done:()=>G.ents.some(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.post) },
      { say:'Two soft ones stand in the open. Press A and click them: everything waiting (or what you selected) goes to feed.', obj:'Attack the two soldiers (A + click)', mark:{x:36,y:24}, markLabel:'Prey',
        setup:g=>{ g.reveal({x:36,y:24},5,10); }, done:g=>g.vars.prey.every(u=>u.dead||u.downed) },
      { say:'We do not finish the fallen: a whole body is worth more. They bleed out. Then press H: the brood carries them home to the creep of a hive.', obj:'Bring a body home (H)', done:()=>(G.stats.fed||0)>=1 },
      { say:'On the creep an egg opens. A Grafter crawls out, latches onto the body and infects it. Watch.', obj:'Watch the Grafter turn the body', done:()=>G.stats.cocoons>=1 },
      { say:'The cocoon beats faster and faster. What crawls out grows: Twitcher, Shambler, Husk. The Shambler hides to finish turning; the Husk roots into a new hive.', obj:'Watch it grow', done:g=>G.ents.some(e=>e.type==='husk'&&!e.dead&&e.stage>=1)||g.time>g.vars.tutStart+45 },
      { say:'How the brood attacks: press T to change the tactic. Direct goes straight in, Lure sends bait first, Flank swings half round the side. Pick Flank.', obj:'Change the tactic to Flank (T)', done:()=>G.swarm.tactic==='flank' },
      { say:'Press B and click open ground, away from their eyes: a small brood digs up out of the rock.', obj:'Burrow up a brood (B + click)', setup:g=>{ g.biomass(60); }, done:()=>G.swarm.burrowAt>0 },
      { say:'Their outpost hums at the centre: a tower and a gun that turns by itself. Grow the brood and tear both down. Every soldier we kill feeds us.', obj:'Destroy the Relay Tower and the Sentry Gun', mark:'Q', markLabel:'Outpost',
        setup:g=>{ g.biomass(200); }, done:()=>tut.built('relay').length===0&&tut.built('sentry').length===0, after:g=>g.win('The outpost is torn open. The Brood is ready to wake under Kappa Station.') }
    ])
  ]
};
