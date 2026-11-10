'use strict';
/* Hollow Colony: the Intel screen (campaign and main menu). Which units and structures are shown on each tab,
   plus a short field note per entry. The numbers themselves come straight from UNITS and BUILDINGS. */
const INTEL_TABS = [
  { id:'corps',  name:'Lunar Corps', units:['trooper','gunner','pyro','medic','engineer','scientist'] },
  { id:'struct', name:'Structures',  buildings:['hq','relay','sentry','barricade','lz','charge','generator'] },
  { id:'swarm',  name:'Swarm',       units:['crawler','drone','spitter','brute','seedling','bloater','grafter','husk','broodmother'], buildings:['hive','egg','cocoon','membrane'] },
  { id:'other',  name:'Other',       units:['grazer'] },
  { id:'rogue',  name:'Rogue Strain', rogue:true },   /* the Osprey crew, strains and taint (31-rogue.js); always shown, with a lock until the Rogue campaign is open */
  { id:'relics', name:'Relics',      relics:true }
];
const INTEL_NOTES = {
  trooper:  'The backbone of every squad. Range 5 outreaches every Swarm unit, the Spitter (4.6) just barely.',
  gunner:   'Huge damage per second and his fire pins the Swarm down (suppression slows them). Slow, so keep him behind the Troopers.',
  pyro:     'Short range, but the flame hits everything around his target. The answer to cocoons, hives and packed waves, and he burns the bodies of the fallen before the Swarm can claim them. Where his flame lands, the ground keeps burning for a few seconds: lay it across a path and the Swarm runs through fire.',
  medic:    'Patches up the downed first (4 seconds of work), then heals the worst wounded. Only uses his sidearm when nobody nearby needs him. Cannot heal the risen.',
  engineer: 'Builds, repairs and arms charges. Repairs nearby structures on his own, also in the defensive stance, and shoots back while he works.',
  scientist:'An escort: she follows your nearest soldier and must survive the mission.',
  hq:       'Trains every soldier type. Lose it and most missions are lost.',
  relay:    'Steady salvage income. Only on relay pads, and the Swarm likes to hit them.',
  sentry:   'Outranges every Swarm unit. An Engineer can fold it up (U) and set it up somewhere else.',
  barricade:'Cheap. Blocks a corridor so the Swarm has to chew through it first.',
  lz:       'Order replacements here. The dropship cannot be shot, but the soldiers it brings can.',
  charge:   'Mission object: armed by an Engineer, then it has to survive its fuse.',
  generator:'Mission object: an Engineer repairs it to full to bring it online. It goes down when badly damaged.',
  crawler:  'Fast and fragile, often in numbers. Cheap to lose, so the Swarm throws them first.',
  seedling: 'A swollen pod on thin legs that a hive grows to carry the Brood somewhere new. It cannot fight. Where it digs in, far from people and other nests, a young nest grows within seconds. Kill it before it roots.',
  bloater:  'Lunar fauna the Swarm killed, dragged home to a hive and remade. Slow and tough, and when it dies it bursts in a cloud of acid that burns your soldiers (and the Swarm). Kill it at range.',
  grafter:  'The parasite of the Swarm. It only hatches from a hive egg when a body (a soldier, or a grazer) lies in the creep of its hive. It runs to the body, latches on and infects it in a few seconds: then the body becomes a cocoon. It cannot fight. One shot kills it.',
  egg:      'A hive keeps no eggs waiting: it lays one right at its own foot the moment a body lies in its creep, and the Grafter inside goes for the body. Shoot the egg before it opens.',
  drone:    'Melee warrior. Dangerous in packs; a Gunner or a Pyro breaks them up. Drones guard the bodies of the fallen and drag them home to the creep around a hive.',
  spitter:  'Acid artillery at range 4.6: it outreaches Pyros and Medics. Its acid leaves a burning pool for a few seconds.',
  husk:     'A fallen soldier, remade. Dragged onto the creep, infected by a Grafter from a hive egg, the cocoon beats like a heart until it cracks, and a Twitcher crawls out (40% of these numbers). It molts straight into the Husk. The molt takes 1.6 seconds and it takes 50% more damage meanwhile: that is your moment. While it is turning it stays on the creep of its hive and defends it. The full Husk leaves the creep and hunts your squad, and screams over every kill: the soldiers close to it flinch.',
  brute:    'Armoured siege beast that goes for walls and structures. Focus fire and keep your distance.',
  broodmother:'Boss. Rooted most of the time, but charges into your lines, lays eggs and sprays acid. Regenerates when left alone.',
  hive:     'Notices soldiers who come close: its guards attack and it births a brood. Every hit makes it scream for more. Badly hurt, it calls the other hives. Regrows when left alone. The creep around it heals every Swarm unit standing on it, and it withers once the hive is dead. Bring a squad, not a hero.',
  cocoon:   'A fallen soldier being turned. A Husk hatches from it in a few seconds unless you burn it.',
  membrane: 'Organic wall that seals tunnels. Has to be burned or shot through.',
  grazer:   'Harmless lunar fauna. The Swarm kills it and drags the carcass home to a hive, where it becomes a Bloater.'
};
