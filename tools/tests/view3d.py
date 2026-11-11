# The 3D view (prototype): switch on and off, it draws, the mouse finds units and ground, box select, rock hides what is behind it.
import sys
from playwright.sync_api import sync_playwright
errs=[]; ok=True
J=lambda pg,s: pg.evaluate(s)
def check(n,c,v=''):
    global ok; print(n,'OK' if c else 'FAIL',v); ok&=bool(c)
mission=sys.argv[1] if len(sys.argv)>1 else 'hold-kappa'
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1366,'height':800})
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'ERR_TUNNEL' not in m.text and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto('file:///home/claude/hollow_colony/index.html'); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ localStorage.removeItem('hc-view3d'); startMission(MISSIONS.find(m=>m.id==='"+mission+"')); }")
    pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    J(pg,"()=>{ if(ui.mode==='pause') pause(false); }"); pg.wait_for_timeout(200)
    pg.keyboard.press('F3'); pg.wait_for_timeout(1200)
    check('3D on', J(pg,"()=>V3.on&&V3.ok&&document.getElementById('game3d').style.display==='block'"), J(pg,"()=>[V3.on,V3.ok,V3.failed]"))
    check('button says 3D', J(pg,"()=>document.getElementById('btn-view').textContent")=='3D')
    check('models made', J(pg,"()=>V3.objs.size")>5, J(pg,"()=>V3.objs.size"))
    pg.screenshot(path='/home/claude/v3-'+mission+'.png')
    # the mouse on a soldier gives that soldier; on open ground gives that ground
    r=J(pg,"""()=>{ const G=__hc.G, u=G.ents.find(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); centerOn(u.x,u.y); render(performance.now()); const s=v3Screen(u.x,u.y,0.45); const w=toWorld(s.x,s.y); return [Math.min(...G.ents.filter(e=>!e.dead&&e.kind==='unit').map(e=>Math.hypot(w.x-e.x,w.y-e.y))), u.type]; }""")
    check('pick a soldier (or the one in front of him)', r[0]<2, r)
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map; let best=null; const cx=Math.floor((G.cam.x+ui.vw/2)/TILE), cy=Math.floor((G.cam.y+(ui.vh-ui.hudH)/2)/TILE);
      for(let R=2;R<12&&!best;R++) for(let j=-R;j<=R&&!best;j++) for(let i=-R;i<=R;i++){ const x=cx+i, y=cy+j; if(m.tiles[y*m.w+x]==='.'&&!G.ents.some(e=>!e.dead&&Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<TILE*1.5)){ best={x:(x+.5)*TILE,y:(y+.5)*TILE}; break; } }
      const s=v3Screen(best.x,best.y,0); const w=toWorld(s.x,s.y); return [Math.round(Math.hypot(w.x-best.x,w.y-best.y))]; }""")
    check('pick the ground', r[0]<6, r)
    # box select: drag a box round the start squad
    r=J(pg,"""()=>{ const G=__hc.G, us=G.ents.filter(e=>!e.dead&&e.kind==='unit'&&e.faction==='corps'); const ps=us.map(u=>v3Screen(u.x,u.y,0.4)).filter(p=>p.x>0&&p.y>0&&p.x<ui.vw&&p.y<ui.vh-ui.hudH);
      const x0=Math.min(...ps.map(p=>p.x))-30, x1=Math.max(...ps.map(p=>p.x))+30, y0=Math.min(...ps.map(p=>p.y))-30, y1=Math.max(...ps.map(p=>p.y))+30; return [x0,y0,x1,y1,ps.length]; }""")
    selectn=J(pg,"()=>{ selectEntities([],false); return __hc.G.sel.length; }")
    pg.mouse.move(r[0],r[1]); pg.mouse.down(); pg.mouse.move((r[0]+r[2])/2,(r[1]+r[3])/2,steps=4); pg.mouse.move(r[2],r[3],steps=4); pg.mouse.up()
    n=J(pg,"()=>__hc.G.sel.filter(e=>e.kind==='unit').length")
    check('box select', n>=min(2,r[4]), [n,r[4]])
    # a right click moves them to where the ray meets the ground
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map, u=G.sel[0]; const cx=Math.floor(u.x/TILE), cy=Math.floor(u.y/TILE);
      for(let R=3;R<12;R++) for(let j=-R;j<=R;j++) for(let i=-R;i<=R;i++){ const x=cx+i, y=cy+j; if(m.walk[y*m.w+x]&&!G.ents.some(e=>!e.dead&&Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<TILE*2.5)){ const tx=(x+.5)*TILE, ty=(y+.5)*TILE, s=v3Screen(tx,ty,0); if(s.y>60&&s.y<ui.vh-ui.hudH-20) return [s.x,s.y,tx,ty]; } } }""")
    pg.mouse.click(r[0],r[1],button='right'); pg.wait_for_timeout(100)
    d=J(pg,"()=>{ const u=__hc.G.sel[0], o=u.order||{}, f=__hc.G.fx.filter(f=>f.k==='order').pop()||{}; return [o.type, Math.round(Math.hypot((f.x||0)-"+str(r[2])+",(f.y||0)-"+str(r[3])+"))]; }")
    check('right click moves to the clicked ground', d[0] in ('move','formMove') and d[1]<8, d)
    # rock hides: a creature just north of a rock wall (away from the camera) is not seen by the camera ray
    r=J(pg,"""()=>{ const G=__hc.G, m=G.map; for(let y=4;y<m.h-4;y++) for(let x=4;x<m.w-4;x++){ const c=m.tiles[y*m.w+x], n1=m.tiles[(y-1)*m.w+x], s1=m.tiles[(y+2)*m.w+x];
        if(c==='#'&&m.tiles[(y+1)*m.w+x]==='#'&&n1!=='#'&&m.walk[(y-1)*m.w+x]&&m.walk[(y+2)*m.w+x]){
          const d=makeUnit('drone','swarm',(x+.5)*TILE,(y-1+.5)*TILE); d.order={type:'hold'}; G.devReveal=true; computeFog(); centerOn(d.x,d.y+4*TILE); render(performance.now());
          const s=v3Screen(d.x,d.y,0.4); const nd=new THREE.Vector2(s.x/V3.w*2-1,-(s.y/V3.h)*2+1); V3.ray.setFromCamera(nd,V3.cam);
          const hits=V3.ray.intersectObjects([V3.terrain,V3.objs.get(d)],true); const first=hits[0]; let o=first&&first.object; while(o&&!o.userData.ent&&o!==V3.terrain) o=o.parent;
          d.dead=true; return [x,y,o===V3.terrain?'rock':'drone']; } } return null; }""")
    check('rock hides what is behind it', r and r[2]=='rock', r)
    # dark mission lights, a building being placed, then back to 2D
    J(pg,"()=>{ render(performance.now()); }")
    pg.keyboard.press('F3'); pg.wait_for_timeout(300)
    check('2D again', J(pg,"()=>!V3.on&&document.getElementById('game3d').style.display==='none'"))
    w=J(pg,"()=>{ const w=toWorld(100,100); return [w.x-Math.round(__hc.G.cam.x), w.y-Math.round(__hc.G.cam.y)]; }")
    check('2D mouse as before', w==[100,100], w)
    check('remembered', J(pg,"()=>localStorage.getItem('hc-view3d')")=='false')
    b.close()
print(errs); print('ALL OK' if ok and not errs else 'FAIL')
