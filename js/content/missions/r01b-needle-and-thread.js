'use strict';
/* Rogue 2: Needle and Thread
   Kappa Basin, a week after Dead Man's Frequency: the crew hits the field hospital a second time (the first raid was Corps mission Night Shift,
   which your own soldier helped to hold). Tycho is emptying the tents under Containment Order 10; Maas's stabilizer and her files go out on the next transport. Devreese has to stand at the records
   terminal for a while to pull the files off it; the moment she starts (or the moment anyone sees the crew) the hospital calls Tycho,
   and once the ring round the camp has lost job.lostFor men, a relief squad lands on the pad just south of the camp, under its Relay Tower,
   and fills the ring back up (never past its first strength; job.waves drops at most). Take the three cases of stabilizer from the tents and leave by the north shaft.
   The files hold Maas's formula: from the next job on, Devreese brews her own stabilizer (ROGUE.stab.formula per job).
   job: the numbers of this job (dev panel, "This job"). */
const NT_TENTS=[ {x:16,y:16}, {x:23,y:16}, {x:16,y:22} ];   /* top-left tiles of the three hospital tents */
const NT_CASES=[ {x:17,y:18}, {x:24,y:18}, {x:18,y:24} ];   /* the stabilizer case in front of each tent */
const NT_RELAY={x:22,y:23};   /* the hospital's Relay Tower stands on the camp's relay pad (top-left tile) */
const NT_PAD={x:23,y:26};     /* the relief pad: the 3×3 pad right under the tower (one tile below it), just south of the camp */
const NT_RING={ x:20.5, y:20.5, r:2.2, perMan:0.9, inner:0.8, leash:7.5 };   /* the defence ring: centre (tiles), least radius, tiles of ring per soldier, the support's inner circle, how far from the middle of the camp a soldier chases before he goes back (the pad lies within it) */
ROGUE_MISSIONS.push(
  {
    id:'rogue-needle-and-thread', title:'Needle and Thread', map:'kappa', rogue:true,
    summary:'Hit the Kappa field hospital a second time, for Maas\'s stabilizer and her formula.',
    briefing:[
      'One case of stabilizer from Maas\'s freezer, and it is half gone. Devreese says it will not last the month. Without it, the strain takes us one by one, and you first: you have had it the shortest.',
      'The crew hit Kappa\'s field hospital once before. You were on the other side that night, holding the line until dawn. Now Tycho is emptying the tents under Containment Order 10, and Maas\'s stabilizer and her files go out on the next transport.',
      'Three cases of stabilizer, one in each tent. And the records terminal: if Devreese can stand at it long enough, she pulls Maas\'s formula off it, and we never have to steal a dose again. The moment she starts, the hospital calls for help. Then out through the old shaft in the north wall.'
    ],
    job:{ download:50, lostFor:3, call:15, waves:3, squad:4 },
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['a','b','c'],
      shafts:[ {x:17,y:2,wall:'n',exit:true,label:'North shaft'} ],
      swarmUnits:[ ['drone','a',3], ['crawler','a',2], ['drone','b',3], ['spitter','b',1], ['drone','c',2], ['crawler','c',2] ] },
    swarm:{ biomass:40, rate:0.3, guardMax:4, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:150, brute:9999 },
      hunt:{ every:45, afterEvery:20, budget:35, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[
      { id:'records', text:'Pull Dr. Maas\'s files off the records terminal (a Medic stands at it)' },
      { id:'stab',    text:'Take the stabilizer from the three hospital tents (0/3)' }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ const J=G.mission.job;
          for(const t of NT_TENTS) makeBuilding('medtent','none',t.x,t.y,true);
          g.vars.term=makeBuilding('terminal','none',20,18,true);
          g.vars.cases=NT_CASES.map(c=>{ g.cache(c,{ stab:1 }); return G.ents[G.ents.length-1]; });
          g.loyalB('sentry',{x:16,y:20}); g.loyalB('sentry',{x:25,y:19}); g.vars.relay=g.loyalB('relay',NT_RELAY);
          /* the garrison stands in a defence ring round the middle of the camp: fighters on the ring, Medics and the Engineer inside */
          const gar=[...g.loyal('trooper',{x:21,y:21},2),...g.loyal('gunner',{x:24,y:22},1),...g.loyal('trooper',{x:19,y:16},1),
            ...g.loyal('medic',{x:19,y:22},2),...g.loyal('engineer',{x:22,y:20},1)];
          ntRing(g,gar,true); g.vars.ringMax=gar.length;   /* the ring's full strength: a relief squad never fills it past this */
          g.loyal('trooper',{x:12,y:22},2,{ patrol:[{x:12,y:22},{x:20,y:27},{x:29,y:21},{x:25,y:13}] });   /* and a patrol round the camp, outside the ring */
          g.pad(NT_PAD,'relief'); g.vars.dl=0; g.vars.dlT=g.time; g.vars.sent=0;
          g.marker('term',{x:20,y:18},'Records terminal');
          g.reveal({x:20,y:20},6,1e6); } },   /* the hospital is lit all night: the crew can watch it from afar */
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Kerckhoffs',`Kappa Basin again. Last time they held us off till dawn. ${selfName()}, you were in that ring. Tell me where it is thin.`) },
      { when:g=>g.time>5, do:g=>g.crewSay(selfName(),'West side, by the tents. The Medics stand inside the ring, the patrol walks wide. And they will call Tycho the moment they see us.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Devreese','The terminal in the middle of the tents. Get me there and keep them off me. It takes time to find her files, and they will hear me looking.') },
      { when:g=>g.time>18, do:g=>g.crewSay('Cnudde','That pad south of the camp, under their tower, is a relief pad. Once the hospital shouts for help, Tycho lands its people right on their doorstep.') },
      { when:g=>g.time>27, do:g=>g.crewSay('Van Wesemael','Hold fire (Q) till we are close, Captain. The longer they do not see us, the longer before the first dropship.') },
      /* seen before the download starts: the hospital calls Tycho early */
      { when:g=>!g.vars.alarm&&!!g.spotted(), do:g=>{ const s=g.spotted(); ntAlarm(g,'Contact at the perimeter! Corps armour, no IFF! Kappa medical to Tycho, we need a relief squad, now!'); if(s) G.alert={x:s.x,y:s.y}; } },
      /* the download: a Medic of the crew stands at the terminal; she stops if she walks away, goes down or goes feral */
      { repeat:true, when:g=>g.vars.dlT!=null&&!g.vars.dlDone, do:g=>{ const dt=g.time-g.vars.dlT; g.vars.dlT=g.time; const t=g.vars.term;
          const doc=g.crew().find(u=>u.def.heal&&!u.downed&&!(u.feral>0)&&Math.hypot(u.x-t.x,u.y-t.y)<1.9*TILE);
          if(doc){ g.vars.dl=Math.min(1,g.vars.dl+dt/G.mission.job.download); doc.face=t.x>=doc.x?1:-1; g.vars.doc=doc;
            if(Math.random()<0.25) G.fx.push({k:'spark',x:t.x+rand(-5,5),y:t.y-12,vx:rand(-10,10),vy:rand(-30,-10),t:0.4,max:0.4,col:'#5fe3b0'});
            if(!g.vars.dlStart){ g.vars.dlStart=true; g.crewSay(doc.vet.name,'I am in. Patient records, supply logs... her name is everywhere. Keep them off me.');
              if(!g.vars.alarm) ntAlarm(g,'Kappa medical, records breach! Someone is in the terminal! All stations, Kappa medical requests a relief squad!'); } }
          g.setText('records',`Pull Dr. Maas's files off the records terminal (a Medic stands at it)${g.vars.dl>0?` ${Math.floor(g.vars.dl*100)}%`:''}`);
          if(g.vars.dl>=0.5&&!g.vars.half){ g.vars.half=true; g.crewSay('Devreese','Half of it. Her formula is split over three files, and Command has the third one locked. Give me a little longer.'); }
          if(g.vars.dl>=1){ g.vars.dlDone=true; g.complete('records'); g.unmark('term'); g.formula(); SFX.play('complete');
            g.crewSay('Devreese','Got it. All of it. Maas\'s formula: I can brew this myself now, a dose before every job. ...And a memo. Containment Order 10 was written before the Matron died. They knew, Captain. They always knew.'); } } },
      /* the stabilizer cases */
      { repeat:true, when:g=>!!g.vars.cases&&!g.vars.stabDone, do:g=>{ const n=g.vars.cases.filter(c=>c.dead).length; g.setText('stab',`Take the stabilizer from the three hospital tents (${n}/3)`);
          if(n>=3){ g.vars.stabDone=true; g.complete('stab'); g.crewSay('Mortier','Three cases. Cold as ice. Somebody at Tycho is going to have a very bad morning.'); } } },
      /* the defence ring: everyone back to his place once the fight is over, and the ring closes up when someone falls */
      { repeat:true, when:g=>!!g.vars.ringOn, do:g=>ntRingTick(g) },
      /* Tycho's relief squads: only once the ring has lost job.lostFor men does the hospital call one in (job.call seconds before it lands),
         at most job.waves of them; it lands on the pad, walks to the middle of the camp and fills the ring back up to its first strength */
      { repeat:true, when:g=>g.vars.alarm!=null&&!g.vars.won&&g.vars.sent<G.mission.job.waves&&g.vars.dueAt==null&&ntMissing(g)>=G.mission.job.lostFor, do:g=>{
          g.vars.dueAt=g.time+G.mission.job.call; g.setTimer(G.mission.job.call,'Relief squad'); g.ping(NT_PAD);
          g.say('Kappa medical',['Kappa medical to Tycho: we are losing people in the perimeter. Send the relief squad, now!','Kappa medical, the ring is thinning again. Tycho, we need another squad!','Kappa medical to Tycho, we are bleeding out here. Whatever you have left, send it!'][g.vars.sent]||'Kappa medical requests a relief squad.'); } },
      { repeat:true, when:g=>g.vars.dueAt!=null&&!g.vars.landAt&&!g.vars.won&&g.time>=g.vars.dueAt-3.2, do:g=>{ g.landShip('relief',3,false); g.vars.landAt=g.time+3.2; } },
      { repeat:true, when:g=>!!g.vars.landAt&&g.time>g.vars.landAt, do:g=>{ g.vars.landAt=null; g.vars.dueAt=null; g.clearTimer();
          const J=G.mission.job, most=Math.max(2,J.squad+(G.diffKey==='hard'?1:G.diffKey==='easy'?-1:0)), n=Math.max(1,Math.min(most,ntMissing(g))), k=g.vars.sent++;
          const sq=[...g.loyal(k===2&&n>1?'medic':'trooper',NT_PAD,1)]; if(n>1) sq.push(...g.loyal(k===1?'pyro':'gunner',NT_PAD,1)); if(n>2) sq.push(...g.loyal('trooper',NT_PAD,n-2));
          ntRing(g,sq);
          g.say(['Lt. Van Der Planck','Sgt. Brandt','Lt. Van Der Planck'][k]||'Corps radio',[
            'Relief squad on the ground at Kappa. Into the ring, all of you. Weapons free, mind the tents.',
            'Second squad down. Close up the ring with Van Der Planck\'s people. Flamer on the line, keep them out of the tents.',
            'This is Van Der Planck again, last squad Tycho can spare. And if Dust\'s deserter is with them: you are not leaving Kappa.'][k]||'Relief squad down.');
          if(g.vars.sent>=J.waves) g.say('Tycho','Kappa, that was the last squad we can spare. You hold with what you have.'); } },
      /* the sirens wake the basin */
      { when:g=>g.vars.alarm!=null&&g.time>g.vars.alarm+50, do:g=>{ g.wave(45,{x:20,y:18}); g.crewSay('Cnudde','Those sirens carry. Something in the basin is waking up. Movement from the hives!'); } },
      /* both done: out through the north shaft */
      { when:g=>g.vars.dlDone&&g.vars.stabDone, do:g=>{ g.vars.escape=true; g.addObjective('escape','Everyone into the old shaft in the north wall (right-click it)'); g.exitMark('exit'); g.openExit();
          g.crewSay('Capt. Kerckhoffs','That is what we came for. North wall, the old shaft. Nobody stays behind.'); } },
      { repeat:true, when:g=>g.vars.escape&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the old shaft in the north wall, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      { when:g=>g.vars.escape&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit'); g.clearTimer();
          g.win(g.vars.sent?'Kappa\'s field hospital counts three empty cases and a wiped terminal. Van Der Planck\'s report names one raider: Squad Dust, listed as contained. Devreese says nothing; she is already mixing the first dose in the dark.'
            :'Kappa\'s field hospital wakes to three empty cases and a terminal that says nobody touched it. In a tunnel under the basin, Devreese mixes the first dose of a medicine she can now make herself.'); } },
      /* the files need a Medic: if the crew has none left (dead, not just down), the job cannot be done */
      { when:g=>g.time>2&&!g.vars.dlDone&&!g.crew().some(u=>u.def.heal), do:g=>{ g.fail('records'); g.lose('Devreese is dead, and nobody else in the crew knows what to look for in Maas\'s files. The formula stays at Kappa.'); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The Osprey crew dies among the tents at Kappa. The hospital treats its own wounded first, and buries the raiders last.') }
    ]
  }
);
/* the alarm: the hospital calls Tycho, and the relief squads start coming */
function ntAlarm(g,line){ if(g.vars.alarm!=null) return; g.vars.alarm=g.time; g.say('Kappa medical',line);
  g.ping(NT_PAD);
  g.crewSay('Capt. Kerckhoffs','That is the alarm. Thin out that ring and Tycho drops more people on that pad. Get Devreese her files and get the cases, fast.'); }
/* the defence ring (circle formation, holding): add units to it and share out the places again.
   Fighters stand on a ring round NT_RING (it grows with the number of men), Medics and Engineers on a small circle inside.
   at once: put them straight on their places (the start of the mission). */
function ntRing(g,list,atOnce){ for(const u of list||[]) if(!u.dead){ u.ringer=true; u.hunter=false; u.patrol=null; }
  g.vars.ringOn=true; const R=NT_RING, cx=(R.x)*TILE, cy=(R.y)*TILE;
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer), fight=us.filter(u=>!u.def.heal&&!u.def.builder), sup=us.filter(u=>u.def.heal||u.def.builder);
  const place=(grp,r)=>{ if(!grp.length) return; const spots=grp.map((_,i)=>{ const a=i/grp.length*Math.PI*2-Math.PI/4;   /* not straight north: the terminal stands there */  let x=cx+Math.cos(a)*r*TILE, y=cy+Math.sin(a)*r*TILE;
      if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } return {x,y}; });
    const a=assignCheapest(grp.map(u=>spots.map(p=>(u.x-p.x)**2+(u.y-p.y)**2)));
    grp.forEach((u,i)=>{ const p=spots[a[i]]; u.ringAt={x:p.x,y:p.y}; u.home={x:p.x,y:p.y};
      if(atOnce){ u.x=p.x; u.y=p.y; u.order={type:'hold'}; u.path=null; }
      else if(!u.target){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }); };
  place(fight,Math.max(R.r,fight.length*R.perMan/(2*Math.PI))); place(sup,R.inner);
  g.vars.ringN=us.length; }
/* every half second: the ring closes up when someone falls, and a soldier who is done fighting (or healing, or repairing) goes back to his place and holds */
function ntRingTick(g){ if(g.time<(g.vars.ringT||0)) return; g.vars.ringT=g.time+0.5;
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer); if(us.length!==g.vars.ringN){ ntRing(g,[]); return; }
  for(const u of us){ const p=u.ringAt; if(!p) continue;
    if(u.target&&Math.hypot(u.x-NT_RING.x*TILE,u.y-NT_RING.y*TILE)>NT_RING.leash*TILE){   /* too far from the camp: break off and walk back (no shooting on the way) */
      u.target=null; u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); continue; }
    if(u.target||(u.order&&u.order.type!=='hold'&&u.order.type!=='amove')) continue;
    const d=Math.hypot(u.x-p.x,u.y-p.y);
    if(d>TILE*0.6){ if(!u.order||u.order.type==='hold'){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }
    else if(!u.order){ u.order={type:'hold'}; u.path=null; } } }
/* how many men the ring is short of its first strength */
function ntMissing(g){ return Math.max(0,(g.vars.ringMax||0)-G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer).length); }
