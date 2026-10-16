'use strict';
/* Hollow Colony — Skirmish setup. */
/* 1h. SKIRMISH — every lowercase marker on the map becomes a hive. */
const SKIRMISH = {
  salvage:300,
  units:[ ['engineer','P',2], ['trooper','P',4], ['medic','P',1] ],
  swarm:{ biomass:60, rate:0.5, guardMax:4, guardEvery:14, waves:{ first:150, every:80, budget:70, growth:30 } }
};
