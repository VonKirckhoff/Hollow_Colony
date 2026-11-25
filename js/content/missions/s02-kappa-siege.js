'use strict';
/* Swarm mission 2: Kappa Siege — Hold Kappa, seen from the hives.
   The Lunar Corps digs in around a Command Post with sentries and two relay towers, trains new soldiers every minute,
   and twice sends a squad to burn a hive. A convoy arrives in fifteen minutes: destroy the Command Post before it does.
   Nov 2026: the garrison fights like Needle and Thread's (ksTac, KS_TAC), with the Brood as the enemy, and a raid marches out in a wedge
   and back home again (ksRaid, KS_RAID). */
SWARM_MISSIONS.push(
  {
    id:'swarm-siege', side:'swarm', title:'Kappa Siege', map:'kappa',
    summary:'They built a nest of steel in our basin. Tear it open before more of them arrive.',
    briefing:[
      'They came back. In the basin around the station they have built a hard nest that hums, and guns that turn by themselves.',
      'More of them are on the way: a long line of machines, a quarter of an hour out. When it arrives, the basin is theirs.',
      'Three nests ring the basin. Grow the brood, find the weak side and <b>tear down their Command Post</b>. Their towers feed them; their guns hate Crawlers and love a straight line. Split the brood into teams and come from two sides.',
      'They will come for our nests. Keep enough brood at home to meet them.'
    ],
    start:{ camera:{x:31,y:9}, rally:{x:30,y:9},
      units:[ ['engineer','Q',2], ['trooper','Q',6], ['gunner','Q',1], ['pyro','Q',1], ['medic','Q',1] ],
      buildings:[ ['hq','Q'] ], hives:['a','b','c'], hiveHp:1.3 },
    swarm:{ biomass:180, rate:1.0, guardMax:2, guardEvery:22, aggro:7, waves:null, cap:34, unlock:{ spitter:0, brute:240 } },
    objectives:[
      { id:'hq',     text:'Destroy the Command Post before the convoy arrives' },
      { id:'relays', text:'Destroy both Relay Towers', optional:true },
      { id:'nest',   text:'Keep at least one hive alive' }
    ],
    triggers:[
      { when:g=>g.time>0.1, do:g=>{
          const guns=({easy:2,normal:3,hard:4})[G.diffKey]||3; for(const [dx,dy] of [[5,-3],[-5,3],[5,4],[-4,-4]].slice(0,guns)) g.place('sentry','Q',dx,dy);   /* more sentry guns on harder difficulties */
          for(const [dx,dy] of [[7,0],[0,6]]) g.place('barricade','Q',dx,dy);
          ksCampStart(g);   /* the defence ring round the Command Post, and the sites the Engineers rebuild */
          const q=pt('Q'); const sites=[...G.map.sites].sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y)).slice(0,2);
          for(const s of sites){ const r=makeBuilding('relay','corps',s.x,s.y,true); r.tag='relay'; }
          g.vars.relays=G.ents.filter(e=>e.tag==='relay'); g.setTimer(900,'Convoy');
          const hq=G.ents.find(e=>e.type==='hq'); if(hq){ hq.maxHp*=2; hq.hp=hq.maxHp; } } },   /* a fortified Command Post: twice the armour plating */
      { when:g=>g.time>1, do:g=>g.brood_say('Their hard nest hums at the centre of the basin. Grow the brood: Q, W, E. Right-click to call it together. A to send it.') },
      { when:g=>g.time>3, do:g=>g.say('Cmdr. Varga','Command Post is live. Convoy is fifteen minutes out. Hold until then.') },
      { when:g=>g.time>40, do:g=>g.brood_say('Their guns turn by themselves and reach far. Lure them, or come at them from two sides: make teams with Ctrl and a number, give each its own gathering point (G).') },
      // the Command Post trains a soldier every so often
      { repeat:true, when:g=>g.time>(g.vars.trainAt||(g.vars.trainAt=55)), do:g=>{ g.vars.trainAt=g.time+55/(G.corpsDiff?G.corpsDiff.reinforce:1);
          if(!g.has('hq')||g.corps().length>=g.n(14)) return; const order=['trooper','trooper','gunner','medic','trooper','pyro']; g.vars.ti=(g.vars.ti||0)+1;
          g.spawn(order[g.vars.ti%order.length],'Q',1,{faction:'corps'}); } },
      // two raids on the nearest hive
      { when:g=>g.time>240, do:g=>ksRaid(g,4,'Sgt. Kessler','Fire team, push out and burn the nearest nest. Make it quick.') },
      { when:g=>g.time>540, do:g=>ksRaid(g,6,'Cmdr. Varga','They are massing. Hit a hive before they hit us. Go.') },
      { repeat:true, when:()=>true, do:g=>ksTick(g) },   /* the camp's tactics, the raids, the rebuilding (every half second) */
      { when:g=>g.time>780, do:g=>{ g.say('Cmdr. Varga','Two minutes until the convoy. Hold on!'); g.brood_say('The machines are close. Now, or never.'); } },
      { repeat:true, when:()=>true, do:g=>{ const n=(g.vars.relays||[]).filter(e=>!e.dead).length; g.setText('relays',`Destroy both Relay Towers (${2-n}/2)`); if(g.vars.relays&&n===0) g.complete('relays'); } },
      { when:g=>g.time>1 && g.has('hq')===0, do:g=>{ g.complete('hq'); g.complete('nest'); g.win('Their hard nest splits open. The convoy will find nothing but the Brood, waiting.'); } },
      { when:g=>g.timerLeft()===0, do:g=>{ g.fail('hq'); g.lose('The convoy rolls in under their guns. The basin is theirs.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.fail('nest'); g.lose('All three nests are burning. The brood starves.'); } }
    ]
  }
);

/* ---------- the camp round the Command Post (Nov 2026): Needle and Thread's tactics, with the Brood as the enemy ----------
   KS_CAMP: the defence ring round the Command Post (its middle): least radius `r` (tiles, clear of the Command Post), `perMan` tiles of ring per
   soldier, the Medics and Engineers on an inner circle (`inner`), `supGap` tiles apart (one Spitter's splash never catches two of them);
   `leash`: how far from the middle a soldier chases before he walks back; `reach`: how far from the middle a target may stand.
   KS_TAC (ksTac, every half second), as NT_TAC in Needle and Thread:
   ring    — no Brood about: the defence ring.
   front   — Brood seen within `see` tiles of the middle (by a soldier or a gun) or hitting one of them: `lineShare` of the fighters (those nearest
             the Brood) stand in a line facing the group of Brood nearest the camp (the Brood within `cluster` tiles of the nearest one), `frontAt`
             tiles short of it but `frontMin`…`frontMax` from the middle (right behind a barricade when one stands that way), `spacing` apart,
             the ends bent back by `bend`; the Medics `medBack` behind it; the rest stay on the ring, never within `restArc` degrees of that side
             (the Brood comes from two sides). A man falls: the line closes up. The Brood moves: the line turns (`turn` degrees) or shifts.
   back    — the line hit for `outFor` s by Brood none of them can reach (Spitters out of range): everyone `back` tiles behind the middle,
             until the Brood comes within `near` tiles.
   regroup — the Brood keeps to one spot (`campR` tiles for `campFor` s) while the fighters are below `hurt` health or someone is down:
             the line steps `safe` tiles beyond the Brood's reach and the Medics patch everyone up; forward again at `healed`, after
             `regroupMax` s or when the Brood moves; not again within `regroupCool` s.
   Nothing seen for `calm` s: back to the ring. New soldiers from the Command Post and a raid come home join the ring. */
const KS_CAMP={ r:3.2, perMan:0.9, inner:2.1, supGap:2.2, leash:9, reach:10 };
const KS_TAC={ see:12, calm:8, outFor:4, near:6.5, frontAt:3.5, frontMin:3, frontMax:5.5, spacing:1.1, bend:0.12, medBack:2.2, back:2.5,
  campR:2, campFor:10, hurt:0.75, healed:0.95, safe:1.5, regroupMax:30, regroupCool:15, turn:25, lineShare:0.5, restArc:75, cluster:5 };
/* rebuilding (ksRebuild): an Engineer of the camp builds a destroyed Sentry Gun or Barricade again on its old spot, Sentry Guns first; not while
   he was hit in the last `hitFor` s or while Brood stands within its reach plus `margin` tiles of the spot */
const KS_REBUILD={ hitFor:3, margin:2 };
/* a raid (ksRaid): the team first forms a wedge just outside the ring on the hive's side (at most `muster` s; `musterOut` tiles beyond the ring),
   then marches in it (the Pyro at the tip) to the nearest hive and burns it. Once it falls, or once the team is down to
   `abort` of its health (the downed count as nothing), it marches home (attack-move) and every man joins the ring again once within `homeR`
   tiles of the middle of the camp. A raid that stopped to fight on the way goes on for the hive after `resume` s. */
const KS_RAID={ abort:0.4, homeR:4, resume:2, muster:10, musterOut:1.5 };
const ksMid=g=>g.vars.ksMid||(g.vars.ksMid=(()=>{ const hq=G.ents.find(e=>e.type==='hq'&&e.faction==='corps'); return hq?{x:hq.x,y:hq.y}:ptWorld('Q'); })());
const ksMen=()=>G.ents.filter(e=>!e.dead&&!e.downed&&e.kind==='unit'&&e.ksRing&&!e.ksRaid);
/* the start: the sites to rebuild, every soldier into the ring */
function ksCampStart(g){ ksMid(g); g.vars.ksSites=G.ents.filter(e=>!e.dead&&e.kind==='building'&&e.faction==='corps'&&(e.type==='sentry'||e.type==='barricade')).map(e=>({type:e.type,tx:e.tx,ty:e.ty}));
  ksJoin(g,g.corps(),true); }
/* into the ring: defensive stance, a leash on what they may shoot at; Medics and Engineers spread out, Engineers mend from inside the camp */
function ksJoin(g,list,atOnce){ const C=ksMid(g);
  for(const u of list||[]) if(!u.dead&&!u.def.escort){ u.ksRing=true; u.ksRaid=null; u.formation=null; u.slot=null; u.stance='hold'; u.leash={x:C.x,y:C.y,r:KS_CAMP.reach*TILE};
    if(u.def.heal||u.def.builder) u.spread=KS_CAMP.supGap; if(u.def.builder) u.repairHome={x:C.x,y:C.y}; }
  ksPlace(g,atOnce); }
/* share out the places: the ring, or (in a fight) the line facing the Brood and the rest round the back */
function ksPlace(g,atOnce){ const R=KS_CAMP, A=KS_TAC, C=ksMid(g), T=g.vars.ksTac, us=ksMen();
  const fight=us.filter(u=>!u.def.heal&&!u.def.builder), sup=us.filter(u=>u.def.heal||u.def.builder);
  const place=(grp,r,given)=>{ if(!grp.length) return; const used=new Set();
    const fix=(x,y)=>{ if(walkableP(x,y)) return {x,y}; const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE), o=SPIRAL.find(o=>walkableT(tx+o.x,ty+o.y)&&!used.has((tx+o.x)+','+(ty+o.y))); if(o){ used.add((tx+o.x)+','+(ty+o.y)); return {x:(tx+o.x+.5)*TILE,y:(ty+o.y+.5)*TILE}; } return {x,y}; };
    const spots=given?given.map(p=>fix(p.x,p.y)):grp.map((_,i)=>{ const a=i/grp.length*Math.PI*2+ntRingOff(grp.length,r,C.x,C.y); return fix(C.x+Math.cos(a)*r*TILE,C.y+Math.sin(a)*r*TILE); });
    const as=assignCheapest(grp.map(u=>spots.map(p=>(u.x-p.x)**2+(u.y-p.y)**2)));
    grp.forEach((u,i)=>{ const p=spots[as[i]]; u.ringAt={x:p.x,y:p.y}; u.home={x:p.x,y:p.y};
      if(atOnce){ u.x=p.x; u.y=p.y; u.order={type:'hold'}; u.path=null; }
      else if(!u.target&&!(u.order&&(u.order.type==='repair'||u.order.type==='build'))){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }); };
  g.vars.ksN=us.length;
  if(T&&T.mode!=='ring'&&T.dir){ const d=T.dir, p={x:-d.y,y:d.x}, along=u=>(u.x-C.x)*d.x+(u.y-C.y)*d.y;
    const byFront=[...fight].sort((a,b)=>along(b)-along(a)), nLine=T.mode==='front'?Math.max(1,Math.ceil(fight.length*A.lineShare)):fight.length, line=byFront.slice(0,nLine), rest=byFront.slice(nLine);
    let fd; if(T.mode==='back') fd=-A.back;
    else if(T.mode==='regroup') fd=Math.max(-A.back,Math.min(A.frontMax,T.dist/TILE-(T.reach||2)-A.safe));
    else { fd=Math.max(A.frontMin,Math.min(A.frontMax,T.dist/TILE-A.frontAt));
      const bar=G.ents.filter(b=>!b.dead&&b.kind==='building'&&b.faction==='corps'&&b.type==='barricade'&&b.built!==false).map(b=>({along:((b.x-C.x)*d.x+(b.y-C.y)*d.y)/TILE,side:Math.abs((b.x-C.x)*p.x+(b.y-C.y)*p.y)/TILE}))
        .filter(o=>o.side<2.5&&o.along>=fd-0.4&&o.along<=A.frontMax+1.5).sort((a,b)=>a.side-b.side)[0];   /* a barricade that way: right behind it */
      if(bar) fd=bar.along-1; }
    const F={x:C.x+d.x*fd*TILE,y:C.y+d.y*fd*TILE}, n=line.length, row=(c,off,bk)=>({x:c.x+p.x*off*TILE-d.x*bk*TILE,y:c.y+p.y*off*TILE-d.y*bk*TILE});
    for(const u of fight) u.ksLine=line.includes(u);
    place(line,0,line.map((_,i)=>{ const off=(i-(n-1)/2)*A.spacing; return row(F,off,A.bend*off*off); }));
    const M=row(F,0,A.medBack); place(sup,0,sup.map((_,i)=>row(M,(i-(sup.length-1)/2)*R.supGap,0)));
    if(rest.length){ const a0=Math.atan2(d.y,d.x), arc=A.restArc*Math.PI/180, span=2*Math.PI-2*arc, r=Math.max(R.r,fight.length*R.perMan/(2*Math.PI));
      place(rest,0,rest.map((_,i)=>{ const a=a0+arc+span*(rest.length>1?i/(rest.length-1):0.5); return {x:C.x+Math.cos(a)*r*TILE,y:C.y+Math.sin(a)*r*TILE}; })); }
    return; }
  for(const u of fight) u.ksLine=false;
  place(fight,Math.max(R.r,fight.length*R.perMan/(2*Math.PI)));
  place(sup,sup.length>1?Math.max(R.inner,R.supGap/(2*Math.sin(Math.PI/sup.length))):R.inner); }
/* a soldier or a built gun of the Corps sees it (rock walls block sight) */
function ksSees(e){ return G.ents.some(o=>!o.dead&&!o.downed&&!o.hidden&&o.faction==='corps'&&o.def&&o.def.sight>0&&(o.kind==='unit'||o.built)&&Math.hypot(o.x-e.x,o.y-e.y)<o.def.sight*TILE&&!fireBlocked(o,e)); }
/* the Brood the camp knows about: seen near the camp, or just now hitting one of the ring */
function ksThreats(g){ const C=ksMid(g), ring=G.ents.filter(r=>r.ksRing&&!r.ksRaid&&!r.dead);
  return G.ents.filter(u=>!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&!u.hidden&&!u.burrowed&&u.def.speed>0&&((Math.hypot(u.x-C.x,u.y-C.y)<KS_TAC.see*TILE&&ksSees(u))||ring.some(r=>r.shotBy===u&&G.time-(r.shotAt||-99)<3))); }
function ksTac(g){ const A=KS_TAC, T=g.vars.ksTac||(g.vars.ksTac={mode:'ring',outT:0,seen:-99}), C=ksMid(g), say=t=>g.say('Cmdr. Varga',t);
  const all=ksThreats(g), men=ksMen(), fighters=men.filter(u=>!u.def.heal&&!u.def.builder);
  if(all.length){ T.seen=g.time;
    const first=all.reduce((a,b)=>Math.hypot(a.x-C.x,a.y-C.y)<=Math.hypot(b.x-C.x,b.y-C.y)?a:b), th=all.filter(u=>Math.hypot(u.x-first.x,u.y-first.y)<A.cluster*TILE);   /* the group nearest the camp: two groups from two sides do not average out to nowhere */
    const K={x:th.reduce((a,u)=>a+u.x,0)/th.length,y:th.reduce((a,u)=>a+u.y,0)/th.length}, L=Math.hypot(K.x-C.x,K.y-C.y)||1, nd={x:(K.x-C.x)/L,y:(K.y-C.y)/L};
    T.K=K; T.dist=L;
    if(T.mode==='ring'){ T.mode='front'; T.dir=nd; T.outT=0; T.lineAt=g.time; T.lineL=L; ksPlace(g); const s=fighters[0]; if(s) bark(s,'contact'); }
    else if(Math.acos(Math.max(-1,Math.min(1,T.dir.x*nd.x+T.dir.y*nd.y)))*180/Math.PI>A.turn||(T.mode==='front'&&g.time-T.lineAt>3&&Math.abs(L-(T.lineL||L))>1.5*TILE)){ T.dir=nd; T.lineAt=g.time; T.lineL=L; ksPlace(g); }
    const hit=men.some(r=>G.time-(r.shotAt||-99)<1.5&&r.shotBy&&r.shotBy.faction==='swarm');
    const answer=all.some(c=>fighters.some(f=>Math.hypot(f.x-c.x,f.y-c.y)<=(f.def.range+(f.rangeBonus||0)+0.5)*TILE));
    T.outT=(T.mode==='front'&&hit&&!answer)?T.outT+0.5:Math.max(0,T.outT-0.5);
    if(T.outT>=A.outFor){ T.outT=0; T.mode='back'; ksPlace(g); say('They are spitting at us from out of reach. Fall back behind the Command Post! Let them come to us!'); }
    if(T.mode==='back'&&all.some(c=>Math.hypot(c.x-C.x,c.y-C.y)<A.near*TILE)){ T.mode='front'; T.dir=nd; T.lineAt=g.time; ksPlace(g); }
    if(!T.campK||Math.hypot(K.x-T.campK.x,K.y-T.campK.y)>A.campR*TILE){ T.campK=K; T.campAt=g.time; }
    const camping=g.time-T.campAt>=A.campFor, down=G.ents.some(e=>!e.dead&&e.downed&&e.ksRing&&!e.ksRaid), hp=fighters.length?fighters.reduce((a,u)=>a+u.hp/u.maxHp,0)/fighters.length:1;
    T.reach=Math.max(...th.map(c=>c.def.range||0.7))+Math.max(...th.map(c=>Math.hypot(c.x-K.x,c.y-K.y)/TILE));
    if(T.mode==='front'&&camping&&(hp<A.hurt||down)&&g.time-(T.regroupEnd||-99)>A.regroupCool){ T.mode='regroup'; T.regAt=g.time; ksPlace(g); say('They are sitting out there, waiting for us to bleed. Step back out of their reach. Medic, patch them up.'); }
    else if(T.mode==='regroup'&&((!down&&fighters.every(u=>u.hp>=u.maxHp*A.healed))||!camping||g.time-T.regAt>A.regroupMax)){ T.mode='front'; T.regroupEnd=g.time; T.lineAt=g.time; T.lineL=L; ksPlace(g); if(camping) say('Patched up. Back on the line!'); } }
  else if(T.mode!=='ring'&&g.time-T.seen>A.calm){ T.mode='ring'; T.K=null; ksPlace(g); } }
/* every half second: newcomers join, the tactics, the raids, the rebuilding, and a man done fighting (healing, mending) goes back to his place */
function ksTick(g){ if(!g.vars.ksSites||g.time<(g.vars.ksT||0)) return; g.vars.ksT=g.time+0.5; const C=ksMid(g);
  const fresh=g.corps().filter(u=>!u.ksRing&&!u.ksRaid&&!u.downed); if(fresh.length) ksJoin(g,fresh);   /* trained at the Command Post, or brought in */
  ksRaidTick(g); ksTac(g); ksRebuild(g);
  const us=ksMen(); if(us.length!==g.vars.ksN){ ksPlace(g); return; }   /* someone fell or got back up: the ring closes up */
  for(const u of us){ const p=u.ringAt; if(!p) continue;
    if(u.target&&Math.hypot(u.x-C.x,u.y-C.y)>KS_CAMP.leash*TILE){ u.target=null; u.order={type:'move',x:p.x,y:p.y}; setPath(u,p.x,p.y); continue; }   /* too far from the camp: back, no shooting on the way */
    if(u.target||(u.order&&u.order.type!=='hold'&&u.order.type!=='amove')) continue;
    if(u.def.heal&&u.healTarget&&!u.healTarget.dead&&u.healTarget.hp<u.healTarget.maxHp&&(!u.order||u.order.type==='hold')) continue;
    const d=Math.hypot(u.x-p.x,u.y-p.y);
    if(d>TILE*0.6){ if(!u.order||u.order.type==='hold'){ u.order={type:'amove',x:p.x,y:p.y}; setPath(u,p.x,p.y); } }
    else if(!u.order){ u.order={type:'hold'}; u.path=null; } } }
/* rebuilding: see KS_REBUILD (the same as Needle and Thread's ntRebuild; a site carries ntSite, so the engine's own auto-repair leaves it alone) */
function ksRebuild(g){ const R=KS_REBUILD, sites=g.vars.ksSites; if(!sites) return;
  const at=s=>G.ents.find(e=>!e.dead&&e.kind==='building'&&e.type===s.type&&e.tx===s.tx&&e.ty===s.ty);
  const brood=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='swarm'&&!e.hidden&&e.def.speed>0);
  const safe=p=>!brood.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<=((c.def.range||0.7)+R.margin)*TILE);
  const engs=ksMen().filter(e=>e.def.builder);
  for(const u of engs){ const o=u.order, b=o&&o.type==='repair'?o.target:null, hit=g.time-(u.shotAt||-99)<R.hitFor;
    if(b&&b.ntSite&&!b.built){ if(hit||!safe(b)){ u.order=null; u.path=null; } continue; }   /* under attack: off the scaffolding, back to his place */
    if(b||hit||u.target) continue;
    const busy=new Set(engs.map(e=>e.order&&e.order.type==='repair'&&e.order.target).filter(Boolean));
    const todo=sites.map(s=>({s,b:at(s),p:{x:(s.tx+BUILDINGS[s.type].size/2)*TILE,y:(s.ty+BUILDINGS[s.type].size/2)*TILE}}))
      .filter(t=>(!t.b||(t.b.ntSite&&!t.b.built&&!busy.has(t.b)))&&safe(t.p)&&(t.b||ntSiteFree(t.s)))
      .sort((a,c)=>(a.s.type==='sentry'?0:1)-(c.s.type==='sentry'?0:1)||Math.hypot(a.p.x-u.x,a.p.y-u.y)-Math.hypot(c.p.x-u.x,c.p.y-u.y));
    const t=todo[0]; if(!t) continue;
    let site=t.b; if(!site){ site=makeBuilding(t.s.type,'corps',t.s.tx,t.s.ty,false); site.ntSite=true;
      for(const e of G.ents) if(e.kind==='unit'&&!e.dead&&!walkableP(e.x,e.y)){ const f=nearestWalkable(Math.floor(e.x/TILE),Math.floor(e.y/TILE)); if(f){ e.x=(f.x+.5)*TILE; e.y=(f.y+.5)*TILE; } } }   /* nobody stuck inside it */
    u.target=null; u.order={type:'repair',target:site}; u.path=null;
    if(!g.vars.ksSaidRebuild){ g.vars.ksSaidRebuild=true; g.brood_say('Their builder raises the turning guns again. Take him first, or we break that nest twice.'); } } }
/* a raid: a Pyro and the fighters of the ring nearest the hive (and a Medic, with three or more) leave the ring and march on it in a wedge */
function ksRaid(g,n,who,text){ const C=ksMid(g), h=hives().sort((a,b)=>dist(a,C)-dist(b,C))[0]; if(!h) return;
  const team=ksMen().filter(u=>!u.def.builder&&!u.def.heal).sort((a,b)=>(a.type==='pyro'?0:1)-(b.type==='pyro'?0:1)||dist(a,h)-dist(b,h)).slice(0,g.n(n));   /* the Pyro goes along when there is one: he burns the hive and walks at the tip */ const med=ksMen().find(u=>u.def.heal); if(med&&team.length>=3) team.push(med);
  if(!team.length) return; const R={hive:h,who,n:team.length,hp0:team.reduce((a,u)=>a+u.maxHp,0),state:'muster',at:g.time};
  (g.vars.ksRaids=g.vars.ksRaids||[]).push(R);
  const f={shape:'wedge',dir:Math.atan2(h.y-C.y,h.x-C.x),gap:1,seq:0};
  for(const u of team){ u.ksRaid=R; u.ringAt=null; u.ksLine=false; u.leash=null; u.stance=null; u.home=null; u.order=null; u.target=null; u.path=null; u.formation=f; u.slot=null; }
  ksPlace(g); g.say(who,text);
  const a=f.dir, r=(Math.max(KS_CAMP.r,ksMen().length*KS_CAMP.perMan/(2*Math.PI))+KS_RAID.musterOut)*TILE; let mx=C.x+Math.cos(a)*r, my=C.y+Math.sin(a)*r;   /* form the wedge first, just outside the ring */
  if(!walkableP(mx,my)){ const t=nearestWalkable(Math.floor(mx/TILE),Math.floor(my/TILE)); if(t){ mx=(t.x+.5)*TILE; my=(t.y+.5)*TILE; } }
  if(team.length>1) marchTo(team,mx,my,'move',a); else R.state='out';
  if(R.state==='out') ksRaidGo(team,h);
  g.brood_say('They are coming for a nest. Call the brood home.'); G.pings.push({x:h.x,y:h.y,t:0,col:'#ff5a4f'}); }
/* march on the hive in the wedge (attack-move), or attack it at once when it is already within reach */
function ksRaidGo(us,h){ if(!us.length) return; const tx=Math.floor(h.x/TILE), ty=Math.floor(h.y/TILE);
  if(us.length>1&&sharedForm(us)){ if(!attackInFormation(us,h,'amove')) engageTarget(us,h); }   /* false: already within reach (or no way round): attack from here */
  else corpsMove(us,(tx+.5)*TILE,(ty+.5)*TILE,'amove'); }
function ksRaidTick(g){ const C=ksMid(g), list=g.vars.ksRaids||[];
  for(const R of [...list]){ const ms=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.ksRaid===R), up=ms.filter(u=>!u.downed);
    if(!ms.length){ list.splice(list.indexOf(R),1); continue; }
    if(R.state==='muster'){ const f=up.length&&up[0].formation, ready=up.every(u=>{ const p=formationSpot(u); return !p||Math.hypot(u.x-p.x,u.y-p.y)<TILE*0.8; });
      if((ready&&!(f&&f.march&&!f.march.done))||g.time-R.at>KS_RAID.muster||!alive(R.hive)){ R.state='out'; const sq=up.filter(u=>u.formation===f); if(alive(R.hive)) ksRaidGo(sq.length>1?sq:up,R.hive); }   /* formed up: off to the hive */
      continue; }
    if(R.state==='out'){ const left=up.reduce((a,u)=>a+u.hp,0)/R.hp0;
      if(!alive(R.hive)){ R.state='home'; g.say(R.who,'The nest is burning. Fall back to the Command Post.'); g.brood_say('They burned a nest and turn for home. The walk back is long.'); ksRaidHome(up,C); }
      else if(left<KS_RAID.abort){ R.state='home'; g.say(R.who,'Too many of them! Break off, back to the Command Post!'); g.brood_say('They break and run for their hard nest. Run them down.'); ksRaidHome(up,C); }
      else { const f=up.length&&up[0].formation, idle=up.every(u=>!u.target&&(!u.order||u.order.type==='hold'||u.order.type==='support'));   /* stopped to fight on the way: on for the hive */
        if(idle&&!(f&&f.march)&&g.time-(R.idleAt=R.idleAt??g.time)>=KS_RAID.resume){ R.idleAt=null; const sq=up.filter(u=>u.formation===f); ksRaidGo(sq.length>1?sq:up,R.hive); }
        else if(!idle) R.idleAt=null; }
      continue; }
    for(const u of up){ if(Math.hypot(u.x-C.x,u.y-C.y)<KS_RAID.homeR*TILE&&!u.target){ u.order=null; u.path=null; ksJoin(g,[u]); continue; }   /* home: back into the ring */
      if(!u.target&&(!u.order||u.order.type==='hold'||u.order.type==='support')&&!(u.formation&&u.formation.march)){ u.formation=null; u.slot=null; u.order={type:'amove',x:C.x,y:C.y}; setPath(u,C.x,C.y); } } } }   /* a straggler, or one back on his feet: home on his own */
function ksRaidHome(up,C){ if(!up.length) return; const f=up[0].formation;
  if(up.length>1&&f&&up.every(u=>u.formation===f)){ for(const u of up){ if(u.order&&u.order.type==='support') u.order=null; } f.engaged=null; marchTo(up,C.x,C.y,'amove'); }
  else for(const u of up){ u.formation=null; u.slot=null; u.order={type:'amove',x:C.x,y:C.y}; setPath(u,C.x,C.y); } }
