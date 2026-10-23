'use strict';
/* Mission 3: Burn the Brood
   Three old mine shafts in the ridges (west, north, east): once the hives are ash, the waves and the last surge climb up out of these. */
/* the last surge comes up out of a shaft no soldier stands near (else any shaft); a save from before the shafts existed uses the old points on the plain */
function broodShaftSurge(g){ const all=shafts();
  if(!all.length){ const at=pick(['1','2','3']); g.spawn('drone',at,3); g.spawn('spitter',at,1); if(g.time%40<20) g.spawn('brute',at,1); return; }
  const corps=G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.kind==='unit'), ok=all.filter(s=>!corps.some(c=>dist(c,s)<6*TILE)), sh=pick(ok.length?ok:all);
  const at={x:Math.floor(sh.x/TILE),y:Math.floor(sh.y/TILE)};
  g.spawn('drone',at,3); g.spawn('spitter',at,1); if(g.time%40<20) g.spawn('brute',at,1);
  for(let j=0;j<8;j++) G.fx.push({k:'ember',x:sh.x+rand(-14,14),y:sh.y+rand(-6,8),vx:rand(-40,40),vy:rand(-90,-30),t:0.8,max:0.8,col:pick(['#8a7a6a','#a6ff4a'])});
  g.ping(at); SFX.play('hatch',sh.x,sh.y); }
MISSIONS.push(
  {
    id:'burn-the-brood', title:'Burn the Brood', map:'maw',
    summary:'Take the fight to Tycho Maw and destroy five hives.',
    briefing:[
      'Every nest in the southern region feeds from Tycho Maw. Orbital scans count five hives.',
      'You have a full company and a Command Post. The relay pads across the plain will fund the push. Pyros are your best tool against hive tissue. The landing pad beside the Command Post brings in replacements for anyone you lose, up to the 14 you start with.',
      'The ridges round the plain are full of old mine shafts. Once the hives are gone, expect the brood to come up out of them.',
      'Burn them all.'
    ],
    start:{ salvage:350, camera:'P',
      units:[ ['engineer','P',2], ['trooper','P',6], ['gunner','P',2], ['pyro','P',2], ['medic','P',2] ],
      buildings:[ ['hq','P'] ], hiveHp:1.6,
      /* per hive: c is the big nest with spitters among its guards; e is tougher and angrier */
      hives:[ 'a', 'b', { at:'c', guardMax:8, guards:['drone','drone','spitter'], aggro:10 }, 'd', { at:'e', hp:2.4, rage:1.4 } ],
      shafts:[ {x:2,y:21,wall:'w'}, {x:36,y:3,wall:'n'}, {x:69,y:18,wall:'e'} ] },   // old mine shafts in the west, north and east ridges: with the hives gone, the Swarm comes up out of these
    limits:{ sentry:5 },
    landingZone:{ tx:40, ty:41, max:14, delay:25 },   // pad east of the Command Post: order replacements, never more than the 14 you start with
    swarm:{ biomass:80, rate:0.5, guardMax:6, guardEvery:12, aggro:8, aggroBrood:55, waves:{ first:140, every:85, budget:80, growth:32 } },
    objectives:[
      { id:'hives', text:'Destroy all hives (0/5)' },
      { id:'hq',    text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>1,  do:g=>{ g.say('Cmdr. Varga','Welcome to Tycho Maw. Five hives. I want every one of them ash.'); G.shaftWarned=true; } },   /* (our own line about the shafts, below) */
      { when:g=>g.time>10, do:g=>g.say('Sgt. Kessler','Grab the relay pads near the base first. Pyros make short work of hive tissue. Lose anyone, and the landing pad east of the Command Post flies in a replacement.') },
      { repeat:true, when:()=>true, do:g=>{ g.setText('hives',`Destroy all hives (${g.stat('hives')}/${g.stat('hives')+g.hives()})`); } },
      { when:g=>g.hives()<=2, do:g=>{ g.say('Cmdr. Varga','The brood knows it is dying. Massive wave forming. Brace!'); g.wave(240); } },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.complete('hives'); g.vars.final=true;
          g.say('Cmdr. Varga','The hives are down, but the ground is shaking. They are coming up the old mine shafts, west, north and east, and all of it is heading for the Command Post. Hold for two minutes!');
          for(const sh of shafts()){ const at={x:Math.floor(sh.x/TILE),y:Math.floor(sh.y/TILE)}; g.reveal(at,3,8); g.ping(at); }
          g.addObjective('final','Hold the Command Post for two minutes'); g.setTimer(120,'Hold'); g.vars.surgeT=g.time; } },
      { repeat:true, when:g=>g.vars.final && g.timerLeft()>0 && g.time>=g.vars.surgeT, do:g=>{ g.vars.surgeT=g.time+20; broodShaftSurge(g); } },   // the last surge climbs out of the mine shafts
      { when:g=>g.vars.final && g.timerLeft()===0, do:g=>{ g.complete('final'); g.complete('hq'); g.win('Tycho Maw is silent. The brood is broken.'); } }
    ]
  }
);
