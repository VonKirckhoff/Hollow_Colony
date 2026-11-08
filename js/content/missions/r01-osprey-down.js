'use strict';
/* Rogue 1: Osprey Down
   Hollow Colony, before Squad Dust arrives. The crew climbs out of the burning Osprey, cracks Dr. Maas's sample freezer,
   bottles the Swarm it kills, and slips away down the Swarm tunnel in the south wall before Dust lands. */
ROGUE_MISSIONS.push(
  {
    id:'rogue-osprey-down', title:'Osprey Down', map:'hollow', rogue:true,
    summary:'Crawl out of the wreck, take what Dr. Maas kept, and disappear.',
    briefing:[
      'The Osprey came in hot over Hollow Colony with orders to bring out Dr. Elin Maas. It never touched the pad. The pilot is dead; the seven in the back are not.',
      'Captain Haesaert has heard the radio: Command thinks the Osprey went down with all hands, and Squad Dust is already on its way. The lab is a hundred metres from the wreck. Maas is behind a locked door, and her sample freezer is not.',
      'Get Cnudde to the freezer. Kill Swarm with lead, not fire: whatever Mortier burns is useless, but what a bullet leaves behind, Devreese can bottle. Then go where nobody follows: the Swarm tunnel in the south wall.'
    ],
    start:{ salvage:0, camera:{x:41,y:13}, crewAt:{x:41,y:13},
      units:[], buildings:[], hives:['a','b','c'],
      shafts:[ {x:40,y:2,wall:'n',creep:3,eggs:1}, {x:61,y:21,wall:'e',creep:3,eggs:1}, {x:38,y:41,wall:'s',creep:3,eggs:1} ],
      swarmUnits:[ ['drone','3',3], ['crawler','5',3], ['drone','4',2], ['crawler','6',2] ] },
    tough:{ husk:{ hp:1.3, armor:0.2 } },
    swarm:{ biomass:40, rate:0.3, guardMax:4, guardEvery:14, aggro:8, aggroBrood:50, aggroCooldown:16, waves:null,
      hunt:{ every:35, afterEvery:20, budget:45, afterBudget:70, grow:0.2, growMax:10 } },
    objectives:[
      { id:'freezer', text:'Crack Dr. Maas\'s sample freezer in the lab (an Engineer)' },
      { id:'dna',     text:'Bottle Swarm DNA (0/6)' }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          makeBuilding('wreck','none',41,9,true); const d=makeBuilding('door','none',53,4,true); d.tag='maasdoor';
          for(const u of g.crew()) u.hp=u.maxHp*rand(0.5,0.85);   /* nobody walks away from a crash unhurt */
          g.marker('fz','1','Sample freezer'); g.vars.fz=0; g.vars.fzT=g.time; } },
      { when:g=>g.time>1.5, do:g=>g.crewSay('Capt. Haesaert','Sound off. ...Six. Seven. Good. Pilot\'s gone. Everyone else on your feet, we are not staying in this wreck.') },
      { when:g=>g.time>7, do:g=>g.say('Cmdr. Varga','Osprey, Osprey, this is Tycho Command. Do you copy? ...Osprey, respond.') },
      { when:g=>g.time>12, do:g=>g.crewSay('Capt. Haesaert','Leave it, Braet. Radio stays off. Cnudde, the lab is north-east. Find me that freezer.') },
      { when:g=>g.time>20, do:g=>g.crewSay('Devreese','Captain. Before we left I read what Maas sent Command. She was splicing their blood into lab rats. The rats healed. Whatever we kill here, shoot it, do not burn it. I want samples.') },
      { when:g=>g.time>34, do:g=>g.crewSay('Mortier','No fire. Wonderful. I will just carry this thing around then.') },
      /* Maas behind her door: she will not open it */
      { when:g=>g.crewNear({x:53,y:5},4)>0, do:g=>{ g.say('Dr. Maas (intercom)','Who is out there? ...You are not Corps. Corps would have come in by now. Go away!');
          g.vars.maasT=g.time; } },
      { when:g=>g.vars.maasT&&g.time>g.vars.maasT+6, do:g=>g.crewSay('Capt. Haesaert','Osprey, doctor. We came for you.') },
      { when:g=>g.vars.maasT&&g.time>g.vars.maasT+11, do:g=>g.say('Dr. Maas (intercom)','The Osprey burned. I watched it from the window. ...Take what you want from my freezer. But this door stays shut.') },
      /* the freezer: an Engineer of the crew works it open */
      { repeat:true, when:g=>g.vars.fzT!=null&&!g.vars.fzDone, do:g=>{ const dt=g.time-g.vars.fzT; g.vars.fzT=g.time; const p=g.where('1');
          const eng=g.crew().find(u=>u.def.builder&&!u.downed&&!(u.feral>0)&&Math.hypot(u.x-p.x,u.y-p.y)<1.8*TILE);
          if(eng){ g.vars.fz=Math.min(1,g.vars.fz+dt/12); eng.face=p.x>=eng.x?1:-1; if(Math.random()<0.4) G.fx.push({k:'spark',x:p.x+rand(-6,6),y:p.y-6,vx:rand(-40,40),vy:rand(-60,0),t:0.3,max:0.3,col:'#ffe2a8'}); }
          g.setText('freezer',`Crack Dr. Maas's sample freezer in the lab (an Engineer)${g.vars.fz>0?` ${Math.floor(g.vars.fz*100)}%`:''}`);
          if(g.vars.fz>=1){ g.vars.fzDone=true; g.complete('freezer'); g.unmark('fz'); SFX.play('complete');
            g.sample('hive','1',2,1.2); g.cache({x:54,y:9},{ stab:1 });
            g.crewSay('Cnudde','Open! Cold in here... two vials of something purple, and a case of her stabilizer. Grab it all.');
            g.vars.radioT=g.time+5; } } },
      { when:g=>g.vars.radioT&&g.time>g.vars.radioT, do:g=>{ g.say('Cmdr. Varga','All stations, Tycho Command. The Osprey is confirmed lost with all hands. Squad Dust, you are go for Hollow Colony. Bring Dr. Maas home.');
          g.setTimer(240,'Dust lands'); g.vars.dustDue=true; } },
      { when:g=>g.vars.dustDue&&g.time>g.vars.radioT+9, do:g=>g.crewSay('Capt. Haesaert','Lost with all hands. ...Fine by me. Nobody hunts a dead man. Finish the job and get underground before Dust sees us.') },
      { repeat:true, when:g=>!g.vars.dnaDone, do:g=>{ const n=g.dna(); g.setText('dna',`Bottle Swarm DNA (${Math.min(6,n)}/6)`); if(n>=6){ g.vars.dnaDone=true; g.complete('dna'); } } },
      /* both done: out through the Swarm tunnel in the south wall */
      { when:g=>g.isDone('freezer')&&g.vars.dnaDone, do:g=>{ g.addObjective('escape','Everyone into the Swarm tunnel in the south wall'); g.marker('exit',{x:38,y:40},'South tunnel');
          g.crewSay('Devreese','That is enough to start with. The tunnel in the south wall, Captain. They dug it; it goes deep.'); g.vars.escape=true; } },
      { repeat:true, when:g=>g.vars.escape&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the Swarm tunnel in the south wall (${Math.min(g.crewNear({x:38,y:40},4),g.crewUp())}/${g.crewUp()})`) },
      { when:g=>g.vars.escape&&g.crewUp()>0&&g.crewNear({x:38,y:40},4)>=g.crewUp(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit');
          g.win('The Osprey crew drops into the Swarm\'s own tunnels. Behind them Squad Dust kicks in the lab door and finds Dr. Maas, and a clue nobody can explain. Nobody looks for the dead.'); } },
      /* Dust lands: if the crew is still here, they will be found */
      { when:g=>g.vars.dustDue&&g.timerLeft()===0, do:g=>{ g.clearTimer(); g.pad('P','dust'); g.landShip('dust',3); g.vars.dustAt=g.time+3.2; } },
      { when:g=>g.vars.dustAt&&g.time>g.vars.dustAt, do:g=>{
          const squad=[...g.loyal('trooper','P',4),...g.loyal('gunner','P',1),...g.loyal('pyro','P',1),...g.loyal('medic','P',1)];
          g.hunt(squad.filter(u=>!u.def.heal)); g.say('Sgt. Kessler','Dust on the ground. Spread out, the lab is north-east. Watch for the... Contact! Corps armour, no IFF! Who the hell are you?');
          g.crewSay('Capt. Haesaert','That is Dust. Do not let them pin us, get to the tunnel!'); } },
      { when:g=>g.time>2&&g.crew().length===0, do:g=>g.lose('The Osprey crew dies in Hollow Colony after all. This time the report is true.') }
    ]
  }
);
