from playwright.sync_api import sync_playwright
import sys
side=sys.argv[1]
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate(f"()=>{{ __hc.startMission(TRAINING.{side}); }}"); pg.wait_for_timeout(1500)
    print('card shown', pg.evaluate("!document.querySelector('#tut-card').hidden"), 'time runs', pg.evaluate("__hc.G.time>0.5"))
    pg.screenshot(path=f'tc_{side}.png')
    print(pg.evaluate('''()=>{ const G=__hc.G,T=32,out=[]; const step=s=>{ for(let i=0;i<s*30&&!G.over;i++){ __hc.update(1/30); } };
      let last='', seen=0;
      for(let k=0;k<500&&!G.over;k++){ step(1); if(G.vars.cardOpen&&G.vars.stepDone) tutConfirm(); else if(G.vars.cardOpen&&Math.random()<0.5) tutConfirm();
        const o=G.objectives.find(x=>x.id==='tut').text; if(o!==last){ last=o; out.push(Math.round(G.time)+'s '+o); seen++; G.vars.skip=true; } }
      out.push('over '+(G.over&&G.over.win)+' steps seen '+seen); return out.join('\\n'); }'''))
    b.close()
print(errs)
