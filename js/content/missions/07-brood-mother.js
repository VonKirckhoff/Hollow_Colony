'use strict';
/* Mission 7: Brood Mother */
MISSIONS.push(
  {
    id:'brood-mother', title:'Brood Mother', map:'depths',
    summary:'Descend beneath Tycho Maw, burn three egg chambers and kill the Brood Mother.',
    briefing:[
      'Tycho Maw is silent, yet the brood keeps coming. The seismic echoes from Ridgeback mapped the caves beneath it, and something down there is still laying eggs.',
      'Three egg chambers feed a sealed lair in the north-east. Living membrane closes the only tunnel into the lair, and it will not die while its chambers live.',
      'You may field at most fifteen soldiers. The Command Post cannot train down here: order replacements at the Landing Zone and a dropship brings them in. Set up at the cave mouth, claim the relay pads in the tunnels and push in. This will be a long fight. Pyros burn eggs, Engineers keep the sentries moving. When the lair opens, kill the Brood Mother.'
    ],
    limits:{ sentry:6 },
    landingZone:{ tx:16, ty:44, max:15, delay:25 },
    noTraining:true,
    start:{ salvage:500, camera:'P',
      units:[ ['engineer','P',3], ['trooper','P',6], ['gunner','P',2], ['pyro','P',2], ['medic','P',2] ],
      buildings:[ ['hq','P'] ], hives:['a','b','c'], hiveHp:12,
      swarmUnits:[ ['drone','a',4], ['crawler','a',3], ['drone','b',5], ['spitter','b',2], ['drone','c',5], ['spitter','c',2], ['brute','c',1] ] },
    swarm:{ biomass:150, rate:0.5, guardMax:8, guardEvery:10, waves:{ first:180, every:95, budget:70, growth:26 }, unlock:{ spitter:240, brute:600 } },
    objectives:[
      { id:'chambers', text:'Burn the three egg chambers (0/3)' },
      { id:'hq',       text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{
          g.wall('8',2.3,'lair');
          g.vars.mother=g.spawn('broodmother','9',1,{order:'boss'})[0]; g.boss(g.vars.mother,'Brood Mother');
          for(const k of ['a','b','c']) g.marker('ch'+k,k,'Egg chamber'); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Welcome to the Maw Depths. Three egg chambers, one queen. Dig in at the cave mouth first.') },
      { when:g=>g.time>14, do:g=>g.say('Sgt. Kessler','Six sentries max down here. Relay pads in the side tunnels will keep the salvage flowing.') },
      { when:g=>g.time>26, do:g=>{ g.say('Dropship Kestrel','Kestrel on station. Fifteen boots on the ground max. Select the Landing Zone to order replacements.'); g.ping({x:17,y:45}); } },
      { when:g=>g.time>45, do:g=>g.say('Dr. Maas','The membrane at the lair is fed by the chambers. Kill all three and it will rot away.') },
      { repeat:true, when:g=>!!g.vars.mother, do:g=>{ let n=0; for(const k of ['a','b','c']){ if(!g.hiveAt(k)){ n++; g.unmark('ch'+k); } }
          g.setText('chambers',`Burn the three egg chambers (${n}/3)`); g.vars.burned=n; } },
      { when:g=>g.vars.burned>=1, do:g=>{ g.say('Dr. Maas','One chamber gone. She felt that. Her children will come for your base.'); g.wave(90); } },
      { when:g=>g.vars.burned>=2, do:g=>{ g.say('Cmdr. Varga','Two down. The swarm is getting desperate. Brace for a big push!'); g.wave(140); } },
      { when:g=>g.vars.burned>=3, do:g=>{ g.complete('chambers'); g.openWall('lair');
          g.say('Dr. Maas','The membrane is dissolving. The lair is open. She is in there, and she is enormous.');
          g.addObjective('mother','Kill the Brood Mother'); g.marker('queen','9','Brood Mother'); } },
      { when:g=>g.vars.mother && g.vars.mother.awake, do:g=>{ g.unmark('queen'); g.say('Sgt. Kessler','Contact! By God, look at the size of her!'); } },
      { when:g=>g.vars.mother && g.vars.mother.bossState && g.vars.mother.bossState.phase>=1, do:g=>g.say('Dr. Maas','She is calling her brood! Burn the eggs before they hatch, and do not let her rest or she will heal.') },
      { when:g=>g.vars.mother && g.vars.mother.bossState && g.vars.mother.bossState.phase>=2, do:g=>{
          g.vars.grey=g.spawn('hunter','8',1,{prey:'swarm',truce:'corps'})[0]; g.vars.grey.escape=g.where('8');
          g.say('Sgt. Kessler','The Grey! It walked right past us. It is going for the Mother!');
          g.say('Dr. Maas','It is not helping us. It wants the biggest trophy on this moon. Use it.'); } },
      { when:g=>g.vars.mother && g.vars.mother.bossState && g.vars.mother.bossState.phase>=3, do:g=>g.say('Cmdr. Varga','She is almost finished. Everything you have, now!') },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen. The brood will keep breeding.'); } },
      { when:g=>g.vars.mother && g.vars.mother.dead, do:g=>{ g.complete('mother'); g.complete('hq');
          g.win('The Brood Mother is dead. In the silence after, a tall shape drags something heavy into the dark. The Grey have their trophy. The moon has a chance.'); } }
    ]
  }
);
