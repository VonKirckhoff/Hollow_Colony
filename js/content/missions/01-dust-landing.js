'use strict';
/* Mission 1: Dust Landing
   Route: drop zone → canyons → Kappa Station (ambush) → dropship on the station pad
          → blast doors open → north caverns (two hives) → back to the station for pickup. */
MISSIONS.push(
  {
    id:'dust-landing', title:'Dust Landing', map:'canyons',
    summary:'A recon squad investigates the silent Kappa Station.',
    briefing:[
      'Kappa Station stopped transmitting thirty hours ago. Its last data burst held a single word: <i>inside</i>.',
      'Your squad, call sign DUST, lands in the canyons south-west of the station. Two routes lead there. Find out what happened and recover any salvage the drop pods scattered.',
      'There is no Command Post on this operation. The station has a landing pad: reinforcements will come in there. Keep your Medic behind the rifles.'
    ],
    start:{ salvage:0, camera:'P',
      units:[ ['trooper','P',4], ['gunner','P',1], ['medic','P',1] ],
      buildings:[], hives:['c','a'] },
    landingZone:{ tx:34, ty:28, scripted:true },   // the station pad: only this script sends the dropship
    swarm:{ biomass:30, rate:0.3, guardMax:4, guardEvery:16, waves:null, unlock:{ spitter:300, brute:9999 } },
    objectives:[
      { id:'reach',  text:'Reach Kappa Station' },
      { id:'crates', text:'Recover 3 salvage crates (0/3)', optional:true }
    ],
    triggers:[
      // the station crew sealed the tunnel to the northern caverns behind them
      { when:g=>g.time>0.1, do:g=>{ for(const x of [33,34,35]) g.wall({x,y:19},0,'north','door'); } },
      { when:g=>g.time>0.2, do:g=>{ g.marker('station','1','Kappa Station'); g.reveal('1',4,6); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, this is Varga. You are down. Follow the canyons north-east to Kappa Station, the metal platform under the marker, and report.') },
      { when:g=>g.time>9,  do:g=>g.say('Sgt. Kessler','Drop pods scattered salvage through the canyons. Walk over a crate to recover it.') },
      { repeat:true, when:()=>true, do:g=>{
          const n=Math.min(3,g.stat('crates')); g.setText('crates',`Recover 3 salvage crates (${n}/3)`); if(n>=3) g.complete('crates'); } },

      // 1. the station and the ambush
      { when:g=>g.near('corps','1',4)>0, do:g=>{
          g.complete('reach'); g.unmark('station');
          g.say('Sgt. Kessler','We are at the station. The doors were forced open from the inside. No crew.'); g.vars.ambushAt=g.time+4; } },
      { when:g=>g.vars.ambushAt && g.time>g.vars.ambushAt, do:g=>{
          g.say('Cmdr. Varga','Motion contacts in the east tunnel, closing on your position. Form up and hold!');
          g.vars.ambush=[...g.spawn('drone','2',4,{order:'hunt'}), ...g.spawn('crawler','2',3,{order:'hunt'})];
          g.addObjective('ambush','Survive the ambush'); } },
      { when:g=>g.stat('cocoons')>0, do:g=>g.say('Sgt. Kessler','They are cocooning our dead! Burn the cocoons before they hatch!') },

      // 2. the dropship lands on the station pad
      { when:g=>g.vars.ambush && g.alive(g.vars.ambush)===0, do:g=>{
          g.complete('ambush');
          g.say('Cmdr. Varga','Good work, Dust. Kestrel is inbound to the station pad with two rifles and a Pyro. Hold the platform.');
          g.airdrop([['trooper',2],['pyro',1]],18); g.addObjective('drop','Wait for reinforcements on the landing pad'); g.marker('lz',{x:35,y:29},'Landing pad'); g.vars.drop1=true; } },

      // 3. the blast doors open
      { when:g=>g.vars.drop1 && g.has('pyro')>0, do:g=>{
          g.complete('drop'); g.unmark('lz');
          g.say('Sgt. Kessler','Station log: the crew sealed the north tunnel and ran. Whatever they locked in is still behind those doors. I can open them from here.');
          g.vars.openAt=g.time+5; } },
      { when:g=>g.vars.openAt && g.time>g.vars.openAt, do:g=>{
          g.openWall('north'); g.ping({x:34,y:19});
          g.say('Cmdr. Varga','Doors are open. Biomass signature in the caverns beyond. Find the nest and destroy it.');
          g.addObjective('nest','Destroy the hive in the western cavern'); g.marker('tunnel','3','Tunnel'); g.vars.open=true; } },
      { when:g=>g.vars.open && g.near('corps','3',3)>0, do:g=>{ g.unmark('tunnel'); g.reveal('c',4,10); g.ping('c'); g.marker('nest','c','Hive'); } },

      // 4. the two hives
      { when:g=>g.vars.open && !g.hiveAt('c'), do:g=>{
          g.complete('nest'); g.unmark('nest'); g.unmark('tunnel');
          g.say('Cmdr. Varga','The nest burns. But we have a second signature, bigger, in the eastern cavern. Kestrel is bringing a Medic and two rifles to the station pad.');
          g.airdrop([['trooper',2],['medic',1]],20);
          g.addObjective('nest2','Destroy the hive in the eastern cavern'); g.marker('nest2','a','Hive'); g.vars.second=true; } },
      { when:g=>g.vars.second && g.time>(g.vars.secondT||(g.vars.secondT=g.time+40)), do:g=>{ g.say('Sgt. Kessler','Movement behind us. They are trying to cut us off!'); g.wave(70,'1'); } },

      // 5. back to the station for pickup
      { when:g=>g.vars.second && !g.hiveAt('a'), do:g=>{
          g.complete('nest2'); g.unmark('nest2');
          g.say('Cmdr. Varga','Both nests are ash. Dropship is inbound to Kappa Station. Get back to the pad, and watch your flanks.');
          g.addObjective('extract','Return to the station landing pad for pickup'); g.marker('ex',{x:35,y:29},'Pickup'); g.vars.extract=true; g.wave(90,'1'); } },
      { when:g=>g.vars.extract && g.near('corps',{x:35,y:29},3)>0, do:g=>{ g.complete('extract'); g.unmark('ex'); g.win('Squad Dust is aboard. Kappa Station is ours again, for now.'); } }
    ]
  }
);
