'use strict';
/* Hollow Colony — relics: things hidden on the campaign maps, to find and keep (they are remembered in this browser, hc-relics).
   kind 'item': walk a soldier over it to pick it up.
   kind 'egg':  an ancient egg. Stand a soldier next to it with no Swarm close by for EGG_RELIC.secure seconds to take it.
                The Swarm wants it too: some time into the mission a hive sends a few Drones for it, and if they hold it
                for EGG_RELIC.hatch seconds with no soldier close by, it wakes and grows into a new hive.
   at: a tile on the map of that mission. Found relics show in Intel (tab Relics) and on the trophy wall. */
const RELICS = [
  { id:'blackbox', mission:'dust-landing', kind:'item', at:{x:78,y:8}, name:'Flight Recorder',
    text:'The black box of the supply lander Ibis-2. The last thing on the tape is the pilot: "There is movement in the dust. Lots of it. Coming to the ship." Then nothing.' },
  { id:'mug', mission:'hold-kappa', kind:'item', at:{x:53,y:37}, name:'Station Chief\'s Mug',
    text:'"World\'s Okayest Station Chief." Still half full of coffee, frozen solid. Whoever left it here meant to come back for it.' },
  { id:'drone', mission:'burn-the-brood', kind:'item', at:{x:69,y:2}, name:'Survey Drone Core',
    text:'An orbital survey drone, crashed. Its last image shows five hives where the maps show none, and a sixth shape far below them, much larger.' },
  { id:'charter', mission:'hollow-colony', kind:'item', at:{x:59,y:2}, name:'Colony Charter',
    text:'The founding charter of Hollow Colony, signed by 212 settlers. On the back someone kept a tally: 212 lines, every one crossed out but one.' },
  { id:'rabbit', mission:'blackout', kind:'item', at:{x:2,y:2}, name:'Plush Rabbit',
    text:'A child\'s toy rabbit with a name tag: "Mira, Block C". Block C was the first to be evacuated. That is something.' },
  { id:'cassette', mission:'dead-signal', kind:'item', at:{x:81,y:10}, name:'Convoy Cassette',
    text:'A tape from a convoy cab, labelled HOLLOW LIGHT. Black metal recorded off an Earth station, and on the last track a driver humming along, out of tune.' },
  { id:'fossil', mission:'brood-mother', kind:'item', at:{x:84,y:6}, name:'Fossil Shard',
    text:'Rock with something pressed into it: a claw, very much like a Drone\'s. Dr. Maas dates the rock at four billion years. The Swarm did not come here. It was always here.' },
  { id:'flag', mission:'high-ground', kind:'item', at:{x:2,y:24}, name:'Expedition Flag',
    text:'The flag of the first crewed landing in this region, torn and bleached by sunlight. Planted on the high ground: the place everyone has always wanted to hold.' },
  { id:'egg-maw', mission:'burn-the-brood', kind:'egg', at:{x:5,y:14}, name:'Ancient Egg of Tycho Maw',
    text:'Petrified, but not dead: under the stone shell something beats, once a minute. Older than any hive on the map.' },
  { id:'egg-mare', mission:'blackout', kind:'egg', at:{x:73,y:8}, name:'Ancient Egg of Mare Colony',
    text:'Found under the floor of a mine office. The miners had built a cupboard around it. Nobody knows who put it there first.' },
  { id:'egg-convoy', mission:'dead-signal', kind:'egg', at:{x:81,y:28}, name:'Ancient Egg of the Convoy Road',
    text:'Warm to the touch on a moon where nothing is warm. The convoy drivers called it "the stove" and parked next to it.' },
  { id:'egg-depths', mission:'brood-mother', kind:'egg', at:{x:89,y:35}, name:'Ancient Egg of the Depths',
    text:'The oldest of them all. The Brood Mother\'s chamber lies between it and the surface, as if she was guarding it.' }
];
