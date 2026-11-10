'use strict';
/* Rogue 2: Needle and Thread
   Kappa Basin, a week after Osprey Down. The Corps turned the relay station Squad Dust held into a field hospital, and the
   shipment Dr. Maas sent to Tycho (her stabilizer and her files) never got further than Kappa. Devreese has to stand at the records
   terminal for a while to pull the files off it; the moment she starts (or the moment anyone sees the crew) the hospital calls Tycho,
   and relief squads land on the pad in the north-east. Take the three cases of stabilizer from the tents and leave by the north shaft.
   The files hold Maas's formula: from the next job on, Devreese brews her own stabilizer (ROGUE.stab.formula per job).
   job: the numbers of this job (dev panel, "This job"). */
const NT_TENTS=[ {x:16,y:16}, {x:23,y:16}, {x:16,y:22} ];   /* top-left tiles of the three hospital tents */
const NT_CASES=[ {x:17,y:18}, {x:24,y:18}, {x:18,y:24} ];   /* the stabilizer case in front of each tent */
ROGUE_MISSIONS.push(
  {
    id:'rogue-needle-and-thread', title:'Needle and Thread', map:'kappa', rogue:true,
    summary:'Rob a Corps field hospital of Dr. Maas\'s stabilizer, and of her formula.',
    briefing:[
      'One case of stabilizer from Maas\'s freezer, and it is half gone. Devreese says it will not last the month. Without it, the strain takes us one by one.',
      'Maas sent the rest to Tycho: her stabilizer and every file she had on it. It never got further than Kappa Basin. The Corps turned the relay station Squad Dust held last month into a field hospital, and the shipment sits in its tents.',
      'Three cases of stabilizer, one in each tent. And the records terminal: if Devreese can stand at it long enough, she pulls Maas\'s formula off it, and we never have to steal a dose again. The moment she starts, the hospital calls for help. Then out through the old shaft in the north wall.'
    ],
    job:{ download:50, firstWave:20, waveEvery:35, waves:3, squad:4 },
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
          g.loyalB('sentry',{x:16,y:20}); g.loyalB('sentry',{x:25,y:19});
          g.loyal('trooper',{x:21,y:21},2,{hold:true}); g.loyal('gunner',{x:24,y:22},1,{hold:true}); g.loyal('trooper',{x:19,y:16},1,{hold:true});
          g.loyal('medic',{x:19,y:22},2); g.loyal('engineer',{x:22,y:20},1);
          g.loyal('trooper',{x:12,y:22},2,{ patrol:[{x:12,y:22},{x:20,y:27},{x:29,y:21},{x:25,y:13}] });
          g.pad('2','relief'); g.vars.dl=0; g.vars.dlT=g.time; g.vars.sent=0;
          g.marker('term',{x:20,y:18},'Records terminal');
          g.reveal({x:20,y:20},6,1e6); } },   /* the hospital is lit all night: the crew can watch it from afar */
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Kerckhoffs','Kappa Basin. Last time I was here we were holding it for Dust. Now it is a hospital full of our own. Shoot what shoots back, nothing else.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Devreese','The terminal in the middle of the tents. Get me there and keep them off me. It takes time to find her files, and they will hear me looking.') },
      { when:g=>g.time>18, do:g=>g.crewSay('Cnudde','That pad in the north-east is a relief pad. Once the hospital shouts for help, that is where Tycho lands its people.') },
      { when:g=>g.time>27, do:g=>g.crewSay('Braet','Hold fire (Q) till we are close, Captain. The longer they do not see us, the longer before the first dropship.') },
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
            g.crewSay('Devreese','Got it. All of it. Maas\'s formula: I can brew this myself now, a dose before every job. ...And a memo. Command knew what she had found before they sent us in. Remember that, Captain.'); } } },
      /* the stabilizer cases */
      { repeat:true, when:g=>!!g.vars.cases&&!g.vars.stabDone, do:g=>{ const n=g.vars.cases.filter(c=>c.dead).length; g.setText('stab',`Take the stabilizer from the three hospital tents (${n}/3)`);
          if(n>=3){ g.vars.stabDone=true; g.complete('stab'); g.crewSay('Mortier','Three cases. Cold as ice. Somebody at Tycho is going to have a very bad morning.'); } } },
      /* Tycho's relief squads: they land on the pad and come straight for the crew */
      { repeat:true, when:g=>g.vars.alarm!=null&&!g.vars.won&&g.vars.sent<G.mission.job.waves&&!g.vars.landAt&&g.time>=ntDue(g)-3.2, do:g=>{ g.landShip('relief',3,false); g.vars.landAt=g.time+3.2; } },
      { repeat:true, when:g=>!!g.vars.landAt&&g.time>g.vars.landAt, do:g=>{ g.vars.landAt=null; const J=G.mission.job, n=Math.max(2,J.squad+(G.diffKey==='hard'?1:G.diffKey==='easy'?-1:0)), k=g.vars.sent++;
          const sq=[...g.loyal('trooper','2',n-1),...g.loyal(k===1?'pyro':'gunner','2',1)]; if(k===2) sq.push(...g.loyal('medic','2',1));
          g.hunt(sq);
          g.say(['Lt. Okafor','Sgt. Brandt','Lt. Okafor'][k]||'Corps radio',[
            'Relief squad on the ground at Kappa. Contact is in the hospital. Weapons free, mind the tents.',
            'Second squad down. Okafor\'s people are pinned. Flamer up front, push them out of the tents.',
            'This is Okafor again, last squad Tycho can spare. Whoever you are, you are not leaving Kappa.'][k]||'Relief squad down.');
          if(g.vars.sent<J.waves) g.setTimer(Math.max(1,ntDue(g)-g.time),'Relief squad'); else g.clearTimer(); } },
      /* the sirens wake the basin */
      { when:g=>g.vars.alarm!=null&&g.time>g.vars.alarm+50, do:g=>{ g.wave(45,{x:20,y:18}); g.crewSay('Cnudde','Those sirens carry. Something in the basin is waking up. Movement from the hives!'); } },
      /* both done: out through the north shaft */
      { when:g=>g.vars.dlDone&&g.vars.stabDone, do:g=>{ g.vars.escape=true; g.addObjective('escape','Everyone into the old shaft in the north wall (right-click it)'); g.exitMark('exit'); g.openExit();
          g.crewSay('Capt. Kerckhoffs','That is what we came for. North wall, the old shaft. Nobody stays behind.'); } },
      { repeat:true, when:g=>g.vars.escape&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the old shaft in the north wall, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      { when:g=>g.vars.escape&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit'); g.clearTimer();
          g.win(g.vars.sent?'Kappa\'s field hospital counts three empty cases and a wiped terminal. Okafor\'s report says raiders in Corps armour. Devreese says nothing; she is already mixing the first dose in the dark.'
            :'Kappa\'s field hospital wakes to three empty cases and a terminal that says nobody touched it. In a tunnel under the basin, Devreese mixes the first dose of a medicine she can now make herself.'); } },
      /* the files need a Medic: if the crew has none left (dead, not just down), the job cannot be done */
      { when:g=>g.time>2&&!g.vars.dlDone&&!g.crew().some(u=>u.def.heal), do:g=>{ g.fail('records'); g.lose('Devreese is dead, and nobody else in the crew knows what to look for in Maas\'s files. The formula stays at Kappa.'); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The Osprey crew dies among the tents at Kappa. The hospital treats its own wounded first, and buries the raiders last.') }
    ]
  }
);
/* the alarm: the hospital calls Tycho, and the relief squads start coming */
function ntAlarm(g,line){ if(g.vars.alarm!=null) return; g.vars.alarm=g.time; g.say('Kappa medical',line);
  g.ping('2'); g.setTimer(G.mission.job.firstWave,'Relief squad');
  g.crewSay('Capt. Kerckhoffs','That is the alarm. Tycho will be dropping people on that pad. Get Devreese her files and get the cases, fast.'); }
/* when the next relief squad is due */
function ntDue(g){ const J=G.mission.job; return g.vars.alarm+J.firstWave+g.vars.sent*J.waveEvery; }
