'use strict';
/* Swarm mission 1: The Waking — Dust Landing, seen from below.
   The two hives sleep in the northern caverns behind the blast doors the station crew welded shut.
   A small brood waits in the east tunnel. Squad Dust lands in the canyons and walks to Kappa Station.
   Until the doors open, the only way out of the caverns is to burrow (B). The Lunar Corps flies in two more teams;
   once the second ship is down, their Engineer blows the doors with a breaching charge (as in Dust Landing, DUST_BREACH) and they come for the nests.
   Two Sentry Guns already stand at the station (start.buildings): one watches the mouth of the north tunnel, one the way in from the east shaft.
   Kill or hit the Engineer while he arms it and he has to start over; two lost Engineers and Varga sends no more: the doors stay shut.
   Nov 2026: once the east nest (a) is ash too (only a young nest can keep the Brood alive then), the squad holds at the east cavern,
   Varga drops a relief team (always with a Medic) that walks to them, they wait until every man is back to full health,
   and then they all fall back to the station by their Landing Zone and dig in there for the rest of the mission. */
const WAKING_BREACH={ replace:2, guard:{x:44,y:30}, clear:{x:44,y:33} };   /* replace: Engineers Varga sends after the first; guard: where the squad covers him; clear: where it waits for the blast */
const WAKING_REGROUP={ at:'a', meet:6, home:{x:45,y:35}, homeR:6, medicSelf:0.5 };   /* at: where the squad waits for the relief team; meet: tiles; home: their base by the LZ; homeR: how far from it they may stray; medicSelf: share of his heal rate a Medic patches himself up with when no brood is near */
function wakingGoal(g){ if(g.vars.home) return WAKING_REGROUP.home; if(g.vars.regroup) return WAKING_REGROUP.at; return g.vars.open?(g.hiveAt('c')?'c':'a'):'1'; }
function wakingFar(g,at,r){ const p=ptWorld(at); return g.corps().filter(e=>!e.downed&&Math.hypot(e.x-p.x,e.y-p.y)>r*TILE); }
function wakingEngineer(g){ return g.corps().find(e=>e.type==='engineer'&&!e.downed); }
SWARM_MISSIONS.push(
  {
    id:'swarm-waking', side:'swarm', title:'The Waking', map:'canyons',
    summary:'Beneath Kappa Station, the Brood stirs. Small warm things land in the canyons.',
    briefing:[
      'We slept under the station and we ate what the station gave us. Then the soft ones sealed us in with steel and ran.',
      'Now more of them fall out of the sky into the canyons. Their voices crackle. They walk towards the station, where two of their guns already stand: one watches the tunnel to our nests, one the way in from the east. <i>Let them come. Let them come close.</i>',
      'A few of us wait in the east tunnel. Our nests lie behind the doors. What hatches there cannot walk to the station until the soft ones open them, so it tunnels through the rock and comes up at the gathering point. And with <b>Burrow</b> (B) a small brood digs up wherever they are not looking.',
      'Leave none of them alive. Keep at least one nest breathing.'
    ],
    start:{ camera:'2', rally:'2',
      units:[ ['trooper','P',4], ['gunner','P',1], ['medic','P',1] ],
      buildings:[ ['sentry',{x:41,y:32}], ['sentry',{x:53,y:35}] ],   /* Nov 2026: two Sentry Guns already set up at Kappa Station, one on the north tunnel, one on the east approach (Dust Landing's buildMax is 2) */
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
      { when:g=>g.time>40, do:g=>g.brood_say('Two guns of metal stand at the station and never sleep. One watches the tunnel, one the east. Go round them, or go at them many at once.') },
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
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && !g.vars.go2, do:g=>{ g.vars.go2=true; g.orderCorps('all',wakingGoal(g),'amove'); } },
      // Nov 2026: both old nests are ash (a young nest keeps the Brood alive): hold at the east cavern and wait for the relief team
      { when:g=>g.vars.open && g.vars.push && !g.hiveAt('c') && !g.hiveAt('a') && g.hives()>0 && g.corps().length>0, do:g=>{ g.vars.regroup=g.time;
          g.say('Sgt. Kessler','Both nests are burning. Dust is spent, Commander. Requesting relief at the east cavern.');
          g.say('Cmdr. Varga','Copy, Kessler. Icarus is bringing a fresh team and a Medic. Hold where you are until they reach you.');
          g.brood_say('Both old nests are ash. Our young nest still breathes, and they do not know where. They stop. They wait for more of them.');
          g.orderCorps('all',WAKING_REGROUP.at,'amove'); g.airdrop([['trooper',g.n(2)],['medic',1]],20,WAKING_REGROUP.at); } },
      // the squad stays together at the east cavern (and the relief team walks up to them)
      { repeat:true, when:g=>g.vars.regroup && !g.vars.home && g.time>(g.vars.rgNext||0), do:g=>{ g.vars.rgNext=g.time+4;
          const far=wakingFar(g,WAKING_REGROUP.at,WAKING_REGROUP.meet).filter(e=>!e.target&&!(e.order&&e.order.type!=='hold'));
          if(far.length) g.orderCorps(far,WAKING_REGROUP.at,'amove'); } },
      // met: everyone on the map is together and no ship is on its way
      { when:g=>g.vars.regroup && g.time>g.vars.regroup+21 && g.inbound()===0 && g.corps().length>0 && !wakingFar(g,WAKING_REGROUP.at,WAKING_REGROUP.meet).length, do:g=>{ g.vars.met=g.time;
          g.say('Sgt. Kessler','Relief is with us. Medic, patch everyone up before we move. Nobody walks back bleeding.');
          g.brood_say('More of them, and one that mends. They will not move until every one of them is whole.'); } },
      // healing: the Medic works on the others and patches himself up when no brood is near; no Medic left = Varga sends one
      { repeat:true, when:g=>g.vars.met && !g.vars.home, do:g=>{ const last=g.vars.mdT||g.time; g.vars.mdT=g.time; const dt=Math.min(1,g.time-last);
          const meds=g.corps().filter(e=>e.def.heal&&!e.downed);
          for(const m of meds){ const quiet=!G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,m)<m.def.sight*TILE);
            if(quiet&&m.hp<m.maxHp) m.hp=Math.min(m.maxHp,m.hp+m.def.heal*WAKING_REGROUP.medicSelf*dt); }
          if(!meds.length && g.inbound()===0 && !g.vars.medCalled && g.corps().length>0){ g.vars.medCalled=true; g.say('Cmdr. Varga','You lost your Medic. Icarus is bringing another one.'); g.airdrop([['medic',1]],20,WAKING_REGROUP.at); }
          if(meds.length) g.vars.medCalled=false; } },
      // everyone whole: back to the station by the LZ
      { when:g=>g.vars.met && g.time>g.vars.met+3 && g.inbound()===0 && g.corps().length>0 && g.corps().every(e=>!e.downed&&e.hp>=e.maxHp-0.5), do:g=>{ g.vars.home=g.time;
          g.say('Sgt. Kessler','Everyone is green. Fall back to the station and dig in by the pad.');
          g.say('Cmdr. Varga','Good. Hold Kappa Station, Dust. Whatever is left down there will come to you.');
          g.brood_say('They go back to the station, to the place where the sky ship lands. Find them there. Leave none of them alive.');
          g.ping(WAKING_REGROUP.home); g.orderCorps('all',WAKING_REGROUP.home,'amove'); } },
      // at the base: they stay there and defend it; anyone who strays too far (and is not fighting) walks back
      { repeat:true, when:g=>g.vars.home && g.time>(g.vars.hmNext||0), do:g=>{ g.vars.hmNext=g.time+5;
          const far=wakingFar(g,WAKING_REGROUP.home,WAKING_REGROUP.homeR).filter(e=>!e.target&&!(e.order&&e.order.type!=='hold'));
          if(far.length) g.orderCorps(far,WAKING_REGROUP.home,'amove'); } },
      // the end
      { when:g=>g.vars.drop2 && g.time>g.vars.drop2+24 && g.inbound()===0 && g.corps().length===0, do:g=>{ g.complete('kill'); g.complete('nest');
          g.win('The radio hisses and goes quiet. Kappa Station belongs to the Brood again, and the Brood remembers the taste.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('The nests are ash. What is left of the brood scatters into the dark.'); } }
    ]
  }
);
