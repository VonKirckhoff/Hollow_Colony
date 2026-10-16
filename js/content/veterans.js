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
const SURNAMES = ['Reyes','Lindqvist','Novak','Tanaka','Moreau','Kowalski','Silva','Brandt','Ivanova','Castillo','Nakamura','Duarte',
  'Fischer','Sorensen','Petrov','Mendes','Larsen','Vargas','Chen','Dubois','Kim','Janssens','Verbeke','Peeters','Wouters',
  'Rossi','Haugen','Ortega','Sato','Kovac','Ferreira','Nyberg','Becker','Torres','Lindgren','Varga','Quinn',
  'Van Kerckhove','Van Damme','Vikernes','Claes','De Smet','Maes','Vermeulen','Goossens','Mertens','Lambrecht','Hendrickx','Aerts'];
