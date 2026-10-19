'use strict';
/* Swarm mission 2: Kappa Siege — Hold Kappa, seen from the hives.
   The Lunar Corps digs in around a Command Post with sentries and two relay towers, trains new soldiers every minute,
   and twice sends a squad to burn a hive. A convoy arrives in fifteen minutes: destroy the Command Post before it does. */
SWARM_MISSIONS.push(
  {
    id:'swarm-siege', side:'swarm', title:'Kappa Siege', map:'kappa',
    summary:'They built a nest of steel in our basin. Tear it open before more of them arrive.',
    briefing:[
      'They came back. In the basin around the station they have built a hard nest that hums, and guns that turn by themselves.',
      'More of them are on the way: a long line of machines, a quarter of an hour out. When it arrives, the basin is theirs.',
      'Three nests ring the basin. Grow the brood, find the weak side and <b>tear down their Command Post</b>. Their towers feed them; their guns hate Crawlers and love a straight line. Use Lure and Flank (T).',
      'They will come for our nests. Keep enough brood at home to meet them.'
    ],
    start:{ camera:{x:31,y:9}, rally:{x:30,y:9},
      units:[ ['engineer','Q',2], ['trooper','Q',6], ['gunner','Q',1], ['pyro','Q',1], ['medic','Q',1] ],
      buildings:[ ['hq','Q'] ], hives:['a','b','c'], hiveHp:1.3 },
    swarm:{ biomass:180, rate:1.0, guardMax:2, guardEvery:22, aggro:7, waves:null, cap:34, unlock:{ spitter:0, brute:240 } },
    objectives:[
      { id:'hq',     text:'Destroy the Command Post before the convoy arrives' },
      { id:'relays', text:'Destroy both Relay Towers', optional:true },
      { id:'nest',   text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{
          const guns=({easy:2,normal:3,hard:4})[G.diffKey]||3; for(const [dx,dy] of [[5,-3],[-5,3],[5,4],[-4,-4]].slice(0,guns)) g.place('sentry','Q',dx,dy);   /* more sentry guns on harder difficulties */
          for(const [dx,dy] of [[7,0],[0,6]]) g.place('barricade','Q',dx,dy);
          const q=pt('Q'); const sites=[...G.map.sites].sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y)).slice(0,2);
          for(const s of sites){ const r=makeBuilding('relay','corps',s.x,s.y,true); r.tag='relay'; }
          g.vars.relays=G.ents.filter(e=>e.tag==='relay'); g.setTimer(900,'Convoy');
          const hq=G.ents.find(e=>e.type==='hq'); if(hq){ hq.maxHp*=2; hq.hp=hq.maxHp; } } },   /* a fortified Command Post: twice the armour plating */
      { when:g=>g.time>1, do:g=>g.brood_say('Their hard nest hums at the centre of the basin. Grow the brood: Q, W, E. Right-click to call it together. A to send it.') },
      { when:g=>g.time>3, do:g=>g.say('Cmdr. Varga','Command Post is live. Convoy is fifteen minutes out. Hold until then.') },
      { when:g=>g.time>40, do:g=>g.brood_say('Their guns turn by themselves and reach far. Lure them, or come at them from two sides (T changes how the brood attacks).') },
      // the Command Post trains a soldier every so often
      { repeat:true, when:g=>g.time>(g.vars.trainAt||(g.vars.trainAt=55)), do:g=>{ g.vars.trainAt=g.time+55/(G.corpsDiff?G.corpsDiff.reinforce:1);
          if(!g.has('hq')||g.corps().length>=g.n(14)) return; const order=['trooper','trooper','gunner','medic','trooper','pyro']; g.vars.ti=(g.vars.ti||0)+1;
          g.spawn(order[g.vars.ti%order.length],'Q',1,{faction:'corps'}); } },
      // two raids on the nearest hive
      { when:g=>g.time>240, do:g=>corpsRaid(g,4,'Sgt. Kessler','Fire team, push out and burn the nearest nest. Make it quick.') },
      { when:g=>g.time>540, do:g=>corpsRaid(g,6,'Cmdr. Varga','They are massing. Hit a hive before they hit us. Go.') },
      { when:g=>g.time>780, do:g=>{ g.say('Cmdr. Varga','Two minutes until the convoy. Hold on!'); g.brood_say('The machines are close. Now, or never.'); } },
      { repeat:true, when:()=>true, do:g=>{ const n=(g.vars.relays||[]).filter(e=>!e.dead).length; g.setText('relays',`Destroy both Relay Towers (${2-n}/2)`); if(g.vars.relays&&n===0) g.complete('relays'); } },
      { when:g=>g.time>1 && g.has('hq')===0, do:g=>{ g.complete('hq'); g.complete('nest'); g.win('Their hard nest splits open. The convoy will find nothing but the Brood, waiting.'); } },
      { when:g=>g.timerLeft()===0, do:g=>{ g.fail('hq'); g.lose('The convoy rolls in under their guns. The basin is theirs.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('All three nests are burning. The brood starves.'); } }
    ]
  }
);
