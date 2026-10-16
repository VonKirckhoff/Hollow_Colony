'use strict';
/* ---------- 2a2. sound (synthesised with Web Audio, no files needed) ---------- */
const SFX=(()=>{
  let ac=null, master=null, noiseBuf=null, muted=store.get('hc-mute',false); const last={};
  function init(){ if(ac){ if(ac.state==='suspended') ac.resume(); return; }
    try{ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=muted?0:0.45; master.connect(ac.destination);
      noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }catch(e){ ac=null; } }
  function env(g,t,vol,dur){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(vol,0.0002),t+0.004); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); }
  function tone(f,f2,dur,type,vol,delay=0){ const t=ac.currentTime+delay, o=ac.createOscillator(), g=ac.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t); if(f2!==f) o.frequency.exponentialRampToValueAtTime(f2,t+dur); env(g,t,vol,dur); o.connect(g).connect(master); o.start(t); o.stop(t+dur+0.02); }
  function noise(dur,freq,ftype,q,vol,delay=0,freq2){ const t=ac.currentTime+delay, s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain();
    s.buffer=noiseBuf; f.type=ftype; f.frequency.setValueAtTime(freq,t); if(freq2) f.frequency.exponentialRampToValueAtTime(freq2,t+dur); f.Q.value=q;
    env(g,t,vol,dur); s.connect(f).connect(g).connect(master); s.start(t,Math.random()*0.5); s.stop(t+dur+0.02); }
  // name: [minimum gap in seconds, sound]
  const DEF={
    rifle:   [0.06,v=>{ noise(0.07,2400,'bandpass',0.8,0.5*v); tone(160,60,0.06,'triangle',0.25*v); }],
    gunner:  [0.07,v=>{ noise(0.045,1500,'bandpass',1,0.4*v); tone(110,50,0.04,'square',0.1*v); }],
    sentry:  [0.1, v=>{ noise(0.06,3200,'bandpass',1.2,0.35*v); tone(300,120,0.05,'square',0.07*v); }],
    flame:   [0.2, v=>{ noise(0.28,1100,'lowpass',0.6,0.3*v,0,350); }],
    spit:    [0.12,v=>{ tone(520,140,0.18,'sine',0.22*v); noise(0.12,700,'lowpass',1,0.18*v); }],
    splat:   [0.1, v=>{ noise(0.18,600,'lowpass',2,0.3*v,0,150); }],
    slash:   [0.08,v=>{ noise(0.06,4200,'highpass',0.5,0.22*v); }],
    squelch: [0.08,v=>{ tone(190,60,0.2,'sawtooth',0.1*v); noise(0.2,600,'lowpass',3,0.28*v,0,200); }],
    death:   [0.15,v=>{ tone(150,50,0.3,'triangle',0.3*v); noise(0.15,1200,'bandpass',1,0.18*v); }],
    boom:    [0.15,v=>{ noise(0.8,500,'lowpass',0.7,0.7*v,0,60); tone(85,30,0.7,'sine',0.5*v); }],
    heal:    [0.7, v=>{ tone(660,660,0.12,'sine',0.1*v); tone(990,990,0.2,'sine',0.08*v,0.08); }],
    contact: [4,   v=>{ tone(880,880,0.07,'square',0.1*v); tone(660,660,0.1,'square',0.1*v,0.1); }],
    weld:    [0.32,v=>{ noise(0.09,5200,'bandpass',4,0.16*v); tone(1400,1700,0.05,'square',0.03*v,0.03); }],
    wrench:  [0.42,v=>{ tone(1250,1250,0.04,'triangle',0.16*v); tone(1650,1650,0.06,'triangle',0.12*v,0.05); noise(0.04,3000,'highpass',1,0.1*v); }],
    plasma:  [0.2, v=>{ tone(1600,240,0.22,'sawtooth',0.12*v); noise(0.1,6000,'highpass',1,0.12*v); }],
    hatch:   [0.2, v=>{ noise(0.25,800,'bandpass',2,0.3*v,0,300); tone(300,700,0.15,'sawtooth',0.07*v); }],
    ack:     [0.1, ()=>tone(520,720,0.05,'square',0.06)],
    attack:  [0.1, ()=>{ tone(420,260,0.07,'square',0.08); tone(420,260,0.07,'square',0.06,0.08); }],
    select:  [0.08,()=>tone(900,900,0.03,'sine',0.07)],
    place:   [0.1, ()=>tone(300,300,0.06,'square',0.1)],
    error:   [0.2, ()=>tone(200,140,0.15,'square',0.1)],
    complete:[0.3, ()=>{ tone(523,523,0.1,'triangle',0.18); tone(659,659,0.1,'triangle',0.18,0.1); tone(784,784,0.2,'triangle',0.18,0.2); }],
    ready:   [0.2, ()=>tone(700,1000,0.08,'triangle',0.14)],
    pickup:  [0.1, ()=>{ tone(988,988,0.06,'square',0.08); tone(1319,1319,0.12,'square',0.08,0.06); }],
    alarm:   [1,   ()=>{ for(let i=0;i<2;i++){ tone(740,740,0.16,'sawtooth',0.09,i*0.4); tone(554,554,0.16,'sawtooth',0.09,i*0.4+0.2); } }],
    horn:    [2,   ()=>{ tone(110,96,1.0,'sawtooth',0.14); tone(55,48,1.0,'sine',0.3); }],
    radio:   [0.3, ()=>{ noise(0.08,2500,'bandpass',3,0.1); tone(1200,1200,0.03,'sine',0.05,0.08); }],
    win:     [1,   ()=>[523,659,784,1047].forEach((f,i)=>tone(f,f,0.25,'triangle',0.2,i*0.14))],
    lose:    [1,   ()=>[392,330,262,196].forEach((f,i)=>tone(f,f*0.98,0.35,'triangle',0.2,i*0.2))]
  };
  function play(name,x,y){
    if(!ac||muted||!DEF[name]) return; const now=ac.currentTime, [gap,fn]=DEF[name];
    if(last[name]!==undefined && now-last[name]<gap) return;
    let v=1;
    if(x!==undefined && G){ const cx=G.cam.x+ui.vw/2, cy=G.cam.y+(ui.vh-ui.hudH)/2, R=Math.max(ui.vw,ui.vh)*0.9, d=Math.hypot(x-cx,y-cy); if(d>R) return; v=clamp(1-d/R,0.12,1); }
    last[name]=now; try{ fn(v); }catch(e){}
  }
  function toggle(){ muted=!muted; store.set('hc-mute',muted); if(master) master.gain.value=muted?0:0.45; return muted; }
  return { init, play, toggle, get muted(){ return muted; } };
})();
document.addEventListener('pointerdown',()=>SFX.init(),{capture:true});
document.addEventListener('keydown',()=>SFX.init(),{capture:true});
