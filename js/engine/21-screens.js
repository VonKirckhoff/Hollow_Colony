'use strict';
/* ---------- 2t. screens ---------- */
const SCREENS=['menu','campaign','brief','skirmish','manual','pause','end','veterans','cenotaph','intel','trophies'];
function show(name){ if(typeof BRIEF_VOICE!=='undefined'&&name!==BRIEF_VOICE.screen) BRIEF_VOICE.stop();   /* the intercom stops when you leave its screen (briefing, Cenotaph) */
  for(const s of SCREENS) $('#s-'+s).hidden = s!==name; if(name==='menu'&&typeof refreshContinue==='function') refreshContinue();
  const inMission=G&&!G.over&&ui.mode==='pause';   /* the Field Manual opened from the pause menu stays silent */
  if(typeof MUSIC!=='undefined') MUSIC.setScene(inMission||(!name&&G&&ui.mode==='game')?'game':name);   /* menu screens have music; a mission only if you switch it on (top-bar Music) */
  const mc=document.getElementById('music-ctl'); if(mc) mc.hidden = !name || name==='pause' || inMission;
  if(name){ $('#tut-card').hidden=true; $('#tut-open').hidden=true; } else if(G&&G.tutSteps) tutRefresh(); }   /* the training card only shows during play */
function goMenu(name){
  if(typeof devToggle==='function') devToggle(false);   /* the dev panel belongs to a mission, not to the menu screens */
  if(name==='menu'){ ui.mode='menu'; G=null; $('#hud').hidden=true; resize(); }
  if(name==='campaign') buildCampaign();
  if(name==='skirmish') buildSkirmish();
  if(name==='veterans') buildVeterans();
  if(name==='manual'){ $('#manual-ranks').innerHTML=rankCards(); const cur=SCREENS.find(x=>!$('#s-'+x).hidden); if(cur&&cur!=='manual'&&cur!=='intel') ui.manualFrom=cur; }
  if(name==='cenotaph') buildCenotaph();
  if(name==='trophies') buildTrophies();
  if(name==='intel'){ const cur=SCREENS.find(x=>!$('#s-'+x).hidden); if(cur&&cur!=='intel') ui.intelFrom=cur; buildIntel(); }
  show(name); syncDiff();
  if(name==='cenotaph'&&INTERCOM.auto){ const L=memorialLines(); BRIEF_VOICE.play(L[0],L.slice(1),'cenotaph'); }   /* a wake over the intercom */
  const first=$('#s-'+name+' button'); if(first) first.focus({preventScroll:true});
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-go]'); if(b) goMenu(b.dataset.go); });
/* two campaigns: the Lunar Corps (MISSIONS) and the Swarm (SWARM_MISSIONS); the campaign screen shows one at a time */
function campList(){ return ui.campSide==='swarm'?SWARM_MISSIONS:ui.campSide==='rogue'?ROGUE_MISSIONS:MISSIONS; }
/* the campaign a mission belongs to: 'corps', 'swarm' or 'rogue' (Rogue Strain, 31-rogue.js) */
const sideOf=m=>m.side==='swarm'?'swarm':m.rogue?'rogue':'corps';
const listOf=m=>sideOf(m)==='swarm'?SWARM_MISSIONS:sideOf(m)==='rogue'?ROGUE_MISSIONS:MISSIONS;
function isUnlocked(i){ const L=campList(); return i===0 || devUnlock || isDone(L[i-1].id); }   /* devUnlock: ² on the campaign screen (28-dev.js) */
function buildCampaign(){
  /* the Rogue side is always shown; its jobs open once the whole Corps campaign is won on Normal or Hard (until then: locked, no splice lab) */
  const sw=ui.campSide==='swarm', rg=ui.campSide==='rogue', rOpen=rogueUnlocked(), rLock=rg&&!rOpen, L=campList(); $('#s-campaign').classList.toggle('swarm',sw); $('#s-campaign').classList.toggle('rogue',rg); $('#s-campaign').classList.toggle('rogue-locked',rLock);
  const rb=$('[data-side="rogue"]'); if(rb){ rb.hidden=false; rb.classList.toggle('locked',!rOpen); } $('#camp-side').classList.add('three');
  document.querySelectorAll('[data-side]').forEach(b=>{ const on=b.dataset.side===ui.campSide; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
  $('#camp-eyebrow').textContent=sw?'CAMPAIGN · THE SWARM':rg?'CAMPAIGN · THE OSPREY CREW':'CAMPAIGN · LUNAR CORPS'; $('#camp-title').textContent=sw?'The Long Hunger':rg?'Rogue Strain':'Operation Hollow Light';
  for(const [k,LL] of [['corps',MISSIONS],['swarm',SWARM_MISSIONS],['rogue',ROGUE_MISSIONS]]){ const el=$('#cs-p-'+k); if(el) el.textContent=`${LL.filter(m=>isDone(m.id)).length} / ${LL.length} missions`; }   /* progress on the side buttons */
  if(!rOpen) $('#cs-p-rogue').textContent='🔒 Playable after the Corps campaign';
  if(rLock) buildRogueLock(); else if(rg) buildCrew(); else buildHero();
  $('#btn-vets').textContent=`Veterans (${ui.roster.active.length})`; $('#btn-ceno').textContent=`Cenotaph (${ui.roster.fallen.length})`;
  const doneN=L.filter(m=>isDone(m.id)).length; $('#camp-progress').textContent=rLock?`Playable after the Corps campaign · ${L.length} jobs`:`${doneN} of ${L.length} missions complete`;
  if(devUnlock) $('#camp-progress').textContent+=' · DEV: all missions open'; $('#s-campaign').classList.toggle('dev-open',devUnlock);
  const trs=rg?[]:trainingsOf(sw?'swarm':'corps');
  $('#mission-list').innerHTML=trs.map((tr,k)=>{ const trRes=ui.progress.results[tr.id]; return `<button class="mission training" type="button" data-mission="${-1-k}"><span class="num">${trs.length>1?'T'+(k+1):'00'}</span><span><div class="mt">${tr.title}</div><div class="ms">${tr.summary}</div></span><span class="st ${trRes?'done':''}">${trRes?'DONE':'TRAINING'}</span></button>`; }).join('')+L.map((m,i)=>{ const res=resultOf(m.id), done=!!res, un=!rLock&&isUnlocked(i);
    return `<button class="mission" type="button" data-mission="${i}" ${un?'':rLock?`aria-disabled="true" data-rlock="1" title="Playable after the Corps campaign"`:`aria-disabled="true" title="Finish the previous mission first (Shift-click to play anyway)"`}><span class="num">${String(i+1).padStart(2,'0')}</span><span><div class="mt">${m.title}</div><div class="ms">${m.summary} · ${MAPS[m.map].name}</div></span><span class="st ${done?'done':''}">${done?`COMPLETE<span class="badge d-${res.diff}">${DIFFICULTY[res.diff].label}</span>${res.time!=null?`<span class="best">${fmtTime(res.time)}</span>`:''}`:un?'READY':'LOCKED'}</span></button>`; }).join('');
}
/* Your own soldier (Nov 2026): name and man/woman are picked once and never change. Under that name he has five careers, one per role,
   each with its own rank, missions and trophy runs; you pick on the campaign screen which career goes on the next mission. */
let heroType=null, heroSex=null;
function careerBtn(t){ const v=careerOf(t), on=ui.roster.career===t;
  return `<button type="button" class="htype career ${on?'on':''}" data-career="${t}" aria-pressed="${on}" title="${v?`${RANKS[v.rank].name} · ${v.missions||0} mission${v.missions===1?'':'s'} · ${v.kills||0} kills`:'A new career: starts as Private'}"><img alt="" src="${iconUrl(t)}">${UNITS[t].name}<small>${v?`${RANKS[v.rank].abbr} · ${v.missions||0} m.`:'new'}</small></button>`; }
function buildHero(){
  const el=$('#hero-card'), me=selfOf();
  if(me){ const h=heroOf();
    el.innerHTML=`<div class="lbl">Your soldier</div><div class="hrow"><span class="hname">★ ${me.name}</span><span class="rdim">${me.sex==='f'?'♀ Woman':'♂ Man'}${h?` · next mission as ${RANKS[h.rank].abbr} ${UNITS[h.type].name}`:''}</span></div>
      <div class="hrow" role="group" aria-label="Career for the next mission">${HERO_TYPES.map(careerBtn).join('')}</div>`; return; }
  heroType=heroType||'trooper'; heroSex=heroSex||'m'; const P=f=>pron({sex:heroSex},f);
  el.innerHTML=`<div class="lbl">Enlist your own soldier</div>
    <p class="lede" style="margin:0">Pick a name and man or woman (that sets the voice). <b>Both are for good: they cannot be changed later.</b> You play every campaign mission under this name, marked with a gold star, in any of the five roles: each role is a career of its own with its own rank and trophy runs. Pick the role to start with.</p>
    <div class="hrow"><input type="text" id="hero-name" maxlength="18" placeholder="Name" aria-label="Soldier name">
      <span class="hsex" role="group" aria-label="Man or woman"><button type="button" class="htype ${heroSex==='m'?'on':''}" data-hsex="m" aria-pressed="${heroSex==='m'}">♂ Man</button><button type="button" class="htype ${heroSex==='f'?'on':''}" data-hsex="f" aria-pressed="${heroSex==='f'}">♀ Woman</button></span></div>
    <div class="hrow">${HERO_TYPES.map(t=>`<button type="button" class="htype ${t===heroType?'on':''}" data-htype="${t}"><img alt="" src="${iconUrl(t)}">${UNITS[t].name}</button>`).join('')}</div>
    <div class="hrow"><button class="btn primary" type="button" id="hero-save">Enlist</button></div>`;
}
$('#hero-card').addEventListener('click',e=>{ if(ui.campSide==='rogue') return;   /* the Rogue side: the splice lab (31-rogue.js) */
  const cb=e.target.closest('[data-career]'); if(cb){ const err=pickCareer(cb.dataset.career); if(err){ toast(err); return; } buildHero(); const h=heroOf(); toast(`${h.name} goes on the next mission as ${UNITS[h.type].name}.`,true); return; }
  const sx=e.target.closest('[data-hsex]'); if(sx){ heroSex=sx.dataset.hsex; const v=$('#hero-name').value; buildHero(); $('#hero-name').value=v; voiceSample(heroSex); return; }
  const t=e.target.closest('[data-htype]'); if(t){ heroType=t.dataset.htype; const v=$('#hero-name').value; buildHero(); $('#hero-name').value=v; return; }
  if(e.target.closest('#hero-save')){ const err=enlistSelf($('#hero-name').value,heroSex,heroType||'trooper'); if(err){ toast(err); return; } heroType=null; heroSex=null; buildHero(); buildCampaign(); toast('Your soldier is on the roster.',true); }
});
$('#hero-card').addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='hero-name'){ e.preventDefault(); $('#hero-save').click(); } });
$('#mission-list').addEventListener('click',e=>{ const b=e.target.closest('[data-mission]'); if(!b) return;
  if(b.dataset.rlock){ toast(`Playable after the Corps campaign: win all ${MISSIONS.length} Lunar Corps missions on Normal or Hard.`,true); return; }
  if(b.getAttribute('aria-disabled')==='true'){
    if(!e.shiftKey){ toast('Finish the previous mission first. Shift-click to play it anyway.',true); return; } }
  openBriefing(+b.dataset.mission); });
function rankCards(){ return RANKS.map(k=>`<div><b>${k.mark||'·'} ${k.name}</b><span>${k.xp} XP${k.heroOnly?' · your own soldier only':''}</span><span>${k.hp>1?`+${Math.round((k.hp-1)*100)}% HP, +${Math.round((k.dmg-1)*100)}% damage, +${Math.round((k.rate-1)*100)}% rate`:'base'}</span>${k.perk&&!k.aura?'<span>+ an ability of his type</span>':''}${k.aura?`<span>+ leads: soldiers within ${AURA.radius} tiles fire ${Math.round((AURA.rate-1)*100)}% faster, take ${Math.round(AURA.armor*100)}% less damage</span>`:''}</div>`).join(''); }
function buildVeterans(){
  const R=ui.roster;
  $('#roster-list').innerHTML = R.active.length ? `<div class="rrow rhead"><span>Rank</span><span>Name</span><span>Role</span><span>XP</span><span>Kills</span><span>Missions</span></div>`+
    R.active.map(v=>{ const nx=nextRank(v); return `<div class="rrow"><span class="rmark">${RANKS[v.rank].mark||'·'} ${RANKS[v.rank].name}</span><span>${v.hero?'★ ':''}${v.name}${v.risen?' <i class="risen">☠ risen</i>':''}</span><span class="rdim"><img alt="" src="${iconUrl(v.type)}">${UNITS[v.type].name}</span><span>${v.xp}${nx?`<i class="rdim"> / ${nx.xp}</i>`:''}</span><span>${v.kills||0}</span><span>${v.missions||0}</span></div>`; }).join('')
    : '<p class="lede">No veterans yet. Win a campaign mission and your experienced survivors will be listed here.</p>';
  $('#rank-list').innerHTML=rankCards();
  $('#btn-ceno2').textContent=`Cenotaph (${R.fallen.length})`;
}
let vetArm=null;
$('#btn-reset-vets').addEventListener('click',()=>{ const b=$('#btn-reset-vets');
  if(!vetArm){ b.classList.add('armed'); b.textContent='Click again to erase all veterans'; vetArm=setTimeout(()=>{ vetArm=null; b.classList.remove('armed'); b.textContent='Reset veterans'; },4000); return; }
  clearTimeout(vetArm); vetArm=null; const own=ui.roster; ui.roster=emptyRoster(); if(own.self){ ui.roster.self=own.self; ui.roster.career=own.career; ui.roster.active=own.active.filter(v=>v.hero); }   /* your own soldier and his careers stay */
  saveRoster(); b.classList.remove('armed'); b.textContent='Reset veterans'; buildVeterans(); toast('All veterans and the Cenotaph erased. Your own soldier stays.',true); });
/* The Cenotaph: every fallen veteran's name in stone. In zombie mode (Halloween) the fallen can be raised again. */
function buildCenotaph(){
  const R=ui.roster, z=ui.zombie;
  $('#s-cenotaph').classList.toggle('zombie',z);
  $('#zombie-row').innerHTML=`<button class="btn ${z?'on':''}" type="button" id="btn-zombie" aria-pressed="${z}">${z?'☠ Zombie mode on':'Zombie mode off'}</button>
    <p>${z?`Halloween: raise a fallen soldier and he rejoins the roster with his rank and kills. The risen have ${Math.round((RISEN.hp-1)*100)}% more health and heal themselves out of combat, but they shamble, a Medic cannot help them, and if they fall a second time they rest for good.`:'Halloween is coming. Switch on zombie mode to raise your fallen soldiers from the stone.'}</p>`;
  $('#cenotaph').innerHTML=`<div class="cap">THEY DID NOT COME HOME</div>`+(R.fallen.length?`<div class="names">${R.fallen.map((v,i)=>`<div class="name"><b>${v.hero?'<span class="star">★</span> ':''}${(RANKS[v.rank]||RANKS[0]).abbr} ${v.name}</b>
      <i>${UNITS[v.type]?UNITS[v.type].name:''} · fell in ${v.mission}${v.missions?` · ${v.missions} mission${v.missions>1?'s':''}`:''}${v.kills!=null?` · ${v.kills} kill${v.kills===1?'':'s'}`:''}${v.at?`<br>${new Date(v.at).toLocaleDateString()}`:''}</i>
      ${v.risen?'<span class="gone">FELL TWICE · AT REST</span>':z&&UNITS[v.type]?`<button class="btn-raise" type="button" data-raise="${i}">☠ Raise</button>`:''}</div>`).join('')}</div>`
    :ospreyOnStone()?'':'<p class="empty">No names yet. Keep it that way.</p>')
    /* the Osprey crew, lost with all hands as far as the Corps knows: no Raise, they are not the Corps' to raise */
    +(ospreyOnStone()?`<div class="cap osprey">THE OSPREY · LOST WITH ALL HANDS</div><div class="names">${ospreyLost().map(o=>`<div class="name osprey"><b>${o.title}</b><i>${o.role} · Osprey crew<br>lost at Hollow Colony</i></div>`).join('')}</div>`:'');
}
$('#s-cenotaph').addEventListener('click',e=>{
  if(e.target.closest('#ceno-voice')){ if(BRIEF_VOICE.on){ BRIEF_VOICE.stop(); return; } if(SFX.muted){ toast('Sound is off.',true); return; }
    const L=memorialLines(); BRIEF_VOICE.play(L[0],L.slice(1),'cenotaph'); return; }
  if(e.target.closest('#btn-zombie')){ setZombie(!ui.zombie); buildCenotaph(); toast(ui.zombie?'Zombie mode on. The dead are restless.':'Zombie mode off.',true); return; }
  const b=e.target.closest('[data-raise]'); if(!b) return; const rec=ui.roster.fallen[+b.dataset.raise]; const err=raiseFallen(+b.dataset.raise); if(err){ toast(err); return; }
  SFX.play('squelch'); buildCenotaph(); toast(`${rec.name} rises from the stone and rejoins the roster.`,true);
});
/* Trophy wall: a plaque per role and difficulty column. Earned plaques carry every soldier who earned them; your own soldier's progress shows on his row. */
const CUP_SVG=`<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><rect x="4" y="2" width="8" height="6"/><rect x="5" y="8" width="6" height="1"/><rect x="6" y="9" width="4" height="1"/><rect x="7" y="10" width="2" height="2"/><rect x="5" y="12" width="6" height="1"/><rect x="4" y="13" width="8" height="2"/><rect x="1" y="3" width="3" height="1"/><rect x="1" y="4" width="1" height="2"/><rect x="2" y="6" width="2" height="1"/><rect x="12" y="3" width="3" height="1"/><rect x="14" y="4" width="1" height="2"/><rect x="12" y="6" width="2" height="1"/></svg>`;
/* a role or Flawless cell: cup, name, one line, bar (details in the tooltip) */
function tPlaque(cls,won,name,line,f,tip){ return `<div class="plaque ${cls} ${won?'won':''}" title="${tip||name}">${CUP_SVG}<span class="pt"><b>${name}</b><i>${line}</i>${!won&&f!=null?`<span class="tbar"><span style="width:${Math.round(Math.min(1,f)*100)}%"></span></span>`:''}</span></div>`; }
/* a plaque with its explanation: cup, name, what to do, date or progress, bar */
function tBig(cls,won,name,what,line,f){ return `<div class="plaque big ${cls} ${won?'won':''}" title="${name}|${what}">${CUP_SVG}<b>${name}</b><i class="what">${what}</i><i>${line}</i>${!won&&f!=null?`<span class="tbar"><span style="width:${Math.round(Math.min(1,f)*100)}%"></span></span>`:''}</div>`; }
const tDate=w=>new Date(w.at||w).toLocaleDateString();
/* the Trophy wall in tabs: Lunar Corps, Swarm, Rogue Strain, Relics. The text on the left follows the tab; the count covers the whole wall. */
let trophTab='corps';
const TROPH_TABS=[
  { id:'corps', name:'Lunar Corps', text:'One trophy for every role and every difficulty. Your own soldier has one name and five careers, one per role; pick the career on the campaign screen. To earn a trophy, that career must win every campaign mission in order, from mission 1, walking out of each one alive. A mission where your soldier falls does not count: play it again. The Flawless row: win any campaign mission without losing a single soldier, one trophy per difficulty. Hollow Light, the grand trophy, takes every one of them. A win on Hard also counts for Normal and Easy.' },
  { id:'swarm', name:'The Brood', text:'Three trophies for the Brood campaign, one per difficulty: win every Brood mission on it. A win on Hard also counts for Normal and Easy, so each mission only needs its hardest win.' },
  { id:'rogue', name:'Rogue Strain', text:'The Osprey crew went rogue. Three trophies for winning every Rogue job on a difficulty (a win on Hard also counts for Normal and Easy), two for the ways the story can end, two for how far you take the strain, and one for walking among them unseen.' },
  { id:'relics', name:'Relics', text:'Hidden in the Lunar Corps campaign: relics of the old colony and ancient eggs. Take every relic, and every egg before the Brood wakes it. Read what you found in Intel, tab Relics.' } ];
function trophyTabs(){ const T=trophies(), hero=heroOf(), gs=grandStatus(), rs=relicStatus(), out={};
  const has=(list,k)=>list.filter(c=>T[k(c)]&&(!Array.isArray(T[k(c)])||T[k(c)].length)).length;
  /* Lunar Corps: the role grid, Flawless and Hollow Light */
  const head=`<div class="trow thead"><span></span>${TROPHY_COLS.map(c=>`<span>${c.label}</span>`).join('')}</div>`;
  const roles=HERO_TYPES.map(t=>`<div class="trow"><span class="trole"><img alt="" src="${iconUrl(t)}">${UNITS[t].name}</span>${TROPHY_COLS.map(c=>{
      const list=T[t+':'+c.key]||[], cv=careerOf(t), mine=!!cv, p=mine?trophyProgress(cv,c.key):0, tip=`${UNITS[t].name} · ${c.label}`;
      if(list.length) return tPlaque(c.key,true,list[0].name,`${tDate(list[0])}${list.length>1?` · +${list.length-1} more`:''}`,null,tip);
      return tPlaque(mine&&p?'run':'',false,'',mine?`${p} / ${MISSIONS.length}`:'not yet',mine?p/MISSIONS.length:null,tip); }).join('')}</div>`).join('');
  const flaw=`<div class="trow"><span class="trole flawless">Flawless</span>${FLAWLESS_COLS.map(c=>{ const w=T['flawless:'+c.key], n=flawlessCount(c.key);
      return tBig(c.key,!!w,w&&w.mission||`Flawless · ${c.label}`,`Win a campaign mission on ${c.label} without losing a soldier`,w?`${tDate(w)} · ${n}/${MISSIONS.length} flawless`:'not yet',null); }).join('')}</div>`;
  const gw=T['grand:corps'];
  out.corps={ html:head+roles+flaw+`<div class="tgrid one">${tBig('grandp corps',!!gw,'Hollow Light','Every role and Flawless trophy of the Lunar Corps',gw?tDate(gw):`${gs.corps.have} / ${gs.corps.need} trophies`,gs.corps.have/gs.corps.need)}</div>`,
    have:HERO_TYPES.reduce((s,t)=>s+has(TROPHY_COLS,c=>t+':'+c.key),0)+has(FLAWLESS_COLS,c=>'flawless:'+c.key)+(gw?1:0), need:HERO_TYPES.length*TROPHY_COLS.length+FLAWLESS_COLS.length+1 };
  /* the Swarm and the Rogue crew by difficulty */
  const diffs=(list,count,N,camp,cls)=>`<div class="tgrid three">${list.map(t=>{ const w=T[t.id], n=count(t.diff);
      return tBig(cls,!!w,t.name,`Win every ${camp} mission on ${DIFFICULTY[t.diff].label}`,w?tDate(w):`${n} / ${N} missions`,N?n/N:0); }).join('')}</div>`;
  out.swarm={ html:diffs(SWARM_TROPHIES,swarmDiffCount,SWARM_MISSIONS.length,'Brood','swarm'), have:has(SWARM_TROPHIES,t=>t.id), need:SWARM_TROPHIES.length };
  const RD=ROGUE_TROPHIES.filter(t=>t.diff), RS=ROGUE_TROPHIES.filter(t=>!t.diff);
  out.rogue={ html:`<div class="tsub">By difficulty</div>`+diffs(RD,rogueDiffCount,ROGUE_MISSIONS.length,'Rogue Strain','rogue')
      +`<div class="tsub">The story</div><div class="tgrid four">${RS.map(t=>{ const w=T[t.id]; return tBig('rogue',!!w,t.name,t.what,w?tDate(w):'not yet',null); }).join('')}</div>`,
    have:has(ROGUE_TROPHIES,t=>t.id), need:ROGUE_TROPHIES.length };
  out.relics={ html:`<div class="tgrid two">${[['item','Archivist','Every hidden relic of the campaign'],['egg','Egg Hunter','Every ancient egg, taken before the Brood woke it']].map(([k,name,what])=>{ const r=rs[k];
      return tBig('relic',!!r.at,name,what,r.at?tDate(r.at):`${r.have} / ${r.need} found`,r.have/Math.max(1,r.need)); }).join('')}</div>`,
    have:(rs.item.at?1:0)+(rs.egg.at?1:0), need:2 };
  return out; }
function buildTrophies(){
  checkGrand(); checkSwarmTrophies(); checkRogueTrophies(); const hero=heroOf(), tabs=trophyTabs();
  if(!TROPH_TABS.some(t=>t.id===trophTab)) trophTab='corps';
  const total=TROPH_TABS.reduce((s,t)=>s+tabs[t.id].need,0), earned=TROPH_TABS.reduce((s,t)=>s+tabs[t.id].have,0);
  $('#troph-lede').textContent=TROPH_TABS.find(t=>t.id===trophTab).text;
  $('#troph-hero').innerHTML=hero?`<b>★ ${hero.name}</b> <span class="rdim"><img alt="" src="${iconUrl(hero.type)}">${UNITS[hero.type].name} career</span> <span>${TROPHY_COLS.map(c=>`${c.label} <b>${trophyProgress(hero,c.key)}/${MISSIONS.length}</b>`).join(' · ')}</span> <span class="tcount">${earned} / ${total} trophies</span>`
    :`<span>No soldier of your own yet. Name one on the campaign screen to start a trophy run.</span> <span class="tcount">${earned} / ${total} trophies</span>`;
  $('#troph-tabs').innerHTML=TROPH_TABS.map(t=>`<button type="button" role="tab" class="${t.id}" data-ttab="${t.id}" aria-selected="${t.id===trophTab}">${t.name} <small>${tabs[t.id].have}/${tabs[t.id].need}</small></button>`).join('');
  $('#trophy-wall').className='trophies tab-'+trophTab; $('#trophy-wall').innerHTML=tabs[trophTab].html;
}
$('#troph-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-ttab]'); if(!b) return; trophTab=b.dataset.ttab; buildTrophies(); $(`[data-ttab="${trophTab}"]`).focus(); });
$('#troph-tabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return; const i=TROPH_TABS.findIndex(t=>t.id===trophTab), n=TROPH_TABS.length;
  trophTab=TROPH_TABS[(i+(e.key==='ArrowRight'?1:n-1))%n].id; buildTrophies(); $(`[data-ttab="${trophTab}"]`).focus(); e.preventDefault(); });
/* relics on the trophy wall: Archivist (every hidden item) and Egg Hunter (every ancient egg) */
function relicStatus(){ const F=relicsFound(), part=k=>{ const all=RELICS.filter(r=>r.kind===k), got=all.filter(r=>F[r.id]); return { have:got.length, need:all.length, at:got.length===all.length&&all.length?Math.max(...got.map(r=>F[r.id].at)):null }; };
  return { item:part('item'), egg:part('egg') }; }
/* Intel: a card per unit or structure, numbers straight from UNITS / BUILDINGS, tips from INTEL_NOTES */
let intelTab='corps';
const ATTACK_NAME={ bullet:'Gunfire', flame:'Flame, hits a group', acid:'Lobbed acid, splash', plasma:'Plasma bolt', melee:'Melee' };
const fmt1=n=>Math.round(n*10)/10;
function intelStat(k,v){ return `<div><dt>${k}</dt><dd>${v}</dd></div>`; }
function intelUnit(t){ const d=UNITS[t]; if(!d) return ''; const st=[], tags=[];
  st.push(intelStat('HP',d.hp));
  if(d.damage) st.push(intelStat('Damage/s',fmt1(d.damage/d.cooldown)));
  if(d.heal) st.push(intelStat('Heals/s',d.heal));
  if(d.range) st.push(intelStat('Range',d.range));
  st.push(intelStat('Speed',fmt1(d.speed/TILE)));
  st.push(intelStat('Sight',d.sight));
  if(d.faction==='corps'&&d.cost) st.push(intelStat('Cost',d.cost));
  if(d.faction==='swarm') st.push(intelStat('XP per kill',VET_XP[t]||VET_XP.kill));
  if(d.armor) st.push(intelStat('Armour',Math.round(d.armor*100)+'%'));
  if(d.attack) tags.push(ATTACK_NAME[d.attack]||d.attack);
  if(d.bonus) tags.push(Object.entries(d.bonus).map(([k,v])=>`×${v} vs ${(BUILDINGS[k]||UNITS[k]||{name:k}).name.toLowerCase()}s`).join(', '));
  if(d.key&&d.faction==='corps') tags.push(`Train: ${d.key}`);
  if(d.unlock) tags.push(`Appears after ${Math.floor(d.unlock/60)}:${String(d.unlock%60).padStart(2,'0')}`);
  if(d.cloak) tags.push('Cloaked'); if(d.boss) tags.push('Boss'); if(d.escort) tags.push('Escort'); if(d.regen) tags.push(`Regenerates ${d.regen} HP/s`);
  const perk=PERKS[t]?`<span class="perk">Lieutenant: ${PERKS[t].name}, ${PERKS[t].text.toLowerCase()}</span>`:'';
  return intelCard(iconUrl(t),d.name,d.role,d.faction,d.desc,INTEL_NOTES[t],st,tags,perk,t); }
function intelBuilding(t){ const d=BUILDINGS[t]; if(!d) return ''; const st=[], tags=[];
  if(d.hp>1) st.push(intelStat('HP',d.hp));
  if(d.damage) st.push(intelStat('Damage/s',fmt1(d.damage/d.cooldown)));
  if(d.range) st.push(intelStat('Range',d.range));
  if(d.cost) st.push(intelStat('Cost',d.cost));
  if(d.buildTime) st.push(intelStat('Build time',d.buildTime+' s'));
  if(d.supply) st.push(intelStat('Supply',`+${d.supply}`));
  if(d.income) st.push(intelStat('Salvage/s',d.income));
  if(d.hatch) st.push(intelStat('Hatches in',d.hatch+' s'));
  if(d.fuse) st.push(intelStat('Fuse',d.fuse+' s'));
  if(d.key&&d.cost) tags.push(`Build: ${d.key}`); if(d.portable) tags.push('Portable'); if(d.regen) tags.push(`Regrows ${d.regen} HP/s`); if(d.needsSite) tags.push('Relay pad only');
  return intelCard(iconUrl(t),d.name,`${d.size}×${d.size} structure`,d.faction,d.desc,INTEL_NOTES[t],st,tags,'',t); }
/* an entry that is no unit or building of its own (INTEL_EXTRA in js/content/intel.js) */
const intelExtraDef=id=>{ const x=INTEL_EXTRA[id]; return typeof x==='function'?x():x; };
function intelExtra(id){ const x=intelExtraDef(id); if(!x) return ''; const st=(typeof x.stats==='function'?x.stats():x.stats||[]).map(([k,v])=>intelStat(k,v));
  return intelCard('',x.name,x.role,x.faction,x.desc,x.note,st,x.tags||[],'',id); }
/* anim: the key of the little moving scene in the picture (21b-intel-anim.js); without one the picture stands still */
function intelCard(img,name,role,fac,desc,note,st,tags,perk,anim){
  return `<article class="icard f-${fac}"><div class="pic"${anim?` data-anim="${anim}"`:''}>${img?`<img alt="" src="${img}">`:''}</div><h3>${name}</h3><div class="role">${role||''}</div>
    <p>${desc||''}</p>${note?`<p class="note">${note}</p>`:''}<dl>${st.join('')}</dl><div class="tags">${tags.filter(Boolean).map(x=>`<span>${x}</span>`).join('')}${perk}</div></article>`; }
function buildIntel(){
  const TABS=INTEL_TABS; if(!TABS.some(t=>t.id===intelTab)) intelTab=TABS[0].id;   /* every tab always, Rogue Strain too (with a lock until the campaign opens) */
  $('#intel-tabs').innerHTML=TABS.map(t=>`<button type="button" role="tab" class="${t.id==='swarm'?'swarm':t.rogue?'rogue':''}" data-itab="${t.id}" aria-selected="${t.id===intelTab}"${t.rogue&&!rogueUnlocked()?' title="Playable after the Corps campaign"':''}>${t.rogue&&!rogueUnlocked()?'🔒 ':''}${t.name}</button>`).join('');
  const T=TABS.find(t=>t.id===intelTab)||TABS[0];
  if(T.relics){ buildRelicIntel(); intelFit(); intelAnimMount(); return; }
  if(T.rogue){ buildRogueIntel(); intelFit(); intelAnimMount(); return; }
  /* list on the left, the full card of the selected entry on the right: no scrolling, however many entries a tab has */
  const items=[...(T.units||[]).map(id=>({id,u:true})),...(T.buildings||[]).map(id=>({id,u:false})),...(T.extras||[]).map(id=>({id,x:true}))].filter(x=>x.x?INTEL_EXTRA[x.id]:x.u?UNITS[x.id]:BUILDINGS[x.id]);
  const sel=Math.min(intelSel[T.id]||0,items.length-1);
  $('#intel-list').innerHTML=items.map((x,i)=>{ const d=x.x?intelExtraDef(x.id):x.u?UNITS[x.id]:BUILDINGS[x.id], img=x.x?'':iconUrl(x.id);
    return `<button type="button" role="option" class="ili f-${d.faction} ${i===sel?'on':''}" data-isel="${i}" aria-selected="${i===sel}"><span class="pic" data-anim="${x.id}">${img?`<img alt="" src="${img}">`:''}</span><span><b>${d.name}</b><small>${x.x||x.u?(d.role||''):`${d.size}×${d.size} structure`}</small></span></button>`; }).join('');
  const it=items[sel]; $('#intel-grid').innerHTML=it?(it.x?intelExtra(it.id):it.u?intelUnit(it.id):intelBuilding(it.id)):'';
  intelFit(); intelAnimMount();
}
const intelSel={};
/* a long list goes into two columns, so a tab never has to scroll */
function intelFit(){ const L=$('#intel-list'), dense=L.children.length>12; L.classList.toggle('dense',dense); L.parentElement.classList.toggle('dense',dense); }
/* the Relics tab: what you have found, and a hint for what you have not */
function buildRelicIntel(){ const F=relicsFound(), sel=Math.min(intelSel.relics||0,RELICS.length-1), mt=id=>(MISSIONS.find(m=>m.id===id)||{}).title||id;
  $('#intel-list').innerHTML=RELICS.map((r,i)=>{ const f=!!F[r.id];
    return `<button type="button" role="option" class="ili f-none ${i===sel?'on':''} ${f?'':'rel-un'}" data-isel="${i}" aria-selected="${i===sel}"><span class="pic"${f?` data-anim="art:${relicArt(r)}"`:''}><img alt="" src="${ARTURL[relicArt(r)]}" style="${f?'':'filter:brightness(.25)'}"></span><span><b>${f?r.name:'???'}</b><small>${r.kind==='egg'?'Ancient egg':'Relic'} · ${mt(r.mission)}</small></span></button>`; }).join('');
  const r=RELICS[sel], f=r&&F[r.id], n=Object.keys(F).filter(k=>RELICS.some(x=>x.id===k)).length;
  const img=ARTURL[relicArt(r)];
  $('#intel-grid').innerHTML=r?intelCard(img,f?r.name:'Not found yet',`${r.kind==='egg'?'Ancient egg':'Relic'} · ${mt(r.mission)}`,'none',
    f?r.text:(r.kind==='egg'?'Somewhere on this map lies an ancient egg. Hold it with a soldier and keep the Brood off it: if they hold it, it wakes and grows into a new hive.':'Somewhere on this map, off the beaten track, something is waiting to be found. Walk a soldier over it.'),
    `${n} of ${RELICS.length} relics found.`,[],[f?`Found ${new Date(f.at).toLocaleDateString()}`:'Not found'],'',f?'art:'+relicArt(r):''):''; }
$('#intel-list').addEventListener('click',e=>{ const b=e.target.closest('[data-isel]'); if(!b) return; intelSel[intelTab]=+b.dataset.isel; buildIntel(); const nb=$(`[data-isel="${b.dataset.isel}"]`); if(nb) nb.focus({preventScroll:true}); });
$('#intel-list').addEventListener('keydown',e=>{ if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return; e.preventDefault(); const n=$('#intel-list').children.length, i=(intelSel[intelTab]||0)+(e.key==='ArrowDown'?1:-1);
  intelSel[intelTab]=(i+n)%n; buildIntel(); const nb=$(`[data-isel="${intelSel[intelTab]}"]`); if(nb) nb.focus({preventScroll:true}); });
$('#intel-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-itab]'); if(!b) return; intelTab=b.dataset.itab; buildIntel(); $(`[data-itab="${intelTab}"]`).focus(); });
$('#intel-tabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return; const TABS=INTEL_TABS, i=TABS.findIndex(t=>t.id===intelTab), n=TABS.length;
  intelTab=TABS[(i+(e.key==='ArrowRight'?1:n-1))%n].id; buildIntel(); $(`[data-itab="${intelTab}"]`).focus(); });
$('#intel-back').addEventListener('click',()=>goMenu(ui.intelFrom||'menu'));
let resetArm=null;
$('#btn-reset').addEventListener('click',()=>{ const b=$('#btn-reset');
  if(!resetArm){ b.classList.add('armed'); b.textContent='Click again to erase all progress'; resetArm=setTimeout(()=>{ resetArm=null; b.classList.remove('armed'); b.textContent='Reset campaign'; },4000); return; }
  clearTimeout(resetArm); resetArm=null;
  if(ui.campSide==='rogue'){ for(const m of ROGUE_MISSIONS) delete ui.progress.results[m.id]; store.set('hc-progress',ui.progress); resetRogue();   /* the Rogue side: only its own jobs, crew and lab */
    try{ const s=savedInfo(); if(s&&ROGUE_MISSIONS.some(m=>m.id===s.missionId)) localStorage.removeItem('hc-save'); }catch(e){} if(typeof refreshContinue==='function') refreshContinue();
    b.classList.remove('armed'); b.textContent='Reset campaign'; buildCampaign(); toast('The Osprey crew starts over: jobs, strains, taint and samples erased.',true); return; }
  ui.progress={results:{}}; store.set('hc-progress',ui.progress);
  const own=ui.roster.self; ui.roster=emptyRoster(); if(own){ ui.roster.self=own; pickCareer(HERO_TYPES[0]); }   /* the name stays for good; the careers start over */ saveRoster(); resetRogue();
  try{ localStorage.removeItem('hc-save'); }catch(e){}   /* the saved mission goes too */
  if(typeof refreshContinue==='function') refreshContinue();
  b.classList.remove('armed'); b.textContent='Reset campaign'; buildCampaign(); toast('Campaign progress and the saved game erased.',true); });
let briefIdx=0;
/* the trainings of one side, in order (The First Hunger, then Brood Tactics …) */
function trainingsOf(side){ return Object.values(TRAINING).filter(t=>(t.side||'corps')===side); }
function briefMission(i){ return i<0?trainingsOf(ui.campSide==='swarm'?'swarm':'corps')[-1-i]:campList()[i]; }
function openBriefing(i){ briefIdx=i; const m=briefMission(i), sw=m.side==='swarm', rg=!!m.rogue;
  $('#b-eyebrow').textContent=`${sw?'THE SWARM · ':rg?'ROGUE STRAIN · ':''}${m.training?'TRAINING':(rg?'JOB ':'MISSION ')+(i+1)} · ${MAPS[m.map].name.toUpperCase()}`; $('#s-brief').classList.toggle('swarm',sw); $('#s-brief').classList.toggle('rogue',rg); $('#b-start').textContent=sw?'Wake':rg?'Go dark':'Deploy'; $('#b-title').textContent=m.title;
  $('#b-text').innerHTML=m.briefing.map(p=>`<p>${p}</p>`).join('');
  const res=resultOf(m.id); $('#b-eyebrow').textContent+= res?` · COMPLETED ON ${DIFFICULTY[res.diff].label.toUpperCase()}`:'';
  const nv=sw||rg?0:ui.roster.active.length; if(rg) $('#b-text').innerHTML+=rogueBriefNote(); $('#b-text').innerHTML+= nv?`<p class="rdim">${nv} veteran${nv>1?'s':''} on the roster will join this mission: ${ui.roster.active.slice(0,6).map(v=>`${RANKS[v.rank].abbr} ${v.name}`).join(', ')}${nv>6?'…':''}.</p>`:'';
  if(sw) $('#b-text').innerHTML+=`<p class="rdim">Difficulty makes the Lunar Corps tougher: Easy ${Math.round(SWARM_DIFF.easy.hp*100)}%, Hard ${Math.round(SWARM_DIFF.hard.hp*100)}% health, and more reinforcements on Hard.</p>`;
  else if(!m.training&&!rg){ const r=resultOf(m.id); if(r&&r.flawless) $('#b-text').innerHTML+=`<p class="rdim">Done flawless (no soldier lost) on ${DIFFICULTY[r.flawless].label}.</p>`; }
  $('#b-obj').innerHTML=m.objectives.map(o=>`<li>${o.text}${o.optional?' (optional)':''}</li>`).join('');
  $('#b-watch').hidden=!m.demo;
  const lab=$('#b-lab'); lab.hidden=!rg; if(rg) buildCrew(lab); else lab.innerHTML='';   /* Rogue: splice and stabilize before going dark */
  show('brief'); syncDiff(); $('#b-start').focus({preventScroll:true});
  $('#b-voice').hidden=!window.speechSynthesis; if(INTERCOM.auto) BRIEF_VOICE.play(briefIntro(m,i),m.briefing); else BRIEF_VOICE.btn(); }
/* the first line the intercom says: who is addressed, and which mission */
function briefIntro(m,i){ const N=n=>['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'][n]||String(n);
  if(m.training) return m.side==='swarm'?`${m.title}.`:`Lunar Corps, Squad Dust recruits. Training exercise: ${m.title}.`;
  if(m.side==='swarm') return `${m.title}.`;
  if(m.rogue) return `Osprey crew, this is Kerckhoffs. Job ${N(i+1)}: ${m.title}.`;   /* the Captain on the crew's own channel: they are dead to the Corps */
  return `Lunar Corps, Squad Dust. Mission ${N(i+1)}: ${m.title}.`; }
$('#b-voice').addEventListener('click',()=>{ if(BRIEF_VOICE.on){ BRIEF_VOICE.stop(); return; }
  if(SFX.muted){ toast('Sound is off.',true); return; }
  const m=briefMission(briefIdx); BRIEF_VOICE.play(briefIntro(m,briefIdx),m.briefing); });
$('#b-start').addEventListener('click',()=>startMission(briefMission(briefIdx)));
$('#b-watch').addEventListener('click',()=>startMission(briefMission(briefIdx),{demo:true}));
$('#camp-side').addEventListener('click',e=>{ const b=e.target.closest('[data-side]'); if(!b) return; ui.campSide=b.dataset.side; store.set('hc-camp-side',ui.campSide); buildCampaign(); });
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
function startMission(m,opts){
  lastMission=m; newGame(m,ui.diff); ui.mode='game'; ui.placing=null; ui.amove=false; cv.classList.remove('amove');
  show(null); const bt=$('#boot'); if(bt) bt.hidden=true; $('#hud').hidden=false; $('#tooltip').hidden=true; resize(); sizeMinimap();
  const cp=ptWorld(m.start.camera||'P'); centerOn(cp.x,cp.y);
  G.selDirty=true; G.objDirty=true; $('#btn-speed').textContent='1×'; setupSideHud(); ui.burrow=false; ui.rallyPick=false; missionTag();
  if(G.side==='swarm'){ const r=ptWorld(m.start.rally||m.start.camera||'P'); if(r) G.swarm.rally=r; selectEntities([],false); }
  else selectEntities(G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'),false);
  if(typeof demoBanner==='function') demoBanner(false); if(opts&&opts.demo&&typeof demoStart==='function') demoStart();   /* Watch mode */
  rogueHud();   /* the DNA and stabilizer counters only in a Rogue job */
}
function pause(on){ if(!G||G.over) return; if(on) uiUsed('pause'); else uiUsed('resume'); G.paused=on; ui.mode=on?'pause':'game'; if(on){ $('#p-title').textContent=G.mission.title; const ps=$('#p-save'); if(ps) ps.hidden=!(typeof canSave==='function'&&canSave()); pauseLabels(); show('pause'); $('#p-resume').focus({preventScroll:true}); } else show(null); }
$('#p-resume').addEventListener('click',()=>pause(false));
$('#p-manual').addEventListener('click',()=>goMenu('manual'));
/* the Field Manual in tabs: one subject per tab, so nothing needs scrolling. It reopens on the tab you left it on. */
let manualTab='controls';
function setManualTab(id,focus){ manualTab=id;
  document.querySelectorAll('#manual-tabs [data-mtab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mtab===id)));
  document.querySelectorAll('#s-manual [data-mpanel]').forEach(p=>{ p.hidden=p.dataset.mpanel!==id; });
  if(focus) $(`#manual-tabs [data-mtab="${id}"]`).focus(); }
$('#manual-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-mtab]'); if(b) setManualTab(b.dataset.mtab,true); });
$('#manual-tabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
  const ids=[...document.querySelectorAll('#manual-tabs [data-mtab]')].map(b=>b.dataset.mtab), i=ids.indexOf(manualTab), n=ids.length;
  setManualTab(ids[(i+(e.key==='ArrowRight'?1:n-1))%n],true); e.preventDefault(); });
$('#manual-back').addEventListener('click',()=>{ if(ui.manualFrom==='pause'&&G&&!G.over&&ui.mode==='pause'){ show('pause'); $('#p-resume').focus({preventScroll:true}); } else goMenu('menu'); });
/* Start fresh: wipe everything the game saved in this browser (hc-… keys), optionally also the custom maps, and reload */
let freshArm=null;
$('#btn-fresh').addEventListener('click',()=>{ const b=$('#btn-fresh');
  if(!freshArm){ b.classList.add('armed'); b.textContent='Click again to erase everything'; freshArm=setTimeout(()=>{ freshArm=null; b.classList.remove('armed'); b.textContent='Start fresh'; },4000); return; }
  clearTimeout(freshArm); const maps=$('#fresh-maps').checked, keepT=$('#fresh-troph').checked;
  try{ const keys=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('hc-')&&(maps||k!=='hc-custom-maps')&&(!keepT||k!=='hc-trophies')) keys.push(k); } keys.forEach(k=>localStorage.removeItem(k)); }catch(e){}
  location.reload(); });
function pauseLabels(){}
$('#p-restart').addEventListener('click',()=>startMission(lastMission));
$('#p-quit').addEventListener('click',()=>goMenu('menu'));
function showEnd(){
  const o=G.over, m=G.mission; ui.mode='end';
  $('#e-eyebrow').textContent=o.win?'MISSION COMPLETE':'MISSION FAILED';
  const t=$('#e-title'); t.textContent=o.win?'Victory':'Defeat'; t.className='h '+(o.win?'win':'lose');
  $('#e-text').textContent=o.text;
  if(o.win && m.id!=='skirmish'){ const r=resultOf(m.id), pb=G.prevBest, up=pb&&DIFF_RANK[G.diffKey]>DIFF_RANK[pb.diff];
    $('#e-text').textContent+=` Completed on ${DIFFICULTY[G.diffKey].label}.${up?' New best difficulty!':pb&&pb.diff!==G.diffKey?` Your best remains ${DIFFICULTY[r.diff].label}.`:''}`; 
    if(G.rogueOpened) $('#e-text').textContent+=' A new campaign is open: Rogue Strain. The Osprey was never lost.'; }
  const ev=$('#e-vets'); const rr=G.rosterResult, promoted=(rr&&rr.promoted)||[], hero=heroOf();
  const fallenAll=(rr&&(rr.fallenAll||rr.fallen))||[];
  if(o.win && m.rogue){ ev.hidden=false; ev.innerHTML=rogueEndHtml(); }
  else if(o.win && m.id!=='skirmish' && m.side!=='swarm' && (promoted.length||(rr&&(rr.joined.length||fallenAll.length))||(o.win&&heroOf()))){ ev.hidden=false;
    const star=n=>hero&&hero.name===n?'<span class="vstar">★</span> ':'';
    // one row per rank, highest first; names alphabetical within a rank
    const byRank=list=>{ const m2=new Map(); for(const v of list){ if(!m2.has(v.rank)) m2.set(v.rank,[]); m2.get(v.rank).push(v.name); }
      return [...m2.entries()].sort((a,b)=>b[0]-a[0]).map(([r,ns])=>`<div class="vrow"><span class="vrank">${RANKS[r].mark||'·'} ${RANKS[r].name}</span><span>${ns.sort((a,b)=>a.localeCompare(b)).map(n=>star(n)+n).join(', ')}</span></div>`).join(''); };
    const fallen=fallenAll.slice().sort((a,b)=>b.rank-a.rank||a.name.localeCompare(b.name));
    const tw=(rr&&rr.trophies)||[], run=o.win&&hero&&(hero.tp||rr&&rr.heroDown)?`<div class="vsec"><span class="lbl">Trophy run</span><div>★ ${hero.name} · ${UNITS[hero.type].name}: ${TROPHY_COLS.map(c=>`${c.label} ${trophyProgress(hero,c.key)}/${MISSIONS.length}`).join(' · ')}</div>${rr&&rr.heroDown?`<div>${hero.name} went down in this mission, so it does not count for the ${UNITS[hero.type].name} career. Play it again.</div>`:''}</div>`:'';
    ev.innerHTML=(tw.length?`<div class="vsec troph"><span class="lbl">🏆 Trophy earned</span>${tw.map(w=>`<div>${w.name}: ${UNITS[w.type].name} · ${TROPHY_COLS.find(c=>c.key===w.col).label}. It hangs on the Trophy wall.</div>`).join('')}</div>`:'')+run+(promoted.length?`<div class="vsec"><span class="lbl">Promotions</span>${byRank(promoted)}</div>`:'')+
      (rr&&rr.joined.length?`<div class="vsec"><span class="lbl">New on the roster</span>${byRank(rr.joined)}</div>`:'')+
      (fallen.length?`<div class="vsec fallen"><span class="lbl">Fallen</span>${fallen.map(v=>`<div class="vrow"><span class="vrank">${RANKS[v.rank].mark||'·'} ${RANKS[v.rank].name}</span><span>${v.hero?'<span class="vstar">★</span> ':''}${v.name} <i>${UNITS[v.type]?UNITS[v.type].name:''}${v.missions?` · ${v.missions} mission${v.missions>1?'s':''}`:''}${v.kills!=null?` · ${v.kills} kill${v.kills===1?'':'s'}`:''}</i></span></div>`).join('')}</div>`:''); }
  else if(!o.win && m.id!=='skirmish' && m.side!=='swarm' && !m.rogue && G.fallenVets && Object.keys(G.fallenVets).length){ ev.hidden=false;   /* retry: show who fell, but nobody is lost */
    ev.innerHTML=`<div class="vsec"><span class="lbl">Retry</span><div>The roster is restored for another try. These soldiers fell, but they are not lost: ${Object.values(G.fallenVets).map(f=>`${RANKS[f.rank||0].abbr} ${f.name}`).sort().join(', ')}.</div></div>`; }
  else ev.hidden=true;
  if(G.flawless){ const html=`<div class="vsec troph"><span class="lbl">🏆 Flawless</span>${(G.flawlessWon||[]).length?G.flawlessWon.map(k=>`<div>Trophy earned: Flawless · ${DIFFICULTY[k].label}. It hangs on the Trophy wall.</div>`).join(''):''}<div>Not a single soldier lost on ${DIFFICULTY[G.diffKey].label}.</div></div>`;
    if(ev.hidden){ ev.hidden=false; ev.innerHTML=html; } else ev.innerHTML=html+ev.innerHTML; }
  if(G.grandWon&&G.grandWon.length){ const html=`<div class="vsec troph"><span class="lbl">🏆 Grand trophy</span>${G.grandWon.map(()=>`<div>Hollow Light: every trophy of the Lunar Corps. It hangs on the Trophy wall.</div>`).join('')}</div>`;
    if(ev.hidden){ ev.hidden=false; ev.innerHTML=html; } else ev.innerHTML=html+ev.innerHTML; }
  if(G.swarmWon&&G.swarmWon.length){ const html=`<div class="vsec troph"><span class="lbl">🏆 Trophy earned</span>${G.swarmWon.map(id=>{ const t=SWARM_TROPHIES.find(x=>x.id===id); return `<div>${t.name}: every Brood mission won on ${DIFFICULTY[t.diff].label}. It hangs on the Trophy wall.</div>`; }).join('')}</div>`;
    if(ev.hidden){ ev.hidden=false; ev.innerHTML=html; } else ev.innerHTML=html+ev.innerHTML; }
  if(G.relicsGot&&G.relicsGot.length){ const html=`<div class="vsec troph"><span class="lbl">✦ Relic found</span>${G.relicsGot.map(id=>{ const r=relicDef(id); return r?`<div>${r.name}. Read about it in Intel, tab Relics.</div>`:''; }).join('')}</div>`;   /* kept even if the mission was lost */
    if(ev.hidden){ ev.hidden=false; ev.innerHTML=html; } else ev.innerHTML=ev.innerHTML+html; }
  if(!o.win && m.rogue){ ev.hidden=false; ev.innerHTML=`<div class="vsec"><span class="lbl">Retry</span><div>Nothing is lost: the crew, their taint and the splice lab are as they were before this job.</div></div>`; }
  const S=G.stats; $('#e-stats').innerHTML=(G.side==='swarm'?[['Time',fmtTime(G.time)],['Soldiers killed',S.kills],['Brood lost',S.lost],['Hives lost',S.hives],['Bodies brought home',S.fed||0],['Cocoons',S.cocoons]]:[['Time',fmtTime(G.time)],['Brood killed',S.kills],['Soldiers lost',S.soldiers!=null?S.soldiers:S.lost],['Assets lost',S.assets||0],...(m.rogue?[['Hives burned',S.hives],['Corps shot',S.loyal||0],['Samples',dnaTotal(G.rogue&&G.rogue.dna)]]:[['Hives burned',S.hives],['Salvage crates',S.crates],['Reinforcements',S.trained]])]).map(([a,b])=>`<div><span class="lbl">${a}</span><b>${b}</b></div>`).join('');
  const LM=listOf(m), idx=m.training?-1:LM.indexOf(m); let btns=''; if(idx>=0||m.training) ui.campSide=sideOf(m);
  if(o.win && (m.training||idx>=0) && idx<LM.length-1) btns+=`<button class="btn primary" type="button" id="e-next">${m.rogue?'Next job':'Next mission'}</button>`;
  btns+=`<button class="btn ${o.win&&(m.training||idx>=0)&&idx<LM.length-1?'':'primary'}" type="button" id="e-retry">${o.win?'Play again':'Retry'}</button><button class="btn" type="button" id="e-menu">Main menu</button>`;
  if(!o.win) btns+=`<button class="btn" type="button" id="e-watch" data-tip="Watch the field|Hide this report and watch the battle play on. Drag, the arrow keys or the minimap move the camera.">Watch the field</button>`;
  $('#e-buttons').innerHTML=btns;
  /* a lost mission: the report is see-through and the battle plays on behind it (afterDefeat) */
  const se=$('#s-end'); se.classList.toggle('aftermath',!o.win); se.classList.remove('watching'); $('#e-report').hidden=true; show('end');
  $('#e-watch')?.addEventListener('click',()=>{ se.classList.add('watching'); $('#e-report').hidden=false; $('#e-report').focus({preventScroll:true}); });
  const trs=m.training?trainingsOf(m.side||'corps'):[], tk=trs.indexOf(m), nextI=m.training&&tk>=0&&tk<trs.length-1?-2-tk:idx+1;   /* after a training: the next training, then mission 1 */
  $('#e-next')?.addEventListener('click',()=>openBriefing(nextI));
  $('#e-retry').addEventListener('click',()=>startMission(lastMission));
  $('#e-menu').addEventListener('click',()=>goMenu('menu'));
  ($('#e-next')||$('#e-retry')).focus({preventScroll:true});
}

$('#e-report').addEventListener('click',()=>{ $('#s-end').classList.remove('watching'); $('#e-report').hidden=true; });

/* top bar: the mission's title, and its mode: which campaign and number (or training / skirmish) and the difficulty */
function missionTag(){ const m=G.mission, sw=m.side==='swarm', L=listOf(m), i=L.indexOf(m);
  const mode=m.training?(sw?'Brood training':'Corps training'):m.id==='skirmish'?'Skirmish':i>=0?`${sw?'Brood':m.rogue?'Rogue':'Corps'} ${i+1}`:'Mission';
  const diff=(sw?SWARM_DIFF:DIFFICULTY)[G.diffKey], d=diff&&diff.label?diff.label:G.diffKey;
  $('#r-mode').textContent=`${mode} · ${d}`; $('#r-mtitle').textContent=m.title; $('#r-mission').dataset.tip=`${m.title}|${mode.replace(/^(Corps|Swarm|Rogue) (\d)/,'$1 campaign, mission $2')}, ${d}.`; }
