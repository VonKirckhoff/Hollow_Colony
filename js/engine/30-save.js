'use strict';
/* ---------- 2z. save and continue a mission ----------
   Pause menu: "Save game" writes the whole running mission to this browser (hc-save, one slot); the main menu then shows
   "Continue" with the mission, its clock and the date. Loading starts the mission fresh and then puts every saved value back.
   How: the game state G is written as a graph. Every entity is written once (in G.ents) and referred to by id elsewhere;
   objects that appear in more places (a formation shared by a squad, a group list) are written once and referred to;
   the game's own tables (UNITS, BUILDINGS, DIFFICULTY …) are written by name. Functions, canvases and passing effects are left out.
   Training missions cannot be saved (their steps live in code that keeps its own place). */
const SAVE_KEY='hc-save', SAVE_VERSION=1;
const SAVE_SKIP_G=new Set(['map','mission','api','triggers','tutSteps','tutHL','fx','shots','ents']);
const SAVE_SKIP_ENT=new Set(['path']);
function saveStatics(){ const m=new Map();
  for(const [k,v] of Object.entries(UNITS)) m.set(v,'U:'+k); for(const [k,v] of Object.entries(BUILDINGS)) m.set(v,'B:'+k);
  for(const [k,v] of Object.entries(DIFFICULTY)) m.set(v,'D:'+k); for(const [k,v] of Object.entries(SWARM_DIFF)) m.set(v,'SD:'+k);
  return m; }
function staticOf(tok){ const [a,b]=tok.split(':'); return a==='U'?UNITS[b]:a==='B'?BUILDINGS[b]:a==='D'?DIFFICULTY[b]:a==='SD'?SWARM_DIFF[b]:null; }
function canSave(){ return !!G&&!G.over&&!G.mission.training; }
function encodeGame(){
  const statics=saveStatics(), ents=G.ents.filter(e=>!e.dead), entSet=new Set(ents), ids=new Map(); let n=0;
  const skipObj=v=>(typeof Node!=='undefined'&&v instanceof Node)||(typeof CanvasRenderingContext2D!=='undefined'&&v instanceof CanvasRenderingContext2D)||(typeof AudioNode!=='undefined'&&v instanceof AudioNode)||(typeof ImageData!=='undefined'&&v instanceof ImageData);
  const enc=(v,top,skip)=>{
    if(typeof v==='function'||v===undefined) return undefined;
    if(typeof v==='number'){ return Number.isFinite(v)?v:{__n:v>0?'Inf':v<0?'-Inf':'NaN'}; }
    if(v===null||typeof v!=='object') return v;
    if(statics.has(v)) return {__s:statics.get(v)};
    if(ArrayBuffer.isView(v)) return {__ta:v.constructor.name,d:Array.from(v)};
    if(skipObj(v)) return undefined;
    if(!top&&entSet.has(v)) return {__e:v.id};
    if(v.dead===true&&v.kind&&v.id!=null&&!top) return {__d:{id:v.id,kind:v.kind,type:v.type,faction:v.faction,x:v.x,y:v.y}};   /* a dead entity still referred to somewhere: a small stand-in */
    if(ids.has(v)) return {__r:ids.get(v)};
    const id=++n; ids.set(v,id);
    if(v instanceof Set) return {__i:id,__set:[...v].map(x=>enc(x)).filter(x=>x!==undefined)};
    if(v instanceof Map) return {__i:id,__map:[...v].map(([k,x])=>[enc(k),enc(x)])};
    if(Array.isArray(v)) return {__i:id,__a:v.map(x=>{ const e=enc(x); return e===undefined?null:e; })};
    const out={__i:id}; for(const k of Object.keys(v)){ if(skip&&skip.has(k)) continue; const e=enc(v[k]); if(e!==undefined) out[k]=e; } return out; };
  const save={ v:SAVE_VERSION, at:Date.now(), missionId:G.mission.id, mapId:G.mission.map, title:G.mission.title, side:G.side, diffKey:G.diffKey, time:G.time, nextId:NEXT_ID };
  save.ents=ents.map(e=>enc(e,true,SAVE_SKIP_ENT));
  const g={}; for(const k of Object.keys(G)){ if(SAVE_SKIP_G.has(k)) continue; const e=enc(G[k]); if(e!==undefined) g[k]=e; } save.G=g;
  save.triggers=G.triggers.map(t=>{ const o={}; for(const [k,x] of Object.entries(t)) if(typeof x!=='function'){ const e=enc(x); if(e!==undefined) o[k]=e; } return o; });
  return save; }
function decodeGame(save){
  const refs=new Map(), entById=new Map(), deadById=new Map();
  for(const r of save.ents) entById.set(r.id,{});
  const dec=v=>{
    if(v===null||typeof v!=='object') return v;
    if(v.__n) return v.__n==='Inf'?Infinity:v.__n==='-Inf'?-Infinity:NaN;
    if(v.__s) return staticOf(v.__s);
    if(v.__e!=null) return entById.get(v.__e)||null;
    if(v.__d){ const d=v.__d; if(!deadById.has(d.id)) deadById.set(d.id,{...d,dead:true,hp:0,def:UNITS[d.type]||BUILDINGS[d.type]||{name:''}}); return deadById.get(d.id); }
    if(v.__r!=null) return refs.get(v.__r);
    if(v.__ta){ const C=window[v.__ta]||Array; return new C(v.d); }
    if(v.__set){ const s=new Set(); refs.set(v.__i,s); for(const x of v.__set) s.add(dec(x)); return s; }
    if(v.__map){ const m=new Map(); refs.set(v.__i,m); for(const [k,x] of v.__map) m.set(dec(k),dec(x)); return m; }
    if(v.__a){ const a=[]; refs.set(v.__i,a); for(const x of v.__a) a.push(dec(x)); return a; }
    const o={}; if(v.__i!=null) refs.set(v.__i,o); for(const k of Object.keys(v)) if(!k.startsWith('__')) o[k]=dec(v[k]); return o; };
  const ents=save.ents.map(r=>{ const o=entById.get(r.id); if(r.__i!=null) refs.set(r.__i,o); for(const k of Object.keys(r)) if(!k.startsWith('__')) o[k]=dec(r[k]); o.path=null; return o; });
  const g={}; for(const k of Object.keys(save.G)) g[k]=dec(save.G[k]);
  const triggers=save.triggers.map(t=>{ const o={}; for(const k of Object.keys(t)) o[k]=dec(t[k]); return o; });
  return { ents, g, triggers }; }
function findMission(save){ if(save.missionId==='skirmish') return skirmishMission(save.mapId);
  return [...MISSIONS,...(typeof SWARM_MISSIONS!=='undefined'?SWARM_MISSIONS:[])].find(m=>m.id===save.missionId)||null; }
function saveGame(){ if(!canSave()){ toast(G&&G.mission.training?'Training cannot be saved.':'Nothing to save.'); return false; }
  try{ const s=encodeGame(), txt=JSON.stringify(s); localStorage.setItem(SAVE_KEY,txt); refreshContinue(); toast(`Game saved: ${s.title}, ${fmtTime(s.time)}.`,true); SFX.play('ack'); return true; }
  catch(err){ console.error(err); toast('Could not save: the browser has no room left for it.'); return false; } }
function savedInfo(){ try{ const t=localStorage.getItem(SAVE_KEY); if(!t) return null; const s=JSON.parse(t); return s&&s.v===SAVE_VERSION?s:null; }catch(e){ return null; } }
function loadGame(){ const save=savedInfo(); if(!save){ toast('No saved game.'); return false; }
  const m=findMission(save); if(!m){ toast('The saved mission no longer exists.'); return false; }
  const keep=ui.diff; ui.diff=save.diffKey; startMission(m); ui.diff=keep;
  try{ const { ents, g, triggers }=decodeGame(save);
    const cfg=g.swarm&&g.swarm.cfg; for(const [k,v] of Object.entries(g)) G[k]=v;
    if(cfg&&G.mission.swarm){ for(const k of Object.keys(G.mission.swarm)) if(!(k in cfg)) delete G.mission.swarm[k]; Object.assign(G.mission.swarm,cfg); G.swarm.cfg=G.mission.swarm; }
    G.ents=ents; G.fx=[]; G.shots=[]; triggers.forEach((t,i)=>{ if(G.triggers[i]) Object.assign(G.triggers[i],t); });
    NEXT_ID=Math.max(NEXT_ID,save.nextId||0);
    G.paused=false; G.devPause=false; G.over=null; ui.mode='game'; $('#rd-badge').hidden=!G.realDeath;
    for(const e of G.ents){ if(e.kind==='unit'&&e.order&&(e.order.x!=null)&&!e.path) e.path=null; }
    computeFog(); G.selDirty=true; G.objDirty=true; G.msgDirty=true; $('#btn-speed').textContent=(G.speed||1)+'×'; if(typeof setupSideHud==='function') setupSideHud();
    toast(`Continuing ${G.mission.title} at ${fmtTime(G.time)}.`,true); return true; }
  catch(err){ console.error(err); toast('The saved game could not be loaded.'); goMenu('menu'); return false; } }
/* the main menu shows Continue only when there is a save */
function refreshContinue(){ const b=document.getElementById('m-continue'); if(!b) return; const s=savedInfo(); b.hidden=!s;
  if(s) b.innerHTML=`Continue <small>${s.title} · ${fmtTime(s.time)} · saved ${new Date(s.at).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}</small>`; }
document.getElementById('m-continue').addEventListener('click',()=>loadGame());
document.getElementById('p-save').addEventListener('click',()=>{ if(saveGame()) pause(false); });
refreshContinue();
