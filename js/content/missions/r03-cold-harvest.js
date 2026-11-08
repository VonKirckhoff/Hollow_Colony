'use strict';
/* Rogue 3: Cold Harvest
   Mare Colony at night. The Corps holds the town with its generators running; the hives sit in the dark corners.
   Harvest three hives (kill them without fire), stay out of the light, and leave down the old mine shaft. */
const CH_GENS=['1','2','3','4'];
ROGUE_MISSIONS.push(
  {
    id:'rogue-cold-harvest', title:'Cold Harvest', map:'mare', rogue:true,
    summary:'Harvest three hives in a dark town the Corps has lit up.',
    briefing:[
      'Devreese has the first strains working in our blood, but she needs more: whole hives, not scraps. Mare Colony has four, and the Corps has the town.',
      'They got the generators running. The streets they light are theirs: walk into the light and every soldier at that generator sees you. In the dark they see as little as we do. Night Eyes helps.',
      'Kill three hives without fire. A burnt hive is worth nothing. When we have three, we leave through the old mine shaft in the south-west.'
    ],
    dark:{ sight:0.5 }, flares:2,
    start:{ salvage:0, camera:{x:24,y:53}, crewAt:{x:24,y:53},
      units:[], buildings:[], hives:['a','b','c',{at:{x:50,y:39}}], hiveHp:1.2,
      shafts:[ {x:16,y:36} ],
      swarmUnits:[ ['drone','a',3], ['crawler','a',2], ['drone','b',3], ['spitter','b',1], ['drone','c',3], ['crawler','c',2], ['drone',{x:50,y:39},2], ['spitter',{x:50,y:39},1] ] },
    swarm:{ biomass:50, rate:0.38, guardMax:5, guardEvery:14, aggro:7, waves:null, unlock:{ spitter:120, brute:420 },
      hunt:{ every:40, afterEvery:20, budget:45, afterBudget:60, grow:0.2, growMax:8 } },
    objectives:[
      { id:'harvest', text:'Harvest three hives: kill them without fire (0/3)' },
      { id:'dark',    text:'Never step into the light where the Corps can see you', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          g.vars.gens=CH_GENS.map(k=>{ const p=g.where(k), b=g.loyalB('generator',{x:Math.floor(p.x/TILE)-1,y:Math.floor(p.y/TILE)-1}); if(b){ b.powered=true; b.hp=b.maxHp; b.invuln=true; b.label='Corps generator'; } return b; }).filter(Boolean);
          const cg=g.loyalB('generator',{x:34,y:44}); if(cg){ cg.powered=true; cg.hp=cg.maxHp; cg.invuln=true; cg.label='Camp generator'; g.vars.gens.push(cg); }
          g.loyalB('hq','P');
          for(const k of CH_GENS) g.loyal('trooper',k,2,{hold:true});
          g.loyal('gunner','P',1,{hold:true}); g.loyal('trooper','P',2,{hold:true}); g.loyal('medic','P',1);
          g.loyal('trooper','1',3,{ patrol:['1',{x:39,y:16},'2',{x:39,y:34}] });
          g.loyal('trooper','4',3,{ patrol:['4',{x:39,y:34},'3',{x:39,y:16}] });
          g.vars.seen=0; } },
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Haesaert','Mare Colony. Look at it, lit up like a parade ground. Stay in the dark, stay off their streets.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Devreese','Four hives. I need three, whole. Mortier, that means your flamer stays off the nests. Burn what comes at us if you must, never the hive.') },
      { when:g=>g.time>18, do:g=>g.crewSay('Cnudde','Flares (L) light us up as well as them. Use them on the nests, not on the streets.') },
      /* the light: anyone of the crew in the glow of a running generator is seen by every Corps soldier near it */
      { repeat:true, when:g=>g.time>1&&!!g.vars.gens, do:g=>{ for(const gen of g.vars.gens){ if(gen.dead||!gen.powered) continue;
          const lit=g.crew().find(u=>!u.downed&&Math.hypot(u.x-gen.x,u.y-gen.y)<gen.def.light*TILE*0.8); if(!lit) continue;
          for(const l of g.loyals()) if(!l.target&&Math.hypot(l.x-gen.x,l.y-gen.y)<12*TILE) l.target=lit;
          if(!g.vars.lightSaid){ g.vars.lightSaid=true; g.fail('dark'); g.say('Corps patrol','Movement in the light! Corps armour, no IFF... open fire!'); g.crewSay('Capt. Haesaert','We are lit! Back into the dark!'); }
          if(G.time>(g.vars.huntAt||0)){ g.vars.huntAt=G.time+30; const near=g.loyals().filter(l=>l.patrol).slice(0,3); for(const l of near){ l.order={type:'amove',x:lit.x,y:lit.y}; setPath(l,lit.x,lit.y); } } } } },
      { repeat:true, when:g=>!g.vars.harvestDone, do:g=>{ const n=g.harvested(); g.setText('harvest',`Harvest three hives: kill them without fire (${Math.min(3,n)}/3)`);
          if(n>=3){ g.vars.harvestDone=true; g.complete('harvest'); g.addObjective('escape','Everyone down the old mine shaft in the south-west'); g.marker('exit',{x:17,y:37},'Mine shaft');
            g.crewSay('Devreese','Three hives. My bags are heavy and wet. Get us out of here.'); }
          else if(g.hives()+n<3){ g.vars.harvestDone=true; g.fail('harvest'); g.lose('Too many hives burnt. There is nothing left in Mare Colony worth harvesting.'); } } },
      { when:g=>g.harvested()>=1, do:g=>g.crewSay('Devreese','One! Do not touch the samples with bare hands. Do not lick your fingers, Braet.') },
      { repeat:true, when:g=>g.vars.harvestDone&&!g.vars.won&&g.isDone('harvest'), do:g=>g.setText('escape',`Everyone down the old mine shaft in the south-west (${Math.min(g.crewNear({x:17,y:37},4),g.crewUp())}/${g.crewUp()})`) },
      { when:g=>g.isDone('harvest')&&g.crewUp()>0&&g.crewNear({x:17,y:37},4)>=g.crewUp(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit'); if(!g.vars.lightSaid) g.complete('dark');
          g.win(g.vars.lightSaid?'In the morning the Corps finds three dead hives with their hearts cut out, and the tracks of seven boots going down a mine shaft.':'In the morning the Corps finds three dead hives with their hearts cut out. Not one sentry saw a thing.'); } },
      { when:g=>g.time>2&&g.crew().length===0, do:g=>g.lose('The crew dies in the dark streets of Mare Colony.') }
    ]
  }
);
