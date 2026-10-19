'use strict';
/* Mission 3: Burn the Brood */
MISSIONS.push(
  {
    id:'burn-the-brood', title:'Burn the Brood', map:'maw',
    summary:'Take the fight to Tycho Maw and destroy five hives.',
    briefing:[
      'Every nest in the southern region feeds from Tycho Maw. Orbital scans count five hives.',
      'You have a full company and a Command Post. The relay pads across the plain will fund the push. Pyros are your best tool against hive tissue.',
      'Burn them all.'
    ],
    start:{ salvage:350, camera:'P',
      units:[ ['engineer','P',2], ['trooper','P',6], ['gunner','P',2], ['pyro','P',2], ['medic','P',2] ],
      buildings:[ ['hq','P'] ], hiveHp:1.6,
      /* per hive: c is the big nest with spitters among its guards; e is tougher and angrier */
      hives:[ 'a', 'b', { at:'c', guardMax:8, guards:['drone','drone','spitter'], aggro:10 }, 'd', { at:'e', hp:2.4, rage:1.4 } ] },
    limits:{ sentry:5 },
    swarm:{ biomass:80, rate:0.5, guardMax:6, guardEvery:12, aggro:8, aggroBrood:55, waves:{ first:140, every:85, budget:80, growth:32 } },
    objectives:[
      { id:'hives', text:'Destroy all hives (0/5)' },
      { id:'hq',    text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Welcome to Tycho Maw. Five hives. I want every one of them ash.') },
      { when:g=>g.time>10, do:g=>g.say('Sgt. Kessler','Grab the relay pads near the base first. Pyros make short work of hive tissue.') },
      { repeat:true, when:()=>true, do:g=>{ g.setText('hives',`Destroy all hives (${5-g.hives()}/5)`); } },
      { when:g=>g.hives()<=2, do:g=>{ g.say('Cmdr. Varga','The brood knows it is dying. Massive wave forming. Brace!'); g.wave(240); } },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.complete('hives'); g.vars.final=true;
          g.say('Cmdr. Varga','The hives are down, but the ground is shaking. Everything still alive out there is heading for the Command Post. Hold for two minutes!');
          g.addObjective('final','Hold the Command Post for two minutes'); g.setTimer(120,'Hold'); g.vars.surgeT=g.time; } },
      { repeat:true, when:g=>g.vars.final && g.timerLeft()>0 && g.time>=g.vars.surgeT, do:g=>{ g.vars.surgeT=g.time+20; const at=pick(['1','2','3']);
          g.spawn('drone',at,3); g.spawn('spitter',at,1); if(g.time%40<20) g.spawn('brute',at,1); } },
      { when:g=>g.vars.final && g.timerLeft()===0, do:g=>{ g.complete('final'); g.complete('hq'); g.win('Tycho Maw is silent. The brood is broken.'); } }
    ]
  }
);
