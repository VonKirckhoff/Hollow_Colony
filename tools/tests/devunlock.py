"""Dev unlock: ² (Backquote) or F9 on the campaign screen opens every mission of every campaign; pressing it again restores the old state.
Must end with ALL OK."""
from playwright.sync_api import sync_playwright
errs=[]; ok=True
def check(name,cond):
    global ok; ok=ok and bool(cond); print(('OK  ' if cond else 'FAIL')+' '+name)
STATE="""()=>{ const out={}; for(const s of ['corps','swarm','rogue']){ ui.campSide=s; buildCampaign();
  const bs=[...document.querySelectorAll('#mission-list .mission:not(.training)')];
  out[s]={ n:bs.length, locked:bs.filter(b=>b.getAttribute('aria-disabled')==='true').length, crew:!!document.querySelector('#s-campaign:not(.rogue-locked)') }; }
  ui.campSide='corps'; buildCampaign(); out.progress=document.getElementById('camp-progress').textContent; out.rOpen=rogueUnlocked(); return out; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':860}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    # a little real progress: Corps mission 1 won, so mission 2 is ready
    pg.evaluate("()=>{ localStorage.clear(); }"); pg.reload(); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    pg.evaluate("()=>{ recordWin(MISSIONS[0].id,'normal',300,false); goMenu('campaign'); }"); pg.wait_for_timeout(200)
    before=pg.evaluate(STATE); print(before)
    check('1 before: missions locked', before['corps']['locked']==before['corps']['n']-2 and before['swarm']['locked']==before['swarm']['n']-1 and before['rogue']['locked']==before['rogue']['n'] and not before['rOpen'])
    pg.keyboard.press('Backquote'); pg.wait_for_timeout(200)
    on=pg.evaluate(STATE); print(on)
    check('2 ² opens every mission of all three campaigns', all(on[s]['locked']==0 for s in ['corps','swarm','rogue']) and on['rOpen'])
    check('3 DEV shown on the progress line', 'DEV' in on['progress'])
    pg.evaluate("()=>{ ui.campSide='rogue'; buildCampaign(); }"); pg.wait_for_timeout(100); pg.screenshot(path='devunlock_rogue.png')
    pg.click('#mission-list .mission:not(.training) >> nth=3'); pg.wait_for_timeout(300)
    check('4 a far Rogue job opens its briefing', pg.evaluate("()=>!document.getElementById('s-brief').hidden"))
    pg.evaluate("()=>goMenu('campaign')"); pg.wait_for_timeout(100)
    pg.keyboard.press('Backquote'); pg.wait_for_timeout(200)
    off=pg.evaluate(STATE); print(off)
    check('5 ² again: back to the old state', all(off[s]['locked']==before[s]['locked'] for s in ['corps','swarm','rogue']) and off['rOpen']==before['rOpen'] and 'DEV' not in off['progress'])
    pg.keyboard.press('F9'); pg.wait_for_timeout(100); check('6 F9 works too', pg.evaluate("()=>devUnlock")); pg.keyboard.press('F9')
    check('7 progress untouched', pg.evaluate("()=>Object.keys(ui.progress.results).length")==1)
    pg.evaluate("()=>startMission(MISSIONS[0])"); pg.wait_for_timeout(200); pg.keyboard.press('Backquote'); pg.wait_for_timeout(200)
    check('8 in a mission ² still opens the dev panel', pg.evaluate("()=>!document.getElementById('dev').hidden") and not pg.evaluate("()=>devUnlock"))
    b.close()
check('9 no page errors', not errs); print(errs[:5])
print('ALL OK' if ok else 'SOME FAILED')
