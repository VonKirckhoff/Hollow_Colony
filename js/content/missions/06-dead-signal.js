'use strict';
/* Mission 6: Dead Signal
   Sabotage with a small squad and no base: arm three seismic charges next to three nests and keep each charge alive
   until it blows. Each blast buries its nest. Then everyone to the launch pad in the east for pickup. */
const DS_SITES = [ { tag:'s1', at:{x:32,y:3},  nest:'b', name:'North nest' },
                   { tag:'s2', at:{x:47,y:12}, nest:'c', name:'Central nest' },
                   { tag:'s3', at:{x:62,y:29}, nest:'d', name:'South-east nest' } ];
MISSIONS.push(
  {
    id:'dead-signal', title:'Dead Signal', map:'convoy',
    summary:'Arm three seismic charges deep in Swarm ground, keep them alive, and get out.',
    briefing:[
      'The Mare Colony array found it: the brood is fed through tunnels under Ridgeback Canyon. Three nests sit on top of the main shafts.',
      'Arm a seismic charge beside each nest. An Engineer has to stand still on the marked site for twenty seconds, and then the charge needs seventy-five more before it blows. The Swarm will feel it and come for it.',
      'Each blast collapses a nest, and its echo maps the caves below. After the third, run for the launch pad in the east. There is no base on this one and you only have two Engineers, but the landing pad where you start can bring in replacements.'
    ],
    landingZone:{ tx:8, ty:18, max:11, delay:25 },   // landing pad at the start: order replacements, up to the 11 you start with
    limits:{ sentry:2 },
    start:{ salvage:150, camera:'P',
      units:[ ['engineer','P',1,{carry:'sentry'}], ['engineer','P',1], ['trooper','P',5], ['gunner','P',2], ['pyro','P',1], ['medic','P',1] ],
      buildings:[], hives:['a','b','c','d','e'], hiveHp:2.5,
      swarmUnits:[ ['drone','b',6], ['spitter','b',2], ['drone','c',5], ['crawler','c',4], ['spitter','c',1], ['drone','d',5], ['spitter','d',2], ['brute','d',1] ] },
    swarm:{ biomass:40, rate:0.38, guardMax:5, guardEvery:15, waves:{ first:150, every:80, budget:65, growth:22 }, unlock:{ spitter:120, brute:480 } },
    objectives:[
      { id:'charges', text:'Arm and protect three seismic charges (0/3)' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ g.pad({x:78,y:30},'pickup'); for(const s of DS_SITES){ g.chargeSite(s.at,s.tag); g.marker(s.tag,s.at,s.name); } g.vars.blown=0; } },
      { when:g=>g.time>1, do:g=>g.say('Cmdr. Varga','Dust, three charges, three nests. Pick your order, but keep both Engineers alive. Without them nothing gets armed.') },
      { when:g=>g.time>9, do:g=>g.say('Sgt. Kessler','Clear the guards first. Then park an Engineer on the red site and do not let him move.') },

      // each charge: the Swarm comes for it once armed; when it blows, the nest is buried
      ...DS_SITES.map(s=>({ when:g=>g.charge(s.tag)==='armed', do:g=>{
          g.say('Cmdr. Varga',`${s.name} charge is live. They can feel it. Hold until it blows!`); g.ping(s.at);
          g.wave(70+g.vars.blown*20, s.at); g.vars['w'+s.tag]=g.time+22; } })),
      ...DS_SITES.map(s=>({ repeat:true, when:g=>g.vars['w'+s.tag] && g.time>g.vars['w'+s.tag] && g.charge(s.tag)==='armed', do:g=>{   // more every 22 s while it ticks
          g.vars['w'+s.tag]=g.time+22; g.wave(50+g.vars.blown*15, s.at); } })),
      ...DS_SITES.map(s=>({ when:g=>g.charge(s.tag)==='blown', do:g=>{
          g.bury(s.nest,1.6,'cave-'+s.tag); g.unmark(s.tag); g.vars.blown++;
          g.setText('charges',`Arm and protect three seismic charges (${g.vars.blown}/3)`);
          if(g.vars.blown<3){ const next=DS_SITES.find(o=>g.charge(o.tag)!=='blown');
            g.say('Dr. Maas',`Echo recorded. The ${s.name.toLowerCase()} is buried. Kestrel is bringing two rifles to you.`);
            g.airdrop([['trooper',2]],25,next.at); }
          else g.vars.done=true; } })),

      // an Engineer is always needed: replace them when both are lost
      { repeat:true, when:g=>!g.vars.done && g.has('engineer')===0 && !(g.vars.engDrop>g.time), do:g=>{
          const next=DS_SITES.find(o=>g.charge(o.tag)!=='blown'); g.vars.engDrop=g.time+60;
          g.say('Cmdr. Varga','No Engineers left. Kestrel is dropping one at your landing pad. He will make his way to you.');
          g.airdrop([['engineer',1]],20,next?next.at:'P'); } },

      // the run to the pad
      { when:g=>g.vars.done, do:g=>{
          g.complete('charges');
          g.say('Dr. Maas','Three echoes. I have the whole cave system. Get out, the canyon floor is coming apart!');
          g.addObjective('extract','Everyone to the launch pad in the east'); g.marker('ex',{x:78,y:30},'Pickup'); g.vars.extract=true;
          g.setTimer(90,'Pickup'); g.landShip('pickup',90); g.say('Dropship Kestrel','Ninety seconds out. Be on that pad when I land.');
          g.wave(70,{x:78,y:30}); g.vars.chase=g.time+35; } },
      { repeat:true, when:g=>g.vars.extract && g.time>g.vars.chase && !g.vars.won, do:g=>{ g.vars.chase=g.time+35; g.wave(45,{x:78,y:30}); } },
      { repeat:true, when:g=>g.vars.extract && !g.vars.won, do:g=>g.setText('extract',`Everyone to the launch pad in the east (${Math.min(g.near('corps',{x:78,y:30},5),g.troops())}/${g.troops()})`) },
      { when:g=>g.vars.extract && g.timerLeft()===0 && !g.vars.landed, do:g=>{ g.vars.landed=true; g.say('Dropship Kestrel','Wheels down. Everybody aboard, now!'); } },
      { when:g=>g.vars.landed && g.troops()>0 && g.near('corps',{x:78,y:30},5)>=g.troops(), do:g=>{ g.vars.won=true; g.complete('extract'); g.unmark('ex');
          g.win('Squad Dust lifts off as Ridgeback Canyon caves in behind them. Dr. Maas has the map: under Tycho Maw, something is still laying eggs.'); } },
      { when:g=>g.time>2 && g.troops()===0, do:g=>g.lose('Squad Dust is gone. The charges stay silent.') }
    ]
  }
);
