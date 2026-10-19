'use strict';
/* Swarm mission 1: The Waking — Dust Landing, seen from below.
   The two hives sleep in the northern caverns behind the blast doors the station crew welded shut.
   A small brood waits in the east tunnel. Squad Dust lands in the canyons and walks to Kappa Station.
   Until the doors open, the only way out of the caverns is to burrow (B). The Lunar Corps flies in two more teams;
   once a Pyro is on the ground they open the doors and come for the nests. */
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
    swarm:{ biomass:150, rate:1.2, guardMax:2, guardEvery:25, aggro:6, waves:null, cap:30, unlock:{ spitter:90, brute:9999 } },
    objectives:[
      { id:'kill', text:'Leave none of them alive' },
      { id:'nest', text:'Keep at least one hive alive' },
      { id:'feed', text:'Feed 2 of the fallen to a hive (0/2)', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ for(let x=40;x<=48;x++) g.wall({x,y:24},0,'north','door'); swarmBrood(); } },
      { when:g=>g.time>1, do:g=>{ g.brood_say('We wake. Warm things walk in the canyons. Q, W, E and R grow new brood at a nest; right-click calls the brood together; A sends it to feed.'); g.orderCorps('all','1','amove'); } },
      { when:g=>g.time>3, do:g=>g.say('Cmdr. Varga','Dust, this is Varga. You are down. Follow the canyons north-east to Kappa Station and report.') },
      { when:g=>g.time>14, do:g=>g.brood_say('Our nests are sealed in, so what hatches there tunnels through the rock to the gathering point. Press B to dig a small brood up anywhere they are not standing.') },
      { repeat:true, when:()=>true, do:g=>{ const n=g.corps().length+g.inbound(); g.setText('kill',`Leave none of them alive (${n} left${g.vars.drop2?'':', more will come'})`);
          const f=Math.min(2,g.stat('fed')); g.setText('feed',`Feed 2 of the fallen to a hive (${f}/2)`); if(f>=2) g.complete('feed'); } },
      // the squad reaches the station
      { when:g=>g.near('corps','1',5)>=2, do:g=>{ g.vars.station=g.time; g.say('Sgt. Kessler','We are at the station. Doors forced open from the inside. No crew.'); } },
      // first reinforcements: after a while at the station, or as soon as the squad is hurting
      { when:g=>!g.vars.drop1 && ((g.vars.station && g.time>g.vars.station+35) || (g.time>20 && g.corps().length<=3)), do:g=>{ g.vars.drop1=g.time;
          g.say('Cmdr. Varga','Kestrel is inbound to the station pad with rifles and a Pyro. Hold the platform, Dust.'); g.airdrop([['trooper',g.n(2)],['pyro',1]],18); } },
      // once the Pyro is down, they open the doors and come for the nests
      { when:g=>g.vars.drop1 && g.time>g.vars.drop1+20 && g.inbound()===0 && !g.vars.doorAt, do:g=>{ g.vars.doorAt=g.time+(g.has('pyro')?20:5); } },
      { when:g=>g.vars.doorAt && g.time>g.vars.doorAt, do:g=>{ g.openWall('north'); g.ping({x:44,y:24}); g.vars.open=true;
          g.say('Sgt. Kessler','Station log says the crew sealed the north tunnel and ran. Opening it now.'); g.brood_say('They opened the doors. Everything in the nests can reach them now. And they are coming for the nests.');
          g.orderCorps('all','3','amove'); } },
      { when:g=>g.vars.open && g.near('corps','3',4)>=1, do:g=>{ g.say('Cmdr. Varga','Biomass signature in the western cavern. Burn it.'); g.orderCorps('all',g.hiveAt('c')?'c':'a','amove'); g.vars.push=true; } },
      { when:g=>g.vars.push && !g.hiveAt('c') && !g.vars.east, do:g=>{ g.vars.east=true; g.say('Cmdr. Varga','West nest is ash. Second signature, east cavern. Move.'); g.orderCorps('all','a','amove'); } },
      // second team when the first is nearly gone
      { when:g=>g.vars.drop1 && g.time>g.vars.drop1+25 && !g.vars.drop2 && g.corps().length<=2 && g.inbound()===0, do:g=>{ g.vars.drop2=g.time;
          g.say('Cmdr. Varga','Dust is not answering. Kestrel, put the second team on the pad. Rifles and a Medic.'); g.airdrop([['trooper',g.n(3)],['gunner',1],['medic',1]],20); } },
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && !g.vars.go2, do:g=>{ g.vars.go2=true; g.orderCorps('all',g.vars.open?(g.hiveAt('c')?'c':'a'):'1','amove'); } },
      // the end
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && g.corps().length===0, do:g=>{ g.complete('kill'); g.complete('nest');
          g.win('The radio hisses and goes quiet. Kappa Station belongs to the Brood again, and the Brood remembers the taste.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('The nests are ash. What is left of the brood scatters into the dark.'); } }
    ]
  }
);
