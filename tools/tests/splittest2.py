from playwright.sync_api import sync_playwright
import json
def run(url):
    errs=[]; out={}
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':860})
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto(url); pg.wait_for_timeout(800)
        out['menu']=pg.evaluate("document.querySelector('#menu')&&!document.querySelector('#menu').hidden")
        out['maps']=pg.evaluate("Object.keys(MAPS)")
        for i in range(8):
            out[i]=pg.evaluate(f"""()=>{{__hc.startMission(__hc.MISSIONS[{i}]); const G=__hc.G;
              const c0=G.ents.map(e=>e.type).sort().join(',');
              for(let s=0;s<30*90;s++){{ if(G.over) break; __hc.update(1/30);}}
              return [__hc.MISSIONS[{i}].id, G.map.w+'x'+G.map.h, c0.length, G.objectives.length, !!G.over];}}""")
        pg.screenshot(path='split_game.png')
        b.close()
    return out, errs
a=(None,None); b=run('file:///home/claude/hollow_colony/index.html')
print(json.dumps(b,indent=0)); print('SAME' if a[0]==b[0] else ('DIFF', a[0]))
