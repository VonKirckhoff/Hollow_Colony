'use strict';
/* Rogue 1: Dead Man's Frequency (Osprey Down until Nov 2026; the id stayed 'rogue-osprey-down')
   Rogue Strain is a sequel to the Corps campaign: the morning after High Ground, Tycho issues Containment Order 10 and your own
   soldier (Squad Dust, infected in the Matron's lair) runs. He calls the Osprey frequency; the crew meets him at the wreck in Hollow Colony.
   Cnudde cracks Maas's freezer in the lab the Corps sealed, the crew bottles the Brood it kills, and all of them slip away down the
   Brood tunnel in the south wall before Tycho's clean-up team lands. */
ROGUE_MISSIONS.push(
  {
    id:'rogue-osprey-down', title:'Dead Man\'s Frequency', map:'hollow', rogue:true,
    summary:'Meet the Osprey crew at the wreck, crack what Maas left behind, and disappear.',
    briefing:[
      'Containment Order 10 came down the morning after High Ground. Everyone who stood in the Matron\'s lair. Every patient at Kappa. You know what contained means. You did not wait for the transport.',
      'One frequency nobody at Tycho listens to any more: the Osprey\'s. You called it, and a voice you last heard over the barrel of a rifle answered. Kerckhoffs. The wreck at Hollow Colony, before dawn.',
      'The crew is starving for the strain: Devreese\'s stores ran dry and the Seed they took from the Matron sleeps in its case. The Corps sealed Maas\'s lab, but her freezer is still in it. Get Cnudde to it. Kill Brood with lead, not fire: whatever Mortier burns is useless, what a bullet leaves behind Devreese can bottle. Then down the Brood tunnel in the south wall, before Tycho\'s clean-up team lands.'
    ],
    start:{ salvage:0, camera:{x:41,y:13}, crewAt:{x:41,y:13},
      units:[], buildings:[], hives:['a','b','c'],
      shafts:[ {x:40,y:2,wall:'n',creep:3,eggs:1}, {x:61,y:21,wall:'e',creep:3,eggs:1}, {x:38,y:41,wall:'s',exit:true,label:'South tunnel'} ],
      swarmUnits:[ ['drone','3',3], ['crawler','5',3], ['drone','4',2], ['crawler','6',2] ] },
    tough:{ husk:{ hp:1.3, armor:0.2 } },
    swarm:{ shaftHeirs:true, biomass:40, rate:0.3, guardMax:4, guardEvery:14, aggro:8, aggroBrood:50, aggroCooldown:16, waves:null,
      hunt:{ every:35, afterEvery:20, budget:45, afterBudget:70, grow:0.2, growMax:10 } },
    objectives:[
      { id:'freezer', text:'Crack Dr. Maas\'s sample freezer in the lab (an Engineer)' },
      { id:'dna',     text:'Bottle Brood DNA (0/6)' }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          makeBuilding('wreck','none',41,9,true); const d=makeBuilding('door','none',53,4,true); d.tag='maasdoor';
          for(const u of g.crew()) u.hp=u.maxHp*rand(0.5,0.85);   /* weeks in the tunnels: nobody is at full strength */
          g.marker('fz','1','Sample freezer'); g.vars.fz=0; g.vars.fzT=g.time; } },
      { when:g=>g.time>1.5, do:g=>g.crewSay('Capt. Kerckhoffs',`So. Dust's own. Sound off, people. ...Six. Seven. Good. Welcome to the dead, ${selfName()}.`) },
      { when:g=>g.time>7, do:g=>g.say('Cmdr. Varga',`All units, Tycho Command. Containment Order 10 is in force. ${selfRankName()}, Squad Dust, report to the nearest transport. You will not be harmed.`) },
      { when:g=>g.time>12, do:g=>g.crewSay('Capt. Kerckhoffs','Leave the radio, Van Wesemael. Cnudde, the lab is north-east. Find me that freezer.') },
      { when:g=>g.time>15, do:g=>g.crewSay(selfName(),'They said the same to the Kappa patients. I watched the transport leave. It flew towards the furnaces.') },
      { when:g=>g.time>20, do:g=>g.crewSay('Devreese',`Whatever we kill here, shoot it, do not burn it. I want samples. And you, ${selfName()}: let me see your eyes. ...Twenty-five, maybe more. The Matron left something in you.`) },
      { when:g=>g.time>34, do:g=>g.crewSay('Mortier','No fire. Wonderful. I will just carry this thing around then.') },
      /* the lab door: the Corps sealed it after Dust brought Maas out (Corps mission 4) */
      { when:g=>g.crewNear({x:53,y:5},4)>0, do:g=>g.crewSay(selfName(),'Corps seal on the door. Maas is gone; we brought her out ourselves, back in the Hollow Colony job.') },
      /* the freezer: an Engineer of the crew works it open */
      { repeat:true, when:g=>g.vars.fzT!=null&&!g.vars.fzDone, do:g=>{ const dt=g.time-g.vars.fzT; g.vars.fzT=g.time; const p=g.where('1');
          const eng=g.crew().find(u=>u.def.builder&&!u.downed&&!(u.feral>0)&&Math.hypot(u.x-p.x,u.y-p.y)<1.8*TILE);
          if(eng){ g.vars.fz=Math.min(1,g.vars.fz+dt/12); eng.face=p.x>=eng.x?1:-1; if(Math.random()<0.4) G.fx.push({k:'spark',x:p.x+rand(-6,6),y:p.y-6,vx:rand(-40,40),vy:rand(-60,0),t:0.3,max:0.3,col:'#ffe2a8'}); }
          g.setText('freezer',`Crack Dr. Maas's sample freezer in the lab (an Engineer)${g.vars.fz>0?` ${Math.floor(g.vars.fz*100)}%`:''}`);
          if(g.vars.fz>=1){ g.vars.fzDone=true; g.complete('freezer'); g.unmark('fz'); SFX.play('complete');
            g.sample('hive','1',2,1.2); g.cache({x:54,y:9},{ stab:1 });
            g.crewSay('Cnudde','Open! Two vials of something purple, and one case of her stabilizer. She left more than Tycho knows.');
            g.vars.radioT=g.time+5; } } },
      { when:g=>g.vars.radioT&&g.time>g.vars.radioT, do:g=>{ g.say('Cmdr. Varga','Clean-up team, you are go for Hollow Colony. A signal on the Osprey frequency. Contain whatever you find.');
          g.setTimer(240,'Clean-up team'); g.vars.dustDue=true; } },
      { when:g=>g.vars.dustDue&&g.time>g.vars.radioT+9, do:g=>g.crewSay('Capt. Kerckhoffs','Clean-up team. They do not take prisoners, they take samples. Finish it and get underground.') },
      { repeat:true, when:g=>!g.vars.dnaDone, do:g=>{ const n=g.dna(); g.setText('dna',`Bottle Brood DNA (${Math.min(6,n)}/6)`); if(n>=6){ g.vars.dnaDone=true; g.complete('dna'); } } },
      /* both done: out through the Swarm tunnel in the south wall */
      { when:g=>g.isDone('freezer')&&g.vars.dnaDone, do:g=>{ g.addObjective('escape','Everyone into the Brood tunnel in the south wall (right-click it)'); g.exitMark('exit'); g.openExit();
          g.crewSay('Devreese','That is enough to start with. The tunnel in the south wall, Captain. They dug it; it goes deep.'); g.vars.escape=true; } },
      { repeat:true, when:g=>g.vars.escape&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the Brood tunnel in the south wall, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      { when:g=>g.vars.escape&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit');
          g.win('The Osprey crew drops into the Brood\'s own tunnels, one soldier heavier. Behind them the clean-up team finds an open freezer and a Dust tag on the floor. Tycho adds a name to the other list.'); } },
      /* the clean-up team lands: if the crew is still here, they will be found */
      { when:g=>g.vars.dustDue&&g.timerLeft()===0, do:g=>{ g.clearTimer(); g.pad('P','dust'); g.landShip('dust',3,false); g.vars.dustAt=g.time+3.2; } },
      { when:g=>g.vars.dustAt&&g.time>g.vars.dustAt, do:g=>{
          const squad=[...g.loyal('trooper','P',4),...g.loyal('gunner','P',1),...g.loyal('pyro','P',1),...g.loyal('medic','P',1)];
          g.hunt(squad.filter(u=>!u.def.heal)); g.say('Lt. Van Der Planck','Clean-up on the ground. Lab is north-east. ...Contact! Corps armour, no IFF. It is them. Contain them.');
          g.crewSay('Capt. Kerckhoffs','Do not let them pin us, get to the tunnel!'); } },
      /* the freezer needs an Engineer: if the crew has none left (dead, not just down), the job cannot be done */
      { when:g=>g.time>2&&!g.vars.fzDone&&!g.crew().some(u=>u.def.builder), do:g=>{ g.fail('freezer'); g.lose('Cnudde is dead, and nobody else in the crew can open Maas\'s freezer. Without her samples there is nothing to run with.'); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The clean-up team contains the Osprey crew at Hollow Colony. All seven of them, in sealed bags.') }
    ]
  }
);
