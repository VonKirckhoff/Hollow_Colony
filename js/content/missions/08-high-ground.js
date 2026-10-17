'use strict';
/* Mission 8: High Ground */
MISSIONS.push(
  {
    id:'high-ground', title:'High Ground', map:'high',
    summary:'Take three uplink beacons on the Selene plateaus and hold them while the data goes out.',
    briefing:[
      'The Brood Mother is dead, but her brood still covers the Selene Highlands. Dr. Maas needs to send her research to Earth, and only the old uplink beacons on the three plateaus can reach that far.',
      'Each plateau can only be climbed by its ramps, which makes them easy to defend once you are up there and slow to reach for both sides.',
      'Capture all three beacons, then keep all three in your hands until the upload is complete. The Swarm will try to take them back. Train troops at the Command Post or order them in at the Landing Zone next to it; you can field at most twenty-four.'
    ],
    limits:{ sentry:8 },
    landingZone:{ tx:47, ty:54, max:24, delay:25 },
    start:{ salvage:400, camera:'P',
      units:[ ['engineer','P',2], ['trooper','P',6], ['gunner','P',2], ['pyro','P',1], ['medic','P',2] ],
      buildings:[ ['hq','P'], ['sentry',{x:40,y:53}], ['sentry',{x:49,y:58}] ], hives:['a','b','c','d'], hiveHp:2,
      uplinks:[ ['1','West ridge'], ['2','East ridge'], ['3','Centre mesa'] ],
      swarmUnits:[ ['drone','1',5], ['crawler','1',3], ['spitter','1',1], ['drone','2',5], ['spitter','2',2], ['crawler','2',2], ['drone','3',6], ['spitter','3',2], ['brute','3',1] ] },
    swarm:{ biomass:70, rate:0.45, guardMax:5, guardEvery:13, burrows:true, waves:{ first:300, every:120, budget:55, growth:10 } },
    objectives:[
      { id:'take',   text:'Capture the three uplink beacons (0/3)' },
      { id:'hq',     text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.vars.phase2 && g.vars.next && g.time>g.vars.next-29.5 && !g.vars.firstWave, do:g=>{ g.vars.firstWave=true; } },
      { when:g=>g.time>0.3, do:g=>{ g.marker('u1','1','Uplink'); g.marker('u2','2','Uplink'); g.marker('u3','3','Uplink'); } },
      { when:g=>g.time>1,  do:g=>g.say('Cmdr. Varga','Three plateaus, three beacons. Find the ramps up.') },
      { when:g=>g.time>12, do:g=>g.say('Sgt. Kessler','Stand next to a beacon with no Swarm nearby to capture it. Twenty seconds, uncontested.') },
      { when:g=>g.time>20, do:g=>{ g.say('Dropship Kestrel','Kestrel on station. The Landing Zone next to the Command Post takes reinforcement orders. Twenty-four boots max.'); g.ping({x:48,y:55}); } },
      { when:g=>g.time>30, do:g=>g.say('Dr. Maas','Every plateau has only two ramps. A Sentry Gun at the top of each ramp will hold a lot.') },
      { repeat:true, when:g=>!g.vars.phase2, do:g=>{ const n=g.uplinks(); g.setText('take',`Capture the three uplink beacons (${n}/3)`);
          for(const k of ['1','2','3']) if(g.uplinkOwned(k)) g.unmark('u'+k); } },
      { repeat:true, when:g=>!g.vars.phase2, do:g=>{ for(const k of ['1','2','3']){ if(g.uplinkOwned(k) && !g.vars['got'+k]){ g.vars['got'+k]=true;
          g.say('Cmdr. Varga','Beacon secured. Expect a counter-attack on it.'); g.wave(70,k); } } } },
      { when:g=>g.uplinks()===3, do:g=>{ g.complete('take'); g.vars.phase2=true; g.vars.upload=0; g.vars.next=g.time+25;
          g.say('Dr. Maas','All three beacons are live. Uploading now. Every beacon must stay ours, or the upload stalls.');
          g.addObjective('upload','Hold all three beacons until the upload is complete (0%)'); } },
      { repeat:true, when:g=>g.vars.phase2 && !g.vars.done, do:g=>{
          const all=g.uplinks()===3; if(all) g.vars.upload+=0.25;
          const pct=Math.min(100,Math.floor(g.vars.upload/360*100));
          g.setText('upload',`Hold all three beacons until the upload is complete (${pct}%${all?'':', STALLED'})`);
          if(!all && !g.vars.stallMsg){ g.vars.stallMsg=true; g.say('Dr. Maas','The upload has stalled! Retake the beacon!'); }
          if(all) g.vars.stallMsg=false;
          for(const k of ['1','2','3']){ if(!g.uplinkOwned(k)) g.marker('u'+k,k,'Retake'); else g.unmark('u'+k); }
          if(pct>=100) g.vars.done=true; } },
      // Upload phase: a wave every 35 s at one beacon; every third wave hits two beacons at once.
      // Without hives the Swarm burrows up out of the ground. No new wave while too many Swarm are already on
      // the field (UPLOAD_CAP, scaled by difficulty), so it never piles up beyond what a squad can handle.
      { repeat:true, when:g=>g.vars.phase2 && !g.vars.done && g.time>g.vars.next, do:g=>{
          const cap=Math.round(14*g.diffBudget()); if(g.swarmCount()>cap){ g.vars.next=g.time+8; return; }
          g.vars.next=g.time+35*g.diffInterval(); g.vars.w=(g.vars.w||0)+1; const k=['1','2','3'][g.vars.w%3]; g.wave(75+g.vars.w*8,k);
          if(g.vars.w%3===0) g.wave(60+g.vars.w*6,['1','2','3'][(g.vars.w+1)%3]); } },
      { when:g=>g.vars.upload>=180, do:g=>g.say('Dr. Maas','Fifty percent. They know what we are doing. Brace!') },
      { when:g=>g.vars.upload>=315, do:g=>{ g.say('Cmdr. Varga','Almost there. One last push is coming at the centre mesa!'); g.wave(110,'3'); } },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen.'); } },
      { when:g=>g.vars.done, do:g=>{ g.complete('upload'); g.complete('hq');
          g.win('The upload is complete. Earth now knows what lives beneath the moon. For the first time, the Lunar Corps holds the high ground.'); } }
    ]
  }
);
