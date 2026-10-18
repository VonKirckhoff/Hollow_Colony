'use strict';
/* ---------- 2v. music: "Hollow Light" ----------
   A soundtrack generated live with Web Audio: no audio files. Only plays on the menu screens, never during a mission.
   D Phrygian, 72 BPM. Four movements cycle in a varying order, each 8 bars:
     RUINS    sub drone, a monk choir that drifts from "oo" to "ah", distant anvils, radio static
     DOOM     a wall of down-tuned guitar (two tracks, hard left and right), half-time drums, the Eb that hurts
     BLACK    tremolo-picked melody far away in the reverb, double-bass rumble, choir on top
     MACHINE  industrial: anvil and piston percussion, a cyberpunk arpeggio through a delay, sequenced bass, glitches
   Every screen has its own mood: the briefing gets a heartbeat and static, the Cenotaph a funeral bell,
   and in zombie mode a music box that is slightly out of tune. */
const MUSIC=(()=>{
  const BPM=72, BEAT=60/BPM, S16=BEAT/4, BAR=BEAT*4, D2=73.42;
  const N=s=>D2*Math.pow(2,s/12);              // semitones above D2 (D=0, Eb=1, F=3, G=5, A=7, Bb=8, C=10, D3=12)
  let ac=null, noiseBuf=null, irBuf=null, shapeHeavy=null, shapeLead=null;
  let on=store.get('hc-music',true), vol=store.get('hc-music-vol',0.3);
  let S=null, mood=null, timer=null;           // S = the running session (its own buses, so stopping cuts everything cleanly)

  /* ---------- set-up ---------- */
  function ctx(){ if(ac) return ac;
    try{ prep(new (window.AudioContext||window.webkitAudioContext)()); }catch(e){ ac=null; return null; }
    return ac; }
  function prep(c){ ac=c;
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate); const nd=noiseBuf.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
    const len=Math.floor(ac.sampleRate*4.8); irBuf=ac.createBuffer(2,len,ac.sampleRate);          // a big dark hall
    for(let c=0;c<2;c++){ const d=irBuf.getChannelData(c); let lp=0; for(let i=0;i<len;i++){ const k=i/len; lp=lp*0.82+(Math.random()*2-1)*0.18; d[i]=lp*Math.pow(1-k,3.4)*(i<ac.sampleRate*0.012?0.3:1); } }
    shapeHeavy=curve(70); shapeLead=curve(28); }
  function curve(k){ const n=4096, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return c; }
  function g(v){ const n=ac.createGain(); n.gain.value=v; return n; }
  function filt(type,f,q){ const n=ac.createBiquadFilter(); n.type=type; n.frequency.value=f; if(q!=null) n.Q.value=q; return n; }
  function pan(p){ const n=ac.createStereoPanner?ac.createStereoPanner():g(1); if(n.pan) n.pan.value=p; return n; }

  function buildSession(){
    const s={}; s.out=g(0); s.comp=ac.createDynamicsCompressor(); s.comp.threshold.value=-20; s.comp.ratio.value=4; s.comp.attack.value=0.01; s.comp.release.value=0.25;
    s.mix=g(1); s.mix.connect(s.comp); s.comp.connect(s.out); s.out.connect(ac.destination);
    s.rev=ac.createConvolver(); s.rev.buffer=irBuf; s.revIn=g(1); s.revIn.connect(filt('highpass',180)).connect(s.rev); s.rev.connect(g(0.85)).connect(s.mix);
    // rhythm guitar: one distortion, then double-tracked hard left and right
    s.gtr=g(1); const pre=g(7), sh=ac.createWaveShaper(); sh.curve=shapeHeavy; sh.oversample='4x';
    const cab=filt('lowpass',3000,0.9), hp=filt('highpass',85), mid=filt('peaking',720,1); mid.gain.value=-7; const post=g(0.16);
    s.gtr.connect(pre).connect(sh).connect(hp).connect(mid).connect(cab).connect(post);
    const dl=ac.createDelay(0.05), dr=ac.createDelay(0.05); dl.delayTime.value=0.011; dr.delayTime.value=0.024;
    post.connect(dl).connect(pan(-0.75)).connect(s.mix); post.connect(dr).connect(pan(0.75)).connect(s.mix); post.connect(g(0.22)).connect(s.revIn);
    // tremolo lead: thinner, far away in the hall
    s.lead=g(1); const lpre=g(4), lsh=ac.createWaveShaper(); lsh.curve=shapeLead; lsh.oversample='4x'; const lpost=g(0.05);
    s.lead.connect(lpre).connect(lsh).connect(filt('highpass',260)).connect(filt('lowpass',4200,0.7)).connect(lpost);
    lpost.connect(pan(0.25)).connect(s.mix); lpost.connect(g(1.4)).connect(s.revIn);
    // dotted-eighth delay for the arpeggio and the music box
    s.dly=g(1); const d=ac.createDelay(2), fb=g(0.42), dlp=filt('lowpass',2400); d.delayTime.value=BEAT*0.75;
    s.dly.connect(d); d.connect(dlp).connect(fb).connect(d); dlp.connect(pan(-0.5)).connect(s.mix); dlp.connect(g(0.4)).connect(s.revIn);
    return s; }

  /* ---------- instruments ---------- */
  function osc(type,f,t,end,dest,cents){ const o=ac.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); if(cents) o.detune.value=cents; o.connect(dest); o.start(t); o.stop(end+0.05); return o; }
  function env(node,t,a,peak,hold,rel){ const p=node.gain; p.setValueAtTime(0.0001,t); p.exponentialRampToValueAtTime(peak,t+a); p.setValueAtTime(peak,t+a+hold); p.exponentialRampToValueAtTime(0.0001,t+a+hold+rel); return t+a+hold+rel; }
  function noise(t,dur,dest){ const n=ac.createBufferSource(); n.buffer=noiseBuf; n.connect(dest); n.start(t,Math.random()*1.5); n.stop(t+dur+0.05); return n; }

  function guitar(t,root,len16,mute,v=1){ const dur=mute?S16*0.7:len16*S16;
    for(const iv of [0,7,12]){ const e=g(0), lp=filt('lowpass',mute?650:5200); lp.connect(e).connect(S.gtr);
      const end=env(e,t,0.004,0.11*v,Math.max(0.01,dur-0.09),mute?0.06:0.12);
      osc('sawtooth',N(root+iv),t,end,lp,-9); osc('sawtooth',N(root+iv),t,end,lp,9); } }
  function bass(t,root,len16,v=1,stacc){ const dur=stacc?S16*0.6:len16*S16, e=g(0), lp=filt('lowpass',stacc?520:300,4);
    lp.connect(e).connect(S.mix); const end=env(e,t,0.006,0.16*v,Math.max(0.01,dur-0.08),0.1);
    osc('sawtooth',N(root-12),t,end,lp); osc('square',N(root-24),t,end,lp);
    if(stacc){ lp.frequency.setValueAtTime(1600,t); lp.frequency.exponentialRampToValueAtTime(260,t+0.14); } }
  function tremolo(t,note,dur,v=1){ for(let k=0;k*S16/2<dur-0.01;k++){ const tt=t+k*S16/2, e=g(0); e.connect(S.lead);
      const end=env(e,tt,0.003,0.12*v*(k%2?0.8:1),0.02,0.05); osc('sawtooth',N(note),tt,end,e,-6); osc('sawtooth',N(note),tt,end,e,7); } }
  function leadLong(t,note,dur,v=1){ const e=g(0); e.connect(S.lead); const end=env(e,t,0.05,0.1*v,dur-0.3,0.6);
    const o=osc('sawtooth',N(note),t,end,e), lfo=ac.createOscillator(), lg=g(9); lfo.frequency.value=5.2; lfo.connect(lg).connect(o.detune); lfo.start(t+0.4); lfo.stop(end); }
  function choir(t,notes,dur,v=1){ for(const nt of notes){ const sum=g(1), f1=filt('bandpass',350,7), f2=filt('bandpass',820,9), e=g(0);
      sum.connect(f1).connect(e); sum.connect(f2).connect(e); e.connect(S.mix); e.connect(S.revIn);
      f1.frequency.setValueAtTime(350,t); f1.frequency.linearRampToValueAtTime(760,t+dur); f2.frequency.setValueAtTime(820,t); f2.frequency.linearRampToValueAtTime(1180,t+dur);   // "oo" opens to "ah"
      const end=env(e,t,1.8,0.22*v,Math.max(0.1,dur-1.8),2.6);
      for(const c of [-11,0,12]) osc('sawtooth',N(nt),t,end,sum,c); } }
  function drone(t,dur){ const e=g(0), lp=filt('lowpass',130,3); lp.connect(e).connect(S.mix); const end=env(e,t,3,0.2,Math.max(0.1,dur-3),3);
    osc('sawtooth',N(-12),t,end,lp); osc('sawtooth',N(-12),t,end,lp,7); osc('sawtooth',N(-5),t,end,lp,-4);
    const lfo=ac.createOscillator(), lg=g(60); lfo.frequency.value=0.07; lfo.connect(lg).connect(lp.frequency); lfo.start(t); lfo.stop(end); }
  function kick(t,v=1,low){ const e=g(0); e.connect(S.mix); const end=env(e,t,0.002,0.75*v,0.04,low?0.5:0.32);
    const o=osc('sine',low?95:140,t,end,e); o.frequency.exponentialRampToValueAtTime(low?36:42,t+0.16);
    const c=g(0), hp=filt('highpass',2500); hp.connect(c).connect(S.mix); env(c,t,0.001,0.12*v,0.002,0.015); noise(t,0.03,hp); }
  function snare(t,v=1){ const e=g(0), bp=filt('bandpass',1900,0.7); bp.connect(e); e.connect(S.mix); e.connect(g(0.9)).connect(S.revIn);
    env(e,t,0.002,0.32*v,0.02,0.22); noise(t,0.3,bp); const b=g(0); b.connect(S.mix); const end=env(b,t,0.002,0.22*v,0.01,0.09); osc('triangle',185,t,end,b); }
  function hat(t,v=1){ const e=g(0), hp=filt('highpass',7600); hp.connect(e).connect(pan(Math.random()*0.8-0.4)).connect(S.mix); env(e,t,0.001,0.07*v,0.005,0.035); noise(t,0.05,hp); }
  function crash(t,v=1){ const e=g(0), hp=filt('highpass',4800); hp.connect(e); e.connect(S.mix); e.connect(S.revIn); env(e,t,0.002,0.09*v,0.05,1.6); noise(t,1.8,hp); }
  function clang(t,v=1,f=310){ const e=g(0), bp=filt('bandpass',2600,1.8); bp.connect(e); e.connect(pan(Math.random()*1.2-0.6)).connect(S.mix); e.connect(g(1.2)).connect(S.revIn);
    const end=env(e,t,0.001,0.06*v,0.01,0.9); for(const r of [1,1.37,1.93,2.58,3.17]) osc('square',f*r,t,end,bp); }
  function piston(t,v=1){ const e=g(0), lp=filt('lowpass',3200,6); lp.connect(e).connect(S.mix); env(e,t,0.005,0.12*v,0.05,0.3);
    lp.frequency.setValueAtTime(3200,t); lp.frequency.exponentialRampToValueAtTime(180,t+0.35); noise(t,0.4,lp); kick(t+0.01,0.35*v,true); }
  function arp(t,note,v=1){ const e=g(0), lp=filt('lowpass',4200,9); lp.connect(e); e.connect(S.mix); e.connect(S.dly);
    lp.frequency.setValueAtTime(4200,t); lp.frequency.exponentialRampToValueAtTime(320,t+0.17); const end=env(e,t,0.003,0.075*v,0.03,0.16);
    osc('square',N(note),t,end,lp); osc('sawtooth',N(note),t,end,lp,6); }
  function bell(t,note,v=1){ const parts=[[0.5,7],[1,5.5],[1.19,3.5],[1.56,3],[2,2.5],[2.51,2],[3.01,1.6],[4.1,1.1]];
    for(const [r,dec] of parts){ const e=g(0); e.connect(S.mix); e.connect(g(0.7)).connect(S.revIn); const end=env(e,t,0.003,0.05*v/Math.sqrt(r),0.01,dec); osc('sine',N(note)*r,t,end,e); } }
  function musicBox(t,note,v=1){ const e=g(0); e.connect(S.mix); e.connect(S.dly); const end=env(e,t,0.002,0.06*v,0.02,1.3);
    osc('triangle',N(note),t,end,e,Math.random()*50-25); osc('sine',N(note)*4.02,t,t+0.3,e); }
  function glitch(t,v=1){ for(let k=0;k<7;k++){ const tt=t+k*0.034, e=g(0), bp=filt('bandpass',400+Math.random()*5000,6); bp.connect(e).connect(S.mix); env(e,tt,0.001,0.09*v,0.012,0.01); noise(tt,0.04,bp); } }
  function radio(t,dur,v=1){ const e=g(0), bp=filt('bandpass',1700,1.2); bp.connect(e).connect(pan(0.6)).connect(S.mix);
    e.gain.setValueAtTime(0.0001,t); for(let k=0;k<dur;k+=0.06) e.gain.setValueAtTime((Math.random()<0.6?0.035:0.004)*v,t+k); e.gain.setValueAtTime(0.0001,t+dur); noise(t,dur,bp); }
  function heartbeat(t,v=1){ kick(t,0.45*v,true); kick(t+0.27,0.3*v,true); }
  function breath(t,dur,v=1){ const e=g(0), bp=filt('bandpass',900,2); bp.connect(e); e.connect(S.revIn); e.gain.setValueAtTime(0.0001,t); e.gain.exponentialRampToValueAtTime(0.05*v,t+dur*0.85); e.gain.linearRampToValueAtTime(0.0001,t+dur); noise(t,dur,bp); }

  /* ---------- the score ---------- */
  const at=(t,s16)=>t+s16*S16;
  const CHOIR=[[12,15,19],[13,17,20],[12,15,19],[19,23,26]];                 // Dm, Eb, Dm, A
  const RIFF=[ [[0,0,6],[6,0,1,1],[7,0,1,1],[8,0,4],[12,3,4]],               // D ... F
               [[0,1,12],[12,0,2],[14,-2,2]],                                // Eb (the phrygian ache), D, C
               [[0,0,6],[6,0,1,1],[7,0,1,1],[8,5,4],[12,3,4]],               // D ... G F
               [[0,1,8],[8,-2,4],[12,-5,4]] ];                               // Eb, C, A: the drop
  const BLACK_ROOTS=[0,-4,-2,-5,0,-4,3,1], BLACK_MEL=[[31,32],[31,29],[27,29],[29,31],[36,34],[32,31],[27,29],[25,24]];
  const BLACK_CHORD=r=>[r+24,r+24+(r===0?3:4),r+31];                       // D minor, the others major (Bb, C, A, F, Eb)
  const ARP=[24,27,31,36,31,27,24,19,24,27,31,34,31,27,24,22];
  const MACH_ROOTS=[0,0,1,0,3,0,-2,-5];
  const LULLABY=[36,39,43,41,39,38,36,null, 36,39,43,46,44,43,41,null];        // D F A G F E D . D F A C Bb A G

  const SECTIONS={
    ruins(t,i){ if(i===0) drone(t,BAR*8+2);
      if(i%2===0) choir(t,CHOIR[(i/2)%4],BAR*2-0.2,0.9);
      if(i%2===0) clang(at(t,0),0.7,280+Math.random()*80); if(i%2===1) piston(at(t,8),0.6);
      if(i>=4) for(let k=0;k<16;k+=2) arp(at(t,k),ARP[k]+(i>=6?1:0),0.35+i*0.05);
      if(Math.random()<0.4) radio(at(t,4+Math.floor(Math.random()*8)),0.6+Math.random());
      if(i===7) for(let k=12;k<16;k++) snare(at(t,k),0.25+0.15*(k-12)); },          // a roll into the next movement
    doom(t,i){ const r=RIFF[i%4]; for(const [p,root,len,m] of r){ guitar(at(t,p),root,len,m); bass(at(t,p),root,len); }
      if(i===0||i===4) crash(t,1); kick(at(t,0)); kick(at(t,6),0.8); if(i%2) kick(at(t,10),0.7); snare(at(t,8),1.1);
      for(let k=0;k<16;k+=2) hat(at(t,k),k%4?0.5:0.8); if(i%4===0) clang(at(t,0),0.5);
      if(i>=4) leadLong(at(t,0),[31,32,31,29][i-4],BAR,0.9); },
    black(t,i){ const r=BLACK_ROOTS[i]; guitar(t,r,16,false,0.8); bass(t,r,16,0.9);
      tremolo(at(t,0),BLACK_MEL[i][0],BAR/2); tremolo(at(t,8),BLACK_MEL[i][1],BAR/2);
      if(i%2===0) choir(t,BLACK_CHORD(r),BAR*2-0.2,0.7); if(i===0||i===4) crash(t,1.1);
      for(let k=0;k<16;k++) kick(at(t,k),0.32); for(let k=4;k<16;k+=8) snare(at(t,k),0.8); for(let k=0;k<16;k+=2) hat(at(t,k),0.4); },
    machine(t,i){ const r=MACH_ROOTS[i];
      for(let k=0;k<16;k+=4) kick(at(t,k),0.95); snare(at(t,4),0.7); snare(at(t,12),0.7);
      clang(at(t,3),0.8,300); clang(at(t,11),0.6,i%2?420:240); piston(at(t,6),0.7); piston(at(t,14),0.5);
      for(let k=0;k<16;k++){ hat(at(t,k),k%4===2?0.9:0.35); arp(at(t,k),ARP[k]+r,0.8+(k%4===0?0.3:0)); bass(at(t,k),k%2?r+12:r,1,0.75,true); }
      if(i===3||i===7) glitch(at(t,14),1); if(i===7) guitar(at(t,12),1,4,false,0.9); },
    brief(t,i){ if(i===0) drone(t,BAR*8+2); heartbeat(at(t,0)); heartbeat(at(t,8),0.8);
      if(i%4===0) choir(t,[12,15],BAR*4-0.3,0.5); if(Math.random()<0.6) radio(at(t,Math.floor(Math.random()*12)),0.4+Math.random()*1.2,1.2);
      if(i>=2) for(let k=0;k<16;k+=4) arp(at(t,k+2),ARP[(k+i*4)%16],0.3); if(i%4===3) clang(at(t,12),0.4,260); },
    requiem(t,i){ if(i===0) drone(t,BAR*8+2);
      if(i%4===0) choir(t,i%8===0?[12,15,19]:[13,17,20],BAR*4-0.3,0.85);
      if(i%2===0) bell(at(t,0),i%4===0?12:7,1); else bell(at(t,8),0,0.6);
      if(ui.zombie){ const half=(i%2)*8; for(let k=0;k<8;k++){ const nt=LULLABY[half+k]; if(nt!=null) musicBox(at(t,k*2),nt,0.9); } if(i%4===3) breath(at(t,4),BAR*0.7); } }
  };
  const PLAN={ menu:()=>['ruins',...shuffleDoomFirst()], brief:()=>['brief'], requiem:()=>['requiem'] };
  function shuffleDoomFirst(){ const rest=['black','machine']; if(Math.random()<0.5) rest.reverse(); return Math.random()<0.4?['doom',...rest,'doom']:['doom',...rest]; }

  /* ---------- transport ---------- */
  function tick(){ if(!S) return; scheduleUntil(ac.currentTime+0.7); }
  function scheduleUntil(limit){
    while(S.next < limit){
      if(!S.queue.length){ S.queue=PLAN[S.mood](); S.bar=0; }
      const sec=S.queue[0]; try{ SECTIONS[sec](S.next,S.bar); }catch(e){ console.error(e); }
      S.next+=BAR; S.bar++; if(S.bar>=8 || (sec==='ruins'&&S.cycle>0&&S.bar>=4)){ S.queue.shift(); S.bar=0; if(sec==='ruins') S.cycle=(S.cycle||0)+1; }
    } }
  function start(m){ if(!on||!ctx()) return; if(ac.state==='suspended') ac.resume();
    if(S){ if(S.mood===m) return; stop(3); }                                  // new mood: crossfade into a fresh session
    S=buildSession(); S.mood=m; S.want=m; S.queue=[]; S.bar=0; S.next=ac.currentTime+0.15;
    S.out.gain.setValueAtTime(0.0001,ac.currentTime); S.out.gain.exponentialRampToValueAtTime(level(),ac.currentTime+4);
    clearInterval(timer); timer=setInterval(tick,60); tick(); }
  function stop(fade=1.6){ if(!S) return; const s=S; S=null; clearInterval(timer); timer=null;
    const now=ac.currentTime; s.out.gain.cancelScheduledValues(now); s.out.gain.setValueAtTime(Math.max(0.0001,s.out.gain.value),now); s.out.gain.exponentialRampToValueAtTime(0.0001,now+fade);
    setTimeout(()=>{ try{ s.out.disconnect(); }catch(e){} },fade*1000+4000); }
  const level=()=>Math.max(0.0001,vol*0.6);
  const MOODS={ menu:'menu', campaign:'menu', skirmish:'menu', manual:'menu', veterans:'menu', intel:'menu', brief:'brief', cenotaph:'requiem' };
  let scene='menu';
  let armed=false;   /* browsers only allow sound after the first click or key press */
  function setScene(name){ scene=name; const m=MOODS[name]; if(m){ if(armed) start(m); } else stop(name==null?1.2:2.5); }
  function setOn(v){ on=!!v; store.set('hc-music',on); if(on) setScene(scene); else stop(0.8); label(); }
  function setVol(v){ vol=clamp(+v,0,1); store.set('hc-music-vol',vol); if(S) S.out.gain.setTargetAtTime(level(),ac.currentTime,0.1); }
  function label(){ const b=document.getElementById('btn-music'); if(b){ b.textContent=on?'♪ Music on':'♪ Music off'; b.setAttribute('aria-pressed',on); } }
  function initUI(){ const r=document.getElementById('music-vol'); if(r){ r.value=Math.round(vol*100); r.addEventListener('input',()=>setVol(r.value/100)); }
    const b=document.getElementById('btn-music'); if(b) b.addEventListener('click',()=>setOn(!on)); label(); }
  const kick0=()=>{ armed=true; if(ac&&ac.state==='suspended') ac.resume(); if(on&&MOODS[scene]&&!S) setScene(scene); };
  document.addEventListener('pointerdown',kick0,{capture:true}); document.addEventListener('keydown',kick0,{capture:true});
  /* test hook: render a mood offline (for checking levels without speakers) */
  async function renderOffline(sec,m){ const keep={ac,noiseBuf,irBuf,S};
    prep(new OfflineAudioContext(2,Math.ceil(44100*sec),44100)); S=buildSession(); S.mood=m; S.queue=[]; S.bar=0; S.next=0.05; S.out.gain.value=level();
    scheduleUntil(sec); const buf=await ac.startRendering(); ({ac,noiseBuf,irBuf,S}=keep); return buf; }
  return { renderOffline, setScene, setOn, setVol, initUI, get on(){ return on; }, get playing(){ return !!S; }, get mood(){ return S&&S.mood; } };
})();
MUSIC.initUI(); MUSIC.setScene('menu');
