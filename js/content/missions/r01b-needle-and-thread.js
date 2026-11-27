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
const NT_BARRICADES=[ {x:17,y:21}, {x:22,y:16}, {x:25,y:18} ];   /* the garrison's sandbags (tiles, Nov 2026 as Von placed them): east by the gun line, west, north by the right tent, north-east above the east gun, south between the south guns */
/* a rank from the job's number: Easy one lower, Hard one higher, never past Lieutenant */
const ntRank=r=>Math.max(0,Math.min(4,r+(G.diffKey==='hard'?1:G.diffKey==='easy'?-1:0)));
const NT_MORTAR={x:20,y:20};  /* the garrison's mortar: in the middle of the ring, its Engineer beside it */
/* the garrison's tactics (ntTac, every half second):
   ring  — nobody about: the defence ring.
   front — the crew is seen (within `see` tiles of the camp, by a loyal soldier or gun) or has just hit one of them: the fighters stand in a line
           facing it, `frontAt` tiles short of the crew but `frontMin`…`frontMax` from the camp's middle (right behind a barricade when one
           stands that way), `spacing` tiles apart, the ends bent back by `bend`; the Medics stand `medBack` tiles behind it, spread out;
           when a man falls the line closes up where it stands (no one walks into the gap from the far side).
   back  — the line has been hit for `outFor` seconds by someone none of them can reach: everyone pulls back `back` tiles behind the middle
           of the camp, out of reach, and waits until the crew comes within `near` tiles. The garrison never splits up to go round
           (a fire team round the flank was tried in Nov 2026 and taken out again: it only made the camp weaker).
   regroup — the crew keeps to one spot (within `campR` tiles for `campFor` seconds: a crater) and the garrison has wounded (its fighters
           below `hurt` of their health on average, or someone down): the line steps back until it stands `safe` tiles beyond the crew's
           reach (their longest weapon), no further back than the `back` line, and the Medics patch everyone up. Once the fighters are at
           `healed` of their health and nobody is down, after `regroupMax` seconds, or as soon as the crew moves, the line goes forward again
           (front); a next regroup not within `regroupCool` seconds.
   A relief squad walks straight into the camp, to its place in the ring or the line (going round the crew was tried and taken out again).
   Nobody seen for `calm` seconds: back to the ring. */
const NT_TAC={ see:12, calm:8, outFor:4, near:6.5, frontAt:4.2, frontMin:1.5, frontMax:4.5, spacing:1.1, bend:0.12, medBack:2.2, back:2.5,
  campR:2, campFor:10, hurt:0.75, healed:0.95, safe:1.5, regroupMax:30, regroupCool:15, turn:25, lineShare:0.5, restArc:75 };
/* lineShare (Nov 2026): only this share of the fighters (those nearest the crew) forms the fight line, the rest stays spread over the camp on the ring,
   never within restArc degrees of the crew's side (one grenade no longer catches the whole squad) */
/* the basin's raids (ntRaid): every `every` seconds (`alarmEvery` once the sirens have gone; × the difficulty's interval) EVERY hive sends a party
   at the camp, the first one `first` seconds in. A party is `budget` biomass (× difficulty), growing by `grow` per raid up to `growMax` raids.
   Bodies lying within NT_RING.reach tiles of the camp each get a carrier from the raid, up to `haul` per raid, so the dead do not pile up. */
const NT_RAID={ first:70, every:75, alarmEvery:50, budget:60, grow:0.12, growMax:6, haul:4 };
const NT_SENTRY_BASE=[ {x:16,y:20}, {x:25,y:19}, {x:25,y:22} ];   /* the Sentry Guns that always stand: west by the tents, east, and east between the two barricades */
const NT_SENTRIES=[ {x:20,y:15}, {x:24,y:23}, {x:21,y:24} ];   /* the extra Sentry Guns (top-left tiles), in the order they are added: north by the terminal, east above the relay pad, south beside the relay pad */
const NT_SENTRIES_BY={ easy:1, normal:2, hard:3 };   /* how many of NT_SENTRIES stand, on top of the three of NT_SENTRY_BASE: 4, 5 or 6 Sentry Guns */
/* rebuilding (ntRebuild, every half second): any Engineer of the garrison builds a destroyed Sentry Gun or Barricade again on its old spot,
   one at a time, Sentry Guns first (then the nearest), as a construction site that grows like the player's own. Not under fire: he does not start,
   and stops, while he was hit in the last `hitFor` seconds or while a crew member stands within his weapon's reach plus `margin` tiles of the spot. */
const NT_REBUILD={ hitFor:3, margin:1 };
/* the support drops (ntNeedSupport): how many Engineers come when none is left, how many Medics when none is left */
const NT_SUPPORT={ engineers:2, medics:2, maxMedics:2 };   /* maxMedics: never more Medics in the garrison than this (on board of a drop counts; Nov 2026: four of them stood at one time) */
const NT_RING={ x:20.5, y:20.5, r:2.2, perMan:0.9, inner:0.6, supGap:2.2, leash:7.5, reach:9 };   /* the defence ring: centre (tiles), least radius, tiles of ring per soldier, the support's inner circle, supGap: tiles between two of the support at the least (more than a grenade's radius, PERKS.trooper.radius: one grenade never catches both Medics) (Medics in the middle), how far from the middle of the camp a soldier chases before he goes back (the pad lies within it), how far from the middle a target may stand (no further: they only defend the camp, never go for a hive) */
ROGUE_MISSIONS.push(
  {
    id:'rogue-needle-and-thread', title:'Needle and Thread', map:'kappa', rogue:true, loyalCover:true, onFall:(u,src)=>ntFall(u,src),   /* the garrison takes cover behind its barricades (coverDamage) */
    summary:'Hit the Kappa field hospital a second time, for Maas\'s stabilizer and her formula.',
    briefing:[
      'One case of stabilizer from Maas\'s freezer, and it is half gone. Devreese says it will not last the month. Without it, the strain takes us one by one, and you first: you have had it the shortest.',
      'The crew hit Kappa\'s field hospital once before. You were on the other side that night, holding the line until dawn. Now Tycho is emptying the tents under Containment Order 10, and Maas\'s stabilizer and her files go out on the next transport.',
      'Three cases of stabilizer, one in each tent. And the records terminal: if Devreese can stand at it long enough, she pulls Maas\'s formula off it, and we never have to steal a dose again. The moment she starts, the hospital calls for help. Then out through the old shaft in the north wall.'
    ],
    limits:{ sentry:2 },   /* the crew's own Sentry Guns: at most 2 in the field at once (a destroyed or packed-up one frees a place) */
    job:{ download:50, lostFor:3, fullFor:900, giveUpAt:3, call:15, waves:5, squad:9, rank:2, leadRank:4, supRank:1, reliefRank:1, loyalHp:{ easy:0.85, normal:1, hard:1.2 } },   /* loyalHp (Nov 2026): the garrison keeps the toughness it had before ROGUE.loyal.hp went up; with AI_RANKS on top the job could hardly be won */   /* fullFor (Nov 2026): for this many seconds after the alarm every drop fills the ring up to its full strength, for whatever losses, as often as
   job.lostFor are missing (not one of the job.waves); after that the rules below. giveUpAt: once the garrison is down to this many men on their feet, Tycho sends nobody any more (no relief, no reinforcements, no support; Nov 2026: else the crew never gets the last of them, the Brood eats every new drop). waves: relief squads for the crew's kills (Nov 2026: 5); squad: most men in one relief squad (9 = the whole ring: a relief squad fills it up). ranks (RANKS): ring fighters, the ring's Lieutenant, Medics and Engineer, the first relief squad (+1 per squad after it); Easy one lower, Hard one higher (ntRank) */
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['a','b','c'],
      shafts:[ {x:17,y:2,wall:'n',exit:true,label:'North shaft'} ],
      swarmUnits:[ ['drone','a',3], ['crawler','a',2], ['drone','b',3], ['spitter','b',1], ['drone','c',2], ['crawler','c',2] ] },
    swarm:{ fetchAny:true, biomass:40, rate:0.3, guardMax:4, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:150, brute:9999 },
      hunt:{ every:45, afterEvery:20, budget:35, afterBudget:60, grow:0.15, growMax:8 } },   /* fetchAny: a Crawler for a lonely body comes from each hive in turn; the raids on the camp: NT_RAID */
    objectives:[
      { id:'records', text:'Pull Dr. Maas\'s files off the records terminal (a Medic stands at it)' },
      { id:'stab',    text:'Take the stabilizer from the three hospital tents (0/3)' }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ const J=G.mission.job;
          for(const t of NT_TENTS) makeBuilding('medtent','none',t.x,t.y,true);
          g.vars.term=makeBuilding('terminal','none',20,18,true);
          g.vars.cases=NT_CASES.map(c=>{ g.cache(c,{ stab:1 }); return G.ents[G.ents.length-1]; });
          const guns=[...NT_SENTRY_BASE,...NT_SENTRIES.slice(0,NT_SENTRIES_BY[G.diffKey]??NT_SENTRIES_BY.normal)].map(p=>g.loyalB('sentry',p)).filter(Boolean); g.vars.relay=g.loyalB('relay',NT_RELAY);   /* Sentry Guns: NT_SENTRY_BASE, plus NT_SENTRIES_BY extra by difficulty */
          /* the garrison stands in a defence ring round the middle of the camp: fighters on the ring, Medics and the Engineer inside */
          const R={rank:ntRank(J.rank)}, S={rank:ntRank(J.supRank)};
          const lead=g.loyal('trooper',{x:21,y:21},1,{rank:ntRank(J.leadRank)});   /* the ring's Lieutenant: he throws grenades at a bunched-up crew */ g.vars.lead=lead[0];
          const gar=[...lead,...g.loyal('trooper',{x:21,y:21},1,R),...g.loyal('gunner',{x:24,y:22},1,R),...g.loyal('trooper',{x:19,y:16},1,R),
            ...g.loyal('medic',{x:19,y:22},2,S),...g.loyal('engineer',{x:22,y:20},1,S)];
          gar.push(...g.loyal('trooper',{x:18,y:24},2,R),...g.loyal('trooper',{x:18,y:18},1,R));   /* Nov 2026: one more, ten in all */
          g.vars.barricades=NT_BARRICADES.map(p=>g.loyalB('barricade',p)).filter(Boolean);   /* where an Engineer of theirs builds a destroyed one again (ntRebuild) */
          g.vars.mortar=g.loyalB('mortar',NT_MORTAR); g.vars.sites=[...guns,g.vars.mortar,...g.vars.barricades].filter(Boolean).map(b=>({type:b.type,tx:b.tx,ty:b.ty}));   /* where an Engineer of theirs builds a destroyed one again (ntRebuild): the Sentry Guns, the mortar, the Barricades */ for(const u of gar) if(u.def.builder) u.mortarMan=true;   /* the Engineer mans the mortar (LOYAL_MORTAR in 31-rogue.js) */   /* sandbags on the edge of the ring, most on the side of the pad */   /* the old patrol: no more walks round the basin (it woke the hive in the north-east), it stands in the ring too */
          ntRing(g,gar,true); g.vars.ringMax=gar.length;   /* the ring's full strength: a relief squad never fills it past this */
          g.pad(NT_PAD,'relief'); g.vars.dl=0; g.vars.dlT=g.time; g.vars.sent=0;
          g.marker('term',{x:20,y:18},'Records terminal');
          g.reveal({x:20,y:20},6,1e6); g.vars.raidAt=g.time+NT_RAID.first*G.diff.interval; } },   /* the hospital is lit all night: the crew can watch it from afar */
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
      /* Tycho gives up on Kappa: job.giveUpAt men or fewer on their feet (one still on board of a landed drop counts) and no more drops come,
         a drop on its way that has not landed yet is called off */
      { when:g=>!g.vars.won&&g.vars.ringMax&&!g.vars.landAt&&!ntFullOn(g)&&ntStanding(g)<=G.mission.job.giveUpAt, do:g=>{ g.vars.noDrops=true;
          if(g.vars.dueAt!=null){ g.vars.dueAt=null; g.vars.dueRelief=g.vars.dueBrood=g.vars.dueSup=false; g.clearTimer(); }
          g.say('Tycho','Kappa, Tycho. We cannot keep feeding people into that basin. No more drops. Hold on to those tents with what you have.');
          g.crewSay('Capt. Kerckhoffs','Tycho has given up on them. That is the last of the garrison. Finish it.'); } },
      /* the first job.fullFor seconds after the alarm: job.lostFor men short (whoever brought them down) and Tycho fills the ring right up again (ntFullOn) */
      { repeat:true, when:g=>!g.vars.won&&!g.vars.dueFull&&ntFullOn(g)&&(ntLossTick(g),ntMissing(g)>=G.mission.job.lostFor), do:g=>{
          g.vars.dueFull=true; g.vars.crewLost=0; g.vars.callN=(g.vars.callN||0)+1; g.vars.broodLost=0; g.vars.broodN=(g.vars.broodN||0)+1;
          if(g.vars.dueAt==null){ g.vars.dueAt=g.time+G.mission.job.call; g.setTimer(G.mission.job.call,'Relief squad'); } g.ping(NT_PAD);
          g.say('Kappa medical',pick(['Kappa medical to Tycho: we are losing people in the perimeter. Send the relief squad, now!','Kappa medical, the ring is thinning. Tycho, fill it up again!','Kappa medical to Tycho, more men down. We need another squad!'])); } },
      /* Tycho's relief squads: once the CREW has brought down job.lostFor men of the ring (since the last call, ntCrewLost) the hospital calls one in
         (job.call seconds before it lands), at most job.waves of them; it lands on the pad, walks to the middle of the camp and fills the ring back up
         to its first strength, whoever made the gaps. Once they are spent, the crew's kills stay gone: that is how the crew wears the camp down. */
      { repeat:true, when:g=>g.vars.alarm!=null&&!g.vars.won&&!g.vars.noDrops&&!ntFullOn(g)&&g.vars.sent<G.mission.job.waves&&!g.vars.dueRelief&&ntCrewLost(g)>=G.mission.job.lostFor, do:g=>{
          g.vars.dueRelief=true; g.vars.crewLost=0; g.vars.callN=(g.vars.callN||0)+1; if(g.vars.dueAt==null){ g.vars.dueAt=g.time+G.mission.job.call; g.setTimer(G.mission.job.call,'Relief squad'); } g.ping(NT_PAD);   /* another drop already on its way: the relief squad comes with it */
          g.say('Kappa medical',['Kappa medical to Tycho: we are losing people in the perimeter. Send the relief squad, now!','Kappa medical, the ring is thinning again. Tycho, we need another squad!','Kappa medical to Tycho, they keep picking us off. Another squad, please!','Kappa medical, still under fire from the raiders. Tycho, we need more people!','Kappa medical to Tycho, we are bleeding out here. Whatever you have left, send it!'][g.vars.sent]||'Kappa medical requests a relief squad.'); } },
      /* the Brood's dead: job.lostFor of them (since its last call, ntBroodLost) and Tycho sends people for them, as often as it happens and not one of
         the job.waves; that drop only fills the places the Brood took (g.vars.broodGap) */
      { repeat:true, when:g=>!g.vars.won&&!g.vars.noDrops&&!ntFullOn(g)&&!g.vars.dueBrood&&ntBroodLost(g)>=G.mission.job.lostFor, do:g=>{
          g.vars.dueBrood=true; g.vars.broodLost=0; g.vars.broodN=(g.vars.broodN||0)+1; if(g.vars.dueAt==null){ g.vars.dueAt=g.time+G.mission.job.call; g.setTimer(G.mission.job.call,'Reinforcements'); } g.ping(NT_PAD);
          g.say('Kappa medical',pick(['Kappa medical to Tycho: the brood is coming out of the basin and taking our people. Send replacements!','Kappa medical, we lost men to the creatures again. Tycho, we need more hands on the perimeter!'])); } },
      /* no Engineer, or no Medic, left on his feet, but a fighter still holds: the hospital asks Tycho for them (NT_SUPPORT: two Engineers, a Medic;
         any time, as often as it happens, not one of the job.waves) */
      { repeat:true, when:g=>!g.vars.won&&!g.vars.noDrops&&g.vars.dueAt==null&&!!ntNeedSupport(g), do:g=>{ const n=ntNeedSupport(g), what=n.eng&&n.med?'Engineers and Medic':n.eng?'Engineers':'Medic';
          g.vars.dueAt=g.time+G.mission.job.call; g.vars.dueSup=true; g.setTimer(G.mission.job.call,what); g.ping(NT_PAD);
          g.say('Kappa medical',n.eng&&n.med?'Kappa medical to Tycho: our Engineer and our Medics are down. We cannot keep anyone alive out here. Send us Medics and Engineers!'
            :n.eng?'Kappa medical to Tycho: we have lost our Engineer. Nobody to work the mortar or fix the guns. Send Engineers!'
            :'Kappa medical to Tycho: no Medic left on the perimeter. Our wounded are bleeding out. Send a Medic!'); } },
      /* the drop lands only once the last ship has lifted off and is gone (ntPadFree, Nov 2026): until then the timer stays at the landing time */
      { repeat:true, when:g=>g.vars.dueAt!=null&&!g.vars.landAt&&!g.vars.won&&g.time>=g.vars.dueAt-3.2&&!ntPadFree(), do:g=>{ g.vars.dueAt=g.time+3.2; if(G.timer) G.timer.end=G.time+3.2; } },
      { repeat:true, when:g=>g.vars.dueAt!=null&&!g.vars.landAt&&!g.vars.won&&g.time>=g.vars.dueAt-3.2&&ntPadFree(), do:g=>{ g.landShip('relief',3,false); g.vars.landAt=g.time+3.2; } },
      { repeat:true, when:g=>!!g.vars.landAt&&g.time>g.vars.landAt, do:g=>{ g.vars.landAt=null; g.vars.dueAt=null; g.clearTimer();
          const J=G.mission.job, full=!!g.vars.dueFull, relief=!!g.vars.dueRelief, brood=!!g.vars.dueBrood, sup=ntNeedSupport(g,true,relief||brood||full); g.vars.dueRelief=false; g.vars.dueBrood=false; g.vars.dueSup=false; g.vars.dueFull=false;
          const most=Math.max(2,J.squad+(G.diffKey==='hard'?1:G.diffKey==='easy'?-1:0)), k=relief?g.vars.sent++:full?Math.min(2,(g.vars.fullN=(g.vars.fullN||0)+1)-1):-1, sq=[];   /* a full refill (job.fullFor) is not one of the job.waves */
          if(sup){ const SR={rank:ntRank(J.supRank)}; if(sup.eng) sq.push(...g.loyal('engineer',NT_PAD,sup.eng,SR)); if(sup.med) sq.push(...g.loyal('medic',NT_PAD,Math.max(0,Math.min(sup.med,NT_SUPPORT.maxMedics-ntMedics(g))),SR)); }   /* the support: Engineers for the mortar and the guns, a Medic */
          if(relief||full){ const n=Math.max(1,Math.min(most,ntMissing(g)-sq.length)), RR={rank:ntRank(J.reliefRank+k)};   /* the relief fills the ring up, the support drop's men included */
            sq.push(...g.loyal(k===2&&n>1&&ntMedics(g)+sq.filter(u=>u.def.heal).length<NT_SUPPORT.maxMedics?'medic':'trooper',NT_PAD,1,RR)); if(n>1) sq.push(...g.loyal(k===1||k===3?'pyro':'gunner',NT_PAD,1,RR)); if(n>2) sq.push(...g.loyal('trooper',NT_PAD,n-2,RR)); g.vars.broodGap=0; }   /* Tycho sends better people each time */
          else { const n=Math.max(0,Math.min(g.vars.broodGap||0,ntMissing(g)-sq.length)), RR={rank:ntRank(J.reliefRank)};   /* the Brood's drop (or a support drop): only the places the Brood took */
            if(n) sq.push(...g.loyal('gunner',NT_PAD,1,RR)); if(n>1) sq.push(...g.loyal('trooper',NT_PAD,n-1,RR)); g.vars.broodGap=Math.max(0,(g.vars.broodGap||0)-n); }
          
          ntRing(g,sq); ntUnload(g,sq);
          if(relief) g.say(['Lt. Van Der Planck','Sgt. Brandt','Lt. Van Der Planck','Sgt. Brandt','Lt. Van Der Planck'][k]||'Corps radio',[
            'Relief squad on the ground at Kappa. Into the ring, all of you. Weapons free, mind the tents.',
            'Second squad down. Close up the ring with Van Der Planck\'s people. Flamer on the line, keep them out of the tents.',
            'Third squad. Van Der Planck again. Medic with us this time. Nobody else bleeds out at Kappa.',
            'Fourth squad on the ground. Brandt again. Whoever these raiders are, they are not getting those tents.',
            'Fifth squad down, more than Tycho can spare. And if Dust\'s deserter is with them: you are not leaving Kappa.'][k]||'Relief squad down.');
          else if(full) g.say(k===1?'Sgt. Brandt':'Lt. Van Der Planck',pick(['Relief squad on the ground at Kappa. Into the ring, all of you.','Fresh squad down at Kappa. Close up that ring.','More hands for Kappa. Fill the gaps, weapons free.']));
          else if(sq.length&&!sup) g.say('Tycho','Replacements on the ground at Kappa. Fill the gaps the creatures made.');
          else if(sup) g.say('Tycho',sup.eng&&sup.med?'Medic and Engineers on the ground at Kappa. Get that mortar firing and get your wounded up.':sup.eng?'Engineers on the ground at Kappa. Get that mortar firing and those guns back up.':'Medic on the ground at Kappa. Get your wounded up.');
          if(relief&&g.vars.sent>=J.waves) g.say('Tycho','Kappa, that was the last squad we can spare. You hold with what you have.'); } },
      /* the relief squad comes down the ramp one by one, so it never stands bunched up on the pad */
      { repeat:true, when:g=>G.ents.some(e=>e.ntOffAt!=null&&!e.dead), do:g=>{ for(const u of G.ents) if(u.ntOffAt!=null&&!u.dead&&g.time>=u.ntOffAt){ u.ntOffAt=null; u.unloadPad=null; u.aboard=null; u.hidden=false; u.invuln=true; u.ntSafe=g.time+NT_DROP.safeMax;   /* untouchable until he is inside the camp (ntSafeTick; Nov 2026: the Brood killed men straight off the ramp) */
          const p=u.ringAt||u; u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } } },   /* straight into the camp, to his place in the ring or the line (going round the crew was tried in Nov 2026 and taken out again) */
      /* the sirens wake the basin */
      { when:g=>g.vars.alarm!=null&&g.time>g.vars.alarm+50, do:g=>{ g.vars.raidAt=g.time; g.crewSay('Cnudde','Those sirens carry. Something in the basin is waking up. Movement from the hives!'); } },
      /* the basin's raids: every hive at once goes for the camp, and fetches the dead lying there (NT_RAID) */
      { repeat:true, when:g=>g.vars.raidAt!=null&&g.time>=g.vars.raidAt&&!g.vars.won, do:g=>ntRaid(g) },
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
/* a man off the ramp stays untouchable until he is inside the camp (within NT_DROP.safeR tiles of its middle, or at his place), at most NT_DROP.safeMax seconds */
function ntSafeTick(g){ const C={x:NT_RING.x*TILE,y:NT_RING.y*TILE};
  for(const u of G.ents) if(u.ntSafe!=null&&!u.dead&&!u.aboard){ const inside=Math.hypot(u.x-C.x,u.y-C.y)<=NT_DROP.safeR*TILE||(u.ringAt&&Math.hypot(u.x-u.ringAt.x,u.y-u.ringAt.y)<TILE);
    if(inside||g.time>=u.ntSafe){ u.ntSafe=null; u.invuln=false; } } }
/* the relief pad has no ship on it (landed, unloading or lifting off) and nobody is still waiting inside one */
function ntPadFree(){ const b=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'); return !b||(!b.ship&&!b.flight&&!G.ents.some(u=>!u.dead&&u.aboard&&u.ntOffAt!=null)); }
/* the relief squad: everyone waits inside the ship (hidden, safe) and walks off the ramp NT_DROP.gap seconds after the one before him, the one going deepest into the camp first */
const NT_DROP={ gap:2.4, safeR:4.5, safeMax:40 };   /* safeR/safeMax: off the ramp a man is untouchable until he is within safeR tiles of the camp's middle (or at his place), at most safeMax seconds */
function ntUnload(g,sq){ const b=G.ents.find(e=>!e.dead&&e.tag==='relief'&&e.type==='lz'); let f=b?rampFoot(b):null;
  if(f&&!walkableP(f.x,f.y)){ const t=nearestWalkable(Math.floor(f.x/TILE),Math.floor(f.y/TILE)); f=t?{x:(t.x+.5)*TILE,y:(t.y+.5)*TILE}:null; } if(!f&&b) f={x:b.x,y:b.y};
  const far=u=>u.ringAt&&f?Math.hypot(u.ringAt.x-f.x,u.ringAt.y-f.y):0; [...sq].sort((a,b)=>far(b)-far(a)||b.def.speed-a.def.speed).forEach((u,i)=>{   /* the one going deepest into the camp first: nobody walks past one who already stopped (Nov 2026: a full ring's worth comes in one drop) */ if(f){ u.x=f.x; u.y=f.y; } u.aboard=true; u.hidden=true; u.invuln=true; u.target=null; u.ntOffAt=g.time+i*NT_DROP.gap; if(b) u.unloadPad=b.id; });   /* unloadPad: the ship stays on the pad until he is off */ }
/* the defence ring (circle formation, defensive stance): add units to it and share out the places again.
   Fighters stand on a ring round NT_RING (it grows with the number of men), Medics and Engineers on a small circle inside, spread out so one grenade never catches two of them (NT_RING.supGap).
   at once: put them straight on their places (the start of the mission). */
function ntRing(g,list,atOnce){ for(const u of list||[]) if(!u.dead){ u.ringer=true; u.hunter=false; u.patrol=null; u.stance='hold'; u.leash={x:NT_RING.x*TILE,y:NT_RING.y*TILE,r:NT_RING.reach*TILE}; if(u.def.heal||u.def.builder) u.spread=NT_RING.supGap; if(u.def.builder) u.repairHome={x:NT_RING.x*TILE,y:NT_RING.y*TILE}; }   /* an Engineer mends from inside the camp (REPAIR_SIDE.home) */   /* Medics keep their distance from each other while they heal too (medicSpread) */   /* defensive stance, and a leash on what they may shoot at */
  g.vars.ringOn=true; const R=NT_RING, cx=(R.x)*TILE, cy=(R.y)*TILE;
  const mortar=g.vars.mortar&&!g.vars.mortar.dead?g.vars.mortar:null, T=g.vars.tac;
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer);
  { const engs=us.filter(u=>u.def.builder&&!u.aboard); let m=engs.find(u=>u.mortarMan); if(!m&&engs.length){ m=engs[0]; m.mortarMan=true; } for(const e of engs) if(e!==m) e.mortarMan=false; }   /* one Engineer at the mortar; another takes over when he falls */
  if(mortar){ const engOk=us.some(u=>u.def.builder&&u.mortarMan&&!u.aboard); let ld=us.find(u=>u.mortarLoader&&!u.aboard);   /* no Engineer at the mortar (dead or down): a Trooper loads it, slower (LOYAL_MORTAR.slow) */
    if(engOk&&ld){ ld.mortarMan=false; ld.mortarLoader=false; }
    else if(!engOk&&!ld){ ld=us.filter(u=>u.type==='trooper'&&u!==g.vars.lead&&!u.aboard).sort((a,b)=>Math.hypot(a.x-mortar.x,a.y-mortar.y)-Math.hypot(b.x-mortar.x,b.y-mortar.y))[0]; if(ld){ ld.mortarMan=true; ld.mortarLoader=true; } } }
  const fight=us.filter(u=>!u.def.heal&&!u.def.builder&&!u.aboard&&!(u.mortarLoader&&mortar)), sup=us.filter(u=>(u.def.heal||u.def.builder)&&!u.aboard);   /* in the ring the mortar stands in the middle: its Engineer on the inner circle is close enough to man it */
  for(const u of us) if(u.mortarMan&&mortar&&!u.aboard&&(T&&T.mode!=='ring'&&T.dir||u.mortarLoader)){ const d=T&&T.mode!=='ring'&&T.dir?T.dir:{x:0,y:1};   /* in the ring the Engineer stands on the inner circle; a Trooper loader just north of the mortar */ let x=mortar.x-d.x*TILE, y=mortar.y-d.y*TILE;   /* the Engineer at the mortar, on the side away from the crew */
    if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } u.ringAt={x,y}; u.home={x,y};
    if(atOnce){ u.x=x; u.y=y; u.order={type:'hold'}; u.path=null; }
    else if(u.mortarLoader){ if(Math.hypot(u.x-x,u.y-y)>TILE*0.6){ u.target=null; u.order={type:'move',x,y}; setPath(u,x,y); } }   /* a loader goes straight to the mortar, no stopping to fight on the way */
    else if(!u.target&&!u.repairT&&!(u.order&&u.order.type==='repair')){ u.order={type:'amove',x,y}; setPath(u,x,y); } }   /* building or mending: he walks to his place once that is done */
  const place=(grp,r,given)=>{ if(!grp.length) return; const used=new Set(); const spots=given?given.map(p=>{ let x=p.x, y=p.y; if(!walkableP(x,y)){ const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE), o=SPIRAL.find(o=>walkableT(tx+o.x,ty+o.y)&&!used.has((tx+o.x)+','+(ty+o.y)));   /* on a barricade or a gun: the nearest open tile no other man was pushed onto */ if(o){ x=(tx+o.x+.5)*TILE; y=(ty+o.y+.5)*TILE; used.add((tx+o.x)+','+(ty+o.y)); } } return {x,y}; }):grp.map((_,i)=>{ const a=i/grp.length*Math.PI*2+ntRingOff(grp.length,r,cx,cy);   /* turned a little so no spot lands on the terminal, the mortar or a building (Nov 2026: with ten men one spot hit the terminal) */  let x=cx+Math.cos(a)*r*TILE, y=cy+Math.sin(a)*r*TILE;
      if(!walkableP(x,y)){ const t=nearestWalkable(Math.floor(x/TILE),Math.floor(y/TILE)); if(t){ x=(t.x+.5)*TILE; y=(t.y+.5)*TILE; } } return {x,y}; });
    const a=assignCheapest(grp.map(u=>spots.map(p=>(u.x-p.x)**2+(u.y-p.y)**2)));
    grp.forEach((u,i)=>{ const p=spots[a[i]]; u.ringAt={x:p.x,y:p.y}; u.home={x:p.x,y:p.y};
      if(atOnce){ u.x=p.x; u.y=p.y; u.order={type:'hold'}; u.path=null; }
      else if(!u.target&&!(u.order&&u.order.type==='repair')){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }); };
  if(T&&T.mode!=='ring'&&T.dir){ const eng=us.find(u=>u.mortarMan&&mortar&&!u.aboard), d=T.dir, along=u=>(u.x-cx)*d.x+(u.y-cy)*d.y;
    const byFront=[...fight].sort((a,b)=>along(b)-along(a)), nLine=T.mode==='front'?Math.max(1,Math.ceil(fight.length*NT_TAC.lineShare)):fight.length, line=byFront.slice(0,nLine), rest=byFront.slice(nLine);   /* in front mode half of them, those nearest the crew, form the line (pulling back or regrouping: all together) */
    for(const u of fight) u.ntLine=line.includes(u); ntLine(g,line,sup.filter(u=>u!==eng),T,place,eng&&eng.ringAt);
    if(rest.length){ const a0=Math.atan2(d.y,d.x), arc=NT_TAC.restArc*Math.PI/180, span=2*Math.PI-2*arc, r=Math.max(R.r,(rest.length+line.length)*R.perMan/(2*Math.PI));   /* the rest spread over the camp, round the back */
      place(rest,0,rest.map((_,i)=>{ const a=a0+arc+span*(rest.length>1?i/(rest.length-1):0.5); return {x:cx+Math.cos(a)*r*TILE,y:cy+Math.sin(a)*r*TILE}; })); }
    g.vars.ringN=us.length; return; }   /* in a fight: half a line facing the crew, half spread over the camp */
  for(const u of fight) u.ntLine=false; place(fight,Math.max(R.r,fight.length*R.perMan/(2*Math.PI))); place(sup,sup.length>1?Math.max(R.inner,R.supGap/(2*Math.sin(Math.PI/sup.length))):R.inner);   /* the support spread out evenly, R.supGap apart */
  g.vars.ringN=us.length; }
/* the turn of a ring of n spots at radius r (tiles) round (cx,cy): -45° (not straight north, the terminal stands there), or the nearest turn in 5° steps with no spot on a blocked tile */
function ntRingOff(n,r,cx,cy){ for(let k=0;k<36;k++){ const o=-Math.PI/4+(k&1?1:-1)*Math.ceil(k/2)*Math.PI/36; let ok=true;
    for(let i=0;i<n&&ok;i++){ const a=i/n*Math.PI*2+o; if(!walkableP(cx+Math.cos(a)*r*TILE,cy+Math.sin(a)*r*TILE)) ok=false; } if(ok) return o; } return -Math.PI/4; }
/* every half second: the ring closes up when someone falls, and a soldier who is done fighting (or healing, or repairing) goes back to his place and holds */
function ntRingTick(g){ ntSafeTick(g); if(g.time<(g.vars.ringT||0)) return; g.vars.ringT=g.time+0.5;
  if(g.vars.alarm==null&&G.ents.some(e=>!e.dead&&e.faction==='loyal'&&e.hitF==='corps'&&g.time-(e.hitFAt||-99)<1.5)) ntAlarm(g,'Kappa medical, we are taking fire! Raiders on the perimeter, Corps weapons! Kappa medical to Tycho, we need a relief squad!');   /* hit by the crew, seen or not: the alarm (Nov 2026: a crew out of their sight killed men and nobody called) */ ntLossTick(g); ntTac(g); ntRebuild(g);
  const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer); if(us.length!==g.vars.ringN){ ntRing(g,[]); return; }
  for(const u of us){ const p=u.ringAt; if(!p||u.aboard) continue;
    if(u.target&&Math.hypot(u.x-NT_RING.x*TILE,u.y-NT_RING.y*TILE)>NT_RING.leash*TILE){   /* too far from the camp: break off and walk back (no shooting on the way) */
      u.target=null; u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); continue; }
    if(u.target||(u.order&&u.order.type!=='hold'&&u.order.type!=='amove')) continue;
    if(u.def.heal&&u.healTarget&&!u.healTarget.dead&&u.healTarget.hp<u.healTarget.maxHp&&(!u.order||u.order.type==='hold')) continue;   /* a Medic busy with a patient: not called back to his place yet */
    const d=Math.hypot(u.x-p.x,u.y-p.y);
    if(d>TILE*0.6){ if(!u.order||u.order.type==='hold'){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }
    else if(!u.order){ u.order={type:'hold'}; u.path=null; } } }
/* the men of the ring the crew brought down since the last call (ntFall counts them as they fall, ntLossTick takes back one patched up in time) */
function ntCrewLost(g){ ntLossTick(g); return g.vars.crewLost||0; }
/* the men of the ring the Brood (or anything else but the crew) brought down since its last call */
function ntBroodLost(g){ ntLossTick(g); return g.vars.broodLost||0; }
function ntLossTick(g){ const V=g.vars; V.crewLost=V.crewLost||0; V.broodLost=V.broodLost||0; V.broodGap=V.broodGap||0;
  for(const u of G.ents) if(u.kind==='unit'&&u.ringer&&u.ntLost&&!u.dead&&!u.downed){   /* patched up: he no longer counts */
    if(u.ntLost==='crew'){ if(u.ntCall===(V.callN||0)) V.crewLost=Math.max(0,V.crewLost-1); }
    else { if(u.ntCall===(V.broodN||0)) V.broodLost=Math.max(0,V.broodLost-1); V.broodGap=Math.max(0,V.broodGap-1); }
    u.ntLost=null; } }
/* mission.onFall (damage in 08-combat.js): a man of the ring goes down or dies. Brought down by the crew (faction 'corps': a crew member, their
   Sentry Gun, a grenade) he counts for a relief squad (and raises the alarm); by anything else (the Brood) for a Brood drop and its gap. */
function ntFall(u,src){ const V=G.vars; if(!u.ringer||u.ntLost) return; u.ntLost=u.fellTo==='corps'?'crew':'other';
  if(u.ntLost==='crew'){ u.ntCall=V.callN||0; V.crewLost=(V.crewLost||0)+1; if(V.alarm==null) ntAlarm(G.api,'Kappa medical, man down on the perimeter! Corps weapons, no IFF! Kappa medical to Tycho, we need a relief squad!'); }   /* brought down by the crew: the alarm, seen or not */
  else { u.ntCall=V.broodN||0; V.broodLost=(V.broodLost||0)+1; V.broodGap=(V.broodGap||0)+1; } }
/* what the garrison needs dropped: {eng, med} (NT_SUPPORT) when no Engineer, or no Medic, is on his feet (one still on board counts as there),
   and a fighter still holds (landing: the check when the ship touches down; relief: a relief squad brings them along anyway); else null */
function ntNeedSupport(g,landing,relief){ const us=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer);
  if(!relief&&!us.some(u=>!u.def.builder&&!u.def.heal&&(landing||!u.aboard))) return null;   /* nobody left to hold: no support drop (a relief squad still brings them) */
  const n={ eng:us.some(u=>u.def.builder)?0:NT_SUPPORT.engineers, med:us.some(u=>u.def.heal)?0:NT_SUPPORT.medics }; return n.eng||n.med?n:null; }
/* the garrison's Medics, those still on board of a drop included (a downed one too: he may be patched up) */
function ntMedics(g){ return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.ringer&&e.def.heal).length; }
/* how many men of the ring are on their feet (one still on board of a drop counts) */
function ntStanding(g){ return G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer).length; }
/* the first job.fullFor seconds after the alarm: every drop fills the ring right up (Nov 2026) */
function ntFullOn(g){ return g.vars.alarm!=null&&g.time<g.vars.alarm+G.mission.job.fullFor; }
/* how many men the ring is short of its first strength */
function ntMissing(g){ return Math.max(0,(g.vars.ringMax||0)-G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer).length); }
/* the fight line (front) or the line pulled back (back): fighters in a line across T.dir, the Medics spread out behind it */
function ntLine(g,fight,sup,T,place,eng){ const A=NT_TAC, C={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, d=T.dir, p={x:-d.y,y:d.x};
  let fd; if(T.mode==='back') fd=-A.back;
  else if(T.mode==='regroup') fd=Math.max(-A.back,Math.min(A.frontMax,T.dist/TILE-(T.reach||6)-A.safe));   /* just out of the crew's reach, never past the back line */
  else { fd=Math.max(A.frontMin,Math.min(A.frontMax,T.dist/TILE-A.frontAt));
    const bar=(g.vars.barricades||[]).filter(b=>!b.dead).map(b=>({b,along:((b.x-C.x)*d.x+(b.y-C.y)*d.y)/TILE,side:Math.abs((b.x-C.x)*p.x+(b.y-C.y)*p.y)/TILE}))
      .filter(o=>o.side<2.5&&o.along>=fd-0.4&&o.along<=A.frontMax+1).sort((a,b)=>a.side-b.side)[0];   /* a barricade that way, about where the line would stand (not much short of it, Nov 2026: else the line behind it cannot reach the crew): right behind it */
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
/* every half second: ring, front or back (see NT_TAC); relief squads going round the crew follow it too */
function ntTac(g){ const A=NT_TAC, T=g.vars.tac||(g.vars.tac={mode:'ring',outT:0,seen:-99}), C={x:NT_RING.x*TILE,y:NT_RING.y*TILE};
  const th=ntThreats(g), rings=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer&&!e.aboard), fighters=rings.filter(u=>!u.def.heal&&!u.def.builder);
  if(th.length){ T.seen=g.time; const K={x:th.reduce((a,u)=>a+u.x,0)/th.length,y:th.reduce((a,u)=>a+u.y,0)/th.length}, L=Math.hypot(K.x-C.x,K.y-C.y)||1, nd={x:(K.x-C.x)/L,y:(K.y-C.y)/L};
    T.K=K; T.dist=L;
    if(T.mode==='ring'){ T.mode='front'; T.dir=nd; T.outT=0; T.lineAt=g.time; T.lineL=L; ntRing(g,[]); const s=fighters.find(u=>u.vet)||fighters[0]; if(s) bark(s,'contact'); }
    else if(Math.acos(Math.max(-1,Math.min(1,T.dir.x*nd.x+T.dir.y*nd.y)))*180/Math.PI>A.turn||(T.mode==='front'&&g.time-T.lineAt>3&&Math.abs(L-(T.lineL||L))>1.5*TILE)){ T.dir=nd; T.lineAt=g.time; T.lineL=L; ntRing(g,[]); }   /* the crew moved: the line turns or shifts with it */
    const hit=rings.some(r=>G.time-(r.shotAt||-99)<1.5&&r.shotBy&&r.shotBy.crew);
    const answer=th.some(c=>fighters.some(f=>Math.hypot(f.x-c.x,f.y-c.y)<=(f.def.range+(f.rangeBonus||0)+0.5)*TILE));
    T.outT=(T.mode==='front'&&hit&&!answer)?T.outT+0.5:Math.max(0,T.outT-0.5);
    if(T.outT>=A.outFor){ T.outT=0; { T.mode='back'; ntRing(g,[]); const s=g.vars.lead&&!g.vars.lead.dead?g.vars.lead:fighters[0]; if(s) g.say(s.vet?`${RANKS[s.vet.rank].abbr} ${s.vet.name}`:'Kappa garrison','We cannot reach them from here. Fall back behind the tents! Let them come to us!'); } }
    if(T.mode==='back'&&th.some(c=>Math.hypot(c.x-C.x,c.y-C.y)<A.near*TILE)){ T.mode='front'; T.dir=nd; T.lineAt=g.time; ntRing(g,[]); }
    /* crater camping: the crew keeps to one spot while the garrison bleeds: step back out of its reach and patch up */
    if(!T.campK||Math.hypot(K.x-T.campK.x,K.y-T.campK.y)>A.campR*TILE){ T.campK=K; T.campAt=g.time; }
    const camping=g.time-T.campAt>=A.campFor, down=G.ents.some(e=>!e.dead&&e.downed&&e.ringer), hp=fighters.length?fighters.reduce((a,u)=>a+u.hp/u.maxHp,0)/fighters.length:1;
    T.reach=Math.max(...th.map(c=>c.def.range+(c.rangeBonus||0)))+Math.max(...th.map(c=>Math.hypot(c.x-K.x,c.y-K.y)/TILE));   /* how far the crew can shoot, from its middle */
    if(T.mode==='front'&&camping&&(hp<A.hurt||down)&&g.time-(T.regroupEnd||-99)>A.regroupCool){ T.mode='regroup'; T.regAt=g.time; ntRing(g,[]);
      const s=g.vars.lead&&!g.vars.lead.dead?g.vars.lead:fighters[0]; if(s) g.say(s.vet?`${RANKS[s.vet.rank].abbr} ${s.vet.name}`:'Kappa garrison','They are dug in. Pull back out of their range! Medics, patch them up, then we go again.'); }
    else if(T.mode==='regroup'&&((!down&&fighters.every(u=>u.hp>=u.maxHp*A.healed))||!camping||g.time-T.regAt>A.regroupMax)){ T.mode='front'; T.regroupEnd=g.time; T.lineAt=g.time; T.lineL=L; ntRing(g,[]);
      const s=g.vars.lead&&!g.vars.lead.dead?g.vars.lead:fighters[0]; if(s&&camping) g.say(s.vet?`${RANKS[s.vet.rank].abbr} ${s.vet.name}`:'Kappa garrison','Patched up. Back on the line!'); } }
  else if(T.mode!=='ring'&&g.time-T.seen>A.calm){ T.mode='ring'; T.K=null; ntRing(g,[]); } }
/* a raid: every hive sends a party at the camp (in turn, so no hive always gets the room first), and the dead lying in the camp get carriers */
function ntRaid(g){ const R=NT_RAID; g.vars.raidAt=g.time+(g.vars.alarm!=null?R.alarmEvery:R.every)*G.diff.interval;
  const n=g.vars.raidN=(g.vars.raidN||0)+1, budget=R.budget*(1+R.grow*Math.min(n-1,R.growMax))*G.diff.budget, aim={x:NT_RING.x*TILE,y:NT_RING.y*TILE}, out=[];
  const hs=hives(); if(!hs.length) return out; const k=n%hs.length, order=[...hs.slice(k),...hs.slice(0,k)];
  for(const h of order){ const s=spawnSpotToward(h,aim), w=launchWaveAt(budget,{x:Math.floor(s.x/TILE),y:Math.floor(s.y/TILE)},aim); out.push(...w); }
  /* the dead in the camp: each gets the nearest raider as its carrier */
  const bodies=G.ents.filter(b=>!b.dead&&b.kind==='body'&&!b.home&&!b.carrier&&!G.ents.some(e=>!e.dead&&e.claim===b&&e.claimMode==='haul')&&Math.hypot(b.x-aim.x,b.y-aim.y)<NT_RING.reach*TILE).slice(0,R.haul);
  const free=out.filter(u=>u.def.attack==='melee');   /* a melee runner carries; the Spitters keep shooting */ for(const b of bodies){ const u=(free.length?free:out).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0]; if(!u) break;
    out.splice(out.indexOf(u),1); if(free.includes(u)) free.splice(free.indexOf(u),1); u.claim=b; u.claimMode='haul'; u.pack=null; }
  if(out.length&&n===1) g.crewSay('Cnudde','Movement from all three hives. They are going for the camp, not for us. Let them thin that ring out.');
  return out; }
/* rebuilding: see NT_REBUILD. A site counts as missing when no building of its type stands on its tile; a half-built one is finished first. */
const NT_REBUILD_ORDER=t=>t==='sentry'?0:t==='mortar'?1:2;   /* Sentry Guns first, then the mortar, then the Barricades */
function ntRebuild(g){ const R=NT_REBUILD, sites=g.vars.sites; if(!sites) return;
  const at=s=>G.ents.find(e=>!e.dead&&e.kind==='building'&&e.type===s.type&&e.tx===s.tx&&e.ty===s.ty);
  const crew=g.crew().filter(c=>!c.downed&&!c.hidden&&!c.aboard&&!c.out);
  const safe=p=>!crew.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<=(c.def.range+(c.rangeBonus||0)+R.margin)*TILE);
  const engs=G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ringer&&e.def.builder&&!e.aboard);
  for(const u of engs){ const o=u.order, b=o&&o.type==='repair'?o.target:null, hit=g.time-(u.shotAt||-99)<R.hitFor;
    if(b&&b.ntSite&&!b.built){ if(hit||!safe(b)){ u.order=null; u.path=null; } continue; }   /* under fire: he leaves the scaffolding and goes back to his place */
    if(b||hit||u.target) continue;
    const busy=new Set(engs.map(e=>e.order&&e.order.type==='repair'&&e.order.target).filter(Boolean));
    const todo=sites.map(s=>({s,b:at(s),p:{x:(s.tx+BUILDINGS[s.type].size/2)*TILE,y:(s.ty+BUILDINGS[s.type].size/2)*TILE}}))
      .filter(t=>(!t.b||(t.b.ntSite&&!t.b.built&&!busy.has(t.b)))&&safe(t.p)&&(t.b||ntSiteFree(t.s)))
      .sort((a,c)=>NT_REBUILD_ORDER(a.s.type)-NT_REBUILD_ORDER(c.s.type)||Math.hypot(a.p.x-u.x,a.p.y-u.y)-Math.hypot(c.p.x-u.x,c.p.y-u.y));
    const t=todo[0]; if(!t) continue;
    let site=t.b; if(!site){ site=makeBuilding(t.s.type,'loyal',t.s.tx,t.s.ty,false); site.ntSite=true; if(site.type==='mortar') g.vars.mortar=site;
      for(const e of G.ents) if(e.kind==='unit'&&!e.dead&&!walkableP(e.x,e.y)){ const f=nearestWalkable(Math.floor(e.x/TILE),Math.floor(e.y/TILE)); if(f){ e.x=(f.x+.5)*TILE; e.y=(f.y+.5)*TILE; } } }   /* nobody stuck inside it */
    u.target=null; u.order={type:'repair',target:site}; u.path=null;
    if(!g.vars.saidRebuild){ g.vars.saidRebuild=true; g.crewSay(selfName(),'Their Engineer is putting the guns back up. Take him down, or we fight that camp twice.'); } } }
/* a site's tiles are open ground again (no building, no rock) */
function ntSiteFree(s){ const n=BUILDINGS[s.type].size; for(let y=s.ty;y<s.ty+n;y++) for(let x=s.tx;x<s.tx+n;x++){ const i=y*G.map.w+x; if(!G.map.walk[i]||G.block[i]) return false; } return true; }
