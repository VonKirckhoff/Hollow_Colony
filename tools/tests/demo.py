# Watch mode: both Swarm trainings play themselves to the end (at most 2 steps skipped for taking too long), and a key press takes over.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
which=sys.argv[1:] or ['swarm','swarmTactics']
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    for key in which:
        pg.evaluate(f"()=>{{ __hc.startMission(TRAINING.{key},{{demo:true}}); }}"); pg.wait_for_timeout(300)
        log=[]; last=None; skipped=[]
        for chunk in range(400):
            r=pg.evaluate('''()=>{ const G=__hc.G; const st=G.vars.tutI; for(let i=0;i<30*4&&!G.over;i++){ if(G.vars.skip&&G.demo&&G.demo.t>DEMO.stepMax) window.__sk=(window.__sk||[]).concat([G.vars.tutI]); __hc.update(1/30); }
              return { i:G.vars.tutI, obj:(G.tutSteps[G.vars.tutI]||{}).obj||'', t:Math.round(G.time), over:!!G.over, win:!!(G.over&&G.over.win), on:!!(G.demo&&G.demo.on), sk:window.__sk||[] }; }''')
            if r['i']!=last: log.append(f"{r['t']}s step {r['i']+1}: {r['obj']}"); last=r['i']
            skipped=r['sk']
            if r['over']: break
            pg.wait_for_timeout(120)
        print(f'== {key}'); print('\n'.join(log)); print('over',r['over'],'win',r['win'],'demo still on',r['on'],'skipped (too long)',sorted(set(skipped)))
        pg.evaluate("()=>{ window.__sk=[]; }")
        ok &= r['win'] and len(set(skipped))<=2   # a battle can go badly now and then: a step that takes too long is skipped, the demo still plays to the end
    # taking over
    pg.evaluate("()=>{ __hc.startMission(TRAINING.swarm,{demo:true}); }"); pg.wait_for_timeout(300)
    on1=pg.evaluate("()=>!!(__hc.G.demo&&__hc.G.demo.on)&&!document.getElementById('demo-banner').hidden"); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(100)
    on2=pg.evaluate("()=>!!(__hc.G.demo&&__hc.G.demo.on)"); print('take over: on before',on1,'on after key',on2); ok&= on1 and not on2
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAILED')
