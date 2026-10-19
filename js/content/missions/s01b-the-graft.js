'use strict';
/* Swarm mission 2: The Graft — one creature, one life, from egg to nest.
   A drone drags one of squad Dust home to the western nest. An egg opens: that Grafter is you.
   Latch onto the body → survive the cocoon → feed as a Twitcher (grazers or soldiers) → hide as a Shambler
   → as a Husk, find a quiet spot and take root (F). If you die, it is over. The doors are open; the Lunar Corps
   holds the station, sends a patrol up the tunnel and, once you are a Shambler, a hunter team after you. */
SWARM_MISSIONS.push(
  {
    id:'swarm-graft', side:'swarm', title:'The Graft', map:'canyons',
    summary:'Be the seed. From egg to Husk, and root a nest of your own.',
    briefing:[
      'The station is quiet, but not empty. More soft ones came down after Dust, and they guard the platform and walk the tunnel.',
      'One of Dust was dragged home to the western nest. An egg on the creep is opening. <i>That is you.</i>',
      'You steer one creature through its whole life. <b>Right-click</b> to move it. As a Grafter, latch onto the body. As a <b>Twitcher</b>, feed: kill grazers or soldiers. As a <b>Shambler</b>, hide: stay far from every soldier until you change. As a <b>Husk</b>, find a quiet place and press <b>F</b> to take root.',
      'If the creature dies, the seed is lost. The nest can hatch a little brood to help (Q, W), but the hunger is yours.'
    ],
    start:{ camera:'c', rally:{x:20,y:10},
      units:[ ['trooper','1',2], ['gunner','1',1], ['medic','1',1], ['trooper','3',2] ],
      hives:[ { at:'c', guardMax:2, guardEvery:20, aggro:5, eggs:3 } ], hiveHp:1.5 },
    swarm:{ biomass:60, rate:0.35, guardMax:2, waves:null, cap:6, unlock:{ spitter:0, brute:9999 }, husks:0, spareFauna:true },
    objectives:[
      { id:'life', text:'Wait for the body' },
      { id:'seed', text:'Keep your creature alive' }
    ],
    triggers:[
      // a drone drags a body home; the egg nearest to it is yours
      { when:g=>g.time>0.2, do:g=>{ const h=hives()[0]; g.vars.hive=h;
          const f=freeTilesNear(Math.floor(h.x/TILE)+9,Math.floor(h.y/TILE)+1,1)[0]; makeBody({x:(f.x+.5)*TILE,y:(f.y+.5)*TILE,def:UNITS.trooper,face:-1});
          const b=G.ents[G.ents.length-1]; b.avatarBody=true; b.t=9999; g.vars.body=b;
          const d=makeUnit('drone','swarm',b.x+TILE*1.5,b.y); d.role='hunt'; d.claim=b; d.claimMode='haul';
          g.spawn('grazer',{x:24,y:11},3,{faction:'wild'}); g.spawn('grazer',{x:28,y:13},3,{faction:'wild'});
          centerOn(h.x+4*TILE,h.y+TILE); } },
      { when:g=>g.time>1, do:g=>g.brood_say('One of them comes home with us. Watch the egg. When it opens, you are what crawls out.') },
      { when:g=>g.vars.body&&g.vars.body.home&&!g.vars.hatched, do:g=>{ g.vars.hatched=true; const b=g.vars.body, h=b.home;
          const e=eggsOf(h).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0]||layHiveEgg(h,b.x+TILE,b.y);
          e.dead=true; addDecal(e.x,e.y,8,'rgba(90,40,110,.6)'); SFX.play('crack',e.x,e.y);
          const u=makeUnit('grafter','swarm',e.x,e.y); u.role='grafter'; u.life=99999; setAvatar(u); centerOn(u.x,u.y);
          g.brood_say('You are awake. Right-click the body to crawl to it. Latch on.'); } },
      // the life, stage by stage
      { repeat:true, when:()=>true, do:g=>{ const st=avatarStage(), u=G.avatar, last=g.vars.stage;
          const txt={ grafter:'Grafter: reach the body and latch on (right-click it)', cocoon:'Cocoon: survive while you change',
            twitcher:`Twitcher: feed on grazers or soldiers (${Math.min(AVATAR.food,(u&&u.food)||0)}/${AVATAR.food})`,
            shambler:`Shambler: hide, no soldier within ${HUSK.hide} tiles (${Math.min(AVATAR.hide,Math.floor((u&&u.hidden2)||0))}/${AVATAR.hide} s)`,
            husk:'Husk: find a quiet spot and take root (F)', rooting:`Taking root (${Math.ceil((u&&u.rootT)||0)} s)`, hive:'A nest of your own' }[st];
          if(txt) g.setText('life',txt);
          if(st===last) return; g.vars.stage=st;
          if(st==='cocoon') g.brood_say('The body closes around you. Something is coming up the tunnel: the nest\'s guards will meet it.');
          if(st==='twitcher'){ g.brood_say(`You crawl out small and weak. Feed. Grazers wander the cavern; a soldier counts double. ${AVATAR.food} kills and you grow.`); }
          if(st==='shambler'){ g.brood_say(`You are bigger now, and they can smell you. Do not fight. Get away from every one of them and stay hidden for ${AVATAR.hide} seconds.`);
            g.say('Cmdr. Varga','Something walked out of that nest on two legs. Hunter team, find it and burn it.'); g.vars.hunters=[...g.spawn('trooper','1',g.n(2),{faction:'corps'}),...g.spawn('pyro','1',1,{faction:'corps'})]; }
          if(st==='husk') g.brood_say(`You are whole. Find open ground, at least ${AVATAR.rootClear} tiles from them and away from the old nest, and press F to take root.`);
          if(st==='rooting'){ g.say('Sgt. Kessler','It is digging in! Hunter team, on it!'); const hs=(g.vars.hunters||[]).filter(h=>!h.dead); if(hs.length) g.orderCorps(hs,{x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)},'amove'); g.brood_say('They are coming. The nest will send what it has to guard you.'); for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.avatar&&e.kind==='unit'){ e.role='brood'; e.post={x:u.x,y:u.y}; e.order=null; } }
          if(st==='hive'){ g.complete('life'); g.complete('seed'); g.win('A new nest breathes in the canyons. You were a seed in a dead man; now you are the Brood.'); }
          if(st==='dead'&&g.vars.hatched){ g.fail('seed'); g.lose('The seed is dead. The nest will wait for another body.'); } } },
      { when:g=>g.vars.body&&g.vars.body.dead&&avatarStage()==='grafter', do:g=>{ g.fail('seed'); g.lose('The body is gone before you could take it.'); } },
      // the patrol walks the tunnel and looks into the cavern
      { repeat:true, when:g=>g.time>(g.vars.patrolAt||(g.vars.patrolAt=25)), do:g=>{ g.vars.patrolAt=g.time+30; g.vars.pi=(g.vars.pi||0)+1;
          const team=g.corps().filter(u=>!g.vars.hunters||!g.vars.hunters.includes(u)).filter(u=>Math.hypot(u.x-ptWorld('1').x,u.y-ptWorld('1').y)>6*TILE||g.vars.pi%3===0).slice(0,3);
          const deep=['shambler','husk','rooting'].includes(avatarStage());   /* they only search the cavern once something big walks around in it */
          g.orderCorps(team,(deep?[ '3',{x:30,y:10},'3',{x:44,y:28} ]:[ '3',{x:44,y:28} ])[g.vars.pi%(deep?4:2)],'amove'); } },
      // the hunters go where they last saw it, if it is close enough to track
      { repeat:true, when:g=>g.vars.hunters&&g.time>(g.vars.huntAt||0), do:g=>{ g.vars.huntAt=g.time+8; const u=G.avatar; if(!avatarAlive()||u.kind!=='unit') return;
          const hs=g.vars.hunters.filter(h=>!h.dead&&!h.downed); if(!hs.length) return; const near=hs.some(h=>dist(h,u)<16*TILE);
          g.orderCorps(hs,near?{x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)}:'3','amove'); } }
    ]
  }
);
