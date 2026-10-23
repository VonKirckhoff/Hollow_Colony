# Formation engine regression (19b-formations.js). Ends with ALL OK or a list of FAILs.
# Part 1 (training map): no place swaps, shape held on the march, Pyro leads a wedge, new formation taken up on the move,
#   a soldier back up rejoins, attack-move stops to fight, Sweep walks on, an attack on one enemy does not walk back,
#   defensive stance holds, an Engineer rejoins after a repair, a march survives save/load.
# Part 2 (Hollow Colony ruins): five formations march through doors and narrow rooms and arrive together.
from playwright.sync_api import sync_playwright
URL='file:///home/claude/hollow_colony/index.html'
errs=[]; fails=[]
J=lambda pg,s,*a: pg.evaluate(s,*a)
def check(name,ok,val):
    print(('OK   ' if ok else 'FAIL ')+name, val)
    if not ok: fails.append(name)
LIB = r"""
window.B = {};
B.hung=(cost)=>{ const n=cost.length,m=n?cost[0].length:0,INF=1e30,U=new Float64Array(n+1),V=new Float64Array(m+1),P=new Int32Array(m+1),way=new Int32Array(m+1);
  for(let i=1;i<=n;i++){ P[0]=i; let j0=0; const minv=new Float64Array(m+1).fill(INF), used=new Uint8Array(m+1);
    do{ used[j0]=1; const i0=P[j0]; let delta=INF,j1=0; for(let j=1;j<=m;j++) if(!used[j]){ const cur=cost[i0-1][j-1]-U[i0]-V[j]; if(cur<minv[j]){ minv[j]=cur; way[j]=j0; } if(minv[j]<delta){ delta=minv[j]; j1=j; } }
      for(let j=0;j<=m;j++){ if(used[j]){ U[P[j]]+=delta; V[j]-=delta; } else minv[j]-=delta; } j0=j1; } while(P[j0]!==0);
    do{ const j1=way[j0]; P[j0]=P[j1]; j0=j1; } while(j0); }
  const out=new Array(n); for(let j=1;j<=m;j++) if(P[j]) out[P[j]-1]=j-1; return out; };
B.squad = ()=>{ const G=__hc.G; for(const u of tut.corpsUnits()) u.dead=true; G.ents=G.ents.filter(e=>!e.dead);
  for(const e of G.ents) if(e.faction==='swarm'||e.faction==='wild') e.dead=true; G.ents=G.ents.filter(e=>!e.dead);
  G.swarm.nextWave=1e9; const types=['trooper','trooper','trooper','trooper','gunner','pyro','medic','engineer'], us=[];
  types.forEach((t,i)=>{ const u=makeUnit(t,'corps',(28+(i%4))*TILE,(20+Math.floor(i/4))*TILE); us.push(u); });
  selectEntities(us,false); B.us=us; return us.length; };
B.run = (sec)=>{ const n=Math.round(sec*30); for(let i=0;i<n;i++) __hc.update(1/30); };
B.cen = ()=>{ const us=B.us; return {x:us.reduce((s,u)=>s+u.x,0)/us.length, y:us.reduce((s,u)=>s+u.y,0)/us.length}; };
B.rel = ()=>{ const c=B.cen(); return B.us.map(u=>({x:u.x-c.x,y:u.y-c.y})); };
B.idle = ()=>B.us.every(u=>!u.order||u.order.type==='hold');
B.settle = (max=40)=>{ let t=0; while(t<max && !B.idle()){ B.run(0.5); t+=0.5; } B.run(0.6); return t; };
B.form = (shape)=>{ selectEntities(B.us,false); const f=B.us[0].formation; if(f&&f.shape===shape&&B.us.every(u=>u.formation===f)) return B.settle(); setFormation(shape); return B.settle(); };   /* never releases by accident */
B.cross = (Bf,Af,only)=>{ const idx=B.us.map((u,i)=>i).filter(i=>only(B.us[i])); const cost=idx.map(i=>idx.map(j=>(Af[j].x-Bf[i].x)**2+(Af[j].y-Bf[i].y)**2)); const p=B.hung(cost); let n=0;
  const idc=idx.reduce((s,_,a)=>s+cost[a][a],0), opt=idx.reduce((s,_,a)=>s+cost[a][p[a]],0); p.forEach((j,a)=>{ if(j!==a && cost[a][a]-cost[a][j]>1) n++; }); return {n, waste:Math.round(Math.sqrt(Math.max(0,idc-opt)/Math.max(1,idx.length)))}; };
B.move = (dx,dy)=>{ selectEntities(B.us,false); const c=B.cen(); const before=B.rel(); const dist0=B.us.map(()=>0); let last=B.us.map(u=>({x:u.x,y:u.y}));
  moveGroup(B.us,c.x+dx*TILE,c.y+dy*TILE,'move'); let t=0; while(t<40 && !B.idle()){ B.run(0.25); B.us.forEach((u,i)=>{ dist0[i]+=Math.hypot(u.x-last[i].x,u.y-last[i].y); last[i]={x:u.x,y:u.y}; }); t+=0.25; }
  B.run(0.6); const after=B.rel(); const tr=Math.hypot(dx,dy)*TILE; const sh=B.us[0].formation&&B.us[0].formation.shape; const cr=B.cross(before,after,sh==='wedge'?(u=>u.type==='trooper'):(u=>!isSupport(u)));
  return { t, crossings:cr.n, wastePx:cr.waste, maxDetour:+(Math.max(...dist0.map(d=>(d-tr)/TILE))).toFixed(2) }; };
B.march = (dx,dy)=>{ selectEntities(B.us,false); const c=B.cen(), L=Math.hypot(dx,dy), ux=dx/L, uy=dy/L; moveGroup(B.us,c.x+dx*TILE,c.y+dy*TILE,'move');
  const samples=[]; let t=0, n=0, front=0; while(t<40 && !B.idle()){ B.run(0.25); t+=0.25; const cc=B.cen(); const prog=((cc.x-c.x)*ux+(cc.y-c.y)*uy)/TILE;
    if(prog>1.5 && prog<L-1.5){ samples.push(B.rel()); const fig=B.us.filter(u=>!isSupport(u)), proj=fig.map(u=>u.x*ux+u.y*uy), py=fig.find(u=>u.type==='pyro'); n++; if(py.x*ux+py.y*uy>=Math.max(...proj)-2) front++; } }
  B.run(0.6); const fin=B.rel(); let dev=0, k=0; for(const s of samples){ s.forEach((q,i)=>{ dev+=Math.hypot(q.x-fin[i].x,q.y-fin[i].y); k++; }); }
  return { t, pyroFrontPct:n?Math.round(100*front/n):null, shapeDevTiles:k?+(dev/k/TILE).toFixed(2):null }; };
B.reformOnMove = (dx,dy,shape)=>{ selectEntities(B.us,false); const c=B.cen(); moveGroup(B.us,c.x+dx*TILE,c.y+dy*TILE,'move'); B.run(1.2); const fig=B.us.filter(u=>!isSupport(u)); const p1=fig.map(u=>({x:u.x,y:u.y})); setFormation(shape); B.run(1.0);
  const L=Math.hypot(dx,dy), prog=fig.reduce((s,u,i)=>s+((u.x-p1[i].x)*dx+(u.y-p1[i].y)*dy)/L,0)/fig.length/TILE; const t=B.settle(); const cf=B.cen(); return { fighterProgress1s:+prog.toFixed(2), endGap:+(Math.hypot(cf.x-c.x-dx*TILE,cf.y-c.y-dy*TILE)/TILE).toFixed(2), shape:B.us[0].formation&&B.us[0].formation.shape, t }; };
B.goTo = (tx,ty)=>{ selectEntities(B.us,false); moveGroup(B.us,tx*TILE,ty*TILE,'move'); const t=B.settle(60); const c=B.cen(); const spread=Math.max(...B.us.map(u=>Math.hypot(u.x-c.x,u.y-c.y)))/TILE;
  return { t, idle:B.idle(), gap:+(Math.hypot(c.x-tx*TILE,c.y-ty*TILE)/TILE).toFixed(2), spread:+spread.toFixed(2) }; };
B.downed = ()=>{ /* a soldier goes down, the squad moves on twice (its Medic goes to patch him up): where do they end up? */
  selectEntities(B.us,false); const v=B.us.find(u=>u.type==='trooper'), med=B.us.find(u=>u.def.heal); v.downed={t:999,patch:0,tended:0}; v.hp=1; v.order=null; v.path=null;
  const rest=B.us.filter(u=>u!==v); const c=B.cen(); selectEntities(rest,false); moveGroup(rest,c.x+6*TILE,c.y,'move'); B.run(4); const c2=B.cen(); moveGroup(rest,c2.x,c2.y+5*TILE,'move');
  B.settle(); v.downed={t:999,patch:0.999,tended:0}; patchUp(med,v,0.1); const t=B.settle(); B.run(3); B.settle();
  const others=B.us.filter(u=>u!==v&&u!==med), oc={x:others.reduce((s,u)=>s+u.x,0)/others.length,y:others.reduce((s,u)=>s+u.y,0)/others.length};
  const R=Math.max(...others.map(u=>Math.hypot(u.x-oc.x,u.y-oc.y)))/TILE;
  return { up:!v.downed, t, soldierFromSquad:+(Math.hypot(v.x-oc.x,v.y-oc.y)/TILE).toFixed(2), medicFromSquad:+(Math.hypot(med.x-oc.x,med.y-oc.y)/TILE).toFixed(2), squadRadius:+R.toFixed(2), sameFormation:!!v.formation&&v.formation===others[0].formation }; };
"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':800}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
    J(pg,"()=>{ __hc.startMission(TRAINING.corps); }"); pg.wait_for_timeout(300)
    J(pg,"()=>{"+LIB+"}"); J(pg,"()=>B.squad()")
    HOME="()=>{ B.us.forEach(u=>{u.hp=u.maxHp; u.stance=null;}); moveGroup(B.us,24*TILE,20*TILE,'move'); B.settle(); }"
    moves=[(8,0),(-8,0),(0,7),(0,-7),(6,6),(-6,-6),(2,0),(0,2),(-2,1),(-3,-2)]
    for shape in ['circle','square','line','wedge','zigzag']:
        J(pg,"()=>{ B.us.forEach(u=>{u.formation=null;}); moveGroup(B.us,30*TILE,22*TILE,'move'); B.settle(); }"); J(pg,f"()=>B.form('{shape}')")
        res=[J(pg,f"()=>B.move({dx},{dy})") for dx,dy in moves]
        check(f'{shape}: nobody swaps places on 10 moves', sum(r['crossings'] for r in res)==0, {'crossings':sum(r['crossings'] for r in res),'slowest move s':max(r['t'] for r in res)})
    J(pg,"()=>{ moveGroup(B.us,28*TILE,20*TILE,'move'); B.settle(); B.form('wedge'); }")
    r=J(pg,"()=>B.march(12,0)"); check('wedge march: Pyro leads, shape held', r['pyroFrontPct']>=90 and r['shapeDevTiles']<0.3, r)
    for shape in ['circle','line','square']:
        J(pg,HOME); J(pg,f"()=>B.form('{shape}')"); r=J(pg,"()=>B.march(12,2)"); check(f'{shape} march: shape held', r['shapeDevTiles']<0.3, r)
    for a,bb,(dx,dy) in [('circle','line',(14,0)),('line','wedge',(14,0)),('wedge','square',(0,9)),('square','zigzag',(14,-4)),(None,'wedge',(14,2))]:
        J(pg,HOME); J(pg,f"()=>B.form('{a}')" if a else "()=>{ B.us.forEach(u=>{u.formation=null;}); }"); r=J(pg,f"()=>B.reformOnMove({dx},{dy},'{bb}')")
        check(f'{a or "no formation"} -> {bb} on the move: keeps walking, arrives', r['fighterProgress1s']>0.5 and r['endGap']<1 and r['shape']==bb, r)
    J(pg,HOME); J(pg,"()=>{ B.us.forEach(u=>{u.downed=null;}); B.form('circle'); }")
    r=J(pg,"()=>B.downed()"); check('soldier back up joins the squad where it is now', r['up'] and r['sameFormation'] and r['soldierFromSquad']<=r['squadRadius']+1, r)
    J(pg,HOME)
    r=J(pg,"""()=>{ B.form('wedge'); const foes=[]; for(let i=0;i<5;i++){ const d=makeUnit('crawler','swarm',(32+i%2)*TILE,(19+i)*TILE); d.role='guard'; d.guardAt={x:d.x,y:d.y}; foes.push(d); }
      for(const u of B.us) u.stance='attack'; selectEntities(B.us,false); attackMoveAt(42*TILE,21*TILE); const f=B.us[0].formation; let stops=0, t=0, lastK=1;
      while(t<45 && !(B.idle()&&foes.every(d=>d.dead))){ B.run(0.25); t+=0.25; const m=f.march; if(m&&m.k===0&&lastK!==0) stops++; lastK=m?m.k:1; }
      const c=B.cen(); return { foesLeft:foes.filter(d=>!d.dead).length, stopsToFight:stops, t, gap:+(Math.hypot(c.x-42*TILE,c.y-21*TILE)/TILE).toFixed(2) }; }""")
    check('attack-move in a wedge: stops to fight, then arrives', r['foesLeft']==0 and r['stopsToFight']>=1 and r['gap']<1.5, r)
    J(pg,"()=>{ B.us=B.us.filter(u=>!u.dead); }"); J(pg,HOME)
    r=J(pg,"""()=>{ B.form('line'); const foes=[]; for(let i=0;i<4;i++){ const d=makeUnit('crawler','swarm',34*TILE,(17+i*2)*TILE); d.role='guard'; d.guardAt={x:d.x,y:d.y}; d.dmgMul=0; foes.push(d); }
      selectEntities(B.us,false); attackMoveAt(44*TILE,20*TILE); const f=B.us[0].formation; let zero=0, t=0; while(t<45 && !B.idle()){ B.run(0.25); t+=0.25; if(f.march&&f.march.k===0) zero++; }
      return { foesLeft:foes.filter(d=>!d.dead).length, guideStops:zero, t }; }""")
    check('Sweep: the line never stops, clears the way', r['foesLeft']==0 and r['guideStops']==0, r)
    J(pg,HOME)
    r=J(pg,"""()=>{ B.form('circle'); const d=makeUnit('drone','swarm',30*TILE,20*TILE); d.role='guard'; d.guardAt={x:d.x,y:d.y}; computeFog(); selectEntities(B.us,false); smartCommand(d.x,d.y);
      const attacked=B.us.some(u=>u.order&&u.order.type==='attack'); let t=0; while(t<20 && !d.dead){ B.run(0.25); t+=0.25; } const c1=B.cen(); B.run(6); const c2=B.cen();
      return { attacked, killed:d.dead, walkedBack:+(Math.hypot(c2.x-c1.x,c2.y-c1.y)/TILE).toFixed(2) }; }""")
    check('attack on one enemy: no walking back after the kill', r['attacked'] and r['killed'] and r['walkedBack']<1, r)
    J(pg,HOME)
    r=J(pg,"""()=>{ selectEntities(B.us,false); cmdHold(); B.form('square'); const c=B.cen(); moveGroup(B.us,c.x+5*TILE,c.y,'move'); B.settle(); const pos=B.us.map(u=>({x:u.x,y:u.y})); B.run(5);
      const drift=Math.max(...B.us.map((u,i)=>Math.hypot(u.x-pos[i].x,u.y-pos[i].y)))/TILE; const holding=B.us.every(u=>u.order&&u.order.type==='hold'); cmdHold(); return { drift:+drift.toFixed(2), holding }; }""")
    check('defensive stance: they hold their places', r['drift']<0.5 and r['holding'], r)
    J(pg,HOME)
    r=J(pg,"""()=>{ B.form('circle'); const s=makeBuilding('barricade','corps',27,22,true); s.hp=s.maxHp*0.3; const e=B.us.find(u=>u.def.builder);
      let t=0, rep=false; while(t<30){ B.run(0.5); t+=0.5; if(e.order&&e.order.type==='repair') rep=true; if(rep&&s.hp>=s.maxHp&&!e.order) break; } B.run(3); B.settle(); const p=formationSpot(e);
      return { repaired:s.hp>=s.maxHp, off:p?+(Math.hypot(e.x-p.x,e.y-p.y)/TILE).toFixed(2):99 }; }""")
    check('Engineer repairs, then goes back to his place', r['repaired'] and r['off']<1, r)
    J(pg,HOME)
    r=J(pg,"""()=>{ B.form('wedge'); const c=B.cen(); selectEntities(B.us,false); moveGroup(B.us,c.x+12*TILE,c.y-6*TILE,'move'); B.run(2); const f=B.us[0].formation; const txt=JSON.stringify(encodeGame());
      const d=decodeGame(JSON.parse(txt)); const ents=d.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'); const f2=ents[0].formation;
      return { march:!!f2&&!!f2.march, shared:ents.every(e=>e.formation===f2), sameGuide:Math.round(f2.march.x)===Math.round(f.march.x), spots:f2.march.spots instanceof Map, orders:ents.every(e=>!e.order||!e.order.form||e.order.form===f2) }; }""")
    check('a march survives save and load', all(r.values()), r)
    J(pg,"()=>B.settle()")
    # part 2: the ruins of Hollow Colony
    J(pg,"()=>{ __hc.startMission(MISSIONS.find(m=>m.map==='hollow')); const G=__hc.G; for(const e of G.ents) if(e.faction==='swarm'||e.def&&e.def.cloak) e.dead=true; G.ents=G.ents.filter(e=>!e.dead); G.swarm.nextWave=1e9; G.swarm.cfg.maxAlive=0; }")
    J(pg,"()=>{ B.us=__hc.G.ents.filter(e=>e.kind==='unit'&&e.faction==='corps'&&!e.def.escort); for(const u of B.us){ u.x=(6+(u.id%4))*TILE; u.y=(38+(u.id%2))*TILE; } selectEntities(B.us,false); }")
    for shape,dest in [('wedge',(10,8)),('line',(40,30)),('circle',(28,10)),('zigzag',(52,8)),('square',(6,38))]:
        J(pg,f"()=>B.form('{shape}')")
        r=J(pg,f"""()=>{{ selectEntities(B.us,false); moveGroup(B.us,{dest[0]}*TILE+16,{dest[1]}*TILE+16,'move'); let t=0; while(t<90 && !B.idle()){{ B.run(0.5); t+=0.5; }}
           const c=B.cen(); return {{ t, idle:B.idle(), gap:+(Math.hypot(c.x-{dest[0]}*TILE-16,c.y-{dest[1]}*TILE-16)/TILE).toFixed(2), strays:B.us.filter(u=>Math.hypot(u.x-c.x,u.y-c.y)>5*TILE).length }}; }}""")
        check(f'ruins: {shape} to {dest} arrives together', r['idle'] and r['strays']==0 and r['gap']<3.5 and r['t']<75, r)
    b.close()
if errs: fails.append('page errors: '+'; '.join(errs[:3]))
print('ALL OK' if not fails else 'FAILED: '+', '.join(fails))
