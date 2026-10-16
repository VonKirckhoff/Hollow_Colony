'use strict';
/* ---------- 2q. HUD ---------- */
const fmtTime=s=>{ s=Math.max(0,Math.floor(s)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
function hudTick(){
  if(!G) return;
  const s=supply();
  $('#r-salvage').textContent=Math.floor(G.salvage);
  const bb=$('#bossbar'), B=G.boss; if(B && !B.dead && B.awake){ bb.hidden=false; $('#boss-name').textContent=`${G.bossTitle.toUpperCase()}${B.bossState&&B.bossState.phase?' · PHASE '+(B.bossState.phase+1):''}`; $('#boss-hp').style.width=(clamp(B.hp/B.maxHp,0,1)*100)+'%'; } else bb.hidden=true;
  const mine=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'&&!e.def.convoy); const capT=troopCap(); $('#r-troops').textContent=capT<Infinity?`${troopCount()}/${capT}`:mine.length; $('#r-troops').classList.toggle('warn',capT<Infinity&&troopCount()>=capT);
  const per={}; for(const u of mine) per[u.def.name]=(per[u.def.name]||0)+1;
  $('#r-troops-wrap').dataset.tip='Troops on the field|'+(Object.entries(per).map(([k,v])=>`${v}× ${k}`).join(', ')||'None');
  $('#r-supply-wrap').hidden=!!(G.mission.noTraining||G.mission.landingZone);   // with a Landing Zone the troop limit replaces supply
  const sup=$('#r-supply'); sup.textContent= s.cap>0 ? `${s.used}/${s.cap}` : '—'; sup.classList.toggle('warn',s.cap>0&&s.used>=s.cap);
  $('#clock').textContent=fmtTime(G.time);
  const tw=$('#r-timer-wrap'); if(G.timer){ tw.hidden=false; $('#r-timer-lbl').textContent=G.timer.label; $('#r-timer').textContent=fmtTime(G.timer.end-G.time); } else tw.hidden=true;
  if(G.objDirty){ G.objDirty=false; $('#obj-list').innerHTML=G.objectives.filter(o=>o.state!=='hidden').map(o=>`<li class="${o.state}"><span class="box"></span><span>${o.text}${o.optional?'<span class="opt">OPTIONAL</span>':''}</span></li>`).join(''); }
  const live=G.msgs.filter(m=>G.time-m.born<m.life);
  if(G.msgDirty||live.length!==G.msgs.length){ G.msgs=live; G.msgDirty=false;
    $('#comms').innerHTML=live.map(m=>`<div class="msg ${m.kind}"><span class="who">${m.who.toUpperCase()}</span><span class="txt">${m.text}</span></div>`).join(''); }
  G.hudT-=1; if(G.selDirty||G.hudT<=0){ G.hudT=8; G.selDirty=false; renderSelection(); renderCmdCard(); }
  renderMinimap();
}
function primaryGroup(){
  const units=G.sel.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.def.convoy), blds=G.sel.filter(e=>e.kind==='building'&&e.faction==='corps');
  return {units,blds};
}
function renderSelection(){
  const el=$('#selection'); const sel=G.sel.filter(e=>!e.dead);
  if(!sel.length){ el.innerHTML=`<div class="lbl" style="margin-bottom:6px">${G.mission.title} · ${G.map.name}</div><div class="hint">Drag to select units. <kbd>Right-click</kbd> to move or attack, <kbd>A</kbd> + click to attack-move. Walk over crates to collect salvage.</div>`; return; }
  if(sel.length===1){ const e=sel[0], d=e.def, img=iconUrl(e.type), f=clamp(e.hp/e.maxHp,0,1);
    let stats='';
    if(e.kind==='unit'){ stats = d.heal ? `<span>Heal <b>${d.heal}/s</b></span><span>Range <b>${d.healRange}</b></span>` : d.damage ? `<span>Damage <b>${d.damage}</b></span><span>Range <b>${d.range}</b></span><span>Rate <b>${(1/d.cooldown).toFixed(1)}/s</b></span>` : '';
      stats+=`<span>Speed <b>${Math.round(speedOf(e))}</b></span>`; if(e.def.convoy) stats+=`<span>Status <b>${e.arrived?'Arrived':!G.convoy||!G.convoy.go?'Waiting to depart':e.halted?'Halted, enemies near':e.waiting?'Keeping distance':'Driving'}</b></span>`; if(e.carry) stats+=`<span>Carrying <b>${BUILDINGS[e.carry.type].name}</b></span>`; }
    else { if(d.supply) stats+=`<span>Supply <b>+${d.supply}</b></span>`; if(d.income) stats+=`<span>Income <b>${d.income}/s</b></span>`; if(d.damage) stats+=`<span>Damage <b>${d.damage}</b></span><span>Range <b>${d.range}</b></span>`;
      if(e.type==='cocoon') stats+=`<span>Hatches in <b>${Math.max(0,e.hatchT).toFixed(1)}s</b></span>`; if(!e.built) stats+=`<span>Built <b>${Math.floor(e.progress*100)}%</b></span>`; }
    if(e.vet){ const nx=RANKS[e.vet.rank+1]; stats+=`<span>Rank <b>${RANKS[e.vet.rank].name}</b></span><span>XP <b>${e.vet.xp}${nx?' / '+nx.xp:''}</b></span><span>Kills <b>${e.vet.kills}</b></span>${e.vet.missions?`<span>Missions <b>${e.vet.missions}</b></span>`:''}`; }
    if(e.def.capture) stats+=`<span>Status <b>${e.owned?'Secured':'Not secured'}</b></span><span>Control <b>${Math.round((e.cap||0)*100)}%</b></span><span>Now <b>${({ours:'capturing',theirs:'Swarm taking it',contested:'contested',idle:'quiet'})[e.state||'idle']}</b></span>`;
    if(e.def.reinforce){ const fl=e.flight; stats+= fl ? `<span>Dropship <b>${fl.cargo.length} aboard, ${Math.ceil(fl.t)}s</b></span>` : `<span>Dropship <b>standing by</b></span>`; if(troopCap()<Infinity) stats+=`<span>Troops <b>${troopCount()}/${troopCap()}</b></span>`; }
    if(e.def.reinforce && e.flight){ stats+='<div class="queue">'+e.flight.cargo.map(t=>`<div class="qslot" data-tip="${UNITS[t].name}|On the dropship."><img alt="" src="${iconUrl(t)}"><i style="width:${Math.floor((1-e.flight.t/e.flight.total)*100)}%"></i></div>`).join('')+'</div>'; }
    if(e.def.trains && G.mission.noTraining) stats+=`<span><b>Reinforcements come in through the Landing Zone.</b></span>`;
    let q=''; if(e.def.trains && e.faction==='corps' && !G.mission.noTraining){ q='<div class="queue">'+e.queue.map((t,i)=>`<div class="qslot" data-cancel="${i}" data-tip="${UNITS[t].name}|Click to cancel and refund ${UNITS[t].cost}."><img alt="" src="${iconUrl(t)}">${i===0?`<i style="width:${Math.floor(e.prodT/UNITS[t].buildTime*100)}%"></i>`:''}</div>`).join('')+'</div>'; }
    el.innerHTML=`<div class="sel-single"><div class="portrait"><img alt="" src="${img}"></div><div style="min-width:0"><div class="sel-name">${e.vet?`${RANKS[e.vet.rank].abbr} ${e.vet.name} <span class="sel-sub">${d.name}</span>`:d.name}</div><div class="sel-role">${d.role||''}${d.role?' · ':''}${d.desc||''}</div><div class="hpbar"><i style="width:${f*100}%;background:${hpColor(f)}"></i></div><div class="stats">${d.ground?"":`<span>HP <b>${Math.ceil(e.hp)}/${Math.round(e.maxHp)}</b></span>`}${stats}</div>${q}</div></div>`;
    return; }
  // grouped by type, always in the same order, so it is easy to see what the squad is made of
  const groups=new Map(); for(const e of sel){ if(!groups.has(e.type)) groups.set(e.type,[]); groups.get(e.type).push(e); }
  const order=[...groups.keys()].sort((a,b)=>(TYPE_ORDER.indexOf(a)+1||99)-(TYPE_ORDER.indexOf(b)+1||99));
  el.innerHTML='<div class="sel-groups">'+order.map(type=>{ const list=groups.get(type).sort((a,b)=>(b.xp||0)-(a.xp||0)||a.id-b.id);
    return `<div class="sel-group"><div class="sel-ghead" data-type="${type}" data-tip="${list[0].def.name}|Click to select only these.">${list[0].def.name}<b>${list.length}</b></div><div class="sel-gcells">`+
      list.map(e=>`<div class="sel-cell" data-only="${e.id}" data-tip="${unitTitle(e)}|Click to select only this one."><img alt="" src="${iconUrl(e.type)}">${rankBadge(e)}<i><s style="width:${clamp(e.hp/e.maxHp,0,1)*100}%;background:${hpColor(e.hp/e.maxHp)}"></s></i></div>`).join('')+'</div></div>'; }).join('')+'</div>';
}
function cmdButtons(){
  const {units,blds}=primaryGroup(); const out=[];
  if(ui.placing){ out.push({row:'Placing',key:'Esc',glyph:'✕',tip:'Cancel|Stop placing the building.',act:()=>{ui.placing=null;G.selDirty=true;}}); return out; }
  if(units.length){
    out.push({row:'Orders',key:'A',glyph:'⚔',tip:'Attack-move|Move and engage any enemy on the way.',act:()=>{ui.amove=true;cv.classList.add('amove');G.selDirty=true;},active:ui.amove});
    out.push({row:'Orders',key:'S',glyph:'■',tip:'Stop|Cancel current orders.',act:cmdStop});
    out.push({row:'Orders',key:'H',glyph:'⛉',tip:'Hold position|Stay put and only fire at targets in range.',act:cmdHold});
    if(units.length>1){ const cur=units[0].formation, all=cur&&units.every(u=>u.formation===cur);
      for(const [shape,f] of Object.entries(FORMATIONS)) out.push({row:'Formation',key:f.key,glyph:f.glyph,active:all&&cur.shape===shape,
        tip:`${f.name} formation|Medics, Engineers and escorts in the centre. The squad keeps this shape on every move. Press again to release.`,act:()=>setFormation(shape)}); }
    const eng=units.filter(u=>u.def.builder);
    const lim=t=>limitOf(t)===Infinity?'':` (${fielded(t)}/${limitOf(t)} in the field)`;
    if(eng.some(e=>e.carry)) out.push({row:'Sentry',key:'D',img:ARTURL.sentry,off:atLimit('sentry'),cost:limitOf('sentry')===Infinity?0:`${fielded('sentry')}/${limitOf('sentry')}`,tip:`Deploy sentry|Set up the carried Sentry Gun. Takes 3 seconds and keeps its damage.${lim('sentry')}`,act:()=>startPlacing('sentry',true)});
    const free=eng.filter(e=>!e.carry);
    if(free.length){ for(const bt of free[0].def.builds){ const d=BUILDINGS[bt];
      out.push({row:'Build',key:d.key,img:ARTURL[d.art],cost:d.cost,off:G.salvage<d.cost||atLimit(bt),tip:`${d.name}|${d.desc} Cost ${d.cost}.${lim(bt)}`,act:()=>startPlacing(bt)}); }
      out.push({row:'Sentry',key:'U',glyph:'⇪',active:ui.picking==='pack',off:!G.ents.some(e=>e.type==='sentry'&&e.built&&!e.dead&&e.faction==='corps'),tip:'Pack up sentry|Then click one of your Sentry Guns. The Engineer folds it up and carries it, but walks slower. Right-clicking an undamaged sentry does the same.',
        act:()=>{ ui.picking='pack'; ui.placing=null; ui.amove=false; cv.classList.add('amove'); G.selDirty=true; }}); }
    return out; }
  if(blds.length){ const b=blds[0];
    if(b.def.reinforce && b.built){ const cap=troopCap(), full=troopCount()>=cap, fl=b.flight;
      for(const t of b.def.orders){ const d=UNITS[t]; out.push({row:'Dropship',key:d.key,img:iconUrl(t),cost:d.cost,off:G.salvage<d.cost||full||(fl&&fl.cargo.length>=(b.def.cargo||6)),
        tip:`Order ${d.name}|${d.desc} Cost ${d.cost}. Delivered by dropship.${cap<Infinity?` Troops: ${troopCount()}/${cap}.`:''}`,act:()=>orderDrop(b,t)}); } }
    if(b.def.trains && b.built && !G.mission.noTraining){ const s=supply(); for(const t of b.def.trains){ const d=UNITS[t];
      out.push({row:'Train',key:d.key,img:iconUrl(t),cost:d.cost,off:G.salvage<d.cost||(!G.mission.landingZone&&s.used+d.supply>s.cap)||troopCount()>=troopCap(),tip:`${d.name}|${d.desc} Cost ${d.cost}, supply ${d.supply}.`,act:()=>{ for(const x of blds) if(x.def.trains){ train(x,t); break; } }}); } } }
  return out;
}
let CMDS=[];
const TYPE_ORDER=['trooper','gunner','pyro','medic','engineer','scientist','habitat','sentry','relay','barricade'];
function unitTitle(e){ return e.vet ? `${RANKS[e.vet.rank].abbr} ${e.vet.name} · ${e.def.name}` : e.def.name; }
function rankBadge(e){ return e.vet&&e.vet.rank>0 ? `<span class="rank">${RANKS[e.vet.rank].mark}</span>` : ''; }
const CMD_ROWS=['Orders','Formation','Build','Sentry','Train','Dropship','Placing'];
function renderCmdCard(){ CMDS=cmdButtons();
  const btn=(c,i)=>`<button type="button" class="cmd ${c.off?'off':''} ${c.active?'active':''}" data-cmd="${i}" data-tip="${c.tip}">${c.img?`<img alt="" src="${c.img}">`:`<span class="glyph">${c.glyph}</span>`}<span class="key">${c.key}</span>${c.cost?`<span class="cost">${c.cost}</span>`:''}</button>`;
  $('#cmdcard').innerHTML=CMD_ROWS.map(r=>{ const items=CMDS.map((c,i)=>[c,i]).filter(([c])=>(c.row||'Orders')===r); if(!items.length) return '';
    return `<div class="cmdrow"><span class="cmdlbl">${r}</span><div class="cmdbtns">${items.map(([c,i])=>btn(c,i)).join('')}</div></div>`; }).join(''); }
