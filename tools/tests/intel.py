# Intel: the new entries (Structures, Swarm, Other, Rogue Strain), the moving pictures (21b-intel-anim.js) and that every tab
# fits on one screen without scrolling (also on 1024x768). Must end with ALL OK.
from playwright.sync_api import sync_playwright
errs=[]; res=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for vw,vh in [(1366,800),(1024,768)]:
        pg=b.new_page(viewport={'width':vw,'height':vh}); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(500); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
        r=pg.evaluate("""()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m); try{
          ui.intelFrom='menu'; goMenu('intel');
          const S=INTEL_TABS.find(t=>t.id==='struct'), W=INTEL_TABS.find(t=>t.id==='swarm'), O=INTEL_TABS.find(t=>t.id==='other');
          for(const k of ['medtent','terminal','uplink','chargesite','door','wreck','rubble']) ok(S.buildings.includes(k),'Structures: '+k);
          for(const k of ['relaypad','salvage','stabcase']) ok(S.extras.includes(k)&&INTEL_EXTRA[k],'Structures: '+k);
          ok(W.buildings.includes('shaft')&&W.extras.includes('heart'),'Swarm: Mine Shaft and Her Heart'); ok(O.extras.includes('raiders'),'Other: the raiders');
          ok(ROGUE_INTEL.some(x=>x.id==='choirpod'),'Rogue Strain: the Choir Pod');
          for(const T of INTEL_TABS){ intelTab=T.id; const n=()=>document.querySelectorAll('#intel-list [data-isel]').length; intelSel[T.id]=0; buildIntel(); const N=n();
            for(let i=0;i<N;i++){ intelSel[T.id]=i; buildIntel(); }
            const L=document.querySelector('#intel-list').getBoundingClientRect(), C=document.querySelector('#intel-grid').getBoundingClientRect();
            ok(L.bottom<=innerHeight&&C.bottom<=innerHeight+1,T.name+': '+N+' entries fit on one screen ('+Math.round(Math.max(L.bottom,C.bottom))+' of '+innerHeight+')');
            const pics=[...document.querySelectorAll('#intel-list .pic')], moving=pics.filter(p=>p.querySelector('canvas.ianim'));
            if(!T.relics) ok(moving.length===pics.length,T.name+': every entry in the list moves ('+moving.length+'/'+pics.length+')');
            if(!T.relics) ok(!!document.querySelector('#intel-grid .pic canvas.ianim'),T.name+': and the big picture'); }
          /* every scene key in use draws without error, and it changes over time */
          const keys=[...new Set([...document.querySelectorAll('[data-anim]')].map(e=>e.dataset.anim).concat(Object.keys(INTEL_SCENES),['crew_trooper','crew_gunner','crew_pyro','crew_medic','crew_engineer','vial:#8dff4a','vial:#c38bff','art:relic']))];
          let bad=[], still=[]; for(const k of keys){ const f=document.createElement('canvas'); f.width=f.height=48; const c=f.getContext('2d'), sc=intelScene(k);
            const shot=t=>{ c.clearRect(0,0,48,48); try{ sc(c,t); }catch(e){ bad.push(k+': '+e.message); } return f.toDataURL(); };
            const a=shot(0.1), b2=shot(0.9), c3=shot(2.3); if(a===b2&&b2===c3) still.push(k); }
          ok(!bad.length,'every scene draws ('+keys.length+')'+(bad.length?': '+bad.join('; '):''));
          ok(!still.length,'every scene moves'+(still.length?': not '+still.join(', '):''));
          /* the raiders get their name after Night Shift */
          delete ui.progress.results['night-shift']; ok(intelExtraDef('raiders').name==='Unidentified raiders','before Night Shift: unidentified raiders');
          recordWin('night-shift','normal',500,false); ok(intelExtraDef('raiders').name==='The Osprey crew'&&/Order 9/.test(intelExtraDef('raiders').role),'after it: the Osprey crew, Order 9');
          intelTab='other'; intelSel.other=1; buildIntel(); ok(/The Osprey crew/.test(document.querySelector('#intel-grid').textContent),'the card says so');
          goMenu('menu'); ok(!iaLoopOn||document.getElementById('s-intel').hidden,'the loop stops when Intel closes');
        }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }""")
        print('--',vw,vh); print(r); res.append(r); pg.close()
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
