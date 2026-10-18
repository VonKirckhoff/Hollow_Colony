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
  trooper:  { name:'Grenade',      text:'Throws a grenade at groups of enemies', every:9, damage:55, radius:1.5, range:6 },
  gunner:   { name:'Steady aim',   text:'No slower fire while on the move' },
  pyro:     { name:'Long flame',   text:'Flamer reaches further', range:1.5 },
  medic:    { name:'Field triage', text:'Heals everyone around him at once', share:0.6 },
  engineer: { name:'Quick hands',  text:'Builds, repairs and arms charges twice as fast', speed:2 }
};
/* Captain's leadership: soldiers close to him fire faster and take less damage. If he falls, the squad wavers. */
const AURA = { radius:4, rate:1.10, armor:0.10, waver:{ radius:9, time:10, rate:1.15 } };
/* Zombie mode (Halloween): raise a fallen soldier from the Cenotaph. The risen are tougher and heal themselves,
   but shamble, cannot be healed by a Medic, and rest for good if they fall a second time. They only heal out of combat. */
const RISEN = { hp:1.25, speed:0.85, regen:2, calm:4 };   /* regen only after `calm` seconds without being hit */
const VET_XP = { kill:1, spitter:2, brute:4, hive:5, broodmother:10, healPerXp:60, repairPerXp:250, build:1 };
const ROSTER_MAX = 30;
const STARTER_NAMES = ['Van Kerckhove','Heem','Van Damme','Vikernes','Verstappen'];
const SURNAMES = [
  'Van Kerckhove','Heem','Van Damme','Vikernes','Verstappen','Peeters','Janssens','Maes','Jacobs','Mertens','Willems','Claes',
  'Goossens','Wouters','De Smet','Hermans','Aerts','Pauwels','Michiels','Van den Bossche','Lambrecht','Vermeulen','Verbeke','Hendrickx',
  'Smets','Coppens','De Clercq','Stevens','Martens','Dewitte','Vandenberghe','De Vos','Verhoeven','Bogaerts','Cools','Segers',
  'Van Hecke','Verlinden','Leemans','Wuyts','Thys','Bosmans','Geerts','Van Acker','De Backer','Van de Velde','Vervoort','Willaert',
  'Baert','Verschueren','Van Hoof','De Meyer','De Wilde','Dhondt','De Ridder','Van Dyck','Verhaegen','Nijs','Van Loo','Verbruggen',
  'Raes','Moens','Dierickx','Huysmans','Van Gorp','Deckers','Daems','Schepers','Govaerts','Lenaerts','Verstraete','Vercammen',
  'De Keyser','Callens','Van Laere','Sels','Bastiaens','De Jong','Jansen','De Vries','Van den Berg','Bakker','Visser','Smit',
  'Meijer','De Boer','Mulder','De Groot','Bos','Dekker','Brouwer','De Wit','Dijkstra','De Graaf','Van der Meer','Kok',
  'Van der Linden','Hoekstra','Prins','Blom','Kuipers','Van Wijk','Timmermans','Groen','Postma','Schouten','Willemsen'];
/* Dutch-language names only. The first soldiers of a fresh campaign always get STARTER_NAMES, in this order
   (while those names are free: not on the roster, not on the memorial, not already in the mission).
   Names are unique: nobody in the roster, among the fallen or in the current mission shares a name.
   Only when all of these are taken does a soldier get an initial ("J. Torres"). */

/* Voice lines: shown in a speech bubble over a soldier. {name} is filled in where it makes sense. */
const VOICE = {
  select:  ['Ready.','Sir?','Go ahead.','Standing by.','Waiting on you.','Talk to me.'],
  move:    ['Moving out.','On my way.','Copy that.','Moving.','Roger.','You got it.'],
  attack:  ['Weapons free!','Engaging!','Let\'s go!','Light them up!','Going hot!'],
  contact: ['Contact!','Movement, front!','Here they come!','Eyes up!','Hostiles!'],
  down:    ['Man down!','We lost {name}!','{name} is down!','No! {name}!','Medic! ...too late.'],
  hurt:    ['I\'m hit!','Need a medic!','Taking fire!','Argh!'],
  heal:    ['Hold still.','I got you.','Patching you up.','Stay with me.'],
  build:   ['On it.','Building.','Give me a minute.','Setting it up.'],
  flare:   ['Flare out!','Lighting it up!','Light incoming!'],
  grenade: ['Frag out!','Grenade!','Fire in the hole!'],
  waver:   ['The Captain is down!','Who is in charge now?!','We lost the Captain!']
};
/* what the risen say instead */
const VOICE_RISEN = {
  select:  ['...still here.','I... remember.','Command... me.','...cold.'],
  move:    ['...coming.','Walking...','Always... walking.','...yes.'],
  attack:  ['...feed.','They will... fall.','Join... us.','...hungry.'],
  contact: ['...fresh meat.','I smell... them.','...they come.'],
  hurt:    ['...does not... hurt.','...again?'],
  heal:    ['...hold still.'],
  build:   ['...building.','Hands... remember.']
};
