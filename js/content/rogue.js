'use strict';
/* Hollow Colony — the third campaign: Rogue Strain.
   The crew of the Osprey, the first rescue ship that crashed outside Dr. Maas's lab, is listed as killed in action.
   They are not dead. They found her samples, they saw what Swarm DNA can do to a body, and they stopped answering the radio.
   You play the crew: seven named soldiers, no base, no dropship, hunted by the Swarm and by the Lunar Corps they left behind.
   Unlocked once the Lunar Corps has won mission 4, The Hollow Colony. The engine lives in js/engine/31-rogue.js. */
const ROGUE_MISSIONS = [];   /* filled by js/content/missions/r01-… to r06-…, in the order of their <script> lines */

/* The Osprey crew. Fixed people: they carry their rank, experience, strains and taint from mission to mission
   (kept in hc-rogue, not on the Lunar Corps roster). Haesaert is the Captain: he leads the squad (AURA). */
const ROGUE_CREW = [
  { id:'osp-haesaert',    name:'Haesaert',      type:'trooper',  rank:5, xp:62, capt:true, bio:'Captain of the Osprey. Twenty years in the Corps, and the one who decided they would stay dead.' },
  { id:'osp-dehandschutter', name:'Dehandschutter', type:'gunner', rank:2, xp:11, bio:'Door gunner. Talks to his rotary gun. Pulled two of the others out of the burning wreck.' },
  { id:'osp-mortier',     name:'Mortier',       type:'pyro',     rank:1, xp:5,  bio:'Loves his flamer more than he trusts the plan. Fire leaves nothing to harvest, and he knows it.' },
  { id:'osp-devreese',    name:'Devreese',      type:'medic',    rank:1, xp:6,  sex:'f', bio:'Flight medic. She read Maas\'s notes first, and she is the one holding the needle.' },
  { id:'osp-cnudde',      name:'Cnudde',        type:'engineer', rank:0, xp:3,  bio:'Crew chief. Can crack any freezer, lock or sentry the Corps ever built.' },
  { id:'osp-vanwesemael', name:'Van Wesemael',  type:'trooper',  rank:0, xp:1,  bio:'Youngest of the crew. First to volunteer for the needle.' },
  { id:'osp-braet',       name:'Braet',         type:'trooper',  rank:0, xp:2,  bio:'Quiet. Keeps a tally of every Corps soldier they have had to shoot.' }
];

/* STRAINS: what a splice of Swarm DNA does to a soldier. A soldier carries every strain at most once.
   cost = samples of that strain, taint = how much taint the splice adds (see ROGUE.taint).
   Effects are applied in rogueStrainApply (31-rogue.js), on top of the rank bonuses. */
const STRAINS = {
  crawler: { name:'Night Eyes',     from:'Crawler', cost:3, taint:10, glyph:'◉', text:'+2 sight and he barely loses any of it in the dark. +5% speed.' },
  drone:   { name:'Swift',          from:'Drone',   cost:3, taint:10, glyph:'»', text:'+15% speed.' },
  spitter: { name:'Acid Blood',     from:'Spitter', cost:3, taint:14, glyph:'☣', text:'+15% damage. His rounds leave acid in the wound.' },
  brute:   { name:'Chitin',         from:'Brute',   cost:2, taint:16, glyph:'⬢', text:'+20% armour, +15% health.' },
  husk:    { name:'Knitting Flesh', from:'Husk',    cost:2, taint:18, glyph:'✚', text:'Heals 2.5 health per second once nothing has hit him for 4 seconds.' },
  hive:    { name:'Hive Scent',     from:'Hive',    cost:3, taint:22, glyph:'✿', text:'The Swarm smells one of its own: the hunt passes him by, hives do not notice him and the brood picks him last.' }
};
const STRAIN_ORDER = ['crawler','drone','spitter','brute','husk','hive'];

/* ROGUE: the tunables (all in the dev panel).
   taint:   creep = taint per second while he stands on the creep · rest = taint that fades after a won mission
            fallen = taint a fallen crew member comes back with ("the strain stitched him together") · fever = damage bonus per taint point
            scent = from this much taint the hunt ignores him · mend = from this much the creep heals him (mendRate HP/s)
            seizure = from this much he has seizures (every seizureEvery … seizureEvery2 seconds, seizureTime seconds)
            feral = at this much he snaps: feralTime seconds out of control, then he collapses (collapse s) and drops to after.
   stab:    start = stabilizer doses at the start of every mission · amount = taint one dose takes away · reach = tiles
   dna:     chance per kill that a sample drops (not when it burnt) · hive = samples from a hive killed without fire · life = seconds a sample lies there
   loyal:   the Lunar Corps that hunts the crew: help = tiles within which they come to help each other · hp / dmg per difficulty · xp per kill */
const ROGUE = {
  taint:{ creep:1.2, rest:8, fallen:20, fever:0.002, scent:30, mend:60, mendRate:4, seizure:85, seizureEvery:25, seizureEvery2:45, seizureTime:1.6, feral:100, feralTime:10, collapse:3, after:70 },
  stab:{ start:1, amount:35, reach:4 },
  dna:{ crawler:0.35, drone:0.3, spitter:0.5, brute:1, husk:1, hive:3, life:90 },
  loyal:{ help:12, hp:{ easy:0.85, normal:1, hard:1.2 }, dmg:{ easy:0.85, normal:1, hard:1.15 }, xp:2 }
};
/* Corps voices heard over the radio in a Rogue mission: shown as an intercept */
const ROGUE_INTERCEPT = ['Cmdr. Varga','Sgt. Kessler','Dropship Kestrel','Dr. Maas','Lt. Okafor','Corps patrol','Outpost Kappa','Corps radio'];
/* the trophies of the Rogue campaign (a row on the Trophy wall) */
const ROGUE_TROPHIES = [
  { id:'rogue:done',   name:'Ghost Crew',   what:'Win every Rogue Strain mission' },
  { id:'rogue:ascend', name:'Ascension',    what:'End the Rogue campaign by taking the Mother strain' },
  { id:'rogue:ashes',  name:'Ashes',        what:'End the Rogue campaign by burning the heart' },
  { id:'rogue:full',   name:'Full Strain',  what:'One crew member carries all six strains' },
  { id:'rogue:cold',   name:'Cold Blood',   what:'Win every Rogue mission without a crew member ever going feral' }
];
