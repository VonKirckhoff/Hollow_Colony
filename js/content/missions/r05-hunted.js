'use strict';
/* Rogue 5: Hunted
   Selene Highlands, some days after Kill Order (Rogue Strain is a sequel to the Corps campaign). Tycho has the crew's location and sends
   Sgt. Kessler with Squad Dust, your own soldier's old squad, to contain them.
   Take an old uplink beacon and call the Magpie, an ore hauler whose pilot asks no questions, then hold until it lands.
   Optional: let Kessler live. Hurt him badly enough and he pulls back; kill him and that is on you. */
ROGUE_MISSIONS.push(
  {
    id:'rogue-hunted', title:'Hunted', map:'high', rogue:true,
    summary:'Your old squad is hunting you on open ground. Call a ride and hold on.',
    briefing:[
      'Somewhere between Kappa and Mare Colony, Tycho got its location. Either way it knows: the Osprey crew is on the Selene Highlands, and Squad Dust\'s missing soldier is with them.',
      'They sent Sgt. Kessler, and they sent Dust with him. Your squad. The last time you stood on these highlands, Kessler was on your side and the Osprey crew was the target. His orders are to contain us. Out here there is nowhere to hide.',
      'Cnudde knows an ore hauler, the Magpie, whose pilot asks no questions. Take any of the three old uplink beacons and call her, then hold that beacon until she lands. And if you can, let Kessler walk away. He is not the enemy. He just thinks we are.'
    ],
    start:{ salvage:0, camera:{x:5,y:50}, crewAt:{x:5,y:50},
      units:[], buildings:[], hives:['a','b','c','d'], hiveHp:1.3,
      uplinks:[ ['1','West ridge'], ['2','East ridge'], ['3','Centre mesa'] ],
      swarmUnits:[ ['drone','1',3], ['crawler','1',2], ['drone','2',3], ['spitter','2',1], ['drone','3',4], ['spitter','3',1] ] },
    stab:1,
    swarm:{ biomass:60, rate:0.4, guardMax:5, guardEvery:14, waves:{ first:200, every:110, budget:45, growth:8 }, unlock:{ spitter:60, brute:360 },
      hunt:{ every:40, afterEvery:20, budget:40, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[
      { id:'call',    text:'Capture an uplink beacon and call the Magpie' },
      { id:'kessler', text:'Leave Sgt. Kessler alive', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{ g.marker('u1','1','Uplink'); g.marker('u2','2','Uplink'); g.marker('u3','3','Uplink'); g.pad('P','kpad'); g.landShip('kpad',12,false); g.vars.kAt=g.time+12.2; } },
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Kerckhoffs','Open ground and a dropship coming in. Get to a beacon. Any beacon.') },
      { when:g=>g.time>6, do:g=>g.say('Sgt. Kessler',`${selfName()}. I know you can hear me. It is Kessler. Walk out with your hands up and I will put you on the transport myself. Nobody else touches you.`) },
      { when:g=>g.time>9, do:g=>g.crewSay(selfName(),'The transport goes to the furnaces, Sarge. You read the order too.') },
      { when:g=>g.time>12, do:g=>g.crewSay('Capt. Kerckhoffs','He means it, too. Doesn\'t matter. A transport ends with Devreese\'s samples in a furnace and us with them. Move.') },
      /* Kessler's squad lands and hunts */
      { when:g=>g.vars.kAt&&g.time>g.vars.kAt, do:g=>{
          const k=g.loyal('trooper','P',1,{ tough:3, name:'Sgt. Kessler' })[0]; k.kessler=true; k.awake=true; g.boss(k,'Sgt. Kessler'); g.vars.kessler=k;
          const sq=[k,...g.loyal('trooper','P',3),...g.loyal('gunner','P',1),...g.loyal('pyro','P',1)]; g.hunt(sq); g.loyal('medic','P',1,{}).forEach(m=>{ m.hunter=false; m.followK=true; });
          g.say('Sgt. Kessler','Dust, spread out and push west. Rifles low until I say so. That is one of ours out there.'); } },
      /* Kessler pulls back once he is badly hurt */
      { repeat:true, when:g=>{ const k=g.vars.kessler; return !!k&&!k.dead&&!g.vars.kOut&&k.hp<k.maxHp*0.3; }, do:g=>{ const k=g.vars.kessler, p=g.where('P'); g.vars.kOut=true;
          k.hunter=false; k.target=null; k.invuln=true; k.order={type:'move',x:p.x,y:p.y}; setPath(k,p.x,p.y); G.boss=null;
          g.say('Sgt. Kessler',`I am hit... Dust, pull back with me. ${selfName()}... damn you.`); g.crewSay('Capt. Kerckhoffs','Let him go! Nobody shoots Kessler.'); g.vars.kGone=g.time+20; } },
      { when:g=>g.vars.kOut&&g.vars.kessler&&!g.vars.kessler.dead&&(g.time>g.vars.kGone||Math.hypot(g.vars.kessler.x-g.where('P').x,g.vars.kessler.y-g.where('P').y)<2*TILE), do:g=>{ const k=g.vars.kessler; k.dead=true; dustPuff(k.x,k.y,12); g.complete('kessler'); } },
      { when:g=>g.vars.kessler&&g.vars.kessler.dead&&!g.vars.kOut, do:g=>{ g.fail('kessler'); G.boss=null; g.crewSay('Van Wesemael','...That was Kessler. I am putting him on the list.'); g.vars.kTaught=g.time+4; } },
      { when:g=>g.vars.kTaught&&g.time>g.vars.kTaught, do:g=>g.crewSay(selfName(),'He taught me to hold a line.') },
      /* a second fire team at four minutes */
      { when:g=>g.time>240&&!g.vars.won, do:g=>{ const sq=[...g.loyal('trooper','P',3),...g.loyal('gunner','P',1)]; g.hunt(sq); g.say('Lt. Van Der Planck','Van Der Planck\'s team on the highlands. Kessler, we have your back.'); } },
      /* a beacon is ours: the call goes out, the Magpie comes to that beacon */
      { when:g=>g.uplinks()>0, do:g=>{ const b=G.ents.find(e=>!e.dead&&e.def&&e.def.capture&&e.owned); g.vars.bp=b.point; g.complete('call');
          for(const k of ['1','2','3']) if(k!==b.point) g.unmark('u'+k); g.marker('u'+b.point,b.point,'Magpie lands here');
          g.say('Magpie','Magpie here. Ore run, no questions, no names. I see your beacon. Two and a half minutes, keep it clear.');
          g.setTimer(150,'Magpie'); g.addObjective('hold','Hold the beacon until the Magpie lands, then everyone aboard'); g.vars.magpie=true;
          const ld=g.loyals().filter(u=>!u.kessler).slice(0,4); for(const u of ld){ u.hunter=false; u.order={type:'amove',x:b.x,y:b.y}; setPath(u,b.x,b.y); } } },
      { when:g=>g.vars.magpie&&g.timerLeft()<=0&&!g.vars.landed, do:g=>{ g.vars.landed=true; g.clearTimer(); const p=g.where(g.vars.bp); const pad=g.pad({x:Math.floor(p.x/TILE)-1,y:Math.floor(p.y/TILE)+2},'magpie'); g.landShip('magpie',0.1);
          g.say('Magpie','Wheels down. Ramp is open. Ten seconds and I am gone, with or without you.'); } },
      { repeat:true, when:g=>g.vars.landed&&!g.vars.won, do:g=>g.setText('hold',`Everyone aboard the Magpie (${Math.min(g.crewNear(g.vars.bp,5),g.crewUp())}/${g.crewUp()})`) },
      { when:g=>g.vars.landed&&g.crewUp()>0&&g.crewNear(g.vars.bp,5)>=g.crewUp(), do:g=>{ g.vars.won=true; g.complete('hold'); if(g.vars.kessler&&!g.vars.kessler.dead&&!g.vars.kOut) g.complete('kessler');
          rogueStore().flags.kesslerDead=!(g.vars.kOut||(g.vars.kessler&&!g.vars.kessler.dead));   /* The Seed Wakes: who leads Dust down into the Maw */
          g.win(g.vars.kOut||(g.vars.kessler&&!g.vars.kessler.dead)?'The Magpie climbs out over the Highlands with seven passengers she will never mention. On the ground, Kessler watches her go, and writes "no contact" in his report.':'The Magpie climbs out over the Highlands with seven passengers she will never mention. Behind them, Squad Dust zips its own sergeant into a bag.'); } },
      { when:g=>g.time>2&&g.crew().length===0, do:g=>g.lose('Kessler brings the Osprey crew in, and his own soldier with them. All of them, in bags.') }
    ]
  }
);
