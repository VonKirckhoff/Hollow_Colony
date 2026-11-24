'use strict';
/* Swarm mission 2: The Graft — one creature, one life, from egg to nest.
   A drone drags one of squad Dust home to the western nest. An egg opens: that Grafter is you.
   Latch onto the body → survive the cocoon → hide as a Shambler
   → as a Husk (a warrior, it never roots) guard the Seedling the old nest lays: lead it to a quiet spot, F roots it into your nest.
   Move the selected Seedling and your Husk follows it. A Seedling that dies is laid again after AVATAR.seedAgain s (graftSeedSpare times);
   your Husk may fall once the Seedling is out, then you lead the Seedling alone. Before that, if you die, it is over.
   To win, the Seedling must root AND every soldier on the map must be dead (objective 'purge'); once the nest stands,
   only losing every hive loses the mission.
   The whole Brood is yours from the start (hatch, A, H, teams); once the Seedling is out it grows (GRAFT_BROOD).
   The doors are open; the Lunar Corps holds the station (GRAFT_BROOD.keep soldiers always stay there), sends a patrol up the tunnel
   and, once you are a Shambler, a hunter team after you. */
/* GRAFT_BROOD: when the Seedling comes out, the brood limit grows by `cap`, you get `biomass` extra, Brutes can hatch `brute` s later
   · keep: soldiers the patrol always leaves at the station */
const GRAFT_BROOD = { cap:10, biomass:150, brute:120, keep:3 };
/* the old nest lays a Seedling at its foot for your Husk */
function graftLaySeed(g){ const h=(g.vars.hive&&!g.vars.hive.dead)?g.vars.hive:hives().find(x=>!x.offshoot); if(!h) return null;
  const f=freeTilesNear(Math.floor(h.x/TILE)+2,Math.floor(h.y/TILE)+1,1)[0]; if(!f) return null;
  const sd=makeUnit('seedling','swarm',(f.x+.5)*TILE,(f.y+.5)*TILE); sd.graftSeed=true; sd.role='brood'; sd.post={x:sd.x,y:sd.y}; g.vars.seed=sd; g.vars.seedAt=null;
  SFX.play('hatch',sd.x,sd.y); G.pings.push({x:sd.x,y:sd.y,t:0,col:'#a6ff4a'}); G.fx.push({k:'boom',x:sd.x,y:sd.y,t:0.35,max:0.35,r:16,col:'#a6ff4a'}); G.selDirty=true; return sd; }
/* moving the selected Seedling (and not your Husk), the Husk walks with it and takes on what comes near it */
function graftFollow(g){ const sd=graftSeedling(), u=G.avatar; if(!sd||!avatarAlive()||u.kind!=='unit'||u.molt>0) return;
  if(!G.sel.includes(sd)||G.sel.includes(u)) return;
  if(g.time<(g.vars.followAt||0)) return; g.vars.followAt=g.time+0.4;
  const foe=nearestOf(sd,e=>e.faction==='corps'&&e.kind==='unit'&&!e.downed&&!e.dead&&dist(e,sd)<AVATAR.guard*TILE);
  if(foe){ if(u.target!==foe){ u.target=foe; u.order={type:'attack',target:foe}; u.path=null; } return; }
  if(u.target&&!u.target.dead&&dist(u.target,sd)<AVATAR.guard*TILE) return;
  const d=dist(u,sd); if(d<=AVATAR.follow*TILE*1.3) return;
  const k=AVATAR.follow*TILE/d, x=sd.x+(u.x-sd.x)*k, y=sd.y+(u.y-sd.y)*k; u.target=null; u.order={type:'move',x,y}; setPath(u,x,y); }
SWARM_MISSIONS.push(
  {
    id:'swarm-graft', side:'swarm', title:'The Graft', map:'canyons',
    summary:'Be the seed. From egg to Husk, then guard the Seedling that roots a nest of your own.',
    briefing:[
      'The station is quiet, but not empty. More soft ones came down after Dust, and they guard the platform and walk the tunnel. None of them may leave the canyons alive.',
      'One of Dust was dragged home to the western nest. An egg on the mycel is opening. <i>That is you.</i>',
      'You steer one creature through its whole life. <b>Right-click</b> to move it. As a Grafter, latch onto the body. As a <b>Shambler</b>, hide: stay far from every soldier until you change. As a <b>Husk</b>, guard the <b>Seedling</b> the nest gives you: select it, lead it to a quiet place and press <b>F</b> to take root. Move the Seedling and your Husk follows it.',
      'The whole Brood is yours too: hatch it (Q, W, E), send it (A), bring the fallen home (H). Once the Seedling is out the nest grows stronger: more brood, and Brutes after a while. But if your creature dies before the Seedling is out, the seed is lost.'
    ],
    start:{ camera:'c', rally:{x:20,y:10},
      units:[ ['trooper','1',4], ['gunner','1',2], ['medic','1',1], ['trooper','3',2] ],   /* seven at the station, two in the tunnel */
      hives:[ { at:'c', guardMax:2, guardEvery:20, aggro:5, eggs:3 } ], hiveHp:1.5 },
    swarm:{ biomass:60, rate:0.35, guardMax:2, waves:null, cap:10, unlock:{ spitter:0, brute:9999 }, husks:0, spareFauna:true },
    objectives:[
      { id:'life', text:'Wait for the body' },
      { id:'seed', text:'Keep your creature alive' },
      { id:'purge', text:'Kill every soldier' }
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
          const e=eggsOf(h).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0]||hiveEgg(h,b)||layHiveEgg(h,b.x+TILE,b.y);
          e.dead=true; addDecal(e.x,e.y,8,'rgba(90,40,110,.6)'); SFX.play('crack',e.x,e.y);
          const u=makeUnit('grafter','swarm',e.x,e.y); u.role='grafter'; u.life=99999; setAvatar(u); centerOn(u.x,u.y);
          g.brood_say('You are awake. Right-click the body to crawl to it. Latch on.'); } },
      // the life, stage by stage
      { repeat:true, when:()=>true, do:g=>{ const st=avatarStage(), u=G.avatar, last=g.vars.stage;
          const txt={ grafter:'Grafter: reach the body and latch on (right-click it)', cocoon:'Cocoon: survive while you change',
            shambler:`Shambler: hide, no soldier within ${HUSK.hide} tiles (${Math.min(AVATAR.hide,Math.floor((u&&u.hidden2)||0))}/${AVATAR.hide} s)`,
            husk:'Husk: wait for the Seedling' }[st];
          const V=g.vars, sd=graftSeedling();
          if(V.seedPhase) g.setText('life',sd?(sd.rootT!=null?`Seedling taking root (${Math.ceil(sd.rootT)} s): guard it`:`${avatarAlive()?'Husk: lead':'Lead'} the Seedling to a quiet spot, select it and press F`)
            :V.seedAt!=null?`The nest lays a new Seedling (${Math.max(0,Math.ceil(V.seedAt-g.time))} s)`:'A nest of your own');
          else if(txt) g.setText('life',txt);
          { const n=g.corps().length; g.setText('purge',n?`Kill every soldier (${n} left)`:'Kill every soldier'); }
          if(V.rooted&&!V.won){ g.setText('life','A nest of your own');
            if(!g.corps().length){ V.won=true; g.complete('purge'); g.win('A new nest breathes in the canyons, and not one of them is left to see it. You were a seed in a dead man; now you are the Brood.'); return; }
            if(!hives().length){ V.won=true; g.fail('purge'); g.lose('Every nest is ash. The soft ones hold the canyons.'); return; } }
          if(V.seedPhase&&!V.won&&!V.rooted){ graftFollow(g);
            if((G.swarm.founded||0)>0){ V.rooted=true; g.complete('life'); g.complete('seed'); const n=g.corps().length;
              if(n) g.brood_say(`The seed has rooted. Now the soft ones: ${n} of them still breathe in the canyons. Hunt them all.`); return; }
            if(sd&&sd.rootT!=null&&!V.rootSaid){ V.rootSaid=true; g.say('Sgt. Kessler','That pod is digging in! Hunter team, on it!'); const hs=(V.hunters||[]).filter(h=>!h.dead); if(hs.length) g.orderCorps(hs,{x:Math.floor(sd.x/TILE),y:Math.floor(sd.y/TILE)},'amove');
              g.brood_say('They are coming. The nest sends its guards to the seed; the rest of the brood is yours to send.'); for(const e of G.ents) if(!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.avatar&&!e.def.seed&&!e.mine){   /* only the nest's own guards: the brood you hatched stays where you put it */ e.role='brood'; e.post={x:sd.x,y:sd.y}; e.order=null; } }
            if(sd&&sd.rootT==null) V.rootSaid=false;
            if(!avatarAlive()&&!V.huskLost){ V.huskLost=true;
              if(sd){ g.brood_say('Your Husk has fallen. The seed lives: lead it on alone. Select it, find a quiet spot and press F.'); selectEntities([sd],false); G.following=true; } }
            if(!sd&&V.seedAt==null){ const left=graftSeedSpare()-(V.spareUsed||0), h=(V.hive&&!V.hive.dead)?V.hive:hives().find(x=>!x.offshoot);
              if(avatarAlive()&&left>0&&h){ V.spareUsed=(V.spareUsed||0)+1; V.seedAt=g.time+AVATAR.seedAgain; g.brood_say(`The Seedling is dead. The nest will grow another in ${AVATAR.seedAgain} seconds (${left-1} more after that). Keep it alive this time.`); }
              else { g.fail('seed'); g.lose(avatarAlive()?'The last seed is dead. The canyons stay theirs.':'The Husk and the seed are both dead. The nest will wait for another body.'); return; } }
            if(!sd&&V.seedAt!=null&&g.time>=V.seedAt){ if(graftLaySeed(g)) g.brood_say('A new Seedling crawls from the nest. Go and get it.'); else { g.fail('seed'); g.lose('The old nest is gone. No seed is left.'); return; } } }
          if(st===last) return; g.vars.stage=st;
          if(st==='cocoon') g.brood_say('The body closes around you. Something is coming up the tunnel: the nest\'s guards will meet it.');
          if(st==='shambler'){ g.brood_say(`You crawl out on two legs, and they can smell you. Do not fight. Get away from every one of them and stay hidden for ${AVATAR.hide} seconds.`);
            g.say('Cmdr. Varga','Something walked out of that nest on two legs. Hunter team, find it and burn it.'); g.vars.hunters=[...g.spawn('trooper','1',g.n(2),{faction:'corps'}),...(G.diffKey==='hard'?g.spawn('pyro','1',1,{faction:'corps'}):[])]; }   /* a Pyro joins the hunt on Hard */
          if(st==='husk'&&!V.seedPhase){ V.seedPhase=true; graftLaySeed(g); G.swarm.capExtra=(G.swarm.capExtra||0)+GRAFT_BROOD.cap; G.swarm.biomass+=GRAFT_BROOD.biomass; (G.swarm.unlockAt=G.swarm.unlockAt||{}).brute=g.time+GRAFT_BROOD.brute; g.setText('seed','Keep the Seedling alive'); const SD=SWARM_PLAY.seed;
            g.brood_say(`You are whole: a warrior, and warriors do not root. The nest has grown a Seedling for you. Select it and lead it to open ground, at least ${SD.clear} tiles from them and ${SD.gap} from any nest, then press F. Where it goes, you follow. Guard it. The nest swells for the seed: more brood can hatch now, and Brutes in ${Math.round(GRAFT_BROOD.brute/60)} minutes.`); }
          if(st==='dead'&&V.hatched&&!V.seedPhase){ g.fail('seed'); g.lose('The seed is dead. The nest will wait for another body.'); } } },
      { when:g=>g.vars.body&&g.vars.body.dead&&avatarStage()==='grafter', do:g=>{ g.fail('seed'); g.lose('The body is gone before you could take it.'); } },
      // the patrol walks the tunnel and looks into the cavern
      { repeat:true, when:g=>g.time>(g.vars.patrolAt||(g.vars.patrolAt=25)), do:g=>{ g.vars.patrolAt=g.time+30; g.vars.pi=(g.vars.pi||0)+1;
          const st1=ptWorld('1'), d1=u=>Math.hypot(u.x-st1.x,u.y-st1.y), free=g.corps().filter(u=>!g.vars.hunters||!g.vars.hunters.includes(u)), keep=free.filter(u=>!u.downed).sort((a,b)=>d1(a)-d1(b)).slice(0,GRAFT_BROOD.keep);   /* the nearest few always stay at the station */
          const team=free.filter(u=>!keep.includes(u)).filter(u=>d1(u)>6*TILE||g.vars.pi%3===0).slice(0,3);
          const deep=g.vars.seedPhase||['shambler','husk'].includes(avatarStage());   /* they only search the cavern once something big walks around in it */
          g.orderCorps(team,(deep?[ '3',{x:38,y:10},'3',{x:44,y:28} ]:[ '3',{x:44,y:28} ])[g.vars.pi%(deep?4:2)],'amove'); } },   /* once it is big, the patrol looks into the mouth of the cavern */
      // the hunters go where they last saw it, if it is close enough to track
      { repeat:true, when:g=>g.vars.hunters&&g.time>(g.vars.huntAt||0), do:g=>{ g.vars.huntAt=g.time+8; const sd=graftSeedling(), u=avatarAlive()&&G.avatar.kind==='unit'?(sd&&sd.rootT!=null?sd:G.avatar):sd; if(!u) return;   /* the Husk, the Seedling once it roots or the Husk is gone */
          const hs=g.vars.hunters.filter(h=>!h.dead&&!h.downed); if(!hs.length) return; const near=hs.some(h=>dist(h,u)<16*TILE);
          g.orderCorps(hs,near?{x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)}:'3','amove'); } }
    ]
  }
);
