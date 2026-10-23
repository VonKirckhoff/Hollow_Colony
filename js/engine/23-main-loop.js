'use strict';
/* ---------- 2u. main loop ---------- */
let lastT=performance.now(), acc=0;
function frame(now){
  const dt=Math.min(0.1,(now-lastT)/1000); lastT=now;
  if(G && !G.paused && !G.devPause && (ui.mode==='game'&&!G.over || afterDefeat()&&(ui.mode==='game'||ui.mode==='end'))){   /* after a defeat the battle plays on behind the report */   /* devPause: paused from the dev panel */ acc+=dt*G.speed; let n=0; while(acc>=STEP && n++<6){ update(STEP); acc-=STEP; } if(n>=6) acc=0; }
  updateCamera(dt);
  try{ render(now); }catch(err){ console.error(err); }
  if(G && (ui.mode==='game'||ui.mode==='pause'||ui.mode==='end')) hudTick();
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
ui.roster=loadRoster(); if(heroOf()) syncHeroOther(heroOf()); else ensureHero();   /* your soldier has the same name in both campaigns */ trackerLabel(); voicesLabel(); initVoiceVolume(); loadCustomMaps(); resize(); goMenu('menu'); requestAnimationFrame(frame);
window.__hc={ get G(){ return G; }, startMission, MISSIONS, skirmishMission, update, moveGroup, selectEntities, orderDrop:(...a)=>orderDrop(...a), troopCount:()=>troopCount(), makeBuilding:(...a)=>makeBuilding(...a), fielded:(t)=>fielded(t), atLimit:(t)=>atLimit(t), startPlacing:(...a)=>startPlacing(...a), get ui(){ return ui; } };
