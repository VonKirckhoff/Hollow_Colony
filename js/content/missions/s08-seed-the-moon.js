'use strict';
/* Swarm mission 8: Seed the Moon — Tycho Maw, seen from the hives.
   The Matron lives. Now the Brood must spread across the crater before the Lunar Corps sterilises it from orbit.
   From SEED_RAIN.first seconds on, a strike from orbit falls every SEED_RAIN.every seconds: a red circle and a SCORCH countdown
   (scorchAt in 26b-brood-missions.js), mostly on a nest (the one hit longest ago), sometimes on the thickest part of the brood.
   Grow new nests from Seedlings (up to SEED_RAIN.seeds of them) and from the three old eggs on the crater floor.
   Their camp in the south sends fire teams for the nest nearest to it.
   Win: SEED_RAIN.goal nests alive when the clock runs out. Lose: every nest burnt. */
const SEED_RAIN = { first:90, every:70, r:3, goal:6, seeds:5 };
SWARM_MISSIONS.push(
  {
    id:'swarm-seed', side:'swarm', title:'Seed the Moon', map:'maw',
    summary:'Fire falls from the sky. Spread over the crater faster than it can burn us.',
    briefing:[
      'The Matron lives, and the soft ones know they cannot reach her. So they will burn the crater from the sky instead: every nest, every egg, everything.',
      'Fire falls in a red circle. You see it coming: the circle counts down before it burns. Nests cannot run. Brood can.',
      `We must be in more places than they can burn. Root Seedlings, wake the old eggs in the crater, and have <b>${SEED_RAIN.goal} nests alive</b> when the fire stops.`,
      'Their camp lies in the south of the crater. They will send hunters for the nests nearest to it.'
    ],
    oldEggs:[ {x:7,y:28}, {x:64,y:28}, {x:36,y:22} ],
    start:{ camera:{x:36,y:8}, rally:{x:36,y:10},
      units:[ ['engineer','P',1], ['trooper','P',5], ['gunner','P',1], ['pyro','P',1], ['medic','P',1] ],
      buildings:[ ['hq','P'] ],
      swarmUnits:[ ['crawler','a',3], ['drone','a',3], ['crawler','b',4], ['drone','b',3], ['seedling','b',1], ['crawler','c',3], ['drone','c',3] ],
      hives:['a','b','c'], hiveHp:1.4 },
    swarm:{ biomass:240, rate:1.2, guardMax:2, guardEvery:22, aggro:6, waves:null, cap:42, seedling:true, seedMax:SEED_RAIN.seeds, unlock:{ spitter:0, brute:240, seedling:0 } },
    objectives:[
      { id:'nests', text:`Have ${SEED_RAIN.goal} nests alive when the fire stops (3/${SEED_RAIN.goal})` },
      { id:'nest',  text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ swarmBrood(); g.place('sentry','P',-3,-2); g.place('sentry','P',4,-2);
          for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; }
          g.setTimer(900,'Fire stops'); g.vars.rainAt=SEED_RAIN.first; } },
      { when:g=>g.time>1, do:g=>g.brood_say('The Matron lives. Now they want to burn the whole crater. Spread out: root Seedlings, wake the old eggs. Be everywhere.') },
      { when:g=>g.time>5, do:g=>g.say('Cmdr. Varga','Orbital sterilisation is cleared. Strikes on every nest in Tycho Maw, starting in ninety seconds.') },
      { when:g=>g.time>40, do:g=>g.brood_say('Three old eggs lie in the crater: west, east and in the middle. Stand by one and it wakes into a nest.') },
      { when:g=>g.time>SEED_RAIN.first-12, do:g=>g.brood_say('Fire from the sky soon. When the red circle appears, run out of it. A nest cannot run: have more of them.') },
      /* the strikes from orbit */
      { repeat:true, when:g=>g.time>g.vars.rainAt && g.timerLeft()>0, do:g=>{ g.vars.rainAt=g.time+SEED_RAIN.every/(G.corpsDiff?G.corpsDiff.reinforce:1); g.vars.strikes=(g.vars.strikes||0)+1;
          const hs=hives(), t=(g.vars.strikes%3===0||!hs.length)?seedCluster():hs.sort((a,b)=>(a.lastStrike||0)-(b.lastStrike||0))[0]; if(!t) return;
          t.lastStrike=G.time; scorchAt(t.x,t.y,SEED_RAIN.r*TILE); if(g.vars.strikes===1) g.say('Orbital Control','Strike one inbound. Fifteen seconds.'); } },
      /* their camp sends fire teams for the nest nearest to it, and gets fresh soldiers */
      { repeat:true, when:g=>g.time>(g.vars.teamAt||(g.vars.teamAt=150)), do:g=>{ g.vars.teamAt=g.time+150/(G.corpsDiff?G.corpsDiff.reinforce:1);
          if(!g.has('hq')||g.corps().length>=g.n(22)) return; g.spawn('trooper','P',g.n(3),{faction:'corps'}); g.spawn('pyro','P',1,{faction:'corps'}); } },
      { when:g=>g.time>300, do:g=>mawRaid(g,4,'Sgt. Kessler','Something is nesting close to camp. Fire team, burn it.') },
      { when:g=>g.time>540, do:g=>mawRaid(g,6,'Sgt. Kessler','They keep coming up out of the ground. Burn the nearest nest.') },
      { when:g=>g.time>780, do:g=>mawRaid(g,8,'Cmdr. Varga','Last push before the final strikes. Burn everything near the camp.') },
      { repeat:true, when:()=>true, do:g=>{ const n=g.hives(); g.setText('nests',`Have ${SEED_RAIN.goal} nests alive when the fire stops (${n}/${SEED_RAIN.goal})`);
          if(n>=SEED_RAIN.goal&&!g.vars.goalSaid){ g.vars.goalSaid=true; g.brood_say(`${SEED_RAIN.goal} nests. Hold them until the fire stops.`); } } },
      { when:g=>g.timerLeft()<=120 && g.time>5, do:g=>g.say('Orbital Control','Two minutes of strike window left.') },
      { when:g=>g.timerLeft()===0, do:g=>{ G.scorch=[]; if(g.hives()>=SEED_RAIN.goal){ g.complete('nests'); g.complete('nest');
            g.win('The fire stops. Across the whole crater, nests breathe in the dark. The Brood has taken root on the moon.'); }
          else { g.fail('nests'); g.lose('The fire stops, but too few of us are left. The soft ones will dig out the rest.'); } } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('The last nest burns under the fire from the sky.'); } }
    ]
  }
);
/* the thickest part of the brood: the swarm unit with the most others round it */
function seedCluster(){ const us=G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&!e.def.boss); return us.length?bossCluster(us):null; }
function mawRaid(g,n,who,text){ const p=ptWorld('P'), h=hives().sort((a,b)=>dist(a,p)-dist(b,p))[0]; if(!h) return;
  const team=g.corps().filter(u=>!u.def.builder&&!u.def.heal&&!u.downed).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,g.n(n)); if(!team.length) return;
  g.say(who,text); g.orderCorps(team,{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)},'amove'); g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }
