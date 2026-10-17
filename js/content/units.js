'use strict';
/* Hollow Colony — units and buildings. */
/* 1c. UNITS. Distances (range, sight, splash, healRange) are in tiles; speed in pixels/second.
   attack: 'bullet' (instant), 'flame' (short cone + splash), 'acid' (lobbed + splash), 'melee'.
   armor: share of incoming damage that is blocked (0.5 = half damage).
   Swarm units: biomass = spawn cost, weight = how often the AI picks it, unlock = seconds before it appears. */
const UNITS = {
  trooper: { name:'Trooper', faction:'corps', sprite:'trooper', role:'Rifle infantry',
    hp:60, speed:64, radius:9, sight:7, range:5, damage:7, cooldown:0.75, attack:'bullet',
    cost:50, supply:1, buildTime:7, key:'T', bio:true,
    desc:'Standard rifle infantry. Cheap, steady damage at medium range.' },
  gunner: { name:'Gunner', faction:'corps', sprite:'gunner', role:'Heavy weapons',
    hp:120, speed:52, radius:10, sight:7, range:5.5, damage:4, cooldown:0.16, attack:'bullet',
    cost:110, supply:2, buildTime:11, key:'G', bio:true,
    desc:'Rotary gun. Shreds swarms, but moves slowly.' },
  pyro: { name:'Pyro', faction:'corps', sprite:'pyro', role:'Flamethrower',
    hp:95, speed:60, radius:9, sight:6, range:2.3, damage:5, cooldown:0.14, attack:'flame', splash:1.1,
    bonus:{ cocoon:3, hive:1.6 },
    cost:90, supply:2, buildTime:10, key:'F', bio:true,
    desc:'Burns groups at close range. Triple damage to cocoons, bonus against hives.' },
  medic: { name:'Medic', faction:'corps', sprite:'medic', role:'Field medic',
    hp:55, speed:68, radius:9, sight:7, range:0, heal:9, healRange:3.5,
    cost:60, supply:1, buildTime:8, key:'M', bio:true,
    desc:'Heals nearby infantry automatically. Unarmed.' },
  engineer: { name:'Engineer', faction:'corps', sprite:'engineer', role:'Combat engineer',
    hp:50, speed:62, radius:9, sight:6, range:3.5, damage:3, cooldown:1.0, attack:'bullet',
    cost:60, supply:1, buildTime:8, key:'E', bio:true, builder:true, repair:22, autoRepair:7, carrySpeed:0.6, packTime:2,
    builds:['relay','sentry','barricade'],
    desc:'Builds relay towers, sentry guns and barricades. Repairs damaged structures nearby on its own.' },

  crawler: { name:'Crawler', faction:'swarm', sprite:'crawler', role:'Swarm runner',
    hp:30, speed:100, radius:7, sight:6, range:0.6, damage:5, cooldown:0.55, attack:'melee',
    biomass:15, weight:3, desc:'Fast and fragile. Hatches from cocoons.' },
  drone: { name:'Drone', faction:'swarm', sprite:'drone', role:'Swarm warrior',
    hp:70, speed:82, radius:9, sight:6, range:0.7, damage:9, cooldown:0.8, attack:'melee',
    biomass:25, weight:4, desc:'The backbone of the Swarm.' },
  spitter: { name:'Spitter', faction:'swarm', sprite:'spitter', role:'Acid artillery',
    hp:48, speed:66, radius:9, sight:7, range:4.6, damage:12, cooldown:1.7, attack:'acid', splash:0.8,
    biomass:35, weight:2, unlock:120, desc:'Lobs acid over the front line.' },
  brute: { name:'Brute', faction:'swarm', sprite:'brute', role:'Siege beast', scale:2,
    hp:280, speed:50, radius:15, sight:6, range:0.9, damage:26, cooldown:1.4, attack:'melee',
    biomass:90, weight:1, unlock:300, desc:'Armoured siege beast that tears through walls.' },

  scientist: { name:'Dr. Elin Maas', faction:'corps', sprite:'scientist', role:'Xenobiologist',
    hp:140, speed:60, radius:9, sight:6, range:0, bio:true, escort:true, supply:0,
    desc:'Carries the data core. Follows your nearest soldier unless you give her an order. She must survive.' },


  hunter: { name:'Grey Hunter', faction:'grey', sprite:'hunter', role:'Unknown hunter',
    hp:720, speed:88, radius:10, sight:9, range:4.5, damage:26, cooldown:1.6, attack:'plasma',
    cloak:true, retreatAt:0.45,
    desc:'Cloaked. Only visible for a moment after it fires, when it is hit, or when it gets close. Hunts the strongest prey.' },

  broodmother: { name:'Brood Mother', faction:'swarm', sprite:'broodmother', role:'Queen of the Swarm', scale:4,
    hp:14000, speed:18, radius:44, sight:9, range:1.4, damage:36, cooldown:1.7, attack:'melee', armor:0.25,
    boss:true, regen:20, eggEvery:15, chargeEvery:10, chargeTime:3, chargeSpeed:2.8, rootSpeed:0.25, spitEvery:7, eggs:2, spit:4, spitDamage:8,
    desc:'Mostly rooted, but every few seconds she charges into your lines. Deadly up close. Lays eggs, sprays acid, calls her brood when wounded and regenerates when left alone. What she kills, she eats.' },

  grazer: { name:'Grazer', faction:'wild', sprite:'grazer', role:'Lunar fauna',
    hp:40, speed:28, radius:9, sight:4, range:0, bio:true, passive:true,
    desc:'Docile lunar fauna. The Swarm will infect it if it can.' }
};

/* 1d. BUILDINGS. size is in tiles (square). */
const BUILDINGS = {
  hq:        { name:'Command Post', faction:'corps', size:3, hp:1600, sight:9, supply:12,
               trains:['trooper','gunner','medic','pyro','engineer'], art:'hq',
               desc:'Trains all Lunar Corps units. Right-click the ground to set a rally point.' },
  relay:     { name:'Relay Tower', faction:'corps', size:2, hp:420, sight:6, supply:4, income:1.2,
               cost:120, buildTime:18, key:'R', needsSite:true, art:'relay',
               desc:'Build on a relay pad. Produces salvage and adds 4 supply.' },
  sentry:    { name:'Sentry Gun', faction:'corps', size:1, hp:240, sight:7, range:6, damage:6, cooldown:0.4,
               attack:'bullet', cost:100, buildTime:14, key:'T', art:'sentry', deployTime:3, portable:true,
               desc:'Automated gun turret. Range 6. An Engineer can fold it up and carry it elsewhere.' },
  barricade: { name:'Barricade', faction:'corps', size:1, hp:380, sight:2, cost:30, buildTime:5, key:'B', art:'barricade',
               desc:'Cheap wall segment that blocks movement.' },
  hive:      { name:'Hive', faction:'swarm', size:3, hp:1000, sight:8, art:'hive', regen:6, regenDelay:12,
               desc:'Spawns the Swarm. Regrows slowly when left alone for a while. Destroy it.' },
  lz:        { name:'Landing Zone', faction:'corps', size:3, hp:1, sight:4, art:'lz', reinforce:true, noBlock:true, ground:true,
               orders:['trooper','gunner','medic','pyro','engineer'], cargo:6,
               desc:'A marking on the ground. Order reinforcements here and a dropship brings them in. Units can walk over it and the enemy ignores it. Right-click the ground to set where new troops gather.' },
  uplink:    { name:'Uplink Beacon', faction:'corps', size:2, hp:1, sight:3, art:'uplink', noBlock:true, ground:true, capture:true, captureTime:20, loseTime:15,
               desc:'Stand next to it with no Swarm close by to capture it. The Swarm takes it back if it holds the beacon unopposed.' },
  /* Mission objects (placed by mission scripts, never built by the player) */
  generator: { name:'Generator', faction:'corps', size:2, hp:2000, sight:2, art:'generator', generator:true, noDestroy:true,
               startHp:0.05, failAt:0.6, light:9,
               desc:'Colony power. Starts broken: Engineers repair it. Running, it lights the area around it, and the Swarm comes for the light. It shuts down when badly damaged.' },
  chargesite:{ name:'Charge Site', faction:'corps', size:1, hp:1, sight:2, art:'chargesite', ground:true, noBlock:true, armTime:20,
               desc:'Seismic charge site. An Engineer standing still on it arms a charge.' },
  charge:    { name:'Seismic Charge', faction:'corps', size:1, hp:320, sight:4, art:'charge', fuse:75, blast:4.5, blastDamage:450,
               desc:'Armed seismic charge. It must survive until the fuse runs out. Engineers can repair it.' },
  rubble:    { name:'Rubble', faction:'none', size:1, hp:1, sight:0, art:'rubble', scenery:true,
               desc:'Collapsed rock.' },
  door:      { name:'Blast Door', faction:'corps', size:1, hp:1, sight:1, art:'door', scenery:true,
               desc:'A sealed station blast door. Only the mission can open it.' },
  membrane:  { name:'Membrane', faction:'swarm', size:1, hp:600, sight:1, art:'membrane',
               desc:'Living tissue that seals a tunnel. It cannot be harmed while its egg chambers live.' },
  cocoon:    { name:'Cocoon', faction:'swarm', size:1, hp:35, sight:2, hatch:5, art:'cocoon', noBlock:true,
               desc:'A fallen body, being remade. Destroy it before it hatches.' }
};
const MAX_SUPPLY = 50;
