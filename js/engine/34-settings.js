'use strict';
/* ---------- Menu → Settings: light and sound ----------
   Light sliders work in 2D and 3D (brightness, explored areas) or only in 3D (the rest). They are kept in this browser (hc-light)
   and write into VIEW3D, so the dev panel shows the same numbers. Sound (music in missions, sound effects, voices, voice volume)
   used to sit in the top bar; the buttons kept their ids and their code (20-input.js, 22-squad-life.js, 24-music.js). */
const LIGHT_SET = [
  { k:'bright',  label:'Brightness',         tip:'Everything on the battlefield, 2D and 3D.',                                         min:0.6, max:1.6, step:0.05, def:1 },
  { k:'fog',     label:'Explored areas',     tip:'How dark the places are that you saw before but nobody sees now (2D and 3D). Left is lighter.', min:0.3, max:1.3, step:0.05, def:1 },
  { k:'sun',     label:'3D sunlight',        tip:'The low sun that throws the long shadows.',                                         min:0,   max:3,   step:0.05, def:1.45 },
  { k:'ambient', label:'3D soft light',      tip:'Light from all sides: lifts the shadows.',                                          min:0,   max:2,   step:0.05, def:0.85 },
  { k:'seen',    label:'3D in sight',        tip:'Extra light on what your units see right now.',                                     min:0,   max:1,   step:0.02, def:0.28 },
  { k:'dark',    label:'3D dark missions',   tip:'Soft light in dark missions (Blackout, Night Shift …).',                            min:0,   max:1,   step:0.02, def:0.26 },
  { k:'lamp',    label:'3D helmet lamps',    tip:'How bright the helmet lamps shine in dark missions.',                               min:0,   max:3,   step:0.05, def:1.25 },
  { k:'gen',     label:'3D generators',      tip:'The light of a running generator.',                                                 min:0,   max:5,   step:0.1,  def:2.4 },
  { k:'shadows', label:'3D shadows',         tip:'Shadows of rock, buildings and units. Off is lighter on a slow computer.',          check:true,               def:true }
];
const lightSet = Object.assign(Object.fromEntries(LIGHT_SET.map(o=>[o.k,o.def])), store.get('hc-light',{}));
function applyLight(){ const L=lightSet, V=VIEW3D;
  V.sun=L.sun; V.ambient=L.ambient; V.seenLift=L.seen; V.seenAdd=L.seen*0.18; V.darkSeenAdd=L.seen*0.4;
  V.darkAmbient=L.dark; V.darkSun=L.dark*0.55; V.lamp=L.lamp; V.genLight=L.gen; V.shadows=!!L.shadows;
  ui.fogDark=L.fog;
  const f=Math.abs(L.bright-1)<0.001?'':`brightness(${L.bright})`; cv.style.filter=f; if(V3.r) V3.r.domElement.style.filter=f; }
function buildLightSettings(){ const box=$('#set-light'); if(!box) return; box.innerHTML='';
  for(const o of LIGHT_SET){ const row=document.createElement('label'); row.className='set-row'; row.dataset.tip=o.label+'|'+o.tip;
    const name=document.createElement('span'); name.textContent=o.label; row.appendChild(name);
    if(o.check){ const c=document.createElement('input'); c.type='checkbox'; c.checked=!!lightSet[o.k]; c.id='set-'+o.k;
      c.addEventListener('change',()=>{ lightSet[o.k]=c.checked; store.set('hc-light',lightSet); applyLight(); }); row.appendChild(c); }
    else { const r=document.createElement('input'), v=document.createElement('b'); r.type='range'; r.min=o.min; r.max=o.max; r.step=o.step; r.value=lightSet[o.k]; r.id='set-'+o.k; r.setAttribute('aria-label',o.label);
      const show=()=>{ v.textContent=Math.round(lightSet[o.k]/(o.def||1)*100)+'%'; }; show();
      r.addEventListener('input',()=>{ lightSet[o.k]=+r.value; store.set('hc-light',lightSet); applyLight(); show(); }); row.appendChild(r); row.appendChild(v); }
    box.appendChild(row); } }
function openSettings(){ buildLightSettings(); show('settings'); const b=$('#settings-back'); if(b) b.focus({preventScroll:true}); }
SCREENS.push('settings');
$('#p-settings').addEventListener('click',openSettings);
document.addEventListener('click',e=>{ const b=e.target.closest('[data-go="settings"]'); if(b) buildLightSettings(); });   /* from the main menu (goMenu shows the screen) */
$('#settings-back').addEventListener('click',()=>{ if(G&&!G.over&&ui.mode==='pause'){ show('pause'); $('#p-resume').focus({preventScroll:true}); } else goMenu('menu'); });
$('#set-light-reset').addEventListener('click',()=>{ for(const o of LIGHT_SET) lightSet[o.k]=o.def; store.set('hc-light',lightSet); applyLight(); buildLightSettings(); });
applyLight();
