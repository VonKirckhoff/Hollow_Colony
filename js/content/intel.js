'use strict';
/* Hollow Colony: the Intel screen (campaign and main menu). Which units and structures are shown on each tab,
   plus a short field note per entry. The numbers themselves come straight from UNITS and BUILDINGS. */
const INTEL_TABS = [
  { id:'corps',  name:'Lunar Corps', units:['trooper','gunner','pyro','medic','engineer','scientist'] },
  { id:'struct', name:'Structures',  buildings:['hq','relay','sentry','barricade','lz','charge','generator'] },
  { id:'swarm',  name:'Swarm',       units:['crawler','drone','spitter','brute','broodmother'], buildings:['hive','cocoon','membrane'] },
  { id:'other',  name:'Other',       units:['hunter','grazer'] }
];
const INTEL_NOTES = {
  trooper:  'The backbone of every squad. Range 5 outreaches every Swarm unit, the Spitter (4.6) just barely.',
  gunner:   'Huge damage per second and his fire pins the Swarm down (suppression slows them). Slow, so keep him behind the Troopers.',
  pyro:     'Short range, but the flame hits everything around his target. The answer to cocoons, hives and packed waves, and he burns the bodies of the fallen before the Swarm can claim them.',
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
  crawler:  'Fast and fragile, often in numbers. Hatches from cocoons, so burn those.',
  drone:    'Melee warrior. Dangerous in packs; a Gunner or a Pyro breaks them up.',
  spitter:  'Acid artillery at range 4.6: it outreaches Pyros and Medics. Its acid leaves a burning pool for a few seconds.',
  brute:    'Armoured siege beast that goes for walls and structures. Focus fire and keep your distance.',
  broodmother:'Boss. Rooted most of the time, but charges into your lines, lays eggs and sprays acid. Regenerates when left alone.',
  hive:     'Notices soldiers who come close: its guards attack and it births a brood. Every hit makes it scream for more. Badly hurt, it calls the other hives. Regrows when left alone. Bring a squad, not a hero.',
  cocoon:   'A fallen soldier being turned. Hatches in seconds unless you burn it.',
  membrane: 'Organic wall that seals tunnels. Has to be burned or shot through.',
  hunter:   'Cloaked. Visible only when it fires, is hit or comes close. Retreats when wounded and hunts your strongest soldier.',
  grazer:   'Harmless lunar fauna. The Swarm infects it if it gets the chance.'
};
