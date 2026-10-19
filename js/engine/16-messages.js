'use strict';
/* ---------- 2o. messages ---------- */
/* playing the Swarm, everything the Lunar Corps says over the radio comes in as an intercept */
const SWARM_VOICES=['The Brood','Objective'];
function say(who,text,kind){ if(!G) return; if(G.side==='swarm'&&!SWARM_VOICES.includes(who)&&!/swarm/.test(kind||'')){ kind=((kind||'')+' intercept').trim(); who='Intercept · '+who; }
  G.msgs.push({who,text,kind:kind||'',born:G.time,life:5+text.length/22}); if(!kind) SFX.play('radio'); else if(/swarm/.test(kind)) SFX.play('heartbeat'); if(G.msgs.length>4) G.msgs.shift(); G.msgDirty=true; }
let toastT=null;
function toast(text,quiet){ if(!quiet) SFX.play('error'); const el=$('#toast'); el.textContent=text; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,1600); }
