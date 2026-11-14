'use strict';
/* Rogue 7: Among Them
   Tycho Maw, the night after Hunted. Over the Highlands the Seed broke out of its case and burrowed home to the Matron's lair; the crew
   follows it. The Magpie sets the crew down on the landing ridge in the south; the way down into the Maw Depths
   is an old shaft in the north wall, right under the biggest nest. The plain is the Swarm's: five hives, far too many to fight.
   The veil (mission.veil, 31-rogue.js): a crew member with ROGUE.veil.taint or more (or Hive Scent) walks among the brood unseen until he fires.
   Three choir pods by the nests keep the brood awake. A veiled crew member quiets one by standing at it (job.pod seconds); each pod that
   goes quiet drops a Hive sample and sends the brood after the clean ones on the ridge. Once all three are quiet, the brood sleeps for
   job.lull seconds: the whole crew crosses the nest and goes down the shaft. Not far enough gone? The old burrow by the ridge has creep.
   job: the numbers of this job (dev panel, "This job"); burrow = drones that climb out of the old burrow by the ridge when the first pod goes quiet (one more for the second). */
const AT_PODS=[ { at:{x:61,y:27}, label:'East choir pod' }, { at:{x:60,y:5}, label:'North-east choir pod' }, { at:{x:10,y:4}, label:'North-west choir pod' } ];
ROGUE_MISSIONS.push(
  {
    id:'rogue-among-them', title:'Among Them', map:'maw', rogue:true, veil:true,
    summary:'The Seed went home. Follow it through the Brood\'s own nest.',
    briefing:[
      'Somewhere over the Highlands, the Seed woke up. Devreese heard the case crack before she saw it: roots through the lid, through the Magpie\'s floor plating, and gone the moment we touched down. It went home. Down, into the Maw Depths, to the lair where the Matron died.',
      'The way into the Depths is an old mine shaft in the north wall, and the Brood has built its biggest nest right on top of it. Five hives on that plain. We cannot fight our way through that. But the brood smells its own. Anyone with enough strain in the blood, forty or more, or the Hive Scent, can walk among them and they look right through him. As long as he does not fire a shot.',
      'Three choir pods by the nests keep the brood awake. Our tainted ones go in and stand at the pods until they go quiet; the clean ones hold the landing ridge, because every pod that goes quiet sends the brood looking for warm bodies. When all three are quiet the nest sleeps, and we all walk through it. Not far enough gone? The old burrow by the ridge has mycel. Stand in it.'
    ],
    stab:1,
    job:{ pod:12, lull:90, stir:65, burrow:3 },
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['a','b','c','d','e'], hiveHp:1.5,
      shafts:[ {x:35,y:2,wall:'n',exit:true,label:'The way down'}, {x:17,y:46,wall:'s',creep:3,eggs:0} ],
      swarmUnits:[ ['drone','a',4], ['crawler','a',2], ['drone','b',5], ['spitter','b',2], ['crawler','b',3], ['drone','c',4], ['spitter','c',1],
        ['drone','d',3], ['crawler','d',2], ['drone','e',4], ['spitter','e',1], ['drone','1',4], ['crawler','1',3] ] },
    swarm:{ biomass:80, rate:0.4, guardMax:6, guardEvery:12, aggro:8, waves:null, unlock:{ spitter:60, brute:300 },
      hunt:{ every:35, afterEvery:20, budget:50, afterBudget:60, grow:0.25, growMax:8 } },
    objectives:[
      { id:'pods', text:'Quiet the three choir pods: a veiled crew member stands at each (0/3)' },
      { id:'calm', text:'Let nobody go feral', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ g.vars.pods=AT_PODS.map((p,i)=>{ const b=makeBuilding('choirpod','none',p.at.x,p.at.y,true); b.invuln=true; b.quietP=0; b.label=p.label; g.marker('pod'+i,p.at,'Choir pod'); return b; });
          g.vars.pt=g.time; const ex=G.ents.find(e=>e.exit); if(ex){ const s=exitSpot(ex); g.marker('down',{x:Math.floor(s.x/TILE),y:Math.floor(s.y/TILE)},'The way down'); }
          g.marker('burrow',{x:17,y:44},'Old burrow (mycel)'); } },
      { when:g=>g.time>1, do:g=>g.say('Magpie','That is as close as I go. And take whatever that thing was that ate my deck plating. No charge, no names.') },
      { when:g=>g.time>6, do:g=>g.crewSay('Capt. Kerckhoffs','Listen to that. The whole plain is singing. It knows the Seed came home. Devreese, tell them.') },
      { when:g=>g.time>12, do:g=>{ const kin=g.crew().filter(u=>g.veilKin(u)).map(u=>u.vet.name);
          g.crewSay('Devreese',kin.length?`${kin.join(', ')}: you are far enough gone. They will not see you, as long as you do not shoot. Hold fire (Q) before you set one foot in there.`
            :'None of us is far enough gone yet. Forty, at least. The old burrow west of the ridge still has mycel on it. Stand in it until the strain is high enough. I am sorry.'); } },
      { when:g=>g.time>22, do:g=>g.crewSay('Mortier','And the rest of us stand on this ridge and wait for them to come. Wonderful. At least out here I can burn something.') },
      { when:g=>g.time>34, do:g=>g.crewSay('Cnudde','Mind the mycel in there. It pushes the strain up the longer you stand on it, and those pods sit right on it.') },
      /* the pods: a veiled crew member at a pod quiets it; it slips back if he leaves */
      { repeat:true, when:g=>!!g.vars.pods&&!g.vars.podsDone, do:g=>{ const dt=g.time-g.vars.pt; g.vars.pt=g.time; const J=G.mission.job; let n=0;
          g.vars.pods.forEach((b,i)=>{ if(b.quiet){ n++; g.unmark('pod'+i); return; }
            const near=g.crew().filter(u=>!u.downed&&!(u.feral>0)&&Math.hypot(u.x-b.x,u.y-b.y)<1.8*TILE), kin=near.find(u=>g.veiled(u));
            if(kin){ b.quietP=Math.min(1,b.quietP+dt/J.pod); kin.face=b.x>=kin.x?1:-1;
              if(!g.vars.podSaid){ g.vars.podSaid=true; g.crewSay(kin.vet.name,kin.vet.id==='osp-self'?'I heard this song in her lair. Right before she died.':'It is so loud... like it is singing inside my head. Stay with it. Stay with it.'); } }
            else { b.quietP=Math.max(0,b.quietP-dt/J.pod*0.5);
              if(near.length&&!g.vars.cleanSaid){ g.vars.cleanSaid=true; g.crewSay('Devreese','It will not quiet for a clean one. Only for one of its own: someone who is veiled.'); } }
            if(b.quietP>=1){ b.quiet=true; n++; g.unmark('pod'+i); SFX.play('squelch',b.x,b.y); G.fx.push({k:'boom',x:b.x,y:b.y,t:0.5,max:0.5,r:30,col:'#c38bff'});
              g.sample('hive',{x:Math.floor(b.x/TILE),y:Math.floor(b.y/TILE)},1,1.2);
              const clean=g.crew().filter(u=>!u.downed&&!g.veilKin(u)), aim=clean.length?clean[0]:g.where('P'); g.wave(J.stir,aim);
              if(n<3){ const k=Math.max(1,Math.round((J.burrow+n-1)*G.diff.budget)), up=[...g.spawn('drone',{x:17,y:44},k,{order:'hunt'}),...g.spawn(n>1?'spitter':'crawler',{x:17,y:44},1,{order:'hunt'})];   /* the old burrow by the ridge wakes too */
                for(const u of up){ emergeStart(u); u.order={type:'amove',x:aim.x,y:aim.y}; setPath(u,aim.x,aim.y); }
                if(!g.vars.burrowSaid){ g.vars.burrowSaid=true; g.crewSay('Mortier','The old burrow! They are coming up right next to us! West side, west side!'); } }
              g.crewSay(['Capt. Kerckhoffs','Van Wesemael','Devreese'][n-1]||'Capt. Kerckhoffs',[
                'One pod is quiet. Hear that? Half the plain just turned its head. Ridge, they are coming for you!',
                'Second one is down. Here they come again. Keep the line, keep the line!',
                'The last one... it is so quiet. They are lying down. All of them. Everyone, now, through the nest!'][n-1]||''); } });
          g.setText('pods',`Quiet the three choir pods: a veiled crew member stands at each (${n}/3)`);
          if(n>=3){ g.vars.podsDone=true; g.complete('pods'); g.lull(J.lull); g.setTimer(J.lull,'The brood sleeps'); g.unmark('burrow');
            g.addObjective('escape','Everyone through the nest and down the shaft in the north wall (right-click it)'); g.openExit(); } } },
      { repeat:true, when:g=>g.vars.podsDone&&!g.vars.won, do:g=>g.setText('escape',`Everyone through the nest and down the shaft in the north wall, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      /* the brood wakes */
      { when:g=>g.vars.podsDone&&!g.vars.won&&g.timerLeft()===0, do:g=>{ g.clearTimer(); const ex=G.ents.find(e=>e.exit); g.wave(70,ex?{x:Math.floor(ex.x/TILE),y:Math.floor(ex.y/TILE)+3}:'1');
          g.crewSay('Devreese','They are waking up! Whoever is still out there, run for the shaft!'); } },
      /* feral in the nest */
      { repeat:true, when:g=>!g.vars.ferSaid&&G.rogue.feral>0, do:g=>{ g.vars.ferSaid=true; g.fail('calm'); } },
      { when:g=>g.vars.podsDone&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('down'); g.clearTimer(); if(!G.rogue.feral) g.complete('calm');
          g.win(G.rogue.veilBroken?'The Osprey crew goes down into the Maw Depths through the middle of the Brood\'s biggest nest. Behind them the plain wakes up screaming. Below them, in the Matron\'s empty lair, something is growing.'
            :'Not one shot in the nest. The Osprey crew walks through the Brood\'s biggest nest like seven more of its children, and goes down into the Depths. The brood never knew they were there. Below them, in a lair that should be empty, something is growing.'); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The crew dies on Tycho Maw. The brood drags them home, and the choir sings over them.') }
    ]
  }
);
