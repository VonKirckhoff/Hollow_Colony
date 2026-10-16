'use strict';
/* Mission 4: The Hollow Colony */
MISSIONS.push(
  {
    id:'hollow-colony', title:'The Hollow Colony', map:'hollow',
    summary:'Rescue the last survivor from the colony where it all began.',
    briefing:[
      'A faint distress beacon is transmitting from Hollow Colony, the first settlement on the moon and the place where the Swarm first appeared.',
      'The signal belongs to Dr. Elin Maas, the biologist who studied the Swarm before the colony fell. She is holed up in the research lab with a data core that could explain how the Swarm breeds.',
      'Find her and bring her and the core to the extraction pad in the south-east. Your Engineer carries a folded Sentry Gun. Use it well.'
    ],
    start:{ salvage:0, camera:'P',
      units:[ ['trooper','P',4], ['gunner','P',1], ['pyro','P',1], ['medic','P',1], ['engineer','P',1,{carry:'sentry'}] ],
      buildings:[], hives:['a','b','c'] },
    limits:{ sentry:1 },
    swarm:{ biomass:40, rate:0.3, guardMax:3, guardEvery:16, waves:null },
    objectives:[ { id:'lab', text:'Find Dr. Maas in the research lab' } ],
    // Dropship timer starts at the rescue; the mission is won once it has landed and Dr. Maas is on the pad.
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ g.marker('lab','1','Research lab'); g.reveal('1',3,5); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, the colony is a maze of ruins. Stay together. The lab is in the north-east block.') },
      { when:g=>g.time>10, do:g=>g.say('Sgt. Kessler','Our Engineer is hauling a folded Sentry Gun. Press D to set it up, U to pack it again.') },
      { when:g=>g.near('corps','3',5)>0 || g.near('corps','5',4)>0, do:g=>{
          g.say('Sgt. Kessler','Swarm bodies here. Shot clean through, skulls taken. That was not us.'); g.vars.clue=true; } },
      { when:g=>g.near('corps','1',3)>0, do:g=>{
          g.complete('lab'); g.unmark('lab');
          g.vars.maas=g.spawn('scientist','1',1)[0]; g.vars.rescueT=g.time;
          g.say('Dr. Maas','Thank God. I have the core. Get me to the extraction pad, quickly. They hear everything.'); g.setTimer(240,'Dropship');
          g.addObjective('escort','Bring Dr. Maas to the extraction pad and hold until the dropship lands'); g.addObjective('maas','Dr. Maas must survive');
          g.marker('lz','2','Extraction'); g.vars.nextWave=g.time+30; } },
      { when:g=>g.vars.rescueT && g.timerLeft()<=60, do:g=>g.say('Dropship Kestrel','Kestrel here. One minute out. Keep that pad clear.') },
      { repeat:true, when:g=>g.vars.rescueT && g.time>g.vars.nextWave, do:g=>{ g.wave(60+(g.vars.waveN=(g.vars.waveN||0)+1)*18); g.vars.nextWave=g.time+40; } },
      { when:g=>g.vars.rescueT && g.time>g.vars.rescueT+14, do:g=>{
          const m=g.vars.maas.dead?g.where('1'):g.vars.maas; g.vars.grey=g.spawn('hunter',{x:Math.floor(m.x/32)-7,y:Math.floor(m.y/32)+3},1)[0]; g.vars.grey.escape=g.where('6');
          g.say('Cmdr. Varga','Unknown heat signature right on top of you... and gone. Something is stalking your squad.'); } },
      { when:g=>g.vars.grey && g.vars.grey.revealT>0, do:g=>g.say('Sgt. Kessler','There! I saw it! Tall, grey, some kind of cloak. Light it up!') },
      { when:g=>g.vars.grey && g.vars.grey.retreating, do:g=>g.say('Dr. Maas','It is pulling back. It does not run from the Swarm. It runs from losing.') },
      { when:g=>g.vars.maas && g.vars.maas.dead, do:g=>{ g.fail('maas'); g.lose('Dr. Maas is dead. The data core is lost.'); } },
      { when:g=>g.vars.maas && !g.vars.maas.dead && g.near('corps','2',2.5)>0 && g.timerLeft()===0 && Math.hypot(g.vars.maas.x-g.where('2').x,g.vars.maas.y-g.where('2').y)<4*32, do:g=>{
          g.complete('escort'); g.complete('maas'); g.unmark('lz');
          g.win('Dr. Maas and the data core are aboard. As the dropship lifts off, the pilot reports a tall shape on the ridge, watching. Something on this moon hunts the hunters.'); } }
    ]
  }
);
