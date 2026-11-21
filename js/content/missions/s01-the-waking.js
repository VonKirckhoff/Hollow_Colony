'use strict';
/* Swarm mission 1: The Waking — Dust Landing, seen from below.
   The two hives sleep in the northern caverns behind the blast doors the station crew welded shut.
   A small brood waits in the east tunnel. Squad Dust lands in the canyons and walks to Kappa Station.
   Until the doors open, the only way out of the caverns is to burrow (B). The Lunar Corps flies in two more teams;
   once the second ship is down, their Engineer blows the doors with a breaching charge (as in Dust Landing, DUST_BREACH) and they come for the nests.
   Kill or hit the Engineer while he arms it and he has to start over; two lost Engineers and Varga sends no more: the doors stay shut. */
const WAKING_BREACH={ replace:2, guard:{x:44,y:30}, clear:{x:44,y:33} };   /* replace: Engineers Varga sends after the first; guard: where the squad covers him; clear: where it waits for the blast */
function wakingEngineer(g){ return g.corps().find(e=>e.type==='engineer'&&!e.downed); }
SWARM_MISSIONS.push(
  {
    id:'swarm-waking', side:'swarm', title:'The Waking', map:'canyons',
    summary:'Beneath Kappa Station, the Brood stirs. Small warm things land in the canyons.',
    briefing:[
      'We slept under the station and we ate what the station gave us. Then the soft ones sealed us in with steel and ran.',
      'Now more of them fall out of the sky into the canyons. Their voices crackle. They walk towards the station. <i>Let them come. Let them come close.</i>',
      'A few of us wait in the east tunnel. Our nests lie behind the doors. What hatches there cannot walk to the station until the soft ones open them, so it tunnels through the rock and comes up at the gathering point. And with <b>Burrow</b> (B) a small brood digs up wherever they are not looking.',
      'Leave none of them alive. Keep at least one nest breathing.'
    ],
    start:{ camera:'2', rally:'2',
      units:[ ['trooper','P',4], ['gunner','P',1], ['medic','P',1] ],
      swarmUnits:[ ['drone','2',5], ['crawler','2',5] ], hives:['c','a'], hiveHp:2 },
    landingZone:{ tx:45, ty:37, scripted:true },
    swarm:{ biomass:150, rate:1.2, guardMax:2, guardEvery:25, aggro:6, waves:null, cap:30, seedling:true, unlock:{ spitter:90, brute:9999, seedling:60 } },
    oldEggs:[ {x:69,y:42} ],   /* an old egg in the east, near the tunnel: stand the brood by it and it wakes into a nest */
    objectives:[
      { id:'kill', text:'Leave none of them alive' },
      { id:'nest', text:'Keep at least one hive alive' },
      { id:'feed', text:'Bring 2 of the fallen home to a hive (0/2)', optional:true },
      { id:'egg', text:'Wake the old egg in the east, or root a Seedling (Z, then F)', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ for(let x=40;x<=48;x++) g.wall({x,y:24},0,'north','door'); swarmBrood(); } },
      { when:g=>g.time>1, do:g=>{ g.brood_say('We wake. Warm things walk in the canyons. Q, W, E and R grow new brood at a nest; right-click calls the brood together; A sends it to feed.'); g.orderCorps('all','1','amove'); } },
      { when:g=>g.time>3, do:g=>g.say('Cmdr. Varga','Dust, this is Varga. You are down. Follow the canyons north-east to Kappa Station and report.') },
      { when:g=>g.time>14, do:g=>g.brood_say('Our nests are sealed in, so what hatches there tunnels through the rock to the gathering point. Press B to dig a small brood up anywhere they are not standing.') },
      { repeat:true, when:()=>true, do:g=>{ const n=g.corps().length+g.inbound(); g.setText('kill',`Leave none of them alive (${n} left${g.vars.drop2?'':', more will come'})`);
          const f=Math.min(2,g.stat('fed')); g.setText('feed',`Bring 2 of the fallen home to a hive (${f}/2)`); if(f>=2) g.complete('feed'); if((G.swarm.founded||0)>0) g.complete('egg'); } },
      { when:g=>g.time>25, do:g=>g.brood_say('There is an old egg in the east, near our tunnel. Older than the station. Stand some of us by it and keep the soft ones away: it will wake into a nest.') },
      { when:g=>g.time>62, do:g=>g.brood_say('Our nests can grow a Seedling now (Z). Carry it somewhere quiet, far from them and from our other nests, and press F: it becomes a new nest.') },
      // the squad reaches the station
      { when:g=>g.near('corps','1',5)>=2, do:g=>{ g.vars.station=g.time; g.say('Sgt. Kessler','We are at the station. Doors forced open from the inside. No crew.'); } },
      // first reinforcements: after a while at the station, or as soon as the squad is hurting
      { when:g=>!g.vars.drop1 && ((g.vars.station && g.time>g.vars.station+35) || (g.time>20 && g.corps().length<=3)), do:g=>{ g.vars.drop1=g.time;
          g.say('Cmdr. Varga','Icarus is inbound to the station pad with rifles, a Pyro and an Engineer. Hold the platform, Dust.'); g.airdrop([['trooper',g.n(2)],['pyro',1],['engineer',1]],18); } },
      // once the ship is down, their Engineer puts a breaching charge on the doors; the rest cover him
      { when:g=>g.vars.drop1 && g.time>g.vars.drop1+20 && g.inbound()===0 && !g.vars.breach, do:g=>{ const B=DUST_BREACH; g.vars.breach=true;
          g.chargeSite(B.at,'breach',{ arm:B.arm, fuse:B.fuse, blast:B.blast, own:B.own, reset:true, opens:'north', name:'breaching charge' });
          g.say('Sgt. Kessler','Station log says the crew sealed the north tunnel and ran, and fried the door controls. Engineer, blow it. Everyone else, cover him.');
          g.brood_say('One of them kneels at our doors with something that ticks. Strike him while he works and he must begin again. When it beeps, get away from the doors.');
          g.ping(B.at); g.orderCorps(g.corps().filter(e=>e.type!=='engineer'),WAKING_BREACH.guard,'amove'); } },
      // the Engineer walks to the Breach point and stays there until the charge is live
      { repeat:true, when:g=>g.vars.breach && !g.vars.live && g.time>(g.vars.engNext||0), do:g=>{ g.vars.engNext=g.time+2; const e=wakingEngineer(g); if(!e) return; e.breacher=true;
          const at=ptWorld(DUST_BREACH.at); if(Math.hypot(e.x-at.x,e.y-at.y)>0.8*TILE&&!e.moving) g.orderCorps([e],DUST_BREACH.at,'move'); } },
      { when:g=>g.charge('breach')==='armed', do:g=>{ g.vars.live=true; for(const e of g.corps()) e.breacher=false;
          g.say('Sgt. Kessler',`Charge is live! ${DUST_BREACH.fuse} seconds, clear the door!`); g.orderCorps('all',WAKING_BREACH.clear,'move');
          g.brood_say('It beeps. Away from the doors, now!'); } },
      // a lost Engineer: Varga sends another, twice; after that the doors stay shut
      { repeat:true, when:g=>g.vars.breach && !g.vars.live && !g.vars.engCalled && !wakingEngineer(g) && g.inbound()===0 && g.corps().length>0, do:g=>{
          g.vars.engLost=(g.vars.engLost||0)+1; g.vars.engCalled=true;
          if(g.vars.engLost>WAKING_BREACH.replace){ g.say('Cmdr. Varga','No more Engineers to spare, Dust. Hold the station.'); g.brood_say('They have no one left to open the doors. Our nests are safe, for now.'); g.vars.noDoor=true; return; }
          g.say('Cmdr. Varga','You lost your Engineer. Icarus is bringing another. Keep him alive this time.'); g.airdrop([['engineer',1]],20); } },
      { repeat:true, when:g=>g.vars.engCalled && !g.vars.noDoor && wakingEngineer(g), do:g=>{ g.vars.engCalled=false; } },
      // the blast: the doors are gone and they come for the nests
      { when:g=>g.charge('breach')==='blown', do:g=>{ g.vars.open=true; g.ping({x:44,y:24});
          g.say('Sgt. Kessler','Doors are down. Moving in.'); g.brood_say('They broke the doors. Everything in the nests can reach them now. And they are coming for the nests.');
          g.orderCorps('all','3','amove'); } },
      { when:g=>g.vars.open && g.near('corps','3',4)>=1, do:g=>{ g.say('Cmdr. Varga','Biomass signature in the western cavern. Burn it.'); g.orderCorps('all',g.hiveAt('c')?'c':'a','amove'); g.vars.push=true; } },
      { when:g=>g.vars.push && !g.hiveAt('c') && !g.vars.east, do:g=>{ g.vars.east=true; g.say('Cmdr. Varga','West nest is ash. Second signature, east cavern. Move.'); g.orderCorps('all','a','amove'); } },
      // second team when the first is nearly gone
      { when:g=>g.vars.drop1 && g.time>g.vars.drop1+25 && !g.vars.drop2 && g.corps().length<=2 && g.inbound()===0, do:g=>{ g.vars.drop2=g.time;
          g.say('Cmdr. Varga','Dust is not answering. Icarus, put the second team on the pad. Rifles and a Medic.'); g.airdrop([['trooper',g.n(3)],['gunner',1],['medic',1]],20); } },
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && !g.vars.go2, do:g=>{ g.vars.go2=true; g.orderCorps('all',g.vars.open?(g.hiveAt('c')?'c':'a'):'1','amove'); } },
      // the end
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && g.corps().length===0, do:g=>{ g.complete('kill'); g.complete('nest');
          g.win('The radio hisses and goes quiet. Kappa Station belongs to the Brood again, and the Brood remembers the taste.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('The nests are ash. What is left of the brood scatters into the dark.'); } }
    ]
  }
);
