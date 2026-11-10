'use strict';
/* Rogue 4: The Fever
   Ridgeback Canyon. One of the crew is burning up: his taint keeps climbing and he goes feral again and again.
   Devreese has worked out what quiets the strain: the song of a living hive. Keep him next to one for twenty seconds.
   A Corps sweep team is burning the canyon's hives one by one: get there first. Then out through the south mine shaft. */
const FV_ORDER=['d','e','c','b','a'];   /* the order in which the sweep team burns the hives */
/* FV_SWEEP: how the sweep team works a hive. They stop `stand` tiles short of it in a circle (`ring` tiles across, Pyro, Medic and
   Engineer in the middle) and hold there against whatever comes. Once nothing of the Swarm is within `clear` tiles of the circle (or going for one of them) for `quiet` seconds,
   the rifles go in to shoot the hive from range; the Pyro joins once it is below `pyroAt` health. If the Swarm comes again, back into the circle. */
const FV_SWEEP={ stand:6.5, ring:1.7, clear:5.5, quiet:4, pyroAt:0.5 };
function sweepTick(g){ const V=g.vars, team=g.loyals().filter(u=>u.sweep); if(!team.length) return;
  let k=FV_ORDER[V.sweepI]; while(k&&!g.hiveAt(k)){ V.sweepI++; k=FV_ORDER[V.sweepI]; } if(!k) return; const w=g.where(k), hive=hives().find(h=>dist(h,w)<2*TILE); if(!hive) return;
  if(!V.sw||V.sw.k!==k){ const cx=team.reduce((s,u)=>s+u.x,0)/team.length, cy=team.reduce((s,u)=>s+u.y,0)/team.length, a=Math.atan2(cy-hive.y,cx-hive.x);
    const sx=hive.x+Math.cos(a)*FV_SWEEP.stand*TILE, sy=hive.y+Math.sin(a)*FV_SWEEP.stand*TILE, t=freeTilesNear(Math.floor(sx/TILE),Math.floor(sy/TILE),1)[0]||{x:Math.floor(sx/TILE),y:Math.floor(sy/TILE)};
    V.sw={ k, x:(t.x+.5)*TILE, y:(t.y+.5)*TILE, state:'march', quiet:0, since:g.time }; }
  const S=V.sw, inner=u=>u.def.heal||u.def.builder||u.type==='pyro';
  /* each soldier's place in the circle */
  const outer=team.filter(u=>!inner(u)), mid=team.filter(inner);
  const spot=u=>{ const o=outer.indexOf(u); if(o>=0){ const a=o/outer.length*Math.PI*2; return { x:S.x+Math.cos(a)*FV_SWEEP.ring*TILE, y:S.y+Math.sin(a)*FV_SWEEP.ring*TILE }; }
    const i=mid.indexOf(u), a=i/Math.max(1,mid.length)*Math.PI*2; return { x:S.x+Math.cos(a)*0.5*TILE, y:S.y+Math.sin(a)*0.5*TILE }; };
  const toCircle=()=>{ for(const u of team){ const p=spot(u), far=Math.hypot(u.x-p.x,u.y-p.y)>0.8*TILE;
      if(far){ if(!u.order||u.order.type!=='move'||Math.hypot(u.order.x-p.x,u.order.y-p.y)>4){ u.order={type:'move',x:p.x,y:p.y}; u.target=null; setPath(u,p.x,p.y); } }
      else if(!u.order||u.order.type!=='hold'){ u.order={type:'hold'}; u.home={x:p.x,y:p.y}; } } };
  const foes=G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&(Math.hypot(e.x-S.x,e.y-S.y)<FV_SWEEP.clear*TILE||(e.target&&team.includes(e.target))));   /* close to the circle, or going for one of them */
  if(S.state==='march'){ toCircle(); const n=team.filter(u=>Math.hypot(u.x-S.x,u.y-S.y)<2.6*TILE).length; if(n>=Math.ceil(team.length*0.7)||g.time-S.since>45) S.state='hold'; return; }
  if(foes){ S.quiet=0; if(S.state==='strike') S.state='hold'; toCircle(); return; }
  S.quiet+=0.5; if(S.state==='hold'){ toCircle(); if(S.quiet>=FV_SWEEP.quiet) S.state='strike'; return; }
  /* strike: the rifles (and later the Pyro) go at the hive; the Medic and Engineer stay in the circle */
  for(const u of team){ const go=!u.def.heal&&!u.def.builder&&(u.type!=='pyro'||hive.hp<hive.maxHp*FV_SWEEP.pyroAt);
    if(go){ if(!u.order||u.order.type!=='attack'||u.order.target!==hive){ u.order={type:'attack',target:hive}; u.target=hive; } }
    else { const p=spot(u); if(Math.hypot(u.x-p.x,u.y-p.y)>0.8*TILE){ if(!u.order||u.order.type!=='move'){ u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); } } else if(!u.order) u.order={type:'hold'}; } } }
ROGUE_MISSIONS.push(
  {
    id:'rogue-the-fever', title:'The Fever', map:'convoy', rogue:true,
    summary:'One of the crew is burning up. Only a living hive can quiet the strain.',
    briefing:[
      'It started two nights ago. The strain in one of us has stopped listening to Devreese\'s doses. The fever climbs, he snaps, he lies shaking, and it climbs again.',
      'Devreese has read Maas\'s notes three times. The strain answers to the hive it came from. Stand him next to a living hive for twenty seconds and it goes quiet. Every other hive in Ridgeback Canyon will do.',
      'The trouble: a Corps sweep team landed in the east this morning, and they are burning the hives one by one. Get him to a hive before they burn them all. Then we leave through the old shaft in the south.'
    ],
    stab:1,
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['a','b','c','d','e'], hiveHp:1.4,
      shafts:[ {x:31,y:2,wall:'n'}, {x:74,y:2,wall:'n'}, {x:56,y:40,wall:'s',exit:true,label:'South shaft'} ],
      swarmUnits:[ ['drone','b',3], ['spitter','b',1], ['drone','c',3], ['crawler','c',2], ['drone','d',3], ['spitter','d',1], ['drone','e',2], ['drone','a',2], ['crawler','a',2] ] },
    swarm:{ shaftHeirs:true, biomass:45, rate:0.36, guardMax:5, guardEvery:15, aggro:7, waves:null, unlock:{ spitter:90, brute:400 },
      hunt:{ every:45, afterEvery:20, budget:40, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[ { id:'calm', text:'Keep the fevered one next to a living hive for 20 seconds (0/20)' } ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          /* the patient: the most tainted of the crew (not the Captain, not the Medic) */
          const c=g.crew().filter(u=>!u.vet.capt&&!u.def.heal).sort((a,b)=>b.vet.taint-a.vet.taint)[0]||g.crew()[0];
          g.vars.pt=c; c.vet.taint=Math.max(c.vet.taint,72); g.vars.calm=0; g.vars.ct=g.time; g.vars.ft=g.time;
          g.setText('calm',`Keep ${c.vet.name} next to a living hive for 20 seconds (0/20)`);
          const sq=[...g.loyal('trooper','9',2),...g.loyal('gunner','9',1),...g.loyal('pyro','9',1),...g.loyal('medic','9',1),...g.loyal('engineer','9',1)];
          for(const u of sq){ u.sweep=true; u.home=null; } g.vars.sweepI=0; g.vars.sweepAt=g.time+25; } },
      { when:g=>g.time>1, do:g=>g.crewSay('Devreese',`${g.vars.pt.vet.name} is at ${Math.round(g.vars.pt.vet.taint)} and climbing. The doses only buy a minute. We need a living hive, Captain. Any hive.`) },
      { when:g=>g.time>9, do:g=>g.crewSay('Capt. Kerckhoffs','Closest nest is north-east of the landing. Everyone around him. And keep that flamer cold.') },
      { when:g=>g.time>28, do:g=>g.say('Lt. Okafor','Sweep team, Okafor. First nest is the south-east one. Burn it and move on, we have five to do before dark.') },
      { when:g=>g.time>34, do:g=>g.crewSay('Cnudde','They are burning the hives! If they get them all, we have nothing.') },
      /* the fever: his taint keeps climbing until a hive has quieted it */
      { repeat:true, when:g=>!g.vars.cured&&g.vars.pt&&!g.vars.pt.dead, do:g=>{ const u=g.vars.pt, dt=g.time-g.vars.ft; g.vars.ft=g.time; if(!(u.feral>0)&&!u.downed) u.vet.taint=Math.min(ROGUE.taint.feral,u.vet.taint+0.45*dt);
          const h=hives().find(h=>Math.hypot(h.x-u.x,h.y-u.y)<4.2*TILE), dc=g.time-g.vars.ct; g.vars.ct=g.time;
          if(h&&!u.downed){ g.vars.calm=Math.min(20,g.vars.calm+dc); if(Math.random()<0.3) G.fx.push({k:'spark',x:u.x+rand(-8,8),y:u.y-rand(4,20),vx:rand(-10,10),vy:rand(-40,-15),t:0.7,max:0.7,col:'#c38bff'});
            if(!g.vars.nearSaid){ g.vars.nearSaid=true; g.crewSay('Devreese','Listen... it is singing to him. Hold him there! Kill what comes, but do not touch the hive!'); } }
          g.setText('calm',`Keep ${u.vet.name} next to a living hive for 20 seconds (${Math.floor(g.vars.calm)}/20)`);
          if(g.vars.calm>=20){ g.vars.cured=true; u.vet.taint=Math.min(u.vet.taint,40); if(u.feral>0) endFeral(u,true); g.complete('calm'); SFX.play('complete');
            g.crewSay('Devreese',`It is quiet. ${u.vet.name}, look at me. ...Good. The fever broke. Now let us get out of this canyon.`);
            g.addObjective('escape','Everyone into the old mine shaft in the south (right-click it)'); g.exitMark('exit'); g.openExit(); }
          else if(!hives().length){ g.vars.cured=true; g.fail('calm'); g.lose(`Every hive in Ridgeback Canyon is ash. ${u.vet.name}'s fever does not break.`); } } },
      { when:g=>g.vars.pt&&g.vars.pt.dead&&!g.vars.cured, do:g=>{ g.fail('calm'); g.lose(`${g.vars.pt.vet.name} is dead, and with nothing to quiet it, the strain does not let ${pron(g.vars.pt.vet,'him')} come back.`); } },
      /* the sweep team goes from hive to hive */
      { repeat:true, when:g=>g.time>g.vars.sweepAt, do:g=>{ g.vars.sweepAt=g.time+0.5; sweepTick(g); } },
      /* the sweep team wiped out: Okafor sends a second one (once) */
      { when:g=>g.time>40&&!g.vars.cured&&!g.loyals().some(u=>u.sweep), do:g=>{ g.vars.team2=g.time+35; g.say('Lt. Okafor','Sweep team one is gone. Team two, you are up. Same orders: burn every nest.'); } },
      { when:g=>g.vars.team2&&g.time>g.vars.team2&&!g.vars.cured, do:g=>{ const sq=[...g.loyal('trooper','9',2),...g.loyal('gunner','9',1),...g.loyal('pyro','9',1),...g.loyal('medic','9',1)]; for(const u of sq){ u.sweep=true; u.home=null; } g.vars.sweepAt=g.time; } },
      { repeat:true, when:g=>g.isDone('calm')&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the old mine shaft in the south, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      { when:g=>g.isDone('calm')&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit');
          g.win(`They carry ${g.vars.pt.vet.name} down the shaft, quiet and cool. Devreese writes one line in Maas's notebook: the strain obeys the hive. Nobody wants to say out loud what that means for the rest of them.`); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The crew falls in Ridgeback Canyon.') }
    ]
  }
);
