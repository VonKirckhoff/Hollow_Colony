from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':860}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    H="()=>{ const el=document.getElementById('dev'); return el?el.hidden:'none'; }"
    pg.evaluate("()=>startMission(MISSIONS[0])"); pg.wait_for_timeout(200); pg.keyboard.press('F9'); pg.wait_for_timeout(200)
    print('1 open in mission', pg.evaluate(H)==False)
    pg.evaluate("()=>{ pause(true); }"); pg.click('#p-quit'); pg.wait_for_timeout(200)
    print('2 hidden after quit', pg.evaluate(H)); pg.evaluate("()=>goMenu('campaign')"); pg.evaluate("()=>goMenu('cenotaph')"); pg.wait_for_timeout(700)
    print('3 hidden on cenotaph', pg.evaluate(H))
    pg.keyboard.press('F9'); pg.wait_for_timeout(200); print('4 F9 in menu keeps it hidden', pg.evaluate(H))
    pg.evaluate("()=>{ const el=document.getElementById('dev'); el.hidden=false; el.querySelector('[data-dv=close]').click(); }"); pg.wait_for_timeout(100)   # show and click in one go (the 0.5 s tick may hide it first)
    print('5 stuck panel closes with X', pg.evaluate(H))
    pg.evaluate("()=>{ document.getElementById('dev').hidden=false; }"); pg.wait_for_timeout(700); print('6 tick hides a stray panel', pg.evaluate(H))
    pg.evaluate("()=>startMission(MISSIONS[1])"); pg.wait_for_timeout(200); pg.keyboard.press('F9'); pg.wait_for_timeout(300)
    print('7 opens again in a mission', pg.evaluate(H)==False); pg.click('#dev [data-dv=close]'); print('8 X closes in mission', pg.evaluate(H))
    pg.keyboard.press('F9'); pg.evaluate("()=>{ __hc.G.objectives.forEach(o=>o.state='done'); endGame(true); }"); pg.wait_for_timeout(3000)
    print('9 end screen, panel', 'open' if pg.evaluate(H)==False else 'hidden'); pg.click('#e-menu'); pg.wait_for_timeout(300); print('10 main menu from end', pg.evaluate(H))
    pg.evaluate("()=>goMenu('cenotaph')"); pg.wait_for_timeout(300); pg.screenshot(path='dev_ceno.png')
    b.close()
print(errs[:5])
