'use strict';
/* ---------- 2v. music: the Hollow Colony soundtrack ----------
   Generated live with Web Audio: no audio files. Plays on the menu screens only, never during a mission.
   Every track is a list of sections (a few bars each) with its own tempo, key, reverb and colour; see TRACKS below.
     Hollow Light            doom, black metal, industrial and cyberpunk in four movements (the original)
     Hollow Light: Drowned   the same, slower, a whole tone lower and deeper in the hall
     Iron Psalm              the industrial side: anvils, pistons and palm-muted guitar
     Event Horizon           space black metal: synth nebulae, tremolo walls, far-away blast beats
     Selene's Silence        ambient black metal: clean arpeggios, wind, a storm that builds and fades
     Cold Quarters           depressive black metal: lo-fi, a lonely piano motif, a howling lead
     Dead Satellite          dark ambient: pulsar ticks, Morse, a drifting pad
     Funeral Orbit           funeral doom: a procession at 48 BPM under tolling bells
   The briefing and the Cenotaph have their own pieces (in zombie mode with an out-of-tune music box).
   The music player (button "Tracks", bottom right of the menu screens) lets you listen to each one and pick the menu music. */
const MUSIC=(()=>{
  let BEAT=60/72, S16=BEAT/4, BAR=BEAT*4, TR=0;
  const D2=73.42, N=s=>D2*Math.pow(2,(s+TR)/12);   // semitones above D2 (D=0, Eb=1, F=3, G=5, A=7, Bb=8, C=10, D3=12), shifted by the track's key
  function setTempo(trk){ BEAT=60/trk.bpm; S16=BEAT/4; BAR=BEAT*4; TR=trk.tr||0; }
  let ac=null, noiseBuf=null, irBuf=null, shapeHeavy=null, shapeLead=null, crushCurve=null;
  let on=store.get('hc-music',true), vol=store.get('hc-music-vol',0.3), menuTrack=store.get('hc-music-track','hollow');
  let S=null, timer=null, preview=null;          // S = the running session (own buses, so stopping cuts everything cleanly)

  /* ---------- set-up ---------- */
  function ctx(){ if(ac) return ac;
    try{ prep(new (window.AudioContext||window.webkitAudioContext)()); }catch(e){ ac=null; return null; }
    return ac; }
  function prep(c){ ac=c;
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate); const nd=noiseBuf.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
    const len=Math.floor(ac.sampleRate*4.8); irBuf=ac.createBuffer(2,len,ac.sampleRate);          // a big dark hall
    for(let c=0;c<2;c++){ const d=irBuf.getChannelData(c); let lp=0; for(let i=0;i<len;i++){ const k=i/len; lp=lp*0.82+(Math.random()*2-1)*0.18; d[i]=lp*Math.pow(1-k,3.4)*(i<ac.sampleRate*0.012?0.3:1); } }
    shapeHeavy=curve(70); shapeLead=curve(28);
    crushCurve=new Float32Array(1024); for(let i=0;i<1024;i++){ const x=i/1023*2-1; crushCurve[i]=Math.round(x*24)/24; } }
  function curve(k){ const n=4096, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return c; }
  function g(v){ const n=ac.createGain(); n.gain.value=v; return n; }
  function filt(type,f,q){ const n=ac.createBiquadFilter(); n.type=type; n.frequency.value=f; if(q!=null) n.Q.value=q; return n; }
  function pan(p){ const n=ac.createStereoPanner?ac.createStereoPanner():g(1); if(n.pan) n.pan.value=p; return n; }

  function buildSession(trk){
    const s={}; s.out=g(0); s.comp=ac.createDynamicsCompressor(); s.comp.threshold.value=-20; s.comp.ratio.value=4; s.comp.attack.value=0.01; s.comp.release.value=0.25;
    s.mix=g(1); s.comp.connect(s.out); s.out.connect(ac.destination);
    if(trk.lofi){ const sh=ac.createWaveShaper(); sh.curve=crushCurve; s.mix.connect(filt('lowpass',2600,0.8)).connect(filt('highpass',120)).connect(sh).connect(s.comp); }   // a cassette in a cold room
    else s.mix.connect(s.comp);
    s.rev=ac.createConvolver(); s.rev.buffer=irBuf; s.revIn=g(1); s.revIn.connect(filt('highpass',180)).connect(s.rev); s.rev.connect(g(0.85*(trk.rev||1))).connect(s.mix);
    // rhythm guitar: one distortion, then double-tracked hard left and right
    s.gtr=g(1); const pre=g(7), sh=ac.createWaveShaper(); sh.curve=shapeHeavy; sh.oversample='4x';
    const cab=filt('lowpass',trk.lofi?2200:3000,0.9), hp=filt('highpass',85), mid=filt('peaking',720,1); mid.gain.value=-7; const post=g(0.16);
    s.gtr.connect(pre).connect(sh).connect(hp).connect(mid).connect(cab).connect(post);
    const dl=ac.createDelay(0.05), dr=ac.createDelay(0.05); dl.delayTime.value=0.011; dr.delayTime.value=0.024;
    post.connect(dl).connect(pan(-0.75)).connect(s.mix); post.connect(dr).connect(pan(0.75)).connect(s.mix); post.connect(g(0.22*(trk.gtrRev||1))).connect(s.revIn);
    // tremolo lead: thinner, far away in the hall
    s.lead=g(1); const lpre=g(4), lsh=ac.createWaveShaper(); lsh.curve=shapeLead; lsh.oversample='4x'; const lpost=g(0.05);
    s.lead.connect(lpre).connect(lsh).connect(filt('highpass',260)).connect(filt('lowpass',4200,0.7)).connect(lpost);
    lpost.connect(pan(0.25)).connect(s.mix); lpost.connect(g(1.4)).connect(s.revIn);
    // dotted-eighth delay for arpeggios, stars and the music box
    s.dly=g(1); const d=ac.createDelay(3), fb=g(0.42), dlp=filt('lowpass',2400); d.delayTime.value=BEAT*0.75;
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

  /* ---- newer instruments ---- */
  function pad(t,notes,dur,v=1,bright=1){ for(const nt of notes){ const lp=filt('lowpass',350,1.5), e=g(0), p=pan(Math.random()*1.4-0.7);
      lp.connect(e); e.connect(p).connect(S.mix); e.connect(g(1.1)).connect(S.revIn);
      lp.frequency.setValueAtTime(350,t); lp.frequency.linearRampToValueAtTime(1500*bright,t+dur*0.55); lp.frequency.linearRampToValueAtTime(380,t+dur);
      const end=env(e,t,Math.min(3,dur*0.4),0.05*v,Math.max(0.1,dur-Math.min(3,dur*0.4)),3);
      for(const c of [-17,-6,5,16]) osc('sawtooth',N(nt),t,end,lp,c); } }
  function tremChord(t,root,dur,v=1,third){ const ivs=third==null?[0,7,12]:[0,third,7];
    for(let k=0;k*S16/2<dur-0.01;k++){ const tt=t+k*S16/2, e=g(0); e.connect(S.gtr); const end=env(e,tt,0.003,0.07*v*(k%2?0.8:1),0.03,0.04);
      for(const iv of ivs) osc('sawtooth',N(root+iv),tt,end,e,(k%2?-8:8)); } }
  function clean(t,note,v=1){ const lp=filt('lowpass',3200,1.2), e=g(0); lp.connect(e); e.connect(S.mix); e.connect(g(0.6)).connect(S.revIn); e.connect(g(0.35)).connect(S.dly);
    lp.frequency.setValueAtTime(3200,t); lp.frequency.exponentialRampToValueAtTime(700,t+1.2); const end=env(e,t,0.003,0.09*v,0.02,1.8);
    osc('triangle',N(note),t,end,lp); osc('sawtooth',N(note),t,end,lp,5); }
  function piano(t,note,v=1){ const e=g(0), lp=filt('lowpass',2400); lp.connect(e); e.connect(S.mix); e.connect(g(0.7)).connect(S.revIn);
    const end=env(e,t,0.004,0.1*v,0.03,2.6); osc('sine',N(note),t,end,lp); osc('triangle',N(note)*2,t,t+0.6,lp); osc('sine',N(note)*3.01,t,t+0.25,lp);
    const c=g(0), hp=filt('highpass',3000); hp.connect(c).connect(S.mix); env(c,t,0.001,0.02*v,0.002,0.02); noise(t,0.03,hp); }
  function wail(t,note,dur,v=1){ const e=g(0), lp=filt('lowpass',2200,2); lp.connect(e); e.connect(S.lead); const end=env(e,t,0.6,0.11*v,Math.max(0.1,dur-1.4),0.8);
    const o=osc('sawtooth',N(note),t,end,lp), lfo=ac.createOscillator(), lg=g(22); lfo.frequency.value=5.6; lfo.connect(lg).connect(o.detune); lfo.start(t+0.5); lfo.stop(end);
    o.frequency.setValueAtTime(N(note-1),t); o.frequency.exponentialRampToValueAtTime(N(note),t+0.35); }       // slides up into the note, like a voice
  function wind(t,dur,v=1){ const e=g(0), bp=filt('bandpass',500,1.4); bp.connect(e); e.connect(pan(Math.random()-0.5)).connect(S.mix); e.connect(S.revIn);
    bp.frequency.setValueAtTime(300+Math.random()*300,t); bp.frequency.linearRampToValueAtTime(700+Math.random()*900,t+dur*0.5); bp.frequency.linearRampToValueAtTime(260,t+dur);
    e.gain.setValueAtTime(0.0001,t); e.gain.exponentialRampToValueAtTime(0.06*v,t+dur*0.45); e.gain.exponentialRampToValueAtTime(0.0001,t+dur); noise(t,dur,bp); }
  function hiss(t,dur,v=1){ const e=g(0.012*v), hp=filt('highpass',5000); hp.connect(e).connect(S.mix); noise(t,dur,hp); }
  function star(t,note,v=1){ const e=g(0); e.connect(pan(Math.random()*1.6-0.8)).connect(S.mix); e.connect(S.dly); e.connect(g(0.8)).connect(S.revIn);
    const end=env(e,t,0.004,0.045*v,0.01,2.2); osc('sine',N(note),t,end,e); osc('sine',N(note)*2.756,t,t+0.4,e); }
  function pulsar(t,v=1){ const e=g(0), bp=filt('bandpass',1250,9); bp.connect(e).connect(pan(0.7)).connect(S.mix); e.connect(S.dly); env(e,t,0.001,0.08*v,0.004,0.03); noise(t,0.05,bp); }
  function morse(t,code,v=1){ let k=0; for(const ch of code){ if(ch===' '){ k+=0.24; continue; } const d=ch==='-'?0.18:0.06, e=g(0); e.connect(pan(-0.6)).connect(S.mix); e.connect(g(0.5)).connect(S.revIn);
      env(e,t+k,0.004,0.03*v,d,0.01); osc('sine',880,t+k,t+k+d+0.02,e); k+=d+0.07; } }
  function sub(t,note,dur,v=1){ const e=g(0); e.connect(S.mix); const end=env(e,t,1.5,0.18*v,Math.max(0.1,dur-2),1.5); osc('sine',N(note),t,end,e); osc('triangle',N(note),t,end,e,4); }
  function blast(t,v=1){ for(let k=0;k<16;k++){ if(k%2===0) kick(at(t,k),0.28*v); else snare(at(t,k),0.35*v); } }
  function tom(t,v=1,note=-5){ const e=g(0); e.connect(S.mix); e.connect(g(0.6)).connect(S.revIn); const end=env(e,t,0.003,0.4*v,0.02,0.5);
    const o=osc('sine',N(note)*2,t,end,e); o.frequency.exponentialRampToValueAtTime(N(note),t+0.25); }

  /* ---------- the score ---------- */
  function at(t,s16){ return t+s16*S16; }
  const tri=(r,minor)=>[r,r+(minor?3:4),r+7];
  // Hollow Light
  const CHOIR=[[12,15,19],[13,17,20],[12,15,19],[19,23,26]];                 // Dm, Eb, Dm, A
  const RIFF=[ [[0,0,6],[6,0,1,1],[7,0,1,1],[8,0,4],[12,3,4]],               // D ... F
               [[0,1,12],[12,0,2],[14,-2,2]],                                // Eb (the phrygian ache), D, C
               [[0,0,6],[6,0,1,1],[7,0,1,1],[8,5,4],[12,3,4]],               // D ... G F
               [[0,1,8],[8,-2,4],[12,-5,4]] ];                               // Eb, C, A: the drop
  const BLACK_ROOTS=[0,-4,-2,-5,0,-4,3,1], BLACK_MEL=[[31,32],[31,29],[27,29],[29,31],[36,34],[32,31],[27,29],[25,24]];
  const BLACK_CHORD=r=>[r+24,r+24+(r===0?3:4),r+31];                         // D minor, the others major
  const ARP=[24,27,31,36,31,27,24,19,24,27,31,34,31,27,24,22];
  const MACH_ROOTS=[0,0,1,0,3,0,-2,-5];
  const LULLABY=[36,39,43,41,39,38,36,null, 36,39,43,46,44,43,41,null];      // D F A G F E D . D F A C Bb A G
  // Iron Psalm: palm-muted chugs with Eb and F accents
  const FORGE=[[0,0,1,1],[1,0,1,1],[2,0,1,1],[4,0,1,1],[5,0,1,1],[6,1,2,0],[8,0,1,1],[9,0,1,1],[10,0,1,1],[12,0,1,1],[13,3,3,0]];
  // Event Horizon (D aeolian): Dm Bb F C / Dm Eb Bb A
  const SPACE=[[0,1],[-4,0],[3,0],[-2,0],[0,1],[1,0],[-4,0],[-5,0]];
  const SPACE_MEL=[31,29,27,26,31,32,29,28], STARS=[36,39,41,43,46,48,51,53];
  // Selene's Silence (E minor): Em C G D
  const FOREST=[[0,1],[-4,0],[3,0],[-2,0]], PICK=[12,19,24,27,26,19,24,19], SELENE_MEL=[31,28,26,29];
  const pickNote=(r,m,k)=>r+PICK[k]+(!m&&PICK[k]%12===3?1:0);                // minor third in a minor chord, major third otherwise
  // Cold Quarters (A minor): Am F Dm E, a lonely piano motif and a howl
  const COLD=[[0,1],[-4,0],[5,1],[7,0]];
  const COLD_PIANO=[[31,null,27,null,24,null,27,29],[29,null,24,null,20,null,24,27],[32,null,29,null,24,null,29,31],[31,null,26,null,23,null,26,31]];
  const COLD_WAIL=[31,29,32,35];
  // Funeral Orbit
  const PROCESSION=[0,0,1,1,-2,-2,-4,-5], FUNERAL_MEL=[31,32,31,29,27,29,25,24];

  const SECTIONS={
    /* --- Hollow Light (+ Drowned, Iron Psalm) --- */
    ruins(t,i){ if(i===0) drone(t,BAR*8+2);
      if(i%2===0) choir(t,CHOIR[(i/2)%4],BAR*2-0.2,0.9);
      if(i%2===0) clang(at(t,0),0.7,280+Math.random()*80); if(i%2===1) piston(at(t,8),0.6);
      if(i>=4) for(let k=0;k<16;k+=2) arp(at(t,k),ARP[k]+(i>=6?1:0),0.35+i*0.05);
      if(Math.random()<0.4) radio(at(t,4+Math.floor(Math.random()*8)),0.6+Math.random());
      if(i===7) for(let k=12;k<16;k++) snare(at(t,k),0.25+0.15*(k-12)); },
    doom(t,i){ const r=RIFF[i%4]; for(const [p,root,len,m] of r){ guitar(at(t,p),root,len,m); bass(at(t,p),root,len); }
      if(i===0||i===4) crash(t,1); kick(at(t,0)); kick(at(t,6),0.8); if(i%2) kick(at(t,10),0.7); snare(at(t,8),1.1);
      for(let k=0;k<16;k+=2) hat(at(t,k),k%4?0.5:0.8); if(i%4===0) clang(at(t,0),0.5);
      if(i>=4) leadLong(at(t,0),[31,32,31,29][i-4],BAR,0.9); },
    doomLead(t,i){ SECTIONS.doom(t,i); if(i<4) leadLong(at(t,0),[36,37,36,34][i],BAR,0.7); if(i%2===0) choir(t,CHOIR[(i/2)%4],BAR*2-0.2,0.6); },
    black(t,i){ const r=BLACK_ROOTS[i]; guitar(t,r,16,false,0.8); bass(t,r,16,0.9);
      tremolo(at(t,0),BLACK_MEL[i][0],BAR/2); tremolo(at(t,8),BLACK_MEL[i][1],BAR/2);
      if(i%2===0) choir(t,BLACK_CHORD(r),BAR*2-0.2,0.7); if(i===0||i===4) crash(t,1.1);
      for(let k=0;k<16;k++) kick(at(t,k),0.32); for(let k=4;k<16;k+=8) snare(at(t,k),0.8); for(let k=0;k<16;k+=2) hat(at(t,k),0.4); },
    machine(t,i){ const r=MACH_ROOTS[i];
      for(let k=0;k<16;k+=4) kick(at(t,k),0.95); snare(at(t,4),0.7); snare(at(t,12),0.7);
      clang(at(t,3),0.8,300); clang(at(t,11),0.6,i%2?420:240); piston(at(t,6),0.7); piston(at(t,14),0.5);
      for(let k=0;k<16;k++){ hat(at(t,k),k%4===2?0.9:0.35); arp(at(t,k),ARP[k]+r,0.8+(k%4===0?0.3:0)); bass(at(t,k),k%2?r+12:r,1,0.75,true); }
      if(i===3||i===7) glitch(at(t,14),1); if(i===7) guitar(at(t,12),1,4,false,0.9); },
    forge(t,i){ for(const [p,root,len,m] of FORGE){ guitar(at(t,p),root+(i>=4&&!m?-2*(i%2):0),len,!!m,0.95); if(!m) bass(at(t,p),root,len); }
      for(let k=0;k<16;k+=4) kick(at(t,k),1); kick(at(t,7),0.6); snare(at(t,4),0.9); snare(at(t,12),0.9);
      clang(at(t,2),0.7,320); clang(at(t,10),0.7,i%2?460:260); piston(at(t,14),0.6); for(let k=1;k<16;k+=2) hat(at(t,k),0.6);
      if(i%4===0) crash(t,0.8); if(i===3||i===7) glitch(at(t,15),0.8); if(i>=4) for(let k=0;k<16;k+=2) arp(at(t,k),ARP[k],0.45); },
    /* --- Event Horizon: space black metal --- */
    void(t,i){ const [r,m]=SPACE[i%8]; if(i===0) sub(t,-12,BAR*8+2,0.9);
      if(i%2===0) pad(t,tri(r+24,m),BAR*2-0.1,1,0.8);
      for(let k=0;k<4;k++) if(Math.random()<0.7) star(at(t,k*4+Math.floor(Math.random()*3)),STARS[Math.floor(Math.random()*STARS.length)],0.8);
      for(let k=0;k<16;k+=8) pulsar(at(t,k+3),0.6); if(i===7) for(let k=8;k<16;k++) tom(at(t,k),0.2+0.06*(k-8),-5+(k%3)); },
    nebula(t,i){ const [r,m]=SPACE[i%8]; tremChord(t,r,BAR,0.85); bass(t,r,16,0.8); pad(t,tri(r+24,m),BAR,0.9,1.3);
      tremolo(at(t,0),SPACE_MEL[i%8]+12,BAR,0.65); blast(t,0.9); if(i%4===0) crash(t,1.1);
      if(Math.random()<0.5) star(at(t,8),STARS[Math.floor(Math.random()*STARS.length)]+12,0.7); },
    drift(t,i){ const [r,m]=SPACE[i%8]; guitar(t,r,16,false,0.7); bass(t,r,16,0.8); if(i%2===0) pad(t,tri(r+24,m),BAR*2-0.1,1,1);
      kick(at(t,0),0.8); kick(at(t,10),0.5); snare(at(t,8),0.9); for(let k=0;k<16;k+=4) hat(at(t,k),0.5);
      leadLong(at(t,0),SPACE_MEL[i%8],BAR,0.8); for(let k=2;k<16;k+=4) star(at(t,k),STARS[(i+k)%8],0.5); },
    /* --- Selene's Silence: ambient black metal --- */
    forest(t,i){ const [r,m]=FOREST[i%4]; for(let k=0;k<8;k++) clean(at(t,k*2),pickNote(r,m,k),0.85);
      if(i%2===0) pad(t,tri(r+12,m),BAR*2-0.1,0.6,0.7); if(i===0||i===4) wind(t,BAR*4,0.9); if(i%4===0) sub(t,r-12,BAR*4,0.5); },
    swell(t,i){ const [r,m]=FOREST[i%4]; for(let k=0;k<8;k++) clean(at(t,k*2),pickNote(r,m,k),0.6);
      tremChord(t,r,BAR,0.25+0.06*i,m?3:4); pad(t,tri(r+24,m),BAR,0.7,1); tom(at(t,0),0.4+0.05*i,r); tom(at(t,8),0.3+0.05*i,r+3);
      if(i>=4) for(let k=0;k<16;k+=2) kick(at(t,k),0.12+0.03*(i-4)); if(i===7) crash(at(t,12),0.7); },
    storm(t,i){ const [r,m]=FOREST[i%4]; tremChord(t,r,BAR,0.9,m?3:4); bass(t,r,16,0.8); pad(t,tri(r+24,m),BAR,0.8,1.4);
      blast(t,0.85); if(i%4===0) crash(t,1); wail(at(t,0),SELENE_MEL[i%4]+12,BAR,0.75); if(i%2===0) wind(t,BAR*2,0.7); },
    /* --- Cold Quarters: depressive black metal --- */
    room(t,i){ const [r,m]=COLD[i%4], mot=COLD_PIANO[i%4]; hiss(t,BAR+0.05,1); piano(at(t,0),r+12,0.7);
      mot.forEach((nt,k)=>{ if(nt!=null) piano(at(t,k*2),nt,0.85); }); if(i%2===0) pad(t,tri(r+12,m),BAR*2-0.1,0.45,0.6); if(i%4===3) wind(at(t,4),BAR,0.5); },
    ache(t,i){ const [r,m]=COLD[i%4]; hiss(t,BAR+0.05,1.2); tremChord(t,r,BAR,0.8,m?3:4); bass(t,r,16,0.75);
      kick(at(t,0),0.7); snare(at(t,8),0.75); kick(at(t,10),0.4); for(let k=0;k<16;k+=4) hat(at(t,k),0.45);
      if(i>=2) wail(at(t,0),COLD_WAIL[i%4]+12*(i>=6?1:0),BAR,0.8);
      if(i>=4) COLD_PIANO[i%4].forEach((nt,k)=>{ if(nt!=null&&k%2===0) piano(at(t,k*2),nt+12,0.5); }); },
    /* --- Dead Satellite: dark ambient --- */
    orbit(t,i){ if(i%4===0){ sub(t,-12,BAR*4+1,0.8); pad(t,i%8===0?[12,15,19,24]:[13,17,20,25],BAR*4-0.1,0.9,0.6); }
      for(let k=0;k<16;k+=4) pulsar(at(t,k),0.7); if(i%2===1) radio(at(t,6),1.4,0.9);
      if(i%4===2) morse(at(t,2),['... --- ...','.-.. ..- -. .- .-.','-.. ..- ... -'][Math.floor(Math.random()*3)],1);
      if(Math.random()<0.6) star(at(t,Math.floor(Math.random()*14)),STARS[Math.floor(Math.random()*STARS.length)]-12,0.7);
      if(i===3||i===7) wind(t,BAR*1.5,0.6); if(i===6) bell(at(t,0),0,0.5); },
    /* --- Funeral Orbit: funeral doom --- */
    toll(t,i){ if(i===0) drone(t,BAR*4+2); bell(at(t,0),i%2?7:12,1); if(i%2===0) choir(t,[12,15,19],BAR*2-0.2,0.8); if(i===3) for(let k=8;k<16;k+=2) tom(at(t,k),0.3+0.05*k,-5); },
    procession(t,i){ const r=PROCESSION[i]; guitar(t,r,16,false,1); bass(t,r,16,1); if(i%2===0) choir(t,tri(r+12,r!==0&&r!==-5?0:1),BAR*2-0.2,0.7);
      kick(at(t,0),1,true); snare(at(t,8),1.1); for(let k=0;k<16;k+=4) hat(at(t,k),0.35); if(i%2===0) crash(t,0.9);
      leadLong(at(t,0),FUNERAL_MEL[i],BAR,0.85); if(i%4===0) bell(at(t,0),12,0.6); },
    /* --- screen moods --- */
    brief(t,i){ if(i===0) drone(t,BAR*8+2); heartbeat(at(t,0)); heartbeat(at(t,8),0.8);
      if(i%4===0) choir(t,[12,15],BAR*4-0.3,0.5); if(Math.random()<0.6) radio(at(t,Math.floor(Math.random()*12)),0.4+Math.random()*1.2,1.2);
      if(i>=2) for(let k=0;k<16;k+=4) arp(at(t,k+2),ARP[(k+i*4)%16],0.3); if(i%4===3) clang(at(t,12),0.4,260); },
    requiem(t,i){ if(i===0) drone(t,BAR*8+2);
      if(i%4===0) choir(t,i%8===0?[12,15,19]:[13,17,20],BAR*4-0.3,0.85);
      if(i%2===0) bell(at(t,0),i%4===0?12:7,1); else bell(at(t,8),0,0.6);
      if(ui.zombie){ const half=(i%2)*8; for(let k=0;k<8;k++){ const nt=LULLABY[half+k]; if(nt!=null) musicBox(at(t,k*2),nt,0.9); } if(i%4===3) breath(at(t,4),BAR*0.7); } }
  };

  /* The tracks. plan(cycle) returns the sections to play, as [name, bars]. */
  const flip=a=>Math.random()<0.5?a:a.slice().reverse();
  const TRACKS=[
    { id:'hollow',  title:'Hollow Light', style:'Doom · black · industrial', bpm:72,
      desc:'The original. Ruins, doom, black and machine in four movements, in a different order every time.',
      plan:c=>[[ 'ruins',c?4:8],['doom',8],...flip([['black',8],['machine',8]]),...(Math.random()<0.4?[['doom',8]]:[])] },
    { id:'drowned', title:'Hollow Light: Drowned', style:'Variant · funeral doom', bpm:60, tr:-2, rev:1.5, gtrRev:1.8,
      desc:'Slower, a whole tone lower and much deeper in the hall. The machine is gone; the lead sings over the riff.',
      plan:c=>[['ruins',8],['doom',8],['doomLead',8],['black',8]] },
    { id:'iron',    title:'Iron Psalm', style:'Variant · industrial metal', bpm:84,
      desc:'The machine side of Hollow Light: anvils, pistons and palm-muted chugs with the Eb that hurts.',
      plan:c=>[['forge',8],['machine',8],['forge',8],['doom',8]] },
    { id:'horizon', title:'Event Horizon', style:'Space black metal', bpm:68, rev:1.4,
      desc:'Synth nebulae, a wall of tremolo guitar and blast beats far away, as if heard from the other side of the Moon.',
      plan:c=>[['void',8],['nebula',8],['drift',8],['nebula',8]] },
    { id:'selene',  title:"Selene's Silence", style:'Ambient black metal', bpm:60, tr:2, rev:1.3, gain:1.35,
      desc:'Clean guitar in the wind. A storm builds in the distance, breaks over you and fades back into silence.',
      plan:c=>[['forest',8],['swell',8],['storm',8],['forest',8]] },
    { id:'cold',    title:'Cold Quarters', style:'Depressive black metal', bpm:58, tr:7, lofi:true, rev:1.2, gain:1.6,
      desc:'Lo-fi, like a tape in an empty bunk room. A lonely piano motif, a howling lead, plodding drums.',
      plan:c=>[['room',8],['ache',8],['room',4],['ache',8]] },
    { id:'satellite', title:'Dead Satellite', style:'Dark ambient', bpm:50, rev:1.6,
      desc:'No drums. Pulsar ticks, Morse from nobody, a pad drifting in orbit.',
      plan:c=>[['orbit',8]] },
    { id:'orbit',   title:'Funeral Orbit', style:'Funeral doom', bpm:48, tr:-4, rev:1.5,
      desc:'A procession at 48 beats per minute under tolling bells. The heaviest thing on the Moon.',
      plan:c=>[['toll',4],['procession',8]] },
    { id:'brief',   title:'Briefing', style:'Screen · mission briefing', bpm:72, screen:true,
      desc:'A heartbeat, static on the radio and a sparse arpeggio. Plays while you read the briefing.', plan:c=>[['brief',8]] },
    { id:'requiem', title:'Cenotaph', style:'Screen · Cenotaph', bpm:72, screen:true,
      desc:'A funeral bell and the choir. In zombie mode a music box joins in, slightly out of tune.', plan:c=>[['requiem',8]] }
  ];
  const TRACK=Object.fromEntries(TRACKS.map(t=>[t.id,t]));
  const MENU_TRACKS=TRACKS.filter(t=>!t.screen);

  /* ---------- transport ---------- */
  function tick(){ if(!S) return; scheduleUntil(ac.currentTime+0.7);
    if(S && S.shuffleNext){ const nx=S.shuffleNext; S.shuffleNext=null; start(nx,{shuffle:true}); } }
  function scheduleUntil(limit){ setTempo(S.track);
    while(S.next < limit){
      if(!S.queue.length){
        if(S.shuffle && S.cycle>0){ const pool=MENU_TRACKS.filter(t=>t.id!==S.track.id); S.shuffleNext=pick(pool).id; return; }   // next track, crossfaded
        S.queue=S.track.plan(S.cycle).map(x=>x.slice()); S.cycle++; }
      const cur=S.queue[0]; try{ SECTIONS[cur[0]](S.next,S.bar); }catch(e){ console.error(e); }
      S.next+=BAR; S.bar++; if(S.bar>=cur[1]){ S.queue.shift(); S.bar=0; }
    } }
  function start(id,opt={}){ if(!ctx()) return; if(ac.state==='suspended') ac.resume();
    const trk=TRACK[id]||TRACK.hollow; if(S && S.track===trk && !!S.shuffle===!!opt.shuffle) return;
    if(S) stop(3);                                                             // crossfade into a fresh session
    setTempo(trk); S=buildSession(trk); S.track=trk; S.shuffle=!!opt.shuffle; S.queue=[]; S.bar=0; S.cycle=0; S.next=ac.currentTime+0.15;
    S.out.gain.setValueAtTime(0.0001,ac.currentTime); S.out.gain.exponentialRampToValueAtTime(level(),ac.currentTime+(opt.fast?1.5:4));
    clearInterval(timer); timer=setInterval(tick,60); tick(); refreshPanel(); }
  function stop(fade=1.6){ if(!S) return; const s=S; S=null; clearInterval(timer); timer=null;
    const now=ac.currentTime; s.out.gain.cancelScheduledValues(now); s.out.gain.setValueAtTime(Math.max(0.0001,s.out.gain.value),now); s.out.gain.exponentialRampToValueAtTime(0.0001,now+fade);
    setTimeout(()=>{ try{ s.out.disconnect(); }catch(e){} },fade*1000+4000); refreshPanel(); }
  const level=()=>Math.max(0.0001,vol*0.6*((S&&S.track&&S.track.gain)||1));
  const MOODS={ menu:'menu', campaign:'menu', skirmish:'menu', manual:'menu', veterans:'menu', intel:'menu', brief:'brief', cenotaph:'requiem' };
  let scene='menu', armed=false;                 /* browsers only allow sound after the first click or key press */
  function sceneTrack(){ const m=MOODS[scene]; if(!m) return null; if(m!=='menu') return m; return menuTrack==='shuffle' ? (S&&S.shuffle&&!S.track.screen?S.track.id:pick(MENU_TRACKS).id) : menuTrack; }
  function applyScene(){ if(preview) return; const id=sceneTrack(); if(!id){ stop(1.2); return; } if(on&&armed) start(id,{shuffle:MOODS[scene]==='menu'&&menuTrack==='shuffle'}); }
  function setScene(name){ scene=name; if(!MOODS[name]){ preview=null; stop(name==null?1.2:2.5); closePanel(); return; } applyScene(); }
  function setOn(v){ on=!!v; store.set('hc-music',on); if(on){ armed=true; applyScene(); } else { preview=null; stop(0.8); } label(); }
  function setVol(v){ vol=clamp(+v,0,1); store.set('hc-music-vol',vol); if(S) S.out.gain.setTargetAtTime(level(),ac.currentTime,0.1); }
  function playPreview(id){ armed=true; if(!on){ on=true; store.set('hc-music',true); label(); } preview=id; start(id,{fast:true}); }
  function stopPreview(){ preview=null; if(S) stop(1); applyScene(); refreshPanel(); }
  function setMenuTrack(id){ menuTrack=id; store.set('hc-music-track',id); preview=null; if(S&&S.track.id===id&&MOODS[scene]==='menu'){ S.shuffle=false; refreshPanel(); return; } applyScene(); refreshPanel(); }

  /* ---------- the music player (fold-out panel) ---------- */
  const $id=x=>document.getElementById(x);
  function label(){ const b=$id('btn-music'); if(b){ b.textContent=on?'♪ Music on':'♪ Music off'; b.setAttribute('aria-pressed',on); } }
  function openPanel(open){ const p=$id('music-panel'), b=$id('btn-tracks'); if(!p) return; p.hidden=!open; b.setAttribute('aria-expanded',open); if(open){ refreshPanel(); const f=p.querySelector('button'); if(f) f.focus({preventScroll:true}); } }
  function closePanel(){ openPanel(false); }
  function refreshPanel(){ const list=$id('music-list'); if(!list||$id('music-panel').hidden) return;
    const playing=S&&S.track.id;
    $id('music-now').innerHTML=playing?`<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span> ${S.track.title}${preview?' · preview':S.shuffle?' · shuffle':''}`:'Silent';
    list.innerHTML=TRACKS.map(t=>{ const isP=playing===t.id, isM=menuTrack===t.id;
      return `<li class="trk ${isP?'playing':''}"><button type="button" class="play" data-mplay="${t.id}" aria-label="${isP?'Stop':'Play'} ${t.title}">${isP?'■':'▶'}</button>
        <div class="ti"><b>${t.title}</b><span class="st">${t.style} · ${t.bpm} BPM</span><span class="ds">${t.desc}</span></div>
        ${t.screen?'<span class="pin dim">screen</span>':`<button type="button" class="pin ${isM?'on':''}" data-mmenu="${t.id}" aria-pressed="${isM}" title="Play this on the menu screens">${isM?'★ Menu':'☆ Menu'}</button>`}</li>`; }).join('');
    $id('music-shuffle').checked=menuTrack==='shuffle'; }
  function initUI(){ const r=$id('music-vol'); if(r){ r.value=Math.round(vol*100); r.addEventListener('input',()=>setVol(r.value/100)); }
    const b=$id('btn-music'); if(b) b.addEventListener('click',()=>setOn(!on)); label();
    const tb=$id('btn-tracks'); if(tb) tb.addEventListener('click',()=>openPanel($id('music-panel').hidden));
    const p=$id('music-panel'); if(!p) return;
    p.addEventListener('click',e=>{ const pl=e.target.closest('[data-mplay]'), mm=e.target.closest('[data-mmenu]');
      if(e.target.closest('#music-close')){ closePanel(); $id('btn-tracks').focus(); return; }
      if(pl){ const id=pl.dataset.mplay; if(S&&S.track.id===id) stopPreview(); else playPreview(id); const nb=p.querySelector(`[data-mplay="${id}"]`); if(nb) nb.focus({preventScroll:true}); return; }
      if(mm){ setMenuTrack(mm.dataset.mmenu); return; } });
    $id('music-shuffle').addEventListener('change',e=>setMenuTrack(e.target.checked?'shuffle':(MENU_TRACKS[0].id)));
    p.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); closePanel(); $id('btn-tracks').focus(); } }); }
  const kick0=()=>{ armed=true; if(ac&&ac.state==='suspended') ac.resume(); if(on&&MOODS[scene]&&!S) applyScene(); };
  document.addEventListener('pointerdown',kick0,{capture:true}); document.addEventListener('keydown',kick0,{capture:true});
  /* test hook: render a track offline (for checking levels without speakers) */
  async function renderOffline(sec,id){ const keep={ac,noiseBuf,irBuf,S}, trk=TRACK[id]||TRACK.hollow;
    prep(new OfflineAudioContext(2,Math.ceil(44100*sec),44100)); setTempo(trk); S=buildSession(trk); S.track=trk; S.queue=[]; S.bar=0; S.cycle=0; S.next=0.05; S.out.gain.value=level();
    scheduleUntil(sec); const buf=await ac.startRendering(); ({ac,noiseBuf,irBuf,S}=keep); return buf; }
  return { renderOffline, setScene, setOn, setVol, initUI, playPreview, stopPreview, setMenuTrack, tracks:TRACKS.map(t=>t.id),
    get on(){ return on; }, get playing(){ return !!S; }, get track(){ return S&&S.track.id; }, get mood(){ return S&&S.track.id; } };
})();
MUSIC.initUI(); MUSIC.setScene('menu');
