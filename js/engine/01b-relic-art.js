'use strict';
/* ---------- 2a'. relic art: one sprite per relic (js/content/relics.js) ----------
   Keyed by relic id. An item is 16×16, an ancient egg 16×20; both are drawn at 2× on the map.
   A relic without its own sprite falls back to the generic ART.relic / ART.ancientegg. */
const RELIC_ART = (()=>{
  const K='#0a0b10';
  const R=(x,col,a,b,w,h)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
  const px=(x,col,pts)=>{ x.fillStyle=col; for(const [a,b] of pts) x.fillRect(a,b,1,1); };
  /* a disc / oval with a 1px dark rim */
  const ring=(x,cx,cy,r,col)=>{ disc(x,cx,cy,r+1,K); disc(x,cx,cy,r,col); };
  const ringO=(x,cx,cy,rx,ry,col)=>{ oval(x,cx,cy,rx+1,ry+1,K); oval(x,cx,cy,rx,ry,col); };

  /* an ancient egg: the shape is shared, stone, cracks and the light inside differ per egg */
  function egg(o){ const [c,x]=pxCtx(16,20);
    oval(x,8,11,7,9,K); oval(x,8,11,6,8,o.stone); oval(x,7,10,4,6,o.lit); oval(x,6,7,2,3,o.shine);
    oval(x,8,13,o.coreR,o.coreR+1,o.glow); oval(x,8,13,Math.max(1,o.coreR-1),o.coreR,o.core);
    x.fillStyle=o.crack; for(const [a,b,w,h] of o.cracks) x.fillRect(a,b,w,h);
    if(o.extra) o.extra(x);
    R(x,K,3,19,10,1); return c; }

  return {
    /* Flight Recorder: the orange box with white reflective bands and a carry handle, dented */
    blackbox(){ const [c,x]=pxCtx(16,16);
      R(x,K,5,1,6,4); R(x,'#7d8392',6,2,4,1); R(x,K,7,3,2,2);                       // handle
      R(x,K,1,4,14,11); R(x,'#ff7a1a',2,5,12,9); R(x,'#ffb060',2,5,12,1); R(x,'#b84a0a',12,6,2,8); R(x,'#b84a0a',2,13,12,1);
      R(x,'#eef2f5',2,7,12,1); R(x,'#eef2f5',2,11,12,1); R(x,'#aab4bf',12,7,2,1); R(x,'#aab4bf',12,11,2,1);   // reflective bands
      R(x,K,4,8,6,3); R(x,'#2a2b33',5,9,4,1); px(x,'#eef2f5',[[5,9],[7,9]]);         // data plate
      px(x,'#b84a0a',[[10,9],[11,10],[3,12]]); px(x,K,[[14,6],[1,13]]);              // dents, chipped corners
      return c; },

    /* Station Chief's Mug: a white mug with a red slogan band, coffee frozen on top */
    mug(){ const [c,x]=pxCtx(16,16);
      R(x,K,2,2,10,13); R(x,K,11,5,4,7); R(x,'#eef2f5',12,6,2,5); R(x,K,12,7,1,3);     // handle
      R(x,'#eef2f5',3,3,8,11); R(x,'#aab4bf',9,3,2,11); R(x,'#ffffff',4,4,1,8);        // body, shade, shine
      R(x,'#5a3418',3,3,8,2); R(x,'#8a5a34',3,3,8,1); px(x,'#cfe8ff',[[5,3],[8,4],[6,4]]);   // frozen coffee + frost
      R(x,'#e2463a',3,8,8,3); px(x,'#ffffff',[[5,9],[7,9],[9,9]]); R(x,'#b02a20',9,8,2,3);   // slogan band
      R(x,'#aab4bf',3,13,8,1); px(x,'#5a3418',[[10,5],[10,6]]);                         // base, a drip
      return c; },

    /* Survey Drone Core: a scorched metal sphere with a red camera eye and broken antennae */
    drone(){ const [c,x]=pxCtx(16,16);
      x.fillStyle=K; x.fillRect(3,1,1,5); x.fillRect(12,2,1,4); x.fillRect(13,1,1,2);
      px(x,'#aab4bf',[[3,1],[13,1]]);                                                   // antennae (one bent)
      ring(x,8,9,6,'#5d6f83'); disc(x,7,8,5,'#7d8ea2'); disc(x,6,7,3,'#a3b4c6'); px(x,'#eef2f5',[[5,5],[4,6]]);
      R(x,K,2,9,13,1); R(x,'#3a4150',3,10,11,1);                                        // seam
      ring(x,9,8,2,'#2a0c10'); disc(x,9,8,1,'#e2463a'); px(x,'#ffb0a8',[[8,7]]);       // the eye
      x.fillStyle='rgba(20,14,10,.6)'; x.fillRect(10,11,4,3); x.fillRect(11,10,3,1); x.fillRect(4,12,3,2);   // scorch
      px(x,'#ff8a2a',[[12,12]]); return c; },

    /* Colony Charter: a rolled parchment, half open, with a red wax seal */
    charter(){ const [c,x]=pxCtx(16,16);
      R(x,K,2,3,12,11); R(x,'#e8d6a8',3,4,10,9); R(x,'#c9b282',3,12,10,1);             // sheet
      for(let j=0;j<4;j++) R(x,'#8a7a5a',4,6+j*1.5|0,j===3?5:8,1);                      // lines of writing
      ringO(x,8,3,6,1,'#d8c08a'); R(x,'#a88f5c',2,3,12,1); px(x,'#f4e6c0',[[3,2],[6,2]]);   // top roll
      ringO(x,8,13,6,1,'#d8c08a'); R(x,'#a88f5c',2,14,12,1);                              // bottom roll
      ring(x,11,11,1,'#b02a20'); px(x,'#e2463a',[[11,10]]); R(x,'#b02a20',10,13,1,2); R(x,'#b02a20',12,13,1,2);   // seal + ribbon
      return c; },

    /* Plush Rabbit: a worn white toy rabbit, long ears (one flopped over), pink nose, a paper name tag on a string */
    rabbit(){ const [c,x]=pxCtx(16,20);
      const F='#eef2f5', S='#c9ced6', D='#9aa2ae', P='#f2a0b4';
      ringO(x,3,14,1,2,F); ringO(x,13,14,1,2,F); ringO(x,8,15,4,3,F); ring(x,5,18,1,F); ring(x,11,18,1,F);   // arms, body, feet: outlines
      oval(x,3,14,1,2,F); oval(x,13,14,1,2,F); oval(x,8,15,4,3,F); disc(x,5,18,1,F); disc(x,11,18,1,F);       // ...and fills
      oval(x,8,16,2,2,'#ffffff'); px(x,P,[[5,19],[11,19]]); px(x,S,[[3,16],[13,16],[5,14],[11,14],[12,17],[4,17]]);   // tummy, paw pads, shading
      ringO(x,6,4,1,4,F); R(x,P,6,2,1,5);                                                               // left ear, standing up
      ringO(x,10,4,1,3,F); R(x,P,10,3,1,4); R(x,K,11,0,3,3); R(x,F,11,1,2,1); px(x,S,[[12,1]]);            // right ear, its tip flopped over
      ring(x,8,9,4,F); R(x,'#ffffff',6,6,3,2); px(x,S,[[11,11],[12,9],[4,11]]);                           // head over the ears
      px(x,K,[[6,9],[10,9]]); px(x,'#ffffff',[[6,8]]);                                                    // button eyes
      R(x,P,7,10,3,1); px(x,'#d06a86',[[8,10]]); px(x,S,[[8,11]]); px(x,D,[[7,12],[9,12]]);               // pink nose, mouth
      px(x,D,[[4,10],[12,10]]);                                                                           // whisker stitches
      R(x,'#7fb6e8',6,13,5,1); px(x,'#b8dcff',[[8,13]]);                                                  // a faded blue ribbon
      px(x,'#d3c3a6',[[10,14]]); R(x,K,10,15,4,3); R(x,'#e8d6a8',11,16,2,1);                             // the name tag "Mira" on a string
      return c; },

    /* Convoy Cassette: a black tape with two reels and a hand-written label */
    cassette(){ const [c,x]=pxCtx(16,16);
      R(x,K,0,3,16,11); R(x,'#2c2f38',1,4,14,9); R(x,'#3d414c',1,4,14,1);
      R(x,'#e8d6a8',2,5,12,4); R(x,'#e2463a',2,5,12,1); R(x,'#5a4632',3,7,7,1);         // label, red stripe, scribble
      R(x,K,4,7,3,2); R(x,K,9,7,3,2); px(x,'#eef2f5',[[5,7],[10,7]]);                    // reel windows
      R(x,'#5a3418',7,8,2,1);                                                            // tape between the reels
      R(x,'#1b1d23',4,10,8,3); px(x,'#7d8392',[[5,11],[10,11],[3,12],[12,12]]);          // head slot, screws
      return c; },

    /* Fossil Shard: a broken slab of rock with a claw pressed into it */
    fossil(){ const [c,x]=pxCtx(16,16);
      ringO(x,8,9,6,5,'#7a7166'); ringO(x,5,6,3,3,'#7a7166'); oval(x,8,9,6,5,'#7a7166'); oval(x,6,7,3,2,'#958b7c'); oval(x,5,6,3,3,'#7a7166'); oval(x,5,5,2,1,'#958b7c');
      R(x,K,12,3,4,3); R(x,K,14,6,2,2); R(x,K,11,5,2,1); R(x,'#5f584e',11,6,2,1); R(x,'#5f584e',13,8,1,2);   // the broken edge
      R(x,'#5f584e',4,13,8,1); R(x,'#5f584e',13,10,1,3);                                                  // under side
      oval(x,7,9,3,4,'#2a2620'); oval(x,9,8,3,4,'#7a7166'); R(x,'#958b7c',9,5,2,1);           // the claw: one long hooked talon
      oval(x,11,11,2,2,'#2a2620'); oval(x,12,10,2,2,'#7a7166');                             // and a smaller one beside it
      px(x,'#d8cfbd',[[5,12],[9,13]]); px(x,'#3d3830',[[3,11],[12,8],[5,5]]); return c; },

    /* Expedition Flag: a bent pole, the cloth torn and bleached almost white */
    flag(){ const [c,x]=pxCtx(16,16);
      [[2,12],[3,13],[4,12],[5,10],[6,13],[7,11],[8,9],[9,7]].forEach(([y,w])=>{ R(x,K,4,y-1,w+1,3); });   // ragged outline
      [[2,12],[3,12],[4,11],[5,9],[6,12],[7,10],[8,8]].forEach(([y,w])=>R(x,'#d6d0c0',5,y,w,1));           // bleached cloth, torn edge
      R(x,'#8fa6c2',5,2,5,4); px(x,'#b6c6d8',[[6,3],[8,4],[7,2]]); R(x,'#c7a9a0',5,7,8,1); R(x,'#b8b2a2',5,8,8,1);   // faded canton and stripe
      R(x,K,3,0,2,16); R(x,'#aab4bf',3,0,1,15); R(x,K,0,13,7,3); R(x,'#5d574f',1,14,5,1); R(x,'#4b4640',1,13,2,1); R(x,'#4b4640',5,13,1,1);   // pole in a cairn
      px(x,K,[[11,4],[8,6]]); return c; },                                                  // bullet holes

    /* the four ancient eggs */
    'egg-maw'(){ return egg({ stone:'#5b544a', lit:'#776e60', shine:'#958b7c', glow:'#c97a24', core:'#ffd23f', coreR:2, crack:'#2a2620',
      cracks:[[4,7,1,4],[5,11,2,1],[10,5,1,5],[9,10,1,2]] }); },
    'egg-mare'(){ return egg({ stone:'#4a4038', lit:'#62564a', shine:'#7d7062', glow:'#8a5a2a', core:'#e8a640', coreR:1, crack:'#211b16',
      cracks:[[5,5,1,3],[11,8,1,3],[4,13,3,1]],
      extra:x=>{ R(x,'#3a2a18',1,16,14,2); R(x,'#6b4c2c',1,16,14,1); R(x,'#3a2a18',1,9,1,8); R(x,'#3a2a18',14,9,1,8); R(x,'#6b4c2c',1,9,1,1); R(x,'#6b4c2c',14,9,1,1); } }); },   // the miners' cupboard round its foot
    'egg-convoy'(){ return egg({ stone:'#6a4a3a', lit:'#86604a', shine:'#a87a5a', glow:'#ff5a1a', core:'#ffb347', coreR:3, crack:'#ff8a2a',
      cracks:[[4,9,1,3],[10,6,1,3],[7,4,2,1],[11,12,1,2]] }); },
    'egg-depths'(){ return egg({ stone:'#2e2836', lit:'#43394f', shine:'#5d5070', glow:'#4fae22', core:'#a6ff4a', coreR:2, crack:'#120e16',
      cracks:[[3,8,1,6],[4,13,3,1],[11,4,1,4],[12,8,1,3],[8,2,1,2]],
      extra:x=>{ px(x,'#a6ff4a',[[3,10],[12,9],[8,3]]); } }); }                           // veins lit from inside
  };
})();
for(const id in RELIC_ART){ ARTC['relic:'+id]=RELIC_ART[id](); ARTURL['relic:'+id]=ARTC['relic:'+id].toDataURL(); }
/* the art key of a relic (its own sprite, or the generic one) */
function relicArt(r){ return r && ARTC['relic:'+r.id] ? 'relic:'+r.id : (r&&r.kind==='egg'?'ancientegg':'relic'); }
