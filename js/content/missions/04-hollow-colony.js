'use strict';
/* Mission 4: The Hollow Colony */
MISSIONS.push(
  {
    id:'hollow-colony', title:'The Hollow Colony', map:'hollow',
    summary:'Rescue the last survivor from the colony where it all began.',
    briefing:[
      'A faint distress beacon is transmitting from Hollow Colony, the first settlement on the moon and the place where the Brood first appeared.',
      'The signal belongs to Dr. Elin Maas, the biologist who studied the Brood before the colony fell. She is holed up in the research lab with a data core that could explain how the Brood breeds.',
      'Find her and bring her and the core to the extraction pad in the south-east. Your Engineer carries a folded Sentry Gun, the only one we could spare. Lose it and Icarus can fly a new one to your landing pad, but your Engineer will have to walk back for it.'
    ],
    start:{ salvage:0, camera:'P',
      units:[ ['trooper','P',4], ['gunner','P',1], ['pyro','P',1], ['medic','P',1], ['engineer','P',1,{carry:'sentry'}] ],
      buildings:[], hives:['a','b','c'],
      /* Swarm tunnels breaking out of the map wall, each with a little creep: bodies are dragged there and Husks hatch there.
         Once every hive is burnt, the rescue waves come out of these, so the escort is never quiet. */
      shafts:[ {x:40,y:2,wall:'n',creep:3,eggs:1}, {x:61,y:21,wall:'e',creep:3,eggs:1}, {x:38,y:41,wall:'s',creep:3,eggs:1} ] },
    limits:{ sentry:1 },
    noBuild:['sentry'],   /* one Sentry Gun: the Engineer cannot build one here; a lost sentry is replaced by dropship on the landing pad */
    tough:{ sentry:{ hp:2, armor:0.3 }, husk:{ hp:1.6, armor:0.3 } },   /* the one sentry and the Husks take a lot more killing here */
    swarm:{ biomass:40, rate:0.3, guardMax:4, guardEvery:14, aggro:9, aggroBrood:60, aggroCooldown:15, waves:null,   /* no waves, but the hives watch the road; with the hives gone the rescue waves climb out of the wall tunnels */
      hunt:{ every:25, afterEvery:18, budget:60, afterBudget:80, grow:0.25, growMax:14 } },   /* the colony is theirs: the hunt comes sooner, bigger and keeps growing longer than elsewhere */
    objectives:[ { id:'lab', text:'Find Dr. Maas in the research lab' } ],
    // Dropship timer starts at the rescue; the mission is won once it has landed and Dr. Maas is on the pad.
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          /* the first rescue dropship, crashed outside the lab; and the door of the back room Maas locked herself into */
          makeBuilding('wreck','none',41,9,true); const d=makeBuilding('door','corps',53,4,true); d.tag='maasdoor';
          g.pad('P','home');   /* the landing pad where the squad was set down: replacement sentries land here */
          g.marker('lab',{x:53,y:5},'Research lab'); g.showcase('osprey',{x:42,y:10},'Crashed Osprey','#ff8a5c'); g.reveal('1',3,5); G.shaftWarned=true; } },   /* (our own line about the wall tunnels, below) */
      { when:g=>g.near('corps',{x:40,y:3},5)>0 || g.near('corps',{x:60,y:21},5)>0 || g.near('corps',{x:38,y:40},5)>0, do:g=>g.say('Sgt. Kessler','Look at the wall. They chewed a tunnel straight through the rock, and that purple muck is growing round it.') },
      { when:g=>g.vars.rescueT && g.hives()===0, do:g=>g.say('Dr. Maas','Burning the nests is not enough. They come out of the walls: the whole colony is riddled with their tunnels. Keep moving!','alert') },
      { when:g=>g.near('corps',{x:42,y:10},6)>0, do:g=>{ g.unmark('osprey'); if(!G.demo) markOspreyLost(); g.say('Sgt. Kessler','That is the Osprey. The first bird they sent for her. Still burning... nobody walked away from that.'); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, the colony is a maze of ruins. Stay together. The lab is in the north-east block.') },
      { when:g=>g.time>10, do:g=>g.say('Sgt. Kessler','Our Engineer is hauling our one Sentry Gun. Press D to set it up, U to pack it again. We cannot build another out here.') },
      /* the sentry is gone (destroyed, or lost with the Engineer carrying it): Icarus flies a new one to the landing pad */
      { repeat:true, when:g=>g.time>3 && g.supplies('sentry')===0, do:g=>{ const n=g.vars.sentryDrops=(g.vars.sentryDrops||0)+1, t=({easy:60,normal:80,hard:100})[G.diffKey]||80;
          g.supplyDrop('sentry','home',t);
          g.say('Cmdr. Varga',n===1?`We lost the Sentry Gun. Icarus is flying a replacement to your landing pad, ${t} seconds out. Your Engineer has to go and get it.`:`Another sentry down. One more on its way to the landing pad, ${t} seconds. Make this one count.`); } },
      { when:g=>g.near('corps','3',5)>0 || g.near('corps','5',4)>0, do:g=>{
          g.say('Sgt. Kessler','Brood bodies here. Shot clean through, skulls taken. That was not us.'); g.vars.clue=true; } },
      /* the door of her back room opens, and she steps out to the squad */
      { when:g=>g.near('corps',{x:53,y:5},3.5)>0||g.near('corps','1',2)>0, do:g=>{ g.vars.doorAt=g.time; g.openWall('maasdoor'); SFX.play('ready');
          g.say('Dr. Maas','Corps? Is that the Corps? Wait, wait, I am opening the door!'); } },
      { when:g=>g.vars.doorAt && g.time>g.vars.doorAt+1.4, do:g=>{
          g.complete('lab'); g.unmark('lab');
          g.vars.maas=g.spawn('scientist',{x:53,y:4},1)[0]; g.vars.rescueT=g.time;
          const s=g.vars.maas, near=nearestOf(s,e=>e.kind==='unit'&&e.faction==='corps'&&!e.def.escort); if(near){ s.order={type:'move',x:near.x,y:near.y+TILE}; setPath(s,s.order.x,s.order.y); }
          g.say('Dr. Maas','Thank God. I have the core. Get me to the extraction pad, quickly. They hear everything.'); g.setTimer(240,'Dropship'); g.pad('2','extract'); g.landShip('extract',240);
          g.addObjective('escort','Bring Dr. Maas to the extraction pad and get everyone aboard before the dropship lifts off'); g.addObjective('maas','Dr. Maas must survive');
          g.marker('lz','2','Extraction'); g.vars.nextWave=g.time+30; } },
      { when:g=>g.vars.rescueT && g.timerLeft()<=60, do:g=>g.say('Dropship Icarus','Icarus here. One minute out. Keep that pad clear.') },
      { repeat:true, when:g=>g.vars.rescueT && g.time>g.vars.nextWave, do:g=>{ g.wave(80+(g.vars.waveN=(g.vars.waveN||0)+1)*25, g.vars.maas&&!g.vars.maas.dead?g.vars.maas:undefined);   /* every wave comes for Dr. Maas */ g.vars.nextWave=g.time+35; } },
      { when:g=>g.vars.maas && g.vars.maas.dead, do:g=>{ g.fail('maas'); g.lose('Dr. Maas is dead. The data core is lost.'); } },
      /* the pickup (Nov 2026): the Icarus waits 90 seconds on the pad; the Brood goes for its hull; everyone, Dr. Maas too, up the ramp in time */
      { when:g=>g.vars.rescueT && g.shipDown('extract') && !g.vars.landed, do:g=>{ g.vars.landed=true; g.setTimer(g.shipLeft('extract'),'Lift-off'); g.say('Dropship Icarus','Wheels down. Ninety seconds, then I leave this place to them. Doctor first!'); } },
      { repeat:true, when:g=>g.vars.landed && !g.vars.won, do:g=>g.setText('escort',`Everyone aboard the dropship before it lifts off, Dr. Maas too (${g.aboard('extract')}/${g.troops()})`) },
      { when:g=>g.vars.landed && !g.vars.won && g.shipGone('extract'), do:g=>{ g.clearTimer(); g.fail('escort'); g.lose(g.shipGone('extract')==='hull'?'The Brood tears into the Icarus and she pulls out. The colony keeps Dr. Maas, and Squad Dust with her.':'The Icarus could not wait. The colony keeps Dr. Maas, and Squad Dust with her.'); } },
      { when:g=>g.vars.landed && g.vars.maas && !g.vars.maas.dead && g.troops()>0 && g.aboard('extract')>=g.troops(), do:g=>{ g.vars.won=true; g.clearTimer(); g.liftOff('extract');
          g.complete('escort'); g.complete('maas'); g.unmark('lz');
          g.win('Dr. Maas and the data core are aboard. As the dropship lifts off, the colony falls silent behind them. Below, something old is still singing.'); } }
    ]
  }
);
