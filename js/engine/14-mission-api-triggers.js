'use strict';
/* ---------- 2m. mission API & triggers ---------- */
function makeApi(){
  const objective=id=>G.objectives.find(o=>o.id===id);
  return {
    get time(){ return G.time; }, get vars(){ return G.vars; },
    say:(who,text)=>say(who,text),
    addObjective(id,text,optional){ if(!objective(id)){ G.objectives.push({id,text,optional,state:'active'}); G.objDirty=true; say('Objective',text,'sys'); } },
    complete(id){ const o=objective(id); if(o&&o.state==='active'){ o.state='done'; G.objDirty=true; } },
    fail(id){ const o=objective(id); if(o&&o.state==='active'){ o.state='failed'; G.objDirty=true; } },
    setText(id,text){ const o=objective(id); if(o&&o.text!==text){ o.text=text; G.objDirty=true; } },
    isDone:id=>objective(id)?.state==='done',
    spawn(type,at,n=1,opt={}){ const f=opt.faction||UNITS[type].faction; const us=spawnAt(type,f,at,n);
      for(const u of us){ if(f==='corps') fromReserve(u); if(opt.prey) u.prey=opt.prey; if(opt.truce) u.truce=opt.truce; if(f==='swarm'){ u.role=opt.order||'hunt'; if(u.role==='boss'||u.role==='guard') u.guardAt={x:u.x,y:u.y}; } else u.home={x:u.x,y:u.y}; if(f==='corps') G.fx.push({k:'boom',x:u.x,y:u.y,t:0.3,max:0.3,r:18,col:'#ffe2a8'}); }
      return us; },
    alive:list=>(list||[]).filter(e=>!e.dead).length,
    near(faction,at,radius){ const p=ptWorld(at); if(!p) return 0; return G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction===faction&&Math.hypot(e.x-p.x,e.y-p.y)<=radius*TILE).length; },
    has:type=>G.ents.filter(e=>!e.dead&&e.faction==='corps'&&e.type===type&&(e.kind!=='building'||e.built)).length,
    hives:()=>hives().length,
    stat:name=>G.stats[name]||0,
    reveal(at,radius=4,seconds=6){ const p=ptWorld(at); if(p) G.reveals.push({x:p.x,y:p.y,r:radius,until:G.time+seconds}); },
    ping(at){ const p=ptWorld(at); if(p) G.pings.push({x:p.x,y:p.y,t:0,col:'#ffb347'}); },
    marker(id,at,label){ const p=ptWorld(at); if(!p) return; G.markers=G.markers.filter(m=>m.id!==id); G.markers.push({id,x:p.x,y:p.y,label}); },
    unmark(id){ G.markers=G.markers.filter(m=>m.id!==id); },
    give(n){ G.salvage+=n; },
    /* wall: seal tiles with living membrane (kind 'membrane', default) or a station blast door (kind 'door'). Radius 0 = one tile. */
    wall(at,radius,tag,kind='membrane'){ const p=pt(at); if(!p) return; const R2=radius*radius; for(let y=p.y-Math.ceil(radius);y<=p.y+Math.ceil(radius);y++) for(let x=p.x-Math.ceil(radius);x<=p.x+Math.ceil(radius);x++){
        if((x-p.x)**2+(y-p.y)**2>R2||!walkableT(x,y)) continue; const m=makeBuilding(kind,kind==='door'?'corps':'swarm',x,y,true); m.tag=tag; m.invuln=true; if(kind==='door') G.stats.built--; } },
    /* weakenWall: the membrane stays but can now be destroyed (optionally with new hp per tile). walls(tag): tiles still standing. */
    weakenWall(tag,hp){ for(const e of G.ents) if(e.type==='membrane'&&e.tag===tag&&!e.dead){ e.invuln=false; if(hp){ e.hp=e.maxHp=hp; } } },
    walls:tag=>G.ents.filter(e=>e.type==='membrane'&&e.tag===tag&&!e.dead).length,
    /* airdrop: the dropship flies cargo to the mission's Landing Zone, e.g. g.airdrop([['trooper',2],['pyro',1]], 15). */
    /* airdrop: optional rallyAt = point the new troops attack-move to after landing (e.g. to join the squad). */
    airdrop(list,delay=15,rallyAt){ const lz=G.ents.find(e=>!e.dead&&e.def&&e.def.reinforce); if(!lz) return;
      const cargo=[]; for(const [type,n=1] of list) for(let i=0;i<n;i++) cargo.push(type);
      if(lz.flight) lz.flight.cargo.push(...cargo); else lz.flight={ t:Math.max(5,delay), total:Math.max(5,delay), cargo };
      if(rallyAt) lz.flight.rally=ptWorld(rallyAt); G.selDirty=true; },
    /* troops(): living Corps soldiers on the map (all of them, wherever they are). */
    troops:()=>G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps').length,
    openWall(tag){ for(const e of G.ents) if((e.type==='membrane'||e.type==='door')&&e.tag===tag&&!e.dead){
        if(e.type==='door'){ e.dead=true; e.hp=0; setBlock(e,0); for(let i=0;i<8;i++) G.fx.push({k:'spark',x:e.x+rand(-12,12),y:e.y,vx:rand(-50,50),vy:rand(-60,0),t:0.5,max:0.5,col:'#ffd23f'}); SFX.play('ack',e.x,e.y); }
        else { e.invuln=false; kill(e,null); } } },
    swarmCount:()=>swarmCount(),
    diffBudget:()=>G.diff.budget,
    diffInterval:()=>G.diff.interval,
    uplinks:()=>G.ents.filter(e=>!e.dead&&e.def&&e.def.capture&&e.owned).length,
    uplinkOwned:at=>G.ents.some(e=>!e.dead&&e.def&&e.def.capture&&e.point===at&&e.owned),
    hiveAt(at){ const w=ptWorld(at); return !!w && hives().some(h=>dist(h,w)<2*TILE); },
    boss(u,title){ G.boss=u; G.bossTitle=title||u.def.name; },
    where:at=>ptWorld(at),
    wave:(budget,aim)=>launchWave(budget*G.diff.budget, typeof aim==='string'?ptWorld(aim):aim),
    clearTimer(){ G.timer=null; },
    setTimer(seconds,label){ G.timer={end:G.time+seconds,label}; },
    timerLeft:()=>G.timer?Math.max(0,G.timer.end-G.time):Infinity,
    win:text=>endGame(true,text), lose:text=>endGame(false,text)
  };
}
function runTriggers(){
  for(const t of G.triggers){ if(G.over) return; if(t.fired && !t.repeat) continue;
    let ok=false; try{ ok=t.when(G.api); }catch(e){ console.error('Trigger condition error',e); t.fired=true; continue; }
    if(ok){ t.fired=true; try{ t.do(G.api); }catch(e){ console.error('Trigger action error',e); } } }
  // default defeat: nothing left
  if(!G.over && !G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground)) endGame(false,'Your forces have been wiped out.');
}
function endGame(win,text){
  if(G.over) return; G.over={win,text,at:performance.now()}; SFX.play(win?'win':'lose');
  if(win) settleRoster();
  if(win && G.mission.id!=='skirmish'){ G.prevBest=ui.progress.results[G.mission.id]?{...ui.progress.results[G.mission.id]}:null; recordWin(G.mission.id,G.diffKey,Math.round(G.time)); }
  ui.placing=null; ui.amove=false;
  setTimeout(()=>{ if(G&&G.over) showEnd(); },1800);
}
