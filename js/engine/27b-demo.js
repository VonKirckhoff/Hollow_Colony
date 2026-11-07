'use strict';
/* ---------- 2x-b. Watch mode: a training that plays itself ----------
   The briefing of a training with demo:true has a Watch button. The training then runs as usual, but:
     · every card stays open as long as it takes to read it (read seconds per letter, between minRead and maxRead), then closes itself;
     · every step's demo(g,D) does what the step asks (first after `first` seconds, then every `nudge` seconds until the step is done);
       D.mem keeps notes for the step, D.t is the time in the step, demoLook(D,thing) makes the camera glide there (`pan`);
     · a step that takes longer than stepMax seconds is skipped;
     · any key or click of your own takes over: from there you play the training yourself.
   A training you only watched does not count as done. */
const DEMO = { read:0.045, minRead:3.5, maxRead:11, doneWait:1.6, first:1.5, nudge:2.5, stepMax:120, pan:3 };
function demoStart(){ G.demo={ on:true, i:-1, t:0, nudgeT:0, cardT:0, focus:null, mem:{} }; demoBanner(true); }
function demoStop(why){ if(!G||!G.demo||!G.demo.on) return; G.demo.on=false; G.demo.focus=null; demoBanner(false); if(why) toast(why,true); }
function demoBanner(on){ let b=document.getElementById('demo-banner');
  if(!b){ b=document.createElement('div'); b.id='demo-banner'; b.innerHTML='<b>▶ WATCHING</b> the training plays itself · press any key or click to take over'; document.body.appendChild(b); }
  b.hidden=!on; }
function updateDemo(dt){ const D=G.demo; if(!D||!D.on||G.over) return; const V=G.vars, S=G.tutSteps; if(!S) return;
  /* the card: open long enough to read, then it closes itself */
  if(V.cardOpen){ D.cardT+=dt; const st=S[V.cardView??V.tutI]||{}, need=V.stepDone?DEMO.doneWait:clamp((st.say||'').replace(/<[^>]+>/g,'').length*DEMO.read,DEMO.minRead,DEMO.maxRead);
    if(D.cardT>=need){ D.cardT=0; tutConfirm(); } } else D.cardT=0;
  if(V.tutI!==D.i){ D.i=V.tutI; D.t=0; D.nudgeT=DEMO.first; D.mem={}; D.focus=null; D.bait=null; D.team=null; }
  D.t+=dt; const st=S[V.tutI];
  if(st&&V.tutState==='run'){
    if(D.t>DEMO.stepMax){ V.skip=true; }
    else if(st.demo){ D.nudgeT-=dt; if(D.nudgeT<=0){ D.nudgeT=DEMO.nudge; try{ st.demo(G.api,D); }catch(e){ console.error('demo step',V.tutI,e); } } } }
  /* the camera glides to what the step is about */
  const f=D.focus&&(D.focus.dead?null:D.focus);
  if(f&&f.x!=null){ G.following=false; const cx=G.cam.x+ui.vw/2, cy=G.cam.y+(ui.vh-ui.hudH)/2, k=Math.min(1,dt*DEMO.pan); centerOn(cx+(f.x-cx)*k,cy+(f.y-cy)*k); } }
/* ---- helpers for the steps' demo(g,D) ---- */
function demoLook(D,t){ if(t) D.focus=t; }
function demoTap(p){ if(p) G.pings.push({x:p.x,y:p.y,t:0,col:'#ffffff'}); }
function demoPress(sel){ const el=document.querySelector(sel); if(!el) return; el.classList.add('demo-press'); setTimeout(()=>el.classList.remove('demo-press'),650); }
/* your brood: the creatures you hatched or steer, free of other jobs */
function demoBrood(){ return G.ents.filter(e=>!e.dead&&!e.hidden&&e.kind==='unit'&&e.faction==='swarm'&&!e.avatar&&!e.def.boss&&!e.def.grafter&&(e.mine||e.role==='brood')&&e.role!=='guard'&&!e.claim&&!e.haul&&!e.tunnel&&!(e.stage!=null&&e.stage<HUSK_STAGES.length-1)); }
function demoHatch(type){ if(broodUsed()>=broodCap()||broodPending()>=3) return; const c=UNITS[type].biomass; if(G.swarm.biomass<c) G.swarm.biomass+=c;   /* the demo never stalls for biomass */
  demoPress(`[data-key="${SWARM_PLAY.keys[type]}"]`); if(swarmBreed(type)) batchRelease(nestHive()); }   /* an egg in the batch, and Space: it hatches in a moment */
function demoSend(x,y,list){ selectEntities(list||[],false); demoTap({x,y}); sendWave(x,y); }
function demoMove(list,x,y){ if(!list||!list.length) return; selectEntities(list,false); demoTap({x,y}); swarmRight(x,y); }
function demoHarvest(){ selectEntities([],false); swarmHarvest(); }
/* fetch one particular body: the nearest free creature carries it, the next one guards it (like H, but only this body) */
function demoFetch(b){ if(!b||b.dead||b.home||b.carrier) return false; const us=demoBrood().sort((p,q)=>dist(p,b)-dist(q,b)); if(!us.length) return false;
  b.ordered=true; const c=us[0]; freeFromJobs(c); c.claim=b; c.claimMode='haul'; c.target=null; c.order=null;
  if(us[1]){ const e=us[1]; freeFromJobs(e); e.claim=b; e.claimMode='guard'; e.target=null; e.order=null; }
  demoPress('[data-key="H"]'); G.selDirty=true; return true; }
/* walk a group along waypoints (tile points), one leg per call once most of them got there (or after 14 s); returns true at the end */
function demoRoute(D,key,list,pts){ const m=D.mem[key]||(D.mem[key]={i:-1,t:0}), us=list.filter(u=>!u.dead); if(!us.length) return false;
  if(m.i>=pts.length-1){ const e=pts[pts.length-1], p={x:(e.x+.5)*TILE,y:(e.y+.5)*TILE}; return us.filter(u=>dist(u,p)<3*TILE).length>=Math.ceil(us.length*0.6)||D.t-m.t>14; }   /* stragglers do not hold up the plan */
  const cur=m.i>=0?pts[m.i]:null, cp=cur&&{x:(cur.x+.5)*TILE,y:(cur.y+.5)*TILE};
  if(m.i<0||us.filter(u=>dist(u,cp)<3*TILE).length>=Math.ceil(us.length*0.6)||D.t-m.t>14){ m.i++; m.t=D.t; const n=pts[m.i]; demoMove(us,(n.x+.5)*TILE,(n.y+.5)*TILE); }
  return false; }
/* your own key or click takes over */
addEventListener('keydown',e=>{ if(e.isTrusted&&G&&G.demo&&G.demo.on&&!['Shift','Control','Alt','Meta'].includes(e.key)) demoStop('You have the controls. The training goes on from here.'); },true);
addEventListener('pointerdown',e=>{ if(e.isTrusted&&G&&G.demo&&G.demo.on&&ui.mode==='game') demoStop('You have the controls. The training goes on from here.'); },true);
