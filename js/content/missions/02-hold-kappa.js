'use strict';
/* Mission 2: Hold Kappa */
MISSIONS.push(
  {
    id:'hold-kappa', title:'Hold Kappa', map:'kappa',
    summary:'Set up a Command Post and survive until the convoy arrives.',
    briefing:[
      'A Command Post has been dropped at Kappa Station. A supply convoy is fifteen minutes out.',
      'Three hives surround the basin, and they know you are here. Build Relay Towers on the marked pads to fund your defence, and use Sentry Guns and Barricades to cover the approaches.',
      'If the Command Post falls, the operation is over.'
    ],
    start:{ salvage:250, camera:'Q',
      units:[ ['engineer','Q',2], ['trooper','Q',4], ['gunner','Q',1], ['medic','Q',1] ],
      buildings:[ ['hq','Q'] ], hives:['a','b','c'] },
    limits:{ sentry:4 },
    swarm:{ biomass:60, rate:0.45, guardMax:4, guardEvery:14, waves:{ first:100, every:70, budget:70, growth:28 } },
    objectives:[
      { id:'relays', text:'Build 2 Relay Towers (0/2)' },
      { id:'hold',   text:'Hold the station until the convoy arrives' },
      { id:'hq',     text:'The Command Post must survive' }
    ],
    triggers:[
      { when:g=>g.time>0.5, do:g=>{ g.setTimer(900,'Convoy'); g.say('Cmdr. Varga','Command Post is live. The supply convoy is fifteen minutes out. Hold until then.'); } },
      { when:g=>g.time>8,  do:g=>g.say('Sgt. Kessler','Select an Engineer and press R to raise a Relay Tower on a pad. More towers, more salvage, more supply.') },
      { repeat:true, when:()=>true, do:g=>{
          const n=Math.min(2,g.has('relay')); g.setText('relays',`Build 2 Relay Towers (${n}/2)`); if(n>=2) g.complete('relays'); } },
      { when:g=>g.time>80,  do:g=>g.say('Cmdr. Varga','First wave inbound. Sentry Guns on the approaches would be wise.') },
      { when:g=>g.time>290, do:g=>g.say('Cmdr. Varga','Long-range scans show something big moving with the swarm.') },
      { when:g=>g.time>450, do:g=>g.say('Cmdr. Varga','Halfway. The hives are swelling. Expand to more relay pads if you can hold them.') },
      { when:g=>g.time>780, do:g=>{ g.say('Cmdr. Varga','Two minutes! Everything they have left is coming.'); g.wave(220); } },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen.'); } },
      { when:g=>g.timerLeft()===0, do:g=>{ g.complete('hold'); g.complete('hq'); g.win('The convoy rolls in under your guns. Kappa Station holds.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.complete('hold'); g.win('All three hives destroyed. The basin is clear before the convoy even arrives.'); } }
    ]
  }
);
