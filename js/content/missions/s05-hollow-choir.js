'use strict';
/* Swarm mission 5: The Hollow Choir — The Hollow Colony, seen from the hives.
   A search team lands in the south-west, walks to the research lab in the north-east and takes Dr. Maas out of her locked room;
   then it heads for the extraction pad in the south-east. Their dropship lands when the clock runs out.
   Win: Dr. Maas dies. Lose: she reaches the pad once the dropship is down, or every nest burns.
   The ruins are full of fallen colonists (colonistBodies): bring them home for Husks, the colony's choir.
   Nov 2026: the search team marches as one body in a circle (choirTick, CHOIR_SQUAD): a fight on the way stops the whole circle,
   so the Medic never walks on alone. Once Dr. Maas is out she stands in the middle of the circle. They leave the lab by its east
   side and dig in in the crater south of it: the Engineer sets up a Sentry Gun, they hold (and the nearby hive lies within reach).
   CHOIR_SQUAD.leaveAt seconds before the dropship lands the Engineer packs the gun up, they march to the pad and he sets it up again there.
   A soldier who goes down on the march is never left behind: the circle closes round him until the Medic has him back up (choirRescue).
   A nest on the way (choirNestCheck): they hold their fire on it, walk into its room on the defensive (they still shoot what attacks them)
   to a spot where the whole circle fits and every gun reaches the nest (choirNestSpot), and only once the circle stands do they burn it
   (stage nest-fight). Then on with the leg. So they never fight a nest from a doorway, strung out in a file. */
/* CHOIR_SQUAD: east = the spot just outside the lab's east side they march to first · crater = the middle of their circle in the crater
   · sentry / padSentry = tile of the Sentry Gun in the crater and by the Landing Zone · pad = the middle of their circle at the pad
   · leaveAt = seconds on the dropship clock when they leave the crater · resume = seconds a march may stand still (after a fight) before it goes on
   · packWait = seconds they wait at most for the Engineer to fold the gun up · leash = tiles a soldier may step out of his place to get a target within reach (no chasing)
   · nestSee = tiles from the circle's middle at which a nest on the way is seen (on the legs to the lab and out by the east side)
   · nestNear / nestFar = tiles between the circle's middle and the nest's edge where they stand to burn it (the circle may squeeze to 70% to fit a small room) · nestWait = seconds they may take
   getting into the room before they fight from where they are */
const CHOIR_SQUAD = { east:{x:61.5,y:8.5}, crater:{x:55.5,y:18.5}, sentry:{tx:54,ty:20}, pad:{x:55.5,y:35}, padSentry:{tx:51,ty:34}, leaveAt:120, resume:3, packWait:12, leash:1.5, nestSee:8, nestNear:1, nestFar:3.2, nestWait:60 };
SWARM_MISSIONS.push(
  {
    id:'swarm-choir', side:'swarm', title:'The Hollow Choir', map:'hollow',
    summary:'Where it all began, the soft ones come for the one who knows us. She must not leave.',
    briefing:[
      'This is where we first woke: the colony of narrow doors and quiet halls. Its people still lie where they fell, and they still sing for us.',
      'A pack of soft ones has landed in the south-west. They walk to the hall of glass in the north-east, where the one who studied us hides behind a locked door. They will take her to the flat place in the south-east, and a flying thing will carry her away.',
      '<b>She must not leave.</b> Kill her before she is on board. The walls and doors are ours: lure them apart, wait in the halls.',
      'Bring the fallen colonists home: what grows out of them sings. Keep at least one nest alive.'
    ],
    landingZone:{ tx:54, ty:36, scripted:true },   /* Nov 2026: the pad moved in from the corner (the bigger 3D dropship), round waypoint 2 */
    start:{ camera:{x:28,y:20}, rally:{x:28,y:18},
      units:[ ['trooper','P',5], ['gunner','P',1], ['pyro','P',1], ['medic','P',1], ['engineer','P',1] ],
      swarmUnits:[ ['crawler','b',6], ['drone','b',4], ['spitter','b',1] ],
      hives:['a','b','c'], hiveHp:1.3 },
    swarm:{ biomass:160, rate:1.0, guardMax:2, guardEvery:22, aggro:6, waves:null, cap:36, seedling:true, unlock:{ spitter:0, brute:240, seedling:90 } },
    objectives:[
      { id:'maas', text:'Dr. Maas must not leave the colony' },
      { id:'fed',  text:'Bring 5 of the fallen home (0/5)', optional:true },
      { id:'nest', text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{ swarmBrood(); colonistBodies([{x:20,y:16},{x:39,y:17},{x:40,y:35},{x:61,y:32},{x:38,y:3},{x:12,y:18},{x:44,y:28}],'engineer');
          makeBuilding('wreck','none',41,9,true); const d=makeBuilding('door','corps',53,4,true); d.tag='maasdoor'; g.vars.door=d;
          g.setTimer(720,'Dropship'); g.marker('lab',{x:53,y:5},'Her room'); g.marker('pad','2','Their pad');
          choirGo(g,'lab'); } },
      { repeat:true, when:g=>g.time>0.2, do:choirTick },
      { when:g=>g.time>1, do:g=>g.brood_say('They walk from the south-west towards the hall of glass. The fallen colonists lie all over the halls: bring them home and they sing.') },
      { when:g=>g.time>3, do:g=>g.say('Sgt. Kessler','Dust on the ground. Lab is north-east, pad is south-east. Twelve minutes till Icarus. Move.') },
      /* at the lab: they open her door and she comes out */
      { when:g=>g.near('corps','1',7)>=2, do:g=>{ g.vars.atLab=g.time; g.say('Sgt. Kessler','We are at the lab. Cutting the door. Doctor, it is the Corps!'); } },
      { when:g=>g.vars.atLab && g.time>g.vars.atLab+12, do:g=>{ if(g.vars.door&&!g.vars.door.dead) g.vars.door.dead=true; g.unmark('lab');
          g.vars.maas=g.spawn('scientist',{x:53,y:6},1)[0]; maasLead(g); g.say('Dr. Maas','You came. Please, get me out of here, they are in the walls.');
          g.brood_say('The one who studied us. She is out of her shell. She must not leave.'); g.marker('maas',{x:53,y:6},'Dr. Maas');
          choirGo(g,'east'); } },
      { repeat:true, when:g=>!!g.vars.maas&&!g.vars.maas.dead, do:g=>{ maasLead(g); const m=g.vars.maas; G.markers=G.markers.filter(k=>k.id!=='maas'); G.markers.push({id:'maas',x:m.x,y:m.y,label:'Dr. Maas',col:'#ff5a4f'}); } },
      /* a second team holds the pad */
      { when:g=>g.time>360, do:g=>{ g.say('Dropship Icarus','Icarus dropping a fire team on the pad to hold it open.'); g.airdrop([['trooper',g.n(3)],['gunner',1]],15); } },
      { when:g=>g.timerLeft()<=60 && g.time>5, do:g=>g.say('Dropship Icarus','One minute out. Get her to the pad.') },
      { repeat:true, when:()=>true, do:g=>{ const f=Math.min(5,g.stat('fed')); g.setText('fed',`Bring 5 of the fallen home (${f}/5)`); if(f>=5) g.complete('fed'); } },
      { when:g=>g.vars.maas && g.vars.maas.dead, do:g=>{ g.unmark('maas'); g.complete('maas'); g.complete('nest'); g.win('The one who studied us lies still in the halls. No one will carry what she knew. The colony sings.'); } },
      { when:g=>g.timerLeft()===0 && g.vars.maas && !g.vars.maas.dead && dist(g.vars.maas,ptWorld('2'))<4*TILE, do:g=>{ g.fail('maas'); g.lose('The flying thing lifts off with her inside. What she knows about us leaves the moon.'); } },
      { when:g=>g.timerLeft()===0 && !g.vars.maas, do:g=>{ g.fail('maas'); g.lose('They took too long, but so did we: the flying thing came for them anyway, and she went with it.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('Every nest in the colony burns. The choir falls silent.'); } }
    ]
  }
);
/* the search team: everyone of the first squad (not the fire team on the pad) who is still standing */
function choirTeam(g){ return G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.faction==='corps'&&e.choir); }
/* march the team in a circle to a stage: lab · east (out by the lab's east side) · crater · pad */
function choirGo(g,stage,at){ const C=CHOIR_SQUAD, V=g.vars; V.choir=stage; V.choirIdle=null;
  if(!V.choirInit){ V.choirInit=true; for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='corps') u.choir=true; }
  if(V.maas&&!V.maas.dead) V.maas.choir=true;
  const hold=['lab','east','crater','pad','nest-in','rescue'].includes(stage);   /* on the way: no shot at a nest until the circle stands in its room */
  for(const u of G.ents) if(u.choir&&!u.dead){ u.slotLeash=C.leash; u.noNest=hold; }
  const us=choirTeam(g); if(!us.length) return;
  const p=at?{x:at.x,y:at.y}:stage==='nest-in'&&V.nestSpot?{x:V.nestSpot.x,y:V.nestSpot.y}:stage==='lab'?ptWorld('1'):stage==='east'?{x:C.east.x*TILE,y:C.east.y*TILE}:stage==='crater'?{x:C.crater.x*TILE,y:C.crater.y*TILE}:{x:C.pad.x*TILE,y:C.pad.y*TILE};
  V.choirTo=p;
  for(const u of us){ u.stance=null; u.home=null; if(u.order&&(u.order.type==='hold'||u.order.type==='support')) u.order=null; }
  let f=us[0].formation; if(!f||f.shape!=='circle'||!us.every(u=>u.formation===f)){ f={shape:'circle',dir:-Math.PI/2,gap:1,seq:0}; for(const u of us){ u.formation=f; u.slot=null; } }
  f.engaged=null;
  if(us.length>1) marchTo(us,p.x,p.y,stage==='pad'?'move':'amove'); else corpsMove(us,p.x,p.y,'amove'); }
/* every frame: keep the circle going, dig in at the crater, leave for the pad in time */
function choirTick(g){ const C=CHOIR_SQUAD, V=g.vars, st=V.choir; if(!st||G.over) return;
  const us=choirTeam(g); if(!us.length) return; const f=us[0].formation, p=V.choirTo;
  /* a soldier back on his feet, or Maas just out: into the circle */
  const loose=us.filter(u=>u.formation!==f&&!(u.order&&(u.order.type==='build'||u.order.type==='pack'||u.order.type==='repair')));
  if(f&&loose.length){ for(const u of loose){ u.formation=f; u.slot=null; u.formSeq=null; } if(marching(f)) reformSquad(choirTeam(g).filter(u=>u.formation===f),f,f.march,false); else if(st==='crater-hold'||st==='pad-hold'||st==='nest-fight') choirHold(g); else V.choirIdle=-99; }
  /* a man down on the way: the circle closes round him and waits until the Medic has him back up (choirRescue) */
  if(choirRescue(g,us,st)) return;
  /* a nest on the way: into its room first, in a circle, then burn it */
  if(choirNestCheck(g,us,st)) return;
  const mid=f&&(marching(f)?{x:f.march.x,y:f.march.y}:f.at)||us[0], far=p&&Math.hypot(mid.x-p.x,mid.y-p.y)>TILE*1.5;
  /* the leg is walked: on to the next one */
  if(f&&!marching(f)&&!far){
    if(st==='east'){ choirGo(g,'crater'); return; }
    if(st==='crater'){ choirDigIn(g); return; }
    if(st==='pad'){ choirPadDown(g); return; }
    if(st==='nest-in'){ choirNestFight(g); return; } }
  /* stopped (a fight on the way, everyone's orders gone): after a while the circle walks on */
  if((st==='lab'||st==='east'||st==='crater'||st==='pad'||st==='nest-in')&&far){
    const idle=!marching(f)&&us.every(u=>!u.target&&(!u.order||u.order.type==='hold'||u.order.rejoin||(u.order.form&&u.order.form!==f)));
    if(idle){ V.choirIdle=V.choirIdle??g.time; if(g.time-V.choirIdle>=C.resume) choirGo(g,st); } else V.choirIdle=null; }
  /* in the crater: until the dropship is near */
  if(st==='crater-hold'&&g.timerLeft()<=C.leaveAt){ const s=V.choirGun, eng=us.find(u=>u.def.builder);
    g.say('Sgt. Kessler','Two minutes! Pack up the gun, we move to the pad. Keep the doctor in the middle.');
    if(alive(s)&&s.built&&eng){ eng.formation=null; eng.slot=null; eng.order={type:'pack',target:s}; eng.target=null; eng.path=null; eng.goal=null; V.choir='packing'; V.packAt=g.time; }
    else choirGo(g,'pad'); return; }
  if(st==='packing'){ const eng=G.ents.find(e=>!e.dead&&e.choir&&e.def.builder);
    if(!eng||eng.downed||eng.carry||!alive(V.choirGun)||g.time-V.packAt>C.packWait) choirGo(g,'pad'); return; }
  if(st==='crater-hold'){ if(!alive(V.choirGun)){ const gun=nearestOf({x:(C.sentry.tx+.5)*TILE,y:(C.sentry.ty+.5)*TILE},e=>e.kind==='building'&&e.type==='sentry'&&e.faction==='corps'&&!e.dead&&dist(e,{x:(C.sentry.tx+.5)*TILE,y:(C.sentry.ty+.5)*TILE})<3*TILE); if(gun){ V.choirGun=gun; V.gunUp=true; const f0=us[0].formation, mem=us.filter(u=>u.formation===f0); if(f0&&mem.length>1){ reformSquad(mem,f0,null,false); choirHold(g); } } }   /* the gun stands where one of them stood: the circle shares out its places again round it */
    const eng=us.find(u=>u.def.builder&&(!u.order||u.order.type==='hold')); if(eng&&!V.gunUp&&!(eng.order&&eng.order.type==='build')) choirBuild(g,eng,C.sentry,false); } }
/* Nov 2026: nobody is left behind. A soldier of the team goes down on the march: the circle walks to him and stands round him,
   the Medic gets him back up (his patient first), then the team goes on with the leg it was on. Dug in (crater, pad) the Medic
   is close enough by himself. No Medic standing: they cannot help him and walk on. */
function choirRescue(g,us,st){ const V=g.vars, med=us.find(u=>u.def.heal);
  if(st==='rescue'){ const r=V.rescue;
    if(!r||r.dead||!r.downed||!med){ const back=V.rescueStage; V.rescue=null;
      if(r&&!r.dead&&!r.downed) g.say('Sgt. Kessler','He is up. Circle up, keep moving.');
      choirGo(g,back||'pad'); return true; }
    if(!med.healTarget||!med.healTarget.downed) med.healTarget=r;
    if(med.order&&med.order.type==='hold') med.order=null;
    return true; }
  if(!med||!['lab','east','crater','pad','nest-in'].includes(st)) return false;
  const hurt=G.ents.filter(e=>e.choir&&!e.dead&&e.downed&&e.kind==='unit').sort((a,b)=>a.downed.t-b.downed.t)[0];   /* the one closest to bleeding out first */
  if(!hurt) return false;
  V.rescue=hurt; V.rescueStage=st; med.healTarget=hurt;
  g.say('Sgt. Kessler',hurt.def.escort?'The doctor is down! Medic, now! Everyone round her!':'Man down! Doc, get him up. Circle round him, nobody moves on.');
  choirGo(g,'rescue',{x:hurt.x,y:hurt.y}); V.choir='rescue'; return true; }
/* Nov 2026: a nest on the legs to the lab and out by the east side. Seen within nestSee tiles: they keep their fire off it and
   walk into its room on the defensive (stage nest-in, an attack-move: whatever attacks them is shot), to a spot where the whole
   circle fits. Standing there (stage nest-fight) they hold their places and burn it; once it is gone they go on with the leg.
   No spot where the circle fits: they fight it as before. Returns true while the nest has them busy. */
function choirNestCheck(g,us,st){ const C=CHOIR_SQUAD, V=g.vars;
  if(st==='nest-in'||st==='nest-fight'){ const h=V.nest;
    if(!alive(h)||h.hidden){ V.nest=null; V.nestSpot=null; g.say('Sgt. Kessler','Nest is down. Circle up, move on.'); choirGo(g,V.nestStage||'lab'); return true; }
    if(st==='nest-in'&&g.time-V.nestAt>C.nestWait){ choirNestFight(g); return true; }   /* it takes too long getting in: fight from where they are */
    return false; }
  if(st!=='lab'&&st!=='east') return false;
  const f=us[0].formation, mid=f&&marching(f)?{x:f.march.x,y:f.march.y}:{x:us.reduce((a,u)=>a+u.x,0)/us.length,y:us.reduce((a,u)=>a+u.y,0)/us.length};
  const h=hives().filter(e=>!e.hidden).sort((a,b)=>dist(a,mid)-dist(b,mid))[0];
  if(!h||dist(h,mid)>C.nestSee*TILE) return false;
  if((V.nestSkip||[]).includes(h.id)){ for(const u of us) u.noNest=false; return false; }   /* a nest with no room for the circle: as before */
  const spot=choirNestSpot(us,h,mid);
  if(!spot){ (V.nestSkip=V.nestSkip||[]).push(h.id); for(const u of us) u.noNest=false; return false; }   /* no room for the circle: as before, they fight it from where they get at it */
  V.nest=h; V.nestSpot=spot; V.nestStage=st; V.nestAt=g.time;
  g.say('Sgt. Kessler','Nest ahead. Into the room in a circle, hold your fire on it till we stand. Shoot whatever comes at you.');
  choirGo(g,'nest-in'); return true; }
/* the middle of a circle in the nest's room: every place on open ground with a clear line to the middle, none on top of the nest,
   the middle between nestNear and nestFar tiles from the nest's edge and with a clear line of fire to it; the one the team walks to soonest */
function choirNestSpot(us,h,from){ const C=CHOIR_SQUAD, f=us[0].formation, F=formPlaces(us,'circle',formSpacing(f)), dir=f?f.dir:-Math.PI/2, c=Math.cos(dir), s=Math.sin(dir);
  const htx=Math.floor(h.x/TILE), hty=Math.floor(h.y/TILE), R=Math.ceil(C.nestFar+(h.size||1)/2+1), cand=[];
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){ const x=(htx+dx+.5)*TILE, y=(hty+dy+.5)*TILE, P={x,y};
    if(!walkableP(x,y)) continue; const gap=gapTo(P,h); if(gap<C.nestNear*TILE||gap>C.nestFar*TILE) continue;
    if(fireBlocked(P,h)) continue;
    for(const k of SQUEEZE.slice(0,3)){ let ok=true;   /* a small room: the circle may squeeze together a little, as it does when it forms up */
      for(const o of F.places){ const px=x+(o.x*c-o.y*s)*k, py=y+(o.x*s+o.y*c)*k;
        if(!walkableP(px,py)||!lineClear(x,y,px,py)||gapTo({x:px,y:py},h)<TILE*0.35){ ok=false; break; } }
      if(ok){ P.k=k; cand.push(P); break; } } }
  if(!cand.length) return null;
  cand.sort((a,b)=>dist(a,from)-dist(b,from));
  let best=null, bl=Infinity;
  for(const P of cand.slice(0,12)){ const path=findPath(from.x,from.y,P.x,P.y); if(!path||!path.length) continue;
    let L=0, q=from; for(const w of path){ L+=Math.hypot(w.x-q.x,w.y-q.y); q=w; } L+=gapTo(P,h)*0.5+(1-P.k)*6*TILE;   /* and the full circle beats a squeezed one */   /* a bit nearer the nest is a bit better: every gun reaches it */
    if(L<bl){ bl=L; best=P; } }
  return best; }
/* the circle stands in the nest's room: hold the places and burn it */
function choirNestFight(g){ const V=g.vars; V.choir='nest-fight';
  for(const u of G.ents) if(u.choir&&!u.dead) u.noNest=false;
  choirHold(g); g.say('Sgt. Kessler','Circle is set. Burn that nest!'); }
/* at the crater: hold where they stand (they shoot what comes within reach, also the nest close by) and set up the gun */
function choirHold(g){ const us=choirTeam(g); for(const u of us){ if(u.order&&(u.order.type==='build'||u.order.type==='repair'||u.order.type==='pack')) continue; u.stance='hold'; } }
function choirDigIn(g){ const V=g.vars; V.choir='crater-hold'; choirHold(g);
  g.say('Sgt. Kessler','Into the crater. Dig in, set up the Sentry. We hold here till Icarus is close.');
  const eng=choirTeam(g).find(u=>u.def.builder); if(eng) choirBuild(g,eng,CHOIR_SQUAD.sentry,false); }
/* the Engineer sets the gun up: a new one in the crater, the one he carries by the pad */
function choirBuild(g,eng,t,deploy){ const V=g.vars; if(!canPlace('sentry',t.tx,t.ty,true)){ const n=nearestWalkable(t.tx,t.ty); if(!n||!canPlace('sentry',n.x,n.y,true)) return; t={tx:n.x,ty:n.y}; }
  eng.order={type:'build',btype:'sentry',tx:t.tx,ty:t.ty,deploy}; eng.target=null; eng.path=null; eng.goal=null; }
function choirPadDown(g){ const V=g.vars; V.choir='pad-hold'; choirHold(g);
  const eng=choirTeam(g).find(u=>u.def.builder&&u.carry&&u.carry.type==='sentry'); if(eng) choirBuild(g,eng,CHOIR_SQUAD.padSentry,true); }
/* Dr. Maas follows the nearest soldier of the search team */
function maasLead(g){ const m=g.vars.maas; if(!m||m.dead) return; if(m.lead&&!m.lead.dead&&!m.lead.downed) return;
  m.lead=g.corps().filter(u=>u!==m&&!u.downed&&!u.def.escort).sort((a,b)=>dist(a,m)-dist(b,m))[0]||null; }
