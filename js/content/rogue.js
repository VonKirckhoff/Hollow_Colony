'use strict';
/* Hollow Colony — the third campaign: Rogue Strain.
   The crew of the Osprey, the first rescue ship that crashed outside Dr. Maas's lab, is listed as killed in action.
   They are not dead. They found her samples, they saw what Swarm DNA can do to a body, and they stopped answering the radio.
   You play the crew: seven named soldiers, no base, no dropship, hunted by the Swarm and by the Lunar Corps they left behind.
   Unlocked once every Lunar Corps campaign mission is won on Normal or Hard. The engine lives in js/engine/31-rogue.js. */
const ROGUE_MISSIONS = [];   /* filled by js/content/missions/r01-… to r06-… (with r01b and r05b in between), in the order of their <script> lines */

/* The Osprey crew. Fixed people: they carry their rank, experience, strains and taint from mission to mission
   (kept in hc-rogue, not on the Lunar Corps roster). Kerckhoffs is the Captain: he leads the squad (AURA). */
const ROGUE_CREW = [
  { id:'osp-kerckhoffs',    name:'Kerckhoffs',      type:'trooper',  rank:5, xp:62, capt:true, bio:'Captain of the Osprey. Twenty years in the Corps, and the one who decided they would stay dead. His grandmother swore the family rode with the Bokkerijders, the goat riders of old Limburg.',
    intel:'Captain of the Osprey. Twenty years in the Corps, the last six flying the rescue runs nobody else would take. When Command wrote the Osprey off as lost with all hands, he was the one who said: then let them think so.<br><br>His grandmother swore the family came from the Bokkerijders, the night riders of old Limburg: smugglers and thieves who, the story went, made a pact with the Devil and rode their goats through the air. Their leader, so the court in Herzogenrath said, was the town surgeon, Heinrich Joseph Kerckhoffs, who died in 1772. He used to laugh at that story. Now he leads a crew of ghosts who answer to no one, and he laughs a little less.' },
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
            warn = from this much he is about to go feral: red taint bar, a ring and "!" over him, a ping, and a warning from the Medic (once a mission)
            seizure = from this much he has seizures (every seizureEvery … seizureEvery2 seconds, seizureTime seconds)
            feral = at this much he snaps: feralTime seconds out of control, then he collapses (collapse s) and drops to after.
   stab:    start = stabilizer doses at the start of every mission · amount = taint one dose takes away · reach = tiles
            formula = extra doses at the start of every mission once the crew has Dr. Maas's formula (Needle and Thread)
   veil:    (missions with veil:true, Among Them) taint = from this much taint the Swarm does not see him (Hive Scent: always)
            broken = seconds the Swarm sees him after he fires a shot
   dna:     chance per kill that a sample drops (not when it burnt) · hive = samples from a hive killed without fire · life = seconds a sample lies there
   loyal:   the Lunar Corps that hunts the crew: help = tiles within which they come to help each other · hp / dmg per difficulty · xp per kill */
const ROGUE = {
  taint:{ creep:1.2, rest:8, fallen:20, fever:0.002, scent:30, mend:60, mendRate:4, seizure:85, warn:92, seizureEvery:25, seizureEvery2:45, seizureTime:1.6, feral:100, feralTime:10, collapse:3, after:70 },
  stab:{ start:1, amount:35, reach:4, formula:1 },
  veil:{ taint:40, broken:8 },
  dna:{ crawler:0.35, drone:0.3, spitter:0.5, brute:1, husk:1, hive:3, life:90 },
  loyal:{ help:12, hp:{ easy:0.85, normal:1, hard:1.2 }, dmg:{ easy:0.85, normal:1, hard:1.15 }, xp:2 }
};
/* Corps voices heard over the radio in a Rogue mission: shown as an intercept */
const ROGUE_INTERCEPT = ['Cmdr. Varga','Sgt. Kessler','Dropship Kestrel','Dr. Maas','Lt. Okafor','Corps patrol','Outpost Kappa','Corps radio'];
/* ROGUE_VOICE: what the Osprey crew says instead of the Corps lines (VOICE in veterans.js). Kinds the crew lacks fall back to VOICE.
   Extra kinds: loyal (first shots at the loyal Corps), taint (said now and then from 85% taint), seizure, feral, stab (the Medic doses someone), sorry (back to his senses after a feral fit).
   The voice itself is lower and slower than the Corps, and drops further as the taint climbs (ROGUE_VOICE_TONE). */
const ROGUE_VOICE = {
  select:  ['Talk.','What now, Captain?','Still breathing.','Yeah?','Say it.','Listening.','Make it quick.','Still here. Mostly.'],
  move:    ['Quiet. Moving.','Into the dark.','Stay low.','Going.','Keep to the shadows.','Moving. No noise.','Fine.'],
  attack:  ['Take them apart!','Leave nothing!','Shoot, don\'t burn!','Bleed them!','Put them down!','Make it count!'],
  contact: ['Company.','I smell them.','Something\'s coming.','They\'re close. I can feel it.','Movement. Ours or theirs?','Here they come.'],
  loyal:   ['Corps. Our old friends.','Corps kit. Don\'t let them call it in!','It\'s the Corps! Shoot first, remember later.','Our own people... no. Not any more.'],
  down:    ['{name}! Get up, the strain won\'t let you go!','{name} is down! Leave the body, we come back for it.','No, {name}! ...it\'s still moving in there.','We lost {name}. For now.'],
  hurt:    ['It burns... the strain\'ll fix it.','Barely felt that.','Hit! It\'s already knitting.','That\'ll leave a mark.','Ugh. Again.'],
  downed:  ['I\'m down... it won\'t let me die.','Can\'t move... it\'s holding me together.','Doc! Doc, it hurts different!','Leave me. No. Don\'t.'],
  revived: ['Back. Don\'t ask how.','Still alive. Sort of.','On my feet.','Thanks, Doc. I think.'],
  heal:    ['Hold still. This is not medicine any more.','Breathe. Let it work.','Stay with me.','Your blood looks wrong. Hold still.'],
  build:   ['On it.','Give me a minute.','Building. Keep them off me.','Corps junk. It\'ll do.'],
  flare:   ['Light out! Cover your eyes.','Flare! Hate the light now.','Lighting it.'],
  grenade: ['Frag!','Catch!','Fire in the hole!'],
  waver:   ['The Captain\'s down!','Without the Captain we\'re just deserters!','Captain\'s gone... what now?','Who gives the orders now?!','Don\'t look at me... I can\'t lead!','We\'re lost. The strain\'ll take us next.','No Captain... no Corps... nothing left.'],
  taint:   ['I can hear them singing...','My hands won\'t stop shaking.','It\'s so loud in my head.','The hive... it\'s calling me.','I\'m fine. I\'m fine. I\'m fine.','Doc... my eyes feel wrong.'],
  seizure: ['Not now... not now!','Hold me down!','It\'s taking me!','Can\'t... control...','Make it stop!','Someone... pin me!'],
  feral:   ['Kill... kill...','HUNGRY.','Bleed... feed...','Rip them open.','No more words.','Meat.'],
  stab:    ['Needle in. Breathe.','There. Come back to us.','One dose. Make it last.','Easy. Easy now.'],
  sorry:   ['Sorry about that.','...did I hurt anyone?','That wasn\'t me. That wasn\'t me.','I\'m back. I\'m back.','Don\'t look at me like that.','Won\'t happen again. Probably.']
};
/* how the crew sounds: pitch and rate for the browser's speech voice. taint 0 → base, taint 100 → base − drop. feral: pitch/rate below. */
const ROGUE_VOICE_TONE = { pitch:0.66, pitchF:0.98, rate:0.95, drop:0.45, rateDrop:0.25, feralPitch:0.1, feralRate:0.62, taintChance:0.3 };
/* in a Rogue job, the engine's own warnings (hives, husks, the hunt) come from the crew instead of these advisors */
/* the Osprey's pilot: died in the crash ("Pilot's gone", Osprey Down). Not crew you play, but his name is on the Cenotaph with theirs. */
const OSPREY_PILOT = { name:'Van Haviksburg', rank:4, role:'Pilot' };
/* everyone the Corps lists as lost with the Osprey, in the order of the stone: the Captain, the pilot, then the crew */
const ospreyLost=()=>[{ title:crewTitle(ROGUE_CREW[0]), role:UNITS[ROGUE_CREW[0].type].name }, { title:`${RANKS[OSPREY_PILOT.rank].abbr} ${OSPREY_PILOT.name}`, role:OSPREY_PILOT.role },
  ...ROGUE_CREW.slice(1).map(c=>({ title:crewTitle(c), role:UNITS[c.type].name }))];
const ROGUE_ADVISORS = { 'Dr. Maas':'Devreese', 'Sgt. Kessler':'Capt. Kerckhoffs' };
/* the trophies of the Rogue campaign (a row on the Trophy wall) */
const ROGUE_TROPHIES = [
  { id:'rogue:ascend', name:'Ascension',    what:'End the Rogue campaign by taking the Mother strain' },
  { id:'rogue:ashes',  name:'Ashes',        what:'End the Rogue campaign by burning the heart' },
  { id:'rogue:full',   name:'Full Strain',  what:'One crew member carries all six strains' },
  { id:'rogue:cold',   name:'Cold Blood',   what:'Win every Rogue mission without a crew member ever going feral' },
  { id:'rogue:wolf',   name:'Wolf in the Fold', what:'Win Among Them without a veil ever being torn' },
  /* one per difficulty, on their own row: every Rogue mission won on it (a win on Hard also counts for Normal and Easy) */
  { id:'rogue:easy',   name:'Deserter',     what:'Win every Rogue Strain mission on Easy', diff:'easy' },
  { id:'rogue:normal', name:'Turncoat',     what:'Win every Rogue Strain mission on Normal', diff:'normal' },
  { id:'rogue:hard',   name:'Apex Strain',  what:'Win every Rogue Strain mission on Hard', diff:'hard' }
];
