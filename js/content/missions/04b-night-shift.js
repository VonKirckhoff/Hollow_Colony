'use strict';
/* Corps mission 5: Night Shift (the Corps side of Rogue job 2, Needle and Thread)
   Kappa Basin, a week after The Hollow Colony. The relay station Dust held in Hold Kappa is a field hospital now, and Dr. Maas's
   shipment (her stabilizer and her files) waits there for a convoy to Tycho. Dust stands guard for the night.
   Raiders in Corps armour without IFF come in from the south-west, while three of them slip in from the old shaft in the north wall
   to pull the files off the records terminal. They are the Osprey crew (the end screen says so): they never die, they break off and run.
   Optional: keep the files, keep the three cases of stabilizer. job: the numbers of this mission (dev panel, "This mission"). */
const NS_TENTS=[ {x:16,y:16}, {x:23,y:16}, {x:16,y:22} ];   /* top-left tiles of the three hospital tents (as in Needle and Thread) */
const NS_CASES=[ {x:17,y:18}, {x:24,y:18}, {x:18,y:24} ];   /* the stabilizer case in front of each tent */
MISSIONS.push(
  {
    id:'night-shift', title:'Night Shift', map:'kappa', ospreyVoice:'Unknown voice',
    summary:'Guard the Kappa field hospital through the night. Something walks past the Swarm to get in.',
    briefing:[
      'A week after Hollow Colony. The relay station you held at Kappa is a field hospital now, and Dr. Maas\'s shipment sits in its tents: three cases of her stabilizer and the files that go with it. The convoy to Tycho comes at dawn.',
      'Until then Dust stands guard. The hives in the basin are quiet. Set up your Sentry Guns, keep the tents and the records terminal covered, and keep your eyes on the dark.',
      'Kappa medical has a dozen wounded in those tents. Nobody gets near them.'
    ],
    job:{ nsArrive:40, nsSneak:25, nsDownload:60, nsGrab:2.5, nsBreak:6, nsStay:220 },
    start:{ salvage:200, camera:'Q',
      units:[ ['trooper','Q',4], ['gunner','Q',1], ['pyro','Q',1], ['medic','Q',1], ['engineer','Q',1] ],
      buildings:[], hives:['a','b','c'],
      shafts:[ {x:17,y:2,wall:'n',exit:true,label:'Old shaft'}, {x:2,y:35,wall:'w',exit:true,label:'Old shaft'} ] },
    limits:{ sentry:2 },
    dark:{ sight:0.5 },                 // night: sight × 0.5, the hospital itself is lit
    noTraining:true,
    swarm:{ biomass:40, rate:0.3, guardMax:4, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:150, brute:9999 } },
    objectives:[
      { id:'drive',   text:'Drive the raiders out of the hospital' },
      { id:'records', text:'Keep them off the records terminal', optional:true },
      { id:'stab',    text:'Keep the three cases of stabilizer (3/3)', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          for(const t of NS_TENTS) makeBuilding('medtent','none',t.x,t.y,true);
          g.vars.term=makeBuilding('terminal','none',20,18,true);
          g.vars.cases=NS_CASES.map(c=>{ const p=g.where(c); const e={ id:NEXT_ID++, kind:'crate', rogue:true, stab:1, x:p.x, y:p.y, r:8, faction:'none', t:1e9, seed:Math.random()*9, grab:0 }; G.ents.push(e); return e; });
          g.ospreyExits([{x:17,y:3},{x:2,y:35}]); g.pad('2','relief'); g.vars.dl=0; g.vars.dlT=g.time;
          g.marker('term',{x:20,y:18},'Records terminal'); g.reveal({x:20,y:20},6,1e6); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Dust, you have the hospital until the convoy comes at dawn. Maas\'s cases and her files stay where they are. Quiet night, people.') },
      { when:g=>g.time>9,  do:g=>g.say('Sgt. Kessler','Engineer: two Sentry Guns, cover the tents and the terminal. Everyone else, round the plating. Nobody sleeps.') },
      { when:g=>g.time>20, do:g=>g.say('Kappa medical','Kappa medical to Dust. We have twelve wounded in the tents and a terminal full of Dr. Maas\'s work. Thank you for being here.') },
      /* they come: a squad from the south-west, and two of them out of the old shaft in the north wall */
      { when:g=>g.time>G.mission.job.nsArrive, do:g=>{ const J=G.mission.job;
          const a=[...g.osprey('trooper','P',2),...g.osprey('gunner','P',1),...g.osprey('pyro','P',1)];
          g.ospreyOrder(a,{x:13,y:26}); g.vars.sqA=a; g.vars.grabbers=[a[0],a[1]];   /* the diversion: they dig in south-west of the plating and shoot from there */
          g.vars.came=g.time; g.ping('P'); G.alert={x:(6+.5)*TILE,y:(34+.5)*TILE};
          g.say('Kappa medical','Movement at the south-west perimeter. Corps armour... no IFF. Dust, they are not answering!'); } },
      /* while Dust looks south-west, three of them climb out of the old shaft in the north wall and go for the terminal */
      { when:g=>g.vars.came&&g.time>g.vars.came+G.mission.job.nsSneak, do:g=>{ const d=g.vars.doc=g.osprey('medic',{x:17,y:4},1)[0]; g.vars.eng=g.osprey('engineer',{x:18,y:4},1)[0]; g.vars.cap=g.osprey('trooper',{x:16,y:4},1,{capt:true})[0];
          g.ospreyOrder([d],{x:20,y:19},'move'); d.home=g.where({x:20,y:19}); g.ospreyOrder([g.vars.eng],{x:21,y:18}); g.ospreyOrder([g.vars.cap],{x:19,y:17}); } },
      { when:g=>g.vars.came&&g.time>g.vars.came+6, do:g=>g.say('Sgt. Kessler','Corps kit, no transponders. Whoever they are, they are coming straight for the tents. Weapons free.') },
      { when:g=>g.vars.came&&g.time>g.vars.came+10, do:g=>g.ospreySay('Unknown voice','Shoot what shoots back. Nothing else. Doc, you have your window.') },
      /* the terminal: their Medic stands at it and pulls the files */
      { repeat:true, when:g=>g.vars.came&&!g.vars.dlDone&&!g.vars.out, do:g=>{ const dt=g.time-g.vars.dlT; g.vars.dlT=g.time; const t=g.vars.term, d=g.vars.doc;
          const at=d&&!d.dead&&!d.ospBroke&&Math.hypot(d.x-t.x,d.y-t.y)<1.9*TILE;
          if(at){ g.vars.dl=Math.min(1,g.vars.dl+dt/G.mission.job.nsDownload); d.home={x:d.x,y:d.y}; d.face=t.x>=d.x?1:-1;
            if(Math.random()<0.25) G.fx.push({k:'spark',x:t.x+rand(-5,5),y:t.y-12,vx:rand(-10,10),vy:rand(-30,-10),t:0.4,max:0.4,col:'#e2556b'});
            if(!g.vars.dlSaid){ g.vars.dlSaid=true; g.ping({x:20,y:18}); g.say('Kappa medical','Records breach! Someone is in the terminal! Dust, the terminal!'); } }
          else if(d&&!d.dead&&!d.ospBroke&&!d.order&&!d.target){ g.ospreyOrder([d],{x:20,y:19},'move'); d.home=g.where({x:20,y:19}); }   /* back to it as soon as she can */
          g.setText('records',`Keep them off the records terminal${g.vars.dl>0?` (download ${Math.floor(g.vars.dl*100)}%)`:''}`);
          if(g.vars.dl>=1){ g.vars.dlDone=true; g.fail('records'); g.unmark('term'); g.say('Kappa medical','They are out of the terminal... they took all of it. Dr. Maas\'s files. All of them.'); } } },
      /* the stabilizer: one of them stands at a case a moment and it is gone */
      { repeat:true, when:g=>g.vars.came&&!g.vars.out, do:g=>{ const J=G.mission.job;
          for(const c of g.vars.cases){ if(c.dead) continue; const by=g.ospreys().find(u=>Math.hypot(u.x-c.x,u.y-c.y)<1.3*TILE);
            if(by){ c.grab+=0.25; if(c.grab>=J.nsGrab){ c.dead=true; G.fx.push({k:'text',x:c.x,y:c.y-12,t:1.4,max:1.4,txt:'TAKEN',col:'#e2556b'}); SFX.play('alarm');
                if(!g.vars.lostCase){ g.vars.lostCase=true; g.fail('stab'); g.say('Kappa medical','A case is gone! They are taking the stabilizer!'); } } }
            else c.grab=Math.max(0,c.grab-0.1); }
          /* the two who go for the cases: from the plating on, case by case */
          for(const u of g.vars.grabbers) if(g.vars.dlSaid&&!u.dead&&!u.ospBroke&&!u.target&&Math.hypot(u.x-g.where({x:20,y:20}).x,u.y-g.where({x:20,y:20}).y)<7*TILE){ const c=g.vars.cases.find(c=>!c.dead); if(c&&(!u.order||u.order.type!=='move')){ u.order={type:'move',x:c.x,y:c.y}; setPath(u,c.x,c.y); } }
          const kept=g.vars.cases.filter(c=>!c.dead).length; g.setText('stab',`Keep the three cases of stabilizer (${kept}/3)`); } },
      /* the diversion digs in where it can shoot at the plating; the two grabbers go for the cases once the terminal team is in */
      { when:g=>g.vars.sqA&&g.ospreyNear({x:13,y:26},3)>0, do:g=>{ for(const u of g.vars.sqA) if(!u.dead&&!u.ospBroke&&!g.vars.grabbers.includes(u)){ u.order={type:'hold'}; u.home={x:u.x,y:u.y}; } } },
      { when:g=>g.vars.dlSaid, do:g=>{ for(const u of g.vars.grabbers) if(!u.dead&&!u.ospBroke){ const c=g.vars.cases.find(c=>!c.dead); if(c){ u.order={type:'amove',x:c.x,y:c.y}; setPath(u,c.x,c.y); } } } },
      /* the files are out (or their Medic is down): the diversion pushes in to cover the way out */
      { when:g=>g.vars.dlDone||(g.vars.doc&&g.vars.doc.ospBroke), do:g=>g.ospreyHunt(g.vars.sqA.filter(u=>!g.vars.grabbers.includes(u))) },
      { when:g=>g.vars.came&&g.time>g.vars.came+20&&g.vars.dl<0.5, do:g=>g.say('Medic','Sarge, I put a full burst into one of them. He kept walking. And the brood does not even look at them.') },
      /* the sirens wake the basin */
      { when:g=>g.vars.came&&g.time>g.vars.came+60, do:g=>{ g.wave(45,{x:20,y:20}); g.say('Kappa medical','The sirens... the basin is waking up. Swarm moving from the hives!'); } },
      /* they pull out: the job is done, too many of them are hurt, or the night is running out */
      { repeat:true, when:g=>g.vars.came&&!g.vars.out, do:g=>{ const J=G.mission.job, d=g.vars.doc;
          const docDone=g.vars.dlDone||(d&&(d.dead||d.ospBroke)), casesDone=g.vars.cases.every(c=>c.dead)||g.vars.grabbers.every(u=>u.dead||u.ospBroke);
          if((docDone&&casesDone)||(g.ospreyBroken()>=J.nsBreak&&g.vars.doc)||g.time>g.vars.came+J.nsStay||(g.vars.doc&&g.ospreys().length===0)){ g.vars.out=g.time; g.ospreyWithdraw();
            g.ospreySay('Unknown voice',g.vars.dlDone?'That is what we came for. Smoke, and out. Nobody stays behind.':'Enough! Smoke, everyone out. We are not killing our own for this.'); } } },
      { repeat:true, when:g=>g.vars.out&&!g.vars.won, do:g=>g.setText('drive',`Drive the raiders out of the hospital (${g.ospreyLeft()} still on the map)`) },
      { when:g=>g.vars.out&&g.ospreyLeft()===0, do:g=>{ g.vars.won=true; g.complete('drive'); if(!g.vars.dlDone) g.complete('records'); if(!g.vars.lostCase) g.complete('stab'); g.unmark('term');
          const kept=g.vars.cases.filter(c=>!c.dead).length;
          g.win(`Dawn over Kappa. ${kept===3?'All three cases are still in the tents':kept?`${kept} of the three cases are still in the tents`:'The tents are empty'}${g.vars.dlDone?' and the terminal has been wiped clean':' and the terminal holds'}. The raiders left blood on the plating, and Tycho runs it overnight. Human, the lab says. And not. The blood belongs to the crew of the Osprey, listed as lost with all hands at Hollow Colony. By morning Cmdr. Varga signs Containment Order 9: the Osprey crew carries the strain. Engage on sight.`); } }
    ]
  }
);
