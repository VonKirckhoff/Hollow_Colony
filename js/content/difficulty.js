'use strict';
/* Hollow Colony — difficulty settings. */
/* 1e. DIFFICULTY — multipliers for the Swarm.
   hp: Swarm unit health · dmg: Swarm damage · budget: size of waves and of a hive's emergency brood
   interval: time between waves and between hive screams (lower = more often) · hiveHp: hive health
   aggro: how far a hive notices your soldiers (× its aggro radius) */
const DIFFICULTY = {
  easy:   { label:'Easy',   hp:0.85, dmg:0.85, budget:0.7,  interval:1.25, hiveHp:0.85, aggro:0.8  },
  normal: { label:'Normal', hp:1.0,  dmg:1.0,  budget:1.0,  interval:1.0,  hiveHp:1.0,  aggro:1.0  },
  hard:   { label:'Hard',   hp:1.25, dmg:1.15, budget:1.4,  interval:0.8,  hiveHp:1.35, aggro:1.25 }
};
