'use strict';
/* ---------- 2y. relics: hidden things to find (js/content/relics.js) ----------
   They lie on the map as 'crate'-kind entities with relic set (so combat, selection and the Swarm ignore them).
   An item is picked up by the first soldier who walks over it; an ancient egg must be held (see EGG_RELIC).
   Found relics are kept in hc-relics: { id: { at, mission } }. A found item does not appear again; an ancient egg does,
   in every new game of its mission (taking it again changes nothing on the trophy wall). */
const EGG_RELIC = { secure:5, hatch:15, reach:1.7, clear:3.5, wakeMin:150, wakeMax:300, party:3, again:90 };
function relicsFound(){ return store.get('hc-relics',{}); }
function relicFound(id){ return !!relicsFound()[id]; }
function spawnRelics(m){ if(!m||m.side==='swarm'||m.training) return;
  for(const r of RELICS){ if(r.mission!==m.id||(r.kind!=='egg'&&relicFound(r.id))) continue;   /* found items stay gone; ancient eggs are always back */ const p=r.at; if(!walkableT(p.x,p.y)) continue;
    G.ents.push({ id:NEXT_ID++, kind:'crate', relic:r.id, egg:r.kind==='egg', x:(p.x+.5)*TILE, y:(p.y+.5)*TILE, r:r.kind==='egg'?11:8, faction:'none', value:0,
      secure:0, hatch:0, wakeAt:r.kind==='egg'?rand(EGG_RELIC.wakeMin,EGG_RELIC.wakeMax)*(G.diff.interval||1):0 }); } }
function relicDef(id){ return RELICS.find(r=>r.id===id); }
function collectRelic(c,by){ const r=relicDef(c.relic); if(!r) return; c.dead=true;
  const all=relicsFound(), fresh=!all[r.id]; if(fresh){ all[r.id]={ at:Date.now(), mission:r.mission }; store.set('hc-relics',all); }
  if(fresh) (G.relicsGot=G.relicsGot||[]).push(r.id);
  SFX.play('pickup'); SFX.play('ready'); G.fx.push({k:'text',x:c.x,y:c.y-18,t:1.8,max:1.8,txt:r.kind==='egg'?'ANCIENT EGG':'RELIC',col:'#ffd23f'});
  G.pings.push({x:c.x,y:c.y,t:0,col:'#ffd23f'});
  const n=Object.keys(all).length; toast(fresh?`Relic found: ${r.name} (${n}/${RELICS.length}). Read it in Intel, tab Relics.`:`${r.name} secured again. It is already on your trophy wall.`,true);
  say(r.kind==='egg'?'Dr. Maas':'Field log', r.kind==='egg'?`We have it. ${r.text}`:`${r.name}. ${r.text}`, r.kind==='egg'?'':'sys'); }
/* every tick: items are picked up, ancient eggs are held by one side or the other */
function relicTick(dt){
  for(const c of G.ents){ if(c.dead||!c.relic) continue;
    if(!c.egg){ for(const u of G.ents) if(u.kind==='unit'&&!u.dead&&!u.downed&&u.faction==='corps'&&!u.def.escort&&dist(u,c)<u.r+14){ collectRelic(c,u); break; } continue; }
    eggRelicTick(c,dt); } }
function eggRelicTick(c,dt){ const R=EGG_RELIC, near=(f,r)=>G.ents.some(u=>u.kind==='unit'&&!u.dead&&!u.downed&&u.faction===f&&!u.def.escort&&!u.def.passive&&dist(u,c)<r*TILE);
  const corpsOn=near('corps',R.reach), corpsAround=near('corps',R.clear), swarmOn=near('swarm',R.reach), swarmAround=near('swarm',R.clear);
  if(!c.seenSaid&&G.side==='corps'&&G.vis[Math.floor(c.y/TILE)*G.map.w+Math.floor(c.x/TILE)]){ c.seenSaid=true;
    say('Dr. Maas','That egg... it is old. Older than the colony, older than anything here. If the Swarm gets to it, it will wake. Put a soldier on it and keep them off: we are taking it.','alert'); G.pings.push({x:c.x,y:c.y,t:0,col:'#ffd23f'}); }
  if(corpsOn&&!swarmAround){ c.secure=Math.min(1,c.secure+dt/R.secure); c.hatch=Math.max(0,c.hatch-dt/R.hatch); if(c.secure>=1){ collectRelic(c); return; } }
  else if(swarmOn&&!corpsAround){ c.hatch=Math.min(1,c.hatch+dt/R.hatch); c.secure=Math.max(0,c.secure-dt/R.secure);
    if(!c.hatchSaid&&c.hatch>0.15&&G.side==='corps'){ c.hatchSaid=true; say('Alert','The Swarm is at the old egg. It is waking!','alert'); G.pings.push({x:c.x,y:c.y,t:0,col:'#ff5a4f'}); }
    if(c.hatch>=1&&hives().length+rooting()<hiveMax()) eggWakes(c); }
  else { c.secure=Math.max(0,c.secure-dt/(R.secure*3)); }
  /* the Swarm comes for it: a few Drones from the nearest hive, again later if they die */
  if(hives().length&&G.time>=c.wakeAt&&!G.ents.some(u=>!u.dead&&u.eggRun===c.id)){ c.wakeAt=G.time+R.again*(G.diff.interval||1);
    const h=nearestOf(c,e=>e.type==='hive'&&!e.dead); if(!h) return;
    for(let i=0;i<R.party;i++){ const u=spawnNearBuilding('drone','swarm',h); if(!u) break; u.role='eggrun'; u.eggRun=c.id; u.order={type:'move',x:c.x+rand(-12,12),y:c.y+rand(-12,12)}; setPath(u,u.order.x,u.order.y); }
    if(G.side==='corps'&&!c.runSaid){ c.runSaid=true; say('Sgt. Kessler','Movement out of the nest, and it is not coming for us. They are going for the old egg!','alert'); } } }
/* a Drone sent for the egg: walks to it and holds it, fights what comes close */
function eggRunThink(u){ const c=G.ents.find(e=>e.id===u.eggRun&&!e.dead); if(!c){ u.role='hunt'; u.eggRun=null; return; }
  if(dist(u,c)>EGG_RELIC.reach*TILE*0.7){ if(!u.target&&(!u.order||u.order.type!=='move')){ u.order={type:'move',x:c.x+rand(-10,10),y:c.y+rand(-10,10)}; setPath(u,u.order.x,u.order.y); } }
  else if(!u.target&&(!u.order||u.order.type!=='hold')){ u.order={type:'hold'}; u.path=null; } }
function eggWakes(c){ c.dead=true; const tx=Math.floor(c.x/TILE), ty=Math.floor(c.y/TILE), f=nearestWalkable(tx,ty)||{x:tx,y:ty};
  const h=makeBuilding('hive','swarm',f.x-1,f.y-1,true); h.maxHp=BUILDINGS.hive.hp*HUSK.hiveHp*(G.diff.hiveHp||1); h.hp=h.maxHp*0.6; h.spawnT=5; h.cfg={ guardMax:HUSK.guardMax, offshoot:true }; h.offshoot=true; h.creepR=1;
  for(const e of G.ents){ if(e.dead||e.kind!=='unit') continue; const x=Math.floor(e.x/TILE), y=Math.floor(e.y/TILE); if(x>=h.tx&&x<h.tx+3&&y>=h.ty&&y<h.ty+3){ const w=nearestWalkable(x,y); if(w){ e.x=(w.x+.5)*TILE; e.y=(w.y+.5)*TILE; e.path=null; } } }
  G.fx.push({k:'boom',x:h.x,y:h.y,t:0.7,max:0.7,r:48,col:'#ffd23f'}); addDecal(h.x,h.y,30,'rgba(70,30,90,.5)'); G.pings.push({x:h.x,y:h.y,t:0,col:'#a6ff4a'}); SFX.play('horn');
  say('Alert','The ancient egg has woken. A new hive is growing where it lay.','alert'); G.objDirty=true; }
/* drawing: an item glints now and then; an egg shows who is holding it */
function drawRelic(c,now){
  if(c.egg){ const a=ARTC[relicArt(relicDef(c.relic))], s=2; ctx.drawImage(a,Math.round(c.x-a.width),Math.round(c.y-a.height*s+6),a.width*s,a.height*s);
    const pulse=0.5+0.5*Math.sin(now/1000*Math.PI*2/ (c.hatch>0?0.5:4));
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,180,60,${0.08+0.12*pulse})`; ctx.beginPath(); ctx.ellipse(c.x,c.y-8,16,20,0,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';
    for(const [v,col] of [[c.secure,'#ffd23f'],[c.hatch,'#a6ff4a']]) if(v>0){ ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(c.x,c.y-8,col==='#ffd23f'?20:24,-Math.PI/2,-Math.PI/2+Math.PI*2*v); ctx.stroke(); }
    return; }
  const a=ARTC[relicArt(relicDef(c.relic))]; ctx.drawImage(a,Math.round(c.x-a.width),Math.round(c.y-a.height-2+Math.sin(now/400+c.id)*1.5),a.width*2,a.height*2);
  const t=(now/1000+c.id*0.37)%3; if(t<0.35){ const k=1-Math.abs(t-0.17)/0.17; ctx.fillStyle=`rgba(255,240,180,${k})`; ctx.fillRect(Math.round(c.x+4),Math.round(c.y-16),2,2); ctx.fillRect(Math.round(c.x+1),Math.round(c.y-15),8,1); ctx.fillRect(Math.round(c.x+5),Math.round(c.y-19),1,8); }
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(120,230,255,${0.12+0.08*Math.sin(now/300+c.id)})`; ctx.beginPath(); ctx.arc(c.x,c.y-6,13,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
