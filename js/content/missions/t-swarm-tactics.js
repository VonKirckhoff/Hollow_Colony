'use strict';
/* Training (the Swarm): Brood Tactics, in Kappa Basin. Goes on from The First Hunger: Hive Sense, the drill squad and its ring,
   two teams, luring one out (the lone tower and the Engineer, a biter and the chase), bringing him home, the Husk limit and the dropship,
   and tearing down the outpost. No soldiers wander into the open here: what you want, you lure out.
   Every step has a demo(g,D) for Watch mode (27b-demo.js).
   BROOD_TACTICS (also in the dev panel):
     drill = the drill squad's soldiers, drillHp = their health ×, drillDmg = their damage ×,
     ring = tiles round the outpost where they cannot fall (drillRise = share of health they get back up with); outside it they are exposed,
     drillHeal = share of health per second they heal inside the ring with no Swarm within 7 tiles,
     chaseR = tiles from the outpost a soldier chases a lone biter (chaseFoes = at most this many Swarm creatures near him), chaseTime = seconds at most,
     refill = seconds before a dropship brings a replacement, flight = seconds the dropship takes,
     huskMax = most soldiers turned or turning at once: one brought down outside the ring while that many are turned dies without a body
     (he still feeds the brood). */
const BROOD_TACTICS = { drill:['trooper','trooper','trooper','engineer'], drillHp:2, drillDmg:0.5, drillRise:0.6, drillHeal:0.06,
  ring:6, chaseR:12, chaseFoes:2, chaseTime:15, refill:10, flight:12, huskMax:4 };
const DRILL_AT = {x:19,y:20}, LURE_AT = {x:9,y:26}, PAD_AT = {x:16,y:22}, SIDE_AT = {x:16,y:13}, AMBUSH_AT = {x:4,y:27}, BITE_AT = {x:34,y:22};
const WEST_NEST = {x:3,y:31};   /* top-left of the young western nest (3×3) */
const TEAM_N = {x:21,y:11}, TEAM_E = {x:31,y:20};   /* the demo's team points: north and east of the ring, out of reach of their gun */
const WEST_WAY = [{x:22,y:7},{x:8,y:9},{x:3,y:14},{x:4,y:21},AMBUSH_AT];   /* the demo's way round to the lone tower, out of reach of their gun */
   /* DRILL_AT: the outpost (Q) · LURE_AT: the lone Relay Tower outside the ring (on the build site at 8,25) · PAD_AT: where the dropship lands
      · SIDE_AT: the way round for the second team · AMBUSH_AT: where the demo hides the brood · BITE_AT: where the demo's biter runs to */
/* ---- the drill squad: inside its ring it never falls (u.drill, see damage() in 08-combat.js); outside it, it can be brought down ---- */
const drillCentre=()=>({x:(DRILL_AT.x+.5)*TILE,y:(DRILL_AT.y+.5)*TILE});
function inRing(u){ const c=drillCentre(); return Math.hypot(u.x-c.x,u.y-c.y)<=BROOD_TACTICS.ring*TILE; }
function makeDrill(g,u){ const F=BROOD_TACTICS, c=drillCentre();
  u.maxHp*=F.drillHp; u.hp=u.maxHp; u.dmgMul=(u.dmgMul||1)*F.drillDmg; u.drill={ rise:F.drillRise, x:c.x, y:c.y, r:F.ring*TILE, noBody:()=>turnedCount()>=BROOD_TACTICS.huskMax };
  u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; u.dhome={x:u.x,y:u.y}; (g.vars.drill=g.vars.drill||[]).push(u); return u; }
function drillSquad(g){ const F=BROOD_TACTICS, tiles=freeTilesNear(DRILL_AT.x,DRILL_AT.y,F.drill.length); g.vars.drill=[];
  F.drill.forEach((type,i)=>{ const s=tiles[i]; if(!s) return; const u=makeUnit(type,'corps',(s.x+.5)*TILE,(s.y+.5)*TILE); fromReserve(u); makeDrill(g,u); });
  const c=drillCentre(); G.rings=[{x:c.x,y:c.y,r:F.ring*TILE,col:'#ffb347',label:'DRILL SQUAD: CANNOT FALL INSIDE'}];
  return g.vars.drill; }
/* the drill squad's brain, every tick: the Engineer goes out to mend the lone tower, a soldier chases a lone biter, the rest hold the ring;
   who leaves the ring is EXPOSED; who falls outside it counts as lured (g.vars.lured, and per kind in g.vars.luredEng / g.vars.luredSoldier);
   the dropship tops the squad up to its full strength (g.vars.refills counts who came) */
function drillThink(g){ const F=BROOD_TACTICS, dt=g.time-(g.vars.drillT??g.time); g.vars.drillT=g.time; const c=drillCentre(), tower=g.vars.lureTower;
  /* the lone tower cannot fall: at 1 HP it goes DOWN (nobody can bite it any more, so the brood lets go) until it is mended to half again */
  if(tower&&!tower.dead){ if(!tower.down&&tower.hp<=1.01){ tower.down=true; tower.invuln=true; G.fx.push({k:'text',x:tower.x,y:tower.y-34,t:1.6,max:1.6,txt:'DOWN',col:'#8a8f9c'});
      for(let i=0;i<14;i++) G.fx.push({k:'spark',x:tower.x+rand(-10,10),y:tower.y-14,vx:rand(-80,80),vy:rand(-110,-20),t:0.6,max:0.6,col:'#ffd23f'});
      if(!g.vars.saidDown){ g.vars.saidDown=true; g.brood_say('Their tower is dead. Nothing left to bite: wait for the mender.'); } }
    else if(tower.down&&tower.hp>=tower.maxHp*0.5){ tower.down=false; tower.invuln=false; G.fx.push({k:'text',x:tower.x,y:tower.y-34,t:1.2,max:1.2,txt:'ONLINE',col:'#5fe3b0'}); } }
  const home=u=>{ u.task=null; u.chase=null; u.target=null; u.order={type:'move',x:u.dhome.x,y:u.dhome.y}; setPath(u,u.dhome.x,u.dhome.y); };
  for(const u of g.vars.drill){
    if(u.dead||u.downed){ if(!u.counted){ u.counted=true; if(u.lastOut||!inRing(u)){ g.vars.lured=(g.vars.lured||0)+1; if(u.def.builder) g.vars.luredEng=(g.vars.luredEng||0)+1; else g.vars.luredSoldier=(g.vars.luredSoldier||0)+1; } } continue; }   /* fell outside the ring: lured */
    const inside=inRing(u); u.lastOut=!inside;
    if(!inside&&!u.exposed){ u.exposed=true; G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.6,max:1.6,txt:'EXPOSED',col:'#ff5a4f'}); }
    if(inside) u.exposed=false;
    if(inside&&u.hp<u.maxHp&&!G.ents.some(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,u)<7*TILE)) u.hp=Math.min(u.maxHp,u.hp+u.maxHp*F.drillHeal*dt);
    if(u.def.builder){   /* the Engineer: out to the lone tower when it is hurt, home again once it is whole */
      if(tower&&!tower.dead&&tower.hp<tower.maxHp&&u.task!=='repair'){ u.task='repair'; u.stance=null; u.target=null; u.order={type:'repair',target:tower}; u.path=null;
        if(!g.vars.saidEng){ g.vars.saidEng=true; g.brood_say('Their mender walks out to the hurt tower. Outside the ring he is soft.'); } }
      else if(u.task==='repair'&&(!tower||tower.dead||tower.hp>=tower.maxHp)) home(u);
      else if(u.task==='repair'&&(!u.order||u.order.type!=='repair')&&tower&&!tower.dead) u.order={type:'repair',target:tower}; }
    else if(u.task==='chase'){ const t=u.chase; if(!t||t.dead||t.hidden||Math.hypot(u.x-c.x,u.y-c.y)>F.chaseR*TILE||g.time-u.chaseAt>F.chaseTime) home(u);
      else if(dist(u,t)>2.5*TILE){ if(!u.order||u.order.type!=='move'||Math.hypot(u.order.x-t.x,u.order.y-t.y)>TILE){ u.target=null; u.order={type:'move',x:t.x,y:t.y}; setPath(u,t.x,t.y); } }   /* he runs after it (and shoots on the way) */
      else if(!u.order||u.order.type!=='attack'||u.order.target!==t){ u.target=t; u.order={type:'attack',target:t}; u.path=null; } }
    else if(!u.task&&u.hitAt!=null&&u.hitAt>(u.hitSeen??-1)){ u.hitSeen=u.hitAt;   /* bitten since the last look: by a lone creature? then he goes after it */
      const near=G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&dist(e,u)<6*TILE);
      if(near.length&&near.length<=F.chaseFoes){ const t=near.sort((a,b)=>dist(a,u)-dist(b,u))[0]; u.task='chase'; u.chase=t; u.chaseAt=g.time; u.stance=null; u.target=t; u.order={type:'attack',target:t}; u.path=null;
        G.fx.push({k:'text',x:u.x,y:u.y-30,t:1.2,max:1.2,txt:'AFTER IT',col:'#ffb347'}); if(!g.vars.saidChase){ g.vars.saidChase=true; g.brood_say('One of them runs after the biter. Lead him out of the ring.'); } } }
    if(!u.task){   /* back to his place in the ring, then hold */
      const away=Math.hypot(u.x-u.dhome.x,u.y-u.dhome.y)>TILE;
      if(away&&!u.target&&(!u.order||u.order.type!=='move')) home(u);
      else if(!away&&u.order&&u.order.type==='move'){ u.order={type:'hold'}; u.stance='hold'; u.home={x:u.x,y:u.y}; } } }
  g.vars.drill=g.vars.drill.filter(u=>!(u.dead||u.downed)||!u.counted);
  /* top up: a dropship brings who is missing */
  const pad=g.vars.pad; if(!pad||pad.dead) return;
  for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='corps'&&!u.drill&&dist(u,pad)<4*TILE){ makeDrill(g,u); u.dhome={x:u.x,y:u.y}; g.vars.refills=(g.vars.refills||0)+1; }   /* just off the dropship */
  const alive=g.vars.drill.filter(u=>!u.dead&&!u.downed), want=[...F.drill]; for(const u of alive){ const k=want.indexOf(u.type); if(k>=0) want.splice(k,1); }
  if(!want.length||pad.flight){ g.vars.refillAt=null; return; }
  if(g.vars.refillAt==null){ g.vars.refillAt=g.time+F.refill; return; }
  if(g.time>=g.vars.refillAt){ g.vars.refillAt=null; pad.flight={ t:F.flight, total:F.flight, cargo:want }; G.selDirty=true; g.brood_say('A flying thing comes to their outpost. It brings new soft ones to stand in the ring.'); } }
/* demo helpers for this training */
const drillAlive=g=>(g.vars.drill||[]).filter(u=>!u.dead&&!u.downed);
/* Watch mode: after a fight the demo pulls the brood back to the gathering point */
function demoRetreat(){ if(!(G.demo&&G.demo.on)) return; const us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&e.mine&&!e.claim&&!e.haul&&!e.avatar), r=G.swarm.rally; if(us.length&&r) demoMove(us,r.x,r.y); }
const tactPt=p=>({x:(p.x+.5)*TILE,y:(p.y+.5)*TILE});
TRAINING.swarmTactics = {
  id:'training-swarm-tactics', side:'swarm', training:true, demo:true, title:'Brood Tactics', map:'kappa',
  summary:'After The First Hunger: Hive Sense, two teams, and luring the soft ones out of a squad that cannot fall.',
  briefing:[
    'Their drill squad holds the outpost in Kappa Basin. Inside its ring nobody falls. Learn to make a plan with your own groups and to lure them out, one by one. A young nest of ours waits in the west, near their lone tower.',
    'Play The First Hunger first. Press <b>N</b> to skip a step. Nothing here counts for the campaign.'
  ],
  start:{ camera:{x:27,y:13}, rally:{x:31,y:9}, units:[], hives:['a','b','c'] },   /* the gathering point out of reach of their Sentry Gun */
  swarm:{ manualHaul:true, biomass:300, rate:1.2, guardMax:1, guardEvery:30, aggro:0, waves:null, cap:24, unlock:{ spitter:0, brute:0 } },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{
        g.place('sentry','Q',3,-2); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-19,a.y-20)-Math.hypot(b.x-19,b.y-20))[0]; makeBuilding('relay','corps',s.x,s.y,true);
        const t=makeBuilding('relay','corps',8,25,true); t.lure=true; t.noDestroy=true; g.vars.lureTower=t;   /* the lone tower outside the ring, on the build site: it never falls, their Engineer comes to mend it */
        g.vars.pad=g.pad(PAD_AT,'drill'); drillSquad(g);
        const w=makeBuilding('hive','swarm',WEST_NEST.x,WEST_NEST.y,true); w.creepR=2; w.cfg={ guardMax:1 };   /* a young nest in the west, near the lone tower: what you lure out there is carried home without passing their gun */
        const r=tactPt({x:31,y:9}); ['crawler','crawler','crawler','drone','drone','crawler','spitter','crawler'].forEach((type,i)=>{ const f=freeTilesNear(30+(i%4),9+Math.floor(i/4),1)[0]; if(!f) return;
          const u=makeUnit(type,'swarm',(f.x+.5)*TILE,(f.y+.5)*TILE); u.role='brood'; u.mine=true; u.guardAt={x:r.x,y:r.y}; }); } },
    { repeat:true, when:g=>!!g.vars.drill, do:drillThink },
    ...tutorial([
      { say:'Their drill squad holds the outpost. Inside the dashed ring they get back up every time we bring them down; outside it they are as soft as any. Today we make our own plans. Our brood waits at the gathering point.', obj:'Listen to the Brood', hl:['#objectives'],
        demo:(g,D)=>demoLook(D,drillCentre()), done:g=>g.time>2 },
      { keys:['K'], say:'Hive Sense, bottom right, feels their warm bodies round the brood you select. Drag a box round some of the brood. Red is a soldier, orange is easy prey (alone, in a small knot, or out of his ring), yellow a fallen one waiting for [H]. If it is off, press [K].', obj:'Select brood and read Hive Sense', hl:['#btn-tracker'],
        demo:(g,D)=>{ if(!ui.tracker){ demoPress('#btn-tracker'); toggleTracker(); } const us=demoBrood(); selectEntities(us,false); demoLook(D,us[0]||drillCentre()); },
        done:()=>ui.tracker&&selSwarm().length>=2 },
      { keys:['A'], say:'See for yourself what the ring does. Send the brood straight at them with [A] + click. Watch them get back up (HOLDS), and pull back before we lose too many: select the brood and [Right-click] away.', obj:'Attack the drill squad head-on and watch it hold', mark:DRILL_AT, markLabel:'Drill squad',
        demo:(g,D)=>{ const d=drillAlive(g)[0]; if(!d) return; demoLook(D,d); if(!D.mem.a){ D.mem.a=1; demoSend(d.x,d.y,demoBrood()); } },
        done:g=>drillAlive(g).some(u=>u.drill.held>0),
        after:g=>demoRetreat() },
      { keys:['Ctrl','1','2'], say:'There is no plan button: you make the plan. Split the brood in two. Select part of it and press [Ctrl]+[1]; select the rest and press [Ctrl]+[2]. Then press [1] and send that team at them from the front ([A] + click, or [Right-click] a soldier), press [2] and send the other team round the side (the marker) to bite from there.', obj:'Two teams: Ctrl+1, Ctrl+2, attack from two sides', mark:SIDE_AT, markLabel:'Round the side',
        setup:g=>{ g.biomass(150); g.reveal(DRILL_AT,9,60); },
        demo:(g,D)=>{ const us=demoBrood(); if(us.length<6){ demoHatch(['crawler','drone','crawler'][us.length%3]); return; }
          if(!D.mem.g){ D.mem.g=1; const h=Math.ceil(us.length/2); G.groups=G.groups||{}; G.groupForm=G.groupForm||{}; G.groups['1']=us.slice(0,h); G.groups['2']=us.slice(h); toast('Group 1 saved. Group 2 saved.',true);
            const side=tactPt(SIDE_AT); demoMove(G.groups['2'],side.x,side.y); demoLook(D,side); return; }
          const d=drillAlive(g)[0]; if(!d) return; const a=G.groups['1'].filter(u=>!u.dead), b=G.groups['2'].filter(u=>!u.dead);
          if(!D.mem.f){ D.mem.f=1; selectEntities(a,false); swarmRight(d.x,d.y); demoLook(D,d); return; }
          if(b.length&&!b.some(u=>u.role==='wave'||(u.target&&u.target.faction==='corps'))){ selectEntities(b,false); swarmRight(d.x,d.y); demoLook(D,d); } },   /* a few seconds on the way round, then team 2 bites too */
        done:g=>{ const grp=n=>((G.groups||{})[n]||[]).filter(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'); const a=grp('1'), b=grp('2'), sent=u=>u.role==='wave'||(u.target&&u.target.faction==='corps');
          if(a.length&&a.some(u=>!b.includes(u))&&a.some(sent)) g.vars.team1=true; if(b.length&&b.some(u=>!a.includes(u))&&b.some(sent)) g.vars.team2=true;   /* remembered: a team may be beaten before the other gets there */
          return !!(g.vars.team1&&g.vars.team2); },
        after:g=>demoRetreat() },
      { keys:['1','G','T','Shift','A'], say:'Every team can have its own gathering point. Press [1] to select team 1, press [G] and click somewhere north of the ring; select team 2 and give it a point in the east. A hive hatches straight into a team too: press [T] to choose which one. Now press [Shift]+[A] with nothing selected and click the drill squad: every team goes from its own point, and the closer ones wait, so they all bite at the same time.', obj:'Two team points, then Shift+A: all together',
        setup:g=>{ g.biomass(150); g.vars.sync0=G.swarm.syncN||0; },
        demo:(g,D)=>{ const us=demoBrood(); if(!D.mem.t){ const ts=swarmTeams(); if(ts.length<2){ if(us.length<6){ demoHatch(['crawler','drone','crawler'][us.length%3]); return; } const h=Math.ceil(us.length/2); G.groups=G.groups||{}; G.groups['1']=us.slice(0,h); G.groups['2']=us.slice(h); }
            D.mem.t=1; const a=tactPt(TEAM_N), b=tactPt(TEAM_E); selectEntities(G.groups['1'].filter(u=>!u.dead),false); setTeamRally('1',a.x,a.y); demoLook(D,a); return; }
          if(!D.mem.u){ D.mem.u=1; const b=tactPt(TEAM_E); selectEntities(G.groups['2'].filter(u=>!u.dead),false); setTeamRally('2',b.x,b.y); demoLook(D,b); return; }
          const a=tactPt(TEAM_N), b=tactPt(TEAM_E), ready=['1','2'].every(n=>(G.groups[n]||[]).filter(u=>!u.dead).filter(u=>dist(u,n==='1'?a:b)<4*TILE).length>=1);
          if(!ready&&D.t<30) return; const d=drillAlive(g)[0]; if(!d||D.mem.s) return; D.mem.s=1; selectEntities([],false); demoTap(d); sendWave(d.x,d.y,true); demoLook(D,d); },
        done:g=>(G.swarm.syncN||0)>g.vars.sync0&&Object.keys(G.swarm.teamRally).filter(n=>teamAlive(n)).length>=2,
        after:g=>demoRetreat() },
      { keys:['A'], say:'Lure one out. Take the brood round to the lone Relay Tower (the marker), the long way, out of reach of their gun, and hide it near the tower. Then send a single creature to bite the tower. It cannot fall: once it is dead it is nothing to bite. Their Engineer walks out to mend it. Outside the ring he is soft: bring him down.', obj:'Lure the Engineer out with the lone tower and bring him down', mark:LURE_AT, markLabel:'Lone tower',
        setup:g=>{ g.vars.le0=g.vars.luredEng||0; g.biomass(100); g.reveal(LURE_AT,6,120); },
        demo:(g,D)=>{ const T=g.vars.lureTower, us=demoBrood(); if(us.length<6&&!D.mem.go){ demoHatch(['crawler','drone','spitter'][us.length%3]); return; } D.mem.go=1;
          if(!D.team) D.team=us.slice(); const team=D.team.filter(u=>!u.dead); const eng=drillAlive(g).find(u=>u.def.builder);
          if(!D.mem.there){ demoLook(D,team[0]||T); if(demoRoute(D,'w',team,WEST_WAY)) D.mem.there=1; return; }   /* the long way round, out of reach of their gun */
          if(!D.mem.b){ D.mem.b=1; D.bait=team.find(u=>u.type==='crawler')||team[0]; selectEntities([D.bait],false); swarmRight(T.x,T.y); demoLook(D,T); return; }
          if(!eng) return; demoLook(D,eng);
          if(!inRing(eng)&&dist(eng,T)<6*TILE&&!team.some(u=>u.target===eng)){ selectEntities(team,false); swarmRight(eng.x,eng.y); } },
        done:g=>(g.vars.luredEng||0)>g.vars.le0 },
      { keys:['H'], say:'He bleeds out where he fell. Press [H]: the brood carries him home, and a Grafter turns him.', obj:'Bring the lured one home (H)',
        demo:(g,D)=>{ const b=G.ents.find(e=>!e.dead&&e.kind==='body'&&!e.fauna&&!e.home); const d=G.ents.find(e=>!e.dead&&e.downed&&e.drill); demoLook(D,b?(b.carrier||b):d||tactPt(LURE_AT));
          if(!b||b.carrier||G.ents.some(e=>!e.dead&&e.claim===b&&e.claimMode==='haul')) return; if(demoBrood().length<2){ demoHatch('drone'); return; } demoFetch(b); },   /* the nearest one (the ambush team) carries him: the way past their gun is deadly */
        done:()=>G.ents.some(e=>!e.dead&&((e.kind==='body'&&!e.fauna&&e.home)||(e.type==='cocoon'&&e.husk)||e.type==='husk')) },
      { keys:['A'], say:'Another way. Let a single creature bite a soldier at the edge of the ring and run: he chases it out. Wait with the rest a little further on and fall on him once he is outside the ring.', obj:'Lure a soldier out by biting him, and bring him down',
        setup:g=>{ g.vars.ls0=g.vars.luredSoldier||0; g.biomass(80); g.reveal(DRILL_AT,9,120); },
        demo:(g,D)=>{ const r=G.swarm.rally, us=demoBrood().filter(u=>!r||dist(u,r)<14*TILE), run=tactPt(BITE_AT), c=drillCentre(); if((us.length<10||!us.some(u=>u.type==='brute'))&&!D.mem.go){ demoHatch(us.some(u=>u.type==='brute')?['drone','spitter','brute','drone'][us.length%4]:'brute'); return; } D.mem.go=1;   /* the brood at the gathering point, not the team in the west */
          if(!D.team) D.team=us.slice(); const team=D.team.filter(u=>!u.dead);
          if(!D.mem.there){ demoLook(D,run); if(demoRoute(D,'e',team,[{x:33,y:15},BITE_AT])) D.mem.there=1; return; }   /* wait east of the ring, out of reach of their gun */
          const chaser=drillAlive(g).find(u=>u.task==='chase'), t=drillAlive(g).filter(u=>!u.def.builder).sort((a,b)=>dist(a,run)-dist(b,run))[0];
          if(chaser){ demoLook(D,chaser); if(D.bait&&!D.bait.dead&&!D.mem.fled){ D.mem.fled=1; selectEntities([D.bait],false); swarmRight(run.x+3*TILE,run.y); }
            if(Math.hypot(chaser.x-c.x,chaser.y-c.y)>(BROOD_TACTICS.ring+3)*TILE&&!team.some(u=>u!==D.bait&&u.target===chaser)){ selectEntities(team,false); swarmRight(chaser.x,chaser.y); } return; }   /* fall on him once he is well out, past the reach of their gun */
          if(!t) return; if(!D.bait||D.bait.dead||D.mem.fled){ D.bait=team.find(u=>u.type==='brute'&&!u.dead)||team.find(u=>u.type==='drone'&&!u.dead)||team[0]; D.mem.fled=0; }   /* a tough biter that lives to run back */
          if(!D.bait) return; demoLook(D,t); selectEntities([D.bait],false); swarmRight(t.x,t.y); },
        done:g=>(g.vars.luredSoldier||0)>g.vars.ls0 },
      { say:`Every one we take, a flying thing replaces: it lands on their pad in the ring and a new soldier steps out. And mind our limit: never more than ${BROOD_TACTICS.huskMax} of theirs turned or turning at once. Lure one out while we have ${BROOD_TACTICS.huskMax} and he dies without a body (he still feeds us). Fewer Husks only come from losing some in a fight.`, obj:'Watch the dropship bring a new one', mark:PAD_AT, markLabel:'Their pad',
        demo:(g,D)=>{ demoLook(D,g.vars.pad||tactPt(PAD_AT)); },
        setup:g=>{ g.vars.rf0=g.vars.refills||0; }, done:g=>(g.vars.refills||0)>g.vars.rf0||g.time>g.vars.tutStart+40 },
      { say:'Now everything at once: tear down their outpost, the tower and the gun in the ring. The drill squad will not fall there, but it cannot stop all of us. Use your teams.', obj:'Destroy the Relay Tower and the Sentry Gun', mark:'Q', markLabel:'Outpost',
        setup:g=>{ g.biomass(300); },
        demo:(g,D)=>{ const t=tut.built('sentry')[0]||tut.built('relay')[0]; if(!t) return; demoLook(D,t);
          const us=demoBrood(); if(us.length<16){ for(let k=0;k<3;k++) demoHatch(['brute','spitter','brute','drone'][(us.length+k)%4]); if(us.length<10) return; } if(us.filter(u=>u.target||u.role==='wave').length<us.length*0.6) demoSend(t.x,t.y,us); },
        done:()=>tut.built('relay').length===0&&tut.built('sentry').length===0, after:g=>g.win('The outpost is torn open. Ring or no ring, the Brood takes what it wants.') }
    ])
  ]
};
