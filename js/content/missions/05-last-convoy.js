'use strict';
/* Mission 5: Last Convoy */
MISSIONS.push(
  {
    id:'last-convoy', title:'Last Convoy', map:'convoy',
    summary:'Escort three slow Mobile Habitats from a besieged mine to the launch pad.',
    briefing:[
      'Dr. Maas\'s data core confirmed it: the Swarm hunts living bodies. Every colonist left on the surface is food.',
      'Ridgeback Mine still shelters forty miners. Three Mobile Habitats, huge tracked modules that crawl at walking pace, will carry them along the canyon road to the launch pad in the east. The road runs past five hives.',
      'You have ninety seconds to prepare. The habitats stop whenever the Swarm is close, so keep the road clear. Only three Sentry Guns may be in the field: pack them up behind the convoy and set them up ahead of it. At least two habitats must reach the launch pad.'
    ],
    limits:{ sentry:3 },
    start:{ salvage:400, camera:'P',
      units:[ ['engineer','P',2], ['trooper','P',5], ['gunner','P',1], ['pyro','P',1], ['medic','P',1] ],
      buildings:[ ['hq','P'] ], hives:['a','b','c','d','e'] },
    swarm:{ biomass:40, rate:0.3, guardMax:2, guardEvery:22, waves:null },
    objectives:[
      { id:'convoy', text:'Escort the habitats to the launch pad' },
      { id:'two',    text:'At least 2 habitats must survive (3/3)' }
    ],
    triggers:[
      { when:g=>g.time>0.3, do:g=>{
          g.vars.haulers=g.spawn('habitat','Q',3);
          g.convoy(g.vars.haulers,['1','2','3','4','5','6','7','8','9']);
          g.setTimer(90,'Convoy departs'); g.marker('pad','9','Launch pad');
          g.say('Cmdr. Varga','Ridgeback, this is Varga. The habitats roll out in ninety seconds. The orange line is their route. Use the time: towers, sentries, scouts.'); } },
      { when:g=>g.time>9, do:g=>g.say('Sgt. Kessler','Three sentries max on this run. Pack the one behind the convoy (U) and set it up ahead (D).') },
      { when:g=>g.time>0.5 && g.timerLeft()===0, do:g=>{ g.convoyGo(); g.clearTimer(); g.vars.nextWave=g.time+30;
          g.say('Convoy lead','Habitats moving. We crawl, but we do not stop for anything but the Swarm.'); } },
      { repeat:true, when:g=>g.vars.nextWave && g.time>g.vars.nextWave && g.convoyLead(), do:g=>{
          g.vars.waveN=(g.vars.waveN||0)+1; g.wave(40+g.vars.waveN*12, g.convoyLead()); g.vars.nextWave=g.time+55; } },
      { when:g=>g.convoyHalted(), do:g=>g.say('Convoy lead','Contacts on the road! We are holding until you clear them.') },
      { when:g=>g.vars.haulers && g.vars.haulers.some(h=>!h.dead&&h.wp>=5), do:g=>{
          g.say('Cmdr. Varga','Halfway. The hives in the south are emptying out. Big wave heading for the convoy!'); g.wave(150, g.convoyLead()); } },
      { repeat:true, when:g=>!!g.vars.haulers, do:g=>{ const al=g.alive(g.vars.haulers), ar=g.convoyArrived();
          g.setText('convoy',`Escort the habitats to the launch pad (${ar}/${al} arrived)`); g.setText('two',`At least 2 habitats must survive (${al}/3)`); } },
      { when:g=>g.vars.haulers && g.alive(g.vars.haulers)<2, do:g=>{ g.fail('two'); g.lose('Too many habitats lost. Ridgeback\'s miners will not make it off the moon.'); } },
      { when:g=>g.vars.haulers && g.convoyArrived()>=2 && g.convoyArrived()===g.alive(g.vars.haulers), do:g=>{
          g.complete('convoy'); g.complete('two'); g.unmark('pad');
          g.win(`${g.convoyArrived()===3?'All three habitats':'Two habitats'} reached the launch pad. The miners of Ridgeback are going home.`); } }
    ]
  }
);
