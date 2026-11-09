'use strict';
/* Rogue 2: Dead Air
   Kappa Station is a Corps supply post again. The crew needs what is in its caches. If a loyal soldier or gun sees them,
   the relay towers start calling Tycho: destroy both relays before the call goes out, or the job is lost.
   Towers that are already down (by the crew or by the Swarm) cannot call: let the Swarm thin out the garrison first.
   Then out through the old mine shaft in the east wall. */
const DA_CACHES=[ {x:40,y:33}, {x:47,y:38}, {x:50,y:33} ];
ROGUE_MISSIONS.push(
  {
    id:'rogue-dead-air', title:'Dead Air', map:'canyons', rogue:true,
    summary:'Rob a Corps supply post without letting its radio get a word out.',
    briefing:[
      'Three weeks in the tunnels. The stabilizer is gone, the food is nearly gone, and Devreese says the strain burns hotter in a body that is starving.',
      'Kappa Station is a supply post again: three caches on the station platform, a small garrison, two Sentry Guns, and two Relay Towers, one on the station and one on the northern ridge. Those towers are the danger. The moment anyone at Kappa sees us, they start calling Tycho.',
      'If Tycho hears about us, the whole Corps comes looking and this is over. Stay out of their sight. The Swarm hates Kappa as much as we do: let it wear the garrison down first, and a tower that is already rubble cannot call anyone. If they do see us, both towers go down within thirty seconds, or we are finished. Take all three caches and leave through the old mine shaft in the east wall.'
    ],
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['c','a'],
      shafts:[ {x:79,y:35,wall:'e',exit:true,label:'East shaft'}, {x:8,y:8,wall:'w'} ],
      swarmUnits:[ ['drone','c',3], ['crawler','c',2], ['drone','a',3], ['spitter','a',1] ] },
    stab:0,
    swarm:{ shaftHeirs:true, biomass:50, rate:0.3, guardMax:5, guardEvery:16, aggro:8, waves:null, unlock:{ spitter:200, brute:9999 },
      hunt:{ every:40, afterEvery:20, budget:40, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[
      { id:'caches', text:'Take the three caches on Kappa Station (0/3)' },
      { id:'quiet',  text:'Do not let Kappa call it in to Tycho' }
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
          g.marker('st','1','Kappa Station'); } },
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Haesaert','Kappa Station. Three caches, two towers, a dozen of ours. They are not ours any more. Quietly, people.') },
      { when:g=>g.time>9, do:g=>g.crewSay('Cnudde','Those relay towers are the problem. If they see us, Kappa calls Tycho, and then the whole Corps knows we are alive. Knock both towers down and the line goes dead.') },
      { when:g=>g.time>16, do:g=>g.crewSay('Braet','Hold fire, Captain? (Q) Let the Swarm do the shooting at Kappa. We just watch.') },
      /* the caches */
      { repeat:true, when:g=>!!g.vars.caches&&!g.vars.cachesDone, do:g=>{ const n=g.vars.caches.filter(c=>c.dead).length; g.setText('caches',`Take the three caches on Kappa Station (${n}/3)`);
          if(n>=3){ g.vars.cachesDone=true; g.complete('caches'); g.unmark('st'); g.addObjective('escape','Everyone into the old mine shaft in the east wall (right-click it)'); g.exitMark('exit'); g.openExit();
            g.crewSay('Capt. Haesaert','That is all of it. East wall, the old shaft. Move.'); } } },
      /* both towers down before anyone saw the crew (the crew or the Swarm did it): nobody left to call */
      { when:g=>!!g.vars.relays&&!g.vars.alarm&&g.vars.relays.every(r=>r.dead), do:g=>{ g.vars.towersDone=true;
          g.crewSay('Cnudde','Both relay towers are down. Kappa can shout all it likes now, nobody will hear it.'); } },
      /* seen while a tower still stands: the towers start calling */
      { when:g=>!!g.vars.relays&&g.vars.relays.some(r=>!r.dead)&&!!g.spotted(), do:g=>{ const s=g.spotted(); g.vars.alarm=true;
          g.say('Outpost Kappa','Contact! Corps armour at the perimeter, no IFF! Kappa to Tycho, Kappa to Tycho, we have intruders, stand by for...');
          g.crewSay('Cnudde','They are calling it in! Both towers, now, before the call gets through!');
          for(const r of g.vars.relays) if(!r.dead) g.ping({x:Math.floor(r.x/TILE),y:Math.floor(r.y/TILE)});
          g.setTimer(30,'Call to Tycho'); g.addObjective('towers','Destroy both Relay Towers before the call goes through (0/2)'); if(s) G.alert={x:s.x,y:s.y}; } },
      { repeat:true, when:g=>g.vars.alarm&&!g.vars.towersDone, do:g=>{ const n=g.vars.relays.filter(r=>r.dead).length; g.setText('towers',`Destroy both Relay Towers before the call goes through (${n}/2)`);
          g.vars.relays.forEach((r,i)=>{ if(r.dead) g.unmark('rl'+i); else g.marker('rl'+i,{x:Math.floor(r.x/TILE),y:Math.floor(r.y/TILE)},'Relay Tower'); });
          if(n>=2){ g.vars.towersDone=true; g.complete('towers'); g.clearTimer(); g.crewSay('Cnudde','Dead air. Nobody is calling anybody now.'); } } },
      /* the call gets through: the job is lost */
      { when:g=>g.vars.alarm&&!g.vars.towersDone&&g.timerLeft()===0, do:g=>{ g.vars.called=true; g.clearTimer(); g.fail('towers'); g.fail('quiet');
          g.say('Cmdr. Varga','Kappa, Tycho. We read you. Corps armour, no IFF... the Osprey crew. Every patrol on the moon is looking for them now.');
          g.lose('Kappa got its call out. Tycho knows the Osprey crew is alive, and the dead do not get a second chance to vanish.'); } },
      { repeat:true, when:g=>g.vars.cachesDone&&!g.vars.won, do:g=>g.setText('escape',`Everyone into the old mine shaft in the east wall, right-click it (${g.out()}/${g.out()+g.crewUp()})`) },
      { when:g=>g.vars.cachesDone&&g.allOut(), do:g=>{ g.vars.won=true; g.complete('escape'); g.unmark('exit'); g.complete('quiet');
          g.win(g.vars.alarm?'Kappa Station goes dark mid-sentence. By the time Tycho asks again, the Osprey crew is a kilometre down a mine shaft with three caches on their backs.'
            :'Kappa Station never got a word out. Three caches are missing, and the duty log says nothing at all.'); } },
      { when:g=>g.time>2&&g.crew().length===0&&!g.out(), do:g=>g.lose('The crew falls at Kappa Station. The Corps buries them as raiders, faces unknown.') }
    ]
  }
);
