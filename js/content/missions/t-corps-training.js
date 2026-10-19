'use strict';
/* Training (Lunar Corps): Boot Camp in Kappa Basin. Every button and order, step by step.
   Camera → selecting → moving → control groups → formations → stances → attacking → flares → the Engineer
   (Relay Tower, Sentry Gun, Barricade, repair, pack and deploy) → the Landing Zone (it only works once a Relay Tower stands)
   (rally point first, then the order) → a Medic patching up a downed soldier → a Pyro burning a cocoon → every top-bar button → a training hive.
   Press N to skip a step. The card does not pause the game; ◀ ▶ on it page back through earlier tips, and Practice again redoes one. */
TRAINING.corps = {
  id:'training-corps', training:true, title:'Boot Camp', map:'kappa',
  summary:'Every order and every button, one step at a time. Also handy to try things out.',
  briefing:[
    'Before Kappa Station, Sergeant Kessler walks you through everything a squad leader needs: selecting, moving, formations, stances, the Engineer\'s work and how reinforcements come in by dropship.',
    'Each step tells you what to do and waits until you have done it. The objective in the bottom left shows where you are. Press <b>N</b> to skip a step.',
    'Nothing here counts for the campaign: no veterans, no trophies.'
  ],
  start:{ salvage:0, camera:'P',
    units:[ ['trooper','P',4], ['gunner','P',1], ['medic','P',1], ['engineer','P',1] ],
    buildings:[], hives:[ { at:'b', hp:0.25, guardMax:0, aggro:0, brood:0, rage:0.01 } ] },
  landingZone:{ tx:3, ty:31, max:14 },
  swarm:{ biomass:0, rate:0, guardMax:0, aggro:0, brood:0, waves:null },
  objectives:[ { id:'tut', text:'Training' } ],
  triggers:[
    { when:g=>g.time>0.05, do:g=>{ const lz=G.ents.find(e=>e.type==='lz'); if(lz) lz.noOrders=true; } },   /* the Landing Zone wakes up once a Relay Tower stands */
    ...tutorial([
      { say:'Welcome to boot camp. I will walk you through everything. The game keeps running while a card is open, so you can try things as you read. Close a card with [Enter]; the next one comes once you have done what it asks. The buttons I talk about light up. ◀ and ▶ on the card page back through earlier tips, and Practice again lets you redo one. The Tips tab at the top brings the card back. [N] skips a step.', obj:'Listen to the sergeant', hl:['#objectives'], done:g=>g.time>2 },
      { say:'First the camera. Use the arrow keys, push the mouse against the edge of the screen, or click the minimap at the bottom left.', obj:'Move the camera', hl:['#minimap-wrap'],
        setup:g=>{ g.vars.cam0={...G.cam}; }, done:tut.camMoved },
      { say:'Click one soldier to select him. The panel at the bottom shows who he is, his rank and what he can do.', obj:'Select one soldier', hl:['#selection'], setup:g=>{ centerOn(ptWorld('P').x,ptWorld('P').y); }, done:()=>tut.selCorps().length===1 },
      { say:'Now drag a box around the whole squad with the left mouse button. Double-click a soldier to select everyone of his type on screen.', obj:'Select the whole squad', hl:['#selection'], done:()=>tut.selCorps().length>=6 },
      { say:'[Right-click] the marker to move there. The squad keeps its shape and walks at the pace of the slowest man.', obj:'Move the squad to the marker', mark:{x:12,y:29}, markLabel:'Move here', done:g=>g.near('corps',{x:12,y:29},3)>=5 },
      { say:'Save the squad as a group: hold [Ctrl] and press [1]. Later, [1] selects them again; press it twice to jump the camera to them.', obj:'Save a control group with Ctrl+1', done:()=>(G.groups['1']||[]).filter(e=>!e.dead).length>=3 },
      { say:'Formations. With the squad selected, try all three: [Z] circle, [X] wedge and [V] square. Medics and Engineers go in the middle. Press the same key again to release it.', obj:'Try the circle, wedge and square formation (Z, X, V)', keys:['Z','X','V'],
        setup:g=>{ g.vars.shapes={}; }, done:g=>{ for(const u of tut.corpsUnits()) if(u.formation) g.vars.shapes[u.formation.shape]=1; return Object.keys(g.vars.shapes).length>=3; } },
      { say:'Stances. [H] makes the squad defensive: they hold where they are and only shoot what comes in range, also after every move.', obj:'Make the squad defensive (H)', keys:['H'], done:()=>{ const s=tut.selCorps(); return s.length>0&&s.every(u=>u.stance==='hold'); } },
      { say:'Targets in the south-east. Press [A] and click the spot or an enemy: the squad attacks and keeps attacking on later moves until you cancel it.', obj:'Attack the targets (A + click)', keys:['A'], mark:{x:22,y:33}, markLabel:'Targets',
        setup:g=>{ g.vars.dummies=g.spawn('crawler',{x:22,y:33},3,{order:'guard'}); for(const u of g.vars.dummies){ u.hp=u.maxHp=14; u.dmgMul=0.2; } g.reveal({x:22,y:33},4,8); }, done:g=>g.alive(g.vars.dummies)===0 },
      { say:'Good. [S] cancels every order and drops the attack or defensive stance.', obj:'Cancel the orders (S)', keys:['S'], setup:g=>{ g.vars.hadStance=tut.corpsUnits().some(u=>u.stance); },
        done:g=>!g.vars.hadStance&&g.time>g.vars.tutStart+3||g.vars.hadStance&&!tut.corpsUnits().some(u=>u.stance) },
      { say:'Flares. Press [L] and click: a soldier throws a flare that lights the ground for a while. In dark missions they are worth gold.', obj:'Throw a flare (L + click)', keys:['L'], setup:g=>{ g.vars.fl0=G.flares; }, done:g=>G.flares<g.vars.fl0 },
      { say:'Now the Engineer. Select him (click him, or drag around him alone), press [R] and click the marked relay pad. A Relay Tower brings salvage and supply, and it powers the Landing Zone. Salvage is shown top left.', obj:'Build a Relay Tower on the pad', keys:['R'], hl:['#topbar .res:first-child'],
        setup:g=>{ g.give(250); const s=G.map.sites.slice().sort((a,b)=>Math.hypot(a.x-6,a.y-34)-Math.hypot(b.x-6,b.y-34))[0]; g.vars.pad={x:s.x,y:s.y}; g.marker('pad',{x:s.x,y:s.y},'Relay pad'); },
        done:()=>tut.built('relay').length>=1, after:g=>g.unmark('pad') },
      { keys:['T','B'], say:'The Engineer also builds a Sentry Gun [T] and a Barricade [B]. Build one of each, anywhere near the squad.', obj:'Build a Sentry Gun (T) and a Barricade (B)', setup:g=>g.give(150),
        done:()=>tut.built('sentry').length>=1&&tut.built('barricade').length>=1 },
      { say:'Something just chewed on your sentry. An idle Engineer repairs nearby structures on his own; you can also right-click a damaged one with him selected.', obj:'Repair the Sentry Gun',
        setup:g=>{ const s=tut.built('sentry')[0]; if(s){ s.hp=s.maxHp*0.4; s.flash=0.3; g.vars.rep=s; } }, done:g=>!g.vars.rep||g.vars.rep.dead||g.vars.rep.hp>=g.vars.rep.maxHp*0.98 },
      { keys:['U','D'], say:'A sentry can move. Select the Engineer, press [U] and click the sentry: he folds it up and carries it. Then press [D] and click where it should stand.', obj:'Pack up the sentry (U) and deploy it again (D)',
        setup:g=>{ g.vars.packed=false; }, done:g=>{ if(tut.corpsUnits().some(u=>u.carry)) g.vars.packed=true; return g.vars.packed&&!tut.corpsUnits().some(u=>u.carry)&&tut.built('sentry').length>=1; } },
      { say:'With the Relay Tower up, the Landing Zone works. First tell it where new troops should go: click the Landing Zone to select it, then [Right-click] the marked spot. That is its rally point; a green line shows it while the Landing Zone is selected.', obj:'Set the Landing Zone rally point (select it, right-click the marker)',
        hl:['#selection'], mark:{x:12,y:27}, markLabel:'Rally here',
        setup:g=>{ const lz=G.ents.find(e=>e.type==='lz'); if(lz){ lz.noOrders=false; lz.rally=null; g.marker('lzm',{x:lz.tx+1,y:lz.ty+1},'Landing Zone'); } G.selDirty=true; },
        done:()=>{ const lz=G.ents.find(e=>e.type==='lz'); return !!(lz&&lz.rally&&Math.hypot(lz.rally.x-12.5*TILE,lz.rally.y-27.5*TILE)<3*TILE); }, after:g=>g.unmark('lzm') },
      { keys:['F','M'], say:'Now order a Pyro [F] and a Medic [M] with the Landing Zone selected. A dropship flies them in, and once they are down they walk to the rally point by themselves.', obj:'Order a Pyro and a Medic and watch them walk to the rally point',
        hl:['#selection'], setup:g=>{ g.give(250); G.selDirty=true; },
        done:g=>{ const lz=G.ents.find(e=>e.type==='lz'), r=lz&&lz.rally; return g.has('pyro')>=1&&g.has('medic')>=2&&!!r&&tut.corpsUnits().some(u=>(u.type==='pyro'||u.type==='medic')&&Math.hypot(u.x-r.x,u.y-r.y)<3*TILE); } },
      { say:'Man down! A soldier at 0 health goes down for 15 seconds. A Medic runs to him on his own and patches him up. Keep the enemy away from him.', obj:'Let a Medic patch up the downed soldier',
        setup:g=>{ const t=tut.corpsUnits().find(u=>u.type==='trooper'&&!u.downed); if(t){ t.hp=1; damage(t,5,{faction:'swarm',kind:'unit',def:{},dead:true}); g.vars.dn=t; } }, done:g=>!g.vars.dn||g.vars.dn.dead||!g.vars.dn.downed },
      { say:'A cocoon: something is being remade inside. A Pyro burns cocoons three times as fast. Send him at it.', obj:'Burn the cocoon', mark:{x:16,y:33}, markLabel:'Cocoon',
        setup:g=>{ const c=makeBuilding('cocoon','swarm',16,33,true); c.x=(16.5)*TILE; c.y=(33.5)*TILE; c.r=9; c.hatchT=c.hatchMax=240; c.hatchType='crawler'; g.vars.coc=c; g.reveal({x:16,y:33},3,10); }, done:g=>!g.vars.coc||g.vars.coc.dead },
      { say:'Now the top bar. Every button there, one at a time. [Space] jumps the camera to the last alert, any time.', obj:'The top bar', hl:['#topbar'], done:g=>g.time>g.vars.tutStart+1 },
      ...topbarSteps('corps'),
      { say:'Last one: a training hive in the east. Purple creep grows around it and heals the Swarm. It keeps eggs on that creep: when the Swarm drags a body home, an egg opens and a Grafter turns the body. Shoot the eggs, burn the hive.', obj:'Destroy the training hive', mark:'b', markLabel:'Hive',
        setup:g=>{ g.reveal('b',5,12); g.ping('b'); }, done:g=>g.hives()===0, after:g=>g.win('Boot camp complete. You are ready for Kappa Station.') }
    ])
  ]
};
