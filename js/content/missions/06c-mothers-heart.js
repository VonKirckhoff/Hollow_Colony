'use strict';
/* Corps mission 9: Mother's Heart (the Corps side of Rogue job 8, Mother's Blood)
   Maw Depths. Seismic picked up a scream under the Maw: something wounded the Brood Mother, and she tore free and fled into the deep.
   What she left behind in her lair, one of her hearts, torn loose, still beats, and the Osprey crew is tapping it. Dust goes down light
   and fast: reach the lair and burn her heart before they have drawn it dry. The crew never dies: they break off and run, and once the
   heart is gone they all slip away down her tunnel. The Brood Mother lives: Corps mission 10 (Brood Mother) goes after her.
   job: the numbers of this mission (dev panel, "This mission"). */
MISSIONS.push(
  {
    id:'mothers-heart', title:'Mother\'s Heart', map:'depths', ospreyVoice:'Osprey crew',
    summary:'Something bled the Matron. Burn the heart she left behind before the Osprey crew drains it.',
    briefing:[
      'Seismic picked up a scream under Tycho Maw, then a long silence. Something went into the Matron\'s lair and hurt her. She tore herself free and crawled into the deep, and she left part of herself behind: one of her hearts, torn loose and still beating.',
      'The Osprey crew got there first. They opened her membrane, and now they are drawing the blood out of it. Dr. Maas says whatever is in that blood could finish what the strain started in them. Command wants it ash.',
      'Kestrel puts you down at the cave mouth with a Command Post to call in replacements, but there is no time to dig in. Push through the tunnels to the lair in the north-east and burn that heart. A Pyro does it fastest. The brood is frantic with its mother hurt, and it will not touch the crew.'
    ],
    job:{ mhTap:{ easy:260, normal:210, hard:180 }, mhBurn:10, mhSmash:25, mhBack:45 },
    landingZone:{ tx:16, ty:44, max:14, delay:25 },
    noTraining:true,
    start:{ salvage:400, camera:'P',
      units:[ ['engineer','P',2], ['trooper','P',5], ['gunner','P',2], ['pyro','P',2], ['medic','P',2] ],
      buildings:[ ['hq','P'] ], hives:['a','b','c'], hiveHp:10,
      shafts:[ {x:78,y:4,wall:'n',exit:true,label:'Her tunnel'}, {x:86,y:13,wall:'e',exit:true,label:'Her tunnel'} ],
      swarmUnits:[ ['drone','a',4], ['crawler','a',3], ['drone','b',5], ['spitter','b',2], ['drone','c',5], ['spitter','c',2], ['brute','c',1] ] },
    limits:{ sentry:4 },
    swarm:{ biomass:150, rate:0.5, guardMax:8, guardEvery:10, waves:{ first:120, every:90, budget:60, growth:20 }, unlock:{ spitter:120, brute:420 } },
    objectives:[
      { id:'blood', text:'Burn the heart in her lair before the Osprey crew drains it' },
      { id:'hq',    text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{ const p=g.where('9');
          const h={ id:NEXT_ID++, kind:'crate', rogue:true, heart:true, x:p.x, y:p.y, r:12, faction:'none', t:1e9, seed:1 }; G.ents.push(h); g.vars.sac=h;
          g.vars.tap=0; g.vars.burn=0; g.vars.tt=g.time; g.ospreyExits([{x:78,y:4},{x:86,y:13}]); g.ospreyReturn(G.mission.job.mhBack);
          const T=(type,at,n,o)=>g.osprey(type,at,n,o);
          g.vars.gate=[...T('gunner','8',1,{hold:true}),...T('trooper','8',1,{hold:true})];   /* two at the open membrane */
          g.vars.lair=[...T('trooper',{x:76,y:13},1,{capt:true,hold:true}),...T('trooper',{x:77,y:15},1,{hold:true}),...T('pyro',{x:76,y:11},1,{hold:true}),...T('engineer',{x:80,y:13},1,{hold:true})];   /* they hold round the heart */
          g.vars.doc=T('medic',{x:78,y:13},1)[0];
          g.marker('sac','9','Her heart'); g.reveal('9',3,6); g.setTimer(G.mission.job.mhTap[G.diffKey]||240,'Heart drained'); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, you are in the Maw. The lair is open and the Osprey crew is inside it. Order 9: burn that heart, and anything that stands between you and it.') },
      { when:g=>g.time>9,  do:g=>g.say('Dr. Maas','Look at the seismic trace: she is still moving, deep down. She is not dead, only hurt. Whatever they are taking from her, do not let it leave this cave.') },
      { when:g=>g.time>18, do:g=>g.say('Dropship Kestrel','Kestrel on station. Fourteen boots on the ground max. Select the Landing Zone for replacements.') },
      { when:g=>g.time>30, do:g=>g.ospreySay('Osprey crew','Dust is in the Maw. Doc, how long?') },
      { when:g=>g.time>36, do:g=>g.ospreySay('Osprey crew','Long enough to matter. Hold the gate. Do not let them near her.') },
      /* the tap: one of the crew next to the blood draws it off, their Medic fastest; Dust next to it burns it (a Pyro) or smashes it */
      { repeat:true, when:g=>g.vars.sac&&!g.vars.done, do:g=>{ const h=g.vars.sac, dt=g.time-g.vars.tt, J=G.mission.job, total=J.mhTap[G.diffKey]||240; g.vars.tt=g.time;
          const crew=g.ospreys().filter(u=>Math.hypot(u.x-h.x,u.y-h.y)<2.2*TILE), doc=crew.some(u=>u.def.heal);
          if(crew.length) g.vars.tap=Math.min(1,g.vars.tap+dt/total*(doc?1:0.5));
          const rate=doc?1:crew.length?0.5:0; if(G.timer) G.timer.end=g.time+total*(1-g.vars.tap)/(rate||1);   /* the clock shows how long the crew still needs (at their Medic's pace while nobody is drawing) */
          if(g.vars.doc&&!g.vars.doc.dead&&!g.vars.doc.ospBroke&&!g.vars.doc.order&&!g.vars.doc.target&&Math.hypot(g.vars.doc.x-h.x,g.vars.doc.y-h.y)>1.6*TILE) g.ospreyOrder([g.vars.doc],'9','move');
          const dust=G.ents.filter(u=>!u.dead&&!u.downed&&u.kind==='unit'&&u.faction==='corps'&&!u.def.escort), py=dust.some(u=>u.def.attack==='flame'&&Math.hypot(u.x-h.x,u.y-h.y)<2.6*TILE), any=dust.some(u=>Math.hypot(u.x-h.x,u.y-h.y)<1.8*TILE);
          if(py||any){ g.vars.burn=Math.min(1,g.vars.burn+dt/(py?J.mhBurn:J.mhSmash)); if(Math.random()<0.6) G.fx.push(py?{k:'flame',x:h.x+rand(-8,8),y:h.y-4,vx:rand(-30,30),vy:rand(-60,-20),t:0.35,max:0.35}:{k:'spark',x:h.x+rand(-6,6),y:h.y-6,vx:rand(-30,30),vy:rand(-40,-10),t:0.4,max:0.4,col:'#c38bff'});
            if(!g.vars.burnSaid){ g.vars.burnSaid=true; g.say('Sgt. Kessler',py?'Flamer on the heart! Burn it, burn all of it!':'We are on it! No flamer here, hack it apart by hand. Get a Pyro up here!'); } }
          else g.vars.burn=Math.max(0,g.vars.burn-dt*0.05);
          g.setText('blood',`Burn the heart in her lair before the Osprey crew drains it (burnt ${Math.floor(g.vars.burn*100)}% · drained ${Math.floor(g.vars.tap*100)}%)`);
          if(g.vars.tap>=0.5&&!g.vars.half){ g.vars.half=true; g.say('Dr. Maas','Half of its blood is in their bottles already. Hurry!'); }
          if(g.vars.burn>=1){ g.vars.done='burnt'; h.dead=true; g.unmark('sac'); g.clearTimer(); g.complete('blood'); SFX.play('huskroar',h.x,h.y);
            for(let i=0;i<24;i++) G.fx.push({k:'ember',x:h.x+rand(-14,14),y:h.y+rand(-10,10),vx:rand(-60,60),vy:rand(-90,-10),t:rand(.5,1.1),max:1.1,col:pick(['#ff8a2a','#ffd23f','#c38bff'])}); addDecal(h.x,h.y,22,'rgba(40,10,40,.6)');
            g.ospreySay('Osprey crew','It is burning. That is it, we are done here. Into her tunnel, everyone. Now!'); g.ospreyWithdraw(); g.say('Cmdr. Varga','The heart is gone. Let them run, Dust. Hold the lair.'); }
          else if(g.vars.tap>=1){ g.vars.done='taken'; g.fail('blood'); g.ospreyWithdraw();
            g.lose('The last of its blood goes into the crew\'s bottles, and the crew goes into the dark down her tunnel. When Dust reaches the lair there is nothing left of the heart but a torn skin. Whatever the Osprey crew carries now, nobody at Tycho will ever see it in a lab.'); } } },
      /* the gate falls back to the lair once Dust is through */
      { when:g=>g.vars.gate&&g.near('corps','8',5)>0, do:g=>{ const L=g.vars.gate.filter(u=>!u.dead&&!u.ospBroke); for(const u of L) u.order=null; g.ospreyOrder(L,{x:76,y:14}); g.ospreySay('Osprey crew','They are at the gate! Fall back on the lair!'); } },
      { when:g=>g.near('corps','9',8)>0, do:g=>{ g.say('Sgt. Kessler','There they are. And there it is, God, it is still beating.'); } },
      { repeat:true, when:g=>g.vars.done==='burnt'&&!g.vars.won, do:g=>g.setText('blood',`Her heart is ash. The crew is running (${g.ospreyLeft()} still in the lair)`) },
      { when:g=>g.vars.done==='burnt'&&g.ospreyLeft()===0&&g.ospreyComing()===0, do:g=>{ g.vars.won=true; g.complete('hq');
          g.win('Her heart burns black and purple and stinks for hours. The Osprey crew is gone down her tunnel, how much of her they took with them nobody can say. Deeper still, the seismic trace keeps moving: the Matron is alive, and she is crawling home. Dr. Maas says she will seal the lair and lay as she has never laid before. Dust goes in after her next.'); } },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post is overrun. Without it nobody comes down for you, and the Osprey crew finishes in peace.'); } }
    ]
  }
);
