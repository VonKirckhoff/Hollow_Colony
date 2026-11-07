'use strict';
/* Swarm mission 5: The Hollow Choir — The Hollow Colony, seen from the hives.
   A search team lands in the south-west, walks to the research lab in the north-east and takes Dr. Maas out of her locked room;
   then it heads for the extraction pad in the south-east. Their dropship lands when the clock runs out.
   Win: Dr. Maas dies. Lose: she reaches the pad once the dropship is down, or every nest burns.
   The ruins are full of fallen colonists (colonistBodies): bring them home for Husks, the colony's choir. */
SWARM_MISSIONS.push(
  {
    id:'swarm-choir', side:'swarm', title:'The Hollow Choir', map:'hollow',
    summary:'Where it all began, the soft ones come for the one who knows us. She must not leave.',
    briefing:[
      'This is where we first woke: the colony of narrow doors and quiet halls. Its people still lie where they fell, and they still sing for us.',
      'A pack of soft ones has landed in the south-west. They walk to the hall of glass in the north-east, where the one who studied us hides behind a locked door. They will take her to the flat place in the south-east, and a flying thing will carry her away.',
      '<b>She must not leave.</b> Kill her before she is on board. The walls and doors are ours: lure them apart, wait in the halls.',
      'Bring the fallen colonists home: what grows out of them sings. Keep at least one nest alive.'
    ],
    landingZone:{ tx:58, ty:39, scripted:true },
    start:{ camera:{x:28,y:20}, rally:{x:28,y:18},
      units:[ ['trooper','P',5], ['gunner','P',1], ['pyro','P',1], ['medic','P',1], ['engineer','P',1] ],
      swarmUnits:[ ['crawler','b',6], ['drone','b',4], ['spitter','b',1] ],
      hives:['a','b','c'], hiveHp:1.3 },
    swarm:{ biomass:160, rate:1.0, guardMax:2, guardEvery:22, aggro:6, waves:null, cap:36, seedling:true, unlock:{ spitter:0, brute:240, seedling:90 } },
    objectives:[
      { id:'maas', text:'Dr. Maas must not leave the colony' },
      { id:'fed',  text:'Bring 5 of the fallen home (0/5)', optional:true },
      { id:'nest', text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ swarmBrood(); colonistBodies([{x:20,y:16},{x:39,y:17},{x:40,y:35},{x:61,y:32},{x:38,y:3},{x:12,y:18},{x:44,y:28}],'engineer');
          makeBuilding('wreck','none',41,9,true); const d=makeBuilding('door','corps',53,4,true); d.tag='maasdoor'; g.vars.door=d;
          g.setTimer(720,'Dropship'); g.marker('lab',{x:53,y:5},'Her room'); g.marker('pad','2','Their pad');
          g.orderCorps(g.corps(),'1','amove'); } },
      { when:g=>g.time>1, do:g=>g.brood_say('They walk from the south-west towards the hall of glass. The fallen colonists lie all over the halls: bring them home and they sing.') },
      { when:g=>g.time>3, do:g=>g.say('Sgt. Kessler','Dust on the ground. Lab is north-east, pad is south-east. Twelve minutes till Kestrel. Move.') },
      /* at the lab: they open her door and she comes out */
      { when:g=>g.near('corps','1',7)>=2, do:g=>{ g.vars.atLab=g.time; g.say('Sgt. Kessler','We are at the lab. Cutting the door. Doctor, it is the Corps!'); } },
      { when:g=>g.vars.atLab && g.time>g.vars.atLab+12, do:g=>{ if(g.vars.door&&!g.vars.door.dead) g.vars.door.dead=true; g.unmark('lab');
          g.vars.maas=g.spawn('scientist',{x:53,y:6},1)[0]; maasLead(g); g.say('Dr. Maas','You came. Please, get me out of here, they are in the walls.');
          g.brood_say('The one who studied us. She is out of her shell. She must not leave.'); g.marker('maas',{x:53,y:6},'Dr. Maas');
          g.orderCorps(g.corps().filter(u=>u!==g.vars.maas),'2','amove'); } },
      { repeat:true, when:g=>!!g.vars.maas&&!g.vars.maas.dead, do:g=>{ maasLead(g); const m=g.vars.maas; G.markers=G.markers.filter(k=>k.id!=='maas'); G.markers.push({id:'maas',x:m.x,y:m.y,label:'Dr. Maas',col:'#ff5a4f'}); } },
      /* a second team holds the pad */
      { when:g=>g.time>360, do:g=>{ g.say('Dropship Kestrel','Kestrel dropping a fire team on the pad to hold it open.'); g.airdrop([['trooper',g.n(3)],['gunner',1]],15); } },
      { when:g=>g.timerLeft()<=60 && g.time>5, do:g=>g.say('Dropship Kestrel','One minute out. Get her to the pad.') },
      { repeat:true, when:()=>true, do:g=>{ const f=Math.min(5,g.stat('fed')); g.setText('fed',`Bring 5 of the fallen home (${f}/5)`); if(f>=5) g.complete('fed'); } },
      { when:g=>g.vars.maas && g.vars.maas.dead, do:g=>{ g.unmark('maas'); g.complete('maas'); g.complete('nest'); g.win('The one who studied us lies still in the halls. No one will carry what she knew. The colony sings.'); } },
      { when:g=>g.timerLeft()===0 && g.vars.maas && !g.vars.maas.dead && dist(g.vars.maas,ptWorld('2'))<4*TILE, do:g=>{ g.fail('maas'); g.lose('The flying thing lifts off with her inside. What she knows about us leaves the moon.'); } },
      { when:g=>g.timerLeft()===0 && !g.vars.maas, do:g=>{ g.fail('maas'); g.lose('They took too long, but so did we: the flying thing came for them anyway, and she went with it.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('Every nest in the colony burns. The choir falls silent.'); } }
    ]
  }
);
/* Dr. Maas follows the nearest soldier of the search team */
function maasLead(g){ const m=g.vars.maas; if(!m||m.dead) return; if(m.lead&&!m.lead.dead&&!m.lead.downed) return;
  m.lead=g.corps().filter(u=>u!==m&&!u.downed&&!u.def.escort).sort((a,b)=>dist(a,m)-dist(b,m))[0]||null; }
