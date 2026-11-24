'use strict';
/* ---------- 2x. training missions and playing a single creature ----------
   TUTORIAL (defined in js/content/missions/_missions.js so mission files can use it): tutorial([ step, step, … ]).
     step = { say:'what the instructor says' (shown on a card; the game waits until the player confirms it), obj:'short objective', who:'speaker', mark:point, markLabel:'',
              keys:['A','H'] (command buttons to light up), hl:['#minimap-wrap'] (other parts of the screen to light up),
              setup:g=>{…} (when the step starts), done:g=>bool (checked 4× per second), pause:seconds before the next step }
     The objective 'tut' shows "Step 3/12: …". Press N to skip a step (training missions only). The card does not pause the game.
   AVATAR: in a Swarm mission the player can steer one creature through its whole life (G.avatar):
     a Grafter from an egg → latches onto a body → cocoon → Shambler → Husk (a warrior, it never roots).
     Shambler: grows by staying hidden (no soldier within HUSK.hide tiles for AVATAR.hide seconds). A kill heals it a quarter. Husk: the old nest lays a Seedling (u.graftSeed) for it to guard;
     the Seedling takes root with F (SWARM_PLAY.seed rules) into the new nest. Moving the selected Seedling, your Husk follows it.
   AVATAR.seedAgain: seconds before the nest lays a new Seedling when one dies · seedSpare: how many new ones (Normal; Easy +1, Hard −1)
     · follow: tiles the Husk keeps from the Seedling it follows · guard: tiles round the Seedling where the following Husk takes on a foe */
const AVATAR = { hide:10, seedAgain:30, seedSpare:2, follow:2.5, guard:5 };
/* ---- the avatar: one creature you steer through its life ---- */
function avatarAlive(){ const a=G.avatar; return !!a && !a.dead; }
function avatarStage(){ const a=G.avatar; if(!a||a.dead) return 'dead'; if(a.type==='egg') return 'egg'; if(a.type==='grafter') return 'grafter'; if(a.type==='cocoon') return 'cocoon';
  if(a.type==='hive') return 'hive'; return ['shambler','husk'][a.stage||0]; }
function setAvatar(e){ G.avatar=e; e.avatar=true; if(e.kind==='unit'){ selectEntities([e],false); G.following=true; } G.selDirty=true; }
/* a Grafter you steer: walk where you click; on a body at home it latches on */
function avatarGrafter(u,dt){ if(u.latched) return;
  if(u.order&&u.order.type==='move'){ if(stepMove(u,dt)) u.order=null; }
  const b=nearestOf(u,e=>e.kind==='body'&&!e.dead&&e.home); u.graft=b&&Math.hypot(b.x-u.x,b.y-u.y)<TILE*1.1?b:null;
  if(!u.graft&&b&&Math.hypot(b.x-u.x,b.y-u.y)<TILE*2.5&&!(u.order&&u.order.type==='move')){ goTo(u,b.x,b.y,dt,0.6); } }
/* growing up when you steer it: the Shambler has to stay hidden */
function avatarReady(u,dt){
  if(u.stage===0){ const n=nearestOf(u,e=>e.faction==='corps'&&e.kind==='unit'&&!e.downed);
    if(n&&dist(u,n)<HUSK.hide*TILE){ if((u.hidden2||0)>0.5&&isVisible(u)) toast('Seen! Get away from them.',true); u.hidden2=0; } else u.hidden2=(u.hidden2||0)+dt;
    return u.hidden2>=AVATAR.hide; }
  return false; }
function avatarFed(src,e){ if(!src||!src.avatar) return; src.hp=Math.min(src.maxHp,src.hp+src.maxHp*0.25);
  G.fx.push({k:'text',x:src.x,y:src.y-26,t:1,max:1,txt:'FED',col:'#a6ff4a'}); G.selDirty=true; }
/* The Graft: the Seedling the old nest lays for your Husk (alive, not yet rooting) and its F button */
function graftSeedling(){ return G.ents.find(e=>!e.dead&&e.graftSeed)||null; }
function graftSeedSpare(){ return Math.max(0,AVATAR.seedSpare+(G.diffKey==='easy'?1:G.diffKey==='hard'?-1:0)); }
/* your own creature's buttons (Take root, Find me). They sit in the Orders row and, in a mission with a creature of your own
   (mission.avatar), stay there the whole mission, greyed out when they do nothing, so no button ever shifts (Nov 2026). */
function avatarButtons(){ const u=G.avatar, out=[], sd=graftSeedling(), fixed=!!(G.mission&&G.mission.avatar);
  if(sd||fixed){ const sel=!!sd&&G.sel.includes(sd)&&sd.rootT==null, SD=SWARM_PLAY.seed;
    out.push({row:'Orders',key:'F',glyph:'✣',off:!sel,tip:`Take root|${!sd?'There is no Seedling yet. ':sd.rootT!=null?'The Seedling is digging in. Guard it. ':sel?'':'Select the Seedling first. '}The Seedling digs in where it stands and grows into your nest in ${SD.root} s: open ground, at least ${SD.clear} tiles from the Lunar Corps and ${SD.gap} from any other nest. It cannot move while it roots.`,act:()=>{ if(sd&&G.sel.includes(sd)&&sd.rootT==null) seedRoot(sd); }}); }
  const on=avatarAlive()&&u.kind==='unit';
  if(on||fixed) out.push({row:'Orders',key:'X',glyph:'◎',off:!on,tip:`Find me|${on?'':'Your creature is not out walking right now. '}Centre the camera on your creature.`,act:()=>{ if(avatarAlive()&&G.avatar.kind==='unit'){ centerOn(G.avatar.x,G.avatar.y); G.following=true; } }});
  return out; }

/* ---- the training card: it stays on screen until you close it (Enter or the button), but the game keeps running,
   so you can try things out while you read. ◀ ▶ page through the earlier steps; "Practice again" runs that step once more.
   Closed, a "Tips" tab at the top brings it back. ---- */
/* the card sits top right; drag it by its label anywhere you like (remembered in hc-tutpos, double-click the label to put it back) */
function tutPlace(){ const c=$('#tut-card'), p=store.get('hc-tutpos',null); if(!c) return;
  if(p){ c.style.left=Math.max(0,Math.min(innerWidth-80,p.x))+'px'; c.style.top=Math.max(48,Math.min(innerHeight-60,p.y))+'px'; c.style.right='auto'; } else { c.style.left=''; c.style.top=''; c.style.right=''; } }
(()=>{ const who=$('#tut-who'); if(!who) return; let drag=null;
  who.addEventListener('pointerdown',e=>{ const r=$('#tut-card').getBoundingClientRect(); drag={dx:e.clientX-r.left,dy:e.clientY-r.top}; who.setPointerCapture(e.pointerId); e.preventDefault(); });
  who.addEventListener('pointermove',e=>{ if(!drag) return; store.set('hc-tutpos',{x:e.clientX-drag.dx,y:e.clientY-drag.dy}); tutPlace(); });
  who.addEventListener('pointerup',()=>{ drag=null; });
  who.addEventListener('dblclick',()=>{ try{ localStorage.removeItem('hc-tutpos'); }catch(e){} tutPlace(); });
  addEventListener('resize',tutPlace); tutPlace(); })();
function tutShow(i){ const V=G.vars; V.cardOpen=true; V.cardView=i; tutRefresh(); SFX.play('radio'); }
function tutRefresh(){ const c=$('#tut-card'), V=G&&G.vars, S=G&&G.tutSteps; if(c&&!S){ c.hidden=true; $('#tut-open').hidden=true; } if(!c||!S) return;   /* no training in this mission: no card */ const i=V.cardView??V.tutI, st=S[i]; if(!st) return;
  const cur=i===V.tutI, done=cur&&V.stepDone;
  c.hidden=!V.cardOpen; $('#tut-open').hidden=!!V.cardOpen||!G.mission.training||!!G.over; c.classList.toggle('swarm',G.side==='swarm'); c.classList.toggle('past',!cur); c.classList.toggle('done',!!done);
  $('#tut-who').textContent=(st.who||TUT_VOICE[G.side])+(cur?'':' · earlier tip');
  $('#tut-text').innerHTML=(st.say||st.obj||'').replace(/\[([^\]]+)\]/g,'<kbd>$1</kbd>');
  $('#tut-step').textContent=done?`✓ Step ${i+1} done`:`Step ${i+1} of ${S.length}`;
  $('#tut-prev').disabled=i<=0; $('#tut-next').disabled=i>=V.tutI;
  $('#tut-practice').hidden=cur||V.returnTo!=null||i>=S.length-1;
  $('#tut-ok').innerHTML=cur?(done?'Next step <kbd>Enter</kbd>':'Got it <kbd>Enter</kbd>'):'Back to now <kbd>Enter</kbd>'; }
/* Enter / the button: on an earlier tip it jumps back to the current one; on the current one it closes the card */
function tutConfirm(){ const V=G&&G.vars; if(!V||!V.cardOpen) return false;
  if((V.cardView??V.tutI)!==V.tutI){ V.cardView=V.tutI; tutRefresh(); return true; }
  V.cardOpen=false; tutRefresh(); SFX.play('ack'); return true; }
function tutPage(d){ const V=G.vars; V.cardView=clamp((V.cardView??V.tutI)+d,0,V.tutI); tutRefresh(); }
function tutReopen(){ const V=G.vars; V.cardOpen=true; V.cardView=V.tutI; tutRefresh(); }
/* practise an earlier step once more, then come back */
function tutPractice(){ const V=G.vars, i=V.cardView; if(i==null||i>=V.tutI) return; g_unmarkTut(); tutHighlight(null);
  V.returnTo=V.tutI; V.tutI=i; V.tutState='start'; V.tutAt=G.time; V.cardOpen=false; tutRefresh(); toast('Practice: '+(G.tutSteps[i].obj||''),true); }
function g_unmarkTut(){ G.markers=G.markers.filter(m=>m.id!=='tut'); }
/* light up command buttons (by key) and parts of the screen (by selector) */
function tutHighlight(st){ document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));
  G.tutHL=st&&(st.keys||st.hl)?{ keys:(st.keys||[]).map(k=>k.toLowerCase()), sel:st.hl||[] }:null; G.selDirty=true; tutApplyHighlight(); }
function tutApplyHighlight(){ const H=G&&G.tutHL; if(!H) return; for(const s of H.sel) document.querySelectorAll(s).forEach(e=>e.classList.add('tut-hl')); }

/* which top-bar buttons the player has used in this mission (the training checks these) */
function uiUsed(name){ if(G){ G.uiUse=G.uiUse||{}; G.uiUse[name]=(G.uiUse[name]||0)+1; } }
