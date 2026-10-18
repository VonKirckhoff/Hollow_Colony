'use strict';
/* ---------- 2v. squad life: motion tracker, acid blood, voices, cover, suppression, flares, obituaries ---------- */
const SQUAD = {
  tracker:{ range:20, size:64 },                                     // range in tiles, radius on screen in px
  acid:{ splash:1.2, splashDmg:6, pool:3, poolDps:5, poolR:14 },     // tiles / hp / seconds / hp per second / px
  cover:{ factor:0.6 },                                              // ranged damage taken in cover (×)
  suppress:{ time:1.4, slow:0.55 },                                  // seconds, speed factor
  flare:{ light:6, time:45, range:9, perMission:3, perDarkMission:6 },
  voice:{ gap:1.6 },                                                 // seconds between two voice lines
  moveFire:{ rate:1.35 }                                             // firing on the move: time between shots ×
};

/* ---- motion tracker: blips for everything that moves within range of your squad, faster beeps when closer ---- */
function trackerRef(){
  const us=G.sel.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.dead);
  if(us.length) return { x:us.reduce((s,u)=>s+u.x,0)/us.length, y:us.reduce((s,u)=>s+u.y,0)/us.length };
  return { x:G.cam.x+ui.vw/2, y:G.cam.y+(ui.vh-ui.hudH)/2 };
}
function trackerContacts(ref){
  const R=SQUAD.tracker.range*TILE, out=[];
  for(const e of G.ents){ if(e.dead||e.kind!=='unit'||(e.faction!=='swarm'&&e.faction!=='grey')) continue;
    if(e.def.cloak&&!(e.revealT>0)) continue;                     // a cloaked Grey does not show
    const d=Math.hypot(e.x-ref.x,e.y-ref.y); if(d<R) out.push({e,d,a:Math.atan2(e.y-ref.y,e.x-ref.x)}); }
  return out;
}
function drawTracker(now){
  if(!ui.tracker||!G||G.over) return;
  const S=SQUAD.tracker.size, cx=ui.vw-S-22, cy=ui.vh-ui.hudH-S-22, ref=trackerRef(), cs=trackerContacts(ref), sweep=(now/1000*2.2)%(Math.PI*2);
  ctx.save();
  ctx.fillStyle='rgba(6,14,10,.82)'; ctx.beginPath(); ctx.arc(cx,cy,S,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(95,227,176,.35)'; ctx.lineWidth=1; for(const r of [S/3,S*2/3,S]){ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx-S,cy); ctx.lineTo(cx+S,cy); ctx.moveTo(cx,cy-S); ctx.lineTo(cx,cy+S); ctx.stroke();
  const g=ctx.createConicGradient?ctx.createConicGradient(sweep-0.9,cx,cy):null;
  if(g){ g.addColorStop(0,'rgba(95,227,176,0)'); g.addColorStop(0.14,'rgba(95,227,176,.28)'); g.addColorStop(0.145,'rgba(95,227,176,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,S,0,Math.PI*2); ctx.fill(); }
  const R=SQUAD.tracker.range*TILE;
  for(const c of cs){ let da=(sweep-c.a)%(Math.PI*2); if(da<0) da+=Math.PI*2; const glow=Math.max(0.25,1-da/(Math.PI*1.6));
    const px=cx+Math.cos(c.a)*c.d/R*S, py=cy+Math.sin(c.a)*c.d/R*S;
    ctx.fillStyle=`rgba(190,255,215,${glow})`; ctx.fillRect(Math.round(px)-2,Math.round(py)-2,4,4);
    ctx.fillStyle=`rgba(95,227,176,${glow*0.35})`; ctx.fillRect(Math.round(px)-4,Math.round(py)-4,8,8); }
  ctx.fillStyle='#5fe3b0'; ctx.fillRect(cx-1,cy-1,3,3);
  ctx.font='10px Silkscreen, monospace'; ctx.textAlign='center';
  const near=cs.length?Math.min(...cs.map(c=>c.d)):null;
  ctx.fillStyle='#000'; ctx.fillText(near==null?'NO MOTION':`${Math.round(near/TILE*2)} M`,cx+1,cy+S+15); ctx.fillStyle=near==null?'rgba(95,227,176,.6)':near<6*TILE?'#ff5a4f':'#5fe3b0'; ctx.fillText(near==null?'NO MOTION':`${Math.round(near/TILE*2)} M`,cx,cy+S+14);
  ctx.restore();
  // the beep: faster and higher the closer the nearest contact is
  if(near!=null && !G.paused){ const k=near/R, gap=0.22+1.3*k; if(now/1000>(G.trkBeep||0)){ G.trkBeep=now/1000+gap; SFX.play(k<0.3?'trk3':k<0.6?'trk2':'trk1'); } }
}
function toggleTracker(){ ui.tracker=!ui.tracker; store.set('hc-tracker',ui.tracker); trackerLabel(); toast(ui.tracker?'Motion tracker on.':'Motion tracker off.',true); }
const trackerLabel=()=>{ const b=$('#btn-tracker'); if(b) b.textContent=ui.tracker?'Tracker on':'Tracker off'; };

/* ---- acid blood: a Swarm creature that dies spatters acid on soldiers next to it and leaves a burning pool ---- */
function splashAcid(e){
  const A=SQUAD.acid, big=e.def.boss?3:e.type==='brute'?1.6:1;
  for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='corps') continue; if(Math.hypot(u.x-e.x,u.y-e.y)<A.splash*TILE*big){ damage(u,A.splashDmg*big,{faction:'swarm',dead:true,acid:true}); G.fx.push({k:'text',x:u.x,y:u.y-30,t:0.7,max:0.7,txt:'ACID',col:'#a6ff4a'}); } }
  G.pools.push({x:e.x,y:e.y+3,r:A.poolR*big,t:A.pool*big,max:A.pool*big,seed:Math.random()*10});
  if(G.pools.length>40) G.pools.shift();
}
function updatePools(dt){
  const A=SQUAD.acid;
  for(const p of G.pools){ p.t-=dt;
    for(const u of G.ents){ if(u.dead||u.kind!=='unit'||u.faction!=='corps'||u.def.convoy) continue; if(Math.hypot(u.x-p.x,(u.y-p.y)*1.6)<p.r) damage(u,A.poolDps*dt,{faction:'swarm',dead:true,acid:true}); } }
  G.pools=G.pools.filter(p=>p.t>0);
}
function drawPools(now){
  for(const p of G.pools){ const a=Math.min(1,p.t/1.2)*0.75;
    ctx.fillStyle=`rgba(120,220,40,${a*0.45})`; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*0.55,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(200,255,120,${a})`; for(let i=0;i<3;i++){ const b=(now/400+p.seed+i*1.7)%1; ctx.fillRect(Math.round(p.x+Math.cos(p.seed+i*2.1)*p.r*0.5)-1,Math.round(p.y+Math.sin(p.seed+i*2.1)*p.r*0.25-b*4),2,2); } }
}

/* ---- cover and suppression ---- */
/* A soldier with rock or a building right between him and a ranged attacker takes less damage. */
function inCover(t,src){
  if(!src||src.dead===true&&!src.x) return false; const a=Math.atan2(src.y-t.y,src.x-t.x), tx=Math.floor(t.x/TILE), ty=Math.floor(t.y/TILE);
  for(const da of [0,0.6,-0.6]){ const x=Math.floor((t.x+Math.cos(a+da)*TILE)/TILE), y=Math.floor((t.y+Math.sin(a+da)*TILE)/TILE); if((x!==tx||y!==ty)&&!walkableT(x,y)) return true; }
  return false;
}
function coverDamage(t,amt,src){
  if(t.kind!=='unit'||t.faction!=='corps'||!src||!src.def||src.def.attack==='melee'||!(src.def.range>=2)) return amt;
  if(!inCover(t,src)) return amt;
  if(Math.random()<0.15) G.fx.push({k:'text',x:t.x,y:t.y-30,t:0.6,max:0.6,txt:'COVER',col:'#9fd3ff'});
  return amt*SQUAD.cover.factor;
}
function suppress(t){ if(t.kind!=='unit'||t.faction==='corps'||t.def.boss) return; t.suppressT=SQUAD.suppress.time; }

/* ---- flares: a soldier throws one; it burns and lights the ground around it ---- */
function flareThrowers(){ return myUnits().filter(u=>!u.def.builder&&!u.def.heal&&!u.def.escort&&!u.carry); }
function startFlare(){ if(ui.flare){ clearModes(); return; } clearModes(); if(!G.flares){ toast('No flares left.'); return; } if(!flareThrowers().length){ toast('Select a soldier to throw a flare.'); return; }
  ui.flare=true; ui.amove=false; ui.placing=null; cv.classList.add('amove'); G.selDirty=true; toast('Click where the flare should land.',true); }
function throwFlare(wx,wy){
  ui.flare=false; cv.classList.remove('amove'); G.selDirty=true;
  const ts=flareThrowers(); if(!ts.length||!G.flares) return;
  const u=ts.reduce((a,b)=>Math.hypot(a.x-wx,a.y-wy)<=Math.hypot(b.x-wx,b.y-wy)?a:b);
  let d=Math.hypot(wx-u.x,wy-u.y), max=SQUAD.flare.range*TILE; if(d>max){ wx=u.x+(wx-u.x)/d*max; wy=u.y+(wy-u.y)/d*max; d=max; }
  if(!walkableP(wx,wy)){ const f=nearestWalkable(Math.floor(wx/TILE),Math.floor(wy/TILE)); if(f){ wx=(f.x+.5)*TILE; wy=(f.y+.5)*TILE; } }
  G.flares--; u.face=wx>u.x?1:-1; SFX.play('flare',u.x,u.y); bark(u,'flare');
  G.flareList.push({x:wx,y:wy,sx:u.x,sy:u.y-14,fly:0,dur:0.25+d/700,t:SQUAD.flare.time});
}
function updateFlares(dt){
  for(const f of G.flareList){ if(f.fly<f.dur){ f.fly+=dt; continue; } f.t-=dt; if(Math.random()<dt*14) G.fx.push({k:'spark',x:f.x+rand(-3,3),y:f.y-4,vx:rand(-30,30),vy:rand(-70,-20),t:0.5,max:0.5,col:pick(['#ff5a4f','#ffb347','#fff2c0'])}); }
  G.flareList=G.flareList.filter(f=>f.t>0);
}
function flareLit(f){ return f.fly>=f.dur && f.t>0; }
function drawFlares(now){
  for(const f of G.flareList){
    if(!flareLit(f)){ const k=f.fly/f.dur, x=f.sx+(f.x-f.sx)*k, y=f.sy+(f.y-f.sy)*k-Math.sin(k*Math.PI)*50; ctx.fillStyle='#ff5a4f'; ctx.fillRect(Math.round(x)-2,Math.round(y)-2,4,4); continue; }
    const fade=Math.min(1,f.t/4), fl=0.85+0.15*Math.sin(now/45+f.x), R=SQUAD.flare.light*TILE;
    ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(f.x,f.y,4,f.x,f.y,R); g.addColorStop(0,`rgba(255,90,70,${0.32*fade*fl})`); g.addColorStop(0.45,`rgba(255,80,60,${0.10*fade*fl})`); g.addColorStop(1,'rgba(255,60,40,0)');
    ctx.fillStyle=g; ctx.fillRect(f.x-R,f.y-R,R*2,R*2); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#3a1512'; ctx.fillRect(Math.round(f.x)-3,Math.round(f.y)-1,6,3); ctx.fillStyle=`rgba(255,${200+Math.floor(Math.random()*55)},180,${fade})`; ctx.fillRect(Math.round(f.x)-1,Math.round(f.y)-3,3,3);
  }
}

/* ---- voices: short lines in a speech bubble with a radio click ---- */
function bark(u,kind,arg){
  if(!u||u.dead||!G||!VOICE[kind]) return;
  const now=G.time; if(now<(G.barkNext||0) && kind!=='down') return;
  G.barkNext=now+SQUAD.voice.gap;
  const pool=(u.vet&&u.vet.risen&&VOICE_RISEN[kind])||VOICE[kind]; let line=pick(pool); if(arg) line=line.replace('{name}',arg);
  G.barks=G.barks.filter(b=>b.u!==u); G.barks.push({u,text:line,t:2.2});
  if(G.barks.length>3) G.barks.shift(); SFX.play('chirp'); speak(u,line,kind);
}
/* Spoken lines with the browser's own speech voices (no sound files needed). Every soldier keeps his own voice and pitch.
   Follows the Sound button, and can be switched off on its own with the Voices button (key O). */
let VOICES_EN=[];
function loadVoices(){ try{ const all=speechSynthesis.getVoices(); VOICES_EN=all.filter(v=>/^en(-|_|$)/i.test(v.lang)); if(!VOICES_EN.length) VOICES_EN=all; }catch(e){ VOICES_EN=[]; } }
if(window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; }
function nameHash(n){ let h=0; for(const c of String(n)) h=(h*31+c.charCodeAt(0))>>>0; return h; }
function speak(u,line,kind){
  if(!window.speechSynthesis||SFX.muted||!ui.voices||G.paused) return;
  try{
    const urgent=kind==='down'||kind==='contact'||kind==='hurt';
    if(speechSynthesis.speaking){ if(!urgent) return; speechSynthesis.cancel(); }
    const ut=new SpeechSynthesisUtterance(line.replace(/\.\.\./g,','));
    const h=nameHash(u.vet?u.vet.name:u.id); if(VOICES_EN.length) ut.voice=VOICES_EN[h%VOICES_EN.length];
    const z=u.vet&&u.vet.risen; ut.pitch=z?0.1:0.8+(h%7)*0.06; ut.rate=z?0.7:urgent?1.25:1.1; ut.volume=clamp(ui.voiceVol,0,1);
    setTimeout(()=>{ try{ speechSynthesis.speak(ut); }catch(e){} },90);   // after the radio click
  }catch(e){}
}
function toggleVoices(){ ui.voices=!ui.voices; store.set('hc-voices',ui.voices); voicesLabel(); if(!ui.voices&&window.speechSynthesis) speechSynthesis.cancel(); toast(ui.voices?'Voices on.':'Voices off.',true); }
const voicesLabel=()=>{ const b=$('#btn-voices'); if(b) b.textContent=ui.voices?'Voices on':'Voices off'; };
function updateBarks(dt){ for(const b of G.barks) b.t-=dt; G.barks=G.barks.filter(b=>b.t>0&&!b.u.dead); }
function drawBarks(){
  ctx.font='11px "Chakra Petch", sans-serif'; ctx.textAlign='center';
  for(const b of G.barks){ const u=b.u, y=Math.round(u.y-(SPR[u.def.sprite].h*(u.def.scale||2))-18), w=Math.ceil(ctx.measureText(b.text).width)+12, x=Math.round(u.x-w/2), a=Math.min(1,b.t/0.4);
    ctx.globalAlpha=a; ctx.fillStyle='rgba(10,12,18,.85)'; ctx.fillRect(x,y-13,w,18); ctx.fillStyle='#5fe3b0'; ctx.fillRect(x,y-13,2,18);
    ctx.beginPath(); ctx.moveTo(u.x-4,y+5); ctx.lineTo(u.x+4,y+5); ctx.lineTo(u.x,y+10); ctx.fillStyle='rgba(10,12,18,.85)'; ctx.fill();
    ctx.fillStyle='#e8ecf2'; ctx.fillText(b.text,u.x+1,y); ctx.globalAlpha=1; }
}
function anyBarker(units,kind,arg){ const us=units.filter(u=>u.kind==='unit'&&u.faction==='corps'&&!u.dead&&!u.def.convoy&&!u.def.escort); if(us.length) bark(pick(us),kind,arg); }

/* ---- personal veterans: an obituary on the radio, kept for the memorial ---- */
function obituary(u){
  if(!u.vet) return;
  (G.fallenVets=G.fallenVets||{})[u.vet.id]={...u.vet};
  const near=G.ents.filter(e=>!e.dead&&e!==u&&e.kind==='unit'&&e.faction==='corps'&&!e.def.escort&&Math.hypot(e.x-u.x,e.y-u.y)<9*TILE);
  if(near.length) bark(pick(near),'down',u.vet.name);
  if(u.vet.hero||u.vet.rank>=1||(u.vet.missions||0)>=1){
    const m=u.vet.missions||0;
    if(u.leader) captainDown(u);
    say('In memory',`${RANKS[u.vet.rank].abbr} ${u.vet.name} has fallen. ${m?`${m} mission${m>1?'s':''}, `:''}${u.vet.kills} kill${u.vet.kills===1?'':'s'}.`,'alert'); }
}

/* ---------- dropship: flies in from off the map, settles on the pad in a cloud of dust, unloads and lifts off again ---------- */
function dustPuff(x,y,n){ for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2), sp=rand(40,160);
  G.fx.push({k:'dust',x:x+Math.cos(a)*rand(8,40),y:y+Math.sin(a)*rand(6,26),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*0.6,t:rand(1.2,2.6),max:2.6,r0:rand(10,16),r1:rand(22,40),col:pick(['#b3a58f','#a4967f','#c2b49c'])}); } }
function updateShip(b,dt){
  const s=b.ship; if(!s) return;
  if(s.phase==='ground'){ s.t-=dt; if(Math.random()<dt*4) dustPuff(b.x,b.y,1); if(s.t<=0){ s.phase='takeoff'; s.t=3; s.out=rand(-2.6,-0.5); SFX.play('engine',b.x,b.y); dustPuff(b.x,b.y,14); } }
  else if(s.phase==='takeoff'){ s.t-=dt; if(s.t>2.2&&Math.random()<dt*30) dustPuff(b.x,b.y,1); if(s.t<=0) b.ship=null; }
}
function drawShip(gx,gy,alt,heading,scale,lights,ramp,now){
  const art=ARTC.dropship, w=art.width*2.6*scale, h=art.height*2.6*scale;
  // shadow on the ground, smaller and softer the higher the ship
  ctx.save(); ctx.translate(gx+alt*0.28,gy+alt*0.42); ctx.rotate(heading); ctx.globalAlpha=Math.max(0.12,0.42-alt/700);
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,0,w*0.46,h*0.34,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(gx,gy-alt*0.35); ctx.rotate(heading);
  ctx.drawImage(art,Math.round(-w/2),Math.round(-h/2),Math.round(w),Math.round(h));
  if(lights){ const f=0.55+0.45*Math.sin(now/40), u=3*scale;
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,150,60,${0.55*f})`;
    for(const py of [-16.5,16.5]){ ctx.beginPath(); ctx.arc(-15*u/3*2.6/3*3,py*u*2.6/3,4*u*f,0,Math.PI*2); ctx.fill(); }
    ctx.globalCompositeOperation='source-over'; }
  if(Math.floor(now/400)%2===0){ ctx.fillStyle='#ff5a4f'; ctx.fillRect(Math.round(-w*0.02),Math.round(-h/2),3,3); ctx.fillStyle='#5fe3b0'; ctx.fillRect(Math.round(-w*0.02),Math.round(h/2-3),3,3); }
  if(ramp){ ctx.fillStyle='rgba(30,32,40,.9)'; ctx.fillRect(Math.round(-w/2-10*scale),Math.round(-9*scale),Math.round(12*scale),Math.round(18*scale)); }
  ctx.restore();
}
function drawShips(now){
  for(const b of G.ents){ if(b.dead||!b.def||!b.def.reinforce) continue;
    if(b.flight && b.flight.t<5 && b.flight.ang!==undefined){ const k=b.flight.t/5, a=b.flight.ang, D=820*k*k, alt=260*k;
      const gx=b.x+Math.cos(a)*D, gy=b.y+Math.sin(a)*D; let hd=a+Math.PI; const want=0; let dd=want-hd; while(dd>Math.PI) dd-=2*Math.PI; while(dd<-Math.PI) dd+=2*Math.PI;
      hd+=dd*Math.min(1,(1-k)*1.4); drawShip(gx,gy,alt,hd,1+0.35*k,true,false,now); }
    const s=b.ship; if(!s) continue;
    if(s.phase==='ground'||s.phase==='parked') drawShip(b.x,b.y,0,0,1,s.phase==='parked',true,now);
    else if(s.phase==='takeoff'){ const k=1-s.t/3, a=s.out, D=820*k*k, alt=260*Math.min(1,k*1.3);
      drawShip(b.x+Math.cos(a)*D,b.y+Math.sin(a)*D,alt,(a)*Math.min(1,k*1.5),1+0.35*k,true,false,now); } }
}

/* Voice volume slider in the top bar (0–100%), remembered in this browser. Releasing it plays a test line. */
function initVoiceVolume(){ const r=$('#voice-vol'); if(!r) return; r.value=Math.round(ui.voiceVol*100);
  r.addEventListener('input',()=>{ ui.voiceVol=r.value/100; store.set('hc-voice-vol',ui.voiceVol); });
  r.addEventListener('change',()=>{ if(!window.speechSynthesis||SFX.muted||!ui.voices) return; try{ speechSynthesis.cancel(); const ut=new SpeechSynthesisUtterance('Radio check.'); if(VOICES_EN.length) ut.voice=VOICES_EN[0]; ut.volume=ui.voiceVol; speechSynthesis.speak(ut); }catch(e){} });
  r.addEventListener('pointerdown',e=>e.stopPropagation()); }

/* ---- firing on the move: a soldier with a move order keeps walking, but shoots at enemies in range on the way ---- */
function snapFire(u,dt){
  const d=u.def; u.snapT=(u.snapT||0)-dt;
  if(u.snapT<=0){ u.snapT=0.25; const rg=d.range+(u.rangeBonus||0), t=findTarget(u,rg,true); u.snap=(t&&dist(u,t)<=rg*TILE+t.r+u.r*0.5)?t:null; }
  const t=u.snap; if(!t||t.dead||!validTarget(u,t)) { u.snap=null; return; }
  if(u.cd<=0){ fire(u,t); if(!(u.type==='gunner'&&hasPerk(u))) u.cd*=SQUAD.moveFire.rate; }   /* Lieutenant Gunner: steady aim */
}

/* ---- the Captain's leadership: nearby soldiers fire faster and take less damage; if he falls, the squad wavers ---- */
function updateAura(dt){
  G.auraScan=(G.auraScan||0)-dt; if(G.auraScan>0) return; G.auraScan=0.3;
  for(const c of G.ents){ if(c.dead||!c.leader||c.kind!=='unit') continue;
    for(const e of G.ents){ if(e.dead||e.kind!=='unit'||e.faction!==c.faction||Math.hypot(e.x-c.x,e.y-c.y)>AURA.radius*TILE) continue; e.auraT=0.5; } }
}
function captainDown(c){
  const near=G.ents.filter(e=>!e.dead&&e!==c&&e.kind==='unit'&&e.faction==='corps'&&Math.hypot(e.x-c.x,e.y-c.y)<AURA.waver.radius*TILE);
  for(const e of near) e.waverT=AURA.waver.time;
  if(near.length){ G.barkNext=0; bark(pick(near),'waver'); }
}
function drawAura(u,now){
  const R=AURA.radius*TILE, a=0.10+0.05*Math.sin(now/300);
  ctx.strokeStyle=`rgba(255,210,63,${a})`; ctx.lineWidth=2; ctx.setLineDash([4,6]); ctx.lineDashOffset=-now/80;
  ctx.beginPath(); ctx.ellipse(u.x,u.y+2,R,R*0.55,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
}
/* ---- the risen: a green, dead-eyed copy of the sprite, made once per sprite ---- */
function risenSprite(sp){
  let r=sp.risen; if(r) return r; r={};
  for(const k of ['img','flip']){ const c=document.createElement('canvas'); c.width=sp[k].width; c.height=sp[k].height; const x=c.getContext('2d');
    x.drawImage(sp[k],0,0); x.globalCompositeOperation='source-atop'; x.fillStyle='rgba(70,170,60,.55)'; x.fillRect(0,0,c.width,c.height);
    x.globalCompositeOperation='multiply'; x.fillStyle='rgba(150,190,140,1)'; x.fillRect(0,0,c.width,c.height); x.globalCompositeOperation='destination-in'; x.drawImage(sp[k],0,0); r[k]=c; }
  return sp.risen=r;
}
function drawRisenGlow(u,now){
  const p=0.5+0.5*Math.sin(now/260+u.id); ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(u.x,u.y-10,2,u.x,u.y-10,22); g.addColorStop(0,`rgba(120,255,90,${0.16+0.1*p})`); g.addColorStop(1,'rgba(120,255,90,0)');
  ctx.fillStyle=g; ctx.fillRect(u.x-24,u.y-34,48,48); ctx.globalCompositeOperation='source-over';
  if(Math.random()<0.04) G.fx.push({k:'spark',x:u.x+rand(-6,6),y:u.y-rand(4,20),vx:rand(-8,8),vy:rand(-40,-20),t:0.8,max:0.8,col:'#9dff6a'});
}
