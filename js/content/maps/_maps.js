'use strict';
/* 1f. MAPS — ASCII layouts. Legend:
     .  regolith      ,  dust         o  crater       ~  ice          =  plating
     #  rock          ^  high rock    *  crystal      (rock, ^ and * block movement)
     )  crater rim (raised, blocks)  _  crater floor  :  ramp (into a crater or up a plateau)
     &  plateau, high ground (walkable)  %  cliff (blocks)
     R  relay pad (top-left of a 2×2 tower)            S  salvage crate
     W  grazer herd   P Q  player start points
     0-9  named waypoints for mission scripts          a-n (no o)  hive sites
   One file per map in this folder: MAPS.<key> = { name, desc, layout:[…] }.
   Add a new map: save the file here (the Map Editor can export it) and add its <script> line to index.html. */
const MAPS = {};
