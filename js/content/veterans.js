'use strict';
/* Hollow Colony — veteran ranks, XP and soldier names. */
/* 1d2. VETERANS — every soldier has a name and earns XP; ranks give bonuses.
   XP: Swarm kill 1 (Spitter 2, Brute 4), hive or chamber 5, Brood Mother 10.
   Medics earn 1 XP per 60 HP healed, Engineers 1 XP per finished building or 250 HP repaired.
   Survivors with XP go into the campaign roster and come back in the next campaign mission. */
const RANKS = [
  { name:'Private',  abbr:'Pvt.', xp:0,  mark:'',   hp:1.00, dmg:1.00, rate:1.00 },
  { name:'Corporal', abbr:'Cpl.', xp:4,  mark:'›',  hp:1.15, dmg:1.10, rate:1.05 },
  { name:'Sergeant', abbr:'Sgt.', xp:10, mark:'»',  hp:1.30, dmg:1.20, rate:1.10 },
  { name:'Veteran',  abbr:'Vet.', xp:20, mark:'★',  hp:1.50, dmg:1.30, rate:1.15 },
  { name:'Lieutenant', abbr:'Lt.', xp:40, mark:'★★', hp:1.75, dmg:1.45, rate:1.20, perk:true },              /* every type gets its own ability (PERKS) */
  { name:'Captain',  abbr:'Capt.', xp:60, mark:'✪', hp:1.85, dmg:1.55, rate:1.25, perk:true, aura:true, heroOnly:true }   /* only your own soldier: leads the squad (AURA) */
];
/* Lieutenant abilities, one per type */
const PERKS = {
  trooper:  { name:'Grenade',      text:'Throws a grenade at groups of enemies', every:9, damage:55, radius:1.5, throw:6 },   /* throw = how far the grenade goes (not his rifle) */
  gunner:   { name:'Steady aim',   text:'No slower fire while on the move' },
  pyro:     { name:'Long flame',   text:'Flamer reaches further', range:1.5 },   /* range = extra weapon reach (rangeBonus) */
  medic:    { name:'Field triage', text:'Heals everyone around him at once', share:0.6 },
  engineer: { name:'Quick hands',  text:'Builds, repairs and arms charges twice as fast', speed:2 }
};
/* Captain's leadership: soldiers close to him fire faster and take less damage. If he falls, the squad wavers. */
const AURA = { radius:4, rate:1.10, armor:0.10, waver:{ radius:9, time:10, rate:1.15 } };
/* Zombie mode (Halloween): raise a fallen soldier from the Cenotaph. The risen are tougher and heal themselves,
   but shamble, cannot be healed by a Medic, and rest for good if they fall a second time. They only heal out of combat. */
const RISEN = { hp:1.25, speed:0.85, regen:2, calm:4 };   /* regen only after `calm` seconds without being hit */
const VET_XP = { kill:1, spitter:2, brute:4, husk:3, hive:5, broodmother:10, healPerXp:60, repairPerXp:250, build:1 };
const ROSTER_MAX = 30; 
const STARTER_NAMES = ['Verhelst','Staelens','De Ridder','De Vos','Wolfaert'];   /* made-up everyday Flemish names, no famous namesakes */
const SURNAMES = [
  'Verhelst','Staelens','De Ridder','De Vos','Wolfaert', 'Sterckx', 'Peeters','Janssens','Maes','Jacobs','Iserbyt','Willems','Claes',
  'Goossens','Wouters','De Smet','Hermans','Aerts','Pauwels','De Groote','Van den Bossche','Lambrechts','Vermeulen','Verbeke','Hendrickx',
  'Smets','Coppens','De Brabander','Deconinck','De Geest','Dewitte','Vandenbergh','Daems','Verhoeven','Bogaerts','Cools','Segers',
  'Van Hecke','Verlinden','Leemans','Wuyts','Thys','Bosmans','Geerts','Van Acker','De Backer','Van de Velde','Vervoort','Willaert',
  'Baert','Verschueren','Van Hoof','De Meyer','De Wilde','Dhondt','De Bruyne','Van Dyck','Verhaegen','Dehandschutter','Van Loo','Verbruggen',
  'Raes','Moens','Dierickx','Huysmans','De Lepeleire','Deckers','Vincke','Schepers','Govaerts','Lenaerts','Verstraete','Vercammen',
  'De Keyser','Callens','Van Laere','De Mesmaeker','Bastiaens','Verbeeck','Van Hove','De Coster','Vandeputte','Lauwers','Van Daele','Vanneste',
  'Bauwens','Van Hulle','Lemmens','Coene','De Donder','Vermeiren','Van Wesemael','Van Steenkiste','Verbiest','Van Rompaey','Vanhaecke',
  'Haesaert','Braet','Cnudde','Neyt','De Vlaeminck','Van Belle','Berkhof','Van Peteghem','Swinnen','Wyns','Tack','Mortier', 'Devreese'];
/* The first soldiers of a fresh campaign always get STARTER_NAMES, in this order
   (while those names are free: not on the roster, not on the memorial, not already in the mission).
   Names are unique: nobody in the roster, among the fallen or in the current mission shares a name.
   Only when all of these are taken does a soldier get an initial ("A. Tack"). */

/* Voice lines: shown in a speech bubble over a soldier. {name} is filled in where it makes sense. */
const VOICE = {
  select:  ['Ready.','Sir?','Go ahead.','Standing by.',
    'Waiting on you.','Talk to me.','Listening.','Yes?','Standing by, Commander.',
    'Receiving.'],
  move:    ['Moving out.','On my way.','Copy that.','Moving.',
    'Roger.','You got it.','Copy, moving.'],
  attack:  ['Weapons free!','Engaging!','Let\'s go!','Light them up!','Going hot!',
    'Opening fire!','Engage!','Eat vacuum!'],
  contact: ['Contact!','Movement, front!','Here they come!','Eyes up!','Hostiles!',
    'Eyes up, they\'re close!','Something\'s out there!'],
  down:    ['Man down!','We lost {name}!','{name} is down!','No! {name}!',
    'Medic! ...too late.','No pulse... {name}\'s done.',],
  hurt:    ['I\'m hit!','Need a medic!','Taking fire!','Argh!','Just a fleshwound!',
    'That will make a nice scar...','That one got through...'],
  downed:  ['I\'m down!','Medic! I can\'t move!','Don\'t leave me here!',
    'I\'m hit bad!','Critical...','Critical. Extract or bury me.'],
  revived: ['Back in it.','Thanks, doc.','On my feet.','Still breathing.'],
  heal:    ['Hold still.','I got you.','Patching you up.','Stay with me.',
    'Another scar for the collection.','Hold still. This will hurt.',
    'Patching the holes.'],
  build:   ['On it.','Building.','Give me a minute.','Setting it up.','Deploying.'],
  flare:   ['Flare out!','Lighting it up!','Light incoming!'],
  grenade: ['Frag out!','Grenade!','Fire in the hole!'],
  waver:   ['The Captain is down!','Who is in charge now?!','We lost the Captain!',
    'Who has the lead now?!','We lost the only one with a plan!']
};
/* what the risen say instead */
const VOICE_RISEN = {
  select:  ['...still here.','I... remember.','Command... me.','...cold.',
    '...still... cold.','I remember... the light.','...empty.'],
  move:    ['...coming.','Walking...','Always... walking.','...yes.',
    '...drifting.','The ground remembers.'],
  attack:  ['...feed.','They will... fall.','Join... us.','...hungry.',
    'Break... a leg.','Join... the dark.'],
  contact: ['...fresh meat.','I smell... them.','...they come.','...blood.',
    '...brains.'],
  hurt:    ['...does not... hurt.','...again?','The cold... remains.',
    'You cannot kill what is already gone.'],
  heal:    ['...hold still.','...this looks delicious.'],
  build:   ['...building.','Hands... remember.','...raising.']
};
