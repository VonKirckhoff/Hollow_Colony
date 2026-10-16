'use strict';
/* ---------- 2o. messages ---------- */
function say(who,text,kind){ if(!G) return; G.msgs.push({who,text,kind:kind||'',born:G.time,life:5+text.length/22}); if(!kind) SFX.play('radio'); if(G.msgs.length>4) G.msgs.shift(); G.msgDirty=true; }
let toastT=null;
function toast(text,quiet){ if(!quiet) SFX.play('error'); const el=$('#toast'); el.textContent=text; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,1600); }
