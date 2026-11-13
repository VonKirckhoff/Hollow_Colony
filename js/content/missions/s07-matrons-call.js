'use strict';
/* Swarm mission 7: The Matron's Call (until Nov 2026 Mother's Call; the id stayed 'swarm-mother') — Matron, seen from the hives.
   The Matron lies wounded in her lair under Tycho Maw. The Lunar Corps has dug in at the cave mouth and sends fire teams
   with Pyros down the tunnels, one every MOTHER_RAID.every seconds, bigger each time, to burn the egg chambers.
   Her lair is sealed by living membrane fed by the three chambers: while one lives, the wall holds. When all three burn, it opens.
   She is not yours to steer (the boss AI keeps her), but she heals when she eats, and she defends herself.
   Win: keep her alive until the clock runs out. Lose: she dies. */
const MOTHER_RAID = { first:60, every:90, hp:0.45 };
SWARM_MISSIONS.push(
  {
    id:'swarm-mother', side:'swarm', title:"The Matron's Call", map:'depths',
    summary:'The Matron is hurt and the soft ones are coming down the tunnels. Keep her alive.',
    briefing:[
      'The Matron is hurt. The soft ones burned her deep, and she lies in her chamber under the Maw, too weak to rise. She calls, and every one of us hears it.',
      'Their camp sits at the cave mouth in the south-west. From there they send hunters down the tunnels, with fire, again and again, each time more of them.',
      'Three egg chambers feed the living wall in front of her lair. As long as one of them lives, the wall holds and nothing reaches her. <b>Keep her alive</b> until the soft ones give up.',
      'She heals when she eats. If they reach her, give her something soft to eat.'
    ],
    start:{ camera:{x:46,y:30}, rally:{x:46,y:30},
      units:[ ['engineer','P',1], ['trooper','P',4], ['gunner','P',1], ['pyro','P',1], ['medic','P',1] ],
      buildings:[ ['hq','P'] ],
      swarmUnits:[ ['crawler','a',4], ['drone','a',3], ['crawler','b',5], ['drone','b',3], ['spitter','b',2], ['crawler','c',4], ['drone','c',3], ['brute','c',1] ],
      hives:['a','b','c'], hiveHp:1.6 },
    swarm:{ biomass:260, rate:1.2, guardMax:2, guardEvery:20, aggro:6, waves:null, cap:40, unlock:{ spitter:0, brute:0 } },
    objectives:[
      { id:'mother', text:'Keep the Matron alive (12:00)' },
      { id:'wall',   text:'Keep the living wall standing: guard the three egg chambers (3/3)' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ swarmBrood();
          g.wall('8',2.3,'lair');
          const m=g.vars.mother=g.spawn('broodmother','9',1,{order:'boss'})[0]; m.hp=m.maxHp*MOTHER_RAID.hp; g.boss(m,'The Matron');
          g.place('sentry','P',3,-2); g.place('sentry','P',4,1);
          for(const u of g.corps()){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; }
          for(const k of ['a','b','c']) g.marker('ch'+k,k,'Egg chamber');
          g.setTimer(720,'Retreat'); g.vars.raidAt=MOTHER_RAID.first; g.vars.raids=0; } },
      { when:g=>g.time>1, do:g=>g.brood_say('The Matron calls. She is hurt, and the soft ones smell it. They are coming down the tunnels from the cave mouth.') },
      { when:g=>g.time>5, do:g=>g.say('Cmdr. Varga','She is wounded and she is cornered. Fire teams, one after the other. Burn the chambers, then finish her.') },
      { when:g=>g.time>20, do:g=>g.brood_say('Three egg chambers feed the wall before her lair. If all three burn, the wall falls and she lies open.') },
      /* fire teams from the cave mouth, bigger each time, towards the nearest chamber (or her, once they are gone) */
      { repeat:true, when:g=>g.time>g.vars.raidAt && g.has('hq'), do:g=>{ g.vars.raidAt=g.time+MOTHER_RAID.every/(G.corpsDiff?G.corpsDiff.reinforce:1); const r=++g.vars.raids;
          if(g.corps().length>=g.n(26)) return;
          const team=[...g.spawn('trooper','P',g.n(2+Math.min(4,r)),{faction:'corps'}), ...g.spawn('pyro','P',r>=4?2:1,{faction:'corps'})];
          if(r>=2) team.push(...g.spawn('gunner','P',1,{faction:'corps'})); if(r>=5) team.push(...g.spawn('medic','P',1,{faction:'corps'}));
          motherRaid(g,team); g.say('Sgt. Kessler',r===1?'First team going down. Pyro up front.':`Team ${r} going down. Find a chamber and burn it.`); } },
      /* the wall: fed by the chambers */
      { repeat:true, when:()=>true, do:g=>{ const n=['a','b','c'].filter(k=>g.hiveAt(k)).length; for(const k of ['a','b','c']) if(!g.hiveAt(k)) g.unmark('ch'+k);
          g.setText('wall',`Keep the living wall standing: guard the three egg chambers (${n}/3)`);
          const m=g.vars.mother; if(m&&!m.dead) g.setText('mother',`Keep the Matron alive (${fmtClock(g.timerLeft())}, ${Math.round(100*m.hp/m.maxHp)}% health)`);
          if(n<(g.vars.chambers??3)){ g.vars.chambers=n; if(n>0) g.brood_say(n===2?'A chamber burns. The wall thins. Two still feed it.':'Another chamber burns. One alone feeds the wall now. Guard it!'); }
          if(n===0&&!g.vars.open){ g.vars.open=true; g.fail('wall'); g.openWall('lair'); g.brood_say('The wall rots away. Nothing stands between them and the Matron. To her, all of you!');
            g.say('Cmdr. Varga','The membrane is down! Everyone into the lair!'); for(const u of g.corps()) if(!u.def.builder&&!u.def.heal){ u.retaking=null; } g.orderCorps(g.corps().filter(u=>!u.def.builder),'9','amove'); } } },
      { when:g=>g.vars.mother && g.vars.mother.awake, do:g=>g.brood_say('She is awake and she is fighting. Throw yourselves between her and their fire.') },
      { when:g=>g.timerLeft()<=180 && g.time>5, do:g=>g.say('Cmdr. Varga','Three minutes, then we pull out. Whatever you have left, send it now.') },
      { when:g=>g.timerLeft()===0 && g.vars.mother && !g.vars.mother.dead, do:g=>{ g.complete('mother'); if(!g.vars.open) g.complete('wall');
          g.win('The soft ones pull back out of the Maw. In the dark, the Matron breathes, and lays the first new eggs.'); } },
      { when:g=>g.vars.mother && g.vars.mother.dead, do:g=>{ g.fail('mother'); g.lose('The Matron is dead. Her call falls silent, and every one of us hears that, too.'); } }
    ]
  }
);
function fmtClock(s){ if(!isFinite(s)) return '--:--'; s=Math.ceil(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
/* a fire team goes for the chamber nearest the cave mouth that still lives, or for her lair once they are all gone */
function motherRaid(g,team){ const p=ptWorld('P'), h=hives().sort((a,b)=>dist(a,p)-dist(b,p))[0];
  const at=h?{x:Math.floor(h.x/TILE),y:Math.floor(h.y/TILE)}:'9'; g.orderCorps(team,at,'amove');
  const w=h||ptWorld('9'); G.pings.push({x:w.x,y:w.y,t:0,col:'#ff5a4f'}); g.brood_say(h?'Fire is coming down the tunnels, for a chamber. Meet it.':'Fire is coming for the Matron herself!'); }
