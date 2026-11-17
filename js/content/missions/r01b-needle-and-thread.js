'use strict';
/* Rogue 2: Needle and Thread
   Kappa Basin, a week after Dead Man's Frequency: the crew hits the field hospital a second time (the first raid was Corps mission Night Shift,
   which your own soldier helped to hold). Tycho is emptying the tents under Containment Order 10; Maas's stabilizer and her files go out on the next transport. Devreese has to stand at the records
   terminal for a while to pull the files off it; the moment she starts (or the moment anyone sees the crew) the hospital calls Tycho,
   and once the ring round the camp has lost job.lostFor men, a relief squad lands on the pad on the east side of the camp,
   and fills the ring back up (never past its first strength; job.waves drops at most). Take the three cases of stabilizer from the tents and leave by the north shaft.
   The files hold Maas's formula: from the next job on, Devreese brews her own stabilizer (ROGUE.stab.formula per job).
   job: the numbers of this job (dev panel, "This job"). */
const NT_TENTS=[ {x:16,y:16}, {x:23,y:16}, {x:16,y:22} ];   /* top-left tiles of the three hospital tents */
const NT_CASES=[ {x:17,y:18}, {x:24,y:18}, {x:18,y:24} ];   /* the stabilizer case in front of each tent */
const NT_RELAY={x:22,y:23};   /* the hospital's Relay Tower stands on the camp's relay pad (top-left tile) */
const NT_PAD={x:30,y:20};     /* the relief pad (its middle tile): on the east side of the camp, so the relief squad walks straight in */
const NT_BARRICADES=[ {x:24,y:20}, {x:24,y:22}, {x:17,y:21} ];   /* the garrison's sandbags: two on the east side (the pad), one on the west (tiles) */
/* a rank from the job's number: Easy one lower, Hard one higher, never past Lieutenant */
const ntRank=r=>Math.max(0,Math.min(4,r+(G.diffKey==='hard'?1:G.diffKey==='easy'?-1:0)));
const NT_MORTAR={x:20,y:20};  /* the garrison's mortar: in the middle of the ring, its Engineer beside it */
/* the garrison's tactics (ntTac, every half second):
   ring  — nobody about: the defence ring.
   front — the crew is seen (within `see` tiles of the camp, by a loyal soldier or gun) or has just hit one of them: the fighters stand in a line
           facing it, `frontAt` tiles short of the crew but `frontMin`…`frontMax` from the camp's middle (right behind a barricade when one
           stands that way), `spacing` tiles apart, the ends bent back by `bend`; the Medics stand `medBack` tiles behind it, spread out;
           when a man falls the line closes up where it stands (no one walks into the gap from the far side).
   back  — the line has been hit for `outFor` seconds by someone none of them can reach, and there are too few to send a fire team: everyone
           pulls back `back` tiles behind the middle of the camp, out of reach, and waits until the crew comes within `near` tiles.
   With at least `flankMin` fighters, a fire team (the Lieutenant and two more, never more than leaves two behind) goes round instead:
   out to the side (`flankWide` tiles from the camp's middle), then to a spot `flankOff` tiles beside the crew, and attacks from there;
   the men go side by side, `gap` tiles apart (more than a grenade's reach); it comes back once the crew is gone, after `flankMax` seconds, or when the fight is over; a next one not before `flankCool` seconds.
   A relief squad that lands during a fight goes round the crew the same way, to `behind` tiles behind it (as seen from the camp).
   Nobody seen for `calm` seconds: back to the ring. */
const NT_TAC={ see:12, calm:8, outFor:4, near:6.5, frontAt:4.2, frontMin:1.5, frontMax:4.5, spacing:1.1, bend:0.12, medBack:2.2, back:2.5,
  flankMin:4, gap:1.8, flankOff:4.5, flankWide:4, flankMax:45, flankCool:30, behind:3.5, turn:25 };
const NT_RING={ x:20.5, y:20.5, r:2.2, perMan:0.9, inner:0.6, supGap:2.2, leash:7.5, reach:9 };   /* the defence ring: centre (tiles), least radius, tiles of ring per soldier, the support's inner circle, supGap: tiles between two of the support at the least (more than a grenade's radius, PERKS.trooper.radius: one grenade never catches both Medics) (Medics in the middle), how far from the middle of the camp a soldier chases before he goes back (the pad lies within it), how far from the middle a target may stand (no further: they only defend the camp, never go for a hive) */
ROGUE_MISSIONS.push(
  {
    id:'rogue-needle-and-thread', title:'Needle and Thread', map:'kappa', rogue:true, loyalCover:true,   /* the garrison takes cover behind its barricades (coverDamage) */
    summary:'Hit the Kappa field hospital a second time, for Maas\'s stabilizer and her formula.',
    briefing:[
      'One case of stabilizer from Maas\'s freezer, and it is half gone. Devreese says it will not last the month. Without it, the strain takes us one by one, and you first: you have had it the shortest.',
      'The crew hit Kappa\'s field hospital once before. You were on the other side that night, holding the line until dawn. Now Tycho is emptying the tents under Containment Order 10, and Maas\'s stabilizer and her files go out on the next transport.',
      'Three cases of stabilizer, one in each tent. And the records terminal: if Devreese can stand at it long enough, she pulls Maas\'s formula off it, and we never have to steal a dose again. The moment she starts, the hospital calls for help. Then out through the old shaft in the north wall.'
    ],
    job:{ download:50, lostFor:3, call:15, waves:3, squad:4, rank:2, leadRank:4, supRank:1, reliefRank:1 },   /* ranks (RANKS): ring fighters, the ring's Lieutenant, Medics and Engineer, the first relief squad (+1 per squad after it); Easy one lower, Hard one higher (ntRank) */
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
          const R={rank:ntRank(J.rank)}, S={rank:ntRank(J.supRank)};
          const lead=g.loyal('trooper',{x:21,y:21},1,{rank:ntRank(J.leadRank)});   /* the ring's Lieutenant: he throws grenades at a bunched-up crew */ g.vars.lead=lead[0];
          const gar=[...lead,...g.loyal('trooper',{x:21,y:21},1,R),...g.loyal('gunner',{x:24,y:22},1,R),...g.loyal('trooper',{x:19,y:16},1,R),
            ...g.loyal('medic',{x:19,y:22},2,S),...g.loyal('engineer',{x:22,y:20},1,S)];
          gar.push(...g.loyal('trooper',{x:18,y:24},2,R));
          g.vars.barricades=NT_BARRICADES.map(p=>g.loyalB('barricade',p)).filter(Boolean);
          g.vars.mortar=g.loyalB('mortar',NT_MORTAR); for(const u of gar) if(u.def.builder) u.mortarMan=true;   /* the Engineer mans the mortar (LOYAL_MORTAR in 31-rogue.js) */   /* sandbags on the edge of the ring, most on the side of the pad */   /* the old patrol: no more walks round the basin (it woke the hive in the north-east), it stands in the ring too */
          ntRing(g,gar,true); g.vars.ringMax=gar.length;   /* the ring's full strength: a relief squad never fills it past this */
          g.pad(NT_PAD,'relief'); g.vars.dl=0; g.vars.dlT=g.time; g.vars.sent=0;
          g.marker('term',{x:20,y:18},'Records terminal');
          g.reveal({x:20,y:20},6,1e6); } },   /* the hospital is lit all night: the crew can watch it from afar */
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Kerckhoffs',`Kappa Basin again. Last time they held us off till dawn. ${selfName()}, you were in that ring. Tell me where it is thin.`) },
      { when:g=>g.time>5, do:g=>g.crewSay(selfName(),'West side, by the tents. They stand in a ring round the middle and never leave the camp, Medics in the middle. And they will call Tycho the moment they see us.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Devreese','The terminal in the middle of the tents. Get me there and keep them off me. It takes time to find her files, and they will hear me looking.') },
      { when:g=>g.time>18, do:g=>g.crewSay('Cnudde','That pad on the east side of the camp is a relief pad. Once the hospital shouts for help, Tycho lands its people right on their doorstep.') },
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
          const RR={rank:ntRank(J.reliefRank+k)}, sq=[...g.loyal(k===2&&n>1?'medic':'trooper',NT_PAD,1,RR)]; if(n>1) sq.push(...g.loyal(k===1?'pyro':'gunner',NT_PAD,1,RR)); if(n>2) sq.push(...g.loyal('trooper',NT_PAD,n-2,RR));   /* Tycho sends better people each time */
          ntRing(g,sq); ntUnload(g,sq);
          g.say(['Lt. Van Der Planck','Sgt. Brandt','Lt. Van Der Planck'][k]||'Corps radio',[
            'Relief squad on the ground at Kappa. Into the ring, all of you. Weapons free, mind the tents.',
            'Second squad down. Close up the ring with Van Der Planck\'s people. Flamer on the line, keep them out of the tents.',
            'This is Van Der Planck again, last squad Tycho can spare. And if Dust\'s deserter is with them: you are not leaving Kappa.'][k]||'Relief squad down.');
          if(g.vars.sent>=J.waves) g.say('Tycho','Kappa, that was the last squad we can spare. You hold with what you have.'); } },
      /* the relief squad comes down the ramp one by one, so it never stands bunched up on the pad */
      { repeat:true, when:g=>G.ents.some(e=>e.ntOffAt!=null&&!e.dead), do:g=>{ for(const u of G.ents) if(u.ntOffAt!=null&&!u.dead&&g.time>=u.ntOffAt){ u.ntOffAt=null; u.unloadPad=null; u.aboard=null; u.hidden=false; u.invuln=false;
          const T=g.vars.tac; if(T&&T.mode!=='ring'&&T.K) ntFlankRelief(g,u,T); else { const p=u.ringAt||u; u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } } } },   /* a fight on: round the crew instead of into the ring */
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
/* the relief squad: everyone waits inside the ship (hidden, safe) and walks off the ramp NT_DROP.gap seconds after the one before him, the quickest first (so nobody catches up with the one in front) */
const NT_DROP={ gap:1.2 };
function ntUnload(g,sq){ const b=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'); let f=b?rampFoot(b):null;
  if(f&&!walkableP(f.x,f.y)){ const t=nearestWalkable(Math.floor(f.x/TILE),Math.floor(f.y/TILE)); f=t?{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}:null; } if(!f&&b) f={x:b.x,y:b.y};
  [...sq].sort((a,b)=>b.def.speed-a.def.speed).forEach((u,i)=>{ if(f){ u.x=f.x; u.y=f.y; } u.aboard=true; u.hidden=true; u.invuln=true; u.target=null; u.ntOffAt=g.time+i*NT_DROP.gap; u.ntIdx=i; if(b) u.unloadPad=b.id; });   /* unloadPad: the ship stays on the pad until he is off */ }
/* the defence ring (circle formation, defensive stance): add units to it and share out the places again.
   Fighters stand on a ring round NT_RING (it grows with the number of men), Medics and Engineers on a small circle inside, spread out so one grenade never catches two of them (NT_RING.supGap).
   at once: put them straight on their places (the start of the mission). */
function ntRing(g,list,atOnce){ for(const u of list||[]) if(!u.dead){ u.ringer=true; u.hunter=false; u.patrol=null; u.stance='hold'; u.leash={x:NT_RING.x*TILE,y:NT_RING.y*TILE,r:NT_RING.reach*TILE}; if(u.def.heal) u.spread=NT_RING.supGap; }   /* Medics keep their distance from each other while they heal too (medicSpread) */   /* defensive stance, and a leash on what they may shoot at */
  g.vars.ringOn=true; const R=NT_RING, cx=(R.x)*TILE, cy=(R.y)*TILE;
  const mortar=g.vars.mortar&&!g.vars.mortar.dead?g.vars.mortar:null, T=g.vars.tac;
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer), fight=us.filter(u=>!u.def.heal&&!u.def.builder&&!u.flank&&!u.aboard), sup=us.filter(u=>(u.def.heal||u.def.builder)&&!u.aboard);   /* in the ring the mortar stands in the middle: its Engineer on the inner circle is close enough to man it */
  if(T&&T.mode!=='ring'&&T.dir) for(const u of us) if(u.mortarMan&&mortar&&!u.aboard){ const d=T&&T.mode!=='ring'&&T.dir?T.dir:{x:0,y:1}; let x=mortar.x-d.x*TILE, y=mortar.y-d.y*TILE;   /* the Engineer at the mortar, on the side away from the crew */
    if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } u.ringAt={x,y}; u.home={x,y};
    if(atOnce){ u.x=x; u.y=y; u.order={type:'hold'}; u.path=null; } else if(!u.target&&!u.repairT){ u.order={type:'amove',x,y}; setPath(u,x,y); } }
  const place=(grp,r,given)=>{ if(!grp.length) return; const spots=given?given.map(p=>{ let x=p.x, y=p.y; if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } return {x,y}; }):grp.map((_,i)=>{ const a=i/grp.length*Math.PI*2-Math.PI/4;   /* not straight north: the terminal stands there */  let x=cx+Math.cos(a)*r*TILE, y=cy+Math.sin(a)*r*TILE;
      if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } return {x,y}; });
    const a=assignCheapest(grp.map(u=>spots.map(p=>(u.x-p.x)**2+(u.y-p.y)**2)));
    grp.forEach((u,i)=>{ const p=spots[a[i]]; u.ringAt={x:p.x,y:p.y}; u.home={x:p.x,y:p.y};
      if(atOnce){ u.x=p.x; u.y=p.y; u.order={type:'hold'}; u.path=null; }
      else if(!u.target){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }); };
  if(T&&T.mode!=='ring'&&T.dir){ const eng=us.find(u=>u.mortarMan&&mortar&&!u.aboard); ntLine(g,fight,sup.filter(u=>u!==eng),T,place,eng&&eng.ringAt); g.vars.ringN=us.length; return; }   /* in a fight: a line facing the crew */
  place(fight,Math.max(R.r,fight.length*R.perMan/(2*Math.PI))); place(sup,sup.length>1?Math.max(R.inner,R.supGap/(2*Math.sin(Math.PI/sup.length))):R.inner);   /* the support spread out evenly, R.supGap apart */
  g.vars.ringN=us.length; }
/* every half second: the ring closes up when someone falls, and a soldier who is done fighting (or healing, or repairing) goes back to his place and holds */
function ntRingTick(g){ if(g.time<(g.vars.ringT||0)) return; g.vars.ringT=g.time+0.5; ntTac(g);
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer); if(us.length!==g.vars.ringN){ ntRing(g,[]); return; }
  for(const u of us){ const p=u.ringAt; if(!p||u.flank||u.aboard) continue;
    if(u.target&&Math.hypot(u.x-NT_RING.x*TILE,u.y-NT_RING.y*TILE)>NT_RING.leash*TILE){   /* too far from the camp: break off and walk back (no shooting on the way) */
      u.target=null; u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); continue; }
    if(u.target||(u.order&&u.order.type!=='hold'&&u.order.type!=='amove')) continue;
    if(u.def.heal&&u.healTarget&&!u.healTarget.dead&&u.healTarget.hp<u.healTarget.maxHp&&(!u.order||u.order.type==='hold')) continue;   /* a Medic busy with a patient: not called back to his place yet */
    const d=Math.hypot(u.x-p.x,u.y-p.y);
    if(d>TILE*0.6){ if(!u.order||u.order.type==='hold'){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }
    else if(!u.order){ u.order={type:'hold'}; u.path=null; } } }
/* how many men the ring is short of its first strength */
function ntMissing(g){ return Math.max(0,(g.vars.ringMax||0)-G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer).length); }
/* the fight line (front) or the line pulled back (back): fighters in a line across T.dir, the Medics spread out behind it */
function ntLine(g,fight,sup,T,place,eng){ const A=NT_TAC, C={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, d=T.dir, p={x:-d.y,y:d.x};
  let fd; if(T.mode==='back') fd=-A.back;
  else { fd=Math.max(A.frontMin,Math.min(A.frontMax,T.dist/TILE-A.frontAt));
    const bar=(g.vars.barricades||[]).filter(b=>!b.dead).map(b=>({b,along:((b.x-C.x)*d.x+(b.y-C.y)*d.y)/TILE,side:Math.abs((b.x-C.x)*p.x+(b.y-C.y)*p.y)/TILE}))
      .filter(o=>o.side<2.5&&o.along>=fd-1&&o.along<=A.frontMax+1).sort((a,b)=>a.side-b.side)[0];   /* a barricade that way, about where the line would stand: right behind it */
    if(bar) fd=bar.along-1; }
  const F={x:C.x+d.x*fd*TILE,y:C.y+d.y*fd*TILE}, n=fight.length, row=(c,k,off,bk)=>({x:c.x+p.x*off*TILE-d.x*bk*TILE,y:c.y+p.y*off*TILE-d.y*bk*TILE});
  place(fight,0,fight.map((_,i)=>{ const off=(i-(n-1)/2)*A.spacing; return row(F,0,off,A.bend*off*off); }));
  const M=row(F,0,0,A.medBack), m=sup.length, gap=NT_RING.supGap*TILE, spots=sup.map((_,i)=>row(M,0,(i-(m-1)/2)*NT_RING.supGap,0));
  if(eng){ const fixed=[eng]; for(const sp of [...spots].sort((a,b)=>Math.hypot(a.x-eng.x,a.y-eng.y)-Math.hypot(b.x-eng.x,b.y-eng.y))){   /* slide a Medic along the row until no grenade catches him with the Engineer (or another Medic) */
      const sg=((sp.x-eng.x)*p.x+(sp.y-eng.y)*p.y)>=0?1:-1; for(let k=0;k<30&&fixed.some(o=>Math.hypot(o.x-sp.x,o.y-sp.y)<gap);k++){ sp.x+=p.x*sg*TILE*0.2; sp.y+=p.y*sg*TILE*0.2; } fixed.push(sp); } }
  place(sup,0,spots); }
/* the crew the garrison knows about: seen by a loyal soldier or gun near the camp, or just now hit one of the garrison */
function ntThreats(g){ const C={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, rings=G.ents.filter(r=>r.ringer&&!r.dead);
  return g.crew().filter(u=>!u.downed&&!u.hidden&&!u.aboard&&!u.out&&((Math.hypot(u.x-C.x,u.y-C.y)<NT_TAC.see*TILE&&loyalSees(u))||rings.some(r=>r.shotBy===u&&G.time-(r.shotAt||-99)<3))); }
/* every half second: ring, front or back, and a fire team round the flank (see NT_TAC) */
function ntTac(g){ const A=NT_TAC, T=g.vars.tac||(g.vars.tac={mode:'ring',outT:0,flankAt:-99,seen:-99}), C={x:NT_RING.x*TILE,y:NT_RING.y*TILE};
  const th=ntThreats(g), rings=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer&&!e.aboard), fighters=rings.filter(u=>!u.def.heal&&!u.def.builder&&!u.flank);
  if(th.length){ T.seen=g.time; const K={x:th.reduce((a,u)=>a+u.x,0)/th.length,y:th.reduce((a,u)=>a+u.y,0)/th.length}, L=Math.hypot(K.x-C.x,K.y-C.y)||1, nd={x:(K.x-C.x)/L,y:(K.y-C.y)/L};
    T.K=K; T.dist=L;
    if(T.mode==='ring'){ T.mode='front'; T.dir=nd; T.outT=0; T.lineAt=g.time; T.lineL=L; ntRing(g,[]); const s=fighters.find(u=>u.vet)||fighters[0]; if(s) bark(s,'contact'); }
    else if(Math.acos(Math.max(-1,Math.min(1,T.dir.x*nd.x+T.dir.y*nd.y)))*180/Math.PI>A.turn||(T.mode==='front'&&g.time-T.lineAt>3&&Math.abs(L-(T.lineL||L))>1.5*TILE)){ T.dir=nd; T.lineAt=g.time; T.lineL=L; ntRing(g,[]); }   /* the crew moved: the line turns or shifts with it */
    const hit=rings.some(r=>G.time-(r.shotAt||-99)<1.5&&r.shotBy&&r.shotBy.crew);
    const answer=th.some(c=>fighters.some(f=>Math.hypot(f.x-c.x,f.y-c.y)<=(f.def.range+(f.rangeBonus||0)+0.5)*TILE));
    T.outT=(T.mode==='front'&&hit&&!answer)?T.outT+0.5:Math.max(0,T.outT-0.5);
    if(T.outT>=A.outFor){ T.outT=0; const flankers=G.ents.some(u=>!u.dead&&u.flank&&u.ringer);
      if(!flankers&&fighters.length>=A.flankMin&&g.time-T.flankAt>A.flankCool){ T.flankAt=g.time; ntFireTeam(g,fighters,T); }
      else if(!flankers){ T.mode='back'; ntRing(g,[]); const s=g.vars.lead&&!g.vars.lead.dead?g.vars.lead:fighters[0]; if(s) g.say(s.vet?`${RANKS[s.vet.rank].abbr} ${s.vet.name}`:'Kappa garrison','We cannot reach them from here. Fall back behind the tents! Let them come to us!'); } }
    if(T.mode==='back'&&th.some(c=>Math.hypot(c.x-C.x,c.y-C.y)<A.near*TILE)){ T.mode='front'; T.dir=nd; T.lineAt=g.time; ntRing(g,[]); } }
  else if(T.mode!=='ring'&&g.time-T.seen>A.calm){ T.mode='ring'; T.K=null; for(const u of G.ents) if(u.flank&&!u.dead) ntFlankEnd(u); ntRing(g,[]); }
  for(const u of G.ents) if(u.flank&&!u.dead&&!u.downed) ntFlankStep(g,u,T,th); }
/* send units round the crew: first to w (wide), then to q (beside or behind the crew), then attack */
function ntFlankGo(u,w,q,idx=0){ const o=Math.hypot(q.x-w.x,q.y-w.y)>TILE?w:u, L=Math.hypot(q.x-o.x,q.y-o.y)||1, px=-(q.y-o.y)/L, py=(q.x-o.x)/L, off=(idx%2?1:-1)*Math.ceil(idx/2)*NT_TAC.gap*TILE;   /* side by side, NT_TAC.gap apart: never two in one grenade */
  w={x:w.x+px*off,y:w.y+py*off}; q={x:q.x+px*off,y:q.y+py*off}; const fix=p=>{ if(walkableP(p.x,p.y)) return p; const t=nearestWalkable(Math.floor(p.x/TILE),Math.floor(p.y/TILE)); return t?{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}:p; };
  w=fix(w); q=fix(q); u.flank={w,q,off:{x:px*off,y:py*off},stage:0,until:G.time+NT_TAC.flankMax,leash:u.flank?u.flank.leash:u.leash}; u.leash=null; u.target=null; u.order={type:'move',x:w.x,y:w.y}; setPath(u,w.x,w.y); }
function ntFlankEnd(u){ const f=u.flank; u.flank=null; u.leash=f.leash||{x:NT_RING.x*TILE,y:NT_RING.y*TILE,r:NT_RING.reach*TILE}; u.target=null; const p=u.ringAt||u; u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); }
function ntFlankStep(g,u,T,th){ const f=u.flank;
  if(g.time>f.until||(!th.length&&g.time-T.seen>3)){ ntFlankEnd(u); return; }
  if(f.stage<2){ const p=f.stage===0?f.w:f.q; if(!u.order||Math.hypot(u.x-p.x,u.y-p.y)<TILE*1.2){ f.stage++; const n=f.stage===1?f.q:T.K?{x:T.K.x+f.off.x,y:T.K.y+f.off.y}:f.q; u.order={type:f.stage===1?'move':'amove',x:n.x,y:n.y}; setPath(u,n.x,n.y); } }
  else if(!u.target&&T.K){ const k={x:T.K.x+f.off.x,y:T.K.y+f.off.y}; if(!u.order||Math.hypot(u.order.x-k.x,u.order.y-k.y)>2*TILE){ u.order={type:'amove',x:k.x,y:k.y}; setPath(u,k.x,k.y); } } }   /* keep their spacing as they close in */
/* the fire team: the Lieutenant and two more (leaving at least two in the line) go round the side the crew is weakest on */
function ntFireTeam(g,fighters,T){ const A=NT_TAC, C={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, K=T.K, d=T.dir, p={x:-d.y,y:d.x};
  const lead=g.vars.lead&&fighters.includes(g.vars.lead)?g.vars.lead:null, n=Math.min(3,fighters.length-2); if(n<1) return;
  const team=[...(lead?[lead]:[]),...fighters.filter(u=>u!==lead).sort((a,b)=>(b.hp/b.maxHp)-(a.hp/a.maxHp))].slice(0,n);
  const opt=[1,-1].map(sg=>{ const w={x:C.x+p.x*sg*A.flankWide*TILE,y:C.y+p.y*sg*A.flankWide*TILE}, q={x:K.x+p.x*sg*A.flankOff*TILE,y:K.y+p.y*sg*A.flankOff*TILE};
    const mx=team.reduce((a,u)=>a+u.x,0)/team.length, my=team.reduce((a,u)=>a+u.y,0)/team.length;
    return { w, q, cost:Math.hypot(w.x-mx,w.y-my)+Math.hypot(q.x-w.x,q.y-w.y)+(walkableP(q.x,q.y)?0:6*TILE)+(walkableP(w.x,w.y)?0:3*TILE) }; }).sort((a,b)=>a.cost-b.cost)[0];
  team.forEach((u,i)=>ntFlankGo(u,opt.w,opt.q,i));
  const s=lead||team[0]; g.say(s.vet?`${RANKS[s.vet.rank].abbr} ${s.vet.name}`:'Kappa garrison','Fire team, on me! We go round their flank. The rest of you keep their heads down!');
  g.vars.ftSent=(g.vars.ftSent||0)+1; ntRing(g,[]); }
/* a relief squad that lands in the middle of a fight: round the crew, from the pad's side, to behind it */
function ntFlankRelief(g,u,T){ const A=NT_TAC, K=T.K, d=T.dir, p={x:-d.y,y:d.x}, pad={x:(NT_PAD.x+.5)*TILE,y:(NT_PAD.y+.5)*TILE};
  const sg=((pad.x-K.x)*p.x+(pad.y-K.y)*p.y)>=0?1:-1;
  const w={x:K.x+p.x*sg*(A.flankOff+2)*TILE,y:K.y+p.y*sg*(A.flankOff+2)*TILE};
  let q={x:K.x+d.x*A.behind*TILE,y:K.y+d.y*A.behind*TILE}; if(!walkableP(q.x,q.y)) q={x:K.x+p.x*sg*A.flankOff*TILE,y:K.y+p.y*sg*A.flankOff*TILE};
  const sx=q.x-u.x, sy=q.y-u.y, s2=sx*sx+sy*sy||1, k=Math.max(0,Math.min(1,((K.x-u.x)*sx+(K.y-u.y)*sy)/s2)), near=Math.hypot(u.x+sx*k-K.x,u.y+sy*k-K.y);
  if(Math.hypot(pad.x-K.x,pad.y-K.y)<(A.flankOff+2)*TILE){ ntFlankGo(u,K,K,u.ntIdx||0); const f=u.flank, L=Math.hypot(K.x-u.x,K.y-u.y)||1, st={x:u.x+(K.x-u.x)/L*TILE+f.off.x,y:u.y+(K.y-u.y)/L*TILE+f.off.y};
    f.q=walkableP(st.x,st.y)?st:f.q; f.stage=1; u.order={type:'move',x:f.q.x,y:f.q.y}; setPath(u,f.q.x,f.q.y); return; }   /* the crew is at the pad: first a step aside to his own spot off the ramp, side by side, then at them */
  ntFlankGo(u,near<(A.flankOff-1)*TILE?w:q,q,u.ntIdx||0);   /* the wide way round only if the straight way runs right past the crew */ if(!g.vars.reliefFlankSaid){ g.vars.reliefFlankSaid=true; g.say('Lt. Van Der Planck','Relief squad, they are pinned at the camp. We go round and take them from behind!'); } }
