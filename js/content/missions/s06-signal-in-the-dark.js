'use strict';
/* Swarm mission 6: Signal in the Dark — High Ground, seen from the hives.
   The Lunar Corps holds the three uplink beacons on the Selene Highlands and sends a call for help. A fleet lands in fifteen minutes.
   A beacon is taken from them like any beacon: Swarm close by and no soldier on it, and its control drains away (see 10-buildings.js).
   Win: hold all three at once (none of them theirs) for HOLD seconds. Lose: the clock runs out, or every nest burns.
   They answer: soldiers from the base go back for a beacon they lost, and fresh soldiers land every few minutes.
   Two old eggs lie between the beacons, and the Seedling may root. */
const SIGNAL_HOLD = 60;
SWARM_MISSIONS.push(
  {
    id:'swarm-signal', side:'swarm', title:'Signal in the Dark', map:'high',
    summary:'Three towers on the highlands scream for help to the sky. Silence them all at once.',
    briefing:[
      'The soft ones found the three old towers on the highlands, and now the towers scream into the sky for more of them. In a quarter of an hour, more will fall out of the sky than we can eat.',
      'A tower stops screaming for them when we stand around it and no soft one stands on it. <b>Hold all three at once</b>, for a minute, and the sky goes quiet.',
      'The towers are far apart. Make teams, give each its own gathering point, and strike where they are not looking. Their base lies in the south: they will run to every tower we take.',
      'Two old eggs sleep between the towers. Wake them, or root a Seedling: the highlands are wide and our two nests are far away.'
    ],
    landingZone:{ tx:44, ty:52, scripted:true },
    oldEggs:[ {x:30,y:25}, {x:58,y:25} ],
    start:{ camera:{x:12,y:34}, rally:{x:12,y:34},
      units:[ ['trooper','1',3], ['gunner','1',1], ['trooper','2',3], ['gunner','2',1], ['trooper','3',3], ['gunner','3',1],
              ['engineer','P',1], ['trooper','P',5], ['pyro','P',1], ['medic','P',1] ],
      buildings:[ ['hq','P'] ],
      uplinks:[ ['1','West ridge'], ['2','East ridge'], ['3','Centre mesa'] ],
      swarmUnits:[ ['crawler','a',5], ['drone','a',4], ['crawler','b',4], ['drone','b',3], ['spitter','b',1] ],
      hives:['a','b'], hiveHp:1.4 },
    swarm:{ biomass:220, rate:1.1, guardMax:2, guardEvery:22, aggro:6, waves:null, cap:40, seedling:true, unlock:{ spitter:0, brute:180, seedling:60 } },
    objectives:[
      { id:'quiet', text:`Hold all three beacons at once for ${SIGNAL_HOLD} s (0/3 ours)` },
      { id:'nest',  text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ swarmBrood();
          for(const b of G.ents.filter(e=>!e.dead&&e.def&&e.def.capture)){ b.cap=1; b.owned=true; }   /* they start with all three */
          for(const k of ['1','2','3']) g.place('sentry',k,2,1);
          for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; }
          g.setTimer(900,'Fleet'); g.vars.hold=0; } },
      { when:g=>g.time>1, do:g=>g.brood_say('Three towers scream at the sky: west, east and the high middle. Stand around one with nobody of theirs on it and it falls quiet.') },
      { when:g=>g.time>4, do:g=>g.say('Cmdr. Varga','All three uplinks are transmitting. The fleet is fifteen minutes out. Keep those beacons in our hands.') },
      { when:g=>g.time>40, do:g=>g.brood_say('They will run to every tower we take. Take one, and while they come, take another.') },
      /* control of the beacons; the hold clock */
      { repeat:true, when:()=>true, do:g=>{ const bs=G.ents.filter(e=>!e.dead&&e.def&&e.def.capture), ours=bs.filter(b=>!b.owned).length;   /* silent while not theirs; a soldier must stand on it 20 s to make it theirs again */
          if(ours===bs.length&&bs.length){ g.vars.hold+=0.25; } else g.vars.hold=0;
          g.setText('quiet',ours===3?`Hold all three beacons at once (${Math.ceil(SIGNAL_HOLD-g.vars.hold)} s to go)`:`Hold all three beacons at once for ${SIGNAL_HOLD} s (${ours}/3 ours)`);
          for(const b of bs){ if(!b.owned&&!b.retakeSent){ b.retakeSent=true; corpsRetake(g,b,4); g.say('Sgt. Kessler',`${b.label} has gone quiet! Team, take it back!`); }
            if(b.owned) b.retakeSent=false; } } },
      /* fresh soldiers by dropship every few minutes, sent to the beacon in the most trouble */
      { repeat:true, when:g=>g.time>(g.vars.dropAt||(g.vars.dropAt=150)), do:g=>{ g.vars.dropAt=g.time+150/(G.corpsDiff?G.corpsDiff.reinforce:1);
          if(!g.has('hq')||g.corps().length>=g.n(22)) return; g.say('Dropship Kestrel','Kestrel inbound to the base with a fire team.'); g.airdrop([['trooper',g.n(3)],['gunner',1]],15); } },
      { when:g=>g.time>420, do:g=>signalRaid(g,4,'Sgt. Kessler','They breed out in the wings. Fire team, burn the nearest nest.') },
      { when:g=>g.time>720, do:g=>signalRaid(g,6,'Cmdr. Varga','Three minutes. Burn whatever they are breeding from.') },
      { when:g=>g.timerLeft()<=120 && g.time>5, do:g=>g.say('Cmdr. Varga','Two minutes to the fleet. Hold the beacons!') },
      { when:g=>g.vars.hold>=SIGNAL_HOLD, do:g=>{ g.complete('quiet'); g.complete('nest'); g.win('The three towers fall silent together. The sky does not answer them. The highlands are ours.'); } },
      { when:g=>g.timerLeft()===0, do:g=>{ g.fail('quiet'); g.lose('The sky answers. Flying things land all over the highlands, more than we can ever eat.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('Every nest on the highlands burns. The towers keep screaming.'); } }
    ]
  }
);
function signalRaid(g,n,who,text){ const p=ptWorld('P'), h=hives().sort((a,b)=>dist(a,p)-dist(b,p))[0]; if(!h) return;
  const team=g.corps().filter(u=>!u.def.builder&&!u.def.heal&&!u.retaking&&!u.downed&&dist(u,p)<14*TILE).slice(0,g.n(n)); if(!team.length) return;
  g.say(who,text); g.orderCorps(team,{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)},'amove'); g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }
