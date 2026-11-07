'use strict';
/* Training (the Swarm): The First Hunger, in Kappa Basin. Every order of the Brood, step by step.
   Hives → hatching → the gathering point → steering a selection → a grazer and the Bloater → soldiers, the fallen, egg and Grafter
   → the Husk → the top bar → burrowing → tearing down an outpost. Press N to skip a step. Brood Tactics (t-swarm-tactics.js) goes on from here.
   Every step has a demo(g,D) for Watch mode (27b-demo.js): what the demo does to show the step. */
/* FIRST_HUNGER: preyEvery = seconds before a new pair of soldiers wanders into the open once the last ones are down · prey = how many come
   · huskMax = no new prey while this many soldiers are turned or turning (bodies on the field, cocoons, Twitchers and Husks):
     fewer only by losing some in a fight
   · swarmMax = no new prey while this many Swarm creatures roam (hive guards and Grafters do not count) */
const FIRST_HUNGER = { preyEvery:12, prey:2, huskMax:4, swarmMax:30 };
const PREY_AT = {x:36,y:24}, GRAZE_AT = {x:16,y:9};
function preyStanding(g){ return (g.vars.prey||[]).some(u=>!u.dead&&!u.downed); }
/* soldiers on their way to becoming Husks, or already Husks */
function turnedCount(){ return G.ents.filter(e=>!e.dead&&((e.kind==='unit'&&e.type==='husk')||(e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna))).length; }
/* the grazer to show in the fauna step: the one nearest the gathering point; if none are left, two wander in */
function grazerTarget(g){ const r=G.swarm.rally||{x:30*TILE,y:9*TILE}; let gz=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.type==='grazer');
  if(!gz.length) gz=spawnAt('grazer','wild',GRAZE_AT,2).map(u=>{ u.home={x:u.x,y:u.y}; return u; });
  return gz.sort((a,b)=>dist(a,r)-dist(b,r))[0]; }
function swarmRoaming(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.role!=='guard'&&!e.def.grafter).length; }
function newPrey(g,talk){ g.vars.prey=(g.vars.prey||[]).filter(u=>!u.dead&&u.downed);   /* keep the ones still bleeding out (the step checks look at the list) */
  const us=g.spawn('trooper',PREY_AT,FIRST_HUNGER.prey); for(const u of us){ u.order={type:'hold'}; u.stance='hold'; g.vars.prey.push(u); }
  g.reveal(PREY_AT,5,8); g.ping(PREY_AT); if(talk) g.brood_say('More of the soft ones wander into the open. Feed.'); return us; }
/* a spot to burrow up: open flat ground away from the Lunar Corps, as close to the gathering point as possible (for the demo) */
function demoBurrowSpot(){ const B=SWARM_PLAY.burrow, r=G.swarm.rally||{x:30*TILE,y:9*TILE}, cx=Math.floor(r.x/TILE), cy=Math.floor(r.y/TILE);
  for(let R=3;R<20;R++) for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==R) continue; const x=cx+dx, y=cy+dy;
    if(!walkableT(x,y)||G.map.height[y*G.map.w+x]!==0) continue; const px=(x+.5)*TILE, py=(y+.5)*TILE;
    if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&Math.hypot(e.x-px,e.y-py)<(B.clear+1)*TILE)) continue;
    if(freeTilesNear(x,y,B.units.length).length<B.units.length) continue; return {x:px,y:py}; }
  return null; }
TRAINING.swarm = {
  id:'training-swarm', side:'swarm', training:true, title:'The First Hunger', map:'kappa',
  summary:'Learn to be the Brood: hatching, gathering, striking, and what the Swarm does with the fallen.', demo:true,
  briefing:[
    'Before the Brood wakes under Kappa Station, learn what it can do. Each step tells you what to do and waits for you; the objective in the bottom left shows where you are.',
    'Press <b>N</b> to skip a step. Nothing here counts for the campaign.'
  ],
  start:{ camera:{x:31,y:9}, rally:{x:30,y:9},
    units:[ ['trooper',{x:36,y:24},2], ['trooper','Q',2] ], hives:['a','b','c'] },
  swarm:{ hatchToBrood:true, manualHaul:true, biomass:120, rate:1.0, guardMax:1, guardEvery:30, aggro:0, waves:null, cap:24, unlock:{ spitter:0, brute:0 } },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{ g.vars.prey=g.corps().filter(u=>Math.hypot(u.x-(36.5*TILE),u.y-(24.5*TILE))<4*TILE); for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; }
        g.place('sentry','Q',3,-2); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-19,a.y-20)-Math.hypot(b.x-19,b.y-20))[0]; g.vars.relaySite={x:s.x,y:s.y}; makeBuilding('relay','corps',s.x,s.y,true);
      } },
    /* a steady supply of prey: once the soldiers in the open are all down, a new pair wanders in after FIRST_HUNGER.preyEvery seconds,
       so the hunt and the fallen can be practised again and again; never while huskMax are turned or turning */
    { repeat:true, when:g=>!!g.vars.prey, do:g=>{
        if(preyStanding(g)){ g.vars.preyAt=null; return; }
        if(g.vars.preyAt==null){ g.vars.preyAt=g.time+FIRST_HUNGER.preyEvery; return; }
        if(g.time<g.vars.preyAt) return;
        if(turnedCount()>=FIRST_HUNGER.huskMax){ g.vars.preyAt=g.time+3; if(!g.vars.saidHusks){ g.vars.saidHusks=true; g.brood_say(`${FIRST_HUNGER.huskMax} of theirs are ours. More soft ones come only when we have spent some in a fight.`); } return; }
        if(swarmRoaming()>=FIRST_HUNGER.swarmMax){ g.vars.preyAt=g.time+3; if(!g.vars.saidFull){ g.vars.saidFull=true; g.brood_say('We are many now. The soft ones keep away until we have spent some of us.'); } return; }
        g.vars.preyAt=null; newPrey(g,true); } },
    ...tutorial([
      { say:'We wake. Learn what the Brood can do. The world keeps moving while a card is open; try things as you read. Close a card with [Enter]; the next one comes once you have done what it asks. What we talk about lights up. ◀ and ▶ page back through earlier tips; Practice again redoes one. The Tips tab at the top brings the card back. [N] skips a step.', obj:'Listen to the Brood', demo:(g,D)=>demoLook(D,ptWorld({x:31,y:9})), hl:['#objectives'], done:g=>g.time>2 },
      { say:'Look around: arrow keys, the edge of the screen, or click the minimap. Our three nests ring the basin.', obj:'Move the camera', demo:(g,D)=>demoLook(D,{x:46.5*TILE,y:31.5*TILE}), hl:['#minimap-wrap'], setup:g=>{ g.vars.cam0={...G.cam}; }, done:tut.camMoved },
      { say:'Click one of our hives. The selected hive is the nest: new brood hatches there.', obj:'Click a hive', demo:(g,D)=>{ const h=nestHive(); if(h){ selectEntities([h],false); demoLook(D,h); demoTap(h); } }, setup:()=>{ centerOn(31*TILE,9*TILE); }, done:()=>G.sel.some(e=>e.type==='hive') },
      { say:'Hatch the brood: [Q] a Crawler, [W] a Drone, [E] a Spitter, [R] a Brute. Each costs biomass (top left). Hatch three.', obj:'Hatch three of the brood (Q W E R)', demo:(g,D)=>{ const h=nestHive(); if(h){ if(!G.sel.includes(h)) selectEntities([h],false); demoLook(D,h); } if(broodUsed()<3) demoHatch(['crawler','drone','crawler'][broodUsed()%3]); }, keys:['Q','W','E','R'], hl:['#topbar .res:first-child'], done:()=>broodUsed()>=3 },
      { keys:['G'], say:'[Right-click] on open ground (with nothing selected) to set the gathering point. New brood waits there. [G] + click does the same.', obj:'Move the gathering point (right-click)', demo:(g,D)=>{ if(D.mem.r) return; D.mem.r=1; selectEntities([],false); const p={x:27.5*TILE,y:13.5*TILE}; setRally(p.x,p.y); demoLook(D,p); demoTap(p); }, setup:g=>{ selectEntities([],false); g.vars.r0={...G.swarm.rally}; },
        done:g=>Math.hypot(G.swarm.rally.x-g.vars.r0.x,G.swarm.rally.y-g.vars.r0.y)>3*TILE },
      { say:'You can also steer them yourself. Drag a box around some of the brood and [Right-click] somewhere: they go there and wait, and the camera follows them.', obj:'Select brood and move it (drag, right-click)', demo:(g,D)=>{ const us=demoBrood(); if(!us.length){ demoHatch('crawler'); return; } if(D.mem.m) return; D.mem.m=1; const p={x:24.5*TILE,y:12.5*TILE}; demoMove(us,p.x,p.y); demoLook(D,p); }, done:()=>G.ents.some(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.post) },
      { keys:['A'], say:'Not everything here is theirs. Grazers, the lunar fauna, wander the basin: soft meat to start on. Press [A] and click next to one (or select brood and [Right-click] it): the brood goes to feed.', obj:'Kill a grazer (A + click)', demo:(g,D)=>{ const gz=(g.vars.gz&&!g.vars.gz.dead)?g.vars.gz:G.ents.find(e=>!e.dead&&e.type==='grazer'); if(!gz) return; demoLook(D,gz);
          if(demoBrood().length<4){ demoHatch('drone'); return; } if(!demoBrood().some(u=>u.target===gz)) demoSend(gz.x,gz.y); }, markLabel:'Grazer',
        setup:g=>{ const gz=grazerTarget(g); g.vars.gz=gz; if(gz){ g.marker('tut',{x:gz.x/TILE-0.5,y:gz.y/TILE-0.5},'Grazer'); g.reveal({x:gz.x/TILE,y:gz.y/TILE},5,12); centerOn(gz.x,gz.y); } },
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&e.fauna)||(e.type==='cocoon'&&e.hatchType==='bloater')||e.type==='bloater')) },
      { keys:['H'], say:'We do not tear a body apart: a whole one is worth more. It stays where it fell until we fetch it. Press [H]: the brood drags the carcass home to the creep of a hive.', obj:'Drag the carcass home (H)', demo:(g,D)=>{ const b=G.ents.find(e=>!e.dead&&e.kind==='body'&&e.fauna&&!e.home); if(!b) return; demoLook(D,b.carrier||b);
          if(demoBrood().length<2){ demoHatch('drone'); return; } if(!b.carrier&&!G.ents.some(e=>!e.dead&&e.claim===b&&e.claimMode==='haul')) demoFetch(b); },
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&e.fauna&&e.home)||(e.type==='cocoon'&&e.hatchType==='bloater')||e.type==='bloater')) },
      { say:'On the creep an egg opens. A Grafter crawls out, latches onto the carcass and remakes it. A grazer becomes a Bloater: slow and swollen with acid, and when it dies it bursts and burns everything around it. Watch.', obj:'Watch the grazer become a Bloater', demo:(g,D)=>{ const c=G.ents.find(e=>!e.dead&&(e.type==='bloater'||(e.type==='cocoon'&&e.hatchType==='bloater')||(e.kind==='body'&&e.fauna))); if(c) demoLook(D,c); },
        done:g=>G.ents.some(e=>!e.dead&&e.type==='bloater')||g.time>g.vars.tutStart+60 },
      { keys:['A'], say:'Now their soldiers. Two soft ones stand in the open. Press [A] and click them: everything waiting (or what you selected) goes to feed.', obj:'Attack the two soldiers (A + click)', demo:(g,D)=>{ const t=(g.vars.prey||[]).find(u=>!u.dead&&!u.downed); demoLook(D,t||ptWorld(PREY_AT)); if(!t) return;
          if(demoBrood().length<8){ demoHatch(['drone','spitter','brute','drone'][demoBrood().length%4]); return; } if(demoBrood().filter(u=>u.target&&u.target.faction==='corps').length<3) demoSend(t.x,t.y); }, mark:PREY_AT, markLabel:'Prey',
        setup:g=>{ if(!preyStanding(g)) newPrey(g,false); g.reveal(PREY_AT,5,10); }, done:g=>g.vars.prey.every(u=>u.dead||u.downed) },
      { keys:['H'], say:'We do not finish the fallen. They bleed out, and the body stays where it fell until we fetch it. Press [H]: the brood carries them home.', obj:'Bring a body home (H)', demo:(g,D)=>{ const b=G.ents.find(e=>!e.dead&&e.kind==='body'&&!e.fauna&&!e.home); const d=(g.vars.prey||[]).find(u=>!u.dead&&u.downed); demoLook(D,b?(b.carrier||b):d||ptWorld(PREY_AT));
          if(demoBrood().length<3){ demoHatch('drone'); return; } if(b&&!b.carrier&&!G.ents.some(e=>!e.dead&&e.claim===b&&e.claimMode==='haul')) demoFetch(b); },
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&!e.fauna&&e.home)||(e.type==='cocoon'&&e.husk)||e.type==='husk')) },
      { say:'The Grafter does the same with a soldier, but what grows out of him is something else. Watch.', obj:'Watch the Grafter turn the body', demo:(g,D)=>{ const c=G.ents.find(e=>!e.dead&&((e.type==='cocoon'&&e.husk)||(e.kind==='body'&&!e.fauna&&e.home)||e.type==='husk')); if(c) demoLook(D,c); },
        done:()=>G.ents.some(e=>!e.dead&&((e.type==='cocoon'&&e.husk)||e.type==='husk')) },
      { say:`The cocoon beats faster and faster. What crawls out is a Twitcher, weak while it turns; it molts once and becomes a Husk, a warrior. It joins the brood at the gathering point and goes where you send it. Soldiers keep wandering into the open, but never while ${FIRST_HUNGER.huskMax} of them are turned or turning: to make room, spend some Husks in a fight.`, obj:'Watch it grow', demo:(g,D)=>{ const c=G.ents.find(e=>!e.dead&&(e.type==='husk'||(e.type==='cocoon'&&e.husk))); if(c) demoLook(D,c); },
        done:g=>G.ents.some(e=>e.type==='husk'&&!e.dead&&e.stage>=1)||g.time>g.vars.tutStart+45 },
      ...topbarSteps('swarm'),
      { keys:['B'], say:'Press [B] and click open ground, away from their eyes: a small brood digs up out of the rock. (For this step the brood limit stretches, so there is always room.)', obj:'Burrow up a brood (B + click)', demo:(g,D)=>{ if(D.mem.b) return; const p=demoBurrowSpot(); if(!p) return; demoLook(D,p); if(D.t<3) return; D.mem.b=1; demoTap(p); burrowAt(p.x,p.y); },
        setup:g=>{ const B=SWARM_PLAY.burrow; if(G.swarm.biomass<B.cost) g.biomass(B.cost-G.swarm.biomass+15);
          const short=broodUsed()+B.units.length-broodCap(); if(short>0) G.swarm.capExtra=(G.swarm.capExtra||0)+short;   /* room for one burrow, even at the limit */
          if(!burrowReady()) G.swarm.burrowAt=G.time-B.cooldown; g.vars.b0=G.swarm.burrowAt; },
        done:g=>G.swarm.burrowAt>g.vars.b0 },
      { say:'Their outpost hums at the centre: a tower and a gun that turns by itself, two of them on guard. Grow the brood and tear both down. Every soldier we kill feeds us.', obj:'Destroy the Relay Tower and the Sentry Gun', demo:(g,D)=>{ const t=tut.built('sentry')[0]||tut.built('relay')[0]; if(!t) return; demoLook(D,t);
          const us=demoBrood(); if(us.length<14){ for(let k=0;k<3;k++) demoHatch(['brute','spitter','brute','drone'][(us.length+k)%4]); if(us.length<8) return; } if(us.filter(u=>u.target||u.role==='wave').length<us.length*0.6) demoSend(t.x,t.y,us); }, mark:'Q', markLabel:'Outpost',
        setup:g=>{ g.biomass(200); let rebuilt=false;   /* torn down before this step? Then they have built it up again, so there is something to practise on */
          if(!tut.built('relay').length&&g.vars.relaySite){ makeBuilding('relay','corps',g.vars.relaySite.x,g.vars.relaySite.y,true); rebuilt=true; }
          if(!tut.built('sentry').length){ g.place('sentry','Q',3,-2); rebuilt=true; }
          if(rebuilt){ if(!g.near('corps','Q',6)) for(const u of g.spawn('trooper','Q',2)){ u.order={type:'hold'}; u.stance='hold'; }
            g.ping('Q'); g.brood_say('They have raised their outpost again. Tear it down once more.'); } }, done:()=>tut.built('relay').length===0&&tut.built('sentry').length===0, after:g=>g.win('The outpost is torn open. The Brood is ready to wake under Kappa Station.') }
    ])
  ]
};
