'use strict';
/* Mission 1: Dust Landing */
MISSIONS.push(
  {
    id:'dust-landing', title:'Dust Landing', map:'kappa',
    summary:'A recon squad investigates the silent Kappa Station.',
    briefing:[
      'Kappa Station stopped transmitting thirty hours ago. Its last data burst held a single word: <i>inside</i>.',
      'Your squad, call sign DUST, lands south-west of the station. Find out what happened and recover any salvage the drop pods scattered.',
      'There is no Command Post on this operation. Keep your Medic behind the rifles.'
    ],
    start:{ salvage:0, camera:'P',
      units:[ ['trooper','P',4], ['gunner','P',1], ['medic','P',1] ],
      buildings:[], hives:['c','a'] },
    swarm:{ biomass:30, rate:0.3, guardMax:4, guardEvery:16, waves:null, unlock:{ spitter:300, brute:9999 } },
    objectives:[
      { id:'reach',  text:'Reach Kappa Station' },
      { id:'crates', text:'Recover 3 salvage crates (0/3)', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ g.marker('station','1','Kappa Station'); g.reveal('1',4,6); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, this is Varga. You are down. Move north-east to Kappa Station, the metal platform under the marker, and report.') },
      { when:g=>g.time>9,  do:g=>g.say('Sgt. Kessler','Drop pods scattered salvage across the basin. Walk over a crate to recover it.') },
      { repeat:true, when:()=>true, do:g=>{
          const n=Math.min(3,g.stat('crates')); g.setText('crates',`Recover 3 salvage crates (${n}/3)`); if(n>=3) g.complete('crates'); } },
      { when:g=>g.near('corps','1',4)>0, do:g=>{
          g.complete('reach'); g.unmark('station'); g.say('Sgt. Kessler','We are at the station. The doors were forced open from the inside. No crew.'); g.vars.ambushAt=g.time+4; } },
      { when:g=>g.vars.ambushAt && g.time>g.vars.ambushAt, do:g=>{
          g.say('Cmdr. Varga','Motion contacts closing on your position. Form up and hold!');
          g.vars.ambush=[...g.spawn('drone','2',4,{order:'hunt'}), ...g.spawn('crawler','2',3,{order:'hunt'})];
          g.addObjective('ambush','Survive the ambush'); } },
      { when:g=>g.stat('cocoons')>0, do:g=>g.say('Sgt. Kessler','They are cocooning our dead! Burn the cocoons before they hatch!') },
      { when:g=>g.vars.ambush && g.alive(g.vars.ambush)===0, do:g=>{
          g.complete('ambush');
          g.say('Cmdr. Varga','Biomass signature to the north. That is where they came from. Reinforcements inbound: find the nest and destroy it.');
          g.spawn('trooper','1',2); g.spawn('pyro','1',1);
          g.addObjective('nest','Destroy the hive to the north'); g.reveal('c',4,10); g.ping('c'); g.marker('nest','c','Hive'); } },
      { when:g=>g.vars.ambush && g.alive(g.vars.ambush)===0 && !g.hiveAt('c'), do:g=>{
          g.complete('nest'); g.unmark('nest');
          g.say('Cmdr. Varga','The nest burns. But we have a second signature, bigger, in the north-east. Medic and two rifles are on their way to you.');
          g.spawn('trooper','1',2); g.spawn('medic','1',1);
          g.addObjective('nest2','Destroy the second hive in the north-east'); g.marker('nest2','a','Hive'); g.vars.second=true; } },
      { when:g=>g.vars.second && g.time>(g.vars.secondT||(g.vars.secondT=g.time+40)), do:g=>{ g.say('Sgt. Kessler','Movement behind us. They are trying to cut us off!'); g.wave(70,'1'); } },
      { when:g=>g.vars.second && !g.hiveAt('a'), do:g=>{
          g.complete('nest2'); g.unmark('nest2');
          g.say('Cmdr. Varga','Both nests are ash. Dropship is inbound to Kappa Station. Get back there, and watch your flanks.');
          g.addObjective('extract','Return to Kappa Station for pickup'); g.marker('ex','1','Pickup'); g.vars.extract=true; g.wave(90,'1'); } },
      { when:g=>g.vars.extract && g.near('corps','1',3)>0, do:g=>{ g.complete('extract'); g.unmark('ex'); g.win('Squad Dust is aboard. Kappa Station is ours again, for now.'); } }
    ]
  }
);
