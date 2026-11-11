'use strict';
/* Corps mission 8: Kill Order (the Corps side of Rogue job 6, Hunted)
   Selene Highlands. Containment Order 9 is out: the Osprey crew carries the strain. They have been seen on the Highlands, and an ore
   hauler without a flight plan is heading their way: it needs one of the three old uplink beacons to land. Take all three and hold
   them when she comes in, and keep Sgt. Kessler alive: he insisted on coming, and the crew will not shoot him.
   The crew never dies: hurt one badly enough and he breaks off and runs. When the hauler turns back, they all slip away.
   job: the numbers of this mission (dev panel, "This mission"). */
const KO_EXITS=[ {x:3,y:2}, {x:1,y:48}, {x:86,y:21} ];
MISSIONS.push(
  {
    id:'kill-order', title:'Kill Order', map:'high', ospreyVoice:'Osprey crew',
    summary:'Deny the Osprey crew their ride off the Selene Highlands. Keep Kessler alive.',
    briefing:[
      'Containment Order 9 is in force. The raiders at Kappa were the crew of the Osprey, alive and carrying the strain. Medical says they are no longer survivors. They are vectors.',
      'They have been seen on the Selene Highlands, and an ore hauler with no flight plan is heading there. She needs an uplink beacon to land. Take all three beacons and hold them when she comes in, and she has nowhere to set down.',
      'Sgt. Kessler goes with you. He knew some of them before the crash and he asked for this. Keep him alive. The Brood on the Highlands does not touch them, so it will all be coming for you. Kestrel flies replacements to the Landing Zone on the plating; claim the relay pads to pay for them.'
    ],
    job:{ koShip:300, koRethink:12, koBack:{ easy:80, normal:60, hard:45 } },
    start:{ salvage:300, camera:'P',
      units:[ ['trooper','P',4], ['gunner','P',2], ['pyro','P',1], ['medic','P',2], ['engineer','P',1] ],
      buildings:[], hives:['a','b','c','d'], hiveHp:1.3,
      uplinks:[ ['1','West ridge'], ['2','East ridge'], ['3','Centre mesa'] ],
      shafts:[ {x:3,y:2,wall:'n',exit:true,label:'Old shaft'}, {x:1,y:48,wall:'w',exit:true,label:'Old shaft'}, {x:86,y:21,wall:'e',exit:true,label:'Old shaft'} ],
      swarmUnits:[ ['drone','1',2], ['crawler','1',1], ['drone','2',2], ['spitter','2',1], ['drone','3',2] ] },
    limits:{ sentry:3 },
    landingZone:{ tx:47, ty:53, max:14, delay:25 },
    noTraining:true,
    swarm:{ biomass:40, rate:0.3, guardMax:3, guardEvery:18, waves:{ first:200, every:120, budget:35, growth:8 }, unlock:{ spitter:90, brute:400 } },
    objectives:[
      { id:'beacons', text:'Hold all three uplink beacons when the hauler comes in (0/3)' },
      { id:'kessler', text:'Sgt. Kessler must survive' }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{ const J=G.mission.job;
          const k=g.spawn('trooper','P',1)[0]; k.npc=true; k.vet={ ...k.vet, name:'Kessler', rank:2, xp:RANKS[2].xp, sex:'m' }; k.hpMul=4; k.armor=0.4; applyRank(k); k.hp=k.maxHp; g.vars.kessler=k;
          G.usedNames&&G.usedNames.add('Kessler');
          g.ospreyExits(KO_EXITS); g.ospreyReturn(J.koBack[G.diffKey]||50);
          const C=(type,n,o)=>g.osprey(type,{x:5,y:50},n,{spare:k,...(o||{})});
          const a=[...C('trooper',1,{capt:true}),...C('trooper',2),...C('medic',1)], b=[...C('gunner',1),...C('pyro',1),...C('engineer',1)];
          g.vars.teams=[ { list:a, at:'1' }, { list:b, at:'3' } ]; for(const t of g.vars.teams) g.ospreyOrder(t.list,t.at);
          g.marker('u1','1','Uplink'); g.marker('u2','2','Uplink'); g.marker('u3','3','Uplink');
          g.setTimer(J.koShip,'Hauler'); g.vars.rethink=g.time+J.koRethink; } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, the hauler is on approach. Three beacons on the Highlands: I want all three in Corps hands when she comes over the ridge. Order 9 applies.') },
      { when:g=>g.time>8,  do:g=>g.say('Sgt. Kessler','I know these people. They will go for the beacons and they will not stop. Do not let them dig in.') },
      { when:g=>g.time>16, do:g=>g.ospreySay('Osprey crew','Kessler. I know that is you. Stay out of our way and nobody gets hurt that does not have to.') },
      { when:g=>g.time>24, do:g=>g.say('Sgt. Kessler','Captain. Put the guns down. Walk out, all of you, and I will see you get a hearing. You have my word.') },
      { when:g=>g.time>31, do:g=>g.ospreySay('Osprey crew','A hearing ends with us in a lab, Kessler. You know it does.') },
      /* they never shoot Kessler: his men notice */
      { when:g=>g.vars.kessler&&g.vars.kessler.hitAt==null&&g.ospreyBroken()>=1, do:g=>g.say('Sgt. Kessler','They are not shooting at me. Why are they not shooting at me?') },
      /* the crew goes for the beacons, team by team; a beacon you hold draws them back */
      { repeat:true, when:g=>!g.vars.end&&g.vars.rethink&&g.time>g.vars.rethink, do:g=>{ g.vars.rethink=g.time+G.mission.job.koRethink;
          const ups=G.ents.filter(e=>!e.dead&&e.def&&e.def.capture);
          for(const u of g.ospreys()) if(!g.vars.teams.some(t=>t.list.includes(u))){ const t=g.vars.teams.reduce((a,b)=>a.list.filter(x=>!x.dead&&!x.ospBroke).length<=b.list.filter(x=>!x.dead&&!x.ospBroke).length?a:b); t.list.push(u); u.ospHunt=false; }   /* back on his feet: he joins the smaller team */
          for(const t of g.vars.teams){ const L=t.list.filter(u=>!u.dead&&!u.ospBroke); if(!L.length) continue;
            const cur=ups.find(b=>b.point===t.at), here=L.filter(u=>Math.hypot(u.x-cur.x,u.y-cur.y)<4*TILE).length;
            if(here&&!cur.owned){ for(const u of L) if(!u.target&&Math.hypot(u.x-cur.x,u.y-cur.y)>3*TILE) g.ospreyOrder([u],t.at); continue; }   /* holding it: stay on it */
            if(!here||cur.owned){   /* go for the beacon Dust holds with the fewest soldiers on it (not the other team's) */
              const other=g.vars.teams.find(x=>x!==t), tgt=ups.filter(b=>b.point!==(other&&other.list.some(u=>!u.dead&&!u.ospBroke)?other.at:null))
                .sort((p,q)=>(q.owned?0:1)-(p.owned?0:1)||g.near('corps',p.point,5)-g.near('corps',q.point,5))[0];
              if(tgt&&(tgt.point!==t.at||!here)){ t.at=tgt.point; g.ospreyOrder(L,t.at); } } } } },
      { repeat:true, when:g=>!g.vars.end, do:g=>g.setText('beacons',`Hold all three uplink beacons when the hauler comes in (${g.uplinks()}/3)`) },
      { when:g=>g.timerLeft()<=60&&g.timerLeft()>0, do:g=>g.say('Cmdr. Varga','One minute. The hauler is coming in low over the ridge. Every beacon, Dust.') },
      /* the hauler comes in */
      { when:g=>g.vars.rethink&&g.timerLeft()<=0&&!g.vars.end, do:g=>{ g.vars.end=true; g.clearTimer();
          if(g.uplinks()>=3){ g.complete('beacons'); g.say('Magpie','...no beacon, no ground. Sorry, friends. I am not putting her down blind.'); g.say('Cmdr. Varga','The hauler is turning away. Dust, they are on foot now. Run them down.');
            g.ospreySay('Osprey crew','She is turning back. Scatter! The old shafts, everyone. We will find another way.'); g.ospreyWithdraw(); g.vars.denied=true; }
          else { g.fail('beacons'); const b=G.ents.find(e=>!e.dead&&e.def&&e.def.capture&&!e.owned); g.ping(b.point);
            g.lose(`The hauler sets down at the ${b.label.toLowerCase()} beacon for nine seconds. When Dust gets there, the Osprey crew is gone, and so is she. Varga logs the hauler's name: Magpie. Nobody on her manifest.`); } } },
      { repeat:true, when:g=>g.vars.denied&&!g.vars.won, do:g=>g.setText('beacons',`The hauler turned back. The crew is running (${g.ospreyLeft()} still on the Highlands)`) },
      /* every last one of them has broken off before the hauler came: she has nobody to pick up */
      { when:g=>!g.vars.end&&g.vars.teams&&g.ospreyLeft()===0&&g.ospreyComing()===0, do:g=>{ g.vars.end=true; g.vars.denied=true; g.clearTimer(); g.complete('beacons');
          g.say('Magpie','Magpie to whoever is down there. Nobody on the beacon, nobody on the radio. I am turning back.'); } },
      { when:g=>g.vars.denied&&g.ospreyLeft()===0&&!g.vars.won, do:g=>{ g.vars.won=true; g.complete('kessler'); g.unmark('u1'); g.unmark('u2'); g.unmark('u3');
          g.win('The hauler climbs away empty. The Osprey crew goes into the old mine shafts under the Highlands, and the shafts go on for miles. Kessler stands at the shaft mouth a long time. "They could have shot me," he says. "Seven times over." Varga writes it up as a containment success. Kessler does not sign it.'); } },
      { when:g=>g.vars.kessler&&g.vars.kessler.dead, do:g=>{ g.fail('kessler'); g.lose('Sgt. Kessler is dead. The brood took him while the Osprey crew walked around him. Order 9 holds, and nobody on the Highlands knows what to make of it.'); } }
    ]
  }
);
