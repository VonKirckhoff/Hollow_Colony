'use strict';
/* Hollow Colony: the Intel screen (campaign and main menu). Which units and structures are shown on each tab,
   plus a short field note per entry. The numbers themselves come straight from UNITS and BUILDINGS.
   extras: entries that are no unit or building of their own (a case, a pad, a crate, her Seed, the raiders), from INTEL_EXTRA.
   Every entry moves in Intel: a little looping scene per key, in js/engine/21b-intel-anim.js (INTEL_SCENES). */
const INTEL_TABS = [
  { id:'corps',  name:'Lunar Corps', units:['trooper','gunner','pyro','medic','engineer','scientist'] },
  { id:'struct', name:'Structures',  buildings:['hq','relay','sentry','barricade','lz','uplink','generator','chargesite','charge','medtent','terminal','door','wreck','rubble'], extras:['relaypad','salvage','stabcase'] },
  { id:'swarm',  name:'Brood',       units:['crawler','drone','spitter','brute','seedling','bloater','grafter','husk','broodmother'], buildings:['hive','egg','cocoon','membrane','shaft'], extras:['heart'] },
  { id:'other',  name:'Other',       units:['grazer'], extras:['raiders'] },
  { id:'rogue',  name:'Rogue Strain', rogue:true },   /* the Osprey crew, strains and taint (31-rogue.js); always shown, with a lock until the Rogue campaign is open */
  { id:'relics', name:'Relics',      relics:true }
];
const INTEL_NOTES = {
  trooper:  'The backbone of every squad. Range 5 outreaches every Brood unit, the Spitter (4.6) just barely.',
  gunner:   'Huge damage per second and his fire pins the Brood down (suppression slows them). Slow, so keep him behind the Troopers.',
  pyro:     'Short range, but the flame hits everything around his target. The answer to cocoons, hives and packed waves, and he burns the bodies of the fallen before the Brood can claim them. Where his flame lands, the ground keeps burning for a few seconds: lay it across a path and the Brood runs through fire.',
  medic:    'Patches up the downed first (4 seconds of work), then heals the worst wounded. Only uses his sidearm when nobody nearby needs him. Cannot heal the risen.',
  engineer: 'Builds, repairs and arms charges. Repairs nearby structures on his own, also in the defensive stance, and shoots back while he works.',
  scientist:'An escort: she follows your nearest soldier and must survive the mission.',
  hq:       'Trains every soldier type. Lose it and most missions are lost.',
  relay:    'Steady salvage income. Only on relay pads, and the Brood likes to hit them.',
  sentry:   'Outranges every Brood unit. An Engineer can fold it up (U) and set it up somewhere else.',
  barricade:'Cheap. Blocks a corridor so the Brood has to chew through it first.',
  lz:       'Order replacements here. The dropship cannot be shot, but the soldiers it brings can.',
  charge:   'Mission object: armed by an Engineer, then it has to survive its fuse.',
  generator:'Mission object: an Engineer repairs it to full to bring it online. It goes down when badly damaged.',
  uplink:   'Mission object (Kill Order, High Ground). A beacon nobody stands at stays as it is: leave a squad or a Sentry Gun there, or it changes hands behind your back.',
  chargesite:'Mission object (Dead Signal): the spot next to a nest where a charge has to go. The Engineer must stand still on it the whole time.',
  medtent:  'Mission object (Night Shift). Twelve wounded and a case of stabilizer in front of each tent. Nothing shoots at the tents themselves: the raiders want what is in them.',
  terminal: 'Mission object (Night Shift). The raiders\' Medic has to stand right next to it. What she has pulled off it, she keeps: break her off early and often.',
  door:     'Mission object (The Hollow Colony): Dr. Maas locked herself in behind it. It opens when your squad comes close.',
  wreck:    'The Osprey, at Hollow Colony. The Corps lists her crew as lost with all hands. Look closer at what lies around it.',
  rubble:   'Left behind where a seismic charge brought the cave down (Dead Signal). It blocks the way for good.',
  shaft:    'Some shafts belong to a hive and take over its guards and waves once you burn it. Others are old mine shafts the Osprey crew uses to get away, and to come back.',
  crawler:  'Fast and fragile, often in numbers. Cheap to lose, so the Brood throws them first.',
  seedling: 'A swollen pod on thin legs that a hive grows to carry the Brood somewhere new. It cannot fight. Where it digs in, far from people and other nests, a young nest grows within seconds. Kill it before it roots.',
  bloater:  'Lunar fauna the Brood killed, dragged home to a hive and remade. Slow and tough, and when it dies it bursts in a cloud of acid that burns your soldiers (and the Brood). Kill it at range.',
  grafter:  'The parasite of the Brood. It only hatches from a hive egg when a body (a soldier, or a grazer) lies in the mycel of its hive. It runs to the body, latches on and infects it in a few seconds: then the body becomes a cocoon. It cannot fight. One shot kills it.',
  egg:      'A hive keeps no eggs waiting: it lays one right at its own foot the moment a body lies in its mycel, and the Grafter inside goes for the body. Shoot the egg before it opens.',
  drone:    'Melee warrior. Dangerous in packs; a Gunner or a Pyro breaks them up. Scuttlers guard the bodies of the fallen and drag them home to the mycel around a hive.',
  spitter:  'Acid artillery at range 4.6: it outreaches Pyros and Medics. Its acid leaves a burning pool for a few seconds.',
  husk:     'A fallen soldier, remade. Dragged onto the mycel, infected by a Grafter from a hive egg, the cocoon beats like a heart until it cracks, and a Twitcher crawls out (40% of these numbers). It molts straight into the Husk. The molt takes 1.6 seconds and it takes 50% more damage meanwhile: that is your moment. While it is turning it stays on the mycel of its hive and defends it. The full Husk leaves the mycel and hunts your squad, and screams over every kill: the soldiers close to it flinch.',
  brute:    'Armoured siege beast that goes for walls and structures. Focus fire and keep your distance.',
  broodmother:'Boss. Rooted most of the time, but charges into your lines, lays eggs and sprays acid. Regenerates when left alone.',
  hive:     'Notices soldiers who come close: its guards attack and it births a brood. Every hit makes it scream for more. Badly hurt, it calls the other hives. Regrows when left alone. The mycel around it heals every Brood unit standing on it, and it withers once the hive is dead. Bring a squad, not a hero.',
  cocoon:   'A fallen soldier being turned. A Husk hatches from it in a few seconds unless you burn it.',
  membrane: 'Organic wall that seals tunnels. Has to be burned or shot through.',
  grazer:   'Harmless lunar fauna. The Brood kills it and drags the carcass home to a hive, where it becomes a Sporebag.'
};
/* entries that are no unit or building of their own. stats: [label, value]; a function is called when the card is shown */
const INTEL_EXTRA = {
  relaypad:{ name:'Relay Pad', role:'2×2 build site', faction:'corps',
    desc:'A yellow-striped pad in the regolith. The only place a Relay Tower can stand.',
    note:'Claim the pads early: every tower pays salvage and adds supply, and the Brood knows it.', stats:()=>[['Tower','Relay Tower'],['Salvage/s',BUILDINGS.relay.income],['Supply','+'+BUILDINGS.relay.supply]] },
  salvage:{ name:'Salvage Crate', role:'Pick-up', faction:'corps',
    desc:'Supplies the colonists and earlier missions left behind, scattered over every map.',
    note:'Walk any soldier over it. Some lie off the beaten track, in a crater or behind a nest.', stats:()=>[['Salvage','40 to 60']] },
  stabcase:{ name:'Stabilizer Case', role:'Mission object · Night Shift', faction:'corps',
    desc:'A cold case of Dr. Maas\'s stabilizer, one in front of each tent of the Kappa field hospital.',
    note:'The raiders want them: one of them only has to stand at a case for a moment and it is gone. Keep a soldier between the cases and the dark.',
    stats:()=>{ const m=MISSIONS.find(x=>x.id==='night-shift'); return [['Taken in',((m&&m.job.nsGrab)||2.5)+' s'],['Cases','3']]; } },
  heart:{ name:'Her Seed', role:'Mission object · The Matron\'s Seed', faction:'swarm',
    desc:'A knot as big as a man, ripped out of the Matron\'s roots when she tore herself free and burrowed into the deep. Under its hard rind the core still pulses, and its sap carries the strain at its strongest.',
    note:'Burn it before the Osprey crew drains it. A Pyro next to it does it fastest; without their Medic the crew drains it at half speed.',
    stats:()=>{ const m=MISSIONS.find(x=>x.id==='mothers-heart'), J=(m&&m.job)||{}; return [['Pyro burns it',(J.mhBurn||10)+' s'],['Anyone else',(J.mhSmash||25)+' s'],['Drained in',((J.mhTap&&J.mhTap.normal)||210)+' s']]; } },
  /* the Osprey crew as Dust meets them: nameless until Night Shift is won */
  raiders:()=>{ const known=typeof isDone==='function'&&isDone('night-shift'), O=typeof OSPREY!=='undefined'?OSPREY:{hp:{normal:2.5},breakAt:0.25,hiveHeal:6};
    return { name:known?'The Osprey crew':'Unidentified raiders', role:known?'Hostile · Containment Order 9':'Hostile · no IFF', faction:'rogue',
      desc:known?'The crew of the Osprey, listed as lost with all hands at Hollow Colony. Alive, and carrying the strain in their blood. Under Containment Order 9 the Corps engages them on sight.'
        :'Soldiers in Corps armour without a transponder. They move like a fire team, they take a burst and keep walking, and the Brood walks right past them.',
      note:'They never stay down. Hurt one to a quarter of his health and he breaks off in a cloud of smoke, out of reach. He heals at a hive, or goes down an old shaft, and comes back. They march in a wedge, and they never go back through your lines.',
      stats:()=>[['Health','×'+O.hp.normal+' a soldier'],['Breaks off at',Math.round(O.breakAt*100)+'%'],['Heals at a hive',O.hiveHeal+' HP/s'],['XP for breaking one','+'+(O.xp||3)]] }; }
};
