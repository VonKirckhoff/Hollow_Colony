'use strict';
/* Mission 5: Blackout
   Darkness mission: everyone sees less, and only running generators light the streets.
   Engineers repair the four generators; a running generator draws the Swarm. Win when all four run at once.
   A fifth, small generator lights the camp around the Command Post (it runs from the start and does not count for the objective).
   Three old mine shafts: once the hives are burnt, the waves keep coming up out of them. */
MISSIONS.push(
  {
    id:'blackout', title:'Blackout', map:'mare',
    summary:'Restore power to a dark mining town while the Swarm hunts the light.',
    briefing:[
      'The data core Dr. Maas carried out holds years of seismic readings. To make sense of them she needs the survey array in Mare Colony, and Mare Colony has been dark for a week.',
      'The town has four generators, one in each corner. All four must run at the same time to wake the array. Your Engineers can repair them, but in the dark your troops see half as far as usual.',
      'A running generator lights its streets, and the Swarm is drawn to light. Get one running and they will come for it. Hold the Command Post in the square; its own small generator keeps the camp lit. The landing pad beside it brings in replacements for anyone you lose.'
    ],
    dark:{ sight:0.5 },                 // darkness: sight × 0.5, explored ground fades to black
    limits:{ sentry:4 },
    landingZone:{ tx:44, ty:44, max:11, delay:25 },   // pad next to the Command Post: order replacements, never more than the 11 you start with
    start:{ salvage:250, camera:'P',
      units:[ ['engineer','P',3], ['trooper','P',6], ['pyro','P',1], ['medic','P',1] ],
      buildings:[ ['hq','P'], ['generator','1'], ['generator','2'], ['generator','3'], ['generator','4'] ],
      hives:['a','b','c'],
      shafts:[ {x:24,y:21}, {x:53,y:19}, {x:16,y:36} ],   // old mine shafts: when the hives are gone, the waves come up out of these
      swarmUnits:[ ['drone','a',3], ['drone','b',3], ['drone','c',3],          // nest guards
                   ['drone','1',3], ['crawler','2',3], ['drone','3',2], ['crawler','3',1], ['drone','4',2], ['spitter','4',1] ] },   // squatters at the generators
    swarm:{ biomass:50, rate:0.42, guardMax:5, guardEvery:14, waves:{ first:170, every:85, budget:55, growth:22 }, unlock:{ spitter:200, brute:520 } },
    objectives:[
      { id:'power', text:'Run all four generators at the same time (0/4)' },
      { id:'hq',    text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{
          const names={ '1':'North-west generator', '2':'North-east generator', '3':'South-west generator', '4':'South-east generator' };
          for(const k of ['1','2','3','4']){ const gen=g.generatorAt(k); if(gen) gen.label=names[k]; }
          g.vars.on={}; g.vars.waveAt={};
          /* the camp generator next to the Command Post: running from the start, lights the camp */
          const cg=makeBuilding('generator','corps',34,44,true); cg.label='Camp generator'; cg.camp=true; cg.powered=true; cg.hp=cg.maxHp; } },
      { when:g=>g.time>1, do:g=>g.say('Cmdr. Varga','Dust, the town is pitch black. Four generators, one in each corner. Get them running, all of them, at the same time.') },
      { when:g=>g.time>8, do:g=>g.say('Sgt. Kessler','Engineers: right-click a generator to repair it. It comes online at full strength. Keep rifles with them, we are blind out there.') },
      { when:g=>g.time>14, do:g=>{ for(const k of ['1','2','3','4']){ const gen=g.generatorAt(k); if(gen&&!gen.powered) g.marker('gen'+k,k,'Generator'); } } },

      // count, markers, and the Swarm coming for every generator that lights up
      { repeat:true, when:g=>g.vars.on, do:g=>{
          const n=g.vars.town=['1','2','3','4'].filter(k=>{ const x=g.generatorAt(k); return x&&x.powered; }).length; g.setText('power',`Run all four generators at the same time (${n}/4)`);
          for(const k of ['1','2','3','4']){ const gen=g.generatorAt(k); if(!gen) continue; const was=!!g.vars.on[k];
            if(gen.powered && !was){ g.vars.on[k]=true; g.unmark('gen'+k); if(!g.vars.waveAt[k]||g.vars.waveAt[k]>g.time+10) g.vars.waveAt[k]=g.time+10; }
            if(!gen.powered && was){ g.vars.on[k]=false; g.marker('gen'+k,k,'Generator down'); }
            if(g.vars.waveAt[k] && g.time>g.vars.waveAt[k]){ g.vars.waveAt[k]=g.time+45; if(gen.powered && g.swarmCount()<40){ g.wave(45+n*10,k); } } } } },
      { when:g=>(g.vars.town||0)>=1, do:g=>g.say('Dr. Maas','Power! Look at them, they turn towards the light. They will come for it.') },
      { when:g=>(g.vars.town||0)>=2, do:g=>g.say('Sgt. Kessler','Two up. Leave a Sentry or a few rifles at each one, they will not stay running on their own.') },
      { when:g=>(g.vars.town||0)>=3, do:g=>g.say('Cmdr. Varga','Three generators running. One more and the array wakes up.') },
      { when:g=>g.time>420, do:g=>g.say('Dr. Maas','The array draws from all four at once. If one drops, we start over.') },

      { when:g=>(g.vars.town||0)>=4, do:g=>{ g.complete('power'); g.complete('hq');
          g.win('The lights of Mare Colony come back on. The survey array hums awake, and Dr. Maas starts reading the deep echoes beneath Ridgeback Canyon.'); } },
      { when:g=>g.time>5&&g.hives()===0, do:g=>g.say('Sgt. Kessler','Hives are ash. Do not relax: this town sits on old mine shafts, and something down there is still breathing.') },
      { when:g=>!g.has('hq'), do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen. Mare Colony stays dark.'); } },
      { when:g=>g.time>2 && g.troops()===0, do:g=>g.lose('Squad Dust is gone. The dark keeps Mare Colony.') }
    ]
  }
);
