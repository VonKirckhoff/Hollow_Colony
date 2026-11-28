# Intel in 3D (21c-intel-3d.js): the big card shows the 2D picture and the 3D model side by side for every entry of every tab
# (units, structures, extras, the Osprey crew, strains, relics), the 3D model moves, units play the loop of states (INTEL_LOOP)
# on the same clock in 2D and 3D (walk position, shots, falling), the state line names the state, nothing throws,
# the list on the left stays 2D, and the 3D view of a mission still works after Intel. Screenshots in /tmp/ia3.
# Must end with ALL OK.
import os
from playwright.sync_api import sync_playwright
os.makedirs('/tmp/ia3',exist_ok=True)
errs=[]; res=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
    for vw,vh in [(1366,800),(1024,768)]:
        pg=b.new_page(viewport={'width':vw,'height':vh}); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
        r=pg.evaluate("""()=>{ const out=[], ok=(c,m)=>out.push((c?'OK   ':'FAIL ')+m); try{
          devUnlock=true; recordWin('night-shift','normal',500,false); ui.intelFrom='menu'; goMenu('intel');
          let n=0, missing=[], still=[], bad=[], labs=[], fit=[];
          const grab=cv=>{ const c=document.createElement('canvas'); c.width=cv.width; c.height=cv.height; c.getContext('2d').drawImage(cv,0,0); return c.toDataURL(); };
          for(const T of INTEL_TABS){ intelTab=T.id; intelSel[T.id]=0; buildIntel(); const N=document.querySelectorAll('#intel-list [data-isel]').length;
            for(let i=0;i<N;i++){ intelSel[T.id]=i; buildIntel(); const pic=document.querySelector('#intel-grid .pic'), cv=pic&&pic.querySelector('canvas.ianim3d'), key=pic&&pic.dataset.anim;
              if(!key) continue; n++;
              if(!cv){ missing.push(T.id+':'+key); continue; }
              ia3Tick(cv,0.05); const a=grab(cv); ia3Tick(cv,0.6); const b2=grab(cv); ia3Tick(cv,5.2); const c3=grab(cv); if(a===b2&&b2===c3) still.push(key);
              const M=IA3.models.get(key); if(M&&M.err) bad.push(key+': '+M.err);
              const P=iaPlan(key), lab=pic.querySelector('.ia-state'); if(P&&(!lab||lab.hidden||!lab.textContent.includes(iaAt(P,5.2).lab))) labs.push(key);
              if(!P&&lab&&!lab.hidden) labs.push(key+' (not a unit)');
              if(document.querySelectorAll('#intel-list canvas.ianim3d').length) bad.push('3D in the list');
              const C=document.querySelector('#intel-grid').getBoundingClientRect(); if(C.bottom>innerHeight+1) fit.push(T.id+':'+key+' '+Math.round(C.bottom)); } }
          ok(n>60,'entries looked at: '+n);
          ok(!missing.length,'every card has its 3D model'+(missing.length?': not '+missing.join(', '):''));
          ok(!still.length,'every 3D model moves'+(still.length?': not '+still.join(', '):''));
          ok(!bad.length,'no errors'+(bad.length?': '+bad.slice(0,5).join('; '):''));
          ok(!labs.length,'the state line names the state of every unit (and only of units)'+(labs.length?': '+labs.join(', '):''));
          if(innerWidth>=1366) ok(!fit.length,'every card fits on the screen'+(fit.length?': '+fit.join(', '):'')); else out.push('INFO cards taller than the screen (also without 3D before Nov 2026): '+(fit.join(', ')||'none'));
          intelTab='corps'; buildIntel(); ok(document.querySelectorAll('#intel-list canvas.ianim').length>0&&!document.querySelectorAll('#intel-list canvas.ianim3d').length,'the list stays 2D');
          /* the same clock: walking, shooting, falling */
          const P=iaPlan('trooper'), at=st=>{ let t=0; for(const x of P.L){ if(x.st===st) return t; t+=x.d; } };
          const tw=at('walk')+INTEL_LOOP.walk*0.25, M=ia3Model('trooper'), cv=document.createElement('canvas'); cv.width=cv.height=96; cv._key='trooper';
          ia3Draw(cv,tw); const x3=M.g.position.x-IA3_X, x2=iaPos(P,iaAt(P,tw)).x-24; ok(Math.abs(x3-x2*M.k)<0.02&&x2>8,'walking: the 3D soldier stands where the 2D one does ('+x2.toFixed(1)+' px, '+x3.toFixed(2)+' tiles)');
          const ta=at('attack')+0.05; ia3Draw(cv,ta); ok(iaShots('trooper',iaAt(P,ta)).flash&&IA3.flashL.intensity>0&&IA3.n.line>0,'a shot in 2D is a muzzle flash and a tracer in 3D at the same moment');
          const tb=at('attack')+0.7; ia3Draw(cv,tb); ok(!iaShots('trooper',iaAt(P,tb)).firing&&!(IA3.n.line>0),'and between bursts neither fires');
          const td=at('down')+1; ia3Draw(cv,td); ok(iaFall(iaAt(P,td))===1&&Math.abs(M.g.rotation.x)>1.3,'down: he lies on his back in 3D as in 2D');
          const tu=at('up')+INTEL_LOOP.up; ia3Draw(cv,tu-0.001); ok(Math.abs(M.g.rotation.x)<0.05,'and stands again when the loop starts over');
          const Pm=iaPlan('medic'), hm=Pm.L.findIndex(x=>x.st==='heal'); let th=0; for(let i=0;i<hm;i++) th+=Pm.L[i].d; const Mm=ia3Model('medic'); cv._key='medic'; ia3Draw(cv,th+1);
          ok(Mm.props.patient&&Mm.props.patient.g&&Mm.props.patient.g.visible,'the Medic patches up a fallen soldier in 3D too');
          const Pb=iaPlan('broodmother'); ok(['screech','egg','rain','burrow','rise'].every(s=>Pb.L.some(x=>x.st===s)),'the Matron: screech, eggs, acid rain, burrow and break out');
          ok(iaPlan('crew_pyro')&&iaPlan('crew_pyro').ty==='pyro'&&!iaPlan('hq'),'the Osprey crew plays the loop too, structures do not');
          ok(G===null||G===window.G,'G is put back');
          goMenu('menu'); ok(!iaLoopOn||document.getElementById('s-intel').hidden,'the loop stops when Intel closes');
        }catch(e){ out.push('FAIL error '+e.message+' '+(e.stack||'').split('\\n')[1]); } return out.join('\\n'); }""")
        print('--',vw,vh); print(r); res.append(r)
        # screenshots of a few cards
        for tab,i,name in [('corps',3,'medic'),('swarm',8,'matron'),('struct',2,'sentry')]:
            pg.evaluate(f"()=>{{ ui.intelFrom='menu'; goMenu('intel'); intelTab='{tab}'; intelSel['{tab}']={i}; buildIntel(); }}"); pg.wait_for_timeout(1500)
            pg.screenshot(path=f'/tmp/ia3/{name}-{vw}.png')
        # the 3D view of a mission still draws after Intel
        r2=pg.evaluate("""()=>{ try{ goMenu('menu'); startMission(MISSIONS[0]); if(!V3.on) toggleView3D(); for(let i=0;i<5;i++) render3D(performance.now()+i*16);
          return V3.on&&V3.ok&&G&&G.map?'OK   the 3D view of a mission still works after Intel':'FAIL 3D view after Intel'; }catch(e){ return 'FAIL 3D view after Intel: '+e.message; } }""")
        print(r2); res.append(r2); pg.close()
    b.close()
allok=all('FAIL' not in r for r in res) and not errs
print('errors',errs[:5]); print('ALL OK' if allok else 'SOME FAILED')
