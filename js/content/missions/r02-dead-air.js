'use strict';
/* Rogue 2: Dead Air
   Kappa Station is a Corps supply post again. The crew needs what is in its caches. If a loyal soldier or gun sees them,
   the relay towers start calling Tycho: destroy every relay before the call goes out, or the dropship keeps bringing more.
   Then out through the old mine shaft in the east wall. */
const DA_CACHES=[ {x:40,y:33}, {x:47,y:38}, {x:50,y:33} ];
ROGUE_MISSIONS.push(
  {
    id:'rogue-dead-air', title:'Dead Air', map:'canyons', rogue:true,
    summary:'Rob a Corps supply post without letting its radio get a word out.',
    briefing:[
      'Three weeks in the tunnels. The stabilizer is gone, the food is nearly gone, and Devreese says the strain burns hotter in a body that is starving.',
      'Kappa Station is a supply post again: three caches on the station platform, a small garrison, two Sentry Guns, and two Relay Towers, one on the station and one on the northern ridge. Those towers are the danger. The moment anyone at Kappa sees us, they start calling Tycho.',
      'Stay out of their sight if you can. Hold fire (Q) gets you past without a shot. If they see you, burn both towers to the ground before the call goes out. Take all three caches and leave through the old mine shaft in the east wall.'
    ],
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['c','a'],
      shafts:[ {x:79,y:35,wall:'e'}, {x:8,y:8,wall:'w'} ],
      swarmUnits:[ ['drone','c',3], ['crawler','c',2], ['drone','a',3], ['spitter','a',1] ] },
    stab:0,
    swarm:{ biomass:50, rate:0.3, guardMax:5, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:200, brute:9999 },
      hunt:{ every:40, afterEvery:20, budget:40, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[
      { id:'caches', text:'Take the three caches on Kappa Station (0/3)' },
      { id:'quiet',  text:'Leave without the Corps ever calling it in', optional:true }
    ],
    triggers:[
      { when:g=>g.time>0.2, do:g=>{
          /* the garrison on the station platform, and the north ridge tower */
          g.vars.relays=[ g.loyalB('relay',{x:52,y:40}), g.loyalB('relay',{x:48,y:4}) ].filter(Boolean);
          g.loyalB('sentry',{x:38,y:36}); g.loyalB('sentry',{x:51,y:36}); g.loyalB('sentry',{x:47,y:6});
          g.loyal('trooper','1',3,{hold:true}); g.loyal('gunner',{x:46,y:40},1,{hold:true}); g.loyal('medic',{x:44,y:38},1); g.loyal('engineer',{x:50,y:41},1);
          g.loyal('trooper',{x:46,y:8},2,{hold:true});
          g.loyal('trooper','3',3,{ patrol:['3',{x:58,y:30},'1',{x:30,y:30}] });
          g.vars.caches=DA_CACHES.map((c,i)=>{ g.cache(c,{ loot:60, stab:i===1?2:0 }); return G.ents[G.ents.length-1]; });
          g.marker('st','1','Kappa Station'); g.vars.calls=0; } },
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Haesaert','Kappa Station. Three caches, two towers, a dozen of ours. They are not ours any more. Quietly, people.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Cnudde','Those relay towers are the problem. If they see us, Kappa calls Tycho, and Tycho sends a bird. Knock both towers down and the line goes dead.') },
      { when:g=>g.time>16, do:g=>g.crewSay('Braet','Hold fire, Captain? (Q) We walk past them like ghosts.') },
      /* the caches */
      { repeat:true, when:g=>!!g.vars.caches&&!g.vars.cachesDone, do:g=>{ const n=g.vars.caches.filter(c=>c.dead).length; g.setText('caches',`Take the three caches on Kappa Station (${n}/3)`);
          if(n>=3){ g.vars.cachesDone=true; g.complete('caches'); g.unmark('st'); g.addObjective('escape','Everyone into the old mine shaft in the east wall'); g.marker('exit',{x:77,y:35},'East shaft');
            g.crewSay('Capt. Haesaert','That is all of it. East wall, the old shaft. Move.'); } } },
      /* seen: the towers start calling */
      { when:g=>!!g.spotted(), do:g=>{ const s=g.spotted(); g.vars.alarm=true; g.fail('quiet');
          g.say('Outpost Kappa','Contact! Corps armour at the perimeter, no IFF! Kappa to Tycho, Kappa to Tycho, we have intruders, stand by for...');
          g.crewSay('Cnudde','They are calling it in! Both towers, now, before the call gets through!');
          for(const r of g.vars.relays) if(!r.dead) g.ping({x:Math.floor(r.x/TILE),y:Math.floor(r.y/TILE)});
          g.setTimer(30,'Call to Tycho'); g.addObjective('towers','Destroy both Relay Towers before the call goes through (0/2)'); if(s) G.alert={x:s.x,y:s.y}; } },
      { repeat:true, when:g=>g.vars.alarm&&!g.vars.towersDone, do:g=>{ const n=g.vars.relays.filter(r=>r.dead).length; g.setText('towers',`Destroy both Relay Towers before the call goes through (${n}/2)`);
          g.vars.relays.forEach((r,i)=>{ if(r.dead) g.unmark('rl'+i); else g.marker('rl'+i,{x:Math.floor(r.x/TILE),y:Math.floor(r.y/TILE)},'Relay Tower'); });
          if(n>=2){ g.vars.towersDone=true; g.complete('towers'); g.clearTimer(); g.crewSay('Cnudde','Dead air. Nobody is calling anybody now.'); } } },
      { when:g=>g.vars.alarm&&!g.vars.towersDone&&g.timerLeft()===0, do:g=>{ g.vars.called=true; g.clearTimer();
          g.say('Cmdr. Varga','Kappa, Tycho. We read you. Kestrel is on the way with a fire team. Hold them there.'); g.vars.nextBird=g.time+20; } },
      /* while a tower still stands after the call, the dropship keeps coming */
      { repeat:true, when:g=>g.vars.called&&!g.vars.towersDone&&g.time>g.vars.nextBird, do:g=>{ g.vars.nextBird=g.time+80; g.vars.calls++;
          const sq=[...g.loyal('trooper',{x:46,y:37},2+(g.vars.calls>1?1:0)),...g.loyal('gunner',{x:46,y:37},1)]; g.hunt(sq);
          for(let i=0;i<14;i++) G.fx.push({k:'dust',x:(46+rand(-2,2))*TILE,y:(37+rand(-1,1))*TILE,vx:rand(-40,40),vy:rand(-20,10),t:1.6,max:1.6,r0:6,r1:20,col:'#8a857e'});
          SFX.play('land',46*TILE,37*TILE); g.say('Dropship Kestrel','Kestrel on the Kappa pad. Fire team is out, hunting.'); } },
      { repeat:true, when:g=>g.vars.cachesDone&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the old mine shaft in the east wall (${Math.min(g.crewNear({x:77,y:35},4),g.crewUp())}/${g.crewUp()})`) },
      { when:g=>g.vars.cachesDone&&g.crewUp()>0&&g.crewNear({x:77,y:35},4)>=g.crewUp(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit'); if(!g.vars.alarm) g.complete('quiet');
          g.win(g.vars.alarm?(g.vars.towersDone?'Kappa Station goes dark mid-sentence. By the time Tycho asks again, the Osprey crew is a kilometre down a mine shaft with three caches on their backs.':'The crew vanishes down the shaft with the caches, but Kappa got its call out. Tycho knows somebody is out here, wearing Corps armour.')
            :'Kappa Station never knew they were there. Three caches are missing, and the duty log says nothing at all.'); } },
      { when:g=>g.time>2&&g.crew().length===0, do:g=>g.lose('The crew falls at Kappa Station. The Corps buries them as raiders, faces unknown.') }
    ]
  }
);
