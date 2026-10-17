'use strict';
/* ---------- 2c. game state ---------- */
let G=null;
/* Campaign progress: per mission the best difficulty it was won on, the best time and the date. */
const DIFF_RANK={ easy:1, normal:2, hard:3 };
function loadProgress(){ const p=store.get('hc-progress',{}); p.results=p.results||{};
  for(const id of p.done||[]) if(!p.results[id]) p.results[id]={ diff:'normal', time:null, at:null };   // older saves
  delete p.done; return p; }
function isDone(id){ return !!ui.progress.results[id]; }
function recordWin(id,diff,time){ const r=ui.progress.results[id];
  if(!r || DIFF_RANK[diff]>DIFF_RANK[r.diff]) ui.progress.results[id]={ diff, time, at:Date.now() };
  else if(diff===r.diff && (r.time==null||time<r.time)) r.time=time;
  store.set('hc-progress',ui.progress); }
const ui={ mode:'menu', mouse:{x:0,y:0,wx:0,wy:0,inWin:false}, drag:null, pan:null, placing:null, amove:false, keys:{}, dpr:1, vw:0, vh:0, hudH:0,
  diff:store.get('hc-diff','normal'), follow:store.get('hc-follow',true), tracker:store.get('hc-tracker',true), voices:store.get('hc-voices',true), voiceVol:store.get('hc-voice-vol',0.3), zombie:store.get('hc-zombie',false), skMap:'kappa', progress:loadProgress(), roster:null /* loaded at boot (23-main-loop.js) */, lastClick:{id:0,t:0}, menuCam:{x:0,y:0} };
let NEXT_ID=1;

function newGame(mission, diffKey){
  const map=loadMap(mission.map);
  const N=map.w*map.h;
  G={ mission, map, diff:DIFFICULTY[diffKey]||DIFFICULTY.normal, diffKey, ents:[], fx:[], shots:[], decals:[], time:0, speed:1,
      salvage:mission.start.salvage||0, block:new Uint8Array(N), vis:new Uint8Array(N), seen:new Uint8Array(N), reveals:[],
      sel:[], groups:{}, objectives:[], triggers:mission.triggers.map(t=>({...t,fired:false})), vars:{}, timer:null,
      stats:{ kills:0, lost:0, crates:0, cocoons:0, built:0, trained:0, hives:0 }, msgs:[], over:null, paused:false,
      cam:{x:0,y:0}, pings:[], pools:[], flareList:[], barks:[], flares:(mission.flares!==undefined?mission.flares:mission.dark?SQUAD.flare.perDarkMission:SQUAD.flare.perMission), markers:[], alert:null, alertT:0, trigT:0, fogT:0, hudT:0, selDirty:true, objDirty:true, msgDirty:true,
      swarm:{ cfg:mission.swarm, biomass:mission.swarm.biomass||0, nextWave:mission.swarm.waves?mission.swarm.waves.first*(DIFFICULTY[diffKey]||DIFFICULTY.normal).interval:Infinity, waveN:0 } };
  for(let i=0;i<N;i++) G.block[i]=map.walk[i]?0:1;
  initPathBuffers();
  const st=mission.start;
  for(const [type,at] of st.buildings||[]){ const p=pt(at); const s=BUILDINGS[type].size; makeBuilding(type,'corps',p.x-Math.floor(s/2),p.y-Math.floor(s/2),true); }
  for(const [at,label] of st.uplinks||[]){ const p=pt(at); const u=makeBuilding('uplink','corps',p.x-1,p.y-1,true); u.invuln=true; u.r=TILE; u.label=label; u.cap=0; u.owned=false; u.point=at; }
  if(mission.landingZone){ const L=mission.landingZone; const lz=makeBuilding('lz','corps',L.tx,L.ty,true); lz.flight=null; lz.invuln=true; lz.r=TILE*1.5; }
  for(const at of st.hives||[]){ const p=pt(at); if(!p) continue; const h=makeBuilding('hive','swarm',p.x-1,p.y-1,true); h.spawnT=rand(2,6); h.hp=h.maxHp=BUILDINGS.hive.hp*(st.hiveHp||1); }
  G.reserve=[]; G.deployedIds=new Set();
  for(const [type,at,n,opt] of st.units||[]) spawnAt(type,'corps',at,n).forEach(u=>{ u.home={x:u.x,y:u.y}; if(opt&&opt.carry) u.carry={type:opt.carry,hp:BUILDINGS[opt.carry].hp}; });
  for(const [type,at,n] of st.swarmUnits||[]) spawnAt(type,'swarm',at,n).forEach(u=>{ u.role='guard'; u.guardAt={x:u.x,y:u.y}; u.order={type:'guard',x:u.x,y:u.y,wait:rand(0,4)}; });
  for(const w of map.wild) spawnAt('grazer','wild',w,2).forEach(u=>u.home={x:u.x,y:u.y});
  for(const c of map.crates) G.ents.push({ id:NEXT_ID++, kind:'crate', x:(c.x+.5)*TILE, y:(c.y+.5)*TILE, value:40+Math.floor(Math.random()*3)*10, r:8, faction:'none' });
  for(const o of mission.objectives) G.objectives.push({ ...o, state:'active' });
  const cp=pt(st.camera||'P'); centerOn((cp.x+.5)*TILE,(cp.y+.5)*TILE);
  deployRoster();
  G.api=makeApi();
  computeFog();
}
function pt(at){ if(!at) return null; if(typeof at==='object') return at; const arr=G.map.points[at]; return arr?arr[0]:null; }
function ptWorld(at){ const p=pt(at); return p?{x:(p.x+.5)*TILE,y:(p.y+.5)*TILE}:null; }
