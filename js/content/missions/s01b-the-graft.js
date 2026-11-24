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
   The doors are open; the Lunar Corps holds the station with a garrison of fourteen (u.graftPost 'station'), the two in the tunnel
   (graftPost 'tunnel') walk the patrol and, once you are a Shambler, a hunter team comes after you.
   Nov 2026: a Relay Tower on the pad in the north cavern. While it stands, every soldier the garrison loses is flown in again
   (GRAFT_CORPS) to the Landing Zone at the station, always in bulk (at least GRAFT_CORPS.bulk at once, never one man alone);
   the patrol and the hunters are not replaced. Whoever comes off a ship cannot be hurt for GRAFT_CORPS.safe seconds.
   Once the tower is hurt, Varga flies in a repair team (GRAFT_CORPS.repairTeam, graftPost 'repair'; shielded only inside the camp): it walks to the tower,
   its Engineer mends it and the team stays there on guard. A new team only once that one is gone. Torn down: no more ships.
   The Brood never attacks the tower on its own (b.clickOnly): you have to send them at it (right-click it, or A + click on it). */
/* GRAFT_BROOD: when the Seedling comes out, the brood limit grows by `cap`, you get `biomass` extra, Brutes can hatch `brute` s later */
const GRAFT_BROOD = { cap:10, biomass:150, brute:120 };
/* GRAFT_CORPS: the station garrison (kept at full strength while the Relay Tower stands) · call: seconds a ship needs to bring replacements
   · relay: the tower's middle (on the R pad of the north cavern) */
const GRAFT_CORPS = { garrison:{ trooper:8, gunner:4, medic:2 }, call:30, relay:{x:49,y:5}, bulk:4, safe:60, repairTeam:{ engineer:1, trooper:3 }, campR:10 };   /* bulk: a ship only goes once this many are missing · safe: seconds a man off the ship cannot be hurt
   · campR: the repair team loses that shield as soon as it is this many tiles from the station (point 1): out of the camp it can be hurt */
/* the garrison stands in a V (wedge) round the station, its point to the north, where the tunnel comes in.
   GRAFT_FORM: shape, dir (radians; −π/2 = north) · join: a replacement within this many tiles of the station takes his place in the V */
const GRAFT_FORM = { shape:'wedge', dir:-Math.PI/2, join:7 };
/* (re)form the V: the members still on their feet share out its places again, round the station */
function graftFormUp(units){ units=units.filter(u=>!u.dead&&!u.downed); if(units.length<2) return;
  const f=units.find(u=>u.formation&&u.formation.graft)?.formation||{ shape:GRAFT_FORM.shape, dir:GRAFT_FORM.dir, gap:1, seq:0, graft:true };
  for(const u of units){ u.formation=f; u.graftJoin=false; } f.march=null; f.seq=(f.seq||0)+1;
  const at=f.at||ptWorld('1'); settleFormation(f,units,at,GRAFT_FORM.dir,'move',false,true); }
const graftRelay=()=>G.ents.find(e=>!e.dead&&e.type==='relay'&&e.faction==='corps'&&e.graft);
function graftGarrison(){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&e.graftPost==='station'); }
/* the soldiers the garrison is short of, by kind (what died is what comes back) */
function graftShort(){ const have={}; for(const u of graftGarrison()) have[u.type]=(have[u.type]||0)+1;
  return Object.entries(GRAFT_CORPS.garrison).map(([t,n])=>[t,Math.max(0,n-(have[t]||0))]).filter(([,n])=>n>0); }
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
      units:[ ...Object.entries(GRAFT_CORPS.garrison).map(([t,n])=>[t,'1',n]), ['trooper','3',2] ],   /* the garrison at the station (seven), two in the tunnel */
      buildings:[ ['relay',GRAFT_CORPS.relay] ],
      hives:[ { at:'c', guardMax:2, guardEvery:20, aggro:5, eggs:3 } ], hiveHp:1.5 },
    landingZone:{ tx:45, ty:37, scripted:true, rally:'1' },   /* replacements walk to the station */
    swarm:{ biomass:60, rate:0.35, guardMax:2, waves:null, cap:10, unlock:{ spitter:0, brute:9999 }, husks:0, spareFauna:true },
    objectives:[
      { id:'life', text:'Wait for the body' },
      { id:'seed', text:'Keep your creature alive' },
      { id:'purge', text:'Kill every soldier' },
      { id:'relay', text:'Tear down their Relay Tower (send the brood at it): no more ships will come', optional:true }
    ],
    triggers:[
      // who is who: the garrison at the station, the two in the tunnel; the tower is only hit when you send the brood at it
      { when:g=>g.time>0.1, do:g=>{ const s1=ptWorld('1'); for(const u of g.corps()) u.graftPost=Math.hypot(u.x-s1.x,u.y-s1.y)<8*TILE?'station':'tunnel';
          for(const b of G.ents) if(!b.dead&&b.type==='relay'&&b.faction==='corps'){ b.graft=true; b.clickOnly=true; }
          const gs=graftGarrison(); formUp(gs,GRAFT_FORM.shape,GRAFT_FORM.dir); gs[0].formation.graft=true; } },   /* the V, its point north */
      // a replacement that reached the station takes his place in the V
      { repeat:true, when:g=>g.time>(g.vars.joinAt||0), do:g=>{ g.vars.joinAt=g.time+1; const s1=ptWorld('1');
          const fresh=graftGarrison().filter(u=>!u.downed&&!(u.formation&&u.formation.graft)&&!(u.order&&u.order.type==='move')&&Math.hypot(u.x-s1.x,u.y-s1.y)<GRAFT_FORM.join*TILE);
          if(fresh.length) graftFormUp(graftGarrison()); } },
      // whoever comes off a ship: the repair team first (by kind), the rest joins the garrison; none of them can be hurt for a while
      { repeat:true, when:g=>g.time>0.5, do:g=>{ const V=g.vars, rp=V.repairNeed||{}, team=[];
          for(const u of g.corps()){ if(u.graftPost||(V.hunters||[]).includes(u)) continue;
            if(rp[u.type]>0){ rp[u.type]--; u.graftPost='repair'; team.push(u); } else u.graftPost='station';
            u.invuln=true; u.graftSafe=g.time+GRAFT_CORPS.safe; G.fx.push({k:'text',x:u.x,y:u.y-24,t:1.2,max:1.2,txt:'SHIELDED',col:'#7fd3ff'}); }
          if(team.length){ const r=graftRelay(); if(r) g.orderCorps(team,{x:r.tx,y:r.ty+3},'amove'); }
          const s1=ptWorld('1'); for(const u of g.corps()) if(u.graftSafe&&(g.time>=u.graftSafe||(u.graftPost==='repair'&&Math.hypot(u.x-s1.x,u.y-s1.y)>GRAFT_CORPS.campR*TILE))){ u.graftSafe=null; u.invuln=false; } } },   /* the repair team: no shield once it leaves the camp */
      // the garrison is short: while the tower stands, Varga flies in what it lost, in bulk (one ship at a time)
      { repeat:true, when:g=>g.time>1&&!g.vars.cut&&g.inbound()===0&&graftShort().reduce((s,[,n])=>s+n,0)>=Math.min(GRAFT_CORPS.bulk,Object.values(GRAFT_CORPS.garrison).reduce((a,b)=>a+b,0)), do:g=>{ const list=graftShort(); g.airdrop(list,GRAFT_CORPS.call,'1');
          if(!g.vars.callSaid||g.time>g.vars.callSaid+60){ g.vars.callSaid=g.time; g.say('Cmdr. Varga',`Kappa, replacements are on their way: ${list.reduce((s,[,n])=>s+n,0)} of them, ${GRAFT_CORPS.call} seconds out.`); } } },
      // the tower is hurt: a repair team with an Engineer (only when no team is left or on its way)
      { repeat:true, when:g=>{ const r=graftRelay(); return r&&!g.vars.cut&&r.hp<r.maxHp&&!G.ents.some(e=>!e.dead&&e.faction==='corps'&&e.graftPost==='repair')&&!Object.values(g.vars.repairNeed||{}).some(n=>n>0); },
        do:g=>{ const list=Object.entries(GRAFT_CORPS.repairTeam); g.vars.repairNeed=Object.fromEntries(list); g.airdrop(list,GRAFT_CORPS.call,'1');
          g.say('Cmdr. Varga','The relay in the north cavern is taking damage. I am sending an Engineer with an escort to patch it up. Keep that line open.'); } },
      // the repair team at the tower: the Engineer mends it while it is hurt
      { repeat:true, when:g=>g.time>(g.vars.mendAt||0), do:g=>{ g.vars.mendAt=g.time+1; const r=graftRelay(); if(!r) return;
          for(const u of g.corps()) if(u.graftPost==='repair'&&u.def.builder&&!u.downed&&r.hp<r.maxHp&&dist(u,r)<10*TILE&&!(u.order&&u.order.type==='repair')){ u.order={type:'repair',target:r}; u.target=null; } } },
      // the tower falls: no more ships
      { when:g=>g.time>0.5&&!graftRelay(), do:g=>{ g.vars.cut=true; g.complete('relay'); g.say('Sgt. Kessler','The relay is down! Varga, do you copy? ... Nothing. Nobody is coming.');
          g.brood_say('Their voice is broken. No more of them will fall from the sky.'); } },
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
          { const n=g.corps().length+g.inbound(); g.setText('purge',n?`Kill every soldier (${n} left${g.vars.cut?'':', more will come'})`:'Kill every soldier'); }
          if(V.rooted&&!V.won){ g.setText('life','A nest of your own');
            if(!g.corps().length&&!g.inbound()){ V.won=true; g.complete('purge'); g.win('A new nest breathes in the canyons, and not one of them is left to see it. You were a seed in a dead man; now you are the Brood.'); return; }
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
          const team=g.corps().filter(u=>u.graftPost==='tunnel'&&!u.downed);   /* only the two from the tunnel: the garrison stays at the station */
          const deep=g.vars.seedPhase||['shambler','husk'].includes(avatarStage());   /* they only search the cavern once something big walks around in it */
          g.orderCorps(team,(deep?[ '3',{x:38,y:10},'3',{x:44,y:28} ]:[ '3',{x:44,y:28} ])[g.vars.pi%(deep?4:2)],'amove'); } },   /* once it is big, the patrol looks into the mouth of the cavern */
      // the hunters go where they last saw it, if it is close enough to track
      { repeat:true, when:g=>g.vars.hunters&&g.time>(g.vars.huntAt||0), do:g=>{ g.vars.huntAt=g.time+8; const sd=graftSeedling(), u=avatarAlive()&&G.avatar.kind==='unit'?(sd&&sd.rootT!=null?sd:G.avatar):sd; if(!u) return;   /* the Husk, the Seedling once it roots or the Husk is gone */
          const hs=g.vars.hunters.filter(h=>!h.dead&&!h.downed); if(!hs.length) return; const near=hs.some(h=>dist(h,u)<16*TILE);
          g.orderCorps(hs,near?{x:Math.floor(u.x/TILE),y:Math.floor(u.y/TILE)}:'3','amove'); } }
    ]
  }
);
