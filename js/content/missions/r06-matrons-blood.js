'use strict';
/* Rogue 8: The Matron's Blood (until Nov 2026 Mother's Blood; the id stayed 'rogue-mothers-blood')
   The Maw Depths, days before the Corps comes down for the Matron. The crew gets there first.
   The lair membrane opens when its three egg chambers die, or for one of the crew whose blood is tainted enough (60+):
   it knows him and lets him through. Bleed the Matron until she tears free and flees into the deep (she lives: the Corps
   goes after her in Matron), leaving her Seed behind (a knot torn out of her roots; crate flag `heart` in code). Then decide what happens to it:
   one of the crew takes it into his blood (Ascension), or Mortier's flamer turns it to ash (Ashes). Dust is coming down. */
ROGUE_MISSIONS.push(
  {
    id:'rogue-mothers-blood', title:'The Matron\'s Blood', map:'depths', rogue:true,
    summary:'Reach the Matron before the Corps does, and decide what to do with her Seed.',
    briefing:[
      'Devreese has found it in Maas\'s notes: every strain we carry comes from one source. Under Tycho Maw, in a lair sealed with living membrane, the Matron lays the eggs of the whole Brood.',
      'The membrane dies when its three egg chambers die. But it is alive, and it knows its own: one of us with enough taint in the blood (60 or more) can stand against it and it will open for him. The Corps will come down here within days. We go now.',
      'Bleed her. Devreese says she keeps her strongest strain in a Seed, deep in her roots, and when she is hurt badly enough she tears it loose and runs. That Seed is ours, and there are two things we can do with it. Devreese can put it into one of us, and through him into all of us, and we stop being Corps for good. Or Mortier burns it, and every sample we ever took with it, and whatever we are now ends with us. The crew will follow your call.'
    ],
    stab:2,
    start:{ salvage:0, camera:'P', crewAt:'P',
      units:[], buildings:[], hives:['a','b','c'], hiveHp:4,
      swarmUnits:[ ['drone','a',3], ['crawler','a',2], ['drone','b',4], ['spitter','b',1], ['drone','c',4], ['spitter','c',1], ['brute','c',1] ] },
    tough:{ broodmother:{ hp:0.4 } },
    swarm:{ biomass:90, rate:0.42, guardMax:6, guardEvery:12, waves:{ first:200, every:110, budget:50, growth:16 }, unlock:{ spitter:120, brute:420 },
      hunt:{ every:40, afterEvery:20, budget:45, afterBudget:60, grow:0.15, growMax:8 } },
    objectives:[
      { id:'lair',   text:'Open the lair: burn the three egg chambers (0/3), or let a crew member with 60+ taint stand at the membrane' },
      { id:'mother', text:'Bleed the Matron until she tears free' }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{ g.wall('8',2.3,'lair'); g.vars.mother=g.spawn('broodmother','9',1,{order:'boss'})[0]; g.vars.mother.noDestroy=true; g.boss(g.vars.mother,'The Matron');   /* she does not die here: at the end of her health she tears free (below) */
          for(const k of ['a','b','c']) g.marker('ch'+k,k,'Egg chamber'); g.marker('mem','8','Lair membrane'); g.vars.mem=0; g.vars.mt=g.time; } },
      { when:g=>g.time>1, do:g=>g.crewSay('Capt. Kerckhoffs','The Maw Depths. Last job, people. Whatever happens down here, it is ours to decide.') },
      { when:g=>g.time>10, do:g=>g.crewSay('Devreese','The membrane at the lair: if one of us is far enough gone, sixty or more, stand him against it. It will open for its own.') },
      { when:g=>g.time>22, do:g=>g.crewSay('Mortier','And if not, I burn three egg chambers. Finally something I am allowed to burn.') },
      { repeat:true, when:g=>g.vars.mt!=null&&!g.vars.open, do:g=>{ let n=0; for(const k of ['a','b','c']){ if(!g.hiveAt(k)){ n++; g.unmark('ch'+k); } }
          const p=g.where('8'), dt=g.time-g.vars.mt; g.vars.mt=g.time;
          const kin=g.crew().find(u=>!u.downed&&u.vet.taint>=60&&Math.hypot(u.x-p.x,u.y-p.y)<3.4*TILE);
          if(kin){ g.vars.mem=Math.min(6,g.vars.mem+dt); if(Math.random()<0.4) G.fx.push({k:'spark',x:p.x+rand(-20,20),y:p.y+rand(-20,20),vx:rand(-10,10),vy:rand(-30,-10),t:0.6,max:0.6,col:'#c38bff'});
            if(!g.vars.kinSaid){ g.vars.kinSaid=true; g.crewSay('Devreese',`It is moving... it knows ${kin.vet.name}. Stay there, do not shoot it!`); } }
          else g.vars.mem=Math.max(0,g.vars.mem-dt*0.5);
          g.setText('lair',`Open the lair: burn the three egg chambers (${n}/3), or let a crew member with 60+ taint stand at the membrane${g.vars.mem>0?` (${Math.floor(g.vars.mem)}/6)`:''}`);
          if(n>=3||g.vars.mem>=6){ g.vars.open=true; g.complete('lair'); g.openWall('lair'); g.unmark('mem'); for(const k of ['a','b','c']) g.unmark('ch'+k); g.marker('queen','9','The Matron');
            g.crewSay(n>=3?'Capt. Kerckhoffs':'Devreese',n>=3?'The membrane is rotting away. She is in there. Everyone, on me.':'It opened for him. God help us, it opened for him. She is in there.'); } } },
      { when:g=>g.vars.mother&&g.vars.mother.awake, do:g=>{ g.unmark('queen'); g.crewSay('Braet','Look at the size of her.'); } },
      { when:g=>g.vars.mother&&g.vars.mother.bossState&&g.vars.mother.bossState.lairs>=1, do:g=>g.crewSay('Devreese','She is crawling back to heal! Go in after her!') },
      /* bled out: she tears her Seed loose and burrows into the deep. She lives; the Corps goes after her in The Matron (Corps 9), and finds only the Seed's husk */
      { when:g=>g.vars.mother&&!g.vars.mother.dead&&g.vars.mother.hp<=1.5, do:g=>{ const m=g.vars.mother; m.dead=true; m.hp=0; G.boss=null;
          dustPuff(m.x,m.y,40); SFX.play('huskroar',m.x,m.y); G.shake=Math.max(G.shake||0,0.6); addDecal(m.x,m.y,30,'rgba(60,20,70,.6)');
          G.fx.push({k:'text',x:m.x,y:m.y-70,t:2,max:2,txt:'SHE TEARS FREE',col:'#c38bff'}); g.crewSay('Braet','She is going into the ground! She tore something out of her roots... it is still pulsing.'); } },
      /* her Seed, and the choice */
      { when:g=>g.vars.mother&&g.vars.mother.dead, do:g=>{ const m=g.vars.mother; g.complete('mother'); G.boss=null;
          const h={ id:NEXT_ID++, kind:'crate', rogue:true, heart:true, x:m.x, y:m.y, r:12, faction:'none', t:1e9, seed:1 }; G.ents.push(h); g.vars.heart=h; g.vars.asc=0; g.vars.ash=0; g.vars.ht=g.time;
          g.marker('heart',{x:Math.floor(m.x/TILE),y:Math.floor(m.y/TILE)},'Her Seed');
          g.addObjective('ascend','Ascension: one of the crew takes the Seed into his blood (stand on it, 8 s)'); g.addObjective('ashes','Ashes: Mortier burns the Seed (Pyro next to it, 6 s)');
          g.crewSay('Devreese','She left her Seed behind, and it is still pulsing. Captain... your call. Stand someone on it and I put it in our blood. Or let Mortier burn it, and everything with it.');
          g.say('Cmdr. Varga','All Dust elements, seismic picked up a scream under the Maw. Something hurt the Matron, badly. Kestrel, take Dust down now.'); g.setTimer(150,'Dust in the Maw'); } },
      { repeat:true, when:g=>g.vars.heart&&!g.vars.chosen, do:g=>{ const h=g.vars.heart, dt=g.time-g.vars.ht; g.vars.ht=g.time;
          const near=(r,f)=>g.crew().some(u=>!u.downed&&f(u)&&Math.hypot(u.x-h.x,u.y-h.y)<r*TILE);
          if(near(1.6,u=>u.def.attack!=='flame')) g.vars.asc=Math.min(8,g.vars.asc+dt); else g.vars.asc=Math.max(0,g.vars.asc-dt);
          if(near(2.6,u=>u.def.attack==='flame')){ g.vars.ash=Math.min(6,g.vars.ash+dt); if(Math.random()<0.6) G.fx.push({k:'flame',x:h.x+rand(-8,8),y:h.y-4,vx:rand(-30,30),vy:rand(-60,-20),t:0.35,max:0.35}); } else g.vars.ash=Math.max(0,g.vars.ash-dt);
          g.setText('ascend',`Ascension: one of the crew takes the Seed into his blood (${Math.floor(g.vars.asc)}/8 s)`); g.setText('ashes',`Ashes: Mortier burns the Seed (${Math.floor(g.vars.ash)}/6 s)`);
          if(g.vars.asc>=8){ g.vars.chosen='ascend'; g.complete('ascend'); g.fail('ashes'); }
          else if(g.vars.ash>=6){ g.vars.chosen='ashes'; g.complete('ashes'); g.fail('ascend'); }
          if(g.vars.chosen){ g.unmark('heart'); h.dead=true; g.ending(g.vars.chosen); g.clearTimer();
            g.win(g.vars.chosen==='ascend'
              ?'The Seed\'s sap goes into Devreese\'s needle, and the needle goes into all of them. When Dust reaches the lair it finds a blood trail into the deep and seven sets of Corps armour, empty. Somewhere under Tycho Maw, seven heartbeats slow to the rhythm of something much older. The Osprey crew is not missing any more. It is becoming.'
              :'Mortier\'s flame turns the Seed to ash, and Devreese feeds every sample they ever took into the fire after it. Seven soldiers walk out of the Maw with nothing but the strain already in their blood. When Dust comes down, there is nothing left to find. Whatever the Osprey crew is now, it ends with them.'); } } },
      { when:g=>g.vars.heart&&!g.vars.chosen&&g.timerLeft()<=50&&!g.vars.dustLand, do:g=>{ g.vars.dustLand=true; const sq=[...g.loyal('trooper','P',4),...g.loyal('gunner','P',1),...g.loyal('pyro','P',1)]; g.hunt(sq);
          g.say('Sgt. Kessler','Dust is in the Maw. Whoever is down here: we are coming for that lair.'); g.crewSay('Capt. Kerckhoffs','Dust. Make the call, now!'); } },
      { when:g=>g.vars.heart&&!g.vars.chosen&&g.timerLeft()===0, do:g=>g.lose('Dust reaches the lair first. The Seed goes to Tycho in a sealed case, and the Osprey crew goes with it.') },
      { when:g=>g.time>2&&g.crew().length===0, do:g=>g.lose('The crew dies in the Maw Depths. The Matron keeps laying.') }
    ]
  }
);
