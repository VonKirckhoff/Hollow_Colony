'use strict';
/* Swarm mission 4: Lights Out — Blackout, seen from the hives.
   The Lunar Corps has lit Mare Colony again: four generators in the corners, a Command Post in the square below.
   Light hurts the Brood (mission.lightBlind: slow and clumsy in a lit street, see 26b-swarm-missions.js), and in the dark it sees less.
   A generator bitten to pieces goes dead; an Engineer with an escort comes out to restart it (lure them).
   The grid also shields the Command Post: as long as any of the four runs, it cannot be harmed.
   Win: tear down the Command Post. Lose: every nest burnt. */
SWARM_MISSIONS.push(
  {
    id:'swarm-lights', side:'swarm', title:'Lights Out', map:'mare',
    summary:'They lit the dead town again, and the light burns. Put it out, one street at a time.',
    briefing:[
      'The soft ones came back to the town of streets and woke its four humming machines. Now the town is bright, and the light burns our eyes: in it we are slow and clumsy.',
      'Their hard nest sits in the square below, and the machines shield it. As long as one of them hums, nothing can break it.',
      'Bite a machine until it dies. Their menders will come out to wake it again: that is when they are soft. <b>Put all four out at once</b>, then <b>tear down their nest</b>.',
      'Our three nests lie in the dark: north, west and east. Keep at least one alive.'
    ],
    dark:{ sight:0.55 }, lightBlind:true,
    landingZone:{ tx:44, ty:44, scripted:true },
    start:{ camera:{x:39,y:9}, rally:{x:39,y:10},
      units:[ ['engineer','P',3], ['trooper','P',4], ['gunner','P',1], ['pyro','P',1], ['medic','P',1],
              ['trooper','1',2], ['trooper','2',2], ['trooper','3',2], ['trooper','4',2] ],
      buildings:[ ['hq','P'], ['generator','1'], ['generator','2'], ['generator','3'], ['generator','4'] ],
      swarmUnits:[ ['crawler','a',4], ['drone','a',3], ['crawler','b',2], ['drone','c',2] ],
      hives:['a','b','c'], hiveHp:1.4 },
    swarm:{ biomass:200, rate:1.0, guardMax:2, guardEvery:22, aggro:6, waves:null, cap:36, seedling:true, unlock:{ spitter:0, brute:300, seedling:120 } },
    objectives:[
      { id:'dark', text:'Put out all four generators at once (0/4 dark)' },
      { id:'hq',   text:'Tear down their Command Post (shielded while any generator runs)' },
      { id:'nest', text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{
          const names={ '1':'North-west generator', '2':'North-east generator', '3':'South-west generator', '4':'South-east generator' };
          for(const k of ['1','2','3','4']){ const gen=g.generatorAt(k); if(gen){ gen.label=names[k]; gen.powered=true; gen.hp=gen.maxHp; } }
          const cg=makeBuilding('generator','corps',34,44,true); cg.label='Camp generator'; cg.camp=true; cg.powered=true; cg.hp=cg.maxHp;
          g.place('sentry','P',-3,-3); g.place('sentry','P',4,-3);
          for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; }
          swarmBrood(); g.vars.hq=G.ents.find(e=>e.type==='hq'); } },
      { when:g=>g.time>1, do:g=>g.brood_say('The town hums and glows. Their machines stand in the four corners. In the dark we are many; in the light we are slow. Bite the light out.') },
      { when:g=>g.time>4, do:g=>g.say('Cmdr. Varga','Grid is up, all four generators. Keep them running, Dust. The light keeps the Brood off the streets.') },
      { when:g=>g.time>30, do:g=>g.brood_say('When a machine dies, a mender walks out to wake it, with a few to guard him. Wait for him in the dark.') },
      /* the grid shields the Command Post; Engineers restart dead generators */
      { repeat:true, when:g=>g.time>0.3, do:g=>{ const gens=['1','2','3','4'].map(k=>g.generatorAt(k)).filter(Boolean), dark=gens.filter(e=>!e.powered).length, hq=g.vars.hq;
          g.setText('dark',`Put out all four generators at once (${dark}/4 dark)`); if(dark===4&&!g.vars.allDark){ g.vars.allDark=true; g.complete('dark');
            g.brood_say('All four are dead. Their nest stands in the dark with nothing to hide behind. Now!'); g.say('Sgt. Kessler','The grid is down! The Command Post shield is gone!'); }
          if(hq&&!hq.dead){ hq.invuln=dark<4; G.rings=hq.invuln?[{x:hq.x,y:hq.y,r:3.2*TILE,col:'#ffd23f',label:'SHIELDED BY THE GRID'}]:[]; }
          if(g.time>(g.vars.mendAt||0)){ g.vars.mendAt=g.time+3; corpsMendGenerators(g,2); } } },
      /* replacements by dropship, while the Command Post stands */
      { repeat:true, when:g=>g.time>(g.vars.dropAt||(g.vars.dropAt=150)), do:g=>{ g.vars.dropAt=g.time+150/(G.corpsDiff?G.corpsDiff.reinforce:1);
          if(!g.has('hq')||g.corps().length>=g.n(18)) return; g.say('Cmdr. Varga','Kestrel inbound with an Engineer and rifles. Keep the lights on.'); g.airdrop([['engineer',1],['trooper',g.n(2)]],15); } },
      /* two raids on the nearest nest */
      { when:g=>g.time>300, do:g=>mareRaid(g,4,'Sgt. Kessler','Something keeps killing our lights. Fire team, burn the nearest nest.') },
      { when:g=>g.time>600, do:g=>mareRaid(g,6,'Cmdr. Varga','They are breeding in the dark corners. Take a team and burn one out.') },
      { when:g=>g.time>1 && g.vars.hq && g.vars.hq.dead, do:g=>{ g.complete('hq'); g.complete('nest'); g.win('Their hard nest splits open in the dark square. The town is ours again, and it is black.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('The last nest burns under their lamps. The light has won.'); } }
    ]
  }
);
/* a fire team from the square goes to burn the nest nearest to the Command Post */
function mareRaid(g,n,who,text){ const p=ptWorld('P'), h=hives().sort((a,b)=>dist(a,p)-dist(b,p))[0]; if(!h) return;
  const team=g.corps().filter(u=>!u.def.builder&&!u.def.heal&&!u.guarding&&!u.downed).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,g.n(n)); if(!team.length) return;
  g.say(who,text); g.orderCorps(team,{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)},'amove'); g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }
