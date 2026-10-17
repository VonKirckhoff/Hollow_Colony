'use strict';
/* ---------- 2t. screens ---------- */
const SCREENS=['menu','campaign','brief','skirmish','manual','pause','end','veterans','cenotaph'];
function show(name){ for(const s of SCREENS) $('#s-'+s).hidden = s!==name; }
function goMenu(name){
  if(name==='menu'){ ui.mode='menu'; G=null; $('#hud').hidden=true; resize(); }
  if(name==='campaign') buildCampaign();
  if(name==='skirmish') buildSkirmish();
  if(name==='veterans') buildVeterans();
  if(name==='cenotaph') buildCenotaph();
  show(name); syncDiff();
  const first=$('#s-'+name+' button'); if(first) first.focus({preventScroll:true});
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-go]'); if(b) goMenu(b.dataset.go); });
function isUnlocked(i){ return i===0 || isDone(MISSIONS[i-1].id); }
function buildCampaign(){
  buildHero();
  $('#btn-vets').textContent=`Veterans (${ui.roster.active.length})`; $('#btn-ceno').textContent=`Cenotaph (${ui.roster.fallen.length})`;
  const doneN=MISSIONS.filter(m=>isDone(m.id)).length; $('#camp-progress').textContent=`${doneN} of ${MISSIONS.length} missions complete`;
  $('#mission-list').innerHTML=MISSIONS.map((m,i)=>{ const res=ui.progress.results[m.id], done=!!res, un=isUnlocked(i);
    return `<button class="mission" type="button" data-mission="${i}" ${un?'':'aria-disabled="true" title="Finish the previous mission first (Shift-click to play anyway)"'}><span class="num">${String(i+1).padStart(2,'0')}</span><span><div class="mt">${m.title}</div><div class="ms">${m.summary} · ${MAPS[m.map].name}</div></span><span class="st ${done?'done':''}">${done?`COMPLETE<span class="badge d-${res.diff}">${DIFFICULTY[res.diff].label}</span>${res.time!=null?`<span class="best">${fmtTime(res.time)}</span>`:''}`:un?'READY':'LOCKED'}</span></button>`; }).join('');
}
/* Your own soldier: create him (name + type) on the campaign screen; rename him any time, change type until his first mission. */
let heroEdit=false, heroType=null;
function buildHero(){
  const el=$('#hero-card'), h=heroOf();
  if(h && !heroEdit){ el.innerHTML=`<div class="lbl">Your soldier</div><div class="hrow"><img alt="" src="${iconUrl(h.type)}" style="width:28px;height:28px;image-rendering:pixelated"><span class="hname">★ ${RANKS[h.rank].abbr} ${h.name}</span><span class="rdim">${UNITS[h.type].name} · ${h.missions||0} mission${h.missions===1?'':'s'} · ${h.kills||0} kills</span><span style="flex:1"></span><button class="btn" type="button" id="hero-edit">Edit</button></div>`; return; }
  heroType=heroType||(h?h.type:'trooper'); const locked=h&&(h.missions||0)>0;
  el.innerHTML=`<div class="lbl">${h?'Edit your soldier':'Enlist your own soldier'}</div>
    <p class="lede" style="margin:0">${h?'Rename him any time. His type is fixed once he has been on a mission.':'Give him a name and pick his job. He goes on every campaign mission, marked with a gold star, and earns rank like any veteran. If he falls, you can enlist a new one.'}</p>
    <div class="hrow"><input type="text" id="hero-name" maxlength="18" placeholder="Name" value="${h?h.name:''}" aria-label="Soldier name"></div>
    <div class="hrow">${HERO_TYPES.map(t=>`<button type="button" class="htype ${t===heroType?'on':''}" data-htype="${t}" ${locked&&t!==h.type?'disabled':''}><img alt="" src="${iconUrl(t)}">${UNITS[t].name}</button>`).join('')}</div>
    <div class="hrow"><button class="btn primary" type="button" id="hero-save">${h?'Save':'Enlist'}</button>${h?'<button class="btn" type="button" id="hero-cancel">Cancel</button>':''}</div>`;
}
$('#hero-card').addEventListener('click',e=>{
  if(e.target.closest('#hero-edit')){ heroEdit=true; heroType=null; buildHero(); const i=$('#hero-name'); if(i) i.focus(); return; }
  if(e.target.closest('#hero-cancel')){ heroEdit=false; buildHero(); return; }
  const t=e.target.closest('[data-htype]'); if(t&&!t.disabled){ heroType=t.dataset.htype; const v=$('#hero-name').value; buildHero(); $('#hero-name').value=v; return; }
  if(e.target.closest('#hero-save')){ const err=setHero($('#hero-name').value,heroType||'trooper'); if(err){ toast(err); return; } heroEdit=false; buildHero(); buildCampaign(); toast('Your soldier is on the roster.',true); }
});
$('#hero-card').addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='hero-name'){ e.preventDefault(); $('#hero-save').click(); } });
$('#mission-list').addEventListener('click',e=>{ const b=e.target.closest('[data-mission]'); if(!b) return; if(b.getAttribute('aria-disabled')==='true' && !e.shiftKey){ toast('Finish the previous mission first. Shift-click to play it anyway.',true); return; } openBriefing(+b.dataset.mission); });
function buildVeterans(){
  const R=ui.roster;
  $('#roster-list').innerHTML = R.active.length ? `<div class="rrow rhead"><span>Rank</span><span>Name</span><span>Role</span><span>XP</span><span>Kills</span><span>Missions</span></div>`+
    R.active.map(v=>{ const nx=nextRank(v); return `<div class="rrow"><span class="rmark">${RANKS[v.rank].mark||'·'} ${RANKS[v.rank].name}</span><span>${v.hero?'★ ':''}${v.name}${v.risen?' <i class="risen">☠ risen</i>':''}</span><span class="rdim"><img alt="" src="${iconUrl(v.type)}">${UNITS[v.type].name}</span><span>${v.xp}${nx?`<i class="rdim"> / ${nx.xp}</i>`:''}</span><span>${v.kills||0}</span><span>${v.missions||0}</span></div>`; }).join('')
    : '<p class="lede">No veterans yet. Win a campaign mission and your experienced survivors will be listed here.</p>';
  $('#rank-list').innerHTML=RANKS.map(k=>`<div><b>${k.mark||'·'} ${k.name}</b><span>${k.xp} XP${k.heroOnly?' · your own soldier only':''}</span><span>${k.hp>1?`+${Math.round((k.hp-1)*100)}% HP, +${Math.round((k.dmg-1)*100)}% damage, +${Math.round((k.rate-1)*100)}% rate`:'base'}</span>${k.perk&&!k.aura?`<span>Ability: ${HERO_TYPES.map(t=>`${UNITS[t].name} ${PERKS[t].name.toLowerCase()}`).join(', ')}</span>`:''}${k.aura?`<span>Leads: soldiers within ${AURA.radius} tiles fire ${Math.round((AURA.rate-1)*100)}% faster and take ${Math.round(AURA.armor*100)}% less damage. If he falls, the squad wavers.</span>`:''}</div>`).join('');
  $('#btn-ceno2').textContent=`Cenotaph (${R.fallen.length})`;
}
let vetArm=null;
$('#btn-reset-vets').addEventListener('click',()=>{ const b=$('#btn-reset-vets');
  if(!vetArm){ b.classList.add('armed'); b.textContent='Click again to erase all veterans'; vetArm=setTimeout(()=>{ vetArm=null; b.classList.remove('armed'); b.textContent='Reset veterans'; },4000); return; }
  clearTimeout(vetArm); vetArm=null; ui.roster={active:[],fallen:[]}; saveRoster(); b.classList.remove('armed'); b.textContent='Reset veterans'; buildVeterans(); toast('All veterans and the Cenotaph erased.',true); });
/* The Cenotaph: every fallen veteran's name in stone. In zombie mode (Halloween) the fallen can be raised again. */
function buildCenotaph(){
  const R=ui.roster, z=ui.zombie;
  $('#s-cenotaph').classList.toggle('zombie',z);
  $('#zombie-row').innerHTML=`<button class="btn ${z?'on':''}" type="button" id="btn-zombie" aria-pressed="${z}">${z?'☠ Zombie mode on':'Zombie mode off'}</button>
    <p>${z?`Halloween: raise a fallen soldier and he rejoins the roster with his rank and kills. The risen have ${Math.round((RISEN.hp-1)*100)}% more health and heal themselves, but they shamble, a Medic cannot help them, and if they fall a second time they rest for good.`:'Halloween is coming. Switch on zombie mode to raise your fallen soldiers from the stone.'}</p>`;
  $('#cenotaph').innerHTML=`<div class="cap">THEY DID NOT COME HOME</div>`+(R.fallen.length?`<div class="names">${R.fallen.map((v,i)=>`<div class="name"><b>${v.hero?'<span class="star">★</span> ':''}${(RANKS[v.rank]||RANKS[0]).abbr} ${v.name}</b>
      <i>${UNITS[v.type]?UNITS[v.type].name:''} · fell in ${v.mission}${v.missions?` · ${v.missions} mission${v.missions>1?'s':''}`:''}${v.kills!=null?` · ${v.kills} kill${v.kills===1?'':'s'}`:''}${v.at?`<br>${new Date(v.at).toLocaleDateString()}`:''}</i>
      ${v.risen?'<span class="gone">FELL TWICE · AT REST</span>':z&&UNITS[v.type]?`<button class="btn-raise" type="button" data-raise="${i}">☠ Raise</button>`:''}</div>`).join('')}</div>`
    :'<p class="empty">No names yet. Keep it that way.</p>');
}
$('#s-cenotaph').addEventListener('click',e=>{
  if(e.target.closest('#btn-zombie')){ setZombie(!ui.zombie); buildCenotaph(); toast(ui.zombie?'Zombie mode on. The dead are restless.':'Zombie mode off.',true); return; }
  const b=e.target.closest('[data-raise]'); if(!b) return; const rec=ui.roster.fallen[+b.dataset.raise]; const err=raiseFallen(+b.dataset.raise); if(err){ toast(err); return; }
  SFX.play('squelch'); buildCenotaph(); toast(`${rec.name} rises from the stone and rejoins the roster.`,true);
});
let resetArm=null;
$('#btn-reset').addEventListener('click',()=>{ const b=$('#btn-reset');
  if(!resetArm){ b.classList.add('armed'); b.textContent='Click again to erase all progress'; resetArm=setTimeout(()=>{ resetArm=null; b.classList.remove('armed'); b.textContent='Reset campaign'; },4000); return; }
  clearTimeout(resetArm); resetArm=null; ui.progress={results:{}}; ui.roster={active:[],fallen:[]}; saveRoster(); store.set('hc-progress',ui.progress); b.classList.remove('armed'); b.textContent='Reset campaign'; buildCampaign(); toast('Campaign progress erased.',true); });
let briefIdx=0;
function openBriefing(i){ briefIdx=i; const m=MISSIONS[i];
  $('#b-eyebrow').textContent=`MISSION ${i+1} · ${MAPS[m.map].name.toUpperCase()}`; $('#b-title').textContent=m.title;
  $('#b-text').innerHTML=m.briefing.map(p=>`<p>${p}</p>`).join('');
  const res=ui.progress.results[m.id]; $('#b-eyebrow').textContent+= res?` · COMPLETED ON ${DIFFICULTY[res.diff].label.toUpperCase()}`:'';
  const nv=ui.roster.active.length; $('#b-text').innerHTML+= nv?`<p class="rdim">${nv} veteran${nv>1?'s':''} on the roster will join this mission: ${ui.roster.active.slice(0,6).map(v=>`${RANKS[v.rank].abbr} ${v.name}`).join(', ')}${nv>6?'…':''}.</p>`:'';
  $('#b-obj').innerHTML=m.objectives.map(o=>`<li>${o.text}${o.optional?' (optional)':''}</li>`).join('');
  show('brief'); syncDiff(); $('#b-start').focus({preventScroll:true}); }
$('#b-start').addEventListener('click',()=>startMission(MISSIONS[briefIdx]));
function syncDiff(){ document.querySelectorAll('.diff-seg').forEach(seg=>{ seg.innerHTML=Object.entries(DIFFICULTY).map(([k,d])=>`<button type="button" data-diff="${k}" class="${k===ui.diff?'on':''}">${d.label}</button>`).join(''); }); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-diff]'); if(!b) return; ui.diff=b.dataset.diff; store.set('hc-diff',ui.diff); syncDiff(); });
function buildSkirmish(){
  $('#map-list').innerHTML=Object.entries(MAPS).map(([id,m])=>`<button type="button" class="mapcard ${id===ui.skMap?'on':''}" data-map="${id}"><canvas data-prev="${id}"></canvas>${m.custom?'<span class="tag">CUSTOM</span>':''}<span class="mt">${m.name}</span><span class="ms">${m.desc}</span>${m.custom?`<span class="del" data-delmap="${id}">Remove</span>`:''}</button>`).join('');
  document.querySelectorAll('[data-prev]').forEach(c=>{ const m=loadMap(c.dataset.prev); c.width=m.w*3; c.height=m.h*3; const x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(m.mini,0,0,c.width,c.height);
    for(const k in m.points){ if(/[a-n]/.test(k)){ const p=m.points[k][0]; x.fillStyle='#a6ff4a'; x.fillRect(p.x*3-3,p.y*3-3,7,7); } } const P=m.points.P[0]; x.fillStyle='#ffb347'; x.fillRect(P.x*3-3,P.y*3-3,7,7); });
}
$('#btn-loadmap').addEventListener('click',()=>{ $('#loadmap').hidden=false; $('#mapcode').value=''; $('#mapcode').focus(); });
$('#mapcode-cancel').addEventListener('click',()=>{ $('#loadmap').hidden=true; });
$('#mapcode-go').addEventListener('click',()=>{ const r=addCustomMap($('#mapcode').value); if(!r.startsWith('custom-')){ toast(r,true); return; }
  ui.skMap=r; $('#loadmap').hidden=true; buildSkirmish(); toast(`Map "${MAPS[r].name}" added.`,true); });
$('#map-list').addEventListener('click',e=>{ const d=e.target.closest('[data-delmap]'); if(d){ e.stopImmediatePropagation(); if(d.dataset.armed!=='1'){ d.dataset.armed='1'; d.textContent='Click again to remove'; return; } removeCustomMap(d.dataset.delmap); if(ui.skMap===d.dataset.delmap) ui.skMap='kappa'; buildSkirmish(); return; } });
$('#map-list').addEventListener('click',e=>{ const b=e.target.closest('[data-map]'); if(!b) return; ui.skMap=b.dataset.map; buildSkirmish(); });
$('#sk-start').addEventListener('click',()=>startMission(skirmishMission(ui.skMap)));
function skirmishMission(mapId){
  const m=loadMap(mapId); const hs=Object.keys(m.points).filter(k=>/^[a-n]$/.test(k));
  return { id:'skirmish', title:'Skirmish', map:mapId, summary:'', briefing:[],
    start:{ salvage:SKIRMISH.salvage, camera:'P', units:SKIRMISH.units, buildings:[['hq','P']], hives:hs },
    swarm:SKIRMISH.swarm,
    objectives:[ {id:'hives',text:`Destroy all hives (0/${hs.length})`}, {id:'hq',text:'The Command Post must survive'} ],
    triggers:[
      { when:g=>g.time>1, do:g=>g.say('Cmdr. Varga',`${m.name}. ${hs.length} hives detected. Build up, then burn them out.`) },
      { repeat:true, when:()=>true, do:g=>g.setText('hives',`Destroy all hives (${hs.length-g.hives()}/${hs.length})`) },
      { when:g=>g.has('hq')===0, do:g=>{ g.fail('hq'); g.lose('The Command Post has fallen.'); } },
      { when:g=>g.hives()===0, do:g=>{ g.complete('hives'); g.complete('hq'); g.win('Every hive on the map is destroyed.'); } }
    ] };
}
let lastMission=null;
function startMission(m){
  lastMission=m; newGame(m,ui.diff); ui.mode='game'; ui.placing=null; ui.amove=false; cv.classList.remove('amove');
  show(null); $('#hud').hidden=false; $('#tooltip').hidden=true; resize(); sizeMinimap();
  const cp=ptWorld(m.start.camera||'P'); centerOn(cp.x,cp.y);
  G.selDirty=true; G.objDirty=true; $('#btn-speed').textContent='1×';
  selectEntities(G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'),false);
}
function pause(on){ if(!G||G.over) return; G.paused=on; ui.mode=on?'pause':'game'; if(on){ $('#p-title').textContent=G.mission.title; show('pause'); $('#p-resume').focus({preventScroll:true}); } else show(null); }
$('#p-resume').addEventListener('click',()=>pause(false));
$('#p-restart').addEventListener('click',()=>{ startMission(lastMission); });
$('#p-quit').addEventListener('click',()=>goMenu('menu'));
function showEnd(){
  const o=G.over, m=G.mission; ui.mode='end';
  $('#e-eyebrow').textContent=o.win?'MISSION COMPLETE':'MISSION FAILED';
  const t=$('#e-title'); t.textContent=o.win?'Victory':'Defeat'; t.className='h '+(o.win?'win':'lose');
  $('#e-text').textContent=o.text;
  if(o.win && m.id!=='skirmish'){ const r=ui.progress.results[m.id], pb=G.prevBest, up=pb&&DIFF_RANK[G.diffKey]>DIFF_RANK[pb.diff];
    $('#e-text').textContent+=` Completed on ${DIFFICULTY[G.diffKey].label}.${up?' New best difficulty!':pb&&pb.diff!==G.diffKey?` Your best remains ${DIFFICULTY[r.diff].label}.`:''}`; }
  const ev=$('#e-vets'); const rr=G.rosterResult; const promos=(rr&&rr.promoted||[]).map(p=>`${p.name}: ${RANKS[p.rank].name}`);
  if(o.win && m.id!=='skirmish' && (promos.length||(rr&&(rr.joined.length||rr.fallen.length)))){ ev.hidden=false;
    ev.innerHTML=(promos.length?`<div><span class="lbl">Promotions</span> ${promos.join(' · ')}</div>`:'')+
      (rr&&rr.joined.length?`<div><span class="lbl">New on the roster</span> ${rr.joined.map(v=>`${RANKS[v.rank].abbr} ${v.name}`).join(' · ')}</div>`:'')+
      (rr&&rr.fallen.length?`<div class="fallen"><span class="lbl">Fallen</span> ${rr.fallen.map(v=>`${RANKS[v.rank].abbr} ${v.name}${v.kills!=null?` <i>(${v.missions?`${v.missions} mission${v.missions>1?'s':''}, `:''}${v.kills} kill${v.kills===1?'':'s'})</i>`:''}`).join(' · ')}</div>`:''); }
  else ev.hidden=true;
  const S=G.stats; $('#e-stats').innerHTML=[['Time',fmtTime(G.time)],['Swarm killed',S.kills],['Losses',S.lost],['Hives burned',S.hives],['Salvage crates',S.crates],['Reinforcements',S.trained]].map(([a,b])=>`<div><span class="lbl">${a}</span><b>${b}</b></div>`).join('');
  const idx=MISSIONS.indexOf(m); let btns='';
  if(o.win && idx>=0 && idx<MISSIONS.length-1) btns+=`<button class="btn primary" type="button" id="e-next">Next mission</button>`;
  btns+=`<button class="btn ${o.win&&idx>=0&&idx<MISSIONS.length-1?'':'primary'}" type="button" id="e-retry">${o.win?'Play again':'Retry'}</button><button class="btn" type="button" id="e-menu">Main menu</button>`;
  $('#e-buttons').innerHTML=btns; show('end');
  $('#e-next')?.addEventListener('click',()=>openBriefing(idx+1));
  $('#e-retry').addEventListener('click',()=>startMission(lastMission));
  $('#e-menu').addEventListener('click',()=>goMenu('menu'));
  ($('#e-next')||$('#e-retry')).focus({preventScroll:true});
}
