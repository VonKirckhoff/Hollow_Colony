'use strict';
/* ---------- 2x. dev mode: a see-through panel to look at and tune the game's numbers while you play ----------
   F9 (or the key left of 1, ² / `) opens and closes it during a mission. The game can keep running or be paused from the panel.
   Tabs: Live (what is happening now, plus a few tools), Mission (this mission's settings), Difficulty, Swarm, Squad, Units.
   Hover a name to see what it does. Every change works at once. "Save" keeps your changes in this browser (hc-dev-tune) and applies them every time the game
   loads; ↺ puts one value back, "Reset all" puts everything back. "Export" lists every change so you can copy it.
   Unit stats count for units that appear after the change; health is also adjusted on the units already on the map. */
const DEV_ROOTS = { DIFFICULTY, SWARM_DIFF, WAVES, HIVE_DEFENCE, TACTICS, CREEP, HUSK, EGG, MOLT, SWARM_PLAY, AVATAR, SQUAD, FORMATION, AURA, RISEN, VET_XP, UNITS, BUILDINGS };
const DEV_TABS = [
  { id:'live', name:'Live' }, { id:'mission', name:'Mission' },
  { id:'diff', name:'Difficulty', roots:['DIFFICULTY','SWARM_DIFF'] },
  { id:'swarm', name:'Swarm', roots:['WAVES','HIVE_DEFENCE','TACTICS','CREEP','HUSK','EGG','MOLT','SWARM_PLAY','AVATAR'] },
  { id:'squad', name:'Squad', roots:['SQUAD','FORMATION','AURA','RISEN','VET_XP'] },
  { id:'units', name:'Units' } ];
/* mission settings that may be missing in a mission but can be set (empty = the default) */
const DEV_MISSION_KEYS = ['start.salvage','flares','landingZone.max','landingZone.delay','limits.sentry',
  'swarm.biomass','swarm.rate','swarm.guardMax','swarm.guardEvery','swarm.aggro','swarm.aggroBrood','swarm.brood','swarm.hiveRage','swarm.maxAlive',
  'swarm.waves.first','swarm.waves.every','swarm.waves.budget','swarm.waves.growth','swarm.waves.growWaves','swarm.waves.max',
  'swarm.unlock.spitter','swarm.unlock.brute'];
const devClone=o=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v==='function'?undefined:v));
const DEV_ORIG={}; for(const [k,v] of Object.entries(DEV_ROOTS)) DEV_ORIG[k]=devClone(v);
const DEV_MORIG={};   /* per mission id: its settings as written in the mission file */
function devAllMissions(){ return [...MISSIONS,...(typeof SWARM_MISSIONS!=='undefined'?SWARM_MISSIONS:[]),...Object.values(typeof TRAINING!=='undefined'?TRAINING:{})]; }
function devMissionOrig(m){ return DEV_MORIG[m.id]||(DEV_MORIG[m.id]=devClone({ start:{salvage:m.start&&m.start.salvage}, flares:m.flares, landingZone:m.landingZone, limits:m.limits, swarm:m.swarm })); }
devAllMissions().forEach(devMissionOrig);
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?undefined:a[k],o);
function setP(o,p,v){ const ks=p.split('.'); let a=o; for(const k of ks.slice(0,-1)){ if(a[k]==null||typeof a[k]!=='object') a[k]={}; a=a[k]; } if(v===undefined) delete a[ks.at(-1)]; else a[ks.at(-1)]=v; }
/* a key is "ROOT|path" (ROOT a name in DEV_ROOTS) or "M:missionId|path" */
function devTarget(key){ const [root,path]=key.split('|');
  if(root.startsWith('M:')){ const id=root.slice(2), m=(G&&G.mission&&G.mission.id===id)?G.mission:devAllMissions().find(x=>x.id===id); return m?{obj:m,path,orig:getP(devMissionOrig(m),path)}:null; }
  const obj=DEV_ROOTS[root]; return obj?{obj,path,orig:getP(DEV_ORIG[root],path)}:null; }
function devGet(key){ const t=devTarget(key); return t?getP(t.obj,t.path):undefined; }
function devSet(key,v){ const t=devTarget(key); if(!t) return; const old=getP(t.obj,t.path); setP(t.obj,t.path,v);
  /* health: also the units already on the map */
  const um=/^UNITS\|(\w+)\.hp$/.exec(key); if(um&&G&&typeof old==='number'&&typeof v==='number'&&old>0) for(const e of G.ents) if(!e.dead&&e.type===um[1]&&e.maxHp){ const f=v/old; e.maxHp*=f; e.hp*=f; }
  const bm=/^BUILDINGS\|(\w+)\.hp$/.exec(key); if(bm&&G&&typeof old==='number'&&typeof v==='number'&&old>0) for(const e of G.ents) if(!e.dead&&e.type===bm[1]&&e.maxHp){ const f=v/old; e.maxHp*=f; e.hp*=f; }
  if(G) G.selDirty=true; }
function devChanged(key){ const t=devTarget(key); return t&&getP(t.obj,t.path)!==t.orig; }
/* saved changes: applied when the game loads, and again when a mission starts (a mission may be built fresh, like skirmish) */
function devSaved(){ return store.get('hc-dev-tune',{}); }
function devApplySaved(onlyMission){ for(const [k,v] of Object.entries(devSaved())){ if(onlyMission&&!k.startsWith('M:'+onlyMission.id+'|')) continue; if(!onlyMission&&k.startsWith('M:')&&!devAllMissions().some(m=>k.startsWith('M:'+m.id+'|'))) continue; try{ const t=devTarget(k); if(t) setP(t.obj,t.path,v); }catch(e){} } }
devApplySaved();
{ const sm=startMission; startMission=function(m){ devMissionOrig(m); devApplySaved(m); sm(m); devRender(); }; }

/* ---- the panel ---- */
const dev={ tab:store.get('hc-dev-tab','live'), unit:'trooper', alpha:0, collapsed:false };
const DEV_ALPHA=[0.78,0.5,0.93];
function devEl(){ let el=$('#dev'); if(el) return el;
  el=document.createElement('div'); el.id='dev'; el.hidden=true;
  el.innerHTML=`<div class="dv-head"><b class="dv-title" title="Click to fold the panel in or out">DEV ▾</b>
      <button type="button" data-dv="pause">Pause</button>
      <select data-dv="speed" title="Game speed">${[0.25,0.5,1,1.5,2,4].map(s=>`<option value="${s}">${s}×</option>`).join('')}</select>
      <span class="dv-sp"></span><button type="button" data-dv="alpha" title="See-through">◐</button><button type="button" data-dv="close" title="Close (F9)">✕</button></div>
    <div class="dv-fold"><div class="dv-tabs">${DEV_TABS.map(t=>`<button type="button" data-tab="${t.id}">${t.name}</button>`).join('')}</div>
    <div class="dv-body"></div>
    <div class="dv-help"><i>Hover a name to see what it does.</i></div>
    <div class="dv-foot"><span class="dv-status"></span><span class="dv-sp"></span><button type="button" data-dv="export">Export</button><button type="button" data-dv="resetall">Reset all</button><button type="button" data-dv="save" class="dv-save">Save</button></div>
    <textarea class="dv-export" hidden readonly></textarea></div>`;
  document.body.appendChild(el);
  el.addEventListener('pointerenter',()=>{ ui.overDev=true; }); el.addEventListener('pointerleave',()=>{ ui.overDev=false; });
  el.addEventListener('click',devClick); el.addEventListener('change',devChange);
  /* the explanation of a value shows in the panel itself, under the list (hover, or tap the name) */
  const showHelp=e=>{ const s=e.target.closest&&e.target.closest('[data-help]'); if(!s) return; const [t,b]=s.dataset.help.split('|'); el.querySelector('.dv-help').innerHTML=`<b>${t}</b> ${b}`; };
  el.addEventListener('pointerover',showHelp); el.addEventListener('focusin',e=>{ const r=e.target.closest('.dv-row'); if(r) showHelp({target:r.querySelector('[data-help]')||r}); });
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.tagName==='INPUT'){ e.target.blur(); } });
  return el; }
function devToggle(on){ const el=$('#dev'), open=on==null?!(el&&!el.hidden):!!on; ui.overDev=false;
  if(!open){ if(el) el.hidden=true; return; }   /* closing always works, also outside a mission */
  if(!G||ui.mode==='menu') return; devEl().hidden=false; store.set('hc-dev',true); devRender(); }
function devFmt(v){ return typeof v==='number'?String(Math.round(v*1000)/1000):''; }
function devRow(key,label){ const v=devGet(key), t=devTarget(key); if(!t) return ''; const ch=getP(t.obj,t.path)!==t.orig;
  const tip=` data-help="${key.split('|')[1]}|${(devHelp(key)||'No description yet.').replace(/"/g,'&quot;')} Default: ${t.orig==null?'not set (the game default)':devFmt(t.orig)||String(t.orig)}."`;
  if(typeof v==='boolean'||typeof t.orig==='boolean') return `<label class="dv-row ${ch?'ch':''}"><span${tip}>${label}</span><input type="checkbox" data-k="${key}" ${v?'checked':''}><button type="button" class="dv-rs" data-rs="${key}" title="Back to ${t.orig}">↺</button></label>`;
  return `<label class="dv-row ${ch?'ch':''}"><span${tip}>${label}</span><input type="number" step="any" data-k="${key}" value="${devFmt(v)}" placeholder="${t.orig==null?'default':devFmt(t.orig)}"><button type="button" class="dv-rs" data-rs="${key}" title="Back to ${t.orig==null?'default':devFmt(t.orig)}">↺</button></label>`; }
/* every number in an object, as rows grouped by the object they sit in */
function devLeaves(obj,pre='',out=[]){ for(const [k,v] of Object.entries(obj||{})){ const p=pre?pre+'.'+k:k;
    if(typeof v==='number'||typeof v==='boolean') out.push(p); else if(v&&typeof v==='object'&&!Array.isArray(v)&&pre.split('.').length<3) devLeaves(v,p,out); } return out; }
function devRootBlock(root,sub){ const obj=sub?getP(DEV_ROOTS[root],sub):DEV_ROOTS[root]; const ps=devLeaves(obj,sub||'');
  const groups=new Map(); for(const p of ps){ const g=p.split('.').slice(0,-1).join('.'); if(!groups.has(g)) groups.set(g,[]); groups.get(g).push(p); }
  return [...groups].map(([g,list])=>`${g&&g!==sub?`<div class="dv-sub">${g.slice(sub?sub.length+1:0)}</div>`:''}${list.map(p=>devRow(root+'|'+p,p.split('.').at(-1))).join('')}`).join(''); }
function devRender(){ const el=$('#dev'); if(!el||el.hidden||!G) return;
  el.style.setProperty('--dv-a',DEV_ALPHA[dev.alpha]); el.classList.toggle('collapsed',dev.collapsed);
  el.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===dev.tab));
  el.querySelector('[data-dv="pause"]').textContent=G.devPause?'▶ Run':'❚❚ Pause'; el.querySelector('[data-dv="pause"]').classList.toggle('on',!!G.devPause);
  el.querySelector('[data-dv="speed"]').value=String(G.speed);
  const body=el.querySelector('.dv-body'), T=DEV_TABS.find(t=>t.id===dev.tab)||DEV_TABS[0]; let h='';
  if(T.id==='live') h=devLive();
  else if(T.id==='mission'){ const m=G.mission, K='M:'+m.id+'|';
    h=`<div class="dv-note">${m.title} · <i>${m.id}</i>. Saved changes count for this mission only.</div>`+
      `<details open><summary>Start and Landing Zone</summary>${DEV_MISSION_KEYS.filter(k=>!k.startsWith('swarm.')).map(k=>devRow(K+k,k)).join('')}</details>`+
      (m.swarm?`<details open><summary>Swarm (this mission)</summary>${[...new Set([...DEV_MISSION_KEYS.filter(k=>k.startsWith('swarm.')&&(m.swarm.waves||!k.startsWith('swarm.waves'))),...devLeaves(m.swarm,'swarm')])].map(k=>devRow(K+k,k.slice(6))).join('')}</details>`:'')+
      `<div class="dv-note">Empty = the game's default. The waves only grow for growWaves waves; maxAlive is how many roam at once (× difficulty).</div>`; }
  else if(T.id==='units'){ const types=[...Object.keys(UNITS).map(k=>['UNITS',k]),...Object.keys(BUILDINGS).map(k=>['BUILDINGS',k])];
    const [root,k]=types.find(([r,t])=>t===dev.unit)||types[0];
    h=`<select data-dv="unit">${types.map(([r,t])=>`<option value="${t}" ${t===k?'selected':''}>${(r==='UNITS'?UNITS:BUILDINGS)[t].name} (${t})</option>`).join('')}</select>`+devRootBlock(root,k)+
      `<div class="dv-note">Health also changes for the ones already on the map; the rest counts for new ones. Distances in tiles, speed in pixels per second.</div>`; }
  else h=T.roots.map(r=>`<details ${r===T.roots[0]?'open':''}><summary>${r}</summary>${devRootBlock(r)}</details>`).join('');
  const open=[...body.querySelectorAll('details')].map(d=>d.open); body.innerHTML=h;
  if(open.length===body.querySelectorAll('details').length) body.querySelectorAll('details').forEach((d,i)=>d.open=open[i]);
  devStatus(); }
function devLive(){ const S=G.swarm, hs=hives().length, nx=S.nextWave-G.time;
  const info=[['Time',fmtTime(G.time)],['Difficulty',(G.diff&&G.diff.label)||G.diffKey],['Hives',hs+(S.hives0?` of ${S.hives0}`:'')],['Wave',S.waveN+(G.mission.swarm&&G.mission.swarm.waves?` · next in ${isFinite(nx)?Math.max(0,Math.ceil(nx))+' s':'–'}`:'')],
    ['Swarm roaming',`${roamCount()} / ${Math.round(swarmCap())}`],['Swarm total',swarmCount()],['Corps troops',`${typeof troopCount==='function'?troopCount():'?'}${troopCap()<Infinity?' / '+troopCap():''}`],['Next wave budget',G.mission.swarm&&G.mission.swarm.waves?(S.waveN++,(()=>{ const b=Math.round(waveBudget()); S.waveN--; return b; })()):'–']];
  return `<div class="dv-live">${info.map(([a,b])=>`<span>${a}</span><b data-live="${a}">${b}</b>`).join('')}</div>
    <label class="dv-row"><span>Salvage</span><input type="number" step="10" data-live-set="salvage" value="${Math.floor(G.salvage)}"></label>
    <label class="dv-row"><span>Biomass</span><input type="number" step="10" data-live-set="biomass" value="${Math.floor(S.biomass)}"></label>
    <label class="dv-row"><span>Flares</span><input type="number" step="1" data-live-set="flares" value="${G.flares}"></label>
    <label class="dv-row"><span>Next wave in (s)</span><input type="number" step="5" data-live-set="nextWave" value="${isFinite(nx)?Math.max(0,Math.ceil(nx)):''}"></label>
    <div class="dv-tools"><button type="button" data-dv="wave">Wave now</button><button type="button" data-dv="reveal" class="${G.devReveal?'on':''}">${G.devReveal?'Reveal map: on':'Reveal map: off'}</button><button type="button" data-dv="heal">Heal everyone</button>
      <button type="button" data-dv="clear">Kill all roaming Swarm</button><button type="button" data-dv="win">Win mission</button><button type="button" data-dv="lose">Lose mission</button></div>
    <div class="dv-note">These change only this game. The other tabs hold the settings you can save.</div>`; }
function devTick(){ const el=$('#dev'); if(!el||el.hidden) return; if(!G||ui.mode==='menu'){ devToggle(false); return; }   /* out of the mission: the panel goes away */
  if(dev.tab==='live'&&!el.contains(document.activeElement)) devRender(); else devStatus(); }
setInterval(devTick,500);
function devChangesNow(){ const out={};
  for(const r of Object.keys(DEV_ROOTS)) for(const p of devLeaves(DEV_ORIG[r]).concat(devLeaves(DEV_ROOTS[r]))){ const k=r+'|'+p; if(devChanged(k)) out[k]=devGet(k); }
  for(const m of devAllMissions().concat(G&&G.mission&&!devAllMissions().includes(G.mission)?[G.mission]:[])){ const K='M:'+m.id+'|';
    for(const p of new Set([...DEV_MISSION_KEYS,...devLeaves(m.swarm,'swarm')])) if(devChanged(K+p)) out[K+p]=devGet(K+p); }
  return out; }
function devStatus(){ const el=$('#dev'); if(!el) return; const now=devChangesNow(), saved=devSaved(), n=Object.keys(now).length;
  const unsaved=Object.keys(now).some(k=>saved[k]!==now[k])||Object.keys(saved).some(k=>!(k in now));
  el.querySelector('.dv-status').textContent=n?`${n} change${n>1?'s':''}${unsaved?' · not saved':' · saved'}`:'All default';
  el.querySelector('.dv-save').classList.toggle('on',unsaved); }
function devClick(e){ const b=e.target.closest('button,.dv-title'); if(!b) return; const el=$('#dev');
  if(b.classList.contains('dv-title')){ dev.collapsed=!dev.collapsed; b.textContent=dev.collapsed?'DEV ▸':'DEV ▾'; devRender(); return; }
  if(b.dataset.tab){ dev.tab=b.dataset.tab; store.set('hc-dev-tab',dev.tab); el.querySelector('.dv-export').hidden=true; devRender(); return; }
  if(b.dataset.rs){ e.preventDefault(); const t=devTarget(b.dataset.rs); devSet(b.dataset.rs,t.orig==null?undefined:t.orig); devRender(); return; }
  if(b.dataset.dv==='close'||!G){ devToggle(false); return; }
  const a=b.dataset.dv, S=G.swarm, api=G.api;
  if(a==='pause'){ G.devPause=!G.devPause; devRender(); }
  else if(a==='alpha'){ dev.alpha=(dev.alpha+1)%DEV_ALPHA.length; devRender(); }
  else if(a==='save'){ store.set('hc-dev-tune',devChangesNow()); toast('Dev settings saved. They load with the game from now on.',true); devStatus(); }
  else if(a==='resetall'){ for(const [r,o] of Object.entries(DEV_ORIG)) for(const p of devLeaves(DEV_ROOTS[r])){ const v=getP(o,p); if(getP(DEV_ROOTS[r],p)!==v) devSet(r+'|'+p,v); }
    for(const m of devAllMissions().concat(G.mission)){ const K='M:'+m.id+'|'; for(const p of new Set([...DEV_MISSION_KEYS,...devLeaves(m.swarm,'swarm')])) if(devChanged(K+p)){ const t=devTarget(K+p); devSet(K+p,t.orig==null?undefined:t.orig); } }
    store.set('hc-dev-tune',{}); toast('Everything is back to the game\'s own values.',true); devRender(); }
  else if(a==='export'){ const now=devChangesNow(), ta=el.querySelector('.dv-export');
    const lines=Object.entries(now).map(([k,v])=>{ const t=devTarget(k); return `${k.replace('|','  ')}: ${t.orig==null?'(default)':t.orig} → ${v}`; });
    ta.value=lines.length?lines.join('\n')+'\n\n'+JSON.stringify(now,null,1):'No changes.'; ta.hidden=false; ta.select(); try{ navigator.clipboard.writeText(ta.value).then(()=>toast('Changes copied to the clipboard.',true),()=>toast('Select the text and copy it (Ctrl+C).',true)); }catch(err){} }
  else if(a==='wave'){ if(G.mission.swarm&&G.mission.swarm.waves){ S.waveN++; launchWave(waveBudget()); } else launchWave(80); }
  else if(a==='reveal'){ G.devReveal=!G.devReveal; computeFog(); }   /* stays on for the rest of the mission */
  else if(a==='heal'){ for(const u of G.ents) if(!u.dead&&u.faction===G.side&&u.maxHp&&!u.downed) u.hp=u.maxHp; }
  else if(a==='clear'){ for(const u of G.ents) if(!u.dead&&u.kind==='unit'&&u.faction==='swarm'&&u.role!=='guard'&&!u.def.boss&&G.side!=='swarm') u.dead=true; }
  else if(a==='win'){ api.win('Won from the dev panel.'); }
  else if(a==='lose'){ api.lose('Lost from the dev panel.'); }
  devRender(); }
function devChange(e){ const t=e.target;
  if(t.dataset.dv==='speed'){ G.speed=+t.value; $('#btn-speed').textContent=G.speed+'×'; return; }
  if(t.dataset.dv==='unit'){ dev.unit=t.value; devRender(); return; }
  if(t.dataset.liveSet){ const v=+t.value, S=G.swarm; if(!isFinite(v)) return;
    ({ salvage:()=>{ G.salvage=v; }, biomass:()=>{ S.biomass=v; }, flares:()=>{ G.flares=v; }, nextWave:()=>{ S.nextWave=G.time+v; } })[t.dataset.liveSet](); G.selDirty=true; devRender(); return; }
  if(t.dataset.k){ const v=t.type==='checkbox'?t.checked:(t.value===''?undefined:+t.value); if(v!==undefined&&typeof v==='number'&&!isFinite(v)) return; devSet(t.dataset.k,v); devRender(); } }
window.addEventListener('keydown',e=>{ if(e.code==='F9'||(e.code==='Backquote'&&!(e.target&&e.target.closest&&e.target.closest('input,textarea,select')))){ if(G&&(ui.mode==='game'||ui.mode==='pause')){ e.preventDefault(); devToggle(); } } });
