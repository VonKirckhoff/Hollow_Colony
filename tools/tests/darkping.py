# Dark pings (Nov 2026): an enemy in the dark close to what you see gives a tracker ping on the map (PROX_PING, 22-squad-life.js).
# Far away: nothing. In sight: nothing. Standing still: fewer pings than moving. The ping lands near him, not on him. Playing the Swarm too.
# Screenshots of 2D and 3D in /tmp/dp.
import os
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
os.makedirs('/tmp/dp',exist_ok=True)
SETUP="""(side)=>{ const G=__hc.G, m=G.map, W=m.w; SIGHT.rockBlocks=false; G.paused=true;
  G.ents.forEach(e=>{ if(e.kind==='unit') e.dead=true; });
  const cx=Math.floor(m.w/2), cy=Math.floor(m.h/2);
  const me=makeUnit(side==='swarm'?'drone':'trooper',side,(cx+.5)*TILE,(cy+.5)*TILE), foe=makeUnit(side==='swarm'?'trooper':'drone',side==='swarm'?'corps':'swarm',0,0);
  me.order={type:'hold'}; foe.order={type:'hold'};
  window.__dp={me,foe,cx,cy,sight:me.def.sight}; G.seen.fill(0); computeFog(); return me.def.sight; }"""
RUN="""([dist,secs,moving])=>{ const G=__hc.G, {me,foe,cx,cy}=__dp, R=dist*TILE; let a=0, got=[], seen=new Set(); proxPings=[]; proxOf=new WeakMap();
  for(let i=0;i<secs*10;i++){ G.time+=0.1; if(moving) a+=0.1*40/R; foe.x=me.x+Math.cos(a)*R; foe.y=me.y+Math.sin(a)*R; computeFog();
    for(const p of proxPingList()) if(!seen.has(p)){ seen.add(p); got.push(Math.hypot(p.x-foe.x,p.y-foe.y)/TILE); } }
  return [got.length, got.length?Math.max(...got):0, G.vis[Math.floor(foe.y/TILE)*G.map.w+Math.floor(foe.x/TILE)]]; }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ startMission(MISSIONS.find(m=>m.id==='hold-kappa')); }"); pg.wait_for_timeout(300)
    s=J(pg,"()=>(%s)('corps')"%SETUP)
    r=J(pg,"(a)=>(%s)(a)"%RUN,[s+7,10,True])
    check('far away in the dark: no ping',r[0]==0,r)
    r=J(pg,"(a)=>(%s)(a)"%RUN,[s-2,10,True])
    check('in sight: no ping',r[0]==0 and r[2]==1,r)
    mv=J(pg,"(a)=>(%s)(a)"%RUN,[s+2,11,True])
    check('moving just outside sight: about one ping a second',7<=mv[0]<=13 and mv[2]==0,mv)
    check('the ping lands near him, not further than jitter',mv[1]<=0.7+0.01,mv)
    st=J(pg,"(a)=>(%s)(a)"%RUN,[s+2,11,False])
    check('standing still: fewer pings (every 3.5 s)',2<=st[0]<=4 and st[0]<mv[0],st)
    # screenshot 2D: let the game run a moment with pings on screen
    J(pg,"()=>{ const {me,foe}=__dp, G=__hc.G; ui.follow=false; G.sel=[me]; G.paused=false; foe.x=me.x+(__dp.sight+2)*TILE; foe.y=me.y; centerOn(me.x,me.y); }")
    n=0
    for i in range(40):
        n=J(pg,"()=>proxPingList().filter(p=>__hc.G.time-p.t<0.4).length")
        if n>=1: break
        pg.wait_for_timeout(150)
    pg.screenshot(path='/tmp/dp/corps2d.png'); check('pings while the game runs (2D)',n>=1,n)
    J(pg,"()=>toggleView3D()"); pg.wait_for_timeout(1500); n=0
    for i in range(40):
        n=J(pg,"()=>proxPingList().filter(p=>__hc.G.time-p.t<0.4).length?V3.pingPool.filter(r=>r.visible).length:0")
        if n>=2: break
        pg.wait_for_timeout(150)
    pg.screenshot(path='/tmp/dp/corps3d.png'); check('rings in 3D',n>=2,n)
    J(pg,"()=>toggleView3D()")
    # playing the Swarm
    J(pg,"()=>{ startMission(SWARM_MISSIONS.find(m=>m.id==='swarm-waking')); }"); pg.wait_for_timeout(400)
    side=J(pg,"()=>__hc.G.side"); check('a Swarm mission', side=='swarm', side)
    s=J(pg,"()=>(%s)('swarm')"%SETUP)
    r=J(pg,"(a)=>(%s)(a)"%RUN,[s+2,6,True])
    check('playing the Swarm: a soldier in the dark pings too',r[0]>=3,r)
    J(pg,"()=>{ const {me,foe}=__dp, G=__hc.G; ui.follow=false; G.sel=[me]; G.paused=false; foe.x=me.x+(__dp.sight+2)*TILE; foe.y=me.y; centerOn(me.x,me.y); }")
    for i in range(40):
        if J(pg,"()=>proxPingList().filter(p=>__hc.G.time-p.t<0.4).length"): break
        pg.wait_for_timeout(150)
    pg.screenshot(path='/tmp/dp/swarm2d.png')
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
