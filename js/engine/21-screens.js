'use strict';
/* ---------- 2t. screens ---------- */
const SCREENS=['menu','campaign','brief','skirmish','manual','pause','end','veterans','cenotaph','intel','trophies'];
function show(name){ for(const s of SCREENS) $('#s-'+s).hidden = s!==name;
  const inMission=G&&!G.over&&ui.mode==='pause';   /* the Field Manual opened from the pause menu stays silent */
  if(typeof MUSIC!=='undefined') MUSIC.setScene(inMission||(!name&&G&&ui.mode==='game')?'game':name);   /* menu screens have music; a mission only if you switch it on (top-bar Music) */
  const mc=document.getElementById('music-ctl'); if(mc) mc.hidden = !name || name==='pause' || inMission;
  if(name){ $('#tut-card').hidden=true; $('#tut-open').hidden=true; } else if(G&&G.tutSteps) tutRefresh(); }   /* the training card only shows during play */
function goMenu(name){
  if(name==='menu'){ ui.mode='menu'; G=null; $('#hud').hidden=true; resize(); }
  if(name==='campaign') buildCampaign();
  if(name==='skirmish') buildSkirmish();
  if(name==='veterans') buildVeterans();
  if(name==='manual'){ $('#manual-ranks').innerHTML=rankCards(); const cur=SCREENS.find(x=>!$('#s-'+x).hidden); if(cur&&cur!=='manual'&&cur!=='intel') ui.manualFrom=cur; }
  if(name==='cenotaph') buildCenotaph();
  if(name==='trophies') buildTrophies();
  if(name==='intel'){ const cur=SCREENS.find(x=>!$('#s-'+x).hidden); if(cur&&cur!=='intel') ui.intelFrom=cur; buildIntel(); }
  show(name); syncDiff();
  const first=$('#s-'+name+' button'); if(first) first.focus({preventScroll:true});
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-go]'); if(b) goMenu(b.dataset.go); });
/* two campaigns: the Lunar Corps (MISSIONS) and the Swarm (SWARM_MISSIONS); the campaign screen shows one at a time */
function campList(){ return ui.campSide==='swarm'?SWARM_MISSIONS:MISSIONS; }
function isUnlocked(i){ const L=campList(); return i===0 || isDone(L[i-1].id); }
function buildCampaign(){
  const sw=ui.campSide==='swarm', L=campList(); $('#s-campaign').classList.toggle('swarm',sw);
  document.querySelectorAll('[data-side]').forEach(b=>{ const on=b.dataset.side===(sw?'swarm':'corps'); b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
  $('#camp-eyebrow').textContent=sw?'CAMPAIGN · THE SWARM':'CAMPAIGN · LUNAR CORPS'; $('#camp-title').textContent=sw?'The Long Hunger':'Operation Hollow Light';
  buildHero(); buildDefeatRow();
  $('#btn-vets').textContent=`Veterans (${ui.roster.active.length})`; $('#btn-ceno').textContent=`Cenotaph (${ui.roster.fallen.length})`;
  const doneN=L.filter(m=>isDone(m.id)).length; $('#camp-progress').textContent=`${doneN} of ${L.length} missions complete${sw?' · more to come':''}`;
  const tr=TRAINING[sw?'swarm':'corps'], trRes=tr&&ui.progress.results[tr.id];
  $('#mission-list').innerHTML=(tr?`<button class="mission training" type="button" data-mission="-1"><span class="num">00</span><span><div class="mt">${tr.title}</div><div class="ms">${tr.summary}</div></span><span class="st ${trRes?'done':''}">${trRes?'DONE':'TRAINING'}</span></button>`:'')+L.map((m,i)=>{ const res=ui.progress.results[m.id], done=!!res, un=isUnlocked(i);
    return `<button class="mission" type="button" data-mission="${i}" ${un?'':'aria-disabled="true" title="Finish the previous mission first (Shift-click to play anyway)"'}><span class="num">${String(i+1).padStart(2,'0')}</span><span><div class="mt">${m.title}</div><div class="ms">${m.summary} · ${MAPS[m.map].name}</div></span><span class="st ${done?'done':''}">${done?`COMPLETE<span class="badge d-${res.diff}">${DIFFICULTY[res.diff].label}</span>${res.time!=null?`<span class="best">${fmtTime(res.time)}</span>`:''}`:un?'READY':'LOCKED'}</span></button>`; }).join('');
}
/* On defeat: retry with the same soldiers (default) or real death */
function buildDefeatRow(){ const rd=!!ui.realDeath;
  document.querySelectorAll('[data-rd]').forEach(b=>{ const on=(b.dataset.rd==='1')===rd; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); });
  $('#defeat-row').classList.toggle('real',rd);
  $('#rd-note').innerHTML=rd?'<b>☠ Real death.</b> Whoever falls is gone and goes on the Cenotaph, also when you lose the mission. Survivors keep the experience they earned.'
    :'Lose a mission and the roster is restored: the same soldiers, with the experience they had, are ready for another try.'; }
$('#defeat-row').addEventListener('click',e=>{ const b=e.target.closest('[data-rd]'); if(!b) return; ui.realDeath=b.dataset.rd==='1'; store.set('hc-real-death',ui.realDeath); buildDefeatRow();
  toast(ui.realDeath?'Real death: the fallen are gone, win or lose.':'Retry: a lost mission does not cost you anyone.',true); });
/* Your own soldier: create him (name + type) on the campaign screen; rename him any time, change type until his first mission. */
let heroEdit=false, heroType=null, heroSex=null;
function buildHero(){
  const el=$('#hero-card'), h=heroOf();
  if(h && !heroEdit){ el.innerHTML=`<div class="lbl">Your soldier</div><div class="hrow"><img alt="" src="${iconUrl(h.type)}" style="width:28px;height:28px;image-rendering:pixelated"><span class="hname">★ ${RANKS[h.rank].abbr} ${h.name}</span><span class="rdim">${h.sex==='f'?'♀ Woman':'♂ Man'} · ${UNITS[h.type].name} · ${h.missions||0} mission${h.missions===1?'':'s'} · ${h.kills||0} kills</span><span style="flex:1"></span><button class="btn" type="button" id="hero-edit">Edit</button></div>`; return; }
  heroType=heroType||(h?h.type:'trooper'); heroSex=heroSex||(h&&h.sex)||'m'; const locked=h&&(h.missions||0)>0, P=f=>pron({sex:heroSex},f);
  el.innerHTML=`<div class="lbl">${h?'Edit your soldier':'Enlist your own soldier'}</div>
    <p class="lede" style="margin:0">${h?`Rename ${P('him')} any time. ${P('his').replace(/^./,c=>c.toUpperCase())} type is fixed once ${P('he')} has been on a mission.`:`Give ${P('him')} a name, pick man or woman (that sets the voice) and pick ${P('his')} job. ${P('He')} goes on every campaign mission, marked with a gold star, and earns rank like any veteran. If ${P('he')} falls, you can enlist a new one.`}</p>
    <div class="hrow"><input type="text" id="hero-name" maxlength="18" placeholder="Name" value="${h?h.name:''}" aria-label="Soldier name">
      <span class="hsex" role="group" aria-label="Man or woman"><button type="button" class="htype ${heroSex==='m'?'on':''}" data-hsex="m" aria-pressed="${heroSex==='m'}">♂ Man</button><button type="button" class="htype ${heroSex==='f'?'on':''}" data-hsex="f" aria-pressed="${heroSex==='f'}">♀ Woman</button></span></div>
    <div class="hrow">${HERO_TYPES.map(t=>`<button type="button" class="htype ${t===heroType?'on':''}" data-htype="${t}" ${locked&&t!==h.type?'disabled':''}><img alt="" src="${iconUrl(t)}">${UNITS[t].name}</button>`).join('')}</div>
    <div class="hrow"><button class="btn primary" type="button" id="hero-save">${h?'Save':'Enlist'}</button>${h?'<button class="btn" type="button" id="hero-cancel">Cancel</button>':''}</div>`;
}
$('#hero-card').addEventListener('click',e=>{
  if(e.target.closest('#hero-edit')){ heroEdit=true; heroType=null; heroSex=null; buildHero(); const i=$('#hero-name'); if(i) i.focus(); return; }
  if(e.target.closest('#hero-cancel')){ heroEdit=false; buildHero(); return; }
  const sx=e.target.closest('[data-hsex]'); if(sx){ heroSex=sx.dataset.hsex; const v=$('#hero-name').value; buildHero(); $('#hero-name').value=v; voiceSample(heroSex); return; }
  const t=e.target.closest('[data-htype]'); if(t&&!t.disabled){ heroType=t.dataset.htype; const v=$('#hero-name').value; buildHero(); $('#hero-name').value=v; return; }
  if(e.target.closest('#hero-save')){ const err=setHero($('#hero-name').value,heroType||'trooper',heroSex||'m'); if(err){ toast(err); return; } heroEdit=false; buildHero(); buildCampaign(); toast('Your soldier is on the roster.',true); }
});
$('#hero-card').addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='hero-name'){ e.preventDefault(); $('#hero-save').click(); } });
$('#mission-list').addEventListener('click',e=>{ const b=e.target.closest('[data-mission]'); if(!b) return; if(b.getAttribute('aria-disabled')==='true' && !e.shiftKey){ toast('Finish the previous mission first. Shift-click to play it anyway.',true); return; } openBriefing(+b.dataset.mission); });
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
  clearTimeout(vetArm); vetArm=null; ui.roster={active:[],fallen:[]}; saveRoster(); b.classList.remove('armed'); b.textContent='Reset veterans'; buildVeterans(); toast('All veterans and the Cenotaph erased.',true); });
/* The Cenotaph: every fallen veteran's name in stone. In zombie mode (Halloween) the fallen can be raised again. */
function buildCenotaph(){
  const R=ui.roster, z=ui.zombie;
  $('#s-cenotaph').classList.toggle('zombie',z);
  $('#zombie-row').innerHTML=`<button class="btn ${z?'on':''}" type="button" id="btn-zombie" aria-pressed="${z}">${z?'☠ Zombie mode on':'Zombie mode off'}</button>
    <p>${z?`Halloween: raise a fallen soldier and he rejoins the roster with his rank and kills. The risen have ${Math.round((RISEN.hp-1)*100)}% more health and heal themselves out of combat, but they shamble, a Medic cannot help them, and if they fall a second time they rest for good.`:'Halloween is coming. Switch on zombie mode to raise your fallen soldiers from the stone.'}</p>`;
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
/* Trophy wall: a plaque per role and difficulty column. Earned plaques carry every soldier who earned them; your own soldier's progress shows on his row. */
const CUP_SVG=`<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><rect x="4" y="2" width="8" height="6"/><rect x="5" y="8" width="6" height="1"/><rect x="6" y="9" width="4" height="1"/><rect x="7" y="10" width="2" height="2"/><rect x="5" y="12" width="6" height="1"/><rect x="4" y="13" width="8" height="2"/><rect x="1" y="3" width="3" height="1"/><rect x="1" y="4" width="1" height="2"/><rect x="2" y="6" width="2" height="1"/><rect x="12" y="3" width="3" height="1"/><rect x="14" y="4" width="1" height="2"/><rect x="12" y="6" width="2" height="1"/></svg>`;
function buildTrophies(){
  checkGrand(); const T=trophies(), hero=heroOf(), gs=grandStatus(), earned=Object.values(T).filter(l=>l&&l.length).length+(T['grand:corps']?1:0)+(T['grand:swarm']?1:0), total=HERO_TYPES.length*TROPHY_COLS.length+2;
  $('#troph-hero').innerHTML=hero?`<b>★ ${hero.name}</b> <span class="rdim"><img alt="" src="${iconUrl(hero.type)}">${UNITS[hero.type].name}</span> <span>${hero.tp&&hero.tp.void?'<span class="tvoid">Not on a trophy run: this soldier did not start at mission 1.</span>':TROPHY_COLS.map(c=>`${c.label} <b>${trophyProgress(hero,c.key)}/${MISSIONS.length}</b>`).join(' · ')}</span> <span class="tcount">${earned} / ${total} trophies</span>`
    :`<span>No soldier of your own yet. Name one on the campaign screen to start a trophy run.</span> <span class="tcount">${earned} / ${total} trophies</span>`;
  const head=`<div class="trow thead"><span></span>${TROPHY_COLS.map(c=>`<span>${c.label}${c.sub?`<i>${c.sub}</i>`:''}</span>`).join('')}</div>`;
  $('#trophy-wall').innerHTML=head+HERO_TYPES.map(t=>`<div class="trow"><span class="trole"><img alt="" src="${iconUrl(t)}">${UNITS[t].name}</span>${TROPHY_COLS.map(c=>{
      const list=T[t+':'+c.key]||[], mine=hero&&hero.type===t, p=mine?trophyProgress(hero,c.key):0;
      const tip=`${UNITS[t].name} · ${c.label}`;
      if(list.length) return `<div class="plaque won ${c.key}" title="${tip}">${CUP_SVG}<b>${list[0].name}</b><i>${new Date(list[0].at).toLocaleDateString()}${list.length>1?` · +${list.length-1} more`:''}</i></div>`;
      return `<div class="plaque ${mine&&p?'run':''}" title="${tip}">${CUP_SVG}${mine?`<i>${p} / ${MISSIONS.length}</i><span class="tbar"><span style="width:${Math.round(p/MISSIONS.length*100)}%"></span></span>`:'<i>not yet</i>'}</div>`; }).join('')}</div>`).join('')+
    `<div class="trow grand"><span class="trole">Grand</span>${[
      ['corps','Hollow Light','Every trophy of the Lunar Corps',`${gs.corps.have} / ${gs.corps.need} trophies`,gs.corps.have/gs.corps.need],
      ['swarm','The Long Hunger','Every Swarm mission on every difficulty',`Easy ${gs.swarm.easy} · Normal ${gs.swarm.normal} · Hard ${gs.swarm.hard} / ${gs.swarm.need}`,gs.swarm.need?(gs.swarm.easy+gs.swarm.normal+gs.swarm.hard)/(3*gs.swarm.need):0]
    ].map(([k,name,what,prog,f])=>{ const w=T['grand:'+k]; return `<div class="plaque grandp ${k} ${w?'won':''}" title="${name}|${what}">${CUP_SVG}<b>${name}</b><i>${what}</i><i>${w?new Date(w.at).toLocaleDateString():prog}</i>${w?'':`<span class="tbar"><span style="width:${Math.round(f*100)}%"></span></span>`}</div>`; }).join('')}</div>`;
}
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
  return intelCard(iconUrl(t),d.name,d.role,d.faction,d.desc,INTEL_NOTES[t],st,tags,perk); }
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
  return intelCard(iconUrl(t),d.name,`${d.size}×${d.size} structure`,d.faction,d.desc,INTEL_NOTES[t],st,tags,''); }
function intelCard(img,name,role,fac,desc,note,st,tags,perk){
  return `<article class="icard f-${fac}"><div class="pic"><img alt="" src="${img}"></div><h3>${name}</h3><div class="role">${role||''}</div>
    <p>${desc||''}</p>${note?`<p class="note">${note}</p>`:''}<dl>${st.join('')}</dl><div class="tags">${tags.filter(Boolean).map(x=>`<span>${x}</span>`).join('')}${perk}</div></article>`; }
function buildIntel(){
  $('#intel-tabs').innerHTML=INTEL_TABS.map(t=>`<button type="button" role="tab" class="${t.id==='swarm'?'swarm':''}" data-itab="${t.id}" aria-selected="${t.id===intelTab}">${t.name}</button>`).join('');
  const T=INTEL_TABS.find(t=>t.id===intelTab)||INTEL_TABS[0];
  /* list on the left, the full card of the selected entry on the right: no scrolling, however many entries a tab has */
  const items=[...(T.units||[]).map(id=>({id,u:true})),...(T.buildings||[]).map(id=>({id,u:false}))].filter(x=>x.u?UNITS[x.id]:BUILDINGS[x.id]);
  const sel=Math.min(intelSel[T.id]||0,items.length-1);
  $('#intel-list').innerHTML=items.map((x,i)=>{ const d=x.u?UNITS[x.id]:BUILDINGS[x.id];
    return `<button type="button" role="option" class="ili f-${d.faction} ${i===sel?'on':''}" data-isel="${i}" aria-selected="${i===sel}"><span class="pic"><img alt="" src="${iconUrl(x.id)}"></span><span><b>${d.name}</b><small>${x.u?(d.role||''):`${d.size}×${d.size} structure`}</small></span></button>`; }).join('');
  const it=items[sel]; $('#intel-grid').innerHTML=it?(it.u?intelUnit(it.id):intelBuilding(it.id)):'';
}
const intelSel={};
$('#intel-list').addEventListener('click',e=>{ const b=e.target.closest('[data-isel]'); if(!b) return; intelSel[intelTab]=+b.dataset.isel; buildIntel(); const nb=$(`[data-isel="${b.dataset.isel}"]`); if(nb) nb.focus({preventScroll:true}); });
$('#intel-list').addEventListener('keydown',e=>{ if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return; e.preventDefault(); const n=$('#intel-list').children.length, i=(intelSel[intelTab]||0)+(e.key==='ArrowDown'?1:-1);
  intelSel[intelTab]=(i+n)%n; buildIntel(); const nb=$(`[data-isel="${intelSel[intelTab]}"]`); if(nb) nb.focus({preventScroll:true}); });
$('#intel-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-itab]'); if(!b) return; intelTab=b.dataset.itab; buildIntel(); $(`[data-itab="${intelTab}"]`).focus(); });
$('#intel-tabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return; const i=INTEL_TABS.findIndex(t=>t.id===intelTab), n=INTEL_TABS.length;
  intelTab=INTEL_TABS[(i+(e.key==='ArrowRight'?1:n-1))%n].id; buildIntel(); $(`[data-itab="${intelTab}"]`).focus(); });
$('#intel-back').addEventListener('click',()=>goMenu(ui.intelFrom||'menu'));
let resetArm=null;
$('#btn-reset').addEventListener('click',()=>{ const b=$('#btn-reset');
  if(!resetArm){ b.classList.add('armed'); b.textContent='Click again to erase all progress'; resetArm=setTimeout(()=>{ resetArm=null; b.classList.remove('armed'); b.textContent='Reset campaign'; },4000); return; }
  clearTimeout(resetArm); resetArm=null; ui.progress={results:{}}; ui.roster={active:[],fallen:[]}; saveRoster(); store.set('hc-progress',ui.progress); b.classList.remove('armed'); b.textContent='Reset campaign'; buildCampaign(); toast('Campaign progress erased.',true); });
let briefIdx=0;
function briefMission(i){ return i<0?TRAINING[ui.campSide==='swarm'?'swarm':'corps']:campList()[i]; }
function openBriefing(i){ briefIdx=i; const m=briefMission(i), sw=m.side==='swarm';
  $('#b-eyebrow').textContent=`${sw?'THE SWARM · ':''}${m.training?'TRAINING':'MISSION '+(i+1)} · ${MAPS[m.map].name.toUpperCase()}`; $('#s-brief').classList.toggle('swarm',sw); $('#b-start').textContent=sw?'Wake':'Deploy'; $('#b-title').textContent=m.title;
  $('#b-text').innerHTML=m.briefing.map(p=>`<p>${p}</p>`).join('');
  const res=ui.progress.results[m.id]; $('#b-eyebrow').textContent+= res?` · COMPLETED ON ${DIFFICULTY[res.diff].label.toUpperCase()}`:'';
  const nv=sw?0:ui.roster.active.length; $('#b-text').innerHTML+= nv?`<p class="rdim">${nv} veteran${nv>1?'s':''} on the roster will join this mission: ${ui.roster.active.slice(0,6).map(v=>`${RANKS[v.rank].abbr} ${v.name}`).join(', ')}${nv>6?'…':''}.</p>`:'';
  if(sw) $('#b-text').innerHTML+=`<p class="rdim">Difficulty makes the Lunar Corps tougher: Easy ${Math.round(SWARM_DIFF.easy.hp*100)}%, Hard ${Math.round(SWARM_DIFF.hard.hp*100)}% health, and more reinforcements on Hard.</p>`;
  else if(ui.realDeath) $('#b-text').innerHTML+='<p class="rd-brief">☠ Real death is on: whoever falls in this mission is gone, even if you lose it.</p>';
  $('#b-obj').innerHTML=m.objectives.map(o=>`<li>${o.text}${o.optional?' (optional)':''}</li>`).join('');
  show('brief'); syncDiff(); $('#b-start').focus({preventScroll:true}); }
$('#b-start').addEventListener('click',()=>startMission(briefMission(briefIdx)));
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
function startMission(m){
  lastMission=m; newGame(m,ui.diff); G.realDeath=!!ui.realDeath && m.id!=='skirmish' && m.side!=='swarm'; $('#rd-badge').hidden=!G.realDeath; ui.mode='game'; ui.placing=null; ui.amove=false; cv.classList.remove('amove');
  show(null); const bt=$('#boot'); if(bt) bt.hidden=true; $('#hud').hidden=false; $('#tooltip').hidden=true; resize(); sizeMinimap();
  const cp=ptWorld(m.start.camera||'P'); centerOn(cp.x,cp.y);
  G.selDirty=true; G.objDirty=true; $('#btn-speed').textContent='1×'; setupSideHud(); ui.burrow=false; ui.rallyPick=false;
  if(G.side==='swarm'){ const r=ptWorld(m.start.rally||m.start.camera||'P'); if(r) G.swarm.rally=r; selectEntities([],false); }
  else selectEntities(G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'),false);
}
function pause(on){ if(!G||G.over) return; if(on) uiUsed('pause'); else uiUsed('resume'); G.paused=on; ui.mode=on?'pause':'game'; if(on){ $('#p-title').textContent=G.mission.title; show('pause'); $('#p-resume').focus({preventScroll:true}); } else show(null); }
$('#p-resume').addEventListener('click',()=>pause(false));
$('#p-manual').addEventListener('click',()=>goMenu('manual'));
$('#manual-back').addEventListener('click',()=>{ if(ui.manualFrom==='pause'&&G&&!G.over&&ui.mode==='pause'){ show('pause'); $('#p-resume').focus({preventScroll:true}); } else goMenu('menu'); });
/* Start fresh: wipe everything the game saved in this browser (hc-… keys), optionally also the custom maps, and reload */
let freshArm=null;
$('#btn-fresh').addEventListener('click',()=>{ const b=$('#btn-fresh');
  if(!freshArm){ b.classList.add('armed'); b.textContent='Click again to erase everything'; freshArm=setTimeout(()=>{ freshArm=null; b.classList.remove('armed'); b.textContent='Start fresh'; },4000); return; }
  clearTimeout(freshArm); const maps=$('#fresh-maps').checked, keepT=$('#fresh-troph').checked;
  try{ const keys=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('hc-')&&(maps||k!=='hc-custom-maps')&&(!keepT||k!=='hc-trophies')) keys.push(k); } keys.forEach(k=>localStorage.removeItem(k)); }catch(e){}
  location.reload(); });
$('#p-restart').addEventListener('click',()=>{ startMission(lastMission); });
$('#p-quit').addEventListener('click',()=>goMenu('menu'));
function showEnd(){
  const o=G.over, m=G.mission; ui.mode='end';
  $('#e-eyebrow').textContent=o.win?'MISSION COMPLETE':'MISSION FAILED';
  const t=$('#e-title'); t.textContent=o.win?'Victory':'Defeat'; t.className='h '+(o.win?'win':'lose');
  $('#e-text').textContent=o.text;
  if(o.win && m.id!=='skirmish'){ const r=ui.progress.results[m.id], pb=G.prevBest, up=pb&&DIFF_RANK[G.diffKey]>DIFF_RANK[pb.diff];
    $('#e-text').textContent+=` Completed on ${DIFFICULTY[G.diffKey].label}.${up?' New best difficulty!':pb&&pb.diff!==G.diffKey?` Your best remains ${DIFFICULTY[r.diff].label}.`:''}`; }
  const ev=$('#e-vets'); const rr=G.rosterResult, promoted=(rr&&rr.promoted)||[], hero=heroOf();
  const fallenAll=(rr&&(rr.fallenAll||rr.fallen))||[];
  if((o.win||G.realDeath) && m.id!=='skirmish' && m.side!=='swarm' && (promoted.length||(rr&&(rr.joined.length||fallenAll.length))||G.realDeath||(o.win&&heroOf()))){ ev.hidden=false;
    const star=n=>hero&&hero.name===n?'<span class="vstar">★</span> ':'';
    // one row per rank, highest first; names alphabetical within a rank
    const byRank=list=>{ const m2=new Map(); for(const v of list){ if(!m2.has(v.rank)) m2.set(v.rank,[]); m2.get(v.rank).push(v.name); }
      return [...m2.entries()].sort((a,b)=>b[0]-a[0]).map(([r,ns])=>`<div class="vrow"><span class="vrank">${RANKS[r].mark||'·'} ${RANKS[r].name}</span><span>${ns.sort((a,b)=>a.localeCompare(b)).map(n=>star(n)+n).join(', ')}</span></div>`).join(''); };
    const fallen=fallenAll.slice().sort((a,b)=>b.rank-a.rank||a.name.localeCompare(b.name));
    const tw=(rr&&rr.trophies)||[], run=o.win&&hero&&hero.tp?`<div class="vsec"><span class="lbl">Trophy run</span><div>★ ${hero.name} · ${UNITS[hero.type].name}: ${hero.tp.void?'not on a trophy run (did not start at mission 1).':TROPHY_COLS.map(c=>`${c.label} ${trophyProgress(hero,c.key)}/${MISSIONS.length}`).join(' · ')}</div></div>`:'';
    ev.innerHTML=(tw.length?`<div class="vsec troph"><span class="lbl">🏆 Trophy earned</span>${tw.map(w=>`<div>${w.name}: ${UNITS[w.type].name} · ${TROPHY_COLS.find(c=>c.key===w.col).label}. It hangs on the Trophy wall.</div>`).join('')}</div>`:'')+run+(G.realDeath?`<div class="vsec rd"><span class="lbl">☠ Real death</span><div>${o.win?'The fallen are gone for good.':'The mission is lost, and so are the fallen. Survivors keep their experience.'}</div></div>`:'')+(promoted.length?`<div class="vsec"><span class="lbl">Promotions</span>${byRank(promoted)}</div>`:'')+
      (rr&&rr.joined.length?`<div class="vsec"><span class="lbl">New on the roster</span>${byRank(rr.joined)}</div>`:'')+
      (fallen.length?`<div class="vsec fallen"><span class="lbl">Fallen</span>${fallen.map(v=>`<div class="vrow"><span class="vrank">${RANKS[v.rank].mark||'·'} ${RANKS[v.rank].name}</span><span>${v.hero?'<span class="vstar">★</span> ':''}${v.name} <i>${UNITS[v.type]?UNITS[v.type].name:''}${v.missions?` · ${v.missions} mission${v.missions>1?'s':''}`:''}${v.kills!=null?` · ${v.kills} kill${v.kills===1?'':'s'}`:''}</i></span></div>`).join('')}</div>`:''); }
  else if(!o.win && m.id!=='skirmish' && m.side!=='swarm' && G.fallenVets && Object.keys(G.fallenVets).length){ ev.hidden=false;   /* retry: show who fell, but nobody is lost */
    ev.innerHTML=`<div class="vsec"><span class="lbl">Retry</span><div>The roster is restored for another try. These soldiers fell, but they are not lost: ${Object.values(G.fallenVets).map(f=>`${RANKS[f.rank||0].abbr} ${f.name}`).sort().join(', ')}.</div></div>`; }
  else ev.hidden=true;
  if(G.grandWon&&G.grandWon.length){ const html=`<div class="vsec troph"><span class="lbl">🏆 Grand trophy</span>${G.grandWon.map(k=>`<div>${k==='corps'?'Hollow Light: every trophy of the Lunar Corps.':'The Long Hunger: every Swarm mission on every difficulty.'} It hangs on the Trophy wall.</div>`).join('')}</div>`;
    if(ev.hidden){ ev.hidden=false; ev.innerHTML=html; } else ev.innerHTML=html+ev.innerHTML; }
  const S=G.stats; $('#e-stats').innerHTML=(G.side==='swarm'?[['Time',fmtTime(G.time)],['Soldiers killed',S.kills],['Brood lost',S.lost],['Hives lost',S.hives],['Bodies brought home',S.fed||0],['Cocoons',S.cocoons]]:[['Time',fmtTime(G.time)],['Swarm killed',S.kills],['Losses',S.lost],['Hives burned',S.hives],['Salvage crates',S.crates],['Reinforcements',S.trained]]).map(([a,b])=>`<div><span class="lbl">${a}</span><b>${b}</b></div>`).join('');
  const LM=m.side==='swarm'?SWARM_MISSIONS:MISSIONS, idx=m.training?-1:LM.indexOf(m); let btns=''; if(idx>=0||m.training) ui.campSide=m.side==='swarm'?'swarm':'corps';
  if(o.win && (m.training||idx>=0) && idx<LM.length-1) btns+=`<button class="btn primary" type="button" id="e-next">Next mission</button>`;
  btns+=`<button class="btn ${o.win&&(m.training||idx>=0)&&idx<LM.length-1?'':'primary'}" type="button" id="e-retry">${o.win?'Play again':'Retry'}</button><button class="btn" type="button" id="e-menu">Main menu</button>`;
  $('#e-buttons').innerHTML=btns; show('end');
  $('#e-next')?.addEventListener('click',()=>openBriefing(idx+1));
  $('#e-retry').addEventListener('click',()=>startMission(lastMission));
  $('#e-menu').addEventListener('click',()=>goMenu('menu'));
  ($('#e-next')||$('#e-retry')).focus({preventScroll:true});
}
