'use strict';
/* Mission 1: Dust Landing
   Route: drop zone → canyons → Kappa Station (ambush) → dropship on the station pad
          → the door controls are slagged: an Engineer blows the blast doors with a breaching charge → north caverns (two hives) → back to the station for pickup.
   Two old mine shafts: one in the east wall (where the ambush comes from), one in the west wall behind the north-west hive.
   Extra Swarm keeps climbing out of them, also once both hives are burnt, so the squad has to stay alert on the way out. */
const DUST_SHAFT_E={x:79,y:35}, DUST_SHAFT_W={x:8,y:8};
/* the breaching charge on the blast doors (Nov 2026): arm 10 s standing still (a hit or a step off starts it over), then a 10 s fuse;
   the blast blows the doors away and hurts your own soldiers inside the red ring (own = damage at the charge, half at the rim) */
/* the north tunnel's blast doors: the station end (24) and the cavern end (15), both x 40–48 */
const DUST_DOOR_ROWS=[24,15];
const DUST_BREACH={ at:{x:44,y:26}, arm:10, fuse:10, blast:4.5, own:40, wave:40 };
/* a group out of a mine shaft: picks types for the budget (× difficulty), they come up at the shaft and hunt the squad */
function dustShaftWave(g,shaft,budget){
  let left=budget*g.diffBudget(), out=[], guard=0;
  while(left>=15 && guard++<40){ 
    const t=pickSwarmType(left); 
    if(!t) break; 
    left-=UNITS[t].biomass; 
    out.push(...g.spawn(t,shaft,1,{order:'hunt'})); }
  const w=g.where(shaft); 
  for(let j=0;j<8;j++) 
    G.fx.push({k:'ember',x:w.x+rand(-14,14),y:w.y+rand(-6,8),vx:rand(-40,40),vy:rand(-90,-30),t:0.8,max:0.8,col:pick(['#8a7a6a','#a6ff4a'])});
  if(out.length){ 
    g.ping(shaft); 
    SFX.play('hatch',w.x,w.y); }
  return out; }
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
      buildings:[], hives:['c','a'],
      shafts:[ {...DUST_SHAFT_E, wall:'e'}, {...DUST_SHAFT_W, wall:'w'} ] },   // old mine shafts in the canyon walls: the Swarm keeps coming up out of these
    landingZone:{ tx:45, ty:37, scripted:true },   // the station pad: only this script sends the dropship
    buildMax:{ sentry:2 },   /* the Engineer brings two Sentry Guns' worth of parts: two in all, a destroyed one is not replaced (Nov 2026) */
    swarm:{ biomass:95, rate:2.3, guardMax:7, guardEvery:16, hiveRage:4, aggro:0, waves:null,
      unlock:{ spitter:300, brute:9999 } },   /* aggro:0 until the blast doors open */
    objectives:[
      { id:'reach',  text:'Reach Kappa Station' },
      { id:'crates', text:'Recover 3 salvage crates (0/3)', optional:true }
    ],
    triggers:[
      // the station crew sealed the tunnel to the northern caverns behind them
      /* two sets of blast doors (Nov 2026): one at the station end (row 24) and one at the cavern end (row 15), so the Brood can no longer stand
         right behind the station doors and be shot from the station side; both carry the tag 'north', so the breaching charge blows both at once */
      { when:g=>g.time>0.1, do:g=>{ for(const y of DUST_DOOR_ROWS) for(let x=40;x<=48;x++) g.wall({x,y},0,'north','door'); G.shaftWarned=true; } },   /* (our own lines about the shafts, below) */
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
          g.vars.ambush=[...g.spawn('drone',DUST_SHAFT_E,4,{order:'hunt'}), ...g.spawn('crawler',DUST_SHAFT_E,3,{order:'hunt'})]; g.ping(DUST_SHAFT_E);   // up out of the east mine shaft
          g.addObjective('ambush','Survive the ambush'); } },
      { when:g=>g.vars.ambush && g.time>g.vars.ambushAt+12, do:g=>g.say('Sgt. Kessler','They came out of an old mine shaft in the east wall. That hole goes deep. Keep an eye on it.') },
      { when:g=>g.stat('cocoons')>0, do:g=>g.say('Sgt. Kessler','They are cocooning our dead! Burn the cocoons before they hatch!') },

      // 2. the dropship lands on the station pad
      { when:g=>g.vars.ambush && g.alive(g.vars.ambush)===0, do:g=>{
          g.complete('ambush');
          g.say('Cmdr. Varga','Good work, Dust. Icarus is inbound to the station pad with two rifles, a Pyro and an Engineer. Hold the platform.');
          g.airdrop([['trooper',2],['pyro',1],['engineer',1]],18); g.addObjective('drop','Wait for reinforcements on the landing pad'); g.marker('lz',{x:46,y:38},'Landing pad'); g.vars.drop1=true; } },

      // 3. the blast doors: the controls are slagged, so the Engineer blows them
      { when:g=>g.vars.drop1 && g.has('engineer')>0, do:g=>{
          g.complete('drop'); g.unmark('lz');
          g.say('Sgt. Kessler','Station log: the crew sealed the north tunnel and ran. Whatever they locked in is still behind those doors. And they fried the door controls on the way out.');
          g.vars.breachAt=g.time+4; } },
      { when:g=>g.vars.breachAt && g.time>g.vars.breachAt, do:g=>{ const B=DUST_BREACH;
          g.chargeSite(B.at,'breach',{ arm:B.arm, fuse:B.fuse, blast:B.blast, own:B.own, reset:true, opens:'north', name:'breaching charge' });
          g.marker('breach',B.at,'Breach point'); g.ping(B.at); g.reveal(B.at,3,4);
          g.addObjective('breach','Blow the blast doors: an Engineer arms the breaching charge');
          g.say('Cmdr. Varga','Then we go through them. Engineer, put a breaching charge on that door. Everyone else, cover him, and stay out of the blast when it is live.'); g.vars.breach=true; } },
      // the Brood hears the drilling: a small group climbs out of the east shaft while he works
      { when:g=>g.vars.breach && g.charge('breach')==='arming', do:g=>{
          g.say('Sgt. Kessler','Movement in the east shaft. They can hear the drill. Keep them off the Engineer, if he gets hit he has to start over!'); dustShaftWave(g,DUST_SHAFT_E,DUST_BREACH.wave); } },
      { when:g=>g.charge('breach')==='armed', do:g=>{ g.unmark('breach'); g.say('Sgt. Kessler',`Charge is live! ${DUST_BREACH.fuse} seconds, everybody out of the red ring!`); } },
      { repeat:true, when:g=>g.vars.breach && !g.vars.engCalled && g.charge('breach')!=='armed' && g.charge('breach')!=='blown' && g.has('engineer')===0, do:g=>{
          g.vars.engCalled=true; g.say('Cmdr. Varga','You lost your Engineer. Icarus is bringing another one to the pad. Keep him alive this time.'); g.airdrop([['engineer',1]],20); } },
      { repeat:true, when:g=>g.vars.engCalled && g.has('engineer')>0, do:g=>{ g.vars.engCalled=false; } },
      { when:g=>g.charge('breach')==='blown', do:g=>{
          g.complete('breach'); g.unmark('breach'); for(const y of DUST_DOOR_ROWS) g.ping({x:44,y}); g.setSwarm({ aggro:7 });
          g.say('Cmdr. Varga','That woke them up. Biomass signature in the caverns beyond. Find the nest and destroy it.');
          g.addObjective('nest','Destroy the hive in the western cavern'); g.marker('tunnel','3','Tunnel'); g.vars.open=true; } },
      { when:g=>g.vars.open && g.near('corps','3',3)>0, do:g=>{ g.unmark('tunnel'); g.reveal('c',4,10); g.ping('c'); g.marker('nest','c','Hive'); } },

      // 4. the two hives
      { when:g=>g.vars.open && !g.hiveAt('c'), do:g=>{
          g.complete('nest'); g.unmark('nest'); g.unmark('tunnel');
          g.say('Cmdr. Varga','The nest burns. But we have a second signature, bigger, in the eastern cavern. Icarus is bringing a Medic and two rifles. They will move up the tunnel to join you.');
          g.airdrop([['trooper',2],['medic',1]],20,'3');
          g.addObjective('nest2','Destroy the hive in the eastern cavern'); g.marker('nest2','a','Hive'); g.vars.second=true; g.vars.westAt=g.time+25; } },
      { when:g=>g.vars.westAt && g.time>g.vars.westAt, do:g=>{ g.reveal(DUST_SHAFT_W,3,6);
          g.say('Sgt. Kessler','Contact behind the burnt nest! There is a mine shaft in the west wall, they are climbing out of it.'); dustShaftWave(g,DUST_SHAFT_W,40); g.vars.westNext=g.time+75; } },
      // while the second hive lives, the west shaft keeps sending a few after the squad
      { repeat:true, when:g=>g.vars.westNext && !g.vars.extract && g.time>g.vars.westNext && g.swarmCount()<25, do:g=>{ dustShaftWave(g,DUST_SHAFT_W,35); g.vars.westNext=g.time+75; } },
      { when:g=>g.vars.second && g.time>(g.vars.secondT||(g.vars.secondT=g.time+40)), do:g=>{ g.say('Sgt. Kessler','Movement behind us, from the east shaft. They are trying to cut us off!'); dustShaftWave(g,DUST_SHAFT_E,70); } },

      // 5. back to the station for pickup
      { when:g=>g.vars.second && !g.hiveAt('a'), do:g=>{
          g.complete('nest2'); g.unmark('nest2');
          g.say('Cmdr. Varga','Both nests are ash. Dropship is inbound to Kappa Station. Get back to the pad, and watch your flanks.');
          g.addObjective('extract','Everyone back to the landing pad for pickup'); g.marker('ex',{x:46,y:38},'Pickup'); g.vars.extract=true; g.landShip(null,60); g.setTimer(60,'Dropship'); g.vars.shaftNext=g.time+12; } },
      // the hives are gone, the mine shafts are not: waves keep climbing out of them until the dropship leaves
      { repeat:true, when:g=>g.vars.extract && !g.vars.won && g.time>g.vars.shaftNext, do:g=>{
          if(!g.vars.shaftSaid){ g.vars.shaftSaid=true; g.say('Sgt. Kessler','The nests are gone, but they are still coming up the mine shafts. Stay sharp all the way to the pad!'); }
          if(g.swarmCount()<30) g.wave(g.vars.shaftWaves?60:90,(g.vars.shaftWaves||0)%2?undefined:{x:46,y:38});   // the first out of the shaft nearest the pad, then turn and turn about with a random one (never one our troops stand on)
          g.vars.shaftWaves=(g.vars.shaftWaves||0)+1; g.vars.shaftNext=g.time+35; } },
      // the whole squad has to be aboard before the dropship leaves
      { repeat:true, when:g=>g.vars.extract && !g.vars.won, do:g=>g.setText('extract',g.vars.landed?`Everyone aboard the dropship before it lifts off (${g.aboard(null)}/${g.troops()})`:`Everyone back to the landing pad for pickup (${Math.min(g.near('corps',{x:46,y:38},5),g.troops())}/${g.troops()})`) },
      /* the pickup (Nov 2026): the Icarus lands a minute later and waits 90 seconds; the Brood goes for its hull; late is lost */
      { when:g=>g.vars.extract && g.shipDown(null) && !g.vars.landed, do:g=>{ g.vars.landed=true; g.setTimer(g.shipLeft(null),'Lift-off'); g.say('Dropship Icarus','Wheels down on Kappa pad. Ninety seconds, Dust, then I am gone.'); } },
      { when:g=>g.vars.landed && !g.vars.won && g.shipGone(null), do:g=>{ g.clearTimer(); g.lose(g.shipGone(null)==='hull'?'The Brood swarmed the Icarus and she had to pull out. Squad Dust is left behind at Kappa Station.':'The Icarus could not wait. Squad Dust is left behind at Kappa Station.'); } },
      { when:g=>g.vars.landed && g.troops()>0 && g.aboard(null)>=g.troops(), do:g=>{ g.vars.won=true; g.clearTimer(); g.liftOff(null); g.complete('extract'); g.unmark('ex'); g.win('Squad Dust is aboard. Kappa Station is ours again, for now.'); } }
    ]
  }
);
