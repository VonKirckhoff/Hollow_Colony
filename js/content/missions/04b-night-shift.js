'use strict';
/* Corps mission 5: Night Shift (the Corps side of Rogue job 2, Needle and Thread)
   Kappa Basin, a week after The Hollow Colony. The relay station Dust held in Hold Kappa is a field hospital now, and Dr. Maas's
   shipment (her stabilizer and her files) waits there for a convoy to Tycho. Dust holds the hospital until dawn (job.nsHold).
   Raiders in Corps armour without IFF come in from the south-west in a wedge and dig in at the edge of the plating, while three of
   them climb out of the old shaft in the north wall: their Medic goes for the records terminal, two others for the stabilizer cases.
   They are the Osprey crew (the end screen says so), an elite team. They never die: one who breaks off runs to the nearest hive,
   out of reach, and the hive heals him (g.ospreyHeal). Healed, they wait at the hive and come back together with the next Swarm
   wave (every job.nsEvery seconds). Burn the hives and they have nowhere left to heal. At dawn they pull out.
   Optional: keep the files, keep the three cases. job: the numbers of this mission (dev panel, "This mission"). */
const NS_TENTS=[ {x:16,y:16}, {x:23,y:16}, {x:16,y:22} ];   /* top-left tiles of the three hospital tents (as in Needle and Thread) */
const NS_CASES=[ {x:17,y:18}, {x:24,y:18}, {x:18,y:24} ];   /* the stabilizer case in front of each tent */
const NS_TERM={x:20,y:19};                                  /* where their Medic stands at the records terminal */
MISSIONS.push(
  {
    id:'night-shift', title:'Night Shift', map:'kappa', ospreyVoice:'Unknown voice',
    summary:'Hold the Kappa field hospital until dawn. Something walks past the Swarm to get in, and it keeps coming back.',
    briefing:[
      'A week after Hollow Colony. The relay station you held at Kappa is a field hospital now, and Dr. Maas\'s shipment sits in its tents: three cases of her stabilizer and the files that go with it. The convoy to Tycho comes at dawn, ten minutes from now.',
      'Until then Dust holds the hospital. Set up your Sentry Guns, keep the tents and the records terminal covered, and keep your eyes on the dark. Kestrel can fly replacements to the pad just south of the tents; claim the relay pads to pay for them.',
      'Kappa medical has a dozen wounded in those tents. Nobody gets near them.'
    ],
    job:{ nsHold:600, nsArrive:40, nsSneak:25, nsFirst:120, nsEvery:90, nsDownload:60, nsGrab:2.5, nsWave:45, nsWaveGrow:15 },
    start:{ salvage:200, camera:'Q',
      units:[ ['trooper','Q',4], ['gunner','Q',1], ['pyro','Q',1], ['medic','Q',1], ['engineer','Q',1] ],
      buildings:[], hives:['a','b','c'],
      shafts:[ {x:17,y:2,wall:'n',exit:true,label:'Old shaft'}, {x:2,y:35,wall:'w',exit:true,label:'Old shaft'} ] },
    limits:{ sentry:2 },
    landingZone:{ tx:21, ty:26, max:10, delay:25 },   // a pad just south of the tents: replacements, never more than 10 on the ground
    dark:{ sight:0.5 },                 // night: sight × 0.5, the hospital itself is lit
    noTraining:true,
    swarm:{ biomass:40, rate:0.3, guardMax:4, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:150, brute:9999 } },
    objectives:[
      { id:'dawn',    text:'Hold the hospital until dawn' },
      { id:'records', text:'Keep them off the records terminal', optional:true },
      { id:'stab',    text:'Keep the three cases of stabilizer (3/3)', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{ const J=G.mission.job;
          for(const t of NS_TENTS) makeBuilding('medtent','none',t.x,t.y,true);
          g.vars.term=makeBuilding('terminal','none',20,18,true);
          g.vars.cases=NS_CASES.map(c=>{ const p=g.where(c); const e={ id:NEXT_ID++, kind:'crate', rogue:true, stab:1, x:p.x, y:p.y, r:8, faction:'none', t:1e9, seed:Math.random()*9, grab:0 }; G.ents.push(e); return e; });
          g.ospreyExits([{x:17,y:3},{x:2,y:35}]); g.ospreyHeal(true); g.vars.dl=0; g.vars.dlT=g.time; g.vars.push=0;
          g.setTimer(J.nsHold,'Dawn'); g.marker('term',{x:20,y:18},'Records terminal'); g.reveal({x:20,y:20},6,1e6); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, you have the hospital until the convoy comes at dawn. Maas\'s cases and her files stay where they are. Quiet night, people.') },
      { when:g=>g.time>9,  do:g=>g.say('Sgt. Kessler','Engineer: two Sentry Guns, cover the tents and the terminal. Everyone else, round the plating. Nobody sleeps.') },
      { when:g=>g.time>20, do:g=>g.say('Kappa medical','Kappa medical to Dust. We have twelve wounded in the tents and a terminal full of Dr. Maas\'s work. Thank you for being here.') },
      /* they come: a squad from the south-west, in a wedge; it digs in at the edge of the plating and draws Dust out */
      { when:g=>g.time>G.mission.job.nsArrive, do:g=>{
          const a=[...g.osprey('pyro','P',1),...g.osprey('gunner','P',1),...g.osprey('trooper','P',2)];
          g.ospreySquad(a,{x:13,y:26},{leash:8}); g.vars.came=g.time; g.ping('P'); G.alert={x:(6+.5)*TILE,y:(34+.5)*TILE};
          g.say('Kappa medical','Movement at the south-west perimeter. Corps armour... no IFF. Dust, they are not answering!'); } },
      { when:g=>g.vars.came&&g.time>g.vars.came+6, do:g=>g.say('Sgt. Kessler','Corps kit, no transponders, and they move like a fire team. Whoever they are, they are good. Weapons free.') },
      { when:g=>g.vars.came&&g.time>g.vars.came+10, do:g=>g.ospreySay('Unknown voice','Shoot what shoots back. Nothing else. Keep them looking at you. Doc, you have your window.') },
      /* while Dust looks south-west, three of them climb out of the old shaft in the north wall: the Medic for the terminal */
      { when:g=>g.vars.came&&g.time>g.vars.came+G.mission.job.nsSneak, do:g=>{ g.vars.doc=g.osprey('medic',{x:17,y:4},1)[0];
          const b=[...g.osprey('trooper',{x:16,y:4},1,{capt:true}),...g.osprey('engineer',{x:18,y:4},1)]; g.ospreySquad(b,{x:21,y:17},{leash:5}); g.vars.docGo=true; } },
      /* their Medic: to the terminal whenever she is sent in, and she stays at it */
      { repeat:true, when:g=>g.vars.doc&&g.vars.docGo&&!g.vars.dlDone&&!g.vars.out, do:g=>{ const d=g.vars.doc, t=g.where(NS_TERM);
          if(d.dead||d.ospBroke){ g.vars.docGo=false; return; }
          if(Math.hypot(d.x-t.x,d.y-t.y)>1.2*TILE&&(!d.order||d.order.type!=='move')){ g.ospreyLeave(d); d.ospReady=false; d.order={type:'move',x:t.x,y:t.y}; setPath(d,t.x,t.y); }
          d.home={x:t.x,y:t.y}; } },
      /* the download: it keeps what it has between two pushes */
      { repeat:true, when:g=>g.vars.came&&!g.vars.dlDone&&!g.vars.out, do:g=>{ const dt=g.time-g.vars.dlT; g.vars.dlT=g.time; const t=g.vars.term, d=g.vars.doc;
          const at=d&&!d.dead&&!d.ospBroke&&Math.hypot(d.x-t.x,d.y-t.y)<1.9*TILE;
          if(at){ g.vars.dl=Math.min(1,g.vars.dl+dt/G.mission.job.nsDownload); d.face=t.x>=d.x?1:-1;
            if(Math.random()<0.25) G.fx.push({k:'spark',x:t.x+rand(-5,5),y:t.y-12,vx:rand(-10,10),vy:rand(-30,-10),t:0.4,max:0.4,col:'#e2556b'});
            if(!g.vars.dlSaid){ g.vars.dlSaid=true; g.ping({x:20,y:18}); g.say('Kappa medical','Records breach! Someone is in the terminal! Dust, the terminal!'); } }
          g.setText('records',`Keep them off the records terminal${g.vars.dl>0?` (download ${Math.floor(g.vars.dl*100)}%)`:''}`);
          if(g.vars.dl>=1){ g.vars.dlDone=true; g.fail('records'); g.unmark('term'); g.say('Kappa medical','They are out of the terminal... they took all of it. Dr. Maas\'s files. All of them.'); if(!d.dead&&!d.ospBroke){ d.order=null; g.ospreyHunt([d]); } } } },
      /* the stabilizer: two of them go case by case once their Medic is at the terminal; a moment at a case and it is gone */
      { repeat:true, when:g=>g.vars.came&&!g.vars.out, do:g=>{ const J=G.mission.job;
          for(const c of g.vars.cases){ if(c.dead) continue; const by=g.ospreys().find(u=>Math.hypot(u.x-c.x,u.y-c.y)<1.3*TILE);
            if(by){ c.grab+=0.25; if(c.grab>=J.nsGrab){ c.dead=true; G.fx.push({k:'text',x:c.x,y:c.y-12,t:1.4,max:1.4,txt:'TAKEN',col:'#e2556b'}); SFX.play('alarm');
                if(!g.vars.lostCase){ g.vars.lostCase=true; g.fail('stab'); g.say('Kappa medical','A case is gone! They are taking the stabilizer!'); } } }
            else c.grab=Math.max(0,c.grab-0.1); }
          const c=g.vars.cases.find(c=>!c.dead);
          if(g.vars.dlSaid&&c){ const gr=g.ospreys().filter(u=>u.type==='trooper'&&!u.ospCapt&&!u.ospReady).slice(0,2);
            for(const u of gr) if(!u.target){ g.ospreyLeave(u); if(!u.order||u.order.type!=='move'||Math.hypot(u.order.x-c.x,u.order.y-c.y)>TILE){ u.order={type:'move',x:c.x,y:c.y}; setPath(u,c.x,c.y); } } }
          const kept=g.vars.cases.filter(c=>!c.dead).length; g.setText('stab',`Keep the three cases of stabilizer (${kept}/3)`); } },
      { when:g=>g.vars.came&&g.time>g.vars.came+20&&g.vars.dl<0.5, do:g=>g.say('Medic','Sarge, I put a full burst into one of them. He kept walking. And the brood does not even look at them.') },
      /* one crawls off to a hive, and the hive closes his wounds */
      { when:g=>g.ospreyHealing()>0, do:g=>{ const u=G.ents.find(e=>!e.dead&&e.osprey&&e.ospHeal); if(u) g.ping({x:Math.floor(u.ospHeal.x/TILE),y:Math.floor(u.ospHeal.y/TILE)});
          g.say('Sgt. Kessler','He is not running away, he is running to the hive. And it lets him in. Whatever they are, the brood patches them up. Burn the hives and they have nowhere to go.'); } },
      { when:g=>g.vars.came&&g.hives()===0, do:g=>g.say('Sgt. Kessler','That was the last hive. Next one we put down stays down.') },
      /* the sirens wake the basin */
      { when:g=>g.vars.came&&g.time>g.vars.came+60, do:g=>{ g.wave(G.mission.job.nsWave,{x:20,y:20}); g.say('Kappa medical','The sirens... the basin is waking up. Swarm moving from the hives!'); } },
      /* the push: every nsEvery seconds whoever is back on his feet comes in again, together with a wave from the hives */
      { repeat:true, when:g=>g.vars.came&&!g.vars.out&&g.time>g.vars.came+G.mission.job.nsFirst+g.vars.push*G.mission.job.nsEvery&&g.timerLeft()>45, do:g=>{ const J=G.mission.job, n=++g.vars.push;
          const free=g.ospreys().filter(u=>u!==g.vars.doc&&(u.ospReady||!u.ospSquad)&&!(u.order&&u.order.type==='move'));
          const doc=g.vars.doc&&!g.vars.doc.dead&&!g.vars.doc.ospBroke&&!g.vars.dlDone?g.vars.doc:null;
          if(doc&&doc.ospReady){ g.vars.docGo=true; const esc=free.filter(u=>u.ospCapt||u.type==='engineer'); if(esc.length) g.ospreySquad(esc,{x:21,y:17},{leash:5}); }
          const rest=free.filter(u=>!u.ospSquad||u.ospReady); if(rest.length) g.ospreySquad(rest,{x:19,y:23},{leash:9});
          g.wave(J.nsWave+J.nsWaveGrow*n,{x:20,y:20});
          if(rest.length||(doc&&g.vars.docGo)) g.say('Kappa medical',n===1?'They are coming back... the same ones, they are back on their feet! And the brood is with them!':'Here they come again! Raiders and brood, together!');
          else g.say('Kappa medical','Swarm moving on the hospital!'); } },
      { when:g=>g.timerLeft()<=60&&g.timerLeft()>0, do:g=>g.say('Cmdr. Varga','One minute to dawn, Dust. The convoy is in the air. Hold on.') },
      /* dawn: they pull out, and the convoy comes */
      { when:g=>g.vars.came&&g.timerLeft()<=0&&!g.vars.out, do:g=>{ g.vars.out=g.time; g.clearTimer(); g.complete('dawn'); if(!g.vars.dlDone) g.complete('records'); if(!g.vars.lostCase) g.complete('stab'); g.unmark('term');
          g.ospreyWithdraw(); g.ospreySay('Unknown voice','Sun is coming up. Smoke, everyone, and out. Nobody stays behind.');
          const kept=g.vars.cases.filter(c=>!c.dead).length;
          g.win(`Dawn over Kappa, and the convoy sets down south of the tents. ${kept===3?'All three cases are still in the tents':kept?`${kept} of the three cases are still in the tents`:'The tents are empty'}${g.vars.dlDone?' and the terminal has been wiped clean':' and the terminal holds'}. The raiders left blood on the plating, and Tycho runs it overnight. Human, the lab says. And not. The blood belongs to the crew of the Osprey, listed as lost with all hands at Hollow Colony. By morning Cmdr. Varga signs Containment Order 9: the Osprey crew carries the strain. Engage on sight.`); } }
    ]
  }
);
