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
  { name:'Veteran',  abbr:'Vet.', xp:20, mark:'★',  hp:1.50, dmg:1.30, rate:1.15 }
];
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
  flare:   ['Flare out!','Lighting it up!','Light incoming!']
};
