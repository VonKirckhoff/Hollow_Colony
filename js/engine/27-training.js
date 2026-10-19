'use strict';
/* ---------- 2x. training missions and playing a single creature ----------
   TUTORIAL (defined in js/content/missions/_missions.js so mission files can use it): tutorial([ step, step, … ]).
     step = { say:'what the instructor says' (shown on a card; the game waits until the player confirms it), obj:'short objective', who:'speaker', mark:point, markLabel:'',
              keys:['A','H'] (command buttons to light up), hl:['#minimap-wrap'] (other parts of the screen to light up),
              setup:g=>{…} (when the step starts), done:g=>bool (checked 4× per second), pause:seconds before the next step }
     The objective 'tut' shows "Step 3/12: …". Press N to skip a step (training missions only).
   AVATAR: in a Swarm mission the player can steer one creature through its whole life (G.avatar):
     a Grafter from an egg → latches onto a body → cocoon → Twitcher → Shambler → Husk → a new hive.
     Twitcher: grows by feeding (AVATAR.food kills; a soldier counts double). Shambler: grows by staying hidden
     (no soldier within HUSK.hide tiles for AVATAR.hide seconds). Husk: F takes root at a quiet spot. */
const AVATAR = { food:3, hide:10, rootClear:9, rootSpacing:12, root:12 };   /* root: seconds your own Husk needs to take root */
/* ---- the avatar: one creature you steer through its life ---- */
function avatarAlive(){ const a=G.avatar; return !!a && !a.dead; }
function avatarStage(){ const a=G.avatar; if(!a||a.dead) return 'dead'; if(a.type==='egg') return 'egg'; if(a.type==='grafter') return 'grafter'; if(a.type==='cocoon') return 'cocoon';
  if(a.type==='hive') return 'hive'; if(a.rootT!=null) return 'rooting'; return ['twitcher','shambler','husk'][a.stage||0]; }
function setAvatar(e){ G.avatar=e; e.avatar=true; if(e.kind==='unit'){ selectEntities([e],false); G.following=true; } G.selDirty=true; }
/* a Grafter you steer: walk where you click; on a body at home it latches on */
function avatarGrafter(u,dt){ if(u.latched) return;
  if(u.order&&u.order.type==='move'){ if(stepMove(u,dt)) u.order=null; }
  const b=nearestOf(u,e=>e.kind==='body'&&!e.dead&&e.home); u.graft=b&&Math.hypot(b.x-u.x,b.y-u.y)<TILE*1.1?b:null;
  if(!u.graft&&b&&Math.hypot(b.x-u.x,b.y-u.y)<TILE*2.5&&!(u.order&&u.order.type==='move')){ goTo(u,b.x,b.y,dt,0.6); } }
/* growing up when you steer it: the Twitcher has to feed, the Shambler has to stay hidden */
function avatarReady(u,dt){
  if(u.stage===0) return (u.food||0)>=AVATAR.food;
  if(u.stage===1){ const n=nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit'&&!e.downed);
    if(n&&dist(u,n)<HUSK.hide*TILE){ if((u.hidden2||0)>0.5&&isVisible(u)) toast('Seen! Get away from them.',true); u.hidden2=0; } else u.hidden2=(u.hidden2||0)+dt;
    return u.hidden2>=AVATAR.hide; }
  return false; }
function avatarFed(src,e){ if(!src||!src.avatar) return; src.food=(src.food||0)+(e.faction==='corps'?2:1); src.hp=Math.min(src.maxHp,src.hp+src.maxHp*0.25);
  G.fx.push({k:'text',x:src.x,y:src.y-26,t:1,max:1,txt:'FED',col:'#a6ff4a'}); G.selDirty=true; }
/* F: the finished Husk takes root where it stands, if nobody is near and no other hive is close */
function avatarRoot(){ const u=G.avatar; if(!avatarAlive()||u.kind!=='unit'||u.stage!==HUSK_STAGES.length-1||u.rootT!=null) return;
  const tx=Math.floor(u.x/TILE), ty=Math.floor(u.y/TILE);
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(!walkableT(tx+dx,ty+dy)){ toast('Not enough open ground here: a hive needs room.'); return; }
  if(G.ents.some(e=>!e.dead&&e.faction==='corps'&&(e.kind==='unit'||e.kind==='building')&&!e.def.ground&&dist(e,u)<AVATAR.rootClear*TILE)){ toast(`They are too close. Find a spot ${AVATAR.rootClear} tiles from them.`); return; }
  if(hives().some(h=>dist(h,u)<AVATAR.rootSpacing*TILE)){ toast(`Too close to another hive: keep ${AVATAR.rootSpacing} tiles away.`); return; }
  if(hives().length>=hiveMax()){ toast(`There are already ${hiveMax()} hives: the ground cannot feed more.`); return; }
  u.site={x:tx,y:ty}; u.x=(tx+.5)*TILE; u.y=(ty+.5)*TILE; u.rootT=u.rootMax=AVATAR.root; u.order={type:'hold'}; u.path=null; u.target=null;
  SFX.play('squelch',u.x,u.y); G.pings.push({x:u.x,y:u.y,t:0,col:'#c38bff'}); say('The Brood','We root. Hold on until the nest is grown.','swarm'); G.selDirty=true; }
function avatarButtons(){ const u=G.avatar; if(!avatarAlive()||u.kind!=='unit') return [];
  const st=avatarStage(), out=[];
  if(st==='husk') out.push({row:'Avatar',key:'F',glyph:'⚘',tip:`Take root|Grow a new hive right here. Needs open ground, no soldier within ${AVATAR.rootClear} tiles and no hive within ${AVATAR.rootSpacing}. Rooting takes ${AVATAR.root} seconds and you cannot move.`,act:avatarRoot});
  out.push({row:'Avatar',key:'X',glyph:'◎',tip:'Find me|Centre the camera on your creature.',act:()=>{ centerOn(u.x,u.y); G.following=true; }});
  return out; }

/* ---- the training card: the instructor's words stay on screen until you confirm them (Enter, Space or the button) ---- */
function tutShow(who,text,i,n){ G.tutHold=true; const c=$('#tut-card'); if(!c) return;
  $('#tut-who').textContent=who; $('#tut-text').innerHTML=text.replace(/\[([^\]]+)\]/g,'<kbd>$1</kbd>');
  $('#tut-step').textContent=`Step ${i} of ${n}`; c.hidden=false; c.classList.toggle('swarm',G.side==='swarm'); SFX.play('radio'); }
function tutConfirm(){ if(!G||!G.tutHold) return false; G.tutHold=false; const c=$('#tut-card'); if(c) c.hidden=true; SFX.play('ack'); return true; }
/* light up command buttons (by key) and parts of the screen (by selector) */
function tutHighlight(st){ document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));
  G.tutHL=st&&(st.keys||st.hl)?{ keys:(st.keys||[]).map(k=>k.toLowerCase()), sel:st.hl||[] }:null; G.selDirty=true; tutApplyHighlight(); }
function tutApplyHighlight(){ const H=G&&G.tutHL; if(!H) return; for(const s of H.sel) document.querySelectorAll(s).forEach(e=>e.classList.add('tut-hl')); }
